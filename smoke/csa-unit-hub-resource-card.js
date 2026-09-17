'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  MUTATION SUITE for scripts/csa-unit-hub-resource-card.js. Offline.
//
//  A GREEN MUTATION RUN IS A FAILED CHECK. Each case below breaks ONE rule and
//  requires the refusal for THAT rule by name. A case that goes red for a
//  different reason is telling you the rule you meant to test is hollow, which
//  is how two guards in this repo were found hollow on 2026-09-02 and a third
//  on 2026-09-03.
//
//  The structural guards cannot be tripped from the input, so those cases
//  MUTATE THE SOURCE: the module is copied to a temp file, one string is
//  changed, and the copy is required to refuse. That is the only way to prove
//  a guard on the generator's own output is load-bearing.
//
//  The reversal case is not hypothetical. The first version of the generator
//  put the inserted newline OUTSIDE the fence, so unmark() returned a body one
//  byte longer than build() started from. The reversal guard is what caught it
//  before a sheet was written.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'scripts', 'csa-unit-hub-resource-card.js');
const source = fs.readFileSync(SRC, 'utf8');

//  Minimal fixture in the shape the live hub body has: a wrapper, a style
//  block, and a u4-resources deck whose first card is the study guide.
const FIXTURE = [
  '<div id="u4-hub">',
  '<style>#u4-hub { color: #111; }</style>',
  '<div class="u4-resources">',
  '  <a class="u4-resource-card" href="/pages/ap-csa-unit-4-data-collections-study-guide">',
  '    <span class="u4-resource-label">Study Guide</span>',
  '  </a>',
  '  <a class="u4-resource-card" href="/pages/ap-csa-test-builder">',
  '    <span class="u4-resource-label">Practice</span>',
  '  </a>',
  '</div>',
  '</div>',
].join('\n');

const LIVE = new Set(['ap-csa-array-mastery-interactive-practice', 'ap-csa-test-builder',
  'ap-csa-unit-4-data-collections-study-guide']);
const ID = 'u4-array-mastery';
const GOOD = {
  handle: 'ap-csa-array-mastery-interactive-practice',
  label: 'Array Drills',
  name: 'Array Mastery Practice',
  desc: 'Seven array problems with hidden test cases, ungraded self-check',
};

let pass = 0; const fails = [];
const ok = (name, cond, detail) => { if (cond) pass++; else fails.push(`${name}: ${detail}`); };

//  The mutant must live WHERE THE ORIGINAL LIVES, because the module resolves
//  ../lib/* relative to itself. A temp dir under /tmp cannot see lib/ at all,
//  which fails every case with a module-not-found and reads exactly like six
//  hollow guards. Written beside the original and unlinked after.
const mutants = [];
function loadMutant(find, replace) {
  if (!source.includes(find)) throw new Error(`mutation anchor absent: ${find.slice(0, 50)}`);
  const f = path.join(path.dirname(SRC), `.mutant-${mutants.length}-${process.pid}.js`);
  fs.writeFileSync(f, source.replace(find, replace));
  mutants.push(f);
  return require(f);
}
process.on('exit', () => { for (const f of mutants) { try { fs.unlinkSync(f); } catch (e) { /* gone */ } } });

//  ── BASELINE. The suite must be green before any mutation, or every red
//  below is meaningless. ────────────────────────────────────────────────────
const M = require(SRC);
let base;
try {
  base = M.build(FIXTURE, ID, GOOD, LIVE);
  ok('baseline builds', true);
} catch (e) {
  ok('baseline builds', false, `unmutated build refused: ${e.message}`);
}
if (base) {
  ok('baseline adds one card', (base.body.match(/u4-resource-card/g) || []).length === 3,
    'card count did not go 2 -> 3');
  ok('baseline reverses exactly', M.unmark(base.body, ID) === FIXTURE,
    'unmark did not return the fixture byte for byte');
  ok('baseline is idempotent', M.build(base.body, ID, GOOD, LIVE).body === base.body,
    'a second pass over an already-carded body changed the result');
  ok('baseline card sits after the study guide',
    base.body.indexOf('study-guide') < base.body.indexOf(GOOD.handle)
    && base.body.indexOf(GOOD.handle) < base.body.indexOf('test-builder'),
    'card is not between the study guide and the test builder');
}

