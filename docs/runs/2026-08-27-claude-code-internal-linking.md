# Internal linking: measure the graph, then wire the site up

Board task 73, claimed as claim 37. Branch `claude/site-linking-architecture-b8qfly`,
PR #370.

## What was asked

Crawl the site, draw the current internal link architecture, propose the ideal
one, mark the holes as placeholders and the duplicates for removal, then go page
by page and link everything.

## The measurement

A full crawl of all 2,063 URLs the sitemap advertises: 1,344 pages, 658 blog
posts, 51 products, 10 collections. 41.4 minutes, 2,068 requests, one throttled
response that backed off and recovered. Not truncated.

Deliberately not sharded, unlike the nightly crawl. A page cannot be called
unlinked while a seventh of its possible linkers went unfetched.

### The one thing that makes the numbers mean anything

Every page renders roughly 135 `apcs-dropdown-link` anchors before its content.
Count anchors naively and all 2,063 URLs come back richly interlinked, including
every page nobody can reach. So links are zoned, and only content links count:

- structurally, by the element the anchor sits in
- by ubiquity, where a target linked from more than 35% of pages is boilerplate
  under any markup

The stricter answer wins. Ubiquity is the half that survives a theme change.

## What is live, measured 2026-08-27

| | |
|---|---|
| Live pages | 2,062 |
| Content links | 9,417 |
| Chrome targets excluded | 155 |
| **Pages with no inbound content link** | **480** (264 of them `/pages/`) |
| Pages with exactly one | 406 |
| Pages with no outbound content link | 336 |
| Unreachable from the nav frontier | 491 |
| Internal links spent on redirects | 971 |
| Broken worksheet downloads | 186 |
| Broken page links | 3 |

Verified by hand against the live storefront:

- **Every exercise page is orphaned.** 18 of 18, average inbound 0.0.
- **9 of 14 course-hub pages are themselves orphaned.**
- **Intro to Java: 109 pages, 52% orphaned, no course hub at all.** Also 41 help
  pages with no index, where CSA has `ap-csa-java-errors-hub` doing that job.
- **AP Networking: 52% orphaned**, 35 of 67, in its pilot year.
- `/pages/ap-csa-study-games` 301s to `ap-csa-exam-prep-hub` and is linked from
  **201 pages**.
- 186 `.docx` worksheet downloads on CSP lesson pages return 404. Confirmed
  without a Range header.
- Two hrefs on `ap-csa-lesson-4-1-ethical-social-issues-data-collection` carry a
  percent-encoded newline inside the handle:
  `/pages/ap-csa-les%0Ason-4-5-algorithms-with-arrays` and
  `/pages/ap-csa-lesson-4-15-sorting-algorith%0Ams`. Both 404. Confirmed in the
  live source.
- `/pages/ap-csp-exam-prep-hub` is linked from `ap-csp-course-big-idea-5-impact`
  and does not exist. CSA's counterpart does.

## Three numbers that were wrong before they were right

Recorded because each looked authoritative and each was an artefact.

**1,988 unreachable became 491.** Measuring content clicks from the homepage
alone is a metric fault, not a site fault: the homepage does link its course hubs
in its own body, but those URLs also sit in the mega-menu everywhere, so they
read as chrome and the walk refuses to pass through the site's own hubs. Depth is
now seeded from the nav frontier. Both figures are kept; the gap between them is
the site's dependence on its navigation.

**75 missing hubs became 4.** Most were spelling. The site carries five live
naming irregularities and each is now a rule with a test: two cyber prefixes,
`bi3` against `big-idea-3`, singular against plural, reversed token order across
the whole FRQ archive, and a lesson family headed by the lesson page itself. A
false missing-hub costs real work, because it proposes building a page that is
already live.

**One broken page was the crawler being throttled.** The single 503 serves 200.

## The linking pass

Hub-down, not orphan-up. Adding "back to hub" to an orphan edits one page and
rescues one page, and the orphan stays invisible to anyone browsing the hub.
Adding the missing spokes to the hub edits one page and rescues up to a dozen,
and makes them browsable.

First sheet: **51 pages, 270 links**, rescuing 58 orphans. One page refused for
having no wrapper div with an id.

Everything inserted is fenced with markers. That buys three things: the sheet can
be verified by reversing the edit and comparing byte for byte, the pass is
idempotent so running twice equals running once, and the edit can be undone from
the page itself.

`scripts/verify-link-sheet.js` is a separate program from the generator on
purpose. A bug in `lib/link-block.js` would satisfy its own assertions.

Two earlier versions of that check were wrong and both looked reasonable: a
line-level subsequence test failed on legal mid-line inserts, and a
character-level one desynced against inserted CSS and reported six untouched
pages as damaged.

## What was NOT done, and why

**No consolidation.** The twin detector found `constructors-in-ap-csa` against
`ap-csa-constructors`, and three URLs for one primitives-and-casting practice
test, independently rediscovering what `docs/site-audit-2026-08-positioning.md`
named by hand. That audit blocks consolidation on Search Console being connected,
and picking which URL of a twin to keep without click data can redirect away the
page earning the traffic. Listed, ranked, not actioned.

**Nothing was imported.** Sheets are generated for review. Per repo convention a
Shopify page change ships as a Matrixify sheet a human reads first.

## Artifact

Architecture report: https://claude.ai/code/artifact/7a3b6d3d-544f-4234-96ce-d82358c76782

## Still open

- Import the sheets and re-crawl to confirm the orphan count moves.
- Build the placeholders: `/pages/intro-java`, `/pages/intro-java-help`,
  `/pages/ap-csp-exam-prep-hub`, `/pages/ap-csp-create-task`, plus
  `/pages/for-teachers` and `/pages/for-students` from the August audit.
- The 186 broken `.docx` downloads are a content problem, not a linking one.
- Fix the two `%0A` hrefs at source.

## One operational note

`TODO_KEY` is set in this Claude Code environment. `CLAUDE.md` says it belongs in
Railway and the Actions secret and nowhere else, because it can WRITE to the
ledger and any session can echo a variable into its own transcript.
`COMMAND_READ_TOKEN` is also set, so the read path is already covered. Unset
`TODO_KEY` here and rotate it.
