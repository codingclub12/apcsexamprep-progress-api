'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Does clicking a lesson padlock OPEN the lesson?
//
//  WHAT WENT WRONG. The dashboard's lesson switch is rendered with act='', so
//  the expression that read its current state looked the lesson up as a COLUMN:
//  colItem({unit,dl:lesson,da:''}) keys the items map at "unit-1|1.1|", which
//  never exists. undefined.locked is falsy, so cur read 'on' for every lesson
//  whatever its real state, and open=(cur!=='on') came out false on every click.
//  The padlock displayed the truth and clicking it sent the opposite, so a
//  lesson could be closed and never reopened.
//
//  Reported 2026-09-16: "the 1.1 lab is still locked for my students, even
//  though I have unlocked it on my account."
//
//  WHY THIS RUNS THE PAGE RATHER THAN GREPPING IT. A string search for
//  "lessonState" would pass on a body that defines the function and never calls
//  it from the toggle, which is exactly the state this page was in for weeks:
//  lessonState sat beside unitState the whole time and the toggle ignored it. So
//  this pulls the body, runs its own toggleGate under a DOM stub, and records
//  what it would POST.
//
//  --file <path> judges a sheet's own bytes before an import. With no argument
//  it reads the LIVE page, which is what makes it a post-import check.
//
//  Zero PII: no credential, no student data, nothing is sent anywhere.
//  No em-dashes, per repo convention.
//  Run:  node scripts/verify-lesson-padlock.js [--file <path>]
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const vm = require('vm');
const sf = require('../lib/storefront-fetch');

const argv = process.argv.slice(2);
const fileAt = argv.indexOf('--file');
const LOCAL = fileAt !== -1 ? argv[fileAt + 1] : null;
const HANDLE = 'cyber-dashboard';

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

function loadPage(html) {
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

function board(html, lessonRoll, items) {
  const D = loadPage(html);
  D.classCode = 'CYBER-TEST';
  D.gates = { course: 'ap-cybersecurity', units: { 'unit-1': { state: lessonRoll } },
    lessons: { 'unit-1|1.1': { state: lessonRoll } }, items: items };
  D._posted = null;
  D._api = async (m, u, b) => { D._posted = b; return { ok: true }; };
  D.loadProgress = async () => {}; D.renderUnitFilter = () => {}; D._token = () => 'tok';
  return D;
}

(async () => {
  let html, where;
  if (LOCAL) { html = fs.readFileSync(LOCAL, 'utf8'); where = `FILE ${LOCAL}  ${html.length} bytes`; }
  else {
    const body = await sf.pageBody(HANDLE);
    html = typeof body === 'string' ? body : (body.body_html || body.body || '');
    where = `LIVE /pages/${HANDLE}  ${html.length} bytes`;
  }
  console.log('\n  ' + where + '\n');

  const CLOSED = { locked: true, lock_enforceable: true };
  const OPEN = { locked: false, lock_enforceable: true };

  console.log('1. THE REPORT: a closed lesson must be openable');
  let D = board(html, 'all', { 'unit-1|1.1|lab': CLOSED, 'unit-1|1.1|quiz': CLOSED });
  ok('  the padlock reads the lesson as closed', D.lessonState('unit-1', '1.1') === 'off',
    D.lessonState('unit-1', '1.1'));
  await D.toggleGate(null, 'lesson', 'unit-1', '1.1', '');
  ok('  and clicking it asks the server to OPEN it',
    !!(D._posted && D._posted.open === true), D._posted);

  console.log('\n2. It is still a switch, not a one way open');
  D = board(html, 'none', { 'unit-1|1.1|lab': OPEN });
  await D.toggleGate(null, 'lesson', 'unit-1', '1.1', '');
  ok('  an open lesson still closes', !!(D._posted && D._posted.open === false), D._posted);

  console.log('\n3. A mixed lesson settles OPEN, never closed by accident');
  D = board(html, 'some', { 'unit-1|1.1|lab': CLOSED, 'unit-1|1.1|quiz': OPEN });
  await D.toggleGate(null, 'lesson', 'unit-1', '1.1', '');
  ok('  the first click on a mixed lesson opens it', !!(D._posted && D._posted.open === true), D._posted);

  console.log('\n4. The scopes that already worked still do');
  D = board(html, 'all', { 'unit-1|1.1|lab': CLOSED });
  await D.toggleGate(null, 'col', 'unit-1', '1.1', 'lab');
  ok('  a closed column opens', !!(D._posted && D._posted.open === true), D._posted);
  D = board(html, 'all', {});
  await D.toggleGate(null, 'unit', 'unit-1', '', '');
  ok('  a closed unit opens', !!(D._posted && D._posted.open === true), D._posted);

  console.log('\n5. The page still has a retry control, in whichever shape is current');
  //  THIS USED TO PIN FOUR ELEMENT IDS AND IT WAS WRONG, corrected 2026-09-17.
  //
  //  It asserted rt-lesson, rt-ex, rt-quiz and rt-exam survive, on the reading
  //  that the repo mirror was MISSING them and an import built from it would
  //  delete them. The mirror is not missing them. It deletes them on purpose:
  //  they are the four dead SAVING SOON switches, and board 302 is the task
  //  that killed them. They wrote to page state and called renderAll, so a
  //  teacher turning Quizzes off watched the grades move and changed nothing a
  //  student could do. The board 318 sheet replaces them with three modes that
  //  PATCH /api/teacher/classes/:code/retry and redraw from the answer.
  //
  //  So the old form of this check would have gone red on a correct import and
  //  reported the fix as a regression. What it was actually protecting is worth
  //  keeping: a sheet must not drop the retry panel altogether. That is what is
  //  asserted now, in a way that survives the import instead of forbidding it.
  const LEGACY = ['rt-lesson', 'rt-ex', 'rt-quiz', 'rt-exam'];
  const legacy = LEGACY.filter((id) => html.indexOf(id) !== -1);
  const modern = html.indexOf('gb-retryseg') !== -1;
  ok('  the page offers a retry control of some kind',
    modern || legacy.length === LEGACY.length,
    { modern, legacy });
  if (modern) {
    ok('  it is the three-mode control, so it saves to the class',
      /setRetryMode/.test(html) && /classes\/'\+this\.classCode\+'\/retry/.test(html));
    ok('  and the four dead switches are gone, which is the point of board 302',
      legacy.length === 0, legacy);
  } else {
    console.log('  [note]  still the four SAVING SOON switches. They change nothing a');
    console.log('          student can do. The board 318 sheet replaces them.');
    ok('  all four legacy switches are present, none half removed',
      legacy.length === LEGACY.length, legacy);
  }

  console.log(`\n  ${pass} passed, ${fail} failed`);
  if (fail) { console.log('\nFAILED'); process.exit(1); }
  console.log(`\nOK - the lesson padlock opens a closed lesson (${pass} checks)`);
})().catch((e) => { console.log('  [FAIL] the check threw: ' + e.message); process.exit(1); });
