# Nightly crawl, 2026-09-08

Shard 7/7, 400 of 2,099 sitemap URLs, 673 requests, 09:07:47 to 09:23:06 UTC
(about 15 minutes), API build `ddcf427`. No throttling, no abort, no truncation.
Baseline restored from `claude/nightly-crawl-log` (2026-09-06's state; last
night, 2026-09-07, produced no crawl, see that note).

## On fire

Nothing. 0 P0 tonight.

## New tonight, worst first

**P1, real, 3 new records added to the school-year rollover pattern
`docs/runs/2026-09-06-nightly-crawl.md` already opened.** That note found 9
product/content pages where the SEO title had been updated to the new exam
year but the on-page H1 or meta description still said "2025-2026," and
predicted more of the catalog would surface as shard rotation continued.
Shard 7 turned up three more:

- `/pages/ap-csa-7day-emergency-cram-kit`: `<title>` reads "...2026-2027 Exam
  Prep..." while the meta description reads "...2025-2026 exam format." Same
  split-update signature as the 9 already found: title fixed, meta not.
- `/pages/flashcards`: meta description, OG description, and Twitter
  description all read "AP CSA and AP CSP digital flashcards for 2025-2026."
  No curriculum-qualifier wording here (no "aligned to," no "CED"), so this
  is not the evergreen false-positive pattern below; it is a direct, specific
  year claim in search/social-facing text only, not in visible body copy.
- `/blogs/news/codehs-midterm-study-guide-ap-csa-cortado-2025-ap-csp-python-javascript`:
  `<title>` reads "AP CSA and CSP 2025" and the H1 reads "CodeHS Midterm Prep
  Guide: AP CSA (Cortado, 2025-26)...". This is a CodeHS midterm study guide,
  seasonal content tied to a specific school year, currently naming a year
  that ended in spring 2026.

Traced as far as this repo goes: same as 2026-09-06, no generator or
canonical spec exists for cram kits, flashcards, or this blog post in either
repo, so these are hand-edited Shopify content, not a template bug with a
file to point at. Searched the board for "cram," "flashcard," "codehs,"
"midterm," "stale year," "rollover" and found nothing open under any of
those. Not on the board.

What I would do: fold these three into the Matrixify sheet the 2026-09-06
note already proposed for the original 9, correcting Title/H1/meta to
2026-27 across all 12, reviewed by a human per the repo's Shopify-content
convention.

**P1, real, unchanged, now 5 nights open, not on the board:** the two blog
posts first found 2026-09-04, `/blogs/news/ap-csa-searching-sorting` and
`/blogs/news/getters-setters-ap-csa`. Reverified live tonight: both still
show `<title>...Complete Guide (2026-2027)</title>` next to a meta
description reading `...Complete Guide (2025-2026)`. Cause, per 2026-09-04:
`scripts/school-year-rollover.js:107-108` loops `title` and `title_tag` only,
never the meta description metafield. Unchanged since first found. Five
nights is the playbook's own threshold for calling something out by name:
either this is not actually important, or it is being ignored, and it is
worth a human's attention either way.

## A checker bug, not a site problem, confirmed again from prior nights

**The `stale-year` false positive is unchanged in code, now the fifth
consecutive night it has fired.** 188 of tonight's 190 `stale-year` hits, by
pattern. Sampled a cross-section of tonight's 37 fresh hits, chosen to bias
toward the pages most likely to be genuinely stale (products, reference
sheets, practice-test hubs) rather than a blind sample:
`/pages/ap-csa-cram-sheet`, `/pages/ap-csa-practice-tests-by-topic`,
`/pages/ap-csa-searching-sorting`, `/pages/getters-setters-ap-csa`, and
`/pages/ap-csa-practice-test-searching-sorting` all read "Aligned to the
2025-2026 [4-unit curriculum / exam format]," which
`docs/runs/2026-09-05-nightly-crawl.md` already established is CED-vintage
labeling this repo's CLAUDE.md protects on purpose, not a calendar claim. No
fix has landed in `lib/site-crawl.js` (`staleSchoolYears`) since first
diagnosed 2026-09-05. Proposed fix unchanged: narrow the pattern to require
an administration-specific phrase near the year rather than firing on any
"2025-2026" substring.

**`api-stale-deploy` fired again, and is the same false positive as every
prior night.** Tonight's claim: "production serves ddcf427, which is 3.1h
old; main is 5282fc5." Ran `git fetch origin main --quiet` from this
container and rechecked: `origin/main` is `ddcf427`, exactly what
`/api/health` reports live. `5282fc5` is an ancestor of `ddcf427`
(`git merge-base --is-ancestor 5282fc5 ddcf427` confirms it), not a newer
commit the crawl fell behind on; the crawler's local clone of `main` was
simply stale at crawl time. `deployLag()` in `scripts/site-crawl.js` still
does not fetch before comparing. Not on the board under "deployLag,"
"stale deploy," "site-crawl," or "checker."

