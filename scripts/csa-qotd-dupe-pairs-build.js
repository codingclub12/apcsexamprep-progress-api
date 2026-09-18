'use strict';
// -----------------------------------------------------------------------------
//  BOARD 333: BUILD THE CANONICAL LIST OF DUPLICATE QOTD PAIRS.
//
//      node scripts/csa-qotd-dupe-pairs-build.js <bodies-dir> [--check]
//
//  429 articles live in ap-csa-daily-practice. 84 of them are the SAME question
//  published at two handles, and each page canonicalizes to ITSELF, so both are
//  independently indexable with identical content.
//
//  ── THE TWO SETS, AND WHICH ONE IS WHICH ───────────────────────────────────
//  Measured from the blog's own published_at, not inferred from the handles:
//
//      unit-N-cycle-N-day-*   112 articles, ALL published 2026-02-06, inside 69
//                             seconds of each other. A bulk import. Titles read
//                             "AP CSA Unit 4 Day 28: Arraylist Equality".
//      unitNcycleN-day-*       84 articles, 2026-05-13 to 2026-08-04, one per
//                             day at 01:00. The daily series as it actually ran.
//                             Titles read "Unit 4 Cycle 2 Day 28: ArrayList
//                             Equality", with ArrayList cased correctly.
//
//  Compact is later in 84 of 84 pairs. There is no ambiguity to resolve.
//
//  ── WHY THE COMPACT SIDE IS THE ONE TO KEEP ────────────────────────────────
//  Board 343 is the evidence rather than the titles. 19 hyphenated articles were
//  serving a code block their question was not about, and the repair took the
//  code from the compact twin, which was right in all 19. The drift is in the
//  February set, in the direction that says which half has been maintained.
//
//  ── WHAT THIS REFUSES, AND WHY EACH REFUSAL EXISTS ─────────────────────────
//  A pair only lands as `redirect` when the two are genuinely the same question.
//  12 pairs share a stem and an option SET but carry DIFFERENT code, and 9 of
//  those 12 have both members re-deriving correctly: they are two working
//  variants, not a duplicate, and redirecting one away would destroy a distinct
//  item. They land as `review` and stay out of the sheet.
//
//  Unit 1 cycle 2 has 28 articles in the hyphenated set and NO compact twin at
//  all, so "retire the February set" would delete them. Nothing here may touch
//  a handle that has no twin.
//
//  No em-dashes, per repo convention. Zero PII: public page markup only.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const I = require('../lib/csa-qotd-items.js');

const OUT = path.join(__dirname, '..', 'config', 'csa-qotd-duplicate-pairs.json');
const HYPH = /^unit-([0-9])-cycle-([0-9])-day-/;
const COMPACT = /^unit([0-9])-cycle([0-9])-day-/;

//  Collapse the two handle shapes onto one key so twins meet. Deliberately
//  narrow: it only removes the hyphens INSIDE the unit/cycle prefix and leaves
//  the slug alone, so two different questions cannot be merged by it.
function pairKey(h) {
  return h.replace(/^unit-?([0-9])-?cycle-?([0-9])-?/, 'u$1c$2-');
}

function flat(s) {
  return I.collapseLines(String(s == null ? '' : s)).replace(/\s+/g, ' ').trim().toLowerCase();
}

//  Same question or not. The distinction that matters is code: a pair sharing a
//  stem and an option set but differing in code is two variants of one prompt,
//  and each may be perfectly correct on its own.
function classify(a, b, rawA, rawB) {
  if (rawA === rawB) return { verdict: 'redirect', why: 'byte-identical bodies' };

  const stem = flat(a.stem) === flat(b.stem);
  const code = flat(a.code.join('\n')) === flat(b.code.join('\n'));
  const oa = a.options.map((o) => flat(o.text));
  const ob = b.options.map((o) => flat(o.text));
  const sameSet = [...oa].sort().join('|') === [...ob].sort().join('|');
  const sameOrder = oa.join('|') === ob.join('|');

  if (!stem) return { verdict: 'review', why: 'different stems, so this is not one question at two handles' };
  if (!sameSet) return { verdict: 'review', why: 'different option sets' };
  if (!code) {
    return { verdict: 'review',
      why: 'same stem and options but DIFFERENT code, so these are two working variants rather than a duplicate' };
  }
  return { verdict: 'redirect',
    why: sameOrder ? 'same question, cosmetic differences only' : 'same question, options in a different order' };
}

function build(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.html'));
  const bodies = new Map();
  files.forEach((f) => bodies.set(f.replace(/\.html$/, ''), fs.readFileSync(path.join(dir, f), 'utf8')));

  const groups = new Map();
  for (const h of bodies.keys()) {
    const k = pairKey(h);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(h);
  }

  const pairs = [];
  const seen = new Set();
  for (const [k, hs] of [...groups].sort()) {
    if (hs.length === 1) continue;
    if (hs.length !== 2) throw new Error(k + ': expected two handles, found ' + hs.length + ' (' + hs.join(', ') + ')');
    const compact = hs.find((h) => COMPACT.test(h));
    const hyph = hs.find((h) => HYPH.test(h));
    if (!compact || !hyph) throw new Error(k + ': expected one handle of each shape, got ' + hs.join(', '));
    //  A handle in two pairs would mean pairKey is merging things it should not.
    for (const h of hs) {
      if (seen.has(h)) throw new Error(h + ' appears in more than one pair, so the pair key is too loose');
      seen.add(h);
    }
    if (HYPH.exec(hyph)[1] === '1') throw new Error(hyph + ': unit 1 has no compact twin, so it must never be paired');

    const a = I.parse(compact, bodies.get(compact));
    const b = I.parse(hyph, bodies.get(hyph));
    const c = classify(a, b, bodies.get(compact), bodies.get(hyph));
    pairs.push({
      key: k,
      keep: compact,
      retire: hyph,
      verdict: c.verdict,
      why: c.why,
      keep_key: a.key.value,
      retire_key: b.key.value,
    });
  }
  return pairs;
}

module.exports = { build, pairKey, classify, HYPH, COMPACT };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const check = argv.includes('--check');
  const dir = argv.find((x) => !x.startsWith('--'));
  if (!dir) { console.error('usage: csa-qotd-dupe-pairs-build.js <bodies-dir> [--check]'); process.exit(2); }

  const pairs = build(dir);
  const counts = pairs.reduce((m, p) => { m[p.verdict] = (m[p.verdict] || 0) + 1; return m; }, {});
  const doc = {
    generated: new Date().toISOString().slice(0, 10),
    blog: 'ap-csa-daily-practice',
    note: 'keep is the compact daily-series handle; retire is the 2026-02-06 bulk-import twin. '
      + 'Only verdict=redirect rows may enter a redirect sheet.',
    counts,
    pairs,
  };
  const text = JSON.stringify(doc, null, 1) + '\n';

  if (check) {
    const on = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    const strip = (s) => s.replace(/"generated": "[^"]*"/, '"generated": "X"');
    if (strip(on) !== strip(text)) {
      console.error('config/csa-qotd-duplicate-pairs.json does not match a rebuild from ' + dir);
      process.exit(1);
    }
    console.log('config/csa-qotd-duplicate-pairs.json matches a rebuild.');
    process.exit(0);
  }

  fs.writeFileSync(OUT, text);
  console.log('  ' + pairs.length + ' pairs written to config/csa-qotd-duplicate-pairs.json');
  Object.entries(counts).sort().forEach(([k, v]) => console.log('    ' + k.padEnd(10) + v));
}
