# CSP Reporter Contract

Implementation spec for the ap-csp graded-item reporter. This document lives in
the API repo (apcsexamprep-progress-api) because the API owns the endpoint and
key strings, but the file it describes is built and owned by the
**APCSExamPrep-theme** Claude Code session per the file-ownership rule in
CLAUDE.md. This is the contract the theme-repo session implements against; it is
not the implementation.

Scope: ap-csp only. Do not reuse the CSA reporter (`shopify/apcs-reporter.js`),
which is bound to the `.apcs-ex` widget system and the manifest-gated
`POST /api/progress/attempt` path. CSP grades through `POST /api/student/score`,
which is course-agnostic and has no manifest gate.

## 1. Endpoint

`POST /api/student/score`

Auth: student JWT in the `Authorization: Bearer <token>` header. The token is
the same `apcse_token` value in `localStorage` that `apcs-tracker.js` reads. No
token means no post (stay silent, exactly like the tracker).

Handler reference: `routes/student.js`, the `POST /score` route and its
`rollupScore` helper. Every claim below is taken from that handler as it stands
today; if the handler changes, this doc is the thing to update.

### 1a. Server-side scoring for quiz and exam (integrity fix)

`quiz` and `exam` activities are now scored on the SERVER, not the client. The
correct answer lives in the server-only `answer_bank` table and never ships to the
page, so it cannot be trusted from the browser. For these two activity types the
reporter sends a `choice` letter (`A`-`D`) and NO `correct`/`points` field; the
server looks up the key, computes correctness, and returns it in the response.

This engages only once an activity's keys are seeded (`scripts/seed-answer-bank.js`).
An un-seeded quiz/exam location falls through to the legacy client-reported path
below, so nothing breaks before seeding. All other activity types (`lesson`,
`cfu`, `exercise-1`, `exercise-2`) stay client-reported exactly as described below.

Quiz/exam request body:

```json
{ "course": "ap-csp", "unit": "bi-1", "lesson": "collaboration",
  "activity_type": "quiz", "item": "q1", "choice": "B",
  "client_event_id": "..." }
```

- `choice` is the selected option letter `A`-`D`. Untrusted: anything else is
  ignored (`tracked: false`), nothing is recorded.
- `item` is `q1`..`q6` for a lesson quiz, `e1`..`eN` for a unit test.
- Scoring response adds `is_correct` (boolean), `correct` (the correct letter),
  and `rationale`. Percent uses the `activity_manifest` denominator (item_count),
  so a quiz shows out of its full question count, not just questions answered.
- Best-per-item and idempotency work the same as the client-reported path: a
  re-answer keeps the higher result and never inflates the denominator.

## 2. Accepted request body (client-reported path: cfu / lesson / exercise-*)

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `course` | yes | string | Must be `ap-csp`. For class accounts the server rejects a mismatch against the class course (returns `tracked: false`, `reason: 'off-course page'`); solo accounts accept any course. |
| `unit` | yes | string | `bi-1` through `bi-5`. Stringified server-side. |
| `lesson` | yes | string | The lesson slug (see key derivation). |
| `activity_type` | no | string | Defaults to `cfu` server-side if omitted. For CSP send one of `lesson`, `exercise-1`, `exercise-2`, `quiz` to match the `COURSES` config. |
| `item` | no | string | Stable per-question id. Sliced to 120 chars. Defaults to the literal `item` if omitted, which would collapse every question into one row, so always send it. |
| `correct` | conditional | boolean | Provide this OR `points`+`max_points`. |
| `points` | conditional | number | Partial credit. Paired with `max_points`. |
| `max_points` | conditional | number | Must be finite and > 0. |
| `client_event_id` | recommended | string | Idempotency key, sliced to 100 chars. See dedupe rules. |
| `answers` | no | JSON | Stored as-is in the ledger. Zero-PII rule applies: indices and booleans only, never answer text or student-typed strings. Prefer omitting it entirely for CSP. |

Points resolution, exactly as the server computes it:

- If `points` or `max_points` is present: `points = Number(points ?? 0)`,
  `max_points = Number(max_points ?? 1)`, and `correct` is derived as
  `points >= max_points` when not sent explicitly.
- Else if `correct` is present: `points = correct ? 1 : 0`, `max_points = 1`.
- Else: 400. One of the two forms is mandatory.
- `points` is clamped into `[0, max_points]` server-side.

For plain MCQ items send `{ correct: true|false }` and let the server map it to
1/1 or 0/1. Reserve `points`+`max_points` for genuinely partial-credit widgets.

