# 2026-09-04, claude-code: the slides on the cyber lesson pages

Board #205. Blocker recorded as #208.

## What was asked, and what turned out to be true

Three things: gate the slides, put them on all cyber pages, and take down the
outdated 1.1 video and slides. Two of the three were already true or already
impossible, which is worth writing down because the asks read like three
separate jobs and only one of them was.

**The slides are already gated.** `assets/apcs-slides-gate.js` calls
`GET /api/slides/<course>/<lesson>` with a bearer token, the API decides
entitlement, and the asset fails CLOSED on any error. Embed ids never reach page
HTML through it. Verified live: `/api/slides/ap-cybersecurity/1-1` answers 200
with `locked: true` to an unauthenticated caller.

What was NOT gated was three lesson pages carrying a deck in the page body,
which is the thing the gate exists to prevent. So the takedown and the gating
are the same job, and doing the first completes the second.

**The slides cannot go on all cyber pages.** Units 3, 4 and 5 have no converted
decks at all: `config/cyber-slide-embeds.js` holds 70 embeds generated
2026-08-27, every one of them Units 1-2, and `/api/slides/ap-cybersecurity/3-1`
answers `404 Unknown lesson`. Widening the theme prefix would hand a teacher a
button whose request can only 404, which is exactly what the comment in
`layout/theme.liquid` warns against. Tanner's call, same day: leave 3-5 alone
until the decks exist rather than show a "being prepared" panel, because an
unentitled teacher would otherwise see a buy-the-bundle prompt for decks nobody
has made yet. He also chose to leave the 20 exercise, lab and quiz pages
without the panel. So no theme change at all.

## What was on the pages

Swept all 25 live cyber lesson pages. Three carried an embed, and what each one
actually does to a reader is not what a grep suggests. The first draft of this
note said all three rendered a broken embed and that was wrong:

    1.1  a real video iframe and a real slides iframe, both rendering. The deck
         (1IZbIVy8...) is genuine but is NOT one of the 70 gated decks, so it is
         a superseded deck published to everyone.
    1.2  nothing broken renders. Its slides iframe is commented out, so all that
         shows is a "Slides Coming Soon" button linking to its own anchor.
    1.4  a live "Open in Google Slides" button pointing at
         .../REPLACE_WITH_SLIDES_PRESENTATION_ID/edit, broken the moment anyone
         clicks it.

**No paid content was ever disclosed.** None of the three ids is in the embeds
map. That is worth stating plainly rather than leaving as an implication,
because "a deck id was in page HTML" reads like a breach and this was not one.

## What shipped

`scripts/strip-cyber-page-embeds.js` removes, per page: the
`lesson-video-card`, the `slides-section`, the table of contents entry pointing
at the removed section, and on 1.1 the `VideoObject` JSON-LD that advertised the
video to Google. Bodies come from the Admin API, never a scrape.

    1.1  211,402 -> 209,032   (2,370 removed)
    1.2  275,600 -> 273,375   (2,225 removed)
    1.4  234,241 -> 233,892   (349 removed)

## Evidence

- Every removal is asserted by count before and after, and the body must SHRINK.
- Every JSON-LD block must still `JSON.parse`. That is what makes the VideoObject
  excision safe: it has to take the joining comma with it, and no amount of
  reading a diff catches a trailing comma the way a parse does.
- Parse-back diff on the sheet, all three rows byte-identical to what was written.
- The three edited bodies were run in headless Chromium against the DEPLOYED gate
  asset pulled from the CDN. All three: one gate panel mounts, headed "Slide
  decks for this topic"; zero slides sections, video cards, slides iframes,
  youtube iframes and dead `#section-slides` links.
- Table of contents went 11 to 10 on 1.1 and 1.2, the removed entry was the
  slides one in both, and every surviving entry is identical.
- `matrixify-preflight`: clean apart from one flag, below.

## The preflight flag, and why it is cleared

The 1.2 body is 273,375 characters, over the preflight's 250,000 "check this one
by hand" threshold. Checked by hand: `imports/*/cyber-1-2-question-labels.csv`
carries a 275,599 character body for this same page and was imported. The
threshold is a caution rather than a limit and this exact page has already
cleared it at a larger size.

## What this does not do

- It does not put slides on Units 3-5. See #208; that needs the decks converted.
- It does not touch the theme. The gate already self-mounts on these nine pages.
- 1.2 and 1.4 keep an inert authoring comment at the top of the body ("TO
  ACTIVATE VIDEO: Replace REPLACE_WITH_VIDEO_EMBED_URL with ..."). It renders
  nothing. Deleting it would have widened the diff to satisfy a guard rather
  than to fix anything, so the guards judge rendered content instead.

## Still open

- The sheet is generated and preflighted. It has not been imported.
- Units 3-5 decks, #208.
