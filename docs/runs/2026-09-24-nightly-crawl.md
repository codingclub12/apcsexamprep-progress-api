# 2026-09-24 nightly crawl

Shard 2/7, second shard of this week's rotation. 400 of 2,133 sitemap URLs, 678
requests, 16m11s, no abort, no throttling wall.

## Is anything on fire

Same fire as every night this week, still not fixed: the AP Cyber Unit 1 Lesson 1
lab's Check button, score badge and rubric header are still invisible, white text
on an undefined background. Now night 13. No new fire tonight.

## New tonight

Nothing new. The three P0s are the same known lab bug, on the same page, boards
#202/#203/#264, all still `status=done verified=NO`, checked directly on the
board tonight. Fetched the page live (curl with no `-A` override, per
`lib/storefront-fetch.js`'s rule that a spoofed UA is what gets challenged now):
200, 412,964 bytes, three `Shopify.theme` markers confirming a real render. The
body uses `var(--purple)` and `var(--dark)` on the check button, score badge and
rubric header, and neither custom property has a definition anywhere in the page.
Unchanged root cause, unchanged fix: reinsert the ten custom-property
definitions in `shopify/ap-cyber-unit-1-lesson-1-lab.html`, then re-import via
Matrixify.

`api-stale-deploy` fired once tonight, `nights: 1`, claiming production's
`14ed32a` was 13.2h old against a local `main` tip of `1ef64ae`. Checked directly
and it is the same false-alarm mechanism the 2026-09-23 note flagged: the
checker reads `origin/main` from whatever the crawl's local clone last fetched,
not a fresh fetch. Ran `git fetch origin main` myself: `origin/main` moved
`1ef64ae..14ed32a`, landing exactly on what `api/health` had been serving the
whole run (`api_commit: 14ed32a` in the crawl's own top-level record). Production
was never stale; the crawl script's local git state was. Not a real finding.
Worth fixing the checker to fetch before comparing rather than trusting whatever
the container's clone happens to hold, but that is a code change and out of
scope for tonight.

Two `brand-doubled` findings, both new (`nights: 1`), both on AP CSP game pages:
`/pages/ap-csp-game-internet-routing-simulator` and
`/pages/ap-csp-game-phishing-net`, each with `APCSExamPrep.com` appearing twice
at the end of the `<title>`. Traced the cause: `layout/theme.liquid:97` in the
theme repo appends `| APCSExamPrep.com` to `page_title` whenever the page has no
`metafields.global.title_tag` set. These two pages' own SEO Title field already
ends in `| APCSExamPrep.com`, so the theme appends a second copy. Only these two
pages show it in tonight's shard; this reads as a content-authoring slip on two
specific pages rather than a template regression, since a template bug would hit
every untagged page, not two. No board task for it. P2, cosmetic, worth a
one-line content fix (drop the trailing brand suffix from those two pages' SEO
Title fields) whenever someone is next in Shopify Admin for CSP games.

169 of tonight's 176 fresh-delta findings are the same shard-rotation pattern
described every prior night: `h1-duplicate` (368 in this slice, boards #72/#247,
both `status=done verified=NO`), `h1-is-title` (34), `meta-scraped` (7),
`title-overlong` (36). First-time-compared instances of week-old, already-boarded
systemic issues surfacing on pages this shard had not looked at before, not new
defects.

## Resolved since last night

None. `delta.resolved` is empty for this shard.

## Still open

**P0, night 13: AP Cyber Unit 1 Lesson 1 lab's Check button, score badge and
rubric header are still invisible.** Cause unchanged:
`#cyber-lab-11` uses `var(--purple)` and `var(--dark)` with no definition block
on the page, so `background:var(--purple); color:#ffffff` is invalid at
computed-value time and the whole declaration drops. Fix is unchanged: reinsert
the ten custom-property definitions in `shopify/ap-cyber-unit-1-lesson-1-lab.html`,
then re-import via Matrixify. Boards #202, #203, #264 all `status=done
verified=NO`, checked directly tonight.

**`stale-year`, P1, 243 findings in this shard, oldest now at 21 nights, still no
board task.** Called out by name again per the playbook's five-night rule.
Twenty-one nights in, this reads as ignored rather than unimportant.

**`h1-duplicate` (368) and `h1-is-title` (34), boards #72 and #247 both
`status=done verified=NO`.** `meta-scraped` (7), same age range, no board task.

**`truncated-body` on `/products/ap-csa-teacher-superpack-free-preview`, now 14
nights.** Recrawled tonight, unchanged. Confirmed benign on prior nights as the
deliberate `meta http-equiv="refresh"` stub to a Google Drive folder.

**Checker bug, false resolutions on failed fetches, filed 2026-09-16, still
unfixed in `scripts/site-crawl.js:478` and `lib/site-crawl.js:826`.** Did not
fire tonight: `crawled` equals `ok` at 400/400, no failed fetches this run. Still
live in the code.

**New tonight, not urgent: `deployLag()` in `scripts/site-crawl.js:315` trusts a
possibly-stale local `origin/main` instead of fetching first**, which is what
produced tonight's false `api-stale-deploy` alarm and at least two others this
week per the 2026-09-23 note. Not fixing it tonight; this job reads and reports,
it does not patch its own tooling. Naming it here so the pattern has a paper
trail: three false alarms from the same missing `git fetch` in nine days.

## Coverage

Shard 2/7, 400 of 2,133 sitemap URLs, 678 requests, 16m11s of a 25 minute budget,
no rate-limit abort, no wall-clock truncation.

`autofix-scan`: 0 of 697 findings scored eligible. Top blocking reasons:
`h1-duplicate` (368x), then `stale-year` (243x), then `title-overlong` (36x),
then `h1-is-title` (34x), same allow-list gap as every prior night.
