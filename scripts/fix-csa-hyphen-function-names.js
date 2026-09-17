#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  Board 358. Repair the 19 AP CSA pages whose function NAMES contain hyphens.
//
//    node scripts/fix-csa-hyphen-function-names.js           build the sheets
//    node scripts/fix-csa-hyphen-function-names.js --check   rebuild and diff
//
//  WHAT IS WRONG. The generator that built these pages interpolated the page
//  slug into function names without converting hyphens:
//
//      function runCode_apcsa-accessmut_1() { ... }
//      function mcqAnswer_apcsa-accessmut_1(btn, chosen, correct) { ... }
//
//  A hyphen is not valid in a JavaScript identifier; it parses as minus. So
//  every one of those blocks is a SyntaxError, the browser skips it entirely,
//  and on these pages the Run button and the Check answer handler DO NOT EXIST.
//  The markup renders perfectly and the page answers 200, which is why nobody
//  reported it. Found by scripts/scan-inline-scripts.js on 2026-09-17.
//
//  WHY A BLANKET HYPHEN REPLACE WOULD BE A DISASTER. The same slug appears in
//  element ids and selectors, where the hyphens are CORRECT and load-bearing:
//
//      document.getElementById('apcsa-accessmut-sb1')
//
//  Rename that and the page breaks in a new way. So the rewrite is driven by
//  the DECLARATIONS: collect the names actually declared with `function NAME(`
//  that contain a hyphen, and rename only those exact strings, wherever they
//  appear. The call sites are in HTML onclick attributes, which is why the
//  replacement has to run over the whole body and not just the script blocks.
//
//  THE INVARIANT THAT MAKES THIS SAFE. Replacing "-" with "_" preserves length,
//  so a correct rewrite has EXACTLY the same byte count as the live body, and
//  every differing position must be a hyphen becoming an underscore inside one
//  of the target names. Anything else and the script refuses to write. A MERGE
//  import overwrites a live body with no undo, so the bar is proof rather than
//  confidence.
//
//  SPLIT SHEETS. Nineteen pages on one click is nineteen live bodies changed
//  with nothing to check in between. These ship in groups, one import at a
//  time, each with its own post-import check. See the runbook this prints.
//
//  No em-dashes, per repo convention.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');

const sf = require('../lib/storefront-fetch');
const scan = require('./scan-inline-scripts.js');

// Found by the full sitemap scan on 2026-09-17. Each is re-verified below
// before it is written, so a page somebody has already fixed drops out rather
// than being merged over with a stale body.
const HANDLES = [
  'ap-csa-accessors-mutators',
  'ap-csa-adjacent-elements',
  'ap-csa-array-initialization',
  'ap-csa-array-max-min-count',
  'ap-csa-array-shifting',
  'ap-csa-array-traversal',
  'ap-csa-arraylist-sorting',
  'ap-csa-arrays-of-objects',
  'ap-csa-casting-type-conversion',
  'ap-csa-compareto-vs-equals',
  'ap-csa-constructors',
  'ap-csa-method-signatures-return-types',
  'ap-csa-object-references-aliasing',
  'ap-csa-parallel-arrays',
  'ap-csa-pass-by-value',
  'ap-csa-searching-sorting',
  'ap-csa-static-vs-instance',
  'ap-csa-this-keyword',
  'ap-csa-writing-classes',
];

const GROUP_SIZE = 5;
const OUTDIR = path.join(__dirname, '..', 'matrixify');
const PREFIX = 'csa-hyphen-function-names';

