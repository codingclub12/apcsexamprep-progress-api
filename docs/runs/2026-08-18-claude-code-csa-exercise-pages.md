# AP CSA exercise pages, all 53 lessons

Board task #95. Branch `claude/ap-csa-exercise-pages-kxlel6`.

## What was asked

Exercise pages for each of the 53 AP CSA lessons, includable in the bundle, with
real code: Scanner, multiple classes, the works.

## What was measured first

Live, against the Shopify Admin API on 2026-08-17, before anything was written.

- A handle query for `ap-csa-lesson*` returns 56 pages: all 53 lessons of the
  2025-2026 four-unit CED, plus a duplicate handle each for 2.9, 2.10 and 2.12.
  **Not one** of them ends in an activity token, so there was no CSA exercise
  page of any kind.
- The Unit 2 course hub body links to the LONGER handle in each of the three
  duplicate pairs (`-implementing-selection-iteration-algorithms`,
  `-implementing-string-algorithms`, `-informal-run-time-analysis`). Those are the
  pages students are sent to, so those are the ones the Back links return them to.
  Routing is unaffected either way: `pageFromHandle` keys CSA off
  `ap-csa-lesson-{U}-{L}-` and ignores the slug.
- All four unit hubs exist (`ap-csa-unit-{1,2,3,4}-course`).
- `seed/csa-course-manifest.js` has been pricing `exercise-1` at 1 point for all
  53 lessons since it was written, so every CSA class already carried 53 gradebook
  columns nothing could fill.

## The blocker that had to be removed first

The code grader had exactly one submission shape: a bare segment wrapped in
`public class Main { main }`. A segment lives inside a method body, so it cannot
declare a class or a method. That is the whole of Unit 3 (Class Creation) and
half of Unit 4, and it is why "use Scanner" and "write multiple classes" were not
possible rather than merely absent. 1.4 is literally the Scanner lesson and was
being graded by injecting `int x = 5;` as a prelude, which grades everything
except the thing the lesson teaches.

`lib/csa-code-modes.js` adds two shapes and changes nothing about the first:

- `program` - the student submits a whole file with `class Main`, and the case's
  `stdin` is the input. Scanner works because it is real input, and the student
  may declare as many helper classes as the task calls for.
- `driver` - the student submits class definitions and no main; the case's
  `postlude` is a hidden `public class Main` harness that constructs their object,
  calls their methods and prints what it observes, reading its own values from
  stdin so hidden cases drive the same class with unseen inputs.

Two Java facts had to be handled or they would have landed on students as
gibberish, because Judge0 compiles every submission to `Main.java`:

1. `public class Dog` is a compile error in `Main.java`, and it is exactly what
   Unit 3 teaches. The assembler strips the `public` modifier from top-level
   types that are not the entry class, with a real brace/string/comment scan
   rather than a regex, because `public` inside a string literal is not a
   modifier and getting that wrong would corrupt a correct submission.
2. Imports must be at the top, and in driver mode the harness is appended after
   the student's classes. Driver assembly lifts the imports out of both halves and
   emits them once at the top. This was found by the verifier, not by reasoning:
   the first Unit 3 run failed with `class, interface, enum, or record expected`
   on all nine exercises.

Segment assembly moved into the same module byte for byte, so the verifier can
build a program exactly the way the route does. `smoke/csa-exercise-pages.js` test
6.1 pins the old output against the literal string it used to produce, and
`smoke/greenfoot-stub.js` now imports the real assembler instead of reading a
private function out of `routes/student.js`.

## Nothing in this build states an expected output

A hand-written expected output is a guess about what Java prints, and it is wrong
exactly where it matters. Each exercise states a reference solution;
`scripts/verify-csa-exercises.js` runs it through real `javac`/`java` against
every case and writes what Java actually printed into
`seed/csa-exercises/expected.generated.json`.

The verifier refuses to write when a reference does not compile or crashes, when
a **starter already passes** (a pre-solved exercise awards full marks for
clicking submit and looks like a working one), when every case prints the same
thing, or when the actual hardcoding cheat beats the hidden cases. It builds that
cheat itself for every `program` exercise: a `Main` that prints case 0's expected
output verbatim.

## What shipped

