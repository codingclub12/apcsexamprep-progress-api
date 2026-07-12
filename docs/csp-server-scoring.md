# CSP server-side scoring + manifest seed

Implements the integrity fix from `API-SESSION-CSP-Scoring-HANDOFF.md`: ap-csp
quizzes and unit tests are scored on the server against a canonical answer bank,
and course denominators are seeded from a server-owned manifest. The correct
answer is never trusted from the client.

## What landed

### 1. Manifest (`activity_manifest` table)

Per-activity denominators for ap-csp, keyed by
`(course, unit, lesson, activity_type)` with `item_count`. Seeded from
`data/csp-course-manifest-FULL.json` (130 rows: 35 lessons x
{lesson, quiz, exercise-*} plus 7 unit tests) by
`scripts/seed-activity-manifest.js`, which runs insert-or-ignore on boot.

This is a SEPARATE table from `course_manifest`. `course_manifest` is per-item
(PK `course, item_id`) and is the CSA `/api/progress/attempt` authority read by
`routes/admin.js`, `routes/teacher.js`, and `routes/student.js` `/attempts`. The
ap-csp `/api/student/score` path is per-activity and needs "earned out of
item_count" denominators, so it gets its own table rather than reshaping one four
other routes depend on. Both are "the manifest" for their respective courses.

Push edits with `node scripts/seed-activity-manifest.js --update`.

### 2. Answer bank (`answer_bank` table)

Server-only correct letters, keyed by `(course, unit, lesson, item)` with
`correct` (A-D) and `rationale`. The correct letter leaves the server ONLY in a
per-submission scoring response; there is no list/dump endpoint. Seeded from
`data/csp-answer-bank-FULL.json` (294 records) by `scripts/seed-answer-bank.js`.

Like `scripts/seed-quiz-bank.js`, this is NOT run on boot: a fresh deploy stays
empty so every quiz/exam not yet seeded keeps its existing flow, and no keys land
in production by accident. Run by hand:

```
node scripts/seed-answer-bank.js            insert-or-ignore (safe, additive)
node scripts/seed-answer-bank.js --update   also overwrite existing items
```

### 3. Scoring on `POST /api/student/score`

For `activity_type` `quiz` or `exam`, when the location has seeded keys:

- `choice` is validated to `A`-`D` (anything else is ignored, nothing recorded).
- The key is looked up; `is_correct = choice === correct`; `points = 1|0`.
- One `score_events` row is appended (option INDEX and boolean only, zero PII).
- The rollup is best-per-item; `possible` comes from `activity_manifest.item_count`
  so re-answers and re-runs never inflate the denominator.
- Response: `{ is_correct, correct, rationale, item, rollup }`.

Unknown item inside a seeded activity stores 0 and returns a `warning` (a typo'd
id does not crash or silently zero everyone). A location with no seeded keys falls
through to the legacy client-reported path, so un-migrated pages are untouched.
`exercise-1` / `exercise-2` and `cfu` / `lesson` stay client-reported.

## Status / open item

The manifest is seeded and the scoring path is code-complete and tested end-to-end
against a synthetic bank (correct -> 1 point + rationale; wrong -> 0; re-answer
keeps best-per-item without doubling the denominator; exam scored the same way;
idempotency; unknown-item -> 0; un-seeded fall-through).

`data/csp-answer-bank-FULL.json` (the 294 real keys) was NOT present in the
`apcsexamprep-course-data/` Drive folder at implementation time; only the manifest
and the handoff doc were there. Drop that file into `data/` and run
`node scripts/seed-answer-bank.js` to activate scoring for every seeded location.
Verify with: 294 bank rows loaded, a known-correct `bi-1/collaboration/q1` choice
returns `is_correct: true` + rationale, and a re-answer does not double the
denominator.
