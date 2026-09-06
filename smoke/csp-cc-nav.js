'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the CSP Command Center nav repair.
//
//  CSP's nav is a leftover from before CSA existed: two hubs and the text
//  "CSA soon", where every other Command Center carries four hubs plus
//  Gradebook. So a CSP teacher has no route to their own gradebook, and since
//  the Assigned / Not assigned controls live there, no route to those either.
//
//  The repair DERIVES CSP's nav from the cyber page's live nav rather than
//  retyping it, so the two cannot drift and a fifth course added tomorrow is
//  picked up for free. That makes the interesting assertions about what it
//  REFUSES: a source nav it cannot copy from, and an edit that reaches outside
//  the nav it was asked to replace.
//
//  Offline and secret-free: pure functions over fixture strings, no network.
//  Zero PII. No em-dashes.
//
//  Run: npm run smoke:cspccnav
// ─────────────────────────────────────────────────────────────────────────────
const { deriveNav, repair } = require('../scripts/csp-cc-nav-repair');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 240) : '')); }
};
const threw = (fn, re) => { try { fn(); return false; } catch (e) { return re.test(e.message); } };

// The live shapes, as read from the store on 2026-09-06.
const CYBER_NAV = '<nav class="ccx-bar" aria-label="Teacher hubs"><span class="ccx-lbl">Hubs</span>'
  + '<a class="ccx-link ccx-active" href="/pages/cyber-command-center" aria-current="page">Cyber</a>'
  + '<a class="ccx-link" href="/pages/csp-command-center">CSP</a>'
  + '<a class="ccx-link" href="/pages/csa-command-center">CSA</a>'
  + '<a class="ccx-link" href="/pages/ap-networking-command-center">Networking</a>'
  + '<span class="ccx-sep"></span><a class="ccx-link" href="/pages/cyber-dashboard">Gradebook -&gt;</a></nav>';
const CSP_NAV = '<nav class="ccx-bar" aria-label="Teacher hubs"><span class="ccx-lbl">Hubs</span>'
  + '<a class="ccx-link" href="/pages/cyber-command-center">Cyber</a>'
  + '<a class="ccx-link ccx-active" href="/pages/csp-command-center" aria-current="page">CSP</a>'
  + '<span class="ccx-soon">CSA soon</span></nav>';
const body = (nav) => '<div id="apcs-ccx"><style>.x{}</style> ' + nav + ' </div> <p>topic accordions and 129KB of other things</p>';

console.log('\n1. The nav is derived, and lands on the right anchor');
const next = deriveNav(CYBER_NAV, '/pages/csp-command-center');
ok('exactly one anchor is current', (next.match(/ccx-active/g) || []).length === 1);
ok('and it is the CSP one',
  /<a class="ccx-link ccx-active" href="\/pages\/csp-command-center" aria-current="page">CSP<\/a>/.test(next));
ok('cyber is no longer current', !/cyber-command-center" aria-current/.test(next));
ok('all four hubs survive',
  ['cyber-command-center', 'csp-command-center', 'csa-command-center', 'ap-networking-command-center']
    .every((h) => next.includes('/pages/' + h)));
ok('and the gradebook link is carried across', next.includes('/pages/cyber-dashboard'));
ok('"CSA soon" is gone', !/CSA soon/.test(next));

console.log('\n2. It refuses rather than inventing');
//  The whole point of deriving is that it copies. A source without the link is
//  a source it cannot copy from, and writing one from memory is how two pages
//  drift in the first place.
ok('a source nav with no gradebook link is refused',
  threw(() => deriveNav(CYBER_NAV.replace(/<a class="ccx-link" href="\/pages\/cyber-dashboard">[^<]*<\/a>/, ''),
    '/pages/csp-command-center'), /does not link the gradebook/));
ok('a target with no anchor in the source is refused',
  threw(() => deriveNav(CYBER_NAV, '/pages/does-not-exist'), /no anchor for/));

console.log('\n3. It touches the nav and nothing else');
const r = repair(body(CSP_NAV), body(CYBER_NAV));
ok('the CSP nav was replaced', r.out.includes('/pages/cyber-dashboard') && !r.out.includes('CSA soon'));
ok('every byte outside the nav is unchanged',
  r.out.replace(/<nav class="ccx-bar"[\s\S]*?<\/nav>/, 'X') === body(CSP_NAV).replace(/<nav class="ccx-bar"[\s\S]*?<\/nav>/, 'X'));
ok('the surrounding page content survived', /129KB of other things/.test(r.out));
ok('a page with no nav is refused', threw(() => repair('<div>no nav here</div>', body(CYBER_NAV)), /no nav found on the CSP page/));
ok('a source with no nav is refused', threw(() => repair(body(CSP_NAV), '<div>nothing</div>'), /no nav found on the source page/));
ok('two navs on the target are refused, rather than guessing which',
  threw(() => repair(body(CSP_NAV) + CSP_NAV, body(CYBER_NAV)), /more than one nav/));

console.log('\n4. It is idempotent');
//  Re-running against an already repaired page must be a no-op, so a second
//  import cannot undo the first.
const again = repair(r.out, body(CYBER_NAV));
ok('running it twice changes nothing the second time', again.out === r.out);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
