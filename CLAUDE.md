# CLAUDE.md - APCSExamPrep Progress API

## What this repo is

Railway-hosted progress tracking API for apcsexamprep.com, served at progress.apcsexamprep.com.
Stack: Node + Express + better-sqlite3. JWT auth for students. Fail-closed admin auth on /api/admin/* (already implemented, reuse the existing pattern). This repo also proxies Judge0 for code execution (language IDs 62/71/63). Do not modify the Judge0 subsystem.

Serves two account types:
- Teacher classes: codes like CSA-XXXX, CSP-XXXX, CYBER-XXXX. Each class row has course, mastery_threshold, retry_allowed.
- Solo student accounts: ME-XXXX codes, grouped under system classes with course = 'solo' and retry_allowed = 1.

Students are minors on name + PIN only. Zero PII posture: no emails, no free-text student input stored anywhere, ever. This constraint shapes the detail JSON spec below.

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

Per-question results live inside the detail JSON, never as separate rows. Format: array of objects with question index, selected option index, and correct flag, e.g. `[{"q":1,"sel":2,"ok":true}]`. Option indices and booleans only. No answer text, no student-typed strings. If Judge0-backed code exercises ever report grades, store test-case pass counts only, never student source code (code is free text, and free text is never stored). Thirty students finishing a 10-question quiz is 30 inserts, not 300.

Column vs JSON rule: real columns are for fields aggregated in SQL (duration_seconds gets queried constantly). Exploratory or per-question extras ride inside detail JSON at zero schema cost: per-question tries where a widget allows in-item retries, and a focus_lost counter later if a tab-switching integrity signal is wanted. Do not pre-add speculative columns; ALTER TABLE ADD COLUMN in SQLite is trivial later.

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

File ownership: this Claude Code session is the owning agent for utils.js, apcs-tracker.js, student.js, and the new reporter file. The versions here are canonical. Other agents are pointed away from these files.

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
- No em-dashes in any prose, comments, commit messages, or user-facing strings.
- AP CSA references use the 2025-2026 4-unit structure exclusively.
