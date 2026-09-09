# Mounting 22 quizzes turned an unmeasured guard into 22 dark pages

**Board:** 300. Branch `claude/assignment-lock-unlock-m8d334`, PR #644, open and
NOT merged: one design question is with Tanner and the answer decides the shape.

Tanner: *"I don't want assignments locked when they shouldn't be either."* This
is the false-positive half of locking, and it turned out to be live already.

## What was measured

An anonymous GET against every mounted cyber quiz:

```
open   : 0 of 22
locked : 22
```

All 22, including the two mounted since August. So the public copy of every
mounted cyber quiz was dark to a signed-out reader, and it had been since
2026-09-07.

## Why nobody saw it, which is the part worth keeping

The guard was added on 2026-09-07 for a real defect: a student could sign out, or
open the same page in incognito, and walk around a lock their teacher had set.
The fix refused an anonymous render whenever any class anywhere had closed that
activity.

Nothing measured what that refusal cost, and nothing could have, because at the
time **no signed-out reader ever reached the route**. Every quiz page still
carried its own questions in its own body. The route was reachable in principle
and unreached in practice, so the guard had a blast radius of zero and a test
suite that agreed with it.

Mounting 22 pages onto the server render path the next day is what made them
reach it. The migration did not break anything; it made an existing breakage
observable for the first time.

The general shape, because this will happen again: **a guard whose cost cannot
be observed is not a cheap guard, it is an unmeasured one.** The thing that
changed here was not the guard and not its correctness. It was the traffic. Any
change that routes new callers through old logic is a change to that logic's
behaviour, and it deserves the same measurement a code edit would get.

## The seam was in the wrong place

The questions were never the protected thing. They shipped in the public page
body until the day before, they are the same bytes as the public practice copy,
and that layer is indexed on purpose. The answer key is what a closed quiz must
not hand over.

|  | signed-out reader, activity closed by some class |
|---|---|
| before 2026-09-07 | questions and key |
| 2026-09-07 to now | nothing at all, page dark |
| PR #644 | questions and a score, no key |

`released` already gated exactly `correct_index` and `explanation`, so the change
is small: drop the render refusal, and set `released = false` on submit for an
anonymous caller when some class has that activity closed. Anonymous only. A solo
`ME-` account is a real identity, self-study by design, and keeps its key.

The cost, stated rather than buried: a student who signs out CAN read the
questions of a quiz their teacher closed. What they cannot get is which option
was right, any explanation, or a grade.

One residue not fixed and not pretended away: an anonymous caller still gets
per-question correct/incorrect booleans, so a determined reader could recover the
key by resubmitting. Rate limiting, 60 per 10 minutes, is the only thing in front
of that. Withholding the booleans too would make the CDN player show every
question as wrong, which is a visible lie to students, and that player is not in
this repo.

## What the SEO question actually resolved to, including where I had it wrong

I first justified serving the questions anonymously by citing CLAUDE.md's tier 1
doctrine, that public practice is the SEO engine and gating it would be a
strategic error. **That was the wrong authority and I said so to Tanner.** Lesson
quizzes are tier 2, auto-graded coursework, not tier 1. The doctrine is real and
it does not cover these pages.

What is true, measured rather than assumed:

- After mounting, the question text is **not** in the rendered HTML. The player
  fetches it. Checked against a real 5.6 stem. So these pages are indexable and
  carry no question-level SEO either way, and the lock decision cannot cost
  search traffic that was never there.
- `ap-cybersecurity-practice-exam`, which is tier 1, still holds its questions in
  its own body. The SEO engine is intact and untouched by any of this.
- Teacher keys are guarded by entitlement, `routes/quiz.js:379`, and not by this
  gate at all. A student, an invalid token, and a teacher with no live
  entitlement are all refused there. Nothing in PR #644 goes near it.

So the answer to "does locking these protect teacher assessments" is no, and it
was never the thing doing that work.

## Evidence

`deploy-gates/2026-09-09-quiz-anon-visibility.json`, `--pre` green on suite and
mutation. Four mutations, four distinct signatures:

```
the shipped bug (refuse the render)  -> "and is NOT locked, though a class has closed it"
hand over the key too                -> "it reports released: false"
withhold the key from everyone       -> "an open activity still releases the key"
break the class gate                 -> section 5 only
```

The third earns its keep. A suite testing only the closed case would pass while
public practice quietly stopped showing rationale.

The live check asserts `open=22/22 keyed=0`, which is false on all 22 today, so
it cannot pass before the deploy.

`smoke/gate-scope.js` carried two assertions pinning the behaviour being removed.
They are rewritten rather than deleted, and the comment records BOTH moves: a
reader seeing only the current assertion would conclude the incognito bypass was
never fixed.

## Still open

- **The design question, and it is Tanner's.** A signed-out visitor hits a lesson
  quiz a teacher has closed. Either they get the questions but never the answers,
  which is what #644 implements and what I lean to so a prospective teacher can
  see what the quizzes look like, or they get a sign-in prompt. Both of his asks
  are in tension here. #644 does not merge until he says.
- Five quiz stems held back for rewording, `docs/cyber-quiz-held-back-rewords.md`.
- What `ap-cyber-unit-3-lesson-6-quiz` should be. Topic 3.5, ten questions.
