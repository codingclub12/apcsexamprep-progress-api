# Cybersecurity: the last 15 unpriced columns

Measured 2026-08-07. Cyber is the last course with unpriced graded columns:
73 of 88 are priced, 15 are not. This records what each of the 15 actually needs,
because they do not all need the same thing and only one group was a counting
problem.

**Update, same day: 5 of the 15 are now priced.** The case files turned out to
be reachable all along and are seeded out of their real totals. That leaves 10,
and 5 of those 10 should stay unpriced permanently. See section 2, which also
records why the original claim about them was wrong.

## The 15, grouped by what blocks them

| group | columns | blocker | status |
|---|---|---|---|
| case files | `unit-{1..5}/case-file/case-file` | none, the original blocker was misdiagnosed | **priced**, out of 15/14/11/12/11 |
| unit exams | `unit-{1..5}/exam/exam` | key collision fixed, but the pages cannot report a score at all | **stays unpriced on purpose** |
| Unit 1 leftovers | `1.2/exercise-1`, `1.2/exercise-2`, `1.3/exercise-1`, `1.3/exercise-2`, `1.3/quiz` | value unknown, and not resolvable by reading the page | open, needs live data |

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

## 2. The case files: RESOLVED, and the original claim here was wrong

**Superseded 2026-08-07.** All five case files are now priced by
`scripts/seed-cyber-case-file-denominators.js`, out of 15, 14, 11, 12 and 11
respectively, read from each page's own `cfScoreText` element. The reasoning
below is preserved because the error in it is instructive.

### What this section used to claim

That the case file columns "cannot receive data at all", because
`pageFromHandle` returns `null` for every case file handle:

```
ap-cyber-unit-1-case-file-1  ->  null
ap-cyber-unit-3-case-file-3  ->  null
```

That observation is correct. The conclusion drawn from it was not. It assumed
`/track` is the only way a score can arrive, and never checked the pages.

### What the pages actually do

Each of the five case file pages carries a self-contained reporter that skips
`/track` entirely and POSTs straight to the scoring endpoint:

```js
xhr.open('POST', API + '/api/student/progress', true);
xhr.send(JSON.stringify({ course: 'ap-cybersecurity', unit: UNIT,
  lesson: 'case-file', activity_type: 'case-file', completed: true, score: pct }));
```

All five declare their own correct `UNIT`, so nothing is misfiled. The columns
were reachable the whole time, and were sitting in the percent-only bucket being
shown out of a provisional 100 rather than out of real points.

### Why the handles are still unmapped, deliberately

Mapping them now would be a regression, not a completion. `/track` sets
`completed = 1` on a bare page view, so a student who opened a case file and
walked away would be marked complete with no score. `/track` already excludes
`quiz` and `exam` for exactly this reason, and a case file is the same shape:
its own flow reports it. `smoke/cyber-case-files.js` asserts the `null` return
so it is not "fixed" later by someone reading it as an oversight.

### Why the exams are not resolved the same way

The same scan run against the five exam pages finds no `fetch`, no
`XMLHttpRequest`, no `sendBeacon` and no token read: they cannot report a score
by any path. So they stay unpriced. Pricing a column that cannot be earned is
strictly harmful: an unattempted item never enters `earned` or `graded`, so the
grade is safe, but `possible` and `items_total` both grow, and **pace** silently
reports every student as further behind than they are.

That scan was run **with controls this time**, which is the specific thing the
earlier wrong claim in section 4 lacked. Two known-good pages of different
shapes were included and both were correctly detected: the fetch-based
`ap-cyber-unit-1-lesson-1-exercise-1`, and the XHR-based case files. A detector
that finds both shapes and still returns zero on all five exam pages is
distinguishing, not merely failing.

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

Two of the three items that used to be here are now answered. What is left:

1. **Ask the data, not the page**, for the 5 Unit 1 leftovers.
   `GET /api/admin/denominators?course=ap-cybersecurity` proposes a value for
   every unpriced column from what students actually submitted, and reports how
   strongly the class data agrees. That engine was built for exactly this and
   needs live access. Adopt what it proposes with
   `POST /api/admin/denominators/adopt`; it refuses ambiguous columns unless told
   otherwise.
2. **Fix the exam pages before pricing the exams.** The blocker is no longer a
   missing number, it is that the pages have no reporter. Until one ships, the
   right state for those five columns is exactly what they are now: rendered,
   unpriced, contributing nothing to any grade. The question counts below are
   ready to author into `course_unit_denominators` the day a reporter lands.

### Answered, kept for the record

- ~~Confirm the exams record scores.~~ They do not. Section 2 has the scan and
  the controls it was run with.
- ~~Decide on the case-file handles.~~ Leave them unmapped, and price the
  columns anyway. Section 2 explains why those two are not in tension: the
  scores arrive by the page's own reporter, not by `/track`.

### Exam question counts, for step 2

Counted from the pages, corroborated across several independent signals per page
(`ANSWERS` entries, distinct radio group names, a `totalQuestions` literal, a
rendered `out of 20`, and `Q1..Qn` labels). Recorded here as evidence, not
seeded, and **not ready to seed** until the pages can report:

| unit | questions | signals that agreed |
|---|---|---|
| unit-1 | 20 | ANSWERS 20, radio groups 20, `out of 20`, 20 Q labels |
| unit-2 | 20 | ANSWERS 20, radio groups 20, `out of 20`, 20 Q labels |
| unit-3 | 20 | 20 Q labels (this page has no answer key and no radio inputs) |
| unit-4 | 20 | radio groups 20, `totalQuestions = 20`, `out of 20` |
| unit-5 | 20 | radio groups 20, `totalQuestions = 20`, `out of 20` |

Unit 3's page is the weakest evidence of the five: a single signal, on a page
whose markup differs from the rest. Confirm it before authoring.
