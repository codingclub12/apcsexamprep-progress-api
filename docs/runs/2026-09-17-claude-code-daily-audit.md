# 2026-09-17, claude-code: daily site audit

Scheduled routine. Reports only: no board tasks filed, nothing imported, no
page body touched.

## Why this ran locally instead of reading the scheduled job

`.github/workflows/site-audit.yml` had not fired for today as of 09:36 UTC (its
cron is 09:00 UTC but the `verify-board` concurrency group has queued it as
late as 15:33 UTC on other mornings this week). No run existed to read, so this
session ran the crawl itself, once, per the instruction to never drive the
storefront twice in one morning. Whenever today's scheduled run does fire, it
will be a second live crawl this morning; that is a structural gap in the
schedule, not something this session can prevent.

Baseline used: yesterday's artifact from run #24 (2026-09-16, complete,
`aborted: null`). Today's own run did not finish clean (see below), so it
should not be trusted as tomorrow's baseline if the scheduled job also runs
and tries to use it.

## P0 - students blocked or graded work silently not recording

### Confirmed real: the cyber 1.1 lab's invisible buttons are back, 6th night, untracked

`#cyber-lab-11 .score-bar .score-num`, `.check-btn` and `.rubric-table th` all
paint white text on `var(--purple)` / `var(--dark)`, neither of which is
declared anywhere in the page. An undefined `var()` drops the whole
declaration at computed-value time, so the background disappears and the
button or score pill renders invisibly on the white card behind it. This is
the identical defect fixed on 2026-09-03 (board #202, `docs/runs/2026-09-03-
claude-code-cyber-lab11-palette.md`): 27 of 32 students in one class had no
lab score that day, and nothing threw, logged, or failed.

**It regressed.** `3518162` (2026-09-07, "The 1.1 lab moves to the server, so
its lock can be real") rewrote the page body to remove the grader and answer
key that used to sit in Shopify's page HTML, down to "the intro, the badges,
the scoring rubric, the progress bar and the nav footer." That rewrite did not
carry forward the September 3rd fix, a 623-character `#cyber-lab-11{...}`
rule that had been inserted directly into the old body. The new body has no
such rule, so the same bug is live again by the same mechanism, for an
unrelated and otherwise correct reason (closing a real answer-key leak).

Checked against the board: no open task names this page, this selector, or
this regression. #202 is presumably closed from the September fix and nothing
reopened it. This is not new information to the crawler, which has been
reporting it for 6 consecutive nights, but it appears to be information nobody
has acted on since the September 7 rewrite shipped. Not filing a task per this
routine's scope, but flagging it here plainly: worth a task and worth Tanner's
attention.

### New, and appears self-resolved: the crawler got rate-limited mid-run

Today's crawl stopped early: 5 throttled/429 responses across
`ap-csa-ced-explained`, `ap-csa-frq-2024`, `ap-csa-unit-1-course`,
`ap-csp-study-games-hub`, `ap-csp-written-response-walkthrough-premium`, plus
the homepage aborting the run at 289 of an intended ~400 requests (284 of
2115 sitemap URLs actually crawled, shard 2/7). 20 more URLs recorded 5-10s
time-to-first-byte in the same window, which reads like the same throttling
rather than 20 independent slow pages.

Checked by hand afterward with single, spaced-out requests through
`lib/storefront-fetch.js` (not a second crawl): `ap-csa-ced-explained` came
back 200 in 428KB, `ap-csa-unit-1-course` came back 200 in 399KB at 1.2s
TTFB, against 10.1s during the crawl. A third check, on
`ap-cyber-unit-1-lesson-1-lab` itself, hit another 429, so this is not fully
resolved or fully consistent. It reads as this morning's crawl (and this
session's own follow-up checks) tripping the same bot-management layer
documented in `lib/storefront-fetch.js`'s history of flipping behavior,
rather than a standing site-wide outage. No further live requests were made
after that third 429, to avoid compounding it.

**Practical effect: today's crawl is incomplete and not a safe baseline.**
Because it aborted, per the workflow's own gate logic (`aborted` must be
`null` to save a baseline) this run would not have been saved by the
scheduled job either. Tomorrow's session should still be able to use
2026-09-16's artifact if today's scheduled job also aborts.

