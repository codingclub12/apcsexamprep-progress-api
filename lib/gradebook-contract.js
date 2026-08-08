'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE CANONICAL GRADEBOOK CONTRACT
//
//  ONE shape for every course. Teacher and admin read this same builder, so the
//  two surfaces cannot disagree: they are not two renderers over one dataset,
//  they are one function called twice.
//
//  THE THREE LAYERS (keep them separate)
//
//      per-course manifest  ->  normalizer  ->  ONE contract  ->  UI / CSV
//        (course specific)      (this file)     (course free)     (one)
//
//  Courses legitimately differ: CSA has `cfu`, cyber has `lab` and `case-file`,
//  CSP names its lessons with slugs instead of numbers. That is CONTENT. It is
//  not schema. Everything downstream of this file reads the same keys for every
//  course, and a view that has to ask "is this course cyber" is a bug in here,
//  not in the view.
//
//  WHAT THIS FIXES (all read-time; not one stored row is rewritten)
//
//  1. The rollup averaged percentages instead of summing points, so a 5 point
//     quiz weighed the same as a 25 point project, and every newly attempted
//     item silently re-weighted the ones before it. A student's grade moved
//     while they did nothing. Points are summed now, so identical item data
//     always yields an identical percentage.
//
//  2. `pct` is `earned / graded`, never `earned / possible`. A student who has
//     finished 3 of 106 items perfectly is at 100 percent, not 3 percent. Pace
//     (`items_graded / items_total`) is a SEPARATE number. Conflating grade with
//     pace makes both useless to a teacher.
//
//  3. Nothing attempted means `pct: null`, never `0`. A student who has not
//     started is ungraded, not failing.
//
//  4. Not attempted and scored zero are different facts. An unattempted item has
//     NO entry in a student's `items` map (the UI renders blank); a scored zero
//     has an entry with `earned: 0` (the UI renders 0).
//
//  5. `basis` is gone. It only ever named which broken path produced a number.
//
//  NOTHING IS LOST, EVER
//  Every source is read, and a cell that cannot be priced is still shown and
//  still counted somewhere it can be seen:
//    - an item whose denominator nobody authored is reported in `integrity`,
//      never dropped;
//    - a grade that exists only as a percent (no authored "out of", so it cannot
//      honestly join a points sum) lands in `items_percent_only` and keeps its
//      cell, rather than vanishing from the total;
//    - work recorded against a lesson the config has never heard of still gets a
//      column, because real student work outranks a stale config.
//  Scores that disappear look clean and are worse than scores that are wrong.
//
//  INGEST PRECEDENCE (explicit, because two writers disagreed for a year)
//    A  attempts        grade of record per item, retry-policy aware  (System A)
//    B  score_events    real points per item, excluding 'lesson-score' (System B)
//    C  progress.score  the derived percent, reset-aware               (fallback)
//  Highest available source wins per (student, lesson, native activity). A lower
//  source may still supply completion when the winner carries no score.
//
//  PERFORMANCE: eight class-scoped queries, merged in JS. No query per student,
//  per lesson, or per item. Statements are prepared once at module scope. This
//  runs on 1 vCPU / 1 GB.
//
//  PII: display names only when the caller explicitly asks. Default labels are
//  positional ("Student 1"). No student-entered text is read anywhere.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');
const { COURSES } = require('../utils');
const { retrySqlExpr } = require('../retry-policy');
const { LESSON_SCORE_ITEM } = require('../scoring');

const CONTRACT_VERSION = 1;

// The provisional weight for a column that stores only a percent and has no
// authored total. 100 is the only value that keeps the displayed pair equal to
// the stored percent, so nothing a student or teacher reads changes; any other
// number would rescale and round, which is the defect this whole contract
// exists to remove. It is provisional, not correct: see the SOURCE C comment.
const PERCENT_WEIGHT = 100;

// ── CANONICAL ACTIVITY VOCABULARY ────────────────────────────────────────────
//  Every native activity type normalizes into exactly one of these. The native
//  name is always kept alongside, so nothing is lost and a course can rename its
//  own vocabulary without a downstream change.
const CANONICAL_ACTIVITIES = ['lesson', 'practice', 'exercise', 'lab', 'quiz', 'exam', 'project'];

// native -> [canonical, ordinal]. Ordinal separates exercise-1 from exercise-2
// once both have normalized to 'exercise'.
const ACTIVITY_MAP = {
  lesson: ['lesson', null],
  visit: ['lesson', null],
  page: ['lesson', null],
  read: ['lesson', null],
  cfu: ['practice', null],
  code: ['practice', null],
  game: ['practice', null],
  exercise: ['exercise', null],
  'exercise-1': ['exercise', 1],
  'exercise-2': ['exercise', 2],
  'exercise-3': ['exercise', 3],
  lab: ['lab', null],
  quiz: ['quiz', null],
  exam: ['exam', null],
  'case-file': ['project', null],
};

