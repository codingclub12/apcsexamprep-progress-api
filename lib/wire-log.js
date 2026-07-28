'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  WIRE LOG - a bounded, in-memory record of what the pages actually SEND to the
//  scoring endpoints.
//
//  WHY: an exercise reading 0/5 can be caused at three different layers (which
//  endpoint the page posts to, the shape of the payload, or the scoring itself),
//  and reading code cannot tell you which. Guessing costs a deploy per attempt.
//  This captures the real request so the answer is read off a page instead.
//
//  MEMORY: a fixed-size ring buffer, overwritten in place. It cannot grow, which
//  matters on the 1 GB Railway box where an unbounded array once cost $169. No
//  timers, no listeners, no per-request allocation beyond the one entry.
//
//  PII: this deliberately records SHAPE, not content. Field names, value types,
//  and numbers (option indices, scores, counts) only. Never answer text, never a
//  student name, never any free text a student typed. The student id is reduced
//  to a short hash so repeat submissions can be correlated without identifying
//  anyone.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const CAPACITY = 120;
const buf = new Array(CAPACITY);
let next = 0;
let total = 0;
// The buffer is in memory, so it empties on every restart. Reporting when the
// process started is what makes an empty log interpretable: 0 captured two
// minutes after a deploy means "no traffic yet", while 0 captured after hours of
// student activity means the pages are not reaching these endpoints at all.
const STARTED_AT = new Date().toISOString();

// Short, non-reversible handle for correlating a student's own submissions.
function anonId(id) {
  if (!id) return null;
  return crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 8);
}

// Describe a value without disclosing free text: type, and the value itself only
// when it is a number or boolean (option indices and scores are not PII).
function describe(v) {
  if (v === null) return { t: 'null' };
  if (v === undefined) return { t: 'undefined' };
  if (typeof v === 'number') return { t: 'number', v };
  if (typeof v === 'boolean') return { t: 'boolean', v };
  if (typeof v === 'string') {
    // A short numeric or single-letter string is a choice, and safe to keep;
    // anything longer is treated as opaque text and only its length is kept.
    if (/^\s*-?\d+\s*$/.test(v) || /^\s*[A-Za-z]\s*$/.test(v)) return { t: 'string', v: v.trim() };
    return { t: 'string', len: v.length };
  }
  if (Array.isArray(v)) return { t: 'array', len: v.length };
  if (typeof v === 'object') return { t: 'object', keys: Object.keys(v).slice(0, 12) };
  return { t: typeof v };
}

// Summarise an answers array: how many entries, which field names each carries,
// and how the chosen value is typed. This is what identifies a shape mismatch.
function describeAnswers(answers) {
  if (!Array.isArray(answers)) return { present: false, shape: describe(answers) };
  const keySets = new Map();
  const valueTypes = new Map();
  const ANSWER_KEYS = ['chosen_index', 'chosen', 'answer', 'index', 'selected', 'choice'];
  for (const a of answers.slice(0, 40)) {
    if (!a || typeof a !== 'object') { keySets.set('(not an object)', (keySets.get('(not an object)') || 0) + 1); continue; }
    const keys = Object.keys(a).sort().join(',');
    keySets.set(keys, (keySets.get(keys) || 0) + 1);
    for (const k of ANSWER_KEYS) {
      if (k in a) { const d = describe(a[k]); valueTypes.set(k + ':' + d.t, (valueTypes.get(k + ':' + d.t) || 0) + 1); break; }
    }
  }
  return {
    present: true,
    count: answers.length,
    key_sets: [...keySets.entries()].map(([keys, n]) => ({ keys, n })),
    chosen_value_types: [...valueTypes.entries()].map(([k, n]) => ({ shape: k, n })),
    sample: answers.slice(0, 3).map((a) => (a && typeof a === 'object'
      ? Object.fromEntries(Object.keys(a).slice(0, 8).map((k) => [k, describe(a[k])]))
      : describe(a))),
  };
}

