'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  EXPORT CELL FORMAT - one formatter for every teacher CSV export path.
//
//  A gradebook cell reaches an export in four different shapes, because two
//  grading systems and a completion flag all feed the same grid:
//
//    System A (attempts + course_manifest)  ->  a points string, "8/10"
//    System B (progress.score)              ->  a percent number, 88
//    completed, never scored                ->  "Done"
//    never touched                          ->  blank
//
//  A human reading the wide CSV wants all four. Canvas accepts exactly two:
//  a number and a blank. Import a "Done" or an "8/10" and Canvas rejects the
//  row, so a Canvas export has to collapse the four shapes into two WITHOUT
//  inventing anything.
//
//  THE RULE THAT MATTERS: blank means ungraded. A completed-but-unscored
//  activity is NOT a zero, and never becomes one here. Writing 0 for it would
//  import a fabricated failure into a teacher's real gradebook, which is the
//  same phantom-zero bug the ungraded-fallout suite exists to keep dead.
//
//  Percentages are clamped to 0-100. The Canvas assignment is authored as 100
//  points, so a cell above 100 would silently award extra credit and a negative
//  one is not a grade at all.
// ─────────────────────────────────────────────────────────────────────────────

// What Canvas accepts in a grade cell: a plain number or nothing. Exported so
// the smoke suite asserts against the same expression the formatter targets.
const CANVAS_CELL_RE = /^$|^\d+(\.\d{1,2})?$/;

// Canvas assignment header prefix per course, so a column cannot collide with
// an assignment already sitting in the teacher's Canvas course.
const CANVAS_COURSE_LABELS = {
  'ap-cybersecurity': 'Cyber',
  'ap-csa': 'AP CSA',
  'ap-csp': 'AP CSP',
  'ap-networking': 'AP Networking',
};

// Each unit exports as one Canvas assignment out of 100 points.
const UNIT_POINTS = 100;

function round2(n) { return Math.round(n * 100) / 100; }

function clampPct(n) { return round2(Math.min(100, Math.max(0, n))); }

function shortUnit(k) { return String(k).replace(/^unit-/, 'Unit ').replace(/^bi-/, 'BI '); }

// A System A cell carries its true points ("8/10"). Returns null for anything
// that is not a fraction, so a future cell shape degrades to "no score" rather
// than to a wrong number.
function parsePoints(v) {
  const m = /^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/.exec(String(v).trim());
  if (!m) return null;
  const earned = Number(m[1]), possible = Number(m[2]);
  if (!Number.isFinite(earned) || !Number.isFinite(possible)) return null;
  return { earned, possible };
}

const EMPTY_CELL = { kind: 'empty', pct: null, earned: null, possible: null };
const DONE_CELL  = { kind: 'done',  pct: null, earned: null, possible: null };

// Normalize one merged gradebook record into { kind, pct, earned, possible }.
//   kind 'score' -> a real grade exists; pct is 0-100
//   kind 'done'  -> completed, no score was ever recorded (NOT a zero)
//   kind 'empty' -> nothing happened here
// A System B percent is modelled as earned/100 so it can be summed alongside
// System A points when a unit is rolled up.
function normalizeCell(rec) {
  if (!rec) return EMPTY_CELL;

  if (rec.points != null) {
    const p = parsePoints(rec.points);
    // Out of zero points there is no percentage to report. Fall through to the
    // completion state rather than emitting a made up 0 or 100.
    if (p && p.possible > 0) {
      return { kind: 'score', pct: clampPct((p.earned / p.possible) * 100), earned: p.earned, possible: p.possible };
    }
    return rec.completed ? DONE_CELL : EMPTY_CELL;
  }

  if (rec.score != null && rec.score !== '') {
    const n = Number(rec.score);
    if (Number.isFinite(n)) {
      const pct = clampPct(n);
      return { kind: 'score', pct, earned: pct, possible: 100 };
    }
  }

  return rec.completed ? DONE_CELL : EMPTY_CELL;
}

// The single cell formatter.
//   mode 'human'  -> today's wide export, byte for byte unchanged
//   mode 'canvas' -> a number or a blank, never anything else
function formatCell(rec, mode) {
  if (mode === 'canvas') {
    const c = normalizeCell(rec);
    return c.kind === 'score' ? String(c.pct) : '';
  }
  if (!rec) return '';
  if (rec.points != null) return String(rec.points);
  if (rec.score != null) return String(rec.score);
  return rec.completed ? 'Done' : '';
}

// Roll normalized cells up into one 0-100 unit grade.
//
// Weighted by points, not a flat average of percentages: a 12 point quiz has to
// outweigh a 1 point CFU, and a System B percent weighs 100 because that is the
// only denominator it has. Only cells with a real grade contribute, so a unit a
// student has not reached exports blank rather than as a zero, and a unit where
// every graded item was attempted reads the same as the dashboard.
function unitGrade(cells) {
  let earned = 0, possible = 0, graded = 0;
  for (const c of cells) {
    if (c.kind !== 'score' || !(c.possible > 0)) continue;
    earned += c.earned;
    possible += c.possible;
    graded++;
  }
  if (!graded || possible <= 0) return null;
  return clampPct((earned / possible) * 100);
}

