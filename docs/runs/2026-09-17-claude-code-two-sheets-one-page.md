# Two sheets for one page, and the check that forbade the fix

2026-09-17, Claude Code, boards 318, 340, 342.

Tanner asked whether the dashboard sheet was imported. It was not, and the
answer that mattered is that the sheet he was handed on the 15th had gone stale
in the two days since.

## What happened

`/pages/cyber-dashboard` moved on 2026-09-16 at 19:54 local. Another session
shipped the lesson padlock fix, board 340: clicking a lesson padlock sent
`open:false` every time, so a teacher could close a lesson and never reopen it,
and each attempt also cleared the per-column unlocks underneath. A real report
from a real teacher.

The board 318 sheet was generated from the 2026-09-07 body. Importing it
yesterday would have reverted that fix. That is the hazard this repo already has
a run note about, and the reason the runbook says to run the check BEFORE the
import and not only after. It worked: the check said 106139 bytes,
`updated_at 2026-09-16`, and the sheet was built against 104858 bytes from the
7th.

## Why the fix was easy, and why that is worth writing down

The repo mirror was never the problem. `shopify/cyber-dashboard.html` on `main`
carries the rollup, the three-mode retry control, the lock disclosure AND the
padlock branch, because each change landed there through a PR. Only the
generated sheet was stale. Regenerating from the mirror produced one file that
carries everything, and the loss guard run against today's live page names four
deletions and only four, all of them the dead switches that go on purpose.

So a stale sheet is a regeneration, not a reconciliation, as long as the mirror
is the thing everybody edits. It stops being easy the moment somebody edits a
live page by hand.

## The part that would have bitten next

`scripts/verify-lesson-padlock.js` section 5 asserted that `rt-lesson`, `rt-ex`,
`rt-quiz` and `rt-exam` SURVIVE, with a comment explaining that the repo mirror
was missing them and an import built from it would delete them.

The mirror is not missing them. It deletes them on purpose. They are the four
dead SAVING SOON switches from board 302: they wrote to page state and called
renderAll, so a teacher turning Quizzes off watched the grades move and changed
nothing a student could do. The board 318 sheet replaces them with three modes
that PATCH the class and redraw from the server's answer.

So the check would have gone RED on a correct import and reported the fix as a
regression. Tanner would have clicked import, run the verifier the other runbook
told him to run, and been told he had broken something.

It is the same shape as the mistake I made on the 15th and the same shape as the
one this repo's deploy gate was built against, three for three in a week:

    the gate's first manifest   asserted something true before AND after
    my lab denominator gate     asserted something true only BEFORE the change
    this padlock check          asserted something that FORBADE the next change

Section 5 now asks whether the page has a retry control of some shape and says
which one it found, failing only when there is none. It passes 8 of 8 against
the live page today and 9 of 9 against the bytes the board 318 sheet writes.
What it was protecting, that a sheet must not silently drop the retry panel, is
still protected.

## Two sheets for one page

`matrixify/cyber-dashboard-lesson-padlock-pages.csv` is deleted in this commit.
It is already imported, and it carries neither the rollup nor the retry control
nor the lock disclosure, so importing it after the 318 sheet would take all
three off the page in one click. Same reason the 2026-09-11 session deleted the
retry-panel sheet: two live sheets for one page is how a fix gets reverted by
somebody being helpful. The runbook keeps the steps as a record and says at the
top that the file is gone.

## Board 342 is answered rather than done

It reads "shopify/cyber-dashboard.html mirror is missing 4 elements the LIVE
page has". The premise is wrong in the same way the verifier's comment was: the
mirror removes them deliberately. What was real underneath it, that the mirror
and the live page had diverged and a stale sheet sat between them, is what
today's regeneration closes.

## Evidence

Against the exact bytes the sheet writes:

    scripts/verify-dashboard-rollup-live.js --file    6 checks
    scripts/verify-lesson-padlock.js --file           9 of 9
    npm run smoke:tchdashpage                         94 passed
    npm run smoke:dashlocktoggle                      13 passed
    matrixify-preflight --expect-command UPDATE       clear to import

Against the live page as it is now:

    scripts/verify-lesson-padlock.js                  8 of 8, board 340 is live
    scripts/verify-dashboard-rollup-live.js           FAILS, still a mean of
                                                      percentages, which is the
                                                      thing the import fixes

## Still open

The import. One page, one row, and it is the last piece of what a teacher was
told would be fixed on 2026-09-11.
