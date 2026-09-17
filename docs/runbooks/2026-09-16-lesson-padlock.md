# Import runbook: the lesson padlock fix

One sheet, one page, one change. About two minutes.

## Why

Sharon Reed's lesson padlock could only CLOSE. Clicking "1.1" to unlock it sent
`open:false` every time, and because a lesson-scope write clears the rows under
it, each attempt also deleted any per-column unlocks she had already made. She
was not doing anything wrong.

## THIS SHEET IS IMPORTED AND DELETED. Read this before anything else.

The fix landed on 2026-09-16 at 19:54 local and
`matrixify/cyber-dashboard-lesson-padlock-pages.csv` was deleted on 2026-09-17,
for the reason the 2026-09-11 runbook deleted the retry-panel sheet: two live
sheets for one page is how a fix gets reverted by somebody being helpful. That
file no longer carried the rollup, the three-mode retry control or the lock
disclosure, so importing it today would have taken all three off the page in one
click. The steps below are kept as the record of what was done.

**The warning that used to be here is retired, and its reading was wrong.** It
said not to import `cyber-dashboard-gradebook-rollup-pages.csv` because it would
DELETE the retry panel that the live page has. It does delete those four ids, on
purpose: they are the dead SAVING SOON switches, and board 302 is the task that
killed them. They moved the displayed grade and changed nothing a student could
do. That sheet replaces them with three modes that actually save.

What WAS right in the warning is that the 2026-09-11 file predated this fix and
would have reverted it. That is fixed rather than parked: the sheet was
regenerated on 2026-09-17 from the repo mirror, which now carries this padlock
change AND the rollup, and `scripts/verify-lesson-padlock.js` passes 9 of 9
against the bytes it writes. Board #342 is answered.

## The import

1. Matrixify > Import > `cyber-dashboard-lesson-padlock-pages.csv`
2. One row: handle `cyber-dashboard`, title "Teacher Dashboard", Command UPDATE.
3. Import once. Do not re-save the file as xlsx first: one row is over 32767
   characters and a spreadsheet would truncate it.

Expected end state: 1 page updated, 0 failed.

## After you import

    node scripts/verify-lesson-padlock.js

Expected: `OK - the lesson padlock opens a closed lesson`, at 8 checks against
the live page today and 9 against a page carrying the board 318 sheet. The count
moves because section 5 no longer pins four element ids; it asks whether the
page has a retry control of SOME shape, and says which. Pinning the ids would
have reported a correct board 318 import as a regression.

Run it BEFORE an import too, if you want to see the difference.

It does not grep the page, it runs it: a search for `lessonState` passes on a
body that defines the function and never calls it, which is exactly what was
wrong.

## Then tell Mrs Reed

Her 1.1 lesson is currently CLOSED, because her last attempt to open it closed
it. After the import she clicks the padlock beside "1.1" once more and it opens
this time. If any individual column under 1.1 still shows a padlock, those were
cleared by the earlier lesson-scope writes and each one needs its own click.
