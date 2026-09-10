# Nightly crawl, 2026-09-10

Shard 2/7, 400 of 2,103 sitemap URLs, 676 requests, 09:07:45 to 09:22:58 UTC
(about 15 minutes), API build `58f8aff`. Baseline restored from
`claude/nightly-crawl-log` (2026-09-09's state). Run completed clean: 400/400
pages crawled ok, no throttle strikes, not aborted, no truncation.

## On fire

Nothing. Zero P0 findings tonight, and zero `broken-internal-link` findings
(the link audit ran to completion with no throttling, unlike the last two
nights).

## New tonight, worst first

**One root cause behind most of tonight's `stale-year` P1s, and it has a
wider footprint than previously described: `scripts/school-year-rollover.js`
updates the SEO title on a school-year refresh and leaves the meta
description, and sometimes a visible H1, on the old year.** Verified live,
title vs. meta side by side:

- `/pages/ap-csa-7day-emergency-cram-kit`: title "2026-2027 Exam Prep", meta
  still "2025-2026 exam format."
- `/products/ap-csa-2-week-cram-kit`, `/products/ap-csa-4-week-cram-kit`:
  titles "2026-27", meta still "2025-2026 4-unit curriculum" / "2025-2026."
- `/products/ap-csp-2-week-cram-kit`, `/products/ap-csp-4-week-cram-kit`:
  title says "2026" (no range, so the checker misses the title), but the
  **live, visible H1** on both still reads "... | 2025-2026 Exam." This is
  not a search-snippet problem, it is on the page.
- `/pages/flashcards`, `/products/ap-csa-flashcards-unit-2`, plus the rest of
  the flashcards product family (`ap-csa-flashcards-unit-1`, `-unit-4`,
  `-complete-bundle`, `ap-csp-big-idea-1` through `-4-flashcards`,
  `ap-csp-flashcards`): same split, meta or H1 still "2025-2026."
- `/pages/ap-csa-frq-strategy-guide`, `/pages/ap-csp-data-analysis-practice`:
  meta directly claims "for the 2025-2026 exam," which is no longer this
  year's exam.
- `/pages/ap-csa-self-study-pacing-guide`: title AND meta both say
  "(2025-26)" outright. Nobody touched this one at all; it is not a
  split-update, it is simply unrefreshed. A student opening this in
  September 2026 gets a schedule built for a year that already ended.
  6 nights old by the state file's own count (firing since at least
  2026-09-05), never named by page before tonight: it had been sitting
  inside the "other genuine rollover pages" bucket in prior notes.
- `/pages/ap-csa-unit-tests-hub`: title is clean but its own H1 reads "AP
  CSA 2025-26 Unit Practice Exams," live on the page, 7 nights old by the
  state file. Also not previously named.
- The two blog posts already on record, `/blogs/news/ap-csa-searching-sorting`
  and `/blogs/news/getters-setters-ap-csa`: same split, 7 nights, unchanged.

Cause: `scripts/school-year-rollover.js:107-108` loops `title`/`title_tag`
only, never the meta description metafield, and has no path to an H1 at all
since H1s live in Body HTML rather than a metafield. First diagnosed
2026-09-04 for the two blog posts; tonight's fetches show the same script
gap has left stale wording on the flashcards and cram-kit product families
too, which is a materially bigger blast radius than the "cram kit,
flashcards, FRQ guide, data-analysis, CodeHS blog" shorthand in prior notes
suggested. No fix has landed.

**Secondary, found while checking the CSP practice-exam page for the item
above: `/pages/ap-computer-science-principles-practice-exam-2025` (an AP
CSP page, confirmed by its own H1 "AP Computer Science Principles – Practice
Exam") carries a meta description that opens "Free AP CSA practice exam..."
naming the wrong course.** Same boilerplate string appears verbatim on the
AP CSA counterpart, `/pages/ap-csa-2025-practice-mcq`, so this reads as a
copy-paste of one page's meta onto the other rather than two independent
typos. Not a crawler-checked kind (the crawl checks year staleness and
scraped-fallback shape, not course-name correctness), found by reading the
page while verifying the P1 above. Not on the board. Small, but a CSP
searcher would see "AP CSA" in the Google snippet for a CSP page.

**`api-stale-deploy`, false positive, reproduced and explained again.**
Tonight's claim: production serves `58f8aff`, 17.8h old, main is `5282fc5`.
`git fetch origin main --quiet` from this container, then
`git rev-parse origin/main`, returns `58f8affe234f...` exactly, the same
commit production reports. Zero commits apart. `5282fc5` is stale data in
the crawler's own unfetched local clone, exactly the bug named on
2026-09-04 through 2026-09-09 (`deployLag()` in `scripts/site-crawl.js:315`
calls `git rev-parse origin/main` without fetching first). Unchanged in
code, now confirmed false on a 7th night with a crawl.

**`stale-year` false-positive bulk, unchanged.** The other roughly 200
`stale-year` hits tonight carry the same "Aligned to the 2025-2026 [4-unit
curriculum / Big Ideas curriculum / exam format]" boilerplate on topic
quizzes, practice-test pages, CodeHS solution pages, and the two CED-explainer
pages, which is CED-vintage labeling rather than a calendar claim, ruled
intentional in the 2026-09-05 run note. Sampled about 25 of tonight's set
directly (title/meta/H1 fetched live) rather than all 226; every one outside
the list above matched the templated wording. No fix has landed in
`lib/site-crawl.js` (`staleSchoolYears`), and none is warranted: this is the
checker's own known blind spot, not a site defect.

