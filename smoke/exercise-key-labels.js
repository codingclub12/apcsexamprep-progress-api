'use strict';
/*
 *  The doubled-label rule, pinned.
 *
 *  Every item in the Unit 1 exercise keys' "What to look for" section printed
 *  its label twice, because the generator prepended a heading to a body that
 *  already opened with it:
 *
 *      Import confusion: Import confusion. Math and String are in java.lang.
 *
 *  Nothing there is false, which is why it survived. It is in scope because a
 *  doubled phrase reads as machine-written, and this repo treats that as an
 *  acceptance criterion.
 *
 *  This suite exists for the NEGATIVE half. Collapsing "X: X." is easy; the
 *  risk is a rule that also eats "Why: println ends the line" and "Answer:
 *  Ready SetGo Done", which are ordinary content in the same documents. Those
 *  cases are the reason the repair compares both halves rather than matching a
 *  colon.
 */
const { execFileSync } = require('child_process');
const path = require('path');

const REPAIR = path.join(__dirname, '..', 'scripts', 'repair-csa-unit1-exercise-keys.py');

const CASES = [
  // [text, must collapse]
  ['If it compiles, it works: If it compiles, it works. Successful compilation means the code follows Java rules.', true],
  ['Import confusion: Import confusion. Math and String are in java.lang.', true],
  ['Exception equals run-time error: Exception equals run-time error. Students treat the words as synonyms.', true],
  ['Wrong output gets called an exception: Wrong output gets called an exception. If a program compiles.', true],
  ['An algorithm has to be code: An algorithm has to be code. The CED lists written language as valid.', true],
  // must survive untouched
  ['Why: println ends the line; print does not. The two prints land on one line.', false],
  ['Answer: Ready SetGo Done', false],
  ['The sorting rule is mechanical: variables are always attributes and methods are always behaviors.', false],
  ['Note: Nothing here repeats the label at all.', false],
  ['Import confusion: Imports are needed for java.util classes but not java.lang.', false],
  ['Precondition: 0 is less than or equal to index.', false],
];

let failed = 0;
const script = `
import sys, json
from importlib.machinery import SourceFileLoader
m = SourceFileLoader('m', ${JSON.stringify(REPAIR)}).load_module()
cases = json.loads(sys.stdin.read())
print(json.dumps([m.collapse(t) is not None for t, _ in cases]))
`;
const out = execFileSync('python3', ['-c', script], { input: JSON.stringify(CASES), encoding: 'utf8' });
const got = JSON.parse(out);

CASES.forEach(([text, want], i) => {
  const ok = got[i] === want;
  if (!ok) failed++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${want ? 'collapses' : 'survives '} ${JSON.stringify(text.slice(0, 58))}`);
});

console.log();
if (failed) {
  console.log(`${failed} FAILED`);
  process.exit(1);
}
console.log(`${CASES.length} passed, 0 failed`);
