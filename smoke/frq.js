'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  DEVICE SECURITY ANALYSIS practice sets.
//
//  Two things this suite is really for.
//
//  1. THE SHAPE IS THE POINT. The AP Cybersecurity exam has exactly one
//     free-response question and it is always parts A to E over several sources
//     from a single device (CED page 147, docs/cyber-exam-format.md). A set that
//     drifts from that shape is not easier or harder practice, it is practice
//     for an exam that does not exist. So the validator is strict and this
//     suite proves the strictness actually fires.
//
//  2. NOTHING A STUDENT WRITES MAY LEAVE THE PAGE. A free-response answer is
//     free text, which this repo does not store. The player is checked here for
//     any upload path at all, and the check is written to fail on a future edit
//     rather than to pass today.
//
//  It also mounts the REAL player under a DOM stub and plays every set, so a
//  spec that cannot render fails the build instead of a class.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const frq = require(path.join(__dirname, '..', 'lib', 'frq-spec.js'));

let pass = 0; let fail = 0;
function ok(msg, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg + (detail ? '  ' + detail : '')); }
}

console.log('\nSPECS');
{
  const errs = frq.errors();
  ok('every spec in config/frq validates', errs.length === 0, errs.join('\n        '));
  ok('at least two sets are authored, so a student can practise twice',
    frq.all().length >= 2, String(frq.all().length));

  const ids = frq.all().map((s) => s.set_id);
  ok('no two sets share a set_id', new Set(ids).size === ids.length, ids.join(','));

  for (const spec of frq.all()) {
    const at = spec.set_id;
    const kinds = spec.sources.map((s) => s.kind);
    ok(`${at}: has the sources the parts depend on`,
      ['firewall-rules', 'auth-log', 'file-listing', 'policy'].every((k) => kinds.includes(k)),
      kinds.join(','));
    ok(`${at}: 50 minutes, as the CED suggests`, (spec.est_minutes || 50) === 50);
    ok(`${at}: part C asks the student to Write a command`,
      spec.parts.C.subparts.some((sp) => sp.verb === 'Write'));
    ok(`${at}: every subpart ships a sample response and credit points`,
      Object.values(spec.parts).every((p) => p.subparts.every(
        (sp) => sp.sample && Array.isArray(sp.credit) && sp.credit.length)));
    // Part B names a row range; those rows must exist in the auth log.
    const auth = spec.sources.find((s) => s.kind === 'auth-log');
    const m = /rows (\d+) to (\d+)/.exec(spec.parts.B.stem || '');
    ok(`${at}: part B's cited row range exists in the auth log`,
      !!m && Number(m[2]) <= auth.lines.length,
      m ? `cites up to ${m[2]}, log has ${auth.lines.length}` : 'no row range in the stem');
    // The adversary IP in B(ii) must actually appear in the log.
    const ip = (spec.parts.B.subparts.find((sp) => sp.verb === 'Identify') || {}).sample;
    ok(`${at}: the adversary IP in part B appears in the log`,
      !!ip && auth.lines.some((l) => l.includes(ip.trim())), ip);
    // The chmod answer must name a file that exists in the listing.
    const write = spec.parts.C.subparts.find((sp) => sp.verb === 'Write');
    const listing = spec.sources.find((s) => s.kind === 'file-listing');
    const names = listing.entries.map((e) => e[e.length - 1]);
    ok(`${at}: the chmod command names a file from the listing`,
      names.some((n) => write.sample.includes(n)), write.sample.split('\n')[0]);
  }
}

console.log('\nTHE VALIDATOR ACTUALLY REFUSES');
{
  const good = JSON.parse(JSON.stringify(frq.all()[0]));

  const noPartE = JSON.parse(JSON.stringify(good));
  delete noPartE.parts.E;
  ok('a set missing part E is refused', frq.validate(noPartE, 'x').length > 0);

  const wrongSubject = JSON.parse(JSON.stringify(good));
  wrongSubject.parts.C.subject = 'firewall';
  ok('a part C that is secretly about firewalls is refused',
    frq.validate(wrongSubject, 'x').some((p) => p.includes('subject')));

  const noWrite = JSON.parse(JSON.stringify(good));
  noWrite.parts.C.subparts = noWrite.parts.C.subparts.filter((sp) => sp.verb !== 'Write');
  ok('a part C that never asks for a command is refused',
    frq.validate(noWrite, 'x').some((p) => p.includes('Write')));

  const badVerb = JSON.parse(JSON.stringify(good));
  badVerb.parts.A.subparts[0].verb = 'Discuss';
  ok('a task verb the CED does not use is refused',
    frq.validate(badVerb, 'x').some((p) => p.includes('Discuss')));

  const noSample = JSON.parse(JSON.stringify(good));
  delete noSample.parts.A.subparts[0].sample;
  ok('a subpart with no sample response is refused, because self-scoring needs one',
    frq.validate(noSample, 'x').some((p) => p.includes('sample')));

  const asksName = JSON.parse(JSON.stringify(good));
  asksName.parts.A.subparts[0].prompt = 'Write your name and explain the policy.';
  ok('a set that asks for the student name is refused',
    frq.validate(asksName, 'x').some((p) => p.includes('your name')));

  const wrongTime = JSON.parse(JSON.stringify(good));
  wrongTime.est_minutes = 20;
  ok('a set claiming the wrong suggested time is refused',
    frq.validate(wrongTime, 'x').some((p) => p.includes('50')));
}

