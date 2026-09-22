'use strict';
// -----------------------------------------------------------------------------
//  THE APPLIED CHALLENGE CARD OUTSIDE BIG IDEA 3.
//
//  Every CSP lesson page ends in an exercise row whose last card opens that
//  topic's Applied Challenge, the one activity on the page whose answers reach
//  the gradebook. The card states its own length, and on 31 of the 35 live
//  lesson pages it states it like this:
//
//      Applied Challenge<span>undefined questions, and every answer is
//      recorded for your teacher</span>
//
//  ── WHY THIS EXISTS BESIDE verify-csp-bi3-undefined-live.js ─────────────────
//  That script sweeps Big Idea 3's eighteen pages and was written on 2026-09-21
//  believing the defect was a Big Idea 3 problem. It is not. It is a bug in
//  scripts/csp-lesson-exercise-links.js, which built the block on ALL 35 pages,
//  so every topic whose Applied Challenge was live got the same broken card.
//
//  Big Idea 3's fourteen remaining pages already have a sheet waiting to be
//  imported, imports/2026-09-21/csp-bi3-applied-challenge-undefined-fix-remaining.csv.
//  Putting them in a second sheet would mean one page in two files, which is the
//  failure mode splitting is supposed to remove. So this covers the seventeen
//  pages that have no sheet: Big Ideas 1, 2, 4 and 5.
//
//  The card, how its subtitle is read, and the exercise-2 wrapper marker are all
//  IMPORTED from the Big Idea 3 verifier rather than restated here. Two
//  definitions of what the card is would be two opinions about the convention.
//
//  ── WHY THE COUNT IS MEASURED AND NOT ASSUMED ──────────────────────────────
//  A wrong number is worse than "undefined". "undefined" is visibly broken and
//  gets reported by a student; a confident 6 on a 5 question exercise is never
//  looked at again. So each card's own href is fetched and its graded items
//  counted, and a page whose target does not serve is reported rather than
//  given a number.
//
//  Fetched through lib/storefront-fetch.js, which sends NO User-Agent and
//  refuses a body that is not a rendered storefront page.
//
//  Run: node scripts/verify-csp-applied-undefined-live.js [--before] [--json <path>]
//    --before  invert the exit code: pass only while every page still carries
//              the defect, which is what says a generated sheet is current
//              rather than stale. Read the runbook before importing.
//  No em-dashes, per repo convention.
// -----------------------------------------------------------------------------
const fs = require('fs');
const sf = require('../lib/storefront-fetch');
const { CARD, readCount, WRAPPER } = require('./verify-csp-bi3-undefined-live');

//  The seventeen live CSP lesson pages outside Big Idea 3, by Big Idea, in the
//  order the sheets are imported. Labs, quizzes, notes pages and unit tests are
//  not lesson pages and carry no exercise row.
const BY_BIG_IDEA = {
  1: [
    'ap-csp-course-bi1-collaboration',
    'ap-csp-course-bi1-identifying-correcting-errors',
    'ap-csp-course-bi1-program-design-development',
    'ap-csp-course-bi1-program-function-purpose',
  ],
  2: [
    'ap-csp-course-bi2-binary-numbers',
    'ap-csp-course-bi2-data-compression',
    'ap-csp-course-bi2-extracting-information',
    'ap-csp-course-bi2-using-programs-with-data',
  ],
  4: [
    'ap-csp-course-bi4-fault-tolerance',
    'ap-csp-course-bi4-parallel-distributed-computing',
    'ap-csp-course-bi4-the-internet',
  ],
  5: [
    'ap-csp-course-bi5-beneficial-harmful-effects',
    'ap-csp-course-bi5-computing-bias',
    'ap-csp-course-bi5-crowdsourcing',
    'ap-csp-course-bi5-digital-divide',
    'ap-csp-course-bi5-legal-ethical-concerns',
    'ap-csp-course-bi5-safe-computing',
  ],
};

const LESSONS = Object.keys(BY_BIG_IDEA).sort().reduce((a, k) => a.concat(BY_BIG_IDEA[k]), []);

const ITEM = /class="mcq-item"/g;

function check(handle) {
  const r = { handle };
  try {
    const body = sf.page('/pages/' + handle).body;
    const m = body.match(CARD);
    if (!m) { r.state = 'NO_CARD'; return r; }
    r.href = m[1];
    r.span = m[2];
    const c = readCount(m[2]);
    r.kind = c.kind;
    r.stated = c.stated;
    r.state = c.kind === 'undefined' ? 'UNDEFINED' : c.kind === 'number' ? 'OK' : 'UNEXPECTED';
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
  return r;
}

function main() {
  const before = process.argv.includes('--before');
  const jsonAt = process.argv.indexOf('--json');
  const results = [];
  console.log('Checking ' + LESSONS.length + ' CSP lesson pages outside Big Idea 3.\n');
  for (const handle of LESSONS) {
    const r = check(handle);
    results.push(r);
    console.log('  ' + r.state.padEnd(13) + r.handle.padEnd(50) +
      (r.state === 'FETCH_FAILED' ? r.error
        : 'stated=' + (r.stated === null || r.stated === undefined ? 'undefined' : r.stated) +
          ' actual=' + (r.actual === null || r.actual === undefined
            ? (r.target_error ? 'target ' + r.target_error.slice(0, 40) : 'target not serving')
            : r.actual)));
  }
  const bad = results.filter((r) => r.state === 'UNDEFINED');
  const ok = results.filter((r) => r.state === 'OK');
  const other = results.filter((r) => !['UNDEFINED', 'OK'].includes(r.state));
  console.log('\n  fixed ' + ok.length + '   not yet ' + bad.length + '   problem ' + other.length
    + '   of ' + results.length);
  for (const o of other) console.log('    ' + o.state + ': ' + o.handle);

  if (jsonAt > -1 && process.argv[jsonAt + 1]) {
    fs.writeFileSync(process.argv[jsonAt + 1], JSON.stringify({
      checked_at: new Date().toISOString(), total: results.length,
      undefined_count: bad.length, ok: ok.length, results,
    }, null, 2));
    console.log('  wrote ' + process.argv[jsonAt + 1]);
  }

  if (before) {
    //  A sheet is built from the live body it replaces. If a page is already
    //  fixed, the sheet carries a body older than what is published and
    //  importing it MERGES the old one back over the new one. Nothing in the
    //  sheet would say so, which is why this check runs BEFORE the import and
    //  not only after.
    if (bad.length === results.length && !other.length) {
      console.log('\n  All ' + results.length + ' page(s) still carry the defect, so the sheets are current.\n');
      process.exitCode = 0;
    } else {
      console.log('\n  STOP. ' + ok.length + ' page(s) are already fixed and ' + other.length
        + ' could not be read. A sheet built earlier is stale against those pages.'
        + '\n  Regenerate with: node scripts/build-csp-applied-undefined-sheets.js\n');
      process.exitCode = 1;
    }
    return;
  }

  if (!bad.length && !other.length) {
    console.log('\n  All ' + results.length + ' page(s) state a real question count.\n');
  }
  process.exitCode = bad.length || other.length ? 1 : 0;
}

if (require.main === module) main();
module.exports = { BY_BIG_IDEA, LESSONS, check, ITEM };
