'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the score-source audit classifies correctly.
//
//  The audit exists to answer "how much of the back catalogue is a real pair",
//  and the answer drives a decision about where to spend effort. A miscounting
//  audit is worse than no audit, because it looks authoritative. So every
//  classification is pinned against data whose shape is known by construction.
//
//  The three cases, and the trap in each:
//    pair          real points and a real out-of. Must win even when a percent
//                  was ALSO recorded for the same cell, which is the normal
//                  case: /api/student/score writes the items and progress.score
//                  is updated alongside them.
//    percent_only  a 'lesson-score' carrier or a bare progress.score. Must NOT
//                  be counted as a pair just because it has a max_points of 100.
//    unscored      present, never marked. Must never be counted as a zero.
//
//  Zero PII: synthetic students, never printed.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:scoresources
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-score-sources.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
process.env.JWT_SECRET = 'smoke-score-sources-secret-long-enough';

const express = require('express');
const db = require('../db');
const { audit } = require('../lib/score-sources');

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

const COURSE = 'ap-cybersecurity';
const find = (o, course) => o.courses.find((c) => c.course === course);
const col = (o, course, lesson, activity) =>
  (find(o, course).column_detail || []).find((x) => x.lesson === lesson && x.activity === activity);

(async () => {
  console.log('\nSCORE SOURCE AUDIT\n');

  const reg = await post('/api/teacher/register', {
    email: 'src@example.org', password: 'a-long-enough-password',
    name: 'Source Audit', school: 'Example High',
  });
  const tok = reg.body.token;
  const cls = await post('/api/teacher/classes', { class_name: 'Src P1', course: COURSE }, tok);
  const code = cls.body.class.class_code;

  const join = async (nm) => (await post('/api/student/join',
    { class_code: code, display_name: nm, pin: '1234' })).body.token;

  // ── Build one cell of each kind, through the REAL endpoints ───────────────
  console.log('1. Build one cell of each kind through the real endpoints');

  // A: a reported PAIR. /api/student/score writes score_events items AND
  //    updates progress.score, so this cell has a percent too. The pair must win.
  const s1 = await join('SA1');
  for (let i = 1; i <= 4; i++) {
    await post('/api/student/score', {
      course: COURSE, unit: 'unit-1', lesson: '1.1', activity_type: 'exercise-1',
      item: 'q' + i, earned: i <= 3 ? 1 : 0, possible: 1,
    }, s1);
  }
  // B: PERCENT ONLY. /api/student/progress records a percentage and nothing else.
  await post('/api/student/progress', {
    course: COURSE, unit: 'unit-1', lesson: '1.2', activity_type: 'quiz', score: 38, completed: true,
  }, s1);
  // C: UNSCORED. Completed, never marked.
  await post('/api/student/progress', {
    course: COURSE, unit: 'unit-1', lesson: '1.3', activity_type: 'lab', completed: true,
  }, s1);

  const a = audit({});
  const cy = find(a, COURSE);
  ok('  the course appears', !!cy, a.courses.map((c) => c.course));

  console.log('2. Each cell is classified correctly');
  ok('  the reported pair counts as a pair', cy.cells.pair === 1, cy.cells);
  ok('  and it is NOT double counted as percent_only, though a percent exists too',
    cy.cells.percent_only === 1, cy.cells);
  ok('  the bare percentage counts as percent_only', cy.cells.percent_only === 1, cy.cells);
  ok('  the completed-but-unmarked cell counts as unscored', cy.cells.unscored === 1, cy.cells);
  ok('  scored is pair + percent_only, and excludes unscored',
    cy.cells.scored === 2, cy.cells);
  ok('  pair_pct is over SCORED work, not over everything', cy.cells.pair_pct === 50, cy.cells.pair_pct);

  // The trap this suite exists for. A 'lesson-score' carrier has max_points 100,
  // which looks exactly like a page reporting 38 of 100 real questions.
  console.log('3. A lesson-score carrier is not mistaken for a reported pair');
  const carrier = db.prepare(
    `SELECT points, max_points FROM score_events WHERE item = 'lesson-score' AND lesson = '1.2'`
  ).get();
  ok('  the carrier really is stored as points=percent, max_points=100',
    carrier && carrier.points === 38 && carrier.max_points === 100, carrier);
  ok('  and its column is reported as percent_only, not as reporting pairs',
    col(a, COURSE, '1.2', 'quiz').status === 'percent_only', col(a, COURSE, '1.2', 'quiz'));

  console.log('4. Columns are the work list');
  ok('  the reporting column is marked reports_pairs',
    col(a, COURSE, '1.1', 'exercise-1').status === 'reports_pairs');
  ok('  the never-marked column is unscored_only',
    col(a, COURSE, '1.3', 'lab').status === 'unscored_only', col(a, COURSE, '1.3', 'lab'));
  ok('  counts add up', cy.columns.total === 3
    && cy.columns.reports_pairs === 1 && cy.columns.percent_only === 1 && cy.columns.unscored_only === 1,
    cy.columns);
  ok('  a column carries its unit, so the list is actionable',
    col(a, COURSE, '1.1', 'exercise-1').unit === 'unit-1', col(a, COURSE, '1.1', 'exercise-1').unit);

  // A column reporting for ONE student is a reporting column: the page works,
  // the others simply have not done it.
  console.log('5. One student reporting is enough to call a page working');
  const s2 = await join('SA2');
  await post('/api/student/progress', {
    course: COURSE, unit: 'unit-1', lesson: '1.1', activity_type: 'exercise-1', score: 50, completed: true,
  }, s2);
  const a2 = audit({});
  const c2 = col(a2, COURSE, '1.1', 'exercise-1');
  ok('  the column still reports pairs', c2.status === 'reports_pairs', c2);
  ok('  and both students are visible in the breakdown',
    c2.students_with_pair === 1 && c2.students_percent_only === 1, c2);

  console.log('6. Filtering and safety');
  ok('  filtering by course narrows the result',
    audit({ course: COURSE }).courses.length === 1);
  ok('  an unknown course yields nothing rather than erroring',
    audit({ course: 'ap-nope' }).courses.length === 0);
  ok('  no student identifiers are returned anywhere',
    !JSON.stringify(audit({})).includes(db.prepare('SELECT id FROM students LIMIT 1').get().id));

  // The whole point: this must be safe to run against production.
  const before = db.prepare('SELECT COUNT(*) n FROM progress').get().n
    + db.prepare('SELECT COUNT(*) n FROM score_events').get().n;
  audit({});
  const after = db.prepare('SELECT COUNT(*) n FROM progress').get().n
    + db.prepare('SELECT COUNT(*) n FROM score_events').get().n;
  ok('  running the audit writes nothing', before === after, { before, after });

  console.log(`\n${pass} passed, ${fail} failed\n`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('\nSUITE ERROR:', e);
  server.close();
  process.exit(1);
});
