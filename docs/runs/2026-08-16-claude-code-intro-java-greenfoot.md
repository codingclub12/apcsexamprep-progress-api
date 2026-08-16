# 2026-08-16, Claude Code: Intro to Java with Greenfoot, course scaffold

## What was asked

A full end-to-end Intro to Java / pre-AP CSA / Greenfoot course, majority
automated, for Tanner's own classroom and for teachers on the site. Topic lessons
building into projects, projects shipped as pre-written code with gaps, and a
getting-unstuck layer (error pages, how-to recipes). Beginner through 2D array
mapping.

## What landed

The course now EXISTS as a first-class course in the API, and the one technical
unknown that blocked everything else is solved and proven. No lesson content
ships in this pass: page bodies go through the theme and Matrixify pipeline as
always, and this is what they get authored against.

- `docs/intro-java-course-spec.md` - the authoring contract. Six units, 42
  lessons, six projects, ending on a 2D array tile map. The item scheme, the
  grading bands, and the support-page system.
- `utils.js` - the course config (42 lessons across 6 units), the `JAVA` class
  code prefix, a `gap` activity token, and the `intro-java-lesson-{U}-{L}-` handle
  rule.
- `lib/entitlements.js`, `lib/admin-analytics.js`, `lib/export-format.js` - the
  course exists to the gate, the analytics breakdowns, and the exports.
- `lib/command-hazards.js` - the ledger's `greenfoot` row was `exempt` on the
  grounds that nothing was being authored. That is no longer true, so it is now
  a real rulebook. `greenfoot` is kept as an alias of `intro-java` so existing
  tasks still compile.
- `scripts/seed-manifest.js` - 42 visit rows. Graded rows are deliberately empty.
- `lib/greenfoot-stub.js` + `smoke/greenfoot-stub.js` - the headless stub.

## The decision that shaped everything

**Greenfoot cannot run in Judge0.** No runtime, no graphical world. A course sold
as majority automated has to be honest about where automation stops, or teachers
find the gap in week three.

So practice splits four ways, and only the first three are ever manifest rows:
`cfu` (existing widget engine), `gap` (pre-written code with holes, graded
server-side against a hidden key), `code` (a pure-logic method run headless
against the stub), and the built scenario, which is teacher-scored through the
score-entry route that already exists for networking's offline sections.

That is roughly 85 percent of course points self-grading, with six hand-scored
projects a year. The build band stays OUT of the manifest: a manifest row is a
promise the points are earnable in a browser, and a desktop Greenfoot scenario
cannot report itself.

## The stub, and the part worth knowing

The logic inside `act()` is almost always pure Java; it just needs `Actor`,
`World` and `Greenfoot` to exist as symbols. `lib/greenfoot-stub.js` emits a
small pure-Java implementation of exactly the taught surface, injected as a
Judge0 prelude. It is deterministic (seeded LCG, never `java.util.Random`, whose
sequence is not guaranteed across implementations) and its keyboard input is
scriptable per case. A flaky case fails students at random for correct code.

Getting it past `buildProgram`'s `class Main { main }` wrap took brace
arithmetic: the prelude closes `main` and `Main`, declares the stub at top level,
and reopens a harness class so the student's segment lands at CLASS level, which
is what lets an exercise ask for a method. It needs zero change to the existing
grader, so CSA's code grading is untouched and there is no second grading path.

That coupling is real, so `smoke/greenfoot-stub.js` reads the REAL `buildProgram`
out of `routes/student.js` rather than reimplementing it, and where a JDK exists
it compiles and runs the assembled program. "The braces balance" is not the same
claim as "javac accepts this."

The first version of the stub put the case's assertions in the prelude. They
landed above the student's segment, inside nothing, and nothing compiled. The
smoke test caught it before any of it was written up as working, which is the
only reason the split (prelude = top-level helpers, segment = student methods,
postlude = assertions) is documented in the file rather than rediscovered later.

## Evidence

```
npm run smoke:greenfoot     36 passed, 0 failed   (includes 6 javac compile-and-run cases)
npm run smoke:hazards      134 passed, 0 failed
npm run smoke:manifestprune 56 passed, 0 failed
npm run smoke:codegrade     ALL PASS
npm run smoke:contract      42 passed, 0 failed
npm run smoke:scoreentry    47 passed, 0 failed
npm run smoke:canvas        all 101 checks passed
npm run smoke:encoding      all 13 checks passed
plus command, checks, gradebook, gbagree, denominators, unitdenoms,
attemptrollup, reporter, exercises, pairallcourses, legacypoints, export,
schoology, myprogress: all green
```

Config verified directly: 42 lessons across 6 units, prefix `JAVA`,
`intro-java-lesson-6-5-...` maps to unit-6 / 6.5, `intro-java-help-error-...`
maps to null (support pages are correctly not progress), and
`ap-csa-lesson-1-3-...-quiz` is unchanged. Manifest generates 42 intro-java rows,
all `visit`, no duplicate `(course, item_id)` keys across the whole seed.

The Unit 6 destination is proven end to end: a student `countWalls(int[][])`
method compiled and ran against the World harness and returned the right answer.

## Still open

- **No lesson content exists.** The spec is the contract; pages are authored
  chat-side and land via Matrixify.
- **Gap-fill grading route is specified, not built.** It follows the code-grading
  contract: key server-side, submitted text graded in transit and DISCARDED, only
  per-hole booleans persisted. The PII rule matters more here than anywhere else
  in the product, because a filled hole is genuinely student-typed free text.
- **No Shopify SKU.** No product exists yet, so no row was invented; access codes
  grant the course until a bundle ships.
- **Graded manifest rows stay empty** until pages are live. Seeding ahead of the
  page is unearnable denominator, which marks every student down for a reason no
  teacher can see.
- The ledger could not be opened this session: no `APCS_TOKEN` in the container,
  so no claim was taken and no task was closed. Worth a task and a claim on
  `api:lib/greenfoot-stub.js` before the gap-fill route is built.

## Learned

The exempt row in the hazards table did its job. It said "no active authoring
track, and if that changes this becomes a block before the first task compiles,"
which is exactly what happened. A documented exemption with a trigger condition
is worth more than a silent gap.
