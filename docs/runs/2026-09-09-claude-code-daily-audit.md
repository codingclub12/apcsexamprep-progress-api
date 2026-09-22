# Daily site audit, 2026-09-09

Read-only routine: crawl and report, no board tasks, no imports.

## What ran

`.github/workflows/site-audit.yml` had not fired for today at session start
(09:40 UTC; its last completed run was #15, 2026-09-08 13:13 UTC, shard 7/7,
success) and no run was queued or in progress. Per the routine's own rule
against driving the storefront twice in a morning, this session crawled
locally instead of dispatching a second run: `node scripts/site-crawl.js
--out today.json --previous yesterday.json --budget 400 --max-minutes 30`,
with yesterday's baseline pulled from artifact `site-audit-15` on run #15
(GitHub Actions artifacts, not a repo file) rather than re-crawling to get one.

Shard 1/7, 400 of 2099 sitemap URLs, 675 requests, 954s. `aborted: null`,
`truncated: null`, a valid baseline. API build at crawl time: `84228ac`.

## Is anything on fire

No. 0 P0. 253 P1, 408 P2, 40 P3.

## New since last night

161 fresh findings, all of them shard rotation noise across the four kinds
this rotation always produces when a new seventh of the sitemap gets looked
at (`meta-scraped`, `h1-duplicate`, `h1-is-title`, `title-overlong`), plus
one finding that needed checking and turned out false.

**`api-stale-deploy` fired and is not real.** The crawler said production
served `84228ac` while `main` was at `5282fc5`, a commit from 2026-09-04.
That check reads `origin/main` from local git, and this session's clone had
not fetched before the crawl ran, so the remote-tracking ref was five days
stale. `git fetch origin main` immediately after put `origin/main` at
`84228ac`, and a direct hit to `https://progress.apcsexamprep.com/api/health`
confirmed production serves `84228ac` too. Production and main agree;
nothing is behind. This is a hazard specific to running the crawler outside
CI (`site-audit.yml` does a full-history checkout every run, so its
`origin/main` is always current) rather than a defect in the check itself,
and worth remembering the next time this routine has to crawl locally.

No new finding *kind* otherwise. `brand-doubled` (present in yesterday's
output) did not fire today only because no URL carrying it fell in today's
shard, same non-story as every prior rotation.

## Resolved

1, and it was actually recrawled: `cyber-command-center` no longer carries a
duplicate H1 (`AP Cybersecurity Command Center` twice), gone after 8 nights.

## Standing findings, unchanged

- **Page advertises a school year that has ended** (252 tracked instances,
  the largest P1 bucket, up to 15 nights on the oldest): still the
  2025-2026 stale-year problem across ~243 blog and course pages. Page-body
  fix, out of scope for a metadata-only pass.
- **`h1-duplicate`** on the shared contact-section template (366 tracked
  instances). Theme edit, not filed this pass; unchanged root cause from the
  2026-08-26 baseline.
- **`h1-is-title`** (28 tracked instances) needs a body sheet, not filed.
- The eight competing AP Cybersecurity overview URLs are still blocked on
  Search Console being connected.
- `robots.txt` was fixed 2026-09-02 (`APCSExamPrep-theme@90c36ea`); this is
  a correction carried from the 2026-09-06 note, not news today.
- **Production stale-deploy check**: see above. Not a standing finding, a
  false alarm this session traced to its own git state.

## Rotation: collections with no meta description

Not checked in the last three audits (2026-09-04 did the College Board
check, 2026-09-06 did schema coverage). Checked all 10 live collections
directly for a `<meta name="description">` tag on the rendered page (single
GET each through `lib/storefront-fetch.js`, ~1s apart, plus one
`/collections.json` call, 11 requests total):

`ap-csa`, `ap-csp`, `bundles`, `frq`, `flashcards`, `practice-exams`,
`quick-reference`, `live-events` carry no meta description tag at all.
`tutoring` has one (a real description, matches decision #76 being
unresolved: nothing written for it today). `ap-csa-premium-frq-solutions`
has one too, though it reads as scraped pricing furniture rather than
authored copy; that is a `meta-scraped`-shaped defect of its own and out of
scope for today.

Seven of the eight empty collections already had pending, unimported rows in
`seed/seo-rewrites.js` from an earlier session (confirmed still pending by
checking the live pages, which still carry no tag). `live-events` did not
have a row. Added one: title and description only, no year in either string
so the fix does not go stale the way the products inside that collection
already have (its 8 live products are all named "2026" for events that have
already happened this year, e.g. `ap-csa-exam-bootcamp-2026`; that is a
product-title problem, not a metadata-description problem, and out of scope
for this routine, but worth a human noticing).

Rotation aside: the College Board / competitor check also got a light pass
today (web search, no storefront requests). Nothing that changes a page:
Cisco's AP Cybersecurity partnership is now targeting roughly 800 schools
for 2026-27 (up from the 183-school pilot), and AP Networking is confirmed
as entering its third and final pilot year in 2026-27, restricted to prior
pilot schools, with national launch in 2027-28. Both are consistent with
what `docs/ced-snapshot/` already has; no update needed there.

## Metadata fixes this pass

One row added to `seed/seo-rewrites.js` (`live-events` collection, no meta
description at all). Sheets regenerated with `node scripts/seo-metadata-csv.js
imports/2026-09-09`: 36 Pages rows, 13 Products rows, 8 Collections rows, 57
records across 3 sheets. Parsed all three back and diffed against
`seed/seo-rewrites.js` by hand (not just by the generator's own row checks):
byte-identical on every row, same row counts, no page appearing twice.
`npm run smoke:seocsv`: 35 passed, 0 failed, including the "shipped table
itself" checks against the new row.

Draft PR opened with the seed change and the three regenerated sheets. Not
imported: importing is a human decision per repo convention, and this
routine does not import.

## What is still open

- The 252-page stale-year problem, the contact-section H1, `h1-is-title`,
  and Search Console: all unchanged, all out of scope for a metadata pass.
- The seven previously-pending `seed/seo-rewrites.js` rows (six collections
  plus `live-events` as of today): authored, not yet imported.
- The `ap-csa-premium-frq-solutions` collection's scraped-furniture meta
  description, and the "2026" product titles inside `live-events`: noticed
  today, not filed as a task per this routine's scope, worth a human
  decision.

## Artifact

Local crawl, not a GitHub Actions run: `today.json` / `crawl-report.txt`
were generated in this session and are not committed (large, and this
routine's own artifact is this run note plus the PR). Draft PR:
seed/seo-rewrites.js + imports/2026-09-09/seo-{pages,products,collections}.csv,
this run note.
