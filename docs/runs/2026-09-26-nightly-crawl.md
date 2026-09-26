# 2026-09-26 nightly crawl

Shard 4/7. 400 of 2,068 sitemap URLs, 673 requests, 15m23s, no abort, no
throttling wall (25 minute budget).

## Is anything on fire

Same fire as every night for two weeks: the AP Cyber Unit 1 Lesson 1 lab's
Check button, score badge and rubric header are still invisible, white text on
an undefined background. Now night 15. Nothing new tonight otherwise.

## New tonight

Nothing. `delta.new` is empty for this shard. Every finding tonight is a
first-time-compared instance of an already-boarded, already-reported systemic
issue surfacing on pages this shard had not looked at before, or the same
false alarm reported the last four nights running.

**`api-stale-deploy` fired again, the same false alarm as 2026-09-16, 23, 24,
25.** Claimed production's `2e9a3f9` was 12.4h old against a local `main` tip
of `1ef64ae`. Ran `git fetch origin main` myself: `origin/main` moved to
`2e9a3f9`, exactly what `/api/health` reports live (checked directly with
curl, `"commit":"2e9a3f9"`). Production was never stale; the crawl script's
own local git clone was, because `deployLag()` in `scripts/site-crawl.js:315`
still compares against whatever `origin/main` the container's clone last
fetched instead of fetching first. Fifth occurrence of the same root cause in
eleven days. Not fixing it tonight, this job reads and reports.

## Resolved since last night

**Homepage duplicate H1, board-tracked at 22 nights, is gone.** The
storefront root carried two H1 elements ("AP CS Exam Prep" and "AP Computer
Science Exam Prep"); fetched it myself just now and it carries exactly one:
"AP Computer Science Exam Prep and Courses". The homepage is in the hot set
and is crawled every night, so this is a real recrawl, not a shard-timing
artifact. Cause not investigated further since this is a resolution, but
worth flagging: board #409 (new homepage build) is still `status=done
verified=NO` on an UNMERGED theme PR, so whatever fixed this landed some
other way and is worth a look if anyone wants to know why.

## Still open

**P0, night 15: AP Cyber Unit 1 Lesson 1 lab's Check button, score badge and
rubric header are still invisible.** Verified directly again tonight: fetched
the live page, `--purple` and `--dark` are still undefined anywhere in the
body, and `.score-num` and `.check-btn` still read
`background:var(--purple)!important` with no fallback. Boards #202, #203,
#264 all checked again, still `status=done verified=NO`. Fix is unchanged:
reinsert the ten custom-property definitions in
`shopify/ap-cyber-unit-1-lesson-1-lab.html`, then re-import via Matrixify.

**`stale-year`, P1, 243 findings in this shard, now 23 nights, still no board
task.** Called out by name again. Twenty-three nights in.

**`h1-duplicate` (365) and `h1-is-title` (31), boards #72 and #247, both
`status=done verified=NO`, 23 nights.** `title-overlong` (36), 23 nights, no
board task. `meta-scraped` (1 this shard), 23 nights, no board task.

**`truncated-body` on `/products/ap-csa-teacher-superpack-free-preview`, now
16 nights.** Recrawled tonight, unchanged, still the deliberate
`meta http-equiv="refresh"` stub to a Google Drive folder.

**Checker bug, false resolutions on failed fetches, filed 2026-09-16, still
unfixed in `scripts/site-crawl.js:478` and `lib/site-crawl.js:826`.** Did not
fire tonight: 400/400 crawled ok, no failed fetches this run. Still live in
the code.

**`deployLag()` false-alarm bug, flagged 2026-09-24, still unfixed in
`scripts/site-crawl.js:315`.** Fifth confirmed false alarm in eleven days
(2026-09-16, 23, 24, 25, 26), same missing `git fetch` before comparing.

## Coverage

Shard 4/7, 400 of 2,068 sitemap URLs, 673 requests, 15m23s of a 25 minute
budget, no rate-limit abort, no wall-clock truncation.

`autofix-scan`: 0 of 682 findings scored eligible, same as every prior night.
Top blocking reasons: `h1-duplicate` (364x), `stale-year` (243x),
`title-overlong` (36x), `h1-is-title` (31x), same allow-list gap as every
prior night.
