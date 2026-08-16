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
const wireLog = require('../lib/wire-log');
const posthog = require('../lib/posthog');
const { resolveMode, retryAllowedFor } = require('../retry-policy');
const gapGrader = require('../lib/gap-grader');

// ── PREPARED STATEMENTS (module scope, reused across requests) ────────────────
const getClassStmt = db.prepare(
  'SELECT course, mastery_threshold, retry_allowed, retry_mode FROM classes WHERE id = ?'
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
    score, max_score, passed, attempt_no, duration_seconds, ua, detail)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

// Accepted item types. Must stay in step with what seed-manifest.js writes.
// 'gap' is the intro-java fill-in-the-code item. It is deliberately NOT
// postable through /attempt: a gap is graded from a server-side key, so a
// client-supplied score for one would be a forgeable grade. POST /gap below is
// the only way a gap attempt can be written, and it computes the score itself.
const ITEM_TYPES = new Set(['cfu', 'quiz', 'exercise-1', 'exercise-2', 'exercise-3']);
const GAP_ITEM_TYPE = 'gap';

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
    // cfu and quiz are the Unit 1 pilot vocabulary; the exercise types carry
    // the authored point weights of the newer whole-activity lesson pages
    // (exercise-1 code problems, exercise-2 game, exercise-3 FRQ). The
    // manifest match below still gates which types are real for an item.
    if (!ITEM_TYPES.has(b.item_type)) {
      return res.status(400).json({ error: "item_type must be one of 'cfu', 'quiz', 'exercise-1', 'exercise-2', 'exercise-3'" });
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

    // Telemetry, not grade data: junk never blocks the write. duration is
    // client-computed (item render to submit), clamped to one day; ua is
    // captured server-side from the request header.
    const duration = Number.isInteger(b.duration_seconds) && b.duration_seconds >= 0
      ? Math.min(b.duration_seconds, 86400)
      : null;
    const ua = (req.get('user-agent') || '').slice(0, 120) || null;

    const threshold = cls.mastery_threshold != null ? cls.mastery_threshold : 80;
    const passed = (score / maxScore) * 100 >= threshold ? 1 : 0;

    // Which attempt at this item counts, under the class's three-mode retry
    // policy. This used to read the legacy boolean alone, which meant System A
    // practice items behaved as if the mode were always 'all' for a retryable
    // class and 'none' for a non-retryable one. A CFU here is practice, so under
    // mode 'practice' it is now redoable, exactly as the same CFU posted through
    // the score_events ledger already was. retry_override still wins outright.
    const override = getRetryOverrideStmt.get(req.student.id);
    const retryOn = retryAllowedFor(
      resolveMode(cls), b.item_type,
      (override && override.retry_override != null) ? override.retry_override : null
    ) ? 1 : 0;

    const result = db.transaction(() => {
      const attempt_no = countPriorStmt.get(req.student.id, item_id, course).n + 1;
      insertAttemptStmt.run(
        req.student.id, req.student.class_id, course, lesson_id, item_id, b.item_type,
        score, maxScore, passed, attempt_no, duration, ua, detail.json
      );
      const gor = gradeOfRecordStmt.get(retryOn, req.student.id, item_id, course);
      return { attempt_no, gor };
    })();

    // Log from here, where the OUTCOME is known. The catch-all middleware only
    // sees the request and a status code, so a 200 told us a submission landed
    // but not what it was graded out of or what the grade of record became. That
    // is the whole question behind "it says 0 out of 5". Suppresses the
    // middleware's thinner entry for this request.
    wireLog.recordOnce(req, {
      endpoint: 'POST /api/progress/attempt',
      student_id: req.student.id,
      status: 200,
      body: b,
      course,
      result: {
        score, max_score: maxScore, passed: !!passed,
        attempt_no: result.attempt_no,
        gor_score: result.gor.score, gor_max: result.gor.max_score,
      },
    });

    // Product analytics. Same reasoning as the wire-log call above: the generic
    // middleware only knows a 200 happened, and "a submission landed" is a much
    // weaker fact than "a quiz was graded 8/10 on the second try". Fire and
    // forget; posthog.js swallows its own errors so this cannot fail the write
    // that already committed.
    posthog.capture('attempt_recorded', req.student.id, {
      course,
      lesson_id,
      item_id,
      item_type: b.item_type,
      score,
      max_score: maxScore,
      pct: maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : null,
      passed: !!passed,
      attempt_no: result.attempt_no,
      is_retry: result.attempt_no > 1,
      retry_allowed: !!retryOn,
      duration_seconds: duration,
      class_id: req.student.class_id,
      gor_score: result.gor.score,
      gor_max: result.gor.max_score,
    });

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

// ── SESSION HEARTBEAT: time on site + active (engaged) time ───────────────────
//  The reporter keeps ONE session id per visit (sessionStorage) and cumulative
//  active/total second counters. It flushes them here a couple times a minute and
//  once more on page hide. The server UPSERTs the single session row and keeps the
//  MAX of each counter, so a retried or out-of-order flush can never double count.
//  Coalesced to ~1-2 tiny writes/minute per active tab, one row per visit; this is
//  the write-amplification guard that keeps heartbeats off the Railway bill.
//
//  Zero PII: only the client-generated id, durations, a page-view count, a
//  truncated User-Agent, and the acquisition channel + referrer DOMAIN are stored.
//  No full URL, no query string, no IP, no student input.
//
//  channel / referrer_host are first-write-wins (COALESCE keeps the value set on
//  the first beat of the visit), so the acquisition channel is the ENTRY channel
//  and later same-session page navigations never overwrite it.
const upsertSessionStmt = db.prepare(`
  INSERT INTO sessions
    (id, student_id, class_id, course, active_seconds, total_seconds, page_views, ua, channel, referrer_host, started_at, last_beat_at)
  VALUES
    (@id, @sid, @cid, @course, @active, @total, @pv, @ua, @channel, @refhost, datetime('now'), datetime('now'))
  ON CONFLICT(id) DO UPDATE SET
    active_seconds = MAX(active_seconds, excluded.active_seconds),
    total_seconds  = MAX(total_seconds,  excluded.total_seconds),
    page_views     = MAX(page_views,     excluded.page_views),
    ua             = excluded.ua,
    channel        = COALESCE(sessions.channel, excluded.channel),
    referrer_host  = COALESCE(sessions.referrer_host, excluded.referrer_host),
    last_beat_at   = datetime('now')
  WHERE sessions.student_id = excluded.student_id
`);

// The acquisition channels the reporter may report; anything else becomes 'Other'.
// 'Class link' is the first-party teacher-referral channel: a student who entered
// through a class link (class code in the URL, or the join/enroll landing).
const CHANNELS = new Set(['Direct', 'Organic Search', 'Social', 'Referral', 'Email', 'Paid', 'Class link', 'Other']);

// Heartbeat has its own bounded limiter (separate budget from /attempt). ~1-2
// beats/min per tab expected; 40/min per student leaves headroom for several open
// tabs and the page-hide flush without starving the attempt limiter.
const HB_WINDOW_MS = 60_000;
const HB_MAX_PER_WINDOW = 40;
const HB_MAX_KEYS = 5000;
const hbBuckets = new Map();
function heartbeatRateLimit(req, res, next) {
  const now = Date.now();
  let bucket = hbBuckets.get(req.student.id);
  if (!bucket || now - bucket.start >= HB_WINDOW_MS) {
    if (hbBuckets.size >= HB_MAX_KEYS) {
      for (const [k, v] of hbBuckets) {
        if (now - v.start >= HB_WINDOW_MS) hbBuckets.delete(k);
      }
      if (hbBuckets.size >= HB_MAX_KEYS) hbBuckets.clear();
    }
    bucket = { start: now, count: 0 };
    hbBuckets.set(req.student.id, bucket);
  }
  bucket.count++;
  if (bucket.count > HB_MAX_PER_WINDOW) {
    return res.status(429).json({ error: 'Too many heartbeats.' });
  }
  next();
}

const SESSION_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const DAY_SECONDS = 86_400;
// Clamp a value to a non-negative integer within [0, max]; junk becomes 0.
function clampInt(v, max) {
  var n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < 0) return 0;
  return n > max ? max : n;
}

