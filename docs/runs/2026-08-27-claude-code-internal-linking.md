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

Six sheets, all independently verified, none imported:

| Sheet | Pages | Links |
|---|---|---|
| `links-orphan-rescue.csv` | 52 | 233 |
| `links-ap-csa.csv` | 538 | 3,057 |
| `links-ap-csp.csv` | 316 | 1,634 |
| `links-ap-cyber.csv` | 220 | 1,219 |
| `links-ap-networking.csv` | 67 | 170 |
| `links-intro-java.csv` | 70 | 148 |
| **Total** | **1,211** | **6,228** |

The first generation refused 160 of 1,251 pages, 13%, and every refusal was the
generator being narrow rather than the page being unusual. Four measured facts
about the site's own markup fixed it, all recorded in `docs/internal-linking.md`:
class tokens are whole words, the site ships four container names rather than
one, containers nest, and a wrapper id is not guaranteed.

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

## The finding that came out of the body fetch, not the crawl

**`/pages/ap-csa` and `/pages/ap-csp` store no body at all.** Confirmed against
the Admin API and against the rendered page: they emit the theme's `<h1>` and
the "Get in Touch" block and nothing else, while serving authored meta
descriptions promising "all 4 units, 400+ exercises, a built-in Java editor and
FRQ solutions from 2004 to 2025".

`/pages/ap-csp` is both an orphan and a dead end. Under the proposed
architecture these two URLs are the canonical course hubs and carry the head
terms, which makes them the highest-value pages to build on the site. The
generator refuses them, correctly: this is a content gap, not a linking one.

Four more empty bodies: `quick-reference`, `practice-exams`,
`ap-csa-premium-frq-solutions`, `java-editor-test`.

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

## Search Console data, added after the fact

Two GSC Performance exports arrived after the analysis above was written: Web
search, last 16 months and last 3 months, exported 2026-08-27. Both cap at the
top 1,000 pages by clicks. The lowest row in the 16-month file carries 0 clicks
and about 260 impressions, so a page **absent** from it is known to be small
rather than known to be zero.

### The finding that reframes the whole pass

**143 of the 480 orphans earn search traffic: 77,939 clicks and 1,541,726
impressions, which is 65 percent of the site's 120,378 total clicks.** The
highest-earning page on the domain,
`ap-computer-science-principles-full-practice-exam-70-mcq` at 34,857 clicks, has
zero inbound content links.

So the linking pass is not hygiene on pages nobody visits. It is the site
failing to pass authority to the pages already earning most of its traffic.

### A prediction this repo got wrong

Before the exports arrived, inbound content links were used as a stand-in for
whether a page mattered, and four pages were called likely-dead on that basis.
Two were among the biggest earners in their cluster:

| Page | Inbound content links | Clicks, 16mo |
|---|---|---|
| `ap-cybersecurity-study-guide` | 0 | **982** |
| `ap-cybersecurity-complete-course-guide` | 0 | **571** |

Internal links measure browsability. They do not measure demand, and on this
site the two are not correlated. `docs/site-audit-2026-08-positioning.md` was
right to block consolidation on this data.

### The proposed canonical is wrong for three courses

The audit's template gives `/pages/ap-{course}` the head term. Those URLs have
almost no equity, and two of them are the empty-body pages recorded above.

| Course | Proposed canonical | Clicks | Earns instead | Clicks |
|---|---|---|---|---|
| AP CSA | `/pages/ap-csa` | 1 | `ap-csa-exam-prep-hub` | 2,470 |
| AP CSP | `/pages/ap-csp` | 2 | `ap-csp-topics` | 323 |
| AP Cyber | `/pages/ap-cybersecurity` | 4 | `ap-cybersecurity-study-guide` | 982 |

Consolidating the earner into the bare handle would redirect away the traffic.
Decision for Tanner: either build out the bare handles first and migrate
deliberately, or keep the earner as canonical and drop the template.

### Folds the data supports

- `ap-cybersecurity-practice` (absent) into `-practice-exam` (1,524)
- `ap-cybersecurity-exam-format-scoring` (4) into `-exam-format` (355)
- `ap-csa-practice-test-hub` (absent) into `-practice-tests-by-topic` (81)
- both primitives/casting twins (absent, 4) into
  `ap-csa-practice-test-primitives-casting` (16)

### Not folded, and why

