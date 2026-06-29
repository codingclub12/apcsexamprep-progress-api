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

// ── Rate limiter: 40 runs/hour per IP ─────────────────────────────────────────
// Worst case cost per student: 40 * $0.0017 = ~$0.07/hr
const RATE_LIMIT = 40;
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  let entry = hits.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) {
    entry = { start: now, count: 0 };
    hits.set(ip, entry);
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
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

    if (rateLimited(ip)) {
      return res.status(429).json({
        error: 'rate_limited',
        message: 'Too many runs this hour. Take a short break and try again.'
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
