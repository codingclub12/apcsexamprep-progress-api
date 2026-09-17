'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SITE ASSISTANT: CLOSING THE LOOP  (handoff section 5)
//
//  "You flagged a problem on <page>. It's fixed now. Thanks for telling us."
//
//  One email, per report, ever. The rule that makes this safe to run from a
//  scheduled job is that SENDING IS A WRITE: thanked_at is stamped in the same
//  breath, and a row with thanked_at set is never picked up again. A morning
//  routine that re-reads yesterday's fixed reports must not mail the same
//  teacher every morning until they stop reading their email.
//
//  WHO GETS ONE. Only a reporter who left an address, which only ever happens
//  where lib/assistant/scope.js allowed typed text in the first place. A student
//  never has one by construction, so this path cannot mail a minor: there is no
//  address on the row to mail.
//
//  THREADED DUPLICATES. Section 5 says to notify every reporter in the thread
//  who left an email, which is right and is the whole reason a thread key is
//  stored. Five teachers who reported the same broken page each hear that it is
//  fixed, once each, and none of them hears about the other four.
//
//  NEVER for a dismissed or duplicate row. Dismissed means the junk filter or a
//  human decided it was not real, and mailing "we fixed it" about something
//  nobody fixed is worse than silence.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../../db');
const mailer = require('../mailer');
const report = require('./report');

// Statuses a thank-you may be sent for. 'fixed' is the only one, written out as
// a set so that adding another is a deliberate edit rather than a loosened
// comparison somewhere.
const THANKABLE = new Set(['fixed']);

const stRow = db.prepare('SELECT * FROM chat_escalations WHERE id = ?');
const stMarkThanked = db.prepare(
  "UPDATE chat_escalations SET thanked_at = datetime('now') WHERE id = ? AND thanked_at IS NULL"
);

// Everyone in the thread who left an address and has not been thanked. The
// window is 30 days rather than 24 hours: the thread that GROUPS reports is a
// day long, but a fix can land a week later and those people still asked.
const stThreadPending = db.prepare(`
  SELECT id, reporter_email, page_url, status
  FROM chat_escalations
  WHERE thread_key = ?
    AND reporter_email IS NOT NULL
    AND thanked_at IS NULL
    AND status NOT IN ('dismissed', 'duplicate')
    AND created_at >= datetime('now', '-30 days')
`);

function pageLabel(pageUrl) {
  const p = report.pagePath(pageUrl);
  return p || 'a page you reported';
}

// The message. Short on purpose: this is a courtesy, and a courtesy that reads
// like a newsletter is an unsubscribe.
function body(row) {
  return [
    `You flagged a problem on ${pageLabel(row.page_url)}.`,
    '',
    "It's fixed now. Thanks for telling us.",
    row.resolution_note ? '' : null,
    row.resolution_note ? `What changed: ${row.resolution_note}` : null,
    '',
    'You do not need to reply to this.',
    '',
    'AP CS Exam Prep',
  ].filter((l) => l !== null).join('\n');
}

function subject(row) {
  // Deliberately NOT one of the three Outlook rule prefixes. This goes to a
  // teacher, not to Tanner, and it must not be sorted by rules written for the
  // inbound side.
  return report.headerSafe(`Fixed: ${pageLabel(row.page_url)}`, 200);
}

// Send one thank-you for one row. Returns { sent, reason? }. Never throws.
//
// The order is: CLAIM the row, then send. Stamping thanked_at first means a
// provider error costs one lost thank-you rather than risking a loop that mails
// every time it fails. That is the right way round for a courtesy: the failure
// this must never have is sending it twice.
async function thank(id) {
  let row;
  try { row = stRow.get(id); } catch (_) { row = null; }
  if (!row) return { sent: false, reason: 'no_such_report' };
  if (!row.reporter_email) return { sent: false, reason: 'no_reporter_email' };
  if (row.thanked_at) return { sent: false, reason: 'already_thanked' };
  if (!THANKABLE.has(row.status)) return { sent: false, reason: 'status_' + row.status };

  const claimed = stMarkThanked.run(id);
  if (!claimed.changes) return { sent: false, reason: 'already_thanked' };

  try {
    await mailer.sendEmail({
      to: row.reporter_email,
      subject: subject(row),
      text: body(row),
    });
    return { sent: true };
  } catch (e) {
    console.error('[assistant/thanks] send failed:', e.message);
    return { sent: false, reason: e.message };
  }
}

// Mark a report fixed and thank everyone in its thread who asked to be told.
// Returns { status, thanked: [...], skipped: [...] }.
//
// This is the function PR 3's PATCH /api/assistant/reports/:id calls. It lives
// here rather than in the route so the section 7 acceptance check ("setting a
// report to fixed sends exactly one thank-you") can be run without HTTP.
async function markFixed(id, note) {
  let row;
  try { row = stRow.get(id); } catch (_) { row = null; }
  if (!row) return { status: null, thanked: [], skipped: [], error: 'no_such_report' };

  try {
    db.prepare("UPDATE chat_escalations SET status = 'fixed', resolution_note = ?, resolved_at = datetime('now') WHERE id = ?")
      .run(note || null, id);
  } catch (e) {
    return { status: row.status, thanked: [], skipped: [], error: e.message };
  }

  // Everyone in the thread, not just the row that was patched. Handoff section 5.
  let pending = [];
  try { pending = row.thread_key ? stThreadPending.all(row.thread_key) : []; } catch (_) { pending = []; }
  // The patched row itself, in case it has no thread key.
  if (!pending.some((p) => p.id === id)) pending.push({ id });

  const thanked = [], skipped = [];
  for (const p of pending) {
    // Only rows that are themselves fixed get thanked. A second report on the
    // same page that a human left open is not something to claim credit for.
    let r;
    try { r = stRow.get(p.id); } catch (_) { r = null; }
    if (!r) continue;
    if (r.id !== id && r.status !== 'fixed') { skipped.push({ id: r.id, reason: 'not_fixed' }); continue; }
    const out = await thank(p.id);
    if (out.sent) thanked.push(p.id);
    else skipped.push({ id: p.id, reason: out.reason });
  }
  return { status: 'fixed', thanked, skipped };
}

// Everyone in a thread who would be thanked. Read-only, for the morning report.
function pendingInThread(threadKey) {
  try { return threadKey ? stThreadPending.all(threadKey) : []; } catch (_) { return []; }
}

module.exports = { thank, markFixed, pendingInThread, subject, body, pageLabel, THANKABLE };
