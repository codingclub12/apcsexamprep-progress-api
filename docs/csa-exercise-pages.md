# AP CSA exercise pages

53 pages, one per lesson of the 2025-2026 four-unit CED, each a real Java editor
graded server side against hidden test cases.

Read this before adding an exercise, changing a test bank, or touching
`lib/csa-code-modes.js`.

## The gap these fill

Measured against the Shopify Admin API on 2026-08-17, not assumed.

- All 53 CSA lessons have a live lesson page. A handle query for
  `ap-csa-lesson*` returns 56 (53 lessons plus three duplicated handles) and
  **none** of them ends in an activity token. There was no CSA exercise page of
  any kind.
- `seed/csa-course-manifest.js` has been seeding an `exercise-1` denominator
  worth 1 point for **all 53 lessons** since it was written. So every CSA class
  already carried 53 gradebook columns that nothing could ever fill.
- The old grader had one submission shape: a bare code segment wrapped in
  `class Main { main }`. A segment lives inside a method body, so it cannot
  declare a class or a method. That is all of Unit 3 (Class Creation) and half of
  Unit 4, and it is why those lessons had no gradeable code item rather than a
  weak one.

## The three submission modes

`code_test_cases.mode`, assembled by `lib/csa-code-modes.js`. An empty column
value is `segment`, so every row written before the column existed assembles byte
for byte as it always did.

| mode | student submits | inputs arrive as | used by |
|---|---|---|---|
| `segment` | a bare code segment | the case's `prelude` | the original bank, and the 1.6 FRQ |
| `program` | a complete program with `class Main` | the case's `stdin` | 43 lessons |
| `driver` | class definitions and NO main | `stdin`, read by a hidden harness | 10 lessons |

`program` is what makes a Scanner lesson gradeable as itself, and it lets a
student declare as many helper classes as the task calls for.

`driver` is the only honest way to grade "write this class". The student never
sees the harness, so there is no output to imitate: the only way to make the
harness print the right thing is for the class to actually behave. It also means
the API has to be published, which every driver exercise does, and the page
renders it as a contract.

### The one Java file problem

Judge0 writes every Java submission to `Main.java`, compiles it and runs
`java Main`. Two consequences the assembler handles so they never reach a
student as gibberish:

1. A top-level type declared `public` whose name is not `Main` is a compile
   error. But `public class Dog` is exactly what Unit 3 teaches. So the assembler
   strips the `public` modifier from top-level types that are not the entry
   class, using a real brace/string/comment scan rather than a regex, because
   `public` inside a string literal is not a modifier and getting that wrong
   corrupts a correct submission.
2. Java demands every `import` at the top of the file, and in `driver` mode the
   harness is appended after the student's classes. So driver assembly lifts the
   import lines out of both halves and emits them once at the top.

Shape problems a student can fix are checked BEFORE any Judge0 call is spent and
answered with a sentence (`400`, `not_graded: true`), because Judge0 reports a
missing `Main` as "Could not find or load main class Main", which teaches
nothing.

## Nothing states an expected output

A hand-written expected output is a guess about what Java prints, and guesses are
wrong exactly where it matters: `5/2` is `2`, `5.0/2` is `2.5`, a double prints
`3.0` and not `3`. A wrong expected output fails a student whose code is correct.

So each exercise states a **reference solution** and
`scripts/verify-csa-exercises.js` runs it through real `javac`/`java` against
every case to produce `seed/csa-exercises/expected.generated.json`, which is what
the seeder loads. The bank is correct by construction.

The verifier refuses to write when:

1. A reference solution does not compile, or crashes on a case.
2. A **starter already passes**. A pre-solved exercise awards full marks for
   clicking submit and looks exactly like a working one.
