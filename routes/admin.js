'use strict';
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
      'GET /api/admin/classes             every class + teacher + student/completion counts',
      'GET /api/admin/students            roster; filter ?class_code= or ?class_id=',
      'GET /api/admin/class/:code         one class: meta + roster + recent activity',
      'GET /api/admin/schema              live table/column listing',
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
