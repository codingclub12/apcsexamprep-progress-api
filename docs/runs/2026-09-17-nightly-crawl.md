# 2026-09-17 nightly crawl

Shard 2/7, 400 of 2,115 sitemap URLs, 678 requests, 17m07s, no abort, no throttling wall.

## Is anything on fire

Same fire as the last six nights, still not fixed: the AP Cyber Unit 1 Lesson 1
lab's Check button, score badge and rubric header are still invisible, white
text on an undefined background. Now night 6. No new fire tonight.

## New tonight

**Nothing genuinely new.** Everything the crawler marked fresh is either the
known invisible-text P0 continuing, two false alarms traced to the crawler's
own bugs, or the same long-standing page-template defects appearing on URLs
this shard had not looked at before.

**`css-var-invisible-text`, P0, unchanged, night 6.** Reproduced directly:
fetched `/pages/ap-cyber-unit-1-lesson-1-lab` and confirmed `#cyber-lab-11
.score-bar .score-num`, `.check-btn`, and `.rubric-table th` all still declare
`background:var(--purple)` or `var(--dark)` with `color:#ffffff`, and neither
custom property is defined anywhere in the page (checked both the live body
and the repo mirror at `shopify/ap-cyber-unit-1-lesson-1-lab.html`, no `:root`
block, no `--purple:` or `--dark:` declaration in either). An undefined
`var()` is invalid at computed-value time, so the whole declaration drops and
the text renders white on an inherited background. Worth saying plainly:
board tasks #202, #203 and #264 all read `status=done verified=NO`, and #202's
own artifact link is this exact live page. Whatever shipped against those
three tasks did not fix the page, or fixed it and something reverted it, and
nobody has independently re-checked it in six nights. Fix is unchanged from
every prior night: reinsert the ten custom-property definitions (`--purple`,
`--dark`, and eight more, all named in the crawler's `css-var-undefined`
finding on the same page) onto `#cyber-lab-11` in
`shopify/ap-cyber-unit-1-lesson-1-lab.html`, then re-import via Matrixify.
Who it hurts: any student attempting the 1.1 phishing-analysis lab, which
board #264 says is meant to be the flagship server-graded lab for this unit.
autofix-scan: not eligible, kind is not on the allow list and the fix surface
is Shopify.

**Two `dead-page` P0s the delta reported "resolved" are last night's own false
alarm clearing itself, not a fix of anything.** `/pages/ap-computer-science-principles-resources`
and `/pages/ap-csa-parsons-problems` both failed to fetch during last night's
crawl on a transient `curl` error, exactly as last night's note described, and
tonight both fetched clean on the first try. Reproduced independently just
now: both answer 200, 464KB and 403KB respectively. Real, not a lie, but also
not evidence anything was fixed, because nothing was ever broken on these two
pages.

**The checker bug filed in last night's note, "a failed fetch can get a URL's
findings marked resolved," is still live in the code**, and it is the same
mechanism that produced the two entries above. `scripts/site-crawl.js:478`
still adds a URL to `crawledUrls` immediately after any response, including
one with `status: 0` from a `curl` failure (`scripts/site-crawl.js:153`), and
`lib/site-crawl.js:826` still trusts `crawledUrls.has()` alone before clearing
a prior finding. Tonight it only cleared the false alarms themselves, which is
harmless, but the underlying bug is unfixed and the next transient network
blip could just as easily land on a URL carrying a real, unrelated finding
and clear that instead. Filed here per the playbook's own precedent for
checker bugs: this job reads, it does not fix, and there is still no board
task for it.

**`api-stale-deploy`, P1, same false alarm as the last several nights, same
unfixed cause.** Tonight's crawl reported production serving `aa0614c` while
its own cached `origin/main` read `1e896d0`. Reproduced independently: `git
fetch origin main` moved `origin/main` to `aa0614c`, `git merge-base
--is-ancestor aa0614c origin/main` confirms it is exactly the current tip, and
`curl .../api/health` reports `"commit":"aa0614c"`. Production is caught up.
Cause is unchanged from prior nights' notes: `deployLag` compares against
whatever `origin/main` the crawl container's local clone already has, without
fetching first.

**`brand-doubled`, P2, new kind of finding, small.** Two AP CSP game pages,
`/pages/ap-csp-game-internet-routing-simulator` and
`/pages/ap-csp-game-phishing-net`, render titles ending
"APCSExamPrep.com | APCSExamPrep.com". Traced the cause: `layout/theme.liquid:99`
in the theme repo unconditionally appends `| APCSExamPrep.com` to `page_title`,
and these two pages' own Shopify title fields already end with that same
suffix, so the brand lands twice. Only these two pages in the crawled shard
show it, so this reads as a content-authoring slip on two pages rather than a
template regression: the fix is removing the trailing brand text from the two
pages' title fields via the next Matrixify sheet that touches them, not a
theme change. autofix-scan: not eligible, fix surface is Shopify content.

**`meta-scraped` (11), `h1-duplicate` (368), `h1-is-title` (35),
`title-overlong` (37)** are all this shard's slice of the same long-standing,
already-tracked page-template defects (#72, #247) and the known scraped-meta
pattern, not new regressions. Same shard-rotation effect as every prior night:
new URLs seen for the first time carrying old defects.

**`slow`, P3, 8 pages tonight, first time this check has fired.** Five AP CSA
pages, two AP CSP pages, and one product page all took 5 to 10 seconds to
first byte (`ap-csa-arraylist-sorting` worst at 10.1s). Not verified
individually per playbook for P3. Worth watching rather than acting on yet:
one night of data on 8 of 400 URLs is not enough to call a regression, and if
the same 8 pages recur slow tomorrow on the shards that revisit them, that
would be worth a real look.

## Still open

**P0, night 6: AP Cyber Unit 1 Lesson 1 lab's Check button, score badge and
rubric header are still invisible.** See above. Six nights running, three
closed board tasks pointing at it (#202, #203, #264), all `verified=NO`.

**`stale-year`, P1, 252 findings, oldest at 14 nights, still no board task.**
Same mechanism as every prior night, not re-verified individually tonight
per playbook (count did not move meaningfully from 250 to 252).

**`truncated-body` on `/products/ap-csa-teacher-superpack-free-preview`, now
7 nights.** Confirmed benign again: still the deliberate `meta http-equiv="refresh"`
stub to a Google Drive folder.

**#72/#247, H1 duplication, unchanged.** Checked the board directly: both
still read `status=done verified=NO`. 368 pages carry the underlying defect
in this shard.

**`meta-scraped` on the CSA unit hub pages, now 14 nights.** No board task
found.

**`title-overlong`, now 14 nights**, same CSP daily-practice-template and
product-page pattern as recent nights.

**Checker bug, false resolutions on failed fetches, filed 2026-09-16, not
fixed.** See above.

## Resolved since last night

None that reflect an actual fix. The delta claimed two (`dead-page` on
`ap-computer-science-principles-resources` and `ap-csa-parsons-problems`),
both last night's own transient-network false alarm clearing itself, not a
change to either page.

## Coverage

Shard 2/7, 400 of 2,115 sitemap URLs, 678 requests, no rate-limit abort, no
wall-clock truncation (17m07s of a 25 minute budget). autofix-scan: 0 of 719
findings scored eligible, top blocking reasons `h1-duplicate` (368x) then
`stale-year` (252x). Same allow-list gap as every prior night.
