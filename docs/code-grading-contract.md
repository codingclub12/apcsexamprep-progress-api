# Server-side code grading contract

The integrity fix for AP CSA code exercises. A client-reported verdict is
forgeable, and for code, comparing against the visible expected output dies to a
hardcoded `System.out.println("expected text")`. The fix is the same one applied
to the quizzes: the correct answers (here, a bank of test cases) live server-side
and never ship to the browser. The server runs the student's code through the
existing Judge0 proxy, scores against hidden cases, and stores only the verdict.

This is on **System B** (`score_events` rolled up into `progress.score`), the same
ledger the Cyber and CSP grade paths use, so the teacher dashboard and CSV export
pick up code grades with no read-side change.

## Three submission shapes, and which one an item uses

`code_test_cases.mode` says how a submission becomes the file Judge0 compiles.
An empty value is `segment`, so every case written before the column existed
assembles byte for byte as it always did. The assembler is
`lib/csa-code-modes.js` and it is shared with the verifier, so what CI proves and
what students are graded by cannot drift apart.

| mode | student submits | inputs arrive as |
|---|---|---|
| `segment` | a bare code segment (AP style) | the case's `prelude` |
| `program` | a complete program with `class Main` | the case's `stdin` |
| `driver` | class definitions and NO main | `stdin`, read by a hidden harness |

The mode belongs to the ITEM, not to a case: an item whose cases disagreed would
assemble the same submission two different ways and its pass count would mean
nothing. The seeder refuses such an item and the grade route answers `500` rather
than scoring it.

`program` and `driver` are what the 53 CSA exercise pages use, and
`docs/csa-exercise-pages.md` covers them in full, including why a segment cannot
express Unit 3 at all and what the assembler does about Judge0 compiling every
submission to `Main.java`. The rest of this document describes `segment`, which
is unchanged.

## Model: bare segment + prelude injection

The student submits a **bare code segment** (AP style), not a full class. Each
test case injects its inputs as a **`prelude`** (Java prepended before the
segment, e.g. `int a = 17; int b = 5;`) and an optional **`postlude`** (appended
after). The grader wraps `prelude + segment + postlude` in a `class Main { main }`,
compiles, runs, and compares stdout to the expected output.

Injecting inputs as a prelude (rather than reading `stdin`) is what makes the
hardcoding defense work AND keeps it usable on every lesson: hidden cases set
variable values the page never shows, so a printed constant fails them, and no
`Scanner` is required (so it fits lessons before input is taught). `stdin` is still
supported as an optional per-case field for any Scanner-style item.

## POST /api/student/code-grade

Student JWT required (`Authorization: Bearer <apcse_token>`).

Request:

```json
{
  "course": "ap-csa",
  "unit": "unit-1",
  "lesson": "1.3",
  "item": "exercise-1",
  "language": "java",
  "source": "System.out.println(a + b);",
  "client_event_id": "optional-idempotency-key"
}
```

- `item` is the graded code item, which is also its `activity_type`: `exercise-1`
  (the code exercise) or `exercise-3` (the FRQ).
- `source` is the **bare segment** (no class, no `main`); the grader wraps it.
- `language` is `java` | `python` | `javascript` (or the Judge0 ids `62` | `71` |
  `63`). Anything else is `400`. The pilot content is Java; the class-wrap applies
  to Java.
- `source` is graded in transit and then DISCARDED. It is never stored. Only the
  verdict (pass counts) and the derived points are written.
- `client_event_id` is optional; a repeat returns the stored verdict without
  re-running Judge0.

Response:

```json
{
  "passed": 1,
  "total": 5,
  "points_earned": 0.2,
  "points_possible": 1,
  "failing_case_summary": {
    "cases_failed": 4,
    "cases_total": 5,
    "message": "4 of 5 test cases failed. Some tests use hidden inputs, ..."
  },
  "score_pct": 20
}
```

- `passed` / `total` are test cases, not a boolean.
- `points_earned` = `passed / total` scaled to the item's manifest points
  (`course_denominators.possible` for that `course` + `lesson` + `activity_type`;
  `exercise-1` = 1, `exercise-3` = 4).
- `failing_case_summary` is a SUMMARY, never a test case. A hidden case's prelude or
  expected output is never returned, so the summary cannot become an answer key.
  It is `null` when every case passed.

Status codes:

- `400` bad language, missing fields, (rare) no manifest points for the item, or a
  submission whose SHAPE cannot be graded in this item's mode. The last case
  carries `not_graded: true` and a sentence written for the student (a `program`
  submission with no `Main`, a `driver` submission that declares one). It is
  answered before any Judge0 call is spent, because Judge0 would report a missing
  `Main` as "Could not find or load main class Main", which teaches nothing.
- `404` no test bank for this location; the page keeps its existing behavior.
- `429` too many grade attempts for this item; back off.
- `502` / `503` code runner temporarily unavailable; the attempt was NOT graded,
  so retry (no zero is recorded for an infrastructure failure).

## How grading works

1. Load the hidden test cases for `(course, lesson, item)` from `code_test_cases`.
   No cases means the location is not server-graded (`404`).
2. For each case, assemble `prelude + segment + postlude`, wrap it in a class, and
   run it through `POST /api/judge0/run` (the existing proxy, never Judge0
   directly). A case passes when the run is Accepted and its stdout matches the
   expected output after whitespace normalization.
3. Score `passed / total`, scale to the item's manifest points, write one
   `score_events` row (verdict only, no source), and roll it up into
   `progress.score` best-per-item.

Judge0 is the expensive call, so the route rate-limits per student per item, and
the internal proxy call carries the student id in `X-Forwarded-For` so the proxy's
own per-identity hourly limiter partitions by student.

## Test bank

`code_test_cases` is keyed `(course, lesson, item, seq)` and holds `prelude`,
`postlude`, `stdin` (optional), `mode`, `expected_stdout`, and a `hidden` flag.
Author content only; zero student PII. Every item needs at least three cases and at
least one hidden, enforced by the loader, so a hardcoded output cannot pass. Seed
data lives in `seed/csa-code-tests.js` (the segment bank) and
`seed/csa-exercises/` (the 53 exercise pages); load both with
`node scripts/seed-code-tests.js` (insert-or-ignore) or `--update`. Like the quiz
bank, it is NOT seeded on boot, so a fresh deploy grades nothing until the
authoritative cases are loaded.

`--update` also PRUNES any case left over past an item's current case count.
Without that, shrinking an item from five cases to four, or changing its mode,
leaves a stale row at the old `seq` and the item then holds cases assembled two
different ways.

## Page-side requirements (theme project)

For the pilot lessons, the editor page must: pose an input-reading task, submit the
student's **bare segment** as `source`, and post to `/api/student/code-grade` with
`item = 'exercise-1'` (or `'exercise-3'` for the FRQ) instead of grading in the
browser against an on-page expected value. The per-item I/O contract (what the
prelude declares, what to print) is documented alongside the cases in
`seed/csa-code-tests.js`.

## Proof

`smoke/code-grade.js` boots the app and stands a local `javac`/`java` in for the
external Judge0 call. It proves a hardcoded print of the visible expected output
passes only the visible case and fails the hidden ones, a correct segment passes
all cases, the grade rolls up to `progress.score`, and the student source is never
persisted. Run with `npm run smoke:codegrade` (requires a local Java toolchain).
```
