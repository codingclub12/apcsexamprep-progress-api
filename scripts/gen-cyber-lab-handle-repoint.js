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
//  ── AND THE PLACEMENT, ADDED 2026-09-09 ─────────────────────────────────────
//  A repoint alone was not enough and the sheet built before today would not
//  have fixed what was reported. Two surfaces FILE this lab under Topic 1.2 and
//  keep doing so after every URL is corrected: the Command Center's STU map and
//  the Unit 1 practice page's lab list. Those move here too, so one sheet
//  carries the whole correction. Two sheets touching one page body is a footgun
//  anyway: Matrixify MERGE replaces the body, so importing a second sheet built
//  before the first would silently undo it.
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

  //  ── THE PART A REPOINT DOES NOT FIX, found 2026-09-09 ───────────────────
  //  Repointing the URL leaves the lab exactly where it was in every surface
  //  that FILES it, and the filing is the actual complaint: the Command Center
  //  hangs this lab off Topic 1.2 and the Unit 1 practice page lists it among
  //  Unit 1 labs. After a pure repoint, Topic 1.2 still offers a Unit 4 lab,
  //  just without the redirect hop. Reported by Tanner: "1.2 terminal lab is
  //  not correct and should move to unit 4".
  //
  //  The Command Center's STU map keys every student link by topic. The entry
  //  moves from "1.2" to "4.3", which already exists and has no termlab of its
  //  own. Anchored on the exact key text rather than a loose match: "1.2"
  //  appears throughout that file and a document-wide edit would retarget
  //  links that are filed correctly.
  if (h === 'cyber-command-center') {
    const ENTRY = `,termlab:"/pages/${NEW}"`;
    if (!next.includes(ENTRY)) throw new Error(`${h}: no repointed termlab entry to move`);
    const moved = next.replace(ENTRY, '');
    if (moved === next) throw new Error(`${h}: could not lift the termlab entry off 1.2`);
    //  Land it on 4.3, inside that topic's own object, before its closing brace.
    const key = '"4.3":{';
    const at = moved.indexOf(key);
    if (at < 0) throw new Error(`${h}: the STU map has no "4.3" entry to move the lab onto`);
    const close = moved.indexOf('}', at);
    if (close < 0) throw new Error(`${h}: the "4.3" entry is not closed`);
    if (moved.slice(at, close).includes('termlab:')) {
      throw new Error(`${h}: "4.3" already carries a termlab, so this move would create two`);
    }
    next = moved.slice(0, close) + ENTRY + moved.slice(close);
    extraNote = ', termlab moved from topic 1.2 to 4.3';
  }

  //  A Unit 1 practice page listing a Unit 4 lab among "Unit 1 labs" is wrong
  //  whichever URL it points at, and relabelling the chip would only make the
  //  page state the contradiction more clearly. The chip comes out. Every other
  //  chip in that list is a real Unit 1 lab and is left alone.
  if (h === 'ap-cybersecurity-unit-1-practice') {
    const CHIP = `<li><a href="/pages/${NEW}">Lesson 2 terminal lab</a></li>`;
    if (!next.includes(CHIP)) throw new Error(`${h}: the Unit 1 chip is not in the shape this expects`);
    next = next.split(CHIP).join('');
    extraNote = ', Unit 4 lab chip removed from the Unit 1 lab list';
  }

  if (next === body) throw new Error(`${h}: nothing changed despite ${hits} hit(s)`);
  rows.push({ Handle: h, Command: 'MERGE', 'Body HTML': next });
  report.push({ h, hits, bytes: [body.length, next.length], extraNote });
}

//  ── POST-CONDITIONS, checked on the rows about to be written ────────────────
//  Each rule above throws if its own precondition is missing, which catches a
//  page whose shape moved. That is not the same as checking the RESULT, and the
//  result is what gets imported. A sheet is written once and then this generator
//  is spent, so the assertions belong here rather than in a suite nobody will
//  run again.
{
  const body = (h) => (rows.find((r) => r.Handle === h) || {})['Body HTML'] || '';
  const must = (name, cond, extra) => {
    if (!cond) throw new Error('POST-CONDITION FAILED: ' + name + (extra ? '  ' + extra : ''));
  };
  //  The Unit 1 practice page is the exception BY DESIGN: its chip is removed
  //  rather than repointed, so it ends up naming neither handle. Writing this as
  //  "every page names the new one" failed on exactly that page, which is the
  //  post-condition doing its job on the first run.
  const DROPPED = 'ap-cybersecurity-unit-1-practice';
  for (const r of rows) {
    must('no page still names the old handle, and ' + r.Handle + ' does',
      !r['Body HTML'].includes(OLD));
    if (r.Handle === DROPPED) {
      must(DROPPED + ' drops the link rather than repointing it',
        !r['Body HTML'].includes(NEW));
    } else {
      must(r.Handle + ' names the new handle', r['Body HTML'].includes(NEW));
    }
  }

  const cc = body('cyber-command-center');
  const entry = (topic) => (new RegExp('"' + topic.replace('.', '\\.') + '":\\{[^}]*\\}').exec(cc) || [''])[0];
  must('topic 1.2 no longer carries a terminal lab', !entry('1.2').includes('termlab:'), entry('1.2'));
  must('topic 4.3 carries it instead', entry('4.3').includes('termlab:' ), entry('4.3'));
  must('and the map still has exactly the two terminal labs it started with',
    (cc.match(/termlab:/g) || []).length === 2, String((cc.match(/termlab:/g) || []).length));

  const u1 = body('ap-cybersecurity-unit-1-practice');
  must('the Unit 1 lab list has dropped the Unit 4 lab', !u1.includes('Lesson 2 terminal lab'));
  must('and still lists the Unit 1 labs it should',
    ['Lesson 1 lab', 'Lesson 2 lab', 'Lesson 3 lab', 'Lesson 4 lab']
      .every((t) => u1.includes('>' + t + '</a>')));

  const pr = body('ap-cybersecurity-practice');
  must('the practice card is filed under Unit 4', !/ph-card-focus">Unit 1<\/span><span class="ph-card-title">Find the tournament/.test(pr));
  must('and says Topic 4.3 throughout', !pr.includes('Topic 1.2'));
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
