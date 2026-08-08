'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the canonical gradebook contract.
//
//  WHY THIS EXISTS
//  There was no canonical gradebook contract, so each course invented its own.
//  Measured across the four live courses, activity vocabularies, lesson id
//  shapes, denominator coverage and even the meaning of the overall percentage
//  all differed. Fixing one course could not fix the others because they did not
//  share a shape, so every fix had to be per-course. That was the actual defect.
//
//  This suite pins the contract that replaces it. Every assertion below is one
//  of the agreed acceptance tests, numbered to match, and each runs against the
//  REAL routes over a throwaway SQLite file. No network, no secrets.
//
//  THE TWO PROPERTIES THAT MATTER MOST TO THE PEOPLE USING THIS
//    - A teacher must never lose a student's work to a rendering change. Every
//      recorded number still appears; work that cannot be priced is reported
//      loudly rather than dropped quietly.
//    - An operator must be able to see the teacher's gradebook, not a second
//      implementation of it. Test 12 asserts the admin route and the teacher
//      route return the identical document.
//
//  Zero PII: synthetic names, a throwaway PIN, never printed.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:contract
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-gb-contract.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

// The admin router fails closed without a strong key, which is the correct
// posture. Supply one before it loads so the route can be exercised in process.
process.env.ADMIN_KEY = 'smoke-admin-key-long-enough-to-pass-the-guard';

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
app.use('/api/admin', require('../routes/admin'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const post = (p, body, tok) => fetch(base() + p, {
  method: 'POST',
  headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json() }));
const get = (p, tok) => fetch(base() + p, { headers: { Authorization: 'Bearer ' + tok } })
  .then(async (r) => ({ status: r.status, body: await r.json() }));
const adminGet = (p) => fetch(base() + p, { headers: { 'x-admin-key': process.env.ADMIN_KEY } })
  .then(async (r) => ({ status: r.status, body: await r.json() }));

const run = (s, ...a) => db.prepare(s).run(...a);
const { buildCanonicalGradebook } = require('../lib/gradebook-contract');

const CYBER = 'ap-cybersecurity';

// Every student rollup, on every course, must carry exactly this key set. A
// course-conditional field is the defect this whole contract exists to prevent.
const ROLLUP_KEYS = [
  'pct', 'earned', 'graded', 'possible',
  'items_graded', 'items_passed', 'items_total', 'items_percent_only',
].sort();

const near = (a, b, eps = 0.051) => a != null && b != null && Math.abs(a - b) < eps;

(async () => {
  console.log('\nCANONICAL GRADEBOOK CONTRACT\n');

  // ── Fixture ───────────────────────────────────────────────────────────────
  console.log('0. Build a class and push real work through the real routes');
  const reg = await post('/api/teacher/register', {
    email: 'gb.contract@example.org', password: 'a-long-enough-password',
    name: 'GB Contract', school: 'Example High',
  });
  const teacherToken = reg.body.token;
  ok('  teacher registered', reg.status === 201 && !!teacherToken, reg.body);

  const mk = async (name, course) => {
    const c = await post('/api/teacher/classes', { class_name: name, course }, teacherToken);
    return c.body && c.body.class && c.body.class.class_code;
  };
  const code = await mk('Contract Period 1', CYBER);
  ok('  class created', !!code, code);

  // Authored denominators, so the points model has an authority to price
  // against. exercise-1 out of 7, lab out of 8, quiz out of 5: three different
  // weights on one lesson, which is what makes a mean-of-percentages visibly
  // wrong.
  run(`INSERT INTO course_denominators (course,unit,lesson,activity_type,possible) VALUES
       (?,'unit-1','1.1','exercise-1',7),
       (?,'unit-1','1.1','lab',8),
       (?,'unit-1','1.1','quiz',5),
       (?,'unit-1','1.2','exercise-1',5),
       (?,'unit-1','1.2','lab',25)`, CYBER, CYBER, CYBER, CYBER, CYBER);

  // Student 1 reproduces the measured live case exactly:
  //   exercise-1  0 / 7      a scored ZERO, which must never read as "blank"
  //   lab         7 / 8      reported by the page as a pair
  //   quiz        5 / 5
  //   = 12 / 20 = 60 percent
  const join = async (nm) => (await post('/api/student/join',
    { class_code: code, display_name: nm, pin: '1234' })).body.token;
  const score = (tok, lesson, act, item, earned, possible) => post('/api/student/score',
    { course: CYBER, unit: 'unit-1', lesson, activity_type: act, item, earned, possible }, tok);

  const s1 = await join('GC1');
  await post('/api/student/progress',
    { course: CYBER, unit: 'unit-1', lesson: '1.1', activity_type: 'lesson', completed: true }, s1);
  await score(s1, '1.1', 'exercise-1', 'e1', 0, 7);
  // A reporter posts whole marks: one question, one point. 7 of 8.
  await score(s1, '1.1', 'lab', 'lab', 7, 8);
  await score(s1, '1.1', 'quiz', 'q1', 5, 5);

  // Student 2 has attempted nothing at all: the ungraded case.
  const s2 = await join('GC2');
  await post('/api/student/progress',
    { course: CYBER, unit: 'unit-1', lesson: '1.1', activity_type: 'lesson', completed: true }, s2);

  // Student 3 exists to prove weighting: a perfect 5 point quiz and a 25 point
  // project-weight lab, one at a time.
  const s3 = await join('GC3');

  const gb = () => buildCanonicalGradebook(code, { reveal: true });
  const byLabel = (g, l) => g.students.find((s) => s.label === l);

  // ── 1. Points, not a mean of percentages ──────────────────────────────────
  console.log('1. The rollup sums points');
  let g = gb();
  const one = byLabel(g, 'GC1');
  ok('  earned 12, in whole marks', one.overall.earned === 12, one.overall.earned);
  ok('  graded 20', near(one.overall.graded, 20), one.overall.graded);
  ok('  pct 60', near(one.overall.pct, 60), one.overall.pct);
  // A mean of the three percentages would be (0 + 88 + 100) / 3 = 62.7.
  ok('  and it is NOT the mean of the percentages', !near(one.overall.pct, 62.7, 0.3), one.overall.pct);

  // ── 2. Stability ──────────────────────────────────────────────────────────
  console.log('2. Identical item data yields an identical document');
  const a1 = JSON.stringify(gb());
  const a2 = JSON.stringify(gb());
  ok('  two consecutive reads are byte identical', a1 === a2);

  // ── 3. No earned 0 / possible 0 with graded items ─────────────────────────
  console.log('3. A student with graded items always reports real totals');
  const bad = g.students.filter((s) => s.overall.items_graded > 0
    && s.overall.earned === 0 && s.overall.graded === 0);
  ok('  no student is earned 0 / graded 0 while items_graded > 0', bad.length === 0,
    bad.map((s) => s.label));
  ok('  possible is never 0 for a class with authored work', g.students.every((s) => s.overall.possible > 0),
    g.students.map((s) => s.overall.possible));

  // ── 4. basis is gone ──────────────────────────────────────────────────────
  console.log('4. `basis` does not exist');
  ok('  no response field named basis anywhere', !/"basis"/.test(a1));

  // ── 5. Nothing attempted means null, never zero ───────────────────────────
  console.log('5. Ungraded is not failing');
  const two = byLabel(g, 'GC2');
  ok('  pct is null with zero attempts', two.overall.pct === null, two.overall.pct);
  ok('  and it is not 0', two.overall.pct !== 0, two.overall.pct);
  ok('  earned and graded are 0, possible is the class total',
    two.overall.earned === 0 && two.overall.graded === 0 && two.overall.possible === one.overall.possible,
    two.overall);

  // ── 6. Denominator coverage is reported, loudly ───────────────────────────
  console.log('6. A graded column with no authored denominator is an integrity failure');
  ok('  integrity.missing_denominators is a full list, not just a count',
    Array.isArray(g.integrity.missing_denominators)
    && g.integrity.missing_denominators.length === g.integrity.denominators_missing,
    g.integrity.denominators_missing);
  const authoredCols = g.items.filter((i) => i.graded && i.possible != null);
  ok('  every authored column carries its possible and its source',
    authoredCols.length > 0 && authoredCols.every((i) => i.possible > 0
      && ['manifest', 'authored'].includes(i.possible_source)),
    authoredCols.slice(0, 3));
  ok('  the columns we authored are not in the missing list',
    !g.integrity.missing_denominators.some((m) => m.item_key === 'unit-1/1.1/quiz'));
  // Nothing is lost to a missing denominator: work priced only as a percent is
  // still shown, still counted as an attempt, and named in integrity.
  ok('  percent-only work is named rather than dropped',
    Array.isArray(g.integrity.percent_only_items));

  // ── 7. Weight moves the needle proportionally ─────────────────────────────
  console.log('7. A 25 point item moves pct about 5x more than a 5 point item');
  await score(s3, '1.1', 'quiz', 'q1', 5, 5);          // 5 / 5, perfect
  const afterQuiz = byLabel(gb(), 'GC3').overall;
  await score(s3, '1.2', 'lab', 'lab', 0, 25);         // 0 / 25, the heavy item
  const afterLab = byLabel(gb(), 'GC3').overall;
  ok('  perfect 5 point quiz alone reads 100', near(afterQuiz.pct, 100), afterQuiz.pct);
  ok('  adding a zeroed 25 point item drops it to 16.7 (5/30)', near(afterLab.pct, 16.7), afterLab.pct);
  ok('  the heavy item dominates, which a mean of percentages could not express',
    afterLab.graded === 30 && afterLab.earned === 5, afterLab);

  // ── 8. possible is a class property ───────────────────────────────────────
  console.log('8. `possible` is identical for every student in a class');
  g = gb();
  const possibles = [...new Set(g.students.map((s) => s.overall.possible))];
  ok('  one distinct value across the roster', possibles.length === 1, possibles);
  const sumCols = g.items.filter((i) => i.graded && i.possible != null)
    .reduce((n, i) => n + i.possible, 0);
  ok('  and it equals the sum of the authored columns',
    near(possibles[0], Math.round(sumCols * 100) / 100), { possibles, sumCols });

  // ── 9. Every course returns the same key set ──────────────────────────────
  console.log('9. Every course returns the same shape, including an empty one');
  const courses = ['ap-cybersecurity', 'ap-csa', 'ap-csp', 'ap-networking'];
  const codes = {};
  for (const c of courses) codes[c] = c === CYBER ? code : await mk('Shape ' + c, c);
  let shapeOk = true, shapeDetail = null;
  for (const c of courses) {
    const doc = buildCanonicalGradebook(codes[c], { reveal: true });
    if (!doc) { shapeOk = false; shapeDetail = { course: c, doc: null }; break; }
    for (const st of doc.students) {
      const keys = Object.keys(st.overall).sort();
      if (JSON.stringify(keys) !== JSON.stringify(ROLLUP_KEYS)) {
        shapeOk = false; shapeDetail = { course: c, keys };
      }
    }
  }
  ok('  identical rollup key set on all four courses', shapeOk, shapeDetail);

  // AP Networking is the reference implementation precisely because it has no
  // enrolled students: a course with an empty roster must return a well formed
  // gradebook, not an error and not a null rollup.
  const net = buildCanonicalGradebook(codes['ap-networking'], { reveal: true });
  ok('  a course with zero students returns a well formed document',
    !!net && Array.isArray(net.students) && net.students.length === 0
    && Array.isArray(net.items) && net.items.length > 0
    && net.summary.class_pct === null,
    net && { students: net.students.length, items: net.items.length, pct: net.summary.class_pct });

  // ── 10. lesson_seq orders every course ────────────────────────────────────
  console.log('10. lesson_seq gives every course a curriculum order');
  const csp = buildCanonicalGradebook(codes['ap-csp'], { reveal: true });
  ok('  every CSP item carries an integer lesson_seq',
    csp.items.every((i) => Number.isInteger(i.lesson_seq)));
  const bi1 = csp.lessons.filter((l) => l.unit === 'bi-1').map((l) => l.lesson_ref);
  const { COURSES } = require('../utils');
  const bi1Authored = COURSES['ap-csp'].units['bi-1'].lessons;
  ok('  CSP slug lessons sort in curriculum order, not alphabetically',
    JSON.stringify(bi1) === JSON.stringify(bi1Authored), { got: bi1, want: bi1Authored });
  ok('  and alphabetical order would have been different',
    JSON.stringify(bi1) !== JSON.stringify([...bi1].sort()), bi1);

  // A non-numeric lesson id authored into the manifest sorts into its authored
  // position, not alphabetically and not last.
  run(`INSERT INTO course_manifest (course,unit,lesson_id,item_id,item_type,points)
       VALUES ('ap-networking','unit-1','test','test-quiz','quiz',10)`);
  const net2 = buildCanonicalGradebook(codes['ap-networking'], { reveal: true });
  const u1 = net2.lessons.filter((l) => l.unit === 'unit-1').map((l) => l.lesson_ref);
  ok('  a manifest-authored non-numeric lesson is placed, not dropped', u1.includes('test'), u1);
  ok('  and it sorts after the config lessons it was authored behind',
    u1.indexOf('test') === u1.length - 1 && u1[0] === '1.1', u1);

  // ── 11. Blank and scored zero are different facts ─────────────────────────
  console.log('11. Not attempted and scored zero are distinguishable');
  g = gb();
  const oneNow = byLabel(g, 'GC1');
  const zeroCell = oneNow.items['unit-1/1.1/exercise-1'];
  ok('  a scored zero has a cell with earned 0',
    !!zeroCell && zeroCell.earned === 0 && zeroCell.status === 'attempted', zeroCell);
  ok('  an unattempted item has NO cell at all, so a view renders blank',
    oneNow.items['unit-1/1.3/quiz'] === undefined);
  ok('  the scored zero still counts as a graded item',
    oneNow.overall.items_graded >= 3, oneNow.overall.items_graded);

  // ── 12. The operator sees the teacher gradebook, not a copy of it ─────────
  console.log('12. Admin and teacher return the identical document');
  const tv = await get(`/api/teacher/classes/${code}/gradebook`, teacherToken);
  ok('  teacher gradebook responds', tv.status === 200 && tv.body.contract_version === 1, tv.status);
  const av = await adminGet(`/api/admin/class/${code}/gradebook/as-teacher?reveal=1`);
  ok('  admin as-teacher responds', av.status === 200, av.status);
  ok('  the two documents are byte identical with reveal on',
    JSON.stringify(tv.body) === JSON.stringify(av.body));

  const anon = await adminGet(`/api/admin/class/${code}/gradebook/as-teacher`);
  ok('  anonymized by default', anon.status === 200 && anon.body.anonymized === true
    && anon.body.students.every((s) => /^Student \d+$/.test(s.label)),
    anon.body && anon.body.students && anon.body.students.map((s) => s.label));
  // Same numbers, only the labels differ, so an operator verifying the grades
  // never needs a student's name to do it.
  const strip = (d) => JSON.stringify(d.students.map((s) => [s.overall, s.pace, s.items]));
  ok('  and it carries exactly the same numbers as the teacher sees',
    strip(anon.body) === strip(tv.body));

  // ── 13. Nothing that already worked was taken away ────────────────────────
  console.log('13. Regression: the existing surfaces are untouched');
  const legacy = await get(`/api/teacher/classes/${code}/progress`, teacherToken);
  ok('  GET /classes/:code/progress still responds with its own shape',
    legacy.status === 200 && Array.isArray(legacy.body.summary)
    && !!legacy.body.course_config && !!legacy.body.denominators, legacy.status);
  const stillPosts = await post('/api/student/progress',
    { course: CYBER, unit: 'unit-1', lesson: '1.3', activity_type: 'quiz', score: 90, completed: true }, s1);
  ok('  POST /api/student/progress contract is unchanged',
    stillPosts.status === 200 && stillPosts.body.ok === true, stillPosts.status);
  const adminLegacy = await adminGet(`/api/admin/class/${code}/gradebook`);
  ok('  the legacy admin gradebook still responds',
    adminLegacy.status === 200 && Array.isArray(adminLegacy.body.students), adminLegacy.status);

  // Every recorded number is still reachable. This is the promise that matters
  // to a teacher: a rendering change must never cost a student their work.
  const recorded = db.prepare(
    `SELECT COUNT(DISTINCT student_id || '|' || lesson || '|' || activity_type) n
     FROM score_events WHERE course = ? AND item <> 'lesson-score'`).get(CYBER).n;
  g = gb();
  const shown = g.students.reduce((n, s) =>
    n + Object.values(s.items).filter((c) => c.source === 'score_events').length, 0);
  ok(`  every score_events cell recorded (${recorded}) is rendered (${shown})`, shown === recorded);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('\nSUITE ERROR:', e);
  server.close();
  process.exit(1);
});
