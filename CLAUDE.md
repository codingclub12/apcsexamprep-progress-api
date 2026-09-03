# CLAUDE.md - APCSExamPrep Progress API

## Read before starting work

Every session opens with the digest and closes with an artifact. The Command
Center was built and then parked, and the reason was friction rather than
features: a board you have to remember to open loses to the terminal you are
already in. So the ledger is the first thing a session touches and the last.

A `SessionStart` hook fetches the digest and puts it in context before your first
message, so rule 1 below is true by construction rather than by memory. If it
could not reach the board it says so loudly instead of injecting nothing; a
session that starts with no state banner has state, and one that starts with a
NO LIVE STATE block must not assume the board is empty or unclaimed.

Set `COMMAND_READ_TOKEN` on the Claude Code environment, not `TODO_KEY`. The
read token is read-only and PII-stripped, and environment configuration is not
a secrets store: anyone who can use the environment can read it, and a session
can echo a variable into its own transcript at any time. That has already
happened once. `TODO_KEY` still works as a fallback and can WRITE to the ledger,
so it belongs in Railway and the Actions secret and nowhere else. Get the read
token from `GET /api/command/read-token` while signed in, rotate it with
`POST /api/command/read-token/rotate`.

**This repository is PUBLIC**, and until 2026-09-03 that was written down nowhere.
Confirmed against the GitHub API that day: `codingclub12/apcsexamprep-progress-api`
reports `"visibility": "public"` and `"private": false`. So the README's endpoint
contracts, the auth model, the Shopify page handles, this file, and every run note
under `docs/runs/` are world-readable, and a credential committed here is disclosed
when it lands rather than when somebody notices. That is the reason the paragraph
above is strict about where `TODO_KEY` lives, and the reason it was worth stating
the reason rather than only the rule.

Whether public is the INTENT is a decision and not a patch. Flipping it touches the
Railway integration and the Actions runs, so a session must not flip it; ask Tanner.
What a session must do is behave as though every commit is published, because it is.

The transcript leak has now happened twice, and the second one has a shape worth
naming. A shell idiom that looks like a presence check is not one: `${TOKEN:-no}`
and `${TOKEN:+yes}${TOKEN:-no}` both EXPAND TO THE VALUE when the variable is set,
so a line written to print "yes" prints the secret instead. Use
`[ -n "$TOKEN" ] && echo set`, or test the length, and never interpolate a
credential into anything that gets printed. Both tokens went into a session
transcript this way on 2026-09-03.

Rotation of the read token is deliberately NOT available to an agent:
`POST /api/command/read-token/rotate` answers
`403 {"error":"This action requires the browser session. An agent credential cannot
perform it."}` to a bearer credential. So a session that leaks the read token cannot
clean up after itself and must say so loudly instead of quietly moving on. `TODO_KEY`
is the same, in Railway and the Actions secret. Both rotations are Tanner's, at a
browser.

The session's container must also be able to REACH the board:
`progress.apcsexamprep.com` has to be in the environment's Custom allowed
domains, or every session opens with DIGEST UNREACHABLE no matter which
credential is set.

```
apcs digest                     # start here. scripts/apcs.js, or npm link once
apcs next                       # what to work on now
apcs prompt <id> | pbcopy       # the compiled prompt, hazards injected
apcs claim <id> --lock repo:path
apcs evidence <id>              # what is ACTUALLY live, not what a report says
apcs done <id> --artifact <url> # returns the claim AND records the proof
```

New here, or unsure what runs where? `docs/where-jarvis-lives.md` answers the
question this file assumes you already know: there is no persistent session, and
committing a file is how you change what every future session knows.

Without the CLI, the same thing over HTTP:

```
GET https://progress.apcsexamprep.com/api/command/digest  (bearer TODO_KEY)
Chat, no headers available: /api/command/digest/r/<read_token>  (read-only, no PII)
Human view: https://progress.apcsexamprep.com/admin/command
```

Claim before you touch a file. Return with an artifact. Never trust this file for
live state - query the source: Shopify Admin API for pages, progress API for the
manifest, git for branch heads. Claims about live state decay; claims about method
survive.

### The four rules that make the ledger worth having

1. **Open with the digest.** Not with the file you think needs changing.
2. **Claim before you touch a file.** Locks are `(repo, file)` pairs and a
   conflict is a 409 naming the holder. `apcs claim 70 --lock theme:assets/x.js`.
   A claim with no `--lock` protects nothing.
3. **Close with an artifact.** A PR URL, a live curl result, a Shopify
   `updatedAt` delta, an md5. `apcs done` refuses without one, locally, before it
   writes anything. Agent reports are not evidence.
4. **You may not verify your own work.** The agent that did a thing is never the
   one that says it is true. That rule is unchanged and is the whole reason the
   number means anything.

   What changed on 2026-09-02 is HOW the loop closes. It used to be cookie-auth
   only, which made Tanner's mouse the only path and left 68 tasks queued behind
   it. Now `verified` can also be set by an INDEPENDENT re-check: a separate
   process refetches live state and passes only if it matches the claim. A live
   curl, a Shopify `updatedAt` delta, an md5, a served asset diff. Evidence a
   machine can re-derive without trusting anybody's report.

   Three things this does not license, and they are the point:
   - The verifier must not be the worker. Same session, same run, same agent
     asserting its own success is not evidence, it is a report.
   - The evidence must be re-derivable. "The tests passed" is not; "the live page
     serves this byte string" is.
   - A judgement call still goes to a human. Whether a lesson reads well, whether
     a price is right, whether a page is good enough: no re-check settles those,
     and auto-verifying them would be the failure this rule was written against.

Leave a run note in `docs/runs/YYYY-MM-DD-<agent>-<slug>.md`: what changed, the
evidence, what is still open, what was learned. Institutional memory lives in the
repo, not in a chat history.

### What may run without a human

`auto_dispatch` needs two separate facts to line up, and they are deliberately
not the same thing:

- **Capability** - `lib/command-router.js` says this kind of task could run:
  repo-reachable, open, unblocked, off the `NEVER_AUTO` list, and no larger than
  `AUTO_DISPATCH_MAX_SIZES` (currently `xs`, `s`, `m`; `l` and `xl` are large
  multi-file changes and stay hand-driven).
- **Consent** - the `auto_dispatch` column reads `eligible`, which is Tanner
  ticking the box on that particular task.

Consent is stored. **Capability is recomputed on every read**, the same way the
gradebook recomputes `passed` against the class's current `mastery_threshold`
rather than trusting the stored flag. Narrowing the size ceiling or adding a
`NEVER_AUTO` rule therefore retires every stale tick on the next run, with no
migration and nothing to hunt down.

