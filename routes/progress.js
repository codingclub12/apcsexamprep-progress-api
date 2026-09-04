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
const choiceGrader = require('../lib/choice-grader');
const receipt = require('../lib/anon-receipt');
const { makeRateLimit } = require('../lib/rate-limit');

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
// 'lab' is the interactive terminal lab (config/labs/*.json, played by
// public/lab-player.js). It posts here rather than through a server-graded
// route for one reason: a terminal collects typed strings, a typed string is
// free text, and this API never stores free text from a student. So the checks
// are evaluated in the browser and only the check index and its boolean arrive.
// That does mean the score is client-computed, exactly as it already is for
// every CSA widget. See docs/lab-contract.md.
// 'lab' is the widget on a cyber lesson page. 'terminal-lab' is the simulated
// shell in config/labs/. They are different activities that shared one name
// until 2026-09-04, and sharing it moved a live denominator: see lib/lab-spec.js.
// 'lab' stays accepted because rows written before the rename still carry it.
const ITEM_TYPES = new Set(['cfu', 'quiz', 'exercise-1', 'exercise-2', 'exercise-3', 'lab', 'terminal-lab']);
const GAP_ITEM_TYPE = 'gap';
// Server-graded multiple choice: the concept checks and the lesson quiz.
const CHOICE_ITEM_TYPES = new Set(['cfu', 'quiz']);

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
      return res.status(400).json({ error: `item_type must be one of ${[...ITEM_TYPES].join(', ')}` });
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
      return res.status(400).json({
        error: `course must be '${cls.course}' for this class`,
        student_message: 'This lesson is not part of your class, so nothing was saved. '
          + 'You can still read it and answer along.',
      });
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

