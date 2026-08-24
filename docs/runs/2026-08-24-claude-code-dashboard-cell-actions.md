# The gradebook cell buttons did not save, and only some of them could

2026-08-24, Claude Code. A cyber teacher, Mike Rhodes, worked through Cyber 1.4
to prepare for class, opened the gradebook cells for Exercise 1 and 2, and was
told `Preview only in this session. Saved overrides ship with the next update.`
He asked when that update ships. The question turned out to have four different
answers.

## What was actually there

Four controls, four `TODO` markers, and nothing behind any of them. They wrote
into `OVER`, `RESET`, `GRANT` and `STUDENT_RETRY`, four plain objects on the
page, cleared by any reload. Confirmed on the deployed page and not just in the
repo: the live body carries the same four markers.

The retry toggles were the worse half. The cell popover at least SAID it was a
preview; the retry panel said nothing, so a teacher opening retry for a
struggling student got no signal at all that it was forgotten on reload.

## Why "wire them up" was not one job

`ap-cybersecurity` is a System B course (`score_events` rolled into
`progress.score`, see `docs/grading-systems.md`). Measured, not assumed:

| Control | Server path | Verdict |
|---|---|---|
| Reset | `PATCH .../progress/:id/unlock` `{reset:true}` | works, wired |
| Grant attempt | same endpoint, `{reset:false}` | works, wired, but only means something on a FINALISED quiz |
| Set score | none | cannot be wired |
| Retry toggles | `PATCH .../students/:id/retry` | writable, NOT readable |

**Set score has no server path on this course.** The only teacher score-write
endpoint, `POST /api/teacher/classes/:code/scores`, is System A and validates
against `course_manifest`, which cyber has no rows in. Driven against a real
class it answers `400 Unknown item '1.4-exercise-1' for ap-cybersecurity. Not in
course_manifest.` for every item id shape the column model could produce. This
is not a wiring gap, it is a missing feature.

**Grant attempt is narrower than it looks.** `progress.locked` is written in
exactly one place, `/api/student/quiz/finalize`, which hardcodes
`activity_type = 'quiz'`. On a lesson, exercise or exam the unlock returns 200
and changes nothing. So it is now drawn only where it can do something.

**The retry toggles can be written but not read.** The write endpoint works and
persists (`retry_override: 1`). But the teacher progress payload's student
object is `{id, name, ref, active, last_active}` with no `retry_override`, so a
wired toggle would show "Default" on the next load while an override was live.
That is a new lie in place of the old one, so they stay unwired and now say so.

## What changed

`shopify/cyber-dashboard.html`. The in-memory state is gone; `cellData` carries
`progress_id` and `locked` on every branch; the popover gates each button on the
fact that makes it possible, and states plainly that typing a score by hand is
not available on this course and why. Reset is confirmed first, because it
clears a grade. Both actions re-read the server rather than patching the grid,
so what the teacher sees after a click is what the next load will show.

The grid's two invented markers (an "override" dot and a "+n granted" badge,
neither of which could ever be set again) are replaced by the real locked flag.

**One thing found in passing.** `esc()` on this page was an identity map:

```
esc(str){ return String(...).replace(/&/g,'&').replace(/</g,'<')... }
```

Shopify decodes entity literals in a page body on import, so every replacement
had collapsed to character-to-itself. This is the same defect found in
`join.html` on 2026-08-22, and the fix is the same construction. Not a live
vulnerability: `sanitize()` in `utils.js` strips tag characters from both
display names and class names before storage, so nothing reaching this page
carries them. It was a dead safety net, in a file being re-imported, so it was
restored rather than shipped broken again.

## Evidence

`smoke/dashboard-cell-actions.js`, 42 assertions, in CI by its npm script. It
boots a real server, creates a cyber class, has a student score an exercise and
finalise a quiz, then drives each control and **re-reads the same endpoint the
page reloads with**. In-memory state passes the old UI and fails right there.

- Reset: score gone on re-read, and the cell reads as not started rather than as
  a zero.
- Grant attempt: a finalised quiz is open again on re-read and the score is
  KEPT, which is what separates it from Reset.
- Set score: the 400 is pinned, so the claim in the popover stays true. If cyber
  ever gains manifest rows this fails and the note needs rewriting.
- Retry: the write is asserted to work and the payload asserted NOT to carry
  `retry_override`. The day that field appears, this fails, and that failure is
  the signal to wire the toggles.
- `esc()` is lifted out and RUN, not string-matched. The identity map still
  looks correct; only calling it tells the two apart.

Checked against reintroduction: reverting `applyGrant` to a no-op fails 1,
restoring the identity-map `esc` fails 3, and putting the old preview promise
back fails 1. The first of those initially passed, because the assertion checked
that the shared helper existed rather than that each button routed into it; that
gap is now closed by two per-button assertions.

Rendered in jsdom against a payload captured from a real server: a graded
exercise offers Reset only, a finalised quiz offers Grant attempt and Reset, an
untouched cell offers neither and says so, and both buttons issue the PATCH plus
the refresh GET with no errors raised.

103 offline smoke suites pass. The Matrixify sheet clears the import guards; its
content-loss check correctly flagged the removal of `applyOverride`, which is
intended and was accepted explicitly with `--accept-loss`.

## Still open

- **The sheet is not imported.** Nothing above is live until it is.
- **Set score needs a System B teacher score-write endpoint.** That is the thing
  Mike actually asked for, and it is a server change, which matters more than
  usual right now: `/api/health` has been serving a commit five merges behind
  `main` for over an hour. A new endpoint that does not deploy is worse than the
  honest message, because the button would 404 instead of saying no.
- **`retry_override` on the teacher progress payload** is one field, and it
  unblocks four toggles.
- **Worth asking Mike what those two cells showed before he clicked in.** Board
  items 83, 102 and 105 all describe cyber exercises reporting a fabricated zero
  or no score at all. A teacher does not usually hunt for a manual override
  unless a score is already wrong, and if that is what happened, an override
  would have papered over the real bug.
- **A denominator mismatch is visible in the popover**, pre-existing: the header
  prints the authored column total while Current prints the reported pair, so a
  page reporting out of 7 against an authored 25 shows "out of 25" and "3 / 7"
  in the same box. That is board item 83's territory, not this change.

## What this is really about

A control that does nothing is worse than no control, and a control that does
nothing silently is worse again. The rule this suite encodes: a button ships
only with the server path that makes it true, and where there is no such path
the page says so in words a teacher can act on.
