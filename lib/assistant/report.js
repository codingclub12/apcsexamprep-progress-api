'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SITE ASSISTANT: STRUCTURED PROBLEM REPORTS.
//
//  Phase 0 built this as "store it, file a board task, mail the owner". The
//  report-first rescope (docs/handoffs/Site-Assistant-Report-First.md, sections
//  2 and 3) changes the middle step and keeps the other two:
//
//    1. A row in chat_escalations. Still the record, still the only step allowed
//       to fail the request.
//    2. An EMAIL, every time, threaded so one broken page is one conversation
//       rather than thirty. This is now the primary output.
//    3. A board task only when REPORTS_FILE_TODOS is explicitly on. The code is
//       kept rather than deleted because the handoff says to keep it, and the
//       board is still the right destination if the mailbox stops being.
//
//  WHY THE BOARD STOPPED BEING THE DESTINATION. A task is a thing somebody has
//  to go and look at. Mail arrives where Tanner already is, and his Outlook
//  rules sort it on the subject prefix before he sees it. That is the entire
//  reason the prefixes below are exact strings with a comment saying not to
//  change them: a renamed prefix does not error, it silently stops being sorted.
//
//  PRIVACY, the part that is not negotiable and did not change:
//  A student never has typed text stored, and an anonymous caller on a
//  coursework page is treated as a student. What survives for those callers is
//  the category they picked and the machine context the browser produced, which
//  is the part a fix actually needs. See lib/assistant/scope.js retainsBodies
//  and docs/site-assistant-spec.md section 8. CLAUDE.md permits exactly one
//  table of student-typed free text and this is deliberately not a second.
//
//  That rule now also governs the MAIL, which the handoff does not discuss. Its
//  section 3.6 asks for "the user's words, verbatim" in the email body, and for
//  a caller whose words were never kept there are none: the body says so in a
//  sentence rather than inventing a paraphrase. Mailing text this repo refuses
//  to store would move that text from a database nobody reads into a mailbox
//  that syncs to a phone, which is not a smaller exposure.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const db = require('../../db');
const mailer = require('../mailer');
const { retainsBodies } = require('./scope');

// The escalation taxonomy from docs/site-assistant-spec.md section 9, plus
// 'suggestion' from handoff section 4.3. These values are the schema the digest
// groups against, so they are a closed set from day one rather than whatever a
// caller types.
//
// NOTE FOR ANYONE READING THE HANDOFF NEXT TO THIS: its section 4.2 table lists
// user-facing labels and maps them onto these names. The names here are the
// authority, and all five the handoff names already existed.
const CATEGORIES = [
  'access_not_showing', 'student_join_failure', 'gradebook_missing_scores',
  'content_error', 'progression_gate', 'password_reset', 'procurement',
  'presale', 'it_whitelisting', 'pacing_selfstudy', 'assessment_visibility',
  'bug_report', 'suggestion', 'other',
];
const CATEGORY_SET = new Set(CATEGORIES);

// Categories the SERVER raises and a client may not. Deliberately kept out of
// CATEGORY_SET, which is what the public POST validates against: key_leak_blocked
// is 'immediate' by rule below, so putting it in the postable list would hand
// anyone on the internet a button that pages Tanner. It means one thing only,
// that lib/assistant/output-filter.js stopped a reply, and only that code path
// may say so. ALL_CATEGORIES is the union, for anything reading stored rows back.
const INTERNAL_CATEGORIES = ['key_leak_blocked'];
const ALL_CATEGORIES = CATEGORIES.concat(INTERNAL_CATEGORIES);

// Hard caps. This runs on a 1 vCPU / 1 GB box whose last unbounded structure
// cost $169, and the endpoint is public. Every string that reaches the database
// is truncated here, at the edge, rather than trusted to be small.
const LIMITS = {
  summary: 2000,      // free text, only ever stored for an adult caller
  pageUrl: 500,
  pageTitle: 200,
  userAgent: 300,
  consoleErrors: 10,  // count
  consoleError: 500,  // each
  detailJson: 8000,   // the serialized blob, after assembly
  reporterEmail: 200,
  field: 120,         // one category-specific form field
};

// A public write endpoint needs a ceiling that is not per IP, because per-IP
// limits do nothing against a distributed flood. This is the disk guard.
const MAX_REPORTS_PER_DAY = 500;