console.log('\nZERO PII: NOTHING A STUDENT WRITES MAY LEAVE THE PAGE');
{
  const raw = fs.readFileSync(path.join(__dirname, '..', 'public', 'frq-player.js'), 'utf8');
  // Strip comments before looking for upload paths. The header comment SAYS
  // there is no sendBeacon, and a substring search over the whole file matches
  // that sentence and fails on the documentation rather than the code. Check
  // what the file DOES, not what it says about itself.
  const src = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n');
  for (const forbidden of ['XMLHttpRequest', 'sendBeacon', 'FormData', '.submit(',
    'method:"POST"', "method: 'POST'", 'method:"PUT"', 'navigator.send']) {
    ok(`the player contains no ${forbidden}`, src.indexOf(forbidden) === -1);
  }
  const fetches = (src.match(/fetch\s*\(/g) || []).length;
  ok('the player makes exactly one network call', fetches === 1, String(fetches));
  const call = src.slice(src.indexOf('global.fetch('), src.indexOf('global.fetch(') + 260);
  ok('and that call is a plain GET for the spec, with no body',
    !/body\s*:/.test(call) && !/method\s*:/.test(call), call.split('\n')[0]);
  // This one is deliberately checked against the RAW file: it is a promise made
  // in the rendered copy, and stripping comments would not change that.
  ok('the page tells the student nothing is collected',
    raw.includes('stores and sends nothing') || raw.includes('is collected'));
}

console.log('\nTHE PLAYER RENDERS EVERY SET');
{
  function makeNode(tag) {
    return {
      tagName: tag, className: '', textContent: '', innerHTML: '', id: '', type: '',
      children: [], style: {}, disabled: false,
      appendChild(c) { this.children.push(c); return c; },
      insertBefore(c) { this.children.unshift(c); return c; },
      setAttribute(k, v) { this['_' + k] = v; },
      getAttribute(k) { return this['_' + k] != null ? this['_' + k] : null; },
      addEventListener() {},
      classList: { add() {}, remove() {}, contains() { return false; } },
    };
  }
  global.document = {
    head: makeNode('head'), body: makeNode('body'),
    createElement: (t) => makeNode(t),
    createTextNode: (t) => ({ text: t }),
    getElementById: () => null,
  };
  global.window = global;
  require(path.join(__dirname, '..', 'public', 'frq-player.js'));

  function countDeep(node, pred, seen) {
    seen = seen || 0;
    if (pred(node)) seen += 1;
    (node.children || []).forEach((c) => { seen = countDeep(c, pred, seen); });
    return seen;
  }

  for (const spec of frq.all()) {
    const container = makeNode('div');
    let handle = null; let err = null;
    try {
      handle = global.APCSFrq.mount(container, JSON.parse(JSON.stringify(frq.forBrowser(spec))));
    } catch (e) { err = e.stack; }
    ok(`${spec.set_id}: mounts without throwing`, !!handle, err);
    if (!handle) continue;
    const parts = countDeep(handle.root, (n) => n.className === 'frq-part');
    ok(`${spec.set_id}: renders all five parts`, parts === 5, String(parts));
    const subs = countDeep(handle.root, (n) => n.className === 'frq-sub');
    const expected = Object.values(spec.parts).reduce((n, p) => n + p.subparts.length, 0);
    ok(`${spec.set_id}: renders all ${expected} subparts`, subs === expected, String(subs));
    const srcs = countDeep(handle.root, (n) => n.className === 'frq-src');
    ok(`${spec.set_id}: renders all ${spec.sources.length} sources`, srcs === spec.sources.length, String(srcs));
    ok(`${spec.set_id}: every sample starts hidden`,
      countDeep(handle.root, (n) => n.className === 'frq-ans') === expected
      && countDeep(handle.root, (n) => n.className === 'frq-ans open') === 0);
    ok(`${spec.set_id}: the self-score tally starts at zero`, handle.state.earned === 0);
  }
}

console.log('\nTHE ROUTE');
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'frq.js'), 'utf8');
  ok('the index reports spec errors rather than hiding a broken set',
    src.includes('spec_errors'));
  ok('an unknown set 404s', src.includes('status(404)'));
  ok('the router is mounted in server.js',
    fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8').includes("require('./routes/frq')"));
  ok('the route defines no POST at all',
    !/router\.(post|put|patch|delete)\s*\(/.test(src));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
