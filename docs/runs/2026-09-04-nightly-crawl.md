# 2026-09-04 nightly site crawl

Shard 3/7. 358 of 2,103 sitemap URLs, 638 requests, 12m59s (09:08:17 to
09:21:16 UTC), zero 429s, no abort, no truncation. API build `072f89f`.

**0 P0, 81 P1 (80 of which are false positives, see below), 388 P2/P3.**

This is the first night shard 3 has been logged since the branch fell behind
(last night, 2026-09-03, covered shard 2). So most of tonight's "fresh"
findings are first sightings of this slice, not new regressions; the hot set
(root, course hubs, one reporter page per course, and anything that was P0/P1
last night) is the only part of tonight's crawl with real night-over-night
history.

## New tonight, worst first

Nothing is on fire. No P0 fired: `reporter-missing`, `reporter-asset-dead`,
`api-down`, `dead-page`, and `challenge-served` all found nothing across the
358 pages crawled tonight, so every graded page in this shard still loads its
course's reporter and `/api/health` is clean.

### P1, verified false positive (80 of 81): `stale-year` on CED-spec wording

The crawler's `stale-year` check fired 80 times. I fetched all 80 live pages
and read the text around every match. 78 are the CED-specification wording
CLAUDE.md protects on purpose: `2025-2026 4-unit curriculum`, `2025-2026 CED`,
`2025-2026 Big Ideas curriculum`, `2025-26 4-unit curriculum`. Sampled across
CSA lesson pages, CSP Big Idea pages, product pages, and the CSA/CSP practice
test hubs, e.g. `/pages/ap-csa-reference-sheet`, `/pages/ap-csa-ced-explained`,
`/pages/ap-csp-big-idea-4-computer-systems-networks`,
`/pages/ap-csa-unit-3-course`, `/pages/ap-csa-unit-tests-hub`. Every one reads
correctly as "aligned to the 2025-2026 curriculum," which is spec text, not a
school-year advertisement, and CLAUDE.md is explicit that this wording must
never roll. This matches exactly what last night's session found for the same
check (44 of 46 there, 78 of 80 here): the check has no false-positive rate
problem of its own, it is just firing on a large, correctly-unrolled corpus
every time it runs.

### P1, real and already known (2 of 81): the two blog posts from last night

`/blogs/news/ap-csa-searching-sorting` and `/blogs/news/getters-setters-ap-csa`
are still showing `<title>...Complete Guide (2026-2027)</title>` next to a
meta description reading `...Complete Guide (2025-2026)`. Reverified live just
now, unchanged from last night's report. Cause, per last night:
`scripts/school-year-rollover.js:107-108` only loops `title` and `title_tag`,
never the meta description metafield. Not re-reporting this as new; it is one
night older than it was last night and nobody has picked it up yet. No board
task names it by number as far as I can find; it lives only in last night's
run note.

### P1, verified false positive: `api-stale-deploy`

Flagged production serving `072f89f` while "main" reads `ffc152d`, 4.5h drift.
`git fetch origin main` from this container returned `ffc152d..072f89f`, i.e.
this container's local clone of `main` was itself stale at crawl time.
Independently confirmed against the GitHub API (`list_commits` on `main`):
the real tip is `072f89f`, merged 2026-09-04 04:53 UTC, which is exactly what
production is serving. No deploy drift exists. This is the identical
fragility named last night: `deployLag()` in `scripts/site-crawl.js` (line
~307) reads `origin/main` from whatever the crawling container's local git
happens to have fetched, not from GitHub directly, so it will keep producing
this same false alarm on any night where the container's clone lags a merge
that landed shortly before the crawl ran.

## Still open

- **The school-year rollover meta-description gap above.** 2 nights old now.
- **`/pages/ap-csp-course-bi3-unit-test` 404.** Not recrawled tonight, shard 3
  did not include it; last confirmed still-broken 2026-09-03, 9+ nights open
  depending how the log gap above is counted.
