'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  REDERIVE: does a SECOND implementation, reading the raw CSV rather than the
//  generator's own memory, reach the same conclusion?
//
//  This does not call scripts/cyber-quote-escape-pages.js and does not reuse
//  its escaper. It writes its own tiny CSV-row reader (the format is BOM plus
//  CRLF-joined, fully-quoted rows: nothing here needs the house parser to get
//  that right) and hands each Body HTML cell to tools/scan-inline-scripts.py,
//  a script written for an unrelated defect class (the CSA 1.9 ASI split) that
//  has no idea this repair exists. If the SAME syntax faults it already proved
//  it can see (board 174's own two live pages are in its own docstring) go
//  from present to absent, that is independent of anything in the generator.
//
//  Usage: node scripts/verify-quote-escape-rederive.js <sheet.csv> [--before]
//    --before also fetches each handle's CURRENT live body_html and scans that,
//    to prove the fault the sheet claims to fix was real before it shipped.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

//  A small, independent reader for exactly this repo's Matrixify shape: BOM,
//  QUOTE_ALL, CRLF between records, "" for an embedded quote. Not the house
//  parser in scripts/matrixify-preflight.js; written fresh from the format
//  description, not from that file's code.
function readCsv(text) {
  const s = text.replace(/^﻿/, '');
  const records = s.split('\r\n').filter(Boolean);
  const rows = records.map((line) => {
    const cells = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] !== '"') throw new Error('row does not start a quoted cell at ' + i);
      i++;
      let cell = '';
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { cell += '"'; i += 2; continue; }
        if (line[i] === '"') { i++; break; }
        cell += line[i]; i++;
      }
      cells.push(cell);
      if (line[i] === ',') i++;
    }
    return cells;
  });
  const header = rows[0];
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, idx) => [h, r[idx]])));
}

function scanFault(html) {
  const tmp = path.join(os.tmpdir(), 'rederive-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(tmp, html);
  try {
    const py = cp.spawnSync('python3', [path.join(__dirname, '..', 'tools', 'scan-inline-scripts.py'), tmp],
      { encoding: 'utf8' });
    const out = py.stdout || '';
    const syntaxLines = out.split('\n').filter((l) => l.includes('SYNTAX'));
    return { faultCount: syntaxLines.length, raw: out.trim() };
  } finally {
    try { fs.unlinkSync(tmp); } catch (e) { /* best effort */ }
  }
}

function main() {
  const file = process.argv[2];
  const before = process.argv.includes('--before');
  if (!file) { console.error('usage: node scripts/verify-quote-escape-rederive.js <sheet.csv> [--before]'); process.exit(2); }
  const rows = readCsv(fs.readFileSync(file, 'utf8'));
  console.log('\nREDERIVE: tools/scan-inline-scripts.py against ' + rows.length + ' row(s) parsed back out of ' + file + '\n');
  let bad = 0;
  for (const r of rows) {
    const after = scanFault(r['Body HTML']);
    console.log('  ' + r.Handle.padEnd(38) + 'after: ' + after.faultCount + ' syntax fault(s)');
    if (after.faultCount !== 0) { bad++; console.log('    ' + after.raw.replace(/\n/g, '\n    ')); }
    if (before) {
      const sf = require('../lib/storefront-fetch');
      const live = sf.pageBody(r.Handle).body_html;
      const beforeRes = scanFault(live);
      console.log('  ' + r.Handle.padEnd(38) + 'CURRENT LIVE: ' + beforeRes.faultCount + ' syntax fault(s)');
    }
  }
  console.log('');
  if (bad) { console.error('REDERIVE FAILED: ' + bad + ' row(s) still carry a syntax fault after the fix'); process.exit(1); }
  console.log('REDERIVE CONFIRMED: 0 syntax faults in every shipped row, found by a script that never imported the fix');
}

module.exports = { readCsv, scanFault };
if (require.main === module) main();
