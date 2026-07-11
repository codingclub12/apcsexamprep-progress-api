'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  PHASE 2 — SERVER-SIDE QUIZ SCORING
//  Mount in server.js:  app.use('/api/quiz', require('./routes/quiz'));
//
//  The integrity fix: answer keys never ship to the browser. The page renders
//  question + options only; the server owns the correct answers (quiz_bank),
//  scores the submission, and releases the key subject to a rule.
//
//  Two endpoints:
//    GET  /api/quiz/:course/:unit/:lesson/:activity_type
//         Public. Returns shuffled questions + a signed order_token. No keys.
//    POST /api/quiz/submit
//         Optional student auth. Scores server-side against quiz_bank.
//
//  Modes, derived server-side (never trusted from the client):
//    • self-study : no student token, OR a solo (ME-) account. Key is always
//      released in the response; unlimited attempts.
//    • class mode : an authenticated student in a real teacher class. One attempt
//      unless retry is allowed; the key (correct answers + explanations) is
//      withheld until the teacher releases it for that activity.
//
//  Backward compatible and additive: un-seeded quizzes 404, so any page not yet
//  migrated keeps its existing client-side flow untouched.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const { verifyStudentToken, newId, COURSES } = require('../utils');
const { rollupScore } = require('../scoring');
const { buildOrder, readOrder, sample } = require('../lib/quiz-order');

