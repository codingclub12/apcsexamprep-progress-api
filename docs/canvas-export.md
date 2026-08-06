# Canvas gradebook export

Pull a CSV from the APCSExamPrep gradebook and upload it straight into the Canvas
gradebook. It is a manual process, but it is quick, and it moves a whole class of
grades in one step.

## What a teacher does (the part that decides whether this works)

The CSV is the easy half. The identity match is the half that fails silently, so
do steps 1 and 2 once per class, before the first import.

1. **In Canvas: Grades, then Export.** Canvas downloads its own CSV. It carries
   three identifier columns and will match on whichever one is filled in:

   | Column | Usually holds | Use it when |
   | --- | --- | --- |
   | `SIS User ID` | the student number | **preferred**, see below |
   | `SIS Login ID` | the username, often a school email | there is no student number |
   | `ID` | Canvas's own internal user ID | never, we do not emit it |

   **Prefer `SIS User ID` if your Canvas has one.** A student number is an
   opaque identifier, so nothing resembling a student's personal information
   ever gets stored here. Fall back to `SIS Login ID` only if that column is the
   only one your district populates.
2. **Set each student's Student Ref** to that identifier, exactly. This is the
   whole identity bridge. There is no email stored on a student account here and
   there never will be (students are minors, on a name and a PIN only), so
   `student_ref` is the field that carries the match.

   The export routes it to the right column by its shape: anything that looks
   like an email is emitted as the `SIS Login ID`, anything else as the
   `SIS User ID`. There is no setting to get wrong.

   Until the roster panel ships, this is an API call per student:

   ```
   PATCH /api/teacher/classes/:code/students/:studentId
   Authorization: Bearer <teacher token>
   {"student_ref": "jane.doe@sfcakings.org"}
   ```

   A ref that the export would blank out is refused here with a 400 rather than
   accepted and silently dropped at import time, and two students in one class
   cannot share a ref (409). Send `""` to clear one.
3. **Export with the Canvas option.** Check who will not match first, via
   `?format=canvas&scope=unit&preflight=1`: it names every student whose Student
   Ref is missing or unusable. Those students are not in the import, silently,
   unless you fix them in step 2 first. (The portal surfaces this as a warning
   above the download button once that panel ships.)
4. **In Canvas: Grades, then Import.** Upload the file. Canvas will ask you to
   confirm each new assignment and its points possible. Confirm, review the
   preview, and save. If your course has multiple grading periods enabled, Canvas
   will not create assignments from a CSV at all: create them by hand first, with
   names matching the column headers exactly, then import.

Steps 1 and 2 are one time per class. After that, an export and an import is the
whole loop.

## Two shapes, pick one per class

| Scope | Canvas assignments | Use it when |
| --- | --- | --- |
| `scope=unit` (default) | 5 for Cyber, one per unit | you want a compact gradebook and a single grade per unit |
| `scope=activity` | ~55 for Cyber, one per lesson, quiz, case file and exam | you want case files and exams to be their own Canvas assignments |

Both use identical identity columns, the same blank-means-ungraded rule, and 100
points per assignment. Pick one and stay with it: importing both creates two sets
of Canvas assignments covering the same work.

## What the file looks like

`scope=unit`, one assignment per unit, each out of 100 points.

```csv
Student,ID,SIS User ID,SIS Login ID,Section,Cyber Unit 1,Cyber Unit 2,Cyber Unit 3,Cyber Unit 4,Cyber Unit 5
Points Possible,,,,,100,100,100,100,100
"Doe, Jane",,,jane.doe@sfcakings.org,Period 3,87,92,,,
"Ruiz, Ana",,100482,,Period 3,75,,,,
```

Both students above import correctly. Ana matches on her student number and no
personal information about her is stored anywhere in this system.

- **Row 2 must be `Points Possible`.** Canvas requires it in that position, and
  it is what tells Canvas each unit assignment is out of 100.
- **Assignment names carry the course label** (`Cyber`, `AP CSA`, `AP CSP`,
  `AP Networking`) so a new column cannot collide with an assignment already in
  your Canvas course. Under `scope=activity` each name also carries its lesson or
  unit, because a Canvas assignment name is global to the course: five bare
  `Case File` columns would collide and silently overwrite each other. Names are
  deduplicated, and a name Canvas reserves (anything containing `Current Grade`,
  `Final Score`, `Override Status` and the like) is renamed rather than silently
  ignored on import.
- **A blank cell means ungraded, and it always will.** A unit a student has not
  reached exports blank, never `0`. Canvas leaves a blank cell alone, so an
  import can never invent a failing grade for work nobody has done yet.
- **A unit grade is points weighted**, not an average of averages: a 12 point
  quiz counts for more than a 1 point check-for-understanding, and an authored
  item nobody attempted still counts in the denominator. It is the same number
  the portal gradebook shows.
- **The file is UTF-8 with no byte order mark.** This matters more than it
  sounds: Canvas matches the first header cell against the literal string
  `Student`, and a BOM makes that cell read as `﻿Student`, so Canvas rejects the
  upload with "The CSV header row is invalid." The native export still carries a
  BOM, because Excel needs one to render an accented name correctly. Canvas
  reads UTF-8 without a BOM correctly, so nothing is lost here.

## The API, for reference

```
GET /api/teacher/classes/:code/export                          # unchanged: the wide human CSV
GET /api/teacher/classes/:code/export?format=canvas&scope=unit     # the Canvas file above
GET /api/teacher/classes/:code/export?format=canvas&scope=activity # one column per activity
GET /api/teacher/classes/:code/export?format=canvas&scope=unit&preflight=1
```

Teacher auth (`Authorization: Bearer <teacher token>`) and class ownership are
required, exactly as before. `format` defaults to `native`, so every existing
caller keeps getting today's file.

`preflight=1` returns JSON instead of the CSV:

```json
{ "students": 24, "matchable": 21, "unmatchable": ["Jane D.", "M. Chen", "student3"] }
```

`matchable` is how many students Canvas can match on any of its ID columns.
`unmatchable` names the rest, so the portal can warn before the download rather
than after the import. The counts come from the same pass that builds the file,
so the warning and the file cannot disagree.

A Student Ref reaches the file only when it is non-empty, 128 characters or
fewer, free of commas and newlines, and either an email address or made up of
letters, digits, dot, underscore and hyphen. Anything else exports as a blank
cell: a wrong identifier would attach a real grade to the wrong student, which
is worse than not importing it. Since the roster route validates a ref by the
same rule when it is set, this should never be a surprise at export time.

## Deliberately not built

- Per-assignment due dates, and splitting one class into Canvas sections.
- A Canvas API push over OAuth or LTI. This is a file a teacher uploads, on
  purpose: no app install, no admin approval, no integration to maintain.
- Storing emails to make matching easier. The zero PII posture is the product.
