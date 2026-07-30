'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ATTEMPT ROLLUP - System A (attempts + course_manifest) folded into the
//  per-(lesson, activity) cell shape the teacher dashboard and CSV read.
//
//  Why this exists: grades posted through POST /api/progress/attempt land in
//  the attempts table, which the teacher surfaces never read. A CSA or AP
//  Networking student could finish every CFU and quiz and the teacher saw
//  blanks (docs/grading-systems.md, "the disconnect"). This module is option 2
//  from that doc: the same grade-of-record window pass the admin gradebook
//  runs, aggregated per (student, lesson, activity) and denominated by
//  course_manifest points, so teacher and admin can never disagree.
//
//  TRUE POINT SCORING. Every manifest item carries its own point weight (a
//  CFU is 1, a code problem can be 2, a 12-question quiz is 12, an FRQ is 4).
//  Cells report points_earned / points_possible where points_possible is the
//  SUM OF ALL manifest points for that lesson + activity, attempted or not,
//  so a student who aced 2 of 8 CFUs reads 2/8, not 2/2.
//
//  The activity key for a cell is the manifest item_type (cfu, quiz,
//  exercise-1, exercise-2, exercise-3), which matches the COURSES activities
//  vocabulary so cells line up with existing dashboard columns.
//
//  Courses with no graded manifest rows (cyber, CSP today) return null and
//  cost one indexed query. No per-student queries anywhere.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');
const { GOR_FOR_CLASS } = require('./admin-gradebook');

// ── PREPARED STATEMENTS (module scope, reused) ────────────────────────────────
const manifestGradedStmt = db.prepare(`
  SELECT unit, lesson_id, item_id, item_type, points
  FROM course_manifest WHERE course = ? AND item_type != 'visit'
`);
const gorStmt = db.prepare(GOR_FOR_CLASS);

function round2(n) { return Math.round(n * 100) / 100; }

// Returns null when the course has no graded manifest items (not on System A).
// Otherwise:
//   cells:    Map `${student_id}|${lesson}|${activity}` -> {
//               earned, possible, items_attempted, items_total, tries, pct,
//               completed  (every manifest item of the cell attempted)
//             }
//   possible: Map `${lesson}|${activity}` -> summed manifest points (the
//             authored column denominator)
//   unitOf:   Map lesson -> unit (from the manifest)
function attemptRollup(classId, course) {
  const manifest = manifestGradedStmt.all(course);
  if (!manifest.length) return null;

  const itemPoints = new Map();   // item_id -> points
  const unitOf = new Map();       // lesson  -> unit
  const possible = new Map();     // lesson|activity -> { possible, items }
  for (const m of manifest) {
    itemPoints.set(m.item_id, m.points);
    if (!unitOf.has(m.lesson_id)) unitOf.set(m.lesson_id, m.unit);
    const key = `${m.lesson_id}|${m.item_type}`;
    const p = possible.get(key) || { possible: 0, items: 0 };
    p.possible += m.points;
    p.items += 1;
    possible.set(key, p);
  }

  const cells = new Map();
  for (const g of gorStmt.all(classId, course)) {
    // Unknown item (manifest row removed after the write): fall back to the
    // recorded max_score so real student work is never hidden.
    const key = `${g.student_id}|${g.lesson_id}|${g.item_type}`;
    const cell = cells.get(key) || { earned: 0, extraPossible: 0, items_attempted: 0, tries: 0 };
    cell.earned += g.score;
    if (!itemPoints.has(g.item_id)) cell.extraPossible += g.max_score;
    cell.items_attempted += 1;
    cell.tries += g.tries;
    cells.set(key, cell);
  }

  for (const [key, cell] of cells) {
    const [, lesson, activity] = key.split('|');
    const authored = possible.get(`${lesson}|${activity}`) || { possible: 0, items: 0 };
    cell.possible = round2(authored.possible + cell.extraPossible);
    cell.items_total = authored.items || cell.items_attempted;
    cell.earned = round2(cell.earned);
    cell.pct = cell.possible > 0 ? Math.round((cell.earned / cell.possible) * 100) : null;
    cell.completed = cell.items_attempted >= cell.items_total;
    delete cell.extraPossible;
  }

  return { cells, possible, unitOf };
}

module.exports = { attemptRollup };
