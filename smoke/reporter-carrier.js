'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: one run reported by two writers is still one run.
//
//  ── THE DEFECT, REPORTED BY A TEACHER ON 2026-09-07 ─────────────────────────
//  Michelle's gradebook showed AP Cyber 1.1 Exercise 1 as 14 out of 14 under a
//  column header that read /7, on four students at once. Nothing was corrupted
//  and no student had done anything twice. The page has TWO writers:
//
//    the page body       posts item 'redflags', out of FLAGS.length, which is 7
//    the shared reporter assets/apcs-score-reporter.js scrapes #finalScore
//                        ("7 out of 7 red flags found") and hands the pair to
//                        window.APCS_saveLessonScore, which posts item 'score'
//
//  Both land on the same (student, unit, lesson, activity), and every reader of
//  this ledger sums per distinct item, so the pair doubled. The PERCENTAGE
//  survived, which is why nothing looked wrong from the inside: both halves
//  doubled together. The POINTS did not. That column contributed 14 of a
//  student's 29 graded points, so one exercise weighed twice what it was priced
//  at, and the overall grade moved with it.
//
//  ── WHY THE OBVIOUS FIX IS WRONG ────────────────────────────────────────────
//  'score' cannot simply be excluded the way 'lesson-score' is. On most pages it
//  is the ONLY writer: 1.1 Exercise 2 records 12 out of 15 through it and
//  nothing else, and excluding it would delete that grade outright. Test 3 is
//  that assertion and it exists to fail anyone who reaches for the blunt fix.
//
//  So the three readers of this ledger keep the carrier only when it is alone.
//  They import the rule from scoring.js rather than restating it, and tests 5
//  and 7 are what stop the three drifting apart again.
//
//  Zero PII: synthetic names, a throwaway PIN, never printed.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:carrier
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-reporter-carrier.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

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

const { buildCanonicalGradebook } = require('../lib/gradebook-contract');
const { coverage } = require('../lib/admin-denominators');
const { REPORTER_TOTAL_ITEM } = require('../scoring');

const CY = 'ap-cybersecurity';
const cell = (g, label, key) => (g.students.find((s) => s.label === label) || { items: {} }).items[key];
const overall = (g, label) => (g.students.find((s) => s.label === label) || {}).overall;