// An activity nobody has enumerated yet is practice: the forgiving side of the
// line, and the same default retry-policy.js takes. It is reported in
// `integrity.unmapped_activities` so the map can be extended deliberately rather
// than by accident.
function canonicalActivity(native) {
  const hit = ACTIVITY_MAP[native];
  if (hit) return { activity: hit[0], ordinal: hit[1], mapped: true };
  const m = /^(.*?)-(\d+)$/.exec(String(native || ''));
  if (m && ACTIVITY_MAP[m[1]]) {
    return { activity: ACTIVITY_MAP[m[1]][0], ordinal: Number(m[2]), mapped: true };
  }
  return { activity: 'practice', ordinal: null, mapped: false };
}

// A 'lesson' is a page visit, not graded work. Everything else can carry a
// grade. This is the same line lib/admin-gradebook.js has always drawn, stated
// once here instead of as a set literal in each reader.
function isGradedActivity(canonical) { return canonical !== 'lesson'; }

const ABBR = {
  lesson: 'L', practice: 'P', exercise: 'E', lab: 'Lab',
  quiz: 'Q', exam: 'Exam', project: 'Proj',
};

function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }

// Points are counts of right and wrong, so the numerator is a whole number
// whenever the denominator is one. "1.04 / 8" is not a score any student can
// earn; it is an artifact of reconstructing a numerator from a stored percent.
//
// The percent is the lossy side here, not the pair. A student who got 1 of 8
// scored 12.5, which is stored as the integer 13, and 13 percent of 8 is 1.04.
// Rounding to the nearest whole point RECOVERS the 1. It is a better estimate
// of the original count than the decimal, not a cosmetic trim.
//
// Fractional denominators keep the cent: a half-point rubric out of 7.5 has a
// real fraction in it, and rounding there would invent precision rather than
// restore it.
//
// Deliberately NOT applied to the percent. The stored percent stays the grade of
// record, so no mastery decision moves; rounding a numerator up to half a point
// could otherwise flip a student across the threshold on a small denominator.
// Where real per-item points exist the numerator is already whole and this is a
// no-op, which is the case this is quietly steering everything toward.
function pointsFromRatio(ratio, possible) {
  if (ratio == null || possible == null) return null;
  const raw = ratio * possible;
  return Number.isInteger(possible) ? Math.round(raw) : round2(raw);
}

// Dotted lesson ids ('1.2', '1.10') compare numerically per segment, so 1.10
// sorts after 1.9. Used only as the last-resort tiebreak; authored order wins.
function compareLessonRef(a, b) {
  const pa = String(a).split('.'), pb = String(b).split('.');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const xa = pa[i], xb = pb[i];
    if (xa === undefined) return -1;
    if (xb === undefined) return 1;
    const na = Number(xa), nb = Number(xb);
    if (Number.isFinite(na) && Number.isFinite(nb)) { if (na !== nb) return na - nb; }
    else if (xa !== xb) return xa < xb ? -1 : 1;
  }
  return 0;
}

// ── PREPARED STATEMENTS (module scope, reused) ───────────────────────────────
const RETRY_ATTEMPTS = retrySqlExpr('c.retry_mode', 's.retry_override', 'a.item_type', 'c.retry_allowed');
const RETRY_EVENTS = retrySqlExpr('c.retry_mode', 's.retry_override', 'se.activity_type', 'c.retry_allowed');

const classStmt = db.prepare(`
  SELECT id, class_code, class_name, course, mastery_threshold, retry_allowed,
         retry_mode, games_graded, teacher_id
  FROM classes WHERE id = ? OR class_code = ?
`);

const rosterStmt = db.prepare(`
  SELECT id, display_name, student_ref, active, last_active
  FROM students WHERE class_id = ? ORDER BY created_at, id
`);

const manifestStmt = db.prepare(`
  SELECT unit, lesson_id, item_id, item_type, points, rowid AS seq
  FROM course_manifest WHERE course = ? ORDER BY rowid
`);

const denomStmt = db.prepare(
  'SELECT lesson, activity_type, possible FROM course_denominators WHERE course = ?'
);

// Unit-scoped denominators, for the columns a (lesson, activity) key cannot
// express. Cyber gives all five units a case file at lesson 'case-file' and an
// exam at lesson 'exam', so those ten columns collapse onto two rows in
// course_denominators and the second value is rejected by its primary key.
const unitDenomStmt = db.prepare(
  'SELECT unit, lesson, activity_type, possible FROM course_unit_denominators WHERE course = ?'
);

