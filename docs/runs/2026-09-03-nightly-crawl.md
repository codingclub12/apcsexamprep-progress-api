# 2026-09-03 nightly site crawl

Shard 2/7. 341 of 2,093 sitemap URLs, 622 requests, 804 seconds (13m24s), zero
429s, no abort, no truncation. API build `d84753f`.

**0 P0, 47 P1 (1 of which is a false positive, see below), 315 P2/P3.**

## The log branch had not been touched in 9 nights

Before anything else: the baseline this run loaded was
`docs/runs/2026-08-25-nightly-crawl.md` / `crawl-state.json`, committed
**2026-08-25**. `claude/nightly-crawl-log` carries exactly two `nightly crawl`
commits in its entire history, a seeding run and the real Aug 25 run, and
nothing since. Nine calendar nights of this job did not happen, or ran and
never reached the commit step. I cannot tell which from inside this repo.

The practical effect: every one of tonight's 431 findings reads as "fresh"
against the delta engine, because there is nothing recent to diff against, and
`lib/site-crawl.js` grew several new check kinds (`stale-year`, `h1-duplicate`,
`h1-is-title`, `meta-scraped`, `brand-doubled`, `api-stale-deploy`,
`title-overlong`, plus four `cfu-*` and two `*-regressed` kinds not exercised
tonight) in the gap, none of which the Aug 25 baseline could have recorded
regardless. Tanner should know the gap exists independent of anything below.

## New tonight, worst first

### P1: the school-year rollover only reached two of a page's several places, not all of them

Yesterday's rollover (`7a1cf9a`, 2026-09-02) correctly separated "the school
year" (roll it) from "the curriculum specification" (`2025-2026 4-unit
curriculum`, leave it, per CLAUDE.md), and rolled 14 items across `title` and
`title_tag`. `scripts/school-year-rollover.js` lines 107-108 loop
`for (const field of ['title', 'title_tag'])` and stop there. The meta
description metafield was never in scope.

Confirmed live on two CSA blog posts:

| Page | `<title>` / first `<h1>` | meta description |
|---|---|---|
| `/blogs/news/ap-csa-searching-sorting` | `...Complete Guide (2026-2027)` | `...Complete Guide (2025-2026).` |
| `/blogs/news/getters-setters-ap-csa` | `...Complete Guide (2026-2027)` | `...Complete Guide (2025-2026).` |

`getters-setters-ap-csa` also carries a **second** `<h1>` still reading
`(2025-2026)`, so the page shows both years to a reader who scrolls, not just
in the meta tag.

**Who it hurts.** A parent or teacher searching in September for CSA prep sees
`Complete Guide (2025-2026)` in the Google snippet for a page whose own title
already claims to be current for 2026-2027, at exactly the moment they are
deciding whether the site is maintained.

**Probable cause, with file and line.** `scripts/school-year-rollover.js:107-108`.
The fix is adding the meta description metafield (`title_tag`'s sibling,
likely `global.description_tag` — not confirmed against the Admin API tonight)
to the same field loop and re-running the tool's Admin-API scan, not a
find-and-replace on these two pages alone: the same gap exists for any other
page or article whose meta description independently names a year.

**Scope, and what I did not check.** The `stale-year` check fired 46 times
tonight; I fetched all 46 live and diffed title/meta/h1 against each other.
44 of the 46 are the *other* kind: `Aligned to the 2025-2026 4-unit
curriculum`, `2025-2026 exam format`, `AP CSA 2025-2026 CED` — the
specification wording CLAUDE.md says must stay as written, unrolled by
design. Exactly these 2 blog posts show a same-page mismatch. I did not crawl
the other 6/7 of the site (roughly 560 more blog URLs) looking for more of
the same pattern; the mechanism above is enough for whoever picks this up to
grep for it directly against the Admin API instead of re-crawling.

**Autofix score:** 0 of 431 findings scored eligible tonight
(`scripts/autofix-scan.js`). Every kind that fired, `stale-year` included, is
off the allow list, so nothing here was in reach of automation regardless.

### False positive, not a real finding: `api-stale-deploy`

The crawl flagged `production serves d84753f, not main's ffc152d; main has
been on ffc152d for 48.1h`. `scripts/site-crawl.js`'s `deployLag()` (line 307)
reads `origin/main` from **this container's own local git**, not from GitHub,
and this container's clone had not fetched `main` since before four merges
landed today (`#488`-`#490`). Independently verified: `main`'s real tip is
`d84753f`, which is exactly what production is serving, and
`.github/workflows/deploy-drift.yml` — the check the code comment itself
names as "the better implementation" — ran green against `main` at 17:20 UTC,
30 minutes before this crawl started. No deploy drift exists. Worth naming as
a script fragility (the check trusts whatever `origin/main` happens to be in
the runner's working directory) but not worth an action beyond that.

## Still open

- **CSP Big Idea 3 unit test, `/pages/ap-csp-course-bi3-unit-test`, still 404s.**
  This is the Aug 25 baseline's one real finding (`lib/csp-exercise-pages.js:329`
  and `lib/csp-course-pages.js:357` both template the handle as `bi{N}-unit-test`,
  wrong for BI3, which is split into `-part-a`/`-part-b`). Reverified live just
  now: still 404. Checked `docs/dead-internal-links-2026-09-02.md`, the target
  list behind board #156 (379 links, 142 targets) — this handle is not in it, so
  it is not folded into that effort and nobody has picked it up. 9 calendar
  nights open, though the log gap above means it was never carried forward as a
  tracked "still open" line until tonight.
- **228 pages in this shard carry two `<h1>` elements** (227 with 2, one with 3).
  Sampled eight: every one is the theme's own page-title heading
  (`APCSExamPrep-theme/sections/main-page.liquid:19`,
  `<h1 class="main-page-title...">{{ page.title }}</h1>`) plus a second,
  content-authored `<h1>` inside the page body. This is a single template
  pattern site-wide, not 228 separate defects, and given the blast radius
  (two-thirds of everything crawled) it reads as long-standing rather than new.
  Matches board #154's shape of thing (site-wide template drift) but is not the
  same finding as #154.
- **Title/`<h1>` duplication on CSA daily-practice articles is board #154**
  (`84 CSA daily-practice articles are published twice... with DIFFERENT
  questions`, size l, open, owner tanner). Tonight's `duplicate-title` finding
  (`unit3-cycle2-day-17...` vs `unit-3-cycle-2-day-17...`, identical title) and
  a chunk of the 104 `title-overlong` findings on `/blogs/ap-csa-daily-practice/`
  pages are this same known issue surfacing again, not news.

## Resolved since last night

None. Nothing in the Aug 25 baseline's four findings was recrawled and cleared
tonight; the BI3 link (above) was recrawled and is still broken, and the three
`meta-missing` collection/page findings from Aug 25 fell in shards this run
did not cover.

## Coverage

Shard 2/7, 341 URLs, 622 requests, 13m24s, well inside the 25-minute wall
clock. No throttling, no abort. `reporter-missing`, `reporter-asset-dead`,
`api-down`, `dead-page`, and `challenge-served` — the checks this job exists
for — found nothing tonight: every graded page in the crawled set loads its
course's reporter, `/api/health` answered clean, and no sitemap URL in this
shard came back dead.

## What I would check next, not done tonight

- Confirm the meta description metafield's actual handle against the Shopify
  Admin API before writing a second `school-year-rollover.js` field, rather
  than guessing `global.description_tag`.
- A full-site (not single-shard) sweep for the same title/meta mismatch, once
  the field name above is confirmed, would give a real blast-radius number
  instead of "at least 2."
