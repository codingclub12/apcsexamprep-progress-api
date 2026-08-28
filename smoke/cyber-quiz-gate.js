#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  lib/cyber-quiz-gate.js, proven in the failing direction.
//
//  Not to be confused with smoke/quiz-gate.js, which is the teacher activity
//  gate (opening and closing a quiz for a class). This one is about the CONTENT
//  of a cyber quiz page: its answer key, its options and its explanations.
//
//  A quiz is a third widget shape and none of the exercise checks reach it:
//  there are no <select> elements at all, just an answer key object and a grid
//  of clickable divs. The failure mode is the same in a different costume.
//  Nothing in the page connects the key to the options except that they happen
//  to spell the same letter, and a key naming a letter with no option is
//  unscoreable and silent.
//
//  Two of these checks exist because the first version of the module got them
//  wrong on the real page, and both wrongs were the gate crying wolf:
//
//    * questions() matched each option's whole <div> and required a trailing
//      </div></div>, which only closes the LAST option in a group. It found
//      option A and nothing else, then reported all five keyed answers as
//      ungettable on a page where every one of them works.
//    * the label was read as the last <span> in the window after the option id.
//      For the final option in a group that window runs on into whatever
//      follows, and it picked up the results panel's score display as option
//      D's text.
//
//  Offline: no network, no secrets, no browser.
//
//  Run: npm run smoke:cyberquizgate
// -----------------------------------------------------------------------------

const assert = require('assert');
const q = require('../lib/cyber-quiz-gate');
const ex = require('../lib/cyber-exercise-gate');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log(`  ok    ${name}`); }
  catch (e) { failures++; console.log(`  FAIL  ${name}`); console.log(`        ${e.message.split('\n')[0]}`); }
}

//  A quiz shaped like the live ones.
const opt = (n, letter, label) => `<div class="quiz-opt" id="q${n}-${letter}" onclick="selectOpt(${n},'${letter}')" style="border:1px solid #eee;">
    <span style="width:26px;">${letter}</span>
    <span style="font-size:0.88rem;">${label}</span>
  </div>`;

function page({ key = { 1: 'B', 2: 'A' }, labels = {}, expls = {} } = {}) {
  const L = (n, l) => (labels[`${n}${l}`] !== undefined ? labels[`${n}${l}`] : `Option ${l} for question ${n}`);
  const qs = [1, 2].map((n) => ['A', 'B', 'C', 'D'].map((l) => opt(n, l, L(n, l))).join('\n')).join('\n');
  const E = (n) => (expls[n] !== undefined ? expls[n] : `${key[n]} - because of the reason for question ${n}.`);
  return `<div id="quizBody">${qs}</div>
<script>
  var ANSWERS={${Object.entries(key).map(([n, l]) => `${n}:'${l}'`).join(',')}},EXPLS={
    1:"${E(1)}",
    2:"${E(2)}"
  };
  window.checkQ=function(n){ var correct=sel[n]===ANSWERS[n]; };
</script>`;
}

console.log('cyber quiz content gate\n');

const good = page();

check('a sound quiz passes', () => {
  const r = q.check(good, good, ex.namesLegacyTerm);
  assert.strictEqual(r.fail.length, 0, r.fail.join('; '));
});

check('all four options are found, not just A', () => {
  const qs = q.questions(good);
  assert.deepStrictEqual(qs['1'].map((o) => o.letter), ['A', 'B', 'C', 'D'], 'option discovery is broken');
  assert.deepStrictEqual(qs['2'].map((o) => o.letter), ['A', 'B', 'C', 'D']);
});

check('the label is the option text, not whatever follows the group', () => {
  //  Trailing content after the last option is what leaked in before.
  const withTail = `${good}<div><span id="score">0</span><span> / 5</span></div>`;
  const last = q.questions(withTail)['2'].find((o) => o.letter === 'D');
  assert.strictEqual(last.label, 'Option D for question 2', `label leaked: ${JSON.stringify(last.label)}`);
});

check('a key naming a missing option FAILS', () => {
  const broken = good.replace("2:'A'", "2:'E'");
  const r = q.check(good, broken, ex.namesLegacyTerm);
  assert.ok(r.fail.some((f) => f.includes('UNGETTABLE')), r.fail.join('; '));
});

check('the answer key silently moving FAILS', () => {
  const broken = good.replace("1:'B'", "1:'C'");
  const r = q.check(good, broken, ex.namesLegacyTerm);
  assert.ok(r.fail.some((f) => f.includes('answer key changed')), r.fail.join('; '));
});

check('an option not wired to selectOpt FAILS', () => {
  const broken = good.replace("onclick=\"selectOpt(1,'C')\"", 'onclick=""');
  const r = q.check(good, broken, ex.namesLegacyTerm);
  assert.ok(r.fail.some((f) => f.includes('not wired to selectOpt')), r.fail.join('; '));
});

check('an unlabelled option FAILS', () => {
  const broken = page({ labels: { '1C': '' } });
  const r = q.check(good, broken, ex.namesLegacyTerm);
  assert.ok(r.fail.some((f) => f.includes('has no label')), r.fail.join('; '));
});

check('an all-of-the-above option FAILS', () => {
  for (const s of ['All of the above', 'None of the above',
    'All three controls are equally important here', 'None of the three would help']) {
    const broken = page({ labels: { '1D': s } });
    const r = q.check(good, broken, ex.namesLegacyTerm);
    assert.ok(r.fail.some((f) => f.includes('all-of-the-above')), `${s}: ${r.fail.join('; ')}`);
  }
});

check('a legacy term in the CREDITED option FAILS', () => {
  const broken = page({ labels: { '1B': 'AI-personalized spear phishing of the CFO' } });
  const r = q.check(good, broken, ex.namesLegacyTerm);
  assert.ok(r.fail.some((f) => f.includes('credited answer to question 1')), r.fail.join('; '));
});

check('a legacy term in a DISTRACTOR is allowed', () => {
  const broken = page({ labels: { '1D': 'AI-personalized spear phishing of the CFO' } });
  const r = q.check(good, broken, ex.namesLegacyTerm);
  assert.strictEqual(r.fail.length, 0, `a wrong answer may name it: ${r.fail.join('; ')}`);
});

check('a legacy term in an EXPLANATION FAILS', () => {
  //  A student reads the explanation exactly once, right after answering, which
  //  is the moment it lands hardest. It does not get a distractor's licence.
  const broken = page({ expls: { 1: 'B - spear phishing is what this is called.' } });
  const r = q.check(good, broken, ex.namesLegacyTerm);
  assert.ok(r.fail.some((f) => f.includes('explanation for question 1')), r.fail.join('; '));
});

check('a skewed key is reported, never failed', () => {
  const skewed = page({ key: { 1: 'C', 2: 'C' } });
  const r = q.check(skewed, skewed, ex.namesLegacyTerm);
  assert.strictEqual(r.fail.length, 0, `a skewed key must not block an unrelated edit: ${r.fail.join('; ')}`);
  assert.ok(r.note.some((n) => n.includes('skewed')), `and it must be said out loud: ${r.note.join(' | ')}`);
});

console.log('');
if (failures) { console.error(`${failures} check(s) failed`); process.exit(1); }
console.log('all checks passed');
