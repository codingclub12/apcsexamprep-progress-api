# The canonical gradebook contract

One shape for every course. Read this before adding a course, an activity type, or a
gradebook view.

## Why it exists

There was no canonical contract, so each course invented its own. Measured across the
four live courses, the lesson id shape, the activity vocabulary, the denominator
coverage and even the meaning of the overall percentage all differed. Fixing one
course could not fix the others because they did not share a shape, so every fix had
to be per-course. That was the actual defect, and it is the thing this replaces.

## The three layers. Do not merge them.

```
  per-course manifest  ->  normalizer  ->  ONE contract  ->  views / exports
   (course specific)      (this layer)     (course free)        (one)
```

1. **Manifest** stays per-course. CSA has `cfu`, cyber has `lab` and `case-file`, CSP
   names its lessons with slugs. That is content, not schema.
2. **Normalizer** (`lib/gradebook-contract.js`) is the ONLY place course-specific
   shape is interpreted.
3. **Contract** is identical for every course.

If a view has to ask whether a course has `cfu` or `lab`, the normalizer has failed,
and that is where the fix belongs. Not in the view.

## Canonical activity vocabulary

Every native activity type normalizes into exactly one of:

```
lesson | practice | exercise | lab | quiz | exam | project
```

| native | canonical | ordinal |
|---|---|---|
| `lesson`, `visit`, `page`, `read` | `lesson` | |
| `cfu`, `code`, `game` | `practice` | |
| `exercise-1` / `-2` / `-3` | `exercise` | 1 / 2 / 3 |
| `lab` | `lab` | |
| `quiz` | `quiz` | |
| `exam` | `exam` | |
| `case-file` | `project` | |
| `project` | `project` | |

`native_activity` is always carried alongside, so nothing is lost and a course can
rename its own vocabulary without a downstream change. An unrecognised type is
treated as practice (the forgiving side of the line, matching `retry-policy.js`) and
reported in `integrity.unmapped_activities` so the map is extended deliberately
rather than by accident.

## Canonical item

```jsonc
{
  "item_key":        "unit-1/1.2/quiz",  // stable, unique, course-agnostic
  "unit":            "unit-1",
  "lesson_ref":      "1.2",              // display label; a slug for CSP
  "lesson_seq":      2,                  // integer ordering, REQUIRED, every course
  "activity":        "quiz",             // canonical vocabulary
  "native_activity": "quiz",             // what the course actually calls it
  "activity_ordinal": null,              // 1/2/3 for exercise-1/2/3
  "possible":        5,                  // null only when nobody authored one
  "possible_source": "authored",         // 'manifest' | 'authored' | null
  "graded":          true,
  "expected": true, "observed": true, "in_manifest": false
}
```

`item_key` is `unit/lesson_ref/native_activity`. The native name is in the key
because `exercise-1` and `exercise-2` both normalize to `exercise` and must not
collide.

### lesson_seq is mandatory

It is what lets CSP be ordered at all: its lesson ids are slugs
(`collaboration`, `binary-numbers`) and can never be ordered by their own names.
Three tiers, authored order always winning:

