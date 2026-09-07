'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the lab player sends its token when it asks for a lab
//
//  THIS IS THE ONE THAT MADE THE OTHERS MOOT. routes/labs.js was taught to
//  refuse a closed lab, and the gradebook was taught to report it honestly, and
//  a teacher still watched a closed lab open. The player held a student token
//  and sent it when SUBMITTING a grade, but asked for the spec with no headers
//  at all. The server cannot tell an enrolled student from a visitor without
//  one, so every request resolved as self-study and every gate stood down.
//
//  The gate was right the whole time and was never given the identity it needed
//  to act on. A server-side check is only as good as what the client tells it.
//
//  What is asserted here:
//    1. The spec fetch carries Authorization when a token exists.
//    2. It carries NOTHING when one does not, so a signed-out visitor still
//       gets the lab and teacher preview keeps working. That is the property
//       routes/labs.js is built around and it must not be traded away.
//    3. A locked response renders as "your teacher has not opened this" rather
//       than throwing. Telling a student a lab "could not be loaded" about one
//       their teacher deliberately closed sends them to support, not to class.
//
//  The shipped file's own function is executed, not reimplemented.
//
//  Offline, no network, no DB. No em-dashes.
//  Run: npm run smoke:labplayertoken
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 240) : '')); }
};

const SRC = fs.readFileSync(path.join(__dirname, '..', 'public', 'lab-player.js'), 'utf8');

function load(token, response) {
  const seen = [];
  const el = () => ({
    textContent: '', innerHTML: '', style: {}, dataset: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    addEventListener() {}, appendChild() {}, setAttribute(k, v) { this[k] = v; },
    getAttribute() { return null; }, querySelector: () => el(), querySelectorAll: () => [],
  });
  const sandbox = {
    console: { log() {}, error() {}, warn() {} },
    document: {
      getElementById: () => null, querySelector: () => el(), querySelectorAll: () => [],
      createElement: () => el(), addEventListener() {}, head: el(), body: el(),
    },
    localStorage: { getItem: (k) => (k === 'apcse_token' ? token : null), setItem() {}, removeItem() {} },
    fetch: (url, opts) => { seen.push({ url, opts }); return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(response) }); },
    setTimeout, clearTimeout, encodeURIComponent, Promise,
    Math, JSON, Date, String, Number, Array, Object, RegExp, isNaN, parseInt, parseFloat, Error,
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox, { timeout: 5000 });
  const API = sandbox.window.APCSLab || sandbox.APCSLab;
  return { API, seen, el };
}

const SPEC = { course: 'ap-cybersecurity', item_id: '1.2-lab', title: 'T', brief: 'b', steps: [], checks: [] };

(async () => {
  console.log('\n1. Signed in: the token goes on the spec fetch');
  let h = load('tok-123', SPEC);
  ok('  the player exposes a mount API', !!(h.API && h.API.mountById), Object.keys(h.API || {}));
  if (!h.API || !h.API.mountById) { console.log('\nFAILED: no mountById\n'); process.exit(1); }
  let node = h.el();
  await h.API.mountById(node, 'ap-cybersecurity', '1.2-lab', {}).catch(() => {});
  const specCall = h.seen.find((c) => /\/api\/labs\//.test(c.url));
  ok('  it asked /api/labs for the spec', !!specCall, h.seen.map((c) => c.url));
  ok('  and carried Authorization',
    !!(specCall && specCall.opts && specCall.opts.headers && /^Bearer tok-123$/.test(specCall.opts.headers.Authorization)),
    specCall && specCall.opts);

  console.log('\n2. Signed out: it sends nothing, so preview and public practice survive');
  h = load('', SPEC);
  node = h.el();
  await h.API.mountById(node, 'ap-cybersecurity', '1.2-lab', {}).catch(() => {});
  const anon = h.seen.find((c) => /\/api\/labs\//.test(c.url));
  ok('  it still asks for the spec', !!anon);
  ok('  with no Authorization header at all',
    !(anon && anon.opts && anon.opts.headers && anon.opts.headers.Authorization), anon && anon.opts);

  console.log('\n3. A locked lab reads as closed, not as broken');
  h = load('tok-123', { course: 'ap-cybersecurity', item_id: '1.2-lab', locked: true, reason: 'explicit-closed', lab: null });
  node = h.el();
  let threw = false;
  await h.API.mountById(node, 'ap-cybersecurity', '1.2-lab', {}).catch(() => { threw = true; });
  ok('  it does not throw on a locked response', threw === false);
  ok('  it says the teacher has not opened it',
    /teacher has not opened/i.test(node.textContent), node.textContent);
  ok('  and never says the lab could not be loaded',
    !/could not be loaded/i.test(node.textContent), node.textContent);

  console.log(`\n  ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('  [FAIL] the suite threw: ' + e.message); process.exit(1); });
