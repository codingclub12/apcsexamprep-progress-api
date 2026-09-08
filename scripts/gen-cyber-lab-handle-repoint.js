'use strict';
// -----------------------------------------------------------------------------
//  BOARD 252. The terminal lab's handle moved from
//  ap-cyber-unit-1-lesson-2-terminal-lab to ap-cyber-unit-4-lesson-3-terminal-lab
//  on 2026-09-06, on Tanner's explicit instruction, which is the stated
//  exception to the NEVER_AUTO rule on renaming a live handle.
//
//  The rename went through pageUpdate with redirectNewHandle:true, so the old
//  URL 301s and NOTHING IS BROKEN. Measured: new handle 200, old handle 301 to
//  it. This sheet is hygiene rather than repair: seven live pages still name the
//  old handle and every click through them takes a redirect hop.
//
//  ── WHY A SHEET AND NOT ANOTHER MUTATION ────────────────────────────────────
//  The rename itself could not be a sheet: Matrixify keys a page row on Handle,
//  so a sheet carrying the new handle CREATES A SECOND PAGE rather than renaming
//  the first. docs/matrixify-import-rules.md says exactly that about MERGE. Page
//  BODIES are the ordinary case and go back to the ordinary path.
//
//  ── THE STALE LABEL THIS TURNED UP ──────────────────────────────────────────
//  ap-cybersecurity-practice carries a card for this lab reading "Unit 1". The
//  board 170 pass fixed the same card on ap-cybersecurity-labs and never looked
//  at this page, because the sweep that found the pages was scoped to the two
//  surfaces the note named. Fixed here.
//
//  Run: node scripts/gen-cyber-lab-handle-repoint.js
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');
const { extract } = require('./extract-live-body');

//  Read, not retyped. config/page-renames.json is the record of this rename and
//  tools/ap-cyber-ced/generate-practice-restyle.js reads the same row to tell a
//  repoint apart from a deletion. Two copies of a handle pair is how one of them
//  gets fixed and the other does not.
const RENAME = require('../config/page-renames.json').renames
  .find((r) => r.to === 'ap-cyber-unit-4-lesson-3-terminal-lab');
if (!RENAME) throw new Error('config/page-renames.json has no row for the terminal lab rename');
const OLD = RENAME.from;
const NEW = RENAME.to;
const OUT = path.join(__dirname, '..', 'matrixify', 'cyber-lab-handle-repoint-pages.csv');

const PAGES = [
  'ap-cybersecurity-complete-course-guide',
  'cyber-command-center',
  'ap-cyber-unit-2-lesson-4-terminal-lab',
  'ap-cybersecurity-labs',
  'ap-cybersecurity-practice',
  'ap-cyber-unit-1-lesson-2-auth-log-lab',
  'ap-cybersecurity-unit-1-practice',
];

const rows = [];
const report = [];
for (const h of PAGES) {
  const body = extract(sf.page('/pages/' + h, { timeout: 45 }).body);
  const hits = (body.match(new RegExp(OLD, 'g')) || []).length;
  if (!hits) { report.push({ h, note: 'already repointed, skipped' }); continue; }

  let next = body.split(OLD).join(NEW);
  let extraNote = '';

  //  ap-cybersecurity-practice's card for this lab still says Unit 1. Scoped to
  //  that card's own anchor: "Unit 1" is correct on other cards and a
  //  document-wide replace would retarget labs that are filed right.
  if (h === 'ap-cybersecurity-practice') {
    const open = next.indexOf(`<a class="ph-card" href="https://www.apcsexamprep.com/pages/${NEW}"`);
    if (open >= 0) {
      const close = next.indexOf('</a>', open);
      const card = next.slice(open, close + 4);
      const fixedCard = card.split('>Unit 1<').join('>Unit 4<').split('Topic 1.2').join('Topic 4.3');
      if (fixedCard !== card) {
        next = next.slice(0, open) + fixedCard + next.slice(close + 4);
        extraNote = ', card focus Unit 1 -> Unit 4';
      }
    }
  }

  if (next === body) throw new Error(`${h}: nothing changed despite ${hits} hit(s)`);
  rows.push({ Handle: h, Command: 'MERGE', 'Body HTML': next });
  report.push({ h, hits, bytes: [body.length, next.length], extraNote });
}

const COLS = ['Handle', 'Command', 'Body HTML'];
const q = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
for (const r of rows) for (const c of COLS) {
  if (!r[c]) throw new Error(`${r.Handle}: empty ${c}, which Matrixify would write as a blank`);
}
const csv = '﻿' + [COLS.map(q).join(',')]
  .concat(rows.map((r) => COLS.map((c) => q(r[c])).join(','))).join('\r\n') + '\r\n';
fs.writeFileSync(OUT, csv);

console.log('wrote ' + path.relative(path.join(__dirname, '..'), OUT) + '  ' + csv.length + ' bytes, ' + rows.length + ' rows\n');
for (const r of report) {
  if (r.note) { console.log('  ' + r.h.padEnd(42) + r.note); continue; }
  console.log('  ' + r.h.padEnd(42) + r.hits + ' link(s), body ' + r.bytes[0] + ' -> ' + r.bytes[1] + r.extraNote);
}
