# The 1.1 lab would not unlock even when it was unlocked

2026-09-14, Claude Code, board #321.

## What was reported

"The 1.1 lab will not unlock even when it's unlocked."

## What it actually was

The 1.1 lab is not a terminal lab. It is the phishing analysis activity, served by
`routes/analysis.js` out of `config/analysis/ap-cybersecurity-1.1-lab.json`, which
is why it does not appear in `/api/labs` and why a session looking for a spec in
`config/labs/` finds nothing named 1.1.

`gateFor()` there resolved a signed-in TEACHER as an anonymous request. `student()`
answers for students only, by design, and the route read its null as "nobody is
signed in" and fell into the cross-class branch. That branch refuses whenever ANY
class anywhere has closed the activity. So a teacher opened the 1.1 Lab for her own
class, opened the page to check it, and was told her teacher had not opened it yet,
over a lock set by somebody at another school. Her own class's open row was never
consulted, which is why nothing she clicked ever changed the answer.

`routes/labs.js` settled this on 2026-09-09, off the support email that read "lab
open but isn't open". This route was written on 2026-09-07 and never got the port.
Two siblings running the same gate disagreed about who counts as anonymous for five
days.

## Evidence

Live, before the change, with no credential at all:

    $ curl -s https://progress.apcsexamprep.com/api/analysis/ap-cybersecurity/1.1-lab
    {"course":"ap-cybersecurity","item_id":"1.1-lab","locked":true,
     "reason":"anonymous-closed-for-lesson","activity":null}

So some class holds a lesson-scope closing row on 1.1, and that is the row the
teacher was hitting. Driving the real router against a throwaway database, with
teacher A holding an explicit open row and a class under teacher B holding
`(1.1, *, open=0)`, reproduced the same reason string:

    her signed-in student : open
    TEACHER A herself     : LOCKED (anonymous-closed-for-lesson)
    a signed-out visitor  : LOCKED (anonymous-closed-for-lesson)

After the change, same fixture:

    her signed-in student : open
    TEACHER A herself     : open
    a signed-out visitor  : LOCKED (anonymous-closed-for-lesson)

## What changed

`routes/analysis.js` grows the teacher branch `routes/labs.js` already has, plus
`bearer()` and `verifyAnyToken()` beside it. The locked response now carries
`locked_for`, the same field and the same meaning labs.js sends, so a refusal can
say whether it was the caller's own class or a lock they have nothing to do with.

Entitlement is deliberately not required, matching labs.js: an activity nobody has
closed is served to the public already, so demanding one here would invent a fresh
way to be wrong for a teacher on a free plan.

`smoke:analysisgate` gains section 9, six assertions. `smoke:analysismutation`
gains two mutations and has one repointed, because my edit reshaped the literal its
anonymous-rule mutation was pinned to.

## Shipped

PR #666, merged as `42b5a7d`. CI passed on `c5a9f7f`, which was the head at merge
time and the only commit on the branch, checked rather than assumed.

Production before the merge, on commit `1e896d0`, carried no `locked_for` key at
all:

    {"course":"ap-cybersecurity","item_id":"1.1-lab","locked":true,
     "reason":"anonymous-closed-for-lesson","activity":null}

After, on `42b5a7d`:

    {"course":"ap-cybersecurity","item_id":"1.1-lab","locked":true,
     "reason":"anonymous-closed-for-lesson","locked_for":"anonymous","activity":null}

`deploy-gates/2026-09-14-analysis-teacher-preview.json` passes on three
independent kinds, suite, mutation and live, run after the deploy rather than
before it.

The live half states its own limit rather than overstating its reach. It does NOT
observe a real teacher getting the activity, because that needs a teacher
credential this environment does not hold and a session must never ask for one.
What it pins is that the new build is the one answering, which the old build
could not fake, and that the new branch fails closed: a garbage bearer and a
well-formed token signed with the wrong key both still get the refusal. The
teacher path itself rests on the suite driving the real router with a signed
teacher token, and on the mutation that proves that assertion is not hollow.

## What was learned

The role check on that branch was hollow, and mutation testing is the only reason
anybody knows. Dropping `role === 'teacher'` left the whole gate suite green. The
reachable way in is not a forged token, it is a stale one: `student()` also returns
null when the student ROW is gone, so a 180 day JWT from a deleted roster entry
verifies, still claims role 'student', and would have taken the teacher branch
straight past every class's lock. There is an assertion for that now, and a
mutation that proves the assertion is not decoration.

The other thing worth keeping is smaller. The reported name and the served name
were different things, and the twenty minutes this took were nearly all spent
establishing that "the 1.1 lab" is an analysis activity rather than a lab. Both
routes serve something a teacher calls a lab, the gradebook column for both is
called Lab, and only one of them has a file under `config/labs/`.

## Still open

A signed-out visitor is still refused the 1.1 lab because one class closed lesson
1.1, and that is untouched here on purpose. Whether one class closing an activity
should close it for every anonymous visitor is board decision #277 and Tanner's to
make, not a patch.

The analysis player still says "Your teacher has not opened this activity yet" to
every locked caller, including one who has no teacher. The route now sends
`locked_for` so the page can tell the two apart; wiring the wording to it is not
done and is worth doing next to whatever #277 decides, since the right sentence
depends on the answer.
