# SEO metadata import, 2026-09-17

Three sheets. Import order does not matter; each is independent.

These sheets carry `Handle, Command, SEO Title, SEO Description` and nothing
else. There is no `Body HTML` column and no `Title` column, so no value in any
of them can change a page body or a visible page title. `Command` is `MERGE` on
every row, which updates a record that exists and never creates one, so a
typo'd handle is a no-op rather than a new blank page.

## Before you import anything

    node scripts/verify-seo-metadata-live.js --pending

Expect **46 pending, 25 live** (one product may report unreachable on a
transient TLS error; re-run it). If that number is much smaller, somebody has
already imported part of this and you should read what changed before going on.

## The steps

| # | Sheet | Rows | What it changes | Expected after |
|---|---|---|---|---|
| 1 | `seo-collections.csv` | 7 | Collection titles and descriptions | 7 live |
| 2 | `seo-products.csv` | 13 | Product SEO titles only, no descriptions | 13 live |
| 3 | `seo-pages.csv` | 52 | Page titles and descriptions | 52 live |

Import one at a time, in MERGE mode, and read the refusals before starting the
next one.

**Step 3 changes 27 of its 52 rows. The other 25 are already live and will
import as no-ops.** That is expected and is not a sign the sheet is wrong: the
sheet is generated from the whole table, not from the delta.

## After each step

    node scripts/verify-seo-metadata-live.js --pending

A finished import leaves this at zero pending. The script prints, per record,
the string the storefront serves now against the string the sheet writes, so a
partial import is visible rather than inferred.

## What is deliberately NOT in these sheets

- **Body copy.** Nine hub pages still say "Exam: May 2026" or "the 2026 AP CSA
  exam" inside the page itself. That is a body change, it needs its own sheet
  and its own per-page check, and it is the second half of this job. These
  sheets fix what Google shows in the result; they do not fix what a student
  reads after clicking.
- **Handle renames.** `ap-csp-unit-5-cybersecurity-complete-2025-study-guide`
  and `ap-computer-science-principles-practice-exam-2025` both carry a stale
  year in the URL. Renaming a handle is on the NEVER_AUTO list and needs a
  person, with redirects.
- **The H1 on both score calculators**, which reads 2026 while the title reads
  2027. Google rewrites titles from the H1 often enough that this may be what
  the SERP is actually showing. Also a body change.
