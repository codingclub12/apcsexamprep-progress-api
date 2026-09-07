# Draft reply to Michelle, 2026-09-07

Not sent. Tanner sends. Every claim below was checked against production or the
live page on 2026-09-07 and the check is named after each one, so a future
session can re-derive it instead of trusting this file.

---

Hi Michelle,

Good news and bad news on the lock, and you found a real bug in the gradebook.
Taking them in order.

**The lesson quizzes are really locked.** All five Unit 1 quizzes are served by
our server, not by the page, so when you lock one the questions never leave the
building. A student who opens the link sees "This quiz is not open yet. Your
teacher opens it when the class is ready to take it." That holds if they sign
out or open the link in a private window, which is the first thing a determined
sophomore tries. Your workflow is exactly right: leave it locked, unlock it when
the class sits down, and the link works from that moment.

**The Unit Tests are not, and that is what the "can't be enforced" note is
telling you.** Those pages carry their own questions, so a student with the link
has the whole test whatever the gradebook says, and the answers are in the page
source for anyone who thinks to look. Locking one changes what your gradebook
shows you and nothing on the student's screen. Until we move the unit tests onto
the server the way the lesson quizzes already are, please treat the Unit Test
link itself as the lock: hand it out on test day. Same for the Unit 2 to 5
quizzes.

I would rather tell you that plainly than let you find out from a student's
score.

**Now the numbers.** Both of the ones you spotted were wrong, in two different
ways, and neither was your students' fault.

1.1 Exercise 1 was being counted twice. The page reports the score, and so does
the script that watches the page, and the gradebook was adding the two together.
That is why it read 14 out of 14 for a 7 point exercise, and why it looked
suspiciously tidy across the whole class. The percentages your students saw were
right the whole time, since both halves doubled, but the exercise was pulling
double weight in the Points column and the letter grade. Fixed, and the fix
reaches back through everything already recorded, so nobody needs to redo
anything. Expect the Points total and the letter grade to move slightly for
students who did that exercise, and to be right afterwards.

1.1 Exercise 2 is the opposite: the scores were right and the header was stale.
That exercise was rebuilt to 15 questions a while back and the "out of 8" in the
column header never caught up. The header now says 15. If a student sat the
older 8 question version, their score stays as they earned it, out of 8. We do
not rescale work that is already done.

We have also added a check that watches for exactly this, a column priced at one
number while students are being handed another, so the next one gets caught here
rather than by you reading your own gradebook carefully.

Thank you for the detail in that email. The screenshot with both numbers in it
is what made this a twenty minute diagnosis instead of a fishing trip.

Tanner

---

## What each claim rests on

- Five Unit 1 quizzes enforced, unauthenticated request to production
  2026-09-07: `GET /api/quiz/ap-cybersecurity/unit-1/1.{1..5}/quiz` returns
  `locked:true, questions:null, pool:5`, reasons `anonymous-closed-for-activity`
  (1.1, 1.2) and `anonymous-closed-for-lesson` (1.3 to 1.5).
- Student wording: the deployed `apcs-quiz-mount.js`, `renderLocked()`.
- Unit Tests not enforced: same endpoint for `unit-{1..5}/exam/exam` returns
  "No server-scored quiz for this location"; the live body of
  `ap-cyber-unit-1-exam` carries 20 questions and `var ANSWERS = {...}`.
- Units 2 to 5 quizzes: same endpoint, same answer, checked 2.1, 2.2, 3.1a, 4.1,
  5.1.
- The double count and its repair: `npm run smoke:carrier`, reproduced on a
  scratch database through the real routes. Run note
  `docs/runs/2026-09-07-claude-code-gradebook-two-writers.md`.
- Exercise 2 is out of 15: the live page body, `var Q` with 15 entries and a
  score bar reading "0 / 15".

## What this reply deliberately does NOT say

- No date for moving the unit tests onto the server. It is not scheduled.
- Nothing about her other columns. Only 1.1 was measured, and the run note says
  so.
- Nothing about the page still writing twice. It is harmless now and it is our
  problem, not hers.
