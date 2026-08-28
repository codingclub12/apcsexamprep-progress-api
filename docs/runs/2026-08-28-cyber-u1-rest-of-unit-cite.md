# AP Cyber Unit 1: citations and exam claims on the other seventeen pages

Date: 2026-08-28
Agent: Claude Code
Branch: `claude/ap-cyber-unit1-handoff-b10iwk`

## What this is

The sitemap sweep found seventeen Unit 1 pages still carrying a citation or a
claim after the five lesson pages were done. This is the pass over those pages.

Sixteen sheets. The seventeenth page needed no edit, which is covered below and
is the most useful single result in this note.

## The standard, as Tanner set it

> I don't want to overclean the CED I just don't want it everywhere.

So the question asked of every occurrence was not "is this a citation" but "does
a student need this, and can they act on it". Three things came out of that:

**Codes go, the words they stand for stay.** Every code on these pages is a
prefix on a phrase that already carries the meaning. `1.1.C.1 - personal
information` becomes `Personal information`. The 1.1 lab and 1.1 exercise 2 are
built on exactly this: the dropdown a student picks from WAS the list of codes.
The task is identical afterwards.

**Pointers stay.** The case file's five stage headers read
`CED 1.3.A / 1.3.B / 1.3.C - Lesson 1.3.3 Wireless Attacks, ...`, which is a
coverage claim and a genuinely useful pointer joined by a bullet. The pointer is
the half a stuck student uses, and it survives.

**True statements stay true.** The study guide says the course names
"Collaborate" as one of four core skills, specifically including collaboration
with AI. That is checkable and correct. Only its framing moved, from what the
exam includes to what the course is built on. Deleting it would have been the
overcleaning this pass was told not to do.

## The thing that did not need a sheet

`ap-cyber-unit-1-scenario-practice` was flagged with FIFTEEN claims by the
sitemap sweep. Under the standard above it has ZERO, and no sheet was built for
it.

All fifteen flags were the words "Exam Tip:" over content like "Spear phishing =
targeted at a specific person or organization" and "Evil twin = fake Wi-Fi that
looks real". Those are study tips on a practice page. A heading that says a tip
is exam-relevant is not a claim about what the exam does, and the sweep counting
the heading as one is the sweep being blunt, not the page being wrong.

