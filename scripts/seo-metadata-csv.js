'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE SEO METADATA SHEETS.
//
//  Turns seed/seo-rewrites.js into Matrixify import sheets, one per record type.
//
//    node scripts/seo-metadata-csv.js out/
//    node scripts/seo-metadata-csv.js out/ --live /tmp/live-titles.json
//
//  ── WHY THIS SHEET CANNOT WIPE A PAGE ───────────────────────────────────────
//  On 2026-08-22 an import blanked a live student page, and docs/shopify-page-
//  imports.md exists because of it. That import carried a `Body HTML` column.
//  Matrixify writes the columns it is given and leaves out every column it is
//  not, so the single most important property of these sheets is what is
//  MISSING from the header:
//
//      Handle, Command, SEO Title, SEO Description        <- all of it
//
//  No `Body HTML`. No `Title`. No `Published`. There is no column here that
//  could empty a page body even if every value in the file were wrong, and
//  assertHeaderIsSafe() below fails the build if one is ever added.
//
//  `Command: MERGE` is the second guard: it updates a record that exists and
//  never creates one. A typo'd handle is then a no-op rather than a new blank
//  page.
//
//  ── WHY THE BRAND IS NOT IN ANY TITLE ───────────────────────────────────────
//  See the header of seed/seo-rewrites.js. Short version: Shopify only appends
//  the store name when `global.title_tag` is unset, /pages/ap-csa proves it by
//  serving no brand at all, so the suffix is hand-typed per record and is ours
//  to drop. Dropping it is also the entire fix for the three teacher bundles
//  that carry the domain twice.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { PAGES, PRODUCTS, COLLECTIONS } = require('../seed/seo-rewrites');

// The house budget, matching scripts/csa-frq-pages-csv.js.
const TITLE_MAX = 60;
const DESC_MIN = 140;
const DESC_MAX = 160;

// Any column that can destroy content if the sheet is wrong. None of these may
// appear in a header this script writes.
const FORBIDDEN_COLUMNS = ['Body HTML', 'Body', 'Title', 'Published', 'Published At', 'Template Suffix'];

function assertHeaderIsSafe(header) {
  const bad = header.filter((c) => FORBIDDEN_COLUMNS.includes(c));
  if (bad.length) {
    throw new Error(
      `refusing to write a sheet carrying ${bad.join(', ')}. ` +
      'These sheets are metadata only; a content column here is how a live page gets blanked.');
  }
}

