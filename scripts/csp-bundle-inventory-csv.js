'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE $249 CSP BUNDLE PAGE SELLS SLIDES. THE BUNDLE IS A WHOLE COURSE.
//
//  Measured on the live page 2026-09-04: the word "slide" appears 9 times, and
//  NONE of these appear even once.
//
//      guided notes   pacing        discussion guide   lesson map
//      teacher guide  answer key    Big Idea exam      quiz        exercise
//
//  Meanwhile /pages/ap-csp-teacher-resources, the premium delivery page behind
//  the paywall, carries about 590 files: 224 guided notes in two differentiation
//  tracks, two exercises and a topic quiz per topic with keys, a lesson map,
//  teacher guide and discussion guide for each of the 35 topics, five Big Idea
//  exams with keys, two pacing guides, the Create Task pack, the Big Idea 2 data
//  project and Innovation Investigations.
//
//  So a teacher reads the sales page and thinks $249 buys slide decks. This adds
//  one section saying what is actually in it. It changes no price, no heading,
//  and no existing sentence.
//
//  ── WHY THIS IS AN INSERTION AND NOT A REWRITE ─────────────────────────────
//  Body HTML replaces wholesale, and Matrixify reports the replacement as a
//  success either way. On 2026-08-22 an import deleted the entire self-study tab
//  from /pages/join and every guard in that generator was green, because none of
//  them looked at the live page (docs/availability.md, board 112).
//
//  This script therefore never composes a body. It fetches the live one, splices
//  one block in at a single anchor, and then proves the output is the input plus
//  that block and nothing else:
//
//      out.length === live.length + block.length
//      out with the block removed === live, byte for byte
//
//  Those two together mean no existing byte moved, changed or vanished. A diff
//  of the rendered text would not catch a deletion somewhere else in a 20KB body;
//  this does.
//
//  It also refuses to run twice: if the section is already live the page is
//  already fixed, and a second insertion would print it twice.
//
//    node scripts/csp-bundle-inventory-csv.js            write the sheet
//    node scripts/csp-bundle-inventory-csv.js --check    verify what is on disk
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');
const ins = require('../lib/page-section-insert');

const HANDLE = 'ap-csp-teacher-superpack';
//  Authored here rather than in a .html file so the only artifact is the sheet.
const BLOCK = [
'    <div class="also" style="margin-top:14px;">',
'      <div class="also-title">Slides are what people ask about. Here is the rest of it.</div>',
'      <p style="margin:10px 0 0;">Every one of the 35 topics ships the same set, so there is never a lesson where the one piece you need is the piece that was not made.</p>',
'      <ul class="also-list">',
'        <li><strong>Guided notes in two versions.</strong> CB Standard covers the required content. Deep Dive is the same lesson with enrichment sections, for block periods or an honors section. Same topic, same day, two handouts, so a mixed room does not need two preps. That is 224 files on its own.</li>',
'        <li><strong>Two exercises and a topic quiz, each with a key.</strong></li>',
'        <li><strong>A lesson map, a teacher guide, and a discussion guide</strong> for every topic, which is the part that matters when you are teaching something for the first time on four hours of sleep.</li>',
'        <li><strong>A Big Idea exam with a key,</strong> five of them, one at the end of each Big Idea.</li>',
'      </ul>',
'      <p style="margin:12px 0 0;">Before any of that there is a year-long pacing guide and a semester block version, the Create Performance Task pack, the Big Idea 2 data project, and Innovation Investigations.</p>',
'      <p style="margin:10px 0 0;">Around 590 files in total. Anything marked KEY sits on the teacher side of the site and the student-safe files are grouped separately, so you can print or post a handout without opening it first to check whether the answers are on page two.</p>',
'    </div>',
'',
].join('\n');
const OUT = path.join(__dirname, '..', 'matrixify', 'csp-teacher-bundle-inventory-pages.csv');

//  The block goes immediately before the "Every purchase also includes" panel,
//  so it lands inside the What Is Included section rather than after the pitch.
//  Matched on the opening div of that panel, which occurs once.
const ANCHOR = '<div class="also" style="margin-top:14px;">';

//  A marker the page cannot already contain by accident, used for the
//  already-applied check rather than matching on prose that might be edited.
const SENTINEL = 'Slides are what people ask about.';

const BOM = '﻿';
const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';



function sheet(bodyHtml) {
  //  Handle, Command, Body HTML. No Title, no SEO columns, no Published At: a
  //  blank cell is an erase in EVERY column, so a sheet may only carry a column
  //  every one of its rows is setting. One row, one body.
  const lines = [['Handle', 'Command', 'Body HTML'].map(cell).join(',')];
  lines.push([HANDLE, 'MERGE', bodyHtml].map(cell).join(','));
  return BOM + lines.join('\r\n') + '\r\n';
}

//  Reads the sheet back and confirms the body inside it is exactly the live body
//  plus the block. Generation is not evidence that generation worked.
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

  //  Minimal quoted-CSV reader, deliberately not the writer's logic.
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
  if (body.length !== live.length + blk.length) problems.push(`sheet body is ${body.length} bytes, expected ${live.length + blk.length}`);
  if (body.replace(blk, '') !== live) problems.push('the sheet body is not the live body plus the block');
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
  console.log(`parse-back clean: body ${bytes} bytes = live ${live.length} + block ${blk.length}, nothing else changed`);
}

//  main() only when run directly, so smoke/csp-bundle-inventory.js can exercise
//  splice() against synthetic bodies with no network. The dangerous cases (an
//  anchor that moved, a deletion elsewhere in the body) cannot be reproduced
//  against the real page, so they have to be testable here.
if (require.main === module) main();

module.exports = { HANDLE, ANCHOR, SENTINEL, BLOCK, OUT, sheet, check };
