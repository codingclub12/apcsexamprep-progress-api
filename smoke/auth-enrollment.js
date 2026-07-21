'use strict';
/*
 * Auth + Enrollment smoke test  (progress-api)
 * =============================================
 * Drives a REAL browser through the REAL student auth + enrollment flow on the
 * live site, so a silent login failure (the "Marc Hess / Marti" bug: form
 * submit, nothing happens, no error) is caught by a machine on every deploy
 * instead of by a teacher in September.
 *
 * Run:   npm run smoke:auth        (from the repo root, after `npm run smoke:install`)
 * Exits non-zero if any hard assertion fails, so it can gate CI / a deploy.
 *
 * -----------------------------------------------------------------------------
 * WHAT WAS VERIFIED vs ASSUMED (read this before trusting a green run)
 * -----------------------------------------------------------------------------
 * Egress to www.apcsexamprep.com was blocked by org policy in the environment
 * where this file was authored, so the live DOM could not be scraped directly.
 * Every selector below was instead read from the CANONICAL page source that
 * ships to Shopify from this same repo:
 *   - shopify/join.html         -> /pages/join   (the register/login page)
 *   - shopify/my-progress.html  -> /pages/my-progress (post-login dashboard)
 *   - routes/student.js         -> the auth/enrollment API contract
 *
 * VERIFIED from those sources (canonical, but confirm once against the live DOM
 * on first run, since Shopify Body HTML can drift from the repo copy):
 *   - Token key in localStorage is `apcse_token` (+ `apcse_student` JSON blob).
 *   - /pages/join is a TWO-STEP class join, not a single form:
 *       step 1  #joinCode  -> "Continue" (APJoin.verifyCode)
 *       step 2  #joinName + 4 PIN boxes #p1..#p4 -> "Join Class" (APJoin.completeJoin)
 *     A "Return Student" tab exposes the login form: #loginCode + #loginName +
 *     #lp1..#lp4 -> "Sign In" (APJoin.doLogin).
 *   - The CURRENT live login model for a class account is
 *       class_code + display_name + PIN
 *     NOT student_code + PIN. Login-by-code is the SOLO (ME-XXXX) flow
 *     (/api/student/solo-login) and/or the planned identity refactor noted in
 *     the handoff. When that refactor lands, only steps D13/D14 change; the
 *     silent-failure guards (A6, D15, E16) stay identical - they are the
 *     durable value here.
 *   - The post-login dashboard is /pages/my-progress. The logged-in-only
 *     selector is #aprog-main (shown only with a valid token); #aprog-not-logged
 *     is the guest state. (/pages/cyber-class is the TEACHER portal, not this.)
 *   - A class join does NOT surface a separate "student_code" on screen; it
 *     surfaces the PIN and a success panel. The durable per-student identifier
 *     the API keys on is the student `id` saved in localStorage.apcse_student,
 *     which is what we emit for cleanup.
 *
 * ASSUMED / must be supplied by the operator:
 *   - SMOKE_TEST_CLASS_CODE: a DISPOSABLE test class owned by Tanner, reserved
 *     for smoke tests. NEVER point this at an external teacher's real class
 *     (e.g. Brockman's CYBER-TEEY) - it pollutes their roster and analytics.
 *
 * -----------------------------------------------------------------------------
 * TEST-ACCOUNT HYGIENE (this writes REAL rows to PRODUCTION)
 * -----------------------------------------------------------------------------
 *   - Every test student is named `ZZ-SMOKE <timestamp>` so it is trivially
 *     filterable/deletable (prior art: ZZ-AUDIT-DELETE).
 *   - There is no student hard-delete API (CLAUDE.md: deactivate only, never
 *     hard-delete), so this cannot self-clean via API. Instead it ALWAYS writes
 *     created-artifacts.json (pass or fail) and prints the created ids to
 *     stdout, so cleanup is a one-liner. Do NOT let these silently accumulate -
 *     that is the ME-3A2J lesson.
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// ── Config (all overridable by env) ───────────────────────────────────────────
const CFG = {
  siteBase:   (process.env.SMOKE_SITE_BASE  || 'https://www.apcsexamprep.com').replace(/\/$/, ''),
  // Only used for the direct-API roster-count check (B9). The handoff documents
  // the API at progress.apcsexamprep.com; the repo pages call the Railway URL
  // behind it. Either resolves the same app.
  apiBase:    (process.env.SMOKE_API_BASE   || 'https://progress.apcsexamprep.com').replace(/\/$/, ''),
  // One or more reserved disposable test classes (comma-separated). The full
  // A-E suite runs against each, so e.g. `CYBER-Q9JG,CSA-CQ3G` covers both the
  // Cyber and the CSA join/enroll paths in one invocation.
  classCodes: (process.env.SMOKE_TEST_CLASS_CODE || '')
    .split(',').map((s) => s.toUpperCase().trim()).filter(Boolean),
  pin:        (process.env.SMOKE_PIN || '').trim(),          // 4 digits; generated if unset
  headless:   process.env.SMOKE_HEADLESS !== '0',
  // Two distinct timeouts, deliberately:
  //  - navTimeout is the silent-failure guard window: after a SUBMIT, how long
  //    we allow for navigation-or-visible-error. It stays tight and
  //    user-realistic, because a 30s "did anything happen?" is itself a bug.
  //  - loadTimeout covers infra latency that is NOT a product signal: a cold
  //    Shopify page load and the cold-start Railway API fetch behind the
  //    class-code step. Generous, so slow infra does not masquerade as a
  //    silent-submit failure.
  navTimeout:  Number(process.env.SMOKE_NAV_TIMEOUT_MS || 8000),
  loadTimeout: Number(process.env.SMOKE_LOAD_TIMEOUT_MS || 25000),
  doGradeable: process.env.SMOKE_DO_GRADEABLE === '1',        // optional block C, off by default
  lessonUrl:  process.env.SMOKE_LESSON_URL || '',            // required only if doGradeable
  artifactsDir: process.env.SMOKE_ARTIFACTS_DIR || path.join(process.cwd(), 'artifacts'),
  // Optional: point at a pre-provisioned Chromium (a container/CI image that
  // ships a browser rather than letting Playwright download a version-matched
  // one). Leave unset on a normal machine so Playwright resolves its own.
  chromiumPath: process.env.SMOKE_CHROMIUM_PATH || '',
};

// A stable, filesystem-safe run id (no colons). Used in the sentinel name too.
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const DISPLAY_NAME = `ZZ-SMOKE ${RUN_ID}`;
if (!CFG.pin) CFG.pin = String((Number(Date.now()) % 9000) + 1000); // 4 digits, 1000-9999

// ── Result tracking ───────────────────────────────────────────────────────────
const results = [];   // { cls, block, name, pass, detail }
const created = [];   // { student_id, display_name, class_code, pin, run_id, created_at }
let hardFailures = 0;
let CURRENT_CLASS = '';   // set per class in the main loop; tags every record

function record(block, name, pass, detail) {
  results.push({ cls: CURRENT_CLASS, block, name, pass: !!pass, detail: detail || '' });
  if (!pass) hardFailures++;
  const tag = pass ? 'PASS' : 'FAIL';
  console.log(`  [${tag}] ${CURRENT_CLASS} ${block} - ${name}${detail ? ' :: ' + detail : ''}`);
}

// ── Bounded console + network capture (paranoid about the 40k-errors flood) ───
const CAP = 1000;
const consoleLog = [];
const networkLog = [];
function pushCapped(arr, entry) { arr.push(entry); if (arr.length > CAP) arr.shift(); }

function attachListeners(page) {
  page.on('console', (msg) => {
    pushCapped(consoleLog, { t: Date.now(), type: msg.type(), text: msg.text().slice(0, 500) });
  });
  page.on('pageerror', (err) => {
    pushCapped(consoleLog, { t: Date.now(), type: 'pageerror', text: String(err && err.message).slice(0, 500) });
  });
  page.on('requestfailed', (req) => {
    pushCapped(networkLog, { t: Date.now(), kind: 'requestfailed', method: req.method(), url: req.url(), err: (req.failure() && req.failure().errorText) || '' });
  });
  page.on('response', (res) => {
    if (res.status() >= 400) pushCapped(networkLog, { t: Date.now(), kind: 'httperror', status: res.status(), method: res.request().method(), url: res.url() });
  });
}

async function dumpArtifacts(page, label) {
  try {
    const dir = path.join(CFG.artifactsDir, `${label}-${RUN_ID}`);
    fs.mkdirSync(dir, { recursive: true });
    if (page && !page.isClosed()) {
      await page.screenshot({ path: path.join(dir, 'screenshot.png'), fullPage: true }).catch(() => {});
      const html = await page.content().catch(() => '');
      if (html) fs.writeFileSync(path.join(dir, 'page.html'), html);
    }
    fs.writeFileSync(path.join(dir, 'console.json'), JSON.stringify(consoleLog, null, 2));
    fs.writeFileSync(path.join(dir, 'network.json'), JSON.stringify(networkLog, null, 2));
    console.log(`  ! artifacts saved to ${dir}`);
  } catch (e) {
    console.log(`  ! could not save artifacts: ${e.message}`);
  }
}

// ── Small helpers ─────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fillPin(page, ids, pin) {
  for (let i = 0; i < ids.length; i++) {
    await page.fill(`#${ids[i]}`, pin[i]);
  }
}

async function getToken(page) {
  return page.evaluate(() => window.localStorage.getItem('apcse_token'));
}

async function getSession(page) {
  return page.evaluate(() => {
    try { return JSON.parse(window.localStorage.getItem('apcse_student')); } catch { return null; }
  });
}

// An error is considered "shown" only when it is BOTH visible and has text.
// If the live CSS ever hides a populated error (e.g. a `display:none!important`
// rule beating an inline style), this returns false - and that is exactly the
// no-visible-feedback failure this whole test exists to catch, so we WANT it to
// fail loudly rather than paper over it.
async function errorShown(page, selector) {
  const el = page.locator(selector);
  try {
    const visible = await el.isVisible();
    const text = (await el.textContent().catch(() => '')) || '';
    return visible && text.trim().length > 0;
  } catch { return false; }
}

/*
 * THE SILENT-FAILURE GUARD (the crown jewel).
 * After a submit, exactly one of three things must happen within navTimeout:
 *   - the success/next-state locator appears  -> resolves 'success'
 *   - a visible error appears                 -> resolves 'error'
 *   - neither                                 -> resolves 'silent'  (the bug)
 * Returns which one won.
 */
