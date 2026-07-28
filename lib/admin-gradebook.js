'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  FULL GRADEBOOK - every score a class has recorded, from BOTH grading paths.
//
//  WHY THIS EXISTS: the original admin gradebook read only the `attempts` table,
//  which is the newer attempt-level path used by the ap-csa / ap-csp pilot. AP
//  Cybersecurity (the course with working grade reporting today, and most of the
//  live classes) records through score_events, which rolls up into progress.score.
//  A Cyber gradebook therefore rendered empty even though the data was all there.
//  This module reads both and merges them, so "their full gradebook" means the
//  whole picture rather than whichever pipeline happens to be wired.
//
//  COLUMNS: the union of the course manifest's graded lessons AND every lesson
//  that actually has a recorded score. Depending on the manifest alone would hide
//  real student work whenever the manifest lags behind the pages (which the health
//  module already reports separately as lesson_missing_from_manifest).
//
//  CELL SOURCE is carried explicitly ('attempt' | 'score') rather than blended
//  into an anonymous number, so a cell can always be traced back to the pipeline
//  that produced it.
//
//  PERFORMANCE: four grouped queries for the whole class, merged in JS. No query
//  per student and no query per lesson.
//
//  PII: display names are returned only when the caller asks; the default labels
//  students by position. No student-entered text is ever read here.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');

const VISIT_ROWS = "activity_type NOT IN ('quiz','exam')";
// progress rows that represent graded work rather than a page visit.
const GRADED_ROWS = "activity_type NOT IN ('lesson','visit','page','read')";

function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }
function round(n) { return Math.round(n); }

// Dotted lesson ids ('1.2', '1.10') must sort numerically per segment or 1.10
// lands before 1.2.
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

