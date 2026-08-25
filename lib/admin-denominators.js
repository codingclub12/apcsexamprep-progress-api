'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  DENOMINATOR COVERAGE - which graded columns have an authoritative "out of",
//  and what the data says the missing ones should be.
//
//  WHY THIS EXISTS
//
//  course_denominators is the authored "out of" per (course, lesson, activity).
//  Both gradebooks now read it at display time, so filling a row retroactively
//  corrects every existing gradebook with no data migration. The catch: only
//  ap-csa was ever seeded. ap-cybersecurity, which has the most live classes,
//  has no rows at all, so its cells are still denominated by whatever happened
//  to be recorded. A student served 5 of a 6-point quiz reads "/5" forever.
//
//  The authored cyber values live in the Shopify page HTML, which this repo
//  cannot read. Rather than invent numbers, this derives a PROPOSAL from what
//  the students' own submissions recorded, reports how strongly the class data
//  agrees on it, and only writes rows once that proposal is accepted. A column
//  where students disagree is reported as ambiguous and left alone rather than
//  guessed at.
//
//  SAFETY: adopt() never overwrites an existing authored row unless explicitly
//  told to, never writes an ambiguous column unless explicitly told to, and
//  runs as one transaction. The write is additive and reversible: deleting the
//  row restores the previous observed behaviour exactly.
//
//  PERFORMANCE: two grouped queries for a whole course, merged in JS. Nothing
//  scales per student or per class.
//
//  PII: reads max_points and max_score only. No names, no answers, no free text.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');
const { COURSES, examsOf } = require('../utils');
// The reserved item name the whole-activity percentage rides under. Imported
// rather than restated so this file and scoring.js can never disagree about
// which rows are a real graded item; see the comment above OBSERVED_FROM_EVENTS.
const { LESSON_SCORE_ITEM } = require('../scoring');

// progress/score rows that represent a page visit rather than graded work.
// A visit has no meaningful "out of" and is excluded from proposals.
const VISIT_ACTS = new Set(['lesson', 'visit', 'page', 'read']);

