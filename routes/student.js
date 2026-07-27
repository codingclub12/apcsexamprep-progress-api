'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');
const { requireStudent } = require('../middleware');
const { newId, signStudentToken, isValidPin, sanitize, COURSES, pageFromHandle } = require('../utils');
const { rollupScore } = require('../scoring');

// ── JOIN CLASS (first time) ───────────────────────────────────────────────────
router.post('/join', async (req, res) => {
  try {
    const { class_code, display_name, pin } = req.body;
    if (!class_code) return res.status(400).json({ error: 'Class code required' });
    if (!display_name || display_name.trim().length < 1) return res.status(400).json({ error: 'Name required' });
    if (!isValidPin(pin)) return res.status(400).json({ error: 'PIN must be exactly 4 digits' });

    const cls = db.prepare('SELECT * FROM classes WHERE class_code = ? AND active = 1')
      .get(class_code.toUpperCase().trim());
    if (!cls) return res.status(404).json({ error: 'Class not found or inactive. Check your class code.' });

    const cleanName = sanitize(display_name, 50);

    // Check if name already exists in this class
    const existing = db.prepare('SELECT id FROM students WHERE class_id = ? AND lower(display_name) = lower(?)').get(cls.id, cleanName);
    if (existing) return res.status(409).json({ error: 'That name is already taken in this class. Try adding your last initial, e.g. "Avery M."' });

    const pinHash = await bcrypt.hash(String(pin), 10);
    const id = newId();
    db.prepare(`
      INSERT INTO students (id, class_id, display_name, pin_hash)
      VALUES (?, ?, ?, ?)
    `).run(id, cls.id, cleanName, pinHash);

    const student = db.prepare('SELECT id, class_id, display_name FROM students WHERE id = ?').get(id);
    const token = signStudentToken(student, cls.class_code);

    res.status(201).json({
      token,
      student: { id: student.id, name: student.display_name },
      class: { code: cls.class_code, name: cls.class_name, course: cls.course },
    });
  } catch (e) {
    console.error('Join error:', e);
    res.status(500).json({ error: 'Failed to join class' });
  }
});

// ── LOGIN (returning student) ─────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { class_code, display_name, pin } = req.body;
    if (!class_code || !display_name || !pin) return res.status(400).json({ error: 'Class code, name, and PIN required' });

    const cls = db.prepare('SELECT * FROM classes WHERE class_code = ?').get(class_code.toUpperCase().trim());
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    const student = db.prepare('SELECT * FROM students WHERE class_id = ? AND lower(display_name) = lower(?)')
      .get(cls.id, display_name.trim());
    if (!student) return res.status(401).json({ error: 'Name not found in this class' });
    if (student.active === 0) return res.status(403).json({ error: 'This account has been deactivated by your teacher.' });

    const valid = await bcrypt.compare(String(pin), student.pin_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect PIN' });

    db.prepare("UPDATE students SET last_active = datetime('now') WHERE id = ?").run(student.id);
    const token = signStudentToken(student, cls.class_code);

    res.json({
      token,
      student: { id: student.id, name: student.display_name },
      class: { code: cls.class_code, name: cls.class_name, course: cls.course },
    });
  } catch (e) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── ME ────────────────────────────────────────────────────────────────────────
router.get('/me', requireStudent, (req, res) => {
  const cls = db.prepare('SELECT class_code, class_name, course FROM classes WHERE id = ?').get(req.student.class_id);
  res.json({ student: req.student, class: cls });
});

// ── GET ALL PROGRESS ──────────────────────────────────────────────────────────
router.get('/progress', requireStudent, (req, res) => {
  const records = db.prepare(`
    SELECT course, unit, lesson, activity_type, completed, score, attempts, confidence, completed_at, updated_at
    FROM progress WHERE student_id = ? ORDER BY unit, lesson, activity_type
  `).all(req.student.id);

  // Build structured map for easy frontend consumption
  const map = {};
  for (const r of records) {
    const key = `${r.course}|${r.unit}|${r.lesson}|${r.activity_type}`;
    map[key] = r;
  }

  // Class mastery_threshold rides along so the student view can label the
  // "Passing mark" line instead of defaulting to 80. Class-level, so top-level.
  const cls = db.prepare('SELECT mastery_threshold FROM classes WHERE id = ?').get(req.student.class_id);
  const mastery_threshold = (cls && cls.mastery_threshold != null) ? cls.mastery_threshold : 80;

  res.json({ progress: records, map, mastery_threshold });
});

// ── STUDENT ATTEMPTS GRID (per-item grade-of-record, self) ────────────────────
//  Student-facing read of the attempts ledger, the counterpart to the admin
//  drill but scoped to the logged-in student. Powers the CSA per-item grid on
//  my-progress. Percentages compute against course_manifest, the single
//  denominator authority, so this can never disagree with the gradebook.
//
//  Response:
//    { student, courses: [ { course, summary, lessons: [ {
//        lesson_id, unit, visited,
//        cfu:  { total, attempted, earned, possible, pct } | null,
//        quiz: { score, max_score, pct, passed, attempt_no, attempts } | null,
//        code: { total, attempted, earned, possible, pct } | null,
//        items: [ { item_id, kind, item_type, score, max_score, pct, passed,
//                   attempts, attempt_no } ]
//      } ] } ] }
//    kind is 'cfu' | 'quiz' | 'code'. Code items are item_type 'cfu' in the
//    manifest but split into their own column by the 1.X-code-N id pattern.
//  A per-lesson bucket (cfu/quiz/code) is null when the manifest has no such
//  item for that lesson (e.g. 1.6 quiz, 1.7/1.8 code), and a stub with
//  attempted 0 / score null when the item exists but was not attempted.
//  Solo accounts roam: without ?course= they return every course they have
//  attempts in; a class account always returns its own course.