- **constructors twins**: `constructors-in-ap-csa` 19 clicks on 4,130
  impressions against `ap-csa-constructors` 25 on 1,560. Neither dominates.
- **cyber overview**: the audit counted eight URLs on one intent. Five are
  near-zero and can go; `-study-guide` (982), `-complete-course-guide` (571) and
  `-curriculum` (469) are three real pages and need query-level data first.

### Worth more than most of the linking

Two pages rank and are almost never clicked:

| Page | Impressions | CTR | Position |
|---|---|---|---|
| `ap-csp-score-calculator` | 180,721 | 0.74% | 7.8 |
| `ap-csa-score-calculator` | 144,784 | 1.06% | 6.8 |

Moving both to 3 percent is roughly 8,000 additional clicks a year from a title
and description rewrite. That is an SEO task, not an architecture one, and it is
not in this pass.

Also: 120 dead-end pages carry 8,476 clicks, led by `ap-csp-vocabulary-list`
(1,598) and `ap-csa-score-calculator` (1,531). A student lands from search and
the page offers nowhere to go next.

## Google's internal-link export, and a correction to the headline above

A third export arrived: Search Console's Links report, Top target pages, 277
rows. It is Google's own count of internal links per page, from a different
crawler with no knowledge of this analysis.

### It confirms the method

Sixty-three pages sit in a tight band between about 1,380 and 1,500 internal
links. That band is the mega-menu, measured independently. It is exactly the
boilerplate this pass separates out, and it is the reason counting raw anchors
cannot answer the orphan question.

The two counts are not in conflict. They measure different things and both are
right:

| Page | Google's count | This report's count | Clicks |
|---|---|---|---|
| `ap-computer-science-principles-full-practice-exam-70-mcq` | 1,483 | 0 | 34,857 |
| `ap-cybersecurity-study-guide` | 2,579 | 0 | 982 |
| `ap-csa-exam-prep-hub` | 1,496 | 0 | 2,470 |

### And it corrects the headline

The section above led with **"65 percent of search clicks land on pages nothing
links to."** That is true by the content-link definition used throughout this
report and **wrong as a statement about discoverability**, because those same
pages carry roughly 1,480 internal links each. They are in the nav. They are
linked; they are not linked from anything relevant.

The honest partition of the site's 120,378 clicks:

| Internal-link status | Clicks | Share |
|---|---|---|
| In the nav (1,300+ links), 63 pages | 88,941 | 74% |
| Linked, but not from the nav | 25,849 | 21% |
| **No internal links at all, 669 pages** | **5,588** | **5%** |

So the genuinely unlinked set carries 5 percent of clicks, not 65. The finding
that survives is different and more interesting: **74 percent of all search
clicks land on 63 pages, and the entire content-link graph adds 21 percent on
top of the navigation.** The contextual linking layer is doing very little work.

### The list that actually matters

Pages that rank (so they are indexed for certain, making a zero a real zero) and
have no internal links whatsoever:

| Page | Clicks | Impressions |
|---|---|---|
| `ap-csp-written-response-guide` | 587 | 43,910 |
| `ap-csp-create-task-guide` | 471 | 47,951 |
| `ap-csp-ced-explained` | 249 | 25,157 |
| `ap-csa-unit-3-class-creation-complete-study-guide-2025` | 235 | 3,282 |
| `ap-csa-unit-4-data-collection-complete-study-guide-2025` | 180 | 4,873 |

The top two draw 91,861 impressions between them from no internal links at all,
and neither appeared in the contested-URL list, because nothing in the crawl
suggested they mattered. Several of the others carry a stale `-2025` in the
handle while still earning.

### Method note for the next pass

Three measurements were needed to get this right and any two of them would have
misled:

- the crawl alone said 480 orphans, without knowing which mattered
- clicks alone said those orphans carry 65 percent of traffic, without knowing
  they were nav-linked
- Google's link counts alone say everything important has 1,480 links, without
  distinguishing nav from content

Cross-referencing all three is what produced a list of 669 pages worth acting on
rather than 480 worth worrying about.

## Plan regenerated against the 669-page list

The 669 pages Google records zero internal links for are not all link targets.
Resolved one at a time:

