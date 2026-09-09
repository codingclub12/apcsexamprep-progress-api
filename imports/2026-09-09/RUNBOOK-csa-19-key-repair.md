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

## The one step

Import `csa-19-cfu1-key-repair-pages.csv` in Matrixify, MERGE mode.

One row, one handle. Nothing else on the site is touched.

**Expected end state:** the page is one byte shorter and question 1 can be
answered correctly. Nothing else changes, including the other five keys.

## Then check it

    node scripts/verify-csa-19-key-live.js

Expected: **6 passed, 0 failed**.

Run before the import and it reads 4 passed, 2 failed. That is not a problem, it
is the point: assertions 1 and 2 are the ones the import makes true, and a check
that passed beforehand would be proving nothing. Assertions 3 to 6 pass either
way, because what they are watching for is the MERGE taking something with it.

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
