'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  EXECUTIVE SUMMARY - one tight page of the KPIs that actually drive decisions,
//  separate from the sprawling /summary and /analytics decks. Ten numbers:
//
//    1. Active teachers (7d)          6. Quiz pass rate
//    2. Active students (7d)          7. Returning student %
//    3. New classrooms this week      8. Daily lesson completions (30d series)
//    4. Lesson completion rate        9. Top 10 most-used lessons
//    5. CFU pass rate                10. Top 10 highest-abandonment lessons
//
//  Read-only. Reuses classifyClass (lib/admin-metrics) as the SINGLE bucketing
//  rule, so "real users" here is the same EXTERNAL + SOLO population every other
//  admin surface reports (owner / prober / audit excluded). Denominators come
//  from course_manifest (the single denominator authority) and pass/mastery is
//  recomputed at read time against each class's CURRENT mastery_threshold and
//  retry policy, so a teacher settings change applies retroactively with no
//  migration - same rule the gradebook uses.
//
//  PERFORMANCE: the real-class id list (dozens to ~100) is built once in JS, then
//  every aggregate runs in SQL filtered by `class_id IN (...)`. No raw progress /
//  attempts / sessions rows stream into memory beyond the small per-lesson and
//  per-student-course rollups, so this stays cheap on the Railway box.
//
//  PII: nothing beyond counts, ratios, and structured course/lesson/item ids.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');
const { classifyClass } = require('./admin-metrics');

// Courses that carry a manifest (the denominator authority). Visit lessons and
// their per-course counts are read live, so adding a course to the manifest
// automatically folds it into the completion-rate denominator with no code edit.
const VISIT_ACTIVITY_EXCLUDE = "('quiz','exam')"; // page-visit rows only; graded rows excluded

function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }
function inClause(ids) { return ids.map(() => '?').join(','); }

// One pass over classes; classification stays in JS where classifyClass owns it.
const stmtClasses = db.prepare(`
  SELECT c.id, c.class_code, c.course, c.active, c.created_at, c.teacher_id,
         t.name AS teacher_name, t.email AS teacher_email
  FROM classes c LEFT JOIN teachers t ON c.teacher_id = t.id
`);

function emptyPayload(generated_at) {
  return {
    generated_at, empty: true,
    kpis: {
      active_teachers_7d: 0,
      active_students_7d: 0, active_students_1d: 0, active_students_30d: 0, students_total: 0,
      new_classrooms_7d: 0, new_classrooms_1d: 0,
      lesson_completion_rate: { pct: 0, completed: 0, assigned: 0 },
      cfu_pass_rate: { pct: 0, passed: 0, items: 0 },
      quiz_pass_rate: { pct: 0, passed: 0, items: 0 },
      returning_student_pct: { pct: 0, returning: 0, measured: 0 },
    },
    daily_completions: { series: [], today: 0, yesterday: 0, last_7d: 0, avg_per_day_7d: 0, last_30d: 0 },
    top_lessons: [],
    top_abandonment: [],
  };
}

