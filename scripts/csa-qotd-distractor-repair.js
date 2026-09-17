'use strict';
// -----------------------------------------------------------------------------
//  BOARD 344: ONE WRONG KEY, THREE PAIRS OF IDENTICAL OPTIONS, ONE MISQUOTE.
//
//      node scripts/csa-qotd-distractor-repair.js <bodies-dir> <out-dir>
//
//  What the 2026-09-17 audit found outside the drifted unit-2-cycle-2 family.
//  Eight articles, and the interesting one is first.
//
//  ── ap-csa-u1-c2-day-16-casting-precision-loss ─────────────────────────────
//  The page keys $19.99. Java prints $19.98, because
//
//      19.99 * 100  ==  1998.9999999999998
//
//  and the cast truncates to 1998. Measured, not reasoned about.
//
//  What makes this one worth reading rather than just fixing is that the
//  explanation ALREADY KNEW and argued itself out of it:
//
//      "In some cases, floating-point imprecision could make 19.99 * 100
//       evaluate to 1998.9999..., which would cast to 1998 and produce $19.98.
//       This is a real-world concern but the AP exam typically assumes exact
//       arithmetic for simple cases like this."
//
//  Three things wrong with that, on a page called casting-precision-loss whose
//  section reference is "Casting and Ranges":
//
//    it is not "in some cases". 19.99 * 100 is 1998.9999999999998 every time,
//    on every JVM, because IEEE 754 is deterministic;
//
//    the stem asks what is printed "as a result of executing the code segment",
//    which is a question about what Java does, not about what is convenient;
//
//    AP CSA teaches double imprecision rather than assuming it away, so the
//    dismissal is also wrong about the exam.
//
//  So the key moves to (B) and the explanation is rewritten to make the
//  precision loss the answer instead of a footnote apologising for itself.
//
//  ── THE OTHER SEVEN ────────────────────────────────────────────────────────
//  Three questions, each published at two handles, carry two options with the
//  same text. A student who picks the unkeyed twin is marked wrong for an
//  answer that reads identically to the right one. Each replacement distractor
//  is AUTHORED, drawn from the misconception that article's own "Common
//  Mistake" box names and does not already have an option:
//
//    day 20  remove(1) removes index 1, giving [10, 30, 20]. The new (A) is
//            [10, 20, 30], which is what you get if you remove the trailing
//            duplicate instead of the element at index 1.
//    day 5   12 cells, 2 assigned, so 10 are still zero. The new (A) is 2,
//            which is counting the cells that were SET rather than the ones
//            that were not.
//    day 26  3 elements plus 3 appends is 6. The new (B) is 12, which is where
//            you land if you believe the loop re-reads the growing size.
//
//  and one misquote: day 13 keys correctly and its heading restates the answer
//  as "7 sum / sum 34" where the option reads "7 val / val 34", because the
//  variable was renamed in the option and not in the heading.
//
//  An anchor here MUST carry its radio value. The duplicate option text is the
//  defect, so an anchor written on the text alone matches both copies and
//  applyEdits refuses it, which is the guard working rather than a nuisance.
//
//  No em-dashes, per repo convention. Zero PII: public page markup only.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const E = require('../lib/matrixify-body-edit.js');
const I = require('../lib/csa-qotd-items.js');

const BLOG = 'ap-csa-daily-practice';
const COLS = ['Blog: Handle', 'Handle', 'Command', 'Body HTML'];

//  option(letter, from, to) builds an anchor that carries the radio value, so a
//  duplicate option text cannot make it ambiguous.
//  NO CAPTURE GROUPS. applyEdits splices the replacement LITERALLY rather than
//  running String.replace, so a "$1" in `to` lands on the page as the two
//  characters "$1". The first cut of this did exactly that and the option-count
//  guard in repairOne caught it: four options became three, because the
//  surrounding spans were eaten. The prefix and suffix are written out on both
//  sides instead.
function practiceOption(letter, from, to) {
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const prefix = 'value="' + letter + '">\n<span class="apcs-option-letter">' + letter
    + ')</span>\n<span class="apcs-option-content">';
  return {
    id: 'option-' + letter,
    authored: true,
    find: new RegExp(esc(prefix) + esc(from) + esc('</span>')),
    to: prefix + to + '</span>',
  };
}

