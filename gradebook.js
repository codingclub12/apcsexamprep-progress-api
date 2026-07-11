'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Shared attempts-based gradebook builder (manifest denominators).
//
//  One window-function pass over the attempts table for grade-of-record per
//  (student, item), assembled into per-lesson and overall aggregates against
//  course_manifest, the single denominator authority. Used by BOTH the admin
//  class gradebook and the teacher class gradebook so the two can never
//  disagree. This is the read side of the System A (attempts / course_manifest)
//  grade path; see docs/grading-systems.md.
//
//  Grade of record per (student, item): best score ratio when retry is on
//  (student retry_override beats class retry_allowed), first attempt when off.
//  passed is the stored write-time snapshot, matching the admin gradebook as it
//  stood; the read-time recompute against the current mastery_threshold is a
//  known follow-up tracked in docs/grading-systems.md. Percentages compute
//  against manifest points. Prepared statements live at module scope.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('./db');

const pctOf = (earned, possible) => (possible > 0 ? Math.round((earned / possible) * 100) : 0);

const gradedItemsStmt = db.prepare(`
  SELECT unit, lesson_id, item_id, points FROM course_manifest
  WHERE course = ? AND item_type != 'visit'
  ORDER BY unit, lesson_id, item_id
`);
const visitTotalStmt = db.prepare(
  `SELECT COUNT(*) n FROM course_manifest WHERE course = ? AND item_type = 'visit'`
);
const rosterStmt = db.prepare(`
  SELECT id, display_name, student_ref, active, last_active
  FROM students WHERE class_id = ? ORDER BY display_name
`);
// Grade of record for every (student, item) in this class+course, one pass.
const gorStmt = db.prepare(`
  SELECT student_id, course, lesson_id, item_id, item_type,
         score, max_score, passed, attempt_no, attempts
  FROM (
    SELECT a.student_id, a.course, a.lesson_id, a.item_id, a.item_type,
      a.score, a.max_score, a.passed, a.attempt_no,
      COUNT(*) OVER (PARTITION BY a.student_id, a.course, a.item_id) AS attempts,
      CASE WHEN COALESCE(s.retry_override, c.retry_allowed, 0) != 0
        THEN ROW_NUMBER() OVER (PARTITION BY a.student_id, a.course, a.item_id
               ORDER BY a.score * 1.0 / a.max_score DESC, a.attempt_no ASC)
        ELSE ROW_NUMBER() OVER (PARTITION BY a.student_id, a.course, a.item_id
               ORDER BY a.attempt_no ASC)
      END AS rn
    FROM attempts a
    JOIN students s ON s.id = a.student_id
    JOIN classes  c ON c.id = a.class_id
    WHERE a.class_id = ? AND a.course = ?
  ) WHERE rn = 1
`);
const visitStmt = db.prepare(`
  SELECT student_id, COUNT(DISTINCT lesson) n FROM progress
  WHERE class_id = ? AND course = ? AND completed = 1 AND activity_type NOT IN ('quiz', 'exam')
  GROUP BY student_id
`);

// Build the class gradebook for one course: per-lesson columns from the manifest
// (denominator authority) and per-student, per-lesson grade-of-record aggregates
// from the attempts table, in a single window pass. No per-student queries.
function classGradebook(classId, course) {
  const gradedItems = gradedItemsStmt.all(course);
  const visitTotal = visitTotalStmt.get(course).n;

  // Lesson columns from the manifest.
  const lessonCols = new Map();
  let coursePossible = 0;
  for (const item of gradedItems) {
    if (!lessonCols.has(item.lesson_id)) {
      lessonCols.set(item.lesson_id, { lesson_id: item.lesson_id, unit: item.unit, possible: 0, items: 0 });
    }
    const col = lessonCols.get(item.lesson_id);
    col.possible += item.points;
    col.items++;
    coursePossible += item.points;
  }

  const roster = rosterStmt.all(classId);
  const gorRows = gorStmt.all(classId, course);
  const visitRows = visitStmt.all(classId, course);
  const visitsByStudent = new Map(visitRows.map(v => [v.student_id, v.n]));

  const students = new Map(roster.map(s => [s.id, {
    id: s.id,
    name: s.display_name,
    ref: s.student_ref,
    active: s.active,
    last_active: s.last_active,
    visits: { visited: visitsByStudent.get(s.id) || 0, total: visitTotal },
    lessons: {},
    overall: { earned: 0, possible: coursePossible, pct: 0, items_attempted: 0, items_passed: 0 },
  }]));

  for (const g of gorRows) {
    const row = students.get(g.student_id);
    if (!row) continue; // attempt from a since-removed student
    const col = lessonCols.get(g.lesson_id);
    if (!row.lessons[g.lesson_id]) {
      row.lessons[g.lesson_id] = {
        earned: 0, possible: col ? col.possible : 0, pct: 0, items_attempted: 0, items_passed: 0,
      };
    }
    const cell = row.lessons[g.lesson_id];
    cell.earned += g.score;
    cell.items_attempted++;
    if (g.passed) cell.items_passed++;
    cell.pct = pctOf(cell.earned, cell.possible);
    row.overall.earned += g.score;
    row.overall.items_attempted++;
    if (g.passed) row.overall.items_passed++;
  }
  for (const row of students.values()) {
    row.overall.pct = pctOf(row.overall.earned, row.overall.possible);
  }

  return { course, lessons: [...lessonCols.values()], students: [...students.values()] };
}

module.exports = { classGradebook, pctOf };
