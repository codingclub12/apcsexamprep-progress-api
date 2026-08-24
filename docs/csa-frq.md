# AP CSA FRQ practice: how the item works

The free-response half of the exam, as a graded item. One page per lesson,
graded as `exercise-3`, which `seed/csa-course-manifest.js` already denominates
at 4 points for all 53 lessons.

## Why this is a separate item from exercise-1 and debug

| item | asks | what it rehearses |
|---|---|---|
| `exercise-1` | write this program | fluency |
| `debug` | fix this program | reading code you did not write |
| `exercise-3` | implement this contract | the exam |

A student can be fluent at `exercise-1` and still lose points in May for
writing a `main` where the question asked for a method, or for printing a value
the question asked them to return. That gap is the reason this item exists. It
is not a harder `exercise-1`.

## The parts

The five moving pieces, in the order a change usually touches them:

```
seed/csa-frq/unitN.js        the content: task, rubric, starter, reference, cases
seed/csa-frq/index.js        the loader, the shape checks, and codeTestItems()
scripts/verify-csa-frq.js    compiles and runs everything, writes the expectations
lib/csa-frq-pages.js         renders one page per entry
scripts/csa-frq-pages-csv.js the Matrixify sheet, plus the publish and leak checks
smoke/csa-frq-pages.js       npm run smoke:csafrq
```

Adding a lesson is an entry in a unit file plus a verifier run. Nothing else
needs to change.

## The rubric coverage rule

Every entry declares exactly **four** parts, and every case declares which part
it exercises (`part: 1` to `4`). The loader refuses an entry where some part has
no case behind it.

This is the check that keeps the score honest. The grader scales
cases-passed over cases-total into the item's four points. If three of the four
parts held all the cases, a student could miss a whole rubric row and still be
reported at 4 of 4. Requiring a case per part makes the number mean what the
rubric in front of the student says it means.

What a `part` tag records is which rubric row that case was chosen to
**discriminate**: its inputs are picked so getting that row wrong changes the
printed output. A truncation row gets a case whose numbers do not divide
evenly; a `Math.max` row gets a case where the last argument wins. The verifier
enforces that too, by failing any part whose cases all produce identical output.

## Modes

`lib/csa-code-modes.js`'s three, unchanged. Which one a lesson gets is decided
by what the exam would actually ask at that point in the course:

- **segment** for Unit 1. The unit is Using Objects and Methods: the student is
  handed values in the case prelude and asked to compute. Asking for a class
  definition would be grading Unit 3 in September.
- **driver** from Unit 3 on. The student writes definitions and no `main`; a
  hidden harness calls them. This is the only shape that can refuse credit for
  printing instead of returning, because nothing the student prints is what the
  harness measures.
- **program** is available and rarely right. An FRQ does not hand you a `main`.

## The handle is `-frq`, the column is `exercise-3`

Pages are `ap-csa-lesson-{U}-{L}-{slug}-frq`. `-exercise-3` on the end of a URL
means nothing to a student or a search engine, and `exercise-3` is the column
the manifest denominates. `ACTIVITY_ALIASES` in `utils.js` is where those two
facts are reconciled, rather than bending either one to the other.

Aliasing was safe specifically because no live page ended in `-frq`, so it could
not reclassify anything already published. That is the same test the `-gap`
token had to pass.

## Mutants: coverage is not the same as power

An entry may declare `mutants`: named wrong versions of its own reference,
written as a find/replace on the reference source. The verifier asserts each one
**fails at least one case**.

```js
mutants: [
  { describe: 'part (b) casts AFTER the integer division rather than before it',
    find: 'double exact = (double) miles / gallons;',
    replace: 'double exact = (double) (miles / gallons);' },
],
```

This exists because 1.9 needed it. It declared a casting point, had a case
tagged for that point, passed every other check in this repo, and still could
not fail a student who omitted the cast: its harness computed the dividend as
`people * pricePer` and then divided by `people`, so the division always came
out even and `(double)` changed nothing. The cases existed. The outputs differed
from each other. The point was ungradeable anyway.

Rubric coverage says a part has cases behind it. A mutant says those cases can
catch the mistake the part is about. Where a rubric part names a specific error
(truncation, a swapped parameter order, a discarded return value, `==` on
Strings), give it one.

The course declares 160. All 160 are proven to fail.

## What is verified, and by what