// SOURCE A: grade of record per (student, item) from `attempts`. The retry
// decision comes from retry-policy.js so this pass and every row-by-row path
// state the same rule.
const attemptsStmt = db.prepare(`
  SELECT student_id, lesson_id, item_id, item_type, score, max_score, attempt_no, tries
  FROM (
    SELECT a.student_id, a.lesson_id, a.item_id, a.item_type, a.score, a.max_score, a.attempt_no,
      COUNT(*) OVER (PARTITION BY a.student_id, a.item_id) AS tries,
      CASE WHEN ${RETRY_ATTEMPTS} = 1
        THEN ROW_NUMBER() OVER (PARTITION BY a.student_id, a.item_id
               ORDER BY a.score * 1.0 / NULLIF(a.max_score,0) DESC, a.attempt_no ASC)
        ELSE ROW_NUMBER() OVER (PARTITION BY a.student_id, a.item_id
               ORDER BY a.attempt_no ASC)
      END AS rn
    FROM attempts a
    JOIN students s ON s.id = a.student_id
    JOIN classes  c ON c.id = a.class_id
    WHERE a.class_id = ? AND a.course = ?
  ) WHERE rn = 1
`);

// SOURCE B: real points per (student, lesson, activity) from the score_events
// ledger, one row kept per distinct item under the class retry policy.
//
// 'lesson-score' rows are EXCLUDED. They are a synthetic carrier for a percent
// posted to /api/student/progress (points = the percent, max_points = 100), not
// a graded item, and summing them into a points total inflates an activity's
// denominator by 100 per submission. scoring.js excludes them from the same
// rollup; this pass must agree or the two disagree about the same student.
const eventPointsStmt = db.prepare(`
  SELECT student_id, unit, lesson, activity_type,
         SUM(kept_points) AS earned,
         SUM(item_max)    AS possible,
         COUNT(*)         AS items,
         SUM(tries)       AS tries
  FROM (
    SELECT se.student_id, se.unit, se.lesson, se.activity_type, se.item,
           se.points     AS kept_points,
           se.max_points AS item_max,
           COUNT(*) OVER (
             PARTITION BY se.student_id, se.unit, se.lesson, se.activity_type, se.item
           ) AS tries,
           ROW_NUMBER() OVER (
             PARTITION BY se.student_id, se.unit, se.lesson, se.activity_type, se.item
             ORDER BY CASE WHEN ${RETRY_EVENTS} = 1 THEN -se.points ELSE 0 END ASC,
                      se.created_at ASC, se.rowid ASC
           ) AS rn
    FROM score_events se
    JOIN students s ON s.id = se.student_id
    JOIN classes  c ON c.id = se.class_id
    WHERE se.class_id = ? AND se.course = ? AND se.item <> '${LESSON_SCORE_ITEM}'
  ) WHERE rn = 1
  GROUP BY student_id, unit, lesson, activity_type
`);

// SOURCE C: the progress table. Completion for every activity, plus the derived
// percent grade of record for anything scored through /api/student/progress
// (already reset-aware: a teacher reset nulls the score).
const progressStmt = db.prepare(`
  SELECT student_id, unit, lesson, activity_type, completed, score, attempts, locked
  FROM progress WHERE class_id = ? AND course = ?
`);

// ─────────────────────────────────────────────────────────────────────────────
//  THE DENOMINATOR AUTHORITY
//
//  ONE function answers "what is this column out of", for every reader. The
//  student view, the teacher view, the admin view and every export call this,
//  so a fraction shown to a student is the same fraction shown to their teacher
//  by construction rather than by agreement.
//
//  This exists because the student page had no answer available to it. GET
//  /api/student/progress returned a percent and nothing else, so the page fell
//  back to a hardcoded constant per activity and rescaled the percent onto it.
//  On Cyber 1.1 that printed "5/5" for an exercise really out of 7 and "/10"
//  for a quiz really out of 5, and the rounding moved the grade: a student
//  scoring 17 percent saw "1/5", which reads as 20.
//
//  Priority, most specific first:
//    unit-scoped  course_unit_denominators, for a column a (lesson, activity)
//                 key cannot address (every Cyber unit has a lesson 'exam')
//    manifest     the summed course_manifest points for the lesson + activity,
//                 which counts items the student has not reached yet
//    authored     course_denominators, the authored "out of" per lesson+activity
//
//  Returns a Map keyed BOTH `${unit}|${lesson}|${activity}` and
//  `${lesson}|${activity}`, so a caller that knows the unit gets the precise
//  answer and one that does not still gets the right value for every course
//  whose lesson ids name exactly one lesson (which is all of them except the
//  Cyber pseudo-lessons).
// ─────────────────────────────────────────────────────────────────────────────
function denominatorMap(course) {
  const out = new Map();
  const put = (k, possible, source) => {
    if (possible == null || !(possible > 0)) return;
    out.set(k, { possible: round2(possible), source });
  };

  // Lowest priority first, so a more specific write overwrites it.
  for (const r of denomStmt.all(course)) {
    put(`${r.lesson}|${r.activity_type}`, r.possible, 'authored');
  }

  const perUnit = new Map();   // `${unit}|${lesson}|${type}` -> summed points
  for (const m of manifestStmt.all(course)) {
    if (m.item_type === 'visit') continue;
    const unit = m.unit || 'unit-' + String(m.lesson_id).split('.')[0];
    const k = `${unit}|${m.lesson_id}|${m.item_type}`;
    perUnit.set(k, (perUnit.get(k) || 0) + m.points);
  }
  for (const [k, possible] of perUnit) {
    put(k, possible, 'manifest');
    const [, lesson, type] = k.split('|');
    put(`${lesson}|${type}`, possible, 'manifest');
  }

  for (const r of unitDenomStmt.all(course)) {
    put(`${r.unit}|${r.lesson}|${r.activity_type}`, r.possible, 'authored');
    put(`${r.lesson}|${r.activity_type}`, r.possible, 'authored');
  }
  return out;
}

