# Daily site audit, 2026-09-21

Read-only routine per the scheduled task: crawl and report, no board tasks, no
imports. One metadata fix went to `seed/seo-rewrites.js` and a draft PR, per
step 5 of the routine, which explicitly permits that.

## What ran, and why not a third crawl

Two things were checked before crawling anything:

1. **`.github/workflows/site-audit.yml`** ("Daily site audit") has NOT run yet
   for 2026-09-21 as of this session (checked via the GitHub API, no
   `in_progress` run either). Its cron reads `0 9 * * *` but every recent run
   actually started between 12:49 and 14:02 UTC, so a run landing later today
   is expected, not a miss. The last nine runs (2026-09-12 through 2026-09-20)
   all show `conclusion: failure`, and that is confirmed **by design, not
   broken**: `scripts/site-crawl.js` exits 1 whenever it finds any P0, and the
   workflow's own "Say why this run is red" step says so in its output
   (`"this run is red because it FOUND things, not because it failed"`). The
   separate health step, "Did the crawl collect a complete picture," passed on
   run #28 ("Baseline usable: true (complete)"), so the crawl itself is
   healthy. Board #231 ("LINKCHECK check failing: site-audit") is this same
   fact, already on the board; not re-filed here, no new task opened.
2. **The storefront had already been crawled once this morning.** The separate
   nightly-sweep job (`claude/nightly-crawl-log` branch, commit `a71633c`,
   2026-09-21 09:24:59 UTC) ran shard 6/7, 675 requests, no abort, no
   throttling wall, shortly before this session started. Running a second
   ~400-request local crawl on top of that would be exactly the "drive the
   storefront twice in one morning" failure mode this routine's own
   instructions warn against (shared-school-IP challenge risk), even though
   it is a different workflow than `site-audit.yml`. So this report is built
   from that already-completed same-day crawl plus yesterday's official
   `site-audit.yml` run (#28) for the parts the nightly shard did not cover,
   rather than from a third live crawl.

Production commit check (per step 2): `git fetch origin main` then compared;
`origin/main` is `d454c9c`, and `/api/health` on `progress.apcsexamprep.com`
reports `"commit":"d454c9c"` live. No staleness.

## Is anything on fire

Yes, one standing P0, unchanged, now night 10. Nothing new is on fire.

## P0 (1, unchanged, night 10)

**AP Cyber Unit 1 Lesson 1 lab's Check button, score badge and rubric header
are still invisible**, white text on an undefined CSS custom property
background. `#cyber-lab-11 .score-bar .score-num`, `.check-btn`, and
`.rubric-table th` all declare `background:var(--purple)` or `var(--dark)`
with `color:#ffffff`, and the page body still defines neither custom
property, so the background declaration is invalid at computed-value time and
the text is effectively invisible. Live page:
`https://www.apcsexamprep.com/pages/ap-cyber-unit-1-lesson-1-lab`. Fix is
unchanged from every prior night: reinsert the ten custom-property
definitions onto `#cyber-lab-11` in
`shopify/ap-cyber-unit-1-lesson-1-lab.html`, then re-import via Matrixify.
Boards #202, #203 and #264 all still read `status=done verified=NO`. This is
the same defect that left 27 of 32 students in one class with no lab score on
2026-09-03. Ten nights is past the playbook's five-night "call it out by
name" threshold: either this needs to jump the queue or someone should say
why it hasn't.

## New since last night

**One real finding, small.** `/pages/ap-csp-game-robot-director` served a
doubled brand suffix: `... | APCSExamPrep.com | APCSExamPrep.com`. Verified
live myself via `lib/storefront-fetch.js` (single GET, not a crawl) before
authoring a fix: the page has no `global.title_tag` override, so
`layout/theme.liquid` appends the brand to a Title field that already carries
it once. Same class of defect as the three CSP games already fixed in
`seed/seo-rewrites.js` (`binary-conversion-race`, `spot-the-bias`,
`two-sides`). The live description was also just the in-game instructional
text (`MOVE_FORWARD`, `ROTATE_LEFT`, `ROTATE_RIGHT`), not authored copy,
already flagged as a gap in `docs/meta-description-gaps.md`.

**Fixed as a metadata row, not just reported**, per step 5: added a row to
`seed/seo-rewrites.js`, regenerated the sheets with
`node scripts/seo-metadata-csv.js /tmp/imports/2026-09-21`, and parsed the
output CSV back to confirm it matches the source row byte for byte. New
title `Robot Director, an AP CSP Game` (30 chars, no brand), new description
(148 chars, authored from the actual game mechanic I read live: direct a
robot with move/rotate commands to a flag without leaving the grid). Draft PR
opened; nothing imported. This is metadata only (`SEO Title` /
`SEO Description` metafields), never the `Title` field itself, which
`scripts/seo-metadata-csv.js` refuses to touch (`FORBIDDEN_COLUMNS`).

**Everything else is shard rotation, not news.** The nightly-sweep shard 6/7
run (166 fresh-to-that-shard findings) and yesterday's `site-audit.yml` shard
5/7 run (167 fresh-to-that-shard findings) are both first looks at pages a
seven-night rotation had not reached yet, all already-tracked defect kinds
(`h1-duplicate`, `h1-is-title`, `stale-year`, `title-overlong`,
`meta-scraped`). No new finding *kind* appeared in either shard.

## Resolved since last night

None recrawled cleared. Both shards report zero resolved for anything they
actually recrawled.

## Standing findings, checked against the 2026-08-26 baseline

- **`h1-duplicate`**: 368 tracked instances as of last night's two shards
  combined (boards #72 and #247, both `status=done verified=NO`), same
  shared contact-section template root cause. Unchanged.
- **`h1-is-title`**: 30 tracked instances, needs a body sheet, no board task.
  Unchanged.
- **`robots.txt`**: still fixed (this line is carried forward correctly this
  time; no re-check needed today, last verified live 2026-09-18 at 7787
  bytes, 200).
- **The eight competing AP Cybersecurity overview URLs**: still blocked on
  Search Console being connected. Not proposing redirects.
- **`stale-year`**: 243 findings, oldest now 18 nights, still no board task.
  Called out by name again per the five-night rule; this is either not
  important or being ignored.
- **`truncated-body` on `/products/ap-csa-teacher-superpack-free-preview`**:
  11 nights, confirmed benign again (deliberate Google Drive redirect stub).

None of these moved from last night. Not renarrated further.

## Morning report review (step 6)

Ran `npm run morning` in this checkout. It exited 2 as expected: no
`ADMIN_READ_KEY` on this environment, and no workflow in the repo holds one
either. This is the documented state as of 2026-09-17, not a fault. The
morning review could not run for want of `ADMIN_READ_KEY`; nothing was
reproduced, nothing was fixed, no email sent. Per the routine's own
instructions, not routing around it and not raising it again beyond this one
line.

## Rotation: College Board CED watch

Varying from the 2026-09-06 pass (schema coverage on course hubs), which had
no reason to expect a change in two weeks. Ran `node scripts/ced-watch.js`:
all 17 first-party College Board sources read clean against last week, no
change. This updates `docs/ced-snapshot/index.json`'s `checked_at` bookkeeping
only (committed alongside, same as the crawler's own state file convention);
no content changed on any AP CSA, AP CSP, AP Cybersecurity or AP Networking
source page.

## Metadata fixes this pass

One: `ap-csp-game-robot-director`, described above. Draft PR opened against
`main`; nothing imported by this session.

## What is still open

- The AP Cyber Unit 1 Lesson 1 lab CSS regression, now 10 nights (see P0
  above).
- `stale-year`, 243 findings, 18 nights, no board task.
- `h1-duplicate` (368) and `h1-is-title` (30), boards #72/#247
  `verified=NO`.
- `site-audit.yml`'s own run for today had not fired as of this session; the
  09:00 UTC cron reliably lands 3.5 to 5 hours late. Not itself an audit
  finding, just a timing fact worth not re-discovering tomorrow.

## Artifacts

- Yesterday's official `site-audit.yml` run (#28):
  https://github.com/codingclub12/apcsexamprep-progress-api/actions/runs/35513379788
- Today's nightly-sweep crawl (already-completed, used in place of a third
  local crawl): `claude/nightly-crawl-log` branch, commit `a71633c`,
  `docs/runs/2026-09-21-nightly-crawl.md` on that branch.
- This session's PR (metadata fix): see PR description for URL.
