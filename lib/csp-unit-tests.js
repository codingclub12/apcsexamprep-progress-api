'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  WHICH UNIT TEST PAGE(S) A BIG IDEA HAS. ONE HOME FOR THE BIG IDEA 3 SPLIT.
//
//  Big Idea 3 sits across two class periods and its test ships as two separate
//  pages. utils.js pageFromHandle states the reason: part A and part B "stay
//  SEPARATE lessons on purpose", because a handle post with no item defaults to
//  the item name 'item', so folding both parts into one lesson would have the
//  second submission overwrite the first.
//
//  ── WHY THIS FILE EXISTS AT ALL ─────────────────────────────────────────────
//  That exception was already written down in three places: this mapping's old
//  home in scripts/csp-command-center-exercises.js, lib/lesson-links.js, and
//  utils.js. It still did not reach a fourth place. On 2026-08-25 the nightly
//  crawl found /pages/ap-csp-course-bi3-unit-test returning 404, linked as
//  "Big Idea 3 unit test" from 54 rendered pages, because two builders each
//  wrote `bi${n}-unit-test` from a uniform template that is correct for four
//  Big Ideas and wrong for the fifth.
//
//  Adding a one-line BI3 special case to each builder would have fixed those 54
//  pages and made this the FOURTH place the fact lives, so the fifth caller
//  would get it wrong too. The mapping lives here instead, and every caller
//  imports it. smoke/csp-unit-test-links.js asserts that no caller builds one of
//  these handles by hand.
//
//  ── THE HANDLES ARE GRADEBOOK KEYS ──────────────────────────────────────────
//  pageFromHandle parses each of these into a (course, unit, lesson) a grade is
//  recorded against, so renaming one detaches every score already stored. They
//  are literal strings here, never built by concatenation, and the smoke suite
//  round-trips all six through the parser.
// ─────────────────────────────────────────────────────────────────────────────

// Big Idea number -> [[handle, label], ...], in the order a student should sit them.
const UNIT_TESTS = {
  1: [['ap-csp-course-bi1-unit-test', 'Unit test']],
  2: [['ap-csp-course-bi2-unit-test', 'Unit test']],
  3: [['ap-csp-course-bi3-unit-test-part-a', 'Unit test part A'],
      ['ap-csp-course-bi3-unit-test-part-b', 'Unit test part B']],
  4: [['ap-csp-course-bi4-unit-test', 'Unit test']],
  5: [['ap-csp-course-bi5-unit-test', 'Unit test']],
};

// Every handle this module knows to be real. The smoke suite checks emitted
// links against this set rather than against a regex, so a plausible-looking
// handle that does not exist still fails.
const UNIT_TEST_HANDLES = new Set(
  Object.values(UNIT_TESTS).flat().map(([handle]) => handle)
);

// Returns [] rather than throwing for an unknown Big Idea. A caller that renders
// no link is a page missing a footer link; a caller that throws is a build that
// produces no pages at all, and the first failure is much easier to see.
function unitTestsFor(n) {
  return UNIT_TESTS[Number(n)] || [];
}

// Lowercase only the FIRST character, so the label "Unit test part A" reads as
// "unit test part A" mid-sentence while the part letter stays capitalised. A
// flat toLowerCase() rendered "part a", which reads as a typo on a page whose
// whole job is telling a student which of the two sittings to take.
//
// It lives here rather than in each builder because the label casing is a
// property of these labels, and this module is the one place that owns them.
const lowerFirst = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

// The anchors for a Big Idea's "Where to go next" footer.
//
// `esc` is passed in rather than imported: both builders already own an escaper
// and they are not the same function, so taking theirs keeps this module from
// quietly changing how either one escapes.
//
// `text` builds the visible label. Big Idea 3 yields two anchors, so the label
// has to distinguish them, which is why the mapping carries a label at all.
function unitTestLinks(n, { esc = (s) => s, text = (label) => label } = {}) {
  return unitTestsFor(n)
    .map(([handle, label]) => `<a href="/pages/${handle}">${esc(text(label))}</a>`)
    .join('\n    ');
}

module.exports = { UNIT_TESTS, UNIT_TEST_HANDLES, unitTestsFor, unitTestLinks, lowerFirst };
