# Nightly crawl, 2026-09-06

Shard 5/7, 400 URLs crawled, 678 requests, 14 minutes, not aborted, not truncated.
Baseline restored from `claude/nightly-crawl-log` (prior finding ages run up to 4
nights).

## On fire

Nothing new. One real P0 carries over from last night, still unfixed, still
theme-repo work: see below.

## New tonight

**P1. Seven product pages and two content pages sell exam prep for an exam that
already happened, and it looks like a rollover that started and stopped.** Sampled
all 151 `stale-year` hits by fetching each live page (title, meta description, H1)
and separating the checker's known false-positive class ("aligned to the
2025-2026 curriculum/CED/exam format", which `docs/runs/2026-09-05-nightly-crawl.md`
already established is evergreen CED-vintage language, not a calendar claim) from
genuine ones. 142 of 151 are that same evergreen pattern. 9 are not:

| Page | `<title>` tag | Body text |
|---|---|---|
| `/products/ap-csa-2-week-cram-kit` | "...2026-27..." | H1: "...2025-2026 Exam" |
| `/products/ap-csa-4-week-cram-kit` | "...2026-27..." | H1: "...2025-2026 Exam" |
| `/products/ap-csp-5-big-ideas-quick-reference` | "...2026-27..." | H1: "...2025-2026 Exam Prep" |
| `/products/ap-csp-pseudocode-reference-sheet` | "...2026-27..." | meta: "...for the 2025-2026 exam" |
| `/pages/ap-csa-frq-strategy-guide` | "...2026" | meta: "...for the 2025-2026 exam" |
| `/products/ap-csa-flashcards-unit-1` | no year | meta: "...for the 2025-2026 exam" |
| `/products/ap-csp-4-week-cram-kit` | "...2026" | H1: "...2025-2026 Exam"; meta: "cram kit for May 2026" |
| `/products/ap-csp-big-idea-3-flashcards` | no year | meta: "...for the 2025-2026 exam" |
| `/pages/ap-csp-data-analysis-practice` | no year | meta: "...Big Idea 2 and the 2025-2026 exam" |

Four of these show the tell directly: the SEO `<title>` was already updated to
"2026-27" while the on-page H1 or meta description one field over still says
"2025-2026 Exam." That is not evergreen curriculum language, it names a specific
exam administration, and the 2025-2026 administration was in May 2026, four
months before this crawl. A customer landing on `/products/ap-csa-4-week-cram-kit`
in September 2026, prime cram-kit season, sees a browser tab that says "2026-27"
and a product heading that says "2025-2026 Exam." That is a checkout-page
inconsistency on a paid product, not a hygiene nit.

Traced as far as the two repos here go: no generator or canonical spec for cram
kits, flashcards, or quick-reference products exists in either repo, so this is
hand-edited Shopify product/page content, not a template bug I can point at a
file for. Whoever updated the SEO titles for the new school year did not update
the Body HTML or meta description in the same pass, on at least these 9 records.
Only 1/7 of the site was sampled tonight; since 7 of the 9 are products, and the
sitemap carries 51 products total, more of the catalog likely has the same gap
and will surface as the week's shards rotate through it.

What I would do: a Matrixify sheet correcting Title (H1) and meta description on
these 9 records to "2026-27" / "2026-2027," reviewed by a human per the repo's own
Shopify-content convention, plus a pass checking the rest of the product catalog
for the same half-finished pattern rather than waiting for shard rotation to find
them one at a time.

Not on the board under any task I could find (searched for "cram kit," "2026-27,"
"stale year," "rollover," "exam year").

## A checker bug, not a site problem, still open from last night

**142 of tonight's 151 `stale-year` hits are the same false positive documented in
`docs/runs/2026-09-05-nightly-crawl.md`.** No fix has landed in `lib/site-crawl.js`
(`staleSchoolYears`) since last night. Same shape: "aligned to the 2025-2026
[curriculum/CED/exam format]" is CED-vintage labeling this repo's own CLAUDE.md
says to keep permanently, not a claim about the current school year, and the
checker still can't tell the two apart. Proposed fix is unchanged from last
night's note. 1 night old as a re-confirmed diagnosis.

