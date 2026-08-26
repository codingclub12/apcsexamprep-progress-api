# 2026-08-26 - Cyber quiz stems moved to student register, and seed converge

## What prompted it

Tanner, reading the landed 1.1 and 1.2 quizzes: "get rid of the 'Per EK' portion
of the question. That is for teacher facing documents."

He raised a second, larger point in the same message, which is NOT settled by this
change and is recorded below rather than acted on.

## What changed

The Unit 1 banks were transcribed from the teacher bundle's Quiz_KEY.docx files
with the framework citations left in the stems, because the documents are written
for the person grading. On a student page that is wrong twice: it is the wrong
register, and "Per EK 1.1.A.2" is a usable search term for the answer.

- 20 of 21 stems rewritten (the Instagram/Biscuit item was already clean).
- 5 options rewritten. Four of them were 1.2 Q9, which used bare EK codes AS its
  answer choices, so that question could not be fixed by editing the stem alone.
- No EK, LO, CED or CB reference survives in any field a student can see.
- Explanations keep their citations deliberately. routes/quiz.js ships them only
  when the teacher has released the key, and at that point naming the EK is the
  useful thing to do: it tells a student who got it wrong where to look.

## Why this could not disturb a saved gradebook

Wording was the only thing that moved. The diff contains no `correct_index`, no
`qid`, no `points` and no `serve_count` line, and both keys still match the bundle
answer grids: 1.1 `ACBDABCBD`, 1.2 `CADBAACCBDBD`. Independently of that, a grade
is frozen at submission because routes/quiz.js persists points and max_points per
sitting, which smoke/denominator-safety.js already pins.

## The bug that would have eaten this fix

The boot seed was `INSERT OR IGNORE`. The rows already existed in production, so
editing seed/ and deploying would have gone green and changed nothing live, with
no warning. That is the same failure shape as the theme's connected-branch story.

So a deploy now CONVERGES quiz_bank onto seed/. The distinction worth keeping:
course_manifest and the CSA bank stay insert-or-ignore because there the database
is the authority and the seed is only a floor. quiz_bank is the opposite. These
rows are authored content, reviewed in a pull request, and nothing else writes
them, so the file is the authority and a deploy should make the database agree.

Two safety rails came with it:

- A qid dropped from seed/ is RETIRED, not deleted: `active = 0` so it stops being
  served, row intact so any score_events tied to it still resolve.
- A source listing zero questions THROWS instead of retiring the location. An
  empty array is far more likely a bad edit than an instruction to unpublish, and
  the cost of guessing wrong is a class sitting down to an empty page.

## Evidence

    smoke:quizauthoring   23 passed, 0 failed   (new)
    smoke:quizgate        20 passed, 0 failed
    smoke:denomsafety     11 passed, 0 failed
    smoke:answerkeys      13 passed, 0 failed
    smoke:contract        42 passed, 0 failed
    smoke:cyberdenoms     57 passed, 0 failed

smoke/quiz-bank-authoring.js is the durable part. It checks the citation rule at
the source AND on the rendered payload, pins that the payload still withholds
correct_index and explanation, and proves converge and retirement behave. It makes
the rule enforced rather than remembered, which matters because the 25 Unit 1 quiz
pages still unaudited (ledger #124) will be transcribed from the same documents.

## Still open

**Whether the online quiz should match the teacher bundle at all.** Tanner: "I
don't know that I want the online quizzes to match the Teacher Bundle across the
board or students may find a way to cheat those."

This is a real tension and it is not resolved by stripping citations. Jukka's
original report asked for the two to MATCH; the offline documents were his
reference for what correct looked like. But matching also means a leaked teacher
document is a leaked online assessment, and the bundle is sold as premium.

The honest shape of the choice: correctness and identity are separable. The online
quiz must be lesson-aligned and CED-correct, which is what this pass and the last
one delivered. Whether it is the SAME instrument as the paper one is a separate
call, and diverging means authoring a second pool against the same EKs. That is
content work with a pricing dimension, not a code change, so it stays with Tanner.
Nothing in the current design blocks it: quiz_bank is per-location, so a divergent
pool is new rows, and retirement now handles swapping the old ones out cleanly.

Also still open: ledger #126 (reply to Jukka, never sent), #124 (25 unaudited quiz
pages), #125 (student handout drops the citation mid-stem), teacher UI for the
availability gate, and the dead apcs-quiz-wiring.js load on migrated theme pages.
