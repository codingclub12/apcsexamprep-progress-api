'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  TEACHER INSPECTOR - "open any teacher's account and see exactly what they
//  have, what they are using, and whether it is working."
//
//  Two views:
//    listTeachers()          every teacher, one row each, with usage + health
//    teacherDetail(id)       one teacher: classes, gradebook readiness, feature
//                            adoption, activity timeline, per-class problems
//
//  FEATURE ADOPTION is the part that answers "is anyone actually using this?".
//  Each signal is derived from data the app already writes, so it is truthful
//  about the past rather than starting from zero today:
//    created a class / added students / students signed in / lessons completed /
//    CFU scores / quiz scores / attempt-level saves / code exercises graded /
//    released answer keys / customized mastery / customized retry
//
//  STUDENT PRIVACY: students are minors. Rosters are returned ANONYMIZED by
//  default ("Student 1..N", stable per class); real display names require an
//  explicit opt-in and are never needed to answer "is the pipeline working".
//  No student-entered text is ever returned by this module.
//
//  Read-only, aggregate SQL, no N+1: per-teacher and per-class counts come from
//  grouped queries joined in JS, not a query per row.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');
const { classifyClass } = require('./admin-metrics');
const dir = require('./school-directory');

const VISIT_ROWS = "activity_type NOT IN ('quiz','exam')";
const DEFAULT_THRESHOLD = 80;

// GRADED SUBMISSIONS LIVE IN TWO LEDGERS, NOT ONE.
//  score_events holds CFU items, per-item writes and whole-activity lesson
//  scores. Client-submitted quizzes (POST /api/student/quiz, which is the path
//  every Cybersecurity quiz page uses through APCS_saveQuizScore) do NOT land
//  there: they write quiz_attempts plus the progress row.
//
//  Counting only score_events therefore reported a real, graded quiz as no
//  activity at all. A class working entirely through quizzes read "0 events" on
//  every quiz signal and tripped the scores_missing alarm, which is the flag
//  that says a reporter is broken. The teacher was told grades were not syncing
//  while the quizzes sat graded in their own gradebook.
//
//  quiz_attempts carries no class_id, so it is joined through students.
const QUIZ_BY_CLASS = `
  SELECT s.class_id AS class_id, q.student_id AS student_id,
         q.attempted_at AS created_at
  FROM quiz_attempts q JOIN students s ON s.id = q.student_id`;

function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }

// Build a Map from a grouped query: key column -> row.
function mapBy(rows, key) {
  const m = new Map();
  for (const r of rows) m.set(r[key], r);
  return m;
}

// ── LIST: every teacher, one row, with usage and health at a glance ──────────
const stmtTeacherRows = db.prepare(`
  SELECT t.id, t.name, t.email, t.school, t.created_at,
         COUNT(c.id) AS classes
  FROM teachers t
  LEFT JOIN classes c ON c.teacher_id = t.id
  GROUP BY t.id
`);

