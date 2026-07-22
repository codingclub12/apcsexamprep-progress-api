'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN DASHBOARD SESSION: a browser-friendly gate on top of the fail-closed
//  admin key, so the class dashboard can be a reachable page without ever putting
//  the raw ADMIN_KEY in the browser or on a query string.
//
//  HOW IT STAYS SAFE:
//   • The session token is an HMAC-SHA256 of {exp}, signed with ADMIN_KEY itself.
//     A token is only ever minted AFTER a constant-time key check at /admin/login,
//     so holding a valid cookie proves prior key possession. Rotating ADMIN_KEY
//     invalidates every outstanding session for free.
//   • Cookie is httpOnly (JS can't read it), Secure (https only, off for localhost
//     so it still works in dev), SameSite=Strict (never sent cross-site, which
//     neutralizes CSRF against the admin API), short-lived.
//   • Fails closed exactly like requireAdmin: if ADMIN_KEY is unset or weak,
//     no session can be minted or verified.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const COOKIE = 'admin_dash';
const MIN_KEY_LEN = 20;
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function secret() {
  return process.env.ADMIN_KEY || '';
}

function keyConfigured() {
  return secret().length >= MIN_KEY_LEN;
}

// Constant-time key check. Both sides are hashed to a fixed 32 bytes first, so
// the compare never leaks key length and timingSafeEqual never throws. Same
// shape as requireAdmin in routes/admin.js.
function checkKey(provided) {
  if (!keyConfigured()) return false;
  const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();
  return crypto.timingSafeEqual(digest(provided), digest(secret()));
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return body + '.' + mac;
}

// Returns the decoded payload if the token is well-formed, correctly signed, and
// unexpired; null otherwise. Never throws.
function verify(token) {
  if (!keyConfigured() || !token || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expect = crypto.createHmac('sha256', secret()).update(body).digest();
  let got;
  try { got = Buffer.from(mac, 'base64url'); } catch (_) { return null; }
  if (got.length !== expect.length || !crypto.timingSafeEqual(got, expect)) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch (_) { return null; }
  if (!payload || typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
  return payload;
}

// Parse our cookie out of the raw Cookie header (no cookie-parser dependency).
function readToken(req) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === COOKIE) {
      try { return decodeURIComponent(part.slice(idx + 1).trim()); } catch (_) { return null; }
    }
  }
  return null;
}

function isAuthed(req) {
  return !!verify(readToken(req));
}

// Marks the response with a fresh session cookie. Secure is on unless the request
// arrived over plain http (localhost dev); Railway terminates TLS at its proxy and
// forwards x-forwarded-proto=https, which express surfaces via req.secure when
// trust proxy is enabled.
function issue(req, res) {
  const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
  res.cookie(COOKIE, sign({ exp: Date.now() + TTL_MS }), {
    httpOnly: true,
    secure: proto === 'https',
    sameSite: 'strict',
    path: '/',
    maxAge: TTL_MS,
  });
}

function clear(res) {
  res.clearCookie(COOKIE, { path: '/' });
}

// ── Login rate limiter (bounded, IP-keyed) ───────────────────────────────────
//  Same no-timer, hard-capped, lazily-swept pattern as the attempt route, so it
//  can never grow unbounded on Railway. 10 attempts per 5 minutes per IP.
const RL_WINDOW_MS = 5 * 60 * 1000;
const RL_MAX = 10;
const RL_MAX_KEYS = 5000;
const buckets = new Map();

function loginRateLimit(req, res, next) {
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  let bucket = buckets.get(ip);
  if (!bucket || now - bucket.start >= RL_WINDOW_MS) {
    if (buckets.size >= RL_MAX_KEYS) {
      for (const [k, v] of buckets) {
        if (now - v.start >= RL_WINDOW_MS) buckets.delete(k);
      }
      if (buckets.size >= RL_MAX_KEYS) buckets.clear();
    }
    bucket = { start: now, count: 0 };
    buckets.set(ip, bucket);
  }
  bucket.count++;
  if (bucket.count > RL_MAX) {
    return res.status(429).json({ error: 'Too many attempts. Wait a few minutes and try again.' });
  }
  next();
}

module.exports = {
  COOKIE, keyConfigured, checkKey, verify, isAuthed, issue, clear, loginRateLimit,
};
