'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: denominator coverage and adoption.
//
//  The bug this closes: course_denominators was only ever seeded for ap-csa, so
//  every Cybersecurity gradebook denominated by whatever happened to be recorded
//  ("/5" on a 6-point quiz). This module reports the gap and proposes the value
//  from the class data. Because a bad proposal would silently rewrite what every
//  teacher sees, the bar here is that it must refuse to guess: a column students
//  disagree on stays ambiguous, and an existing authored row is never clobbered.
//
//  It must also never touch a stored score. The last block asserts exactly that.
//
//  Run: npm run smoke:denominators
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-denominators.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const db = require('../db');
const denom = require('../lib/admin-denominators');

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  [PASS] ' + n); } else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); } };
const run = (s, ...a) => db.prepare(s).run(...a);
const col = (cov, lesson, act) => cov.columns.find((c) => c.lesson === lesson && c.activity_type === act);

run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold,retry_allowed) VALUES
 ('c_cy','CYBER-1','Cyber','ap-cybersecurity','t1',1,80,0),
 ('c_csa','CSA-1','CSA','ap-csa','t1',1,70,1)`);
let sid = 0;
const stu = (cid, n) => { const o = []; for (let i = 0; i < n; i++) { const id = 's' + (++sid);
  run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES (?,?,?,?)`, id, cid, 'N' + sid, 'x');
  o.push(id); } return o; };
const cy = stu('c_cy', 5);
const csa = stu('c_csa', 2);

let eid = 0;
const ev = (s, cid, course, unit, lesson, act, item, pts, max) =>
  run(`INSERT INTO score_events (id,student_id,class_id,course,unit,lesson,activity_type,item,points,max_points)
       VALUES (?,?,?,?,?,?,?,?,?,?)`, 'e' + (++eid), s, cid, course, unit, lesson, act, item, pts, max);

// ── Cyber 1.1 quiz: every student recorded 6 questions worth 1 point each ─────
//  Unanimous, so the proposal is unambiguous.
cy.forEach((s) => { for (let q = 1; q <= 6; q++) ev(s, 'c_cy', 'ap-cybersecurity', 'unit-1', '1.1', 'quiz', 'q' + q, q <= 4 ? 1 : 0, 1); });

// ── Cyber 1.1 exercise-1: 4 of 5 saw 5 points, one partial recording saw 3 ────
//  The partial must NOT drag the denominator down: 80 percent agreement wins.
cy.forEach((s, i) => { const n = i === 4 ? 3 : 5; for (let q = 1; q <= n; q++) ev(s, 'c_cy', 'ap-cybersecurity', 'unit-1', '1.1', 'exercise-1', 'x' + q, 1, 1); });

// ── Cyber 1.2 exercise-2: a genuine three-way split, nobody agrees ────────────
ev(cy[0], 'c_cy', 'ap-cybersecurity', 'unit-1', '1.2', 'exercise-2', 'a', 1, 2);
ev(cy[1], 'c_cy', 'ap-cybersecurity', 'unit-1', '1.2', 'exercise-2', 'a', 1, 4);
ev(cy[2], 'c_cy', 'ap-cybersecurity', 'unit-1', '1.2', 'exercise-2', 'a', 1, 7);

// ── Cyber 1.3 quiz: a single student, worth flagging as thin evidence ─────────
ev(cy[0], 'c_cy', 'ap-cybersecurity', 'unit-1', '1.3', 'quiz', 'a', 1, 9);

// ── Cyber lesson visits carry a max too, but a visit has no "out of" ──────────
cy.forEach((s) => ev(s, 'c_cy', 'ap-cybersecurity', 'unit-1', '1.1', 'lesson', 'visit', 1, 1));

// ── CSA: already authored, and the pages disagree with the authored value ─────
run(`INSERT INTO course_denominators (course,unit,lesson,activity_type,possible) VALUES
 ('ap-csa','unit-1','1.1','quiz',6)`);
csa.forEach((s) => { for (let q = 1; q <= 5; q++) ev(s, 'c_csa', 'ap-csa', 'unit-1', '1.1', 'quiz', 'q' + q, 1, 1); });