// A separate, much lower ceiling on how many NEW board tasks reports may open in
// a day. Only reachable when REPORTS_FILE_TODOS is on. The row ceiling protects
// the disk; this protects the board, which is a human's working surface.
const MAX_NEW_TASKS_PER_DAY = 25;

function clip(v, n) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.length > n ? t.slice(0, n) : t;
}

// ── FLAGS ────────────────────────────────────────────────────────────────────
//
// Read at call time rather than captured at module load, so a Railway variable
// change takes effect on the next request instead of the next deploy. Each has a
// default that is the shipped behaviour, so an environment with none of them set
// behaves exactly as the handoff describes.

function envOn(name, dflt) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || String(raw).trim() === '') return dflt;
  const v = String(raw).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'on' || v === 'yes';
}

// Handoff 3.1: "Stop calling the TODO API from the report path. Leave the code
// behind a flag REPORTS_FILE_TODOS=false so it can come back." Off is the
// shipped default; the code below is intact and one variable away.
function filesTodos() { return envOn('REPORTS_FILE_TODOS', false); }

// Handoff 3.1: each | digest. Urgent always sends immediately in both modes.
function emailMode() {
  const v = String(process.env.REPORT_EMAIL_MODE || 'each').trim().toLowerCase();
  return v === 'digest' ? 'digest' : 'each';
}

// Where the mail goes. REPORTS_TO is the handoff's name; the two older names are
// read after it so an environment configured for Phase 0 keeps working.
function recipient() {
  return process.env.REPORTS_TO
    || process.env.ASSISTANT_ALERT_EMAIL
    || process.env.COMMAND_OWNER_EMAIL
    || null;
}

// Where an admin can read one report. Used in the email footer, handoff 3.6.
function adminBase() {
  return (process.env.PUBLIC_API_BASE || 'https://progress.apcsexamprep.com').replace(/\/+$/, '');
}

// ── URGENCY (handoff 3.3) ────────────────────────────────────────────────────
//
// Three triggers are added and the Phase 0 ones are kept, which the handoff asks
// for explicitly. Both sets are below, existing first.
//
// The text detectors only ever run on text that was RETAINED, so they never run
// on a student's words: those do not exist by the time this is called. That is
// not a gap. The category alone raises the assessment case, which is the one
// that matters most, and a student picking "my class cannot get in" carries the
// category too.

// Phrases that mean an assessment is in front of the wrong eyes. Deliberately
// broad: a false immediate costs one email Tanner reads anyway, and a false
// normal costs a live answer key.
const LEAK_PHRASES = [
  'answer key', 'answers key', 'the answers', 'see the test', 'see the quiz',
  'sees the test', 'sees the quiz', 'seeing the test', 'seeing the quiz',
  'unit test', 'teacher material', 'teacher materials', 'teacher guide',
  'students can see', 'student can see', 'kids can see', 'class can see',
  'showing the answers', 'shows the answers', 'shows answers',
  'answers are showing', 'answers showing', 'can see the answers',
  'exposed the answers', 'answer sheet',
];

// Phrases that mean a whole group is locked out rather than one person. One
// teacher who cannot sign in is a support ticket. Thirty students who cannot is
// a lesson that is not happening right now.
const WHOLE_CLASS_PHRASES = [
  'whole class', 'entire class', 'all my students', 'all of my students',
  'none of my students', 'no one can', 'nobody can', 'no students can',
  'all students', 'my class cannot', 'my class can not', 'my class cant',
  "my class can't", 'class cannot join', 'class can not join', 'nobody is able',
  'none of them can', 'no one is able', 'whole period', 'entire period',
];

function mentionsAny(text, phrases) {
  if (!text) return false;
  const t = String(text).toLowerCase();
  return phrases.some((p) => t.includes(p));
}

