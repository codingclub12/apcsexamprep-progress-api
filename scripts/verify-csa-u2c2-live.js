'use strict';
// -----------------------------------------------------------------------------
//  BOARD 343 LIVE CHECK, BEFORE THE IMPORT AND AFTER IT.
//
//      npm run verify:u2c2
//
//  The 19 unit-2-cycle-2 articles post a program their question is not about.
//  imports/2026-09-18-csa-qotd-343/ carries the sheets that put the right code
//  back. This reads the live articles and says which of three states each one
//  is in. It takes no flag for which side of the import it is on, because a
//  flag is a thing that can be set wrong: the state is DERIVED from what is
//  serving.
//
//      pending    the live body is still the one the sheet was built from, and
//                 regenerating the repair off it reproduces the committed sheet
//                 byte for byte. Safe to import.
//      imported   the live body IS the sheet. The repair shipped.
//      drifted    neither. Something changed the page since the sheet was
//                 generated, so the sheet is STALE and importing it would MERGE
//                 an old body over a newer one.
//
//  ── WHY `drifted` IS THE WHOLE REASON THIS FILE EXISTS ─────────────────────
//  A generated sheet goes stale, and a stale sheet reverts somebody's fix with
//  nothing anywhere saying so. On 2026-09-08 a Command Center sheet sat for a
//  day while that page was renumbered onto CED lesson ids; importing it would
//  have put the pre-renumbering body back. MERGE has no undo. So this check is
//  for BEFORE the click, not only after it, and `pending` is a pass.
//
//  The primary assertion is byte-for-byte against the sheet in both directions,
//  never a needle. A needle that cannot match reads exactly like a page that
//  was never imported: the 2026-09-15 verifier shipped one that spanned a
//  </span> and reported a correct import as missing.
//
//  No em-dashes, per repo convention. Zero PII: public page markup only.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch.js');
const { extractArticle } = require('./csa-article-body-extract.js');
const E = require('../lib/matrixify-body-edit.js');
const R = require('./csa-qotd-u2c2-repair.js');

const BLOG = 'ap-csa-daily-practice';
const SHEETS = path.join(__dirname, '..', 'imports', '2026-09-18-csa-qotd-343');

function sheetPath(handle) {
  return path.join(SHEETS, 'csa-qotd-343-' + handle + '-blog-posts.csv');
}

function sheetBody(handle) {
  const file = sheetPath(handle);
  if (!fs.existsSync(file)) throw new Error('no sheet on disk at ' + file);
  const rows = E.parseCsv(fs.readFileSync(file, 'utf8'));
  if (rows.length !== 2) throw new Error(path.basename(file) + ': expected one data row, found ' + (rows.length - 1));
  return rows[1][3];
}

//  Board 292: Matrixify strips literal non-breaking spaces on import, so a body
//  that came back differing ONLY in U+00A0 -> U+0020 is the sheet. Any other
//  difference is a refusal. Same tolerance, and the same single exception, as
//  scripts/verify-csa-qotd-authoring-live.js.
function sameAsSheet(want, live) {
  if (live === want) return { same: true, note: null };
  let nbsp = 0;
  for (let i = 0; i < Math.max(want.length, live.length); i += 1) {
    if (want[i] === live[i]) continue;
    if (want.codePointAt(i) === 0x00a0 && live.codePointAt(i) === 0x20) { nbsp += 1; continue; }
    return { same: false, note: null };
  }
  return { same: true, note: nbsp + ' non-breaking space(s) stripped on import, board 292' };
}

//  Given the live body and the canonical row, decide which of the three states
//  this article is in. Never throws for a drifted page: a drift is a RESULT to
//  report on all 19, not an exception that hides the other 18.
function classify(live, row) {
  const want = sheetBody(row.handle);

  const post = sameAsSheet(want, live);
  if (post.same) return { state: 'imported', note: post.note };

  let out;
  try {
    out = R.repairOne(live, row).out;
  } catch (e) {
    return { state: 'drifted', why: 'the repair no longer applies to the live body: ' + e.message };
  }
  //  `repaired` is handed back because computing it costs a JVM run. A caller
  //  that wants the post-import body has it already; recomputing would double
  //  the cost of the slowest suite in the repo for identical bytes.
  const pre = sameAsSheet(want, out);
  if (pre.same) return { state: 'pending', note: pre.note, repaired: out };

  return { state: 'drifted',
    why: 'the repair applies but does not reproduce the committed sheet, so the live body changed since the sheet was generated' };
}

module.exports = { classify, sameAsSheet, sheetBody, sheetPath, BLOG, SHEETS };

if (require.main === module) {
  const rows = R.load();
  let failed = 0;
  const counts = { pending: 0, imported: 0, drifted: 0 };

  rows.forEach((row) => {
    let live;
    try {
      const r = sf.rawOnce('/blogs/' + BLOG + '/' + row.handle, {});
      if (r.code !== '200') throw new Error('answered ' + r.code);
      //  A challenge page contains none of the strings below, so every negative
      //  assertion would pass on it. lib/storefront-fetch refuses it on a
      //  positive marker instead.
      if (!sf.looksReal(r.body)) throw new Error('not a rendered page, so this read proves nothing');
      const x = extractArticle(r.body);
      if (x.error) throw new Error(x.error);
      live = x.body;
    } catch (e) {
      failed += 1;
      console.log('  FAIL  ' + row.handle.padEnd(56) + e.message);
      return;
    }

    const c = classify(live, row);
    counts[c.state] += 1;
    if (c.state === 'drifted') {
      failed += 1;
      console.log('  STALE ' + row.handle.padEnd(56) + c.why);
    } else {
      console.log('  ' + (c.state === 'imported' ? 'live' : 'wait') + '  '
        + row.handle.padEnd(56) + c.state + (c.note ? '  ' + c.note : ''));
    }
  });

  console.log('');
  console.log('  ' + counts.pending + ' pending, ' + counts.imported + ' imported, '
    + counts.drifted + ' drifted, of ' + rows.length);
  if (counts.drifted) {
    console.log('  DO NOT IMPORT. Regenerate the sheets off current live bodies first:');
    console.log('    node scripts/csa-qotd-u2c2-repair.js <fresh-bodies> imports/2026-09-18-csa-qotd-343');
  } else if (counts.imported === rows.length) {
    console.log('  All 19 repaired articles are live and byte-identical to the sheet.');
  } else if (counts.pending === rows.length) {
    console.log('  Sheet is current against live. Safe to import.');
  }
  process.exit(failed ? 1 : 0);
}
