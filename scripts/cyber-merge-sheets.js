#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  COMBINE SINGLE-PAGE MATRIXIFY SHEETS INTO ONE, AND REFUSE WHEN IT IS NOT SAFE.
//
//    node scripts/cyber-merge-sheets.js <out.csv> <in1.csv> <in2.csv> ...
//
//  ── WHEN COMBINING IS SAFE, AND WHEN IT IS NOT ─────────────────────────────
//  A MERGE row writes the WHOLE Body HTML of the page it names. So the hazard
//  has never been "many rows in one file"; it is TWO ROWS AIMED AT ONE PAGE, in
//  this file or across two files imported in sequence. Rows for distinct pages
//  do not interact at all, and Matrixify reports per row.
//
//  This refuses the unsafe shape rather than trusting the caller to have
//  checked: two rows carrying the same page ID, or the same handle, is an error
//  and nothing is written. A `cat` of the same files cannot tell you that, and
//  would also happily produce a file with a header line in the middle.
//
//  ── WHAT IT VERIFIES ───────────────────────────────────────────────────────
//   * every input parses as RFC4180 and has exactly one data row
//   * every input has the same header
//   * page IDs are unique, handles are unique
//   * every Command is MERGE
//   * each row's Body HTML matches its sibling -preview.html byte for byte,
//     which is the file the gate and the browser driver were actually run
//     against. Without this a sheet could be hand-edited after it was verified
//     and the combined file would carry the unverified bytes.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

//  A real parser, not a split on commas: every Body HTML here contains commas,
//  quotes and newlines.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); field = ''; rows.push(row); row = []; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;

function main() {
  const [out, ...inputs] = process.argv.slice(2);
  if (!out || !inputs.length) {
    console.error('usage: node scripts/cyber-merge-sheets.js <out.csv> <in1.csv> <in2.csv> ...');
    process.exit(2);
  }
  const fail = [];
  let header = null;
  const rows = [];
  const seenId = new Map();
  const seenHandle = new Map();

  for (const file of inputs) {
    const parsed = parseCsv(fs.readFileSync(file, 'utf8'));
    if (parsed.length !== 2) {
      fail.push(`${file}: expected a header and exactly one data row, found ${parsed.length} rows`);
      continue;
    }
    const [h, r] = parsed;
    if (!header) header = h;
    else if (h.join(',') !== header.join(',')) {
      fail.push(`${file}: header differs from ${inputs[0]}`);
      continue;
    }
    const at = (name) => r[header.indexOf(name)];
    const id = at('ID');
    const handle = at('Handle');
    if (at('Command') !== 'MERGE') fail.push(`${file}: Command is ${JSON.stringify(at('Command'))}, not MERGE`);
    if (seenId.has(id)) fail.push(`${file} and ${seenId.get(id)} both write page ID ${id}: the second would silently revert the first`);
    if (seenHandle.has(handle)) fail.push(`${file} and ${seenHandle.get(handle)} both write handle ${handle}`);
    seenId.set(id, file); seenHandle.set(handle, file);

    const preview = file.replace(/\.csv$/, '-preview.html');
    if (fs.existsSync(preview)) {
      if (at('Body HTML') !== fs.readFileSync(preview, 'utf8')) {
        fail.push(`${file}: Body HTML does not match ${path.basename(preview)}, so the row is not the verified body`);
      }
    } else {
      fail.push(`${file}: no ${path.basename(preview)} beside it, so the row cannot be checked against a verified body`);
    }
    rows.push({ file, r, id, handle });
  }

  if (fail.length) {
    console.error('REFUSED, nothing written:');
    fail.forEach((f) => console.error(`  x ${f}`));
    process.exit(1);
  }

  const body = [header.map(cell).join(','), ...rows.map((x) => x.r.map(cell).join(','))].join('\n') + '\n';
  fs.writeFileSync(out, body, 'utf8');
  console.log(`${rows.length} pages -> ${out}  (${body.length} bytes)`);
  rows.forEach((x) => console.log(`  ${String(x.id).padEnd(14)} ${x.handle}`));
}

main();
