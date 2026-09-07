'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: a corrected denominator actually reaches a running container, and
//  correcting it does not regrade anybody.
//
//  ── WHY THIS NEEDED A TEST OF ITS OWN ───────────────────────────────────────
//  The cyber denominator seed is insert-or-ignore at boot, on purpose, so that a
//  value an operator authored by hand is never clobbered. The cost showed up on
//  2026-09-07: 1.1 exercise-2 was priced 8 against a page since rebuilt to 15
//  questions, and the corrected number could sit in the seed forever without
//  ever landing, because the row already existed. A teacher saw the header say
//  /8 over cells out of 15 and had to send an email about it.
//
//  So corrections are conditional on the value they replace. Test 2 is the
//  safety that buys: an operator's hand edit still wins.
//
//  ── THE ASSERTION THAT MATTERS MOST TO A TEACHER ────────────────────────────
//  Test 4. Re-pricing a column must not move a grade that has already been
//  recorded. score_events carries earned and max_points per submission, so a
//  student who sat the 8 question version still reads 8, and one who sat the 15
//  question version reads 15, in the same column, after the correction.
//
//  Zero PII: synthetic names, a throwaway PIN, never printed.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:denomcorrections
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-denom-corrections.db');
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

const seed = require('../scripts/seed-cyber-denominators');
const { buildCanonicalGradebook } = require('../lib/gradebook-contract');

const CY = 'ap-cybersecurity';
const priceOf = (lesson, act) => {
  const r = db.prepare(`SELECT possible FROM course_denominators
    WHERE course = ? AND lesson = ? AND activity_type = ?`).get(CY, lesson, act);
  return r ? r.possible : null;
};
const cell = (g, label, key) => (g.students.find((s) => s.label === label) || { items: {} }).items[key];

(async () => {
  console.log('\nDENOMINATOR CORRECTIONS\n');

  console.log('0. Every correction names a value the table above it agrees with');
  for (const c of seed.CORRECTIONS) {
    ok(`  ${c.key}: POINTS says ${seed.POINTS[c.key]}, correction says ${c.to}`,
      seed.POINTS[c.key] === c.to);
    ok(`  ${c.key}: it replaces a DIFFERENT value (${c.from})`, c.from !== c.to);
  }

  console.log('1. A stale row is corrected by the boot seed, which is insert-or-ignore');
  // The state a container is actually in: the row exists, at the old value.
  db.prepare(`INSERT INTO course_denominators (course, unit, lesson, activity_type, possible)
    VALUES (?,'unit-1','1.1','exercise-2',8)`).run(CY);
  ok('  stale row present at 8', priceOf('1.1', 'exercise-2') === 8);
  const r1 = seed.seedCyberDenominators();          // boot mode, no --update
  ok('  the seed ran in ignore mode', r1.mode === 'ignore', r1.mode);
  ok('  and the stale row now reads 15', priceOf('1.1', 'exercise-2') === 15, priceOf('1.1', 'exercise-2'));
  ok('  it reported the correction', r1.corrected === 1, r1);

  console.log('2. Re-running corrects nothing, and a hand edit is left alone');
  const r2 = seed.seedCyberDenominators();
  ok('  second run corrects zero rows', r2.corrected === 0, r2);
  db.prepare(`UPDATE course_denominators SET possible = 12
    WHERE course = ? AND lesson = '1.1' AND activity_type = 'exercise-2'`).run(CY);
  seed.seedCyberDenominators();
  ok('  an operator value of 12 survives the seed', priceOf('1.1', 'exercise-2') === 12,
    priceOf('1.1', 'exercise-2'));
  db.prepare(`UPDATE course_denominators SET possible = 15
    WHERE course = ? AND lesson = '1.1' AND activity_type = 'exercise-2'`).run(CY);

  console.log('3. The corrected price is what a column header reads');
  const reg = await post('/api/teacher/register', {
    email: 'denom.corrections@example.org', password: 'a-long-enough-password',
    name: 'Denom Corrections', school: 'Example High',
  });
  const tt = reg.body.token;
  const cls = await post('/api/teacher/classes', { class_name: 'Corrections P1', course: CY }, tt);
  const code = cls.body.class.class_code;
  const join = async (nm) => (await post('/api/student/join',
    { class_code: code, display_name: nm, pin: '1234' })).body.token;
  const score = (tok, lesson, act, item, earned, possible) => post('/api/student/score',
    { course: CY, unit: 'unit-1', lesson, activity_type: act, item, earned, possible }, tok);

  // OLD sat the 8 question version. NEW sat the rebuilt 15 question one.
  const old = await join('DC-OLD');
  await score(old, '1.1', 'exercise-2', 'score', 5, 8);
  const cur = await join('DC-NEW');
  await score(cur, '1.1', 'exercise-2', 'score', 12, 15);

  const g = buildCanonicalGradebook(code, { reveal: true });
  const col = (g.items || []).find((i) => (i.lesson_ref || i.lesson_id) === '1.1'
    && (i.native_activity || i.activity) === 'exercise-2');
  ok('  the header is the corrected 15', col && col.possible === 15, col && col.possible);

  console.log('4. And nobody was regraded by the correction');
  const a = cell(g, 'DC-OLD', 'unit-1/1.1/exercise-2');
  const b = cell(g, 'DC-NEW', 'unit-1/1.1/exercise-2');
  ok('  the student who sat 8 questions still reads 5 out of 8',
    a && a.earned === 5 && a.possible === 8, a);
  ok('  the student who sat 15 still reads 12 out of 15',
    b && b.earned === 12 && b.possible === 15, b);
  ok('  and neither was rescaled onto the other denominator',
    a && b && a.possible !== b.possible, [a && a.possible, b && b.possible]);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  server.close();
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
