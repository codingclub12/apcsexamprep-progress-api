'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  PASSWORD RESET TOKENS - the single definition of the reset-link contract.
//
//  Two callers mint these links and they must behave identically:
//    routes/teacher.js  /forgot-password  (self-service, emails the link)
//    routes/admin.js    /teacher/:id/reset-link  (owner generates it to relay
//                        by hand, for when email is not configured yet)
//  Keeping the TTL, the hashing, and the one-live-token-per-teacher rule here
//  means an owner-generated link can never be weaker or longer lived than an
//  emailed one.
//
//  SECURITY: the raw token is a 256-bit random value and is NEVER stored. Only
//  its SHA-256 hash goes in the table, so a leaked database row cannot be turned
//  back into a working link. Tokens are single-use and short-lived, and minting
//  a new one drops any previous token for that teacher.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const db = require('../db');
const { newId } = require('../utils');

// Reset links live for 24 hours. Raised from 45 minutes on 2026-08-20 at the
// owner's request: teachers check email between classes, and a window that
// closes before they look is a window that just generates another support ask.
// The tradeoff is real and deliberate. This link is a full account takeover for
// whoever holds it, it travels over email or text, and TTL is the only bound on
// that exposure, so the number belongs here and nowhere else.
const RESET_TTL_MIN = 24 * 60;

// How the TTL reads to a human. Everything user-facing must render this rather
// than interpolating the raw minutes, or a teacher gets told to act within
// "1440 minutes". Kept next to the constant so the two can never disagree.
const RESET_TTL_LABEL = (() => {
  if (RESET_TTL_MIN % (24 * 60) === 0) {
    const d = RESET_TTL_MIN / (24 * 60);
    return d === 1 ? '24 hours' : `${d} days`;
  }
  if (RESET_TTL_MIN % 60 === 0) {
    const h = RESET_TTL_MIN / 60;
    return h === 1 ? '1 hour' : `${h} hours`;
  }
  return `${RESET_TTL_MIN} minutes`;
})();

const sha256hex = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

// Public origin for the link. PUBLIC_BASE_URL wins; SELF_BASE_URL is the
// fallback already used elsewhere in the app; production origin is the default.
function resetBaseUrl() {
  const raw = process.env.PUBLIC_BASE_URL || process.env.SELF_BASE_URL || 'https://progress.apcsexamprep.com';
  return raw.replace(/\/+$/, '');
}

const stmtDropForTeacher = db.prepare('DELETE FROM password_reset_tokens WHERE teacher_id = ?');
const stmtInsert = db.prepare(
  `INSERT INTO password_reset_tokens (id, teacher_id, token_hash, expires_at)
   VALUES (?, ?, ?, datetime('now', ?))`
);
const stmtExpiryOf = db.prepare('SELECT expires_at FROM password_reset_tokens WHERE teacher_id = ?');

// Mint a fresh single-use link for a teacher, replacing any outstanding one.
// Returns { link, token, expires_at, ttl_minutes, ttl_label }. The caller decides whether
// to email the link or hand it to an operator; this never sends anything.
const mintResetLink = db.transaction((teacherId) => {
  const token = crypto.randomBytes(32).toString('base64url');
  stmtDropForTeacher.run(teacherId);
  stmtInsert.run(newId(), teacherId, sha256hex(token), `+${RESET_TTL_MIN} minutes`);
  const row = stmtExpiryOf.get(teacherId);
  return {
    token,
    link: `${resetBaseUrl()}/teacher/reset-password?token=${token}`,
    expires_at: row ? row.expires_at : null,
    ttl_minutes: RESET_TTL_MIN,
    ttl_label: RESET_TTL_LABEL,
  };
});

// Look up a token by its hash and report whether it is usable. Returns the row
// plus an `expired` flag, or null when no such token exists.
function findToken(rawToken) {
  return db.prepare(
    `SELECT id, teacher_id, used_at, (expires_at <= datetime('now')) AS expired
     FROM password_reset_tokens WHERE token_hash = ?`
  ).get(sha256hex(rawToken));
}

// Burn every outstanding token for a teacher. Called after any password change
// so an old link cannot be replayed to take the account back over.
function burnTokens(teacherId) {
  stmtDropForTeacher.run(teacherId);
}

module.exports = { RESET_TTL_MIN, RESET_TTL_LABEL, sha256hex, resetBaseUrl, mintResetLink, findToken, burnTokens };
