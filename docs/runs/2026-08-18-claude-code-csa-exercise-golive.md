# CSA exercise pages: go-live runbook

Written overnight 2026-08-18 for a first-period AP CSA class the same morning.

## READ THIS FIRST: the deploy landed. Run the two curls.

The stall cleared. Re-checked at 09:54 UTC: `GET /api/health` reports `26fe1e3`,
and that commit was inspected directly rather than assumed. It contains
`routes/admin.js` with both `/code-tests/seed` and `/csa-exercise-pages/publish`,
and it contains `lib/csa-code-modes.js`, which is what makes program and driver
mode grading work at all.

Everything still queued behind the deploy is documentation plus the build-cache
fix and the drift workflow. None of it is needed for a class.

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

## The deploy queue is still slow, and that is now a separate problem

`26fe1e3` is serving. Main is `ffe06b9`, merged around 09:37 UTC and polled every
twenty seconds until 09:54: not deployed. That is well past the thirty minute
grace the drift check allows, so the scheduled check would now be failing, which
is exactly what it was built to do.

Nothing in that gap blocks a class. `ffe06b9` and `fb98aa3` are this runbook,
the page verification notes, the npm cache fix in `nixpacks.toml` and the drift
workflow itself. The irony is worth naming: the fix that should stop deploys
from silently dying cannot land until a deploy succeeds.

What is worth doing when you are awake, in order:

1. Railway Deployments tab, for the window 05:15 to now. If a build **failed**,
   the log line to look for is `prebuild-install warn install Request timed out`
   followed by a node-gyp Python error. That is the documented failure mode here
   and the `cacheDirectories` change in `nixpacks.toml` is the fix for it.
2. Turn on Railway's deploy failure notifications. Four hours of invisible
   failure happened because nothing was watching, and the drift workflow is only
   half the answer: it tells you the deploy did not land, while Railway can tell
   you why.

## Still open after this

- Units 2, 3 and 4 (38 pages) exist only as generated bodies until step 2 runs.
  Unit 1 is complete and live, so step 2 is a widening, not a rescue.
- No student has actually submitted through the graded path in production. The
  first real submission is the last untested link, and it is the one thing worth
  doing yourself before class: sign in as a test student on 1.1 and submit.
- 1.6 `exercise-3` (the FRQ) has a test bank and no page.
- `ffe06b9` has not deployed. See the section above.
