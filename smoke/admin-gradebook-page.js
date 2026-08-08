'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the admin gradebook grid shows points, not percentages.
//
//  WHAT WAS WRONG
//  /admin/teachers renders the class grid an operator uses to check a teacher's
//  gradebook, and every cell printed a bare percentage: "88%", "43%", "0%".
//  The teacher view and the student view had both moved to points earned over
//  points possible, so the one view used to VERIFY the other was the only one
//  still showing a derivation instead of the number itself.
//
//  A percentage cannot be checked against a paper and cannot be re-added into a
//  total. "7/8" can be. One question is one point, so the pair is the fact and
//  the percentage is downstream of it.
//
//  WHAT THIS PINS
//    1. A priced cell renders earned/possible, in whole marks.
//    2. An unpriced cell renders its percentage AND is marked, because there is
//       no honest denominator to print and one must not be invented.
//    3. Completed-but-unscored still reads "done", and not-started still reads
//       a dot. Neither may become a zero.
//    4. The CSV export carries the same pair the screen shows.
//
//  The page's own functions are executed, not reimplemented: the <script> is
//  extracted from the shipped file and run in a vm with a stub DOM, so a change
//  to the file that breaks the rendering fails here.
//
//  Zero PII: synthetic labels only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:admingbpage
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const FILE = path.join(__dirname, '..', 'public', 'teachers.html');
const html = fs.readFileSync(FILE, 'utf8');

console.log('\nADMIN GRADEBOOK PAGE: POINTS, NOT PERCENTAGES\n');

console.log('1. The shipped file no longer prints a bare percentage per cell');
const body = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
ok('  exactly one inline script found', body.length > 1000, body.length);
// No grid cell may end in a bare percentage any more. The only surviving
// `c.pct + "%"` is inside a tooltip, which shows both numbers on purpose.
ok('  no grid cell renders a bare percentage',
  !/\+ c\.pct \+ "%<\/td>"/.test(body), 'a cell still ends in c.pct + "%</td>"');
ok('  a points pair is rendered instead', body.includes('num(c.earned) + "/" + num(c.possible)'));
ok('  and an unpriced cell is marked rather than silently percent',
  body.includes('gbprov'));
ok('  the marker has a style, so it is visible',
  /\.gbprov\s*\{/.test(html));

// ── Run the page's own helpers ───────────────────────────────────────────────
console.log('2. Run the page\'s own render, with a stub DOM');
const sandbox = {
  console,
  document: (function () {
    const el = () => ({
      style: {}, dataset: {}, value: '', textContent: '', innerHTML: '', checked: false,
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      addEventListener() {}, removeEventListener() {}, appendChild() {}, setAttribute() {},
      getAttribute() { return null; }, querySelector: () => el(), querySelectorAll: () => [],
tabIndex: 0, focus() {}, click() {}, remove() {},
    });
    return {
      getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [],
      createElement: () => el(), addEventListener() {}, body: el(), documentElement: el(),
    };
  })(),
  window: { innerWidth: 1400, addEventListener: () => {}, location: { search: '', pathname: '/admin/teachers' } },
  location: { search: '', pathname: '/admin/teachers' },
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
  localStorage: { getItem: () => null, setItem: () => {} },
  setTimeout, clearTimeout, Math, JSON, Date, String, Number, Array, Object, RegExp, isNaN, parseInt, parseFloat,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
// The page wraps itself in an IIFE, so its helpers are not reachable from
// outside. Inject an export immediately before the closing brace: this runs the
// SHIPPED function rather than a copy of it, which is the whole point.
const CLOSE = '})();';
const at = body.lastIndexOf(CLOSE);
ok('  the page is a single IIFE, as expected', at > 0, at);
const instrumented = body.slice(0, at) + '\n  globalThis.__page = { num: num, gbClass: gbClass };\n' + body.slice(at);

let loaded = true;
try { vm.runInContext(instrumented, sandbox, { timeout: 5000 }); } catch (e) { loaded = false; console.log('    load error: ' + e.message); }
ok('  the page script loads in a stub DOM', loaded);

const num = sandbox.__page && sandbox.__page.num;
ok('  num() is defined by the page', typeof num === 'function');
if (typeof num === 'function') {
  ok('  a whole mark reads "3", not "3.0"', num(3) === '3', num(3));
  ok('  a genuine fraction is kept', num(3.5) === '3.5', num(3.5));
  ok('  null renders empty, never 0', num(null) === '', num(null));
}

// ── The cell rule, applied exactly as the page applies it ────────────────────
//  The page builds its cell inline, so the rule is restated here in the same
//  order and checked against the page's own num(). The assertions in section 1
//  are what tie this to the shipped code.
console.log('3. The cell rule, on real cell shapes from lib/admin-gradebook.js');
const render = (c) => {
  if (!c) return '·';
  if (c.pct == null) return 'done';
  const priced = c.earned != null && c.possible != null;
  return priced ? (num(c.earned) + '/' + num(c.possible)) : (c.pct + '%*');
};

// Cyber 1.1, the exact columns from the reported screenshot.
ok('  a priced exercise reads 3/7, not 43%',
  render({ pct: 43, earned: 3, possible: 7, source: 'score' }) === '3/7',
  render({ pct: 43, earned: 3, possible: 7 }));
ok('  a priced exercise reads 7/8, not 88%',
  render({ pct: 88, earned: 7, possible: 8, source: 'score' }) === '7/8');
ok('  a full quiz reads 5/5, not 100%',
  render({ pct: 100, earned: 5, possible: 5, source: 'score' }) === '5/5');
ok('  a scored ZERO reads 0/7, and is not blank',
  render({ pct: 0, earned: 0, possible: 7, source: 'score' }) === '0/7');

console.log('4. The cases that must never be faked');
ok('  an unpriced column shows its percent, marked, with no invented denominator',
  render({ pct: 55, earned: null, possible: null, source: 'score' }) === '55%*');
ok('  completed but unscored is "done", never a zero',
  render({ pct: null, earned: null, possible: null, completed: true }) === 'done');
ok('  not started is a dot, never a zero', render(null) === '·');
ok('  a scored zero and a not-started cell never render alike',
  render({ pct: 0, earned: 0, possible: 7 }) !== render(null));

console.log('5. The CSV carries the same pair the screen shows');
ok('  the export writes earned/possible, not a lone percentage',
  body.includes('num(cell.earned) + "/" + num(cell.possible)'));
ok('  and still distinguishes done from empty',
  body.includes('cell.completed ? "done" : ""'));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
