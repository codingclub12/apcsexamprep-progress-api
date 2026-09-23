'use strict';
// -----------------------------------------------------------------------------
//  LIVE CHECK: are the Part A logs on the 2.3, 5.3 and 5.6 Exercise 1 pages?
//
//  Board 397. Each page's Part B cites rows of the handout's Part A log by
//  number, and the page showed no log. Sheets:
//    imports/2026-09-23/csp-2-3-exercise-1-log-pages.csv
//    imports/2026-09-23/csp-5-3-exercise-1-log-pages.csv
//    imports/2026-09-23/csp-5-6-exercise-1-log-pages.csv
//  Steps 6 to 8 of imports/2026-09-23/RUNBOOK.md. 1.2 has its own check,
//  scripts/verify-csp-1-2-log-live.js.
//
//  Per page it asserts: the body is the real page (the Part B heading is there,
//  fetched through lib/storefront-fetch.js page(), which refuses a challenge
//  body); exactly one log table, above Part B; rows 1 to 5; and the log heading
//  from the handout. A page that fails the real-page test gets no verdict.
//
//  Run:
//    node scripts/verify-csp-exercise-1-logs-live.js --before   exit 0 if all three still lack the log
//    node scripts/verify-csp-exercise-1-logs-live.js            exit 0 if all three show it
//    add a handle to check just that page, e.g. ap-csp-topic-5-3-exercise-1
// -----------------------------------------------------------------------------

const sf = require('../lib/storefront-fetch');
const { SOURCE } = require('../lib/csp-exercise-pages');

const ALL = ['ap-csp-topic-2-3-exercise-1', 'ap-csp-topic-5-3-exercise-1', 'ap-csp-topic-5-6-exercise-1'];
const BEFORE = process.argv.includes('--before');
const picked = process.argv.slice(2).filter((a) => ALL.includes(a));
const handles = picked.length ? picked : ALL;

let fixed = 0;
let missing = 0;
let unknown = 0;
for (const h of handles) {
  let body = '';
  try {
    body = String((sf.page('/pages/' + h) || {}).body || '');
  } catch (e) {
    console.log(`  NO VERDICT  ${h}  fetch refused: ${e && e.message}`);
    unknown++;
    continue;
  }
  const partB = body.indexOf('Part B, from your handout');
  if (partB === -1) {
    console.log(`  NO VERDICT  ${h}  answered without its Part B heading`);
    unknown++;
    continue;
  }
  const heading = SOURCE[h].log.heading;
  const tables = (body.match(/<table class="log">/g) || []).length;
  const at = body.indexOf('<table class="log">');
  const ids = [...body.matchAll(/<td class="row-id">(\d+)<\/td>/g)].map((m) => m[1]).join(',');
  const ok = tables === 1 && at < partB && ids === '1,2,3,4,5' && body.includes(heading);
  if (ok) {
    fixed++;
    console.log(`  LOG LIVE    ${h}`);
  } else if (tables === 0) {
    missing++;
    console.log(`  NO LOG      ${h}`);
  } else {
    unknown++;
    console.log(`  WRONG       ${h}  tables=${tables} rows=${ids || '-'} heading=${body.includes(heading)}`);
  }
}

console.log(`\n${fixed} with the log, ${missing} without, ${unknown} unclear, of ${handles.length}.`);
if (BEFORE) {
  console.log(missing === handles.length
    ? 'Every page still lacks its log, so the sheets are current.'
    : 'Not every page lacks its log. Do not import a sheet for a page that already has one.');
  process.exit(missing === handles.length ? 0 : 1);
}
process.exit(fixed === handles.length ? 0 : 1);