| range | source |
|---|---|
| `0..899` | position in the course config's lesson array |
| `900, 901` | the unit's case file and exam, authored to sit after its lessons |
| `1000+` | first appearance in `course_manifest`, for a lesson the config does not list (AP Networking's `test` is one) |
| `2000+` | observed only: real student work against a lesson neither the config nor the manifest knows |

A lesson always lands where its author put it, never alphabetically and never last
just because its id is not a number.

## Canonical student rollup

Three denominators. **Do not collapse them.**

| field | definition |
|---|---|
| `earned` | sum of `item.earned` over **attempted** items |
| `graded` | sum of `item.possible` over **attempted** items |
| `possible` | sum of `possible` over **all** graded items in the course |
| `pct` | `earned / graded`. **Never** `earned / possible`. |

A student who has finished 3 of 106 items perfectly is at 100 percent, not 3 percent.
The grade measures performance on work attempted. How much of the course has been
reached is **pace** (`items_graded / items_total`), reported separately in its own
`pace` block. Conflating them makes both numbers useless to a teacher.

Rules:

- `pct` is `null` when nothing has been attempted. Never `0`. A student who has not
  started is ungraded, not failing.
- Unattempted items never enter `earned` or `graded`, and a missing score is never
  coerced to 0.
- Not attempted and scored zero are different facts. An unattempted item has **no
  entry at all** in the student's `items` map, so a view renders blank; a scored zero
  has an entry with `earned: 0`.
- There is no `basis` field. It only ever named which broken path produced a number.

## Ingest precedence

Three writers feed a gradebook and they used to disagree. The rule is explicit:

| | source | what it carries |
|---|---|---|
| A | `attempts` | grade of record per item, retry-policy aware |
| B | `score_events` | real points per item, excluding `lesson-score` |
| C | `progress.score` | the derived percent, reset aware |

The highest available source wins per `(student, lesson, native_activity)`. A lower
source may still supply completion when the winner carries no score.

`lesson-score` rows are excluded from B on purpose. They are a synthetic carrier for
a percent posted to `/api/student/progress` (points = the percent, `max_points` =
100), not a graded item, and summing them into a points total inflates the
denominator by 100 per submission. `scoring.js` excludes them from the same rollup.

## Denominators, and what happens when one is missing

Priority: `course_manifest` sum, then `course_denominators`, then observed.

An authored denominator counts items the student has not reached, so 2 of 8 CFUs
reads `2/8`, not `2/2`. An observed denominator is whatever happened to be recorded,
which is why a student served 5 of a 6 point quiz used to read `/5`.

**A graded column with no authored denominator is a data integrity failure, not a
footnote.** It is reported in full in `integrity.missing_denominators` and rendered as
a blocking banner on `/admin/gradebook`, never as a quiet summary number.

Nothing is lost to the gap:

- A column priced only by observation still counts, and is listed as missing so it
  gets authored.
- A grade that exists only as a percent, with no denominator to price it against, keeps
  its cell and is counted in `overall.items_percent_only` and
  `integrity.percent_only_items`. It is excluded from the points total rather than
  folded in at a guessed weight, because a wrong weight silently corrupts every other
  student's standing in the class.

Scores that disappear look clean and are worse than scores that are wrong. That is why
nothing is ever dropped silently.

## Endpoints

| route | who | notes |
|---|---|---|
| `GET /api/teacher/classes/:code/gradebook` | teacher | own class only, ownership enforced by `class_code + teacher_id`; real names |
| `GET /api/admin/class/:id/gradebook/as-teacher` | admin | **the same builder, the same arguments, the same document**; anonymized unless `?reveal=1` |
| `/admin/gradebook` | admin | the page, behind the same session cookie gate as every other admin page |

The admin route is not a reimplementation of the teacher view. It calls
`buildCanonicalGradebook` exactly as the teacher route does, so the two cannot drift
and "is the teacher seeing what I am seeing" is not a question anyone has to answer by
eye. `smoke/gradebook-contract.js` test 12 asserts the two documents are byte
identical.

Solo system classes carry `course = 'solo'`, so pass `?course=` to choose which course
to render. Default `ap-csa`.

## Adding a course

1. Add it to `COURSES` in `utils.js`: units in curriculum order, lessons in curriculum
   order inside each unit, and the activities each unit actually has. That array order
   IS the `lesson_seq`, so getting it right is the whole job.
2. Seed `course_manifest` rows, or `course_denominators` rows, so every graded column
   has an authored `possible`.
3. If it uses an activity name not in the table above, add it to `ACTIVITY_MAP` in
   `lib/gradebook-contract.js`. That is the only code change a new course should ever
   need.

There is no step 4. No view, export, or rollup should need touching, and if one does,
the normalizer is missing something.

## What is deliberately NOT here

- Per-item scoring is unchanged. Item data was already correct; the rollup was wrong.
- `POST /api/student/progress` and `POST /api/progress/attempt` payloads are unchanged.
  Hundreds of live pages post to them and cannot be redeployed in lockstep.
- No score row is deleted or rewritten. This is a read-path normalization, so it can
  be reverted by reverting the code.
- `GET /api/teacher/classes/:code/progress`, the existing admin gradebook, and the CSV
  exports are untouched and still serve their current callers.
