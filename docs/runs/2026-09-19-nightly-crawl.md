# 2026-09-19 nightly crawl

Shard 4/7, 400 of 2,122 sitemap URLs, 674 requests, 15m49s, no abort, no throttling wall.

## Is anything on fire

Same fire as the last eight nights, still not fixed: the AP Cyber Unit 1 Lesson 1
lab's Check button, score badge and rubric header are still invisible, white text
on an undefined background. Now night 8. No new fire tonight.

## New tonight

**Nothing genuinely new.** This shard (4/7, a different quarter of the site than
last night's 3/7) turned up 168 fresh findings, and every one of them is this
shard's first look at a long-standing, already-tracked template defect, plus one
already-diagnosed false alarm.

**`api-stale-deploy`, P1, 1 finding, same false alarm as prior nights, same
unfixed cause.** Tonight's crawl reported production serving `d454c9c` against a
stale locally-cached `origin/main` at `1e896d0`. Reproduced independently:
`git fetch origin main` moved the tip to `d454c9c`, `git merge-base --is-ancestor
d454c9c origin/main` confirms it, and a live `curl .../api/health` right now
reports `"commit":"d454c9c"`. Production is caught up to main. Cause is
unchanged from the last several nights: `deployLag` in `scripts/site-crawl.js`
compares against whatever `origin/main` the crawl container's local clone
already has, without fetching first. Still no board task for this specific fix.

**The other 167 fresh findings are this shard's slice of the same three
long-standing patterns**, all matched against pages this shard had never crawled
before:

- `h1-duplicate` (124 of 167) and `h1-is-title` (21 of 167): boards #72 and #247,
  both `status=done verified=NO`, unchanged.
- `title-overlong` (17 of 167): same CSA/CSP product-page pattern as every prior
  night, no board task.
- `meta-scraped` (1 of 167): same pattern as the four already tracked, no board
  task.
- `slow` (4 of 167): first-time flags on pages this shard had not timed before,
  nothing repeating.

None of these are template regressions from tonight; they are pages this
seven-night rotation had simply not looked at until now, carrying defects that
were already live and already known elsewhere on the site.

## Resolved since last night

**The four `broken-internal-link` 429s from last night's shard cleared on
tonight's hot-set recrawl**, confirming last night's diagnosis that they were the
crawl's own link-audit rate limiting rather than dead links: all four
(`ap-csa-lesson-4-13-implementing-2d-array-algorithms-exercise-1`,
`ap-csa-lesson-4-2-introduction-to-using-data-sets`,
`ap-csa-unit-4-data-collections-study-guide`, `ap-cyber-unit-3-lesson-1-exercise-2`)
now answer clean and are marked resolved. No fix needed, none was made.

## Still open

**P0, night 8: AP Cyber Unit 1 Lesson 1 lab's Check button, score badge and
rubric header are still invisible.** `#cyber-lab-11 .score-bar .score-num`,
`.check-btn`, and `.rubric-table th` still declare `background:var(--purple)` or
`var(--dark)` with `color:#ffffff`, and neither custom property is defined on
the page. Fix is unchanged from every prior night: reinsert the ten custom-
property definitions onto `#cyber-lab-11` in
`shopify/ap-cyber-unit-1-lesson-1-lab.html`, then re-import via Matrixify.
Boards #202, #203 and #264 all still read `status=done verified=NO`.

**`stale-year`, P1, 243 findings, oldest now at 16 nights, still no board
task.** Called out by name again per the playbook's five-night rule. Sixteen
nights in, this reads as ignored rather than unimportant.

**`h1-duplicate` (366) and `h1-is-title` (32), 16 nights, boards #72 and #247
both `status=done verified=NO`.** `meta-scraped` (2) and `title-overlong` (36),
same 16-night age range, no board task for either.

**`truncated-body` on `/products/ap-csa-teacher-superpack-free-preview`, now 9
nights.** Not re-verified beyond the crawl's own recrawl-before-clear tonight;
confirmed benign on prior nights as the deliberate `meta http-equiv="refresh"`
stub to a Google Drive folder.

**Checker bug, false resolutions on failed fetches, filed 2026-09-16, still
unfixed in `scripts/site-crawl.js:478` and `lib/site-crawl.js:826`.** Did not
fire tonight: `crawled` equals `ok` at 400/400, no failed fetches this run.
Still live in the code.

## Coverage

Shard 4/7, 400 of 2,122 sitemap URLs, 674 requests, 15m49s of a 25 minute
budget, no rate-limit abort, no wall-clock truncation. `autofix-scan`: 0 of 689
findings scored eligible. Top blocking reasons: `h1-duplicate` (365x), then
`stale-year` (243x), then `title-overlong` (36x), same allow-list gap as every
prior night.
