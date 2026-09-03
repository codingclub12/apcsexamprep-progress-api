'use strict';
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const adminSession = require('./lib/admin-session');
const wireLog = require('./lib/wire-log');
const posthog = require('./lib/posthog');
const trafficGoogle = require('./lib/traffic-google');
const trafficShopify = require('./lib/traffic-shopify');
const trafficSchedule = require('./lib/traffic-schedule');
const trafficPull = require('./lib/traffic-pull');
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

// Product analytics. Records one api_request event per /api/* call on response
// finish. Inert unless POSTHOG_API_KEY is set, and independently switchable via
// POSTHOG_CAPTURE_REQUESTS=0 (see lib/posthog.js).
app.use(posthog.middleware);

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/student', require('./routes/student'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/game', require('./routes/game'));
app.use('/api/judge0', require('./routes/judge0'));
app.use('/api/sandbox', require('./routes/sandbox'));
// The Run button on an intro-java lesson exercise. Assembles the student's
// method against the headless Greenfoot stub and returns the recorded frames,
// so the page can animate them. Grades nothing, stores nothing, and calls the
// judge0 proxy above over loopback rather than reaching Judge0 itself.
app.use('/api/intro-java', require('./routes/intro-java'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/gate', require('./routes/gate'));
// Site assistant, Phase 0: structured problem reports. No model, no chat, no
// transcripts. Public with an optional bearer, so it sits with the other
// role-agnostic routes rather than behind teacher or student auth. Root mounted
// because it owns /api/assistant/* and the /apcs-report.js the storefront
// loads. See docs/site-assistant-spec.md.
app.use(require('./routes/assistant'));
app.use('/api/files', require('./routes/files'));
app.use('/api/slides', require('./routes/slides'));
// Command center (Phase 1). Dual auth inside each router (browser cookie OR
// Authorization: Bearer TODO_KEY); the one public route is the PII-stripped
// digest read URL, which is declared ahead of that middleware in routes/command.
app.use('/api/command', require('./routes/command'));
app.use('/api/todo', require('./routes/todo'));

// Interactive terminal labs. Mounted at the root because it owns four paths in
// two namespaces: /api/labs (specs) and /lab, /lab-player.js (delivery). The
// specs are public author content; the grade still goes through the student
// JWT on POST /api/progress/attempt like every other reporter.
app.use(require('./routes/labs'));

// Device Security Analysis practice. Mounted at the root for the same reason
// labs are: it owns paths in two namespaces, /api/frq for the specs and
// /frq plus /frq-player.js for delivery.
app.use(require('./routes/frq'));

// The practice index: what a course has to practise and where each piece lives.
// Root mounted alongside the two above because it serves /api/practice and the
// hub refresher at /practice-hub.js. It reads only the specs those two routes
// already serve, so it can never disagree with them.
app.use(require('./routes/practice'));

// Boot seeds run before app.listen, so any throw here would crash the process
// before the healthcheck can pass and take the whole service down. Each seed is
// therefore wrapped: a failure is logged loudly but never blocks boot. Seeds are
// insert-or-ignore and idempotent, so a skipped seed just leaves existing rows
// in place and can be re-run later with the script's --update flag. The API must
// always come up and serve /api/health, even with a bad seed.
//
// WHAT CHANGED 2026-09-03, AND WHY IT IS NOT A CHANGE IN BEHAVIOUR. The catch
// stays; a bad seed still never blocks boot. What was missing is that the log
// line naming the failure went to the Railway console and nowhere else, so from
// outside the container a seed that THREW looked exactly like a seed that ran
// and had nothing to do. That is not hypothetical: a deploy that added 24
// manifest rows left the live count unmoved at 908, with the deploy check green
// and no way to ask why. The outcome is now recorded and served on /api/health.
// See lib/boot-seed.js.
const bootSeed = require('./lib/boot-seed');
function runBootSeed(label, fn) {
  return bootSeed.record(label, fn);
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

// Server-owned quiz banks. A deploy CONVERGES quiz_bank onto seed/, because for
// this table the seed file is the authority and nothing else writes the rows:
// they are authored content reviewed in a pull request. That is the opposite of
// course_manifest and the CSA bank above, where the database is the authority and
// the seed is only a floor, which is why those two stay insert-or-ignore.
//
// It was insert-or-ignore here too until an approved wording fix deployed green
// and changed nothing live. Converging means editing a stem and merging is the
// whole procedure: no shell against production, no flag to remember.
//
// This cannot disturb a saved gradebook. qid is the primary key and is only ever
// matched on, so score_events keep resolving, and a grade is frozen at submission
// because routes/quiz.js persists points and max_points per sitting. Re-pricing a
// question cannot regrade one that already happened; smoke/denominator-safety.js
// pins that. A qid dropped from seed/ is retired (active = 0), never deleted.
const quizBank = runBootSeed('quiz_bank', () => require('./scripts/seed-quiz-bank').seedQuizBank());
if (quizBank) console.log(`quiz bank: ${quizBank.total} source questions, ${quizBank.inserted} new, ${quizBank.updated} refreshed, ${quizBank.retired} retired`);

// Where each activity LIVES, so a score in My Progress links back to the page it
// came from. Harvested from the authored page handles in this repo, which is the
// only source for CSA: its handles carry a title slug the lesson id does not
// hold, so nothing can be derived and a fresh database would link nothing until
// students had browsed. Insert-only, so a handle a student was actually standing
// on (learned by /track) is never replaced by one harvested from source.
const pageLinks = runBootSeed('page_links', () => require('./scripts/seed-page-links').seedPageLinks());
if (pageLinks) console.log(`page links: ${pageLinks.changed} new of ${pageLinks.total} handles`);

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

// CSP Big Idea unit test totals, counted from each test's own answer key. These
// go to course_unit_denominators because four Big Ideas name their test
// 'unit-test' with DIFFERENT question counts, which one lesson-keyed row cannot
// hold. Same insert-or-ignore posture.
const cspUnitTests = runBootSeed('csp_unit_test_denominators',
  () => require('./scripts/seed-csp-unit-test-denominators').seedCspUnitTestDenominators());
if (cspUnitTests) console.log(`csp unit test denominators: ${cspUnitTests.changed} new of ${cspUnitTests.total} rows`);

// Cyber case file denominators. Separate from the cyber seed above because all
// five case files sit at lesson 'case-file' and would collide on one
// course_denominators row, so these go to course_unit_denominators instead.
// Same insert-or-ignore posture;
// `node scripts/seed-cyber-case-file-denominators.js --update` pushes edits.
const cyberCaseFileDenoms = runBootSeed('cyber_case_file_denominators',
  () => require('./scripts/seed-cyber-case-file-denominators').seedCyberCaseFileDenominators());
if (cyberCaseFileDenoms) console.log(`cyber case file denominators: ${cyberCaseFileDenoms.changed} new of ${cyberCaseFileDenoms.total} rows`);

// Cyber per-unit exam totals. Same collision as the case files: all five exams
// sit at lesson 'exam'. Seeded late because the exams were believed unable to
// report (no fetch in any exam page body); they report through apcs-tracker.js,
// and 19 real submissions were already on the ledger by 2026-08-25 rendering as
// bare percentages. Same insert-or-ignore posture;
// `node scripts/seed-cyber-exam-denominators.js --update` pushes edits.
const cyberExamDenoms = runBootSeed('cyber_exam_denominators',
  () => require('./scripts/seed-cyber-exam-denominators').seedCyberExamDenominators());
if (cyberExamDenoms) console.log(`cyber exam denominators: ${cyberExamDenoms.changed} new of ${cyberExamDenoms.total} rows`);


// ── PUBLIC ENDPOINTS ──────────────────────────────────────────────────────────
// `commit` answers the one question this endpoint could not: WHICH BUILD is
// serving. On 2026-08-17 a figure route returned a Cloudflare-cached 500 for
// hours; /api/health answered 200 the whole time, so the 200 was read as proof
// the container was fine and the 500 as proof the deploy had never landed. Both
// readings were wrong, the deploy HAD landed, and it cost most of a day and four
// repeat diagnoses of the same stale response.
//
// A 200 here only ever meant "some container is up". It could not distinguish a
// container running the merge you just made from one running last week's, which
// is precisely what you want to know after a merge.
//
// CORRECTION, 2026-09-01: this comment used to say "Railway injects
// RAILWAY_GIT_COMMIT_SHA into every container". That was true of the only build
// path that existed when it was written, and stopped being true the moment
// railway-deploy.yml started deploying with `railway up`, which uploads a
// directory rather than building a git ref. The first real run of that workflow
// served `commit: unknown` and the workflow failed a deploy that had landed.
// Resolution now has three sources and lives in lib/build-commit.js, which
// carries the full reasoning.
const healthIntegrity = require('./lib/health-integrity');

const BUILD_COMMIT = require('./lib/build-commit').resolveBuildCommit();

// `integrity` answers a question that previously needed ADMIN_KEY: has the code
// test bank been seeded for every `code` item that has a denominator. The bank
// is deliberately NOT seeded on boot (db.js records why), so that gap is real,
// human-closed, and until now invisible without a credential. It cost four days
// on the intro-java pilot: ten denominators live, ten items unable to grade,
// and no way to see it from outside.
//
// Counts of author content only, so this stays public without touching the
// zero-PII posture. It is cached and can never throw; if it could not be
// measured the key is simply absent, which reads as "unknown" rather than
// pretending everything is fine. See lib/health-integrity.js.
app.get('/api/health', (req, res) => {
  const body = { status: 'ok', ts: new Date().toISOString(), commit: BUILD_COMMIT };
  const integrity = healthIntegrity.codeSeedIntegrity();
  if (integrity) body.integrity = integrity;
  // The reporter gap, for the same reason and on the same terms: graded work
  // students finish that never reports a score. That failure is silent by
  // construction (the page marks it done and sends no number) and it cost a week
  // of AP Cyber Ex2, Lab and Quiz grades before a teacher reported it. Activities
  // and counts only, no student or class, so the zero-PII posture holds.
  const reporters = healthIntegrity.reporterIntegrity();
  if (reporters) body.reporters = reporters;
  // What every boot seed did on this container: ran, wrote how many rows, or
  // threw and what it said. Author-content counts only, same terms as the two
  // blocks above. A seed that fails is silent by construction otherwise, and a
  // silent seed reads exactly like a seed with nothing to do. See
  // lib/boot-seed.js for the deploy that paid for this.
  body.seed = bootSeed.snapshot();
  // Whether a site-assistant escalation can actually reach a person. Same class
  // of problem as the three blocks above: a report with no recipient configured
  // is stored and filed and then silently never mailed. Booleans only, no
  // addresses. See lib/assistant/report.js notifyStatus.
  try { body.assistant = require('./lib/assistant/report').notifyStatus(); } catch (e) { /* never fail health */ }
  res.json(body);
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

// Denominators panel. The authored "out of" per graded column, and the only way
// to change one without putting ADMIN_KEY on a command line. Same cookie gate as
// every other admin page for the PAGE; the adopt call the page makes still needs
// the x-admin-key header, because requireAdmin honours the cookie for safe
// methods only. This route serves markup, never a credential.
app.get('/admin/denominators', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const file = adminSession.isAuthed(req) ? 'denominators.html' : 'login.html';
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

// ── CODE SANDBOX ────────────────────────────────────────────────────────────
// Free-practice editor for AP CSA (multi class Java) and AP CSP (Python and
// JavaScript for the Create Task). Public by design: a student can write and RUN
// code with no account, and only needs to sign in to SAVE. Gating the page
// itself would put a login in front of the thing that demonstrates the product.
//
// Rendered rather than served from public/, matching the other generated pages
// in lib/: the limits are baked into the markup from the same config object the
// API returns, so the editor cannot enforce a different ceiling than the server.
//
// No-store because the config travels inside the HTML. A cached copy would keep
// serving yesterday's limits after they changed.
const sandboxPage = require('./lib/sandbox-page');
const sandboxRoute = require('./routes/sandbox');
app.get('/sandbox', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.type('html').send(sandboxPage.render(sandboxRoute.config()));
});

// Public client asset: the session heartbeat reporter. Served explicitly (not via
// a blanket static mount, which would also expose the gated dashboard.html). Safe
// to load cross-origin from the storefront via a plain <script src>.
app.get('/heartbeat-reporter.js', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'heartbeat-reporter.js'));
});

// Course figures: the generated diagrams for intro-java, drawn by
// scripts/intro-java-figures.js and committed under public/figures.
//
// WHY THE API SERVES THESE AT ALL, WHEN THE PAGES LOAD THEM FROM SHOPIFY'S CDN
// The lesson pages reference /cdn/shop/files/<name>.png, so this route is not
// what a student hits. It exists so Shopify can PULL each figure by URL when it
// is added to Files (fileCreate takes an originalSource URL), which beats
// uploading fifteen binaries by hand and makes a re-render a repeatable step
// rather than an afternoon.
//
// Explicit and name-validated, matching the rest of this file: a blanket static
// mount here would also expose the gated dashboard markup one directory up. The
// pattern is the exact shape the renderer emits, so nothing else is reachable
// and no traversal is expressible.
const FIGURE_NAME = /^intro-java-\d+\.\d+-step-\d+\.png$/;
app.get('/figures/:name', (req, res) => {
  if (!FIGURE_NAME.test(req.params.name)) {
    return res.set('Cache-Control', 'no-store').status(404).end();
  }
  res.type('image/png');
  // A well formed name for a figure this build does not have is a 404, not a
  // 500. Without the callback, sendFile hands the ENOENT to the error handler
  // and the response says the server broke, when what actually happened is that
  // somebody asked for a file that is not here yet. That is exactly the state a
  // half-deployed container is in, and it is worth being able to tell the two
  // apart from the outside.
  // The long cache lives in sendFile's options, so it is attached ONLY to a
  // response that actually carries a file.
  //
  // It used to be set on the way in, before anything was known about the
  // outcome, which meant every error inherited "cache me publicly for a day".
  // A container that briefly 500'd on a figure it did not have yet got that 500
  // pinned in Cloudflare for 24 hours, and the endpoint went on reporting a
  // failure long after the deploy that fixed it. I read that stale 500 four
  // separate times and concluded the deploy had never landed. It had.
  //
  // An error must never be cacheable: it is a statement about one moment, and
  // the whole point of checking an endpoint is to learn the current one.
  const opts = { headers: { 'Cache-Control': 'public, max-age=86400' } };
  res.sendFile(path.join(__dirname, 'public', 'figures', req.params.name), opts, (err) => {
    if (err && !res.headersSent) {
      res.set('Cache-Control', 'no-store');
      res.status(err.code === 'ENOENT' ? 404 : 500).end();
    }
  });
});

// PostHog browser init, with the public project key substituted in from the
// environment. Not sendFile: public/posthog-init.js is a template and must never
// reach a browser with its placeholders intact. Serves an inert stub when no key
// is configured, so every page can carry the script tag unconditionally.
app.get('/posthog-init.js', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.type('application/javascript');
  res.send(posthog.browserSnippet());
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
const server = app.listen(PORT, () => {
  console.log(`APCSExamPrep Progress API running on port ${PORT}`);
  console.log(`DB: ${process.env.DB_PATH || './progress.db'}`);
  if (posthog.isEnabled()) console.log('PostHog: enabled');
  startTrafficSchedule();
});

// ── SCHEDULED TRAFFIC PULLS ───────────────────────────────────────────────────
//  Four times a day, in this process, so no external caller has to hold the
//  admin key. Silent unless a source is actually configured: a box with no
//  Google or Shopify credentials should not log a failed pull every six hours,
//  because a log that cries wolf is one nobody reads.
//
//  TRAFFIC_PULL_SCHEDULE=off disables it without a redeploy of anything else.
let trafficScheduler = null;
function startTrafficSchedule() {
  if (String(process.env.TRAFFIC_PULL_SCHEDULE || '').toLowerCase() === 'off') {
    console.log('[traffic-schedule] disabled by TRAFFIC_PULL_SCHEDULE=off');
    return;
  }
  const google = trafficGoogle.status();
  const shopify = trafficShopify.status();
  if (!google.ready && !shopify.ready) {
    console.log('[traffic-schedule] no source configured; not scheduling');
    return;
  }
  trafficScheduler = trafficSchedule.createScheduler({
    runPull: (range) => trafficPull.runPull(range),
  });
  trafficScheduler.start();
}
module.exports.trafficSchedulerStatus = () => (trafficScheduler ? trafficScheduler.status() : { scheduled: false });

// Railway sends SIGTERM on every redeploy. Without an explicit flush the events
// buffered since the last interval die with the process, which reads in PostHog
// as a traffic dip at exactly the moments a deploy is worth watching. Bounded by
// a timer so a hung flush can never stop the container from exiting.
let shuttingDown = false;
function gracefulExit(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  const hardStop = setTimeout(() => process.exit(0), 4000);
  hardStop.unref();
  posthog.shutdown().finally(() => {
    server.close(() => process.exit(0));
  });
}
process.once('SIGTERM', () => gracefulExit('SIGTERM'));
process.once('SIGINT', () => gracefulExit('SIGINT'));

module.exports = app;
