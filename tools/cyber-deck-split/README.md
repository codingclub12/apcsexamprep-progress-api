# Cyber deck split tools

Turning the Units 3-5 whole-lesson decks into per-day decks.

Every one of the 15 lessons in Units 3-5 ships exactly one `Day1_Deck_*` pair
covering the entire topic, while Units 1 and 2 ship a pair per teaching day.
That is 65 teaching days behind 15 decks.

## The two scripts

    python3 split_deck.py <in.pptx> <out.pptx> <first> <last>
    python3 audit_deck.py <deck.pptx> --day N --of M

`split_deck.py` is the range cut and nothing more. It is lossless: splitting
CED 3.3's TEACHER deck at 1-11 / 12-20 and recombining the halves reproduces
all 20 slides byte-for-byte in body text and speaker notes.

`audit_deck.py` reports what the cut did NOT do. Run it after every split; it
exits 1 while anything is outstanding, so it can gate an upload.

## Why the audit matters more than the split

A freshly cut deck looks finished. It opens, it paginates, every slide renders.
What it actually has is the previous lesson's pagination, the wrong day badge,
and a title slide whose speaker notes tell the teacher it covers everything.

Run against CED 3.3's cut halves, the audit reports:

    Day 1: footers still read "of 20"; badge reads DAY 1 OF 1; title notes say
           "a single comprehensive deck covering both learning objectives"
    Day 2: footers still read "of 20"; no DAY n OF m badge at all

That last one is the point. Day 2 begins on a section divider, so it has no
title slide. Nothing about the file says so.

Those findings were produced from the files. `docs/cyber-unit3-tier1-split-spec.md`
predicted the same list by hand a day earlier, which is the useful part: two
independent routes to the same authoring list.

## Order of work for one lesson

1. Read the deck slide by slide and write a cut list. **Do not use the teacher
   guides' Slides columns.** They do not match the shipped decks: the guide has
   3.1's slide 5 as ARP mapping when it is a section divider. The spec above is
   the cut list for CED 3.3 and 3.4; every other lesson needs one written.
2. `split_deck.py` per day, per variant.
3. Author what the audit names. Section numbers continue across days and are
   not renumbered: 3.3 Day 2 opens on section 02, the same way Unit 1's Day 2
   decks open on 03.
4. Split the lesson's Guided Notes on the same seam. A Day 2 deck whose notes
   preview names sections the packet does not contain is worse than no split.
5. `audit_deck.py` until it exits 0, then upload to Drive.
6. Tanner runs `scripts/cyber-slides-conversion.gs`. Claude cannot do this
   step; both limits were tested rather than assumed.
7. Add the lesson to `config/cyber-slide-manifest.js`, keyed by CED topic
   number. Read that file's header first: Unit 3's site and CED numbering
   diverge and the day counts cannot catch a swap, because the two lessons
   involved are both two-day.
