# Phase 2 Server-Side Scoring Contract

The integrity fix: quiz and exam answer keys never ship to the browser. The API
owns the questions and correct answers (`quiz_bank`), scores each submission
server-side, and releases the key subject to a rule. This document is the
contract the **APCSExamPrep-theme** session implements against. The API side (this
repo) is done; the page side is separate work.

Scope of the vertical slice: AP Cybersecurity, one Unit 1 lesson quiz
(`unit-1` / `1.1` / `quiz`), seeded via `scripts/seed-quiz-bank.js`. The path
generalizes to any `(course, unit, lesson, activity_type)` once its questions are
in `quiz_bank`.

## What the theme session must change

1. **Stop shipping keys.** Remove `data-correct` (and any inline answer or
   pre-submit explanation) from the migrated quiz/exam page bodies. The page
   renders prompts and options only; it no longer grades anything itself.
2. **Fetch questions from the API**, render them in the order returned, and keep
   the `order_token` to submit back.
3. **Submit answers to the API** and render the returned score and (when present)
   the per-question key.
4. **Backward compatibility.** A location with no `quiz_bank` rows returns 404 on
   render. A page not yet migrated must keep its existing client-side flow. Do
   not remove `data-correct` from a page until its questions are seeded and the
   page is pointed at these endpoints.

## Endpoints

### GET `/api/quiz/:course/:unit/:lesson/:activity_type`

Public. Optional student `Authorization: Bearer <token>` (the same `apcse_token`
the tracker uses); it changes nothing on render but is harmless to send.

`activity_type` is one of `quiz`, `exam`, `exercise-1`, `exercise-2`. For the
slice: `GET /api/quiz/ap-cybersecurity/unit-1/1.1/quiz`.

Response (no key material of any kind):

```json
{
  "course": "ap-cybersecurity",
  "unit": "unit-1",
  "lesson": "1.1",
  "activity_type": "quiz",
  "order_token": "<signed JWT, opaque to the client>",
  "total": 5,
  "questions": [
    { "qid": "ap-cybersecurity:unit-1:1.1:quiz#1", "prompt": "…", "options": ["…", "…", "…", "…"] }
  ]
}
```

Question order and each question's option order are shuffled server-side per
fetch. Render `questions` in the order given and render each question's `options`
in the order given. The `chosen_index` you submit is the index into the
`options` array **as rendered** (0-based). Treat `order_token` as opaque and echo
it back unchanged; it encodes the shuffle so the server can map positions back to
`qid`s. It expires in 2 hours; on 400 at submit, re-fetch.

**N-of-M randomization.** An activity may be configured to serve only a random
subset of its question pool (for example 3 of 5). When it is, `total` is the
number of questions actually served and `pool` is the full pool size, so
`total < pool`. The subset is chosen server-side and differs from fetch to fetch,
so two loads can contain different questions, not just a different order. Submit
answers only for the `qid`s you were served; the server scores out of the served
set, and `score`/`total` in the response are relative to that subset. `pool` is
informational (for a "3 of 5" label); never assume the full pool.

404 means no server-scored quiz exists for that location. Fall back to the page's
existing behavior.

### POST `/api/quiz/submit`

Public. Optional student `Authorization: Bearer <token>`. Request:

```json
{
  "order_token": "<the token from the matching render>",
  "answers": [
    { "qid": "ap-cybersecurity:unit-1:1.1:quiz#1", "chosen_index": 2 }
  ]
}
```

- `chosen_index` is the 0-based index into the rendered `options` for that `qid`.
- Omit a `qid`, or send a `chosen_index` out of range, to leave it unanswered
  (scored wrong, no crash).
- Send answers only for `qid`s from the matching render. The server scores the
  full authoritative question set regardless; unknown `qid`s are ignored.
- Do not send a score. The server does not trust one. Do not send answer text;
  send indices only (zero-PII rule).

Response:

```json
{
  "score": 4,
  "total": 5,
  "mode": "class",
  "released": false,
  "recorded": true,
  "recognized": true,
  "per_question": [
    { "qid": "…#1", "correct": true },
    { "qid": "…#2", "correct": false, "correct_index": 0, "explanation": "…" }
  ]
}
```

- `correct` is always present.
- `correct_index` and `explanation` appear **only when `released` is true**.
  `correct_index` is the index into the rendered `options` (the shuffled order the
  page showed), so highlighting is direct: no remapping needed.
- `mode`: `self-study` (anonymous public, or a solo `ME-` account) or `class`
  (a signed-in student in a teacher class).
- `released`: `true` in self-study always; in class mode only after the teacher
  releases the key for this activity.
- `recorded`: `true` when the grade was written to the ledger (any signed-in
  student). `false` for anonymous public play.

Status codes to handle:

- `400` invalid or expired `order_token`: re-fetch the quiz and resubmit.
- `403` `{ "locked": true, "score", "total" }`: class mode, already submitted,
  retries not allowed. Show the returned score; do not offer a resubmit.
- `429`: rate limited (40 submits/min per identity). Back off.

## Behavior rules (server-enforced, listed so the page can mirror the UX)

- **Release rule.** Self-study sees the key immediately. Class mode sees
  correct/incorrect booleans only until the teacher releases the key for that
  activity+class (`POST /api/teacher/classes/:code/release`).
- **One attempt in class mode.** A second class-mode submit is `403` unless the
  class has `retry_allowed` or the student has a `retry_override`. Self-study and
  solo accounts have unlimited attempts.
- **Mode is server-derived.** It comes from the JWT, never from the request body.
  There is no `class_code` field to send; a student holding a class code cannot
  self-assign class or self-study mode.
- **Randomization is per fetch.** Two loads of the same quiz differ in order.
  Scoring stays correct because the `order_token` carries the permutation.

## Where grades land

For any signed-in student, a submit writes:

- one `score_events` row per question (item = `qid`, best-per-item rollup),
- a rolled-up 0-100 into `progress.score` for `(student, course, unit, lesson,
  activity_type)`, with `completed = 1`,
- one `quiz_attempts` log row (answers stored as option indices and booleans
  only).

This is the same ledger the existing cyber/CSP `/api/student/score` path feeds,
so the teacher dashboard, CSV export, and student views light up with no read-side
change. Canonical strings: `course` `ap-cybersecurity`, `unit` `unit-N`, `lesson`
`N.M`, `activity_type` `quiz` | `exam` | `exercise-1` | `exercise-2`.

## Seeding real keys

`seed/cyber-quiz-bank.js` holds a representative placeholder quiz. The
authoritative Unit 1 questions currently live in the Shopify page HTML
(`data-correct`) and must be exported into the same shape (one object per
question, stable `qid`, `options`, `correct_index`, `explanation`) and loaded
with `node scripts/seed-quiz-bank.js`. Until a location is seeded, its render
returns 404 and the page keeps its old flow, so migration is page-by-page and
reversible.

## Conventions carried from CLAUDE.md

- Zero PII: option indices and booleans only, never answer text or any
  student-typed string, anywhere in the payload or the ledger.
- No em-dashes in code, comments, or user-facing strings.
- Additive only: existing `/api/student/quiz`, `/api/student/score`, and
  `/api/progress/attempt` are unchanged.
