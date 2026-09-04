#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  AP CYBER UNIT 3: RENUMBER THE SEO TITLES THE PAGE RENUMBER MISSED.
//
//  The Unit 3 renumbering moved six lesson pages onto their real CED topic
//  numbers and updated the Shopify page titles. It did not touch the SEO title
//  metafield, so every one of the six still advertises its PRE-renumber number
//  to Google. Measured live 2026-09-04:
//
//    handle    page title (correct)                    SEO title (stale)
//    lesson-1  3.1 (Part 1 of 2): Network Fundamen...  3.1: Network Fundamentals
//    lesson-2  3.1 (Part 2 of 2): Network Attacks      3.2: Network Attacks
//    lesson-3  3.2: Network Security Policies & Wi...  3.3: Firewalls
//    lesson-4  3.3: Network Segmentation & VLANs       3.4: Segmentation & VLANs
//    lesson-5  3.4: Firewalls & Packet Filtering       3.5: IDS, IPS & SIEM
//    lesson-6  3.5: IDS, IPS & SIEM                    Unit 3 Lesson 6
//
//  This is the exact failure CLAUDE.md describes, living in the search index
//  rather than in a page body: "a teacher assigning 3.4 Firewalls from the CED
//  sent the class to Network Segmentation". Search for 3.4 Firewalls today and
//  the title that matches belongs to lesson-4, which teaches segmentation.
//
//  -- WHAT THIS DOES NOT TOUCH ----------------------------------------------
//  The page TITLE is already correct on all six and is carried through
//  unchanged, read from the live page rather than retyped, so this sheet cannot
//  rename a page. No Body HTML column: these are not body updates, and the
//  validator's rule 5 refuses a Body HTML column on a row that is not one.
//
//  It also does not touch the h1s. Ten of the 24 lesson h1s use a descriptive
//  name rather than the CED wording, and that is mostly deliberate: Unit 1's
//  four carry the CED title in the breadcrumb, and 4.1 differs only in "&"
//  versus "and". Unit 3's are the real gap, and they are NOT a titling problem:
//  docs/cyber-unit3-renumbering-spec.md records that no Unit 3 lesson teaches
//  CED 3.2 at all. Relabelling that page would assert coverage it does not
//  have, which is worse than the wrong number.
//
//  Usage:
//    node scripts/cyber-unit3-seo-csv.js          write the sheet
//    node scripts/cyber-unit3-seo-csv.js --check  compare live against intent
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { writeCsv, parseCsv, PUBLISHED_AT } = require('../tools/ap-cyber-ced/sheet-csv');
const sf = require('../lib/storefront-fetch');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'matrixify/cyber-unit3-seo-pages.csv');
const HEADER = ['Handle', 'Command', 'Title', 'Published', 'Published At', 'SEO Title'];

//  Keyed by handle, and every one mirrors the page title that the renumber
//  already set. The suffix follows the four Unit 3 pages that already use it.
const SEO = {
  'ap-cyber-unit-3-lesson-1': 'AP Cybersecurity 3.1 (Part 1 of 2): Network Fundamentals | Free Lesson',
  'ap-cyber-unit-3-lesson-2': 'AP Cybersecurity 3.1 (Part 2 of 2): Network Attacks | Free Lesson',
  'ap-cyber-unit-3-lesson-3': 'AP Cybersecurity 3.2: Network Security Policies & Wireless | Free Lesson',
  'ap-cyber-unit-3-lesson-4': 'AP Cybersecurity 3.3: Network Segmentation & VLANs | Free Lesson',
  'ap-cyber-unit-3-lesson-5': 'AP Cybersecurity 3.4: Firewalls & Packet Filtering | Free Lesson',
  'ap-cyber-unit-3-lesson-6': 'AP Cybersecurity 3.5: IDS, IPS & SIEM | Free Lesson',
};

//  The topic each handle really is, from docs/cyber-unit3-renumbering-spec.md.
//  Used to assert the new SEO title names the right topic, so a typo in the
//  table above cannot ship.
const TOPIC_OF = {
  'ap-cyber-unit-3-lesson-1': '3.1',
  'ap-cyber-unit-3-lesson-2': '3.1',
  'ap-cyber-unit-3-lesson-3': '3.2',
  'ap-cyber-unit-3-lesson-4': '3.3',
  'ap-cyber-unit-3-lesson-5': '3.4',
  'ap-cyber-unit-3-lesson-6': '3.5',
};