## 3. Key derivation

The reporter must produce `course`, `unit`, `lesson`, `activity_type` that
exactly match the `COURSES` map in `utils.js`. Mismatched keys are still stored
(the handler never blocks on config lag) but they land under a location the
dashboards do not read, and the response carries a `recognized: false` warning.
Treat any `recognized: false` in the pilot as a bug in key derivation.

Recommended resolution order, mirroring how the CSA reporter and `utils.js`
`pageFromHandle` already work:

1. `window.APCS_PAGE` if the page sets it (`course`, `unit`, `lesson`,
   `activity`).
2. A page wrapper `[data-course][data-lesson-id]` (and optionally
   `data-unit` / `data-activity-type`).
3. Parse the Shopify page handle. CSP lesson pages are
   `ap-csp-course-bi{N}-{slug}`, which maps to `unit = 'bi-' + N`,
   `lesson = {slug}`. Hub pages (`ap-csp-course`,
   `ap-csp-course-big-idea-N`, `ap-csp-course-create-task`) intentionally do not
   match and must be ignored. Trailing activity token on the handle
   (`-exercise-1`, `-exercise-2`, `-quiz`) sets `activity_type`, defaulting to
   `lesson`.

Valid CSP units and lesson slugs are enumerated in `utils.js` under
`COURSES['ap-csp'].units`. The reporter does not need to hardcode the list; it
just needs to emit the same slug the handle carries.

## 4. Item id strategy (the Matrixify decision)

`/score` takes a **client-sent** `item` id and has no manifest to validate it
against. That means the CSP reporter does not need Matrixify-injected
`data-item-id` attributes on page bodies. This removes the CSP half of the
`data-item-id` blocker entirely, and is the recommended approach.

Derive a stable id per graded question, preferring an explicit id when the page
happens to provide one, falling back to DOM order:

1. If the `.mcq-item` element carries an explicit id
   (`data-item-id`, `data-q`, or a DOM `id`), use it verbatim. This lets a page
   pin an id that survives reordering.
2. Otherwise synthesize from stable context plus DOM ordinal:
   `` `${unit}.${lesson}.${activity_type}#${ordinal}` `` where `ordinal` is the
   1-based index of the `.mcq-item` among its siblings on the page. Example:
   `bi-3.conditionals.exercise-1#2`.

Stability requirements and the one real caveat:

- The id must be identical across page loads and across a student's retries, so
  the rollup keeps best-per-item rather than creating a new row each attempt.
  Ordinal-from-DOM satisfies this as long as question order on the page is
  stable.
- The caveat: if a lesson's questions are reordered or one is inserted in the
  middle later, ordinal ids shift and historical events for the old ordinals no
  longer line up with the new positions. Prior events are not corrupted (the
  ledger is append-only) but the rollup denominator can move. Mitigations, in
  order of preference: prefer explicit per-item ids (path 1) on any lesson
  expected to change; treat question order as append-only in content edits; if a
  reorder is unavoidable, it is a known one-time rollup shift for that lesson,
  not a data-loss event.

Do not encode the student, the attempt number, or a timestamp into `item`. The
id identifies the *question*, not the *attempt*; attempt separation is what
`client_event_id` is for.

## 5. Score semantics (important consequence)

`rollupScore` computes, per `(student, course, unit, lesson, activity_type)`:
best `points` per distinct `item`, summed over items, divided by summed best
`max_points`, rounded to a 0-100 percentage, written to `progress.score`.

Two consequences the theme session should design around:

- **Best-per-item, always.** Re-answering a question keeps the higher result and
  never averages a correct answer back down. There is no first-attempt-only mode
  on this path; that mode only exists on the manifest-gated CSA path. CSP
  grading is therefore inherently lenient/best-attempt. If a CSP activity ever
  needs first-attempt-of-record semantics, that is an API change, not something
  the reporter can enforce.
- **Items accumulate within an activity.** Post one event per question with its
  own `item`, and the quiz/exercise score is the sum of best-per-question. This
  is the recommended shape for CSP CFUs, exercises, and quizzes alike: it gives
  partial credit for free and is idempotent. Posting a single aggregate
  `item` for a whole quiz also works, but throws away per-question granularity
  and is not recommended.

A denominator consequence worth stating plainly, because it drove the manifest
decision: on this path the denominator is the sum of best `max_points` over the
items that have actually been posted, not a fixed per-lesson total from a
manifest. So a quiz's percentage is out of the questions the student has
answered so far, and it climbs to the full denominator only once every question
has been posted at least once (right or wrong; an incorrect answer still posts,
so it still counts toward the denominator). Post every graded question, not just
the correct ones, and the denominator settles at the true question count once
the student has worked the whole set.

