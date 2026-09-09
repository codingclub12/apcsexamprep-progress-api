# The lesson switch promised to settle what was under it and never did

**Board:** 306. Reported by Tanner relaying a teacher: "1.2 have the lock off but
it isn't open."

She was clicking a switch that could not work, and there was no way for her to
tell. This is the second report from the same teacher today and a different bug
from the first.

## Reproduced before touching anything

```
teacher closes the LAB specifically, then opens the whole LESSON
  after closing the lab       LOCKED (explicit-closed)
  after opening the LESSON    LOCKED (explicit-closed)
  rows now: [1.2|*|1, 1.2|terminal-lab|0]

same, but she flips the ACTIVITY switch instead
  after opening the activity  open
```

## What the board promised and what the route did

`public/teacher-assignments.html` has said this since it shipped:

> A mixed switch settles everything under it OPEN on the first click, because the
> destructive direction should never be the one you get by accident.

`POST /api/teacher/classes/:code/gate` wrote ONE row at the clicked scope and
left everything narrower in place. Narrower always wins at read time, by design,
so the lesson-scope open she just wrote was outranked by the lab's own closing
row.

The board itself was honest. It re-renders from the resolved per-item state, so
after her click the lesson switch came back MIXED, correctly. Clicking a mixed
switch writes open again. So she was in a loop: click, nothing, click, nothing,
with the UI telling her the truth each time and no move available that would fix
it except finding the individual chip.

**A switch that cannot settle is worse than a missing one.** A missing control
sends you looking. A control that reports the true state and ignores your input
sends you to support.

## The fix, and the distinction that is the whole risk in it

A write now clears the rows it CONTAINS, within the same class and unit.

Containment, not width. Scope width is the obvious way to write this and it is
wrong: a lesson row `(1.2, *)` and an activity-type row `(*, quiz)` overlap
without either containing the other, so clearing one for the other throws away a
setting the teacher never spoke about.

```
write (*, *)       the unit          clears every row in the unit
write (1.2, *)     one lesson        clears (1.2, anything), NOT (*, quiz)
write (*, quiz)    every quiz        clears (anything, quiz), NOT (1.2, *)
write (1.2, quiz)  one assignment    clears nothing
```

The width version passes every test that only exercises the unit case, so it is
mutated explicitly rather than left to a reviewer's eye.

**Pinning survives**, and it is the feature the ladder exists for. Close the unit,
then open one lesson inside it: the narrow write clears nothing above itself and
still wins at read time. What no longer survives is a pin the teacher has since
written over from above, which is exactly what she means by clicking the wider
switch.

The response now reports `cleared`, so a write that deletes says what it deleted
rather than doing it quietly.

## An existing assertion moved, and it moved correctly

`smoke/gate-scope.js` wrote four rows in sequence and asserted all four survived.
The last of those writes is `(*, quiz)`, which now correctly settles the
`(1.1, quiz)` row underneath it, so the suite saw three.

That is the fix working. It is **reordered widest-first rather than relaxed**,
because what the block is for is that `/gates` names all four scopes, and that is
still true. Both behaviours are recorded in the comment, and an assertion was
added that the settling does happen in the other order, so a reader cannot
conclude from the reordering that nothing was ever swept.

## No live check, and the same reason as this morning

The behaviour that moved is what the teacher WRITE path stores, and observing it
against production needs a teacher credential. A session never asks for one. An
assertion about a read path would have passed yesterday and would be decoration.

The third kind is a rederive: every target shape against a full row set, run
through the real route, diffed against a containment predicate written from the
rule in English rather than from the DELETE's WHERE clause. It asserts the matrix
both clears and keeps rows, because a comparison in which nothing is ever cleared
proves nothing, and its own predicate is mutated to width to prove the diff is
sensitive to the distinction that matters.

## What this does not fix

Nothing here changes the READ ladder, which was right the whole time. And nothing
here answers the question still sitting on PR #644 about what a signed-out member
of the public gets from a closed assignment.
