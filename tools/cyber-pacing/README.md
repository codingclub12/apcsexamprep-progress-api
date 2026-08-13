# AP Cybersecurity course pacing

Turns the course calendar workbook into `pacing.json`, the data the Command Center
pacing view renders from. The workbook is the source of truth for the year plan.

## Regenerating

```
node tools/cyber-pacing/extract-calendar.js backup/workbooks/AP_Cyber_Course_Calendars_Traditional_and_Block_2_1.xlsx
```

The workbook itself is kept in `backup/workbooks/` so the extraction reproduces without
the original upload. `dump-xlsx.py` reads the sheets with the Python standard library
only, so there is no openpyxl dependency to install on Railway or in CI.

## What the workbook contains

| sheet | shape |
|---|---|
| Traditional 5-Day | one lesson-day per class meeting, 144 rows, columns: date, week, weekday, lesson-day number, unit, content, type |
| Block Schedule | 90 minute blocks covering two lesson-days each plus a short period, 86 rows |
| AP Review | the review block after the Unit 5 test, 6 rows |
| Notes | how the plan was built, plus per-unit day totals |
| Unit 3 Mapping | bundle guide lesson names against site lesson order |

Dates are deliberately absent. Column A is left blank for a teacher to fill in with
their own calendar, which is what makes the plan portable rather than tied to one
school's closures.

Day types seen in the schedule: `Teach`, `QuizLab`, `Project`, `Test`, `Lab`, `Review`,
`Intro`, `Final`, `Exam`, `Capstone`.

## Validation

The extractor is not a straight dump. It cross-checks the schedule against the Notes
sheet and exits non-zero on any mismatch, so a workbook edit that changes a unit's
length fails loudly instead of shipping a wrong calendar:

- every unit's counted lesson-days must equal the total stated in Notes
- the overall total must equal the stated 143
- lesson-day numbers must form a contiguous run with no gaps or repeats

Current state: 143 unit lesson-days across five units, all matching Notes.

| unit | lesson-days | make-up |
|---|---|---|
| 1 | 22 (days 2-23) | 14 teach, 5 quiz+lab, 2 project, 1 test |
| 2 | 29 (days 24-52) | 21 teach, 4 quiz+lab, 1 lab, 2 project, 1 test |
| 3 | 30 (days 53-82) | 20 teach, 6 quiz+lab, 2 project, 1 test, 1 semester final |
| 4 | 23 (days 83-105) | 15 teach, 4 quiz+lab, 1 lab, 2 project, 1 test |
| 5 | 39 (days 106-144) | 30 teach, 6 quiz+lab, 2 project, 1 test |

Day 1 is course intro, which sits outside any unit.

## Known conflict with the Command Center

The `UNITS` array already on `/pages/cyber-command-center` carries its own `days` value
per lesson, and it disagrees with the workbook on 17 of 25 lessons. Summed teaching days
per unit:

| unit | workbook | Command Center |
|---|---|---|
| 1 | 14 | 9 |
| 2 | 21 | 8 |
| 3 | 20 | 11 |
| 4 | 15 | 8 |
| 5 | 30 | 13 |

Most of the Command Center values are 2, which reads as an unfilled default rather than a
considered number. The workbook is sourced from the Full-Year Pacing Guide in the teacher
bundle, so it is the one to trust.

`transform-command-center.js` reconciles all five units against it:

```
node tools/cyber-pacing/run-dry-command-center.js   # writes diffs/, nothing remote
```

The page computes `lessonDays(l) = l.days + l.act` and every lesson carries `act:1`. The
workbook is built the same way, "each lesson = its teaching days plus one quiz day", so the
two models line up and `unitDays()` reproduces the workbook total exactly once the numbers
are corrected. Course total goes from 111 to 143.

Two renderer fixes ride along, both forced by the corrected numbers rather than chosen:

- `frqDays` becomes 0 for every unit, because the workbook folds FRQ practice into the AP
  review block and assigns no separate unit review day. The chip row now skips a zero-day
  entry instead of rendering "0d".
- `planText` had a three-or-more branch that printed Day 1, Day 2 and then jumped to the
  last day. It previously caught two lessons; with real day counts it catches seventeen, so
  an eight-day lesson would have silently skipped five days. The middle is now a range.

Assertions cover all of it, including that the UNITS array still evaluates as valid JS, that
lesson identity/materials/links are untouched, that the two renderer blocks are the only
change outside the array, and that the rendered plan text names every day of every lesson
with no gap.

## Reserved days

The Notes sheet flags that Unit 2, 4, and 5 projects and the Semester 1 Final are reserved
days rather than delivered material, and that the Units 1 and 3 projects are live. That
matches the store: `ap-cyber-unit-1-project` and `ap-cyber-unit-3-project` exist and are
published, and no project page exists for units 2, 4, or 5. Any view built on this data
should show reserved days as reserved, not as links.
