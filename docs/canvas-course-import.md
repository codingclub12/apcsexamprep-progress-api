# Canvas course import

Download the whole course as one `.imscc` file and import it into Canvas. It
creates a module per unit, a link per lesson, and one assignment per gradebook
column, already named and already worth 100 points.

This is the other half of `docs/canvas-export.md`. That file moves the GRADES.
This one moves the COURSE, and it exists because of what the grade import does
when the assignments are not there yet:

- Canvas asks the teacher to confirm every new assignment and its points
  possible, one at a time, on the first import. Fifty-three lessons of AP CSA in
  activity scope is 250 confirmations, each one a chance to mistype a name and
  quietly orphan a column.
- A course with multiple grading periods enabled will not create assignments
  from a CSV **at all**. Those teachers have to hand-build every assignment
  before their first import, or the upload does nothing and says almost nothing
  about why.

Import the course package once and both problems are gone: the CSV lands on
assignments that already exist.

## What a teacher does

1. **Download the package.**
   `GET /api/teacher/classes/:code/canvas-course?scope=unit`
   (teacher bearer token, same auth as every other teacher route.)
2. **In Canvas: Settings, then Import Course Content.** Content type is
   **Canvas Course Export Package**. Choose the `.imscc`, import all content.
3. **Wait for the import to finish**, then look at Modules. One module per unit,
   the lessons in curriculum order, the assignments under them.
4. **Then do the gradebook loop** in `docs/canvas-export.md`: set each student's
   Student Ref, export with `format=canvas`, upload in Grades. Every column now
   matches an assignment that already exists, so Canvas maps them silently
   instead of asking.

Steps 1 to 3 are once per Canvas course. After that it is only the grade loop.

## Pick the same scope for both files

The package and the CSV take the same `scope`, and they have to agree. Importing
the unit-scope package and then a activity-scope CSV gives you four assignments
and 250 columns, 246 of which Canvas will offer to create as new assignments.

| Scope | Canvas assignments for AP CSA | Use it when |
| --- | --- | --- |
| `scope=unit` (default) | 4, one per unit | you want a compact gradebook and a single grade per unit |
| `scope=activity` | 250, one per lesson activity | you want each lesson, CFU, exercise and quiz to be its own Canvas assignment |

`include` and `units` work exactly as they do on `/export`, parsed by the same
function, so a package built with `units=unit-1` and a CSV exported with
`units=unit-1` cover the same columns. An unknown value in either is a 400 in
both places rather than a quietly smaller course.

## What is in the file

For AP CSA, `scope=unit`, 84 KB:

```
imsmanifest.xml
course_settings/canvas_export.txt          the marker that makes Canvas read the rest
course_settings/course_settings.xml
course_settings/assignment_groups.xml      one group, "AP CSA (APCSExamPrep)"
course_settings/module_meta.xml            4 modules, 114 items
<resource-id>/<name>.xml                   110 web links, one per lesson and exercise page
<resource-id>/<name>.html                  4 assignment descriptions
<resource-id>/assignment_settings.xml      4 assignments, 100 points each
```

- **Modules are the units.** Unit 1 through Unit 4 for CSA, Big Idea 1 through 5
  for CSP, in curriculum order, with the unit hub page linked first.
- **Every lesson is a link out**, opening in a new tab, to its live page on
  apcsexamprep.com. For CSA each lesson also links its coding exercise page.
  The lesson content itself is not copied into the cartridge: it lives behind
  the bundle on the storefront, where it is auto-graded and where a fix reaches
  every class at once.
- **Assignments take no submission.** The work is done and graded on
  apcsexamprep.com; the Canvas assignment is where the grade lands. An
  assignment that accepted an upload would invite a second, ungraded copy of the
  same work. Each description links to the page that produces its grade.
- **No due dates.** They are per class and per school year, and a wrong one is
  worse than none. Set them in Canvas after import if you want them.
- **100 points each**, which is the number in the CSV's `Points Possible` row.

## The invariant, and why the file is worth trusting

A Canvas gradebook CSV import matches a column to an existing assignment **by
name**. So every assignment name in the package comes from the same function
call that writes the CSV header (`canvasUnitColumns` / `canvasActivityColumns`
in `lib/export-format.js`), not from a second copy of the naming rule.

