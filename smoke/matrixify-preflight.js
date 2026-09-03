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

console.log('\n2b. A BLANK CELL IS AN ERASE IN EVERY COLUMN, not just Body HTML');
{
  //  Found by building a real sheet. Ten page Titles needed rolling to 2026-2027
  //  and exactly ONE of the ten also needed its title_tag rolled, so the sheet
  //  carried a title_tag column with nine empty cells. Matrixify writes what you
  //  give it: that would have CLEARED the SEO title on nine live pages, one of
  //  which had already been migrated to 2026-27 by hand.
  const H = ['Handle', 'Command', 'Title', 'Metafield: global.title_tag [single_line_text_field]'];
  const mixed = preflight(write('mixed-pages.csv', H, [
    ['a', 'MERGE', 'New A', ''],
    ['b', 'MERGE', 'New B', 'only this one'],
  ]));
  ok('  a column blank on SOME rows is refused', has(mixed, /BLANK "Metafield/), mixed.problems);
  ok('  and the message says to split the sheet', has(mixed, /Split the sheet/), mixed.problems);
  ok('  it counts how many rows would be erased', has(mixed, /1 of 2 row/), mixed.problems);

  //  Split the way the rule asks, and both halves pass.
  const titles = preflight(write('split-a-pages.csv', ['Handle', 'Command', 'Title'],
    [['a', 'MERGE', 'New A'], ['b', 'MERGE', 'New B']]));
  const tags = preflight(write('split-b-pages.csv',
    ['Handle', 'Command', 'Metafield: global.title_tag [single_line_text_field]'],
    [['b', 'MERGE', 'only this one']]));
  ok('  the split title sheet passes', titles.problems.length === 0, titles.problems);
  ok('  the split metafield sheet passes', tags.problems.length === 0, tags.problems);

  //  IDENTIFIER columns address a row rather than set it, so a blank there is a
  //  different bug and must not be reported as an erase.
  const ident = preflight(write('ident-pages.csv', ['Handle', 'Command', 'Title'],
    [['a', 'MERGE', 'New A'], ['', 'MERGE', 'New B']]));
  ok('  a blank Handle is not reported as an erase',
    !ident.problems.some((x) => /BLANK "Handle"/.test(x)), ident.problems);

  //  Body HTML keeps its own louder message, because that is the one that makes
  //  somebody stop reading and check.
  const bodySheet = preflight(write('body-pages.csv', ['Handle', 'Command', 'Body HTML'],
    [['a', 'MERGE', '<p>x</p>'], ['b', 'MERGE', '']]));
  ok('  a blank Body HTML still says it would WIPE the page',
    has(bodySheet, /wipe those pages/), bodySheet.problems);
}

console.log('\n3. Encoding: the BOM is not optional');
{
  const r = preflight(write('nobom-blog-posts.csv', HDR, [GOOD], { noBom: true }));
  ok('  a file without a BOM is refused', has(r, /no BOM/), r.problems);
  ok('  and the message explains the Latin-1 guess', has(r, /Latin-1/), r.problems);

  //  -- THE BLIND SPOT THIS GATE AND ITS TEST USED TO SHARE -------------------
  //  Until 2026-09-04 there was exactly ONE fixture here and it was the LATIN-1
  //  bullet, matched against a list of latin-1 byte pairs in the preflight. Both
  //  halves were built the same wrong way, so they agreed with each other and
  //  this suite was green while the form that reaches a live page walked through.
  //  A Matrixify sheet comes out of Excel or a CSV pipeline, so what it actually
  //  carries is the CP1252 flavour.
  //
  //  The fixtures are CORRUPTED HERE from the real bytes of a real character,
  //  rather than pasted in as a remembered byte pair. That is the whole lesson:
  //  a fixture written from memory encodes the same misunderstanding as the rule
  //  it is supposed to be testing.
  const CP1252 = {
    0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
    0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160,
    0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019,
    0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
    0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153,
    0x9E: 0x017E, 0x9F: 0x0178,
  };
  const bytesOf = (cp) => Array.from(Buffer.from(String.fromCodePoint(cp), 'utf8'));
  const asLatin1 = (cp) => bytesOf(cp).map((b) => String.fromCodePoint(b)).join('');
  const asCp1252 = (cp) => bytesOf(cp)
    .map((b) => String.fromCodePoint(CP1252[b] === undefined ? b : CP1252[b])).join('');
  const twice = (t) => Array.from(t).map((c) => Array.from(Buffer.from(c, 'utf8'))
    .map((b) => String.fromCodePoint(CP1252[b] === undefined ? b : CP1252[b])).join('')).join('');
  const body = (t) => preflight(write('moji-blog-posts.csv', HDR,
    [['b', 'h', 'MERGE', '<p>' + t + '</p>']]));

  ok('  a latin-1 mojibaked body is still refused',
    has(body('bullet ' + asLatin1(0x2022)), /mojibake/));

  //  THE ONE THAT WAS GETTING THROUGH.
  const cp1252Bullet = body('bullet ' + asCp1252(0x2022));
  ok('  a cp1252 mojibaked body is refused, the form a spreadsheet produces',
    has(cp1252Bullet, /mojibake/), cp1252Bullet.problems);
  ok('  and the refusal names the character it means and the flavour',
    has(cp1252Bullet, /U\+2022/) && has(cp1252Bullet, /cp1252 flavour/),
    cp1252Bullet.problems);

  //  A 4-byte character corrupts into FOUR, which no width in the old list
  //  reached, in either flavour.
  ok('  a cp1252 mojibaked EMOJI body is refused',
    has(body('goal ' + asCp1252(0x1F3AF)), /mojibake/));
  ok('  a latin-1 mojibaked EMOJI body is refused',
    has(body('goal ' + asLatin1(0x1F3AF)), /mojibake/));

  //  And the doubly corrupted form, which is what the handoff drafts described.
  //  A rule written from it would have missed every case above.
  ok('  a doubly corrupted body is refused',
    has(body('bullet ' + twice(asCp1252(0x2022))), /mojibake/));

  //  It must NOT fire on a Nordic sort label. An isolated width-2 run whose lead
  //  sits outside U+00C2 to U+00C3 is real text: analyze() drops it, and if it
  //  did not, a legitimate import would be blocked over a sort order.
  const nordic = body('Alfabetisk, ' + String.fromCodePoint(0x00C5)
    + String.fromCodePoint(0x2013) + 'A');
  ok('  a Nordic sort label is NOT refused as mojibake',
    !has(nordic, /mojibake/), nordic.problems);

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
  //  A FIXED TIME ON THE FIXED DATE IS STILL FIXED. The rule is about a live
  //  server time, not about precision. This check first refused
  //  scripts/csp-lesson-exercise-links.js, which has written 2026-03-01 12:00:00
  //  since August and whose imports are live, so the check was narrower than
  //  the rule it enforces.
  const withTime = preflight(write('pubt-blog-posts.csv', H2,
    [['b', 'h', 'MERGE', '<p>x</p>', '2026-03-01 12:00:00']]));
  ok('  the fixed date WITH a fixed time is accepted', withTime.problems.length === 0, withTime.problems);
  const other = preflight(write('pubo-blog-posts.csv', H2,
    [['b', 'h', 'MERGE', '<p>x</p>', '2026-04-01 12:00:00']]));
  ok('  a fixed time on ANOTHER date is still refused', has(other, /Published At/), other.problems);
  const todayFixed = preflight(write('pubn-blog-posts.csv', H2,
    [['b', 'h', 'MERGE', '<p>x</p>', new Date().toISOString().slice(0, 10) + ' 12:00:00']]));
  ok('  and today\'s date with a fixed time is refused too', has(todayFixed, /Published At/), todayFixed.problems);
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