The unit exam is the same story at a smaller ratio: twenty tip boxes flagged, ten
of them real claims. The other ten are headings over a real distinction
("Deepfakes extend social engineering into audio and video", "know the phishing
hierarchy") and are untouched. Removing those would be removing the study guide
from a study aid.

## Why the claims are the defect, stated once

AP Cybersecurity is first administered in 2026. So "the two wireless attack
techniques most heavily tested", "appear on almost every practice exam" and "the
exam frequently tests" are not overstatements. They describe nothing that has
happened. Each one keeps the content attached to it and loses the frequency.

## The gate, and the fact that its first version was useless

`lib/cyber-cite-gate.js`. The lesson gate could not be reused: it asserts that
the coverage accordion SURVIVES and that "CED" still appears in source, because
on a lesson page that table is a teacher's audit surface. These pages have no
such table.

Its first version passed all nine of the first pages BEFORE any edit was made.
Their only trip was the "AP Exam Tip" heading, which this pass keeps on purpose,
so "AP exam wireless questions always give you a scenario" went straight through
it. **A check that passes a page before and after an edit has not checked the
edit.** The claim list is now the constructions actually found on these pages.

Rewritten, it immediately paid for itself three times:

- a second claim on 1.3 exercise 2, in the Part 3 section intro, nowhere near
  the tip box that reading had found;
- a claim on 1.1 exercise 2 inside the note explaining why the exercise was
  rebuilt;
- a stem on 1.1 exercise 2 citing 1.1.C that the reading pass had walked past.

Two bugs in the check itself, both found by testing it in the failing direction:

- the sentence window was `[^.!?]`, which breaks on the dot in "Topic 1.3". That
  split "The hardest Topic 1.3 AP exam questions combine two attack types" into
  two windows with "hardest" in one and "exam questions" in the other, so the
  claim was invisible on exactly the pages that name their topic. A period now
  ends a sentence only when a digit does not follow it.
- a first attempt at the "hardest ... exam questions" pattern also matched "Try
  the hardest practice set, then review the exam questions you missed", which is
  not a claim. Requiring the "AP" qualifier separates them.

`scripts/cyber-unit-sweep.js` takes the same window, so its numbers and the
gate's cannot disagree.

## Nothing graded moved, and how that is known

Graded-key extraction moved into `lib/cyber-page-gate.js` so every page shape
checks the same keys. The lesson-only list had never seen a quiz `ANSWERS` map,
a `"key": N` index or a `<option value>`, and this pass edits pages built on all
three.

`lib/cyber-exercise-gate.js` now also runs from the citation gate wherever a page
has a select. That matters more here than anywhere else in the project: these
pages grade in JavaScript by comparing option VALUES, and this pass rewrites
option LABELS. Nothing in a page connects the two. An edit that slipped from a
label into a value would leave a credited branch that never fires, the student
could not score the point however well they understood it, and nothing would
throw.

On the 1.1 lab, which has eight selects and thirty-nine painted codes, the
answer data (`tactic:`, `type:`, `senderKey:`) is byte-identical after the edit.

## Sheets

```
sheet             page                                              splices  CED   EK    claims
l1-ex1            ap-cyber-unit-1-lesson-1-exercise-1                     6  2>0   6>0    1>0
l1-ex2            ap-cyber-unit-1-lesson-1-exercise-2                    31  7>0  23>0    1>0
l1-lab            ap-cyber-unit-1-lesson-1-lab                           40  0>0  39>0    1>0
l2-ex1            ap-cyber-unit-1-lesson-2-exercise-1                     2  0>0   1>0    1>0
l2-ex2            ap-cyber-unit-1-lesson-2-exercise-2                     1  0>0   0>0    1>0
l2-lab            ap-cyber-unit-1-lesson-2-lab                            2  0>0   0>0    2>0
l3-ex1            ap-cyber-unit-1-lesson-3-exercise-1                     1  0>0   0>0    1>0
l3-ex2            ap-cyber-unit-1-lesson-3-exercise-2                     2  0>0   0>0    2>0
l3-lab            ap-cyber-unit-1-lesson-3-lab                            1  0>0   0>0    1>0
l3-quiz           ap-cyber-unit-1-lesson-3-quiz                           2  1>0   0>0    0>0
l5-ex1            ap-cyber-unit-1-lesson-5-exercise-1                     2  1>0   0>0    1>0
l5-ex2            ap-cyber-unit-1-lesson-5-exercise-2                     2  1>0   0>0    1>0
l5-lab            ap-cyber-unit-1-lesson-5-lab                            2  0>0   0>0    2>0
case-file-1       ap-cyber-unit-1-case-file-1                             5  5>0   9>0    0>0
intro             ap-cybersecurity-unit-1-introduction-to-security         3  0>0   0>0    2>0
exam              ap-cyber-unit-1-exam                                   10  0>0   0>0   10>0

(no sheet)        ap-cyber-unit-1-scenario-practice                       -    0     0      0
```

Counts are painted text, from `document.body.innerText` in Chromium. All sixteen
spliced bodies re-verified as a batch: zero, zero, zero, and no feedback painted
on load.

## Import order, and the one hazard

Each sheet is built against its own page and no other, so any order works, one
page at a time, MERGE.

**Except the unit exam.** `ap-cyber-unit-1-exam` is board task #136 (WO-7), in
progress and routed to chat, which will rewrite the same body for a different
defect: thirteen off-CED terms in the items. A Matrixify MERGE writes the WHOLE
Body HTML, so whichever of the two sheets lands second silently reverts the
first. Import `exam.csv` BEFORE any WO-7 sheet is built, or rebuild it against
the live body AFTER WO-7 lands. Do not hold both at once.

## Still open, and not this

- `updateTracker` is scoped inside the `cfuSubmit` IIFE on 1.2 and 1.4, so
  `matchSubmit`, `dtbSubmit`, `seqSubmit` and `crSubmit` throw a `ReferenceError`
  after setting the verdict. Grading, verdict and feedback are correct; the score
  display and the scroll are lost.
- 1.5 carries its Exit Ticket twice, both painted.
- WO-7 itself.
