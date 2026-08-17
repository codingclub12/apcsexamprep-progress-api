'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CSP EXERCISE 2 BANKS: THE INDEX.
//
//  35 banks, one per CSP topic, six applied MCQs each. Split by Big Idea into
//  ./csp-exercise-2/ because one 200 KB literal is not reviewable in a diff.
//
//  WHY SIX QUESTIONS AND NOT EIGHT
//  Six is the size of every MCQ block already on a CSP lesson page, measured
//  across all 35 pages on 2026-08-17 and recorded in
//  scripts/seed-csp-denominators.js. Big Idea 3's exercise-1 is eight items, but
//  those are Python code problems scaffolded across difficulty levels, and their
//  eight is about the scaffold rather than about MCQ length. Matching the block
//  that already exists keeps the denominator uniform at 6 for every graded MCQ
//  activity in the course.
//
//  WHAT AN EXERCISE 2 IS FOR
//  The lesson quiz asks whether the student knows the topic. These ask whether
//  they can use it: every stem is a scenario, a trace, or a design judgement,
//  and every distractor is a specific mistake rather than filler. All four
//  rationales are written, not just the correct one, because a wrong answer that
//  explains itself is the only part of a practice set that teaches.
//
//  ORDER MATTERS: the banks appear in CED order within each Big Idea, and
//  lib/csp-course-pages.js derives the topic number (3.1, 3.2, ...) from the
//  position of each slug in the COURSES config rather than from this file. A
//  bank whose slug is not in COURSES is a build error, not a silent skip.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = [
  ...require('./csp-exercise-2/bi1'),
  ...require('./csp-exercise-2/bi2'),
  ...require('./csp-exercise-2/bi3a'),
  ...require('./csp-exercise-2/bi3b'),
  ...require('./csp-exercise-2/bi3c'),
  ...require('./csp-exercise-2/bi4'),
  ...require('./csp-exercise-2/bi5'),
];
