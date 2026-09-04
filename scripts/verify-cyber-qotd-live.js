#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  VERIFY THE CYBER QOTD IMPORT AGAINST LIVE.
//
//  Two sided on purpose, because the two questions are different:
//
//    STORED    /pages/<handle>.json is what Shopify holds. Compared byte for
//              byte against the sheet row that was imported, so a truncated or
//              partially applied import is visible rather than inferred.
//    RENDERED  the page a crawler receives. This is where the whole point of
//              the change lives: the questions have to be IN the served HTML,
//              not injected by script afterwards.
//
//  Fetched through lib/storefront-fetch.js, which sends NO User-Agent. The bot
//  management inverted on 2026-09-03: a request claiming to be a browser gets
//  403 and bare curl gets 200, and the 403 body is a small "Verifying your
//  connection" page containing none of the strings a check looks for, so every
//  "this string is gone now" assertion passes on it. The module refuses a body
//  that is not provably a rendered page, and every assertion here is POSITIVE
//  (the questions are present), which a challenge body cannot fake.
//
//  Mojibake goes through lib/mojibake.js rather than a pasted pattern, for the
//  reason the convention exists: a pattern list cannot tell you it has stopped
//  working.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');
const mojibake = require('../lib/mojibake');
const { parseCsv } = require('../tools/ap-cyber-ced/sheet-csv');
const gen = require('./cyber-qotd-page-csv');

const ROOT = path.join(__dirname, '..');
const UNIT_SHEET = path.join(ROOT, 'matrixify/cyber-qotd-unit-pages.csv');
const LINK_SHEET = path.join(ROOT, 'matrixify/cyber-qotd-links-pages.csv');
const QOTD = 'ap-cybersecurity-question-of-the-day';
const UMBRELLA = 'ap-cybersecurity-practice';

const visible = (html) => String(html || '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d)))
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&middot;/g, '.').replace(/&rarr;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();

//  WHAT "THE IMPORT LANDED" ACTUALLY MEANS.
//
//  Shopify normalises body_html on save: it decodes entities it considers
//  redundant (&#39; to an apostrophe, &middot; to the character) and inserts a
//  newline after some block tags, so <li><span> comes back as <li>\n<span>.
//  Measured on this import: five unit pages differ from the sheet by between
//  -90 and +56 bytes for exactly those two reasons, and nothing else.
//
//  So byte equality is the WRONG assertion. It would be red on a perfectly
//  correct import forever, which is how a check gets ignored. What has to hold
//  is that the page still MEANS the same thing: the same visible text and the
//  same number of questions. That is what is asserted, and a real truncation
//  still fails it because losing a question loses its text.
const semantic = (html) => String(html || '')
  .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&middot;/g, '\u00b7').replace(/&rarr;/g, '\u2192').replace(/&nbsp;/g, ' ')
  .replace(/>\s+</g, '><')
  .replace(/\s+/g, ' ')
  .trim();

function sheetRows(file) {
  const m = new Map();
  for (const r of parseCsv(fs.readFileSync(file, 'utf8')).rows) m.set(r.Handle, r);
  return m;
}

