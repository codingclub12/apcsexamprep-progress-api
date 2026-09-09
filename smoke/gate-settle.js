'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: a switch settles what is under it
//
//  WHAT WENT WRONG, and it reached a real teacher. The assignments board has said
//  "a mixed switch settles everything under it OPEN on the first click" since it
//  shipped. The route wrote ONE row at the clicked scope and left narrower rows
//  alone, and narrower always wins at read time. So a teacher whose lab carried
//  its own closing row flipped the 1.2 lesson switch to open, the lab stayed
//  shut, the board correctly re-rendered mixed, and clicking again did nothing
//  at all. Reported 2026-09-09: "1.2 have the lock off but it isn't open."
//
//  A switch that cannot settle is worse than a missing one, because there is no
//  way to tell from the outside that it is not working.
//
//  THE RULE UNDER TEST IS CONTAINMENT, NOT WIDTH, and that distinction is the
//  whole risk in the fix. A lesson row (1.2, *) and an activity-type row
//  (*, quiz) overlap without either containing the other, so clearing one for
//  the other would throw away a setting the teacher never spoke about:
//
//    write (*, *)      the unit         clears every row in the unit
//    write (1.2, *)    one lesson       clears (1.2, anything), NOT (*, quiz)
//    write (*, quiz)   every quiz       clears (anything, quiz), NOT (1.2, *)
//    write (1.2, quiz) one assignment   clears nothing
//
//  Rows 2 and 3 are the ones that catch a width-based implementation, which is
//  the obvious wrong way to write this and passes every test that only checks
//  the unit case.
//
//  PINNING MUST SURVIVE, because it is the feature the ladder exists for: close
//  the unit, then open one lesson inside it. That still works, because the
//  narrow write clears nothing above itself. Asserted end to end through the
//  quiz route rather than by reading rows, because "the row is there" and "the
//  student gets the quiz" have been different answers here before.
//
//  SCOPED TO ONE CLASS AND ONE UNIT. A delete that reaches another class or
//  another unit is the worst outcome available from this change, so both are
//  asserted with a bystander row that must survive untouched.
//
//  Run: npm run smoke:gatesettle
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-gate-settle.db');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-gate-settle-secret';
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const labs = require('../lib/lab-spec');
const { signTeacherToken, signStudentToken } = require('../utils');

const COURSE = 'ap-cybersecurity';
const UNIT = 'unit-1';
const OTHER_UNIT = 'unit-2';
const CODE = 'CYBER-SETTLE';

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

