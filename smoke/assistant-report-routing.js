'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: report-first routing.
//  docs/handoffs/Site-Assistant-Report-First.md sections 3.1 to 3.5, and the
//  acceptance checks 1 to 4 in its section 7.
//
//  WHAT THIS SUITE IS FOR, and it is not "the endpoint returns 200":
//
//  Tanner's Outlook rules match on three exact subject prefixes. A renamed
//  prefix does not error. The mail still arrives, it just stops being labelled
//  and stops being filed, and NOTHING ANYWHERE SAYS SO. That failure is
//  invisible from both ends: the sender thinks it sent, the recipient thinks it
//  was a quiet week. So the three prefixes are asserted byte for byte here, and
//  the mutation harness beside this file proves that assertion is not hollow.
//
//  The same shape of silence is why the other three areas are pinned:
//    threading    a broken thread looks like more reports, not like a bug
//    urgency      an urgent report filed as normal waits behind the queue
//    junk         a filter that eats real reports looks like nobody complained
//
//  The mail is captured by replacing mailer.sendEmail, the same way
//  smoke/password-reset.js does it, so every assertion is made against the
//  message that WOULD have gone out, with no network and no provider.
//
//  Offline and secret-free, per .github/workflows/tests.yml: a throwaway SQLite
//  file, the real router mounted in process on an ephemeral port. tests.yml
//  derives its suite list from package.json.
//
//  Zero PII: synthetic teacher, class and student. No em-dashes.
//
//  Run: npm run smoke:assistantrouting
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-assistant-routing.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

// A recipient IS configured here, unlike smoke/assistant-report.js: this suite
// is about what the message looks like, so the mail path has to get far enough
// to build one. The provider is replaced below, so nothing leaves the process.
process.env.REPORTS_TO = 'owner@example.test';
delete process.env.RESEND_API_KEY;
delete process.env.ANTHROPIC_API_KEY;   // layer 3 must degrade to 'real'
delete process.env.REPORTS_FILE_TODOS;  // THE DEFAULT is what section 1 asserts
delete process.env.REPORT_EMAIL_MODE;   // defaults to 'each'
delete process.env.ADMIN_KEY;

const WINDOW_MS = 60;
process.env.ASSISTANT_REPORT_WINDOW_MS = String(WINDOW_MS);
process.env.ASSISTANT_REPORT_MAX_PER_WINDOW = '5';

const express = require('express');
const db = require('../db');
const { signTeacherToken, signStudentToken } = require('../utils');
const reportLib = require('../lib/assistant/report');
const junk = require('../lib/assistant/junk-filter');
const mailer = require('../lib/mailer');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);
const one = (s, ...a) => db.prepare(s).get(...a);

// -- capture the mail instead of sending it ----------------------------------
// Replacing the property on the module object works because lib/assistant/report
// calls mailer.sendEmail(...) through the object rather than through a
// destructured binding. Same technique as smoke/password-reset.js.
let sent = [];
const realSend = mailer.sendEmail;
mailer.sendEmail = async function (msg) {
  sent.push(msg);
  return { sent: true, id: 'test_' + sent.length, messageId: (msg.headers || {})['Message-ID'] || null };
};
mailer.mailerConfigured = function () { return true; };

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(require('../routes/assistant'));
app.use((err, req, res, next) => res.status(err && err.status ? err.status : 500).json({ error: 'refused' }));

const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A real browser User-Agent, because junk filter layer 2 rule 4 refuses anything
// that is not one and the widget runs in a browser. Sending node's own UA here
// would test the refusal path on every call and prove nothing about the rest.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

const raw = (url, body, auth, headers = {}) => fetch(base() + url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': UA,
    ...(auth ? { Authorization: 'Bearer ' + auth } : {}),
    ...headers,
  },
  body: JSON.stringify(body || {}),
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

const post = async (...a) => { await sleep(WINDOW_MS + 15); return raw(...a); };

// The mail goes out AFTER the response, deliberately, so a slow provider cannot
// hold a handler open. Every assertion about a message therefore has to wait for
// the tick it is queued on rather than read straight after the await.
async function settle() {
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setImmediate(r));
    await sleep(5);
  }
}