// ── CSA attempts path also feeds observation ─────────────────────────────────
run(`INSERT INTO attempts (student_id,class_id,course,lesson_id,item_id,item_type,score,max_score,passed,attempt_no)
     VALUES (?,?,?,?,?,?,?,?,?,?)`, csa[0], 'c_csa', 'ap-csa', '1.2', '1.2-quiz', 'quiz', 8, 10, 1, 1);
run(`INSERT INTO attempts (student_id,class_id,course,lesson_id,item_id,item_type,score,max_score,passed,attempt_no)
     VALUES (?,?,?,?,?,?,?,?,?,?)`, csa[1], 'c_csa', 'ap-csa', '1.2', '1.2-quiz', 'quiz', 6, 10, 0, 1);

// ─────────────────────────────────────────────────────────────────────────────
console.log('coverage: the gap is visible');
let cov = denom.coverage('ap-cybersecurity');
ok('reports the course', cov.course === 'ap-cybersecurity');
ok('every graded column is missing an authored value', cov.summary.authored === 0 && cov.summary.missing === cov.summary.graded_columns,
  cov.summary);
ok('expected columns appear even with no data', !!col(cov, '1.5', 'quiz'), 'no 1.5 quiz column');
ok('  and are marked no_data', col(cov, '1.5', 'quiz').status === 'no_data', col(cov, '1.5', 'quiz').status);

console.log('proposals come from what students actually recorded');
let q11 = col(cov, '1.1', 'quiz');
ok('unanimous column is proposed', q11.status === 'proposed', q11.status);
ok('  at the recorded value', q11.proposal === 6, q11);
ok('  with full agreement', q11.agreement_pct === 100, q11.agreement_pct);
ok('  counting every student', q11.students_scored === 5, q11.students_scored);

let e11 = col(cov, '1.1', 'exercise-1');
ok('one partial recording does not lower the denominator', e11.proposal === 5, e11);
ok('  and the disagreement is still reported', e11.agreement_pct === 80 && e11.observed_values.length === 2, e11.observed_values);

console.log('it refuses to guess');
let e12 = col(cov, '1.2', 'exercise-2');
ok('a three-way split is ambiguous, not proposed', e12.status === 'ambiguous', e12.status);
ok('  and carries no proposal', e12.proposal === null, e12.proposal);
ok('  but shows every candidate', e12.observed_values.length === 3, e12.observed_values);

console.log('visits are not graded work');
let vis = col(cov, '1.1', 'lesson');
ok('a lesson visit is excluded from the graded count', vis.graded === false, vis);
ok('  and is never proposed', vis.status === 'not_graded', vis.status);

console.log('thin evidence can be held back');
ok('one student is enough by default', col(cov, '1.3', 'quiz').status === 'proposed');
const strict = denom.coverage('ap-cybersecurity', { min_students: 3 });
ok('  but min_students holds it back', col(strict, '1.3', 'quiz').status === 'too_few', col(strict, '1.3', 'quiz').status);
ok('  without affecting a well-evidenced column', col(strict, '1.1', 'quiz').status === 'proposed');

console.log('an authored value that contradicts the pages is surfaced');
const csaCov = denom.coverage('ap-csa');
const csaQ = col(csaCov, '1.1', 'quiz');
ok('authored column reads authored', csaQ.status === 'authored' && csaQ.authored === 6, csaQ);
ok('  and the mismatch with the recording is flagged', !!csaQ.conflict && csaQ.conflict.observed === 5, csaQ.conflict);
ok('the attempts table is observed too', col(csaCov, '1.2', 'quiz').observed_mode === 10, col(csaCov, '1.2', 'quiz'));
ok('  and is attributed to its source', col(csaCov, '1.2', 'quiz').sources.includes('attempts'), col(csaCov, '1.2', 'quiz').sources);

console.log('dry run writes nothing');
const plan = denom.adopt('ap-cybersecurity', { adopt_proposed: true, dry_run: true });
ok('reports a plan', plan.dry_run === true && plan.applied === false && plan.would_write > 0, plan.would_write);
ok('  and the table is untouched', db.prepare("SELECT COUNT(*) n FROM course_denominators WHERE course='ap-cybersecurity'").get().n === 0);
ok('  the plan excludes the ambiguous column',
  !plan.planned.some((p) => p.lesson === '1.2' && p.activity_type === 'exercise-2'), plan.planned);
