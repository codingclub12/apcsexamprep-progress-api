'use strict';
// ---------------------------------------------------------------------------
//  ONE ATTRIBUTE OFF ONE PAGE, AND THE REASON IT IS NOT A REPORTER FIX.
//
//      node scripts/cyber-frq-item-id-sheet.js [--out <path>]
//
//  ap-cyber-unit-1-frq-practice carries data-item-id="unit-1-frq" on its wrapper
//  and loads no apcs-score-reporter.js. The nightly site audit has called that a
//  P0 ("graded page loads no reporter") every night since 2026-08-28, because
//  lib/site-crawl.js treats data-item-id as the manifest-gated grade path, which
//  is what CLAUDE.md says it is.
//
//  The reporter is NOT the fix, and the measurement is the reason:
//
//      trailingActivity('ap-cyber-unit-1-frq-practice')  ->  lesson
//      trailingActivity('ap-csa-lesson-1-2-frq')         ->  exercise-3
//      pageFromHandle('ap-cyber-unit-1-frq-practice')    ->  null
//
//  utils.js ACTIVITY_ALIASES maps frq to exercise-3, but trailingActivity() fires
//  on h.endsWith('-frq') and this handle ends '-practice'. So the alias never
//  applies and the server resolves the handle to nothing at all. There is no
//  course_manifest row, no course_denominators column, and no lesson for it to
//  file under. A reporter here would have nothing to post to.
//
//  The page itself agrees. It is a SELF-SCORED free response set: "Write your
//  responses, then reveal the model answers and self-score out of 14." Nothing
//  on it computes a machine score, and a student's self-report is not a grade.
//
//  So the attribute is the defect. Removing it clears the P0 and changes nothing
//  a student sees.
//
//  -- WHY data-lesson-id STAYS -----------------------------------------------
//  data-lesson-id="unit-1-frq" is equally non-conformant, and it is inert: the
//  cyber wiring's named-landing branch tests /^\d+\.\d+$/ and rejects it, and the
//  crawler keys on data-item-id alone. Removing it too would be a second edit
//  with no defect behind it. Minimal is the rule.
//
//  -- WHAT THIS SCRIPT REFUSES TO DO -----------------------------------------
//  It reads the live body through lib/storefront-fetch.js pageBody(), which goes
//  to /pages/<handle>.json rather than the rendered page, because a rendered body
//  carries Cloudflare's email rewrite and the div-counting extraction drift that
//  file documents. It asserts the attribute appears EXACTLY once, that removing
//  it changes exactly its own length, and that the two bodies are otherwise byte
//  identical. Then it parses the written CSV back with a reader it did not use to
//  write, and diffs that against the body it meant to ship, because generating a
//  sheet is not evidence that generation worked.
//
//  Pure ASCII source, no em-dashes, per repo convention.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sf = require('../lib/storefront-fetch.js');

const HANDLE = 'ap-cyber-unit-1-frq-practice';
//  The exact bytes coming out, leading space included, so the diff below can
//  assert the length delta rather than trust a regex.
const ATTR = ' data-item-id="unit-1-frq"';
//  The columns Matrixify is given, pinned as a literal so the round-trip check
//  below has something independent to compare against.
const COLUMNS = ['Handle', 'Command', 'Body HTML'];
//  Written as an escape, not as a literal, so this file stays readable ASCII and
//  nobody deletes an invisible character by accident. It is load bearing: without
//  it the consuming tool guesses Latin-1 and a bullet arrives as three chars.
const BOM = '\uFEFF';
const DEFAULT_OUT = path.join(__dirname, '..', 'imports', '2026-09-06',
  'cyber-unit1-frq-item-id-pages.csv');

const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

