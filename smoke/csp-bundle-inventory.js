'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  MUTATION TEST FOR THE CSP BUNDLE INSERTION.
//
//  A green mutation run is a FAILED check, so each case breaks exactly one rule
//  and demands a refusal naming THAT rule. Requiring only "it refused" proves
//  nothing where guards overlap.
//
//  The case that matters most is "a deletion elsewhere in the body". On
//  2026-08-22 an import deleted the whole self-study tab from /pages/join and
//  every guard in that generator was green, because a body is 20KB and a
//  rendered-text diff does not notice a missing div. splice() answers that with
//  two byte assertions rather than a comparison of meaning, and the mutation
//  below is that exact incident in miniature.
//
//  Offline: splice() is pure, so nothing here touches the network or the store.
//
//    node smoke/csp-bundle-inventory.js       # npm run smoke:cspbundle
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const g = require('../scripts/csp-bundle-inventory-csv.js');

const A = g.ANCHOR;
const BLOCK = fs.readFileSync(g.BLOCK_FILE, 'utf8');

//  A stand-in body with the same shape as the real one: prose, the anchor, and
//  content AFTER the anchor, which is where a bad replace does its damage.
const LIVE = `<div class="wrap"><h2>All 5 Big Ideas.</h2>
<div class="bi-grid"><div class="bi-card">Big Idea 1</div></div>
${A}
<div class="also-title">Every purchase also includes</div>
<ul><li>Updates through summer 2026</li><li>Create Task scaffolding</li></ul>
</div><div class="who">Built for AP CSP teachers.</div>`;

let failed = 0, cases = 0;

function expectRefusal(name, live, blk, want) {
  cases++;
  const { problems, out } = g.splice(live, blk);
  if (!problems || !problems.length) { console.error(`  REFUSAL EXPECTED, GOT SUCCESS: ${name}`); failed++; return; }
  if (!problems.some((p) => p.includes(want))) {
    console.error(`  REFUSED FOR THE WRONG REASON: ${name}`);
    console.error(`    wanted a problem containing ${JSON.stringify(want)}`);
    console.error(`    got: ${problems.join(' | ').slice(0, 160)}`);
    failed++; return;
  }
  console.log(`  refused, for its own reason: ${name}`);
}

//  Control: the honest case must succeed and must be a pure insertion.
const ok = g.splice(LIVE, BLOCK);
if (ok.problems.length) { console.error('CONTROL FAILED:', ok.problems.join(' | ')); process.exit(1); }
if (ok.out.length !== LIVE.length + BLOCK.length) { console.error('CONTROL FAILED: length'); process.exit(1); }
if (ok.out.replace(BLOCK, '') !== LIVE) { console.error('CONTROL FAILED: not a pure insertion'); process.exit(1); }
if (!ok.out.includes('Every purchase also includes')) { console.error('CONTROL FAILED: content after the anchor was lost'); process.exit(1); }
console.log('control: a clean body splices to exactly live + block, nothing after the anchor lost\n');

expectRefusal('the anchor is gone, because the page layout changed',
  LIVE.replace(A, '<div class="also2">'), BLOCK, 'occurs 0 times');

expectRefusal('the anchor occurs twice, so the insert point is ambiguous',
  LIVE + '\n' + A, BLOCK, 'occurs 2 times');

expectRefusal('the section is already live, and a second run would print it twice',
  LIVE.replace(A, BLOCK + A), BLOCK, 'ALREADY on the live page');

//  THE DOLLAR HAZARD. String.replace interprets $&, $` and $' in a STRING
//  replacement, so a block carrying any of them splices in the matched text or
//  the whole body either side of it. splice() uses a function replacement, so
//  this must come back a clean insertion. With the naive form it does not:
//  measured, "AAA<anchor>ZZZ" became "AAA[block <anchor> and AAA and ZZZ ...".
cases++;
{
  //  Built with a FUNCTION replacement. Written the obvious way, with a string
  //  replacement, this line expands the $ sequences before splice() ever sees
  //  them and the test passes against a naive implementation. That happened.
  const dollarBlock = BLOCK.replace('Here is the rest of it.', () => 'Here is the rest of it. $& $` $\' 100% of it.');
  const r = g.splice(LIVE, dollarBlock);
  if (r.problems.length) {
    console.error(`  A $-BEARING BLOCK WAS REFUSED: ${r.problems.join(' | ').slice(0, 120)}`);
    failed++;
  } else if (!r.out.includes('$&') || !r.out.includes('$`')) {
    console.error('  THE $ SEQUENCES WERE INTERPRETED: the replacement is not a function');
    failed++;
  } else {
    console.log('  clean insertion despite $& and $` and $\' in the block');
  }
}

