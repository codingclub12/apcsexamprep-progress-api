'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CSA EXERCISE 2 BANKS: THE INDEX.
//
//  Applied MCQ practice, six questions per lesson, matching the established
//  cross-course exercise-2 convention (see seed/csp-exercise-2.js). One file per
//  unit, following the same shape as seed/csa-exercises/index.js so a future
//  lesson never has to change how this is required.
//
//  Only seed/csa-exercise-2/unit4.js exists so far, covering the six lessons
//  whose exercise-1 was just recontented to match the real CED (see the header
//  of seed/csa-exercises/unit4.js). Units 1-3 and the rest of Unit 4 are
//  unfilled, same posture the exercise-1 build itself took: content ships
//  incrementally, and course_denominators already carries exercise-2 for every
//  CSA lesson regardless of whether a bank exists yet.
//
//  NOT YET CONSUMED BY A PAGE RENDERER. lib/csa-exercise-pages.js and
//  scripts/csa-exercise-pages-csv.js build the exercise-1 pages; an equivalent
//  exercise-2 renderer and CSV export (mirroring lib/csp-course-pages.js and
//  scripts/csp-game-pages-csv.js) has not been built yet. This file exists so
//  that work has content to render the moment it starts.
//
//  Pure ASCII, no em-dashes. Zero PII: author content only.
// ─────────────────────────────────────────────────────────────────────────────

const banks = [
  ...require('./csa-exercise-2/unit4'),
];

module.exports = { banks };
