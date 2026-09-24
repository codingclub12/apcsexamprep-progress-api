'use strict';
// -----------------------------------------------------------------------------
//  NEW PAGES THE HOMEPAGE REDESIGN LINKS TO AND NOBODY HAD BUILT (board #409)
//
//    /pages/ap-csp-exam-format   404. CSA, Cyber and Networking each have an
//                                exam format page; CSP did not.
//    /pages/ap-networking-labs   404. Eight lab pages and no index.
//    /pages/about                301s to the tutor page. A Shopify URL
//                                redirect only fires when nothing lives at the
//                                path, so creating the page takes it over;
//                                deleting the redirect afterwards is tidying.
//
//  The redesigned homepage and nav (theme PR #131) link each of these only
//  when the page exists (pages[handle].id), so importing this sheet is what
//  switches those links on. Order does not matter.
//
//  Bodies live in shopify/<handle>.html. Unlike the plain confirm pages these
//  carry one <style> block, the pattern the site's rich pages already use, so
//  this builder enforces what makes that safe instead of banning it.
//
//  -- WHAT IT REFUSES ---------------------------------------------------------
//    1  a handle that already serves a page (200). 404 is expected; a 301 is
//       allowed only where ALLOW_REDIRECT names the handle
//    2  a body with a non-ASCII character, an em-dash or a <script>
//    3  a CSS rule whose selector is not scoped under the page's wrapper id
//    4  a CSS rule that sets color without -webkit-text-fill-color
//    5  a CED learning objective or Essential Knowledge code in the body
//    6  an internal link that is neither in the live sitemap nor answering 200,
//       unless it points at another page in this same sheet
//    7  an SEO title over 60 characters or a description outside 140 to 160
//    8  a sheet that does not parse back to exactly the rows written
//    9  anything scripts/matrixify-preflight.js refuses
//
//  One refusal stops the run and writes no file.
//
//  Run: node scripts/build-2026-09-24-new-pages-sheet.js [--offline]
//  --offline skips 1 and the live half of 6. Never import an offline build.
//  No em-dashes, per repo convention.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { preflight, parseCsv } = require('./matrixify-preflight');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'imports', '2026-09-24-new-pages');
const HEADER = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At', 'SEO Title', 'SEO Description'];
const PUBLISHED_AT = '2026-03-01 12:00:00';
const ALLOW_REDIRECT = new Set(['about']);

const PAGES = require('./new-pages-2026-09-24.json');

const bodyOf = (handle) => fs.readFileSync(path.join(ROOT, 'shopify', handle + '.html'), 'utf8');

function internalLinks(html) {
  const out = new Set();
  const re = /href="(\/[^"#?]*)/g;
  let m;
  while ((m = re.exec(html))) if (m[1] !== '/') out.add(m[1].replace(/\/$/, ''));
  return [...out];
}