// ── Canvas identity bridge ────────────────────────────────────────────────────
//  There is no email on a student row and there never will be: the zero PII
//  posture is the product, not an omission. So Canvas matching rides on
//  student_ref, which the teacher sets to whichever identifier their Canvas
//  already knows. student_ref is free text and unvalidated, so anything that
//  would corrupt the CSV or silently mis-match is emitted as a blank instead.
//
//  Canvas carries three distinct identifier columns and will match on whichever
//  one is populated. Emitting all three, blank where unknown, is what CodeHS
//  does in its shipping Canvas export, and it is what lets a district avoid
//  putting a student email in this database at all:
//
//    ID            Canvas's own user ID. Always blank here: it exists only
//                  inside Canvas and we never synthesize one.
//    SIS User ID   the student number. Where a district has one, this is the
//                  column to use, and nothing resembling PII gets stored.
//    SIS Login ID  the username, which for a Google district is the email.
//
//  A ref is routed by shape rather than by a per-class setting, so a teacher
//  pastes what Canvas shows them and the column takes care of itself.

const REF_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REF_PLAIN = /^[A-Za-z0-9._-]+$/;

function canvasSisLoginId(ref) {
  const v = typeof ref === 'string' ? ref.trim() : '';
  if (!v || v.length > 128) return '';
  if (/[,\n\r]/.test(v)) return '';
  return (REF_EMAIL.test(v) || REF_PLAIN.test(v)) ? v : '';
}

// Split one validated ref into the Canvas identity columns [ID, SIS User ID,
// SIS Login ID]. An email is a login; anything else is treated as a student
// number. All three blank means Canvas cannot match this student at all.
function canvasIdentityColumns(ref) {
  const v = canvasSisLoginId(ref);
  if (!v) return ['', '', ''];
  return REF_EMAIL.test(v) ? ['', '', v] : ['', v, ''];
}

// Canvas lists students as "Last, First". Two tokens is the only shape that
// parses unambiguously; anything else (one token, a middle name, a suffix) is
// emitted verbatim rather than reordered into a wrong name.
function canvasStudentName(displayName) {
  const name = String(displayName == null ? '' : displayName).trim();
  const parts = name.split(/\s+/).filter(Boolean);
  return parts.length === 2 ? `${parts[1]}, ${parts[0]}` : name;
}

// ── Canvas unit export ────────────────────────────────────────────────────────
//  scope=unit: one assignment per unit, five columns for Cyber instead of the
//  ~55 the wide export emits. No teacher wants 55 Canvas assignments.
//
//  cellFor(studentId, unitId, lesson, activity) -> the merged gradebook record,
//  so this stays ignorant of how the caller keyed its map.
//
//  Returns the three CSV row groups plus the preflight counts, which are the
//  same numbers by construction: the warning a teacher sees before downloading
//  cannot disagree with the file they get.
function buildCanvasUnitExport({ course, courseConfig, className, students, cellFor }) {
  const coursePrefix = CANVAS_COURSE_LABELS[course] || (courseConfig && courseConfig.label) || course;
  const unitIds = Object.keys(courseConfig.units);

  const headers = ['Student', 'ID', 'SIS User ID', 'SIS Login ID', 'Section']
    .concat(unitIds.map((u) => `${coursePrefix} ${shortUnit(u)}`));
  const pointsRow = ['Points Possible', '', '', '', ''].concat(unitIds.map(() => String(UNIT_POINTS)));

  const rows = [];
  const unmatchable = [];
  let matchable = 0;

  for (const s of students) {
    const identity = canvasIdentityColumns(s.student_ref);
    if (identity.some(Boolean)) matchable++; else unmatchable.push(s.display_name);

    const grades = unitIds.map((unitId) => {
      const u = courseConfig.units[unitId];
      const cells = [];
      for (const lesson of u.lessons) {
        for (const act of u.activities) cells.push(normalizeCell(cellFor(s.id, unitId, lesson, act)));
      }
      if (u.case_file) cells.push(normalizeCell(cellFor(s.id, unitId, u.case_file.lesson, 'case-file')));
      if (u.exam) cells.push(normalizeCell(cellFor(s.id, unitId, u.exam.lesson, 'exam')));
      const pct = unitGrade(cells);
      return pct == null ? '' : String(pct);
    });

    rows.push([canvasStudentName(s.display_name)].concat(identity, [className || ''], grades));
  }

  return {
    headers,
    pointsRow,
    rows,
    // Bounded by the class roster, which is a few dozen names.
    preflight: { students: students.length, matchable, unmatchable },
  };
}

module.exports = {
  CANVAS_CELL_RE, CANVAS_COURSE_LABELS, UNIT_POINTS,
  normalizeCell, formatCell, unitGrade, shortUnit,
  canvasSisLoginId, canvasIdentityColumns, canvasStudentName, buildCanvasUnitExport,
};
