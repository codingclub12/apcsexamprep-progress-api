# 2026-08-24 Claude Code: AP CSA course build, overnight

## What changed

Two things, both on `claude/google-drive-integration-e9v8od` behind draft PR #292.

### 1. Debugging exercises: 1 of 53 lessons, now 53 of 53

The free student-facing course had `exercise-1` complete for all 53 lessons and
`debug` authored for exactly one (4.4). This adds the other 52, split per unit
as `seed/csa-debug-unit1.js` through `seed/csa-debug-unit4.js` matching the
existing `seed/csa-exercises/unitN.js` layout. 4.4 stayed inline so its
generated expected outputs would not churn.

The authoring rule: every planted bug is the mistake a real student makes on
that topic, left in code that compiles and runs. Never a typo, never a compile
error. A bug that stops compilation teaches how to read `javac` and nothing
else.

### 2. Teacher kit generator, and Unit 2 authored against it

`scripts/build-csa-teacher-kit.py` plus `scripts/csa_kit/` generates the full
per-topic kit in the Unit 1 pilot's shape: Teacher_Guide, Day N teacher and
student decks, Day N guided notes and answer key, and the topic quiz and key.

**All four units are authored in full: 38 topic folders, 419 files.** Unit 1
already shipped as the pilot; Units 2, 3 and 4 were built this session
(Selection and Iteration, Class Creation, Data Collections).

## Evidence

Not self-reported. Three independent gates, all run in this session:

```
$ node scripts/verify-csa-debug-exercises.js --write
  270 verified case outputs across 53 exercise(s)

$ python3 scripts/verify-csa-kit-examples.py --unit 2
  compiled 24 worked example(s)
  ran 24 of them against their authored stdin
  every worked example compiles, and every runnable one matches its OUTPUT panel.

$ python3 scripts/verify-csa-kit-examples.py --unit 3
  compiled 18 worked example(s)
  ran 18 of them against their authored stdin
  every worked example compiles, and every runnable one matches its OUTPUT panel.

$ python3 scripts/verify-csa-kit-examples.py --unit 4
  compiled 34 worked example(s)
  ran 34 of them against their authored stdin
  every worked example compiles, and every runnable one matches its OUTPUT panel.

$ python3 scripts/build-csa-teacher-kit.py --unit 2   # 132 files
$ python3 scripts/build-csa-teacher-kit.py --unit 3   #  99 files
$ python3 scripts/build-csa-teacher-kit.py --unit 4   # 187 files
```

The worked-example verifier caught two wrong numbers of mine before they could
be projected in front of a class: a 4.2 slide claiming three values above a
threshold where the answer was two, and a 4.15 slide claiming seven insertion
sort comparisons where the answer was five. Neither was findable by re-reading
the content file. That is the entire argument for running the code rather than
reviewing it.

The debug verifier compiles and runs every reference solution under JDK 21 and
**also proves each buggy starter fails at least one case**, which for a
debugging exercise is the whole point. The worked-example verifier enforces the
promise every slide makes ("Complete and runnable as shown") by running the code
and diffing against the OUTPUT panel.

Decks were verified by rendering, not by inspection: `libreoffice-impress` was
installed, decks converted to PDF and rasterised, and slides read as images.
That caught three real defects that no amount of code review would have found:

- a drop shadow on all text, inherited from the `<p:style>` element python-pptx
  attaches to every autoshape
- code blocks whose first line was centre-aligned
- OUTPUT values printing on top of their own card label

All three are fixed.

## Why Unit 3 is taught differently

Units 1 and 2 fail loudly. Unit 3 fails silently: the class compiles, looks
textbook-correct, and every getter returns 0 or every count returns 1. A student
whose only debugging technique is reading the error message has nothing to read.
Every break-it slide in Unit 3 therefore demonstrates a bug that produces no
message at all, and three of them deliberately teach one rule from different
angles: 3.1, 3.2 and 3.4 are all "one place for each fact", while 3.3, 3.8 and
3.9 are all "which variable does this name actually reach".

3.6 plants a half-fix rather than a fully broken class (the getter copies, the
constructor does not), because that is what students actually produce.

## The CI failures, and what they were

Two real defects, both mine, both caught by the repo's own suite rather than by
me. `smoke:csadebug` 1.3 found that only `unit-4` declared `debug` in COURSES;
adding it for Units 1 to 3 moves PACE and not any student's percentage, because
`pct = earned / graded` sums over ATTEMPTED items (docs/gradebook-contract.md).

The second is worth recording properly. `smoke:csadebug` 4.2.7 found an answer
leak I would never have found by reading: exercise 2.7 prints a cumulative
sequence, so the expected output for the hidden case n=2 is a literal substring
of the visible case n=5 output. A student could read the hidden answer off the
sample they are shown. Every hidden input in that exercise is now larger than
the largest visible one, and the constraint is commented for whoever authors
the next unit.

All 99 offline suites were run locally before pushing the fix, because
`utils.js` is read widely enough that a second red run would have cost more
than the wait. CI confirmed green on that commit.

## Method worth keeping

**The design system was extracted, not guessed.** `Day1_Deck_TEACHER.pptx` for
topic 1.1 was pulled out of Drive and read with python-pptx. Every colour, font,
size and coordinate in `csa_kit/deck.py` came out of that file, including the
code panel's syntax colours (keywords `7FB4FF`, numbers `F0C674`, ground
`0F2233`) and the card geometry. Generated units are therefore identical to the
pilot rather than a lookalike.

**One content source drives every surface.** The deck, the guided notes, the
answer key and the quiz for a topic all come from one dict. The student notes
truncate each key idea mid-sentence and blank the vocabulary table; the key
prints the answers underlined. They cannot drift apart because there is only one
of them.

**The board and the homework agree.** Each topic's "now break it" slide
demonstrates the same bug as that topic's graded debugging exercise, with
matching wording. A student sees it on the projector and meets it again that
evening as a graded item.

## Deliberate constraints

- **No infinite loops or unbounded recursion in any exercise.** The verifier
  runs starters under a 15 second timeout, where a hang is indistinguishable
  from a broken harness. A missing base case in 4.16 would make the exercise
  about reading a stack trace; a base case returning the wrong *value* is the
  mistake that actually appears on student work, so that is what is planted.
- **Generated kit output is gitignored.** The content source is what is tracked.

## Still open

- `exercise-3` (FRQ) is still 1 of 53. It needs page infrastructure that
  `debug` already had (`lib/csa-debug-pages.js`), so it is a larger job than
  authoring content.
- `exercise-2` is Unit 4 only.
- Nothing has been uploaded to Drive. The 419 generated files sit in
  `build/csa-kit/` and are gitignored; putting them beside the Unit 1 folders
  is a decision for Tanner, not a default.
- Nothing has been imported to Drive or Shopify. Per CLAUDE.md every Shopify
  page change ships as a Matrixify sheet, and nothing here needed one yet.

## Pacing decisions recorded

Tanner settled two open questions this session, and the CSA Year Map artifact
was updated for both: Unit 4 gets **two** test days (multiple choice, then free
response), and the mock exam runs across **two** days rather than one Saturday
session. Traditional model now commits 155 of ~160 available days; block commits
74 of ~79.

The block model only fits because checkpoint quizzes open a block rather than
consuming one. Give them their own periods and the year hits 79 with zero float.
That is worth stating in the teacher guide rather than letting a block teacher
discover it in March.
