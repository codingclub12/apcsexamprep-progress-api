'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: a student and their teacher must see the same fraction.
//
//  THE DEFECT THIS REPLACES
//  GET /api/student/progress returned a percent and nothing else. With no
//  denominator available, the student page fell back to a hardcoded constant
//  per activity and rescaled the percent onto it. Measured live on Cyber Unit 1:
//
//      column        student page      actually authored
//      1.1 Ex 1      / 5               / 7
//      1.1 Ex 2      / 5               / 8
//      1.1 Quiz      / 10              / 5
//
//  Worse than cosmetic, because rescaling a percent onto a small wrong
//  denominator MOVES THE GRADE once it rounds. A student on 17 percent saw
//  "1/5", which reads as 20. A student on 25 percent saw "3/10", which reads as
//  30. Their teacher saw 17 and 25. Only an exact 0 or 100 survived intact.
//
//  THE RULE THIS PINS
//  Every denominator is points possible and every numerator is points earned,
//  resolved through ONE authority (lib/gradebook-contract.js) that the student,
//  teacher and admin views all call. Agreement is by construction, not by two
//  implementations happening to match.
//
//  Zero PII: synthetic names, a throwaway PIN, never printed.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:studentagree
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-student-agree.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
process.env.JWT_SECRET = 'smoke-student-agree-secret-long-enough';

const express = require('express');
const db = require('../db');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const app = express();
app.use(express.json());
app.use('/api/student', require('../routes/student'));
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const post = (p, body, tok) => fetch(base() + p, {
  method: 'POST',
  headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json() }));
const get = (p, tok) => fetch(base() + p, { headers: { Authorization: 'Bearer ' + tok } })
  .then(async (r) => ({ status: r.status, body: await r.json() }));

const { buildCanonicalGradebook } = require('../lib/gradebook-contract');
const run = (s, ...a) => db.prepare(s).run(...a);
const COURSE = 'ap-cybersecurity';
const near = (a, b, eps = 0.011) => a != null && b != null && Math.abs(a - b) < eps;