// Look a column up by unit when the unit is known, falling back to the
// unit-less key. Returns null when nobody has authored a value, which callers
// must render as "no denominator" rather than inventing one.
function lookupDenominator(map, unit, lesson, activityType) {
  return (unit && map.get(`${unit}|${lesson}|${activityType}`))
      || map.get(`${lesson}|${activityType}`)
      || null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  THE NORMALIZER
//
//  The ONLY place a course's own shape is interpreted. It reads the per-course
//  content config plus the per-course manifest and emits the canonical grid:
//  ordered units, ordered lessons (every course gets an integer `lesson_seq`,
//  including CSP whose lesson ids are slugs), and canonical activities.
// ─────────────────────────────────────────────────────────────────────────────
function normalizeGrid(course, manifestRows, gamesGraded) {
  const cfg = COURSES[course] || {};
  const cfgUnits = cfg.units || {};

  const units = new Map();       // unit -> { unit, label, unit_seq }
  const lessons = new Map();     // `${unit}|${lesson_ref}` -> { unit, lesson_ref, lesson_seq, label }
  const items = new Map();       // item_key -> canonical item
  const unmapped = new Set();

  const unitKeys = Object.keys(cfgUnits);
  unitKeys.forEach((u, i) => {
    units.set(u, { unit: u, label: cfgUnits[u].label || u, unit_seq: i });
  });

  // lesson_seq is MANDATORY for every course. Authored order wins, in three
  // tiers, so a lesson always lands where its author put it:
  //   0..999      position in the course config's own lesson array. This is what
  //               gives CSP's slug lesson ids ('collaboration', 'binary-numbers')
  //               a curriculum order they could never derive from their names.
  //   1000..1999  first appearance in course_manifest, for an authored lesson
  //               the config does not list (AP Networking's 'test' is one). It
  //               sorts into its authored position, not alphabetically and not
  //               last.
  //   2000+       observed only: real student work against a lesson neither the
  //               config nor the manifest knows. Shown rather than hidden, and
  //               ordered by its lesson ref so the column set stays stable.
  const ensureUnit = (unit) => {
    if (!units.has(unit)) units.set(unit, { unit, label: unit, unit_seq: units.size });
    return units.get(unit);
  };
  const ensureLesson = (unit, ref, seq, label) => {
    const key = `${unit}|${ref}`;
    if (!lessons.has(key)) {
      ensureUnit(unit);
      lessons.set(key, { unit, lesson_ref: ref, lesson_seq: seq, label: label || ref });
    }
    const l = lessons.get(key);
    if (seq < l.lesson_seq) l.lesson_seq = seq;
    return l;
  };

  for (const u of unitKeys) {
    const cu = cfgUnits[u];
    (cu.lessons || []).forEach((ref, i) => ensureLesson(u, ref, i));
    // A unit's case file and exam are authored to sit after its lessons.
    if (cu.case_file) ensureLesson(u, cu.case_file.lesson, 900, cu.case_file.label);
    if (cu.exam) ensureLesson(u, cu.exam.lesson, 901, cu.exam.label);
  }

  const manifestSeen = new Map(); // lesson_ref -> unit, for rows that name no unit
  let manifestOrder = 0;
  for (const m of manifestRows) {
    const unit = m.unit || 'unit-' + String(m.lesson_id).split('.')[0];
    if (!manifestSeen.has(m.lesson_id)) manifestSeen.set(m.lesson_id, unit);
    if (!lessons.has(`${unit}|${m.lesson_id}`)) ensureLesson(unit, m.lesson_id, 1000 + manifestOrder++);
  }

  const addItem = (unit, ref, native, opts) => {
    ensureUnit(unit);
    const key = `${unit}/${ref}/${native}`;
    if (!items.has(key)) {
      const c = canonicalActivity(native);
      if (!c.mapped) unmapped.add(native);
      // A game (exercise-2) that the teacher has set to practice keeps its cell
      // and its number but stops counting toward the grade. That is a class
      // setting, not a course property, so it belongs on `graded` and nowhere
      // else.
      const graded = isGradedActivity(c.activity)
        && !(native === 'exercise-2' && !gamesGraded);
      items.set(key, {
        item_key: key,
        unit,
        lesson_ref: ref,
        lesson_seq: 0,        // filled from the lesson grid below
        activity: c.activity,
        native_activity: native,
        activity_ordinal: c.ordinal,
        label: `${ref} ${ABBR[c.activity] || c.activity}${c.ordinal ? c.ordinal : ''}`,
        graded,
        possible: null,
        possible_source: null,
        expected: false,
        observed: false,
        in_manifest: false,
      });
    }
    const it = items.get(key);
    if (opts && opts.expected) it.expected = true;
    if (opts && opts.observed) it.observed = true;
    if (opts && opts.in_manifest) it.in_manifest = true;
    return it;
  };

  // EXPECTED columns come from the course config: this is the authority on what
  // a unit is SUPPOSED to contain, so an activity that never reports shows up as
  // a column of blanks instead of silently not existing.
  for (const u of unitKeys) {
    const cu = cfgUnits[u];
    for (const ref of (cu.lessons || [])) {
      for (const native of (cu.activities || [])) addItem(u, ref, native, { expected: true });
    }
    if (cu.case_file) addItem(u, cu.case_file.lesson, 'case-file', { expected: true });
    if (cu.exam) addItem(u, cu.exam.lesson, 'exam', { expected: true });
  }

  return { units, lessons, items, unmapped, manifestSeen, addItem, ensureLesson };
}

// ─────────────────────────────────────────────────────────────────────────────
//  buildCanonicalGradebook(classKey, opts)
//
//    opts.reveal   true to use real display names. Default: positional labels.
//    opts.course   which course to render for a `solo` class. Default ap-csa.
// ─────────────────────────────────────────────────────────────────────────────
function buildCanonicalGradebook(classKey, opts) {
  const o = opts || {};
  const reveal = !!o.reveal;
  const cls = classStmt.get(String(classKey), String(classKey).toUpperCase());
  if (!cls) return null;

  const course = cls.course === 'solo' ? String(o.course || 'ap-csa') : cls.course;
  const threshold = cls.mastery_threshold == null ? 80 : cls.mastery_threshold;
  // NULL means "course default": CSP games are practice, other courses count
  // them. A teacher's explicit 0/1 always wins.
  const gamesGraded = cls.games_graded == null ? (course !== 'ap-csp') : !!cls.games_graded;

  const manifestRows = manifestStmt.all(course);
  const grid = normalizeGrid(course, manifestRows, gamesGraded);
  const { items, lessons, units, unmapped, addItem, ensureLesson } = grid;

  // ── Denominator authority ──────────────────────────────────────────────────
  //  Priority, highest first:
  //    manifest   the sum of course_manifest points for the lesson + activity.
  //               Single authority for a System A course, and it counts items
  //               the student has not reached, so 2 of 8 CFUs reads 2/8.
  //    authored   course_denominators, the authored "out of" per lesson and
  //               activity for a System B course.
  //    observed   what happened to be recorded. Never authoritative: a student
  //               served 5 of a 6 point quiz would denominate the column at 5.
  //               Kept only so real work is still shown, and reported loudly.
  // Keyed by UNIT as well as lesson and activity. A lesson id names exactly one
  // lesson in every numbered course, so for those this is the same key it always
  // was; it differs only for the Cyber pseudo-lessons ('exam', 'case-file'),
  // where five units share one lesson id and a unit-less key silently prices all
  // five columns from whichever row was read last.
  const manifestPoints = new Map();   // `${unit}|${lesson}|${native}` -> { possible, items }
  const manifestItemPoints = new Map(); // item_id -> points
  const visitItems = [];
  for (const m of manifestRows) {
    const unit = m.unit || grid.manifestSeen.get(m.lesson_id) || 'unit-' + String(m.lesson_id).split('.')[0];
    if (m.item_type === 'visit') { visitItems.push(m); continue; }
    manifestItemPoints.set(m.item_id, m.points);
    const k = `${unit}|${m.lesson_id}|${m.item_type}`;
    const p = manifestPoints.get(k) || { possible: 0, items: 0 };
    p.possible += m.points;
    p.items += 1;
    manifestPoints.set(k, p);
    addItem(unit, m.lesson_id, m.item_type, { in_manifest: true });
  }

  const authored = new Map(
    denomStmt.all(course).map((r) => [`${r.lesson}|${r.activity_type}`, r.possible])
  );
  const unitAuthored = new Map(
    unitDenomStmt.all(course).map((r) => [`${r.unit}|${r.lesson}|${r.activity_type}`, r.possible])
  );

  // ── Read the three sources ─────────────────────────────────────────────────
  //  Every source may introduce a column the config never declared. Real student
  //  work always outranks a stale config, so those columns are created rather
  //  than dropped.
  const unitForLesson = (ref, fallback) =>
    grid.manifestSeen.get(ref) || fallback || 'unit-' + String(ref).split('.')[0];

  // A: attempts
  const aCell = new Map(); // `${sid}|${unit}/${lesson}/${native}` -> agg
  for (const g of attemptsStmt.all(cls.id, course)) {
    const unit = unitForLesson(g.lesson_id, null);
    const it = addItem(unit, g.lesson_id, g.item_type, { observed: true });
    ensureLesson(unit, g.lesson_id, 2000);
    const k = `${g.student_id}|${it.item_key}`;
    const c = aCell.get(k) || { earned: 0, observedPossible: 0, items: 0, tries: 0 };
    c.earned += g.score;
    // An item the manifest does not price falls back to the recorded max, so a
    // manifest row removed after the write can never hide real student work.
    if (!manifestItemPoints.has(g.item_id)) c.observedPossible += g.max_score;
    c.items += 1;
    c.tries += g.tries;
    aCell.set(k, c);
  }

  // B: score_events real points
  const bCell = new Map();
  for (const r of eventPointsStmt.all(cls.id, course)) {
    const it = addItem(r.unit, r.lesson, r.activity_type, { observed: true });
    ensureLesson(r.unit, r.lesson, 2000);
    bCell.set(`${r.student_id}|${it.item_key}`, r);
  }

  // C: progress
  const cCell = new Map();
  for (const p of progressStmt.all(cls.id, course)) {
    const it = addItem(p.unit, p.lesson, p.activity_type, { observed: !!(p.completed || p.score != null) });
    ensureLesson(p.unit, p.lesson, 2000);
    cCell.set(`${p.student_id}|${it.item_key}`, p);
  }

  // ── Resolve each column's denominator and ordering ─────────────────────────
  for (const it of items.values()) {
    const l = lessons.get(`${it.unit}|${it.lesson_ref}`);
    it.lesson_seq = l ? l.lesson_seq : 2000;
    if (!it.graded) continue;
    // Most specific key first. A unit-scoped row is authored for exactly this
    // column and can never be a value meant for a different unit's exam, so it
    // outranks both the manifest and the unit-less authored table.
    const uk = `${it.unit}|${it.lesson_ref}|${it.native_activity}`;
    const mk = `${it.lesson_ref}|${it.native_activity}`;
    if (unitAuthored.has(uk)) {
      it.possible = round2(unitAuthored.get(uk));
      it.possible_source = 'authored';
    } else if (manifestPoints.has(uk)) {
      it.possible = round2(manifestPoints.get(uk).possible);
      it.possible_source = 'manifest';
      it.manifest_items = manifestPoints.get(uk).items;
    } else if (authored.has(mk)) {
      it.possible = round2(authored.get(mk));
      it.possible_source = 'authored';
    }
  }

  const unitSeq = (u) => (units.has(u) ? units.get(u).unit_seq : 999);
  const ACT_RANK = { lesson: 0, practice: 1, exercise: 2, lab: 3, quiz: 4, project: 5, exam: 6 };
  const itemList = [...items.values()].sort((a, b) => {
    const ua = unitSeq(a.unit), ub = unitSeq(b.unit);
    if (ua !== ub) return ua - ub;
    if (a.lesson_seq !== b.lesson_seq) return a.lesson_seq - b.lesson_seq;
    const lr = compareLessonRef(a.lesson_ref, b.lesson_ref);
    if (lr !== 0) return lr;
    const ra = ACT_RANK[a.activity] ?? 9, rb = ACT_RANK[b.activity] ?? 9;
    if (ra !== rb) return ra - rb;
    if ((a.activity_ordinal || 0) !== (b.activity_ordinal || 0)) {
      return (a.activity_ordinal || 0) - (b.activity_ordinal || 0);
    }
    return a.native_activity < b.native_activity ? -1 : 1;
  });

  // `possible` (the course total) is the sum over ALL graded items that carry an
  // authoritative denominator. It is a property of the class, not of a student,
  // so every student in a class reports the identical number.
  let classPossible = 0;
  let itemsTotal = 0;
  for (const it of itemList) {
    if (!it.graded) continue;
    itemsTotal += 1;
    if (it.possible != null) classPossible += it.possible;
  }
  classPossible = round2(classPossible);

  const visitTotal = visitItems.length;
  const visitCount = new Map();
  for (const [k, p] of cCell) {
    if (!p.completed) continue;
    const sid = k.slice(0, k.indexOf('|'));
    const it = items.get(k.slice(k.indexOf('|') + 1));
    if (!it || it.activity !== 'lesson') continue;
    visitCount.set(sid, (visitCount.get(sid) || 0) + 1);
  }

  // ── Student rows ───────────────────────────────────────────────────────────
  const roster = rosterStmt.all(cls.id);
  const percentOnlyKeys = new Set();

  const students = roster.map((s, idx) => {
    const cells = {};
    let earned = 0, graded = 0, itemsGraded = 0, itemsPassed = 0, itemsPercentOnly = 0;

    for (const it of itemList) {
      const k = `${s.id}|${it.item_key}`;
      const a = aCell.get(k), b = bCell.get(k), c = cCell.get(k);
      if (!a && !b && !c) continue;   // NOT ATTEMPTED: no entry at all, so the UI renders blank

      const completed = c ? !!c.completed : !!(a || b);
      const locked = c ? !!c.locked : false;

      // Ungraded column (a lesson visit, or a game the teacher set to practice):
      // shown as done, never priced.
      if (!it.graded) {
        cells[it.item_key] = {
          status: 'done', earned: null, possible: null, pct: null, passed: null,
          tries: c ? (c.attempts || 0) : 0,
          source: a ? 'attempts' : (b ? 'score_events' : 'progress'),
          completed, locked,
        };
        continue;
      }

      let cell = null;
      if (a && a.items > 0) {
        // SOURCE A. The manifest prices every item of the column, attempted or
        // not, plus anything the manifest does not know at its recorded max.
        const m = manifestPoints.get(`${it.unit}|${it.lesson_ref}|${it.native_activity}`);
        const possible = round2((m ? m.possible : 0) + a.observedPossible);
        cell = {
          status: 'attempted',
          earned: round2(a.earned),
          possible: possible > 0 ? possible : null,
          pct: possible > 0 ? round1((a.earned / possible) * 100) : null,
          tries: a.tries,
          items_attempted: a.items,
          items_total: m ? m.items : a.items,
          source: 'attempts',
          possible_source: m ? 'manifest' : 'observed',
          completed, locked,
        };
      } else if (b && b.possible > 0) {
        // SOURCE B. Real points from the ledger. The authored "out of" wins when
        // one exists, with earned rescaled so the pair stays consistent; the
        // percentage never moves.
        const auth = it.possible_source === 'authored' || it.possible_source === 'manifest'
          ? it.possible : null;
        const ratio = b.earned / b.possible;
        cell = {
          status: 'attempted',
          earned: auth != null ? pointsFromRatio(ratio, auth) : round2(b.earned),
          possible: round2(auth != null ? auth : b.possible),
          pct: round1(ratio * 100),
          tries: b.tries || b.items,
          items_attempted: b.items,
          items_total: b.items,
          source: 'score_events',
          possible_source: auth != null ? it.possible_source : 'observed',
          completed, locked,
        };
      } else if (c && c.score != null) {
        // SOURCE C. A percent with no points behind it.
        //
        // Every graded cell shows points earned over points possible, on every
        // course, so this one does too. With an authored total the percent is
        // priced against it. Without one the percent IS the pair: 17 percent is
        // 17 out of 100.
        //
        // That is lossless, and it is worth being precise about why, because
        // the defect this replaced looked similar and was not. The old student
        // page rescaled a percent onto a wrong SMALL constant and rounded: 17
        // percent became "1/5", which reads as 20. Showing 17/100 changes no
        // number at all.
        //
        // What it does cost is WEIGHT. A column priced at 100 by default
        // outweighs a real 5 point quiz twenty to one in the totals, so until
        // its true total is authored the class average leans toward it. That is
        // why possible_source says 'percent' rather than pretending it was
        // authored, why these are counted in items_percent_only, and why they
        // stay in integrity.missing_denominators as work to be done.
        const auth = it.possible;
        const priced = auth != null;
        cell = {
          status: 'attempted',
          earned: priced ? pointsFromRatio(c.score / 100, auth) : round2(c.score),
          possible: priced ? auth : PERCENT_WEIGHT,
          pct: round1(c.score),
          tries: c.attempts || 0,
          source: 'progress',
          possible_source: priced ? it.possible_source : 'percent',
          completed, locked,
        };
      } else {
        // Completed, no number. Real information, so it is shown; it simply has
        // nothing to contribute to a grade.
        cell = {
          status: 'done', earned: null, possible: null, pct: null, passed: null,
          tries: c ? (c.attempts || 0) : 0,
          source: a ? 'attempts' : (b ? 'score_events' : 'progress'),
          completed, locked,
        };
      }

      if (cell.pct != null) {
        cell.passed = cell.pct >= threshold;
        itemsGraded += 1;
        if (cell.passed) itemsPassed += 1;
        // Every graded cell now carries a pair, so every graded cell counts.
        // The visible cells therefore add up to the row total, which they did
        // not when percent-only work was held out: a student could see four
        // fractions and a total that was the sum of three of them.
        if (cell.possible != null && cell.possible > 0) {
          earned += cell.earned;
          graded += cell.possible;
        }
        // Still tracked and still reported. A provisional weight of 100 is a
        // placeholder for an authored total, not a substitute for one.
        if (cell.possible_source === 'percent') {
          itemsPercentOnly += 1;
          percentOnlyKeys.add(it.item_key);
        }
      }
      cells[it.item_key] = cell;
    }

    earned = round2(earned);
    graded = round2(graded);

    return {
      id: s.id,
      label: reveal ? s.display_name : `Student ${idx + 1}`,
      ref: s.student_ref,
      active: s.active,
      last_active: s.last_active,
      items: cells,
      overall: {
        // pct is earned over GRADED work, never over the whole course. Null when
        // nothing has been attempted: ungraded, not failing.
        pct: graded > 0 ? round1((earned / graded) * 100) : null,
        earned,
        graded,
        possible: classPossible,
        items_graded: itemsGraded,
        items_passed: itemsPassed,
        items_total: itemsTotal,
        items_percent_only: itemsPercentOnly,
      },
      // Pace is how much of the course has been reached. Reported separately
      // because it answers a different question than the grade does.
      pace: {
        items_graded: itemsGraded,
        items_total: itemsTotal,
        pct: itemsTotal > 0 ? round1((itemsGraded / itemsTotal) * 100) : null,
        visits: visitCount.get(s.id) || 0,
        visits_total: visitTotal,
      },
    };
  });

  // ── Per-column class stats ─────────────────────────────────────────────────
  //  The class average is a points average too, for the same reason a student's
  //  is: a mean of percentages lets one student's 1 point item outweigh another
  //  student's 25 point one.
  for (const it of itemList) {
    let e = 0, g = 0, n = 0, done = 0, passed = 0;
    for (const st of students) {
      const c = st.items[it.item_key];
      if (!c) continue;
      if (c.completed) done += 1;
      if (c.pct == null) continue;
      n += 1;
      if (c.passed) passed += 1;
      if (c.possible != null && c.possible > 0) { e += c.earned; g += c.possible; }
    }
    it.class_avg_pct = g > 0 ? round1((e / g) * 100) : null;
    it.scored_students = n;
    it.passed_students = passed;
    it.completed_students = done;
  }

  const lessonList = [...lessons.values()].sort((a, b) => {
    const ua = unitSeq(a.unit), ub = unitSeq(b.unit);
    if (ua !== ub) return ua - ub;
    if (a.lesson_seq !== b.lesson_seq) return a.lesson_seq - b.lesson_seq;
    return compareLessonRef(a.lesson_ref, b.lesson_ref);
  });

  // ── Integrity ──────────────────────────────────────────────────────────────
  //  A graded item with no authoritative denominator is a data integrity
  //  failure, not a footnote. It is listed here in full so a caller can render
  //  it as a blocking banner and so it can be fixed by authoring a row rather
  //  than by changing code.
  const missingDenominators = itemList
    .filter((i) => i.graded && i.possible_source !== 'manifest' && i.possible_source !== 'authored')
    .map((i) => ({
      item_key: i.item_key, unit: i.unit, lesson_ref: i.lesson_ref,
      activity: i.activity, native_activity: i.native_activity,
      observed: i.observed, scored_students: i.scored_students,
    }));
  const notInManifest = itemList
    .filter((i) => i.graded && !i.in_manifest)
    .map((i) => i.item_key);

  const integrity = {
    denominators_missing: missingDenominators.length,
    denominators_authored: itemList.filter((i) => i.graded && i.possible != null).length,
    missing_denominators: missingDenominators,
    graded_items_not_in_manifest: notInManifest.length,
    items_not_in_manifest: notInManifest,
    percent_only_items: [...percentOnlyKeys].sort(),
    unmapped_activities: [...unmapped].sort(),
    // The one number that says "this gradebook can be trusted".
    ok: missingDenominators.length === 0 && percentOnlyKeys.size === 0 && unmapped.size === 0,
  };

  const scored = students.filter((s) => s.overall.pct != null);
  const classEarned = round2(scored.reduce((n, s) => n + s.overall.earned, 0));
  const classGraded = round2(scored.reduce((n, s) => n + s.overall.graded, 0));

  return {
    contract_version: CONTRACT_VERSION,
    class: {
      id: cls.id,
      class_code: cls.class_code,
      class_name: cls.class_name,
      course: cls.course,
      teacher_id: cls.teacher_id,
      mastery_threshold: threshold,
      retry_allowed: cls.retry_allowed,
      retry_mode: cls.retry_mode || (cls.retry_allowed ? 'all' : 'practice'),
      games_graded: gamesGraded ? 1 : 0,
    },
    course,
    course_label: (COURSES[course] || {}).label || course,
    anonymized: !reveal,
    activity_vocabulary: CANONICAL_ACTIVITIES,
    units: [...units.values()].sort((a, b) => a.unit_seq - b.unit_seq),
    lessons: lessonList,
    items: itemList,
    students,
    summary: {
      students: students.length,
      students_with_scores: scored.length,
      // The class percentage is points over points, so it agrees with the
      // student rows it summarizes.
      class_pct: classGraded > 0 ? round1((classEarned / classGraded) * 100) : null,
      earned: classEarned,
      graded: classGraded,
      possible: classPossible,
      items_total: itemsTotal,
      items_shown: itemList.length,
      lessons_shown: lessonList.length,
      visit_total: visitTotal,
      sources: { attempts: aCell.size, score_events: bCell.size, progress: cCell.size },
    },
    integrity,
  };
}

module.exports = {
  buildCanonicalGradebook,
  PERCENT_WEIGHT,
  pointsFromRatio,
  denominatorMap,
  lookupDenominator,
  canonicalActivity,
  isGradedActivity,
  compareLessonRef,
  CANONICAL_ACTIVITIES,
  CONTRACT_VERSION,
};
