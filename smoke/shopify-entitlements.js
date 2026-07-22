'use strict';
// Verification harness for Phase 4 slice 2 (Shopify entitlements). Boots the app
// in-process against a throwaway DB and exercises every acceptance case. Exits
// non-zero on the first failed assertion so it can gate CI.
//
// Run: node smoke/shopify-entitlements.js
const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Env must be set BEFORE requiring the app (db path, secrets, sku map are read
// at module load).
const TMP_DB = path.join(os.tmpdir(), `ent-smoke-${process.pid}.db`);
for (const f of [TMP_DB, TMP_DB + '-wal', TMP_DB + '-shm']) { try { fs.unlinkSync(f); } catch (e) {} }
process.env.DB_PATH = TMP_DB;
process.env.PORT = '4787';
process.env.JWT_SECRET = 'smoke-secret-not-for-prod';
process.env.SHOPIFY_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.SHOPIFY_SKU_MAP = JSON.stringify({ 'TEST-CSA': 'ap-csa', '9001': 'ap-csp' });

const BASE = `http://127.0.0.1:${process.env.PORT}`;
const WEBHOOK = `${BASE}/api/shopify/webhook/orders-paid`;

require('../server');            // starts listening
const db = require('../db');     // same singleton the app uses

let failures = 0;
function check(name, cond, extra) {
  if (cond) { console.log(`  PASS  ${name}`); }
  else { failures++; console.error(`  FAIL  ${name}${extra ? '  -> ' + extra : ''}`); }
}

function sign(bodyStr, secret = process.env.SHOPIFY_WEBHOOK_SECRET) {
  return crypto.createHmac('sha256', secret).update(Buffer.from(bodyStr, 'utf8')).digest('base64');
}

async function postWebhook(order, { hmac } = {}) {
  const body = JSON.stringify(order);
  const sig = hmac === undefined ? sign(body) : hmac;
  const headers = { 'Content-Type': 'application/json' };
  if (sig !== null) headers['X-Shopify-Hmac-Sha256'] = sig;
  const res = await fetch(WEBHOOK, { method: 'POST', headers, body });
  let json = null; try { json = await res.json(); } catch (e) {}
  return { status: res.status, json };
}

async function register(email, password = 'password123', name = 'Test Teacher') {
  const res = await fetch(`${BASE}/api/teacher/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}
async function login(email, password = 'password123') {
  const res = await fetch(`${BASE}/api/teacher/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}
async function gateCheck(token, course) {
  const res = await fetch(`${BASE}/api/gate/check?course=${encodeURIComponent(course)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

const entCount = (email, course) => db.prepare(
  `SELECT COUNT(*) n FROM entitlements e JOIN teachers t ON t.id = e.teacher_id
   WHERE t.email = ? COLLATE NOCASE AND e.course = ?`
).get(email, course).n;
const pendingCount = (email, course) => db.prepare(
  `SELECT COUNT(*) n FROM pending_entitlements WHERE email = ? COLLATE NOCASE AND course = ?`
).get(email, course).n;
const pendingUnclaimed = (email) => db.prepare(
  `SELECT COUNT(*) n FROM pending_entitlements WHERE email = ? COLLATE NOCASE AND claimed_at IS NULL`
).get(email).n;

function order(id, email, lineItems) {
  return { id, email, line_items: lineItems };
}

async function main() {
  await new Promise(r => setTimeout(r, 400)); // let listen() + boot seeds settle

  // ── Case A: signed payload grants a per-course entitlement to an existing
  //    teacher, and /api/gate/check flips to entitled. ─────────────────────────
  console.log('\nCase A: signed order grants entitlement to existing teacher');
  const emailA = 'teacher.a@example.com';
  const regA = await register(emailA);
  check('teacher A registered', regA.status === 201, `status ${regA.status}`);
  const tokenA = regA.json && regA.json.token;

  const gateBefore = await gateCheck(tokenA, 'ap-csa');
  check('gate ap-csa is false before purchase', gateBefore.json && gateBefore.json.entitled === false, JSON.stringify(gateBefore.json));

  const resA = await postWebhook(order(1001, emailA, [{ sku: 'TEST-CSA', product_id: 555 }]));
  check('webhook returned 200', resA.status === 200, `status ${resA.status}`);
  check('webhook granted 1', resA.json && resA.json.granted === 1, JSON.stringify(resA.json));
  const gateAfter = await gateCheck(tokenA, 'ap-csa');
  check('gate ap-csa flips to entitled', gateAfter.json && gateAfter.json.entitled === true, JSON.stringify(gateAfter.json));
  check('exactly one entitlement row', entCount(emailA, 'ap-csa') === 1, `count ${entCount(emailA, 'ap-csa')}`);

  // ── Case B: bad HMAC returns 401 and grants nothing. ─────────────────────────
  console.log('\nCase B: bad / missing HMAC is rejected');
  const badSig = await postWebhook(order(1002, emailA, [{ sku: 'TEST-CSA' }]), { hmac: 'not-a-valid-signature' });
  check('bad HMAC returns 401', badSig.status === 401, `status ${badSig.status}`);
  const noSig = await postWebhook(order(1003, emailA, [{ sku: 'TEST-CSA' }]), { hmac: null });
  check('missing HMAC returns 401', noSig.status === 401, `status ${noSig.status}`);
  check('rejected orders granted nothing new', entCount(emailA, 'ap-csa') === 1, `count ${entCount(emailA, 'ap-csa')}`);

  // ── Case C: replaying the same order does not create a second grant. ─────────
  console.log('\nCase C: idempotent replay of the same order');
  const replay = await postWebhook(order(1001, emailA, [{ sku: 'TEST-CSA', product_id: 555 }]));
  check('replay returns 200', replay.status === 200, `status ${replay.status}`);
  check('still exactly one entitlement row after replay', entCount(emailA, 'ap-csa') === 1, `count ${entCount(emailA, 'ap-csa')}`);

  // ── Case D: purchase for an unknown email parks a pending row, claimed on the
  //    buyer's next register. ────────────────────────────────────────────────
  console.log('\nCase D: unknown-email purchase -> pending -> claimed on register');
  const emailD = 'newbuyer.d@example.com';
  const resD = await postWebhook(order(2001, emailD, [{ sku: 'TEST-CSA' }, { sku: '9001' }]));
  check('webhook 200 for unknown buyer', resD.status === 200, `status ${resD.status}`);
  check('two pending recorded', resD.json && resD.json.pending === 2, JSON.stringify(resD.json));
  check('no entitlement yet (no account)', entCount(emailD, 'ap-csa') === 0, `count ${entCount(emailD, 'ap-csa')}`);
  check('pending rows present', pendingCount(emailD, 'ap-csa') === 1 && pendingCount(emailD, 'ap-csp') === 1);

  // replay the unknown-email order: pending must not duplicate
  await postWebhook(order(2001, emailD, [{ sku: 'TEST-CSA' }, { sku: '9001' }]));
  check('pending not duplicated on replay', pendingCount(emailD, 'ap-csa') === 1, `count ${pendingCount(emailD, 'ap-csa')}`);

  const regD = await register(emailD);
  check('buyer D registered', regD.status === 201, `status ${regD.status}`);
  const tokenD = regD.json && regD.json.token;
  check('ap-csa entitlement created on register', entCount(emailD, 'ap-csa') === 1, `count ${entCount(emailD, 'ap-csa')}`);
  check('ap-csp entitlement created on register', entCount(emailD, 'ap-csp') === 1, `count ${entCount(emailD, 'ap-csp')}`);
  check('no unclaimed pending left for buyer', pendingUnclaimed(emailD) === 0, `count ${pendingUnclaimed(emailD)}`);
  const gateD = await gateCheck(tokenD, 'ap-csp');
  check('gate ap-csp entitled after claim', gateD.json && gateD.json.entitled === true, JSON.stringify(gateD.json));

  // ── Case E: claim also fires on login (pending that predates the login). ─────
  console.log('\nCase E: pending claimed on login');
  const emailE = 'teacher.e@example.com';
  const regE = await register(emailE);
  check('teacher E registered', regE.status === 201, `status ${regE.status}`);
  // Simulate a pending grant that exists while the account already does (e.g.
  // parked before this feature shipped): insert directly, then log in.
  db.prepare(`INSERT INTO pending_entitlements (email, course, source, order_ref) VALUES (?, ?, ?, ?)`)
    .run(emailE, 'ap-csa', 'shopify_order', '3001');
  check('pending present before login', pendingUnclaimed(emailE) === 1);
  const logE = await login(emailE);
  check('login ok', logE.status === 200, `status ${logE.status}`);
  check('entitlement created on login', entCount(emailE, 'ap-csa') === 1, `count ${entCount(emailE, 'ap-csa')}`);
  check('pending cleared on login', pendingUnclaimed(emailE) === 0, `count ${pendingUnclaimed(emailE)}`);

  // ── Case F: unmapped SKU is logged and skipped, order still 200. ─────────────
  console.log('\nCase F: unmapped SKU is skipped, still 200');
  const emailF = 'teacher.f@example.com';
  const regF = await register(emailF);
  const tokenF = regF.json && regF.json.token;
  const resF = await postWebhook(order(4001, emailF, [
    { sku: 'UNKNOWN-SKU', product_id: 424242 },   // unmapped
    { sku: 'TEST-CSA' },                            // mapped
  ]));
  check('webhook 200 with an unmapped line item', resF.status === 200, `status ${resF.status}`);
  check('one granted, one skipped', resF.json && resF.json.granted === 1 && resF.json.skipped === 1, JSON.stringify(resF.json));
  const gateF = await gateCheck(tokenF, 'ap-csa');
  check('mapped course still granted', gateF.json && gateF.json.entitled === true, JSON.stringify(gateF.json));

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  for (const f of [TMP_DB, TMP_DB + '-wal', TMP_DB + '-shm']) { try { fs.unlinkSync(f); } catch (e) {} }
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
