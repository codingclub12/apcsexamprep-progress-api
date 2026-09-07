# Daily site audit, 2026-09-07

Read-only routine: crawl and report, no board tasks, no imports. One
metadata-only exception per the routine's own rules: SEO title and
description fixes for pages the crawl found, generated as a Matrixify sheet
and opened as a draft pull request, never imported by this session.

## What ran

`.github/workflows/site-audit.yml` had not fired for today by the time this
routine started (09:37 UTC, cron is 09:00 UTC; the last completed run was
#13, 2026-09-06 12:32 UTC, shard 5/7). Ran it locally instead, with that
run's artifact as `--previous`:

```
node scripts/site-crawl.js --out /tmp/today.json \
  --previous /tmp/yesterday.json --budget 400 --max-minutes 30
```

Shard 6/7, 400 of 2095 sitemap URLs, 675 requests, 907s. `aborted: null`,
`truncated: null`, a valid baseline for tomorrow. API build at crawl time:
`e390add`. Exit code 0: this is the first quiet-P0 night this routine has
seen.

**Incident during setup, unrelated to the crawl itself:** ran
`node scripts/link-graph.js --help` to check its flags before considering
it for today's deeper dive. `--help` is not a flag this script recognizes,
so it silently ran a real, unbudgeted, whole-sitemap crawl instead of
printing usage. Caught and killed after 96 live requests (about 90 seconds
at its 900ms delay). This is a second live-fetching process against the
storefront in the same morning, which the routine's own instructions say
not to do. It was read-only (no credential, no write), the volume was small
next to the crawl's own 675 requests, and no throttling or challenge was
observed on either process, but it should not have happened and the fix is
procedural: never invoke an unfamiliar script against the live storefront
to learn its flags, read the source instead.

## P0: zero, for the first time this routine has recorded

But the reason is worth the whole report by itself.

## The top story: the standing P0 did not get fixed, it disappeared

`ap-cyber-unit-1-frq-practice` has carried **Graded page loads no
reporter** for 10 straight nights (first seen 2026-08-28): one graded
`data-item-id` widget on the page, no `apcs-score-reporter.js` loaded to
report it. Tonight's crawl shows a different finding on the same URL:
**Page lost its graded widgets, 1 on the last run, none now.**

Live-verified just now, not just read from the crawl JSON:

```
data-item-id widgets on the page: 0
apcs-score-reporter.js loaded:    false
apcs-tracker.js loaded:           true (site-wide script, unrelated to grading)
mcq-item / cfu markup on page:    none
```

The page's own `updated_at` is `2026-09-06T16:51:33-05:00` (21:51 UTC),
which sits between yesterday's crawl (2026-09-06 12:32 UTC, widget still
present) and tonight's (2026-09-07 09:37 UTC, widget gone). Something
edited this page yesterday evening and the one graded widget it had did not
survive the edit. Searched both repos (`search_pull_requests`,
`search_commits`) for anything touching `frq-practice`, `unit-1-frq`, or
`credential-compromise` around that time and found nothing that matches;
this repo owns the reporter script, not the page body, and whatever changed
it left no trace in either repo's history that a keyword search could find.
Consistent with this repo's own CLAUDE.md: page bodies ship through
Matrixify or the chat-side pipeline, which does not always leave a
matching commit message here.

So the P0 count reads 0 tonight, and that is not the same as the problem
being closed. Before, a student could reach the page and lose an unrecorded
score. Now there is nothing graded on the page to lose. Whether that is a
deliberate edit (the widget was pulled pending a real fix) or an accidental
one (a body update clobbered it) is not something this read-only routine
can tell from outside Shopify. Flagging prominently because a P0-to-zero
night should not read as good news without this attached to it.

## Also new tonight, minor

