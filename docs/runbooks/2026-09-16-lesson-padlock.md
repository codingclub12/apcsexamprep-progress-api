# Import runbook: the lesson padlock fix

One sheet, one page, one change. About two minutes.

## Why

Sharon Reed's lesson padlock could only CLOSE. Clicking "1.1" to unlock it sent
`open:false` every time, and because a lesson-scope write clears the rows under
it, each attempt also deleted any per-column unlocks she had already made. She
was not doing anything wrong.

## Before you import

**Do NOT import `cyber-dashboard-gradebook-rollup-pages.csv`.** It targets the
same page, it is from 2026-09-11, it does not have this fix, and it would DELETE
the retry panel (rt-lesson, rt-ex, rt-quiz, rt-exam) that the live page has.
Importing it after this one reverts the padlock fix. It stays parked until board
#342 reconciles the repo mirror with the live page.

## The import

1. Matrixify > Import > `cyber-dashboard-lesson-padlock-pages.csv`
2. One row: handle `cyber-dashboard`, title "Teacher Dashboard", Command UPDATE.
3. Import once. Do not re-save the file as xlsx first: one row is over 32767
   characters and a spreadsheet would truncate it.

Expected end state: 1 page updated, 0 failed.

## After you import

    node scripts/verify-lesson-padlock.js

Expected: `OK - the lesson padlock opens a closed lesson (10 checks)`.

Run it BEFORE the import too, if you want to see the difference. It fails two
assertions today, both about opening, which is the bug.

It does not grep the page, it runs it: a search for `lessonState` passes on a
body that defines the function and never calls it, which is exactly what was
wrong.

## Then tell Mrs Reed

Her 1.1 lesson is currently CLOSED, because her last attempt to open it closed
it. After the import she clicks the padlock beside "1.1" once more and it opens
this time. If any individual column under 1.1 still shows a padlock, those were
cleared by the earlier lesson-scope writes and each one needs its own click.
