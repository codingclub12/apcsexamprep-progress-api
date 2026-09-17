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
