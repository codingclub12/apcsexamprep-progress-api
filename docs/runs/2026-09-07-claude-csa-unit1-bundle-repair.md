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

## Correction, and the fifth defect class

The "Still open" list above is wrong about the exercise keys, and the way it is
wrong is worth more than the fix.

The doubled labels are real, but they are not in the files the purchaser has.
They were in an unreleased rebuild. Two Drive keys read live, topic 1.1 and topic
1.3, both modified 2026-07-31, print their labels once:

    If it compiles, it works: Successful compilation means the code follows
    Java's rules, nothing more.

No Exercise_1_KEY anywhere in the Drive has been modified since 2026-08-15, so
nothing newer was ever uploaded. What those live files DO carry is the defect
that matters: no code at all. Topic 1.3's key is six prose bullets telling a
teacher to "work the eight Tier 2 AP practice items" on the live page, and two
misconceptions. The rebuilt key for the same topic carries real Java in a code
font, a predict item, a read-and-analyze item, answers and a why for each.

So the fix was not the one in #597 at all. `teacher-bundle/build-exercises.js`
in the theme repo already existed to re-cut all 30 Unit 1 exercises, its own
header says it was written because they hold zero lines of code, and it had
never been run out to the teacher. It also introduced the doubling: 60 of 60
Unit 1 misconceptions open their `explain` by restating their `name`, against 0
of 152 in units 2 to 4, and the renderer prints `name: explain`.

Reading that data turned up two more of the same slip, both worse than the one
that was being chased:

- **Four names cut mid-identifier.** They had been derived by splitting `explain`
  at the first period, and `Math.random`, `Math.pow` and `(int)(Math.random()`
  contain periods. The labels read `Math:`, `(int)(Math:` and
  `Argument order in Math:`.
- **Two names carrying their own colon**, which the renderer doubles:
  `Trap distractor: Math.round ...: These are real Java methods`.

The docx repair in #597 would have fixed neither. Its length guard skips a
four-character label, and its regex refuses a label containing a colon, so the
two ugliest labels in the set are exactly the two it steps around.

Theme PR #109, merged to `claude/site-linking-audit-yhufjk` as 227ecb5. Names are
re-derived from the first sentence of each `explain` rather than retyped,
splitting on sentence punctuation followed by whitespace so `Math.pow` and `1.0`
survive. That rule reproduces 56 of the 60 existing names byte for byte and the 4
it does not reproduce are the 4 truncated ones, which is what says the rule is
right rather than merely plausible. `validateMisconceptions` in `lib/spec.js`
pins all three rules and both builders run it.

Evidence, three kinds:

    suite     38 specs in units 2 to 4 still validate, 0 failures
    rederive  a second reader parsing word/document.xml straight from the 30
              rebuilt keys: 150 bullets, 116 doubled before, 0 after, 0 labels
              carrying their own colon, 0 unbalanced brackets
    mutation  each rule broken alone and required to go red for its own reason:
              restatement, truncated name, unbalanced bracket, colon. Control
              builds clean.

Blast radius measured rather than assumed: comparing the pre-fix build to the
shipped one, 30 files changed and all 30 are KEY files. The 30 STUDENT files are
identical, because only the key prints the "What to look for" section.

Rendered 1.5 and 1.11 through LibreOffice and read the section off the page. The
two reworded labels are the ones no text check can judge.

The zip of all 60 files went to Tanner. Dropping it over the 15
`Lesson_*/Supplements` folders is the only step left, and it is his: the Drive
API here creates files rather than replacing their contents, so doing it from a
session would leave a customer-facing folder holding two of everything.

**What this is an instance of.** A repair script aimed at the wrong artifact. The
doubled labels were found by reading a generator's output and assumed to describe
the shipped files, and nobody read a shipped file until now. One `read_file_content`
call, which returns text rather than the base64 that made this feel expensive,
settled it. The rule that keeps costing this project is the same one every time:
verify against the live system, not against the thing that stands in for it.

## A sixth class, found by generating the student copy and reading it

The rebuilt exercises fix the missing code, and they were still wrong in a way
the key never shows. Exercise 1 closes with a "Then, online" block whose intro
is the teacher's staging note, and it was printing on both copies, so a student
handout read:

    Move the class to the live lesson page (Unit 1 Link Sheet, row 1.1).
    Students run the Hello, AP CSA editor exercise, then intentionally break it
    twice.

Theme PR #110, merged as cec8ecd. Key only now. The task bullets under it are
imperative and student-readable, so they stay on both.

**The measurement was wrong first, and in the shape this project keeps hitting.**
A keyword scan of the spec data said Unit 1 was 15 of 15 teacher-voice and units
2 to 4 were 0 of 68. That is the same split as the three defects above, so it
read as a fourth instance of one unit's bad authoring and was easy to believe.
Unit 2.1's intro says "Students work the building-block identification exercise"
and "lands in your gradebook"; the scan was looking for the string "Link Sheet".
Generating the docx and reading it, 1.1 and 2.1 were both printing the note to
the student. A check satisfied by something other than what it is checking, for
the ninth time today, and this time it was mine.

    before   the intro is on 15 of 15 STUDENT copies, 15 of 15 keys
    after    0 of 15 STUDENT, still 15 of 15 keys
    unit 2   2.1's student copy loses the note and keeps all 4 task bullets
    radius   45 of 60 files change: the 30 keys plus the 15 Exercise 1 student
             copies. Exercise 2 has no online block.

