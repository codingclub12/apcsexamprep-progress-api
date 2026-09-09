# A teacher previewing a lab was refused as a member of the public

**Board:** 305. Reported by Tanner relaying a teacher: "lab open but isn't open."

She is right, and the refusal was hers by name: she opened the lab for her class,
previewed it, and was told to sign in with a class code she does not have.

## Measured first

Every lab, anonymously, against production:

```
LOCKED  ap-cybersecurity  1.2-auth-lab   unit-1/1.2   anonymous-closed-for-lesson
LOCKED  ap-cybersecurity  1.2-lab        unit-4/4.3   anonymous-closed-for-activity
LOCKED  ap-cybersecurity  2.4-lab        unit-2/2.4   anonymous-closed-for-lesson
open    ap-networking     1.4-lab, 2.2-lab, 3.5-lab, 4.3-lab
```

All three cyber labs refuse anything the server cannot attribute to a student.

## The cause, and it is one line of role check

`labStudent()` requires `payload.role === 'student'`. A signed-in TEACHER
therefore resolves to `null` and falls into the cross-class branch, which refuses
whenever ANY class anywhere has closed that lab. Her own class opening it is
never consulted, because that branch is for callers with no class at all.

So the lock she was shown was some other teacher's, on a lab she had opened.

Two things make this worse than an ordinary miss:

- **The player's wording had already been corrected the same day off this same
  email.** It now says "This lab opens for signed-in students. Sign in with your
  class code and open it again." That made the refusal honest and left it wrong:
  she is signed in, and she did open it. A message fix on a behaviour bug reads
  as a fix and is not one.
- **The route immediately below hands a verified teacher the lab's ANSWER KEY.**
  Withholding the lab from someone we will hand the key to protects nothing.

## The fix

A valid teacher token is a real identity previewing their own material, so the
cross-class refusal does not apply to it. Same carve-out the quiz route makes for
a solo `ME-` account.

This does not reopen the hole the anonymous rule was built for on 2026-09-07.
That was a STUDENT signing out to walk past their teacher's lock, and a student
cannot mint a teacher token.

Entitlement is deliberately NOT required. It gates the key, and a lab nobody has
closed is already served to the public, so requiring it here would invent a
second way to be wrong for a teacher on a free plan.

## Two things the checks caught that I would have shipped

**The rederive disagreed with the route on its first run**, and the ROUTE was
right. A class that closes a whole unit and then reopens one lesson inside it has,
on balance, opened it. My second implementation asked "does any row anywhere say
closed" instead of resolving each class through the ladder first, so it refused a
lab nobody had closed. The naive version is pinned as a mutation now, so the
comparison stays sensitive to the ladder rather than only to the booleans.

**One mutation survived green**, which is the finding rather than a nuisance.
Dropping `role === 'teacher'` changed nothing observable, because `labStudent()`
handles every ordinary student above and no normal student ever reaches the
branch. The role check looked untestable.

The caller that does reach it is a valid, correctly signed STUDENT token whose
student row is gone, which a deactivated student really holds for 180 days. With
the check, they land on the anonymous answer. Without it, they open a lab their
own class closed. That assertion is what makes the mutation visible, and without
it the suite was asserting nothing about the rule it was written for.

## No live check, deliberately

The row that moved is what a teacher's token gets, and observing that against
production needs a teacher credential. A session never asks for one and never
puts one in a transcript, so there is no live observation available for the thing
that changed. An assertion about the anonymous row would have passed yesterday.

The rederive is the honest third kind: 35 caller and gate combinations, a second
decision table written from the rules and sharing no code with the route.

## Still open, and it is the same question already with Tanner

This fixes the TEACHER. It does not answer what a signed-out member of the public
should get from a lab some class has closed, which is the same question sitting on
PR #644 for quizzes.

For a lab the trade is different from a quiz and worth stating, because whoever
answers should not assume they are the same case. A quiz's prize is the key. A
lab's prize is the grade, and a grade needs a signed-in student, so signing out to
do a lab earns nothing. The step labels are student-facing by design and the
checks match on the commands those labels describe, so there is no separate key
to withhold the way `correct_index` can be withheld from a quiz.

That points at serving labs to anyone, but it is his call and it should be made
once for both surfaces rather than twice.