function listTeachers() {
  const generated_at = new Date().toISOString();

  // Bucket every class once so a teacher inherits the classification of the
  // classes they own (owner / prober / audit teachers are labelled, not hidden,
  // because this view is for inspecting accounts including the test ones).
  const classRows = db.prepare(`
    SELECT c.id, c.class_code, c.class_name, c.course, c.active, c.teacher_id,
           t.name AS teacher_name, t.email AS teacher_email
    FROM classes c LEFT JOIN teachers t ON c.teacher_id = t.id
  `).all();
  const bucketByTeacher = new Map();
  const classIdsByTeacher = new Map();
  for (const c of classRows) {
    const b = classifyClass(c);
    if (!bucketByTeacher.has(c.teacher_id) || b !== 'EXTERNAL') bucketByTeacher.set(c.teacher_id, b);
    if (!classIdsByTeacher.has(c.teacher_id)) classIdsByTeacher.set(c.teacher_id, []);
    classIdsByTeacher.get(c.teacher_id).push(c.id);
  }

  // One grouped query per metric, keyed by teacher, joined in JS.
  const g = (sql) => mapBy(db.prepare(sql).all(), 'teacher_id');
  const students = g(`
    SELECT c.teacher_id, COUNT(s.id) AS n,
           SUM(CASE WHEN s.last_active >= datetime('now','-7 days') THEN 1 ELSE 0 END) AS active7,
           SUM(CASE WHEN s.last_active IS NULL THEN 1 ELSE 0 END) AS never_in
    FROM classes c JOIN students s ON s.class_id = c.id GROUP BY c.teacher_id`);
  const visits = g(`
    SELECT c.teacher_id, COUNT(*) AS n, MAX(COALESCE(p.completed_at, p.updated_at)) AS last_ts
    FROM classes c JOIN progress p ON p.class_id = c.id
    WHERE p.completed = 1 AND p.${VISIT_ROWS} GROUP BY c.teacher_id`);
  const scores = g(`
    SELECT c.teacher_id, COUNT(*) AS n, MAX(e.created_at) AS last_ts
    FROM classes c JOIN score_events e ON e.class_id = c.id GROUP BY c.teacher_id`);
  const quizzes = g(`
    SELECT c.teacher_id, COUNT(*) AS n, MAX(q.created_at) AS last_ts
    FROM classes c JOIN (${QUIZ_BY_CLASS}) q ON q.class_id = c.id GROUP BY c.teacher_id`);
  const attempts = g(`
    SELECT c.teacher_id, COUNT(*) AS n, MAX(a.created_at) AS last_ts
    FROM classes c JOIN attempts a ON a.class_id = c.id GROUP BY c.teacher_id`);
  const releases = g(`
    SELECT c.teacher_id, COUNT(*) AS n
    FROM classes c JOIN key_releases k ON k.class_id = c.id GROUP BY c.teacher_id`);
  const ents = g(`
    SELECT teacher_id, COUNT(*) AS n FROM entitlements
    WHERE status = 'active' AND (expires_at IS NULL OR expires_at > datetime('now'))
    GROUP BY teacher_id`);

  const teachers = stmtTeacherRows.all().map((t) => {
    const st = students.get(t.id), vi = visits.get(t.id), sc = scores.get(t.id), at = attempts.get(t.id);
    const qz = quizzes.get(t.id);
    const nStudents = st ? st.n : 0;
    const nScores = (sc ? sc.n : 0) + (qz ? qz.n : 0);
    const nAttempts = at ? at.n : 0;
    const nVisits = vi ? vi.n : 0;
    const last = [vi && vi.last_ts, sc && sc.last_ts, qz && qz.last_ts, at && at.last_ts]
      .filter(Boolean).sort().pop() || null;
    const es = dir.expectedStart(t.email);

    // The single most useful at-a-glance judgement: is this account healthy,
    // idle, or actively broken (students working but nothing being graded)?
    let status = 'empty';
    if (nScores > 0 || nAttempts > 0) status = 'reporting';
    else if (nVisits > 0) status = 'scores_missing';   // using pages, no grades
    else if (nStudents > 0) status = 'roster_only';

    return {
      id: t.id, name: t.name, email: t.email, school: t.school, created_at: t.created_at,
      bucket: bucketByTeacher.get(t.id) || 'EXTERNAL',
      state: es.state, expected_start: es.date,
      classes: t.classes,
      students: nStudents,
      active_7d: st ? st.active7 : 0,
      never_signed_in: st ? st.never_in : 0,
      lessons_completed: nVisits,
      score_events: nScores,
      attempts: nAttempts,
      key_releases: releases.get(t.id) ? releases.get(t.id).n : 0,
      entitlements: ents.get(t.id) ? ents.get(t.id).n : 0,
      last_activity: last,
      status,
    };
  }).sort((a, b) => b.students - a.students || b.classes - a.classes);

  return { generated_at, count: teachers.length, teachers };
}

