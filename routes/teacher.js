'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const { requireTeacher } = require('../middleware');
const { claimPending } = require('../lib/entitlements');
const { makeRateLimit } = require('../lib/rate-limit');
const mailer = require('../lib/mailer');
const resetLib = require('../lib/password-reset');
const { attemptRollup } = require('../lib/attempt-rollup');
const { LESSON_SCORE_ITEM } = require('../scoring');
const { buildCanonicalGradebook, canonicalActivity, isGradedActivity,
  pointsFromRatio, denominatorMap } = require('../lib/gradebook-contract');
const {
  formatCell, buildCanvasUnitExport, buildCanvasActivityExport, buildSchoologyExport, canvasSisLoginId,
  INCLUDE_BUCKETS,
} = require('../lib/export-format');
const { buildCanvasCoursePackage } = require('../lib/canvas-course-package');
const {
  normalizeMode, legacyFromMode, DEFAULT_MODE, MODE_LABELS, MODE_DESCRIPTIONS, retrySqlExpr,
} = require('../retry-policy');
// The retry decision as SQL, for the aggregate gradebook pass below. Built once
// at module load from the same helper the row-by-row code paths use.
const RETRY_SQL = retrySqlExpr('c.retry_mode', 's.retry_override', 'se.activity_type', 'c.retry_allowed');
const {
  newId, generateClassCode, signTeacherToken,
  isValidEmail, isValidPin, sanitize, COURSES, COURSE_PREFIXES, examsOf,
} = require('../utils');

// Convert any pending Shopify entitlements for this email into real grants right
// after a successful auth (Phase 4 slice 2 claim-on-auth). Best effort: a failure
// here must never break registration or login, so it is wrapped and only logged.
function claimPendingSafe(teacherId, email) {
  try {
    const n = claimPending(teacherId, email);
    if (n) console.log(`[entitlements] claimed ${n} pending grant(s) for ${email}`);
  } catch (e) {
    console.error('[entitlements] claim-on-auth failed (auth unaffected):', e);
  }
}

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
    claimPendingSafe(teacher.id, teacher.email);
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
    claimPendingSafe(teacher.id, teacher.email);
    res.json({ token, teacher: { id: teacher.id, email: teacher.email, name: teacher.name, school: teacher.school } });
  } catch (e) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── PASSWORD RESET (self-service, token + email) ──────────────────────────────
//  Two steps. forgot-password issues a single-use, short-lived token and emails a
//  link; reset-password consumes the token and sets a new bcrypt hash. Passwords
//  are hashed, so a forgotten one is unrecoverable by design: this RESETS it, it
//  never reveals the old one. Both routes are rate limited and forgot-password is
//  written to give NO signal about whether an email is registered.
//  The token contract itself (TTL, hashing, one live token per teacher) lives in
//  lib/password-reset.js so the owner-generated link from /api/admin cannot drift
//  from the emailed one.
const RESET_TTL_MIN = resetLib.RESET_TTL_MIN;

// Same generic 200 whether or not the email exists: this endpoint must not be
// usable to enumerate which addresses have a teacher account.
const FORGOT_GENERIC = { ok: true, message: 'If that email is registered, a password reset link is on its way.' };

const forgotLimit = makeRateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  message: 'Too many reset requests. Please wait a few minutes and try again.',
});
const resetLimit = makeRateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: 'Too many attempts. Please wait a few minutes and try again.',
});
// Its own bucket, deliberately. Sharing resetLimit would let anonymous traffic
// hammering /reset-password lock a signed-in teacher out of changing her own
// password, which is a denial of service against the legitimate user.
const changeLimit = makeRateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: 'Too many attempts. Please wait a few minutes and try again.',
});

// POST /api/teacher/forgot-password  { email }
router.post('/forgot-password', forgotLimit, async (req, res) => {
  try {
    const email = String((req.body && req.body.email) || '').trim().toLowerCase();
    if (!isValidEmail(email)) return res.json(FORGOT_GENERIC);

    const teacher = db.prepare('SELECT id, email, name FROM teachers WHERE email = ?').get(email);
    if (!teacher) return res.json(FORGOT_GENERIC); // no account: say the same thing

    // One live token per teacher, minted by the shared module.
    const { link } = resetLib.mintResetLink(teacher.id);
    const name = teacher.name ? teacher.name.split(' ')[0] : 'there';
    const subject = 'Reset your APCSExamPrep password';
    const text =
      `Hi ${name},\n\n` +
      `We received a request to reset the password for your APCSExamPrep teacher account.\n` +
      `Open this link within ${RESET_TTL_MIN} minutes to choose a new password:\n\n` +
      `${link}\n\n` +
      `If you did not request this, you can ignore this email. Your password will not change ` +
      `and the link above will expire on its own.\n`;
    const html =
      `<div style="font:15px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;color:#0b0b0b">` +
      `<p>Hi ${sanitize(name, 60)},</p>` +
      `<p>We received a request to reset the password for your APCSExamPrep teacher account.</p>` +
      `<p><a href="${link}" style="display:inline-block;background:#2a78d6;color:#fff;` +
      `text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Choose a new password</a></p>` +
      `<p style="color:#52514e;font-size:13px">This link expires in ${RESET_TTL_MIN} minutes. ` +
      `If you did not request it, you can safely ignore this email; your password will not change.</p>` +
      `<p style="color:#898781;font-size:12px">If the button does not work, paste this into your browser:<br>${link}</p>` +
      `</div>`;

    try {
      await mailer.sendEmail({ to: teacher.email, subject, html, text });
    } catch (e) {
      // Never leak send status to the caller; log for the operator and still 200.
      console.error('[forgot-password] email send failed:', e.message);
    }
    return res.json(FORGOT_GENERIC);
  } catch (e) {
    console.error('forgot-password error:', e);
    return res.json(FORGOT_GENERIC); // even on error, no signal
  }
});

