# 2026-08-25 Claude Code: structured data and a mistakes checklist on the FRQ pages

## What changed

The 53 FRQ practice pages shipped with no structured data at all and no use of
the one dataset that makes them different from anyone else's practice pages.
Both are fixed in `lib/csa-frq-pages.js`.

### 1. Common mistakes, taken from the mutants

Every FRQ carries `mutants`: named wrong versions of its own reference that
`scripts/verify-csa-frq.js` has PROVEN fail at least one test case. That makes
them the only thing on the page that can honestly be called a common mistake.
Not a guess at what students get wrong: a specific error the grader is
demonstrably able to catch. 160 of them across the course.

They render **collapsed**, the same treatment the hints already get, under
"Before you submit". That placement is deliberate. A mistake description names
the fix ("casts AFTER the integer division rather than before it"), so open
above the editor it is an answer key. Behind a summary it is something a student
reaches for after their own attempt, which is when it teaches. There is a smoke
assertion for the collapsing, not just for the presence.

### 2. Structured data

Modelled on the past-paper FRQ pages, which carry LearningResource, a
BreadcrumbList and an FAQPage and rank on the strength of it. Three blocks per
page, 159 in total, every one valid JSON.

## The thing worth remembering

The first version of the FAQ was a doorway page and the check caught it.

207 questions, all unique, because each names its lesson. But only **106 unique
answers**: one scoring answer appeared verbatim on **46 of the 53 pages**, and
the "do you write a program or a method" answer was one of two fixed strings.
53 pages sharing an FAQ is the exact anti-pattern I had warned about two turns
earlier while recommending this work.

The fix was to make each answer carry something only that entry can supply: its
own `given` contract, and its own four rubric rows. Now 207 of 207 answers are
unique. The suite asserts uniqueness rather than presence, so this cannot
regress quietly.

That is the general lesson: for generated content at scale, "does it exist on
every page" is the easy check and the wrong one. "Is it different on every page"
is what separates a content asset from a spam signal.

## Evidence

```
$ npm run smoke:csafrq
  32 passed, 0 failed        (was 24; section 7 is new)

  7.1 every page carries exactly three JSON-LD blocks and all of them parse
  7.3 every FAQ question is unique across the course
  7.4 every FAQ answer is unique across the course, not one template repeated
  7.6 every declared mistake is actually rendered
  7.7 the checklist is collapsed behind a summary rather than shown open

$ node scripts/csa-frq-pages-csv.js out.csv
  wrote 53 FRQ page(s), 1309 KB of body   (was 1099 KB)

$ all 110 offline smoke suites
  FAILED: none
```

All 53 handles are unchanged, so the sheet re-imports over the live pages in
MERGE mode. Every body grew; none shrank.

Two assertions failed on their first run because `esc()` escapes apostrophes, so
a mutant description is not a literal substring of the body. The pages were
right and the test was wrong; it now compares against the escaped form.

## Still open

- The unit hub sheet is generated and sent but not imported.
- The debug pages carry no structured data. They have no mutants either, so the
  mistakes section does not apply to them, but the JSON-LD would.
- Exam-style FRQs (9 point, Parts A and B, not lesson bound) remain the real fix
  for two-dimensional array coverage: only three 2D lessons exist in the CED, so
  the per-lesson bank cannot hold more than three however many are authored.
