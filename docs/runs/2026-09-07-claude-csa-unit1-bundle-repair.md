# The AP CSA Unit 1 teacher bundle had four defect classes, not one

2026-09-07. Boards 262, 263, 265. PRs #592, #593, #594, #596, #597.

## Why this ran

Tanner asked for the CSA Google Drive teacher bundle so he could send it to a
purchaser. He then sent it before the work finished, which is the reason the
later passes were done at speed rather than left for the rebuild.

## What was wrong, in the order it was found

Each pass found the next layer, and none of the four was visible from the one
before it.

**One, the decks claimed code was runnable when it was not.** A worked example is
split across two slides when it does not fit, and each half was captioned
"Complete and runnable as shown." That caption appears 28 times and is TRUE on 2
of them. The speaker note making the same promise is true on 7 of 27. So the
repair decides per slide by compiling that slide's code with javac, because a
blanket replace would have turned nine true statements into hedges.

The split was also invisible, which is worse than the caption. On the "2. USING
IT" slides both halves declare the same class: one slide is `public class
Geometry` holding area and perimeter, the next is `public class Geometry` holding
only main, which calls Geometry.area. A student who types the second slide gets
"cannot find symbol". Union the members and it compiles and runs, so the programs
were right and only the presentation was wrong.

**Two, the claims a machine cannot check.** The break-it rationale is one string
used on all thirty NOW BREAK IT slides and is true of about three: it sat under
"Move the total line above the boxes line" and under "Store Math.sqrt(144) in an
int". Two break-its named a statement their own program does not contain. 1.10
said swapping the arguments changes the perimeter but not the area, and both
methods are commutative so it changes neither. And of thirteen misconception
panels, five held the TRUE RULE copied from the heading above them, so the
correct rule was displayed as the error.

**Three, the quizzes have no answer options.** All fifteen print their
multiple-choice stems and stop. Topic 1.7 question 1 reads "Which of these is a
behavior?" with no A, B, C or D, while the key says "Answer: C" of a list that is
not on the page. Items 4 to 7 read "Explain why this is wrong: <misconception
heading>", and those headings hold the true rule, so the sheet asked students to
refute "A constructor has no return type" and "String immutability". Read all
fifteen, not a sample.

**Four, every guided-notes prompt is cut mid-word.** At exactly 60 characters,
with no regard for where a word ends: "Classes in Java libraries are grouped into
packages. A packa ______". The notes close with the same broken exit ticket as
the quizzes.

A fifth is cosmetic and is the only one still open: the exercise keys print every
label twice, "Import confusion: Import confusion. Math and String are...".

## What was done

| defect | fix | evidence |
|---|---|---|
| deck captions and headings | repair, 58 edits | javac per slide, 3 mutations |
| deck teaching content | repair, 64 edits | 4 rules, 3 mutations, per-rule counts |
| quizzes | rebuilt from the live lesson pages, 88 questions | 7 mutations, all 30 rendered |
| guided notes | rebuilt from the decks, 56 documents, 664 prompts | 2 mutations, all 56 rendered |
| exercise labels | repair written and guarded, not yet applied | 11 cases, 6 of them negative |

The bundle went to Tanner as a zip at each stage. Nothing is committed: this
repository is public and the decks are the paid product.

## What this run should be remembered for

**Every single defect was a check that passed on the wrong thing.** That is the
same shape as the mojibake guards and the storefront 403, and it turned up five
more times in one afternoon:

- A caption asserting the code runs, over code that does not compile.
- A rationale asserting a one-character difference, over a change that moves a
  whole line.
- A panel labelled WHAT STUDENTS THINK, holding what students should think.
- A key saying "Answer: C" where no C was printed.
- My own verifier keying live items by a 60-character stem prefix, which four
  topics share, so it reported four correct quizzes as broken.

**And three of my own checks were hollow before they were mutated.** The first
was reported as a hollow guard before it had been measured, and it was not: two
rules were sparing the true-claim slides independently, and it took a third
mutation to prove which one was load-bearing. The second saw only
assignment-shaped statements, so it caught 1.6 and silently missed 1.15. The
third tested for an empty heading, a condition the bug it was written for does
not produce.

**A count is a better detector than a reading.** The notes builder's first run
wrote 56 files of one character per line, and every number in its report looked
right: 15 topics, 28 days, 56 files, "3 sections, 6 vocab". What caught it was
opening the file. What now catches it is the prompt count, which goes from 664 to
45021.

**Rendering earns its keep.** libreoffice-writer was missing from the container,
so a docx could not be converted and the first quiz gate said the look could not
be checked. Installing it retired that note and immediately found a defect no
text check had flagged: vocabulary title-casing printed API as "Api" and IDE as
"Ide" on every rebuilt packet.

**One finding was withdrawn, and checking is why.** The lesson map sends students
to /pages/cyber-dashboard for their gradebook, in a CSA product, which reads as a
cross-course link bug. Fetched live, that page is titled "Teacher Dashboard": it
is the general gradebook carrying a legacy handle from when the site was
Cyber-only, and /pages/teacher-dashboard does not exist. Not a defect, and
renaming a handle is NEVER_AUTO anyway.

## Still open

- **The exercise keys.** The repair and its guard are in #597. Applying it needs
  the 30 key files, and pulling binaries through a session's context one at a
  time is slow enough that it is better done from a local copy of the Drive
  folder: `python3 scripts/repair-csa-unit1-exercise-keys.py <folder>`.
- **The rebuild, board 255.** All four passes here are repairs. The kit fixes
  every one of these at the source and removes 61 slides from Unit 1's Day 1
  decks, but Unit 1 has no content in `scripts/csa_kit/` at all: the 38 topics
  with differentiation are Units 2 to 4. `scripts/extract-csa-unit1-content.py`
  drafts a topic out of its old deck and round-trips against the hand-authored
  1.6 entry, which is the start of closing that.
- **Verification.** Boards 262, 263 and 265 are in needs_verification with
  verified=0. The agent that did the work is not the one that says it is true.
