# Units 2 and 3 have no topic drift. Two of the checks that would have found it did not work

2026-09-18. Board 371. Theme PR to follow, the fourth in the run that started at
board 355.

## Why this ran

Tanner: "Do the same audit on Units 2 and 3." The same audit is what boards 356
and 364 did to Unit 4: read every spec's topic number, title and handle against
the CED and against the live storefront, then read every unit-test question
against the topic it claims to assess.

## The answer to the question asked

**Units 2 and 3 are clean.** All 12 Unit 2 titles are College Board's wording
character for character. Unit 3 carries two rewordings, 3.6 and 3.9, and both are
the same topic under different words rather than a different topic. All 21
handles answer 200 on the live storefront. All 50 unit-test questions assess the
topic they are tagged with, with one borderline call recorded below.

So nothing in Units 2 or 3 needed repairing, and the interesting part of the day
is one layer up.

## What the audit actually found

Two checks in the teacher bundle claimed more than they did.

**`tools/check-unit4-ced.js` said its titles were the CED's, and five were not.**
Its header read "Source: docs/csa-ced-course-at-a-glance.txt ... They are the
authority". It was written during the Unit 4 repair, and for the eleven topics
that repair did not touch it copied the titles out of the specs rather than out
of the CED. 4.4, 4.5, 4.9, 4.10 and 4.12 are the platform's wording, not College
Board's: "Traversing Arrays" for "Array Traversals", "Algorithms with ArrayLists"
for "Implementing ArrayList Algorithms". Every one is a defensible rewording and
not one of them was declared as such, so the file was quietly asserting that the
CED says something it does not.

**`tools/check-tier-overlap.js` was worse, in two separate ways.** Its public
bank was one file, `seed/csa-lesson-content-unit4.js`, which holds six lessons,
all in Unit 4. It reported "60 public lesson-page items" and read like a sweep of
the public tier while 32 of the 38 lesson pages went unread and two of the three
unit tests were never opened. A Unit 2 test copied line for line off the Unit 2
pages would have passed it.

Then the metric. It scored a Jaccard overlap of bare words longer than three
letters, and measured across 75 test items and 451 public items:

    an honest pair, two different questions on one topic      0.750
    a public item pasted in with two words changed            0.667

The honest pair scores higher than the copy. No threshold on that scale catches
the one and clears the other, so the 0.6 limit was not conservative, it was
arbitrary. Both texts are mostly Java, and word overlap on Java measures the
language rather than the question.

## What shipped

`check-unit4-ced.js` became `check-ced-titles.js` and covers all 38 topics in
units 2, 3 and 4. The seven rewordings are declared beside the CED's own wording,
so a rewording stays a decision somebody made. **The 38 titles are re-derived
from the CED text on every run** and diffed against the constants, because a
hand-typed authority is precisely what went wrong the first time.

`check-tier-overlap.js` now reads the public bank from where the public items
actually live, the live page bodies, one fetch per lesson through
`lib/storefront-fetch.js`, plus the six-lesson seed bank on top. Both item shapes
are read: the four-option `apcs-ex` MCQ blocks and the short free-answer `mini`
items, which matters because 3.4 carries four minis and no MCQ block at all. All
three unit tests are compared. 451 public items against 75 test items.

The metric is five-word shingles, scored two ways:

                                           jaccard   containment
    highest across the two live sets         0.158         0.303
    a public item pasted verbatim            1.000         1.000
    the same with two words changed         >=0.486       >=0.654
    the same with its stem reworded         >=0.471       >=0.640
    the same buried in a 3x longer item      0.288         1.000

The last row is why both are kept. A copy padded to three times its length slips
under any workable Jaccard limit and containment reads it at 1. The limits, 0.30
and 0.50, sit between the honest maximum and the weakest case caught.

What it still cannot see, stated because a guard whose claimed reach exceeds its
real one is the whole subject of this note: a copy with every numeric literal
changed and every identifier renamed scores near zero on both measures. That is
not a threshold needing tuning. Such an item is structurally indistinguishable
from a legitimately new item on the same concept, and no text measure settles
which it is.

Both checks are mutation tested, nine cases and eight cases, each asserting on
the text of the refusal rather than only the exit code. A case going red for a
different rule would mean the rule under test is hollow.

## Evidence

    npm test                  38 topics re-derived and matched; every tag
                              resolves; 191 Java programs run, 0 refused
    npm run check:tiers       75 test items against 451 public items, 391 read
                              live from 38 pages. Highest jaccard 0.158,
                              highest containment 0.303
    npm run check:ced:mutation      9 cases behaved, clean tree green
    npm run check:tiers:mutation    8 mutations red, clean tree green
    node build.js             38 lessons, 602 files
    node build-unit-tests.js  25 MCQ per unit over 12, 9 and 17 topics

## Three things that went wrong while fixing this, all the same mistake

Worth writing down because each one is the defect this note is about, committed
inside the repair for it.

**The rewritten overlap check passed on an empty bank.** Its first run read
`spec.lessonUrl`, the key is `handle`, so it found no pages, fetched nothing, and
printed a clean pass over a bank of zero live items. It now checks that every
spec yielded a page and refuses a count mismatch.

**The CED parser was tested against a hand-typed copy of the line rather than the
line.** It splits the title off the page footer at "V.1 |", and in the real text
the space between "V.1" and the pipe is U+2003 EM SPACE. The pattern matched
nothing and the parser handed back "this Keyword V.1 |" as the CED's title for
3.9. It normalizes every kind of whitespace now.

**The mutation harness had the bug it was hunting.** Its runner pushed a default
`--api` in front of each case's arguments, and the checker reads the first
`--api` it sees, so the unreachable-page case ran against the real storefront and
passed. A mutation reporting the guard hollow when the harness was the broken one
is the worst of the three, because it reads as evidence.

## Also found, not fixed

**178 CED Essential Knowledge codes sit in student-visible text on 19 of the 38
AP CSA lesson pages**, concentrated in the two units this audit was about: 2.7
and 3.6 carry 21 each, 2.8 carries 16, 2.2 carries 15. Counted with
`lib/cyber-ek-density.js`, which is the module the convention says to go through.
Two caveats on the number. Its protected-placement rules were built for AP
Cybersecurity page structure and those structures do not exist on a CSA lesson
page, so nothing registers as protected and the 178 is an upper bound pending a
CSA-shaped read. But the placements are not marginal: "Apply EK 3.6.A.3:
same-class access to private fields" and "Privacy Risks of Storing Personal Data
(4.1.A)" are body prose a student reads. Board 373. Fixing it is a Matrixify job
across 19 live pages and is nobody's afternoon.

## One borderline call, recorded rather than smoothed over

Unit 3 mcq[6] shows a constructor whose parameter shadows an instance variable
and asks what the field holds afterwards. It is tagged 3.3, Anatomy of a Class.
An argument exists for 3.4, Constructors, and for 3.9, the this Keyword. It is
left at 3.3 because the question is about where a name resolves rather than about
constructing, and a teacher scanning the tag will find it where they expect. This
is a reading judgement and no check settles it.

## Still open

`build-unit-tests.js` has no `--check` mode, so the built docx are only as
current as the last hand run of the builder. Nothing verifies that what sits in
`out/` matches `tests/*.json`.

The tier check needs both repositories on disk and goes to the network 38 times,
so it stays out of `npm test` and runs by hand. Nothing forces it to run before a
premium assessment ships.
