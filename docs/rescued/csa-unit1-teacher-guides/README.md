# The 15 AP CSA Unit 1 teacher guides, rescued verbatim

These are the plain-text renderings of the `Teacher_Guide.docx` files in the AP
CSA Drive bundle, one per Unit 1 lesson, captured 2026-09-10.

## Why they are committed

They existed in exactly one place. Neither this repository nor the theme
repository contains the content or the generator that produced them: they were
built on 2026-07-31 by a generator that predates `scripts/csa_kit/`, and
`docs/runs/2026-09-07-claude-csa-unit1-bundle-repair.md` records the consequence
in its own words, that Unit 1's guides "are not regenerable from anything in this
repo". A container is reclaimed after a session; a Drive folder is one accidental
drag from gone. So the first thing done here was to write them down.

## Where they came from, exactly

    folder    1wLyRVqeMB0B2yn3UxMLPGoJfcD-FhrOV / Unit_1_Using_Objects_and_Methods
    modified  every one of the 15, 2026-07-31T18:56:55Z
    captured  2026-09-10, through the Drive API, text rendering

## The folder this is NOT

Board 267 carries a note dated 2026-09-08 saying "there are NO teacher guides
anywhere in the AP CSA Teacher Bundle's Unit 1", enumerated from
`docs/drive-snapshot/ap-csa-teacher-bundle.json`. That enumeration is correct
about the folder it read, `1HYnA1ZNByvHDBqlJGcbCT3lRC4PphbHV`, which holds 202
Unit 1 files and no guide among them.

It is a different folder. The guides are in the one named above, which the
snapshot never covered, and there are 15 of them. Two Drive trees hold a Unit 1,
and reading one and concluding about the other is the mistake this directory
exists to stop the next session from repeating.

A newer `Unit 1` tree, created 2026-09-10T14:23, sits beside the old one in the
same parent and carries Quiz, Guided_Notes, Slide_Decks and Supplements per
lesson with no Teacher_Guide.docx in any of the 15. That is the regression this
work is against: the guides did not fail to be written, they stopped being
shipped.

## What these files are for

They are the SOURCE for the rebuilt guides, not the product. Read them for the
teaching content, the CED objective codes and the differentiation, all of which
are good and none of which existed anywhere else. Do not hand one to a teacher:
they carry the defects recorded in
`docs/runs/2026-09-10-claude-code-csa-unit1-teacher-guides.md`, and the repaired
versions are generated from `scripts/csa_kit/content_unit1.py`.

Verbatim means verbatim. Nothing here is corrected, including the places where a
guide contradicts itself. A rescue that quietly improves its source cannot be
diffed against anything later.
