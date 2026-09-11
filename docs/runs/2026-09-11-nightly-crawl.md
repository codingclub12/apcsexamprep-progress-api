# Nightly crawl, 2026-09-11

Shard 3/7, 400 of 2,103 sitemap URLs, 674 requests, 09:07:54 to 09:23:44 UTC
(about 16 minutes), API build `3206ced`. Baseline restored from
`claude/nightly-crawl-log` (2026-09-10's state, 400 URLs). Run completed
clean: 400/400 pages crawled ok, not aborted, not truncated, exit code 0.

## On fire

Nothing. Zero P0 findings tonight.

## New tonight, worst first

Three non-`stale-year` P1s fired. All three checked out as not real defects.

**`truncated-body`, `/products/ap-csa-teacher-superpack-free-preview`, 10109
bytes.** Not a defect: this is the drive-redirect page shipped last night
(board task 309, theme PR #113, `docs/runs/2026-09-10-claude-code-free-
preview-drive-redirect.md`). The page intentionally stopped being a full
Shopify product page and now bounces to a Google Drive folder, so it is
short on purpose. 10109 bytes matches that PR's own live check byte-for-
byte. Confirms two things from last night's note as a side effect: the
page's prior `h1-duplicate` and `title-overlong` findings are gone tonight
(listed under Resolved below) because the old product body they fired on no
longer exists.

**`api-stale-deploy`, `/api/health`, claims production is 2.8h stale
against `main`.** False positive, same known bug as every prior night this
has fired. `git fetch origin main --quiet && git rev-parse origin/main`
from this container returns `3206ced...`, byte-identical to the commit
production reports. `deployLag()` in `scripts/site-crawl.js:315` calls
`git rev-parse origin/main` without fetching first, so it is reading a
stale local clone. Unfixed in code, reproduced false again.

**`broken-internal-link`, `/pages/intro-java-lesson-6-4-grid-to-world-
coordinates`, HTTP 503.** Reproduced live through `lib/storefront-fetch.js`
three times after the crawl, about 1.5s apart: three clean 200s, no
challenge. Same shape as the 2026-09-09 false-positive batch noted last
night (`scripts/site-crawl.js`'s link-audit loop counts any `res.status >=
400` as a break, including a transient throttle response). Not a real dead
link.

Net: nothing new to fix tonight.

## Still open

- **`school-year-rollover.js` meta/H1 gap, 8 nights (first diagnosed
  2026-09-04), NO BOARD TASK.** All prior instances still fire unchanged
  tonight: `ap-csa-frq-strategy-guide`, `ap-csp-data-analysis-practice`,
  `ap-csa-unit-tests-hub`, `ap-csa-searching-sorting`, `getters-setters-ap-
  csa` at 8 nights; `ap-csa-self-study-pacing-guide` at 7; the cram-kit and
  flashcards product families at 4 to 5. Cause unchanged:
  `scripts/school-year-rollover.js:107-108` updates `title`/`title_tag`
  only, never the meta description metafield, and has no path to a Body-
  HTML H1 at all. This has now been open, verified, and named by file and
  line for over a week with nothing on the board tracking it. Either it is
  not actually a priority or it is being missed; worth a human decision
  either way rather than a ninth night of the same paragraph.
- **CSP/CSA meta-description swap, found 2026-09-10, still live, not a
  crawler-checked kind.** Re-verified tonight:
  `/pages/ap-computer-science-principles-practice-exam-2025` (confirmed AP
  CSP by its own H1) still serves a meta description opening "Free AP CSA
  practice exam...". Same boilerplate string as
  `/pages/ap-csa-2025-practice-mcq`, so still reads as one page's meta
  copy-pasted onto the other. Small (wrong course name in a search
  snippet), not on the board, not something the crawler flags on its own
  (it checks year staleness and scraped-fallback shape, not course-name
  correctness).
- **`stale-year` false-positive bulk on evergreen CED wording**, 226
  hits tonight (max 8 nights), same "Aligned to the 2025-2026 [curriculum /
  exam format]" boilerplate on topic quizzes and practice pages, ruled
  intentional 2026-09-05, unfixed in the checker and not warranted as a
  fix per prior nights' sampling.
- **`api-stale-deploy` false positive**, fires most nights this build has
  run, unfixed in code (`scripts/site-crawl.js:315`), not actionable on its
  own terms.
- **`broken-internal-link` counting throttle responses as breaks**
  (`scripts/site-crawl.js`, link-audit loop, `res.status >= 400`), code
  still unfixed, fired once tonight as described above.
- **`h1-duplicate`**, 369 tonight, max 8 nights, site-wide template
  pattern (theme header H1 plus content H1), not verified individually per
  the P2 rule.
- **`h1-is-title`**, 34 total, max 8 nights, not verified individually.
- **`meta-scraped`**, 10 total, max 8 nights, Shopify-scraped-nav
  fallback on lesson/hub pages.
- **`title-overlong`**, 35 total, max 8 nights, not verified individually.
- **`brand-doubled`**, 2 total (`ap-csp-game-crowd-power`,
  `ap-csp-game-license-match`), 1 night, not previously seen in this shard.

## Resolved since last night

- `h1-duplicate` and `title-overlong` on `/products/ap-csa-teacher-
  superpack-free-preview` (6 nights old). Not a fix in the ordinary sense:
  the page these fired on no longer exists in that shape, replaced by the
  drive-redirect bounce page from board task 309. Recrawled clean tonight,
  credited as resolved because the URL was actually recrawled.

## Coverage

Shard 3/7, 400 of 2,103 sitemap URLs, 674 requests, about 16 minutes. Not
aborted, not truncated. `--max-minutes 25` had about 9 minutes of headroom
left.

## Auto-fix score

`scripts/autofix-scan.js`: 0 of 679 findings scored eligible. Top blocking
reasons: `h1-duplicate` (369x) and `stale-year` (226x), neither on the
auto-fix allow list. Nothing tonight is a script-safe fix.

## What was learned

Two of tonight's three fresh non-`stale-year` P1s were checker artifacts
this repo already has a name for (the git-fetch bug behind `api-stale-
deploy`, the throttle-as-break bug behind `broken-internal-link`), and the
third was a real but already-shipped and already-verified change from last
night's session, not something this crawl needed to surface. The one
finding worth a human's attention tonight is not a fresh one at all: the
school-year rollover gap crossed 8 nights open with a file and line
attached since the first night, and still has no board task, which is
exactly the "being ignored" case the playbook asks this report to call out
by name rather than let scroll past as one more still-open bullet.
