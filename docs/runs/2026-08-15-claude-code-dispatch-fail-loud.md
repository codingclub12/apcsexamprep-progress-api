# 2026-08-15 - the overnight check fails loudly

Agent: Claude Code. Branch: `claude/dispatch-fail-loud-vaw0hu`, off `main`.

## The bug, in my own file

The first scheduled run of `Overnight dispatch check` fired at 06:22 UTC on
2026-08-15, unprompted, and reported **success**. It had done nothing. The
`TODO_KEY` secret was not yet set, and the missing-secret branch wrote a note
into the summary and then `exit 0`.

From the job log:

```
env:
  TODO_KEY:
  BASE: https://progress.apcsexamprep.com
```

Step 4, "Report what it would have dispatched", was skipped because no
`queue.json` existed. Conclusion: `success`.

That is the exact failure this whole program is about. A nightly job that
quietly achieves nothing looks identical, every morning, to one that worked. I
spent this session pulling that pattern out of other people's code - a mojibake
check that could not fire, a smoke section that asserted nothing about the thing
in its title - and then wrote it into the workflow myself, modelled on
`smoke.yml`, which skips gracefully because its teacher-credential check is an
optional extra. Here the secret is the entire point of the job.

## The fix

Three paths now exit non-zero, each with a `::error` annotation and a summary
block naming what to do:

1. **`TODO_KEY` unset** - "NOT CONFIGURED", and the summary says it must match
   the Railway environment variable character for character or the read 401s.
2. **The endpoint is unreachable or answers 4xx/5xx** - already failed, unchanged.
3. **HTTP 200 carrying a body that is not a queue** - new. A 200 is not proof of
   a usable body. The shape is validated before the report step trusts it, so a
   truncated response or an application error page fails here with the body
   attached rather than rendering an empty table that reads as "quiet night".

## Evidence

The step's `run:` script was extracted from the YAML and executed directly, in
each case:

```
CASE 1  secret missing              exit 1   "### Overnight dispatch check: NOT CONFIGURED"
CASE 2  endpoint 404                exit 1   "queue read failed with HTTP 404"
CASE 2a HTTP 200, HTML body         exit 1   "queue.json is not valid JSON: Unexpected token '<'"
CASE 2b HTTP 200, wrong-shape JSON  exit 1   "missing expected keys: generated_at, dispatch, ..."
CASE 3  a real queue                exit 0   "queue shape ok: 0 to dispatch, 0 eligible"
```

Case 3 matters as much as the others: a fix that turns everything red is
indistinguishable from a broken workflow.

## Incidental, and worth knowing

`main` moved twice while this was open, and PR #144 added `intro-java` to
`lib/command-write.js` COURSES. **The coverage guard from Phase 0.1 worked
unprompted.** `intro-java` could not land without a row in `CONTENT_COVERAGE`,
and it has one. Greenfoot moved from `exempt` to `covered` in the same change,
which is the exemption correctly retiring the moment the track became active -
the reason the table records a reason rather than just a list.

`npm run smoke:hazards` is 134 passed, 0 failed on current main, up from 129,
the extra assertions coming from the new course being iterated.

One question for Tanner, not a defect: `greenfoot` and `intro-java` currently
resolve to the SAME block, whose body says "Course slug is `intro-java`". That
is right if Greenfoot is the Intro to Java track under another name, and wrong
if they are two courses sharing a rulebook by accident. I did not touch it,
since #144 is not mine and the intent is not mine to guess.
