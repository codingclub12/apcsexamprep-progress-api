// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN ROUTES — owner-only read access to the whole database.
//  Mount in server.js:  app.use('/api/admin', require('./routes/admin'));
//
//  SECURITY MODEL (this is the part the old draft got wrong):
//   • FAILS CLOSED. If ADMIN_KEY is unset or weak, every route returns 503.
//     There is no "no key configured => open" path. That was the leak.
//   • Key is checked in ONE middleware applied to the whole router, so a new
//     route added below cannot accidentally be left unprotected.
//   • Constant-time comparison (SHA-256 digest + timingSafeEqual).
//   • password_hash and pin_hash are NEVER selected. Not in any query.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const session = require('../lib/admin-session');
const metrics = require('../lib/admin-metrics');
const analytics = require('../lib/admin-analytics');

const router = express.Router();

const MIN_KEY_LEN = 20;

// ── AUTH (fail closed) ────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const configured = process.env.ADMIN_KEY || '';

  // No key, or a weak key, means the admin API is OFF. Never open.
  if (configured.length < MIN_KEY_LEN) {
    return res.status(503).json({
      error: 'Admin API disabled. Set a strong ADMIN_KEY (>= 20 chars) in the environment.',
    });
  }

  // Header is preferred (does not land in access logs). ?key= is a convenience
  // fallback for quick browser/curl use; if you use it, treat the key as burnable.
  const provided = req.get('x-admin-key') || req.query.key || '';
  if (provided) {
    // Hash both to a fixed 32 bytes so the compare is constant-time and does not
    // leak key length. timingSafeEqual throws on length mismatch otherwise.
    const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();
    if (crypto.timingSafeEqual(digest(provided), digest(configured))) return next();
    return res.status(403).json({ error: 'Invalid or missing admin key.' });
  }

  // Dashboard session cookie: a valid signed cookie proves the holder passed the
  // key check at /admin/login. Accepted for SAFE (read-only) methods only, so the
  // cookie can never authorize a mutation route (access-codes, entitlements); those
  // always require the x-admin-key header. Combined with the cookie's SameSite=Strict,
  // this closes CSRF against the admin API.
  if ((req.method === 'GET' || req.method === 'HEAD') && session.isAuthed(req)) return next();

  return res.status(403).json({ error: 'Invalid or missing admin key.' });
}

// Every route on this router is now behind the key. Add routes AFTER this line.
router.use(requireAdmin);

// ── INDEX: what's available ───────────────────────────────────────────────────
router.get('/', (req, res) => {
  res.json({
    ok: true,
    endpoints: [
      'GET /api/admin/overview            top-line counts',
      'GET /api/admin/summary             bucketed adoption metrics: activation, deltas, cohort, data-quality',
      'GET /api/admin/analytics           full deck: by-course, by-teacher, geography, funnel, device, trends, hardest items',
      'GET /api/admin/stats               adoption + growth rollup (external vs raw)',
      'GET /api/admin/classes             every class + teacher + student/completion counts',
      'GET /api/admin/students            roster; filter ?class_code= or ?class_id=',
      'GET /api/admin/class/:code         one class: meta + roster + recent activity',
      'GET /api/admin/student/:id         per-lesson visit status + grade-of-record per item, vs manifest',
      'GET /api/admin/class/:id/gradebook class rollup: students x per-lesson grade aggregates, vs manifest',
      'GET /api/admin/schema              live table/column listing',
      'GET /api/admin/score-events        raw graded-interaction ledger; ?student_id= ?class_code= ?course= ?limit=',
    ],
  });
});

