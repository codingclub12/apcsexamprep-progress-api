'use strict';
/*
 * Teacher dashboard smoke test  (progress-api)
 * ============================================
 * The teacher class dashboard at /pages/cyber-dashboard?code=<CLASS> is how a
 * teacher actually checks on a course. It is a DIFFERENT surface from the
 * student /pages/my-progress page:
 *   - Auth is a TEACHER token (localStorage `apcse_teacher_token`), obtained by
 *     email + password at /pages/cyber-class (POST /api/teacher/login).
 *   - The dashboard reads ?code=<CLASS> and renders #tcdash-main / #dash-code /
 *     the stat tiles / the student table, backed by
 *     GET /api/teacher/classes/:code/progress.
 *
 * This test:
 *   1. Logs the teacher in through the real UI and applies the SAME silent-
 *      failure guard as the student flow (submit must reach dashboard-or-visible-
 *      error within N seconds, never a silent nothing).
 *   2. For each class, confirms the dashboard PAGE renders (the thing the teacher
 *      looks at) AND verifies the class data via the teacher API - the API check
 *      is the robust backbone, so a drift in the dashboard markup cannot make the
 *      test silently "pass" or produce a false failure about the data.
 *
 * It is READ-ONLY: it creates no students and writes no rows, so it is gentle on
 * the API rate limits.
 *
 * Credentials come from env only (SMOKE_TEACHER_EMAIL / SMOKE_TEACHER_PASSWORD),
 * never hardcoded. In CI they are repo Actions secrets. The password is never
 * printed.
 *
 * Run:  SMOKE_TEACHER_EMAIL=... SMOKE_TEACHER_PASSWORD=... \
 *       SMOKE_TEST_CLASS_CODE=CYBER-Q9JG,CSA-CQ3G,CSP-CHSH npm run smoke:teacher
 */

const { chromium } = require('playwright');

const CFG = {
  siteBase:   (process.env.SMOKE_SITE_BASE  || 'https://www.apcsexamprep.com').replace(/\/$/, ''),
  apiBase:    (process.env.SMOKE_API_BASE   || 'https://progress.apcsexamprep.com').replace(/\/$/, ''),
  classCodes: (process.env.SMOKE_TEST_CLASS_CODE || '')
    .split(',').map((s) => s.toUpperCase().trim()).filter(Boolean),
  email:      process.env.SMOKE_TEACHER_EMAIL || '',
  password:   process.env.SMOKE_TEACHER_PASSWORD || '',
  headless:   process.env.SMOKE_HEADLESS !== '0',
  navTimeout:  Number(process.env.SMOKE_NAV_TIMEOUT_MS || 8000),
  loadTimeout: Number(process.env.SMOKE_LOAD_TIMEOUT_MS || 25000),
  chromiumPath: process.env.SMOKE_CHROMIUM_PATH || '',
};

const results = [];
let hardFailures = 0;
function record(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: detail || '' });
  if (!pass) hardFailures++;
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${name}${detail ? ' :: ' + detail : ''}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const maskEmail = (e) => e.replace(/^(.).*(@.*)$/, '$1***$2');

async function dismissOverlays(page) {
  await page.evaluate(() => {
    const sel = '.apcs-popup-overlay, #apcs-csa-popup, [role="dialog"][aria-modal="true"]';
    document.querySelectorAll(sel).forEach((el) => { try { el.remove(); } catch (e) {} });
  }).catch(() => {});
}
async function gotoClean(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await dismissOverlays(page);
}
async function clickClean(page, selector) {
  await dismissOverlays(page);
  await page.click(selector);
}
async function visibleWithin(page, selector, timeoutMs) {
  return page.waitForSelector(selector, { state: 'visible', timeout: timeoutMs })
    .then(() => true).catch(() => false);
}
async function errorShown(page, selector) {
  const el = page.locator(selector).first();
  try {
    const visible = await el.isVisible();
    const text = (await el.textContent().catch(() => '')) || '';
    return visible && text.trim().length > 0;
  } catch { return false; }
}
// Silent-failure guard: after the login submit, exactly one of success / visible
// error must happen within timeoutMs, else 'silent' (the bug).
async function waitNavOrError(page, { successLocator, errorSelector, timeoutMs }) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (successLocator && (await successLocator.isVisible().catch(() => false))) return 'success';
    if (errorSelector && (await errorShown(page, errorSelector))) return 'error';
    await sleep(150);
  }
  return 'silent';
}

// Teacher token via the API - robust backbone for the per-class checks, and a
// fallback for the dashboard DOM checks if the login UI itself has drifted.
async function apiLogin(page) {
  try {
    const r = await page.request.post(`${CFG.apiBase}/api/teacher/login`, {
      data: { email: CFG.email, password: CFG.password },
      headers: { 'Content-Type': 'application/json' },
    });
    if (!r.ok()) return null;
    const d = await r.json();
    return d && d.token ? d.token : null;
  } catch { return null; }
}

