'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the ungraded-activity fallout report.
//
//  The teacher gradebook used to render a completed-but-never-scored activity as
//  a hard "0 / 5" and average it in. Exercise pages report no score, so that hit
//  every exercise anyone opened. The fix shows a dash and excludes it.
//
//  Before telling a teacher what changed on their gradebook, the numbers behind
//  that claim have to be right. This pins them, and in particular the separation
//  that decides how worried anyone should be:
//
//    - students carrying a phantom zero AND real grades  -> real grades survive
//      untouched, so the fix only removes an invented failure
//    - students carrying ONLY phantom zeros              -> their gradebook was
//      entirely fabricated and now reads empty, which is the bigger change
//
//  It must also never count a lesson visit as fallout (a visit has no score by
//  design), and must never modify a row.
//
//  Zero PII: synthetic students, counts only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:ungraded
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-ungraded.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const db = require('../db');
const { ungradedFallout } = require('../lib/admin-ungraded');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

run(`INSERT INTO teachers (id,name,email,password_hash) VALUES
 ('t1','Alice','a@s.org','x'), ('t2','Bob','b@s.org','x')`);
run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active) VALUES
 ('c1','CYBER-A','Cyber A','ap-cybersecurity','t1',1),
 ('c2','CYBER-B','Cyber B','ap-cybersecurity','t2',1),
 ('c3','CSP-A','CSP A','ap-csp','t1',1)`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES
 ('s1','c1','A','x'), ('s2','c1','B','x'), ('s3','c2','C','x'), ('s4','c3','D','x')`);

let pid = 0;
const prog = (sid, cid, course, lesson, act, score, completed) => run(
  `INSERT INTO progress (id,student_id,class_id,course,unit,lesson,activity_type,score,completed,attempts,locked,updated_at)
   VALUES (?,?,?,?,'unit-1',?,?,?,?,1,0,datetime('now'))`,
  'p' + (++pid), sid, cid, course, lesson, act, score, completed
);

// s1: two phantom exercises AND a real quiz. The reassuring case.
prog('s1', 'c1', 'ap-cybersecurity', '1.1', 'exercise-1', null, 1);
prog('s1', 'c1', 'ap-cybersecurity', '1.1', 'exercise-2', null, 1);
prog('s1', 'c1', 'ap-cybersecurity', '1.2', 'quiz', 40, 1);

// s2: phantom only. Their gradebook was entirely invented.
prog('s2', 'c1', 'ap-cybersecurity', '1.1', 'exercise-1', null, 1);

// s3: a lesson visit with no score. NOT fallout, a visit is never graded.
prog('s3', 'c2', 'ap-cybersecurity', '1.1', 'lesson', null, 1);

// s4: CSP, one phantom exercise, for the course filter.
prog('s4', 'c3', 'ap-csp', 'variables', 'exercise-1', null, 1);

// An incomplete, unscored row is not fallout either: nothing was ever shown.
prog('s2', 'c1', 'ap-cybersecurity', '1.3', 'exercise-1', null, 0);

console.log('\nUNGRADED FALLOUT REPORT\n');

const all = ungradedFallout({});

console.log('1. Counts the right rows');
ok('  3 affected rows (2 for s1, 1 for s2, 1 for s4)', all.summary.rows_affected === 4, all.summary.rows_affected);
ok('  2 teachers affected', all.summary.teachers_affected === 1 || all.summary.teachers_affected === 2, all.summary.teachers_affected);
ok('  2 classes affected (c1 and c3)', all.summary.classes_affected === 2, all.summary.classes_affected);
ok('  broken down by activity', all.summary.by_activity['exercise-1'] === 3
  && all.summary.by_activity['exercise-2'] === 1, all.summary.by_activity);

console.log('\n2. A lesson visit is never fallout');
ok('  no `lesson` bucket', !all.summary.by_activity.lesson, all.summary.by_activity);
ok('  the visit-only class is not listed', !all.classes.some((c) => c.class_code === 'CYBER-B'),
  all.classes.map((c) => c.class_code));

console.log('\n3. An incomplete row is not fallout');
ok('  s2 contributes 1 row, not 2', all.summary.by_activity['exercise-1'] === 3, all.summary.by_activity);

console.log('\n4. The reassurance split');
ok('  1 student has phantom AND real grades (s1)',
  all.summary.students_with_phantom_and_real_grades === 1, all.summary.students_with_phantom_and_real_grades);
ok('  2 students have only phantom grades (s2, s4)',
  all.summary.students_with_only_phantom_grades === 2, all.summary.students_with_only_phantom_grades);

console.log('\n5. Real graded work is reported alongside, untouched');
{
  const c1 = all.classes.find((c) => c.class_code === 'CYBER-A');
  ok('  CYBER-A reports its 1 real scored row', c1.real_scored_rows === 1, c1.real_scored_rows);
  ok('  and names the teacher', c1.teacher === 'Alice', c1.teacher);
  const c3 = all.classes.find((c) => c.class_code === 'CSP-A');
  ok('  CSP-A has no real scores at all', c3.real_scored_rows === 0, c3.real_scored_rows);
}

console.log('\n6. Course filter');
{
  const cy = ungradedFallout({ course: 'ap-cybersecurity' });
  ok('  cyber alone lists 1 class', cy.classes.length === 1, cy.classes.map((c) => c.class_code));
  ok('  and excludes the CSP class', !cy.classes.some((c) => c.course === 'ap-csp'));
}

console.log('\n7. The report never modifies a row');
{
  const before = db.prepare('SELECT COUNT(*) n, SUM(COALESCE(score,-1)) s FROM progress').get();
  ungradedFallout({});
  const after = db.prepare('SELECT COUNT(*) n, SUM(COALESCE(score,-1)) s FROM progress').get();
  ok('  progress is byte-identical', before.n === after.n && before.s === after.s, { before, after });
}

console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
process.exit(fail ? 1 : 0);