Two Unit 1 task bullets really were misaddressed and are reworded, 1.2's "the
class decides which of" and 1.7's "before students write it". Three others that
a keyword scan flags are fine, because "the class" there is the Java class, as
in "decide whether the class compiles". That is the same failure mode in
miniature: the word is not the thing.


## A seventh class, and this one is a criterion rather than a bug

Tanner, reading the rebuilt exercises: the bundle should not tell a teacher how
to run their class. No "give students 10 minutes to complete x", no "5 min class
discussion". Informational rather than directional. Something like "Next step"
is fine; choreography is not.

Nothing was broken. Every timing was accurate and every staging note was
sensible. It is a decision about what the product is, which is why it is worth
recording as its own class: a guide that prescribes pacing is a lesson plan, and
a teacher who already has a lesson plan is being told their job.

Theme PR #111, merged as bcee9e0. Two halves.

The renderer, which reaches every unit:

    segmentHeading   stops printing minutes at all
    Lesson Map       the Time column becomes In order, which is what the map's
                     own masthead already claimed it was
    labels           "Stop and think, then assign homework" becomes "Wrap up and
                     homework"; "Worked example at the board" loses the board
    FRQ set          "How to run one" becomes "About these questions", and its
                     four bullets become facts rather than a procedure

The minutes stay in the spec and validate() still sums them against a 60 minute
period. They are a check on our authoring, not an instruction to a teacher, and
that distinction is the whole reason they did not simply get deleted.

The prose, 121 fields across all 53 specs. 83 online intros go from "Move to the
live lesson page. Students work X, then Y" to "The Topic N lesson page has X and
Y". 31 tasks lose a grouping clause. 39 bell ringers and worked examples lose the
choreography and keep the substance:

    before   Put this on the board and ask the class to label every line with
             the building block it belongs to before anyone traces it.
    after    Every line here belongs to one of the three building blocks, and
             all three appear in eight lines.

The answers, the common wrong turns, and what each item is testing all stayed.
Those are facts about the lesson.

`validateVoice` in `lib/spec.js` pins it and both builders run it. Its markers
are narrow on purpose, and the reason is the failure this run keeps producing: a
first draft flagged 98 fields and a good fraction were wrong, because "the whole
class" is Java in topics 3.3 and 3.8, "two variables give four rows" is not
pacing, and "several items ask for the printed output" describes an item rather
than instructing anyone. All three are asserted as negative cases in the
mutation set.

    suite     53 specs validate, 0 failures
    rederive  every rendered document re-read from word/document.xml and from
              the pptx: Unit 2.1's 13 documents and its 24 teacher slides, and
              all 60 Unit 1 exercise files. 0 timings, 0 directional lines
    mutation  pacing, grouping and staging each broken alone and red for its own
              reason, plus the three negative cases. Control clean.

**What this does NOT reach, and it is the larger half.** Unit 1's teacher guides,
lesson maps, discussion documents, guided notes and quizzes were built months ago
by a different generator and are not regenerable from anything in this repo. The
1.1 teacher guide alone carries 14 printed timings and staging notes like "Do it
live. Take a student-suggested process, number the steps, then deliberately swap
two and ask what breaks." All 15 are like that, and they are in the teacher's
hands now. Only Unit 1's exercises could be fixed, because those are the four
documents `build-exercises.js` owns. Fixing the rest is the full-spec rebuild,
board 255, and it is now the blocker on two separate criteria rather than one.

## Still open

- **The exercise keys reaching the Drive.** The 60 rebuilt files are with Tanner
  as a zip, v4, md5 504a3ff11df6dd41433ef086efdc5825. Until they are dropped over the Supplements folders, the teacher's
  exercises still contain no code. `scripts/repair-csa-unit1-exercise-keys.py`
  and its guard stay useful for any bundle built before #109 and are no longer
  the fix for this one.
- **The other 11 Unit 1 documents per lesson**, which still print timings and
  staging. Same blocker as below: they need full lesson specs.
- **The rebuild, board 255.** All four passes here are repairs. The kit fixes
  every one of these at the source and removes 61 slides from Unit 1's Day 1
  decks, but Unit 1 has no content in `scripts/csa_kit/` at all: the 38 topics
  with differentiation are Units 2 to 4. `scripts/extract-csa-unit1-content.py`
  drafts a topic out of its old deck and round-trips against the hand-authored
  1.6 entry, which is the start of closing that.
- **Verification.** Boards 262, 263 and 265 are in needs_verification with
  verified=0. The agent that did the work is not the one that says it is true.
