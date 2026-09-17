# Hub architecture audit, and the breadcrumb schema fix

Board task 339. 2026-09-16.

## What happened before this session

An earlier turn ran a full crawl, joined it to Search Console, wrote a report and
a redirect sheet, and ended with "say the word and I will publish them". The
container was reclaimed before the next turn, so both files were gone: the
scratchpad does not survive, which is exactly why the handover convention says
commit it AND send it. Nothing from that crawl was recoverable except the prose
summary in the conversation.

So this session re-derived what it could rather than republishing numbers it
could not stand behind, and the reconciliation turned out to be worth more than
the republish would have been.

## The correction

The inherited audit said the old Dawn mega-menu, 151 links, was still in every
page and hidden with CSS, and made deleting it step 1.

There is no Dawn mega-menu. `snippets/header-mega-menu.liquid`,
`ap-csa-megamenu.liquid` and `ap-cyber-megamenu.liquid` are rendered by nothing:
grepping every section, layout, template and snippet for a render of them comes
back empty. Deleting all three changes zero bytes of any served page.

The duplication is real and larger. `sections/header.liquid` carries its own
`apcs-mega-nav` of 144 links (9 `apcs-nav-link` plus 135 `apcs-dropdown-link`,
counted on the live page) and is enabled in `header-group.json`. It renders
alongside `snippets/apcs-nav-source.liquid`, which `theme.liquid:642` renders and
which emits 118 more (12 `nav-btn`, 53 `drop-link`, 53 `mob-link`). Both ship on
all 60 sampled pages.

`apcs-mega-nav` and `apcs-mega-dropdown` have no layout CSS anywhere in the
theme. Only two rules mention the dropdown and both set `grid-template-columns`.
That is the actual shape of "shipped visually but not in the HTML": the new nav
was added and the old nav's styles were removed, while its markup stayed.

The target file in the original instruction was right. Its name and its mechanism
were not, and following it literally would have spent a deploy on dead files.

## What shipped

Theme PR #120, against `claude/site-linking-audit-yhufjk`. One file,
`snippets/apcs-breadcrumb-schema.liquid`, three defects plus a duplicate.

**Branch order.** The chain tested `unit-1` through `unit-4` in its FIRST branch,
so any handle carrying a bare unit number matched AP Computer Science A before
its own course was considered. `ap-cybersecurity-unit-1-social-engineering`
rendered `"AP Computer Science A" -> /pages/ap-csa-exam-prep` as its parent. 147
handles across Cybersecurity, Networking, CSP and Intro to Java were affected.
Cyber, Networking and Intro to Java now test first; CSA keeps the bare unit
numbers as its own fallback, which pages like
`unit-2-selection-and-iteration-ultimate-study-guide` still need.

**Dead and redirecting parents.** `/pages/ap-csa-exam-prep` is a 404 and was
named four times. `ap-csa-qotd-hub` (5 uses), `ap-csp-qotd-hub` and
`ap-csa-study-games` are 301s. All repointed to pages that answered 200 at the
time of writing.

**Host.** 30 URLs hardcoded on the non-www host against www canonicals, on 60 of
60 sampled pages. They read `shop.url` now.

**The duplicate block.** The visible breadcrumb shipped into page bodies on
2026-09-10 carries its own BreadcrumbList. 29 of 60 pages emitted two blocks
naming different parents. The snippet now defers when the body already states the
trail. It is NOT deleted, and that is the part worth remembering: on 16 of those
same 60 pages the theme block is the ONLY breadcrumb schema present, so deleting
it would have stripped schema from about a quarter of the site. The cross-tab is
what decided this, not the duplicate count.

Intro to Java has no live hub page, so those handles now emit Home > page and the
emitter renumbers, rather than naming a parent that 404s.

## Evidence

- 60 live pages at a fixed stride across all 1,360 handles in
  `sitemap_pages_1.xml`, fetched through `lib/storefront-fetch.js`. 0 refused.
