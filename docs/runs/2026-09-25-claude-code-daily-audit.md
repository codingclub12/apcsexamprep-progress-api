# Daily site audit, 2026-09-25

Scheduled routine. Crawl and report only: no board tasks filed, no import run,
no page body touched.

## What ran

The scheduled workflow (`site-audit.yml`) had not produced a run for today at
session start; its most recent run (#32, 2026-09-24T13:57:27Z) was still
yesterday's. So the crawl ran here, once:

```
node scripts/site-crawl.js --out /tmp/today.json --budget 400 --max-minutes 30
```

No `--previous` baseline existed for this container (fresh session, no
`/tmp/yesterday.json`). Shard 3/7, 322 of 2133 sitemap URLs, 601 requests,
15 minutes, complete (`aborted: null`, `truncated: null`). API build
`9d522d1`. `git fetch origin main` confirmed `origin/main` is also at
`9d522d1`: no deploy staleness.

## Why the scheduled workflow reads red, and why that is not news

Checked `site-audit.yml`'s last eight runs (#25 through #32, 2026-09-17
through 2026-09-24): all eight are marked `failure`. That looks like an
outage and is not one. The workflow's own "Say why this run is red" step
prints the reason on every one of those runs: the crawl found P0 findings
(e.g. run #32: 4 P0, 243 P1, 411 P2, 38 P3), so `site-crawl.js` exits 1 by
design, and the job's conclusion follows from that exit code. Same mechanism
on #25 and #28, spot-checked. This is the severity gate working as built, not
a CI defect, and nothing here needs fixing on the workflow side.

## Result: this shard's P0 is clean, the site's is not

**This shard (322 URLs): 0 P0, 37 P1, 255 P2, 85 P3.** But a 3/7 shard with no
forced hot-set (no `--previous` to carry yesterday's P0/P1 URLs forward) does
not cover the pages a P0 was last seen on, so "0 P0 in this shard" is not "0
P0 on the site." Checked the one standing P0 directly instead of trusting the
gap:

### P0 - still live, 12+ nights

The three `css-var-invisible-text` findings on
`/pages/ap-cyber-unit-1-lesson-1-lab` are still present. Fetched the page live
just now: `#cyber-lab-11` text is still set against `var(--purple)` and
`var(--dark)` with nothing defining either custom property, so the background
rule drops and the text paints on whatever is behind it. This is the same
defect tracked on boards #202/#203/#264 (`verified=NO`) and reported in this
routine every day since 2026-09-17. No fix has shipped. Nothing new to add.

### P1 - both standing

- **stale-year** (36 in this shard): `2025-2026` / `2025-26` text on pages
  that should read `2026-27`. Same standing defect at 234+ pages site-wide per
  the 2026-09-22 note; this shard's 36 is a subset, not a new count.
- **truncated-body** (1): `/products/ap-csa-teacher-superpack-free-preview`,
  10109 bytes, under the 20000-byte floor. Checked live: this is the
  intentional Google Drive redirect page shipped 2026-09-10
  (`docs/runs/2026-09-10-claude-code-free-preview-drive-redirect.md`), not a
  broken render. The page closes cleanly with one H1 and real body text
  ("Taking you to the free Unit 1 preview..."). Standing, 12+ nights, correct
  to keep reporting as a byte-floor trip rather than a defect.

### P2/P3 - all match documented standing causes

`h1-duplicate` 213, `h1-is-title` 27, `meta-scraped` 11, `meta-missing` 2,
`brand-doubled` 2, `title-overlong` 85. The `h1-duplicate` and `h1-is-title`
counts are consistent with the 2026-08-26 baseline (shared-template contact
section, page-body titles). `robots.txt` was not re-flagged: still fixed.

**meta-missing on `/collections/bundles` and `/collections/frq`**: already
addressed on `main`. `seed/seo-rewrites.js` carries authored descriptions for
both; the crawl finding persists only because the fix has not been imported
to Shopify yet, which is a human step, not a gap in this repo.

**brand-doubled (2, new fix, not previously covered)**: `/pages/ap-csp-game-crowd-power`
and `/pages/ap-csp-game-license-match` both serve
`... | APCSExamPrep.com | APCSExamPrep.com`. Checked the 19 currently open
PRs first so as not to duplicate one: none of them touch these two handles
(the closest, PR #779, fixes two different CSP game pages). Read both pages
live to write accurate copy rather than reuse the scraped description the
crawler flagged. Added both to `seed/seo-rewrites.js`, regenerated
`imports/2026-09-25/` (54 page rows, 13 product rows, 7 collection rows,
MERGE mode), and parsed the two new rows back out of the generated CSV to
confirm a byte-for-byte match against the seed source. Opening as a draft PR
per convention; not imported.

## Morning report review

`npm run morning` in apcsexamprep-progress-api: **0 reports to review, 0
dismissed as junk**, mode `dry_run` as always. This did not hit the
documented `ADMIN_READ_KEY`-missing exit path, because there was nothing
queued since yesterday to reproduce against a live check in the first place.
Nothing needs Tanner from this stage today.

## Go deeper: blog output balance across courses

Enumerated the sitemap (index plus its 5 children, ~10 lightweight XML
requests, no page bodies fetched) rather than re-running a full site crawl,
since `link-graph.js` is explicitly not a nightly-safe tool. Blog article
counts by blog handle:

| Blog | URLs |
|---|---|
| ap-csa-daily-practice | 429 |
| ap-csp-daily-practice | 111 |
| news | 86 |
| ap-cybersecurity | 22 |
| ap-csa | 17 |
| ap-csp | 17 |
| ap-networking | 17 |

CSA daily practice output outweighs CSP daily practice roughly 4 to 1, and
the four topical blogs (ap-cybersecurity, ap-csa, ap-csp, ap-networking) sit
flat at 17-22 each. Consistent with CSA having launched its daily-practice
series first; not something to act on without knowing whether CSP's series is
still being authored or considered done at its current length. Observation
only, not a finding.

## What is still open

The unimported-fix backlog noted on 2026-09-22 has grown, not shrunk: 19 open
PRs as of this session, roughly 14 touching SEO metadata
(`seed/seo-rewrites.js` rows, generated sheets), oldest (#579) open 18 days.
This routine adds one more today. None of it ships until a human reviews and
imports a sheet; that queue is the thing actually blocking these fixes from
reaching students, not anything left to build.

## Artifacts

- Crawl output: `/tmp/today.json` (not committed, container-local)
- This run's fix: `seed/seo-rewrites.js` (2 rows), `imports/2026-09-25/`
- Draft PR: branch `claude/jolly-bell-cncv39` against `main`, link in the PR itself
