'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Transactional email (Resend).
//
//  Sends through the Resend HTTP API when RESEND_API_KEY is set. Dependency-free:
//  a plain fetch POST, no SDK to add to the 1 GB box. Until the key + a verified
//  sending domain are configured, sendEmail falls back to LOGGING the message
//  (subject + text body) instead of throwing, so a password-reset link is still
//  recoverable from the server logs during setup and nothing silently breaks.
//
//  Config (Railway env):
//    RESEND_API_KEY  Resend API key. Absent => log-only fallback.
//    MAIL_FROM       From header, e.g. "APCSExamPrep <noreply@mail.apcsexamprep.com>".
//                    The domain must be verified in Resend or sends will 4xx.
//
//  THE FROM DOMAIN IS THE ONE THAT BITES, so it is stated here rather than
//  learned from a 403. Checked against public DNS on 2026-09-17: the verified
//  Resend sending domain is mail.apcsexamprep.com, which carries all three
//  records Resend requires (resend._domainkey DKIM, send. SPF include:amazonses.com,
//  send. MX to feedback-smtp.us-east-1.amazonses.com). The ROOT domain
//  apcsexamprep.com carries none of them and its SPF ends in -all, pointing at
//  Outlook and GoDaddy. So DEFAULT_FROM below is on the subdomain: the old
//  default was noreply@apcsexamprep.com, which is not a Resend-verified domain
//  and would have been refused by the provider on the first real send, with the
//  refusal landing in a log nobody reads.
//
//  Zero student PII: the only address this ever sends to is a teacher's own
//  email, or an address an adult reporter typed into the "tell me when it is
//  fixed" field. Students never have one.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
// The verified sending domain, not the apex. See the note above.
const DEFAULT_FROM = 'APCSExamPrep <reports@mail.apcsexamprep.com>';

function mailerConfigured() {
  return !!process.env.RESEND_API_KEY;
}

// Resolve the From header. Kept a function so a deploy can change MAIL_FROM
// without a code change. REPORTS_FROM is the name the report-first handoff uses
// and is read first, so the report path can send from a different address than
// password resets without either one needing a code change.
function fromAddress() {
  return process.env.REPORTS_FROM || process.env.MAIL_FROM || DEFAULT_FROM;
}

// The domain part of whatever From is resolved to, for /api/health. A From
// address is in the header of every message this sends, so it is not a secret,
// and the domain alone is the part that decides whether Resend accepts the send
// at all. Reporting it is what makes "the mail is configured" checkable rather
// than assertable.
function fromDomain() {
  const m = /@([^\s>]+)/.exec(fromAddress());
  return m ? m[1].toLowerCase() : null;
}

// Mint an RFC 5322 Message-ID. Threading needs a stable identifier that exists
// BEFORE the send, because the value has to be stored against the report row and
// quoted by every follow-up. Resend returns its own id, but that arrives after
// the fact and is not the Message-ID a mail client threads on.
//
// If Resend or the relay overrides the header, threading degrades to subject
// matching, which Outlook's conversation view does anyway; the follow-ups reuse
// the subject byte for byte for exactly that reason.
function newMessageId(domain) {
  const d = domain || fromDomain() || 'apcsexamprep.com';
  return `<${Date.now().toString(36)}.${crypto.randomBytes(12).toString('hex')}@${d}>`;
}

// Send one email. Returns { sent: boolean, id?, messageId?, reason? }. Throws
// only on a real provider error (non-2xx from Resend), so callers can
// log-and-continue; the no-key path never throws.
//
// `headers` is passed through to Resend verbatim and is how threading works:
// Message-ID on the first mail of a thread, In-Reply-To and References on the
// rest. Header values are scrubbed of CR and LF here rather than trusted,
// because some of what reaches them is derived from a caller-supplied URL.
async function sendEmail({ to, subject, html, text, headers, replyTo }) {
  if (!to) throw new Error('sendEmail: missing "to"');

  const clean = {};
  if (headers && typeof headers === 'object') {
    for (const [k, v] of Object.entries(headers)) {
      if (v === undefined || v === null) continue;
      const key = String(k).replace(/[^A-Za-z0-9-]/g, '');
      if (!key) continue;
      clean[key] = String(v).replace(/[\r\n]+/g, ' ').slice(0, 998);
    }
  }
  const hasHeaders = Object.keys(clean).length > 0;

  if (!mailerConfigured()) {
    console.warn(`[mailer] RESEND_API_KEY unset - not sending. to=${to} subject=${JSON.stringify(subject)}`);
    if (text) console.warn(`[mailer] (would send body)\n${text}`);
    // The Message-ID is still reported so a caller can store it and keep its
    // threading consistent across a period when mail was not configured. It
    // names a message that does not exist, which is strictly better than a NULL
    // that makes the next report open a second thread.
    return { sent: false, reason: 'no_api_key', messageId: clean['Message-ID'] || null };
  }

  const payload = { from: fromAddress(), to, subject, html, text };
  if (hasHeaders) payload.headers = clean;
  if (replyTo) payload.reply_to = replyTo;

  const resp = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`Resend ${resp.status}: ${detail.slice(0, 300)}`);
  }
  const json = await resp.json().catch(() => null);
  return {
    sent: true,
    id: (json && json.id) || null,
    messageId: clean['Message-ID'] || null,
  };
}

module.exports = { sendEmail, mailerConfigured, fromAddress, fromDomain, newMessageId, DEFAULT_FROM };
