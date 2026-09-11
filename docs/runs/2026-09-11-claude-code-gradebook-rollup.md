# The gradebook fixed the student row and left every other number a mean

2026-09-11, Claude Code, board 85.

Board 85 has been the only item in the bleeding bucket for nine days. It is
written against a measured case on class CYBER-Z8LA: a student's overall grade
was the mean of their item percentages, so a 5 point quiz weighed the same as a
25 point project, and `earned: 0 possible: 0` was hardcoded on every student.

That half was fixed on 2026-09-02, and the run note from 2026-09-03 checked it
properly and said so. `lib/admin-gradebook.js` has summed points into
`overall.pct` since then. What nobody compared was every OTHER number on the
same page.

## What was still wrong

Five places applied the old arithmetic, and each is a number a teacher reads off
the operator gradebook:

```
the lesson cell      printed "10 / 30" and "60%" in the same cell
the column footer    class average per assignment, a mean over students
the lesson footer    the same, per lesson
the activity rollup  a mean of column averages, weighted by heads not marks
the class average    a mean of student percentages
```

The lesson cell is the one worth looking at twice. The pair summed marks and the
percent averaged the two item percentages, and nothing required them to agree.
A lesson holding a 5 mark exercise at 100% and a 25 mark quiz at 20% rendered
`10 / 30` with `60%` beside it. Ten marks out of thirty is 33. That is the same
shape as this morning's 483% cell, one level up: a percent and a fraction from
different places, sitting in one cell.

The class average is the one a teacher sees first. A class of two, one student on
1 / 1 and one on 12 / 40, read 65%. The class had earned 13 marks out of 41.

And one denominator too many was collapsed. `overall.possible` carried the
ATTEMPTED sum, which `docs/gradebook-contract.md` calls `graded`, and the course
total was not reported at all. So a consumer reading `possible` to ask how much
of the course is priced got a number that equals the graded total by
construction, and therefore always reads as complete. The 2026-09-03 T-0.2 note
found exactly this and recommended it be fixed rather than the rebuild the task
asks for. It was right, and this is that fix.

## Why every suite was green

`smoke/admin-gradebook.js` has 58 assertions over this builder and passed
through all of it, including one that asserts a lesson average to the digit.
Its columns are equally weighted. Where every cell in a column is out of the same
number, a mean of percentages and a points average are the SAME number, so no
assertion over that fixture can tell the two rules apart. The suite was not weak;
it was pointed at a fixture where the question does not arise.

`smoke/gradebook-agreement.js` did compare the two builders, and on the
denominators it PINNED the defect rather than catching it:
`adminO.overall.possible === contractO.overall.graded`. It required the two views
to disagree about what the word means.

## What changed

`lib/gradebook-contract.js`

- `gradePct(earned, graded)` is the grade rule as one exported function: points
  over points, null rather than zero when nothing was attempted. The contract's
  own three sites call it, and so does the other builder. Sharing
  `pointsFromRatio` already stopped the two rounding differently. They were
  dividing differently.

`lib/admin-gradebook.js`

- The lesson cell percent is its own pair wherever it has one. A lesson with an
  unpriced item in it keeps the mean, because it shows no pair for the mean to
  contradict, and `basis` on the cell says which.
- The lesson footer, the column footer, the activity rollup and the class average
  are marks over marks, with the same labelled fallback and the same reason.
- Three denominators: `earned`, `graded` (attempted), `possible` (the whole
  course), plus `items_total`. Same names and same meanings as the teacher route.
- `cell.score_missing` and `overall.items_score_missing`, which is a bug found on
  the way rather than one anybody reported. `public/teachers.html` has drawn an X
  from the first and a legend from the second since the contract landed, and this
  builder set neither, so both were dead code on the operator page: a graded
  activity finished with no score rendered as "done", which reads as done and
  fine. That is the exact failure the comment above that line describes, still
  live one page over.

`public/teachers.html`

- One renderer for both average rows, carrying the marks pair in the tooltip and
  an asterisk where the number is a mean of percentages. A footer that averaged
  marks and a footer that averaged percentages used to look identical.

