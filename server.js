'use strict';
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const adminSession = require('./lib/admin-session');
const app = express();

// Railway terminates TLS at its proxy and forwards the real client IP and
// protocol in X-Forwarded-* headers. Trusting the proxy lets req.ip (login rate
// limiting) and req.secure (Secure cookie flag) reflect the real client.
app.set('trust proxy', true);

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://www.apcsexamprep.com',
  'https://apcsexamprep.com',
  'https://progress.apcsexamprep.com', // this API + the admin dashboard page
  'http://localhost:3000',
  'http://localhost:5173',
  'null', // file:// origin for local testing
];

// Same-origin requests (Origin host === the request's own Host) are always safe
// and must be allowed regardless of the allowlist, or the same-origin admin
// dashboard's POST /admin/login (which browsers send with an Origin header) is
// rejected. The allowlist still governs genuine cross-origin callers (storefront).
function isAllowedOrigin(origin, host) {
  if (!origin) return true; // curl, server-to-server, most same-origin GETs
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try { if (host && new URL(origin).host === host) return true; } catch (_) { /* malformed */ }
  return false;
}

app.use(cors((req, cb) => {
  const origin = req.header('Origin');
  const ok = isAllowedOrigin(origin, req.header('Host'));
  cb(ok ? null : new Error(`CORS blocked: ${origin}`), { origin: ok, credentials: true });
}));

// Shopify orders/paid webhook must see the EXACT raw request bytes to verify its
// HMAC signature, so it is mounted BEFORE the global JSON parser. The router uses
// express.raw internally. Do not move this below express.json(). (Phase 4 slice 2.)
app.use('/api/shopify', require('./routes/shopify'));

app.use(express.json({ limit: '1mb' }));

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/student', require('./routes/student'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/game', require('./routes/game'));
app.use('/api/judge0', require('./routes/judge0'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/gate', require('./routes/gate'));

// Boot seeds run before app.listen, so any throw here would crash the process
// before the healthcheck can pass and take the whole service down. Each seed is
// therefore wrapped: a failure is logged loudly but never blocks boot. Seeds are
// insert-or-ignore and idempotent, so a skipped seed just leaves existing rows
// in place and can be re-run later with the script's --update flag. The API must
// always come up and serve /api/health, even with a bad seed.
function runBootSeed(label, fn) {
  try {
    return fn();
  } catch (err) {
    console.error(`[boot-seed] ${label} failed, continuing without it:`, err);
    return null;
  }
}

// Manifest seed on boot: insert-or-ignore only, so a fresh deploy is never
// fail-closed with an empty course_manifest and existing rows are untouched.
// Run `node scripts/seed-manifest.js --update` to push edits to existing rows.
const seeded = runBootSeed('course_manifest', () => require('./scripts/seed-manifest').seedManifest());
if (seeded) console.log(`course_manifest: ${seeded.changed} new of ${seeded.total} seed rows`);

// CSA answer key + denominators for the ap-csa reporter (System B). Unlike the
// order-token quiz_bank, this MUST be present on boot so the choice-only quiz
// scoring path works the moment the reporter goes live. Insert-or-ignore only;
// run `node scripts/seed-csa-bank.js --update` to push edits to existing rows.
const csaSeeded = runBootSeed('csa_bank', () => require('./scripts/seed-csa-bank').seedCsaBank());
if (csaSeeded) console.log(`csa bank: ${csaSeeded.answers} new answer rows, ${csaSeeded.denoms} new denominator rows`);

// ── PUBLIC ENDPOINTS ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// ── ADMIN CLASS DASHBOARD (gated page) ────────────────────────────────────────
//  A reachable, unlisted, noindex page. The gate is a signed session cookie minted
//  only after a constant-time admin-key check at /admin/login. Until then the
//  dashboard route serves the LOGIN page, so a bot that finds the URL never
//  receives the dashboard markup or its data-fetching JS, let alone any data. The
//  raw ADMIN_KEY never reaches the browser; data fetches ride the httpOnly cookie.
app.get('/admin/dashboard', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const file = adminSession.isAuthed(req) ? 'dashboard.html' : 'login.html';
  res.sendFile(path.join(__dirname, 'public', file));
});

// Exchange the admin key for a session cookie. Rate limited + constant-time +
// fails closed on a missing/weak ADMIN_KEY, same posture as /api/admin/*.
app.post('/admin/login', adminSession.loginRateLimit, (req, res) => {
  if (!adminSession.keyConfigured()) {
    return res.status(503).json({ error: 'Admin API disabled. Set a strong ADMIN_KEY (>= 20 chars).' });
  }
  const key = (req.body && req.body.key) || '';
  if (!adminSession.checkKey(key)) return res.status(403).json({ error: 'Invalid admin key.' });
  adminSession.issue(req, res);
  res.json({ ok: true });
});

app.post('/admin/logout', (req, res) => {
  adminSession.clear(res);
  res.json({ ok: true });
});

// Keep crawlers away from the admin surface. The gate is the real protection;
// this just avoids the page ever being indexed or probed by well-behaved bots.
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send('User-agent: *\nDisallow: /admin\nDisallow: /api\n');
});

// Validate class code exists (for student join flow)
app.get('/api/class/:code/exists', (req, res) => {
  const db = require('./db');
  const cls = db.prepare(`
    SELECT class_code, class_name, course,
      (SELECT COUNT(*) FROM students WHERE class_id = classes.id) as student_count
    FROM classes WHERE class_code = ? AND active = 1
  `).get(req.params.code.toUpperCase());
  if (!cls) return res.status(404).json({ exists: false });
  res.json({ exists: true, class_name: cls.class_name, course: cls.course, student_count: cls.student_count });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));

// ── ERROR HANDLER ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`APCSExamPrep Progress API running on port ${PORT}`);
  console.log(`DB: ${process.env.DB_PATH || './progress.db'}`);
});

module.exports = app;
