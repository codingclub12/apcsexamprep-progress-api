# 2026-08-24 claude code: fix the Lab row turning green on a bare visit

## The ask

Follow-up on 2026-08-22's investigation, where I told Tanner I found no
active code bug behind the reported "Lab row turns green just from
visiting" and proposed a working theory: stale completion data on the
reused test account. He asked me to actually retest with a fresh account
rather than leave it a theory.

## What I did

Created a genuinely fresh solo student via `POST /api/student/solo-init`
against production (`ME-ETX3`, zero prior progress, confirmed via
`GET /api/student/progress` returning `{"progress":[]}`), then reproduced
exactly the call the live Lab page makes on load (the sitewide visit
beacon in `theme.liquid`, `POST /api/student/track` with the page handle),
with no grading interaction at all:

```
$ curl -X POST .../api/student/track -d '{"handle":"/pages/ap-cyber-unit-1-lesson-1-lab"}'
{"ok":true,"tracked":true,"course":"ap-cybersecurity","unit":"unit-1","lesson":"1.1","activity_type":"lab"}
$ curl .../api/student/progress
{"progress":[{...,"activity_type":"lab","completed":1,...}]}
```

`completed: 1` from a single page load, zero check-btn clicks. The
2026-08-22 theory was wrong; this is a real, reproducible bug.

## Root cause

`POST /api/student/track` (`routes/student.js`) is the sitewide footer
beacon: `theme.liquid` fires it on every `ap-*` page load with just the
page handle, no grading signal. It excluded `quiz` and `exam` from
auto-completing on a bare visit, but nothing else - `lesson`, `exercise-1`,
`exercise-2`, and `lab` all fell into the same branch that set
`completed = 1` unconditionally on the first visit (and forced it back to
1 on every later visit too, via the `UPDATE` branch).

That's correct for `lesson` pages: they're pure reading, no grading step
exists, so visited = complete is the right semantics and always has been.
It's wrong for `lab` and the two `exercise-N` types, which carry real
check-btn grading (`apcs-tracker.js`'s `trackActivityCompletion`,
GRADED path) and post their own completion signal to
`POST /api/student/progress` once every button is actually graded. The
sitewide beacon was racing ahead of that and completing the row before any
grading happened.

## The fix

`routes/student.js`, `/track`: added a `GRADED_ON_ARRIVAL` set
(`exercise-1`, `exercise-2`, `lab`). For those activity types, a visit
still creates/touches the progress row (so `apcs-hub-progress.js` still
shows the amber "started" state Tanner asked for) but never sets
`completed`. Only `POST /api/student/progress` with an explicit
`completed: true` - the page's real grading flow - can complete them now.
`lesson` is unchanged: a visit still completes it. `quiz`/`exam` were
already excluded before this and stay excluded.

Scope: this session's fix covers exactly `lab`, `exercise-1`, `exercise-2`
per what was reviewed and approved. `code`, `gap`, and `debug` (also in
`ACTIVITY_TOKENS`, used by CSP's interactive activities) look structurally
identical - graded, not read-only - and are likely carrying the same bug,
but they were not part of what was approved this round, so they're
untouched. Flagging here rather than silently expanding scope.

## Verified

- New smoke suite `smoke/track-visit-completion-guard.js`
  (`npm run smoke:trackguard`, auto-picked-up by the offline-smoke CI
  gate): 14 checks, all passing. Pins that a bare visit to Lab/Exercise-1/
  Exercise-2 creates a row but leaves `completed = 0`; that a real
  `POST /api/student/progress` completion still works and survives a later
  revisit without moving `completed_at`; and that Lesson/Quiz/Exam behavior
  is unchanged.
- Existing suites re-run clean against the change: `smoke:casefiles` (27/27),
  `smoke:exercises` (24/24), `smoke:ungraded` (15/15), `smoke:myprogress`
  (24/24).
- Root cause reproduced live against production before writing the fix
  (see the curl transcript above), so this isn't a guess dressed up as a
  diagnosis.

## Still open

- `code`, `gap`, `debug` activity types: same shape of bug, not fixed this
  round, needs a separate decision.
- Tanner to confirm on the live site once this deploys: visit a fresh Lab
  page, see amber/started, submit it, see green/complete.
