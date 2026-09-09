# Draft reply to Michelle, 2026-09-07

Not sent. Tanner sends.

**Corrected twice, most recently 2026-09-09.** Every claim below was re-measured
against production and the live pages that day, and the check is named after each
one so a future session can re-derive it rather than trust this file. The second
correction reversed the lock section: when this was first written only two of her
quizzes were really locked, and now all five of her Unit 1 quizzes are.

**One sentence in this letter is not true yet.** The paragraph about 1.2 saying
"12 questions" depends on a Matrixify sheet that is generated, validated and
committed but NOT imported. If you are sending this before importing
`imports/2026-09-09-cyber-12-quiz-badge/`, delete that paragraph.

---

Hi Michelle,

Your locks are real, the Unit Tests are not, and you found a genuine bug in the
gradebook. Taking those in order.

**The lock works, and your Unit 1 quizzes are all covered.**

All five Unit 1 quizzes ask our server for their questions, so when you lock one
the questions never leave the building. A student who opens the link sees:

> **This quiz is not open yet.** Your teacher opens it when the class is ready to
> take it. Nothing is missing from the page and there is nothing to fix on your
> end: check back when your teacher says so.

That last sentence is there on purpose. Without it, a locked page looks broken,
and you get the email instead of the student getting the message. It holds if
they sign out or open the link in a private window, which is the first thing a
determined sophomore tries.

So yes: unlock it when you are ready and hand out the link then. That is exactly
the right workflow, and the padlock is doing the work you think it is doing.

**Three quizzes further along are not locked yet.** Unit 2 Lesson 3, Unit 3
Lesson 5, and Unit 4 Lesson 1 still carry their own questions and their own
answer key in the page itself, so the padlock does not stop anything on those
three. Every other quiz in the course, 22 of 25, is on the server. Those three
are queued.

**The Unit Tests are not locked, and this is the one I would flag hardest.** None
of the five is on the server, so a student who has the link has the test and the
answer key with it. All five. The padlock in the gradebook does nothing there.
Please treat the LINK as the lock for the Unit Tests: hand it out when you want
the class to sit it, and not before.

I would rather tell you that plainly than have you find out from a score.

**Now the numbers.** Both of the ones you spotted were wrong, in two different
ways, and neither was your students' fault.

1.1 Exercise 1 was being counted twice. The page reports the score, and so does
the script that watches the page, and the gradebook was adding the two together.
That is why it read 14 out of 14 for a 7 point exercise, and why it looked
suspiciously tidy across the whole class. The percentages your students saw were
right the whole time, since both halves doubled, but the exercise was pulling
double weight in the Points column and in the letter grade. Fixed, and the fix
reaches back through everything already recorded, so nobody redoes anything.
Expect the Points total and the letter grade to move slightly for students who
did that exercise, and to be right afterwards.

1.1 Exercise 2 is the opposite: the scores were right and the header was stale.
That exercise was rebuilt to 15 questions a while back and the "out of 8" in the
column header never caught up. The header says 15 now. If a student sat the older
8 question version, their score stays as they earned it, out of 8. We do not
rescale work that is already done.

While I was in there I found the 1.2 quiz page telling students it was 12
questions and about 25 minutes. It is 5 questions and about 10, which is what its
own description said one line further up the page. Worth knowing if you were
planning a period around the longer number.

We have also added a check that watches for exactly this, a column priced at one
number while students are handed another, so the next one gets caught here rather
than by you reading your own gradebook carefully.

Thank you for the detail in that email. The screenshot with both numbers in it is
what made this a twenty minute diagnosis instead of a fishing trip.

Tanner

---

## What each claim rests on

All measured 2026-09-09 unless stated.

- **Her Unit 1 quizzes are locked for real: all five.**
  `node scripts/verify-cyber-quiz-mounts.js` reads both halves per page, the page
  mount and the server bank, and reports `22 of 25 mounted, 3 still ship a key, 0
  mount the wrong lesson, 0 mounted but not served`. Unit 1 is five for five,
  each `server pool 5`.
- **Why both halves have to be checked, and how this letter got it wrong once.**
  The FIRST draft said all five were enforced, on the API alone: `GET
  /api/quiz/ap-cybersecurity/unit-1/1.{1..5}/quiz` did return `locked:true,
  questions:null` for all five. That is only half the question, because a lock is
  real only if the PAGE asks the server rather than shipping its own key. On
  2026-09-07 only 1.1 and 1.2 did. The SECOND draft said so, and by then board
  #276 had landed the rest, so the second draft was stale in the other direction
  within two days. A claim about live state has to be re-measured before it is
  sent, not inherited from the last version of the letter.
- **The three that are not locked:** `ap-cyber-unit-2-lesson-3-quiz` (2.3),
  `ap-cyber-unit-3-lesson-6-quiz` (3.5), `ap-cyber-unit-4-lesson-1-quiz` (4.1).
  Same run: `0 mount(s); key survives`. All three are waiting on server banks.
- **Student wording:** quoted verbatim from `renderLocked()` in the DEPLOYED
  `apcs-quiz-mount.js` at the Shopify CDN, not from the repo mirror.
- **Unit Tests: five of five publish their key.** All five of
  `ap-cyber-unit-{1..5}-exam` carry no mount, and
  `/api/quiz/ap-cybersecurity/unit-{1..5}/exam/exam` answers `404 No server-scored
  quiz for this location`.
  An earlier version of this note said FOUR of five, because the checker said so.
  Unit 3 was the fifth and the checker could not see it: it ships
  `var CORR=[1,1,1,2,2,...]`, twenty answers under a name nobody had added to a
  list of names. Found by hunting the SHAPE of a key rather than its name, and
  `scripts/verify-cyber-quiz-mounts.js` now does that as well, so the next
  generation's name is caught without anyone remembering to add it. Verified by
  deleting `CORR` from the name list and confirming the shape detector still
  reports the page, then deleting both and watching it go quiet again.
  All 25 quiz pages were re-swept the same way and none carries a key-shaped
  literal, so the 22 of 25 above is not resting on the list that failed.
- **The double count and its repair:** `npm run smoke:carrier`, reproduced on a
  scratch database through the real routes. Run note
  `docs/runs/2026-09-07-claude-code-gradebook-two-writers.md`.
- **Exercise 2 is out of 15:** the live page body, `var Q` with 15 entries and a
  score bar reading "0 / 15".
- **The 1.2 badge:** the live body says `>12 Questions<` and `>~25 min<` while the
  blurb above says "5 questions, about 10 minutes" and the API reports `pool: 5`.
  Sheet, generator, rederive and gate in PR #646. **Not imported.** The paragraph
  in the letter is false until it is.

## What this reply deliberately does NOT say

- No date for moving the Unit Tests onto the server. It is not scheduled, and a
  date invented here is a date she will hold us to.
- Nothing about her other columns. Only 1.1 was measured against her class, and
  the run note says so.
- Nothing about the 1.1 page still writing its score twice. It is harmless now
  and it is our problem, not hers.
- No breakdown of which unit tests publish their key in which form. She needs
  "all five, treat the link as the lock", not an inventory of our page source.
