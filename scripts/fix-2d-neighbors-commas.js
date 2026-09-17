#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  Board 354. Repair the ANSWERS object on /pages/2d-array-neighbors-ap-csa.
//
//    node scripts/fix-2d-neighbors-commas.js          build the sheet
//    node scripts/fix-2d-neighbors-commas.js --check  rebuild and diff, write nothing
//
//  WHAT IS WRONG. The page declares an eight entry ANSWERS object and SEVEN of
//  the commas between entries are missing:
//
//      q1: { correct: "C", explanation: '...' }
//      q2: { correct: "B", explanation: '...' }
//
//  That is a hard SyntaxError, so the whole 6040 byte script never runs and
//  every question on the page is dead: no marking, no explanation, nothing.
//  Live since 2026-08-20 and found by scripts/scan-inline-scripts.js on
//  2026-09-17, not by a person and not by any other check in this repo.
//
//  Seven rather than one is the tell. A single missing comma is a typo; seven
//  in a row is whatever produced the block joining its entries on "\n" instead
//  of ",\n". Worth remembering if another page in this family turns up the
//  same way.
//
//  WHY THE FIX IS COMPUTED AND NOT TYPED. The body is 30,276 bytes of live
//  page. Retyping any of it risks changing a byte nobody meant to change, and
//  a MERGE import overwrites the live body with no undo. So the sheet is built
//  FROM the live body, the edit is a regex confined to the ANSWERS object, and
//  the script asserts that the ONLY difference between live and shipped is
//  seven inserted commas. Anything else and it refuses to write.
//
//  No em-dashes, per repo convention.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');

const sf = require('../lib/storefront-fetch');
const scan = require('./scan-inline-scripts.js');

const HANDLE = '2d-array-neighbors-ap-csa';
const OUT = path.join(__dirname, '..', 'matrixify', 'csa-2d-neighbors-answers-commas-pages.csv');

// Only between two entries of an object literal whose keys are q1..q9, and only
// inside the ANSWERS declaration. A comma is inserted after the closing brace
// of an entry when the next non-space thing is another qN key.
function repairAnswers(body) {
  const start = body.indexOf('var ANSWERS');
  if (start === -1) throw new Error('no ANSWERS declaration on this page');
  const end = body.indexOf('};', start);
  if (end === -1) throw new Error('ANSWERS declaration is not terminated');

  const region = body.slice(start, end + 2);
  const repaired = region.replace(/\}\s*\n(\s*)(q\d+\s*:)/g, (m, indent, key) => '},\n' + indent + key);
  return { body: body.slice(0, start) + repaired + body.slice(end + 2), region, repaired };
}

// QUOTE_ALL, doubled quotes, CRLF between records, BOM. Matches the sheets
// already in matrixify/.
function toCsv(rows) {
  const cell = (v) => '"' + String(v).replace(/"/g, '""') + '"';
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

// A real parse back, not a regex. This is the half that catches a generator
// that quietly dropped or mangled bytes, which is the failure the CSP sheet
// shipped with while every semantic check passed.
function parseCsv(text) {
  const s = text.replace(/^﻿/, '');
  const rows = [];
  let row = [], field = '', i = 0, inQuotes = false;
  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r' && s[i + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ''; i += 2; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function main() {
  const check = process.argv.includes('--check');

  const page = sf.pageBody(HANDLE);
  const live = page.body_html;
  console.log(`live body: ${live.length} bytes, updated_at ${page.updated_at}`);

  // It must actually be broken. If somebody has already fixed it, say so and
  // write nothing: a stale sheet MERGED over a repaired page is how a fix gets
  // reverted, and this repo has already nearly paid for that once.
  const beforeScan = scan.scanBody(live);
  if (!beforeScan.findings.length) {
    console.log('\nThis page already passes the inline script scan. Nothing to fix.');
    console.log('Do NOT import an older sheet over it. Delete the sheet instead.');
    process.exit(3);
  }
  console.log(`before: ${beforeScan.findings.length} finding(s)`);
  for (const f of beforeScan.findings) console.log(`  [${f.rule}] ${f.detail}`);

  const { body: fixed } = repairAnswers(live);

  // ---- the only difference may be inserted commas -------------------------
  const inserted = [];
  let li = 0, fi = 0;
  while (li < live.length && fi < fixed.length) {
    if (live[li] === fixed[fi]) { li++; fi++; continue; }
    inserted.push(fixed[fi]);
    fi++;
  }
  const tailOk = li === live.length && fi === fixed.length;
  const allCommas = inserted.length > 0 && inserted.every((c) => c === ',');
  if (!tailOk || !allCommas) {
    console.error('\nREFUSING TO WRITE. The rewrite changed something other than commas.');
    console.error(`  inserted ${inserted.length} char(s): ${JSON.stringify(inserted.join(''))}`);
    console.error(`  consumed live ${li}/${live.length}, fixed ${fi}/${fixed.length}`);
    process.exit(2);
  }
  console.log(`\nedit: ${inserted.length} comma(s) inserted, ${live.length} -> ${fixed.length} bytes`);

  // ---- and the script must now compile ------------------------------------
  const afterScan = scan.scanBody(fixed);
  if (afterScan.findings.length) {
    console.error('\nREFUSING TO WRITE. The page still fails the scan after the repair:');
    for (const f of afterScan.findings) console.error(`  [${f.rule}] ${f.detail}`);
    process.exit(2);
  }
  console.log('after : 0 findings, every executable inline script compiles');

  // ---- build, then PARSE IT BACK ------------------------------------------
  const csv = toCsv([['Handle', 'Command', 'Body HTML'], [HANDLE, 'MERGE', fixed]]);
  const back = parseCsv(csv);

  const problems = [];
  if (back.length !== 2) problems.push(`expected 2 rows, parsed ${back.length}`);
  if (back[0].join(',') !== 'Handle,Command,Body HTML') problems.push('header changed');
  if (back[1] && back[1][0] !== HANDLE) problems.push('handle changed');
  if (back[1] && back[1][1] !== 'MERGE') problems.push('command is not MERGE');
  if (back[1] && back[1][2] !== fixed) {
    problems.push(`body did not survive the round trip (${back[1][2].length} vs ${fixed.length})`);
  }
  if (problems.length) {
    console.error('\nREFUSING TO WRITE. Parse-back diff failed:');
    for (const p of problems) console.error('  ' + p);
    process.exit(2);
  }
  console.log('parse-back: 2 rows, body byte-identical to the repaired body');

  if (check) {
    const have = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
    if (have === csv) { console.log(`\n${path.basename(OUT)} is up to date.`); return; }
    console.error('\nThe committed sheet does not match what the live page produces now.');
    console.error('Regenerate it, and re-read the page before importing.');
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, csv);
  console.log(`\nwrote ${path.relative(path.join(__dirname, '..'), OUT)}  (${csv.length} bytes)`);
  console.log('\nIMPORT: Matrixify, MERGE, one import, this file alone.');
  console.log('AFTER : node scripts/scan-inline-scripts.js ' + HANDLE);
  console.log('        must report 0 findings, and the page must mark an answer.');
}

main();
