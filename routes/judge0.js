'use strict';
// routes/judge0.js
// Judge0 proxy for APCSExamPrep code editors.
//   - Java (default) powers the AP CSA in-lesson editors.
//   - Python and JavaScript power the AP CSP Create Task builder.
// Requires env var: RAPIDAPI_KEY
//
// Backward compatible: requests that send no language_id (the existing AP CSA
// editors) still run as Java, exactly as before.

const express = require('express');
const router = express.Router();

const JUDGE0_HOST = 'judge0-ce.p.rapidapi.com';
const JAVA_LANGUAGE_ID = 62; // Java (OpenJDK 13.0.1) on Judge0 CE

// Only these languages may be requested. Anything else falls back to Java.
const ALLOWED_LANGUAGE_IDS = {
  62: true, // Java (OpenJDK 13.0.1)
  71: true, // Python 3
  63: true  // JavaScript (Node.js)
};

// ── Rate limiter: 500 runs/hour per identity, 3000/hour overall ───────────────
//
// WHY 500 AND NOT 40
// The old ceiling was 40/hour per IP, sized for a handful of in-lesson editors.
// The 53 CSA exercise pages made that a classroom blocker rather than a
// theoretical one, because a school NAT puts a whole class behind ONE public IP:
// the Run button is the debugging loop those pages are built around, and 40 runs
// shared between 30 students is a little over one Run each per period.
//
// 500 is sized against the real worst case rather than a round number. Three
// classes of twenty behind one IP is 60 students; a student debugging hard runs
// their code maybe eight times while working an exercise, which is 480. So 500
// covers the worst realistic hour with the ceiling doing nothing, which is what a
// ceiling is supposed to do.
//
// The same limiter covers grading. routes/student.js calls this proxy with
// `X-Forwarded-For: codegrade:<studentId>`, so a submission is partitioned per
// STUDENT rather than per IP. At 40 a student got about eight submissions an hour
// of a five case exercise, which was its own quiet bite; at 500 they get a
// hundred. One number fixes both paths.
//
// WHAT IT COSTS
// Judge0 is about $0.0017 a run. A busy hour that genuinely uses 500 costs $0.85,
// and that is the product working. The number to actually watch is the monthly
// total, not the hourly burst: 60 students working two exercises a week at ~23
// runs each (eight Runs plus three Submits over five cases) is ~11k runs a month,
// about $19. A full 53 exercise semester for that many students is ~$124 spread
// over four months. That fits the ~$30/month target, but not with much room, so
// the aggregate is worth watching on the bill.
//
// THE GLOBAL BACKSTOP, AND WHY IT EXISTS
// Raising the per-identity ceiling 12.5x raises what a single runaway client can
// burn from $0.07/hour to $0.85/hour, and NOTHING bounded the total before: ten
// bad identities cost ten times as much, forever. A prior memory leak in this
// repo caused a $169 spike, so an unbounded spend path is not a hypothetical
// here. GLOBAL_LIMIT is a runaway backstop, deliberately set about 3x above what
// a genuinely busy day peaks at (five schools of 60 students spread over a school
// day is roughly 1100 runs in the worst hour), so real classes never reach it and
// a runaway stops at ~$5/hour instead of never.
//
// The tradeoff is real and is accepted on purpose: at the global ceiling one
// abuser can deny service to everyone. At this budget, a bill that cannot run
// away is worth more than an hour of degraded service that a person can see and
// act on. The two limits therefore return DIFFERENT messages, so "the site is at
// capacity" is never mistaken for "you personally clicked too fast".
const RATE_LIMIT = 500;
const GLOBAL_LIMIT = 3000;
const WINDOW_MS = 60 * 60 * 1000;

// Hard key cap, in the same shape as the code-grade limiter in routes/student.js.
// Without it this map grows one entry per unique IP and is only swept every ten
// minutes, so a burst of unique addresses between sweeps grows it without bound.
// That is precisely the per-request growth CLAUDE.md says to be paranoid about,
// and it is the same class of bug as the leak that caused the $169 spike.
const MAX_KEYS = 20000;
const hits = new Map();
let globalWindowStart = Date.now();
let globalCount = 0;
let globalReported = false;

