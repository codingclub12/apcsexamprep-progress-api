'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');
const { requireTeacher } = require('../middleware');
const {
  newId, generateClassCode, signTeacherToken,
  isValidEmail, isValidPin, sanitize, COURSES, COURSE_PREFIXES,
} = require('../utils');

// Mastery threshold is clamped to 50-100 per the class settings spec: a bar
// below 50 is not a meaningful mastery line. Reads elsewhere default to 80 when
// a class has no threshold set. Returns fallback when the value is not a number.
const THRESHOLD_MIN = 50, THRESHOLD_MAX = 100;
function clampThreshold(v, fallback = 80) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(THRESHOLD_MAX, Math.max(THRESHOLD_MIN, n));
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, school } = req.body;
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Name required' });

    const existing = db.prepare('SELECT id FROM teachers WHERE email = ?').get(email.trim().toLowerCase());
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const id = newId();
    db.prepare(`
      INSERT INTO teachers (id, email, name, school, password_hash)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, email.trim().toLowerCase(), sanitize(name, 100), sanitize(school || '', 200), hash);

    const teacher = db.prepare('SELECT id, email, name, school FROM teachers WHERE id = ?').get(id);
    const token = signTeacherToken(teacher);
    res.status(201).json({ token, teacher: { id: teacher.id, email: teacher.email, name: teacher.name, school: teacher.school } });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const teacher = db.prepare('SELECT * FROM teachers WHERE email = ?').get(email.trim().toLowerCase());
    if (!teacher) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, teacher.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signTeacherToken(teacher);
    res.json({ token, teacher: { id: teacher.id, email: teacher.email, name: teacher.name, school: teacher.school } });
  } catch (e) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── ME ────────────────────────────────────────────────────────────────────────
router.get('/me', requireTeacher, (req, res) => {
  res.json({ teacher: req.teacher });
});

// ── LIST CLASSES ──────────────────────────────────────────────────────────────
router.get('/classes', requireTeacher, (req, res) => {
  const classes = db.prepare(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM students WHERE class_id = c.id) as student_count,
      (SELECT COUNT(*) FROM progress WHERE class_id = c.id AND completed = 1) as completions
    FROM classes c
    WHERE c.teacher_id = ?
    ORDER BY c.created_at DESC
  `).all(req.teacher.id);
  res.json({ classes });
});

