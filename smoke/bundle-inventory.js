'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  MUTATION TEST FOR lib/page-section-insert.js AND BOTH BUNDLE SHEETS.
//
//  A green mutation run is a FAILED check, so each case breaks exactly one rule
//  and demands a refusal naming THAT rule. Requiring only "it refused" proves
//  nothing where guards overlap.
//
//  Every splice case runs against BOTH generators' blocks, so a rule that holds
//  for CSP and not for CSA cannot hide behind the one that passes.
//
//  Offline: splice() is pure, so nothing here touches the network or the store.
//  The generators are required, not run; main() is guarded by require.main.
//
//    node smoke/bundle-inventory.js       # npm run smoke:bundleinventory
// ─────────────────────────────────────────────────────────────────────────────
const ins = require('../lib/page-section-insert');
const csp = require('../scripts/csp-bundle-inventory-csv.js');
const csa = require('../scripts/csa-bundle-inventory-csv.js');

const PAGES = [
  { id: 'csp', g: csp },
  { id: 'csa', g: csa },
];

let failed = 0, cases = 0;

//  A stand-in body shaped like the real ones: prose, the anchor, and content
//  AFTER the anchor, which is where a bad replace does its damage.
function bodyFor(anchor) {
  return `<div class="wrap"><h2>All units. One complete course.</h2>
<div class="unit-grid"><div class="unit-card">Unit 1</div></div>
${anchor}
<div class="also-title">Every purchase also includes</div>
<ul><li>Updates through summer 2026</li><li>Create Task scaffolding</li></ul>
</div><div class="who">Built for teachers.</div>`;
}

function expectRefusal(name, args, want) {
  cases++;
  const { problems } = ins.splice(args);
  if (!problems || !problems.length) { console.error(`  REFUSAL EXPECTED, GOT SUCCESS: ${name}`); failed++; return; }
  if (!problems.some((p) => p.includes(want))) {
    console.error(`  REFUSED FOR THE WRONG REASON: ${name}`);
    console.error(`    wanted ${JSON.stringify(want)}, got: ${problems.join(' | ').slice(0, 150)}`);
    failed++; return;
  }
  console.log(`  refused, for its own reason: ${name}`);
}

for (const { id, g } of PAGES) {
  console.log(`\n${id}`);
  const A = g.ANCHOR, S = g.SENTINEL, B = g.BLOCK;
  const LIVE = bodyFor(A);

  //  Control: the honest case must succeed and must be a pure insertion that
  //  keeps everything after the anchor.
  cases++;
  const ok = ins.splice({ live: LIVE, block: B, anchor: A, sentinel: S });
  if (ok.problems.length) { console.error(`  CONTROL FAILED: ${ok.problems.join(' | ')}`); failed++; }
  else if (ok.out.length !== LIVE.length + B.length) { console.error('  CONTROL FAILED: not a pure insertion by length'); failed++; }
  else if (!ok.out.includes('Every purchase also includes')) { console.error('  CONTROL FAILED: content after the anchor was lost'); failed++; }
  else console.log('  control: splices to exactly live + block, nothing after the anchor lost');

  expectRefusal('the anchor is gone, because the page layout changed',
    { live: LIVE.replace(A, '<div class="also2">'), block: B, anchor: A, sentinel: S }, 'occurs 0 times');

  expectRefusal('the anchor occurs twice, so the insert point is ambiguous',
    { live: LIVE + '\n' + A, block: B, anchor: A, sentinel: S }, 'occurs 2 times');

  expectRefusal('the section is already live, and a second run would print it twice',
    { live: LIVE.replace(A, () => B + A), block: B, anchor: A, sentinel: S }, 'ALREADY on the live page');

  //  THE DOLLAR HAZARD. String.replace interprets $&, $` and $' in a STRING
  //  replacement. splice() uses a function replacement, so this must come back
  //  a clean insertion. Built with a function replacement here too: written the
  //  obvious way this line expands the sequences before splice() sees them and
  //  the case passes against a naive implementation. That happened.
  cases++;
  {
    const dollar = B.replace(S, () => S + ' $& $` $\' 100%');
    const r = ins.splice({ live: LIVE, block: dollar, anchor: A, sentinel: S });
    if (r.problems.length) { console.error(`  A $-BEARING BLOCK WAS REFUSED: ${r.problems.join(' | ').slice(0, 110)}`); failed++; }
    else if (!r.out.includes('$&') || !r.out.includes('$`')) { console.error('  THE $ SEQUENCES WERE INTERPRETED'); failed++; }
    else console.log('  clean insertion despite $& and $` and $\' in the block');
  }

  //  THE JOIN INCIDENT, aimed at the guard itself. splice() builds its own
  //  output, so feeding it a corrupted one is the only way to prove these
  //  assertions fire. Each is a body a rendered-text diff would wave through.
  const GOOD = ok.out;
  for (const c of [
    { name: 'a list item deleted elsewhere in the body, the /pages/join failure',
      out: GOOD.replace('<li>Create Task scaffolding</li>', ''), want: 'length is' },
    { name: 'content after the anchor truncated',
      out: GOOD.slice(0, GOOD.length - 40), want: 'length is' },
    { name: 'a byte changed with the length preserved, which only the exact check sees',
      out: GOOD.replace('Every purchase also includes', 'Every purchase also lncludes'), want: 'byte for byte' },
  ]) {
    cases++;
    const problems = ins.verifyInsertion(LIVE, B, c.out);
    if (!problems.length) { console.error(`  CORRUPTION NOT CAUGHT: ${c.name}`); failed++; }
    else if (!problems.some((p) => p.includes(c.want))) {
      console.error(`  CAUGHT BY THE WRONG ASSERTION: ${c.name}`); failed++;
    } else console.log(`  caught, by its own assertion: ${c.name}`);
  }

  //  Authored-prose rules, on the real block rather than a synthetic one.
  cases++;
  {
    let threw = '';
    try { ins.checkAuthored(B.replace(S, () => S + ' \u2014 and more'), S); } catch (e) { threw = e.message; }
    if (!threw.includes('dash')) { console.error(`  AN EM-DASH IN THE BLOCK WAS NOT CAUGHT: ${threw || 'no throw'}`); failed++; }
    else console.log('  refused, for its own reason: an em-dash in the authored block');
  }
  cases++;
  {
    let threw = '';
    try { ins.checkAuthored(B.replace(S, () => 'Some other opening line.'), S); } catch (e) { threw = e.message; }
    if (!threw.includes('sentinel')) { console.error(`  THE SENTINEL CHECK DID NOT FIRE: ${threw || 'no throw'}`); failed++; }
    else console.log('  refused, for its own reason: the sentinel was edited away');
  }
  cases++;
  if (ins.checkAuthored(B, S) !== B) { console.error('  THE REAL BLOCK DID NOT PASS ITS OWN CHECKS'); failed++; }
  else console.log('  the real block passes its own checks');
}