// Grade of record over `attempts`, one window-function pass. Retry policy per
// student (retry_override beats class retry_allowed): best ratio when retry is
// on, first attempt when it is off. Same rule the per-student drill uses.
const GOR_FOR_CLASS = `
  SELECT student_id, lesson_id, item_id, item_type, score, max_score, attempt_no, attempts
  FROM (
    SELECT a.student_id, a.lesson_id, a.item_id, a.item_type, a.score, a.max_score, a.attempt_no,
      COUNT(*) OVER (PARTITION BY a.student_id, a.item_id) AS attempts,
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
    SELECT id, class_code, class_name, course, mastery_threshold, retry_allowed, teacher_id
    FROM classes WHERE id = ? OR class_code = ?
  `).get(String(classKey), String(classKey).toUpperCase());
  if (!cls) return null;

  // Solo containers roam across courses, so the caller picks which one to show.
  const course = cls.course === 'solo' ? String((opts && opts.course) || 'ap-csa') : cls.course;
  const threshold = cls.mastery_threshold == null ? 80 : cls.mastery_threshold;

  const roster = db.prepare(`
    SELECT id, display_name, student_ref, active, last_active
    FROM students WHERE class_id = ? ORDER BY created_at, id
  `).all(cls.id);

  // ── Column skeleton: manifest graded lessons ∪ lessons with real scores ────
  const manifestRows = db.prepare(`
    SELECT unit, lesson_id, item_id, item_type, points FROM course_manifest
    WHERE course = ? AND item_type != 'visit'
  `).all(course);
  const visitTotal = db.prepare(
    `SELECT COUNT(*) n FROM course_manifest WHERE course = ? AND item_type = 'visit'`
  ).get(course).n;
  // "Known to the manifest" means the lesson appears there AT ALL, graded row or
  // visit row. Checking only graded rows would paint every column of a course
  // whose manifest carries visits only (Cybersecurity today) as off-manifest.
  const manifestLessons = new Set(
    db.prepare('SELECT DISTINCT lesson_id FROM course_manifest WHERE course = ?').all(course).map((r) => r.lesson_id)
  );

  const lessons = new Map(); // lesson_id -> { lesson_id, unit, possible, items, in_manifest }
  const ensureLesson = (lessonId, unit) => {
    if (!lessons.has(lessonId)) {
      lessons.set(lessonId, {
        lesson_id: lessonId, unit: unit || null, possible: 0, items: 0,
        in_manifest: manifestLessons.has(lessonId),
      });
    }
    const l = lessons.get(lessonId);
    if (unit && !l.unit) l.unit = unit;
    return l;
  };
  for (const m of manifestRows) {
    const l = ensureLesson(m.lesson_id, m.unit);
    l.in_manifest = true;      // graded manifest row: definitively known
    l.possible += m.points;
    l.items += 1;
  }

  // ── Source A: attempts (grade of record) ──────────────────────────────────
  const gor = db.prepare(GOR_FOR_CLASS).all(cls.id, course);
  const attemptByStudentLesson = new Map(); // `${sid}|${lesson}` -> {earned, possible, items, tries}
  const manifestPoints = new Map(manifestRows.map((m) => [m.item_id, m.points]));
  for (const g of gor) {
    ensureLesson(g.lesson_id, null);
    const key = `${g.student_id}|${g.lesson_id}`;
    const cell = attemptByStudentLesson.get(key) || { earned: 0, possible: 0, items: 0, tries: 0 };
    // Manifest points are the max-score authority; fall back to the row's own
    // max_score for items the manifest does not carry yet.
    const possible = manifestPoints.has(g.item_id) ? manifestPoints.get(g.item_id) : g.max_score;
    cell.earned += g.score;
    cell.possible += possible;
    cell.items += 1;
    cell.tries += g.attempts;
    attemptByStudentLesson.set(key, cell);
  }

  // ── Source B: progress.score (the score_events rollup) ────────────────────
  //  One row per (student, lesson, activity_type) carrying a 0-100 percent.
  const progRows = db.prepare(`
    SELECT student_id, unit, lesson, activity_type, score, attempts
    FROM progress
    WHERE class_id = ? AND course = ? AND score IS NOT NULL AND ${GRADED_ROWS}
  `).all(cls.id, course);
  const scoreByStudentLesson = new Map(); // `${sid}|${lesson}` -> { acts: [{type,pct}] }
  for (const p of progRows) {
    ensureLesson(p.lesson, p.unit);
    const key = `${p.student_id}|${p.lesson}`;
    const cell = scoreByStudentLesson.get(key) || { acts: [] };
    cell.acts.push({ type: p.activity_type, pct: round(p.score) });
    scoreByStudentLesson.set(key, cell);
  }

  // ── Visits (completion, not a grade) ──────────────────────────────────────
  const visitRows = db.prepare(`
    SELECT student_id, lesson, COUNT(*) n FROM progress
    WHERE class_id = ? AND course = ? AND completed = 1 AND ${VISIT_ROWS}
    GROUP BY student_id, lesson
  `).all(cls.id, course);
  const visitedSet = new Set(visitRows.map((v) => `${v.student_id}|${v.lesson}`));
  const visitCount = new Map();
  for (const v of visitRows) visitCount.set(v.student_id, (visitCount.get(v.student_id) || 0) + 1);

  const lessonList = [...lessons.values()].sort(
    (a, b) => String(a.unit || '').localeCompare(String(b.unit || '')) || compareLessonId(a.lesson_id, b.lesson_id)
  );

  // ── Assemble student rows ─────────────────────────────────────────────────
  const students = roster.map((s, i) => {
    const cells = {};
    let earnedSum = 0, possibleSum = 0, graded = 0, passed = 0, pctSum = 0, pctCount = 0;

    for (const l of lessonList) {
      const key = `${s.id}|${l.lesson_id}`;
      const att = attemptByStudentLesson.get(key);
      const sc = scoreByStudentLesson.get(key);
      let cell = null;

      if (att && att.possible > 0) {
        const p = pct(att.earned, att.possible);
        cell = {
          pct: p, source: 'attempt', items: att.items, tries: att.tries,
          earned: Math.round(att.earned * 100) / 100, possible: att.possible,
          passed: p >= threshold,
        };
        earnedSum += att.earned; possibleSum += att.possible;
      } else if (sc && sc.acts.length) {
        // Average the activity percentages recorded for this lesson.
        const avg = round(sc.acts.reduce((n, a) => n + a.pct, 0) / sc.acts.length);
        cell = {
          pct: avg, source: 'score', items: sc.acts.length,
          activities: sc.acts, passed: avg >= threshold,
        };
        pctSum += avg; pctCount += 1;
      }

      if (cell) {
        cell.visited = visitedSet.has(key);
        cells[l.lesson_id] = cell;
        graded += 1;
        if (cell.passed) passed += 1;
      } else if (visitedSet.has(key)) {
        cells[l.lesson_id] = { pct: null, source: 'visit', visited: true, passed: null };
      }
    }

    // Overall: points where we have them, otherwise the mean of percentages.
    // Reported with which basis was used so the number is never ambiguous.
    let overallPct = null, basis = 'none';
    if (possibleSum > 0 && pctCount === 0) { overallPct = pct(earnedSum, possibleSum); basis = 'points'; }
    else if (pctCount > 0 && possibleSum === 0) { overallPct = round(pctSum / pctCount); basis = 'percent'; }
    else if (possibleSum > 0 && pctCount > 0) {
      // Mixed: fold the points side into a percentage and average the two means.
      const pointsPct = pct(earnedSum, possibleSum);
      overallPct = round((pointsPct + pctSum / pctCount) / 2);
      basis = 'mixed';
    }

    return {
      id: s.id,
      label: reveal ? s.display_name : `Student ${i + 1}`,
      ref: s.student_ref,
      active: s.active,
      last_active: s.last_active,
      visits: { visited: visitCount.get(s.id) || 0, total: visitTotal },
      cells,
      overall: {
        pct: overallPct, basis,
        items_graded: graded, items_passed: passed,
        earned: Math.round(earnedSum * 100) / 100, possible: possibleSum,
      },
    };
  });

  // ── Per-lesson class averages (which lesson is hurting the class) ─────────
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

  const withScores = students.filter((s) => s.overall.pct != null);
  return {
    class: {
      id: cls.id, class_code: cls.class_code, class_name: cls.class_name,
      course: cls.course, teacher_id: cls.teacher_id,
      mastery_threshold: threshold, retry_allowed: cls.retry_allowed,
    },
    course,
    anonymized: !reveal,
    lessons: lessonList,
    students,
    summary: {
      students: students.length,
      students_with_scores: withScores.length,
      class_avg_pct: withScores.length
        ? round(withScores.reduce((n, s) => n + s.overall.pct, 0) / withScores.length)
        : null,
      graded_lessons: lessonList.filter((l) => l.graded_students > 0).length,
      lessons_shown: lessonList.length,
      visit_total: visitTotal,
      sources: {
        attempts: attemptByStudentLesson.size,
        score_rollups: scoreByStudentLesson.size,
      },
    },
    generated_at: new Date().toISOString(),
  };
}

module.exports = { buildGradebook, compareLessonId };
