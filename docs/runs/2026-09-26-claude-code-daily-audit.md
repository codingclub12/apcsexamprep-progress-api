# Daily site audit, 2026-09-26

Scheduled routine. Crawl and report only: no board tasks filed, nothing
imported, no page body touched.

## What ran

The scheduled workflow (`site-audit.yml`) had not fired for today yet at
session start (its most recent completed run was 2026-09-25T14:22Z, run #33,
conclusion `failure`, which per the workflow's own annotation step means a
healthy crawl that found P0s, not a broken job). Pulled that run's artifact
(`site-audit-33`, `current-crawl.json`) as the `--previous` baseline and ran
the crawl once:

```
node scripts/site-crawl.js --out /tmp/today.json --budget 400 --max-minutes 30 --previous /tmp/yesterday.json
```

Shard 4/7, 400 of 2068 sitemap URLs, 673 requests, 915s, complete
(`aborted: null`, `truncated: null`). API build `2e9a3f9`. `git fetch origin
main` confirmed `origin/main` is also at `2e9a3f9`: no deploy staleness.

## Result: one real fix, otherwise quiet

**3 P0, 244 P1, 398 P2, 36 P3. 163 new, 5 resolved.** As in every recent
night, almost all of the "new" count is shard-rotation noise: today's shard
(4/7) covers a different 400 URLs than yesterday's (3/7). Filtering the raw
findings to `nights <= 1` and P0/P1 only, filed down to a single row, the
`stale-year` finding on the page below, which exists only because the page
itself came back (see below). Nothing else is genuinely new.

### P0 - unchanged, 15 nights, plus one resolved

Same three `css-var-invisible-text` findings on
`/pages/ap-cyber-unit-1-lesson-1-lab` (`#cyber-lab-11` text painted against an
undefined `var(--purple)` / `var(--dark)`, background drops, text renders on
whatever is behind it). Standing P0 tracked on boards #202/#203/#264
(`verified=NO`), reported in this routine every day since 2026-09-17. No
change to add today.

**Resolved, confirmed both ways**: yesterday's fourth P0,
`https://www.apcsexamprep.com/pages/ap-csa-practice-test-string-methods`
returning a dead page (curl failure on every request), is gone. The URL was
in today's 400-URL shard, so this is not a sampling artifact: the page loaded
and produced ordinary findings (`stale-year`, `h1-duplicate`) instead of a
request failure. Something restored the page between last night's crawl and
this one. Not this session's doing; recorded here as the reason a standing
P0 count dropped.

The other 4 items the crawl calls "resolved" are not durable fixes and are
not being reported as such: one homepage `h1-duplicate` and three `slow`
(5-7s time-to-first-byte) findings, both are the shapes shard-to-shard sampling
and transient latency produce on their own.

### P1 - unchanged

- School-year-ended text (`2025-2026` / `2025-26` variants) on 234+3+3+1+1+1
  pages, standing 31-33 nights depending on the phrasing variant (was
  32-33 last night; the string-methods page returning added one page to the
  234-page group at `nights: 1`, since it has no prior history under this
  finding).
- `/products/ap-csa-teacher-superpack-free-preview` body still under the
  20000-byte floor (10109 bytes), 16 nights.

### Standing SEO findings, re-checked against the 2026-08-26 baseline

- `h1-duplicate`: 365 of 400 crawled pages today (91%), consistent with the
  ~47/50 template-level cause and yesterday's 91%. Still expected until the
  shared section ships.
- `h1-is-title`: 31 pages today, consistent with the standing page-body
  issue. Not a regression.
- `robots.txt`: 0 findings. Still fixed (theme commit `90c36ea`).

## Go deeper: schema coverage on course hubs

Live-checked (4 requests, through `lib/storefront-fetch.js`, no User-Agent)
the four course hub pages for `application/ld+json` and its `@type`:

| Handle | ld+json present | Course type |
|---|---|---|
| `ap-csa-course` | yes | yes |
| `ap-networking` | yes | yes |
| `ap-csp-course` | yes | no (`BreadcrumbList` only) |
| `ap-cybersecurity-course` | yes | no (`BreadcrumbList` only) |

Confirms, live and today, the standing claim in `CLAUDE.md`: only
`ap-csa-course` and `ap-networking` carry Course schema. This is a template
or body change, not a title/description row, so it does not go into
`seed/seo-rewrites.js`; not filing a board task per this routine's scope.

## Morning report review stage

`npm run morning` ran successfully with `ADMIN_READ_KEY` (confirmed working,
as of 2026-09-23 per `CLAUDE.md`). Output: mode `dry_run`, 0 reports to
review since the last check (2026-09-25 09:52:27), 1 dismissed as junk in
that window. Nothing was written to the site; the credential is read-only by
design and cannot mark anything fixed. No mail sent (`REPORTS_TO` not
configured).

## Go deeper: College Board / competitor check

Skipped today in favor of the schema-coverage check above, to rotate the
"go deeper" focus rather than repeat the same checklist. No signal either
way to report.

## What changed

One repo file: this run note, recording a genuine P0 resolution the crawl
surfaced. No metadata row, no board task, no import, no code change.
