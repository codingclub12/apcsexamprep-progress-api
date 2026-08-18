'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CSA CODE EXERCISES - one authored, server-graded coding task per lesson.
//
//  WHAT THIS IS
//  The content behind the 53 `-exercise-1` pages built by
//  lib/csa-exercise-pages.js. Each entry is a complete exercise: the task, the
//  starter the student opens the editor on, the reference solution, and the test
//  cases the server grades against. One per lesson of the 2025-2026 four-unit
//  CED, in curriculum order.
//
//  WHY THE REFERENCE SOLUTION LIVES HERE AND expected_stdout DOES NOT
//  A hand-written expected output is a guess about what Java prints. Guesses are
//  wrong in exactly the places that matter (5/2 is 2, 5.0/2 is 2.5, a double
//  prints 3.0 and not 3), and a wrong expected output fails a student whose code
//  is correct. So nothing here states an expected output. Each exercise states
//  its reference solution, and scripts/verify-csa-exercises.js RUNS it through
//  real javac/java against every case to produce expected.generated.json. The
//  bank is therefore correct by construction, and re-running the verifier
//  re-proves it rather than re-asserting it.
//
//  The reference solution is author content and never reaches a page. Only the
//  starter, the task text and the visible cases are rendered.
//
//  ── THE THREE SHAPES, AND WHY EACH LESSON GETS THE ONE IT GETS ──────────────
//
//  program   The student writes a whole program with `class Main` and `main`.
//            Inputs arrive on stdin, so a lesson about Scanner is graded on
//            Scanner, and a student may declare as many helper classes as the
//            task calls for. This is most of Units 1, 2 and 4.
//
//  driver    The student writes class definitions and NO main. A hidden harness
//            (`public class Main`) constructs their object, calls their methods
//            and prints what it observes; it reads its own inputs from stdin, so
//            hidden cases drive the same class with values the page never shows.
//            This is all of Unit 3 and the Unit 4 lessons about modelling data,
//            and it is the only shape that can grade "write this class" honestly:
//            a student cannot print their way past a harness whose output they
//            never see.
//
//  segment   Not used here. The original bare-segment bank in
//            seed/csa-code-tests.js keeps it, untouched.
//
//  ── THE RULE ABOUT HIDDEN CASES ─────────────────────────────────────────────
//  Every exercise has at least one hidden case whose input differs from every
//  visible one, so a submission that prints the sample output as a constant
//  fails. scripts/verify-csa-exercises.js proves that per exercise by building
//  that exact cheat and asserting it does not pass.
//
//  Zero PII: author content only. No em-dashes.
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const fs = require('fs');

const UNITS = [
  require('./unit1'),
  require('./unit2'),
  require('./unit3'),
  require('./unit4'),
];

const EXPECTED_FILE = path.join(__dirname, 'expected.generated.json');

// The graded item. Every exercise page is the lesson's exercise-1 column, which
// is already denominated at 1 point per lesson in seed/csa-course-manifest.js.
const ITEM = 'exercise-1';
const COURSE = 'ap-csa';

// ── SHAPE CHECK ──────────────────────────────────────────────────────────────
// Run at require time. A malformed exercise is far cheaper to read as a thrown
// message here than as a broken page or a mis-scored student.
const REQUIRED = ['lesson', 'unit', 'handle', 'title', 'name', 'mode', 'brief', 'task',
  'reads', 'prints', 'starter', 'reference', 'hints', 'seo', 'cases'];

