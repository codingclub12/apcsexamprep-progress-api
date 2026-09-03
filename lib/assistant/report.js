'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SITE ASSISTANT, PHASE 0: structured problem reports.
//
//  This is the half of the assistant that works without a model, and it is the
//  half that compounds. A bug report that arrives as prose in an email costs a
//  round trip to find out which page, which browser, and what the console said.
//  A report that arrives with those three attached is reproducible on receipt.
//
//  Three things happen to a report, in this order, and only the first is allowed
//  to fail the request:
//    1. A row in chat_escalations. This is the record.
//    2. A task on the command board, deduped by fingerprint, so one broken page
//       is one task that ages rather than thirty tasks that arrive.
//    3. An email to the owner. Best effort; a mail outage must not lose a report
//       that is already stored.
//
//  PRIVACY, the part that is not negotiable:
//  A student never has typed text stored, and an anonymous caller on a
//  coursework page is treated as a student. What survives for those callers is
//  the category they picked and the machine context the browser produced, which
//  is the part a fix actually needs. See lib/assistant/scope.js retainsBodies
//  and docs/site-assistant-spec.md section 8. CLAUDE.md permits exactly one
//  table of student-typed free text and this is deliberately not a second.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const db = require('../../db');
const mailer = require('../mailer');
const { retainsBodies } = require('./scope');

// The escalation taxonomy from docs/site-assistant-spec.md section 9. These
// values are the schema the digest groups against, so they are a closed set from
// day one rather than whatever a caller types.
const CATEGORIES = [
  'access_not_showing', 'student_join_failure', 'gradebook_missing_scores',
  'content_error', 'progression_gate', 'password_reset', 'procurement',
  'presale', 'it_whitelisting', 'pacing_selfstudy', 'assessment_visibility',
  'bug_report', 'other',
];
const CATEGORY_SET = new Set(CATEGORIES);

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
};

// A public write endpoint needs a ceiling that is not per IP, because per-IP
// limits do nothing against a distributed flood. This is the disk guard.
const MAX_REPORTS_PER_DAY = 500;

// A separate, much lower ceiling on how many NEW board tasks reports may open in
// a day. The row ceiling protects the disk; this protects the board, which is a
// human's working surface and the thing that actually degrades if it fills with
// junk. Past this, reports are still stored and still mailed, they just stop
// creating tasks. Dedupe means normal traffic never comes close: one broken page
// is one task however many people report it.
const MAX_NEW_TASKS_PER_DAY = 25;

function clip(v, n) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.length > n ? t.slice(0, n) : t;
}

// Reports are almost never 'immediate'. The severities that page a human are
// decided by rule elsewhere (spec section 9) and none of their triggers can be
// established from an unauthenticated form post, so Phase 0 files 'normal' and
// lets the queue do its job. Defaulting a public form to 'immediate' is how a
// pager becomes noise.
function severityFor(category, role) {
  if (category === 'assessment_visibility' && role === 'teacher') return 'immediate';
  return 'normal';
}

// One broken page reported by a whole class is ONE task. The fingerprint is the
// page, the category, and the first console error's shape, so a genuinely
// different failure on the same page still opens its own task. tasks.
// check_fingerprint is UNIQUE and createTask returns the existing row on
// collision, so dedupe costs nothing here.
function fingerprint({ pageUrl, category, consoleErrors }) {
  // Strip digits out of the error so line numbers and ids do not defeat dedupe.
  const errShape = (consoleErrors && consoleErrors[0] ? String(consoleErrors[0]) : '')
    .replace(/\d+/g, '#').slice(0, 200);
  const basis = `assistant-report|${pageUrl || ''}|${category}|${errShape}`;
  return 'ar-' + crypto.createHash('sha256').update(basis).digest('hex').slice(0, 32);
}

