'use strict';
// -----------------------------------------------------------------------------
//  WHERE AN AP CSA DAILY-PRACTICE ITEM CONTRADICTS ITSELF.
//
//      node scripts/csa-qotd-item-audit.js <bodies-dir> [--json out.json]
//
//  Board 332. These checks need no Java and cannot be wrong about whether the
//  page is broken, only about which half of it is:
//
//      the grader keys a letter that is not one of the options
//      the grader keys something that is not a letter at all
//      the explanation's own heading names a different letter than the grader
//      that heading restates an answer that is not the keyed option's text
//      the Why Not block argues against the answer the page keys
//      two options carry the same text, so one of them is right too
//
//  ── THE MEASUREMENT THAT SAYS HOW MUCH THIS IS WORTH ───────────────────────
//  Run against the nine bodies known to have been broken on 2026-09-15, these
//  checks catch TWO. Day 22 keyed (A), its heading said "Answer: (A) I only",
//  and its Why Not block explained why (C) was wrong. Nothing here contradicts
//  anything. The answer was (C).
//
//  So this is a FLOOR and not a ceiling, and saying so is the point: a clean run
//  here means the bank does not disagree with itself, which is a much smaller
//  claim than the bank being right. scripts/csa-qotd-key-rederive.js is the
//  check that settles the second one, by running the question.
//
//  ── THE FALSE ACCUSATION THIS ALREADY MADE ─────────────────────────────────
//  The first cut reported 30 empty options and 24 duplicate pairs. Almost all of
//  it was this file's own fault: it stripped a leading "A)" off every option to
//  drop the letter the qotd template prints inline, and on the selection items
//  the options ARE the letters, because the question is which letter the program
//  prints. Option "A" became empty; two emptied options became a duplicate pair.
//  After anchoring the read per template in lib/csa-qotd-items.js: 0 empty and 7
//  duplicates, and the 7 are real. Verified by hand against the stored markup.
//
//  That is why every count here was checked against the page before it was
//  believed, and why this comment exists rather than a cleaner-looking number.
//
//  No em-dashes, per repo convention. Zero PII: public page markup only.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const I = require('../lib/csa-qotd-items.js');

//  Each check returns null or a finding. Kept separate and named so the suite
//  can mutation test them one at a time rather than in aggregate.
const CHECKS = [
  {
    id: 'key-not-a-letter',
    why: 'the grader compares a radio value, which is always a letter, against something else, so no answer can ever be right',
    run: (it) => (/^[A-E]$/.test(it.key.value) ? null
      : it.key.name + ' = ' + JSON.stringify(it.key.value)),
  },
  {
    id: 'key-names-no-option',
    why: 'the keyed letter is not on the page, so no answer can ever be right',
    run: (it) => {
      if (!/^[A-E]$/.test(it.key.value)) return null;
      const letters = it.options.map((o) => o.letter);
      return letters.includes(it.key.value) ? null
        : 'keys ' + it.key.value + ' but the options are ' + letters.join(', ');
    },
  },
  {
    id: 'heading-vs-grader',
    why: 'the explanation names one answer and the grader marks another, so the page disagrees with itself',
    run: (it) => (it.answerHeading && it.answerHeading.letter !== it.key.value
      ? 'heading says (' + it.answerHeading.letter + '), grader keys ' + it.key.value : null),
  },
  {
    id: 'heading-text-vs-option',
    why: 'the explanation restates the answer as something the keyed option does not say',
    run: (it) => {
      if (!it.answerHeading || it.answerHeading.letter !== it.key.value) return null;
      const keyed = it.options.find((o) => o.letter === it.key.value);
      if (!keyed) return null;
      const a = I.norm(it.answerHeading.text);
      const b = I.norm(keyed.text);
      if (!a || !b || a === b || a.startsWith(b) || b.startsWith(a)) return null;
      return 'heading ' + JSON.stringify(it.answerHeading.text.slice(0, 70))
        + ' vs option ' + it.key.value + ' ' + JSON.stringify(keyed.text.slice(0, 70));
    },
  },
  {
    id: 'why-not-argues-against-key',
    why: 'the explanation explains why the keyed answer is wrong, which is how day 22 read',
    run: (it) => (it.whyNot && it.whyNot.includes(it.key.value)
      ? 'keys ' + it.key.value + ' and the Why Not block covers ' + it.whyNot.join(', ') : null),
  },
  {
    id: 'duplicate-options',
    why: 'two options say the same thing, so a student picking the unkeyed twin is marked wrong for the right answer',
    run: (it) => {
      const seen = new Map();
      const dups = [];
      it.options.forEach((o) => {
        const t = o.text.trim();
        if (!t) return;
        if (seen.has(t)) dups.push(seen.get(t) + ' and ' + o.letter + ' both read ' + JSON.stringify(t.slice(0, 50)));
        else seen.set(t, o.letter);
      });
      return dups.length ? dups.join('; ') : null;
    },
  },
  {
    id: 'empty-option',
    why: 'an option with no text cannot be chosen meaningfully',
    run: (it) => {
      const empty = it.options.filter((o) => !o.text.trim()).map((o) => o.letter);
      return empty.length ? 'options ' + empty.join(', ') + ' have no text' : null;
    },
  },
];

function auditItem(item) {
  const found = [];
  if (!item.ok) found.push({ id: 'unparseable', detail: item.errors.join('; ') });
  if (item.key) CHECKS.forEach((c) => { const d = c.run(item); if (d) found.push({ id: c.id, detail: d }); });
  return found;
}

function main(argv) {
  const dir = argv[0];
  if (!dir) { console.error('usage: node scripts/csa-qotd-item-audit.js <bodies-dir> [--json out]'); process.exit(2); }
  const jsonOut = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.html'));
  const rows = [];
  files.forEach((f) => {
    const handle = f.replace(/\.html$/, '');
    const item = I.parse(handle, fs.readFileSync(path.join(dir, f), 'utf8'));
    const found = auditItem(item);
    if (found.length) rows.push({ handle, found });
  });

  const byCheck = new Map();
  rows.forEach((r) => r.found.forEach((x) => {
    if (!byCheck.has(x.id)) byCheck.set(x.id, []);
    byCheck.get(x.id).push({ handle: r.handle, detail: x.detail });
  }));

  console.log('\nread ' + files.length + ' items. ' + rows.length + ' contradict themselves somewhere.\n');
  CHECKS.concat([{ id: 'unparseable', why: 'this audit could not read the page, which is a finding and not a skip' }])
    .forEach((c) => {
      const hits = byCheck.get(c.id) || [];
      console.log('  ' + (hits.length ? String(hits.length).padStart(3) : '  .') + '  ' + c.id);
      hits.forEach((h) => console.log('        ' + h.handle + '\n            ' + h.detail));
    });

  console.log('\nThese checks are a floor. Measured against the nine bodies known broken on');
  console.log('2026-09-15 they catch two: a page can be perfectly consistent and still key');
  console.log('the wrong answer. scripts/csa-qotd-key-rederive.js is what settles that.');

  if (jsonOut) {
    fs.writeFileSync(jsonOut, JSON.stringify({ as_of: new Date().toISOString(), scanned: files.length, rows }, null, 2));
    console.log('\nwrote ' + jsonOut);
  }
  return rows;
}

module.exports = { CHECKS, auditItem, main };
if (require.main === module) main(process.argv.slice(2));
