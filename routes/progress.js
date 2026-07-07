'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ATTEMPT-LEVEL PROGRESS — CFU and quiz submissions for ap-csa / ap-csp.
//  Mount in server.js:  app.use('/api/progress', require('./routes/progress'));
//
//  The client only submits; the server enforces policy:
//   • (course, item_id) must exist in course_manifest, which is also the
//     max_score authority. Unknown items and typo'd IDs are rejected.
//   • passed is computed here against the class mastery_threshold at write
//     time. Never hardcoded.
//   • Grade of record: first attempt when retry is off, best score ratio when
//     retry is on (student retry_override beats the class default, matching
//     the existing /quiz behavior).
//   • detail JSON is rebuilt field-by-field before insert so only question
//     index, option index, and a boolean can ever be stored. Zero PII.
//  One insert per submission. Prepared statements live at module scope.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireStudent } = require('../middleware');

// ── PREPARED STATEMENTS (module scope, reused across requests) ────────────────
const getClassStmt = db.prepare(
  'SELECT course, mastery_threshold, retry_allowed FROM classes WHERE id = ?'
);
const getRetryOverrideStmt = db.prepare(
  'SELECT retry_override FROM students WHERE id = ?'
);
const getManifestStmt = db.prepare(
  'SELECT lesson_id, item_type, points FROM course_manifest WHERE course = ? AND item_id = ?'
);
const countPriorStmt = db.prepare(
  'SELECT COUNT(*) n FROM attempts WHERE student_id = ? AND item_id = ? AND course = ?'
);
const insertAttemptStmt = db.prepare(`
  INSERT INTO attempts (student_id, class_id, course, lesson_id, item_id, item_type,
    score, max_score, passed, attempt_no, detail)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
// Grade of record for one item. First param picks the ordering: 1 = best score
// ratio wins (retry on), 0 = first attempt wins (retry off).
const gradeOfRecordStmt = db.prepare(`
  SELECT score, max_score, attempt_no, passed FROM (
    SELECT score, max_score, attempt_no, passed,
      CASE WHEN ? = 1
        THEN ROW_NUMBER() OVER (ORDER BY score * 1.0 / max_score DESC, attempt_no ASC)
        ELSE ROW_NUMBER() OVER (ORDER BY attempt_no ASC)
      END rn
    FROM attempts WHERE student_id = ? AND item_id = ? AND course = ?
  ) WHERE rn = 1
`);

// ── RATE LIMIT (light, per student, bounded memory) ───────────────────────────
// Fixed 60s window, 30 submissions per student. No timers, no listeners; the
// map is swept lazily and hard-capped so it can never grow unbounded.
const RL_WINDOW_MS = 60_000;
const RL_MAX_PER_WINDOW = 30;
const RL_MAX_KEYS = 5000;
const rlBuckets = new Map();

function rateLimit(req, res, next) {
  const now = Date.now();
  let bucket = rlBuckets.get(req.student.id);
  if (!bucket || now - bucket.start >= RL_WINDOW_MS) {
    if (rlBuckets.size >= RL_MAX_KEYS) {
      for (const [k, v] of rlBuckets) {
        if (now - v.start >= RL_WINDOW_MS) rlBuckets.delete(k);
      }
      if (rlBuckets.size >= RL_MAX_KEYS) rlBuckets.clear();
    }
    bucket = { start: now, count: 0 };
    rlBuckets.set(req.student.id, bucket);
  }
  bucket.count++;
  if (bucket.count > RL_MAX_PER_WINDOW) {
    return res.status(429).json({ error: 'Too many submissions. Wait a minute and try again.' });
  }
  next();
}

// ── DETAIL SANITIZER (zero PII enforcement) ───────────────────────────────────
// Per-question results: [{"q":1,"sel":2,"ok":true}]. Objects are rebuilt so no
// other key, string, or nested value can reach the database. sel may be null
// for an unanswered question.
const DETAIL_MAX_ITEMS = 100;

function sanitizeDetail(detail) {
  if (detail === undefined || detail === null) return { valid: true, json: null };
  if (!Array.isArray(detail) || detail.length > DETAIL_MAX_ITEMS) return { valid: false };
  const clean = new Array(detail.length);
  for (let i = 0; i < detail.length; i++) {
    const d = detail[i];
    if (typeof d !== 'object' || d === null || Array.isArray(d)) return { valid: false };
    if (!Number.isInteger(d.q)) return { valid: false };
    if (d.sel !== null && d.sel !== undefined && !Number.isInteger(d.sel)) return { valid: false };
    if (typeof d.ok !== 'boolean') return { valid: false };
    clean[i] = { q: d.q, sel: Number.isInteger(d.sel) ? d.sel : null, ok: d.ok };
  }
  return { valid: true, json: JSON.stringify(clean) };
}

// ── POST /api/progress/attempt ────────────────────────────────────────────────
router.post('/attempt', requireStudent, rateLimit, (req, res) => {
  try {
    const b = req.body || {};

    const cls = getClassStmt.get(req.student.class_id);
    if (!cls) return res.status(401).json({ error: 'Class not found for student' });

    // Course must equal the class course, except solo accounts, which roam and
    // are trusted for the client-sent course (still validated by the manifest).
    let course;
    if (cls.course === 'solo') {
      course = typeof b.course === 'string' ? b.course.slice(0, 40) : '';
    } else if (b.course === cls.course) {
      course = cls.course;
    } else {
      return res.status(400).json({ error: `course must be '${cls.course}' for this class` });
    }

    const lesson_id = typeof b.lesson_id === 'string' ? b.lesson_id : '';
    const item_id = typeof b.item_id === 'string' ? b.item_id : '';
    if (!course || !lesson_id || !item_id) {
      return res.status(400).json({ error: 'course, lesson_id, item_id, item_type, score required' });
    }
    if (b.item_type !== 'cfu' && b.item_type !== 'quiz') {
      return res.status(400).json({ error: "item_type must be 'cfu' or 'quiz'" });
    }

    // Manifest is the gate: unknown (course, item_id) means a junk write or a
    // typo'd ID on a page. Reject loudly so drift surfaces during the pilot.
    const manifest = getManifestStmt.get(course, item_id);
    if (!manifest || manifest.item_type === 'visit') {
      return res.status(400).json({ error: `Unknown item '${item_id}' for ${course}. Not in course_manifest.` });
    }
    if (manifest.item_type !== b.item_type) {
      return res.status(400).json({ error: `item_type mismatch: '${item_id}' is '${manifest.item_type}' in the manifest` });
    }
    if (manifest.lesson_id !== lesson_id) {
      return res.status(400).json({ error: `lesson_id mismatch: '${item_id}' belongs to lesson '${manifest.lesson_id}'` });
    }

    // Manifest points is the max_score authority.
    const maxScore = manifest.points;
    const score = Number(b.score);
    if (!Number.isFinite(score) || score < 0 || score > maxScore) {
      return res.status(400).json({ error: `score must be a number between 0 and ${maxScore} for '${item_id}'` });
    }
    if (b.max_score !== undefined && b.max_score !== null && Number(b.max_score) !== maxScore) {
      return res.status(400).json({ error: `max_score mismatch: manifest says ${maxScore} for '${item_id}'. Fix the page or the manifest.` });
    }

    const detail = sanitizeDetail(b.detail);
    if (!detail.valid) {
      return res.status(400).json({ error: 'detail must be an array of {q, sel, ok}: integer indices and a boolean only' });
    }

    const threshold = cls.mastery_threshold != null ? cls.mastery_threshold : 80;
    const passed = (score / maxScore) * 100 >= threshold ? 1 : 0;

    const override = getRetryOverrideStmt.get(req.student.id);
    const retryOn = (override && override.retry_override != null)
      ? (override.retry_override ? 1 : 0)
      : (cls.retry_allowed ? 1 : 0);

    const result = db.transaction(() => {
      const attempt_no = countPriorStmt.get(req.student.id, item_id, course).n + 1;
      insertAttemptStmt.run(
        req.student.id, req.student.class_id, course, lesson_id, item_id, b.item_type,
        score, maxScore, passed, attempt_no, detail.json
      );
      const gor = gradeOfRecordStmt.get(retryOn, req.student.id, item_id, course);
      return { attempt_no, gor };
    })();

    res.json({
      recorded: true,
      attempt_no: result.attempt_no,
      passed: !!passed,
      grade_of_record: {
        score: result.gor.score,
        max_score: result.gor.max_score,
        attempt_no: result.gor.attempt_no,
        passed: !!result.gor.passed,
      },
    });
  } catch (e) {
    console.error('Attempt error:', e);
    res.status(500).json({ error: 'Failed to record attempt' });
  }
});

module.exports = router;
