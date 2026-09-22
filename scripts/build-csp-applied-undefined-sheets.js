'use strict';
// -----------------------------------------------------------------------------
//  FOUR SHEETS THAT MAKE THE APPLIED CHALLENGE CARD STATE ITS REAL LENGTH.
//
//  Seventeen live CSP lesson pages, split one sheet per Big Idea, because MERGE
//  overwrites a live body with no undo and the blast radius of one click is
//  however many rows you chose to put in the file.
//
//  ── WHAT IS REPLACED ────────────────────────────────────────────────────────
//      before  Applied Challenge<span>undefined questions, and every answer is
//              recorded for your teacher</span>
//      after   Applied Challenge<span>6 questions, and every answer is
//              recorded for your teacher</span>
//
//  BROKEN and fixed() are imported from scripts/build-bi3-undefined-sheet.js,
//  which shipped the same repair for Big Idea 3 on 2026-09-21. Restating them
//  here would be a second opinion about one string, and the two sheets have to
//  produce byte-identical cards or the next sweep reads a difference as a
//  finding.
//
//  ── WHY BIG IDEA 3 IS NOT IN HERE ───────────────────────────────────────────
//  Its fourteen remaining pages already have an unimported sheet. A page in two
//  sheets is the failure mode splitting exists to remove, so the overlap is
//  asserted to be zero rather than assumed, by parsing that sheet's handles back
//  out of the CSV on disk.
//
//  ── WHAT IT REFUSES, PER ROW ────────────────────────────────────────────────
//    1  a handle whose live page does not serve, or answers a bad 200
//    2  a body where the broken card appears any number of times other than once
//    3  a card whose anchor cannot be read, so the target is unknown
//    4  a target page that is not the exercise-2 renderer (id="csp-x2")
//    5  a target serving zero graded items, so there is no number to state
//    6  a patched body that still says "undefined questions"
//    7  a patched body differing from the live one anywhere except that card,
//       proved by length arithmetic and by an inverse round trip
//    8  a patch that introduces a non-ASCII character
//    9  a handle that also appears in the Big Idea 3 sheet
//
//  One refusal stops the whole run and writes no file. A sheet with one
//  unverifiable row is not a sheet with one bad row; it is a sheet nobody can
//  vouch for.
//
//  Run: node scripts/build-csp-applied-undefined-sheets.js [--out <dir>]
//  No em-dashes, per repo convention.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');
const { BY_BIG_IDEA } = require('./verify-csp-applied-undefined-live');
const { WRAPPER } = require('./verify-csp-bi3-undefined-live');
const { BROKEN, fixed } = require('./build-bi3-undefined-sheet');
const { parseCsv } = require('./build-leaderboard-xss-sheets');
const { preflight } = require('./matrixify-preflight');

const BI3_SHEET = path.join(__dirname, '..', 'imports', '2026-09-21',
  'csp-bi3-applied-challenge-undefined-fix-remaining.csv');

const HEADER = ['Handle', 'Command', 'Body HTML'];

class NoSuchPage extends Error {}

//  404 means absent. A bad 200 means the fetch failed and is retried rather
//  than quietly filed as "nothing to do": on 2026-09-21 a 200 carrying HTML
//  made a builder drop the one page the whole finding was named after.
function livePage(h, attempts = 3) {
  let last = null;
  for (let i = 0; i < attempts; i++) {
    const r = sf.raw('/pages/' + h + '.json');
    if (String(r.code) === '404') throw new NoSuchPage(h + ': 404');
    if (String(r.code) === '200') {
      try {
        const p = JSON.parse(r.body).page;
        if (p && typeof p.body_html === 'string') return p;
        last = 'a 200 with no body_html';
      } catch (e) { last = 'a 200 that is not JSON'; }
    } else last = 'HTTP ' + r.code;
  }
  throw new Error(h + ': ' + attempts + ' attempts, last was ' + last);
}

//  Apply the replacement backwards. If the result is not the live body byte for
//  byte then something other than the declared card moved, and no count of
//  replacements can tell you that.
function inverseOf(after, n) {
  return after.split(fixed(n)).join(BROKEN);
}

function nonAsciiAdded(before, after) {
  const tally = (s) => {
    const m = new Map();
    for (const ch of s) if (ch.codePointAt(0) > 127) m.set(ch, (m.get(ch) || 0) + 1);
    return m;
  };
  const b = tally(before);
  const a = tally(after);
  const out = [];
  for (const [ch, k] of a) if (k > (b.get(ch) || 0)) out.push(ch);
  return out;
}