function checkOne(x, where) {
  for (const k of REQUIRED) {
    if (x[k] == null || x[k] === '') throw new Error(`${where}: missing ${k}`);
  }
  if (!['program', 'driver'].includes(x.mode)) {
    throw new Error(`${where}: mode must be program or driver, got ${x.mode}`);
  }
  if (!Array.isArray(x.task) || x.task.length < 2) throw new Error(`${where}: task needs at least 2 steps`);
  if (!Array.isArray(x.hints) || x.hints.length < 2) throw new Error(`${where}: hints needs at least 2 entries`);
  if (!Array.isArray(x.cases) || x.cases.length < 4) throw new Error(`${where}: needs at least 4 cases`);
  if (!x.cases.some((c) => c.hidden)) throw new Error(`${where}: needs at least one hidden case`);
  if (!x.cases.some((c) => !c.hidden)) throw new Error(`${where}: needs at least one visible case`);
  if (x.mode === 'driver' && !x.harness) throw new Error(`${where}: a driver exercise needs a harness`);
  if (x.mode === 'driver' && !x.runHarness) throw new Error(`${where}: a driver exercise needs a runHarness for the Run button`);
  // A hidden harness calls methods by exact name, so a driver exercise that did
  // not publish its signatures would be unpassable by anyone who guessed a
  // different name for the same idea. The API list is the contract, and the page
  // renders it.
  if (x.mode === 'driver' && (!Array.isArray(x.api) || x.api.length < 3)) {
    throw new Error(`${where}: a driver exercise must list the API the harness will call`);
  }
  if (x.mode === 'program' && x.api) throw new Error(`${where}: a program exercise has no API contract to publish`);
  if (x.mode === 'program' && x.harness) throw new Error(`${where}: a program exercise must not carry a harness`);
  // A hidden case whose input is identical to a visible one hides nothing.
  const visible = new Set(x.cases.filter((c) => !c.hidden).map((c) => String(c.stdin || '')));
  if (!x.cases.some((c) => c.hidden && !visible.has(String(c.stdin || '')))) {
    throw new Error(`${where}: every hidden case repeats a visible input, so nothing is actually hidden`);
  }
  if (x.seo.length < 70 || x.seo.length > 160) {
    throw new Error(`${where}: seo is ${x.seo.length} chars, must be 70 to 160`);
  }
}

const ALL = [];
for (const mod of UNITS) {
  for (const x of mod.exercises) {
    checkOne(x, `ap-csa ${x.lesson}`);
    ALL.push(x);
  }
}

const seen = new Set();
for (const x of ALL) {
  if (seen.has(x.lesson)) throw new Error(`ap-csa ${x.lesson}: duplicate exercise`);
  seen.add(x.lesson);
}

function all() {
  return ALL;
}

function byLesson(lesson) {
  return ALL.find((x) => x.lesson === lesson) || null;
}

// ── WHAT THE SEEDER LOADS ────────────────────────────────────────────────────
// The expected outputs are read from the generated file, never from this module,
// so an exercise whose reference solution changed but whose outputs were not
// regenerated fails loudly instead of seeding a stale answer key.
function readExpected() {
  if (!fs.existsSync(EXPECTED_FILE)) {
    throw new Error('seed/csa-exercises/expected.generated.json is missing. '
      + 'Run: node scripts/verify-csa-exercises.js --write');
  }
  return JSON.parse(fs.readFileSync(EXPECTED_FILE, 'utf8'));
}

function caseKey(lesson, seq) {
  return `${lesson}|${ITEM}|${seq}`;
}

function codeTestItems() {
  const expected = readExpected();
  const items = ALL.map((x) => ({
    course: COURSE,
    lesson: x.lesson,
    item: ITEM,
    mode: x.mode,
    cases: x.cases.map((c, i) => {
      const key = caseKey(x.lesson, i);
      if (!(key in expected.cases)) {
        throw new Error(`ap-csa ${x.lesson} case ${i}: no generated expected output. `
          + 'Run: node scripts/verify-csa-exercises.js --write');
      }
      return {
        stdin: String(c.stdin || ''),
        // A driver case's harness IS its postlude. A program case has neither.
        postlude: x.mode === 'driver' ? x.harness : '',
        prelude: '',
        expected_stdout: expected.cases[key],
        hidden: c.hidden ? 1 : 0,
      };
    }),
  }));
  return { items };
}

module.exports = { all, byLesson, codeTestItems, caseKey, ITEM, COURSE, EXPECTED_FILE };
