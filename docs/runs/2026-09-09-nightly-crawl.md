# Nightly crawl, 2026-09-09

Shard 1/7, 400 of 2,099 sitemap URLs, 504 requests, 09:08:10 to 09:22:44 UTC
(about 14.5 minutes), API build `84228ac`. Baseline restored from
`claude/nightly-crawl-log` (2026-09-08's state).

**The run aborted on throttling after the main crawl finished.** All 400
target pages for this shard crawled clean (400/400 ok). The link-integrity
pass that runs after the main loop hit 5 throttled responses and stopped
itself at 499 requests rather than pushing through, per the playbook. This
is the correct, expected outcome, not a site problem, and it is why tonight
carries a P0 (`challenge-served`) that is about the crawl's own behavior,
not the storefront's.

## On fire

Nothing on the storefront itself. 0 genuine P0 against site content.

## New tonight, worst first

**A checker bug, not a site problem: `broken-internal-link` cannot tell a
429 from a real dead link, and reported 5 of tonight's 5 throttled link
checks as broken pages.** `scripts/site-crawl.js` around the link-audit
loop (`if (res.status >= 400 || res.status === 0)`) treats any status 400+
as broken, with no carve-out for 429/503. The 5 flagged tonight,
`/pages/ap-csp-unit-6-global-impact-complete-2025-study-guide`,
`/pages/ap-networking-exam-format`,
`/pages/ap-networking-lesson-2-6-firewalls-network-segmentation`,
`/pages/intro-java-lesson-1-4-calling-a-method`, and
`/pages/intro-java-lesson-1-5-parameters-and-return-values`, all fired in
the same window the crawl's own throttle counter tripped 5 strikes and
aborted. Reproduced from this container after the crawl finished: all 5
still answered 429 with the Cloudflare challenge marker, several seconds
apart. Ran a control fetch against `/` (the homepage, which crawled fine as
part of tonight's 400) and it also answered 429 challenged at that moment.
A known-good page returning the same code as the "broken" ones, at the same
time, is the signature of a shared rate-limit cooldown, not five
independently dead pages. Stopped there rather than continuing to fetch
against a storefront that was still visibly under a throttle; per the
playbook, verifying five findings is not worth the same cost the abort
itself was written to avoid. `autofix-scan.js` scored these 5 `LOW`
("computed rather than authored, provable by a smoke assertion"), which is
also wrong for the same reason: there is nothing here to fix, because
nothing is actually broken. The true eligible count tonight is 0, not the
5 the scanner reports, once the false positive is subtracted.

This is a different symptom from board #79 ("46 pages returned 429 during
crawl, re-verify single-threaded", status done, verified NO), which was
about a 14-thread crawl; this crawler is already single-threaded per that
task's own finding and still throttled under sustained sequential load once
the link audit pushed request count past ~500. Not proposing a new board
item for it per the playbook (this job reads, it does not write the
ledger); naming the file and the fix here is the deliverable. The fix I
would make: in the link-audit loop, treat 429/503 as "inconclusive, retry
next night" rather than "broken", the same way `looksLikeChallenge()`
already treats those statuses as a challenge rather than content.

**`api-stale-deploy` false positive, 6th consecutive night.** Tonight's
claim: "production serves 84228ac, which is 5.0h old; main is 5282fc5."
`git fetch origin main --quiet` from this container, then
`git rev-parse origin/main`, returns `84228ac` exactly, the same sha
production reports, 0 commits apart. `5282fc5` is not a newer commit
anything is behind on; it is stale data in the crawler's own unfetched
local clone. `deployLag()` in `scripts/site-crawl.js:320` still calls
`git rev-parse origin/main` without fetching first, unchanged since first
diagnosed 2026-09-04.

**`stale-year` fired 38 fresh hits this shard, all the known evergreen-CED
false positive, unchanged in code.** Sampled the shape rather than every
URL: none of tonight's 38 carry the specific SEO-title-vs-meta split that
marks a genuine rollover (checked directly, see below); all read as topic
quizzes, practice-test hubs and reference sheets whose body text is "Aligned
to the 2025-2026 [4-unit curriculum/exam format]," the CED-vintage labeling
`docs/runs/2026-09-05-nightly-crawl.md` already ruled intentional. No fix
has landed in `lib/site-crawl.js` (`staleSchoolYears`) since first diagnosed.

**All previously-found genuine rollover pages recrawled tonight and
confirmed still stale, unchanged.** This shard's hot-set recrawl caught
`/pages/ap-csa-7day-emergency-cram-kit`, `/pages/ap-csa-frq-strategy-guide`,
`/pages/ap-csp-data-analysis-practice`, `/pages/flashcards`,
`/products/ap-csa-flashcards-unit-2`, and the CodeHS midterm blog post,
all still carrying the split-update or direct-year-claim signature
`docs/runs/2026-09-06-nightly-crawl.md` and
`docs/runs/2026-09-08-nightly-crawl.md` already diagnosed. No new pages
found in this shape tonight. Not on the board (checked "stale," "rollover,"
"flashcard," "school-year," "cram," "codehs," "midterm" against
`apcs list`, nothing matches).

## Still open

- **`broken-internal-link` reporting 429s as breaks.** New tonight, unfixed
  in code, see above. 1 night.
- **`stale-year` checker false positive on evergreen CED wording.** 6 nights
  since first diagnosed 2026-09-05, unfixed in code.
- **`api-stale-deploy` checker false positive.** 6 nights since first
  diagnosed 2026-09-04 (2026-09-07 had no crawl), unfixed in code.
- **The two rollover blog posts**, `/blogs/news/ap-csa-searching-sorting` and
  `/blogs/news/getters-setters-ap-csa`, first found 2026-09-04. **6 nights,
  named per the playbook's threshold.** Cause unchanged:
  `scripts/school-year-rollover.js:107-108` loops `title`/`title_tag` only,
  never the meta description metafield.
- **The other genuine rollover pages** (cram kit, flashcards, FRQ strategy
  guide, data-analysis practice, CodeHS blog, flashcards unit 2), first
  found 2026-09-06/08, recrawled and confirmed still stale tonight. Not yet
  folded into a Matrixify sheet.
- **`h1-duplicate`**, site-wide template pattern (theme header H1 plus a
  second content-authored H1). 368 total tonight, max 6 nights on recurring
  hot-set pages, not verified individually per the P2 rule.
- **`h1-is-title`**, 27 total, max 6 nights, not verified individually.
- **`meta-scraped`**, 14 total, max 6 nights, not verified individually.
- **`title-overlong`**, 40 total, max 6 nights, not verified individually.

## Resolved since last night

- `widgets-regressed` P1, `/pages/ap-cyber-unit-1-frq-practice`. Recrawled
  clean again tonight (hot-set page), consistent with 2026-09-08's
  resolution, not a fluke.
- `h1-duplicate` P2, `/pages/cyber-command-center`. Recrawled clean.

## Coverage

Shard 1/7, 400 of 2,099 sitemap URLs, 504 requests, about 14.5 minutes. Main
crawl completed clean (400/400 ok); the link-audit pass that follows it
aborted after 5 throttled responses, per the playbook's rate-limit rule.
Did not re-run with a larger budget. A short night on the link audit means
untested rather than clean for whatever targets the audit did not reach
before stopping.

## Auto-fix score

`scripts/autofix-scan.js`: 5 of 683 findings scored eligible, all
`broken-internal-link`, and all 5 are the throttling false positive
diagnosed above, not real dead links. The true eligible count is 0. Top
blocking reasons otherwise unchanged from prior nights: `h1-duplicate`
(368x) and `stale-year` (226x) are not on the auto-fix allow list.

## What was learned

The crawl's own abort condition can poison the very check that runs right
after it: the link audit doesn't know the crawl it is part of just started
throttling, so it reports the throttle's own symptom as a site defect. The
control fetch against a known-good URL (the homepage) returning the same
429 at the same time is what separated this from a real finding without
having to hammer the storefront further to check all 5 individually. That
pattern, one clean control request instead of five more probes, is worth
keeping: it answers "is this the site or is this me" for one request
instead of N.