Six guarantees, each proven by breaking it deliberately rather than assumed:

| guarantee | enforced by | caught when broken |
|---|---|---|
| every rubric part has a case | loader, at require time | yes |
| a hidden case has a genuinely different input | loader, at require time | yes |
| a constant that prints the sample cannot pass | `verify-csa-frq.js`, runs Java | yes |
| a hidden case does not repeat a visible case's ANSWER | `verify-csa-frq.js`, runs Java | yes |
| a declared mistake actually fails | `verify-csa-frq.js`, runs Java | yes |
| the reference never appears on the page | `csa-frq-pages-csv.js` leak check | yes |

The loader catches what is checkable statically. The verifier catches what only
running the code reveals: two inputs can differ and still produce identical
output, which the loader accepts and a constant answer then passes.

Row four was validated with a deliberate no-op control, a mutant that renames a
local variable and prints identical output. The verifier reports it, which is
what proves the mutants are being run rather than counted.

Two mutants were WITHDRAWN rather than made to pass, which is worth recording
because the temptation is to force them:

- 2.9 declared `>` versus `>=` on a two-argument max. Those return the same
  VALUE on a tie, so no case can separate them. That distinction only becomes
  gradeable once an INDEX is tracked, which is 4.5, and it is declared there.
- 2.11 declared a trailing space. Output normalisation strips trailing
  whitespace before comparing, so the grader genuinely cannot see it. A LEADING
  separator survives, so that is what the rubric row scores now.

A rubric row that names a mistake the grader cannot detect is worse than no row
at all, because it reads as covered.

No expected output is written by hand anywhere in this bank. Each entry states a
`reference`, and the verifier runs it through real `javac`/`java` to produce
`expected.generated.json`. A hand-written expectation is a guess, and a wrong
guess fails a student whose code is correct.

## Two exemptions, both explicit

The leak check would otherwise fire on things that are not leaks:

- **`teaches`** is a per-entry list of reference lines the page may print
  because they are the idiom being taught, not the answer. 3.2's shadowing hint
  has to be able to show `this.threshold = threshold;` to be a hint at all. The
  loader refuses a `teaches` entry that is not actually in the reference, so a
  stale exemption cannot quietly widen the hole.
- **Starter lines** are excluded automatically. `import java.util.ArrayList;`
  and the class header appear in both the starter and the reference by design,
  and a line already handed to the student cannot leak an answer to them.

## The 1.6 migration

1.6 was authored in `seed/csa-code-tests.js` before this bank existed, and moved
here rather than being duplicated: `code_test_cases` is keyed
`(course, lesson, item, seq)`, so two definitions of ap-csa 1.6 `exercise-3`
would race and whichever lost would grade a page assembled the other way.

The move was verified rather than asserted. All six generated cases reproduce
the original hand-written expectations byte for byte. That parity check is also
what caught a real error in the rewrite: the original subtracts tax from the
change and the first draft of the task text did not. The old expectations were
right and the new prose was wrong.

## Scope today

**All 53 lessons are authored**: 270 cases, 164 of them hidden, 160 declared
mutants, every one proven to fail.

| unit | lessons | mode | question type |
|---|---|---|---|
| 1 Using Objects and Methods | 15 | `segment`, except 1.9 | methods and control |
| 2 Selection and Iteration | 12 | `driver` | methods and control |
| 3 Class Creation | 9 | `driver` | class |
| 4 Data Collections | 17 | `driver` | array/ArrayList and 2D array |

Unit 1 is `segment` because the unit is about USING objects, and a segment
cannot declare a method or a class. 1.9 is the exception: Method Signatures is
the one Unit 1 topic a segment physically cannot test, so it is `driver`.

From 2.1 on every entry is `driver`, which is the authentic FRQ shape and the
only one that can refuse credit for printing instead of returning.

### What each unit's questions are built around

- **Unit 2** the boolean hazard: a method with two possible answers passes any
  case set that only ever asks for one of them. Every boolean part has cases on
  both sides, and `always returns true` is a declared mutant.
- **Unit 3** silent failure. A broken class compiles cleanly and every getter
  returns 0. Every mutant here produces no error message, and every harness
  builds at least two objects, because a shared static or a leaked reference is
  invisible to a harness that builds one.
- **Unit 4** the index bug in its many costumes. Every grid is deliberately
  non square, because a swapped row and column silently transposes on a square
  one and throws on a 2 by 4.
