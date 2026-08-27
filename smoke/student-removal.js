'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: removing a student from a class actually removes them, on screen.
//
//  WHAT WAS WRONG
//  A teacher reported that they could not remove a student from their course.
//  Every layer said the removal worked. The DELETE returned 200, the database
//  row read active = 0, and the student really could no longer sign in. The
//  teacher was still right, because the only thing they can see is the roster,
//  and the roster never changed:
//
//    routes/teacher.js   GET /classes/:code/progress returns EVERY student row,
//                        active or not. Correct, and deliberate: the scores are
//                        gradebook data, and dropping the row server-side would
//                        leave no way to put a mis-clicked student back.
//    cyber-dashboard.js  buildModel() mapped resp.summary straight through and
//                        did not even carry `active`, so a removed student
//                        rendered identically to an active one: same grid row,
//                        same picker entry, same Remove button.
//
//  So the click landed, the page reloaded, and the student was still there,
//  every time. The confirm dialog made it worse by promising "permanently
//  deletes their progress and cannot be undone", which the server does not do:
//  a teacher who read that, clicked OK, and then saw the student still listed
//  had every reason to conclude the delete had failed.
//
//  WHAT THIS PINS
//    A. The server keeps its half of the contract: deactivate, never delete.
//       Every progress, attempt and score row survives, sign-in is refused,
//       the row is still sent so it can be restored, and PATCH puts it back.
//    B. The page hides what the teacher removed: model.students loses them,
//       model.removed keeps them, the count and the CSV follow, and the dialog
//       describes what the server actually does.
//
//  The page's own functions are executed, not reimplemented: the <script> is
//  extracted from the shipped file and run in a vm with a stub DOM, the same
//  way smoke/teacher-dashboard-page.js does it.
//
//  Zero PII: synthetic names only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:removal
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

process.env.DB_PATH = path.join(__dirname, 'smoke-student-removal.db');
process.env.JWT_SECRET = 'smoke-student-removal-secret-0123456789';
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signTeacherToken } = require('../utils');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);
const count = (t, w, ...a) => db.prepare(`SELECT COUNT(*) n FROM ${t} WHERE ${w}`).get(...a).n;

// ═════════════════════════════════════════════════════════════════════════════
//  A. THE SERVER: deactivate, never delete
// ═════════════════════════════════════════════════════════════════════════════
const app = express();
app.use(express.json());
app.use('/api/teacher', require('../routes/teacher'));
app.use('/api/student', require('../routes/student'));