`GET /api/command/dispatch-queue` shows what would be handed out and why
everything else was left.

### Standing authority, set 2026-09-02

Tanner runs this business from a treadmill, by voice, and asked for a CEO he
talks to rather than a assistant he approves. So the default flipped: **act, then
report.** Ending a turn with "say the word and I will" is the failure mode, not
the safe choice. A session that investigates, concludes, and then waits has done
half the job and spent the whole turn.

That covers deploys. Merging to `main` ships to Railway; merging a theme PR into
`claude/site-linking-audit-yhufjk` is live to students in under a minute with no
CI in between. Both are yours to do once the evidence is in.

What still stops you, and these are not negotiable:

- The five `NEVER_AUTO` rules, which the router enforces: money and pricing,
  deleting or renaming a handle, schema migrations and backfills, anything
  flagged "a human must check", and writing student data beyond grade recording.
- The Judge0 subsystem, which needs Tanner naming that change specifically.
- A second PII exception. The sandbox is the only one and adding another is a
  decision, not a patch.
- Anything where you cannot state what you would check afterwards to know it
  worked. If you cannot name the evidence, you are not ready to ship it, and
  that is a thinking problem rather than a permission problem.

Authority is not licence to skip the discipline. The verification standard goes
UP as the asking goes down, because the check is now the only thing between a
mistake and a student.

### Every automatic deploy passes three INDEPENDENT kinds of check

Not three runs. Three kinds. `scripts/deploy-gate.js` enforces it and refuses a
manifest that cannot show them, because this repo has already proved that a
convention does not survive a busy afternoon.

    suite     the repo's own tests, run the way a contributor runs them
    rederive  a SECOND implementation reaching the same conclusion from the raw
              artifact, written without reference to the first
    live      the deployed system observed directly, after the change is out
    mutation  a guard proven not hollow: break it on purpose and require the
              suite to go RED. A green mutation run is a FAILED check

`mutation` is mandatory and at least one of `live` or `rederive` is mandatory.
Suite plus mutation is still only this repo talking to itself, and a suite with
no mutation behind it may be green because it tests nothing.

The reason it is kinds and not repetitions is that every real defect found on
2026-09-01 and 02 was caught by a kind of check DIFFERENT from the ones passing
at the time:

    the CSP sheet lost 90 bytes a page      every semantic check passed; a CSV
                                            parse-back diff caught it
    the rewriter reformatted 23 live pages  every test passed; comparing the live
                                            body to the source caught it
    CDACDA, a key repeating inside itself   distinct, per-column and overall
                                            balance all held; periodicity caught it
    Unit 3 filed under retired lesson ids   nothing threw anywhere; comparing the
                                            storefront to the server caught it
    two guards were hollow                  the suite was green either way;
                                            mutation testing caught it

Run `--pre` before the merge, which defers `live` and still demands `mutation`.
Run it again without `--pre` after the deploy, when the live check can actually
observe something. A deploy is not finished until that second run passes.

The live check must assert something that was FALSE before the deploy. The
gate's own first manifest expected `"status":"ok"` from `/api/health`, which was
true beforehand, true during, and true if the deploy never happened, so it
verified nothing while reading like proof. Pin what the change made true: the
commit sha now serving, a byte string only the new build emits, a count that
moved. An assertion that would have passed yesterday is decoration.

Verify against live systems, never against a report, and say plainly in the same
breath what you did and what you are still unsure of.

## What this repo is