| | |
|---|---|
| Live `/pages/` handles, editable | **355** |
| Legacy URLs returning 301 | 75, carrying 1,831 clicks |
| Blog posts | 195 |
| Products and collections | 40 |
| A URL earning clicks and returning 404 | 1, `/pages/frq-2024` |

The 75 redirects are **correctly** unlinked: they no longer exist, and their
traffic already flows to a live page. `ap-csp-create-task-guide`, the second
biggest name on the original list at 471 clicks and 47,951 impressions, is one
of them. It 301s to `ap-csp-create-task-ultimate-guide`. Linking it would have
pointed 30 pages at a redirect.

So the real target set is **355 live pages carrying 2,558 clicks and 273,889
impressions**, and `scripts/link-plan-build.js --targets` now drives the plan
from that list rather than from the crawl's own idea of what matters.

### Coverage, and three bugs found getting there

| Round | Targets linked | Target clicks covered |
|---|---|---|
| Cluster hubs only | 161 | - |
| + role-affinity fallback | 195 | 67% |
| + hub cap raised from 8 to 24 | 250 | 72% |
| + fallback load-balanced | **323 of 355** | **97%** |

**Families are too narrow for one-off pages.** `ap-csa-jeopardy-game` becomes
its own single-member family and therefore its own hub, so hub-down never
reaches it even though `ap-csa-study-games-hub` is sitting right there. 194 of
355 targets were in that hole. A target no cluster reaches is now offered to the
best index page in its own course, matched on role.

**One cap for hubs and spokes was wrong.** Eight links is right for a lesson
page and wrong for a hub, whose job is to list its spokes; the site's own unit
hubs link twelve to seventeen. With a single cap of 8 the fallback planned 75
links onto `ap-cybersecurity-course` and everything past the eighth was dropped
in silence. Hubs now take 24, and a page is treated as a hub when most of its
planned links are `down:` rather than by what it is called.

**The fallback piled instead of spreading.** Even at 24 the tail was lost,
because one course hub was absorbing thirty-odd targets. Each target now goes to
whichever of its course's index pages currently carries the fewest. Maximum load
on any one page dropped to 15.

`ap-csp-ced-explained`, 249 clicks and no internal links, survived the first two
fixes unlinked and is now linked from `ap-csp-topics`. It is the reason the third
one exists.

### What is left

32 targets carrying 87 clicks. Almost all are the legacy-naming pages that put
the course at the END of the handle (`linear-search-ap-csa`,
`static-vs-instance-variables-ap-csa`), so `courseOf()` returns null and no
course can claim them. Fixing that means teaching the parser the old convention,
which is worth doing when those pages are next touched and is not worth a
special case now.

### Sheets

896 pages, 5,734 links, all five independently verified.

## Answered: what a student actually sees on the phishing pages

The Cloudflare finding left one question open, and it mattered: if the decoder
does not run, the AP Cybersecurity phishing exercises render with the lookalike
domain already stripped, and the question becomes unanswerable.

**It runs. Students are fine.** Verified by rendering the real page in Chromium
with Cloudflare's own `email-decode.min.js`:

```
ap-cyber-unit-1-lesson-1-lab
  10 obfuscated spans in the raw HTML
  after the decoder runs: 0 placeholders, 0 undecoded, 9 addresses readable
      do-not-reply@g00gle.com                  <- the lookalike, intact
      IT-Security@yourcompany-helpdesk.net
      ...
```

### How it was verified, and one wrong turn

The browser could not reach the storefront through the agent proxy
(`ERR_CONNECTION_RESET`), so the page was fetched with curl and rendered from
`file://` with the decoder inlined. Same HTML, same script, real DOM.

The first run of that reported **2 spans failing to decode** and it was wrong.
The page loads `email-decode.min.js` TWICE and the inliner had replaced only the
first occurrence, so the second decoder never ran and its spans stayed
untouched. Inlining both gives 0 undecoded. Worth recording because the wrong
version looked exactly like a real finding.

### What remains true

- A student with **JavaScript disabled** sees `[email protected]` and the
  exercise is unanswerable. Pre-existing, small population, not caused by
  anything here.
- `ap-cybersecurity-unit-1-social-engineering` returned a 9,257-byte challenge
  page on both attempts, so it has not been checked. Every other page tested
  decoded cleanly.
- The real risk was never the live page. It was writing the obfuscated form into
  the STORED body, which would have made the placeholder permanent. That is what
  the gate prevents.
