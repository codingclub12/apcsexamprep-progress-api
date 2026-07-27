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

const express = require('express');
const db = require('../db');
const app = express();
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

  console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
