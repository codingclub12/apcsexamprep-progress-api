# Cyber: the 7 missing gradebook denominators (task #84)

Date: 2026-08-22
Agent: Claude Code
Branch: claude/java-ap-csa-greenfoot-cgtph7

## What the task asked for, and why the answer is mostly "no"

Task #84 reads "author the 7 missing gradebook denominators", listing
`1.2|exercise-1`, `1.2|exercise-2`, `1.3|exercise-1`, `1.3|exercise-2`,
`1.3|quiz`, `case-file|case-file` and `exam|exam` on ap-cybersecurity.

Six of the seven must stay missing. The seventh is already authored in this
repo and is missing only from the production database.

The rule that decides it was already written down in
`scripts/seed-cyber-denominators.js` and `docs/cyber-denominator-gaps.md`:
a denominator is half of a pair, so authoring one for a column whose page
cannot report a score grows `items_total` and drags pace down for every
student in the class, for work none of them can submit. Every column below
was judged against that rule, not against whether a number could be found.

## What was measured, from the live page bodies

All values read on 2026-08-22 from the Shopify Admin API, each corroborated
by two independent signals on its own page.

| column | out of | evidence | can the page report? |
|---|---|---|---|
| 1.2 exercise-1 | 24 | header badge "3 Parts . 24 pts", score bar, 12+6+6 | no |
| 1.2 exercise-2 | 30 | score bar "/ 30 pts", 3 clients at 10 | no |
| 1.3 exercise-1 | 24 | header badge, finalScore "/ 24 pts", 12+6+6 | no |
| 1.3 exercise-2 | 24 | header badge, finalScore "/ 24 pts", 12+6+6 | no |
| 1.3 quiz | 5 | qzScore "0 / 5", ANSWERS has 5 keys, q1..q5 | no |
| unit exams 1-5 | 20 each | 20 question containers per page | no |
| case files 1-5 | 15, 14, 11, 12, 11 | each page's own `cfScoreText` | YES |

"Can the page report" was measured the same way for every row: whether the
live body contains a `fetch(`, an `XMLHttpRequest`, a `sendBeacon` or a token
read. The five case files have all of them. The other ten pages have none.

## The three findings

**1. Lesson 1.3 was never measured at all.** The other unpriced columns were
parked with a reason. 1.3's three columns were simply absent from
`seed-cyber-denominators.js`, and the file's header said Unit 1 pages "state
no total in any form this could read". For 1.3 that is not true: all three
state a total plainly. They are now measured and recorded.

**2. The exams are correctly unpriced, and now provably so.** All five are
20 questions and none can report. That was already the sibling script's
claim; this pass confirmed it independently by counting question containers
(units 1 and 2 use `id="q-eN"`, unit 3 uses `id="uNexam-qN"`, units 4 and 5
use `id="qN"`) and by finding no reporter on any of the five.

**3. `case-file|case-file` needs no authoring.** The values are already in
`scripts/seed-cyber-case-file-denominators.js`, and the five numbers there
match what this pass measured independently, digit for digit. The gradebook
reports the column as missing because the seed has not been RUN against
production, not because anything is unauthored. `lib/gradebook-contract.js`
resolves unit-scoped rows correctly and marks them `authored`, so seeding is
the whole fix.

## What changed in the repo

`scripts/seed-cyber-denominators.js`
- The two commented-out 1.2 lines became a real exported table,
  `MEASURED_UNPRICEABLE`, carrying value, evidence and blocker per column.
- Lesson 1.3's three measurements were added to it.
- `EXAM_UNPRICEABLE` records all five exam totals and why they stay out.
- `POINTS` is unchanged, so no gradebook anywhere renders differently.

A commented-out line records a number but proves nothing. A table can be
asserted against, which is the point: re-adding one of these to `POINTS` by
hand now fails a test rather than quietly regrading a live class.

`smoke/cyber-denominators.js`
- 12 checks covering the above. The load-bearing one is "no
  measured-unpriceable column has been moved into POINTS". It was verified to
  have teeth by moving `1.3|quiz` into `POINTS` and watching it fail, naming
  the column, then restoring.

## A correction to my own reading

Mid-investigation I reported that all three lesson 1.3 pages carry
`data-lesson-id="1.2-ex1"` and implied scores would be mis-attributed to
1.2 exercise 1. Stripping HTML comments before re-reading showed that is
wrong. On the 1.3 pages that string appears ONLY inside a stale authoring
banner in an HTML comment; those pages carry no live `data-lesson-id` at
all. The 1.2 pages carry correct live attributes. The banner is a
copy-paste artifact worth cleaning up, but it mis-attributes nothing, and
`data-lesson-id` is read by the tracker for hub lesson cards rather than for
identity on a lesson page.

## Still open

- **Run the case-file seed against production.** `node
  scripts/seed-cyber-case-file-denominators.js` writes the five unit-scoped
  rows. That alone takes the gradebook from 7 missing to 6, and 6 is the
  correct floor until pages can report.
- **The remaining 6 are blocked on reporters, not on numbers.** The moment a
  reporter ships on a 1.2, 1.3 or exam page, the value is sitting in
  `MEASURED_UNPRICEABLE` waiting, and activating it is a two-line move.
- **Task #83 is the same disease.** The case files, the only cyber pages that
  DO report, post a percentage derived by regex-scraping their own rendered
  `cfScoreText`. That is precisely the fragile denominator #83 describes.
- `scripts/scan-tracker-score-risk.js` currently throws "could not find
  apcs-tracker.js on a wired page". Not investigated here; it may be a
  storefront fetch path issue rather than a theme change.
