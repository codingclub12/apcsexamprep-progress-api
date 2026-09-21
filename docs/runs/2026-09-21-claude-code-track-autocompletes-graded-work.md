# A bare page view was completing graded work on 199 pages

2026-09-21, Claude Code.

The ask was "fix the reporters manifest rows". No manifest row is missing. The
premise came from an earlier summary of mine and it was wrong twice over: wrong
about the cause, and wrong about the shape (it said 11 ap-csa Unit 1 activities;
it is 10, and 4 of them are cybersecurity).

## What the check actually measures

`lib/health-integrity.js` JOINS `course_denominators`, so a row can only appear
for an activity that ALREADY has a denominator. Its own comment says what it is
for: "Authored-but-never-scored is the precise signature of a page that
completes without reporting", and such a row "names a broken PAGE". Nothing is
missing from the manifest; something is completing that should not be.

## The bug

`POST /api/student/track` auto-completes every activity type outside one set:

    const GRADED_ON_ARRIVAL = new Set(['exercise-1', 'exercise-2', 'lab']);
    const autoComplete = !GRADED_ON_ARRIVAL.has(activity_type);

`exercise-3` and `debug` are not in it. So opening one of those pages wrote
`completed = 1` with a null score before a single button was clicked.

Both are graded exactly like an `exercise-1` page, which IS in the set.
`lib/csa-frq-pages.js` and `lib/csa-debug-pages.js` each build a "Submit for
grading" button posting to `/code-grade` against hidden test cases, and both
headers say they are graded "as an exercise-1 page". Both carry a denominator on
all 53 CSA lessons.

**The exposure is 199 live pages, not 10 rows.** `config/site-architecture.json`
carries 146 handles ending `-frq`, which aliases to `exercise-3`, and 53 ending
`-debug`. The ten activities `/api/health` reports are the ones a student has
reached so far, not the extent of it.

## Why nothing caught it

`smoke/track-visit-completion-guard.js` exists for exactly this failure. It was
written on 2026-08-24 and tests lab, exercise-1 and exercise-2.

`exercise-3` was declared in `utils.js` on 2026-08-24, the same day. `debug`
entered the gradebook contract on 2026-09-01. Neither was added to the set and
neither was added to the guard, so the guard stayed green for four weeks over a
defect it was built to prevent.

That is the part worth keeping: a hardcoded list beside a vocabulary that grows
is a list that drifts, and a guard written the same way cannot tell you it has.
Not a hollow guard in the usual sense. It tested real things, correctly, and the
set of things it tested was simply frozen.

## The fix

`exercise-3` and `debug` join the set. Then section 8 of the guard DERIVES its
cases rather than listing them: every activity token a handle can produce, run
through the same `trailingActivity` the route uses, crossed with
`isGradedActivity` from `lib/gradebook-contract.js`. A new activity type fails
the suite the day it is added, until somebody classifies it.

`code` and `gap` are classified as deliberately auto-completing, each with its
reason on the record. 120 CSP `-code` pages are live and no `code` denominator
is authored anywhere, so no gradebook column depends on one completing. Whether
a CSP code page has a grading flow is a real question and it is about that
course, not about this set; changing it here without that evidence would be
guessing at 120 live pages.

## Evidence

    npm run smoke:trackguard              25 passed, 0 failed
    npm run rederive:trackautocomplete    the two derivations agree on 5 type(s)
    node scripts/deploy-gate.js deploy-gates/2026-09-21-track-graded-on-arrival.json
      3 independent kinds agree: suite, mutation, rederive

Mutations, each isolated:

    the exact pre-fix set              red on "exercise-3 -> exercise-3 is graded"
    only exercise-3 dropped            red on the same, independently
    only debug dropped                 red on "debug -> debug is graded"
    the derivation reaches nothing     red on "the derivation reaches exercise-3"

The first of those is not hypothetical. It is the code that was serving 199 live
pages until today, and the old guard was green against it.

There is no `live` check and that is deliberate. This change stops a FUTURE
visit from completing graded work; nothing observable in production moves when
it deploys. A sha pin would have been a dated receipt, which this repo learned
on 2026-09-18. The rederive is the honest kind: a text parse of the set against
a POST to `/track` per token, reading `progress.completed` back. It catches what
the suite cannot, since the set drives the behaviour and a change to the set
moves both sides together. What it finds is the LINKAGE breaking, and both
directions were measured against a deliberate break.

## Still open, and not mine

- **The ten existing rows.** Code cannot clear them. They carry `completed = 1`
  with a null score and `/api/health` will keep reporting them. Clearing them is
  a backfill against student records, which is on the `NEVER_AUTO` list.
  Tanner's call, and worth making: until then the gradebook counts ten pieces of
  work as attempted that nobody attempted.
- **`ap-csa 1.1 exercise-2`**, one of the ten, is stranger than the rest.
  `utils.js` says Unit 1 has no `exercise-2` ("No Unit 1 page emits it") and no
  `-exercise-2` handle exists for any Unit 1 lesson, yet
  `seed/csa-course-manifest.js` prices it at 6 points on all 53 lessons and a
  completion exists. Two authorities disagree about whether that column exists
  at all. Not touched here.
- **CSP `-code` pages**, above.
