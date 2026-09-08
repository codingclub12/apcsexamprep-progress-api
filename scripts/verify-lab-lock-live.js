'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  LIVE: a closed lab reads as closed on the deployed player.
//
//  NOT A SECOND OPINION ABOUT scripts/verify-lab-player-live.sh, which checks
//  the same asset and should be run beside this one. That script greps the
//  deployed bytes for the locked message and reads the delivered Cache-Control,
//  and both are things this does not do.
//
//  WHAT A GREP CANNOT SEE, AND WHY IT IS THE HALF THAT BREAKS
//  mountById must RESOLVE on a locked response. The lab pages wrap the mount in
//  their own offline fallback, attached to .catch, which replaces the container
//  wholesale, so a locked card drawn on a rejected promise is drawn and then
//  painted over. The student then reads "The practice service is not responding
//  right now. Reload in a minute, or browse the other labs, which keeps working
//  while this is down" about a lab a teacher closed on purpose, and on
//  2026-09-08 every other cyber lab that link offers was closed too. No grep of
//  the bytes distinguishes that from working. Running them does.
//
//  That script's own header records the same lesson from the other side: its
//  first draft grepped for "Authorization" and passed against a build that
//  still had the bug, because the player had always sent that header somewhere
//  else. A string being present is not the behaviour being right.
//
//  So this pulls the DEPLOYED player and the LIVE gate response and runs the
//  one against the other under a DOM stub. No browser: CI has none, and the
//  failure this guards is in the promise, not in the layout.
//
//  Zero PII: public assets and an unauthenticated API read.
//  No em-dashes, per repo convention.
//  Run: node scripts/verify-lab-lock-live.js
// ─────────────────────────────────────────────────────────────────────────────
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const API = 'https://progress.apcsexamprep.com';

//  The progress API is a different origin from the storefront and is not behind
//  its bot management, so it is fetched directly. Nothing here touches
//  www.apcsexamprep.com; anything that did would go through
//  lib/storefront-fetch.js, per the repo rule and smoke:storefront rule 5.6.
function get(pathname) {
  const out = cp.execFileSync('curl',
    ['-sS', '--max-time', '45', '--compressed', '-w', '\n%{http_code}', API + pathname],
    { encoding: 'utf8', maxBuffer: 1 << 26 });
  const i = out.lastIndexOf('\n');
  return { code: out.slice(i + 1).trim(), body: out.slice(0, i) };
}

let pass = 0, fail = 0;
function ok(cond, label, detail) {
  if (cond) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label + (detail ? '\n        ' + detail : '')); }
}

// ── the deployed asset, not the working copy ─────────────────────────────────
const asset = get('/lab-player.js');
ok(asset.code === '200', 'the deployed lab-player.js is being served', 'HTTP ' + asset.code);
if (asset.code !== '200') { console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(1); }

// ── a DOM small enough to read, the same shape smoke/labs.js uses ────────────
function makeNode(tag) {
  return {
    tagName: tag, className: '', textContent: '', innerHTML: '', value: '', id: '',
    children: [], style: {}, disabled: false, type: '',
    classList: { add() {}, remove() {}, contains() { return false; } },
    appendChild(c) { this.children.push(c); return c; },
    setAttribute() {}, removeAttribute() {}, focus() {},
    scrollTop: 0, scrollHeight: 0, addEventListener() {},
    querySelector() { return makeNode('span'); },
  };
}
global.document = {
  head: makeNode('head'), body: makeNode('body'),
  createElement: (t) => makeNode(t), getElementById: () => null, querySelector: () => null,
};
global.window = global;
global.localStorage = { getItem: () => '', setItem() {} };
global.APCS_LAB = { base: '' };
global.fetch = () => Promise.reject(new Error('verifier: no unstubbed fetch'));

