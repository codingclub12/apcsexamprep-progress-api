'use strict';
// ---------------------------------------------------------------------------
//  SMOKE: the preflight refuses the files that have damaged this store.
//
//  Weighted towards REFUSAL. A false alarm costs a minute; a false pass ships a
//  CSV that empties 40 live pages, and the store's handoff doc exists because
//  that has happened.
//
//  Every rule here maps to a row in that doc's failure-mode table, and the
//  fixtures are built to be otherwise VALID, so each test can only fail for the
//  reason it names.
//
//  Run: npm run smoke:preflight
//  No em-dashes, per repo convention.
// ---------------------------------------------------------------------------
const fs = require('fs');
const os = require('os');
const path = require('path');
const { preflight, scriptsCompile, XLSX_CELL_LIMIT, CSV_LARGE_CELL }
  = require('../scripts/matrixify-preflight');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-'));
const BOM = '\uFEFF';
const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';

//  A valid Blog Posts sheet. Every fixture below is this, with one thing wrong.
function write(name, header, rows, opts) {
  opts = opts || {};
  const lines = [header.map(q).join(',')].concat(rows.map((r) => r.map(q).join(',')));
  const text = (opts.noBom ? '' : BOM) + lines.join(opts.lf ? '\n' : '\r\n') + (opts.lf ? '\n' : '\r\n');
  const p = path.join(tmp, name);
  fs.writeFileSync(p, text);
  return p;
}
const HDR = ['Blog: Handle', 'Handle', 'Command', 'Body HTML'];
const GOOD = ['ap-csa-daily-practice', 'day-11', 'MERGE', '<div><p>Hello, world</p></div>'];
const has = (r, re) => r.problems.some((p) => re.test(p));

console.log('\n1. A correct sheet passes, so a failure below means something');
{
  const r = preflight(write('good-blog-posts.csv', HDR, [GOOD]));
  ok('  no problems', r.problems.length === 0, r.problems);
  ok('  and it counted the row', r.rows === 1, r.rows);
}

console.log('\n2. THE ONE THAT WIPES PAGES: a blank Body HTML');
{
  //  "An empty Body HTML cell does not mean leave it alone. It means set the
  //  body to empty." One SEO-only sheet with a stray column emptied 40 pages.
  const r = preflight(write('blank-blog-posts.csv', HDR,
    [GOOD, ['ap-csa-daily-practice', 'day-12', 'MERGE', '']]));
  ok('  a blank Body HTML row is refused', has(r, /BLANK Body HTML/), r.problems);
  ok('  and the message says it would wipe the page', has(r, /wipe/), r.problems);
  const ws = preflight(write('ws-blog-posts.csv', HDR,
    [['ap-csa-daily-practice', 'day-12', 'MERGE', '   \n  ']]));
  ok('  whitespace-only counts as blank, because Shopify will too',
    has(ws, /BLANK Body HTML/), ws.problems);
}

console.log('\n3. Encoding: the BOM is not optional');
{
  const r = preflight(write('nobom-blog-posts.csv', HDR, [GOOD], { noBom: true }));
  ok('  a file without a BOM is refused', has(r, /no BOM/), r.problems);
  ok('  and the message explains the Latin-1 guess', has(r, /Latin-1/), r.problems);

  //  Mojibake built from code points so this file stays pure ASCII.
  const moji = String.fromCharCode(0xE2) + String.fromCharCode(0x80) + String.fromCharCode(0xA2);
  const m = preflight(write('moji-blog-posts.csv', HDR,
    [['b', 'h', 'MERGE', '<p>bullet ' + moji + '</p>']]));
  ok('  an already-mojibaked body is refused', has(m, /mojibake/), m.problems);

  const e = preflight(write('emoji-blog-posts.csv', HDR,
    [['b', 'h', 'MERGE', '<p>' + String.fromCodePoint(0x1F3AF) + '</p>']]));
  ok('  a raw emoji is refused', has(e, /raw emoji/), e.problems);

  //  But the characters that are ALREADY on this store are carried, not refused.
  //  Refusing them would mean rewriting 49 live bodies to add a banner.
  const n = preflight(write('nonascii-blog-posts.csv', HDR,
    [['b', 'h', 'MERGE', '<p>a' + String.fromCharCode(0x2022) + 'b'
      + String.fromCharCode(0x2192) + 'c' + String.fromCharCode(0x00A0) + '</p>']]));
  ok('  bullets, arrows and nbsp are carried through, not refused', n.problems.length === 0, n.problems);
  ok('  and they are COUNTED so nobody thinks the tool added them',
    n.notes.some((x) => /non-ASCII characters carried through/.test(x)), n.notes);
}

