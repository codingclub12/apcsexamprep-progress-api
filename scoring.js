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
//  Semantics: one `points` per DISTINCT `item`, summed, divided by summed
//  `max_points`, rounded to 0-100. Different items in the same activity always
//  accumulate. WHICH attempt at an item counts is the class retry policy:
//
//    retries allowed for this activity  -> BEST points per item (ties to the
//                                          earliest, which is also the historic
//                                          and still the default behavior)
//    retries not allowed                -> FIRST attempt per item
//
//  "Allowed for this activity" is retry-policy.js: the student's retry_override
//  if set, else the class's three-mode retry_mode against the activity type.
//  Before this, the rollup ALWAYS took the max, so practice work was best-of-many
//  for every class regardless of what the teacher had chosen; the setting simply
//  did not reach this code. The deploy-day migration maps retry_allowed = 0 to
//  mode 'practice', which keeps practice best-of-many, so nothing moves until a
//  teacher picks 'none'.
//
//  Idempotent: recomputed from the append-only ledger on every write, and the
//  policy is read fresh each time, so progress.score is always exactly consistent
//  with score_events AND with the teacher's CURRENT setting. Flipping the mode is
//  retroactive on the next write with no data rewrite.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('./db');
const { resolveMode, retryAllowedFor } = require('./retry-policy');

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

// FIRST attempt per item, for an activity the student may not retry. Same shape
// as rollupAggStmt so the two are interchangeable; only the row picked per item
// differs. created_at then rowid, because two submissions inside the same second
// still have a definite order.
const rollupFirstAggStmt = db.prepare(`
  SELECT
    COALESCE(SUM(points),     0) AS earned,
    COALESCE(SUM(max_points), 0) AS possible,
    COUNT(*)                     AS items
  FROM (
    SELECT points, max_points,
      ROW_NUMBER() OVER (PARTITION BY item ORDER BY created_at ASC, rowid ASC) AS rn
    FROM score_events
    WHERE student_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?
      AND item <> '${LESSON_SCORE_ITEM}'
  ) WHERE rn = 1
`);

// One row, one lookup: the class policy plus the student's personal override.
const rollupPolicyStmt = db.prepare(`
  SELECT c.retry_mode, c.retry_allowed, s.retry_override
  FROM students s LEFT JOIN classes c ON c.id = s.class_id
  WHERE s.id = ?
`);

// Whether the best attempt counts for this student on this activity type.
// Exported so callers can report the policy they were graded under without
// re-deriving it (and getting it subtly different).
function retryOnFor(studentId, activity_type) {
  const row = rollupPolicyStmt.get(studentId);
  if (!row) return true; // unknown student: never withhold credit on our confusion
  return retryAllowedFor(resolveMode(row), activity_type, row.retry_override);
}

function rollupScore(studentId, course, unit, lesson, activity_type) {
  const retryOn = retryOnFor(studentId, activity_type);
  const agg = (retryOn ? rollupAggStmt : rollupFirstAggStmt)
    .get(studentId, course, unit, lesson, activity_type);
  const events = rollupEventsStmt.get(studentId, course, unit, lesson, activity_type).n;
  const pct = agg.possible > 0 ? Math.round((agg.earned / agg.possible) * 100) : 0;
  return { earned: agg.earned, possible: agg.possible, items: agg.items, events, pct,
           retry_allowed: retryOn };
}

module.exports = { rollupScore, retryOnFor, LESSON_SCORE_ITEM };
