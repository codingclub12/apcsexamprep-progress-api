# CSA Units 2 and 3 exercise-2: the last 21 banks

Date: 2026-08-25
Agent: Claude Code
Branch: claude/google-drive-integration-e9v8od

## What changed

Authored `exercise-2` banks for every lesson in Units 2 and 3: 12 and 9
respectively, six applied MCQs each, 126 new questions with all four rationales
written. Two new files, `seed/csa-exercise-2/unit2.js` and `unit3.js`, wired
into `seed/csa-exercise-2.js`.

Every CSA lesson that declares `exercise-2` now has a bank: 38 of 38, 228
questions. Unit 1 declares `cfu` instead and needs none.

No code changed. The renderer, CSV exporter and smoke suite already existed.

## Question design per unit

Unit 2 and Unit 3 fail differently, and the banks lean into that rather than
using one template.

**Unit 2 is where a wrong answer looks like a right one.** A loop bound off by
one or an `else if` chain ordered lowest-threshold-first produces a plausible
number, not a crash. So the Unit 2 questions are mostly tracing and
discrimination: what does THIS input print, and what distinguishes two versions
that differ by one character. Several are built directly on that: the stray
semicolon after `if`, the braceless second statement, the dangling `else`, the
grading chain ordered backwards.

**Unit 3 is where the bug is silent at construction.** Authoring the FRQ bank
for these lessons established that its characteristic errors produce no message
at all: `name = name` in a constructor, a shadowed field, a `this` omitted where
it was mandatory. The object looks constructed and holds defaults. So the Unit 3
questions ask what the object CONTAINS after a call rather than whether the code
runs. 3.4 q2 and 3.9 q3 are the same bug asked from two directions on purpose,
since it is the most common single defect in student class code.

## Consistency with the existing convention

Both files follow `unit4.js`: same entry shape, all four rationales written, and
answers skewed to B. The skew is deliberate and documented in both headers. The
renderer shuffles options deterministically, so rendered pages are balanced
(smoke 5.1, 5.2); assertion 5.3 asserts the SOURCE skew, because that is what
proves the shuffle is doing real work. Authoring varied letters would turn 5.3
red while changing nothing a student sees.

Final distribution across all three unit files: 225 B, 2 A, 1 C.

## Verification

```
npm run smoke:csax2pages     320 passed, 0 failed   (was 152 after Unit 4)
all 115 offline suites       FAILED: none
npm run csax2 -- out.csv     38 pages, 828 KB sheet, 800 KB of body
```

Coverage checked against `COURSES` rather than by counting: for every unit that
declares `exercise-2`, every lesson has a bank (missing: none), and no bank
exists for a unit that does not declare it (extra: none). That second check
matters because a bank for a Unit 1 lesson would render a page with no column
behind it.

Shape validated independently of the smoke suite, whose own count assertion is
tautological: 38 banks, 38 unique lessons, 228 questions, every question 4
options and 4 rationales keyed A-D, every `correct` a legal letter, no missing
scenario/stem/tag. Rendered bodies are pure ASCII (smoke 3.x).

A Units 2 and 3 only sheet (21 rows) was cut from the full 38-row export rather
than regenerated, and its bodies were verified byte-identical to the full
sheet's. That avoids re-importing 17 Unit 4 pages that are already live.

## Still open

- The sheet is generated, NOT imported. Import is a separate human step.
- The `exercise-3` and `debug` code_test_cases banks remain unverified from an
  agent session (admin GET needs a key).
