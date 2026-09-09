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
    attrs: {},
    //  Recorded in attrs as well as on the node, because an assertion that reads
    //  a bare property cannot tell an attribute the player SET from one that was
    //  never touched: both are undefined only by luck of the key name.
    addEventListener() {}, appendChild() {},
    setAttribute(k, v) { this[k] = v; this.attrs[k] = v; },
    getAttribute(k) { return (k in this.attrs) ? this.attrs[k] : null; },
    querySelector: () => el(), querySelectorAll: () => [],
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
  ok('  and it marks the node as locked for the CLASS, which is who closed it',
    node.attrs && node.attrs['data-apcs-lab-locked-for'] === 'class', node.attrs);

  console.log('\n3b. The ANONYMOUS refusal does not blame a teacher');
  //  The anonymous rule fires when ANY class has closed this lab, so the visitor
  //  it refuses usually has nothing to do with the class that closed it. Two
  //  people read that sentence: a member of the public, who has no teacher, and
  //  a student whose own class HAS opened the lab and is simply signed out. The
  //  second one takes the message to their teacher, and on 2026-09-09 one did.
  h = load('', { course: 'ap-cybersecurity', item_id: '1.2-lab', locked: true,
    reason: 'anonymous-closed-for-activity', locked_for: 'anonymous', lab: null });
  node = h.el();
  await h.API.mountById(node, 'ap-cybersecurity', '1.2-lab', {}).catch(() => {});
  ok('  it does NOT say a teacher has not opened it',
    !/teacher has not opened/i.test(node.textContent), node.textContent);
  ok('  it tells the reader to sign in, which is the one thing that helps',
    /sign in/i.test(node.textContent), node.textContent);
  ok('  and it is still a lock rather than an error',
    !/could not be loaded/i.test(node.textContent)
      && node.attrs && node.attrs['data-apcs-lab-locked'] === '1', node.textContent);
  ok('  marked with the audience, so a live check can tell the two apart',
    node.attrs && node.attrs['data-apcs-lab-locked-for'] === 'anonymous', node.attrs);

  //  A locked response with no locked_for is a spec route older than this field.
  //  It must keep the wording it always had rather than falling into the new one.
  h = load('tok-123', { course: 'ap-cybersecurity', item_id: '1.2-lab', locked: true, reason: 'explicit-closed', lab: null });
  node = h.el();
  await h.API.mountById(node, 'ap-cybersecurity', '1.2-lab', {}).catch(() => {});
  ok('  a response with no locked_for still reads as the class refusal',
    /teacher has not opened/i.test(node.textContent), node.textContent);

  console.log('\n4. The route must not let an edge cache outlive a lock');
  //  The deploy on 2026-09-07 was correct and the edge served the previous
  //  player for hours, so a teacher who had closed a lab still watched it open.
  //  This file decides whether the token is sent at all, so a stale copy
  //  silently disables the gate.
  //
  //  The assertion is no-store SPECIFICALLY, and a short max-age is a failure
  //  rather than a near miss. Measured against the live origin that day: this
  //  path asked for 3600 and the client received 14400, because the CDN raises
  //  a short max-age on a cacheable asset to its own 4 hour browser TTL. Any
  //  lifetime below four hours therefore reads as fixed and changes nothing.
  //  no-store was the one value that arrived intact, because it leaves the
  //  cacheable class rather than competing on TTL.
  const routeSrc = fs.readFileSync(path.join(__dirname, '..', 'routes', 'labs.js'), 'utf8');
  const block = routeSrc.slice(routeSrc.indexOf("router.get('/lab-player.js'"));
  const cc = (block.match(/Cache-Control', '([^']*)'/) || [])[1];
  ok('  the player is served no-store', /(^|[\s,])no-store([\s,]|$)/.test(cc || ''), cc);
  ok('  and carries no max-age a CDN could inflate', !/max-age/.test(cc || ''), cc);

  console.log('\n5. The spec endpoint varies by credential, so no cache may keep it');
  //  Same bug one hop out. GET /api/labs/:course/:item answers with the spec for
  //  one student and locked:true for another, and it used to inherit
  //  'public, max-age=300' from the cors() helper on the OPEN branch only. A
  //  shared cache, which is what a school proxy is, could then serve one class's
  //  open spec to a student whose teacher had closed it.
  //  Anchored on the GATE path, not on the whole route. The 404 branch above it
  //  is already no-store, so slicing from the route start let that one satisfy
  //  this assertion and the mutation battery caught it passing on code where the
  //  open spec was fully cacheable.
  const specAll = routeSrc.slice(
    routeSrc.indexOf("router.get('/api/labs/:course/:item_id'"),
    routeSrc.indexOf("router.get('/api/labs/:course/:item_id/key'"));
  const gateIdx = specAll.indexOf('const gate = labGate');
  const spec = specAll.slice(gateIdx);
  ok('  the spec route sets no-store on the gate path',
    /Cache-Control', 'no-store'/.test(spec), 'not set');
  ok('  it sets Vary: Authorization', /(set|append)\('Vary', 'Authorization'\)/.test(spec), 'not set');
  //  The point is that BOTH answers are no-store. If only the locked branch were,
  //  the open spec would still be cacheable and the leak would remain. Compared
  //  against the BRANCH, not against 'locked: true': a no-store moved inside the
  //  branch still precedes that string, so the earlier form of this check could
  //  never fail. The battery proved it hollow.
  const branchIdx = spec.indexOf('if (!gate.open)');
  const noStoreIdx = spec.indexOf("'Cache-Control', 'no-store'");
  ok('  and sets it BEFORE the locked branch, so it covers both answers',
    noStoreIdx !== -1 && branchIdx !== -1 && noStoreIdx < branchIdx,
    `no-store at ${noStoreIdx}, branch at ${branchIdx}`);

  console.log(`\n  ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('  [FAIL] the suite threw: ' + e.message); process.exit(1); });
