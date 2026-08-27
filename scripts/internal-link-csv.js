#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  INTERNAL LINK SHEET - turn a link plan into a Matrixify import.
//
//  The last mile. Reads the plan, reads the stored bodies off disk, runs each
//  one through lib/link-block.js, and writes ONE sheet. Nothing here touches
//  the storefront: a sheet is reviewable before it lands, re-runnable in MERGE
//  mode after a partial import, and it is the path this repo's conventions
//  require for every page change.
//
//  ── THE LIVE HANDLE SET IS NOT OPTIONAL ─────────────────────────────────────
//  Passed in, never inferred. The plan was built from a crawl, and a crawl is a
//  snapshot; a page unpublished since then would be linked into a 404 on every
//  page the sheet touches. The sheet is only as safe as this list is fresh, so
//  take it from the sitemap in the same sitting.
//
//  ── BATCHING ────────────────────────────────────────────────────────────────
//  --limit exists because a 1,300-row sheet is not reviewable and Matrixify
//  imports are easier to reason about in course-sized batches. What gets
//  dropped by a limit is REPORTED, never silent, so a partial pass cannot read
//  as a complete one.
//
//    node scripts/internal-link-csv.js --plan plan.json --bodies bodies/ \
//      --handles live-handles.txt --out links.csv [--only ap-csa] [--limit 50]
//
//  Import settings: MERGE, QUOTE_ALL, utf-8-sig. Snapshot the live pages first.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const B = require('../lib/link-block');

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf('--' + n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const PLAN = opt('plan', '');
const BODIES = opt('bodies', '');
const HANDLES = opt('handles', '');
const OUT = opt('out', '');
const ONLY = opt('only', '');
const LIMIT = Number(opt('limit', '0'));
const PUBLISHED_AT = '2026-03-01 12:00:00';

const cell = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;

function main() {
  for (const [name, v] of [['--plan', PLAN], ['--bodies', BODIES], ['--handles', HANDLES], ['--out', OUT]]) {
    if (!v) { console.error(`missing ${name}`); process.exit(1); }
  }
  const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
  const live = new Set(fs.readFileSync(HANDLES, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean));
  console.log(`live handle set: ${live.size} handles`);

  let entries = Object.entries(plan);
  if (ONLY) entries = entries.filter(([h]) => h.startsWith(ONLY));

  const rows = [];
  const skipped = { noBody: [], noChange: [], refused: [], capped: [] };
  let addedTotal = 0;
  const droppedGhosts = new Set();

  for (const [handle, links] of entries) {
    if (LIMIT && rows.length >= LIMIT) { skipped.capped.push(handle); continue; }
    const file = path.join(BODIES, `${handle}.html`);
    if (!fs.existsSync(file)) { skipped.noBody.push(handle); continue; }
    const body = fs.readFileSync(file, 'utf8');
    let res;
    try {
      res = B.build(body, links, live, { selfHandle: handle });
    } catch (e) {
      skipped.refused.push({ handle, why: e.message });
      continue;
    }
    for (const d of res.dropped) if (d.why === 'handle not in live set') droppedGhosts.add(d.handle);
    if (!res.changed) { skipped.noChange.push(handle); continue; }
    rows.push({ handle, body: res.body, added: res.added, hadBlock: res.hadBlock });
    addedTotal += res.added.length;
  }

  const header = ['Handle', 'Command', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(cell).join(',')];
  for (const r of rows) lines.push([r.handle, 'MERGE', r.body, 'TRUE', PUBLISHED_AT].map(cell).join(','));
  fs.writeFileSync(OUT, `﻿${lines.join('\r\n')}\r\n`);

  console.log(`\n${rows.length} pages in the sheet, ${addedTotal} links added`);
  console.log(`  extended an existing Related block: ${rows.filter((r) => r.hadBlock).length}`);
  console.log(`  created one:                        ${rows.filter((r) => !r.hadBlock).length}`);
  console.log(`\nnot in the sheet:`);
  console.log(`  no body fetched:        ${skipped.noBody.length}`);
  console.log(`  nothing left to add:    ${skipped.noChange.length}`);
  console.log(`  REFUSED by the checks:  ${skipped.refused.length}`);
  for (const r of skipped.refused.slice(0, 20)) console.log(`      ${r.handle}: ${r.why}`);
  if (LIMIT) console.log(`  held back by --limit:   ${skipped.capped.length}`);
  if (droppedGhosts.size) {
    console.log(`\n${droppedGhosts.size} planned targets were dropped as not-live (never rendered):`);
    for (const g of Array.from(droppedGhosts).slice(0, 15)) console.log(`      ${g}`);
  }
  const bytes = fs.statSync(OUT).size;
  console.log(`\nwrote ${OUT}  (${(bytes / 1024).toFixed(0)} KB)`);
  if (bytes > 58 * 1024 * 1024) console.log('  WARNING: over the 58 MB single-push ceiling, split it.');
  console.log('\nImport settings: MERGE, QUOTE_ALL, utf-8-sig. Snapshot the live pages first.\n');
}

main();
