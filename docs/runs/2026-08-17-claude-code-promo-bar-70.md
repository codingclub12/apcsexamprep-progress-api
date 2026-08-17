# Task 70 - expired Spring 2026 MCQ Bootcamp promo bar

Artifact: https://github.com/codingclub12/APCSExamPrep-theme/pull/54 (draft, not merged)

## What changed

Removed lines 600-1123 of `layout/theme.liquid` in the theme repo: the
`#apbc-banner-wrap` div, its script, and all three duplicate
`<style>` blocks. 13,476 bytes per page, about 3.3 percent of the
document, across roughly 1546 live pages.

## Evidence

- Banner block md5 `229386f7e38a6be02717943f1fd37af9`, 13,476 bytes,
  byte-identical across `/`, `/pages/ap-csa-2023-frq-4-boxofcandy` and
  `/pages/ap-csa-exam-prep-hub`.
- Published theme `updatedAt` `2026-07-29T03:14:02Z` via Admin API, which
  rules out a pending write sitting behind the edge cache rather than
  arguing around it.
- Live HTML with the same block removed, rendered in Chromium at 1280x900,
  is pixel-identical to the render before removal.

## Three traps on this ticket, all of which have already cost a lap

1. **It does not render, and that is not the point.** The block hides
   itself via `new Date('2026-03-27T00:00:00')` before first paint, so a
   browser check says fixed and a curl says otherwise. Tanner closed it
   2026-08-12 16:40 on the browser reading; an agent reopened it 17:04.
   This session initially recommended closing it for the same reason and
   was wrong. Check the shipped markup, not the pixels.

2. **The ticket's own scope note is wrong about the body offset.** It
   claims `#apbc-csa-curriculum-bar` sets `body { padding-top: 55px }`
   unconditionally and should be re-checked. That rule is at
   `snippets/apcs-nav-source.liquid:112` and is the offset for `#apcs-nav`
   (`position: fixed`, 60px), which renders on every page. Removing it
   overlaps the first 55px of content sitewide. Left untouched.

3. **The live theme is served from a feature branch.** The published MAIN
   theme is GitHub-connected to `claude/site-linking-audit-yhufjk`, which
   is also the theme repo's default branch. A PR merged into a branch
   named `main` would look shipped in git and change nothing on the site.
   PR 54 targets the connected branch.

Same-prefix, different feature: `apcs-nav-source.liquid` uses
`apbc-badge`, `apbc-text`, `apbc-cta` as classes for the CSA curriculum
bar and defines them locally. The removed block used `#apbc-badge` and
`#apbc-text` as ids. No selector overlap.

## Still open

- PR 54 is a draft. Merging it deploys to the live storefront. Allow the
  measured ~64-minute edge cache tail before reading a curl as a failure.
- `#apcs-nav` is 60px tall against a 55px body offset, a 5px overlap.
  Cosmetic, pre-existing, not bundled here.
- The storefront being served from a long-lived feature branch rather than
  a `main` is worth revisiting on its own.
