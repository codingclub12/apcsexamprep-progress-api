# 2026-09-15 daily site audit

## What ran

`site-audit.yml` had not fired for today at session start (checked 09:36 UTC;
last completed run was #22, 2026-09-14 15:33 UTC). Before starting a crawl,
checked `claude/nightly-crawl-log` for a baseline and found a full crawl had
already run this morning at 09:07 to 09:23 UTC, committed as `d26b513`: shard
7/7, 400 of 2,111 sitemap URLs, 677 requests, no abort, no truncation, run
note already written. The storefront was driven once this morning, already,
by that session. This routine reads that crawl rather than re-crawling, per
its own instruction never to drive the storefront twice in one morning.

**3 P0, 254 P1, 412 P2, 43 P3.**

## Is anything on fire

Yes, still, and it is not new. AP Cyber Unit 1 Lesson 1 Lab's Check button and
score display have been invisible for 4 straight nights (first caught
2026-09-12). `#cyber-lab-11 .check-btn`, `.score-bar .score-num` and
`.rubric-table th` all set `color:#ffffff` against a `background` of
`var(--purple)` or `var(--dark)`, and neither custom property is defined
anywhere on the page, so the whole background declaration is invalid at
computed-value time and drops: white text on whatever background inherits
through. This morning's crawl session already reproduced it live,
independently of the crawler. No board task tracks the regression itself,
only the three closed-but-unverified items behind it (#202, #203, #264).
Fix is unchanged from every prior night: reinsert the ten-property palette
block onto `#cyber-lab-11` in `shopify/ap-cyber-unit-1-lesson-1-lab.html` and
re-import via Matrixify. Out of this routine's scope to apply.

## New tonight

Two brand-doubled titles, fixed below:

- `ap-csp-game-bridge-the-divide`: "Bridge the Divide | AP CSP Big Idea 5
  Game | APCSExamPrep.com | APCSExamPrep.com"
- `ap-cybersecurity-complete-course-guide`: "AP Cybersecurity Course Guide |
  All 5 Units Live | APCSExamPrep.com | APCSExamPrep.com"

Same one-line template bug as `ap-csp-game-robot-director` (found by
yesterday's crawl and not yet fixed) and three teacher bundles fixed earlier:
a title template appends "| APCSExamPrep.com" on top of a Shopify default
title that already ends the same way. All three of tonight's and yesterday's
new instances are added to `seed/seo-rewrites.js` in this PR, along with the
still-pending `robot-director` row.

Everything else this morning's crawl marked fresh (6 `meta-scraped`, 114
`h1-duplicate`, 21 `h1-is-title`, 23 `title-overlong`) is shard-rotation
noise: today's shard (7/7) covers different URLs than yesterday's (6/7), and
every one is a new instance of an already-tracked, long-standing page
template defect, not a new regression. Not re-verified individually per the
playbook's P2/P3 rule.

## Resolved since last night

None. Today's shard recrawled the hot set (which carries the P0 and the
persisting P1s) and both are still broken; nothing legitimately closes.

## Standing SEO findings, checked against this morning's crawl

- `h1-duplicate`: still the shared page template, still not near zero (365
  of this shard's 400 URLs). Expected until the theme fix ships.
- `h1-is-title`: 33 in this shard, not the 11 in this routine's own baseline
  text. That baseline number is stale, not a regression: it predates several
  shards' worth of rotation coverage finding more instances of the same
  pre-existing template defect. Needs a body sheet, unchanged.
- `robots.txt`: this routine's baseline text still says "1-byte body." That
  has been wrong since theme commit `90c36ea` on 2026-09-02, and at least
  three prior daily-audit run notes (2026-09-07, 09-11, 09-13) already
  confirmed 7787 bytes live. Repeating the correction here since the
  reference text itself is what still says otherwise.
- Eight competing AP Cybersecurity overview URLs: still blocked on Search
  Console being connected. No new information this pass; not proposing a
  redirect.

## Go deeper: schema coverage on course hubs

Checked without an additional live fetch, by reading the theme repository
directly. `APCSExamPrep-theme` has no dedicated Course-schema Liquid snippet
anywhere in `sections/` or `snippets/`: the only `application/ld+json` blocks
in the theme are `apcs-breadcrumb-schema.liquid` (BreadcrumbList) and
per-page blocks inside `custom-liquid.liquid`. That matches what prior
sessions already confirmed live: Course schema on `ap-csa-course` and
`ap-networking` is hand-embedded per page rather than templated, so every
other course hub (`ap-csp-course`, `ap-cybersecurity`) has none by default
and picking one up means adding the JSON-LD block to that specific page's
body content, not a theme change. Unchanged from the last time this rotation
ran (2026-09-07).

## Changes in this PR

- `seed/seo-rewrites.js`: 3 new rows, all fixing the same brand-doubled
  template bug (`ap-csp-game-robot-director`, `ap-csp-game-bridge-the-divide`,
  `ap-cybersecurity-complete-course-guide`).
- `imports/2026-09-15/seo-{pages,products,collections}.csv`: regenerated from
  the full seed table via `node scripts/seo-metadata-csv.js imports/2026-09-15`.
  **Not imported.** No `Body HTML`, `Title`, or `Published` column in any
  sheet; `Command` is `MERGE` throughout.

## Verification

- `node smoke/seo-metadata-csv.js`: 35/35 passing, including the shipped
  table checks against the 3 new rows (title/description length, no em dash,
  no pipe-delimited brand, no stale year).
- Parse-back diff: read `imports/2026-09-15/seo-pages.csv` back and compared
  all 3 new rows against `seed/seo-rewrites.js` field by field. Byte-identical
  on handle, title and description for all three (row/column count also
  matched: 39 page rows both sides).
- Live-read (3 requests, through `lib/storefront-fetch.js`, the same fetches
  this morning's crawl already made for its own verification, not a second
  crawl) of the current `<title>` for all three brand-doubled pages, to draft
  accurate replacement copy from what each page actually teaches.

## Flagged, not fixed here

**Eight daily-audit PRs are now open and unimported on this repo**: #579,
#619, #642, #659, #664, #665, #669, and this one. Each carries a metadata row
that never landed on `main`. #665 flagged this growing count on 2026-09-13 at
five open PRs; it is now eight. A future session (or a human) should either
import the backlog or explain why it is being left, since the pile itself is
now a bigger signal than any single row in it.

## Test plan

- [x] `npm run smoke:seocsv` (35/35 passed)
- [x] Generated sheet parsed back and diffed against `seed/seo-rewrites.js`
      (byte-identical on all 3 new rows)
- [x] Confirmed via `claude/nightly-crawl-log` that the storefront was driven
      exactly once this morning (09:07 to 09:23 UTC, this routine's own
      crawl was skipped)
- [ ] Import of `imports/2026-09-15/seo-pages.csv` (human decision, out of
      this routine's scope)
- [ ] The eight-PR backlog (human decision: import in bulk, or say why not)
