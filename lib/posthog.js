'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  POSTHOG - server-side product analytics for the API.
//
//  OFF BY DEFAULT. With no POSTHOG_API_KEY in the environment every function
//  here is a no-op and the posthog-node client is never constructed, so local
//  runs, smoke tests and CI send nothing. Setting the key is the entire switch.
//
//  FAIL OPEN: analytics must never be able to fail a student's submission. Every
//  entry point is wrapped so a bad payload, a network error, or a PostHog outage
//  is swallowed and logged once, never thrown into a request handler.
//
//  MEMORY: maxQueueSize is pinned well below the SDK default of 10000. If
//  PostHog is unreachable the queue fills and then DROPS the oldest events
//  instead of growing, which matters on the 1 GB Railway box where an unbounded
//  array once cost $169. Same reasoning as the wire-log ring buffer.
//
//  PII: this module sends internal row IDs (student_id, class_id, teacher_id)
//  and request shape. It does not read display_name or teacher email. That is a
//  deliberate line: the IDs are enough to count and funnel on, and keeping names
//  out of the server stream means the export path stays clean even though the
//  browser SDK on the admin pages captures more.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_HOST = 'https://us.i.posthog.com';

let client = null;      // posthog-node instance, built lazily on first use
let started = false;    // init() has run (success or failure); do not retry
let warned = false;     // one console line per process for a broken client

function apiKey() {
  return String(process.env.POSTHOG_API_KEY || '').trim();
}

function host() {
  return String(process.env.POSTHOG_HOST || DEFAULT_HOST).trim();
}

// True when a key is configured. Read by the smoke test and by /api/config so a
// page can tell "analytics off" from "analytics on but silent".
function isEnabled() {
  return apiKey().length > 0;
}

function warnOnce(where, err) {
  if (warned) return;
  warned = true;
  console.warn(`[posthog] disabled after error in ${where}: ${err && err.message}`);
}

// ── CIRCUIT BREAKER ───────────────────────────────────────────────────────────
//  posthog-node logs a full stack trace plus a dumped Response object, through a
//  bare console.error it does not let you replace, on EVERY failed flush. A
//  PostHog outage or a mistyped key therefore produces about 25 log lines every
//  flushInterval, forever. That buries the Railway boot log we are supposed to
//  read after a deploy, and it keeps paying for sockets and retries against an
//  endpoint that is known to be down.
//
//  The one injectable seam is the fetch option, so the breaker lives there.
//  After BREAKER_THRESHOLD consecutive failures it stops calling the network for
//  BREAKER_COOLDOWN_MS and hands the SDK a synthetic 200, which makes it drop the
//  batch quietly instead of retrying and logging. Events are lost while the
//  circuit is open. That is the intended trade: analytics is best effort, and the
//  alternative is a log the operator stops reading.
const BREAKER_THRESHOLD = 2;
const BREAKER_COOLDOWN_MS = 5 * 60 * 1000;

function syntheticOk() {
  return {
    status: 200,
    text: () => Promise.resolve('{"status":"circuit-open"}'),
    json: () => Promise.resolve({ status: 'circuit-open' }),
    headers: { get: () => null },
  };
}

function makeBreakerFetch() {
  let consecutiveFailures = 0;
  let openUntil = 0;
  let lastOpenLog = 0;

  return async function breakerFetch(url, options) {
    const now = Date.now();
    if (now < openUntil) return syntheticOk();

    const trip = () => {
      consecutiveFailures = 0;
      openUntil = Date.now() + BREAKER_COOLDOWN_MS;
      // One line per cooldown, not one per flush. Bounded but still visible, so
      // a wrong key does not fail completely silently.
      if (Date.now() - lastOpenLog > BREAKER_COOLDOWN_MS) {
        lastOpenLog = Date.now();
        console.warn(`[posthog] delivery failing, pausing sends for ${BREAKER_COOLDOWN_MS / 60000} min`);
      }
    };

    try {
      const res = await fetch(url, options);
      if (res.status >= 200 && res.status < 300) {
        consecutiveFailures = 0;
        return res;
      }
      if (++consecutiveFailures >= BREAKER_THRESHOLD) {
        trip();
        return syntheticOk();
      }
      return res;
    } catch (e) {
      if (++consecutiveFailures >= BREAKER_THRESHOLD) {
        trip();
        return syntheticOk();
      }
      throw e;
    }
  };
}

