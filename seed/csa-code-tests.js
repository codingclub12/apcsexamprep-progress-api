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
  // Empty, and deliberately kept as a live module rather than deleted.
  //
  // 1.6 exercise-3 (the FRQ) was the last item here. It moved to seed/csa-frq/
  // on 2026-08-24 when the FRQ bank and its page builder were created, for the
  // same reason the exercise-1 items for 1.3, 1.5 and 1.6 moved out before it:
  // code_test_cases is keyed (course, lesson, item, seq), so two definitions of
  // ap-csa 1.6 exercise-3 would race, and whichever lost would grade a page
  // assembled the other way.
  //
  // The move was verified rather than assumed. seed/csa-frq generates its
  // expected outputs by running the reference through real javac/java, and all
  // six generated cases reproduce the hand-written expectations that used to
  // live here, byte for byte. That parity check is what made it safe to delete
  // them; without it this would have been a rewrite wearing a migration's
  // clothes.
  //
  // The file stays because scripts/seed-code-tests.js requires it by name and
  // because a bare-segment item authored without a page is still a shape this
  // bank is the right home for.
];

module.exports = { items: ITEMS };
