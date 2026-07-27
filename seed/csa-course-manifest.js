'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CSA COURSE MANIFEST — per-lesson denominators for the ap-csa reporter.
//
//  One entry per ap-csa lesson (all 53, 2025-2026 four-unit CED: 15 / 12 / 9 / 17
//  across Units 1-4), giving the "possible" points per activity_type. The manifest
//  is the denominator authority: a percent is earned / possible with the
//  denominator server owned rather than reconstructed on the page, and the code
//  grader (POST /api/student/code-grade) reads the same possible to scale a
//  cases-passed ratio into item points. All 53 lessons are seeded now even though
//  content ships unit by unit, because changing a denominator later retroactively
//  moves every student's percentage.
//
//  Per lesson: lesson (visit) 1, exercise-1 1, exercise-2 6, exercise-3 4, quiz 6.
//  These point values match the authored content weighting (a code exercise is
//  worth 1, the FRQ exercise-3 is worth 4). exercise-3 is the free-response item;
//  it is its own activity_type, not folded into exercise-1. Lesson ids and unit
//  keys match utils.js COURSES and pageFromHandle exactly (unit 'unit-N', lesson
//  'U.L'), so course_denominators keys line up with the (course, unit, lesson) the
//  reporter and the grade routes send.
//
//  Loaded by scripts/seed-csa-bank.js into course_denominators. Not a grade source.
//  No em-dashes.
// ─────────────────────────────────────────────────────────────────────────────
const { COURSES } = require('../utils');

// Per-lesson possible points by activity_type, aligned to the authored content:
// exercise-1 (code exercise) 1, exercise-2 (game, 6 rounds) 6, exercise-3 (FRQ) 4,
// quiz 6. The code grader scales cases-passed / total into these points.
const DENOMINATORS = { lesson: 1, 'exercise-1': 1, 'exercise-2': 6, 'exercise-3': 4, quiz: 6 };

// Generated from the COURSES config so the manifest can never drift from the
// 53-lesson, four-unit structure defined there.
const MANIFEST = [];
for (const [unit, cfg] of Object.entries(COURSES['ap-csa'].units)) {
  for (const lesson of cfg.lessons) {
    MANIFEST.push({ course: 'ap-csa', unit, lesson, denominators: { ...DENOMINATORS } });
  }
}

module.exports = { manifest: MANIFEST };