// ── DETAIL: one teacher, everything ──────────────────────────────────────────
function teacherDetail(teacherId, opts) {
  const anon = !(opts && opts.reveal === true); // anonymized unless explicitly revealed
  const t = db.prepare(
    'SELECT id, name, email, school, created_at FROM teachers WHERE id = ? OR email = ?'
  ).get(teacherId, String(teacherId).toLowerCase());
  if (!t) return null;

  const classes = db.prepare(`
    SELECT c.id, c.class_code, c.class_name, c.course, c.active, c.created_at,
           c.mastery_threshold, c.retry_allowed
    FROM classes c WHERE c.teacher_id = ? ORDER BY c.created_at DESC
  `).all(t.id);
  const ids = classes.map((c) => c.id);

  const entitlements = db.prepare(`
    SELECT course, status, source, granted_at, expires_at,
           (status = 'active' AND (expires_at IS NULL OR expires_at > datetime('now'))) AS live
    FROM entitlements WHERE teacher_id = ? ORDER BY granted_at DESC
  `).all(t.id);

  const empty = {
    teacher: { ...t, bucket: classifyClass({ teacher_email: t.email, teacher_name: t.name }), ...dirInfo(t.email) },
    entitlements, classes: [], totals: zeroTotals(), feature_usage: featureUsage({}), activity_30d: [], anonymized: anon,
  };
  if (!ids.length) return empty;

  const ph = ids.map(() => '?').join(',');
  // reps is how many times the query repeats the class-id list. A query that
  // unions the two graded ledgers filters each branch on its own index, so it
  // binds the ids twice rather than filtering the union after the fact.
  const bind = (reps) => { const p = []; for (let i = 0; i < (reps || 1); i++) p.push(...ids); return p; };
  const byClass = (sql, reps) => mapBy(db.prepare(sql).all(...bind(reps)), 'class_id');

  const stu = byClass(`
    SELECT class_id, COUNT(*) AS students,
           SUM(CASE WHEN last_active >= datetime('now','-7 days') THEN 1 ELSE 0 END) AS active7,
           SUM(CASE WHEN last_active IS NULL THEN 1 ELSE 0 END) AS never_in,
           MAX(last_active) AS last_seen
    FROM students WHERE class_id IN (${ph}) GROUP BY class_id`);
  const vis = byClass(`
    SELECT class_id, COUNT(*) AS n, COUNT(DISTINCT student_id) AS students,
           MAX(COALESCE(completed_at, updated_at)) AS last_ts
    FROM progress WHERE completed = 1 AND ${VISIT_ROWS} AND class_id IN (${ph}) GROUP BY class_id`);
  // Both graded ledgers, unioned, so every count below sees a quiz submission as
  // the graded submission it is. score_events and quiz_attempts never overlap:
  // the quiz route writes only quiz_attempts.
  const sco = byClass(`
    SELECT class_id, COUNT(*) AS n, COUNT(DISTINCT student_id) AS students,
           MAX(created_at) AS last_ts, MIN(created_at) AS first_ts
    FROM (
      SELECT class_id, student_id, created_at FROM score_events WHERE class_id IN (${ph})
      UNION ALL
      SELECT class_id, student_id, created_at FROM (${QUIZ_BY_CLASS}) WHERE class_id IN (${ph})
    ) GROUP BY class_id`, 2);
  const att = byClass(`
    SELECT class_id, COUNT(*) AS n, COUNT(DISTINCT student_id) AS students,
           SUM(passed) AS passed, MAX(created_at) AS last_ts
    FROM attempts WHERE class_id IN (${ph}) GROUP BY class_id`);
  const rel = byClass(`
    SELECT class_id, COUNT(*) AS n, MAX(released_at) AS last_ts
    FROM key_releases WHERE class_id IN (${ph}) GROUP BY class_id`);
  // Graded progress rows (the score_events rollup the gradebook renders). Counted
  // so a class can never be flagged "scores missing" while its own gradebook is
  // full: both views must answer the "is anything graded here" question the same way.
  const roll = byClass(`
    SELECT class_id, COUNT(*) AS n FROM progress
    WHERE class_id IN (${ph}) AND score IS NOT NULL
      AND activity_type NOT IN ('lesson','visit','page','read')
    GROUP BY class_id`);

  // Graded submissions split by kind, so "are they using CFUs vs quizzes vs
  // everything else" is answerable per class. In score_events, activity_type is
  // 'cfu'/'quiz' for those paths and the activity name otherwise, so exercises,
  // labs and exams fall into 'other'.
  //
  // The quiz bucket unions quiz_attempts in. Reading it off score_events alone
  // made it structurally always zero for the client-submitted quiz path, which
  // is every Cybersecurity quiz page: the row could never light up no matter how
  // many quizzes a class took.
  const kindRows = db.prepare(`
    SELECT class_id,
      SUM(CASE WHEN activity_type = 'cfu'  THEN 1 ELSE 0 END) AS cfu,
      SUM(CASE WHEN activity_type = 'quiz' THEN 1 ELSE 0 END) AS quiz,
      SUM(CASE WHEN activity_type NOT IN ('cfu','quiz') THEN 1 ELSE 0 END) AS other
    FROM (
      SELECT class_id, activity_type FROM score_events WHERE class_id IN (${ph})
      UNION ALL
      SELECT class_id, 'quiz' AS activity_type FROM (${QUIZ_BY_CLASS}) WHERE class_id IN (${ph})
    ) GROUP BY class_id`).all(...bind(2));
  const kinds = mapBy(kindRows, 'class_id');

  const classViews = classes.map((c) => {
    const s = stu.get(c.id), v = vis.get(c.id), e = sco.get(c.id), a = att.get(c.id), k = kinds.get(c.id);
    const nStudents = s ? s.students : 0;
    const nVisits = v ? v.n : 0;
    const nScores = e ? e.n : 0;
    const nAttempts = a ? a.n : 0;
    const nRollups = roll.get(c.id) ? roll.get(c.id).n : 0;
    const anyGraded = nScores + nAttempts + nRollups;
    const last = [s && s.last_seen, v && v.last_ts, e && e.last_ts, a && a.last_ts].filter(Boolean).sort().pop() || null;

    // Per-class problems, phrased the way an operator would act on them.
    const problems = [];
    if (nStudents === 0) problems.push({ code: 'no_students', severity: 'info', text: 'No students enrolled yet.' });
    if (nStudents > 0 && nVisits === 0 && anyGraded === 0) {
      problems.push({ code: 'no_activity', severity: 'warn', text: 'Students enrolled but no activity of any kind recorded.' });
    }
    if (nVisits > 0 && anyGraded === 0) {
      problems.push({ code: 'scores_missing', severity: 'critical', text: 'Lessons are being completed but no scores are arriving. Grading reporter is likely not firing on these pages.' });
    }
    if (s && s.never_in > 0 && s.never_in === nStudents && nStudents > 0) {
      problems.push({ code: 'nobody_signed_in', severity: 'warn', text: 'No student on this roster has ever signed in.' });
    }
    if (last && last < new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 19).replace('T', ' ') && anyGraded > 0) {
      problems.push({ code: 'went_quiet', severity: 'warn', text: 'Recorded work before, but nothing in the last 14 days.' });
    }

    return {
      id: c.id, class_code: c.class_code, class_name: c.class_name, course: c.course,
      active: c.active, created_at: c.created_at,
      mastery_threshold: c.mastery_threshold, retry_allowed: c.retry_allowed,
      customized: (c.mastery_threshold != null && c.mastery_threshold !== DEFAULT_THRESHOLD) || c.retry_allowed === 1,
      students: nStudents,
      active_7d: s ? s.active7 : 0,
      never_signed_in: s ? s.never_in : 0,
      lessons_completed: nVisits,
      students_with_visits: v ? v.students : 0,
      score_events: nScores,
      graded_items: nRollups,
      students_with_scores: e ? e.students : 0,
      score_kinds: { cfu: k ? k.cfu : 0, quiz: k ? k.quiz : 0, other: k ? k.other : 0 },
      attempts: nAttempts,
      attempts_passed: a ? (a.passed || 0) : 0,
      key_releases: rel.get(c.id) ? rel.get(c.id).n : 0,
      first_graded_at: e ? e.first_ts : null,
      last_activity: last,
      problems,
    };
  });

  // ── Roster, anonymized by default ─────────────────────────────────────────
  //  Ordered by created_at so "Student 3" means the same person across refreshes.
  const rosterRows = db.prepare(`
    SELECT id, class_id, display_name, active, last_active, created_at
    FROM students WHERE class_id IN (${ph}) ORDER BY class_id, created_at, id
  `).all(...ids);
  const perClassIndex = new Map();
  const scoreByStudent = mapBy(db.prepare(
    `SELECT student_id, COUNT(*) AS n, MAX(created_at) AS last_ts FROM (
       SELECT class_id, student_id, created_at FROM score_events WHERE class_id IN (${ph})
       UNION ALL
       SELECT class_id, student_id, created_at FROM (${QUIZ_BY_CLASS}) WHERE class_id IN (${ph})
     ) GROUP BY student_id`).all(...bind(2)), 'student_id');
  const visitByStudent = mapBy(db.prepare(
    `SELECT student_id, COUNT(*) AS n FROM progress
      WHERE completed = 1 AND ${VISIT_ROWS} AND class_id IN (${ph}) GROUP BY student_id`).all(...ids), 'student_id');
  const attemptByStudent = mapBy(db.prepare(
    `SELECT student_id, COUNT(*) AS n FROM attempts
      WHERE class_id IN (${ph}) GROUP BY student_id`).all(...ids), 'student_id');
  // progress.score is the score_events rollup and is what the gradebook renders,
  // so a student can legitimately have grades here with no rows in either ledger
  // (legacy data, or a rollup written by another path). Counting it keeps the
  // per-student sync flag from contradicting the gradebook next to it.
  const rollupByStudent = mapBy(db.prepare(
    `SELECT student_id, COUNT(*) AS n FROM progress
      WHERE class_id IN (${ph}) AND score IS NOT NULL
        AND activity_type NOT IN ('lesson','visit','page','read')
      GROUP BY student_id`).all(...ids), 'student_id');

  const roster = rosterRows.map((s) => {
    const n = (perClassIndex.get(s.class_id) || 0) + 1;
    perClassIndex.set(s.class_id, n);
    const sc = scoreByStudent.get(s.id), vi = visitByStudent.get(s.id), at = attemptByStudent.get(s.id);
    const ro = rollupByStudent.get(s.id);
    const graded = (sc ? sc.n : 0) + (at ? at.n : 0) + (ro ? ro.n : 0);
    return {
      id: s.id,
      class_id: s.class_id,
      label: anon ? `Student ${n}` : s.display_name,
      active: s.active,
      last_active: s.last_active,
      lessons_completed: vi ? vi.n : 0,
      score_events: sc ? sc.n : 0,
      attempts: at ? at.n : 0,
      graded_items: ro ? ro.n : 0,
      // The per-student version of the sync question: true when anything graded
      // exists, false when the student is visiting lessons but nothing graded is
      // arriving, null when there is no activity at all to judge.
      syncing: graded > 0 ? true : ((vi ? vi.n : 0) > 0 ? false : null),
    };
  });

  // ── Totals + feature adoption ─────────────────────────────────────────────
  const sum = (arr, k) => arr.reduce((n, x) => n + (x[k] || 0), 0);
  const totals = {
    classes: classViews.length,
    active_classes: classViews.filter((c) => c.active).length,
    students: sum(classViews, 'students'),
    active_7d: sum(classViews, 'active_7d'),
    never_signed_in: sum(classViews, 'never_signed_in'),
    lessons_completed: sum(classViews, 'lessons_completed'),
    score_events: sum(classViews, 'score_events'),
    attempts: sum(classViews, 'attempts'),
    key_releases: sum(classViews, 'key_releases'),
    last_activity: classViews.map((c) => c.last_activity).filter(Boolean).sort().pop() || null,
  };

  const feature_usage = featureUsage({
    classes: totals.classes,
    multi_class: totals.classes > 1,
    students: totals.students,
    signed_in: totals.students - totals.never_signed_in,
    lessons: totals.lessons_completed,
    cfu: sum(classViews.map((c) => ({ n: c.score_kinds.cfu })), 'n'),
    quiz: sum(classViews.map((c) => ({ n: c.score_kinds.quiz })), 'n'),
    code: sum(classViews.map((c) => ({ n: c.score_kinds.other })), 'n'),
    attempts: totals.attempts,
    releases: totals.key_releases,
    customized: classViews.some((c) => c.customized),
    paid: entitlements.some((e) => e.live),
  });

  // ── 30-day activity timeline across all three writers ─────────────────────
  const series = (sql, reps) => {
    const m = {};
    for (const r of db.prepare(sql).all(...bind(reps))) m[r.d] = r.n;
    return m;
  };
  const vDay = series(`SELECT DATE(COALESCE(completed_at, updated_at)) d, COUNT(*) n FROM progress
    WHERE completed = 1 AND ${VISIT_ROWS} AND class_id IN (${ph})
      AND COALESCE(completed_at, updated_at) >= DATE('now','-29 days') GROUP BY d`);
  const sDay = series(`SELECT DATE(created_at) d, COUNT(*) n FROM (
      SELECT class_id, created_at FROM score_events WHERE class_id IN (${ph})
      UNION ALL
      SELECT class_id, created_at FROM (${QUIZ_BY_CLASS}) WHERE class_id IN (${ph})
    ) WHERE created_at >= DATE('now','-29 days') GROUP BY d`, 2);
  const aDay = series(`SELECT DATE(created_at) d, COUNT(*) n FROM attempts
    WHERE class_id IN (${ph}) AND created_at >= DATE('now','-29 days') GROUP BY d`);
  const today = new Date();
  const activity_30d = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    activity_30d.push({ date: key, lessons: vDay[key] || 0, scores: sDay[key] || 0, attempts: aDay[key] || 0 });
  }

  return {
    teacher: {
      ...t,
      bucket: classifyClass({ teacher_email: t.email, teacher_name: t.name, class_code: '' }),
      ...dirInfo(t.email),
    },
    entitlements,
    totals,
    feature_usage,
    classes: classViews,
    roster,
    activity_30d,
    anonymized: anon,
    generated_at: new Date().toISOString(),
  };
}

