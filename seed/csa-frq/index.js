'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CSA FRQ PRACTICE - the free-response half of the exam, one per lesson.
//
//  WHAT THIS IS
//  The content behind the `-frq` pages built by lib/csa-frq-pages.js, graded
//  server side as item `exercise-3`, which seed/csa-course-manifest.js already
//  denominates at 4 points for all 53 lessons. Four points because an AP free
//  response question is scored out of four, and the whole point of this item is
//  that it looks and scores like the real thing.
//
//  WHY THIS IS A DIFFERENT ITEM FROM exercise-1 AND debug
//  exercise-1 asks "write this program" and debug asks "fix this program".
//  Neither rehearses what the exam actually asks, which is narrower and
//  stricter: implement a described method against a stated contract, with no
//  main, no output of your own choosing, and no credit for a program that
//  happens to print the right thing. A student can be fluent at exercise-1 and
//  still lose points in May for writing a main instead of a method, or for
//  printing a result the question asked them to RETURN. That gap is what this
//  item exists to close.
//
//  ── MUTANTS: THE CHECK THAT COVERAGE ALONE DOES NOT GIVE YOU ────────────────
//  An entry may declare `mutants`: named wrong versions of its own reference,
//  written as a find/replace on the reference source. scripts/verify-csa-frq.js
//  asserts each one FAILS at least one case.
//
//  This exists because rubric coverage is not the same as rubric power. 1.9 was
//  authored with a case tagged for its casting point, and passed every check in
//  this file, and could still not fail a student who omitted the cast: the
//  harness derived the dividend from the divisor, so the division always came
//  out even and (double) changed nothing. Cases existed, the outputs differed
//  from each other, and the point was ungradeable anyway.
//
//  A mutant states the mistake in the student's words and proves the question
//  can catch it. Where a rubric part names a specific error (truncation, a
//  swapped parameter order, a discarded return value), it should have one.
//
//  ── THE RUBRIC IS THE STRUCTURE, NOT DECORATION ─────────────────────────────
//  Every entry declares exactly four `parts`, and every case declares which
//  part it exercises. The loader below refuses an entry where some part has no
//  case behind it.
//
//  That check is the difference between a rubric and a label. The grader scales
//  cases-passed over cases-total into the item's four points, so if three of the
//  four parts had all the cases, a student could miss a whole rubric point and
//  still score 4/4. Requiring coverage per part makes the reported score mean
//  what the rubric says it means. It is the same reasoning that makes
//  `passed` a read-time computation rather than a stored flag: the number has to
//  be recomputable from the thing it claims to measure.
//
//  ── MODES, AND WHY UNIT 1 IS A SEGMENT ──────────────────────────────────────
//  The three modes are lib/csa-code-modes.js's, unchanged. Which one a lesson
//  gets is decided by what the exam would actually ask at that point:
//
//  segment   The student writes a bare code segment against values the case
//            supplies as a `prelude`. This is Unit 1, because Unit 1 is Using
//            Objects and Methods: the student is handed objects and asked to
//            call them. Asking a Unit 1 student to declare a class would be
//            testing Unit 3 two months early. This is also the shape the
//            original 1.6 FRQ already had, and it kept it (see MIGRATED below).
//
//  driver    The student writes method or class definitions and NO main; a
//            hidden harness calls them and prints what it observes. This is the
//            authentic FRQ shape from Unit 3 on, and it is the only shape that
//            can refuse credit for printing instead of returning, because
//            nothing the student prints is what the harness measures.
//
//  program   Available, rarely right here. An FRQ does not hand you a main.
//
//  ── MIGRATED FROM seed/csa-code-tests.js ────────────────────────────────────
//  1.6 exercise-3 was authored there before this bank existed. It moved here
//  rather than being duplicated: code_test_cases is keyed (course, lesson, item,
//  seq), so two definitions of ap-csa 1.6 exercise-3 would race and whichever
//  lost would grade a page assembled the other way. That is the same reasoning
//  recorded in csa-code-tests.js when the exercise-1 items for 1.3, 1.5 and 1.6
//  moved out of it.
//
//  ── NO expected_stdout IS WRITTEN BY HAND ───────────────────────────────────
//  Same rule as seed/csa-exercises/index.js, for the same reason: a hand written
//  expected output is a guess, and guesses are wrong exactly where it matters
//  (5/2 is 2, a double prints 3.0 not 3). Each entry states a `reference`, and
//  scripts/verify-csa-frq.js RUNS it through real javac/java to produce
//  expected.generated.json. The bank is correct by construction.
//
//  Zero PII: author content only. No student source is ever stored. No em-dashes.
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const fs = require('fs');

const ITEM = 'exercise-3';
const COURSE = 'ap-csa';
const EXPECTED_FILE = path.join(__dirname, 'expected.generated.json');

// The four question types the AP CSA exam actually uses. Declaring one per
// entry is not filing: it is how a teacher checks the course rehearses all four
// rather than four flavours of the same one.
const FRQ_TYPES = ['methods-and-control', 'class', 'array-arraylist', 'two-d-array'];

const UNITS = [
  require('./unit1'),
  require('./unit2'),
  require('./unit3'),
  require('./unit4'),
];

const REQUIRED = ['lesson', 'unit', 'title', 'name', 'mode', 'frqType', 'brief',
  'parts', 'task', 'given', 'starter', 'reference', 'hints', 'seo', 'cases'];

