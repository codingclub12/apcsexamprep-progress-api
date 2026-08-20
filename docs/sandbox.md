# The code sandbox

A free-practice code editor at `https://progress.apcsexamprep.com/sandbox`.
Multi-class Java for AP CSA, Python and JavaScript for the AP CSP Create Task.
Nothing here is graded and nothing here reaches the gradebook.

It exists because the courses had no place to just write code. Every editor on
the site belongs to a lesson: it comes with a prompt, a starter, hidden test
cases and a score. A CSA student who wants to try a `Dog` class before Unit 3
asks them to, or a CSP student building a Create Task over three weeks, had
nowhere on this site to do it, and left for CodeHS or repl.it to do it there.

## What runs where

| Piece | File | Does |
| --- | --- | --- |
| Page | `lib/sandbox-page.js` | The whole editor: markup, CSS, and the browser JS, rendered as one document |
| Route | `routes/sandbox.js` | Saved programs (CRUD) and assembly |
| Assembly | `lib/sandbox-assemble.js` | Turns the student's files into one Judge0 submission |
| Table | `sandbox_programs` in `db.js` | One row per saved program |
| Tests | `smoke/sandbox.js` | `npm run smoke:sandbox` |

Served at `GET /sandbox` from `server.js`. The page is rendered rather than a
static file so the limits it enforces in the browser come from the same config
object the API returns, and cannot drift out of step with the server's.

## The Judge0 subsystem is untouched

CLAUDE.md closes the Judge0 subsystem without a specific exception, and this
feature did not need one. The proxy already allow-lists the three language ids
the sandbox uses (62 Java, 71 Python, 63 JavaScript) and already accepts stdin.
Nothing in `routes/judge0.js` changed.

The page calls the proxy **directly from the browser** rather than through this
route, and that is deliberate. The proxy rate-limits per client identity. If the
sandbox ran code server-side, every student in the country would arrive from this
box's own address: one runaway student would throttle everyone, and the
per-identity ceiling would stop meaning anything. So a run is two requests:

```
POST /api/sandbox/assemble   files            -> one source string + language_id
POST /api/judge0/run         that source      -> stdout / stderr / compile_output
```

Runs are charged against the existing Judge0 budget. A sandbox run costs the same
~$0.0017 as a lesson run, and the same 500/hour per-identity and 3000/hour global
ceilings apply, so the sandbox cannot open a new spend path. It can, however,
raise the total: unlike a graded exercise, nothing bounds how many times a student
presses Run. The monthly Judge0 total is the number to watch after this ships.

## The one Java file problem

Judge0 writes a Java submission to `Main.java`, compiles it, and runs `java Main`.
AP CSA is a course about writing classes, so a student naturally writes a `Dog`
and a `Main`. Two things break, and both are file rules rather than language
rules, which is why the resulting errors read as nonsense to a student who has
done nothing wrong:

1. `public class Dog` in `Main.java` is a compile error.
2. `import` must precede every type, so concatenating files puts imports in the
   middle of the file.

`lib/sandbox-assemble.js` concatenates the files, hoists and de-duplicates the
imports, and strips `public` from every top-level type except the entry class. It
reuses the brace-aware scanner in `lib/csa-code-modes.js` rather than parsing Java
a second time: two scanners would eventually disagree, and the day they did, code
that compiled in the sandbox would fail in a graded exercise with an error the
student could not act on.

Two smaller kindnesses, both reported to the student rather than done silently:

- A student whose only class is `public class Dog { main }` gets it compiled as
  `Main` for that run. Their saved code is unchanged.
- A `package` line is dropped, because Judge0 has no package tree and honoring it
  produces a `NoClassDefFoundError` with no visible cause.

`smoke/sandbox.js` runs the real `javac Main.java` / `java Main` pipeline against
the assembled output whenever a JDK is present, so "it compiles" is tested rather
than argued. Without a JDK those checks skip loudly instead of passing quietly.

## Sign-in, and why the page has its own login form

Running is anonymous. Only **saving** needs an account, and the prompt appears
when the student presses Save, which is the first moment the reason for it is
obvious. Putting a login in front of the page would gate the thing that
demonstrates the product.

The page signs in with the same class code, name and PIN as the storefront, via
`POST /api/student/login`. It cannot reuse the storefront's token: that token
lives in `localStorage` on `apcsexamprep.com`, `localStorage` is per-origin, and
this page is served from `progress.apcsexamprep.com`. Two origins, two stores,
however much they look like one product to a student.

Unsaved work is mirrored to `localStorage` on this origin as a draft, so a reload
or a sleeping Chromebook does not lose an hour. The draft is browser-only, never
leaves the machine, and is not a substitute for Save; the page says so rather than
implying otherwise.

## Storing student-written text

`sandbox_programs` is **the only table in this repo that stores free text a
student typed**. That is a deliberate exception to the zero-PII posture, approved
2026-08-20 for this feature, not a drift. A sandbox whose work cannot be reopened
tomorrow is a scratch pad.

The exception is bounded, and the bounds are the feature:

- **Owner-only.** Every read and write carries `student_id` in the `WHERE`
  clause, so a program is reachable by exactly one token. There is no teacher and
  no admin path to this table. Adding one is a decision, not a patch.
- **Someone else's id and a nonexistent id return the same 404**, so a response
  cannot confirm that a program exists.
- **Capped**: 60 programs per student, 8 files per program, 20000 characters
  total, 60-character titles, 4000-character stdin.
- **Never logged.** The wire log records route and status, never bodies.
- **Deleted with the student.** `ON DELETE CASCADE`, unlike attempt history,
  which survives roster deactivation because it is gradebook data. Scratch code
  is not.

The consequence that does not go away, stated plainly: a student can type
anything into a program body, so this table can hold unreviewed text written by a
minor. The remedy is a `DELETE` by `student_id`.

## API

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/sandbox/config` | none | The limits |
| `POST` | `/api/sandbox/assemble` | none | Files in, one Judge0-ready source out. Stores nothing, reads nothing |
| `GET` | `/api/sandbox/programs` | student | The caller's own programs, newest first, without bodies |
| `GET` | `/api/sandbox/programs/:id` | student | One program, with files |
| `POST` | `/api/sandbox/programs` | student | Create |
| `PUT` | `/api/sandbox/programs/:id` | student | Replace |
| `DELETE` | `/api/sandbox/programs/:id` | student | A real delete |

## Known gaps

- **No teacher view.** By design for this pass. A teacher who wants to see a
  student's sandbox work is a real request and a real decision, because it turns
  a private scratch pad into observed work; it should be answered deliberately.
- **No syntax highlighting.** The editor is a textarea with indent handling. A
  highlighter means a CDN or a bundle, and a blocked CDN on a school network is a
  page that does not work during a class period with nobody available to debug it.
- **No graphics.** Console programs only: no Swing, no turtle, no p5.js. Judge0
  returns text. This is the largest gap against CodeHS and the most likely next
  ask, particularly for CSP.
- **No sharing.** No public link to a program, which is how CodeHS sandbox work
  usually gets handed to a teacher.
- **Not linked from the storefront yet.** That is a theme-repo change.
