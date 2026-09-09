'use strict';
// -----------------------------------------------------------------------------
//  REDERIVE: does each Command Center Unit 3 row open a page that agrees with
//  the number the row prints?
//
//  Deliberately reads NEITHER of the two sources the generator is built on. It
//  does not open lib/cyber-unit3-renumber.js PLAN and it does not open
//  config/cyber-topics.json. It asks the LIVE PAGE what lesson it is, through
//  the data-lesson-id the gradebook keys on, and compares that to the row id.
//  Two independent statements about the same fact, neither of them the mapping
//  under test.
//
//  data-lesson-id rather than the h1, on purpose. The h1 is prose and drifts:
//  lesson-3 says "Lesson 3.2: Secure Network Protocols" while the CED calls
//  3.2 "Protecting Networks: Managerial Controls and Wireless Security" and the
//  Command Center calls it "Network Security Policies & Wireless". Three names,
//  one topic. data-lesson-id is what actually decides which gradebook column a
//  student's work lands in, so it is the number that has consequences.
//
//  TWO COUNTS, because the page makes two different claims and they fail
//  differently:
//
//    id-matches-page   the number a teacher READS on the row, against the page
//                      it opens. This is the one the complaint is about, and it
//                      reads 0 of 6 today: every row is keyed on a retired
//                      number while all six pages moved on 2026-08-28.
//    ced-matches-page  the CED badge beside the title, against the same page.
//                      Reads 3 of 6 today, which is why spot-checking missed
//                      this for three weeks: half the badges are right.
//
//  Both must reach 6. The badge count alone would have called a page fixed
//  while every row still displayed a retired number.
//
//  ALSO CHECKS THE PUBLIC HUB, which had the identical defect on the page that
//  faces students. Same question, different markup: /pages/ap-cybersecurity
//  lists Unit 3 as six anchors, and the number printed on each must match the
//  lesson it opens. There the two halves of CED 3.1 both display 3.1, so either
//  half satisfies a link reading 3.1; that is what the lesson pages themselves
//  print, and 3.1a is a gradebook key rather than something a student reads.
//
//  Run: node scripts/cyber-cc-unit3-ced-rederive.js           live as it is
//       node scripts/cyber-cc-unit3-ced-rederive.js --fixed   live, sheet applied
//                                                             in memory
//       node scripts/cyber-cc-unit3-ced-rederive.js --hub     the public hub, live
//       node scripts/cyber-cc-unit3-ced-rederive.js --hub-fixed
//       node scripts/cyber-cc-unit3-ced-rederive.js <body.html>
// -----------------------------------------------------------------------------
const fs = require('fs');
const sf = require('../lib/storefront-fetch');

const CC_HANDLE = 'cyber-command-center';

//  What the page itself says it is. The gradebook keys on this attribute, so a
//  row pointing somewhere its own number disagrees with is a row that sends a
//  teacher to work that lands in another column.
function statedLessonId(bodyHtml) {
  const m = bodyHtml.match(/data-lesson-id="([^"]+)"/);
  return m ? m[1] : null;
}

//  Both claims per row: the id it displays, and the CED topic it badges. On the
//  CED shape there is no badge on most rows, because the id is the topic.
function rowClaims(ccBody) {
  const block = ccBody.slice(
    ccBody.indexOf('{ n:3, name:"Securing Networks"'),
    ccBody.indexOf('{ n:4, name:'),
  );
  const out = [];
  for (const m of block.matchAll(/\{ id:"([^"]+)", title:"([^"]*)"(?:, ced:"CED ([^"]+)")?/g)) {
    out.push({ id: m[1], title: m[2], ced: m[3] || m[1] });
  }
  return out;
}

//  The public hub: six anchors, each printing a number and opening a page.
function hubMain(applyFix) {
  const HUB = 'ap-cybersecurity';
  let body = sf.pageBody(HUB).body_html;
  if (applyFix) {
    const { transform } = require('./cyber-hub-unit3-ced-numbers');
    const r = transform(body);
    body = r ? r.out : body;
  }
  const links = [...body.matchAll(
    /<a class="ch-lesson" href="\/pages\/(ap-cyber-unit-3-lesson-\d)">(\d\.\d)([^<]*)<\/a>/g)];
  let match = 0;
  const bad = [];
  for (const [, handle, shown, title] of links) {
    let says = 'unreachable';
    try { says = statedLessonId(sf.pageBody(handle).body_html) || 'none'; } catch (e) { /* keep */ }
    //  A link reading 3.1 is satisfied by either half of CED 3.1.
    const hit = says === shown || (shown === '3.1' && /^3\.1[ab]$/.test(says));
    if (hit) match++;
    else bad.push(`  "${shown}${title.trim()}" opens ${handle}, which states ${says}`);
  }
  for (const b of bad) console.error(b);
  console.log(`hub-links=${links.length} number-matches-page=${match}`);
}

function main() {
  const arg = process.argv[2];
  if (arg === '--hub' || arg === '--hub-fixed') return hubMain(arg === '--hub-fixed');
  let cc;
  if (arg === '--fixed') {
    const { transform } = require('./cyber-cc-unit3-ced-numbers');
    const live = sf.pageBody(CC_HANDLE).body_html;
    const r = transform(live);
    //  A refusal means the live page is ALREADY renumbered, which is the state
    //  this gate expects after the import. Fall through rather than crash, so
    //  the post-deploy run keeps answering 6 instead of going red on success.
    cc = r ? r.out : live;
  } else {
    cc = arg ? fs.readFileSync(arg, 'utf8') : sf.pageBody(CC_HANDLE).body_html;
  }

  const handles = {};
  for (const m of cc.matchAll(/"([^"]+)":\{page:"\/pages\/(ap-cyber-unit-3-[a-z0-9-]+)"/g)) handles[m[1]] = m[2];

  const rows = rowClaims(cc);
  let idMatch = 0;
  let cedMatch = 0;
  const bad = [];
  for (const row of rows) {
    const handle = handles[row.id];
    let says = 'unreachable';
    if (handle) {
      try { says = statedLessonId(sf.pageBody(handle).body_html) || 'none'; } catch (e) { /* keep unreachable */ }
    } else {
      says = 'no link';
    }
    if (says === row.id) idMatch++;
    //  The 3.1 pair are two lessons under one CED topic, so a row badged CED
    //  3.1 is satisfied by either half.
    if (says === row.ced || (row.ced === '3.1' && /^3\.1[ab]$/.test(says))) cedMatch++;
    if (says !== row.id) {
      bad.push(`  row ${row.id} (${row.title}) opens ${handle || 'nothing'}, which states ${says}`);
    }
  }
  for (const b of bad) console.error(b);
  console.log(`rows=${rows.length} id-matches-page=${idMatch} ced-matches-page=${cedMatch}`);
}

if (require.main === module) main();
module.exports = { statedLessonId, rowClaims };
