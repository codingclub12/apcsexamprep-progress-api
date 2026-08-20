'use strict';
// -----------------------------------------------------------------------------
//  Merge several Matrixify sheets into one.
//
//  ── WHY ─────────────────────────────────────────────────────────────────────
//  A night's work produced a dozen single-page sheets. Twelve imports is twelve
//  chances to import the wrong one, in the wrong order, or twice. Matrixify is
//  happy with a multi-row sheet and reports per row, so the same changes land in
//  one pass with one place to look if something is wrong.
//
//  What it will NOT do is merge sheets that must not land together. The
//  answer-key gate sheets depend on /api/files being deployed first; merging
//  those in with the style fixes would destroy the one ordering constraint that
//  actually matters. That separation is the caller's to make, and the refusals
//  below exist so a mistake is loud.
//
//  ── WHAT IT REFUSES ─────────────────────────────────────────────────────────
//    - two sheets carrying the same handle, which would import a page twice with
//      no way to know which body wins
//    - a sheet whose header differs from the first one's
//    - an empty body, which would blank a live page
//    - a row whose Command is not MERGE
//
//  Run: node scripts/merge-matrixify.js <out.csv> <in1.csv> <in2.csv> ...
// -----------------------------------------------------------------------------

const fs = require('fs');

// Matrixify sheets here are QUOTE_ALL with CRLF line endings and a utf-8-sig BOM.
function parse(text) {
  const rows = [];
  let f = [], cur = '', inq = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inq) {
      if (c === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else inq = false; }
      else cur += c;
    } else if (c === '"') inq = true;
    else if (c === ',') { f.push(cur); cur = ''; }
    else if (c === '\r') { /* part of CRLF */ }
    else if (c === '\n') { f.push(cur); rows.push(f); f = []; cur = ''; }
    else cur += c;
  }
  if (cur || f.length) { f.push(cur); rows.push(f); }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

function main(argv) {
  const [out, ...inputs] = argv;
  if (!out || inputs.length < 2) {
    console.error('usage: node scripts/merge-matrixify.js <out.csv> <in1.csv> <in2.csv> ...');
    process.exit(2);
  }
  const problems = [];
  let header = null;
  const rows = [];
  const seen = new Map();

  for (const file of inputs) {
    if (!fs.existsSync(file)) { problems.push(`missing sheet: ${file}`); continue; }
    const parsed = parse(fs.readFileSync(file, 'utf8'));
    if (parsed.length < 2) { problems.push(`${file}: no data rows`); continue; }
    const [h, ...body] = parsed;
    if (!header) header = h;
    else if (JSON.stringify(h) !== JSON.stringify(header)) {
      problems.push(`${file}: header differs from the first sheet`);
      continue;
    }
    const hi = header.indexOf('Handle');
    const bi = header.indexOf('Body HTML');
    const ci = header.indexOf('Command');
    for (const r of body) {
      const handle = r[hi];
      if (seen.has(handle)) { problems.push(`${handle} appears in both ${seen.get(handle)} and ${file}`); continue; }
      if (!r[bi] || !r[bi].trim()) { problems.push(`${handle}: empty body would blank the live page`); continue; }
      if (r[ci] !== 'MERGE') { problems.push(`${handle}: Command is ${r[ci]}, expected MERGE`); continue; }
      seen.set(handle, file);
      rows.push(r);
    }
  }

  if (problems.length) {
    console.error(`\n  ${problems.length} problem(s). No file written:\n`);
    problems.forEach((p) => console.error('    ' + p));
    console.error('');
    process.exit(1);
  }

  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const lines = [header.map(cell).join(',')];
  rows.forEach((r) => lines.push(r.map(cell).join(',')));
  fs.writeFileSync(out, '﻿' + lines.join('\r\n') + '\r\n');
  console.log(`    ${rows.length} pages from ${inputs.length} sheets`);
  rows.forEach((r) => console.log(`      ${r[header.indexOf('Handle')]}`));
  console.log(`\n  wrote ${out}  (${(fs.statSync(out).size / 1024).toFixed(0)} KB)\n`);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { parse };
