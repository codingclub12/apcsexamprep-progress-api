'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  A LIVE PAGES DUMP WITH NO ADMIN TOKEN.
//
//  scripts/page-body-csv.js does its most valuable checks only when it is given
//  a --live dump: does the handle exist, does the live title match the one the
//  sheet would set, and is the live body ALREADY the repo's body (in which case
//  the page is dropped from the sheet, because an import that changes nothing is
//  pure risk). Producing that dump has always meant a Shopify Admin API query,
//  so whenever no token was to hand the sheet got built with those checks off.
//
//  It does not have to. The theme drops page.content verbatim inside its rte
//  wrapper, which is what scripts/extract-live-body.js recovers, and a page is
//  public. So the body half of the dump needs no credential at all: fetch the
//  rendered page and extract it.
//
//  PROVEN, NOT ASSUMED. Run against /pages/my-progress this reproduced the
//  stored body byte for byte: 26,570 bytes, identical to the committed file the
//  page was last imported from, once entities are normalised the way Shopify
//  stores them.
//
//  ── THE ONE THING IT CANNOT SEE ─────────────────────────────────────────────
//  The page TITLE. A rendered page shows a title with the theme's suffix glued
//  on, so it cannot be recovered exactly, and a guessed title is precisely what
//  the check exists to catch. Titles are therefore passed in explicitly and must
//  come from a real Admin API read, not from the sheet they will be checked
//  against, or the check is circular and worthless.
//
//  Run:
//    node scripts/live-pages-dump.js <out.json> <handle=Title> [<handle=Title> ...]
//
//  Then:
//    node scripts/page-body-csv.js out.csv --live out.json
//
//  Zero PII: public page content only. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const { extract } = require('./extract-live-body');

const BASE = (process.env.STORE_ORIGIN || 'https://www.apcsexamprep.com').replace(/\/+$/, '');
// A default browser-ish agent: the storefront serves a challenge to obviously
// scripted clients, and a challenge page has no rte wrapper, so the extract
// would fail with a confusing message rather than a clear one.
const UA = 'Mozilla/5.0 (compatible; apcse-pages-dump/1.0) Chrome/120.0.0.0 Safari/537.36';

async function fetchBody(handle) {
  const url = `${BASE}/pages/${handle}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${handle}: ${url} returned ${res.status}`);
  const rendered = await res.text();
  let body;
  try { body = extract(rendered); } catch (e) { throw new Error(`${handle}: ${e.message}`); }
  // The same bounds checks extract-live-body.js makes when it writes a file. A
  // dump that silently carried theme markup would make the already-matches
  // check compare the wrong thing and re-ship a page for no reason.
  const opens = (body.match(/<div\b/g) || []).length;
  const closes = (body.match(/<\/div>/g) || []).length;
  if (opens !== closes) throw new Error(`${handle}: ${opens} div opens vs ${closes} closes, so the bounds are wrong`);
  if (/shopify-section|page-width|main-page-title/.test(body)) throw new Error(`${handle}: theme markup leaked into the body`);
  if (Buffer.byteLength(body) < 500) throw new Error(`${handle}: body is too small to be a real page`);
  return body;
}

async function main(argv) {
  const out = argv[0];
  const pairs = argv.slice(1);
  if (!out || out.startsWith('--') || !pairs.length) {
    console.error('usage: node scripts/live-pages-dump.js <out.json> <handle=Title> [<handle=Title> ...]');
    console.error('  Titles must come from an Admin API read, never from the sheet being checked.');
    process.exit(2);
  }

  const nodes = [], problems = [];
  for (const pair of pairs) {
    const eq = pair.indexOf('=');
    if (eq < 1) { problems.push(`${pair}: expected handle=Title`); continue; }
    const handle = pair.slice(0, eq).trim();
    const title = pair.slice(eq + 1).trim();
    if (!title) { problems.push(`${handle}: no title given`); continue; }
    try {
      const body = await fetchBody(handle);
      nodes.push({ handle, title, body });
      console.log(`    ${handle.padEnd(18)} ${(Buffer.byteLength(body) / 1024).toFixed(0)} KB`);
    } catch (e) { problems.push(e.message); }
  }

  if (problems.length) {
    console.error(`\n  ${problems.length} problem(s). No file written:\n`);
    problems.forEach((p) => console.error('    ' + p));
    console.error('');
    process.exit(1);
  }

  // The shape page-body-csv.js reads, which is the shape of the Admin API reply
  // it was written for.
  fs.writeFileSync(out, JSON.stringify({ data: { pages: { nodes } } }, null, 2));
  console.log(`\n  wrote ${out}  (${nodes.length} page(s))\n`);
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((e) => { console.error(e.message || e); process.exit(1); });
}
module.exports = { fetchBody };
