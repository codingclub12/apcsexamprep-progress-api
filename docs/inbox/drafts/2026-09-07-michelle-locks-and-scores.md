# Draft reply to Michelle, 2026-09-07

Not sent. Tanner sends. Every claim below was checked against production or the
live page on 2026-09-07 and the check is named after each one, so a future
session can re-derive it instead of trusting this file.

---

Hi Michelle,

Good news and bad news on the lock, and you found a real bug in the gradebook.
Taking them in order.

**Two of your locks are real, and the rest are not yet. That is fewer than I
would like to be telling you.**

The 1.1 and 1.2 quizzes are the real ones. Those pages ask our server for the
questions, so when you lock one the questions never leave the building. A
student who opens the link sees "This quiz is not open yet. Your teacher opens
it when the class is ready to take it." That holds if they sign out or open the
link in a private window, which is the first thing a determined sophomore tries.

**1.3, 1.4 and 1.5 are not locked, even though the gradebook lets you lock
them.** Those pages still carry their own questions and their own answer key, so
a student who opens the link has the quiz and the answers regardless of the
padlock. I checked 1.3 specifically because your screenshot shows it locked: the
key is five letters sitting in the page source. The server half is built and
waiting; the pages have not been switched over yet.

**The Unit Tests are in the same state, and so are the Units 2 to 5 quizzes.**
The Unit 1 Exam page carries all twenty questions and all twenty answers in its
source.

So until I tell you otherwise, please treat the LINK as the lock for everything
except 1.1 and 1.2: hand it out when you want the class to sit it. The padlock
in the gradebook is a note to yourself, not a door.

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

- **CORRECTED 2026-09-09, and the first draft of this letter was wrong.** It
  said all five Unit 1 quizzes were enforced, on the strength of the API alone:
  `GET /api/quiz/ap-cybersecurity/unit-1/1.{1..5}/quiz` does return
  `locked:true, questions:null` for all five. That is only half the question. A
  lock is real only if the PAGE asks the server for its questions, and only 1.1
  and 1.2 do. 1.3, 1.4 and 1.5 still carry `ANSWERS={1:'C',2:'C',3:'B',4:'B',
  5:'A'}` and its siblings in the page body, so the API's refusal is never
  reached.
  Audited all 26 cyber quiz pages on 2026-09-09 for both halves, page mount and
  server bank: **2 are real (1.1, 1.2), 24 are not.** Board #276 is the
  migration; it has banks in production ahead of the page mounts, which is
  exactly the gap that made the first draft's claim plausible and wrong.
- Student wording: the deployed `apcs-quiz-mount.js`, `renderLocked()`.
- Unit Tests not enforced: same endpoint for `unit-{1..5}/exam/exam` returns
  "No server-scored quiz for this location"; the live body of
  `ap-cyber-unit-1-exam` carries 20 questions and `var ANSWERS = {...}`.
- Units 2 to 5: several now have server banks that did not exist on 2026-09-07,
  so the honest statement is about the PAGES rather than the API. None of them
  mounts, so none is locked. Re-measured 2026-09-09.
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