const REPAIRS = [
  {
    handle: 'ap-csa-u1-c2-day-16-casting-precision-loss',
    why: 'Keys $19.99. Java prints $19.98 because 19.99 * 100 is 1998.9999999999998.',
    key: { from: 'A', to: 'B', pattern: /var correct = '([A-D])';/ },
    edits: [
      { id: 'key', find: /var correct = 'A';/, to: "var correct = 'B';" },

      { id: 'heading', find: /<h3>Answer: \(A\) \$19\.99<\/h3>/, to: '<h3>Answer: (B) $19.98</h3>' },

      { id: 'trace',
        find: /<p style="line-height: 1\.7;"><strong>price \* 100:<\/strong>[\s\S]*?the AP exam typically assumes exact arithmetic for simple cases like this\.<\/p>/,
        to: [
          '<p style="line-height: 1.7;"><strong>price * 100:</strong> <code>19.99 * 100</code> is <code>1998.9999999999998</code>, not <code>1999.0</code>. A <code>double</code> cannot hold 19.99 exactly, so the product lands just under 1999.</p>',
          '  <p style="line-height: 1.7;"><strong>cents:</strong> <code>(int)</code> truncates toward zero, so <code>(int) 1998.9999999999998</code> is <code>1998</code>. It does not round.</p>',
          '  <p style="line-height: 1.7;"><strong>dollars:</strong> <code>1998 / 100 = 19</code>.</p>',
          '  <p style="line-height: 1.7;"><strong>leftover:</strong> <code>1998 % 100 = 98</code>.</p>',
          '  <p style="line-height: 1.7;"><strong>Output:</strong> <code>"$" + 19 + "." + 98 = "$19.98"</code>. The program loses a cent, which is exactly what this topic is named for.</p>',
        ].join('\n') },

      { id: 'why-not',
        find: /<p style="line-height: 1\.7; margin-bottom: 8px;"><strong>\(B\)<\/strong> This could happen due to floating-point imprecision[\s\S]*?But <code>1999 \/ 100 = 19<\/code>\.<\/p>/,
        to: [
          '<p style="line-height: 1.7; margin-bottom: 8px;"><strong>(A)</strong> This is the answer you get by treating <code>19.99 * 100</code> as exactly <code>1999.0</code>. It is the most common answer and it is wrong: run it and the product is <code>1998.9999999999998</code>.</p>',
          '  <p style="line-height: 1.7; margin-bottom: 8px;"><strong>(C)</strong> This would need <code>cents % 100</code> to be 0, meaning a whole number of dollars. <code>1998 % 100</code> is 98.</p>',
          '  <p style="line-height: 1.7; margin-bottom: 8px;"><strong>(D)</strong> This would need <code>cents / 100</code> to be 20, so cents would have to reach 2000. It is 1998.</p>',
        ].join('\n') },

      { id: 'mistake',
        find: /<p style="line-height: 1\.6;">The division\/modulo pair extracts dollars and cents: <code>\/ 100<\/code> gives whole dollars, <code>% 100<\/code> gives remaining cents\. This is the same quotient\/remainder pattern used for time conversion, but applied to money\.<\/p>/,
        to: '<p style="line-height: 1.6;">Trusting a <code>double</code> to hold a decimal exactly. The quotient and remainder pattern here is right, and it is fed a number a hair under 1999. This is why money is counted in whole cents rather than in dollars and a fraction.</p>' },
    ],
  },

  {
    handle: 'ap-csa-u1-c1-day-13-string-concatenation-mixed',
    why: 'Keys correctly. The heading restates the answer with the old variable name.',
    key: { from: 'A', to: 'A', pattern: /var correct = '([A-D])';/ },
    edits: [
      { id: 'heading', find: /<h3>Answer: \(A\) 7 sum\nsum 34<\/h3>/, to: '<h3>Answer: (A) 7 val\nval 34</h3>' },
    ],
  },
];

//  The three duplicate-option questions, each published at two handles. Built
//  rather than typed twice: typing a repair out twice is how the two copies drift.
[
  { slug: 'day-20-arraylist-remove-with-wrapper', letter: 'A', from: '[10, 30, 20]', to: '[10, 20, 30]',
    why: 'Options A and D both read [10, 30, 20], and D is keyed.' },
  { slug: 'day-5-2d-array-initialization', letter: 'A', from: '10', to: '2',
    why: 'Options A and D both read 10, and D is keyed.' },
  { slug: 'day-26-arraylist-loop-adding', letter: 'B', from: '6', to: '12',
    why: 'Options B and D both read 6, and D is keyed.' },
].forEach((q) => {
  ['unit-4-cycle-2-' + q.slug, 'unit4cycle2-' + q.slug].forEach((handle, i) => {
    REPAIRS.push({
      handle: i === 0 ? handle : 'unit4cycle2-' + q.slug,
      why: q.why,
      key: { from: 'D', to: 'D', pattern: /var (?:correctAnswer|defined_answer) = '([A-E])';/ },
      edits: [practiceOption(q.letter, q.from, q.to)],
    });
  });
});

//  The un-hyphenated twin handles do not follow one rule, so they are named.
const TWIN = {
  'unit4cycle2-day-20-arraylist-remove-with-wrapper': 'unit4-cycle2-day-20-arraylist-remove-with-wrapper',
  'unit4cycle2-day-5-2d-array-initialization': 'unit4-cycle2-day-5-2d-array-initialization',
  'unit4cycle2-day-26-arraylist-loop-adding': 'unit4-cycle2-day-26-arraylist-loop-adding',
};
REPAIRS.forEach((r) => { if (TWIN[r.handle]) r.handle = TWIN[r.handle]; });

