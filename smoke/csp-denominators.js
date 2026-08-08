'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the CSP denominators, and the gradebook gap they close.
//
//  WHY THIS EXISTS
//  ap-csp was the only course in the product with NO denominator authority of
//  any kind: no course_denominators rows and no graded course_manifest rows. All
//  53 of its graded columns were therefore denominated by whatever the page
//  happened to paint, which the page-side lessonPct() fallback scraped out of
//  rendered text. Every CSP percentage a teacher has ever seen was computed
//  against a number nobody chose.
//
//  scripts/seed-csp-denominators.js closes that with values COUNTED from the
//  Shopify page bodies. This suite pins three things:
//
//    1. The seed is well formed: every row maps to a real config lesson, every
//       value is a positive number, and re-running writes nothing.
//    2. It actually closes the gap, measured through the real gradebook
//       contract: CSP goes from 53 unpriced graded columns to 0.
//    3. It changes only what gradebooks DISPLAY. No score row is touched, and a
//       student's PERCENTAGE is identical before and after. Stronger still: for
//       a lesson whose page REPORTS its own pair, the authored row changes
//       nothing whatsoever, because a reported pair always wins. Authored values
//       price the columns that report nothing.
//
//  Point 3 is the one that matters to a teacher mid-semester. Authoring a
//  denominator must never move a grade that has already been reported home.
//
//  Zero PII: synthetic names, a throwaway PIN, never printed.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:cspdenoms
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-csp-denoms.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
process.env.JWT_SECRET = 'smoke-csp-denoms-secret-long-enough';

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

const { seedCspDenominators, buildRows, POINTS } = require('../scripts/seed-csp-denominators');
const { buildCanonicalGradebook } = require('../lib/gradebook-contract');
const { COURSES } = require('../utils');

const COURSE = 'ap-csp';

