# Internal linking

How the link graph is measured, how the sheets are built, and what each check
refuses. Contract document: findings decay, method does not.

`docs/runs/2026-08-27-claude-code-internal-linking.md` holds the measured state
on the day this was built.

## The one thing that makes the numbers mean anything

Every page renders roughly 135 `apcs-dropdown-link` anchors before its content
starts. Count anchors and all 2,063 URLs come back richly interlinked, including
every page nobody can reach.

So every link is placed in a zone and only one zone is architecture:

- **chrome** header, nav, footer, mega-menu. Identical on every render, so it is
  present on the page that is well connected and on the page that is not.
- **body** an anchor an author put in the content. This is the graph.

Zone is decided twice and the stricter answer wins: structurally, by the element
the anchor sits in, and by **ubiquity**, where a target linked from more than 35
percent of pages is boilerplate whatever markup wraps it. Ubiquity is the half
that survives a theme change.

## The pipeline

```bash
# 1. Crawl everything the sitemap advertises. About 42 minutes, 1 req/sec.
#    NOT sharded, unlike the nightly crawl: a page cannot be called unlinked
#    while a seventh of its possible linkers went unfetched.
node scripts/link-graph.js --out graph.ndjson

# 2. Crawl to architecture.
node scripts/link-graph-report.js --in graph.ndjson --json report.json

# 3. Resolve link targets outside the sitemap: 301 or 404, and which.
node scripts/link-targets-resolve.js --report report.json --out resolved.json

# 4. The report page.
node scripts/link-architecture-html.js --report report.json \
  --resolved resolved.json --out architecture.html

# 5. What each page should link. Hub-down first.
node scripts/link-plan-build.js --in graph.ndjson --out plan.json \
  --handles live-handles.txt
node scripts/link-plan-build.js --in graph.ndjson --out plan-orphans.json \
  --handles live-handles.txt --orphans-only

# 6. Stored bodies to disk. No token needed, no body through a model's context.
node scripts/fetch-page-bodies.js --handles handles.txt --dir bodies/

# 7. One sheet per course.
node scripts/internal-link-csv.js --plan plan.json --bodies bodies/ \
  --handles live-handles.txt --out links-ap-csa.csv --only ap-csa

# 8. VERIFY BEFORE IMPORTING. Separate program on purpose.
node scripts/verify-link-sheet.js --sheet links-ap-csa.csv \
  --bodies bodies/ --handles live-handles.txt
```

`live-handles.txt` is the page handles from `sitemap_pages_1.xml`, one per line,
pulled in the same sitting as the bodies. It is the authority on which pages
exist, and it is never inferred from a handle pattern.

Import settings: **MERGE, QUOTE_ALL, utf-8-sig**. Snapshot the live pages first.

## Hub-down, not orphan-up

Adding "back to hub" to an orphan edits one page, rescues one page, and the
orphan stays invisible to anyone browsing the hub. Adding the missing spokes to
the hub edits one page, rescues up to a dozen, and makes them browsable, which
is what an inbound link is for.

Links are proposed in four kinds, ranked, because the block is capped and the
cap has to spend itself on the most valuable link first:

| kind | what it is |
|---|---|
| `up` | the cluster hub, then the course hub. Without it the page is a dead end. |
| `down` | for a hub, its own spokes, least-linked first. This is the orphan fix. |
| `across` | two or three siblings, least-linked first, so inbound spreads rather than piling on whatever is already popular. |
| `onward` | the next step for that role: a lesson to its exercise, a study guide to its practice test. |

## What the generator refuses

Every refusal returns the body **unchanged**. Nothing is half-written.

- no live handle set passed, so no link can be shown to exist
- an empty body
- div balance changed
- the body did not grow, or grew past 4 KB
- the anchor count moved by anything other than what was added
- the page's `<style>` block disappeared
- the edit added a related section where it should have extended one, or the
  other way round

Targets are dropped rather than rendered when the handle is not in the live set,
when the page already links it, or when it is the page itself. Every drop is
counted and printed, including what a `--limit` held back, so a partial pass
cannot read as a complete one.

