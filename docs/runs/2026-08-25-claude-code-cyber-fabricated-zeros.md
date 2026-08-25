# Clearing the fabricated Cyber zeros: proven, deployed, not yet run

Date: 2026-08-25
Agent: Claude Code
Repo: apcsexamprep-progress-api
PRs: #313 (merged, deployed as ebd517f)

## The state this found

Nine AP Cyber Unit 1 grades are zeros no student earned. They come from
apcs-tracker.js before theme PR #64: it decided a non-quiz activity was
complete, asked activityScorePct for a score, and that function found no score
UI at all and returned `Math.round(0 / total * 100)` instead of null. The
tracker posted `completed: true, score: 0`. Full marks stored as a zero, and it
counts against the class average.

The columns are 1.3, 1.4 and 1.5, each of exercise-1, exercise-2 and lab.

`scripts/clear-cyber-fabricated-zeros.js` was written on 2026-08-21 to fix this
and **had never been executed anywhere**. It sat unrun for four days for a
mundane reason: it needs the production SQLite file, which means shell access on
the Railway container, which no agent session has.

## What changed

**The operation is now tested.** `npm run smoke:clearzeros` builds a database
holding all six cases the script must tell apart and runs the real script
against it:

| case | fixture | expected |
|---|---|---|
| A | fabricated zero before the cutoff, with a progress row | reset |
| B | a zero recorded AFTER the cutoff (can be real) | untouched |
| C | a row already carrying `score_reset_at` | skipped |
| D | a ledger row with no progress row | nothing to reset |
| E | a zero on a lesson outside the nine columns | untouched |
| F | a real nonzero score before the cutoff | untouched |

All six behave as documented, nothing is deleted from `score_events`, and a
second apply is a no-op. That is worth stating plainly: before this, the only
thing between a careful comment block and a wrong regrade was whether the SQL
did what the comment said.

**There is now a door that does not need a shell.**

- `GET /api/admin/cyber-zeros` is the dry run. Read only, so the dashboard
  cookie reaches it and a human can see which columns and how many students
  before anything is written.
- `POST /api/admin/cyber-zeros/clear` is the mutation. `requireAdmin` already
  forces the `x-admin-key` header for non-safe methods, and it additionally
  refuses to write without `{confirm: true}`.

The route and the CLI share ONE implementation, `clearFabricatedZeros()`. A
second copy of that UPDATE in a handler is how the two drift, and a drifted
regrade is invisible until a teacher notices a wrong number weeks later.

## Two things worth remembering

**The cookie must never authorize the write.** It was tempting to make the apply
clickable from the admin UI, which is what was originally asked for. The router
accepts the session cookie for GET and HEAD only, and that plus `SameSite=Strict`
is the CSRF closure on every admin mutation. A route that edits grades is the
last place to make an exception, so the apply takes the header key instead.

**A test that passes for the wrong reason is worse than no test on an auth
boundary.** The first draft of `smoke:cyberzeros` sent `cookie: apcse_admin=anything`
and asserted a 403. That would have been refused for being bogus and proved
nothing about a legitimately signed-in operator. It now mints a genuinely valid,
correctly signed, unexpired cookie and asserts that cookie CAN read and CANNOT
write.

**A schema trap.** `progress.id` is a `TEXT PRIMARY KEY`, and SQLite permits NULL
in a non-INTEGER primary key. A fixture that omits the id inserts NULL, joins
correctly on every other column, and returns `progress_id: null`, which makes the
script look like it cannot find progress rows when it finds them fine. The suite
pins the correct shape now.

## Still open, and why

**Nothing has been cleared.** The endpoint is live and this session cannot call
it: `ADMIN_KEY` is not in the Claude Code environment, and the route 403s without
it. That is the fail-closed posture working, not a gap to code around.

Two calls finish it, in this order:

```
curl -sS https://progress.apcsexamprep.com/api/admin/cyber-zeros \
  -H "x-admin-key: $ADMIN_KEY"          # read the numbers first

curl -sS -X POST https://progress.apcsexamprep.com/api/admin/cyber-zeros/clear \
  -H "x-admin-key: $ADMIN_KEY" -H 'Content-Type: application/json' \
  -d '{"confirm":true}'
```

The GET answers a question nobody has answered yet: how many students are
actually affected across the nine columns.

**Putting `ADMIN_KEY` into the agent environment would unblock this permanently
and is not obviously the right trade.** That one key is full read and write
across every admin route, and an environment variable can be echoed into a
transcript, which has happened here before. A key scoped to a single operation
is a design change, not a config tweak.

**Separately: Cyber 1.2 is a different problem.** Nothing was ever recorded for
Exercises 1 and 2 there, so there is no bad row to clear and those students have
to redo the work. No script helps.
