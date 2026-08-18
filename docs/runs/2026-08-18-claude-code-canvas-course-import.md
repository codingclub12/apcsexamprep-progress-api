# Canvas course import: the whole Teacher Bundle course as one .imscc

Task #97. Branch `claude/canvas-course-import-teacher-bundle-qfae38`.

## The ask

"Can we create an import for an entire canvas course to match the Teacher
Bundle. I'm wanting to test it with AP CSA."

## What was already there, and what was missing

`docs/canvas-export.md` moves GRADES into Canvas and works. It has one ugly step
in the middle that nobody had written down as a problem: on the first import
Canvas asks the teacher to confirm every new assignment and its points possible,
one at a time. For AP CSA in activity scope that is 250 confirmations. And a
Canvas course with grading periods enabled will not create assignments from a
CSV at all, so those teachers have to hand-build every assignment first or the
upload silently does nothing useful.

Nothing moved the COURSE. That is what this adds.

## What shipped

- `lib/zip.js`. A dependency-free zip writer: CRC32, deflate via zlib, three
  fixed-layout headers. A Common Cartridge is a zip and nothing else, and
  archiver or jszip is a dependency tree for one deflate call on a 1 vCPU box
  with a $169 memory spike in its history. Entries carry a fixed DOS timestamp,
  so output is byte-reproducible.
- `lib/canvas-course-package.js`. Builds a Canvas course export cartridge:
  `imsmanifest.xml` (Common Cartridge 1.3), plus the `course_settings/` files
  Canvas writes in its own exports, keyed by the `canvas_export.txt` marker.
  Modules are units, every lesson is a web link out to its live page, and every
  gradebook column is one no-submission assignment worth 100 points.
- `GET /api/teacher/classes/:code/canvas-course` in `routes/teacher.js`.
  `scope`, `include`, `units` and `preflight` all mean exactly what they mean on
  `/export`. Rate limited 30/min.
- `smoke/canvas-course-package.js`, 62 checks. Auto-discovered by CI.
- `docs/canvas-course-import.md`, and a pointer at the top of
  `docs/canvas-export.md` telling a teacher to do this first.

## The one decision worth recording

**Assignment names are not a copy of the CSV naming rule. They are the same
call.** A Canvas gradebook CSV import matches a column to an existing assignment
by NAME. If the package and the CSV differed by one space, the import would
create a second empty assignment beside every real one, and the teacher would
get a gradebook with every column twice, half of them blank, and no obvious
cause.

So `lib/export-format.js` grew `canvasUnitColumns` (extracted from
`buildCanvasUnitExport`, which now calls it) beside the existing
`canvasActivityColumns`, and the package builder calls both. `include`/`units`
parsing moved to one `parseExportFilter` in `routes/teacher.js` that both routes
use, for the same reason: two routes now answer questions about the same course
and must not disagree about what `units=unit-1` selects.

The smoke suite downloads BOTH files from the same server with the same params
and asserts the assignment names and the CSV headers are the same list in the
same order, for both scopes, plus that points possible agree. Reasoning about
it is not the same as checking it.

## Evidence

- All 73 offline smoke suites pass, including the 101-check `smoke:canvas` and
  the 12-check `smoke:export`, so the existing CSV exports are unchanged by the
  `export-format.js` refactor.
- `npm run smoke:canvascourse`: 62 checks pass.
- The generated CSA packages open under the system `unzip -t` with no CRC
  errors, and every XML file in them passes `xmllint --noout`.
- Package sizes: CSA unit scope 84 KB / 123 files / 4 assignments / 110 links;
  CSA activity scope 470 KB / 615 files / 250 assignments. Build cost measured
  at 50 ms for the largest.
- Every course builds: CSP 129 assignments with 35 links, Cyber 114, Networking
  66, Intro Java 204, the last three structure-only until their link tables land.

## What is NOT proven, and what closes it

**No offline check can prove Canvas accepts the file.** The cartridge is built
to the Canvas course export format, but the only evidence that counts is a real
import. Before this is offered to a teacher, someone has to:

1. Create a Canvas Free-for-Teacher sandbox course.
2. Settings, Import Course Content, type "Canvas Course Export Package", upload
   `?scope=unit`. Check Modules: 4 modules, lessons in order, links resolve.
3. Then Grades, Import, upload `?format=canvas&scope=unit` for the same class.
   The pass condition is that Canvas maps every column to an existing assignment
   and offers to create NONE.

That is a human step and it is the whole verification. `apcs verify` is cookie
auth only by design, so the agent that built this cannot be the one that closes
it.

## Open, and deliberately not fixed here

- **`AP CSA 1.1 cfu`.** `ACTIVITY_LABELS` in `lib/export-format.js` has no `cfu`
  entry, so the raw activity key becomes the column name. It is ugly and it is
  jargon a teacher does not necessarily know. It was NOT renamed in this pass:
  the name is shared with the CSV, and renaming it would orphan the Canvas
  assignments of anyone who has already imported a CSA gradebook. Worth doing
  deliberately, once, before the CSA Unit 1 pilot puts real columns in real
  Canvas courses, and never after. Same question applies to `case-file`.
- **Link tables for Cyber, Networking and Intro Java.** Each is a function in
  `lib/canvas-course-package.js` reading whatever authored source already holds
  that course's handles. CSA reads `seed/csa-exercises`, CSP derives the handle
  from the rule `utils.pageFromHandle` reads back.
- **A download button in the teacher portal.** API only this pass, same as the
  class settings panel.
- **Quiz content as QTI.** Deliberately never: a cartridge with the questions in
  it is an answer key with a distribution channel.
