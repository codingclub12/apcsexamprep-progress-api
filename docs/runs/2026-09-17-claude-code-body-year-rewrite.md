# The snippet promised 2027 and the page still said 2026

2026-09-17. Board #348. Follows board #346, which fixed what Google shows.

## Why this existed

The SEO sheet imported earlier today moved 13 hub titles off a stale exam year.
It did not touch body copy, so it opened a gap: `/pages/ap-csa-reference-sheet`
now promises the May 2027 exam in the search result and its hero badge still
read `Exam: May 2026`. Better for the click, worse for the ten seconds after it.

## What a find and replace would have destroyed

These bodies carry 60-odd past years and most of them are correct. Measured:

- `/pages/ap-csa-2025-frq-1-dogwalker`, links whose year IS the address
- `2025 National Score Distribution`, `93,906 students in 2025`, historical fact
- `the 2022 College Board released exam`, what the calculator is built on
- `since 2011`, when the guessing penalty ended
- the FRQ archive, 2004 through 2025, which is the point of those pages

So every replacement is authored and carries the count it expects, and the
generator refuses the whole sheet if any count is off by one.

## Two edits are not date substitutions

In 2026 AP CSP sat the day BEFORE AP CSA. In 2027 it sits two days AFTER: CSA is
Wednesday May 12, CSP is Friday May 14, both first-party from
`docs/ced-snapshot/exam-dates.txt`. A page reading "the day before" becomes false
by moving its numbers, so the sentence was rewritten. On the CSP calculator the
weekday moves too, Thursday to Friday.

The start time was DROPPED rather than moved. The CED says Session 1 is 8 a.m.
local and Session 2 is noon, but the captured text is flattened out of its two
columns, so which session holds CSA in 2027 cannot be read from it. The page
keeps its College Board calendar link and no longer asserts a time this repo
cannot source.

## Three things found on the way that were not the task

- **Two live pages disagreed about the same exam date.** The CSA score
  calculator said Friday May 8 2026; `/pages/ap-csa-exam-format` said Friday
  May 15 2026. At most one could be right. Both now come from one constant.
- **Both score calculators display a broken entity.** The stored body carries
  `&amp;geq;`, so the methodology note renders literally as `5&geq;78, 4&geq;59,
  3&geq;46, 2&geq;35`. Live today on both pages.
- **`ap-csa-exam-format` has four SVG icons with `viewbox` lowercased.** SVG
  attributes are case-sensitive, so those icons are not scaling to their box.
  Probably the residue of an earlier import through a tool that lowercased them.

The import repairs all three as a side effect, because the save normalizes them.

## The entity question, settled by measurement rather than nerve

`docs/shopify-page-imports.md` records an import that DELETED an address from a
live page: `&lt;helpdesk@rivertonl1b.org&gt;` decoded to `<helpdesk@...>`, the
parser read a tag, and the address went. These four bodies carry **130 escaped
angle brackets**, which looked like the same hazard.

It is not, and the discriminator is exact: HTML5 starts a tag only when `<` is
followed by a letter, `/`, `!` or `?`. All 130 are comparison operators followed
by a space, `=` or a digit, which is literal text that re-serializes back to
`&lt;`. **Zero are tag starts.**

That was then CONFIRMED rather than argued, by running the real transform
locally through parse5 over all eleven candidate bodies: decode once, parse,
re-serialize. Six came back byte-identical. The other five differed only in the
three ways listed in the runbook, every one harmless or a repair.

## Evidence

- all 23 find-strings match their expected counts in the live stored bodies;
  37 replacements across 4 pages
- each sheet parses back from CSV byte for byte against the spec applied to the
  stored body; one row each, `MERGE`, no destructive column
- save simulation over the shipped cells: every targeted stale claim is absent
  from what Shopify would store
- `npm run smoke:bodyyear` 27 passed 0 failed; `smoke:encoding` 54 passed 0 failed
- mutation run, each guard broken independently: **8 guards proved live, 0
  hollow**, including both directions of the entity classifier (an operator is
  not flagged, the 2026-09-06 incident shape is) and the proof that the
  last-updated-stamp exemption is not a hole
