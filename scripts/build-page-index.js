#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  BUILD THE PAGE INDEX  (handoff section 4.4: "Rebuild nightly")
//
//  Reads the storefront sitemap through lib/storefront-fetch.js and rewrites
//  page_index. Run it from the nightly sweep, or by hand:
//
//      npm run pageindex            rebuild and report
//      npm run pageindex -- --dry   crawl and classify, write nothing
//
//  IT DOES NOT THROW ON A BAD CRAWL, and that is deliberate for a scheduled job:
//  a job that throws puts its failure in a log an agent cannot read. It exits
//  non-zero and prints what went wrong, so the workflow step goes red with the
//  reason on the console.
//
//  The thing it protects against is subtler than a network error. A Cloudflare
//  challenge served with a 200 parses as a sitemap containing zero URLs, which
//  would silently empty the index and make search stop finding anything with
//  nothing anywhere reporting a fault. lib/assistant/page-index.js refuses to
//  prune below MIN_CREDIBLE_PAGES for exactly that case, and this script exits
//  non-zero when it happens rather than printing a cheerful zero.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const pageIndex = require('../lib/assistant/page-index');

const DRY = process.argv.includes('--dry');

(async () => {
  const before = pageIndex.count();
  console.log(`page_index: ${before} rows before`);

  if (DRY) {
    // A dry run still crawls, because the half worth checking is the crawl.
    const sf = require('../lib/storefront-fetch');
    const root = String((await sf.raw('/sitemap.xml')).body || '');
    const subs = [...root.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => m[1].replace(/&amp;/g, '&'))
      .filter((u) => pageIndex.WANTED_SITEMAPS.test(u));
    console.log(`would read ${subs.length} sitemaps:`);
    let total = 0;
    for (const s of subs) {
      const u = new URL(s);
      const xml = String((await sf.raw(u.pathname + u.search)).body || '');
      const n = pageIndex.parseLocs(xml).length;
      total += n;
      console.log(`  ${n.toString().padStart(5)}  ${u.pathname}`);
    }
    console.log(`would index ${total} pages. Nothing written.`);
    process.exit(total >= pageIndex.MIN_CREDIBLE_PAGES ? 0 : 1);
  }

  const r = await pageIndex.build();
  console.log(`sitemaps read: ${r.sitemaps}`);
  console.log(`pages seen:    ${r.seen}`);
  console.log(`rows written:  ${r.written}`);
  console.log(`rows pruned:   ${r.pruned}`);
  console.log(`rows after:    ${pageIndex.count()}`);
  for (const e of r.errors) console.log(`  ERROR: ${e}`);

  if (!r.ok) {
    console.log('\nBuild did NOT complete cleanly. The index was not pruned.');
    process.exit(1);
  }

  // A per-course breakdown, because "1360 rows" says nothing about whether the
  // classifier is working and a course sitting at zero is the failure worth
  // seeing on the console rather than discovering through an empty search.
  const db = require('../db');
  const rows = db.prepare(
    "SELECT COALESCE(course, '(site)') AS c, page_type, COUNT(*) n FROM page_index GROUP BY c, page_type ORDER BY c, page_type"
  ).all();
  console.log('\nby course and type:');
  for (const row of rows) console.log(`  ${String(row.c).padEnd(18)} ${String(row.page_type).padEnd(10)} ${row.n}`);
  process.exit(0);
})().catch((e) => {
  console.error('build-page-index failed:', e && e.message);
  process.exit(1);
});
