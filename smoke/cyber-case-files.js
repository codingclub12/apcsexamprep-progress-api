'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the five cyber case files are priced, and the five exams are not.
//
//  WHAT WAS WRONG
//  Every case file column was one of the "cyber 15", the graded columns with no
//  authored total. A percent-only column is shown out of a provisional 100, so a
//  student who scored 9 of 15 saw "60/100". The percentage was right, but the
//  pair was fiction, and it was the only pair in the gradebook whose denominator
//  was not a real number of points.
//
//  It survived this long behind a WRONG BELIEF, recorded in the repo, that case
//  file columns could never receive data at all: pageFromHandle() returns null
//  for every case file handle, so /track no-ops on them. That is true and it is
//  also irrelevant. The case file pages do not use /track. Each one carries a
//  self-contained reporter that POSTs straight to /api/student/progress with
//  lesson 'case-file' and activity_type 'case-file'. The columns were reachable
//  the whole time.
//
//  WHAT THIS PINS
//  1. All five case files carry their authored total, per unit, from the page.
//  2. A case file cell reads as real points, and the percentage does not move.
//  3. The five exams stay unpriced, because their pages cannot report a score.
//  4. pageFromHandle STILL returns null for case file handles. That is correct,
//     not a leftover defect: /track sets completed = 1 on a bare page view, so
//     mapping those handles would mark a case file complete for a student who
//     opened it and left. /track already excludes quiz and exam for exactly this
//     reason. This assertion exists so the null return is not "fixed" later.
//
//  Zero PII: synthetic names, a throwaway PIN, never printed.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:casefiles
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-cyber-case-files.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
process.env.JWT_SECRET = 'smoke-cyber-case-files-secret-long-enough';

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

const contract = require('../lib/gradebook-contract');
const { buildCanonicalGradebook } = contract;
const { pageFromHandle } = require('../utils');
const seed = require('../scripts/seed-cyber-case-file-denominators');
const COURSE = 'ap-cybersecurity';
const near = (a, b, eps = 0.011) => a != null && b != null && Math.abs(a - b) < eps;

// The five totals, as read from the pages. Duplicated here on purpose: if the
// seed's numbers are edited without re-reading the pages, this disagrees.
const EXPECTED = { 'unit-1': 15, 'unit-2': 14, 'unit-3': 11, 'unit-4': 12, 'unit-5': 11 };

