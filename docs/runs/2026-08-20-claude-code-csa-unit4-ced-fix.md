# Unit 4's six mismatched lessons are fixed, and exercise-2 is real for them

2026-08-20, Claude Code, follow-on to
`docs/runs/2026-08-19-claude-code-csa-unit4-ced-mismatch.md` and the
"where do we stand against CodeHS" analysis that preceded it.

## What was asked

Tanner asked for all four, in order, using best judgment throughout:
1. Fix the six mismatched lessons' content before writing anything new.
2. Wire `exercise-2` into the activity map so it actually grades.
3. Add a Debugging-mode item as a second exercise where it fits.
4. Consider a third Applied variant on the highest-weight topics.

## What shipped

### 1. The six mismatched lessons, recontented

`seed/csa-exercises/unit4.js`, lessons 4.6, 4.7, 4.13, 4.14, 4.15 and 4.17,
rewritten to test the real CED topic at that position:

| lesson | now tests | was |
|---|---|---|
| 4.6 | Using Text Files | Arrays as Parameters and Return Values |
| 4.7 | Wrapper Classes | ArrayList Introduction |
| 4.13 | Implementing 2D Array Algorithms | Searching and Sorting (merged) |
| 4.14 | Searching Algorithms | Reading Data from Files |
| 4.15 | Sorting Algorithms | Using Data Sets with Arrays and ArrayLists |
| 4.17 | Recursive Searching and Sorting | Informal Code Analysis (a 2.12 duplicate) |

Old 4.14's exercise (Scanner + `hasNextInt`, reading unknown-length data piped
in place of a file) was the one piece of prior content that matched a real CED
topic, just eight lessons from where it belongs, so it moved to 4.6 rather than
being rewritten, exactly as the prior run note flagged as possible. Old 4.13
(linear search plus one hand-written sort) split cleanly into the new 4.14
(search alone, against data the exercise now states is already sorted) and the
new 4.15 (both required sorts, selection AND insertion, where the old exercise
only had one). Old 4.6 (array aliasing through parameters) and old 4.7
(ArrayList construction) did not match any real Unit 4 CED topic anywhere else
in the unit, per the prior run note's own assessment, so neither was carried
forward; both are new content.

None of these six lessons had shipped to a storefront page (Units 2-4 are all
authored-unpublished), so this is a draft correction, not a live migration.

**Verified against a real JDK, not assumed.** `node scripts/verify-csa-exercises.js --write`
ran every reference solution in all 53 CSA exercises, including the six
rewrites, through real `javac`/`java`: 268 case outputs regenerated, all 53
exercises pass the verifier's four refusal checks (compiles, starter does not
already pass, a hardcoded-output cheat fails at least one hidden case, cases
are not all identical). `npm run smoke:csax1` also passed clean, 63/63,
including its own javac/java spot check.

### 2. `exercise-2`, and the discovery that reshaped the rest of this pass

The instruction to "wire exercise-2" assumed a premise from the earlier
CodeHS-comparison work: that a few lessons already had two exercises authored
and just needed the second one connected. Checking the live code before
building anything found that premise false (every Unit 4 lesson has exactly
one exercise-1, no lesson has a second), and found something more useful in
its place: `exercise-2` is not an open slot. It is an already-decided,
already-built, cross-course convention.

- `seed/csa-course-manifest.js` denominates `exercise-2` at 6 points and
  `exercise-3` at 4 points for every CSA lesson, commented explicitly as
  "game, 6 rounds" and "FRQ." Confirmed live, not assumed.