function cssRules(html) {
  const m = html.match(/<style>([\s\S]*?)<\/style>/i);
  if (!m) return [];
  const css = m[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/@media[^{]*\{/g, '');
  return css.split('}').map((r) => r.trim()).filter((r) => r.includes('{'))
    .map((r) => ({ selector: r.slice(0, r.indexOf('{')).trim(), decl: r.slice(r.indexOf('{') + 1) }));
}

//  THE PURE HALF, so a test can break each rule without a network.
function checkBody(page, html) {
  const problems = [];
  const h = page.handle;
  if (/[^\x00-\x7F]/.test(html)) problems.push(h + ': non-ASCII character in the body');
  if (/&mdash;|—/i.test(html)) problems.push(h + ': em-dash in the body');
  if (/<script/i.test(html)) problems.push(h + ': a <script> in the body');
  if ((html.match(/<style>/gi) || []).length > 1) problems.push(h + ': more than one <style> block');
  if (!html.includes('id="' + page.wrapper + '"')) problems.push(h + ': wrapper #' + page.wrapper + ' is missing');
  for (const r of cssRules(html)) {
    for (const sel of r.selector.split(',').map((x) => x.trim()).filter(Boolean)) {
      if (!sel.startsWith('#' + page.wrapper)) problems.push(h + ': CSS selector not scoped to #' + page.wrapper + ': ' + sel);
    }
    if (/(^|[;\s{])color\s*:/.test(r.decl) && !/-webkit-text-fill-color\s*:/.test(r.decl)) {
      problems.push(h + ': color set without -webkit-text-fill-color in ' + r.selector);
    }
  }
  const visible = html.replace(/<style>[\s\S]*?<\/style>/i, '').replace(/<!--[\s\S]*?-->/g, '');
  const code = visible.match(/\b(?:CRD|AAP|DAT|CSN|IOC|VAR|CON|MOD|LO|EK)-\d+\.[A-Z]/);
  if (code) problems.push(h + ': CED code in the body: ' + code[0]);
  const cyberEk = visible.match(/\b\d\.\d\.[A-Z]\.\d\b/);
  if (cyberEk) problems.push(h + ': Essential Knowledge code in the body: ' + cyberEk[0]);
  if (!internalLinks(html).length) problems.push(h + ': no internal link, so the page is a dead end');
  if (!page.seo_title || page.seo_title.length > 60) problems.push(h + ': SEO title missing or over 60 characters');
  if (!page.seo_description || page.seo_description.length < 140 || page.seo_description.length > 160) {
    problems.push(h + ': SEO description is ' + (page.seo_description || '').length + ' characters, not 140 to 160');
  }
  if (/[^\x00-\x7F]|—/.test(page.title + page.seo_title + page.seo_description)) problems.push(h + ': non-ASCII in title or SEO fields');
  return problems;
}

const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
const rowOf = (r) => [r.handle, 'MERGE', r.title, r.body, 'TRUE', PUBLISHED_AT, r.seo_title, r.seo_description];

function writeSheet(file, rows) {
  const lines = [HEADER.map(cell).join(',')];
  for (const r of rows) lines.push(rowOf(r).map(cell).join(','));
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
    const want = rowOf(spec);
    for (let i = 0; i < want.length; i++) {
      if (rec[i] !== want[i]) throw new Error(rec[0] + ': column ' + HEADER[i] + ' differs after the round trip');
    }
  }
  return parsed.length;
}

function main(argv) {
  const offline = argv.includes('--offline');
  const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1].split(',') : null;
  const pages = only ? PAGES.filter((p) => only.includes(p.handle)) : PAGES;
  const rows = pages.map((p) => Object.assign({}, p, { body: bodyOf(p.handle) }));
  const inSheet = new Set(rows.map((r) => '/pages/' + r.handle));
  const problems = [];
  let sitemap = null;
  const smPath = process.env.SITEMAP_PATHS;
  if (smPath && fs.existsSync(smPath)) sitemap = new Set(JSON.parse(fs.readFileSync(smPath, 'utf8')));

  const sf = offline ? null : require('../lib/storefront-fetch');
  const pause = () => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2500);
  for (const r of rows) {
    checkBody(r, r.body).forEach((m) => problems.push(m));
    if (offline) continue;
    const own = sf.status('/pages/' + r.handle); pause();
    const ok = own.code === '404' || (own.code === '301' && ALLOW_REDIRECT.has(r.handle));
    if (!ok) problems.push(r.handle + ': answers ' + own.code + ', so something already lives there; read it first');
    for (const link of internalLinks(r.body)) {
      if (inSheet.has(link) || (sitemap && sitemap.has(link))) continue;
      const res = sf.status(link); pause();
      if (res.code !== '200') problems.push(r.handle + ': links to ' + link + ', which answers ' + res.code);
    }
  }
  if (problems.length) {
    console.error('\n  ' + problems.length + ' problem(s). No file written:\n');
    problems.forEach((m) => console.error('    ' + m));
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  //  The name has to contain "page" or Matrixify rejects the file outright.
  const file = path.join(OUT_DIR, 'new-pages.csv');
  writeSheet(file, rows);
  const back = readBack(file, rows);
  const pf = preflight(file, { expectCommand: 'MERGE' });
  if (pf.problems.length) {
    fs.unlinkSync(file);
    console.error('\n  Preflight refused, file removed:\n');
    pf.problems.forEach((p) => console.error('    ' + p));
    process.exit(1);
  }
  pf.notes.forEach((n) => console.log('  note: ' + n));
  console.log('\n  ' + back + ' row(s), parsed back, preflight clear: ' + path.relative(process.cwd(), file));
  for (const r of rows) console.log('    ' + r.handle + '  ' + r.body.length + ' bytes, ' + internalLinks(r.body).length + ' internal link(s)');
  if (offline) console.log('  OFFLINE BUILD: live checks skipped. Do not import this file.');
  console.log('  Import settings: MERGE, QUOTE_ALL, utf-8-sig. One sheet at a time.\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { PAGES, HEADER, checkBody, cssRules, internalLinks, writeSheet, readBack };