console.log('\n4. The envelope, which is what Matrixify actually reads first');
{
  const r = preflight(write('untitled.csv', HDR, [GOOD]));
  ok('  a file name naming no sheet is refused', has(r, /names no sheet/), r.problems);
  ok('  and says the file name carries the sheet type', has(r, /FILE NAME/), r.problems);
  for (const good of ['x-blog-posts.csv', 'pages.csv', 'my-products.csv', 'Article.csv']) {
    ok(`  ${JSON.stringify(good)} is accepted`,
      !has(preflight(write(good, HDR, [GOOD])), /names no sheet/));
  }
}

console.log('\n5. Published At and Command');
{
  const H2 = ['Blog: Handle', 'Handle', 'Command', 'Body HTML', 'Published At'];
  const now = preflight(write('pub-blog-posts.csv', H2,
    [['b', 'h', 'MERGE', '<p>x</p>', new Date().toISOString()]]));
  ok('  a live server time in Published At is refused', has(now, /Published At/), now.problems);
  const fixed = preflight(write('pubok-blog-posts.csv', H2,
    [['b', 'h', 'MERGE', '<p>x</p>', '2026-03-01']]));
  ok('  the store\'s fixed date is accepted', fixed.problems.length === 0, fixed.problems);
  const absent = preflight(write('pubabs-blog-posts.csv', HDR, [GOOD]));
  ok('  omitting it entirely is accepted', absent.problems.length === 0, absent.problems);

  const upd = preflight(write('cmd-blog-posts.csv', HDR,
    [['b', 'h', 'UPDATE', '<p>x</p>']]));
  ok('  a row that is not MERGE is refused', has(upd, /not MERGE/), upd.problems);
  ok('  and the expected command is configurable',
    preflight(write('cmd2-blog-posts.csv', HDR, [['b', 'h', 'UPDATE', '<p>x</p>']]),
      { expectCommand: 'UPDATE' }).problems.length === 0);
  const noCmd = preflight(write('nocmd-blog-posts.csv',
    ['Blog: Handle', 'Handle', 'Body HTML'], [['b', 'h', '<p>x</p>']]));
  ok('  a missing Command column is refused', has(noCmd, /no Command column/), noCmd.problems);
}

console.log('\n6. Scripts, because on the widget pages the script IS the page');
{
  ok('  a broken script block is caught',
    scriptsCompile('<script>function (){</script>').bad.length === 1);
  ok('  a good one is not', scriptsCompile('<script>var a = 1;</script>').bad.length === 0);
  ok('  and it is counted', scriptsCompile('<script>var a=1;</script><script>var b=2;</script>').checked === 2);
  ok('  broken JSON-LD is caught, not compiled as JS',
    scriptsCompile('<script type="application/ld+json">{bad}</script>').bad.length === 1);
  ok('  valid JSON-LD passes',
    scriptsCompile('<script type="application/ld+json">{"a":1}</script>').bad.length === 0);
  ok('  an empty script block is not a failure', scriptsCompile('<script></script>').bad.length === 0);
  const r = preflight(write('script-blog-posts.csv', HDR,
    [['b', 'h', 'MERGE', '<p>x</p><script>function (){</script>']]));
  ok('  and a sheet carrying one is refused', has(r, /script block/), r.problems);
}

