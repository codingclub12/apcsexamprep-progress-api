# Draft reply to Michelle, 2026-09-09

Not sent. Tanner sends. Every claim below was checked against production or the
repo on 2026-09-09 and the check is named at the bottom, so a future session can
re-derive it instead of trusting this file.

One thing to settle before sending: the first paragraph says her class did not
lock the 1.2 lab. This session could not read `activity_gates` (that needs the
admin key), so it is written to be true either way: it says the message she was
shown was wrong to name her, which is established, and asks her to look at the
Lab columns now that they tell the truth. Do not upgrade it to "nothing on your
class was locked" without looking.

---

Hi Michelle,

You are right on both counts, and the first one was our message blaming you for
something you did not do.

**The lab message.** Two different situations were producing the same sentence.
If a student is signed in and their class has the lab closed, "Your teacher has
not opened this lab yet" is true and useful. If a student is signed out, the lab
is withheld for a different reason entirely, and they were being shown the same
sentence about a teacher who had done nothing. That is almost certainly what your
students hit: open a lab page without signing in, and the site told them you had
closed it. Signed out, they now read "This lab opens for signed-in students. Sign
in with your class code and open it again," which is both true and something they
can act on.

**Your gradebook had two Lab columns for the same lesson, and only one of them
was telling the truth.** That is the part I am least happy about. For historical
reasons a terminal lab is tracked under a slightly different name than the Lab
column beside it, and while the student's side checked both names, your gradebook
checked one. So a lab could be shut for your students while the column you were
looking at showed it open, which is exactly the report you sent. Both columns now
resolve the same way, they are labelled differently so you can tell them apart
(Lab and Terminal Lab), and if one is closed both say so.

**How you open and close them.** On your Command Center gradebook, every column
header has a switch: green is assigned, grey is locked. There is one on the unit
too, which settles everything under it in a click, and a switch on a single
assignment beats the unit, so the usual shape is to lock a unit and then open a
lesson at a time. Nothing is locked unless someone set it, so a lab you have not
touched is open to your class already.

Worth doing once, now that the columns are honest: look at your Lab and Terminal
Lab columns for 1.2 and 2.4. If either shows grey and you did not mean it, click
it green and your students have it immediately. If both are green and a student
still cannot get in, tell me and I will look at that student.

**Labs on the student dashboards.** They were being dropped, plainly. Their page
was only drawing Lesson, Ex 1, Ex 2 and Quiz, so a student who finished a lab saw
their score counted in the unit total and nowhere else, which is worse than not
counting it. Labs get their own column now, on the units that have one. That fix
goes out with the next page update rather than automatically, so give it a day
and tell me if a student still cannot see theirs.

Sorry about the wording your students got. That one is on us and it has bothered
me since you wrote.

Tanner

---

## What each claim rests on

- The two situations and the old wording: `public/lab-player.js` had one string
  for both branches. `routes/labs.js` now sends `locked_for`, and the player
  prints a different sentence for the anonymous refusal. `smoke:labplayertoken`
  asserts both, 19 of 19.
- The signed-out refusal is real today, unauthenticated against production
  2026-09-09 00:07 UTC: `/api/labs/ap-cybersecurity/1.2-auth-lab` and `1.2-lab`
  answer `locked:true, reason:"anonymous-closed-for-activity"`, `2.4-lab`
  answers `anonymous-closed-for-lesson`. All four AP Networking labs answer
  open, which is what proves the rule is not just refusing everything.
- Two Lab columns on one lesson: `utils.js` lists `lab` in every cyber unit's
  activities, and the terminal lab's manifest row says `terminal-lab`. Both map
  to the canonical activity `lab`, and both rendered as "1.2 Lab" until today.
- The board and the student disagreeing: `routes/labs.js` resolved both names,
  `lib/gradebook-contract.js` resolved one. Reproduced as a mutation, so it goes
  red on purpose if it comes back. `smoke:labgate` sections 8 and 9, 40 of 40.
- The switch wording, "green is assigned, grey is locked", and the unit-then-
  lesson shape: `public/teacher-assignments.html`, which is the same builder her
  Command Center gradebook draws from.
- Labs missing from the student page: `shopify/my-progress.html` listed four
  activity types in `ACTS` and neither lab name was among them. `smoke:myprogress`
  section 6 now renders the table and checks the cell is in the row, 31 of 31.

## What this reply deliberately does NOT say

- No claim about whose class holds the closing rows. This session cannot read
  `activity_gates` and the anonymous refusal proves only that SOME class has each
  of those three labs closed.
- No date for the page import. It needs a human to run it.
- Nothing about the public side of the same rule (one class closing a lab takes
  it off the public site for every signed-out visitor). That is a decision on the
  board, not something to raise with a customer.
- Nothing about her other columns. Only the labs were measured today.
