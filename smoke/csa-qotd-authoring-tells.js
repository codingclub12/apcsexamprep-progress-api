'use strict';
/*
 *  lib/authoring-tells.js, rule by rule, and the mutation that proves each rule
 *  is load-bearing.
 *
 *  WHY PER-RULE AND NOT IN AGGREGATE
 *  The repo convention is that a validator goes red for the rule you broke, not
 *  for some other rule that happened to catch the same fixture. A suite that
 *  passes in aggregate tells you the detector works; it does not tell you which
 *  half of it works. Two guards in this repo were found hollow that way.
 *
 *  So each strict rule gets its own positive case, and the mutation half
 *  DISABLES that one rule and requires its own case to go undetected. A rule
 *  whose case still trips with the rule switched off is redundant, and a rule
 *  nobody can trip is dead. Both fail here.
 *
 *  The negative half matters at least as much. The first sweep written for this
 *  defect flagged ap-csa-u4-c2-day-9-while-removal for the phrase "re-check the
 *  same index since a new element shifted in", which is exactly how you teach
 *  the while-removal pattern. Every string under LEGIT is real teaching prose
 *  off a live page, and a strict rule that fires on one of them fails.
 */
const T = require('../lib/authoring-tells.js');

//  One case per strict rule, keyed by rule id, written in the shape it was
//  actually found in (or would be found in) a live article body.
const CASES = {
  'let-me': '<p>Cast to int gives 5-12. Let me recheck: Math.random() * 8 is [0.0, 8.0).</p>',
  wait: '<p>i=6: 6 &lt; 6? NO... wait, size is now 6!</p>',
  'hold-on': '<p>Hold on, the end index is exclusive.</p>',
  hmm: '<p>Hmm, that would make both B and C correct.</p>',
  'second-thought': '<p>On second thought the multiplier should be 8.</p>',
  'correction-label': '<p>Correction: Both I and III produce values in the range 5-12.</p>',
  'scratch-that': '<p>Scratch that, the loop terminates after three passes.</p>',
  'answer-should': '<p>The answer should evaluate III more carefully.</p>',
  'seems-right': '<p>Cast to int gives 5-12, which seems right.</p>',
  'i-think-answer': '<p>I think the answer is C but the key says A.</p>',
  'as-an-ai': '<p>As an AI I cannot run this program.</p>',
  'here-is': '<p>Here is the explanation for the correct answer.</p>',
  certainly: '<p>Certainly, here is a question on integer division.</p>',
  todo: '<p>TODO: add the fourth distractor.</p>',
  'insert-here': '<p>[insert rationale for option D]</p>',
  'note-to-self': '<p>Note to self: check the substring bounds.</p>',
  fence: '<span class="apcs-option-content">```java\nint[] arr = {5, 2, 8, 1, 9};\n```</span>',
  'thinking-tag': '<p><thinking>the key is B</thinking></p>',
  'ignore-previous': '<p>Ignore the previous trace, it double counted.</p>',
  'blank-entity': '<p>J(0) A(1) V(2) A(3) &amp;blank;(4) P(5)</p>',
};

//  Real teaching prose. None of these may trip a strict rule.
const LEGIT = [
  '<p>Use a while loop with conditional increment: only advance i when no removal occurs. After removal, re-check the same index since a new element shifted in.</p>',
  '<p>The cast succeeds because c2 is actually a Card object.</p>',
  '<p>Wait until the loop finishes before reading the accumulator.</p>',
  '<p>A waiting list is a queue, which is not on the AP CSA exam.</p>',
  '<p>Actually running the program is the only way to be sure, so trace it on paper first.</p>',
  '<p>The correction factor for a rounding error is not tested here.</p>',
  '<p>Insert the value at index 0 and everything after it shifts right.</p>',
  '<p>What is printed as a result of executing the code segment?</p>',
  '<p>Of course the loop still runs when the list is empty.</p>',
];

let failed = 0;
const bad = (m) => { console.log('  FAIL  ' + m); failed++; };

const strict = T.RULES.filter((r) => r.strict);

// ── 1. every strict rule has a case, and every case has a rule ───────────────
strict.forEach((r) => { if (!(r.id in CASES)) bad('rule ' + r.id + ' has no positive case in this suite'); });
Object.keys(CASES).forEach((id) => { if (!strict.some((r) => r.id === id)) bad('case ' + id + ' names no strict rule'); });

// ── 2. each case trips its own rule ──────────────────────────────────────────
strict.forEach((r) => {
  if (!(r.id in CASES)) return;
  const hits = T.find(CASES[r.id], { strictOnly: true });
  if (!hits.some((h) => h.id === r.id)) bad('rule ' + r.id + ' did not fire on its own case: ' + CASES[r.id].slice(0, 70));
});

// ── 3. MUTATION. Disable one rule and its own case must go quiet. ────────────
//  A case that still trips means this rule is redundant with another, and a
//  redundant rule is one nobody will notice when it stops matching.
strict.forEach((r) => {
  if (!(r.id in CASES)) return;
  const hits = T.find(CASES[r.id], { strictOnly: true, skip: [r.id] });
  if (hits.length) {
    bad('mutation: with rule ' + r.id + ' disabled its own case still trips ' + hits.map((h) => h.id).join(', ')
      + ', so ' + r.id + ' is not the rule doing the work');
  }
});

// ── 4. the negative half ─────────────────────────────────────────────────────
LEGIT.forEach((text) => {
  const hits = T.find(text, { strictOnly: true });
  if (hits.length) bad('false positive (' + hits.map((h) => h.id).join(', ') + ') on real prose: ' + text.slice(0, 80));
});

// ── 5. visibleText keeps what a reader sees and drops what only runs ─────────
const mixed = '<style>.x{color:red}</style><script>var correct = "TODO";</script>'
  + '<pre><code><span class="apcs-comment">// Let me recheck the trace</span></code></pre>';
const vis = T.visibleText(mixed);
if (/color:red/.test(vis)) bad('visibleText kept a <style> block');
if (/var correct/.test(vis)) bad('visibleText kept a <script> block');
if (!/Let me recheck/.test(vis)) bad('visibleText dropped a code comment, which is where two of the nine articles hid their deliberation');

// ── 6. clean() agrees with find() ────────────────────────────────────────────
if (T.clean(CASES.wait)) bad('clean() called a body with a strict tell clean');
if (!T.clean(LEGIT[0])) bad('clean() called real teaching prose dirty');

console.log(failed === 0
  ? '\nauthoring-tells: ' + strict.length + ' strict rules, each with its own case and its own mutation, '
    + LEGIT.length + ' negative cases. All pass.'
  : '\nauthoring-tells: ' + failed + ' failure(s).');
process.exit(failed ? 1 : 0);
