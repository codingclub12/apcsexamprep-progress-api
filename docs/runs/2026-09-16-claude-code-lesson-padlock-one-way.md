# The lesson padlock could only close

2026-09-16, Claude Code, board #340.

## What was reported

Sharon Reed, third email on the same thread: "the 1.1 lab is still locked for my
students, even though I have unlocked it on my account." With screenshots.

She was right, she had unlocked it, and every attempt closed it again.

## What it was

On the teacher dashboard, the lesson padlock is rendered with `act=''`. The one
expression that decided its current state looked the lesson up as a COLUMN:

    colItem({unit:unit, dl:lesson, da:''})   ->   items["unit-1|1.1|"]

That key never exists. `undefined.locked` is falsy, so `cur` read `'on'` for
every lesson whatever its real state, and `open=(cur!=='on')` came out `false` on
every click.

So the padlock DISPLAYED the truth, because the header above it uses
`lessonState`, and clicking it sent the opposite. There was no click that opened
a lesson. Worse, a lesson-scope write CLEARS the rows under it, so each attempt
also deleted any per-column opens she had already made.

`lessonState` has been sitting beside `unitState` the whole time. The toggle just
never called it.

## How it was found, and what the wrong answer looked like

The first two rounds of this thread fixed two real things that were not this one:
a teacher resolving as anonymous, and a player reading a localStorage key nothing
writes. Both were genuine. Neither was what she was hitting.

The step that mattered was refusing to guess a third time. A 240-case
differential compared what the BOARD computes for the 1.1 Lab column against what
the student's route returns, across every gate arrangement a teacher can write,
with and without a manifest row:

    240 arrangements tested
    0 where the BOARD and the STUDENT disagree

That is what redirected the search. Given the rows, the server was right every
time, so the defect could not be in what the rows MEANT. It had to be in which
row got WRITTEN, which is one layer up and in a Shopify page body rather than in
this repo's runtime. Every server suite in this repo could have stayed green
forever.

The message she screenshotted was also checked against the live page body rather
than assumed: "Your teacher has not opened this activity yet" appears nowhere in
it, so it came from the player, so the server really had answered locked.

## Evidence

The page's own `toggleGate`, run in a vm against the live body:

    what the padlock DISPLAYS : lessonState = "off"
    what the click POSTS      : {"open":false,"lesson":"1.1","activity_type":""}

Against the fixed body, same fixture: `{"open":true,...}`.

`scripts/verify-lesson-padlock.js` runs the page rather than grepping it. A
string search for `lessonState` would pass on a body that defines the function
and never calls it from the toggle, which is exactly the state this page was in.
Run against LIVE before the import it fails two assertions, both about opening.

## What ships, and what deliberately does not

`matrixify/cyber-dashboard-lesson-padlock-pages.csv`, one page, built from the
LIVE body plus the one fix. Parse-back is byte identical at 106139 bytes.

It is NOT built from the repo mirror, and the generator is why. Its content-loss
check refused that sheet:

    cyber-dashboard: this import would DELETE 4 thing(s) the live page has and
    shopify/cyber-dashboard.html does not (element id rt-lesson, element id
    rt-ex, element id rt-quiz, element id rt-exam)

The mirror is 7122 bytes AHEAD of live with unimported work, and simultaneously
MISSING the live retry panel. Importing it would have fixed the padlock and
deleted four controls every teacher uses. That check earned its keep.

So the sheet carries one change and nothing else. The mirror keeps its authored
work plus the same fix, and reconciling the two is board #342 rather than a guess
made here.

## Still open

- **#342**: the mirror and the live page have diverged in both directions. Until
  that is reconciled, any sheet generated from the mirror will keep failing the
  loss check, which is the right outcome but not a resting state.
- **#341**: `page-body-csv.js` writes `Command: UPDATE`, `matrixify-preflight.js`
  defaults to `MERGE`, and the theme's CONVENTIONS.md says MERGE. Neither states
  why. UPDATE was kept here because it is what the generator emits and what a
  previously shipped sheet from the same generator used, and because UPDATE
  refuses to create a page where MERGE would happily invent one from a wrong
  handle. That reasoning is mine, not the repo's, and somebody should settle it.
- The three rounds of this thread each found a different real bug. It is worth
  asking what else in the teacher UI writes a value it never reads back, because
  the class of defect is "the control displays one state and sends another" and
  only the lesson padlock has been checked.
