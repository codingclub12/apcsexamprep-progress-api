# The eleven exam claims the first pass left across Unit 1

**Agent:** Claude Code
**Branch:** `claude/ap-cyber-unit1-handoff-b10iwk`
**Sheets:** seven, all rebuilt against the CURRENT live bodies. Built, not imported.

## Why this exists

The proximity gate written for Topic 1.2 was never run against the other pages.
Run now, on live bodies rather than snapshots, it finds eleven claims about what
the exam does, on five pages that earlier work had signed off.

## A correction to PR #382

That PR's description said "1.3 | EK codes in front of students: 18 to 0" and
"1.5 | EK codes: 17 to 3". Both numbers were counted in the SOURCE of a
snapshot. Counted the way the house rule is written, in what a browser paints on
the live page, the real numbers are:

| page | painted EK, live -> after this sheet |
|---|---|
| 1.3 | 22 -> 9 |
| 1.4 | 16 -> 16 |
| 1.5 | 22 -> 8 |

So those sheets never took EK codes to zero, and 1.4's sheet does not move them
at all because its thinning pass is a separate build that has to follow the
lesson import. Saying "18 to 0" was wrong and it was wrong in the flattering
direction.

## What the sweep found, live

```
page        CED   EK  claims  answers leaked
1.1 lesson   75   28      3       0
1.1 ex1       0    0      1       0
1.2 lesson    0    0      0       0     <- closed, both sheets imported
1.3 lesson   19   22      1       0
1.4 lesson   10   16      4       0
1.4 ex1       0    0      2       0
1.4 ex2       0    0      2       0
1.4 lab       0    0      1       0
1.4 quiz      0    0      0       0
1.5 lesson   24   22      3       0
U1  exam      0    0      0       0
```

**Board task #137 is stale.** It says the 1.1 lesson leaks all ten CFU answers
on load. It does not: all ten `.cfu-feedback` containers ship `display:none` and
`document.body.innerText` contains none of the answer-key tells. Worth recording
how nearly this was misread: the inner `.cfu-feedback-explain` and
`-verdict` elements DO report a computed display other than `none`, because
`getComputedStyle` on a child of a hidden parent returns the child's own value.
Reading innerText is what settles it. The regression was fixed by the hotfix in
PR #373 and the task was never closed.

## The eleven, and what each became

Every one is the same shape: a correct teaching point wrapped in an assertion
about what an exam contains. The content stays; the assertion goes. A student
who is told the exam "always" does something, and then meets a question shaped
differently, is worse off than one who was told nothing.

**1.5, three.** "The AP exam specifically tests whether students understand that
AI tools require human oversight" (which also cited "CED Scenario 1E" to a
student); an "Example AP question" column header; "The AP exam angle: the arms
race concept appears in questions that ask...".

**1.4 lesson, three tip boxes.** "Why Grammar Checks Now Fail" asserted what
exam questions may describe and what the answer is "never"; "Prompt Injection"
asserted that if an exam question describes X the answer is Y; the third was a
label only.

**1.4 exercise 1, two.** A subtitle calling three skills "the three skills tested
most on the AP exam for Topic 1.4", and a tip box.

**1.4 exercise 2, one.** "AI-based attacks on the AP exam always involve THREE
elements".

**1.4 lab, one.** "Multi-stage AI attack questions on the AP exam always ask...".

**1.3, one.** Already handled by the existing module; confirmed removed.

## Evidence

```
seven sheets rebuilt against current live bodies
claims  1.3 1->0   1.4 4->0   ex1 2->0   ex2 2->0   lab 1->0   quiz 0->0   1.5 3->0
keys    MCQ, sequence order and match rows unchanged on every page
        1.4's dtb blanks and chips DO change, which is the realignment's own
        intended rewrite from the original 30 splices, and every blank still
        resolves to a chip in the built body
render  1.3, 1.4, 1.5 render checks pass, no answer painted on any
grade    ex1 14 correct vs 0 wrong   ex2 19 vs 5   lab 12 vs 0   quiz 5/5, 0 false positives
suites  apclaimgate ekprotect gatesabotage exsabotage exgate cyberquizgate
        encoding assertions, all pass
```

## A mistake worth recording

My first cross-page key check lumped every `data-correct` attribute together,
so it reported 1.4 as having moved a key. It had not: the difference was the dtb
item the realignment deliberately rewrites. A check coarse enough to confuse an
intended rewrite with a regression is a check that gets ignored, so the
comparison is now per widget type.

Also: three of these modules could not match `&#9998;`, the pencil that labels
every tip box, because their entity maps predate it. The build failed with
"anchor not found" about a string plainly on the page. Added to all three.

## Import order

Each sheet is MERGE and writes the whole body, so one page at a time, and
nothing else may be built against a page between its build and its import.
These seven are independent of each other and can go in any order, with one
constraint: **1.4's EK-thin pass must be built after the 1.4 lesson import
lands**, because it is a second sheet for the same page.

## Still open

- **Thinning.** 1.1 has 75 painted CED mentions and 28 EK codes, 1.5 has 24 and
  22, 1.3 has 19 and 22, 1.4 has 10 and 16. The 1.2 treatment ports to each: one
  framing mention where the topic starts, nothing in the content. That is the
  largest remaining piece of Unit 1 and 1.1 is the worst page.
- **1.1's two modules no longer apply** to the live bodies, because 1.1 was
  imported in an earlier pass. A fresh pass needs fresh anchors.
- `updateTracker` is scoped inside the `cfuSubmit` IIFE on 1.2 and 1.4, so four
  submit handlers throw after setting the verdict. Grading and feedback are
  correct; the score display and the scroll are not.
