'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CSA DEBUGGING EXERCISES - the one category CodeHS has that this course
//  had zero of, per docs/csa-codehs-exercise-reference.md's own gap analysis.
//
//  WHAT THIS IS
//  A second graded code exercise per lesson, item id `debug`, distinct from
//  `exercise-1` (write from a skeleton) and `exercise-2` (applied MCQ, see
//  seed/csa-exercise-2.js). The starter here is NOT a skeleton: it is a
//  plausible, mostly-correct attempt with one or two REAL bugs planted in it.
//  The task is find them and fix them, not write the program from scratch.
//  Same submission modes, same grading pipeline (code_test_cases, POST
//  /api/student/code-grade) as exercise-1; only the pedagogical shape differs.
//
//  WHY item id `debug` AND NOT exercise-2 OR exercise-3
//  exercise-2 is the already-decided, already-denominated (6 pts) applied MCQ
//  slot, shared with CSP. exercise-3 is the FRQ slot (4 pts), already used by
//  1.6. Reusing either would collide with an existing, different-shaped
//  feature and its point value. `debug` is a new activity type, denominated
//  at 1 point (seed/csa-course-manifest.js), same weight class as exercise-1
//  since it is the same kind of activity: one graded code submission.
//
//  ONLY ONE LESSON SO FAR, ON PURPOSE
//  4.4 (Array Traversals) is the proof of the whole mechanism end to end: this
//  file, scripts/verify-csa-debug-exercises.js, the code_test_cases wiring in
//  scripts/seed-code-tests.js, lib/csa-debug-pages.js, and
//  scripts/csa-debug-pages-csv.js. Scaling to more lessons is adding another
//  entry to this array and rerunning the verifier; nothing else needs to
//  change. See docs/runs/2026-08-20-claude-code-csa-unit4-ced-fix.md for why
//  this stayed at one lesson in this pass rather than scaling further.
//
//  Zero PII: author content only. No em-dashes.
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const fs = require('fs');

const ITEM = 'debug';
const COURSE = 'ap-csa';
const EXPECTED_FILE = path.join(__dirname, 'csa-debug-exercises.expected.generated.json');

// Per-unit files, same split as seed/csa-exercises/unitN.js.
const UNIT1 = require('./csa-debug-unit1');
const UNIT2 = require('./csa-debug-unit2');
const UNIT3 = require('./csa-debug-unit3');
const UNIT4 = require('./csa-debug-unit4');

const REQUIRED = ['lesson', 'unit', 'mode', 'brief', 'task', 'reads', 'prints',
  'starter', 'reference', 'hints', 'seo', 'cases'];

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
  const visible = new Set(x.cases.filter((c) => !c.hidden).map((c) => String(c.stdin || '')));
  if (!x.cases.some((c) => c.hidden && !visible.has(String(c.stdin || '')))) {
    throw new Error(`${where}: every hidden case repeats a visible input, so nothing is actually hidden`);
  }
  if (x.seo.length < 70 || x.seo.length > 160) {
    throw new Error(`${where}: seo is ${x.seo.length} chars, must be 70 to 160`);
  }
}