//  Load the DEPLOYED bytes. Requiring ../public/lab-player.js would test the
//  working copy and pass on a deploy that never happened, which is exactly the
//  assertion this repo calls decoration.
const tmp = path.join(os.tmpdir(), 'apcse-deployed-lab-player-' + process.pid + '.js');
fs.writeFileSync(tmp, asset.body);
require(tmp);
fs.unlinkSync(tmp);
const APCSLab = global.APCSLab;
ok(!!(APCSLab && APCSLab.mountById), 'the deployed bytes load and expose mountById');

function renderedText(node) {
  let out = node.textContent || '';
  for (const c of node.children || []) out += renderedText(c);
  return out;
}
async function play(body, httpOk) {
  const container = makeNode('div');
  global.fetch = () => Promise.resolve({
    ok: httpOk !== false, status: httpOk === false ? 404 : 200,
    json: () => Promise.resolve(body),
  });
  let rejected = null;
  try { await APCSLab.mountById(container, 'ap-cybersecurity', '1.2-lab'); }
  catch (e) { rejected = e; }
  return { text: renderedText(container), rejected };
}

const OUTAGE_WORDS = ['not responding', 'Reload in a minute', 'on our side'];

(async () => {
  //  The live gate decides this, not the verifier. A lab nobody has closed is
  //  served, so this reports which state it found rather than demanding one.
  const specs = ['1.2-lab', '1.2-auth-lab', '2.4-lab'].map((id) => {
    const r = get('/api/labs/ap-cybersecurity/' + id);
    let j = null;
    try { j = JSON.parse(r.body); } catch (e) {}
    return { id, code: r.code, json: j };
  });
  const locked = specs.filter((s) => s.json && s.json.locked);
  console.log('\n  live gate state: ' + specs.map((s) =>
    s.id + '=' + (s.json && s.json.locked ? s.json.reason : 'open')).join('  '));

  ok(specs.every((s) => s.code === '200'),
    'every cyber lab spec answers 200, open or closed',
    specs.map((s) => s.id + ':' + s.code).join(' '));

  if (!locked.length) {
    //  Not a failure. It means every class reopened its labs, and the branch is
    //  then unreachable from production. Say so rather than passing quietly on
    //  a synthetic body, which would read as proof of something it did not see.
    console.log('  NOTE  no cyber lab is currently closed, so the live locked path');
    console.log('        could not be exercised against a real response. The branch');
    console.log('        is still checked below against the deployed bytes.');
  }
  for (const s of locked) {
    const r = await play(s.json);
    ok(r.rejected === null,
      s.id + ' (' + s.json.reason + '): the deployed player RESOLVES, so the page fallback stays off',
      r.rejected ? 'rejected: ' + r.rejected.message : '');
    ok(/closed|not open/i.test(r.text),
      s.id + ': a student reads that it is closed', r.text.slice(0, 140));
    ok(!OUTAGE_WORDS.some((w) => r.text.indexOf(w) !== -1),
      s.id + ': and reads nothing about an outage or reloading', r.text.slice(0, 140));
  }

  //  Both reason shapes against the deployed bytes, whatever the gate is doing
  //  tonight. A branch that only handled the anonymous prefix would satisfy
  //  every assertion above on a night when every lock happened to be anonymous.
  const anon = await play({ course: 'ap-cybersecurity', item_id: '1.2-lab',
    locked: true, reason: 'anonymous-closed-for-activity', lab: null });
  const stu = await play({ course: 'ap-cybersecurity', item_id: '1.2-lab',
    locked: true, reason: 'closed-for-activity', lab: null });
  ok(anon.rejected === null && stu.rejected === null,
    'the deployed player resolves for both an anonymous and a signed-in lock');
  ok(/not open|closed/i.test(stu.text),
    'and a signed-in student reads that it is not open', stu.text.slice(0, 120));

  //  The outage card must still exist for real outages.
  const broken = await play({ error: 'no such lab' }, false);
  ok(broken.rejected !== null,
    'a genuine failure still rejects on the deployed player, so real outages still say so');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
