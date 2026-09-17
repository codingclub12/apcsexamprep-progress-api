#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  Board 359. The 10 AP CSA pages that carry a SECOND defect under the
//  hyphenated function names of board 358, and so need both fixes together.
//
//    node scripts/fix-csa-apostrophe-strings.js           build the sheets
//    node scripts/fix-csa-apostrophe-strings.js --check   rebuild and diff
//
//  WHY BOTH AT ONCE. scripts/fix-csa-hyphen-function-names.js refused these ten
//  because renaming alone left them still broken. Shipping the rename on its own
//  would have produced ten pages that LOOK repaired, pass a casual glance, and
//  are still dead for a student. So this generator applies every transform a
//  page needs and ships it only when it scans completely clean.
//
//  THREE TRANSFORMS, each provable on its own:
//
//   1. HYPHENS IN FUNCTION NAMES (board 358's defect, present on all ten)
//        function runCode_apcsa-accessmut_1()
//      A hyphen parses as minus. Renames are driven by the declarations, never
//      by a blanket replace, because the same slug appears in element ids where
//      the hyphens are correct: getElementById('apcsa-accessmut-sb1').
//      Provable because "-" to "_" preserves length.
//
//   2. QUOTES INSIDE A SINGLE-QUOTED STRING (8 pages)
//        fb.innerHTML = 'Correct! An accessor must return the variable's type';
//        fb.innerHTML = 'Correct! 'C' has Unicode value 67; 'c' has 99.';
//      The apostrophe ends the string early. COUNTING QUOTES DOES NOT FIND
//      THESE: the second example has an even number on the line and parses no
//      better for it, and a parity check called two of these pages clean. So
//      the boundaries are taken structurally, from the assignment shape, and
//      every unescaped quote between them is escaped.
//      Provable because it only ever INSERTS backslashes.
//
//   3. A STRAY CLOSING BRACE (2 pages)
//        opts.forEach(function(o){ ... ;} });
//      One brace too many before the call closes. The needle is exact and
//      occurs once per page, checked rather than assumed.
//      Provable because it only ever DELETES that one known substring.
//
//  A MERGE import overwrites a live body with no undo, so each step is checked
//  for its own shape of change and the page must scan clean at the end. Any
//  surprise and the page is dropped rather than shipped.
//
//  No em-dashes, per repo convention.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');

const sf = require('../lib/storefront-fetch');
const scan = require('./scan-inline-scripts.js');

const HANDLES = [
  'ap-csa-accessors-mutators',
  'ap-csa-adjacent-elements',
  'ap-csa-array-shifting',
  'ap-csa-array-traversal',
  'ap-csa-casting-type-conversion',
  'ap-csa-compareto-vs-equals',
  'ap-csa-method-signatures-return-types',
  'ap-csa-searching-sorting',
  'ap-csa-static-vs-instance',
  'ap-csa-this-keyword',
];

const STRAY_BRACE = "o.style.fontWeight='';} });";
const STRAY_BRACE_FIXED = "o.style.fontWeight='';});";

const GROUP_SIZE = 5;
const OUTDIR = path.join(__dirname, '..', 'matrixify');
const PREFIX = 'csa-apostrophe-and-hyphen';

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ---- 1. hyphens in declared function names --------------------------------
function renameHyphenNames(body) {
  const names = new Set();
  for (const m of body.matchAll(/function\s+([A-Za-z_$][\w$]*(?:-[\w$]+)+)\s*\(/g)) names.add(m[1]);
  let out = body;
  for (const name of [...names].sort((a, b) => b.length - a.length)) {
    const fixed = name.replace(/-/g, '_');
    if (new RegExp('\\b' + escapeRe(fixed) + '\\b').test(out)) {
      throw new Error(`renaming ${name} to ${fixed} would collide with an existing identifier`);
    }
    out = out.replace(new RegExp(escapeRe(name), 'g'), fixed);
  }
  return out;
}

function provableRename(a, b) {
  if (a.length !== b.length) return `length changed ${a.length} -> ${b.length}`;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    if (a[i] === '-' && b[i] === '_') continue;
    return `byte ${i} changed ${JSON.stringify(a[i])} to ${JSON.stringify(b[i])}`;
  }
  return null;
}

