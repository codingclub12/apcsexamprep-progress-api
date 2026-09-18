# Daily site audit, 2026-09-18

Scheduled routine. Report only: no board tasks filed, nothing imported, no page
body touched.

## Why this ran locally instead of reading the scheduled job

`.github/workflows/site-audit.yml` had not fired for today as of 09:36 UTC
(last completed run was #25, 2026-09-17 14:02 UTC, shard 2/7). No run existed
to read, so this session ran the crawl itself, once, per the instruction to
never drive the storefront twice in one morning.

One accident along the way: an early `node scripts/site-crawl.js --help`
(checking for a help flag before the real run) has no such flag and started a
live, unbounded crawl instead. Killed within about a minute, before it wrote
any output or made a meaningful number of requests. The deliberate run below
is the only one that produced data.

Baseline used: the GitHub Actions artifact from run #25 (complete,
`aborted: null`, shard 2/7, 400 of 2115 URLs). Today's run: shard 3/7, 400 of
2113 URLs, 676 requests, 915s, complete (`aborted: null`, `truncated: null`),
so this is a valid baseline for tomorrow.

## Is anything on fire

One real P0, unchanged: the cyber 1.1 lab regression, now **7 consecutive
nights**, still with no open board task. This routine does not file one by
design, so saying it again: this needs a board task and a fix.

## P0

### Confirmed real: cyber 1.1 lab invisible buttons, night 7, still untracked

