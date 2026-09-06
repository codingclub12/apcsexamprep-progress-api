# CSA lesson 1.1 onto the server render path, and what the pilot found

2026-09-06. Board 248, the first migration off it.

## The assignments feature was already built, which is the first thing to say

Board 246 shipped four gate scopes, enforcement at both the render and submit
paths, and a gradebook that reports `lock_enforceable` per column. None of that
needed redoing. What board 248 names is the gap underneath it: a lock only bites
where the SERVER hands out the questions, and that was five columns out of 762.

## CSA is a bigger job than "move some questions", and the reason is structural

CSA does not merely keep its questions in the page. It scores through a system
other than the one the lock enforces in, and there are three of them in play:

    GET /api/quiz/...            quiz_bank    questions AND keys   lock enforced
    POST /api/progress/attempt   attempts     no keys server side  lock cannot bite
    POST /api/student/score      progress     keys only            lock cannot bite

Migrating a CSA quiz is therefore not a content move, it is moving that quiz onto
the first row. That is why this starts with one lesson rather than fourteen, and
it is the fact most likely to be missed by anyone scoping the remaining 757.

**Correction, same day.** The first version of this section said "Every CSA quiz
reports through System B", naming `POST /api/student/score` and
`quiz_answer_bank`. That is wrong for 1.1 and wrong as a general claim about CSA.
CSA has two report paths and the lesson pages are on the one this note did not
name:

- `ap-csa-lesson-*`, which is all fifteen Unit 1 lesson pages including 1.1, is
  driven by `shopify/apcs-reporter.js` and posts to `POST /api/progress/attempt`.
  That writes the `attempts` table and is gated by `course_manifest`, where 1.1
  is `1.1-quiz` worth 2 points. No key is stored server side at all: the page
  grades itself and reports a number.
- `POST /api/student/score` against `quiz_answer_bank` is the path for the five
  `ap-csa-course-*` pages named in `seed/csa-answer-bank.js`, all of them Unit 2
  and Unit 4. 1.1 is not among them.

The conclusion held, which is why the sentence survived a read: neither path is
`quiz_bank`, so a gate row against `1.1-quiz` protects nothing until step 2
lands. But the table matters to anyone scoping the rest, because the two paths
write different ones, and "keys only" was the wrong description of a path that
stores no key.

## What the live page was doing

`ap-csa-lesson-1-1-intro-algorithms`, 103,181 bytes, carries **nine `data-answer`
attributes**, two of which are the MCQ parts of the Tier 3 mastery challenge and
the rest CFU widgets. (An earlier draft said ten. Counted against the fetched
body: nine.) View Source is the answer key for the lesson. The gate is not
the only thing this migration fixes, and on current evidence it is not even the
more urgent one.

## What moved, and what deliberately did not

Parts A and B of the 1.1 mastery challenge, with their options, keys and feedback
unchanged, into `quiz_bank` as `ap-csa:unit-1:1.1:quiz#w1` and `#w2`.

**Part C stayed on the page.** It is a structured response with a self-scoring
rubric whose textarea is submitted nowhere, so it is not a graded column. It also
must not become one: this repo stores no free-text student input outside the
sandbox exception, and server-scoring a written answer would be a second
exception rather than a feature.

**Nothing came from the CSA teacher bundle.** Same rule as
`seed/cyber-unit-1-web-quizzes.js`: a bundle question is worth something because
it is not published, and publishing one spends that for every teacher using the
bundle. The bundle's own Bell Ringer and Quiz for 1.1 are untouched.

**No `stem` column was added.** `quiz_bank` rows are flat and the 1.1 challenge
shares one scenario across its parts. Adding schema to carry a lesson's narrative
would be a column for a formatting problem, so each prompt carries the part of
the scenario its own question needs.

## This deploys safely and changes nothing a student sees

`assets/apcs-quiz-mount.js` in the theme mounts only on an element carrying
`data-apcs-quiz`, and no CSA page or template carries it. So the API starts
answering for 1.1 and no page consumes it. That is step 1 of three. Step 2, the
page body dropping its questions and mounting the container, is a Matrixify
change and is what actually closes the leak and makes the lock bite. Until it
lands the lock on 1.1 is still decoration, and the run note says so rather than
letting a green suite imply otherwise.

## Evidence

    smoke:csaquizbank   18 assertions, 0 failed
    hollowness          making the API return correct_index fails exactly the
                        two assertions written for it, 16 passed 2 failed

The suite loads the REAL seed through `scripts/seed-quiz-bank.js` rather than
fixtures, so a typo'd course or lesson fails here instead of looking like "no
server-scored quiz for this location" in production, which reads as the migration
never having happened.