// ---- 2. unescaped quotes inside a single-quoted assignment ----------------
// The boundaries come from the shape of the statement, not from counting
// quotes, because the even-parity cases parse exactly as badly as the odd ones.
const ASSIGN = /^(\s*[A-Za-z_$][\w$.]*\s*=\s*')(.*)(';\s*)$/;

function escapeInnerQuotes(body) {
  return body.split('\n').map((line) => {
    const m = ASSIGN.exec(line);
    if (!m) return line;
    const [, head, content, tail] = m;
    // Escape a quote only when it is not already escaped.
    const fixed = content.replace(/(^|[^\\])'/g, (mm, prev) => prev + "\\'");
    return head + fixed + tail;
  }).join('\n');
}

function provableEscape(a, b) {
  let ai = 0, bi = 0, added = 0;
  while (ai < a.length && bi < b.length) {
    if (a[ai] === b[bi]) { ai++; bi++; continue; }
    if (b[bi] === '\\') { added++; bi++; continue; }
    return `byte ${bi} is ${JSON.stringify(b[bi])}, not an inserted backslash`;
  }
  if (ai !== a.length || bi !== b.length) return 'not a pure insertion';
  return added ? null : 'nothing changed';
}

// ---- 3. the stray closing brace ------------------------------------------
function fixStrayBrace(body) {
  return body.split(STRAY_BRACE).join(STRAY_BRACE_FIXED);
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
      skipped.push([handle, 'already passes the scan. Delete the sheet rather than import it.']);
      continue;
    }

    const applied = [];
    let cur = live;

    try {
      const renamed = renameHyphenNames(cur);
      if (renamed !== cur) {
        const bad = provableRename(cur, renamed);
        if (bad) throw new Error('rename: ' + bad);
        applied.push('hyphen rename'); cur = renamed;
      }

      const escaped = escapeInnerQuotes(cur);
      if (escaped !== cur) {
        const bad = provableEscape(cur, escaped);
        if (bad) throw new Error('quote escape: ' + bad);
        applied.push('quote escape'); cur = escaped;
      }

      const braced = fixStrayBrace(cur);
      if (braced !== cur) {
        const n = cur.split(STRAY_BRACE).length - 1;
        // The needle loses a brace AND the space before the paren, so the
        // expected delta is the needle's own shrinkage times the number of
        // occurrences. Hardcoding 1 here refused two correct pages.
        const perHit = STRAY_BRACE.length - STRAY_BRACE_FIXED.length;
        if (cur.length - braced.length !== n * perHit) {
          throw new Error(`stray brace: expected to remove ${n * perHit} char(s), removed ${cur.length - braced.length}`);
        }
        applied.push(`stray brace x${n}`); cur = braced;
      }
    } catch (e) {
      skipped.push([handle, 'REFUSED: ' + e.message]);
      continue;
    }

    const after = scan.scanBody(cur);
    if (after.findings.length) {
      skipped.push([handle, 'REFUSED: still fails after ' + applied.join(' + ') + ': ' + after.findings[0].detail]);
      continue;
    }

    built.push({ handle, body: cur, applied });
    console.log(`  ${handle}  ${applied.join(' + ')}`);
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
    for (const p of w.group) console.log(`      ${p.handle}   [${p.applied.join(' + ')}]`);
    console.log('   then: node scripts/scan-inline-scripts.js \\');
    console.log('           ' + w.group.map((p) => p.handle).join(' \\\n           '));
    console.log('   expect: 0 findings, plus Run and Check answer working on one page by hand');
  });
}

main();
