'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: teacher self-service password reset (forgot-password + reset-password).
//  Mounts ONLY the teacher router on a throwaway app and DB, stubs the mailer to
//  capture the reset link (no real email), and walks the full flow plus the
//  security edge cases: anti-enumeration, single-use, expiry, bad token.
//
//  Run: npm run smoke:reset
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');

process.env.DB_PATH = path.join(__dirname, 'smoke-reset.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

// Stub the mailer BEFORE the router loads it. routes/teacher.js calls
// mailer.sendEmail(...) on the module object, so replacing the property here is
// picked up at request time.
const mailer = require('../lib/mailer');
let lastEmail = null;
mailer.sendEmail = async function (msg) { lastEmail = msg; return { sent: true }; };
// The stub above DELIVERS, so the configured flag has to agree with it. Left at
// the real implementation it reads RESEND_API_KEY, which is unset under test, and
// the harness would then claim it cannot send while capturing every message.
// mailConfigured is flipped directly by the unconfigured-mailer section below.
let mailConfigured = true;
mailer.mailerConfigured = function () { return mailConfigured; };

const express = require('express');
const db = require('../db');
const app = express();
// Mirrors server.js, which sets the same thing: req.ip then resolves from
// X-Forwarded-For, which is how the rate limiter keys its buckets in production.
// It also lets a section below take a FRESH limiter bucket by presenting its own
// client IP, so tests do not have to share one 5-per-15-minutes budget.
app.set('trust proxy', true);
app.use(express.json());
app.use('/api/teacher', require('../routes/teacher'));

let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('  [PASS] ' + name); } else { fail++; console.log('  [FAIL] ' + name + (extra ? '  ' + JSON.stringify(extra) : '')); } }

function linkToken(link) {
  try { return new URL(link).searchParams.get('token'); } catch (e) { return null; }
}
function tokenFromEmail() {
  if (!lastEmail || !lastEmail.text) return null;
  const m = lastEmail.text.match(/\/teacher\/reset-password\?token=([^\s]+)/);
  return m ? m[1] : null;
}

