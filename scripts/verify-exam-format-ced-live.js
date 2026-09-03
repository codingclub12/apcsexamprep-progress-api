#!/usr/bin/env node
'use strict';
// LIVE check for board 195, run AFTER the sheet is imported. Every assertion
// here is false before the import. Fetched with NO User-Agent through
// lib/storefront-fetch.js, which refuses a body it cannot prove is the page:
// most of these are "this string is now present", which fail on a challenge
// body, but the first is "this string is gone", which would pass vacuously.
const SF = require('../lib/storefront-fetch');
const C = require('../lib/site-crawl');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  [PASS] ' + n); } else { fail++; console.log('  [FAIL] ' + n); } };

const html = SF.page('/pages/ap-cybersecurity-exam-format').body;
const text = C.visibleText(html);

console.log('\nWas FALSE before the import');
ok('the page no longer says the format is unreleased', !/has not yet released/i.test(text));
ok('it states 60 multiple choice questions', text.includes('60 multiple choice questions'));
ok('it states 80 minutes', text.includes('80 minutes'));
ok('it states 50 minutes', text.includes('50 minutes'));
ok('it names Device Security Analysis', text.includes('Device Security Analysis'));
ok('it prints the 25 to 40% per-category band', text.includes('25 to 40% each'));

console.log('\nMust never be true');
ok('no per-unit exam weighting', !/Unit\s*[1-5][^.]{0,40}?\d{1,2}\s*%/i.test(text));

console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
process.exit(fail ? 1 : 0);
