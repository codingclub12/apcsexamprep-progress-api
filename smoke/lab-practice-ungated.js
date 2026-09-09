'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: a lock with no key is not a lock
//
//  WHAT WENT WRONG, and a teacher spent an evening on it. An ungraded lab gets
//  no course_manifest row on purpose, so it has no gradebook column and no
//  switch on the assignments board. routes/labs.js gated it anyway, which means
//  the only thing that can ever close it is a WIDER row a teacher wrote about
//  something else: a unit or a lesson she locked. She then has nothing to click
//  to undo it, because the lab she is trying to open has no chip.
//
//  THE CLASS DEFAULT IS NOT THE MECHANISM, and the first draft of this suite
//  said it was. DEFAULT_GATED is {quiz, exam}, so quiz_lock_default never
//  touched a lab. Asserted below rather than assumed, because getting it wrong
//  once cost a wrong explanation to the teacher.
//
//  The lab page said both halves of it in adjacent sentences:
//
//    "This one is practice. It checks your work on the page and records nothing."
//    "Your teacher has not opened this lab yet."
//
//  Reported 2026-09-09: a teacher unlocked the 1.2 Lab chip and watched his
//  students stay shut out. The chip is 1.2-auth-lab, which is graded and lives
//  at 1.2. His students were opening 1.2-lab, which is practice and which the
//  server files at unit-4 / 4.3, so a lock he wrote over unit 4 was closing a
//  lab his students reached from lesson 1.2, and the 1.2 switch could not
//  possibly reach it.
//
//  THE RULE: a lab with no manifest row is not gated. A lab with one is gated
//  exactly as before.
//
//  THE RISK is the second half of that sentence. This must not become "labs are
//  no longer gated", so every existing behaviour is re-asserted against a lab
//  that DOES have a row: the class lock, the class default, and the anonymous
//  cross-class refusal all have to still bite. A suite that only tested the
//  practice lab would pass with the gate removed entirely.
//
//  IT ASKS THE MANIFEST, NOT spec.graded. The two agree today because
//  seed-manifest builds lab rows from labSpecs.graded(), so a suite that seeded
//  rows for every lab would pass either way and prove nothing about which source
//  the route reads. Section 3 pins the difference: a GRADED lab with its row
//  deleted must go ungated, and an UNGRADED lab given a row must be gated.
//
//  Run: npm run smoke:labpracticeungated
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-lab-practice-ungated.db');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-lab-practice-ungated-secret';
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signStudentToken } = require('../utils');
const labs = require('../lib/lab-spec');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