// Build the client on first capture rather than at require() time, so importing
// this module is free and the env can be loaded in any order.
function getClient() {
  if (started) return client;
  started = true;
  if (!isEnabled()) return null;
  try {
    const { PostHog } = require('posthog-node');
    client = new PostHog(apiKey(), {
      host: host(),
      // Batch rather than one request per event: on a 1 vCPU box the syscall
      // cost of a request per submission is the thing that hurts, not the JSON.
      flushAt: 20,
      flushInterval: 10000,
      // Bounded on purpose. See the MEMORY note above.
      maxQueueSize: 500,
      requestTimeout: 5000,
      // See the CIRCUIT BREAKER note above.
      fetch: makeBreakerFetch(),
      // Unhandled exceptions and rejections are reported as $exception events.
      // Installs process-level listeners once, at construction.
      enableExceptionAutocapture: true,
    });
    // posthog-node emits 'error' instead of throwing. Without a listener a
    // transport failure would surface as an unhandled 'error' event and take
    // the process down, which is the opposite of fail open.
    if (typeof client.on === 'function') {
      client.on('error', (err) => warnOnce('transport', err));
    }
  } catch (e) {
    client = null;
    warnOnce('init', e);
  }
  return client;
}

// Stable pseudonymous handle for callers with no session, so anonymous traffic
// still groups into something countable. Matches the wire-log anonId shape.
function anonId(seed) {
  return 'anon_' + crypto.createHash('sha256').update(String(seed || 'unknown')).digest('hex').slice(0, 12);
}

// Identity for a request, preferring whatever the auth middleware already put on
// it. Reading req.student / req.teacher costs nothing; verifying the JWT a second
// time here would cost a signature check on every request.
function distinctIdFor(req) {
  if (req && req.student && req.student.id) return String(req.student.id);
  if (req && req.teacher && req.teacher.id) return String(req.teacher.id);
  return anonId((req && req.ip) || 'unknown');
}

// Collapse the volatile parts of a path so /api/admin/student/abc-123 and
// /api/admin/student/def-456 are one series. Unbounded property values are the
// analytics equivalent of an unbounded array: they make every chart useless and
// every query slow.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLASS_CODE_RE = /^(CSA|CSP|CYBER|ME)-[A-Z0-9]+$/i;
function normalizePath(pathname) {
  return String(pathname || '')
    .split('/')
    .map((seg) => {
      if (!seg) return seg;
      if (UUID_RE.test(seg)) return ':id';
      if (CLASS_CODE_RE.test(seg)) return ':code';
      if (/^\d+$/.test(seg)) return ':n';
      // Lesson and item ids such as 1.2 or 1.2-quiz.
      if (/^\d+\.\d+(-[a-z0-9-]+)?$/i.test(seg)) return ':item';
      return seg;
    })
    .join('/');
}

// ── BROWSER ASSET ─────────────────────────────────────────────────────────────

// PostHog serves its browser bundle from a per-region assets domain, which is
// not the same host as the ingestion API. Derive it rather than making the
// operator set two variables that must agree.
function assetsHost() {
  if (process.env.POSTHOG_ASSETS_HOST) return String(process.env.POSTHOG_ASSETS_HOST).trim();
  const h = host();
  if (h.indexOf('us.i.posthog.com') !== -1) return 'https://us-assets.i.posthog.com';
  if (h.indexOf('eu.i.posthog.com') !== -1) return 'https://eu-assets.i.posthog.com';
  return h; // self-hosted instances serve their own static assets
}

// The values below are interpolated into JavaScript source, so they are filtered
// down to the characters a key and an origin can legitimately contain. An env
// var is not attacker controlled in the usual sense, but a stray quote here
// would break every admin page at once, and that is reason enough.
function safeKey(v) {
  return String(v || '').replace(/[^A-Za-z0-9_-]/g, '');
}
function safeOrigin(v) {
  return String(v || '').replace(/[^A-Za-z0-9_.:/-]/g, '');
}

