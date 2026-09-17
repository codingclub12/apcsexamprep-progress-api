# Fifty-two headings over nothing, and the guard that should have counted them

2026-09-17. Follow-up to PR #654. Board 308.

## Why this ran

Tanner, comparing the rebuilt Unit 1 guides against the Units 2-4 ones already in
Drive: "Feels like Unit 1 is different/better maybe." Measuring that turned up a
defect of Unit 1's own, which is the part worth recording.

## What the comparison found in our own work

Nine "Stop and think, then assign homework" headings printed with nothing under
them. Thirteen topics carry that segment and only four had anything to say in it,
so the other nine reached the page as a heading over blank space.

Measuring it properly turned up 43 more of the same shape, which nobody had asked
about and which are the same defect:

    28  Objectives and guided-notes preview   one per day, every topic
    15  Exit ticket                           one per topic, the day-flow row
     9  Stop and think, then assign homework  the ones actually reported

Fifty-two in fifteen documents. All three are now filled rather than deleted,
because each names something a teacher has: the guided-notes packet sitting in
the same lesson folder, the exit ticket section further down the same document,
and what the next day rests on.

## The nine are written to a pattern that was already there

The four filled ones all did the same job, and 1.15 states it most plainly:
"String immutability is the idea students otherwise carry all the way into Unit
4." Each says what the NEXT day depends on. So the nine follow that rather than
being freely invented, and every one names the specific day-2 material resting on
the day-1 idea. A note that could be pasted into any topic would be filler, and
filler under a heading is not an improvement on the empty heading it replaced.

## What this says about rule 6

The guard already had a rule for exactly this defect. Rule 6 was written on
2026-09-10 after the rendered file showed "Guided practice on the live lesson
page" printing bare on all fifteen, and it pins that heading and one other BY
NAME. It was green on all fifteen guides the whole time, while fifty-two other
headings in those same documents printed over nothing.

A rule that names the instance it was born from cannot see the class it belongs
to. Rule 11 is the general form: no heading may be followed by another heading,
excluding the five containers that legitimately hold other headings and the Day N
rows. Run against the pre-fix build it reports 52, which matches the count an
independent python-docx reader produced, and 0 against the fixed one.

## Units 2-4 are untouched, and that is measured rather than argued

The two new renderer branches print only when the day carries the field, and the
Units 2-4 content dicts have no such key. Rebuilding all 38 with the pre-patch
renderer and again with the patched one gives byte-identical extracted text,
combined md5 b29c0019ed9c both ways.

That check exists because the first attempt at it was worthless: both sides were
built with the patched code, so it compared the change against itself and would
have reported "no difference" no matter what the patch did. The baseline has to
come from git, not from whatever is in the working tree.

    suite     11 rules over the 15 rendered documents
    rederive  rule 11 against the pre-fix build reports 52, the same number a
              separate reader using python-docx reported
    mutation  14 rules broken one at a time, each red for its own reason, plus
              the 2 negative cases

## Still open

- **The drop into Drive**, still Tanner's, and still additive: none of the 15
  folders has a Teacher_Guide.docx.
- **Units 2-4 carry 190 empty headings of their own**, 76 of them the two
  sections whose content fields do not exist in those dicts at all. Not fixed
  here: those 38 files are in a teacher's hands and replacing them is a
  different decision from adding fifteen that are not.
- **114 of 228 Units 2-4 objectives never print**, deduped away by a shared CED
  code, and the ones that do print are I-can lines wearing a CED code rather
  than College Board's wording. That one needs the CED, not a generator change.
