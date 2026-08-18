# CSA exercise pages: go-live runbook

Written overnight 2026-08-18 for a first-period AP CSA class the same morning.

## READ THIS FIRST: caught up. Run the two curls.

Checked 15:06 UTC. `GET /api/health` reports `97ca238`, which is exactly
`origin/main`. The stall cleared and the queue drained; there is nothing
undeployed.

The two curls below are still the job, and they work. Unit 1 is complete and
live. `97ca238` contains everything `26fe1e3` did, so the endpoints and
`lib/csa-code-modes.js` that make program and driver mode grading work are all
present, plus everything that was stuck behind the stall.

The deploy stall that dominated this page for most of the morning is resolved
and recorded below as history, not as a live problem. The drift check caught
it, held failing through it, and went green on its own when the deploy landed.

| | status |
|---|---|
| Both grading modes, the `mode` column, raised Judge0 limits | **LIVE** |
| Fifteen exercise pages, all of Unit 1 | **LIVE** (created by hand, each verified) |
| `POST /api/admin/code-tests/seed` | **LIVE** |
| `POST /api/admin/csa-exercise-pages/publish` | **LIVE** |

The fallbacks further down are kept, but they are now insurance rather than the
plan. The one thing still genuinely unknown is whether the Railway Shopify token
carries `write_content`; see "If step 2 refuses with a scope error".

This opening section has now carried four different leads: "the endpoints are
missing", then "the deploy landed", then "the pipeline is a hard finding", and
now "caught up". Every one of those was true when written. That
is the point rather than an embarrassment, and it is the habit worth copying:
check `/api/health`, compare it to `origin/main`, and believe the comparison
over any document about live state, this one included.

## TL;DR, two curls

Both need `ADMIN_KEY` (the header key, not the dashboard cookie: these are
mutations). Run them in this order.

```sh
# 1. Load the hidden test bank. Without this every submission 404s.
curl -X POST https://progress.apcsexamprep.com/api/admin/code-tests/seed \
  -H "x-admin-key: $ADMIN_KEY"

# 2. Create the remaining exercise pages on the storefront.
curl -X POST https://progress.apcsexamprep.com/api/admin/csa-exercise-pages/publish \
  -H "x-admin-key: $ADMIN_KEY"
```

Then check both from a browser (you are signed in, and GET only needs the
cookie):

- `https://progress.apcsexamprep.com/api/admin/code-tests`
- `https://progress.apcsexamprep.com/api/admin/csa-exercise-pages`

The first should say `seeded: true` with 53 `ap-csa ... exercise-1` entries. The
second should say `missing: 0`.

**Add `-d '{"dry_run":true}' -H 'Content-Type: application/json'` to either one
to see what it would do without doing it.** Both are idempotent, so a second run
is safe.

## What is already live, before you touch anything

**All fifteen Unit 1 pages, created by hand overnight and each verified against
the live storefront.** These work right now, with no action from you. Unit 1 is
the pilot unit and it is complete, so a first period class has a full unit of
graded exercises even if step 2 below never runs:

| lesson | handle under `/pages/` |
|---|---|
| 1.1 Algorithms | `ap-csa-lesson-1-1-intro-algorithms-exercise-1` |
| 1.2 Variables and Data Types | `ap-csa-lesson-1-2-variables-data-types-exercise-1` |
| 1.3 Expressions and Output | `ap-csa-lesson-1-3-expressions-assignment-exercise-1` |
| 1.4 Assignment and Input | `ap-csa-lesson-1-4-assignment-statements-input-exercise-1` |
| 1.5 Casting and Range | `ap-csa-lesson-1-5-casting-range-exercise-1` |
| 1.6 Compound Assignment | `ap-csa-lesson-1-6-compound-assignment-exercise-1` |
| 1.7 API and Libraries | `ap-csa-lesson-1-7-api-libraries-exercise-1` |
| 1.8 Documentation and Comments | `ap-csa-lesson-1-8-documentation-comments-exercise-1` |
| 1.9 Method Signatures | `ap-csa-lesson-1-9-method-signatures-exercise-1` |
| 1.10 Calling Class Methods | `ap-csa-lesson-1-10-calling-class-methods-exercise-1` |
| 1.11 Math Class | `ap-csa-lesson-1-11-math-class-exercise-1` |
| 1.12 Objects and Instances | `ap-csa-lesson-1-12-objects-instances-exercise-1` |
| 1.13 Object Creation | `ap-csa-lesson-1-13-object-creation-exercise-1` |
| 1.14 Calling Instance Methods | `ap-csa-lesson-1-14-calling-instance-methods-exercise-1` |
| 1.15 String Manipulation | `ap-csa-lesson-1-15-string-manipulation-exercise-1` |

