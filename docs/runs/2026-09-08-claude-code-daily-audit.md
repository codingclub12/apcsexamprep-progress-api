# Daily site audit, 2026-09-08

Read-only routine: crawl and report, no board tasks, no imports.

## What ran

`.github/workflows/site-audit.yml` had not fired for today by the time this
routine started (09:36 UTC, cron is 09:00 UTC). Every scheduled run in the
last two weeks has fired hours late (12:00 to 16:37 UTC, never near 09:00), so
waiting on it was not an option inside this routine's window. Downloaded run
#14's artifact (2026-09-07, shard 6/7, completed 14:55 UTC) as the baseline
and ran the crawl locally: `node scripts/site-crawl.js --out /tmp/today.json
--previous /tmp/yesterday.json --budget 400 --max-minutes 30`. Shard 7/7, 400
of 2099 URLs, 676 requests, exit code 0. One storefront crawl this morning,
matching the never-drive-it-twice rule.

## Is anything on fire

No, but the raw numbers said yes and needed checking. The crawl reported 2 P0
("Page in the sitemap is dead") and 1 new P1 ("production is running older
code than main"). All three were false positives from this run's own
environment, not the site, and all three were checked live before writing
this down rather than repeated as read.

**The 2 "dead" pages:** both `curl failed` (SSL_ERROR_SYSCALL), not an HTTP
error. Two identical SSL_ERROR_SYSCALL lines appear at the very top of this
run's own crawl log, before the report even starts, which is what actually
killed these two requests mid-crawl. Re-fetched both individually just now,
through the same `lib/storefront-fetch.js` door:

- `https://www.apcsexamprep.com/blogs/ap-csp-daily-practice/parallel-distributed-computing` -> 200, 348661 bytes
- `https://www.apcsexamprep.com/pages/ap-csa-unit-2-complete-study-guide` -> 200, 390197 bytes

Both live and fine. Not a P0, not a P1, not news.

**"Production is running older code than main":** the check does
`git rev-parse origin/main` against this container's local clone, which was
last fetched at container start and had gone stale at `5282fc5` while the
site's own PR #618 merged since. Ran `git fetch origin main` directly: it
moved `5282fc5..ddcf427`, and `ddcf427` is exactly the commit
`/api/health` already reported as running. Production is caught up with main;
the finding was comparing production against a stale ref in my own sandbox,
not against GitHub. This is why the GitHub Actions version of this job does a
fresh `fetch-depth: 0` checkout every run: this local run did not, and that
gap is worth remembering next time a local crawl is the fallback.

Net effect on the diff: the crawler's own delta reported 169 "new" findings
and 5 "resolved." 167 of the 169 new ones are ordinary shard rotation (shard
6/7 to 7/7: `h1-duplicate` 114, `title-overlong` 23, `h1-is-title` 21,
`meta-scraped` 6, `brand-doubled` 2, on pages the crawl had not looked at
since 6 nights ago). The other 2 are the dead-page false positives above. Of
the 5 "resolved," none is a real content fix: 2 are `stale-year` and
`h1-duplicate`/`title-overlong` findings that vanished only because those
same 2 pages could not be parsed this run (no body, no check), and 1 is the
`ap-cyber-unit-1-frq-practice` `widgets-regressed` finding clearing itself
the way a one-shot regression finding always does the night after it fires,
which is not the same as the page getting its widget back (see below).

So: a quiet night, once the crawl's own environment noise is subtracted.

## The one item still worth a human's attention

`ap-cyber-unit-1-frq-practice` has carried a reporter-missing P0 since
2026-08-28 or 08-29 (prior run notes, 9 to 12 nights running). On 2026-09-07
that P0 finding disappeared, and it is not because anyone shipped the
reporter: the page's one graded widget went from 1 to 0
(`widgets-regressed`, 2026-09-07 crawl), so there is no longer a graded
widget for a missing reporter to be missing on. Tonight's crawl confirms the
page still carries no graded widget (0 P0/P1 findings on it; only
`h1-duplicate` and `title-overlong`, both long-standing template issues).
This is the only page on the site built for Device Security Analysis
practice, the site's one graded FRQ type on the AP Cybersecurity exam, and it
has been silently empty of graded content for at least 2 nights. Not
something this routine's metadata-only scope can fix; flagging for whoever
owns cyber content next.

## Standing findings, checked against the 2026-08-26 baseline

- `h1-duplicate` (365 URLs in tonight's shard) and `h1-is-title` (33): same
  shared contact-section template and page-body issue as 2026-08-26. Still
  pending a theme edit and a body sheet respectively. Not news.
- `robots.txt`: **fixed**, not a standing issue any more. Confirmed live
  just now, 200, 7787 bytes of real directives (was a 1-byte body on
  2026-08-26; already noted fixed in the 2026-09-06 run note).
- The eight competing AP Cybersecurity overview URLs: still blocked on
  Search Console being connected; nothing to check without it.
- `stale-year` (250 URLs in tonight's shard, 14 nights running): this is now
  the single largest finding kind on the site and is NOT on the 2026-08-26
  standing list, which predates it. It is page-body text (advertises
  2025-2026 or 2025-26), out of this routine's metadata-only scope, and each
  night's count moving with the shard is expected, not new. Worth a body
  sheet on its own; not attempted here.

## Rotation: collections with no meta description

Checked live today (10 requests: sitemap.xml, sitemap_collections_1.xml,
then one GET per collection page, ~1.1s apart, no UA, through
`lib/storefront-fetch.js`): all 10 collections in `sitemap_collections_1.xml`.
8 of 10 serve no `<meta name="description">` tag at all (`ap-csp`, `ap-csa`,
`live-events`, `flashcards`, `frq`, `practice-exams`, `quick-reference`,
`bundles`), which means Google falls back to the sitewide `og:description`
("Free AP Computer Science A and CSP exam prep...") as the search snippet for
every one of them. `tutoring` and `ap-csa-premium-frq-solutions` are fine.

7 of those 8 already had rows in `seed/seo-rewrites.js`'s `COLLECTIONS` table,
added 2026-09-05 in the same pass that fixed 11 page descriptions (commit
`8f33797`). That pass generated and committed `imports/2026-09-05/seo-pages.csv`
but never generated a collections sheet, so those 7 rows have been sitting
correct-but-unshipped for 3 days, which is why they still read "no
description" live tonight. `live-events` was missing a row entirely, so even
a full import would have left 1 of the 8 unfixed.

**Fixed this pass:** added a `live-events` row to `seed/seo-rewrites.js`
(title 53 chars, description 154 chars, both within the house rules), then
regenerated all 3 sheets with `node scripts/seo-metadata-csv.js`. `npm run
smoke:seocsv` and `npm run smoke:seotitles` both pass (35 and 97 assertions).
Parsed `seo-collections.csv` back and diffed every cell against the source
table: byte-identical, 8 of 8 rows. Sheet committed at
`imports/2026-09-08-seo/seo-collections.csv`, on this repo's branch
`claude/jolly-bell-vit1ra`, as a draft PR for review. Importing the sheet into
Shopify via Matrixify is a separate human action this routine does not take.

## Metadata fixed this pass

1 collection row added (`live-events`); the other 7 collection rows were
already correct in `seed/seo-rewrites.js`, just never shipped as a sheet.
`node scripts/seo-metadata-csv.js` now emits 8 collection rows instead of 7.
No page or product rows changed.

## What is still open

- `ap-cyber-unit-1-frq-practice` has had no graded widget for at least 2
  nights (see above). Not board-filed by this routine per its instructions;
  worth a human's attention regardless.
- The 8 collection description rows (7 from 2026-09-05, 1 new today) are
  authored and validated but not yet imported into Shopify. Importing is a
  human action via Matrixify, out of scope for this routine.
- `stale-year` at 250 URLs in one shard alone is the largest standing
  finding on the site and needs a body sheet, not a metadata row.
- Everything else in "Standing findings" above, same blockers as prior
  nights: a theme edit for `h1-duplicate`, a body sheet for `h1-is-title`,
  Search Console for the eight competing cyber URLs.

## Artifact

- Seed change + sheet, this repo, branch `claude/jolly-bell-vit1ra`: draft PR
  (link below once opened).
- Crawl output for tonight, not committed (too large, and per convention this
  is the kind of scratch artifact that stays in the scratchpad): shard 7/7,
  400/2099 URLs, 2 P0 (both live-verified false), 251 P1, 411 P2, 44 P3.
- Yesterday's GitHub Actions baseline used for the diff: run #14,
  https://github.com/codingclub12/apcsexamprep-progress-api/actions/runs/34134328751