const app = express();
app.use(express.json());
app.use('/api/teacher', require('../routes/teacher'));
app.use('/api/quiz', require('../routes/quiz'));
//  The report is about a LAB, and routes/quiz.js will never serve one: its
//  activity_type allow-list is quiz/exam/exercise-N. Checking the lab through
//  the quiz route is checking the wrong door, and the first draft of this suite
//  did exactly that and reported the fixture as broken.
app.use(require('../routes/labs'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

const call = (method, url, body, auth) => fetch(base() + url, {
  method,
  headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

// ── fixtures ─────────────────────────────────────────────────────────────────
run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t2','O','o@s.org','x')`);
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,retry_mode,quiz_lock_default)
     VALUES ('c1','t1',?,'Settle',?,1,80,1,'all',0)`, CODE, COURSE);
//  A BYSTANDER CLASS. Its rows must survive every write below untouched.
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,retry_mode,quiz_lock_default)
     VALUES ('c2','t2','CYBER-OTHER','Bystander',?,1,80,1,'all',0)`, COURSE);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c1','A','x')`);

let qn = 0;
function bankRow(lesson, activity) {
  qn++;
  run(`INSERT INTO quiz_bank (qid,course,unit,lesson,activity_type,q_order,prompt,options,correct_index,explanation,points,active)
       VALUES (?,?,?,?,?,?,?,?,?,?,1,1)`,
    `q${qn}`, COURSE, UNIT, lesson, activity, qn,
    'prompt ' + qn, JSON.stringify(['a', 'b', 'c', 'd']), 1, 'why');
}
bankRow('1.2', 'quiz');
bankRow('1.3', 'quiz');

const TT = signTeacherToken({ id: 't1', email: 't@s.org' });
const ST = signStudentToken({ id: 's1', class_id: 'c1' });

const rowsFor = (cls, unit) => db.prepare(
  'SELECT lesson, activity_type, open FROM activity_gates WHERE class_id = ? AND course = ? AND unit = ? ORDER BY lesson, activity_type'
).all(cls, COURSE, unit).map((r) => `${r.lesson}|${r.activity_type}|${r.open}`);

const raw = (cls, unit, lesson, activity, open) => run(
  `INSERT INTO activity_gates (class_id,course,unit,lesson,activity_type,open,updated_at)
   VALUES (?,?,?,?,?,?,datetime('now'))
   ON CONFLICT(class_id,course,unit,lesson,activity_type) DO UPDATE SET open=excluded.open`,
  cls, COURSE, unit, lesson, activity, open);

const gate = (body) => call('POST', `/api/teacher/classes/${CODE}/gate`, body, TT);
const render = (lesson, activity, auth) =>
  call('GET', `/api/quiz/${COURSE}/${UNIT}/${lesson}/${activity}`, null, auth);

//  The lab the teacher actually reported, found by location rather than named,
//  so a rename cannot make this suite pass against a lab that moved.
const LAB = labs.all().find((s) => s.course === COURSE && s.unit === UNIT && s.lesson_id === '1.2');
if (!LAB) { console.error('no cyber lab at unit-1/1.2; this suite would not reproduce the report'); process.exit(1); }
const LAB_ALIAS = labs.aliases(LAB)[0];
const renderLab = (auth) =>
  call('GET', `/api/labs/${COURSE}/${encodeURIComponent(LAB.item_id)}`, null, auth);

const reset = () => db.prepare('DELETE FROM activity_gates').run();

//  Bystanders, re-seeded before each scoping assertion.
function seedBystanders() {
  raw('c2', UNIT, '1.2', 'quiz', 0);            // another class, same location
  raw('c1', OTHER_UNIT, '1.2', 'quiz', 0);      // same class, another unit
}

(async () => {
  console.log('\n-- 1. the report: a lesson switch settles the assignment under it --');

  reset();
  raw('c1', UNIT, '1.2', LAB_ALIAS, 0);          // the lab carries its own close
  let before = await renderLab(ST);
  ok('the lab starts closed, so the scenario is real',
    before.body && before.body.locked === true, before.body);

  const flip = await gate({ course: COURSE, unit: UNIT, lesson: '1.2', open: true });
  ok('flipping the LESSON switch to open reports what it cleared',
    flip.status === 200 && flip.body.cleared === 1, flip.body);

  const after = await renderLab(ST);
  ok('and the lab is now actually open to a student',
    after.status === 200 && !(after.body && after.body.locked), after.body);

  console.log('\n-- 2. containment, not width --');

  reset();
  raw('c1', UNIT, '1.2', 'quiz', 0);
  raw('c1', UNIT, '1.2', LAB_ALIAS, 0);
  raw('c1', UNIT, '*', 'quiz', 0);               // every quiz in the unit
  await gate({ course: COURSE, unit: UNIT, lesson: '1.2', open: true });
  ok('a LESSON write clears the rows inside that lesson',
    !rowsFor('c1', UNIT).some((r) => r.startsWith('1.2|quiz') || r.startsWith('1.2|' + LAB_ALIAS)),
    rowsFor('c1', UNIT));
  ok('  and leaves the activity-type row alone, which it does not contain',
    rowsFor('c1', UNIT).includes('*|quiz|0'), rowsFor('c1', UNIT));

  reset();
  raw('c1', UNIT, '1.2', 'quiz', 0);
  raw('c1', UNIT, '1.3', 'quiz', 0);
  raw('c1', UNIT, '1.2', '*', 0);                // a whole lesson
  await gate({ course: COURSE, unit: UNIT, activity_type: 'quiz', open: true });
  ok('an ACTIVITY-TYPE write clears that activity in every lesson',
    !rowsFor('c1', UNIT).some((r) => r.endsWith('|quiz|0')), rowsFor('c1', UNIT));
  ok('  and leaves the lesson row alone, which it does not contain',
    rowsFor('c1', UNIT).includes('1.2|*|0'), rowsFor('c1', UNIT));

  reset();
  raw('c1', UNIT, '1.2', 'quiz', 0);
  raw('c1', UNIT, '1.3', '*', 0);
  raw('c1', UNIT, '*', 'quiz', 0);
  await gate({ course: COURSE, unit: UNIT, open: true });
  ok('a UNIT write clears every row in the unit',
    rowsFor('c1', UNIT).join(',') === '*|*|1', rowsFor('c1', UNIT));

  reset();
  raw('c1', UNIT, '1.2', '*', 0);
  raw('c1', UNIT, '*', 'quiz', 0);
  const narrow = await gate({ course: COURSE, unit: UNIT, lesson: '1.2', activity_type: 'quiz', open: true });
  ok('an ASSIGNMENT write clears nothing, because nothing is narrower',
    narrow.body.cleared === 0 && rowsFor('c1', UNIT).length === 3, rowsFor('c1', UNIT));

  console.log('\n-- 3. pinning still works, end to end --');

  reset();
  await gate({ course: COURSE, unit: UNIT, open: false });                     // close the unit
  await gate({ course: COURSE, unit: UNIT, lesson: '1.2', open: true });       // reopen one lesson
  const pinned = await render('1.2', 'quiz', ST);
  const stillShut = await render('1.3', 'quiz', ST);
  ok('closing the unit then opening one lesson leaves that lesson OPEN',
    pinned.status === 200 && !(pinned.body && pinned.body.locked), pinned.body);
  ok('  while the rest of the unit stays closed',
    stillShut.body && stillShut.body.locked === true, stillShut.body);

  console.log('\n-- 4. the delete cannot reach past this class and this unit --');

  reset();
  seedBystanders();
  await gate({ course: COURSE, unit: UNIT, open: false });
  ok('another class keeps its row at the same location',
    rowsFor('c2', UNIT).includes('1.2|quiz|0'), rowsFor('c2', UNIT));
  ok('the same class keeps its rows in another unit',
    rowsFor('c1', OTHER_UNIT).includes('1.2|quiz|0'), rowsFor('c1', OTHER_UNIT));

  console.log('\n-- 5. clicking twice is idempotent, not a loop --');

  reset();
  raw('c1', UNIT, '1.2', LAB_ALIAS, 0);
  const first = await gate({ course: COURSE, unit: UNIT, lesson: '1.2', open: true });
  const second = await gate({ course: COURSE, unit: UNIT, lesson: '1.2', open: true });
  ok('the first click clears the blocker, the second has nothing left to clear',
    first.body.cleared === 1 && second.body.cleared === 0,
    { first: first.body.cleared, second: second.body.cleared });
  const settled = await renderLab(ST);
  ok('  and the assignment stays open across both',
    !(settled.body && settled.body.locked), settled.body);

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  process.exit(fail ? 1 : 0);
})();
