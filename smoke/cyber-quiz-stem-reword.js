'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: taking the CED out of five quiz stems, and nothing else.
//
//  WHY THIS EXISTS
//  Two cyber quizzes are stuck client-scored because five of their stems name
//  the CED to a student and lib/quiz-citation.js refuses those. The fix is five
//  text edits on two live pages, shipped MERGE, so the blast radius is two whole
//  page bodies and the thing most likely to go wrong is collateral: a replace
//  that also strips the EK codes out of the EXPLANATIONS, which are correct and
//  useful and ship only after a teacher releases the key.
//
//  WHAT IS PINNED
//   1. Every offending stem is clean afterwards, judged by the same module the
//      extractor judges with rather than a second opinion about it.
//   2. Explanations are untouched, and the EK codes that disappear are exactly
//      the ones the named edits remove from a stem.
//   3. Nothing else moved: undoing the five edits reproduces the original byte
//      for byte.
//   4. The answer keys and the options are untouched.
//   5. It refuses a page it cannot match exactly once, rather than guessing.
//
//  Offline and secret-free. Zero PII: authored quiz copy only.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const M = require('../scripts/cyber-quiz-stem-reword');
const { hasCitation } = require('../lib/quiz-citation');

const DIR = path.join(__dirname, 'fixtures', 'cyber-quiz-stem-reword');
const bodies = {};
for (const h of M.HANDLES) bodies[h] = fs.readFileSync(path.join(DIR, `${h}.body.html`), 'utf8');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const rewritten = M.rewrite(bodies);
if (!rewritten) {
  console.log('  [FAIL] rewrite() refused the fixture outright, so no rule below could be measured');
  console.log('\nFAIL  0 passed, 1 failed');
  process.exit(1);
}
const out = rewritten.out;

console.log('\n-- 1. the fixture really is broken before the edit --');
for (const h of M.HANDLES) {
  const bad = M.stemsOf(bodies[h]).filter((s) => hasCitation(s.text));
  ok(`${h} has at least one stem naming the CED`, bad.length > 0, bad.length);
}
ok('five edits, across two pages', M.EDITS.length === 5 && M.HANDLES.length === 2);

console.log('\n-- 2. afterwards no stem names the CED --');
for (const h of M.HANDLES) {
  const bad = M.stemsOf(out[h]).filter((s) => hasCitation(s.text));
  ok(`${h}: zero stems carry a citation`, bad.length === 0,
    bad.map((s) => s.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70)));
}
//  Judged with the extractor's own module, not a regex written here. The two
//  disagreed once before, which is why lib/quiz-citation.js exists at all.
ok('and that judgement comes from lib/quiz-citation.js', typeof hasCitation === 'function');

console.log('\n-- 3. explanations keep their EK codes --');
const ekList = (s) => (s.match(/\bEK\s*\d\.\d\.[A-Z]\.\d+/g) || []);
for (const h of M.HANDLES) {
  const mine = M.EDITS.filter((e) => e.handle === h);
  const expect = mine.reduce((n, e) => n + ekList(e.find).length - ekList(e.repl).length, 0);
  const removed = ekList(bodies[h]).length - ekList(out[h]).length;
  ok(`${h}: lost exactly the ${expect} EK code(s) the edits account for`, removed === expect,
    { removed, expect });
}
const totalKept = ekList(out['ap-cyber-unit-2-lesson-3-quiz']).length;
ok('2.3 still carries its explanation EK codes, which are the useful ones', totalKept >= 10, totalKept);

console.log('\n-- 4. nothing else moved --');
for (const h of M.HANDLES) {
  let undo = out[h];
  for (const e of M.EDITS.filter((x) => x.handle === h)) undo = undo.replace(e.repl, () => e.find);
  ok(`${h}: undoing the edits reproduces the original byte for byte`, undo === bodies[h]);
  const key = (s) => (s.match(/checkMCQ\([^)]*\)|ANSWERS\s*=\s*\{[^}]*\}/g) || []).join('|');
  ok(`${h}: the answer key is untouched`, key(bodies[h]) === key(out[h]));
}

