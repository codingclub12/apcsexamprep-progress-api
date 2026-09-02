'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  PUT A CAVEAT ON THE CSA ARTICLES THAT DRILL REMOVED CURRICULUM.
//
//  /pages/ap-csa-ced-explained tells students "Not tested on the 2025-2026 exam.
//  Trap: Skip entirely." Forty-nine daily-practice articles serve the same
//  material as "Advanced Practice Question", difficulty "Hard", with no caveat.
//  A teacher who reads both catches the site contradicting itself.
//
//  Scope was measured off live bodies by scripts/csa-removed-curriculum-scan.js,
//  not off titles: 49 articles across four naming schemes, none already
//  caveated. See docs/csa-removed-curriculum-contradiction.md.
//
//  WHY A BANNER AND NOT A DELETION
//  Unpublishing is on the NEVER_AUTO list and would throw away the traffic that
//  makes these pages worth having. The questions are correct Java; they are
//  simply not on this exam, and a student tracing them is not harmed once the
//  page says so.
//
//  THE BANNER IS PREPENDED, WHOLE, AND NOTHING ELSE MOVES
//  One anchor for both templates: the top of the body. verify() requires that
//  the new body is EXACTLY the banner followed by the old body, byte for byte,
//  so a rewrite that touches a question, an option or an answer key cannot pass.
//
//  Inline styles only. A <style> block in an article body leaks across the whole
//  page on this theme, which CONVENTIONS.md in the theme repo exists to prevent.
//  Pure ASCII, no CED Essential Knowledge codes in student-visible text.
//
//  Run: node scripts/csa-removed-curriculum-banner.js <bodies.json> [--sheet out.csv] [--canary one.csv]
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');

const CED_PAGE = '/pages/ap-csa-ced-explained';

//  Written for a student, not a teacher. It says what is true, why the page is
//  still here, and where to find what IS on the exam. It does not apologise and
//  it does not use a CED code.
const BANNER =
  '<div style="all:initial;display:block;box-sizing:border-box;'
  + 'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;'
  + 'max-width:900px;margin:0 auto 20px;padding:16px 18px;border-radius:10px;'
  + 'background:#fffbea;border:1px solid #f6c76b;border-left:5px solid #d97706;">'
  + '<div style="all:initial;display:block;font-family:inherit;font-size:14px;font-weight:700;'
  + 'letter-spacing:.04em;text-transform:uppercase;color:#92400e;'
  + '-webkit-text-fill-color:#92400e;margin:0 0 6px;">Not on the 2025-2026 exam</div>'
  + '<div style="all:initial;display:block;font-family:inherit;font-size:15px;line-height:1.6;'
  + 'color:#3f3f46;-webkit-text-fill-color:#3f3f46;">'
  + 'This question covers material that was removed from AP Computer Science A in the '
  + '2025-2026 course redesign. It is kept as extra practice for reading and tracing Java, '
  + 'and it will not appear on your exam. '
  + '<a href="' + CED_PAGE + '" style="all:initial;font-family:inherit;font-size:15px;'
  + 'color:#1d4ed8;-webkit-text-fill-color:#1d4ed8;text-decoration:underline;cursor:pointer;">'
  + 'See what is on the exam</a>.'
  + '</div></div>\n';

const MARKER = 'Not on the 2025-2026 exam';

function addBanner(handle, body) {
  if (body.includes(MARKER)) return { body, changed: false, reason: 'already carries the banner' };
  return { body: BANNER + body, changed: true };
}

//  The whole guarantee, in one comparison. If the new body is not exactly the
//  banner plus the old body then something else moved, and this refuses rather
//  than trying to work out whether the something else mattered.
function verify(handle, before, after) {
  const bad = [];
  if (after !== BANNER + before) {
    let i = 0;
    const want = BANNER + before;
    while (i < Math.min(want.length, after.length) && want[i] === after[i]) i++;
    bad.push(`${handle}: the body is not exactly the banner plus the original, first difference `
      + `at byte ${i} (expected ${JSON.stringify(want.slice(i, i + 40))}, `
      + `got ${JSON.stringify(after.slice(i, i + 40))})`);
    return bad;
  }
  if ((after.match(new RegExp(MARKER, 'g')) || []).length !== 1) {
    bad.push(`${handle}: the banner appears more than once`);
  }
  if (/[^\x20-\x7E\n\r\t]/.test(BANNER)) bad.push(`${handle}: the banner is not pure ASCII`);
  if (/<style[\s>]/i.test(BANNER)) bad.push(`${handle}: the banner carries a style block, which leaks`);
  if (!after.startsWith('<div style="all:initial')) bad.push(`${handle}: the banner is not first`);
  return bad;
}

function sheetRows(bodies) {
  const rows = [], bad = [], skipped = [];
  for (const [handle, before] of Object.entries(bodies)) {
    const r = addBanner(handle, before);
    if (!r.changed) { skipped.push(`${handle}: ${r.reason}`); continue; }
    const problems = verify(handle, before, r.body);
    if (problems.length) { bad.push(...problems); continue; }
    rows.push({ handle, body: r.body, grew: r.body.length - before.length });
  }
  return { rows, bad, skipped };
}

