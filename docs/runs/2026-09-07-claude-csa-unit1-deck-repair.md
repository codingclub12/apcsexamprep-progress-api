# AP CSA Unit 1 teacher bundle: repairing the false "complete and runnable" claims

2026-09-07. Board 262. Branch `claude/csa-unit1-deck-repair`.

## Why this exists

Tanner was about to send the CSA Unit 1 teacher bundle to a purchaser. The 56
decks in Drive were built before `scripts/csa_kit/` existed, by a generator with
no fit guard, and they carry statements that are not true.

He asked for a full fix and I proposed regenerating Unit 1 through the kit. He
pushed back: he already has the Unit 1 preview in Drive, and a rebuild changes
every slide of something people have seen. He was right and I had over-scoped it.
Every defect found here is a string, so this repairs the text and touches nothing
else. The rebuild is still the better end state and is still board 255.

## What was actually wrong

A worked example is split across two slides when it does not fit. Each half was
captioned "Complete and runnable as shown."

The interesting part is that the caption is not always false:

| claim | instances | true | false |
|---|---|---|---|
| caption "Complete and runnable as shown." | 28 | 2 | 26 |
| speaker note "A complete, runnable program." | 27 | 7 | 20 |

So a blanket find-and-replace, which is what the first version of the repair
script did, would have turned nine true statements into hedges. The script
decides per slide by writing that slide's code to a file and asking `javac`.

The split is also invisible, and that is worse than the caption. On the
"2. USING IT" slides both halves declare the same class: one slide is
`public class Geometry` holding `area` and `perimeter`, the next is
`public class Geometry` holding only `main`, which calls `Geometry.area`. A
student who types the second slide gets "cannot find symbol". Nothing on either
slide says the `main` belongs inside the class above. Union the members and it
compiles and runs, so the programs are right and only the presentation is wrong.

One code defect, on Topic 1.1 slide 10, the first worked example in the bundle:

    System.out.println("Step 2: spread the peanut butter"
    );

It compiles, and it reads as broken code in the worst possible place.

## What changed

60 edits across 15 of 56 decks: 26 captions, 12 headings, 20 speaker notes, and
2 rejoined lines. Both roles are affected, so the student decks were repaired
too; only the speaker notes are teacher-only.

Nothing else moved. Code panels are byte-identical except the two intentional
joins, slide counts are unchanged at 924, and every deck is backed up beside
itself as `<name>.orig.pptx`.

## Evidence

Re-derived from the artifact rather than from the generator, by
`scripts/verify-csa-unit1-decks.py`, which recompiles every code panel and
asserts the surviving claims are true:

    files 56  slides 924
    surviving TRUE captions: 2   surviving TRUE notes: 7
    FAILURES: 0

Independently, unioning the class members across each Day 1 deck's code slides
and running the result: 14 of 15 programs compile and run, and 12 of the 14
printed OUTPUT panels match the real output exactly. The two that do not match
are both correct decks and a naive comparison:

- 1.11 prints `Math.random()`, and the deck says "a different number from 1 to 6
  on each run" rather than pinning a value.
- 1.1 splits its three output lines across three text boxes.

1.8 has no `main` at all, and the deck says so on the slide: "This class defines
a method but never calls it, so it produces no output."

No shape on any of the 924 slides extends past the slide edge, so the "cut off"
report was the split code and the type size, not geometry.

## Mutation testing, and one result worth keeping

Three mutations, each run against the full corpus:

| mutation | result |
|---|---|
| compile check always reports the claim false | GREEN, 58 edits unchanged |
| compile check always reports the claim true | RED, 58 edits to 0 |
| caption table widened to match the true slides | RED, 0 wrong edits applied |

The first one going green looked like a hollow guard and I said so before
checking. It is not. The true-claim slides are headed "THE COMPLETE PROGRAM",
which matches no caption rule, so the heading table excludes them independently.
Mutation 3 is the one that settles it: with the caption table deliberately
widened to cover those slides, the compile check still refused every wrong edit.
The check is load-bearing exactly where it matters, which is when the caption
rule is wrong.

The lesson is about the test rather than the guard. Mutation 1 asked "is this
check sufficient on its own" and the answer was no. The question worth asking was
"does this check hold when the other rule fails", and that needed a different
mutation.

## What is still open

- The split itself and the type size. Unit 1 decks sit at 13pt body copy and were
  built before the 14pt floor landed in #583. That is the rebuild, board 255.
- The WHAT TO NOTICE panel repeats identically across all halves of an example,
  so on the first half it discusses code that is not on screen yet. Redundant
  rather than false, and deleting content is the riskier edit.
- 14 teacher OUTPUT slides carry the same summary note about the worked example
  as a whole. Left alone: every one of those examples does assemble into a
  running program, so the note is defensible.

## Note on the deliverable

The repaired decks are NOT committed. This repository is public and these are
the paid teacher bundle. The zip went to Tanner directly; the repo carries the
repair script, the verifier and this note.
