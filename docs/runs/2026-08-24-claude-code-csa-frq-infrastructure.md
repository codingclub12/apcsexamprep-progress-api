# 2026-08-24 Claude Code: AP CSA FRQ infrastructure, and Unit 1 authored

## What changed

`exercise-3` (the FRQ) was 1 of 53 lessons and had no page builder, so unlike
`debug` it was build-then-author rather than pure authoring. This builds the
five pieces and authors Unit 1 in full.

```
seed/csa-frq/index.js        loader, shape checks, codeTestItems()
seed/csa-frq/unit1.js        15 of 15 Unit 1 lessons
seed/csa-frq/unit{2,3,4}.js  live stubs exporting an empty array
scripts/verify-csa-frq.js    compiles and runs everything, generates expectations
lib/csa-frq-pages.js         one page per entry
scripts/csa-frq-pages-csv.js the Matrixify sheet, publish and leak checks
smoke/csa-frq-pages.js       npm run smoke:csafrq
docs/csa-frq.md              the contract
```

Nothing about the Judge0 subsystem was touched. The three grading modes are
`lib/csa-code-modes.js`'s existing ones, unchanged.

## Evidence

```
$ node scripts/verify-csa-frq.js
  15 FRQ(s) verified clean against 76 cases.
  Every reference compiles and runs, no constant passes, and every rubric part is tested.
  18 declared mistake(s) were each proven to fail at least one case.

$ npm run smoke:csafrq
  24 passed, 0 failed

$ node scripts/csa-frq-pages-csv.js out.csv
  wrote 15 FRQ page(s), 309 KB of body, 76 cases, 46 hidden

$ all 102 offline smoke suites
  FAILED: none
```

## The guards were validated by breaking them, not by passing

Each of these was confirmed to FAIL when the thing it protects was deliberately
broken, then restored:

| guard | broken how | reported |
|---|---|---|
| reference leak | pasted a reference line into a hint | yes, named the line |
| rubric coverage | retagged every part-2 case as part 1 | yes, refused at require time |
| hidden case | made hidden inputs repeat a visible one | yes, refused at require time |
| constant cheat | gave hidden cases reordered inputs with identical output | yes, verifier only |

The fourth row is the interesting one. Reordering the three legs of 1.1 gives a
genuinely different input that produces byte-identical output. The loader
accepts it, because the inputs do differ. Only running the code shows that a
constant then passes every case. That is the argument for having both layers
rather than picking one.

## The defect worth remembering: coverage is not power

1.9 (Method Signatures) is the one Unit 1 topic a segment physically cannot
test, so it is the only `driver` entry in the unit. Its rubric part (c) is the
cast before dividing.

It passed everything. Four rubric parts, a case tagged for each, distinct
outputs per case, the reference compiling and running, no constant passing. And
part (c) was ungradeable: the harness computed `amount = people * pricePer` and
then asked `average(amount, people)`, so the division always came out even and
omitting the cast changed nothing. A student could skip the entire point and
score 4 of 4.

I found it by reading the generated outputs, which does not scale.

The fix is in two halves. The harness now reads an independent collected amount,
so the division does not divide evenly, confirmed directly: the missing-cast
version prints `17.0` and `14.0` where the answers are `17.6` and
`14.285714285714286`.

The second half is the general one. Entries may now declare `mutants`: named
wrong versions of their own reference, which the verifier proves FAIL at least
one case. Unit 1 declares 18 and all 18 are caught, covering the mistakes the
rubric rows actually name (late cast, swapped parameter order, substring
off-by-one, `==` on String contents, tax kept out of the change, percentage
divided before multiplying, reassigning an immutable's variable).

The mutant machinery was itself validated with a no-op control: a mutant that
renames a local variable and prints identical output. The verifier reports it,
which is what proves the mutants are being run rather than counted.

## The 1.6 migration, and what the parity check caught

1.6 was authored in `seed/csa-code-tests.js` before this bank existed. It moved
rather than being duplicated, because `code_test_cases` is keyed
`(course, lesson, item, seq)` and two definitions would race.

The move was checked rather than asserted: all six generated cases reproduce the
original hand-written expectations byte for byte. That check earned itself
immediately. It failed on the first run, and the failure was mine, not the
original's: the receipt subtracts tax from the change and my rewritten task text
said to ignore it. The old expectations were right and my new prose was wrong.
Without the parity check I would have shipped a question whose stated task and
whose grader disagreed.

`seed/csa-code-tests.js` is now an empty but live module, kept because
`scripts/seed-code-tests.js` requires it by name.

## The handle decision

Pages are `...-frq`, not `...-exercise-3`. `-exercise-3` means nothing to a
student or a search engine; `exercise-3` is the column the manifest denominates
at 4 points. `ACTIVITY_ALIASES` in `utils.js` reconciles the two rather than
bending either.

Safe because no live page ends in `-frq`, so it cannot reclassify anything
already published. Same test `-gap` had to pass. The smoke suite asserts the
alias did not reclassify `-exercise-1` or `-debug`.

`exercise-3` is now declared for `unit-1` in COURSES. Same reasoning recorded
there for `exercise-1` and `debug`: declaring an activity moves PACE, not any
student's percentage, because `pct = earned / graded` sums over ATTEMPTED items.

## Still open

- Units 2, 3 and 4 are stubs. 38 lessons to author. The infrastructure takes
  them without a wiring change, and `driver` mode is the right shape for most of
  Unit 3 onward now that the path is exercised by 1.9.
- Nothing has been imported. The Matrixify sheet generates and passes its own
  publish checks; importing it is a decision for Tanner, and per CLAUDE.md it
  ships as a sheet rather than an API mutation.
- `exercise-2` is still Unit 4 only.

## Note on the ledger

This session holds a read-only command token, so no claim was written for these
files and no task was closed. The digest was read at session start.
