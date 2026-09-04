'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  DID THE NOINDEX SHEETS ACTUALLY LAND? ASK THE STOREFRONT, NOT THE IMPORTER.
//
//  Run this AFTER each Matrixify import. It asserts things that were FALSE
//  beforehand, which is the whole requirement for a live check: measured
//  2026-09-04, all twelve pages returned 200 carrying no robots meta at all,
//  and every one of them sat in sitemap_pages_1.xml. An assertion that would
//  have passed yesterday is decoration, so none of these is "the page loads".
//
//    1. every configured handle serves a robots meta containing noindex
//    2. every configured handle is GONE from the pages sitemap
//
//  Shopify emits both from the seo.hidden metafield, so one import moves both.
//  Checking only the meta tag would miss a half-applied import; checking only
//  the sitemap would pass on a page Google has already indexed.
//
//  ── THE HALF THAT IS EXPENSIVE TO GET WRONG ────────────────────────────────
//  It also asserts the NEGATIVE side, from config/noindex-pages.json's own
//  excluded list: the nine pages carrying deliberate SEO titles must STILL be
//  indexable, and the 301 must still redirect rather than have become a blank
//  page. Those nine sit under the same heading in docs/meta-description-gaps.md
//  as the seven that are hidden here, so an over-broad sheet is a plausible
//  mistake rather than a far-fetched one. It is also a traffic loss that takes
//  weeks to undo, and it would look identical to success to a script that only
//  checked the handles it meant to hide.
//
//  Fetches go through lib/storefront-fetch.js and send NO User-Agent. Bot
//  management here 403s a spoofed browser and allows bare curl, and the 403
//  body contains none of the strings a check looks for, so every "this string
//  is gone now" assertion passes on it vacuously. That is exactly the shape of
//  this script, so the refusal in that module is load-bearing here.
//
//    node scripts/verify-noindex-live.js            every group
//    node scripts/verify-noindex-live.js <group>    one group, by id
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');

const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'noindex-pages.json'), 'utf8'));

const only = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : null;
const groups = only ? cfg.groups.filter((g) => g.id === only) : cfg.groups;
if (only && !groups.length) {
  console.error(`no group ${only}. known: ${cfg.groups.map((g) => g.id).join(', ')}`);
  process.exit(2);
}
const HIDDEN = groups.flatMap((g) => g.handles);

//  From the config rather than a second copy here, so adding an exclusion
//  cannot leave this guard behind.
const MUST_STAY_INDEXED = Object.keys((cfg.excluded && cfg.excluded['seo-invested'] || {}).handles || {});
const MUST_REDIRECT = Object.keys((cfg.excluded && cfg.excluded['not-a-page'] || {}).handles || {});

const problems = [];
const notes = [];

function robotsMeta(handle) {
  const html = sf.page('/pages/' + handle);
  const body = typeof html === 'string' ? html : (html.body || '');
  const head = (body.match(/<head[^>]*>[\s\S]*?<\/head>/i) || [body])[0];
  return (head.match(/<meta[^>]+name=["']robots["'][^>]*>/ig) || []).join(' ');
}

console.log(`checking ${HIDDEN.length} page(s) that must be hidden`);
for (const h of HIDDEN) {
  let tag;
  try { tag = robotsMeta(h); }
  catch (e) { problems.push(`${h}: fetch refused, ${e.message}`); continue; }
  if (!/noindex/i.test(tag)) problems.push(`${h}: no noindex in the head, robots meta was ${tag || '(absent)'}`);
  else notes.push(`  ${h}  ${tag.trim().slice(0, 62)}`);
}

console.log(`checking ${MUST_STAY_INDEXED.length} SEO-invested page(s) that must stay indexable`);
for (const h of MUST_STAY_INDEXED) {
  let tag;
  try { tag = robotsMeta(h); }
  catch (e) { problems.push(`${h}: fetch refused, ${e.message}`); continue; }
  if (/noindex/i.test(tag)) problems.push(`${h}: OVER-REACH, this page carries a deliberate SEO title and must not be noindexed`);
  else notes.push(`  ${h}  indexable`);
}

//  A MERGE on a handle Shopify cannot find CREATES a blank page there. If this
//  one has stopped redirecting, a sheet has published an empty record over it.
console.log(`checking ${MUST_REDIRECT.length} handle(s) that must still redirect`);
for (const h of MUST_REDIRECT) {
  let r;
  //  follow:false, or curl chases the 301 and reports the destination's 200,
  //  which reads exactly like the blank page this assertion exists to catch.
  try { r = sf.raw('/pages/' + h, { follow: false }); }
  catch (e) { problems.push(`${h}: fetch refused, ${e.message}`); continue; }
  if (String(r.code).startsWith('3')) notes.push(`  ${h}  still ${r.code}`);
  else problems.push(`${h}: expected a redirect, got ${r.code}. A sheet may have created a blank page over it.`);
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
console.log(`\nlanded: ${HIDDEN.length} hidden, ${MUST_STAY_INDEXED.length} SEO pages untouched, ${MUST_REDIRECT.length} redirect intact`);
