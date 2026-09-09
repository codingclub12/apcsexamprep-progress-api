# CSA Unit 1: the CSS stops before the bottom of the page

2026-09-09, board 303.

## What Tanner reported

"Pages that leak and stop using css in unit 1. It happens on multiple lesson
pages."

Worth recording that this was asked twice. The first time it was read as answer
key leakage, which turned out to be real and is boards 295 and 301, but it is not
what was asked. The word that should have been the tell is "css".

## What is actually happening

13 of the 15 Unit 1 lesson pages render elements with no styling at all. 107
elements across the unit. The consistent set, on all 13:

    apcsa-lesson-nav      the footer prev/next lesson nav
    apcsa-nav-btn         its two buttons, plus .prev and .next
    tier-badge            the "Tier 2 - AP Practice" pill
    apcs-mastery-rubric   the mastery self-scoring rubric

and on 10 of them `apcsa-vocab-block`, on 9 the `op-card` and `bh-card`
practice widgets, and on 3 their headers and score labels.

The footer nav is the one a student sees. It ships as

    <nav class="apcsa-lesson-nav">
      <a class="apcsa-nav-btn prev" href="...">Lesson 1.8: ...</a>
      <a class="apcsa-nav-btn next" href="...">Lesson 1.10: ...</a>
    </nav>

and with no rule matching any of those three classes it falls through to
`#apcsa-lesson a:link`, which is the generic link rule. So the two lesson buttons
at the bottom of thirteen pages are bare underlined links.

## The cause is not what it looks like

It looks like a class rename, and it is not. `.apcsa-nav` DOES exist in the
stylesheet, which is close enough to `.apcsa-nav-btn` to be misleading: it is a
different component with its own `a:link` rules, and the distance is 4 characters.
Every other missing class has NO close match anywhere in the CSS on any page.

So the stylesheet for this component set was never included, rather than included
under other names. The fix is writing the rules, not renaming the markup, and
that distinction is the whole difference between a sheet that fixes it and a
sheet that moves the breakage.

## Why 1.1 and 1.2 look clean, and why that is worse

They report zero unstyled elements. They earn it by not having the components at
all: 1.1 has no footer lesson nav anywhere in its body, no tier badge, no vocab
block, no mastery rubric. So a student finishing 1.1 has no prev/next link to
1.2, which is a navigation gap rather than a styling one and is not fixed by the
same change.

Two different defects wearing the same measurement:

    1.3 to 1.15   the components are there and unstyled
    1.1 and 1.2   the components are not there

## What was checked, and one thing this nearly got wrong

The first pass counted every class used in markup but absent from the CSS, and
reported all 15 pages broken with `apcs-ex-check` at the top of the list. That was
wrong. The check button is `class="apcs-btn apcs-ex-check"`: `apcs-btn` carries
the styling and `apcs-ex-check` is the JS hook that `ex.querySelector` reads. A
class being absent from the stylesheet proves nothing on its own.

The measurement that survives asks whether an element has NO styled class among
all of its classes. That is the difference between 15 pages of false alarm and
13 pages of real defect.

Structural checks that came back CLEAN, so they are not the cause: div balance is
exactly zero on every page, every `<style>` is closed, no page has a duplicate
`#apcsa-lesson`, no unclosed HTML comments, and no selector in any Unit 1 style
block is globally scoped. The CSS does not leak OUT of the page.

One page does have a scoping defect: `ap-csa-lesson-1-7-api-libraries` closes its
`#apcsa-lesson` wrapper 14,834 bytes early, leaving 5,485 characters of visible
text and five exercise widgets outside the styled wrapper. Every other page's
tail is `<script>` blocks only, which render nothing.

## Evidence

`docs/evidence/2026-09-09-csa-unit1-unstyled-elements.json`, per page and per
class, fetched through `lib/storefront-fetch.js`.

## Still open

- The fix itself. It is CSS added to thirteen live page bodies, so it ships as a
  Matrixify sheet with a generator and a round trip, and the rules have to be
  authored first because they do not exist anywhere to copy.
- 1.1 and 1.2 need the footer nav ADDED, which is a content change and not the
  same sheet.
- 1.7's early wrapper close is a third change, and the only one where markup
  rather than CSS is at fault.
- Units 2 to 4 are unmeasured for this. The same probe answers it.
