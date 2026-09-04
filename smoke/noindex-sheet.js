'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  MUTATION TEST FOR THE NOINDEX SHEET VALIDATOR.
//
//  A green mutation run is a FAILED check. Each case below breaks exactly one
//  rule and demands the validator go red FOR THAT RULE, matching on a slice of
//  the message. Requiring only "it went red" proves nothing where guards
//  overlap: the strong one masks the weak one and the battery reports a clean
//  run over a rule that cannot fire at all. That is how the stoplist rule in
//  lib/command-verify.js survived three suites, and it is why expect carries a
//  string rather than a boolean.
//
//  Two rules deserve their own note, because both have already cost this store:
//
//  blank cell   A blank cell is an ERASE in every column, not a "leave alone".
//               A sheet that carried a column nine of its ten rows did not set
//               would have cleared the SEO title on nine live pages.
//  BOM          Without utf-8-sig the consuming tool guesses Latin-1. That is
//               the single-pass mojibake this repo keeps paying for.
//
//    node smoke/noindex-sheet.js        # npm run smoke:noindexsheet
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..');
const GEN = path.join(ROOT, 'scripts', 'cyber-unit-exam-noindex-csv.js');
const SHEET = path.join(ROOT, 'matrixify', 'cyber-unit-exam-noindex-pages.csv');
const BOM = '﻿';

//  Run --check against a mutated copy of the sheet, restoring the real one
//  afterwards no matter how the child exits.
function checkWith(text) {
  const backup = fs.readFileSync(SHEET);
  try {
    fs.writeFileSync(SHEET, text);
    const r = cp.spawnSync(process.execPath, [GEN, '--check'], { encoding: 'utf8' });
    return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
  } finally {
    fs.writeFileSync(SHEET, backup);
  }
}

const good = fs.readFileSync(SHEET, 'utf8');
const rows = good.split('\r\n').filter(Boolean);

//  Each mutation names the ONE rule it is aimed at. `expect` must appear in the
//  red output or the case fails as caught-by-something-else.
const MUTATIONS = [
  { name: 'BOM stripped',
    expect: 'missing UTF-8 BOM',
    text: good.slice(1) },

  { name: 'CRLF flattened to LF',
    expect: 'not CRLF',
    text: good.replace(/\r\n/g, '\n') },

  { name: 'quotes removed from one field (QUOTE_ALL)',
    expect: 'not QUOTE_ALL',
    text: [rows[0], rows[1].replace(/^"([^"]+)"/, '$1'), ...rows.slice(2)].join('\r\n') + '\r\n' },

  { name: 'header column renamed to a name Matrixify ignores',
    expect: 'header is',
    text: [rows[0].replace('seo.hidden', 'seo.hide'), ...rows.slice(1)].join('\r\n') + '\r\n' },

  { name: 'a value blanked, which is an erase on a live page',
    expect: 'blank cell',
    text: [rows[0], rows[1].replace(/,"1"$/, ',""'), ...rows.slice(2)].join('\r\n') + '\r\n' },

  { name: 'command switched from MERGE',
    expect: 'expected MERGE',
    text: [rows[0], rows[1].replace('"MERGE"', '"UPDATE"'), ...rows.slice(2)].join('\r\n') + '\r\n' },

  { name: 'value 1 turned into 0, which would un-hide the page',
    expect: 'value is 0',
    text: [rows[0], rows[1].replace(/,"1"$/, ',"0"'), ...rows.slice(2)].join('\r\n') + '\r\n' },

  { name: 'a configured handle dropped from the sheet',
    expect: 'not in the sheet',
    text: [rows[0], ...rows.slice(2)].join('\r\n') + '\r\n' },

  { name: 'a CSA practice exam smuggled in, which must never be noindexed',
    expect: 'not in config',
    text: good + '"ap-csa-unit-3-practice-exam","MERGE","1"\r\n' },

  { name: 'a handle duplicated',
    expect: 'appears twice',
    text: good + rows[1] + '\r\n' },
];

let failed = 0;

//  The control. If the unmutated sheet is not GREEN then every red below is
//  meaningless, so this runs first and its failure is fatal.
const control = checkWith(good);
if (control.code !== 0) {
  console.error('CONTROL FAILED: the real sheet does not pass its own validator.');
  console.error(control.out);
  process.exit(1);
}
console.log('control: the real sheet passes');

for (const m of MUTATIONS) {
  const r = checkWith(m.text);
  if (r.code === 0) {
    console.error(`  RED EXPECTED, GOT GREEN: ${m.name}`);
    failed++;
  } else if (!r.out.includes(m.expect)) {
    console.error(`  CAUGHT BY THE WRONG RULE: ${m.name}`);
    console.error(`    wanted a message containing ${JSON.stringify(m.expect)}`);
    console.error(`    got: ${r.out.trim().split('\n').slice(1, 4).join(' | ')}`);
    failed++;
  } else {
    console.log(`  red, for its own reason: ${m.name}`);
  }
}

//  The sheet on disk must be byte-identical to what it was before the run.
if (fs.readFileSync(SHEET, 'utf8') !== good) {
  console.error('  THE SHEET WAS NOT RESTORED after mutation');
  failed++;
}

if (failed) {
  console.error(`\n${failed} of ${MUTATIONS.length} mutations did not go red for their own rule.`);
  process.exit(1);
}
console.log(`\nall ${MUTATIONS.length} mutations went red for their own rule, sheet restored`);
