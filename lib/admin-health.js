'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  PIPELINE HEALTH - "is the data actually flowing, and where is it broken?"
//
//  There are FOUR independent write paths that feed a gradebook, and a teacher
//  sees a wrong or empty gradebook whenever any one of them silently stops:
//
//    1. progress (visits)   page-visit completions      routes/student.js
//    2. score_events        CFU / exercise ledger       routes/student.js  /score
//    3. attempts            attempt-level submissions   routes/progress.js /attempt
//    4. quiz_attempts       legacy quiz path            (historical)
//
//  Nothing errors when a reporter is missing from a page: the write simply never
//  arrives, so the failure is INVISIBLE unless something looks for the absence.
//  That is what this module does. Every check is phrased as "X exists but the Y
//  that should accompany it does not", which is the shape a silent-drop bug takes.
//
//  Read-only. Reuses classifyClass (lib/admin-metrics) so the population matches
//  every other admin surface (owner / prober / audit excluded). All checks are
//  aggregate SQL filtered by class_id IN (...); no per-row loops, no N+1.
//
//  PII: counts, ids, structured course/unit/lesson keys, and class codes only.
//  No student names and no student-entered text ever leave this module.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');
const { classifyClass } = require('./admin-metrics');
const { COURSES } = require('../utils');

// A finding's severity. `critical` means a teacher is looking at a broken or
// empty gradebook right now; `warn` means something is drifting and will bite
// later; `info` is context, not a problem.
const CRITICAL = 'critical', WARN = 'warn', INFO = 'info';

const VISIT_ROWS = "activity_type NOT IN ('quiz','exam')";

function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }
function inClause(ids) { return ids.map(() => '?').join(','); }

const stmtClasses = db.prepare(`
  SELECT c.id, c.class_code, c.class_name, c.course, c.active, c.created_at, c.teacher_id,
         t.name AS teacher_name, t.email AS teacher_email
  FROM classes c LEFT JOIN teachers t ON c.teacher_id = t.id
`);

// Is this (course, unit) a location the app's own COURSES config knows about?
// score_events accepts unknown locations on purpose (never block a student's
// work on a config lag) and flags them; this recomputes the flag at read time so
// drift surfaces on the dashboard instead of only in a write-time response.
function isRecognized(course, unit) {
  const c = COURSES[course];
  return !!(c && c.units && c.units[unit]);
}