(async () => {
  const base = await new Promise((resolve) => {
    const srv = app.listen(0, () => resolve('http://127.0.0.1:' + srv.address().port));
  });
  const post = (p, body) => fetch(base + '/api/teacher' + p, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  // Same POST, from a stated client IP, so a section can get its own rate-limit
  // bucket instead of spending the one the earlier sections already drew down.
  const postFrom = (ip, p, body) => fetch(base + '/api/teacher' + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: JSON.stringify(body),
  });

  const EMAIL = 'reset.teacher@example.org';
  const OLD = 'oldpassword1';
  const NEW = 'brandNewPass9';

  console.log('register + baseline login');
  let r = await post('/register', { email: EMAIL, password: OLD, name: 'Reset Teacher' });
  ok('register 201', r.status === 201, r.status);
  r = await post('/login', { email: EMAIL, password: OLD });
  ok('login with original password works', r.status === 200, r.status);

  console.log('anti-enumeration');
  lastEmail = null;
  r = await post('/forgot-password', { email: 'nobody-here@example.org' });
  let j = await r.json();
  ok('unknown email returns 200', r.status === 200, r.status);
  ok('unknown email sends no mail', lastEmail === null);
  ok('unknown email generic message', /reset link is on its way/i.test(j.message || ''), j);
  const unknownTokens = db.prepare('SELECT COUNT(*) n FROM password_reset_tokens').get().n;
  ok('unknown email creates no token', unknownTokens === 0, unknownTokens);

  console.log('forgot-password for the real account');
  lastEmail = null;
  r = await post('/forgot-password', { email: EMAIL.toUpperCase() }); // case-insensitive
  j = await r.json();
  ok('known email returns 200', r.status === 200, r.status);
  ok('known email sends mail to the teacher', lastEmail && lastEmail.to === EMAIL, lastEmail && lastEmail.to);
  const token = tokenFromEmail();
  ok('email carries a reset token', !!token);
  ok('exactly one live token stored', db.prepare('SELECT COUNT(*) n FROM password_reset_tokens').get().n === 1);
  ok('raw token is NOT stored (only its hash)',
    db.prepare('SELECT COUNT(*) n FROM password_reset_tokens WHERE token_hash = ?').get(token).n === 0);

  console.log('bad-token rejection');
  r = await post('/reset-password', { token: 'not-a-real-token', password: NEW });
  ok('garbage token rejected 400', r.status === 400, r.status);
  r = await post('/reset-password', { token: token, password: 'short' });
  ok('too-short password rejected 400', r.status === 400, r.status);
  ok('login still works with old password after failed attempts',
    (await post('/login', { email: EMAIL, password: OLD })).status === 200);

  console.log('successful reset');
  r = await post('/reset-password', { token: token, password: NEW });
  ok('valid reset returns 200', r.status === 200, r.status);
  ok('login with NEW password works', (await post('/login', { email: EMAIL, password: NEW })).status === 200);
  ok('login with OLD password now fails', (await post('/login', { email: EMAIL, password: OLD })).status === 401);

  console.log('single-use enforcement');
  r = await post('/reset-password', { token: token, password: 'anotherPass9' });
  ok('token cannot be reused 400', r.status === 400, r.status);
  ok('reused token did not change the password',
    (await post('/login', { email: EMAIL, password: NEW })).status === 200);

  console.log('expiry enforcement');
  lastEmail = null;
  await post('/forgot-password', { email: EMAIL });
  const t2 = tokenFromEmail();
  // Force the token to be expired, then try to use it.
  db.prepare("UPDATE password_reset_tokens SET expires_at = datetime('now','-1 minute')").run();
  r = await post('/reset-password', { token: t2, password: 'expiredTry9' });
  ok('expired token rejected 400', r.status === 400, r.status);
  ok('expired token did not change the password',
    (await post('/login', { email: EMAIL, password: NEW })).status === 200);

  console.log('change-password (signed in)');
  // Sign in to get a teacher JWT.
  let lr = await post('/login', { email: EMAIL, password: NEW });
  const jwt1 = (await lr.json()).token;
  const authed = (p, body) => fetch(base + '/api/teacher' + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt1 },
    body: JSON.stringify(body),
  });
  ok('change-password without auth is 401',
    (await post('/change-password', { current_password: NEW, new_password: 'whatever123' })).status === 401);
  let r2 = await authed('/change-password', { current_password: 'wrongpass1', new_password: 'chosenPass7' });
  ok('wrong current password rejected 401', r2.status === 401, r2.status);
  ok('  password unchanged after wrong current',
    (await post('/login', { email: EMAIL, password: NEW })).status === 200);
  r2 = await authed('/change-password', { current_password: NEW, new_password: 'short' });
  ok('too-short new password rejected 400', r2.status === 400, r2.status);
  r2 = await authed('/change-password', { current_password: NEW, new_password: NEW });
  ok('identical new password rejected 400', r2.status === 400, r2.status);

  const CHOSEN = 'chosenPass7';
  r2 = await authed('/change-password', { current_password: NEW, new_password: CHOSEN });
  ok('valid change returns 200', r2.status === 200, r2.status);
  ok('login works with the chosen password', (await post('/login', { email: EMAIL, password: CHOSEN })).status === 200);
  ok('old password no longer works', (await post('/login', { email: EMAIL, password: NEW })).status === 401);

  // A deliberate change must invalidate any reset link sitting in an inbox.
  lastEmail = null;
  await post('/forgot-password', { email: EMAIL });
  const staleTok = tokenFromEmail();
  const lr2 = await post('/login', { email: EMAIL, password: CHOSEN });
  const tok2 = (await lr2.json()).token;
  await fetch(base + '/api/teacher/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok2 },
    body: JSON.stringify({ current_password: CHOSEN, new_password: 'finalPass99' }),
  });
  r2 = await post('/reset-password', { token: staleTok, password: 'hijack1234' });
  ok('change-password burns outstanding reset links', r2.status === 400, r2.status);
  ok('  hijack attempt did not change the password',
    (await post('/login', { email: EMAIL, password: 'finalPass99' })).status === 200);

  // ── UNCONFIGURED MAILER ────────────────────────────────────────────────────
  //  With no RESEND_API_KEY the box cannot deliver, and the old copy still said
  //  "a reset link is on its way", so a locked-out teacher waited on mail that
  //  only ever reached the Railway logs. The response must now say so plainly.
  //  The anti-enumeration property still has to hold: what distinguishes the two
  //  answers is SERVER config, never whether the address has an account, so an
  //  unknown and a known address must still be byte-identical to each other.
  console.log('unconfigured mailer');
  mailConfigured = false;
  lastEmail = null;

  const MAIL_IP = '203.0.113.7';   // TEST-NET-3, its own limiter bucket
  const unknownRes = await (await postFrom(MAIL_IP, '/forgot-password', { email: 'nobody-here@example.org' })).json();
  const knownRes = await (await postFrom(MAIL_IP, '/forgot-password', { email: EMAIL })).json();

  ok('unconfigured mailer still returns ok:true', unknownRes.ok === true, unknownRes);
  ok('unconfigured mailer reports mail_configured:false', unknownRes.mail_configured === false, unknownRes);
  ok('unconfigured mailer does NOT promise a link',
    !/on its way/i.test(unknownRes.message || ''), unknownRes.message);
  ok('unconfigured mailer says email is not set up',
    /not set up/i.test(unknownRes.message || ''), unknownRes.message);
  ok('unknown and known addresses are still byte-identical',
    JSON.stringify(unknownRes) === JSON.stringify(knownRes), { unknownRes, knownRes });

  mailConfigured = true;
  const backOn = await (await postFrom(MAIL_IP, '/forgot-password', { email: 'nobody-here@example.org' })).json();
  ok('configured mailer goes back to the on-its-way copy',
    backOn.mail_configured === true && /on its way/i.test(backOn.message || ''), backOn);

  console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