// Reports are almost never 'immediate'. Everything that raises one is either a
// server-raised category, an assessment category, or an explicit statement in
// retained text. A public form defaulting to 'immediate' is how a pager becomes
// noise, so the default is still 'normal'.
//
// `aiSeverity` is the model's read from lib/assistant/junk-filter.js, and it can
// only raise urgency for a VERIFIED TEACHER, which is what handoff 3.3's third
// bullet says. A model free to call an anonymous form post high severity would
// hand the internet a pager by a longer route than the category list refuses.
function severityFor(category, role, opts) {
  const o = opts || {};
  const text = o.summary || '';

  // Suggestions are never urgent, handoff 4.3. Checked first so nothing below
  // can raise one: a suggestion containing the words "answer key" is a person
  // proposing something about answer keys, not an incident.
  if (category === 'suggestion') return 'normal';

  // ── the Phase 0 rules, unchanged ──
  // The layer 6 tripwire firing means one of the five layers in front of it is
  // broken on an assessment product. Immediate regardless of role.
  if (category === 'key_leak_blocked') return 'immediate';
  if (category === 'assessment_visibility' && role === 'teacher') return 'immediate';

  // ── handoff 3.3 ──
  // "A report says students can see tests, quizzes, answer keys, or teacher
  // materials." The category says it on its own, from any role. The Phase 0 rule
  // above required a teacher, and an anonymous caller reporting a live answer key
  // is still reporting a live answer key.
  if (category === 'assessment_visibility') return 'immediate';
  if (mentionsAny(text, LEAK_PHRASES)) return 'immediate';

  // "A report says a whole class cannot join or cannot access purchased content."
  if ((category === 'student_join_failure' || category === 'access_not_showing')
      && mentionsAny(text, WHOLE_CLASS_PHRASES)) {
    return 'immediate';
  }

  // "Any report from a verified teacher session with severity classified high."
  if (role === 'teacher' && o.aiSeverity === 'high') return 'immediate';

  return 'normal';
}

// ── THREADING (handoff 3.4) ──────────────────────────────────────────────────
//
// "Same page path + category within 24 hours goes into the same email thread."
//
// The key is the PATH, not the URL: the same page reached with a ?utm tag is the
// same page, and a thread that splits on a query string is not a thread.
function pagePath(pageUrl) {
  if (!pageUrl) return null;
  try {
    const u = new URL(String(pageUrl), 'https://apcsexamprep.com');
    return (u.pathname || '/').replace(/\/+$/, '') || '/';
  } catch (_) {
    return null;
  }
}

function threadKey(pageUrl, category) {
  return `${pagePath(pageUrl) || '(nopage)'}|${category}`;
}

// The head of this thread inside the window, if there is one: the earliest row
// that actually got a Message-ID, which is the message everything else replies
// to. A row that was stored but never mailed has no Message-ID and correctly
// does not become a thread head.
const stThreadHead = db.prepare(`
  SELECT id, thread_message_id, created_at
  FROM chat_escalations
  WHERE thread_key = ?
    AND created_at >= datetime('now', '-24 hours')
    AND thread_message_id IS NOT NULL
  ORDER BY created_at ASC
  LIMIT 1
`);

// How many rows are already in this thread's window, so the follow-up body can
// say "Report 3 of 3 for this page today" without a second pass.
const stThreadCount = db.prepare(`
  SELECT COUNT(*) n FROM chat_escalations
  WHERE thread_key = ? AND created_at >= datetime('now', '-24 hours')
`);

// Every reporter in the thread who left an address. Handoff section 5: "For
// threaded duplicates, notify every reporter in the thread who left an email."
const stThreadReporters = db.prepare(`
  SELECT id, reporter_email FROM chat_escalations
  WHERE thread_key = ? AND reporter_email IS NOT NULL
    AND created_at >= datetime('now', '-30 days')
`);

function threadState(key) {
  let head = null, count = 0;
  try { head = stThreadHead.get(key) || null; } catch (_) { /* pre-migration */ }
  try { count = stThreadCount.get(key).n || 0; } catch (_) { /* pre-migration */ }
  return { head, count };
}

function threadReporters(key) {
  try { return stThreadReporters.all(key) || []; } catch (_) { return []; }
}