// ── CREATE CLASS ──────────────────────────────────────────────────────────────
router.post('/classes', requireTeacher, (req, res) => {
  try {
    const { class_name, course = 'ap-cybersecurity', mastery_threshold = 80, retry_allowed = 0 } = req.body;
    if (!class_name || class_name.trim().length < 2) return res.status(400).json({ error: 'Class name required' });
    if (!COURSES[course]) return res.status(400).json({ error: 'Invalid course' });

    const threshold   = clampThreshold(mastery_threshold, 80);
    const retryFlag   = retry_allowed ? 1 : 0;

    const prefix = COURSE_PREFIXES[course] || 'CLASS';
    // Generate unique class code
    let code, attempts = 0;
    do {
      code = generateClassCode(prefix);
      attempts++;
      if (attempts > 20) return res.status(500).json({ error: 'Could not generate unique class code' });
    } while (db.prepare('SELECT id FROM classes WHERE class_code = ?').get(code));

    const id = newId();
    db.prepare(`
      INSERT INTO classes (id, teacher_id, class_code, class_name, course, mastery_threshold, retry_allowed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.teacher.id, code, sanitize(class_name, 100), course, threshold, retryFlag);

    const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(id);
    res.status(201).json({ class: cls });
  } catch (e) {
    console.error('Create class error:', e);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// ── GET CLASS DETAILS ─────────────────────────────────────────────────────────
router.get('/classes/:code', requireTeacher, (req, res) => {
  const cls = db.prepare('SELECT * FROM classes WHERE class_code = ? AND teacher_id = ?')
    .get(req.params.code.toUpperCase(), req.teacher.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const students = db.prepare(`
    SELECT id, display_name, student_ref, active, created_at, last_active
    FROM students WHERE class_id = ? ORDER BY display_name
  `).all(cls.id);

  res.json({ class: cls, students });
});

// ── CLASS PROGRESS DASHBOARD ──────────────────────────────────────────────────
router.get('/classes/:code/progress', requireTeacher, (req, res) => {
  const cls = db.prepare('SELECT * FROM classes WHERE class_code = ? AND teacher_id = ?')
    .get(req.params.code.toUpperCase(), req.teacher.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const students = db.prepare(`
    SELECT id, display_name, student_ref, active, last_active
    FROM students WHERE class_id = ? ORDER BY display_name
  `).all(cls.id);

  const allProgress = db.prepare(`
    SELECT student_id, unit, lesson, activity_type, completed, score, attempts, confidence, completed_at, locked, id as progress_id
    FROM progress WHERE class_id = ? AND course = ?
  `).all(cls.id, cls.course);

  // Exact points per activity from the score_events ledger, in a single
  // aggregate pass (no N+1). Best points per DISTINCT item, summed, exactly as
  // rollupScore derives progress.score, so the raw points and the percent can
  // never disagree. The gradebook shows real points instead of reconstructing
  // them from the rounded percent.
  const allPoints = db.prepare(`
    SELECT student_id, unit, lesson, activity_type,
           SUM(best_points) AS points_earned,
           SUM(item_max)    AS points_possible
    FROM (
      SELECT student_id, unit, lesson, activity_type, item,
             MAX(points)     AS best_points,
             MAX(max_points) AS item_max
      FROM score_events
      WHERE class_id = ? AND course = ?
      GROUP BY student_id, unit, lesson, activity_type, item
    )
    GROUP BY student_id, unit, lesson, activity_type
  `).all(cls.id, cls.course);
  const pointsMap = {};
  for (const pt of allPoints) {
    pointsMap[`${pt.student_id}|${pt.unit}|${pt.lesson}|${pt.activity_type}`] = pt;
  }

  // Build progress map: student_id → { unit → { lesson → { activity → record } } }
  const progressMap = {};
  for (const p of allProgress) {
    if (!progressMap[p.student_id]) progressMap[p.student_id] = {};
    if (!progressMap[p.student_id][p.unit]) progressMap[p.student_id][p.unit] = {};
    if (!progressMap[p.student_id][p.unit][p.lesson]) progressMap[p.student_id][p.unit][p.lesson] = {};
    const pt = pointsMap[`${p.student_id}|${p.unit}|${p.lesson}|${p.activity_type}`];
    progressMap[p.student_id][p.unit][p.lesson][p.activity_type] = {
      completed:    !!p.completed,
      score:        p.score,
      attempts:     p.attempts,
      confidence:   p.confidence,
      completed_at: p.completed_at,
      locked:       !!p.locked,
      progress_id:  p.progress_id,
      points_earned:   pt ? pt.points_earned : null,
      points_possible: pt ? pt.points_possible : null,
    };
  }

  const courseConfig = COURSES[cls.course] || {};

  // Compute per-student summary
  const summary = students.map(s => {
    const sp = progressMap[s.id] || {};
    const unitSummaries = {};
    for (const [unitKey, unitCfg] of Object.entries(courseConfig.units || {})) {
      let totalActivities = 0, completedActivities = 0, totalScore = 0, scoredCount = 0;
      for (const lesson of unitCfg.lessons) {
        for (const act of unitCfg.activities) {
          totalActivities++;
          const rec = sp[unitKey]?.[lesson]?.[act];
          if (rec?.completed) completedActivities++;
          if (rec?.score != null) { totalScore += rec.score; scoredCount++; }
        }
      }
      unitSummaries[unitKey] = {
        completed: completedActivities,
        total: totalActivities,
        pct: totalActivities ? Math.round(completedActivities / totalActivities * 100) : 0,
        avg_score: scoredCount ? Math.round(totalScore / scoredCount) : null,
      };
    }
    return {
      student: { id: s.id, name: s.display_name, ref: s.student_ref, active: s.active, last_active: s.last_active },
      units: unitSummaries,
      detail: sp,
    };
  });

  res.json({ class: cls, course_config: courseConfig, summary });
});

// ── CSV EXPORT (Wide gradebook, CodeHS-style) — SINGLE canonical export ─────────
// Rows = students. Columns = identity + per-unit summary + every lesson/activity.
// Score shows ONLY for graded activities (quiz, exam, case-file). Lessons and
// exercises show "Done" or blank, never a number. Per-unit average is quiz-only
// and labeled "Avg Quiz" so it never mixes an exam raw score into a percentage.
router.get('/classes/:code/export', requireTeacher, (req, res) => {
  try {
    const cls = db.prepare('SELECT * FROM classes WHERE class_code = ? AND teacher_id = ?')
      .get(req.params.code.toUpperCase(), req.teacher.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    const courseConfig = COURSES[cls.course];
    if (!courseConfig) return res.status(400).json({ error: `Course ${cls.course} not in manifest` });

    const students = db.prepare(
      'SELECT id, display_name, student_ref, last_active FROM students WHERE class_id = ? ORDER BY display_name'
    ).all(cls.id);

    const allProgress = db.prepare(
      'SELECT student_id, unit, lesson, activity_type, completed, score FROM progress WHERE class_id = ? AND course = ?'
    ).all(cls.id, cls.course);
    const map = {};
    for (const p of allProgress) {
      (map[p.student_id] = map[p.student_id] || {})[`${p.unit}|${p.lesson}|${p.activity_type}`] = p;
    }

    const GRADED = new Set(['quiz', 'exam', 'case-file']);
    const ABBR = { lesson: 'L', 'exercise-1': 'E1', 'exercise-2': 'E2', quiz: 'Q', lab: 'Lab', code: 'Code' };
    const abbr = a => ABBR[a] || a;
    const shortUnit = k => k.replace(/^unit-/, 'Unit ').replace(/^bi-/, 'BI ');

    // Activity columns, built once from the manifest.
    const unitIds = Object.keys(courseConfig.units);
    const cols = [];
    for (const unitId of unitIds) {
      const u = courseConfig.units[unitId];
      for (const lesson of u.lessons)
        for (const act of u.activities)
          cols.push({ unit: unitId, lesson, activity: act, header: `${lesson} ${abbr(act)}`, graded: GRADED.has(act) });
      if (u.case_file) cols.push({ unit: unitId, lesson: u.case_file.lesson, activity: 'case-file', header: u.case_file.label || 'Case File', graded: true });
      if (u.exam)      cols.push({ unit: unitId, lesson: u.exam.lesson, activity: 'exam', header: u.exam.label || 'Unit Exam', graded: true });
    }

    // Lead: identity + Overall % + per-unit (% and Avg Quiz).
    const lead = ['Name', 'Student Ref', 'Last Active', 'Overall %'];
    for (const unitId of unitIds) lead.push(`${shortUnit(unitId)} %`, `${shortUnit(unitId)} Avg Quiz`);

    const rows = [[...lead, ...cols.map(c => c.header)]];
    for (const s of students) {
      const sm = map[s.id] || {};
      let allDone = 0, allTot = 0;
      const summaryCells = [];
      for (const unitId of unitIds) {
        const u = courseConfig.units[unitId];
        let done = 0, tot = 0, qSum = 0, qN = 0;
        for (const lesson of u.lessons) for (const act of u.activities) {
          tot++; const r = sm[`${unitId}|${lesson}|${act}`]; if (r && r.completed) done++;
        }
        if (u.case_file) { tot++; const r = sm[`${unitId}|${u.case_file.lesson}|case-file`]; if (r && r.completed) done++; }
        if (u.exam)      { tot++; const r = sm[`${unitId}|${u.exam.lesson}|exam`]; if (r && r.completed) done++; }
        for (const lesson of u.lessons) { const r = sm[`${unitId}|${lesson}|quiz`]; if (r && r.score != null) { qSum += r.score; qN++; } }
        allDone += done; allTot += tot;
        summaryCells.push(tot ? `${Math.round(done / tot * 100)}%` : '0%', qN ? Math.round(qSum / qN) : '');
      }
      const cells = cols.map(c => {
        const r = sm[`${c.unit}|${c.lesson}|${c.activity}`];
        if (!r) return '';
        if (c.graded && r.score != null) return r.score;
        return r.completed ? 'Done' : '';
      });
      rows.push([s.display_name, s.student_ref || '', s.last_active || '',
        `${allTot ? Math.round(allDone / allTot * 100) : 0}%`, ...summaryCells, ...cells]);
    }

    const csv = '\uFEFF' + rows.map(row =>
      row.map(cell => {
        const str = (cell === null || cell === undefined) ? '' : String(cell);
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')
    ).join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition',
      `attachment; filename="gradebook-${cls.class_code}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (e) {
    console.error('Export error:', e);
    res.status(500).json({ error: 'Failed to export gradebook' });
  }
});

// ── UPDATE CLASS ──────────────────────────────────────────────────────────────
router.put('/classes/:code', requireTeacher, (req, res) => {
  const cls = db.prepare('SELECT * FROM classes WHERE class_code = ? AND teacher_id = ?')
    .get(req.params.code.toUpperCase(), req.teacher.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const { class_name, active, mastery_threshold } = req.body;
  const threshold = mastery_threshold !== undefined
    ? clampThreshold(mastery_threshold, cls.mastery_threshold)
    : cls.mastery_threshold;

  db.prepare('UPDATE classes SET class_name = ?, active = ?, mastery_threshold = ? WHERE id = ?')
    .run(
      sanitize(class_name || cls.class_name, 100),
      active !== undefined ? (active ? 1 : 0) : cls.active,
      threshold,
      cls.id
    );

  res.json({ class: db.prepare('SELECT * FROM classes WHERE id = ?').get(cls.id) });
});

// ── SET MASTERY THRESHOLD ─────────────────────────────────────────────────────
router.patch('/classes/:code/threshold', requireTeacher, (req, res) => {
  const cls = db.prepare('SELECT * FROM classes WHERE class_code = ? AND teacher_id = ?')
    .get(req.params.code.toUpperCase(), req.teacher.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const { mastery_threshold } = req.body;
  if (mastery_threshold === undefined || mastery_threshold === null) {
    return res.status(400).json({ error: 'mastery_threshold required' });
  }
  if (Number.isNaN(parseInt(mastery_threshold, 10))) {
    return res.status(400).json({ error: 'mastery_threshold must be a number 50-100' });
  }
  const threshold = clampThreshold(mastery_threshold);

  db.prepare('UPDATE classes SET mastery_threshold = ? WHERE id = ?').run(threshold, cls.id);
  res.json({ ok: true, mastery_threshold: threshold });
});

// ── DEACTIVATE STUDENT (never hard-delete) ─────────────────────────────────────
// Attempt history is gradebook data and always survives. This route deactivates
// the student (active = 0): they can no longer log in, but every progress,
// attempt, and score_event row is preserved for the gradebook. Reactivate via
// PATCH .../students/:studentId with { active: true }.
router.delete('/classes/:code/students/:studentId', requireTeacher, (req, res) => {
  const cls = db.prepare('SELECT id FROM classes WHERE class_code = ? AND teacher_id = ?')
    .get(req.params.code.toUpperCase(), req.teacher.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const info = db.prepare('UPDATE students SET active = 0 WHERE id = ? AND class_id = ?')
    .run(req.params.studentId, cls.id);
  if (!info.changes) return res.status(404).json({ error: 'Student not found' });
  res.json({ ok: true, active: 0 });
});

// ── SET CLASS RETRY DEFAULT ───────────────────────────────────────────────────
router.patch('/classes/:code/retry', requireTeacher, (req, res) => {
  const cls = db.prepare('SELECT * FROM classes WHERE class_code = ? AND teacher_id = ?')
    .get(req.params.code.toUpperCase(), req.teacher.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const { retry_allowed } = req.body;
  if (retry_allowed === undefined) return res.status(400).json({ error: 'retry_allowed required (true/false)' });

  db.prepare('UPDATE classes SET retry_allowed = ? WHERE id = ?').run(retry_allowed ? 1 : 0, cls.id);
  res.json({ ok: true, retry_allowed: !!retry_allowed });
});

// ── SET PER-STUDENT RETRY OVERRIDE ───────────────────────────────────────────
router.patch('/classes/:code/students/:studentId/retry', requireTeacher, (req, res) => {
  const cls = db.prepare('SELECT id FROM classes WHERE class_code = ? AND teacher_id = ?')
    .get(req.params.code.toUpperCase(), req.teacher.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const student = db.prepare('SELECT id FROM students WHERE id = ? AND class_id = ?')
    .get(req.params.studentId, cls.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const { retry_override } = req.body;
  // null = revert to class default; true/false = explicit override
  const val = retry_override === null || retry_override === undefined ? null : (retry_override ? 1 : 0);
  db.prepare('UPDATE students SET retry_override = ? WHERE id = ?').run(val, student.id);
  res.json({ ok: true, retry_override: val });
});

// ── UNLOCK QUIZ (teacher) ─────────────────────────────────────────────────────
// reset=true wipes the score; reset=false keeps best score
router.patch('/classes/:code/progress/:progressId/unlock', requireTeacher, (req, res) => {
  const cls = db.prepare('SELECT id FROM classes WHERE class_code = ? AND teacher_id = ?')
    .get(req.params.code.toUpperCase(), req.teacher.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  // Verify the progress record belongs to this class
  const record = db.prepare('SELECT id, score FROM progress WHERE id = ? AND class_id = ?')
    .get(req.params.progressId, cls.id);
  if (!record) return res.status(404).json({ error: 'Progress record not found' });

  const reset = req.body.reset === true;
  const now   = new Date().toISOString();

  if (reset) {
    db.prepare(`
      UPDATE progress SET locked = 0, completed = 0, score = NULL, attempts = 0,
        completed_at = NULL, updated_at = ? WHERE id = ?
    `).run(now, record.id);
  } else {
    db.prepare(`
      UPDATE progress SET locked = 0, updated_at = ? WHERE id = ?
    `).run(now, record.id);
  }

  res.json({ ok: true, reset, score: reset ? null : record.score });
});

// ── RELEASE ANSWER KEY (Phase 2 server-side scoring) ──────────────────────────
// Controls whether class-mode students see correct answers + explanations in the
// POST /api/quiz/submit response for one activity. Until released, class mode
// returns correct/incorrect booleans only. Public self-study is unaffected: it
// never consults this table and always gets the key. Body:
//   { course, unit, lesson, activity_type, released? }  (released defaults true)
router.post('/classes/:code/release', requireTeacher, (req, res) => {
  const cls = db.prepare('SELECT id, course FROM classes WHERE class_code = ? AND teacher_id = ?')
    .get(req.params.code.toUpperCase(), req.teacher.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const { course, unit, lesson, activity_type } = req.body || {};
  if (!course || !unit || !lesson || !activity_type) {
    return res.status(400).json({ error: 'course, unit, lesson, activity_type required' });
  }
  const released = req.body.released === undefined ? 1 : (req.body.released ? 1 : 0);

  db.prepare(`
    INSERT INTO key_releases (class_id, course, unit, lesson, activity_type, released, released_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(class_id, course, unit, lesson, activity_type)
      DO UPDATE SET released = excluded.released, released_at = datetime('now')
  `).run(cls.id, String(course), String(unit), String(lesson), String(activity_type), released);

  res.json({ ok: true, released: !!released, course, unit, lesson, activity_type });
});

// ── LIST RELEASED KEYS ────────────────────────────────────────────────────────
router.get('/classes/:code/releases', requireTeacher, (req, res) => {
  const cls = db.prepare('SELECT id FROM classes WHERE class_code = ? AND teacher_id = ?')
    .get(req.params.code.toUpperCase(), req.teacher.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const releases = db.prepare(`
    SELECT course, unit, lesson, activity_type, released, released_at
    FROM key_releases WHERE class_id = ? AND released = 1
    ORDER BY course, unit, lesson, activity_type
  `).all(cls.id);
  res.json({ releases });
});

// ── DELETE CLASS ──────────────────────────────────────────────────────────────
// Permanently removes the class. ON DELETE CASCADE clears its students,
// progress, and quiz_attempts automatically.
router.delete('/classes/:code', requireTeacher, (req, res) => {
  const cls = db.prepare('SELECT id FROM classes WHERE class_code = ? AND teacher_id = ?')
    .get(req.params.code.toUpperCase(), req.teacher.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const info = db.prepare('DELETE FROM classes WHERE id = ?').run(cls.id);
  res.json({ ok: true, deleted: info.changes });
});

// ── RENAME STUDENT / RESET PIN ────────────────────────────────────────────────
// Body: { display_name?, pin? }. Either or both. Mirrors the join rules:
// names are unique per class (case-insensitive), PINs are exactly 4 digits.
router.patch('/classes/:code/students/:studentId', requireTeacher, async (req, res) => {
  const cls = db.prepare('SELECT id FROM classes WHERE class_code = ? AND teacher_id = ?')
    .get(req.params.code.toUpperCase(), req.teacher.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const student = db.prepare('SELECT id, display_name FROM students WHERE id = ? AND class_id = ?')
    .get(req.params.studentId, cls.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const { display_name, pin, active } = req.body;
  if (display_name === undefined && pin === undefined && active === undefined) {
    return res.status(400).json({ error: 'Provide display_name, pin, and/or active to update' });
  }

  // Rename
  if (display_name !== undefined) {
    const cleanName = sanitize(display_name, 50);
    if (!cleanName || cleanName.trim().length < 1) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }
    const clash = db.prepare(
      'SELECT id FROM students WHERE class_id = ? AND lower(display_name) = lower(?) AND id != ?'
    ).get(cls.id, cleanName, student.id);
    if (clash) return res.status(409).json({ error: 'That name is already taken in this class.' });
    db.prepare('UPDATE students SET display_name = ? WHERE id = ?').run(cleanName, student.id);
  }

  // Reset PIN
  if (pin !== undefined) {
    if (!isValidPin(pin)) return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    const pinHash = await bcrypt.hash(String(pin), 10);
    db.prepare('UPDATE students SET pin_hash = ? WHERE id = ?').run(pinHash, student.id);
  }

  // Deactivate / reactivate. Never deletes: history always survives.
  if (active !== undefined) {
    db.prepare('UPDATE students SET active = ? WHERE id = ?').run(active ? 1 : 0, student.id);
  }

  const updated = db.prepare(
    'SELECT id, display_name, student_ref, active, last_active FROM students WHERE id = ?'
  ).get(student.id);
  res.json({
    ok: true,
    student: { id: updated.id, name: updated.display_name, ref: updated.student_ref, active: updated.active, last_active: updated.last_active },
  });
});

module.exports = router;
