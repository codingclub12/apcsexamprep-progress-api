# 2026-08-14 - dispatch queue and session protocol (Phase 1.2 and half of 2.1)

Agent: Claude Code. Branch: `claude/auto-dispatch-vaw0hu`, off `main`. PR only.

## The policy, in Tanner's words

> Anything double checked by you and doesn't make major large multi page
> changes, or done overnight with a morning check.

Encoded rather than left as prose. Two halves, and they are separate on purpose.

## 1. The size ceiling (the "not large multi-page" half)

`lib/command-router.js` already had `autoDispatchEligibility` and a `NEVER_AUTO`
list covering money, deletes, migrations, student data, and anything flagged "a
human must check". It had no size rule at all, so an `xl` rewrite was as
dispatchable as a one-line index.

Added `AUTO_DISPATCH_MAX_SIZES = ['xs', 's', 'm']`. `l` and `xl` are the sizes
that mean a large multi-file diff and they stay hand-driven. An unset size counts
as too big: "nobody estimated this" is not evidence that it is small.

Extended the existing function rather than writing a second policy engine, which
the brief explicitly warns against.

**The existing suite caught a mistake in the first version of this.** The gate
was placed before the `NEVER_AUTO` text rules, so a pricing task with no size was
refused for "no size set" instead of "touches money". `smoke:command` criterion
21 asserts that ordering, and it went red. The gate now sits after the text
rules, so the more important reason is the one reported:

```
money task, no size -> On the never-auto-merge list: touches money, pricing, or discounts.
l-size plain task   -> size=l is a large multi-file change, and those stay hand-driven.
s-size plain task   -> Repo-reachable, open, unblocked, size=s, and off the never-auto-merge list.
```

## 2. The dispatch queue (the consumer Gap C is about)

`auto_dispatch` has been in the schema since Phase 1 and nothing read it. Now
`lib/command-dispatch.js` does, and `GET /api/command/dispatch-queue` serves it.

Two facts must line up, and conflating them is how a queue starts handing out
things nobody meant it to:

- **Capability** - the router says this kind of task could be dispatched.
- **Consent** - the `auto_dispatch` column says `eligible`, which is Tanner
  ticking the box on that particular task.

**Consent is stored; capability is recomputed on every read.** That mirrors the
gradebook rule already in `CLAUDE.md`: `passed` and grade-of-record are
recomputed against the class's current `mastery_threshold` rather than trusting
the stored snapshot, so a settings change applies retroactively with zero
migration. Same shape here. Narrowing the size ceiling or adding a `NEVER_AUTO`
rule retires every stale tick on the next run, and no one has to go hunting for
boxes ticked under the old rules.

The queue also reports what it did NOT pick and why, including the case that
matters: a tick that has gone stale because the task changed after it was ticked.

## 3. The overnight workflow, and what it deliberately does not do

`.github/workflows/auto-dispatch.yml` runs at 06:00 UTC, which is 02:00 US
Eastern in summer. Eastern because `lib/command-router.js` already hardcodes it
as "the only clock that matters here" for time-of-day weighting, so that is a
read of the repo rather than a guess about where Tanner lives.

**It reads the queue and reports. It does not execute anything.** No claim, no
session, no merge. The run summary says what it would have handed out, what the
cap held back, and which ticks have gone stale.

That is the honest half to ship first. A queue nobody has watched is not one to
let run unattended, and the brief already applies this reasoning one level up:
Phase 3 waits on Phase 2 running clean for a fortnight. Two weeks of "here is
what I would have dispatched" is exactly the evidence needed before wiring the
execute half, and it costs nothing to collect.

Going live is a repository variable (`DISPATCH_EXECUTE`) plus a step that does
not exist yet. Until that step is written, the workflow cannot execute, which is
a property of the file rather than a promise in a comment.

## 4. Session protocol (Phase 1.2)

`CLAUDE.md` now opens with the session loop rather than a bare digest URL: open
with `apcs digest`, claim with `--lock`, close with `apcs done --artifact`, and
`verified` is not yours to set. Plus a section stating the dispatch policy, so
the rule that decides what runs unattended is readable in the file every session
already loads.

## Evidence

```
npm run smoke:dispatch    31 passed, 0 failed   (new)
all 53 offline suites     pass
```

`smoke/command-dispatch.js` covers: consent without capability, capability
without consent, a tick going stale by size change and by a new dependency, the
per-run cap reporting rather than silently truncating, an in-flight task not
being handed out twice, and the queue being read-only (no state change, no claim
taken, no credential in the body, 401 without auth).

**One of its own assertions was wrong first.** The dependency fixture posted
`blocked_by` where the route takes `blocks_task_id`, got a silent 404, and then
failed for a reason unrelated to the dispatcher. Fixed, and the suite now asserts
the fixture succeeded before asserting what it should cause. Same class of bug as
the verifier's mojibake section: a test that cannot fail for the right reason.

## Not done

- **The execute half.** By design, see section 3.
- **Nothing ran against production.** No `TODO_KEY` in this session, and the
  network policy denies `progress.apcsexamprep.com` outright (the proxy answers
  403 to CONNECT). The workflow's first real run is the first time it will touch
  the live queue.
- **The workflow needs a `TODO_KEY` secret.** Without it the job skips with a
  message rather than failing, the same posture `smoke.yml` takes for its
  teacher credentials.