// ── every guard an article has to clear ──────────────────────────────────────
function repairOne(live, r) {
  E.checkAuthored(r.handle, r.edits);
  const { out, captured } = E.applyEdits(r.handle, live, r.edits);

  if (E.reverse(out, captured) !== live) {
    throw new Error(r.handle + ': reversing the declared edits did not reproduce the live body, so something else changed');
  }
  if (r.key) {
    const was = (live.match(r.key.pattern) || [])[1];
    const now = (out.match(r.key.pattern) || [])[1];
    if (was !== r.key.from) throw new Error(r.handle + ': live key reads ' + JSON.stringify(was) + ', expected ' + JSON.stringify(r.key.from));
    if (now !== r.key.to) throw new Error(r.handle + ': repaired key reads ' + JSON.stringify(now) + ', expected ' + JSON.stringify(r.key.to));
  }

  //  The point of the whole exercise: the repaired item must have exactly one
  //  option matching what the program prints, and it must be the keyed one.
  const before = I.parse(r.handle, live);
  const after = I.parse(r.handle, out);
  const texts = after.options.map((o) => o.text.trim());
  const dupes = texts.filter((t, i) => t && texts.indexOf(t) !== i);
  if (dupes.length) throw new Error(r.handle + ': the repaired item still has two options reading ' + JSON.stringify(dupes[0]));
  if (before.options.length !== after.options.length) {
    throw new Error(r.handle + ': the repair changed the number of options from ' + before.options.length + ' to ' + after.options.length);
  }
  return { out, captured, before, after };
}

function main(argv) {
  const [bodiesDir, outDir] = argv;
  if (!bodiesDir || !outDir) {
    console.error('usage: node scripts/csa-qotd-distractor-repair.js <bodies-dir> <out-dir>');
    process.exit(2);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const manifest = [];
  const bodies = new Map();

  REPAIRS.forEach((r) => {
    const src = path.join(bodiesDir, r.handle + '.html');
    if (!fs.existsSync(src)) throw new Error(r.handle + ': no live body at ' + src);
    const live = fs.readFileSync(src, 'utf8');
    const { out, after } = repairOne(live, r);
    bodies.set(r.handle, out);

    const name = 'csa-qotd-344-' + r.handle + '-blog-posts.csv';
    fs.writeFileSync(path.join(outDir, name), E.sheet(COLS, [{
      'Blog: Handle': BLOG, Handle: r.handle, Command: 'MERGE', 'Body HTML': out,
    }]), 'utf8');

    const rows = E.parseCsv(fs.readFileSync(path.join(outDir, name), 'utf8'));
    if (rows.length !== 2) throw new Error(name + ': parsed back as ' + rows.length + ' rows, expected 2');
    if (rows[1][3] !== out) throw new Error(name + ': Body HTML did not survive the round trip byte for byte');

    manifest.push({
      handle: r.handle, sheet: name, why: r.why,
      key_from: r.key.from, key_to: r.key.to,
      authored: r.edits.some((e) => e.authored),
      options_after: after.options.map((o) => o.letter + ') ' + o.text),
      bytes_before: live.length, bytes_after: out.length,
    });
    console.log('  ' + r.handle.padEnd(50) + String(live.length).padStart(6) + ' -> ' + String(out.length).padStart(6)
      + (r.key.from !== r.key.to ? '   KEY ' + r.key.from + ' -> ' + r.key.to : '')
      + (r.edits.some((e) => e.authored) ? '   AUTHORED' : ''));
  });

  const combinedName = 'csa-qotd-344-ALL-EIGHT-blog-posts.csv';
  fs.writeFileSync(path.join(outDir, combinedName), E.sheet(COLS, REPAIRS.map((r) => ({
    'Blog: Handle': BLOG, Handle: r.handle, Command: 'MERGE', 'Body HTML': bodies.get(r.handle),
  }))), 'utf8');
  const singles = new Map(manifest.map((m) => [m.handle, E.parseCsv(fs.readFileSync(path.join(outDir, m.sheet), 'utf8'))[1][3]]));
  const n = E.checkCombined(fs.readFileSync(path.join(outDir, combinedName), 'utf8'), singles, COLS, { label: combinedName });
  console.log('\n  ' + combinedName + '  ' + n + ' rows, each byte-identical to its own sheet');

  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({ blog: BLOG, built_at: new Date().toISOString(), combined_sheet: combinedName, articles: manifest }, null, 2));
  console.log('\n' + manifest.length + ' single-article sheets plus one combined sheet in ' + outDir);
  return manifest;
}

module.exports = { REPAIRS, repairOne, main, COLS, BLOG };
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (e) { console.error('\n  REFUSED: ' + e.message + '\n'); process.exit(1); }
}