console.log('\n-- 5. it refuses rather than guessing --');
const quiet = console.error; console.error = () => {};
const code = process.exitCode;
//  Already reworded: the find text is gone, so the count is 0 and it must refuse
//  rather than silently produce a no-op sheet over a live body.
const twice = M.transform(out);
//  Drifted wording: the find text no longer matches, but the citation is STILL
//  THERE. The first version of this fixture replaced the whole sentence, which
//  took the citation out with it, so the refusal came from "this page had no
//  offending stem to begin with" rather than from the drift. A fixture has to
//  break one thing at a time or the mutation battery reads the wrong rule.
const drifted = {};
for (const h of M.HANDLES) {
  const e = M.EDITS.find((x) => x.handle === h);
  drifted[h] = bodies[h].replace(e.find, e.find.replace('wrongly', 'incorrectly').replace('according to', 'per'));
}
const onDrift = M.transform(drifted);
//  The stem-scope guard, exercised DIRECTLY. No edit's text appears outside a
//  stem in the real pages, so mutating that guard away leaves the suite green:
//  the failure is unreachable with real input. This puts the find text into an
//  explanation so the guard has something to refuse.
const planted = {};
for (const h of M.HANDLES) planted[h] = bodies[h];
const victim = 'ap-cyber-unit-4-lesson-1-quiz';
planted[victim] = bodies[victim].replace(
  /(<div class="l-feedback" id="q2-fb")/,
  '<p>Incorrect, see: are <strong>TRUE</strong> according to the AP CED?</p>$1');
if (planted[victim] === bodies[victim]) {
  //  A plant that silently fails to apply makes this row assert nothing, which
  //  is how it read green the first time: the id is q2-fb, not q2.
  console.log('  [FAIL] the planted fixture did not apply, so the row below proves nothing');
  fail++;
}
const onPlanted = M.transform(planted);
console.error = quiet; process.exitCode = code;
ok('refuses a page that has already been reworded', twice === null);
ok('refuses a page whose stem wording has drifted while the citation remains', onDrift === null);
ok('refuses when the stem text appears TWICE, rather than picking one',
  onPlanted === null);

//  And the stem-scope guard on its own. The duplicate case above is caught by
//  the one-occurrence count first, so mutating the scope check away leaves that
//  row green. Reaching it needs the text exactly ONCE and NOT in a stem: strip
//  the real stem occurrence, leave only the planted one in an explanation.
const moved = {};
for (const h of M.HANDLES) moved[h] = bodies[h];
const e2 = M.EDITS.find((x) => x.handle === victim && x.q === 'Q2');
moved[victim] = bodies[victim]
  .replace(e2.find, 'are <strong>TRUE</strong>?')
  .replace(/(<div class="l-feedback" id="q2-fb")/, `<p>Incorrect, see: ${e2.find}</p>$1`);
const movedCount = moved[victim].split(e2.find).length - 1;
if (movedCount !== 1) {
  console.log(`  [FAIL] the moved fixture has ${movedCount} occurrences, it needs exactly 1 to reach the scope guard`);
  fail++;
}
const quiet2 = console.error; console.error = () => {};
const c2 = process.exitCode;
const onMoved = M.transform(moved);
console.error = quiet2; process.exitCode = c2;
ok('refuses when the only occurrence sits in an explanation rather than a stem',
  onMoved === null);

console.log('\n-- 6. the guarded transform accepts the real thing --');
const guarded = M.transform(bodies);
ok('transform() accepts the fixture', !!guarded);
ok('and reports all five edits', !!guarded && guarded.applied.length === 5, guarded && guarded.applied);

console.log(`\n${fail ? 'FAIL' : 'PASS'}  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