- rederive: parent assignment recomputed for all 1,360 handles by PARSING THE
  BRANCH ORDER BACK OUT of the liquid file rather than from a hand port of what
  it should say. 0 wrong-course parents.
- mutation: restoring the old branch order takes the same check to 147. The
  guard is not hollow.
- Pure ASCII, no em-dashes, clean through `lib/mojibake.js`.

Measured against the inherited claims:

| claim | measured | verdict |
|---|---|---|
| 93/200 emit two blocks | 29/60 (48%) | held |
| 103/200 name the 404 parent | 35/60 (58%) | worse |
| non-www schema vs www canonical | 60/60 | held |
| 1251 pages with two H1s | 59/60 (98%) | held |
| Dawn mega-menu, 151 links, CSS hidden | no Dawn menu exists | misattributed |
| 289 links on a lesson page | 407, mean 356 | worse |
| six empty hub pages | 6/6, all 200 | held |
| cyber unit exams noindex | 5/5 | held |

## Also delivered

- `docs/reports/2026-09-16-hub-architecture-audit.html`, published as an artifact.
- `imports/2026-09-16/stage-1-empty-hub-redirects.csv`, six rows, parse-back
  diffed against its spec, every Target status checked at 200 first.
- `imports/2026-09-16/RUNBOOK-stage-1-redirects.md`, because the sheet is a no-op
  until a human unpublishes the pages. All six Paths answer 200 today, and
  Shopify ignores a redirect on a URL that still resolves.

## Open

- **The nav deletion is the big one and has not shipped.** It is
  `sections/header.liquid`, the section, not the dead snippets. It needs a visual
  re-check after the push because that section still defines the cyber, networking
  and java pill styling and nothing else does.
- **The Search Console half could not be re-derived.** The Ahrefs GSC connector
  answers "No GSC data available for the requested date range" for project
  9205271 on every range tried, including 2026-03-01 to 2026-09-15. Every
  position and impression figure in the report is repeated from the earlier audit
  and is labelled as unverified. The four zero-traffic duplicates were left OUT
  of the stage-1 sheet for this reason: redirecting a page because it is believed
  to have no traffic, while unable to read its traffic, is how a ranking page
  gets deleted.
- Two H1s on 59 of 60 pages. Template defect, one fix, not 1,300 page edits.
- The noindex on the five cyber unit exam pages is confirmed live and is Tanner's
  decision, not a defect to fix.

## Learned

A generated artifact that lives only in the scratchpad is already lost. The
handover rule says commit AND send for a mechanical reason, and this session
opened by paying the cost of the half that was skipped.

The second one is about inherited work. The audit that came in was mostly right,
which is what made the one wrong item dangerous: it arrived with the same
confidence as the eight that held, and it was the item at the top of the order of
work. Checking whether a file is RENDERED is one grep and it reverses the whole
instruction.

## Post-deploy (appended after the merge)

Theme PR #120 merged into `claude/site-linking-audit-yhufjk` at
`7bf084fdc26c825b8d29f69a3d7b5e1587ece5e2`, on the same sha CI passed on
(`bff975a`). All five theme workflows green: verify-nav, verify-ad-gate,
verify-csa-slides, verify-quiz-contrast, verify-qotd.

The same 60 page sample, re-run live after the deploy:

| on the 60 page sample | before | now |
|---|---|---|
| two BreadcrumbList blocks | 29 | 0 |
| names the 404 parent | 35 | 0 |
| exactly one block | 31 | 60 |
| no breadcrumb schema at all | 0 | 0 |
| non-www host in schema | 60 | 14 |
| both navs present | 60 | 60 |

Row four is the one the conditional guard existed for. Deleting the snippet
would have put it at 16.

**New finding from the after-run.** 14 pages still carry a non-www URL in their
breadcrumb. It is not the theme any more: it is inside the breadcrumb written
into those PAGE BODIES on 2026-09-10, so no theme change can reach it. That is a
Matrixify fix and it is now the only remaining source of the host mismatch.
Not opened as a board task yet.
