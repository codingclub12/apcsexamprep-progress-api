'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  COMMAND CENTER AUTH. Three credentials, deliberately unequal, because the
//  three surfaces are not symmetric (spec 3.1): chat's web_fetch takes a URL and
//  nothing else, so it can never send an Authorization header.
//
//   1. COOKIE (browser, Tanner)   full read + write, and the ONLY credential
//                                 that may set verified=1.
//   2. Bearer <TODO_KEY> (agents) full read + write except the verify bit and
//                                 the 403 matrix in spec 7. Scope defaults to
//                                 'limited': no person, no email, ever. Set
//                                 TODO_KEY_SCOPE=full to lift that.
//   3. Read token (chat only)     GET /api/command/digest/r/:token and nothing
//                                 else. Read-only, PII-stripped, rotatable,
//                                 rate limited harder than the bearer path.
//
//  Anything else is 401. Fails closed: with TODO_KEY unset or under 20 chars the
//  bearer path rejects every request rather than falling open.
//
//  The cookie is the existing admin dashboard session (lib/admin-session), which
//  is how every other /admin page in this repo authenticates a browser: minted
//  only after a constant-time ADMIN_KEY check at /admin/login, httpOnly, and
//  SameSite=Strict so it is not a CSRF vector. A teacher JWT presented in an
//  apcse_teacher_token cookie is also accepted when it resolves to the owner
//  account named by COMMAND_OWNER_EMAIL, which is the "must resolve to the owner
//  account" path in spec 3; it is off unless that env var is set.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const adminSession = require('./admin-session');
const { makeRateLimit } = require('./rate-limit');
const { verifyTeacherToken } = require('../utils');

const MIN_KEY_LEN = 20;
const READ_TOKEN_KEY = 'read_token';

// Actors allowed to appear in task_events. An agent may name itself with the
// x-command-actor header so the ledger says "cowork" rather than "agent"; an
// unrecognized value falls back rather than being written through.
const AGENT_ACTORS = ['chat', 'cowork', 'claude_code', 'check', 'agent'];

function keyConfigured() {
  return String(process.env.TODO_KEY || '').length >= MIN_KEY_LEN;
}

// Constant-time compare, both sides hashed to a fixed 32 bytes so the compare
// never leaks length and timingSafeEqual never throws. Same shape as
// requireAdmin in routes/admin.js.
function sameSecret(provided, configured) {
  if (!provided || !configured) return false;
  const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();
  return crypto.timingSafeEqual(digest(provided), digest(configured));
}

function readCookie(req, name) {
  const raw = (req.headers && req.headers.cookie) || '';
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) {
      try { return decodeURIComponent(part.slice(idx + 1).trim()); } catch (_) { return null; }
    }
  }
  return null;
}

// Owner teacher JWT in a cookie. Only counts when COMMAND_OWNER_EMAIL is set and
// the token's email claim matches it, so a teacher token belonging to anyone
// else is exactly as unauthorized as no token at all.
function ownerTeacherCookie(req) {
  const owner = String(process.env.COMMAND_OWNER_EMAIL || '').trim().toLowerCase();
  if (!owner) return false;
  const token = readCookie(req, 'apcse_teacher_token');
  if (!token) return false;
  let payload;
  try { payload = verifyTeacherToken(token); } catch (_) { return false; }
  if (!payload || payload.role !== 'teacher') return false;
  return String(payload.email || '').trim().toLowerCase() === owner;
}

// Resolves a request to an identity, or null. Never throws.
//   { via: 'cookie'|'bearer', actor, cookie: bool, scope: 'full'|'limited' }
function identify(req) {
  if (adminSession.isAuthed(req) || ownerTeacherCookie(req)) {
    return { via: 'cookie', actor: 'tanner', cookie: true, scope: 'full' };
  }
  const auth = (req.headers && req.headers.authorization) || '';
  if (auth.startsWith('Bearer ')) {
    const provided = auth.slice(7).trim();
    if (!keyConfigured()) return null;               // fail closed, never fall open
    if (!sameSecret(provided, process.env.TODO_KEY)) return null;
    const hinted = String((req.headers && req.headers['x-command-actor']) || '').trim();
    const actor = AGENT_ACTORS.includes(hinted) ? hinted : 'agent';
    const scope = String(process.env.TODO_KEY_SCOPE || '').trim() === 'full' ? 'full' : 'limited';
    return { via: 'bearer', actor, cookie: false, scope };
  }
  return null;
}

// Router-level gate for /api/command and /api/todo.
function requireCommandAuth(req, res, next) {
  const who = identify(req);
  if (!who) {
    res.set('WWW-Authenticate', 'Bearer realm="command"');
    return res.status(401).json({ error: 'Authentication required. Send the session cookie or Authorization: Bearer <TODO_KEY>.' });
  }
  req.command = who;
  next();
}

// Cookie-only gate. Used for the verify bit and the read-token rotation: an
// agent holding TODO_KEY must never be able to mark its own work verified.
function requireCookieAuth(req, res, next) {
  if (req.command && req.command.cookie) return next();
  return res.status(403).json({ error: 'This action requires the browser session. An agent credential cannot perform it.' });
}

// Gate for anything carrying a person or an email. Cookie, or a TODO_KEY that
// has been explicitly marked scope=full. A content agent dispatched to fix a lab
// does not need the customer list.
function requireFullScope(req, res, next) {
  if (req.command && (req.command.cookie || req.command.scope === 'full')) return next();
  return res.status(403).json({ error: 'Promise records are scope-gated. This credential is scoped to task data only.' });
}

// ── Read token (chat's public digest URL) ────────────────────────────────────
// Stored raw in command_config: it is deliberately weak, reads one PII-stripped
// endpoint, changes nothing, and must be displayable in the UI so the URL can be
// pasted into a chat session. Hashing it would buy nothing here and would make
// rotation unshowable.
function getReadToken(db, { create = true } = {}) {
  const row = db.prepare('SELECT value FROM command_config WHERE key = ?').get(READ_TOKEN_KEY);
  if (row && row.value) return row.value;
  if (!create) return null;
  return rotateReadToken(db);
}

// Rotation is a single overwrite, so the previous token stops resolving on the
// very next request. No grace window: that is the point of a one-click rotate.
function rotateReadToken(db) {
  const token = crypto.randomBytes(24).toString('base64url');
  db.prepare(`
    INSERT INTO command_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(READ_TOKEN_KEY, token);
  return token;
}

// Constant-time check of a candidate read token against the stored one.
function checkReadToken(db, candidate) {
  if (!candidate || typeof candidate !== 'string') return false;
  const stored = getReadToken(db, { create: false });
  if (!stored) return false;
  return sameSecret(candidate, stored);
}

// ── Rate limits ──────────────────────────────────────────────────────────────
// 200 per 10 minutes per IP on the credentialed routes, matching the pattern
// already applied to student auth. The public read URL gets 60/hour, which is
// generous for a session-start read and tight enough that a leaked token is a
// nuisance rather than a load source.
const commandRateLimit = makeRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 200,
  message: 'Too many command center requests. Wait a few minutes and try again.',
});

const readTokenRateLimit = makeRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: 'Too many digest reads. This URL allows 60 per hour.',
});

module.exports = {
  identify, requireCommandAuth, requireCookieAuth, requireFullScope,
  getReadToken, rotateReadToken, checkReadToken,
  commandRateLimit, readTokenRateLimit,
  keyConfigured, READ_TOKEN_KEY, AGENT_ACTORS,
};
