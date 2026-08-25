'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the denominator coverage view must not count the whole-activity
//  percentage as a graded item.
//
//  WHY THIS SUITE EXISTS
//  On 2026-08-25 a cyber teacher reported hit-or-miss grades, and
//  GET /api/admin/denominators appeared to confirm something serious: eighteen
//  columns where students disagreed with the authored total, on 1.1 exercise-1
//  only 51 percent of students reporting the authored 7, and the rest reporting
//  107, 114 or 100. It read as a corrupted ledger and a broken score reporter,
//  and the proposed fixes ranged from adding manifest rows to rewriting the
//  reporter's parsing and running a data repair over live classes.
//
//  None of that was real. Two writers legitimately share one cell:
//    POST /api/student/score     a graded item, "5 out of 7"
//    POST /api/student/progress  the whole-activity percent, stored on the SAME
//                                ledger under a reserved item name as
//                                points = percent, max_points = 100
//  Summed, that is 76 out of 107. scoring.js has always excluded the reserved
//  item, so the gradebook read 5 out of 7 correctly the entire time. Only the
//  coverage query lacked the exclusion.
//
//  WHY IT MATTERS MORE THAN A WRONG REPORT
//  POST /api/admin/denominators/adopt AUTHORS course_denominators from these
//  proposals, and every gradebook reads that table at display time. Adopting a
//  phantom 107 would have converted a reporting artifact into a real regrade of
//  a live class. Section 3 pins that.
//
//  Zero PII: synthetic students, numbers only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:denomlessonscore
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-denom-lesson-score.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { LESSON_SCORE_ITEM } = require('../scoring');
const denominators = require('../lib/admin-denominators');

const app = express();
app.use(express.json());
app.use('/api/student', require('../routes/student'));
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

