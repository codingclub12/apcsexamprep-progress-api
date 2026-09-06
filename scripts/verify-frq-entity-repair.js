'use strict';
// ---------------------------------------------------------------------------
//  THE CHECK THAT SHOULD HAVE RUN THE FIRST TIME.
//
//      node scripts/verify-frq-entity-repair.js
//
//  The live leg of deploy-gates/2026-09-06-frq-item-id-sheet.json asserted two
//  things: zero data-item-id, and data-lesson-id still present. Both were true
//  on a page whose phishing address had just been destroyed, so it printed
//  LIVE CLEAN and the gate reported four kinds agreeing. A marker check cannot
//  see damage it was not told to look for, and a body rewrite can damage
//  anything.
//
//  So this compares the WHOLE stored body against the whole predicted body,
//  byte for byte, and prints the diff when they part. The prediction is
//  committed beside the sheet before the import, which is what makes it a
//  prediction rather than a description.
//
//  ---- AND IT MUST NOT CALL A CACHE A FAILURE -------------------------------
//  The first cut of this file did exactly that. /pages/<handle>.json comes
//  through Shopify's page cache and lagged the real import by about a minute on
//  2026-09-06, serving the pre-import body AND the pre-import updated_at
//  together, so the timestamp confirmed the stale body instead of exposing it.
//  This reported a successful import as 5 failures and the operator re-imported
//  on that advice.
//
//  A disagreement now has to say WHICH it is. The rendered page has a different
//  cache, so it is the freshness authority: if the json is behind it, this exits
//  STALE (code 2) and says to wait, rather than FAILED (code 1). Cloudflare
//  rewrites the address in the rendered copy, so the comparison goes through
//  decodeCfEmails rather than a substring search that could only ever say
//  "absent".
//
//  Pure ASCII source, no em-dashes, per repo convention.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sf = require('../lib/storefront-fetch.js');

const HANDLE = 'ap-cyber-unit-1-frq-practice';
const PRED = path.join(__dirname, '..', 'imports', '2026-09-06',
  'cyber-unit1-frq-entity-repair-pages.predicted.json');
const ADDRESS = 'helpdesk@rivertonl1b.org';

const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

function main() {
  const predicted = JSON.parse(fs.readFileSync(PRED, 'utf8'))[HANDLE];
  const live = sf.pageBody(HANDLE).body_html;

  //  Freshness first, and from a cache that is not this one. If the rendered
  //  page already carries the address the json says is missing, the json is
  //  behind and nothing below it is worth reporting.
  if (live !== predicted) {
    const rendered = sf.page('/pages/' + HANDLE).body;
    const addresses = sf.decodeCfEmails(rendered);
    const renderedHasIt = addresses.indexOf(ADDRESS) !== -1
      || rendered.indexOf(ADDRESS) !== -1;
    if (renderedHasIt && live.indexOf(ADDRESS) === -1) {
      console.log('STALE, not failed.');
      console.log('  The rendered page already carries ' + ADDRESS + ', so the import landed.');
      console.log('  /pages/' + HANDLE + '.json is still serving a cached pre-import body');
      console.log('  (its updated_at comes from the same stale response, so it agrees with it).');
      console.log('  Wait a minute and run this again. Do NOT re-import on the strength of this.');
      process.exit(2);
    }
  }
  const problems = [];
  const ok = (label, cond, detail) => {
    console.log((cond ? '  [PASS] ' : '  [FAIL] ') + label + (detail ? '  ' + detail : ''));
    if (!cond) problems.push(label);
  };

  console.log('predicted ' + predicted.length + ' chars, sha256 ' + sha(predicted));
  console.log('live      ' + live.length + ' chars, sha256 ' + sha(live));
  console.log('');

  //  The whole claim. Everything below is here to make a failure readable.
  ok('the stored body is byte for byte what was predicted', live === predicted,
    live.length + ' vs ' + predicted.length);

  ok('the phishing address is back', live.indexOf(ADDRESS) !== -1);
  ok('it is inside angle brackets a reader can see',
    live.indexOf('&lt;' + ADDRESS + '&gt;') !== -1);
  ok('no stray helpdesk element survived', live.indexOf('<helpdesk') === -1);
  ok('the lookalike domain appears its original 4 times',
    (live.split('rivertonl1b').length - 1) === 4,
    String(live.split('rivertonl1b').length - 1));
  ok('the real domain is untouched', live.indexOf('d.alvarez@rivertonlib.org') !== -1);
  ok('the attribute this whole pass removed is still gone',
    live.indexOf('data-item-id') === -1);
  ok('and data-lesson-id still there, so nothing was truncated',
    live.indexOf('data-lesson-id="unit-1-frq"') !== -1);

  if (live !== predicted) {
    let i = 0;
    const n = Math.min(live.length, predicted.length);
    while (i < n && live[i] === predicted[i]) i++;
    console.log('');
    console.log('  first divergence at offset ' + i);
    console.log('  predicted: ' + JSON.stringify(predicted.slice(Math.max(0, i - 80), i + 80)));
    console.log('  live     : ' + JSON.stringify(live.slice(Math.max(0, i - 80), i + 80)));
  }

  console.log('');
  if (problems.length) {
    console.log(problems.length + ' PROBLEM(S). The repair did not land as predicted.');
    process.exit(1);
  }
  console.log('REPAIR VERIFIED: stored body matches the prediction exactly, ' + live.length + ' chars');
}

main();
