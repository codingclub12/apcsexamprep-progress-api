# 2026-09-13 nightly crawl

Shard 5/7, 400 URLs, 673 requests, 14m57s, no abort, no throttling. Coverage:
sitemap advertises 2,107 URLs; hot set (course hubs, reporter-bearing pages,
prior P0/P1 URLs) plus this shard's slice covered 400.

## Is anything on fire

Yes, the same fire as last night. Nobody has fixed it yet.

## New tonight

Nothing new. The night's only P0 is a second consecutive appearance of last
night's finding, not a new one.

## Still open

**P0, night 2: AP Cyber Unit 1 Lesson 1 Lab still has invisible Check buttons
and score display.** Reproduced live tonight, independently of the crawler's
own report: fetched `/pages/ap-cyber-unit-1-lesson-1-lab` directly, grepped
all 231 custom-property declarations the page actually ships, and confirmed
`--purple` and `--dark` are declared nowhere. The three rules that read them
are still on the page verbatim, all three `!important`:

```
#cyber-lab-11 .check-btn{ background:var(--purple)!important;color:#ffffff!important; ... }
#cyber-lab-11 .score-bar .score-num{ background:var(--purple)!important; ...color:#ffffff!important; }
#cyber-lab-11 .rubric-table th{ background:var(--dark)!important;color:#ffffff!important; ... }
```

This is the exact regression documented in last night's run note
(`docs/runs/2026-09-12-nightly-crawl.md`): board #202/#203 fixed it once on
2026-09-03, board #264's server-render migration (PR #595) silently dropped
the fix while rebuilding the page, and nothing has re-landed it since. All
three board items (#202, #203, #264) still read status done, verified NO.
There is still no open board task tracking the regression itself, only the
three closed-but-unverified items behind it.

What I would do, unchanged from last night: insert the ten-property palette
declaration block onto `#cyber-lab-11` in
`shopify/ap-cyber-unit-1-lesson-1-lab.html` (values are in the 2026-09-03 run
note) and re-import via Matrixify. Whoever picks this up should also open a
board task for the regression itself, since none exists, and consider
whether `smoke:lab11palette` should check the live/committed page body rather
than only the standalone generator, or a third rebuild of this page will drop
the same fix a third time.

Who it hurts: any student attempting the 1.1 Lab. Same as before: the widget
loads and the click lands, but the button and score pill are white text on a
background that never resolves, so the controls needed to use it cannot be
seen.

autofix-scan: not eligible. `css-var-invisible-text` is not on the allow
list.

**`stale-year`, 226 findings tonight, individual URLs open 5 to 10 nights,
still not on the board.** Same mechanism as every prior night: the check
cannot distinguish a school-year claim from a curriculum-version reference,
and CLAUDE.md requires the 2025-2026 CED/curriculum label to stay put. Spot
checked one of tonight's 217-page daily-practice-blog group
(`algorithms-efficiency`) through the repo's own classifier,
`scripts/school-year-rollover.js`'s `rollString`, which correctly refused it
as a curriculum reference. The 20 product-page findings in tonight's set are
the same 20 confirmed real by last night's full run through that same
classifier (all 20 of 20 real); none of them have been fixed and none have
moved in night-count in a way that suggests anyone is working the list. By
the playbook's own five-night rule this has to be named rather than folded
into "hygiene": `ap-csa-flashcards-unit-1` and `ap-csa-flashcards-complete-bundle`
are the oldest, at 10 nights. This is real, actionable, and has no board
number, same as last night. `scripts/school-year-rollover.js` is built and
mutation-gated and has never been pointed at real data.

**`truncated-body` on `/products/ap-csa-teacher-superpack-free-preview`,
night 3.** Refetched directly: still 10,109 bytes, still a deliberate
`meta http-equiv="refresh"` redirect to a Google Drive preview folder, byte
for byte the same page verified false on 2026-09-12. Not a defect.

**#72 / #247, H1 duplication, unchanged.** Tonight's shard (a different 400
URLs than last night's) found 372 pages with two H1 elements and 33 with the
raw SEO title rendered as the H1, the same `page.liquid` root cause #72
identified on 2026-08-05 and #247 restates for the practice exam page. Both
still read status done, verified NO. Not reporting as new.

**`meta-scraped`, 12 pages tonight**, breadcrumb text standing in for an
authored meta description (e.g. `ap-csa-lesson-2-1-algorithms-selection-repetition`:
"AP CSA> Course> Unit 2..."). Same pattern as last night's 10, different
pages because of the shard rotation. Distinct from #77 (missing description
outright), not previously tracked.

**`title-overlong`, 29 pages tonight**, past the ~60-character search-result
cutoff, mostly the CSP daily-practice template and a handful of product and
lesson pages. Same pattern as last night's 41.

## Resolved since last night

None. Tonight's shard (5/7) crawled a different 400 URLs than last night's
(4/7); the hot set recrawled last night's P0 and P1 URLs and both are still
broken, so nothing legitimately closes.

## Coverage

Shard 5/7, 400 of 2,107 sitemap URLs, 673 requests, no rate-limit abort, no
wall-clock truncation (14m57s of a 25-minute budget). autofix-scan: 0 of 677
findings scored eligible; top blocking reason is `h1-duplicate` (372x) not
being on the allow list, followed by `stale-year` (226x). Same as every prior
night, none of tonight's finding kinds are in the scorer's allow list, so
this says nothing about which would be safe to automate, only that nobody
has scoped that question for these kinds yet.