Verified on each: the routing attributes the grade call reads, exactly one h1,
the editor and both endpoints present, the starter in the editor matching the
authored source after entity decoding, the `&lt;` entities inside the textareas
still encoded, the right number of sample cases, and **no hidden case, reference
solution or grading harness anywhere in the body**.

On 1.1, 1.2 and 1.3 the loop was also proven end to end: posting the reference
solution to the live `/api/judge0/run` returned exactly the expected output.

The code is live too, as of the merge of #196: both grading modes, the `mode`
column, the raised Judge0 ceilings, and the two admin routes above.

The publisher **skips handles that already exist**, so running it will not touch
any of these fifteen.

## Fallbacks, if an endpoint ever refuses

Both endpoints are live and the deploy is caught up, so these are insurance
rather than a plan. They are the original paths and neither needs a deploy.

**Seed the bank (this is the one that matters).** Open a shell on the Railway
service and run:

```sh
node scripts/seed-code-tests.js --update
```

That is exactly what the endpoint would have called. It is idempotent and it
prunes stale cases. Once it finishes, all fifteen live pages grade immediately.

**More pages.** Build the validated Matrixify sheet and import it:

```sh
node scripts/csa-exercise-pages-csv.js out.csv --live pages.json
```

MERGE mode, QUOTE_ALL, utf-8-sig, one import at a time. `--live pages.json`
takes a fresh Admin API pages dump and aborts if any handle already exists, so
it cannot overwrite the fifteen that are already there. You can also pass
`--unit unit-1` to import just Unit 1 first.

If you only have five minutes, do the seed and skip the extra pages. Fifteen
working graded exercises beat fifty ungraded ones.

## If step 2 refuses with a scope error

That is the one thing I could not test from here, and it is a real possibility.

`SHOPIFY_ADMIN_TOKEN` in Railway was added for the analytics connector, which
only needs read access. Creating pages needs `write_content`. If the token does
not have it, the publish returns `ok: false, refused: "scope"` and names the
scope. It writes nothing, so there is no mess to clean up.

Two ways out:

1. Grant `write_content` to the custom app in Shopify admin, then re-run. This
   is a one-time fix and the fastest path.
2. Fall back to the Matrixify sheet, which is built and validated:
   `node scripts/csa-exercise-pages-csv.js out.csv` then import with MERGE mode,
   QUOTE_ALL, utf-8-sig, one import at a time.

Either way, the fifteen pages above are already live, which is all of Unit 1,
1.1 through 1.15. They become gradeable the moment step 1 runs, whatever
happens with step 2.

## What a student sees before and after the seed

The two steps are independent, and the page degrades honestly between them.

| | Run button | Submit button |
|---|---|---|
| pages live, bank NOT seeded | works fully | "This exercise is not graded yet. Your work is safe in the editor." |
| pages live, bank seeded | works fully | graded against hidden cases, lands in the gradebook |

So if you only get one curl done, do the seed. A page that runs but does not
grade is a usable lesson; a grade that silently fails is not.

## Order, and why it is not cosmetic

Seed first, publish second. Publishing first gives you pages that look finished
and grade nothing, for as long as the gap lasts. Nothing breaks permanently
either way, but the gap is visible to students and the ordering costs nothing to
get right.

## What to watch during class

- Judge0 is now 500 runs/hour per IP, up from 40. A class of 30 behind one
  school NAT was the thing that would have bitten. Grading is partitioned per
  student, so it has its own 500.
- If the whole runner is at capacity, students see "The code runner is at
  capacity right now. This is not something you did." That message means the
  global 3000/hour backstop tripped, which should not happen with one class and
  is worth telling me about if it does.
- Nothing records a zero on any failure path. A 429, a 404 and a runner outage
  all record nothing at all, so a bad ten minutes cannot damage a grade.

## The deploy stall: what happened, and how it ended

**Resolved 15:06 UTC.** Production serves `97ca238`, equal to `origin/main`.
Nothing is undeployed. What follows is the record, kept because the same shape
recurred twice in one night and will recur again.

The shape: `26fe1e3` served from about 09:45, and the deploy had been behind
since `fb98aa3` merged at roughly 09:15. It stayed behind for close to five
hours while merges stacked up: `fb98aa3`, `ffe06b9`, `9297e11`, `e965049`,
`80960c1`, then `a8090e3`, `4d242e6` and `97ca238` on top. Throughout, the API
answered 200 and the class path was entirely inside `26fe1e3`, so from the
outside nothing looked wrong. Everything stuck in the queue was documentation,
the npm cache fix in `nixpacks.toml`, the drift workflow and blog changes.

That is the whole hazard in one sentence: a stalled deploy is invisible from
the storefront, and it only costs anything on the day something that matters is
in the queue. It was worth treating as a production problem while it was open
even though nothing about first period was ever blocked.

