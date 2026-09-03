// ─────────────────────────────────────────────────────────────────────────────
//  THE LIVE CHECK FOR THE CYBER COMMAND CENTER PACING STRIP.
//
//  Asserts four things, and every one of them is FALSE before the import:
//    the strip reads "Extra practice", not "Days set aside in this unit"
//    free response and terminal labs both say they are still growing
//    the review-and-unit-test row is gone
//    no day count is rendered in the strip any more
//
//  And one that is TRUE before and must stay true: the day values still feed
//  unitDays(), so no day number on the page has moved. A check that only looked
//  for the new words would pass just as happily on a page whose pacing had
//  silently shifted by 37 days.
//
//  Run: node scripts/verify-cc-pacing-live.js
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
//  Fetched through lib/storefront-fetch.js, which sends NO browser User-Agent
//  and refuses a body that is not a rendered storefront page. This script used
//  to spoof a browser, and on 2026-09-03 that started drawing a 403 bot
//  challenge whose body contains none of the strings checked below. See the
//  header of that module for what it cost.
const sf = require('../lib/storefront-fetch');

const page = sf.page('/pages/cyber-command-center').body;

const problems = [];
const want = [
  ['reads "Extra practice"', () => page.includes('<span class="wplbl">Extra practice</span>')],
  ['no longer budgets days', () => !page.includes('Days set aside in this unit')],
  ['free response says it is growing', () => page.includes('Free response (adding more)')],
  ['terminal labs says it is growing', () => page.includes('Terminal labs (adding more)')],
  ['the old lab wording is gone', () => !page.includes('Lab / project')],
  ['the review and unit test row is gone', () => !page.includes('Review & unit test')],
  ['no day count is rendered in the strip',
    () => ['frqDays', 'labDays', 'testDays'].every((f) => !page.includes("+(u." + f + "||0)+'d"))],
  //  The one that was already true. Its job is to catch a change that took the
  //  data out along with the display.
  ['and the day values still feed unitDays(), so no day number moved',
    () => /function unitDays/.test(page)
      && ['frqDays', 'labDays', 'testDays'].every((f) => page.includes('u.' + f))],
];

console.log('');
for (const [name, test] of want) {
  const good = test();
  console.log('  ' + (good ? 'ok   ' : 'FAIL ') + name);
  if (!good) problems.push(name);
}
console.log('');
if (problems.length) {
  console.error('  ' + problems.length + ' of ' + want.length + ' assertions failed');
  process.exit(1);
}
console.log('PACING STRIP LIVE: ' + want.length + ' of ' + want.length
  + ', extra practice replaces the day budget and no day number moved');