Railway-hosted progress tracking API for apcsexamprep.com, served at progress.apcsexamprep.com.
Stack: Node + Express + better-sqlite3. JWT auth for students. Fail-closed admin auth on /api/admin/* (already implemented, reuse the existing pattern). This repo also proxies Judge0 for code execution (language IDs 62/71/63). Do not modify the Judge0 subsystem without Tanner saying so explicitly for that change; the run limits in routes/judge0.js were raised on 2026-08-18 under exactly that exception, and docs/csa-exercise-pages.md carries the arithmetic and the cost model. Everything else in there stays closed.

Serves two account types:
- Teacher classes: codes like CSA-XXXX, CSP-XXXX, CYBER-XXXX. Each class row has course, mastery_threshold, retry_allowed.
- Solo student accounts: ME-XXXX codes, grouped under system classes with course = 'solo' and retry_allowed = 1.

Students are minors on name + PIN only. Zero PII posture: no emails, and no free-text student input stored anywhere, with exactly ONE named exception (the code sandbox, below). This constraint shapes the detail JSON spec below.

The exception, so it is never rediscovered as a surprise: `sandbox_programs` stores
the code a student writes in the free-practice sandbox, plus the name they give
it. Approved 2026-08-20 for that feature only, because a sandbox whose work
cannot be reopened tomorrow is a scratch pad. It is bounded on purpose: owner-only
reads and writes, no teacher or admin path to it, capped lengths, and nothing
logged. Every OTHER path in this repo still stores no student-typed text, and
adding a second exception is a decision, not a patch. See docs/sandbox.md.

### The AP Cybersecurity exam, so no session has to look it up

Every number here is checked against a first-party source that is IN THIS REPO, so
the next session can re-derive it without a network call:

- `docs/ced-snapshot/cyber-exam.txt`, College Board's own "The Exam" page for AP
  Cybersecurity, captured by `scripts/ced-watch.js`. `docs/ced-snapshot/index.json`
  carries the capture date; it read 2026-09-01 when this was written.
- `docs/ced-snapshot/exam-dates.txt`, the 2027 AP Exam schedule from the same run.
- `docs/cyber-exam-format.md`, read 2026-08-21 from the CED PDF, page 147, for the
  things only the CED states.

Fully digital in Bluebook. Two hours ten minutes, which is the sum of the two
sections rather than a figure College Board prints.

| Section | Type | Count | Weighting | Timing |
|---|---|---|---|---|
| I | Multiple-choice | 60 | 70% | 80 minutes |
| II | Free-response | 1 | 30% | 50 minutes |

First national administration: Wednesday, May 5, 2027, Session 1. Most schools,
including all of the lower 48, Hawaii and Washington D.C., begin Session 1 at 8 a.m.
local time. AP Networking is Friday, May 7, 2027, 2026-27 pilot schools only.

The single FRQ is named **Device Security Analysis**. It supplies several simulated
sources about one digital device: a set of firewall rules, several system and
application logs, a list of files with their permissions, and a device policy. The
student determines security issues and attacks, explains parts of the policy, finds
signs of attacks in the logs, configures file permissions and firewall rules, and
suggests ways to harden the device, citing evidence from the sources throughout.
`docs/cyber-exam-format.md` carries the CED's own six-source sample and its parts A
to E, including the detail that part C (iii) asks the student to WRITE a `chmod`
command. The terminal labs in `config/labs/` are practice for a graded part of this
exam, not a nice extra beside it.

**Only Skill Categories 2 and 3 are assessed on the FRQ.** An FRQ practice prompt
testing category 1 or 4 is mislabeled regardless of how good the item is.

Multiple-choice weighting is by skill category, and the CED states it as a band:

| Skill Category | Approximate MCQ weighting |
|---|---|
| 1 Analyze Risk | 25 to 40% |
| 2 Mitigate Risk | 25 to 40% |
| 3 Detect Attacks | 25 to 40% |

Category 4 Collaborate does not appear in the MCQ weighting table. All five units
are assessed in Section I.

**There are no published per-unit exam weightings.** College Board's exam page
prints the two section weightings and nothing per unit. Every per-unit percentage
circulating online is fabricated: do not put one on a page, and treat one appearing
in a generated sheet as a validator failure rather than a copy edit. The 25 to 40%
per-category band, by contrast, is CED-verbatim and may be printed as fact.

**The CED has 24 topics: 1.1-1.5, 2.1-2.4, 3.1-3.5, 4.1-4.4, 5.1-5.6.** There is no
2.5, no 3.6 and no 4.5, and the site teaches all three of those as full lessons with
their own exercises, labs and quizzes. The authority for topic numbers and titles is
the CED text extracted under `tools/ap-cyber-ced/`: `CED-UNIT1-EXTRACT.txt` and
`CED-UNITS-2-5-EXTRACT.txt`, both greppable by `TOPIC N.N`. The enumeration, and
every place the site disagrees with it, is recorded in
`docs/ap-cyber-units-2-5-ced-audit.md`.

Do not retype a topic title. Retyping is how site 3.3 and 3.4 ended up as each
other's CED topics, so that a teacher assigning "3.4 Firewalls" from the CED sent
the class to Network Segmentation. `lib/cyber-unit3-renumber.js` carries the
correction and the reason the fix has to be one single-pass callback rather than a
sequence of replaces.

**`config/cyber-topics.json` EXISTS as of 2026-09-03**, and this paragraph used to say
the opposite for the right reason: a draft named it as the authority for the 24
titles before anything created it, and naming an authority that does not exist is
worse than naming none, for exactly the reason `validate_csv.py` was worse than
nothing under the EK convention. The check comes back clean.
It is now built from the two CED text extracts above by
`tools/ap-cyber-ced/build-topics.js`, read through `lib/cyber-topics.js`, and
verified by `npm run smoke:cybertopics`, which re-derives all 24 topics a second
way (objective codes for the numbers, the UNIT AT A GLANCE tables for the titles)
and diffs to zero. The extracts remain the source; the JSON is what a generator
reads so that nobody retypes a title.

### Where the CED actually lives in this repo

The PDFs are NOT committed. `config/ced-sources.json` watches
`ap-cybersecurity-course-and-exam-description.pdf` at its College Board URL under
the id `cyber-ced-pdf` and stores only a sha256 and a byte length, on the stated
reasoning that the one question worth asking of a PDF is "did it change, go read
it". `docs/ced-snapshot/` holds the normalized visible text of the HTML sources, so
that a diff is readable.

A session looking for the CED will therefore not find a PDF, and must not conclude
the CED is unavailable. Read `tools/ap-cyber-ced/CED-UNIT1-EXTRACT.txt` and
`CED-UNITS-2-5-EXTRACT.txt` as plain text. A local download may also arrive with a
browser-suffixed name such as `ap-cybersecurity-course-and-exam-description__1_.pdf`
and may turn out to be extracted UTF-8 text despite the extension, in which case
`pdftotext` and `pdfplumber` both fail on it and a plain text read succeeds. Check
for a `%PDF` header before reaching for a PDF library, and check for a `/Root`
object before believing the header.

## Current mission

Add attempt-level progress saves for CFUs and quizzes on ap-csa and ap-csp. Today those two courses record page visits only. ap-cybersecurity already has working grade reporting into this API; port that pattern rather than inventing a new one. Everything here is additive. Never break or migrate existing visit tracking data.

## Decisions already made (do not relitigate)

### 1. Schema: one attempts table, one row per submission

```sql
CREATE TABLE attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  course TEXT NOT NULL,           -- 'ap-csa' | 'ap-csp' | 'ap-cybersecurity'
  lesson_id TEXT NOT NULL,        -- '1.2'
  item_id TEXT NOT NULL,          -- '1.2-cfu-3', '1.2-quiz'
  item_type TEXT NOT NULL,        -- 'cfu' | 'quiz'
  score REAL NOT NULL,
  max_score REAL NOT NULL,
  passed INTEGER NOT NULL,        -- computed server-side, see mastery rules
  attempt_no INTEGER NOT NULL,
  duration_seconds INTEGER,       -- client-computed: item render to submit
  ua TEXT,                        -- server-captured User-Agent, truncated to 120 chars
  detail TEXT,                    -- JSON, see PII rule below
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_attempts_student_item ON attempts(student_id, item_id);
CREATE INDEX idx_attempts_class ON attempts(class_id);
```

Per-question results live inside the detail JSON, never as separate rows. Format: array of objects with question index, selected option index, and correct flag, e.g. `[{"q":1,"sel":2,"ok":true}]`. Option indices and booleans only. No answer text, no student-typed strings. If Judge0-backed code exercises ever report grades, store test-case pass counts only, never student source code. GRADED code is never stored; the sandbox exception above covers ungraded practice work only, and the two must not be merged. Thirty students finishing a 10-question quiz is 30 inserts, not 300.

Column vs JSON rule: real columns are for fields aggregated in SQL (duration_seconds gets queried constantly). Exploratory or per-question extras ride inside detail JSON at zero schema cost: per-question tries where a widget allows in-item retries, and a focus_lost counter later if a tab-switching integrity signal is wanted. Do not pre-add speculative columns; ALTER TABLE ADD COLUMN in SQLite is trivial later.

### 1b. One gradebook contract for every course

Read `docs/gradebook-contract.md` before touching a gradebook, adding a course, or
adding an activity type. `lib/gradebook-contract.js` is the normalizer and the ONLY
place course-specific shape is interpreted; everything downstream reads one
course-agnostic contract. A view that branches on the course is a bug in the
normalizer, not in the view.

The grade is `earned / graded` (points over attempted work), never `earned / possible`.
Pace is a separate number. Nothing attempted is `pct: null`, never `0`. Not attempted
and scored zero are different facts and must never render alike.

The teacher route and `GET /api/admin/class/:id/gradebook/as-teacher` call the same
builder with the same arguments, so the operator view cannot drift from the teacher
view. Do not add a second implementation of either.

**Status, checked 2026-09-03: the points model is IN the code, and board task 85 is
stale as written.** `lib/admin-gradebook.js` computes the overall grade as
`pct(earnedSum, possibleSum)` and reports `basis: 'points'`, and its own comment
describes percentage-averaging in the past tense together with the worked example
that motivated the change: a cyber student on 0/7, 7/8 and 5/5 plus two unpriced
zeroes read 38% on the operator page and 60% on the teacher's, because the mean
counted two columns nobody had priced as whole assignments. A mean of percentages
survives only as a labelled fallback, `basis: 'percent'`, for a class where nothing
has points assigned at all.

Board task 85 still reads "replace percentage-averaging with points-based
three-denominator model" and still sits in the `bleeding` bucket. Do NOT close it on
the strength of this paragraph. The board is the authority on what is left, and the
resolution the discrepancy asks for is a live gradebook response attached to a run
note, produced by a session that is not the one that would do the rebuild. What is
established here is a code read anyone can re-derive, which is not an observation of
production. `GET /api/admin/class/:id/gradebook` is fail-closed and answered
`403 {"error":"Invalid or missing admin key."}` to a session holding only
`COMMAND_READ_TOKEN` and `TODO_KEY`, so that live check needs the admin key and has
not been done.

### 2. Manifest table replaces the ?total denominator

```sql
CREATE TABLE course_manifest (
  course TEXT NOT NULL,
  unit TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL,        -- 'visit' | 'cfu' | 'quiz'
  points REAL NOT NULL DEFAULT 1,
  PRIMARY KEY (course, item_id)
);
```

The manifest is the single authority for denominators and max scores. All percentages on every endpoint compute against it, so admin stats, teacher dashboards, and student views can never disagree. Adding a lesson later is a manifest row, not a code change.

The existing ?total=NN query param on /api/admin/student/:id becomes accepted-but-ignored once the manifest exists. Do not 400 existing callers; the admin tracker page still sends it and gets updated separately.

Seed data: ap-csa has 53 lessons across Units 1-4 (2025-2026 CED, 4-unit structure only; the old 10-unit curriculum must never appear in manifest data or item IDs). ap-csp has 35 lessons across Big Ideas 1-5. Seed visit items for both full courses plus cfu/quiz items for CSA Unit 1 (the pilot). Manifest grows as reporters go live on more units.

### 3. Retry and mastery: server enforces policy, client only submits

- Store every submission. attempt_no = count of prior attempts for that (student_id, item_id) + 1.
- Grade of record: first attempt when class.retry_allowed = 0, best score ratio when retry_allowed = 1.
- passed = (score / max_score) * 100 >= class.mastery_threshold. The stored passed column is a write-time snapshot only; all rollups and dashboards recompute passed and grade-of-record at read time against the class's current mastery_threshold and retry_allowed, so teacher settings changes apply retroactively with zero migration. Never hardcode 80.
- Solo (ME-) accounts already have retry_allowed = 1, so they get best-attempt behavior for free.

### 4. Endpoints

**POST /api/progress/attempt** (JWT student auth)

Request body:
```json
{
  "course": "ap-csa",
  "lesson_id": "1.2",
  "item_id": "1.2-quiz",
  "item_type": "quiz",
  "score": 8,
  "max_score": 10,
  "duration_seconds": 412,
  "detail": [{"q":1,"sel":2,"ok":true}]
}
```

Server derives student_id and class_id from the JWT, and captures ua itself from the request User-Agent header (truncate to 120 chars; nothing client-side needed). Course validation: must equal class.course, except when class.course = 'solo', in which case the client-sent course is used. Validate (course, item_id) exists in course_manifest and reject unknowns; this blocks junk writes and typo'd IDs from pages. Validate 0 <= score <= manifest points; manifest points is the max_score authority. Light rate limiting on this route.

Response: `{"recorded":true,"attempt_no":2,"passed":true,"grade_of_record":{"score":8,"max_score":10,"attempt_no":2}}`

**GET /api/admin/student/:id** (extend existing)
Return per-lesson visit status plus grade-of-record scores per item, with percentages computed against the manifest.

**GET /api/admin/class/:id/gradebook** (new)
Class rollup: students as rows, per-lesson aggregates as columns. Must be a single aggregate SQL pass. No N+1 loops; reads are the heavy path here, not writes.

**PATCH /api/teacher/class/:id** (new)
Editable fields: class_name, mastery_threshold (integer, clamp 50-100), retry_allowed (0/1), active (0/1). Must verify authenticated teacher ownership of the class. If current dashboard access is read-only via class code or a shared token, add a proper teacher-scoped write credential before exposing any mutation; a student holding a class code must never be able to reach these routes. Fail closed, same posture as /api/admin/*.

**Roster endpoints** (same teacher ownership auth)
- GET /api/teacher/class/:id/students (may already exist for the dashboard; reuse if so)
- PATCH /api/teacher/class/:id/student/:sid accepting {name, active}. Deactivate only, never hard-delete: attempt history is gradebook data and always survives.
- POST /api/teacher/class/:id/student/:sid/reset-pin returns a fresh PIN.

The dashboard settings UI panel is a fast-follow after the CSA Unit 1 pilot. Only the API side lands in this pass.

### 5. Performance constraints (non-negotiable)

- Railway hard caps: 1 vCPU, 1 GB RAM, target spend ~$30/month. A prior memory leak caused a $169 spike; be paranoid about unbounded arrays, event listener accumulation, and anything that grows per-request.
- Confirm PRAGMA journal_mode = WAL and set busy_timeout on the better-sqlite3 connection.
- Reuse prepared statements at module scope.
- One insert per submission. Never per-question rows.

### 6. Frontend reporter contract (lives in APCSExamPrep-theme repo)

A shared reporter script following the apcs-tracker.js pattern hooks the existing check-answer and quiz grade handlers on lesson pages: when a CFU or quiz is graded client-side, compute score and POST once to /api/progress/attempt. The script reads data-lesson-id and data-item-id attributes from the page wrapper.

File ownership: this Claude Code session is the owning agent for utils.js, student.js, and the new reporter file. The versions here are canonical. Other agents are pointed away from these files.

Before any theme work, read the theme repo's own CLAUDE.md. The one fact that
keeps costing sessions a deploy: the published theme is connected to the branch
`claude/site-linking-audit-yhufjk`, NOT `main`. Merging a theme pull request into
`main` deploys nothing, and the storefront keeps serving the old file while the
PR reads as shipped. Verify against the live URL, never against `main`.

**DO NOT run the fast-forward command this file used to give here.** It said to
run `git push origin origin/main:refs/heads/claude/site-linking-audit-yhufjk`,
and that is backwards. Checked against the API on 2026-09-01: theme `main` is at
`4735f4a`, the connected branch is at `6664a8f`, and `4735f4a` is an ANCESTOR of
the connected branch. The connected branch is **46 commits AHEAD of main**, not
behind it.

So that push moves the published branch BACKWARD by 46 commits. Git refuses it
as a non-fast-forward, which is the only reason this has not already cost a
storefront. The danger is the next step: a rejected push invites `--force`, and
forcing it would rewind the live theme by 46 commits in one command.

**The recipe that is actually in use.** Established 2026-09-01 by reading the
base branch of the 40 most recently merged theme pull requests, not by reading
anybody's description of the process:

    33 of 40 targeted claude/site-linking-audit-yhufjk
     7 of 40 targeted main, and all seven are older
    the last PR to target main was #71 on 2026-08-24
    every one of the 21 merged since then targeted the connected branch

So theme work reaches the storefront the ordinary way: **open the pull request
against `claude/site-linking-audit-yhufjk` and merge it there.** That is why the
connected branch runs ahead of `main`, and why `main` lags: nothing merges into
`main` any more. No push incantation is needed and none should be invented.

Three things follow, and the first is the one that bites:

- **Merging that PR deploys to the live storefront immediately.** The theme repo
  has no CI, so the merge IS the deploy and there is no gate between the click
  and a student's page. Merge deliberately, and verify against the live URL.
- **Retarget, do not rebase.** A branch cut from the connected branch and opened
  against `main` reads as dozens of files and dozens of commits, because it is
  showing the gap between the branches rather than the change. PR #91 hit exactly
  this and was retargeted; against the correct base the same diff was one file.
- `main` is not dead, it is just not the deploy path. PR #69 reconciled `main`
  into the connected branch once, which is how its content got there.

**What this does NOT establish.** Shopify Admin is the only authority on which
branch is connected; the branch name here is inferred from consistent practice
and could be changed there without any signal in this repo. If a deploy does not
appear, check Shopify Admin before trusting this paragraph. Repointing the theme
at `main` remains the real fix and is a human action. Board task 141.

Exception, apcs-tracker.js: this repo is NOT canonical for it. The deployed asset lives in the APCSExamPrep-theme repo at assets/apcs-tracker.js and reaches the storefront through Shopify two-way GitHub sync, so the theme repo is the only source of truth. shopify/apcs-tracker.js here is a byte-identical mirror for reference. Any change to tracker behaviour ships as a theme PR first, then the mirror is re-synced in the same pass. Never edit the mirror on its own and never upload it to Shopify by hand.

## Out of scope for this repo

- Injecting data-lesson-id / data-item-id attributes into Shopify page Body HTML (ships via Matrixify CSVs, handled in the Claude chat project).
- The broken check-answer flows on CSA 1.2 and 1.3 pages (page HTML, same chat-side pipeline). Assume they get fixed before the pilot; the reporter just hooks whatever the fixed handlers emit.
- Judge0 proxy code.
- Assignments and due dates ("complete 1.1 through 1.3 by Friday"). The most-requested teacher feature after gradebooks and a natural post-launch build: small table, no student-data implications. Do not build it in this pass.
- Co-teacher or TA access on a class. Deliberately excluded: the first "can I add my co-teacher" request is the trigger for the per-school licensing conversation, not a settings toggle.

## Build order

1. Migration: attempts + course_manifest + indexes. Seed script for manifest (both courses' visit items, CSA Unit 1 cfu/quiz items).
2. POST /api/progress/attempt with manifest validation.
3. Extend /api/admin/student/:id, add /api/admin/class/:id/gradebook, add PATCH class settings and roster endpoints.
4. Reporter script in the theme repo, pilot on CSA Unit 1.
5. CSP full course, then CSA Units 2-4 as attributes land via Matrixify.

Deadline anchor: both courses fully wired by early August 2026, ahead of the fall traffic ramp and the September 1 Cyber offer deadline.

## Conventions

- Additive migrations only. Never destructive operations against the production SQLite file.
- Small commits. Pushing to main deploys via Railway's GitHub integration; verify the deploy branch config before the first push.
- Claude Code merges its own pull requests once CI is green, without asking. Work
  still lands on a branch behind a PR, never straight to main, and merging is
  still a deploy: say what was merged and check that production reports the new
  commit after it lands. Before merging, confirm the SHA CI passed on is the SHA
  you are merging. PR #435 auto-merged an older commit while a newer push was
  still in flight, and only the tested half shipped.
- **That "once CI is green" is now enforced, not trusted.** A ruleset on `main`
  requires the `Offline smoke suites` check, so a red or still-running suite blocks
  the merge button for a human and the API alike. It was a convention until
  2026-09-01 and conventions do not survive a busy afternoon: PR #428 was merged at
  16:59:01 while its own test run, started 16:57:19, was still going.
  The reason it has to be a gate rather than a habit is a race nobody can win by
  being careful. Both workflows fire from the same push, and the deploy is roughly
  five times faster than the suite:

      push ae460f3      16:36:10
      deployed          16:37:04   railway-deploy, about 55 seconds
      first CI verdict  16:41:03   tests, about 4.5 minutes

  So production ran that commit for 3m59s before anything had judged it, and that
  window opened on every merge. Measured across runs 80 to 82 and 1024 to 1028; it
  is structural, not a slow day. A gate before the merge is the only place that
  beats the race, because it is the only point that happens before the deploy
  starts.
  To land an emergency fix, flip the ruleset's Enforcement to Disabled, merge, and
  turn it back on. There is deliberately no standing bypass, so that skipping the
  suite is always a visible act rather than a quiet one.
- Every Shopify page change ships as a Matrixify sheet. Not an Admin API
  mutation, not a hand edit in the admin, and not `POST /api/admin/*/publish`:
  those endpoints exist and are the exception a human asks for explicitly, never
  the default. A sheet is reviewable before it lands, re-runnable in MERGE mode
  after a partial import, and it is the one path that has not silently truncated
  a live body. Generate it, read the refusals, import it once.
- Never put CED Essential Knowledge codes in front of students. The code is
  teacher knowledge: write "secure information, such as a one-time password",
  not "secure information (1.1.C.2)". A code earns its place only where it is
  evidence for a claim (this is not assessed, that belongs to Unit 2), in the
  collapsed coverage table a teacher audits, or in a teacher-facing answer key.
  The rebuilt Topic 1.1 lesson shipped with 218 of them in student-visible text
  before anyone noticed, and AP CSP handout exercise pages are shipping them
  today. `docs/ap-cyber-unit1-ced-realignment.md`, under "Citing the CED to
  students", has the full rule. `lib/cyber-ek-density.js` is the module that
  finds them and knows which placements are protected; go through it rather
  than writing a second opinion about the convention.
  `tools/ap-cyber-ced/validate_csv.py` does NOT count them, whatever this file
  said until 2026-09-02: it has no EK check at all and is shaped for AP
  Cybersecurity page structure. Naming the wrong tool here is worse than naming
  none, because the check comes back clean.
  The sheet validator DOES count them, as rule 1, and it routes through
  `lib/cyber-ek-density.js` rather than holding a second opinion.
- **Fetch the storefront through `lib/storefront-fetch.js`, and send no
  User-Agent.** The bot management inverted on 2026-09-03: a request claiming to
  be a browser gets 403, and bare curl gets 200. That is the opposite of what it
  used to do, and every live verifier in this repo was carrying a browser UA as
  a workaround for the old behaviour.
  The reason it needs a rule rather than a fix is the shape of the failure. The
  403 body is a small "Verifying your connection" page containing none of the
  strings a check looks for, so every assertion of the form "this string is gone
  now" passes on it and every "this string is present now" fails. Three
  verifiers reported a confident, plausible, entirely false regression:
  `verify-cc-pacing-live` said 4 of 8 assertions failed, and
  `verify-csp-applied-cards-live` said all 17 Applied Challenge pages served 0
  of 6 questions. All of it was live and correct.
  So the module refuses a body that is not provably a rendered page, on a
  positive marker the challenge cannot fake. A negative assertion can never pass
  because the fetch quietly failed. `smoke:storefront` scans every
  `scripts/verify-*-live.js` and fails if one sends a User-Agent again.
  Twenty eight other scripts still spoof one. The CSV generators go through
  `scripts/extract-live-body.js`, which throws on the challenge body, so they
  fail loudly rather than writing a sheet from it. The SWEEPS will report the
  whole site as broken until they are moved over.
- Any page set larger than about three ships as four things: canonical data, a
  generator, a validator, and a Matrixify sheet. Hand-authoring structurally
  identical pages is how drift enters, and the drift is never in the page you are
  looking at. The validator refuses a sheet carrying a CED Essential Knowledge code
  in student-visible text, a fabricated per-unit exam weighting, an em-dash, a title
  that does not match canonical data byte for byte, a Body HTML column on a row not
  receiving a body update, an unresolvable internal link, or mojibake.
- Generate the sheet, then PARSE IT BACK and diff against the source spec.
  Generation is not evidence that generation worked. The CSP sheet lost 90 bytes a
  page while every semantic check passed, and a parse-back diff is what caught it.
- Validators get mutation tested, and a green mutation run is a FAILED check. Break
  each rule on purpose and require the suite to go red per rule INDEPENDENTLY, not
  in aggregate: a suite that goes red for a different rule is telling you the rule
  you meant to test is hollow. Two guards here were found hollow on 2026-09-02 and a
  third on 2026-09-03, which is why this is a convention rather than a suggestion.
- **The mojibake rule, and why the obvious version of it is wrong.**
  `smoke/encoding-guard.js` is the guard and `npm run smoke:encoding` runs it. Its
  method is right and worth understanding before touching it: mojibake is
  REVERSIBLE, so take a run of suspicious characters, encode it back through a
  single-byte codec, decode that as UTF-8, and if the result is one different
  character then the text was corrupted and you have just recovered the original.
  Nothing about the shape of the text proves this. Only the round trip does, which
  is why double-encoded text passes every other check in the repo: it is still
  perfectly valid UTF-8, it parses, it lints, it serves, and the only thing wrong
  with it is that it means the wrong character.

  Two depths of corruption exist and they look nothing alike. UTF-8 bytes read as
  cp1252 and re-encoded is SINGLE pass. Doing that twice is double pass. Written as
  codepoints, because writing them as characters would put real mojibake in this
  file and turn the guard red on its own repository scan:

      intended         single pass                   double pass
      U+2022 bullet    E2 80 A2 read as              C3 A2 E2 82 AC C2 A2 read as
                       U+00E2 U+20AC U+00A2          U+00C3 U+00A2 U+00E2 U+201A U+00AC U+00C2 U+00A2
      U+1F3AF target   U+00F0 U+0178 U+017D U+00AF   U+00C3 U+00B0 U+00C5 U+00B8 U+00C5 U+00BD U+00C2 U+00AF
      U+00E9 e-acute   U+00C3 U+00A9                 U+00C3 U+0192 U+00C2 U+00A9

  Measured 2026-09-03, and the measurement is the whole point. The guard as shipped
  catches every DOUBLE-pass case and misses single-pass bullet, emoji and triangle.
  Its lead set is only U+00C2, U+00C3 and U+00E2, and it encodes through latin-1
  only. Single-pass corruption of a 3- or 4-byte character starts at U+00E0 to
  U+00F4, outside that set, and its continuation bytes land on cp1252 punctuation
  such as U+20AC, which latin-1 cannot express, so the round trip is never even
  attempted. The 2026-08-07 incident it was built for was double-pass, so it has
  always looked complete.

  A tempting general rule, "any U+00C3 followed by U+0080 to U+00BF", is WORSE
  rather than better. It misses single-pass bullet, emoji and triangle exactly as
  the guard does, and additionally misses double-pass e-acute and double-pass
  non-breaking space. Do not swap it in for the round trip.

  **SHIPPED 2026-09-03 in PR #482.** The gap above is closed exactly as described:
  the lead set is the whole class U+00C2 to U+00F4, there is a cp1252 encoder beside
  latin-1, and the chunk width is DERIVED from the lead byte rather than guessed, so
  a 4-byte emoji reverses. The detector moved to `lib/mojibake.js` and the guard,
  `lib/site-crawl.js` and the two CED tools in `tools/ap-cyber-ced/` all call it.

  Three things the measurement above did not predict, all found while shipping it:

  - **The guard was not only incomplete, it was reporting this repo clean while
    four tracked files were corrupted**: 65 characters in
    `tools/ap-cyber-ced/CED-UNIT1-EXTRACT.txt`, a corrupted emoji in the hazard note
    that teaches agents what mojibake is, and pasted fixtures and pattern lists in
    `smoke/site-crawl.js` and `verify_import.py`. All repaired.
  - **Neither codec subsumes the other.** Each reverses 27 code points the other
    cannot: latin-1 alone reaches the C1 controls that the latin-1 flavour is made
    of, cp1252 alone reaches the euro sign, curly quotes, dashes and bullet. Drop
    either and a whole flavour goes invisible. Asserted in the suite as 27 and 27,
    because the first draft of the module claimed superset in a comment and was
    wrong.
  - **A perfect reversal can still be nonsense.** A capital O-diaeresis followed by
    an en dash is valid UTF-8 for a Hebrew combining accent, so the finished
    detector called three of Shopify's own locale files corrupt. Mojibake corrupts
    everything it touches, so it arrives in RUNS; a 2-byte candidate whose lead is
    outside U+00C2-U+00C3 is now accepted only if it abuts another accepted
    candidate. Restricting the lead set instead was measured and rejected: it costs
    depth-2 emoji recovery.

  **A mutation test for this rule must inject SINGLE-pass mojibake.** A mutation
  built from the double-pass form goes red against a guard that is blind to the bug
  actually seen on live pages, and that green report is worse than no report at all.
  Assert both depths independently. `deploy-gates/2026-09-03-mojibake-validator.json`
  carries seven that do, including one proving the U+00C3 rule insufficient.

  The suite GENERATES its cases from a damage simulator over a character corpus at
  both depths in both flavours, rather than listing known-bad strings, so it catches
  characters nobody has reported yet. `scripts/mojibake-rederive.js` is a second
  implementation that must agree, and `npm run smoke:mojibakeparity` fails if the
  Python port drifts from the JavaScript.

  **One consumer was missed by that migration, and it was the one that mattered
  most.** `scripts/matrixify-preflight.js` kept three hardcoded LATIN-1 lead pairs
  of its own (U+00E2 U+0080, U+00C3 U+00A2, U+00F0 U+009F) until 2026-09-04. Every
  Shopify page change ships as a Matrixify sheet, so that preflight is the gate
  between authored content and a live page body, and a sheet out of Excel carries
  the CP1252 flavour, where those leads read U+00E2 U+20AC and U+00F0 U+0178. None
  of the three matched, so the corruption reported on a live page would have
  imported without complaint. Its own smoke fixture was built in the latin-1
  flavour too, so the guard and its test shared one blind spot and agreed with each
  other, which is the same failure as the handoff draft one directory over. It
  calls the module now. When a module lands, the MIGRATION is the change: grep for
  the retired pattern across every consumer before calling a consolidation done.
- **AP Cybersecurity topics come from `config/cyber-topics.json`**, read through
  `lib/cyber-topics.js`, and from nowhere else. It exists as of 2026-09-03: 24 CED
  topics with their official titles (parsed from the CED text, never retyped),
  slugs, skill categories, gradebook lesson ids, live handles, and the one
  `course_manifest` row each topic gets. `npm run cyber:topics` rebuilds it and
  `--check` refuses a hand-edit. Cyber page sheets are built by
  `tools/ap-cyber-ced/generate-sheet.js` and refused by
  `tools/ap-cyber-ced/validator.js` on the seven rules named above, every one of
  them mutation tested per rule; its rule 7 goes through `lib/mojibake.js` for the
  same reason its rule 1 goes through `lib/cyber-ek-density.js`. Read
  `docs/ap-cyber-taxonomy-and-validator.md` before generating a cyber page,
  adding a topic, or adding a rule.
  The 1.3 versus 1.4 swap is what these exist for: the site calls topic 1.3
  "Wireless Security" and the CED calls it "Best Practices for Public Networks",
  because the mapping used to live in page bodies.
- **NOTHING THE SERVER READS MAY LIVE IN `data/`.** The Railway volume mounts
  there, at `/app/data`, and a mount REPLACES the directory: a file that is
  tracked in git, not gitignored, and uploaded in the deploy tarball is still
  invisible to the running container. That is not a hypothesis. The taxonomy
  shipped as `data/cyber-topics.json` on 2026-09-03 and production answered
  `cannot read /app/data/cyber-topics.json: ENOENT` while every repository-side
  check said the file was there, because every one of them was looking at the
  repo rather than at the container. 24 manifest rows silently did not land, and
  the boot seed's own failure went to a log an agent cannot read.
  Runtime config belongs in `config/`, beside `ced-sources.json` and `labs/`. The
  volume is for state the container WRITES, which is the SQLite database, and for
  nothing the repo ships. `npm run smoke:volumepaths` refuses a tracked file
  under `data/` and any runtime module that resolves a path into it.
  The README says the mount path is `/data`. The runtime says `/app/data`. The
  runtime wins.
- Mojibake is detected with `lib/mojibake.js`, never with a pasted pattern. Go
  through the module the same way EK codes go through `lib/cyber-ek-density.js`.
  The section above has the method and what shipped; the reason it is a rule is
  that a handoff on 2026-09-03 told a future session to reject two literal
  strings and both were the DOUBLE corrupted form, so the rule would have missed
  the single corrupted form actually reported on a live page. A pattern list
  cannot tell you it has stopped working.

- A `.pdf` extension is not evidence of a PDF. Check for the `%PDF` header
  before reaching for `pdftotext` or `pdfplumber`, because a CED file that is
  really extracted text will make the parser fail and make a session conclude
  the CED is unavailable when it is sitting right there. The extracts in
  `tools/ap-cyber-ced/` are correctly named `.txt`; the mis-extensioned copy
  reported on 2026-09-03 is in the Claude project, not in this repo, so this is
  a check to run rather than a fact about a path.
  `CED-UNIT1-EXTRACT.txt` had 65 mojibake characters repaired on 2026-09-03.
  Its em-dashes and curly quotes are College Board's verbatim wording, so the
  no-em-dash convention above does not apply to it: that rule governs text we
  author, and re-flattening a quoted source is a corruption, not a fix.
- **Content arriving from the Claude chat project is a PROPOSAL, not a source.**
  That surface does not have this repo, so every file path, filename, identifier
  and topic number in it is a recollection rather than a reading, and it arrives
  with the same confidence either way. Open each one before landing it.
  The CLAUDE.md additions of 2026-09-03 carried four wrong claims and three were
  exactly this: a `data/cyber-topics.json` that had never existed, named as "the
  only authority" for the 24 topic titles (the file exists now, as
  `config/cyber-topics.json`, built by PR #483; it was moved out of `data/`
  because the volume mounts there and hid it from the container); a topic swap attributed to 1.3 and 1.4
  when the audit records it at 3.3 and 3.4; and a CED PDF described as being in
  this repo when only its sha256 is. None of the three was careless. All are
  structural, and the structure does not improve with more care on that side.
  The fourth kind is worse, because it survives review: a claim about what a
  CHECK covers. Verify that by RUNNING the check against the case, never by
  reading its comment or its rule list. Both mojibake validators in this repo
  read as complete and both have holes.
  This cuts the same way against a session's own output, and twice on 2026-09-03
  alone. The exercise-design section below was written here, confidently, hours
  after `docs/exercise-design-proposal.md` had already refuted it. And a session
  spent an afternoon rebuilding the mojibake detector that another session had
  already rebuilt better, on this same branch, because it read the code and not
  the log. Whoever wrote it is not the variable; whether it was opened is.
- **Nothing shipped may read as machine-written.** This is an acceptance
  criterion on every page, email, blog post and lesson, stated by Tanner on
  2026-09-03 alongside "as long as it does not come up as an error". A teacher
  who thinks a lesson was generated stops trusting the course, and that judgement
  happens in the first paragraph and is not recoverable by being correct
  underneath.
  The em-dash rule below is one instance of this and the most famous tell, not
  the whole of it. The others, in rough order of how much they give away:
  - The three-part list used as a rhythm rather than because there are three
    things. Two is usually the honest count and one is often enough.
  - "It is not just X, it is Y." Also "more than a Z", "at its core",
    "fundamentally", "the reality is".
  - Signposting a paragraph before writing it: "Let us look at three reasons."
    Write the reasons.
  - Reflexive hedging on a fact that is known. Say it or check it.
  - Vocabulary a teacher would not use out loud: delve, leverage as a verb,
    seamless, robust, holistic, unlock, elevate, navigate a challenge, in today's
    fast-paced world.
  - A closing paragraph that restates the opening in different words.
  - Every section the same length, every bullet the same shape. Real writing is
    lumpy because some points need more room than others.
  The test is to read it aloud. If it sounds like a brochure rather than a person
  who teaches this for a living, it fails, and no amount of technical accuracy
  fixes it. This applies to a run note and a commit message too, just with a
  lower bar: those are read by people who work here.
- No em-dashes in any prose, comments, commit messages, or user-facing strings.
- AP CSA references use the 2025-2026 4-unit structure exclusively.

## Public and premium assessment content must not share items

Three tiers, and the distinction between the first and the third is the one that
matters.

1. **Public practice.** Topic quizzes, practice exams, QOTD. Open, indexed,
   rationale shown. This is the SEO engine, and gating it would be a strategic error
   rather than a security improvement.
2. **Auto-graded coursework.** Lesson quizzes scored server-side, identity-aware,
   keys never in page source.
3. **Premium teacher assessments.** Unit tests plus keys. Gated, noindex, premium
   only.

**Tiers 1 and 3 must draw from disjoint item banks.** A gated unit test built out of
items that also appear in the public practice set is not gated, it is inconvenient.
Any task that adds a premium assessment therefore carries the obligation to author
new items rather than reuse public ones, and the overlap check that enforces it
fails at overlap greater than zero, not at some tolerable fraction.

Visual locking is not gating. A link whose URL sits in the page body is public no
matter what the CSS does to it.

## The exercise design standard

An exercise that exists only to demonstrate an operator teaches the operator and
nothing else. Divide two ints, then one of each, then repeat the whole pair for
casting: the student learns the syntax and builds no intuition about when it
matters.

Every exercise produces a small working artifact, and the topic is the tool that
artifact needs. Integer division and modulus become a change maker. Casting becomes
a grade average that has to round rather than truncate. Compound booleans become a
login validator. Exercise 1 builds a piece, Exercise 2 assembles the lesson into one
working program.

Structure with PRIMM: predict, run, investigate, modify, make. Parsons problems are
the rung between reading code and writing it, for the students who stall at a blank
editor.

`docs/exercise-design-proposal.md` is the worked version of everything above, with
the five rewritten CSA exercises, the `studio` activity type, and a recommended
build order. Read it before scoping any of this; it landed on `main` the same day
this section did.

**The fork is which SHAPE the artifact is, and it decides the infrastructure. It is
not a blocker, and an earlier draft of this section said it was.** Two shapes:

- **A one-period autograded exercise does NOT need the sandbox and should not use
  it.** It uses what the 53 existing CSA exercise pages already use: `program` or
  `driver` mode in `lib/csa-code-modes.js`, hidden test cases, and the code-grading
  contract where source is graded in transit and then DISCARDED, never stored. A
  bigger exercise is a longer version of that shape, not a different one, so it
  adds zero new PII surface and needs no Judge0 exception. What it needs built is
  the activity type, a manifest row generator, and a verifier that checks each
  stated requirement rather than only final stdout.
- **A multi-day, personally-owned project is what the sandbox is already for,
  today, with no new capability required.** It already runs Java for CSA and Python
  and JavaScript for CSP, and already persists work and reopens it tomorrow. It
  needs POINTING AT rather than building: `docs/sandbox.md` names both real gaps
  itself, that it is not linked from the storefront and has no teacher visibility.
  Closing the first is theme work and touches the PII posture not at all.

So one artifact cannot be both, and that is the whole content of the fork: graded
code is discarded by contract, sandbox work persists by design. Which need you are
serving picks the shape, and the shape picks the infrastructure.

**The one genuinely open decision is teacher visibility into sandbox work**, and it
is Tanner's. Grading or even reviewing a multi-day capstone needs either a standing
teacher read of `sandbox_programs` or a student-initiated snapshot into something a
teacher can see. Strictly neither is a SECOND PII exception, since the text already
sits in that table under the one exception this project has, but both expand what
that exception covers, and `docs/sandbox.md` already says adding a teacher or admin
path is a decision and not a patch. The proposal recommends the student-initiated
snapshot over a standing read, and flags its own recommendation as the human's call.
Do not scope `studio` or capstone work to depend on a teacher seeing it until that
decision is made.
