# Import runbook: two sheets, ten cyber lab pages, 2026-09-15

Two Matrixify Pages sheets, five rows each, one import per unit.

    matrixify/cyber-lab-denominator-unit-2-pages.csv   5 rows
    matrixify/cyber-lab-denominator-unit-3-pages.csv   5 rows

Both are `MERGE`, which REPLACES the whole Body HTML of each page with no undo.
Shopify keeps no page history. Two files rather than one because the blast
radius of a single click is however many rows are in the file, and ten live
lab pages on one click with nothing to check in between is not worth the saved
minute.

## Run this BEFORE you import

    npm run verify:cyberlabdenom

Expected right now, exactly:

    10 lab pages: 0 imported, 10 not imported, 0 stale, 0 unreadable
    NOT IMPORTED - every page still counts only the finished steps. The sheet is fresh and safe to import.

It exits non-zero on that, which is correct before an import and is not a
failure to investigate.

Two other answers, and both mean stop:

- **`[STALE]` on any row.** The page moved after the sheet was built, so
  importing would revert whoever moved it. Regenerate with
  `npm run cyber:labdenomsheet` and read the diff before continuing.
- **`OK - every lab page prints its score out of the whole lab`.** Somebody has
  already fixed these pages another way. Delete the sheets rather than importing
  a copy of a fix that is already live.

## Step 1: import the unit 2 sheet

Pages, `MERGE`, five rows: lessons 1 through 5 of unit 2.

Then run `npm run verify:cyberlabdenom` again. **The expected answer is a
non-zero exit**, and this is the line that matters:

    10 lab pages: 5 imported, 5 not imported, 0 stale, 0 unreadable
    PARTIAL - some pages carry the fix and some do not. Import the remaining unit sheet.

A correct import reads as a failure here. That is deliberate: the check reports
on all ten pages, so it cannot go green until both sheets are in.

## Step 2: import the unit 3 sheet

Pages, `MERGE`, five rows: lessons 1 through 5 of unit 3.

Then run it once more. Expected, and this one is green:

    10 lab pages: 10 imported, 0 not imported, 0 stale, 0 unreadable
    OK - every lab page prints its score out of the whole lab

That is also the second `live` check in
`deploy-gates/2026-09-15-cyber-lab-denominator.json`, which is not satisfied
until it passes.

## What changes on the page

A student who has finished two of the six steps and earned ten points sees
`10 / 30` instead of `10 / 10`, and the gradebook records 33 percent instead of
100. A student who finishes the whole lab sees and records exactly what they did
before: the old expression arrives at 30 on the last step by itself, which is
why this went unnoticed for so long.

The results panel is untouched. It already rendered `te/totalPts` and it still
does, so after this the running score and the panel agree at every moment rather
than only at the end.

## Two things that are NOT defects afterwards

- **Unit 2 lesson 5 is in the sheet and has no gradebook column.** Cyber 2.5 is
  not a CED topic and `utils.js` does not list it, so nothing this sheet does
  gives it one. It is in the file because a student reading that page is being
  shown the same wrong number as everybody else, and fixing the display there
  costs nothing. If a 2.5 column ever appears after this import, that is a
  separate bug and the sheet is not where it came from.
- **Unit 3 lesson 6 is not in either sheet.** That page already writes
  `t + ' / ' + TOTAL`, which is correct. It is the one lab in these two units
  that was built from a different template.

## Percentages already on disk

This fixes what pages report from now on. It does not rewrite the rows already
stored, so a student who abandoned one of these labs before today still carries
the inflated percentage until they run it again. Clearing those is a write to
student data and a decision rather than a patch, so it is not in here. Board
329 carries it.
