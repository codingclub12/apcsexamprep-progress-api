'use strict';
//  DIAGNOSTIC: the two gradebook endpoints do not return the same document.
//
//  docs/gradebook-contract.md states three denominators and says DO NOT COLLAPSE
//  THEM: earned over attempted, `graded` over attempted, `possible` over the
//  WHOLE course, with pct = earned/graded and never earned/possible. CLAUDE.md
//  adds that the operator view cannot drift from the teacher view because they
//  call the same builder, and that a second implementation must not be added.
//
//  There are two. routes/admin.js:1044 serves /class/:id/gradebook from
//  lib/admin-gradebook.js; routes/admin.js:1155 serves the same class from
//  lib/gradebook-contract.js at /gradebook/as-teacher. Only the second is the
//  contract. smoke/gradebook-contract.js test 12 compares the TEACHER route
//  against as-teacher, so nothing has ever compared the plain endpoint to
//  anything, which is how it drifted without a red suite.
//
//  Run it: node scripts/gradebook-endpoint-diff.js
//  It writes a throwaway SQLite file, drives the REAL routes in process, and
//  needs no network and no secrets.
//  Fixture is #85's own worked example, lifted from smoke/gradebook-contract.js:
//  exercise-1 0/7, lab 7/8, quiz 5/5 = 12/20 = 60 percent.
//  No network, no secrets, throwaway SQLite.
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, '..', 'gradebook-endpoint-diff.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
process.env.ADMIN_KEY = 'smoke-admin-key-long-enough-to-pass-the-guard';

const express = require('express');
const db = require('../db');
const app = express();
app.use(express.json());
app.use('/api/student', require('../routes/student'));
app.use('/api/teacher', require('../routes/teacher'));
app.use('/api/admin', require('../routes/admin'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const post = (p, body, tok) => fetch(base() + p, {
  method: 'POST',
  headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json() }));
const adminGet = (p) => fetch(base() + p, { headers: { 'x-admin-key': process.env.ADMIN_KEY } })
  .then(async (r) => ({ status: r.status, body: await r.json() }));
const run = (s, ...a) => db.prepare(s).run(...a);
const CYBER = 'ap-cybersecurity';

(async () => {
  const reg = await post('/api/teacher/register', {
    email: 't02@example.org', password: 'a-long-enough-password',
    name: 'T02', school: 'Example High',
  });
  const tok = reg.body.token;
  const c = await post('/api/teacher/classes', { class_name: 'T02 P1', course: CYBER }, tok);
  const code = c.body.class.class_code;
  run(`INSERT INTO course_denominators (course,unit,lesson,activity_type,possible) VALUES
       (?,'unit-1','1.1','exercise-1',7),(?,'unit-1','1.1','lab',8),(?,'unit-1','1.1','quiz',5),
       (?,'unit-1','1.2','exercise-1',5),(?,'unit-1','1.2','lab',25)`,
      CYBER, CYBER, CYBER, CYBER, CYBER);
  const join = async (nm) => (await post('/api/student/join',
    { class_code: code, display_name: nm, pin: '1234' })).body.token;
  const score = (t, lesson, act, item, earned, possible) => post('/api/student/score',
    { course: CYBER, unit: 'unit-1', lesson, activity_type: act, item, earned, possible }, t);

  const s1 = await join('GC1');
  await post('/api/student/progress',
    { course: CYBER, unit: 'unit-1', lesson: '1.1', activity_type: 'lesson', completed: true }, s1);
  await score(s1, '1.1', 'exercise-1', 'e1', 0, 7);
  await score(s1, '1.1', 'lab', 'lab', 7, 8);
  await score(s1, '1.1', 'quiz', 'q1', 5, 5);
  //  Student 2 attempts NOTHING. The contract says pct must be null here, not 0.
  const s2 = await join('GC2');
  await post('/api/student/progress',
    { course: CYBER, unit: 'unit-1', lesson: '1.1', activity_type: 'lesson', completed: true }, s2);

  const plain = await adminGet(`/api/admin/class/${code}/gradebook?reveal=1`);
  const canon = await adminGet(`/api/admin/class/${code}/gradebook/as-teacher?reveal=1`);
  const find = (r, l) => (r.body.students || []).find((s) => s.label === l) || {};

  console.log('\n  GET /api/admin/class/:id/gradebook            HTTP ' + plain.status);
  console.log('  GET /api/admin/class/:id/gradebook/as-teacher HTTP ' + canon.status);

  for (const label of ['GC1', 'GC2']) {
    const p = find(plain, label), q = find(canon, label);
    console.log(`\n  ---- ${label} ----`);
    console.log('  plain     overall:', JSON.stringify(p.overall));
    console.log('  as-teacher overall:', JSON.stringify(q.overall));
    console.log('  plain      pace   :', JSON.stringify(p.pace));
    console.log('  as-teacher pace   :', JSON.stringify(q.pace));
  }

  const CONTRACT = ['pct','earned','graded','possible','items_graded','items_passed',
    'items_total','items_percent_only','items_score_missing'].sort();
  const pk = Object.keys(find(plain,'GC1').overall || {}).sort();
  console.log('\n  contract key set :', CONTRACT.join(','));
  console.log('  plain key set    :', pk.join(','));
  console.log('  MISSING from plain:', CONTRACT.filter((k) => !pk.includes(k)).join(',') || '(none)');
  console.log('  EXTRA in plain    :', pk.filter((k) => !CONTRACT.includes(k)).join(',') || '(none)');
  const g2p = find(plain,'GC2').overall || {}, g2c = find(canon,'GC2').overall || {};
  console.log('\n  nothing-attempted student, pct: plain=' + JSON.stringify(g2p.pct)
    + '  as-teacher=' + JSON.stringify(g2c.pct) + '   (contract requires null)');
  //  Clean up after ourselves: this is a diagnostic, not a fixture to keep.
  server.close();
  db.close();
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