- **Two `<h1>` elements per page is a site-wide template pattern, confirmed on
  a second template tonight.** Last night sampled `sections/main-page.liquid`
  (theme header H1 + a second, content-authored H1). Tonight's shard turned up
  the same shape on blog articles: `sections/main-article.liquid:48-52`,
  `<h1 class="article-template__title">{{ article.title }}</h1>`, plus a
  second identical H1 authored into the article body, e.g.
  `/blogs/ap-cybersecurity/what-is-ap-cybersecurity` and the page-version of
  the same content at `/pages/what-is-ap-cybersecurity` both show the
  duplicate. 253 `h1-duplicate` findings this shard (187 first sightings of
  this slice, the rest matching the hot-set root page from last night). This
  is not board #154 (that is two DIFFERENT-content copies of the same CSA
  daily-practice article; this is one page with its own title rendered
  twice). It also is not filed as its own task anywhere I can find. Given the
  blast radius (roughly two-thirds of every page/article crawled, per last
  night's sample), it reads as a single long-standing template decision
  rather than 253 separate defects, and is worth a task if nobody has scoped
  fixing it.
- **87 `title-overlong` findings (over 70 characters), 81 first sightings this
  slice.** Heavily concentrated on `/blogs/ap-csa-daily-practice/*` (board
  #154's territory: the `AP CSA Unit N Day M: Topic Name | Daily Practice |
  APCSExamPrep.com` pattern runs long once the topic name is more than a
  couple words) and on CSP/cyber lesson pages carrying long descriptive
  titles plus the site's title suffix. Not verified individually per the
  playbook; two worst examples:
  `/blogs/ap-csa-daily-practice/ap-csa-u1-c2-day-15-complex-string-manipulation`
  (85 chars) and `/pages/ap-cyber-unit-5-lesson-6-lab` (title carries both the
  unit/lesson number and the site suffix).
- **30 `h1-is-title` findings**, all first sightings this slice: the page's
  H1 is the raw `<title>` string, pipe characters and site suffix included,
  rather than a clean heading. Not verified individually.
- **15 `meta-scraped` findings**, concentrated on
  `/blogs/news/ap-csp-day-*` articles (the CSP daily-practice series): the
  meta description reads as scraped page furniture, e.g. `Big Idea 3 Day 32
  Practice Focus: Simulations & Randomness Practice Question A program
  simulates rolling two dic[e]...`, cut off mid-word. Did not trace to a
  generator script tonight; worth a look at whatever authored the CSP daily
  practice series, since this is the same shape of problem CSA's own
  `scripts/csa-daily-practice-seo-titles.js` exists to fix, and CSP appears
  not to have an equivalent.
- **2 `meta-missing`** (`/collections/bundles`, `/collections/frq`) and
  **2 `brand-doubled`** (`/pages/ap-csp-game-crowd-power`,
  `/pages/ap-csp-game-license-match`, store name twice in the title). Low
  blast, not verified individually.

## Resolved since last night

None. Nothing from the 2026-09-03 baseline (shard 2) was recrawled tonight
(shard 3), so nothing in it could be confirmed fixed; the one item that was
recrawled via the hot set, the two rollover blog posts, is still broken.

## Coverage

Shard 3/7, 358 URLs, 638 requests, 12m59s, well inside the 25-minute wall
clock. No throttling, no abort, no truncation.

## Autofix score

0 of 470 findings scored eligible (`scripts/autofix-scan.js`). Top blocking
reason: none of tonight's eight finding kinds (`h1-duplicate`,
`title-overlong`, `stale-year`, `h1-is-title`, `meta-scraped`,
`meta-missing`, `brand-doubled`, `api-stale-deploy`) are on the auto-fix
allow list yet, so nothing tonight was in reach of automation regardless of
risk.

## What I would check next, not done tonight

- Whether `deployLag()` should read the GitHub API directly instead of local
  `origin/main`, since this is the second consecutive night it has produced
  a P1 that dissolves under a `git fetch`. A five-minute fix, not attempted
  here: this job reads, it does not patch scripts.
- Confirm with Tanner whether the site-wide double-H1 pattern (main-page and
  main-article templates both do it) is worth a task of its own, separate
  from #154, given it touches roughly two-thirds of the site by last night's
  sample.
- Find and read whichever script authors the CSP daily-practice blog series,
  to see whether it has a title/meta tool the way CSA's does, or never got
  one.
