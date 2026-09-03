'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: site assistant Phase 0, POST /api/assistant/report
//
//  The assertion this suite exists for is not "the endpoint returns 200". It is
//  that a student cannot get their typed text into the database through it.
//
//  CLAUDE.md permits exactly ONE table of free text a student typed
//  (sandbox_programs), and lists the bounds that made that exception grantable.
//  A public report form on lesson pages is the obvious way a second one arrives
//  by accident, so the rule is pinned here from three directions: as the student
//  role, as an anonymous caller on a coursework page (a signed-out minor), and
//  as a client that lies about who it is. All three must land with the prose
//  dropped and the machine context kept, because the machine context is the part
//  that reproduces the bug anyway.
//
//  The rest of the suite covers the things that make the endpoint safe to expose
//  publicly at all: a closed category set, truncation on every string, a hard
//  daily ceiling, and board dedupe so one broken page is one task rather than
//  one per student who hit it.
//
//  Offline and secret-free, per .github/workflows/tests.yml: a throwaway SQLite
//  file, the real router mounted in process on an ephemeral port, no network and
//  no live server. tests.yml derives its suite list from package.json.
//
//  Zero PII: synthetic teacher, class and student. No em-dashes.
//
//  Run: npm run smoke:assistantreport
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-assistant-report.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

// No recipient configured: mailOwner must short-circuit rather than attempt a
// send. The suite must not depend on, or reach, a mail provider.
delete process.env.ASSISTANT_ALERT_EMAIL;
delete process.env.COMMAND_OWNER_EMAIL;
delete process.env.RESEND_API_KEY;

// The limiter is real and it WILL block a test suite that fires two dozen
// reports from one address. Rather than disable it, shrink its window to a few
// milliseconds and space the functional calls out, so every ordinary request
// lands in a fresh bucket and the burst test below still proves the brake
// engages. Testing with the limiter removed would be testing a different route.
const WINDOW_MS = 80;
process.env.ASSISTANT_REPORT_WINDOW_MS = String(WINDOW_MS);
process.env.ASSISTANT_REPORT_MAX_PER_WINDOW = '5';

const express = require('express');
const db = require('../db');
const { signTeacherToken, signStudentToken } = require('../utils');
const reportLib = require('../lib/assistant/report');
const { pageScope, retainsBodies } = require('../lib/assistant/scope');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);
const one = (s, ...a) => db.prepare(s).get(...a);

const app = express();
// Mirrors server.js exactly. The global parser's ceiling is part of the route's
// behaviour, and a suite that used express.json()'s 100kb default would fail on
// payloads production accepts.
app.use(express.json({ limit: '1mb' }));
app.use(require('../routes/assistant'));
// server.js ends with this same handler. Without it express prints a stack for
// the deliberately-oversized body below, which makes a passing run look broken.
app.use((err, req, res, next) => res.status(err && err.status ? err.status : 500).json({ error: 'refused' }));

const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const raw = (url, body, auth, headers = {}) => fetch(base() + url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(auth ? { Authorization: 'Bearer ' + auth } : {}),
    ...headers,
  },
  body: JSON.stringify(body || {}),
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

// Every functional call waits out the (deliberately tiny) window first, so the
// limiter is present and enforcing throughout without the suite fighting it.
const post = async (...a) => { await sleep(WINDOW_MS + 20); return raw(...a); };

// -- fixtures ----------------------------------------------------------------
run(`INSERT INTO teachers (id,name,email,school,password_hash)
     VALUES ('t1','Alex Teacher','t@school.example','Example HS','x')`);
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active)
     VALUES ('c1','t1','CYBER-RPT','Reports','ap-cybersecurity',1)`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c1','A','x')`);

const TT = signTeacherToken({ id: 't1', email: 't@school.example' });
const ST = signStudentToken({ id: 's1', class_id: 'c1' });

const LESSON = '/pages/ap-cybersecurity-unit-1-password-attacks';
const QUIZ = '/pages/ap-cybersecurity-unit-1-1-1-quiz';
const PRICING = '/pages/pricing';

const escById = (id) => one('SELECT * FROM chat_escalations WHERE id = ?', id);
const escCount = () => one('SELECT COUNT(*) n FROM chat_escalations').n;

const SECRET_PROSE = 'my name is REDACTEDCHILD and my email is kid@example.com';

