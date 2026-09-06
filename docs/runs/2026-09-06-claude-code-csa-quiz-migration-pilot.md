# CSA lesson 1.1 onto the server render path, and what the pilot found

2026-09-06. Board 248, the first migration off it.

## The assignments feature was already built, which is the first thing to say

Board 246 shipped four gate scopes, enforcement at both the render and submit
paths, and a gradebook that reports `lock_enforceable` per column. None of that
needed redoing. What board 248 names is the gap underneath it: a lock only bites
where the SERVER hands out the questions, and that was five columns out of 762.

## CSA is a bigger job than "move some questions", and the reason is structural

CSA does not merely keep its questions in the page. It scores through a
different system than the one the lock enforces in.

    System A   GET /api/quiz/...          quiz_bank          questions AND keys   lock enforced
    System B   POST /api/student/score    quiz_answer_bank   keys only            lock cannot bite

Every CSA quiz reports through System B. So migrating a CSA quiz is not a content
move, it is moving that quiz onto the other scoring system. That is why this
starts with one lesson rather than fourteen, and it is the fact most likely to be
missed by anyone scoping the remaining 757.

## What the live page was doing

`ap-csa-lesson-1-1-intro-algorithms`, 103,181 bytes, carries **ten `data-answer`
attributes**: six CFUs, one code exercise, and both MCQ parts of the Tier 3
mastery challenge. View Source is the answer key for the lesson. The gate is not
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

## What is still open

- **Step 2 for 1.1 has not been written.** Until the page body changes, the leak
  and the decoration both remain.
- **Thirteen more Unit 1 quizzes**, then 121 CFUs, then units 2 to 4. Each quiz
  needs its page read: the parts, the answer letters and the feedback all live in
  the body and none of it is derivable from this repo.
- **The 757 figure is still a repo measurement.** Production's `quiz_bank` may
  hold locations no seed script created. `GET /api/admin/class/:id/gates` lists
  exactly the activities driven by `quiz_bank` and needs the admin key, which no
  session has had. Until that runs, the migration queue is an estimate.
