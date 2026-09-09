# 1.2 said twelve, and the key checker was reading a list of names

2026-09-09, Claude Code. Branch `claude/new-session-41sg9k`, PR #646.

Tanner asked for one thing: fix the 1.2 quiz page. It is fixed, as a sheet he
still has to import. Two other things came out of the same afternoon, and the
second one is the one worth reading.

## What he asked for

`/pages/ap-cyber-unit-1-lesson-2-quiz` contradicted itself one line apart. Its
blurb said "5 questions, about 10 minutes"; its badge row directly beneath said
`[12 Questions] [~25 min]`. The live quiz API serves a pool of 5.

The badges are left over from the 12 item bank transcribed from the teacher
bundle on 2026-08-26 and retired the next day. The page moved onto the server
render path later and nobody went back to the badges. Michelle has this quiz
locked and is choosing when to open it, so the number she would have planned a
period around was the wrong one.

Two substitutions, one row, MERGE:
`imports/2026-09-09-cyber-12-quiz-badge/Pages cyber-12-quiz-badge.csv`.
The replacement count is read from the API's own pool, by the generator and again
by the rederive, not typed in from the blurb. A second opinion about how many
questions the bank holds is what put 12 there in the first place.

**Not imported.** That is his.

## Evidence

`scripts/cyber-12-quiz-badge-rederive.py`, in Python, using a different CSV
reader than the generator's writer. Its load-bearing claim is a reconstruction
rather than a marker list: rebuild the sheet from the live body with exactly two
substitutions and require byte equality. A marker list has to be told what to
look for; a reconstruction fails on a change nobody anticipated.

    2 edits: '12' -> '5' @31471, '25' -> '10' @31566
    the quiz API reports pool=5
    REDERIVE OK

Eight mutations in `deploy-gates/2026-09-09-cyber-12-quiz-badge.json`, each red
on the assertion it targets rather than on a stronger guard in front of it. Two
live checks, both false right now, both only passable after the import.

## Three things I got wrong, in order of how much they cost

**The parse-back reported 277 deletions and the sheet was fine.** I split the
file with `splitlines()` before handing it to the CSV reader. That strips the
newlines embedded in the Body HTML cell, so the reader rejoins the fragments
without them and every one reads as a deletion. The checker was broken, not the
artifact. Worth remembering because the failure was loud, plausible and pointed
at the wrong file.

**The mount rule was hollow and the mutation battery caught it.** It asserted
`'data-apcs-quiz' in body`. That is a substring of `data-apcs-quizX`, so a mount
renamed out from under the page passed clean. The mount is what makes a teacher's
lock real rather than decorative, so a sheet that quietly dropped one would turn
a locked quiz back into an open one. It asserts the shape now, and M5 and M6 hold
it there. This is the third hollow guard found here by mutation testing, and the
first one that was in a check I had written twenty minutes earlier.

**I wrote "26 cyber quiz pages" in a commit message and a PR body.** The roster
is 25. The 26th was 4.5, which lost its gradebook column on 2026-09-03 and is not
a CED topic. Corrected in `3651218`, which also moved the sweep out of the
scratchpad into `scripts/cyber-quiz-badge-sweep.js`, because the evidence behind
a claim in a committed gate should not live somewhere that gets reclaimed.

Re-measuring made the claim sharper, not weaker: 7 of the 25 carry a question
count badge at all, and 1.2 was the only one whose badge disagreed with its bank.
The sweep's first pass also flagged 5.5 and 5.6 for saying ~12 and ~15 minutes
where everyone else says ~10. Those are not defects. Their counts are right,
neither page carries a blurb to contradict, and how long a quiz takes is an
estimate somebody made rather than a fact anything can re-derive. A check that
cannot say what the right answer would be has no business calling something
wrong, so the committed sweep prints durations and never fails on them.

## The one that was not asked for

While re-measuring the lock state for Michelle's reply, `var CORR` turned up in
`ap-cyber-unit-3-exam`:

    var CORR=[1,1,1,2,2,1,1,1,1,1,2,1,1,1,0,1,1,1,1,1];

Twenty answers in the page source. `scripts/verify-cyber-quiz-mounts.js` had been
reporting that page as `key: none`, because its key check was a list of seven
NAMES (ANSWERS, checkMCQ, data-correct and four others) and CORR was not one of
them.