## 6. Dedupe rules

Three independent layers; use all three.

1. **Server idempotency via `client_event_id`.** If a `client_event_id` has
   already been seen for this student, the handler treats the post as a retry,
   does not double-count, and returns the live rollup with `duplicate: true`.
   Generate one id per *distinct graded result* and reuse it on network retries
   of that same result. A practical scheme:
   `` `${item}:${points}/${max_points}` `` hashed, or `item` plus a monotonic
   per-item attempt counter. The point is that the *same* graded outcome retried
   over a flaky mobile connection carries the *same* id, while a genuinely new
   attempt carries a new one.
2. **Client per-item last-result guard.** Mirror the CSA reporter's `lastSent`
   map: keep `item -> "points/max_points"` in memory and skip a post whose
   result is identical to the last one already sent for that item this page
   view. This suppresses the common case of a student clicking check twice with
   no change.
3. **Per-element reported flag.** Mark a graded `.mcq-item` (for example
   `dataset.apcsReported = "<item>:<score>"`) so the same DOM node is not
   re-reported for an unchanged outcome. Update the flag when the score changes
   so a corrected answer still reports.

Layers 2 and 3 keep traffic down; layer 1 is the correctness backstop that makes
double-submits safe even if 2 and 3 are bypassed.

## 7. Grading observation

The reporter observes outcomes; it does not grade. Bind to the CSP page's
existing MCQ system:

- `.mcq-item` is the per-question container; `.mcq-option` are the choices.
- Let the page's own check/grade handler run first (defer with a
  `setTimeout(fn, 0)` after the check click, same trick as the CSA reporter),
  then read the graded state (selected option index, correct/incorrect class the
  page sets) and post once.
- Selected option index is safe to include as `sel` in `answers` (an index, not
  text). Nothing student-typed ever goes on the wire.

If the CSP page markup does not yet expose a reliable "graded" signal (a class
toggled on the correct/incorrect option, or a feedback element), that signal is
a prerequisite the theme session should confirm or add on the page before the
reporter can hook it. Flag it rather than guessing at grading client-side.

## 8. Response shape

On success the handler returns:

```json
{
  "ok": true,
  "tracked": true,
  "recognized": true,
  "item": { "item": "bi-3.conditionals.exercise-1#2", "points": 1, "max_points": 1, "correct": 1 },
  "rollup": { "earned": 4, "possible": 5, "items": 5, "events": 6, "pct": 80 }
}
```

`duplicate: true` is added on an idempotent retry. `recognized: false` plus a
`warning` string means the `(course, unit)` was not found in `COURSES`: fix key
derivation. `tracked: false` means an off-course post for a class account, or no
class row; not an error, but the event was intentionally dropped.

Handle non-2xx the way the CSA reporter does: retry once on a network failure
(4 second backoff), do not retry on a 4xx (the payload is wrong; surface it in
the console for the pilot).

## 9. Out of scope for the reporter

- Injecting attributes into Shopify page bodies via Matrixify. The whole point
  of the DOM-order item id is to not need this for CSP.
- Any change to `utils.js`, `apcs-tracker.js`, `student.js`, or the CSA
  `apcs-reporter.js`. Those are owned by the API-repo session; the CSP reporter
  is a new, separate file.
- Visit/completion tracking. `/score` records grades only; visits stay owned by
  the tracker's `/track` path and finals by `/quiz`.
- Judge0 code exercises. If CSP ever adds them, report test-case pass counts
  only, never source or stdout.

## 10. Open questions for the theme-repo session

1. Does the current CSP `.mcq-item` markup expose a stable graded signal
   (a class on the chosen option, or a feedback node), or does the page handler
   need a small addition first?
2. Should CSP `quiz` activities post per-question items (recommended, partial
   credit, best-per-question) or a single aggregate per quiz? Per-question is the
   default unless there is a reason to hide question-level data.
3. Any lesson expected to have its questions reordered before fall? Those want
   explicit pinned ids rather than DOM-order ordinals.

## Conventions carried from CLAUDE.md

- Zero PII: option indices and booleans only, never answer text or any
  student-typed string, anywhere in the payload.
- No em-dashes in code, comments, or user-facing strings.
- AP CSA references, where they appear for contrast, use the 2025-2026 4-unit
  structure only. This doc is CSP; the CSA note is just to keep the reporters
  from being confused with each other.
