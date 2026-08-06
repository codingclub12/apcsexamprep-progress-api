# Canvas gradebook export

Pull a CSV from the APCSExamPrep gradebook and upload it straight into the Canvas
gradebook. It is a manual process, but it is quick, and it moves a whole class of
grades in one step.

## What a teacher does (the part that decides whether this works)

The CSV is the easy half. The identity match is the half that fails silently, so
do steps 1 and 2 once per class, before the first import.

1. **In Canvas: Grades, then Export.** Canvas downloads its own CSV. The column
   named **SIS Login ID** is the identifier Canvas will match on when you import
   grades back. That column is the authority. Whatever is in it (a school email
   like `jane.doe@sfcakings.org`, or a student number like `100482`) is what has
   to appear in step 2.
2. **Set each student's Student Ref** to that student's SIS Login ID, exactly.
   This is the whole identity bridge. There is no email stored on a student
   account here and there never will be (students are minors, on a name and a
   PIN only), so `student_ref` is the field that carries the match.

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
   confirm the new assignments (one per unit). Confirm, review the preview, and
   save.

Steps 1 and 2 are one time per class. After that, an export and an import is the
whole loop.

## What the file looks like

One assignment per unit, each out of 100 points. Not one per lesson activity:
that would be roughly 55 Canvas assignments for AP Cybersecurity, which is not a
gradebook anyone wants to read.

```csv
Student,SIS Login ID,Section,Cyber Unit 1,Cyber Unit 2,Cyber Unit 3,Cyber Unit 4,Cyber Unit 5
Points Possible,,,100,100,100,100,100
"Doe, Jane",jane.doe@sfcakings.org,Period 3,87,92,,,
```

- **Row 2 must be `Points Possible`.** Canvas requires it in that position, and
  it is what tells Canvas each unit assignment is out of 100.
- **Assignment names carry the course label** (`Cyber`, `AP CSA`, `AP CSP`,
  `AP Networking`) so a new column cannot collide with an assignment already in
  your Canvas course.
- **A blank cell means ungraded, and it always will.** A unit a student has not
  reached exports blank, never `0`. Canvas leaves a blank cell alone, so an
  import can never invent a failing grade for work nobody has done yet.
- **A unit grade is points weighted**, not an average of averages: a 12 point
  quiz counts for more than a 1 point check-for-understanding, and an authored
  item nobody attempted still counts in the denominator. It is the same number
  the portal gradebook shows.
- The file is UTF-8 with a BOM, which is what makes Canvas read a name with an
  accent in it correctly.

## The API, for reference

```
GET /api/teacher/classes/:code/export                          # unchanged: the wide human CSV
GET /api/teacher/classes/:code/export?format=canvas&scope=unit # the Canvas file above
GET /api/teacher/classes/:code/export?format=canvas&scope=unit&preflight=1
```

Teacher auth (`Authorization: Bearer <teacher token>`) and class ownership are
required, exactly as before. `format` defaults to `native`, so every existing
caller keeps getting today's file.

`preflight=1` returns JSON instead of the CSV:

```json
{ "students": 24, "matchable": 21, "unmatchable": ["Jane D.", "M. Chen", "student3"] }
```

`matchable` is how many students Canvas can match on SIS Login ID.
`unmatchable` names the rest, so the portal can warn before the download rather
than after the import. The counts come from the same pass that builds the file,
so the warning and the file cannot disagree.

A Student Ref is emitted as the SIS Login ID only when it is non-empty, 128
characters or fewer, free of commas and newlines, and either an email address or
made up of letters, digits, dot, underscore and hyphen. Anything else exports as
a blank cell: a wrong identifier would attach a real grade to the wrong student,
which is worse than not importing it.

## Deliberately not built

- `scope=activity` (one Canvas assignment per lesson activity). The flag is
  already there for it; the export is not.
- Per-assignment due dates, and splitting one class into Canvas sections.
- A Canvas API push over OAuth or LTI. This is a file a teacher uploads, on
  purpose: no app install, no admin approval, no integration to maintain.
- Storing emails to make matching easier. The zero PII posture is the product.