function main() {
  const units = sheetRows(UNIT_SHEET);
  const links = sheetRows(LINK_SHEET);
  const fails = [];
  let crawlable = 0;
  let renderedTotal = 0;
  let expectedTotal = 0;

  console.log('UNIT PAGES');
  for (const [u, qs] of gen.unitsOf()) {
    expectedTotal += qs.length;
    const handle = gen.unitHandle(u);
    const want = units.get(handle);
    const row = [];
    let stored = null;
    let rendered = null;

    try { stored = sf.pageBody(handle); }
    catch (e) { fails.push(handle + ': stored body unreadable: ' + e.message); }
    try { rendered = sf.page('/pages/' + handle); }
    catch (e) { fails.push(handle + ': rendered page unreadable: ' + e.message); }

    if (stored && want) {
      const same = semantic(stored.body_html) === semantic(want['Body HTML']);
      const storedQs = (stored.body_html.match(/class="cy-bank-q"/g) || []).length;
      row.push(same ? 'stored=same-content' : 'stored=CONTENT-DIFFERS');
      if (!same) fails.push(handle + ': stored body differs from the sheet beyond normalisation');
      if (storedQs !== qs.length) {
        fails.push(handle + ': stored body holds ' + storedQs + ' questions, expected ' + qs.length);
      }
      if (stored.title !== want.Title) fails.push(handle + ': title is ' + JSON.stringify(stored.title));
    }

    if (rendered) {
      const b = rendered.body;
      const n = (b.match(/class="cy-bank-q"/g) || []).length;
      renderedTotal += n;
      row.push('http=' + rendered.code, 'questions=' + n + '/' + qs.length);
      if (n !== qs.length) fails.push(handle + ': renders ' + n + ' questions, expected ' + qs.length);

      // The theme emits its own BreadcrumbList ld+json BEFORE ours, so taking
      // the first block reports @type BreadcrumbList and hasPart 0 over a page
      // whose Quiz schema is perfectly present. Find the Quiz.
      const blocks = [...b.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      let parsed = null;
      for (const blk of blocks) {
        try {
          const o = JSON.parse(blk[1].replace(/\\u003c/g, '<'));
          if (o && o['@type'] === 'Quiz') { parsed = o; break; }
        } catch (e) { /* a neighbouring block we do not own */ }
      }
      if (!parsed) {
        fails.push(handle + ': no Quiz JSON-LD among ' + blocks.length + ' ld+json block(s) served');
      } else {
        {
          const hp = parsed.hasPart || [];
          if (hp.length !== qs.length) {
            fails.push(handle + ': served hasPart ' + hp.length + ', want ' + qs.length);
          }
          const notFlash = hp.filter((q) => q.eduQuestionType !== 'Flashcard').length;
          if (notFlash) fails.push(handle + ': ' + notFlash + ' served questions are not Flashcard');
          // Whitespace must be normalised on BOTH sides. The schema text keeps
          // the newlines the author wrote; the page collapses them, and 30
          // multi-correct stems render across <br>. Comparing raw schema text
          // against collapsed page text reported 11 questions as missing from
          // pages that carried every one of them.
          const vis = visible(b);
          const flat = (t) => String(t).replace(/\s+/g, ' ').trim();
          const missing = hp.filter((q) => !vis.includes(flat(q.text))).length;
          if (missing) fails.push(handle + ': ' + missing + ' schema questions are NOT in the served text');
          row.push('schema=' + hp.length, missing ? 'INVISIBLE=' + missing : 'all-visible');
        }
      }

      const v = visible(b).length;
      crawlable += v;
      row.push('crawlable=' + v.toLocaleString());

      // The defect this whole re-import exists for: Shopify decoded escaped
      // angle brackets and its sanitizer ate the address inside them, deleting
      // the lookalike domain a student is asked to spot. Assert the authored
      // code survives on the LIVE page.
      const pool = require('../config/cyber-qotd-pool.json').pool;
      for (const q of pool.filter((x) => x.unit === u && x.code)) {
        for (const line of String(q.code).split('\n').map((t) => t.trim()).filter((t) => t.length > 8)) {
          if (!visible(b).includes(line.replace(/\s+/g, ' '))) {
            fails.push(handle + ': ' + q.id + ' code line ' + JSON.stringify(line.slice(0, 46))
              + ' is NOT on the served page');
            break;
          }
        }
      }

      const moji = mojibake.analyze(visible(b));
      if (moji.length) {
        fails.push(handle + ': ' + moji.length + ' mojibake run(s) in the served text, first at '
          + moji[0].index + ' fixing to ' + JSON.stringify(moji[0].fixed));
      }
    }
    console.log('  ' + handle.padEnd(46) + ' ' + row.join('  '));
  }

  console.log('');
  console.log('EXISTING PAGES');
  for (const handle of [QOTD, UMBRELLA]) {
    const want = links.get(handle);
    const row = [];
    let stored = null;
    let rendered = null;
    try { stored = sf.pageBody(handle); }
    catch (e) { fails.push(handle + ': stored body unreadable: ' + e.message); }
    try { rendered = sf.page('/pages/' + handle); }
    catch (e) { fails.push(handle + ': rendered page unreadable: ' + e.message); }

    if (stored && want) {
      const same = semantic(stored.body_html) === semantic(want['Body HTML']);
      row.push(same ? 'stored=same-content' : 'stored=CONTENT-DIFFERS');
      if (!same) fails.push(handle + ': stored body differs from the sheet beyond normalisation');
    }
    if (rendered) {
      row.push('http=' + rendered.code);
      if (handle === QOTD) {
        const linked = gen.unitsOf().filter(([u]) => rendered.body.includes('/pages/' + gen.unitHandle(u)));
        row.push('links-units=' + linked.length + '/5');
        if (linked.length !== 5) fails.push(QOTD + ': links ' + linked.length + ' of 5 unit pages');
      } else {
        const ok = rendered.body.includes('/pages/' + QOTD);
        row.push(ok ? 'links-qotd=yes' : 'links-qotd=NO');
        if (!ok) fails.push(UMBRELLA + ': does not link the QOTD page');
      }
      crawlable += visible(rendered.body).length;
    }
    console.log('  ' + handle.padEnd(46) + ' ' + row.join('  '));
  }

  console.log('');
  console.log('questions in served HTML : ' + renderedTotal + ' of ' + expectedTotal);
  console.log('crawlable text, live     : ' + crawlable.toLocaleString() + ' chars across 6 URLs');
  console.log('');
  if (fails.length) {
    console.log('RESULT: FAIL - ' + fails.length + ' problem(s)');
    [...new Set(fails)].slice(0, 20).forEach((f) => console.log('  ' + f));
    process.exit(1);
  }
  console.log('RESULT: PASS - stored bodies match the sheets, every question is in the served '
    + 'HTML, schema is intact and visible, and the cross-links resolve');
}

if (require.main === module) main();
