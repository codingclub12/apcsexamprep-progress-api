# The SEO rewrites were authored, generated, and never imported

2026-09-17. Board #346.

## What prompted it

Search Console for 2026-09-16: eight queries taking heavy impressions at
positions 4 to 9 and converting at 0 to 1.7%, against 12 to 17% on the action
pages.

| Query | Impr | Clicks | Pos |
|---|---|---|---|
| CSA exam format | 237 | 2 | 5.67 |
| CSA score calculator | 223 | 1 | 7.11 |
| CSA reference sheet | 214 | 0 | 4.44 |
| Networking curriculum | 201 | 0 | 8.62 |
| Cyber curriculum | 175 | 3 | 6.89 |
| CSP score calculator | 161 | 2 | 6.72 |
| CSP reference sheet | 142 | 0 | 6.88 |
| CSP overflow/roundoff | 141 | 0 | 4.87 |

The instruction was to improve the pages Google already ranks rather than build
new ones.

## What was actually wrong

Not the content. `/pages/ap-csa-reference-sheet` is 26,425 characters of real
reference material and ranks 4.44. It took zero clicks on 214 impressions.

Its title was "AP CSA Java Quick Reference 2026" and its body said
`Exam: May 2026`, live, in September 2026. The exam students are searching for
is **Wednesday, May 12, 2027** (`docs/ced-snapshot/exam-dates.txt`, captured
2026-09-01; CSP is Friday, May 14, 2027). The page was advertising an
administration four months in the past.

The correlation holds across all eight. **Every zero-click page had a broken
snippet. Both pages that earned clicks had clean ones**, and the clean ones were
clean because they were already in `seed/seo-rewrites.js`.

## The actual finding

`seed/seo-rewrites.js` already contained 36 records, already diagnosed the year
problem in its own header ("the school year is 2026-27 and the next exam is May
2027"), and already fixed most of the pages in the table above.

It was never fully imported. Measured against live before touching anything:

| Group | Live | Pending |
|---|---|---|
| pages | 25 | 27 |
| products | 0 | 12 |
| collections | 0 | 7 |

The shape of the miss is exact and worth stating precisely, because the obvious
reading is wrong. `imports/2026-08-26/` holds three generated sheets: 25 page
rows, 13 product rows, 7 collection rows. The page sheet was imported
**completely** and its 25 handles are the 25 that are live, matching one for
one with nothing left over on either side. The product and collection sheets
sat in that same directory and were never imported at all, which is why
`/collections/frq` still serves `FRQ Practice | APCSExamPrep.com` with **no
meta description**.

The other 11 pending page rows were added to `seed/seo-rewrites.js` after
2026-08-26 and never regenerated into a sheet, so they have never been in an
import at all. 44 of the 46 pending records have never appeared in any
committed sheet. The result either way is that defects the seed file describes
in the past tense are still being served:

- three AP CSP game pages carrying `APCSExamPrep.com` twice, which is the
  brand-doubled defect the seed header says it fixes
- `/pages/ap-csa-unit-1-course` titled **"AP CSA Unit 1: Primitive Types"**,
  which is the retired 10-unit curriculum this repo forbids outright

Nothing in the repo could see any of that, because a seed file reads like a
record of work completed and a committed sheet reads like a record of an
import. Neither is. That is the lesson worth keeping: authoring a fix,
generating a sheet, and importing it are three separate events, and until today
only the first two left a trace anywhere in this repository.

## What changed

- **16 new records** in `seed/seo-rewrites.js`, covering every page behind the
  eight queries plus the rest of the same defect class. Beyond the stale year
  these fixed: a CSP page whose description advertised a CSA practice exam, two
  descriptions reading "AP CSAUnit 2" with no space, an en-dash in a title, four
  machine-truncated titles, and five descriptions between 180 and 202 characters.
- **A new guard** in `scripts/seo-metadata-csv.js`. The existing year rule only
  caught a school-year SPAN, so it read `2026-27` and passed, and never looked
  at a title reading `AP CSA Exam Format 2026`. The new rule catches a
  standalone exam year that has passed, and derives the boundary from the clock
  rather than a literal, so it fires by itself next September instead of waiting
  to be rediscovered from a traffic report.
- **`scripts/verify-seo-metadata-live.js`**, which asks the storefront which
  records are actually live. This is what produced the table above.
- **7 new smoke cases**, `npm run smoke:seocsv` now 42 passing.

## Evidence

- parse-back of `seo-pages.csv` against the source table: **zero differences**,
  header carries no content column, every row `MERGE`
- `npm run smoke:seocsv` 42 passed 0 failed; `smoke:seotitles` 97 passed 0
  failed; `smoke:encoding` 54 passed 0 failed
- mutation run, each rule broken independently: **15 rules proved live, 0
  hollow**. Includes the case that matters most for the new rule, that a stale
  year sitting beside a legitimate archive range ("every released FRQ from 2004
  to 2025") is still caught, so the exemption is not a hole.
- live state before import recorded above, and re-derivable with
  `node scripts/verify-seo-metadata-live.js --pending`

## Still open

- **The sheets are not imported.** They are generated at
  `out/seo-2026-09-17/` with a runbook. Import is a human action and the
  expected end state per step is written down.
- **Nine hub page bodies still advertise the 2026 exam**, including
  `Exam: May 2026` on the reference sheet. Snippet work does not touch body
  copy; that is a separate sheet with a separate per-page check.
- **Both score calculators have an H1 reading 2026 under a title reading 2027.**
  Google rewrites titles from the H1 often enough that this may be what the SERP
  actually shows. Body change, not covered here.
- **Two handles carry a stale year in the URL.** Renaming a handle is NEVER_AUTO.
- **The CTR ceiling is not measured.** Ahrefs API units were exhausted and GSC
  is not connected to it, so what sits above these results (AI Overviews, the
  College Board's own PDF for "reference sheet") could not be checked. The
  snippet defects are real and fixable; whether fixing them recovers the whole
  gap is not established, and should not be claimed.
