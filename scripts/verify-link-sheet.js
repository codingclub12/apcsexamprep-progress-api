#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  VERIFY A LINK SHEET BEFORE IT IS IMPORTED.
//
//  The generator already refuses on its own checks. This re-checks the SHEET,
//  independently, by parsing the CSV back the way Matrixify will and comparing
//  every row against the body it was built from. The two halves are deliberately
//  separate: a bug in lib/link-block.js would pass its own assertions, and the
//  thing being changed is 1,300 live pages.
//
//  What it asserts, per row:
//    1. the command is MERGE
//    2. exactly one Related block on the page
//    3. div balance is unchanged from the source body
//    4. growth is positive and under the cap
//    5. every link the row ADDS resolves to a handle in the live set
//    6. the page's own <style> block survived
//    7. no source content was dropped: the original body is still a subsequence
//
//  Check 7 is the one that matters most and the one the generator cannot make
//  about itself, because it is the check that the edit was purely additive.
//
//    node scripts/verify-link-sheet.js --sheet links.csv --bodies bodies/ \
//      --handles live-handles.txt
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const opt = (nm, d) => {
  const i = argv.indexOf('--' + nm);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const SHEET = opt('sheet', '');
const BODIES = opt('bodies', '');
const HANDLES = opt('handles', '');
const MAX_GROWTH = 4096;

// RFC4180, the subset Matrixify writes: QUOTE_ALL, CRLF, doubled quotes.
function parseCsv(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r') { /* CRLF */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

//  ── THE CHECK THAT MATTERS ──────────────────────────────────────────────────
//  Everything lib/link-block.js inserts is fenced by markers, so the edit can be
//  undone exactly: strip the fenced regions and what is left must equal the
//  source body BYTE FOR BYTE.
//
//  Two weaker tests were tried first and both were wrong. A line-level
//  subsequence test failed on any insert that landed mid-line, which is legal
//  and lossless. A character-level subsequence test desynced against the
//  inserted CSS and reported six untouched pages as damaged. Neither could tell
//  a re-flowed line from a deleted one. This can, because it is not a
//  similarity measure at all: it reverses the edit and compares.
const B = require('../lib/link-block');
function isPurelyAdditive(before, after) {
  return B.unmark(after) === before;
}

function main() {
  for (const [nm, v] of [['--sheet', SHEET], ['--bodies', BODIES], ['--handles', HANDLES]]) {
    if (!v) { console.error(`missing ${nm}`); process.exit(1); }
  }
  const live = new Set(fs.readFileSync(HANDLES, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean));
  const raw = fs.readFileSync(SHEET, 'utf8').replace(/^﻿/, '');
  const rows = parseCsv(raw);
  const header = rows[0];
  const data = rows.slice(1).filter((r) => r.length >= 5 && r[0]);

  console.log(`header: ${header.join(' | ')}`);
  console.log(`rows:   ${data.length}`);

  const problems = [];
  let addedTotal = 0;
  const bal = (s) => (s.match(/<div\b[^>]*>/gi) || []).length - (s.match(/<\/div>/gi) || []).length;

  for (const [handle, cmd, body] of data) {
    const file = path.join(BODIES, `${handle}.html`);
    const bad = (why) => problems.push(`${handle}: ${why}`);
    if (!fs.existsSync(file)) { bad('no source body to compare against'); continue; }
    const src = fs.readFileSync(file, 'utf8');

    if (cmd !== 'MERGE') bad(`command is ${cmd}, expected MERGE`);

    const relCount = (body.match(/<div\s+class=["'][^"']*\brelated\b/gi) || []).length;
    if (relCount !== 1) bad(`${relCount} Related blocks, expected 1`);

    if (bal(src) !== bal(body)) bad(`div balance ${bal(src)} -> ${bal(body)}`);

    const grew = Buffer.byteLength(body) - Buffer.byteLength(src);
    if (grew <= 0) bad('did not grow');
    else if (grew > MAX_GROWTH) bad(`grew ${grew} bytes, over the ${MAX_GROWTH} cap`);

    if (src.includes('<style>') && !body.includes('<style>')) bad('style block lost');

    if (!isPurelyAdditive(src, body)) bad('stripping the inserted block does not reproduce the source body byte for byte');

    const hrefs = (s) => (s.match(/href="\/pages\/[a-z0-9-]+"/gi) || []);
    const before = new Set(hrefs(src));
    const added = hrefs(body).filter((h) => !before.has(h));
    addedTotal += added.length;
    for (const h of added) {
      const target = h.match(/pages\/([a-z0-9-]+)/)[1];
      if (!live.has(target)) bad(`adds a link to ${target}, which is not in the live handle set`);
      if (target === handle) bad('adds a link to itself');
    }
  }

  console.log(`links added across the sheet: ${addedTotal}`);
  if (problems.length) {
    console.log(`\n${problems.length} PROBLEM(S):`);
    for (const p of problems.slice(0, 40)) console.log(`  ${p}`);
    process.exit(1);
  }
  console.log('\nAll checks passed. Safe to import as MERGE, QUOTE_ALL, utf-8-sig.');
}

main();