async function waitNavOrError(page, { successLocator, errorSelector, timeoutMs }) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (successLocator && (await successLocator.isVisible().catch(() => false))) return 'success';
    if (errorSelector && (await errorShown(page, errorSelector))) return 'error';
    await sleep(150);
  }
  return 'silent';
}

// ── Direct-API helper: current roster size for a class (public endpoint) ──────
async function rosterCount(page, code) {
  try {
    const r = await page.request.get(`${CFG.apiBase}/api/class/${encodeURIComponent(code)}/exists`);
    if (!r.ok()) return null;
    const d = await r.json();
    return typeof d.student_count === 'number' ? d.student_count : null;
  } catch { return null; }
}

// =============================================================================
// BLOCKS
// =============================================================================

// A. Register (join) a new student + silent-failure guard.
async function blockA_register(page, ctx) {
  const B = 'A/register';
  await page.goto(`${CFG.siteBase}/pages/join`, { waitUntil: 'domcontentloaded' });

  // Snapshot roster size before we create anyone (for B9's "no duplicate" check).
  ctx.rosterBefore = await rosterCount(page, ctx.classCode);

  // Step 1: class code -> Continue.
  await page.waitForSelector('#joinCode', { timeout: CFG.loadTimeout });
  await page.fill('#joinCode', ctx.classCode);
  await page.click('#step-join-code button.apjoin-btn');

  // The page previews the class then advances after ~500ms; wait for step 2.
  await page.waitForSelector('#step-join-details.active #joinName, #step-join-details #joinName', { timeout: CFG.loadTimeout })
    .catch(() => {});
  const onDetails = await page.locator('#joinName').isVisible().catch(() => false);
  record(B, 'class code accepted -> reached name/PIN step', onDetails,
    onDetails ? '' : 'never advanced past class-code step (bad code? or verifyCode silently failed)');
  if (!onDetails) throw new Error('did not reach join-details step');

  // Step 2: name + PIN -> Join.
  await page.fill('#joinName', DISPLAY_NAME);
  await fillPin(page, ['p1', 'p2', 'p3', 'p4'], CFG.pin);
  await page.click('#step-join-details button.apjoin-btn');

  // A6: the silent-failure guard.
  const outcome = await waitNavOrError(page, {
    successLocator: page.locator('#step-success'),
    errorSelector: '#joinDetailsError',
    timeoutMs: CFG.navTimeout,
  });
  record(B, 'silent-submit guard on register', outcome !== 'silent',
    outcome === 'silent' ? 'silent submit: no navigation and no error state' : `reached '${outcome}' state`);
  record(B, 'register succeeded (success panel shown)', outcome === 'success',
    outcome === 'success' ? '' : `expected success, got '${outcome}'`);

  // A5: token present in localStorage under the confirmed key.
  const token = await getToken(page);
  record(B, 'auth token present in localStorage[apcse_token]', !!token,
    token ? '' : 'no token written after register');

  // A4 (adapted): capture the durable student identity for cleanup.
  const sess = await getSession(page);
  if (sess && sess.id) {
    created.push({
      student_id: sess.id, display_name: DISPLAY_NAME, class_code: ctx.classCode,
      pin: CFG.pin, run_id: RUN_ID, created_at: new Date().toISOString(),
    });
  }
  record(B, 'student identity captured for cleanup', !!(sess && sess.id),
    sess && sess.id ? `student_id=${sess.id}` : 'no apcse_student.id to record');

  ctx.token = token;
  ctx.session = sess;
}

