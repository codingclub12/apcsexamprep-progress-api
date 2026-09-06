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

## Scopes: unit, lesson, assignment

Added 2026-09-06, because a teacher assigns by unit and by lesson and the table
could only name one assignment at a time. Locking Unit 3 meant writing a row per
activity and remembering to write another whenever a lesson was added.

There is no new table and no migration. A gate row may carry the literal `*` in
its `lesson` and/or `activity_type` column, standing for "every one of them", and
the primary key already covered that shape. A row written before this existed has
real ids in both columns, which is an activity-scope row, and it resolves exactly
as it always did.

| unit | lesson | activity_type | what it says |
|---|---|---|---|
| `unit-3` | `*` | `*` | every activity in unit 3 |
| `unit-3` | `*` | `quiz` | every quiz in unit 3 |
| `unit-3` | `3.2` | `*` | everything in lesson 3.2 |
| `unit-3` | `3.2` | `quiz` | that one assignment |

**Precedence is by narrowness, and it is stated rather than discovered.** A
teacher who locks a unit and then opens one lesson inside it means the second
thing, so:

1. the exact activity, `(lesson, activity)`
2. the lesson, `(lesson, *)`
3. the activity type across the unit, `(*, activity)`
4. the unit, `(*, *)`
5. `classes.quiz_lock_default`

2 beats 3 because a lesson is one lesson and an activity type spans every lesson
in the unit, so the lesson row is the narrower statement. That is the only tie a
teacher can write by accident, and it is decided in `lib/activity-gate.js` and
asserted in `smoke/gate-scope.js` rather than left to whatever order SQL returns
the rows in. The suite writes the pair both ways round, because the first version
of that assertion passed under a resolver reduced to "keep the first row you see"
purely because the lesson row happened to come back first.

Nothing is expanded into per-activity rows. Resolution happens on every read, the
same posture as `passed` against `mastery_threshold`, so a lesson added to a
course next term inherits its unit with no backfill and nothing to keep in sync.

**Clearing is not the same as opening.** An explicit open PINS an assignment
against a later unit lock; `DELETE /gate` removes the row so the next widest scope
decides again. Without the delete, a teacher who pinned something open had no way
back.

## Teacher API

    PUT    /api/teacher/classes/:code           { quiz_lock_default: 1 }
    POST   /api/teacher/classes/:code/gate      { course, unit, lesson?,
                                                  activity_type?, open }
    DELETE /api/teacher/classes/:code/gate      { course, unit, lesson?,
                                                  activity_type? }
    GET    /api/teacher/classes/:code/gates
    GET    /api/teacher/classes/:code/assignments

`course` and `unit` are always required on a write. An omitted `lesson` or
`activity_type` means `*`, which is how a whole unit or a whole lesson is set in
one call. A course-wide lock is `quiz_lock_default` and deliberately has no second
spelling here.

The listing returns `quiz_lock_default` alongside the rows on purpose: a list of
rows cannot be read correctly on its own, because an empty list means "everything
open" under one default and "everything locked" under the other. Each row now
carries the `scope` it expresses so the list is readable without decoding the
asterisks.

`/assignments` is the board the toggle UI reads. It calls
`buildCanonicalGradebook` and throws the student rows away, so the lock a teacher
flips, the lock the gradebook draws, and the lock a student hits all come out of
one builder. A second, lighter query over `activity_gates` would be faster and
would eventually disagree.

## In the gradebook

The canonical contract carries availability beside the grade, because "nobody has
done the Unit 3 quiz" and "the Unit 3 quiz is locked" are the same fact and a
teacher should not need two screens to join them.

Per item: `locked`, `lock_scope`, `lock_reason`, `lock_explicit`, and
`lock_enforceable`. Plus a `gates` block carrying the class default, the explicit
rows, and `units` / `lessons` roll-ups with three states, `all`, `none` and
`mixed`. Three, not two: collapsing `mixed` is how a teacher flips a switch that
already looked the way they wanted it.

`lock_enforceable` is the honest one. **A lock only bites where the server hands
out the questions**, per the limitation at the top of this document, so an
activity with no `quiz_bank` rows gets `false` and the UI draws it differently.
`gates.locked_but_unenforceable` names those columns rather than counting them,
because each one is a quiz to migrate onto the server render path before its
padlock means anything.

## Teacher UI

`/teacher/assignments`, served from this repo, teacher JWT read from
`localStorage` under `apcse_teacher_token`.

**Two things about that, both found on 2026-09-06 and both load bearing.**

The key is `apcse_teacher_token`, with an "e". The board shipped reading
`apcs_teacher_token` and `teacher_token`, and NOTHING writes either of those.
The Command Center and `shopify/cyber-dashboard.html` both write and read
`apcse_teacher_token`, checked against the live page bodies. A token key is a
bare string shared across three pages on two origins, so
`smoke:gatescopemutation` now breaks it on purpose and requires the board to
render signed-out.