**The `api-stale-deploy` P1 is also last night's exact false positive, reproduced
again.** Tonight's finding: "production serves b84635e, which is 34.2h old; main
is 5282fc5." Ran `git fetch origin main --quiet` and rechecked: `origin/main` is
`b84635e`, identical to what `/api/health` reports live, and `b84635e` is an
ancestor check target that matches exactly. Production is current. `deployLag` in
`scripts/site-crawl.js` still doesn't fetch before comparing, exactly as diagnosed
last night. Same fix proposed: `git fetch origin main --quiet` before the
`rev-parse` in `deployLag`.

**The one `broken-internal-link` finding was an edge-cache blip, not a dead
page.** `/pages/ap-csp-course-bi5-safe-computing` reported HTTP 503 during the
crawl, linked from 2 unique CSP Big Idea 5 pages. Fetched it myself three times a
few minutes apart: 200, 200, 200. This is the exact pattern the playbook warns
about (a cached 500/503 that clears on a second look), not a broken link.

## P0 still open: 2 nights, unfixed, unclaimed

`ap-cyber-unit-1-frq-practice` still has a graded widget
(`data-item-id="unit-1-frq"`) and no working score path. Reproduced live tonight:
the page loads `apcs-grade-reporter` (inline, theme repo), not
`apcs-score-reporter.js`, and `docs/runs/2026-09-05-nightly-crawl.md` already
traced this to the activity-name resolver in
`snippets/apcs-grade-reporter.liquid` not recognizing the `-frq-practice` handle
suffix, with a proposed fix (add an `-frq-practice` branch mirroring the `exam`
branch). Still not on the board under any task title I could find. This is
theme-repo work and a storefront deploy the moment it merges, so it stays a
human's call, but two nights unclaimed on a P0 that silently drops a grade is
worth a name.

## Still open

Nothing at 5 nights or more yet; the restored baseline only reaches back to
2026-09-03, so the oldest confirmed age on any finding tonight is 4 nights
(`stale-year`, `h1-duplicate`, `h1-is-title`, `meta-scraped`, `title-overlong`,
all part of the known patterns below).

## Resolved since last night

None. Nothing in last night's P0/P1 set (part of tonight's hot set regardless of
shard) came back clean tonight; the P0 is still broken and the P1s were already
false positives, so there was nothing to resolve.

## Coverage

Shard 5/7, 400 of 2,095 sitemap URLs, 678 requests, about 14 minutes, no
throttling, no abort.

## Auto-fix score

`scripts/autofix-scan.js`: 1 of 589 findings scored eligible, and it was the
`broken-internal-link` case above, which had already cleared itself by the time I
checked it live, so there is nothing to automate tonight. Top blocking reasons:
`h1-duplicate` (309x) and `stale-year` (151x, and see above, this whole kind
needs the checker fix before it is worth scoring) are not on the allow list. The
one P0 is blocked as theme-repo work, which the router already refuses to route
around.

## P2 / P3, counts only

- `h1-duplicate` (P2): 309 total, 176 fresh tonight (new URLs entering the shard
  rotation, not new breakage). Unchanged pattern from last night: FRQ solution
  pages carrying both a navigation H1 and a shorter content H1 are the recurring
  shape, consistent with one shared FRQ template rather than isolated mistakes.
- `title-overlong` (P3): 80 total, 68 fresh.
- `h1-is-title` (P2): 31 total, 23 fresh. Same pattern as before: pipe-delimited
  SEO titles reused verbatim as the H1.
- `meta-scraped` (P2): 15 total, 10 fresh. Mostly `ap-csp-daily-practice` blog
  posts, same as last night.

## What was learned

Sampling every hit of a checker already flagged as noisy, rather than trusting
last night's "it's all false positives" and moving on, is what separated the 9
real records from the 142 repeats tonight. A checker bug does not mean every one
of its hits is noise forever; it means each one needs the same five minutes of
looking that a clean check would have earned automatically.
