'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');
const { requireStudent } = require('../middleware');
const { newId, signStudentToken, verifyStudentToken, generateStudentCode,
  isValidPin, isValidClassCode, sanitize, COURSES, pageFromHandle } = require('../utils');
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
// Progress is keyed to student_id, so one identity's work across every course it
// has touched is returned in a single call (the my-progress course switcher reads
// this). Pass ?course=ap-csa to scope to one course; omit it for everything.
router.get('/progress', requireStudent, (req, res) => {
  const course = typeof req.query.course === 'string' ? req.query.course : null;
  const records = course
    ? db.prepare(`
        SELECT course, unit, lesson, activity_type, completed, score, attempts, confidence, completed_at, updated_at
        FROM progress WHERE student_id = ? AND course = ? ORDER BY unit, lesson, activity_type
      `).all(req.student.id, course)
    : db.prepare(`
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

    // Points: explicit points/max_points win (partial credit); otherwise derive
    // from the boolean `correct`. One of the two forms is required.
    let points, max_points, correct;
    if (b.points != null || b.max_points != null) {
      points     = Number(b.points ?? 0);
      max_points = Number(b.max_points ?? 1);
      correct    = b.correct != null ? (b.correct ? 1 : 0)
                 : (max_points > 0 && points >= max_points ? 1 : 0);
    } else if (b.correct != null) {
      correct    = b.correct ? 1 : 0;
      points     = correct;
      max_points = 1;
    } else {
      return res.status(400).json({ error: 'Provide `correct` (boolean) or `points` + `max_points`' });
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
// ─────────────────────────────────────────────────────────────────────────────
//  MULTI-CLASS IDENTITY (additive to the class-scoped flow above)
//
//  Identity is now split from enrollment: one student can belong to many classes
//  and study other courses solo, all under a single login (student_code + PIN).
//  These routes never touch the legacy /join /login /solo-* endpoints, which stay
//  live for the deployed theme. class_id on the student row is the HOME class
//  (first class joined) and keeps the existing write path working; membership
//  proper lives in the enrollments table.
// ─────────────────────────────────────────────────────────────────────────────

// Issue a student_code no other identity holds. Retries on the rare collision.
function mintStudentCode() {
  for (let i = 0; i < 8; i++) {
    const code = generateStudentCode();
    if (!db.prepare('SELECT 1 FROM students WHERE student_code = ?').get(code)) return code;
  }
  return null;
}

// Enrollment list for one identity, richest-first, with class + teacher context.
const enrollmentsForStmt = db.prepare(`
  SELECT c.id AS class_id, c.class_code, c.class_name, c.course,
         c.mastery_threshold, c.retry_allowed, c.active AS class_active,
         e.active AS enrolled, e.enrolled_at, t.name AS teacher_name
  FROM enrollments e
  JOIN classes c  ON c.id = e.class_id
  LEFT JOIN teachers t ON t.id = c.teacher_id
  WHERE e.student_id = ? AND e.active = 1
  ORDER BY e.enrolled_at DESC
`);

// ── REGISTER (identity-first, no class) ───────────────────────────────────────
// Mints a class-less identity and its student_code. The /pages/join flow calls
// this for a brand-new student, shows the code once, then calls /enroll with the
// class code they arrived on. Two "Jake M."s with PIN 1234 never collide: login
// is by student_code, not name.
router.post('/register', async (req, res) => {
  try {
    const { display_name, pin } = req.body || {};
    if (!display_name || String(display_name).trim().length < 1) return res.status(400).json({ error: 'Name required' });
    if (!isValidPin(pin)) return res.status(400).json({ error: 'PIN must be exactly 4 digits' });

    const cleanName = sanitize(display_name, 50);
    const code = mintStudentCode();
    if (!code) return res.status(500).json({ error: 'Could not issue a student code. Try again.' });

    const pinHash = await bcrypt.hash(String(pin), 10);
    const id = newId();
    // class_id stays NULL until the student enrolls: identity before enrollment.
    db.prepare(`
      INSERT INTO students (id, class_id, student_code, display_name, pin_hash)
      VALUES (?, NULL, ?, ?, ?)
    `).run(id, code, cleanName, pinHash);

    const student = db.prepare('SELECT id, class_id, display_name, student_code FROM students WHERE id = ?').get(id);
    const token = signStudentToken(student, null);

    res.status(201).json({
      token,
      student_code: student.student_code,
      student: { id: student.id, name: student.display_name, student_code: student.student_code },
    });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ error: 'Failed to register' });
  }
});

// ── LOGIN BY STUDENT CODE ─────────────────────────────────────────────────────
// The identity login: student_code + PIN, class-independent. Kept separate from
// the legacy class-scoped /login so the deployed theme is untouched.
router.post('/login-code', async (req, res) => {
  try {
    const { student_code, pin } = req.body || {};
    if (!student_code || !pin) return res.status(400).json({ error: 'Student code and PIN required' });

    const student = db.prepare('SELECT * FROM students WHERE student_code = ?')
      .get(String(student_code).toUpperCase().trim());
    if (!student) return res.status(404).json({ error: 'Student code not found. Ask your teacher for your code.' });
    if (student.active === 0) return res.status(403).json({ error: 'This account has been deactivated by your teacher.' });

    const valid = await bcrypt.compare(String(pin), student.pin_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect PIN' });

    db.prepare("UPDATE students SET last_active = datetime('now') WHERE id = ?").run(student.id);
    const homeCode = student.class_id
      ? (db.prepare('SELECT class_code FROM classes WHERE id = ?').get(student.class_id) || {}).class_code
      : null;
    const token = signStudentToken(student, homeCode);

    res.json({
      token,
      student: { id: student.id, name: student.display_name, student_code: student.student_code },
      enrollments: enrollmentsForStmt.all(student.id),
    });
  } catch (e) {
    console.error('Login-code error:', e);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── ENROLL (join a class as an existing identity) ─────────────────────────────
// Writes an enrollment row against the CURRENT student. It never creates a
// student, which is the whole fix for the second-class-mints-a-second-account
// bug. Idempotent: re-joining a class you are already in is a friendly no-op.
router.post('/enroll', requireStudent, (req, res) => {
  try {
    const { class_code } = req.body || {};
    if (!class_code) return res.status(400).json({ error: 'Class code required' });

    const cls = db.prepare('SELECT * FROM classes WHERE class_code = ?')
      .get(String(class_code).toUpperCase().trim());
    if (!cls) return res.status(404).json({ error: 'Class not found. Check your class code.' });
    if (cls.course === 'solo') return res.status(400).json({ error: 'That is a personal code, not a class code.' });
    if (!cls.active) return res.status(403).json({ error: 'That class is inactive. Ask your teacher.' });

    const existing = db.prepare('SELECT id, active FROM enrollments WHERE student_id = ? AND class_id = ?')
      .get(req.student.id, cls.id);
    if (existing && existing.active) {
      return res.status(200).json({
        already_enrolled: true,
        enrollment: { class_code: cls.class_code, class_name: cls.class_name, course: cls.course },
      });
    }

    // Joining a second class for a course you already have a class in is allowed
    // but surfaced, since it is usually a mistake (per the handoff join flow).
    const sameCourse = db.prepare(`
      SELECT c.class_code FROM enrollments e JOIN classes c ON c.id = e.class_id
      WHERE e.student_id = ? AND e.active = 1 AND c.course = ? AND c.id != ?
    `).all(req.student.id, cls.course, cls.id).map(r => r.class_code);

    db.transaction(() => {
      if (existing) {
        db.prepare('UPDATE enrollments SET active = 1, enrolled_at = datetime(\'now\') WHERE id = ?').run(existing.id);
      } else {
        db.prepare(`
          INSERT INTO enrollments (id, student_id, class_id, enrolled_at, active)
          VALUES (?, ?, ?, datetime('now'), 1)
        `).run(newId(), req.student.id, cls.id);
      }
      // Adopt this class as the home class if the identity has none yet, so the
      // legacy class_id-based write path (track/score/quiz) keeps working.
      if (!req.student.class_id) {
        db.prepare('UPDATE students SET class_id = ? WHERE id = ? AND class_id IS NULL').run(cls.id, req.student.id);
      }
    })();

    res.status(201).json({
      enrollment: {
        class_code: cls.class_code, class_name: cls.class_name, course: cls.course,
        mastery_threshold: cls.mastery_threshold, retry_allowed: cls.retry_allowed,
      },
      duplicate_course_warning: sameCourse.length ? sameCourse : undefined,
    });
  } catch (e) {
    console.error('Enroll error:', e);
    res.status(500).json({ error: 'Failed to enroll' });
  }
});

// ── LIST ENROLLMENTS (identity's classes) ─────────────────────────────────────
router.get('/enrollments', requireStudent, (req, res) => {
  try {
    res.json({
      student: { id: req.student.id, name: req.student.display_name },
      enrollments: enrollmentsForStmt.all(req.student.id),
    });
  } catch (e) {
    console.error('Enrollments error:', e);
    res.status(500).json({ error: 'Failed to load enrollments' });
  }
});

// ── AD GATE (per-course resolution) ───────────────────────────────────────────
// One call the theme evaluates per page. The trap the handoff calls out: a
// student enrolled in Cyber who reads CSA pages is SOLO for CSA and must see
// ads there. So enrollment is resolved for the page's course, never "is this
// user in any class". Auth is optional: no/invalid token is anonymous.
//
//   GET /api/student/ad-gate?course=ap-csa[&unit=unit-1]
//   -> { ads, reason, course, unit, authenticated, enrolled_in_course }
//
// Tier resolution (handoff section 9):
//   anonymous / no token                        -> ads ON
//   enrolled for THIS course, teacher PAID      -> ads OFF (all units)
//   enrolled for THIS course, teacher FREE      -> ads OFF for the first unit, ON beyond it
//   token but NOT enrolled for this course      -> ads ON (solo for the course; the trap)
// A student enrolled in two classes for the same course gets the better tier
// (paid wins). teacher_plan echoes the tier that decided the outcome.
router.get('/ad-gate', (req, res) => {
  const course = typeof req.query.course === 'string' ? req.query.course : null;
  const unit = typeof req.query.unit === 'string' ? req.query.unit : null;
  if (!course) return res.status(400).json({ error: 'course required' });

  // Optional auth: parse a bearer token if present, but never fail on its absence.
  let student = null;
  const auth = req.headers.authorization || '';
  const tok = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (tok) {
    try {
      const payload = verifyStudentToken(tok);
      if (payload.role === 'student') {
        student = db.prepare('SELECT id FROM students WHERE id = ?').get(payload.id) || null;
      }
    } catch (e) { /* anonymous */ }
  }

  if (!student) {
    return res.json({ ads: true, reason: 'anonymous', course, unit, authenticated: false, enrolled_in_course: false });
  }

  // Active enrollments for THIS course, with the owning teacher's plan. Paid
  // beats free across multiple classes for the same course.
  const tiers = db.prepare(`
    SELECT COALESCE(t.plan, 'free') AS plan
    FROM enrollments e
    JOIN classes  c ON c.id = e.class_id
    LEFT JOIN teachers t ON t.id = c.teacher_id
    WHERE e.student_id = ? AND e.active = 1 AND c.active = 1 AND c.course = ?
  `).all(student.id, course).map(r => r.plan);

  if (!tiers.length) {
    // Solo for this course even if enrolled elsewhere. This is the anti-trap case.
    return res.json({ ads: true, reason: 'solo-for-course', course, unit, authenticated: true, enrolled_in_course: false, teacher_plan: null });
  }

  const paid = tiers.includes('paid');
  if (paid) {
    return res.json({ ads: false, reason: 'enrolled-paid', course, unit, authenticated: true, enrolled_in_course: true, teacher_plan: 'paid' });
  }

  // Free teacher: first unit free, rest gated. A caller that passes no unit gets
  // ads OFF (lesson pages pass their unit; hubs that omit it read as first-unit).
  const firstUnit = !unit || unit === 'unit-1' || unit === 'bi-1';
  return res.json({
    ads: !firstUnit,
    reason: firstUnit ? 'enrolled-free-unit1' : 'enrolled-free-unit2plus',
    course, unit, authenticated: true, enrolled_in_course: true, teacher_plan: 'free',
  });
});

module.exports = router;
