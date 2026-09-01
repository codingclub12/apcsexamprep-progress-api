# Phase 0 items 2 and 3: make the alarms reach the place a person looks

Follow-on to the CEO agent pass earlier today. That session found four correct
components producing one confident wrong answer for four days. Two of the four
are fixed here, and both were the same shape: a check that was right, and read
by nobody.

## What changed

**`deploy-drift.yml` now reports to the board.** It posts its verdict to
`POST /api/command/checks` as `source: health`, `check_id: deploy-drift`.

**`verify-board.yml` now runs daily** at 11:17 UTC, and stays a button.

`smoke/deploy-reporting.js`, 21 assertions, registered in `package.json` so
`tests.yml` picks it up from the derived suite list.

## Why each one

**Item 2.** On 2026-08-28 the drift alarm went red and stayed red for four days
while the digest reported `checks: {total: 1, failing: 0}`. Nothing was broken.
`deploy-drift.yml` was correct the entire time. Only `tests.yml` posted to
`/api/command/checks`, so the alarm reported to the Actions tab and a human
looks at the board.

That is worse than having no check, because it manufactures the feeling of
coverage. The board said zero failing, and the board was the thing being
trusted.

`health` is the registered source for exactly this in `lib/command-checks.js`,
which files it in `now` on surface `api`. Fingerprinting is `(source, check_id)`,
so a stall persisting for days is one task ageing rather than one task per run,
and going green auto-closes it with the passing run as the artifact.

**Item 3.** The board held 60 tasks in `needs_verification` against 0 in-flight
agent work. Production had outrun verification at manual speed, before any
automation was switched on. The verify click is the one queue that cannot be
moved off a human, so the only lever is making each click cheap, and evidence
gathered at 3am is cheaper than evidence gathered while somebody waits.

## What was deliberately kept

`verify-board.yml` still writes nothing and files nothing. Its header used to
say "MANUAL ONLY, on purpose. There is no schedule here", and the reasoning was
sound: a report nobody reads is noise, and the sweep that FILES findings as
tasks is Phase 2.2, a different job with different risks. That distinction
holds. The claim is now quoted and corrected in place rather than deleted, the
same way `server.js` retires a stale claim, so the reasoning stays legible.

The reporting step in `deploy-drift.yml` carries three guards learned elsewhere
in this repo at cost:

- **Never report from a cancelled run.** `always()` fires on cancellation,
  `job.status` is then `cancelled`, and `tests.yml` reporting `fail` from a run
  that had compared nothing opened task #88 against work that never happened. A
  cancelled run knows nothing; silence is the only honest report.
- **`continue-on-error`, and the curl swallows its own failure.** The command
  center is an observer here. An observer that can turn the drift alarm red
  would make it lie in a new direction.
- **A missing `TODO_KEY` skips rather than fails**, so a fork sees no difference.

Every exit path in the compare step now writes a `detail`, and the smoke asserts
the counts match. An empty detail on the board reads as a check that ran and
found nothing to say, which is not the same as one that could not describe
itself.

## Evidence

Both guards were mutation-tested, because a check that cannot fire on a broken
fixture is worthless:

| Break | Caught by |
|---|---|
| Drop the cancelled-run guard | 3.1 |
| Silence one exit path's verdict | 4.2 (`exits: 6, details: 5`) |
| Typo the source to `deploy` | 2.1, against the real `SOURCES` export |
| Remove the schedule | 5.1 |
| Drop the scheduled-run limit fallback | 5.3 |

Restoring each returned to 21 of 21. 551 assertions pass across
deployreporting, buildcommit, checks, verifyboard, command, health,
healthintegrity, boarddelta, assertions, hazards, sessionhook, apcs and
dispatch.

## What was learned

**The reporting path is part of the check.** Three separate alarms in this repo
have now been correct and unread. Building a check is the easy half; deciding
where its answer lands is the half that determines whether anybody acts on it.

**A cron in this repo is not a schedule, it is a hope.** `deploy-drift.yml`
nominally runs every 30 minutes. Measured gaps between its last seven runs were
5h32m, 5h22m, 2h42m, 3h43m, 4h02m and 7h51m. GitHub deprioritises scheduled
workflows heavily on low-activity repos. Nothing time-critical belongs on a cron
here, and that is now written into both files.

## Still open

- **The throttling caveat on item 2.** Because the alarm fires every 3 to 8
  hours rather than every 30 minutes, a stalled deploy can now reach the board,
  but not promptly. The tighter fix is for `railway-deploy.yml` to post the same
  check from its confirm step, which is the moment the answer actually matters
  and costs nothing extra. Deliberately not done here: this pass was scoped to
  items 2 and 3 as agreed, and that is a third change to a workflow that has
  already been edited twice today.
- **Neither of these is proven live yet.** Both are asserted structurally; the
  first real evidence is the next scheduled run of each, and neither has fired.
- Tasks 133 and 144 are resolved but await a human verify click, which is
  cookie-auth only and stays that way.