// ── PREPARED STATEMENTS (module scope, reused) ────────────────────────────────
const bankByLocationStmt = db.prepare(`
  SELECT qid, prompt, options, correct_index, explanation, points
  FROM quiz_bank
  WHERE course = ? AND unit = ? AND lesson = ? AND activity_type = ? AND active = 1
  ORDER BY q_order, qid
`);
const quizConfigStmt = db.prepare(
  'SELECT serve_count FROM quiz_config WHERE course = ? AND unit = ? AND lesson = ? AND activity_type = ?'
);
const classByIdStmt = db.prepare('SELECT course, retry_allowed, mastery_threshold FROM classes WHERE id = ?');
const retryOverrideStmt = db.prepare('SELECT retry_override FROM students WHERE id = ?');
const releaseStmt = db.prepare(`
  SELECT released FROM key_releases
  WHERE class_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?
`);
const priorEventsStmt = db.prepare(`
  SELECT COUNT(*) n FROM score_events
  WHERE student_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?
`);
const findProgressStmt = db.prepare(`
  SELECT id FROM progress
  WHERE student_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?
`);
const insertEventStmt = db.prepare(`
  INSERT OR IGNORE INTO score_events
    (id, student_id, class_id, course, unit, lesson, activity_type, item,
     points, max_points, correct, answers, client_event_id, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const updateProgressStmt = db.prepare(
  'UPDATE progress SET score = ?, attempts = ?, completed = 1, updated_at = ? WHERE id = ?'
);
const insertProgressStmt = db.prepare(`
  INSERT INTO progress (id, student_id, class_id, course, unit, lesson,
    activity_type, completed, score, attempts, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
`);
const insertQuizAttemptStmt = db.prepare(`
  INSERT INTO quiz_attempts (id, student_id, progress_id, course, unit, lesson, answers, score)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const VALID_ACTIVITIES = new Set(['quiz', 'exam', 'exercise-1', 'exercise-2']);

// ── RATE LIMIT (light, per identity, bounded memory) ──────────────────────────
// Same shape as routes/progress.js: fixed 60s window, no timers, hard key cap so
// the map can never grow unbounded on Railway's 1 GB ceiling. Keyed by student id
// when present, else by a coarse ip bucket for anonymous self-study.
const RL_WINDOW_MS = 60_000;
const RL_MAX_PER_WINDOW = 40;
const RL_MAX_KEYS = 5000;
const rlBuckets = new Map();

function rateLimit(req, res, next) {
  const key = (req._identityKey) || ('ip:' + (req.ip || 'anon'));
  const now = Date.now();
  let bucket = rlBuckets.get(key);
  if (!bucket || now - bucket.start >= RL_WINDOW_MS) {
    if (rlBuckets.size >= RL_MAX_KEYS) {
      for (const [k, v] of rlBuckets) if (now - v.start >= RL_WINDOW_MS) rlBuckets.delete(k);
      if (rlBuckets.size >= RL_MAX_KEYS) rlBuckets.clear();
    }
    bucket = { start: now, count: 0 };
    rlBuckets.set(key, bucket);
  }
  bucket.count++;
  if (bucket.count > RL_MAX_PER_WINDOW) {
    return res.status(429).json({ error: 'Too many submissions. Wait a minute and try again.' });
  }
  next();
}

// ── OPTIONAL STUDENT AUTH ─────────────────────────────────────────────────────
// A present token must be valid: we never silently downgrade an expired class
// student to key-revealing self-study. No token means anonymous self-study.
function optionalStudent(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) { req.student = null; return next(); }
  try {
    const payload = verifyStudentToken(token);
    if (payload.role !== 'student') throw new Error('not a student token');
    const student = db.prepare('SELECT id, class_id, display_name FROM students WHERE id = ?').get(payload.id);
    if (!student) return res.status(401).json({ error: 'Student not found' });
    req.student = student;
    req._identityKey = 'stu:' + student.id;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired student session' });
  }
}

function canRetry(studentId) {
  const stu = retryOverrideStmt.get(studentId);
  if (stu && stu.retry_override !== null && stu.retry_override !== undefined) {
    return !!stu.retry_override;
  }
  return null; // defer to class default
}

// ── GET render (key-free, shuffled) ───────────────────────────────────────────
router.get('/:course/:unit/:lesson/:activity_type', optionalStudent, (req, res) => {
  try {
    const { course, unit, lesson, activity_type } = req.params;
    if (!VALID_ACTIVITIES.has(activity_type)) {
      return res.status(400).json({ error: `activity_type must be one of ${[...VALID_ACTIVITIES].join(', ')}` });
    }
    const rows = bankByLocationStmt.all(course, unit, lesson, activity_type);
    if (!rows.length) {
      return res.status(404).json({ error: 'No server-scored quiz for this location' });
    }
    // N-of-M: serve a server-chosen random subset when configured. The token
    // records exactly which questions were served, so the scorer grades only
    // those, and a student cannot request a smaller set.
    const cfg = quizConfigStmt.get(course, unit, lesson, activity_type);
    const served = cfg ? sample(rows, cfg.serve_count) : rows;
    const { token, questions } = buildOrder({ course, unit, lesson, activity_type }, served);
    res.json({
      course, unit, lesson, activity_type,
      order_token: token,
      total: questions.length,       // number of questions actually served
      pool: rows.length,             // size of the full pool this was drawn from
      questions, // prompt + options only; no correct_index, no explanation
    });
  } catch (e) {
    console.error('Quiz render error:', e);
    res.status(500).json({ error: 'Failed to load quiz' });
  }
});

// ── POST submit (server-scored) ───────────────────────────────────────────────
router.post('/submit', optionalStudent, rateLimit, (req, res) => {
  try {
    const b = req.body || {};

    // 1) Order token is the authority for question/option positions and location.
    const order = readOrder(b.order_token);
    if (!order.valid) {
      return res.status(400).json({ error: 'Missing or invalid order_token. Re-fetch the quiz and try again.' });
    }
    const { course, unit, lesson, activity_type } = order.location;

    // 2) Load the authoritative key set for this location, indexed by qid. Under
    //    N-of-M the token holds only the served subset, so we score against the
    //    token's questions and look each one up here for its key and points.
    const bank = bankByLocationStmt.all(course, unit, lesson, activity_type);
    if (!bank.length) return res.status(404).json({ error: 'No server-scored quiz for this location' });
    const bankByQid = new Map(bank.map((r) => [r.qid, r]));

    // 3) Resolve mode from the authenticated identity, never from the client.
    let mode = 'self-study';   // anonymous public OR solo account
    let cls = null;
    let selfStudy = true;
    if (req.student) {
      cls = classByIdStmt.get(req.student.class_id);
      if (!cls) return res.status(401).json({ error: 'Class not found for student' });
      if (cls.course === 'solo') {
        mode = 'self-study';           // solo roams and self-studies
      } else if (cls.course === course) {
        mode = 'class'; selfStudy = false;
      } else {
        return res.status(400).json({ error: `This quiz is ${course}; your class is ${cls.course}.` });
      }
    }

    // 4) Class mode: enforce one attempt unless retry is allowed. The lever for a
    //    retake is retry_allowed (class) or retry_override (student), not the
    //    legacy unlock flow, which belongs to client-submitted /api/student/quiz.
    let retryOn = true;
    if (mode === 'class') {
      const override = canRetry(req.student.id);
      retryOn = override !== null ? override : !!cls.retry_allowed;
      const prior = priorEventsStmt.get(req.student.id, course, unit, lesson, activity_type).n;
      if (prior > 0 && !retryOn) {
        const roll = rollupScore(req.student.id, course, unit, lesson, activity_type);
        return res.status(403).json({
          error: 'You have already submitted this quiz and retries are not allowed.',
          locked: true,
          score: roll.earned, total: roll.possible,
        });
      }
    }

    // 5) Release rule: self-study always sees the key; class mode only after the
    //    teacher releases it for this activity.
    let released = selfStudy;
    if (mode === 'class') {
      const rel = releaseStmt.get(req.student.class_id, course, unit, lesson, activity_type);
      released = !!(rel && rel.released);
    }

    // 6) Score against the key. Map the shown option position the student picked
    //    back to the canonical option index via the order token, then compare.
    const answers = Array.isArray(b.answers) ? b.answers : [];
    const chosenByQid = new Map();
    for (const ans of answers) {
      if (ans && typeof ans.qid === 'string' && Number.isInteger(ans.chosen_index)) {
        chosenByQid.set(ans.qid, ans.chosen_index);
      }
    }

    let score = 0, total = 0;
    const perQuestion = [];
    const graded = [];   // for persistence: { qid, correct, canonicalChosen, points, max }
    // Iterate the served set in the order the token recorded (the order the page
    // rendered). A qid dropped from the bank since render is skipped.
    for (const [qid, perm] of order.map) {
      const row = bankByQid.get(qid);
      if (!row) continue;
      const shownChosen = chosenByQid.has(qid) ? chosenByQid.get(qid) : null;
      let canonicalChosen = null;
      if (shownChosen !== null && shownChosen >= 0 && shownChosen < perm.optPerm.length) {
        canonicalChosen = perm.optPerm[shownChosen];
      }
      const correct = canonicalChosen === row.correct_index;
      const pts = correct ? row.points : 0;
      score += pts; total += row.points;

      const entry = { qid, correct };
      if (released) {
        // Return the correct answer in the SHOWN order the client rendered, so it
        // can highlight without re-deriving the permutation.
        entry.correct_index = perm.optPerm.indexOf(row.correct_index);
        if (row.explanation) entry.explanation = row.explanation;
      }
      perQuestion.push(entry);
      graded.push({ qid, correct, canonicalChosen, points: pts, max: row.points });
    }

    // 7) Persist grades for authenticated students only (class and solo). Anonymous
    //    public self-study is scored and returned but never written. score_events
    //    stores option INDICES and booleans only, never answer text. Zero PII.
    let recorded = false;
    if (req.student) {
      const now = new Date().toISOString();
      const subKey = crypto.createHash('sha256').update(String(b.order_token)).digest('hex').slice(0, 24);
      const answersLog = graded.map((g, i) => ({ q: i + 1, sel: g.canonicalChosen, ok: g.correct }));

      db.transaction(() => {
        for (const g of graded) {
          insertEventStmt.run(
            newId(), req.student.id, req.student.class_id, course, unit, lesson,
            activity_type, g.qid, g.points, g.max, g.correct ? 1 : 0,
            null, subKey + ':' + g.qid, now
          );
        }
        const roll = rollupScore(req.student.id, course, unit, lesson, activity_type);
        const existing = findProgressStmt.get(req.student.id, course, unit, lesson, activity_type);
        let progressId;
        if (existing) {
          progressId = existing.id;
          updateProgressStmt.run(roll.pct, roll.events, now, progressId);
        } else {
          progressId = newId();
          insertProgressStmt.run(progressId, req.student.id, req.student.class_id,
            course, unit, lesson, activity_type, roll.pct, roll.events, now);
        }
        insertQuizAttemptStmt.run(newId(), req.student.id, progressId, course, unit, lesson,
          JSON.stringify(answersLog), roll.pct);
      })();
      recorded = true;
    }

    const recognized = !!(COURSES[course] && COURSES[course].units[unit]);
    res.json({
      score, total,
      mode, released, recorded, recognized,
      per_question: perQuestion,
    });
  } catch (e) {
    console.error('Quiz submit error:', e);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

module.exports = router;
