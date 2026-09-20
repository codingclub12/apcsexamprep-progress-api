# 2026-09-20 nightly crawl

Shard 5/7, 400 of 2,122 sitemap URLs, 675 requests, 15m35s, no abort, no throttling wall.

## Is anything on fire

Same fire as the last several nights, still not fixed: the AP Cyber Unit 1 Lesson 1
lab's Check button, score badge and rubric header are still invisible, white text
on an undefined background. Now night 9. No new fire tonight.

## New tonight

**Nothing genuinely new.** This shard (5/7, a different quarter of the site than
last night's 4/7) turned up 167 fresh findings, and every one is this shard's
first look at a long-standing, already-tracked template defect.

- `h1-duplicate` (128 of 167) and `h1-is-title` (22 of 167): boards #72 and #247,
  both `status=done verified=NO`, checked again tonight, unchanged.
- `title-overlong` (10 of 167): same CSA/CSP product-and-blog-page pattern as
  every prior night, no board task.
- `meta-scraped` (7 of 167): same scraped-breadcrumb-as-description pattern on
  CSA lesson pages as previously tracked, no board task. Worst three:
  `ap-csa-lesson-2-1-algorithms-selection-repetition`,
  `ap-csa-lesson-2-10-implementing-string-algorithms`,
  `ap-csa-lesson-4-6-using-text-files`, all with a meta description reading as
  raw breadcrumb text ("AP CSA> Course> Unit 2... Lesson 2.1 · Conceptual...").

None of these are template regressions from tonight; they are pages this
seven-night rotation had simply not looked at until now, carrying defects that
were already live and already known elsewhere on the site.

**Checked and ruled out: `api-stale-deploy`, the recurring false alarm from prior
nights, did not fire tonight.** `/api/health` was not in this shard's crawl set,
but verified directly: `git fetch origin main` puts the tip at `d454c9c`, which
matches the `api_commit` this crawl recorded (`d454c9c`), and
`git merge-base --is-ancestor d454c9c origin/main` confirms it. Production is
genuinely caught up with `main` tonight, so there was nothing to report.

## Resolved since last night

**The four `slow` P3 findings from last night's shard cleared on tonight's
recrawl**, confirming they were transient: `ap-csa-exam-prep-hub`,
`ap-csp-practice-test-computing-impact`, `ap-csp-vocabulary-list`, and
`ap-csa-complete-quick-reference-guide` all answered at normal speed tonight.
No fix needed, none was made.

## Still open

**P0, night 9: AP Cyber Unit 1 Lesson 1 lab's Check button, score badge and
rubric header are still invisible.** Reproduced live tonight, independently of
the crawler, via `lib/storefront-fetch.js`: the page body still contains no
`--purple:` or `--dark:` definition anywhere, while `#cyber-lab-11 .score-bar
.score-num`, `.check-btn`, and `.rubric-table th` still declare
`background:var(--purple)` or `var(--dark)` with `color:#ffffff`. Fix is
unchanged from every prior night: reinsert the ten custom-property definitions
onto `#cyber-lab-11` in `shopify/ap-cyber-unit-1-lesson-1-lab.html`, then
re-import via Matrixify. Boards #202, #203 and #264 all still read
`status=done verified=NO`, checked directly tonight.

**`css-var-undefined`, P2, same page, same root cause, night 9.** The 10
custom properties the P0 above reads with no fallback. Not a separate bug, part
of #202/#203.

**`stale-year`, P1, 243 findings, oldest now at 17 nights, still no board
task.** Called out by name again per the playbook's five-night rule. Seventeen
nights in, this reads as ignored rather than unimportant. Pattern: blog and
lesson pages advertising the "2025-2026" school year, which is now a year
behind the current one.

**`h1-duplicate` (370) and `h1-is-title` (33), up to 17 nights, boards #72 and
#247 both `status=done verified=NO`.** `meta-scraped` (8) and `title-overlong`
(29), same age range, no board task for either.

**`truncated-body` on `/products/ap-csa-teacher-superpack-free-preview`, now 10
nights.** Recrawled tonight, unchanged. Confirmed benign on prior nights as the
deliberate `meta http-equiv="refresh"` stub to a Google Drive folder.

**Checker bug, false resolutions on failed fetches, filed 2026-09-16, still
unfixed in `scripts/site-crawl.js:478` and `lib/site-crawl.js:826`.** Did not
fire tonight: `crawled` equals `ok` at 400/400, no failed fetches this run.
Still live in the code.

## Coverage

Shard 5/7, 400 of 2,122 sitemap URLs, 675 requests, 15m35s of a 25 minute
budget, no rate-limit abort, no wall-clock truncation. `autofix-scan`: 0 of 688
findings scored eligible. Top blocking reasons: `h1-duplicate` (370x), then
`stale-year` (243x), then `h1-is-title` (33x), then `title-overlong` (29x),
same allow-list gap as every prior night.
