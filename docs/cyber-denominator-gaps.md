# Cybersecurity: the last 15 unpriced columns

Measured 2026-08-07. Cyber is the last course with unpriced graded columns:
73 of 88 are priced, 15 are not. This records what each of the 15 actually needs,
because they do not all need the same thing and only one group was a counting
problem.

## The 15, grouped by what blocks them

| group | columns | blocker |
|---|---|---|
| unit exams | `unit-{1..5}/exam/exam` | key collision, now fixed |
| case files | `unit-{1..5}/case-file/case-file` | the page handle does not map, so no data can ever arrive |
| Unit 1 leftovers | `1.2/exercise-1`, `1.2/exercise-2`, `1.3/exercise-1`, `1.3/exercise-2`, `1.3/quiz` | value unknown, and not resolvable by reading the page |

## 1. The exams: a key collision, not a missing value

`course_denominators` is keyed `(course, lesson, activity_type)`, with the unit
outside the key. That is correct while a lesson id names exactly one lesson,
which holds for every numbered lesson in every course. It breaks for the Cyber
pseudo-lessons: the `COURSES` config gives all five units a case file at lesson
`case-file` and an exam at lesson `exam`, so ten distinct gradebook columns
collapse onto two rows.

Nobody forgot to author these. The second row is **rejected**:

```
UNIQUE constraint failed: course_denominators.course,
course_denominators.lesson, course_denominators.activity_type
```

Ten of the fifteen were structurally unpriceable, and would have stayed that way
however carefully anyone counted the pages.

The read path had the matching bug: `lib/gradebook-contract.js` keyed its
manifest lookup by `(lesson, activity)` too, so all five units' exams read
whichever manifest row was scanned last.

Both are fixed. `course_unit_denominators` is keyed
`(course, unit, lesson, activity_type)`, the contract reads most-specific-first
(unit-scoped, then manifest, then `course_denominators`), and the manifest key is
now unit-aware. `smoke:unitdenoms` pins all of it, including that a numbered
lesson still reads exactly as before.

**The table ships empty.** It is a mechanism, not a set of values. See below.

## 2. The case files cannot receive data at all

`pageFromHandle` returns `null` for every case file handle:

```
ap-cyber-unit-1-case-file-1  ->  null
ap-cyber-unit-3-case-file-3  ->  null
```

The Cyber rules match `ap-cyber-unit-{N}-exam` and
`ap-cyber-unit-{N}-lesson-{M}`. A case-file handle matches neither, so `/track`
no-ops and nothing is ever recorded. Meanwhile the `COURSES` config declares a
case file for all five units, so the gradebook renders five columns that can
never be attempted.

Pricing them would make it worse, not better. An unattempted item never enters
`earned` or `graded`, so the grade is safe, but `possible` and `items_total` both
grow, so **pace** silently reports every student as further behind than they are.

The fix is a handle mapping, not a denominator. That is a change to what gets
recorded, so it belongs in a deliberate change with the course owner rather than
folded into a denominator pass.

## 3. The Unit 1 leftovers cannot be settled by reading the page

This is where the CSP method stops working, and the reason is worth writing down.

CSP was easy because every graded item is one
`<div class="mcq-item" data-activity="..." data-item="q{n}">`. Counting them is
counting the thing the reporter posts. Cyber has no such marker. Its pages state
a total in whatever shape each page was written in: an `ANSWERS` array, an
`ANSWERS` object, a `foundCount` compared against a literal, a rendered
`/ 7`, or nothing at all.

A first pass here looked for tracker hooks (`APCS_saveQuizScore`,
`APCS_saveLessonScore`) and found none on any of the five, which looked like
proof that the pages cannot report. **That inference was wrong.** Running the
same check against `ap-cyber-unit-1-lesson-1-exercise-1`, a column that is
already seeded and working, returns exactly the same empty result. A
known-good page and a suspect page are indistinguishable under that test, so it
proves nothing either way.

What the pages do show, for the record:

| column | evidence found |
|---|---|
| `1.2/exercise-1` | no answer key, `out of` candidates 3 and 24 |
| `1.2/exercise-2` | no answer key, candidates 3, 30 and 10 |
| `1.3/exercise-1` | no answer key, candidates 3 and 24; a second page claims the same column |
| `1.3/exercise-2` | no answer key, candidates 3 and 24 |
| `1.3/quiz` | `ANSWERS` has 5 entries |

Only `1.3/quiz` has a value the page states unambiguously. The four exercises do
not, which is the same conclusion `scripts/seed-cyber-denominators.js` reached
when it left twenty Unit 1 activities deliberately absent.

`1.3/exercise-1` also has two pages claiming it, and the topic-named one is
titled "Topic 1.4", so its content and its handle disagree about which lesson it
belongs to.

## What to do next, in order

1. **Ask the data, not the page.** `GET /api/admin/denominators?course=ap-cybersecurity`
   proposes a value for every unpriced column from what students actually
   submitted, and reports how strongly the class data agrees. That engine was
   built for exactly this and needs live access. Adopt what it proposes with
   `POST /api/admin/denominators/adopt`; it refuses ambiguous columns unless told
   otherwise.
2. **Confirm the exams record scores** before pricing them. One query settles it:
   any `score_events` or `progress` row for `ap-cybersecurity` with
   `lesson = 'exam'` and a non-null score. If yes, the page counts below are
   ready to author into `course_unit_denominators`. If no, pricing them distorts
   pace exactly as the case files would.
3. **Decide on the case-file handles.** Either map them in `pageFromHandle` so
   the columns can be earned, or drop the columns from the `COURSES` config so
   they stop appearing. Leaving them as permanently blank priced columns is the
   one option that is worse than both.

### Exam question counts, for step 2

Counted from the pages, corroborated across several independent signals per page
(`ANSWERS` entries, distinct radio group names, a `totalQuestions` literal, a
rendered `out of 20`, and `Q1..Qn` labels). Recorded here as evidence, not
seeded:

| unit | questions | signals that agreed |
|---|---|---|
| unit-1 | 20 | ANSWERS 20, radio groups 20, `out of 20`, 20 Q labels |
| unit-2 | 20 | ANSWERS 20, radio groups 20, `out of 20`, 20 Q labels |
| unit-3 | 20 | 20 Q labels (this page has no answer key and no radio inputs) |
| unit-4 | 20 | radio groups 20, `totalQuestions = 20`, `out of 20` |
| unit-5 | 20 | radio groups 20, `totalQuestions = 20`, `out of 20` |

Unit 3's page is the weakest evidence of the five: a single signal, on a page
whose markup differs from the rest. Confirm it before authoring.
