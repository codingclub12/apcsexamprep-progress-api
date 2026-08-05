'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  FULL GRADEBOOK - every assignment a class should have, and what it recorded.
//
//  TWO PROBLEMS THIS SOLVES
//
//  1. Half the data was invisible. The original admin gradebook read only the
//     `attempts` table, the newer attempt-level path used by the ap-csa / ap-csp
//     pilot. AP Cybersecurity, the course with working grade reporting and most
//     of the live classes, records through score_events which rolls up into
//     progress.score. Those gradebooks rendered EMPTY with all the data present.
//     This reads both and merges them.
//
//  2. A missing assignment looked identical to a missing score. Columns are now
//     driven by the COURSES config, which is the authoritative list of what each
//     unit is SUPPOSED to contain (lesson, exercise-1, exercise-2, quiz, plus any
//     case file and unit exam). An activity that never reports therefore shows up
//     as a column of blanks rather than silently not existing, which is what makes
//     "exercises are not working" visible instead of a hunch. activity_coverage
//     summarises exactly that, per activity type.
//
//  Observed-but-unexpected locations are still included, so real student work is
//  never hidden because the config or the manifest lags the pages.
//
//  CELL SOURCE ('attempt' | 'score') is carried explicitly so a number can always
//  be traced back to the pipeline that produced it.
//
//  PERFORMANCE: a handful of grouped queries for the whole class, merged in JS.
//  No query per student, per lesson, or per assignment.
//
//  PII: display names only when the caller explicitly asks; default labels are
//  positional. No student-entered text is read.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');
const { COURSES } = require('../utils');

// progress rows that represent a page visit rather than graded work.
const VISIT_ACTS = new Set(['lesson', 'visit', 'page', 'read']);
const VISIT_SQL = "activity_type NOT IN ('quiz','exam')";

function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }
function round(n) { return Math.round(n); }

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

const ABBR = {
  lesson: 'L', 'exercise-1': 'E1', 'exercise-2': 'E2', 'exercise-3': 'E3',
  quiz: 'Q', exam: 'Exam', 'case-file': 'CF', cfu: 'CFU', lab: 'Lab', code: 'Code',
};
const abbr = (a) => ABBR[a] || a;

// Grade of record over `attempts`, one window-function pass. Retry policy per
// student (retry_override beats class retry_allowed): best ratio when retry is
// on, first attempt when it is off.
const GOR_FOR_CLASS = `
  SELECT student_id, lesson_id, item_id, item_type, score, max_score, attempt_no, tries
  FROM (
    SELECT a.student_id, a.lesson_id, a.item_id, a.item_type, a.score, a.max_score, a.attempt_no,
      COUNT(*) OVER (PARTITION BY a.student_id, a.item_id) AS tries,
      CASE WHEN COALESCE(s.retry_override, c.retry_allowed, 0) != 0
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
`;