// ── POST /api/progress/choice ─────────────────────────────────────────────────
//  Concept checks and quizzes for intro-java, graded server side.
//
//  WHY THIS EXISTS RATHER THAN REUSING /attempt
//  /attempt takes the score the PAGE worked out, which is right for CSA, whose
//  widgets carry their own key. intro-java pages deliberately do not ship the
//  key (lib/intro-java-page.js copies only id, stem and options; the smoke suite
//  greps every page to prove it). A browser with no key cannot compute a score,
//  so the score is computed here. There is no third option that does not involve
//  putting the answers in the page.
//
//  Unlike /gap, the selection IS stored. An option index is a number chosen from
//  a fixed list, not free text, and it is the documented detail shape. It is also
//  the thing that lets a teacher see eleven students picking the same wrong
//  option, which is a fact about the question rather than about the students.
router.post('/choice', requireStudent, rateLimit, (req, res) => {
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
      return res.status(400).json({
        error: `course must be '${cls.course}' for this class`,
        student_message: 'This lesson is not part of your class, so nothing was saved. '
          + 'You can still read it and answer along.',
      });
    }

    const item_id = typeof b.item_id === 'string' ? b.item_id : '';
    if (!course || !item_id) return res.status(400).json({ error: 'course and item_id required' });

    // Bounded before anything touches it. Selections are small integers; anything
    // else is not a student answering a question.
    const sel = b.selections;
    if (!sel || typeof sel !== 'object') {
      return res.status(400).json({ error: 'selections must be an object or an array' });
    }
    const vals = Array.isArray(sel) ? sel : Object.values(sel);
    if (vals.length > 100) return res.status(400).json({ error: 'too many selections' });
    for (const v of vals) {
      if (v !== null && v !== undefined && !Number.isInteger(v)) {
        return res.status(400).json({ error: 'every selection must be an integer option index' });
      }
    }

    const manifest = getManifestStmt.get(course, item_id);
    if (!manifest || !CHOICE_ITEM_TYPES.has(manifest.item_type)) {
      return res.status(400).json({ error: `Unknown choice item '${item_id}' for ${course}. Not in course_manifest.` });
    }
    if (!choiceGrader.hasKey(course, item_id)) {
      return res.status(404).json({ error: `No answer key for '${item_id}'. The page is live but the key is missing.` });
    }

    const graded = choiceGrader.gradeSubmission(course, item_id, sel);

    // The manifest is the points authority. A key that has drifted from it must
    // not silently regrade the class out of a different denominator.
    if (graded.max_score !== manifest.points) {
      console.error(`[choice] key/manifest mismatch for ${course} ${item_id}: `
        + `key has ${graded.max_score} questions, manifest says ${manifest.points} points`);
      return res.status(500).json({ error: 'This item is misconfigured. Your work was not scored.' });
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
      resolveMode(cls), manifest.item_type,
      (override && override.retry_override != null) ? override.retry_override : null
    ) ? 1 : 0;

    const detailJson = JSON.stringify(graded.detail);

    const result = db.transaction(() => {
      const attempt_no = countPriorStmt.get(req.student.id, item_id, course).n + 1;
      insertAttemptStmt.run(
        req.student.id, req.student.class_id, course, lesson_id, item_id, manifest.item_type,
        score, maxScore, passed, attempt_no, duration, ua, detailJson
      );
      const gor = gradeOfRecordStmt.get(retryOn, req.student.id, item_id, course);
      return { attempt_no, gor };
    })();

    wireLog.recordOnce(req, {
      endpoint: 'POST /api/progress/choice',
      student_id: req.student.id,
      status: 200,
      body: { course, item_id, answered: vals.length },
      course,
      result: {
        score, max_score: maxScore, passed: !!passed,
        attempt_no: result.attempt_no,
        gor_score: result.gor.score, gor_max: result.gor.max_score,
      },
    });

    posthog.capture('choice_recorded', req.student.id, {
      course,
      lesson_id,
      item_id,
      item_type: manifest.item_type,
      score,
      max_score: maxScore,
      pct: maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : null,
      passed: !!passed,
      attempt_no: result.attempt_no,
      is_retry: result.attempt_no > 1,
      class_id: req.student.class_id,
    });

    res.json({
      recorded: true,
      score,
      max_score: maxScore,
      passed: !!passed,
      attempt_no: result.attempt_no,
      // Which questions were right, so the page can mark them. NOT which option
      // was correct: telling a student the answer would turn every concept check
      // into a reveal button and make retrying pointless.
      questions: graded.questions.map((q) => ({ id: q.id, ok: q.ok })),
      grade_of_record: {
        score: result.gor.score,
        max_score: result.gor.max_score,
        attempt_no: result.gor.attempt_no,
      },
      retry_allowed: !!retryOn,
    });
  } catch (e) {
    console.error('Choice grade error:', e);
    res.status(500).json({ error: 'Failed to record attempt' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ANONYMOUS GRADING — a signed-out student gets marked, and nothing is stored.
//
//  ── WHY ─────────────────────────────────────────────────────────────────────
//  intro-java is a free course whose pages ship no answer key, so before this a
//  signed-out reader clicked "Check my answers" and got told to sign in. That is
//  a course that cannot be tried before it is joined. These two routes grade the
//  work and return a signed receipt; POST /import below is what turns a pile of
//  receipts into a real gradebook the moment an account exists.
//
//  ── WHAT "RECORDS NOTHING" MEANS HERE, LITERALLY ────────────────────────────
//  No attempts row. No session row. No wire-log entry. No PostHog event, because
//  PostHog needs a distinct id and inventing one for a signed-out student is
//  exactly the tracking this product does not do. Not even a counter. The rate
//  limiter holds an IP for at most one window and never writes it down; that is
//  the whole of the state these routes touch.
//
//  ── WHY THE COURSE IS ALLOWLISTED ───────────────────────────────────────────
//  Today the graders only hold intro-java banks, so nothing else COULD be graded
//  here. The allowlist is for the day someone adds a bank for a paid course and
//  does not think about this file: free-to-try is a decision per course, not a
//  side effect of where the answer keys happen to live.
const ANON_COURSES = new Set(['intro-java']);

// Per IP, not per student, because there is no student. Generous for a human
// working through a lesson (a lesson is a handful of checks plus a quiz) and
// still a brake on someone walking the option space to extract a key.
const anonRateLimit = makeRateLimit({
  windowMs: 60_000,
  max: 40,
  maxKeys: 5000,
  message: 'Too many checks from this connection. Wait a minute and try again.',
});

// Shared front half of both anonymous routes: what may be graded, and out of
// what. Returns the manifest row or sends the response itself.
function anonManifest(req, res, itemTypes) {
  const b = req.body || {};
  const course = typeof b.course === 'string' ? b.course.slice(0, 40) : '';
  const item_id = typeof b.item_id === 'string' ? b.item_id : '';
  if (!course || !item_id) {
    res.status(400).json({ error: 'course and item_id required' });
    return null;
  }
  if (!ANON_COURSES.has(course)) {
    res.status(403).json({
      error: `course '${course}' cannot be graded without an account`,
      student_message: 'Sign in to check your answers on this course.',
    });
    return null;
  }
  const manifest = getManifestStmt.get(course, item_id);
  if (!manifest || !itemTypes.has(manifest.item_type)) {
    res.status(400).json({ error: `Unknown item '${item_id}' for ${course}. Not in course_manifest.` });
    return null;
  }
  return { course, item_id, manifest };
}

// ── POST /api/progress/anon/choice ────────────────────────────────────────────
router.post('/anon/choice', anonRateLimit, (req, res) => {
  try {
    const found = anonManifest(req, res, CHOICE_ITEM_TYPES);
    if (!found) return;
    const { course, item_id, manifest } = found;

    const sel = (req.body || {}).selections;
    if (!sel || typeof sel !== 'object') {
      return res.status(400).json({ error: 'selections must be an object or an array' });
    }
    const vals = Array.isArray(sel) ? sel : Object.values(sel);
    if (vals.length > 100) return res.status(400).json({ error: 'too many selections' });
    for (const v of vals) {
      if (v !== null && v !== undefined && !Number.isInteger(v)) {
        return res.status(400).json({ error: 'every selection must be an integer option index' });
      }
    }

    if (!choiceGrader.hasKey(course, item_id)) {
      return res.status(404).json({ error: `No answer key for '${item_id}'. The page is live but the key is missing.` });
    }
    const graded = choiceGrader.gradeSubmission(course, item_id, sel);
    if (graded.max_score !== manifest.points) {
      console.error(`[anon/choice] key/manifest mismatch for ${course} ${item_id}`);
      return res.status(500).json({ error: 'This item is misconfigured. Your work was not scored.' });
    }

    res.json({
      // Not `recorded`. The signed-in routes say recorded:true and mean it; this
      // one must not be able to be mistaken for them by a reader or by a client.
      graded: true,
      stored: false,
      score: graded.score,
      max_score: graded.max_score,
      questions: graded.questions.map((q) => ({ id: q.id, ok: q.ok })),
      receipt: receipt.sign({
        course, item_id, item_type: manifest.item_type,
        score: graded.score, max_score: graded.max_score, detail: graded.detail,
      }),
    });
  } catch (e) {
    console.error('Anon choice error:', e);
    res.status(500).json({ error: 'Failed to grade' });
  }
});

// ── POST /api/progress/anon/gap ───────────────────────────────────────────────
//  Same promise as POST /gap about the typed text: graded in transit, discarded,
//  never stored. Here there is not even a row it could have been stored on.
router.post('/anon/gap', anonRateLimit, (req, res) => {
  try {
    const found = anonManifest(req, res, new Set([GAP_ITEM_TYPE]));
    if (!found) return;
    const { course, item_id, manifest } = found;

    const answers = (req.body || {}).answers;
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'answers must be an object or an array' });
    }
    const submitted = Array.isArray(answers) ? answers.length : Object.keys(answers).length;
    if (submitted > 40) return res.status(400).json({ error: 'too many blanks submitted' });
    for (const v of Array.isArray(answers) ? answers : Object.values(answers)) {
      if (v !== undefined && v !== null && typeof v !== 'string') {
        return res.status(400).json({ error: 'every answer must be a string' });
      }
      if (typeof v === 'string' && v.length > 200) {
        return res.status(400).json({ error: 'an answer is too long' });
      }
    }

    if (!gapGrader.hasKey(course, item_id)) {
      return res.status(404).json({ error: `No gap key for '${item_id}'. The page is live but the key is missing.` });
    }
    const graded = gapGrader.gradeSubmission(course, item_id, answers);
    if (graded.max_score !== manifest.points) {
      console.error(`[anon/gap] key/manifest mismatch for ${course} ${item_id}`);
      return res.status(500).json({ error: 'This exercise is misconfigured. Your work was not scored.' });
    }

    res.json({
      graded: true,
      stored: false,
      score: graded.score,
      max_score: graded.max_score,
      holes: graded.holes.map((h) => ({ n: h.n, ok: h.ok, message: h.message })),
      receipt: receipt.sign({
        course, item_id, item_type: GAP_ITEM_TYPE,
        score: graded.score, max_score: graded.max_score, detail: graded.detail,
      }),
    });
  } catch (e) {
    console.error('Anon gap error:', e);
    res.status(500).json({ error: 'Failed to grade' });
  }
});

