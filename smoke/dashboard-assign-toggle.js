'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the Assigned / Not assigned switches in the teacher gradebook
//
//  The gradebook is where a teacher already is when they think "nobody has done
//  the Unit 3 quiz", so it is where the switch that opens it belongs. This pins
//  the five things that make that safe rather than merely present.
//
//  1. IT NEVER SAYS "LOCKED" WHERE A TEACHER READS IT. On this page `locked`
//     already means "this attempt was submitted as final", set by quiz finalize
//     and reopened by Grant attempt. A second, unrelated lock sharing that word
//     on the same screen is a support ticket, so availability is Assigned or
//     Not assigned everywhere a human can see it.
//
//  2. AN UNENFORCEABLE LOCK SAYS SO, ON THE CONTROL. A lock only bites where the
//     server hands out the questions. On this site that is five activities out
//     of 757 graded columns, so the common case is a switch that flips and
//     protects nothing, and the teacher has to be able to see that BEFORE they
//     rely on it for an assessment.
//
//  3. MIXED IS A STATE. A unit with some columns open is neither on nor off, and
//     drawing it as either is how a teacher flips a switch that already looked
//     the way they wanted it.
//
//  4. NO SWITCH ON A COLUMN THE CONTRACT DOES NOT KNOW. A control that writes a
//     gate row nothing resolves is worse than no control.
//
//  5. A FAILED AVAILABILITY FETCH NEVER BLANKS THE GRADEBOOK. The locks are a
//     second document; grades must render without them, because an older server
//     or a slow request must not cost a teacher their gradebook.
//
//  The page's own functions are executed, not reimplemented: the <script> is
//  extracted from the shipped file and run in a vm with a stub DOM, and the
//  assertions read the HTML renderGrid actually emitted.
//
//  Zero PII: one synthetic student. No em-dashes.
//
//  Run: npm run smoke:dashassign
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); }
};

const FILE = path.join(__dirname, '..', 'shopify', 'cyber-dashboard.html');
const html = fs.readFileSync(FILE, 'utf8');
const body = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');

// ── stub DOM that records what each element was given ────────────────────────
const nodes = {};
const el = (id) => (nodes[id] = nodes[id] || {
  id, innerHTML: '', textContent: '', value: '', style: { setProperty() {} }, dataset: {},
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  addEventListener() {}, appendChild() {}, setAttribute() {}, getAttribute() { return null; },
  querySelector: () => el('q'), querySelectorAll: () => [], focus() {}, click() {}, remove() {},
  getBoundingClientRect: () => ({ top: 0, left: 0, bottom: 0, right: 0 }),
});
const sandbox = {
  console: { log() {}, error() {} },
  document: {
    getElementById: (id) => el(id), querySelector: () => el('q'), querySelectorAll: () => [],
    createElement: () => el('c'), addEventListener() {}, body: el('body'), documentElement: el('root'),
  },
  window: { innerWidth: 1400, scrollY: 0, addEventListener() {}, location: { search: '', pathname: '/pages/cyber-dashboard', replace() {} } },
  location: { search: '?code=CYBER-TEST', pathname: '/pages/cyber-dashboard', replace() {} },
  navigator: { clipboard: { writeText: () => Promise.resolve() } },
  fetch: () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }),
  localStorage: { getItem: () => 'tok', setItem() {}, removeItem() {} },
  alert() {}, prompt: () => null, confirm: () => true,
  URLSearchParams, AbortController, Blob: function () {}, URL: { createObjectURL: () => '', revokeObjectURL() {} },
  setTimeout, clearTimeout, Math, JSON, Date, String, Number, Array, Object, RegExp, Promise,
  isNaN, parseInt, parseFloat, encodeURIComponent, Option: function () {},
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
let loaded = true;
try { vm.runInContext(body, sandbox, { timeout: 5000 }); } catch (e) { loaded = false; console.log('    load error: ' + e.message); }
ok('the page script loads in a stub DOM', loaded);
const T = sandbox.window.TCDash;
ok('TCDash is exposed', !!T);
if (!T) { console.log('\nFAILED: page did not load\n'); process.exit(1); }

