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

## Step 0, run this first

```
node scripts/verify-csa-qotd-dupes-live.js
```

Right now it reads **72 live, 0 unpublished, 0 redirected**. That is expected and
it means the sheet is not importable yet. Read the next section before doing
anything.

## The order is not optional, and getting it wrong looks like success

Shopify honours a redirect only FROM a URL that does not resolve. Their words:
"You can redirect only from broken URLs. If the URL still loads a valid webpage,
then the URL redirect won't work."

Every `Path` in this sheet answers **200 today**. So:

1. **You unpublish the 72 February articles.** Unpublishing a handle is
   `NEVER_AUTO`; it is not an agent's to do and nothing here does it.
2. Re-run the check. It must read **72 unpublished**.
3. Import `csa-qotd-333-duplicate-handle-redirects.csv`, Matrixify, MERGE, one import.
4. Re-run the check. It must read **72 redirected**.

Import at step 3 before doing step 1 and you get 72 redirects that never fire.
Matrixify logs all 72 rows, Admin shows all 72 present, and all 72 URLs keep
serving the old article. Nothing anywhere reports a problem. That is why step 2
exists.

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
