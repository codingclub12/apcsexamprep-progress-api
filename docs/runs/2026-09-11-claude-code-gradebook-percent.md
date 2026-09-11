# The gradebook printed 483% for a 30 point lab

2026-09-11, Claude Code, board 310.

Tanner sent two screenshots of a live AP Cyber class. The 2.1 Lab column, priced
at 30 points:

```
Leo byun        29 / 30     483%
Harry Jung      28 / 30     467%
PeterShin       23 / 25     100%
Leo              3 /  5      60%
maxK             0 / 30       0%
CLASS AVERAGE                176%
```

The second screenshot was the grid, where the Lab column footer read 248%.

## What it was

Two faults stacked, and neither is visible on its own.

**The percent and the fraction came from different places.** The dashboard reads
`GET /api/teacher/classes/:code/progress`. That route carried `score` straight
off the progress table and built `points_earned` / `points_possible` from a
separate sum of the score_events ledger. Two endpoints write those, on different
arithmetic, and nothing reconciled them. So a cell rendered one number beside the
other and they were never required to agree.

**Nothing checked that the percent was a percent.** `POST /api/student/progress`
said "(0-100)" in its own error string and tested `Number.isFinite`. That is the
whole check. The lab page scrapes the score it displays, that display counts only
the questions answered so far, so a student holding 29 points with 6 answered
posted `round(29/6*100)` and 483 went into `progress.score`.

Which endpoint matters. Per-item writes go through `/api/student/score`, which
clamps points into `[0, max]` on every row, so the ledger could not have produced
this and never did: the pair stayed at a correct 29 / 30 throughout. The
whole-activity percent was the only door into the database for a number that is
not a percentage.

Then the class average is a mean of those percents, so one 483 carries the column
over 100 and the teacher cannot read their own gradebook.

Every row of the screenshot reproduces from that. The six students whose cells
looked fine are the ones where only one writer reported.

## And a third, found on the way

Board 270 removed the scraped reporter carrier from three readers of the
score_events ledger. There are five. The two it missed are both in
`routes/teacher.js`, and one of them is the query behind the dashboard a teacher
actually opens, so Michelle's 1.1 Exercise 1 still read **14 out of 14 under a /7
header** after the fix shipped and the task was closed. Measured, not inferred:
`smoke/gradebook-percent.js` section 5 asserts it against that route.

The comment above that query claims the points and the percent "can never
disagree" because it derives them "exactly as rollupScore" does. It does not.
`rollupScore` applies `keepItemSql`; this copy did not.

## What changed

`routes/student.js`

- `POST /api/student/progress` and `POST /api/student/quiz` refuse a score
  outside 0 to 100. Rejected rather than clamped: capping 483 to 100 hands a
  student a mastery grade for work nobody measured. Rejecting costs nothing they
  earned, because the per-item rows on the same activity go through a different
  endpoint and are untouched, so the real 29 out of 30 still reaches the
  gradebook. What is lost is only the page's bad summary of it.

`routes/teacher.js`

- A cell's percent is now derived from its own points pair whenever there is one.
  This is not a new opinion: `lib/gradebook-contract.js` has done exactly this
  since it landed, and this route drifted from it by being a second
  implementation.
- A stored percent outside 0 to 100 is capped at read time, and the raw value
  rides along as `score_out_of_range` so the cap is visible rather than laundered.
  The write guard stops new ones; these are the rows already on disk.
- The carrier filter, imported from `scoring.js` like the other readers, on both
  copies of the ledger sum here.
- The CSV export gets the same two repairs. It builds its own progress map and
  its own ledger sum, so the dashboard being right said nothing about it, and
  that file is imported into a teacher's real gradebook.

`lib/gradebook-contract.js`

- Source C caps the same way. The contract is the stated authority for new views
  and would otherwise have inherited the bug.

## Evidence

`npm run smoke:gradebookpct`, 36 assertions. It rebuilds the screenshot from the
roster up, forces Leo byun's and Harry Jung's stored rows back to 483 and 467
because that is what production carries today, and requires every cell percent to
equal its own fraction. Section 7 re-derives every priced cell from the raw
ledger in a second implementation that shares no SQL with the route and requires
them to agree.