(async () => {
  console.log('\nONE RUN, TWO WRITERS\n');

  console.log('0. A class, and the same pages the live course has');
  const reg = await post('/api/teacher/register', {
    email: 'carrier.smoke@example.org', password: 'a-long-enough-password',
    name: 'Carrier Smoke', school: 'Example High',
  });
  const tt = reg.body.token;
  ok('  teacher registered', reg.status === 201 && !!tt, reg.body);
  const cls = await post('/api/teacher/classes', { class_name: 'Carrier P1', course: CY }, tt);
  const code = cls.body && cls.body.class && cls.body.class.class_code;
  ok('  class created', !!code, code);

  // The authored prices, as production carries them for AP Cyber 1.1.
  // exercise-2 is priced 8 on purpose. That is what production carried on
  // 2026-09-07 while the live page had been rebuilt to 15 questions, and it is
  // what makes test 3 honest: a cell rebuilt from progress.score against the
  // authored 8 reads 6 out of 8, so it cannot be mistaken for the ledger's real
  // 12 out of 15. With the two numbers equal, the blunt fix passes test 3 by
  // accident and the battery said so.
  db.prepare(`INSERT INTO course_denominators (course,unit,lesson,activity_type,possible) VALUES
    (?,'unit-1','1.1','exercise-1',7), (?,'unit-1','1.1','exercise-2',8), (?,'unit-1','1.1','quiz',5)`)
    .run(CY, CY, CY);

  const join = async (nm) => (await post('/api/student/join',
    { class_code: code, display_name: nm, pin: '1234' })).body.token;
  const score = (tok, lesson, act, item, earned, possible) => post('/api/student/score',
    { course: CY, unit: 'unit-1', lesson, activity_type: act, item, earned, possible }, tok);

  const s1 = await join('CS1');
  // Exercise 1, the measured case: the page's own report, then the scrape of the
  // very same panel, in the order a browser sends them.
  await score(s1, '1.1', 'exercise-1', 'redflags', 7, 7);
  const carrierResp = await score(s1, '1.1', 'exercise-1', REPORTER_TOTAL_ITEM, 7, 7);
  // Exercise 2: one writer only, the scraped carrier, out of the page's 15.
  await score(s1, '1.1', 'exercise-2', REPORTER_TOTAL_ITEM, 12, 15);
  // A quiz reports one row per QUESTION, and those must keep summing.
  for (let q = 1; q <= 5; q++) await score(s1, '1.1', 'quiz', 'q' + q, q <= 4 ? 1 : 0, 1);

  const g = buildCanonicalGradebook(code, { reveal: true });

  // ── 1 ─────────────────────────────────────────────────────────────────────
  console.log('1. Two writers on one activity read as one run');
  const e1 = cell(g, 'CS1', 'unit-1/1.1/exercise-1');
  ok('  exercise-1 is 7 out of 7, not 14 out of 14',
    e1 && e1.earned === 7 && e1.possible === 7, e1);
  ok('  and the percentage is unchanged by the fix', e1 && Math.round(e1.pct) === 100, e1 && e1.pct);

  // ── 2 ─────────────────────────────────────────────────────────────────────
  console.log('2. The column carries the weight it was priced at');
  const ov = overall(g, 'CS1');
  // 7 + 12 + 4 = 23 earned, out of 7 + 15 + 5 = 27 graded. Doubled, exercise-1
  // alone would have made it 30 out of 34 and moved the grade.
  ok('  earned 23 over graded 27', ov && ov.earned === 23 && ov.graded === 27, ov);

  // ── 3 ─────────────────────────────────────────────────────────────────────
  console.log('3. Where the carrier is the only writer it IS the grade');
  const e2 = cell(g, 'CS1', 'unit-1/1.1/exercise-2');
  ok('  exercise-2 keeps 12 out of 15', e2 && e2.earned === 12 && e2.possible === 15, e2);
  ok('  and it comes from the ledger, not from a percent times the authored 8',
    e2 && e2.possible_source === 'observed', e2 && e2.possible_source);

  // ── 4 ─────────────────────────────────────────────────────────────────────
  console.log('4. Per-question items still accumulate');
  const qz = cell(g, 'CS1', 'unit-1/1.1/quiz');
  ok('  five one-point questions read 4 out of 5', qz && qz.earned === 4 && qz.possible === 5, qz);

  // ── 5 ─────────────────────────────────────────────────────────────────────
  console.log('5. progress.score agrees with the gradebook cell');
  // The rollup in scoring.js writes progress.score; the contract reads the
  // ledger. Two answers to one question is how they drifted before.
  const roll = carrierResp.body && carrierResp.body.rollup;
  ok('  the rollup returned by the write path is 7 of 7',
    roll && roll.earned === 7 && roll.possible === 7, roll);
  const pr = db.prepare(`SELECT score FROM progress WHERE course = ? AND lesson = '1.1'
    AND activity_type = 'exercise-1'`).get(CY);
  ok('  progress.score is 100, from the same rows', pr && Math.round(pr.score) === 100, pr);

  // ── 6 ─────────────────────────────────────────────────────────────────────
  console.log('6. A class with no retries drops the carrier too');
  // retry_mode 'none' takes the FIRST row per item rather than the best, a
  // different statement in scoring.js and a different branch in the contract.
  db.prepare('UPDATE classes SET retry_mode = ?, retry_allowed = 0 WHERE class_code = ?')
    .run('none', code);
  const s2 = await join('CS2');
  await score(s2, '1.1', 'exercise-1', 'redflags', 5, 7);
  await score(s2, '1.1', 'exercise-1', REPORTER_TOTAL_ITEM, 5, 7);
  const g2 = buildCanonicalGradebook(code, { reveal: true });
  const e1b = cell(g2, 'CS2', 'unit-1/1.1/exercise-1');
  ok('  first-attempt mode reads 5 out of 7, not 10 out of 14',
    e1b && e1b.earned === 5 && e1b.possible === 7, e1b);

  // ── 7 ─────────────────────────────────────────────────────────────────────
  console.log('7. The re-pricing proposal cannot adopt the doubled total');
  // POST /api/admin/denominators/adopt AUTHORS from these observed maxima, so a
  // 14 here would have become the official price of a 7 point exercise.
  const cov = coverage(CY, {});
  const col = (cov.columns || []).find((c) => c.lesson === '1.1' && c.activity_type === 'exercise-1');
  const observed = col && (col.observed_values || []).map((o) => o.value);
  ok('  every observed total for exercise-1 is 7', !!observed && observed.length > 0
    && observed.every((v) => v === 7), observed);
  ok('  14 is nowhere in them, so adopt cannot author it', !!observed && !observed.includes(14), observed);
  ok('  and the authored 7 is reported as agreeing, not as a conflict',
    !!col && col.conflict === null, col && col.conflict);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  server.close();
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