// ── the /progress payload, same shape the live API sends ─────────────────────
const CYBER = {
  class: { class_name: 'Test Class', course: 'ap-cybersecurity' },
  course_config: {
    units: {
      'unit-1': { label: 'Unit 1', lessons: ['1.1', '1.2'], activities: ['lesson', 'quiz'] },
      'unit-2': { label: 'Unit 2', lessons: ['2.1'], activities: ['lesson', 'quiz'] },
      //  unit-3 exists only to hold a LOCKED and ENFORCEABLE column. unit-2 has
      //  to stay fully open for the assertion about an open unit, and unit-1 is
      //  already carrying the mixed case, so neither could take this one.
      'unit-3': { label: 'Unit 3', lessons: ['3.1'], activities: ['quiz'] },
    },
  },
  denominators: { '1.1|quiz': 5, '1.2|quiz': 5, '2.1|quiz': 5, '3.1|quiz': 5 },
  summary: [{
    student: { id: 'stu1', name: 'Test Student', ref: '', last_active: null },
    units: {}, detail: { 'unit-1': { '1.1': { quiz: { score: 80 } } } },
  }],
};

// ── the /assignments document, as the canonical contract sends it ────────────
//  unit-1 is MIXED: 1.1 open, 1.2 locked. 1.2's quiz is locked and NOT
//  enforceable, which is the case that has to be visible on the control.
//  unit-2 is fully open. 2.1 lesson is deliberately absent from items, to prove
//  a column the contract does not know gets no switch.
const GATES = {
  course: 'ap-cybersecurity',
  items: [
    { unit: 'unit-1', lesson_ref: '1.1', native_activity: 'lesson', locked: false, lock_enforceable: false },
    { unit: 'unit-1', lesson_ref: '1.1', native_activity: 'quiz', locked: false, lock_enforceable: true },
    { unit: 'unit-1', lesson_ref: '1.2', native_activity: 'lesson', locked: true, lock_enforceable: false },
    { unit: 'unit-1', lesson_ref: '1.2', native_activity: 'quiz', locked: true, lock_enforceable: false },
    { unit: 'unit-2', lesson_ref: '2.1', native_activity: 'quiz', locked: false, lock_enforceable: true },
    //  LOCKED AND ENFORCEABLE, the combination this fixture lacked and Tanner's
    //  real class has: a quiz the server does withhold, beside a lab it cannot.
    //  Without a column in this state the "count only the UNENFORCEABLE ones"
    //  rule is untestable, because counting every locked column gives the same
    //  answer. The mutation battery proved exactly that and this row is the fix.
    { unit: 'unit-3', lesson_ref: '3.1', native_activity: 'quiz', locked: true, lock_enforceable: true },
  ],
  gates: {
    quiz_lock_default: 0,
    units: [{ key: 'unit-1', state: 'mixed' }, { key: 'unit-2', state: 'none' }, { key: 'unit-3', state: 'all' }],
    lessons: [
      { key: 'unit-1|1.1', state: 'none' },   // fully open lesson
      { key: 'unit-1|1.2', state: 'all' },    // fully locked lesson
      { key: 'unit-2|2.1', state: 'none' },
      { key: 'unit-3|3.1', state: 'all' },
    ],
    rows: [], locked_items: 3, locked_but_unenforceable: ['unit-1/1.2/lesson', 'unit-1/1.2/quiz'],
  },
};
//  The page's OWN loadGates does the mapping, driven through a stubbed fetch.
//  An earlier draft of this suite reimplemented that mapping here and then
//  tested its own copy, which is the guard-and-its-test-agreeing failure this
//  repo has already paid for twice. Now a change to loadGates is felt here.
//  mode 'ok'    the endpoint answers with a document
//  mode 'http'  it answers non-200, the !r.ok return path
//  mode 'throw' the request itself fails, the catch path
//  Both failure shapes are covered because they are different code paths and a
//  suite that only drove one of them left the other untested.
async function loadGates(doc, mode) {
  const m = mode || (doc ? 'ok' : 'http');
  sandbox.fetch = (url) => (m === 'throw')
    ? Promise.reject(new Error('network'))
    : Promise.resolve({ ok: m === 'ok', status: m === 'ok' ? 200 : 500, json: () => Promise.resolve(doc || {}) });
  await T.loadGates('tok', CYBER);
  return T.gates;
}

function render() {
  T.data = CYBER;
  T.model = T.buildModel(CYBER);
  nodes['gb-table'] = undefined;    // fresh capture
  nodes['gb-unitpanel'] = undefined;
  nodes['gb-calcnote'] = undefined;
  T.renderGrid();
  try { T.renderUnitFilter(); } catch (e) { /* panel needs model.units; grid is what matters here */ }
  return el('gb-table').innerHTML;
}
const panelHtml = () => el('gb-unitpanel').innerHTML;