// B. Confirm enrollment renders on the dashboard + no duplicate created.
async function blockB_enroll(page, ctx) {
  const B = 'B/enroll';
  await page.goto(`${CFG.siteBase}/pages/my-progress`, { waitUntil: 'domcontentloaded' });

  const mainVisible = await page.locator('#aprog-main').isVisible({ timeout: CFG.loadTimeout }).catch(() => false);
  const guestVisible = await page.locator('#aprog-not-logged').isVisible().catch(() => false);
  record(B, 'dashboard shows logged-in state (#aprog-main)', mainVisible && !guestVisible,
    mainVisible ? (guestVisible ? 'both main and guest visible' : '') : 'logged-in dashboard did not render');

  const name = (await page.locator('#aprog-name').textContent().catch(() => '')) || '';
  record(B, 'dashboard shows our student name', name.trim() === DISPLAY_NAME,
    name.trim() === DISPLAY_NAME ? '' : `expected "${DISPLAY_NAME}", got "${name.trim()}"`);

  // B9: exactly one student created for this identity (guards the duplicate /
  // class-scoped-identity bug). Uses the public roster count before/after.
  const after = await rosterCount(page, ctx.classCode);
  if (ctx.rosterBefore == null || after == null) {
    record(B, 'no duplicate student created (roster delta == 1)', true,
      'roster count unavailable via API; skipped (not a hard fail)');
  } else {
    record(B, 'no duplicate student created (roster delta == 1)', after - ctx.rosterBefore === 1,
      `before=${ctx.rosterBefore} after=${after} delta=${after - ctx.rosterBefore}`);
  }
}

