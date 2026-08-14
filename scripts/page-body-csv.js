'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  MATRIXIFY PAGES SHEET, BUILT FROM THE REPO MIRRORS
//
//  WHAT THIS IS FOR
//  The storefront pages in shopify/ are edited here and shipped to Shopify as a
//  Matrixify Pages import. This builds that sheet: one row per page, Handle plus
//  Command plus Title plus Body HTML, UTF-8 with a BOM so Excel does not mangle
//  the copy.
//
//  WHY IT IS A SCRIPT AND NOT A COPY AND PASTE
//  An import REPLACES the whole Body HTML of the page it names. Hand-assembling
//  that sheet is the one step where a stale file or a wrong handle silently
//  overwrites a live page, so the checks below run first and the file is not
//  written if any of them fails:
//
//    1. Every handle named must be a page that exists (checked against a live
//       dump when one is supplied) and the title in the sheet must match the
//       live title, so an import never renames a page as a side effect.
//    2. A page whose live body already matches the repo is DROPPED from the
//       sheet. An import that changes nothing is pure risk: it can clobber an
//       edit made since the dump was pulled.
//    3. No replacement characters and no raw mojibake in the body, the defect
//       the encoding guard exists for.
//    4. No em-dashes, per repo convention.
//
//  Zero PII: author content only.
//  No em-dashes, per repo convention.
//
//  Run:
//    node scripts/page-body-csv.js <out.csv> [--only handle,handle] [--live <pages.json>]
//
//  <pages.json> is the raw result of a Shopify Admin API pages query; both the
//  `nodes` and the `edges` shapes are read.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// The pages this repo is the source for, with the live handle and title each
// one must import against. A page is listed here only once its handle and title
// have been read back from the store: a guessed handle creates a NEW page, and a
// guessed title renames a real one.
const PAGES = [
  { handle: 'cyber-dashboard', title: 'Teacher Dashboard', file: 'shopify/cyber-dashboard.html' },
  { handle: 'my-progress',     title: 'My Progress',       file: 'shopify/my-progress.html' },
  { handle: 'cyber-class',     title: 'Teacher Portal',    file: 'shopify/cyber-class.html' },
];

// Shopify DECODES entities when it stores a body: `&#9662;` comes back as the
// character itself. A raw comparison against the repo file therefore never
// matches after an import, which quietly defeated the already-matches check and
// would have re-shipped every page on every run. Both sides are normalised to
// the characters before comparing, so the check compares what a browser renders
// rather than how it was spelled.
function renderable(s) {
  return String(s == null ? '' : s)
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d)))
    .split('&ndash;').join('–')
    .split('&mdash;').join('—')
    .replace(/\r\n/g, '\n')
    .replace(/\s+$/, '');
}

function readLive(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const p = j && j.data && j.data.pages;
  const nodes = p ? (p.nodes || (p.edges || []).map((e) => e.node)) : [];
  const by = new Map();
  for (const n of nodes) if (n && n.handle) by.set(n.handle, n);
  return by;
}

function main(argv) {
  const out = argv[0];
  if (!out || out.startsWith('--')) {
    console.error('usage: node scripts/page-body-csv.js <out.csv> [--only handle,handle] [--live <pages.json>]');
    process.exit(2);
  }
  const onlyAt = argv.indexOf('--only');
  const only = onlyAt === -1 ? null : new Set(argv[onlyAt + 1].split(','));
  const liveAt = argv.indexOf('--live');
  const live = liveAt === -1 ? null : readLive(argv[liveAt + 1]);

  const chosen = PAGES.filter((p) => !only || only.has(p.handle));
  if (!chosen.length) { console.error('no pages selected'); process.exit(2); }

  const rows = [], problems = [], unchanged = [];
  for (const p of chosen) {
    const full = path.join(ROOT, p.file);
    if (!fs.existsSync(full)) { problems.push(`${p.handle}: ${p.file} does not exist`); continue; }
    const body = fs.readFileSync(full, 'utf8');
    if (body.trim().length < 200) { problems.push(`${p.handle}: ${p.file} is suspiciously short`); continue; }
    if (body.includes('�')) problems.push(`${p.handle}: body contains a replacement character`);
    if (/Ã[-¿]|â€|Â[ -¿]/.test(body)) problems.push(`${p.handle}: body contains mojibake`);
    if (body.includes('—')) problems.push(`${p.handle}: body contains an em-dash`);
    if (live) {
      const n = live.get(p.handle);
      if (!n) { problems.push(`${p.handle}: no live page with that handle`); continue; }
      if (n.title !== p.title) {
        problems.push(`${p.handle}: live title is ${JSON.stringify(n.title)}, sheet would set ${JSON.stringify(p.title)}`);
        continue;
      }
      if (renderable(n.body) === renderable(body)) {
        unchanged.push(p.handle);
        continue;
      }
    }
    rows.push({ handle: p.handle, title: p.title, body, bytes: Buffer.byteLength(body) });
  }

  if (problems.length) {
    console.error('\n  ' + problems.length + ' problem(s). No file written:\n');
    for (const m of problems) console.error('    ' + m);
    console.error('');
    process.exit(1);
  }
  if (!rows.length) {
    console.log('\n  every selected page already matches the live body. Nothing to import.\n');
    return;
  }

  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const csv = [['Handle', 'Command', 'Title', 'Body HTML'].join(',')]
    .concat(rows.map((r) => [cell(r.handle), cell('UPDATE'), cell(r.title), cell(r.body)].join(',')))
    .join('\r\n') + '\r\n';
  fs.writeFileSync(out, '﻿' + csv);

  for (const r of rows) console.log(`    ${r.handle.padEnd(18)} ${r.title.padEnd(20)} ${(r.bytes / 1024).toFixed(0)} KB`);
  if (unchanged.length) console.log(`\n  ${unchanged.length} page(s) already match the live body, left out of the sheet: ${unchanged.join(', ')}`);
  console.log(`\n  wrote ${out}  (${rows.length} page(s), ${(Buffer.byteLength(csv) / 1024).toFixed(0)} KB)\n`);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { PAGES };