3. A **hardcoded output passes**. For every `program` exercise it builds the
   actual cheat (a `Main` that prints case 0's expected output verbatim) and
   asserts it fails at least one hidden case.
4. Every case prints the same thing, which would make the hidden cases decorative.

```
node scripts/verify-csa-exercises.js            check (nothing written)
node scripts/verify-csa-exercises.js --write    regenerate after editing a reference
node scripts/verify-csa-exercises.js --lesson 3.4
```

It needs a JDK, takes a few minutes, and is the **authoring** gate. The CI gate
is `npm run smoke:csax1`, which is offline and adds a three exercise spot check
against a real JVM when one happens to be present.

## Adding or changing an exercise

1. Edit the entry in `seed/csa-exercises/unit{1,2,3,4}.js`. The shape is checked
   at require time; a malformed entry throws with a specific message.
2. `node scripts/verify-csa-exercises.js --write`
3. `npm run smoke:csax1`
4. `node scripts/seed-code-tests.js --update` on the target database.
5. `npm run csax1 -- out.csv` and import the sheet.

**Order matters at step 4 and 5.** A page whose cases are not seeded answers
every submission with a `404` and grades nothing. Seed first, import second.

The seeder prunes any case left over past the current case count for an item, so
shrinking an item or changing its mode cannot leave a stale row behind. Without
that prune an item would hold cases assembled two different ways, and the grade
route refuses such an item with a `500` rather than scoring it, which would take
the page down.

## What ships, and what never does

The page renders the task, the API contract for a driver exercise, the starter,
and the **visible** cases with their verified outputs. A hidden case appears
nowhere, and neither does the reference solution or a driver exercise's grading
harness. `scripts/csa-exercise-pages-csv.js` refuses to write the sheet when any
of those appear in a body, and `smoke/csa-exercise-pages.js` proves that check
works by feeding it a deliberate leak. A leak detector that cannot fail is
decoration.

The Run button and the Submit button are deliberately different paths. Run goes
to `/api/judge0/run` with whatever the student typed, grades nothing, and works
signed out; it is the compiler feedback loop. Submit is the graded path and needs
a student token. Keeping them apart means a student can debug for twenty minutes
without spending a grade attempt.

## The Judge0 rate limit is a pre-pilot blocker, and it is not fixed here

`routes/judge0.js` limits `/api/judge0/run` to **40 runs per hour per IP**, and
CLAUDE.md says not to modify the Judge0 subsystem, so this build does not touch
it. It has to be resolved before a classroom uses these pages, because of how the
two buttons are identified:

| path | identified by | effective limit |
|---|---|---|
| Submit (`/api/student/code-grade`) | `X-Forwarded-For: codegrade:<studentId>`, set by the route | 40 Judge0 runs/hour **per student**, so roughly 7 submissions/hour of a 5 case exercise |
| Run (`/api/judge0/run`, straight from the browser) | the browser's real IP | 40 runs/hour **per public IP** |

A school NAT puts a whole class behind one public IP. Thirty students sharing 40
runs an hour is a little over one Run each per period, and the Run button is the
debugging loop these pages are built around. This is pre-existing behaviour that
already applies to the in-lesson CSA editors; 53 exercise pages make it certain
to be hit rather than merely possible.

Nothing here is harmed by the limit in a data sense: a 429 records nothing, so no
student is marked down for it. The failure is that the pages stop being usable
partway through a lesson.

The obvious shapes for a fix, none of them started: identify Run by student token
where one is present and fall back to IP only for signed-out visitors; or raise
the per-IP ceiling with a per-token sub-limit underneath it. Both are changes to
the Judge0 subsystem and belong to whoever owns it.

Cost, for whoever picks that up: Judge0 is about $0.0017 a run against a ~$30 a
month target, and a prior leak already caused a $169 spike. A class of 30 each
submitting a 5 case exercise five times is 750 runs, about $1.28. The per-identity
caps are what keep that bounded, so raising them is a spend decision and not only
a usability one.

## Gradebook wiring

`exercise-1` was already in the canonical activity map (it normalizes to
`exercise`, ordinal 1), so no normalizer change was needed. Two things did change:

- `utils.js` now declares `exercise-1` in Unit 1's activities. It was correctly
  left out before, because no Unit 1 exercise page existed and the column would
  have been permanently empty. The page that fills it exists now.
- The three `exercise-1` items for 1.3, 1.5 and 1.6 that lived in
  `seed/csa-code-tests.js` as bare segments were superseded by the `program`
  versions of the same tasks. They were authored for pages that were never built,
  so nothing ever posted to them. `code_test_cases` is keyed
  `(course, lesson, item, seq)`, so two definitions of the same item would race
  and whichever lost would grade a page assembled the other way. 1.6
  `exercise-3` (the FRQ) is a different item and is untouched: it keeps its
  bare-segment shape, which is what the free-response question actually is.

Denominators need no new seed. `seed/csa-course-manifest.js` already prices
`exercise-1` at 1 point for every lesson, and a `course_denominators` row scoped
to a unit outranks the manifest, so the column reads `possible_source: authored`.

## Still open

- 1.6 `exercise-3` has a test bank and no page. It is the only CSA FRQ item with
  cases authored, and an FRQ page is a different build from this one.
- `exercise-2` remains undeclared for Unit 1 and unfilled everywhere. No CSA page
  emits it.
- The 35 Unit 2 to 4 LESSON pages that report nothing (see
  `docs/csa-manifest-readiness.md`) are unaffected by this work. These exercise
  pages are new pages that report on their own; they do not fix the attribute gap
  on the lesson pages beside them.
