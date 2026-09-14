# Board 277: a lab is open unless the caller's own teacher locked it

2026-09-14, Claude Code, board #322. Decision #277, answered by Tanner.

## The decision

"Labs should be open as long as the specific teacher doesn't lock it."

That settles a question that had been open on the board since the anonymous rule
shipped: should one class closing a lab close it for every anonymous visitor?
The answer is no.

## What it reverses, and why that is written down rather than buried

From 2026-09-07 until today, `routes/labs.js` and `routes/analysis.js` refused an
anonymous caller any activity that ANY class had closed. That rule was not a
mistake. A teacher closed a lab, checked her own fix in incognito, and found it
open, and she was right: without the rule the lock is one click wide, because a
student who signs out has no class and therefore no lock.

The cost on the other side turned out to be larger. One school closing lesson 1.1
was taking that activity dark for every visitor on the public internet, including
every other teacher's students and every search engine. This repo already says
out loud that gating tier 1 practice content is a strategic loss rather than a
security win, and a gate is meant to answer "is this open for MY class". A caller
with no class has no teacher whose answer could apply to them.

Tanner was given that trade in those terms and chose this side. So the porousness
is now the policy. The lock binds a signed-in student of the class that set it,
and nobody else. A teacher who needs an assessment that cannot be reached signed
out needs server-side identity on the item, which is a different feature.

Both routes carry the reasoning at the exact branch, headed DO NOT RE-DERIVE THE
OLD RULE FROM THE INCIDENT HISTORY, because the history is still in those files
and is persuasive on its own.

## What changed

`routes/labs.js` and `routes/analysis.js` drop the cross-class refusal and their
now-dead queries. `lib/activity-gate.js` is untouched: `lockedForAnyClass` stays,
because `routes/quiz.js` still calls it to withhold an answer KEY from an
anonymous scorer, which is a different question from whether an activity opens.

Six suites moved with it, and one of them is the interesting one.

## What mutation testing found, and what was done about it

`smoke:analysismutation` reported two of its own mutations GREEN, which by the
rule at the top of that file is a FAILED check. Both mutated the teacher-preview
branch added earlier today: one deleted it outright, one dropped its
`role === 'teacher'` check. Both were real when they were written. Board 277 made
them unobservable a few hours later, because every caller without a student row
now gets the activity regardless of which branch answers.

The branch is KEPT and the mutations are RETIRED, which is the opposite of the
reflex. A permit that grants what is already granted is harmless; a mutation
claiming to prove something it cannot is the hollow thing this repo keeps finding
in its own guards. If the anonymous rule is ever narrowed again, that branch is
what keeps a teacher out of the support queue, and there is now a mutation,
`BOARD 277 REVERTED`, that makes narrowing it a visible act rather than a quiet
re-derivation.

The same reasoning retired the `locked_for` mutation in `smoke:labgatemutation`.
After 277 the only refusal the routes can produce IS the caller's own class, so
`locked_for` is always `'class'` and hardcoding it cannot fail. The happier half
of that: the wording problem the field was added for is now solved by the policy
rather than by the field. "Your teacher has not opened this yet" is true of every
refusal these routes can still emit.

`smoke:labteacherpreview` lost its whole second section, which proved that the
ROLE opened the door rather than the presence of a header. Every one of those
callers is now OPEN on the gate. Rather than delete the forgeries, they were
pointed at the ANSWER KEY route, where the role still decides something real: a
token signed with the wrong secret, a student relabelled by claim, an expired
teacher token and a stale student token are each still refused the key.

## Evidence

Pre-deploy gate, `deploy-gates/2026-09-14-board-277-labs-open.json`, three kinds:
suite, rederive, mutation. Live deferred until after the deploy.

The rederive is the one worth naming: `smoke:labgaterederive` resolves every
caller shape against every gate arrangement longhand, importing nothing from the
module under test, and still asserts that BOTH answers appear across the matrix,
so the agreement is not vacuous.

Both live checks were run against production BEFORE the deploy and both failed,
which is the bar the gate sets. `verify-anon-gate-live.js` reported 1 of 7 labs
refusing a signed-out visitor, `ap-cybersecurity 1.2-auth-lab` with reason
`anonymous-closed-for-lesson`, so the fixture is live state rather than a
contrivance.

## Still open

The analysis player still says "Your teacher has not opened this activity yet".
That sentence is now always true, so this is no longer a correctness bug, only an
unused `locked_for` field on the wire.

`smoke:analysisgate` stops at the first anonymous failure because the next line
reads `activity.specimens` on a null activity. That is why the 277 mutation in
its battery names a section 1 assertion rather than the section 3 one. Worth
making the suite report all the damage rather than the first of it, but it is not
this change.
