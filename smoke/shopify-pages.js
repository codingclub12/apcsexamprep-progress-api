'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the Shopify paste sources in shopify/.
//
//  These four files are not served by this app. They are pasted into Shopify
//  page bodies by hand, which means nothing here ever executed them and nothing
//  ever will. A single stray brace in one of them takes the whole page's script
//  block out, and the only way anyone finds out is a teacher reporting that the
//  dashboard "does nothing".
//
//  That is not hypothetical. cyber-dashboard.html carried an orphan "}," after
//  doUnlock for long enough that a downstream package concluded the teacher
//  dashboard had no retry control at all. It has one. The object literal holding
//  it just never parsed, so every TCDash method died with it.
//
//  Two bars, both cheap:
//    1. every script block parses
//    2. the controls the teacher routes exist to serve are actually wired to
//       something, so deleting a button is a test failure and not a discovery
//
//  Run: npm run smoke:shopifypages
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  [PASS] ' + n); } else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); } };

const DIR = path.join(__dirname, '..', 'shopify');
const scriptsOf = (src) => [...src.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const read = (f) => fs.readFileSync(path.join(DIR, f), 'utf8');

console.log('every script block parses');
const pages = fs.readdirSync(DIR).filter((f) => f.endsWith('.html')).sort();
ok('found the paste sources', pages.length > 0, pages);

for (const f of pages) {
  const blocks = scriptsOf(read(f));
  ok('  ' + f + ' has a script block', blocks.length > 0);
  blocks.forEach((code, i) => {
    let err = null;
    // new Function compiles without running, which is the whole point: these
    // pages call fetch and touch the DOM on load and must never execute here.
    try { new Function(code); } catch (e) { err = e.message; }
    ok('  ' + f + ' block ' + i + ' parses', err === null, err);
  });
}

console.log('teacher dashboard controls are wired');
const dash = read('cyber-dashboard.html');

// Each of these is a route that already exists in routes/teacher.js. A control
// that is not referenced from an onclick is a route with no way to reach it,
// which is the state this suite was written to stop recurring.
ok('class retry toggle is bound to a handler',
  /onclick="TCDash\.toggleClassRetry\(\)"/.test(dash));
ok('  and toggleClassRetry PATCHes the class retry route',
  /toggleClassRetry[\s\S]{0,600}\/api\/teacher\/classes\/\$\{this\.classCode\}\/retry/.test(dash));

ok('unlock button is bound to a handler',
  /onclick=\\"TCDash\.openUnlockModal\(/.test(dash) || /TCDash\.openUnlockModal\(/.test(dash));
ok('  and doUnlock PATCHes the progress unlock route',
  /doUnlock[\s\S]{0,600}\/progress\/\$\{progressId\}\/unlock/.test(dash));

ok('per-student retry override PATCHes the student retry route',
  /\/students\/\$\{studentId\}\/retry/.test(dash));
ok('  and can clear an override back to the class default',
  /retry_override:\s*null/.test(dash));

// The methods above only exist if the object literal they live in parsed, which
// the block above already asserted. This pins that they are reachable as
// properties rather than, say, stranded after an early close brace.
console.log('the dashboard object exposes them as methods');
const dashBlocks = scriptsOf(dash);
const defined = new Set();
for (const code of dashBlocks) {
  const re = /^\s{2}(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(/gm;
  let m;
  while ((m = re.exec(code)) !== null) defined.add(m[1]);
}
for (const name of ['toggleClassRetry', 'doUnlock', 'openUnlockModal', 'loadProgress']) {
  ok('  TCDash.' + name + ' is defined', defined.has(name));
}

// Every this.X() the dashboard calls on itself must resolve to a method it
// actually has. Four mutations called this.loadData(), which was never defined:
// the PATCH landed, then the refresh threw, so the teacher saw a stale table and
// no error. A typo'd self-call is invisible until a human clicks the button.
console.log('every self-call resolves to a real method');
const selfCalls = new Set();
for (const code of dashBlocks) {
  const re = /this\.([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = re.exec(code)) !== null) selfCalls.add(m[1]);
}
const dangling = [...selfCalls].filter((n) => !defined.has(n));
ok('no this.X() call points at a method that does not exist', dangling.length === 0, dangling);

console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
process.exit(fail ? 1 : 0);
