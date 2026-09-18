# Site architecture: where a page belongs, decided offline

Contract document. Findings decay, method does not. The measured state of the
day this was built is in `docs/runs/2026-09-18-claude-code-orphan-class.md`.

## The problem this closes

Seven board tasks since #73 are one defect wearing different clothes: a page
ships and nothing links it.

| | |
|---|---|
| 73 | 101 `/pages/` have zero inbound internal links |
| 114 | four Device Security Analysis pages, zero inbound |
| 161 | 18 CSP Applied Challenge exercises, linked from nowhere |
| 164 | a CSP auto-scored checkpoint, linked from no page |
| 220 | cyber practice spokes have exactly one inbound path |
| 238 | the cyber practice hub links none of its five spokes |
| 245 | the practice hub linked at the bottom of every entry page or not at all |

Six were closed as instances. The class was never closed, which is how board 352
happened in September: a seven-problem autograded array page, live since
February, reachable from nothing.

**The measurement was never the gap.** `scripts/link-graph.js` answers this
exactly, with a zone model that separates the roughly 135 mega-menu anchors from
real content links, and 118 offline assertions behind it. It is also a 42 minute
network crawl nobody runs on a schedule, and `lib/site-crawl.js` rates orphans P2
("nobody is blocked, it compounds") while not checking for them at all. So
orphaning was found retrospectively, one page at a time, by somebody noticing.

## The narrower question, and why it needs no network

On this site the naming convention IS the architecture. So "does this page have
a home" is decidable from the handle alone.

`lib/site-architecture.js` answers it, and holds **no opinion of its own**. Every
rule comes from `lib/link-graph.js`: `familyOf` for the stem, `roleOf` for the
type, `courseOf` for the course, `resolveClusters` for hub detection with all
five of the site's naming irregularities. A second opinion about the convention
is how site 3.3 and 3.4 ended up as each other's CED topics.

The one non-obvious thing: `resolveClusters` reads edge fields only for its
reporting stats, and handles for the clustering itself. Feed it nodes with
zeroed edges and the families and hubs are correct with no crawl at all.

## What a page can be

    site        no course prefix. contact, pricing, codehs-*, greenfoot-*.
                Site furniture. It has no course hub to belong to and is never
                reported as an orphan.
    hub         it IS its family's parent. Whether the hub itself is reachable
                is a question one level up.
    parented    its family has a hub and that hub is not itself
    parentless   its family has no hub. NOTHING OWNS IT, so nothing is going to
                link it. This is the defect.

Measured 2026-09-18 over 1,365 live pages: 68 site, 344 hubs, 712 parented,
**241 parentless**.

## The three pieces

```bash
npm run site:architecture            # rebuild config/site-architecture.json
npm run site:architecture -- --check # refuse drift, hand edits, NEW parentless
npm run smoke:architecture           # offline, no network, runs in CI
```

**`config/site-architecture.json` is generated**, checked in, and `--check`
refuses a hand edit, the same contract as `npm run cyber:topics`. It lives in
`config/` and not `data/`, because the Railway volume mounts at `/app/data` and a
mount replaces the directory: the cyber taxonomy shipped that way once and
production answered ENOENT while every repo-side check said the file was there.

**The baseline is a RATCHET.** 241 pages are parentless today. A check that goes
red on all 241 on its first morning is a check somebody turns off by lunchtime,
which is the failure `lib/site-crawl.js` already records for a job that reprints
the same fourteen tasks every day. So a NEW parentless page fails, and a FIXED
one must be removed from the file. The list can only shrink.

**The sheet gate is where the class actually dies.** `matrixify-preflight.js`
refuses a row that is both absent from the architecture (so the sheet is creating
the page) and parentless (so no hub owns it). Existing parentless pages are never
refused there; those belong to the ratchet. A page is orphaned at the moment it
is published, so this is the only check that prevents one rather than finds it.

## The honest limit

**A declared parent is not a link.** Sampled 2026-09-18 across 11 clusters that
have a hub: the hub's stored body actually linked the child in 6 of 11. So
roughly half of declared parentage is not realised, and those pages are orphaned
despite having a home on paper. None of this catches them.

That half is board 372, and the useful finding is that it is cheap: the question
is only whether each HUB links its members, so you fetch the 344 hubs rather than
all 1,365 pages. Roughly 7 minutes, not 42.

**Read the stored body, never the rendered page.** A measurement in this repo on
2026-09-10 read a hub's sibling links off the RENDERED page and reported six
links that existed only in the mega-menu. `/pages/<handle>.json` is what Shopify
stores and is the only honest source for this question.