// ── POST /api/progress/import ─────────────────────────────────────────────────
//  Carry work done signed out into the account that was just made.
//
//  ── WHY AN IMPORTED ATTEMPT IS NOT AS GOOD AS A LIVE ONE, AND WHAT FOLLOWS ──
//  A receipt proves the server graded that item at that score. It does not prove
//  it was the student's first try, because a signed-out student can grade the
//  same item as often as they like and keep only the receipt they liked. That is
//  not a flaw to patch; it is what "no account, nothing stored" costs, and it is
//  worth paying for a free course.
//
//  It does mean an import is exactly as strong as an unlimited retry, so it may
//  only land where unlimited retries are already the policy:
//
//    • retry on for that item type  -> import, because best-of-N already governs
//      the grade and a cherry-picked receipt is arithmetically just another try.
//    • retry off                    -> refuse, and say so. Retry-off exists so
//      the first attempt is the one that counts, and an imported receipt has no
//      first attempt to speak of. Silently importing here would quietly repeal a
//      teacher's setting.
//
//  Solo (ME-) accounts have retry on, so the acquisition path this was built for
//  works, and a teacher's grading policy is never overridden to make it work.
//
//  The second guard is simpler: an item the student has ALREADY attempted while
//  signed in is skipped. Real supervised work always beats a receipt, and it
//  makes a repeated import idempotent instead of stacking duplicate rows.
const MAX_RECEIPTS = 200;
const countAnyStmt = db.prepare(
  'SELECT COUNT(*) n FROM attempts WHERE student_id = ? AND item_id = ? AND course = ?'
);
const insertImportedStmt = db.prepare(`
  INSERT INTO attempts (student_id, class_id, course, lesson_id, item_id, item_type,
    score, max_score, passed, attempt_no, duration_seconds, ua, detail, source)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'imported')
`);