function bi3Handles() {
  if (!fs.existsSync(BI3_SHEET)) return null;
  const rows = parseCsv(fs.readFileSync(BI3_SHEET, 'utf8').replace(/^﻿/, ''));
  rows.shift();
  return new Set(rows.map((r) => r[0]).filter(Boolean));
}

const ANCHOR = /<a class="ex wide"\s+href="([^"]+)"\s*>\s*Applied Challenge/;

//  THE PURE HALF, so the refusals can be broken on purpose without a network.
//  Takes the live body and the count already measured off the target, returns
//  a row or a list of reasons. Everything that can damage a live page is
//  decided here, which is what makes smoke/csp-applied-undefined.js able to
//  prove each refusal fires for its own reason.
function patchBody(handle, src, target, n, reserved) {
  const problems = [];
  //  ZERO IS NOT A COUNT, and this refusal lives here rather than beside the
  //  fetch on purpose. A target serving no graded items means the number is
  //  unknown, and "0 questions" on a card is a worse lie than "undefined":
  //  "undefined" is visibly broken and gets reported, a confident 0 is not.
  if (!Number.isInteger(n) || n <= 0) {
    problems.push(handle + ': the measured question count is ' + JSON.stringify(n)
      + ', so there is no number to state');
    return { problems };
  }
  const hits = src.split(BROKEN).length - 1;
  if (hits !== 1) {
    problems.push(handle + ': the broken card appears ' + hits + ' time(s), expected exactly 1');
    return { problems };
  }
  const after = src.split(BROKEN).join(fixed(n));
  const checks = [
    [!after.includes('undefined questions'), 'the page still says "undefined questions"'],
    [after.includes(fixed(n)), 'the repaired card is not present'],
    [after !== src, 'the body did not change'],
    [src.length - BROKEN.length + fixed(n).length === after.length, 'more than the card changed (length)'],
    [inverseOf(after, n) === src, 'the change does not reverse to the live body, so something else moved'],
    [nonAsciiAdded(src, after).length === 0, 'the patch introduces non-ASCII'],
    [!reserved || !reserved.has(handle), 'this handle is already in the Big Idea 3 sheet'],
  ];
  for (const [pass, msg] of checks) if (!pass) problems.push(handle + ': ' + msg);
  if (problems.length) return { problems };
  return { problems, row: { handle, target, questions: n, before: src, after } };
}

function buildRow(handle, reserved, problems) {
  let page;
  try { page = livePage(handle); } catch (e) {
    problems.push(handle + (e instanceof NoSuchPage ? ': has no live page' : ': ' + e.message));
    return null;
  }
  const src = page.body_html;

  const m = src.match(ANCHOR);
  if (!m) { problems.push(handle + ': found no Applied Challenge anchor'); return null; }

  let ex;
  try { ex = sf.page(m[1].startsWith('/') ? m[1] : '/pages/' + m[1]).body; }
  catch (e) { problems.push(handle + ': target ' + m[1] + ' did not serve (' + e.message.slice(0, 60) + ')'); return null; }
  if (!ex.includes(WRAPPER)) { problems.push(handle + ': target ' + m[1] + ' is not the exercise renderer'); return null; }
  const n = (ex.match(/class="mcq-item"/g) || []).length;
  if (!n) { problems.push(handle + ': target ' + m[1] + ' serves zero graded items'); return null; }

  const out = patchBody(handle, src, m[1], n, reserved);
  if (!out.row) { out.problems.forEach((p) => problems.push(p)); return null; }
  return out.row;
}

const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';

function writeSheet(file, rows) {
  const lines = [HEADER.map(cell).join(',')];
  for (const r of rows) lines.push([r.handle, 'MERGE', r.after].map(cell).join(','));
  //  UTF-8 with BOM, QUOTE_ALL, CRLF between records. MERGE, and no
  //  Published At column at all: a blank cell is an ERASE in every column and
  //  a live server time in that one would republish seventeen pages as new.
  fs.writeFileSync(file, '﻿' + lines.join('\r\n') + '\r\n');
}