// C. (Optional) one gradeable action, then confirm it reflects on my-progress.
async function blockC_gradeable(page) {
  const B = 'C/gradeable';
  if (!CFG.doGradeable) {
    record(B, 'gradeable action', true, 'skipped (SMOKE_DO_GRADEABLE!=1)');
    return;
  }
  if (!CFG.lessonUrl) {
    record(B, 'gradeable action', false, 'SMOKE_DO_GRADEABLE=1 but SMOKE_LESSON_URL is unset');
    return;
  }
  // Intentionally minimal + brittle-by-nature; this is not the durable value.
  // Navigate to a lesson, grade one CFU/quiz item, then re-open my-progress and
  // assert *some* graded score is now present. Selectors here depend on the
  // fixed check-answer handlers and must be confirmed against the live lesson.
  await page.goto(CFG.lessonUrl, { waitUntil: 'domcontentloaded' });
  const graded = await page.evaluate(async () => {
    // Placeholder: the real hook is the page's check-answer button. Left as a
    // no-op guarded assertion so the block is explicit rather than silently
    // "passing". Wire to the real handler once the lesson selectors are pinned.
    return false;
  });
  record(B, 'completed one gradeable item', graded, graded ? '' : 'gradeable hook not wired to live lesson selectors yet');
}

// D. Logout + login round-trip (the core regression) + silent-failure guard.
async function blockD_roundtrip(page, ctx) {
  const B = 'D/roundtrip';

  // D12: log out, assert token cleared. The join page shows an already-logged
  // panel with a Sign Out control that calls APJoin.logout().
  await page.goto(`${CFG.siteBase}/pages/join`, { waitUntil: 'domcontentloaded' });
  const loggedPanel = await page.locator('#alreadyLogged').isVisible({ timeout: CFG.loadTimeout }).catch(() => false);
  if (loggedPanel) {
    await page.click('#alreadyLogged .l-out-btn').catch(() => {});
    await page.waitForLoadState('domcontentloaded').catch(() => {}); // logout() reloads
  } else {
    // Fallback: clear directly so the round-trip can still be exercised.
    await page.evaluate(() => { localStorage.removeItem('apcse_token'); localStorage.removeItem('apcse_student'); });
    await page.reload({ waitUntil: 'domcontentloaded' });
  }
  const tokenAfterLogout = await getToken(page);
  record(B, 'logout cleared token', !tokenAfterLogout, tokenAfterLogout ? 'token still present after logout' : '');

  // D13: log back in. CURRENT live model is class_code + display_name + PIN.
  // (Post-refactor this becomes student_code + PIN; swap the two fills below.)
  await page.waitForSelector('.apjoin-tab', { timeout: CFG.loadTimeout });
  await page.locator('.apjoin-tab', { hasText: 'Return Student' }).click();
  await page.waitForSelector('#step-login #loginCode, #loginCode', { timeout: CFG.loadTimeout });
  await page.fill('#loginCode', ctx.classCode);
  await page.fill('#loginName', DISPLAY_NAME);
  await fillPin(page, ['lp1', 'lp2', 'lp3', 'lp4'], CFG.pin);
  await page.click('#step-login button.apjoin-btn');

  // D15: silent-failure guard on the login submit (identical durable check).
  const outcome = await waitNavOrError(page, {
    successLocator: page.locator('#step-success'),
    errorSelector: '#loginError',
    timeoutMs: CFG.navTimeout,
  });
  record(B, 'silent-submit guard on login', outcome !== 'silent',
    outcome === 'silent' ? 'silent submit: no navigation and no error state' : `reached '${outcome}' state`);
  record(B, 'login succeeded', outcome === 'success', outcome === 'success' ? '' : `expected success, got '${outcome}'`);

  const token = await getToken(page);
  record(B, 'auth token present after login', !!token, token ? '' : 'no token after login');

  // D14: same dashboard renders, enrollment persists.
  await page.goto(`${CFG.siteBase}/pages/my-progress`, { waitUntil: 'domcontentloaded' });
  const mainVisible = await page.locator('#aprog-main').isVisible({ timeout: CFG.loadTimeout }).catch(() => false);
  record(B, 'dashboard renders again after login (enrollment persists)', mainVisible,
    mainVisible ? '' : 'dashboard did not render after re-login');
}

