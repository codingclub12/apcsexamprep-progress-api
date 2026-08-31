#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  lib/cyber-denominator-gate.js, proven in the failing direction.
//
//  The gate exists because of one live defect, so the fixtures here are shaped
//  like the page that had it. ap-cybersecurity-unit-1-password-attacks served
//  nine graded blocks numbered 2 through 10 under a tracker that read
//  `state.score + ' / 10'`, and capped every student on it at 90 percent.
//
//  A gate that only fires is worth nothing: the 23 other cyber lesson pages
//  measured the same day are correct, and a check that flagged them too would be
//  turned off within a week. So the healthy shells are fixtures as well, one per
//  family, and each has to stay silent.
//
//  Offline: no network, no secrets, no browser.
//
//  Run: npm run smoke:cyberdenomgate
// -----------------------------------------------------------------------------

const assert = require('assert');
const g = require('../lib/cyber-denominator-gate');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log(`  ok    ${name}`); }
  catch (e) { failures++; console.log(`  FAIL  ${name}`); console.log(`        ${e.message.split('\n')[0]}`); }
}

//  One graded block, shaped like the live ones.
const block = (n) =>
  `<div class="cfu-block" id="cfu-${n}" data-answer="C" data-num="${n}">
     <span class="cfu-counter">Q ${n} of 10</span>
   </div>`;

//  Family A: the total is a literal typed into the tracker.
const literalShell = (nums, total) => `
  ${nums.map(block).join('\n')}
  <span id="cfu-score-num">0 / ${total}</span>
  <script>
    function updateTracker(){
      var scoreNum = document.getElementById('cfu-score-num');
      if (scoreNum) scoreNum.textContent = state.score + ' / ${total}';
    }
  </script>`;

//  Family B: the total is declared on a state object and rendered from it.
const declaredShell = (nums, total) => `
  ${nums.map(block).join('\n')}
  <span id="cfu-score-num">0 / ${total}</span>
  <script>
    var cfuState = { score: 0, total: ${total}, answered: {} };
    function updateTracker(){
      document.getElementById('cfu-score-num').textContent = cfuState.score + ' / ' + cfuState.total;
    }
  </script>`;

//  Family C: the grade-all shells. The total is computed from the question set.
const dynamicShell = (nums) => `
  ${nums.map(block).join('\n')}
  <div class="score-panel">Score: <span class="score-num" id="score-num"></span></div>
  <script>
    var tot = document.querySelectorAll('.cfu-block').length, sc = 0;
    document.getElementById('score-num').textContent = sc + '/' + tot;
  </script>`;

const range = (a, b) => { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; };
const kinds = (html) => g.check(html).map((f) => f.kind);

console.log('cyber denominator gate');

// ── THE DEFECT ───────────────────────────────────────────────────────────────
check('the live 1.2 shape is caught: nine blocks numbered 2-10 under a total of 10', () => {
  const found = g.check(literalShell(range(2, 10), 10));
  assert.ok(found.some((f) => f.kind === 'cfu-denominator-mismatch'), 'no mismatch reported');
  assert.ok(found.some((f) => f.kind === 'cfu-numbering-gap'), 'no numbering gap reported');
});

check('the mismatch names the cap a perfect paper hits, because that is the grade', () => {
  const f = g.check(literalShell(range(2, 10), 10)).find((x) => x.kind === 'cfu-denominator-mismatch');
  assert.match(f.detail, /9 graded blocks/);
  assert.match(f.detail, /out of 10/);
  assert.match(f.detail, /90 percent/);
});

check('the numbering gap names the question that is missing, not just that one is', () => {
  const f = g.check(literalShell(range(2, 10), 10)).find((x) => x.kind === 'cfu-numbering-gap');
  assert.match(f.detail, /#1/);
});

check('a gap in the middle is caught, not only a missing first block', () => {
  const f = g.check(declaredShell([1, 2, 4, 5], 4)).find((x) => x.kind === 'cfu-numbering-gap');
  assert.ok(f, 'no gap reported for 1,2,4,5');
  assert.match(f.detail, /#3/);
});

check('a page renumbered into agreement still reports nothing wrong', () => {
  // Nine blocks, numbered 1-9, out of 9. This is what the 1.2 fix looks like if
  // the author renumbers rather than authoring the missing question.
  assert.deepStrictEqual(kinds(literalShell(range(1, 9), 9)), []);
});

check('graded blocks with no readable total are reported, never silently passed', () => {
  const html = `${range(1, 5).map(block).join('\n')}<div>no tracker here</div>`;
  assert.deepStrictEqual(kinds(html), ['cfu-no-denominator']);
});

// ── THE HEALTHY PAGES, WHICH MUST STAY SILENT ────────────────────────────────
check('a literal-total shell that agrees with its blocks passes', () => {
  assert.deepStrictEqual(kinds(literalShell(range(1, 10), 10)), []);
});

check('a declared-total shell that agrees with its blocks passes', () => {
  assert.deepStrictEqual(kinds(declaredShell(range(1, 10), 10)), []);
});

check('a computed total is never failed: it cannot disagree with the question set', () => {
  // Deliberately only three blocks. A literal 10 here would be a mismatch; a
  // computed total is read off the same DOM and is honest by construction.
  assert.strictEqual(g.denominator(dynamicShell(range(1, 3))).source, 'dynamic');
  assert.deepStrictEqual(kinds(dynamicShell(range(1, 3))), []);
});

check('a page with no cfu shell at all is not this gate\'s business', () => {
  assert.deepStrictEqual(kinds('<div class="quiz-opt" id="q1-A">not a cfu page</div>'), []);
});

// ── THE PARSER, IN THE DIRECTIONS THAT HAVE BURNED THIS REPO BEFORE ──────────
check('data-num outside a cfu-block does not inflate the count', () => {
  // The attribute is not reserved to these blocks. Counting it across the page
  // would make a correct page look short by however many strays it carries.
  const html = literalShell(range(1, 10), 10) + '<div class="carousel" data-num="99"></div>';
  assert.strictEqual(g.blocks(html).length, 10);
  assert.deepStrictEqual(kinds(html), []);
});

check('the extra class on the last block does not drop it from the count', () => {
  // The live pages close with class="cfu-block cfu-eol".
  const html = `${range(1, 9).map(block).join('\n')}
    <div class="cfu-block cfu-eol" id="cfu-10" data-num="10"></div>
    <script>function u(){ x.textContent = state.score + ' / 10'; }</script>`;
  assert.strictEqual(g.blocks(html).length, 10);
  assert.deepStrictEqual(kinds(html), []);
});

check('a declared total outranks a stale literal elsewhere on the page', () => {
  // Both appear on unit 3 lesson 3. The declared one is what renders.
  const html = declaredShell(range(1, 8), 8) + `<script>var old = state.score + ' / 10';</script>`;
  const d = g.denominator(html);
  assert.strictEqual(d.value, 8);
  assert.strictEqual(d.source, 'cfuState-total');
  assert.deepStrictEqual(kinds(html), []);
});

check('check() never throws on junk', () => {
  for (const junk of ['', null, undefined, '<div class="cfu-block" data-num="x">']) {
    assert.doesNotThrow(() => g.check(junk));
  }
});

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
