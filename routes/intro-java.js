'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  INTRO TO JAVA: THE RUN BUTTON.
//
//  One route. A student presses Run on a lesson exercise, their method is
//  assembled against the headless Greenfoot stub, run once, and the frames come
//  back so the page can animate them. See docs/greenfoot-trace.md.
//
//  ── WHY THIS EXISTS RATHER THAN THE PAGE CALLING JUDGE0 DIRECTLY ────────────
//  The CSA exercise pages assemble their own Run source in the browser, which
//  works because a CSA submission is already a whole program. An intro-java
//  submission is a bare method that means nothing without the stub, and the
//  stub is about 7KB of Java plus brace arithmetic that has to match the grader
//  exactly. Shipping that to the browser would mean two copies of the assembly
//  rule, and the copies would drift; the drift would surface as Run and Submit
//  disagreeing about a student's own code, which is the worst bug this system
//  could have. So assembly stays server side, in the one place that already
//  owns it.
//
//  ── WHAT THIS DOES NOT DO ───────────────────────────────────────────────────
//  It does not grade, record, or store anything. Nothing reaches the database
//  on this path. The student's source is used in transit and dropped, the same
//  posture the code grader and the gap grader already take.
//
//  It also does not touch routes/judge0.js. It calls that proxy over loopback
//  exactly as routes/student.js does, so language allow-listing, base64
//  handling and the hourly limits stay owned by that one subsystem.
//
//  ── COST ────────────────────────────────────────────────────────────────────
//  One Judge0 run per press, the same as any other Run button, about $0.0017.
//  The trace rides on stdout of a call the student was already making. The
//  per-student limiter below is the second guard; the proxy's own hourly
//  ceiling is the first.
//
//  Zero PII. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const fs = require('fs');
const path = require('path');

const { BY_LESSON } = require('../seed/intro-java-exercises');
const { traceCase, parseTrace } = require('../lib/greenfoot-stub');
const codeModes = require('../lib/csa-code-modes');

const router = express.Router();

const JAVA_LANGUAGE_ID = 62;

// A submission is one method body. 20KB is far more than any exercise here
// needs and still small enough that a paste bomb cannot reach Judge0.
const MAX_SOURCE = 20_000;

// Per-IP fixed window. Deliberately tighter than the proxy's 500/hour, because
// this route is reachable without signing in: Run works signed out, the same as
// it does on the CSA pages, and a student who has not joined a class yet should
// still be able to see their code move. Same bounded-map shape used everywhere
// else in this repo: fixed window, no timers, hard key cap, so the map cannot
// grow without bound on a 1GB box.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const MAX_KEYS = 5000;
const buckets = new Map();

function rateLimited(key) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now - b.start >= WINDOW_MS) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, v] of buckets) if (now - v.start >= WINDOW_MS) buckets.delete(k);
      if (buckets.size >= MAX_KEYS) buckets.clear();
    }
    b = { start: now, count: 0 };
    buckets.set(key, b);
  }
  b.count++;
  return b.count > MAX_PER_WINDOW;
}

function baseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

// The trace player, served once from here rather than inlined into ten Shopify
// page bodies. One copy means one version: a page cannot end up animating with
// a player older than the recorder that produced its frames. It also keeps each
// exercise page about 12KB smaller, and the browser caches it across all of
// them.
//
// Read from disk ONCE at require time. Re-reading per request would be a file
// read on a 1GB box for something that cannot change without a redeploy.
const PLAYER_JS = fs.readFileSync(
  path.join(__dirname, '..', 'shopify', 'greenfoot-player.js'), 'utf8');

router.get('/player.js', (req, res) => {
  res.set('Content-Type', 'application/javascript; charset=utf-8');
  // Long cache, because the file only changes on a deploy and every exercise
  // page pulls it. immutable stops revalidation requests entirely.
  res.set('Cache-Control', 'public, max-age=86400, immutable');
  res.send(PLAYER_JS);
});

/**
 * POST /api/intro-java/trace
 *
 * body: { lesson: '1.6', source: 'public void act() { ... }' }
 *
 * 200 { trace, stdout, compile_output, stderr }
 *     `trace` is null when the program did not get far enough to record one,
 *     which is the normal shape of a compile error. The page shows the compile
 *     output in that case, which is the useful thing anyway.
 */
router.post('/trace', async (req, res) => {
  try {
    const b = req.body || {};
    const lesson = b.lesson != null ? String(b.lesson).slice(0, 10) : '';
    const source = typeof b.source === 'string' ? b.source : '';

    const exercise = BY_LESSON[lesson];
    if (!exercise) {
      return res.status(404).json({ error: 'no intro-java exercise for that lesson' });
    }
    // A lesson whose exercise has no scene is one where nothing moves, so there
    // is nothing to animate. 2.2 prints numbers; drawing a disc for it would be
    // theatre. The page does not render a Run button for those at all, so this
    // is a guard against a hand-made request rather than a path students hit.
    if (!exercise.scene) {
      return res.status(400).json({ error: 'this exercise has no animation, use Submit to check it' });
    }
    if (!source.trim()) return res.status(400).json({ error: 'source is required' });
    if (source.length > MAX_SOURCE) {
      return res.status(413).json({ error: 'that is much longer than this exercise needs' });
    }

    // The limiter key prefers the student id when one is present, so two
    // students behind one school NAT do not share a bucket. requireStudent is
    // deliberately NOT used: Run is available signed out.
    const key = `ijtrace:${req.student ? req.student.id : (req.ip || 'anon')}`;
    if (rateLimited(key)) {
      return res.status(429).json({ error: 'Too many runs. Wait a minute and press Run again.' });
    }

    // Assembled through the SAME two functions the grader uses. If the wrap ever
    // changes, Run and Submit move together rather than drifting apart.
    const scene = traceCase(Object.assign({}, exercise.scene, {
      helpers: exercise.helpers || '',
      base: exercise.base,
    }));
    const program = codeModes.assemble('segment', JAVA_LANGUAGE_ID, source, scene);

    const r = await fetch(`${baseUrl(req)}/api/judge0/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': key },
      body: JSON.stringify({ code: program, language_id: JAVA_LANGUAGE_ID, stdin: '' }),
    });
    if (!r.ok) {
      // Pass the proxy's own status through rather than flattening it: a 429
      // from the hourly ceiling and a 502 from Judge0 being down need different
      // sentences on the page, and only the proxy knows which happened.
      const body = await r.json().catch(() => ({}));
      return res.status(r.status).json({
        error: body.message || body.error || 'the code runner is unavailable',
      });
    }

    const out = await r.json();
    const parsed = parseTrace(out.stdout || '', { names: exercise.scene.names });

    return res.json({
      trace: parsed.trace,
      truncated: parsed.malformed,
      stdout: parsed.stdout,
      compile_output: out.compile_output || '',
      stderr: out.stderr || '',
    });
  } catch (e) {
    // No student source in the log line, ever. The message is ours, not theirs.
    console.error('[intro-java] trace failed:', e && e.message);
    return res.status(500).json({ error: 'could not run that' });
  }
});

module.exports = router;