**And `localStorage` is origin-scoped, which decides where this page can live.**
The Command Center is served from `www.apcsexamprep.com` and writes the token
there. This page is served from `progress.apcsexamprep.com`. A plain link
between them lands every teacher on "sign in first" with no way through, because
the second origin cannot read the first one's storage, and nothing sets a
parent-domain cookie to bridge it. So the board reaches teachers the way
`/pages/cyber-dashboard` already does: as a SHOPIFY PAGE, same origin as the
Command Center, calling this API across the network rather than reading its
storage. The copy under `public/` stays the source and the page body is
generated from it. Switches at unit,
lesson and assignment level: green is assigned, grey is locked, half-filled means
the things under it disagree. An inherited switch is drawn in italics, so setting
it explicitly reads as the pin that it is.

A mixed switch settles everything under it OPEN on the first click, because the
destructive direction should not be the one you get by accident.

The operator gradebook at `/admin/gradebook` shows the same state read-only: a
padlock on a locked column, a warning triangle where the lock is not enforceable.
Read-only on purpose. The admin session cookie authorizes GET and nothing else,
which is what closes CSRF against the admin API, and making those switches live
would have meant weakening it.

## What is not built yet

- **Scheduled windows.** `opens_at` / `closes_at` were considered and left out.
  A teacher who wants a quiz open for one period will say so by opening it, and a
  schedule that silently closes an assessment mid-attempt is a support ticket
  waiting to happen. If it is added, the attempt in flight has to survive it.
- **Per-student exceptions**, for the absent student making it up later. The
  shape would mirror `students.retry_override`: a nullable per-student column
  consulted ahead of the class default. Worth building only once a teacher asks.
- **Due dates.** Locking says what a class can reach right now. It says nothing
  about when work is due, and the two should not be collapsed into one row.

## Testing

    node scripts/seed-quiz-bank.js
    API_BASE=http://127.0.0.1:4311 node smoke/quiz-gate.js     # npm run smoke:quizgate
    npm run smoke:gatescope             # the scopes, the ladder, the contract
    npm run smoke:gatescopemutation     # and proof those assertions are not hollow

Twenty assertions covering: an untouched class behaving as before, the class
default closing quizzes with no per-activity writes, self-study staying open,
opening one activity opening only that one, and a token minted while open failing
to spend after close.

`smoke:gatescope` is 59 assertions over the ladder, both enforcement points, the
teacher API, the contract, and a block asserting that everything which worked
before still does, reason strings included.

`scripts/verify-assignment-lock-live.sh` is the LIVE check, and it is the one
the offline suites cannot make: it drives a real class through a real teacher
token and a real student token, and asserts what the student is actually served.
Twelve assertions covering the baseline, a one-call unit lock, the reason string,
questions never reaching the wire, a lesson beating its unit, and the board
agreeing with the render path. It cleans up its own gate rows in a trap, so an
early failure does not leave a class locked.

Two things it insists on. It must run against AP Cybersecurity Unit 1, because
those five quizzes are the only locations on the server render path, and pointing
it at CSA would show a locked quiz still serving, which is the feature reporting
honestly rather than a bug. And it writes real rows to a real class, so it wants
a test class or a quiet hour rather than a live period.

**RUN AGAINST PRODUCTION 2026-09-06, 12 passed 0 failed**, on class CYBER-Q9JG
(a class named TEST, roster of synthetic students). That closes the claim the
offline suites could not make. What it established, in the order it matters:

- a single unit-scope write locked every quiz in Unit 1, and the render path
  answered `locked: true`, `reason: "unit-closed"`, `questions: null`. The
  questions were never put on the wire, which is the only kind of lock that
  survives View Source.
- opening lesson 1.1 inside the locked unit reopened 1.1 and left 1.2 shut, so
  the precedence ladder behaves in production exactly as the suite asserts.
- the teacher board reported the unit as `mixed`, agreeing with what the student
  was actually served.
- cleanup left zero gate rows, verified independently afterwards: all five Unit 1
  quizzes serve 5 questions each and `GET /gates` returns an empty list.

The same run printed 19 unenforceable columns in that one unit, which is the
`lock_enforceable` field earning its place rather than a defect.

`smoke:gatescopemutation` breaks thirteen rules one at a time and requires the
suite to go red FOR THAT RULE. Per rule, not in aggregate: "the suite went red"
is not evidence that the rule you meant to test does anything, and a mutation
that reddens only a neighbouring assertion is reported as a failure. It caught
one hollow assertion on its first run, which is the whole reason it exists.

The mutation worth understanding is the fourth one, which puts the render path
back on an equality match against `lesson` and `activity_type`. That is the SQL
this feature had to change: a unit-scope row is invisible to it, so the resolver
could be perfect and every student would still walk straight through a unit lock.
A resolver-only assertion passes happily under it.
