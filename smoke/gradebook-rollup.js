'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the operator gradebook rolls up POINTS, at every level, not a mean of
//  percentages. Board 85.
//
//  WHAT THIS IS FOR
//  #85 was written against a student ROW that averaged percentages, and that
//  half was fixed: lib/admin-gradebook.js has summed points into overall.pct
//  since 2026-09-02. Four places kept the old arithmetic, and every one of them
//  is a number a teacher reads:
//
//    the lesson cell     printed "10 / 30" with "60%" beside it, because the
//                        pair summed marks and the percent averaged the two
//                        item percentages. Ten marks out of thirty is 33.
//    the column footer   class average per assignment, a mean over students
//    the lesson footer   the same, per lesson
//    the class average   a mean of student percentages, so a student on 1 / 1
//                        weighed the same as a student on 12 / 40
//
//  And one denominator too many was collapsed: `overall.possible` carried the
//  ATTEMPTED sum, which the contract calls `graded`, so a consumer asking how
//  much of the course is priced got a number that equals the graded total by
//  construction and therefore always reads as complete.
//
//  WHY A SEPARATE FIXTURE
//  smoke/admin-gradebook.js stayed green through all of it, because its columns
//  are equally weighted: where every cell in a column is out of the same number,
//  a mean of percentages and a points average are the SAME number, and no
//  assertion over that fixture can tell the two rules apart. This fixture is
//  built so they differ at every level, and each assertion names the level it
//  covers so smoke/admin-gradebook-mutation.js can aim at it.
//
//  Every expected number below is stated as a fraction, so a reader can check
//  the arithmetic without running anything.
//
//  Zero PII: synthetic names, never printed. No network, no secrets.
//  Run: npm run smoke:gbrollup
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-gb-rollup.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const db = require('../db');
const { buildGradebook } = require('../lib/admin-gradebook');
const { buildCanonicalGradebook } = require('../lib/gradebook-contract');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);
const COURSE = 'ap-cybersecurity';

run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold,retry_allowed,games_graded)
     VALUES ('c_w','CYBER-W','Weighting','${COURSE}','t1',1,80,0,0)`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash,created_at) VALUES
 ('sA','c_w','Student A','x',datetime('now','-2 days')),
 ('sB','c_w','Student B','x',datetime('now','-1 days'))`);

// The authored "out of" per (lesson, activity). This is what makes the weights
// unequal, and unequal weights are the whole point of the fixture.
const denom = (lesson, act, possible) => run(
  `INSERT INTO course_denominators (course,unit,lesson,activity_type,possible) VALUES (?,?,?,?,?)`,
  COURSE, 'unit-1', lesson, act, possible);
denom('1.1', 'exercise-1', 5);
denom('1.1', 'quiz', 25);
denom('1.2', 'lab', 10);
denom('1.3', 'quiz', 20);

let pid = 0;
const prog = (s, lesson, act, completed, score) => run(
  `INSERT INTO progress (id,student_id,class_id,course,unit,lesson,activity_type,completed,score,updated_at)
   VALUES (?,?,'c_w',?,?,?,?,?,?,datetime('now'))`,
  'p' + (++pid), s, COURSE, 'unit-1', lesson, act, completed, score);

// ── Student A, lesson 1.1: a 5 mark exercise aced, a 25 mark quiz at 20% ─────
//  10 marks out of 30. The mean of 100 and 20 is 60, and 60 is the number this
//  cell used to print beside "10 / 30".
prog('sA', '1.1', 'lesson', 1, null);          // a visit: never graded, never missing
prog('sA', '1.1', 'exercise-1', 1, 100);       // 5 / 5
prog('sA', '1.1', 'quiz', 1, 20);              // 5 / 25

// ── Student B, lesson 1.2: one 10 mark lab, full marks ───────────────────────
prog('sB', '1.2', 'lab', 1, 100);              // 10 / 10

// ── A graded activity finished with NO score, and a visit beside it ──────────
//  The first must read as lost. The second must not: a lesson visit is not a
//  missing grade, and a tally that counted both would cry wolf on every class.
prog('sB', '1.4', 'lab', 1, null);
prog('sB', '1.4', 'lesson', 1, null);

