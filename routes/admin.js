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

  // Hash both to a fixed 32 bytes so the compare is constant-time and does not
  // leak key length. timingSafeEqual throws on length mismatch otherwise.
  const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();
  const ok = crypto.timingSafeEqual(digest(provided), digest(configured));

  if (!ok) return res.status(403).json({ error: 'Invalid or missing admin key.' });
  next();
}

// Every route on this router is now behind the key. Add routes AFTER this line.
router.use(requireAdmin);

// ── INDEX: what's available ───────────────────────────────────────────────────
router.get('/', (req, res) => {
  res.json({
    ok: true,
    endpoints: [
      'GET /api/admin/overview            top-line counts',
      'GET /api/admin/stats               adoption + growth rollup (external vs raw)',
      'GET /api/admin/classes             every class + teacher + student/completion counts',
      'GET /api/admin/students            roster; filter ?class_code= or ?class_id=',
      'GET /api/admin/class/:code         one class: meta + roster + recent activity',
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
        s.id, s.display_name, s.student_ref, s.created_at, s.last_active,
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

module.exports = router;
