'use strict';
// -----------------------------------------------------------------------------
//  BOARD 343: RESTORE THE CODE BLOCK THAT BELONGS TO THE QUESTION.
//
//      node scripts/csa-qotd-u2c2-repair.js <bodies-dir> <out-dir>
//
//  19 unit-2-cycle-2-day-* articles post a program that is not the one their
//  question is about. A student cannot answer any of them correctly: day 10
//  sums 1 to 5 and prints 15, and its four options are 6, 9, 10 and 11.
//
//  ── WHY THE REPAIR IS THE CODE AND NOT THE OPTIONS ─────────────────────────
//  The obvious fix, and the one recommended before the evidence was in, is to
//  re-author the options to match the posted code. Measured across all 19 pairs
//  on 2026-09-18, that is the wrong half:
//
//      explanation byte-identical to the twin's   19 of 19
//      code different from the twin's             19 of 19
//      same set of options and same answer        19 of 19 (4 shuffled letters)
//
//  Day 10's Why This Answer says "the loop adds 1 + 2 + 3 + 4 = 10" and its
//  Common Mistake warns about `<= 4`, above a code block that reads `i <= 5`.
//  Day 13 explains a running `sum` in code that has no `sum` in it. So the stem,
//  the options, the key, the explanation, the Common Mistake and the AP Exam
//  Strategy are all one coherent question, and the code block is the one piece
//  that was swapped. Restoring it makes five sections right with one edit and
//  invents nothing; re-authoring would rewrite five sections per article to fit
//  a program nobody intended to be there.
//
//  ── WHAT THIS DOES NOT FIX ─────────────────────────────────────────────────
//  After the restore, each pair is the same question at two handles with the
//  answers shuffled. That duplication is NOT created here; the identical
//  explanations prove it predates the drift. It is the same shape as board 333
//  and stays a separate decision.
//
//  ── THE PROOF ──────────────────────────────────────────────────────────────
//  config/csa-u2c2-restore.json is refused at build time unless, for every row,
//  running the twin's code prints exactly the text of the option the article
//  already keys. After the edit, repairOne re-runs the repaired article and
//  requires exactly one option to match the output and that option to be the
//  keyed one. Nothing here is settled by reading an explanation.
//
//  No em-dashes, per repo convention. Zero PII: public page markup only.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const E = require('../lib/matrixify-body-edit.js');
const I = require('../lib/csa-qotd-items.js');
const D = require('./csa-qotd-key-rederive.js');

const BLOG = 'ap-csa-daily-practice';
const COLS = ['Blog: Handle', 'Handle', 'Command', 'Body HTML'];
const DATA = path.join(__dirname, '..', 'config', 'csa-u2c2-restore.json');

function load() {
  const d = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  if (!d.articles || !d.articles.length) throw new Error(DATA + ' carries no articles');
  return d.articles;
}

//  One edit: the question's code block, anchored on the whole element so a
//  second code block elsewhere in the body cannot be hit by accident.
function editFor(row) {
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const open = '<div class="apcs-code-block">\n<pre><code>';
  const close = '</code></pre>';
  return {
    id: 'code-block',
    authored: false,
    find: new RegExp(esc(open) + esc(row.code_now) + esc(close)),
    to: open + row.code_restore + close,
  };
}