// Returns null when the run is allowed, or a reason string naming WHICH ceiling
// was hit. The caller turns that into a message; they are never the same message.
function rateLimited(ip) {
  const now = Date.now();

  if (now - globalWindowStart > WINDOW_MS) {
    globalWindowStart = now;
    globalCount = 0;
    globalReported = false;
  }

  let entry = hits.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) {
    if (hits.size >= MAX_KEYS) {
      for (const [k, v] of hits) if (now - v.start > WINDOW_MS) hits.delete(k);
      if (hits.size >= MAX_KEYS) hits.clear();
    }
    entry = { start: now, count: 0 };
    hits.set(ip, entry);
  }

  // The per-identity count is charged first and always, so an identity that is
  // over its own ceiling cannot also eat the global budget on the way to a 429.
  entry.count += 1;
  if (entry.count > RATE_LIMIT) return 'identity';

  globalCount += 1;
  if (globalCount > GLOBAL_LIMIT) {
    // Loud on purpose, ONCE per window. Reaching this means either a runaway
    // client or genuine growth past what this ceiling was sized for, and both
    // need a human. Logging per refused request instead would emit a line for
    // every rejection during exactly the incident it is reporting, which is
    // thousands a minute of log spend that buries the one line worth reading.
    if (!globalReported) {
      globalReported = true;
      console.error(`judge0: GLOBAL hourly ceiling of ${GLOBAL_LIMIT} runs reached;`
        + ` further runs refused until the window rolls. Distinct identities this window: ${hits.size}`);
    }
    return 'global';
  }

  return null;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of hits) {
    if (now - entry.start > WINDOW_MS) {
      hits.delete(ip);
    }
  }
}, 10 * 60 * 1000).unref();

// ── POST /api/judge0/run ──────────────────────────────────────────────────────
// body: { code: string, language_id?: number, stdin?: string }
router.post('/run', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']
      ? String(req.headers['x-forwarded-for']).split(',')[0].trim()
      : req.socket.remoteAddress;

    // Two ceilings, two messages. Telling a student to take a break when the
    // whole site is at capacity sends them off to wait for something that is not
    // going to clear on its own, and hides an incident from whoever should see it.
    const limited = rateLimited(ip);
    if (limited === 'identity') {
      return res.status(429).json({
        error: 'rate_limited',
        message: 'Too many runs this hour. Take a short break and try again.'
      });
    }
    if (limited === 'global') {
      return res.status(429).json({
        error: 'capacity',
        message: 'The code runner is at capacity right now. This is not something you did. Try again in a few minutes.'
      });
    }

    const code = req.body && req.body.code;
    const stdin = (req.body && req.body.stdin) || '';

    // Pick the language: honor a requested, allow-listed id; otherwise Java.
    let languageId = JAVA_LANGUAGE_ID;
    const requested = req.body && Number(req.body.language_id);
    if (requested && ALLOWED_LANGUAGE_IDS[requested]) {
      languageId = requested;
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'bad_request', message: 'Missing code.' });
    }
    if (code.length > 20000) {
      return res.status(400).json({ error: 'too_long', message: 'Code too long.' });
    }
    if (!process.env.RAPIDAPI_KEY) {
      console.error('RAPIDAPI_KEY not set');
      return res.status(500).json({ error: 'config', message: 'Code runner not configured.' });
    }

    const payload = {
      language_id: languageId,
      source_code: Buffer.from(code, 'utf8').toString('base64'),
      stdin: Buffer.from(stdin, 'utf8').toString('base64'),
      cpu_time_limit: 5,
      memory_limit: 128000
    };

    const j0res = await fetch(
      `https://${JUDGE0_HOST}/submissions?base64_encoded=true&wait=true`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': JUDGE0_HOST
        },
        body: JSON.stringify(payload)
      }
    );

    if (!j0res.ok) {
      const text = await j0res.text();
      console.error('Judge0 error', j0res.status, text);
      return res.status(502).json({
        error: 'judge0_error',
        message: 'Code runner is temporarily unavailable. Try again in a moment.'
      });
    }

    const data = await j0res.json();

    function fromB64(s) {
      if (!s) {
        return '';
      }
      return Buffer.from(s, 'base64').toString('utf8');
    }

    return res.json({
      language_id: languageId,
      status: data.status && data.status.description ? data.status.description : 'Unknown',
      status_id: data.status ? data.status.id : 0,
      stdout: fromB64(data.stdout),
      stderr: fromB64(data.stderr),
      compile_output: fromB64(data.compile_output),
      time: data.time,
      memory: data.memory
    });
  } catch (err) {
    console.error('judge0 route error', err);
    return res.status(500).json({
      error: 'server_error',
      message: 'Something went wrong running your code.'
    });
  }
});

module.exports = router;

// Exported for smoke/judge0-limits.js only. These ceilings are the difference
// between a classroom that works and one that stops mid lesson, and between a
// bill that can run away and one that cannot, so they are worth pinning rather
// than trusting to a careful reader. `_resetLimiter` exists because the state is
// module scoped by design (it must be shared across requests) and a test that
// cannot reset it can only ever assert one thing.
module.exports.rateLimited = rateLimited;
module.exports.RATE_LIMIT = RATE_LIMIT;
module.exports.GLOBAL_LIMIT = GLOBAL_LIMIT;
module.exports.MAX_KEYS = MAX_KEYS;
module.exports._resetLimiter = function _resetLimiter() {
  hits.clear();
  globalWindowStart = Date.now();
  globalCount = 0;
  globalReported = false;
};
module.exports._limiterSize = () => hits.size;
