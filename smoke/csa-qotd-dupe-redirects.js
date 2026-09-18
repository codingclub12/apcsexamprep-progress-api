'use strict';
/*
 *  BOARD 333: THE DUPLICATE-HANDLE REDIRECT SHEET, AND WHAT IT REFUSES.
 *
 *  84 QOTD questions are published at two handles each. 72 are the same
 *  question and get a redirect; 12 are two working variants of one prompt and
 *  must NOT, because redirecting one away destroys a distinct item.
 *
 *  THE ASSERTION THAT CARRIES THE ARGUMENT is the direction. The February bulk
 *  import is the half board 343 caught serving drifted code; the daily series is
 *  the half that was right. A sheet built the other way round would retire the
 *  maintained content and keep the stale handle, and it would look identical in
 *  a diff. So `keep` must be compact and `retire` must be hyphenated, per row,
 *  asserted rather than assumed.
 *
 *  AND THE SHEET IS PARSED BACK. Generation is not evidence that generation
 *  worked: the CSP sheet lost 90 bytes a page while every semantic check passed.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const G = require('../scripts/csa-qotd-dupe-redirects.js');
const B = require('../scripts/csa-qotd-dupe-pairs-build.js');

let failed = 0;
const bad = (m) => { console.log('  FAIL  ' + m); failed++; };
const eq = (got, want, what) => { if (got !== want) bad(what + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); };

const doc = G.load();
const clone = () => JSON.parse(JSON.stringify(doc));

// ── 1. the shape of the data ─────────────────────────────────────────────────
eq(doc.pairs.length, 84, 'eighty-four duplicate pairs');
eq(doc.pairs.filter((p) => p.verdict === 'redirect').length, 72, 'seventy-two are the same question');
eq(doc.pairs.filter((p) => p.verdict === 'review').length, 12, 'twelve need a human judgement');

//  Direction, per row. This is the one that would be invisible in a diff.
doc.pairs.forEach((p) => {
  if (!/^unit[0-9]-cycle[0-9]-day-/.test(p.keep)) bad(p.key + ': keep is not a compact daily-series handle');
  if (!/^unit-[0-9]-cycle-[0-9]-day-/.test(p.retire)) bad(p.key + ': retire is not a bulk-import handle');
  if (/^unit-1-cycle/.test(p.retire)) bad(p.key + ': unit 1 has no twin and must never be paired');
});

//  No handle may appear twice anywhere in the file.
{
  const seen = new Set();
  doc.pairs.forEach((p) => [p.keep, p.retire].forEach((h) => {
    if (seen.has(h)) bad(h + ' appears in more than one pair');
    seen.add(h);
  }));
  eq(seen.size, 168, 'one hundred and sixty-eight distinct handles');
}

// ── 2. the sheet, and reading it back ────────────────────────────────────────
{
  const rows = G.rowsFor(doc);
  eq(rows.length, 72, 'seventy-two redirect rows');

  const text = G.toCsv(rows);
  if (!text.startsWith('\ufeff')) bad('the sheet has no BOM, which Matrixify needs');
  if (!/\r\n$/.test(text)) bad('the sheet does not end with CRLF');
  if (/[^\x00-\x7F\ufeff]/.test(text)) bad('the sheet is not pure ASCII');

  //  PARSE BACK and diff against the rows it was built from.
  const lines = text.replace(/^\ufeff/, '').split('\r\n').filter((l) => l.length);
  eq(lines.length, 73, 'a header and seventy-two rows survive a parse back');
  eq(lines[0], '"Command","Path","Target"', 'the header is the three Matrixify redirect columns');
  const back = lines.slice(1).map((l) => {
    const m = l.match(/^"([^"]*)","([^"]*)","([^"]*)"$/);
    if (!m) { bad('a row does not parse back: ' + l); return null; }
    return { Command: m[1], Path: m[2], Target: m[3] };
  });
  rows.forEach((r, i) => {
    if (!back[i]) return;
    if (back[i].Command !== r.Command || back[i].Path !== r.Path || back[i].Target !== r.Target) {
      bad('row ' + i + ' changed through the CSV: ' + JSON.stringify(r) + ' -> ' + JSON.stringify(back[i]));
    }
  });

  //  Every row must be MERGE, and every URL a daily-practice article path.
  back.filter(Boolean).forEach((r) => {
    if (r.Command !== 'MERGE') bad('row is not MERGE: ' + JSON.stringify(r));
    [r.Path, r.Target].forEach((u) => {
      if (!/^\/blogs\/ap-csa-daily-practice\/[a-z0-9-]+$/.test(u)) bad('not a daily-practice article path: ' + u);
    });
  });

  //  The committed sheet must BE this sheet.
  const onDisk = path.join(__dirname, '..', 'imports', '2026-09-18-csa-qotd-333', G.SHEET);
  if (!fs.existsSync(onDisk)) bad('no sheet committed at imports/2026-09-18-csa-qotd-333/' + G.SHEET);
  else if (fs.readFileSync(onDisk, 'utf8') !== text) bad('the committed sheet is not what the generator produces');
}

// ── 3. the review pairs stay OUT ─────────────────────────────────────────────
{
  const rows = G.rowsFor(doc);
  const inSheet = new Set(rows.map((r) => r.Path));
  doc.pairs.filter((p) => p.verdict === 'review').forEach((p) => {
    if (inSheet.has(G.url(p.retire))) bad(p.key + ': a review pair reached the sheet');
  });
  eq(inSheet.size, 72, 'only the redirect pairs are in the sheet');
}

// ── 4. the guards, broken on purpose ─────────────────────────────────────────
function refuses(label, mutate) {
  const d = clone();
  mutate(d);
  try { G.rowsFor(d); } catch (e) { return; }
  bad('guard did not refuse: ' + label);
}
refuses('a redirect pointing at itself', (d) => { d.pairs[0].retire = d.pairs[0].keep; });
refuses('the same handle retired twice', (d) => { d.pairs[1].retire = d.pairs[0].retire; });
refuses('two handles retired onto one target', (d) => { d.pairs[1].keep = d.pairs[0].keep; });
refuses('a chain, where a target is itself retired elsewhere', (d) => { d.pairs[1].keep = d.pairs[0].retire; });
refuses('the direction reversed, keeping the February bulk import', (d) => {
  const p = d.pairs.find((x) => x.verdict === 'redirect');
  const t = p.keep; p.keep = p.retire; p.retire = t;
});
refuses('a review pair promoted into the sheet with a bad direction', (d) => {
  const p = d.pairs.find((x) => x.verdict === 'review');
  p.verdict = 'redirect'; p.keep = 'unit-2-cycle-2-day-1-not-a-compact-handle';
});
refuses('every pair demoted, so the sheet would be empty', (d) => { d.pairs.forEach((p) => { p.verdict = 'review'; }); });

// ── 5. the classifier itself ─────────────────────────────────────────────────
{
  //  pairKey must collapse the two shapes onto one key and nothing else onto it.
  eq(B.pairKey('unit4-cycle2-day-28-arraylist-equality'), 'u4c2-day-28-arraylist-equality', 'compact key');
  eq(B.pairKey('unit-4-cycle-2-day-28-arraylist-equality'), 'u4c2-day-28-arraylist-equality', 'hyphenated key');
  if (B.pairKey('unit4-cycle2-day-28-arraylist-equality') === B.pairKey('unit4-cycle2-day-27-2d-array-edge-elements')) {
    bad('pairKey merges two different days');
  }
  if (B.pairKey('unit4-cycle1-day-28-x') === B.pairKey('unit4-cycle2-day-28-x')) bad('pairKey merges two cycles');
  if (B.pairKey('unit3-cycle2-day-28-x') === B.pairKey('unit4-cycle2-day-28-x')) bad('pairKey merges two units');
  //  It must leave the slug alone, or two different questions could collide.
  eq(B.pairKey('unit-2-cycle-2-day-4-selection-nested-if-else'), 'u2c2-day-4-selection-nested-if-else', 'slug untouched');

  //  classify: code is what separates a duplicate from a variant.
  const item = (stem, code, opts) => ({ stem, code: [code], options: opts.map((t, i) => ({ letter: 'ABCD'[i], text: t })) });
  const A = item('What prints?', 'int x = 1;', ['1', '2', '3', '4']);
  const same = item('What prints?', 'int x = 1;', ['1', '2', '3', '4']);
  const reordered = item('What prints?', 'int x = 1;', ['2', '1', '4', '3']);
  const otherCode = item('What prints?', 'int x = 9;', ['1', '2', '3', '4']);
  const otherStem = item('What is printed?', 'int x = 1;', ['1', '2', '3', '4']);
  const otherOpts = item('What prints?', 'int x = 1;', ['5', '6', '7', '8']);
  eq(B.classify(A, same, 'x', 'x').verdict, 'redirect', 'byte-identical bodies are a duplicate');
  eq(B.classify(A, same, 'x', 'y').verdict, 'redirect', 'same question with cosmetic differences is a duplicate');
  eq(B.classify(A, reordered, 'x', 'y').verdict, 'redirect', 'reordered options are still the same question');
  eq(B.classify(A, otherCode, 'x', 'y').verdict, 'review', 'DIFFERENT CODE is a variant, never a duplicate');
  eq(B.classify(A, otherStem, 'x', 'y').verdict, 'review', 'a different stem is not one question at two handles');
  eq(B.classify(A, otherOpts, 'x', 'y').verdict, 'review', 'a different option set is not a duplicate');
}

// ── 6. the live stage check, which has to be able to say "live" ──────────────
//  scripts/verify-csa-qotd-dupes-live.js is what stops the sheet being imported
//  too early. Shopify honours a redirect only FROM a URL that does not resolve,
//  so importing while the pages still serve is a silent no-op: 72 rows logged,
//  72 URLs unchanged, nothing in Admin saying so. A checker that could not tell
//  200 from 404 would call that success.
//
//  Driven with a FAKE fetch so it stays offline and so each stage can be forced.
{
  const V = require('../scripts/verify-csa-qotd-dupes-live.js');
  const row = { Path: '/blogs/ap-csa-daily-practice/unit-2-cycle-2-day-4-selection-nested-if-else',
    Target: '/blogs/ap-csa-daily-practice/unit2-cycle2-day-4-selection-nested-if-else' };
  //  looksReal() wants BOTH positive markers of a rendered Shopify page. Using a
  //  body that merely contains the article wrapper made this fixture read as a
  //  challenge, which is the guard doing its job on the test rather than a bug.
  const real = '<script>Shopify.theme = {};</script><link href="/cdn/shopifycloud/x.css">'
    + '<div class="apcs-practice-wrapper">x</div>';
  const st = (r) => V.stageOf(row, () => r).stage;

  eq(st({ code: '200', body: real }), 'live', 'a served page is stage live');
  eq(st({ code: '404', body: '' }), 'unpublished', 'a 404 is ready for the sheet');
  eq(st({ code: '301', redirectUrl: row.Target }), 'redirected', 'a 301 to the target is done');
  eq(st({ code: '301', redirectUrl: 'https://www.apcsexamprep.com' + row.Target }), 'redirected',
    'an absolute destination on the store host is the same place');
  eq(st({ code: '302', redirectUrl: row.Target }), 'redirected', 'a 302 counts too');

  //  THE ONES THAT CARRY THE POINT: a wrong destination and a challenge page
  //  must NOT read as progress.
  eq(st({ code: '301', redirectUrl: '/pages/daily-practice' }), 'wrong', 'a redirect to the wrong place is wrong');
  eq(st({ code: '301', redirectUrl: '' }), 'wrong', 'a 301 with no destination is wrong');
  eq(st({ code: '200', body: 'Verifying your connection' }), 'wrong',
    'a bot challenge served with 200 must not read as live');
  eq(st({ code: '500', body: '' }), 'wrong', 'a server error is wrong');
  eq(st({ code: '', body: '' }), 'wrong', 'no status is wrong');
  eq(V.stageOf(row, () => { throw new Error('boom'); }).stage, 'wrong', 'a throwing fetch is a result, not a crash');

  //  A trailing slash or a query string is the same URL, and treating it as a
  //  mismatch would report a correct redirect as broken.
  if (!V.samePath('/a/b', 'https://www.apcsexamprep.com/a/b/')) bad('samePath is confused by host and trailing slash');
  if (V.samePath('/a/b', '/a/c')) bad('samePath calls two different paths the same');
}

// ── 7. the step 1 unpublish sheet ────────────────────────────────────────────
//  The redirects were imported on 2026-09-18 and did nothing, because all 72
//  URLs still resolved. That is the predicted failure and the fix is step 1,
//  which this sheet makes one import instead of 72 admin visits.
//
//  THE REFUSAL THAT MATTERS is unpublishing a keep handle. That would take down
//  the article each redirect points AT, turning 72 tidy redirects into 72 dead
//  ends, and it would look like a successful import either way.
{
  const un = G.unpublishRows(doc);
  eq(un.length, 72, 'seventy-two unpublish rows');
  const keep = new Set(doc.pairs.map((p) => p.keep));
  un.forEach((r) => {
    if (keep.has(r.Handle)) bad(r.Handle + ': a keep handle is in the unpublish sheet');
    if (r.Published !== 'FALSE') bad(r.Handle + ': Published is not FALSE');
    if (r.Command !== 'MERGE') bad(r.Handle + ': not MERGE');
    if (r['Blog: Handle'] !== 'ap-csa-daily-practice') bad(r.Handle + ': wrong blog');
    if (!/^unit-[0-9]-cycle-[0-9]-day-/.test(r.Handle)) bad(r.Handle + ': not a bulk-import handle');
    if (/^unit-1-cycle/.test(r.Handle)) bad(r.Handle + ': unit 1 must never be unpublished');
  });

  //  Every Path in the redirect sheet must be unpublished, and nothing else.
  const paths = new Set(G.rowsFor(doc).map((r) => r.Path.replace('/blogs/ap-csa-daily-practice/', '')));
  const handles = new Set(un.map((r) => r.Handle));
  eq(handles.size, paths.size, 'the two sheets cover the same number of handles');
  [...paths].forEach((h) => { if (!handles.has(h)) bad(h + ' is redirected but never unpublished, so the redirect cannot fire'); });
  [...handles].forEach((h) => { if (!paths.has(h)) bad(h + ' is unpublished but has no redirect, so it would 404'); });

  const text = G.toCsvWith(G.UNPUB_COLS, un);
  const lines = text.replace(/^\ufeff/, '').split('\r\n').filter((l) => l.length);
  eq(lines.length, 73, 'a header and seventy-two rows');
  eq(lines[0], '"Blog: Handle","Handle","Command","Published"', 'the four Matrixify columns');
  if (/[^\x00-\x7F\ufeff]/.test(text)) bad('the unpublish sheet is not pure ASCII');

  const onDisk = path.join(__dirname, '..', 'imports', '2026-09-18-csa-qotd-333', G.UNPUB_SHEET);
  if (!fs.existsSync(onDisk)) bad('no unpublish sheet committed');
  else if (fs.readFileSync(onDisk, 'utf8') !== text) bad('the committed unpublish sheet is not what the generator produces');

  const refusesUn = (label, mutate) => {
    const d = clone(); mutate(d);
    try { G.unpublishRows(d); } catch (e) { return; }
    bad('unpublish guard did not refuse: ' + label);
  };
  //  Isolated, and it took two goes. Pointing `retire` at a keep handle trips the
  //  SHAPE check (every keep handle is compact). Putting the same handle on both
  //  sides trips the DUPLICATE check. Either way the suite goes red for a rule
  //  other than the one being tested, which reads as covered while the keep
  //  check is dead. The only mutation that reaches it: put an otherwise valid
  //  hyphenated handle into the keep SET, changing nothing else.
  refusesUn('a handle that is somewhere on the keep side', (d) => {
    d.pairs[1].keep = d.pairs[0].retire;
  });
  refusesUn('a unit 1 handle', (d) => { d.pairs[0].retire = 'unit-1-cycle-2-day-3-x'; });
  refusesUn('a compact handle on the retire side', (d) => { d.pairs[0].retire = 'unit2-cycle2-day-3-x'; });
  refusesUn('the same handle twice', (d) => { d.pairs[1].retire = d.pairs[0].retire; });
}

console.log(failed === 0
  ? '\ncsa-qotd-dupe-redirects: 84 pairs, 72 redirects and 12 held back for a human, direction asserted '
    + 'per row, the sheet parsed back and diffed against its source, 7 guard mutations and 6 classifier '
    + 'cases, 13 assertions that the live stage check can tell the four stages apart, and the step 1 '
    + 'unpublish sheet covering exactly the redirected handles with 4 more mutations. All pass.'
  : '\ncsa-qotd-dupe-redirects: ' + failed + ' failure(s).');
process.exit(failed ? 1 : 0);
