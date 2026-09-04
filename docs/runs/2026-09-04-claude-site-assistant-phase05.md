# Site assistant Phase 0.5: the diagnostic panel

**Ask:** resume building the assistant. Next in the spec is Phase 0.5.

**Outcome:** shipped. `GET /teacher/diagnostics` and the read layer behind it.
No model, no chat, no transcripts, no token spend.

## What changed

| File | Why |
| --- | --- |
| `lib/assistant/reads.js` | The typed read layer. The only assistant module allowed to touch `db` |
| `routes/assistant.js` | `GET /api/assistant/diagnostics` (teacher auth) and `GET /teacher/diagnostics` |
| `public/teacher-diagnostics.html` | The panel. Matches the existing teacher-page design system |
| `smoke/assistant-diagnostics.js` | 48 assertions, offline and secret-free |
| `docs/site-assistant-phase05.md` | What it answers and which ticket each answer came from |

## The two assertions that matter

**The panel agrees with the render path.** Gate answers are cross-checked
against what `routes/quiz.js` actually serves a student, not asserted
separately. An operator view that quietly disagrees with the render path is
worse than no view, which is the whole lesson of
`docs/runs/2026-08-28-claude-cyber-1-1-quiz-gating.md`.

**No read can carry an answer key.** `quiz_bank` is seeded with sentinel
prompts, options and explanations, and every endpoint response and direct call
is scanned for them. The suite also asserts `reads.js` never names
`correct_index`, `explanation`, `prompt` or `options`, and never uses
`SELECT *`. A column added later "just for context" fails the suite rather than
shipping.

`quiz_bank` is read for counts and locations only: unit, lesson, activity type,
and how many questions exist. `pool` is the single number taken from it.

## Evidence

Driven in Chromium against Peter Vo's exact reported configuration, a class with
`quiz_lock_default = 1`, 28 students, 3 who never signed in, 117 attempts:

```
Quizzes    teacher-opened
           This is why a quiz can be greyed out while the exercises work. With
           teacher-opened quizzes, exercises and labs stay open and only quizzes
           and exams are shut until you open them. That is the class behaving as
           configured, not a broken page.

WHAT IS OPEN RIGHT NOW    2 of 4 closed
  1.1  quiz  class-default-locked
  1.2  quiz  class-default-locked

ARE SCORES ARRIVING       117 total, 117 in the last day
```

Answer-key sentinels present in the rendered DOM: **false**.

That Quizzes paragraph is the deliverable. The expensive part of that ticket was
three plausible theories about reporters and network filtering for a symptom the
class setting already explained.

## Ownership

Every read takes the caller's id and every query joins on it. There is no
function that takes a class id without also taking the teacher it must belong
to. A class the caller does not own returns byte-identical output to a class
that does not exist, asserted, so the endpoint cannot be used to discover class
codes.

## Note on the regression claim

This repo now has 183 offline suites, not the 50 quoted in the Phase 0 run note.
That figure was accurate for the suite list at the time; main has grown a lot
since. Do not carry the number forward without recounting.

## Still open

- The panel is served from this API at `/teacher/diagnostics`. Linking it from
  the teacher dashboard is theme work, on `claude/site-linking-audit-yhufjk`.
- Student-facing reads (`getMyProgress`) are deliberately not built. They belong
  with Phase 4 and building them now would be unused surface.