// Dotted lesson ids ('1.2', '1.10') must sort numerically per segment.
function compareLessonId(a, b) {
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

// Lesson -> unit, from the COURSES config, so a row written from `attempts`
// (which carries no unit) still lands in the right unit. course_denominators
// requires a unit and its primary key does not include one, so this only has to
// be plausible, never load-bearing.
function unitIndex(course) {
  const idx = new Map();
  const cfg = COURSES[course];
  if (!cfg || !cfg.units) return idx;
  for (const [unitId, u] of Object.entries(cfg.units)) {
    for (const lesson of (u.lessons || [])) if (!idx.has(lesson)) idx.set(lesson, unitId);
    if (u.case_file && !idx.has(u.case_file.lesson)) idx.set(u.case_file.lesson, unitId);
    for (const ex of examsOf(u)) if (!idx.has(ex.lesson)) idx.set(ex.lesson, unitId);
  }
  return idx;
}

// What each student's submissions said the assignment was out of, from the
// score_events ledger. Best max per DISTINCT item, summed, exactly as the
// gradebook derives points_possible, so a proposal here means the same number
// the gradebook would otherwise show.
//
// ── WHY THE lesson-score EXCLUSION IS LOAD BEARING ──────────────────────────
//  Two different writers land on one (unit, lesson, activity) cell. POST
//  /api/student/score records a real graded item ("5 out of 7"). POST
//  /api/student/progress records a WHOLE-ACTIVITY percentage, and it rides this
//  same ledger under the reserved item name, stored as points = percent and
//  max_points = 100. Summing the two produces 5 + 71 out of 7 + 100, and 107 is
//  a denominator matching nothing any student was ever served.
//
//  scoring.js has always excluded it, which is why the GRADEBOOK is correct and
//  shows 5 out of 7. This query did not, so the coverage view reported a column
//  the class agrees on as a conflict between 7 and 107, and every arithmetic
//  variant of it: 8 and 108, 30 and 130, two items plus the percent as 114.
//  On 2026-08-25 that read as eighteen conflicting columns and a corrupted
//  ledger. Nothing was corrupted; the rows are all legitimate and the gradebook
//  was right the whole time. Only this proposal was wrong.
//
//  The stakes are higher here than in a report, because
//  POST /api/admin/denominators/adopt AUTHORS from these numbers. Un-excluded,
//  "adopt the value the data agrees on" could have written 107 into
//  course_denominators as the official total, which every gradebook then reads
//  at display time. That would have turned a reporting artifact into a real
//  regrade of a live class.
//
//  The paragraph above this block claims these are derived "exactly as the
//  gradebook derives points_possible". That claim is the invariant, and the
//  exclusion is what makes it true.
const OBSERVED_FROM_EVENTS = `
  SELECT unit, lesson, activity_type, student_id, SUM(item_max) AS possible
  FROM (
    SELECT unit, lesson, activity_type, student_id, item, MAX(max_points) AS item_max
    FROM score_events
    WHERE course = ? AND item <> '${LESSON_SCORE_ITEM}'
    GROUP BY unit, lesson, activity_type, student_id, item
  )
  GROUP BY unit, lesson, activity_type, student_id
`;

// Same question against the attempt-level table used by the csa/csp pilot.
const OBSERVED_FROM_ATTEMPTS = `
  SELECT lesson_id AS lesson, item_type AS activity_type, student_id, SUM(item_max) AS possible
  FROM (
    SELECT lesson_id, item_type, student_id, item_id, MAX(max_score) AS item_max
    FROM attempts
    WHERE course = ?
    GROUP BY lesson_id, item_type, student_id, item_id
  )
  GROUP BY lesson_id, item_type, student_id
`;

// The LEGACY quiz path, and the only source that speaks for cyber and CSP.
//
// Those courses report through POST /api/student/quiz, which stores no points
// and no "out of": a 0-100 percentage on progress.score, plus the client's raw
// answer payload here. That payload is the only surviving record of how many
// questions the page actually served, so its entry count IS the denominator.
//
// Reading only score_events and attempts is why every cyber column reported
// no_data across all 71 graded columns while real submissions sat in this
// table the whole time. The two tables queried above are the two tables those
// courses have never written to.
//
// quiz_attempts carries no activity_type column: POST /api/student/quiz writes
// its progress row with activity_type 'quiz' unconditionally, so every row here
// is a quiz. This source can never speak for an exercise column, and must not
// be read as silence about one.
const OBSERVED_FROM_QUIZ_ATTEMPTS = `
  SELECT unit, lesson, student_id, answers
  FROM quiz_attempts WHERE course = ?
`;

// A payload longer than this is not a quiz, it is a bug or a malformed body.
// Trusting it would let one bad row propose an absurd denominator.
const MAX_PLAUSIBLE_QUESTIONS = 200;

// How many questions a stored answer payload represents. The PAGE owns this
// shape, not this API, so accept the two forms a page would plausibly send (an
// array of answers, or an object keyed by question id) and refuse to guess from
// anything else. Returning null means "this row tells us nothing", which is
// very different from returning 0.
function answerCount(json) {
  if (!json) return null;
  let v;
  try { v = JSON.parse(json); } catch (e) { return null; }
  let n = null;
  if (Array.isArray(v)) n = v.length;
  else if (v && typeof v === 'object') n = Object.keys(v).length;
  if (n == null || n < 1 || n > MAX_PLAUSIBLE_QUESTIONS) return null;
  return n;
}

// A column is only proposable when the students who did it broadly agree on
// what it was out of. Below this, the recording is inconsistent enough that
// picking the winner would be a guess.
const DEFAULT_AGREEMENT = 60;

function coverage(course, opts) {
  const o = opts || {};
  const minStudents = o.min_students == null ? 1 : Math.max(1, Number(o.min_students) || 1);
  const minAgreement = o.agreement == null ? DEFAULT_AGREEMENT : Math.max(1, Math.min(100, Number(o.agreement) || DEFAULT_AGREEMENT));
  const units = unitIndex(course);

  const cols = new Map(); // `${lesson}|${activity}` -> column
  const ensure = (lesson, activity, unit) => {
    const key = `${lesson}|${activity}`;
    if (!cols.has(key)) {
      cols.set(key, {
        key,
        unit: unit || units.get(lesson) || null,
        lesson,
        activity_type: activity,
        graded: !VISIT_ACTS.has(activity),
        authored: null,
        observed: new Map(),   // possible -> student count
        students: 0,
        sources: new Set(),
      });
    }
    const c = cols.get(key);
    if (unit && !c.unit) c.unit = unit;
    return c;
  };

  // Expected columns from the COURSES config, so a lesson nobody has reached yet
  // is still visible as "no data" rather than silently absent.
  const cfg = COURSES[course];
  if (cfg && cfg.units) {
    for (const [unitId, u] of Object.entries(cfg.units)) {
      for (const lesson of (u.lessons || [])) {
        for (const act of (u.activities || [])) ensure(lesson, act, unitId);
      }
      if (u.case_file) ensure(u.case_file.lesson, 'case-file', unitId);
      for (const ex of examsOf(u)) ensure(ex.lesson, 'exam', unitId);
    }
  }

  for (const r of db.prepare(OBSERVED_FROM_EVENTS).all(course)) {
    const c = ensure(r.lesson, r.activity_type, r.unit);
    if (r.possible == null || !(r.possible > 0)) continue;
    c.observed.set(r.possible, (c.observed.get(r.possible) || 0) + 1);
    c.students += 1;
    c.sources.add('score_events');
  }
  for (const r of db.prepare(OBSERVED_FROM_ATTEMPTS).all(course)) {
    const c = ensure(r.lesson, r.activity_type, null);
    if (r.possible == null || !(r.possible > 0)) continue;
    c.observed.set(r.possible, (c.observed.get(r.possible) || 0) + 1);
    c.students += 1;
    c.sources.add('attempts');
  }

  // Legacy quiz path. Take the LARGEST count a student recorded for a lesson: a
  // student who abandoned a quiz part way sent fewer answers than the page
  // served, and the fullest attempt is the one that saw the whole set. Counting
  // per student rather than per row also keeps a single student's retakes from
  // outvoting everyone else.
  const byQuizStudent = new Map();
  for (const r of db.prepare(OBSERVED_FROM_QUIZ_ATTEMPTS).all(course)) {
    const n = answerCount(r.answers);
    if (n == null) continue;
    const k = `${r.lesson}|${r.student_id}`;
    const prev = byQuizStudent.get(k);
    if (!prev || n > prev.n) byQuizStudent.set(k, { lesson: r.lesson, unit: r.unit, n });
  }
  for (const v of byQuizStudent.values()) {
    const c = ensure(v.lesson, 'quiz', v.unit);
    c.observed.set(v.n, (c.observed.get(v.n) || 0) + 1);
    c.students += 1;
    c.sources.add('quiz_attempts');
  }

  for (const r of db.prepare(
    'SELECT unit, lesson, activity_type, possible FROM course_denominators WHERE course = ?'
  ).all(course)) {
    const c = ensure(r.lesson, r.activity_type, r.unit);
    c.authored = r.possible;
  }

  const columns = [...cols.values()].map((c) => {
    // Distinct recorded totals, most common first. The winner is the proposal.
    const distinct = [...c.observed.entries()]
      .map(([value, students]) => ({ value, students }))
      .sort((a, b) => b.students - a.students || b.value - a.value);
    const top = distinct[0] || null;
    const agreement = top && c.students > 0 ? Math.round((top.students / c.students) * 100) : 0;

    let status, proposal = null;
    if (!c.graded) status = 'not_graded';
    else if (c.authored != null) status = 'authored';
    else if (!top) status = 'no_data';
    else if (c.students < minStudents) status = 'too_few';
    else if (agreement < minAgreement) status = 'ambiguous';
    else { status = 'proposed'; proposal = top.value; }

    // An authored row that contradicts what every student recorded is worth
    // seeing: either the authored value is wrong, or the pages are reporting a
    // different number of points than they should.
    const conflict = c.authored != null && top != null && top.value !== c.authored
      ? { authored: c.authored, observed: top.value, students: top.students }
      : null;

    return {
      unit: c.unit,
      lesson: c.lesson,
      activity_type: c.activity_type,
      graded: c.graded,
      authored: c.authored,
      students_scored: c.students,
      observed_values: distinct,
      observed_mode: top ? top.value : null,
      agreement_pct: agreement,
      sources: [...c.sources],
      status,
      proposal,
      conflict,
    };
  }).sort((a, b) =>
    compareLessonId(a.lesson, b.lesson) ||
    (a.activity_type < b.activity_type ? -1 : a.activity_type > b.activity_type ? 1 : 0));

  const graded = columns.filter((c) => c.graded);
  const count = (s) => graded.filter((c) => c.status === s).length;

  return {
    course,
    thresholds: { min_students: minStudents, agreement_pct: minAgreement },
    summary: {
      graded_columns: graded.length,
      authored: count('authored'),
      missing: graded.length - count('authored'),
      proposed: count('proposed'),
      ambiguous: count('ambiguous'),
      too_few: count('too_few'),
      no_data: count('no_data'),
      conflicts: graded.filter((c) => c.conflict).length,
    },
    columns,
    generated_at: new Date().toISOString(),
  };
}

// Write authored denominators. Two modes, and they compose:
//   values: { '1.1|quiz': 10, ... }  explicit, always wins, always applied
//   adopt_proposed: true             take every column coverage() marked 'proposed'
// Existing authored rows are left alone unless overwrite is set, so re-running
// this is safe and idempotent.
function adopt(course, opts) {
  const o = opts || {};
  const cov = coverage(course, o);
  const byKey = new Map(cov.columns.map((c) => [`${c.lesson}|${c.activity_type}`, c]));
  const units = unitIndex(course);

  const planned = [];
  const skipped = [];

  const consider = (lesson, activity, possible, reason) => {
    const key = `${lesson}|${activity}`;
    const col = byKey.get(key);
    const authored = col ? col.authored : null;
    if (!(possible > 0)) { skipped.push({ lesson, activity_type: activity, reason: 'not a positive number' }); return; }
    if (authored != null && !o.overwrite) {
      skipped.push({ lesson, activity_type: activity, reason: 'already authored', authored });
      return;
    }
    planned.push({
      unit: (col && col.unit) || units.get(lesson) || 'unit-1',
      lesson,
      activity_type: activity,
      possible,
      replaces: authored,
      reason,
    });
  };

  if (o.values && typeof o.values === 'object') {
    for (const [key, possible] of Object.entries(o.values)) {
      const i = key.lastIndexOf('|');
      if (i <= 0) { skipped.push({ key, reason: 'expected "lesson|activity_type"' }); continue; }
      consider(key.slice(0, i), key.slice(i + 1), Number(possible), 'explicit');
    }
  }

  if (o.adopt_proposed) {
    const wanted = new Set(['proposed'].concat(o.include_ambiguous ? ['ambiguous'] : []));
    for (const c of cov.columns) {
      if (!c.graded || !wanted.has(c.status)) continue;
      const possible = c.proposal != null ? c.proposal : c.observed_mode;
      if (planned.some((p) => p.lesson === c.lesson && p.activity_type === c.activity_type)) continue;
      consider(c.lesson, c.activity_type, possible, c.status === 'ambiguous' ? 'observed mode (ambiguous, forced)' : 'observed mode');
    }
  }

  if (o.dry_run) {
    return { course, applied: false, dry_run: true, would_write: planned.length, planned, skipped };
  }

  const stmt = db.prepare(`
    INSERT INTO course_denominators (course, unit, lesson, activity_type, possible)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(course, lesson, activity_type) DO UPDATE SET possible = excluded.possible, unit = excluded.unit
  `);
  const writeAll = db.transaction((rows) => {
    for (const r of rows) stmt.run(course, r.unit, r.lesson, r.activity_type, r.possible);
  });
  writeAll(planned);

  return { course, applied: true, dry_run: false, written: planned.length, planned, skipped };
}

// Un-author denominators. The counterpart to adopt(), and the sanctioned way to
// undo one: this module's whole contract is that a row changes only what
// gradebooks DISPLAY, so deleting it restores the previous behaviour exactly and
// no stored score is touched either way.
//
// This exists because an authored value that is WRONG is worse than none. A
// missing denominator shows a percentage and nothing else; a wrong one shows a
// confident "4 / 6" for a quiz that is really out of 10, and it reaches the
// teacher CSV export. Removing has to be as easy as adding, or the safe move
// stays out of reach exactly when it is needed.
//
// Scoped deliberately narrowly. Callers must name the activity types, so a slip
// can never wipe a whole course's authoring in one call.
//   { activity_types: ['quiz'], lessons: ['1.1'], only_possible: 6 }
// only_possible is the precision tool: it removes a row ONLY if it still holds
// the exact value given, so a value corrected by hand in the meantime survives.
function remove(course, opts) {
  const o = opts || {};
  const acts = Array.isArray(o.activity_types) ? o.activity_types.filter(Boolean) : [];
  if (!course) return { error: 'course is required' };
  if (!acts.length) return { error: 'activity_types is required, and must name each type to remove' };

  const lessons = Array.isArray(o.lessons) && o.lessons.length ? o.lessons.filter(Boolean) : null;

  const existing = db.prepare(
    'SELECT unit, lesson, activity_type, possible FROM course_denominators WHERE course = ?'
  ).all(course);

  const matched = existing.filter((r) => {
    if (!acts.includes(r.activity_type)) return false;
    if (lessons && !lessons.includes(r.lesson)) return false;
    if (o.only_possible != null && r.possible !== Number(o.only_possible)) return false;
    return true;
  });

  if (o.dry_run) {
    return { course, applied: false, dry_run: true, would_remove: matched.length, rows: matched };
  }

  const stmt = db.prepare(
    'DELETE FROM course_denominators WHERE course = ? AND lesson = ? AND activity_type = ?'
  );
  const removeAll = db.transaction((rows) => {
    let n = 0;
    for (const r of rows) n += stmt.run(course, r.lesson, r.activity_type).changes;
    return n;
  });
  const removed = removeAll(matched);

  return { course, applied: true, dry_run: false, removed, rows: matched };
}

module.exports = { coverage, adopt, remove, compareLessonId, VISIT_ACTS, answerCount };
