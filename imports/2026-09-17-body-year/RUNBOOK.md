# Body rewrite import, 2026-09-17

Four sheets, **one page each**, because a `Body HTML` column overwrites a live
page body with no undo and the blast radius of one click should be one page.

Every sheet carries exactly `Handle, Command, Body HTML` and one row. There is
no `Title`, no `Published`, no SEO column, so nothing here can rename, hide or
re-describe a page. `Command` is `MERGE`, so a typo'd handle is a no-op rather
than a new page.

## Before you import anything

    node scripts/verify-body-year-live.js

Expect **0 done, 4 pending**, with 33 stale claims still live. If a page already
reads DONE, somebody has imported it and you should read what changed before
going on. If a page reads PARTIAL, stop: that is a half-applied import.

## Step 1 is a canary. Do it alone.

| # | Sheet | Page | Edits |
|---|---|---|---|
| 1 | `body-ap-csa-score-calculator.csv` | AP CSA Score Calculator | 13 |

Import it, then:

    node scripts/verify-body-year-live.js ap-csa-score-calculator

Expected: `[DONE]`, 0 stale claims live, 13 new claims present, and the element
count still **393**. If the element count dropped, the import truncated the body
and you should stop and say so rather than continuing.

**Look at the live page too.** Two things should have changed visibly:

- the H1 now reads **AP CSA Score Calculator 2027**
- the methodology note now reads **5≥78, 4≥59, 3≥46, 2≥35** instead of
  `5&geq;78, 4&geq;59, 3&geq;46, 2&geq;35`, which is how it reads today

That second one is a pre-existing display bug this import repairs. Seeing it
fixed is the strongest single sign the round trip behaved.

## Then the remaining three, one at a time

| # | Sheet | Page | Edits | Expected after |
|---|---|---|---|---|
| 2 | `body-ap-csp-score-calculator.csv` | AP CSP Score Calculator | 11 | DONE, 379 elements |
| 3 | `body-ap-csa-exam-format.csv` | AP CSA Exam Format | 5 | DONE |
| 4 | `body-ap-csa-reference-sheet.csv` | AP CSA Java Reference Sheet | 8 | DONE, 1417 elements |

Run the verifier for that handle between each.

## Three changes the save itself makes, all expected

Shopify decodes entities once, parses the body as HTML and re-serializes it, so
the stored body is never byte-identical to what a sheet sends. Simulated locally
against these four bodies, it does exactly three things and all three are
harmless or a repair:

- **both calculators**: `&amp;geq;` becomes `≥`, repairing the broken display
- **ap-csa-exam-format**: `viewbox` becomes `viewBox`. SVG attributes are
  case-sensitive, so the icons on that page are currently not scaling. This
  repairs them.
- **ap-csa-reference-sheet**: `<table><tr>` gains the implied `<tbody>`, adding
  234 characters. Browsers already insert it; nothing renders differently.

## What is NOT here

- **The other five hub pages** that mention a past exam year in their body
  (`ap-csa-exam-prep-hub`, `ap-csa-practice-exams`, `ap-csa-topics`,
  `ap-csp-practice-exams`, `ap-csp-reference-sheet`). They need the same
  treatment and are a second pass; these four are the ones behind the Search
  Console queries.
- **Handle renames.** Two pages still carry a stale year in the URL. Renaming a
  handle is NEVER_AUTO and needs a person and redirects.
- **Historical years, deliberately left alone.** These bodies legitimately name
  2025 score distributions, the 2022 released exam, "since 2011", and the FRQ
  archive back to 2004. The generator prints them as a review note rather than
  refusing, and they were read before shipping.
