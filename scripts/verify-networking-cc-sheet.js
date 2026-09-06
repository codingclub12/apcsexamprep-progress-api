'use strict';
// -----------------------------------------------------------------------------
//  PARSE THE NETWORKING COMMAND CENTER SHEET BACK AND DIFF IT AGAINST THE SOURCE.
//
//  Generation is not evidence that generation worked. The CSP sheet lost 90
//  bytes a page while every semantic check passed, and a parse-back diff is what
//  caught it. So this reads the CSV the way Matrixify will, pulls the Body HTML
//  cell out of it, and checks the result against the body it was built from.
//
//  It shares NO code with scripts/networking-cc-gate-files.js on purpose. The
//  generator's own assertions run on the string it is about to write; these run
//  on the bytes that came back off disk through a CSV parser. A quoting bug
//  lives exactly in the gap between those two.
//
//  Run: node scripts/verify-networking-cc-sheet.js <sheet.csv> <source-body.html>
// -----------------------------------------------------------------------------

const fs = require('fs');
const crypto = require('crypto');
const MANIFEST = require('../seed/networking-teacher-files.json');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + String(x).slice(0, 200) : '')); }
};

// A real RFC4180 reader rather than a split on commas, because the Body HTML
// cell is 398 KB of HTML containing both commas and doubled quotes, and a naive
// split would "pass" on a file Matrixify would reject.
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [], cell = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQ = false;
      } else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\r') { /* skip */ }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function fileId(driveId) {
  return crypto.createHash('sha256').update(`drive:folder:${driveId}`).digest('hex').slice(0, 16);
}

const [, , sheetPath, srcPath] = process.argv;
if (!sheetPath || !srcPath) {
  console.error('usage: node scripts/verify-networking-cc-sheet.js <sheet.csv> <source-body.html>');
  process.exit(2);
}

const raw = fs.readFileSync(sheetPath, 'utf8');
const src = fs.readFileSync(srcPath, 'utf8');

console.log('\nNETWORKING COMMAND CENTER SHEET, PARSED BACK\n');

console.log('1. The file is a well formed one-row Matrixify sheet');
const rows = parseCsv(raw);
ok('  parses as CSV', Array.isArray(rows) && rows.length >= 2, rows && rows.length);
ok('  carries a UTF-8 BOM (utf-8-sig)', raw.charCodeAt(0) === 0xFEFF);
ok('  header is Handle, Command, Body HTML',
   JSON.stringify(rows[0]) === JSON.stringify(['Handle', 'Command', 'Body HTML']), JSON.stringify(rows[0]));
ok('  exactly one data row', rows.length === 2, rows.length);
const [handle, command, body] = rows[1] || [];
ok('  handle is ap-networking-command-center', handle === 'ap-networking-command-center', handle);
ok('  command is MERGE', command === 'MERGE', command);
ok('  CRLF line endings', raw.includes('\r\n'));

console.log('2. The exposure is gone from the body Matrixify would import');
ok('  zero Drive FOLDER references', !/drive\.google\.com\/drive\/folders/.test(body),
   (body.match(/drive\.google\.com\/drive\/folders/g) || []).length);
ok('  zero tf: Drive urls', !/tf:"https:\/\/drive\.google\.com/.test(body));
ok('  zero tests: Drive urls', !/tests:"https:\/\/drive\.google\.com/.test(body));

const ids = (body.match(/"api:([0-9a-f]{16})"/g) || []).map((s) => s.slice(5, -1));
ok('  26 api: ids present', ids.length === 26, ids.length);
ok('  every api: id is in seed/networking-teacher-files.json',
   ids.every((i) => Object.prototype.hasOwnProperty.call(MANIFEST, i)),
   ids.filter((i) => !MANIFEST[i]).join(','));
ok('  the 26 ids are distinct', new Set(ids).size === 26, new Set(ids).size);

// The ids must be the ones derived from the folders that WERE on the page, not
// merely 26 ids that happen to be in the manifest.
const srcFolders = [...src.matchAll(/(?:tf|tests):"https:\/\/drive\.google\.com\/drive\/folders\/([A-Za-z0-9_-]+)"/g)].map((m) => m[1]);
ok('  source had 26 teacher folders', srcFolders.length === 26, srcFolders.length);
ok('  every source folder is represented by its own derived id',
   srcFolders.every((f) => ids.includes(fileId(f))),
   srcFolders.filter((f) => !ids.includes(fileId(f))).join(','));

console.log('3. The 44 student links survived byte for byte');
const sBefore = src.match(/s[dg]:"https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+\/view"/g) || [];
const sAfter = body.match(/s[dg]:"https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+\/view"/g) || [];
ok('  44 in the source', sBefore.length === 44, sBefore.length);
ok('  44 in the sheet', sAfter.length === 44, sAfter.length);
ok('  identical set, none altered',
   JSON.stringify(sBefore.slice().sort()) === JSON.stringify(sAfter.slice().sort()));

console.log('4. The click path was actually rewired');
ok('  matButton emits data-file for api: hrefs', body.includes(`data-file="'+esc(url.slice(4))`), null);
ok('  the unit tests anchor handles api: too', body.includes("String(u.tests).indexOf('api:')===0"));
ok('  exactly one delegated click listener', (body.match(/a\[data-file\]/g) || []).length === 1,
   (body.match(/a\[data-file\]/g) || []).length);
ok('  the listener sends the teacher token', body.includes("localStorage.getItem('apcse_teacher_token')"));
ok('  it calls the gated endpoint with as=json', body.includes("/api/files/") && body.includes('?as=json'));

console.log('5. Nothing else moved');
// Everything outside the DATA blob and the two render sites must be untouched.
// Compared by size delta and by a spot set of structural markers rather than a
// full diff, because a full diff of 398 KB is not readable output.
const grew = Buffer.byteLength(body) - Buffer.byteLength(src);
ok('  body grew only by the gate code (under 3 KB)', grew > 0 && grew < 3072, grew + ' bytes');
// These are markers of the PAGE BODY. BreadcrumbList used to be in this list and
// was removed on 2026-09-04: it is theme-level structured data that lives in the
// rendered document, never in Shopify's Body HTML field. It only ever passed
// because the sheet being checked wrongly contained the whole rendered page, so
// the assertion was confirming the bug rather than catching it.
for (const marker of ['anet-wrap', 'function matButton', 'function siteButton', 'apcse_teacher_token']) {
  ok(`  still carries ${JSON.stringify(marker)}`, body.includes(marker));
}
// And the positive form of the same lesson: a body that carries document
// furniture is a rendered page, not a fragment, and must never be imported.
for (const tell of ['<!doctype', '<html', '<head>', '</body>', '</html>']) {
  ok(`  body does NOT contain ${JSON.stringify(tell)} (it is a fragment, not a document)`,
     !body.toLowerCase().includes(tell.toLowerCase()));
}
// The student-facing render path must be untouched.
ok('  siteButton is byte identical',
   (src.match(/function siteButton[\s\S]{0,240}/) || [''])[0] === (body.match(/function siteButton[\s\S]{0,240}/) || [''])[0]);

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
