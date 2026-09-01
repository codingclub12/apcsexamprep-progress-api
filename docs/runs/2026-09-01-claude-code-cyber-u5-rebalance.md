# AP Cyber Unit 5 answer keys: found, fixed, imported, verified live

2026-09-01. Every number here was measured against the live storefront, before
and after. Nothing in this note is taken from a report.

## The defect

All six AP Cyber unit 5 lesson quizzes, read off the live pages:

    5.1 ABDCB   5.2 ABCDB   5.3 ABCDB   5.4 ABCDB   5.5 BCADB   5.6 BCDAB

Three things wrong at once:

- **5.2, 5.3 and 5.4 are byte-identical keys.**
- **Question 5 is B on all six.** A student who notices "the last one is always
  B" scores a free point on six assessments.
- B is **40 percent** of the unit against an even 25.

## Why the audit did not catch it

`scripts/answer-key-audit.js` existed for exactly this, and reported **none** for
both of its checks. Its bars were "every answer the same" and "60 percent or more
on one letter". Every unit 5 quiz is 40 percent B, so it sails under both while
the pattern sits in the histogram the tool prints.

The reason is structural, not a tuning mistake: **a distribution throws away
order**, and order is where this defect lives. "40 percent B" and "ABCDB every
time" are different facts and only one of them is visible in a histogram.

## What was added

Two checks that read the ORDERED key, in PR #438:

- **identical keys** shared by two or more activities, requiring 3+ questions,
  since a pair of 2-question quizzes matching is coincidence;
- **position lock**, a question index carrying the same letter on every activity
  that has one, minimum 4 activities. Three in a row is 1 in 16 by chance and
  flagging it would teach people to skip the check; four is 1 in 64, and unit 5
  at six is 1 in 1024.

Both fire on the real data and stay silent on varied keys.

## What was fixed

`rewriteBody` only understood the `checkMCQ` shape, and every unit 5 quiz uses
`opt-btn`, so the tool could see the defect and not act on it. PR #440 added
`rewriteBodyOptBtn` and `verifyOptBtn`.

That shape is kinder to permute, and it is worth saying why. In `checkMCQ` the
correct letter is an argument in the handler call and the feedback is a sibling
div keyed by letter, so moving an option means moving three things related only
by a naming convention. In `opt-btn` every option is one self-contained button
carrying `data-correct`, `data-fb` and its own text, so reordering carries all
three automatically. The only thing that changes is the letter printed in the
`opt-letter` span, which is positional labelling rather than identity.

## THE BUG THAT ALMOST SHIPPED, AND WHAT CAUGHT IT

The first generated sheet was wrong. Every page **lost exactly 90 bytes**: the
permuted buttons were rejoined with a bare newline instead of the source
separator, dropping 6 spaces across 3 gaps in each of 5 questions.

**Every answer check passed.** They only ever looked at option semantics, and
indentation is not semantics. The built-in verifier said the sheet was sound.

It was caught by an independent script written to parse the CSV back the way
Matrixify reads it and diff each row against the original, including everything
OUTSIDE the buttons. That check now lives in `verifyOptBtn` rather than in a
scratch directory, and is mutation tested by reintroducing the bare-newline join:
five pages fail and no file is written.

The lesson is the one this whole day kept producing. A verifier only refuses what
it was told to look at, and "the tests passed" is not the same fact as "the
output is right".

## How the bodies were obtained without risking a live page

A Matrixify body update needs the RAW body. The rendered page cannot be used as
a source: it carries theme nav, popups and Klaviyo that are not in the page
content, so uploading one injects the nav INTO the body.

There is no Shopify token in the agent environment, so a script cannot fetch
bodies directly, and pulling six 35KB bodies through a model and retyping them
is a transcription risk no verifier can catch, because both sides of the
comparison would be the same transcription.

What worked: the Admin API confirmed the body's exact first and last bytes, which
showed that Dawn renders `{{ page.content }}` verbatim inside `<div class="rte">`.
So each body was taken as a **byte-exact slice of the curl-fetched file**, with
structural guards (starts with the same token, ends with the same token, 5
questions, 20 options) refusing anything that did not match.

## Targets

Deliberate, not random, so a rerun produces the same file and a reviewer can
check the intent. Every key distinct, no position shared across all six, and the
unit at A8 B7 C7 D8 of 30 against an even 7.5.

`5.4` lands on its current key and was therefore **left out of the sheet
entirely**: re-uploading an unchanged body is pure risk, since it can clobber an
edit made since the pull.

## Verified live after the import

Re-fetched all six pages and re-extracted:

    page   live key   expected   correct answer + feedback   non-button bytes
    5.1    CDABD      CDABD      unchanged                   identical
    5.2    DABCA      DABCA      unchanged                   identical
    5.3    BCDAC      BCDAC      unchanged                   identical
    5.4    ABCDB      ABCDB      unchanged                   identical   (not imported)
    5.5    DACBA      DACBA      unchanged                   identical
    5.6    CDBAD      CDBAD      unchanged                   identical

    identical keys : none, all six distinct
    position locks : none
    distribution   : A8 B7 C7 D8 of 30

The non-button byte comparison is the one that matters most: it proves no page
was truncated and no theme markup was injected into the page content.

**"Always guess B" scored 40 percent on unit 5 this morning. It scores 23 percent
now.**

## THE SAME CHECK IMMEDIATELY FOUND SOMETHING BIGGER

The CSP course was rebalanced in an earlier pass under the OLD checks only. Run
the new identical-key check over its 35 targets and:

    ABCDAB   13 quizzes
    CDABCD   12 quizzes

**Twenty-five of thirty-five CSP quizzes share two keys.** Verified live, not
inferred from the targets table:

    ap-csp-course-bi1-collaboration                   ABCDAB
    ap-csp-course-bi2-binary-numbers                  ABCDAB
    ap-csp-course-bi1-identifying-correcting-errors   CDABCD
    ap-csp-course-bi2-data-compression                CDABCD

The distribution is almost perfectly even: A51 B51 C53 D55 of 210, against 52.5.
There is no position lock, because the two patterns alternate. It passes every
check that existed before today, and it is worse than the unit 5 defect that
prompted them: a student who learns ABCDAB has thirteen quizzes.

**It was introduced by the fix for the previous problem.** The earlier pass was
asked to even out a letter distribution, and it did that perfectly by assigning
two rotations across the whole course. The measure improved and the thing the
measure stood for got worse.

That is the real lesson of this note, and it outranks the unit 5 story. A
rebalance optimises what it is told to optimise. Told only about a histogram, it
will happily produce a course where a quarter of the quizzes are the same quiz.
The ordered-key checks are not a nicety on top of the distribution check; without
them the distribution check is actively dangerous.

Fixing CSP needs its own pass and its own sheet, with targets chosen so that no
two quizzes share a key. Unlike unit 5 no new code is needed: CSP uses the
checkMCQ shape that `rewriteBody` has always handled.

## Still open

- The other 21 cyber quiz pages are NOT cleared, they are UNMEASURED. Only unit
  5's six extract a key. Unit 4's five carry `checkMCQ` and yield nothing, and
  units 1 to 3's sixteen carry no answer markup in the served HTML at all. That
  gap is worth its own pass; "no bias found" there would be a false statement.
- CSP, above: 25 of 35 quizzes on two keys, live right now.
