# 2026-08-28 claude code: take the 10 to 14pt band up in the CSA decks

## The ask

Tanner, in session: "I want this for all courses on any font 10-14 font that
can get a little bigger without ruining the slide."

Follow-on from the 2026-08-27 pass, which raised body copy and left the
smaller furniture where it was.

## "All courses" is one course, and that is a fact about the repo

Only AP CSA has a deck generator here. `scripts/csa_kit/deck.py` is the sole
thing in the repository that writes a .pptx; `grep` for `Presentation(` returns
one file, and `git ls-files` returns zero .pptx or .potx.

The AP CSP and AP Cybersecurity Teacher Bundle decks are real files, but they
are not here and cannot be reached from a session. They live in Tanner's Drive
and on Shopify's CDN, and they became Google Slides through
`scripts/cyber-slides-conversion.gs`, an Apps Script that exists precisely
because two operations need Tanner's own Google credentials: sharing "anyone
with the link", which the Drive connector cannot express, and uploading, which
for CSP's 72.4 MB of decks worked out to roughly 25M tokens. This repo stores
their file ids and day counts so `routes/slides.js` can gate them. It does not
store a single slide of their content.

So changing type in a CSP or cyber deck is not an edit to this repository. It
is a new Apps Script that walks `SlidesApp`, and it would rewrite roughly 294
decks in place that paying teachers already hold links to. Nothing here does
that, and nothing here should start without being asked for. AP Networking has
no by-day decks at all.

## What shipped

Every size in `deck.py` that still sat between 10 and 14pt, taken as high as
its panel carries it. Two are deliberately held, and both are recorded in the
scale block itself rather than only here.

    T_FOOTER        10.5 -> 12      the slide footer
    T_CAPTION       11   -> 12.5    worked-example captions, section footnotes
    T_CHIP          11.5 -> 13      the title slide's edition and day chips
    T_CARD_LABEL    12   -> 13      every card label, and vocabulary terms
    T_EYEBROW       12.5 -> 13.5    the line above each slide heading
    T_TITLE_SITE    13   -> 14      APCSExamPrep.com on the title slide
    T_DIVIDER_META  13.5 -> 15      the divider's SECTION and topic lines
    T_OUTPUT        13.5 -> 15      program output, compact layout
    T_TITLE_META    14   -> 15      the "prepared for" line
    CODE_MAX_PT     14   -> 15      the ceiling on worked-example code

    T_TRADEMARK     9, unchanged and deliberately below the band
    T_BODY_MIN      14, held: the panel will not take more

`T_FOOTER` and `T_CAPTION` land inside the band rather than above it on
purpose. They are chrome. A footer set as large as the body copy above it does
not read as a footer, and "without ruining the slide" covers hierarchy as much
as it covers overflow.

`T_BODY_MIN` is held for a measured reason, not a taste one. It sets the three
annotations in the compact worked example's right-hand column, stacked above
the OUTPUT panel. At 15pt they need 3.47in; the column between the heading and
the footer is 5.12in, of which OUTPUT wants 1.70in. Widening the column does
not help, because the longest annotation still wraps to three lines at any
width the column can be given without starving the code panel beside it. The
build says so itself rather than the deck shipping broken:

```
ValueError: worked-example note: 61 characters need 0.70in at 15pt in a
3.62in column but the panel leaves 0.62in. Grow the panel or shorten the
copy rather than shrinking the type.
```

## One structural fix the bigger label forced

`CARD_TEXT_DY` is where a card's body copy starts, 0.86in below the top of the
card, and it was sized for a one-line label. At 13pt the vocabulary card's
label wraps, because that label is the term itself and the longest is 35
characters. Raising the constant to clear two lines looked right and was wrong:
it took 0.08in out of all twelve panels and `_must_fit` immediately failed the
warm-up prompt (needed 1.25in, panel left 1.24in) and two objectives. So the
constant stayed where every other card was verified against it, and the
vocabulary card measures its own term and starts its definition under whatever
that came to. One card pays for its own label instead of eleven paying for it.

## Verified

```
$ python3 scripts/build-csa-teacher-kit.py --unit 2|3|4     # 132 / 99 / 187 files

$ python3 scripts/verify-csa-kit-render.py --kit build/csa-kit --all-editions
rendered 152 deck(s), 2360 slide(s)
every slide keeps its content inside the slide, and no text block has
outgrown its panel.
```

Slide counts are unchanged: 1180 across the 76 teacher decks, the same as after
the previous pass, and no deck changed length. That matters because the
previous pass moved 12 worked examples to the wide layout and shifted their
slide numbers. This one moves nothing, so a teacher who has already re-downloaded
does not get renumbered a second time.

Rendered pages read at the title, vocabulary, and end-of-day slides, which are
the three carrying the most of the changed sizes between them.

## Still open

- The other courses, as above. If the CSP and cyber decks should get the same
  treatment, that is an Apps Script for Tanner to run against Drive, written
  the same way `cyber-slides-conversion.gs` was, and it is a decision rather
  than a patch: it rewrites live decks in place with no undo.
- `scripts/csa_kit/notes.py` builds the same bundle's guided notes, quizzes and
  teacher guide, and its type runs 9.5 to 13pt. Those are handouts rather than
  slides, so nothing here touched them, and the constraint is page overflow
  rather than panel overflow.
- Regenerating the kit and reuploading it is still the human step that puts any
  of this in front of a teacher.
