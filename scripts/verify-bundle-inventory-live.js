'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  DID THE BUNDLE INVENTORY SHEETS ACTUALLY LAND?
//
//  Run this AFTER importing matrixify/csp-teacher-bundle-inventory-pages.csv and
//  matrixify/csa-teacher-bundle-inventory-pages.csv. It answers a question the
//  importer cannot: Matrixify reports a Body HTML replacement as a success
//  whether or not the result is what you meant, which is how the self-study tab
//  vanished from /pages/join on 2026-08-22 (board 112).
//
//  ── WHAT IT ASSERTS, AND WHY EACH ONE IS HERE ──────────────────────────────
//
//  1. The section is on the page.        FALSE before the import, so it is a
//                                        real assertion rather than decoration.
//  2. The live body is EXACTLY the
//     pre-import body plus the block.    This is the one that matters. A body is
//                                        20KB and a rendered diff would wave
//                                        through a list item deleted three
//                                        screens below the edit. The pre-import
//                                        bodies are committed under imports/,
//                                        which is what makes this checkable at
//                                        all.
//  3. A string that was there BEFORE
//     is still there.                    The positive control. Without it, a
//                                        fetch that quietly failed would make
//                                        assertion 1 fail for the wrong reason
//                                        and look identical to a missing import.
//
//  It checks BOTH the Admin JSON body and the rendered storefront page, because
//  they are different paths and only the pair distinguishes "not imported" from
//  "imported but not serving".
//
//  Fetches go through lib/storefront-fetch.js and send NO User-Agent: bot
//  management here 403s a spoofed browser and allows bare curl, and the 403 body
//  contains none of the strings a check looks for.
//
//    node scripts/verify-bundle-inventory-live.js          both pages
//    node scripts/verify-bundle-inventory-live.js csa      one, by key
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');
const ins = require('../lib/page-section-insert');

const ROOT = path.join(__dirname, '..');

//  Each generator owns its handle, block and sentinel. The pre-import body is
//  the snapshot taken when the sheet was built, committed beside the sheet so
//  assertion 2 has something to compare against.
const PAGES = [
  { key: 'csp',
    gen: '../scripts/csp-bundle-inventory-csv.js',
    before: 'imports/2026-09-04c/csp-superpack-live-body.json' },
  { key: 'csa',
    gen: '../scripts/csa-bundle-inventory-csv.js',
    before: 'imports/2026-09-04d/csa-superpack-live-body.json' },
];

//  Present on both pages before the import and untouched by it. If this goes
//  missing the fetch is the problem, not the import.
const CONTROL = 'Every purchase also includes';

const only = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : null;
const pages = only ? PAGES.filter((p) => p.key === only) : PAGES;
if (only && !pages.length) {
  console.error(`no page ${only}. known: ${PAGES.map((p) => p.key).join(', ')}`);
  process.exit(2);
}

const problems = [];

for (const p of pages) {
  const g = require(p.gen);
  const beforeMap = JSON.parse(fs.readFileSync(path.join(ROOT, p.before), 'utf8'));
  const before = beforeMap[g.HANDLE];
  console.log(`\n${p.key}  ${g.HANDLE}`);

  if (!before) { problems.push(`${p.key}: ${p.before} carries no body for ${g.HANDLE}`); continue; }

  //  ── the stored body, via the Admin JSON route ───────────────────────────
  let live;
  try { live = sf.pageBody(g.HANDLE); }
  catch (e) { problems.push(`${p.key}: page json fetch refused, ${e.message}`); continue; }
  const body = live.body_html;
  console.log(`  stored body: ${body.length} bytes, updated ${live.updated_at}`);

  if (!body.includes(CONTROL)) {
    problems.push(`${p.key}: the control string is missing from the stored body. Something is wrong with the page or the fetch, not just the import.`);
  }

  if (!body.includes(g.SENTINEL)) {
    problems.push(`${p.key}: NOT IMPORTED. The stored body is ${body.length} bytes and does not contain the section. Expected ${before.length + g.BLOCK.length} bytes (${before.length} before plus ${g.BLOCK.length} block).`);
    if (body.length === before.length && body === before) {
      console.log('  the stored body is byte-identical to the pre-import snapshot, so nothing was changed or damaged');
    }
  } else {
    //  Imported. Now the assertion that matters: exactly the block, nothing else.
    const bad = ins.verifyInsertion(before, g.BLOCK, body);
    if (bad.length) {
      for (const b of bad) problems.push(`${p.key}: the body is NOT the pre-import body plus the block. ${b}`);
    } else {
      console.log(`  stored body is exactly the pre-import body plus the block, byte for byte`);
    }
  }

  //  ── what a visitor is served ────────────────────────────────────────────
  let rendered;
  try { rendered = sf.page('/pages/' + g.HANDLE); }
  catch (e) { problems.push(`${p.key}: rendered page fetch refused, ${e.message}`); continue; }
  const html = typeof rendered === 'string' ? rendered : (rendered.body || '');

  if (!html.includes(CONTROL)) {
    problems.push(`${p.key}: the control string is missing from the RENDERED page, so this fetch cannot be trusted either way`);
  } else if (!html.includes(g.SENTINEL)) {
    problems.push(`${p.key}: the rendered page does not serve the section`);
  } else {
    console.log('  the rendered page serves the section');
  }
}

if (problems.length) {
  console.error(`\nNOT LANDED, ${problems.length} problem(s):`);
  for (const x of problems) console.error(`  ${x}`);
  process.exit(1);
}
console.log(`\nlanded: ${pages.length} page(s) serve the section, each body exactly the pre-import body plus its block`);
