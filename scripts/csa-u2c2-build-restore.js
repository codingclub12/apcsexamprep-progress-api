'use strict';
// -----------------------------------------------------------------------------
//  BUILD THE CANONICAL DATA FOR BOARD 343.
//
//      node scripts/csa-u2c2-build-restore.js <hyphenated-dir> <twin-dir> <out.json>
//
//  19 unit-2-cycle-2-day-* articles post a code block that does not belong to
//  their own question. Measured 2026-09-18 across all 19 pairs:
//
//      explanation identical to the twin   19 of 19
//      code different from the twin        19 of 19
//      options and key the same set        19 of 19 (4 shuffled to other letters)
//
//  So the code block is the single foreign element. The stem, the options, the
//  key, the Why This Answer, the Common Mistake and the AP Exam Strategy all
//  describe the TWIN's program: day 10 says "the loop adds 1 + 2 + 3 + 4 = 10"
//  and warns about `<= 4`, while the code posted above it says `i <= 5`.
//
//  This writes out the twin's code per article, with provenance, so the repair
//  is data plus a generator rather than 19 hand edits. The convention this repo
//  follows for any page set larger than about three: canonical data, a
//  generator, a validator, and a sheet.
//
//  WHAT MAKES IT CHECKABLE rather than trusted: for every row, running the
//  twin's code must produce exactly the text of the option the HYPHENATED
//  article already keys. That is recorded here and re-asserted by the suite, so
//  a wrong extraction cannot pass quietly.
//
//  No em-dashes, per repo convention. Zero PII: public page markup only.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const I = require('../lib/csa-qotd-items.js');
const D = require('../scripts/csa-qotd-key-rederive.js');

const BLOCK = /<div class="apcs-code-block">\s*<pre><code>([\s\S]*?)<\/code><\/pre>/g;

function oneBlock(body, label) {
  const hits = [...body.matchAll(BLOCK)];
  if (hits.length !== 1) throw new Error(label + ': expected exactly one question code block, found ' + hits.length);
  return hits[0][1];
}

function main(argv) {
  const [hyphDir, twinDir, out] = argv;
  if (!hyphDir || !twinDir || !out) {
    console.error('usage: node scripts/csa-u2c2-build-restore.js <hyphenated-dir> <twin-dir> <out.json>');
    process.exit(2);
  }
  const rows = [];
  fs.readdirSync(hyphDir).filter((f) => f.endsWith('.html')).sort().forEach((f) => {
    const handle = f.replace(/\.html$/, '');
    const twin = handle.replace(/^unit-2-cycle-2-day-/, 'unit2-cycle2-day-');
    const hyphBody = fs.readFileSync(path.join(hyphDir, f), 'utf8');
    const twinBody = fs.readFileSync(path.join(twinDir, twin + '.html'), 'utf8');

    const hyphItem = I.parse(handle, hyphBody);
    const twinItem = I.parse(twin, twinBody);
    const twinRun = D.audit(twinItem);
    if (twinRun.state !== 'agrees') {
      throw new Error(twin + ': the twin does not re-derive as agreeing (' + twinRun.state + '), so it is not a safe source');
    }

    //  The claim this whole repair rests on, asserted per row rather than assumed:
    //  the twin's output is the text of the option the hyphenated article keys.
    const keyed = hyphItem.options.find((o) => o.letter === hyphItem.key.value);
    if (!keyed) throw new Error(handle + ': keys ' + hyphItem.key.value + ', which is not one of its options');
    if (I.collapseLines(keyed.text) !== I.collapseLines(twinRun.out)) {
      throw new Error(handle + ': keys ' + JSON.stringify(keyed.text) + ' but the twin prints '
        + JSON.stringify(twinRun.out) + ', so restoring the twin code would NOT make this article right');
    }

    rows.push({
      handle,
      twin,
      key: hyphItem.key.value,
      expected_output: twinRun.out,
      keyed_option: keyed.text,
      code_now: oneBlock(hyphBody, handle),
      code_restore: oneBlock(twinBody, twin),
      twin_body_sha256: crypto.createHash('sha256').update(twinBody).digest('hex'),
    });
    console.log('  ' + handle.padEnd(52) + ' keys ' + hyphItem.key.value
      + '  twin prints ' + JSON.stringify(twinRun.out));
  });

  fs.writeFileSync(out, JSON.stringify({
    board: 343,
    built_at: new Date().toISOString(),
    note: 'The twin code block per article. Every row was checked: running code_restore '
      + 'produces expected_output, which is the text of the option the article already keys.',
    articles: rows,
  }, null, 2));
  console.log('\n' + rows.length + ' articles -> ' + out);
  return rows;
}

module.exports = { main, oneBlock, BLOCK };
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (e) { console.error('\n  REFUSED: ' + e.message + '\n'); process.exit(1); }
}
