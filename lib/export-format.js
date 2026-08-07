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

// ── What the dashboard is currently showing ───────────────────────────────────
//  The dashboard has four include toggles (lesson checks, exercises, quizzes,
//  unit tests) and a unit selection. An export that ignores them hands a teacher
//  a different gradebook from the one on their screen, so both are honoured.
//
//  A case file has no toggle and always counts, which is exactly what the
//  dashboard's own counts() does by falling through to true. Mirroring that here
//  is the whole point: two answers to "does this count" is a bug waiting.
const ACTIVITY_BUCKETS = {
  lesson: 'lesson',
  'exercise-1': 'exercise',
  'exercise-2': 'exercise',
  'exercise-3': 'exercise',
  quiz: 'quiz',
  exam: 'exam',
};
const INCLUDE_BUCKETS = ['lesson', 'exercise', 'quiz', 'exam'];

function activityIncluded(include, activity) {
  const bucket = ACTIVITY_BUCKETS[activity];
  if (!bucket) return true;              // case-file and anything unmapped
  if (!include) return true;             // no filter given: everything counts
  return include[bucket] !== false;
}

// Unit ids the export should cover. null or empty means the whole course, which
// keeps every existing caller on today's behaviour.
function selectedUnitIds(courseConfig, units) {
  const all = Object.keys(courseConfig.units);
  if (!units || !units.length) return all;
  const wanted = new Set(units);
  return all.filter((u) => wanted.has(u));
}

// ── Canvas activity columns ───────────────────────────────────────────────────
//  scope=activity: one Canvas assignment per graded activity, so a case file or
//  a unit exam lands in its own Canvas column instead of being folded into a
//  unit average. Roughly 55 columns for Cyber.
//
//  Every name is prefixed with the course and carries its lesson or unit, for
//  two reasons. A Canvas assignment name is global to the course, so a bare
//  "Case File" would collide across all five units, and a bare "1.1 Quiz" could
//  collide with something the teacher already has.
const ACTIVITY_LABELS = {
  lesson: 'Lesson',
  'exercise-1': 'Exercise 1',
  'exercise-2': 'Exercise 2',
  'exercise-3': 'Exercise 3',
  quiz: 'Quiz',
  lab: 'Lab',
  code: 'Code',
};

// Canvas silently refuses to recognize an assignment whose name contains any of
// these, because they collide with its own computed columns.
const CANVAS_RESERVED = /current (score|points|grade)|final (score|points|grade)|override (score|grade|status)/i;

function canvasActivityColumns(course, courseConfig, filter) {
  const prefix = CANVAS_COURSE_LABELS[course] || (courseConfig && courseConfig.label) || course;
  const seen = new Map();
  // Two activities that would produce one Canvas column are a silent grade
  // overwrite, so a duplicate is numbered rather than allowed to merge.
  const unique = (name) => {
    const n = CANVAS_RESERVED.test(name) ? `${name} (unit)` : name;
    const hit = (seen.get(n) || 0) + 1;
    seen.set(n, hit);
    return hit === 1 ? n : `${n} (${hit})`;
  };

  const include = filter && filter.include;
  const cols = [];
  for (const unitId of selectedUnitIds(courseConfig, filter && filter.units)) {
    const u = courseConfig.units[unitId];
    for (const lesson of u.lessons) {
      for (const act of u.activities) {
        if (!activityIncluded(include, act)) continue;
        cols.push({
          unit: unitId, lesson, activity: act,
          header: unique(`${prefix} ${lesson} ${ACTIVITY_LABELS[act] || act}`),
        });
      }
    }
    if (u.case_file) {
      cols.push({
        unit: unitId, lesson: u.case_file.lesson, activity: 'case-file',
        header: unique(`${prefix} ${shortUnit(unitId)} ${u.case_file.label || 'Case File'}`),
      });
    }
    if (u.exam && activityIncluded(include, 'exam')) {
      cols.push({
        unit: unitId, lesson: u.exam.lesson, activity: 'exam',
        header: unique(`${prefix} ${shortUnit(unitId)} ${u.exam.label || 'Unit Exam'}`),
      });
    }
  }
  return cols;
}

// -- Letter grade --------------------------------------------------------------
//  The standard plus/minus cutoffs, which is what CodeHS emits in its shipping
//  export (A+ at 100 percent, A- at 91.04), so a teacher comparing the two files
//  sees the same letter for the same number.
//
//  Applied to the SUMMARY percent (earned over graded), never to a single
//  column. A student with nothing graded gets a blank letter rather than an F:
//  no work submitted is not the same as work submitted badly, and that
//  distinction is the whole point of the summary block below.
const LETTER_CUTOFFS = [
  [97, 'A+'], [93, 'A'], [90, 'A-'],
  [87, 'B+'], [83, 'B'], [80, 'B-'],
  [77, 'C+'], [73, 'C'], [70, 'C-'],
  [67, 'D+'], [63, 'D'], [60, 'D-'],
];

function letterGrade(pct) {
  if (pct == null || !isFinite(pct)) return '';
  for (const [min, letter] of LETTER_CUTOFFS) if (pct >= min) return letter;
  return 'F';
}

// -- Summary totals ------------------------------------------------------------
//  THE DISTINCTION THIS EXISTS TO MAKE
//  A student who has done three of six items and got them all right is not the
//  same as one who attempted all six and got half wrong, but a single percentage
//  over the full denominator reports both as 50. That ambiguity is what makes a
//  gradebook quietly untrustworthy, and it is exactly how three ungradeable CFUs
//  on CSA 1.1 and 1.2 marked students down with nothing on screen to explain it.
//
//  So three numbers, the same shape CodeHS uses:
//    earned    points earned on work that HAS a grade
//    graded    points available on that same work
//    possible  points available across every column, attempted or not
//  and the headline percent is earned/graded. `possible` carries the "how much
//  is left" signal without contaminating the percent.
//
//  Denominated in the COLUMNS the file actually emits (UNIT_POINTS each), not in
//  raw item points, so the summary and the columns beside it can never disagree.
//  Canvas recomputing from the columns gets the same answer. This is why it takes
//  the already-computed percents rather than reaching back into the cells.
const SUMMARY_HEADERS = ['Letter Grade', '%', 'Total Earned', 'Total Graded', 'Total Possible'];

