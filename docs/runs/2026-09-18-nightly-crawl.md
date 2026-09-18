# 2026-09-18 nightly crawl

Shard 3/7, 400 of 2,113 sitemap URLs, 676 requests, 18m48s, no abort, no throttling wall.

## Is anything on fire

Same fire as the last seven nights, still not fixed: the AP Cyber Unit 1 Lesson 1
lab's Check button, score badge and rubric header are still invisible, white text
on an undefined background. Now night 7. No new fire tonight.

## New tonight

**Nothing genuinely new.** Everything the crawler marked fresh is either a false
alarm traced to the crawl's own rate limiting, the known deploy-lag false alarm,
two small content slips matching an already-diagnosed template pattern, or this
shard's slice of long-standing page-template defects.

**`css-var-invisible-text`, P0, unchanged, night 7.** Reproduced directly:
`#cyber-lab-11 .score-bar .score-num`, `.check-btn`, and `.rubric-table th` still
declare `background:var(--purple)` or `var(--dark)` with `color:#ffffff`, and
neither custom property is defined on the page. `css-var-undefined` (P2, same
page, night 7) names all ten missing properties. Fix is unchanged from every
prior night: reinsert the ten custom-property definitions onto `#cyber-lab-11` in
`shopify/ap-cyber-unit-1-lesson-1-lab.html`, then re-import via Matrixify. Boards
#202, #203 and #264 all still read `status=done verified=NO`.

**Four `broken-internal-link` P1 candidates were the crawl's own link-audit
rate limiting, not dead links.** All four (`ap-csa-lesson-4-13-implementing-2d-array-algorithms-exercise-1`,
`ap-csa-lesson-4-2-introduction-to-using-data-sets`,
`ap-csa-unit-4-data-collections-study-guide`,
`ap-cyber-unit-3-lesson-1-exercise-2`) reported HTTP 429 during the crawl's
250-request link-budget pass. Reproduced independently through
`lib/storefront-fetch.js`, spaced 1.5 to 3 seconds apart: two answered 429
immediately after the crawl finished and both cleared to 200 on a second try
seconds later, the other two were already 200 on first check. All four serve
their real page. `autofix-scan.js` scored these four as its only 4 "eligible"
findings tonight, which says something about the scorer rather than about the
links: a `broken-internal-link` whose fix is regenerating a manifest entry is
eligible by kind, but these were never broken to begin with. No fix needed.

**`api-stale-deploy`, P1, same false alarm as recent nights, same unfixed
cause.** Tonight's crawl reported production serving `b5e6b33` against a stale
locally-cached `origin/main`. Reproduced independently: `git fetch origin main`
moved the tip to `b5e6b33`, `git merge-base --is-ancestor b5e6b33 origin/main`
confirms it is the current tip, and `curl .../api/health` reports
`"commit":"b5e6b33"`. Production is caught up. Cause is unchanged: `deployLag`
in `scripts/site-crawl.js` compares against whatever `origin/main` the crawl
container's local clone already has, without fetching first. Still no board
task for this specific fix.

**`brand-doubled`, P2, 2 new tonight, same pattern as last night's 2.**
`/pages/ap-csp-game-crowd-power` and `/pages/ap-csp-game-license-match` both
render titles ending "APCSExamPrep.com | APCSExamPrep.com". Same cause as
2026-09-17's pair: `layout/theme.liquid:99` in the theme repo appends
`| APCSExamPrep.com` unconditionally, and these two pages' own Shopify title
fields already end with that suffix. Content-authoring slip on two pages, not a
template regression (only 2 of 400 crawled pages show it). Fix is removing the
trailing brand text from these two pages' title fields via the next Matrixify
sheet that touches them. autofix-scan: not eligible, fix surface is Shopify
content.

