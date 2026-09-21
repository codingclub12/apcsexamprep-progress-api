# 2026-09-21 nightly crawl

Shard 6/7, 400 of 2,122 sitemap URLs, 675 requests, 15m30s, no abort, no throttling wall.

## Is anything on fire

Same fire as every night this week, still not fixed: the AP Cyber Unit 1 Lesson 1
lab's Check button, score badge and rubric header are still invisible, white text
on an undefined background. Now night 10. No new fire tonight.

## New tonight

**One genuinely new finding, and it is small.** `/pages/ap-csp-game-robot-director`
serves a doubled brand suffix in its title tag:
`Robot Director | AP CSP Big Idea 3 Game | APCSExamPrep.com | APCSExamPrep.com`.
Reproduced live just now via `lib/storefront-fetch.js`. Cause: this page has no
`metafields.global.title_tag` override, so `layout/theme.liquid` (line 97,
`claude/site-linking-audit-yhufjk`) appends `| APCSExamPrep.com` to whatever the
Shopify page's own Title field holds, and that field already ends in
`| APCSExamPrep.com`. The page is not produced by the live `robot-director` entry
in `scripts/csp-game-pages-csv.js` (that script only lists `robot-director` under
`EMBEDDED_IN_LESSON`, meaning the game embeds into a lesson page there; this
standalone `/pages/ap-csp-game-robot-director` page predates or sits outside that
generator, so I could not trace it to a specific generator run). Fix is a one-row
Matrixify Title update dropping the trailing `| APCSExamPrep.com` from the Title
field, not a template change: nothing else in this shard shows the same pattern.
P2, cosmetic (title bar and search-result snippet only), no student is blocked.

**Everything else this shard turned up (166 fresh findings) is a shard-rotation
artifact of already-tracked, already-open template defects**, first look at a
different quarter of the site than last night:

- `h1-duplicate` (126 of 166) and `h1-is-title` (19 of 166): boards #72 and #247,
  both `status=done verified=NO`, checked again tonight, unchanged.
- `title-overlong` (12 of 166): same CSA/CSP product-and-blog-page pattern as
  every prior night, no board task.
- `meta-scraped` (8 of 166): same scraped-breadcrumb-as-description pattern on
  CSA lesson pages, no board task. Worst three:
  `ap-csa-lesson-4-2-introduction-to-using-data-sets`, and two more Unit 4 lesson
  pages with the same "AP CSA Hub Unit 4 4.1 (down arrow) Lesson Ex 1 Ex 2 Quiz..."
  nav text sitting in the meta description.

None of these are regressions; they are pages this seven-night rotation had
simply not looked at until tonight.

**Checked and ruled out: `api-stale-deploy`.** Production reports commit
`d454c9c`, which `git rev-parse origin/main` confirms is the exact tip of `main`
right now. Production is caught up.

## Resolved since last night

**None recrawled tonight cleared.** `delta.resolved` is empty for this shard.

## Still open

**P0, night 10: AP Cyber Unit 1 Lesson 1 lab's Check button, score badge and
rubric header are still invisible.** Reproduced live tonight, independently of
the crawler: the page body still contains no `--purple:` or `--dark:` definition,
while `#cyber-lab-11 .score-bar .score-num`, `.check-btn`, and `.rubric-table th`
still declare `background:var(--purple)` or `var(--dark)` with `color:#ffffff`.
Fix is unchanged: reinsert the ten custom-property definitions onto
`#cyber-lab-11` in `shopify/ap-cyber-unit-1-lesson-1-lab.html`, then re-import via
Matrixify. Boards #202, #203 and #264 all still read `status=done verified=NO`,
checked directly tonight.

**`css-var-undefined`, P2, same page, same root cause, night 10.** Not a
separate bug, part of #202/#203.

**`stale-year`, P1, 243 findings, oldest now at 18 nights, still no board
task.** Called out by name again per the playbook's five-night rule. Eighteen
nights in, this reads as ignored rather than unimportant.

**`h1-duplicate` (368) and `h1-is-title` (30), up to 18 nights, boards #72 and
#247 both `status=done verified=NO`.** `meta-scraped` (9) and `title-overlong`
(31), same age range, no board task for either.

**`truncated-body` on `/products/ap-csa-teacher-superpack-free-preview`, now 11
nights.** Recrawled tonight, unchanged. Confirmed benign on prior nights as the
deliberate `meta http-equiv="refresh"` stub to a Google Drive folder.

**Checker bug, false resolutions on failed fetches, filed 2026-09-16, still
unfixed in `scripts/site-crawl.js:478` and `lib/site-crawl.js:826`.** Did not
fire tonight: `crawled` equals `ok` at 400/400, no failed fetches this run.
Still live in the code.

## Coverage

Shard 6/7, 400 of 2,122 sitemap URLs, 675 requests, 15m30s of a 25 minute
budget, no rate-limit abort, no wall-clock truncation.
`autofix-scan`: 0 of 687 findings scored eligible. Top blocking reasons:
`h1-duplicate` (368x), then `stale-year` (243x), then `title-overlong` (31x),
then `h1-is-title` (30x), same allow-list gap as every prior night.
