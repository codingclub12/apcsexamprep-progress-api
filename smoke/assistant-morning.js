'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: the morning verify/fix routine and the admin report endpoints.
//  docs/handoffs/Site-Assistant-Report-First.md section 6, and acceptance
//  check 8 in its section 7.
//
//  THIS SUITE GUARDS AN AUTOMATED WRITER LOOSE ON A LIVE STOREFRONT, so what it
//  is for is not "does the classifier work". It is:
//
//  1. NEVER TOUCH WINS. Access codes, entitlements, gradebook data, pricing,
//     deletes and handle renames, and anything about students seeing an
//     assessment, are never written by this routine in any mode. A report that
//     is BOTH a broken link and an answer-key leak is an answer-key leak, and
//     the tier order is what makes that true. Both halves are asserted.
//
//  2. DRY RUN IS THE DEFAULT AND HOLDS. Acceptance check 8 is "the morning stage
//     runs in dry-run mode and sends [APCS Morning] with nothing written to the
//     site", so every gate is checked with the environment as it ships.
//
//  3. THE GATES ARE AND, NOT OR. Mode, kill switch and cap each refuse on their
//     own. A caller that satisfies three of four must still be refused, which is
//     why writeDecision() is one function rather than four checks at the call
//     site.
//
//  4. The admin endpoints fail CLOSED, and the PATCH needs the full key even
//     though the GET does not.
//
//  Offline and secret-free. No network: the classifier and the guardrails are
//  pure, and the endpoints are exercised against an in-process router.
//
//  Zero PII: synthetic teacher and reports. No em-dashes.
//
//  Run: npm run smoke:assistantmorning
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-assistant-morning.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

// The environment AS IT SHIPS. Nothing below sets MORNING_FIX_MODE, because the
// whole of acceptance check 8 is about what happens when nobody has.
delete process.env.MORNING_FIX_MODE;
delete process.env.MORNING_FIX_ENABLED;
delete process.env.MORNING_MAX_WRITES;
delete process.env.RESEND_API_KEY;
delete process.env.ANTHROPIC_API_KEY;
process.env.REPORTS_TO = 'owner@example.test';
process.env.ADMIN_KEY = 'test-admin-key-long-enough-1234567890';
process.env.ADMIN_READ_KEY = 'test-read-key-long-enough-0987654321';

const WINDOW_MS = 40;
process.env.ASSISTANT_REPORT_WINDOW_MS = String(WINDOW_MS);
process.env.ASSISTANT_REPORT_MAX_PER_WINDOW = '5';

const express = require('express');
const db = require('../db');
const morning = require('../lib/assistant/morning');
const mailer = require('../lib/mailer');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);
const one = (s, ...a) => db.prepare(s).get(...a);

let sent = [];
mailer.sendEmail = async function (msg) { sent.push(msg); return { sent: true }; };
mailer.mailerConfigured = function () { return true; };

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(require('../routes/assistant'));
app.use((err, req, res, next) => res.status(err && err.status ? err.status : 500).json({ error: 'refused' }));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

