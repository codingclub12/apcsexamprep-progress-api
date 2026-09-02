# AP CSA: does the gradebook price work that has no page? Almost entirely no

Board 165. 2026-09-02, Claude Code. Findings only; nothing was changed.

**The headline is a correction of my own first answer.** The first version of this
measurement reported three large defects. Two of them were mine, not the site's.
What survives is one gap of 90 points that was already filed as board 162.

## How this started

`GET /api/health` reports `reporters.ok: false` on production. That check asks a
narrow question: are there graded activities students complete where no score has
ever arrived? It lists 11, and four are AP CSA Unit 1:

    ap-csa unit-1 1.1 exercise-2
    ap-csa unit-1 1.2 exercise-3
    ap-csa unit-1 1.5 exercise-3
    ap-csa unit-1 1.7 debug

Three of those appeared to name an activity with no page on the storefront, and
the check joins `course_denominators`, so a denominator exists for each.

## The two findings that were wrong, and why

I searched the live handle list for pages ending `-exercise-3`, found zero, and
concluded that every AP CSA gradebook renders 53 columns for an activity that
exists nowhere, worth 212 phantom points. In the same pass I found 53 live
`-frq` pages that the manifest never mentions, and called those real work that
could never reach a gradebook.

Both were the same mistake counted twice, and `utils.js` says so plainly:

```js
const ACTIVITY_ALIASES = { frq: 'exercise-3' };
```

with a comment that had already anticipated the confusion: `frq` "is what the
page is called, because that is the word the student and the search engine both
use, and '-exercise-3' on the end of a URL means nothing to either. The GRADED
column is still exercise-3."

**The FRQ page IS the Exercise 3 column.** So there are no phantom columns and
no unpriced pages. My measurement matched the handle suffix directly instead of
going through `trailingActivity`, which is the function whose entire job is to
answer that question.

The script now reads the alias from the code that resolves it, and carries a
comment saying why, because the failure mode is a measurement inventing a defect
out of a naming convention.

## What actually survives

    columns the course config expects : 318
    columns with no page behind them  : 0

    priced points in the manifest     : 1007
    unit-1 exercise-2   15 entries       90 points   <- the only gap
    total                                90 points, 8.9 percent

    live pages nothing prices         : 0

15 Unit 1 lessons are priced for `exercise-2` and none of those pages exists;
38 of the 53 exist and all 15 missing are Unit 1. That is **board 162** from the
gradebook's side rather than the storefront's.

Unit 1's course config correctly omits `exercise-2`, so no column renders for it.
The 90 points still inflate `possible`, which is the whole-course denominator, so
AP CSA pace reads about 9 percent low. The GRADE is untouched:
`lib/gradebook-contract.js` computes `earned / graded` over attempted work only.

## The health-check signal, re-read

With the alias understood, the four CSA rows are ordinary. `1.2 exercise-3` and
`1.5 exercise-3` are students opening the FRQ page: a completion is recorded and
no score follows. Whether an FRQ can be auto-scored at all is a real question,
since an FRQ is free response and the zero-PII rule forbids storing what a
student types, so "completed, never scored" may be the correct behaviour rather
than a defect. That is worth someone's judgement and it is not a bug report.

## What this leaves behind

`scripts/csa-activity-page-gap.js` is the instrument, and it is worth keeping
even though it now finds almost nothing: it is the check that would have caught
board 162 the day the pages were priced, and it will catch the next activity
priced ahead of its pages. It reads the three authorities that can disagree (the
course config for columns, the manifest for points, a storefront handle capture
for what exists) and changes nothing.

The lesson is the one this repo keeps relearning, and it is now in the script's
own comments: a measurement that does not go through the code that resolves a
convention will confidently report the convention as a defect. That is the third
time today. Board 157 was a scan reading JavaScript string concatenation as dead
links, board 159 was a prefix irregularity read as unbuilt pages, and this was a
student-facing alias read as a missing column.
