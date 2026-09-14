'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  LIVE: the DEPLOYED analysis player finds a signed-in student's token.
//
//  WHAT WENT WRONG. The 1.1 lab page supplies a getToken reading localStorage
//  'apcs_student_token'. Nothing writes that key: shopify/join.html sets
//  'apcse_token' at sign-in and every one of the theme's token references reads
//  that one. So a signed-in student sent no Authorization header, the server saw
//  an anonymous request, and the teacher's lock could not bind them. Reported as
//  "it didn't lock when the teacher locked it for a student".
//
//  The same live page proves it on its own bytes: 'apcse_token' appears in it,
//  put there by the theme's tracker, and the analysis mount 130KB later reads a
//  different key.
//
//  WHY THIS RUNS THE BYTES RATHER THAN GREPPING THEM. A string being present is
//  not the behaviour being right, which is the lesson recorded on
//  scripts/verify-lab-lock-live.js: its first draft grepped for "Authorization"
//  and passed against a build that still had the bug, because the player had
//  always sent that header somewhere else. So this pulls the DEPLOYED player,
//  runs it under a DOM stub with a fake localStorage holding ONLY the key sign-in
//  writes, and asserts the header that actually goes on the wire.
//
//  It also drives the page's OWN broken config, so what is verified is the live
//  arrangement rather than a tidy one: a configured getToken naming the dead key
//  must be fallen through, not trusted.
//
//  NO CREDENTIAL NEEDED. The token is a string this script invents; nothing is
//  sent anywhere. Zero PII. No em-dashes.
//  Run: node scripts/verify-analysis-token-live.js
// ─────────────────────────────────────────────────────────────────────────────
const cp = require('child_process');
const vm = require('vm');

const API = process.env.API_BASE || 'https://progress.apcsexamprep.com';
const LIVE_TOKEN = 'a-token-only-under-apcse_token';

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 200) : '')); }
};

const src = cp.execFileSync('curl',
  ['-sS', '--max-time', '30', API + '/analysis-player.js'], { encoding: 'utf8' });

console.log('\n  ' + API + '/analysis-player.js  (' + src.length + ' bytes)\n');
ok('the deployed player is being served at all', src.length > 500 && src.indexOf('mountById') !== -1,
  src.slice(0, 120));

//  Runs the deployed bytes. `store` is the whole of the student's browser.
function headerFrom(store, conf) {
  const seen = [];
  const sandbox = {
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem() {}, removeItem() {},
    },
    document: {
      createElement: () => ({ appendChild() {}, setAttribute() {}, style: {}, classList: { add() {} } }),
      getElementById: () => null, createTextNode: () => ({}), addEventListener() {},
      querySelector: () => null, querySelectorAll: () => [],
    },
    fetch: (url, opts) => { seen.push({ url, opts }); return new Promise(() => {}); },
    setTimeout, clearTimeout, setInterval, clearInterval, console,
  };
  if (conf) sandbox.APCS_ANALYSIS = conf;
  sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
  const ctx = vm.createContext(sandbox);
  vm.runInContext(src, ctx, { timeout: 10000 });
  const container = { textContent: '', innerHTML: '', setAttribute() {}, appendChild() {},
    classList: { add() {} }, style: {} };
  try { ctx.APCSAnalysis.mountById(container, 'ap-cybersecurity', '1.1-lab'); } catch (e) { /* never settles */ }
  const h = seen[0] && seen[0].opts && seen[0].opts.headers;
  return h ? (h.Authorization || h.authorization || '') : '';
}

//  THE LIVE PAGE'S OWN CONFIG, copied from the body served at
//  /pages/ap-cyber-unit-1-lesson-1-lab. This is the arrangement that was broken.
const PAGE_CONF = {
  base: API,
  getToken: function () {
    try { return localStorage.getItem('apcs_student_token') || ''; } catch (e) { return ''; }
  },
};

console.log('1. A signed-in student, with the live page\'s own broken config');
const signedIn = headerFrom({ apcse_token: LIVE_TOKEN }, PAGE_CONF);
ok('  the deployed player sends the token sign-in actually wrote',
  signedIn === 'Bearer ' + LIVE_TOKEN, signedIn || '(no Authorization header at all)');

console.log('\n2. A page that supplies a WORKING getToken is still obeyed');
const supplied = headerFrom({ apcse_token: LIVE_TOKEN },
  { base: API, getToken: function () { return 'page-supplied'; } });
ok('  the fallback is a safety net, not an override', supplied === 'Bearer page-supplied', supplied);

console.log('\n3. A genuinely signed-out visitor still sends nothing');
//  Board 277 only means something if the server can tell a passer-by from a
//  student. A player that invented a header would break the distinction.
const anon = headerFrom({}, PAGE_CONF);
ok('  no token stored means no Authorization header', anon === '', anon);

console.log(`\n  ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFAILED'); process.exit(1); }
console.log('\nOK - the deployed analysis player finds a signed-in student (' + pass + ' checks)');
