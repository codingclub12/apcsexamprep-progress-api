# Daily site audit, 2026-09-13

Read-only routine: crawl and report, no board tasks, no imports.

## What ran

`.github/workflows/site-audit.yml` had not fired for today as of session start
(09:36 UTC; its last completed run was #20, 2026-09-12 12:33 UTC). Rather than
wait on a delayed schedule, this session downloaded run #20's own
`current-crawl.json` artifact as the baseline and ran
`node scripts/site-crawl.js --budget 400 --max-minutes 30 --previous <that
artifact>` once, locally. The storefront was driven exactly once this
morning by this routine.

Shard 5/7, 400 of 2107 sitemap URLs, 675 requests, 899s, complete
(`aborted: null`, `truncated: null`, so this is a valid baseline for
tomorrow).

## Is anything on fire

Yes, still. One P0, standing for a second night, already fully diagnosed.

## P0: AP Cyber Unit 1 Lesson 1 Lab still has invisible Check buttons and score display

Not new. Yesterday's audit (PR #664) first caught this as a regression:
`#cyber-lab-11 .check-btn`, `.score-bar .score-num`, and `.rubric-table th`
all paint white text against `var(--purple)` / `var(--dark)`, and neither
custom property is declared anywhere on the page, so the background
declaration is invalid at computed-value time and drops, leaving white text
on white. This is the identical failure that cost 27 of 32 students a lab
score on 2026-09-03 (board #202), reintroduced when board #264 rebuilt the
page into a server-render mount point and never carried the palette
declaration forward.

Independently reconfirmed live by this session, outside the crawl, by fetching
the page directly through `lib/storefront-fetch.js` and grepping the returned
body: no `--purple` or `--dark` definition anywhere in 412KB of rendered HTML,
and all three flagged rules present verbatim. Today's crawl also reports it a
second time, now annotated `(2 nights)`, confirming it is standing rather than
intermittent.

The fix stays what yesterday's run note already specified: reinsert the
ten-property CSS custom-property block (values recorded in the 2026-09-03 run
note) into `shopify/ap-cyber-unit-1-lesson-1-lab.html` and re-import, then
extend `smoke:lab11palette` to check the committed page body itself rather
than only a frozen fixture, so a future unrelated body edit cannot drop it a
third time. Not fixed here: page-body edits are out of this routine's scope.
Pushed as an out-of-band notification to Tanner given it silently zeroes
student grades and has now gone two days unfixed.

## New since last night

158 new, all shard-rotation noise. Today's shard (5/7) covers a different 400
URLs than yesterday's (4/7), so pages carrying the same nine standing finding
kinds (`stale-year`, `h1-duplicate`, `title-overlong`, `meta-scraped`,
`brand-doubled`, `truncated-body`, `h1-is-title`, plus the P0's
`css-var-invisible-text` / `css-var-undefined`) surface under new URLs. No new
finding *kind* appeared. Confirmed by diffing the finding-kind set against
yesterday's artifact: identical nine kinds both days.

## Resolved since last night

None. Yesterday's crawl (shard 4) claimed 3 resolutions on pages it revisited;
today's shard (5) covers a different 400 URLs and correctly claims none.

## Standing findings, checked against the 2026-08-26 baseline

- `h1-duplicate` on ~47 of 50 pages: still the shared contact-section
  template, still pending the theme edit. Unchanged.
- `h1-is-title`: still open, still a page-body fix out of this routine's
  reach. Unchanged.
- `robots.txt`: reconfirmed live with a fresh fetch, 7787 bytes. Still fixed.
- The eight competing AP Cybersecurity overview URLs: still blocked on Search
  Console being connected (last reconfirmed 2026-09-11). Not proposing a
  redirect.

## Rotation: new College Board announcements for AP Cybersecurity / AP Networking

Did not re-fetch College Board directly. `.github/workflows/ced-watch.yml`
already runs this exact check weekly against 15 first-party College Board
sources and is the more polite way to ask the question; re-fetching the same
pages by hand today would be a second, redundant crawler against a site that
already tells us when it changes. Its last completed run (#4, 2026-09-07)
reported "nothing changed (15 sources): all 15 first-party College Board
sources read clean against last week." That run is six days old; the next
weekly firing is due around 2026-09-14. Nothing to report today beyond that
status.

## Observation: live API health self-check shows two non-zero flags

Not part of the crawl. While checking `/api/health` to rule out a stale
deploy (production serves `1e896d0`, matching `main`, so no lag), the response
itself carries `reporters.ok: false` (9 activities, 9 completions affected,
spread across ap-csa Unit 1 and ap-cybersecurity Units 3 to 5) and
`prices.ok: false` (1 mismatched column, `ap-cybersecurity` 3.2 exercise-1,
authored 6 points vs 5 observed, affecting 1 student). Recording this because
it is a live, self-reported signal this session happened to see, not because
this routine investigated it. Whether either is a known standing condition or
new is unestablished; a session with API/data scope should check history
before treating it as news.

## Metadata: no new row this pass

Today's rotation on `GET /collections.json` found the same two known gaps as
prior audits (`live-events` no description, `tutoring` excluded pending board
decision #76, `ap-csa-premium-frq-solutions` excluded, still 0 products). The
`live-events` fix already has a row in `seed/seo-rewrites.js` on the open,
unmerged PR #659 from 2026-09-11; adding it again here would conflict with
that PR rather than duplicate useful work, so nothing was added. Checked
`ap-csa-premium-frq-solutions`'s product count directly: still 0, still
nothing to honestly describe.

**Five open, unimported daily-audit PRs are now sitting on this repo**: #579
(09-07), #619 (09-08), #642 (09-09), #659 (09-11), #664 (09-12), each carrying
a `seed/seo-rewrites.js` row and generated sheets that never landed on `main`.
This is now six days of accumulated, reviewable-but-unactioned metadata fixes.
Import is a human decision and not filed as a board task per this routine's
scope, but flagging the growing count because a sixth session generating a
seventh sheet against a seed table that still lacks the first five rows is
how a duplicate row gets written by accident.

## What is still open

- The Unit 1 Lab palette regression (P0 above), two nights standing.
- Everything in "Standing findings" above except robots.txt.
- The `/api/health` `reporters.ok` / `prices.ok` flags, unestablished as new
  or standing.
- Five open, unimported SEO-sheet PRs (`#579`, `#619`, `#642`, `#659`,
  `#664`).

## Artifact

- Today's crawl JSON: `/tmp/today.json` (899s, complete, shard 5/7),
  downloaded baseline `/tmp/site-audit-20/current-crawl.json` from GitHub
  Actions run 34694018772 (site-audit-20 artifact).
- Live verification of the P0: direct fetch of
  `https://www.apcsexamprep.com/pages/ap-cyber-unit-1-lesson-1-lab` via
  `lib/storefront-fetch.js`, grepped for `--purple` / `--dark` definitions
  (none found) and the three flagged rules (all present).
- `robots.txt` byte count: 7787, fetched live.
- `/api/health`: fetched live, full JSON recorded above.
- `ced-watch.yml` run #4 (2026-09-07): "nothing changed (15 sources)".
- This run note is the artifact; no code or metadata changes this pass.
