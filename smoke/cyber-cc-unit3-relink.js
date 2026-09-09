'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: the Command Center's Unit 3 rows open the page they name.
//
//  WHY THIS EXISTS
//  Three of six Unit 3 rows opened a lesson about something else, and the shape
//  of the bug is the reason it survived: it is a THREE-CYCLE, not an off-by-one.
//  Rows 3.1, 3.2 and 3.4 were correct the whole time, so spot-checking two rows
//  had a good chance of hitting two correct ones and concluding the page was
//  fine. Only 3.3, 3.5 and 3.6 moved, because only those three lesson BODIES
//  swapped handles when Unit 3 was renumbered onto the CED.
//
//  WHAT IS PINNED
//   1. The map is derived from lib/cyber-unit3-renumber.js PLAN, not typed here.
//      Retyping the Unit 3 mapping is how site 3.3 and 3.4 became each other's
//      CED topics in the first place.
//   2. Exactly three rows move, in both blocks that carry links. A transform
//      that moves six has rotated the correct rows too.
//   3. The transform is IDEMPOTENT. A three-cycle written as ordered replaces
//      ping-pongs and cannot tell its own output from its input; running twice
//      must be a no-op.
//   4. Nothing outside a unit-3 lesson number changes: no Drive id, no other
//      unit, no other byte.
//
//  Offline and secret-free: the fixture is a real slice of the live body, with
//  a unit-2 and a unit-4 row on each side so the scoping assertions bite.
//  Zero PII: page handles and lesson titles only.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { transform, OLD_TO_TARGET } = require('../scripts/cyber-cc-unit3-relink');
const { PLAN } = require('../lib/cyber-unit3-renumber');

const FIXTURE = path.join(__dirname, 'fixtures', 'cyber-cc-unit3-rows.html');
const body = fs.readFileSync(FIXTURE, 'utf8');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const linkMap = (s) => {
  const m = {};
  for (const [, id, links] of s.matchAll(/"(\d\.\d)":\{([^}]*)\}/g)) {
    m[id] = [...new Set([...links.matchAll(/ap-cyber-unit-(\d)-lesson-(\d)/g)].map((x) => x[1] + ':' + x[2]))];
  }
  return m;
};

console.log('\n-- 1. the map comes from PLAN, and PLAN says this is a three-cycle --');
ok('OLD_TO_TARGET is derived from PLAN, entry for entry',
  PLAN.every((p) => OLD_TO_TARGET[p.oldTopic] === p.target), OLD_TO_TARGET);
const moved = PLAN.filter((p) => p.target !== p.source).map((p) => p.oldTopic).sort();
ok('exactly three Unit 3 bodies changed handle', moved.length === 3, moved);
ok('and they are the three the Command Center got wrong',
  String(moved) === String(['3.3', '3.5', '3.6']), moved);

console.log('\n-- 2. the fixture really is broken before the fix --');
const beforeMap = linkMap(body);
const wrong = Object.keys(beforeMap).filter((id) =>
  OLD_TO_TARGET[id] && beforeMap[id].some((h) => h !== '3:' + OLD_TO_TARGET[id]));
ok('three rows point at the wrong lesson to begin with', wrong.length === 3, wrong);
ok('and they are 3.3, 3.5 and 3.6', String(wrong.sort()) === String(['3.3', '3.5', '3.6']), wrong);

console.log('\n-- 3. after the rewrite every row points where its id says --');
//  Measured on transform.raw rather than transform(), so that each block below
//  fails for its OWN reason. Guarded output is null on any refusal, which made
//  three unrelated mutations produce one indistinguishable red.
const raw0 = transform.raw(body);

//  Block 2, the flat link map. Checked separately from block 1 so that fixing
//  only one of the two is a distinguishable failure.
const afterMap = linkMap(raw0);
const stillWrong = Object.keys(afterMap).filter((id) =>
  OLD_TO_TARGET[id] && afterMap[id].some((h) => h !== '3:' + OLD_TO_TARGET[id]));
