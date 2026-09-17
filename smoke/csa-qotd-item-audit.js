'use strict';
/*
 *  THE ITEM AUDIT, AND THE MEASUREMENT OF HOW MUCH IT IS WORTH.
 *
 *  Board 332 asked for every answer key in ap-csa-daily-practice to be checked
 *  against what the code actually does. Two tools do that:
 *
 *      lib/csa-qotd-items.js + scripts/csa-qotd-item-audit.js
 *          where an item contradicts ITSELF. Exact, cheap, and not enough.
 *      scripts/csa-qotd-key-rederive.js
 *          compile the snippet, run it, compare the output to the options.
 *
 *  THE ASSERTION THAT MATTERS MOST in this file is the one that pins how weak
 *  the cheap checks are: against the nine bodies known to have been broken on
 *  2026-09-15 they catch exactly TWO. Day 22 keyed (A), its heading said (A),
 *  and its Why Not block argued against (C). Perfectly self-consistent, and the
 *  answer was (C). If somebody later makes the cheap checks look sufficient,
 *  that number moves and this suite goes red, which is the only defence against
 *  a clean report being mistaken for a correct question bank.
 *
 *  THE REGRESSION CASE is unit-2-cycle-2-day-2-selection-if-else-if, where the
 *  four options are the literal strings "A", "Nothing", "C", "B" because the
 *  question is which letter the program prints. The first parser stripped a
 *  leading "A)" off every option to drop the letter the qotd template prints
 *  inline, deleted the answer, and reported an empty option and a duplicate pair
 *  on a page where neither is true. A false accusation sends somebody to rewrite
 *  a correct item, so that page is pinned here.
 *
 *  No JDK is a FAILURE here, not a skip. CI pins one.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const I = require('../lib/csa-qotd-items.js');
const A = require('../scripts/csa-qotd-item-audit.js');
const R = require('../scripts/csa-qotd-key-rederive.js');

const AUDIT_FIX = path.join(__dirname, 'fixtures', 'csa-qotd-audit-2026-09-17');
const BROKEN_FIX = path.join(__dirname, 'fixtures', 'csa-qotd-authoring-2026-09-15');
const load = (dir, h) => I.parse(h, fs.readFileSync(path.join(dir, h + '.html'), 'utf8'));

let failed = 0;
const bad = (m) => { console.log('  FAIL  ' + m); failed++; };
const eq = (got, want, what) => { if (got !== want) bad(what + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); };

// ── 1. the parser reads what it claims ───────────────────────────────────────
{
  const it = load(AUDIT_FIX, 'ap-csa-u1-c2-day-16-casting-precision-loss');
  eq(it.ok, true, 'casting item parses');
  eq(it.options.length, 4, 'casting item option count');
  eq(it.options.map((o) => o.letter).join(''), 'ABCD', 'casting item option letters');
  eq(it.key.value, 'A', 'casting item key');
  eq(it.answerHeading && it.answerHeading.letter, 'A', 'casting item heading letter');
  if (!/price \* 100/.test(it.code.join(''))) bad('casting item code block did not come through');
}

// ── 2. THE REGRESSION: options that ARE letters must survive ─────────────────
{
  const it = load(AUDIT_FIX, 'unit-2-cycle-2-day-2-selection-if-else-if');
  const texts = it.options.map((o) => o.text);
  eq(texts.join('|'), 'A|Nothing|C|B', 'options whose text is a bare letter survive the parse');
  if (texts.some((t) => !t.trim())) bad('an option was emptied by the parser, which is the 2026-09-17 bug');
  eq(A.auditItem(it).length, 0, 'the letter-options page reports no contradiction');
}

// ── 3. each contradiction check fires on its own case and only its own ───────
//  Synthetic items, one per check, built from the shape the real pages use.
function synth(over) {
  return Object.assign({
    handle: 'synthetic', template: 'qotd', ok: true, errors: [],
    key: { name: 'correct', value: 'B' },
    options: [{ letter: 'A', text: 'one' }, { letter: 'B', text: 'two' }, { letter: 'C', text: 'three' }],
    answerHeading: { letter: 'B', text: 'two' },
    whyNot: ['A', 'C'], stem: 'What is printed?', code: [], body: '',
  }, over);
}
const CASES = {
  //  answerHeading dropped so this case isolates its own rule: a non-letter key
  //  legitimately trips heading-vs-grader too, and a case that trips two rules
  //  cannot tell you which one is doing the work.
  'key-not-a-letter': synth({ key: { name: 'correctAnswer', value: '[1, 2]' }, answerHeading: null }),
  'key-names-no-option': synth({ key: { name: 'correct', value: 'E' }, answerHeading: null }),
  'heading-vs-grader': synth({ answerHeading: { letter: 'C', text: 'three' } }),
  'heading-text-vs-option': synth({ answerHeading: { letter: 'B', text: 'something else entirely' } }),
  'why-not-argues-against-key': synth({ whyNot: ['A', 'B', 'C'] }),
  'duplicate-options': synth({ options: [{ letter: 'A', text: 'same' }, { letter: 'B', text: 'same' }], answerHeading: null }),
  'empty-option': synth({ options: [{ letter: 'A', text: '' }, { letter: 'B', text: 'two' }] }),
};
eq(Object.keys(CASES).length, A.CHECKS.length, 'every check has a case in this suite');
A.CHECKS.forEach((c) => {
  const item = CASES[c.id];
  if (!item) { bad('check ' + c.id + ' has no case'); return; }
  const got = A.auditItem(item).map((x) => x.id);
  if (!got.includes(c.id)) bad('check ' + c.id + ' did not fire on its own case');
  //  MUTATION: with this one check removed, its own case must go quiet.
  const others = A.CHECKS.filter((x) => x.id !== c.id).map((x) => x.run(item)).filter(Boolean);
  if (others.length) bad('mutation: with ' + c.id + ' disabled its case still trips another check, so ' + c.id + ' is not the rule doing the work');
});
//  and a healthy item trips nothing
eq(A.auditItem(synth({})).length, 0, 'a healthy item reports no contradiction');

// ── 4. THE HONESTY PIN ───────────────────────────────────────────────────────
//  The cheap checks against the nine known-broken bodies. Two. Not nine.
{
  const handles = fs.readdirSync(BROKEN_FIX).map((f) => f.replace(/\.html$/, ''));
  eq(handles.length, 9, 'the known-broken fixture set is still nine bodies');
  const caught = handles.filter((h) => A.auditItem(load(BROKEN_FIX, h)).length > 0);
  if (caught.length !== 2) {
    bad('the in-page checks now catch ' + caught.length + ' of the 9 known-broken bodies, not 2. '
      + 'If that is an improvement, update this number and the comments that quote it. '
      + 'If it is a regression, the checks stopped working. Either way it is not a detail.');
  }
  //  and day 22, the one that started all of this, must still be invisible to them
  const d22 = A.auditItem(load(BROKEN_FIX, 'ap-csa-u1-c1-day-22-math-random-range'));
  if (d22.length) bad('day 22 pre-repair now trips an in-page check, so the claim that a wrong key can be self-consistent needs re-measuring');
}

// ── 5. the re-derivation, on a real JDK ──────────────────────────────────────
if (spawnSync('javac', ['-version'], { encoding: 'utf8' }).error) {
  bad('no javac on PATH. This audit re-derives answers by running them and CI pins a JDK. It does not skip.');
} else {
  //  agrees on an item that is right
  const good = R.audit(load(AUDIT_FIX, 'ap-csa-u1-c1-day-1-declaring-variables'));
  eq(good.state, 'agrees', 'a correct item re-derives as agreeing');

  //  finds the mis-key the sweep for leaked prose could never have found
  const cast = R.audit(load(AUDIT_FIX, 'ap-csa-u1-c2-day-16-casting-precision-loss'));
  eq(cast.state, 'mismatch', 'the casting item re-derives as a mismatch');
  eq(cast.out, '$19.98', 'the casting item actually prints $19.98');
  eq(cast.should_be, 'B', 'the casting item answer is option B');
  eq(cast.keys, 'A', 'the casting item keys A');

  //  the family whose code no longer belongs to its options
  const drift = R.audit(load(AUDIT_FIX, 'unit-2-cycle-2-day-10-iteration-accumulation'));
  eq(drift.state, 'no-match', 'the drifted item re-derives as no-match');
  eq(drift.out, '15', 'the drifted item prints 15');
  const twin = R.audit(load(AUDIT_FIX, 'unit2-cycle2-day-10-iteration-accumulation'));
  eq(twin.state, 'agrees', 'its un-hyphenated twin is intact');

  //  two options both matching is reported as ambiguous, never as a mismatch
  const dup = R.audit(load(AUDIT_FIX, 'unit-4-cycle-2-day-20-arraylist-remove-with-wrapper'));
  eq(dup.state, 'ambiguous', 'an item with two identical options re-derives as ambiguous');

  //  and the two shapes that must NOT be judged
  eq(R.audit(load(AUDIT_FIX, 'ap-csa-u3-c1-day-10-this-keyword')).state, 'not-runnable',
    'a class with no driver is not runnable rather than a finding');
  eq(R.audit(synth({ stem: 'Which statement about inheritance is true?', code: ['int x = 1;'] })).state, 'not-applicable',
    'a conceptual stem is not applicable rather than a finding');

  //  MUTATION: a mismatch must not be reported when the key already agrees.
  const agreeing = load(AUDIT_FIX, 'ap-csa-u1-c1-day-1-declaring-variables');
  const flipped = Object.assign({}, agreeing, { key: { name: 'correct', value: 'A' } });
  const after = R.audit(flipped);
  if (after.state === 'agrees' && agreeing.key.value !== 'A') {
    bad('mutation: changing the key to a wrong letter still reported agrees, so the comparison is hollow');
  }
}

console.log(failed === 0
  ? '\ncsa-qotd-item-audit: ' + A.CHECKS.length + ' contradiction checks with per-check mutation, '
    + 'the letter-options regression pinned, the 2-of-9 limit pinned, and the re-derivation '
    + 'checked against a correct item, a mis-key, a drifted item, its intact twin and two '
    + 'shapes it must refuse to judge. All pass.'
  : '\ncsa-qotd-item-audit: ' + failed + ' failure(s).');
process.exit(failed ? 1 : 0);