async function classProgress(page, token, code) {
  try {
    const r = await page.request.get(`${CFG.apiBase}/api/teacher/classes/${encodeURIComponent(code)}/progress`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { status: r.status(), body: r.ok() ? await r.json() : null };
  } catch (e) { return { status: 0, body: null }; }
}

async function main() {
  console.log('APCSExamPrep teacher dashboard smoke test');
  console.log(`  site:    ${CFG.siteBase}`);
  console.log(`  api:     ${CFG.apiBase}`);
  console.log(`  classes: ${CFG.classCodes.join(', ') || '(unset!)'}`);
  console.log(`  teacher: ${CFG.email ? maskEmail(CFG.email) : '(unset!)'}`);
  console.log('');

  if (CFG.classCodes.length === 0) {
    console.error('FATAL: SMOKE_TEST_CLASS_CODE is required (comma-separated class codes).');
    process.exit(2);
  }
  if (!CFG.email || !CFG.password) {
    console.error('FATAL: SMOKE_TEACHER_EMAIL and SMOKE_TEACHER_PASSWORD are required (repo Actions secrets in CI).');
    process.exit(2);
  }

  const launchOpts = { headless: CFG.headless };
  if (CFG.chromiumPath) launchOpts.executablePath = CFG.chromiumPath;
  const browser = await chromium.launch(launchOpts);
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(CFG.loadTimeout);
  page.setDefaultNavigationTimeout(CFG.loadTimeout);

  try {
    await fetch(`${CFG.apiBase}/api/health`).catch(() => {});

    // Get an API token up front: it verifies the credentials work, powers the
    // per-class API checks, and can seed localStorage if the login UI drifted.
    const apiToken = await apiLogin(page);
    record('teacher credentials accepted by API (/api/teacher/login)', !!apiToken,
      apiToken ? '' : 'API login failed - check SMOKE_TEACHER_EMAIL / SMOKE_TEACHER_PASSWORD');

    // === Teacher login via the real UI + silent-failure guard ===
    await gotoClean(page, `${CFG.siteBase}/pages/cyber-class`);
    await page.waitForSelector('.tcp-tab', { state: 'visible', timeout: CFG.loadTimeout }).catch(() => {});
    await dismissOverlays(page);
    await page.locator('.tcp-tab', { hasText: 'Sign In' }).click().catch(() => {});
    const haveForm = await visibleWithin(page, '#loginEmail', CFG.loadTimeout);
    if (haveForm) {
      await page.fill('#loginEmail', CFG.email);
      await page.fill('#loginPass', CFG.password);
      await clickClean(page, '#tcp-login .tcp-btn');
      const outcome = await waitNavOrError(page, {
        successLocator: page.locator('#tcp-dashboard'),
        errorSelector: '.tcp-error',
        timeoutMs: CFG.navTimeout,
      });
      record('teacher login silent-submit guard', outcome !== 'silent',
        outcome === 'silent' ? 'silent submit: no navigation and no error state' : `reached '${outcome}' state`);
      record('teacher login succeeded (dashboard shown)', outcome === 'success',
        outcome === 'success' ? '' : `expected success, got '${outcome}'`);
      const uiToken = await page.evaluate(() => localStorage.getItem('apcse_teacher_token'));
      record('teacher token present after UI login', !!uiToken, uiToken ? '' : 'no apcse_teacher_token written');
    } else {
      record('teacher login form reached (#loginEmail)', false,
        'could not reach the Sign In form (cyber-class page may have drifted)');
    }

    // Ensure the dashboard has a usable token even if the login UI drifted.
    if (apiToken) {
      await page.evaluate((t) => localStorage.setItem('apcse_teacher_token', t), apiToken).catch(() => {});
    }

    // === Per-class dashboard render + API data verification ===
    for (const code of CFG.classCodes) {
      console.log(`\n== Class ${code} ==`);

      // DOM: the page the teacher actually looks at renders for this class.
      await gotoClean(page, `${CFG.siteBase}/pages/cyber-dashboard?code=${encodeURIComponent(code)}`);
      const mainVisible = await visibleWithin(page, '#tcdash-main', CFG.loadTimeout);
      record(`${code}: dashboard renders (#tcdash-main)`, mainVisible,
        mainVisible ? '' : 'teacher dashboard did not render');
      if (mainVisible) {
        const codeText = ((await page.locator('#dash-code').textContent().catch(() => '')) || '').trim();
        record(`${code}: dashboard shows the class code`, codeText.toUpperCase() === code,
          codeText.toUpperCase() === code ? '' : `#dash-code was "${codeText}"`);
      } else {
        // Selector-agnostic fallback: is the class code text anywhere on the page?
        const hasCode = await page.getByText(code, { exact: false }).first().isVisible().catch(() => false);
        record(`${code}: class code visible somewhere on dashboard`, hasCode,
          hasCode ? '(rendered, but #tcdash-main selector may have drifted)' : 'class code not visible');
      }

      // API: the data behind the dashboard is real and belongs to this class.
      if (apiToken) {
        const { status, body } = await classProgress(page, apiToken, code);
        const ok = status === 200 && body && body.class && typeof body.class.course === 'string';
        record(`${code}: teacher progress API returns the class`, ok,
          ok ? `course=${body.class.course}, students=${Array.isArray(body.summary) ? body.summary.length : '?'}`
             : `status=${status}`);
      } else {
        record(`${code}: teacher progress API returns the class`, false, 'no API token (login failed)');
      }
    }
  } catch (e) {
    record('run crashed', false, e.message);
  } finally {
    await browser.close().catch(() => {});
  }

  console.log('\n===== TEACHER DASHBOARD SUMMARY =====');
  console.log(`OVERALL: ${hardFailures === 0 ? 'PASS' : 'FAIL'}  (${hardFailures} assertion failure(s))`);
  process.exit(hardFailures > 0 ? 1 : 0);
}

main().catch((e) => { console.error('Fatal error:', e); process.exit(1); });
