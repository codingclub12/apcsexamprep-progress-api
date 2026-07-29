'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: exercise reporting with REAL per-exercise denominators.
//
//  WHY THIS EXISTS
//  Cyber exercise pages report no score at all today. The teacher dashboard
//  renders a completed-but-ungraded activity as a hard 0, against a denominator
//  hardcoded per activity type ({'exercise-1':5,'exercise-2':5,'quiz':10}), so
//  every exercise shows a fabricated "0 / 5" and drags the class average down.
//
//  Both halves of that are wrong. 1.1 Exercise 1 has SEVEN red flags, so it is
//  out of 7, not 5. Exercises legitimately differ from one another, which a
//  single per-activity constant can never express. The fix is for the pages to
//  report a real pair, earned and possible, and for the gradebook to read it.
//
//  This pins the API half of that: a page sending {earned: 5, possible: 7} must
//  survive verbatim to the teacher gradebook as 5 out of 7, with no rescaling
//  onto some other denominator along the way.
//
//  It also pins the guard that makes reporting safe to depend on. Sending half
//  a pair used to be silently completed with a default: `possible` alone scored
//  a flat 0 out of 7, and `earned` alone scored 5 clamped to 1 out of 1. Once
//  stored, neither is distinguishable from a real grade. That is the same
//  failure already fixed on the quiz scorer, whose comment states the rule: a
//  genuine zero and a submission we could not read must never look the same.
//
//  Zero PII: synthetic students, author content, numbers only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:exercises
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-exercise-reporting.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signTeacherToken, signStudentToken } = require('../utils');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold,retry_allowed)
     VALUES ('c1','CYBER-EX','Cyber','ap-cybersecurity','t1',1,80,1)`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c1','A','x')`);

const app = express();
app.use(express.json());
app.use('/api/student', require('../routes/student'));
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const sTok = signStudentToken({ id: 's1', class_id: 'c1', display_name: 'A' });
const tTok = signTeacherToken({ id: 't1', email: 't@s.org' });

const report = (body) => fetch(`${base()}/api/student/score`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sTok },
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json() }));

const cell = async (lesson, act) => {
  const r = await fetch(`${base()}/api/teacher/classes/CYBER-EX/progress`,
    { headers: { Authorization: 'Bearer ' + tTok } });
  const d = (await r.json()).summary[0].detail;
  return d['unit-1'] && d['unit-1'][lesson] && d['unit-1'][lesson][act];
};

const EX1 = { course: 'ap-cybersecurity', unit: 'unit-1', lesson: '1.1', activity_type: 'exercise-1' };

(async () => {
  console.log('\nEXERCISE REPORTING (real per-exercise denominators)\n');

  // ── 1. The actual shape a page will send ─────────────────────────────────
  //  1.1 Exercise 1 has 7 red flags. A student who found 5 scored 5 of 7, and
  //  that pair must reach the teacher unchanged.
  console.log('1. A 7-point exercise reports as 7, not as 5');
  {
    const r = await report({ ...EX1, item: 'redflags', earned: 5, possible: 7 });
    ok('  accepted', r.status === 200, r.body);
    const c = await cell('1.1', 'exercise-1');
    ok('  points_possible is 7, the real count', c.points_possible === 7, c.points_possible);
    ok('  points_earned is 5', c.points_earned === 5, c.points_earned);
    ok('  and the percentage agrees', c.score === 71, c.score);
  }

  // ── 2. Exercises may differ from one another ─────────────────────────────
  //  The thing a single per-activity constant can never express.
  console.log('\n2. A different exercise carries a different denominator');
  {
    await report({ ...EX1, lesson: '1.2', item: 'classify', earned: 3, possible: 4 });
    const c = await cell('1.2', 'exercise-1');
    ok('  1.2 exercise-1 is out of 4 while 1.1 is out of 7',
      c.points_possible === 4 && c.points_earned === 3, { e: c.points_earned, p: c.points_possible });
    const first = await cell('1.1', 'exercise-1');
    ok('  and 1.1 is unaffected', first.points_possible === 7, first.points_possible);
  }

  // ── 3. A perfect score is a perfect score ────────────────────────────────
  //  This exercise is "almost impossible not to get 100% on", so the full-marks
  //  path is the common one, not the edge case.
  console.log('\n3. Full marks survive intact');
  {
    await report({ ...EX1, lesson: '1.3', item: 'redflags', earned: 7, possible: 7 });
    const c = await cell('1.3', 'exercise-1');
    ok('  7 of 7', c.points_earned === 7 && c.points_possible === 7, c);
    ok('  scored 100', c.score === 100, c.score);
  }

  // ── 4. Half a pair is a page bug, and must be LOUD ───────────────────────
  console.log('\n4. Half a pair is refused, never guessed');
  {
    const onlyPossible = await report({ ...EX1, lesson: '1.4', item: 'x', possible: 7 });
    ok('  `possible` alone is rejected', onlyPossible.status === 400, onlyPossible);
    ok('    and names what was missing', onlyPossible.body.missing === 'earned', onlyPossible.body);
    ok('    rather than recording 0 of 7', (await cell('1.4', 'exercise-1')) == null);

    const onlyEarned = await report({ ...EX1, lesson: '1.5', item: 'x', earned: 5 });
    ok('  `earned` alone is rejected', onlyEarned.status === 400, onlyEarned);
    ok('    and names what was missing', onlyEarned.body.missing === 'possible', onlyEarned.body);
    ok('    rather than recording 5 clamped to 1 of 1', (await cell('1.5', 'exercise-1')) == null);

    const mixed = await report({ ...EX1, lesson: '2.1', item: 'x', earned: 5, max_points: 7 });
    ok('  mixing the two field families is rejected too', mixed.status === 400, mixed);
  }

  // ── 5. A real zero is still recordable ───────────────────────────────────
  //  The whole point of refusing half a pair is to keep this distinguishable
  //  from a page that failed to report.
  console.log('\n5. A genuine 0 of 7 is accepted and stays visible');
  {
    const r = await report({ ...EX1, lesson: '2.2', item: 'redflags', earned: 0, possible: 7 });
    ok('  accepted', r.status === 200, r.body);
    const c = await cell('2.2', 'exercise-1');
    ok('  records 0 of 7, not nothing', c.points_earned === 0 && c.points_possible === 7, c);
    ok('  and is distinguishable from a page that never reported',
      (await cell('1.4', 'exercise-1')) == null);
  }

  // ── 6. Retry keeps the best result ───────────────────────────────────────
  console.log('\n6. A retake keeps the better attempt');
  {
    await report({ ...EX1, lesson: '2.3', item: 'redflags', earned: 2, possible: 7 });
    await report({ ...EX1, lesson: '2.3', item: 'redflags', earned: 6, possible: 7 });
    const c = await cell('2.3', 'exercise-1');
    ok('  keeps 6 of 7, not the earlier 2', c.points_earned === 6 && c.points_possible === 7, c);
  }

  server.close();
  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { server.close(); console.error(e); process.exit(1); });