function computeHealth() {
  const generated_at = new Date().toISOString();
  const classes = stmtClasses.all();

  const realIds = [];
  const classById = new Map();
  for (const c of classes) {
    c.bucket = classifyClass(c);
    classById.set(c.id, c);
    if (c.bucket === 'EXTERNAL' || c.bucket === 'SOLO') realIds.push(c.id);
  }

  const findings = [];
  const add = (severity, code, title, detail, items) => {
    findings.push({
      severity, code, title, detail,
      count: items ? items.length : 0,
      items: items || [],
    });
  };

  if (!realIds.length) {
    return {
      generated_at, empty: true,
      pipelines: { visits: 0, score_events: 0, attempts: 0, quiz_attempts: 0 },
      findings: [], totals: { critical: 0, warn: 0, info: 0 },
    };
  }
  const inReal = inClause(realIds);
  const label = (id) => {
    const c = classById.get(id);
    return c ? { class_code: c.class_code, class_name: c.class_name, course: c.course, teacher: c.teacher_name, teacher_id: c.teacher_id } : { class_code: id };
  };

  // ── Pipeline volumes (are the four writers alive at all?) ──────────────────
  const one = (sql) => db.prepare(sql).get(...realIds).n;
  const pipelines = {
    visits: one(`SELECT COUNT(*) n FROM progress WHERE completed = 1 AND ${VISIT_ROWS} AND class_id IN (${inReal})`),
    score_events: one(`SELECT COUNT(*) n FROM score_events WHERE class_id IN (${inReal})`),
    attempts: one(`SELECT COUNT(*) n FROM attempts WHERE class_id IN (${inReal})`),
    quiz_attempts: db.prepare(
      `SELECT COUNT(*) n FROM quiz_attempts q JOIN students s ON s.id = q.student_id WHERE s.class_id IN (${inReal})`
    ).get(...realIds).n,
  };
  const recent = {
    score_events_7d: one(`SELECT COUNT(*) n FROM score_events WHERE created_at >= datetime('now','-7 days') AND class_id IN (${inReal})`),
    attempts_7d: one(`SELECT COUNT(*) n FROM attempts WHERE created_at >= datetime('now','-7 days') AND class_id IN (${inReal})`),
    visits_7d: one(`SELECT COUNT(*) n FROM progress WHERE completed = 1 AND ${VISIT_ROWS} AND COALESCE(completed_at, updated_at) >= datetime('now','-7 days') AND class_id IN (${inReal})`),
  };

  // ── CHECK 1: rostered classes with zero graded work ───────────────────────
  //  Students are enrolled and the class is live, but neither score_events nor
  //  attempts has ever recorded anything. Either nobody has done work yet, or
  //  the grading reporters are not wired on the pages they are using.
  const noGraded = db.prepare(`
    SELECT c.id,
           (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS students,
           (SELECT COUNT(*) FROM progress p WHERE p.class_id = c.id AND p.completed = 1 AND ${VISIT_ROWS}) AS visits
    FROM classes c
    WHERE c.id IN (${inReal})
      AND (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) > 0
      AND NOT EXISTS (SELECT 1 FROM score_events e WHERE e.class_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.class_id = c.id)
    ORDER BY students DESC
  `).all(...realIds).map((r) => ({ ...label(r.id), students: r.students, visits: r.visits }));
  if (noGraded.length) {
    // Visits but no scores is the loud case: they ARE using the pages.
    const withVisits = noGraded.filter((r) => r.visits > 0);
    add(withVisits.length ? CRITICAL : WARN, 'class_no_graded_work',
      'Classes with students but no graded work recorded',
      withVisits.length
        ? `${withVisits.length} of these have page visits but zero scores, which is the signature of a grading reporter that is not firing on the pages those students are using.`
        : 'No scores and no visits yet. Most likely simply not started.',
      noGraded);
  }

  // ── CHECK 2: students visiting lessons but never scoring ──────────────────
  //  The single clearest "scores are not syncing" signal: the student is
  //  completing lesson pages, so they are definitely on the site, yet not one
  //  CFU or quiz result has ever arrived for them.
  const visitNoScore = db.prepare(`
    SELECT p.class_id, COUNT(DISTINCT p.student_id) AS students
    FROM progress p
    WHERE p.completed = 1 AND ${VISIT_ROWS} AND p.class_id IN (${inReal})
      AND NOT EXISTS (SELECT 1 FROM score_events e WHERE e.student_id = p.student_id)
      AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.student_id = p.student_id)
    GROUP BY p.class_id
    ORDER BY students DESC
  `).all(...realIds).map((r) => ({ ...label(r.class_id), students_affected: r.students }));
  if (visitNoScore.length) {
    const total = visitNoScore.reduce((n, r) => n + r.students_affected, 0);
    add(CRITICAL, 'students_visit_no_score',
      'Students completing lessons but never recording a score',
      `${total} student(s) across ${visitNoScore.length} class(es) have completed lesson pages but have never had a single CFU or quiz result arrive. If the pages they used contain graded items, the score reporter is not reaching this API.`,
      visitNoScore);
  }

  // ── CHECK 3: score_events landing on unrecognized course/unit ─────────────
  //  Stored on purpose (never block a student), but a location the COURSES
  //  config does not know cannot roll up correctly into a gradebook.
  const locRows = db.prepare(`
    SELECT course, unit, COUNT(*) AS events, COUNT(DISTINCT student_id) AS students,
           MAX(created_at) AS last_seen
    FROM score_events WHERE class_id IN (${inReal})
    GROUP BY course, unit
  `).all(...realIds);
  const badLoc = locRows.filter((r) => !isRecognized(r.course, r.unit))
    .map((r) => ({ course: r.course, unit: r.unit, events: r.events, students: r.students, last_seen: r.last_seen }))
    .sort((a, b) => b.events - a.events);
  if (badLoc.length) {
    add(CRITICAL, 'score_events_unrecognized_location',
      'Scores arriving for course/unit combinations the app does not recognize',
      'These scores were stored so no student work is lost, but the location is not in the COURSES config, so they cannot roll up into a gradebook correctly. Usually a page sending a wrong or stale course/unit value.',
      badLoc);
  }

  // ── CHECK 4: score events exist but the progress rollup is missing/blank ──
  //  /score writes an event and then upserts progress.score. A row with events
  //  but a NULL score means the rollup half did not land: the ledger has the
  //  work, the gradebook shows nothing.
  const rollupGaps = db.prepare(`
    SELECT e.class_id, COUNT(*) AS combos
    FROM (
      SELECT DISTINCT student_id, class_id, course, unit, lesson, activity_type
      FROM score_events WHERE class_id IN (${inReal})
    ) e
    LEFT JOIN progress p
      ON p.student_id = e.student_id AND p.course = e.course AND p.unit = e.unit
     AND p.lesson = e.lesson AND p.activity_type = e.activity_type
    WHERE p.id IS NULL OR p.score IS NULL
    GROUP BY e.class_id
    ORDER BY combos DESC
  `).all(...realIds).map((r) => ({ ...label(r.class_id), affected_items: r.combos }));
  if (rollupGaps.length) {
    const total = rollupGaps.reduce((n, r) => n + r.affected_items, 0);
    add(CRITICAL, 'score_rollup_missing',
      'Recorded scores that never rolled up into the gradebook',
      `${total} item(s) have score events but no corresponding progress score. The work was captured but the teacher's gradebook will read blank for it.`,
      rollupGaps);
  }

  // ── CHECK 5: graded work on lessons missing from the manifest ─────────────
  //  course_manifest is the denominator authority. Work on a lesson with no
  //  manifest row cannot be counted in any percentage, so completion rates
  //  silently understate reality.
  const manifestGaps = db.prepare(`
    SELECT e.course, e.lesson, COUNT(*) AS events, COUNT(DISTINCT e.student_id) AS students
    FROM score_events e
    WHERE e.class_id IN (${inReal})
      AND NOT EXISTS (
        SELECT 1 FROM course_manifest m WHERE m.course = e.course AND m.lesson_id = e.lesson
      )
    GROUP BY e.course, e.lesson
    ORDER BY events DESC
    LIMIT 50
  `).all(...realIds);
  if (manifestGaps.length) {
    add(WARN, 'lesson_missing_from_manifest',
      'Graded work on lessons that are not in the course manifest',
      'These lessons have real student work but no manifest row, so they are invisible to every percentage on every dashboard. Add manifest rows to make them count.',
      manifestGaps);
  }

  // ── CHECK 6: classes that were active and then went silent ───────────────
  const stale = db.prepare(`
    SELECT c.id, MAX(x.ts) AS last_ts, COUNT(*) AS events
    FROM classes c
    JOIN (
      SELECT class_id, created_at AS ts FROM score_events WHERE class_id IN (${inReal})
      UNION ALL
      SELECT class_id, created_at AS ts FROM attempts WHERE class_id IN (${inReal})
    ) x ON x.class_id = c.id
    WHERE c.id IN (${inReal}) AND c.active = 1
    GROUP BY c.id
    HAVING MAX(x.ts) < datetime('now','-14 days')
    ORDER BY last_ts ASC
  `).all(...realIds, ...realIds, ...realIds)
    .map((r) => ({ ...label(r.id), last_graded_activity: r.last_ts, total_graded_events: r.events }));
  if (stale.length) {
    add(WARN, 'class_went_quiet',
      'Active classes with no graded activity in 14+ days',
      'These classes recorded graded work before and then stopped. Expected over a school break; worth a look otherwise, since a page change can silently break reporting.',
      stale);
  }

  // ── CHECK 7: rostered students who have never signed in ───────────────────
  const neverIn = db.prepare(`
    SELECT class_id, COUNT(*) AS students FROM students
    WHERE class_id IN (${inReal}) AND last_active IS NULL
    GROUP BY class_id ORDER BY students DESC
  `).all(...realIds).map((r) => ({ ...label(r.class_id), students: r.students }));
  if (neverIn.length) {
    const total = neverIn.reduce((n, r) => n + r.students, 0);
    add(INFO, 'students_never_signed_in',
      'Rostered students who have never signed in',
      `${total} student account(s) exist but have never had a session. Normal before a term starts; a signal of a broken join link once class is running.`,
      neverIn);
  }

  // ── CHECK 8: the two graded pipelines disagree ────────────────────────────
  //  score_events and attempts are separate writers. A course reporting through
  //  only one of them is expected today (attempts is the newer path, live on the
  //  pilot only), so this is reported as context rather than an error.
  const byCourse = {};
  for (const r of db.prepare(
    `SELECT course, COUNT(*) n FROM score_events WHERE class_id IN (${inReal}) GROUP BY course`
  ).all(...realIds)) (byCourse[r.course] = byCourse[r.course] || {}).score_events = r.n;
  for (const r of db.prepare(
    `SELECT course, COUNT(*) n FROM attempts WHERE class_id IN (${inReal}) GROUP BY course`
  ).all(...realIds)) (byCourse[r.course] = byCourse[r.course] || {}).attempts = r.n;
  const pipelineByCourse = Object.keys(byCourse).sort().map((course) => ({
    course,
    score_events: byCourse[course].score_events || 0,
    attempts: byCourse[course].attempts || 0,
  }));
  const oneSided = pipelineByCourse.filter((r) => (r.score_events > 0) !== (r.attempts > 0));
  if (oneSided.length) {
    add(INFO, 'pipeline_one_sided',
      'Courses reporting through only one of the two grading paths',
      'Expected while the attempt-level path is rolling out course by course. Listed so a course that should be on both is easy to spot.',
      oneSided);
  }

  const totals = { critical: 0, warn: 0, info: 0 };
  for (const f of findings) totals[f.severity] += 1;
  findings.sort((a, b) => {
    const rank = { critical: 0, warn: 1, info: 2 };
    return rank[a.severity] - rank[b.severity] || b.count - a.count;
  });

  return {
    generated_at,
    empty: false,
    pipelines,
    recent,
    pipeline_by_course: pipelineByCourse,
    findings,
    totals,
  };
}

module.exports = { computeHealth, isRecognized };
