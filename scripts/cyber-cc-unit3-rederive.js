'use strict';
// -----------------------------------------------------------------------------
//  REDERIVE: does each Command Center row open the page it claims to?
//
//  Deliberately does NOT read lib/cyber-unit3-renumber.js PLAN, which is what
//  the relink generator is built on. It asks each LIVE PAGE what topic it says
//  it is, and compares that to the CED number the row already prints beside its
//  title. Two independent statements about the same fact, neither of them the
//  mapping under test.
//
//  Answers `rows=N ced-matches-page=M`, so a caller can assert the count.
//
//  Run: node scripts/cyber-cc-unit3-rederive.js            the live page as it is
//       node scripts/cyber-cc-unit3-rederive.js --fixed    live, with the relink
//                                                          applied in memory
//       node scripts/cyber-cc-unit3-rederive.js <body.html>
//
//  --fixed exists so the deploy gate is self-contained. It used to be pointed at
//  a scratch file in /tmp, which made the gate pass once and then fail for
//  anybody who re-ran it, including the run after the deploy.
// -----------------------------------------------------------------------------
const fs = require('fs');
const sf = require('../lib/storefront-fetch');

const CC_HANDLE = 'cyber-command-center';

function statedTopic(bodyHtml) {
  const h1 = bodyHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (!h1) return null;
  const m = h1[1].replace(/<[^>]+>/g, '').match(/(?:Topic|Lesson)\s+(\d\.\d)/);
  return m ? m[1] : null;
}

function main() {
  const arg = process.argv[2];
  let cc;
  if (arg === '--fixed') {
    const { transform } = require('./cyber-cc-unit3-relink');
    const live = sf.pageBody(CC_HANDLE).body_html;
    const r = transform(live);
    //  A refusal here means the live page is ALREADY correct, which is the
    //  expected state once the sheet has been imported. Fall through to the
    //  live body rather than crashing, so this keeps answering 6 afterwards.
    cc = r ? r.out : live;
  } else {
    cc = arg ? fs.readFileSync(arg, 'utf8') : sf.pageBody(CC_HANDLE).body_html;
  }

  const ced = {};
  for (const m of cc.matchAll(/\{ id:"(3\.\d)", title:"[^"]*", ced:"CED (3\.\d)"/g)) ced[m[1]] = m[2];
  const page = {};
  for (const m of cc.matchAll(/"(3\.\d)":\{page:"\/pages\/([a-z0-9-]+)"/g)) page[m[1]] = m[2];

  const ids = Object.keys(ced).sort();
  let match = 0;
  const bad = [];
  for (const id of ids) {
    const handle = page[id];
    let says = 'unreachable';
    try { says = statedTopic(sf.pageBody(handle).body_html) || 'none'; } catch (e) { /* keep unreachable */ }
    if (says === ced[id]) match++;
    else bad.push(`${id} says CED ${ced[id]}, ${handle} states ${says}`);
  }
  for (const b of bad) console.error('  ' + b);
  console.log(`rows=${ids.length} ced-matches-page=${match}`);
}

if (require.main === module) main();
module.exports = { statedTopic };