function dirInfo(email) {
  const g = dir.lookup(email);
  const es = dir.expectedStart(email);
  return {
    school_guess: g.label || null,
    state: es.state || null,
    country: g.country || null,
    expected_start: es.date || null,
    expected_start_approx: es.approx,
  };
}

function zeroTotals() {
  return {
    classes: 0, active_classes: 0, students: 0, active_7d: 0, never_signed_in: 0,
    lessons_completed: 0, score_events: 0, attempts: 0, key_releases: 0, last_activity: null,
  };
}

// Turn raw counts into an explicit adopted / not-adopted checklist. This is the
// "what has this teacher actually used, and what have they never touched" view,
// which is what tells you whether a feature is earning its keep.
function featureUsage(v) {
  const f = (key, label, used, detail) => ({ key, label, used: !!used, detail: detail || '' });
  return [
    f('created_class', 'Created a class', (v.classes || 0) > 0, `${v.classes || 0} class(es)`),
    f('multiple_classes', 'Runs multiple classes', v.multi_class, v.multi_class ? 'yes' : 'single class'),
    f('added_students', 'Added students', (v.students || 0) > 0, `${v.students || 0} enrolled`),
    f('students_signed_in', 'Students signed in', (v.signed_in || 0) > 0, `${v.signed_in || 0} have signed in`),
    f('lessons', 'Students completing lessons', (v.lessons || 0) > 0, `${v.lessons || 0} completions`),
    f('cfu', 'CFU checks scoring', (v.cfu || 0) > 0, `${v.cfu || 0} events`),
    f('quiz', 'Quizzes scoring', (v.quiz || 0) > 0, `${v.quiz || 0} events`),
    // The catch-all bucket: every graded submission that is not a CFU or a quiz.
    // On Cybersecurity that is overwhelmingly exercises and labs, so the old
    // "Code exercises graded" label named the wrong feature on the account that
    // uses it most.
    f('code', 'Exercises and labs graded', (v.code || 0) > 0, `${v.code || 0} events`),
    f('attempts', 'Attempt-level saves', (v.attempts || 0) > 0, `${v.attempts || 0} attempts`),
    f('key_release', 'Released answer keys', (v.releases || 0) > 0, `${v.releases || 0} released`),
    f('settings', 'Customized mastery / retry', v.customized, v.customized ? 'changed from defaults' : 'defaults'),
    f('paid', 'Holds a paid entitlement', v.paid, v.paid ? 'active' : 'free'),
  ];
}

module.exports = { listTeachers, teacherDetail };