## P1

- **"Production is running older code than main" - checked and dismissed,
  false positive.** The crawler's `api-stale-deploy` check compares the
  served commit against local `origin/main`, and this session's clone had not
  been fetched before the crawl ran, so it compared against a stale ref
  (`1e896d0`, from 2026-09-11) instead of the real one. `deploy-drift.yml`,
  the authoritative check for this per the crawler's own comments, ran at
  07:49 UTC today against `aa0614c` and reported success; `aa0614c` is what
  production is serving. Not a real gap. Worth noting only because this is an
  easy false alarm for a locally-run crawl to produce, and the next session
  running this routine locally should `git fetch origin main` first.
- The standing school-year findings (243+ pages advertising 2025-2026) are
  unchanged, 22-24 nights running, same as every prior report. No new pages
  joined the list today.
- `ap-csa-teacher-superpack-free-preview` still under the 20000-byte
  truncation floor (11286 bytes today vs 10109 yesterday; byte count moved,
  the underlying truncation did not). Standing, not new.

## What the crawler counted as "8 resolved" - none of it is a real fix

Reconstructed the delta with the same key the crawler uses
(`kind|url|evidence`). All 8 are artifacts of today's throttling, not fixes:

- 7 of the 8 are `stale-year`, `h1-duplicate`, `meta-scraped`, `h1-is-title`
  and `title-overlong` findings on the three pages that served a 429
  challenge today instead of their real body. The crawler could not see the
  actual page content to re-detect the issue, so the finding silently
  disappeared from today's set. The underlying pages were not touched.
- The 8th is the teacher-superpack truncated-body finding above: its byte
  count shifted by about 1KB, which changed the finding's dedup key, so the
  old fingerprint reads as resolved and a new one reads as fresh. Still
  truncated either way.

Worth recording so a future session does not read "8 resolved" as 8 real
fixes.

## Rotation: College Board / competitor check

AP Cybersecurity: College Board is expanding the course for 2026-27 with
vendor-specific Cisco (NetAcad) training alongside the standard curriculum,
per govtech.com and College Board's own AP Central pages. First national
exam is confirmed May 5, 2027, matching what's already recorded in this
repo's CLAUDE.md. No conflicting information found. This does not change any
number this repo currently states and nothing here needs a metadata change.

Competitor search for AP Cybersecurity exam prep turned up NetAcad (Cisco)
as the one third-party-adjacent resource; apcsexamprep.com's own pages
dominate the rest of the results. Nothing actionable.

## Metadata sheet

Nothing new rose to the level of a `seed/seo-rewrites.js` row today. All new
findings were throttling artifacts (above); all standing findings are
unchanged from the baseline this routine already tracks (school year, H1
duplicates, robots.txt, competing cyber overview URLs), and those are
explicitly out of scope until their respective theme or Search Console work
lands.

## Evidence

- Today's crawl: `/tmp/today.json`, `/tmp/claude-0/.../scratchpad/audit/crawl-report-today.txt` (session-local, not committed; ephemeral per repo convention for scratch crawl output).
- Yesterday's baseline: GitHub Actions artifact `site-audit-24` (run 35105360766).
- `deploy-drift.yml` run 35196505683, 2026-09-17T07:49:55Z, success, `aa0614c`.
- Manual live checks: `ap-csa-ced-explained` (200, 428576 bytes),
  `ap-csa-unit-1-course` (200, 399430 bytes, 1.2s), `ap-cyber-unit-1-lesson-1-lab`
  (429), all via `lib/storefront-fetch.js`, three total requests, single and
  spaced.

## Still open

- The cyber 1.1 lab regression needs a board task and a fix. This routine
  does not file one by design; flagging here for whoever picks it up next.
- Board #203 (a check for unresolvable custom properties generally) would
  have caught this regression at merge time instead of 10 days into it. Still
  open per the board.
- Whether the scheduled 09:00 UTC job's queueing delay (now regularly running
  5-6 hours late) is worth its own fix is outside this routine's scope, but
  it is the reason this session crawled at all instead of reading a summary.
