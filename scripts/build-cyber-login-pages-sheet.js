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
//  UPDATE MODE (--update), for a change after the page exists. It refuses
//  unless the live page shows the same text as the last committed source,
//  so an edit made in the admin since then is never overwritten, and it
//  sends Body HTML only, so the title and publish date are left alone.
//  Shopify rewrites a stored body (decodes entities, lowercases SVG
//  attributes, closes empty tags), so the comparison is on visible text,
//  which is what an admin edit would change.
//
//  Run: node scripts/build-cyber-login-pages-sheet.js [--update]
//  No em-dashes, per repo convention.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');
const { parseCsv } = require('./build-leaderboard-xss-sheets');
const { preflight } = require('./matrixify-preflight');
const { patchBody } = require('./build-cyber-points-fix-sheet');

const ROOT = path.join(__dirname, '..');
const HANDLE = 'ap-cyber-unit-1-lesson-3-sample-login-pages';
const TITLE = 'AP Cybersecurity 1.3 Sample Login Pages (Day 3 Warmup)';
const SRC = path.join(ROOT, 'shopify', HANDLE + '.html');
const OUT_NEW = path.join(ROOT, 'imports', '2026-09-23d', 'cyber-1-3-sample-login-pages.csv');
const OUT_UPDATE = path.join(ROOT, 'imports', '2026-09-23e', 'cyber-1-3-sample-login-pages-layout.csv');
const WRAP = '#apcs-c13-portals';
//  The fixed past date matrixify-preflight requires, so the page is never
//  scheduled into the future or sorted by a live server time.
const PUBLISHED_AT = '2026-03-01';
const HEADER = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'];

//  THE COMMAND CENTER LINK, shipped in the same --update sheet. The hub draws
//  a lesson's student-page buttons in studentSection() from a fixed list of
//  keys, and only for a lesson whose STU entry has a URL under that key. So a
//  new key in that list plus a URL on 1.3 adds one button to 1.3 and nothing
//  anywhere else. (The page also has a SITE list and siteButton(); both are
//  dead code, never called, and a first draft of this patch went there and
//  rendered nothing. Checked by running the page, not by reading it.)
//  Exact before and after pairs on the live body, through the same patchBody
//  the 1.4 grader fix uses: each before appears once, nothing else moves, no
//  non-ASCII is added, and every script still compiles.
const CC_HANDLE = 'cyber-command-center';
const CC_PAIRS = [
  [
    '"1.3":{page:"/pages/ap-cybersecurity-unit-1-wireless-security",quiz:"/pages/ap-cyber-unit-1-lesson-3-quiz",'
      + 'ex1:"/pages/ap-cyber-unit-1-lesson-3-exercise-1",ex2:"/pages/ap-cyber-unit-1-lesson-3-exercise-2"}',
    '"1.3":{page:"/pages/ap-cybersecurity-unit-1-wireless-security",quiz:"/pages/ap-cyber-unit-1-lesson-3-quiz",'
      + 'ex1:"/pages/ap-cyber-unit-1-lesson-3-exercise-1",ex2:"/pages/ap-cyber-unit-1-lesson-3-exercise-2",'
      + 'warmup:"/pages/ap-cyber-unit-1-lesson-3-sample-login-pages"}',
  ],
  [
    "['termlab','Terminal Lab'] ];",
    "['termlab','Terminal Lab'], ['warmup','Login Warmup'] ];",
  ],
];

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

//  Visible text only: tags, comments, styles and whitespace dropped, the one
//  entity this page uses decoded. Enough to tell whether a person changed
//  what the page says, and blind to Shopify's own re-serialisation.
function visibleText(html) {
  return html.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ').replace(/&middot;/g, '\u00b7').replace(/\s+/g, ' ').trim();
}

function main(argv) {
  const update = argv.includes('--update');
  const OUT = update ? OUT_UPDATE : OUT_NEW;
  const body = fs.readFileSync(SRC, 'utf8');
  const problems = check(body);
  let header = HEADER, row = [HANDLE, 'MERGE', TITLE, body, 'TRUE', PUBLISHED_AT];
  let ccRow = null, ccBefore = null;
  if (update) {
    const r = sf.raw('/pages/' + HANDLE + '.json');
    if (String(r.code) !== '200') {
      problems.push(HANDLE + ' answers ' + r.code + ', so there is no live page to update');
    } else {
      const live = JSON.parse(r.body).page.body_html;
      const prior = require('child_process').execFileSync('git',
        ['show', 'HEAD:shopify/' + HANDLE + '.html'], { cwd: ROOT, encoding: 'utf8' });
      if (visibleText(live) !== visibleText(prior)) {
        problems.push('the live page text differs from the last committed source, so someone edited it since; '
          + 'read the live page before replacing it');
      }
      if (visibleText(body) !== visibleText(prior)) {
        problems.push('this update changes visible text, not only layout; review that on purpose');
      }
    }
    header = ['Handle', 'Command', 'Body HTML'];
    row = [HANDLE, 'MERGE', body];
    const cc = sf.raw('/pages/' + CC_HANDLE + '.json');
    if (String(cc.code) !== '200') problems.push(CC_HANDLE + ' answers ' + cc.code);
    else {
      ccBefore = JSON.parse(cc.body).page.body_html;
      const out = patchBody(CC_HANDLE, ccBefore, CC_PAIRS);
      if (out.row) ccRow = [CC_HANDLE, 'MERGE', out.row.after];
      else out.problems.forEach((m) => problems.push(m));
    }
  } else {
    const live = sf.status('/pages/' + HANDLE).code;
    if (String(live) !== '404') problems.push(HANDLE + ' already answers ' + live + ', so this sheet would overwrite a live page (use --update)');
  }
  if (problems.length) {
    console.error('\n  Refused, no file written:\n');
    problems.forEach((m) => console.error('    ' + m));
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const rows = ccRow ? [row, ccRow] : [row];
  fs.writeFileSync(OUT, '\ufeff' + [header].concat(rows).map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n');

  const back = parseCsv(fs.readFileSync(OUT, 'utf8').replace(/^\ufeff/, ''));
  if (back.length !== rows.length + 1 || back[0].join(',') !== header.join(',')
      || rows.some((r, k) => back[k + 1].join('\u0000') !== r.join('\u0000'))) {
    console.error('\n  Parse-back differs from the source. Sheet deleted.\n');
    fs.unlinkSync(OUT);
    process.exit(1);
  }
  const pf = preflight(OUT, { expectCommand: 'MERGE', carrying: ccBefore ? { [CC_HANDLE]: ccBefore } : {} });
  if (pf.problems.length) {
    console.error('\n  Preflight refused:\n');
    pf.problems.forEach((m) => console.error('    ' + m));
    process.exit(1);
  }
  console.log('\n  wrote ' + path.relative(ROOT, OUT) + ': ' + rows.length + ' row(s), parse-back identical, preflight clear');
  console.log('  After importing: https://www.apcsexamprep.com/pages/' + HANDLE + '\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { check, visibleText, HANDLE, TITLE, CC_HANDLE, CC_PAIRS };
