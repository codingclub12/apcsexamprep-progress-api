'use strict';
// -----------------------------------------------------------------------------
//  THE APPLIED CHALLENGE SHEETS, AND EACH REFUSAL BROKEN ON PURPOSE.
//
//  Three things are checked here and they are different kinds of claim.
//
//    1  the ROOT CAUSE is gone. appliedCard() in scripts/csp-lesson-exercise-links.js
//       read `applied.questions.length` against a Number, so it emitted
//       "undefined questions" and would do it again on the next run. Sheets
//       alone would have repaired 17 pages and left the generator broken.
//    2  the REFUSALS fire, each for its own reason, on a body mutated in
//       memory. A suite that goes red for a different rule is telling you the
//       rule you meant to test is hollow.
//    3  the SHEETS on disk are what was described: MERGE, BOM, QUOTE_ALL, CRLF,
//       three columns, 17 unique handles, no overlap with the Big Idea 3 sheet,
//       and every body carrying the repaired card and not the broken one.
//
//  Nothing here touches the network and nothing here writes sabotage into the
//  tree, which is why it is deliberately not named *-mutation.js.
//
//  Run: npm run smoke:cspappliedundefined
//  No em-dashes, per repo convention.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { BROKEN, fixed } = require('../scripts/build-bi3-undefined-sheet');
const {
  patchBody, inverseOf, nonAsciiAdded, bi3Handles, HEADER, ANCHOR,
} = require('../scripts/build-csp-applied-undefined-sheets');
const { BY_BIG_IDEA, LESSONS } = require('../scripts/verify-csp-applied-undefined-live');
const { CARD, readCount } = require('../scripts/verify-csp-bi3-undefined-live');
const lessonLinks = require('../scripts/csp-lesson-exercise-links');
const { allPages: coursePages } = require('../lib/csp-course-pages');

const IMPORTS = path.join(__dirname, '..', 'imports', '2026-09-22');

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) { pass++; console.log('  [PASS] ' + label); }
  else {
    fail++;
    console.log('  [FAIL] ' + label
      + (extra !== undefined ? '\n           ' + JSON.stringify(extra).slice(0, 300) : ''));
  }
}
//  A mutation must be refused FOR THE STATED REASON. `problems.length > 0`
//  would pass on the wrong rule firing, which is how a guard reads as proving
//  something it never touched.
function refusedBecause(label, args, needle) {
  const { problems, row } = patchBody.apply(null, args);
  const hit = !row && problems.some((p) => p.includes(needle));
  ok(label, hit, hit ? undefined : { needle, problems: problems.slice(0, 3) });
}

//  A body shaped like the live ones: prose, the managed exercise block with its
//  two handout cards and the broken Applied Challenge card, and a trailing
//  script. Built from BROKEN so it cannot drift from what ships.
function synth(handle, extra) {
  return '<!--\n  PAGE: /pages/' + handle + '\n-->\n<div class="lesson-page">\n'
    + '<p>Some prose about the topic, with a bullet • carried over from the live body.</p>\n'
    + '<!-- apcs-exercises (managed) -->\n<div id="apcs-ex-links">\n<div class="ex-row">\n'
    + '<a class="ex" href="/pages/ex-1">Exercise 1: Something<span>Work it online.</span></a>\n'
    + '<a class="ex" href="/pages/ex-2">Exercise 2: Something else<span>Work it online.</span></a>\n'
    + '<a class="ex wide" href="/pages/' + handle + '-exercise-2">' + BROKEN + '</a>\n'
    + '</div>\n</div>\n' + (extra || '') + '</div>\n';
}

const H = 'ap-csp-course-bi4-fault-tolerance';
const TARGET = '/pages/' + H + '-exercise-2';