const saGetClassStmt = db.prepare('SELECT course FROM classes WHERE id = ?');
const saCoursesStmt = db.prepare(
  'SELECT DISTINCT course FROM attempts WHERE student_id = ? ORDER BY course'
);
const saManifestStmt = db.prepare(`
  SELECT unit, lesson_id, item_id, item_type, points
  FROM course_manifest WHERE course = ?
  ORDER BY unit, lesson_id, item_id
`);
const saVisitsStmt = db.prepare(`
  SELECT DISTINCT lesson FROM progress
  WHERE student_id = ? AND course = ? AND completed = 1
    AND activity_type NOT IN ('quiz', 'exam')
`);
// Grade of record per item for one student+course in a single window pass.
// Retry policy: student retry_override beats class retry_allowed; best score
// ratio when retry is on, first attempt when off.
const saGorStmt = db.prepare(`
  SELECT item_id, item_type, score, max_score, passed, attempt_no, attempts FROM (
    SELECT a.item_id, a.item_type, a.score, a.max_score, a.passed, a.attempt_no,
      COUNT(*) OVER (PARTITION BY a.item_id) AS attempts,
      CASE WHEN COALESCE(s.retry_override, c.retry_allowed, 0) != 0
        THEN ROW_NUMBER() OVER (PARTITION BY a.item_id ORDER BY a.score * 1.0 / a.max_score DESC, a.attempt_no ASC)
        ELSE ROW_NUMBER() OVER (PARTITION BY a.item_id ORDER BY a.attempt_no ASC)
      END AS rn
    FROM attempts a
    JOIN students s ON s.id = a.student_id
    JOIN classes  c ON c.id = a.class_id
    WHERE a.student_id = ? AND a.course = ?
  ) WHERE rn = 1
`);

const saPct = (earned, possible) => (possible > 0 ? Math.round((earned / possible) * 100) : null);
const saIsCode = (itemId) => /-code-\d+$/.test(itemId);

