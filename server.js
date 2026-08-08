'use strict';
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const adminSession = require('./lib/admin-session');
const wireLog = require('./lib/wire-log');
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

// Diagnostic capture of the scoring endpoints, mounted before their routers so a
// request that 400s or never reaches its handler is still recorded. Strict path
// allowlist inside; auth routes carrying names and PINs are never captured.
app.use(wireLog.middleware);

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/student', require('./routes/student'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/game', require('./routes/game'));
app.use('/api/judge0', require('./routes/judge0'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/gate', require('./routes/gate'));
// Command center (Phase 1). Dual auth inside each router (browser cookie OR
// Authorization: Bearer TODO_KEY); the one public route is the PII-stripped
// digest read URL, which is declared ahead of that middleware in routes/command.
app.use('/api/command', require('./routes/command'));
app.use('/api/todo', require('./routes/todo'));

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

// ── MANIFEST ORPHAN REPORT, AND THE OPT-IN PRUNE ──────────────────────────────
//  A course_manifest row IS a denominator, so an item that no page can report
//  marks every student down for a reason no teacher can see. Un-seeding such an
//  item is not enough on its own: the boot seed above is insert-or-ignore and
//  never deletes, by design, so the stale row stays.
//
//  Removing it needs a shell on the volume, which the owner does not always
//  have. So the report runs on EVERY boot (read only, names the orphans in the
//  boot log) and the delete happens only when MANIFEST_PRUNE=1 is set on the
//  service. That makes the whole operation doable from the Railway dashboard:
//  read the log, set the variable, redeploy, unset it.
//
//  The guarantees come from pruneManifest() itself and are not re-implemented
//  here: an item with ANY recorded attempt is never deleted whatever the flag
//  says, and nothing on attempts, score_events or progress is touched. Wrapped
//  in runBootSeed so a failure here can never stop the API from serving.
//
//  Idempotent. Once the orphans are gone this logs "none" and does nothing, so
//  leaving the variable set is harmless; unsetting it is still the tidy end.
//  ONE-SHOT: the 44 dead AP Networking CFU rows.
//  The flag above is the right general mechanism and it stays. But it needs
//  dashboard access, and the specific cleanup it was introduced for should not
//  wait on that. Every ap-networking topic page carries exactly one graded
//  practice widget, tagged cfu-2; cfu-1 and cfu-3 are spoken checks with no page
//  element, and they were seeded anyway. 22 topics times two = 44 points of
//  denominator no student can earn.
//
//  So those rows, and ONLY those rows, are removed without the flag. This is an
//  allowlist by exact item id, not a pattern and not a course-wide sweep: an
//  orphan that is not on this list still waits for MANIFEST_PRUNE, so the
//  general guard is intact. pruneManifest's own refusal to delete any row with a
//  recorded attempt applies here too and is not bypassed.
//
//  Reversible: restore the ids to NET_GRADED in scripts/seed-manifest.js and the
//  next boot seeds them back.
//
//  DELETE THIS BLOCK once a deploy has logged "no rows to clear". It is a
//  migration, not a feature, and migrations that outlive their purpose become
//  the thing nobody dares remove.
//  Implemented in scripts/seed-manifest.js so a smoke suite can test it without
//  booting the server. See the comment there for what it will and will not touch.
runBootSeed('course_manifest dead-cfu cleanup', () => {
  const { cleanDeadNetworkingCfus } = require('./scripts/seed-manifest');
  const r = cleanDeadNetworkingCfus();
  if (!r.candidates) {
    console.log('course_manifest dead-cfu cleanup: no rows to clear. Safe to delete this block.');
  } else {
    console.log(`course_manifest dead-cfu cleanup: removed ${r.deleted} row(s), ${r.points} points of unearnable denominator.`);
    for (const k of r.kept) {
      console.log(`course_manifest dead-cfu cleanup: KEPT ${k.item_id}, has ${k.attempts} attempt(s), refusing to delete.`);
    }
  }
  return r;
});

const MANIFEST_PRUNE = process.env.MANIFEST_PRUNE === '1';
runBootSeed('course_manifest prune', () => {
  const { pruneManifest } = require('./scripts/seed-manifest');
  const p = pruneManifest({ apply: MANIFEST_PRUNE });
  if (!p.orphans.length) {
    console.log('course_manifest prune: no orphaned rows.');
    return p;
  }
  for (const o of p.removable) {
    console.log(MANIFEST_PRUNE
      ? `course_manifest prune: REMOVED ${o.course} ${o.item_id} (${o.item_type}, ${o.points} pt, 0 attempts)`
      : `course_manifest prune: ORPHAN ${o.course} ${o.item_id} (${o.item_type}, ${o.points} pt, 0 attempts). Set MANIFEST_PRUNE=1 to remove.`);
  }
  for (const o of p.kept) {
    console.log(`course_manifest prune: KEPT ${o.course} ${o.item_id}, has ${o.attempts} attempt(s), refusing to delete.`);
  }
  console.log(`course_manifest prune: ${p.orphans.length} orphan(s), ${p.removable.length} removable, ${p.deleted} deleted (MANIFEST_PRUNE=${MANIFEST_PRUNE ? '1' : 'unset'}).`);
  return p;
});

// CSA answer key + denominators for the ap-csa reporter (System B). Unlike the
// order-token quiz_bank, this MUST be present on boot so the choice-only quiz
// scoring path works the moment the reporter goes live. Insert-or-ignore only;
// run `node scripts/seed-csa-bank.js --update` to push edits to existing rows.
const csaSeeded = runBootSeed('csa_bank', () => require('./scripts/seed-csa-bank').seedCsaBank());
if (csaSeeded) console.log(`csa bank: ${csaSeeded.answers} new answer rows, ${csaSeeded.denoms} new denominator rows`);

// Cyber denominators, extracted from the Shopify pages that own each activity.
// Insert-or-ignore only: a value authored or corrected by hand is never
// clobbered, and re-running is a no-op. Run
// `node scripts/seed-cyber-denominators.js --update` to push edits.
const cyberDenoms = runBootSeed('cyber_denominators', () => require('./scripts/seed-cyber-denominators').seedCyberDenominators());
if (cyberDenoms) console.log(`cyber denominators: ${cyberDenoms.changed} new of ${cyberDenoms.total} rows`);

// CSP denominators, counted from the mcq-item widgets on each lesson page. CSP
// was the only course with no denominator authority at all, so until this ran
// its 53 graded columns were priced by whatever the page happened to paint.
// Same insert-or-ignore posture; `node scripts/seed-csp-denominators.js --update`
// pushes edits after a page's question count changes.
const cspDenoms = runBootSeed('csp_denominators', () => require('./scripts/seed-csp-denominators').seedCspDenominators());
if (cspDenoms) console.log(`csp denominators: ${cspDenoms.changed} new of ${cspDenoms.total} rows`);

// Cyber case file denominators. Separate from the cyber seed above because all
// five case files sit at lesson 'case-file' and would collide on one
// course_denominators row, so these go to course_unit_denominators instead.
// Same insert-or-ignore posture;
// `node scripts/seed-cyber-case-file-denominators.js --update` pushes edits.
const cyberCaseFileDenoms = runBootSeed('cyber_case_file_denominators',
  () => require('./scripts/seed-cyber-case-file-denominators').seedCyberCaseFileDenominators());
if (cyberCaseFileDenoms) console.log(`cyber case file denominators: ${cyberCaseFileDenoms.changed} new of ${cyberCaseFileDenoms.total} rows`);


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

// Analytics deck. Same cookie gate: the page (and its data-fetching JS) is only
// served with a valid session; otherwise the login page.
app.get('/admin/analytics', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const file = adminSession.isAuthed(req) ? 'analytics.html' : 'login.html';
  res.sendFile(path.join(__dirname, 'public', file));
});

// Executive KPI page. Same cookie gate: served only with a valid session,
// otherwise the login page, so the markup and its data-fetching JS never reach
// an unauthenticated visitor.
app.get('/admin/exec', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const file = adminSession.isAuthed(req) ? 'exec.html' : 'login.html';
  res.sendFile(path.join(__dirname, 'public', file));
});