let h = '';
(async () => {
console.log('\n1. The switches render from the contract');
await loadGates(GATES);
h = render();
ok('  the grid rendered', h.length > 400, h.length);
// The unit row is GONE from the grid: it was a third header row above a dense
// table, spent on a handful of controls. Unit scope moved to the filter panel.
ok('  the grid has no unit row at all',
  !/toggleGate\(event,'unit',/.test(h), (h.match(/toggleGate\(event,'[a-z]+'/g) || []).slice(0, 6));
const pan = panelHtml();
ok('  the unit filter panel carries a unit padlock instead',
  /toggleGate\(event,'unit','unit-1'/.test(pan) && /toggleGate\(event,'unit','unit-2'/.test(pan), pan.slice(0, 240));
ok('  unit-2, fully open, reads assigned',
  /class='lk open'[^>]*toggleGate\(event,'unit','unit-2'/.test(pan));
ok('  unit-1, half open, reads partly assigned',
  /class='lk mix'[^>]*toggleGate\(event,'unit','unit-1'/.test(pan));
// The padlock must sit OUTSIDE the label, or clicking it also toggles which
// units are on screen.
ok('  the unit padlock is not inside the filter checkbox label',
  !/<label>[^<]*<input[^>]*>[^<]*<span class='lk/.test(pan) && /<\/label><span class='lk/.test(pan), pan.slice(0, 200));
// The column groups are LESSONS. A switch there must write LESSON scope: one
// that wrote unit scope would lock a whole unit from above a single lesson's
// columns, which is what the first version of this did.
ok('  a lesson group draws a LESSON-scope control, never a unit one',
  /toggleGate\(event,'lesson','unit-1','1\.1',''\)/.test(h)
  && !/toggleGate\(event,'unit','unit-1','1\.1'/.test(h));
ok('  a fully locked lesson group reads not assigned',
  /class='lk'[^>]*toggleGate\(event,'lesson','unit-1','1\.2',''\)/.test(h));
// An OPEN column's padlock is hidden until its header is hovered, so a hundred
// open columns cost no width. A LOCKED one is always visible: that is the whole
// point of the glyph.
ok('  an open column carries the hover-only class',
  /class='lk open hov'[^>]*toggleGate\(event,'col','unit-1','1\.1','quiz'\)/.test(h));
ok('  a locked column is always visible, never hover-only',
  /class='lk nf'[^>]*toggleGate\(event,'col','unit-1','1\.2','quiz'\)/.test(h)
  && !/class='lk[^']*hov'[^>]*toggleGate\(event,'col','unit-1','1\.2','quiz'\)/.test(h));
ok('  no switch markup survives anywhere', !/class='gsw/.test(h) && !/class='gsw/.test(pan));

//  THE SIGNAL HAS TO SURVIVE A PHONE. Added 2026-09-07 after Tanner locked the
//  1.1 Lab, took a student account to the page, found it open, and reported the
//  lab lock as broken. It was not broken: that activity keeps its questions in
//  the Shopify page body, so the browser has them before any server code runs,
//  and the gradebook knew. It signalled it by tinting one padlock emoji against
//  another and by a title tooltip, and a touch screen can perceive neither.
//  THE LINE A TEACHER ACTUALLY READS. The glyph and the aria-label are on the
//  control; this is plain text in the caveat row under the header, which is the
//  one place the count survives a phone, greyscale and colour blindness at once.
const note = () => (el('gb-calcnote').textContent || '');
ok('  the caveat line counts the locks that cannot be enforced',
  /2 locked columns cannot be enforced/.test(note()), note());
ok('  and says WHY, in a teacher\'s words rather than a code word',
  /questions in the page/.test(note()) && /students can still open them/.test(note()), note());

ok('  the marked control carries a warning GLYPH, not only a colour filter',
  (h.match(/<span class='lk nf'[^>]*>[^<]*\u26A0/g) || []).length === 2,
  (h.match(/<span class='lk nf'[^>]*>[^<]*/g) || []).slice(0, 2));
ok('  and its aria-label carries the reason, not just "Not assigned"',
  (h.match(/<span class='lk nf'[^>]*>/g) || []).every((x) => /aria-label='[^']*Cannot be enforced/.test(x)),
  (h.match(/<span class='lk nf'[^>]*>/g) || [])[0]);

console.log('\n2. It never says "locked" where a teacher reads it');
//  `locked` on this page means "submitted as final". The availability control
//  must not reuse the word, in a title, a label, or visible text.
const sw = (h.match(/<span class='lk[^>]*>/g) || []).concat(pan.match(/<span class='lk[^>]*>/g) || []);
ok('  every switch carries an Assigned / Not assigned title',
  sw.length > 0 && sw.every((s) => /title='(Assigned|Not assigned|Partly assigned)/.test(s)), sw.slice(0, 2));
ok('  no switch says "lock" in its title or label',
  sw.every((s) => !/lock/i.test(s.replace(/toggleGate\([^)]*\)/, ''))), sw.filter((s) => /lock/i.test(s)).slice(0, 2));

console.log('\n3. An unenforceable lock says so, on the control');
const nf = h.match(/<span class='lk nf'[^>]*>/g) || [];
// Both of 1.2's columns are locked and unenforceable.
ok('  every locked-and-unenforceable column is marked', nf.length === 2, nf.length);
ok('  and the title explains the questions are in the page',
  nf.every((x) => /Cannot be enforced/.test(x)), nf[0]);
ok('  an ENFORCEABLE locked column is not marked',
  !/class='lk nf'[^>]*'unit-1','1\.1'/.test(h));
// 1.1 lesson is OPEN and unenforceable. Marking it would outline roughly 750 of
// 757 columns on this site and the warning would become wallpaper.
// Read the class list and test for BOTH tokens, rather than pattern-matching a
// position in it. The first version required nf at the END of the attribute,
// and the hover class is appended after it, so the check could never fail. The
// mutation battery is what surfaced that.
const classesOf = (html) => (html.match(/<span class='([^']*)'/g) || [])
  .map((m) => m.slice("<span class='".length, -1).split(/\s+/));
ok('  an OPEN column is never marked, even when it could not be enforced',
  !classesOf(h).some((c) => c.indexOf('open') > -1 && c.indexOf('nf') > -1),
  classesOf(h).filter((c) => c.indexOf('nf') > -1));

console.log('\n4. No switch on a column the contract does not know');
//  2.1 lesson has a gradebook column but no contract item.
const has21lesson = /toggleGate\(event,'col','unit-2','2\.1','lesson'\)/.test(h);
ok('  the unknown column renders no switch', has21lesson === false);
ok('  but its column group header is still there', /'>2\.1</.test(h) || /2\.1/.test(h));

console.log('\n5. A failed availability fetch never blanks the gradebook');
await loadGates(null, 'http');   // the endpoint answers 500
const bare = render();
ok('  the grid still renders with no gates document', bare.length > 400, bare.length);
ok('  and draws no padlocks at all', !/class='lk/.test(bare));
ok('  the student row survived', /Test Student/.test(bare));

//  The assertion IS that nothing escapes: loadGates owns the failure, so a
//  throw reaching this line is the bug, not a crashed test.
let escaped = null;
try { await loadGates(null, 'throw'); } catch (e) { escaped = e; }
ok('  a thrown request is caught inside loadGates, not propagated',
  escaped === null, escaped && escaped.message);
const thrown = render();
ok('  and the grid still renders after one', thrown.length > 400, thrown.length);
ok('  with no padlocks drawn', !/class='lk/.test(thrown));

console.log('\n6. Toggling writes the right gate target');
let sent = null;
await loadGates(GATES);
T._api = async (method, p, b) => { sent = { method, path: p, body: b }; return { ok: true, data: {} }; };
T.loadProgress = async () => {};
let stopped = false;
const ev = { stopPropagation() { stopped = true; }, preventDefault() {}, currentTarget: null };

  await T.toggleGate(ev, 'col', 'unit-1', '1.1', 'quiz');   // currently OPEN -> should close
  ok('  the header cell click is stopped, so it does not also navigate', stopped);
  ok('  it POSTs to the gate endpoint',
    sent && sent.method === 'POST' && /\/api\/teacher\/classes\/.*\/gate$/.test(sent.path), sent);
  ok('  with the column\'s own unit, lesson and activity',
    sent.body.unit === 'unit-1' && sent.body.lesson === '1.1' && sent.body.activity_type === 'quiz', sent.body);
  ok('  and closes an open column', sent.body.open === false, sent.body);
  ok('  carrying the course, so a solo class resolves the right one',
    sent.body.course === 'ap-cybersecurity', sent.body);

  await T.toggleGate(ev, 'col', 'unit-1', '1.2', 'quiz');   // currently LOCKED -> should open
  ok('  and opens a locked column', sent.body.open === true, sent.body);

  await T.toggleGate(ev, 'unit', 'unit-2', '', '');          // unit scope, no lesson
  ok('  a unit switch writes unit scope, with no lesson or activity',
    sent.body.unit === 'unit-2' && sent.body.lesson === undefined && sent.body.activity_type === undefined, sent.body);

  //  A mixed unit settles OPEN on the first click. The destructive direction
  //  must never be the one you get by accident.
  await T.toggleGate(ev, 'unit', 'unit-1', '', '');
  ok('  a MIXED unit settles everything under it OPEN, not closed',
    sent.body.open === true, sent.body);

  console.log(`\n  ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.log('  [FAIL] the suite threw: ' + (e && e.message));
  console.log(`\n  ${pass} passed, ${fail + 1} failed`);
  process.exit(1);
});
