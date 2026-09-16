# 2026-09-16 nightly crawl

Shard 1/7, 400 URLs, 672 requests, 16m25s, no abort, no throttling wall.

## Is anything on fire

Same fire as the last five nights, still not fixed: the AP Cyber Unit 1
Lesson 1 lab's Check button and score display are still invisible. No new
fire tonight.

## New tonight

**Two P0 `dead-page` findings, both false alarms from a network blip during
the crawl itself, not real dead pages.** Both `/pages/ap-computer-science-principles-resources`
and `/pages/ap-csa-parsons-problems` failed to fetch mid-crawl with
`SSL_ERROR_SYSCALL` (visible in the crawl's own stderr as two curl failures).
Reproduced independently: fetched both URLs directly, three times each, five
minutes after the crawl finished. Both answered 200 all six times. Not
reporting as a P0; this is a transient network error, not a dead page.

**Checker bug found tonight: a failed fetch can get a URL's OLD findings
marked resolved, and it just did, wrongly, on both of those same two
URLs.** The crawl's delta also reported `stale-year` and `h1-duplicate`
resolved on both `ap-csa-parsons-problems` and `ap-computer-science-principles-resources`.
I fetched both pages directly to check: both still carry 2 `<h1>` elements
and both still advertise `2025-2026` in body copy. Neither issue is fixed.
Traced the cause: `scripts/site-crawl.js:480` adds a URL to `crawledUrls`
immediately after any response, including a failed one, before checking
whether the fetch actually succeeded. `lib/site-crawl.js:824-828`'s
`delta()` then trusts `crawledUrls.has(f.url)` alone as proof the page was
"actually looked at again" and clears its prior findings when they do not
reappear in this run's findings, which they cannot when the page's `classify()`
never ran because the fetch failed (`lib/site-crawl.js:566-569` returns a bare
`dead-page` finding and nothing else on `res.status === 0`). This directly
contradicts the invariant this playbook states as already true ("the crawler
already refuses to claim a resolution on a page it did not look at"); tonight
it did claim one, on a page it did not successfully look at. Fix would be
narrow: `crawledUrls` should only get a URL added when `res.status !== 0`
(or `delta()` should take a separate `successfullyCrawledUrls` set), so a
failed fetch cannot silently clear real findings. Filed here, not the board,
per the playbook's own precedent for `api-stale-deploy` below: this job
reads and does not fix, and I am not aware of an existing board task for
either checker bug.

**`api-stale-deploy`, P1, same false alarm as the last two nights, same
cause, still not fixed in the checker.** Tonight's crawl reported production
serving `49adfc9` while its own `origin/main` read `1e896d0`. Reproduced
independently: `git fetch origin main` fast-forwarded local `origin/main`
straight to `49adfc9`, `git merge-base --is-ancestor 49adfc9 origin/main`
confirms it is exactly the current tip, and `curl .../api/health` reports
`"commit":"49adfc9"`. Production is caught up. Unchanged cause from the last
two nights' notes: `deployLag` compares against whatever `origin/main` the
crawl container's local clone already has cached, without fetching first.

**`meta-scraped`, 9 new instances tonight, same known root cause, no new
pattern.** Six new CSA/intro-java lesson pages and two AP Cyber unit pages
carry breadcrumb-style text as their meta description, same defect the four
CSA unit hub pages have carried for 13 nights now. New only because
tonight's shard (1/7) covers different URLs than the last several nights.

Everything else the crawler marked fresh (114 `h1-duplicate`, 19
`title-overlong`, 16 `h1-is-title`) is the identical shard-rotation effect:
new URLs seen for the first time carrying the same long-standing,
already-tracked page-template defects (#72/#247), not new regressions.

## Still open

**P0, night 5: AP Cyber Unit 1 Lesson 1 Lab's Check button and score display
are still invisible.** First caught as a regression on 2026-09-12, persisting
every night since, tonight included. `#cyber-lab-11 .check-btn`,
`.score-bar .score-num`, and `.rubric-table th` all still read
`background:var(--purple)!important` / `var(--dark)!important` with those
custom properties declared nowhere on the page, so the whole declaration
drops at computed-value time and the text is white on an inherited
background. No open board task tracks the regression itself, only the three
closed-but-unverified items behind it (#202, #203, #264), unchanged from
every prior night. Fix is unchanged: reinsert the ten-property palette block
onto `#cyber-lab-11` in `shopify/ap-cyber-unit-1-lesson-1-lab.html` and
re-import via Matrixify. Who it hurts: any student attempting the 1.1 lab.
autofix-scan: not eligible.

**`stale-year`, P1, 250 findings, oldest at 13 nights, still no board
task.** Same mechanism as every prior night: `staleSchoolYears()` in
`lib/site-crawl.js` flags any "20XX-20YY" pair with no awareness of whether
it names a school year or a curriculum label, and a real mix of genuine
staleness and correctly-protected references sits inside this count per the
sample prior nights already ran. Not re-verified individually tonight
per playbook (P1 counts as a pattern once already characterized; the number
itself did not move meaningfully from last night's 252).

**`truncated-body` on `/products/ap-csa-teacher-superpack-free-preview`, now
6 nights.** Same as every prior night: a deliberate `meta http-equiv="refresh"`
redirect stub to a Google Drive folder with no themed marker, not a defect.

**#72/#247, H1 duplication, unchanged.** Checked the board directly tonight:
both still read `status=done verified=NO`. 363 pages carry the underlying
defect this shard cycle. Not reporting as new.

**`meta-scraped` course hub pages, now 13 nights** on all four CSA unit hubs
plus `unit-3-practice-exam-part-2`. No board task found.

**`title-overlong`, 39 pages tonight**, same CSP daily-practice-template and
product-page pattern as recent nights.

## Resolved since last night

None. The crawler's own delta claimed two resolutions (`stale-year` and
`h1-duplicate` on both `ap-csa-parsons-problems` and
`ap-computer-science-principles-resources`), but this is the false-resolution
checker bug described above, not a real fix: both issues are still live on
both pages as of a direct fetch five minutes ago. Not reporting either as
resolved.

## Coverage

Shard 1/7, 400 of 2,111 sitemap URLs, 672 requests, no rate-limit abort, no
wall-clock truncation (16m25s of a 25 minute budget; two of 400 fetches hit
a transient SSL error mid-run, addressed above). autofix-scan: 0 of 702
findings scored eligible; top blocking reasons `h1-duplicate` (363x), then
`stale-year` (250x). Same allow-list gap as every prior night.
