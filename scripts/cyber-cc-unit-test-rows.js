'use strict';
// ---------------------------------------------------------------------------
//  ADD THE BUNDLE'S UNIT TESTS AND KEYS TO THE CYBER COMMAND CENTER
//
//      node scripts/cyber-cc-unit-test-rows.js <before.html> <drive-folder-id> \
//           [--sheet out-pages.csv]
//
//  THE PROBLEM, MEASURED. Every one of the five units on
//  /pages/cyber-command-center renders "Review & unit test - 2d" from its own
//  testDays field, and the page hands the teacher no test. Lesson materials are
//  deck, notes, quiz and supp only; nothing on the page is a unit test or a key.
//  So the pacing budgets two days per unit against a thing that is not there,
//  and teachers go looking on the storefront, where the SITE's own unit-test
//  pages are a different product entirely. That is the confusion.
//
//  THE CHANGE IS DATA, NOT LOGIC. renderResources() already does exactly the
//  right thing: locked rows come out as <span class="mat disabled"> with no
//  href, unlocked rows as <a class="mat">. So two new entries in the RESOURCES
//  array are the whole fix, and the renderer is not touched. On a live teacher
//  page that is the smallest blast radius available.
//
//  WHY BOTH ROWS POINT AT THE SAME FOLDER. They are one Drive folder holding
//  both the tests and the keys. Two rows rather than one because a teacher
//  scanning for the word "key" has to be able to see it; that is discoverability,
//  not duplication.
//
//  WHY THE ICON IS ONE THE PAGE ALREADY USES. The store handoff says emoji are
//  not authored into page content. This body already carries 27 of them, the
//  clipboard among them, and the preflight refuses any sheet that ADDS one.
//  Reusing an
//  icon already on the page keeps the round-trip honest: nothing new is
//  introduced, so nothing has to be excused.
//
//  THE GUARANTEE. verify() requires the new body to be the old body with exactly
//  one insertion at one point and nothing else moved, byte for byte. A rewrite
//  that touches the renderer, the units, or another resource row cannot pass.
//
//  Pure ASCII source: the emoji is built from its code point.
//  No em-dashes, per repo convention.
// ---------------------------------------------------------------------------
const fs = require('fs');

const CLIPBOARD = String.fromCodePoint(0x1F4CB);   // the page already uses this
const HANDLE = 'cyber-command-center';
const HEADER = ['Handle', 'Command', 'Body HTML'];
const COMMAND = 'MERGE';

//  Anchored on the LAST existing row plus the array close, so an insertion can
//  only land at the end of RESOURCES. Matching the close alone would also match
//  other arrays in this file.
const ANCHOR = '/view" },\n  ];';

//  A Drive folder id, as they actually look. Refusing a malformed one here beats
//  discovering it as a broken link on a teacher's page.
const DRIVE_ID = /^[A-Za-z0-9_-]{20,}$/;

function rows(folderId) {
  const href = 'D+"' + folderId + '"';
  return [
    '    { ico:"' + CLIPBOARD + '", label:"Unit Tests: Teacher Bundle", href:' + href + ' },',
    '    { ico:"' + CLIPBOARD + '", label:"Unit Test Answer Keys: Teacher Bundle", href:' + href + ' },',
  ].join('\n');
}

function addRows(before, folderId) {
  if (!DRIVE_ID.test(String(folderId || ''))) {
    return { error: `${JSON.stringify(folderId)} is not a Google Drive folder id` };
  }
  if (before.includes('Unit Tests: Teacher Bundle')) {
    return { before, after: before, changed: false, reason: 'the rows are already there' };
  }
  const at = before.lastIndexOf(ANCHOR);
  if (at === -1) return { error: 'the end of the RESOURCES array was not found' };
  //  Insert after the last row's comma, before the closing bracket line.
  const cut = at + '/view" },\n'.length;
  const after = before.slice(0, cut) + rows(folderId) + '\n' + before.slice(cut);
  return { before, after, changed: true, cut };
}

//  One comparison carries the whole guarantee.
function verify(before, after, folderId) {
  const bad = [];
  const inserted = rows(folderId) + '\n';
  const at = after.indexOf(inserted);
  if (at === -1) { bad.push('the new rows are not present as a single contiguous block'); return bad; }
  const rebuilt = after.slice(0, at) + after.slice(at + inserted.length);
  if (rebuilt !== before) {
    let i = 0;
    while (i < Math.min(rebuilt.length, before.length) && rebuilt[i] === before[i]) i++;
    bad.push(`something OTHER than the insertion changed, first difference at byte ${i} `
      + `(expected ${JSON.stringify(before.slice(i, i + 48))}, `
      + `got ${JSON.stringify(rebuilt.slice(i, i + 48))})`);
    return bad;
  }
  if (after.length - before.length !== inserted.length) {
    bad.push('the length delta does not match the inserted block');
  }
  //  The things a teacher would notice if they broke.
  const emojiBefore = (before.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length;
  const emojiAfter = (after.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length;
  if (emojiAfter - emojiBefore !== 2) bad.push('the icons added are not the two expected');
  if (!/[\u{1F4CB}]/u.test(before)) bad.push('the icon used is not one the page already had');
  const resources = after.slice(after.indexOf('var RESOURCES'), after.indexOf('function renderResources'));
  if ((resources.match(/\{\s*ico:/g) || []).length !== 7) bad.push('RESOURCES is not 5 rows plus 2');
  if (!/function renderResources/.test(after)) bad.push('the renderer went missing');
  if (before.replace(/\s/g, '') === after.replace(/\s/g, '')) bad.push('nothing actually changed');
  return bad;
}

function toCsv(handle, body) {
  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  return '\uFEFF' + [HEADER.map(cell).join(',')]
    .concat([[cell(handle), cell(COMMAND), cell(body)].join(',')])
    .join('\r\n') + '\r\n';
}

if (require.main === module) {
  const [src, folderId, ...rest] = process.argv.slice(2);
  if (!src || !folderId) {
    console.error('usage: node scripts/cyber-cc-unit-test-rows.js <before.html> '
      + '<drive-folder-id> [--sheet out-pages.csv]');
    process.exit(2);
  }
  const before = fs.readFileSync(src, 'utf8');
  const r = addRows(before, folderId);
  if (r.error) { console.error(`\n  ${r.error}\n`); process.exit(1); }
  if (!r.changed) { console.log(`\n  nothing to do: ${r.reason}\n`); process.exit(0); }
  const bad = verify(before, r.after, folderId);
  if (bad.length) {
    console.error(`\n  ${bad.length} problem(s). No file written.\n`);
    bad.slice(0, 4).forEach((b) => console.error('    ' + b));
    process.exit(1);
  }
  console.log(`\n  before ${before.length} chars, after ${r.after.length}, `
    + `+${r.after.length - before.length} at byte ${r.cut}`);
  console.log('  two rows added to RESOURCES, nothing else moved.');
  const i = rest.indexOf('--sheet');
  if (i !== -1) {
    const name = rest[i + 1];
    if (!/page/i.test(name.split(/[\\/]/).pop())) {
      console.error(`\n  ${name} names no sheet Matrixify recognises. A CSV has no tab name, `
        + 'so the file name carries the sheet type. Use something like cc-pages.csv.\n');
      process.exit(1);
    }
    fs.writeFileSync(name, toCsv(HANDLE, r.after));
    fs.writeFileSync(name.replace(/\.csv$/, '.after.html'), r.after);
    console.log(`  wrote ${name}`);
  }
  console.log('');
}

module.exports = { addRows, verify, toCsv, rows, HEADER, HANDLE, COMMAND, ANCHOR, CLIPBOARD };
