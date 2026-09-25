# 2026-09-25 nightly crawl

Shard 3/7. 400 of 2,133 sitemap URLs, 676 requests, 16m35s, no abort, no
throttling wall (25 minute budget).

## Is anything on fire

Same fire as every night for two weeks, still not fixed: the AP Cyber Unit 1
Lesson 1 lab's Check button, score badge and rubric header are still invisible,
white text on an undefined background. Now night 14.

One new item worth flagging even though it is not a P0: at least 11 of the 28
AP CSP game pages carry a broken SEO Title, in three different ways, and it has
gone unnoticed because the crawler's per-shard checks only compare against
themselves. Detail below.

## New tonight

**Broken SEO titles on 11 of 28 AP CSP game pages.** The crawler's shard flagged
two `brand-doubled` findings tonight (`ap-csp-game-crowd-power`,
`ap-csp-game-license-match`). Last night's note (2026-09-24) flagged two
different ones (`internet-routing-simulator`, `phishing-net`) and concluded it
was "a content-authoring slip on two specific pages... since a template bug
would hit every untagged page, not two." Two different shards each finding a
different pair of pages on the same 28-page set was the tell that the sample
was too small, so I fetched all 28 game pages directly (sitemap enumeration,
one request per second, no UA override) rather than trusting either night's
partial view. Full picture:

- **6 pages double the brand suffix**, not 2: `internet-routing-simulator`,
  `robot-director`, `bridge-the-divide`, `crowd-power`, `license-match`,
  `phishing-net`. Traced to `layout/theme.liquid:97` in the theme repo
  (`{{ page_title }} | APCSExamPrep.com` when no metafield override), same
  mechanism as last night, just a bigger set than either single shard showed.
- **4 pages have a title cut off mid-word, dropping the topic number
  entirely**, a defect neither night's shard reported because it is not
  overlong and not missing, just truncated in the middle:
  `algorithm-assembler` ends `"...Loop | T"`, `branch-runner` ends
  `"...Dangling ELSE | To"`, `name-the-thing` ends `"...Constants | To"`,
  `halving-hunter` ends `"...Guesses | Topic "` (trailing space, no number).
  None of the four carry the brand suffix, which means
  `page.metafields.global.title_tag` is set directly to the truncated string,
  not falling through to the theme's `page_title | APCSExamPrep.com` branch.
  This is a corrupted metafield value, not a template bug, most likely from
  whatever authored or imported these SEO Title fields. Worth checking against
  `branch-runner`'s own H1, which is intact and complete in this repo's
  baseline evidence (`"...Dangling ELSE | Topic 3.7"`), so the truncation is
  specific to the title_tag metafield, not a loss of the underlying content.
- **1 page has a stray fragment plus the append**: `redundant-routing`'s title
  reads `"...Big Idea 4 Game | APCSE | APCSExamPrep.com"`, a half-typed brand
  name left in the metafield, with the theme's real append tacked onto the end
  of that.
- The other 17 game pages carry correct, complete, non-doubled titles ending
  in the right topic number.

No board task exists for this (checked `apcs list` and `apcs list --all` for
csp-game, brand, title-truncation keywords: nothing). This is student-facing
SEO surface on a course-tagged practice game library, not a P0 (nothing is
blocked, nothing mis-grades), but it is wider than either night's shard alone
suggested, which is the reason to write it up now rather than wait for a shard
to eventually cover all 28 on its own. Fix is a Matrixify sheet correcting the
11 SEO Title metafields: 6 need the trailing `| APCSExamPrep.com` removed
(theme will re-add it), 4 need the topic number restored, 1 needs the stray
fragment removed. Per repo convention this ships as a reviewable sheet, not a
hand edit.

**`api-stale-deploy` fired again, `nights: 1`, the same false alarm as the last
three run notes (2026-09-16, 23, 24).** Claimed production's `9d522d1` was
14.5h old against a local `main` tip of `1ef64ae`. Ran `git fetch origin main`
myself: `origin/main` moved to `9d522d1`, exactly what `/api/health` reports
live (`"commit":"9d522d1"`). Production was never stale; the crawl script's
own local git clone was, because `deployLag()` in `scripts/site-crawl.js:315`
compares against whatever `origin/main` the container's clone last fetched
instead of fetching first. Fourth occurrence of the same root cause in ten
days. Still not fixing it tonight, this job reads and reports.

169 of tonight's other fresh-delta findings (`h1-duplicate` 127,
`h1-is-title` 21, `title-overlong` 16, `meta-scraped` 5, `slow` 1) are the same
shard-rotation pattern as every prior night: first-time-compared instances of
week-old, already-boarded systemic issues surfacing on pages this shard had
not looked at before.

## Resolved since last night

None. `delta.resolved` is empty for this shard.

## Still open

**P0, night 14: AP Cyber Unit 1 Lesson 1 lab's Check button, score badge and
rubric header are still invisible.** Cause unchanged:
`#cyber-lab-11` reads 10 custom properties (`--purple`, `--dark`, and 8 more)
with no definition block on the page, so declarations using them are invalid
at computed-value time and drop silently. Fix is unchanged: reinsert the ten
custom-property definitions in `shopify/ap-cyber-unit-1-lesson-1-lab.html`,
then re-import via Matrixify. Boards #202, #203, #264, all checked directly
tonight, still `status=done verified=NO`.

**`stale-year`, P1, 243 findings in this shard, now 22 nights, still no board
task.** Called out by name again per the playbook's five-night rule.
Twenty-two nights in, this reads as ignored rather than unimportant.

**`h1-duplicate` (369) and `h1-is-title` (32), boards #72 and #247, both
`status=done verified=NO`, 22 nights.** `meta-scraped` (6), same age, no board
task. `title-overlong` (35), 22 nights, no board task.

**`truncated-body` on `/products/ap-csa-teacher-superpack-free-preview`, now 15
nights.** Recrawled tonight, unchanged, still the deliberate
`meta http-equiv="refresh"` stub to a Google Drive folder.

**Checker bug, false resolutions on failed fetches, filed 2026-09-16, still
unfixed in `scripts/site-crawl.js:478` and `lib/site-crawl.js:826`.** Did not
fire tonight: 400/400 crawled ok, no failed fetches this run. Still live in the
code.

**`deployLag()` false-alarm bug, flagged 2026-09-24, still unfixed in
`scripts/site-crawl.js:315`.** Fourth confirmed false alarm in ten days
(2026-09-16, 23, 24, 25), same missing `git fetch` before comparing.

## Coverage

Shard 3/7, 400 of 2,133 sitemap URLs, 676 requests, 16m35s of a 25 minute
budget, no rate-limit abort, no wall-clock truncation.

`autofix-scan`: 0 of 694 findings scored eligible, same as every prior night.
Top blocking reasons: `h1-duplicate` (369x), `stale-year` (243x),
`title-overlong` (35x), `h1-is-title` (32x), same allow-list gap as every
prior night.
