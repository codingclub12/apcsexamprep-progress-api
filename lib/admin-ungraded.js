'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  UNGRADED-ACTIVITY FALLOUT REPORT
//
//  WHY
//  Cyber exercise pages report no score. The tracker still marks them complete,
//  so those rows sit in `progress` with completed = 1 and score = NULL. The
//  teacher dashboard used to render exactly that state as a hard "0 / 5",
//  inventing a failing grade and averaging it in. That has been fixed to show a
//  dash and stay out of the average, which changes what real teachers see.
//
//  This answers the two questions that matter before and after such a change:
//
//    1. How much fallout is there? How many students, classes and teachers have
//       a completed-but-ungraded activity, i.e. saw a fabricated zero.
//    2. Does anything real get disturbed? For each affected student, how many
//       activities carry a GENUINE score. Those are untouched by the fix, and a
//       teacher who has real grades alongside the phantom zeros loses nothing.
//
//  Question 2 is the reassuring one, and it is worth stating precisely: a row
//  with a score is never modified by anything here or by the dashboard change.
//  Only the rendering of score = NULL changed.
//
//  READ ONLY. This module runs SELECTs and nothing else.
//
//  Zero PII: counts, ids already used elsewhere in the admin API, and teacher
//  names as the rest of the admin surface reports them. No student names.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');

// Activities that are visits, never graded, so a null score there is normal and
// not fallout. Matches the classification used by the denominator coverage.
const VISIT_ACTS = ["'lesson'", "'visit'", "'page'", "'read'"].join(',');

// One row per affected (class, activity_type): completed, but never scored.
const AFFECTED = `
  SELECT c.id AS class_id, c.class_code, c.class_name, c.course,
         t.id AS teacher_id, t.name AS teacher_name,
         p.activity_type,
         COUNT(*)                        AS rows_affected,
         COUNT(DISTINCT p.student_id)    AS students_affected,
         COUNT(DISTINCT p.lesson)        AS lessons_affected
  FROM progress p
  JOIN classes  c ON c.id = p.class_id
  JOIN teachers t ON t.id = c.teacher_id
  WHERE p.completed = 1
    AND p.score IS NULL
    AND p.activity_type NOT IN (${VISIT_ACTS})
  GROUP BY c.id, p.activity_type
`;

// Genuine scores, per class. These are what the change does NOT touch.
const REAL_SCORES = `
  SELECT class_id, COUNT(*) AS scored_rows, COUNT(DISTINCT student_id) AS scored_students
  FROM progress
  WHERE score IS NOT NULL AND activity_type NOT IN (${VISIT_ACTS})
  GROUP BY class_id
`;

// Students who have BOTH a phantom zero and at least one real grade. For these,
// the fix removes the invented failure and leaves every real number in place,
// which is the case least likely to worry a teacher.
const MIXED = `
  SELECT COUNT(*) AS n FROM (
    SELECT student_id
    FROM progress
    WHERE activity_type NOT IN (${VISIT_ACTS})
    GROUP BY student_id
    HAVING SUM(CASE WHEN completed = 1 AND score IS NULL THEN 1 ELSE 0 END) > 0
       AND SUM(CASE WHEN score IS NOT NULL THEN 1 ELSE 0 END) > 0
  )
`;

// Affected students with NO real grade anywhere. These teachers saw a gradebook
// that was entirely fabricated, and after the fix see an empty one. Worth
// separating: it is the group whose view changes most.
const ONLY_PHANTOM = `
  SELECT COUNT(*) AS n FROM (
    SELECT student_id
    FROM progress
    WHERE activity_type NOT IN (${VISIT_ACTS})
    GROUP BY student_id
    HAVING SUM(CASE WHEN completed = 1 AND score IS NULL THEN 1 ELSE 0 END) > 0
       AND SUM(CASE WHEN score IS NOT NULL THEN 1 ELSE 0 END) = 0
  )
`;

function ungradedFallout(opts) {
  const o = opts || {};
  const rows = db.prepare(AFFECTED).all();
  const filtered = o.course ? rows.filter((r) => r.course === o.course) : rows;

  const realByClass = new Map(db.prepare(REAL_SCORES).all().map((r) => [r.class_id, r]));

  // Collapse to one entry per class, with a per-activity breakdown.
  const byClass = new Map();
  for (const r of filtered) {
    if (!byClass.has(r.class_id)) {
      const real = realByClass.get(r.class_id);
      byClass.set(r.class_id, {
        class_code: r.class_code, class_name: r.class_name, course: r.course,
        teacher_id: r.teacher_id, teacher: r.teacher_name,
        students_affected: 0, rows_affected: 0,
        by_activity: {},
        // The reassurance column: real grades in this class, untouched.
        real_scored_rows: real ? real.scored_rows : 0,
        real_scored_students: real ? real.scored_students : 0,
      });
    }
    const c = byClass.get(r.class_id);
    c.by_activity[r.activity_type] = {
      rows: r.rows_affected, students: r.students_affected, lessons: r.lessons_affected,
    };
    c.rows_affected += r.rows_affected;
    c.students_affected = Math.max(c.students_affected, r.students_affected);
  }

  const classes = [...byClass.values()].sort((a, b) => b.rows_affected - a.rows_affected);

  const byActivity = {};
  for (const r of filtered) {
    byActivity[r.activity_type] = (byActivity[r.activity_type] || 0) + r.rows_affected;
  }

  return {
    scope: o.course || 'all courses',
    summary: {
      teachers_affected: new Set(classes.map((c) => c.teacher_id)).size,
      classes_affected: classes.length,
      rows_affected: classes.reduce((a, c) => a + c.rows_affected, 0),
      by_activity: byActivity,
      // Whole-database, not scoped by course: a student roams.
      students_with_phantom_and_real_grades: db.prepare(MIXED).get().n,
      students_with_only_phantom_grades: db.prepare(ONLY_PHANTOM).get().n,
    },
    note:
      'A row with a score is never modified. Only the rendering of a completed ' +
      'activity with score = NULL changed: it used to show a fabricated 0 and ' +
      'count against the average, and now shows a dash and is excluded. Students ' +
      'counted in students_with_phantom_and_real_grades keep every real grade ' +
      'they had.',
    classes,
    generated_at: new Date().toISOString(),
  };
}

module.exports = { ungradedFallout };
