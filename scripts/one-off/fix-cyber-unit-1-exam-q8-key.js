// Corrects the Q8 answer key on the AP Cybersecurity Unit 1 exam.
//
// Q8 asks which measures reduce phishing risk: I domain-check training,
// II email filtering, III longer passwords. The key said A, "I only", while the
// explanation argued I and II are both effective and the distractor note on (A)
// read "Incomplete - email filtering (II) is also an effective anti-phishing
// control." Every piece of feedback on the page said B. Only the key disagreed,
// so a student who reasoned it out and picked B was marked wrong.
//
// The key moves A -> B. Options are NOT reordered: the resulting 4/6/5/5 spread
// is a deliberate call, since one question of imbalance is cheaper than shuffling
// a question that is already correct.
const fs = require('fs');

const SRC = process.argv[2];
const OUT = process.argv[3];
const before = fs.readFileSync(SRC, 'utf8');

const problems = [];
const check = (cond, msg) => { if (!cond) problems.push(msg); };

const answersRe = /var ANSWERS = \{[^}]*\};/;
const m = before.match(answersRe);
check(m, 'ANSWERS line not found');

const parsed = JSON.parse(m[0].replace('var ANSWERS = ', '').replace(/;$/, ''));
check(parsed.e8 === 'A', `expected e8 to be A before the fix, found ${parsed.e8}`);

// The intended answer must actually be an option, and must be "I and II only".
const q8 = [...before.matchAll(/name="qe8" value="([A-D])"> <span>\(([A-D])\) ([^<]*)</g)]
  .map((x) => ({ value: x[1], label: x[2], text: x[3] }));
check(q8.length === 4, `Q8 should have 4 options, found ${q8.length}`);
const target = q8.find((o) => o.value === 'B');
check(target && target.text === 'I and II only',
  `Q8 option B should read "I and II only", found "${target && target.text}"`);

const after = before.replace(answersRe, (line) => line.replace('"e8": "A"', '"e8": "B"'));

// Exactly one byte may differ, and it must be the e8 letter.
check(after.length === before.length, 'length changed; more than the key was edited');
const diffs = [];
for (let i = 0; i < before.length; i++) if (before[i] !== after[i]) diffs.push(i);
check(diffs.length === 1, `expected exactly 1 changed character, found ${diffs.length}`);
if (diffs.length === 1) {
  check(before[diffs[0]] === 'A' && after[diffs[0]] === 'B',
    `changed character is ${before[diffs[0]]}->${after[diffs[0]]}, expected A->B`);
}

// No distractor explanation may sit on the new correct answer.
const anchor = after.indexOf('name="qe8" value="A"');
const ds = after.indexOf('<div class="fb-distractors">', anchor);
const inner = after.slice(ds, after.indexOf('</div>', ds));
[...inner.matchAll(/<strong>\(([A-D])\)<\/strong>/g)].forEach((x) => {
  check(x[1] !== 'B', `Q8 distractor (${x[1]}) now sits on the correct answer`);
});

const final = JSON.parse(after.match(answersRe)[0].replace('var ANSWERS = ', '').replace(/;$/, ''));
const key = Array.from({ length: 20 }, (_, i) => final['e' + (i + 1)]);
const dist = { A: 0, B: 0, C: 0, D: 0 };
key.forEach((k) => dist[k]++);
let run = 1, maxRun = 1;
for (let i = 1; i < 20; i++) { run = key[i] === key[i - 1] ? run + 1 : 1; if (run > maxRun) maxRun = run; }
check(maxRun <= 2, `longest same-letter run is ${maxRun}`);

if (problems.length) {
  console.error('FAILED:\n' + problems.map((p) => '  - ' + p).join('\n'));
  process.exit(1);
}

fs.writeFileSync(OUT, after);
console.log('OK  e8 A->B, one character changed, nothing else touched');
console.log('key ' + key.join(' '));
console.log('distribution ' + JSON.stringify(dist) + '  longest run ' + maxRun +
  '  worst bubble-one-letter ' + Math.round(Math.max(...Object.values(dist)) / 20 * 100) + '%');