function csvCell(v) {
  const s = String(v === undefined || v === null ? '' : v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ── THE ROW RULES ────────────────────────────────────────────────────────────
//  A row that breaks any of these fails the whole build. A sheet that is half
//  right is worse than no sheet: it imports, and the damage is spread across
//  records nobody is looking at.
function checkRow(r, kind) {
  const bad = [];
  if (!r.handle || !/^[a-z0-9-]+$/.test(r.handle)) bad.push('handle is not a clean slug');

  if (r.title !== undefined) {
    if (!r.title.trim()) bad.push('title is empty, which would blank the stored title');
    if (r.title.length > TITLE_MAX) bad.push(`title is ${r.title.length} chars, over the ${TITLE_MAX} budget`);
    if (/apcsexamprep/i.test(r.title)) bad.push('title carries the brand, which is what the doubling defect is');
    if (/—|–/.test(r.title)) bad.push('title contains an em- or en-dash');
  }

  if (r.description !== undefined) {
    const d = r.description;
    if (!d.trim()) bad.push('description is empty, which would blank the stored description');
    if (d.length < DESC_MIN || d.length > DESC_MAX) {
      bad.push(`description is ${d.length} chars, outside ${DESC_MIN} to ${DESC_MAX}`);
    }
    if (/—|–/.test(d)) bad.push('description contains an em- or en-dash');
    if (/�/.test(d)) bad.push('description contains a replacement character');
  }

  if (r.title === undefined && r.description === undefined) {
    bad.push('row changes nothing');
  }

  // A school year that has already ended must never be written INTO the store.
  const both = `${r.title || ''} ${r.description || ''}`;
  for (const m of both.matchAll(/\b(20\d{2})\s*[-–]\s*(20\d{2}|\d{2})\b/g)) {
    const start = Number(m[1]);
    const end = m[2].length === 2 ? Number(String(start).slice(0, 2) + m[2]) : Number(m[2]);
    if (end === start + 1 && start < 2026) bad.push(`writes a school year that has ended: ${m[0]}`);
  }

  return bad.map((b) => `${kind} ${r.handle}: ${b}`);
}

// ── AN EMPTY CELL IS A DELETE, NOT A SKIP ────────────────────────────────────
//  This is the trap that nearly shipped. Matrixify writes the columns it is
//  given, and it writes them even when the value is blank: an empty
//  `SEO Description` cell CLEARS the stored description rather than leaving it
//  alone. The only way to leave a field untouched is to omit its column from
//  the header entirely.
//
//  The first version of this function emitted a fixed four-column header, so
//  the Products sheet, none of whose rows change a description, carried 13 empty
//  `SEO Description` cells. Importing it would have blanked the description on
//  every teacher bundle on the site, which is the same class of damage as the
//  2026-08-22 body wipe and from the same cause.
//
//  So the header is derived from the rows, a column appears only when EVERY row
//  in the sheet supplies it, and a sheet whose rows disagree is refused rather
//  than papered over with blanks.
function columnsFor(rows, kind) {
  const withTitle = rows.filter((r) => r.title !== undefined).length;
  const withDesc = rows.filter((r) => r.description !== undefined).length;
  const problems = [];
  const cols = ['Handle', 'Command'];

  if (withTitle === rows.length) cols.push('SEO Title');
  else if (withTitle > 0) {
    problems.push(`${kind}: ${withTitle} of ${rows.length} rows set a title. ` +
      'A column present for some rows blanks the field on the rest. Split the sheet or give every row a title.');
  }

  if (withDesc === rows.length) cols.push('SEO Description');
  else if (withDesc > 0) {
    problems.push(`${kind}: ${withDesc} of ${rows.length} rows set a description. ` +
      'A column present for some rows blanks the field on the rest. Split the sheet or give every row a description.');
  }

  return { cols, problems };
}

function buildSheet(rows, kind) {
  const problems = [];
  const seen = new Set();
  for (const r of rows) {
    if (seen.has(r.handle)) problems.push(`${kind}: duplicate handle ${r.handle}`);
    seen.add(r.handle);
    problems.push(...checkRow(r, kind));
  }

  const { cols: header, problems: colProblems } = columnsFor(rows, kind);
  problems.push(...colProblems);
  assertHeaderIsSafe(header);
  if (problems.length) return { problems, csv: null, count: 0, header: null };

  const lines = [header.join(',')];
  for (const r of rows) {
    const cell = {
      Handle: r.handle,
      Command: 'MERGE',
      'SEO Title': r.title,
      'SEO Description': r.description,
    };
    lines.push(header.map((h) => csvCell(cell[h])).join(','));
  }
  // BOM, so Excel and Sheets both read it as UTF-8.
  return { problems: [], csv: '﻿' + lines.join('\r\n') + '\r\n', count: rows.length, header };
}

function main() {
  const outDir = process.argv[2];
  if (!outDir) {
    console.error('usage: node scripts/seo-metadata-csv.js <out-dir>');
    process.exit(2);
  }
  fs.mkdirSync(outDir, { recursive: true });

  const sheets = [
    ['pages', PAGES, 'Pages'],
    ['products', PRODUCTS, 'Products'],
    ['collections', COLLECTIONS, 'Collections'],
  ];

  const allProblems = [];
  const written = [];
  for (const [name, rows, kind] of sheets) {
    const { problems, csv, count, header } = buildSheet(rows, kind);
    if (problems.length) { allProblems.push(...problems); continue; }
    const file = path.join(outDir, `seo-${name}.csv`);
    fs.writeFileSync(file, csv);
    written.push({ file, count, kind, header });
  }

  if (allProblems.length) {
    console.error(`\nREFUSING TO WRITE. ${allProblems.length} problem(s):\n`);
    for (const p of allProblems) console.error(`  ${p}`);
    console.error('\nNothing was written. Fix seed/seo-rewrites.js and re-run.\n');
    process.exit(1);
  }

  console.log('\nSEO metadata sheets\n');
  let total = 0;
  for (const w of written) {
    console.log(`  ${String(w.count).padStart(3)} rows  ${w.kind.padEnd(12)} ${w.file}`);
    console.log(`             columns: ${w.header.join(', ')}`);
    total += w.count;
  }
  console.log(`\n  ${total} records across ${written.length} sheets.`);
  console.log('  A column appears only when every row in that sheet supplies it,');
  console.log('  because an empty cell CLEARS the stored value rather than skipping it.');
  console.log('  Command is MERGE: updates what exists, never creates.\n');
  console.log('  Import order does not matter. Each sheet is independent.\n');
}

if (require.main === module) main();

module.exports = { buildSheet, checkRow, columnsFor, assertHeaderIsSafe, FORBIDDEN_COLUMNS, TITLE_MAX, DESC_MIN, DESC_MAX };