(async () => {
  console.log('\nCSP DENOMINATORS\n');

  // ── 1. The seed is well formed ────────────────────────────────────────────
  console.log('1. The authored table is well formed');
  const rows = buildRows();
  ok('  53 rows, one per graded CSP column', rows.length === 53, rows.length);
  ok('  no row was dropped for an unknown lesson',
    rows.length === Object.keys(POINTS).length, { rows: rows.length, points: Object.keys(POINTS).length });

  const cfgLessons = new Set();
  for (const u of Object.values(COURSES[COURSE].units)) (u.lessons || []).forEach((l) => cfgLessons.add(l));
  const strays = rows.filter((r) => !cfgLessons.has(r.lesson)).map((r) => r.lesson);
  ok('  every row names a lesson the course config knows', strays.length === 0, strays);

  const bad = rows.filter((r) => !(Number.isFinite(r.possible) && r.possible > 0));
  ok('  every value is a positive number', bad.length === 0, bad);

  const wrongUnit = rows.filter((r) => {
    const u = COURSES[COURSE].units[r.unit];
    return !u || !(u.lessons || []).includes(r.lesson);
  });
  ok('  every row lands in the Big Idea that owns its lesson', wrongUnit.length === 0, wrongUnit);

  // The counts observed on the pages. Stated here so a silent edit to the seed
  // that changes a value has to change this test too.
  const quizzes = rows.filter((r) => r.activity_type === 'quiz');
  const exercises = rows.filter((r) => r.activity_type === 'exercise-1');
  ok('  35 lesson quizzes, every one out of 6',
    quizzes.length === 35 && quizzes.every((r) => r.possible === 6), quizzes.length);
  ok('  18 exercises, every one out of 8 and all in Big Idea 3',
    exercises.length === 18 && exercises.every((r) => r.possible === 8 && r.unit === 'bi-3'),
    exercises.length);

  // ── 2. Writing it, and writing it again ───────────────────────────────────
  console.log('2. The write is additive and idempotent');
  const first = seedCspDenominators();
  ok('  first run writes all 53', first.changed === 53 && first.total === 53, first);
  const second = seedCspDenominators();
  ok('  second run writes nothing', second.changed === 0, second);

  db.prepare(`UPDATE course_denominators SET possible = 99
              WHERE course = ? AND lesson = 'collaboration' AND activity_type = 'quiz'`).run(COURSE);
  seedCspDenominators();
  const handEdited = db.prepare(`SELECT possible FROM course_denominators
    WHERE course = ? AND lesson = 'collaboration' AND activity_type = 'quiz'`).get(COURSE).possible;
  ok('  a hand-corrected value is never clobbered by a re-run', handEdited === 99, handEdited);
  seedCspDenominators({ update: true });
  const afterUpdate = db.prepare(`SELECT possible FROM course_denominators
    WHERE course = ? AND lesson = 'collaboration' AND activity_type = 'quiz'`).get(COURSE).possible;
  ok('  and --update is the explicit way to push an edit', afterUpdate === 6, afterUpdate);

  // ── 3. The gap actually closes, measured through the contract ─────────────
  console.log('3. CSP goes from 53 unpriced columns to 0');
  const reg = await post('/api/teacher/register', {
    email: 'csp.denoms@example.org', password: 'a-long-enough-password',
    name: 'CSP Denoms', school: 'Example High',
  });
  const tok = reg.body.token;
  const cls = await post('/api/teacher/classes', { class_name: 'CSP Period 1', course: COURSE }, tok);
  const code = cls.body.class.class_code;
  ok('  CSP class created', !!code, code);

  const g = buildCanonicalGradebook(code, { reveal: true });
  const graded = g.items.filter((i) => i.graded);
  const unpriced = graded.filter((i) => i.possible == null);
  ok('  every graded CSP column now carries a denominator', unpriced.length === 0,
    unpriced.slice(0, 5).map((i) => i.item_key));
  ok('  and the contract agrees the gradebook is trustworthy', g.integrity.denominators_missing === 0,
    g.integrity.denominators_missing);
  ok('  53 graded columns priced', graded.length === 53, graded.length);
  ok('  the course total is 35*6 + 18*8 = 354',
    g.summary.possible === 354, g.summary.possible);

  // ── 4. No student's grade moves ───────────────────────────────────────────
  //  The whole point of authoring at read time: it corrects the "out of" a
  //  teacher sees WITHOUT regrading anybody. A denominator that moved a
  //  percentage would be a silent regrade of a live class.
  console.log('4. Authoring a denominator never moves a grade');
  const join = async (nm) => (await post('/api/student/join',
    { class_code: code, display_name: nm, pin: '1234' })).body.token;
  const s1 = await join('CD1');
  // A student scores 4 of the 6 real quiz items on one lesson.
  for (let i = 1; i <= 6; i++) {
    await post('/api/student/score', {
      course: COURSE, unit: 'bi-1', lesson: 'collaboration', activity_type: 'quiz',
      item: 'q' + i, earned: i <= 4 ? 1 : 0, possible: 1,
    }, s1);
  }
  const withDenom = buildCanonicalGradebook(code, { reveal: true })
    .students[0].items['bi-1/collaboration/quiz'];

  db.prepare(`DELETE FROM course_denominators WHERE course = ?`).run(COURSE);
  const withoutDenom = buildCanonicalGradebook(code, { reveal: true })
    .students[0].items['bi-1/collaboration/quiz'];

  ok('  the percentage is identical with and without the authored row',
    withDenom.pct === withoutDenom.pct && withDenom.pct === 66.7,
    { with: withDenom.pct, without: withoutDenom.pct });
  //  This student REPORTED their pair: six items, one point each, posted through
  //  /api/student/score. One question is one point, and the page counted them,
  //  so the reported pair wins and the authored row is not consulted at all.
  //
  //  That is the strongest form of "authoring never regrades a class": not that
  //  the percentage survives, but that for a class whose pages report properly
  //  the authored row makes no difference to any number on screen. Authored
  //  values exist to price columns that report NOTHING.
  ok('  a reported pair is sourced observed, with or without the authored row',
    withDenom.possible_source === 'observed' && withoutDenom.possible_source === 'observed',
    { with: withDenom.possible_source, without: withoutDenom.possible_source });
  ok('  and the cell is byte for byte identical either way, not merely equal in percent',
    JSON.stringify(withDenom) === JSON.stringify(withoutDenom),
    { with: withDenom, without: withoutDenom });
  ok('  the "out of" is the 6 the page actually asked',
    withDenom.possible === 6 && withDenom.earned === 4,
    [withDenom.earned, withDenom.possible]);
  ok('  no score row was touched by any of this',
    db.prepare('SELECT COUNT(*) n FROM score_events WHERE course = ?').get(COURSE).n === 6);

  seedCspDenominators();
  console.log(`\n${pass} passed, ${fail} failed\n`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('\nSUITE ERROR:', e);
  server.close();
  process.exit(1);
});
