'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: admin teacher account operations (reset-password, guarded delete).
//  Delete is destructive and cascades, so the guards get the most attention:
//  a dry run must change NOTHING, a wrong confirm must change NOTHING, and an
//  account holding student work must be refused without an explicit force.
//
//  Run: npm run smoke:teacheradmin
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-teacher-admin.db');
process.env.ADMIN_KEY = 'smoke-admin-key-01234567890-abcdef';
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');

const app = express();
app.use(express.json());
app.use('/api/admin', require('../routes/admin'));
app.use('/api/teacher', require('../routes/teacher'));

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  [PASS] ' + n); } else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); } };
const run = (s, ...a) => db.prepare(s).run(...a);
const count = (t, w, ...a) => db.prepare(`SELECT COUNT(*) n FROM ${t}${w ? ' WHERE ' + w : ''}`).get(...a).n;

// ── Fixture: one teacher with real work, one empty shell ────────────────────
run(`INSERT INTO teachers (id,name,email,password_hash) VALUES
 ('t_work','Busy Teacher','busy@school.org','x'),
 ('t_empty','Iris Shell','shell@school.org','x')`);
run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active) VALUES
 ('c_work','CYBER-WORK','Real class','ap-cybersecurity','t_work',1),
 ('c_empty','CYBER-TU28','Empty shell','ap-cybersecurity','t_empty',1)`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES
 ('s1','c_work','A','x'),('s2','c_work','B','x')`);
run(`INSERT INTO progress (id,student_id,class_id,course,unit,lesson,activity_type,completed)
 VALUES ('p1','s1','c_work','ap-cybersecurity','unit-1','1.1','lesson',1)`);
run(`INSERT INTO score_events (id,student_id,class_id,course,unit,lesson,activity_type,item,points,max_points)
 VALUES ('e1','s1','c_work','ap-cybersecurity','unit-1','1.1','cfu','i1',1,1)`);
run(`INSERT INTO attempts (student_id,class_id,course,lesson_id,item_id,item_type,score,max_score,passed,attempt_no)
 VALUES ('s1','c_work','ap-cybersecurity','1.1','1.1-quiz','quiz',8,10,1,1)`);
run(`INSERT INTO sessions (id,student_id,class_id,course,active_seconds,total_seconds,page_views)
 VALUES ('sess1','s1','c_work','ap-cybersecurity',60,90,2)`);
run(`INSERT INTO entitlements (id,teacher_id,course,source,status) VALUES ('ent1','t_work','ap-cybersecurity','manual','active')`);

