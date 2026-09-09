'use strict';
// -----------------------------------------------------------------------------
//  REPAIR THE ONE KEY IN CSA UNIT 1 THAT NO STUDENT CAN EVER MATCH.
//
//  ap-csa-lesson-1-9-method-signatures stores item 1.9-cfu-1's key as a NEWLINE
//  followed by C. The page grades it like this:
//
//      var correct = ex.getAttribute('data-answer');
//      ...
//      feedback.classList.add(chosen === correct ? 'fb-correct' : 'fb-incorrect');
//
//  No trim, strict ===, and the option letters are exactly A B C D. So no option
//  can ever equal the key. Nobody has ever been marked right on that question,
//  the correct answer is never highlighted afterwards, and shopify/apcs-reporter
//  posts 0 out of 1 into the gradebook every time it is answered. Board 296.
//
//  THE CHANGE IS ONE BYTE. That is exactly why it ships as a sheet with a
//  generator and a round trip rather than a hand edit in the Shopify admin: a
//  MERGE overwrites a live body with no undo, and 91,574 bytes are going back up
//  to keep one of them. The proof below is about the other 91,573.
//
//  WHY NOT FIX THE GRADER INSTEAD. Adding .trim() to the page script would also
//  work and would be wrong here twice over. The script is inline in the page
//  body, so patching it is the same MERGE with a larger diff; and the key is
//  still malformed afterwards, so the next tool to read data-answer inherits the
//  bug. Fix the data, once.
//
//    node scripts/csa-19-cfu1-key-repair-csv.js          # writes the sheet
//    node scripts/csa-19-cfu1-key-repair-csv.js --check   # build only, no write
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');
const leak = require('../lib/answer-leak');

const HANDLE = 'ap-csa-lesson-1-9-method-signatures';
const ITEM = '1.9-cfu-1';
const BROKEN = 'data-answer="\nC"';
const FIXED = 'data-answer="C"';

const OUT_DIR = path.join(__dirname, '..', 'imports', '2026-09-09');
const SHEET = path.join(OUT_DIR, 'csa-19-cfu1-key-repair-pages.csv');
const SNAP = path.join(OUT_DIR, 'csa-19-live-body.json');

const BOM = '﻿';
const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';

function sheet(bodyHtml) {
  const lines = [['Handle', 'Command', 'Body HTML'].map(cell).join(',')];
  lines.push([HANDLE, 'MERGE', bodyHtml].map(cell).join(','));
  return BOM + lines.join('\r\n') + '\r\n';
}

//  Every refusal below is a way this could go wrong on a live body, in the order
//  the damage would matter. `live` is a parameter so the smoke suite can hand
//  over bodies that break each rule on purpose.
function build(live) {
  const problems = [];

  //  1. The defect must still be there. If someone already fixed it by hand,
  //     this sheet would rewrite the page for no reason, and a pointless MERGE
  //     is still a MERGE.
  const hits = live.split(BROKEN).length - 1;
  if (hits !== 1) {
    problems.push('expected exactly one padded key in the live body, found ' + hits);
    return { problems };
  }

  //  2. It must be the item this is about. A padded key on some other question
  //     is a different fix with a different blast radius.
  const at = live.indexOf(BROKEN);
  const tagStart = live.lastIndexOf('<', at);
  const tagEnd = live.indexOf('>', at);
  const tag = live.slice(tagStart, tagEnd + 1);
  if (!tag.includes('data-item-id="' + ITEM + '"')) {
    problems.push('the padded key is not on ' + ITEM + ': ' + tag.slice(0, 120));
  }

  const out = live.slice(0, at) + FIXED + live.slice(at + BROKEN.length);

  //  3. One byte, and it is the newline. Anything else means the replace ran
  //     somewhere it was not supposed to.
  if (out.length !== live.length - 1) {
    problems.push('expected a one byte reduction, got ' + (live.length - out.length));
  }

  //  4. The round trip everything else rests on: outside the edit, the two
  //     bodies must be byte identical. Compared as two slices rather than by
  //     counting matches, because a count cannot tell you WHERE it changed.
  if (out.slice(0, at) !== live.slice(0, at)
    || out.slice(at + FIXED.length) !== live.slice(at + BROKEN.length)) {
    problems.push('the body differs somewhere other than the one attribute');
  }

  //  5. Every other key survives untouched, by value and in order. The failure
  //     this catches is the one that would be worst: a repair that quietly
  //     re-letters a different question is a wrong answer marked correct.
  const keysOf = (b) => leak.findings(b).filter((f) => f.channel === 'attribute')
    .map((f) => String(f.disclosed).trim()).join('|');
  if (keysOf(out) !== keysOf(live)) {
    problems.push('the set or order of answer keys changed: ' + keysOf(live) + ' -> ' + keysOf(out));
  }

  //  6. And the point of the exercise: nothing padded is left. Read through the
  //     module rather than re-testing the string here, so this cannot drift from
  //     what the sweep reports.
  const stillPadded = leak.findings(out).filter((f) => f.padded);
  if (stillPadded.length) {
    problems.push(stillPadded.length + ' padded key(s) remain after the repair');
  }

  //  7. The sheet must survive being read back as a CSV. Generation is not
  //     evidence that generation worked: the CSP sheet lost 90 bytes a page
  //     while every semantic check passed, and a parse-back diff is what caught
  //     it. Done here rather than in a separate pass so the generator cannot
  //     emit a file it has not itself round tripped.
  const csv = sheet(out);
  const parsed = parseBack(csv);
  if (!parsed) problems.push('the generated sheet did not parse back as one data row');
  else {
    if (parsed.Handle !== HANDLE) problems.push('parsed handle is ' + parsed.Handle);
    if (parsed.Command !== 'MERGE') problems.push('parsed command is ' + parsed.Command);
    if (parsed['Body HTML'] !== out) {
      problems.push('the parsed body differs from the built body by '
        + (out.length - parsed['Body HTML'].length) + ' bytes');
    }
  }

  return { problems, out, csv, at };
}