const stInsert = db.prepare(`
  INSERT INTO chat_escalations
    (id, session_id, category, severity, role, user_ref, page_url, page_scope, course,
     contact_email, contact_name, school, summary, detail_json, bodies_retained, ip_hash, status)
  VALUES
    (@id, NULL, @category, @severity, @role, @user_ref, @page_url, @page_scope, @course,
     @contact_email, @contact_name, @school, @summary, @detail_json, @bodies_retained, @ip_hash, 'open')
`);
const stSetTodo = db.prepare('UPDATE chat_escalations SET todo_id = ? WHERE id = ?');
const stCountToday = db.prepare(
  "SELECT COUNT(*) n FROM chat_escalations WHERE created_at >= datetime('now','start of day')"
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

// Store the report. This is the only step allowed to fail the request, because
// it is the only step whose failure means the report does not exist.
function store(input) {
  const {
    category, role, userRef, pageUrl, pageScope, course,
    contactEmail, contactName, school, summary, detail, ipHash,
  } = input;

  const keepBodies = retainsBodies(role, pageScope);
  const id = 'esc_' + crypto.randomBytes(12).toString('hex');
  const row = {
    id,
    category,
    severity: severityFor(category, role),
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
  };
  stInsert.run(row);
  return { id, severity: row.severity, bodiesRetained: keepBodies };
}

// File the board task. Never throws: a report that is stored but unfiled is a
// smaller problem than a 500 on a public endpoint, and the row is still there to
// file later.
function fileTodo({ escalationId, category, severity, role, pageUrl, pageScope, summary, detail, bodiesRetained }) {
  try {
    const { createTask } = require('../command-write');

    // An existing task for this exact failure is reused by createTask's
    // fingerprint dedupe, so the budget only ever blocks genuinely new ones.
    if (boardBudgetSpent()) {
      return { todoId: null, deduped: false, skipped: 'board_budget' };
    }

    const where = pageUrl ? ` on ${pageUrl}` : '';
    const title = `Assistant report (${category})${where}`.slice(0, 200);

    // The detail is written for whoever opens the task cold. It carries the
    // machine context always, and the reporter's words only when they were an
    // adult whose words we are allowed to keep.
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

// Mail the owner. Best effort, always. lib/mailer logs instead of sending when
// RESEND_API_KEY is unset, so this is a no-op-with-a-log until that is set,
// which is exactly the Phase 0 prerequisite.
async function mailOwner({ escalationId, category, severity, role, pageUrl, pageScope, summary, detail, bodiesRetained, todoId, contactEmail, contactName, school }) {
  const to = process.env.ASSISTANT_ALERT_EMAIL || process.env.COMMAND_OWNER_EMAIL;
  if (!to) return { sent: false, reason: 'no_recipient' };

  const body = [
    `Category:  ${category}`,
    `Severity:  ${severity}`,
    `Role:      ${role}`,
    `Scope:     ${pageScope}`,
    `Page:      ${pageUrl || '(none)'}`,
    detail.pageTitle ? `Title:     ${detail.pageTitle}` : null,
    contactName ? `Name:      ${contactName}` : null,
    contactEmail ? `Email:     ${contactEmail}` : null,
    school ? `School:    ${school}` : null,
    `UA:        ${detail.userAgent || '(none)'}`,
    `Board:     ${todoId ? 'task ' + todoId : 'not filed'}`,
    `Record:    ${escalationId}`,
    '',
    bodiesRetained
      ? `What they said:\n${summary || '(nothing typed)'}`
      : 'No reporter text: student or anonymous-on-coursework, so nothing typed was stored.',
    '',
    (detail.consoleErrors && detail.consoleErrors.length)
      ? `Console (${detail.consoleErrors.length}):\n` + detail.consoleErrors.map((e) => '  ' + e).join('\n')
      : 'Console: nothing buffered.',
  ].filter((l) => l !== null).join('\n');

  try {
    // pageUrl is caller-supplied and lands in a header field. Control characters
    // have no business in a subject line regardless of whether this provider
    // could be tricked by them.
    const subject = `[assistant] ${severity} ${category}${pageUrl ? ' on ' + pageUrl : ''}`
      .replace(/[\r\n\t\u0000-\u001f]+/g, ' ').slice(0, 200);
    await mailer.sendEmail({ to, subject, text: body });
    return { sent: true };
  } catch (e) {
    console.error('[assistant/report] mail failed:', e.message);
    return { sent: false, reason: e.message };
  }
}

// Can an escalation actually reach a person?
//
// This is reported on /api/health for the same reason integrity, reporters and
// seed are: the failure is SILENT BY CONSTRUCTION. A report with no recipient
// configured is still stored and still filed on the board, and the mail simply
// never goes, with nothing anywhere saying so. That is the exact shape of
// failure this repo has now paid for twice.
//
// Booleans only, no addresses: the answer is "will mail arrive", not "to whom".
function notifyStatus() {
  const recipient = !!(process.env.ASSISTANT_ALERT_EMAIL || process.env.COMMAND_OWNER_EMAIL);
  const mail = mailer.mailerConfigured();
  return {
    mail_configured: mail,       // RESEND_API_KEY is set
    recipient_set: recipient,    // ASSISTANT_ALERT_EMAIL or COMMAND_OWNER_EMAIL is set
    // Both, which is the only combination that delivers. Either one alone is a
    // report that is recorded and never seen.
    can_notify: mail && recipient,
  };
}

module.exports = {
  notifyStatus,
  CATEGORIES, CATEGORY_SET, LIMITS, MAX_REPORTS_PER_DAY, MAX_NEW_TASKS_PER_DAY,
  clip, severityFor, fingerprint, store, fileTodo, mailOwner,
  overDailyCap, boardBudgetSpent,
};
