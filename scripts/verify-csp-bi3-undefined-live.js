'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE APPLIED CHALLENGE CARD THAT PROMISES "undefined questions".
//
//  Every Big Idea 3 lesson page ends in an exercise row, and the third card
//  opens that topic's Applied Challenge, the one activity on the page whose
//  answers reach the gradebook. The card states its length:
//
//      <a class="ex wide" href="/pages/...-exercise-2">Applied Challenge
//        <span>undefined questions, and every answer is recorded for your
//        teacher</span></a>
//
//  A template variable went in unsubstituted, so the student is told the graded
//  activity has "undefined questions". Four pages were confirmed on 2026-09-21
//  and the other 13 were never fetched. This is that fetch.
//
//  ── WHY THE COUNT IS MEASURED AND NOT ASSUMED ──────────────────────────────
//  The obvious repair is to write 6 everywhere, because the four pages checked
//  by hand all linked six-question exercises. Filling in a number that is wrong
//  is not better than "undefined": it is worse, because nothing later looks at
//  it again. So each card's own href is fetched and its questions counted, and
//  a page whose target does not serve is reported rather than given a number.
//
//  The count comes from the exercise-2 renderer's own markup: id="csp-x2" is
//  the marker only that renderer emits, and class="mcq-item" is one graded
//  item. Counting items without asserting the wrapper would count a themed 404
//  as zero questions and read as a finding.
//
//  Fetched through lib/storefront-fetch.js, which sends NO User-Agent and
//  refuses a body that is not a rendered storefront page.
//
//  Run: node scripts/verify-csp-bi3-undefined-live.js [--json <path>]
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const sf = require('../lib/storefront-fetch');

//  The Big Idea 3 lesson pages. Labs, quizzes and the unit test are not lesson
//  pages and carry no exercise row.
const LESSONS = [
  'algorithmic-efficiency', 'binary-search', 'boolean-expressions', 'calling-procedures',
  'conditionals', 'data-abstraction', 'developing-algorithms', 'developing-procedures',
  'iteration', 'libraries', 'lists', 'mathematical-expressions', 'nested-conditionals',
  'random-values', 'simulations', 'strings', 'undecidable-problems', 'variables',
].map((s) => 'ap-csp-course-bi3-' + s);

const WRAPPER = 'id="csp-x2"';
const ITEM = /class="mcq-item"/g;

//  The Applied Challenge anchor, captured with its href and its subtitle span.
const CARD = /<a class="ex wide"\s+href="([^"]+)"\s*>\s*Applied Challenge\s*<span>([^<]*)<\/span>\s*<\/a>/;

//  What the subtitle says about its own length. A leading integer is a real
//  count; the literal "undefined" is the defect; anything else is unexpected
//  and is reported as such rather than quietly bucketed with either.
function readCount(span) {
  const u = /^undefined\s+questions\b/.test(span);
  const n = span.match(/^(\d+)\s+questions\b/);
  if (u) return { kind: 'undefined', stated: null };
  if (n) return { kind: 'number', stated: Number(n[1]) };
  return { kind: 'unexpected', stated: null };
}

function main() {
  const jsonAt = process.argv.indexOf('--json');
  const results = [];
  console.log('Checking ' + LESSONS.length + ' Big Idea 3 lesson pages for the Applied Challenge card.\n');
  for (const handle of LESSONS) {
    const r = { handle };
    try {
      const body = sf.page('/pages/' + handle).body;
      const m = body.match(CARD);
      if (!m) { r.state = 'NO_CARD'; results.push(r); console.log('  NO_CARD      ' + handle); continue; }
      r.href = m[1];
      r.span = m[2];
      const c = readCount(m[2]);
      r.kind = c.kind;
      r.stated = c.stated;
      r.state = c.kind === 'undefined' ? 'UNDEFINED' : c.kind === 'number' ? 'OK' : 'UNEXPECTED';
      //  Measure the target so a repair has a number it can stand behind.
      try {
        const ex = sf.page(r.href.startsWith('/') ? r.href : '/pages/' + r.href).body;
        r.target_serves = ex.includes(WRAPPER);
        r.actual = r.target_serves ? (ex.match(ITEM) || []).length : null;
      } catch (e) {
        r.target_serves = false;
        r.actual = null;
        r.target_error = e.message;
      }
      if (r.state === 'OK' && r.actual !== null && r.stated !== r.actual) r.state = 'MISMATCH';
    } catch (e) {
      r.state = 'FETCH_FAILED';
      r.error = e.message;
    }
    results.push(r);
    console.log('  ' + r.state.padEnd(13) + r.handle.padEnd(46) +
      (r.state === 'FETCH_FAILED' ? r.error
        : 'stated=' + (r.stated === null ? 'undefined' : r.stated) +
          ' actual=' + (r.actual === null ? (r.target_error ? 'target ' + r.target_error.slice(0, 40) : 'target not serving') : r.actual)));
  }
  const bad = results.filter((r) => r.state === 'UNDEFINED');
  const ok = results.filter((r) => r.state === 'OK');
  const other = results.filter((r) => !['UNDEFINED', 'OK'].includes(r.state));
  console.log('\n  ' + bad.length + ' showing "undefined questions", ' + ok.length + ' stating a correct count, ' +
    other.length + ' other, of ' + results.length + ' pages.');
  for (const o of other) console.log('    ' + o.state + ': ' + o.handle);
  const counts = [...new Set(bad.map((r) => r.actual))];
  if (bad.length) console.log('  Measured question counts on the broken pages: ' + counts.join(', '));
  if (jsonAt > -1 && process.argv[jsonAt + 1]) {
    fs.writeFileSync(process.argv[jsonAt + 1], JSON.stringify({
      checked_at: new Date().toISOString(), total: results.length,
      undefined_count: bad.length, ok: ok.length, results,
    }, null, 2));
    console.log('  wrote ' + process.argv[jsonAt + 1]);
  }
  process.exitCode = bad.length ? 1 : 0;
}

if (require.main === module) main();
module.exports = { LESSONS, CARD, readCount, WRAPPER };