//  A deliberately small CSV reader: three columns, one data row, quoted cells
//  with doubled quotes. Written against the emitter above rather than shared
//  with it, so a bug in the quoting shows up as a disagreement instead of
//  cancelling out.
function parseBack(text) {
  let s = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  const cells = [];
  let i = 0, cur = '', inQ = false, row = [];
  while (i < s.length) {
    const c = s[i];
    if (inQ) {
      if (c === '"') {
        if (s[i + 1] === '"') { cur += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      cur += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ',') { row.push(cur); cur = ''; i++; continue; }
    if (c === '\r' && s[i + 1] === '\n') { row.push(cur); cells.push(row); row = []; cur = ''; i += 2; continue; }
    cur += c; i++;
  }
  if (cur.length || row.length) { row.push(cur); cells.push(row); }
  if (cells.length !== 2) return null;
  const [head, data] = cells;
  if (data.length !== head.length) return null;
  const obj = {};
  head.forEach((h, n) => { obj[h] = data[n]; });
  return obj;
}

function main() {
  const check = process.argv.includes('--check');
  const page = sf.pageBody(HANDLE);
  const live = page.body_html;
  console.log('live ' + HANDLE + ': ' + live.length + ' bytes, updated_at ' + page.updated_at);

  const r = build(live);
  if (r.problems.length) {
    console.error('\nREFUSED, nothing written:');
    for (const p of r.problems) console.error('  - ' + p);
    process.exit(1);
  }

  console.log('  the padded key is on ' + ITEM + ', at byte ' + r.at);
  console.log('  repaired body: ' + r.out.length + ' bytes (one less, the newline)');
  console.log('  every other key unchanged, nothing padded remains, sheet parses back identical');

  if (check) { console.log('\n--check: built and verified, not written'); return; }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(SHEET, r.csv);
  //  A plain handle-to-body map, which is both the shape the csa-11 precedent
  //  records and the shape scripts/matrixify-preflight.js --carrying reads, so
  //  the pre-import body proves the emoji and the non-ASCII were already live
  //  rather than introduced here. Metadata stays out of it on purpose: a file
  //  with one job is a file that can be handed to the preflight unchanged.
  fs.writeFileSync(SNAP, JSON.stringify({ [HANDLE]: live }, null, 2) + '\n');
  console.log('\n  wrote ' + SHEET);
  console.log('  wrote ' + SNAP + '  (the pre-import body, updated_at ' + page.updated_at + ')');
  console.log('\n  preflight it with:');
  console.log('    node scripts/matrixify-preflight.js ' + path.relative(process.cwd(), SHEET)
    + ' --expect-command MERGE --carrying ' + path.relative(process.cwd(), SNAP));
}

if (require.main === module) main();
module.exports = { HANDLE, ITEM, BROKEN, FIXED, SHEET, SNAP, build, sheet, parseBack };