router.get('/attempts', requireStudent, (req, res) => {
  try {
    const cls = saGetClassStmt.get(req.student.class_id);
    if (!cls) return res.status(401).json({ error: 'Class not found for student' });

    let courseList;
    if (cls.course === 'solo') {
      courseList = req.query.course
        ? [String(req.query.course)]
        : saCoursesStmt.all(req.student.id).map((r) => r.course);
    } else {
      courseList = [cls.course];
    }

    const courses = courseList.map((course) => {
      const manifest = saManifestStmt.all(course);
      const visited = new Set(saVisitsStmt.all(req.student.id, course).map((v) => v.lesson));
      const gor = new Map(saGorStmt.all(req.student.id, course).map((g) => [g.item_id, g]));

      const lessons = new Map();
      const summary = {
        visits: { visited: 0, total: 0, pct: null },
        graded: { earned: 0, possible: 0, pct: null, items_total: 0, items_attempted: 0, items_passed: 0 },
      };

      for (const m of manifest) {
        if (!lessons.has(m.lesson_id)) {
          lessons.set(m.lesson_id, {
            lesson_id: m.lesson_id, unit: m.unit, visited: false,
            cfu: null, quiz: null, code: null, items: [],
          });
        }
        const lesson = lessons.get(m.lesson_id);

        if (m.item_type === 'visit') {
          lesson.visited = visited.has(m.lesson_id);
          summary.visits.total++;
          if (lesson.visited) summary.visits.visited++;
          continue;
        }

        const kind = m.item_type === 'quiz' ? 'quiz' : (saIsCode(m.item_id) ? 'code' : 'cfu');
        const g = gor.get(m.item_id);
        lesson.items.push({
          item_id: m.item_id, kind, item_type: m.item_type, max_score: m.points,
          score: g ? g.score : null,
          pct: g ? saPct(g.score, m.points) : null,
          passed: g ? !!g.passed : null,
          attempts: g ? g.attempts : 0,
          attempt_no: g ? g.attempt_no : null,
        });

        summary.graded.possible += m.points;
        summary.graded.items_total++;
        if (g) {
          summary.graded.earned += g.score;
          summary.graded.items_attempted++;
          if (g.passed) summary.graded.items_passed++;
        }

        if (kind === 'quiz') {
          lesson.quiz = g
            ? { score: g.score, max_score: m.points, pct: saPct(g.score, m.points), passed: !!g.passed, attempt_no: g.attempt_no, attempts: g.attempts }
            : { score: null, max_score: m.points, pct: null, passed: null, attempt_no: null, attempts: 0 };
        } else {
          const bucket = lesson[kind] || { total: 0, attempted: 0, earned: 0, possible: 0, pct: null };
          bucket.total++;
          bucket.possible += m.points;
          if (g) { bucket.attempted++; bucket.earned += g.score; }
          lesson[kind] = bucket;
        }
      }

      for (const lesson of lessons.values()) {
        for (const k of ['cfu', 'code']) {
          if (lesson[k]) lesson[k].pct = saPct(lesson[k].earned, lesson[k].possible);
        }
      }
      summary.visits.pct = saPct(summary.visits.visited, summary.visits.total);
      summary.graded.pct = saPct(summary.graded.earned, summary.graded.possible);

      return { course, summary, lessons: [...lessons.values()] };
    });

    res.json({
      student: { id: req.student.id, name: req.student.display_name },
      courses,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Student attempts error:', e);
    res.status(500).json({ error: 'Failed to load attempts' });
  }
});

// ── SAVE / UPDATE PROGRESS ────────────────────────────────────────────────────
router.post('/progress', requireStudent, (req, res) => {
  try {
    const { course, unit, lesson, activity_type, completed, score, confidence, time_spent_s } = req.body;

    if (!course || !unit || !lesson || !activity_type) {
      return res.status(400).json({ error: 'course, unit, lesson, and activity_type required' });
    }

    const now = new Date().toISOString();
    const existing = db.prepare(`
      SELECT id, attempts FROM progress
      WHERE student_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?
    `).get(req.student.id, course, unit, lesson, activity_type);

    if (existing) {
      // Update existing record
      const newAttempts = (existing.attempts || 0) + (score != null ? 1 : 0);
      db.prepare(`
        UPDATE progress SET
          completed = CASE WHEN ? = 1 THEN 1 ELSE completed END,
          score = CASE WHEN ? IS NOT NULL THEN ? ELSE score END,
          attempts = ?,
          confidence = CASE WHEN ? IS NOT NULL THEN ? ELSE confidence END,
          time_spent_s = CASE WHEN ? IS NOT NULL THEN COALESCE(time_spent_s, 0) + ? ELSE time_spent_s END,
          completed_at = CASE WHEN ? = 1 AND completed_at IS NULL THEN ? ELSE completed_at END,
          updated_at = ?
        WHERE id = ?
      `).run(
        completed ? 1 : 0,
        score, score,
        newAttempts,
        confidence, confidence,
        time_spent_s, time_spent_s,
        completed ? 1 : 0, now,
        now,
        existing.id
      );
    } else {
      // Insert new record
      db.prepare(`
        INSERT INTO progress (id, student_id, class_id, course, unit, lesson, activity_type,
          completed, score, attempts, confidence, time_spent_s, completed_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newId(), req.student.id, req.student.class_id,
        course, unit, lesson, activity_type,
        completed ? 1 : 0,
        score ?? null,
        score != null ? 1 : 0,
        confidence ?? null,
        time_spent_s ?? null,
        completed ? now : null,
        now
      );
    }

    const record = db.prepare(`
      SELECT * FROM progress
      WHERE student_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?
    `).get(req.student.id, course, unit, lesson, activity_type);

    res.json({ ok: true, progress: record });
  } catch (e) {
    console.error('Save progress error:', e);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});


// ── HELPER: resolve retry permission for a student ────────────────────────────
function canRetry(studentId, classId) {
  const cls = db.prepare('SELECT retry_allowed, mastery_threshold FROM classes WHERE id = ?').get(classId);
  const stu = db.prepare('SELECT retry_override FROM students WHERE id = ?').get(studentId);
  // Student override takes precedence over class default; NULL means use class default
  if (stu && stu.retry_override !== null && stu.retry_override !== undefined) {
    return !!stu.retry_override;
  }
  return cls ? !!cls.retry_allowed : true;
}

// ── SUBMIT QUIZ ATTEMPT ───────────────────────────────────────────────────────
router.post('/quiz', requireStudent, (req, res) => {
  try {
    const { course, unit, lesson, answers, score } = req.body;
    if (!course || !unit || !lesson) return res.status(400).json({ error: 'course, unit, lesson required' });
    if (typeof score !== 'number') return res.status(400).json({ error: 'score required (0-100)' });

    // Get class settings
    const cls = db.prepare('SELECT mastery_threshold, retry_allowed FROM classes WHERE id = ?').get(req.student.class_id);
    const threshold = (cls && cls.mastery_threshold != null) ? cls.mastery_threshold : 80;
    const passed    = score >= threshold;
    const retryOk   = canRetry(req.student.id, req.student.class_id);

    // Find or create progress record
    let progressRecord = db.prepare(`
      SELECT id, locked FROM progress
      WHERE student_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = 'quiz'
    `).get(req.student.id, course, unit, lesson);

    // Block attempt if locked (final grade submitted)
    if (progressRecord && progressRecord.locked) {
      return res.status(403).json({ error: 'This quiz has been submitted as a final grade and cannot be retaken.', locked: true });
    }

    const now = new Date().toISOString();

    if (!progressRecord) {
      const pid = newId();
      // completed stays 0 until finalize — score is recorded but not "done" yet
      db.prepare(`
        INSERT INTO progress (id, student_id, class_id, course, unit, lesson, activity_type,
          completed, score, attempts, locked, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'quiz', 0, ?, 1, 0, ?)
      `).run(pid, req.student.id, req.student.class_id, course, unit, lesson, score, now);
      progressRecord = { id: pid };
    } else {
      db.prepare(`
        UPDATE progress SET
          score    = CASE WHEN ? > COALESCE(score, 0) THEN ? ELSE score END,
          attempts = attempts + 1,
          updated_at = ?
        WHERE id = ?
      `).run(score, score, now, progressRecord.id);
    }

    // Log the attempt
    db.prepare(`
      INSERT INTO quiz_attempts (id, student_id, progress_id, course, unit, lesson, answers, score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(newId(), req.student.id, progressRecord.id, course, unit, lesson, JSON.stringify(answers || {}), score);

    res.json({ ok: true, score, passed, threshold, retry_allowed: retryOk, locked: false });
  } catch (e) {
    console.error('Quiz submit error:', e);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

// ── FINALIZE QUIZ (Submit Final Grade) ────────────────────────────────────────
// Locks the progress record and marks completed=1 regardless of score.
router.post('/quiz/finalize', requireStudent, (req, res) => {
  try {
    const { course, unit, lesson } = req.body;
    if (!course || !unit || !lesson) return res.status(400).json({ error: 'course, unit, lesson required' });

    const progressRecord = db.prepare(`
      SELECT id, score, locked FROM progress
      WHERE student_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = 'quiz'
    `).get(req.student.id, course, unit, lesson);

    if (!progressRecord) return res.status(404).json({ error: 'No quiz attempt found to finalize.' });
    if (progressRecord.locked) return res.status(409).json({ error: 'Already finalized.', locked: true });

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE progress SET locked = 1, completed = 1, completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(now, now, progressRecord.id);

    res.json({ ok: true, locked: true, score: progressRecord.score, completed_at: now });
  } catch (e) {
    console.error('Finalize error:', e);
    res.status(500).json({ error: 'Failed to finalize quiz' });
  }
});

// ── GET RETRY STATUS ──────────────────────────────────────────────────────────
// Quiz pages call this on load to know whether to show "Try Again" or lock UI.
router.get('/quiz/status', requireStudent, (req, res) => {
  const { course, unit, lesson } = req.query;
  if (!course || !unit || !lesson) return res.status(400).json({ error: 'course, unit, lesson required' });

  const cls = db.prepare('SELECT mastery_threshold FROM classes WHERE id = ?').get(req.student.class_id);
  const threshold = (cls && cls.mastery_threshold != null) ? cls.mastery_threshold : 80;
  const retryOk   = canRetry(req.student.id, req.student.class_id);

  const record = db.prepare(`
    SELECT score, attempts, completed, locked, completed_at
    FROM progress WHERE student_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = 'quiz'
  `).get(req.student.id, course, unit, lesson);

  res.json({
    threshold,
    retry_allowed: retryOk,
    score:         record ? record.score : null,
    attempts:      record ? record.attempts : 0,
    completed:     record ? !!record.completed : false,
    locked:        record ? !!record.locked : false,
    completed_at:  record ? record.completed_at : null,
  });
});
// ── SOLO: create a personal (class-less) progress account ─────────────────────
router.post('/solo-init', async (req, res) => {
  try {
    const { display_name, pin } = req.body;
    if (!isValidPin(pin)) return res.status(400).json({ error: 'PIN must be exactly 4 digits' });

    const cleanName = sanitize(display_name || 'Student', 50);

    // Unique personal code — doubles as the student's solo class_code
    let code = null;
    for (let i = 0; i < 6; i++) {
      const c = 'ME-' + Array.from({ length: 4 }, () =>
        'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
      if (!db.prepare('SELECT id FROM classes WHERE class_code = ?').get(c)) { code = c; break; }
    }
    if (!code) return res.status(500).json({ error: 'Could not generate a code. Try again.' });

    const pinHash = await bcrypt.hash(String(pin), 10);
    const classId = newId();
    const studentId = newId();

    db.transaction(() => {
      // One shared system teacher owns all solo classes (satisfies the teacher_id foreign key)
      db.prepare(`
        INSERT OR IGNORE INTO teachers (id, email, name, password_hash, verified)
        VALUES ('SOLO_SYSTEM', 'solo@system.invalid', 'Solo Accounts', 'x', 1)
      `).run();

      db.prepare(`
        INSERT INTO classes (id, teacher_id, class_code, class_name, course, active, retry_allowed)
        VALUES (?, 'SOLO_SYSTEM', ?, 'Personal Progress', 'solo', 1, 1)
      `).run(classId, code);

      db.prepare(`
        INSERT INTO students (id, class_id, display_name, pin_hash)
        VALUES (?, ?, ?, ?)
      `).run(studentId, classId, cleanName, pinHash);
    })();

    const student = db.prepare('SELECT id, class_id, display_name FROM students WHERE id = ?').get(studentId);
    const token = signStudentToken(student, code);

    res.status(201).json({
      token,
      student: { id: student.id, name: student.display_name },
      login_code: code,
    });
  } catch (e) {
    console.error('Solo init error:', e);
    res.status(500).json({ error: e.message });
  }
});
// ── SOLO: log back in with personal code + PIN ────────────────────────────────
router.post('/solo-login', async (req, res) => {
  try {
    const { login_code, pin } = req.body;
    if (!login_code || !pin) return res.status(400).json({ error: 'Code and PIN required' });

    const cls = db.prepare("SELECT * FROM classes WHERE class_code = ? AND course = 'solo'")
      .get(String(login_code).toUpperCase().trim());
    if (!cls) return res.status(404).json({ error: 'Code not found. Double-check it.' });

    const student = db.prepare('SELECT * FROM students WHERE class_id = ?').get(cls.id);
    if (!student) return res.status(404).json({ error: 'No account found for that code.' });

    const valid = await bcrypt.compare(String(pin), student.pin_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect PIN' });

    db.prepare("UPDATE students SET last_active = datetime('now') WHERE id = ?").run(student.id);
    const token = signStudentToken(student, cls.class_code);

    res.json({
      token,
      student: { id: student.id, name: student.display_name },
      login_code: cls.class_code,
    });
  } catch (e) {
    console.error('Solo login error:', e);
    res.status(500).json({ error: 'Login failed' });
  }
});
// ── TRACK (auto page-view completion) ─────────────────────────────────────────
// Footer sends { handle } plus the student JWT on every ap- page.
// Course is taken from the student's class, not the page, so a stray page for a
// different course is ignored. Solo accounts roam, so they trust the page.
router.post('/track', requireStudent, (req, res) => {
  try {
    const parsed = pageFromHandle(req.body && req.body.handle);
    if (!parsed) return res.json({ ok: true, tracked: false });

    // Quizzes and exams have their own flow; never auto-complete them here.
    if (parsed.activity_type === 'quiz' || parsed.activity_type === 'exam') {
      return res.json({ ok: true, tracked: false, reason: 'handled by /quiz' });
    }

    const cls = db.prepare('SELECT course FROM classes WHERE id = ?').get(req.student.class_id);
    if (!cls) return res.json({ ok: true, tracked: false });

    let course;
    if (cls.course === 'solo') {
      course = parsed.course;               // solo roams across subjects
    } else if (cls.course === parsed.course) {
      course = cls.course;                  // normal case, page matches class
    } else {
      return res.json({ ok: true, tracked: false, reason: 'off-course page' });
    }

    const { unit, lesson, activity_type } = parsed;
    const now = new Date().toISOString();

    const existing = db.prepare(`
      SELECT id FROM progress
      WHERE student_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?
    `).get(req.student.id, course, unit, lesson, activity_type);

    if (existing) {
      db.prepare(`
        UPDATE progress SET
          completed = 1,
          completed_at = COALESCE(completed_at, ?),
          updated_at = ?
        WHERE id = ?
      `).run(now, now, existing.id);
    } else {
      db.prepare(`
        INSERT INTO progress (id, student_id, class_id, course, unit, lesson, activity_type,
          completed, score, attempts, confidence, time_spent_s, completed_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, NULL, 0, NULL, NULL, ?, ?)
      `).run(newId(), req.student.id, req.student.class_id, course, unit, lesson, activity_type, now, now);
    }

    res.json({ ok: true, tracked: true, course, unit, lesson, activity_type });
  } catch (e) {
    console.error('Track error:', e);
    res.status(500).json({ error: 'Failed to track' });
  }
});
// Server-owned correct letter for the choice-only quiz path (System B). The page
// posts the chosen letter; the server scores it against this key, so no answer
// key ships to a class-mode page. Seeded by scripts/seed-csa-bank.js.
const scoreAnswerKeyStmt = db.prepare(
  'SELECT answer FROM quiz_answer_bank WHERE course = ? AND lesson = ? AND item = ?'
);

// ── SCORE (record one graded interaction) ─────────────────────────────────────
// rollupScore lives in ../scoring.js so this path and the Phase 2 server-side
// quiz scorer (routes/quiz.js) roll up progress.score identically.
// The course-agnostic keystone. Every CFU "check answer", exercise item, or any
// scored response posts here, for CSA, CSP, and Cyber alike. It does two things:
//   1. Appends the raw result to score_events (append-only; the full attempt
//      history and the submitted answer are kept, never overwritten).
//   2. Recomputes the activity rollup and writes it as a 0-100 pct into
//      progress.score, lighting up the student view, teacher gradebook, and
//      admin drill with no read-side changes.
// completed is deliberately NOT touched here: visit-completion stays owned by
// /track and gated finals by /quiz + /quiz/finalize. This records grades only.
router.post('/score', requireStudent, (req, res) => {
  try {
    const b = req.body || {};
    if (!b.course || !b.unit || !b.lesson) {
      return res.status(400).json({ error: 'course, unit, lesson required' });
    }

    // Resolve course exactly like /track: solo accounts roam across subjects;
    // class accounts may only score their own course's pages.
    const cls = db.prepare('SELECT course FROM classes WHERE id = ?').get(req.student.class_id);
    if (!cls) return res.json({ ok: true, tracked: false });
    let course;
    if (cls.course === 'solo')          course = b.course;
    else if (cls.course === b.course)   course = cls.course;
    else return res.json({ ok: true, tracked: false, reason: 'off-course page' });

    const unit          = String(b.unit);
    const lesson        = String(b.lesson);
    const activity_type = b.activity_type ? String(b.activity_type) : 'cfu';
    const item          = b.item != null ? String(b.item).slice(0, 120) : 'item';

    // Points, resolved from whichever form the reporter sent:
    //   • quiz + choice     : server-side scoring. The page sends only the chosen
    //     letter; the server owns correctness via quiz_answer_bank so no key ever
    //     ships to a class-mode page. 1 point if the choice matches, else 0.
    //   • earned + possible : whole-run form for exercise-2 (game, out of 6) and
    //     exercise-3 (FRQ, out of 1). One result per run, best kept per item.
    //   • points + max_points : explicit partial credit.
    //   • correct           : boolean, mapped to 1/1 or 0/1.
    let points, max_points, correct;
    const quizChoice = activity_type === 'quiz' && b.choice != null
      && b.correct == null && b.points == null && b.max_points == null
      && b.earned == null && b.possible == null;
    if (quizChoice) {
      const key = scoreAnswerKeyStmt.get(course, lesson, item);
      if (!key) {
        return res.status(400).json({ error: `No answer key for ${course} ${lesson} ${item}. Cannot score this quiz item.` });
      }
      correct    = String(b.choice).trim().toUpperCase() === String(key.answer).trim().toUpperCase() ? 1 : 0;
      points     = correct;
      max_points = 1;
    } else if (b.earned != null || b.possible != null) {
      points     = Number(b.earned ?? 0);
      max_points = Number(b.possible ?? 1);
      correct    = b.correct != null ? (b.correct ? 1 : 0)
                 : (max_points > 0 && points >= max_points ? 1 : 0);
    } else if (b.points != null || b.max_points != null) {
      points     = Number(b.points ?? 0);
      max_points = Number(b.max_points ?? 1);
      correct    = b.correct != null ? (b.correct ? 1 : 0)
                 : (max_points > 0 && points >= max_points ? 1 : 0);
    } else if (b.correct != null) {
      correct    = b.correct ? 1 : 0;
      points     = correct;
      max_points = 1;
    } else {
      return res.status(400).json({ error: 'Provide `choice` (quiz), `correct` (boolean), `points` + `max_points`, or `earned` + `possible`' });
    }
    if (!Number.isFinite(points) || !Number.isFinite(max_points) || max_points <= 0) {
      return res.status(400).json({ error: 'points must be finite and max_points > 0' });
    }
    points = Math.max(0, Math.min(points, max_points)); // clamp into [0, max]

    // Known location? Never block on a config lag — store either way, but flag
    // an unrecognized course/unit so drift surfaces instead of failing silently.
    const recognized = !!(COURSES[course] && COURSES[course].units[unit]);
    const clientEventId = b.client_event_id ? String(b.client_event_id).slice(0, 100) : null;

    // Idempotency: a client_event_id already seen for this student is a retry
    // (flaky mobile double-submit). Don't double-count; return the live rollup.
    if (clientEventId) {
      const dupe = db.prepare(
        'SELECT id FROM score_events WHERE student_id = ? AND client_event_id = ?'
      ).get(req.student.id, clientEventId);
      if (dupe) {
        return res.json({
          ok: true, tracked: true, duplicate: true, recognized,
          item: { item, points, max_points, correct },
          rollup: rollupScore(req.student.id, course, unit, lesson, activity_type),
        });
      }
    }

    const now = new Date().toISOString();

    const rollup = db.transaction(() => {
      // 1) append the immutable event
      db.prepare(`
        INSERT INTO score_events
          (id, student_id, class_id, course, unit, lesson, activity_type, item,
           points, max_points, correct, answers, client_event_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newId(), req.student.id, req.student.class_id, course, unit, lesson,
        activity_type, item, points, max_points, correct,
        b.answers != null ? JSON.stringify(b.answers) : null,
        clientEventId, now
      );

      // 2) recompute rollup and 3) upsert it into progress.score
      const roll = rollupScore(req.student.id, course, unit, lesson, activity_type);
      const existing = db.prepare(`
        SELECT id FROM progress
        WHERE student_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?
      `).get(req.student.id, course, unit, lesson, activity_type);

      if (existing) {
        db.prepare(`UPDATE progress SET score = ?, attempts = ?, updated_at = ? WHERE id = ?`)
          .run(roll.pct, roll.events, now, existing.id);
      } else {
        db.prepare(`
          INSERT INTO progress (id, student_id, class_id, course, unit, lesson,
            activity_type, completed, score, attempts, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
        `).run(newId(), req.student.id, req.student.class_id, course, unit, lesson,
          activity_type, roll.pct, roll.events, now);
      }
      return roll;
    })();

    const out = { ok: true, tracked: true, recognized, item: { item, points, max_points, correct }, rollup };
    if (!recognized) {
      out.warning = `Unrecognized ${course} location ${unit}/${lesson}. Stored anyway; check COURSES config.`;
    }
    res.json(out);
  } catch (e) {
    console.error('Score error:', e);
    res.status(500).json({ error: 'Failed to record score' });
  }
});

// ── CODE GRADE (server-side grading for Judge0-backed code items) ──────────────
//  The integrity fix for code exercises. A client-reported verdict is forgeable,
//  and for code, output comparison against the visible expected output dies to a
//  hardcoded System.out.println of that output. The fix, ported from the quiz
//  path: the correct answers (here, a bank of test cases) live server-side and
//  never ship to the client. The server runs the student's source against every
//  case through the EXISTING Judge0 proxy (POST /api/judge0/run), scores
//  cases-passed / total scaled to the item's manifest points, and writes the grade
//  onto the same System B ledger (score_events -> progress.score) the Cyber and CSP
//  grade paths use, so the teacher dashboard and CSV light up with no read change.
//
//  DATA POLICY (non-negotiable): the source is graded in transit and DISCARDED.
//  It is never written to any table. Only the verdict (pass counts) and the derived
//  points are stored. The response summarizes what failed; it never returns a test
//  case, especially a hidden one.
const JUDGE0_LANGUAGE_IDS = { java: 62, python: 71, python3: 71, javascript: 63, js: 63, node: 63 };
const CODE_ALLOWED_LANGUAGE_IDS = new Set([62, 71, 63]);
const CODE_MAX_SOURCE_LEN = 20000;   // matches the Judge0 proxy's own cap
const CODE_MAX_CASES = 20;           // bound Judge0 calls per grade (cost + memory)

const codeDenominatorStmt = db.prepare(
  'SELECT possible FROM course_denominators WHERE course = ? AND lesson = ? AND activity_type = ?'
);
const codeCasesStmt = db.prepare(
  'SELECT seq, prelude, postlude, stdin, expected_stdout, hidden FROM code_test_cases WHERE course = ? AND lesson = ? AND item = ? ORDER BY seq'
);
const codeDupeStmt = db.prepare(
  'SELECT answers FROM score_events WHERE student_id = ? AND client_event_id = ?'
);

// Normalize stdout for comparison: unify line endings, strip trailing whitespace
// on each line, and drop trailing blank lines. Robust to a stray newline without
// letting a wrong answer slip through.
function normalizeOutput(s) {
  return String(s == null ? '' : s)
    .replace(/\r\n/g, '\n')
    .split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n')
    .replace(/\n+$/, '');
}

// Resolve a requested language to an allow-listed Judge0 id, or null if unknown.
function resolveLanguageId(language) {
  if (typeof language === 'number' || /^\d+$/.test(String(language))) {
    const id = Number(language);
    return CODE_ALLOWED_LANGUAGE_IDS.has(id) ? id : null;
  }
  const id = JUDGE0_LANGUAGE_IDS[String(language).trim().toLowerCase()];
  return id && CODE_ALLOWED_LANGUAGE_IDS.has(id) ? id : null;
}

// Assemble the program actually run for one case. The student submits a BARE CODE
// SEGMENT (AP style); the case injects inputs as `prelude` (before) and `postlude`
// (after). For Java we wrap prelude + segment + postlude in a class/main so the
// segment compiles. Python/JS have no class ceremony, so we just concatenate.
// The student segment is used in transit only and never stored.
function buildProgram(languageId, prelude, segment, postlude) {
  const body = (prelude ? prelude + '\n' : '') + segment + '\n' + (postlude ? postlude + '\n' : '');
  if (languageId === 62) {
    return 'public class Main {\n  public static void main(String[] args) {\n' + body + '  }\n}\n';
  }
  return body;
}

// Rate limit per (student, item): Judge0 is the expensive call, so this is the
// primary guard. Same bounded-map shape as routes/progress.js: fixed window, no
// timers, hard key cap so the map can never grow unbounded on Railway.
const CG_WINDOW_MS = 60_000;
const CG_MAX_PER_WINDOW = 10;
const CG_MAX_KEYS = 5000;
const cgBuckets = new Map();
function codeGradeRateLimit(key) {
  const now = Date.now();
  let bucket = cgBuckets.get(key);
  if (!bucket || now - bucket.start >= CG_WINDOW_MS) {
    if (cgBuckets.size >= CG_MAX_KEYS) {
      for (const [k, v] of cgBuckets) if (now - v.start >= CG_WINDOW_MS) cgBuckets.delete(k);
      if (cgBuckets.size >= CG_MAX_KEYS) cgBuckets.clear();
    }
    bucket = { start: now, count: 0 };
    cgBuckets.set(key, bucket);
  }
  bucket.count++;
  return bucket.count <= CG_MAX_PER_WINDOW;
}

// Run one source against one stdin through the existing Judge0 proxy. We call our
// own /api/judge0/run over loopback rather than Judge0 directly, so all language
// allow-listing, base64 handling, and limits stay owned by that one subsystem. The
// X-Forwarded-For carries the student id so the proxy's per-identity hourly limiter
// partitions by student instead of lumping every internal call into one bucket.
async function runOneCase(baseUrl, studentId, languageId, source, stdin) {
  const r = await fetch(baseUrl + '/api/judge0/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': 'codegrade:' + studentId },
    body: JSON.stringify({ code: source, language_id: languageId, stdin }),
  });
  if (!r.ok) {
    const err = new Error('judge0_unavailable');
    err.statusFromProxy = r.status;
    throw err;
  }
  return r.json();
}

router.post('/code-grade', requireStudent, async (req, res) => {
  try {
    const b = req.body || {};

    // Resolve course exactly like /score: solo accounts roam; class accounts may
    // only grade their own course's pages.
    const cls = db.prepare('SELECT course FROM classes WHERE id = ?').get(req.student.class_id);
    if (!cls) return res.status(401).json({ error: 'Class not found for student' });
    let course;
    if (cls.course === 'solo')        course = typeof b.course === 'string' ? b.course.slice(0, 40) : '';
    else if (cls.course === b.course) course = cls.course;
    else return res.status(400).json({ error: `course must be '${cls.course}' for this class` });

    const unit   = b.unit != null ? String(b.unit) : '';
    const lesson = b.lesson != null ? String(b.lesson) : '';
    const item   = b.item != null ? String(b.item).slice(0, 120) : '';
    if (!course || !unit || !lesson || !item) {
      return res.status(400).json({ error: 'course, unit, lesson, item, language, source required' });
    }

    const languageId = resolveLanguageId(b.language);
    if (!languageId) {
      return res.status(400).json({ error: 'language must be one of java (62), python (71), javascript (63)' });
    }

    const source = typeof b.source === 'string' ? b.source : '';
    if (!source.trim()) return res.status(400).json({ error: 'source is required' });
    if (source.length > CODE_MAX_SOURCE_LEN) {
      return res.status(400).json({ error: `source too long (max ${CODE_MAX_SOURCE_LEN} chars)` });
    }

    // Idempotency: a client_event_id already graded for this student is a retry
    // (flaky mobile double-submit). Do NOT re-run Judge0; return the stored verdict.
    const clientEventId = b.client_event_id ? String(b.client_event_id).slice(0, 100) : null;
    if (clientEventId) {
      const dupe = codeDupeStmt.get(req.student.id, clientEventId);
      if (dupe) {
        let v = {};
        try { v = JSON.parse(dupe.answers || '{}'); } catch (_) { /* ignore */ }
        return res.json({
          passed: v.cases_passed ?? null,
          total: v.cases_total ?? null,
          points_earned: v.points_earned ?? null,
          points_possible: v.points_possible ?? null,
          failing_case_summary: null,
          duplicate: true,
        });
      }
    }

    // The hidden test bank. No cases means this location is not server-graded; the
    // page keeps its existing behavior. Checked first so this 404 fallback signal is
    // reliable even where the manifest is still incomplete (same 404-to-fallback
    // posture as the quizzes).
    const cases = codeCasesStmt.all(course, lesson, item);
    if (!cases.length) {
      return res.status(404).json({ error: 'No server-graded code exercise for this location' });
    }
    if (cases.length > CODE_MAX_CASES) cases.length = CODE_MAX_CASES;

    // Manifest is the max_score authority: no denominator, no grade (surface drift
    // rather than invent a scale).
    const denom = codeDenominatorStmt.get(course, lesson, item);
    if (!denom) {
      return res.status(400).json({ error: `No manifest points for ${course} ${lesson} ${item}. Not in course_denominators.` });
    }
    const pointsPossible = Number(denom.possible);

    // Rate limit per (student, item): the expensive path is Judge0, so guard here
    // before we make any run.
    const rlKey = req.student.id + '|' + course + '|' + lesson + '|' + item;
    if (!codeGradeRateLimit(rlKey)) {
      return res.status(429).json({ error: 'Too many grade attempts. Wait a minute and try again.' });
    }

    const baseUrl = process.env.SELF_BASE_URL || `http://127.0.0.1:${process.env.PORT || 4000}`;

    // Run every case sequentially (bounded concurrency, bounded memory). A pass
    // requires an Accepted run (status_id 3) whose stdout matches the expected
    // output after normalization. Compile or runtime errors fail the case.
    let passed = 0;
    for (const c of cases) {
      // Inject this case's inputs and wrap the student's bare segment into a
      // runnable program. Different (often hidden) preludes are what make
      // hardcoding the visible output fail.
      const program = buildProgram(languageId, c.prelude || '', source, c.postlude || '');
      let result;
      try {
        result = await runOneCase(baseUrl, req.student.id, languageId, program, String(c.stdin || ''));
      } catch (err) {
        // Judge0 rate-limited or unavailable: do NOT record a 0 for an infra
        // failure. Return without writing anything so the student can retry.
        const status = err.statusFromProxy === 429 ? 429 : 502;
        return res.status(status).json({
          error: status === 429
            ? 'Code runner is busy. Wait a moment and try again.'
            : 'Code runner is temporarily unavailable. Your attempt was not graded; try again shortly.',
        });
      }
      const accepted = result && result.status_id === 3;
      if (accepted && normalizeOutput(result.stdout) === normalizeOutput(c.expected_stdout)) {
        passed++;
      }
    }

    const total = cases.length;
    const pointsEarned = Math.round((passed / total) * pointsPossible * 100) / 100;
    const allPassed = passed === total;

    // Write onto System B. The graded code item is one distinct item within its
    // activity (activity_type = item), so rollupScore keeps the best result per
    // item and writes the 0-100 percent into progress.score. answers holds the
    // verdict ONLY: pass counts and points. Never the source, never a test case.
    const now = new Date().toISOString();
    const verdict = JSON.stringify({
      cases_passed: passed, cases_total: total,
      points_earned: pointsEarned, points_possible: pointsPossible,
    });
    const rollup = db.transaction(() => {
      db.prepare(`
        INSERT INTO score_events
          (id, student_id, class_id, course, unit, lesson, activity_type, item,
           points, max_points, correct, answers, client_event_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newId(), req.student.id, req.student.class_id, course, unit, lesson,
        item, item, pointsEarned, pointsPossible, allPassed ? 1 : 0,
        verdict, clientEventId, now
      );
      const roll = rollupScore(req.student.id, course, unit, lesson, item);
      const existing = db.prepare(`
        SELECT id FROM progress
        WHERE student_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?
      `).get(req.student.id, course, unit, lesson, item);
      if (existing) {
        db.prepare('UPDATE progress SET score = ?, attempts = ?, updated_at = ? WHERE id = ?')
          .run(roll.pct, roll.events, now, existing.id);
      } else {
        db.prepare(`
          INSERT INTO progress (id, student_id, class_id, course, unit, lesson,
            activity_type, completed, score, attempts, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
        `).run(newId(), req.student.id, req.student.class_id, course, unit, lesson,
          item, roll.pct, roll.events, now);
      }
      return roll;
    })();

    // Summary of what failed, never the case. A hidden case's prelude or expected
    // output is never revealed, so the summary cannot become an answer key.
    const failing_case_summary = allPassed ? null : {
      cases_failed: total - passed,
      cases_total: total,
      message: `${total - passed} of ${total} test cases failed. Some tests use hidden inputs, so matching only the shown example is not enough. Make sure your code computes the result from the given values instead of printing a fixed answer.`,
    };

    // source goes out of scope here and is never persisted. Only the verdict above
    // was written.
    res.json({
      passed,
      total,
      points_earned: pointsEarned,
      points_possible: pointsPossible,
      failing_case_summary,
      score_pct: rollup.pct,
    });
  } catch (e) {
    console.error('Code grade error:', e);
    res.status(500).json({ error: 'Failed to grade code' });
  }
});

module.exports = router;