Adding CORR is the small half and on its own it is worth nothing: the next page
generation picks a different name and the check goes quiet again. So it matches
the SHAPE now, a name bound to a run of four or more small integers or single
letters, which is what an answer key IS whatever it is called. It reports a
candidate rather than a key, deliberately, since `var SIZES=[1,2,3,4]` would
match and is innocent. Across all 25 quiz pages and all 5 exams, exactly one
literal matched and it was the real thing.

Proven per rule, because the name catches the same page and masks the shape:

    CORR deleted from the name list    still reported, "CORR (array literal)"
    shape detector deleted as well     "no key found", the original bug back

The script sweeps the five unit tests now too, reporting and not failing, since
none is migrated and a key there is the known state. It reads:

    5 of 5 unit tests publish their answer key. Locking one in the gradebook
    does nothing.

That was four of five in the draft reply, on the strength of the broken check.

## The reply to Michelle, corrected twice, still unsent

Both corrections were the same mistake from opposite ends: inheriting a live
state claim instead of re-measuring it.

Draft 1 said all five of her Unit 1 quiz locks were real, from the quiz API
alone. That is half the question, because a lock is real only where the PAGE asks
the server rather than shipping its own key, and on 2026-09-07 only 1.1 and 1.2
did. Draft 2 said so. Within two days board #276 landed the page mounts, so
draft 2 was stale the other way and would have told a working teacher her working
locks were theatre.

Measured today: 22 of 25 mounted and served, three still shipping a key (2.3,
3.5, 4.1), and her Unit 1 is five for five.

A letter about live state has to be re-measured the day it is sent. It cannot
inherit from the previous version of itself, and neither of the two wrong drafts
was careless.

## Still open

- The 1.2 sheet is not imported. Both live checks in the gate fail until it is,
  which is the point of them.
- The 1.2 paragraph in the draft reply is false until that import happens. The
  draft says so at the top, in bold, where whoever sends it will hit it first.
- 2.3, 3.5 and 4.1 have no server bank, so they cannot be mounted yet.
- None of the five unit tests is migrated. That is the largest remaining gap
  between what the gradebook's padlock implies and what it does.

## Two more, found after this note was first written

**The gate had a live check that could never pass.** PR #649. The sweep check
pinned `expect` to `1 advertising a count the bank does not hold`, which is the
reading BEFORE the import, and I wrote a note beside it calling the hand edit
that would be needed afterwards deliberate.

    pre-import   the sweep exits 1, so runCheck fails on the exit code and
                 never reads expect at all
    post-import  it exits 0 but prints "0 advertising", so expect stops
                 matching and it fails there instead

Red in both states. That is worse than a missing check, because the gate output
still reads like something is being verified. And the note is the part worth
sitting with: calling the hand edit deliberate is what turned a defect into what
looked like a design decision, which is how it would have survived review.

It pins the post-import reading now, and both states were demonstrated rather
than argued: the real sweep run against the body the sheet produces, parsed back
out of the committed CSV, with only that one page intercepted and the other 24
still fetched live. `0 advertising`, exit 0. Against live, still 1, still red.

**And the check-in reminder about it fired carrying the wrong instruction.** The
scheduled follow-up still said to hand edit that expect line, because the
correction landed on a one-shot trigger that had already spent itself. Following
it would have re-broken the check that had just been fixed.

## What I would tell the next session

Four things went wrong today and all four were the same thing: something written
when it was true, read later when it was not.

    the draft to Michelle, twice   inherited a lock claim instead of re-measuring
    the gate's expect line         pinned the state at authoring time
    the reminder about that line   carried the pre-fix text an hour later

The other two were checks being confidently wrong.
`verify-cyber-quiz-mounts.js` reads as complete, its comment block explains why
three assertions are needed and why the third is the one that matters, and it was
blind to a live answer key the whole time. The mount rule I wrote reads as
obviously correct and passed a renamed mount.

So: run the check against the case, and re-measure anything you are about to
repeat. Every one of these was found by breaking something on purpose or by
fetching the thing again, and not one was found by reading a description,
including the descriptions I had written myself that morning.