//  QUOTE_ALL, CRLF, BOM. Every one of those is a preflight rule and each is
//  there because breaking it damaged live content once.
function toCsv(header, rows) {
  const cell = (v) => '"' + String(v).replace(/"/g, '""') + '"';
  const line = (arr) => arr.map(cell).join(',');
  return BOM + [line(header)].concat(rows.map(line)).join('\r\n') + '\r\n';
}

//  Deliberately not the writer above. A round trip through the same code proves
//  nothing about the file.
function parseCsv(text) {
  const s = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\r' && s[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function main() {
  const argv = process.argv.slice(2);
  const oi = argv.indexOf('--out');
  const out = oi === -1 ? DEFAULT_OUT : argv[oi + 1];

  const page = sf.pageBody(HANDLE);
  const before = page.body_html;
  const fail = (m) => { console.error('REFUSED: ' + m); process.exit(1); };

  console.log('handle       ' + HANDLE);
  console.log('live body    ' + before.length + ' chars, sha256 ' + sha(before));

  const hits = (before.match(/data-item-id/g) || []).length;
  if (hits !== 1) fail('expected exactly 1 data-item-id in the live body, found ' + hits
    + '. The page changed shape; re-read it before shipping a sheet.');
  if (before.indexOf(ATTR) === -1) fail('the live body carries data-item-id but not the exact '
    + 'string ' + JSON.stringify(ATTR) + '. Attribute order or quoting changed.');

  const after = before.replace(ATTR, '');

  //  Three independent ways of saying the same thing, because one of them alone
  //  would pass on a body that lost something else at the same time.
  if (after.length !== before.length - ATTR.length) {
    fail('length delta is ' + (before.length - after.length) + ', expected ' + ATTR.length);
  }
  if ((after.match(/data-item-id/g) || []).length !== 0) fail('data-item-id survived the removal');
  const idx = before.indexOf(ATTR);
  if (before.slice(0, idx) !== after.slice(0, idx)
      || before.slice(idx + ATTR.length) !== after.slice(idx)) {
    fail('the bodies differ somewhere other than the removed attribute');
  }

  console.log('after        ' + after.length + ' chars, sha256 ' + sha(after));
  console.log('removed      ' + JSON.stringify(ATTR) + ' at offset ' + idx);
  console.log('wrapper now  ' + JSON.stringify((after.match(/<div id="cfrq"[^>]*>/) || [])[0]));

  const header = COLUMNS.slice();
  const csv = toCsv(header, [[HANDLE, 'MERGE', after]]);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, csv, 'utf8');
  console.log('wrote        ' + out + ' (' + Buffer.byteLength(csv, 'utf8') + ' bytes)');

  //  -- PARSE IT BACK --------------------------------------------------------
  const reread = parseCsv(fs.readFileSync(out, 'utf8'));
  if (reread.length !== 2) fail('read back ' + reread.length + ' rows, expected 2');
  //  Written out a SECOND time on purpose, rather than compared against COLUMNS.
  //  Comparing the parsed header to the same constant that wrote it passes for any
  //  value of that constant, because both sides move together: it can catch CSV
  //  corruption and never a wrong column name. Found by mutation, twice. Renaming
  //  the column to Body_HTML left this green, and the shared preflight said
  //  "clear to import" on that sheet as well, because col('Body HTML') returns -1
  //  and every body rule then skips itself. Matrixify ignores a column it does not
  //  know, so the import would have been a silent no-op that read as shipped.
  const EXPECTED_HEADER = 'Handle,Command,Body HTML';
  if (reread[0].join(',') !== EXPECTED_HEADER) {
    fail('header is ' + JSON.stringify(reread[0].join(','))
      + ' rather than ' + JSON.stringify(EXPECTED_HEADER)
      + '. Matrixify ignores a column it does not recognise, so this would import nothing.');
  }
  const [h, cmd, body] = reread[1];
  if (h !== HANDLE) fail('handle did not survive the round trip');
  if (cmd !== 'MERGE') fail('command did not survive the round trip');
  if (body !== after) {
    fail('the body read back is not the body meant to ship: ' + body.length + ' chars vs '
      + after.length + ', sha256 ' + sha(body) + ' vs ' + sha(after));
  }
  console.log('parse back   2 rows, body sha256 matches, ' + body.length + ' chars');

  //  The body as it stood BEFORE the edit, committed beside the sheet. Two jobs:
  //  it is the --carrying original the preflight wants if this page ever gains an
  //  emoji, and it is the raw artifact scripts/verify-frq-item-id-sheet.py
  //  re-derives the sheet from, offline, in another language, so the check does
  //  not depend on the page still being reachable or still being unchanged.
  const beforeFile = out.replace(/\.csv$/, '.before.json');
  fs.writeFileSync(beforeFile, JSON.stringify({ [HANDLE]: before }), 'utf8');
  console.log('before body  ' + beforeFile);
  console.log('');
  console.log('next: node scripts/matrixify-preflight.js ' + path.relative(process.cwd(), out));
  console.log('      python3 scripts/verify-frq-item-id-sheet.py');
}

main();
