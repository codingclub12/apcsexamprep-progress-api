# 2026-09-01 - AP Cyber Unit 1: the gradebook was recording zeros nobody earned

## What was reported

Peter Vo (Klein Cain, 5 classes, 83 students) wrote in three times across four
days. The complaint drifted each time, which is what made it hard to place:

1. Aug 28 - students finished Ex1 and Ex2 but the quiz is greyed out.
2. Aug 31 - told the quiz gating was fixed. Ninety minutes later: it is not,
   and a student scored 15/15 on Ex2 with no grade on the dashboard.
3. Aug 31 - contact form: can only see Lesson and Ex1. Ex2, lab and quiz all
   missing.

Three reports, one cause, and the first two "fixes" treated symptoms.

## What was actually wrong

`assets/apcs-score-reporter.js` in the theme repo treated "a score element is
visible" as "the student finished". On these pages that is false. A lab paints
its progress bar on the first frame and leaves it there:

    Lab Progress: 0 / 4 Emails Analyzed        0 / 24 pts

`totalScore` is in `SCORE_IDS`, it is visible from load, and its parent text
parses as a clean `0 / 24`. `start()` calls `check()` immediately, so opening
the page posted a real zero before the student did anything.

Three distinct failures, all downstream of that one confusion:

- **Lab shows 0/24 for students who never submitted.** The false zero on load.
- **Ex2 records "done" with no score.** `APCS_PAGE` IS set on 1.1 exercise 2, so
  the visit and completion record normally, but the page names its score element
  `x2scn` ("<span class=sc-n id=x2scn>0 / 15</span>"), which matched no id in
  `SCORE_IDS`. The reporter could never read a score there at all.
- **Quiz greyed out.** SEPARATE CAUSE. See the correction below: this one is
  not downstream of the scoring bug at all.

## CORRECTION: the quiz lock is not caused by the Ex2 bug

The first version of this note said the quiz unlock "waits on a scored Ex2", so
the missing score kept the gate shut. That was inherited from the first read of
the gradebook and never checked against the code. It is wrong, and it matters,
because it points at the wrong fix for the symptom the teacher reported FIRST.

There is no prerequisite gating anywhere in either repo. Searched both for
prereq/unlock/requires-exercise logic: nothing gates a quiz on another
activity's completion or score. What actually decides it is `lib/activity-gate.js`,
and it reads exactly two things:

1. an explicit `activity_gates` row for that activity, open or closed, or
2. failing that, the class flag `quiz_lock_default`. False means open; true
   closes the `DEFAULT_GATED` types, which are `quiz` and `exam`.