ok('link map: no Unit 3 row points at the wrong lesson', stillWrong.length === 0, stillWrong);

//  Block 1, the LESSONS data array. Same property, different structure: the
//  handles live in a site:{ex1,ex2} sub-object beside Google Drive ids.
const dataRows = [...raw0.matchAll(/\{ id:"(3\.\d)",[\s\S]*?site:\{([^}]*)\}/g)];
const dataWrong = dataRows.filter(([, id, site]) =>
  [...site.matchAll(/ap-cyber-unit-3-lesson-(\d)/g)].some((m) => Number(m[1]) !== OLD_TO_TARGET[id]));
ok(`data array: all ${dataRows.length} Unit 3 rows point at the right lesson`,
  dataRows.length === 6 && dataWrong.length === 0, dataWrong.map((d) => d[1]));

console.log('\n-- 4. idempotent, which a ping-ponging fix would fail --');
const r = transform(body);
ok('the guarded transform accepts the broken fixture', !!r);
ok('and reports exactly six edits, three rows across two blocks',
  !!r && r.moves.length === 6, r && r.moves.length);
//  Two different claims, and the first version of this block conflated them by
//  accepting `!twice` as a pass, which is true for any refusal at all.
//  transform() REFUSES already-fixed input, because a sheet that changes nothing
//  should not be built and imported. That refusal prints to stderr; it is the
//  expected outcome here, not a failure of this suite.
const quiet = console.error; console.error = () => {};
const twice = r ? transform(r.out) : null;
const exit = process.exitCode; process.exitCode = 0;   // the refusal sets it
console.error = quiet;
ok('transform() refuses input that is already correct, rather than writing a no-op sheet',
  twice === null, twice && 'returned a result');
//  The idempotence that matters is in the rewrite itself: a three-cycle done as
//  ordered replaces would rotate again here and land somewhere different.
ok('the raw rewrite run twice equals it run once',
  transform.raw(transform.raw(body)) === raw0);
ok('and running it three times still equals once, so it is not a 3-cycle',
  transform.raw(transform.raw(transform.raw(body))) === raw0);

console.log('\n-- 5. blast radius, measured on the RAW rewrite --');
//  These ran against transform()'s guarded output, which is null whenever the
//  generator refuses. So every one of them went red on any refusal, for a
//  reason that had nothing to do with the property it names, and a mutation
//  battery cannot tell those apart. transform.raw() always returns bytes, so
//  each assertion below is about the rewrite itself and nothing else.
const raw = raw0;
const drive = (s) => (s.match(/D\+"[A-Za-z0-9_-]+"/g) || []).join('|');
ok('no Google Drive id changed', drive(body) === drive(raw));
ok('the body is the same length, because only single digits moved',
  raw.length === body.length, { before: body.length, after: raw.length });
const flat = (s) => s.replace(/ap-cyber-unit-3-lesson-\d/g, 'N');
ok('nothing but unit-3 lesson numbers differs', flat(body) === flat(raw));

//  THE CROSS-UNIT CHECK IS NOT MUTATION-PROVABLE, AND THAT IS WORTH SAYING.
//  A mutation making relinkRow rewrite ap-cyber-unit-\d-lesson-\d, any unit,
//  leaves this suite fully green. Not because the assertion is weak but because
//  the failure is unreachable: both scope regexes end at the row's own closing
//  brace, so no other unit's handle is ever inside the text being rewritten.
//  It is kept as cheap insurance against a future widening of that scope, and
//  labelled so nobody reads a green run here as evidence that it bites.
const other = (s) => (s.match(/ap-cyber-unit-[1245]-[a-z0-9-]+/g) || []).join('|');
ok('no handle outside unit 3 changed (unreachable by construction, see comment)',
  other(body) === other(raw));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
