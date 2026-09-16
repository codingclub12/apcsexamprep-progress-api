# Daily site audit, 2026-09-16

Read-only routine: crawl and report, no board tasks, no imports.

## What ran

`.github/workflows/site-audit.yml` had not fired for today at session start
(checked 09:36 UTC; its last completed run was #23, 2026-09-15 14:05 UTC,
shard 7/7, "failure" only because it found real P0/P1 findings, per its own
annotation step). Downloaded run #23's `current-crawl.json` artifact as the
baseline and ran the crawl locally, once:

```
node scripts/site-crawl.js --out /tmp/today.json --budget 400 --max-minutes 30 \
  --previous /tmp/yesterday.json
```

Shard 1/7, 400 of 2111 sitemap URLs, 675 requests, 916s. `aborted: null`,
`truncated: null`, API build `49adfc9`. The storefront was driven once this
morning (plus a handful of individual page/API GETs for verification, listed
below, matching the pattern every prior daily audit has used).

## Is anything on fire

Yes, still, and it is not new. **3 P0, all on one page, standing for 5
nights.**

## P0: AP Cyber Unit 1 Lesson 1 Lab still has invisible Check buttons and score display

`#cyber-lab-11 .score-bar .score-num`, `.check-btn`, and `.rubric-table th`
all paint white text (`#ffffff`) against `var(--purple)` or `var(--dark)`,
and neither custom property is defined anywhere on the page. An undefined
`var()` is invalid at computed-value time, so the whole background
declaration drops and the text sits on whatever is behind it. This is the
identical failure that cost 27 of 32 students a lab score on 2026-09-03
(board #202): nothing throws, logs, or fails, the student just cannot see
the button or their score.

This is not new tonight. Yesterday's crawl found it at "4 nights," tonight's
at "5 nights." Prior daily-audit run notes (2026-09-12 through 2026-09-15,
PRs #664, #665, #674) already traced the cause: board #264 rebuilt the page
into a server-render mount point and the rebuild dropped the 2026-09-03
palette fix. The 2026-09-13 note records that this was "pushed as an
out-of-band notification to Tanner" already, given it silently zeroes
student grades. Five nights later it is still live. Reporting only per this
routine's scope; not filing a board task, since #202/#264 already exist and
name it.

## New since last night

159 raw findings, 1 resolved (per the crawler's own delta). Checked what is
real rather than shard noise (today's shard 1/7 covers a different 400 URLs
than yesterday's 7/7, so `stale-year`, `h1-duplicate`, `meta-scraped`, and
`title-overlong` hit a different slice of the site, same as every prior
rotation). Two things needed checking by hand:

**`api-stale-deploy` fired and is not real.** The crawler reported
"production serves `49adfc9`, which is 8.7h old; main is `1e896d0`." This
session's local git clone had not been fetched since checkout, so its
`origin/main` ref was several days stale (`1e896d0` is the commit from
2026-09-13's site-audit run, not current `main`). Checked directly:

```
git fetch origin main && git log --oneline -1 origin/main   ->  49adfc9
curl https://progress.apcsexamprep.com/api/health            ->  "commit":"49adfc9"
.github/workflows/deploy-drift.yml run #441, 05:24 UTC today  ->  success, head_sha 49adfc9
```

Production, `origin/main`, and the independent 30-minute deploy-drift check
all agree on `49adfc9`. Production is current; this is the same
stale-local-checkout artifact every prior local run of this routine has hit
(2026-09-07, 08, 09, 11, 14 run notes all record the identical false
positive). Not a real finding.

**The 1 "resolved" is not itemized by the crawler and is most likely shard
noise as well** (a finding tied to a URL that simply is not in today's
shard), consistent with the caveat in the 2026-09-06 run note. Not claiming
a fix from it.

No new finding *kind* appeared beyond the standing set.

## Verified false alarm in the crawler itself, not a site defect

`intro-java-lesson-5-2-index-and-length` was flagged `meta-scraped`, but its
description is not scraped furniture: "Why the last index of a Java array is
length minus one, why length has no parentheses, and how to read an
ArrayIndexOutOfBoundsException." That is an authored, on-topic, correctly
sized description. It tripped the crawler's fourth `looksScraped` marker
(`/[A-Z][a-z]+(?:[A-Z][a-z]*){3,}/`, meant to catch concatenated nav labels
like `HubsCyberCSPCSANetworking`) because `ArrayIndexOutOfBoundsException` is
itself four-plus CamelCase segments run together with no spaces, and it is a
real Java identifier, not scraped nav. Not fixed here (`lib/site-crawl.js`
is the crawler's own code, out of a metadata-only pass's scope), but worth
naming precisely so a future pass does not "fix" a page that already reads
well, and so whoever next touches `looksScraped` knows the false-positive
class: legitimate CamelCase technical vocabulary (Java/API class and
exception names) in an otherwise-good description.

## Standing findings, unchanged from the 2026-08-26 baseline

- `h1-duplicate` on the shared contact-section template, still pending a
  theme edit.
- `h1-is-title` needs a body sheet, not attempted here.
- `robots.txt` has been fixed since 2026-09-02; not a standing issue.
- The eight competing AP Cybersecurity overview URLs are still blocked on
  Search Console being connected.
- The 2025-2026 stale-year text remains the largest P1 bucket (243+ pages),
  page-body content, out of this routine's metadata-only reach.
- `ap-csa-teacher-superpack-free-preview` product body, 10109 bytes, under
  the 20000-byte floor, standing 6 nights.

None of these moved. Not re-narrated further.

## Go deeper (this pass): College Board and competitor check

Web search only, no additional storefront requests. Nothing changes anything
on the site:

- AP Cybersecurity: confirmed nationwide nothing beyond what
  `docs/ced-snapshot/` already has. First national exam May 2027; Cisco
  partnership; 2025-26 pilot reached 3,100 students across 183 schools.
- AP Networking: confirmed as entering its third and final pilot in 2026-27,
  restricted to prior pilot schools, national launch 2027-28. Matches this
  repo's existing CED snapshot exactly.
- Competitor landscape: JuiceMind, CodeHS, and UTeach are the three named AP
  Cybersecurity curriculum competitors for 2026-27. JuiceMind in particular
  is running comparison content ("Best AP Cybersecurity Curriculum") that
  ranks alongside our own course pages. Informational only; no pricing or
  positioning decision is this routine's to make.

([College Board AP Cybersecurity](https://apcentral.collegeboard.org/courses/ap-cybersecurity),
[AP Networking pilot](https://apcentral.collegeboard.org/courses/ap-career-kickstart/pilots),
[JuiceMind comparison post](https://juicemind.com/post/best-ap-cybersecurity-curriculum-high-schools))

## The bigger story: eight open daily-audit PRs, and a confirmed duplicate

This is the most consequential finding tonight, ahead of any single row.

**Eight draft PRs from this exact routine have been open, unreviewed, and
unimported since 2026-09-07: #579, #619, #642, #659, #664, #665, #669, #674.**
The 2026-09-13 run note flagged five by name. The 2026-09-15 run note flagged
eight by name and asked for a human decision: import the backlog in bulk, or
say why not. As of this morning, still zero merged, zero imported, and the
count has not moved in two days only because no session added a ninth
between 09-15 and today, not because anything was resolved.

**The predicted cost already landed.** PR #579 (2026-09-07) added
`seed/seo-rewrites.js` rows for `ap-csa-lesson-4-2-introduction-to-using-data-sets`,
`ap-csa-lesson-4-4-traversing-arrays`, and `ap-csa-lesson-4-5-algorithms-with-arrays`.
PR #669 (2026-09-14), one week later, independently found the same three
pages still carrying scraped descriptions (because #579 was never merged, so
#669's session started from a `main` that still lacked the fix) and added
the same three rows again, with slightly different wording. Two sessions did
the same work, seven days apart, and neither could see the other's PR. This
is the exact failure mode `CLAUDE.md` names for the board's claim discipline
("three sessions rebuilt the same mojibake detector... none of the three had
claimed anything"), now reproduced in this routine's own PR queue.

This pass checked every one of the eight open PRs' diffs before writing a
single new row (see "Metadata fixes this pass" below) specifically to avoid
adding a ninth duplicate. That check is not free, and it gets more expensive
every day the backlog grows unmerged.

**Not filed as a board task, per this routine's scope, but this needs a
human decision now, not another flag:** either merge the backlog (all eight
are metadata-only, `Command: MERGE`, no body/title/published column touched,
each already passed its own `smoke:seocsv` run), or say explicitly why not,
so future sessions stop re-deriving pages that are already fixed on an
unmerged branch.

## Metadata fixes this pass

Eight new `seed/seo-rewrites.js` PAGES rows, all cross-checked against the
diffs of all eight currently-open daily-audit PRs to confirm no handle
overlap (learned from the #579/#669 duplicate above):

- `ap-csa-lesson-2-6-comparing-boolean-expressions`
- `ap-csa-lesson-2-8-for-loops`
- `ap-csa-lesson-4-1-ethical-social-issues-data-collection`
- `ap-csa-lesson-4-11-2d-array-creation-and-access`
- `ap-csa-lesson-4-8-arraylist-methods`
- `ap-csa-lesson-4-9-traversing-arraylists`
- `ap-cybersecurity-lab-units-3-4`
- `ap-cybersecurity-unit-2-protecting-physical-spaces`

All eight had scraped Command Center nav furniture or breadcrumb glyphs as
their live meta description (verified by fetching each page directly,
through the same door the crawler uses, no User-Agent). Descriptions were
authored from each page's own "What You'll Learn" objectives or lab
narrative, not from the truncated scraped snippet.

`intro-java-lesson-5-2-index-and-length` was flagged by the crawl but is
**not** included: see "Verified false alarm" above, its description is
already good.

- `node scripts/seo-metadata-csv.js imports/2026-09-16`: 44 page rows (36
  previously shipped-on-`main` plus these 8; none of the other 8 open PRs'
  pending rows are in this branch's baseline, since none has merged).
- `npm run smoke:seocsv`: 35/35 passing, including the shipped-table checks
  against the 8 new rows.
- Parsed `imports/2026-09-16/seo-pages.csv` back and diffed all 8 new rows
  against `seed/seo-rewrites.js` field by field: byte-identical, 44/44 rows
  present in both.

Not imported. Importing is a human decision; this routine does not import.

## What is still open

- The Unit 1 Lab palette P0, now 5 nights standing, already escalated once
  out of band.
- **Nine open, unimported daily-audit PRs after this one lands**: #579,
  #619, #642, #659, #664, #665, #669, #674, plus this session's. A human
  decision on the backlog is overdue.
- Everything in "Standing findings" above.
- The crawler's own `looksScraped` false-positive class on CamelCase
  technical identifiers (see above), not fixed this pass.

## Artifact

- Yesterday's baseline: GitHub Actions run
  https://github.com/codingclub12/apcsexamprep-progress-api/actions/runs/34979240426,
  artifact `site-audit-23`.
- `api-stale-deploy` false positive: live `curl` of `/api/health`
  (`49adfc9`), `git fetch origin main` (`49adfc9`), and `deploy-drift.yml`
  run #441 (success, `49adfc9`), all checked this session.
- `meta-scraped` false positive: live fetch of
  `intro-java-lesson-5-2-index-and-length`, description read directly from
  the page.
- The 8 new metadata rows: live-fetched each page directly (no UA) before
  writing its description; `npm run smoke:seocsv` 35/35; parse-back diff
  against the generated sheet, byte-identical.
- The 8-PR backlog and the #579/#669 duplicate: read via GitHub's PR diff
  API against all 8 currently open daily-audit PRs.
- This session's PR, carrying the `seed/seo-rewrites.js` change and
  `imports/2026-09-16/`, is the artifact for tonight's metadata fix.
