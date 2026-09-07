'use strict';
/*
 *  The Unit 1 deck voice repair, pinned.
 *
 *  Two of its decisions are the ones a future edit is most likely to undo, so
 *  they are asserted here rather than left as a comment.
 *
 *  1. Topic 1.3's escape-sequence exercise asks a student to write the println
 *     that produces exactly:  He wrote "C:\temp" on the board.
 *     That "on the board" is the required OUTPUT of the item. A repair that
 *     matched "the board" by pattern would break the exercise. The table is
 *     keyed on whole paragraphs, so it does not, and this proves it.
 *
 *  2. Grouping that IS the activity stays. "Trade with a neighbor and find one
 *     step that breaks" is the bell ringer, not pacing wrapped around one.
 *     Grouping used as a modifier on an otherwise complete instruction comes
 *     off: "Complete the six checks in pairs" becomes "Complete the six checks".
 */
const { execFileSync } = require('child_process');
const path = require('path');

const REPAIR = path.join(__dirname, '..', 'scripts', 'repair-csa-unit1-deck-voice.py');

const CASES = [
  // [paragraph, must be in the repair table]
  ['On the board:', true],
  ['Both lines call a method. In 3 minutes, list every difference you can see between the two calls. Do not look anything up.', true],
  ['Complete the Tier 2 practice set with a partner. House rule: write the numbered index line under every String before choosing an answer.', true],
  ['Move to the live lesson page (Unit 1 Link Sheet, row 1.3).', true],
  // must be left alone
  ['Escape practice: write the single println statement that produces exactly this line of output, quotation marks and backslashes included: He wrote "C:\\temp" on the board.', false],
  ['System.out.println(Math.pow(2, 8));', false],
  ['A class somebody else wrote:', false],
  ['Write down what this prints. Then write one sentence saying what n += n means in words, without using the += symbol.', false],
];

const script = `
import sys, json
from importlib.machinery import SourceFileLoader
m = SourceFileLoader('m', ${JSON.stringify(REPAIR)}).load_module()
cases = json.loads(sys.stdin.read())
print(json.dumps([t in m.REPAIRS for t, _ in cases]))
`;
const out = execFileSync('python3', ['-c', script], { input: JSON.stringify(CASES), encoding: 'utf8' });
const got = JSON.parse(out);

let failed = 0;
CASES.forEach(([text, want], i) => {
  const ok = got[i] === want;
  if (!ok) failed++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${want ? 'repairs ' : 'leaves  '} ${JSON.stringify(text.slice(0, 62))}`);
});

// Every replacement must itself be clean, or the repair moves the problem.
const dirt = /\bon the board\b|\bin pairs\b|\bwith a partner\b|\bask the class\b|\bhave students\b|\b\d+ minutes\b/i;
const values = JSON.parse(execFileSync('python3', ['-c', `
import json
from importlib.machinery import SourceFileLoader
m = SourceFileLoader('m', ${JSON.stringify(REPAIR)}).load_module()
print(json.dumps([v for v in m.REPAIRS.values() if isinstance(v, str)]))
`], { encoding: 'utf8' }));
const dirty = values.filter((v) => dirt.test(v));
console.log();
if (dirty.length) {
  failed += dirty.length;
  dirty.forEach((v) => console.log(`  [FAIL] replacement is still directional: ${JSON.stringify(v.slice(0, 70))}`));
} else {
  console.log(`  [PASS] all ${values.length} replacements are themselves clean`);
}

console.log();
if (failed) {
  console.log(`${failed} FAILED`);
  process.exit(1);
}
console.log(`${CASES.length + 1} passed, 0 failed`);