let pass = 0;
const fail = [];
const ok = (label, cond, extra) => {
  if (cond) { pass++; return; }
  fail.push(label + (extra !== undefined ? '  ' + JSON.stringify(extra) : ''));
};
const call = (m, p, b, t) => fetch(base() + p, {
  method: m,
  headers: Object.assign({ 'Content-Type': 'application/json' }, t ? { Authorization: 'Bearer ' + t } : {}),
  body: b ? JSON.stringify(b) : undefined,
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

const L = { course: 'ap-cybersecurity', unit: 'unit-1', lesson: '1.1', activity_type: 'exercise-1' };
const colOf = (out) => (out.columns || []).find((c) => c.lesson === L.lesson && c.activity_type === L.activity_type);

(async () => {
  const tok = (await call('POST', '/api/teacher/register',
    { email: 'denomls@example.org', password: 'a-long-enough-password', name: 'Denom Probe' })).body.token;
  const cls = (await call('POST', '/api/teacher/classes',
    { class_name: 'Denom Probe Class', course: 'ap-cybersecurity' }, tok)).body.class;

  // Three students all do the SAME 7 point exercise and all complete the page,
  // so both writers fire for each of them. The class genuinely agrees on 7.
  for (const name of ['Avery', 'Blake', 'Casey']) {
    const st = (await call('POST', '/api/student/join',
      { class_code: cls.class_code, display_name: name, pin: '1234' })).body.token;
    await call('POST', '/api/student/score', Object.assign({ item: 'score', earned: 5, possible: 7 }, L), st);
    await call('POST', '/api/student/progress', Object.assign({ completed: true, score: 71 }, L), st);
  }

  // ── 1. THE ROWS THAT CAUSED THE SCARE REALLY ARE BOTH THERE ───────────────
  {
    const items = db.prepare(`SELECT item, MAX(max_points) mx FROM score_events
      WHERE course=? AND unit=? AND lesson=? AND activity_type=? GROUP BY item ORDER BY item`)
      .all(L.course, L.unit, L.lesson, L.activity_type);
    ok('both writers land on the same cell', items.length === 2, items);
    ok('one is the real graded item, out of 7',
      items.some((i) => i.item !== LESSON_SCORE_ITEM && i.mx === 7), items);
    ok('one is the reserved whole-activity percent, out of 100',
      items.some((i) => i.item === LESSON_SCORE_ITEM && i.mx === 100), items);
    const raw = db.prepare(`SELECT SUM(mx) p FROM (SELECT MAX(max_points) mx FROM score_events
      WHERE course=? AND unit=? AND lesson=? AND activity_type=? GROUP BY item)`)
      .get(L.course, L.unit, L.lesson, L.activity_type).p;
    ok('an UNGUARDED sum reproduces the 107 exactly', raw === 107, raw);
  }

  // ── 2. THE GRADEBOOK WAS NEVER WRONG ──────────────────────────────────────
  //  Stated here because the whole incident turned on believing it was.
  {
    const g = await call('GET', `/api/teacher/classes/${cls.class_code}/progress`, null, tok);
    const d = g.body.summary[0].detail[L.unit][L.lesson][L.activity_type];
    ok('the teacher gradebook shows the real total, not 107', d.points_possible === 7, d.points_possible);
    ok('and the real earned points', d.points_earned === 5, d.points_earned);
    ok('and the correct percent', d.score === 71, d.score);
  }

  // ── 3. THE COVERAGE VIEW AGREES WITH THE GRADEBOOK ────────────────────────
  //  The fix. Before it, this column reported students split between 7 and 107.
  {
    const out = denominators.coverage(L.course, {});
    const col = colOf(out);
    ok('the column is reported', !!col);
    if (col) {
      // Asserted against the REAL field names. An earlier draft of this suite
      // checked col.observed / col.values / col.distribution, none of which
      // exist, so every assertion below passed vacuously on the broken code.
      ok('observed_values is the field that carries the split', Array.isArray(col.observed_values), Object.keys(col));
      const values = (col.observed_values || []).map((v) => v.value);
      ok('the class agrees on ONE value', values.length === 1, col.observed_values);
      ok('and that value is the real total, 7', values[0] === 7, col.observed_values);
      ok('107 appears nowhere in the observation', !values.includes(107), col.observed_values);
      ok('every student is counted on it, none stranded on a phantom',
        (col.observed_values || [])[0] && col.observed_values[0].students === 3, col.observed_values);
      ok('agreement is total', col.agreement_pct === 100, col.agreement_pct);
      ok('the proposal is 7', col.proposal === 7, col.proposal);
      ok('no conflict is reported', col.conflict === null, col.conflict);
      ok('and the column is not flagged as a disagreement',
        col.status !== 'ambiguous' && col.status !== 'conflict', col.status);
    }
  }

  // ── 4. THE ADOPT PATH CAN NEVER AUTHOR THE PHANTOM ────────────────────────
  //  The reason this is a bug and not a cosmetic one: adopt writes
  //  course_denominators, which every gradebook reads at display time.
  {
    const plan = denominators.adopt(L.course, { adopt_proposed: true, dry_run: true });
    const planned = JSON.stringify(plan);
    ok('a dry run of adopt-proposed never plans a 107', !/107/.test(planned), planned.slice(0, 240));
    ok('nor any other percent-contaminated total', !/\b1(0[0-9]|1[0-9]|2[0-9]|3[0-9])\b/.test(
      JSON.stringify((plan.plan || plan.values || []))), planned.slice(0, 240));
  }

  // ── 5. THE GUARD IS SHARED, NOT RESTATED ──────────────────────────────────
  //  Two copies of this rule would drift, and the drift is invisible until it
  //  regrades a class.
  {
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib/admin-denominators.js'), 'utf8');
    ok('the coverage query excludes the reserved item',
      /item <> '\$\{LESSON_SCORE_ITEM\}'/.test(src));
    ok('and imports the name from scoring.js rather than restating it',
      /require\('\.\.\/scoring'\)/.test(src) && !/'lesson-score'/.test(src.replace(/\/\/.*$/gm, '')));
  }

  console.log(`  denominator-lesson-score: ${pass} passed, ${fail.length} failed`);
  fail.forEach((f) => console.log(`    FAIL  ${f}`));
  server.close();
  process.exit(fail.length ? 1 : 0);
})().catch((e) => { console.error('threw:', e); server.close(); process.exit(1); });
