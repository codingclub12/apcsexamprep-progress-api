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
const block = (n, label, tot) =>
  `<div class="cfu-block" id="cfu-${n}" data-answer="C" data-num="${n}">
     <span class="cfu-counter">Q ${label === undefined ? n : label} of ${tot === undefined ? 10 : tot}</span>
   </div>`;

//  Blocks whose visible labels read 1..N of N, whatever their data-num is.
const relabelled = (nums) => nums.map((n, i) => block(n, i + 1, nums.length)).join('\n');

//  Family A: the total is a literal typed into the tracker.
const literalShell = (nums, total) => `
  ${nums.map((n) => block(n, n, total)).join('\n')}
  <span id="cfu-score-num">0 / ${total}</span>
  <script>
    function updateTracker(){
      var scoreNum = document.getElementById('cfu-score-num');
      if (scoreNum) scoreNum.textContent = state.score + ' / ${total}';
    }
  </script>`;

//  Family B: the total is declared on a state object and rendered from it.
const declaredShell = (nums, total) => `
  ${nums.map((n) => block(n, n, total)).join('\n')}
  <span id="cfu-score-num">0 / ${total}</span>
  <script>
    var cfuState = { score: 0, total: ${total}, answered: {} };
    function updateTracker(){
      document.getElementById('cfu-score-num').textContent = cfuState.score + ' / ' + cfuState.total;
    }
  </script>`;

//  Family C: the grade-all shells. The total is computed from the question set.
const dynamicShell = (nums) => `
  ${nums.map((n, i) => block(n, i + 1, nums.length)).join('\n')}
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
  const html = `${range(1, 5).map((n) => block(n, n, 5)).join('\n')}<div>no tracker here</div>`;
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

// ── WHAT THE STUDENT READS, WHICH IS THE NUMBERING THAT MATTERS ─────────────
check('a data-num gap is NOT reported once the visible labels read 1..N of N', () => {
  // This is the shipped 1.2 fix: labels relabelled to 1..9 of 9, data-num left
  // at 2..10 because seven id families embed it and renumbering breaks widgets.
  // The page is honest to the student, so the gate must be quiet.
  const html = `${relabelled(range(2, 10))}
    <script>function u(){ x.textContent = state.score + ' / 9'; }</script>`;
  assert.deepStrictEqual(kinds(html), []);
});

check('a data-num gap IS still reported when the labels are also wrong', () => {
  // Unrepaired: labels still say "of 10" and skip 1. The gap names the question
  // to go looking for, which is the only time it is useful.
  const found = kinds(literalShell(range(2, 10), 10));
  assert.ok(found.includes('cfu-numbering-gap'), 'gap should fire on an unrepaired page');
});

check('counters that miscount the questions are their own finding', () => {
  // Nine blocks, total correct at 9, but the labels still advertise 10.
  const html = `${range(2, 10).map((n, i) => block(n, i + 1, 10)).join('\n')}
    <script>function u(){ x.textContent = state.score + ' / 9'; }</script>`;
  assert.ok(kinds(html).includes('cfu-counter-mismatch'));
});

check('a page that labels NO questions is silent, not wrong', () => {
  // Several cyber lessons carry no per-question counters at all. Nothing is
  // claimed, so nothing can be misleading, and the grade is still covered by the
  // denominator check. Firing here reported 12 healthy pages as defective.
  const html = `${range(1, 5).map((n) => `<div class="cfu-block" data-num="${n}"></div>`).join('')}
    <script>function u(){ x.textContent = state.score + ' / 5'; }</script>`;
  assert.deepStrictEqual(kinds(html), []);
});

check('the n / N counter shape is read, not just Q n of N', () => {
  // Unit 3 lessons write "1 / 13" where unit 1 and 2 write "Q 1 of 13".
  const shape = (n, tot) => `<div class="cfu-block" data-num="${n}">`
    + `<span class="cfu-counter">${n} / ${tot}</span></div>`;
  const good = `${range(1, 3).map((n) => shape(n, 3)).join('')}`
    + `<script>function u(){ x.textContent = state.score + ' / 3'; }</script>`;
  assert.strictEqual(g.counters(good).length, 3);
  assert.deepStrictEqual(kinds(good), []);

  // The real ap-cyber-unit-3-lesson-1 defect: 10 blocks, every label says 13.
  const bad = `${range(1, 10).map((n) => shape(n, 13)).join('')}`
    + `<script>function u(){ x.textContent = state.score + ' / 10'; }</script>`;
  assert.ok(kinds(bad).includes('cfu-counter-mismatch'));
});

check('a bare n / N outside a cfu-counter span is not read as a label', () => {
  // "3 / 4" is far too common in prose and markup to match globally.
  const html = `${range(1, 3).map((n) => `<div class="cfu-block" data-num="${n}">`
    + `<span class="cfu-counter">Q ${n} of 3</span></div>`).join('')}`
    + `<p>You scored 2 / 5 on the warm up.</p>`
    + `<script>function u(){ x.textContent = state.score + ' / 3'; }</script>`;
  assert.strictEqual(g.counters(html).length, 3);
  assert.deepStrictEqual(kinds(html), []);
});

check('displayCoherent is exact about repeats and gaps in the labels', () => {
  const dup = `${[1, 2, 3].map((n) => block(n, 1, 3)).join('')}`;   // all say "Q 1 of 3"
  assert.strictEqual(g.displayCoherent(dup, 3), false);
  assert.strictEqual(g.displayCoherent(relabelled(range(2, 10)), 9), true);
  assert.strictEqual(g.counters(relabelled(range(2, 10))).length, 9);
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
  const html = `${range(1, 9).map((n) => block(n, n, 10)).join('\n')}
    <div class="cfu-block cfu-eol" id="cfu-10" data-num="10"><span class="cfu-counter">Q 10 of 10</span></div>
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

