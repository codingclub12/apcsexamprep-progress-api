# AP CSA exercise pages

53 pages, one per lesson of the 2025-2026 four-unit CED, each a real Java editor
graded server side against hidden test cases.

Read this before adding an exercise, changing a test bank, or touching
`lib/csa-code-modes.js`.

**Unit 4, lessons 4.6, 4.7, 4.13, 4.14, 4.15 and 4.17, were authored against the
wrong topic and have been recontented (2026-08-20).** See
`docs/runs/2026-08-20-claude-code-csa-unit4-ced-fix.md` for what changed and
`docs/csa-codehs-exercise-reference.md` for how the mismatch was originally
confirmed against the real CED text. The storefront page titles for these six
still need to be relabeled to match before they publish; that half is out of
scope for this repo.

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

## The Judge0 run limits

These pages are the reason the limits changed. Both paths go through
`/api/judge0/run`, but they are identified differently:

| path | identified by | limit |
|---|---|---|
| Submit (`/api/student/code-grade`) | `X-Forwarded-For: codegrade:<studentId>`, set by the route | 500 runs/hour **per student**, so ~100 submissions/hour of a 5 case exercise |
| Run (`/api/judge0/run`, straight from the browser) | the browser's real IP | 500 runs/hour **per public IP** |

The old ceiling was 40 on both. It was sized for a handful of in-lesson editors
and became a classroom blocker here: a school NAT puts a whole class behind one
public IP, so thirty students shared 40 runs an hour, a little over one Run each
per period, and Run is the debugging loop these pages are built around. The
grading side was quietly tight too, at about eight submissions of a 5 case
exercise per student per hour.

**500 is sized against the worst realistic hour, not picked round.** Three classes
of twenty behind one IP is 60 students, and a student debugging hard runs their
code maybe eight times while working an exercise: 480. The ceiling covers that
while doing nothing, which is what a ceiling is for.

### The global backstop

Raising the per-identity ceiling 12.5x raises what a single runaway client can
burn from $0.07/hour to $0.85/hour, and **nothing bounded the total before**: ten
bad identities cost ten times as much, indefinitely. Given the $169 spike in this
repo's history, that was not a hypothetical.

`GLOBAL_LIMIT` is 3000 runs/hour across everything, roughly 3x what a genuinely
busy day peaks at (five schools of 60 students spread over a school day is about
1100 runs in the worst hour). Real classes never reach it; a runaway stops at
about $5/hour instead of never.

The tradeoff is accepted deliberately: at the global ceiling one abuser can deny
service to everyone. At this budget a bill that cannot run away is worth more
than an hour of degraded service a person can see and act on. The two ceilings
return **different** messages for that reason, so "the site is at capacity" is
never mistaken for "you clicked too fast", and a student who did nothing wrong is
told so rather than left waiting out a limit that is not theirs.

The limiter map also gained the hard key cap the code-grade limiter already had.
It grows one entry per unique identity and is only swept every ten minutes, so a
burst of unique addresses between sweeps grew it without bound: the same class of
per-request growth as the leak that caused the spike.

### What it actually costs

Judge0 is about $0.0017 a run. The hourly burst is not the number to watch; the
monthly total is.

| scenario | runs | cost |
|---|---|---|
| one saturated hour at the per-IP ceiling | 500 | $0.85 |
| 60 students, 2 exercises/week, ~23 runs each | ~11k/month | ~$19/month |
| 60 students working all 53 exercises over a semester | ~73k | ~$124, about $31/month over four months |

That fits the ~$30/month target, but without much room. **The aggregate is worth
watching on the bill**, and it is why the global backstop exists rather than
trusting the per-identity caps alone.

`npm run smoke:judge0limits` pins both ceilings against the arithmetic above, the
two messages being different, that an identity over its own ceiling stops
charging the shared budget, and that the map cannot grow without bound.
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

## Linking them from the unit hubs

Measured 2026-08-24 against the Shopify Admin API: 21 of the 53 exercise-1 pages
are live (all 15 of Unit 1, plus the six recontented Unit 4 lessons, which also
carry exercise-2), and the four unit hub pages linked NONE of them. The only
route into an exercise was the accordion nav, which is injected on Unit 1 and
Unit 4 pages only, so a Unit 2 or Unit 3 student had no path to a graded
exercise at all.

`lib/csa-hub-links.js` generates a Coding Exercises section for a hub body and
`scripts/csa-hub-exercise-links.js` turns it into a Matrixify sheet:

```
node scripts/csa-hub-exercise-links.js --handles live-handles.txt \
  --out hubs.csv unit1.html unit2.html unit3.html unit4.html
```

Both inputs come from the Admin API in the same sitting, never from a document:
the stored Body HTML of each hub, and the list of every live `ap-csa-*` page
handle. The handle list decides whether a chip is a link or a lock, and it is
also what a dead lesson link is repaired against, so a stale or partial list is
the one input that can do damage.

**Which pages exist is never inferred from a handle pattern.** An exercise the
live set does not contain renders as an inert locked chip, the same lock
semantics `lib/csa-nav.js` uses. `npm run smoke:csahublinks` proves both halves,
including that a locked chip carries no href anywhere in the output.

Two live defects were found while measuring and are repaired by the same pass:

- **The broken CTA block.** The Unit 1 and Unit 2 hubs carry `class="uN-cta">`
  where `<div class="uN-cta">` belongs. The opening tag was lost in some earlier
  edit, so the literal text renders on the page and the block's `</div>` closes
  the wrapper early. Units 3 and 4 are sound.
- **Six dead lesson links.** The Unit 4 hub still links the pre-CED-fix handles
  for 4.6, 4.7, 4.13, 4.14, 4.15 and 4.17. Those pages were republished under new
  handles on 2026-08-20 and no page carries the old ones, so six of seventeen
  cards are 404s. A dead link is relinked only when the live set holds exactly
  one lesson page for that lesson number; zero or two candidates is a refusal.
  The card TITLES on those six are still the old topic names, which is the
  relabel already listed as out of scope at the top of this document. A working
  link under a stale label beats a 404, so the relink does not wait on it.

A body recovered by `scripts/live-pages-dump.js` is safe to READ and refused as
a patch input: it is trimmed by div balance and the storefront serves the broken
CTA opener entity-escaped, so patching it would import a body reconstructed from
a render.
