'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CSA CODE TEST BANK — hidden test cases for server-side code grading.
//
//  Model (AP style): the student submits a BARE CODE SEGMENT, not a full class.
//  Each case injects its inputs as `prelude` (Java prepended before the segment)
//  and an optional `postlude` (appended after). The grader wraps
//  prelude + segment + postlude in a class/main, compiles, runs, and compares
//  stdout to expected_stdout. Cases NEVER reach the client.
//
//  Integrity rule enforced by the loader: at least three cases per item and at
//  least one hidden. Because hidden cases feed prelude values the page never shows,
//  a hardcoded System.out.println of the visible expected output fails them. This
//  needs no Scanner, so it fits every lesson (unlike stdin, which depends on input
//  being taught in 1.4).
//
//  Content aligned to the real 2025-2026 four-unit CSA lessons. The graded code
//  items are the activity types the reporter posts: exercise-1 (the code exercise)
//  and exercise-3 (the FRQ). Each expected_stdout was verified by wrapping the
//  reference solution and running it through real javac/java.
//
//  Loaded manually by scripts/seed-code-tests.js (never on boot), same posture as
//  the quiz bank. Author content only; zero student PII. No student source is ever
//  stored. No em-dashes.
// ─────────────────────────────────────────────────────────────────────────────

// item is the graded code item, which is also its activity_type. The manifest
// points for (course, lesson, activity_type) are the denominator the ratio scales
// into: exercise-1 = 1, exercise-3 (FRQ) = 4 (see seed/csa-course-manifest.js).
const ITEMS = [
  {
    course: 'ap-csa', lesson: '1.3', item: 'exercise-1',
    // Expressions and Output: given ints a and b (b > 0), print a+b, a-b, a/b, a%b.
    cases: [
      { prelude: 'int a = 17;\nint b = 5;',   expected_stdout: '22\n12\n3\n2\n',   hidden: 0 },
      { prelude: 'int a = 9;\nint b = 3;',    expected_stdout: '12\n6\n3\n0\n',    hidden: 0 },
      { prelude: 'int a = 4;\nint b = 9;',    expected_stdout: '13\n-5\n0\n4\n',   hidden: 1 },
      { prelude: 'int a = 6;\nint b = 6;',    expected_stdout: '12\n0\n1\n0\n',    hidden: 1 },
      { prelude: 'int a = 100;\nint b = 7;',  expected_stdout: '107\n93\n14\n2\n', hidden: 1 },
    ],
  },
  {
    course: 'ap-csa', lesson: '1.5', item: 'exercise-1',
    // Casting and Range: given ints total and count (count > 0), print the integer
    // average, then the exact average as a double (cast BEFORE dividing).
    cases: [
      { prelude: 'int total = 7;\nint count = 2;',   expected_stdout: '3\n3.5\n',    hidden: 0 },
      { prelude: 'int total = 10;\nint count = 4;',  expected_stdout: '2\n2.5\n',    hidden: 0 },
      { prelude: 'int total = 9;\nint count = 3;',   expected_stdout: '3\n3.0\n',    hidden: 1 },
      { prelude: 'int total = 1;\nint count = 8;',   expected_stdout: '0\n0.125\n',  hidden: 1 },
      { prelude: 'int total = 100;\nint count = 8;', expected_stdout: '12\n12.5\n',  hidden: 1 },
    ],
  },
  {
    course: 'ap-csa', lesson: '1.6', item: 'exercise-1',
    // Compound Assignment: given int score, apply += 10, *= 3, -= 4, %= 7 in order,
    // printing score after each step.
    cases: [
      { prelude: 'int score = 5;',   expected_stdout: '15\n45\n41\n6\n',      hidden: 0 },
      { prelude: 'int score = 0;',   expected_stdout: '10\n30\n26\n5\n',      hidden: 0 },
      { prelude: 'int score = -3;',  expected_stdout: '7\n21\n17\n3\n',       hidden: 1 },
      { prelude: 'int score = 100;', expected_stdout: '110\n330\n326\n4\n',   hidden: 1 },
      { prelude: 'int score = 4;',   expected_stdout: '14\n42\n38\n3\n',      hidden: 1 },
    ],
  },
  {
    course: 'ap-csa', lesson: '1.6', item: 'exercise-3',
    // FRQ Practice (4 points): Register Receipt. Given a,b,c,d (item prices in
    // cents) and paidCents, print subtotal, cast average, tax (8% truncated),
    // dollars of change, leftover cents of change.
    cases: [
      { prelude: 'int a = 125;\nint b = 250;\nint c = 75;\nint d = 150;\nint paidCents = 1000;',  expected_stdout: '600\n150.0\n48\n3\n52\n',    hidden: 0 },
      { prelude: 'int a = 99;\nint b = 100;\nint c = 101;\nint d = 102;\nint paidCents = 500;',    expected_stdout: '402\n100.5\n32\n0\n66\n',    hidden: 0 },
      { prelude: 'int a = 250;\nint b = 250;\nint c = 250;\nint d = 250;\nint paidCents = 1080;',  expected_stdout: '1000\n250.0\n80\n0\n0\n',    hidden: 1 },
      { prelude: 'int a = 25;\nint b = 25;\nint c = 25;\nint d = 24;\nint paidCents = 200;',       expected_stdout: '99\n24.75\n7\n0\n94\n',     hidden: 1 },
      { prelude: 'int a = 0;\nint b = 0;\nint c = 0;\nint d = 0;\nint paidCents = 0;',             expected_stdout: '0\n0.0\n0\n0\n0\n',         hidden: 1 },
      { prelude: 'int a = 1000;\nint b = 2000;\nint c = 3000;\nint d = 1000;\nint paidCents = 10000;', expected_stdout: '7000\n1750.0\n560\n24\n40\n', hidden: 1 },
    ],
  },
];

module.exports = { items: ITEMS };
