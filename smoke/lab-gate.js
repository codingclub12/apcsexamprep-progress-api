'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: a closed lab is actually closed
//
//  A teacher reported on 2026-09-07 that labs opened for their students while
//  the gradebook showed them shut, and they were right about both halves:
//
//    1. routes/labs.js served every spec to everyone and never consulted
//       activity_gates at all, so the gradebook switch wrote a row that nothing
//       on the delivery path ever read.
//    2. The gradebook then said the lock was UNENFORCEABLE, because
//       lock_enforceable only counted quiz_bank and a lab is not in quiz_bank.
//       So the one signal built to stop this exact lie was itself wrong here.
//
//  The second is the more interesting failure. Enforceability is "does the
//  SERVER hand this out", and quiz_bank was treated as the only way it can.
//  Labs are served from config/labs by a route of their own, so the server
//  always could have withheld them.
//
//  WHAT MUST STAY TRUE, and it is why the route is not simply put behind auth:
//  the header on routes/labs.js says a lab is public on purpose, so a teacher
//  can preview one and an anonymous visitor can try one. The token stays
//  OPTIONAL. Only a signed-in student whose own class closed the lab is
//  refused, which is the only case the teacher was asking about.
//
//  The known limit is asserted rather than left to be discovered: a student who
//  signs out still gets the lab, exactly as they still get a closed quiz. The
//  gate answers "is this open for my class", not "can anyone reach this".
//
//  Offline and secret-free: throwaway SQLite, the real router in process.
//  Zero PII. No em-dashes.
//
//  Run: npm run smoke:labgate
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-lab-gate.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signStudentToken, signTeacherToken } = require('../utils');
const labSpec = require('../lib/lab-spec');
const contract = require('../lib/gradebook-contract');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 260) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

const app = express();
app.use(express.json());
app.use(require('../routes/labs'));
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const call = (m, u, b, auth) => fetch(base() + u, {
  method: m, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) },
  ...(b ? { body: JSON.stringify(b) } : {}),
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

// ── a real authored lab, so this cannot pass against a fixture that drifted ──
const LAB = labSpec.all().find((s) => s.course === 'ap-cybersecurity' && s.unit && s.lesson_id);
if (!LAB) { console.log('no cyber lab authored; nothing to test'); process.exit(1); }
const ACT = LAB.item_type || 'terminal-lab';
const CODE = 'CYBER-LABG';

run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,quiz_lock_default)
     VALUES ('c1','t1',?,'Lab Gate','ap-cybersecurity',1,80,1,0)`, CODE);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c1','A','x')`);
// A class on a DIFFERENT course, to prove the gate does not reach across them.
//  It is given a CLOSED row for this very lab. Without that row the assertion
//  below is hollow: a class with no rows at all resolves open either way, so
//  deleting the course check would change nothing and the mutation battery
//  reported exactly that.
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,quiz_lock_default) VALUES ('c2','t1','CSA-LABG','Other','ap-csa',1,0)`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s2','c2','B','x')`);
run(`INSERT INTO course_manifest (course,unit,lesson_id,item_id,item_type,points) VALUES (?,?,?,?,?,6)`,
  LAB.course, LAB.unit, LAB.lesson_id, LAB.item_id, ACT);

const TT = signTeacherToken({ id: 't1', email: 't@s.org' });
const ST = signStudentToken({ id: 's1', class_id: 'c1' });
const OTHER = signStudentToken({ id: 's2', class_id: 'c2' });
const URL = `/api/labs/${LAB.course}/${LAB.item_id}`;
const setGate = (b) => call('POST', `/api/teacher/classes/${CODE}/gate`, { course: LAB.course, unit: LAB.unit, ...b }, TT);

(async () => {
  console.log(`\n  driving the authored lab ${LAB.course} ${LAB.unit} ${LAB.lesson_id} ${ACT}\n`);
  console.log('1. Before anything is closed');
  let r = await call('GET', URL, null, ST);
  ok('  a student in the class gets the lab', r.status === 200 && !r.body.locked && !!r.body.brief, r.body && Object.keys(r.body || {}).slice(0, 5));
  r = await call('GET', URL);
  ok('  an anonymous visitor gets it too', r.status === 200 && !r.body.locked);

  console.log('\n2. THE BUG: the teacher closes the lab');
  await setGate({ lesson: LAB.lesson_id, activity_type: ACT, open: false });
  r = await call('GET', URL, null, ST);
  ok('  the signed-in student is refused', r.body && r.body.locked === true, r.body);
  ok('  and the spec is NOT on the wire', r.body && r.body.lab === null && !r.body.brief && !r.body.steps, Object.keys(r.body || {}));
  ok('  it is a 200, so the player can say "not opened yet" rather than "missing"', r.status === 200, r.status);

  console.log('\n3. What must stay true: the lab is still public');
  r = await call('GET', URL);
  ok('  an anonymous visitor still gets it, so teacher preview survives', r.status === 200 && !r.body.locked, r.body && r.body.locked);
  //  c2 carries a CLOSED row for this exact lab, so if the course check went
  //  away this student would be refused a lab their own teacher never closed.
  run(`INSERT INTO activity_gates (class_id,course,unit,lesson,activity_type,open) VALUES ('c2',?,?,?,?,0)`,
    LAB.course, LAB.unit, LAB.lesson_id, ACT);
  r = await call('GET', URL, null, OTHER);
  ok('  a student in another course is unaffected', r.status === 200 && !r.body.locked, r.body && r.body.locked);
  r = await call('GET', URL, null, 'not-a-real-token');
  ok('  a junk token degrades to anonymous rather than 401ing', r.status === 200 && !r.body.locked, r.status);

  console.log('\n4. The scopes reach labs, not just the exact activity');
  run('DELETE FROM activity_gates WHERE class_id = ?', 'c1');
  await setGate({ open: false });                       // whole unit
  r = await call('GET', URL, null, ST);
  ok('  a UNIT-scope close reaches the lab', r.body && r.body.locked === true, r.body && r.body.reason);
  await setGate({ lesson: LAB.lesson_id, open: true }); // reopen just this lesson
  r = await call('GET', URL, null, ST);
  ok('  and reopening the lesson reopens it', r.body && !r.body.locked, r.body && r.body.reason);

  console.log('\n5. The gradebook stops calling a lab lock unenforceable');
  run('DELETE FROM activity_gates WHERE class_id = ?', 'c1');
  await setGate({ lesson: LAB.lesson_id, activity_type: ACT, open: false });
  const gb = contract.buildCanonicalGradebook('c1', { reveal: false });
  const item = gb.items.find((i) => i.unit === LAB.unit && i.lesson_ref === LAB.lesson_id && i.native_activity === ACT);
  ok('  the lab has a gradebook column', !!item, gb.items.map((i) => i.item_key).slice(0, 6));
  ok('  it reports locked', item && item.locked === true, item && item.lock_scope);
  ok('  and it reports the lock as ENFORCEABLE, which is the half that was lying',
    item && item.lock_enforceable === true, item && item.lock_enforceable);
  ok('  so it is not named as an unenforceable lock',
    !gb.gates.locked_but_unenforceable.includes(item && item.item_key), gb.gates.locked_but_unenforceable);

  console.log('\n6. The known limit, asserted rather than discovered');
  r = await call('GET', URL);
  ok('  a signed-OUT student still reaches a closed lab, exactly as with a quiz',
    r.status === 200 && !r.body.locked,
    'this is the gate answering "open for my class", not "reachable by anyone"');

  console.log(`\n  ${pass} passed, ${fail} failed`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
