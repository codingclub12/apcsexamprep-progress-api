'use strict';
// -----------------------------------------------------------------------------
//  THE 1.3 DAY 3 SAMPLE LOGIN PAGES, AS A ONE-ROW SHEET THAT CREATES THE PAGE.
//
//  Slide 2 of the AP Cyber 1.3 Day 3 deck says "Three captive-portal login
//  pages are on the board", and nothing has ever been put on the board: the
//  slide has no images, the notes no link, and no such page or file existed
//  anywhere. A teacher asked where they were on 2026-09-23. This is them.
//
//  WHAT IT REFUSES
//    1  a handle that already serves a page: this sheet CREATES, and a MERGE
//       onto an existing page would replace a body nobody here has read
//    2  anything that could collect input: <form>, <input>, <textarea>,
//       <select>, <script>. It is a picture of a login page, not a login page
//    3  a mock web address on a real domain. Every one must end in .example
//    4  non-ASCII, an em-dash, or a CED Essential Knowledge code: the page is
//       public, so the teacher key on it is student-visible text
//    5  CSS outside the wrapper, or a colour with no -webkit-text-fill-color
//    6  a sheet whose parse-back differs from the source, or a preflight refusal
//
//  Run: node scripts/build-cyber-login-pages-sheet.js
//  No em-dashes, per repo convention.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');
const { parseCsv } = require('./build-leaderboard-xss-sheets');
const { preflight } = require('./matrixify-preflight');

const ROOT = path.join(__dirname, '..');
const HANDLE = 'ap-cyber-unit-1-lesson-3-sample-login-pages';
const TITLE = 'AP Cybersecurity 1.3 Sample Login Pages (Day 3 Warmup)';
const SRC = path.join(ROOT, 'shopify', HANDLE + '.html');
const OUT = path.join(ROOT, 'imports', '2026-09-23d', 'cyber-1-3-sample-login-pages.csv');
const WRAP = '#apcs-c13-portals';
//  The fixed past date matrixify-preflight requires, so the page is never
//  scheduled into the future or sorted by a live server time.
const PUBLISHED_AT = '2026-03-01';
const HEADER = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'];

function check(body) {
  const p = [];
  if (/<\s*(form|input|textarea|select|script)\b/i.test(body)) p.push('an element that could collect input or run code');
  if (/[^\x00-\x7f]/.test(body)) p.push('non-ASCII');
  if (/&mdash;|\u2014/.test(body)) p.push('an em-dash');
  if (/\b\d\.\d\.[A-Z](\.\d+)?\b/.test(body)) p.push('a CED Essential Knowledge code');
  const urls = body.match(/https?:\/\/[a-z0-9.-]+/gi) || [];
  if (!urls.length) p.push('no mock web addresses at all, so the page is not what it claims');
  for (const u of urls) {
    const host = u.replace(/^https?:\/\//i, '');
    if (!/\.example$/i.test(host)) p.push('a mock address on a real domain: ' + host);
  }
  const css = (body.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
  for (const rule of css.split('}')) {
    const sel = rule.split('{')[0].trim();
    if (!sel || sel.startsWith('@')) continue;
    for (const s of sel.split(',')) {
      if (!s.trim().startsWith(WRAP)) p.push('CSS outside the wrapper: ' + s.trim().slice(0, 60));
    }
    if (/(^|[;{\s])color\s*:/.test(rule) && !/-webkit-text-fill-color/.test(rule)) {
      p.push('a colour with no -webkit-text-fill-color: ' + sel.slice(0, 60));
    }
  }
  if (!/all\s*:\s*initial\s*!important/.test(css)) p.push('the wrapper has no all:initial reset');
  return p;
}

const cell = (s) => '"' + String(s).replace(/"/g, '""') + '"';

function main() {
  const body = fs.readFileSync(SRC, 'utf8');
  const problems = check(body);
  const live = sf.status('/pages/' + HANDLE).code;
  if (String(live) !== '404') problems.push(HANDLE + ' already answers ' + live + ', so this sheet would overwrite a live page');
  if (problems.length) {
    console.error('\n  Refused, no file written:\n');
    problems.forEach((m) => console.error('    ' + m));
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const row = [HANDLE, 'MERGE', TITLE, body, 'TRUE', PUBLISHED_AT];
  fs.writeFileSync(OUT, '\ufeff' + [HEADER.map(cell).join(','), row.map(cell).join(',')].join('\r\n') + '\r\n');

  const back = parseCsv(fs.readFileSync(OUT, 'utf8').replace(/^\ufeff/, ''));
  if (back.length !== 2 || back[0].join(',') !== HEADER.join(',') || back[1].join('\u0000') !== row.join('\u0000')) {
    console.error('\n  Parse-back differs from the source. Sheet deleted.\n');
    fs.unlinkSync(OUT);
    process.exit(1);
  }
  const pf = preflight(OUT, { expectCommand: 'MERGE' });
  if (pf.problems.length) {
    console.error('\n  Preflight refused:\n');
    pf.problems.forEach((m) => console.error('    ' + m));
    process.exit(1);
  }
  console.log('\n  wrote ' + path.relative(ROOT, OUT) + ': 1 row, parse-back identical, preflight clear');
  console.log('  After importing: https://www.apcsexamprep.com/pages/' + HANDLE + '\n');
}

if (require.main === module) main();
module.exports = { check, HANDLE, TITLE };
