#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  THE EK COVERAGE TABLE IS A TEACHER ARTIFACT AND MUST SURVIVE THINNING.
//
//  Every AP Cyber lesson page carries a collapsed "Essential Knowledge Coverage"
//  table: the crosswalk a teacher opens to audit that the lesson covers the CED.
//  lib/cyber-ek-thin.js strips EK codes out of student-visible prose, and this
//  table is the main thing it must NOT touch.
//
//  WHY THIS EXISTS
//  Two ways that guarantee was not actually held, both found on 2026-08-27
//  while preparing to reuse the thinner on Topic 1.4:
//
//  1. lib/cyber-ek-density.js located the table by the literal string
//     id="ek11-body". The id carries the topic number, so on 1.2, 1.3, 1.4 and
//     1.5 the table was simply not found and therefore not protected. Nothing
//     reported this: the summary showed zero citations kept under that label,
//     which is indistinguishable from a page that has no coverage table.
//
//  2. thin() step 2 ran its table-column rules GLOBALLY, outside the protection
//     mechanism entirely. One of them deletes any row-final <td> that opens
//     with an EK code. It happened never to fire inside a coverage table,
//     because the pages in hand put the code in a first cell carrying
//     class="term". That is luck of markup, not a guarantee.
//
//  Neither defect had corrupted a live page. Both would have, on the next page
//  whose coverage table was shaped slightly differently. The fixture in case 3
//  is that page.
//
//  Offline: no network, no secrets, no database.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const ek = require('../lib/cyber-ek-density');
const { thin } = require('../lib/cyber-ek-thin');

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ok    ${name}`);
  } catch (e) {
    failures++;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${e.message.split('\n')[0]}`);
  }
}

//  A coverage table shaped like the live ones, parameterised by topic number
//  and by which cell holds the code.
function fixture(topic, { codeCellLast = false } = {}) {
  const n = topic.replace('.', '');
  const codes = [`${topic}.A.1`, `${topic}.A.2`, `${topic}.B.1`];
  const rows = codes.map((c) => (codeCellLast
    ? `<tr>\n<td class="term">Some essential knowledge statement</td>\n<td>${c}</td>\n</tr>`
    : `<tr>\n<td class="term">${c} Some essential knowledge statement</td>\n<td>Covered In</td>\n</tr>`)).join('\n');
  return `<div class="card">
<h3>Topic ${topic} &mdash; What Is Testable</h3>
<div id="ek${n}-body" style="display:none!important;">
<table class="vocab-table">
<thead><tr>\n<th>CED Ref</th>\n<th>Essential Knowledge</th>\n</tr></thead>
<tbody>
${rows}
</tbody>
</table>
</div>
</div>
<p>A student reads that intimidation (${topic}.A.1) is a named tactic.</p>`;
}

const CODES = (s) => (s.match(/\b\d\.\d\.[A-C](?:\.\d)?\b/g) || []);
function coverageTableOf(body) {
  const m = /id="(ek\d+-body)"/.exec(body);
  if (!m) return null;
  const t = body.indexOf('<table', m.index);
  const e = body.indexOf('</table>', t);
  return t < 0 || e < 0 ? null : body.slice(t, e);
}

console.log('EK coverage table protection\n');

// ---- 1. every topic's table is found, not just 1.1 --------------------------
for (const topic of ['1.1', '1.2', '1.3', '1.4', '1.5']) {
  check(`topic ${topic}: coverage table is located and protected`, () => {
    const body = fixture(topic);
    const { spans, unbalanced } = ek.protectedSpans(body);
    assert.strictEqual(unbalanced.length, 0, `unbalanced blocks: ${unbalanced.join(', ')}`);
    const cov = spans.filter((s) => s.label === 'EK coverage table');
    assert.strictEqual(cov.length, 1, `expected 1 coverage-table span, got ${cov.length}`);
    const kept = ek.citations(body).citations.filter((c) => c.protectedBy === 'EK coverage table');
    assert.strictEqual(kept.length, 3, `expected 3 protected citations, got ${kept.length}`);
  });
}

// ---- 2. and its codes survive the transform ---------------------------------
for (const topic of ['1.1', '1.2', '1.3', '1.4', '1.5']) {
  check(`topic ${topic}: crosswalk codes survive thin()`, () => {
    const body = fixture(topic);
    const before = CODES(coverageTableOf(body));
    const after = CODES(coverageTableOf(thin(body)) || '');
    assert.deepStrictEqual(after, before,
      `crosswalk changed: ${before.join(' ')} -> ${after.join(' ') || '(all stripped)'}`);
  });
}

// ---- 3. the shape that step 2 would have eaten ------------------------------
//  A coverage table whose code sits in a row-final bare <td>. Before step 2 was
//  moved inside outsideProtected, this lost every crosswalk row silently.
check('a code in a row-final <td> is still protected from the column stripper', () => {
  const body = fixture('1.4', { codeCellLast: true });
  const before = CODES(coverageTableOf(body));
  assert.strictEqual(before.length, 3, 'fixture is wrong, expected 3 codes');
  const out = thin(body);
  const after = CODES(coverageTableOf(out) || '');
  assert.deepStrictEqual(after, before,
    `the column stripper reached into the coverage table: ${before.join(' ')} -> ${after.join(' ') || '(all stripped)'}`);
  assert.ok(/<tr>/.test(coverageTableOf(out)), 'coverage table rows were deleted');
});

// ---- 4. the decorative citation outside the table still goes ----------------
//  Scoped to a PARENTHETICAL citation on purpose. The thinner does not delete
//  bare inline codes from arbitrary prose and should not: blind deletion is what
//  produced "A birthdate applies." on the first attempt at 1.1. Every other
//  removal is a rule authored against a sentence someone read. So this asserts
//  the one generic behaviour, and asserts it OUTSIDE the protected span, which
//  is the half that proves protection is scoped rather than global.
check('a parenthetical citation outside the table is still removed', () => {
  const body = fixture('1.4');
  const out = thin(body);
  const tail = out.slice(out.indexOf('</table>'));
  assert.ok(!/\(1\.4\.A\.1\)/.test(tail),
    'the decorative parenthetical survived, so the thinner is doing nothing');
  assert.ok(/intimidation is a named tactic/.test(tail),
    `the sentence did not survive intact: ${(/\<p\>[^<]*/.exec(tail) || ['?'])[0]}`);
});

// ---- 5. the real page, if its snapshot is committed --------------------------
const snap = path.join(__dirname, '..', 'shopify', 'page-snapshots',
  'ap-cybersecurity-unit-1-ai-driven-threats.before-ced-realignment.html');
if (fs.existsSync(snap)) {
  check('live 1.4 snapshot: all ten crosswalk codes survive thin()', () => {
    const body = fs.readFileSync(snap, 'utf8');
    const before = CODES(coverageTableOf(body));
    assert.strictEqual(before.length, 10, `expected 10 codes in the crosswalk, got ${before.length}`);
    const after = CODES(coverageTableOf(thin(body)) || '');
    assert.deepStrictEqual(after, before, 'the live crosswalk did not survive');
  });
  check('live 1.4 snapshot: the coverage table is what protects them', () => {
    const body = fs.readFileSync(snap, 'utf8');
    const kept = ek.citations(body).citations.filter((c) => c.protectedBy === 'EK coverage table');
    assert.strictEqual(kept.length, 10,
      `expected the coverage table to protect 10 citations, it protects ${kept.length}`);
  });
} else {
  console.log('  skip  live 1.4 snapshot not present');
}

console.log('');
if (failures) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log('all checks passed');
