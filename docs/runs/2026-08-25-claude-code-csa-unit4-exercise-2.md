# CSA Unit 4 exercise-2: the other eleven banks

Date: 2026-08-25
Agent: Claude Code
Branch: claude/google-drive-integration-e9v8od

## What changed

Authored the 11 missing `exercise-2` banks for CSA Unit 4 (4.1 to 4.5, 4.8 to
4.12, 4.16), six applied MCQs each, 66 new questions with all four rationales
written. Unit 4 now has a bank for every lesson it declares: 17 of 17.

No code changed. The renderer, the CSV exporter and the smoke suite already
existed and were already green; the exercise-2 column has been priced since the
manifest was written and this fills content into it.

## The question that dissolved

The task arrived as a tiering problem: "most need a #2, some need 3, a few need
a #4, based off CED and difficulty". I had asked whether that meant total items
per lesson or additional ones, a 3x scope difference.

Reading the repo retired the question rather than answering it.
`seed/csa-course-manifest.js:42` hardcodes `'exercise-2': 6`, and the
denominator has been carried for all 53 lessons since the manifest was written.
There is exactly ONE exercise-2 per lesson, worth 6 points. Item count was never
an open variable, so tiering could only ever have meant question difficulty
within a fixed six. The real backlog was never "add 10 to 15 more": it was the
32 lessons whose priced column has no content.

Worth recording because the question was reasonable and still wrong. The config
had already decided, and asking the user to re-decide it would have produced a
worse answer than reading.

## Two alarms I raised and then withdrew

Both are recorded because a future session will notice the same two things.

**1. "A five-question bank caps students at 5/6."** False.
`lib/gradebook-contract.js:669-700` makes the REPORTED pair win over the
authored denominator, deliberately: a student served 5 of a 6 question bank is
scored out of 5, because that is what they were asked. Rescaling would invent a
question they never saw. So a short bank is a content gap, not a scoring bug,
and no guard is needed.

**2. "Unit 1 has a phantom exercise-2 column diluting its pace."** Also false.
The manifest hands every lesson the full `DENOMINATORS` spread regardless of
what its unit declares, so Unit 1 lessons are priced for an exercise-2 they do
not have. But that lands in `course_denominators`, which only PRICES columns.
Columns are created from `COURSES.activities` (line 454) and `course_manifest`
(line 512), and neither gives Unit 1 an exercise-2. A price with no column is
never looked up. Inert, not phantom.

The general shape: `course_denominators` and `course_manifest` are different
tables read by different code paths, and conflating them makes an over-broad
seed look like a live bug.

## The B-skew is deliberate, do not "fix" it

Authored banks are 99 correct answers on B out of 102. That looks like a defect
and is not. The renderer shuffles options deterministically per question, so the
RENDERED pages are balanced (assertions 5.1 and 5.2). Assertion 5.3 asserts the
SOURCE is skewed, on purpose: it is what proves the shuffle is doing real work.
Authoring naturally varied answer letters would turn 5.3 red while changing
nothing a student sees.

## Verification

```
npm run smoke:csax2pages     152 passed, 0 failed   (was 104 before this pass)
all 112 offline suites       FAILED: none
npm run csax2 -- out.csv     17 pages, 382 KB sheet, 369 KB of body
```

Sheet checks: BOM present, CRLF line endings, 18 rows (header plus 17), MERGE
mode on every row. Source is pure ASCII with no em-dashes; the only `--` in the
file are `i--` decrements inside Java code shown in answer options.

Shape validated independently of the smoke suite: 17 banks, 17 unique lessons,
102 questions, every question 4 options and 4 rationales keyed A-D, every
`correct` a legal letter, no missing scenario/stem/tag.

## Still open

- Units 2 and 3 exercise-2: 21 lessons, 126 questions. Same pipeline, no new
  code needed.
- The sheet is generated, NOT imported. Import is a separate human step.
- The `exercise-3` and `debug` code_test_cases banks remain unverified from an
  agent session (admin GET needs a key).
