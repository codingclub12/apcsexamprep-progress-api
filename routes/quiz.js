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
const { resolveMode, retryAllowedFor } = require('../retry-policy');
const { verifyStudentToken, newId, COURSES } = require('../utils');
const { rollupScore } = require('../scoring');
const { buildOrder, readOrder, sample } = require('../lib/quiz-order');
const { resolveGate } = require('../lib/activity-gate');
const wire = require('../lib/wire-log');

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
const classByIdStmt = db.prepare('SELECT course, retry_allowed, retry_mode, mastery_threshold FROM classes WHERE id = ?');
const retryOverrideStmt = db.prepare('SELECT retry_override FROM students WHERE id = ?');
const releaseStmt = db.prepare(`
  SELECT released FROM key_releases
  WHERE class_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?
`);
// Availability gate. Separate from classByIdStmt because that one is shaped for
// the retry policy and adding columns to it would touch every caller.
const gateClassStmt = db.prepare(
  'SELECT id, course, quiz_lock_default FROM classes WHERE id = ?'
);
const gateStmt = db.prepare(`
  SELECT open FROM activity_gates
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

const VALID_ACTIVITIES = new Set(['quiz', 'exam', 'exercise-1', 'exercise-2', 'exercise-3']);

// Field names a page might reasonably use for "the option the student picked".
// Checked in order; the first one present on the answer object wins.
const ANSWER_KEYS = ['chosen_index', 'chosen', 'answer', 'index', 'selected', 'choice'];

// Interpret one answer entry. Returns { index } when understood, { skip: true }
// for a deliberately unanswered question, or { bad: true, value } when a value
// was supplied that cannot be read as an option position. Accepts a whole
// number, a numeric string, or a single letter (A -> 0, B -> 1, ...), because a
// page sending any of those means the same thing and none of them should be
// silently scored as wrong.
function parseChosen(ans) {
  for (const k of ANSWER_KEYS) {
    if (!(k in ans)) continue;
    const v = ans[k];
    if (v === null || v === undefined || v === '') return { skip: true };
    if (typeof v === 'number') {
      return Number.isFinite(v) ? { index: Math.trunc(v) } : { bad: true, value: v };
    }
    if (typeof v === 'string') {
      const t = v.trim();
      if (/^-?\d+$/.test(t)) return { index: parseInt(t, 10) };
      if (/^[A-Za-z]$/.test(t)) return { index: t.toUpperCase().charCodeAt(0) - 65 };
    }
    return { bad: true, value: v };
  }
  return { skip: true };   // no answer field at all: an unanswered question
}

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
//
// STRICT. Use this on paths that ATTRIBUTE work or RELEASE a key, where quietly
// forgetting who the student is would lose their submission or hand out answers.
// The render path deliberately does not use it; see renderStudent below.
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

// TOLERANT. Render only.
//
// The strict middleware above rejects a bad credential with 401, and on the
// render path that turned a broken credential into a broken PAGE. A signed-out
// visitor gets 200 and the questions; someone holding an expired, malformed, or
// wrong-role token got 401, and apcs-quiz-mount.js prints "This quiz could not
// be loaded" for any non-200. So the quiz failed for exactly the people who HAD
// signed in, and worked for everyone who had not.
//
// It was not a rare edge case. That mount reads apcse_teacher_token BEFORE
// apcse_student_token, so every signed-in teacher previewing a quiz sent a
// teacher token, failed the role check, and got the error banner every single
// time. Reported from a live classroom as "the quiz is greyed out".
//
// Degrading to anonymous here is safe in a way it is not on submit: this route
// releases no key, attributes nothing, and returns exactly what it already
// returns to a signed-out visitor. Nothing is downgraded, because there is
// nothing on this route to downgrade.
//
// The class gate is not weakened either. A VALID student token still resolves
// the gate normally, so a locked class stays locked. A bad token lands where a
// signed-out browser already lands, which is the same place clearing site data
// has always led; it opens no door that was not already open.
function renderStudent(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) { req.student = null; return next(); }
  try {
    const payload = verifyStudentToken(token);
    if (payload.role !== 'student') { req.student = null; return next(); }
    const student = db.prepare('SELECT id, class_id, display_name FROM students WHERE id = ?').get(payload.id);
    // A token naming a student who no longer exists is stale, not hostile.
    req.student = student || null;
    if (student) req._identityKey = 'stu:' + student.id;
    next();
  } catch (e) {
    // Expired or unverifiable. Self-study, same as any signed-out visitor.
    req.student = null;
    next();
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
router.get('/:course/:unit/:lesson/:activity_type', renderStudent, (req, res) => {
  try {
    const { course, unit, lesson, activity_type } = req.params;
    if (!VALID_ACTIVITIES.has(activity_type)) {
      return res.status(400).json({ error: `activity_type must be one of ${[...VALID_ACTIVITIES].join(', ')}` });
    }
    const rows = bankByLocationStmt.all(course, unit, lesson, activity_type);
    if (!rows.length) {
      return res.status(404).json({ error: 'No server-scored quiz for this location' });
    }

    // Availability gate. A closed activity returns 200 with no questions rather
    // than 404, so the page can tell "your teacher has not opened this yet"
    // apart from "this quiz does not exist". The questions are simply never put
    // on the wire, which is the only kind of lock that survives View Source.
    // The gate applies only when this quiz is the student's own class course.
    // A solo (ME-) account, and a student looking at another course's quiz, are
    // both self-study here: gating them would lock someone out of practice their
    // teacher never intended to control. Same test the submit path uses to
    // decide mode, so render and submit cannot disagree.
    const sCls = req.student ? gateClassStmt.get(req.student.class_id) : null;
    const gcls = sCls && sCls.course === course ? sCls : null;
    const gateRow = gcls ? gateStmt.get(gcls.id, course, unit, lesson, activity_type) : null;
    const gate = resolveGate(gateRow, gcls, activity_type);
    if (!gate.open) {
      return res.json({
        course, unit, lesson, activity_type,
        locked: true, reason: gate.reason,
        order_token: null, total: 0, pool: rows.length, questions: null,
      });
    }
    // N-of-M: serve a server-chosen random subset when configured. The token
    // records exactly which questions were served, so the scorer grades only
    // those, and a student cannot request a smaller set.
    const cfg = quizConfigStmt.get(course, unit, lesson, activity_type);
    const served = cfg ? sample(rows, cfg.serve_count) : rows;
    const { token, questions } = buildOrder({ course, unit, lesson, activity_type }, served);
    res.json({
      course, unit, lesson, activity_type,
      locked: false,
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

    // 3b) Availability gate, re-checked at submit. A student who fetched the
    //     quiz while it was open and held the order_token must not be able to
    //     submit after the teacher closed it, and a token minted before a class
    //     was switched to locked-by-default must not still spend.
    if (mode === 'class') {
      const gRow = gateStmt.get(req.student.class_id, course, unit, lesson, activity_type);
      const g = resolveGate(gRow, gateClassStmt.get(req.student.class_id), activity_type);
      if (!g.open) {
        return res.status(403).json({
          error: 'This quiz is not open. Ask your teacher to open it.',
          locked: true, reason: g.reason,
        });
      }
    }

    // 4) Class mode: enforce one attempt unless retry is allowed. The lever for a
    //    retake is the class retry MODE (or retry_override on the student), not
    //    the legacy unlock flow, which belongs to client-submitted
    //    /api/student/quiz. This router serves assessments AND practice activity
    //    types, so the question is asked per activity_type: under mode 'practice'
    //    a CFU here may be redone while a quiz here may not.
    let retryOn = true;
    if (mode === 'class') {
      const override = canRetry(req.student.id);
      retryOn = retryAllowedFor(resolveMode(cls), activity_type, override);
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
    //
    //    Parsing is deliberately liberal, and failure is deliberately LOUD. This
    //    used to require a literal integer on `chosen_index` and silently drop
    //    anything else, which scored every question wrong: a page sending "2"
    //    instead of 2, or naming the field `chosen`, got a confident 0 out of N
    //    with a 200 response and no clue anywhere that the submission had not
    //    been understood. A skipped question is a real zero; an answer we cannot
    //    interpret is a bug, and the two must never look the same.
    const answers = Array.isArray(b.answers) ? b.answers : [];
    const chosenByQid = new Map();
    const unparsed = [];
    for (const ans of answers) {
      if (!ans || typeof ans.qid !== 'string') continue;
      const parsed = parseChosen(ans);
      if (parsed.bad) unparsed.push({ qid: ans.qid, value: parsed.value });
      else if (!parsed.skip) chosenByQid.set(ans.qid, parsed.index);
    }
    if (unparsed.length) {
      wire.recordOnce(req, { endpoint: 'POST /api/quiz/submit', body: b, student_id: req.student && req.student.id,
        course, unit, lesson, activity_type, status: 400, result: { unparsed: unparsed.length } });
      return res.status(400).json({
        error: 'Could not read the selected option for one or more questions, so this submission was not scored.',
        detail: `Send the index of the option AS SHOWN on the page, e.g. {"qid":"...","chosen_index":2}. ` +
          `A whole number, a numeric string, or a letter (A/B/C/D) is accepted; omit the field or send null for a skipped question. ` +
          `Accepted field names: ${ANSWER_KEYS.join(', ')}.`,
        unparsed,
      });
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
    wire.recordOnce(req, { endpoint: 'POST /api/quiz/submit', body: b, student_id: req.student && req.student.id,
      course, unit, lesson, activity_type, status: 200, result: { score, total, recorded } });
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