`smoke/canvas-course-package.js` downloads both files from the same server with
the same params and asserts the assignment names and the CSV headers are the
same list in the same order, for both scopes, plus that points possible agree.
If those ever drift, the failure mode is a gradebook with every column twice and
half of them blank, which is why it is checked rather than reasoned about.

The five derived columns (`Letter Grade`, `%`, `Total Earned`, `Total Graded`,
`Total Possible`) are marked `(read only)` in the CSV and deliberately get no
assignment. Canvas ignores them on import.

## Zero PII, and identical for every teacher

The package holds course structure and public page links. Nothing student
specific, nothing class specific: no roster, no grades, no class code, not even
the class name. Two teachers of AP CSA who download the same scope get byte
identical files, and the suite asserts that a populated class cannot leak a
student name, a student ref, a class code or a teacher email into the archive.

The route is a teacher route on a class for two reasons and neither is the data.
Teacher ownership of a class is the entitlement gate, since a class exists only
where a bundle was bought, and the class is how the route knows which course to
build.

## Course coverage

| Course | Modules | Lesson links | Assignments (activity scope) |
| --- | --- | --- | --- |
| `ap-csa` | 4 | 53 lessons plus 53 exercise pages | 250 |
| `ap-csp` | 5 | 35 topics | 129 |
| `ap-cybersecurity` | 5 | none yet | 114 |
| `ap-networking` | 4 | none yet | 66 |
| `intro-java` | 6 | none yet | 204 |

A course with no link table still exports a real package: modules and named
assignments, no page links. That is strictly better than refusing, and
`preflight` reports `linked: false` so the difference is visible before the
download rather than after. Adding links for a course is a link table in
`lib/canvas-course-package.js` reading whatever authored source already holds
its handles, not a new code path.

A class whose course is `solo` gets a 400. A solo grouping is not a curriculum
and has no units to build modules from.

## The API

```
GET /api/teacher/classes/:code/canvas-course                        # scope=unit, the whole course
GET /api/teacher/classes/:code/canvas-course?scope=activity
GET /api/teacher/classes/:code/canvas-course?scope=activity&units=unit-1
GET /api/teacher/classes/:code/canvas-course?scope=activity&include=quiz,exam
GET /api/teacher/classes/:code/canvas-course?scope=unit&preflight=1
```

`preflight=1` returns the summary as JSON instead of a 500 KB download, so a
portal can show what is about to be imported:

```json
{
  "course": "ap-csa",
  "course_title": "AP Computer Science A",
  "scope": "unit",
  "linked": true,
  "modules": [{ "title": "Unit 1: Using Objects and Methods", "items": 32 }],
  "assignment_count": 4,
  "assignments": ["AP CSA Unit 1", "AP CSA Unit 2", "AP CSA Unit 3", "AP CSA Unit 4"],
  "points_per_assignment": 100,
  "link_count": 110,
  "files": 123,
  "bytes": 84283
}
```

Rate limited to 30 a minute per IP. The largest package (CSA, activity scope) is
615 files and about 470 KB, measured at 50 ms to build on the Railway box.

## Verified, and not yet verified

What is checked offline, on every CI run, by `npm run smoke:canvascourse`:

- the archive opens from its central directory with every CRC intact
- every XML file is well formed and declares UTF-8
- every `identifierref` resolves to a resource, and every `<file href>` names a
  file that is really in the archive
- the assignment names and the CSV headers match, name for name, both scopes
- points possible agree with the CSV `Points Possible` row
- no student name, student ref, class code or teacher email is in the bytes
- the same request returns byte identical bytes

**What no offline check can prove is that Canvas accepts it.** The cartridge is
built to the Canvas course export format (Common Cartridge 1.3 plus the
`course_settings/` files Canvas writes in its own exports, keyed by the
`canvas_export.txt` marker), but a real import into a real Canvas course is the
only evidence that counts. Do that once, in a Canvas Free-for-Teacher sandbox,
before this is offered to a teacher. Import the package, then import a
`format=canvas` CSV for the same class, and check that Canvas maps every column
to an existing assignment and offers to create none.

## Deliberately not built

- **Quiz content in the cartridge.** The questions live behind the bundle. A
  QTI quiz inside a package a teacher can forward is an answer key with a
  distribution channel.
- **Due dates and grading periods.** Per class, per year.
- **An LTI tool or a Canvas API push over OAuth.** Same reason as the CSV: a
  file a teacher uploads needs no admin approval, no app install and no
  integration to keep alive.
- **Per-student anything.** See zero PII above.
