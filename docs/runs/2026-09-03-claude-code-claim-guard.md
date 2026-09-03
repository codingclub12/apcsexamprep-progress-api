# Rule 2 is mechanical now: the claim guard

Task 189, claim 74. Locks: `api:.claude/settings.json`,
`api:.claude/hooks/claim-guard.js`, `api:.claude/hooks/session-start.sh`,
`api:lib/claim-locks.js`, `api:smoke/claim-guard.js`, `api:scripts/apcs.js`,
`api:CLAUDE.md`.

The task did not exist when this work started. Creating it and claiming it was
the first action of the session, which is the change this run is about.

## What was actually wrong

On 2026-09-03 three sessions rebuilt the same mojibake detector in one
afternoon. Two of the three rebuilds were discarded. The obvious diagnosis, and
the one written into the earlier run note, was "read before writing". That is
true and it is not the cause.

The cause is that CLAUDE.md has four rules and only the first one is real.

    rule 1  open with the digest      SessionStart hook fetches it. Mechanical.
    rule 2  claim before you touch     advice
    rule 3  close with an artifact     apcs done refuses without one. Mechanical.
    rule 4  you may not verify         cookie-gated in the API. Mechanical.

Rule 2 was the only one held up by memory, and it is the only one that failed.
Everything it needed was working: the claim endpoint returns a 409 naming the
holder, and the digest publishes live locks in `in_flight` with the file list,
the surface, the age and the state. All three colliding sessions had that digest
in context. None of them claimed and none of them looked.

## What was built

`.claude/hooks/claim-guard.js`, a `PreToolUse` hook on `Edit|Write|NotebookEdit`.
It resolves the target file to its `repo:path` lock, reads live claims, and
refuses the edit when another session holds it. The refusal names the holder, the
task, the claim id and the age, and gives the three ways out in the order they
should be tried, with `--force` last and labelled as an audited act rather than a
shortcut.

`lib/claim-locks.js` is the reading half: path to lock, live claims, ownership.
Split out so the logic is testable without spawning the hook, and so anything
else that wants to ask "who holds this file" has one place to ask.

Three decisions inside it are load-bearing.

**Detection reads the digest, not the claim API.** The digest is reachable with
`COMMAND_READ_TOKEN`, which is what CLAUDE.md tells every Claude Code environment
to hold. Had detection needed `TODO_KEY`, the guard would protect only the
sessions that were already best equipped, which is backwards.

**An unlabeled claim counts as somebody else's.** A guard that goes quiet when it
cannot tell whose lock it is would be silent exactly when the board is busiest.
Being blocked by an unlabeled claim is a visible annoyance with an obvious fix;
ignoring one is an invisible collision. `apcs claim` now sends a `session_label`
by default so this stays rare: `session-start.sh` writes the session id to the
temp dir, because the hook payload is the only place it exists and the
environment does not export it.

**It fails open on an unreachable board, and says so.** A board outage must not
brick every session; `session-start.sh` already made that call for the same
reason. The failure is printed rather than swallowed, which is the difference
between a session that chose to proceed and one that never knew.

It also warns once per file when a file is unclaimed by anyone. It does not block
there. Refusing every scratch edit is how a guard gets switched off within a day.

## The gap this uncovered, which is Tanner's

CLAUDE.md tells every Claude Code environment to set `COMMAND_READ_TOKEN` and NOT
`TODO_KEY`, for a good reason that was proved right twice today. Claiming
requires `TODO_KEY`.

    POST /api/command/task/85/claim, read token as bearer   401
    POST /api/command/task/85/claim, read token bare        401

`lib/command-auth.js` resolves an identity from a cookie or a `TODO_KEY` bearer
and nothing else; the read token is not an identity at all, it authorizes one
GET. So a session configured exactly as instructed can SEE every lock and TAKE
none. It is told to follow a rule it cannot perform.

The honest fix is a third credential scoped to the claim protocol alone, weak on
purpose the way the read token is: with it you can take and release locks and do
nothing else, so leaking it is a nuisance rather than a breach. That is a
decision about the auth model, not a patch, so it is written down rather than
built.

Nothing about this blocks the guard: detection works for every session today.
What it blocks is the other half, a session that sees the warning and wants to
claim.

## Evidence

**suite.** `npm run smoke:claimguard`, 25 assertions, plus the full offline set.

**mutation.** Three, run by breaking the shipped code and requiring the suite to
go red on the matching assertion rather than in aggregate:

    treat an unlabeled claim as possibly mine    2 assertions FAIL
    match absolute paths, not directory names    3 assertions FAIL
    make the conflict branch unreachable         3 assertions FAIL

The middle one matters more than it looks. Matching on directory name is what
lets the same hook work in a container at `/home/user`, on a laptop under
`~/code`, and inside a git worktree. An absolute-path match passes every test
written against this container and silently protects nothing anywhere else.

**live.** The deny path was run end to end against the real board before any
fixture existed. With this session's own claim held on `api:CLAUDE.md` and a
different session label supplied, the hook refused the edit and named claim 74,
task 189, and the holder. `session-start.sh` then printed the same lock set in
its new "files another session is holding right now" block.

**A regression this run introduced and the suite caught.** Making
`session-start.sh` read the hook payload from stdin meant it blocked forever when
a caller spawned it with an open pipe and never wrote to it, which is exactly
what `smoke/session-hook.js` does. A hook that can hang is worse than a hook that
learns nothing, so the read is bounded: `timeout 2 cat`, which returns instantly
in the normal case because Claude Code closes stdin after sending the payload.
Two other suites, `ijverify` and `csadebug`, looked like casualties of the same
change and were not: they take 66s and 93s and the sweep was capping suites at
60s. Worth separating, because "my change broke three suites" and "my change
broke one suite and my harness was impatient" lead to very different afternoons.

**A hollow pass, found and fixed.** The first version of the end-to-end test used
`execFileSync`, which blocks this process's event loop, while the stub board
server lived in that same process. Every child fetch therefore sat unanswered
until its abort timer fired, and every case reported "board unreachable". Two
assertions PASSED that way, because the unreachable path also returns no
permission decision, so "allowed" and "never asked" were indistinguishable. That
is the hollow-guard failure this repo keeps writing conventions about, reproduced
inside the suite written to enforce one. The test is async now and the two passes
are real.

## What is still open

- The claim credential gap above. A decision.
- The guard covers `Edit`, `Write` and `NotebookEdit`. It does not cover a write
  performed by a Bash heredoc or `sed -i`, and this session used exactly those
  all afternoon. Covering Bash means parsing arbitrary shell to find write
  targets, which is a much bigger and much less reliable job than reading
  `tool_input.file_path`. Worth knowing the hole is there rather than believing
  the guard is total.
- Rotate `COMMAND_READ_TOKEN` and `TODO_KEY`. Still outstanding from earlier
  today, still browser-only.
