# The practice pages were wearing another product's clothes

Tanner, on the pages shipped earlier the same day: "They look atrocious."

## What was actually wrong

Not unstyled. FOREIGN. Screenshotted the live pages, then screenshotted
ap-cybersecurity-complete-course-guide next to them:

| | the guide, and every other cyber page | the new hubs |
|---|---|---|
| palette | purple `#6B21A8` `#7C3AED` `#A855F7` on `#1E1B4B` | teal `#2f6f8f` on `#16324a` |
| type | DM Serif Display over Georgia | system sans |
| cards | `#F5F0FF` in `#e9d5ff`, 14px radius | white in `#dbe3ea`, 10px |
| arrival | dark purple gradient hero, eyebrow pill, stat row | an h1 and then prose |

Correct content, one click from pages that look nothing like it. That reads as
broken even when nothing is.

Three more things the screenshots showed that reading the CSS did not:

- **The fifth card was orphaned.** Five sets in a 2-column grid leaves a lonely
  card with dead space beside it.
- **110 characters per line.** A 1040px container with no measure cap, so the
  prose ran the full width and read as a wall.
- **The cards did not look clickable.** 1px of `#dbe3ea` on white, no colour, no
  affordance, difficulty buried in grey meta text.

## What changed

Everything below is lifted from the course guide, not invented. A hub that
matches the course it belongs to beats one that is prettier on its own.

- `public/practice-hub.js` carries the card system: purple cards, difficulty as
  a coloured pill (green Start here, purple Core, amber Stretch), a persistent
  `Start ->` affordance, and a meta row pinned to the card floor so cards in a
  row end level regardless of blurb length.
- `scripts/cyber-practice-hubs-csv.js` gained `chrome()` and `hero()`: the
  gradient hero with eyebrow, serif headline and a four-cell stat row, plus the
  table, note and closing band styles.
- The grid is flex rather than a fixed 2 columns, so the last row centres and an
  odd number of sets stops looking like a bug. auto-fit would do this too and
  the generators reject it.
- Container narrowed 1060 to 900 to sit near the 72ch measure, so prose no
  longer hugs the left with a dead gutter beside it.
- The DSA and lab spoke pages and their sibling strips got the same treatment,
  because clicking a purple card into a teal page is the same failure one level
  down.
- `frq-player.js` and `lab-player.js` recoloured to the house palette, 20 tokens
  between them, mechanical substitution only. The lab terminal's own dark
  colours (`#0d1117`, `#2b3440`) are untouched.

## Method worth keeping

**Screenshot before diagnosing.** The palette mismatch is invisible when reading
a stylesheet in isolation and obvious the moment two pages sit side by side.
Chromium could not reach the storefront through the egress proxy, so the live
bodies were pulled with curl, stripped of their script tags and rendered from
`file://`. That renders exactly the static HTML a crawler and a first paint see,
which is the half being restyled.

## Evidence

- 108 offline smoke suites pass. `smoke:frq` 110, `smoke:labs` 130, unchanged
  counts: this was a presentation change and the behaviour tests prove it.
- Every generator still passes its own hazard rules, including the non-ASCII
  ban, so the arrow ships as `&rarr;` rather than the character the guide uses.
- The live guard reports SAFE on all eight pages being rewritten.

## Still open

- The nav CYBER column still omits the FRQ hub. Theme repo.
- The sibling strip puts the focus line under the title while the cards put it
  above. Defensible, since it is a secondary descriptor there, but it is an
  inconsistency someone will notice.