router.post('/import', requireStudent, rateLimit, (req, res) => {
  try {
    const b = req.body || {};
    const list = b.receipts;
    if (!Array.isArray(list)) return res.status(400).json({ error: 'receipts must be an array' });
    if (list.length > MAX_RECEIPTS) {
      return res.status(400).json({ error: `too many receipts (max ${MAX_RECEIPTS})` });
    }

    const cls = getClassStmt.get(req.student.class_id);
    if (!cls) return res.status(401).json({ error: 'Class not found for student' });

    const override = getRetryOverrideStmt.get(req.student.id);
    const overrideVal = (override && override.retry_override != null) ? override.retry_override : null;
    const mode = resolveMode(cls);
    const threshold = cls.mastery_threshold != null ? cls.mastery_threshold : 80;
    const ua = (req.get('user-agent') || '').slice(0, 120) || null;

    // Decide everything first, write once. Two receipts for the same item in one
    // payload is the client sending a stale copy alongside a fresh one; the first
    // decision wins and the rest are skipped as duplicates.
    const decided = [];
    const seen = new Set();
    for (const raw of list) {
      const v = receipt.verify(raw);
      if (!v.ok) {
        decided.push({ ok: false, item_id: null, reason: v.reason });
        continue;
      }
      const p = v.value;
      if (seen.has(p.i)) {
        decided.push({ ok: false, item_id: p.i, reason: 'duplicate' });
        continue;
      }
      seen.add(p.i);

      // Same course rule as every other write on this router.
      if (cls.course !== 'solo' && p.c !== cls.course) {
        decided.push({ ok: false, item_id: p.i, reason: 'wrong-course' });
        continue;
      }
      const manifest = getManifestStmt.get(p.c, p.i);
      if (!manifest || manifest.item_type === 'visit') {
        decided.push({ ok: false, item_id: p.i, reason: 'not-in-manifest' });
        continue;
      }
      // A receipt signed before a manifest edit must not import out of a stale
      // denominator; the manifest is the points authority here as everywhere.
      if (p.m !== manifest.points) {
        decided.push({ ok: false, item_id: p.i, reason: 'stale-denominator' });
        continue;
      }
      if (!retryAllowedFor(mode, manifest.item_type, overrideVal)) {
        decided.push({ ok: false, item_id: p.i, reason: 'retry-off' });
        continue;
      }
      if (countAnyStmt.get(req.student.id, p.i, p.c).n > 0) {
        decided.push({ ok: false, item_id: p.i, reason: 'already-attempted' });
        continue;
      }
      decided.push({
        ok: true, item_id: p.i, course: p.c, lesson_id: manifest.lesson_id,
        item_type: manifest.item_type, score: p.s, max_score: manifest.points,
        detail: p.d,
      });
    }

    const toWrite = decided.filter((d) => d.ok);
    if (toWrite.length) {
      db.transaction(() => {
        for (const d of toWrite) {
          const passed = (d.score / d.max_score) * 100 >= threshold ? 1 : 0;
          // attempt_no is 1 by construction: already-attempted items were filtered
          // out above, so nothing imported can be landing on top of prior work.
          insertImportedStmt.run(
            req.student.id, req.student.class_id, d.course, d.lesson_id, d.item_id,
            d.item_type, d.score, d.max_score, passed, 1, null, ua,
            JSON.stringify(d.detail)
          );
        }
      })();
    }

    // The one place a signed-in student id exists for this work, so the one place
    // it can be measured. This is the number that says whether free-to-try turns
    // into accounts.
    posthog.capture('anon_work_imported', req.student.id, {
      class_id: req.student.class_id,
      course: cls.course,
      offered: list.length,
      imported: toWrite.length,
      skipped: decided.length - toWrite.length,
      points: toWrite.reduce((n, d) => n + d.score, 0),
    });

    // A partial import is the COMMON case, not the edge one: the default class
    // mode is 'practice', so a student arriving with a unit's worth of work gets
    // their concept checks and not their quizzes. Saying only half of that would
    // leave them hunting for a quiz grade that was never going to appear.
    const n = toWrite.length;
    const added = `Added ${n} ${n === 1 ? 'item' : 'items'} you finished before signing in.`;
    const held = 'Your class counts your first try at a quiz, so quiz work done '
      + 'before you signed in was not added. You can take it here.';
    const retryOff = decided.some((d) => d.reason === 'retry-off');
    res.json({
      imported: n,
      skipped: decided.length - n,
      results: decided.map((d) => (d.ok
        ? { item_id: d.item_id, imported: true, score: d.score, max_score: d.max_score }
        : { item_id: d.item_id, imported: false, reason: d.reason })),
      student_message: n && retryOff ? `${added} ${held}`
        : (retryOff ? held
          : (n ? added : 'Nothing new to add. Anything you had already done here was kept.')),
    });
  } catch (e) {
    console.error('Import error:', e);
    res.status(500).json({ error: 'Failed to import' });
  }
});

module.exports = router;
