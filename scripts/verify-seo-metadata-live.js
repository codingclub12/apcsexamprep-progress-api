'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  DID THE SEO SHEET ACTUALLY LAND?
//
//    node scripts/verify-seo-metadata-live.js            all records
//    node scripts/verify-seo-metadata-live.js --pending  only rows not yet live
//
//  ── WHY THIS RUNS BEFORE THE IMPORT, NOT ONLY AFTER ─────────────────────────
//  A generated sheet goes stale. On 2026-09-08 a sheet sat unimported for a day
//  while somebody fixed the same page a better way, and importing it would have
//  MERGED the older body back over the fix. So the first question this asks is
//  not "did it work" but "is this sheet still needed", and a row already live
//  is reported as a no-op rather than as a success.
//
//  ── WHAT IT FOUND THE DAY IT WAS WRITTEN ────────────────────────────────────
//  Run against seed/seo-rewrites.js on 2026-09-17, BEFORE any import: 46 of 72
//  records were not live, and the split says what actually happened.
//
//      pages        25 live   27 pending
//      products      0 live   12 pending
//      collections   0 live    7 pending
//
//  imports/2026-08-26/ holds three generated sheets. The 25-row page sheet
//  imported completely: its handles are exactly the 25 that are live. The
//  product and collection sheets sat beside it and were never imported at all.
//  The remaining 11 page records were added to the seed afterwards and never
//  regenerated into a sheet.
//
//  So defects the seed file describes in the past tense are still being served:
//  three game pages carrying APCSExamPrep.com twice, /collections/frq with no
//  meta description, and /pages/ap-csa-unit-1-course titled "Primitive Types",
//  which is the retired 10-unit curriculum this repo forbids. Nothing in the
//  repo could see any of it, because a seed file reads like a record of work
//  completed and a committed sheet reads like a record of an import.
//
//  A live check earns its place only by asserting something that was FALSE
//  beforehand. This one is exactly that: every pending row below is a string
//  the storefront does not serve yet.
//
//  Fetches through lib/storefront-fetch.js, which sends no User-Agent and
//  refuses a body that is not provably a rendered page.
// ─────────────────────────────────────────────────────────────────────────────

const { PAGES, PRODUCTS, COLLECTIONS } = require('../seed/seo-rewrites');
const { page, STORE } = require('../lib/storefront-fetch');

const PENDING_ONLY = process.argv.includes('--pending');

function decode(s) {
  if (s == null) return null;
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}
function pick(body, re) { const m = body.match(re); return m ? m[1].trim() : null; }

const GROUPS = [
  ['pages', PAGES, (h) => `${STORE}/pages/${h}`],
  ['products', PRODUCTS, (h) => `${STORE}/products/${h}`],
  ['collections', COLLECTIONS, (h) => `${STORE}/collections/${h}`],
];

let live = 0, pending = 0, unreachable = 0;
const pendingRows = [];

for (const [name, rows, url] of GROUPS) {
  console.log(`\n${name}  (${rows.length} records)`);
  for (const r of rows) {
    let body;
    try { body = page(url(r.handle)).body; }
    catch (e) {
      unreachable++;
      console.log(`  ????  ${r.handle}  ${String(e.message).slice(0, 60)}`);
      continue;
    }
    const lt = decode(pick(body, /<title>([\s\S]*?)<\/title>/i));
    const ld = decode(pick(body, /<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i));

    //  A record only claims the fields it supplies. A record with no
    //  description must not be judged on the live one.
    const titleOk = r.title === undefined || lt === r.title;
    const descOk = r.description === undefined || ld === r.description;

    if (titleOk && descOk) { live++; if (!PENDING_ONLY) console.log(`  live  ${r.handle}`); continue; }
    pending++;
    pendingRows.push({ group: name, handle: r.handle, titleOk, descOk, lt, ld, r });
    console.log(`  PEND  ${r.handle}`);
    if (!titleOk) {
      console.log(`          title live: ${lt}`);
      console.log(`          title want: ${r.title}`);
    }
    if (!descOk) {
      console.log(`          desc  live: ${String(ld).slice(0, 96)}`);
      console.log(`          desc  want: ${String(r.description).slice(0, 96)}`);
    }
  }
}

const total = PAGES.length + PRODUCTS.length + COLLECTIONS.length;
console.log(`\n  ${live} of ${total} records are live as written.`);
console.log(`  ${pending} still pending${unreachable ? `, ${unreachable} unreachable` : ''}.\n`);

if (pending === 0) {
  console.log('  Every record in seed/seo-rewrites.js is live. The sheet has nothing left to do.\n');
} else {
  console.log('  Those pending rows are what an import would change. Re-run without');
  console.log('  --pending after the import; a finished import leaves this at zero.\n');
}

//  Exit non-zero only when a fetch failed. Pending rows are the normal state
//  BEFORE an import, so they are not an error: the runbook says which number
//  to expect at which step.
process.exit(unreachable ? 1 : 0);
