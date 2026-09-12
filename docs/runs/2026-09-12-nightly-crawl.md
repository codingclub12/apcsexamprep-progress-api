# 2026-09-12 nightly crawl

Shard 4/7, 400 URLs, 675 requests, 15m23s, no abort, no throttling. Coverage:
sitemap advertises 2,107 URLs; hot set (course hubs, reporter-bearing pages,
prior P0/P1 URLs) plus this shard's slice covered 400.

## Is anything on fire

Yes. One page is silently failing students the same way it did nine days ago.

## New tonight

**P0: AP Cyber Unit 1 Lesson 1 Lab has invisible Check buttons and score
display again.** `#cyber-lab-11 .check-btn`, `.score-bar .score-num` and
`.rubric-table th` all paint white text on `background:var(--purple)` or
`var(--dark))`, and neither custom property is declared anywhere on the page.
An undefined `var()` drops the whole declaration, so the buttons and score
pill render white-on-white. Confirmed live: fetched the page, grepped all 231
custom-property declarations actually shipped, zero of them are `--purple` or
`--dark`. All ten properties the widget's CSS reads (`--dark`, `--purple`,
`--purple-bg`, `--purple-border`, `--purple-light`, `--purple-mid`,
`--gray-border`, `--gray-light`, `--green-bg`, `--green-border`) are undefined.

