'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Run one smoke suite for a deploy gate, and judge it on TWO facts.
//
//  WHY THIS EXISTS
//  Deploy gate manifests pin a suite's result as an exact string, "90 passed, 0
//  failed". That is precise and it rots on contact with other people's work. The
//  post-deploy run of the 2026-09-08 lab lock gate refused to ship over
//  smoke:storefront reading 93 rather than 90, because main had gained one more
//  live verifier and the guard's per-file scan covered it. The suite was green.
//  The gate refused a correct deploy and said nothing about why.
//
//  WHY NOT JUST MATCH ", 0 failed"
//  Because a suite that quietly stopped running its assertions reports zero
//  failures too, and this repo has already found three hollow guards that way.
//  Rule 5.1 of smoke/storefront-fetch.js exists for exactly this: a scan over an
//  empty set passes and proves nothing. So the count has a FLOOR: green, and no
//  smaller than it was when the gate was written. Growing is fine and expected;
//  shrinking is the thing worth refusing on.
//
//  Usage:  node scripts/gate-suite-floor.js <suite> <floor>
//  Prints  GATE OK: smoke:<suite> N passed, 0 failed (floor F)
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const cp = require('child_process');

const suite = process.argv[2];
const floor = Number(process.argv[3]);
if (!suite || !Number.isInteger(floor)) {
  console.error('usage: node scripts/gate-suite-floor.js <suite> <floor>');
  process.exit(2);
}

let out = '';
try {
  out = cp.execSync('npm run --silent smoke:' + suite, { encoding: 'utf8', maxBuffer: 1 << 26 });
} catch (e) {
  out = (e.stdout || '') + (e.stderr || '');
  //  Fall through. A non-zero exit is usually a red assertion, which the tally
  //  below reports better than an exit code does. A suite that died before
  //  printing a tally is caught by the missing-tally branch.
}

//  Suites in this repo print "N passed, M failed" as their last word. Two
//  spellings exist, "  12 passed, 0 failed" and "12 passed, 0 failed", and both
//  end the same way.
const tallies = [...out.matchAll(/(\d+) passed, (\d+) failed/g)];
if (!tallies.length) {
  console.log('GATE FAILED: smoke:' + suite + ' printed no tally, so it did not run to a verdict');
  console.log(out.split('\n').slice(-8).join('\n'));
  process.exit(1);
}
const last = tallies[tallies.length - 1];
const passed = Number(last[1]);
const failed = Number(last[2]);
const line = passed + ' passed, ' + failed + ' failed';

if (failed === 0 && passed >= floor) {
  console.log('GATE OK: smoke:' + suite + ' ' + line + ' (floor ' + floor + ')');
  process.exit(0);
}
console.log('GATE FAILED: smoke:' + suite + ' ' + line + ' (floor ' + floor + ')');
if (failed) {
  for (const l of out.split('\n').filter((l) => /FAIL|MISS/.test(l)).slice(0, 10)) console.log('  ' + l.trim());
} else {
  console.log('  green but SHRANK below the floor: a suite that stopped running');
  console.log('  its assertions reports zero failures too.');
}
process.exit(1);