// ── SUBJECTS (handoff 3.2) ───────────────────────────────────────────────────
//
//  DO NOT CHANGE THESE THREE PREFIXES WITHOUT TELLING TANNER. His Outlook rules
//  match on them and a renamed prefix fails silently: the mail still arrives, it
//  just stops being labelled and stops being filed, and nothing says so.
//  smoke/assistant-report-routing.js asserts all three byte for byte.
//
//    [APCS Urgent] <category>: <page path>      red, high importance, Inbox
//    [APCS Bug] <category>: <page path>         orange, Site Feedback
//    [APCS Suggestion] <page path>: <first 60>  blue, Site Feedback
//
//  The morning mail's [APCS Morning] prefix is deliberately none of these so it
//  stays in the Inbox. Handoff 6.2.
const PREFIX_URGENT = '[APCS Urgent]';
const PREFIX_BUG = '[APCS Bug]';
const PREFIX_SUGGESTION = '[APCS Suggestion]';

// A subject is a header field and some of what reaches it came from a
// caller-supplied URL. Control characters have no business in one either way.
function headerSafe(s, n) {
  return String(s == null ? '' : s)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\u0000-\u001f\u007f]+/g, '')
    .trim()
    .slice(0, n || 200);
}

function subjectFor({ category, severity, pageUrl, summary, vague }) {
  const path = pagePath(pageUrl) || '(no page)';
  let s;
  if (category === 'suggestion') {
    const first = headerSafe(summary || '(no text)', 60);
    s = `${PREFIX_SUGGESTION} ${path}: ${first}`;
  } else if (severity === 'immediate') {
    s = `${PREFIX_URGENT} ${category}: ${path}`;
  } else {
    s = `${PREFIX_BUG} ${category}: ${path}`;
  }
  // Handoff 3.5 layer 3: "vague is emailed with (vague) appended to the subject
  // AFTER the prefix, so rules still match". Appended at the END, which is after
  // the prefix and cannot displace it. Putting it immediately behind the prefix
  // would also satisfy the letter of that sentence, and would break a rule set
  // to match the whole "[APCS Bug] <category>" shape, so the end is the safe
  // reading of an ambiguous line.
  if (vague) s += ' (vague)';
  return headerSafe(s, 200);
}

// ── EMAIL BODY (handoff 3.6) ─────────────────────────────────────────────────
//
// Plain and scannable, in the order the handoff lists. Text only: this is mail
// to one person who wants to read it on a phone at 6am, and an HTML template is
// a thing that breaks in Outlook for no benefit here.
function bodyFor(r) {
  const {
    escalationId, category, severity, role, pageUrl, pageScope, summary, detail,
    bodiesRetained, aiSummary, junkLabel, contactEmail, contactName, school,
    reporterEmail, threadSeq, threadTotal, todoId,
  } = r;

  const lines = [];

  if (threadSeq && threadTotal && threadTotal > 1) {
    // Handoff 3.4: the follow-up leads with its position, because the reason
    // this mail is in an existing thread is the most useful thing about it.
    lines.push(`Report ${threadSeq} of ${threadTotal} for this page today.`);
    lines.push('');
  }

  lines.push(`Category:  ${category}`);
  lines.push(`Severity:  ${severity}${junkLabel === 'vague' ? '  (model called this vague)' : ''}`);
  if (aiSummary) lines.push(`Summary:   ${aiSummary}`);
  lines.push('');

  // The user's own words, verbatim, when there are any to quote.
  if (bodiesRetained) {
    lines.push('What they said:');
    lines.push(summary || '(nothing typed)');
  } else {
    lines.push('No reporter text. The caller is a student, or anonymous on a');
    lines.push('coursework page, so nothing typed was stored. Category and machine');
    lines.push('context only, per the zero-PII posture.');
  }
  lines.push('');

  lines.push(`Page:      ${pageUrl || '(none)'}`);
  if (detail && detail.pageTitle) lines.push(`Title:     ${detail.pageTitle}`);
  lines.push(`Role:      ${role}`);
  lines.push(`Scope:     ${pageScope}`);
  lines.push(`Browser:   ${(detail && detail.userAgent) || '(none)'}`);
  if (contactName) lines.push(`Name:      ${contactName}`);
  if (contactEmail) lines.push(`Account:   ${contactEmail}`);
  if (school) lines.push(`School:    ${school}`);
  if (reporterEmail) lines.push(`Reply to:  ${reporterEmail}`);
  lines.push('');

  const errs = (detail && detail.consoleErrors) || [];
  if (errs.length) {
    lines.push(`Console (${errs.length}):`);
    for (const e of errs) lines.push('  ' + e);
  } else {
    lines.push('Console: nothing buffered.');
  }
  lines.push('');

  lines.push(`Report ID: ${escalationId}`);
  lines.push(`Admin:     ${adminBase()}/admin/reports#${escalationId}`);
  if (todoId) lines.push(`Board:     task ${todoId}`);

  return lines.join('\n');
}