function computeExec() {
  const generated_at = new Date().toISOString();
  const classes = stmtClasses.all();

  // Bucket once. Real population = EXTERNAL + SOLO. Keep the useful id splits.
  const realIds = [];
  const extIds = [];      // teacher classrooms only (SOLO excluded)
  const soloIds = [];
  const classById = new Map();
  for (const c of classes) {
    const bucket = classifyClass(c);
    c.bucket = bucket;
    classById.set(c.id, c);
    if (bucket === 'EXTERNAL' || bucket === 'SOLO') realIds.push(c.id);
    if (bucket === 'EXTERNAL') extIds.push(c.id);
    if (bucket === 'SOLO') soloIds.push(c.id);
  }
  if (!realIds.length) return emptyPayload(generated_at);

  const inReal = inClause(realIds);

  // ── 1. Active teachers (7d): teachers whose classroom had a student active in
  //  the last 7 days. Per-class active-student count, summed to the teacher. ────
  const active7ByClass = new Map(db.prepare(
    `SELECT class_id, SUM(CASE WHEN last_active >= datetime('now','-7 days') THEN 1 ELSE 0 END) AS a7
       FROM students WHERE class_id IN (${inReal}) GROUP BY class_id`
  ).all(...realIds).map((r) => [r.class_id, r.a7]));
  const activeTeachers = new Set();
  for (const c of classes) {
    if (c.bucket !== 'EXTERNAL' || !c.teacher_id) continue;
    if ((active7ByClass.get(c.id) || 0) > 0) activeTeachers.add(c.teacher_id);
  }

  // ── 2. Active students (real students by recency) ──────────────────────────
  const recency = db.prepare(`
    SELECT
      SUM(CASE WHEN last_active >= datetime('now','-1 day')  THEN 1 ELSE 0 END) AS a1,
      SUM(CASE WHEN last_active >= datetime('now','-7 days')  THEN 1 ELSE 0 END) AS a7,
      SUM(CASE WHEN last_active >= datetime('now','-30 days') THEN 1 ELSE 0 END) AS a30,
      COUNT(*) AS total
    FROM students WHERE class_id IN (${inReal})
  `).get(...realIds);

  // ── 3. New classrooms this week (teacher classrooms; SOLO 'ME-' accounts are
  //  single-student containers, not classrooms, so they are excluded here) ─────
  let newClassrooms7d = 0, newClassrooms1d = 0;
  if (extIds.length) {
    const inExt = inClause(extIds);
    newClassrooms7d = db.prepare(
      `SELECT COUNT(*) n FROM classes WHERE id IN (${inExt}) AND created_at >= datetime('now','-7 days')`
    ).get(...extIds).n;
    newClassrooms1d = db.prepare(
      `SELECT COUNT(*) n FROM classes WHERE id IN (${inExt}) AND created_at >= datetime('now','-1 day')`
    ).get(...extIds).n;
  }

  // ── 4. Lesson completion rate (manifest-denominated) ───────────────────────
  //  Assigned = for every real student, the visit lessons in the manifest for the
  //  course they belong to (solo accounts roam, so their assignment is the set of
  //  manifest courses they have actually touched). Completed = distinct completed
  //  visit lessons that exist in the manifest. Percentages therefore agree with
  //  the per-student and gradebook views, which use the same manifest authority.
  const visitPerCourse = new Map(db.prepare(
    `SELECT course, COUNT(*) n FROM course_manifest WHERE item_type = 'visit' GROUP BY course`
  ).all().map((r) => [r.course, r.n]));
  const manifestCourses = new Set(visitPerCourse.keys());
  const manifestVisitLesson = new Set(db.prepare(
    `SELECT course, lesson_id FROM course_manifest WHERE item_type = 'visit'`
  ).all().map((r) => `${r.course}|${r.lesson_id}`));

  let assigned = 0;
  // Non-solo: every student is assigned their class course's visit lessons.
  if (extIds.length) {
    const inExt = inClause(extIds);
    const perCourse = db.prepare(
      `SELECT c.course, COUNT(*) n FROM students s JOIN classes c ON s.class_id = c.id
         WHERE s.class_id IN (${inExt}) GROUP BY c.course`
    ).all(...extIds);
    for (const r of perCourse) if (visitPerCourse.has(r.course)) assigned += r.n * visitPerCourse.get(r.course);
  }
  // Solo: assigned = the manifest courses the student has actually studied.
  if (soloIds.length) {
    const inSolo = inClause(soloIds);
    const soloStudentCourses = db.prepare(
      `SELECT DISTINCT student_id, course FROM progress WHERE class_id IN (${inSolo})`
    ).all(...soloIds);
    for (const r of soloStudentCourses) if (visitPerCourse.has(r.course)) assigned += visitPerCourse.get(r.course);
  }
  // Completed = distinct completed visit lessons that are in the manifest.
  const completedRows = db.prepare(
    `SELECT DISTINCT student_id, course, lesson FROM progress
       WHERE completed = 1 AND activity_type NOT IN ${VISIT_ACTIVITY_EXCLUDE} AND class_id IN (${inReal})`
  ).all(...realIds);
  let completed = 0;
  for (const r of completedRows) if (manifestVisitLesson.has(`${r.course}|${r.lesson}`)) completed += 1;

  // ── 5 & 6. CFU / quiz pass rate at grade of record ─────────────────────────
  //  One window-function pass picks each (student, item) grade of record: best
  //  ratio when retry is allowed (retry_override beats class retry_allowed),
  //  first attempt when it is off - the same rule GOR_SELECT uses in admin.js.
  //  Pass is recomputed against the class's CURRENT mastery_threshold, never the
  //  stored write-time snapshot, so teacher settings changes apply retroactively.
  const gorAgg = new Map(db.prepare(`
    SELECT item_type,
           COUNT(*) AS items,
           SUM(CASE WHEN score * 100.0 / max_score >= mastery THEN 1 ELSE 0 END) AS passed
    FROM (
      SELECT a.item_type, a.score, a.max_score,
             COALESCE(c.mastery_threshold, 80) AS mastery,
             CASE WHEN COALESCE(s.retry_override, c.retry_allowed, 0) != 0
               THEN ROW_NUMBER() OVER (PARTITION BY a.student_id, a.course, a.item_id
                      ORDER BY a.score * 1.0 / a.max_score DESC, a.attempt_no ASC)
               ELSE ROW_NUMBER() OVER (PARTITION BY a.student_id, a.course, a.item_id
                      ORDER BY a.attempt_no ASC)
             END AS rn
      FROM attempts a
      JOIN students s ON s.id = a.student_id
      JOIN classes  c ON c.id = a.class_id
      WHERE a.class_id IN (${inReal}) AND a.max_score > 0
    ) WHERE rn = 1
    GROUP BY item_type
  `).all(...realIds).map((r) => [r.item_type, r]));
  const passRate = (type) => {
    const r = gorAgg.get(type);
    const items = r ? r.items : 0;
    const passed = r ? r.passed : 0;
    return { pct: pct(passed, items), passed, items };
  };

  // ── 7. Returning student %: a student with sessions on 2+ distinct days.
  //  First-touch / distinct-day rule, identical to the acquisition deck. Reads
  //  0 until session heartbeats flow, so `measured` is returned to make an empty
  //  denominator legible rather than a silent zero. ────────────────────────────
  const ret = db.prepare(`
    SELECT COUNT(*) AS measured,
           SUM(CASE WHEN days >= 2 THEN 1 ELSE 0 END) AS returned
    FROM (
      SELECT student_id, COUNT(DISTINCT DATE(started_at)) AS days
      FROM sessions WHERE class_id IN (${inReal}) GROUP BY student_id
    )
  `).get(...realIds);
  const returning = ret.returned || 0;
  const measured = ret.measured || 0;

  // ── 8. Daily lesson completions: one point per day for the last 30 days.
  //  Lesson = page-visit completion (graded quiz/exam rows excluded), so this is
  //  "lessons finished per day", the cadence signal. ──────────────────────────
  const compByDay = new Map(db.prepare(
    `SELECT DATE(COALESCE(completed_at, updated_at)) d, COUNT(*) n FROM progress
       WHERE completed = 1 AND activity_type NOT IN ${VISIT_ACTIVITY_EXCLUDE}
         AND COALESCE(completed_at, updated_at) >= DATE('now','-29 days')
         AND class_id IN (${inReal})
       GROUP BY DATE(COALESCE(completed_at, updated_at))`
  ).all(...realIds).map((r) => [r.d, r.n]));
  const today = new Date();
  const series = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    series.push({ date: key, completions: compByDay.get(key) || 0 });
  }
  const last7 = series.slice(-7).reduce((n, p) => n + p.completions, 0);
  const last30 = series.reduce((n, p) => n + p.completions, 0);
  const daily_completions = {
    series,
    today: series[series.length - 1].completions,
    yesterday: series[series.length - 2].completions,
    last_7d: last7,
    avg_per_day_7d: Math.round((last7 / 7) * 10) / 10,
    last_30d: last30,
  };

  // ── 9 & 10. Most-used and highest-abandonment lessons ──────────────────────
  //  One pass over page-visit progress: per (course, lesson), how many distinct
  //  students started it and how many completed it. "Used" ranks by students
  //  who started; "abandonment" ranks by the share who started but never
  //  finished (min 3 starters so a single dropout on a tiny lesson is not noise).
  const ABANDON_MIN_STARTERS = 3;
  const lessonRows = db.prepare(`
    SELECT course, lesson,
           COUNT(DISTINCT student_id) AS started,
           COUNT(DISTINCT CASE WHEN completed = 1 THEN student_id END) AS completed
    FROM progress
    WHERE activity_type NOT IN ${VISIT_ACTIVITY_EXCLUDE} AND class_id IN (${inReal})
    GROUP BY course, lesson
  `).all(...realIds).map((r) => ({
    course: r.course,
    lesson: r.lesson,
    started: r.started,
    completed: r.completed,
    completion_pct: pct(r.completed, r.started),
    abandonment_pct: pct(r.started - r.completed, r.started),
  }));

  const top_lessons = lessonRows
    .slice()
    .sort((a, b) => b.started - a.started || b.completed - a.completed)
    .slice(0, 10);
  const top_abandonment = lessonRows
    .filter((r) => r.started >= ABANDON_MIN_STARTERS)
    .sort((a, b) => b.abandonment_pct - a.abandonment_pct || b.started - a.started)
    .slice(0, 10);

  return {
    generated_at,
    empty: false,
    kpis: {
      active_teachers_7d: activeTeachers.size,
      active_students_7d: recency.a7 || 0,
      active_students_1d: recency.a1 || 0,
      active_students_30d: recency.a30 || 0,
      students_total: recency.total || 0,
      new_classrooms_7d: newClassrooms7d,
      new_classrooms_1d: newClassrooms1d,
      lesson_completion_rate: { pct: pct(completed, assigned), completed, assigned },
      cfu_pass_rate: passRate('cfu'),
      quiz_pass_rate: passRate('quiz'),
      returning_student_pct: { pct: pct(returning, measured), returning, measured },
    },
    daily_completions,
    top_lessons,
    top_abandonment,
    abandonment_min_starters: ABANDON_MIN_STARTERS,
  };
}

module.exports = { computeExec };