**Nine `stale-year` findings resolved in title/meta/h1, but four of those nine
still show the old year in the visible page body.** The check only reads
title, meta description and h1 text, so a resolution there is real and I
verified it directly (title/meta/h1 on all nine no longer contain a consecutive
stale year pair). But fetching the full body of the nine: `ap-csa-reference-sheet`,
`ap-csa-ultimate-practice-exam`, `ap-csa-unit-3-practice-exam-part-2`, and
`ap-csp-reference-sheet` still contain the literal string "2025-2026" in body
copy a student reads, even though the SEO-facing fields were fixed. The other
five (`ap-computer-science-principles-practice-exam-2025`,
`ap-csa-unit-2-complete-study-guide`, `ap-csa-unit-3-complete-study-guide`,
`ap-csp-bi2-overflow-roundoff`, `ap-csp-unit-5-cybersecurity-complete-2025-study-guide`)
are clean of the old year everywhere I checked. Whatever fixed these nine
titles touched the SEO fields only, not consistently the body, on 4 of 9 pages.
Not a crawler bug, a scope gap: the check was deliberately built to read
title/meta/h1 only, and nobody has extended it to the body. Not filing a board
task per this job's charter (reads only), naming it here for whoever picks up
the rollover work.

**`h1-duplicate` (369), `h1-is-title` (32), `meta-scraped` (6),
`title-overlong` (35)** are this shard's slice of the same long-standing,
already-tracked page-template defects (#72, #247) and the known scraped-meta
pattern, not new regressions. Checked both board tasks directly: #72 and #247
both still read `status=done verified=NO`.

## Still open

**P0, night 7: AP Cyber Unit 1 Lesson 1 lab's Check button, score badge and
rubric header are still invisible.** See above. Boards #202, #203, #264 all
`verified=NO`.

**`stale-year`, P1, 243 findings, oldest now at 15 nights, still no board
task.** Called out by name per the playbook's five-night rule. Either this is
not actually important or it is being ignored, and after 15 nights it reads
like the second one.

**`truncated-body` on `/products/ap-csa-teacher-superpack-free-preview`, now 8
nights.** Not re-verified tonight beyond the crawl's own re-check; confirmed
benign on prior nights as the deliberate `meta http-equiv="refresh"` stub to a
Google Drive folder, and nothing here suggests that changed.

**#72/#247, H1 duplication, unchanged.** 369 pages carry the underlying defect
in this shard.

**`meta-scraped` on the CSA unit hub pages, now 15 nights. `title-overlong`,
same age range, same CSP/product pattern.** No board task found for either.

**Checker bug, false resolutions on failed fetches, filed 2026-09-16, still
unfixed in `scripts/site-crawl.js:478` and `lib/site-crawl.js:826`.** Did not
fire tonight: `crawled` equals `ok` at 400/400, no `status:0` responses this
run. Still live in the code and still worth a board task; this job does not
open one.

## Resolved since last night

**Nine `stale-year` findings, title/meta/h1 only.** See above for the caveat
on four of them.

Routine shard-rotation resolutions on pages this run happened to recrawl:
`h1-duplicate`/`h1-is-title` on `ap-csa-frq-bootcamp-2026` (4 nights),
`meta-scraped` on four CSA unit-course pages (13 to 15 nights),
`title-overlong` on `ap-csa-unit-3-practice-exam-part-2` (13 nights), and
`slow` on 8 pages flagged for the first time last night, all fast on tonight's
refetch. Not individually re-verified past the crawl's own recrawl-before-clear
rule, per playbook for P2/P3.

## Coverage

Shard 3/7, 400 of 2,113 sitemap URLs, 676 requests, 18m48s of a 25 minute
budget, no rate-limit abort, no wall-clock truncation. autofix-scan: 4 of 697
findings scored eligible, all four the `broken-internal-link` 429 false alarms
traced above, so the real eligible count tonight is zero. Top blocking reasons
unchanged: `h1-duplicate` (369x) then `stale-year` (243x), same allow-list gap
as every prior night.
