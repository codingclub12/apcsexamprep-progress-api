# Locking a quiz so it can be a graded assessment

A founding-cohort AP Cybersecurity teacher asked for this directly: quizzes
locked by default, opened by the teacher when the class sits them. The reason is
the obvious one. A quiz a student can open a week early is not an assessment, it
is a study guide with an answer key attached.

This document is the design, and the one limitation that decides whether the
feature is real or theatre.

## The limitation, first, because it governs everything else

**A lock is only real where the server hands out the questions.**

`assets/apcs-slides-gate.js` in the theme repo learned this the expensive way and
says it plainly: hiding something with CSS or JavaScript does not fix it, because
the URL is still in the HTML the server sent. The same is true of a quiz. If the
questions and the `data-correct` answers are baked into the Shopify page body,
then by the time any code runs, the browser already has the whole instrument.
View Source defeats it. So does Reader Mode.

Every AP Cybersecurity Unit 1 quiz was in exactly that state when this was
written. `GET /api/quiz/ap-cybersecurity/unit-1/1.1/quiz` answered

    {"error":"No server-scored quiz for this location"}

which means the page, not the API, owned the questions.

So locking is not a switch that gets flipped. It is a migration, one quiz at a
time, onto the server render path:

1. The questions and keys move into `quiz_bank` (`scripts/seed-quiz-bank.js`).
2. The page body stops carrying questions and mounts a container that calls
   `GET /api/quiz/:course/:unit/:lesson/:activity_type`.
3. From that point the gate below is load-bearing, and the answer key has also
   stopped shipping to the browser, which is a second bug fixed by the same move.

A quiz that has not been through those steps can still be given a gate row. It
just will not be protected, and nobody should be told otherwise.

## The two questions that look like one

`key_releases` already existed and is easy to confuse with this.

| table | question it answers |
|---|---|
| `key_releases` | after a student submits, do they see the correct answers? |
| `activity_gates` | may the student open the quiz at all? |

They are deliberately separate rows, because all four combinations are real. The
normal exam case is open with the key withheld. Revision after the test is closed
with the key released. Collapsing them into one flag would make the second case
unreachable.

## How a gate resolves

`lib/activity-gate.js` is the only implementation, and both the render path and
the teacher listing call it, so the operator view cannot drift from what students
actually get.

Resolution order, recomputed on every read and never stored:

1. **No class** (public visitor, or a solo `ME-` account) -> open. These students
   have no teacher to open anything for them, so a gate would lock them out of
   their own practice permanently.
2. **An explicit `activity_gates` row** -> that row wins, open or closed.
3. **Otherwise the class default**, `classes.quiz_lock_default`:
   - `0` -> open. This is the value every existing class has and the default for
     every new one, so nothing that works today changes.
   - `1` -> closed, but only for `quiz` and `exam`.

That last restriction is deliberate. A teacher flipping their class to
locked-by-default is thinking about assessments. If the same switch also closed
the practice exercises, their students would hit a wall on that night's homework
and the teacher would have no idea why. An explicit row can still close any
activity type for a teacher who wants exactly that.

Recomputing rather than storing is the same posture the repo already takes for
`passed` against `mastery_threshold` and for `auto_dispatch` capability: flipping
the class default re-gates every activity immediately, with no migration and no
stale flags to hunt down.

## Enforcement points

Both, not one.

**Render.** `GET /api/quiz/...` returns `200` with `locked: true`,
`questions: null`, and no `order_token`. It is a 200 rather than a 404 so the
page can tell "your teacher has not opened this yet" apart from "this quiz does
not exist", which are very different things to put in front of a student.

**Submit.** `POST /api/quiz/submit` re-checks and returns `403`. Without this, a
student who loaded the quiz while it was open could hold the `order_token` and
spend it after the teacher closed the quiz, and a token minted before a class was
switched to locked-by-default would still work. Render-time-only checks leak
through exactly that gap.

## Teacher API

    PUT  /api/teacher/classes/:code           { quiz_lock_default: 1 }
    POST /api/teacher/classes/:code/gate      { course, unit, lesson,
                                                activity_type, open }
    GET  /api/teacher/classes/:code/gates

The listing returns `quiz_lock_default` alongside the rows on purpose: a list of
rows cannot be read correctly on its own, because an empty list means "everything
open" under one default and "everything locked" under the other.

Opening an activity in a class whose default is `0` is still meaningful. It pins
that activity open, so a later switch of the class to locked-by-default leaves it
open.

## What is not built yet

- **A teacher UI.** This is API only. Today a gate is set with a `POST`.
- **Scheduled windows.** `opens_at` / `closes_at` were considered and left out.
  A teacher who wants a quiz open for one period will say so by opening it, and a
  schedule that silently closes an assessment mid-attempt is a support ticket
  waiting to happen. If it is added, the attempt in flight has to survive it.
- **Per-student exceptions**, for the absent student making it up later. The
  shape would mirror `students.retry_override`: a nullable per-student column
  consulted ahead of the class default. Worth building only once a teacher asks.

## Testing

    node scripts/seed-quiz-bank.js
    API_BASE=http://127.0.0.1:4311 node smoke/quiz-gate.js     # npm run smoke:quizgate

Twenty assertions covering: an untouched class behaving as before, the class
default closing quizzes with no per-activity writes, self-study staying open,
opening one activity opening only that one, and a token minted while open failing
to spend after close.
