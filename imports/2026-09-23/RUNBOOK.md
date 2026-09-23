# CED Essential Knowledge codes visible on the 8 graded CSP exercise pages

Board 392. Four sheets, four imports, one per topic. Do not combine them: a
MERGE overwrites a live body with no undo, so the blast radius of one click is
however many rows are in the file.

## What changes

Every question in the graded check on these 8 pages showed a small badge next
to "Question N of 6" reading something like "EK CRD-2.C.5", the raw College
Board Essential Knowledge code for that item. CLAUDE.md is explicit that this
code is teacher knowledge and must never be shown to a student directly; the
same mistake shipped 218 times on the rebuilt Topic 1.1 lesson before anyone
noticed. This is that mistake again, in a different place: the exercise-page
generator, not a lesson page.

    before  Question 3 of 6  [EK CRD-2.D.2]
    after   Question 3 of 6

Nothing else in any body changes. `scripts/csp-exercise-pages-csv.js` builds
the row straight from `lib/csp-exercise-pages.js`, and a parse-back check
(below) confirms every row equals a fresh call to `renderExercise()` for that
handle, byte for byte.

## Where this came from

Investigating customer report `esc_75eed3a1756556a978585f39` (flagged on
`ap-csp-topic-1-2-exercise-1`, no text typed) turned this up. The report
itself did not point at the badge specifically and the flagged question read
fine on its own; the badge was found by reading the whole page while checking
the report.

## The fix

`lib/csp-exercise-pages.js`: the graded-check question template stopped
emitting `<span class="ek">EK ${q.ek}</span>` next to the question number, and
the now-unused `.ek` CSS rule was removed from the shared stylesheet function.
The underlying `ek` field stays in `seed/csp-exercise-checks/*.js`; nothing
about the source data changed, only whether it renders.

That stylesheet function serves all 70 pages this generator builds, graded
and mirror-only alike, so the `.ek` CSS rule was dead weight on the 62
mirror-only pages too (they never had the span). This runbook's four sheets
touch only the 8 graded pages, where the real defect (a badge a student could
actually see) lived. The mirror-only pages carrying a few now-unused bytes of
CSS is cosmetic and not worth a 70-page import on its own.

## Before you import anything

    node scripts/verify-csp-ek-badge-live.js --before

Expected: `0 clean, 8 still showing the badge, of 8 graded pages` and the
last line reads "All graded pages still carry the defect, so the sheets are
current." Run this again immediately before each step below, not just once
today: a sheet whose defect is already gone on a page is a sheet to delete,
per CLAUDE.md's stale-sheet rule.

## The four imports

Matrixify, MERGE mode, one at a time. Handle, Command, Title, Body HTML,
Published, Published At, SEO Title, SEO Description. Published At is a fixed
past-dated literal, never `now()`.

| Step | File | Pages | After this step, verify should read |
|---|---|---|---|
| 1 | `csp-ek-badge-removal-topic-1.1.csv` | 2 | 2 clean, 6 still showing |
| 2 | `csp-ek-badge-removal-topic-1.2.csv` | 2 | 4 clean, 4 still showing |
| 3 | `csp-ek-badge-removal-topic-1.3.csv` | 2 | 6 clean, 2 still showing |
| 4 | `csp-ek-badge-removal-topic-1.4.csv` | 2 | 8 clean, 0 still showing |

Run after each step:

    node scripts/verify-csp-ek-badge-live.js

Only step 4 should end with `8 clean, 0 still showing the badge, of 8 graded
pages` and exit 0. Steps 1 through 3 are expected to still show pages
dirty and exit 1; that is not a failure, it means the remaining steps have
not run yet.

## What the check actually asserts

Not "the word EK is gone", which the page's own prose could trip on
harmlessly elsewhere. It counts `<span class="ek">EK [code]</span>` on the
LIVE page, fetched through `lib/storefront-fetch.js` with no User-Agent, the
same module every other live check in this repo uses so a bot-management
challenge page is never mistaken for a clean result.

## Evidence

- `node scripts/verify-csp-ek-badge-live.js --before`: 8 of 8 pages dirty,
  5 to 8 badges each (the count varies with each page's question count, not
  a fixed 6).
- Parse-back: every row in all four sheets, read back with
  `lib/matrixify-body-edit.js`'s `parseCsv`, equals a fresh
  `renderExercise(handle, check).bodyHtml` call, byte for byte, for all 8
  handles.
- `npm run smoke:csp-exercise-pages`: 53 passed, 0 failed. This is the
  existing suite for this generator; it does not test the badge directly
  (nothing in it asserted the old markup either), so it is evidence nothing
  else about the 70-page build moved.
- `npm run smoke:mutationleak`, `npm run smoke:encoding`: both clean.
- These checks were run by the session that made the change, so under rule 4
  they are evidence for a verifier, not a verification. `verify-csp-ek-badge-live.js`
  with no flag is the live re-check for after import.

## Still open

- The `.ek` CSS rule is gone from newly generated bodies but still sits,
  inert, in the 62 mirror-only pages' bodies until something else
  regenerates them. Cosmetic only; not part of this board item.
