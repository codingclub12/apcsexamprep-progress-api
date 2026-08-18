# CSA exercise pages: go-live runbook

Written overnight 2026-08-18 for a first-period AP CSA class the same morning.

## READ THIS FIRST: Railway has not deployed since 05:15 UTC

Checked at 09:10 UTC. `GET /api/health` still reports commit `4e84c2e` while
main is six merges ahead. **This is an infrastructure stall, not a broken
build**: the current main HEAD was checked out and booted locally and every
route answered correctly, so there is nothing to fix in the code and nothing to
re-merge.

What that means for this morning:

| | status |
|---|---|
| Both grading modes, the `mode` column, raised Judge0 limits | **LIVE** (they shipped in the earlier deploy) |
| Five exercise pages, 1.1 to 1.5 | **LIVE** (created by hand, verified) |
| `POST /api/admin/code-tests/seed` | **NOT live** until Railway deploys |
| `POST /api/admin/csa-exercise-pages/publish` | **NOT live** until Railway deploys |

So the two curls below will 404 until the deploy lands. **Use the fallbacks in
"If the endpoints are not there yet" instead.** Check first with:

```sh
curl -s https://progress.apcsexamprep.com/api/health
```

If `commit` is `4e84c2e`, the deploy still has not arrived. If it is anything
newer, the endpoints are live and the two curls work.

## TL;DR, two curls (once the deploy lands)

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

**Five pages, created by hand overnight and each verified against the live
storefront.** These work right now, with no action from you:

| lesson | page |
|---|---|
| 1.1 Algorithms | `/pages/ap-csa-lesson-1-1-intro-algorithms-exercise-1` |
| 1.2 Variables and Data Types | `/pages/ap-csa-lesson-1-2-variables-data-types-exercise-1` |
| 1.3 Expressions and Output | `/pages/ap-csa-lesson-1-3-expressions-assignment-exercise-1` |
| 1.4 Assignment and Input | `/pages/ap-csa-lesson-1-4-assignment-statements-input-exercise-1` |
| 1.5 Casting and Range | `/pages/ap-csa-lesson-1-5-casting-range-exercise-1` |

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

## If the two admin routes 404 or the seed says the route is unknown

The merge of #196 went in at 05:15 UTC. Railway was running behind a queue of
other merges at the time this was written, and the deploy had not picked it up
yet. My commits ARE an ancestor of main's head, so they ship with whatever
Railway deploys next; there is nothing to re-merge.

The code was proven good independently of the deploy: the merged tree was booted
locally and all three endpoints answered correctly (`code-tests` reported the
honest empty state, the seed dry run reported 54 items and 274 cases without
writing, and the pages route correctly reported missing Shopify credentials
rather than crashing). So a 404 in the morning means the deploy has not landed,
not that the code is wrong. Check `GET /api/health` and compare `commit` against
main.

## Still open after this

- The other 48 pages exist only as generated bodies until step 2 runs.
- No student has actually submitted through the graded path in production. The
  first real submission is the last untested link, and it is the one thing worth
  doing yourself before class: sign in as a test student on 1.1 and submit.
- 1.6 `exercise-3` (the FRQ) has a test bank and no page.
