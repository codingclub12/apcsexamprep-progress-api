'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SHARED SCORE ROLLUP — the single source of truth for how a set of graded
//  score_events becomes a 0-100 percentage on progress.score.
//
//  Extracted so POST /api/student/score (routes/student.js) and the Phase 2
//  server-side quiz scorer (routes/quiz.js) roll up identically. Two copies of
//  this SQL would be two ways for the same student's score to disagree between
//  dashboards, so there is exactly one.
//
//  Semantics: best `points` per DISTINCT `item`, summed, divided by summed best
//  `max_points`, rounded to 0-100. Re-answering an item keeps the best result
//  (never averages a right answer back down); different items in the same
//  activity accumulate. Idempotent: recomputed from the append-only ledger on
//  every write, so progress.score is always exactly consistent with score_events.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('./db');

// RESERVED ITEM NAME. POST /api/student/progress records a WHOLE-ACTIVITY
// percentage (0-100), not one graded item inside an activity, and it rides this
// same append-only ledger under this reserved `item`. Two things follow.
//
//  1. It is how a lesson-score submission is told apart from a /api/student/score
//     write when reading the ledger, without a schema change.
//  2. It must be INVISIBLE to this rollup. Folding "83 out of 100" in beside a
//     real item ("5 out of 7") would produce 88 out of 107, a number matching
//     nothing a student did. The two writers own the same progress.score cell by
//     different arithmetic, so each computes its own value from its own rows and
//     neither reads the other's. Excluding it here is what keeps the /score and
//     /quiz paths behaving on deploy exactly as they did before.
const LESSON_SCORE_ITEM = 'lesson-score';

const rollupAggStmt = db.prepare(`
  SELECT
    COALESCE(SUM(best_points), 0) AS earned,
    COALESCE(SUM(item_max),   0)  AS possible,
    COUNT(*)                      AS items
  FROM (
    SELECT item, MAX(points) AS best_points, MAX(max_points) AS item_max
    FROM score_events
    WHERE student_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?
      AND item <> '${LESSON_SCORE_ITEM}'
    GROUP BY item
  )
`);
const rollupEventsStmt = db.prepare(`
  SELECT COUNT(*) n FROM score_events
  WHERE student_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?
    AND item <> '${LESSON_SCORE_ITEM}'
`);

function rollupScore(studentId, course, unit, lesson, activity_type) {
  const agg = rollupAggStmt.get(studentId, course, unit, lesson, activity_type);
  const events = rollupEventsStmt.get(studentId, course, unit, lesson, activity_type).n;
  const pct = agg.possible > 0 ? Math.round((agg.earned / agg.possible) * 100) : 0;
  return { earned: agg.earned, possible: agg.possible, items: agg.items, events, pct };
}

module.exports = { rollupScore, LESSON_SCORE_ITEM };
