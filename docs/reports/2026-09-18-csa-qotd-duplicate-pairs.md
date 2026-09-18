# 84 AP CSA daily-practice questions are published at two URLs each

2026-09-18. Board 333, which named one pair. The pair is real and so are 83
others.

## What was measured

All 429 articles in `ap-csa-daily-practice`, enumerated from the blog's own
listing, then both members of every duplicate pair fetched live through
`lib/storefront-fetch.js` and parsed with `lib/csa-qotd-items.js`.

| handle shape | count | published | title style |
|---|---|---|---|
| `ap-csa-uN-cN-day-*` | 224 | 2026-02-18 | |
| `unit-N-cycle-N-day-*` | 112 | all 2026-02-06, within 69 seconds | "AP CSA Unit 4 Day 28: Arraylist Equality" |
| `unitNcycleN-day-*` | 84 | 2026-05-13 to 2026-08-04, one a day at 01:00 | "Unit 4 Cycle 2 Day 28: ArrayList Equality" |
| other | 9 | 2026-01-01 | |

The 84 compact handles pair one-to-one with 84 of the 112 hyphenated ones. The
compact member is the later of the pair in **84 of 84**, so there is no
ambiguity about which was published second.

The remaining 28 hyphenated articles are all unit 1 cycle 2 and have **no twin at
all**. Any plan phrased as "retire the February import" deletes them.

## Both URLs are indexable, which is why this is not cosmetic

Each page carries a canonical tag pointing at **itself**:

```
compact      <link rel="canonical" href=".../unit4-cycle2-day-28-arraylist-equality">
hyphenated   <link rel="canonical" href=".../unit-4-cycle-2-day-28-arraylist-equality">
```

Neither declares the other. No `robots` meta on either. So this is 72 pairs of
identical content competing with itself in search, not two aliases of one page.

Neither shape is linked from `/pages/daily-practice`, `/pages/ap-csa-course` or
the unit study guides, so there are no internal links to repair. The blog index
lists the compact set, newest first; the February set is reachable only deeper in
the pagination and from search.

## How alike the pairs actually are

| | pairs |
|---|---|
| byte-identical bodies | 57 |
| same question, options in a different order | 13 |
| same question, cosmetic differences only | 2 |
| same stem and option set, **different code** | 12 |

The last row is the one that mattered, and it nearly became a mistake. A sweep
that treated "same stem, same options" as duplicate would have retired 12 items
that are not duplicates. Running both members of those 12 on a real JVM:

- **9 of 12 have BOTH members re-deriving correctly.** Two working variants of
  one prompt, with different worked code.
- 2 are conceptual stems with no runnable driver, which the board 332 audit
  already names rather than counts as failures.
- 1, `u2c2-day-3-short-circuit-logic`, has a runnable compact member and a
  non-runnable hyphenated one.

`u2c2-day-2-selection-if-else-if` is the clearest case: the compact member agrees
on B with key B, the hyphenated one agrees on D with key D. Both internally
correct, and they are different questions.

So 72 pairs are a duplicate to resolve and 12 are a content decision. They are
kept apart in the data and only the 72 reach the sheet.

## Which half to keep, and on what evidence

The sheet keeps the compact daily-series handle. The argument is board 343, not
the titles: 19 of the February articles were serving a code block their question
was not about, badly enough that no answer could be marked right, and the repair
took the correct code from the compact twin, which was right in all 19. The
February set is the one that drifted.

**A consequence worth stating rather than burying:** if these 72 are retired, 19
of them are pages repaired earlier today under board 343. That work was still
right to do, because those pages were broken for students while their fate was
undecided, and it is what established which half had drifted. But it does mean
the repair and the retirement point the same way, and the retirement makes the
repair moot for those 19.

## What could not be checked

Search traffic per URL. The Ahrefs API was out of units. It does not change the
recommendation: a 301 carries link equity to the surviving URL, which is why the
instrument is a redirect rather than an unpublish-and-leave-404.

## The order, which is the operational trap

Shopify honours a redirect only from a URL that does not resolve. All 72 `Path`
URLs answer 200 today, so importing the sheet first produces 72 redirects that
never fire while Matrixify logs every row and Admin shows them all present.
Nothing reports a problem.

`scripts/verify-csa-qotd-dupes-live.js` exists for that. It derives one of four
stages per handle from the live store, taking no flag for which it expects:
`live` (200, not ready), `unpublished` (404, ready), `redirected` (301 landing on
the right target), `wrong` (anything else, named). It currently reads
**72 live, 0 unpublished, 0 redirected, 0 wrong**, and all 72 targets serve a page.

## Open, and Tanner's

- Unpublishing the 72 handles. `NEVER_AUTO`, and step 1 of the runbook.
- The 12 variant pairs: keep both, or pick one and re-author.
- Whether unit 1 cycle 2 should get a compact daily-series run of its own, which
  is the asymmetry underneath all of this rather than a defect in it.