`npm run smoke:gradebookpctmutation`, 10 mutations, 45 assertions. Each guard is
broken on its own and the suite has to go red on a named assertion, not just go
red. Two of the ten are not the defect that shipped but the repair somebody
reaches for next: clamping the write instead of rejecting it, and dropping the
carrier outright instead of only where the page names its own items. Both delete
something real and both are refused.

`npm run smoke:gradebookpctrederive`, a standalone second implementation. It
generates a ledger across the axes that decide the answer, reads raw rows with
plain SELECTs, groups them in JavaScript with no window function and nothing
imported from the route, and runs under both retry modes so the first-attempt
branch is checked too. Against the pre-fix route on seed 20260911 it reports 16
cells out of range and 54 disagreeing with their own pair, so it is not hollow.

`node scripts/deploy-gate.js deploy-gates/2026-09-11-gradebook-percent.json --pre`
passes on suite, rederive and mutation. The live half is below.

## Three things the checks caught that I had wrong

**The battery could not tell two guards apart.** The first section 3 refused 483
at the write endpoint, so the read path never saw it, and removing the
reconciliation left the suite green on Leo byun. The suite now forces the stored
row back to 483 before reading, which is both the isolation it needed and the
more honest test: it is the state the live database is in right now.

**Deriving the percent from the pair undid a teacher's reset.** A reset nulls
progress.score and stamps score_reset_at, but the ledger is append-only and keeps
every row, so "a pair exists, use it" put a reset 43% straight back on screen.
`smoke:cellactions` caught it. Nothing else would have: the pair had always been
left populated behind a null score, and no reader had ever looked at it. The
reconciliation is now conditioned on a non-null stored score, and there is a
mutation aimed at exactly that.

**The deploy gate refused a rederive that was not one.** My first rederive check
ran the same npm script as the suite check, so one check was being counted twice
and the gate said so. It is a separate script now.

## Two things found in the tooling, neither mine to fix here

`smoke:exercisekeys` mutates `lib/analysis-grade.js` and does not restore it when
its python step throws, which it does in this container because `python-docx` is
not installed. It left the file dirty mid-session and a `git add -A` swept the
mutation into a commit here. Caught by re-running the suites on a settled tree
and diffing against the parent, not by anything cleverer. Board 316.

Worth knowing while reading that: the mutation it leaves behind makes
`smoke:analysisparity` PASS, and the committed code makes it FAIL. So a run where
exercisekeys goes first hides a real parity failure in the analysis grader, where
a select field is scored for being answered rather than for being right. That is
a separate defect and it is board 317.

Five suites fail in this container on missing python modules (`docx`, `pptx`):
csaunit1guides, csaunit1guidesmutation, csakitstyle, deckvoice, exercisekeys. All
five fail identically on the parent commit, so none is from this change.

## Still open

- **The reporter is still wrong.** The page computes its percent against a
  denominator counting only what has been answered. The write guard now refuses
  that number instead of storing it, which is the right failure, but it is a
  failure: a page whose only writer is that scraped summary records nothing until
  the page is fixed. Board 291 fixed this shape on nine exercise-1 pages. The
  labs have it too. Theme work, board 313.
- **The export query applies no retry policy at all.** Flat `SUM(points)` over
  every row, so a student who retried an item is summed for each attempt. Its
  sibling three lines away does the row-number dance properly. Separate defect
  with its own blast radius, board 314, not folded in here.
- **Five copies of one ledger sum.** That is the whole reason board 270 could be
  closed with the bug still live. Board 315.
- **Class and column averages are still a mean of percentages**, which CLAUDE.md
  section 1b says the grade is not. With the cells fixed the numbers are possible
  again (the 176% and the 248% are gone), so this is now a weighting question
  rather than a broken screen, and it belongs with board 85. It is also a Shopify
  page body, so it ships as a sheet, not from here.
- **Board 270 should not read as done.** Closing it is what let this sit.

## What I would check after the deploy

`GET /api/teacher/classes/<code>/progress` on the real class, for the cell that
read 483: `score` equal to `round(points_earned / points_possible * 100)`, and no
cell in the payload above 100. That assertion was false before the deploy, which
is the point of running it after.
