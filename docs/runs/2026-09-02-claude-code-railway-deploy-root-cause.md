# The deploy alarm was green for a month because the deploy never ran

Date: 2026-09-02
Agent: Claude Code
Board: task 142, reopened and closed with a real artifact

## What was actually wrong

`.github/workflows/railway-deploy.yml` was written to end this exact problem: a
click of Redeploy, on a schedule and on every merge. It has a deliberate safety
property, stated in its own header:

> Until RAILWAY_TOKEN is set the job is skipped rather than failed. A workflow
> that goes red on every push because a human has not done a setup step is a
> workflow people mute, and a muted deploy alarm is how a 77-minute stall goes
> unnoticed in the first place.

The setup step was never done. So the workflow skipped, **green**, on every
merge for its entire life. Railway's own GitHub integration stayed the only
deploy path, and that integration is the thing that stalls.

The tell is in the run durations. A build cannot happen in twelve seconds:

```
run 59-70   10-12 seconds each   token gate skipping, no build
run 71      12 seconds  FAILURE  RAILWAY_SERVICE not set
run 72      11 minutes  FAILURE  during setup
run 74      9 minutes   SUCCESS  first real deploy
run 75      41s deploy  SUCCESS  job log shows every step executing
```

## The fix

Tanner set both, which is what the workflow header asked for:

- `RAILWAY_TOKEN`, a repository **secret**, a Railway *project* token
- `RAILWAY_SERVICE`, a repository **variable**, the service name

`RAILWAY_SERVICE` is as required as the token and is easy to miss because it is
a variable rather than a secret. Run 71 failed in twelve seconds on precisely
that guard.

## What this cost, and the lesson worth keeping

Task 142 was closed **twice** on a false premise, once by a human and once by
me. Both closures used the same artifact: `/api/health` reporting the same
commit as `main`.

That artifact answers "is the drift over right now". It does not answer "was
anything fixed". On both occasions nothing had been changed on Railway; the
next build from its own integration simply happened to succeed, and the drift
ended on its own. Closing on that reading left the real defect in place, which
is why it came back a third time on 2026-08-31, 53 minutes and 7 commits behind.

Two rules fall out of it:

1. **A green workflow run is not evidence when the workflow is designed to pass
   while skipping.** The job log is. Six steps executing, `Deploy` running for
   41 seconds, is a deploy; a twelve second green run is a skip wearing the same
   colour. This is the same failure shape as the gradebook defect that opened
   this whole thread: a page that renders, an API that validates, and a number
   that is wrong, with nothing anywhere reporting a failure.
2. **"It cleared on its own" is a description, not a diagnosis.** A symptom
   ending is the weakest possible evidence that a cause was addressed, and it is
   exactly the evidence most likely to be available.

`docs/where-jarvis-lives.md` and the four rules in CLAUDE.md already say an
agent report is not evidence and an artifact is. The gap this exposes is that an
artifact can be honest and still answer the wrong question.

## Still open

- Task 141, the theme deploy recipe: the connected branch is 40 commits ahead of
  `main`, so the documented fast-forward would rewind the live theme. Untouched.
- The Railway integration's own stalling is not fixed and probably never will be.
  It is now routed around rather than relied on, which is the point of the
  workflow.
