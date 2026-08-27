# 2026-08-27 claude code: bigger type in the CSA Teacher Bundle decks

## The ask

Tanner, directly in session (no board task filed): make all the slide font
sizes larger in the Teacher Bundle.

## Which slides that is

The Teacher Bundle whose slides this repo actually controls is the AP CSA
Teacher Course Bundle (`CSA-TSP-COMPLETE` in `config/shopify-skus.js`). Its
decks are generated here by `scripts/csa_kit/deck.py`, driven by
`scripts/build-csa-teacher-kit.py`: 38 topics across Units 2 to 4, two days for
most, TEACHER and STUDENT editions, 76 teacher decks and 1180 slides.

The other three bundles are not this. AP CSP and AP Cybersecurity Teacher
Bundle decks are Google Slides files converted from .pptx and reached through
`routes/slides.js`; this repo stores their ids, not their contents, and their
type cannot be changed from here. Nothing in this pass touches them.

## What shipped

`scripts/csa_kit/deck.py` had a point size written at each of about sixty call
sites. They are now a named scale in one block at the top of the file, and the
scale went up. Nothing went down.

    body copy       11.5 -> 14      vocabulary, compact worked-example notes
                    12.5 -> 15.5    end-of-day items, up next, extra practice
                    13   -> 15.5    program output, wide layout
                    14.5 -> 17      objectives, break-it panels, annotations
                    15   -> 17/18   misconceptions, section ideas, warm-up
    display         30   -> 32      slide headings
                    40   -> 42      deck title
                    34   -> 36      section divider names
    furniture       9    -> 10.5    footers
                    9    -> 11      captions
                    10.5 -> 12      card labels
                    7.5  -> 9       the trademark line
    code            max 12 -> 14, floor 7 -> 8.5

Type that grows inside a fixed card overflows it, and a PowerPoint text frame
does not clip: it draws over whatever is below and off the bottom of the slide.
So the panels grew with the text, and three structural changes carry that.

**`_must_fit` refuses to build an overflowing panel.** Every body-text slot now
measures its copy against the room its card actually leaves and raises with the
panel named if it does not fit. `_code` has worked this way since the
worked-example panels overflowed; this is the same guard for the proportional
panels, and it is what makes the scale safe to raise. The estimate is
calibrated, not guessed: 0.62 em per character, measured by rendering 315
sample blocks through LibreOffice and counting the lines each one wrapped to.
That is the substituted face, which is wider than Calibri, so the shipped slide
keeps the difference as margin.

**Panels size themselves to their content.** The subhead sits under whatever
height the heading came to, rather than at a fixed 1.42in: at 30pt every
heading in the course was one line, and at 32pt the longest section names take
two. Section ideas, worked-example notes and end-of-day items each measure
themselves instead of guessing a height from a character count. The dark code
panel is drawn to the height the code needs, so a twelve line program no longer
floats in a box sized for a twenty line one.

**Two bugs found on the way, both pre-existing, both fixed.**

The wide worked example sized its left code column and pinned the right one to
that size with `force=`. Where the right column held the longer line, it was
drawn off the right-hand edge of the slide. Both columns now render at the size
BOTH can hold. This was live in 6 decks and the bigger type made it worse
before it made it visible.

The single-slide worked example chose its layout on program length alone. A
short program with six lines of output pushed the OUTPUT panel through the
bottom of its card and into the footer: Topic 2.7 Day 1 slide 10 shipped with
"6" and "(for input 3)" printed outside the green card. The gate now considers
the output too, so either half being long sends the example to the wide layout
where each half gets a slide. 12 worked examples moved, and each gained a slide
and larger type than the compact layout could have given it: 1168 slides across
the 76 teacher decks became 1180.

## Verified

Build, all three units, with the fit guards active:

```
$ python3 scripts/build-csa-teacher-kit.py --unit 2   # 132 files
$ python3 scripts/build-csa-teacher-kit.py --unit 3   #  99 files
$ python3 scripts/build-csa-teacher-kit.py --unit 4   # 187 files
```

Render check, every deck converted to PDF and every page inspected:

```
$ python3 scripts/verify-csa-kit-render.py --kit build/csa-kit
rendered 76 deck(s), 1180 slide(s)
every slide keeps its content inside the slide, and no text block has
outgrown its panel.

$ python3 scripts/verify-csa-kit-render.py --kit build/csa-kit --all-editions
rendered 152 deck(s), 2360 slide(s)
every slide keeps its content inside the slide, and no text block has
outgrown its panel.
```

The same check on the decks as they were before this change also passes, which
is the point worth recording: the render check bounds text against the SLIDE,
not against its card, so it could not see either of the two bugs above. The
compact OUTPUT panel overflowed its card while staying inside the slide. Build
-time `_must_fit` is what closes that gap, and it is why the guard is in the
builder rather than only in the verifier.

Worked examples still compile and still match their OUTPUT panels:

```
$ python3 scripts/verify-csa-kit-examples.py --unit 2   # 24 examples
$ python3 scripts/verify-csa-kit-examples.py --unit 3   # 18 examples
$ python3 scripts/verify-csa-kit-examples.py --unit 4   # 34 examples
every worked example compiles, and every runnable one matches its OUTPUT panel.
```

Rendered pages read at every slide type: title, warm-up, guided-notes preview,
objectives, section divider, section content, both worked-example layouts,
break-it, misconception, vocabulary, discussion, end of day. The worst case in
the course for each tight slot was checked by name rather than by sampling:
Topic 4.16 Day 2 for the 418 character misconception, Topic 2.1 Day 1 for the
251 character warm-up draw-out, Topic 2.10 Day 1 for the code column that used
to run off the slide.

## Still open

- The decks a teacher already downloaded do not change. Regenerating the kit
  and reuploading it is a separate, human step, and the extra slide in 12 of
  the 76 decks means slide numbers move in those decks.
- The compact worked-example layout now applies to 2 of 76 examples, down from
  14. It is still the better layout when a program and its output both fit
  beside the annotations, and it is kept for that, but it is close to
  vestigial at the current content lengths.
- The render check verifies against LibreOffice's substituted fonts (DejaVu
  Sans for Calibri, DejaVu Serif for Cambria, Liberation Mono for Courier New).
  All three are the same width or wider than what PowerPoint will use, so a
  pass here implies a pass there, but nobody has opened one of these in real
  PowerPoint since the change.
- Unit 1 is the hand-built pilot and is not generated by this builder, so its
  decks still carry the old type. Bringing it under the builder, or hand
  matching it, is a separate piece of work.