//  ── INPUT MUTATIONS. Each must name its own rule. ─────────────────────────
const inputCases = [
  ['dead target handle', { ...GOOD, handle: 'ap-csa-page-that-does-not-exist' }, LIVE, /not in the live handle set/],
  ['em-dash in desc', { ...GOOD, desc: 'Seven problems — ungraded' }, LIVE, /em-dash in authored desc/],
  ['EK code in desc', { ...GOOD, desc: 'Covers arrays (1.1.C) and traversal' }, LIVE, /Essential Knowledge code in authored desc/],
  ['markup char in name', { ...GOOD, name: 'Array <b>Mastery</b>' }, LIVE, /unescaped markup character in authored name/],
  ['empty live set', GOOD, new Set(), /no live handle set/],
];
for (const [name, link, live, want] of inputCases) {
  try {
    M.build(FIXTURE, ID, link, live);
    ok(name, false, 'built when it should have refused');
  } catch (e) {
    ok(name, want.test(e.message), `refused with the wrong rule: ${e.message}`);
  }
}
try { M.build('', ID, GOOD, LIVE); ok('empty body', false, 'built'); }
catch (e) { ok('empty body', /empty body/.test(e.message), e.message); }
try { M.build('<div>no deck here</div>', ID, GOOD, LIVE); ok('no deck', false, 'built'); }
catch (e) { ok('no deck', /no u4-resources deck/.test(e.message), e.message); }
try {
  M.build(FIXTURE.replace('ap-csa-test-builder', GOOD.handle), ID, GOOD, LIVE);
  ok('already linked outside fence', false, 'built');
} catch (e) { ok('already linked outside fence', /already links/.test(e.message), e.message); }

//  ── SOURCE MUTATIONS on the generator's own output. ───────────────────────
const srcCases = [
  ['anchor count guard',
    '`\\n    <span class="u4-resource-desc">${link.desc}</span>`',
    '`\\n    <span class="u4-resource-desc">${link.desc}</span>\\n  <a href="/pages/extra">x</a>`',
    /anchor count moved by other than one/],
  ['div balance guard',
    '`\\n  </a>\\n${CLOSE(id)}`',
    '`\\n  </a>\\n<div>\\n${CLOSE(id)}`',
    /div balance changed|closing div count changed/],
  ['missing close fence',
    '`\\n  </a>\\n${CLOSE(id)}`',
    '`\\n  </a>\\n`',
    /with no close fence|does not reverse/],
  ['1KB growth cap',
    '`\\n    <span class="u4-resource-desc">${link.desc}</span>`',
    '`\\n    <span class="u4-resource-desc">${link.desc}${"x".repeat(1200)}</span>`',
    /over the 1KB cap/],
  ['resource card count guard',
    '`\\n${OPEN(id)}\\n  <a class="u4-resource-card" href="/pages/${link.handle}">`',
    '`\\n${OPEN(id)}\\n  <span class="u4-resource-card"></span>'
    + '<a class="u4-resource-card" href="/pages/${link.handle}">`',
    /resource card count moved by other than one/],
  ['reversal guard catches a newline outside the fence',
    "if (o > 0 && body[o - 1] === '\\n') o -= 1;",
    '',
    /does not reverse to the body it started from/],
];
for (const [name, find, repl, want] of srcCases) {
  let mut;
  try { mut = loadMutant(find, repl); }
  catch (e) { ok(name, false, `could not build mutant: ${e.message}`); continue; }
  try {
    mut.build(FIXTURE, ID, GOOD, LIVE);
    ok(name, false, 'MUTANT BUILT CLEAN, so this guard is hollow');
  } catch (e) {
    ok(name, want.test(e.message), `mutant refused for the wrong reason: ${e.message}`);
  }
}

//  ── THE SHEET ITSELF ──────────────────────────────────────────────────────
if (base) {
  const csv = M.sheet([{ handle: 'ap-csa-unit-4-course', body: base.body }]);
  ok('sheet carries a BOM', csv.charCodeAt(0) === 0xfeff, 'no BOM, so a bullet imports as three characters');
  ok('sheet is CRLF', csv.includes('\r\n'), 'not CRLF');
  ok('sheet is MERGE', /"MERGE"/.test(csv), 'command is not MERGE');
  ok('published at is past-dated', new Date(M.PUBLISHED_AT) < new Date(), 'Published At is not in the past');
  ok('body round-trips through the quoting',
    csv.includes(base.body.replace(/"/g, '""')), 'the quoted body is not the body');
}

console.log(`\ncsa-unit-hub-resource-card: ${pass} passed, ${fails.length} failed`);
if (fails.length) { fails.forEach((f) => console.error('  FAIL ' + f)); process.exit(1); }