console.log('\n7. The cell limit belongs to the FORMAT, not to Matrixify');
{
  //  32,767 is EXCEL's per-cell limit. Applying it to a CSV was wrong and would
  //  have rejected every real Pages sheet on this store: the handoff says page
  //  bodies here run 60K to 270K, and also that cells cap at 32,767. Both are
  //  true, of different formats. The live Cyber Command Center body is 68,654
  //  characters and imports fine as CSV.
  const big = '<p>' + 'x'.repeat(XLSX_CELL_LIMIT) + '</p>';
  const csv = preflight(write('big-blog-posts.csv', HDR, [['b', 'h', 'MERGE', big]]));
  ok('  a 32K body is ACCEPTED in a csv, which is the normal case here',
    !has(csv, /cell limit/), csv.problems);
  ok('  and it is flagged as something that would not survive xlsx',
    csv.notes.some((n) => /would not survive xlsx/.test(n)), csv.notes);

  const xlsx = preflight(write('big-blog-posts.xlsx', HDR, [['b', 'h', 'MERGE', big]]));
  ok('  the same body IS refused when the file is an xlsx',
    has(xlsx, /cell limit for xlsx/), xlsx.problems);

  const huge = preflight(write('huge-blog-posts.csv', HDR,
    [['b', 'h', 'MERGE', 'x'.repeat(CSV_LARGE_CELL + 1)]]));
  ok('  a csv body past the store\'s own 250K check-by-hand threshold is refused',
    has(huge, /cell limit for csv/), huge.problems);
}

console.log('\n8. EMOJI: carried is not the same as introduced');
{
  //  The handoff says emoji are not used in this store's page content. The live
  //  Cyber Command Center body carries 27 of them in its resource rows. Refusing
  //  them outright means a round-trip of that page can never be written;
  //  stripping them changes live content far beyond the edit being made.
  const E = String.fromCodePoint(0x1F3AF);
  const live = { h: '<p>' + E + ' already here</p>' };

  const noOrigin = preflight(write('e1-blog-posts.csv', HDR,
    [['b', 'h', 'MERGE', '<p>' + E + ' already here</p>']]));
  ok('  with no original supplied, an emoji is refused', has(noOrigin, /raw emoji/), noOrigin.problems);
  ok('  and the message says how to prove it was carried',
    has(noOrigin, /--carrying/), noOrigin.problems);

  const carried = preflight(write('e2-blog-posts.csv', HDR,
    [['b', 'h', 'MERGE', '<p>' + E + ' already here</p>']]), { carrying: live });
  ok('  the same row passes when the live page already had it',
    carried.problems.length === 0, carried.problems);
  ok('  and the carried emoji are counted, not silently ignored',
    carried.notes.some((n) => /emoji carried through/.test(n)), carried.notes);

  //  A NEW GLYPH is the hazard, and is refused.
  const NEW = String.fromCodePoint(0x1F680);
  const newGlyph = preflight(write('e3-blog-posts.csv', HDR,
    [['b', 'h', 'MERGE', '<p>' + E + NEW + '</p>']]), { carrying: live });
  ok('  a row that introduces a glyph the page never had is refused',
    has(newGlyph, /introduces 1 emoji/), newGlyph.problems);
  ok('  and the refusal names the code point',
    has(newGlyph, /U\+1F680/), newGlyph.problems);

  //  MORE OF A GLYPH THE PAGE ALREADY USES is not, because forbidding it would
  //  forbid adding a row to a list where every row carries an icon.
  const moreOfSame = preflight(write('e3b-blog-posts.csv', HDR,
    [['b', 'h', 'MERGE', '<p>' + E + E + ' now two</p>']]), { carrying: live });
  ok('  a second instance of an icon the page already uses is allowed',
    moreOfSame.problems.length === 0, moreOfSame.problems);
  ok('  and the extra instance is reported, never silent',
    moreOfSame.notes.some((n) => /more instance\(s\) of emoji the page already uses/.test(n)),
    moreOfSame.notes);

  const other = preflight(write('e4-blog-posts.csv', HDR,
    [['b', 'other-handle', 'MERGE', '<p>' + E + '</p>']]), { carrying: live });
  ok('  a handle with no original of its own is refused, not assumed clean',
    has(other, /raw emoji/), other.problems);
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
