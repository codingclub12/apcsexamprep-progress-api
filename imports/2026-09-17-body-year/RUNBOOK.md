# Body and title import, 2026-09-17 (revised after the canary)

Five sheets. Four bodies, **one page each**, plus one small title sheet.

**This runbook was rewritten after importing the first sheet.** The first
version predicted three repairs that a Matrixify import would make on its own.
It makes none of them. See "What the canary actually taught us" below before
using the expectations here, because the earlier ones were wrong.

## What the canary actually taught us

`body-ap-csa-score-calculator.csv` was imported on 2026-09-17. It worked: the
verifier read `[DONE]`, 0 of 13 stale claims left, 13 of 13 new claims present,
and **393 elements, exactly the pre-import count**, so nothing was truncated.

Two things were learned that change the rest of this runbook.

**1. Matrixify stores the body VERBATIM.** The sheet cell was 45,400 characters
and the stored body came back 45,400 characters, byte for byte identical.
`docs/shopify-page-imports.md` describes Shopify decoding entities once, parsing
as HTML and re-serializing. That did not happen on this path. So:

- the broken `&amp;geq;` was **not** repaired and is now fixed explicitly
- the lowercased SVG `viewbox` was **not** repaired and is now fixed explicitly
- the missing `<tbody>` was **not** inserted, which never mattered

The good news in it: nothing gets transformed behind your back, so the escaped
angle brackets in these bodies are not at risk on this path at all.

**2. Every one of these pages renders TWO h1 elements.** The theme prints the
Shopify page `Title` field above the body, and the body carries its own:

    h1[0]   AP CSA Score Calculator 2026 | Predict Your Exam Score   <- Title field
    h1[1]   AP CSA Score Calculator 2027                             <- body, fixed

A body sheet cannot reach the first one. That is what `titles-page-year.csv` is
for, and until it is imported the visible heading on all four pages still says
2026 no matter what the body says.

## Before you import anything

    node scripts/verify-body-year-live.js

Expect **1 done** (the score calculator, partially) and **3 pending**.

## The steps

| # | Sheet | What it does | Expected after |
|---|---|---|---|
| 1 | `titles-page-year.csv` | 4 page titles, year only | first h1 reads 2027 on all four |
| 2 | `body-ap-csa-score-calculator.csv` | 4 edits, the `&geq;` repair | cutoffs read `5≥78, 4≥59, 3≥46, 2≥35` |
| 3 | `body-ap-csp-score-calculator.csv` | 15 edits | `[DONE]`, 379 elements |
| 4 | `body-ap-csa-exam-format.csv` | 9 edits | `[DONE]`, icons scale |
| 5 | `body-ap-csa-reference-sheet.csv` | 8 edits | `[DONE]`, 1417 elements |

Step 1 first, because it is the smallest sheet, it carries no body at all, and
it fixes the heading a visitor actually sees. Its only column besides the handle
is `Title`, which **does not change the URL**: the handle is a separate field and
is not being written.

Import one at a time. After each body step:

    node scripts/verify-body-year-live.js <handle>

`[DONE]` with 0 stale and all new claims present is success. **`[PARTIAL]` is
the state to stop on**: it means some edits landed and some did not.

The element count in that output is the truncation check. If it drops, the
import cut the body short; stop and say so rather than continuing.

## Re-running is safe now

The generator is idempotent. An edit already live is skipped and reported as
`(n already live, skipped)` rather than refusing the page, which is how the
score calculator sheet regenerated after its partial import. Regenerate any time
with:

    node scripts/body-year-csv.js out/dir

A page with nothing left to do writes no sheet at all.

## What is NOT here

- **Five more hub pages** name a past exam year in their body: `ap-csa-exam-prep-hub`,
  `ap-csa-practice-exams`, `ap-csa-topics`, `ap-csp-practice-exams`,
  `ap-csp-reference-sheet`. Second pass.
- **Handle renames.** Two pages carry a stale year in the URL. NEVER_AUTO.
- **The duplicate h1 itself.** Two h1 elements on a page is its own defect and
  fixing it means a theme or body restructure, not a year change. Worth raising
  separately.
- **Historical years, deliberately left alone.** 2025 score distributions, the
  2022 released exam, "since 2011", the FRQ archive back to 2004. The generator
  prints them as a review note and they were read before shipping.