// Unified analytics: the exec KPIs, the adoption summary, and the breakdown
// deck on one page behind one fetch. Same cookie gate as every admin page.
app.get('/admin/unified', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const file = adminSession.isAuthed(req) ? 'unified.html' : 'login.html';
  res.sendFile(path.join(__dirname, 'public', file));
});

// Traffic analytics: GA4, Search Console, Clarity and Raptive dailies with
// trends, projections and keyword movement. Same cookie gate as every admin page.
app.get('/admin/traffic', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const file = adminSession.isAuthed(req) ? 'traffic.html' : 'login.html';
  res.sendFile(path.join(__dirname, 'public', file));
});

// Teacher inspector: pipeline health plus a per-teacher drill-down (classes,
// gradebook, feature adoption, roster). Same cookie gate as every admin page.
app.get('/admin/teachers', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const file = adminSession.isAuthed(req) ? 'teachers.html' : 'login.html';
  res.sendFile(path.join(__dirname, 'public', file));
});

// Gradebook. The canonical contract rendered exactly as the teacher's own route
// returns it, because it is the same builder behind both. Anonymized unless the
// operator asks for names. Same cookie gate as every other admin page.
app.get('/admin/gradebook', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const file = adminSession.isAuthed(req) ? 'gradebook.html' : 'login.html';
  res.sendFile(path.join(__dirname, 'public', file));
});

// Command center. Same cookie gate as every other admin page: without a valid
// session the login page is served, so neither the markup nor its data-fetching
// JS reaches an unauthenticated visitor. The page never embeds TODO_KEY in any
// form; its fetches ride the httpOnly cookie.
app.get('/admin/command', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const file = adminSession.isAuthed(req) ? 'command.html' : 'login.html';
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

// Public client asset: the session heartbeat reporter. Served explicitly (not via
// a blanket static mount, which would also expose the gated dashboard.html). Safe
// to load cross-origin from the storefront via a plain <script src>.
app.get('/heartbeat-reporter.js', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'heartbeat-reporter.js'));
});

// Teacher self-service password reset pages (public, no gate). Two static pages:
// /teacher/forgot collects an email and calls POST /api/teacher/forgot-password;
// /teacher/reset-password reads the emailed ?token= and calls POST
// /api/teacher/reset-password. Both are noindex. no-store keeps the token page
// out of any shared cache.
app.get('/teacher/forgot', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'public', 'teacher-forgot.html'));
});
app.get('/teacher/reset-password', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'public', 'teacher-reset.html'));
});
// Change password while signed in. Needs the teacher's own JWT, which the page
// reads from the browser; the API enforces the current-password check.
app.get('/teacher/change-password', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'public', 'teacher-change-password.html'));
});

// Keep crawlers away from the admin surface and the reset pages. The gate is the
// real protection for admin; this just avoids indexing or probing by well-behaved
// bots (the reset pages carry no data, but a tokened URL should never be indexed).
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send('User-agent: *\nDisallow: /admin\nDisallow: /api\nDisallow: /teacher/\n');
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
