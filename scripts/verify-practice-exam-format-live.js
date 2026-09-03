#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  LIVE check for board 171, to be run AFTER the sheet is imported.
//
//  Every assertion here is FALSE before the import and true only after it, which
//  is the property the gate's own first manifest lacked when it asserted
//  "status":"ok" from /api/health and verified nothing while reading like proof.
//
//  Fetched through lib/storefront-fetch.js with NO User-Agent. Bot management
//  inverted on 2026-09-03: a spoofed browser UA gets a challenge page, and every
//  assertion of the shape "this string is GONE" passes vacuously on it. Half the
//  assertions below are of exactly that shape, so this would be the failure mode.
//  page() refuses a body it cannot prove is the real page.
// -----------------------------------------------------------------------------
const SF = require('../lib/storefront-fetch');
const C = require('../lib/site-crawl');

const PATH = '/pages/ap-cybersecurity-practice-exam';
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 160) : '')); } };

const r = SF.page(PATH);            // throws unless this is provably the real page
const html = r.body;
const text = C.visibleText(html);
const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';

console.log('\nWas FALSE before the import, must be true after');
ok('the tab title no longer sells 40 + 3 as the exam', !/40 MCQ \+ 3 Free Response/.test(title), title);
ok('the tab title says Practice Set', /Practice Set/.test(title), title);
ok('the H1 says Practice Set', /<h1[^>]*>\s*AP Cybersecurity Practice Set\s*<\/h1>/.test(html));
ok('no full-length claim anywhere in the source', !/full[ -]?length/i.test(html));
ok('the real shape is stated above the fold',
  text.includes('the real exam is 60 multiple choice questions and one free-response question'));
ok('the schema headline was corrected', !/"headline": "AP Cybersecurity Practice Exam/.test(html));

console.log('\nUnchanged, because this was a relabel and board 176 owns the rebuild');
ok('43 question cards still served', (html.match(/class="pq-card"/g) || []).length === 43,
  (html.match(/class="pq-card"/g) || []).length);
ok('160 options still served', (html.match(/class="pq-opt"/g) || []).length === 160);
ok('the existing format note survived',
  text.includes('deliberately shaped for study rather than as a replica'));

console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
process.exit(fail ? 1 : 0);
