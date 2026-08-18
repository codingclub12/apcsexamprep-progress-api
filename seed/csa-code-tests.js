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
// ── WHAT MOVED, AND WHY ──────────────────────────────────────────────────────
// The exercise-1 items for 1.3, 1.5 and 1.6 used to live here as bare segments.
// They were authored for `-exercise-1` pages that were never built, so no page
// ever posted to them. When the 53 exercise pages were built, those three
// lessons got real exercises in `program` mode (the student writes the whole
// program and reads its input), which is a strictly better fit for lessons about
// output, casting and compound assignment, and they now live with the other 50
// in seed/csa-exercises/unit1.js. Their tasks carried over; only the shape
// changed.
//
// They are not duplicated here, deliberately: code_test_cases is keyed
// (course, lesson, item, seq), so two definitions of ap-csa 1.3 exercise-1 would
// race, and whichever lost would grade a page assembled the other way. The
// seeder deletes any leftover rows past the seeded case count for exactly this
// reason, so an --update run cannot leave one item holding cases from both.
//
// 1.6 exercise-3 (the FRQ) is a DIFFERENT item and is untouched. It keeps its
// bare-segment shape, which is what the AP free-response question actually is.
const ITEMS = [
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