// ── STORE ────────────────────────────────────────────────────────────────────

const stInsert = db.prepare(`
  INSERT INTO chat_escalations
    (id, session_id, category, severity, role, user_ref, page_url, page_scope, course,
     contact_email, contact_name, school, summary, detail_json, bodies_retained, ip_hash, status,
     thread_key, reporter_email, junk_label, junk_reason, ai_summary, ai_severity, email_status)
  VALUES
    (@id, @session_id, @category, @severity, @role, @user_ref, @page_url, @page_scope, @course,
     @contact_email, @contact_name, @school, @summary, @detail_json, @bodies_retained, @ip_hash, @status,
     @thread_key, @reporter_email, @junk_label, @junk_reason, @ai_summary, @ai_severity, @email_status)
`);
const stSetTodo = db.prepare('UPDATE chat_escalations SET todo_id = ? WHERE id = ?');
const stCountToday = db.prepare(
  "SELECT COUNT(*) n FROM chat_escalations WHERE created_at >= datetime('now','start of day')"
);
const stSetThread = db.prepare(
  'UPDATE chat_escalations SET thread_message_id = ?, thread_seq = ? WHERE id = ?'
);
const stSetEmail = db.prepare(
  "UPDATE chat_escalations SET email_status = ?, email_sent_at = CASE WHEN ? = 'sent' THEN datetime('now') ELSE email_sent_at END WHERE id = ?"
);
const stSetVerdict = db.prepare(
  'UPDATE chat_escalations SET junk_label = ?, junk_reason = ?, ai_summary = ?, ai_severity = ?, severity = ?, status = ? WHERE id = ?'
);

function overDailyCap() {
  try { return stCountToday.get().n >= MAX_REPORTS_PER_DAY; } catch (_) { return false; }
}

// Tasks this endpoint opened today. Counted off the fingerprint prefix rather
// than a new column, since every task it files carries one by construction.
function boardBudgetSpent() {
  try {
    const row = db.prepare(
      "SELECT COUNT(*) n FROM tasks WHERE check_fingerprint LIKE 'ar-%' AND created_at >= datetime('now','start of day')"
    ).get();
    return row.n >= MAX_NEW_TASKS_PER_DAY;
  } catch (_) {
    return false; // no board schema: filing will fail its own way, not here
  }
}

// One broken page reported by a whole class is ONE task. The fingerprint is the
// page, the category, and the first console error's shape, so a genuinely
// different failure on the same page still opens its own task.
function fingerprint({ pageUrl, category, consoleErrors }) {
  const errShape = (consoleErrors && consoleErrors[0] ? String(consoleErrors[0]) : '')
    .replace(/\d+/g, '#').slice(0, 200);
  const basis = `assistant-report|${pageUrl || ''}|${category}|${errShape}`;
  return 'ar-' + crypto.createHash('sha256').update(basis).digest('hex').slice(0, 32);
}

