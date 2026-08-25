# The 107 that was never in anyone's gradebook

2026-08-25, Claude Code. A cyber teacher, Teresa, reported hit-or-miss grades.
`GET /api/admin/denominators?course=ap-cybersecurity` appeared to confirm
something serious:

| Lesson | Activity | Authored | What students reported |
|---|---|---|---|
| 1.1 | exercise-1 | 7 | 107 (94 students), 7 (51), 114 (26), 100 (13) |
| 1.1 | exercise-2 | 8 | 100 (91), 108 (26) |
| 1.2 | lab | 30 | 130 (24), 100 (14), 30 (1) |
| 1.4 | exercise-1 | 25 | 100 (16), 124 (4) |
| 1.5 | exercise-1 | 4 | 100 (5), 124 (2) |

Eighteen columns, and on 1.1 exercise-1 only 51 percent of students reporting
the authored total. It read as a corrupted ledger and a broken score reporter.

**Nothing was corrupted. The gradebook was right the whole time.**

## What it actually is

Two writers legitimately share one `(unit, lesson, activity)` cell:

```
POST /api/student/score      a graded item:            5 out of 7
POST /api/student/progress   the whole-activity percent, on the SAME ledger
                             under a reserved item name, stored as
                             points = 71, max_points = 100
```

Summed, that is 76 out of 107. `scoring.js` has excluded the reserved item since
it was introduced, and the comment there names the number before anyone hit it:

> Folding "83 out of 100" in beside a real item ("5 out of 7") would produce
> 88 out of 107, a number matching nothing a student did.

`lib/admin-denominators.js` did not have that exclusion. Its `OBSERVED_FROM_EVENTS`
query summed every distinct item, so it read the percent carrier as a second
graded item and reported a column the class agrees on as a conflict.

Every observed value is `(sum of the real item maxes) + 100`:

| Observed | Composition |
|---|---|
| 107 | 7 + 100 |
| 108 | 8 + 100 |
| 130 | 30 + 100 |
| 114 | 7 + 7 + 100 (two real items plus the percent) |
| 124 | 24 + 100 |
| 100 | the percent alone; the exercise item never posted |

Reproduced end to end, not inferred:

```
/api/student/score    5/7   -> item "score",        max_points 7
/api/student/progress 71%   -> item "lesson-score", max_points 100

RAW score_events sum, no guard:   76 / 107     the reported number
GUARDED rollup (scoring.js):       5 / 7   71%
TEACHER GRADEBOOK:                 5 / 7   71%  correct
```

## Why this was worth fixing rather than annotating

`POST /api/admin/denominators/adopt` AUTHORS `course_denominators` from these
proposals, and every gradebook reads that table at display time. A dry run
against the unfixed code plans exactly this:

```json
{"lesson":"1.1","activity_type":"exercise-1","possible":107,"reason":"observed mode"}
```

So "adopt the value the data agrees on" would have written 107 as the official
total for a live class and turned a reporting artifact into a real regrade. The
report being wrong was the smaller half of the problem.

## The fix

One clause in `OBSERVED_FROM_EVENTS`, with the item name imported from
`scoring.js` rather than restated, so the two cannot drift:

```sql
WHERE course = ? AND item <> '${LESSON_SCORE_ITEM}'
```

The paragraph already above that query claimed these values were derived
"exactly as the gradebook derives points_possible". That claim was the invariant
all along; the exclusion is what makes it true.

## Evidence

`smoke/denominator-lesson-score.js`, 21 assertions, in CI by its npm script. It
drives three students through both writers on one cell and then asserts, in
order: both rows exist and an unguarded sum really does produce 107; the teacher
gradebook shows 5 out of 7; the coverage view reports one observed value of 7
with no conflict; and a dry run of adopt-proposed never plans a contaminated
total.

Removing the guard fails 5 of those, including the adopt plan. 107 offline
suites pass.

One assertion in the first draft of that suite checked `col.observed`,
`col.values` and `col.distribution`, none of which exist on a column. Every one
of them passed vacuously against the broken code. The real field is
`observed_values`, and the rewritten section asserts against it. A suite that
cannot fail is worse than no suite, and this one could not until it was pointed
at the right names.

## What this cost, and the pattern behind it

Four mechanisms were proposed for this before the real one was found, three of
them by agents reading symptoms rather than running code:

- add twelve `course_manifest` rows. Cyber is deliberately outside the manifest,
  and `smoke/manifest-prune.js` exists because a manifest row no page can report
  marks every student down. This would have made a live classroom worse.
- quizzes and exams are not on a reporting path. They are: the tracker completes
  them from `.check-btn` counts, and the button counts match the authored totals
  exactly (5 per quiz, 20 per exam).
- the denominators sum across events. They do not; `items` stays 1.
- the reporter concatenates or sums with 100. It fits 107, 108 and 130 and fails
  114 and 124, and the real regex produces 710 from that concatenation, not 107.

The one that held was found by reproducing the number locally rather than
reasoning about it. The generalisable rule: a report is not evidence about the
thing it reports on, and a read path that recomputes is not the same as the read
path that displays.

## Still open

- **A reporting view can be wrong in the same direction twice.** `score_rollup_missing`
  in `lib/admin-health.js` flags `p.score IS NULL`, which is exactly what a
  deliberate teacher Reset leaves behind. Since Reset started actually writing on
  2026-08-24 it raises a CRITICAL every time a teacher uses it. Same shape as this
  bug: a health view not applying a guard the production path applies.
- **Students showing 100 alone** have a completion percent and no graded item, so
  the score reporter never fired for them. They still render correctly, against
  the authored denominator, but that is the one genuine gap in the data and it
  is about the reporter firing, not about parsing.
- **Nothing here was checked against Teresa's own class.** Every number above is
  reproduced locally. One contaminated cell read from her real gradebook would
  close that.
