# Runbook: repair the 1.9-cfu-1 answer key

One sheet, one page, one byte. Board 296.

## What is wrong

`ap-csa-lesson-1-9-method-signatures` stores item `1.9-cfu-1`'s key as a newline
followed by `C`. The page grades it with

    var correct = ex.getAttribute('data-answer');
    ...
    feedback.classList.add(chosen === correct ? 'fb-correct' : 'fb-incorrect');

No trim, strict `===`, and the option letters are exactly `A` `B` `C` `D`. So no
option can ever equal the key. Nobody has ever been marked right on that
question, the correct answer is never highlighted after answering, and
`apcs-reporter.js` posts 0 out of 1 into the gradebook every time it is answered.
The other five items on the page are fine.

## Step 1, before you import: check the sheet is still worth importing

    node scripts/verify-csa-19-key-live.js

**Expected right now: 4 passed, 2 failed.** The two failures are assertions 1 and
2, which are the ones the import makes true. That is the sheet's reason to exist.

**If it reads 6 passed, 0 failed, DO NOT IMPORT.** Somebody has already fixed the
key, and this sheet still carries a body captured on 2026-09-09. Importing it
would MERGE a stale page over a newer one and could revert whatever else changed
in the meantime. Delete the sheet instead.

That is not hypothetical. On 2026-09-08 a Command Center sheet sat unimported for
a day while somebody renumbered the same page onto CED lesson ids, and importing
it would have reverted the better fix with nothing in the sheet or the runbook
saying so.

The generator refuses on the same condition, so `node
scripts/csa-19-cfu1-key-repair-csv.js --check` is a second way to ask: it exits
non-zero with "expected exactly one padded key in the live body, found 0".

## Step 2: import

Import `csa-19-cfu1-key-repair-pages.csv` in Matrixify, MERGE mode.

One row, one handle. Nothing else on the site is touched.

**Expected end state:** the page is one byte shorter and question 1 can be
answered correctly. Nothing else changes, including the other five keys.

## Step 3: check it landed

    node scripts/verify-csa-19-key-live.js

Expected: **6 passed, 0 failed**.

Assertions 3 to 6 passed before the import too, because what they watch for is
the MERGE taking something with it rather than the repair itself.

If it comes back red after the import, `imports/2026-09-09/csa-19-live-body.json`
is the exact pre-import body.

## What was checked before handing this over

    node scripts/matrixify-preflight.js imports/2026-09-09/csa-19-cfu1-key-repair-pages.csv \
      --expect-command MERGE --carrying imports/2026-09-09/csa-19-live-body.json
    # clear to import
    # 1 emoji carried through from the live bodies, none added
    # 68 non-ASCII characters carried through, none added

    npm run smoke:csa19key      # 21 passed, 0 failed

The generator refuses on seven separate conditions and each one is broken on
purpose in the suite, including the two that would matter most: writing a
different letter, which would mark a wrong answer correct, and an edit that
lands but takes something else with it.

## Do not re-save the CSV as a spreadsheet

The body cell is over 32,767 characters. That is fine for CSV and would be
truncated by xlsx.

## Why this is not a hand edit in the Shopify admin

It is one byte, and 91,573 of them are going back up to change it. A MERGE
overwrites a live body with no undo, so the value here is not the edit, it is the
round trip proving nothing else moved. That proof does not exist for a hand edit.