// ── One column, two denominators: the attempts path keeps what the page
//  reported, so 1.3 quiz is out of 20 for one student and out of 2 for the
//  other. That is the shape a mean of percentages cannot survive: 90 and 50
//  average to 70, while 19 marks out of 22 is 86.
const att = (s, lesson, item, type, sc, mx) => run(
  `INSERT INTO attempts (student_id,class_id,course,lesson_id,item_id,item_type,score,max_score,passed,attempt_no)
   VALUES (?,'c_w',?,?,?,?,?,?,?,1)`, s, COURSE, lesson, item, type, sc, mx, sc / mx * 100 >= 80 ? 1 : 0);
att('sA', '1.3', '1.3-quiz-a', 'quiz', 18, 20);
att('sB', '1.3', '1.3-quiz-a', 'quiz', 1, 2);

// ── An UNPRICED column, so the labelled percent fallback is exercised ────────
//  Nobody has authored an "out of" for 1.5 exercise-1, so there are no marks to
//  add and the mean of the percentages is the only number there is. It has to
//  stay visible, and it has to say which rule produced it.
prog('sA', '1.5', 'exercise-1', 1, 90);
prog('sB', '1.5', 'exercise-1', 1, 60);

const g = buildGradebook('CYBER-W', { reveal: true });
const A = g.students.find((s) => s.label === 'Student A');
const B = g.students.find((s) => s.label === 'Student B');
const item = (lesson, act) => g.items.find((i) => i.lesson_id === lesson && i.activity === act);
const lesson = (id) => g.lessons.find((l) => l.lesson_id === id);

console.log('1. The lesson cell: a percent that is its own fraction');
const cell11 = A.cells['1.1'];
ok('the lesson cell shows the marks pair', cell11.earned === 10 && cell11.possible === 30, cell11);
ok('the lesson percent is 33, the marks answer', cell11.pct === 33, cell11.pct);
ok('and NOT the 60 a mean of the two item percentages gives', cell11.pct !== 60, cell11.pct);
ok('the lesson percent equals its own displayed fraction',
  cell11.pct === Math.round((cell11.earned / cell11.possible) * 100), cell11);
ok('and it says which rule produced it', cell11.basis === 'points', cell11.basis);
// 33 is below the 80 threshold and 60 is too, so this is asserted on the
// arithmetic rather than on a colour that happens to agree either way.
ok('the pass decision follows the marks, not the mean', cell11.passed === false, cell11);

console.log('2. The unpriced lesson keeps the mean, and says so');
const cell15 = A.cells['1.5'];
ok('an unpriced lesson still reports a percent', cell15.pct === 90, cell15);
ok('it shows no marks pair to contradict', cell15.earned === null && cell15.possible === null, cell15);
ok('and it is labelled percent, not points', cell15.basis === 'percent', cell15.basis);

console.log('3. Three denominators, and they are three different numbers');
// A: 5/5 + 5/25 + 18/20 = 28 of 50. The course prices 5 + 25 + 10 + 20 = 60.
ok('earned is the marks scored on attempted work', A.overall.earned === 28, A.overall);
ok('graded is the marks available on attempted work', A.overall.graded === 50, A.overall);
ok('possible is the whole course, a bigger number', A.overall.possible === 60, A.overall);
ok('the grade divides by graded: 28 of 50 is 56', A.overall.pct === 56, A.overall);
ok('and NOT by the course total, which would read 47', A.overall.pct !== 47, A.overall.pct);
ok('every student reports the same course total',
  A.overall.possible === B.overall.possible, [A.overall.possible, B.overall.possible]);
ok('items_total counts the graded columns in the course',
  A.overall.items_total === B.overall.items_total && A.overall.items_total > 4, A.overall.items_total);

console.log('4. A graded activity finished with no score is not "done"');
// The column key is unit scoped: `unit|lesson|activity`.
const lost = B.items['unit-1|1.4|lab'];
ok('the lost cell is flagged score_missing', lost && lost.score_missing === true, lost);
ok('and carries no percent to be counted', lost && lost.pct === null, lost);
ok('the student row tallies it', B.overall.items_score_missing === 1, B.overall);
const visit14 = B.items['unit-1|1.4|lesson'];
ok('a lesson visit beside it is NOT counted as a missing grade',
  visit14 && !visit14.score_missing, visit14);
ok('and Student A, who lost nothing, tallies zero', A.overall.items_score_missing === 0, A.overall);