| | |
|---|---|
| pages | 53, one per lesson (15 / 12 / 9 / 17) |
| driver exercises | 10, all of Unit 3 plus 4.6 |
| test cases | 268, of which 162 are hidden |
| body HTML | 1071 KB across the set |
| new suites | `smoke:csax1`, 63 checks, all passing |

Every page is a Java editor with a Run button (unauthenticated, ungraded, the
compiler feedback loop) and a separate Submit button (student token, graded
against the hidden cases). Keeping them apart means a student can debug for
twenty minutes without spending a grade attempt.

Two supporting decisions worth recording:

- `utils.js` now declares `exercise-1` in Unit 1's activities. It was correctly
  left out before, on the grounds that declaring a column no page can fill only
  creates fifteen permanently empty ones. That reason expired when the pages were
  built.
- The three `exercise-1` items for 1.3, 1.5 and 1.6 in `seed/csa-code-tests.js`
  were superseded by `program` versions of the same tasks. They were authored for
  pages that were never built, so nothing ever posted to them, and
  `code_test_cases` is keyed `(course, lesson, item, seq)`, so leaving both
  definitions in place would have had them race. 1.6 `exercise-3` (the FRQ) is a
  different item and is untouched. The seeder now prunes cases past an item's
  current count so a shrink or a mode change cannot leave a stale row behind.

## Evidence

- `node scripts/verify-csa-exercises.js --write` - 268 case outputs produced by
  real `javac`/`java` across 53 exercises, no reference failing to compile, no
  starter passing, no hardcoded output beating a hidden case.
- `npm run smoke:csax1` - 63 passed, 0 failed. Includes the leak checks being
  proved by feeding them a deliberate leak, the segment-assembly byte pin, the
  `public` strip over strings and comments, the import hoist, the CSV RFC 4180
  round trip, and a three exercise spot check against a real JVM.
- Full offline suite set (every `smoke:*` CI runs) - green.
- `npm run csax1 -- out.csv` - 53 rows, 1094 KB sheet, refused nothing.

## The one thing that will stop a classroom, and was deliberately not fixed

`/api/judge0/run` is limited to 40 runs per hour **per IP**. The Submit path is
fine: the grade route sets `X-Forwarded-For: codegrade:<studentId>`, so it is
partitioned per student. The **Run** button goes straight from the browser, so a
school NAT puts a whole class behind one public IP: thirty students share 40 runs
an hour, which is about one Run each per period, and Run is the debugging loop
these pages are built around.

This is pre-existing and already applies to the in-lesson CSA editors. 53
exercise pages make it certain to be hit rather than merely possible. It was not
fixed here because CLAUDE.md says not to modify the Judge0 subsystem, and that is
the right call to leave with its owner rather than to make quietly inside a
content build. No data is harmed by it (a 429 records nothing, so nobody is
marked down), but the pages stop working partway through a lesson.
`docs/csa-exercise-pages.md` carries the numbers and the two obvious fix shapes.

**Treat this as a blocker on the pilot, not a footnote on it.**

## Still open

- **Nothing is live.** The sheet is built and validated; the Matrixify import has
  not been run, and neither has the seed against production. Order matters:
  `node scripts/seed-code-tests.js --update` FIRST, then the import. A page whose
  cases are not seeded answers every submission with a 404 and grades nothing.
- Run `node scripts/csa-exercise-pages-csv.js out.csv --live pages.json` against a
  fresh Admin API pages dump before importing. Every handle in this set must be
  new, and the script aborts on any that is not.
- No browser check of a real Submit against production has happened, because
  nothing is imported yet. That is the verification step after the import.
- 1.6 `exercise-3` still has a test bank and no page. It is the only CSA FRQ item
  with cases authored.
- The 35 Unit 2 to 4 LESSON pages that report nothing
  (`docs/csa-manifest-readiness.md`) are untouched by this. These are new pages
  that report on their own; the attribute gap on the lesson pages beside them is
  still there.

## What was learned

The measurement that mattered was not "how many exercise pages are there" (zero,
easy) but "what can the grader express". The denominators had been seeded for
years against a submission shape that could not hold most of the course, and that
mismatch was invisible from either end: the manifest looked complete and the
grader looked correct. It only became visible when the two were asked to meet on
Unit 3.
