'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  DID THE NOINDEX SHEET ACTUALLY LAND? ASK THE STOREFRONT, NOT THE IMPORTER.
//
//  Run this AFTER the Matrixify import. It asserts two things that were both
//  FALSE beforehand, which is the whole requirement for a live check: measured
//  2026-09-04, all five pages returned 200 carrying no robots meta at all, and
//  all five sat in sitemap_pages_1.xml. An assertion that would have passed
//  yesterday is decoration, so neither of these is "the page still loads".
//
//    1. every configured handle serves a robots meta containing noindex
//    2. every configured handle is GONE from the pages sitemap
//
//  Shopify emits both from the seo.hidden metafield, so one import moves both.
//  Checking only the meta tag would miss a half-applied import; checking only
//  the sitemap would pass on a page Google has already indexed.
//
//  It also asserts the negative side, which is the expensive half to get wrong:
//  the four CSA unit exams the public megamenu links must STILL be indexable.
//  A sheet that over-reached is a traffic loss that takes weeks to undo, and it
//  would look identical to success if this script only checked its own five.
//
//  Fetches go through lib/storefront-fetch.js and send NO User-Agent. Bot
//  management here 403s a spoofed browser and allows bare curl, and the 403
//  body contains none of the strings a check looks for, so every "this string
//  is gone now" assertion passes on it vacuously. That is exactly the shape of
//  this script, so the refusal in that module is load-bearing here.
//
//    node scripts/verify-noindex-live.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');

const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'noindex-pages.json'), 'utf8'));
const HIDDEN = cfg.groups.flatMap((g) => g.handles);

//  Linked from snippets/ap-csa-megamenu.liquid under "Practice Exams". Tier 1,
//  the SEO engine. Named here so an over-broad sheet fails loudly.
const MUST_STAY_INDEXED = [
  'ap-csa-unit-1-exam-objects-methods-expressions',
  'ap-csa-unit-2-exam-selection-iteration',
  'ap-csa-unit-3-practice-exam',
  'ap-csa-unit-4-practice-exam',
];

const ROBOTS = /<meta[^>]+name=["']robots["'][^>]*>/i;
const problems = [];
const notes = [];

function robotsMeta(handle) {
  const html = sf.page('/pages/' + handle);
  const body = typeof html === 'string' ? html : (html.body || '');
  const head = (body.match(/<head[^>]*>[\s\S]*?<\/head>/i) || [body])[0];
  const tags = head.match(new RegExp(ROBOTS.source, 'ig')) || [];
  return tags.join(' ');
}

console.log('checking the five pages that must now be hidden');
for (const h of HIDDEN) {
  let tag;
  try { tag = robotsMeta(h); }
  catch (e) { problems.push(`${h}: fetch refused, ${e.message}`); continue; }
  if (!/noindex/i.test(tag)) problems.push(`${h}: no noindex in the head, robots meta was ${tag || '(absent)'}`);
  else notes.push(`  ${h}  ${tag.trim().slice(0, 70)}`);
}

console.log('checking the four CSA practice exams that must stay indexable');
for (const h of MUST_STAY_INDEXED) {
  let tag;
  try { tag = robotsMeta(h); }
  catch (e) { problems.push(`${h}: fetch refused, ${e.message}`); continue; }
  if (/noindex/i.test(tag)) problems.push(`${h}: OVER-REACH, this page is linked from the public megamenu and must not be noindexed`);
  else notes.push(`  ${h}  indexable`);
}

console.log('checking the pages sitemap');
let sitemap = '';
try {
  const idx = sf.raw('/sitemap.xml');
  const child = (idx.body.match(/<loc>([^<]*sitemap_pages[^<]*)<\/loc>/) || [])[1];
  if (!child) problems.push('sitemap.xml names no pages sitemap');
  else {
    const url = child.replace(/&amp;/g, '&').replace(/^https?:\/\/[^/]+/, '');
    sitemap = sf.raw(url).body;
    if (!/<urlset|<loc>/.test(sitemap)) problems.push('the pages sitemap did not come back as a urlset');
  }
} catch (e) {
  problems.push(`sitemap fetch refused: ${e.message}`);
}

if (sitemap) {
  for (const h of HIDDEN) {
    if (sitemap.includes('/pages/' + h + '<')) problems.push(`${h}: still listed in the pages sitemap`);
  }
  for (const h of MUST_STAY_INDEXED) {
    if (!sitemap.includes('/pages/' + h + '<')) problems.push(`${h}: OVER-REACH, dropped out of the pages sitemap`);
  }
}

for (const n of notes) console.log(n);

if (problems.length) {
  console.error(`\nNOT LANDED, ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`\nlanded: ${HIDDEN.length} pages noindexed and out of the sitemap, ${MUST_STAY_INDEXED.length} practice exams untouched`);