// Store the report. This is the only step allowed to fail the request, because
// it is the only step whose failure means the report does not exist.
function store(input) {
  const {
    category, role, userRef, pageUrl, pageScope, course,
    contactEmail, contactName, school, summary, detail, ipHash, sessionId,
    reporterEmail, severity, junkLabel, junkReason, aiSummary, aiSeverity, status,
  } = input;

  const keepBodies = retainsBodies(role, pageScope);
  const id = 'esc_' + crypto.randomBytes(12).toString('hex');
  const row = {
    id,
    // NULL for a form report, which has no chat session. Chat passes one, so a
    // chat-raised escalation links back to the conversation that produced it.
    session_id: sessionId || null,
    category,
    severity: severity || severityFor(category, role, { summary: keepBodies ? summary : null }),
    role,
    user_ref: userRef || null,
    page_url: pageUrl || null,
    page_scope: pageScope,
    course: course || null,
    // Contact details are only ever the caller's OWN, read from their verified
    // token. Nothing here is client-supplied, so a student cannot be made to
    // carry an email by a crafted payload; students have none by construction.
    contact_email: keepBodies ? (contactEmail || null) : null,
    contact_name: keepBodies ? (contactName || null) : null,
    school: keepBodies ? (school || null) : null,
    summary: keepBodies ? (summary || null) : null,
    detail_json: JSON.stringify(detail).slice(0, LIMITS.detailJson),
    bodies_retained: keepBodies ? 1 : 0,
    ip_hash: ipHash || null,
    status: status || 'open',
    thread_key: threadKey(pageUrl, category),
    // The "tell me when it is fixed" address is CLIENT-SUPPLIED, unlike
    // contact_email above, so it is gated on the same retention rule as the
    // prose. A minor cannot be made to carry an address by a crafted payload.
    reporter_email: keepBodies ? (reporterEmail || null) : null,
    junk_label: junkLabel || null,
    junk_reason: junkReason || null,
    ai_summary: aiSummary || null,
    ai_severity: aiSeverity || null,
    email_status: null,
  };
  stInsert.run(row);
  return { id, severity: row.severity, bodiesRetained: keepBodies, threadKey: row.thread_key };
}

// Record the model's verdict on a row that is already stored. Separate from
// store() because the row has to be durable BEFORE a model is asked anything: a
// timeout on the triage call must cost a label, never a report.
function recordVerdict(id, { junkLabel, junkReason, aiSummary, aiSeverity, severity, status }) {
  try {
    stSetVerdict.run(
      junkLabel || null, junkReason || null, aiSummary || null, aiSeverity || null,
      severity, status, id
    );
  } catch (e) {
    console.error('[assistant/report] verdict write failed:', e.message);
  }
}

function markEmail(id, status) {
  try { stSetEmail.run(status, status, id); } catch (_) { /* pre-migration */ }
}

// ── BOARD FILING (off by default, handoff 3.1) ───────────────────────────────
//
// Kept whole rather than deleted. Never throws: a report that is stored but
// unfiled is a smaller problem than a 500 on a public endpoint.
function fileTodo({ escalationId, category, severity, role, pageUrl, pageScope, summary, detail, bodiesRetained, force }) {
  if (!force && !filesTodos()) {
    return { todoId: null, deduped: false, skipped: 'flag_off' };
  }
  try {
    const { createTask } = require('../command-write');

    if (boardBudgetSpent()) {
      return { todoId: null, deduped: false, skipped: 'board_budget' };
    }

    const where = pageUrl ? ` on ${pageUrl}` : '';
    const title = `Assistant report (${category})${where}`.slice(0, 200);

    const lines = [
      `Escalation: ${escalationId}`,
      `Category: ${category}   Severity: ${severity}`,
      `Reported by: ${role}   Page scope: ${pageScope}`,
      pageUrl ? `Page: ${pageUrl}` : null,
      detail.pageTitle ? `Title: ${detail.pageTitle}` : null,
      detail.userAgent ? `UA: ${detail.userAgent}` : null,
      '',
      bodiesRetained
        ? `Reporter said:\n${summary || '(nothing typed)'}`
        : 'Reporter text not stored: the caller is a student, or anonymous on a coursework page. Category and machine context only, per the zero-PII posture.',
      '',
      (detail.consoleErrors && detail.consoleErrors.length)
        ? `Console (${detail.consoleErrors.length}):\n` + detail.consoleErrors.map((e) => '  ' + e).join('\n')
        : 'Console: nothing buffered.',
    ].filter((l) => l !== null);

    const result = createTask({
      title,
      detail: lines.join('\n'),
      bucket: severity === 'immediate' ? 'now' : 'week',
      surface: 'api',
      size: 's',
      created_by: 'agent',
      check_fingerprint: fingerprint({ pageUrl, category, consoleErrors: detail.consoleErrors }),
    }, { actor: 'agent', cookie: false, scope: 'limited' });

    if (result && result.task && result.task.id) {
      stSetTodo.run(result.task.id, escalationId);
      return { todoId: result.task.id, deduped: !!result.deduped };
    }
    return { todoId: null, error: (result && result.error) || 'createTask returned no task' };
  } catch (e) {
    console.error('[assistant/report] board filing failed:', e.message);
    return { todoId: null, error: e.message };
  }
}

