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
- No em-dashes in any prose, comments, commit messages, or user-facing strings.
- AP CSA references use the 2025-2026 4-unit structure exclusively.
