# Exercise reporter contract (cyber and CSP)

What an exercise page must send so its grade reaches the teacher gradebook with
its **own** point total, rather than a constant guessed per activity type.

## The problem this replaces

Today no cyber exercise page reports a score. `ap-cyber-unit-1-lesson-1-exercise-1`
contains no call to any endpoint. The tracker still marks the activity complete,
so the teacher dashboard receives `completed: true, score: null` and renders it
through:

```js
const pct = d.score == null ? 0 : d.score;          // null becomes a real zero
earned    = Math.round(pct/100 * c.possible);       // possible from a constant
```

with

```js
const POINTS = {'lesson':10,'exercise-1':5,'exercise-2':5,'quiz':10,'exam':25,'case_file':10};
```

Two separate faults. The `0` is fabricated: nothing was graded. The `5` is a
per-activity constant, and exercises genuinely differ. **1.1 Exercise 1 has seven
red flags, so it is out of 7.** No single constant can express that.

Both feed the class average and the points total, so a student who merely opened
two exercises is shown 0/5, 0/5 and a failing average.

## What to send

One POST when the exercise is graded client side.

```
POST https://progress.apcsexamprep.com/api/student/score
Authorization: Bearer <student token>
Content-Type: application/json
```

```json
{
  "course": "ap-cybersecurity",
  "unit": "unit-1",
  "lesson": "1.1",
  "activity_type": "exercise-1",
  "item": "redflags",
  "earned": 5,
  "possible": 7
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `course` | yes | `ap-cybersecurity`, `ap-csp`, `ap-csa` |
| `unit` | yes | `unit-1` |
| `lesson` | yes | `1.1` |
| `activity_type` | yes | `exercise-1`, `exercise-2`, `quiz`, `exam` |
| `item` | no | stable id within the activity; defaults to `item` |
| `earned` | yes | points scored, e.g. red flags found |
| `possible` | yes | the exercise's real total, e.g. `7` |
| `client_event_id` | no | any stable string; makes a double submit idempotent |

**`earned` and `possible` must be sent together.** Half a pair is rejected with a
400 that names the missing field. This is deliberate: the endpoint used to fill
in the missing half, so `possible` alone recorded a confident `0 / 7` and `earned`
alone recorded `5` clamped to `1 / 1`. Once stored, neither is distinguishable
from a real grade. A page that fails to report must look different from a student
who scored zero.

Do not mix families: `earned`/`possible` or `points`/`max_points`, never one of
each.

## Retries and the grade of record

Send every attempt. The server keeps the best result per distinct `item`, so a
retake never drags a score down, and it derives mastery from the class's own
threshold. The page does not need to track attempts or decide what counts.

## Snippet

Hook whatever the exercise already uses to compute its result.

```js
(function () {
  var API = 'https://progress.apcsexamprep.com';

  function reportExercise(earned, possible, opts) {
    var token = localStorage.getItem('apcse_student_token');
    if (!token) return;                       // signed out: nothing to report
    if (earned == null || possible == null) return;   // never send half a pair

    var w = document.querySelector('[data-lesson-id]') || document.body;
    var body = {
      course: opts.course || w.dataset.course,
      unit: opts.unit || w.dataset.unit,
      lesson: opts.lesson || w.dataset.lessonId,
      activity_type: opts.activity || w.dataset.activityType,
      item: opts.item || 'item',
      earned: Number(earned),
      possible: Number(possible),
      client_event_id: [opts.lesson, opts.activity, opts.item, earned, possible].join(':'),
    };

    fetch(API + '/api/student/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(body),
    }).then(function (r) {
      if (!r.ok) return r.json().then(function (e) { console.warn('[apcse] not scored:', e.error); });
    }).catch(function () { /* never block the student on reporting */ });
  }

  window.APCSE = window.APCSE || {};
  window.APCSE.reportExercise = reportExercise;
})();
```

For 1.1 Exercise 1, call it when the last red flag is found or the student
finishes, whichever the page already treats as done:

```js
APCSE.reportExercise(flagsFound, 7, {
  course: 'ap-cybersecurity', unit: 'unit-1',
  lesson: '1.1', activity: 'exercise-1', item: 'redflags',
});
```

Reporting must never block or break the exercise. Signed out, offline, or a 400
should all fail quietly to the student and loudly in the console.

## The dashboard change this depends on

Reporting alone is not enough. The gradebook must stop deriving the denominator
from its constant table and stop treating a null score as zero:

1. Read `points_earned` and `points_possible` from
   `GET /api/teacher/classes/:code/progress`. They are already returned per
   activity, and the page currently references neither.
2. Fall back to the `POINTS` table only when the API returns no pair, so lessons
   and unreported activities keep rendering as they do now.
3. Treat `score == null && completed` as **done, ungraded**. Show a done marker,
   and exclude it from the class average and the points total. It is not a zero.

Until step 3 lands, every unreported exercise still shows a fabricated `0 / 5`
regardless of anything on the API side.

## Verified

`npm run smoke:exercises` drives the real endpoints in process and pins:

- `{earned: 5, possible: 7}` reaches the teacher gradebook as `5 / 7`
- two exercises in the same course carry different denominators without
  interfering
- full marks and a genuine `0 / 7` both survive
- half a pair is refused and records nothing
- a retake keeps the better attempt
