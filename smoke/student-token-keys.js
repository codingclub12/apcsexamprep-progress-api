'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: every browser player finds a signed-in student's token
//
//  WHAT WENT WRONG, and it reached a teacher. The 1.1 analysis lab page supplied
//  a getToken reading localStorage 'apcs_student_token' and nothing else. Nothing
//  WRITES that key: shopify/join.html sets 'apcse_token' at sign-in and all 20
//  token references in the theme read that one. So a signed-in student sent no
//  Authorization header, the server saw an anonymous request, and the teacher's
//  lock could not bind them.
//
//  WHY NOBODY SAW IT FOR A WEEK. Until board 277 an anonymous caller was refused
//  any activity some class had closed, so the page LOOKED locked and a missing
//  token changed nothing anybody could perceive. Opening the anonymous case
//  exposed it the same day: "it didn't lock when the teacher locked it for a
//  student". A guard that only asked "does the player send Authorization" would
//  have passed throughout, because it always did. The question is whether it
//  finds anything to send.
//
//  WHY THIS IS A TEXT SCAN. These players are ES5, served standalone, loaded
//  cross origin, with no build step, so they cannot require the shared list.
//  lib/student-token-keys.js is the authority and this reads both sides.
//
//  IT ALSO RUNS THEM. A key named in a comment is not a key resolved, so each
//  player is executed against a fake localStorage holding ONLY 'apcse_token' and
//  has to produce it. That is the assertion a pasted list cannot fake.
//
//  Offline, zero PII, no network. No em-dashes.
//  Run: npm run smoke:studenttokenkeys
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const KEYS = require('../lib/student-token-keys');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 200) : '')); }
};

const ROOT = path.join(__dirname, '..');
//  Every browser script that resolves a student token for itself.
const PLAYERS = ['public/lab-player.js', 'public/analysis-player.js', 'public/heartbeat-reporter.js'];

console.log('\n  canonical: ' + KEYS.GLOBAL_KEY + ' then ' + KEYS.STORAGE_KEYS.join(', ') + '\n');

console.log('1. Every player names every canonical key');
for (const rel of PLAYERS) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const missing = KEYS.STORAGE_KEYS.filter((k) => !src.includes(k));
  ok('  ' + rel + ' names all ' + KEYS.STORAGE_KEYS.length + ' storage keys', missing.length === 0, missing);
  ok('  ' + rel + ' checks the ' + KEYS.GLOBAL_KEY + ' global first', src.includes(KEYS.GLOBAL_KEY));
}

console.log('\n2. THE KEY THAT SIGN-IN ACTUALLY WRITES comes first');
//  Ordering is not cosmetic: a player that reads a stale key before the live one
//  serves whatever a previous build left behind.
//
//  Scanned inside the RESOLUTION EXPRESSION rather than across the file. The
//  first draft of this check used indexOf over the whole source and failed on all
//  three players, because every one of them explains the dead key in a comment
//  above the code that reads the live one. A guard that cannot tell prose from
//  behaviour is the thing this repo keeps finding in its own validators.
const EXPR = /(?:global|window)\.APCS_STUDENT_TOKEN\s*\|\|[\s\S]{0,400}/;
for (const rel of PLAYERS) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const m = src.match(EXPR);
  ok('  ' + rel + ' has a resolution expression at all', !!m);
  if (!m) continue;
  const at = KEYS.STORAGE_KEYS.map((k) => m[0].indexOf(k));
  ok('  ' + rel + ' reads apcse_token before the older spellings',
    at[0] !== -1 && at.every((pos, i) => i === 0 || (pos !== -1 && pos > at[0])), at);
}

console.log('\n3. THE ASSERTION A PASTED LIST CANNOT FAKE: watch the request');
//  A player that names the key in a comment but reads a different one passes
//  section 1 and fails here. The probe is the Authorization header on the wire,
//  which is the thing the server actually gets.
function headerFor(rel, store, globals, drive) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const seen = [];
  const sandbox = {
    localStorage: { getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem() {}, removeItem() {} },
    document: {
      createElement: () => ({ appendChild() {}, setAttribute() {}, style: {}, classList: { add() {} } }),
      getElementById: () => null, createTextNode: () => ({}), addEventListener() {},
      querySelector: () => null, querySelectorAll: () => [],
    },
    fetch: (url, opts) => { seen.push({ url, opts }); return new Promise(() => {}); },
    setTimeout, clearTimeout, setInterval, clearInterval, console,
    navigator: { sendBeacon: () => true },
  };
  Object.assign(sandbox, globals || {});
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  const ctx = vm.createContext(sandbox);
  try { vm.runInContext(src, ctx, { timeout: 5000 }); } catch (e) { /* mount errors are fine */ }
  try { drive(ctx); } catch (e) { /* the fetch never settles on purpose */ }
  const call = seen[0];
  const h = call && call.opts && call.opts.headers;
  return h ? (h.Authorization || h.authorization || '') : '';
}

const LIVE = 'the-real-token';
const container = { textContent: '', innerHTML: '', setAttribute() {}, appendChild() {},
  classList: { add() {} }, style: {} };

const labAuth = headerFor('public/lab-player.js', { apcse_token: LIVE }, {},
  (ctx) => ctx.APCSLab.mountById(container, 'ap-cybersecurity', '1.2-auth-lab'));
ok('  lab-player sends the token stored under apcse_token',
  labAuth === 'Bearer ' + LIVE, labAuth);

//  THE EXACT SHAPE OF THE LIVE PAGE: a configured getToken naming the DEAD key.
//  Before 2026-09-14 this produced no header at all.
const deadConf = { APCS_ANALYSIS: { base: '',
  getToken: function () { try { return localStorage.getItem('apcs_student_token') || ''; } catch (e) { return ''; } } } };
const anaAuth = headerFor('public/analysis-player.js', { apcse_token: LIVE }, deadConf,
  (ctx) => ctx.APCSAnalysis.mountById(container, 'ap-cybersecurity', '1.1-lab'));
ok('  analysis-player falls through a getToken naming the DEAD key and still sends it',
  anaAuth === 'Bearer ' + LIVE, anaAuth);

//  And a page that supplies a CORRECT getToken is still honoured rather than
//  overridden, so the fallback is a safety net and not a replacement.
const goodConf = { APCS_ANALYSIS: { base: '', getToken: function () { return 'page-supplied'; } } };
const goodAuth = headerFor('public/analysis-player.js', { apcse_token: LIVE }, goodConf,
  (ctx) => ctx.APCSAnalysis.mountById(container, 'ap-cybersecurity', '1.1-lab'));
ok('  and a page supplying a WORKING getToken still wins', goodAuth === 'Bearer page-supplied', goodAuth);

//  A genuinely signed-out visitor must still send nothing, or the gate cannot
//  tell a passer-by from a student and board 277 stops meaning anything.
const anonAuth = headerFor('public/analysis-player.js', {}, {},
  (ctx) => ctx.APCSAnalysis.mountById(container, 'ap-cybersecurity', '1.1-lab'));
ok('  a signed-out visitor still sends no Authorization at all', anonAuth === '', anonAuth);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