- `node scripts/verify-body-year-live.js` before import: 0 done, 4 pending, 33
  stale claims live, 0 new claims present. Every new claim was FALSE on the
  storefront beforehand, which is what makes it a live check rather than a 200.

## Still open

- **Not imported.** Four sheets at `imports/2026-09-17-body-year/` with a
  canary-first runbook. Import is a human action.
- **Five more hub pages** name a past exam year in their body and are a second
  pass: `ap-csa-exam-prep-hub`, `ap-csa-practice-exams`, `ap-csa-topics`,
  `ap-csp-practice-exams`, `ap-csp-reference-sheet`.
- **Two handles carry a stale year in the URL.** NEVER_AUTO, needs redirects.
- **`42 MCQ` is still unverified.** Both the exam-format page and the reference
  sheet assert it and no first-party source in this repo confirms it. The
  rewrite moved the year and deliberately did not touch the count, so this is
  inherited, not introduced. Worth a check before the next pass.

---

## Addendum, after importing the canary: two predictions were wrong

`body-ap-csa-score-calculator.csv` was imported the same day. The import itself
worked exactly as designed: `[DONE]` on all 13 edits, 393 elements before and
393 after, so nothing truncated. Two things this run note claimed above turned
out to be wrong, and both were found by looking at the page rather than at the
verifier.

**1. Matrixify stores the body VERBATIM. The save repairs nothing.**

Measured: the sheet cell was 45,400 characters and the stored body came back
45,400, byte for byte identical. So all three of the "harmless or a repair"
changes predicted from the parse5 simulation simply did not occur. `&amp;geq;`
is still there and still renders as `5&geq;78`; `viewbox` is still lowercased;
no `<tbody>` was inserted.

The error was in the simulation, not in the reasoning about it: `decodeOnce()`
followed by `parse5.parseFragment()` decodes TWICE, because the parser decodes
during tokenization. It was a plausible model of a documented transform, run
carefully, and it still predicted three things that did not happen.

The cost is worth naming. The runbook told Tanner the `&geq;` repair was "the
strongest single sign the round trip behaved". A correct import would therefore
have read as a failed one. A check whose success signal is a side effect nobody
has observed is worse than no check, and this is the second time in two days
that a confident, plausible, entirely false report came out of a model of a
system rather than the system.

Both defects are now explicit edits, `docs/shopify-page-imports.md` carries the
measurement in front of the transform it contradicts, and the runbook is
rewritten.

**2. Every one of these pages renders TWO h1 elements, and the body is the
second one.**

The theme prints the Shopify page `Title` field above the body:

    h1[0]   AP CSA Score Calculator 2026 | Predict Your Exam Score   <- Title field
    h1[1]   AP CSA Score Calculator 2027                             <- body, fixed

So the body sheet fixed the h1 nobody sees first, and the visible heading still
advertised the passed exam. That is the whole reason the H1 mattered: Google
rewrites titles from it. A body sheet cannot reach the `Title` field, because
`Title` is a forbidden column there precisely because a wrong value renames a
live page, so it ships as its own small sheet with no body column beside it.

Confirmed on all four pages, so this was never specific to the canary.

**What changed as a result**

- `&amp;geq;` and `viewbox` are explicit edits now, 49 replacements in total
- `TITLES` in the spec and `titles-page-year.csv`, 4 rows, year only
- the generator is IDEMPOTENT: an edit already live is skipped and reported
  rather than refusing the page, which is what a partial import needs
- that idempotency check was itself wrong on its first draft. It accepted
  `replace count >= expected`, and the mutation run broke it in one move with a
  one-character replacement: `'y'` occurs hundreds of times, so a find-string
  that was simply MISSING read as already done. It now requires an exact count
  and a replacement of at least 8 characters, with three mutation cases holding
  it there
- the verifier no longer calls PARTIAL a stop-the-line state, because a staged
  import makes it a normal one
- `smoke:bodyyear` 37 passed; mutation 10 guards live, 0 hollow

**Still open, unchanged:** the duplicate h1 is its own defect and fixing it is a
restructure rather than a year change. Five more hub pages need the same pass.
Two handles carry a stale year in the URL. `42 MCQ` remains unverified.