(async () => {
  console.log('\nSTUDENT AND TEACHER SEE THE SAME FRACTION\n');

  // The real Cyber Unit 1 values, which are exactly the ones the student page
  // was getting wrong.
  run(`INSERT INTO course_denominators (course,unit,lesson,activity_type,possible) VALUES
       (?,'unit-1','1.1','exercise-1',7),
       (?,'unit-1','1.1','exercise-2',8),
       (?,'unit-1','1.1','quiz',5),
       (?,'unit-1','1.2','exercise-1',7)`, COURSE, COURSE, COURSE, COURSE);

  const reg = await post('/api/teacher/register', {
    email: 'stu.agree@example.org', password: 'a-long-enough-password',
    name: 'Stu Agree', school: 'Example High',
  });
  const tok = reg.body.token;
  const cls = await post('/api/teacher/classes', { class_name: 'Cyber P1', course: COURSE }, tok);
  const code = cls.body.class.class_code;

  const j = await post('/api/student/join', { class_code: code, display_name: 'SA1', pin: '1234' });
  const stok = j.body.token;

  // Scores chosen so rounding onto a wrong denominator would visibly move them:
  // 17 percent onto /5 rounds to 1, which reads as 20.
  const marks = [
    ['1.1', 'exercise-1', 100],
    ['1.1', 'exercise-2', 38],
    ['1.1', 'quiz', 80],
    ['1.2', 'exercise-1', 17],
  ];
  for (const [lesson, act, score] of marks) {
    await post('/api/student/progress',
      { course: COURSE, unit: 'unit-1', lesson, activity_type: act, score, completed: true }, stok);
  }

  // ── 1. The student response carries points at all ─────────────────────────
  console.log('1. The student response carries points, not just a percent');
  const sv = await get('/api/student/progress', stok);
  ok('  responds', sv.status === 200, sv.status);
  ok('  every record carries points_possible and points_earned',
    sv.body.progress.every((r) => 'points_possible' in r && 'points_earned' in r));
  ok('  and a denominators map rides along',
    !!sv.body.denominators && Object.keys(sv.body.denominators).length > 0);

  // ── 2. The authored values, which the page used to guess ──────────────────
  console.log('2. The denominators are the authored ones');
  const d = sv.body.denominators;
  ok('  1.1 exercise-1 is 7, not the hardcoded 5', d['1.1|exercise-1'] === 7, d['1.1|exercise-1']);
  ok('  1.1 exercise-2 is 8, not the hardcoded 5', d['1.1|exercise-2'] === 8, d['1.1|exercise-2']);
  ok('  1.1 quiz is 5, not the hardcoded 10', d['1.1|quiz'] === 5, d['1.1|quiz']);

  // ── 3. Points earned is the percent of points possible ────────────────────
  console.log('3. Numerator is points earned against that total');
  const cell = (lesson, act) => sv.body.progress.find((r) => r.lesson === lesson && r.activity_type === act);
  const e1 = cell('1.1', 'exercise-1'), e2 = cell('1.1', 'exercise-2'), q = cell('1.1', 'quiz');
  ok('  100 percent of 7 is 7/7', near(e1.points_earned, 7) && e1.points_possible === 7,
    [e1.points_earned, e1.points_possible]);
  ok('  38 percent of 8 is 3.04/8', near(e2.points_earned, 3.04) && e2.points_possible === 8,
    [e2.points_earned, e2.points_possible]);
  ok('  80 percent of 5 is 4/5', near(q.points_earned, 4) && q.points_possible === 5,
    [q.points_earned, q.points_possible]);

  // The regression that motivated all of this.
  const e12 = cell('1.2', 'exercise-1');
  ok('  17 percent reads as 17, not the 20 a /5 rescale produced',
    Math.round((e12.points_earned / e12.points_possible) * 100) === 17,
    [e12.points_earned, e12.points_possible]);

  // ── 4. The student and the teacher agree, cell by cell ────────────────────
  console.log('4. Every cell matches what the teacher is shown');
  const g = buildCanonicalGradebook(code, { reveal: true });
  const student = g.students[0];
  const diffs = [];
  for (const r of sv.body.progress) {
    if (r.points_possible == null) continue;
    const t = student.items[`${r.unit}/${r.lesson}/${r.activity_type}`];
    if (!t) { diffs.push({ cell: `${r.lesson} ${r.activity_type}`, field: 'missing in teacher view' }); continue; }
    if (t.possible !== r.points_possible) {
      diffs.push({ cell: `${r.lesson} ${r.activity_type}`, field: 'possible', student: r.points_possible, teacher: t.possible });
    }
    if (!near(t.earned, r.points_earned)) {
      diffs.push({ cell: `${r.lesson} ${r.activity_type}`, field: 'earned', student: r.points_earned, teacher: t.earned });
    }
  }
  if (diffs.length) diffs.slice(0, 8).forEach((x) => console.log('      ' + JSON.stringify(x)));
  ok(`  ${sv.body.progress.filter((r) => r.points_possible != null).length} cells compared, zero disagreements`,
    diffs.length === 0, diffs.length);

  // ── 5. An unauthored column still shows a pair, marked provisional ────────
  //  Every graded cell carries points over points, on every course. Where
  //  nobody has authored a total the percent is its own pair. The property that
  //  makes this safe, and separates it from the constant table it replaced, is
  //  that the displayed percentage is UNCHANGED: 55 out of 100 still reads 55.
  //  Rescaling onto a wrong small constant did not have that property.
  console.log('5. An unauthored column still shows a pair, and reads the same');
  await post('/api/student/progress',
    { course: COURSE, unit: 'unit-1', lesson: '1.4', activity_type: 'lab', score: 55, completed: true }, stok);
  const sv2 = await get('/api/student/progress', stok);
  const lab = sv2.body.progress.find((r) => r.lesson === '1.4' && r.activity_type === 'lab');
  ok('  it is priced out of 100', lab.points_possible === 100, lab.points_possible);
  ok('  earned equals the percent, so nothing is rescaled', lab.points_earned === 55, lab.points_earned);
  ok('  the pair reads back as the same percentage it always did',
    Math.round((lab.points_earned / lab.points_possible) * 100) === lab.score, lab.score);
  ok('  and it is flagged provisional, not passed off as authored',
    lab.denominator_source === 'percent', lab.denominator_source);
  ok('  an authored column is still marked authored, not lumped in with it',
    sv2.body.progress.find((r) => r.lesson === '1.1' && r.activity_type === 'quiz').denominator_source === 'authored');

  // ── 6. The existing shape is intact ───────────────────────────────────────
  console.log('6. Regression: nothing the page already reads has moved');
  ok('  progress array still present', Array.isArray(sv2.body.progress));
  ok('  map still keyed course|unit|lesson|activity',
    !!sv2.body.map[`${COURSE}|unit-1|1.1|quiz`]);
  ok('  mastery_threshold still present', sv2.body.mastery_threshold === 80, sv2.body.mastery_threshold);
  ok('  score is still the percent it always was',
    cell('1.1', 'exercise-2').score === 38);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('\nSUITE ERROR:', e);
  server.close();
  process.exit(1);
});
