'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: clicking a padlock on the teacher dashboard sends what the teacher meant
//
//  WHAT WENT WRONG, and it cost a teacher three emails. The lesson padlock could
//  only ever CLOSE.
//
//  A lesson switch is rendered with act='', so the one expression that decided
//  the current state looked the lesson up as a COLUMN:
//
//      colItem({unit:unit, dl:lesson, da:''})   ->  items["unit-1|1.1|"]
//
//  That key never exists. undefined.locked is falsy, so `cur` read 'on' for every
//  lesson whatever its real state, and open=(cur!=='on') came out false on every
//  click. The padlock DISPLAYED the truth, because the header uses lessonState,
//  and then clicking it sent the opposite. There was no click that opened a
//  lesson, and since a lesson-scope write clears the rows under it, each attempt
//  also deleted any per-column opens already made.
//
//  Reported 2026-09-16: "the 1.1 lab is still locked for my students, even though
//  I have unlocked it on my account." She had unlocked it repeatedly.
//
//  WHY THE SERVER SUITES ALL PASSED. They did, and they were right to. Given the
//  rows, the gate resolved correctly every time: a 240 case differential between
//  the board's own gradebook and the student's route found zero disagreements.
//  The defect was never in what the rows MEANT, it was in which row got written,
//  which is one layer up and in a Shopify page body rather than in this repo's
//  runtime. A suite that only drives the API cannot see it.
//
//  So this runs the PAGE'S OWN toggleGate in a vm and records what it would POST.
//  No assertion here restates the code; each one states what a teacher meant by
//  a click.
//
//  Offline, zero PII, no network. No em-dashes.
//  Run: npm run smoke:dashlocktoggle
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PAGE = path.join(__dirname, '..', 'shopify', 'cyber-dashboard.html');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

function loadPage() {
  const html = fs.readFileSync(PAGE, 'utf8');
  const body = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  const el = () => ({
    style: { setProperty() {} }, dataset: {}, value: '', textContent: '', innerHTML: '', checked: false,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, appendChild() {}, setAttribute() {}, getAttribute() { return null; },
    querySelector: () => el(), querySelectorAll: () => [], add() {}, focus() {}, click() {}, remove() {},
    getBoundingClientRect: () => ({ top: 0, left: 0, bottom: 0, right: 0 }),
  });
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    document: { getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [],
      createElement: () => el(), addEventListener() {}, body: el(), documentElement: el() },
    window: { innerWidth: 1400, scrollY: 0, scrollX: 0, addEventListener: () => {},
      location: { search: '', pathname: '/pages/cyber-dashboard', replace() {} } },
    location: { search: '?code=CYBER-TEST', pathname: '/pages/cyber-dashboard', replace() {} },
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
    localStorage: { getItem: () => 'tok', setItem: () => {}, removeItem: () => {} },
    URLSearchParams, AbortController, Blob: function () {}, URL: { createObjectURL: () => '', revokeObjectURL() {} },
    setTimeout, clearTimeout, Math, JSON, Date, String, Number, Array, Object, RegExp,
    isNaN, parseInt, parseFloat, Option: function () {}, Promise,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(body, sandbox, { timeout: 5000 });
  return sandbox.window.TCDash;
}

//  `state` is the CONTRACT's rollup wording: 'all' every child closed, 'none'
//  none closed, anything else mixed.
function board(lessonRoll, unitRoll, items) {
  const D = loadPage();
  D.classCode = 'CYBER-TEST';
  D.gates = {
    course: 'ap-cybersecurity',
    units: unitRoll ? { 'unit-1': { state: unitRoll } } : {},
    lessons: lessonRoll ? { 'unit-1|1.1': { state: lessonRoll } } : {},
    items: items || {},
  };
  D._posted = null;
  D._api = async (m, u, b) => { D._posted = b; return { ok: true }; };
  D.loadProgress = async () => {};
  D.renderUnitFilter = () => {};
  D._token = () => 'tok';
  return D;
}
const CLOSED = { locked: true, lock_enforceable: true };
const OPEN = { locked: false, lock_enforceable: true };

(async () => {
  console.log('\n  running the page\'s own toggleGate and recording what it POSTs\n');

  console.log('1. THE REPORTED BUG: a teacher opening a closed lesson');
  let D = board('all', 'all', { 'unit-1|1.1|lab': CLOSED, 'unit-1|1.1|quiz': CLOSED });
  ok('  the padlock displays the lesson as closed', D.lessonState('unit-1', '1.1') === 'off',
    D.lessonState('unit-1', '1.1'));
  await D.toggleGate(null, 'lesson', 'unit-1', '1.1', '');
  ok('  and clicking it asks the server to OPEN, not to close again',
    D._posted && D._posted.open === true, D._posted);
  ok('  at lesson scope, so it covers every activity under 1.1',
    D._posted && D._posted.lesson === '1.1' && D._posted.activity_type === '', D._posted);

  console.log('\n2. The other direction still works, or the control is one way again');
  D = board('none', 'none', { 'unit-1|1.1|lab': OPEN });
  ok('  an OPEN lesson displays as open', D.lessonState('unit-1', '1.1') === 'on');
  await D.toggleGate(null, 'lesson', 'unit-1', '1.1', '');
  ok('  and clicking it closes the lesson', D._posted && D._posted.open === false, D._posted);

  console.log('\n3. A MIXED lesson settles OPEN on the first click');
  //  Stated in the page and worth holding: the destructive direction must never
  //  be the one you get by accident.
  D = board('some', 'some', { 'unit-1|1.1|lab': CLOSED, 'unit-1|1.1|quiz': OPEN });
  ok('  a part-closed lesson displays as mixed', D.lessonState('unit-1', '1.1') === 'mix',
    D.lessonState('unit-1', '1.1'));
  await D.toggleGate(null, 'lesson', 'unit-1', '1.1', '');
  ok('  and the first click settles it open', D._posted && D._posted.open === true, D._posted);

  console.log('\n4. The scopes that were already right must stay right');
  D = board('all', 'all', { 'unit-1|1.1|lab': CLOSED });
  await D.toggleGate(null, 'col', 'unit-1', '1.1', 'lab');
  ok('  a closed COLUMN opens', D._posted && D._posted.open === true && D._posted.activity_type === 'lab',
    D._posted);
  D = board('all', 'all', { 'unit-1|1.1|lab': OPEN });
  await D.toggleGate(null, 'col', 'unit-1', '1.1', 'lab');
  ok('  an open COLUMN closes', D._posted && D._posted.open === false, D._posted);
  D = board('all', 'all', {});
  await D.toggleGate(null, 'unit', 'unit-1', '', '');
  ok('  a closed UNIT opens, and writes no lesson or activity',
    D._posted && D._posted.open === true && D._posted.lesson === undefined, D._posted);
  D = board('none', 'none', {});
  await D.toggleGate(null, 'unit', 'unit-1', '', '');
  ok('  an open UNIT closes', D._posted && D._posted.open === false, D._posted);

  console.log('\n5. A scope with no rollup writes NOTHING');
  //  The switch is not drawn without a rollup, so a click cannot be something a
  //  teacher meant. Writing a gate row from a state nobody could see is the
  //  failure the render path already refuses twice.
  D = board(null, 'all', { 'unit-1|1.1|lab': CLOSED });
  ok('  a lesson with no rollup has no state to show', !D.lessonState('unit-1', '1.1'),
    D.lessonState('unit-1', '1.1'));
  await D.toggleGate(null, 'lesson', 'unit-1', '1.1', '');
  ok('  and clicking it posts nothing at all', D._posted === null, D._posted);

  console.log(`\n  ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