// -- fixtures ----------------------------------------------------------------
run(`INSERT INTO teachers (id,name,email,school,password_hash)
     VALUES ('t1','Alex Teacher','t@school.example','Example HS','x')`);
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active)
     VALUES ('c1','t1','CSA-RPT','Reports','ap-csa',1)`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c1','A','x')`);

const TT = signTeacherToken({ id: 't1', email: 't@school.example' });
const ST = signStudentToken({ id: 's1', class_id: 'c1' });

const LESSON = '/pages/ap-csa-lesson-1-2-variables';
const PRICING = '/pages/pricing';

const escById = (id) => one('SELECT * FROM chat_escalations WHERE id = ?', id);
const REAL = 'The check answer button on this page does nothing at all when I click it.';

(async () => {
  // ── 1) ACCEPTANCE 1: stored, emailed, and NO TODO ─────────────────────────
  //
  // The handoff's first acceptance check, minus the parts only a human with an
  // Outlook window can see. What is checkable here is the three facts underneath
  // it: a row exists, one mail was built with the [APCS Bug] prefix, and the
  // board was not touched.
  sent = [];
  const boardBefore = one('SELECT COUNT(*) n FROM tasks').n;
  let r = await post('/api/assistant/report', {
    category: 'content_error', pageUrl: LESSON, description: REAL,
  }, TT);
  await settle();
  ok('a real report is accepted', r.status === 200 && r.body && r.body.ok === true, r.body);
  const row1 = escById(r.body.id);
  ok('it writes a DB row', !!row1, r.body.id);
  ok('the row is open', row1.status === 'open', row1.status);
  ok('exactly one email was built', sent.length === 1, sent.length);
  ok('the subject carries the [APCS Bug] prefix EXACTLY',
    sent[0] && sent[0].subject.startsWith('[APCS Bug] '), sent[0] && sent[0].subject);
  ok('the subject names the category and the page PATH',
    !!sent[0] && sent[0].subject === '[APCS Bug] content_error: /pages/ap-csa-lesson-1-2-variables',
    sent[0] && sent[0].subject);

  ok('NO todo is filed by default (handoff 3.1)',
    row1.todo_id === null && one('SELECT COUNT(*) n FROM tasks').n === boardBefore,
    { todo: row1.todo_id, before: boardBefore, after: one('SELECT COUNT(*) n FROM tasks').n });
  ok('REPORTS_FILE_TODOS defaults to off', reportLib.filesTodos() === false);
  ok('email_status records that it was sent', row1.email_status === 'sent' || escById(r.body.id).email_status === 'sent',
    escById(r.body.id).email_status);
  ok('the body carries the reporter words verbatim', !!sent[0] && sent[0].text.includes(REAL));
  ok('the body carries the page URL', !!sent[0] && sent[0].text.includes(LESSON));
  ok('the body carries the report id', !!sent[0] && sent[0].text.includes(r.body.id));

  // The assertion above is posted with a bare path, so on its own it cannot tell
  // a path from a URL: mutation testing caught it passing against a build that
  // put the whole URL in the subject. This one posts a full URL WITH a host and a
  // query string, which is what a browser actually sends, and is the assertion
  // that has teeth.
  sent = [];
  const fullUrl = await post('/api/assistant/report', {
    category: 'content_error',
    pageUrl: 'https://apcsexamprep.com/pages/ap-csa-lesson-1-9-loops?utm_source=email&fbclid=abc123',
    description: 'The second code block on this page is missing its closing brace entirely.',
  }, TT);
  await settle();
  ok('a full URL is reduced to its PATH in the subject',
    sent[0] && sent[0].subject === '[APCS Bug] content_error: /pages/ap-csa-lesson-1-9-loops',
    sent[0] && sent[0].subject);
  ok('the host never reaches the subject',
    sent[0] && !sent[0].subject.includes('apcsexamprep.com'), sent[0] && sent[0].subject);
  ok('the query string never reaches the subject',
    sent[0] && !sent[0].subject.includes('utm_source'), sent[0] && sent[0].subject);
  ok('the full URL is still kept in the BODY, where it is useful',
    sent[0] && sent[0].text.includes('utm_source=email'), fullUrl.body.id);

  // ── 2) ACCEPTANCE 2: a second report on the same page threads ─────────────
  sent = [];
  const t1 = await post('/api/assistant/report', {
    category: 'bug_report', pageUrl: '/pages/ap-csa-lesson-1-4-math',
    description: 'The run button spins forever and never returns any output.',
  }, TT);
  await settle();
  const firstMsg = sent[0] || { headers: {}, subject: '(no mail built)', text: '' };
  const headMessageId = (firstMsg.headers || {})['Message-ID'];
  ok('the first mail in a thread mints a Message-ID', !!headMessageId, firstMsg.headers);
  ok('the first mail sets no In-Reply-To', !(firstMsg.headers || {})['In-Reply-To']);
  ok('the head Message-ID is stored on the row',
    escById(t1.body.id).thread_message_id === headMessageId, escById(t1.body.id).thread_message_id);

  sent = [];
  const t2 = await post('/api/assistant/report', {
    category: 'bug_report', pageUrl: '/pages/ap-csa-lesson-1-4-math?utm_source=x',
    description: 'Same thing here, the run button never comes back with anything.',
  }, TT);
  await settle();
  const second = sent[0] || { headers: {}, subject: '(no mail built)', text: '' };
  ok('the follow-up sets In-Reply-To to the first Message-ID',
    (second.headers || {})['In-Reply-To'] === headMessageId, second.headers);
  ok('the follow-up sets References to the first Message-ID',
    (second.headers || {})['References'] === headMessageId, second.headers);
  ok('the follow-up reuses the subject EXACTLY', second.subject === firstMsg.subject,
    [firstMsg.subject, second.subject]);
  ok('a query string does not split the thread (path, not URL)',
    reportLib.threadKey('/pages/a?b=1', 'bug_report') === reportLib.threadKey('/pages/a', 'bug_report'));
  ok('the follow-up body says which report of how many',
    /Report 2 of 2 for this page today/.test(second.text), second.text.slice(0, 120));
  ok('the follow-up does NOT claim to be a thread head',
    escById(t2.body.id).thread_message_id === null, escById(t2.body.id).thread_message_id);
  ok('a DIFFERENT category on the same page starts its own thread',
    reportLib.threadKey('/pages/a', 'bug_report') !== reportLib.threadKey('/pages/a', 'content_error'));

  // ── 3) ACCEPTANCE 3: urgent, and urgent beats digest mode ─────────────────
  sent = [];
  r = await post('/api/assistant/report', {
    category: 'bug_report', pageUrl: '/pages/ap-csa-u1-test',
    description: 'My students can see the unit test answer key from the lesson page.',
  }, TT);
  await settle();
  ok('a leak report is raised to immediate by its TEXT',
    escById(r.body.id).severity === 'immediate', escById(r.body.id).severity);
  ok('it carries the [APCS Urgent] prefix EXACTLY',
    !!sent[0] && sent[0].subject.startsWith('[APCS Urgent] '), sent[0] && sent[0].subject);
  ok('urgent mail is flagged high importance',
    !!sent[0] && (sent[0].headers || {}).Importance === 'high', sent[0] && sent[0].headers);

  // Now in digest mode. Non-urgent is held; urgent still goes immediately.
  process.env.REPORT_EMAIL_MODE = 'digest';
  sent = [];
  const held = await post('/api/assistant/report', {
    category: 'content_error', pageUrl: '/pages/ap-csa-lesson-2-1-arrays',
    description: 'Question three on this page has two options that say the same thing.',
  }, TT);
  await settle();
  ok('digest mode HOLDS a non-urgent report', sent.length === 0, sent.length);
  ok('the held row says so', escById(held.body.id).email_status === 'held', escById(held.body.id).email_status);

  sent = [];
  const urgent = await post('/api/assistant/report', {
    category: 'assessment_visibility', pageUrl: '/pages/ap-csa-u2-test',
    description: 'The whole class can open the unit test without signing in at all.',
  }, TT);
  await settle();
  ok('digest mode still sends URGENT immediately (acceptance 3)', sent.length === 1, sent.length);
  ok('and it is still the urgent prefix',
    !!sent[0] && sent[0].subject.startsWith('[APCS Urgent] '), sent[0] && sent[0].subject);
  ok('the urgent row is marked sent, not held',
    escById(urgent.body.id).email_status === 'sent', escById(urgent.body.id).email_status);

  // The flush is what empties the held queue.
  sent = [];
  const flushed = await reportLib.flushDigest();
  ok('flushDigest sends one mail for the held batch', flushed.sent === true && sent.length === 1, flushed);
  ok('the digest subject is NOT one of the three rule prefixes',
    !!sent[0] && !sent[0].subject.startsWith('[APCS Bug]')
    && !sent[0].subject.startsWith('[APCS Urgent]')
    && !sent[0].subject.startsWith('[APCS Suggestion]'), sent[0] && sent[0].subject);
  ok('the held row is now marked sent', escById(held.body.id).email_status === 'sent',
    escById(held.body.id).email_status);
  delete process.env.REPORT_EMAIL_MODE;

  // ── 4) ACCEPTANCE 4: junk is stored, dismissed, and NOT emailed ───────────
  sent = [];
  const short = await post('/api/assistant/report', {
    category: 'bug_report', pageUrl: PRICING, description: 'broken',
  }, TT);
  await settle();
  ok('a one-word report is still STORED', !!escById(short.body.id), short.body);
  ok('it is stored as dismissed', escById(short.body.id).status === 'dismissed', escById(short.body.id).status);
  ok('it names which rule dismissed it',
    escById(short.body.id).junk_reason === 'rule:too_short', escById(short.body.id).junk_reason);
  ok('NO email goes for it', sent.length === 0, sent.length);
  ok('the row records the suppression',
    escById(short.body.id).email_status === 'suppressed', escById(short.body.id).email_status);

  sent = [];
  const links = await post('/api/assistant/report', {
    category: 'bug_report', pageUrl: PRICING,
    description: 'Great site, please visit http://cheap-pills.ru and also www.casino-bonus.xyz and http://spam.top now',
  }, TT);
  await settle();
  ok('three external links is dismissed', escById(links.body.id).status === 'dismissed');
  ok('it names the link rule', escById(links.body.id).junk_reason === 'rule:external_links',
    escById(links.body.id).junk_reason);
  ok('NO email goes for it either', sent.length === 0, sent.length);

  // Repeat from the same connection inside a day.
  sent = [];
  const rep = 'The sidebar overlaps the code editor whenever I make the window narrow.';
  await post('/api/assistant/report', { category: 'bug_report', pageUrl: PRICING, description: rep }, TT);
  await settle();
  sent = [];
  const dup = await post('/api/assistant/report', { category: 'bug_report', pageUrl: PRICING, description: rep }, TT);
  await settle();
  ok('the same words twice from one connection is dismissed',
    escById(dup.body.id).status === 'dismissed', escById(dup.body.id).status);
  ok('it names the repeat rule', escById(dup.body.id).junk_reason === 'rule:repeat',
    escById(dup.body.id).junk_reason);
  ok('and it is not emailed', sent.length === 0, sent.length);

  // A non-browser caller. This is the rule CI needs a bypass for.
  sent = [];
  const bot = await raw('/api/assistant/report', {
    category: 'bug_report', pageUrl: PRICING,
    description: 'This is a perfectly ordinary sentence about a broken button on the page.',
  }, TT, { 'User-Agent': 'curl/8.5.0' });
  await settle();
  ok('a non-browser User-Agent is dismissed',
    escById(bot.body.id).junk_reason === 'rule:not_a_browser', escById(bot.body.id).junk_reason);

  // ── 5) Nothing is ever dropped ───────────────────────────────────────────
  const dismissedCount = one("SELECT COUNT(*) n FROM chat_escalations WHERE status = 'dismissed'").n;
  ok('every dismissal left a row behind', dismissedCount >= 4, dismissedCount);
  ok('dismissedSince can count them for the morning mail',
    reportLib.dismissedSince('1970-01-01') >= dismissedCount, reportLib.dismissedSince('1970-01-01'));

  // ── 6) Suggestions (handoff 4.3) ─────────────────────────────────────────
  sent = [];
  const sug = await post('/api/assistant/report', {
    category: 'suggestion', pageUrl: PRICING,
    description: 'It would help if the class dashboard remembered which period I had open last.',
  }, TT);
  // NOTE: the literal above and SUGGESTION_TEXT below must stay identical. They
  // are written twice rather than shared so the posted body reads as a body.
  await settle();
  ok('suggestion is accepted', sug.status === 200 && sug.body.ok === true, sug.body);
  ok('it carries the [APCS Suggestion] prefix EXACTLY',
    sent[0] && sent[0].subject.startsWith('[APCS Suggestion] '), sent[0] && sent[0].subject);
  // Derived from the description rather than pasted from a previous run. A
  // literal copied out of the output asserts what the code does, which is not
  // the same as asserting what the handoff asked for.
  const SUGGESTION_TEXT = 'It would help if the class dashboard remembered which period I had open last.';
  ok('the suggestion subject is path, then the first 60 characters of the text',
    !!sent[0] && sent[0].subject === '[APCS Suggestion] /pages/pricing: ' + SUGGESTION_TEXT.slice(0, 60),
    { got: sent[0] && sent[0].subject, want: '[APCS Suggestion] /pages/pricing: ' + SUGGESTION_TEXT.slice(0, 60) });
  ok('a suggestion is never urgent (handoff 4.3)',
    reportLib.severityFor('suggestion', 'teacher', { summary: 'students can see the answer key', aiSeverity: 'high' }) === 'normal');

  // A suggestion where typed text is not kept has nothing to be. Refused with a
  // reason, rather than stored empty and silently believed to have been heard.
  const sugStudent = await post('/api/assistant/report', {
    category: 'suggestion', pageUrl: LESSON, description: 'please add dark mode to the code editor',
  }, ST);
  ok('a suggestion is refused where typed text is not retained',
    sugStudent.status === 400 && sugStudent.body.textStored === false, sugStudent.body);
  ok('and the refusal says the report form still works',
    /report/i.test(sugStudent.body.error || ''), sugStudent.body.error);

  // ── 7) The student posture is unchanged by any of this ───────────────────
  sent = [];
  const stu = await post('/api/assistant/report', {
    category: 'bug_report', pageUrl: LESSON,
    description: 'my name is REDACTEDCHILD and this page will not load for me at all',
    // Sent deliberately. Without it the retention assertion below is hollow: a
    // NULL column proves nothing when nothing was offered. Mutation testing
    // caught exactly that, with the gate removed and the suite still green.
    reporterEmail: 'child@example.test',
  }, ST);
  await settle();
  const stuRow = escById(stu.body.id);
  ok('a student report stores no prose', stuRow.summary === null, stuRow.summary);
  ok('a student report retains nothing', stuRow.bodies_retained === 0);
  ok('the prose reaches no email either',
    sent.every((m) => !/REDACTEDCHILD/.test(m.text || '') && !/REDACTEDCHILD/.test(m.subject || '')),
    sent.map((m) => m.subject));
  ok('the mail says WHY there is no text',
    sent.length === 0 || /No reporter text/.test(sent[0].text), sent[0] && sent[0].text.slice(0, 200));
  ok('a client-supplied reporter email is dropped for a student',
    stuRow.reporter_email === null, stuRow.reporter_email);
  ok('the student address reaches no column of the row',
    !JSON.stringify(stuRow).includes('child@example.test'), stuRow);
  ok('and it reaches no email either',
    sent.every((m) => !JSON.stringify(m).includes('child@example.test')), sent.length);

  // ── 8) The reporter email, where it IS allowed ───────────────────────────
  sent = [];
  const withEmail = await post('/api/assistant/report', {
    category: 'bug_report', pageUrl: PRICING,
    description: 'The pricing table shows no annual option on a narrow phone screen.',
    reporterEmail: 'teacher@school.example',
  }, TT);
  await settle();
  ok('an adult reporter email is kept',
    escById(withEmail.body.id).reporter_email === 'teacher@school.example',
    escById(withEmail.body.id).reporter_email);
  ok('it is used as Reply-To', sent[0] && sent[0].replyTo === 'teacher@school.example', sent[0] && sent[0].replyTo);
  ok('a malformed address is dropped rather than stored',
    (await post('/api/assistant/report', {
      category: 'bug_report', pageUrl: PRICING,
      description: 'Another ordinary sentence describing something that is broken here.',
      reporterEmail: 'not-an-email',
    }, TT).then((x) => escById(x.body.id).reporter_email)) === null);

  // ── 9) The layer 3 posture: it fails OPEN ────────────────────────────────
  const noModel = await junk.triage({ category: 'bug_report', summary: 'x y z', pagePath: '/p', role: 'teacher' });
  ok('with no model key, triage answers real', noModel.label === 'real', noModel);
  ok('and says why', noModel.reason === 'model_unconfigured', noModel.reason);
  ok('unparseable model output is also real', junk.parseVerdict('I think this is fine') === null);
  ok('a valid verdict parses', (junk.parseVerdict('{"label":"junk","summary":"s","severity":"low"}') || {}).label === 'junk');
  ok('an unknown label is refused rather than trusted',
    junk.parseVerdict('{"label":"spam","summary":"s"}') === null);

  // ── 10) The three prefixes, pinned as literals ───────────────────────────
  //
  // Written out rather than read from the module, deliberately: this is the one
  // place in the repo that asserts the STRINGS Tanner's Outlook rules match. An
  // assertion that read the constant would pass after somebody renamed it, which
  // is the exact failure the whole suite exists to catch.
  ok('the urgent prefix is the exact string', reportLib.PREFIX_URGENT === '[APCS Urgent]', reportLib.PREFIX_URGENT);
  ok('the bug prefix is the exact string', reportLib.PREFIX_BUG === '[APCS Bug]', reportLib.PREFIX_BUG);
  ok('the suggestion prefix is the exact string', reportLib.PREFIX_SUGGESTION === '[APCS Suggestion]', reportLib.PREFIX_SUGGESTION);

  // And the vague marker lands AFTER the prefix, never before it.
  const vagueSubject = reportLib.subjectFor({
    category: 'bug_report', severity: 'normal', pageUrl: '/pages/x', vague: true,
  });
  ok('a vague report still starts with its prefix', vagueSubject.startsWith('[APCS Bug] '), vagueSubject);
  ok('the vague marker is present', vagueSubject.includes('(vague)'), vagueSubject);

  // ── 11) Header safety ────────────────────────────────────────────────────
  //
  // TWO separate surfaces, and mutation testing is what showed they are not the
  // same test. A page URL is run through the WHATWG URL parser by pagePath(),
  // and that parser strips CR, LF and TAB on its own, so the first assertion
  // below passes even with headerSafe removed entirely. It is still worth
  // keeping, because it pins the behaviour rather than the mechanism.
  //
  // The assertion with teeth is the second one: a SUGGESTION subject carries the
  // reporter's own text, which never goes near a URL parser. That is the value
  // headerSafe is actually the only thing standing in front of.
  const nasty = reportLib.subjectFor({
    category: 'bug_report', severity: 'normal',
    pageUrl: '/pages/x\r\nBcc: attacker@example.com',
  });
  ok('a newline in the page URL cannot reach the subject line',
    !/[\r\n]/.test(nasty), JSON.stringify(nasty));

  const nastyText = reportLib.subjectFor({
    category: 'suggestion', severity: 'normal', pageUrl: '/pages/x',
    summary: 'add dark mode\r\nBcc: attacker@example.com\r\nSubject: spoofed',
  });
  ok('a newline in the reporter TEXT cannot reach the subject line',
    !/[\r\n]/.test(nastyText), JSON.stringify(nastyText));
  ok('and the injected header name does not survive as a new line',
    !/^Bcc:/m.test(nastyText), JSON.stringify(nastyText));

  // The same value going into a header VALUE is scrubbed by the mailer, which is
  // the other end of the same problem. Asserted here because nothing else does.
  const hdrSafe = reportLib.headerSafe('a\r\nb\tc', 200);
  ok('headerSafe flattens CR, LF and TAB', hdrSafe === 'a b c', JSON.stringify(hdrSafe));
  ok('headerSafe strips other control characters',
    reportLib.headerSafe('a\u0001b\u007fc', 200) === 'abc',
    JSON.stringify(reportLib.headerSafe('a\u0001b\u007fc', 200)));

  // ── 12) notifyStatus tells an operator what is actually configured ───────
  const st = reportLib.notifyStatus();
  ok('notifyStatus reports the from DOMAIN', typeof st.from_domain === 'string' && st.from_domain.includes('.'), st);
  ok('the default from domain is the Resend-verified subdomain',
    st.from_domain === 'mail.apcsexamprep.com', st.from_domain);
  ok('notifyStatus reports the email mode', st.email_mode === 'each', st.email_mode);
  ok('notifyStatus reports whether todos are filed', st.files_todos === false, st.files_todos);
  ok('notifyStatus still leaks no address',
    !JSON.stringify(st).includes('owner@example.test'), st);

  console.log(`\n${pass} passed, ${fail} failed`);
  mailer.sendEmail = realSend;
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  server.close();
  process.exit(1);
});