It asserts the key does not reach the wire three ways, because the field names
are the easy half: `correct_index` absent, `explanation` absent, and the correct
option present in the payload but carrying no flag of any kind. A migration that
served the key from the API would have relocated the leak rather than closed it
and would still look right in a browser.

Two of my own mistakes, both in the test rather than the code:

- Submit was asserted on `max_score`, which the route does not return. It returns
  `score` and `total`.
- The answers were mapped using the bank's own `correct_index` against the served
  option positions. Options are shuffled per student and the order token owns the
  positions, so this scored 1 of 2 and looked like a broken key. It matches on the
  TEXT of the correct option now, and a deliberately wrong submission is asserted
  to score 0, or the correct one proves nothing.

## Step 2, written the same session

`scripts/csa-11-quiz-mount-csv.js` swaps the 3,602 bytes carrying the two MCQ
blocks for the mount container the cyber quizzes already use, and appends the
mount script. 103,181 bytes down to 99,806, `data-answer` 9 to 7, preflight clear
with the original body handed over for the round trip.

The span is held as a file, `imports/2026-09-06/csa-11-removed-span.html`, rather
than as a pattern. A regex over 103KB of hand-authored markup is how the wrong
thing gets deleted, and the thing being deleted here sits between two headings
that both have to survive.

Three things stay, each for a reason worth writing down. The scenario paragraph:
Part C asks the student to explain Jordan's remaining bug, so removing the setup
would orphan it. Part C itself: its textarea is submitted nowhere, so it is not a
graded column and must not become one under the no-free-text rule.
`data-item-id="1.1-quiz"`: `apcs-reporter.js` returns early on `if (!exs.length)`,
so with no `.apcs-ex` children it will not fire, and removing the attribute would
be an unforced change to markup other things may read.

### The gradebook column survives the move, checked before writing any of it

`attempts` and `progress` are different tables, so the real question was whether
1.1 would simply go dark for teachers. It does not.
`lib/gradebook-contract.js` keys columns by `unit-1/1.1/quiz` and normalises both
sources onto it. Three students on a scratch database, one scored each way:

    attempts 2/2   ->  earned 2, possible 2, pct 100, source "attempts"
    progress 100%  ->  earned 2, possible 2, pct 100, source "progress"
    progress  50%  ->  earned 1, possible 2, pct  50, source "progress"

Same column, same manifest denominator, `class_avg_pct` 83.3 across the three.

### Nothing in this repo would have caught a 3.5KB mistake

`lib/live-body-guard.js` has a `contentLoss` check and the real removal returned
zero findings from it. It is not broken, it is coarse. Measured: nothing on a
2,036 byte deletion, 36 entries on a two-thirds one. So the generator's own
round trip is the load-bearing guard here, and it had to be proven able to go red
rather than assumed to be.

### The mutation run found a hole rather than a hollow assertion

`smoke/csa-quiz-mount.js` mutation tests every rule. Eleven source mutations, all
red for their own rule. One case is the reason this section exists:

**A body carrying the span TWICE passes every check.** `replace()` takes the
first occurrence, so the length is right. Swapping the mount back for the span
returns the original byte for byte. The answer count still drops by exactly 2,
because the surviving duplicate supplies the two attributes the count expected to
lose. Every rule green, and the questions and their keys still on the page.

`replaceSpan`'s occurrence count was the only thing in front of that, so `build()`
now also asserts the span is absent from the result. Two independent guards on the
one thing the file exists to do.

`verifyReplacement` came out of `replaceSpan` for the same reason `verifyInsertion`
came out of `splice`: a suite that can only call `replaceSpan` cannot hand it a
corrupted body, and the mutation that matters transposes two bytes without
changing the length, which no length check can see.

### And the mutation harness itself was wrong first

`if (hits !== 1)` appears twice in `lib/page-section-insert.js`. The first run
patched the copy in `splice()`, left `replaceSpan` untouched, and reported the
occurrence rule hollow. The harness refuses a mutation pattern that is not unique
in its file now. This is the third time in two days that a check aimed at the
wrong string reported a confident, wrong result, and all three were caught by
looking at exit codes rather than at messages.

## What is still open

- **The import has not run.** The sheet is generated and preflight-clear, and
  until it is imported the leak on 1.1 is live and the lock is still decoration.
- **Thirteen more Unit 1 quizzes**, then 121 CFUs, then units 2 to 4. Each quiz
  needs its page read: the parts, the answer letters and the feedback all live in
  the body and none of it is derivable from this repo.
- **The 757 figure is still a repo measurement.** Production's `quiz_bank` may
  hold locations no seed script created. `GET /api/admin/class/:id/gates` lists
  exactly the activities driven by `quiz_bank` and needs the admin key, which no
  session has had. Until that runs, the migration queue is an estimate.
