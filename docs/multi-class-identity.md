# Multi-Class Student Identity

Status of the handoff in `MultiClassStudentIdentityClaudeCodeHandoff.md`. This
pass is the API side, done additively: nothing in the existing class-scoped flow
or the deployed theme changes behavior, and no production data is destroyed.

## What shipped (this PR)

### Schema (db.js, idempotent, boot-safe)

- `students.class_id` relaxed from `NOT NULL` to nullable via a guarded, one-time,
  value-preserving table rebuild (the standard SQLite 12-step rebuild, wrapped in
  a transaction with foreign keys temporarily off). It runs only while the live
  column is still `NOT NULL`; afterward the guard skips it, so re-runs are free.
  `class_id` is now the student's HOME class (first class joined), kept so the
  existing class-scoped write path keeps working.
- `students.student_code` added, with a partial unique index. Backfilled for every
  existing identity (`ST-XXXX`, unambiguous chars).
- `enrollments (id, student_id, class_id, enrolled_at, active, UNIQUE(student_id, class_id))`
  added. Backfilled: one row per student whose home class is a real teacher class.
  Solo (`ME-`) students get NO enrollment row, which is exactly the target model
  ("solo is a student with zero enrollments").

The migration is non-destructive: no row is dropped and no column loses data.

### Endpoints (routes/student.js, all additive)

- `POST /api/student/register { display_name, pin } -> { student_code, token }`
  Mints a class-less identity. Login is by `student_code`, never name, so two
  "Jake M."s with PIN 1234 never collide.
- `POST /api/student/login-code { student_code, pin } -> { token, enrollments }`
- `POST /api/student/enroll { class_code }` (auth) writes an enrollment against the
  CURRENT identity. It never creates a student, which is the fix for the
  second-class-mints-a-second-account bug. Idempotent; warns when joining a second
  class in a course you already have one in.
- `GET /api/student/enrollments` (auth) lists the identity's classes.
- `GET /api/student/ad-gate?course=&unit=` resolves ads PER COURSE (optional auth).
- `GET /api/student/progress?course=` now accepts an optional course filter (the
  no-arg call is unchanged and still returns every course the identity has touched).

### Reads made enrollment-aware (routes/teacher.js, routes/admin.js)

Rosters now include students homed in the class OR actively enrolled in it, and
grade aggregates are keyed to `(roster student_id + course)` instead of
`class_id`. For a single-class student these are identical, so no current number
moves; a cross-enrolled student's work now shows in every class they belong to.
Touched: teacher class list count, class detail, progress dashboard, CSV export;
admin class drill, student drill (now returns `enrollments`), and gradebook.

## Backward compatibility

- `/api/student/join`, `/login`, `/solo-init`, `/solo-login`, `/track`, `/score`,
  `/progress/attempt` and the `class_id` token claim are untouched. Existing
  180-day student tokens keep resolving.
- Solo (`ME-`) containers are left in place and keep working.

## Verified

`register -> enroll x2 -> one identity`, login-by-code, no name+PIN collision,
per-course ad gate (including the Cyber-enrolled-on-CSA "ads ON" trap), cross-class
roster visibility, legacy join/login still working, and single-class parity
(numbers unchanged). Plus the migration unit-tested against a simulated old-schema
DB: rebuild, backfill, idempotency, data preserved.

## Deferred (needs a decision or a follow-up PR)

These were intentionally NOT done here because they are either destructive against
live data or depend on data that does not exist yet:

1. **Retire `ME-` solo containers.** Making "solo = zero enrollments" the ONLY
   solo model requires `progress.class_id` and `score_events.class_id` to become
   nullable (more table rebuilds) so class-less identities can have grades written.
   Today a class-less registered student who never enrolls cannot have progress or
   score rows written by the existing endpoints. The join flow always enrolls right
   after register, so this only affects true never-enrolled solo users, who keep
   using `/solo-init` for now.
2. **`score_events.class_id` nullable** ("null = work done solo / outside any
   class"). Same rebuild dependency as above.
3. **Teacher free/paid plan.** The ad-gate free-vs-paid tier from the handoff
   table cannot be resolved: `teachers` has no plan column. The gate runs on the
   FREE-teacher default (first unit free, rest gated) and reports
   `teacher_plan: 'unknown'`. Add a `teachers.plan` column to finish it.
4. **Manual data ops (handoff migration steps 7-8).** Not scripted here:
   hand-resolve `ME-3A2J` (2 students in one solo container: distinct people vs a
   duplicate) and delete the stale audit class `CYBER-KK4L` + its throwaway student.
   Left for a human to run against production with a backup.
5. **Identity-scoped student mutation.** Teacher rename / reset-PIN / deactivate
   stay HOME-class-scoped: a teacher can only mutate identities homed in their
   class, so one teacher cannot deactivate another teacher's student across a shared
   enrollment. Revisit if cross-class roster management is wanted.
6. **Theme frontend** (`APCSExamPrep-theme` repo): the `/pages/join` branch flow
   and the `/pages/my-progress` course switcher live there, not here.
