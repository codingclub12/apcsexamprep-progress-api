'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE $249 CSA BUNDLE PAGE SELLS SLIDES. THE PRODUCT LISTING SELLS A COURSE.
//
//  Measured on the live body of /pages/ap-csa-teacher-superpack 2026-09-04:
//
//      slide            8 occurrences
//      pacing           8          (this one the page DOES say, unlike CSP)
//      FRQ              8
//      guided notes     0
//      teacher guide    0
//      exercise         0
//      answer key       0
//      quiz             0
//      unit test        0
//      project          0
//      rubric           0
//
//  Every one of those zeroes is spelled out on the product listing for the same
//  thing, `ap-csa-teacher-superpack`, in Tanner's own words:
//
//      "50+ complete lessons, each with 8 teacher documents: Teacher Guide,
//       Guided Notes, two Exercises with Answer Keys, a Discussion Activity,
//       and a Bell Ringer + Quiz."
//      "Unit Tests with AP-style MCQ sets plus free-response questions, full
//       rationales, and distribution audits."
//      "Unit Projects with point-based scoring rubrics."
//
//  So the page a teacher lands on from search sells less than the product page
//  they reach after clicking buy. This section is the product listing's own
//  inventory, put where the pitch is.
//
//  ── WHY THE SOURCE IS THE PRODUCT LISTING AND NOT A FILE COUNT ─────────────
//  The CSP version of this counted 590 real files on /pages/ap-csp-teacher-
//  resources. CSA has no equivalent page: CSP and cyber both have a
//  teacher-resources delivery page and CSA does not, /pages/csa-command-center
//  exposes a single generic "Lesson materials" folder per lesson rather than a
//  file list, and config/csa-slide-manifest.js carries 53 lessons with zero deck
//  ids in it.
//
//  So this section states NO TOTAL. It describes the per-lesson set and the
//  unit-level items, both quoted from the listing, and stops there. Deriving
//  "53 lessons times 8 documents" would be arithmetic on a claim rather than a
//  count of anything, and board 206 (38 CSA lessons have no deck anywhere) is a
//  standing reason not to multiply out a number nobody has verified.
//
//  For the same reason this adds no claim about slides. The page already makes
//  that claim; whether it holds is board 206's problem, not this section's.
//
//  ── HOW IT SHIPS ───────────────────────────────────────────────────────────
//  lib/page-section-insert.js does the splice and carries the reasoning about
//  why an insertion is proved rather than trusted. The sheet is Handle, Command
//  and Body HTML only: a blank cell is an erase in every column, so a sheet may
//  carry only columns every one of its rows sets.
//
//    node scripts/csa-bundle-inventory-csv.js            write the sheet
//    node scripts/csa-bundle-inventory-csv.js --check    verify what is on disk
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');
const ins = require('../lib/page-section-insert');

const HANDLE = 'ap-csa-teacher-superpack';
const OUT = path.join(__dirname, '..', 'matrixify', 'csa-teacher-bundle-inventory-pages.csv');

//  Occurs exactly once, opening the "Every purchase also includes" panel, so the
//  section lands inside What Is Included rather than after the pitch.
const ANCHOR = '<div class="also" style="margin-top:14px;">';
const SENTINEL = 'Every lesson comes with eight documents';

//  Authored here rather than in a .html file so the only artifact is the sheet.
//  Classes are the page's own (also, also-title, also-list).
const BLOCK = [
'    <div class="also" style="margin-top:14px;">',
'      <div class="also-title">Every lesson comes with eight documents, not just the deck.</div>',
'      <p style="margin:10px 0 0;">The slides are what you see first. Behind each lesson there is a teacher guide, guided notes, two exercises with answer keys, a discussion activity, and a bell ringer with a quiz. The same eight every time, so planning a lesson is picking files rather than writing them.</p>',
'      <ul class="also-list">',
'        <li><strong>Unit tests</strong> with AP-style multiple choice and free response, full rationales, and a distribution audit on every key.</li>',
'        <li><strong>Unit projects</strong> with point-based rubrics, so the grade holds up when a parent asks how it was reached.</li>',
'        <li><strong>Pacing guides</strong> for a full year and for semester or block schedules.</li>',
'      </ul>',
'      <p style="margin:12px 0 0;">The answer keys are the part worth knowing about. Each one is distribution-audited and flags the miss patterns to expect, so a wrong answer points at the reteach it needs instead of just being wrong.</p>',
'      <p style="margin:10px 0 0;">All of it is built on the 2025-2026 four-unit framework rather than the retired ten-unit sequence, which is the difference between a handout you can use on Monday and one you have to edit first.</p>',
'    </div>',
''].join('\n');