**`basis: 'percent'` is kept, and board 85 asks for it to be retired.** That is a
deliberate disagreement, not an oversight. CLAUDE.md defends it as a labelled
fallback for a class where nothing has points assigned at all, and on
AP Cybersecurity that is not an edge case: 7 of 80 columns were unpriced when
board 84 was written. Deleting the fallback blanks a real number on a teacher's
screen. Deleting the LABEL would be worse. So the fallback now extends to the
column and class averages too, always labelled, and there is a mutation aimed at
anyone who decides to remove it.

## Evidence

`npm run smoke:gbrollup`, 47 assertions on a fixture built so the two rules give
different answers at every level. Every expected number is stated as a fraction
in the file, so the arithmetic is checkable without running it. Against the
pre-fix builder, 35 of the 47 fail, and they fail with the real numbers: the
lesson cell reads 60 beside `10 / 30`, the column footer reads 70 instead of 86,
the class average reads 74 instead of 63.

`npm run smoke:gbrollupmutation`, 12 mutations, 56 assertions. Each breaks one
rule and has to redden an assertion that NAMES it. Three of the twelve are not
the defect that shipped but the repair somebody reaches for next: dividing by the
course total instead of the attempted total (the one arithmetic board 85 spells
out as forbidden), deleting the percent fallback outright, and flagging every
completed cell with no score including lesson visits. All three are refused.

`node scripts/gradebook-rollup-rederive.js --seed 20260911`, a standalone second
implementation. Plain SELECTs over progress, attempts, `course_denominators` and
`course_manifest`, grouped in JavaScript, importing nothing from either builder,
not even `pointsFromRatio`. It compared 153 numbers and agreed on all of them;
against the pre-fix builder on the same seed it reports 69 disagreements. It also
refuses to report a pass when the generated fixture is too thin to prove
anything, which is a check on the check.

`npm run smoke:gbagree` now compares all three denominators, and asserts that the
course total and the attempted total are DIFFERENT numbers on the fixture, so the
comparison cannot pass by both being the same thing.

`node scripts/deploy-gate.js deploy-gates/2026-09-11-gradebook-rollup.json --pre`.
The live half is below.

## What the checks caught that I had wrong

**The first version of the new suite passed against the old code.** I had written
the column-average case with one denominator per column, which is the same
mistake the existing suite makes: with equal weights the mean and the points
answer agree, and the assertion proves nothing. It needed a column where two
students sat different out-ofs, which the attempts path produces for real,
because it keeps whatever the page reported.

**The rederivation agreed with the builder before I had checked it could
disagree.** Running it against the pre-fix builder was the only thing that turned
it from a script into a check. 69 disagreements out of 153 is what makes the
zero mean something.

## Still open

- **The live check has not been run.** `GET /api/admin/class/:id/gradebook` is
  fail-closed. `ADMIN_READ_KEY` is implemented in `routes/admin.js` (GET only,
  `reveal=1` refused) and is not set on this environment, so the route answers
  403 to this session. The command is written out in the gate manifest. What it
  would add is behaviour on real data rather than on a fixture, and it is the
  check that settles board 85 rather than this one.
- **Board 85 should not be closed by the session that wrote this.** Same rule as
  always, and it matters more here because the board's text describes a defect
  that was fixed nine days ago, so "is it done" cannot be answered by reading the
  task.
- **There are still two gradebook builders.** They now agree, and a suite holds
  them to it, which is the smaller fix the T-0.2 note recommended over a rebuild.
  Pointing `/class/:id/gradebook` at the contract outright would cost
  `activity_coverage`, the "which grader is never firing" signal that the
  contract has no equivalent for, and the operator page reads it. Worth doing
  only with that moved across first.
- **The class and column averages on the teacher's own dashboard are a Shopify
  page body**, not this repo. That half of the 2026-09-11 handoff is still open
  and ships as a sheet.
- Nothing, on the suites. All 245 offline suites pass. The five that fail in a
  fresh container on missing python modules (csaunit1guides,
  csaunit1guidesmutation, csakitstyle, deckvoice, exercisekeys) pass once
  `python-docx` and `python-pptx` are installed, which is what CI does, so this
  run has no unexplained red. Worth noting because this morning's note recorded
  the same five as unresolved: they are an environment gap, not a defect.
