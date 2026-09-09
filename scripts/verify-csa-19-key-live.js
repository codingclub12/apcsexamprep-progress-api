'use strict';
// -----------------------------------------------------------------------------
//  POST-IMPORT CHECK FOR THE 1.9-cfu-1 KEY REPAIR.
//
//  Run AFTER the sheet is imported. Every assertion below is FALSE before the
//  import and true after it, which is the whole requirement: a check that would
//  have passed yesterday is decoration.
//
//  IT ASKS THE QUESTION THAT MATTERS, not the one that is easy to see. "Is the
//  padding gone" on its own would pass on a page whose whole exercise section
//  had been deleted, which is a plausible outcome of a bad MERGE and a far worse
//  one than the bug. So it also asks whether all six graded items are still
//  there and whether the other five keys still read what they read before.
//
//  Fetches through lib/storefront-fetch.js and sends no User-Agent. The bot
//  management has flipped twice in a week and a challenge body would make every
//  "this string is gone now" assertion pass, which is precisely the false
//  all-clear this file must not produce.
//
//    node scripts/verify-csa-19-key-live.js
// -----------------------------------------------------------------------------
const fs = require('fs');
const sf = require('../lib/storefront-fetch');
const leak = require('../lib/answer-leak');
const gen = require('./csa-19-cfu1-key-repair-csv.js');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  ok    ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (x === undefined ? '' : '  -> ' + JSON.stringify(x))); }
};

const before = JSON.parse(fs.readFileSync(gen.SNAP, 'utf8'))[gen.HANDLE];
const keysBefore = leak.findings(before).filter((f) => f.channel === 'attribute')
  .map((f) => String(f.disclosed).trim());
const itemsBefore = [...new Set(leak.findings(before).map((f) => f.item_id).filter(Boolean))].sort();

const page = sf.pageBody(gen.HANDLE);
const live = page.body_html;
const f = leak.findings(live);
const keysNow = f.filter((x) => x.channel === 'attribute').map((x) => String(x.disclosed).trim());
const itemsNow = [...new Set(f.map((x) => x.item_id).filter(Boolean))].sort();

console.log('\nCSA 1.9 KEY REPAIR, live check');
console.log(gen.HANDLE + ': ' + live.length + ' bytes, updated_at ' + page.updated_at);
console.log('baseline was ' + before.length + ' bytes\n');

//  The repair itself. False before the import by construction.
ok('1 no padded key remains anywhere on the page',
  f.filter((x) => x.padded).length === 0, f.filter((x) => x.padded).map((x) => x.item_id));
ok('2 ' + gen.ITEM + ' reads exactly C',
  f.some((x) => x.item_id === gen.ITEM && x.disclosed === 'C'),
  f.filter((x) => x.item_id === gen.ITEM).map((x) => x.disclosed));

//  The MERGE did not take anything with it. These were TRUE before as well, and
//  they are here because the failure they catch is worse than the bug.
ok('3 all six graded items survive', itemsNow.length === 6 && itemsNow.join() === itemsBefore.join(),
  { before: itemsBefore, now: itemsNow });
ok('4 the key set is unchanged apart from the trim',
  keysNow.join('|') === keysBefore.join('|'), { before: keysBefore, now: keysNow });
ok('5 the page did not shrink unexpectedly',
  live.length >= before.length - 200, { before: before.length, now: live.length });

//  Shopify reformats HTML on save, so an exact byte match is NOT expected and
//  asserting one would fail on a correct import. Ask instead whether the grader
//  the bug lived in is still wired up.
ok('6 the MCQ grader is still on the page',
  live.includes("ex.getAttribute('data-answer')") && live.includes('chosen === correct'));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) console.log('\nThe import did not land as intended. imports/2026-09-09/csa-19-live-body.json\n'
  + 'holds the pre-import body if a restore is needed.\n');
process.exit(fail ? 1 : 0);
