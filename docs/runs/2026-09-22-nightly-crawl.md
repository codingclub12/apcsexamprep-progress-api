# 2026-09-22 nightly crawl

Shard 7/7, 400 of 2,126 sitemap URLs, 674 requests, 15m25s, no abort, no
throttling wall. This closes the seven-night rotation: every shard has now been
looked at at least once in the last week.

## Is anything on fire

Same fire as every night this week, still not fixed: the AP Cyber Unit 1 Lesson 1
lab's Check button, score badge and rubric header are still invisible, white text
on an undefined background. Now night 11. No new fire tonight.

## New tonight

**Nothing that is actually new.** One candidate looked new and was not: the
`api-stale-deploy` check fired, claiming production served `58283a3` (14.2h old)
while `main` was at `d454c9c`. Checked it myself before writing this: the check
reads `git rev-parse origin/main` from whatever the local checkout already has
cached, and this container's clone had not fetched `origin/main` since it was
created, so it was comparing against a ref that PR #758 had already moved past.
After `git fetch origin main`, the true tip is `58283a3`, matching what
production serves exactly. Confirmed live with a fresh curl of
`https://progress.apcsexamprep.com/api/health`: `"commit":"58283a3"`. Production
is caught up. This is the same class of false alarm the 2026-09-14 and
2026-09-16 runs hit on this check (`scripts/site-crawl.js` `deployLag()`,
around line 320), just with a different trigger: the earlier ones were about the
check's own logic, this one is about the crawling agent's git state not being
fresh before the check runs. Worth a human fix eventually (fetch `origin/main`
before reading it, or run the check only in a job that just checked out fresh),
but this run reads no fire from it.

**Two more pages doubled their brand suffix in the title tag**, same pattern as
last night's `robot-director` finding: `/pages/ap-csp-game-bridge-the-divide`
(`Bridge the Divide | AP CSP Big Idea 5 Game | APCSExamPrep.com | APCSExamPrep.com`)
and `/pages/ap-cybersecurity-complete-course-guide`
(`AP Cybersecurity Course Guide | All 5 Units Live | APCSExamPrep.com | APCSExamPrep.com`).
P2, cosmetic, same cause as last night: no `metafields.global.title_tag`
override, so `layout/theme.liquid` line 97 appends the suffix to a Title field
that already ends in it. Three of these across two nights on unrelated pages
(a game page, a course guide page, and last night's `robot-director`) suggests
this is worth a one-time sweep of every page's Title field for a trailing
`| APCSExamPrep.com` rather than three separate one-row fixes, but nobody asked
for that sweep and I am not scoping it unassigned.

Everything else this shard turned up (174 findings) is the same shard-rotation
pattern as every prior night: `h1-duplicate` (123) and `h1-is-title` (22),
boards #72 and #247, both `status=done verified=NO`, checked again tonight,
unchanged. `title-overlong` (23) and `meta-scraped` (6), same CSA/CSP pattern,
no board task for either.

## Resolved since last night

None. `delta.resolved` is empty for this shard.

## Still open

**P0, night 11: AP Cyber Unit 1 Lesson 1 lab's Check button, score badge and
rubric header are still invisible.** Reproduced live tonight with a fresh fetch
(412,876 bytes, three `Shopify.theme` markers, confirmed a real page and not a
challenge response): the body defines zero `--purple` or `--dark` custom
properties while using `var(--purple)` seven times and `var(--dark)` seven
times. Fix is unchanged: reinsert the ten custom-property definitions onto
`#cyber-lab-11` in `shopify/ap-cyber-unit-1-lesson-1-lab.html`, then re-import
via Matrixify. Boards #202, #203 and #264 all still read `status=done
verified=NO`, checked directly tonight.

**`css-var-undefined`, P2, same page, same root cause, night 11.** Not a
separate bug, part of #202/#203.

**`stale-year`, P1, 243 findings, oldest now at 19 nights, still no board
task.** Called out by name again per the playbook's five-night rule. Nineteen
nights in, this reads as ignored rather than unimportant. No task matching
"stale-year" or "2025-2026" anywhere on the board tonight either.

**`h1-duplicate` (365) and `h1-is-title` (33), up to 19 nights, boards #72 and
#247 both `status=done verified=NO`.** `meta-scraped` (7) and `title-overlong`
(42), same age range, no board task for either.

**`truncated-body` on `/products/ap-csa-teacher-superpack-free-preview`, now 12
nights.** Recrawled tonight, unchanged. Confirmed benign on prior nights as the
deliberate `meta http-equiv="refresh"` stub to a Google Drive folder.

**Checker bug, false resolutions on failed fetches, filed 2026-09-16, still
unfixed in `scripts/site-crawl.js:478` and `lib/site-crawl.js:826`.** Did not
fire tonight: `crawled` equals `ok` at 400/400, no failed fetches this run.
Still live in the code.

## Coverage

Shard 7/7, 400 of 2,126 sitemap URLs, 674 requests, 15m25s of a 25 minute
budget, no rate-limit abort, no wall-clock truncation. This completes tonight's
pass through all seven shards for the week.
`autofix-scan`: 0 of 698 findings scored eligible. Top blocking reasons:
`h1-duplicate` (365x), then `stale-year` (243x), then `title-overlong` (42x),
then `h1-is-title` (33x), same allow-list gap as every prior night.