function summaryTotals(colPcts) {
  let earned = 0, graded = 0;
  const possible = colPcts.length * UNIT_POINTS;
  for (const pct of colPcts) {
    if (pct == null) continue;              // not graded: not counted either way
    earned += (pct / 100) * UNIT_POINTS;
    graded += UNIT_POINTS;
  }
  const pct = graded > 0 ? clampPct((earned / graded) * 100) : null;
  return { earned: round2(earned), graded, possible, pct, letter: letterGrade(pct) };
}

// The five summary cells for one student, in CodeHS order.
function summaryCells(colPcts) {
  const t = summaryTotals(colPcts);
  return [
    t.letter,
    t.pct == null ? '' : `${t.pct}%`,
    String(t.earned), String(t.graded), String(t.possible),
  ];
}

// Derived columns, not assignments, so the Points Possible row marks them
// "(read only)" exactly as CodeHS does. Canvas ignores a read-only column on
// import, which is what stops a teacher gaining five junk assignments.
const SUMMARY_POINTS = SUMMARY_HEADERS.map(() => '(read only)');

// scope=activity. Same identity rules and the same blank-means-ungraded rule as
// the unit export; only the columns differ. Every cell is the activity's percent
// out of 100, which is what the dashboard shows and what keeps a System A points
// cell and a System B percent cell readable in one Canvas column.
function buildCanvasActivityExport({ course, courseConfig, className, students, cellFor, filter }) {
  const cols = canvasActivityColumns(course, courseConfig, filter);

  const headers = ['Student', 'ID', 'SIS User ID', 'SIS Login ID', 'Section']
    .concat(SUMMARY_HEADERS)
    .concat(cols.map((c) => c.header));
  const pointsRow = ['Points Possible', '', '', '', '']
    .concat(SUMMARY_POINTS)
    .concat(cols.map(() => String(UNIT_POINTS)));

  const rows = [];
  const unmatchable = [];
  let matchable = 0;

  for (const s of students) {
    const identity = canvasIdentityColumns(s.student_ref);
    if (identity.some(Boolean)) matchable++; else unmatchable.push(s.display_name);

    // Keep the numeric percents, then derive both the summary and the cell
    // strings from the same array, so the totals and the columns a teacher can
    // add up by hand can never disagree.
    const pcts = cols.map((c) => {
      const cell = normalizeCell(cellFor(s.id, c.unit, c.lesson, c.activity));
      return cell.kind === 'score' ? cell.pct : null;
    });
    const grades = pcts.map((pct) => (pct == null ? '' : String(pct)));
    rows.push([canvasStudentName(s.display_name)]
      .concat(identity, [className || ''], summaryCells(pcts), grades));
  }

  return {
    headers,
    pointsRow,
    rows,
    preflight: { students: students.length, matchable, unmatchable },
  };
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
function buildCanvasUnitExport({ course, courseConfig, className, students, cellFor, filter }) {
  const coursePrefix = CANVAS_COURSE_LABELS[course] || (courseConfig && courseConfig.label) || course;
  const include = filter && filter.include;
  const unitIds = selectedUnitIds(courseConfig, filter && filter.units);

  const headers = ['Student', 'ID', 'SIS User ID', 'SIS Login ID', 'Section']
    .concat(SUMMARY_HEADERS)
    .concat(unitIds.map((u) => `${coursePrefix} ${shortUnit(u)}`));
  const pointsRow = ['Points Possible', '', '', '', '']
    .concat(SUMMARY_POINTS)
    .concat(unitIds.map(() => String(UNIT_POINTS)));

  const rows = [];
  const unmatchable = [];
  let matchable = 0;

  for (const s of students) {
    const identity = canvasIdentityColumns(s.student_ref);
    if (identity.some(Boolean)) matchable++; else unmatchable.push(s.display_name);

    const unitPcts = unitIds.map((unitId) => {
      const u = courseConfig.units[unitId];
      const cells = [];
      for (const lesson of u.lessons) {
        for (const act of u.activities) {
          if (!activityIncluded(include, act)) continue;
          cells.push(normalizeCell(cellFor(s.id, unitId, lesson, act)));
        }
      }
      if (u.case_file) cells.push(normalizeCell(cellFor(s.id, unitId, u.case_file.lesson, 'case-file')));
      if (u.exam && activityIncluded(include, 'exam')) {
        cells.push(normalizeCell(cellFor(s.id, unitId, u.exam.lesson, 'exam')));
      }
      // NUMERIC, not a string: summaryCells needs the numbers, and the cell
      // strings come off the same array just below.
      return unitGrade(cells);
    });

    const grades = unitPcts.map((pct) => (pct == null ? '' : String(pct)));
    rows.push([canvasStudentName(s.display_name)]
      .concat(identity, [className || ''], summaryCells(unitPcts), grades));
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
  canvasSisLoginId, canvasIdentityColumns, canvasStudentName,
  ACTIVITY_LABELS, INCLUDE_BUCKETS, activityIncluded, selectedUnitIds, canvasActivityColumns,
  buildCanvasUnitExport, buildCanvasActivityExport,
  letterGrade, summaryTotals, summaryCells, LETTER_CUTOFFS, SUMMARY_HEADERS,
};