`h1-duplicate` on `/pages/ap-networking-command-center` changed from 3 H1
elements (as of yesterday's crawl) to 2. Progress, not a resolution: still
duplicate H1s on a command center page. Command centers are in the hot set
every night regardless of shard, so this is a real, re-verified change, not
shard noise.

## Resolved: 1 real (the other is the P0 above, already covered)

The crawl's own delta reports 2 resolved and 158 new; both those raw
numbers include ordinary shard-rotation churn (a different seventh of the
site got title/H1/meta checks it did not get last night, per
`docs/site-crawl.md`). Filtered to findings whose URL was independently
re-crawled tonight (the crawler's own `resolved` rule, not a re-derivation
of it): exactly the 2 named above, `reporter-missing` (superseded by
`widgets-regressed`, not a true fix) and the `h1-duplicate` count drop on
the networking command center.

## Not real: `api-stale-deploy`

Tonight's crawl also flagged a new P1: "production serves `e390add`, which
is 10.7h old; main is `5282fc5`." Same false-positive pattern as every
prior local run of this routine: the crawler compares against this
container's cached `git rev-parse origin/main`, and the container had not
fetched since before this session started. Confirmed against both live
sources after fetching:

```
git fetch origin main && git log origin/main -1  -> e390add
curl https://progress.apcsexamprep.com/api/health -> "commit":"e390add"
```

Production and main agree. No drift. GitHub Actions checks out fresh each
run and would not hit this; it is specific to running the crawl from a
session clone with a stale local ref.

## Metadata fixed this pass

Shard 6/7 surfaced 3 pages with `meta-scraped` descriptions (breadcrumb and
nav text landing in the SEO Description field), all first-detected tonight,
none with an existing `seed/seo-rewrites.js` row: `ap-csa-lesson-4-2`,
`4-4`, `4-5` (Introduction to Using Data Sets, Traversing Arrays, Algorithms
with Arrays). Wrote authored descriptions from each page's own content
outline (`What You'll Learn` / heading structure), not from the truncated
scraped snippet the crawler flagged.

- `node smoke/seo-metadata-csv.js`: 35/35 passing, including the shipped
  table check against the file with these 3 rows added.
- `node scripts/seo-metadata-csv.js imports/2026-09-07`: 28 page rows (25
  previously in the file, plus these 3; the 09-05 daily audit's 11-row
  batch is in open PR #559, not yet merged, so it is not in this branch's
  baseline).
- Parse-back diff: read `imports/2026-09-07/seo-pages.csv` back and
  compared all 3 new rows against `seed/seo-rewrites.js` byte for byte. All
  3 matched exactly, no truncation.

Sheet: `imports/2026-09-07/seo-pages.csv` (28 rows), plus the unchanged
products and collections sheets regenerated alongside it. **Not imported**
by this session.

## Rotation: schema.org Course coverage on hub pages

Live-checked `<script type="application/ld+json">` `@type: Course` on
`ap-csa-course`, `ap-csp-course`, `ap-cybersecurity-course`,
`ap-networking`: only `ap-csa-course` and `ap-networking` carry it,
unchanged from the 2026-08-26 baseline and from PR #560's 2026-09-06
recheck across 8 hub pages. No drift. `ap-csp-course` and
`ap-cybersecurity-course` remain candidates for the same schema if a
future pass wants the rich-result eligibility, but that is a theme-side
change, not metadata, and out of scope for this routine.

## Standing findings, unchanged from the 2026-08-26 baseline (with one correction)

- **`robots.txt` is NOT the 1-byte body this baseline still names.** Fixed
  as of `APCSExamPrep-theme@90c36ea` (2026-09-02) and already corrected in
  yesterday's run note and PR #560. Reconfirmed live tonight: `curl -s
  https://www.apcsexamprep.com/robots.txt | wc -c` -> 7787, full ruleset
  plus a Sitemap line. Repeating the correction here only so this file's
  own "standing findings" section stops citing a byte count that has been
  wrong for 5 nights.
- `h1-duplicate` on the shared contact-section template: still the
  dominant P2, still pending the theme edit.
- `h1-is-title`: needs a body sheet, not filed this pass.
- The eight competing AP Cybersecurity overview URLs: still blocked on
  Search Console being connected.
- 243+ pages advertising 2025-2026 or 2025-26: still the largest P1 bucket
  by page count (250 across the three buckets tonight), same root cause,
  body content rather than metadata, out of scope for this pass.

## Also noticed, not news

`/api/health`'s `reporters: {ok:false, activities:11}` block is unchanged:
same 11 activities, same course list. Known, out-of-scope gap already
recorded in prior run notes.

Board task #231 (`LINKCHECK check failing: site-audit`) is the automatic
tracker for this crawl reporting itself red to the command center on a
night with real findings; expected per the workflow's own design, not
something this pass needs to act on.

## What is still open

- `ap-cyber-unit-1-frq-practice`: no graded widget on the page at all now,
  where 10 nights ago it had one with no reporter. Needs a human decision
  on Shopify (was this edit intentional), not a code fix from this repo.
- `ap-networking-command-center`'s h1-duplicate, improved but not resolved.
- Everything in "Standing findings" above except robots.txt.
- PRs #559 (2026-09-05 SEO batch, 11 rows) and #560 (2026-09-06 run note
  plus the robots.txt correction) are both still open and unreviewed;
  today's PR is a third in the same queue.

## Artifact

- Sheet, committed: `imports/2026-09-07/seo-pages.csv` (and the unchanged
  products/collections sheets alongside it)
- Source: `seed/seo-rewrites.js`, 3 new rows
- Today's crawl JSON: `/tmp/today.json` (not committed, matches the
  pattern of CI's own `current-crawl.json` cache artifact, not repo
  content)
- This run note is the evidence of record for what was found; the pull
  request is the evidence of record for what was proposed.