/** Names declared as `function NAME(` that contain a hyphen. */
function brokenNames(body) {
  const names = new Set();
  for (const m of body.matchAll(/function\s+([A-Za-z_$][\w$]*(?:-[\w$]+)+)\s*\(/g)) {
    names.add(m[1]);
  }
  return [...names];
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function repair(body) {
  const names = brokenNames(body);
  if (!names.length) return { body, names: [], renames: 0 };

  let out = body;
  let renames = 0;
  // Longest first, so one name can never be rewritten as a prefix of another.
  for (const name of names.sort((a, b) => b.length - a.length)) {
    const fixed = name.replace(/-/g, '_');
    if (fixed === name) continue;
    // A collision would silently merge two different handlers into one.
    if (new RegExp('\\b' + escapeRe(fixed) + '\\b').test(out)) {
      throw new Error(`renaming ${name} to ${fixed} would collide with an identifier already on the page`);
    }
    const re = new RegExp(escapeRe(name), 'g');
    out = out.replace(re, () => { renames++; return fixed; });
  }
  return { body: out, names, renames };
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

/** Every differing byte must be a hyphen that became an underscore. */
function provableRename(live, fixed) {
  if (live.length !== fixed.length) {
    return `length changed: ${live.length} -> ${fixed.length}. A rename cannot change length.`;
  }
  let changed = 0;
  for (let i = 0; i < live.length; i++) {
    if (live[i] === fixed[i]) continue;
    if (live[i] === '-' && fixed[i] === '_') { changed++; continue; }
    return `byte ${i} changed ${JSON.stringify(live[i])} to ${JSON.stringify(fixed[i])}, which is not a hyphen becoming an underscore`;
  }
  if (!changed) return 'nothing changed';
  return null;
}

function main() {
  const check = process.argv.includes('--check');
  const built = [];
  const skipped = [];

  for (const handle of HANDLES) {
    let page;
    try { page = sf.pageBody(handle); }
    catch (e) { skipped.push([handle, 'unreachable: ' + e.message]); continue; }
    const live = page.body_html;

    const before = scan.scanBody(live);
    if (!before.findings.length) {
      skipped.push([handle, 'already passes the scan, nothing to fix']);
      continue;
    }

    let r;
    try { r = repair(live); }
    catch (e) { skipped.push([handle, 'REFUSED: ' + e.message]); continue; }

    if (!r.names.length) {
      skipped.push([handle, 'broken, but not by a hyphenated function name. Needs reading.']);
      continue;
    }

    const bad = provableRename(live, r.body);
    if (bad) { skipped.push([handle, 'REFUSED: ' + bad]); continue; }

    const after = scan.scanBody(r.body);
    if (after.findings.length) {
      skipped.push([handle, 'REFUSED: still fails the scan after the rename: ' + after.findings[0].detail]);
      continue;
    }

    built.push({ handle, body: r.body, names: r.names, renames: r.renames, bytes: live.length });
    console.log(`  ${handle}  ${r.names.length} name(s), ${r.renames} occurrence(s) renamed`);
  }

  if (skipped.length) {
    console.log('\nnot in a sheet:');
    for (const [h, why] of skipped) console.log(`  ${h}  ${why}`);
  }
  if (!built.length) { console.error('\nNothing to write.'); process.exit(3); }

  // ---- split, build, parse back -------------------------------------------
  const groups = [];
  for (let i = 0; i < built.length; i += GROUP_SIZE) groups.push(built.slice(i, i + GROUP_SIZE));

  const written = [];
  groups.forEach((group, gi) => {
    const file = path.join(OUTDIR, `${PREFIX}-${gi + 1}-of-${groups.length}-pages.csv`);
    const csv = toCsv([['Handle', 'Command', 'Body HTML'], ...group.map((p) => [p.handle, 'MERGE', p.body])]);

    const back = parseCsv(csv);
    if (back.length !== group.length + 1) throw new Error(`${file}: parsed ${back.length} rows, expected ${group.length + 1}`);
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

  // No page may appear in two sheets, and every built page must appear in one.
  const seen = new Map();
  for (const w of written) for (const p of w.group) {
    if (seen.has(p.handle)) throw new Error(`${p.handle} appears in two sheets`);
    seen.set(p.handle, w.file);
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
    console.log(`   expect: 0 findings, and Run plus Check answer working on one page by hand`);
  });
}

main();