(async () => {
  const PIN_HASH = await bcrypt.hash('4321', 10);
  run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','Teacher One','t1@school.org','x')`);
  run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold)
       VALUES ('c1','CYBER-RM01','Period 3','ap-cybersecurity','t1',1,80)`);
  run(`INSERT INTO students (id,class_id,display_name,pin_hash,active) VALUES
       ('s_leaves','c1','Ada Analyst',?,1),
       ('s_stays','c1','Grace Grader',?,1)`, PIN_HASH, PIN_HASH);
  // Real work for the student who is about to be removed. None of it may vanish.
  run(`INSERT INTO progress (id,student_id,class_id,course,unit,lesson,activity_type,completed,score)
       VALUES ('p1','s_leaves','c1','ap-cybersecurity','unit-1','1.1','lesson',1,90)`);
  run(`INSERT INTO score_events (id,student_id,class_id,course,unit,lesson,activity_type,item,points,max_points)
       VALUES ('e1','s_leaves','c1','ap-cybersecurity','unit-1','1.1','quiz','q1',4,5)`);
  run(`INSERT INTO attempts (student_id,class_id,course,lesson_id,item_id,item_type,score,max_score,passed,attempt_no)
       VALUES ('s_leaves','c1','ap-cybersecurity','1.1','1.1-quiz','quiz',4,5,1,1)`);

  const base = await new Promise((r) => { const s = app.listen(0, () => r('http://127.0.0.1:' + s.address().port)); });
  const tok = signTeacherToken({ id: 't1', name: 'Teacher One', email: 't1@school.org' });
  const call = (m, p, b) => fetch(base + p, {
    method: m,
    headers: Object.assign({ Authorization: 'Bearer ' + tok }, b ? { 'Content-Type': 'application/json' } : {}),
    body: b ? JSON.stringify(b) : undefined,
  });
  const login = (name) => fetch(base + '/api/student/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ class_code: 'CYBER-RM01', display_name: name, pin: '4321' }),
  });

  console.log('\nSTUDENT REMOVAL: THE CLICK HAS TO SHOW\n');
  console.log('A1. Before the removal');
  const before = await (await call('GET', '/api/teacher/classes/CYBER-RM01/progress')).json();
  ok('  both students are on the roster', (before.summary || []).length === 2, (before.summary || []).length);
  ok('  the student who is about to be removed can sign in', (await login('Ada Analyst')).status === 200);

  console.log('\nA2. DELETE deactivates, and destroys nothing');
  const del = await call('DELETE', '/api/teacher/classes/CYBER-RM01/students/s_leaves');
  ok('  the call succeeds', del.status === 200, del.status);
  const row = db.prepare('SELECT id, display_name, active FROM students WHERE id = ?').get('s_leaves');
  ok('  the student row still exists', !!row);
  ok('  and is deactivated, not deleted', row && row.active === 0, row && row.active);
  ok('  their progress rows survive', count('progress', 'student_id = ?', 's_leaves') === 1);
  ok('  their score_events survive', count('score_events', 'student_id = ?', 's_leaves') === 1);
  ok('  their attempts survive', count('attempts', 'student_id = ?', 's_leaves') === 1);

  console.log('\nA3. The removal is real where it counts');
  ok('  a removed student can no longer sign in', (await login('Ada Analyst')).status === 403);
  ok('  the student who was not removed still can', (await login('Grace Grader')).status === 200);

  console.log('\nA4. The row is still sent, so the removal stays reversible');
  //  This is the API behaviour the page has to cope with. It is not a bug: drop
  //  the row here and a mis-clicked student is unreachable forever.
  const after = await (await call('GET', '/api/teacher/classes/CYBER-RM01/progress')).json();
  const sent = (after.summary || []).find((r) => r.student.id === 's_leaves');
  ok('  the removed student is still in the payload', !!sent);
  ok('  carrying active = 0 so a client can tell them apart', sent && sent.student.active === 0, sent && sent.student.active);

  console.log('\nA5. PATCH active:true puts them back');
  const back = await call('PATCH', '/api/teacher/classes/CYBER-RM01/students/s_leaves', { active: true });
  ok('  the call succeeds', back.status === 200, back.status);
  ok('  the student is active again', db.prepare('SELECT active FROM students WHERE id = ?').get('s_leaves').active === 1);
  ok('  and can sign in again', (await login('Ada Analyst')).status === 200);
  // Leave them removed for the client half below.
  await call('DELETE', '/api/teacher/classes/CYBER-RM01/students/s_leaves');

  // ═══════════════════════════════════════════════════════════════════════════
  //  B. THE PAGE: a removed student leaves every live view
  // ═══════════════════════════════════════════════════════════════════════════
  const FILE = path.join(__dirname, '..', 'shopify', 'cyber-dashboard.html');
  const html = fs.readFileSync(FILE, 'utf8');
  const body = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');

  console.log('\nB1. The dialog describes what the server actually does');
  ok('  no "permanently deletes their progress" claim survives',
    !/permanently deletes their progress/.test(body));
  ok('  the copy says the scores are kept', /Their scores are kept/.test(body));
  ok('  and names the way back', /restore them from Settings/i.test(body));
  ok('  a Restore action exists', /async restoreStudent\(/.test(body));
  ok('  and it reactivates rather than re-creating', /restoreStudent[\s\S]{0,400}\{active:true\}/.test(body));

  console.log('\nB2. Run the page\'s own buildModel, with a stub DOM');
  const el = () => ({
    style: { setProperty() {} }, dataset: {}, value: '', textContent: '', innerHTML: '', checked: false,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, appendChild() {}, setAttribute() {}, getAttribute() { return null; },
    querySelector: () => el(), querySelectorAll: () => [], add() {}, focus() {}, click() {}, remove() {},
    getBoundingClientRect: () => ({ top: 0, left: 0, bottom: 0, right: 0 }),
  });
  const sandbox = {
    console,
    document: {
      getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [],
      createElement: () => el(), addEventListener() {}, body: el(), documentElement: el(),
    },
    window: { innerWidth: 1400, scrollY: 0, scrollX: 0, addEventListener: () => {}, location: { search: '', pathname: '/pages/cyber-dashboard', replace() {} } },
    location: { search: '?code=CYBER-RM01', pathname: '/pages/cyber-dashboard', replace() {} },
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
    fetch: () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }),
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    URLSearchParams, AbortController, Blob: function () {}, URL: { createObjectURL: () => '', revokeObjectURL() {} },
    setTimeout, clearTimeout, Math, JSON, Date, String, Number, Array, Object, RegExp, isNaN, parseInt, parseFloat, Option: function () {},
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  let loaded = true;
  try { vm.runInContext(body, sandbox, { timeout: 5000 }); } catch (e) { loaded = false; console.log('    load error: ' + e.message); }
  ok('  the page script loads in a stub DOM', loaded);
  const T = sandbox.window.TCDash;
  ok('  TCDash is exposed by the page', !!T);
  if (!T) { console.log('\nFAILED: page did not load\n'); process.exit(1); }

  //  The real payload the API just produced, so the page is fed exactly what it
  //  will receive in production rather than a hand-written approximation.
  const live = await (await call('GET', '/api/teacher/classes/CYBER-RM01/progress')).json();
  ok('  the live payload still carries both students', (live.summary || []).length === 2, (live.summary || []).length);
  T.data = live;
  T.model = T.buildModel(live);

  console.log('\nB3. The roster the teacher sees');
  const names = T.model.students.map((s) => s.name);
  ok('  the removed student is gone from model.students', names.indexOf('Ada Analyst') === -1, names);
  ok('  the student who stayed is still there', names.indexOf('Grace Grader') > -1, names);
  ok('  the roster is one shorter', T.model.students.length === 1, T.model.students.length);

  console.log('\nB4. Gone from the view, not from the record');
  const removed = (T.model.removed || []).map((s) => s.name);
  ok('  the removed student is in model.removed', removed.indexOf('Ada Analyst') > -1, removed);
  ok('  and only them', T.model.removed.length === 1, T.model.removed.length);
  ok('  their detail came along, so nothing was thrown away',
    !!(T.model.removed[0] && T.model.removed[0].detail));
  ok('  the page can still find them by id, which is how Restore works',
    !!T._findStudent('s_leaves'));
  ok('  a removed student is flagged, not just filtered', T.model.removed[0].active === false);

  console.log('\nB5. Everything downstream of model.students follows');
  const csv = T.buildGradebookCSV();
  ok('  the gradebook CSV omits the removed student', csv.indexOf('Ada Analyst') === -1);
  ok('  and still lists the one who stayed', csv.indexOf('Grace Grader') > -1);
  //  The stat card and the header count both read model.students.length, so the
  //  "N students" the teacher reads is now the roster in front of them.
  ok('  the student count is the active roster', T.model.students.length === 1, T.model.students.length);

  console.log('\nB6. Restoring puts the student back on the roster');
  await call('PATCH', '/api/teacher/classes/CYBER-RM01/students/s_leaves', { active: true });
  const restored = await (await call('GET', '/api/teacher/classes/CYBER-RM01/progress')).json();
  const m2 = T.buildModel(restored);
  ok('  they are on the roster again', m2.students.map((s) => s.name).indexOf('Ada Analyst') > -1);
  ok('  and no longer listed as removed', m2.removed.length === 0, m2.removed.length);
  ok('  their work came back with them',
    !!(m2.students.find((s) => s.id === 's_leaves') || {}).detail);

  console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILURES') + '  (' + pass + ' passed, ' + fail + ' failed)\n');
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail === 0 ? 0 : 1);
})();
