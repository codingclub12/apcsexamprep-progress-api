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
const linkBlock = require('../lib/link-block');
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
//  Shopify does not decode entities once, it normalises to canonical HTML:
//  measured 2026-09-04 on this import,
//      sheet &amp;lt;   -> stored &lt;    markup-significant, stays encoded
//      sheet &amp;#39;  -> stored '       not significant, decoded fully
//  Both render correctly. It also inserts a newline after some block tags, so
//  <li><span> comes back as <li>\n<span>.
//
//  So byte equality is the WRONG assertion; it is red on a perfect import
//  forever, which is how a check gets ignored. And a fixed-order decode is
//  wrong too: it leaves &amp;#39; as &#39; on one side and ' on the other, and
//  reports a difference that is not there. Decode to a FIXED POINT on both
//  sides, then compare what the page means.
const decodeFully = (t) => {
  let out = String(t);
  for (let i = 0; i < 5; i += 1) {
    const next = out.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, e) => {
      if (e[0] === '#') {
        const n = e[1] === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1));
        return Number.isFinite(n) ? String.fromCodePoint(n) : m;
      }
      const map = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", middot: '\u00b7',
        rarr: '\u2192', nbsp: ' ' };
      return Object.prototype.hasOwnProperty.call(map, e) ? map[e] : m;
    });
    if (next === out) break;
    out = next;
  }
  return out;
};
const semantic = (html) => decodeFully(html).replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();

//  THIS SHEET IS NOT THE ONLY AUTHOR OF THESE PAGES.
//
//  "The stored body equals my sheet" is true at the moment of import and stops
//  being true the first time another system in this repo edits the same page.
//  On 2026-09-04 lib/link-block.js added a related-links block to
//  ap-cybersecurity-practice, 1,514 characters of scoped CSS and anchors, and
//  this check reported
//
//      ap-cybersecurity-practice: stored body differs from the sheet beyond
//      normalisation
//
//  on a page that was entirely correct. Every question was live, the QOTD card
//  was where the sheet put it, and the only difference was somebody else's
//  block. That is the failure lib/storefront-fetch.js exists to prevent one
//  directory over: a verifier that cries wolf gets ignored, and then it is not
//  there on the day something is really wrong.
//
//  So the block comes off before the comparison, through link-block's OWN
//  unmark() rather than a pattern written here. Same rule as mojibake going
//  through lib/mojibake.js: a second opinion about another module's markers is
//  a second thing to keep in sync, and it cannot tell you when it has stopped
//  matching.
//
//  It narrows nothing else. unmark() removes only what sits between that
//  module's own fences, so damage anywhere in the sheet's content still fails,
//  and the row says when a block was stripped rather than quietly tolerating
//  one. If a page ever grows a THIRD author, this reports it as a difference,
//  which is the right answer: the fix is to teach this function about it, not
//  to loosen the comparison.
function comparable(bodyHtml) {
  const raw = String(bodyHtml || '');
  const stripped = raw.includes(linkBlock.MARK_OPEN) || raw.includes(linkBlock.CSS_OPEN);
  return { text: semantic(stripped ? linkBlock.unmark(raw) : raw), stripped };
}

//  Say in the row that a page has a second author, so "same-content" never
//  quietly means "same once I ignored 1,514 characters".
const storedLabel = (same, cmp) => (same ? 'stored=same-content' : 'stored=CONTENT-DIFFERS')
  + (cmp.stripped ? '+links' : '');
const storedFail = (handle, cmp) => handle
  + ': stored body differs from the sheet beyond normalisation'
  + (cmp.stripped ? ', with the related-links block already removed' : '');

function sheetRows(file) {
  const m = new Map();
  for (const r of parseCsv(fs.readFileSync(file, 'utf8')).rows) m.set(r.Handle, r);
  return m;
}

function main() {
  const units = sheetRows(UNIT_SHEET);
  const links = sheetRows(LINK_SHEET);
  const fails = [];
  const cloudflare = [];
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
      const cmp = comparable(stored.body_html);
      const same = cmp.text === semantic(want['Body HTML']);
      const storedQs = (stored.body_html.match(/class="cy-bank-q"/g) || []).length;
      row.push(storedLabel(same, cmp));
      if (!same) fails.push(storedFail(handle, cmp));
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
      //  CODE BLOCKS: assert against the STORED body, and report Cloudflare
      //  separately. These are two different owners.
      //
      //  Shopify eating an address is MINE: it decoded escaped angle brackets
      //  and its sanitizer stripped what looked like a tag, which deleted the
      //  lookalike domain from question C1-102. Fixed by escaping twice, and
      //  the stored body is where that is provable.
      //
      //  Cloudflare rewriting an address at RENDER time is not mine and not
      //  this import's: it turns any address into an email-protection link
      //  reading "[email protected]". The existing 1.1 lab page carries 10 of
      //  them today, so this is a site-wide condition on every phishing
      //  specimen in the course, fixed by the Email Address Obfuscation toggle
      //  in Cloudflare rather than by any sheet. Failing this check on it would
      //  make the verifier permanently red for something a re-import cannot
      //  change.
      const pool = require('../config/cyber-qotd-pool.json').pool;
      const storedBody = stored ? stored.body_html : '';
      for (const q of pool.filter((x) => x.unit === u && x.code)) {
        for (const line of String(q.code).split('\n').map((t) => t.trim()).filter((t) => t.length > 8)) {
          const wantLine = decodeFully(line).replace(/\s+/g, ' ');
          if (!decodeFully(storedBody).replace(/\s+/g, ' ').includes(wantLine)) {
            fails.push(handle + ': ' + q.id + ' code line ' + JSON.stringify(line.slice(0, 46))
              + ' is NOT in the stored body');
            break;
          }
        }
      }
      //  Count only obfuscation inside OUR question markup. The theme's contact
      //  widget carries a real address on every page and Cloudflare hiding that
      //  one is correct behaviour, not a defect. Reporting all of them makes
      //  this read as 11 problems when there is exactly one: a check that
      //  overstates gets ignored.
      const inQuestions = (b.match(/cy-bank-code[\s\S]{0,400}?__cf_email__/g) || []).length;
      const total = (b.match(/__cf_email__/g) || []).length;
      if (inQuestions) {
        cloudflare.push(handle + ': ' + inQuestions + ' address(es) obfuscated INSIDE a question '
          + '(' + (total - inQuestions) + ' more are the theme contact widget, which is correct)');
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
      const cmp = comparable(stored.body_html);
      const same = cmp.text === semantic(want['Body HTML']);
      row.push(storedLabel(same, cmp));
      if (!same) fails.push(storedFail(handle, cmp));
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
  if (cloudflare.length) {
    console.log('');
    console.log('SITE CONDITION, not this import (Cloudflare Email Address Obfuscation):');
    cloudflare.forEach((c) => console.log('  ' + c));
    console.log('  The stored bodies are correct. Cloudflare rewrites addresses at serve time,');
    console.log('  so a phishing specimen reads "[email protected]" to a student. The existing');
    console.log('  1.1 lab page carries 10 of these today. Fixed by the Cloudflare toggle,');
    console.log('  never by a sheet.');
  }
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
