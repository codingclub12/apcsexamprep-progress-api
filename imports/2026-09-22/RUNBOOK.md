# The Applied Challenge card that says "undefined questions"

Board 387. Four sheets, four imports, in this order. Do not combine them: a
MERGE overwrites a live body with no undo, so the blast radius of one click is
however many rows are in the file.

## What changes

One card on each of 17 live CSP lesson pages. It is the last card in the
exercise row, and it opens the one activity on the page whose answers reach the
gradebook.

    before  Applied Challenge
            undefined questions, and every answer is recorded for your teacher

    after   Applied Challenge
            6 questions, and every answer is recorded for your teacher

Nothing else in any body changes. The generator proves that by applying the
replacement backwards and requiring the result to equal the live body byte for
byte, which is the only check that can tell you nothing ELSE moved.

The 6 is measured, not assumed. Each card's own target was fetched and its
graded items counted, twice, by two implementations that do not share code.
All 17 targets serve exactly six.

## Where this came from

An anonymous student reported `/pages/ap-csp-course-bi4-fault-tolerance` as a
content error on 2026-09-21 with no text and an empty console buffer, report
`esc_f7e6c570aef9252c995203ae`. They were right. The card on that page tells a
student the graded activity has "undefined questions".

## Big Idea 3 is NOT in these sheets, on purpose

Big Idea 3 had the same defect on 14 pages and had its own sheet,
`imports/2026-09-21/csp-bi3-applied-challenge-undefined-fix-remaining.csv`.
Putting those handles in a second file would have meant one page in two
sheets, which is the failure mode splitting exists to remove and which
nothing announces. The overlap was asserted to be zero rather than assumed.

**That BI3 sheet has since been imported.** Confirmed live 2026-09-23: all 18
BI3 lesson pages state a correct question count, 0 say "undefined questions".
See `docs/runs/2026-09-23-claude-code-board-383-remeasure.md`. This paragraph
said "not yet imported" until then; do not act on that phrase in the rest of
this file below, which describes the state as of 2026-09-22.

## Before you import anything

    node scripts/verify-csp-applied-undefined-live.js --before

Expected: `fixed 0   not yet 17   problem 0`, and the last line reads
"All 17 page(s) still carry the defect, so the sheets are current."

If it says any page is ALREADY FIXED, **stop**. These sheets carry the body
that was live when they were generated, so importing one over a newer body
reverts whatever changed in between, and nothing in the sheet would say so.
Regenerate with `node scripts/build-csp-applied-undefined-sheets.js`.

## The four imports

Matrixify, MERGE mode, one at a time. Three columns (Handle, Command, Body
HTML), no Published At, UTF-8 with BOM, QUOTE_ALL.

| Step | File | Pages | After this step, verify should read |
|---|---|---|---|
| 1 | `csp-applied-challenge-undefined-bi1-pages.csv` | 4 | fixed 4, not yet 13 |
| 2 | `csp-applied-challenge-undefined-bi2-pages.csv` | 4 | fixed 8, not yet 9 |
| 3 | `csp-applied-challenge-undefined-bi4-pages.csv` | 3 | fixed 11, not yet 6 |
| 4 | `csp-applied-challenge-undefined-bi5-pages.csv` | 6 | fixed 17, not yet 0 |

Run the check after each step:

    node scripts/verify-csp-applied-undefined-live.js

Between steps it exits non-zero because not all 17 are done. That is expected
and is not a failure. Only step 4 should end with
"All 17 page(s) state a real question count."

Step 3 is the one that closes the student's report.

## Do not re-save these as a spreadsheet

Every row is over 32767 characters, which is fine for CSV and would be
truncated by xlsx. Import the CSV as it is.

## What the check actually asserts

Not "the word undefined is gone", which would pass on a page that lost the card
altogether. For each page it reads the card, reads the count it states, then
fetches the page that card LINKS and counts the graded items there. A stated
count that does not match the target is reported as MISMATCH, not as a pass.

## The generator bug behind this

These sheets repair 17 live pages. The reason they exist is a one-word bug in
`scripts/csp-lesson-exercise-links.js`, which built the block on all 35 pages:

    const n = applied.questions.length;   // questions is a Number

`.length` on a Number is `undefined` rather than an error, so the card shipped
with the word in it. That is fixed on the same branch as these sheets, and the
smoke test that was supposed to catch it is fixed too: it computed its expected
string the same wrong way, so it was asserting `includes('undefined questions')`
against a card that said exactly that, and it was green for a month.

Importing these sheets without that fix would repair the pages and leave the
next generator run free to break them again.
