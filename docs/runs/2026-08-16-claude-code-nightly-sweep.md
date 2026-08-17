# 2026-08-16 - Phase 2.2, the first thing that runs while nobody is awake

## What this is

`.github/workflows/nightly-sweep.yml` runs the verifier over
`needs_verification` at 08:00 UTC (03:00 US Central) and reports **what changed
since the last sweep**.

It is the first job in this system that does real work unattended. It is also
deliberately the narrowest possible version of that.

## Why a delta and not the report

The obvious build is "run the reconcile pass nightly and print it." That job
prints the same fourteen tasks every morning, and inside a week nobody reads it.
An unread green tick is precisely the failure this whole system exists to catch:
something reporting success that no one is checking.

So the morning artifact is the diff. **"Nothing changed" is one line and should
be the answer most mornings.** Anything else is worth the walk to a laptop.

What counts as a change: a task entering or leaving `needs_verification`, a task
gaining a finding or losing its last one, a bucket move, a specific signal
appearing or disappearing.

What deliberately does not: `generated_at`, ordering, and counts that follow from
the above. A timestamp that differs every run would make every morning look
eventful, which is the same wallpaper problem by another route.

## What it does NOT do

`verify-board.yml`'s header describes Phase 2.2 as "the overnight sweep that
files findings as tasks". This one does not file anything.

Reading unattended and writing unattended are different risks, and only the
first is being taken. `permissions: contents: read`, no task creation, no
dispatch, and `verified` remains cookie-auth only. Writing can come later, on
evidence, after some number of mornings that were worth reading.

## The bug caught before shipping

The first version restored the cache into `previous.json` and saved
`current.json`. `actions/cache` restores a file to the path it was **saved
from**, so `previous.json` would never have existed. Every morning would have
reported "no baseline", nothing would ever have been compared, and **the run
would have been green every single night.**

Same shape as the `| tee` bug and the duplicated severity rule: it works, it
reports success, and it does nothing.

## Testing

`smoke/board-delta.js`, 34 assertions, new.

Sections 1-7 cover the script: unchanged reports nothing changed, a bare
timestamp change is not a change, new/cleared signals and bucket moves and
arrivals and departures are all caught, no-baseline is stated rather than faked,
an unreadable PREVIOUS state degrades to no-baseline while an unreadable CURRENT
report exits 1, and a task over the per-run cap is unobserved rather than churn.

Section 8 pins the YAML, because both ways the baseline can silently stop
arriving leave the run green:

- `8.2`/`8.3` compare the cache save path against the restore path and the file
  the step actually tests for. Verified by reintroducing the bug:
  `32 passed, 2 failed`, reporting `{"save":"current.json","restore":"previous.json"}`.
- `8.4` requires `set -o pipefail`. Verified by removing it: `33 passed, 1 failed`.
- `8.9` fails if the workflow ever grants a write permission.

### End to end, against a real fake board

The step's shell was extracted from the YAML and run, so the thing tested is the
thing that ships:

```
no TODO_KEY            -> exit 1, "NOT CONFIGURED"
board unreachable      -> exit 1, "Overnight board sweep: FAILED"
first sweep            -> exit 0, "No previous sweep to compare against"
second, same board     -> exit 0, "Nothing changed"
third, page fixed      -> exit 0, "1 change", "#71 finding -> quiet",
                                  "gone: P1 2 <h1> tags (expected 1)"
```

The third case is the one that matters: a fixture page had its duplicate `<h1>`
removed between sweeps, and the sweep noticed on its own.

```
smoke:boarddelta        34 passed, 0 failed
all 62 offline suites   pass
```

## Scheduling notes

08:00 UTC sits clear of `auto-dispatch` at 06:00 and the browser smoke test at
07:00. Stacking them would drive the storefront three times in an hour and trip
its bot protection, which is the mistake `smoke.yml` already documents.

It shares a concurrency group with `verify-board.yml` on purpose - groups match
by name across workflows, so a nightly sweep and a hand-pressed reconcile can
never hit the storefront together.

`schedule` only fires from the default branch, so this does nothing until merged
and the first real run is the following morning.

## Still open

- The five old reconcile runs still carry names in their logs. Needs Tanner:
  this session's token is read-only on Actions.
- The `#71`/`#82` control dispatch, same reason.
- The brief's gate before anything EXECUTES unattended: roughly two weeks of
  mornings worth reading. Tonight is night zero.
