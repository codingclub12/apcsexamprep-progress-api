#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  Board 354. Repair the 9 AP CSA pages whose ANSWERS object is missing every
//  comma between its entries.
//
//    node scripts/fix-csa-answers-commas.js           build the sheets
//    node scripts/fix-csa-answers-commas.js --check   rebuild and diff
//
//  WHAT IS WRONG.
//
//      q1: { correct: "C", explanation: '...' }
//      q2: { correct: "B", explanation: '...' }
//
//  No comma after the q1 entry, or after any of the others. That is a hard
//  SyntaxError, so the whole quiz block never runs and every question on the
//  page is dead: no marking, no explanation, nothing. The markup renders
//  perfectly and the page answers 200, which is why none of these was reported.
//
//  SEVEN MISSING COMMAS PER PAGE, NOT ONE, and the same shape on nine pages.
//  That is not a typo, it is whatever built these blocks joining entries on
//  "\n" instead of ",\n". Found by scripts/scan-inline-scripts.js on 2026-09-17
//  (board 175), not by a person and not by any other check in this repo.
//
//  SUPERSEDES scripts/fix-2d-neighbors-commas.js, which did this for one page
//  before the full site scan showed there were nine. Same method, same
//  refusals, one tool.
//
//  WHY THE FIX IS COMPUTED AND NOT TYPED. These bodies run to tens of
//  thousands of bytes and a MERGE import overwrites a live body with no undo.
//  Retyping any of it risks changing a byte nobody meant to change. So each
//  sheet is built FROM the live body, the edit is confined to the ANSWERS
//  declaration, and the script refuses to write unless the ONLY difference is
//  inserted commas and the page scans clean afterwards.
//
//  No em-dashes, per repo convention.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');

const sf = require('../lib/storefront-fetch');
const scan = require('./scan-inline-scripts.js');

// From the full sitemap scan, 2026-09-17. Every one is re-verified below.
const HANDLES = [
  '2d-array-neighbors-ap-csa',
  'array-algorithms-ap-csa',
  'constructors-in-ap-csa',
  'encapsulation-access-modifiers-ap-csa',
  'getters-setters-ap-csa',
  'linear-search-ap-csa',
  'sorting-algorithms-ap-csa',
  'static-vs-instance-variables-ap-csa',
  'tostring-equals-ap-csa',
];

const GROUP_SIZE = 5;
const OUTDIR = path.join(__dirname, '..', 'matrixify');
const PREFIX = 'csa-answers-commas';

/** Insert a comma after an entry's closing brace when another qN key follows. */
function repair(body) {
  const start = body.indexOf('var ANSWERS');
  if (start === -1) return null;
  const end = body.indexOf('};', start);
  if (end === -1) return null;
  const region = body.slice(start, end + 2);
  const repaired = region.replace(/\}\s*\n(\s*)(q\d+\s*:)/g, (m, indent, key) => '},\n' + indent + key);
  return body.slice(0, start) + repaired + body.slice(end + 2);
}

/** Every inserted byte must be a comma, and nothing may be removed. */
function provableInsert(live, fixed) {
  const inserted = [];
  let li = 0, fi = 0;
  while (li < live.length && fi < fixed.length) {
    if (live[li] === fixed[fi]) { li++; fi++; continue; }
    inserted.push(fixed[fi]);
    fi++;
  }
  if (li !== live.length || fi !== fixed.length) {
    return `the rewrite is not a pure insertion (consumed ${li}/${live.length} and ${fi}/${fixed.length})`;
  }
  if (!inserted.length) return 'nothing changed';
  if (!inserted.every((c) => c === ',')) {
    return `inserted something other than a comma: ${JSON.stringify(inserted.join(''))}`;
  }
  return null;
}

