# CSA exercise pages: go-live runbook

Written overnight 2026-08-18 for a first-period AP CSA class the same morning.

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

- All the code. Both grading modes, the `mode` column, the raised Judge0
  ceilings, and both admin routes above.
- **Three pages**, created by hand overnight and verified end to end:
  - `/pages/ap-csa-lesson-1-1-intro-algorithms-exercise-1`
  - `/pages/ap-csa-lesson-1-2-variables-data-types-exercise-1`
  - `/pages/ap-csa-lesson-1-3-expressions-assignment-exercise-1`

1.1 was checked properly: the starter in the editor matches the authored source
byte for byte after entity decoding, no hidden case is on the page, and posting
the reference solution to the live `/api/judge0/run` returned exactly the
expected output. The Run loop works right now.

The publisher **skips handles that already exist**, so running it will not touch
those three.

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

Either way, the three pages above are already live and gradeable, which covers
1.1 to 1.3 for first period.

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

## Still open after this

- The other 50 pages exist only as generated bodies until step 2 runs.
- No student has actually submitted through the graded path in production. The
  first real submission is the last untested link, and it is the one thing worth
  doing yourself before class: sign in as a test student on 1.1 and submit.
- 1.6 `exercise-3` (the FRQ) has a test bank and no page.
