'use strict';
// -----------------------------------------------------------------------------
//  LIVE CHECK: is the LunchDash Log on /pages/ap-csp-topic-1-2-exercise-1?
//
//  Board 393, report esc_75eed3a1756556a978585f39. The page asks six graded
//  questions about the Part A log from the student handout and used to show no
//  log at all. The import sheet is imports/2026-09-23/csp-1-2-exercise-1-log-pages.csv,
//  step 5 of imports/2026-09-23/RUNBOOK.md.
//
//  It asserts what matters, not what is easy to see:
//    - the body is the real page: the Part B heading is there. Fetched through
//      lib/storefront-fetch.js page(), which refuses a challenge body, so "no
//      log" can never pass because the fetch quietly failed.
//    - exactly one log table, with rows 1 to 5, above the Part B heading.
//    - the graded check still paints its six questions, so the import did not
//      swap the page for something smaller.
//    - no EK badge, so this sheet did not bring back what step 2 removed.
//
//  Run:
//    node scripts/verify-csp-1-2-log-live.js --before   expects the defect (exit 0 if still there)
//    node scripts/verify-csp-1-2-log-live.js            expects the fix    (exit 0 if live)
// -----------------------------------------------------------------------------

const sf = require('../lib/storefront-fetch');

const PATH = '/pages/ap-csp-topic-1-2-exercise-1';
const BEFORE = process.argv.includes('--before');

let r;
try {
  r = sf.page(PATH);
} catch (e) {
  console.error(`FETCH REFUSED  ${PATH}  ${e && e.message}`);
  process.exit(2);
}
const body = String((r && r.body) || '');
const partB = body.indexOf('Part B, from your handout');
if (partB === -1) {
  console.error(`NOT THE PAGE  ${PATH} answered without its Part B heading; no verdict.`);
  process.exit(2);
}

const tables = (body.match(/<table class="log">/g) || []).length;
const logAt = body.indexOf('<table class="log">');
const rowIds = [...body.matchAll(/<td class="row-id">(\d+)<\/td>/g)].map((m) => m[1]).join(',');
const questions = (body.match(/class="mcq-item"/g) || []).length;
const badges = (body.match(/<span class="ek">/g) || []).length;

const fixed = tables === 1 && logAt < partB && rowIds === '1,2,3,4,5' && questions === 6 && badges === 0;

console.log(`  log tables        ${tables}   (want 1)`);
console.log(`  above Part B      ${tables ? logAt < partB : '-'}`);
console.log(`  row ids           ${rowIds || '-'}   (want 1,2,3,4,5)`);
console.log(`  graded questions  ${questions}   (want 6)`);
console.log(`  EK badges         ${badges}   (want 0)`);

if (BEFORE) {
  const defect = tables === 0;
  console.log(defect
    ? '\nThe log is still missing, so the sheet is current. Import it.'
    : '\nThe page ALREADY carries a log table. Do not import this sheet; find out what put it there first.');
  process.exit(defect ? 0 : 1);
}
console.log(fixed ? '\nLIVE: the log is on the page and nothing else regressed.' : '\nNOT FIXED on the live page.');
process.exit(fixed ? 0 : 1);
