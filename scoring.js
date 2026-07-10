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

const rollupAggStmt = db.prepare(`
  SELECT
    COALESCE(SUM(best_points), 0) AS earned,
    COALESCE(SUM(item_max),   0)  AS possible,
    COUNT(*)                      AS items
  FROM (
    SELECT item, MAX(points) AS best_points, MAX(max_points) AS item_max
    FROM score_events
    WHERE student_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?
    GROUP BY item
  )
`);
const rollupEventsStmt = db.prepare(`
  SELECT COUNT(*) n FROM score_events
  WHERE student_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?
`);

function rollupScore(studentId, course, unit, lesson, activity_type) {
  const agg = rollupAggStmt.get(studentId, course, unit, lesson, activity_type);
  const events = rollupEventsStmt.get(studentId, course, unit, lesson, activity_type).n;
  const pct = agg.possible > 0 ? Math.round((agg.earned / agg.possible) * 100) : 0;
  return { earned: agg.earned, possible: agg.possible, items: agg.items, events, pct };
}

module.exports = { rollupScore };