// POST /api/teacher/reset-password  { token, password }
router.post('/reset-password', resetLimit, async (req, res) => {
  try {
    const token = String((req.body && req.body.token) || '');
    const password = String((req.body && req.body.password) || '');
    if (!token) return res.status(400).json({ error: 'Missing reset token.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    // Look the token up by its hash (indexed). The token is itself a 256-bit
    // secret, so an equality match on its hash is safe; expiry + single-use are
    // checked in the same row.
    const row = resetLib.findToken(token);

    if (!row || row.used_at || row.expired) {
      return res.status(400).json({
        error: 'This reset link is invalid, already used, or expired. Please request a new one.',
      });
    }

    const hash = await bcrypt.hash(password, 12);
    db.transaction(() => {
      db.prepare('UPDATE teachers SET password_hash = ? WHERE id = ?').run(hash, row.teacher_id);
      db.prepare("UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?").run(row.id);
      // Burn any other outstanding tokens for this teacher too.
      db.prepare('DELETE FROM password_reset_tokens WHERE teacher_id = ? AND id != ?').run(row.teacher_id, row.id);
    })();

    return res.json({ ok: true, message: 'Your password has been reset. You can now sign in with your new password.' });
  } catch (e) {
    console.error('reset-password error:', e);
    return res.status(500).json({ error: 'Could not reset password. Please try again.' });
  }
});

// ── CHANGE PASSWORD (signed in) ───────────────────────────────────────────────
//  The counterpart to the reset flow: a teacher who is already signed in and
//  simply wants a different password, without going through email. Requires the
//  CURRENT password, so a walk-up on an unattended logged-in browser cannot
//  silently take the account over. Any outstanding reset links are burned, since
//  a deliberate password change should invalidate a link sitting in an inbox.
router.post('/change-password', requireTeacher, changeLimit, async (req, res) => {
  try {
    const current = String((req.body && req.body.current_password) || '');
    const next = String((req.body && req.body.new_password) || '');
    if (!current) return res.status(400).json({ error: 'Current password required' });
    if (next.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
    if (next === current) return res.status(400).json({ error: 'New password must be different from the current one' });

    const row = db.prepare('SELECT id, password_hash FROM teachers WHERE id = ?').get(req.teacher.id);
    if (!row) return res.status(404).json({ error: 'Account not found' });

    const valid = await bcrypt.compare(current, row.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(next, 12);
    db.transaction(() => {
      db.prepare('UPDATE teachers SET password_hash = ? WHERE id = ?').run(hash, row.id);
      resetLib.burnTokens(row.id);
    })();

    res.json({ ok: true, message: 'Your password has been changed.' });
  } catch (e) {
    console.error('change-password error:', e);
    res.status(500).json({ error: 'Could not change password. Please try again.' });
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
    const { class_name, course = 'ap-cybersecurity', mastery_threshold = 80, retry_allowed, retry_mode } = req.body;
    if (!class_name || class_name.trim().length < 2) return res.status(400).json({ error: 'Class name required' });
    if (!COURSES[course]) return res.status(400).json({ error: 'Invalid course' });

    const threshold   = clampThreshold(mastery_threshold, 80);
    // A new class defaults to 'practice': redo the practice, one shot at the quiz.
    // That is the behavior the old default (retry_allowed = 0) already produced,
    // now stated instead of accidental.
    const mode        = normalizeMode(retry_mode !== undefined ? retry_mode : retry_allowed) || DEFAULT_MODE;
    const retryFlag   = legacyFromMode(mode);

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
      INSERT INTO classes (id, teacher_id, class_code, class_name, course, mastery_threshold, retry_allowed, retry_mode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.teacher.id, code, sanitize(class_name, 100), course, threshold, retryFlag, mode);

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
  // aggregate pass (no N+1). ONE row per DISTINCT item, summed, exactly as
  // rollupScore derives progress.score, so the raw points and the percent can
  // never disagree. The gradebook shows real points instead of reconstructing
  // them from the rounded percent.
  //
  // Which attempt at an item counts is the retry policy, and it used to be a
  // flat MAX(points) here. That was a second, silent copy of "best always wins"
  // living in the gradebook, so under mode 'none' this pass would have shown a
  // student's best points beside a first-attempt percent. The ordering trick:
  // when the best attempt counts, sort by -points first; when it does not, that
  // term is a constant and the oldest row wins.
  const allPoints = db.prepare(`
    SELECT student_id, unit, lesson, activity_type,
           SUM(kept_points) AS points_earned,
           SUM(item_max)    AS points_possible
    FROM (
      SELECT se.student_id, se.unit, se.lesson, se.activity_type, se.item,
             se.points     AS kept_points,
             se.max_points AS item_max,
             ROW_NUMBER() OVER (
               PARTITION BY se.student_id, se.unit, se.lesson, se.activity_type, se.item
               ORDER BY CASE WHEN ${RETRY_SQL} = 1 THEN -se.points ELSE 0 END ASC,
                        se.created_at ASC, se.rowid ASC
             ) AS rn
      FROM score_events se
      JOIN students s ON s.id = se.student_id
      JOIN classes  c ON c.id = se.class_id
      WHERE se.class_id = ? AND se.course = ?
        -- 'lesson-score' is a percent carrier, not a reported pair. It is stored
        -- as points = percent, max_points = 100, so summing it here produced a
        -- fake "20 / 100" that looked exactly like a page reporting 20 of 100
        -- real questions. Harmless while an authored total overrode it; once a
        -- reported pair wins, the carrier would win instead and put a fabricated
        -- 100 back on screen. lib/gradebook-contract.js excludes it for the same
        -- reason. A percent with no pair behind it belongs in the authored
        -- fallback below, not here.
        AND se.item <> '${LESSON_SCORE_ITEM}'
    ) WHERE rn = 1
    GROUP BY student_id, unit, lesson, activity_type
  `).all(cls.id, cls.course);
  const pointsMap = {};
  for (const pt of allPoints) {
    pointsMap[`${pt.student_id}|${pt.unit}|${pt.lesson}|${pt.activity_type}`] = pt;
  }


  // Authored 'out of' per (lesson, activity) for this course, loaded once.

  const authoredDenom = new Map(db.prepare(

    'SELECT lesson, activity_type, possible FROM course_denominators WHERE course = ?'

  ).all(cls.course).map((r) => [`${r.lesson}|${r.activity_type}`, r.possible]));


  // Build progress map: student_id → { unit → { lesson → { activity → record } } }
  const progressMap = {};
  for (const p of allProgress) {
    if (!progressMap[p.student_id]) progressMap[p.student_id] = {};
    if (!progressMap[p.student_id][p.unit]) progressMap[p.student_id][p.unit] = {};
    if (!progressMap[p.student_id][p.unit][p.lesson]) progressMap[p.student_id][p.unit][p.lesson] = {};
    const pt = pointsMap[`${p.student_id}|${p.unit}|${p.lesson}|${p.activity_type}`];
    // The "out of" comes from course_denominators (the AUTHORED value) whenever
    // that lesson/activity has one. Summing the recorded max_points instead made
    // the denominator depend on what happened to be captured: a student served 5
    // of a 6-point quiz read "/5", and a partial recording read as a partial
    // total. Denominators are computed here at read time, so preferring the
    // authored value corrects every existing gradebook with no data migration.
    // Earned is rescaled to keep the pair consistent; the percentage never moves.
    const authored = authoredDenom.get(`${p.lesson}|${p.activity_type}`);
    let earned = pt ? pt.points_earned : null;
    let possible = pt ? pt.points_possible : null;
    let denomSource = possible != null ? 'observed' : null;
    // An UNGRADED column carries no points, on any course. lib/gradebook-contract.js
    // is the one authority on that line ('lesson' is a page visit, everything else
    // can carry a grade), so it is asked here rather than restated.
    //
    // Without this the score_events sum leaks the synthetic 'lesson-score' row,
    // which is a percent carrier stored as points = percent, max_points = 100.
    // A lesson at 20 percent was reported as 20 out of 100, sourced 'observed' as
    // though 100 were a counted total, while the contract reported the same cell
    // as ungraded with no points at all. Two consequences, both visible:
    // the dashboard printed a red 20/100 for a page visit and the row's own cells
    // no longer summed to its total, and the teacher's include-lessons toggle
    // would have weighted that page visit at 100, twenty times a real 5 point
    // quiz. Graded columns are untouched: their percent-only pricing still comes
    // from the contract's PERCENT_WEIGHT, not from here.
    if (!isGradedActivity(canonicalActivity(p.activity_type).activity)) {
      earned = null; possible = null; denomSource = null;
    } else if (possible != null && possible > 0) {
      // A REPORTED pair wins. One question is one point, and the page already
      // counted them: 3 of 8 is what the student saw and earned. An authored
      // total is a guess about a page, so letting it override real points made
      // every authored row a chance to overwrite a correct score.
      denomSource = 'observed';
    } else if (authored != null) {
      // Nothing reported, so fall back to the authored total and price the
      // stored percent against it. This is for pages with no reporter yet.
      const ratio = p.score != null ? p.score / 100 : null;
      possible = authored;
      earned = pointsFromRatio(ratio, authored);
      denomSource = 'authored';
    }
    progressMap[p.student_id][p.unit][p.lesson][p.activity_type] = {
      completed:    !!p.completed,
      score:        p.score,
      attempts:     p.attempts,
      confidence:   p.confidence,
      completed_at: p.completed_at,
      locked:       !!p.locked,
      progress_id:  p.progress_id,
      points_earned:   earned,
      points_possible: possible,
      denominator_source: denomSource,
    };
  }

  // ── Attempts merge (System A) ───────────────────────────────────────────────
  //  Grades posted through POST /api/progress/attempt (CSA, AP Networking) live
  //  in the attempts table and were invisible on this dashboard: the student
  //  had a grade, the admin saw it, the teacher saw a blank. Fold the
  //  grade-of-record rollup in as cells the renderer already understands.
  //  points_possible comes from course_manifest (every item's authored point
  //  weight, attempted or not), so 2 of 8 CFUs reads 2/8 points, never 2/2.
  //  An existing System B cell with a recorded score is never overwritten.
  const rollup = attemptRollup(cls.id, cls.course);
  if (rollup) {
    for (const [key, cell] of rollup.cells) {
      const sep1 = key.indexOf('|'), sep2 = key.lastIndexOf('|');
      const sid = key.slice(0, sep1), lesson = key.slice(sep1 + 1, sep2), act = key.slice(sep2 + 1);
      const unit = rollup.unitOf.get(lesson) || 'unit-' + String(lesson).split('.')[0];
      if (!progressMap[sid]) progressMap[sid] = {};
      if (!progressMap[sid][unit]) progressMap[sid][unit] = {};
      if (!progressMap[sid][unit][lesson]) progressMap[sid][unit][lesson] = {};
      const existing = progressMap[sid][unit][lesson][act];
      if (existing && existing.score != null) continue;
      progressMap[sid][unit][lesson][act] = {
        completed:    cell.completed,
        score:        cell.pct,
        attempts:     cell.tries,
        confidence:   existing ? existing.confidence : null,
        completed_at: existing ? existing.completed_at : null,
        locked:       existing ? !!existing.locked : false,
        progress_id:  existing ? existing.progress_id : null,
        points_earned:   cell.earned,
        points_possible: cell.possible,
        denominator_source: 'manifest',
        items_attempted: cell.items_attempted,
        items_total:     cell.items_total,
        source: 'attempts',
      };
    }
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

  // The authored "out of" per column, keyed BOTH `unit|lesson|activity_type`
  // and `lesson|activity_type`.
  //
  // A gradebook COLUMN HEADER needs a denominator before any student has
  // submitted, so it cannot come from a cell. Without this the page had nowhere
  // to get one and fell back to a hardcoded per-activity constant, printing
  // "Ex 1 /5" above a cell reading "7/7". Activities genuinely differ (Unit 1
  // Exercise 1 is out of 7, Unit 2 Exercise 1 is out of 6), so a constant can
  // never be right for more than a handful of them.
  //
  // Only authored values appear here. A column with no authored value is absent
  // rather than defaulted, so the page can tell "out of 7" from "unknown" and
  // show no denominator instead of a wrong one.
  //
  // The UNIT-scoped keys matter as much as the lesson ones. All five Cyber units
  // have a lesson called 'case-file' and a lesson called 'exam', and four CSP Big
  // Ideas name their test 'unit-test', so a lesson key alone addresses five
  // different columns. Sending only lesson keys left the dashboard with one
  // number for five case files really worth 15, 14, 11, 12 and 11.
  // denominatorMap() is the same authority the student view and the canonical
  // gradebook read, so the totals cannot drift apart.
  const denominators = {};
  for (const [key, v] of denominatorMap(cls.course)) denominators[key] = v.possible;
  // Manifest-backed columns (the attempts path) override course_denominators:
  // for a System A course the manifest is the single denominator authority,
  // and the legacy CSA rows in course_denominators describe a page model that
  // never shipped for Unit 1 (quiz "out of 6" vs the authored 2-question
  // mastery quiz).
  if (rollup) {
    for (const [key, p] of rollup.possible) denominators[key] = p.possible;
  }

  res.json({ class: cls, course_config: courseConfig, denominators, summary });
});

// ── THE CANONICAL GRADEBOOK ───────────────────────────────────────────────────
//  One shape for every course. A view built against this never branches on the
//  course: if it has to ask whether this course has `cfu` or `lab`, the
//  normalizer in lib/gradebook-contract.js has failed, and that is where the fix
//  belongs.
//
//  This is ADDITIVE. GET /classes/:code/progress is untouched and still serves
//  the live dashboard, so nothing a teacher can see today goes away when this
//  lands. The contract is the shape new views are built against.
//
//  GET /api/admin/class/:id/gradebook/as-teacher calls this exact function with
//  the same arguments, so an operator verifying the numbers is looking at the
//  teacher's gradebook rather than at a second implementation of it.
//
//  Ownership is enforced the same way every other route on this router does it:
//  the class must be selected by code AND teacher_id, so a student holding a
//  class code reaches nothing here.
router.get('/classes/:code/gradebook', requireTeacher, (req, res) => {
  try {
    const cls = db.prepare('SELECT id, course FROM classes WHERE class_code = ? AND teacher_id = ?')
      .get(req.params.code.toUpperCase(), req.teacher.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    // A teacher looking at their own class sees their own students' names. The
    // anonymized rendering exists for the admin caller, not for them.
    const out = buildCanonicalGradebook(cls.id, { course: req.query.course, reveal: true });
    if (!out) return res.status(404).json({ error: 'Class not found' });
    res.json(out);
  } catch (e) {
    console.error('teacher/classes/:code/gradebook:', e);
    res.status(500).json({ error: 'Failed to build gradebook' });
  }
});

// ── CSV serialization ─────────────────────────────────────────────────────────
//  The native export carries a BOM so Excel reads a non-ASCII name correctly.
//  The Canvas export must NOT: Canvas matches the first header cell against the
//  literal "Student" and a BOM breaks that match, rejecting the header row.
//  A cell is quoted when it has to be, plus on demand: the Canvas Student column
//  is always quoted because "Doe, Jane" is a name, not two fields.
const BOM = '\uFEFF';
function csvCell(v, forceQuote) {
  const str = (v === null || v === undefined) ? '' : String(v);
  return (forceQuote || /[",\n\r]/.test(str)) ? `"${str.replace(/"/g, '""')}"` : str;
}

// ── SHARED EXPORT FILTERS ─────────────────────────────────────────────────────
//  include= and units= are parsed in exactly one place because two routes now
//  answer questions about the same course: the gradebook CSV and the Canvas
//  course package. If they disagreed about what units=unit-1 selects, a teacher
//  would import a course package holding four units of assignments and then a
//  CSV holding one, and the mismatch would look like missing grades rather than
//  like a filter. Returns { filter } or { error } for the caller to 400 with.
const csvList = (v) => String(v).split(',').map((x) => x.trim()).filter(Boolean);
const isTruthy = (v) => ['1', 'true', 'yes'].includes(String(v || '').toLowerCase());

function parseExportFilter(req, courseConfig) {
  let includeFilter = null;
  if (req.query.include !== undefined) {
    const wanted = csvList(req.query.include);
    const unknown = wanted.filter((w) => !INCLUDE_BUCKETS.includes(w));
    if (unknown.length) {
      return { error: {
        error: `include must be a comma separated list of ${INCLUDE_BUCKETS.join(', ')}`,
        unknown,
      } };
    }
    includeFilter = {};
    for (const bucket of INCLUDE_BUCKETS) includeFilter[bucket] = wanted.includes(bucket);
  }

  // A typo'd unit would silently export a smaller gradebook, which is worse
  // than an error: the teacher would not know what was missing.
  let unitFilter = null;
  if (req.query.units !== undefined) {
    const wanted = csvList(req.query.units);
    const known = Object.keys(courseConfig.units);
    const unknown = wanted.filter((u) => !known.includes(u));
    if (unknown.length) return { error: { error: 'unknown unit in units', unknown, known } };
    unitFilter = wanted;
  }

  return { filter: (includeFilter || unitFilter) ? { include: includeFilter, units: unitFilter } : null };
}

// ── CSV EXPORT (Wide gradebook, CodeHS-style) — SINGLE canonical export ─────────
// Rows = students. Columns = identity + per-unit summary + every lesson/activity.
// A cell shows its SCORE whenever one was recorded, otherwise "Done" if the
// activity was completed, otherwise blank. This used to gate the score behind an
// allow-list of "graded" activities, which silently discarded real recorded
// scores for exercise-1 and exercise-2: the number was in the database and the
// export threw it away. Any activity that reports a score now shows it, so
// adding a new graded activity type needs no change here.
// Per-unit average stays quiz-only and is labeled "Avg Quiz" so it never mixes an
// exam raw score into a percentage.
//
// ?format=canvas&scope=unit swaps the RENDERING of the same data for a Canvas
// gradebook import: one assignment per unit out of 100 points, identity carried
// on student_ref as the SIS Login ID, every cell a number or a blank. It is a
// query param on this route and not a second route on purpose: a duplicate
// export route already shadowed the real one once and had to be removed.
// ?preflight=1 returns the match counts as JSON instead of the file, so the
// teacher sees which students Canvas will silently drop BEFORE downloading.
router.get('/classes/:code/export', requireTeacher, (req, res) => {
  try {
    const format = String(req.query.format || 'native').toLowerCase();
    if (format !== 'native' && format !== 'canvas' && format !== 'schoology') {
      return res.status(400).json({ error: "format must be 'native', 'canvas' or 'schoology'" });
    }
    // scope applies to the Canvas rendering only.
    //   unit     one column per unit, five Canvas assignments for Cyber
    //   activity one column per graded activity, so a case file or a unit exam
    //            is its own Canvas assignment rather than folded into a unit
    //            average. Roughly 55 columns for Cyber.
    // Unit stays the default: it is the smaller gradebook, and a teacher who
    // wants per-activity granularity is asking for it deliberately.
    const scope = String(req.query.scope || 'unit').toLowerCase();
    if (format === 'canvas' && scope !== 'unit' && scope !== 'activity') {
      return res.status(400).json({ error: "scope must be 'unit' or 'activity'" });
    }

    // include= and units= mirror what the dashboard is currently showing, so a
    // teacher exports the gradebook on their screen rather than a different one.
    // Both are opt-in: absent means the whole course, which is what every
    // existing caller already gets. Parsed by the shared helper above, which the
    // Canvas course package route also calls: the two files describe the same
    // course and must not disagree about what "units=unit-1" selects.
    const wantsPreflight = isTruthy(req.query.preflight);

    const cls = db.prepare('SELECT * FROM classes WHERE class_code = ? AND teacher_id = ?')
      .get(req.params.code.toUpperCase(), req.teacher.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    const courseConfig = COURSES[cls.course];
    if (!courseConfig) return res.status(400).json({ error: `Course ${cls.course} not in manifest` });

    const parsed = parseExportFilter(req, courseConfig);
    if (parsed.error) return res.status(400).json(parsed.error);
    const exportFilter = parsed.filter;

    const students = db.prepare(
      'SELECT id, display_name, student_ref, last_active, active FROM students WHERE class_id = ? ORDER BY display_name'
    ).all(cls.id);

    const allProgress = db.prepare(
      'SELECT student_id, unit, lesson, activity_type, completed, score FROM progress WHERE class_id = ? AND course = ?'
    ).all(cls.id, cls.course);
    const map = {};
    for (const p of allProgress) {
      (map[p.student_id] = map[p.student_id] || {})[`${p.unit}|${p.lesson}|${p.activity_type}`] = p;
    }

    // Score-events merge (System B): the REAL marks a page reported, "7/8".
    //
    // The progress row above carries only the derived percentage, so without
    // this an exercise a student genuinely scored 7 of 8 on reached every export
    // as the number 88, and any format that states marks had nothing to state.
    // The 'lesson-score' carrier is excluded for the usual reason: it is a
    // percent stored as points = percent, max_points = 100, so summing it would
    // manufacture a mark out of 100 for an activity nobody assigned points to.
    //
    // Only `points` is set. The percentage already on the row is left alone, so
    // the native and Canvas exports are byte for byte unchanged by this.
    const eventPoints = db.prepare(`
      SELECT student_id, unit, lesson, activity_type,
             SUM(points) AS earned, SUM(max_points) AS possible
      FROM score_events
      WHERE class_id = ? AND course = ? AND item <> '${LESSON_SCORE_ITEM}'
      GROUP BY student_id, unit, lesson, activity_type
    `).all(cls.id, cls.course);
    for (const e of eventPoints) {
      if (!(e.possible > 0)) continue;
      const sm = (map[e.student_id] = map[e.student_id] || {});
      const k = `${e.unit}|${e.lesson}|${e.activity_type}`;
      if (!sm[k]) sm[k] = { completed: 1, score: null };
      if (sm[k].points == null) sm[k].points = `${e.earned}/${e.possible}`;
    }

    // Attempts merge (System A): same fold as the dashboard endpoint, so the
    // CSV a teacher downloads can never disagree with the dashboard. Cells
    // carry real points ("8/10") plus a percent for the Avg Quiz summary.
    const rollup = attemptRollup(cls.id, cls.course);
    if (rollup) {
      for (const [key, cell] of rollup.cells) {
        const sep1 = key.indexOf('|'), sep2 = key.lastIndexOf('|');
        const sid = key.slice(0, sep1), lesson = key.slice(sep1 + 1, sep2), act = key.slice(sep2 + 1);
        const unit = rollup.unitOf.get(lesson) || 'unit-' + String(lesson).split('.')[0];
        const k = `${unit}|${lesson}|${act}`;
        const sm = (map[sid] = map[sid] || {});
        if (sm[k] && sm[k].score != null) continue;
        sm[k] = { completed: cell.completed ? 1 : 0, score: cell.pct, points: `${cell.earned}/${cell.possible}` };
      }
    }

    // ── Canvas rendering ──────────────────────────────────────────────────────
    //  Same merged grid, different shape. Everything above this point is shared
    //  with the native export, so the two files can never disagree about a grade.
    if (format === 'schoology') {
      // Schoology imports by MAPPING columns onto assignments that already
      // exist, so unlike Canvas there is no fixed identity schema to satisfy and
      // the header text is not load bearing. What matters is the number: a
      // Schoology assignment has a max points and the imported score is raw
      // marks against it, so this file states MARKS, not percentages.
      //
      // Deactivated students are excluded for the same reason as Canvas: a
      // withdrawn student becomes a row the teacher then has to clean up.
      const roster = students.filter((s) => s.active !== 0);
      const built = buildSchoologyExport({
        course: cls.course,
        courseConfig,
        className: cls.class_name,
        students: roster,
        cellFor: (sid, unit, lesson, act) => (map[sid] || {})[`${unit}|${lesson}|${act}`],
        filter: exportFilter,
      });

      // Preflight tells the teacher, BEFORE downloading, which columns cannot be
      // exported because nobody has assigned points to that activity. A column
      // that silently vanishes is how half a gradebook fails to import.
      if (wantsPreflight) return res.json(built.preflight);

      const lines = [
        built.headers.map((c2) => csvCell(c2)).join(','),
        built.pointsRow.map((c2) => csvCell(c2)).join(','),
        ...built.rows.map((r) => r.map((c2, i) => csvCell(c2, i === 0)).join(',')),
      ];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition',
        `attachment; filename="schoology-${cls.class_code}-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(lines.join('\r\n') + '\r\n');
    }

    if (format === 'canvas') {
      // Deactivated students stay out of Canvas. Their history survives here and
      // in the native export, which is the teacher's own record, but pushing a
      // withdrawn student into a live Canvas gradebook creates a row nobody
      // asked for and a name the teacher then has to match by hand.
      const canvasStudents = students.filter((s) => s.active !== 0);

      const build = scope === 'activity' ? buildCanvasActivityExport : buildCanvasUnitExport;
      const built = build({
        course: cls.course,
        courseConfig,
        className: cls.class_name,
        students: canvasStudents,
        cellFor: (sid, unit, lesson, act) => (map[sid] || {})[`${unit}|${lesson}|${act}`],
        filter: exportFilter,
      });

      // The warning before the download button, from the same pass that builds
      // the file: a teacher learns Canvas will drop three students before the
      // import, not after.
      if (wantsPreflight) return res.json(built.preflight);

      // Row 1 headers, row 2 "Points Possible" (Canvas requires it second), then
      // one row per student. No comment or instruction row: Canvas parses it as
      // a student.
      const lines = [
        built.headers.map((c) => csvCell(c)).join(','),
        built.pointsRow.map((c) => csvCell(c)).join(','),
        ...built.rows.map((r) => r.map((c, i) => csvCell(c, i === 0)).join(',')),
      ];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition',
        `attachment; filename="canvas-${scope}-${cls.class_code}-${new Date().toISOString().split('T')[0]}.csv"`);
      // NO BOM on the Canvas file, unlike the native export. Canvas matches the
      // first header cell against the literal string "Student", and a BOM makes
      // that cell parse as "﻿Student", so the whole header is rejected with
      // "The CSV header row is invalid." UTF-8 without a BOM is read correctly
      // by Canvas, and it is what CodeHS ships in its own Canvas export.
      return res.send(lines.join('\r\n'));
    }

    const ABBR = { lesson: 'L', 'exercise-1': 'E1', 'exercise-2': 'E2', 'exercise-3': 'E3', quiz: 'Q', lab: 'Lab', code: 'Code' };
    const abbr = a => ABBR[a] || a;
    const shortUnit = k => k.replace(/^unit-/, 'Unit ').replace(/^bi-/, 'BI ');

    // Activity columns, built once from the manifest.
    const unitIds = Object.keys(courseConfig.units);
    const cols = [];
    for (const unitId of unitIds) {
      const u = courseConfig.units[unitId];
      for (const lesson of u.lessons)
        for (const act of u.activities)
          cols.push({ unit: unitId, lesson, activity: act, header: `${lesson} ${abbr(act)}` });
      if (u.case_file) cols.push({ unit: unitId, lesson: u.case_file.lesson, activity: 'case-file', header: u.case_file.label || 'Case File' });
      for (const ex of examsOf(u)) cols.push({ unit: unitId, lesson: ex.lesson, activity: 'exam', header: ex.label || 'Unit Exam' });
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
        for (const ex of examsOf(u)) { tot++; const r = sm[`${unitId}|${ex.lesson}|exam`]; if (r && r.completed) done++; }
        for (const lesson of u.lessons) { const r = sm[`${unitId}|${lesson}|quiz`]; if (r && r.score != null) { qSum += r.score; qN++; } }
        allDone += done; allTot += tot;
        summaryCells.push(tot ? `${Math.round(done / tot * 100)}%` : '0%', qN ? Math.round(qSum / qN) : '');
      }
      // A recorded score always wins. Gating this on an activity allow-list is
      // what hid exercise scores that had been captured correctly all along.
      // Attempts-backed cells show true points ("8/10"); percent cells from the
      // score_events path keep showing the percent they always did. The ladder
      // itself now lives in lib/export-format.js, shared with the Canvas path so
      // one cell can never be read two ways.
      const cells = cols.map(c => formatCell(sm[`${c.unit}|${c.lesson}|${c.activity}`], 'human'));
      rows.push([s.display_name, s.student_ref || '', s.last_active || '',
        `${allTot ? Math.round(allDone / allTot * 100) : 0}%`, ...summaryCells, ...cells]);
    }

    const csv = BOM + rows.map(row => row.map(cell => csvCell(cell)).join(',')).join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition',
      `attachment; filename="gradebook-${cls.class_code}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (e) {
    console.error('Export error:', e);
    res.status(500).json({ error: 'Failed to export gradebook' });
  }
});

// ── CANVAS COURSE PACKAGE (.imscc) ────────────────────────────────────────────
//  The other half of the Canvas story. /export moves the GRADES; this moves the
//  COURSE: modules per unit, a link per lesson, and one already-named assignment
//  per gradebook column, so the CSV import lands on assignments that exist
//  instead of asking the teacher to confirm 250 new ones by hand.
//
//  scope, include and units mean exactly what they mean on /export, parsed by
//  the same helper, so the package and the CSV a teacher downloads in the same
//  sitting describe the same course.
//
//  It is a TEACHER route on a class for two reasons and neither is the data: the
//  package holds no class data at all, only public course structure. Teacher
//  ownership of a class is (a) the entitlement gate, since a class exists only
//  where a bundle was bought, and (b) how the route knows which course to build.
//
//  ?preflight=1 returns the summary as JSON instead of the file, so the portal
//  can show what is about to be imported before a 500 KB download.
//
//  Light rate limiting. Building the activity-scope CSA package is 615 files and
//  about 470 KB of deflate, measured at 50 ms on this box: cheap once, and rude
//  in a loop on one vCPU. 30 a minute is far more than a teacher clicking
//  download can produce and far less than a loop can spend.
const canvasPackageLimit = makeRateLimit({
  windowMs: 60 * 1000, max: 30,
  message: 'Too many course package downloads. Please wait a minute and try again.',
});

router.get('/classes/:code/canvas-course', requireTeacher, canvasPackageLimit, (req, res) => {
  try {
    const scope = String(req.query.scope || 'unit').toLowerCase();
    if (scope !== 'unit' && scope !== 'activity') {
      return res.status(400).json({ error: "scope must be 'unit' or 'activity'" });
    }

    const cls = db.prepare('SELECT * FROM classes WHERE class_code = ? AND teacher_id = ?')
      .get(req.params.code.toUpperCase(), req.teacher.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    // A solo class carries course 'solo', which is a grouping and not a
    // curriculum: there are no units to build modules from. Say so rather than
    // handing back an empty cartridge.
    const courseConfig = COURSES[cls.course];
    if (!courseConfig) {
      return res.status(400).json({ error: `No course package for ${cls.course}`, course: cls.course });
    }

    const parsed = parseExportFilter(req, courseConfig);
    if (parsed.error) return res.status(400).json(parsed.error);

    const pkg = buildCanvasCoursePackage({
      course: cls.course,
      courseConfig,
      scope,
      filter: parsed.filter,
    });

    if (isTruthy(req.query.preflight)) return res.json(pkg.summary);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${pkg.filename}"`);
    res.setHeader('Content-Length', String(pkg.buffer.length));
    return res.send(pkg.buffer);
  } catch (e) {
    console.error('teacher canvas-course:', e);
    return res.status(500).json({ error: 'Failed to build the Canvas course package' });
  }
});

// ── UPDATE CLASS ──────────────────────────────────────────────────────────────
router.put('/classes/:code', requireTeacher, (req, res) => {
  const cls = db.prepare('SELECT * FROM classes WHERE class_code = ? AND teacher_id = ?')
    .get(req.params.code.toUpperCase(), req.teacher.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const { class_name, active, mastery_threshold, games_graded } = req.body;
  const threshold = mastery_threshold !== undefined
    ? clampThreshold(mastery_threshold, cls.mastery_threshold)
    : cls.mastery_threshold;
  // games_graded: whether the exercise-2 game counts toward the grade. Accept
  // 1/0 to force on/off, or null to fall back to the course default. Omitting
  // the field leaves the current setting untouched.
  const gamesGraded = games_graded === undefined
    ? cls.games_graded
    : (games_graded === null ? null : (games_graded ? 1 : 0));

  db.prepare('UPDATE classes SET class_name = ?, active = ?, mastery_threshold = ?, games_graded = ? WHERE id = ?')
    .run(
      sanitize(class_name || cls.class_name, 100),
      active !== undefined ? (active ? 1 : 0) : cls.active,
      threshold,
      gamesGraded,
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

// ── SET CLASS RETRY POLICY ────────────────────────────────────────────────────
//  One endpoint, not a sibling. A second route would leave two writers for one
//  piece of state, and the invariant retry_allowed = (mode === 'all') would then
//  depend on which one a client happened to call. The old boolean is accepted as
//  an alias so any cached copy of the dashboard keeps working:
//      {retry_allowed: true}  -> 'all'
//      {retry_allowed: false} -> 'practice'   (quizzes one shot, practice redoable:
//                                              exactly what false has always meant
//                                              in production)
//  A client sending the boolean therefore cannot reach 'none'. That is deliberate:
//  'none' is new behavior and must be chosen explicitly, never inferred.
router.patch('/classes/:code/retry', requireTeacher, (req, res) => {
  const cls = db.prepare('SELECT * FROM classes WHERE class_code = ? AND teacher_id = ?')
    .get(req.params.code.toUpperCase(), req.teacher.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const { retry_mode, retry_allowed } = req.body;
  if (retry_mode === undefined && retry_allowed === undefined) {
    return res.status(400).json({
      error: "retry_mode required: 'all', 'practice' or 'none' (legacy retry_allowed true/false also accepted)",
    });
  }
  // retry_mode wins when both are sent, so a client that posts the new field plus
  // a stale boolean cannot get the boolean's answer.
  const mode = normalizeMode(retry_mode !== undefined ? retry_mode : retry_allowed);
  if (!mode) {
    return res.status(400).json({
      error: `Unrecognised retry policy ${JSON.stringify(retry_mode !== undefined ? retry_mode : retry_allowed)}. Use 'all', 'practice' or 'none'.`,
    });
  }

  // Both columns, one statement: retry_allowed is derived and must never be
  // written independently of the mode.
  db.prepare('UPDATE classes SET retry_mode = ?, retry_allowed = ? WHERE id = ?')
    .run(mode, legacyFromMode(mode), cls.id);

  res.json({
    ok: true,
    retry_mode: mode,
    retry_allowed: !!legacyFromMode(mode),
    label: MODE_LABELS[mode],
    description: MODE_DESCRIPTIONS[mode],
  });
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
    // score_reset_at is what makes this reset stick. progress.score is a derived
    // cache recomputed from the score_events ledger on every write (see the
    // lesson-score block in routes/student.js), so nulling the cache alone would
    // be undone the moment the student resubmits: the pre-reset attempts are
    // still in the ledger, and with retries off the first of them is the grade of
    // record forever. Stamping the moment of the reset excludes everything logged
    // at or before it, so the student's next submission is attempt 1 and a reset
    // grants exactly one retry. The old rows are not deleted; they stay in the
    // ledger and in GET /api/student/history, marked pre-reset.
    db.prepare(`
      UPDATE progress SET locked = 0, completed = 0, score = NULL, attempts = 0,
        score_reset_at = ?, completed_at = NULL, updated_at = ? WHERE id = ?
    `).run(now, now, record.id);
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

// ── RENAME STUDENT / RESET PIN / SET SIS REF ──────────────────────────────────
// Body: { display_name?, pin?, active?, student_ref? }. Any combination.
// Mirrors the join rules: names are unique per class (case-insensitive), PINs
// are exactly 4 digits.
//
// student_ref is the Canvas SIS Login ID bridge. It is validated here with the
// same rule the Canvas export applies, so a ref that would silently export
// blank (and silently drop the student from the import) is refused at the point
// the teacher sets it rather than discovered later in Canvas. Empty string
// clears it.
router.patch('/classes/:code/students/:studentId', requireTeacher, async (req, res) => {
  const cls = db.prepare('SELECT id FROM classes WHERE class_code = ? AND teacher_id = ?')
    .get(req.params.code.toUpperCase(), req.teacher.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const student = db.prepare('SELECT id, display_name FROM students WHERE id = ? AND class_id = ?')
    .get(req.params.studentId, cls.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const { display_name, pin, active, student_ref } = req.body;
  if (display_name === undefined && pin === undefined && active === undefined && student_ref === undefined) {
    return res.status(400).json({ error: 'Provide display_name, pin, active, and/or student_ref to update' });
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

  // Canvas SIS Login ID. Stored only if it would survive the export unchanged.
  if (student_ref !== undefined) {
    const raw = student_ref == null ? '' : String(student_ref).trim();
    if (raw === '') {
      db.prepare('UPDATE students SET student_ref = NULL WHERE id = ?').run(student.id);
    } else {
      if (canvasSisLoginId(raw) !== raw) {
        return res.status(400).json({
          error: 'student_ref must be an email or use only letters, numbers, dot, underscore, or hyphen (max 128 chars)',
        });
      }
      const clash = db.prepare(
        'SELECT id FROM students WHERE class_id = ? AND student_ref IS NOT NULL AND lower(student_ref) = lower(?) AND id != ?'
      ).get(cls.id, raw, student.id);
      if (clash) return res.status(409).json({ error: 'That student ref is already used in this class.' });
      db.prepare('UPDATE students SET student_ref = ? WHERE id = ?').run(raw, student.id);
    }
  }

  const updated = db.prepare(
    'SELECT id, display_name, student_ref, active, last_active FROM students WHERE id = ?'
  ).get(student.id);
  res.json({
    ok: true,
    student: { id: updated.id, name: updated.display_name, ref: updated.student_ref, active: updated.active, last_active: updated.last_active },
  });
});

// ── OFF-PLATFORM SCORE ENTRY ──────────────────────────────────────────────────
//  WHY THIS EXISTS
//  A course_manifest row IS a denominator. smoke/manifest-prune.js pins the rule
//  and the reason: an item no page can report does not sit harmlessly unused, it
//  marks every student in the class down for something no teacher can see on
//  screen. The fix there was to un-seed items that could never be earned.
//
//  The printed instruments are the other half of that problem, and un-seeding is
//  the wrong answer for them. The four AP Networking unit tests and the three
//  cumulative exams are real assessments a teacher really administers; they are
//  simply administered on paper. Dropping them from the manifest would keep the
//  denominator honest and leave the single largest block of assessment in the
//  course permanently outside the gradebook. So instead the teacher enters the
//  scores, and the manifest rows become true.
//
//  RULES
//   • The manifest is the authority, exactly as it is for a student submission:
//     it supplies lesson_id, item_type and max_score. The teacher sends a score.
//   • Re-entry REPLACES the teacher's own prior row for that item rather than
//     appending. A typo corrected from 34 to 43 must not leave 43 sitting in the
//     bank as a "best attempt" under a retry-on class. This is the one place a
//     row is deleted from attempts, and the DELETE is filtered to source =
//     'teacher': a student-reported attempt can never be touched from here.
//   • Student-reported attempts for the same item are left in place and still
//     count toward attempt_no, so a paper retake entered after an online try
//     numbers correctly.
//   • passed is computed against the class threshold at write time, same as
//     routes/progress.js, and is a snapshot: rollups recompute at read time.
//   • detail, ua and duration_seconds stay NULL. There are no per-question
//     results to record, and the request's User-Agent is the teacher's browser,
//     which would be a misleading device signal on a student's row.
//   • Zero PII: numbers and existing ids only. Nothing free-text is stored.
const SCORES_MAX_ROWS = 300;

const scoreEntryLimit = makeRateLimit({
  windowMs: 60_000, max: 60,
  message: 'Too many score submissions. Wait a minute and try again.',
});

const manifestItemStmt = db.prepare(
  'SELECT lesson_id, item_type, points FROM course_manifest WHERE course = ? AND item_id = ?'
);
const classRosterStmt = db.prepare(
  'SELECT id, display_name, student_ref, active FROM students WHERE class_id = ? ORDER BY display_name COLLATE NOCASE'
);
const deleteTeacherAttemptStmt = db.prepare(
  "DELETE FROM attempts WHERE student_id = ? AND course = ? AND item_id = ? AND source = 'teacher'"
);
const countAttemptsStmt = db.prepare(
  'SELECT COUNT(*) n FROM attempts WHERE student_id = ? AND course = ? AND item_id = ?'
);
const insertTeacherAttemptStmt = db.prepare(`
  INSERT INTO attempts (student_id, class_id, course, lesson_id, item_id, item_type,
    score, max_score, passed, attempt_no, duration_seconds, ua, detail, source)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, 'teacher')
`);
const itemAttemptsStmt = db.prepare(`
  SELECT student_id, score, max_score, passed, attempt_no, source, created_at
  FROM attempts WHERE class_id = ? AND course = ? AND item_id = ?
  ORDER BY attempt_no
`);

// Resolve the class by code plus owner, and the manifest item, or explain which
// one failed. Shared by the GET and the POST so they cannot drift apart.
function resolveScoreTarget(req) {
  const cls = db.prepare('SELECT * FROM classes WHERE class_code = ? AND teacher_id = ?')
    .get(String(req.params.code || '').toUpperCase(), req.teacher.id);
  if (!cls) return { error: [404, 'Class not found'] };

  const src = req.method === 'GET' ? req.query : (req.body || {});
  // Solo classes roam across courses; a teacher class is pinned to its own.
  const course = cls.course === 'solo'
    ? String(src.course || '').slice(0, 40)
    : cls.course;
  if (!course) return { error: [400, 'course required'] };
  if (cls.course !== 'solo' && src.course !== undefined && src.course !== cls.course) {
    return { error: [400, `course must be '${cls.course}' for this class`] };
  }

  const item_id = typeof src.item_id === 'string' ? src.item_id : '';
  if (!item_id) return { error: [400, 'item_id required'] };

  const item = manifestItemStmt.get(course, item_id);
  if (!item || item.item_type === 'visit') {
    return { error: [400, `Unknown item '${item_id}' for ${course}. Not in course_manifest.`] };
  }
  return { cls, course, item_id, item };
}

// GET /api/teacher/classes/:code/scores?course=&item_id=
// The roster for one item: every student, what is currently recorded, and where
// it came from. This is what a score-entry screen loads before the teacher types
// anything, and it is how an entry is verified afterwards.
router.get('/classes/:code/scores', requireTeacher, (req, res) => {
  const t = resolveScoreTarget(req);
  if (t.error) return res.status(t.error[0]).json({ error: t.error[1] });

  const rows = itemAttemptsStmt.all(t.cls.id, t.course, t.item_id);
  const byStudent = new Map();
  for (const r of rows) {
    const cur = byStudent.get(r.student_id) || { attempts: 0, entered: null, best: null };
    cur.attempts++;
    if (r.source === 'teacher') cur.entered = r;
    if (!cur.best || (r.score / r.max_score) > (cur.best.score / cur.best.max_score)) cur.best = r;
    byStudent.set(r.student_id, cur);
  }

  res.json({
    class: { code: t.cls.class_code, course: t.course, mastery_threshold: t.cls.mastery_threshold },
    item: { item_id: t.item_id, lesson_id: t.item.lesson_id, item_type: t.item.item_type, max_score: t.item.points },
    students: classRosterStmt.all(t.cls.id).map((s) => {
      const g = byStudent.get(s.id);
      return {
        id: s.id,
        name: s.display_name,
        ref: s.student_ref,
        active: s.active,
        attempts: g ? g.attempts : 0,
        score: g && g.entered ? g.entered.score : null,
        entered_by_teacher: !!(g && g.entered),
        entered_at: g && g.entered ? g.entered.created_at : null,
        best_score: g && g.best ? g.best.score : null,
      };
    }),
  });
});

// POST /api/teacher/classes/:code/scores
//   { course, item_id, scores: [ { student_id, score }, ... ] }
// A score of null clears that student's teacher-entered row without writing a
// new one, which is how a mis-entered student is undone. One transaction for the
// whole class: thirty students is one write pass, not thirty round trips.
router.post('/classes/:code/scores', requireTeacher, scoreEntryLimit, (req, res) => {
  const t = resolveScoreTarget(req);
  if (t.error) return res.status(t.error[0]).json({ error: t.error[1] });

  const list = (req.body || {}).scores;
  if (!Array.isArray(list) || !list.length) {
    return res.status(400).json({ error: 'scores must be a non-empty array of {student_id, score}' });
  }
  if (list.length > SCORES_MAX_ROWS) {
    return res.status(400).json({ error: `scores is capped at ${SCORES_MAX_ROWS} rows per request` });
  }

  const maxScore = t.item.points;
  const roster = new Map(classRosterStmt.all(t.cls.id).map((s) => [s.id, s]));
  const threshold = t.cls.mastery_threshold != null ? t.cls.mastery_threshold : 80;

  // Validate the whole batch before writing any of it. A teacher entering a
  // class set should not get half a gradebook and an error.
  const planned = [];
  const seen = new Set();
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') {
      return res.status(400).json({ error: 'each score must be an object {student_id, score}' });
    }
    const sid = typeof raw.student_id === 'string' ? raw.student_id : '';
    if (!roster.has(sid)) {
      return res.status(400).json({ error: `Student '${sid}' is not in this class` });
    }
    if (seen.has(sid)) {
      return res.status(400).json({ error: `Student '${sid}' appears twice in scores` });
    }
    seen.add(sid);

    if (raw.score === null) { planned.push({ sid, score: null }); continue; }
    const score = Number(raw.score);
    if (!Number.isFinite(score) || score < 0 || score > maxScore) {
      return res.status(400).json({ error: `score for '${sid}' must be a number between 0 and ${maxScore} for '${t.item_id}'` });
    }
    planned.push({ sid, score });
  }

  const result = db.transaction(() => {
    let written = 0, cleared = 0;
    for (const p of planned) {
      // Replace, never stack: drop this teacher's prior row for the item first.
      const removed = deleteTeacherAttemptStmt.run(p.sid, t.course, t.item_id).changes;
      if (p.score === null) { cleared += removed; continue; }
      const attempt_no = countAttemptsStmt.get(p.sid, t.course, t.item_id).n + 1;
      const passed = (p.score / maxScore) * 100 >= threshold ? 1 : 0;
      insertTeacherAttemptStmt.run(
        p.sid, t.cls.id, t.course, t.item.lesson_id, t.item_id, t.item.item_type,
        p.score, maxScore, passed, attempt_no
      );
      written++;
    }
    return { written, cleared };
  })();

  res.json({
    ok: true,
    item: { item_id: t.item_id, lesson_id: t.item.lesson_id, item_type: t.item.item_type, max_score: maxScore },
    recorded: result.written,
    cleared: result.cleared,
  });
});

// ── REDEEM AN ACCESS CODE (Phase 4: Teacher Command Center, slice 1) ──────────
// A teacher redeems a single-use access code to gain (or refresh) an active
// entitlement for that code's course. Idempotent for the same teacher. Light
// per-teacher rate limit with bounded memory, mirroring the /api/progress
// pattern: fixed 60s window, no timers, hard-capped map.
const entitlements = require('../lib/entitlements');

const REDEEM_RL_WINDOW_MS = 60_000;
const REDEEM_RL_MAX = 10;
const REDEEM_RL_MAX_KEYS = 5000;
const redeemBuckets = new Map();
function redeemRateLimit(req, res, next) {
  const now = Date.now();
  let bucket = redeemBuckets.get(req.teacher.id);
  if (!bucket || now - bucket.start >= REDEEM_RL_WINDOW_MS) {
    if (redeemBuckets.size >= REDEEM_RL_MAX_KEYS) {
      for (const [k, v] of redeemBuckets) {
        if (now - v.start >= REDEEM_RL_WINDOW_MS) redeemBuckets.delete(k);
      }
      if (redeemBuckets.size >= REDEEM_RL_MAX_KEYS) redeemBuckets.clear();
    }
    bucket = { start: now, count: 0 };
    redeemBuckets.set(req.teacher.id, bucket);
  }
  bucket.count++;
  if (bucket.count > REDEEM_RL_MAX) {
    return res.status(429).json({ error: 'Too many attempts. Wait a minute and try again.' });
  }
  next();
}

router.post('/redeem', requireTeacher, redeemRateLimit, (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ entitled: false, error: 'Code required' });
    }
    const result = entitlements.redeemCode(req.teacher.id, code);
    if (!result.ok) {
      return res.status(result.http || 400).json({ entitled: false, error: result.error });
    }
    return res.json({ entitled: true, course: result.course });
  } catch (e) {
    console.error('teacher/redeem:', e);
    return res.status(500).json({ error: 'Redeem failed' });
  }
});

module.exports = router;