// Record one scoring request. Called from the scoring routes; never throws, so a
// logging bug can never break a student's submission.
function record(entry) {
  try {
    const body = entry.body || {};
    buf[next] = {
      at: new Date().toISOString(),
      endpoint: entry.endpoint,
      student: anonId(entry.student_id),
      course: body.course || entry.course || null,
      unit: body.unit || entry.unit || null,
      lesson: body.lesson || entry.lesson || null,
      activity_type: body.activity_type || entry.activity_type || null,
      body_keys: Object.keys(body).sort(),
      // The fields that decide how a submission is scored.
      fields: Object.fromEntries(
        ['score', 'points', 'max_points', 'earned', 'possible', 'correct', 'choice', 'item', 'order_token']
          .filter((k) => k in body).map((k) => [k, describe(body[k])])
      ),
      answers: describeAnswers(body.answers),
      status: entry.status,
      result: entry.result || null,
    };
    next = (next + 1) % CAPACITY;
    total += 1;
  } catch (e) { /* never let diagnostics break scoring */ }
}

// Record from inside a handler, where the SCORING RESULT is known. Marks the
// request so the catch-all middleware does not capture it a second time; the
// in-handler entry is strictly richer.
function recordOnce(req, entry) {
  if (req) req._wireLogged = true;
  record(entry);
}

// Newest first.
function recent(limit) {
  const n = Math.min(limit || CAPACITY, CAPACITY);
  const out = [];
  for (let i = 1; i <= CAPACITY && out.length < n; i++) {
    const e = buf[(next - i + CAPACITY) % CAPACITY];
    if (e) out.push(e);
  }
  return out;
}

function stats() {
  const seen = recent(CAPACITY);
  const byEndpoint = {};
  for (const e of seen) byEndpoint[e.endpoint] = (byEndpoint[e.endpoint] || 0) + 1;
  const uptimeS = Math.round((Date.now() - Date.parse(STARTED_AT)) / 1000);
  return {
    captured_total: total,
    buffer_size: seen.length,
    capacity: CAPACITY,
    server_started_at: STARTED_AT,
    uptime_seconds: uptimeS,
    note: total === 0
      ? (uptimeS < 600
          ? 'Nothing captured yet, and this process started less than 10 minutes ago. Submit an activity, then re-read.'
          : 'Nothing captured despite the process running a while. If students have been active, the pages are not reaching any scoring endpoint on this API.')
      : undefined,
    by_endpoint: byEndpoint,
  };
}

// Paths whose POST bodies are safe and useful to capture. An ALLOWLIST, never a
// blocklist: /student/login, /student/join and /solo-init carry names and PINs,
// and must never be recorded even by accident. Adding a scoring route later means
// adding it here deliberately.
const CAPTURE_PATHS = new Set([
  '/api/quiz/submit',
  '/api/student/score',
  '/api/student/quiz',
  '/api/student/quiz/finalize',
  '/api/student/track',
  '/api/student/code-grade',
  '/api/progress/attempt',
]);

// Mount BEFORE the scoring routers. Captures one entry per allowlisted POST,
// including its response status, so a request that 400s or never reaches its
// handler is still visible. Failure here can never affect the response.
function middleware(req, res, next) {
  if (req.method !== 'POST' || !CAPTURE_PATHS.has(req.path)) return next();
  const path = req.path;
  const body = req.body;
  let done = false;
  const finish = () => {
    if (done || req._wireLogged) return;   // a handler already logged it, richer
    done = true;
    record({
      endpoint: 'POST ' + path,
      body,
      student_id: (req.student && req.student.id) || null,
      status: res.statusCode,
    });
  };
  res.on('finish', finish);
  res.on('close', finish);
  next();
}

module.exports = { record, recordOnce, recent, stats, describe, describeAnswers, middleware, CAPTURE_PATHS };
