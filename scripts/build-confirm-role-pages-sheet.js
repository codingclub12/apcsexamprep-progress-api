'use strict';
// -----------------------------------------------------------------------------
//  THE TWO ROLE PAGES THE RE-ASK EMAIL LINKS TO AND NOBODY CREATED.
//
//  The live Klaviyo flow "No Course Selected - Re-Ask" (Y3ViBm) sends two
//  emails, templates XqUfYJ and SA2pJw, each with four buttons:
//
//    /pages/confirm-csa       exists
//    /pages/confirm-csp       exists
//    /pages/confirm-teacher   404
//    /pages/confirm-parent    404
//
//  The flow has been live since 2026-07-09. Its conditional splits read the
//  CLICKED EMAIL event's URL, so a teacher who taps the button is still routed
//  onto the Teachers list. What they see is the storefront 404. Reported by a
//  teacher on 2026-09-22; Klaviyo shows 3 people and 8 clicks on the teacher
//  link in September, and none yet on the parent link.
//
//  Creating the pages fixes both emails without touching the flow, because the
//  splits depend on those exact URLs.
//
//  -- WHAT IT REFUSES ---------------------------------------------------------
//    1  a handle that already serves a page (this sheet creates, it never
//       overwrites; if one exists, somebody made it, go read it)
//    2  a body with a non-ASCII character or an em-dash
//    3  a body with a <script> (the old confirm pages carry a broken
//       _learnq identify with a literal placeholder email; do not copy it)
//    4  a body with a <style> block (inline styles only, so nothing can bleed)
//    5  an internal link whose target does not serve a 200 right now
//    6  a sheet that does not parse back to exactly the rows written
//    7  anything scripts/matrixify-preflight.js refuses
//
//  One refusal stops the run and writes no file.
//
//  Run: node scripts/build-confirm-role-pages-sheet.js [--out <dir>] [--offline]
//  --offline skips 1 and 5 (the smoke uses it). Never import an offline build.
//  No em-dashes, per repo convention.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { preflight, parseCsv } = require('./matrixify-preflight');

const ROOT = path.join(__dirname, '..');
const HEADER = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'];
//  The store's fixed publish date. A live server time scrambles sort order.
const PUBLISHED_AT = '2026-03-01 12:00:00';

const PAGES = [
  { handle: 'confirm-teacher', title: 'Confirm Teacher' },
  { handle: 'confirm-parent', title: 'Confirm Parent' },
];

const bodyOf = (handle) => fs.readFileSync(path.join(ROOT, 'shopify', handle + '.html'), 'utf8');

function internalLinks(html) {
  const out = [];
  const re = /href="(\/[^"#?]*)/g;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

//  THE PURE HALF, so the smoke can break each rule without a network.
function checkBody(handle, html) {
  const problems = [];
  if (/[^\x00-\x7F]/.test(html)) problems.push(handle + ': non-ASCII character in the body');
  if (html.indexOf('—') !== -1 || /&mdash;/i.test(html)) problems.push(handle + ': em-dash in the body');
  if (/<script/i.test(html)) problems.push(handle + ': a <script> in the body');
  if (/<style/i.test(html)) problems.push(handle + ': a <style> block in the body');
  if (!internalLinks(html).length) problems.push(handle + ': no internal link, so the page is a dead end');
  return problems;
}

function status(p) {
  const sf = require('../lib/storefront-fetch');
  return String(sf.raw(p).code);
}

const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';

function writeSheet(file, rows) {
  const lines = [HEADER.map(cell).join(',')];
  for (const r of rows) lines.push([r.handle, 'MERGE', r.title, r.body, 'TRUE', PUBLISHED_AT].map(cell).join(','));
  fs.writeFileSync(file, '﻿' + lines.join('\r\n') + '\r\n');
}

function readBack(file, rows) {
  const parsed = parseCsv(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  const head = parsed.shift();
  if (head.join(',') !== HEADER.join(',')) throw new Error('header did not survive the round trip');
  if (parsed.length !== rows.length) throw new Error(parsed.length + ' rows read back, ' + rows.length + ' written');
  const seen = new Set();
  for (const rec of parsed) {
    const spec = rows.find((r) => r.handle === rec[0]);
    if (!spec) throw new Error('unknown handle read back: ' + rec[0]);
    if (seen.has(rec[0])) throw new Error('handle appears twice: ' + rec[0]);
    seen.add(rec[0]);
    const want = [spec.handle, 'MERGE', spec.title, spec.body, 'TRUE', PUBLISHED_AT];
    for (let i = 0; i < want.length; i++) {
      if (rec[i] !== want[i]) throw new Error(rec[0] + ': column ' + HEADER[i] + ' differs after the round trip');
    }
  }
  return parsed.length;
}

function main(argv) {
  const offline = argv.includes('--offline');
  const outAt = argv.indexOf('--out');
  const outDir = outAt > -1 ? argv[outAt + 1] : path.join(ROOT, 'imports', '2026-09-23f');

  const problems = [];
  const rows = PAGES.map((p) => ({ handle: p.handle, title: p.title, body: bodyOf(p.handle) }));
  for (const r of rows) {
    checkBody(r.handle, r.body).forEach((m) => problems.push(m));
    if (offline) continue;
    const own = status('/pages/' + r.handle);
    if (own !== '404') problems.push(r.handle + ': answers ' + own + ', not 404, so a page already exists; read it first');
    for (const link of internalLinks(r.body)) {
      const code = status(link);
      if (code !== '200') problems.push(r.handle + ': links to ' + link + ', which answers ' + code);
    }
  }
  if (problems.length) {
    console.error('\n  ' + problems.length + ' problem(s). No file written:\n');
    problems.forEach((m) => console.error('    ' + m));
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  //  The name has to contain "page" or Matrixify rejects the file outright.
  const file = path.join(outDir, 'confirm-role-pages.csv');
  writeSheet(file, rows);
  const back = readBack(file, rows);
  const pf = preflight(file, { expectCommand: 'MERGE' });
  if (pf.problems.length) {
    fs.unlinkSync(file);
    console.error('\n  Preflight refused, file removed:\n');
    pf.problems.forEach((p) => console.error('    ' + p));
    process.exit(1);
  }
  console.log('\n  ' + back + ' row(s), parsed back, preflight clear: ' + path.relative(process.cwd(), file));
  for (const r of rows) console.log('    ' + r.handle + '  ' + internalLinks(r.body).length + ' internal link(s)');
  if (offline) console.log('  OFFLINE BUILD: live checks skipped. Do not import this file.');
  console.log('  Import settings: MERGE, QUOTE_ALL, utf-8-sig. One sheet at a time.\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { PAGES, HEADER, PUBLISHED_AT, checkBody, internalLinks, writeSheet, readBack, bodyOf };