console.log('5. The column footer: marks over marks across students');
const q13 = item('1.3', 'quiz');
ok('the column carries its marks pair', q13.class_earned === 19 && q13.class_graded === 22, q13);
ok('19 of 22 is 86', q13.class_avg_pct === 86, q13.class_avg_pct);
ok('and NOT the 70 that averaging 90 and 50 gives', q13.class_avg_pct !== 70, q13.class_avg_pct);
ok('the column says it is points based', q13.class_avg_basis === 'points', q13.class_avg_basis);
const e15 = item('1.5', 'exercise-1');
ok('an unpriced column falls back to the mean, 75', e15.class_avg_pct === 75, e15.class_avg_pct);
ok('and is labelled percent', e15.class_avg_basis === 'percent', e15.class_avg_basis);
ok('a column nobody has touched has no average at all',
  item('2.1', 'quiz').class_avg_pct === null && item('2.1', 'quiz').class_avg_basis === 'none');

console.log('6. The lesson footer, same rule');
const l13 = lesson('1.3');
ok('lesson 1.3 averages 19 of 22, not 90 and 50', l13.class_avg_pct === 86, l13.class_avg_pct);
ok('it carries the pair behind that number', l13.class_earned === 19 && l13.class_graded === 22, l13);
ok('and counts who contributed marks', l13.priced_students === 2, l13);

console.log('7. The class average');
// A is 28 of 50, B is 11 of 12. Marks: 39 of 62 is 63. Mean of 56 and 92 is 74.
ok('the class average is 39 of 62, which is 63', g.summary.class_avg_pct === 63, g.summary);
ok('and NOT the 74 a mean of the two student grades gives', g.summary.class_avg_pct !== 74, g.summary.class_avg_pct);
ok('the summary carries the fraction behind it',
  g.summary.earned === 39 && g.summary.graded === 62, g.summary);
ok('and the course total beside it', g.summary.possible === 60, g.summary);
ok('labelled points', g.summary.class_avg_basis === 'points', g.summary.class_avg_basis);

console.log('8. The activity rollup is not a mean of means');
const quizCov = g.activity_coverage.find((c) => c.activity === 'quiz');
// 1.1 quiz is 5 of 25, 1.3 quiz is 19 of 22: 24 of 47 is 51. Weighting each
// column average by how many students sat it gives 53.
ok('the quiz rollup is 24 of 47, which is 51', quizCov.avg_pct === 51, quizCov);
ok('and NOT the 53 the mean of column averages gives', quizCov.avg_pct !== 53, quizCov.avg_pct);
ok('it carries its own pair', quizCov.earned === 24 && quizCov.graded === 47, quizCov);

console.log('9. The operator view and the teacher view still agree');
//  The check that did not exist: smoke/gradebook-contract.js compares the
//  teacher route to as-teacher, and nothing ever compared THIS builder to
//  either, which is how the two drifted with a green suite for six days.
const c = buildCanonicalGradebook('CYBER-W', { reveal: true });
const cA = c.students.find((s) => s.label === 'Student A' || s.display_name === 'Student A');
ok('both views found the student', !!cA);
ok('same earned', cA.overall.earned === A.overall.earned, [cA.overall.earned, A.overall.earned]);
ok('same graded', cA.overall.graded === A.overall.graded, [cA.overall.graded, A.overall.graded]);
ok('same course total', cA.overall.possible === A.overall.possible, [cA.overall.possible, A.overall.possible]);
ok('same grade, to the rounding each view keeps',
  Math.abs(cA.overall.pct - A.overall.pct) < 0.5, [cA.overall.pct, A.overall.pct]);
ok('same class average', Math.abs(c.summary.class_pct - g.summary.class_avg_pct) < 0.5,
  [c.summary.class_pct, g.summary.class_avg_pct]);
ok('same class fraction', c.summary.earned === g.summary.earned && c.summary.graded === g.summary.graded,
  [[c.summary.earned, c.summary.graded], [g.summary.earned, g.summary.graded]]);
ok('same column average on the two-denominator column',
  Math.abs(c.items.find((i) => i.lesson_ref === '1.3' && i.native_activity === 'quiz').class_avg_pct
    - q13.class_avg_pct) < 0.5);

console.log('\n' + (fail === 0 ? `OK - all ${pass} checks passed` : `${fail} FAILED (${pass} passed)`));
process.exit(fail === 0 ? 0 : 1);
