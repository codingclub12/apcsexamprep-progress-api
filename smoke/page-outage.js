'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: a page must survive its API being down.
//
//  ── THE INCIDENT ───────────────────────────────────────────────────────────
//  progress.apcsexamprep.com went down and the practice pages "went down" with
//  it. They did not 404. They served 200, rendered their heading and prose, and
//  sat on "Loading the practice question..." indefinitely. To a teacher in front
//  of a class that is worse than a 404, because a spinner looks like their own
//  connection rather than our outage.
//
//  ── WHY THIS SUITE RUNS THE REAL BOOTSTRAP ─────────────────────────────────
//  Asserting that the body CONTAINS a fallback proves nothing: a fallback that
//  is present and never fires is exactly the bug. So this pulls the inline
//  bootstrap out of a genuinely generated page body and EXECUTES it against a
//  small DOM under each way the API can fail, and asks the only question that
//  matters: did the student end up looking at an explanation, or at a spinner?
//
//  The happy path is tested too, and it is the assertion most likely to catch a
//  future mistake: a fallback that fires when the API is healthy would replace
//  every working practice question on the site with an outage notice.
//
//  Zero PII: author content and a stub DOM.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:pageoutage
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const root = path.join(__dirname, '..');
const frqGen = require(path.join(root, 'scripts', 'frq-pages-csv.js'));
const labGen = require(path.join(root, 'scripts', 'lab-pages-csv.js'));
const frq = require(path.join(root, 'lib', 'frq-spec.js'));
const labs = require(path.join(root, 'lib', 'lab-spec.js'));
const practice = require(path.join(root, 'lib', 'practice-index.js'));
const boot = require(path.join(root, 'lib', 'page-bootstrap.js'));

let pass = 0; let fail = 0;
function ok(msg, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg + (detail ? '  ' + detail : '')); }
}