// ── THE MAIL ─────────────────────────────────────────────────────────────────
//
// Returns { status, messageId?, reason? } where status is one of the
// email_status values. Never throws.
//
// THREADING lives here rather than in the caller because the two decisions are
// the same decision: whether this is the head of a thread decides both which
// headers go on the message and whether a new Message-ID is minted.
async function mailReport(r) {
  const to = recipient();
  // 'no_recipient' as BOTH the status and the reason, deliberately. Phase 0
  // callers and smoke/assistant-report.js read the reason string, and a prettier
  // sentence here would break them for no gain.
  if (!to) return { status: 'no_recipient', reason: 'no_recipient' };

  const { head, count } = threadState(r.threadKey);
  const isFollowUp = !!(head && head.thread_message_id && head.id !== r.escalationId);

  const subject = subjectFor({
    category: r.category,
    severity: r.severity,
    pageUrl: r.pageUrl,
    summary: r.summary,
    vague: r.junkLabel === 'vague',
  });

  const headers = {};
  let messageId = null;
  if (isFollowUp) {
    // Quote the head so a mail client files this under it. Both headers, because
    // clients disagree about which one they honour.
    headers['In-Reply-To'] = head.thread_message_id;
    headers['References'] = head.thread_message_id;
    messageId = head.thread_message_id;
  } else {
    // Head of a new thread: mint the id now, so it can be stored against this row
    // and quoted by everything that follows.
    messageId = mailer.newMessageId();
    headers['Message-ID'] = messageId;
  }
  if (r.severity === 'immediate') {
    // Handoff 3.2: urgent stays in the Inbox with high importance. Outlook reads
    // both of these; neither is enough on its own across clients.
    headers['Importance'] = 'high';
    headers['X-Priority'] = '1';
  }

  const text = bodyFor(Object.assign({}, r, {
    threadSeq: count,
    threadTotal: count,
  }));

  try {
    const res = await mailer.sendEmail({
      to,
      subject,
      text,
      headers,
      // A reporter who left an address gets replies routed to them rather than
      // to the send-only mailbox. Only ever set where the address was retained.
      replyTo: r.reporterEmail || undefined,
    });
    // Record the head's Message-ID on THIS row only when this row is the head.
    // A follow-up storing it too would make every row look like a thread head
    // and the next report would pick the wrong one to reply to.
    if (!isFollowUp) {
      try { stSetThread.run(messageId, count, r.escalationId); } catch (_) { /* pre-migration */ }
    } else {
      try { stSetThread.run(null, count, r.escalationId); } catch (_) { /* pre-migration */ }
    }
    if (!res.sent) return { status: 'failed', reason: res.reason || 'not_sent', messageId };
    return { status: 'sent', messageId, threaded: isFollowUp, subject };
  } catch (e) {
    console.error('[assistant/report] mail failed:', e.message);
    return { status: 'failed', reason: e.message, messageId };
  }
}

// Phase 0's name for the same job, kept so nothing that imported it breaks.
// Its old signature took the fields loose; this forwards to mailReport.
async function mailOwner(r) {
  const out = await mailReport(Object.assign({}, r, {
    threadKey: r.threadKey || threadKey(r.pageUrl, r.category),
  }));
  return { sent: out.status === 'sent', reason: out.reason };
}

// ── DIGEST MODE (handoff 3.1) ────────────────────────────────────────────────
//
//  In digest mode a non-urgent report is STORED and HELD, and one mail goes at
//  7:00 America/Chicago carrying all of them. Urgent still sends immediately.
//
//  The 7am firing is not in this process. Nothing in this repo runs an in-process
//  scheduler and adding one to a container that restarts on every deploy would
//  make the send time a function of the last push. The trigger is the Daily site
//  audit task, which already runs on a schedule and already has the admin key;
//  wiring it is handoff section 6 and lands with that work. Until then this
//  function exists and is reachable through the admin endpoint, and the DEFAULT
//  MODE IS 'each', so nothing is stranded by the gap.
const stHeld = db.prepare(`
  SELECT id, category, severity, role, page_url, page_scope, summary, detail_json,
         bodies_retained, ai_summary, junk_label, reporter_email, created_at
  FROM chat_escalations
  WHERE email_status = 'held'
  ORDER BY created_at ASC
  LIMIT 200
`);
const stDismissedSince = db.prepare(`
  SELECT COUNT(*) n FROM chat_escalations
  WHERE status = 'dismissed' AND created_at >= ?
`);

