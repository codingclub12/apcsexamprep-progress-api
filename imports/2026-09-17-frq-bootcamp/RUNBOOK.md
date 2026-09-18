# Import runbook: repointing the FRQ Bootcamp

Two sheets. **Import the products sheet first**, and do it before anything else
in the whole FRQ repair, because it is the one that stops the storefront taking
money for a session held in April.

## What Tanner decided

2026-09-17, in his words: *"Repoint the next live session to 2027 but offer the
2026 video at $29.99 by itself. That is the current product."*

So there is one thing for sale, the recording, and the live session is an
announcement rather than an offer.

| # | file | rows | what it does |
|---|---|---|---|
| 1 | `01-frq-bootcamp-products.csv` | 4 | unpublishes the three live-session tiers, creates the recording at $29.99 |
| 2 | `02-frq-bootcamp-pages.csv` | 1 | rewrites the offer on the page |

**Products first.** If the page lands first it advertises a $29.99 recording
with no product behind it. If the products land first the page is briefly stale
and nothing is buyable that should not be, which is the right way round.

## The three tiers are UNPUBLISHED, not deleted

Every row is `MERGE` and the retired rows carry `Published: FALSE` and nothing
else. Deleting a product breaks the order history of everybody who bought one,
and unpublishing is reversible in one click if you change your mind.

Today those three are live and purchasable at $49.99, $69.99 and $109.99, for a
Zoom call on 16 April 2026.

## Step 1: the products

Matrixify, Products sheet, MERGE. Expected: **4 rows, 0 failed.**

Then confirm, and this is the check that matters:

```
for p in ap-csa-frq-bootcamp-basic ap-csa-frq-bootcamp-standard ap-csa-frq-bootcamp-premium; do
  curl -sS -o /dev/null -w "%{http_code} $p\n" "https://www.apcsexamprep.com/products/$p"
done
curl -sS -o /dev/null -w "%{http_code} recording\n" \
  "https://www.apcsexamprep.com/products/ap-csa-frq-bootcamp-2026-recording"
```

Expected: **404 on the three tiers** and **200 on the recording**. A 200 on a
tier means it is still buyable and the import did not do its job.

## Step 2: the page

Matrixify, Pages sheet, MERGE. Expected: **1 row, 0 failed.**

Then load `/pages/ap-csa-frq-bootcamp-2026` and check three things:

1. **Nothing says April 16, Book Now, or Reserve Your Spot.** The generator
   refuses to write a body containing any of those, so if you see one the page
   did not update.
2. **Two cards, not three.** The recording at $29.99, and a "Next Live Bootcamp"
   card that says Spring 2027 and explicitly that it is not on sale yet.
3. **No specific 2027 date anywhere** except the College Board exam date,
   12 May 2027.

## When you set the 2027 date

The page deliberately does not name one, because none is set. The generator
refuses to print a bootcamp date while `config/csa-frq-bootcamp-2027.json` has
`liveDate: null`, and the smoke suite asserts it.

When you have the date:

```
# set "liveDate": "Thursday, April 15, 2027" in config/csa-frq-bootcamp-2027.json
npm run csa:frqbootcampsheets
```

and import sheet 2 again. Sheet 1 does not need rerunning unless you are also
putting the live session on sale, which is a separate decision about price.

## What this does not do

It does not create a 2027 product and it does not set a price for one. You said
the recording is the current product, so that is the only thing this sells.