function scripts(body) {
  return [...body.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

// The bootstrap DEFINES window.APCSPageGo; the go tag CALLS it. Both mention it,
// so they are told apart by which one declares a function.
function parts(body) {
  const inline = scripts(body);
  return {
    boot: inline.find((s) => s.includes('APCSPageFallback') && s.includes('function')),
    go: inline.find((s) => s.includes('APCSPageGo[') && !s.includes('function')),
  };
}

function stubDom(mountId) {
  const nodes = new Map();
  const mk = (id) => ({ id, innerHTML: '', textContent: '' });
  nodes.set(mountId, mk(mountId));
  nodes.set(boot.sentinelId(mountId), mk(boot.sentinelId(mountId)));
  return {
    getElementById: (id) => nodes.get(id) || null,
    _drop: (id) => nodes.delete(id),
    _get: (id) => nodes.get(id),
    _nodes: nodes,
  };
}

// Executes the real bootstrap under one simulated condition and reports whether
// the student sees the fallback.
function play(body, mountId, install) {
  const { boot: b, go } = parts(body);
  if (!b || !go) return { error: 'no bootstrap in this body' };
  const doc = stubDom(mountId);
  const win = {};
  const timers = [];
  const savedWindow = global.window;
  const savedDoc = global.document;
  const savedTimeout = global.setTimeout;
  global.window = win;
  global.document = doc;
  global.setTimeout = (fn) => { timers.push(fn); return 0; };
  try {
    install(win, doc);
    // eslint-disable-next-line no-eval
    eval(b);
    try {
      // eslint-disable-next-line no-eval
      eval(go.replace('window.APCSPageGo', 'win.APCSPageGo'));
    } catch (e) { /* a throwing mount is one of the cases under test */ }
    timers.forEach((fn) => fn());
  } finally {
    global.window = savedWindow;
    global.document = savedDoc;
    global.setTimeout = savedTimeout;
  }
  return { doc, mount: doc._get(mountId) };
}

function shown(r) {
  return !!(r.mount && String(r.mount.innerHTML).includes('apcs-offline'));
}

// A page and the API it mounts from deploy independently: pages ship by
// Matrixify import, players ship by Railway deploy. So a page is ALWAYS liable
// to run against an older player than the one it was generated against, and
// that skew is permanent rather than a one-off during a rollout.
//
// The older player returns undefined from mountById and swallows its rejection.
// The bootstrap must therefore never depend on getting a promise back. These
// cases pin what happens when it does not.
const OLD_PLAYER = [
  ['an older player, healthy API', (w, d, n, g, mid) => {
    w[g] = { mountById: (el) => { n.delete(boot.sentinelId(mid));
      el.innerHTML = '<div>real content</div>'; return undefined; } };
  }, false],
  // The old player writes its own bare sentence, which removes the sentinel.
  // The student keeps today's message rather than gaining the better one. That
  // is a degradation, not a regression, and it ends when the API deploys.
  ['an older player whose fetch rejects', (w, d, n, g, mid) => {
    w[g] = { mountById: (el) => { n.delete(boot.sentinelId(mid));
      el.textContent = 'This practice question could not be loaded.'; return undefined; } };
  }, false],
  // The mode with no natural end is fixed even against the old player, because
  // the sentinel timeout does not involve the player at all.
  ['an older player against a hanging API', (w, d, n, g) => {
    w[g] = { mountById: () => undefined };
  }, true],
];

const CASES = [
  ['the player script never loads', () => {}, true],
  ['the spec fetch rejects', (w, d, g) => { w[g] = { mountById: () => Promise.reject(new Error('down')) }; }, true],
  ['the API hangs and never answers', (w, d, g) => { w[g] = { mountById: () => new Promise(() => {}) }; }, true],
  ['mountById throws synchronously', (w, d, g) => { w[g] = { mountById: () => { throw new Error('boom'); } }; }, true],
];

function suite(label, body, mountId, globalName) {
  console.log('\n' + label);
  for (const [name, install, expect] of CASES) {
    const r = play(body, mountId, (w, d) => install(w, d, globalName));
    if (r.error) { ok(`${name}: ${r.error}`, false); continue; }
    ok(`${name}: student sees an explanation, not a spinner`, shown(r) === expect);
  }
  for (const [name, install, expect] of OLD_PLAYER) {
    const r = play(body, mountId, (w, d) => install(w, d, d._nodes, globalName, mountId));
    ok(`${name}: behaves`, shown(r) === expect);
  }

  // The one that protects every healthy page on the site.
  const good = play(body, mountId, (w, d) => {
    w[globalName] = { mountById: (el) => {
      d._drop(boot.sentinelId(mountId));
      el.innerHTML = '<div>the real thing</div>';
      return Promise.resolve();
    } };
  });
  ok('a healthy API does NOT trigger the fallback', shown(good) === false);
  ok('the fallback offers somewhere to go that does not need this API',
    /href="https:\/\/www\.apcsexamprep\.com\/pages\//.test(
      play(body, mountId, () => {}).mount.innerHTML));
}

// ── the DSA pages ────────────────────────────────────────────────────────────
{
  const index = practice.forCourse('ap-cybersecurity');
  const spec = frq.all().find((s) => s.course === 'ap-cybersecurity');
  const body = frqGen.build(spec, index).bodyHtml;
  suite(`DEVICE SECURITY ANALYSIS (${spec.set_id})`, body,
    'apcs-frq-' + spec.set_id, 'APCSFrq');
}

// ── the lab pages, including a course with no hub ────────────────────────────
for (const course of ['ap-cybersecurity', 'ap-networking']) {
  const spec = labs.all().find((s) => s.course === course);
  if (!spec) continue;
  const body = labGen.build(spec, practice.forCourse(course)).bodyHtml;
  suite(`TERMINAL LAB (${course} ${spec.item_id})`, body,
    'apcs-lab-' + spec.item_id.replace(/[^a-z0-9]+/gi, '-'), 'APCSLab');
}

// ── the hubs are immune by construction, and that must stay true ─────────────
console.log('\nTHE HUBS DO NOT DEPEND ON THE API AT ALL');
{
  const hubs = require(path.join(root, 'scripts', 'cyber-practice-hubs-csv.js'));
  const index = practice.forCourse('ap-cybersecurity');
  for (const p of [hubs.buildFrqHub(index), hubs.buildLabsHub(index), hubs.buildUmbrella(index)]) {
    const b = p.bodyHtml;
    // Every card is real HTML in the body, so the page is complete before any
    // script runs. This is what makes the hubs a safe fallback destination.
    for (const s of index.frq) {
      if (!b.includes('data-practice-kind="frq"')) break;
      ok(`${p.handle}: ${s.set_id} is in the static HTML, not fetched`,
        b.includes(s.page_url));
    }
    ok(`${p.handle}: no inline call that could throw if the script fails`,
      !/<script>[^<]*APCSPracticeHub\./.test(b));
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
