# Grading systems: current state and the open reconciliation

There are two graded-reporting systems in this API. Both work, both are tested,
but they write to different tables and are read by different endpoints, so a
grade recorded through one is invisible to the endpoints that read the other.
This doc pins down exactly what surfaces where and lays out the reconciliation
options. It documents a state to decide on; it does not change behavior.

## The two paths

| | System A | System B |
|---|---|---|
| Write endpoint | `POST /api/progress/attempt` | `POST /api/student/score` |
| Storage | `attempts` table | `score_events` ledger, rolled up into `progress.score` |
| Denominator authority | `course_manifest` (validated, rejects unknown items) | client-sent `max_points`, self-summed |
| Grade of record | first-attempt OR best-ratio per class `retry_allowed` / student `retry_override` | best-per-item, always (no first-attempt mode) |
| Reporter using it today | `shopify/apcs-reporter.js` (CSA) | CSP reporter (to be built), Cyber grade path |
| Course in practice | ap-csa | ap-csp, ap-cybersecurity |

## Who reads which (the disconnect)

| Read endpoint | Reads `attempts` (A) | Reads `progress.score` (B) |
|---|---|---|
| `GET /api/student/attempts` (student per-item grid) | yes | no |
| `GET /api/admin/student/:id` | yes | no |
| `GET /api/admin/class/:id/gradebook` | yes | no |
| `GET /api/teacher/classes/:code/progress` (teacher dashboard) | **no** | yes |
| `GET /api/teacher/classes/:code/export` (CSV) | **no** | yes |
| `GET /api/student/progress` (progress map) | **no** | yes |

Verified by tracing the routes: `progress.score` is written only by
`/api/student/score`, `/api/student/quiz`, and the generic
`/api/student/progress`; never by `/api/progress/attempt`. Nothing bridges the
`attempts` table into `progress`. `teacher.js` never queries `attempts`.

### Concrete consequence for the CSA pilot

A CSA CFU or quiz graded through `/api/progress/attempt` (what
`apcs-reporter.js` posts) shows up for:

- the student, on the `/api/student/attempts` per-item grid, and
- the owner, on the admin student drill and admin class gradebook.

It does NOT show up for the teacher on `/api/teacher/classes/:code/progress`,
the CSV export, or the student's own `/api/student/progress` score map. The
`points_earned` / `points_possible` fields on the teacher dashboard are `null`
for CSA for the same reason: those come from `score_events`, which CSA does not
write. CSP and Cyber, on System B, surface correctly on the teacher dashboard.

So today the teacher-facing gradebook is correct for CSP/Cyber and blank for
CSA grades. Admin views are the only teacher-side surface where CSA grades
appear, and teachers do not have admin access.

## Reconciliation options

Not yet decided. Each keeps existing data; all are additive.

1. **Bridge A into `progress.score`.** Have `/api/progress/attempt` also roll its
   best-per-item result up into `progress.score` for the mapped
   `(course, unit, lesson, activity_type)`, so the teacher dashboard shows CSA
   grades with no reporter change. Cost: define the attempt-to-progress mapping
   (unit comes from the manifest; decide whether CFUs roll into a `lesson`-level
   score or their own activity_type) and accept that `progress.score` would then
   carry best-per-item for CSA even when the class is first-attempt-of-record,
   unless the bridge honors `retry_allowed` at write time.

2. **Teach the teacher dashboard to read A.** Port the admin gradebook's
   `GOR_SELECT` window pass into `/api/teacher/classes/:code/progress` and merge
   attempts-based grades alongside the `progress.score` grades. Keeps CSA on the
   manifest-gated path with its first-attempt/retry semantics intact; exposes
   those grades to teachers the same way admin already sees them. Cost: the
   teacher payload now blends two grade sources and needs a coherent shape.

3. **Unify CSA onto System B.** Point the CSA reporter at `/api/student/score`
   like CSP. Simplest read side (one system), but loses manifest validation and
   the first-attempt-of-record mode on CSA, and is a theme-repo reporter change,
   not an API change.

Recommendation: option 2 for the pilot. It is API-only, changes no write path
or reporter, preserves the manifest and retry semantics CSA was built around,
and makes the teacher dashboard agree with the admin gradebook, which already
computes exactly these numbers. Revisit option 1 or 3 only if a single unified
write path becomes worth the semantic change.

## Why it is this way

System B (`score_events` + `progress.score`) is the older, course-agnostic
grade path that Cyber shipped on and that CSP now targets. System A
(`attempts` + `course_manifest`) was added for the CSA pilot to get manifest
denominators, per-question detail with zero PII, and first-attempt-of-record
grading. They were built for different requirements and were never wired to a
single teacher read. The pilot is the moment to reconcile them.
