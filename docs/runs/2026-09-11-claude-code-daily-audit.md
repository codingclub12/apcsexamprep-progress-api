# Daily site audit, 2026-09-11

Read-only routine: crawl and report, no board tasks, no imports.

## Is anything on fire

No. Zero P0. Both of yesterday's P0s are gone.

## What ran

`.github/workflows/site-audit.yml` had not fired for today at session start (its
last completed run was #18, 2026-09-10 13:16 UTC, and the 09:00 UTC cron has been
landing several hours late all week, same drift the 2026-09-06 audit already
noted). Rather than dispatch the workflow, this session pulled the artifact from
run #18 (`current-crawl.json`, `site-audit-18`) to use as tonight's baseline and
ran `scripts/site-crawl.js` locally, once, against it.

```
node scripts/site-crawl.js --out /tmp/today.json --previous /tmp/yesterday.json \
  --budget 400 --max-minutes 30
```

Shard 3/7, 400 of 2103 sitemap URLs, 676 requests, 898s. `aborted: null`,
`truncated: null`, API build `3206ced`. The storefront was driven once this
morning, matching the routine's own rule.

## New since last night

168 raw findings, almost all shard rotation (today's 400 URLs are a different
seventh of the sitemap than yesterday's, so `stale-year` and `h1-duplicate` hit a
different set of pages). Two new finding *kinds* appeared, both checked by hand
and both false positives, not real defects:

- **`api-stale-deploy`: not real.** The crawler compares production's served sha
  against the local `origin/main` git ref, and this session's checkout had not
  been fetched since clone, so it compared production's current commit (`3206ced`)
  against a week-old cached ref (`5282fc5`, from 2026-09-04). Checked live: `curl
  https://progress.apcsexamprep.com/api/health` right now reports `3206ced`, and
  GitHub's actual `main` HEAD (via the API, not a local ref) is also `3206ced`.
  Production and main are in sync. This is an artifact of running the crawler
  from a stale local checkout rather than a real deploy lag; the GitHub Actions
  version of this job does a full `fetch-depth: 0` checkout each run and would
  not have this problem.
- **`truncated-body` on `/products/ap-csa-teacher-superpack-free-preview`: not
  real, it's yesterday's shipped change.** 10109 bytes, confirmed live with a
  fresh `curl`, matches exactly. Board task 309 (2026-09-10,
  `docs/runs/2026-09-10-claude-code-free-preview-drive-redirect.md`) turned this
  product into a bounce-to-Google-Drive page on purpose, and its own live check
  recorded the same 10109 bytes as the expected post-deploy size. The crawler's
  blanket 20000-byte floor doesn't know about this one deliberately short page.
  Also explains the three findings that resolved on this same URL below:
  `h1-duplicate` and `title-overlong` were properties of the old product
  template, which no longer renders here.

## Resolved since last night

Both P0s from last night, confirmed by recrawl (both in the hot set):

- `https://www.apcsexamprep.com/pages/ap-csa-teacher-superpack` no longer serves
  a challenge.
- `https://www.apcsexamprep.com/pages/ap-csp-course-bi1-collaboration` no longer
  serves a challenge.

Plus, on the drive-redirect product page above: `h1-duplicate`,
`title-overlong`, and both `slow` findings (page-specific latency, most likely
noise, not tied to any shipped fix).

## Standing findings, unchanged from prior audits

- **The stale-year block is still the largest P1 bucket**: 243 pages advertise
  2025-2026 (18 consecutive nights), plus smaller buckets carrying 2025-26 and
  2025-2026 variants on 6 more pages. Same root cause as every prior night,
  metadata-only where it lives in a title/description and out of this routine's
  reach where it's in the page body (most of the 243). Not re-verified page by
  page tonight; the crawl already rechecked every URL in its shard.
- `h1-duplicate` on the shared contact-section template (homepage plus several
  blog and page URLs), still pending the theme edit. Unchanged.
- `h1-is-title` still needs a body sheet. Unchanged.
- `robots.txt` is fixed (has been since 2026-09-02, per the 2026-09-06 audit
  correction). Not re-checked tonight, striking it from future standing lists
  per that note.
- The eight competing AP Cybersecurity overview URLs are still blocked on Search
  Console being connected. Confirmed still unconnected as of today's competitor
  analysis (`docs/competitor-analysis-2026-09.md`, board 312, same session
  window as this audit).

## Rotation: collections with no meta description

Checked live today (`GET /collections.json`, one request): 10 collections exist,
all 10 have empty `body_html`. `seed/seo-rewrites.js` COLLECTIONS only covered 7
of them (added 2026-08-26 per its own comment). The 3 missing:

- **`live-events`** (8 products: FRQ and written-response bootcamps/walkthroughs
  with Tanner Crow): added a row this pass, see below.
- **`ap-csa-premium-frq-solutions`**: 0 products in it. Writing promotional copy
  for an empty collection would describe content that is not there, which is
  worse than no description. Not added. Worth a human decision on whether to
  populate it, redirect it, or unpublish it; not filed as a task per this
  routine's scope.
- **`tutoring`** (3 products): the digest already carries `#76 DECISION: are the
  3 tutoring products in the discontinue scope?`, open and unresolved. Writing
  new SEO copy for a collection whose products may be discontinued is premature.
  Not added. This is the reason, not an oversight.

## Metadata fixes this pass

One row added to `seed/seo-rewrites.js` COLLECTIONS (`live-events`), sheets
regenerated with `node scripts/seo-metadata-csv.js imports/2026-09-11`. Validated
before writing:

- `seo-metadata-csv.js`'s own row rules passed (title/description length,
  no em-dash, no brand, no stale school year).
- Parsed the generated `imports/2026-09-11/seo-collections.csv` back and diffed
  every field against `seed/seo-rewrites.js`: byte-identical round trip, 8 rows
  in the sheet, 8 rows in the source, no handle in one file missing from the
  other.

57 records across 3 sheets total (36 pages, 13 products, 8 collections); only the
collections sheet actually changed content versus what a regeneration would have
produced yesterday, since PAGES and PRODUCTS were untouched this pass.

## What is still open

- Everything in "Standing findings" above.
- The empty `ap-csa-premium-frq-solutions` collection and the `tutoring`
  decision block, both flagged above rather than solved.
- `#85` gradebook rollup (bleeding, unrelated to this crawl, already tracked).

## Artifact

This session's crawl ran locally rather than through the Action, so there is no
new `site-audit-N` run to link. Evidence for tonight:

- Yesterday's baseline: GitHub Actions run
  https://github.com/codingclub12/apcsexamprep-progress-api/actions/runs/34481570980,
  artifact `site-audit-18`.
- `api-stale-deploy` false positive: live `curl` of `/api/health` (`3206ced`) and
  `mcp__github__get_commit` on `main` (`3206ced7f0018faaf53da5a3004c03e7ef26948f`),
  both checked during this session.
- `truncated-body` false positive: live `curl` of the product URL, 10109 bytes,
  cross-referenced against `docs/runs/2026-09-10-claude-code-free-preview-drive-redirect.md`.
- Collections gap: live `GET /collections.json` and per-collection
  `products.json` fetches, this session.
- This pull request, carrying the `seed/seo-rewrites.js` edit and the
  `imports/2026-09-11/` sheets, is the artifact for the metadata fix.