function checkOne(x, where) {
  for (const k of REQUIRED) {
    if (x[k] == null || x[k] === '') throw new Error(`${where}: missing ${k}`);
  }
  if (!['segment', 'program', 'driver'].includes(x.mode)) {
    throw new Error(`${where}: mode must be segment, program or driver, got ${x.mode}`);
  }
  if (!FRQ_TYPES.includes(x.frqType)) {
    throw new Error(`${where}: frqType must be one of ${FRQ_TYPES.join(', ')}, got ${x.frqType}`);
  }
  if (x.mode === 'driver' && !x.harness) {
    throw new Error(`${where}: driver mode needs a harness, or nothing calls the student's method`);
  }
  if (x.mode !== 'driver' && x.harness) {
    throw new Error(`${where}: harness is only meaningful in driver mode`);
  }

  // Exactly four, because the item is worth four points and an AP free response
  // question is scored out of four. Five parts would report a score out of four
  // that no rubric row explains.
  if (!Array.isArray(x.parts) || x.parts.length !== 4) {
    throw new Error(`${where}: needs exactly 4 rubric parts, got ${Array.isArray(x.parts) ? x.parts.length : 'none'}`);
  }
  x.parts.forEach((p, i) => {
    if (!p || !p.label || !p.text) throw new Error(`${where}: part ${i + 1} needs a label and text`);
  });

  if (!Array.isArray(x.task) || x.task.length < 2) throw new Error(`${where}: task needs at least 2 steps`);
  if (!Array.isArray(x.hints) || x.hints.length < 2) throw new Error(`${where}: hints needs at least 2 entries`);
  if (!Array.isArray(x.cases) || x.cases.length < 4) throw new Error(`${where}: needs at least 4 cases`);
  if (!x.cases.some((c) => c.hidden)) throw new Error(`${where}: needs at least one hidden case`);
  if (!x.cases.some((c) => !c.hidden)) throw new Error(`${where}: needs at least one visible case`);

  // A segment case hides its inputs in the prelude; a program or driver case
  // hides them in stdin. Either way "hidden" has to mean a DIFFERENT input, or
  // the case is hidden in name only and a constant passes it.
  const inputOf = (c) => (x.mode === 'segment' ? String(c.prelude || '') : String(c.stdin || ''));
  const visible = new Set(x.cases.filter((c) => !c.hidden).map(inputOf));
  if (!x.cases.some((c) => c.hidden && !visible.has(inputOf(c)))) {
    throw new Error(`${where}: every hidden case repeats a visible input, so nothing is actually hidden`);
  }

  // THE RUBRIC COVERAGE RULE. See the header: without it, the four reported
  // points do not correspond to the four rubric rows the page shows a student.
  const parts = new Set();
  x.cases.forEach((c, i) => {
    if (!Number.isInteger(c.part) || c.part < 1 || c.part > 4) {
      throw new Error(`${where}: case ${i} must name the rubric part it tests (part: 1 to 4)`);
    }
    parts.add(c.part);
  });
  for (let p = 1; p <= 4; p++) {
    if (!parts.has(p)) {
      throw new Error(`${where}: rubric part ${p} (${x.parts[p - 1].label}) has no case behind it, `
        + 'so a student could miss it entirely and still be reported at 4 of 4');
    }
  }

  if (x.mutants != null) {
    if (!Array.isArray(x.mutants)) throw new Error(`${where}: mutants must be an array`);
    x.mutants.forEach((m, i) => {
      if (!m || !m.describe || !m.find || m.replace == null) {
        throw new Error(`${where}: mutant ${i} needs describe, find and replace`);
      }
      if (!String(x.reference).includes(m.find)) {
        throw new Error(`${where}: mutant ${i} (${m.describe}) does not match the reference, `
          + `so it silently tests nothing: ${JSON.stringify(String(m.find).slice(0, 50))}`);
      }
      if (m.find === m.replace) throw new Error(`${where}: mutant ${i} changes nothing`);
    });
  }

  if (x.seo.length < 70 || x.seo.length > 160) {
    throw new Error(`${where}: seo is ${x.seo.length} chars, must be 70 to 160`);
  }
}

const FRQS = [].concat(...UNITS.map((u) => u.FRQS));

for (const x of FRQS) checkOne(x, `ap-csa ${x.lesson} frq`);

const seen = new Set();
for (const x of FRQS) {
  if (seen.has(x.lesson)) throw new Error(`ap-csa ${x.lesson}: duplicate FRQ`);
  seen.add(x.lesson);
}

function all() { return FRQS; }
function byLesson(lesson) { return FRQS.find((x) => x.lesson === lesson) || null; }

function readExpected() {
  if (!fs.existsSync(EXPECTED_FILE)) {
    throw new Error('seed/csa-frq/expected.generated.json is missing. '
      + 'Run: node scripts/verify-csa-frq.js --write');
  }
  return JSON.parse(fs.readFileSync(EXPECTED_FILE, 'utf8'));
}

function caseKey(lesson, seq) {
  return `${lesson}|${ITEM}|${seq}`;
}

function codeTestItems() {
  const expected = readExpected();
  const items = FRQS.map((x) => ({
    course: COURSE,
    lesson: x.lesson,
    item: ITEM,
    mode: x.mode,
    cases: x.cases.map((c, i) => {
      const key = caseKey(x.lesson, i);
      if (!(key in expected.cases)) {
        throw new Error(`ap-csa ${x.lesson} ${ITEM} case ${i}: no generated expected output. `
          + 'Run: node scripts/verify-csa-frq.js --write');
      }
      return {
        stdin: String(c.stdin || ''),
        prelude: String(c.prelude || ''),
        postlude: x.mode === 'driver' ? x.harness : String(c.postlude || ''),
        expected_stdout: expected.cases[key],
        hidden: c.hidden ? 1 : 0,
      };
    }),
  }));
  return { items };
}

module.exports = { all, byLesson, codeTestItems, caseKey, ITEM, COURSE, EXPECTED_FILE, FRQ_TYPES };
