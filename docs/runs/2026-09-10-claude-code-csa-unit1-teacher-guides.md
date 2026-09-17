# Unit 1 never had a teacher guide, and the enumeration that said so read the wrong folder

2026-09-10. Board 308, and a correction to board 267. PR #654.

## Why this ran

Tanner: "The AP CSA Unit 1 Teacher Bundle fix did not include a teacher guide per
lesson on CSA." He is right, and the interesting part is how many places had
already written down something adjacent to it and been wrong in a different way
each time.

## Three claims about Unit 1's teacher guides, all in the repo, none correct

**`teacher-bundle/build-exercises.js`, in its own header:** Unit 1's "decks,
guided notes, quizzes and teacher guides are fine. Only its exercises carry the
defect." That sentence is the reason nobody looked.

**The 2026-09-07 run note:** Unit 1's guides "were built months ago by a
different generator and are not regenerable from anything in this repo". True
about regenerability, and it left the impression that the guides were shipped
and adequate.

**Board 267, dated 2026-09-08:** "there are NO teacher guides anywhere in the AP
CSA Teacher Bundle's Unit 1", from an enumeration of all 202 files in
`docs/drive-snapshot/ap-csa-teacher-bundle.json`. Rigorous, specific, and about
the wrong folder.

**What is actually true.** There are TWO Drive trees holding a Unit 1. The
snapshot enumerated `1HYnA1ZNByvHDBqlJGcbCT3lRC4PphbHV`, which has 202 Unit 1
files and no guide among them. The 15 guides are in
`1wLyRVqeMB0B2yn3UxMLPGoJfcD-FhrOV / Unit_1_Using_Objects_and_Methods`, all
modified 2026-07-31. A newer `Unit 1` tree sits beside that one, created
2026-09-10T14:23, carrying Quiz, Guided_Notes, Slide_Decks and Supplements per
lesson and no `Teacher_Guide.docx` in any of the fifteen.

So the guides did not fail to be written. They stopped being shipped.

**The shape of the mistake is worth more than the fact.** Board 267's note is
better work than the two comments above it: it enumerated rather than assumed,
it named its source file, and it told the next session to establish scope before
working. It was still wrong, because the thing it enumerated was not the thing
the question was about. An enumeration is only as good as its choice of set, and
nothing about being thorough inside the set warns you that you picked the wrong
one.

## The first thing done was to write them down

`docs/rescued/csa-unit1-teacher-guides/`, 15 files, verbatim. They existed in one
place. A session's container is reclaimed after inactivity and a Drive folder is
one drag from gone, and the 09-07 note had already established that nothing in
either repo could rebuild them.

Two things fell out of the rescue that were worth having on their own:

- **They are the only AP CSA CED learning objectives anywhere in the project.**
  `content_unit1.py` carries a comment explaining that it left LO codes blank on
  two of three objectives because "there is no CSA CED source in this repo to
  check an invented code against, and a wrong CED citation on a teacher slide is
  worse than an absent one." That was correct when it was written. The rescued
  guides carry 30 real codes with their text, 1.1.A through 1.15.A.
- **28 days across 15 topics**, which matches the day count derived independently
  from the Guided_Notes filenames in the drive snapshot, and matches board 255's
  "28 days of content". Two sources, one number, neither derived from the other.

## Counting before repairing

Five defect classes, measured by `scripts/parse-csa-unit1-guides.py` rather than
noticed while reading:

    41 of 45  exit-ticket items print a bare letter over options that appear
              nowhere in the document
    25        promises of material a teacher does not have
    138       directional lines, plus a printed timing on all 218 headings
    4         segments printed twice inside one topic, all in 1.5
    1         1.2 says three primitives on day 1 and asks for four on day 2

The exit tickets are the worst of the five and the only one that cannot be
repaired by editing text. "Answer: B" over no B is not a wording problem; the
options were never written. So they are authored, and the build refuses any set
whose correct option lands on a different letter than the shipped key already
named. That constraint is what keeps a teacher holding both documents from being
told two different things.

