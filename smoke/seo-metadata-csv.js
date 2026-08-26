'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE SEO SHEET GUARDS, PINNED OFFLINE.
//
//  These sheets write to a live store. Every assertion here is about what the
//  generator REFUSES to do, because the failure mode is silent: a bad sheet
//  imports cleanly and the damage is spread across records nobody reopens.
//
//  Two of these tests exist because the bug they describe was actually written
//  and caught before it shipped. They are marked.
// ─────────────────────────────────────────────────────────────────────────────

const G = require('../scripts/seo-metadata-csv');
const { PAGES, PRODUCTS, COLLECTIONS } = require('../seed/seo-rewrites');

let pass = 0, fail = 0;
function ok(label, cond) {
  if (cond) { pass++; console.log(`  [PASS] ${label}`); }
  else { fail++; console.log(`  [FAIL] ${label}`); }
}

const D = (n) => 'x'.repeat(n);
const row = (o = {}) => ({ handle: 'a-page', title: 'A Good Title', description: D(150), ...o });

console.log('\n  What the sheet may never contain\n');

ok('a content column is refused outright', (() => {
  try { G.assertHeaderIsSafe(['Handle', 'Body HTML']); return false; }
  catch (e) { return /Body HTML/.test(e.message); }
})());
ok('the visible Title column is refused too, not just Body HTML', (() => {
  try { G.assertHeaderIsSafe(['Handle', 'Title']); return false; }
  catch (e) { return true; }
})());
ok('a metadata-only header is allowed', (() => {
  try { G.assertHeaderIsSafe(['Handle', 'Command', 'SEO Title', 'SEO Description']); return true; }
  catch (e) { return false; }
})());
ok('every forbidden column is a content column',
  G.FORBIDDEN_COLUMNS.every((c) => !/^SEO |^Handle$|^Command$/.test(c)));

console.log('\n  An empty cell is a delete, not a skip\n');
//  ── THIS TEST EXISTS BECAUSE THE BUG WAS WRITTEN ───────────────────────────
//  The first generator emitted a fixed four-column header. The Products sheet,
//  where no row changes a description, therefore carried 13 empty
//  `SEO Description` cells. That import would have blanked the description on
//  every teacher bundle on the site.
ok('a column is omitted when no row supplies it',
  !G.columnsFor([{ handle: 'a', title: 'T' }], 'Products').cols.includes('SEO Description'));
ok('a column is included when every row supplies it',
  G.columnsFor([{ handle: 'a', title: 'T', description: D(150) }], 'Pages').cols.includes('SEO Description'));
ok('a sheet whose rows disagree about a column is REFUSED, not blank-filled',
  G.columnsFor([{ handle: 'a', title: 'T', description: D(150) }, { handle: 'b', title: 'T2' }], 'Pages')
    .problems.length === 1);
ok('the refusal explains that a partial column blanks the rest',
  /blanks the field/.test(
    G.columnsFor([{ handle: 'a', description: D(150) }, { handle: 'b', title: 'T' }], 'Pages').problems.join(' ')));
ok('no generated sheet ever emits an empty cell', (() => {
  for (const [rows, kind] of [[PAGES, 'Pages'], [PRODUCTS, 'Products'], [COLLECTIONS, 'Collections']]) {
    const { csv } = G.buildSheet(rows, kind);
    if (!csv) return false;
    for (const line of csv.replace(/^﻿/, '').trim().split('\r\n')) {
      // Split on commas outside quotes; a bare ',,' or a trailing ',' is an empty cell.
      if (/,\s*,/.test(line) || /,\s*$/.test(line)) return false;
    }
  }
  return true;
})());

console.log('\n  The row rules\n');

ok('a title over the budget is refused',
  G.checkRow(row({ title: 'x'.repeat(G.TITLE_MAX + 1) }), 'Pages').length > 0);
ok('a title carrying the brand is refused, since that is the doubling defect',
  G.checkRow(row({ title: 'AP CSA Guide | APCSExamPrep.com' }), 'Pages')
    .some((p) => /brand/.test(p)));
ok('an empty title is refused rather than blanking the stored one',
  G.checkRow(row({ title: '   ' }), 'Pages').some((p) => /blank/.test(p)));
ok('a description outside 140 to 160 is refused',
  G.checkRow(row({ description: D(139) }), 'Pages').length > 0 &&
  G.checkRow(row({ description: D(161) }), 'Pages').length > 0);
ok('a description inside the band is accepted',
  G.checkRow(row({ description: D(150) }), 'Pages').length === 0);
ok('an em-dash is refused, per the house rule',
  G.checkRow(row({ title: 'AP CSA \u2014 Guide' }), 'Pages').length > 0);
ok('a row that changes nothing is refused',
  G.checkRow({ handle: 'a-page' }, 'Pages').some((p) => /changes nothing/.test(p)));
ok('a handle that is not a slug is refused',
  G.checkRow(row({ handle: '/pages/a-page' }), 'Pages').length > 0);

console.log('\n  A school year that has ended may never be WRITTEN\n');
ok('writing 2025-2026 into a title is refused',
  G.checkRow(row({ title: 'AP CSA Study Guides 2025-2026' }), 'Pages')
    .some((p) => /school year that has ended/.test(p)));
ok('writing 2025-26 is refused too',
  G.checkRow(row({ title: 'AP CSA Cram Kit 2025-26' }), 'Pages')
    .some((p) => /school year that has ended/.test(p)));
ok('the current school year is fine',
  !G.checkRow(row({ title: 'AP CSA Study Guides 2026-27' }), 'Pages')
    .some((p) => /school year that has ended/.test(p)));
ok('a historical range is not a school year and is allowed',
  !G.checkRow(row({ title: 'AP CSA FRQ Archive 2004-2025' }), 'Pages')
    .some((p) => /school year that has ended/.test(p)));

console.log('\n  The shipped table itself\n');

for (const [rows, kind] of [[PAGES, 'Pages'], [PRODUCTS, 'Products'], [COLLECTIONS, 'Collections']]) {
  const built = G.buildSheet(rows, kind);
  ok(`${kind}: every row passes the rules`, built.problems.length === 0);
  ok(`${kind}: the sheet builds`, typeof built.csv === 'string' && built.csv.length > 0);
  ok(`${kind}: the header carries no content column`, (() => {
    try { G.assertHeaderIsSafe(built.header || []); return true; } catch (e) { return false; }
  })());
  ok(`${kind}: every command is MERGE, so nothing is created`,
    built.csv.replace(/^﻿/, '').trim().split('\r\n').slice(1).every((l) => l.split(',')[1] === 'MERGE'));
}

ok('no handle appears in more than one row of a sheet', (() => {
  for (const rows of [PAGES, PRODUCTS, COLLECTIONS]) {
    const s = new Set(rows.map((r) => r.handle));
    if (s.size !== rows.length) return false;
  }
  return true;
})());
ok('every row records why it is being changed',
  [...PAGES, ...PRODUCTS, ...COLLECTIONS].every((r) => typeof r.why === 'string' && r.why.length > 10));

console.log(`\n  ${fail === 0 ? 'OK' : 'FAILED'} - ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
