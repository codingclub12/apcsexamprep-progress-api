# CSP topics 1.3 and 1.4: author the checks, closing Big Idea 1

Date: 2026-08-25
Agent: Claude Code
Ledger: task #91, locks `api:seed/csp-exercise-checks/1-3.js`, `api:seed/csp-exercise-checks/1-4.js`

## What changed

Two new files in `seed/csp-exercise-checks/`, 27 authored check questions across
four exercise pages. Big Idea 1 is now fully graded: all four topics, eight
exercises, 50 questions.

| page | questions | why that many |
| --- | --- | --- |
| 1.3 exercise 1 | 7 | six weeks of development log, each with its own ruling, plus the tested-and-ignored distinction |
| 1.3 exercise 2 | 6 | four scenarios, two of which hide a separately gradeable second layer |
| 1.4 exercise 1 | 8 | five bug reports across a four-name taxonomy AND the five discovery methods |
| 1.4 exercise 2 | 6 | four boundary patrols, two hiding a boundary on a different input |

Counts stay authored to content. Nothing in the renderer, the denominator seed
or the page copy assumes a number; every one reads `questions.length`.

## Evidence

- `node scripts/verify-csp-exercise-checks.js` - 50 questions across 8 pages,
  every citation confirmed present in the answer key it names.
- `node smoke/csp-exercise-pages.js` - 53 passed, 0 failed.
- Derived denominators, from `gradedPages()`:
  `program-design-development|exercise-1` 7, `|exercise-2` 6,
  `identifying-correcting-errors|exercise-1` 8, `|exercise-2` 6.
- Failure path proved, not assumed. Four sabotages of the new files, all caught:
  a fabricated citation; a real sentence taken from the OTHER exercise key in
  the same topic; a missing rationale on a wrong option; a `correct` letter that
  is not an option. The cross-document case is the one that matters most, since
  a citation that is real but from the wrong key is the subtle version of an
  invented one.

## Caught during the work

CI rejected one of my own citations, correctly. `1.4 exercise 2 q4` cited the
bare phrase `a run-time error`, which is 16 characters and under the 20
character floor `smoke/csp-exercise-pages.js` enforces. That floor exists for
exactly this: a four word fragment appears in half the document and proves
nothing about where the question came from. Replaced with the key's own
sentence about division by zero at the minimum of a different input.

One deliberate non-ASCII character now lives in `1-4.js`: the gradebook boundary
citation quotes `score >= 0` using the character the key prints. A citation is
verbatim or it is not a citation. The file header says so rather than leaving a
future reader to think the convention slipped.

## Still open

- 62 exercises unauthored, Big Ideas 2 through 5. Big Idea 1 is done.
- The `activity_type` collision is unchanged and still gates grading past Big
  Idea 1. Every mirror slug is also a gated `seed/csp-exercise-2` slug, so
  `{lesson}|exercise-2` is claimed by two activities, and Big Idea 3 spends
  `exercise-1` on its coding-practice pages. Settling this needs the mirror
  activity to get its own `activity_type` in `COURSES`. Authoring more topics
  inside Big Idea 1 was safe; Big Idea 2 onward is not, until that lands.
- These four pages are live in mirror-only form. The checks reach students only
  after a Matrixify import: `node scripts/csp-exercise-pages-csv.js out.csv
  --topic 1.3` and again for 1.4. Not run here; that is a human step.