(async () => {
  console.log('\nCYBER CASE FILES ARE PRICED, CYBER EXAMS ARE NOT\n');

  // ── 1. The seed writes what the pages say ─────────────────────────────────
  console.log('1. The seed writes the five authored totals');
  const first = seed.seedCyberCaseFileDenominators();
  ok('  five rows written', first.changed === 5, first);
  ok('  re-running writes nothing', seed.seedCyberCaseFileDenominators().changed === 0);

  const stored = db.prepare(
    `SELECT unit, possible FROM course_unit_denominators
     WHERE course = ? AND lesson = 'case-file' ORDER BY unit`
  ).all(COURSE);
  ok('  all five stored, one per unit', stored.length === 5, stored.length);
  const got = {};
  stored.forEach((r) => { got[r.unit] = r.possible; });
  ok('  each carrying the total read from its page', JSON.stringify(got) === JSON.stringify(EXPECTED), got);

  // The reason this needed course_unit_denominators at all. All five share one
  // lesson, so the older table would have collapsed them to a single row.
  ok('  and they are genuinely five different keys, not one repeated',
    new Set(stored.map((r) => r.unit)).size === 5);
  ok('  which course_denominators could not express, since all five share lesson case-file',
    new Set(['case-file']).size === 1
    && db.prepare(`SELECT COUNT(*) n FROM course_denominators
                   WHERE course = ? AND lesson = 'case-file'`).get(COURSE).n === 0);

  // ── 2. The gradebook prices each case file per unit ───────────────────────
  console.log('2. The gradebook prices each case file separately');
  const reg = await post('/api/teacher/register', {
    email: 'case.files@example.org', password: 'a-long-enough-password',
    name: 'Case Files', school: 'Example High',
  });
  const tok = reg.body.token;
  const cls = await post('/api/teacher/classes', { class_name: 'Cyber P1', course: COURSE }, tok);
  const code = cls.body.class.class_code;

  const g = buildCanonicalGradebook(code, { reveal: true });
  const cfs = g.items.filter((i) => i.native_activity === 'case-file');
  ok('  five case file columns, one per unit', cfs.length === 5, cfs.length);
  const cfGot = {};
  cfs.forEach((i) => { cfGot[i.unit] = i.possible; });
  ok('  each priced with its own authored total', JSON.stringify(cfGot) === JSON.stringify(EXPECTED), cfGot);
  ok('  every one sourced as authored, none provisional',
    cfs.every((i) => i.possible_source === 'authored'), cfs.map((i) => i.possible_source));

  // ── 3. The exams stay unpriced, on purpose ────────────────────────────────
  //  Their pages contain no fetch, no XMLHttpRequest, no sendBeacon and no token
  //  read, so no score can ever arrive. Authoring a total would price work that
  //  cannot be earned, which drags a real class average down.
  console.log('3. The exams stay unpriced, because they cannot report');
  const exams = g.items.filter((i) => i.native_activity === 'exam');
  ok('  five exam columns still present', exams.length === 5, exams.length);
  ok('  and not one of them is authored',
    exams.every((i) => i.possible_source !== 'authored'), exams.map((i) => i.possible_source));
  ok('  no exam rows were written to either denominator table',
    db.prepare(`SELECT COUNT(*) n FROM course_unit_denominators
                WHERE course = ? AND lesson = 'exam'`).get(COURSE).n === 0
    && db.prepare(`SELECT COUNT(*) n FROM course_denominators
                   WHERE course = ? AND lesson = 'exam'`).get(COURSE).n === 0);

  // ── 4. A real submission reads as points, and the percent does not move ───
  console.log('4. A student\'s case file reads as points, unchanged in percentage');
  const j = await post('/api/student/join', { class_code: code, display_name: 'CF1', pin: '1234' });
  const stok = j.body.token;

  // 9 of 15 is 60 percent. This is exactly what the page's reporter sends: it
  // reads "Points: 9 / 15" and posts the percentage.
  await post('/api/student/progress',
    { course: COURSE, unit: 'unit-1', lesson: 'case-file', activity_type: 'case-file', score: 60, completed: true }, stok);

  const sv = await get('/api/student/progress', stok);
  const cell = sv.body.progress.find((r) => r.lesson === 'case-file' && r.unit === 'unit-1');
  ok('  the student sees it out of 15, not out of a provisional 100',
    cell.points_possible === 15, cell.points_possible);
  ok('  and earning 9 of those 15', near(cell.points_earned, 9), cell.points_earned);
  ok('  marked authored, not provisional', cell.denominator_source === 'authored', cell.denominator_source);
  ok('  the percentage it always showed is unchanged',
    Math.round((cell.points_earned / cell.points_possible) * 100) === 60, cell.score);

  // The whole point of one authority: the teacher must see the same pair.
  const g2 = buildCanonicalGradebook(code, { reveal: true });
  const t = g2.students[0].items['unit-1/case-file/case-file'];
  ok('  the teacher sees the identical pair',
    t && t.possible === cell.points_possible && near(t.earned, cell.points_earned),
    t && [t.earned, t.possible]);

  // Before the seed this column contributed 60 out of a fictional 100. Now it
  // contributes 9 out of a real 15, so the class total is in real points.
  const ov = g2.students[0].overall;
  ok('  and it contributes real points to the rollup, not 60 of a fictional 100',
    ov.graded === 15 && near(ov.earned, 9), [ov.earned, ov.graded]);
  ok('  the rollup percentage still reads 60, so no grade moved',
    ov.pct === 60, ov.pct);
  ok('  and the column is no longer counted as percent-only',
    ov.items_percent_only === 0, ov.items_percent_only);

  // ── 5. pageFromHandle STILL ignores case file handles ─────────────────────
  //  This is the assertion most likely to be "fixed" by someone reading the
  //  handles as an oversight. It is not. /track sets completed = 1 on a page
  //  view, so mapping these would complete a case file for a student who opened
  //  it and walked away. The scores arrive by their own reporter instead.
  console.log('5. Case file handles stay unmapped, so a page view cannot complete one');
  const handles = [
    'ap-cyber-unit-1-case-file-1', 'ap-cyber-unit-2-case-file-2',
    'ap-cyber-unit-3-case-file-3', 'ap-cyber-unit-4-case-file-4',
    'ap-cyber-unit-5-case-file-5',
  ];
  ok('  every case file handle is unmapped',
    handles.every((h) => pageFromHandle(h) === null),
    handles.map((h) => [h, pageFromHandle(h)]).filter((x) => x[1]));
  ok('  and /track therefore reports it as untracked',
    (await post('/api/student/track', { handle: handles[0] }, stok)).body.tracked === false);

  // The reason: /track auto-completes. Proven against a handle it DOES map.
  const lessonHandle = 'ap-cyber-unit-1-lesson-1';
  ok('  a handle /track does map is auto-completed by a bare page view',
    pageFromHandle(lessonHandle) !== null
    && (await post('/api/student/track', { handle: lessonHandle }, stok)).body.tracked !== false);
  const visited = db.prepare(
    `SELECT completed, score FROM progress
     WHERE student_id = (SELECT id FROM students WHERE class_id = (SELECT id FROM classes WHERE class_code = ?))
       AND lesson = '1.1' AND activity_type = 'lesson'`).get(code);
  ok('  completed with no score, which is what a case file must never get',
    visited && visited.completed === 1 && visited.score == null, visited);

  // ── 6. Nothing else moved ─────────────────────────────────────────────────
  console.log('6. Regression: the rest of the cyber gradebook is untouched');
  ok('  the sibling cyber seed still owns the per-lesson values',
    require('../scripts/seed-cyber-denominators').POINTS['1.1|exercise-1'] === 7);
  ok('  case-file is still a graded activity in the contract',
    contract.isGradedActivity(contract.canonicalActivity('case-file')),
    contract.canonicalActivity('case-file'));
  ok('  and the contract still reports integrity for the course', !!g2.integrity);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('\nSUITE ERROR:', e);
  server.close();
  process.exit(1);
});
