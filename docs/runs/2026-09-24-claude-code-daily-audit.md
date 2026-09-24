# Daily site audit, 2026-09-24

Scheduled routine. Crawl and report, plus one metadata fix per step 5: no
board tasks filed, nothing imported, no page body touched.

## What ran

The scheduled workflow (`site-audit.yml`) had not fired for today yet at
session start (its last completed run was 2026-09-23T14:01Z, run #31). Pulled
that run's artifact as the `--previous` baseline and ran the crawl once:

```
node scripts/site-crawl.js --out /tmp/today.json --budget 400 --max-minutes 30 --previous /tmp/yesterday.json
```

Shard 2/7, 400 of 2133 sitemap URLs, 678 requests, 1168s, complete (`aborted:
null`, `truncated: null`). API build `14ed32a`. `git fetch origin main`
confirmed `origin/main` is also at `14ed32a`, and the live `/api/health`
endpoint reports the same commit: no deploy staleness.

The script's own `report()` needs a computed delta object, not the raw
previous JSON; calling it directly with the previous file produced "No
baseline to compare against" even though a baseline existed. Rebuilt the
delta with `lib/site-crawl.js`'s `delta()` (and converted `crawledUrls` back
to a `Set`, since it round-trips through JSON as an array) to get the real
new/resolved counts.

## Result: quiet night, P0 unchanged

**3 P0, 244 P1, 412 P2, 50 P3.** The crawl reports 188 "new" findings, but
P1's count is byte-identical to yesterday (244) and P0 is the same three
findings one night older. Checking finding *kinds* rather than instances:
only 2 of 10 kinds are new (`brand-doubled`, `slow`), both P2/P3. The rest of
the "new" count is shard-rotation noise: tonight's shard (2/7) sampled a
different 400 of 2133 URLs than last night's shard (1/7), so pages not
crawled last night look new even where the underlying page hasn't changed.

### P0 - unchanged, 13 nights

Same three `css-var-invisible-text` findings on
`/pages/ap-cyber-unit-1-lesson-1-lab` (`#cyber-lab-11` text painted against
an undefined `var(--purple)` / `var(--dark)`, dropping the whole background
declaration). Standing, already tracked on the board, reported every day
since 2026-09-17. Nothing new to add.

### P1 - unchanged

- School-year-ended text (`2025-2026` / `2025-26` variants) on 234+3+3+1+1+1
  pages, standing 29-31 nights depending on the phrasing.
- `/products/ap-csa-teacher-superpack-free-preview` body still under the
  20000-byte floor (10109 bytes), 14 nights.

### New today: 2 pages with a doubled brand title (P2), fixed in this pass

`/pages/ap-csp-game-internet-routing-simulator` and
`/pages/ap-csp-game-phishing-net` both serve
`... | APCSExamPrep.com | APCSExamPrep.com` (the domain typed into the title
field by hand, doubled by Shopify's default suffix), with scraped in-game UI
text standing in for the meta description. This is the same defect class
already fixed on three other CSP games (`seed/seo-rewrites.js`,
`ap-csp-game-binary-conversion-race` etc.); these two just hadn't been
caught yet. Added matching rows, regenerated the sheet
(`imports/2026-09-24/seo-pages.csv`), and validated:

- `npm run smoke:seocsv` - 42 passed, 0 failed (title/description rules,
  stale-year guard, MERGE-only, no duplicate handles).
- `npm run smoke:encoding` - 54 passed, 0 failed, repository scan clean.

Not imported. Draft PR opened per convention; a human imports when ready.

### New today: 14 pages with a slow TTFB (P3)

5.2s-10.0s time-to-first-byte on 14 pages, mostly `ap-csa` and one
`ap-cybersecurity` page, none crawled in last night's shard. The check itself
says to treat this as a trend rather than a verdict from one measurement.
Noting it so it can be compared against tomorrow's numbers on the same URLs
rather than acted on tonight.

### Standing SEO findings, re-checked against the 2026-08-26 baseline

- `h1-duplicate`: still present, same template-level cause, not news.
- `h1-is-title`: still present in page bodies, not news.
- `robots.txt`: reconfirmed clean. 200, 7787 bytes, 165 rule lines, Sitemap
  present. Same as the last two audits.

## Go deeper: Course schema on course hubs

Fetched all four course hub pages live through `lib/storefront-fetch.js`
(`ap-csa-course`, `ap-csp-course`, `ap-cybersecurity-course`,
`ap-networking`) and parsed every `application/ld+json` block's `@type`
(including `@graph`-wrapped ones, which `ap-networking` uses). Result
matches the standing note exactly: `ap-csa-course` and `ap-networking` carry
`Course` schema, `ap-csp-course` and `ap-cybersecurity-course` carry only
`BreadcrumbList`. Not news, but a live re-check rather than a repeated claim.
(First pass matched the string "Course" anywhere in the whole page and
falsely reported all four as covered; the site's own nav and breadcrumbs
mention "Course" in prose, so the check has to scope to parsed JSON per
block, not a substring search across the body.)

## Morning report review stage

`npm run morning` **ran successfully today**, which is a change from every
prior day's expectation in this file. `ADMIN_READ_KEY` is now set on this
environment (it was not as of 2026-09-17, per the note this section used to
repeat). The review ran in `dry_run` mode with a read-only credential ("so
nothing can be marked fixed"), reviewed 1 pending site-assistant report,
and found 0 fixed, 0 needs-you, 1 could-not-reproduce
(`/pages/ap-csp-course-bi3-mathematical-expressions-exercise-2`, fetched
cleanly with no known issue type matching), 0 junk dismissed. No
`never_touch` items and no report of a student seeing an assessment.

## Worth Tanner's attention: the draft-PR backlog is still growing

19 pull requests open on this repo, 18 still draft. The oldest, #579 (a
prior daily-audit fix), has been open since 2026-09-07, 17 days now. This
routine keeps producing validated, checked work (today's included); none of
it ships until a human reviews and imports the sheet.

## What changed

- `seed/seo-rewrites.js`: 2 new rows (brand-doubled CSP game titles).
- `imports/2026-09-24/`: regenerated Matrixify sheets, not imported.
- This run note.

No board tasks filed, no page body touched, no import run.