## Still open

- **The `school-year-rollover.js` meta/H1 gap above.** Confirmed wider
  tonight than previously scoped (flashcards and cram-kit product families,
  not just the two blog posts). Oldest instances (the two blog posts,
  `ap-csa-frq-strategy-guide`, `ap-csp-data-analysis-practice`,
  `ap-csa-unit-tests-hub`) are 7 nights old since first diagnosed
  2026-09-04. `ap-csa-self-study-pacing-guide` is 6 nights old in the state
  file, firing since at least 2026-09-05, just never called out by page name
  until tonight.
- **`stale-year` false positive on evergreen CED wording**, roughly 200
  hits tonight, max 7 nights, unfixed in code, not actionable.
- **`api-stale-deploy` false positive**, 7 nights (2026-09-04, 05, 06, 08,
  09, 10; no crawl 09-07), unfixed in code, not actionable on its own terms
  (`deploy-drift.yml` is the correct implementation and is not known to be
  red).
- **`h1-duplicate`**, site-wide template pattern (theme header H1 plus a
  content-authored H1), 371 tonight, max 7 nights, not verified individually
  per the P2 rule.
- **`h1-is-title`**, 35 total, max 7 nights, not verified individually.
- **`meta-scraped`**, 11 total (4 fresh tonight, all lesson/course-hub pages
  where Shopify fell back to scraped nav text), max 7 nights.
- **`title-overlong`**, 37 total, max 7 nights, not verified individually.
- **`brand-doubled`**, 2 total, both fresh tonight (`ap-csp-game-internet-
  routing-simulator`, `ap-csp-game-phishing-net`), not previously seen in
  this shard.
- **`broken-internal-link` reporting 429s as breaks** (`scripts/site-crawl.js`,
  the link-audit loop, `res.status >= 400`): the code is still unfixed, but
  it did not fire tonight because the link audit did not throttle. The 4
  false positives from 2026-09-09 recrawled clean tonight, see Resolved.

## Resolved since last night

- 4 of the 5 `broken-internal-link` false positives from 2026-09-09
  (`/pages/ap-networking-exam-format`,
  `/pages/ap-networking-lesson-2-6-firewalls-network-segmentation`,
  `/pages/intro-java-lesson-1-4-calling-a-method`,
  `/pages/intro-java-lesson-1-5-parameters-and-return-values`) recrawled
  clean tonight. These were never real dead links, per the 09-09 diagnosis
  (a shared rate-limit cooldown, not five broken pages); tonight just
  confirms it. The fifth,
  `/pages/ap-csp-unit-6-global-impact-complete-2025-study-guide`, was not
  in tonight's shard or hot set, so it is not claimed resolved (the crawler
  only credits a resolution on a URL it actually recrawled).

## Coverage

Shard 2/7, 400 of 2,103 sitemap URLs (site grew by 4 since last night), 676
requests, about 15 minutes. Not aborted, not truncated. `--max-minutes 25`
had 10 minutes of headroom left.

## Auto-fix score

`scripts/autofix-scan.js`: 0 of 683 findings scored eligible. Top blocking
reasons: `h1-duplicate` (371x, not on the allow list) and `stale-year`
(226x, not on the allow list). Nothing tonight is a script-safe fix; the two
real findings above (the rollover gap, the CSP/CSA meta swap) both need a
human's judgment about which of title, meta, and H1 is the correct source
of truth for a given page, which is not something a pattern-matched patch
should decide unattended.

## What was learned

The known "stale-year is mostly a checker false positive" framing from prior
nights was correct but too narrow in scope: it was checked mainly against
meta descriptions, and a page's *H1* can carry the same stale wording while
its title and meta are clean or already fixed (`ap-csp-2-week-cram-kit`,
`ap-csa-unit-tests-hub`). Checking only one field is how `ap-csa-self-study-
pacing-guide` and `ap-csa-unit-tests-hub` went unnamed for six and seven
nights despite firing every night: title/meta didn't look obviously wrong at
a skim, and the checker's own evidence field only prints the matched year
string, not which field it came from. Fetching title, meta, and H1 together
for a sample, rather than trusting the evidence string alone, is what
separated the two classes tonight and is worth doing again rather than
assuming the shape is always the same as the last diagnosis.
