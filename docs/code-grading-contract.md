# Server-side code grading contract

The integrity fix for AP CSA code exercises. A client-reported verdict is
forgeable, and for code, comparing against the visible expected output dies to a
hardcoded `System.out.println("expected text")`. The fix is the same one applied
to the quizzes: the correct answers (here, a bank of test cases) live server-side
and never ship to the browser. The server runs the student's source through the
existing Judge0 proxy, scores against hidden cases, and stores only the verdict.

This is on **System B** (`score_events` rolled up into `progress.score`), the same
ledger the Cyber and CSP grade paths use, so the teacher dashboard and CSV export
pick up code grades with no read-side change.

## POST /api/student/code-grade

Student JWT required (`Authorization: Bearer <apcse_token>`).

Request:

```json
{
  "course": "ap-csa",
  "unit": "unit-1",
  "lesson": "1.1",
  "item": "exercise-1",
  "language": "java",
  "source": "public class Main { ... }",
  "client_event_id": "optional-idempotency-key"
}
```

- `item` is the graded code item, which is also its `activity_type`: `exercise-1`
  (the code exercise), `exercise-2`, or `frq`.
- `language` is `java` | `python` | `javascript` (or the Judge0 ids `62` | `71` |
  `63`). Anything else is `400`.
- `source` is graded in transit and then DISCARDED. It is never stored. Only the
  verdict (pass counts) and the derived points are written.
- `client_event_id` is optional; a repeat returns the stored verdict without
  re-running Judge0.

Response:

```json
{
  "passed": 1,
  "total": 4,
  "points_earned": 2.5,
  "points_possible": 10,
  "failing_case_summary": {
    "cases_failed": 3,
    "cases_total": 4,
    "message": "3 of 4 test cases failed. Some tests use hidden inputs, ..."
  },
  "score_pct": 25
}
```

- `passed` / `total` are test cases, not a boolean.
- `points_earned` = `passed / total` scaled to the item's manifest points
  (`course_denominators.possible` for that `course` + `lesson` + `activity_type`).
- `failing_case_summary` is a SUMMARY, never a test case. A hidden case's stdin or
  expected output is never returned, so the summary cannot become an answer key.
  It is `null` when every case passed.

Status codes:

- `400` bad language, missing fields, or (rare) no manifest points for the item.
- `404` no test bank for this location; the page keeps its existing behavior.
- `429` too many grade attempts for this item; back off.
- `502` / `503` code runner temporarily unavailable; the attempt was NOT graded,
  so retry (no zero is recorded for an infrastructure failure).

## How grading works

1. Load the hidden test cases for `(course, lesson, item)` from `code_test_cases`.
   No cases means the location is not server-graded (`404`).
2. Run the source against each case's stdin through `POST /api/judge0/run` (the
   existing proxy, never Judge0 directly). A case passes when the run is Accepted
   and its stdout matches the expected output after whitespace normalization.
3. Score `passed / total`, scale to the item's manifest points, write one
   `score_events` row (verdict only, no source), and roll it up into
   `progress.score` best-per-item.

Judge0 is the expensive call, so the route rate-limits per student per item, and
the internal proxy call carries the student id in `X-Forwarded-For` so the proxy's
own per-identity hourly limiter partitions by student.

## Test bank

`code_test_cases` is keyed `(course, lesson, item, seq)` and holds `stdin`,
`expected_stdout`, and a `hidden` flag. Author content only; zero student PII.
Every item needs at least three cases and at least one hidden, enforced by the
loader, so a hardcoded output cannot pass. Seed data lives in
`seed/csa-code-tests.js`; load it with `node scripts/seed-code-tests.js`
(insert-or-ignore) or `--update`. Like the quiz bank, it is NOT seeded on boot, so
a fresh deploy grades nothing until the authoritative cases are loaded.

## Proof

`smoke/code-grade.js` boots the app and stubs only the external RapidAPI call. It
proves a hardcoded `System.out.println` of the visible expected output passes only
the visible case and fails the hidden ones, a correct program passes all cases,
and the student source is never persisted. Run with `npm run smoke:codegrade`.