ok('  and excludes visits', !plan.planned.some((p) => p.activity_type === 'lesson'));

console.log('adopting writes the proposals');
const applied = denom.adopt('ap-cybersecurity', { adopt_proposed: true });
ok('applies', applied.applied === true && applied.written === plan.would_write, applied.written);
const wrote = db.prepare("SELECT lesson, activity_type, possible, unit FROM course_denominators WHERE course='ap-cybersecurity' ORDER BY lesson, activity_type").all();
ok('1.1 quiz is authored out of 6', wrote.some((r) => r.lesson === '1.1' && r.activity_type === 'quiz' && r.possible === 6), wrote);
ok('1.1 exercise-1 is authored out of 5', wrote.some((r) => r.lesson === '1.1' && r.activity_type === 'exercise-1' && r.possible === 5), wrote);
ok('the unit comes from the course config', wrote.every((r) => r.unit === 'unit-1'), wrote);

cov = denom.coverage('ap-cybersecurity');
ok('coverage now reports them authored', col(cov, '1.1', 'quiz').status === 'authored', col(cov, '1.1', 'quiz'));
ok('  and the ambiguous one is still missing', col(cov, '1.2', 'exercise-2').status === 'ambiguous');

console.log('re-running is safe');
const again = denom.adopt('ap-cybersecurity', { adopt_proposed: true });
ok('nothing is rewritten', again.written === 0, again.written);
ok('  and the reason is given', again.skipped.every((s) => s.reason === 'already authored'), again.skipped.slice(0, 2));

console.log('an existing value is only replaced deliberately');
const noClobber = denom.adopt('ap-cybersecurity', { values: { '1.1|quiz': 99 } });
ok('a plain write refuses to clobber', noClobber.written === 0
  && db.prepare("SELECT possible p FROM course_denominators WHERE course='ap-cybersecurity' AND lesson='1.1' AND activity_type='quiz'").get().p === 6);
const clobber = denom.adopt('ap-cybersecurity', { values: { '1.1|quiz': 99 }, overwrite: true });
ok('overwrite: true replaces it', clobber.written === 1
  && db.prepare("SELECT possible p FROM course_denominators WHERE course='ap-cybersecurity' AND lesson='1.1' AND activity_type='quiz'").get().p === 99);
ok('  and records what it replaced', clobber.planned[0].replaces === 6, clobber.planned[0]);
denom.adopt('ap-cybersecurity', { values: { '1.1|quiz': 6 }, overwrite: true });

console.log('explicit values reach columns with no data at all');
const forced = denom.adopt('ap-cybersecurity', { values: { '1.5|quiz': 8 } });
ok('writes a column nobody has attempted', forced.written === 1
  && db.prepare("SELECT possible p FROM course_denominators WHERE course='ap-cybersecurity' AND lesson='1.5' AND activity_type='quiz'").get().p === 8);

console.log('ambiguity can be forced, but only on purpose');
const amb = denom.adopt('ap-cybersecurity', { adopt_proposed: true, include_ambiguous: true });
ok('include_ambiguous writes the mode', amb.written === 1 && amb.planned[0].lesson === '1.2', amb.planned);
ok('  and labels it as forced', /ambiguous/.test(amb.planned[0].reason), amb.planned[0].reason);

console.log('bad input is rejected, not written');
const bad = denom.adopt('ap-cybersecurity', { values: { 'nokey': 5, '1.4|quiz': 0, '1.4|exam': -3 } });
ok('nothing written from bad input', bad.written === 0, bad.planned);
ok('  each rejection is explained', bad.skipped.length === 3, bad.skipped);

console.log('no stored score is ever touched');
const scoreSum = db.prepare('SELECT SUM(points) p, SUM(max_points) m, COUNT(*) n FROM score_events').get();
ok('score_events is unchanged', scoreSum.n === eid && scoreSum.p === 5 * 4 + (5 * 4 + 3) + 3 + 1 + 5 + 5 * 2,
  scoreSum);
ok('attempts is unchanged', db.prepare('SELECT COUNT(*) n, SUM(score) s FROM attempts').get().s === 14);

console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
process.exit(fail ? 1 : 0);
