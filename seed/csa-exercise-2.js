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
//  RENDERED BY lib/csa-exercise-2-pages.js, exported to Matrixify by
//  scripts/csa-exercise-2-pages-csv.js (npm run csax2 -- out.csv), and checked
//  by smoke/csa-exercise-2-pages.js (npm run smoke:csax2pages). Importing the
//  sheet into Shopify is a separate pipeline, same division of labor as
//  exercise-1's own CSV.
//
//  Pure ASCII, no em-dashes. Zero PII: author content only.
// ─────────────────────────────────────────────────────────────────────────────

const banks = [
  ...require('./csa-exercise-2/unit4'),
];

module.exports = { banks };