**The one `broken-internal-link` and the one `h1-duplicate` in tonight's
`resolved` list are both confirmed real resolutions, not blips.** Checked
because the playbook only credits a resolution the crawler actually
recrawled tonight: `/pages/ap-csp-course-bi5-safe-computing` (503 last
night) and `/pages/ap-networking-command-center` (3 H1s last time) were both
in this shard and came back clean.

**`widgets-regressed` fired once, on `/pages/ap-cyber-unit-1-frq-practice`,
and it is the correct, intentional shape of a fix landing, not a
regression.** This is a new check kind (`lib/site-crawl.js:132`); tonight is
its first hit. Board #249, status done, artifact
[PR #572](https://github.com/codingclub12/apcsexamprep-progress-api/pull/572):
"carries data-item-id=unit-1-frq but the server resolves the handle to
nothing: strip the attribute." Fetched the live page: the wrapper div no
longer carries `data-item-id`, only `data-course`/`data-activity`/
`data-lesson-id="unit-1-frq"`. Read the page's own inline script: this is a
self-scored checkbox rubric (a student checks the criteria they believe they
earned; a client-side `tally()` sums it locally) with no `fetch`/`POST`
anywhere in the page. It was never gradeable server-side, so removing
`data-item-id` correctly stops advertising a graded item the server can
never resolve. This is also why the P0 that has been open the last three
nights (`reporter-missing` on this same URL, "graded widget but no
reporter loaded") is in tonight's `resolved` list: same fix, both symptoms.
`verified` on #249 is still `NO`; this crawl cannot set it (never does), but
the live page now matches what the closed task describes doing. Worth a
human's five minutes to flip it.

## Still open

- **`stale-year` checker false positive** (see above). 5 nights since first
  diagnosed 2026-09-05, unfixed in code.
- **`api-stale-deploy` checker false positive** (see above). 5 nights since
  first diagnosed 2026-09-04 (2026-09-07 has no data since no crawl ran that
  night), unfixed in code.
- **The two rollover blog posts**, 5 nights, named above.
- **The 9 product/content pages found 2026-09-06** (cram kits, flashcards,
  reference sheets, `ap-csa-frq-strategy-guide`, `ap-csp-data-analysis-practice`).
  Not recrawled tonight, different shard; last confirmed broken 2026-09-06.
  Full list in that note.
- **`h1-duplicate`**, site-wide template pattern (theme header H1 plus a
  second content-authored H1), diagnosed 2026-09-03/04 against
  `sections/main-page.liquid` and `sections/main-article.liquid`. 353 total
  tonight, not re-verified individually per the playbook's P2 rule; pattern
  unchanged.
- **`h1-is-title`**, pipe-delimited SEO titles reused verbatim as the H1. 34
  total, not verified individually.
- **`meta-scraped`**, mostly CSP daily-practice blog posts with a
  description that reads as scraped page furniture, cut off mid-word. 14
  total, not verified individually.
- **`meta-missing`**: `/collections/ap-csa`, `/collections/live-events`. 2
  total.
- **`brand-doubled`**: `/pages/ap-csp-game-bridge-the-divide`,
  `/pages/ap-cybersecurity-complete-course-guide`. 2 total.
- **`title-overlong`**: 46 total, worst are the two rollover blog posts
  above and `/pages/ap-csp-study-games-hub`, all 89 characters.

## Resolved since last night

- `reporter-missing` P0, `/pages/ap-cyber-unit-1-frq-practice`. See above.
- `broken-internal-link` P1, `/pages/ap-csp-course-bi5-safe-computing`.
  Confirmed a real fix (recrawled clean), not the edge-cache blip pattern
  from 2026-09-06's note about a different page.
- `h1-duplicate` P2, `/pages/ap-networking-command-center`.

## Coverage

Shard 7/7, 400 of 2,099 sitemap URLs, 673 requests, about 15 minutes, no
throttling, no abort, no truncation. Full weekly rotation now complete at
least once since the log branch was last continuous (shards 2 through 7 all
logged across the last six crawl nights; 2026-09-07 produced no data).

## Auto-fix score

`scripts/autofix-scan.js`: 0 of 641 findings scored eligible. Top blocking
reasons: `h1-duplicate` (353x) and `stale-year` (188x) are not on the
auto-fix allow list. `stale-year` specifically should stay off that list
until the checker fix above lands; scoring a check that is wrong 99% of the
time is not useful signal.

## What was learned

The two known checker bugs (`stale-year`'s evergreen-wording blindness,
`deployLag`'s un-fetched local clone) are now confirmed across every shard
that has rotated through since diagnosis, not just the shard that first
found them. That is worth stating plainly rather than re-deriving each
night: both are checker code, not site content, and fixing
`lib/site-crawl.js` once would remove roughly 190 of tonight's 641 findings
from every future report without touching the storefront.

Sampling "fresh" hits with a bias toward the shape of page already known to
be at risk (product/reference/cram-kit content, since 2026-09-06 established
that pattern) found 3 new real records in a 37-item fresh list without
reading all 37. Worth doing again: a targeted sample beats either reading
everything or trusting the false-positive rate blindly.