//  REAL SPECS, one of each kind, found by their graded flag rather than named,
//  so the suite cannot pass against a lab that has since changed shape.
const GRADED = labs.all().find((s) => s.graded && s.unit && s.lesson_id);
const PRACTICE = labs.all().find((s) => !s.graded && s.unit && s.lesson_id);
if (!GRADED || !PRACTICE) {
  console.error('need one graded and one ungraded locatable lab; this suite would be vacuous');
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(require('../routes/labs'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

const getLab = (spec, auth) => fetch(
  `${base()}/api/labs/${spec.course}/${encodeURIComponent(spec.item_id)}`,
  { headers: auth ? { Authorization: 'Bearer ' + auth } : {} },
).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

// ── fixtures ─────────────────────────────────────────────────────────────────
run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
//  LOCK BY DEFAULT, which is the setting that turns this from a nuisance into a
//  wall. A class that opens by default never saw the bug at all.
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,retry_mode,quiz_lock_default)
     VALUES ('c1','t1','CYBER-SHUT','Locked by default',?,1,80,1,'all',1)`, GRADED.course);
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,retry_mode,quiz_lock_default)
     VALUES ('c2','t1','CYBER-OPEN','Open by default',?,1,80,1,'all',0)`, GRADED.course);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c1','A','x')`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s2','c2','B','x')`);
const SHUT = signStudentToken({ id: 's1', class_id: 'c1' });
const OPEN = signStudentToken({ id: 's2', class_id: 'c2' });

const addRow = (spec) => run(
  `INSERT OR IGNORE INTO course_manifest (course,unit,lesson_id,item_id,item_type,points)
   VALUES (?,?,?,?,?,?)`,
  spec.course, spec.unit, spec.lesson_id, spec.item_id, spec.item_type, spec.points);
const dropRow = (spec) => run(
  'DELETE FROM course_manifest WHERE course = ? AND item_id = ?', spec.course, spec.item_id);
const hasRow = (spec) => !!db.prepare(
  'SELECT 1 FROM course_manifest WHERE course = ? AND item_id = ?').get(spec.course, spec.item_id);

//  The manifest as production builds it: graded labs get a row, practice labs
//  do not. Asserted rather than assumed, because the whole finding rests on it.
dropRow(GRADED); dropRow(PRACTICE);
addRow(GRADED);

const closeUnit = (cls, unit) => run(
  `INSERT INTO activity_gates (class_id,course,unit,lesson,activity_type,open,updated_at)
   VALUES (?,?,?,'*','*',0,datetime('now'))
   ON CONFLICT(class_id,course,unit,lesson,activity_type) DO UPDATE SET open=0`,
  cls, GRADED.course, unit);

const closeIt = (cls, spec) => run(
  `INSERT INTO activity_gates (class_id,course,unit,lesson,activity_type,open,updated_at)
   VALUES (?,?,?,?,?,0,datetime('now'))
   ON CONFLICT(class_id,course,unit,lesson,activity_type) DO UPDATE SET open=0`,
  cls, spec.course, spec.unit, spec.lesson_id, labs.aliases(spec)[0]);

(async () => {
  console.log(`\ngraded   ${GRADED.course}/${GRADED.item_id} at ${GRADED.unit}/${GRADED.lesson_id}`);
  console.log(`practice ${PRACTICE.course}/${PRACTICE.item_id} at ${PRACTICE.unit}/${PRACTICE.lesson_id}\n`);

  console.log('-- 1. the finding: practice has no column, so it has no lock --');

  ok('the graded lab has a manifest row and the practice lab does not',
    hasRow(GRADED) && !hasRow(PRACTICE), { graded: hasRow(GRADED), practice: hasRow(PRACTICE) });

  //  THE REPORTED SEQUENCE. He locked a unit, which is the ordinary way a term
  //  starts, and that unit is where this lab is filed even though his students
  //  reach it from another lesson entirely.
  closeUnit('c1', PRACTICE.unit);
  let r = await getLab(PRACTICE, SHUT);
  ok('a practice lab survives a UNIT lock written over the unit it is filed in',
    r.status === 200 && !r.body.locked && !!r.body.item_id,
    { locked: r.body && r.body.locked, reason: r.body && r.body.reason });

  closeIt('c1', PRACTICE);
  r = await getLab(PRACTICE, SHUT);
  ok('and an explicit closing row at its own location cannot shut it either',
    r.status === 200 && !r.body.locked, r.body);

  r = await getLab(PRACTICE, null);
  ok('a signed-out reader gets it too, since there is nothing to protect',
    r.status === 200 && !r.body.locked, r.body);

  console.log('\n-- 2. everything that gated a REAL lab still gates it --');

  //  The class default was NEVER the mechanism. DEFAULT_GATED is {quiz, exam}.
  //  Pinned here because the first reading of this bug blamed it, and a wrong
  //  mechanism is a wrong answer to the teacher even when the fix is right.
  r = await getLab(GRADED, SHUT);
  ok('a graded lab with no row is OPEN even in a lock-by-default class, because DEFAULT_GATED is quiz and exam',
    r.status === 200 && !r.body.locked, { locked: r.body && r.body.locked });

  closeIt('c1', GRADED);
  r = await getLab(GRADED, SHUT);
  ok('a graded lab IS shut by an explicit closing row',
    r.body && r.body.locked === true, r.body);
  ok('  and the refusal is attributed to the class',
    r.body && r.body.locked_for === 'class', r.body && r.body.locked_for);

  r = await getLab(GRADED, OPEN);
  ok('while a class that wrote no such row still gets it',
    r.status === 200 && !r.body.locked, r.body);

  r = await getLab(GRADED, null);
  ok('and the anonymous cross-class refusal still bites on a graded lab',
    r.body && r.body.locked === true && r.body.locked_for === 'anonymous', r.body);

  closeUnit('c1', GRADED.unit);
  r = await getLab(GRADED, SHUT);
  ok('a graded lab is shut by a UNIT lock too, which is what a wider switch writes',
    r.body && r.body.locked === true, r.body);

  console.log('\n-- 3. it reads the MANIFEST, not the graded flag --');

  //  These two are the only assertions that can tell the sources apart. Because
  //  seed-manifest builds lab rows from labSpecs.graded(), a suite that seeded
  //  the real manifest would pass whichever source the route consulted.
  dropRow(GRADED);
  r = await getLab(GRADED, SHUT);
  ok('a GRADED lab whose row is missing goes ungated, so the column is the test',
    r.status === 200 && !r.body.locked, { locked: r.body && r.body.locked, graded: GRADED.graded });
  addRow(GRADED);

  addRow(PRACTICE);
  r = await getLab(PRACTICE, SHUT);
  ok('an UNGRADED lab given a row IS gated, so the flag is not the test',
    r.body && r.body.locked === true, { locked: r.body && r.body.locked, graded: PRACTICE.graded });
  dropRow(PRACTICE);

  console.log('\n-- 4. an open lab returns the lab, not a verdict --');

  //  The first draft asserted reason === 'practice-no-column' on the response.
  //  There is no reason on the wire when a lab opens: the route puts the SPEC
  //  there, which is the whole point. The reason string is internal, so it is
  //  checked where it lives rather than invented on the response.
  r = await getLab(PRACTICE, SHUT);
  ok('an open practice lab puts the spec on the wire and no verdict',
    r.body && r.body.item_id === PRACTICE.item_id
      && r.body.locked === undefined && r.body.reason === undefined,
    { keys: r.body && Object.keys(r.body).slice(0, 6) });

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  process.exit(fail ? 1 : 0);
})();
