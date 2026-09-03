'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: ADMIN_READ_KEY, the read-only admin credential.
//
//  WHY IT EXISTS. lib/admin-session.js signs the dashboard cookie with
//  ADMIN_KEY itself, so anyone holding ADMIN_KEY can mint a valid session
//  offline without calling /admin/login. That cookie is what requireCookieAuth
//  accepts, and it gates POST /api/todo/:id/verify. Giving an agent ADMIN_KEY
//  therefore gives it the verify bit and retires rule 4 of CLAUDE.md.
//
//  So the boundary is a SEPARATE SECRET the agent holds instead. It reads, it
//  cannot write, it cannot see a name, and it cannot produce a session cookie
//  because it is not the HMAC secret. Test 5 is the one that matters: it proves
//  the read key cannot get past /admin/login, which is the whole point.
//
//  Zero PII: synthetic names, never printed. No em-dashes, per repo convention.
//  Run: npm run smoke:adminreadkey
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-admin-read-key.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const FULL = 'smoke-full-admin-key-long-enough-to-pass';
const READ = 'smoke-read-only-key-long-enough-to-pass';
process.env.ADMIN_KEY = FULL;
process.env.ADMIN_READ_KEY = READ;

const crypto = require('crypto');
const express = require('express');
require('../db');
const adminSession = require('../lib/admin-session');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const app = express();
app.use(express.json());
app.post('/admin/login', (req, res) => {
  if (!adminSession.keyConfigured()) return res.status(503).json({ error: 'disabled' });
  if (!adminSession.checkKey((req.body && req.body.key) || '')) {
    return res.status(403).json({ error: 'Invalid admin key.' });
  }
  adminSession.issue(req, res);
  res.json({ ok: true });
});
app.use('/api/admin', require('../routes/admin'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const call = (p, { key, method = 'GET', body } = {}) => fetch(base() + p, {
  method,
  headers: Object.assign({ 'Content-Type': 'application/json' }, key ? { 'x-admin-key': key } : {}),
  body: body ? JSON.stringify(body) : undefined,
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

(async () => {
  console.log('\nADMIN_READ_KEY\n');

  console.log('1. The read key can READ');
  const r1 = await call('/api/admin/overview', { key: READ });
  ok('  GET /overview with the read key is 200', r1.status === 200, r1.status);
  const r1b = await call('/api/admin/', { key: READ });
  ok('  GET the index too', r1b.status === 200, r1b.status);

  console.log('2. The read key cannot WRITE');
  for (const method of ['POST', 'PATCH', 'DELETE', 'PUT']) {
    const r = await call('/api/admin/overview', { key: READ, method, body: {} });
    ok(`  ${method} is refused 403`, r.status === 403, { status: r.status });
  }
  const wrote = await call('/api/admin/overview', { key: READ, method: 'POST', body: {} });
  ok('  and the refusal says why', /read-only/.test(wrote.body.error || ''), wrote.body);

  console.log('3. The read key never sees a name');
  const rev = await call('/api/admin/overview?reveal=1', { key: READ });
  ok('  reveal=1 is refused 403', rev.status === 403, rev.status);
  ok('  and the refusal says PII-stripped', /PII-stripped/.test(rev.body.error || ''), rev.body);
  const revFull = await call('/api/admin/overview?reveal=1', { key: FULL });
  ok('  the FULL key may still reveal', revFull.status === 200, revFull.status);

  console.log('4. The full key is unaffected');
  const f1 = await call('/api/admin/overview', { key: FULL });
  ok('  GET with the full key is 200', f1.status === 200, f1.status);
  const bad = await call('/api/admin/overview', { key: 'not-either-of-them-but-long-enough' });
  ok('  a wrong key is still 403', bad.status === 403, bad.status);
  const none = await call('/api/admin/overview');
  ok('  no key at all is still 403', none.status === 403, none.status);

  console.log('5. THE ONE THAT MATTERS: the read key cannot become a session');
  const login = await fetch(base() + '/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: READ }),
  }).then(async (r) => ({ status: r.status, body: await r.json() }));
  ok('  POST /admin/login with the read key is refused', login.status === 403, login.status);
  //  And the full key still can, so the dashboard is not broken by this.
  const loginFull = await fetch(base() + '/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: FULL }),
  }).then((r) => r.status);
  ok('  the full key still mints a session', loginFull === 200, loginFull);
  //  The structural fact underneath: the read key is not the HMAC secret, so a
  //  token signed with it does not verify. This is what makes the boundary real
  //  rather than a marking an ADMIN_KEY holder could forge.
  //  Built here with crypto directly rather than through the module, because
  //  sign() is not exported. An earlier draft of this test wrote
  //  `adminSession.sign ? ... : null` and then asserted `forged === null ||
  //  verify(forged) === null`, which passed WITHOUT EVER FORGING ANYTHING. That
  //  is the hollow assertion this repo keeps relearning, so it is spelled out.
  const mint = (secret) => {
    const body = Buffer.from(JSON.stringify({ exp: Date.now() + 60000 })).toString('base64url');
    const mac = crypto.createHmac('sha256', secret).update(body).digest('base64url');
    return body + '.' + mac;
  };
  //  POSITIVE CONTROL FIRST. If a token minted with the real secret did not
  //  verify, the negative assertion below would pass for the wrong reason: a
  //  malformed string rather than a wrong key.
  ok('  control: a token signed with the FULL key DOES verify',
    adminSession.verify(mint(FULL)) !== null);
  ok('  a token signed with the read key does not verify',
    adminSession.verify(mint(READ)) === null, 'the read key forged a session');

  console.log('6. It fails CLOSED when misconfigured');
  const savedRead = process.env.ADMIN_READ_KEY;
  process.env.ADMIN_READ_KEY = '';
  const unset = await call('/api/admin/overview', { key: READ });
  ok('  unset read key: the old value stops working', unset.status === 403, unset.status);
  process.env.ADMIN_READ_KEY = 'short';
  const weak = await call('/api/admin/overview', { key: 'short' });
  ok('  a weak read key is refused', weak.status === 403, weak.status);
  //  SETTING THE TWO KEYS EQUAL IS A CONFIGURATION ERROR THE API CANNOT SEE.
  //  Asserted here as the honest behaviour rather than as a guard: the full
  //  branch matches first, so the holder gets full write access and the
  //  read-only branch is never reached. A previous version of this test claimed
  //  to check a `read === full` refusal; the deploy gate proved the claim empty
  //  by breaking that line and watching the suite stay green. The line is gone.
  process.env.ADMIN_READ_KEY = FULL;
  const equal = await call('/api/admin/overview', { key: FULL, method: 'POST', body: {} });
  ok('  keys set equal give FULL access, which is why they must differ',
    equal.status !== 403, equal.status);
  process.env.ADMIN_READ_KEY = savedRead;

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
