# Board 166: 7 of 9 workflows wired to /api/command/checks

Branch: `claude/ceo-agent-setup-sv4e61` (existing branch, not created for this task).
Claim: 58 (workflow files), 59 (this note).

## What was wrong

`checks.total` on the live digest read `2`. That was never a count of every
check this repo runs; it was a count of the two workflows able to speak to the
board. `grep -rln "command/checks" .github/workflows/` returned exactly
`deploy-drift.yml` and `tests.yml`. The other seven ran on their own schedules,
found real things, and told nobody the board reads:

- `deploy-drift.yml` was red for four days in 2026-08 before this exact gap was
  fixed for itself alone, on 2026-09-01.
- `site-audit.yml` has exited 1 since 2026-08-28 and the board never said so.
- `/api/health` computes `reporters: {ok:false, activities:11}` and nothing
  carries that field to the board at all (out of scope for this pass; noted for
  whoever picks it up next).

One reporting-architecture defect, three counted instances, not three separate
incidents.

## The rule

Every workflow that runs unattended posts its own verdict to
`/api/command/checks`, in a step that:

- posts a legal `(source, check_id, state)` per `lib/command-checks.js`
- never fires from a cancelled run (`job.status != 'cancelled'`), which
  compared nothing and is neither pass nor fail
- is `continue-on-error: true`, so the observer cannot break the job it is
  describing
- skips (does not fail) when `TODO_KEY` is unset
- is `if: always()`, so an earlier failure in the same job still gets reported

Seven workflows now carry this step: `auto-dispatch.yml` (source `health`),
`ced-watch.yml` (`linkcheck`), `nightly-sweep.yml` (`health`),
`railway-deploy.yml` (`health`), `site-audit.yml` (`linkcheck`), `smoke.yml`
(`smoke`), `verify-board.yml` (`health`). `check_id` is a fixed string per
workflow (`auto-dispatch`, `ced-watch`, `nightly-sweep`, `railway-deploy`,
`site-audit`, `auth-smoke`, `verify-board`), never derived from anything
per-run, so a red streak fingerprints to one aging task rather than a new row
per run.

No workflow's *behaviour* changed. `site-audit.yml`'s exit 1 is untouched on
purpose: fixing it in the same pass would remove the evidence that the
reporting works.

## What it refuses

`railway-deploy.yml` is the one case that needed an extra guard, not just the
five bullets above. It has 70 green runs in which `RAILWAY_TOKEN` is unset,
every dependent step's `if: steps.gate.outputs.ready == 'true'` skips, and the
job still exits 0. A reporter gated only on `job.status`/`cancelled` would post
`pass` for a run that deployed nothing, industrialising the exact failure this
task exists to fix. Its report step adds
`steps.gate.outputs.ready == 'true'` to the `if:`, inside the `always()`, so:

- token unset -> the step does not run at all, nothing posted (there is no
  honest "skipped" state in the checks schema, only `pass`/`fail`, so silence
  is the correct answer, matching the job it describes)
- token set, deploy succeeds -> posts `pass`
- token set, deploy or confirm fails -> `always()` still runs it, posts `fail`

Proven non-hollow by mutation (below): stripping the gate clause makes the
suite assertion `8.2` (and `8.3`) go red immediately.

## Evidence

`--pre` gate result (3 kinds; `live` deferred, this PR is not merging):

```
DEPLOY GATE (pre-deploy, live checks deferred): Board 166: 7 of 9 GitHub
workflows wired to /api/command/checks ...

  [PASS] suite     smoke:deployreporting (repo's own wiring assertions) 94 passed, 0 failed
  [PASS] suite     smoke:checks (command-checks endpoint contract, unchanged) 27 passed, 0 failed
  [PASS] rederive  second implementation: step-block parser, not the smoke suite's line-window regex REDERIVE OK: all 9 of 9 workflow files report...
  [PASS] mutation  railway-deploy reporter guard is not hollow broke .github/workflows/railway-deploy.yml
         and the suite went red, on "[FAIL] 8.2 the report step is gated on steps.gat"

  kinds passing: suite, rederive, mutation
```

- `suite`: `smoke/deploy-reporting.js` extended with sections 7 (six plain
  reporters) and 8 (railway-deploy's skip guard specifically), 94 assertions,
  all green. `smoke/command-checks.js` (the endpoint contract itself, unchanged
  by this PR) still 27/27.
- `rederive`: `scripts/rederive-checks-reporting.js`, a second implementation
  that walks step BLOCKS (split on the `      - name:` boundary) rather than
  the smoke suite's fixed line-window regex, and independently concludes all
  9/9 workflow files report, with the same railway-deploy asymmetry checked on
  its own terms. `node scripts/rederive-checks-reporting.js` exits 0.
- `mutation`: manifest at `/tmp/board-166-manifest.json` (not committed; the
  command and mutation are what matters, reproducible from
  `.github/workflows/railway-deploy.yml`'s reporter `if:` line). Stripped
  `steps.gate.outputs.ready == 'true'` from the guard, re-ran
  `smoke/deploy-reporting.js`, got `[FAIL] 8.2 the report step is gated on
  steps.gate.outputs.ready == 'true'` (and `8.3`), file restored byte-identical
  afterward (`diff` confirmed clean).
- Full offline suite: all 161 `smoke:*` scripts (the same set `tests.yml`
  derives from `package.json`, minus its `install/auth/teacher/pages/cleanup`
  exclusions) run green after this change.
- `live`: not run. This PR has not merged; per the task's explicit instruction,
  merging is a separate decision left to a human. Running `live` now would
  necessarily be decorative (nothing has deployed, so nothing observable
  changed yet) which is exactly the kind of check this repo's own gate refuses
  to count.

## What a human should see on the board after this merges

`GET /api/command/checks` (or the digest's `health.checks`) gains up to seven
new fingerprints the first time each workflow's schedule fires:
`health:auto-dispatch`, `linkcheck:ced-watch`, `health:nightly-sweep`,
`health:railway-deploy` (only once `RAILWAY_TOKEN` exists; until then it
correctly posts nothing), `linkcheck:site-audit`, `smoke:auth-smoke`,
`health:verify-board`. `checks.total` moves off `2`. Concretely, the next time
`site-audit.yml`'s nightly 09:00 UTC run exits 1, the board's `checks.red` array
should show `{"source":"linkcheck","check_id":"site-audit", ...}` with
`failing_days` counting from that run, which today it cannot show at all.

## Still open

- Did not fix `site-audit.yml`'s exit 1. Explicitly out of scope; it is the
  finding, not a bug in this pass.
- Did not touch `railway-deploy.yml`'s `RAILWAY_TOKEN` gate or request the
  credential. Tanner's alone, per the task.
- `/api/health`'s `reporters: {ok:false, activities:11}` field still reaches
  nobody. Named in the task prompt as a third instance of the same defect but
  explicitly not this pass's scope (no workflow currently reads or posts it);
  flagging for whoever picks up the health-reporters gap next.
- Did not merge. PR is open against `claude/ceo-agent-setup-sv4e61`, which
  already carries three commits from earlier work today gated separately; a
  human decides when this becomes part of that set.
- Post-merge `deploy-gate.js` run (without `--pre`, live checks included) is
  still owed once this actually ships; a live check now would be decoration
  since nothing has changed in production yet.