Resolved at read time, never stored. Neither input consults an exercise, a
score, or a completion. The other "locked" states in the theme are a different
thing again: `apcs-quiz-wiring.js` locks a quiz AFTER submission ("Final grade
submitted, contact your teacher to unlock"), and `apcs-hub-progress.js` only
colours hub rows, gating nothing.

So the greyed-out quiz is a class gate: either an `activity_gates` row closing
it or `quiz_lock_default = 1` on the class. To fix Peter's, check those two for
CYBER-BFXP rather than waiting on the scoring fix to open it.

Two real bugs and one setting, not three symptoms of one bug. The scoring
findings below stand on their own evidence and are unaffected.

## Evidence

Ran the shipped reporter in Chromium against the captured live page bodies with
zero interaction. 10 of 15 Unit 1 activity pages posted a zero on load:

| lesson | exercise-1 | exercise-2 | lab          |
|--------|-----------|------------|--------------|
| 1.1    | 0/7       | never scores | 0/24       |
| 1.2    | 0/24      | 0/30       | 0/30         |
| 1.3    | 0/24      | 0/24       | never scores |
| 1.4    | 0/24      | 0/24       | never scores |
| 1.5    | never scores | 0/24    | never scores |

The denominators match the reported gradebook exactly: 1.1 lab `/24`, 1.2 Ex2
`/30`, 1.3 Ex2 `/24`. Reproduced mechanism and observed production data agree.

After the fix, all 15 pages post nothing on load, and
`npm run verify:score-zero` passes 10 checks covering all four scoring shapes.

## Correcting the first read of the gradebook

The initial analysis concluded "1.2 and 1.3 record correctly, so the bug is the
1.1 page". That is backwards in an important way. 1.2 and 1.3 are writing false
zeros too; they merely LOOK healthier because more students finished them and a
real score supersedes the phantom one under best-attempt. The bug was never in
the 1.1 page. It is in the shared reporter, which is why it is not one teacher
and not one class.

Related, and still open: task #83 and #84 on the board describe the OTHER half
of this, the regex-scrape fallback and the 7 missing denominators
(1.2 ex1/ex2, 1.3 ex1/ex2/quiz, case-file, exam). Both are marked done and
UNVERIFIED. A scraped denominator and a false zero are the same family of bug:
the reporter trusting whatever the page happened to paint.

## Is the earned work recoverable

Two different answers, and conflating them would give a teacher a promise that
does not hold.

### The false zeros: yes, nothing was lost

Reasoning, to be confirmed against the database rather than taken on trust:

- `exercise-1`, `exercise-2` and `lab` are PRACTICE in `retry-policy.js`. Under
  both `all` and the default `practice` mode the best attempt is the grade of
  record, so a real score already beats the phantom zero. Students who finished
  are already showing correct scores.
- The false zeros are therefore EXTRA ROWS, not overwrites. Nothing a student
  earned was destroyed. A visible `0/24` means "opened, never finished", and
  deleting those phantom rows restores the correct state, which is blank.
- The exception to check before promising anything: a class on
  `retry_mode: 'none'` takes the FIRST attempt on everything. There a load-time
  zero is sticky and would outrank real work done later. Confirm no affected
  class is on `none` before telling a teacher their data is safe.

### The 1.1 Ex2 scores: no, and no purge will bring them back

This is the opposite case and it matters for what a teacher is told. On 1.1
exercise 2 the reporter could not READ the score, so nothing was ever sent. The
completion row exists; the number never left the browser. There is no phantom
row to delete and no stored value to recover, because none was ever written.

So the student Peter named, the one who scored 15/15, has a recorded completion
and no score, and no amount of cleanup will produce the 15. The options are to
accept the completion as evidence the work was done, or to have those students
resubmit Ex2 once the fix is deployed, which is a few minutes of class time
rather than redoing the unit.

Everything else in Unit 1 that shows a score reported it through a readable
element and is intact.

## Still open

- Purge the phantom rows. Production data change, needs an explicit go-ahead.
  Target: score_events rows for ap-cybersecurity activity pages with points 0
  where the same student has no later non-zero row for that item.
- Deploy. The theme PR is based on the CONNECTED branch, so merging it IS the
  deploy. Do NOT reach for the fast-forward recipe in CLAUDE.md: the drift has
  REVERSED since that was written. CLAUDE.md warns that `main` runs ahead of the
  connected branch. Measured today it is the other way round.

      commits on connected NOT on main : 44
      commits on main NOT on connected : 0

  `main` is fully contained in the connected branch, which makes
  `git push origin origin/main:refs/heads/claude/site-linking-audit-yhufjk` a
  NO-OP. It exits clean, changes nothing, and reads as a successful deploy.
  That is the same failure mode that kept a live RapidAPI key on the CDN for
  ten days. Verify against the live URL, never against GitHub, and note that
  `main` is 44 commits behind what the storefront actually serves, so it is not
  a reference for what is live either.
- Tell the rest of the AP Cyber cohort. Unit 1 lesson 1.1 is the free entry
  lesson, so this is exactly where a trialling teacher decides whether the
  platform works.

## Not a bug, so it does not need chasing

Peter's account shows `attempt saves 0` and `CFU scoring 0 events` across all
83 students. Those are not two more dead pipelines. `routes/progress.js` is
attempt-level progress for ap-csa and ap-csp only; AP Cyber records through
`score_events`, and CFU is a CSA/CSP item type. Zero is the correct number.

## Artifact

https://github.com/codingclub12/APCSExamPrep-theme/pull/92