The 25 phantom references are board 267's actual complaint, and they were the
easy fix hiding behind the hard one: every "on the handout" now points at
Exercise 1 or Exercise 2 in the lesson's own Supplements folder, which are real
files, and which the theme repo's PR #109 put real code into last week.

## Three sources, kept apart

    docs/rescued/...            what the shipped guides said
    csa_kit/unit1_repairs.py    every change made to them, and why
    config/csa-unit1-lesson-pages.json
                                what the live page actually offers, imported
                                from the theme repo's repaired exercises

Keeping them apart is what makes rule 10 possible, and rule 10 is the check that
earns the most. It diffs the rebuilt teaching content against the shipped guides
and allows a difference only where `unit1_repairs.py` declares one. So the
difference between what a teacher had and what a teacher gets is exactly the
declared set, and a paragraph that quietly went missing has nothing to point at.

Every REPLACE pair also states how many times it must match. A pair that matches
a different number of times fails the build. That is the lesson from the sheet
that sat unimported for a day on 09-08 and would have reverted a better fix: a
repair that no longer applies has to say so rather than quietly doing nothing.

## What reading the rendered file found, and what only mutation found

Four renderer gaps, none visible from the content dict:

- the lesson-page heading printed with nothing under it, on all fifteen. The
  content was in the dict; `build_teacher_guide` had no branch for it.
- the misconception bullet restated the heading directly above it.
- a free-response exit item rendered as an empty A-B-C-D.
- **there was no Homework section at all.**

The last one is the one to remember. 25 phantom-material repairs were being
applied to text that never printed, and the phantom check ran green over all
fifteen documents because the section it was looking for did not exist. A check
that passes because its subject is absent is the same failure as a caption
asserting code runs over code that does not compile, and this repo has now found
it in six different shapes.

Neither the builder's own validate() nor the rendered-file verifier caught it.
The mutation harness did, by trying to break rule 3 and finding nothing there to
break. `edit()` asserts that a mutation changed something, and that assertion is
the entire reason the gap surfaced.

## Evidence

    suite     10 rules over the 15 rendered documents, read out of
              word/document.xml without python-docx, so a renderer bug cannot
              pass both the builder's check and this one
    rederive  rule 10, the declared-difference diff described above
    mutation  12 rules broken one at a time, each required to go red for its own
              reason, plus 2 negative cases

`npm run smoke:csaunit1guides`, `npm run smoke:csaunit1guidesmutation`.

The negative cases are the half that keeps the rule set alive. "the whole class"
is Java rather than a grouping, and the first draft of the voice rule refused a
correct sentence about whether a class compiles. The theme repo learned the same
thing in topics 3.3 and 3.8. It is asserted now, so widening the marker back
turns a test red rather than passing quietly.

Differentiation is exempt from the voice rule and only from the voice rule. The
kit's own `differentiation.py` sets the house style as concrete classroom moves a
teacher can run tomorrow, and took that style from the Unit 1 Topic 1.3 guide. A
Support item that refuses to say what to do is not informational, it is empty.

## Still open

- **The drop into Drive.** Fifteen files, one per lesson folder, and every one of
  those folders currently has no `Teacher_Guide.docx`, so it is additive rather
  than a replace. The Drive API here creates files rather than replacing
  contents, which is why this is Tanner's click and not a session's.
- **Verification.** Board 308 goes to needs_verification with verified=0. The
  agent that built these is not the one that says they are true, and the check
  that matters is a human opening two of them.
- **Board 267's scope note** should be corrected in place rather than left to
  mislead the next session. It is not wrong about its folder; it is wrong about
  the unit.
- **The kit still cannot build Unit 1 end to end.** `content_unit1.py` has one
  topic. These guides render through `build_teacher_guide` from the rescue rather
  than from a content dict, which is the right trade for a guide-only pass and
  the wrong one for board 255. The rescue is now the raw material for that
  rebuild, which it was not this morning.
- **This repo is public and the guides are the paid product.** The rescued text
  is committed on the same reasoning that `content_unit2.py` and the theme's 38
  lesson specs already are: source content is committed, built binaries are not,
  and `build/csa-unit1-guides/` is gitignored beside `build/csa-kit/`. Worth
  Tanner knowing rather than worth a session deciding differently on its own.
