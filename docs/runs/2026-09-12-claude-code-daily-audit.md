# Daily site audit, 2026-09-12

Read-only routine: crawl and report, no board tasks, no imports.

## What ran, and why this session did not crawl

`.github/workflows/site-audit.yml` had not fired for today at session start
(its last completed run was #19, 2026-09-11 13:10 UTC). This session started a
local `node scripts/site-crawl.js` run against yesterday's baseline, then, four
minutes into the check, found that a different session had already crawled the
live storefront this morning at 09:32:35 UTC (400 URLs, 675 requests, shard
4/7, committed to `claude/nightly-crawl-log` as
`docs/runs/2026-09-12-nightly-crawl.md`, 9 minutes before this session's start
of 09:36:12 UTC). Since driving the storefront twice in one morning is exactly
what this routine exists to avoid, the local crawl was killed
(`TaskStop`) before it issued a single request (`/tmp/today.json` and its logs
are empty, zero bytes), and this report reads that already-completed crawl
instead. Everything below the crawl-derived sections is this session's own
work: a handful of single, spaced-out live GETs through
`lib/storefront-fetch.js` to verify one new finding and one rotation, never a
second full crawl.

## Is anything on fire

Yes. One P0, and it is a regression of a bug already fixed once.

## P0: AP Cyber Unit 1 Lesson 1 Lab has invisible Check buttons and score display, again

This is today's crawl's finding, not this session's; I am relaying it because
it is the one thing that needs eyes now, not softening it into a "still open"
line. `#cyber-lab-11 .check-btn`, `.score-bar .score-num`, and `.rubric-table
th` all paint white text against `var(--purple)` / `var(--dark)`, and neither
custom property is declared on the page. All ten custom properties the
widget's CSS reads are undefined, confirmed live against 231 actually-shipped
declarations, zero of them a match.

This exact page was fixed for this exact reason on 2026-09-03 (board #202, 27
of 32 students in one class had a blank Lab column). Board #264 rebuilt the
page into a mount point four days later and, per its own run note, never
carried the palette declaration forward. The committed source
(`shopify/ap-cyber-unit-1-lesson-1-lab.html`) already matches the live page
byte for byte, so the sheet undoing the fix has already been imported, not
just written. Board #264 sits in `needs_verification`, done, verified NO;
today's finding is the live evidence that the crawl's own check for this (board
#203) still works, but there is no offline gate that would have caught #264's
sheet shipping this before it went live.

What I would do, unchanged from today's crawl note: reinsert the ten-property
declaration block (values recorded in the 2026-09-03 run note) into
`shopify/ap-cyber-unit-1-lesson-1-lab.html` and re-import, and separately make
`smoke:lab11palette` check the current committed page body, not just the
standalone generator against a frozen fixture, or this regresses a third time
on the next unrelated body edit. Not fixed here: page-body edits are out of
this routine's scope.

## New since last night

**Real:** one genuinely new `meta-scraped` finding this routine can act on.
`pages/ap-csa-unit-3-course` serves a scraped breadcrumb description ("AP CSA›
Full Course› Unit 3...") ending in an em dash, and a title carrying the brand
suffix. Its three sibling course-hub pages (`ap-csa-unit-1-course`,
`ap-csa-unit-2-course`, `ap-csa-unit-4-course`) already have rows in
`seed/seo-rewrites.js` from an earlier pass; this one was missed. Fixed this
pass, see Metadata below.

**Not real, already understood:** the crawl's other 9 `meta-scraped` hits, all
226 `stale-year` hits, and the `truncated-body` hit on the free-preview product
are the same standing facts covered below and in prior audits, not news.
`css-var-invisible-text` (3) and `css-var-undefined` (1) are the P0 above,
already covered there.

## Resolved since last night

None claimed by the crawl (today's shard, 4/7, covered a different 400 URLs
than the prior baseline's shard 3/7, so it correctly does not claim a
resolution on a page it did not revisit).

## Standing findings, checked against the 2026-08-26 baseline

- `h1-duplicate` on ~47 of 50 pages: still the shared contact-section
  template, still pending the theme edit, still expected until that ships.
  Unchanged.
- `h1-is-title` on pages needing a body sheet: still open, still a page-body
  fix out of this routine's reach. Unchanged.
- `robots.txt`: **still fixed, not news.** This has carried the wrong status
  in the routine's own standing list before; it was corrected by the
  2026-09-06 audit and reconfirmed by the 2026-09-11 audit. Reconfirmed again
  today with a fresh fetch: 7787 bytes, full Shopify default rule set intact.
  Not re-litigating further; striking it from future mentions unless it
  regresses.
- The eight competing AP Cybersecurity overview URLs: still blocked on Search
  Console being connected, reconfirmed unconnected as of the 2026-09-11
  competitor analysis (`docs/competitor-analysis-2026-09.md`). Do not propose
  redirecting them.

## Rotation: blog output balance across courses

Live-checked today (2 requests, `lib/storefront-fetch.js`, ~1.2s apart):
`sitemap.xml` for the blog index, then `sitemap_blogs_1.xml` for the full URL
list. Counted articles per blog by path:

| Blog | Articles |
|---|---|
| ap-csa-daily-practice | 429 |
| ap-csp-daily-practice | 111 |
| news (general) | 86 |
| ap-cybersecurity | 17 |
| ap-csa | 12 |
| ap-csp | 12 |
| ap-networking | 12 |

The four `ap-csa` / `ap-csp` / `ap-cybersecurity` / `ap-networking` blogs are
the weekly course blogs `docs/content-engine.md` and the
`weekly-blog-publish` routine drive, roughly even at 12-17 posts each. The
imbalance is a second, separate content stream that only exists for two of
the four courses: `ap-csa-daily-practice` and `ap-csp-daily-practice` carry
429 and 111 posts respectively, a long-tail SEO play, and AP Cybersecurity and
AP Networking have no equivalent daily-practice blog at all, despite
Cybersecurity being the course this routine's own SEO rewrites flag as "going
nationwide this year." This is an observation, not a defect: whether to build
a daily-practice blog for Cybersecurity/Networking is a content decision, not
something a metadata sheet or this routine's scope can act on. Flagging it
because nobody else's run notes had counted it yet.

## Metadata fixes this pass

One row added to `seed/seo-rewrites.js` PAGES: `ap-csa-unit-3-course`, title
"AP CSA Unit 3: Class Creation" (brand suffix dropped), description rewritten
to 159 characters, no em dash, no stale year, matching the style already used
for its three sibling unit pages.

Validated before writing:

- `npm run smoke:seocsv`: 35 of 35 passed, including against the new row.
- Regenerated all three sheets with `node scripts/seo-metadata-csv.js
  imports/2026-09-12` (37 pages, 13 products, 7 collections).
- Parsed `imports/2026-09-12/seo-pages.csv` back and diffed the new row's
  title and description against the source table field by field: identical.
  Row counts match (37 and 37).

**Found, not fixed: the generated sheets are not QUOTE_ALL, and nobody has
checked this before.** Running `scripts/matrixify-preflight.js` against
today's `seo-pages.csv` (not part of this pass's own tooling, checked out of
caution before pointing at a real import) reports all 38 lines (header plus 37
rows) as not fully quoted: `scripts/seo-metadata-csv.js` only quotes a field
when it contains a comma, standard minimal CSV quoting, not the repo's own
QUOTE_ALL convention.
The CSV itself is valid and round-trips correctly (confirmed above), and none
of these sheets carry large HTML bodies where an unquoted comma could split a
row, which is the specific failure QUOTE_ALL defends against. But no prior
daily-audit run note (`#579`, `#619`, `#642`, `#659`) mentions running this
preflight against an SEO sheet, so this gap has been present in every SEO
sheet this routine has ever generated and never verified against the repo's
own import gate. Not fixing `seo-metadata-csv.js` in this pass: it is shared
generator code with its own test surface, out of scope for a single-row
addition, and a human should decide whether SEO-only sheets need the full
QUOTE_ALL treatment or whether the preflight tool should distinguish sheet
classes. Naming it here so it is not rediscovered as a surprise at import
time.

## What is still open

- The Unit 1 Lab palette regression (P0 above).
- Everything in "Standing findings" above except robots.txt.
- The QUOTE_ALL gap in `scripts/seo-metadata-csv.js`'s output, newly found.
- The daily-practice blog imbalance for Cybersecurity/Networking, newly
  observed.
- 4 open, unimported SEO-sheet PRs already sitting on this repo (`#579`,
  `#619`, `#642`, `#659`) from prior audits, plus this pass's new one. Import
  is a human decision, not filed as a board task per this routine's scope.

## Artifact

- Today's crawl: `docs/runs/2026-09-12-nightly-crawl.md` and
  `docs/runs/crawl-state.json` on `claude/nightly-crawl-log`
  (`13ac77d`), produced by a different session before this one started.
- This session's own live checks: `robots.txt` (7787 bytes), the blog sitemap
  count table above, and the `ap-csa-unit-3-course` live title/description
  extraction, all via `lib/storefront-fetch.js`, no User-Agent override.
- This pull request, carrying the `seed/seo-rewrites.js` row and the
  `imports/2026-09-12/` sheets, is the artifact for the metadata fix.