// ── OVERVIEW: top-line counts ─────────────────────────────────────────────────
router.get('/overview', (req, res) => {
  try {
    const one = (sql) => db.prepare(sql).get().n;
    res.json({
      teachers: one(`SELECT COUNT(*) n FROM teachers`),
      classes: one(`SELECT COUNT(*) n FROM classes`),
      classes_active: one(`SELECT COUNT(*) n FROM classes WHERE active = 1`),
      students: one(`SELECT COUNT(*) n FROM students`),
      progress_rows: one(`SELECT COUNT(*) n FROM progress`),
      completions: one(`SELECT COUNT(*) n FROM progress WHERE completed = 1`),
      quiz_attempts: one(`SELECT COUNT(*) n FROM quiz_attempts`),
      attempts: one(`SELECT COUNT(*) n FROM attempts`),
      manifest_items: one(`SELECT COUNT(*) n FROM course_manifest`),
      classes_by_course: db.prepare(
        `SELECT course, COUNT(*) n FROM classes GROUP BY course ORDER BY n DESC`
      ).all(),
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('admin/overview:', e);
    res.status(500).json({ error: 'overview failed', detail: e.message });
  }
});

// ── SUMMARY: bucketed adoption metrics (single classifier) ────────────────────
//  The one place classes are bucketed (SOLO / TANNER / PROBER / AUDIT / EXTERNAL)
//  so admin stats can never disagree with a hand-derived number. Powers the
//  activation panel, 24h/7d deltas, Florida cohort, and the reconciliation guard.
//  A GET, so the dashboard session cookie authorizes it; auth is inherited from
//  requireAdmin above. The only write is the idempotent daily snapshot baseline.
router.get('/summary', (req, res) => {
  try {
    res.json(metrics.computeSummary());
  } catch (e) {
    console.error('admin/summary:', e);
    res.status(500).json({ error: 'summary failed', detail: e.message });
  }
});

// ── ANALYTICS: the full breakdown deck ────────────────────────────────────────
//  by-course, by-teacher, geography (school/district/state from email domain),
//  engagement funnel, device/browser/OS, 30-day trends, and hardest items. Read
//  only; a GET, so the dashboard session cookie authorizes it. All breakdowns use
//  the same real-user population (owner / prober / audit excluded) as /summary.
router.get('/analytics', (req, res) => {
  try {
    res.json(analytics.computeAnalytics());
  } catch (e) {
    console.error('admin/analytics:', e);
    res.status(500).json({ error: 'analytics failed', detail: e.message });
  }
});

// ── STATS: adoption + growth rollup for the live tracker ──────────────────────
//  Richer than /overview. Separates REAL external adoption from owner / system /
//  audit rows, breaks students + completions down by course, and returns growth
//  over the last 30 days. Read-only; auth is inherited from requireAdmin above.
router.get('/stats', (req, res) => {
  try {
    // Rows that are NOT real external teachers. Hard-coded constants (no user
    // input), so interpolating them into the filter below is safe. Edit this
    // list if you add more of your own test/system emails.
    const INTERNAL_FILTER = `
      LOWER(COALESCE(t.email, '')) NOT IN ('tannercrow12@gmail.com', 'solo@system.invalid')
      AND LOWER(COALESCE(t.email, '')) NOT LIKE '%audit%'
      AND LOWER(COALESCE(t.email, '')) NOT LIKE '%delete%'
    `;

    const scalar = (sql) => db.prepare(sql).get().n;
    const rows = (sql) => db.prepare(sql).all();

    // RAW — everything in the DB, unfiltered.
    const raw = {
      teachers:       scalar(`SELECT COUNT(*) n FROM teachers`),
      classes:        scalar(`SELECT COUNT(*) n FROM classes`),
      classes_active: scalar(`SELECT COUNT(*) n FROM classes WHERE active = 1`),
      students:       scalar(`SELECT COUNT(*) n FROM students`),
      completions:    scalar(`SELECT COUNT(*) n FROM progress WHERE completed = 1`),
      quiz_attempts:  scalar(`SELECT COUNT(*) n FROM quiz_attempts`),
    };

    // EXTERNAL — real teacher adoption (owner / system / audit removed).
    const external = {
      teachers: scalar(`
        SELECT COUNT(DISTINCT c.teacher_id) n
        FROM classes c JOIN teachers t ON c.teacher_id = t.id
        WHERE ${INTERNAL_FILTER}`),
      classes: scalar(`
        SELECT COUNT(*) n
        FROM classes c JOIN teachers t ON c.teacher_id = t.id
        WHERE ${INTERNAL_FILTER}`),
      classes_with_students: scalar(`
        SELECT COUNT(*) n
        FROM classes c JOIN teachers t ON c.teacher_id = t.id
        WHERE ${INTERNAL_FILTER}
          AND (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) > 0`),
      students: scalar(`
        SELECT COUNT(*) n
        FROM students s
        JOIN classes c  ON s.class_id = c.id
        JOIN teachers t ON c.teacher_id = t.id
        WHERE ${INTERNAL_FILTER}`),
      completions: scalar(`
        SELECT COUNT(*) n
        FROM progress p
        JOIN classes c  ON p.class_id = c.id
        JOIN teachers t ON c.teacher_id = t.id
        WHERE p.completed = 1 AND ${INTERNAL_FILTER}`),
    };

    // BY COURSE (external) — merged from three simple aggregates to avoid
    // cartesian blowups from joining students x progress in one query.
    const bcClasses = rows(`
      SELECT c.course, COUNT(*) n
      FROM classes c JOIN teachers t ON c.teacher_id = t.id
      WHERE ${INTERNAL_FILTER} GROUP BY c.course`);
    const bcStudents = rows(`
      SELECT c.course, COUNT(*) n
      FROM students s JOIN classes c ON s.class_id = c.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE ${INTERNAL_FILTER} GROUP BY c.course`);
    const bcCompletions = rows(`
      SELECT c.course, COUNT(*) n
      FROM progress p JOIN classes c ON p.class_id = c.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE p.completed = 1 AND ${INTERNAL_FILTER} GROUP BY c.course`);

    const courseMap = {};
    const merge = (list, key) => {
      for (const r of list) {
        if (!courseMap[r.course]) {
          courseMap[r.course] = { course: r.course, classes: 0, students: 0, completions: 0 };
        }
        courseMap[r.course][key] = r.n;
      }
    };
    merge(bcClasses, 'classes');
    merge(bcStudents, 'students');
    merge(bcCompletions, 'completions');
    const by_course = Object.values(courseMap).sort((a, b) => b.classes - a.classes);

    // GROWTH — last 30 days, using confirmed created_at columns.
    const classes_per_day = rows(`
      SELECT DATE(created_at) d, COUNT(*) n FROM classes
      WHERE created_at >= DATE('now', '-30 days')
      GROUP BY DATE(created_at) ORDER BY d`);
    const students_per_day = rows(`
      SELECT DATE(created_at) d, COUNT(*) n FROM students
      WHERE created_at >= DATE('now', '-30 days')
      GROUP BY DATE(created_at) ORDER BY d`);
    const new_teachers_per_day = rows(`
      SELECT DATE(first_seen) d, COUNT(*) n FROM (
        SELECT c.teacher_id, MIN(c.created_at) first_seen
        FROM classes c JOIN teachers t ON c.teacher_id = t.id
        WHERE ${INTERNAL_FILTER}
        GROUP BY c.teacher_id
      ) WHERE first_seen >= DATE('now', '-30 days')
      GROUP BY DATE(first_seen) ORDER BY d`);

    // ACTIVITY — recent movement from progress.updated_at.
    const activity = {
      updates_last_7_days:     scalar(`SELECT COUNT(*) n FROM progress WHERE updated_at >= DATETIME('now', '-7 days')`),
      completions_last_7_days: scalar(`SELECT COUNT(*) n FROM progress WHERE completed = 1 AND updated_at >= DATETIME('now', '-7 days')`),
    };

    // TOP external classes by engagement.
    const top_classes = rows(`
      SELECT
        c.class_code, c.class_name, c.course,
        t.name AS teacher_name, t.email AS teacher_email,
        (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS students,
        (SELECT COUNT(*) FROM progress p WHERE p.class_id = c.id AND p.completed = 1) AS completions
      FROM classes c JOIN teachers t ON c.teacher_id = t.id
      WHERE ${INTERNAL_FILTER}
      ORDER BY completions DESC, students DESC
      LIMIT 10`);

    res.json({
      raw,
      external,
      by_course,
      growth: { classes_per_day, students_per_day, new_teachers_per_day },
      activity,
      top_classes,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('admin/stats:', e);
    res.status(500).json({ error: 'stats failed', detail: e.message });
  }
});

// ── CLASSES: every class + teacher + counts ───────────────────────────────────
router.get('/classes', (req, res) => {
  try {
    const classes = db.prepare(`
      SELECT
        c.id, c.class_code, c.class_name, c.course, c.active,
        c.mastery_threshold, c.retry_allowed, c.created_at,
        t.name  AS teacher_name,
        t.email AS teacher_email,
        (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS student_count,
        (SELECT COUNT(*) FROM progress p WHERE p.class_id = c.id AND p.completed = 1) AS completions
      FROM classes c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      ORDER BY c.created_at DESC
    `).all();
    res.json({ total: classes.length, classes });
  } catch (e) {
    console.error('admin/classes:', e);
    res.status(500).json({ error: 'classes failed', detail: e.message });
  }
});

// ── STUDENTS: roster (no pin_hash), filter by class_code or class_id ──────────
router.get('/students', (req, res) => {
  try {
    const { class_code, class_id } = req.query;
    let where = '';
    const args = [];
    if (class_id) {
      where = 'WHERE s.class_id = ?';
      args.push(class_id);
    } else if (class_code) {
      where = 'WHERE c.class_code = ?';
      args.push(String(class_code).toUpperCase());
    }
    const students = db.prepare(`
      SELECT
        s.id, s.class_id, s.display_name, s.student_ref,
        s.retry_override, s.created_at, s.last_active,
        c.class_code, c.class_name, c.course,
        (SELECT COUNT(*) FROM progress p WHERE p.student_id = s.id AND p.completed = 1) AS completions
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      ${where}
      ORDER BY s.last_active DESC NULLS LAST, s.created_at DESC
      LIMIT 5000
    `).all(...args);
    res.json({ total: students.length, students });
  } catch (e) {
    console.error('admin/students:', e);
    res.status(500).json({ error: 'students failed', detail: e.message });
  }
});

// ── CLASS DRILL: one class, roster, recent activity ───────────────────────────
router.get('/class/:code', (req, res) => {
  try {
    const code = String(req.params.code).toUpperCase();
    const cls = db.prepare(`
      SELECT
        c.id, c.class_code, c.class_name, c.course, c.active,
        c.mastery_threshold, c.retry_allowed, c.created_at,
        t.name AS teacher_name, t.email AS teacher_email
      FROM classes c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE c.class_code = ?
    `).get(code);

    if (!cls) return res.status(404).json({ error: `No class with code ${code}` });

    const roster = db.prepare(`
      SELECT
        s.id, s.display_name, s.student_ref, s.active, s.created_at, s.last_active,
        (SELECT COUNT(*) FROM progress p WHERE p.student_id = s.id AND p.completed = 1) AS completions
      FROM students s
      WHERE s.class_id = ?
      ORDER BY s.last_active DESC NULLS LAST, s.created_at DESC
    `).all(cls.id);

    const recent_activity = db.prepare(`
      SELECT
        p.updated_at, p.course, p.unit, p.lesson, p.activity_type,
        p.completed, p.score, p.attempts,
        s.display_name
      FROM progress p
      JOIN students s ON p.student_id = s.id
      WHERE p.class_id = ?
      ORDER BY p.updated_at DESC
      LIMIT 100
    `).all(cls.id);

    res.json({ class: cls, student_count: roster.length, roster, recent_activity });
  } catch (e) {
    console.error('admin/class/:code:', e);
    res.status(500).json({ error: 'class drill failed', detail: e.message });
  }
});

// ── HELPERS for the attempt-grade views below ─────────────────────────────────
//  Grade of record across many items in ONE window-function pass. Retry policy
//  per student (retry_override beats class retry_allowed): best score ratio
//  when retry is on, first attempt when it is off. Both ROW_NUMBER orderings
//  are computed and the CASE picks one, so this stays a single scan.
const GOR_SELECT = `
  SELECT student_id, course, lesson_id, item_id, item_type,
         score, max_score, passed, attempt_no, attempts
  FROM (
    SELECT a.student_id, a.course, a.lesson_id, a.item_id, a.item_type,
      a.score, a.max_score, a.passed, a.attempt_no,
      COUNT(*) OVER (PARTITION BY a.student_id, a.course, a.item_id) AS attempts,
      CASE WHEN COALESCE(s.retry_override, c.retry_allowed, 0) != 0
        THEN ROW_NUMBER() OVER (PARTITION BY a.student_id, a.course, a.item_id
               ORDER BY a.score * 1.0 / a.max_score DESC, a.attempt_no ASC)
        ELSE ROW_NUMBER() OVER (PARTITION BY a.student_id, a.course, a.item_id
               ORDER BY a.attempt_no ASC)
      END AS rn
    FROM attempts a
    JOIN students s ON s.id = a.student_id
    JOIN classes  c ON c.id = a.class_id
    %WHERE%
  ) WHERE rn = 1
`;

const pctOf = (earned, possible) => (possible > 0 ? Math.round((earned / possible) * 100) : 0);

// ── STUDENT DRILL: per-lesson visits + grade-of-record per item ───────────────
//  Percentages compute against course_manifest, the single denominator
//  authority. The legacy ?total=NN param is accepted and ignored; the admin
//  tracker page still sends it.
router.get('/student/:id', (req, res) => {
  try {
    const student = db.prepare(`
      SELECT s.id, s.class_id, s.display_name, s.student_ref, s.retry_override,
             s.created_at, s.last_active,
             c.class_code, c.class_name, c.course, c.mastery_threshold, c.retry_allowed
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.id = ?
    `).get(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Solo accounts roam, so report every course in the manifest; class
    // accounts report their class course only.
    const courseList = student.course === 'solo'
      ? db.prepare('SELECT DISTINCT course FROM course_manifest ORDER BY course').all().map(r => r.course)
      : [student.course];

    const placeholders = courseList.map(() => '?').join(',');
    const manifest = db.prepare(`
      SELECT course, unit, lesson_id, item_id, item_type, points
      FROM course_manifest WHERE course IN (${placeholders})
      ORDER BY course, unit, lesson_id, item_id
    `).all(...courseList);

    // Visit status from the existing page-visit tracking (never migrated).
    const visitRows = db.prepare(`
      SELECT DISTINCT course, lesson FROM progress
      WHERE student_id = ? AND completed = 1 AND activity_type NOT IN ('quiz', 'exam')
    `).all(student.id);
    const visited = new Set(visitRows.map(v => `${v.course}|${v.lesson}`));

    // Grade of record for every item this student has attempted, one pass.
    const gorRows = db.prepare(GOR_SELECT.replace('%WHERE%', 'WHERE a.student_id = ?')).all(student.id);
    const gorByItem = new Map(gorRows.map(g => [`${g.course}|${g.item_id}`, g]));

    // Assemble per-course, per-lesson view from the manifest skeleton.
    const courses = new Map();
    for (const m of manifest) {
      if (!courses.has(m.course)) {
        courses.set(m.course, {
          course: m.course,
          lessons: new Map(),
          summary: {
            visits: { visited: 0, total: 0, pct: 0 },
            graded: { earned: 0, possible: 0, pct: 0, items_total: 0, items_attempted: 0, items_passed: 0 },
          },
        });
      }
      const courseView = courses.get(m.course);
      if (!courseView.lessons.has(m.lesson_id)) {
        courseView.lessons.set(m.lesson_id, { lesson_id: m.lesson_id, unit: m.unit, visited: false, items: [] });
      }
      const lesson = courseView.lessons.get(m.lesson_id);

      if (m.item_type === 'visit') {
        lesson.visited = visited.has(`${m.course}|${m.lesson_id}`);
        courseView.summary.visits.total++;
        if (lesson.visited) courseView.summary.visits.visited++;
        continue;
      }

      const gor = gorByItem.get(`${m.course}|${m.item_id}`);
      lesson.items.push({
        item_id: m.item_id,
        item_type: m.item_type,
        max_score: m.points,
        score: gor ? gor.score : null,
        pct: gor ? pctOf(gor.score, m.points) : null,
        passed: gor ? !!gor.passed : null,
        attempts: gor ? gor.attempts : 0,
        attempt_no: gor ? gor.attempt_no : null,
      });
      courseView.summary.graded.possible += m.points;
      courseView.summary.graded.items_total++;
      if (gor) {
        courseView.summary.graded.earned += gor.score;
        courseView.summary.graded.items_attempted++;
        if (gor.passed) courseView.summary.graded.items_passed++;
      }
    }

    const courseViews = [...courses.values()].map(cv => {
      cv.summary.visits.pct = pctOf(cv.summary.visits.visited, cv.summary.visits.total);
      cv.summary.graded.pct = pctOf(cv.summary.graded.earned, cv.summary.graded.possible);
      return { course: cv.course, summary: cv.summary, lessons: [...cv.lessons.values()] };
    });

    res.json({
      student: {
        id: student.id, display_name: student.display_name, student_ref: student.student_ref,
        created_at: student.created_at, last_active: student.last_active,
        retry_override: student.retry_override,
      },
      class: {
        id: student.class_id, class_code: student.class_code, class_name: student.class_name,
        course: student.course, mastery_threshold: student.mastery_threshold,
        retry_allowed: student.retry_allowed,
      },
      courses: courseViews,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('admin/student/:id:', e);
    res.status(500).json({ error: 'student drill failed', detail: e.message });
  }
});

// ── CLASS GRADEBOOK: students x per-lesson aggregates, vs manifest ────────────
//  Reads are the heavy path: one window-function pass over attempts for the
//  whole class, one aggregate over progress for visits, no per-student queries.
//  :id accepts a class id or a class code. Solo system classes may pass
//  ?course= (default ap-csa) since their course column is 'solo'.
router.get('/class/:id/gradebook', (req, res) => {
  try {
    const key = String(req.params.id);
    const cls = db.prepare(`
      SELECT id, class_code, class_name, course, mastery_threshold, retry_allowed
      FROM classes WHERE id = ? OR class_code = ?
    `).get(key, key.toUpperCase());
    if (!cls) return res.status(404).json({ error: `No class with id or code ${key}` });

    const course = cls.course === 'solo' ? String(req.query.course || 'ap-csa') : cls.course;

    const gradedItems = db.prepare(`
      SELECT unit, lesson_id, item_id, points FROM course_manifest
      WHERE course = ? AND item_type != 'visit'
      ORDER BY unit, lesson_id, item_id
    `).all(course);
    const visitTotal = db.prepare(
      `SELECT COUNT(*) n FROM course_manifest WHERE course = ? AND item_type = 'visit'`
    ).get(course).n;

    // Lesson columns from the manifest (denominator authority).
    const lessonCols = new Map();
    let coursePossible = 0;
    for (const item of gradedItems) {
      if (!lessonCols.has(item.lesson_id)) {
        lessonCols.set(item.lesson_id, { lesson_id: item.lesson_id, unit: item.unit, possible: 0, items: 0 });
      }
      const col = lessonCols.get(item.lesson_id);
      col.possible += item.points;
      col.items++;
      coursePossible += item.points;
    }

    const roster = db.prepare(`
      SELECT id, display_name, student_ref, active, last_active
      FROM students WHERE class_id = ? ORDER BY display_name
    `).all(cls.id);

    // Single aggregate pass: grade of record for every (student, item).
    const gorRows = db.prepare(
      GOR_SELECT.replace('%WHERE%', 'WHERE a.class_id = ? AND a.course = ?')
    ).all(cls.id, course);

    // Visit completion per student in one aggregate.
    const visitRows = db.prepare(`
      SELECT student_id, COUNT(DISTINCT lesson) n FROM progress
      WHERE class_id = ? AND course = ? AND completed = 1 AND activity_type NOT IN ('quiz', 'exam')
      GROUP BY student_id
    `).all(cls.id, course);
    const visitsByStudent = new Map(visitRows.map(v => [v.student_id, v.n]));

    const students = new Map(roster.map(s => [s.id, {
      id: s.id,
      name: s.display_name,
      ref: s.student_ref,
      active: s.active,
      last_active: s.last_active,
      visits: { visited: visitsByStudent.get(s.id) || 0, total: visitTotal },
      lessons: {},
      overall: { earned: 0, possible: coursePossible, pct: 0, items_attempted: 0, items_passed: 0 },
    }]));

    for (const g of gorRows) {
      const row = students.get(g.student_id);
      if (!row) continue; // attempt from a since-removed student
      const col = lessonCols.get(g.lesson_id);
      if (!row.lessons[g.lesson_id]) {
        row.lessons[g.lesson_id] = {
          earned: 0, possible: col ? col.possible : 0, pct: 0, items_attempted: 0, items_passed: 0,
        };
      }
      const cell = row.lessons[g.lesson_id];
      cell.earned += g.score;
      cell.items_attempted++;
      if (g.passed) cell.items_passed++;
      cell.pct = pctOf(cell.earned, cell.possible);
      row.overall.earned += g.score;
      row.overall.items_attempted++;
      if (g.passed) row.overall.items_passed++;
    }
    for (const row of students.values()) {
      row.overall.pct = pctOf(row.overall.earned, row.overall.possible);
    }

    res.json({
      class: cls,
      course,
      lessons: [...lessonCols.values()],
      students: [...students.values()],
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('admin/class/:id/gradebook:', e);
    res.status(500).json({ error: 'gradebook failed', detail: e.message });
  }
});

// ── SCORE EVENTS: raw graded-interaction ledger (CFU-level detail) ────────────
//  The append-only detail behind progress.score. Filter by ?student_id=,
//  ?class_code=, ?course=; ?limit= caps rows (default 200, max 2000).
router.get('/score-events', (req, res) => {
  try {
    const { student_id, class_code, course } = req.query;
    const lim = Math.min(parseInt(req.query.limit, 10) || 200, 2000);
    const where = [];
    const args = [];
    if (student_id) { where.push('se.student_id = ?'); args.push(student_id); }
    if (course)     { where.push('se.course = ?');     args.push(course); }
    if (class_code) { where.push('c.class_code = ?');  args.push(String(class_code).toUpperCase()); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const events = db.prepare(`
      SELECT se.id, se.student_id, s.display_name, c.class_code,
             se.course, se.unit, se.lesson, se.activity_type, se.item,
             se.points, se.max_points, se.correct, se.answers, se.created_at
      FROM score_events se
      LEFT JOIN students s ON se.student_id = s.id
      LEFT JOIN classes  c ON se.class_id  = c.id
      ${clause}
      ORDER BY se.created_at DESC
      LIMIT ?
    `).all(...args, lim);

    res.json({ total: events.length, limit: lim, events });
  } catch (e) {
    console.error('admin/score-events:', e);
    res.status(500).json({ error: 'score-events failed', detail: e.message });
  }
});

// ── SCHEMA: live tables + columns ─────────────────────────────────────────────
router.get('/schema', (req, res) => {
  try {
    const tables = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
    ).all();
    const schema = {};
    for (const { name } of tables) {
      schema[name] = db.prepare(`PRAGMA table_info(${name})`).all()
        .map((col) => ({ column: col.name, type: col.type, notnull: !!col.notnull, pk: !!col.pk }));
    }
    res.json({ tables: tables.map((t) => t.name), schema });
  } catch (e) {
    console.error('admin/schema:', e);
    res.status(500).json({ error: 'schema read failed', detail: e.message });
  }
});

// ── ACCESS CODES + ENTITLEMENTS (Phase 4: Teacher Command Center, slice 1) ─────
// All routes below inherit requireAdmin above (fails closed on a missing or weak
// ADMIN_KEY). Body parsing is the app-level express.json() in server.js.
const entitlements = require('../lib/entitlements');

// Generate N single-use access codes for a course.
// POST /api/admin/access-codes   body { course, count }
router.post('/access-codes', (req, res) => {
  try {
    const { course, count } = req.body || {};
    if (!entitlements.isValidCourse(course)) {
      return res.status(400).json({ error: `course must be one of: ${entitlements.VALID_COURSES.join(', ')}` });
    }
    const n = parseInt(count, 10);
    if (!Number.isInteger(n) || n < 1 || n > 500) {
      return res.status(400).json({ error: 'count must be an integer from 1 to 500' });
    }
    const codes = entitlements.generateCodes(course, n);
    res.json({ course, requested: n, created: codes.length, codes });
  } catch (e) {
    console.error('admin/access-codes create:', e);
    res.status(500).json({ error: 'code generation failed', detail: e.message });
  }
});

// List access codes. Optional filters ?course= ?status= ?limit=
router.get('/access-codes', (req, res) => {
  try {
    const clauses = [], params = [];
    if (req.query.course) { clauses.push('course = ?'); params.push(req.query.course); }
    if (req.query.status) { clauses.push('status = ?'); params.push(req.query.status); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 200));
    const rows = db.prepare(
      `SELECT code, course, status, redeemed_by_teacher, order_ref, created_at
         FROM access_codes ${where} ORDER BY created_at DESC LIMIT ?`
    ).all(...params, limit);
    res.json({ count: rows.length, codes: rows });
  } catch (e) {
    console.error('admin/access-codes list:', e);
    res.status(500).json({ error: 'list failed', detail: e.message });
  }
});

// Revoke an UNUSED access code so it can never be redeemed. A redeemed code's
// grant is killed via the entitlement revoke below, not here.
// POST /api/admin/access-codes/revoke   body { code }
router.post('/access-codes/revoke', (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: 'code required' });
    const changed = entitlements.revokeCode(code);
    res.json({
      revoked: changed > 0,
      code: String(code).trim().toUpperCase(),
      note: changed ? undefined
        : 'Code not found or not in an unused state. Revoke a redeemed code\'s access via the entitlement.',
    });
  } catch (e) {
    console.error('admin/access-codes revoke:', e);
    res.status(500).json({ error: 'revoke failed', detail: e.message });
  }
});

// List entitlements. Optional filters ?teacher_id= ?course= ?status=
router.get('/entitlements', (req, res) => {
  try {
    const clauses = [], params = [];
    if (req.query.teacher_id) { clauses.push('teacher_id = ?'); params.push(req.query.teacher_id); }
    if (req.query.course) { clauses.push('course = ?'); params.push(req.query.course); }
    if (req.query.status) { clauses.push('status = ?'); params.push(req.query.status); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db.prepare(
      `SELECT id, teacher_id, course, source, status, order_ref, granted_at, expires_at
         FROM entitlements ${where} ORDER BY granted_at DESC LIMIT 500`
    ).all(...params);
    res.json({ count: rows.length, entitlements: rows });
  } catch (e) {
    console.error('admin/entitlements list:', e);
    res.status(500).json({ error: 'list failed', detail: e.message });
  }
});

// Revoke a teacher's active entitlement for a course.
// POST /api/admin/entitlements/revoke   body { teacher_id, course }
router.post('/entitlements/revoke', (req, res) => {
  try {
    const { teacher_id, course } = req.body || {};
    if (!teacher_id || !course) {
      return res.status(400).json({ error: 'teacher_id and course required' });
    }
    const changed = entitlements.revokeEntitlement(teacher_id, course);
    res.json({ revoked: changed > 0, teacher_id, course });
  } catch (e) {
    console.error('admin/entitlements revoke:', e);
    res.status(500).json({ error: 'revoke failed', detail: e.message });
  }
});

module.exports = router;