function toCsv(rows) {
  const cell = (v) => '"' + String(v).replace(/"/g, '""') + '"';
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

function parseCsv(text) {
  const s = text.replace(/^﻿/, '');
  const rows = []; let row = [], field = '', i = 0, q = false;
  while (i < s.length) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i += 2; continue; } q = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { q = true; i++; continue; }
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
  const built = [], skipped = [];

  for (const handle of HANDLES) {
    let page;
    try { page = sf.pageBody(handle); }
    catch (e) { skipped.push([handle, 'unreachable: ' + e.message]); continue; }
    const live = page.body_html;

    if (!scan.scanBody(live).findings.length) {
      skipped.push([handle, 'already passes the scan. Do not import an older sheet over it.']);
      continue;
    }

    const fixed = repair(live);
    if (fixed === null) { skipped.push([handle, 'no ANSWERS declaration to repair']); continue; }

    const bad = provableInsert(live, fixed);
    if (bad) { skipped.push([handle, 'REFUSED: ' + bad]); continue; }

    const after = scan.scanBody(fixed);
    if (after.findings.length) {
      skipped.push([handle, 'REFUSED: still fails after the repair: ' + after.findings[0].detail]);
      continue;
    }

    const commas = fixed.length - live.length;
    built.push({ handle, body: fixed, commas, bytes: live.length });
    console.log(`  ${handle}  ${commas} comma(s), ${live.length} -> ${fixed.length} bytes`);
  }

  if (skipped.length) {
    console.log('\nnot in a sheet:');
    for (const [h, why] of skipped) console.log(`  ${h}  ${why}`);
  }
  if (!built.length) { console.error('\nNothing to write.'); process.exit(3); }

  const groups = [];
  for (let i = 0; i < built.length; i += GROUP_SIZE) groups.push(built.slice(i, i + GROUP_SIZE));

  const written = [];
  groups.forEach((group, gi) => {
    const file = path.join(OUTDIR, `${PREFIX}-${gi + 1}-of-${groups.length}-pages.csv`);
    const csv = toCsv([['Handle', 'Command', 'Body HTML'], ...group.map((p) => [p.handle, 'MERGE', p.body])]);

    const back = parseCsv(csv);
    if (back.length !== group.length + 1) throw new Error(`${file}: parsed ${back.length} rows`);
    group.forEach((p, i) => {
      if (back[i + 1][0] !== p.handle) throw new Error(`${file}: row ${i} handle changed`);
      if (back[i + 1][1] !== 'MERGE') throw new Error(`${file}: row ${i} is not MERGE`);
      if (back[i + 1][2] !== p.body) throw new Error(`${file}: row ${i} body did not survive the round trip`);
    });

    if (check) {
      const have = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
      if (have !== csv) { console.error(`\n${path.basename(file)} is out of date.`); process.exitCode = 1; }
    } else {
      fs.mkdirSync(OUTDIR, { recursive: true });
      fs.writeFileSync(file, csv);
    }
    written.push({ file, group });
  });

  const seen = new Set();
  for (const w of written) for (const p of w.group) {
    if (seen.has(p.handle)) throw new Error(`${p.handle} appears in two sheets`);
    seen.add(p.handle);
  }
  if (seen.size !== built.length) throw new Error(`split lost a page: ${seen.size} of ${built.length}`);
  console.log(`\nsplit is lossless: ${seen.size} page(s) across ${written.length} sheet(s), none duplicated`);

  if (check) { if (!process.exitCode) console.log('sheets are up to date.'); return; }

  console.log('\n--- RUNBOOK, one import per step, MERGE, in this order ---');
  written.forEach((w, i) => {
    console.log(`\n${i + 1}. import ${path.basename(w.file)}   (${w.group.length} pages)`);
    for (const p of w.group) console.log(`      ${p.handle}`);
    console.log('   then: node scripts/scan-inline-scripts.js \\');
    console.log('           ' + w.group.map((p) => p.handle).join(' \\\n           '));
    console.log('   expect: 0 findings, and answering one question on one page by hand');
  });
}

main();