`#cyber-lab-11 .score-bar .score-num`, `.check-btn` and `.rubric-table th`
paint white text on `var(--purple)` / `var(--dark)`, neither of which is
declared anywhere in the page. Same defect as the 2026-09-03 incident (board
#202): 27 of 32 students in one class had no lab score that day, nothing
threw or logged. Regressed 2026-09-07 (`3518162`, moving the lab's grading
server-side to close an answer-key leak) when the rewrite dropped the
September 3rd CSS fix along with the old grader markup. No change since
yesterday's audit (PR #690), which called this the same thing at 6 nights.
Not filing a task per this routine's scope. Flagging again because a
one-week-old grading outage with nobody assigned is the kind of thing this
routine exists to keep surfacing.

- https://www.apcsexamprep.com/pages/ap-cyber-unit-1-lesson-1-lab

### Dismissed as a false positive: challenge-served 503

Crawler recorded one 503/12194-byte challenge response for
`ap-csa-unit-1-exam-objects-methods-expressions`. Reproduced by hand with a
single spaced request through `lib/storefront-fetch.js`: 200, 396499 bytes,
normal page. One 503 in 676 requests reads as the same bot-management
sensitivity `docs/site-crawl.md` already documents, not a standing outage.

## P1

### Dismissed as a false positive: "production running older code than main"

Crawler compared production (`b5e6b33`) against a stale local `origin/main`
ref (`1e896d0`, from 2026-09-13) because this session had not fetched before
running the crawl. `git fetch origin main` afterward confirms `origin/main`
is `b5e6b33`, matching production exactly. Same failure mode yesterday's
audit (PR #690) already named and warned about; recording it again because
it recurred on the very next local run.

### Real fixes, confirmed by recrawl: 10 stale-year pages resolved

The body-year-rewrite import (board #348, merged 2026-09-17) landed between
yesterday's baseline and today's crawl. All 10 pages recrawled tonight (they
were in the hot set from last night's P1s) and none still shows a stale-year
finding. Spot-checked nothing further live; the crawler's own recrawl is the
kind of re-derivable evidence this routine treats as real, per
`docs/nightly-crawl-playbook.md`.

- ap-computer-science-principles-practice-exam-2025, ap-csa-reference-sheet,
  ap-csa-ultimate-practice-exam, ap-csa-unit-1-exam-objects-methods-expressions,
  ap-csa-unit-2-complete-study-guide, ap-csa-unit-3-complete-study-guide,
  ap-csa-unit-3-practice-exam-part-2, ap-csp-bi2-overflow-roundoff,
  ap-csp-reference-sheet, ap-csp-unit-5-cybersecurity-complete-2025-study-guide

### Real fix, confirmed live: dead product page back up

`ap-csa-flashcards-unit-4` was `dead-page` (P0) in the baseline. Reproduced
by hand: 200, 371710 bytes. Resolved, but the page now surfaces a new
`stale-year` P1 (it can be read again, and its content says 2025-2026), so
it moves from one finding to the other rather than clearing outright. Also
resolved: two `broken-internal-link` findings on
`ap-networking-lesson-3-5-firewalls-traffic-filtering` and
`intro-java-lesson-1-5-parameters-and-return-values`, both recrawled and
clean.

### Unchanged, standing (25 nights)

233 pages still advertise 2025-2026. No new pages joined the list today.
`ap-csa-teacher-superpack-free-preview` is still under the 20000-byte
truncation floor (10109 bytes), unchanged in shape from prior nights.

## P2 / P3

409 P2, 35 P3, all previously-seen kinds (`h1-duplicate`, `h1-is-title`,
`title-overlong`, `meta-scraped`, `brand-doubled`). Counts moved with the
shard rotation (shard 2/7 to 3/7); no new kind appeared. Not verified
individually per this routine's scope.

## Totals

4 P0, 244 P1, 409 P2, 35 P3. 168 new since last night, 22 resolved. Of the
"new": 1 P0 and 2 P1 are the false positives above; the rest are shard
rotation on already-known P2/P3 kinds. Of the "resolved": 1 P0, 10 P1
`stale-year`, and 2 P1 `broken-internal-link` are real (above); the
remainder is shard-rotation noise on P2/P3 counts.

## Correction to this routine's own standing-findings list

The task prompt's 2026-08-26 standing list still says "robots.txt serves a
1-byte body." Checked live today: 200, 7787 bytes, the full Shopify default
rule set plus explicit bot blocks. This has been fixed since
`APCSExamPrep-theme@90c36ea` (2026-09-02) and the 2026-09-06 daily audit
already recorded the correction. Repeating it here because the prompt
template itself has not been updated in three weeks and the next session
reading only the template would call this news.

## Morning report review (step 6)

`npm run morning` exits 2: "no admin credential." Neither `ADMIN_READ_KEY`
nor `ADMIN_KEY` is on this environment, exactly as expected per
`docs/handoffs/Site-Assistant-Report-First.md`. Not routing around it, not
filing anything for it. 0 reports reviewed.

## Rotation: collections without a meta description

8 of the 10 storefront collections serve no meta description at all (checked
live, single spaced requests): `ap-csp`, `ap-csa`, `live-events`,
`flashcards`, `frq`, `practice-exams`, `quick-reference`, `bundles`.
`ap-csa-premium-frq-solutions` (90 chars) and `tutoring` (235 chars) both
already have one.

This is not new work: `seed/seo-rewrites.js` already carries authored,
convention-compliant rows for 7 of the 8 (all but `live-events`), evidently
written in an earlier session and never imported. `live-events` has no row,
and that tracks: it is one of the two collections (with `tutoring`) tied to
board #76, the open DECISION on whether the 3 tutoring products stay in
scope, so investing in its SEO copy ahead of that call would be the kind of
thing worth re-doing. Not adding a row for it today, and not regenerating or
importing the existing 7 per this routine's scope (no imports). Worth
someone picking the existing sheet up: it has been sitting authored and
unshipped since before this session touched it.

## Evidence

- Today's crawl: `/tmp/today.json` (session-local, not committed).
- Yesterday's baseline: GitHub Actions artifact `site-audit-25` (run
  35230894853).
- Live spot checks via `lib/storefront-fetch.js`, single and spaced:
  `ap-csa-unit-1-exam-objects-methods-expressions` (200, 396499 bytes),
  `ap-csa-flashcards-unit-4` (200, 371710 bytes), `robots.txt` (200, 7787
  bytes), all 10 collection pages (200 each).
- `git fetch origin main` at time of writing: `b5e6b33`, matching production.

## Still open

- The cyber 1.1 lab regression needs a board task and a fix. 7 nights now.
- `seed/seo-rewrites.js` already has 7 ready-to-ship collection description
  rows sitting unimported.
- Whether the scheduled `site-audit.yml` job's queueing delay is worth its
  own fix stays outside this routine's scope; it is the reason this session
  crawled locally again today instead of reading a summary.
- Several earlier daily-audit PRs (#659 through #690) remain open; not
  reviewed or acted on by this routine.
