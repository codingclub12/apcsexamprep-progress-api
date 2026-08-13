'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: AP CSP Big Idea unit tests are graded, and guided notes are not a topic.
//
//  TWO DEFECTS, BOTH IN THE HANDLE MAPPING
//
//  1. The unit tests could not carry a grade. 'unit-test' ends in no activity
//     token, so trailingActivity called it a lesson, and a lesson is a page
//     VISIT. Six tests and 84 authored questions with complete answer keys, and
//     the highest stakes assessment in the course was recorded as "visited".
//     The pages report fine: they render "9 / 12", which is exactly the shape
//     the theme reporter parses. They were just filed somewhere ungradeable.
//
//  2. Sixteen guided-notes pages each minted a SECOND lesson beside the real
//     one, so reading the notes for Topic 1.1 registered progress against a
//     topic called 'collaboration-notes' that appears in no course.
//
//  WHY BIG IDEA 3 IS TWO COLUMNS
//  It sits its test in two parts. A handle post carries no item, so the server
//  defaults the item name to 'item' (routes/student.js). Folding both parts into
//  one lesson would therefore have part B overwrite part A. They stay separate.
//
//  Zero PII: one synthetic student, a throwaway PIN.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:cspunittests
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-csp-unit-tests.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
process.env.JWT_SECRET = 'smoke-csp-unit-tests-secret-long-enough';

const express = require('express');
const db = require('../db');
const { pageFromHandle, COURSES, examsOf } = require('../utils');
const { buildCanonicalGradebook, canonicalActivity, isGradedActivity } = require('../lib/gradebook-contract');
const { buildGradebook } = require('../lib/admin-gradebook');

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

const COURSE = 'ap-csp';