//  Generation is not evidence that generation worked. The CSP sheet lost 90
//  bytes a page while every semantic check passed, and a parse back diff is
//  what caught it.
function readBack(file, rows) {
  const parsed = parseCsv(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  const head = parsed.shift();
  if (head.join(',') !== HEADER.join(',')) throw new Error(file + ': header did not survive the round trip');
  if (parsed.length !== rows.length) throw new Error(file + ': ' + parsed.length + ' rows read back, ' + rows.length + ' written');
  for (const rec of parsed) {
    const spec = rows.find((r) => r.handle === rec[0]);
    if (!spec) throw new Error(file + ': unknown handle read back: ' + rec[0]);
    if (rec[1] !== 'MERGE') throw new Error(file + ': ' + rec[0] + ' is not MERGE');
    if (rec[2] !== spec.after) throw new Error(file + ': ' + rec[0] + ': body differs after the round trip');
    if (rec.length !== HEADER.length) throw new Error(file + ': ' + rec[0] + ': ' + rec.length + ' columns, expected ' + HEADER.length);
  }
  return parsed.length;
}

function main(argv) {
  const outAt = argv.indexOf('--out');
  const outDir = outAt > -1 ? argv[outAt + 1] : path.join(__dirname, '..', 'imports', '2026-09-22');
  fs.mkdirSync(outDir, { recursive: true });

  const reserved = bi3Handles();
  if (reserved === null) {
    console.error('\n  Refused: the Big Idea 3 sheet is not on disk, so the overlap check cannot run.\n'
      + '  Expected ' + BI3_SHEET + '\n');
    process.exit(1);
  }

  const problems = [];
  const built = {};
  for (const bi of Object.keys(BY_BIG_IDEA).sort()) {
    built[bi] = [];
    for (const handle of BY_BIG_IDEA[bi]) {
      const row = buildRow(handle, reserved, problems);
      if (row) built[bi].push(row);
    }
  }

  if (problems.length) {
    console.error('\n  ' + problems.length + ' problem(s). No file written:\n');
    problems.forEach((m) => console.error('    ' + m));
    process.exit(1);
  }

  const all = Object.keys(built).reduce((a, k) => a.concat(built[k]), []);
  if (new Set(all.map((r) => r.handle)).size !== all.length) {
    console.error('\n  Refused: a handle appears in more than one sheet.\n');
    process.exit(1);
  }

  console.log('');
  let total = 0;
  const refused = [];
  for (const bi of Object.keys(built).sort()) {
    //  The file name has to contain "page" or Matrixify rejects the whole file
    //  in one second: a CSV has no tab name, so the NAME carries the sheet type.
    const file = path.join(outDir, 'csp-applied-challenge-undefined-bi' + bi + '-pages.csv');
    writeSheet(file, built[bi]);
    const back = readBack(file, built[bi]);
    total += back;

    //  Preflight runs HERE, with the live bodies still in hand, because its
    //  emoji rule needs an original to prove a character was already on the
    //  page rather than introduced by this patch. Run from the command line
    //  with no --carrying, it has to assume "introduced" and refuses, which is
    //  the right default and the wrong answer for a sheet built out of the
    //  bodies it is replacing.
    const carrying = {};
    for (const r of built[bi]) carrying[r.handle] = r.before;
    const pf = preflight(file, { expectCommand: 'MERGE', carrying });
    if (pf.problems.length) {
      refused.push([path.basename(file), pf.problems]);
    }

    console.log('  bi' + bi + '  ' + String(back).padStart(2) + ' row(s)  '
      + (fs.statSync(file).size / 1024).toFixed(0).padStart(4) + ' KB  '
      + (pf.problems.length ? 'PREFLIGHT REFUSED  ' : 'preflight clear  ') + path.basename(file));
    for (const r of built[bi]) {
      console.log('        ' + r.handle.padEnd(50) + r.questions + ' questions  (' + r.target + ')');
    }
  }
  if (refused.length) {
    console.error('\n  Preflight refused ' + refused.length + ' sheet(s):\n');
    for (const [name, ps] of refused) ps.forEach((p) => console.error('    ' + name + ': ' + p));
    process.exit(1);
  }
  console.log('\n  ' + total + ' page(s) across ' + Object.keys(built).length + ' sheet(s), '
    + 'zero overlap with the ' + reserved.size + ' handles in the Big Idea 3 sheet.');
  console.log('  Import settings: MERGE, QUOTE_ALL, utf-8-sig. One sheet at a time.');
  console.log('  Before importing: node scripts/verify-csp-applied-undefined-live.js --before');
  console.log('  After each import: node scripts/verify-csp-applied-undefined-live.js\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { buildRow, patchBody, inverseOf, nonAsciiAdded, writeSheet, readBack,
  bi3Handles, HEADER, BI3_SHEET, ANCHOR };
