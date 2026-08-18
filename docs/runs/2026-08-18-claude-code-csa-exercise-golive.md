# CSA exercise pages: go-live runbook

Written overnight 2026-08-18 for a first-period AP CSA class the same morning.

## READ THIS FIRST: class is fine. The deploy pipeline is not.

Two separate facts, and they must not be collapsed into one.

**Class is fine.** `GET /api/health` reports `26fe1e3`, and that commit was
inspected directly rather than assumed. It contains `routes/admin.js` with both
`/code-tests/seed` and `/csa-exercise-pages/publish`, and it contains
`lib/csa-code-modes.js`, which is what makes program and driver mode grading
work at all. The two curls below run against `26fe1e3` and work. Unit 1 is
complete and live. Nothing about first period is blocked.

**The deploy pipeline is a hard finding, not a note.** As of 11:48 UTC, no
successful deploy has landed since roughly 09:15. That is two and a half hours
and five merges, and this is the second stall of the same shape today. It is
now a standing production problem in its own right, independent of the class:
see "The deploy pipeline has not shipped in over two hours" below, which is the
one thing on this page that needs a human.

Everything queued behind the deploy is documentation plus the build-cache fix
and the drift workflow. None of it is needed for a class, which is exactly why
this can sit broken without anyone noticing.

| | status |
|---|---|
| Both grading modes, the `mode` column, raised Judge0 limits | **LIVE** |
| Fifteen exercise pages, all of Unit 1 | **LIVE** (created by hand, each verified) |
| `POST /api/admin/code-tests/seed` | **LIVE** |
| `POST /api/admin/csa-exercise-pages/publish` | **LIVE** |

The fallbacks further down are kept, but they are now insurance rather than the
plan. The one thing still genuinely unknown is whether the Railway Shopify token
carries `write_content`; see "If step 2 refuses with a scope error".

An earlier version of this file led with a stall banner telling you the
endpoints were missing. That was true when it was written and is not true now.
The habit worth keeping is the one that caught it: check `/api/health` and
compare, rather than trusting a document about live state.

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
these five.

## If the endpoints are not there yet

Both fallbacks are the original paths and neither needs the deploy.

**Seed the bank (this is the one that matters).** Open a shell on the Railway
service and run:

```sh
node scripts/seed-code-tests.js --update
```

That is exactly what the endpoint would have called. It is idempotent and it
prunes stale cases. Once it finishes, the five live pages grade immediately.

**More pages.** Build the validated Matrixify sheet and import it:

```sh
node scripts/csa-exercise-pages-csv.js out.csv --live pages.json
```

MERGE mode, QUOTE_ALL, utf-8-sig, one import at a time. `--live pages.json`
takes a fresh Admin API pages dump and aborts if any handle already exists, so
it cannot overwrite the five that are already there. You can also pass
`--unit unit-1` to import just Unit 1 first.

If you only have five minutes, do the seed and skip the extra pages. Five
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

Either way, the five pages above are already live, which covers 1.1 to 1.5. They
become gradeable the moment step 1 runs, whatever happens with step 2.

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

## The deploy pipeline has not shipped in over two hours

**Hard finding, 11:48 UTC.** `26fe1e3` is still the serving commit and has been
since about 09:45. The deploy has been behind since `fb98aa3` merged at roughly
09:15, which the drift check now measures at **151 minutes**. Five merges are
stacked up: `fb98aa3`, `ffe06b9`, `9297e11`, `e965049`, `80960c1`.

Re-checked at 11:48 and unchanged from the 10:55 reading except that it is
fifty minutes worse. This is no longer "the queue is slow". Two and a half
hours with nothing landing, after a four hour invisible failure earlier the
same night, is a broken deploy pipeline, and it should be treated as a
production problem in its own right rather than as a footnote to a go-live that
happens not to need it.

What is NOT in doubt: the API is up and answering, `/api/health` returned 200
at 11:47, and the class path is entirely inside `26fe1e3`. The damage so far is
confined to undeployed documentation, the npm cache fix in `nixpacks.toml`, the
drift workflow and an unrelated blog change. The risk is what happens the first
time something that DOES matter is in that queue.

### The drift check is live and is now reporting this correctly

Worth stating plainly, because it was wrong in both directions earlier on this
page: the drift workflow is **not** undeployed. It runs on GitHub Actions from
`main`, on GitHub's own runners, with no dependency on Railway, so it went live
the moment `ffe06b9` merged. The problem was never that it could not run; it
was that its grace clause made it report success.

Run 4, 11:46 UTC, on `80960c1`, conclusion failure:

```
grace     : 30m
undeployed since: fb98aa3 (151m)
production is serving 26fe1e3 (behind) and has been behind for 151m.
main is 80960c1, merged 46m ago.
```

That is the fix working against real state, not a test fixture. Note the last
line: under the old clock, "merged 46m ago" was the number being compared to
the 30 minute grace, and 46 would have passed only by luck. The 151 is the
honest number.

Runs 1 and 2 (10:15 and 10:51) are the false greens. Leave them; they are the
evidence that a green check meant nothing before `80960c1`.

The bug it had until `80960c1` was in the grace clause, which measured the age
of **main's head**
rather than how long the deploy had been behind:

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

### What only a human can do here

Every remaining step needs the Railway dashboard, which no session can reach.
In order:

1. **Railway Deployments tab, window 05:15 to now.** This is the blocking one.
   If a build **failed**, the log line to look for is `prebuild-install warn
   install Request timed out` followed by a node-gyp Python error. That is the
   documented failure mode here and the `cacheDirectories` change in
   `nixpacks.toml` is the fix for it, sitting undeployed in the very queue it
   would unblock. If instead the tab shows no builds at all since 09:15, the
   problem is the GitHub integration rather than the build, and the check to
   run is whether Railway is still watching `main`.
2. **Turn on Railway's deploy failure notifications.** Four hours of invisible
   failure happened because nothing was watching, and the drift workflow is
   only half the answer: it tells you the deploy did not land, while Railway
   can tell you why.

Until step 1 happens, expect the drift check to fail every 30 minutes. That is
correct behaviour and not a second problem. It goes green on its own the moment
a deploy lands.

## Still open after this

- Units 2, 3 and 4 (38 pages) exist only as generated bodies until step 2 runs.
  Unit 1 is complete and live, so step 2 is a widening, not a rescue.
- No student has actually submitted through the graded path in production. The
  first real submission is the last untested link, and it is the one thing worth
  doing yourself before class: sign in as a test student on 1.1 and submit.
- 1.6 `exercise-3` (the FRQ) has a test bank and no page.
- **Nothing has deployed since `26fe1e3`.** Five merges are queued and the
  pipeline has been behind for over two and a half hours. This is the only item
  on this list that is a production problem rather than a content gap, and it is
  the only one that cannot be worked from a session. See the section above.