### The drift check detected it, held, and cleared itself

Worth stating plainly, because it was wrong in both directions earlier on this
page: the drift workflow is **not** undeployed. It runs on GitHub Actions from
`main`, on GitHub's own runners, with no dependency on Railway, so it went live
the moment `ffe06b9` merged. The problem was never that it could not run; it
was that its grace clause made it report success.

The full run history is the cleanest evidence that `80960c1` did what it
claimed, so leave all eight runs on the record:

| run | time UTC | on | result | |
|---|---|---|---|---|
| 1 | 10:15 | `9297e11` | success | false green, old clock |
| 2 | 10:51 | `e965049` | success | false green, old clock |
| 3 | 11:13 | `80960c1` | **failure** | first run of the fixed clock |
| 4 | 11:46 | `80960c1` | **failure** | |
| 5 | 12:18 | `80960c1` | **failure** | |
| 6 | 13:14 | `a8090e3` | **failure** | |
| 7 | 14:02 | `a8090e3` | **failure** | |
| 8 | 14:57 | `97ca238` | success | genuine, deploy caught up |

Run 4's output, as an example of what the failures said:

```
grace     : 30m
undeployed since: fb98aa3 (151m)
production is serving 26fe1e3 (behind) and has been behind for 151m.
main is 80960c1, merged 46m ago.
```

Note the last line: under the old clock, "merged 46m ago" was the number being
compared to the 30 minute grace, and 46 would have passed only by luck. The 151
is the honest number.

Three things this proves that an offline test could not. It fired on the first
scheduled run after merging. It stayed failing across five consecutive runs and
across two merges to `main`, which is exactly where the old clock reset itself.
And it went green on its own at 14:57 with nobody touching it, so the failures
were tracking the deploy rather than latching. Detect, hold, self-clear.

The bug it had until `80960c1` was in the grace clause, which measured the age
of **main's head** rather than how long the deploy had been behind:

```
main head : e965049  (merged 13m ago)
serving   : 26fe1e3
Behind by design: main is only 13m old and a build takes a few minutes.
```

Every merge reset that clock. On a night like this one, with something landing
every twenty to forty minutes, the head is essentially never older than the
thirty minute grace, so the check could only ever fire during a quiet spell and
never during a busy stall. Exactly backwards, and worse than no monitor, because
a green check reads as "in sync".

The fix measures from the oldest undeployed commit on `main`, a clock that
starts when the deploy first falls behind and that later merges cannot reset.
Verified twice: first offline, by running both versions against the same real
state (old script exits 0 with "main is only 0m old", new one exits 1 with
"behind for 99m"), and then in production at 11:46, quoted above.

### What is still worth doing, and what to do next time

The stall is over, but the cause was never established from inside a session
and the drift check only ever reports that a deploy did not land, never why.
Two things remain, both needing the Railway dashboard:

1. **Turn on Railway's deploy failure notifications.** This is the one that
   matters and it is the only unfinished item from the whole episode. Two
   stalls in one night, one of them four hours long, went unnoticed because
   nothing was watching. The drift check is half the answer; Railway is the
   half that says why.
2. **Look back at the Deployments tab for the 09:15 to 15:00 window** while it
   is still in retention, and write down which of the two it was. If a build
   **failed**, the line to look for is `prebuild-install warn install Request
   timed out` followed by a node-gyp Python error, which is the documented
   failure mode here and what the `cacheDirectories` change in `nixpacks.toml`
   addresses; note that fix was itself stuck in the queue it would have
   unblocked, and has now shipped. If instead there were no builds at all in
   that window, the fault was the GitHub integration rather than the build, and
   that is a completely different fix.

Next time this happens, the runbook procedure is: `curl /api/health`, compare
against `origin/main`, and check the Deploy drift run history. If the check is
failing, believe it. It is now proven to detect, hold and self-clear, so a red
drift check means the deploy is genuinely behind, and a green one after a red
streak means it caught up on its own.

## Still open after this

- Units 2, 3 and 4 (38 pages) exist only as generated bodies until step 2 runs.
  Unit 1 is complete and live, so step 2 is a widening, not a rescue.
- No student has actually submitted through the graded path in production. The
  first real submission is the last untested link, and it is the one thing worth
  doing yourself before class: sign in as a test student on 1.1 and submit.
- 1.6 `exercise-3` (the FRQ) has a test bank and no page.
- Railway deploy failure notifications are still off. The stall resolved on its
  own, so this is no longer urgent, but it is the one durable fix the whole
  episode argues for and the only item here that is about the pipeline rather
  than content. See the section above.

**Closed:** the deploy stall. Production served `26fe1e3` from 09:45 and was
behind from 09:15; as of 15:06 it serves `97ca238`, equal to `origin/main`,
with nothing queued.