function buildGradebook(classKey, opts) {
  const reveal = !!(opts && opts.reveal);
  const cls = db.prepare(`
    SELECT id, class_code, class_name, course, mastery_threshold, retry_allowed, retry_mode, games_graded, teacher_id
    FROM classes WHERE id = ? OR class_code = ?
  `).get(String(classKey), String(classKey).toUpperCase());
  if (!cls) return null;

  const course = cls.course === 'solo' ? String((opts && opts.course) || 'ap-csa') : cls.course;
  const threshold = cls.mastery_threshold == null ? 80 : cls.mastery_threshold;
  const cfg = COURSES[course];

  // Whether the exercise-2 "game" counts toward the grade. NULL means "course
  // default": CSP games are practice (not counted), other courses count them as
  // before. A teacher's explicit 0/1 always wins. When off, an exercise-2 cell
  // behaves like a visit: it can show "done" but never contributes a score.
  const gamesGraded = cls.games_graded == null ? (course !== 'ap-csp') : !!cls.games_graded;
  const isGradedAct = (act) => !VISIT_ACTS.has(act) && !(act === 'exercise-2' && !gamesGraded);

  const roster = db.prepare(`
    SELECT id, display_name, student_ref, active, last_active
    FROM students WHERE class_id = ? ORDER BY created_at, id
  `).all(cls.id);

  // ── Column grid ───────────────────────────────────────────────────────────
  //  EXPECTED: from the COURSES config, the authority on what a unit contains.
  //  This is what makes a never-reporting activity visible as an empty column.
  const items = new Map();          // key `${lesson}|${activity}` -> column def
  const unitOrder = [];
  const ensureItem = (lesson, activity, unit, expected) => {
    const key = `${lesson}|${activity}`;
    if (!items.has(key)) {
      items.set(key, {
        key, lesson_id: lesson, activity, unit: unit || null,
        label: `${lesson} ${abbr(activity)}`,
        expected: !!expected, observed: false, graded_kind: isGradedAct(activity),
        in_manifest: false,
      });
    }
    const it = items.get(key);
    if (unit && !it.unit) it.unit = unit;
    if (expected) it.expected = true;
    return it;
  };

  if (cfg && cfg.units) {
    for (const unitId of Object.keys(cfg.units)) {
      unitOrder.push(unitId);
      const u = cfg.units[unitId];
      for (const lesson of (u.lessons || [])) {
        for (const act of (u.activities || [])) ensureItem(lesson, act, unitId, true);
      }
      if (u.case_file) ensureItem(u.case_file.lesson, 'case-file', unitId, true).label = u.case_file.label || 'Case File';
      if (u.exam) ensureItem(u.exam.lesson, 'exam', unitId, true).label = u.exam.label || 'Unit Exam';
    }
  }

  // Manifest graded items (points authority for the attempts path).
  const manifestRows = db.prepare(`
    SELECT unit, lesson_id, item_id, item_type, points FROM course_manifest WHERE course = ?
  `).all(course);
  const manifestPoints = new Map();
  const manifestLessons = new Set();
  for (const m of manifestRows) {
    manifestLessons.add(m.lesson_id);
    if (m.item_type !== 'visit') {
      manifestPoints.set(m.item_id, m.points);
      ensureItem(m.lesson_id, m.item_type, m.unit, false).in_manifest = true;
    }
  }
  const visitTotal = manifestRows.filter((m) => m.item_type === 'visit').length;

  // ── Denominator authority ─────────────────────────────────────────────────
  //  course_denominators carries the AUTHORED "out of" per (lesson, activity):
  //  exercise-1 is out of 1, exercise-2 out of 6, exercise-3 out of 4, quiz out
  //  of 6. Nothing read it for display, so a cell was denominated by whatever
  //  happened to be recorded instead: a student served 5 of a 6-point quiz showed
  //  "/5", and a partial recording showed a partial denominator. Denominators are
  //  computed at read time, so preferring the authored value fixes every existing
  //  gradebook retroactively without touching a stored row.
  const denomRows = db.prepare(
    'SELECT lesson, activity_type, possible FROM course_denominators WHERE course = ?'
  ).all(course);
  const authoredDenom = new Map(denomRows.map((r) => [`${r.lesson}|${r.activity_type}`, r.possible]));
  const denomFor = (lesson, activity) => authoredDenom.get(`${lesson}|${activity}`);

  // ── Source A: attempts ────────────────────────────────────────────────────
  const gor = db.prepare(GOR_FOR_CLASS).all(cls.id, course);
  const attemptCell = new Map(); // `${sid}|${lesson}|${activity}` -> agg
  for (const g of gor) {
    const it = ensureItem(g.lesson_id, g.item_type, null, false);
    it.observed = true;
    const k = `${g.student_id}|${g.lesson_id}|${g.item_type}`;
    const c = attemptCell.get(k) || { earned: 0, possible: 0, items: 0, tries: 0 };
    c.earned += g.score;
    c.possible += manifestPoints.has(g.item_id) ? manifestPoints.get(g.item_id) : g.max_score;
    c.items += 1;
    c.tries += g.tries;
    attemptCell.set(k, c);
  }

  // ── Source B: progress (score rollups AND completion) ─────────────────────
  const progRows = db.prepare(`
    SELECT student_id, unit, lesson, activity_type, completed, score, attempts
    FROM progress WHERE class_id = ? AND course = ?
  `).all(cls.id, course);
  const progCell = new Map(); // `${sid}|${lesson}|${activity}` -> row
  for (const p of progRows) {
    const it = ensureItem(p.lesson, p.activity_type, p.unit, false);
    if (p.score != null || p.completed) it.observed = true;
    progCell.set(`${p.student_id}|${p.lesson}|${p.activity_type}`, p);
  }

  // Visits, for the per-student completion ratio.
  const visitCount = new Map();
  for (const v of db.prepare(`
    SELECT student_id, COUNT(DISTINCT lesson) n FROM progress
    WHERE class_id = ? AND course = ? AND completed = 1 AND ${VISIT_SQL}
    GROUP BY student_id
  `).all(cls.id, course)) visitCount.set(v.student_id, v.n);

  // Order: unit (config order first), then lesson, then the unit's own activity
  // order so a row reads L, E1, E2, Q the way the course presents it.
  const unitRank = new Map(unitOrder.map((u, i) => [u, i]));
  const actRank = (unit, act) => {
    const u = cfg && cfg.units && cfg.units[unit];
    const list = (u && u.activities) || [];
    const i = list.indexOf(act);
    if (i !== -1) return i;
    if (act === 'case-file') return 90;
    if (act === 'exam') return 91;
    return 50;
  };
  for (const it of items.values()) {
    const d = denomFor(it.lesson_id, it.activity);
    it.denominator = d != null ? d : null;
    it.denominator_source = d != null ? 'authored' : null;
  }

  const itemList = [...items.values()].sort((a, b) => {
    const ua = unitRank.has(a.unit) ? unitRank.get(a.unit) : 999;
    const ub = unitRank.has(b.unit) ? unitRank.get(b.unit) : 999;
    if (ua !== ub) return ua - ub;
    const l = compareLessonId(a.lesson_id, b.lesson_id);
    if (l !== 0) return l;
    return actRank(a.unit, a.activity) - actRank(b.unit, b.activity);
  });

  // Lesson-level rollup columns (the compact view).
  const lessonMap = new Map();
  for (const it of itemList) {
    if (!lessonMap.has(it.lesson_id)) {
      lessonMap.set(it.lesson_id, {
        lesson_id: it.lesson_id, unit: it.unit,
        in_manifest: manifestLessons.has(it.lesson_id),
        class_avg_pct: null, graded_students: 0, passed_students: 0,
      });
    }
  }
  const lessonList = [...lessonMap.values()];

  // ── Student rows ──────────────────────────────────────────────────────────
  const students = roster.map((s, idx) => {
    const cellsByItem = {};
    const lessonAgg = new Map(); // lesson -> {sum, n}
    let earnedSum = 0, possibleSum = 0, pctSum = 0, pctCount = 0, graded = 0, passed = 0;

    for (const it of itemList) {
      const ak = `${s.id}|${it.lesson_id}|${it.activity}`;
      const att = attemptCell.get(ak);
      const pr = progCell.get(ak);
      let cell = null;

      if (att && att.possible > 0 && isGradedAct(it.activity)) {
        const p = pct(att.earned, att.possible);
        // Show the authored "out of" when it exists, rescaling the earned points
        // to match so the pair stays consistent; the percentage is unchanged.
        const authored = denomFor(it.lesson_id, it.activity);
        const possible = authored != null ? authored : att.possible;
        const earned = authored != null
          ? Math.round((p / 100) * authored * 100) / 100
          : Math.round(att.earned * 100) / 100;
        cell = {
          pct: p, source: 'attempt', items: att.items, tries: att.tries,
          earned, possible,
          denominator_source: authored != null ? 'authored' : 'observed',
          passed: p >= threshold, completed: pr ? !!pr.completed : true,
        };
        earnedSum += earned; possibleSum += possible;
      } else if (pr && pr.score != null && isGradedAct(it.activity)) {
        const p = round(pr.score);
        // progress.score is a 0-100 percent, so points are derived, not stored.
        // With an authored denominator that derivation is meaningful and gives a
        // correct "out of"; without one only the percentage is shown.
        const authored = denomFor(it.lesson_id, it.activity);
        cell = {
          pct: p, source: 'score', passed: p >= threshold,
          completed: !!pr.completed, tries: pr.attempts || 0,
        };
        if (authored != null) {
          cell.earned = Math.round((p / 100) * authored * 100) / 100;
          cell.possible = authored;
          cell.denominator_source = 'authored';
        }
        pctSum += p; pctCount += 1;
      } else if ((pr && pr.completed) || (pr && pr.score != null) || (att && att.items)) {
        // Completed but carries no counted number: lesson visits, and any
        // activity the pages mark done without a graded score, including an
        // exercise-2 game when it is set to practice (score present but not
        // counted). Show it as done without contributing to the grade.
        cell = { pct: null, source: 'done', completed: pr ? !!pr.completed : true, passed: null };
      }

      if (cell) {
        cellsByItem[it.key] = cell;
        if (cell.pct != null) {
          graded += 1;
          if (cell.passed) passed += 1;
          const la = lessonAgg.get(it.lesson_id) || { sum: 0, n: 0 };
          la.sum += cell.pct; la.n += 1;
          lessonAgg.set(it.lesson_id, la);
        }
      }
    }

    // Lesson rollup cells for the compact view.
    const cells = {};
    for (const [lesson, la] of lessonAgg) {
      const p = round(la.sum / la.n);
      cells[lesson] = { pct: p, items: la.n, passed: p >= threshold };
    }

    let overallPct = null, basis = 'none';
    if (possibleSum > 0 && pctCount === 0) { overallPct = pct(earnedSum, possibleSum); basis = 'points'; }
    else if (pctCount > 0 && possibleSum === 0) { overallPct = round(pctSum / pctCount); basis = 'percent'; }
    else if (possibleSum > 0 && pctCount > 0) {
      overallPct = round((pct(earnedSum, possibleSum) + pctSum / pctCount) / 2); basis = 'mixed';
    }

    return {
      id: s.id,
      label: reveal ? s.display_name : `Student ${idx + 1}`,
      ref: s.student_ref,
      active: s.active,
      last_active: s.last_active,
      visits: { visited: visitCount.get(s.id) || 0, total: visitTotal },
      items: cellsByItem,
      cells,
      overall: {
        pct: overallPct, basis, items_graded: graded, items_passed: passed,
        earned: Math.round(earnedSum * 100) / 100, possible: possibleSum,
      },
    };
  });

  // ── Per-lesson class averages ─────────────────────────────────────────────
  for (const l of lessonList) {
    let sum = 0, n = 0, pas = 0;
    for (const st of students) {
      const c = st.cells[l.lesson_id];
      if (c && c.pct != null) { sum += c.pct; n += 1; if (c.passed) pas += 1; }
    }
    l.class_avg_pct = n ? round(sum / n) : null;
    l.graded_students = n;
    l.passed_students = pas;
  }

  // ── Per-item class averages + fill rate ───────────────────────────────────
  for (const it of itemList) {
    let sum = 0, n = 0, done = 0;
    for (const st of students) {
      const c = st.items[it.key];
      if (!c) continue;
      if (c.completed) done += 1;
      if (c.pct != null) { sum += c.pct; n += 1; }
    }
    it.class_avg_pct = n ? round(sum / n) : null;
    it.scored_students = n;
    it.completed_students = done;
  }

  // ── ACTIVITY COVERAGE - the "which activity types are actually reporting"
  //  answer. An expected activity with cells but zero scores is the signature of
  //  a grader that is not wired, which is invisible in a lesson-level rollup.
  //  A bare "zero scores" test would also flag a unit exam the class has simply
  //  not reached yet. The real signal is narrower: this activity is expected on a
  //  lesson where a DIFFERENT graded activity is scoring fine. That isolates a
  //  grader that is not wired from work the class has not done yet.
  const lessonHasScores = new Set();
  for (const it of itemList) if (it.scored_students > 0) lessonHasScores.add(it.lesson_id);

  const covMap = new Map();
  for (const it of itemList) {
    const c = covMap.get(it.activity) || {
      activity: it.activity, label: abbr(it.activity),
      graded_kind: it.graded_kind, expected_items: 0, observed_items: 0,
      scored_cells: 0, completed_cells: 0, possible_cells: 0, sum: 0,
      silent_beside_working: 0,
    };
    c.expected_items += it.expected ? 1 : 0;
    c.observed_items += it.observed ? 1 : 0;
    // Does this activity sit on a lesson where something else already grades?
    if (it.graded_kind && it.scored_students === 0 && lessonHasScores.has(it.lesson_id)) c.silent_beside_working += 1;
    c.possible_cells += students.length;
    c.scored_cells += it.scored_students;
    c.completed_cells += it.completed_students;
    if (it.class_avg_pct != null) c.sum += it.class_avg_pct * it.scored_students;
    covMap.set(it.activity, c);
  }
  const activity_coverage = [...covMap.values()].map((c) => ({
    activity: c.activity,
    label: c.label,
    graded_kind: c.graded_kind,
    items: c.expected_items || c.observed_items,
    expected_items: c.expected_items,
    scored_cells: c.scored_cells,
    completed_cells: c.completed_cells,
    possible_cells: c.possible_cells,
    score_rate_pct: pct(c.scored_cells, c.possible_cells),
    avg_pct: c.scored_cells ? round(c.sum / c.scored_cells) : null,
    silent_beside_working: c.silent_beside_working,
    // The flag worth acting on: this activity is graded, is expected, has never
    // recorded a single score, AND sits on lessons where other graded activities
    // are reporting normally. That combination means the grader is not wired,
    // not that the class has not reached the work yet.
    never_scored: c.graded_kind && c.expected_items > 0 && c.scored_cells === 0 && c.silent_beside_working > 0,
  })).sort((a, b) => b.possible_cells - a.possible_cells || a.activity.localeCompare(b.activity));

  const withScores = students.filter((s) => s.overall.pct != null);
  return {
    class: {
      id: cls.id, class_code: cls.class_code, class_name: cls.class_name,
      course: cls.course, teacher_id: cls.teacher_id,
      // retry_mode is the policy ('all' | 'practice' | 'none'); retry_allowed is
      // the derived legacy flag, "may an assessment be retaken", kept in sync.
      mastery_threshold: threshold, retry_allowed: cls.retry_allowed,
      retry_mode: cls.retry_mode || (cls.retry_allowed ? 'all' : 'practice'),
    },
    course,
    anonymized: !reveal,
    units: unitOrder,
    items: itemList,
    lessons: lessonList,
    students,
    activity_coverage,
    summary: {
      students: students.length,
      students_with_scores: withScores.length,
      class_avg_pct: withScores.length
        ? round(withScores.reduce((n, s) => n + s.overall.pct, 0) / withScores.length)
        : null,
      graded_lessons: lessonList.filter((l) => l.graded_students > 0).length,
      lessons_shown: lessonList.length,
      items_shown: itemList.length,
      visit_total: visitTotal,
      never_scored_activities: activity_coverage.filter((a) => a.never_scored).map((a) => a.activity),
      // How many columns have an authoritative "out of". Anything short of the
      // full count is denominated by observation and worth seeding properly.
      denominators_authored: itemList.filter((i) => i.denominator_source === 'authored').length,
      denominators_missing: itemList.filter((i) => i.graded_kind && i.denominator_source !== 'authored').length,
      sources: { attempts: attemptCell.size, score_rollups: progCell.size },
    },
    generated_at: new Date().toISOString(),
  };
}

module.exports = { buildGradebook, compareLessonId, GOR_FOR_CLASS };
