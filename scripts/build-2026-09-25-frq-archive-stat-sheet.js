'use strict';
// -----------------------------------------------------------------------------
//  REMOVE THE 54.5% "SCORE 5s" STAT FROM THE CSA FRQ ARCHIVE (board #416)
//
//  The 54.5% five rate is from Tanner's own classroom, and on 2026-09-25 he
//  decided it should not be presented as the site's result. Theme PR #132 took
//  it out of the sitewide popups and funnel widget. One copy survives in a page
//  BODY rather than the theme: the tutoring banner on /pages/ap-csa-frq-archive
//  opens its stats row with it.
//
//  -- WHAT IS REPLACED --------------------------------------------------------
//  One exact before/after pair: the first stat in .frq-cta-stats-row and the
//  divider after it. The row keeps its other two stats (hours and reviews), the
//  banner keeps its headline, prices and button. Nothing else on the page moves.
//  The tutoring prices in the same banner are deliberately NOT touched: pricing
//  needs Tanner's explicit say, and this sheet is only the score claim.
//
//  The anchor is the row's opening tag, which appears once in the body. Only
//  the markup opens the row with that tag; the stylesheet names the class, not
//  the tag, so the anchor cannot land in the CSS.
//
//  -- WHAT IT REFUSES ---------------------------------------------------------
//  Everything scripts/build-cyber-points-fix-sheet.js refuses, through its
//  patchBody, so there is one implementation of "change exactly this and
//  nothing else": a before string that is not there exactly once, a body that
//  changed anywhere but the pair (length arithmetic and an inverse round trip),
//  new non-ASCII, and a script that stops compiling. Then the matrixify
//  preflight, and a CSV parse-back that must return the patched body byte for
//  byte. One refusal writes no file.
//
//  Run: node scripts/build-2026-09-25-frq-archive-stat-sheet.js [--out <dir>]
//  Before and after importing: node scripts/verify-frq-archive-stat-live.js
//  No em-dashes, per repo convention.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');
const { patchBody, writeSheet, readBack } = require('./build-cyber-points-fix-sheet');
const { preflight } = require('./matrixify-preflight');

const HANDLE = 'ap-csa-frq-archive';
const ROW_OPEN = '<div class="frq-cta-stats-row">\n';
const STAT = [
  '      <div class="frq-cta-stat">\n',
  '        <span class="frq-cta-stat-val">54.5%</span>\n',
  '        <span class="frq-cta-stat-lbl">Score 5s</span>\n',
  '      </div>\n',
  '      <span class="frq-cta-divider"></span>\n',
].join('');
const PAIRS = [[ROW_OPEN + STAT, ROW_OPEN]];

//  THE PURE HALF, beyond patchBody: the patched body must not carry the claim
//  anywhere, and must still carry the banner it lives in.
function checkResult(after) {
  const problems = [];
  if (after.includes('54.5%')) problems.push(HANDLE + ': 54.5% still appears in the patched body');
  if (/score 5s/i.test(after)) problems.push(HANDLE + ': a "Score 5s" label still appears in the patched body');
  if (!after.includes(ROW_OPEN)) problems.push(HANDLE + ': the stats row itself is gone, which is more than this sheet may remove');
  if ((after.match(/class="frq-cta-stat"/g) || []).length !== 2) problems.push(HANDLE + ': the stats row should keep exactly two stats');
  return problems;
}

function build(src) {
  const out = patchBody(HANDLE, src, PAIRS);
  if (!out.row) return out;
  const extra = checkResult(out.row.after);
  return extra.length ? { problems: extra } : out;
}

function main(argv) {
  const outAt = argv.indexOf('--out');
  const outDir = outAt > -1 ? argv[outAt + 1] : path.join(__dirname, '..', 'imports', '2026-09-25-frq-archive-stat');
  const r = sf.raw('/pages/' + HANDLE + '.json');
  if (String(r.code) !== '200') { console.error('\n  Refused: /pages/' + HANDLE + '.json answered ' + r.code + '\n'); process.exit(1); }
  let src;
  try { src = JSON.parse(r.body).page.body_html; } catch (e) { console.error('\n  Refused: the page JSON did not parse\n'); process.exit(1); }

  const out = build(src);
  if (!out.row) {
    console.error('\n  ' + out.problems.length + ' problem(s). No file written:\n');
    out.problems.forEach((m) => console.error('    ' + m));
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  //  The name has to contain "page" or Matrixify rejects the file outright.
  const file = path.join(outDir, 'frq-archive-stat-pages.csv');
  writeSheet(file, [out.row]);
  readBack(file, [out.row]);
  const pf = preflight(file, { expectCommand: 'MERGE', carrying: { [HANDLE]: src } });
  if (pf.problems.length) {
    fs.unlinkSync(file);
    console.error('\n  Preflight refused, file removed:\n');
    pf.problems.forEach((p) => console.error('    ' + p));
    process.exit(1);
  }
  pf.notes.forEach((n) => console.log('  note: ' + n));
  console.log('\n  1 row, parsed back, preflight clear: ' + path.relative(process.cwd(), file));
  console.log('    ' + HANDLE + '  ' + src.length + ' -> ' + out.row.after.length + ' bytes');
  console.log('  Import settings: MERGE, QUOTE_ALL, utf-8-sig. One sheet at a time.');
  console.log('  Before importing: node scripts/verify-frq-archive-stat-live.js --before');
  console.log('  After importing:  node scripts/verify-frq-archive-stat-live.js\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { HANDLE, PAIRS, ROW_OPEN, STAT, build, checkResult };
