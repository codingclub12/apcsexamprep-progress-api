'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: re-pricing a column never moves a grade somebody already earned.
//
//  WHY THIS EXISTS
//  The AP Cyber 1.1 quiz is being replaced: the live page asks 5 questions, the
//  corrected CED-aligned instrument asks 9. Landing it means re-pricing the
//  `1.1|quiz` column in course_denominators from 5 to 9, and the first question
//  a teacher asks about that is the right one: does it silently regrade the
//  students who already sat the old one?
//
//  It must not, and lib/gradebook-contract.js already says so in prose. SOURCE B
//  reports "Real points from the ledger, and THEY WIN", because an earlier pass
//  let an authored denominator rescale a reported pair and turned a real 3/8
//  into 6/15, a score no student ever got. This suite turns that paragraph into
//  an enforced fact, so the next person to re-price a column cannot undo it by
//  accident.
//
//  WHAT IS PINNED
//   - a cell a student actually reported keeps its own earned/possible pair, and
//     its percentage, across a denominator change in either direction
//   - the row total, which sums cells, is likewise unmoved
//   - the authored denominator still prices the column for a student who has
//     NOT attempted, which is the job it is actually for
//   - a mixed cohort is represented honestly: a 4/5 on the old instrument and a
//     7/9 on the new one sit in one column, each out of what its student saw
//
//  Offline and secret-free: throwaway SQLite file, no network, no live server.
//
//  Zero PII: synthetic students, numbers only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:denomsafety
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-denominator-safety.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const db = require('../db');
const { buildCanonicalGradebook } = require('../lib/gradebook-contract');

const COURSE = 'ap-cybersecurity';
const UNIT = 'unit-1';

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

// -- fixtures ----------------------------------------------------------------
run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,retry_mode)
     VALUES ('c1','t1','CYBER-DEN','Denominator',?,1,80,0,'none')`, COURSE);
// old   sat the 5 question quiz before the swap
// fresh sits the 9 question quiz after it
// never has not attempted at all, so the authored price is all there is
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES
 ('s_old','c1','Old','x'), ('s_fresh','c1','Fresh','x'), ('s_never','c1','Never','x')`);

// The column is priced at 5 today, matching the live 5 question page.
run(`INSERT INTO course_denominators (course,unit,lesson,activity_type,possible)
     VALUES (?,?,'1.1','quiz',5)`, COURSE, UNIT);

// One event per question is how the ledger records a quiz, so a 4 of 5 is five
// rows carrying one point each. item ids are per question and stable.
const event = (sid, item, points, max) => run(
  `INSERT INTO score_events (id,student_id,class_id,course,unit,lesson,activity_type,item,points,max_points)
   VALUES (lower(hex(randomblob(8))),?,'c1',?,?,'1.1','quiz',?,?,?)`,
  sid, COURSE, UNIT, item, points, max);

for (let i = 1; i <= 5; i++) event('s_old', `q${i}`, i <= 4 ? 1 : 0, 1);   // 4 of 5

// Cells are keyed `unit/lesson/activity`, and the row total is `overall`.
const CELL = `${UNIT}/1.1/quiz`;
const studentRow = (sid) =>
  (buildCanonicalGradebook('c1', {}).students || []).find((r) => r.id === sid);
const cellFor = (sid) => {
  const stu = studentRow(sid);
  return stu && stu.items ? stu.items[CELL] : null;
};
const rowFor = (sid) => {
  const stu = studentRow(sid);
  return stu ? stu.overall : null;
};

const before = cellFor('s_old');
ok('before re-pricing: the old attempt reads 4 of 5', before && before.earned === 4 && before.possible === 5, before);
ok('before re-pricing: that is 80 percent', before && Math.round(before.pct) === 80, before && before.pct);
const rowBefore = rowFor('s_old');

// -- THE CHANGE: re-price the column from 5 to 9 -----------------------------
run(`UPDATE course_denominators SET possible = 9
     WHERE course = ? AND lesson = '1.1' AND activity_type = 'quiz'`, COURSE);

const after = cellFor('s_old');
ok('after re-pricing: the old attempt STILL reads 4 of 5', after && after.earned === 4 && after.possible === 5, after);
ok('after re-pricing: still 80 percent, not 44', after && Math.round(after.pct) === 80, after && after.pct);
ok('after re-pricing: the pair came from the ledger, not the table',
  after && after.possible_source === 'observed', after && after.possible_source);

const rowAfter = rowFor('s_old');
// The GRADE half of the row must not move. `possible` is allowed to, and should:
// per docs/gradebook-contract.md the grade is earned / graded (points over work
// actually attempted) while `possible` is the pace denominator for the whole
// course. Re-pricing a column genuinely does add four points of course to pace,
// and saying so is the honest answer; what it must never do is restate a grade.
ok('re-pricing does not move the grade (earned / graded / pct)',
  rowBefore && rowAfter
  && rowAfter.earned === rowBefore.earned
  && rowAfter.graded === rowBefore.graded
  && rowAfter.pct === rowBefore.pct, { rowBefore, rowAfter });
ok('re-pricing DOES move pace `possible`, which is the number that should track it',
  rowBefore && rowAfter && rowBefore.possible === 5 && rowAfter.possible === 9,
  { before: rowBefore && rowBefore.possible, after: rowAfter && rowAfter.possible });

// -- a student who sits the NEW instrument is priced by what they saw --------
for (let i = 1; i <= 9; i++) event('s_fresh', `q${i}`, i <= 7 ? 1 : 0, 1);  // 7 of 9
const fresh = cellFor('s_fresh');
ok('the new attempt reads 7 of 9', fresh && fresh.earned === 7 && fresh.possible === 9, fresh);
ok('mixed cohort: both sit in one column, each out of what its student saw',
  after && fresh && after.possible === 5 && fresh.possible === 9);

// -- and the authored price is what an unattempted cell is for ---------------
// Not attempted and scored zero are different facts and must never render alike.
// An untouched cell is either absent from the row or explicitly not 'attempted';
// what it must never be is a zero.
const never = cellFor('s_never');
ok('a student who has not attempted is not scored 0',
  !never || (never.status !== 'attempted' && never.pct == null), never);

// Re-pricing in the other direction is equally inert, which is the case a
// rollback would hit.
run(`UPDATE course_denominators SET possible = 5
     WHERE course = ? AND lesson = '1.1' AND activity_type = 'quiz'`, COURSE);
const rolledBack = cellFor('s_fresh');
ok('rollback does not rescale the 9 question attempt either',
  rolledBack && rolledBack.earned === 7 && rolledBack.possible === 9, rolledBack);

console.log(`\n${pass} passed, ${fail} failed`);
db.close();
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
process.exit(fail ? 1 : 0);