let browserCache = null;

// public/posthog-init.js with the placeholders filled in, or an inert stub when
// no key is configured. Read and substituted once, then held: the pages request
// this on every load and it never changes within a process.
function browserSnippet() {
  if (browserCache !== null) return browserCache;
  if (!isEnabled()) {
    browserCache = '/* PostHog is off: POSTHOG_API_KEY is not set. */\nwindow.phCapture = function () {};\n';
    return browserCache;
  }
  try {
    const tpl = fs.readFileSync(path.join(__dirname, '..', 'public', 'posthog-init.js'), 'utf8');
    browserCache = tpl
      .replace(/__POSTHOG_KEY__/g, safeKey(apiKey()))
      .replace(/__POSTHOG_API_HOST__/g, safeOrigin(host()))
      .replace(/__POSTHOG_ASSETS_HOST__/g, safeOrigin(assetsHost()));
  } catch (e) {
    warnOnce('browserSnippet', e);
    browserCache = 'window.phCapture = function () {};\n';
  }
  return browserCache;
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────

// Fire and forget. Never throws, never returns a promise the caller must handle.
function capture(event, distinctId, properties) {
  const c = getClient();
  if (!c) return;
  try {
    c.capture({
      distinctId: String(distinctId || anonId('server')),
      event: String(event),
      properties: properties || {},
    });
  } catch (e) {
    warnOnce('capture', e);
  }
}

// Same, but pulls identity off the request.
function captureRequest(req, event, properties) {
  capture(event, distinctIdFor(req), properties);
}

// Every /api/* call as one event, recorded on response finish so the status and
// duration are real. Mount AFTER the body parser and BEFORE the routers.
//
// This is the "collect everything" hook and it is one event per API request, so
// it is also the single biggest driver of PostHog event volume and cost. Set
// POSTHOG_CAPTURE_REQUESTS=0 to keep the SDK on for explicit domain events while
// turning this firehose off.
function middleware(req, res, next) {
  if (!isEnabled() || String(process.env.POSTHOG_CAPTURE_REQUESTS || '1') === '0') return next();

  // originalUrl, not req.path. Express rewrites req.path to be relative to a
  // router's mount point, and this records on 'finish', which is after that
  // rewrite. Reading req.path there yields '/attempt' for
  // /api/progress/attempt, and silently merges same-named routes from different
  // routers into one series. originalUrl is never rewritten.
  const fullPath = String(req.originalUrl || req.url || '').split('?')[0];
  if (!fullPath.startsWith('/api/')) return next();

  const startedAt = process.hrtime.bigint();
  let done = false;
  // 'finish' fires on a normal response, 'close' on an aborted one. Guard so a
  // request that emits both is captured once, and so the listeners cannot
  // double-fire into the queue.
  const record = () => {
    if (done) return;
    done = true;
    try {
      const ms = Number((process.hrtime.bigint() - startedAt) / 1000000n);
      captureRequest(req, 'api_request', {
        method: req.method,
        path: normalizePath(fullPath),
        raw_path: fullPath,
        status: res.statusCode,
        duration_ms: ms,
        ok: res.statusCode < 400,
        role: req.student ? 'student' : req.teacher ? 'teacher' : 'anonymous',
        class_id: (req.student && req.student.class_id) || undefined,
        $current_url: req.originalUrl,
      });
    } catch (e) {
      warnOnce('middleware', e);
    }
  };
  res.once('finish', record);
  res.once('close', record);
  next();
}

// Flush the queue on shutdown. Railway sends SIGTERM on every redeploy, and
// without this the last flushInterval of events dies with the process.
async function shutdown() {
  if (!started || !client) return;
  try {
    await client.shutdown();
  } catch (e) {
    warnOnce('shutdown', e);
  }
}

module.exports = {
  isEnabled,
  capture,
  captureRequest,
  middleware,
  browserSnippet,
  shutdown,
  distinctIdFor,
  // exported for the smoke test
  _normalizePath: normalizePath,
  _host: host,
  _assetsHost: assetsHost,
  _makeBreakerFetch: makeBreakerFetch,
};
