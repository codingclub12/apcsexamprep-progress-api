# 1.2 quiz badge still said twelve

**What was asked.** Where the pages said 9 questions, do they now say 5?

**The answer, and the correction.** 1.1 yes. 1.2 no, not everywhere, and the
2026-08-28 commit that said "the pages were the last place still carrying the
old counts" was wrong.

## Live, at 04:30Z

| page | intro sentence | badge row |
| --- | --- | --- |
| `ap-cyber-unit-1-lesson-1-quiz` | 5 questions, about 10 minutes | no badge row |
| `ap-cyber-unit-1-lesson-2-quiz` | 5 questions, about 10 minutes | **12 Questions ... ~25 min** |

So the 1.2 quiz page was contradicting itself on one screen: the corrected
sentence, and two lines below it a badge chip still promising twelve questions
in twenty five minutes.

## Why the first pass missed it

1.1 has no badge row. A fix built against 1.1, verified on 1.1, and assumed to
generalise to 1.2 looks complete from every angle except the one that matters.
The splice on 1.2 did exactly what it was aimed at, and reported success,
because a splice can only ever prove it hit its own anchor.

The check that catches this is not reading harder. It is counting every
student-visible number on the page and comparing each one against what the API
actually serves, so the page has to agree with the server rather than with the
sentence someone remembered editing.

## The sweep, run the other way

All 32 cyber Unit 1 pages from the store's sitemap, every count compared against
the five the quiz API serves for 1.1 through 1.5 (`total=5 pool=5 questions=5`
on all five, and `scripts/seed-cyber-denominators.js` prices all five at 5).

Everything else that is not five is a different instrument and correct as
written:

- 3-question bellringers on the five lesson pages
- the 20-question unit exam, on `ap-cyber-unit-1-exam` and in the cross-links
- the 15-question scenario practice
- "all 4 questions" inside a lab station's JS alert, which is a station and not
  a quiz

`ap-cyber-unit-1-lesson-2-quiz` was the only remaining disagreement in the unit.

## Shipped

`imports/2026-08-29/l2-quiz-badge-count.csv`, one row, MERGE, page 132288872663.
35859B to 35858B. Two splices, both anchors unique in the live body:

- `<span class="ex-badge">12 Questions</span>` to `5 Questions`
- `<span class="ex-badge">~25 min</span>` to `~10 min`

Gate: 0 painted CED, 0 painted EK codes, 0 exam claims, every graded key
unchanged, 0 feedback boxes painted on load, 1 sentence changed.

The already-applied sentence splice was removed from the module's table rather
than kept for the record. An anchor that matches zero times aborts the build,
so the table has to describe what is still wrong with the page, never what was
once wrong with it.

## Still open

- **No mechanical count-agreement check exists.** The sweep above was a one-off.
  `scripts/cyber-unit-sweep.js` is the sitemap-driven live tool and is where
  this belongs: for every quiz page in a unit, compare painted counts against
  what `/api/quiz/<course>/<unit>/<lesson>/quiz` serves, with the other
  instruments allowlisted so a clean unit reports zero. Not built.
- Units 2 through 5 have never been swept for counts, citations, or claims.
- 6 exam claims across 4 Unit 1 pages, sheet not built.
