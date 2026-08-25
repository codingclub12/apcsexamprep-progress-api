'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CSA EXERCISE 2 BANKS: THE INDEX.
//
//  Applied MCQ practice, six questions per lesson, matching the established
//  cross-course exercise-2 convention (see seed/csp-exercise-2.js). One file per
//  unit, following the same shape as seed/csa-exercises/index.js so a future
//  lesson never has to change how this is required.
//
//  Units 2, 3 and 4 are COMPLETE: every lesson those units declare has a bank,
//  38 banks and 228 questions in total.
//
//  Unit 1 is not missing anything. It declares cfu rather than exercise-2 in
//  utils.js, so it has no exercise-2 column at all. course_denominators prices
//  exercise-2 for every CSA lesson including Unit 1's, but a denominator only
//  prices a column that already exists; columns come from COURSES.activities
//  and course_manifest, neither of which gives Unit 1 one.
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
  ...require('./csa-exercise-2/unit2'),
  ...require('./csa-exercise-2/unit3'),
  ...require('./csa-exercise-2/unit4'),
];

module.exports = { banks };
