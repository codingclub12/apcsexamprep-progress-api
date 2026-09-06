# Daily site audit, 2026-09-06

Read-only routine: crawl and report, no board tasks, no imports.

## What ran

`.github/workflows/site-audit.yml` had not fired for today at session start (its
last completed run was #11, 2026-09-05 12:16 UTC, shard 4/7; the 09:00 UTC cron
appears to actually land around 12-13 UTC most days, not at 09:00). Rather than
crawl locally, this session dispatched the real workflow
(`workflow_dispatch`, run #12) so the baseline cache and job summary stay on the
canonical path. A local `node scripts/site-crawl.js` attempt made first died on
a transient `sitemap.xml` 503 (one request); a bare curl and a spoofed-UA curl
both returned 200 a few seconds later, so this was not the known UA-inversion
bug (board #172), just a blip.

Run #12: shard 5/7, 400 of 2095 sitemap URLs, 675 requests, 813s.
`aborted: null`, `truncated: null`, so this is a valid baseline for tomorrow.
API build at crawl time: `b84635e`.

## Is anything on fire

No. One P0, unchanged, now 9 nights old.

## P0 (1, unchanged, 9 nights)

`ap-cyber-unit-1-frq-practice` still carries a graded `data-item-id` widget with
no `apcs-score-reporter.js` loaded. First seen 2026-08-29. Nine nights is past
the "call it out by name" threshold in `docs/nightly-crawl-playbook.md`: either
this is not actually important, or it is being ignored, and either way it is
worth someone picking up rather than waiting for night 14. Reporting only, per
this routine's scope.

## New since last night

Nothing real. 158 "new" findings are the shard rotating 4/7 to 5/7, a different
seventh of the sitemap getting title/H1/meta checks it did not get last night,
same as every prior rotation. Confirmed no new finding *kind* appeared: today's
crawl produced the same 6 finding kinds as yesterday's (`reporter-missing`,
`stale-year`, `h1-duplicate`, `h1-is-title`, `meta-scraped`, `title-overlong`).
`brand-doubled` (present yesterday) did not fire today only because no URL
carrying it fell in today's shard; the crawler correctly reports 0 resolved
rather than claiming a fix it did not recheck.

Totals: 1 P0, 252 P1, 417 P2, 32 P3 (yesterday: 1, 252, 416, 43). The P2/P3
wobble is shard noise, not drift.

## Resolved

0 from the crawl itself (nothing in the hot set changed state).

One correction to the routine's own standing list, found by checking it
directly rather than repeating it: **`robots.txt` is fixed and has been for
four days.** The "1-byte body" line in this routine's standing-findings section
is stale. Checked live today:

```
curl -s https://www.apcsexamprep.com/robots.txt | wc -c
7787
```

Full Shopify default rule set plus a `Sitemap:` line plus explicit blocks for
GPTBot/ClaudeBot/anthropic-ai/CCBot/Google-Extended/Applebot-Extended/Bytespider,
deliberately omitting answer engines that cite and link back (OAI-SearchBot,
PerplexityBot, etc.) so they stay under the permissive default group rather
than being lifted into their own group. Shipped in
`APCSExamPrep-theme@90c36ea`, 2026-09-02, four days before this session ever
touched it. Not news today, but worth striking from anyone's mental standing
list; it has been carrying the wrong status for four audits.

## Standing findings, otherwise unchanged from the 2026-08-26 baseline

- `h1-duplicate` on the same shared contact-section template, 371 URL instances
  in today's tracked set, still pending the theme edit. `docs/site-audit-*`
  called this ~47 of 50 pages; the crawler's fuller sitemap coverage since then
  reads higher, same root cause, not a regression.
- `h1-is-title` (34 tracked instances) needs a body sheet, not filed this pass.
- The eight competing AP Cybersecurity overview URLs are still blocked on
  Search Console being connected (unchanged, per `docs/site-audit-2026-08-positioning.md`).
- The 243+ pages advertising 2025-2026 are still the largest P1 bucket; same
  root cause as every prior night, out of scope for a metadata-only pass.

None of these moved. Not renarrated further.

## Rotation: schema coverage on course hubs

Checked live today (single GET each, no UA, ~1.2s apart, 8 requests total):
`ap-csa-course`, `ap-csp-course`, `ap-cybersecurity-course`, `ap-networking`,
`csa-command-center`, `csp-command-center`, `cyber-command-center`,
`ap-networking-command-center`.

Only `ap-csa-course` and `ap-networking` carry `schema.org/Course` markup.
`ap-csp-course`, `ap-cybersecurity-course`, and all four command centers do
not. Identical to the 2026-08-26 finding in
`docs/site-audit-2026-08-positioning.md`. No change in 11 days; this is a
content gap (page-body JSON-LD), not something a metadata sheet fixes, so no
`seed/seo-rewrites.js` row from this.

## Metadata fixes this pass

None. Nothing found today rose to a `seed/seo-rewrites.js` row: the new/changed
findings are all page-body issues (stale year strings, duplicate H1s, missing
Course schema), which this routine is explicitly not scoped to touch. No sheet
generated, no draft PR against the theme repo.

## What is still open

- The `ap-cyber-unit-1-frq-practice` reporter gap, now 9 nights.
- Everything in "Standing findings" above, same blockers as 2026-08-26 (a
  theme edit, a body sheet, Search Console), minus robots.txt, which is done.

## Artifact

GitHub Actions run:
https://github.com/codingclub12/apcsexamprep-progress-api/actions/runs/34025406082
Report and `current-crawl.json`: artifact `site-audit-12` on that run (30 day
retention). This run note is the evidence of record for anything not already
captured by the workflow's own job summary.