function repairOne(live, row) {
  const edits = [editFor(row)];
  E.checkAuthored(row.handle, edits);
  const { out, captured } = E.applyEdits(row.handle, live, edits);
  if (E.reverse(out, captured) !== live) {
    throw new Error(row.handle + ': reversing the edit did not reproduce the live body, so something else changed');
  }

  const before = I.parse(row.handle, live);
  const after = I.parse(row.handle, out);

  //  Only the code may move. Everything else is the question and must be intact.
  if (before.key.value !== after.key.value) throw new Error(row.handle + ': the repair changed the answer key');
  if (before.options.map((o) => o.letter + o.text).join('|') !== after.options.map((o) => o.letter + o.text).join('|')) {
    throw new Error(row.handle + ': the repair changed the options');
  }
  if (after.key.value !== row.key) throw new Error(row.handle + ': key reads ' + after.key.value + ', expected ' + row.key);
  if (I.collapseLines(after.code.join('\n')) === I.collapseLines(before.code.join('\n'))) {
    throw new Error(row.handle + ': the code block did not actually change');
  }

  //  THE POINT: run the repaired article and require the keyed option to be the
  //  one and only option matching what the program prints.
  const run = D.audit(after);
  if (run.state !== 'agrees' && run.state !== 'agrees-flattened') {
    throw new Error(row.handle + ': the repaired article re-derives as ' + run.state
      + (run.out !== undefined ? ' (prints ' + JSON.stringify(run.out) + ')' : '') + ', not agreement');
  }
  if (run.letter !== row.key) throw new Error(row.handle + ': the repaired article agrees on ' + run.letter + ', not the keyed ' + row.key);
  if (I.collapseLines(run.out) !== I.collapseLines(row.expected_output)) {
    throw new Error(row.handle + ': prints ' + JSON.stringify(run.out) + ', the data says ' + JSON.stringify(row.expected_output));
  }
  return { out, before, after, run };
}

function main(argv) {
  const [bodiesDir, outDir] = argv;
  if (!bodiesDir || !outDir) {
    console.error('usage: node scripts/csa-qotd-u2c2-repair.js <bodies-dir> <out-dir>');
    process.exit(2);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const rows = load();
  const manifest = [];
  const bodies = new Map();

  rows.forEach((row) => {
    const src = path.join(bodiesDir, row.handle + '.html');
    if (!fs.existsSync(src)) throw new Error(row.handle + ': no live body at ' + src);
    const live = fs.readFileSync(src, 'utf8');
    const { out, run } = repairOne(live, row);
    bodies.set(row.handle, out);

    const name = 'csa-qotd-343-' + row.handle + '-blog-posts.csv';
    fs.writeFileSync(path.join(outDir, name), E.sheet(COLS, [{
      'Blog: Handle': BLOG, Handle: row.handle, Command: 'MERGE', 'Body HTML': out,
    }]), 'utf8');
    const back = E.parseCsv(fs.readFileSync(path.join(outDir, name), 'utf8'));
    if (back.length !== 2 || back[1][3] !== out) throw new Error(name + ': Body HTML did not survive the round trip');

    manifest.push({
      handle: row.handle, twin: row.twin, sheet: name, key: row.key,
      prints: run.out, keyed_option: row.keyed_option,
      code_was: row.code_now.replace(/\s+/g, ' ').trim().slice(0, 90),
      code_now: row.code_restore.replace(/\s+/g, ' ').trim().slice(0, 90),
      bytes_before: live.length, bytes_after: out.length,
    });
    console.log('  ' + row.handle.padEnd(52) + ' keys ' + row.key
      + '  now prints ' + JSON.stringify(run.out).padEnd(8) + ' = option ' + row.key);
  });

  const combined = 'csa-qotd-343-ALL-NINETEEN-blog-posts.csv';
  fs.writeFileSync(path.join(outDir, combined), E.sheet(COLS, rows.map((r) => ({
    'Blog: Handle': BLOG, Handle: r.handle, Command: 'MERGE', 'Body HTML': bodies.get(r.handle),
  }))), 'utf8');
  const singles = new Map(manifest.map((m) => [m.handle, E.parseCsv(fs.readFileSync(path.join(outDir, m.sheet), 'utf8'))[1][3]]));
  const n = E.checkCombined(fs.readFileSync(path.join(outDir, combined), 'utf8'), singles, COLS, { label: combined });
  console.log('\n  ' + combined + '  ' + n + ' rows, each byte-identical to its own sheet');

  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({ board: 343, blog: BLOG, built_at: new Date().toISOString(), combined_sheet: combined, articles: manifest }, null, 2));
  console.log('\n' + manifest.length + ' single-article sheets plus one combined sheet in ' + outDir);
  return manifest;
}

module.exports = { load, editFor, repairOne, main, COLS, BLOG, DATA };
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (e) { console.error('\n  REFUSED: ' + e.message + '\n'); process.exit(1); }
}