const strip = (s) => String(s).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&')
  .replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

function liveTitles(handle) {
  const stored = sf.pageBody(handle);
  const m = /<title[^>]*>([\s\S]*?)<\/title>/.exec(sf.page('/pages/' + handle).body);
  return { title: stored.title, seo: m ? strip(m[1]) : '' };
}

function rows() {
  const out = [];
  const problems = [];
  for (const handle of Object.keys(SEO)) {
    const live = liveTitles(handle);
    const want = SEO[handle];
    const topic = TOPIC_OF[handle];

    // The new SEO title must name the topic the page actually is.
    const named = /AP Cybersecurity (\d\.\d)/.exec(want);
    if (!named || named[1] !== topic) {
      problems.push(`${handle}: the new SEO title names ${named ? named[1] : 'no topic'}, `
        + `but this page is topic ${topic}`);
    }
    // The page title is carried through from LIVE, never retyped, so this sheet
    // cannot rename a page even if the table above is wrong.
    if (!live.title) problems.push(`${handle}: live page has no title to carry through`);
    // And it must agree with the topic too, or the renumber itself is wrong.
    const pageNamed = /(\d\.\d)/.exec(live.title || '');
    if (pageNamed && pageNamed[1] !== topic) {
      problems.push(`${handle}: the LIVE page title names ${pageNamed[1]}, not ${topic}. `
        + 'The renumber is not in the state this sheet assumes; stop and re-read the spec.');
    }
    if (/[^\x00-\x7F]/.test(want)) problems.push(`${handle}: SEO title is not pure ASCII`);
    // Written as an escape so this file is itself pure ASCII and does not trip
    // the repo's own em-dash scan on the guard that detects em-dashes.
    if (/[\u2014]|&mdash;/.test(want)) problems.push(`${handle}: SEO title contains an em-dash`);

    out.push({
      Handle: handle,
      Command: 'MERGE',
      Title: live.title,
      Published: 'TRUE',
      'Published At': PUBLISHED_AT,
      'SEO Title': want,
    });
  }
  if (problems.length) {
    console.error('REFUSING TO WRITE:');
    problems.forEach((p) => console.error('  ' + p));
    process.exit(1);
  }
  return out;
}

function main() {
  if (process.argv.includes('--check')) {
    for (const handle of Object.keys(SEO)) {
      const live = liveTitles(handle);
      const ok = live.seo === SEO[handle];
      console.log(`${ok ? '[ok]  ' : '[STALE]'} ${handle}`);
      if (!ok) {
        console.log(`         live : ${JSON.stringify(live.seo)}`);
        console.log(`         want : ${JSON.stringify(SEO[handle])}`);
      }
    }
    return;
  }

  const r = rows();
  const csv = writeCsv(r, HEADER);

  // Written, parsed back, compared. Generation is not evidence.
  const back = parseCsv(csv);
  const drift = [];
  if (back.rows.length !== r.length) drift.push(`row count ${back.rows.length} != ${r.length}`);
  r.forEach((want, i) => {
    for (const col of HEADER) {
      if ((back.rows[i] || {})[col] !== want[col]) {
        drift.push(`row ${i} column ${col}: ${JSON.stringify(want[col])} -> `
          + JSON.stringify((back.rows[i] || {})[col]));
      }
    }
  });
  if (drift.length) {
    console.error('PARSE-BACK DRIFT, refusing to write:');
    drift.forEach((d) => console.error('  ' + d));
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, csv);
  console.log('wrote', path.relative(ROOT, OUT));
  console.log('  rows       :', r.length);
  console.log('  columns    :', HEADER.join(' | '));
  console.log('  parse-back : no drift');
  console.log('');
  r.forEach((x) => console.log(`  ${TOPIC_OF[x.Handle]}  ${x['SEO Title']}`));
}

if (require.main === module) main();
module.exports = { SEO, TOPIC_OF, rows, liveTitles };
