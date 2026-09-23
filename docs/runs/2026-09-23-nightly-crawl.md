# 2026-09-23 nightly crawl

Shard 1/7, first shard of a new weekly rotation. 400 of 2,126 sitemap URLs, 674
requests, 19m7s, no abort, no throttling wall.

## Is anything on fire

Same fire as every night this week, still not fixed: the AP Cyber Unit 1 Lesson 1
lab's Check button, score badge and rubric header are still invisible, white text
on an undefined background. Now night 12. No new fire tonight.

## New tonight

Nothing new. All three P0s are the same known lab bug, on the same page, boards
#202/#203/#264, all still `status=done verified=NO`, checked directly tonight. The
one P2 `css-var-undefined` finding is the same page, same root cause, not a
separate bug.

Also checked the `api-stale-deploy` path directly, given it produced two false
alarms this week from stale local git state. Fetched `origin/main` fresh first
this time: tip is `0206a25`. Curled `https://progress.apcsexamprep.com/api/health`
directly: `"commit":"0206a25"`. Matches exactly, no lag, and the check correctly
produced no finding.

While reading that health response I noticed it also carries `reporters.ok:false`
(10 activities affected) and `prices.ok:false` (1 column, 1 student affected).
Neither is a site-crawl check and neither is new: `lib/health-integrity.js` has
been reporting this shape since at least 2026-09-01, `docs/reporter-gap-handoff.md`
documents the reporter side in detail, and it traces to board items already open
in the `closed/.../BLEED UNVERIFIED` bucket (#83, #84 among them). Flagging it here
because it is live evidence relevant to the mission this repo is mid-build on, not
because it is a crawl finding. Not verifying it further tonight; that is a
different job with its own history and its own document.

169 findings on tonight's shard show as "fresh" in the delta, and every one of
them is the ordinary shard-rotation pattern already described in every prior
night's note: `h1-duplicate` (365 total across the crawled set, boards #72/#247,
both `status=done verified=NO`), `h1-is-title` (27), `meta-scraped` (10),
`title-overlong` (38). These are first-time-compared instances of week-old,
already-boarded systemic issues surfacing on pages this shard had not looked at
before, not new defects. No `duplicate-title` brand-suffix doubling this shard,
unlike the last two nights; that pattern needs the specific pages that carry it,
which were not in tonight's slice.

## Resolved since last night

None. `delta.resolved` is empty for this shard.

## Still open

**P0, night 12: AP Cyber Unit 1 Lesson 1 lab's Check button, score badge and
rubric header are still invisible.** Same cause as every prior night:
`#cyber-lab-11` uses `var(--purple)` and `var(--dark)` with no definition block on
the page, so `background:var(--purple); color:#ffffff` is invalid at
computed-value time and the whole declaration drops. Fix is unchanged: reinsert
the ten custom-property definitions in `shopify/ap-cyber-unit-1-lesson-1-lab.html`,
then re-import via Matrixify. Boards #202, #203, #264 all `status=done
verified=NO`, checked directly tonight.

**`stale-year`, P1, 243 findings, oldest now at 20 nights, still no board task.**
Called out by name again per the playbook's five-night rule. Twenty nights in,
this reads as ignored rather than unimportant.

**`h1-duplicate` (365) and `h1-is-title` (27), boards #72 and #247 both
`status=done verified=NO`.** `meta-scraped` (10) and `title-overlong` (38), same
age range, no board task for either.

**`truncated-body` on `/products/ap-csa-teacher-superpack-free-preview`, now 13
nights.** Recrawled tonight, unchanged. Confirmed benign on prior nights as the
deliberate `meta http-equiv="refresh"` stub to a Google Drive folder.

**Checker bug, false resolutions on failed fetches, filed 2026-09-16, still
unfixed in `scripts/site-crawl.js:478` and `lib/site-crawl.js:826`.** Did not
fire tonight: `crawled` equals `ok` at 400/400, no failed fetches this run. Still
live in the code.

## Coverage

Shard 1/7, 400 of 2,126 sitemap URLs, 674 requests, 19m7s of a 25 minute budget,
no rate-limit abort, no wall-clock truncation. First shard of a fresh weekly
rotation.

`autofix-scan`: 0 of 688 findings scored eligible. Top blocking reasons:
`h1-duplicate` (365x), then `stale-year` (243x), then `title-overlong` (38x),
then `h1-is-title` (27x), same allow-list gap as every prior night.