router.post('/heartbeat', requireStudent, heartbeatRateLimit, (req, res) => {
  try {
    const b = req.body || {};
    const id = String(b.session_id || '');
    if (!SESSION_ID_RE.test(id)) {
      return res.status(400).json({ error: 'session_id must be 8-64 url-safe chars' });
    }
    const course = b.course != null ? String(b.course).slice(0, 40) : null;
    const ua = (req.get('user-agent') || '').slice(0, 120);
    // Acquisition, validated to the enum; referrer is a domain only (strip any
    // stray path/query/@ before storing, belt-and-suspenders against PII).
    const channel = CHANNELS.has(b.channel) ? b.channel : (b.channel != null ? 'Other' : null);
    const refhost = b.referrer_host != null
      ? String(b.referrer_host).toLowerCase().replace(/[/?#@].*$/, '').slice(0, 100) || null
      : null;

    upsertSessionStmt.run({
      id,
      sid: req.student.id,
      cid: req.student.class_id,
      course,
      active: clampInt(b.active_seconds, DAY_SECONDS),
      total: clampInt(b.total_seconds, DAY_SECONDS),
      pv: clampInt(b.page_views, 100_000),
      ua,
      channel,
      refhost,
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('Heartbeat error:', e);
    res.status(500).json({ error: 'Failed to record heartbeat' });
  }
});

// ── POST /api/progress/gap ────────────────────────────────────────────────────
//  Fill-in-the-code grading. The student sends the tokens they typed; the server
//  compares them against a key that lives in lib/gap-grader.js and has never
//  been sent to a browser.
//
//  WHY THIS IS NOT JUST /attempt WITH item_type 'gap'
//  /attempt trusts the client's score, which is right for a widget that graded
//  an MCQ against a key the server also holds and re-checks at rollup. For a gap
//  there IS no client-side key, so a client-supplied score would simply be a
//  student telling us their own grade. The score here is computed server-side
//  and the request has no score field at all.
//
//  THE SUBMITTED TEXT IS NEVER STORED. It is graded in transit and discarded.
//  What is written is per-hole booleans, which is what `detail` carries. There is
//  no diagnostics mode, no truncated copy, and no hash: a filled hole is
//  student-typed free text and this product does not keep student free text.
router.post('/gap', requireStudent, rateLimit, (req, res) => {
  try {
    const b = req.body || {};

    const cls = getClassStmt.get(req.student.class_id);
    if (!cls) return res.status(401).json({ error: 'Class not found for student' });

    let course;
    if (cls.course === 'solo') {
      course = typeof b.course === 'string' ? b.course.slice(0, 40) : '';
    } else if (b.course === cls.course) {
      course = cls.course;
    } else {
      return res.status(400).json({ error: `course must be '${cls.course}' for this class` });
    }

    const item_id = typeof b.item_id === 'string' ? b.item_id : '';
    if (!course || !item_id) return res.status(400).json({ error: 'course and item_id required' });

    // Bounded input before anything else touches it. A gap exercise has a handful
    // of short blanks; anything past these limits is not a student answering a
    // question, and unbounded request bodies are how a 1 GB box falls over.
    const answers = b.answers;
    const isObj = answers && typeof answers === 'object';
    if (!isObj) return res.status(400).json({ error: 'answers must be an object or an array' });
    const submittedCount = Array.isArray(answers) ? answers.length : Object.keys(answers).length;
    if (submittedCount > 40) return res.status(400).json({ error: 'too many blanks submitted' });
    for (const v of Array.isArray(answers) ? answers : Object.values(answers)) {
      if (v !== undefined && v !== null && typeof v !== 'string') {
        return res.status(400).json({ error: 'every answer must be a string' });
      }
      if (typeof v === 'string' && v.length > 200) {
        return res.status(400).json({ error: 'an answer is too long' });
      }
    }

    // The manifest gates what is real, exactly as it does for /attempt.
    const manifest = getManifestStmt.get(course, item_id);
    if (!manifest || manifest.item_type !== GAP_ITEM_TYPE) {
      return res.status(400).json({ error: `Unknown gap item '${item_id}' for ${course}. Not in course_manifest.` });
    }
    // And the key gates what can be graded. A manifest row with no key is an
    // authoring mistake, and a 404 says so rather than silently scoring zero and
    // making a working page look like a failing student.
    if (!gapGrader.hasKey(course, item_id)) {
      return res.status(404).json({ error: `No gap key for '${item_id}'. The page is live but the key is missing.` });
    }

    const graded = gapGrader.gradeSubmission(course, item_id, answers);

    // The manifest is the points authority everywhere else, so a key that has
    // drifted from it must not silently regrade the class out of a different
    // denominator.
    if (graded.max_score !== manifest.points) {
      console.error(`[gap] key/manifest mismatch for ${course} ${item_id}: `
        + `key has ${graded.max_score} holes, manifest says ${manifest.points} points`);
      return res.status(500).json({ error: 'This exercise is misconfigured. Your work was not scored.' });
    }

    const lesson_id = manifest.lesson_id;
    const maxScore = manifest.points;
    const score = graded.score;

    const duration = Number.isInteger(b.duration_seconds) && b.duration_seconds >= 0
      ? Math.min(b.duration_seconds, 86400)
      : null;
    const ua = (req.get('user-agent') || '').slice(0, 120) || null;

    const threshold = cls.mastery_threshold != null ? cls.mastery_threshold : 80;
    const passed = (score / maxScore) * 100 >= threshold ? 1 : 0;

    const override = getRetryOverrideStmt.get(req.student.id);
    const retryOn = retryAllowedFor(
      resolveMode(cls), GAP_ITEM_TYPE,
      (override && override.retry_override != null) ? override.retry_override : null
    ) ? 1 : 0;

    const detailJson = JSON.stringify(graded.detail);

    const result = db.transaction(() => {
      const attempt_no = countPriorStmt.get(req.student.id, item_id, course).n + 1;
      insertAttemptStmt.run(
        req.student.id, req.student.class_id, course, lesson_id, item_id, GAP_ITEM_TYPE,
        score, maxScore, passed, attempt_no, duration, ua, detailJson
      );
      const gor = gradeOfRecordStmt.get(retryOn, req.student.id, item_id, course);
      return { attempt_no, gor };
    })();

    // NOTE what is logged: counts and booleans. `b` is NOT passed as the body
    // here, unlike /attempt, because for this route the body IS the student's
    // typed text and the wire log persists what it is given.
    wireLog.recordOnce(req, {
      endpoint: 'POST /api/progress/gap',
      student_id: req.student.id,
      status: 200,
      body: { course, item_id, blanks: submittedCount },
      course,
      result: {
        score, max_score: maxScore, passed: !!passed,
        attempt_no: result.attempt_no,
        gor_score: result.gor.score, gor_max: result.gor.max_score,
      },
    });

    posthog.capture('gap_recorded', req.student.id, {
      course,
      lesson_id,
      item_id,
      score,
      max_score: maxScore,
      pct: maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : null,
      passed: !!passed,
      attempt_no: result.attempt_no,
      is_retry: result.attempt_no > 1,
      // Which KINDS of mistake, never the text. This is the number that says
      // whether a blank is badly worded or the lesson above it is not landing.
      near_misses: graded.holes.filter((h) => !h.ok && h.reason).map((h) => h.reason),
      class_id: req.student.class_id,
    });

    res.json({
      recorded: true,
      score,
      max_score: maxScore,
      passed: !!passed,
      attempt_no: result.attempt_no,
      // Per-hole feedback names the KIND of mistake and never the answer.
      holes: graded.holes.map((h) => ({ n: h.n, ok: h.ok, message: h.message })),
      grade_of_record: {
        score: result.gor.score,
        max_score: result.gor.max_score,
        attempt_no: result.gor.attempt_no,
      },
      retry_allowed: !!retryOn,
    });
  } catch (e) {
    console.error('Gap grade error:', e);
    res.status(500).json({ error: 'Failed to record gap attempt' });
  }
});

module.exports = router;
