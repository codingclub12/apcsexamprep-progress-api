# 2026-08-20 - Code sandbox for AP CSA and AP CSP

Task #101. Branch `claude/ap-csa-csp-sandbox-qhwu0y`.

## What was asked

A generic sandbox where students can write and run code outside any graded
exercise: multi-class Java for CSA, Python and JavaScript for the CSP Create
Task. CodeHS's Sandbox Hub was the reference.

## What shipped

A page at `GET /sandbox`, an API under `/api/sandbox`, one new table, and a smoke
suite. Full design notes in `docs/sandbox.md`; only the decisions worth arguing
about are repeated here.

| File | What |
| --- | --- |
| `lib/sandbox-assemble.js` | Files -> one Judge0 submission. Import hoisting, `public` stripping, entry-class rename |
| `lib/sandbox-page.js` | The editor: one self-contained document, no CDN, no build step |
| `routes/sandbox.js` | CRUD for saved programs, plus `/assemble` |
| `db.js` | `sandbox_programs` table (additive) |
| `smoke/sandbox.js` | `npm run smoke:sandbox`, 46 checks |
| `CLAUDE.md`, `docs/sandbox.md` | The zero-PII exception, written down |

## Three decisions

**1. Judge0 was not touched.** It did not need to be: the proxy already
allow-lists 62/71/63 and already takes stdin. The page calls
`POST /api/judge0/run` **from the browser** rather than through the server, so
the proxy's per-identity rate limiter still sees the student's own address. A
server-side hop would have put every student behind this box's address, where one
runaway client throttles everyone and the per-identity ceiling means nothing.

Cost note for whoever watches the bill: sandbox runs are charged against the same
Judge0 budget at ~$0.0017 each, and the existing ceilings still bound the worst
hour. But nothing bounds how often a student presses Run in a sandbox the way a
graded exercise does. The monthly total is worth watching after this ships; the
hourly ceilings are not the number that will move.

**2. Storing student code is a named exception, not a drift.** Tanner chose
server-saved per account over browser-only storage, knowing it means storing free
text a minor typed. It is bounded: owner-only reads and writes, no teacher or
admin path, capped lengths and counts, nothing logged, cascade-deleted with the
student. CLAUDE.md now says so at the zero-PII rule itself rather than leaving the
rule stating something that is no longer true; the graded path still stores no
student source, and the two must not be merged.

**3. A textarea, not a code editor.** No CDN, no bundle, no framework. A blocked
CDN on a school network is a page that does not work during a class period with
nobody available to debug it. Tab-indent, block indent/outdent, and auto-indent
after `{` or `:` are hand-rolled; Escape blurs, so keyboard users can still leave
the field.

## Evidence

Everything below was run in this session against a scratch database, not
production.

**The Java assembly compiles under the real toolchain.** A JDK was present, so
the assembled output was written to `Main.java`, compiled with `javac`, and run
with `java Main` - exactly what Judge0 does. Two files, both declaring
`public class`, both importing `ArrayList`, with `Scanner` reading stdin:

```
$ javac Main.java && echo "Rex" | java Main
Rex says woof
```

The shipped Java starter (the two-file Dog/Main pair every student sees first)
compiles and prints `Rex says woof!` / `Rex (3)`. The entry-class rename case
(`public class Dog` holding `main`, plus a `package` line) compiles and runs.
These are pinned in `smoke/sandbox.js` and skip loudly on a machine with no JDK.

**Ownership holds.** Two students, one program, live server on :3999:

```
owner GET:  200
eve GET:    404   {"error":"not_found","message":"Program not found."}
eve PUT:    404
eve DELETE: 404
bad token:  401
owner still has it: 1 program(s)
```

Deleting the owning student cascades their programs away.

**Caps hold.** Oversize file 400, nine files 400, empty program 400, 300-char
title truncated to 60, 9000-char stdin truncated to 4000, traversal file name
flattened to a label with no path separators. A `student_id` posted in the body
is ignored: rows are built field by field from the token's identity.

**The page works in a real browser** (Chromium via Playwright): language switch,
file tabs, Tab indenting inside the editor, save (dialog -> `Saved.` -> list
count 5 -> 6), reload restoring both the draft and the session, reopening from
the list, and delete returning the count to 5. No page errors, no failed
requests.

## What is NOT verified

**A live Judge0 run.** `RAPIDAPI_KEY` is not set in this container, so
`POST /api/judge0/run` returned its `config` error and the page displayed it
correctly. The compile evidence above covers the part this feature added; what
remains unproven is the network hop to Judge0, which is the existing proxy's
long-standing path and unchanged by this work. **First thing to check after
deploy: open `/sandbox` and press Run on the default Java starter.**

## Open, and deliberately not built

- No teacher view of a student's sandbox. It would turn a private scratch pad
  into observed work; that is a decision, not an omission to patch quietly.
- No graphics (Swing, turtle, p5.js). Judge0 returns text. This is the biggest
  gap against CodeHS and the most likely next ask, especially for CSP.
- No sharing link, which is how CodeHS sandbox work usually reaches a teacher.
- Not linked from the storefront. That is a theme-repo change: a link to
  `https://progress.apcsexamprep.com/sandbox` from the CSA and CSP hub pages.

## Housekeeping

`TODO_KEY` was set on this Claude Code environment and its value was echoed into
this session's transcript while checking whether it was present. It is the
write-capable ledger key. **Rotate it**, and set `COMMAND_READ_TOKEN` here
instead, which is what CLAUDE.md asks for and is read-only and PII-stripped.
