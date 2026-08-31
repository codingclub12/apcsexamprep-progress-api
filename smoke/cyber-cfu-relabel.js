#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  lib/cyber-cfu-relabel.js, proven before it is allowed near a live page.
//
//  This edits a 276KB lesson body that real students sit, so the bar is not
//  "the output looks right". The whole safety argument of this transform is that
//  it touches ONLY display text, so most of what is pinned below is the list of
//  things it must leave alone: every id family, every handler, the unit nav, the
//  sequence step order, and the CSS that carries digits in parentheses.
//
//  Offline: no network, no secrets, no browser.
//
//  Run: npm run smoke:cyberrelabel
// -----------------------------------------------------------------------------

const assert = require('assert');
const r = require('../lib/cyber-cfu-relabel');
const gate = require('../lib/cyber-denominator-gate');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log(`  ok    ${name}`); }
  catch (e) { failures++; console.log(`  FAIL  ${name}`); console.log(`        ${e.message.split('\n')[0]}`); }
}

//  A block carrying every id family the real page uses, so "untouched" is a
//  claim with something behind it.
const block = (n) => `
  <div class="cfu-block" id="cfu-${n}" data-answer="C" data-num="${n}">
    <span class="cfu-counter">Q ${n} of 10</span>
    <div id="cfu-${n}-opts" style="background:rgba(255,255,255,.2);grid-template-columns:repeat(3,1fr);"></div>
    <div id="mr-${n}-1"></div><div id="ms-${n}-1"></div>
    <div id="dtb-${n}-bank"></div><div id="dtb-blank-${n}-A"></div><div id="dtb-chip-${n}-1"></div>
    <div id="seq-${n}-list"><div id="seq-${n}-item-A" data-step-id="3"></div></div>
    <div id="cr-${n}-text"></div><div id="cr-${n}-count"></div>
    <button id="cfu-${n}-btn" onclick="cfuSubmit(${n})">Check</button>
    <div id="cfu-${n}-feedback"><span id="cfu-${n}-verdict"></span></div>
  </div>`;

//  The unit navigation. Its numbers are LESSONS 1.1 to 1.5, not questions.
const NAV = `
  <a onclick="ucnToggle(1);" id="ucn-l1">1.1</a><span id="ucn-s1"></span>
  <a onclick="ucnToggle(2);" id="ucn-l2">1.2</a><span id="ucn-s2"></span>
  <a onclick="ucnToggle(5);" id="ucn-l5">1.5</a><span id="ucn-s5"></span>`;

const page = (nums, printed) => `${NAV}
  <span id="cfu-score-num">0 / ${printed}</span>
  ${nums.map(block).join('\n')}
  <div id="ek12-body"></div>
  <script>
    function updateTracker(){
      document.getElementById('cfu-score-num').textContent = state.score + ' / ${printed}';
    }
  </script>`;

const range = (a, b) => { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; };
const count = (h, re) => (h.match(re) || []).length;
const live = page(range(2, 10), 10);

console.log('cyber cfu relabel');

// ── WHAT IT FIXES ────────────────────────────────────────────────────────────
check('the 1.2 shape: counters become 1..9 of 9', () => {
  const out = r.apply(live).html;
  assert.deepStrictEqual(
    [...out.matchAll(/Q (\d+) of (\d+)/g)].map((m) => `${m[1]}/${m[2]}`),
    range(1, 9).map((n) => `${n}/9`));
});

check('the printed total becomes 9, in the tracker and the initial span', () => {
  const out = r.apply(live).html;
  assert.strictEqual(gate.denominator(out).value, 9);
  assert.strictEqual(count(out, /of 10/g), 0);
  assert.strictEqual(count(out, /score \+ ' \/ 9'/g), 1);
  assert.strictEqual(count(out, />0 \/ 9</g), 1);
});

check('THE POINT: the gate is clean on the output', () => {
  assert.notDeepStrictEqual(gate.check(live).map((f) => f.kind), []);
  assert.deepStrictEqual(gate.check(r.apply(live).html), []);
});

// ── WHAT IT MUST NOT TOUCH ───────────────────────────────────────────────────
check('not one id changes, in any of the seven families', () => {
  const out = r.apply(live).html;
  const ids = (s) => (s.match(/id="[^"]*"/g) || []).join('|');
  assert.strictEqual(ids(out), ids(live), 'an id was rewritten');
});

check('data-num is untouched: still 2 through 10', () => {
  const out = r.apply(live).html;
  assert.deepStrictEqual(gate.blocks(out).filter((n) => n != null).sort((a, b) => a - b), range(2, 10));
});

check('every handler keeps its original number', () => {
  const out = r.apply(live).html;
  assert.deepStrictEqual([...out.matchAll(/cfuSubmit\((\d+)\)/g)].map((m) => m[1]), range(2, 10).map(String));
});

check('REGRESSION: the unit nav is untouched, it is lessons not questions', () => {
  const out = r.apply(live).html;
  assert.deepStrictEqual([...out.matchAll(/ucnToggle\((\d+)\)/g)].map((m) => m[1]), ['1', '2', '5']);
  for (const id of ['ucn-l1', 'ucn-l2', 'ucn-l5', 'ucn-s1', 'ucn-s5']) assert.ok(out.includes(`id="${id}"`));
});

check('data-step-id is untouched: it is the answer order, not a question number', () => {
  assert.strictEqual(count(r.apply(live).html, /data-step-id="3"/g), 9);
});

check('CSS with digits in parentheses is untouched', () => {
  const out = r.apply(live).html;
  assert.strictEqual(count(out, /rgba\(255,255,255,\.2\)/g), 9);
  assert.strictEqual(count(out, /repeat\(3,1fr\)/g), 9);
});

check('the answer key is carried, never rewritten', () => {
  assert.strictEqual(count(r.apply(live).html, /data-answer="C"/g), 9);
});

check('only display text differs: the diff is counters and totals and nothing else', () => {
  const out = r.apply(live).html;
  const strip = (s) => s.replace(/Q \d+ of \d+/g, 'Q# of#').replace(/\/ \d+'/g, "/#'").replace(/>0 \/ \d+</g, '>0 /#<');
  assert.strictEqual(strip(out), strip(live), 'something outside the display text changed');
  assert.deepStrictEqual(r.apply(live).changes, { counters: 9, totals: 2 });
});

// ── DO NOTHING WHEN NOTHING IS WRONG ─────────────────────────────────────────
check('an honest page is returned byte identical', () => {
  const healthy = page(range(1, 10), 10);
  const res = r.apply(healthy);
  assert.strictEqual(res.plan, null);
  assert.strictEqual(res.html, healthy);
});

check('a page with no cfu shell is left alone', () => {
  const other = '<div class="quiz-opt" id="q1-A" style="color:rgba(1,2,3,.4)">Q 4 of 9</div>';
  assert.strictEqual(r.apply(other).html, other);
});

check('apply() never throws on junk', () => {
  for (const junk of ['', null, undefined, '<div class="cfu-block" data-num="x">']) {
    assert.doesNotThrow(() => r.apply(junk == null ? '' : junk));
  }
});

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
