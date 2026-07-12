'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CSA COURSE MANIFEST — per-lesson denominators for the ap-csa reporter.
//
//  One entry per shipped ap-csa-course-* lesson, giving the "possible" points
//  per activity_type so a percent is earned / possible with the denominator
//  server owned rather than reconstructed on the page. Two CSA specifics vs CSP:
//  exercise-2 (the game) has 6 rounds (possible 6, not 8), and exercise-3 (the
//  FRQ) is a new activity worth 1.
//
//  Delivered with the CSA reporter handoff, generated from the lesson configs
//  (authoritative). Loaded by scripts/seed-csa-bank.js into course_denominators.
//  Not a grade source. No em-dashes.
// ─────────────────────────────────────────────────────────────────────────────

const MANIFEST = [
  { course: 'ap-csa', unit: 'unit-2', lesson: '2-9-for-loops',
    denominators: { lesson: 1, 'exercise-1': 8, 'exercise-2': 6, 'exercise-3': 1, quiz: 6 } },
  { course: 'ap-csa', unit: 'unit-4', lesson: '4-2-traversing-arrays',
    denominators: { lesson: 1, 'exercise-1': 8, 'exercise-2': 6, 'exercise-3': 1, quiz: 6 } },
  { course: 'ap-csa', unit: 'unit-4', lesson: '4-12-traversing-2d-arrays',
    denominators: { lesson: 1, 'exercise-1': 8, 'exercise-2': 6, 'exercise-3': 1, quiz: 6 } },
  { course: 'ap-csa', unit: 'unit-4', lesson: 'array-references-aliasing',
    denominators: { lesson: 1, 'exercise-1': 8, 'exercise-2': 6, 'exercise-3': 1, quiz: 6 } },
  { course: 'ap-csa', unit: 'unit-2', lesson: '2-10-loop-algorithms',
    denominators: { lesson: 1, 'exercise-1': 8, 'exercise-2': 6, 'exercise-3': 1, quiz: 6 } },
];

module.exports = { manifest: MANIFEST };
