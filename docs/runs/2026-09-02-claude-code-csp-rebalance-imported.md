# CSP answer keys: imported, verified live, and the two defects the check found

2026-09-02. Every number here was measured against the live storefront after the
import. Nothing in this note is taken from a report or from the sheet's own
verifier.

## What landed

All 35 CSP lesson quizzes, re-fetched from apcsexamprep.com after the Matrixify
import and re-extracted:

    pages checked                          35
    live bodies byte identical to the sheet 34 of 34 rows
    keys on target                         35 of 35
    all distinct                           true, largest group x1
    periodic keys                          none
    position locks                         none
    distribution                           A53 B52 C53 D52 of 210, even is 52.5
    content outside the question blocks    identical on all 35
    option text and feedback               210 questions, 0 changed

The 35th page, `ap-csp-course-bi1-collaboration`, was already on target and was
deliberately left out of the sheet. Re-uploading an unchanged body is pure risk.

Before this, 25 of the 35 quizzes shared two keys: `ABCDAB` on thirteen and
`CDABCD` on twelve. A student who learned `ABCDAB` had thirteen quizzes.

## DEFECT ONE, caught before the import: a key that repeats inside itself

The 35 targets were generated against three properties, and every one of them
compares keys to EACH OTHER:

    every key distinct     pairs of keys
    per-column balance     a column across keys
    overall balance        all keys together

None looks INSIDE a single key. So this satisfied all three and went into the
first sheet that was handed over:

    ap-csp-course-bi5-legal-ethical-concerns   CDACDA   = CDA twice

Learn three answers and the quiz is free.

**It was introduced by the fix for the previous problem, for the second time in
two passes.** Pass two optimised a letter histogram and produced 25 quizzes on
two keys. Pass three optimised the relationships between keys and produced a key
that is its own giveaway. A rebalance optimises what it is told to optimise, and
each new measure has been satisfied by a defect one level in from it.

Found by the repeating-block check on the branch for ledger #125, then
reproduced here with a separate implementation before anything was changed. The
generator now refuses any key with a period that TILES it, which for six
questions is `AAAAAA`, `ABABAB` and `CDACDA`. A partial echo like `ABCDAB` is a
two character tail at 1 in 16, below the bar `POSITION_MIN` already answers to,
and is left to distinctness, which is what made `ABCDAB` a problem in the first
place.

Two keys moved, and the corrected sheet is the one that was imported.

`scripts/csp-target-generator.js` is checked in rather than left in a scratch
directory, so the table is reproducible: it regenerates all 35 with zero
mismatches. Dropping the periodicity term from its repair predicate brings
`CDACDA` straight back and the emit guard refuses to write a file.

## DEFECT TWO, found by verifying the import: the rewrite reformatted the pages

The import was correct on every property above, and it also stripped **3,280
bytes of indentation across 23 pages**.

`rewriteBody` joined the rebuilt buttons and feedback divs with a bare newline,
so a page authored with ten space indentation came back flush left. Nothing
renders differently and nothing semantic moved.

**Every check was green.** They only ever looked at option semantics, and the
loss is BETWEEN the tags. This is the same defect the `opt-btn` path shipped on
the unit 5 sheet at 90 bytes a page. That one was fixed with gap preservation
plus a byte guard in `verifyOptBtn`. The `checkMCQ` path got neither, and it is
the shape all of CSP uses.

Both halves are now in place, and measured on the 35 real bodies rewritten to a
rotated key: 163 questions moved, 0 pages changed length, 0 refused.

Mutation tested in both directions:

    bare newline join, guard present   2,397 bytes lost, verify refuses 34 of 35
                                       the 35th is the one page authored flush
                                       left, so the guard has no false positive
    bare newline join, guard removed   2,397 bytes lost, verify refuses 0
                                       which is what shipped

The smoke fixture was part of the blindness. Every case in it joined tags with a
bare newline, the shape `rewriteBody` happened to emit, so none of them could
see the defect. The new fixture is indented on purpose and asserts preserve
rather than impose: a flush left page must stay flush left.

The live pages are NOT re-imported to restore the indentation. It is invisible
to a reader, and re-uploading 23 bodies to change whitespace is risk with no
benefit. The fix stops the next sheet doing it.

## The verifier that found it was wrong first

The post-import check reported 300 semantic changes across 210 questions. More
flags than questions compared, which is arithmetically impossible for a
per-question check, so the checker was wrong before the pages were.

It was comparing `<span class="mcq-option-letter">A</span>` as part of the answer
text. That span is positional labelling and is the one thing a rebalance is
supposed to change. Stripping it: 210 questions compared, 0 changed.

Worth recording because the reflex on a red result is to believe it. The number
being impossible was the tell, and chasing it is what surfaced the indentation
loss sitting underneath.

## What this run did not establish

- The other 21 AP Cyber quiz pages are still UNMEASURED, not cleared. Only unit
  5's six extract a key. `keysFor()` reads `checkMCQ`, `KEY={...}` and `opt-btn`
  but not `ANSWERS={1:'C'}`, `ANSWERS={"q1":"B"}` or `checkQ(1,'A')`, which
  covers units 2 and 3 entirely. That is a parser gap, not a detector gap.
- The repeating-block DETECTOR is not duplicated in this pass. PR #434 adds it
  to `audit()` and covers the partial-echo case too. Two implementations of one
  rule in one file is how they drift apart.
