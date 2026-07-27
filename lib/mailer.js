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
//  Zero student PII: the only address this ever sends to is a teacher's own
//  email (teachers register with one; students never have an email).
// ─────────────────────────────────────────────────────────────────────────────
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'APCSExamPrep <noreply@apcsexamprep.com>';

function mailerConfigured() {
  return !!process.env.RESEND_API_KEY;
}

// Resolve the From header. Kept a function so a deploy can change MAIL_FROM
// without a code change.
function fromAddress() {
  return process.env.MAIL_FROM || DEFAULT_FROM;
}

// Send one email. Returns { sent: boolean, reason? }. Throws only on a real
// provider error (non-2xx from Resend), so callers can log-and-continue; the
// no-key path never throws.
async function sendEmail({ to, subject, html, text }) {
  if (!to) throw new Error('sendEmail: missing "to"');
  if (!mailerConfigured()) {
    console.warn(`[mailer] RESEND_API_KEY unset - not sending. to=${to} subject=${JSON.stringify(subject)}`);
    if (text) console.warn(`[mailer] (would send body)\n${text}`);
    return { sent: false, reason: 'no_api_key' };
  }
  const resp = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromAddress(), to, subject, html, text }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`Resend ${resp.status}: ${detail.slice(0, 300)}`);
  }
  return { sent: true };
}

module.exports = { sendEmail, mailerConfigured, fromAddress };
