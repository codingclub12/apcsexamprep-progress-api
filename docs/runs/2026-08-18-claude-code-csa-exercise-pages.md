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
- `npm run smoke:judge0limits` - 17 passed, 0 failed.
- PR #190 merged by Tanner at 2026-08-18 01:00Z as `7d75b3c`. Railway deployed it
  (`GET /api/health` rolled from `316784f` to `cbdc3cf`, which contains the merge,
  and reports `status: ok`, so the `mode` column migration booted clean).
- `POST /api/judge0/run` with an empty body returns `400 bad_request` on
  production, which places the request past the rate limiter and short of Judge0.
  The route is live and costs nothing to confirm.

## The classroom blocker, raised on the owner's call

`/api/judge0/run` was limited to 40 runs per hour **per IP**. Submit was fine (the
grade route sets `X-Forwarded-For: codegrade:<studentId>`, partitioning per
student), but **Run** goes straight from the browser, so a school NAT put a whole
class behind one public IP: thirty students sharing 40 runs an hour, about one Run
each per period, and Run is the debugging loop these pages are built around.

This was first written up as a blocker and left alone, because CLAUDE.md says not
to modify the Judge0 subsystem. Tanner overrode that directly: 500 would not cost
much and would be very unlikely to bite even three classes of twenty, which is the
worst realistic case. That arithmetic holds - 60 students at eight Runs each while
debugging is 480 - so the ceiling now covers the worst hour while doing nothing,
which is what a ceiling is for. The same number fixes grading, which was quietly
tight too at about eight submissions of a five case exercise per student per hour.

Two things came with it rather than being asked for, both because the raise made
them load bearing:

- **A global backstop, 3000 runs/hour.** Raising per-identity 12.5x raises what one
  runaway client can burn from $0.07/hour to $0.85/hour, and nothing bounded the
  TOTAL before: ten bad identities cost ten times as much, indefinitely. Against a
  $169 spike in this repo's history that is not hypothetical. 3000 is about 3x a
  genuinely busy day's peak hour, so real classes never reach it and a runaway
  stops at ~$5/hour. The tradeoff (at the ceiling, one abuser degrades everyone) is
  accepted on purpose and the two ceilings return DIFFERENT messages, so a student
  who did nothing wrong is told so instead of waiting out a limit that is not
  theirs.
- **A hard key cap on the limiter map.** It grows one entry per unique identity and
  is swept only every ten minutes, so a burst of unique addresses between sweeps
  grew it without bound. Same class of per-request growth as the leak that caused
  the spike, and the code-grade limiter already had the cap.

Writing the test for this found a third thing: the global-ceiling `console.error`
fired on every refused request, which is thousands of identical lines a minute
during exactly the incident it exists to report. It logs once per window now.

Cost, for the record. Judge0 is ~$0.0017 a run. A saturated hour at the per-IP
ceiling is $0.85. 60 students doing two exercises a week is ~11k runs a month,
about $19. All 53 exercises for that many students over a semester is ~73k runs,
~$124, about $31/month across four months. It fits the ~$30/month target without
much room, so the **aggregate on the bill** is the number to watch, not the burst.

## Still open

**The code is deployed. The content is not.** Those are different things and the
distinction is the whole of what is left:

- **Live now, from the merge alone:** the two new grading modes, the `mode`
  column, and the raised Judge0 ceilings. Nothing about a student's experience
  changes from these on their own, except that Run and Submit stop being
  rate limited at 40 an hour.
- **Not live:** every one of the 53 pages, and every one of the 268 test cases.

Two steps remain, in this order, and the order is not cosmetic:

1. `node scripts/seed-code-tests.js --update` against the PRODUCTION database
   (a Railway shell; it cannot be run from a session container, which has no
   production DB). Until this runs, `code_test_cases` holds nothing for the new
   items and every submission 404s.
2. Then the Matrixify import. Run
   `node scripts/csa-exercise-pages-csv.js out.csv --live pages.json` against a
   fresh Admin API pages dump first: every handle in this set must be new, and
   the script aborts on any that is not.

Importing before seeding gives 53 pages that look finished and grade nothing,
which is the failure this ordering exists to prevent.

Everything else that is open:

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
