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

// THE SECOND RESERVED ITEM NAME, and it is reserved for the same reason.
//
// assets/apcs-score-reporter.js does not post a score itself. It scrapes the
// number the page displays and hands the pair to window.APCS_saveLessonScore in
// apcs-tracker.js, which posts it under this item. So a row named 'score' is a
// pair for the WHOLE ACTIVITY, exactly like a lesson-score row, and unlike
// 'redflags' or 'q3' it is not one graded item inside the activity.
//
// WHY IT CANNOT SIMPLY BE EXCLUDED THE WAY 'lesson-score' IS
// On most pages it is the ONLY writer, and there it is the grade. AP Cyber 1.1
// Exercise 2 records 12 out of 15 through this item and nothing else. Excluding
// it would delete that grade.
//
// So the rule is narrower: a page that reports for ITSELF has already said what
// the run was worth, and the scraped carrier is the same run counted a second
// time. When named items exist, they win and the carrier is dropped; when the
// carrier is alone, it is the grade.
//
// THE MEASURED CASE, 2026-09-07, reported by a teacher rather than by a check.
// ap-cyber-unit-1-lesson-1-exercise-1 carries both writers: the page body posts
// item 'redflags' out of FLAGS.length, and the reporter scrapes #finalScore
// ("7 out of 7 red flags found") and posts item 'score'. Summing them gave a
// gradebook cell of 14 out of 14 under a column header of /7. The percentage
// survived, because both halves doubled, but the points did not: that column
// contributed 14 of a student's 29 graded points, so one exercise weighed twice
// what the teacher priced it at.
const REPORTER_TOTAL_ITEM = 'score';

// The rule as SQL, in two fragments, so the readers that sum this ledger cannot
// drift into separate opinions about it. gradebook-contract.js (what every view
// reads), this file (what progress.score is written from),
// admin-denominators.js (what the re-pricing proposal is derived from) and
// health-integrity.js (what /api/health reports about a column's price) all use
// these. The third matters most: POST /api/admin/denominators/adopt AUTHORS
// from those numbers, so an unfixed observed maximum of 14 could have been
// written into course_denominators as the official total for a 7 point
// exercise. That is the same trap the LESSON_SCORE_ITEM exclusion above was
// added to close.

/** 1 when this activity carries a page-named item beside the scraped carrier. */
function namedItemFlagSql(itemExpr, partitionBy) {
  const over = partitionBy ? `PARTITION BY ${partitionBy}` : '';
  return `MAX(CASE WHEN ${itemExpr} <> '${REPORTER_TOTAL_ITEM}' THEN 1 ELSE 0 END) OVER (${over})`;
}

/** Keep every named item, and the carrier only when it is the sole reporter. */
function keepItemSql(itemExpr, flagCol) {
  return `(${itemExpr} <> '${REPORTER_TOTAL_ITEM}' OR ${flagCol} = 0)`;
}

const rollupAggStmt = db.prepare(`
  SELECT
    COALESCE(SUM(best_points), 0) AS earned,
    COALESCE(SUM(item_max),   0)  AS possible,
    COUNT(*)                      AS items
  FROM (
    SELECT item, MAX(points) AS best_points, MAX(max_points) AS item_max,
      ${namedItemFlagSql('item', '')} AS has_named
    FROM score_events
    WHERE student_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?
      AND item <> '${LESSON_SCORE_ITEM}'
    GROUP BY item
  ) WHERE ${keepItemSql('item', 'has_named')}
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
    SELECT item, points, max_points,
      ROW_NUMBER() OVER (PARTITION BY item ORDER BY created_at ASC, rowid ASC) AS rn,
      ${namedItemFlagSql('item', '')} AS has_named
    FROM score_events
    WHERE student_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?
      AND item <> '${LESSON_SCORE_ITEM}'
  ) WHERE rn = 1 AND ${keepItemSql('item', 'has_named')}
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

module.exports = { rollupScore, retryOnFor, LESSON_SCORE_ITEM,
  REPORTER_TOTAL_ITEM, namedItemFlagSql, keepItemSql };
