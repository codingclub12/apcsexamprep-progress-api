# Cyber 3.1: ten questions labelled "of 13", and a port table that nearly got eaten

Date: 2026-08-31
Agent: Claude Code

## The defect

`ap-cyber-unit-3-lesson-1` serves ten graded blocks and scores them correctly out
of ten (`cfuState.total = 10`). Every visible label disagrees:

```
blocks:      10, data-num 1-10
cfuState:    total: 10            <- the GRADE is right
counters:    1 / 13 ... 10 / 13   <- the student is told there are 13
```

A student who answers all ten finishes on "10 / 13" and reasonably concludes they
missed three. Same family as the 1.2 defect and the opposite direction: 1.2
corrupted the grade while looking calm, this leaves the grade alone and
misinforms the student. Found by the gate, on the live page.

## What nearly shipped instead

The relabel transform written for 1.2 rewrote any `>n / m<` text node. That was
fine on 1.2. On this page it also matches the lesson's own content:

```html
<td class="port-num">143/993</td>   IMAP / IMAPS
<td class="port-num">20/21</td>     FTP
```

It would have rewritten those to `143/10` and `20/10`, corrupting the port
reference table on a networking lesson, from a transform whose entire safety
claim is that it only touches display text. Caught by inventorying every
`>n / m<` in the body before running anything, not by a test.

The fix is to anchor every rewrite to the element that owns the number:

- the per-question label, only inside `<span class="cfu-counter">`
- the running score, only inside the `cfu-score-num` / `score-num` span
- the tracker literal, only in `score + ' / N'`

Nothing is matched loose in the body any more. A number is a question label
because of the element it sits in, and that is now what the code keys on.

Two supporting changes fell out of it:

- Counters are relabelled BY ORDER, so the first counter span is question 1.
  That handles both label shapes without mapping a displayed number back to a
  block. It is only sound with one counter per block, so a mismatch between
  counter spans and blocks now throws rather than guessing.
- The label SHAPE is preserved. Unit 3 stays `n / N`, units 1 and 2 stay
  `Q n of N`. The transform corrects the number, it does not restyle the course.

## Evidence

- Diff against the real 198KB body is **exactly ten counter labels**, `/13` to
  `/10`, and nothing else. Byte count unchanged.
- `143/993` and `20/21` verified intact in the output AND inside the generated
  sheet.
- Byte identical across the whole body: every `id`, `data-num`, `onclick`,
  `data-step-id`, `data-answer`, and the `cfuState` literal.
- Gate: `cfu-counter-mismatch` -> **CLEAN**.
- Repo pre-import gates all pass: nothing unhidden, tags balanced (including
  `td`/`tr`/`table`), scripts compile, no new non-ASCII, answer keys unchanged.
- **1.2 regression:** re-running the rewritten transform over the original 1.2
  body reproduces byte for byte what was generated and imported this morning, so
  the page already live is unaffected.
- `smoke/cyber-cfu-relabel.js` now 19 assertions, including that a port table is
  not a question label, that both shapes are preserved rather than converted, and
  that mismatched counter spans are refused.
- Full CI-derived offline suite: **144 suites, all passed.**

## The sheet

`imports/2026-08-31/cyber-3-1-question-labels.csv`, one MERGE row, 200KB.

**Not imported.** Import once in MERGE mode and re-run the gate against the live
page afterwards; a stale read inside the ~64 minute edge cache tail is not a
failed write.
