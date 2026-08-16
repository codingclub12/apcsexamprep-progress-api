'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: assertion integrity. Reads every other suite as TEXT and fails if it
//  contains an assertion that cannot fail.
//
//  WHY THIS EXISTS
//    The recurring defect in this repo is not a broken check. It is a check
//    that reports success while doing nothing:
//      - a mojibake test whose section asserted nothing about mojibake
//      - a workflow whose skip path exited 0 on a night it read nothing
//      - `node ... | tee` reporting TEE's exit status, so a dead script was green
//      - a 401 fix that never reached the board's own copy of the rule
//    Every one of those was found by accident. A green line that tests nothing
//    is the cheapest possible version of the same failure, so it gets a guard.
//
//  WHAT COUNTS AS "CANNOT FAIL"
//    `ok(label, true)` - a constant condition. The line always passes, and it
//    reads in the output exactly like a real check.
//
//  THE ONE LEGITIMATE USE, AND WHY IT IS ALLOWED
//    Reaching the line can BE the assertion:
//
//      try  { doTheThing(); ok('it works', true); }
//      catch (e) { ok('it works', false, e.message); }
//
//    That is a real test - the catch is the failing branch. It is told apart
//    from decoration by the paired `ok(<same label>, false)` in the same file.
//    A constant-true with no paired false is a section heading wearing an
//    assertion's clothes, and it should be a console.log instead.
//
//  Run: npm run smoke:assertions
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let pass = 0; let fail = 0;
const failures = [];
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); } else {
    fail++; failures.push(name);
    console.log(`  [FAIL] ${name}${extra !== undefined ? '  ' + JSON.stringify(extra) : ''}`);
  }
};

const DIR = __dirname;
const SUITES = fs.readdirSync(DIR)
  .filter((f) => f.endsWith('.js') && f !== path.basename(__filename))
  .sort();

// Anchored deliberately narrowly. An earlier version of this scan tried to
// parse arguments by tracking depth and quotes, and got two things wrong: it
// matched `r.ok()` in Playwright calls, and it read the `"` inside a regex
// literal like /"[a-z]+":"/ as the start of a string, which threw the depth
// count off and produced four false positives. A guard that cries wolf is a
// guard someone deletes, so this matches one unambiguous shape and nothing
// else: a quoted label, then a constant `true`, then a comma or a close paren.
const CONSTANT_TRUE = /(?<![.\w])ok\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1\s*,\s*true\s*[,)]/g;
const PAIRED_FALSE = (label) => new RegExp(
  `(?<![.\\w])ok\\(\\s*(['"\`])${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1\\s*,\\s*false\\s*[,)]`);

console.log('\nASSERTION INTEGRITY\n');
console.log(`1. Every suite is readable (${SUITES.length} found)`);
ok('1.1 there are suites to check', SUITES.length > 20, SUITES.length);

console.log('\n2. No assertion has a constant condition without a failing twin');
const offenders = [];
let scanned = 0;
for (const f of SUITES) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  let m;
  CONSTANT_TRUE.lastIndex = 0;
  while ((m = CONSTANT_TRUE.exec(src))) {
    scanned++;
    const label = m[2];
    if (PAIRED_FALSE(label).test(src)) continue;
    offenders.push({
      file: f,
      line: src.slice(0, m.index).split('\n').length,
      label,
    });
  }
}
ok('2.1 the scan actually matched the shape it is looking for', scanned > 0, scanned);
ok('2.2 no always-passing assertion without a paired failing branch',
  offenders.length === 0, offenders);

// The guard has to be able to see its own shape, or it is the very thing it
// exists to catch: a check that passes because it looks at nothing.
console.log('\n3. The guard can detect its own subject');
const decoy = "ok('a decoy that always passes', true);";
CONSTANT_TRUE.lastIndex = 0;
ok('3.1 a bare constant-true IS matched', CONSTANT_TRUE.test(decoy));
const paired = `${decoy}\nok('a decoy that always passes', false, e);`;
CONSTANT_TRUE.lastIndex = 0;
const dm = CONSTANT_TRUE.exec(paired);
ok('3.2 and a paired failing branch clears it', !!dm && PAIRED_FALSE(dm[2]).test(paired));
ok('3.3 a method call named ok() is NOT matched',
  !/(?<![.\w])ok\(/.test('if (!r.ok()) return null;'));

console.log(`\n${'-'.repeat(70)}`);
console.log(`assertion-integrity: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFailed:'); for (const f of failures) console.log('  - ' + f); }
process.exit(fail ? 1 : 0);