// ── COMMENTS ARE NOT CODE ────────────────────────────────────────────────────
//  These parse the RENDERED page, which carries theme chrome. The grade
//  reporter's own header comment quotes this defect verbatim, including the
//  literal `state.score + ' / 10'`, and it renders on every cyber lesson page.
//  Reading it as the page's total made this gate emit a FALSE P0.
const REPORTER_COMMENT = `
    //  The printed total is a number an author typed next to the questions, and
    //  nothing on the page compares the two. Measured 2026-08-31 on
    //  ap-cybersecurity-unit-1-password-attacks (lesson 1.2): the tracker reads
    //  \`state.score + ' / 10'\` while the page serves NINE blocks, numbered 2
    //  through 10, with no cfu-1 anywhere in the body.
    //  See https://www.apcsexamprep.com/pages/ap-cybersecurity-unit-1-password-attacks`;

check('REGRESSION: a quoted total in a comment is not read as the page total', () => {
  // Three blocks, correctly labelled, no tracker of their own. Before this was
  // fixed the gate read 10 out of the comment and reported "a perfect paper
  // scores 30 percent" on a page that has no denominator at all.
  const html = `${[1, 2, 3].map((n) => block(n, n, 3)).join('')}${REPORTER_COMMENT}`;
  assert.strictEqual(g.denominator(html).value, null);
  assert.deepStrictEqual(kinds(html), ['cfu-no-denominator']);
});

check('the page own total still wins when the comment sits after it', () => {
  // The live 1.2 shape after the label import: real tracker says 9, the
  // reporter comment further down still quotes 10.
  const html = `${relabelled(range(2, 10))}
    <script>function u(){ x.textContent = state.score + ' / 9'; }</script>${REPORTER_COMMENT}`;
  assert.strictEqual(g.denominator(html).value, 9);
  assert.deepStrictEqual(kinds(html), []);
});

check('a commented-out block does not inflate the block count', () => {
  const html = `${[1, 2].map((n) => block(n, n, 2)).join('')}
    <!-- <div class="cfu-block" data-num="3"></div> -->
    <script>function u(){ x.textContent = state.score + ' / 2'; }</script>`;
  assert.strictEqual(g.blocks(html).length, 2);
  assert.deepStrictEqual(kinds(html), []);
});

check('stripComments leaves a URL alone', () => {
  assert.match(g.stripComments('see https://apcsexamprep.com/pages/x'), /https:\/\//);
});

check('check() never throws on junk', () => {
  for (const junk of ['', null, undefined, '<div class="cfu-block" data-num="x">']) {
    assert.doesNotThrow(() => g.check(junk));
  }
});

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
