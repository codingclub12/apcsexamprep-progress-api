# Task 130 confirmed, and the audit that should have found it was blind

Swept task 130, "Cyber 5.2, 5.3 and 5.4 quizzes all share the answer key ABCDB",
against the live storefront. Unlike task 137 earlier today, this one is real. It
is also larger than the ticket, and the reason nobody caught it earlier is a gap
in `scripts/answer-key-audit.js` rather than a gap in attention.

## What is live

All six unit 5 quizzes pulled from the public render, every one valid JSON, none
touched since 2026-07-29:

```
5.1  ABDCB
5.2  ABCDB  ┐
5.3  ABCDB  ├─ identical
5.4  ABCDB  ┘
5.5  BCADB
5.6  BCDAB
```

The ticket names the three-way collision. Two further facts sit underneath it:

```
B across unit 5:  12 of 30 = 40.0%   (even would be 25%)
Q5:  B B B B B B                     same answer on all six quizzes
```

A student who always answers B scores 40 percent on unit 5 and 100 percent on
question 5. That is the same class of defect `answer-key-audit.js` was written
for after a CSP quiz was found with all six answers B.

## Why the audit could not see it

The auditor understood two answer shapes: `checkMCQ('q1','A','C',...)`, where the
correct letter is the third argument, and `KEY={"e1":"D"}`. AP Cyber unit 5 uses
a third:

```html
<button class="opt-btn" data-correct="1" data-fb="..."
        onclick="u5l2quizAnswer(this,3)"><span class="opt-letter">C.</span>
```

Correctness is an attribute, the letter is in a child span, and the only thing
binding options into a question is the index in the onclick. One regex over the
handler call reads the other two shapes and reads nothing here.

Cross-referencing the generation column in `docs/cyber-quiz-audit.md`, the
auditor could see `checkMCQ` (5 pages) and was blind to `answers-num`,
`answers-str`, `checkQ` and `opt-btn`: **22 of the 28 keyed AP Cyber quiz
pages**. The unit 5 defect was found by a human reading pages in the 08-26
audit, which is exactly what the tool exists to make unnecessary.

## What changed

`keysFor()` now understands `opt-btn`. It groups by (handler prefix, question
index), reads the letter off whichever option carries `data-correct="1"`, and
names the activity after the handler so two quizzes on one page do not merge.

A question is counted only when EXACTLY ONE option is flagged. Zero or several
is a different defect, and folding it into a distribution would corrupt the
number the tool exists to report.

Nothing about the two existing shapes changed, and no page was touched.

## Evidence

The parser was checked against the live bodies by a second, independent
extraction written separately. All six keys agree exactly, which is stronger
than either method alone.

Four mutations, each caught by a named assertion:

| Break | Caught by |
|---|---|
| Accept a question with several options flagged | two-correct test |
| Accept a question with none flagged, guessing the first | no-correct test |
| Collapse the activity name so two quizzes merge | activity-naming tests |
| Let opt-btn clobber a key an older shape produced | clobber-guard test |

The fourth is worth naming. On the first mutation pass it changed nothing, which
meant the clobber guard was untested and could have been wrong in either
direction without anybody noticing. A handler named `examAnswer(this,N)` yields
the activity `exam`, colliding with the `KEY={...}` shape. The test added for it
is the reason that mutation now fails.

22 assertions in `smoke:answerkeys`, 357 across the eight suites run.

## Still open, and deliberately

**The defect itself is not fixed.** This change makes it visible and makes a
rebalance sheet possible; it does not move a single answer. Permuting options on
live graded quizzes during the first week of school, with 453 attempts in the
last 24 hours, is not something to do at 11am on a judgement call. The tool's own
header names the risk: marking a wrong answer correct is the one mistake worse
than the bias.

**The rebalance path for this shape is not built.** `rewriteBody` still only
knows `checkMCQ`. Teaching it `opt-btn` means moving each button with its
`data-correct`, `data-fb` and text glued together and relabelling only the
`opt-letter` span, then proving the correct answer is unchanged. That is the
next piece, and it should land before any sheet is generated.

**The other three shapes are still invisible.** `answers-num`, `answers-str` and
`checkQ` cover 17 more pages. Adding them was left out to keep this change
reviewable, and it is the obvious follow-up.