(async () => {
  // ── 1) Scope is derived server-side, from the URL alone ───────────────────
  ok('scope: lesson page', pageScope(LESSON) === 'lesson', pageScope(LESSON));
  ok('scope: quiz page is assessment', pageScope(QUIZ) === 'assessment', pageScope(QUIZ));
  ok('scope: pricing is commerce', pageScope(PRICING) === 'commerce', pageScope(PRICING));
  ok('retention: student never retains', retainsBodies('student', 'commerce') === false);
  ok('retention: anonymous on coursework does not retain', retainsBodies('anonymous', 'lesson') === false);
  ok('retention: anonymous on commerce retains', retainsBodies('anonymous', 'commerce') === true);
  ok('retention: teacher retains on a lesson', retainsBodies('teacher', 'lesson') === true);

  // ── 2) A closed category set ──────────────────────────────────────────────
  let r = await post('/api/assistant/report', { category: 'not_a_category', pageUrl: PRICING });
  ok('unknown category is refused', r.status === 400, r.status);
  ok('refusal lists the valid set', r.body && Array.isArray(r.body.categories) && r.body.categories.length === 13);
  ok('refused report stored nothing', escCount() === 0, escCount());

  r = await post('/api/assistant/report', { pageUrl: PRICING });
  ok('missing category is refused', r.status === 400, r.status);

  // ── 3) An adult on a commerce page: text is kept ──────────────────────────
  r = await post('/api/assistant/report', {
    category: 'presale',
    pageUrl: PRICING,
    pageTitle: 'Pricing',
    description: 'Does the teacher bundle cover two sections?',
    consoleErrors: ['TypeError: x is not a function at line 42'],
  });
  ok('anonymous on commerce: 200', r.status === 200, r.status);
  ok('anonymous on commerce: says text was stored', r.body && r.body.textStored === true, r.body);
  const presale = escById(r.body.id);
  ok('anonymous on commerce: row is anonymous', presale.role === 'anonymous', presale.role);
  ok('anonymous on commerce: scope recorded', presale.page_scope === 'commerce', presale.page_scope);
  ok('anonymous on commerce: prose kept', /two sections/.test(presale.summary || ''), presale.summary);
  ok('anonymous on commerce: bodies_retained is 1', presale.bodies_retained === 1);
  ok('anonymous on commerce: severity normal', presale.severity === 'normal', presale.severity);
  ok('anonymous on commerce: no raw IP anywhere',
    presale.ip_hash && presale.ip_hash.length === 40 && !/\d+\.\d+\.\d+\.\d+/.test(presale.ip_hash), presale.ip_hash);

  // ── 4) THE RULE. A student's prose never lands ────────────────────────────
  r = await post('/api/assistant/report', {
    category: 'bug_report',
    pageUrl: LESSON,
    description: SECRET_PROSE,
    consoleErrors: ['ReferenceError: apcsQuiz is not defined'],
  }, ST);
  ok('student: 200', r.status === 200, r.status);
  ok('student: told plainly that text was NOT stored', r.body && r.body.textStored === false, r.body);
  const stu = escById(r.body.id);
  ok('student: role resolved from the token', stu.role === 'student', stu.role);
  ok('student: summary is NULL', stu.summary === null, stu.summary);
  ok('student: bodies_retained is 0', stu.bodies_retained === 0);
  ok('student: no contact columns', stu.contact_email === null && stu.contact_name === null && stu.school === null);
  ok('student: id kept so the row can be deleted with the student', stu.user_ref === 's1', stu.user_ref);
  ok('student: course resolved from their class', stu.course === 'ap-cybersecurity', stu.course);
  ok('student: machine context SURVIVED',
    /apcsQuiz is not defined/.test(stu.detail_json || ''), stu.detail_json);

  // The prose must not appear ANYWHERE in the row, not just in summary.
  ok('student: prose appears in no column of the row',
    !JSON.stringify(stu).includes('REDACTEDCHILD'), stu);
  // ... nor anywhere in the whole table, including the board detail we wrote.
  const anyEsc = db.prepare('SELECT * FROM chat_escalations').all();
  ok('student: prose is nowhere in chat_escalations',
    !JSON.stringify(anyEsc).includes('REDACTEDCHILD'));
  const anyTask = db.prepare('SELECT * FROM tasks').all();
  ok('student: prose is nowhere on the command board',
    !JSON.stringify(anyTask).includes('REDACTEDCHILD'));

  // ── 5) Anonymous on a coursework page is treated as a student ─────────────
  r = await post('/api/assistant/report', {
    category: 'progression_gate',
    pageUrl: LESSON,
    description: 'SIGNEDOUTKID typed this',
  });
  ok('anonymous on a lesson: text not stored', r.body && r.body.textStored === false, r.body);
  const anon = escById(r.body.id);
  ok('anonymous on a lesson: summary NULL', anon.summary === null, anon.summary);
  ok('anonymous on a lesson: prose nowhere in the row',
    !JSON.stringify(anon).includes('SIGNEDOUTKID'));

  // ── 6) A client cannot talk its way into a different posture ──────────────
  r = await post('/api/assistant/report', {
    category: 'bug_report',
    pageUrl: LESSON,
    description: 'LIARTEXT should not survive',
    // Everything below is a lie the client is telling. All of it is ignored.
    role: 'teacher',
    pageScope: 'commerce',
    bodies_retained: 1,
    user_ref: 't1',
    contactEmail: 'attacker@example.com',
    userAgent: 'ClientSuppliedUA/9.9',
  }, ST);
  const liar = escById(r.body.id);
  ok('client-claimed role is ignored', liar.role === 'student', liar.role);
  ok('client-claimed scope is ignored', liar.page_scope === 'lesson', liar.page_scope);
  ok('client-claimed retention is ignored', liar.bodies_retained === 0);
  ok('client-claimed contact email is ignored', liar.contact_email === null, liar.contact_email);
  ok('client-claimed user_ref is ignored', liar.user_ref === 's1', liar.user_ref);
  ok('client-claimed prose still dropped', !JSON.stringify(liar).includes('LIARTEXT'));
  ok('user agent is server-captured, not client-supplied',
    !/ClientSuppliedUA/.test(liar.detail_json || ''), liar.detail_json);

  // ── 7) A teacher is an adult: prose and contact details are kept ──────────
  r = await post('/api/assistant/report', {
    category: 'gradebook_missing_scores',
    pageUrl: LESSON,
    description: 'Two of my students show no score for 1.1.',
  }, TT);
  ok('teacher: text stored', r.body && r.body.textStored === true, r.body);
  const tch = escById(r.body.id);
  ok('teacher: role from token', tch.role === 'teacher', tch.role);
  ok('teacher: prose kept', /no score for 1\.1/.test(tch.summary || ''), tch.summary);
  ok('teacher: contact read from the ROW, not the token',
    tch.contact_email === 't@school.example' && tch.contact_name === 'Alex Teacher' && tch.school === 'Example HS', tch);

  // ── 8) Severity is by rule, and public forms cannot page a human ──────────
  r = await post('/api/assistant/report', { category: 'assessment_visibility', pageUrl: LESSON }, TT);
  ok('teacher assessment_visibility is immediate', escById(r.body.id).severity === 'immediate');
  r = await post('/api/assistant/report', { category: 'assessment_visibility', pageUrl: LESSON }, ST);
  ok('student assessment_visibility is NOT immediate', escById(r.body.id).severity === 'normal');
  r = await post('/api/assistant/report', { category: 'assessment_visibility', pageUrl: PRICING });
  ok('anonymous assessment_visibility is NOT immediate', escById(r.body.id).severity === 'normal');

  // ── 9) Truncation: the browser is an unbounded source of strings ──────────
  r = await post('/api/assistant/report', {
    category: 'other',
    pageUrl: PRICING,
    pageTitle: 'T'.repeat(5000),
    description: 'D'.repeat(50000),
    consoleErrors: Array.from({ length: 200 }, (_, i) => 'E'.repeat(600) + i),
  });
  const big = escById(r.body.id);
  ok('summary truncated to the cap', big.summary.length === reportLib.LIMITS.summary, big.summary.length);
  const bigDetail = JSON.parse(big.detail_json);
  ok('page title truncated', bigDetail.pageTitle.length === reportLib.LIMITS.pageTitle, bigDetail.pageTitle.length);
  ok('console errors capped in count',
    bigDetail.consoleErrors.length === reportLib.LIMITS.consoleErrors, bigDetail.consoleErrors.length);
  ok('console errors capped in length',
    bigDetail.consoleErrors.every((e) => e.length <= reportLib.LIMITS.consoleError));
  ok('detail_json stays under its ceiling', big.detail_json.length <= reportLib.LIMITS.detailJson, big.detail_json.length);

  // ── 10) Board dedupe: one broken page is one task ─────────────────────────
  const before = one('SELECT COUNT(*) n FROM tasks').n;
  const dupe = { category: 'content_error', pageUrl: '/pages/ap-csa-lesson-1-2-variables', consoleErrors: ['Boom at 11'] };
  const d1 = await post('/api/assistant/report', dupe);
  const d2 = await post('/api/assistant/report', { ...dupe, consoleErrors: ['Boom at 87'] });
  const after = one('SELECT COUNT(*) n FROM tasks').n;
  ok('two reports of one failure open ONE task', after === before + 1, { before, after });
  ok('both escalations point at that one task',
    escById(d1.body.id).todo_id && escById(d1.body.id).todo_id === escById(d2.body.id).todo_id,
    [escById(d1.body.id).todo_id, escById(d2.body.id).todo_id]);
  ok('both reports are still recorded separately', d1.body.id !== d2.body.id);

  // A genuinely different failure on the same page is NOT deduped away.
  const d3 = await post('/api/assistant/report', { ...dupe, consoleErrors: ['Different failure entirely'] });
  ok('a different failure on the same page opens its own task',
    escById(d3.body.id).todo_id !== escById(d1.body.id).todo_id,
    [escById(d3.body.id).todo_id, escById(d1.body.id).todo_id]);

  // ── 11) The board task carries what a fix needs ───────────────────────────
  const task = one('SELECT * FROM tasks WHERE id = ?', escById(d1.body.id).todo_id);
  ok('task title names the category', /content_error/.test(task.title), task.title);
  ok('task detail carries the escalation id', task.detail.includes(d1.body.id));
  ok('task detail carries the console output', /Boom at 11/.test(task.detail));

  // ── 12) A student-origin task says WHY there is no prose ──────────────────
  const stuTask = one('SELECT * FROM tasks WHERE id = ?', stu.todo_id);
  ok('student-origin task explains the missing text',
    /not stored/i.test(stuTask.detail), stuTask.detail.slice(0, 200));

  // ── 13) Mail is best effort and never fails the request ───────────────────
  const mailed = await reportLib.mailOwner({
    escalationId: 'esc_test', category: 'other', severity: 'normal', role: 'anonymous',
    pageUrl: PRICING, pageScope: 'commerce', summary: 'x', detail: { consoleErrors: [] },
    bodiesRetained: 1, todoId: null,
  });
  ok('no recipient configured: mail short-circuits, does not throw', mailed.sent === false && mailed.reason === 'no_recipient', mailed);

  // ── 14) The form bootstrap tells the truth BEFORE anyone types ────────────
  const ctx = (url, auth) => fetch(base() + '/api/assistant/report/context?pageUrl=' + encodeURIComponent(url),
    auth ? { headers: { Authorization: 'Bearer ' + auth } } : {}).then((x) => x.json());

  const cats = await ctx(PRICING);
  ok('context serves the same closed set the server accepts',
    JSON.stringify(cats.categories) === JSON.stringify(reportLib.CATEGORIES), cats);
  ok('context: anonymous on commerce is told text is kept', cats.textStored === true, cats);
  ok('context: reports the derived scope', cats.scope === 'commerce', cats);

  const stuCtx = await ctx(LESSON, ST);
  ok('context: a student is told up front that text is NOT kept', stuCtx.textStored === false, stuCtx);
  ok('context: a student sees their resolved role', stuCtx.role === 'student', stuCtx);

  const anonLessonCtx = await ctx(LESSON);
  ok('context: anonymous on a lesson is also told text is not kept',
    anonLessonCtx.textStored === false, anonLessonCtx);

  const tchCtx = await ctx(LESSON, TT);
  ok('context: a teacher on a lesson is told text is kept', tchCtx.textStored === true, tchCtx);

  // ── 14b) The affordance is actually served, and is safe to serve ─────────
  const asset = await fetch(base() + '/apcs-report.js');
  const assetText = await asset.text();
  ok('the widget is served', asset.status === 200, asset.status);
  ok('served as javascript', /javascript/.test(asset.headers.get('content-type') || ''), asset.headers.get('content-type'));
  ok('served cross origin, since the storefront is another origin',
    asset.headers.get('access-control-allow-origin') === '*');
  // Pure ASCII is not a style preference here. This file is served next to
  // pages that have been mangled by Matrixify imports before.
  ok('the widget is pure ASCII', !/[^\x00-\x7F]/.test(assetText));
  // The one thing the widget must never do.
  // Verified in a browser: a page that throws before this file finishes
  // downloading reports an empty console without the stub. The adoption path is
  // the difference between capturing the error that broke the page and
  // capturing nothing.
  ok('the widget adopts a pre-load error buffer', /APCS_ERRORS/.test(assetText));
  ok('the widget never reads page text',
    !/innerText|textContent\s*\)|document\.body\.innerHTML|querySelectorAll\(['"](?!select)/.test(
      assetText.replace(/style\.textContent/g, '')), 'found a page-content read');

  // ── 14c) The board has its own, much lower budget ────────────────────────
  // The row ceiling protects the disk. This one protects a human's working
  // surface, which is the thing that actually degrades when it fills with junk.
  ok('a board budget exists and is far below the row ceiling',
    reportLib.MAX_NEW_TASKS_PER_DAY > 0 && reportLib.MAX_NEW_TASKS_PER_DAY < reportLib.MAX_REPORTS_PER_DAY,
    [reportLib.MAX_NEW_TASKS_PER_DAY, reportLib.MAX_REPORTS_PER_DAY]);
  ok('ordinary traffic has not spent it', reportLib.boardBudgetSpent() === false);

  // Dedupe is what gates the escalation email: a second report of a failure the
  // owner already heard about must report itself as deduped, or thirty students
  // on one broken page become thirty messages.
  const f1 = reportLib.fileTodo({
    escalationId: 'esc_mail_1', category: 'bug_report', severity: 'normal', role: 'anonymous',
    pageUrl: '/pages/ap-csa-mailtest', pageScope: 'lesson', summary: null,
    detail: { consoleErrors: ['Same failure'] }, bodiesRetained: 0,
  });
  const f2 = reportLib.fileTodo({
    escalationId: 'esc_mail_2', category: 'bug_report', severity: 'normal', role: 'anonymous',
    pageUrl: '/pages/ap-csa-mailtest', pageScope: 'lesson', summary: null,
    detail: { consoleErrors: ['Same failure'] }, bodiesRetained: 0,
  });
  ok('the first report of a failure opens a task', f1.todoId && !f1.deduped, f1);
  ok('the second reports itself as deduped, which is what silences the email',
    f2.todoId === f1.todoId && f2.deduped === true, f2);

  // ── 14d) "Will an escalation reach anyone" is answerable from outside ─────
  // The suite runs with no mail config at all, so this must say so rather than
  // report a cheerful default. A report that is stored, filed, and then silently
  // never mailed is the failure mode /api/health exists to prevent.
  const notify = reportLib.notifyStatus();
  ok('unconfigured: mail_configured is false', notify.mail_configured === false, notify);
  ok('unconfigured: recipient_set is false', notify.recipient_set === false, notify);
  ok('unconfigured: can_notify is false', notify.can_notify === false, notify);
  ok('notifyStatus leaks no address',
    !JSON.stringify(notify).includes('@'), notify);

  process.env.COMMAND_OWNER_EMAIL = 'owner@example.invalid';
  const withOwner = reportLib.notifyStatus();
  ok('a recipient alone is not enough to deliver',
    withOwner.recipient_set === true && withOwner.can_notify === false, withOwner);
  process.env.RESEND_API_KEY = 'test-key';
  const withBoth = reportLib.notifyStatus();
  ok('both together is the only combination that delivers', withBoth.can_notify === true, withBoth);
  delete process.env.RESEND_API_KEY;
  delete process.env.COMMAND_OWNER_EMAIL;

  // ── 15) The daily ceiling is a real guard, not a comment ──────────────────
  ok('daily cap is defined and finite',
    Number.isFinite(reportLib.MAX_REPORTS_PER_DAY) && reportLib.MAX_REPORTS_PER_DAY > 0, reportLib.MAX_REPORTS_PER_DAY);
  const capRow = one("SELECT COUNT(*) n FROM chat_escalations WHERE created_at >= datetime('now','start of day')");
  ok('every stored report counts toward it', capRow.n === escCount(), [capRow.n, escCount()]);

  // ── 15b) A body past the parser ceiling is refused, not a crash ──────────
  const huge = await post('/api/assistant/report', {
    category: 'other', pageUrl: PRICING, description: 'X'.repeat(2 * 1024 * 1024),
  });
  ok('an over-ceiling body is rejected', huge.status >= 400, huge.status);
  ok('an over-ceiling body stores nothing', huge.body === null || !huge.body.id, huge.body);

  // ── 16) The per-IP brake actually engages ────────────────────────────────
  // Fired as a burst inside one window, which is the shape of the abuse it is
  // there to stop. The first MAX succeed, the next is refused, and the refusal
  // is a 429 rather than a silent drop.
  await sleep(WINDOW_MS + 20);
  const burst = [];
  for (let i = 0; i < 7; i++) {
    burst.push(await raw('/api/assistant/report', { category: 'other', pageUrl: PRICING }));
  }
  const refused = burst.filter((b) => b.status === 429);
  ok('a burst from one address is throttled', refused.length > 0, burst.map((b) => b.status));
  ok('the first requests in the burst still succeeded',
    burst.slice(0, 5).every((b) => b.status === 200), burst.map((b) => b.status));
  ok('throttled requests store nothing',
    refused.every((b) => !b.body || !b.body.id), refused.map((b) => b.body));

  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