(async () => {
  console.log('\nCSP UNIT TESTS ARE GRADED, GUIDED NOTES ARE NOT A TOPIC\n');

  console.log('1. The handles resolve to a GRADED activity');
  for (const [h, unit, lesson] of [
    ['ap-csp-course-bi1-unit-test', 'bi-1', 'unit-test'],
    ['ap-csp-course-bi2-unit-test', 'bi-2', 'unit-test'],
    ['ap-csp-course-bi3-unit-test-part-a', 'bi-3', 'unit-test-part-a'],
    ['ap-csp-course-bi3-unit-test-part-b', 'bi-3', 'unit-test-part-b'],
    ['ap-csp-course-bi4-unit-test', 'bi-4', 'unit-test'],
    ['ap-csp-course-bi5-unit-test', 'bi-5', 'unit-test'],
  ]) {
    const p = pageFromHandle(h);
    ok(`  ${h} -> ${unit}/${lesson}/exam`,
      p && p.unit === unit && p.lesson === lesson && p.activity_type === 'exam', p);
  }
  ok('  and "exam" is graded, which "lesson" was not',
    isGradedActivity(canonicalActivity('exam').activity)
    && !isGradedActivity(canonicalActivity('lesson').activity));

  console.log('2. Guided notes belong to their topic');
  for (const [h, lesson] of [
    ['ap-csp-course-bi1-collaboration-notes', 'collaboration'],
    ['ap-csp-course-bi5-safe-computing-notes', 'safe-computing'],
    ['ap-csp-course-bi2-binary-numbers-notes', 'binary-numbers'],
  ]) {
    const p = pageFromHandle(h);
    ok(`  ${h} -> ${lesson}`, p && p.lesson === lesson && p.activity_type === 'lesson', p);
  }
  ok('  the topic page itself is unchanged',
    pageFromHandle('ap-csp-course-bi1-collaboration').lesson === 'collaboration');

  console.log('3. Nothing else about CSP handles moved');
  const q = pageFromHandle('ap-csp-course-bi1-collaboration-quiz');
  ok('  a lesson quiz still resolves as before', q.lesson === 'collaboration' && q.activity_type === 'quiz', q);
  const e = pageFromHandle('ap-csp-course-bi3-variables-exercise-1');
  ok('  an exercise still resolves as before', e.lesson === 'variables' && e.activity_type === 'exercise-1', e);
  ok('  a course hub is still untracked', pageFromHandle('ap-csp-course-create-task') === null);

  console.log('4. Six columns are DECLARED, so an untaken test is visible');
  const reg = await post('/api/teacher/register', {
    email: 'csp.ut@example.org', password: 'a-long-enough-password',
    name: 'CSP Unit Tests', school: 'Example High',
  });
  const tok = reg.body.token;
  const code = (await post('/api/teacher/classes', { class_name: 'CSP P1', course: COURSE }, tok)).body.class.class_code;

  const declared = Object.values(COURSES[COURSE].units).flatMap((u) => examsOf(u));
  ok('  the config declares six unit tests', declared.length === 6, declared.length);
  const g0 = buildCanonicalGradebook(code, { reveal: true });
  const cols0 = g0.items.filter((i) => i.native_activity === 'exam');
  ok('  and all six are columns before anyone sits one', cols0.length === 6, cols0.length);
  ok('  every one of them is graded', cols0.every((i) => i.graded), cols0.map((i) => i.graded));
  ok('  the operator grid shows the same six',
    buildGradebook(code, { reveal: true }).items.filter((i) => i.activity === 'exam').length === 6);

  console.log('5. A sat test records real marks, through the real endpoint');
  const stok = (await post('/api/student/join', { class_code: code, display_name: 'UT', pin: '1234' })).body.token;
  //  Exactly what the theme reporter sends: a handle and a pair, no item.
  for (const [h, earned, possible] of [
    ['ap-csp-course-bi1-unit-test', 9, 12],
    ['ap-csp-course-bi3-unit-test-part-a', 11, 14],
    ['ap-csp-course-bi3-unit-test-part-b', 7, 14],
  ]) {
    const r = await post('/api/student/score', { handle: h, earned, possible }, stok);
    ok(`  ${h} accepted`, r.status === 200, r.body);
  }

  const items = buildCanonicalGradebook(code, { reveal: true }).students[0].items;
  ok('  BI1 reads 9 of 12, the marks the page counted',
    items['bi-1/unit-test/exam'] && items['bi-1/unit-test/exam'].earned === 9
    && items['bi-1/unit-test/exam'].possible === 12, items['bi-1/unit-test/exam']);

  //  The reason the two parts are separate lessons. If they shared one, the
  //  default item name would collide and part B would replace part A.
  const a = items['bi-3/unit-test-part-a/exam'], b = items['bi-3/unit-test-part-b/exam'];
  ok('  BI3 part A kept its own marks, 11 of 14', a && a.earned === 11 && a.possible === 14, a);
  ok('  BI3 part B kept its own marks, 7 of 14', b && b.earned === 7 && b.possible === 14, b);
  ok('  neither part overwrote the other', a && b && a.earned !== b.earned);

  console.log('6. The tests now count toward the grade');
  const ov = buildCanonicalGradebook(code, { reveal: true }).students[0].overall;
  ok('  27 marks of 40, which is the three tests summed',
    ov.earned === 27 && ov.graded === 40, { earned: ov.earned, graded: ov.graded });
  ok('  and the grade is points over points, not a mean', ov.pct === 67.5, ov.pct);

  console.log('7. Reading the notes is progress on the TOPIC, not a new one');
  await post('/api/student/track', { handle: 'ap-csp-course-bi1-collaboration-notes' }, stok);
  const after = buildCanonicalGradebook(code, { reveal: true }).students[0].items;
  ok('  no "-notes" column exists', !Object.keys(after).some((k) => /-notes/.test(k)),
    Object.keys(after).filter((k) => /-notes/.test(k)));
  ok('  the visit landed on the real topic', !!after['bi-1/collaboration/lesson']);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('\nSUITE ERROR:', e);
  server.close();
  process.exit(1);
});
