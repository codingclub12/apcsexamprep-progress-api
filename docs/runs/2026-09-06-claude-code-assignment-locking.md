# 2026-09-06: Assignment locking by unit, lesson and assignment

Tanner asked for teachers to be able to lock and unlock assignments, to see the
state in the gradebook as a phone-style green/grey switch, and to set it at unit,
lesson and individual assignment level.

Board task 246, claimed as claim 136 with locks on `lib/activity-gate.js`,
`lib/gradebook-contract.js`, `routes/teacher.js`, `routes/quiz.js`,
`public/gradebook.html` and `docs/quiz-locking.md`. No task existed, so one was
created first; the board showed `in_flight: []` at session start, so nothing
collided.

## What was already there, which changed the shape of the work

`activity_gates` has existed since the quiz-locking build: one row per
`(class, course, unit, lesson, activity_type)`, resolved at read time by
`lib/activity-gate.js` and enforced at both the render and the submit path in
`routes/quiz.js`. So this was not a new feature. It was three gaps in an existing
one:

1. A row could only name ONE assignment. "Lock Unit 3" meant writing a row per
   activity and remembering to write another whenever a lesson was added.
2. Nothing surfaced the state in a gradebook.
3. There was no teacher UI at all. The old doc said so plainly: "This is API
   only. Today a gate is set with a POST."

## What changed

**Scopes, with no schema change.** A gate row may now carry the literal `*` in
its `lesson` and/or `activity_type` column. The primary key already covered that
shape, so there is no migration and no backfill. Four scopes fall out of the two
columns: the unit, an activity type across the unit, a lesson, and one
assignment. A row written before today has real ids in both columns, which is an
activity-scope row, and resolves exactly as it always did.

Precedence is by narrowness, stated rather than discovered: activity, then
lesson, then activity-type-across-the-unit, then unit, then
`classes.quiz_lock_default`. Lesson beats activity-type-across-the-unit because a
lesson is one lesson and an activity type spans every lesson in the unit. That is
the only tie a teacher can write by accident.

Nothing is expanded into per-activity rows. Resolution happens on every read, the
same posture the repo already takes for `passed` against `mastery_threshold`, so
a lesson added next term inherits its unit with nothing to keep in sync.

**`DELETE /api/teacher/classes/:code/gate`.** Clearing is not the same as
opening, and without this a teacher who pinned an assignment open had no way
back. An explicit open pins against a later unit lock; the delete hands the
decision back to the next widest scope.

**The gradebook carries it.** `lib/gradebook-contract.js` adds `locked`,
`lock_scope`, `lock_reason`, `lock_explicit` and `lock_enforceable` per column,
plus a `gates` block with the class default, the explicit rows, and unit/lesson
roll-ups in three states. Two class-scoped queries, not one per item. Both the
teacher route and the admin `as-teacher` route read the same builder, so the two
cannot drift.

**Teacher UI at `/teacher/assignments`.** Switches at unit, lesson and assignment
level, teacher JWT from `localStorage` exactly as `/teacher/change-password`
does. Green assigned, grey locked, half-filled where the things underneath
disagree. A mixed switch settles everything under it OPEN on first click, because
the destructive direction should not be the one you get by accident.

**`/admin/gradebook` shows the same state read-only**, a padlock per locked
column. Read-only deliberately: the admin session cookie authorizes GET and
nothing else, which is what closes CSRF against the admin API, and making those
switches live would have meant weakening it.

## The thing worth carrying forward

**A lock only bites where the server hands out the questions.** That limitation
was already written down and it is still true: an activity whose questions are
baked into the Shopify page body cannot be locked at all, because the browser has
the whole instrument before any gate runs. Every AP Cybersecurity Unit 1 quiz was
in that state when gating was built, so this is the common case rather than the
edge one.

A toggle that drew a padlock over such a column would promise a teacher something
the server cannot deliver, so the contract reports `lock_enforceable` from
`quiz_bank` presence, `gates.locked_but_unenforceable` NAMES those columns rather
than counting them, and both UIs draw them differently: a dashed outline and a
warning triangle on the teacher page, a triangle rather than a padlock in the
operator gradebook. The named list is the migration queue.

## Evidence

`smoke:gatescope`, 68 assertions, offline, picked up by CI automatically because
`tests.yml` derives its suite list from `package.json`. It covers the ladder
exhaustively (every pair of scopes that can disagree, set to disagree), both
enforcement points against the live routes, the teacher API including ownership,
the contract, the shipped page executed against the real endpoint response, and a
block asserting that everything which worked before still does, reason strings
included.

`smoke:gatescopemutation`, 103 assertions over 17 mutations. Each mutation names
the assertions it must break, and a mutation that reddens only a NEIGHBOURING
assertion is reported as a failure rather than a pass. The battery restores every
file in a `finally` and then proves byte-identity rather than assuming it.

The mutation worth understanding is the fourth: it puts the render path back on
an equality match against `lesson` and `activity_type`. That is the SQL this
feature had to change, and a unit-scope row is invisible to it, so the resolver
could be perfect and every student would still walk straight through a unit lock.
A resolver-only assertion passes happily under it.

**The battery earned its keep on its first run.** It found one assertion in the
new suite that was hollow: the tie between a lesson row and a unit-activity row
was checked through SQL, and it passed under a resolver reduced to "keep the
first row you see" purely because the lesson row happened to come back first. The
suite now writes that pair both ways round.

Regression: the full 200-suite offline run, the same list CI derives. Also
checked directly: `smoke:quizgate` (20), `smoke:admingates` (43),
`smoke:assistantdiag` (61), `smoke:gradebook` (58), `smoke:contract` (49),
`smoke:gbagree` (26), `smoke:admingbpage` (21), `smoke:teacheradmin` (45),
`smoke:canvas` (101), `smoke:encoding`, `smoke:volumepaths`.

## Still open

- **Nothing here has been observed in production.** Every number above is an
  offline suite. The live check belongs to a session that is not this one, and it
  needs a teacher JWT: create a gate at unit scope on a real class, then confirm
  `GET /api/quiz/...` answers `locked: true` with `reason: "unit-closed"` for a
  student in it. `GET /api/teacher/classes/:code/gates` needs the teacher
  credential and this session holds only `COMMAND_READ_TOKEN` and `TODO_KEY`.
- **The theme-side teacher Command Center does not link `/teacher/assignments`
  yet.** That is theme work, in the other repo, against
  `claude/site-linking-audit-yhufjk`. Until it lands the page is reachable only
  by typing the URL.
- **How many live columns are lockable at all** is unmeasured. The count is
  `quiz_bank` locations against `course_manifest` graded columns, and the answer
  decides whether this feature is mostly real or mostly decoration today. Worth a
  board task on its own.
- Scheduled open/close windows and per-student exceptions are still deliberately
  not built. Reasons are in `docs/quiz-locking.md`.
- Due dates remain out of scope. Locking says what a class can reach right now,
  which is a different question from when work is due, and the two should not
  share a row.
