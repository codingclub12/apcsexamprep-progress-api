'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  COURSE STRUCTURE — the shape the teacher dashboard and CSV export iterate to
//  build their columns and completion denominators.
//
//  course_manifest is the denominator authority (per CLAUDE.md). When a course
//  has activity-granularity rows (activity_type set, i.e. cyber today), this
//  returns a COURSES-shaped structure built FROM the manifest, so adding a lesson
//  or activity is a manifest row, not a code change, and every view divides by
//  the same source. When a course has no such rows (ap-csa / ap-csp, whose
//  manifest is the lesson-visit + graded model the attempts path uses), it falls
//  back to the static COURSES config so those dashboards are unchanged.
//
//  Unit labels are display-only and always taken from COURSES; they are not a
//  denominator, so they never come from the manifest.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');
const { COURSES } = require('../utils');

// Canonical activity order for the columns, matching the COURSES config.
const ACT_ORDER = ['lesson', 'exercise-1', 'exercise-2', 'quiz'];

const activityRowsStmt = db.prepare(`
  SELECT unit, lesson_id, activity_type FROM course_manifest
  WHERE course = ? AND activity_type IS NOT NULL
  ORDER BY unit, lesson_id
`);

// Returns { source: 'manifest' | 'config', label, units: { unitKey: { label,
// lessons: [...], activities: [...], case_file?, exam? } } }, or null for an
// unknown course. The shape matches COURSES[course] so callers use it as a
// drop-in for course_config.
function courseStructure(course) {
  const rows = activityRowsStmt.all(course);
  const cfg = COURSES[course] || null;

  if (!rows.length) {
    return cfg ? { source: 'config', label: cfg.label, units: cfg.units } : null;
  }

  const acc = {}; // unit -> { lessons:[], lessonSet:Set, actSet:Set, hasCase, hasExam }
  for (const r of rows) {
    if (!acc[r.unit]) acc[r.unit] = { lessons: [], lessonSet: new Set(), actSet: new Set(), hasCase: false, hasExam: false };
    const u = acc[r.unit];
    if (r.activity_type === 'case-file') { u.hasCase = true; continue; }
    if (r.activity_type === 'exam') { u.hasExam = true; continue; }
    if (!u.lessonSet.has(r.lesson_id)) { u.lessonSet.add(r.lesson_id); u.lessons.push(r.lesson_id); }
    u.actSet.add(r.activity_type);
  }

  const units = {};
  for (const [uk, u] of Object.entries(acc)) {
    const ucfg = (cfg && cfg.units[uk]) || {};
    const known = ACT_ORDER.filter((a) => u.actSet.has(a));
    const extra = [...u.actSet].filter((a) => !ACT_ORDER.includes(a)).sort();
    const unitOut = { label: ucfg.label || uk, lessons: u.lessons, activities: known.concat(extra) };
    if (u.hasCase) unitOut.case_file = ucfg.case_file || { lesson: 'case-file', label: 'Case File' };
    if (u.hasExam) unitOut.exam = ucfg.exam || { lesson: 'exam', label: 'Unit Exam' };
    units[uk] = unitOut;
  }

  return { source: 'manifest', label: (cfg && cfg.label) || course, units };
}

module.exports = { courseStructure };