- `utils.js` already declares `exercise-2` and `exercise-3` in Unit 4's
  (and Units 2-3's) activities list.
- `seed/csp-exercise-2/` and `lib/csp-course-pages.js` are the working,
  shipped implementation of exactly this convention for CSP: six applied,
  scenario-based multiple choice questions per lesson, worth 6 points,
  documented in `docs/runs/2026-08-17-claude-code-csp-course-pages.md`.
- `routes/progress.js`'s `ITEM_TYPES` set already accepts `exercise-2`
  generically for any course, keyed against `course_manifest`. Nothing there
  needed to change.

So `exercise-2` for CSA is not a second Judge0 code exercise. It is the same
applied-MCQ practice bank CSP already has, unbuilt for CSA. Reusing it for a
second code item would have silently collided with an already-decided 6 point
weight and a different grading pipeline (MC posts through
`POST /api/progress/attempt`; code posts through
`POST /api/student/code-grade` against `code_test_cases`, keyed generically by
`(course, lesson, item)` with no such collision risk of its own).

**Built:** `seed/csa-exercise-2/unit4.js`, six lessons times six questions,
36 total, matching the CSP schema exactly (`scenario`, `stem`, four `options`,
`correct`, and a written `why` for all four options, not just the correct
one). Paired with the same six lessons whose exercise-1 was just corrected, so
topic-accuracy and applied-practice depth land together rather than drifting
apart. `seed/csa-exercise-2.js` added as the index, mirroring
`seed/csa-exercises/index.js`'s own shape.

Structurally validated (6 questions per lesson, 4 options each, `correct` in
A-D, all four `why` keys present) against all 36 questions: clean. This is
content, not code; there is nothing here for `javac` to check.

**Deliberately NOT built in this pass: the page renderer and CSV export.**
`lib/csp-course-pages.js` plus `scripts/csp-game-pages-csv.js` together are
784 lines carrying real weight: Shopify's CSS-reset and sanitizer hazards,
MERGE-safe Matrixify rules, and (for the CSA exercise-1 renderer specifically)
an answer-leak detector proven against a deliberate leak. Rushing an
equivalent for exercise-2 inside this same pass risked shipping exactly the
kind of thing those files exist to prevent. `seed/csa-exercise-2.js` says so
in its own header. The content is ready the moment that build starts;
`lib/csa-exercise-pages.js` and `scripts/csa-exercise-pages-csv.js` are the
direct templates for it, same as CSP's were for those.

### 3 and 4. Debugging-mode items and a third Applied variant: deferred

Both are real, good ideas and both are genuinely open. Neither has a home in
the current schema without a decision this session should not make alone:

- `exercise-2` is spoken for (above). `exercise-3` is spoken for too, as FRQ
  (`1.6 exercise-3` already exists as one, and the manifest denominates it at
  4 points specifically for that shape).
- The code-grade route itself has no restriction on the `item` string
  (`code_test_cases` and `course_denominators` are both looked up generically
  by `(course, lesson, item)`), so a Debugging item or a second Applied item
  is mechanically easy to add as, say, a new `debug` activity type.
- But every existing activity type in this course is declared unit-wide in
  `utils.js` and denominated for all 53 lessons at once, on purpose (the
  manifest file's own stated reason: changing a denominator later moves every
  student's percentage retroactively). Only 3-4 lessons' worth of Debugging
  content in one pass, alongside a brand-new activity type declared unit-wide,
  is the same "permanently empty column" shape the codebase's own comments
  repeatedly warn against elsewhere. Doing it properly means either a full
  17-lesson rollout or an explicit, smaller-scope decision about partial
  coverage, and that is a real product decision, not a mechanical one.

Not done silently: flagged here, with the schema question answered (there is
room, the mechanism is generic, it just needs a name and a rollout decision)
so the next pass does not have to re-derive any of this.

## Evidence

- `node scripts/verify-csa-exercises.js --write`: 268 case outputs across all
  53 exercises, 0 refused.
- `npm run smoke:csax1`: 63 passed, 0 failed.
- `npm run smoke:exercises`, `npm run smoke:contract`, `npm run smoke:unitdenoms`:
  24 + 42 + 14 passed, 0 failed. Confirms the gradebook/manifest/contract
  surfaces are untouched, as expected: no wiring files changed, only content.
- `node -e` structural check on all 36 exercise-2 questions: clean.

## Update: the exercise-2 page renderer shipped too

`lib/csa-exercise-2-pages.js` and `scripts/csa-exercise-2-pages-csv.js`, mirroring
`lib/csp-course-pages.js` and `scripts/csp-game-pages-csv.js`, scoped to the same
six lessons. `npm run csax2 -- out.csv` produces a Matrixify-ready sheet; importing
it into Shopify is still a separate pipeline, same division of labor exercise-1's
own CSV already has.

Caught before it shipped: the authored bank puts 33 of 36 correct answers on
option B (checked against the data, not assumed). Fixed the same way CSP's build
fixed the identical bug: options are rotated at render time to a deterministic
per-question target letter, so the content itself is untouched but no student
could pass the course by always picking B. `smoke/csa-exercise-2-pages.js`
(`npm run smoke:csax2pages`, 64 assertions) pins this, the handle routing, the
CSV round trip, and that every item reports `exercise-2` and never a hardcoded
`quiz`. `npm run smoke:csax1`, `smoke:contract` and `smoke:exercises` all still
pass clean.

## Update: Debugging-mode items, proof of concept shipped for one lesson

Item id `debug`, denominated at 1 point (same weight class as exercise-1, same
kind of activity) for all 53 CSA lessons in `seed/csa-course-manifest.js`, same
bootstrap-ahead-of-content posture the file already takes with exercise-1/2/3.
Declared in Unit 4's `activities` list in `utils.js`, and in `ACTIVITY_TOKENS`
so a handle ending `-debug` routes correctly (`pageFromHandle` checked directly).

One lesson authored end to end: 4.4 (Array Traversals), "Find the Off-By-One".
The starter is not a skeleton, it is a plausible attempt with two real bugs
planted in it (an off-by-one that crashes, and a `>=` that breaks ties toward
the wrong index), which the prior "where do we stand against CodeHS" analysis
identified as the one exercise TYPE this course had zero of. Same grading
pipeline as exercise-1 (`code_test_cases`, `POST /api/student/code-grade`), so
nothing in the grading route changed.

Full parallel pipeline built and verified, since a page cannot be graded
without one: `seed/csa-debug-exercises.js` (content, mirrors
`seed/csa-exercises/index.js`'s own shape check), `scripts/verify-csa-debug-exercises.js`
(compiles and runs the fix through real javac/java, and separately proves the
buggy starter fails at least one case, or there is no real bug to find),
wired into `scripts/seed-code-tests.js`'s sources, `lib/csa-debug-pages.js`
(reuses `lib/csa-exercise-pages.js`'s own CSS and page script rather than a
second copy), `scripts/csa-debug-pages-csv.js` (same answer-leak detector
class as exercise-1's own CSV script, checked against a deliberate leak), and
`smoke/csa-debug-pages.js` (21 assertions). All clean; `npm run smoke:csax1`,
`smoke:exercises`, `smoke:contract`, `smoke:unitdenoms`, `smoke:admincodetests`
and `smoke:beginnerstyle` all still pass with the new denominator and activity
token in place.

Scaling to more lessons is now templated: another entry in
`seed/csa-debug-exercises.js`, `--write` the expected file, rerun the seeder
and the CSV. Deliberately stayed at one lesson in this pass: the ask was to
prove the mechanism, and three parallel content+pipeline builds
(exercise-1 fix, exercise-2, debug) in one sitting is already a lot to review
at once. More lessons is a content decision for a follow-up pass, not an
infrastructure one.

## Task 4, the third Applied variant: deliberately not started

Explicitly the lowest priority of the four, framed as "consider" rather than
"build" in the original ask. Given a third code item needs the exact same
scale of parallel infrastructure just proven for `debug` (a new item id, its
own denominator, its own page renderer, its own CSV, its own smoke suite), and
given three such builds already landed in this one sitting, adding a fourth
without a specific lesson and a specific pedagogical reason picked out first
would be scope for its own sake. No schema question is open here anymore
(the `debug` build proves the mechanism generalizes to a fourth item cleanly
if wanted); what is missing is a decision about which lesson and what the
variant would actually test, which is a content call, not an engineering one.

## What is still open

- Scaling `debug` past 4.4, once a specific set of lessons is chosen.
- The third Applied variant, once a specific lesson and topic is chosen.
- Everything the prior run note already listed as open: whether to CED-check
  Units 1-3 directly, and the 1.6 FRQ page / `exercise-2` for Unit 1 gaps
  noted in `docs/csa-exercise-pages.md`.
