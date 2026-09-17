# The lock did not bind a student, because the page asked for a key nothing writes

2026-09-14, Claude Code, board #323.

## What was reported

"Now it didn't lock when the teacher locked it for a student."

That arrived hours after board 277 opened the anonymous case, so the obvious
reading was that 277 had broken the half of the rule that is supposed to still
bite. It had not. It had made a week-old defect visible.

## What it actually was

The 1.1 lab page supplies the analysis player with a `getToken` that reads
`localStorage.getItem("apcs_student_token")` and nothing else. Nothing writes
that key.

    shopify/join.html:563     localStorage.setItem('apcse_token', token)
    theme.liquid:1987         if (lsGet('apcse_token')) return 'logged-in-student'
    the theme, everywhere     20 token references, all 'apcse_token', none other

So a signed-in student on that page sent no Authorization header. The server saw
an anonymous request, and every gate on this site answers "is this open for MY
class". A request with no class cannot be bound by any teacher's lock.

The live page proves it against itself. `apcse_token` appears in that body at
offset 96777, put there by the theme's own tracker, and the analysis mount at
229910 reads a different key. On one page, the tracker finds the student and the
activity does not.

## Why nobody saw it for a week

The anonymous rule in force from 2026-09-07 until board 277 refused an anonymous
caller any activity some class had closed. So the page LOOKED locked, and the
missing token changed nothing anybody could perceive. Opening the anonymous case
is what made a missing token start to matter, and the report followed the same
day.

Worth keeping, because the shape recurs: a safety net can hide the hole it sits
under, and removing the net is when you find out. The 277 change was correct and
the thing it exposed was real.

## What changed, and where

**In the player, not the page.** The player is served from this API with
`no-store` and costs a push. A page body costs a live Matrixify MERGE with no
undo. So an EMPTY answer from the page's configured `getToken` now falls through
to the resolution the lab player has always had, starting with `apcse_token`.
The live page needs no import, and a page that supplies a WORKING `getToken` is
still obeyed, so the fallback is a safety net rather than an override.

`scripts/analysis-page-body.js` stops emitting a `getToken` at all, so a
regenerated page carries no key list to go stale.

**The same defect was in `public/heartbeat-reporter.js`**, whose fallback tried
`APCS_STUDENT_TOKEN`, `apcs_student_token` and `student_token` but not
`apcse_token`, so it resolved to empty for every real signed-in student. Found by
grepping the other consumers rather than by waiting for a second report, which is
what CLAUDE.md means by the migration being the change.

`lib/student-token-keys.js` is now the one authority for the list. The players
cannot require it, being ES5 and served standalone with no build step, so the
GUARD reads both sides instead.

## The guard, and why its first version was wrong

`smoke:studenttokenkeys`, 16 assertions, and the interesting part is what
mutation testing said about its own sections.

Section 1 scans each player for every canonical key. Section 2 checks the order
inside the resolution expression. Section 3 RUNS each player under a DOM stub
with a fake localStorage holding only `apcse_token`, driven by the live page's
own broken config, and asserts the Authorization header that goes on the wire.

Removing `apcse_token` from the player's code leaves it in the comment above,
so section 1 still passes and only section 3 goes red. A text scan cannot tell
prose from behaviour. That is asserted as a mutation rather than described.

The first draft of section 2 compared `indexOf` across the whole file and failed
on all three players, because every one of them explains the dead key in a
comment above the code that reads the live one. Fixed to scan inside the
expression.

## Evidence

Pre-deploy gate: suite and mutation. The live check was run against production
BEFORE the deploy and failed on exactly one assertion:

    1. A signed-in student, with the live page's own broken config
      [FAIL]   the deployed player sends the token sign-in actually wrote
               "(no Authorization header at all)"

It pulls the DEPLOYED bytes and runs them, rather than grepping them, for the
reason already recorded on `verify-lab-lock-live.js`: its first draft grepped for
"Authorization" and passed against a build that still had the bug, because the
player had always sent that header somewhere else.

246 offline suites green.

## Still open

Nothing writes `apcs_student_token` or `student_token`. Both are kept in the
fallback because a page body somewhere may still set one and page bodies are
expensive to correct. Whether any page actually does is a sweep nobody has run.

`public/heartbeat-reporter.js` had been reporting unattributed for every
signed-in student whose page did not configure it explicitly. How long, and
whether any data is missing because of it, is not established here.
