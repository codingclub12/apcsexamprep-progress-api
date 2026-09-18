# The second pass, and the check that reported two pages clean

2026-09-18. Board #363. Follows #346 and #348.

## The check was wrong before the pages were

`staleYears()` stripped every school-year span before looking for a stale year,
on the reasoning that 2026-27 is correct and should not be flagged. True, and it
meant an ENDED span was not flagged either. So:

    ap-csp-reference-sheet    "the 2025-2026 AP CSP exam", four times    reported CLEAN
    ap-csp-practice-exams     hero eyebrow "2025-2026"                   reported CLEAN

Two of the five pages in this pass read as having nothing wrong with them. That
is the worst shape a check can have: it reports nothing and looks like evidence.
Spans are judged by their end year now, the same way `scripts/seo-metadata-csv.js`
has always judged the ones it writes.

The same pass found a second fault. Every inline SVG carries
`xmlns="http://www.w3.org/2000/svg"`, and `\b20\d{2}\b` matches the 2000 in it.
On `ap-csa-topics` that produced 14 hits, burying the six real ones. Absolute
URLs are stripped before the scan now.

Both faults are covered by smoke cases, including two proving the new exemptions
are not holes: a real year sitting beside a URL is still caught, and an archive
range like 2004-2025 is still not a school year.

## Three kinds of past year live on these pages

Only one of them is stale, and separating them is most of the work:

    a CURRENCY claim       "aligned to the 2025-2026 4-unit curriculum"    fix
    a HISTORICAL claim     "Scanner is new to the 2025-2026 exam"          keep
    AUTHORING SCAFFOLDING  an HTML comment full of SEO notes               keep

The third was a surprise. Both practice-exam pages carry a block reading
"SEO: - Page Title: ... - Meta description: ..." inside a comment, left over from
whoever built them, stale years and all. Checked against the rendered page: none
of it reaches a student, so it is not a defect to fix here. It is why the span
find-strings in the spec are long rather than bare, so an edit cannot reach into
a comment.

## What changed

32 replacements across 5 pages, plus one page title. `ap-csa-topics` renders
FOUR h1 elements, and the first of them comes from the Title field, which read
"AP CSA Topics (2026)".

The em-dash rule was refined rather than obeyed literally. Several of these edits
sit next to an em-dash that is already in the live body, as in
"AP CSA Exam, May 15, 2026". The house rule is that we do not AUTHOR an em-dash;
stripping one already there would be an unrelated edit widening the change. The
smoke case now tests that an edit may not INCREASE the count, with a case proving
an edit that introduces one is still refused.

## Evidence

- all 28 find-strings match their expected counts in the live stored bodies
- each sheet parses back from CSV byte for byte against the spec applied to the
  stored body; one row each, MERGE, no destructive column
- `npm run smoke:bodyyear` 49 passed 0 failed, up from 41
- mutation run: 10 guards proved live, 0 hollow
- the generator reports the four pages from yesterday as "every edit is already
  live, no sheet written", which is the idempotency path doing its job

## One judgement call, flagged rather than buried

Lines reading "aligned to the 2025-2026 4-unit curriculum" became "2026-2027".
CLAUDE.md says AP CSA references use the 2025-2026 4-unit structure exclusively,
and that rule is about not reviving the retired 10-unit curriculum rather than
about which school year a page claims to be current for. The four-unit structure
is unchanged and is not being renamed. This also matches the SEO titles already
live, which read "2026-27".

The more durable option is to name no year at all on a currency line, and it was
not taken only because the shipped titles set a precedent. Worth a human saying
which he wants.

## Still open

- **Not imported.** Six sheets at `imports/2026-09-18-hub5-body-year/`.
- **The duplicate h1**, now known to be four on one page. A restructure, not a
  year change.
- **The comment scaffolding** on both practice-exam pages. Invisible, untidy.
- **`42 MCQ`** is still unverified on two pages.
- **19 product and collection SEO records** from 2026-09-17 are still not live.
