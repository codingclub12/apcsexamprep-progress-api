#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  RUN THIS BEFORE THE IMPORT AND AGAIN AFTER IT.
//
//      node scripts/verify-cyber-lab-denominator-live.js
//
//  BEFORE is not a formality. A generated sheet goes stale, and on 2026-09-08 a
//  day old sheet nearly merged a pre-renumbering body over a better fix with
//  nothing in the file to say so. So this asks the live page two questions:
//
//    1. does it still have the defect the sheet is for
//    2. would regenerating the sheet from the page as it is RIGHT NOW produce
//       the bytes the committed sheet carries
//
//  A no to the first means somebody already fixed the page and the sheet should
//  be deleted, not imported. A no to the second means the page moved after the
//  sheet was built and importing it would revert whoever moved it. Question 2
//  is the one the 291 runbook did not have.
//
//  AFTER, the same run is the post import check: every page has to carry the
//  fixed line, none may carry the running denominator, and the two things the
//  substitution must not have disturbed have to still be there.
//
//  Fetches through lib/storefront-fetch.js and sends no User-Agent, because a
//  challenge body would make every "this string is gone now" assertion pass.
//
//  Zero PII. Pure ASCII source, no em-dashes.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { pageBody } = require('../lib/storefront-fetch');
const gen = require('./cyber-lab-denominator-csv.js');
const { transform, parseCsv, BAD, GOOD, KEEP, RESULTS_LINE, UNITS } = gen;

const SHEET_DIR = path.join(__dirname, '..', 'matrixify');
const sheetFor = (unit) => path.join(SHEET_DIR, `cyber-lab-denominator-${unit}-pages.csv`);

function sheetRows(unit) {
  const file = sheetFor(unit);
  if (!fs.existsSync(file)) return null;
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const head = rows.shift();
  const iH = head.indexOf('Handle'), iB = head.indexOf('Body HTML');
  const map = new Map();
  for (const r of rows) if (r[iH]) map.set(r[iH], r[iB]);
  return map;
}

function main() {
  let imported = 0, notImported = 0, stale = 0, broken = 0, n = 0;
  for (const [unit, handles] of Object.entries(UNITS)) {
    const sheet = sheetRows(unit);
    console.log(`\n${unit}  ${sheet ? sheet.size + ' rows in ' + path.basename(sheetFor(unit)) : 'NO SHEET ON DISK'}`);
    for (const h of handles) {
      n++;
      const page = pageBody(h);
      const body = page.body_html;
      const hasBad = body.includes(BAD);
      const hasGood = body.includes(GOOD);
      const keeps = body.includes(KEEP);
      const results = RESULTS_LINE.test(body);
      const head = `  ${h.padEnd(30)} ${String(body.length).padStart(6)} bytes  ${page.updated_at}`;

      if (hasGood && !hasBad) {
        imported++;
        const ok = keeps && results;
        if (!ok) broken++;
        console.log(`${head}\n     ${ok ? '[ok]  ' : '[FAIL]'} fixed line present, running denominator gone`
          + `, completion test ${keeps ? 'intact' : 'MISSING'}, results total ${results ? 'intact' : 'MISSING'}`);
        continue;
      }
      if (hasBad && !hasGood) {
        notImported++;
        console.log(`${head}\n     [not imported] still writes the running denominator`);
        if (sheet) {
          const want = sheet.get(h);
          const now = transform(h, body);
          if (!want) { stale++; console.log('     [STALE] this handle is not in the sheet'); }
          else if (now.fail.length) { stale++; console.log(`     [STALE] the page no longer transforms: ${now.fail.join('; ')}`); }
          else if (now.out !== want) {
            stale++;
            console.log(`     [STALE] the page moved since the sheet was built. Sheet body is ${want.length}`
              + ` chars, regenerating from the page as it is now gives ${now.out.length}.`
              + ' DO NOT IMPORT. Regenerate.');
          } else {
            console.log('     [fresh] regenerating from the live page reproduces the sheet row byte for byte');
          }
        }
        continue;
      }
      broken++;
      console.log(`${head}\n     [FAIL] neither shape cleanly present (running=${hasBad}, fixed=${hasGood})`);
    }
  }

  console.log(`\n${n} lab pages: ${imported} imported, ${notImported} not imported, ${stale} stale, ${broken} unreadable`);
  if (broken) { console.log('\nFAILED - a page is in a state this check cannot read'); process.exit(1); }
  if (stale) { console.log('\nFAILED - the sheet does not match the live pages. Regenerate before importing.'); process.exit(1); }
  if (imported === n) { console.log('\nOK - every lab page prints its score out of the whole lab'); process.exit(0); }
  if (notImported === n) { console.log('\nNOT IMPORTED - every page still counts only the finished steps. The sheet is fresh and safe to import.'); process.exit(1); }
  console.log('\nPARTIAL - some pages carry the fix and some do not. Import the remaining unit sheet.');
  process.exit(1);
}

if (require.main === module) main();