function heldReports() {
  try { return stHeld.all() || []; } catch (_) { return []; }
}

function dismissedSince(iso) {
  try { return stDismissedSince.get(iso).n || 0; } catch (_) { return 0; }
}

// Send the held batch as one mail. Returns { sent, count, reason? }.
async function flushDigest() {
  const to = recipient();
  const rows = heldReports();
  if (!rows.length) return { sent: false, count: 0, reason: 'nothing_held' };
  if (!to) return { sent: false, count: rows.length, reason: 'no_recipient' };

  const day = new Date().toISOString().slice(0, 10);
  const lines = [
    `${rows.length} report${rows.length === 1 ? '' : 's'} held since the last digest.`,
    '',
  ];
  for (const r of rows) {
    let detail = {};
    try { detail = JSON.parse(r.detail_json || '{}'); } catch (_) { /* keep empty */ }
    lines.push('-'.repeat(60));
    lines.push(`${r.category}  (${r.severity})  ${pagePath(r.page_url) || '(no page)'}`);
    if (r.ai_summary) lines.push(`  ${r.ai_summary}`);
    if (r.bodies_retained && r.summary) lines.push(`  "${r.summary.slice(0, 400)}"`);
    if (!r.bodies_retained) lines.push('  (no reporter text: student or anonymous on coursework)');
    lines.push(`  ${r.created_at}  ${r.role}  ${r.id}`);
  }
  lines.push('-'.repeat(60));

  try {
    // Deliberately NOT one of the three rule prefixes. A digest is a batch and
    // should not be labelled as though it were a single bug.
    await mailer.sendEmail({
      to,
      subject: headerSafe(`[APCS Digest] ${day}: ${rows.length} reports`, 200),
      text: lines.join('\n'),
    });
  } catch (e) {
    console.error('[assistant/report] digest send failed:', e.message);
    return { sent: false, count: rows.length, reason: e.message };
  }
  for (const r of rows) markEmail(r.id, 'sent');
  return { sent: true, count: rows.length };
}

// ── HEALTH ───────────────────────────────────────────────────────────────────
//
// Can an escalation actually reach a person?
//
// Reported on /api/health because the failure is SILENT BY CONSTRUCTION. A report
// with no recipient configured is still stored, and the mail simply never goes,
// with nothing anywhere saying so. That is the exact shape of failure this repo
// has now paid for twice.
//
// Booleans and a domain, never an address: the answer is "will mail arrive", and
// the from domain is the part that decides whether the provider accepts the send
// at all. A From address is in the header of every message this sends, so the
// domain is not a secret; the recipient is a person and stays a boolean.
function notifyStatus() {
  const mail = mailer.mailerConfigured();
  const to = recipient();
  return {
    mail_configured: mail,       // RESEND_API_KEY is set
    recipient_set: !!to,         // REPORTS_TO / ASSISTANT_ALERT_EMAIL / COMMAND_OWNER_EMAIL
    can_notify: mail && !!to,
    from_domain: mailer.fromDomain(),
    email_mode: emailMode(),
    files_todos: filesTodos(),
  };
}

module.exports = {
  notifyStatus,
  CATEGORIES, CATEGORY_SET, INTERNAL_CATEGORIES, ALL_CATEGORIES, LIMITS,
  MAX_REPORTS_PER_DAY, MAX_NEW_TASKS_PER_DAY,
  PREFIX_URGENT, PREFIX_BUG, PREFIX_SUGGESTION,
  LEAK_PHRASES, WHOLE_CLASS_PHRASES,
  clip, severityFor, fingerprint, store, fileTodo, mailOwner, mailReport,
  overDailyCap, boardBudgetSpent,
  pagePath, threadKey, threadState, threadReporters, subjectFor, bodyFor, headerSafe,
  recordVerdict, markEmail, flushDigest, heldReports, dismissedSince,
  filesTodos, emailMode, recipient, envOn, adminBase,
};