//  MATRIXIFY BLOG POSTS SHEET. The first attempt at this was REFUSED by
//  Matrixify in one second with "Cannot understand the uploaded file", and the
//  canary is the only reason that cost one row instead of forty-nine.
//
//  Two things were wrong, and neither was the content. The bodies were correct
//  in the rejected file, byte for byte. It was the envelope, and nothing
//  checked the envelope.
//
//  1. THE POST'S OWN COLUMNS ARE NOT PREFIXED. The sheet said
//     `Article: Handle`, `Article: Command`, `Article: Body HTML`. Matrixify
//     names the sheet's own entity columns bare and prefixes only RELATED
//     entities, so it is `Handle`, `Command`, `Body HTML`, and `Blog: Handle`
//     for the parent. The Pages generators already in this repo show the same
//     shape and were the evidence that the mechanics were fine.
//
//  2. THE FILE NAME IS THE SHEET NAME. Matrixify decides what a file contains
//     from the tab name, and a CSV has no tabs, so the FILENAME carries it.
//     `csa-banner-canary.csv` told it nothing. `...-blog-posts.csv` does.
//     assertSheetName below refuses to write a file Matrixify would reject,
//     because a generator that cannot be imported is not a generator.
//
//  Command is UPDATE, not MERGE. This deviates from the repo default and the
//  reason is worth keeping: MERGE CREATES a row it cannot find, so one typo'd
//  handle would publish a blank article to a live blog. UPDATE skips it. There
//  is nothing to create here, only 49 articles that already exist.
const BLOG_HANDLE = 'ap-csa-daily-practice';
const HEADER = ['Blog: Handle', 'Handle', 'Command', 'Body HTML'];

//  Matrixify reads the sheet type off the file name for a CSV. Getting this
//  wrong is a one-second rejection with no per-row detail, so it is checked
//  here rather than discovered in the Shopify admin.
const SHEET_NAME_RE = /blog[-_ ]?posts?/i;

function assertSheetName(outPath) {
  const name = String(outPath || '').split(/[\\/]/).pop();
  if (SHEET_NAME_RE.test(name)) return null;
  return `${name} is not a name Matrixify will recognise as a Blog Posts sheet. `
    + 'It reads the sheet type off the file name for a CSV, and rejects the whole file '
    + 'in one second with no per-row detail. Name it something like '
    + '"csa-banner-blog-posts.csv".';
}

function toCsv(rows) {
  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  //  The HEADER is quoted too. It used to be joined raw, which parses fine and
  //  is still wrong: CONVENTIONS.md says QUOTE_ALL, and a file that is quoted
  //  everywhere except one line invites the next person to decide quoting is
  //  optional on the line that does carry a comma. Caught by smoke:csabanner.
  return '﻿' + [HEADER.map(cell).join(',')]
    .concat(rows.map((r) => [cell(BLOG_HANDLE), cell(r.handle), cell('UPDATE'), cell(r.body)].join(',')))
    .join('\r\n') + '\r\n';
}

if (require.main === module) {
  const [src, ...rest] = process.argv.slice(2);
  if (!src) {
    console.error('usage: node scripts/csa-removed-curriculum-banner.js <bodies.json> '
      + '[--sheet out.csv] [--canary one.csv]');
    process.exit(2);
  }
  const bodies = JSON.parse(fs.readFileSync(src, 'utf8'));
  const { rows, bad, skipped } = sheetRows(bodies);
  console.log(`\nBANNER\n`);
  rows.forEach((r) => console.log(`  ${r.handle.padEnd(52)}+${r.grew} bytes`));
  if (skipped.length) {
    console.log(`\n  ${skipped.length} skipped:`);
    skipped.forEach((s) => console.log('    ' + s));
  }
  if (bad.length) {
    console.error(`\n  ${bad.length} problem(s). No file written.\n`);
    bad.slice(0, 5).forEach((b) => console.error('    ' + b));
    process.exit(1);
  }
  const i = rest.indexOf('--sheet');
  const c = rest.indexOf('--canary');
  const nameProblems = [rest[c + 1], rest[i + 1]]
    .filter((x, n) => (n === 0 ? c !== -1 : i !== -1))
    .map(assertSheetName).filter(Boolean);
  if (nameProblems.length) {
    console.error(`\n  ${nameProblems.length} output name(s) Matrixify would reject. `
      + 'No file written.\n');
    nameProblems.forEach((m) => console.error('    ' + m));
    process.exit(1);
  }
  if (c !== -1) {
    fs.writeFileSync(rest[c + 1], toCsv(rows.slice(0, 1)));
    console.log(`\n  wrote ${rest[c + 1]}  (1 row, the canary: ${rows[0].handle})`);
  }
  if (i !== -1) {
    const csv = toCsv(rows);
    fs.writeFileSync(rest[i + 1], csv);
    console.log(`  wrote ${rest[i + 1]}  (${rows.length} rows, ${(csv.length / 1024).toFixed(0)} KB)`);
  }
  console.log(`\n  every row: body is exactly the banner plus the original, nothing else moved.\n`);
}

module.exports = { BANNER, MARKER, addBanner, verify, sheetRows, toCsv, HEADER, BLOG_HANDLE,
  assertSheetName, SHEET_NAME_RE };