## Fences, and why verification is not a heuristic

Everything inserted is wrapped in markers: HTML comments around the block, CSS
comments around the rules. `unmark()` strips them and returns the body the page
started as.

That buys three things:

1. **Verification is exact.** `scripts/verify-link-sheet.js` reverses the edit
   and compares byte for byte. It is a separate program from the generator
   because a bug in `lib/link-block.js` would satisfy its own assertions, and
   what is being changed is live pages.
2. **The pass is idempotent.** A body already carrying a fenced region is
   stripped back and rebuilt, so running twice equals running once. Without it a
   second pass nests one marked region inside another and appends links after
   its own closing comment, which nobody notices until the page renders the
   section twice.
3. **The edit can be undone** from the page itself.

Two earlier versions of that check were wrong and both looked reasonable. A
line-level subsequence test failed on inserts landing mid-line, which is legal
and lossless. A character-level one desynced against inserted CSS and matched
10,602 of 35,524 characters on an untouched page. Both are similarity measures,
and similarity is the wrong question.

## The site's markup, as measured

Read off live bodies, not assumed. Getting any of these wrong refuses real pages
or corrupts them.

- **Class tokens are whole words.** `/\brelated\b/` matches `related-card`,
  because `\b` treats a hyphen as a word boundary. Same trap `lib/site-crawl.js`
  records costing seven false P0s.
- **Four container names, not one:** `related`, `related-links`, `related-grid`,
  `related-links-grid`. `related-link`, `related-card` and `related-ext` are
  items inside them and are never containers.
- **Containers nest.** 35 CSP lesson pages wrap a `related-links-grid` inside a
  `related-links`. One section, two containers, so the check is a delta rather
  than an absolute count.
- **A wrapper id is not guaranteed.** 160 pages have no single outer id. Where
  there is nothing to scope to the block brings its own wrapper and stylesheet.
- **Some bodies are empty.** `/pages/ap-csa` and `/pages/ap-csp` store nothing at
  all. They are refused, correctly, and they are a content gap rather than a
  linking one.

## Naming irregularities the cluster model has to carry

All five are live. Each one, unhandled, reports a hub as missing when it exists,
which proposes building a page that is already there.

| | |
|---|---|
| `ap-cyber-*` against `ap-cybersecurity-*` | two prefixes, one course |
| `ap-csp-course-bi3-*` against `ap-csp-big-idea-3-*` | leading path word, digits not always hyphenated |
| `ap-csa-2d-array-*` against `ap-csa-2d-arrays-*` | singular and plural are one topic |
| `ap-csa-2004-frq-N` under `ap-csa-frq-2004` | token order reversed, across the whole archive |
| `ap-csa-lesson-2-3-<slug>` heads `ap-csa-lesson-2-3` | the hub is a member of its own family |

`guide` is deliberately **not** accepted as a hub suffix. On this site that is
how spokes are named, so accepting it lets a spoke pose as its cluster's hub and
hides a real gap.

An **activity never heads a family**. A quiz, lab, exam or exercise is a leaf. Without
that rule `ap-cyber-unit-3-exam` wins the stem match on `ap-cyber-unit-3` by
being short, which hides the gap and points the whole unit at an exam page.

## Consolidation is blocked, on purpose

`scripts/link-graph-report.js` reports **handle twins**: two live pages whose
handles carry the same token multiset, with numbers bound to the word in front
of them so `unit-5-lesson-2` and `unit-2-lesson-5` stay distinct.

`docs/site-audit-2026-08-positioning.md` blocks consolidation until Search
Console is connected, and that still holds. Picking which URL of a twin to keep
without click data can redirect away the page earning the traffic. The report
lists and ranks them. It does not action them.

## Tests

`npm run smoke:linkgraph`, 118 offline assertions, both directions on every
rule. No network. CI picks it up automatically through the `smoke:*` discovery
in `.github/workflows/tests.yml`.