//  THE JOIN INCIDENT, in miniature, aimed at the guard itself. splice() builds
//  its own output, so feeding it a corrupted one is the only way to prove these
//  assertions fire rather than merely existing. Each case is a body that a
//  rendered-text diff would plausibly wave through.
const GOOD = g.splice(LIVE, BLOCK).out;
const CORRUPTIONS = [
  { name: 'a list item deleted elsewhere in the body, the /pages/join failure',
    out: GOOD.replace('<li>Create Task scaffolding</li>', ''),
    want: 'length is' },
  { name: 'content after the anchor truncated',
    out: GOOD.slice(0, GOOD.length - 40),
    want: 'length is' },
  { name: 'a byte changed but the length preserved, so only the exact check can see it',
    out: GOOD.replace('Every purchase also includes', 'Every purchase also lncludes'),
    want: 'byte for byte' },
];
for (const c of CORRUPTIONS) {
  cases++;
  const problems = g.verifyInsertion(LIVE, BLOCK, c.out);
  if (!problems.length) { console.error(`  CORRUPTION NOT CAUGHT: ${c.name}`); failed++; }
  else if (!problems.some((p) => p.includes(c.want))) {
    console.error(`  CAUGHT BY THE WRONG ASSERTION: ${c.name}`);
    console.error(`    wanted ${JSON.stringify(c.want)}, got: ${problems.join(' | ').slice(0, 140)}`);
    failed++;
  } else console.log(`  caught, by its own assertion: ${c.name}`);
}

//  And the honest output must pass, or every red above is meaningless.
cases++;
if (g.verifyInsertion(LIVE, BLOCK, GOOD).length) { console.error('  THE HONEST INSERTION WAS REJECTED'); failed++; }
else console.log('  the honest insertion still passes both assertions');

//  A block carrying an em-dash: the repo does not use them in authored prose,
//  and block() is where that is caught rather than in review.
cases++;
const tmp = g.BLOCK_FILE + '.mutant';
try {
  fs.copyFileSync(g.BLOCK_FILE, tmp);
  fs.writeFileSync(g.BLOCK_FILE, BLOCK.replace('Here is the rest of it.', () => 'Here is the rest of it \u2014 all of it.'));
  let threw = '';
  try { g.block(); } catch (e) { threw = e.message; }
  if (!threw) { console.error('  REFUSAL EXPECTED, GOT SUCCESS: an em-dash in the authored block'); failed++; }
  else if (!threw.includes('dash')) { console.error(`  WRONG REASON for the em-dash case: ${threw}`); failed++; }
  else console.log('  refused, for its own reason: an em-dash in the authored block');

  cases++;
  fs.writeFileSync(g.BLOCK_FILE, BLOCK.replace(g.SENTINEL, 'Some other opening line.'));
  threw = '';
  try { g.block(); } catch (e) { threw = e.message; }
  if (!threw) { console.error('  REFUSAL EXPECTED, GOT SUCCESS: the sentinel was edited away'); failed++; }
  else if (!threw.includes('sentinel')) { console.error(`  WRONG REASON for the sentinel case: ${threw}`); failed++; }
  else console.log('  refused, for its own reason: the sentinel was edited away');
} finally {
  fs.copyFileSync(tmp, g.BLOCK_FILE);
  fs.unlinkSync(tmp);
}

if (fs.readFileSync(g.BLOCK_FILE, 'utf8') !== BLOCK) { console.error('  THE BLOCK FILE WAS NOT RESTORED'); failed++; }

if (failed) { console.error(`\n${failed} of ${cases} mutations did not refuse for their own reason.`); process.exit(1); }
console.log(`\nall ${cases} mutations refused for their own reason, block file restored`);