const EXERCISES = [
  {
    lesson: '4.4', unit: 'unit-4',
    mode: 'program',
    name: 'Find the Off-By-One',
    title: 'Array Traversals',
    brief: 'This program is not a blank editor. It is somebody else\'s attempt, and it almost works: two real bugs are hiding in it, the kind that show up as a crash and the kind that shows up as a wrong answer nobody notices until a tie happens. Finding a bug in code you did not write is its own skill, distinct from writing code that has none yet.',
    task: [
      'Run this program on the sample input. It crashes with an ArrayIndexOutOfBoundsException while printing the array backward. Find the loop bound that reads one index past the end of the array and fix it.',
      'Once it runs without crashing, it still disagrees with the expected output whenever the largest value appears more than once: it reports the LAST index that value appears at instead of the FIRST. Fix the comparison so a tie keeps the earlier index.',
      'The forward print and the sum of the even-index elements are already correct. Do not rewrite them; the fix is smaller than it looks.',
    ],
    reads: 'An integer count of at least 1, then that many integers.',
    prints: 'Every element forwards, then backwards, then the FIRST index of the largest value, then the sum of the elements at even indexes.',
    starter: [
      'import java.util.Scanner;',
      '',
      'public class Main {',
      '  public static void main(String[] args) {',
      '    Scanner input = new Scanner(System.in);',
      '    int count = input.nextInt();',
      '    int[] data = new int[count];',
      '    for (int i = 0; i < count; i++) {',
      '      data[i] = input.nextInt();',
      '    }',
      '',
      '    for (int value : data) {',
      '      System.out.println(value);',
      '    }',
      '    for (int i = data.length; i >= 0; i--) {',
      '      System.out.println(data[i]);',
      '    }',
      '',
      '    int best = 0;',
      '    for (int i = 1; i < data.length; i++) {',
      '      if (data[i] >= data[best]) {',
      '        best = i;',
      '      }',
      '    }',
      '    System.out.println(best);',
      '',
      '    int evenSum = 0;',
      '    for (int i = 0; i < data.length; i = i + 2) {',
      '      evenSum = evenSum + data[i];',
      '    }',
      '    System.out.println(evenSum);',
      '  }',
      '}',
    ].join('\n'),
    reference: [
      'import java.util.Scanner;',
      '',
      'public class Main {',
      '  public static void main(String[] args) {',
      '    Scanner input = new Scanner(System.in);',
      '    int count = input.nextInt();',
      '    int[] data = new int[count];',
      '    for (int i = 0; i < count; i++) {',
      '      data[i] = input.nextInt();',
      '    }',
      '',
      '    for (int value : data) {',
      '      System.out.println(value);',
      '    }',
      '    for (int i = data.length - 1; i >= 0; i--) {',
      '      System.out.println(data[i]);',
      '    }',
      '',
      '    int best = 0;',
      '    for (int i = 1; i < data.length; i++) {',
      '      if (data[i] > data[best]) {',
      '        best = i;',
      '      }',
      '    }',
      '    System.out.println(best);',
      '',
      '    int evenSum = 0;',
      '    for (int i = 0; i < data.length; i = i + 2) {',
      '      evenSum = evenSum + data[i];',
      '    }',
      '    System.out.println(evenSum);',
      '  }',
      '}',
    ].join('\n'),
    hints: [
      'The crash happens on the very first line of the backward loop, before anything prints. Valid indexes run from 0 to length - 1; length itself is one past the end.',
      'A tie for the largest value should keep the FIRST index it appeared at. A strict > only replaces best when a later value is bigger, so an equal later value leaves the earlier index alone. >= replaces it anyway.',
      'The forward print and the even-index sum never needed a fix. If your diff touches those lines, you changed something that was not broken.',
    ],
    seo: 'AP CSA 4.4 debugging exercise: find and fix an off-by-one crash and a tie-breaking bug in an array traversal program.',
    cases: [
      { stdin: '5\n3 9 4 9 1\n', hidden: 0 },
      { stdin: '1\n42\n', hidden: 0 },
      { stdin: '4\n5 5 5 5\n', hidden: 1 },
      { stdin: '5\n2 9 4 9 9\n', hidden: 1 },
      { stdin: '3\n1 2 3\n', hidden: 1 },
    ],
  },
].concat(UNIT1.EXERCISES, UNIT2.EXERCISES, UNIT3.EXERCISES, UNIT4.EXERCISES);

for (const x of EXERCISES) checkOne(x, `ap-csa ${x.lesson} debug`);

const seen = new Set();
for (const x of EXERCISES) {
  if (seen.has(x.lesson)) throw new Error(`ap-csa ${x.lesson}: duplicate debug exercise`);
  seen.add(x.lesson);
}

function all() { return EXERCISES; }
function byLesson(lesson) { return EXERCISES.find((x) => x.lesson === lesson) || null; }

function readExpected() {
  if (!fs.existsSync(EXPECTED_FILE)) {
    throw new Error('seed/csa-debug-exercises.expected.generated.json is missing. '
      + 'Run: node scripts/verify-csa-debug-exercises.js --write');
  }
  return JSON.parse(fs.readFileSync(EXPECTED_FILE, 'utf8'));
}

function caseKey(lesson, seq) {
  return `${lesson}|${ITEM}|${seq}`;
}

function codeTestItems() {
  const expected = readExpected();
  const items = EXERCISES.map((x) => ({
    course: COURSE,
    lesson: x.lesson,
    item: ITEM,
    mode: x.mode,
    cases: x.cases.map((c, i) => {
      const key = caseKey(x.lesson, i);
      if (!(key in expected.cases)) {
        throw new Error(`ap-csa ${x.lesson} debug case ${i}: no generated expected output. `
          + 'Run: node scripts/verify-csa-debug-exercises.js --write');
      }
      return {
        stdin: String(c.stdin || ''),
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