//  ── THE POST-IMPORT CHECK, WHICH IS DELIBERATELY LOOSER ────────────────────
//  verifyAfterImport tolerates whitespace because Shopify reformats HTML on
//  save. Loosening a guard is exactly when it has to be proved it still bites,
//  so these cases assert BOTH directions: whitespace-only differences pass, and
//  every content change is still caught.
console.log('\npost-import check');
for (const { id, g } of PAGES) {
  const A = g.ANCHOR, B = g.BLOCK;
  const BEFORE = bodyFor(A);
  const LANDED = BEFORE.replace(A, () => B + A);

  const expectPass = (name, body) => {
    cases++;
    const probs = ins.verifyAfterImport(BEFORE, B, body);
    if (probs.length) { console.error(`  FALSE ALARM on ${id}: ${name}: ${probs.join(' | ').slice(0,110)}`); failed++; }
    else console.log(`  passes, correctly: ${id} ${name}`);
  };
  const expectFail = (name, body, want) => {
    cases++;
    const probs = ins.verifyAfterImport(BEFORE, B, body);
    if (!probs.length) { console.error(`  MISSED on ${id}: ${name}`); failed++; }
    else if (!probs.some((x) => x.includes(want))) {
      console.error(`  CAUGHT BY THE WRONG RULE on ${id}: ${name}`);
      console.error(`    wanted ${JSON.stringify(want)}, got: ${probs.join(' | ').slice(0,140)}`);
      failed++;
    } else console.log(`  caught, for its own reason: ${id} ${name}`);
  };

  //  Must PASS: the real Shopify behaviour.
  expectPass('an exact landing', LANDED);
  expectPass('newlines inserted the way Shopify does it',
    LANDED.replace('<li><strong>', () => '<li>\n<strong>'));
  expectPass('whitespace collapsed and re-expanded all over',
    LANDED.replace(/\n/g, () => '\n  '));

  //  Must FAIL: anything that changes what a reader sees.
  expectFail('a list item deleted elsewhere, the /pages/join failure',
    LANDED.replace('<li>Create Task scaffolding</li>', () => ''), 'non-whitespace characters');
  expectFail('a word altered with the length preserved',
    LANDED.replace('Every purchase also includes', () => 'Every purchase also lncludes'), 'does not return the pre-import body');
  expectFail('the section missing entirely', BEFORE, 'non-whitespace characters');
  expectFail('extra content smuggled in',
    LANDED + '<p>Buy now for $999</p>', 'non-whitespace characters');
}

if (failed) { console.error(`\n${failed} of ${cases} cases did not behave as required.`); process.exit(1); }
console.log(`\nall ${cases} cases across ${PAGES.length} pages behaved as required`);
