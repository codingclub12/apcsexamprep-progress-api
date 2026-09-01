# A CEO agent, and the four-day green deploy that shipped nothing

Asked to set up a CEO agent for someone new to running agentic systems. The
reconciliation pass that the agent now mandates was run by hand first, to find
out whether the role had anything to do. It did, immediately, and the finding is
the better half of this note.

## What is true, with the evidence

Four signals disagreed on 2026-09-01, and every one of them was behaving as
designed.

**Production was seven commits stale.**

    $ curl -sS https://progress.apcsexamprep.com/api/health
    {"status":"ok","ts":"2026-09-01T00:18:37.764Z","commit":"ce613c7", ...}
    $ git rev-parse --short=7 origin/main
    2768fcb

`ce613c7` is PR #414. Seven commits and four pull requests have landed since
and none are serving: #415, #416, #417, #418, plus two direct commits and a
correction to the earlier stale-deploy run note.

**Seventy green deploy runs, zero deploys.** `railway-deploy.yml` has 70 runs,
conclusion `success` on every one. It gates on `RAILWAY_TOKEN`:

    - name: Is a Railway token configured
      id: gate
      env:
        HAS_TOKEN: ${{ secrets.RAILWAY_TOKEN != '' }}

and every subsequent step carries `if: steps.gate.outputs.ready == 'true'`. The
token is unset, so all of them skip and the job exits 0. This is documented in
the workflow's own header and is a deliberate trade: a workflow that goes red
because a human has not done a setup step is a workflow people mute. The trade
is defensible. The consequence is that the checkmark carries no information.

**The drift alarm worked.** `deploy-drift.yml` compares `/api/health` against
main every thirty minutes. Run 332 at 2026-08-31T23:56Z: `failure`. So has
nearly every run since 2026-08-28. It was correct, continuously, for four days.

**The board could not see it.**

    $ grep -ln "command/checks" .github/workflows/*.yml
    .github/workflows/tests.yml

Only `tests.yml` posts to `POST /api/command/checks`. `deploy-drift.yml` never
reports its result, so the digest health block read:

    "checks": {"total": 1, "failing": 0, "red": [], ...}

One check, green, and a red one it has no way to know about.

## Why this is the finding and not just a stale deploy

Task 133 already describes the unset token. What was not on the board is the
reporting gap, and that is the more durable problem. The token is one secret
away from fixed. The gap means that after it is fixed, the next alarm to fail
in a workflow that does not report will be invisible in exactly the same way.

Four correct components produced one confident wrong answer for four days. Every
agent that touched this was right about its own piece. Nobody was checking
whether the pieces agreed, because that had not been anybody's job.

Note also what the drift makes true of the ledger: any task closed in the last
four days on the evidence "merged to main" is unproven, because merging stopped
implying shipping on 2026-08-28. That is a caveat on part of the 60-item
verification backlog, not just on one task.

## What changed

- `.claude/agents/ceo.md`. Orchestrator. Reconciles before it ranks, ranks by
  consequence rather than by bucket, delegates through `lib/command-router.js`
  rather than reimplementing routing, and batches what is left for a human.
  Cannot edit production code, merge, deploy, or set `verified`.
- `docs/ceo-operating-model.md`. The human-facing half: the three jobs that stay
  human (decide, verify, hold credentials), the session loop, how to tell the
  CEO agent is wrong, and the anti-patterns.
- `docs/where-jarvis-lives.md`. Both files added to the brain table, and a row
  for starting a CEO session.

Docs and one agent definition. No production code, no schema, no routing change.

## What was learned

**Rank signal integrity above visible breakage.** The instinct is to put the
leaked answer key first, and there is a real argument for it. The stale deploy
still outranks it, because while it holds you cannot confirm that a fix for the
answer key is live. Fixing something you cannot verify shipped is how the same
bug gets fixed twice.

**A check that skips is not a check.** The useful question about any green
checkmark is what it would do if its precondition were missing. If the honest
answer is "pass", it is decoration. This is the same shape as the `/api/health`
200 that cost most of a day on 2026-08-17, recorded in `server.js`, and the same
shape as the site-audit baseline that made its own delta dead. Third instance of
one pattern.

**An alarm is only as good as its reporting path.** `deploy-drift.yml` is a
well-built check wired to a place nobody looks. The board is where a human looks.
Manufacturing the feeling of coverage is worse than no check, because it buys
confidence rather than attention.

**The bottleneck was the human, not the agents.** 60 unverified, 5 open
decisions, 12 of 14 quick wins owned by Tanner, against 0 in-flight agent work.
The system's capacity constraint is the one actor who cannot be parallelised, so
the CEO agent is measured on his queue depth rather than on tasks started.

## Still open

- **Task 133, the unset `RAILWAY_TOKEN`.** Human-only: it is a credential. Until
  it is set, merging does not deploy and the drift persists.
- **The reporting gap, unticketed.** `deploy-drift.yml` should post its result to
  `POST /api/command/checks` so a red drift check reaches the board. Small, and
  deliberately not done in this pass: it is production workflow behaviour and the
  session was scoped to the CEO role. Worth a task.
- **The 60-item verification backlog,** now with the caveat above: anything closed
  since 2026-08-28 on "merged" evidence needs re-checking against live rather
  than against main.
- **Task 137** (1.1 leaks all 10 CFU answers) and **task 130** (three cyber
  quizzes share the key ABCDB) are both live and student-facing. Not touched
  here. They rank second only because the deploy pipeline has to be trustworthy
  before a fix for either can be confirmed shipped.