const call = (method, url, body, key) => fetch(base() + url, {
  method,
  headers: Object.assign({ 'Content-Type': 'application/json' }, key ? { 'x-admin-key': key } : {}),
  body: body ? JSON.stringify(body) : undefined,
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

const FULL = process.env.ADMIN_KEY;
const READ = process.env.ADMIN_READ_KEY;

// -- fixtures ----------------------------------------------------------------
run(`INSERT INTO teachers (id,name,email,school,password_hash)
     VALUES ('t1','Alex Teacher','t@school.example','Example HS','x')`);

let n = 0;
function seedReport(fields) {
  const id = 'esc_m' + (++n);
  db.prepare(`
    INSERT INTO chat_escalations
      (id, category, severity, role, page_url, page_scope, summary, detail_json,
       bodies_retained, status, thread_key, reporter_email, created_at)
    VALUES (@id,@category,'normal','teacher',@page_url,'lesson',@summary,'{}',
       @bodies_retained,@status,@thread_key,@reporter_email,datetime('now'))
  `).run(Object.assign({
    id, category: 'bug_report', page_url: '/pages/x', summary: null,
    bodies_retained: 1, status: 'open', thread_key: null, reporter_email: null,
  }, fields || {}, { id }));
  return id;
}

(async () => {
  // ── 1) NEVER TOUCH, which is what this whole file is for ─────────────────
  //
  // Walked as a table rather than spot-checked, because the tier is only as
  // good as its least-remembered member.
  const NEVER = [
    ['assessment_visibility', null, 'the category alone'],
    ['access_not_showing', null, 'entitlements'],
    ['gradebook_missing_scores', null, 'grade data'],
    ['procurement', null, 'money'],
    ['presale', null, 'money'],
    ['key_leak_blocked', null, 'the server-raised leak tripwire'],
  ];
  let allRefused = true;
  for (const [category, , why] of NEVER) {
    // Handed an auto-fixable issue type on purpose: the tier must win anyway.
    const v = morning.classify({ category, bodies_retained: 1, summary: 'x' }, 'mojibake');
    if (v.tier !== 'never_touch') { allRefused = false; console.log('      not refused:', category, why, v.tier); }
  }
  ok('every Never Touch category is refused even with an auto-fixable issue type', allRefused);

  const PHRASES = [
    'my students can see the answer key',
    'the whole class can open the unit test',
    'the discount code does not apply',
    'the price on this page is wrong',
    'their grade book shows the wrong score',
    'please delete the page',
    'can you rename the handle for this lesson',
    'the access code will not work',
  ];
  let allPhrasesRefused = true;
  for (const summary of PHRASES) {
    const v = morning.classify({ category: 'bug_report', bodies_retained: 1, summary }, 'mojibake');
    if (v.tier !== 'never_touch') { allPhrasesRefused = false; console.log('      not refused:', summary, '->', v.tier); }
  }
  ok('every Never Touch phrase is refused even with an auto-fixable issue type', allPhrasesRefused);

  // THE ORDERING. This is the assertion the tier list exists to make true.
  const both = morning.classify(
    { category: 'bug_report', bodies_retained: 1, summary: 'the link is broken and students can see the answer key' },
    'broken_internal_link'
  );
  ok('a report that is BOTH a broken link and a leak is a leak', both.tier === 'never_touch', both);
  ok('and it says which phrase decided it', /answer key/.test(both.reason), both.reason);
  ok('a Never Touch verdict proposes no fix at all', both.type === null, both);
  ok('its action is to email a human and stop', /Email Tanner/.test(both.action), both.action);

  // ── 2) The other tiers ───────────────────────────────────────────────────
  const auto = morning.classify({ category: 'content_error', bodies_retained: 1, summary: 'odd characters' }, 'mojibake');
  ok('mojibake on an ordinary page is auto-fix tier', auto.tier === 'auto_fix', auto);
  const prop = morning.classify({ category: 'content_error', bodies_retained: 1, summary: 'no option matches' }, 'qotd_no_matching_option');
  ok('a QOTD with no matching option is propose-only', prop.tier === 'propose', prop);
  const theme = morning.classify({ category: 'bug_report', bodies_retained: 1, summary: 'the nav is wrong' }, 'theme_change');
  ok('ANY theme change is propose-only', theme.tier === 'propose', theme);
  ok('and it says never to merge it', /[Nn]ever merge/.test(theme.action), theme.action);

  const unreproduced = morning.classify({ category: 'bug_report', bodies_retained: 1, summary: 'something is off' }, null);
  ok('a report nobody reproduced can never be auto-fixed', unreproduced.tier === 'needs_tanner', unreproduced);
  // The REASON, not just the tier. Mutation testing found the tier assertion
  // alone could not tell whether the explicit "not reproduced" branch was even
  // running: with no issue type the classifier falls through to the same tier by
  // a different route, so the two are only distinguishable by what they say.
  // A morning email that says "issue type null is on no tier list" instead of
  // "not reproduced" is a human reading nonsense at 7am.
  ok('and it says it was not reproduced, rather than blaming a null issue type',
    unreproduced.reason === 'not reproduced to a known issue type', unreproduced.reason);
  const unknown = morning.classify({ category: 'bug_report', bodies_retained: 1, summary: 'x' }, 'some_new_thing');
  ok('an issue type on no list goes to a human, not to a default fix',
    unknown.tier === 'needs_tanner', unknown);

  // ── 3) ACCEPTANCE 8: dry run is the default and every gate holds ─────────
  ok('the mode defaults to dry_run', morning.fixMode() === 'dry_run', morning.fixMode());
  ok('fixing defaults to enabled, so the kill switch is a deliberate act',
    morning.fixEnabled() === true);
  ok('the write cap defaults to 10', morning.maxWrites() === 10, morning.maxWrites());

  ok('an auto-fix item is NOT written in dry run',
    morning.writeDecision({ tier: 'auto_fix' }, 0).write === false,
    morning.writeDecision({ tier: 'auto_fix' }, 0));
  ok('and the refusal names the mode',
    /dry_run/.test(morning.writeDecision({ tier: 'auto_fix' }, 0).why));

  // Each gate, alone, with the others satisfied.
  process.env.MORNING_FIX_MODE = 'live';
  ok('in live mode an auto-fix item is allowed', morning.writeDecision({ tier: 'auto_fix' }, 0).write === true);
  ok('but a propose-tier item still is not', morning.writeDecision({ tier: 'propose' }, 0).write === false);
  ok('and a never_touch item still is not', morning.writeDecision({ tier: 'never_touch' }, 0).write === false);
  ok('the cap refuses on its own', morning.writeDecision({ tier: 'auto_fix' }, 10).write === false,
    morning.writeDecision({ tier: 'auto_fix' }, 10));
  ok('and the refusal names the cap', /cap/.test(morning.writeDecision({ tier: 'auto_fix' }, 10).why));

  process.env.MORNING_FIX_ENABLED = 'false';
  ok('the kill switch refuses on its own, in live mode, under the cap',
    morning.writeDecision({ tier: 'auto_fix' }, 0).write === false,
    morning.writeDecision({ tier: 'auto_fix' }, 0));
  ok('and the refusal names the switch', /MORNING_FIX_ENABLED/.test(morning.writeDecision({ tier: 'auto_fix' }, 0).why));
  delete process.env.MORNING_FIX_ENABLED;

  // A typo must fail SAFE. This is the one that would ship silently.
  process.env.MORNING_FIX_MODE = 'liev';
  ok('a typo in the mode is a dry run, not a live run', morning.fixMode() === 'dry_run', morning.fixMode());
  process.env.MORNING_FIX_MODE = 'LIVE';
  ok('the mode is case insensitive for the real value', morning.fixMode() === 'live');
  delete process.env.MORNING_FIX_MODE;
  ok('and removing it returns to dry run', morning.fixMode() === 'dry_run');

  // ── 4) The morning email ─────────────────────────────────────────────────
  const subj = morning.morningSubject('2026-09-18', 3, 2);
  ok('the subject is the exact [APCS Morning] shape',
    subj === '[APCS Morning] 2026-09-18: 3 fixed, 2 need you', subj);
  ok('it is NOT one of the three inbound rule prefixes, so it stays in the Inbox',
    !subj.startsWith('[APCS Bug]') && !subj.startsWith('[APCS Urgent]') && !subj.startsWith('[APCS Suggestion]'));

  const bodyText = morning.morningBody({
    reviewed: 5, dismissed: 4,
    fixed: [{ id: 'esc_1', page: '/pages/a', type: 'mojibake', action: 'replaced', before: 'bad', after: 'good' }],
    needs: [{ id: 'esc_2', page: '/pages/b', tier: 'never_touch', reason: 'mentions "answer key"', action: 'Email Tanner.' }],
    cannot: [{ id: 'esc_3', page: '/pages/c' }],
  });
  ok('the body carries all four sections',
    /FIXED \(1\)/.test(bodyText) && /NEEDS YOU \(1\)/.test(bodyText)
    && /COULD NOT REPRODUCE \(1\)/.test(bodyText) && /JUNK DISMISSED: 4/.test(bodyText), bodyText.slice(0, 200));
  ok('junk is a COUNT and never the text', !/answer key.*spam/i.test(bodyText) && /JUNK DISMISSED: 4/.test(bodyText));
  ok('a dry run says so in the body, above the Fixed list',
    bodyText.indexOf('DRY RUN') >= 0 && bodyText.indexOf('DRY RUN') < bodyText.indexOf('FIXED ('), bodyText.slice(0, 300));

  // ── 5) The admin endpoints fail closed ───────────────────────────────────
  const openId = seedReport({ summary: 'The run button never returns anything at all on this page.' });

  let r = await call('GET', '/api/assistant/reports', null, null);
  ok('GET /reports with no key is refused', r.status === 403, r.status);
  r = await call('GET', '/api/assistant/reports', null, 'wrong-key-but-long-enough-xxxxxxxx');
  ok('GET /reports with a wrong key is refused', r.status === 403, r.status);
  r = await call('GET', '/api/assistant/reports', null, READ);
  ok('GET /reports accepts the READ-ONLY key, which is all a dry run needs',
    r.status === 200, r.status);
  ok('and it returns the open report', (r.body.reports || []).some((x) => x.id === openId), r.body.count);
  ok('the rows carry no raw detail_json blob', !('detail_json' in (r.body.reports[0] || {})));

  r = await call('GET', '/api/assistant/reports?status=not_a_status', null, FULL);
  ok('an unknown status filter is refused', r.status === 400, r.status);

  // The PATCH is a write, so the read key must NOT open it.
  r = await call('PATCH', `/api/assistant/reports/${openId}`, { status: 'confirmed' }, READ);
  ok('PATCH refuses the read-only key', r.status === 403, r.status);
  r = await call('PATCH', `/api/assistant/reports/${openId}`, { status: 'confirmed' }, null);
  ok('PATCH with no key is refused', r.status === 403, r.status);
  r = await call('PATCH', `/api/assistant/reports/${openId}`, { status: 'nonsense' }, FULL);
  ok('PATCH refuses an unknown status', r.status === 400, r.status);
  r = await call('PATCH', '/api/assistant/reports/esc_does_not_exist', { status: 'confirmed' }, FULL);
  ok('PATCH on a missing report is a 404, not a silent success', r.status === 404, r.status);

  r = await call('PATCH', `/api/assistant/reports/${openId}`, { status: 'confirmed', resolution_note: 'reproduced' }, FULL);
  ok('PATCH with the full key works', r.status === 200 && r.body.status === 'confirmed', r.body);
  ok('and the row moved', one('SELECT status, resolution_note FROM chat_escalations WHERE id = ?', openId).status === 'confirmed');

  // 'fixed' is the one status with a side effect, and it must go through the
  // once-only path rather than being written here a second time.
  const withEmail = seedReport({
    summary: 'The second example on this page does not compile as written.',
    reporter_email: 'teacher@school.example',
    thread_key: '/pages/x|bug_report',
  });
  sent = [];
  r = await call('PATCH', `/api/assistant/reports/${withEmail}`, { status: 'fixed', resolution_note: 'Corrected.' }, FULL);
  ok('PATCH to fixed sends exactly one thank-you', r.status === 200 && sent.length === 1, { status: r.status, sent: sent.length });
  ok('it goes to the reporter', sent[0] && sent[0].to === 'teacher@school.example', sent[0] && sent[0].to);
  sent = [];
  r = await call('PATCH', `/api/assistant/reports/${withEmail}`, { status: 'fixed' }, FULL);
  ok('a second PATCH to fixed sends nothing', sent.length === 0, sent.length);

  // ── 6) The fix mode cannot be turned on by a request ─────────────────────
  // There is no endpoint that sets it, and that is deliberate: the fourteen day
  // dry run is a decision, not a toggle somebody can reach over HTTP.
  const routeSrc = fs.readFileSync(path.join(__dirname, '..', 'routes', 'assistant.js'), 'utf8');
  ok('no route writes MORNING_FIX_MODE', !/MORNING_FIX_MODE\s*=/.test(routeSrc));
  const scriptSrc = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'morning-report-review.js'), 'utf8');
  ok('the morning script does not set its own mode either',
    !/process\.env\.MORNING_FIX_MODE\s*=/.test(scriptSrc));
  ok('the morning script refuses to run without an admin credential',
    /no admin credential/.test(scriptSrc));
  ok('and every write it makes goes through writeDecision',
    /morning\.writeDecision\(/.test(scriptSrc));
  ok('it re-verifies against the live page rather than trusting a 200',
    /A 200 from the write call is not proof/.test(scriptSrc) && /async function reverify/.test(scriptSrc));
  ok('it fetches through the storefront module, never a bare fetch of a page',
    /storefront-fetch/.test(scriptSrc));
  ok('it detects mojibake through the module, never a pasted pattern',
    /require\('\.\.\/lib\/mojibake'\)/.test(scriptSrc));

  // ── 7) Cache-delayed fixes are re-checked, not retried ──────────────────
  ok('a nav fix is marked cache delayed', morning.cacheDelayed('dead_nav_link', '/pages/x') === true);
  ok('a JS asset is cache delayed', morning.cacheDelayed('mojibake', '/apcs-widget.js') === true);
  ok('an ordinary page body is not', morning.cacheDelayed('mojibake', '/pages/x') === false);
  ok('fixed_pending_cache is an accepted status', morning.STATUS_SET.has('fixed_pending_cache'));

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