(async () => {
  const base = await new Promise((r) => { const s = app.listen(0, () => r('http://127.0.0.1:' + s.address().port)); });
  const KEY = process.env.ADMIN_KEY;
  const call = (method, p, body) => fetch(base + p, {
    method,
    headers: Object.assign({ 'x-admin-key': KEY }, body ? { 'Content-Type': 'application/json' } : {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  const noKey = (method, p) => fetch(base + p, { method });

  console.log('auth posture');
  ok('reset-password without key is 403', (await noKey('POST', '/api/admin/teacher/t_empty/reset-password')).status === 403);
  ok('delete without key is 403', (await noKey('DELETE', '/api/admin/teacher/t_empty')).status === 403);

  console.log('reset-password');
  let r = await call('POST', '/api/admin/teacher/nope@nowhere.test/reset-password');
  ok('unknown teacher 404', r.status === 404, r.status);

  r = await call('POST', '/api/admin/teacher/shell@school.org/reset-password');
  let j = await r.json();
  ok('resolves by email, returns 200', r.status === 200, r.status);
  ok('returns a temporary password', typeof j.temporary_password === 'string' && j.temporary_password.length >= 12, j.temporary_password);
  const temp = j.temporary_password;
  // The new password must actually work through the real login route.
  const login = await fetch(base + '/api/teacher/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'shell@school.org', password: temp }),
  });
  ok('teacher can log in with the temp password', login.status === 200, login.status);
  ok('classes survive the reset', count('classes', 'teacher_id = ?', 't_empty') === 1);

  // An admin reset must invalidate any outstanding self-service token.
  run(`INSERT INTO password_reset_tokens (id,teacher_id,token_hash,expires_at)
       VALUES ('tok1','t_work','deadbeef',datetime('now','+1 hour'))`);
  await call('POST', '/api/admin/teacher/t_work/reset-password');
  ok('admin reset burns outstanding reset tokens', count('password_reset_tokens', 'teacher_id = ?', 't_work') === 0);
  ok('reset preserves student work', count('score_events', 'class_id = ?', 'c_work') === 1);
  ok('reset preserves entitlements', count('entitlements', 'teacher_id = ?', 't_work') === 1);

  console.log('delete guards');
  r = await call('DELETE', '/api/admin/teacher/t_work');
  j = await r.json();
  ok('no confirm returns a dry run (400)', r.status === 400, r.status);
  ok('dry run is flagged', j.dry_run === true);
  ok('dry run reports the real impact', j.would_delete && j.would_delete.students === 2 && j.would_delete.attempts === 1, j.would_delete);
  ok('dry run flags student work', j.would_delete.has_student_work === true);
  ok('dry run recommends reset instead', /reset-password/.test(j.warning || ''), j.warning);
  ok('DRY RUN CHANGED NOTHING', count('teachers', "id = 't_work'") === 1 && count('students', "class_id = 'c_work'") === 2);

  r = await call('DELETE', '/api/admin/teacher/t_work?confirm=wrong@example.com');
  ok('wrong confirm rejected 400', r.status === 400, r.status);
  ok('wrong confirm changed nothing', count('teachers', "id = 't_work'") === 1);

  r = await call('DELETE', '/api/admin/teacher/t_work?confirm=busy@school.org');
  j = await r.json();
  ok('correct confirm but has work -> refused 409', r.status === 409, r.status);
  ok('refusal offers the force override', /force=1/.test(j.override || ''), j.override);
  ok('refusal changed nothing', count('teachers', "id = 't_work'") === 1 && count('score_events', null) === 1);

  console.log('delete: empty shell (the safe case)');
  r = await call('DELETE', '/api/admin/teacher/t_empty?confirm=shell@school.org');
  j = await r.json();
  ok('empty account deletes without force', r.status === 200, r.status);
  ok('teacher row gone', count('teachers', "id = 't_empty'") === 0);
  ok('its class cascaded away', count('classes', "teacher_id = 't_empty'") === 0);
  ok('email freed for re-registration', count('teachers', 'email = ?', 'shell@school.org') === 0);
  // Re-registering the same email must now succeed.
  const reg = await fetch(base + '/api/teacher/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'shell@school.org', password: 'freshpass123', name: 'Iris Again' }),
  });
  ok('email can re-register from scratch', reg.status === 201, reg.status);

  console.log('delete: forced, with work');
  r = await call('DELETE', '/api/admin/teacher/t_work?confirm=busy@school.org&force=1');
  j = await r.json();
  ok('force deletes 200', r.status === 200, r.status);
  ok('teacher gone', count('teachers', "id = 't_work'") === 0);
  ok('students cascaded', count('students', "class_id = 'c_work'") === 0);
  ok('progress cascaded', count('progress', "class_id = 'c_work'") === 0);
  ok('score_events cascaded', count('score_events', "class_id = 'c_work'") === 0);
  ok('entitlements cascaded', count('entitlements', "teacher_id = 't_work'") === 0);
  // The whole point of the explicit cleanup: no FK on these two.
  ok('attempts NOT orphaned (explicitly cleaned)', count('attempts', "class_id = 'c_work'") === 0);
  ok('sessions NOT orphaned (explicitly cleaned)', count('sessions', "class_id = 'c_work'") === 0);

  console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
