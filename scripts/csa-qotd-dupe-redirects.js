'use strict';
// -----------------------------------------------------------------------------
//  BOARD 333: THE REDIRECT SHEET FOR THE DUPLICATE QOTD HANDLES.
//
//      node scripts/csa-qotd-dupe-redirects.js <out-dir>
//
//  72 of the 84 duplicate pairs are the same question at two URLs. This writes
//  one Matrixify Redirects sheet sending the 2026-02-06 bulk-import handle to
//  the daily-series handle that carries the same question.
//
//  ── IMPORTING THIS ON ITS OWN CHANGES NOTHING, AND THAT IS NOT A BUG ───────
//  Shopify will only honour a redirect FROM a URL that does not resolve: "You
//  can redirect only from broken URLs. If the URL still loads a valid webpage,
//  then the URL redirect won't work." Every Path in this sheet answers 200
//  today. So the order is forced and it is not an implementation detail:
//
//      1. a human unpublishes the 72 retire handles   (NEVER_AUTO, not an
//         agent's to do, and this script does not do it)
//      2. confirm each Path now answers 404
//      3. import this sheet
//      4. confirm each Path now answers 301 to its Target
//
//  Run 3 before 1 and you get 72 redirects that silently never fire, while
//  Matrixify logs every row and Admin shows them all present. That failure mode
//  is why imports/2026-09-16 wrote the order down, and it applies here unchanged.
//
//  ── WHAT IS DELIBERATELY NOT IN THE SHEET ──────────────────────────────────
//  The 12 `review` pairs. They share a stem and an option set but carry
//  different code, and 9 of the 12 have BOTH members re-deriving correctly, so
//  they are two working variants of one prompt rather than a duplicate.
//  Redirecting one away would destroy a distinct working item, and that is a
//  content judgement rather than a cleanup.
//
//  Unit 1 cycle 2's 28 articles have no compact twin at all. Nothing here can
//  reach them, and the builder refuses to pair them.
//
//  No em-dashes, per repo convention. Zero PII: public page markup only.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'config', 'csa-qotd-duplicate-pairs.json');
const BLOG = 'ap-csa-daily-practice';
const COLS = ['Command', 'Path', 'Target'];
const SHEET = 'csa-qotd-333-duplicate-handle-redirects.csv';

function load() {
  const d = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  if (!d.pairs || !d.pairs.length) throw new Error(DATA + ' carries no pairs');
  return d;
}

function url(handle) { return '/blogs/' + BLOG + '/' + handle; }

function csvCell(s) { return '"' + String(s).replace(/"/g, '""') + '"'; }

//  Matrixify wants a BOM and CRLF rows, and QUOTE_ALL per CONVENTIONS.md.
function toCsv(rows) {
  const lines = [COLS.map(csvCell).join(',')];
  rows.forEach((r) => lines.push(COLS.map((c) => csvCell(r[c])).join(',')));
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}

function rowsFor(doc) {
  const take = doc.pairs.filter((p) => p.verdict === 'redirect');
  const rows = [];
  const paths = new Set();
  const targets = new Set();

  take.forEach((p) => {
    const Path = url(p.retire);
    const Target = url(p.keep);

    //  A redirect to itself is a loop and Shopify accepts it silently.
    if (Path === Target) throw new Error(p.key + ': Path and Target are the same URL');
    //  Two rows retiring the same handle, or two handles retired onto one
    //  target, both mean the pairing upstream is wrong.
    if (paths.has(Path)) throw new Error(Path + ' appears as a Path twice');
    if (targets.has(Target)) throw new Error(Target + ' is the target of more than one redirect');
    //  A Target that is itself being retired would chain, and Shopify does not
    //  follow redirect chains.
    if (take.some((q) => url(q.retire) === Target)) {
      throw new Error(Target + ' is both a redirect target and a retired handle, which would chain');
    }
    //  The keep side must be the compact daily-series handle, never the
    //  February bulk import. Getting this backwards would retire the maintained
    //  half and keep the one board 343 found drifting.
    if (!/^unit[0-9]-cycle[0-9]-day-/.test(p.keep)) throw new Error(p.keep + ' is not a compact daily-series handle');
    if (!/^unit-[0-9]-cycle-[0-9]-day-/.test(p.retire)) throw new Error(p.retire + ' is not a bulk-import handle');

    paths.add(Path); targets.add(Target);
    rows.push({ Command: 'MERGE', Path, Target });
  });

  if (!rows.length) throw new Error('no redirect rows, which cannot be right for 72 same-question pairs');
  return rows;
}

module.exports = { load, rowsFor, toCsv, url, COLS, SHEET, DATA };

if (require.main === module) {
  const out = process.argv[2];
  if (!out) { console.error('usage: csa-qotd-dupe-redirects.js <out-dir>'); process.exit(2); }
  fs.mkdirSync(out, { recursive: true });

  const doc = load();
  const rows = rowsFor(doc);
  const text = toCsv(rows);
  fs.writeFileSync(path.join(out, SHEET), text);

  const review = doc.pairs.filter((p) => p.verdict === 'review');
  console.log('  ' + rows.length + ' redirects written to ' + SHEET);
  console.log('  ' + review.length + ' pairs deliberately left out for a human to judge:');
  review.forEach((p) => console.log('    ' + p.key.padEnd(46) + p.why));
  console.log('');
  console.log('  This sheet does nothing until the ' + rows.length + ' Path handles are unpublished first.');
}