// -- 1. THE ROOT CAUSE -------------------------------------------------------
console.log('\n  1. The generator no longer emits the word\n');
{
  const applied = coursePages().filter((p) => p.kind === 'exercise-2');
  ok('lib/csp-course-pages gives questions as a NUMBER, not an array',
    applied.length === 35 && applied.every((p) => Number.isInteger(p.questions)),
    applied.slice(0, 2).map((p) => typeof p.questions));

  const cards = applied.map((p) => lessonLinks.appliedCard(p));
  ok('no card on any of the 35 topics says "undefined"',
    cards.every((c) => !/undefined/.test(c)), cards.find((c) => /undefined/.test(c)));
  ok('every card states a positive integer count',
    cards.every((c) => /<span>[1-9]\d* questions, /.test(c)), cards[0]);

  //  THE MUTATION FOR RULE 1, and it has to be this shape. The bug was that a
  //  Number has no .length, so the guard that matters is "refuse anything that
  //  is not a positive integer" rather than "the string looks right".
  let threw = null;
  try { lessonLinks.appliedCard({ handle: 'x', questions: [1, 2, 3] }); }
  catch (e) { threw = e.message; }
  ok('an array where the count should be is refused, not printed',
    threw && threw.includes('questions is'), threw);

  threw = null;
  try { lessonLinks.appliedCard({ handle: 'x', questions: undefined }); }
  catch (e) { threw = e.message; }
  ok('and so is undefined, which is the value that shipped',
    threw && threw.includes('questions is'), threw);

  //  The card the old code produced is exactly the string the sheets replace.
  //  Asserting that ties the two halves of this pass together: if either the
  //  generator's wording or BROKEN drifts, this goes red rather than the sheet
  //  quietly ceasing to match any live page.
  const oldWay = '<a class="ex wide" href="/pages/' + H + '-exercise-2">Applied Challenge'
    + '<span>' + undefined + ' questions, and every answer is recorded for your teacher</span></a>';
  ok('the string the old code emitted is the string the sheets look for',
    oldWay.includes(BROKEN), oldWay);
}

// -- 2. THE HAPPY PATH -------------------------------------------------------
console.log('\n  2. A faithful body patches clean\n');
{
  const src = synth(H);
  const { problems, row } = patchBody(H, src, TARGET, 6, new Set());
  ok('no problems', problems.length === 0, problems);
  ok('a row came back', !!row);
  ok('the card now states 6', row.after.includes(fixed(6)), row.after.slice(0, 80));
  ok('nothing says "undefined questions" any more', !row.after.includes('undefined questions'));
  ok('the body changed by exactly the length difference',
    row.after.length - src.length === fixed(6).length - BROKEN.length);
  ok('and reverses to the live body byte for byte', inverseOf(row.after, 6) === src);
  ok('the bullet that was already there is still there', row.after.includes('•'));
  ok('nothing non-ASCII was added', nonAsciiAdded(src, row.after).length === 0);

  //  The verifier and the generator must agree about what a fixed card is, or
  //  the post-import check reads a correct page as broken.
  const m = row.after.match(CARD);
  ok('the verifier can still find the card after the patch', !!m, row.after.slice(-300));
  const c = readCount(m[2]);
  ok('and reads it as the number 6', c.kind === 'number' && c.stated === 6, c);
  ok('the anchor regex the builder uses still matches', ANCHOR.test(row.after));
}

// -- 3. EVERY REFUSAL, BROKEN INDEPENDENTLY ----------------------------------
console.log('\n  3. Each refusal fires for its own reason\n');
{
  //  The card is missing entirely: a page that was never carded, or one whose
  //  block was rewritten. Zero replacements would write the live body back
  //  unchanged as a MERGE, which is a pointless rewrite of a live page.
  refusedBecause('a body with no broken card is refused for that reason',
    [H, synth(H).replace(BROKEN, 'Applied Challenge<span>6 questions</span>'), TARGET, 6, new Set()],
    'appears 0 time(s)');

  //  Two cards: phishing-net carried two copies of one escaper on 2026-09-21
  //  and a replacement anchored on one of them reported everything green while
  //  leaving the other broken. Same shape, so the same refusal.
  const twice = synth(H) + '\n<div class="ex-row">\n<a class="ex wide" href="' + TARGET + '">'
    + BROKEN + '</a>\n</div>';
  refusedBecause('a body carrying the card twice is refused for that reason',
    [H, twice, TARGET, 6, new Set()], 'appears 2 time(s)');

  //  A handle already in the Big Idea 3 sheet. One page in two sheets is the
  //  failure mode splitting exists to remove, and nothing announces it.
  refusedBecause('a handle reserved by the Big Idea 3 sheet is refused',
    [H, synth(H), TARGET, 6, new Set([H])], 'already in the Big Idea 3 sheet');

  //  Zero is not a count. A target serving no graded items means the number is
  //  unknown, and "0 questions" on a card is a worse lie than "undefined".
  //
  //  THIS ASSERTION FAILED ON ITS FIRST RUN and the rule was wrong, not the
  //  test: patchBody happily built "0 questions, and every answer is recorded
  //  for your teacher", because the only zero check lived beside the fetch in
  //  the network half where nothing offline could reach it. The refusal moved
  //  into the pure half. A guard that cannot be broken on purpose is a guard
  //  nobody has checked.
  refusedBecause('a count of zero is refused rather than printed',
    [H, synth(H), TARGET, 0, new Set()], 'no number to state');
  refusedBecause('and so is a count that is not a number at all',
    [H, synth(H), TARGET, undefined, new Set()], 'no number to state');
}

