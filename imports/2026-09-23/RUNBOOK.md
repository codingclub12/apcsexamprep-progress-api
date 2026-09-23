# CED Essential Knowledge codes visible on the 8 graded CSP exercise pages

Board 392, plus step 5 for board 393 and steps 6 to 8 for board 397. Eight sheets, eight imports. Do not combine them: a
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
| 1 | `csp-ek-badge-removal-topic-1.1-pages.csv` | 2 | 2 clean, 6 still showing |
| 2 | `csp-ek-badge-removal-topic-1.2-pages.csv` | 2 | 4 clean, 4 still showing |
| 3 | `csp-ek-badge-removal-topic-1.3-pages.csv` | 2 | 6 clean, 2 still showing |
| 4 | `csp-ek-badge-removal-topic-1.4-pages.csv` | 2 | 8 clean, 0 still showing |
| 5 | `csp-1-2-exercise-1-log-pages.csv` | 1 | still 8 clean, and the LunchDash Log on 1.2 Exercise 1 (see below) |
| 6 | `csp-2-3-exercise-1-log-pages.csv` | 1 | Survey Workbook Log on 2.3 Exercise 1 (see below) |
| 7 | `csp-5-3-exercise-1-log-pages.csv` | 1 | Incident Log on 5.3 Exercise 1 |
| 8 | `csp-5-6-exercise-1-log-pages.csv` | 1 | Trail Log on 5.6 Exercise 1 |

Run after each step:

    node scripts/verify-csp-ek-badge-live.js

Only step 4 should end with `8 clean, 0 still showing the badge, of 8 graded
pages` and exit 0. Steps 1 through 3 are expected to still show pages
dirty and exit 1; that is not a failure, it means the remaining steps have
not run yet.

## Step 5: the LunchDash Log on 1.2 Exercise 1 (board 393)

Added by the board 393 session, which took over this runbook's generator lock.

`/pages/ap-csp-topic-1-2-exercise-1` asks six graded questions about the
LunchDash Log from Part A of the student handout, and the page never showed the
log (report `esc_75eed3a1756556a978585f39`). Step 5 puts it on the page, as a
five-row table above the Part B heading. The row was generated from a tree
carrying BOTH changes, so it has no EK badge either.

**Step 5 must come after step 2.** Step 2's sheet also rewrites this page, from
a tree without the log. Import step 2 after step 5 and the log is gone, and
nothing announces it. In this order the log survives and the badge stays gone.

Before step 5, confirm the defect is still live, which is the stale-sheet check:

    node scripts/verify-csp-1-2-log-live.js --before

Expected: "The log is still missing, so the sheet is current." After the import:

    node scripts/verify-csp-1-2-log-live.js

Expected: one log table above Part B, rows 1,2,3,4,5, six graded questions,
zero EK badges, exit 0. Then `node scripts/verify-csp-ek-badge-live.js` should
still read 8 clean.

Do not check this with a bare `curl | grep`. On 2026-09-23 that returned 0
bytes (the page redirects and curl was not told to follow), which reads as
"log missing" whether it is or not. The verifier fetches through
`lib/storefront-fetch.js` and refuses to give a verdict unless the Part B
heading is present.

One caution about `verify-csp-ek-badge-live.js`, noted rather than changed by
the board 393 session: it fetches with `sf.raw`, which does not reject a
bot-challenge page, and its assertion is negative (no badge found), so a
challenge body would read as 8 clean. Before trusting an "8 clean", open one
page by eye.

### Step 5 also moves the pizza sell-out to 11:25 (board 400)

Regenerated on 2026-09-23. The handout had pizza selling out at 10:30 (row 2)
and then being ordered at 11:14 (row 1) and offered at 11:20 (row 5). The
sell-out is now 11:25 a.m. on the page's log and in graded question 2, which
used to open "At 10:30". Nothing else on the page changed, and it still carries
no EK badges.

Do this BEFORE step 5, so the paper and the page change together: replace the
two files teachers download, in Shopify admin under Content > Files, with the
corrected copies (same file names, so the links keep working):

    AP-CSP_1-2_Exercise1_Student_k7q2m9.docx   imports/2026-09-23/ (in the repo)
    AP-CSP_1-2_Exercise1_KEY_k7q2m9.docx       handed over in the conversation,
                                                not committed: the repo is public

In each file the only change is the row 2 time, 10:30 a.m. to 11:25 a.m.
Check afterwards that the download says 11:25:

    curl -s https://apcsexamprep.com/cdn/shop/files/AP-CSP_1-2_Exercise1_Student_k7q2m9.docx -o h.docx && unzip -p h.docx word/document.xml | grep -o '1[01]:[0-9][0-9] a.m.' | head -2

Expected: `11:14 a.m.` then `11:25 a.m.`.

## Steps 6 to 8: the Part A logs on 2.3, 5.3 and 5.6 Exercise 1 (board 397)

Same defect as step 5, on three mirror-only pages: each page's Part B cites
rows of the handout's Part A log by number ("Row 5", "Rows 3 and 5") and the
page never showed the log. Each sheet is one page.

These three pages are in no other sheet in this runbook, so steps 6 to 8 do
not depend on steps 1 to 5 and can run in any order among themselves. None of
the three has a graded check, so none ever carried an EK badge.

Before step 6:

    node scripts/verify-csp-exercise-1-logs-live.js --before

Expected: "0 with the log, 3 without, 0 unclear, of 3." After each step, check
that page alone, for example:

    node scripts/verify-csp-exercise-1-logs-live.js ap-csp-topic-2-3-exercise-1

Expected: "1 with the log". After step 8, with no handle: "3 with the log",
exit 0.

The only difference between each live body today and the generator's output
before this change is the inert `.ek` style rule board 392 dropped, so these
sheets revert nothing.

## File names

All eight sheets end in `-pages.csv`. A CSV has no tab name, so Matrixify reads
the sheet type from the file name and rejects a name that carries none.
`scripts/matrixify-preflight.js` refused all four original names; they were
renamed on 2026-09-23 with contents unchanged, and all five now read "clear to
import".

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
