# The lab he could not open had no switch anywhere

**Board:** 307. Second report from the same teacher today, third bug, and the
only one where he could see both halves of the contradiction on his own screen.

His students' page said, in adjacent sentences:

> This one is practice. It checks your work on the page and records nothing.
>
> Your teacher has not opened this lab yet.

## Two different labs

He unlocked Quiz and Lab on his 1.2 row. That Lab chip is `1.2-auth-lab`, "Read
the login log", graded, filed at unit-1 / 1.2.

His students were opening `/pages/ap-cyber-unit-1-lesson-2-lab`, which mounts
`1.2-lab`, "Find the tournament code". The title on his screenshot is the
tournament one, so there is no ambiguity about which lab it was.

`1.2-lab` is UNGRADED and the server files it at **unit-4 / 4.3**.

```
lesson 1.2 page  ->  /pages/ap-cyber-unit-1-lesson-2-lab  ->  1.2-lab
1.2-lab spec     ->  unit-4 / 4.3, graded=false, "Find the tournament code"
1.2 Lab chip     ->  1.2-auth-lab, unit-1 / 1.2, graded=true
```

## Why nothing he could click would ever have worked

An ungraded lab gets no `course_manifest` row on purpose. `seed-manifest.js` says
why, and it is a good reason:

> a manifest row is a denominator, and a denominator for work a student cannot do
> marks the whole class down for a reason no teacher can see on screen. A practice
> lab is playable and scores nothing, so it gets no row.

No row means no gradebook column, which means **no switch anywhere on the
assignments board**. `routes/labs.js` gated it regardless. So the only thing that
could ever close that lab was a wider row he had written about something else,
and there was nothing at all that could reopen it.

## I had the mechanism wrong and the suite caught it

My first reading blamed `classes.quiz_lock_default`. That is wrong:
`DEFAULT_GATED` is `{quiz, exam}`, so the class default has never applied to a
lab. The first draft of the suite asserted the default shut a graded lab and went
red on its own fixture.

What actually closes it is an explicit wider row, almost certainly a unit lock at
unit 4, which is the ordinary way a term starts. That fact is asserted now rather
than assumed, because a wrong mechanism is a wrong answer to the teacher even when
the fix happens to be right.

## The fix

A lab with no manifest row is not gated. A lab with one is gated exactly as
before.

It asks the MANIFEST, not `spec.graded`, though the two agree today because
`seed-manifest` builds lab rows from `labSpecs.graded()`. The manifest is what
actually produces the chip, and the seeder already carries hand-listed lab rows in
constants beside the generated ones. Keying on the authored flag would go wrong
the moment those two disagree, and it would go wrong silently. Only one pair of
assertions can tell those two sources apart, so they exist: a graded lab with its
row deleted must go ungated, and an ungraded lab given a row must be gated.

## What the gate caught that review would not have

The new branch sits ABOVE everything else in `labGate`, so it changed the answer
for every suite that drives the lab route without seeding a manifest row. Three
went red, including both fixes I shipped earlier today.

That is not noise. Those fixtures were modelling a lab **no teacher could gate**
and asserting that gating worked on it. They pass now because they model a lab a
teacher could actually act on, which is what production has. A suite whose
fixture cannot occur in production is asserting about a system that does not
exist.

`smoke/lab-gate-rederive.js` gained rule 0 and an arrangement that removes the
manifest row, so the second implementation covers the new branch rather than only
the ladder underneath it. Forty combinations now, up from thirty-five.

## Still open, and it is the half I did not fix

**Lesson 1.2 links to a lab the server files at 4.3.** After this deploy his
students can open it, which is the urgent part. But the wiring is still wrong in
both directions:

- lesson 1.2's lab link goes to the tournament lab, while 1.2's own graded lab
  (`1.2-auth-lab`, "Read the login log") sits on a page nothing links to from
  there.
- lesson 4.3 links to `/pages/ap-cyber-unit-4-lesson-3-lab`, not to the terminal
  lab that was deliberately renamed onto `ap-cyber-unit-4-lesson-3-terminal-lab`
  on 2026-09-06.

So the 2026-09-06 rename moved the handle and the location, and the pages that
point at it were never repointed. That is board 252's territory, it is a
storefront change needing a sheet, and which lab belongs on lesson 1.2 is a
content judgement rather than a repair.

There is also a class of defect worth a guard: nothing today notices that a lab
reachable from lesson X declares itself to live at lesson Y. That would have
caught this on the day of the rename.