// -- 4. THE ROUND TRIP IS NOT HOLLOW -----------------------------------------
console.log('\n  4. The inverse round trip actually catches a stray edit\n');
{
  //  THIS IS THE CHECK THAT CAME BACK GREEN FOR THE CFU SHEETS AND WAS WRONG.
  //  Sequential split/join over non-colliding tokens is exactly invertible, so
  //  mutating the REPLACEMENT can never make it lose a byte. The property the
  //  builder relies on is different: a body differing anywhere OUTSIDE the
  //  declared card must fail to reconstruct. That is what is asserted.
  const src = synth(H);
  const { row } = patchBody(H, src, TARGET, 6, new Set());

  const oneChar = row.after.replace('Some prose', 'Some pr0se');
  ok('one changed character elsewhere fails to reverse', inverseOf(oneChar, 6) !== src);

  const deleted = row.after.replace('<a class="ex" href="/pages/ex-1">Exercise 1: Something<span>Work it online.</span></a>\n', '');
  ok('a deleted card elsewhere fails to reverse', inverseOf(deleted, 6) !== src);

  const added = row.after.replace('</div>\n', '</div>\n<p>injected</p>\n');
  ok('an injected paragraph fails to reverse', inverseOf(added, 6) !== src);

  //  And the assertion that keeps the rule usable: a faithful patch must NOT be
  //  falsely accused. A rule that refuses every good sheet gets switched off.
  ok('an untouched patch still reverses', inverseOf(row.after, 6) === src);
}

// -- 5. THE SHEETS ON DISK ---------------------------------------------------
console.log('\n  5. The four sheets are what the runbook says they are\n');
{
  const files = fs.existsSync(IMPORTS)
    ? fs.readdirSync(IMPORTS).filter((f) => /^csp-applied-challenge-undefined-bi\d+-pages\.csv$/.test(f)).sort()
    : [];
  ok('four sheets, one per Big Idea', files.length === 4, files);

  //  The name carries the sheet type. A CSV has no tab name, so a file without
  //  "page" in it is rejected by Matrixify in one second.
  ok('every file name names the Pages sheet', files.every((f) => /page/i.test(f)), files);

  const seen = new Map();
  let rowCount = 0;
  const reserved = bi3Handles();
  ok('the Big Idea 3 sheet is still on disk to check overlap against',
    reserved && reserved.size === 14, reserved && reserved.size);

  for (const f of files) {
    const blob = fs.readFileSync(path.join(IMPORTS, f));
    ok(f + ': starts with a UTF-8 BOM', blob[0] === 0xEF && blob[1] === 0xBB && blob[2] === 0xBF);
    const text = blob.toString('utf8').replace(/^﻿/, '');
    ok(f + ': records are separated by CRLF', text.includes('\r\n'));
    ok(f + ': the header is quoted, so QUOTE_ALL', text.startsWith('"Handle","Command","Body HTML"'));
    ok(f + ': carries no Published At column', !/^[^\r\n]*Published At/.test(text));

    const rows = parse(text);
    const head = rows.shift();
    ok(f + ': three columns, named exactly', head.join('|') === HEADER.join('|'), head);
    for (const r of rows) {
      rowCount++;
      const [handle, command, body] = r;
      ok(f + ': ' + handle + ' is MERGE', command === 'MERGE');
      ok(f + ': ' + handle + ' states 6 questions once',
        body.split(fixed(6)).length - 1 === 1);
      ok(f + ': ' + handle + ' says nothing about undefined questions',
        !body.includes('undefined questions'));
      ok(f + ': ' + handle + ' is not also in the Big Idea 3 sheet',
        !reserved || !reserved.has(handle));
      ok(f + ': ' + handle + ' is a lesson page this pass declares',
        LESSONS.includes(handle), handle);
      if (seen.has(handle)) ok(f + ': ' + handle + ' appears in one sheet only', false, seen.get(handle));
      seen.set(handle, f);
    }
  }
  ok('17 rows in total', rowCount === 17, rowCount);
  ok('17 distinct handles', seen.size === 17, seen.size);
  ok('the declared list is 17 pages across Big Ideas 1, 2, 4 and 5',
    LESSONS.length === 17 && Object.keys(BY_BIG_IDEA).join(',') === '1,2,4,5');
  ok('and every declared page has a row', LESSONS.every((h) => seen.has(h)),
    LESSONS.filter((h) => !seen.has(h)));
}

//  A third CSV reader, deliberately. The generator has one and the Python
//  rederive has one; this file is the offline gate and must not go green
//  because it shares a parser bug with the thing it is checking.
function parse(text) {
  const rows = []; let row = []; let field = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || r[0] !== '');
}

console.log('\n  ' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