const BOM = '﻿';
const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';

function sheet(bodyHtml) {
  const lines = [['Handle', 'Command', 'Body HTML'].map(cell).join(',')];
  lines.push([HANDLE, 'MERGE', bodyHtml].map(cell).join(','));
  return BOM + lines.join('\r\n') + '\r\n';
}

//  Reads the emitted file back with a reader that does not share the writer's
//  assumptions. Generation is not evidence that generation worked.
function check(live, blk) {
  const problems = [];
  if (!fs.existsSync(OUT)) return { problems: [`${path.basename(OUT)} does not exist`] };
  const raw = fs.readFileSync(OUT, 'utf8');
  if (!raw.startsWith(BOM)) problems.push('missing UTF-8 BOM');

  //  ROW STRUCTURE. The Body HTML field legitimately contains line breaks, so
  //  this file cannot be all-CRLF the way a short metafield sheet is: the
  //  noindex sheets have 0 bare LF and these have close to 300, all of them
  //  inside the quoted body. That is correct, because a \r injected into the
  //  field would land in the page body on import.
  //
  //  What must hold is that no line break leaked OUT of the field: exactly two
  //  CRLF row terminators, header and one data row. Asserted because the first
  //  cut of this check tested nothing about line endings at all, and the sheets
  //  it passed did not import.
  const crlf = (raw.match(/\r\n/g) || []).length;
  if (crlf !== 2) problems.push(`${crlf} CRLF row terminators, expected exactly 2 (header and one row)`);
  if (/\r(?!\n)/.test(raw)) problems.push('a bare CR outside a CRLF pair');

  const t = raw.slice(BOM.length);
  const rows = [];
  let row = [], field = '', q = false, i = 0;
  while (i < t.length) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { q = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { q = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r' && t[i + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ''; i += 2; continue; }
    field += c; i++;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }

  const header = rows.shift();
  if (String(header) !== String(['Handle', 'Command', 'Body HTML'])) problems.push(`header is ${JSON.stringify(header)}`);
  if (rows.length !== 1) problems.push(`${rows.length} data rows, expected 1`);
  const r = rows[0] || [];
  if (r[0] !== HANDLE) problems.push(`handle is ${r[0]}, expected ${HANDLE}`);
  if (r[1] !== 'MERGE') problems.push(`command is ${r[1]}, expected MERGE`);
  if (r.some((c) => c === '')) problems.push('a blank cell, which is an erase');

  const body = r[2] || '';
  if (!body.includes(SENTINEL)) problems.push('the new section is not in the sheet body');
  problems.push(...ins.verifyInsertion(live, blk, body));
  return { problems, bytes: body.length };
}

function main() {
  const blk = ins.checkAuthored(BLOCK, SENTINEL);
  const page = sf.pageBody(HANDLE);
  const live = page.body_html;
  console.log(`live body: ${live.length} bytes, updated ${page.updated_at}`);
  console.log(`block:     ${blk.length} bytes`);

  if (!process.argv.includes('--check')) {
    const { problems, out } = ins.splice({ live, block: blk, anchor: ANCHOR, sentinel: SENTINEL });
    if (problems.length) {
      console.error(`\nREFUSED, ${problems.length} problem(s):`);
      for (const p of problems) console.error(`  ${p}`);
      process.exit(1);
    }
    fs.writeFileSync(OUT, sheet(out));
    console.log(`wrote matrixify/${path.basename(OUT)}  1 row, body ${out.length} bytes`);
  }

  const { problems, bytes } = check(live, blk);
  if (problems.length) {
    console.error(`\nPARSE-BACK FAILED, ${problems.length} problem(s):`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`parse-back clean: body ${bytes} = live ${live.length} + block ${blk.length}, nothing else changed`);
}

if (require.main === module) main();

module.exports = { HANDLE, ANCHOR, SENTINEL, BLOCK, OUT, sheet, check };
