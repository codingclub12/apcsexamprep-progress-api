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
//  Every sheet mutation runs against EVERY group's sheet, so a rule that holds
//  for the cyber exams and not for the internal pages cannot hide behind the
//  one that passes.
//
//  Four rules deserve their own note, because all four have already cost this
//  store or nearly did:
//
//  blank cell   A blank cell is an ERASE in every column, not a "leave alone".
//               A sheet that carried a column nine of its ten rows did not set
//               would have cleared the SEO title on nine live pages.
//  BOM          Without utf-8-sig the consuming tool guesses Latin-1. That is
//               the single-pass mojibake this repo keeps paying for.
//  excluded     A handle that is both hidden and excluded would publish a live
//               page change the config elsewhere says must not happen. One of
//               the excluded handles is a 301, where a MERGE CREATES a blank
//               page over a working redirect.
//  seo-invested Nine handles in the same audit heading carry deliberate SEO
//               titles. Smuggling one into a group is the expensive mistake
//               this whole split exists to prevent.
//
//    node smoke/noindex-sheet.js        # npm run smoke:noindexsheet
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..');
const GEN = path.join(ROOT, 'scripts', 'noindex-sheets.js');
const CONFIG = path.join(ROOT, 'config', 'noindex-pages.json');
const SHEET_DIR = path.join(ROOT, 'matrixify');
const BOM = '﻿';

const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
const SHEETS = cfg.groups.map((g) => ({ id: g.id, file: path.join(SHEET_DIR, g.sheet) }));

//  Run --check against mutated copies, restoring everything afterwards no
//  matter how the child exits.
function checkWith(edits) {
  const backups = new Map();
  for (const f of [CONFIG, ...SHEETS.map((s) => s.file)]) backups.set(f, fs.readFileSync(f));
  try {
    for (const [f, text] of edits) fs.writeFileSync(f, text);
    const r = cp.spawnSync(process.execPath, [GEN, '--check'], { encoding: 'utf8' });
    return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
  } finally {
    for (const [f, buf] of backups) fs.writeFileSync(f, buf);
  }
}

const originals = new Map(SHEETS.map((s) => [s.file, fs.readFileSync(s.file, 'utf8')]));
const configText = fs.readFileSync(CONFIG, 'utf8');

let failed = 0;
let cases = 0;

//  The control. If the unmutated files are not GREEN then every red below is
//  meaningless, so this runs first and its failure is fatal.
const control = checkWith([]);
if (control.code !== 0) {
  console.error('CONTROL FAILED: the real sheets do not pass their own validator.');
  console.error(control.out);
  process.exit(1);
}
console.log(`control: ${SHEETS.length} sheets pass`);

//  ── PER-SHEET MUTATIONS, applied to each group's sheet in turn ─────────────
function sheetMutations(text) {
  const rows = text.split('\r\n').filter(Boolean);
  return [
    { name: 'BOM stripped', expect: 'missing UTF-8 BOM', text: text.slice(1) },
    { name: 'CRLF flattened to LF', expect: 'not CRLF', text: text.replace(/\r\n/g, '\n') },
    { name: 'quotes removed from one field', expect: 'not QUOTE_ALL',
      text: [rows[0], rows[1].replace(/^"([^"]+)"/, '$1'), ...rows.slice(2)].join('\r\n') + '\r\n' },
    { name: 'header column renamed to one Matrixify ignores', expect: 'header is',
      text: [rows[0].replace('seo.hidden', 'seo.hide'), ...rows.slice(1)].join('\r\n') + '\r\n' },
    { name: 'a value blanked, which is an erase on a live page', expect: 'blank cell',
      text: [rows[0], rows[1].replace(/,"1"$/, ',""'), ...rows.slice(2)].join('\r\n') + '\r\n' },
    { name: 'command switched from MERGE', expect: 'expected MERGE',
      text: [rows[0], rows[1].replace('"MERGE"', '"UPDATE"'), ...rows.slice(2)].join('\r\n') + '\r\n' },
    { name: 'value 1 turned into 0, which would un-hide the page', expect: 'value is 0',
      text: [rows[0], rows[1].replace(/,"1"$/, ',"0"'), ...rows.slice(2)].join('\r\n') + '\r\n' },
    { name: 'a configured handle dropped from the sheet', expect: 'not in the sheet',
      text: [rows[0], ...rows.slice(2)].join('\r\n') + '\r\n' },
    { name: 'an SEO-invested page smuggled in', expect: 'not in config',
      text: text + '"csa-command-center","MERGE","1"\r\n' },
    { name: 'a handle duplicated', expect: 'appears twice', text: text + rows[1] + '\r\n' },
  ];
}

for (const s of SHEETS) {
  console.log(`\n${s.id}`);
  for (const m of sheetMutations(originals.get(s.file))) {
    cases++;
    const r = checkWith([[s.file, m.text]]);
    if (r.code === 0) { console.error(`  RED EXPECTED, GOT GREEN: ${m.name}`); failed++; }
    else if (!r.out.includes(m.expect)) {
      console.error(`  CAUGHT BY THE WRONG RULE: ${m.name}`);
      console.error(`    wanted a message containing ${JSON.stringify(m.expect)}`);
      failed++;
    } else console.log(`  red, for its own reason: ${m.name}`);
  }
}

//  ── CONFIG-LEVEL MUTATIONS ────────────────────────────────────────────────
//  These break the config rather than a sheet, so they prove the generator
//  refuses to BUILD a contradictory set rather than only to validate one.
console.log('\nconfig invariants');
const CONFIG_MUTATIONS = [
  { name: 'a handle placed in two groups at once',
    expect: 'appears in both',
    text: configText.replace('"admin-tracker",', '"admin-tracker","ap-cyber-unit-1-exam",') },
  { name: 'an excluded 301 handle added to a group',
    expect: 'AND in the excluded list',
    text: configText.replace('"admin-tracker",', '"admin-tracker","cyber-teacher-teaching-hub",') },
  { name: 'an excluded SEO-invested handle added to a group',
    expect: 'AND in the excluded list',
    text: configText.replace('"admin-tracker",', '"admin-tracker","csa-command-center",') },
  { name: 'a group left with no sheet file named',
    expect: 'names no sheet',
    text: configText.replace('"sheet": "internal-pages-noindex-pages.csv",', '') },
];
for (const m of CONFIG_MUTATIONS) {
  cases++;
  if (m.text === configText) { console.error(`  MUTATION DID NOT APPLY: ${m.name}`); failed++; continue; }
  const r = checkWith([[CONFIG, m.text]]);
  if (r.code === 0) { console.error(`  RED EXPECTED, GOT GREEN: ${m.name}`); failed++; }
  else if (!r.out.includes(m.expect)) {
    console.error(`  CAUGHT BY THE WRONG RULE: ${m.name}`);
    console.error(`    wanted a message containing ${JSON.stringify(m.expect)}`);
    console.error(`    got: ${r.out.trim().split('\n').slice(0, 3).join(' | ')}`);
    failed++;
  } else console.log(`  red, for its own reason: ${m.name}`);
}

//  Every file must be byte-identical to what it was before the run.
for (const [f, text] of originals) {
  if (fs.readFileSync(f, 'utf8') !== text) { console.error(`  ${path.basename(f)} WAS NOT RESTORED`); failed++; }
}
if (fs.readFileSync(CONFIG, 'utf8') !== configText) { console.error('  the config WAS NOT RESTORED'); failed++; }

if (failed) {
  console.error(`\n${failed} of ${cases} mutations did not go red for their own rule.`);
  process.exit(1);
}
console.log(`\nall ${cases} mutations went red for their own rule, every file restored`);
