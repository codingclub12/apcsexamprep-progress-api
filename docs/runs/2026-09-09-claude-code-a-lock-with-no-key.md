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

The page on his screenshot is `ap-cyber-unit-4-lesson-3-terminal-lab`, which
mounts `1.2-lab`, "Find the tournament code". It is UNGRADED and the server files
it at **unit-4 / 4.3**.

**How a 1.2 URL reaches it, corrected.** My first reading of this said lesson 1.2
LINKS to that lab. It does not, and neither does anything else: a scan of 52 live
cyber lesson and lab pages found zero references to the handle. The path is the
REDIRECT left by the 2026-09-06 rename:

```
/pages/ap-cyber-unit-1-lesson-2-terminal-lab
   301 ->  /pages/ap-cyber-unit-4-lesson-3-terminal-lab   200, the tournament lab
```

That redirect is doing exactly what board 252 asked of it, "so the old URL 301s
and nothing is broken". What it means in practice is that **every old 1.2 link
still works and now delivers Unit 4's lab**. A bookmark, a handout, an LMS link
or a teacher's own notes all land on a lab whose URL says unit 1 lesson 2, whose
content is a Unit 4 topic, and which the gradebook files at 4.3. The redirect is
invisible to the person following it.

So the answer to "is it still showing up on 1.2" is yes, through the redirect
rather than through a link, and that is the harder version to notice.

```
old 1.2 URL      ->  301  ->  terminal lab page  ->  1.2-lab
1.2-lab spec     ->  unit-4 / 4.3, graded=false, "Find the tournament code"
1.2 Lab chip     ->  1.2-auth-lab, unit-1 / 1.2, graded=true
```

**A checking gotcha worth keeping.** `lib/storefront-fetch.pageBody()` reads
`/pages/<handle>.json` and that endpoint does NOT follow the storefront's 301: it
answered 404 for the old handle while the human URL served 200. A session asking
"is this page gone" through `pageBody` alone would conclude the old link was dead
when it is very much alive. Check the storefront URL with `redirect: 'manual'`
when the question is about a redirect.

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

**The old 1.2 URL still delivers Unit 4's lab, and that is a decision rather
than a bug.** After this deploy his students can open it, which is the urgent
part. What is left is where that URL should point:

- keep the 301 as it is, and every old 1.2 link keeps handing out a 4.3 lab under
  a 1.2 address, or
- repoint the old 1.2 URL at 1.2's own terminal lab, `1.2-auth-lab`, "Read the
  login log", which is graded, filed at 1.2, and has a chip he can already open.

The second is better for anyone following an old link, and it is a live redirect
change on the storefront, so it is Tanner's rather than mine.

The lab is also an ORPHAN now: nothing links to it from any of the 52 cyber
lesson and lab pages, and lesson 4.3's own Lab step goes to
`/pages/ap-cyber-unit-4-lesson-3-lab`, a different, self-contained page called
"Lab: Field Device Triage Desk". So a lab that was deliberately moved into Unit 4
is reachable from nowhere in Unit 4, and only from a Unit 1 redirect. That is
board 252's territory.

There is also a class of defect worth a guard: nothing notices that a live
redirect points a lesson-N URL at content the server files under lesson M.

