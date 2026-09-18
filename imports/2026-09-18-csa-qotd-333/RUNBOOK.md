# Board 333: 72 duplicate question handles

Matrixify **Redirects**, MERGE. One sheet,
`csa-qotd-333-duplicate-handle-redirects.csv`, 72 rows.

## The decision this is asking you for

84 AP CSA daily-practice questions are published at **two URLs each**, and each
page canonicalizes to itself, so both are independently indexable with the same
content. 72 of the 84 are the same question and this sheet retires one of each.
The other 12 are held back; see below.

Two sets exist, and which is which came from the blog's own `published_at`
rather than from the handle names:

| | count | published | title style |
|---|---|---|---|
| `unit-N-cycle-N-day-*` | 112 | all on **2026-02-06**, inside 69 seconds. A bulk import. | "AP CSA Unit 4 Day 28: Arraylist Equality" |
| `unitNcycleN-day-*` | 84 | **2026-05-13 to 2026-08-04**, one a day at 01:00. The series as it ran. | "Unit 4 Cycle 2 Day 28: ArrayList Equality" |

The compact handle is later in **84 of 84** pairs, so there is nothing to
adjudicate about which came second.

**The sheet keeps the compact daily-series handle and retires the February one.**
The reason is board 343 rather than the titles: 19 of those February articles
were serving a code block their question was not about, and the repair took the
correct code from the compact twin, which was right in all 19. The drift is in
the February set, which says which half has been looked after.

If you want it the other way, say so and the sheet regenerates; the direction is
asserted per row, so it cannot be flipped by accident.

## STATE AS OF 2026-09-18 19:40 UTC: the redirects are in, the unpublish is not

Checked against the Shopify Admin API and the live storefront:

| | |
|---|---|
| the 72 redirect rows | **all present in Admin**, the newest 72 of 819. The CSV import worked. |
| the 72 February articles | **still published.** Admin reports `isPublished: true`, every URL answers 200 with its full body, and the blog listing still returns all 429 articles. |
| what that means | the 72 redirects are **inert**. A redirect only fires for a URL that does not resolve. |

This is exactly the failure this runbook predicted, and it is recoverable with no
harm done. **Do not re-import the redirect sheet.** Those rows are already in
place and will start firing the moment the articles stop resolving.

## What is left: one import

`csa-qotd-333-step1-unpublish-blog-posts.csv` sets `Published` to `FALSE` on
exactly the 72 February handles. It exists because doing this by hand is 72 trips
through the Shopify admin.

1. Import `csa-qotd-333-step1-unpublish-blog-posts.csv`, Matrixify, MERGE, one import.
2. Run the check:

```
node scripts/verify-csa-qotd-dupes-live.js
```

It should read **0 live, 0 unpublished, 72 redirected**. The redirects take over
the moment the articles stop resolving, so there is no third step.

If it reads **72 unpublished** instead, the articles are down but the redirects
are not firing yet; wait a minute and re-run before doing anything else. If it
reads any `wrong`, it names which handle and why.

The sheet cannot take down the wrong side. It refuses any handle that appears
anywhere on the keep side, any compact daily-series handle, and any unit 1
handle, and the suite proves each refusal independently.

## What is deliberately NOT in this sheet

**12 pairs.** They share a stem and an option set but carry **different code**,
and in 9 of the 12 both members re-derive correctly on a real JVM. They are two
working variants of one prompt, not a duplicate, and redirecting one away would
destroy a distinct item. That is a content judgement rather than a cleanup, so
it is yours:

```
u2c2-day-2-selection-if-else-if          u4c2-day-5-2d-array-initialization
u2c2-day-3-short-circuit-logic           u4c2-day-10-array-algorithm-find-maximum
u2c2-day-5-boolean-precedence-andand     u4c2-day-14-2d-array-diagonal-sum
u2c2-day-12-debugging-loop-condition     u4c2-day-23-2d-array-row-sums
u2c2-day-17-boolean-precedence-andand    u4c2-day-27-2d-array-edge-elements
u2c2-day-18-iteration-for-loop-count     u3c2-day-2-instance-vs-static
```

**Unit 1 cycle 2's 28 articles.** They exist only in the February set and have no
compact twin, so "retire the February import" would delete them outright. The
builder refuses to pair a unit 1 handle at all, and nothing in this sheet can
reach them.

## What I could not check

Search traffic. The Ahrefs API was out of units, so I cannot tell you which of
the two URLs currently ranks. It does not change the recommendation: a 301
carries link equity to the surviving URL either way, which is exactly why a
redirect is the right instrument here rather than unpublishing and leaving a 404.

## Rebuilding

```
npm run csa:dupepairs -- <bodies-dir>     # canonical data from live bodies
npm run csa:dupesheet                     # the sheet
npm run smoke:qotddupes                   # the offline suite
```
