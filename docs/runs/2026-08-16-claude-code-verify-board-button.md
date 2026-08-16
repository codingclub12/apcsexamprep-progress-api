# 2026-08-16 - reconciling the board from a phone, and saying where Jarvis lives

Agent: Claude Code. Branch: `claude/verify-board-button-vaw0hu`, off `main`.

Two things, from one question: "I don't know what to open or what to save. Is it
a new Claude Code session every time, or the same one, or a file on GitHub?"

That question had no answer anywhere in the repo, which is its own finding.

## 1. Phase 0.3 as a button

`scripts/verify-board.js` reads the digest, takes every task in
`needs_verification`, and runs `scripts/verify-artifact.js` against each one
whose artifact is a fetchable URL. It emits a markdown report: what looks
confirmed, what looks wrong, what is not machine-checkable at all.

`.github/workflows/verify-board.yml` wraps it as a `workflow_dispatch` job with
`limit` and `task` inputs. So reconciling the ledger is now: tap Run workflow,
read the summary on a phone, tap verify on the ones that check out. It was
previously "sit at a laptop with a token", which is why it had never been done.

**The logic is a script, not YAML**, so it can be tested offline and run by hand.
Logic buried in a workflow is logic nobody can test, and this session has already
been bitten twice by exactly that.

**Read-only, and it is checked rather than claimed.** `smoke/verify-board.js`
records every request the script makes and fails the suite if any of them is not
a GET, if any touches `/api/todo`, or if any mentions verify. It never PATCHes
and it cannot set `verified`: that bit is cookie-auth only, so the thing that did
the work is never the thing that closes the loop on it.

## 2. A pipefail bug, found by running the workflow rather than reading it

The step originally ended:

    if node scripts/verify-board.js $args | tee report.md; then

A pipeline reports the exit status of its LAST command, so a dead script behind a
healthy `tee` lands as a green tick. Extracted the step from the YAML and ran it
against an unreachable endpoint:

    verify-board: fetch failed
    exit: 0

That is the third time in two days the same shape has appeared: a failure that
reports success. `set -o pipefail` fixes it, and the comment above it says how it
was found. Re-tested, all three paths:

    no secret            -> exit 1, "### Reconcile the board: NOT CONFIGURED"
    unreachable endpoint -> exit 1, "### Reconcile the board: FAILED"
    working board        -> exit 0, the report

The success case matters as much as the other two: a fix that turns everything
red is indistinguishable from a broken workflow.

## 3. docs/where-jarvis-lives.md

The architecture, written down: there is no persistent session, sessions are
disposable hands, and the three things that outlive them are the ledger (the
database), this repo (the rules, CLI, agents, protocol, run notes) and GitHub
Actions (the clock). Plus what to open, what to save (nothing, it is all
committed), and a "what is NOT true yet" section so nobody reads the page and
assumes more autonomy than exists.

Linked from `CLAUDE.md`, which is what a fresh session loads on boot. The point
that took longest to say plainly: **committing a file is how you change what
every future session knows.** `.claude/agents/verifier.md` became a live agent
the moment it merged, with nothing configured session-side.

## Evidence

```
npm run smoke:verifyboard   27 passed, 0 failed   (new)
all 58 offline suites       pass
```

The suite covers: real signals surfacing, clean pages staying quiet, a note
artifact reported as not machine-checkable rather than as a failure, the per-run
cap reporting what it skipped, read-only verified by request log, loud failure on
a missing or wrong credential without echoing it, and JSON mode.

## Still not done

- **The pass itself.** The button exists; nobody has pressed it. The board still
  contains whatever it contained when the brief was written.
- **Nothing was run against production.** Every measurement here is against a
  fake board on loopback. This session cannot reach
  `progress.apcsexamprep.com` at all.