// E. Negative cases - these catch the bugs that matter.
async function blockE_negatives(page, ctx) {
  const B = 'E/negatives';

  // Ensure a clean, logged-out page.
  await page.goto(`${CFG.siteBase}/pages/join`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.removeItem('apcse_token'); localStorage.removeItem('apcse_student'); });
  await page.reload({ waitUntil: 'domcontentloaded' });

  // E16: wrong PIN -> a VISIBLE error, not a silent nothing.
  await page.locator('.apjoin-tab', { hasText: 'Return Student' }).click();
  await page.waitForSelector('#loginCode', { timeout: CFG.loadTimeout });
  await page.fill('#loginCode', ctx.classCode);
  await page.fill('#loginName', DISPLAY_NAME);
  await fillPin(page, ['lp1', 'lp2', 'lp3', 'lp4'], '0000' === CFG.pin ? '1111' : '0000'); // deliberately wrong
  await page.click('#step-login button.apjoin-btn');
  const wrongPinOutcome = await waitNavOrError(page, {
    successLocator: page.locator('#step-success'),
    errorSelector: '#loginError',
    timeoutMs: CFG.navTimeout,
  });
  record(B, 'wrong PIN shows a visible error (not silent, not success)', wrongPinOutcome === 'error',
    `got '${wrongPinOutcome}'`);

  // E17: invalid/nonexistent class code -> a friendly visible error.
  await page.goto(`${CFG.siteBase}/pages/join`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#joinCode', { timeout: CFG.loadTimeout });
  await page.fill('#joinCode', 'ZZ-NOPE-9999');
  await page.click('#step-join-code button.apjoin-btn');
  // verifyCode shows #joinCodeError on a bad code (and must NOT advance to step 2).
  const badCodeErr = await waitNavOrError(page, {
    successLocator: page.locator('#step-join-details #joinName'),
    errorSelector: '#joinCodeError',
    timeoutMs: CFG.navTimeout,
  });
  record(B, 'invalid class code shows a visible error', badCodeErr === 'error', `got '${badCodeErr}'`);

  // E18: already-enrolled (duplicate name in same class) -> graceful message,
  // not a crash or a duplicate row. Re-join with the SAME sentinel name.
  await page.goto(`${CFG.siteBase}/pages/join`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#joinCode', { timeout: CFG.loadTimeout });
  await page.fill('#joinCode', ctx.classCode);
  await page.click('#step-join-code button.apjoin-btn');
  const reached = await page.waitForSelector('#joinName', { timeout: CFG.loadTimeout }).then(() => true).catch(() => false);
  if (!reached) {
    record(B, 'already-enrolled handled gracefully', false, 'could not reach name step to re-join');
    return;
  }
  await page.fill('#joinName', DISPLAY_NAME);
  await fillPin(page, ['p1', 'p2', 'p3', 'p4'], CFG.pin);
  await page.click('#step-join-details button.apjoin-btn');
  const dupOutcome = await waitNavOrError(page, {
    successLocator: page.locator('#step-success'),
    errorSelector: '#joinDetailsError',
    timeoutMs: CFG.navTimeout,
  });
  // Graceful == a visible "name already taken" error. NOT a silent nothing, and
  // NOT a second success (which would mean a duplicate row was created).
  record(B, 'duplicate join shows graceful error (no crash, no dupe)', dupOutcome === 'error',
    `got '${dupOutcome}'`);
}

// =============================================================================
// MAIN
// =============================================================================
async function main() {
  console.log('APCSExamPrep auth + enrollment smoke test');
  console.log(`  site:    ${CFG.siteBase}`);
  console.log(`  api:     ${CFG.apiBase}`);
  console.log(`  classes: ${CFG.classCodes.join(', ') || '(unset!)'}`);
  console.log(`  name:    ${DISPLAY_NAME}`);
  console.log(`  pin:     ${CFG.pin}`);
  console.log('');

  if (CFG.classCodes.length === 0) {
    console.error('FATAL: SMOKE_TEST_CLASS_CODE is required (a disposable test class owned by Tanner).');
    console.error('       Refusing to guess a class code - never enroll into an external teacher\'s real class.');
    console.error('       Pass one or more, comma-separated, e.g. SMOKE_TEST_CLASS_CODE=CYBER-Q9JG,CSA-CQ3G');
    writeCreatedArtifacts();
    process.exit(2);
  }

  const launchOpts = { headless: CFG.headless };
  if (CFG.chromiumPath) launchOpts.executablePath = CFG.chromiumPath;
  const browser = await chromium.launch(launchOpts);

  // Warm the API before the first real interaction. Railway can cold-start, and
  // the very first class-code step waits on an API fetch; without this the first
  // class flakes on infra latency, not a product bug. Best-effort, non-fatal.
  try {
    const warm = await fetch(`${CFG.apiBase}/api/health`).then((r) => r.ok).catch(() => false);
    console.log(`  warmup ${CFG.apiBase}/api/health: ${warm ? 'ok' : 'no response (continuing)'}`);
  } catch { /* ignore */ }

  const blocks = [
    ['A', blockA_register],
    ['B', blockB_enroll],
    ['C', blockC_gradeable],
    ['D', blockD_roundtrip],
    ['E', blockE_negatives],
  ];

  // Full A-E suite per class, each in its own isolated browser context so
  // localStorage never leaks between classes. Console/network capture is reset
  // per class so a failure dump is scoped to the class that failed.
  for (const classCode of CFG.classCodes) {
    CURRENT_CLASS = classCode;
    consoleLog.length = 0;
    networkLog.length = 0;
    console.log(`\n################ CLASS ${classCode} ################`);

    const context = await browser.newContext({ ignoreHTTPSErrors: false });
    const page = await context.newPage();
    // Default all implicit waits/navigation to the generous infra timeout; the
    // silent-failure guard uses its own tight window explicitly.
    page.setDefaultTimeout(CFG.loadTimeout);
    page.setDefaultNavigationTimeout(CFG.loadTimeout);
    attachListeners(page);
    const ctx = { classCode };

    for (const [letter, fn] of blocks) {
      console.log(`\n== ${classCode} Block ${letter} ==`);
      try {
        await fn(page, ctx);
      } catch (e) {
        record(`${letter}`, 'block crashed', false, e.message);
        await dumpArtifacts(page, `${classCode}-block-${letter}`);
      }
    }

    await context.close().catch(() => {});
    // Gentle pause between classes - the API has light rate limiting and this
    // suite is deliberately not a hammer.
    await sleep(1000);
  }

  await browser.close().catch(() => {});

  // Output contract.
  writeCreatedArtifacts();
  printSummary();

  process.exit(hardFailures > 0 ? 1 : 0);
}

function writeCreatedArtifacts() {
  try {
    fs.mkdirSync(CFG.artifactsDir, { recursive: true });
  } catch { /* ignore */ }
  const out = { run_id: RUN_ID, site: CFG.siteBase, class_codes: CFG.classCodes, created };
  const p = path.join(process.cwd(), 'created-artifacts.json');
  fs.writeFileSync(p, JSON.stringify(out, null, 2));
  console.log(`\ncreated-artifacts.json written (${created.length} student(s)) -> ${p}`);
  if (created.length) {
    console.log('CLEANUP: the following test students were created in PRODUCTION:');
    for (const c of created) console.log(`  - ${c.display_name}  student_id=${c.student_id}  class=${c.class_code}`);
  }
}

function printSummary() {
  console.log('\n===== SMOKE SUMMARY =====');
  // class -> block -> {pass, fail}
  const byClass = {};
  for (const r of results) {
    const cls = r.cls || '(none)';
    const block = r.block.split('/')[0];
    byClass[cls] = byClass[cls] || {};
    byClass[cls][block] = byClass[cls][block] || { pass: 0, fail: 0 };
    if (r.pass) byClass[cls][block].pass++; else byClass[cls][block].fail++;
  }
  for (const [cls, blocks] of Object.entries(byClass)) {
    const clsFail = Object.values(blocks).some((s) => s.fail > 0);
    console.log(`  ${cls}: ${clsFail ? 'FAIL' : 'PASS'}`);
    for (const [block, s] of Object.entries(blocks)) {
      const verdict = s.fail === 0 ? 'PASS' : 'FAIL';
      console.log(`      Block ${block}: ${verdict}  (${s.pass} pass, ${s.fail} fail)`);
    }
  }
  console.log(`\nOVERALL: ${hardFailures === 0 ? 'PASS' : 'FAIL'}  (${hardFailures} assertion failure(s) across ${CFG.classCodes.length} class(es))`);
}

main().catch((e) => {
  console.error('Fatal error running smoke test:', e);
  try { writeCreatedArtifacts(); } catch { /* ignore */ }
  process.exit(1);
});