This is a **regression**, not a new bug. `docs/runs/2026-09-03-claude-code-cyber-lab11-palette.md`
fixed this exact page for this exact reason on 2026-09-03 (board #202): 27 of
32 students in one class had a blank Lab column because the Check buttons
were invisible. The fix inserted one 623-byte rule declaring the ten
properties directly into the live page body and was verified live.

Board #264 (`docs/runs/2026-09-07-claude-code-analysis-migration.md`)
rebuilt this same page from scratch four days later, turning it into a
mount point and moving the graded activity server-side. That migration's own
note says the palette declaration was never part of what it kept ("the
intro, the badges, the scoring rubric, the progress bar and the nav
footer") and flagged the sheet as needing a human import. The committed
source, `shopify/ap-cyber-unit-1-lesson-1-lab.html`, already carries that
migration's body today and uses all ten properties without declaring any of
them, and the live page matches it byte for byte on every rule I checked.
So the sheet was imported at some point since 2026-09-07 and it silently
undid the 2026-09-03 fix, while also adding a new element (`.rubric-table
th`) that has the identical defect and was never covered by the original
fix either.

Board #264 sits in `needs_verification`, status done, verified NO. Board
#203 (the crawl check that caught this) is also done/unverified: tonight's
finding is itself the live evidence that #203's check works, but there is
still no offline gate that would have caught #264 shipping this before it
went live, because `smoke:lab11palette` mutation-tests the standalone
generator against a frozen fixture and never re-checks the current
committed page body.

**What I would do:** insert the same ten-property declaration block onto
`#cyber-lab-11` in `shopify/ap-cyber-unit-1-lesson-1-lab.html` (the palette
values are recorded in the 2026-09-03 run note) and re-import. Separately,
`smoke:lab11palette` or a new check should assert the *live/committed* page
declares every custom property its own CSS reads, not just test the
generator tool in isolation, or this will regress a third time the next
time this page's body changes for an unrelated reason.

Who it hurts: any student attempting the 1.1 Lab. Same shape as before:
the page still "works", the click still lands, the widget still reports
once all four emails are checked, but the controls needed to get there
cannot be seen.

autofix-scan: not eligible. `css-var-invisible-text` is not on the
allow list.

## Verified false positive, not reported as a defect

`truncated-body` flagged `/products/ap-csa-teacher-superpack-free-preview`
at 10,109 bytes (floor is 20,000), open 2 nights. Fetched it directly: it is
a deliberately small meta-refresh page that redirects to a Google Drive
folder of free preview materials. This is by design, not an import
gone wrong. No file to fix.

## Still open

- **`stale-year`, 226 findings, up to 9 consecutive nights unresolved, not
  on the board.** The check cannot tell a school-year claim from a
  curriculum-version reference, and CLAUDE.md is explicit that "2025-2026"
  as a CED/curriculum label must stay put. `scripts/school-year-rollover.js`
  already encodes exactly this distinction (built and mutation-gated
  2026-09-02, `deploy-gates/2026-09-02-school-year-rollover.json`) but has
  never been pointed at real data: no `targets.json`, no generated sheet
  anywhere in the repo.

  I ran a representative sample (20 of 20 product findings, 16 of 196 page
  findings, all 10 article findings) through that tool's own classifier
  rather than judging it myself. Roughly 85% of tonight's 226 are the
  curriculum reference and correctly should NOT change ("Aligned to the
  2025-2026 4-unit curriculum", "the 2025-2026 AP Computer Science
  Principles curriculum"). A real minority is a genuine school-year claim
  that is now one cycle behind, confirmed live on at least: `products/ap-csa-flashcards-unit-4`,
  `products/ap-csp-5-big-ideas-quick-reference`, `products/ap-csp-big-idea-1-flashcards`,
  `products/ap-csp-big-idea-2-flashcards`, `products/ap-csp-practice-exam-70-mcq`,
  `products/products`, `pages/quick-reference`, `pages/ap-csp-bi4-bandwidth-latency`,
  and the `ap-csa-4-week-cram-kit` breadcrumb title ("2025-2026 Exam").
  Today is 2026-09-12, so these are into the 2026-2027 cycle.

  What I would do: point `scripts/school-year-rollover.js` at a targets
  list built from tonight's (and future nights') stale-year findings, let
  it refuse the curriculum references the way it already does, generate
  the per-field sheets, and hand them to Tanner split by product vs. page
  vs. article the way every other multi-page sheet here ships. This is real
  and actionable work sitting behind a tool nobody has run yet; it does not
  have a board number.

- **#72 / #247, H1 duplication.** Tonight's crawl found 368 pages
  (351 of them `/pages/`) with two H1 elements and 35 with the raw SEO
  title string rendered as the H1. This is the exact root cause #72
  confirmed on 2026-08-05: Dawn's `page.liquid` prints `{{ page.title }}` as
  an `h1`, on top of the page's own hand-authored H1. #72 reads status
  done, verified NO, and the crawl's own count is nearly identical in shape
  to #72's original 839-of-898 (crawl only samples a shard, so the ratios
  line up). Whatever fix landed reduced 3 H1s down to 2, but the root
  cause, the title-as-H1, is still live. #247 is the same mechanism on the
  practice exam page specifically and is also unverified. Not reporting
  as new; these are the same unresolved fact restated.
- Ten pages have a meta description that reads as scraped breadcrumb
  text rather than authored copy (`meta-scraped`), e.g.
  `pages/ap-csa-lesson-2-7-while-loops`: "AP CSA› Course› Unit 2...". This
  is distinct from #77 (missing description entirely) since these have
  a description, it is just breadcrumb furniture. Not previously tracked.
- Three product pages carry the store name twice in the title
  (`brand-doubled`), all AP CSP games: `ap-csp-game-binary-conversion-race`,
  `ap-csp-game-spot-the-bias`, `ap-csp-game-two-sides`.
- 41 titles run past the ~60-character cutoff search results truncate at,
  mostly the CSP daily-practice blog template ("AP CSP: X | Daily Practice |
  APCSExamPrep.com").

## Resolved since last night

None claimed. Tonight's shard (4/7) crawled a different 400 URLs than last
night's baseline (shard 3/7, 2026-09-11), so almost nothing in last night's
findings was looked at again; the crawler correctly does not claim a fix on
a page it did not revisit.

## Coverage

Shard 4/7, 400 of 2,107 sitemap URLs, 675 requests, no rate-limit abort, no
wall-clock truncation. autofix-scan: 0 of 688 findings scored eligible;
every one is blocked on "kind not on the allow list" (`h1-duplicate` x367,
`stale-year` x226, `title-overlong` x41, `h1-is-title` x35,
`meta-scraped` x10, `css-var-invisible-text` x3, `brand-doubled` x3,
`truncated-body` x1, `css-var-undefined` x1). None of tonight's finding
kinds are in the scorer's allow list yet, so this says nothing about which
of these would be safe to automate, only that nobody has scoped that
question for these kinds.
