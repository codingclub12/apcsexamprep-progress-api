# CSP exercise handles: a visit on the topic, and deliberately not a completion

2026-08-22, Claude Code. Closes the handle-routing item carried forward from
`docs/runs/2026-08-21-claude-code-csp-exercise-pages-all-70.md`.

## What was broken

All 70 CSP exercise pages are live. None of them recorded a visit, because
`ap-csp-topic-{U}-{L}-exercise-{N}` matched no rule in `pageFromHandle`, so
`POST /api/student/track` fell through to `return null` and silently no-opped.

## The decision inside a one-rule change

The obvious implementation returns `activity_type: 'exercise-{N}'`, and it is
wrong twice over. `/track` writes `progress` with `completed = 1` keyed on
`(course, unit, lesson, activity_type)`, so that would:

1. Mark the exercise COMPLETE for a student who opened the page and typed
   nothing. That is the same fabricated-completion shape already open on the
   board for the cyber pages.
2. Write it onto `{lesson}|exercise-2`, a key the gated whole-run practice game
   in `lib/csp-course-pages.js` also claims.

So these route as a visit on the PARENT topic, `activity_type: 'lesson'`, exactly
like the guided-notes rule directly above them: the exercise page belongs to its
topic, it is not a topic of its own. A visit is evidence the student opened the
topic's exercise. It is not evidence they did it.

Grading is unaffected and always was. The page dispatches course, unit and lesson
explicitly in the `apcsActivity` detail and the reporter prefers the detail over
the handle, so `pageFromHandle` never sees a graded post from these pages.

## How the topic number becomes a lesson slug

`CSP_TOPIC_INDEX` is derived from the `COURSES` config at module scope rather
than authored a second time. The lessons arrays are written in CED order, so the
Nth lesson of Big Idea U is topic U.N by construction and the numbering cannot
drift from the config. A topic the config does not know returns null rather than
a guess: a wrong lesson column invents a row no teacher can explain, which is
worse than a missing visit.

## Evidence

- All 70 handles route to the unit and lesson their own renderer assigned them,
  cross-checked against `lib/csp-exercise-pages.js` rather than against the
  regex that produced them. 70/70, zero mismatches.
- All 70 route as `lesson`, so no page can complete itself.
- The rule stays narrow: `ap-csp-topic-3-1-code` and
  `ap-csp-topic-3-1-guided-notes` are still unrouted, and
  `ap-csp-topic-9-9-exercise-1` (no such topic) returns null.
- `smoke/csp-exercise-pages.js` is now 39 assertions, up from 34, with the five
  above added. All 96 offline suites pass on exit code.

## Still open

The `exercise-2` and Big Idea 3 `exercise-1` activity_type collisions are
untouched and still gate grading past Big Idea 1. This change does not make them
better or worse; it routes around them by not using a graded activity_type at
all. 69 exercises still need authored check questions.
