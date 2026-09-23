# Daily site audit, 2026-09-23

## What ran

No GitHub Actions `site-audit.yml` run existed for today as of 09:33 UTC (the
most recent run was yesterday's, 2026-09-22T13:49 UTC), so this session ran
the crawl directly, once, exactly as specified:

    node scripts/site-crawl.js --out /tmp/today.json --budget 400 --max-minutes 30 --previous /tmp/yesterday.json

`/tmp/yesterday.json` was yesterday's `current-crawl.json`, pulled from the
`site-audit-30` artifact on run 35736111654 rather than re-crawling to get a
baseline. Shard 1/7, 400 of 2126 sitemap URLs, 674 requests, 955s. API build
`0206a25`.

Yesterday's run (35736111654) is worth a note for anyone reading its red X:
it completed normally. The job's own annotation says so explicitly -
`AUDIT HEALTHY`, exit 1 because the crawl **found** problems, not because it
failed to run. Nothing to chase there.

## P0 - unchanged, 12 nights

Same three findings as yesterday, one root cause: `#cyber-lab-11` on
`ap-cyber-unit-1-lesson-1-lab` paints white text against `var(--purple)` and
`var(--dark))`, both undefined, so the background declaration drops and the
text renders on whatever is behind it (score bar, check button, rubric table
header). No new P0. No report of a student seeing graded assessment content
today.

## Resolved: production caught up to main

Yesterday's P1 list carried `api-stale-deploy`: production was serving
`252ce6c` while `main` had been on `58283a3` for 18.9 hours. Today production
serves `0206a25`, and `git fetch origin main` (done before comparing, per the
standing instruction not to trust a local ref) shows `origin/main` at
`0206a259bc7...`, the same commit. The gap closed; nothing in today's P1 list
mentions it. Not flagged as "new" by the crawl's own diff counter because it
is not one of its tracked finding fingerprints, but it is a real, verified
change since last night.

## New since last night (168, per the crawl's own count)

All shard-rotation noise, not new problems. This is shard 1/7 tonight against
shard 7/7 last night - two different 400-URL samples of the same 2126-URL
sitemap - so `stale-year` and `h1-duplicate` (sitewide template issues) hit
nearly identical totals both nights (243 and 365 today vs 243 and 365
yesterday) while showing up on different individual URLs, and `meta-scraped`
touched 10 pages tonight against a completely different 7 last night. This
pattern is expected and previously documented (2026-09-06 run note); it is
not evidence of drift.

The only new finding *kind* tonight is `slow` (1 page, 5.4s TTFB on
`ap-csp-practice-test-privacy-security`), which the crawler itself annotates
as "treat as a trend rather than a verdict" since it is a single measurement
from one runner. Nothing else to act on.

## Standing SEO findings, checked against the 2026-08-26 baseline

- `h1-duplicate` on the shared theme template: still present (91%, 365/400 of
  tonight's shard), expected until the theme edit ships.
- `h1-is-title`: still present, still a body-sheet fix, not news.
- `robots.txt`: still fixed. 0 robots-related findings in tonight's crawl.
- The eight competing AP Cybersecurity overview URLs: not independently
  re-checked tonight (still blocked on Search Console per standing note); no
  new information either way.

## Go deeper: schema coverage on course hubs (rotation)

Last checked 2026-09-06, 17 days ago - due for a recheck, and cheap (8
single-page GETs through `lib/storefront-fetch.js`, ~1.2s apart, no separate
full-site crawl). Unchanged:

    ap-csa-course                 Course, CourseInstance, FAQPage, ItemList, LearningResource, BreadcrumbList
    ap-networking                 Course, FAQPage, BreadcrumbList
    ap-csp-course                 BreadcrumbList only
    ap-cybersecurity-course       BreadcrumbList only
    csa-command-center            BreadcrumbList only
    csp-command-center            BreadcrumbList only
    cyber-command-center          BreadcrumbList only
    ap-networking-command-center  BreadcrumbList only

Same gap as 2026-08-26 and 2026-09-06: only `ap-csa-course` and `ap-networking`
carry `Course` schema. This is page-body JSON-LD, not something a metadata
sheet fixes, so no `seed/seo-rewrites.js` row from this.

## Metadata (seed/seo-rewrites.js)

No row added. The only metadata-shaped finding tonight, `meta-scraped`,
is the same known sitewide pattern described above (different pages each
shard, same underlying cause: unset description metafields falling back to
scraped body text on an unknown but apparently large share of AP CSA lesson
pages). It has been standing since at least 2026-09-05 and is a scoped
project of its own, not something to patch with a handful of rows sampled
from tonight's shard.

## Morning report review stage

`npm run morning` exits cleanly: "no admin credential." Neither
`ADMIN_READ_KEY` nor `ADMIN_KEY` is set on this environment, matching
`docs/handoffs/Site-Assistant-Report-First.md`. Expected state, not a fault.
The morning review could not run today for want of `ADMIN_READ_KEY`.

## What is still open

- The `#cyber-lab-11` invisible-text CSS bug, 12 nights, P0.
- Course schema missing on `ap-csp-course`, `ap-cybersecurity-course`, and all
  four Command Centers.
- The sitewide unset-description pattern behind `meta-scraped`.
- `h1-duplicate` (theme template) and `h1-is-title` (page bodies), both
  awaiting the fixes named in CLAUDE.md.

## What changed in this repo

Only this run note. No metadata row, no code change, no regression, no fix.

## Artifact

This run's crawl output: `docs/runs/2026-09-23-claude-code-daily-audit.md`
(this file). Yesterday's GitHub Actions run used as baseline:
https://github.com/codingclub12/apcsexamprep-progress-api/actions/runs/35736111654
