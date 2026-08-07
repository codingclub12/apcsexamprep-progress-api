'use strict';
const Database = require('better-sqlite3');
const path = require('path');

const fs = require('fs');
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'progress.db');
fs.mkdirSync(require('path').dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);

// Performance settings
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('foreign_keys = ON');

// ── SCHEMA ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS teachers (
    id           TEXT PRIMARY KEY,
    email        TEXT UNIQUE NOT NULL COLLATE NOCASE,
    name         TEXT NOT NULL,
    school       TEXT,
    password_hash TEXT NOT NULL,
    verified     INTEGER DEFAULT 0,
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS classes (
    id                TEXT PRIMARY KEY,
    teacher_id        TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    class_code        TEXT UNIQUE NOT NULL,
    class_name        TEXT NOT NULL,
    course            TEXT NOT NULL DEFAULT 'ap-cybersecurity',
    active            INTEGER DEFAULT 1,
    mastery_threshold INTEGER DEFAULT 80,
    retry_allowed     INTEGER DEFAULT 0,
    created_at        TEXT DEFAULT (datetime('now'))
  );

  -- Migration: add mastery_threshold / retry_allowed to existing classes tables
  -- (handled below via try/catch ALTER TABLE)

  CREATE TABLE IF NOT EXISTS students (
    id             TEXT PRIMARY KEY,
    class_id       TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    display_name   TEXT NOT NULL,
    pin_hash       TEXT NOT NULL,
    student_ref    TEXT,
    retry_override INTEGER DEFAULT NULL,
    active         INTEGER DEFAULT 1,
    created_at     TEXT DEFAULT (datetime('now')),
    last_active    TEXT
  );

  CREATE TABLE IF NOT EXISTS progress (
    id            TEXT PRIMARY KEY,
    student_id    TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id      TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    course        TEXT NOT NULL,
    unit          TEXT NOT NULL,
    lesson        TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    completed     INTEGER DEFAULT 0,
    score         INTEGER,
    attempts      INTEGER DEFAULT 0,
    confidence    INTEGER,
    time_spent_s  INTEGER,
    locked        INTEGER DEFAULT 0,
    -- When a teacher resets this activity's grade from the gradebook. Scored
    -- submissions logged at or before this moment are excluded from the grade of
    -- record, so the student's next attempt starts a clean slate. NULL means no
    -- reset has happened. Nothing is deleted: the pre-reset attempts stay in
    -- score_events and still show in GET /api/student/history, marked pre-reset.
    score_reset_at TEXT DEFAULT NULL,
    completed_at  TEXT,
    updated_at    TEXT DEFAULT (datetime('now')),
    UNIQUE(student_id, course, unit, lesson, activity_type)
  );

  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id           TEXT PRIMARY KEY,
    student_id   TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    progress_id  TEXT REFERENCES progress(id) ON DELETE SET NULL,
    course       TEXT NOT NULL,
    unit         TEXT NOT NULL,
    lesson       TEXT NOT NULL,
    answers      TEXT,
    score        INTEGER,
    attempted_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
  CREATE INDEX IF NOT EXISTS idx_students_class  ON students(class_id);
  CREATE INDEX IF NOT EXISTS idx_progress_student ON progress(student_id);
  CREATE INDEX IF NOT EXISTS idx_progress_class  ON progress(class_id);
  CREATE INDEX IF NOT EXISTS idx_quiz_student    ON quiz_attempts(student_id);

  -- Append-only ledger of every graded interaction: CFU "check answer" clicks,
  -- exercise items, any scored response. Rows are never edited or deleted; the
  -- rollup (best points per item, summed to a 0-100 pct) is written to
  -- progress.score so every existing dashboard picks scores up unchanged.
  CREATE TABLE IF NOT EXISTS score_events (
    id              TEXT PRIMARY KEY,
    student_id      TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id        TEXT NOT NULL REFERENCES classes(id)  ON DELETE CASCADE,
    course          TEXT NOT NULL,
    unit            TEXT NOT NULL,
    lesson          TEXT NOT NULL,
    activity_type   TEXT NOT NULL DEFAULT 'cfu',
    item            TEXT NOT NULL DEFAULT 'item',
    points          REAL NOT NULL DEFAULT 0,
    max_points      REAL NOT NULL DEFAULT 1,
    correct         INTEGER,
    answers         TEXT,
    client_event_id TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_score_events_student ON score_events(student_id);
  CREATE INDEX IF NOT EXISTS idx_score_events_rollup  ON score_events(student_id, course, unit, lesson, activity_type);
  CREATE INDEX IF NOT EXISTS idx_score_events_item    ON score_events(student_id, course, unit, lesson, activity_type, item);
  CREATE UNIQUE INDEX IF NOT EXISTS uidx_score_events_client
    ON score_events(student_id, client_event_id) WHERE client_event_id IS NOT NULL;

  -- Attempt-level saves for CFUs and quizzes (ap-csa / ap-csp pilot; Cyber can
  -- migrate onto it later). One row per submission; per-question results live
  -- in the detail JSON (option indices and booleans only, never answer text).
  CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    course TEXT NOT NULL,           -- 'ap-csa' | 'ap-csp' | 'ap-cybersecurity'
    lesson_id TEXT NOT NULL,        -- '1.2'
    item_id TEXT NOT NULL,          -- '1.2-cfu-3', '1.2-quiz'
    item_type TEXT NOT NULL,        -- 'cfu' | 'quiz'
    score REAL NOT NULL,
    max_score REAL NOT NULL,
    passed INTEGER NOT NULL,        -- computed server-side against class mastery_threshold
    attempt_no INTEGER NOT NULL,
    duration_seconds INTEGER,       -- client-computed: item render to submit
    ua TEXT,                        -- server-captured User-Agent, truncated to 120 chars
    detail TEXT,                    -- JSON array of {q, sel, ok}; sanitized before insert
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_attempts_student_item ON attempts(student_id, item_id);
  CREATE INDEX IF NOT EXISTS idx_attempts_class ON attempts(class_id);

  -- Single authority for denominators and max scores. Every percentage on every
  -- endpoint computes against this table so admin stats, teacher dashboards, and
  -- student views can never disagree. Adding a lesson is a manifest row, not a
  -- code change. Seeded by scripts/seed-manifest.js.
  CREATE TABLE IF NOT EXISTS course_manifest (
    course TEXT NOT NULL,
    unit TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_type TEXT NOT NULL,        -- 'visit' | 'cfu' | 'quiz'
    points REAL NOT NULL DEFAULT 1,
    PRIMARY KEY (course, item_id)
  );

  -- Append-only leaderboard ledger for the AP CSP topic games. Never edited or
  -- deleted. This is NOT a grade source: it is fully separate from progress /
  -- attempts / score_events and must never touch a gradebook table. One row per
  -- score submission; boards dedupe to a best-per-identity at read time. Auth is
  -- optional: a signed-in student attributes by student_id, anonymous public
  -- play attributes by a sanitized display name plus a daily-rotating ip_hash.
  CREATE TABLE IF NOT EXISTS game_scores (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    game       TEXT NOT NULL,       -- registry key, namespaces the board
    metric     TEXT NOT NULL,       -- server-owned metric label (spoof-proof)
    value      REAL NOT NULL,
    student_id TEXT,                -- set when a student JWT was present
    name       TEXT,               -- display name (student's, or sanitized anon)
    ip_hash    TEXT,               -- sha-256 of ip + daily salt; anti-spam only
    ua         TEXT,               -- server-captured User-Agent, truncated
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_game_scores_game_created ON game_scores(game, created_at);
  CREATE INDEX IF NOT EXISTS idx_game_scores_game_value   ON game_scores(game, value);

  -- Server-owned answer keys (Phase 2 server-side scoring). Questions and their
  -- correct answers live here, never in the page HTML, so no key ever ships to
  -- the browser. The render endpoint returns prompt + options only; correct_index
  -- and explanation are released to the client at submit time subject to the
  -- release rule. This is author content, not student input, so it is not PII.
  -- Seeded manually via scripts/seed-quiz-bank.js (never on boot), so a fresh
  -- deploy stays empty and every page not yet migrated keeps its existing flow.
  CREATE TABLE IF NOT EXISTS quiz_bank (
    qid           TEXT PRIMARY KEY,   -- stable per-question id, e.g. 'ap-cybersecurity:unit-1:1.1:quiz#1'
    course        TEXT NOT NULL,      -- 'ap-cybersecurity' | 'ap-csa' | 'ap-csp'
    unit          TEXT NOT NULL,      -- 'unit-1'
    lesson        TEXT NOT NULL,      -- '1.1'
    activity_type TEXT NOT NULL,      -- 'quiz' | 'exam' | 'exercise-1' | 'exercise-2'
    q_order       INTEGER NOT NULL DEFAULT 0,
    prompt        TEXT NOT NULL,
    options       TEXT NOT NULL,      -- JSON array of option strings (canonical order)
    correct_index INTEGER NOT NULL,   -- index into options; NEVER sent before submit
    explanation   TEXT,               -- NEVER sent before submit or before class release
    points        REAL NOT NULL DEFAULT 1,
    active        INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_quiz_bank_activity
    ON quiz_bank(course, unit, lesson, activity_type, q_order);

  -- Teacher key release ledger. A row means the teacher has released the answer
  -- key (correct answers + explanations) for one activity to one class. Absence
  -- means "class mode, not released": the submit response returns correct/incorrect
  -- booleans only. Public self-study (no class) always gets the key immediately and
  -- never consults this table.
  CREATE TABLE IF NOT EXISTS key_releases (
    class_id      TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    course        TEXT NOT NULL,
    unit          TEXT NOT NULL,
    lesson        TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    released      INTEGER NOT NULL DEFAULT 1,
    released_at   TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (class_id, course, unit, lesson, activity_type)
  );

  -- N-of-M randomization config. A row says "serve serve_count random questions
  -- out of the pool of M in quiz_bank for this activity." serve_count is chosen
  -- server-side and carried in the signed order_token, so a student can never ask
  -- for a smaller or easier subset. No row, or serve_count <= 0, or serve_count
  -- >= the pool size, means serve the whole pool (the Phase 2 default). Seeded by
  -- scripts/seed-quiz-bank.js alongside the bank.
  CREATE TABLE IF NOT EXISTS quiz_config (
    course        TEXT NOT NULL,
    unit          TEXT NOT NULL,
    lesson        TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    serve_count   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (course, unit, lesson, activity_type)
  );

  -- Lightweight server-side answer key for the choice-only quiz path on
  -- POST /api/student/score. The lesson page (System B, ap-csa-course-* pages)
  -- posts { activity_type:'quiz', item:'q3', choice:'B' } with no correctness
  -- verdict; the server scores the choice against the correct letter stored here,
  -- so no answer key ever ships to a class-mode page. This is a simpler key than
  -- quiz_bank (which owns full prompt/options for the order-token render flow):
  -- here the page renders its own options and only the correct letter is server
  -- owned. Author content only; zero student PII. Seeded by
  -- scripts/seed-csa-bank.js (on boot, insert-or-ignore) from seed/csa-answer-bank.js.
  CREATE TABLE IF NOT EXISTS quiz_answer_bank (
    course TEXT NOT NULL,
    lesson TEXT NOT NULL,        -- lesson slug, e.g. '2-9-for-loops'
    item   TEXT NOT NULL,        -- question id, e.g. 'q3'
    answer TEXT NOT NULL,        -- correct choice letter, e.g. 'A'
    PRIMARY KEY (course, lesson, item)
  );

  -- Per-lesson denominators for the System-B (score_events -> progress.score)
  -- percent rollup, one row per (course, lesson, activity_type). This is the
  -- CSA-course-manifest counterpart to course_manifest, kept separate because
  -- course_manifest is item-level and read by the System-A attempts grid;
  -- mixing the slug-lesson System-B rows into it would pollute that grid. Not a
  -- grade source and not yet consumed by the self-summing rollup; seeded so the
  -- authoritative denominators live server-side, ready for a fixed-denominator
  -- read. Seeded by scripts/seed-csa-bank.js from seed/csa-course-manifest.js.
  CREATE TABLE IF NOT EXISTS course_denominators (
    course        TEXT NOT NULL,
    unit          TEXT NOT NULL,
    lesson        TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    possible      REAL NOT NULL DEFAULT 1,
    PRIMARY KEY (course, lesson, activity_type)
  );

  -- UNIT-SCOPED denominators, for the columns course_denominators structurally
  -- cannot hold.
  --
  -- course_denominators is keyed (course, lesson, activity_type) with the unit
  -- OUTSIDE the key. That is fine while a lesson id names exactly one lesson,
  -- which it does for every numbered lesson in every course. It breaks for the
  -- Cybersecurity pseudo-lessons: the COURSES config gives all five units a case
  -- file at lesson 'case-file' and a unit exam at lesson 'exam', so those ten
  -- columns collapse onto two rows. Authoring Unit 1's exam out of 20 and Unit
  -- 2's out of 25 is not a value someone forgot to fill in; the second INSERT is
  -- rejected by the primary key.
  --
  -- This table is ADDITIVE and separate rather than a widened key on the old
  -- one, because changing a primary key in SQLite means rebuilding the table,
  -- and rebuilding a production table to add ten rows is the kind of destructive
  -- migration this repo does not do. Nothing here is copied or moved: the
  -- existing table keeps every row it has and stays the authority for everything
  -- a (lesson, activity) key CAN express.
  --
  -- Read order in lib/gradebook-contract.js is most specific first: this table,
  -- then course_manifest, then course_denominators. Deleting a row here restores
  -- the previous behaviour for that column exactly.
  CREATE TABLE IF NOT EXISTS course_unit_denominators (
    course        TEXT NOT NULL,
    unit          TEXT NOT NULL,
    lesson        TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    possible      REAL NOT NULL DEFAULT 1,
    PRIMARY KEY (course, unit, lesson, activity_type)
  );

  -- Hidden test bank for server-side code grading (POST /api/student/code-grade).
  -- One row per test case for a graded code item, keyed by (course, lesson, item)
  -- with seq breaking ties so an item can hold many cases. All fields here are
  -- author content, NOT student input, so this is not PII. Cases never reach the
  -- client: the grade route runs the student's source against them through the
  -- Judge0 proxy and returns pass counts only.
  --
  -- Model (AP style): the student submits a BARE CODE SEGMENT, not a full class.
  -- Each case injects its inputs as a prelude (Java prepended before the segment,
  -- for example: int a = 17; int b = 5;) and an optional postlude (appended after).
  -- The grader wraps prelude + segment + postlude in a class/main, compiles, runs, and
  -- compares stdout to expected_stdout. Because hidden cases feed prelude values the
  -- page never shows, a hardcoded println of the visible output cannot pass them.
  -- This replaces stdin as the input channel (kept as an optional column for any
  -- Scanner-style item), and needs no Scanner, so it works for every lesson.
  -- A hidden case (hidden = 1) exists so hardcoding cannot pass every case. This
  -- table stores author test cases only; student source code is NEVER stored here or
  -- anywhere else (it is graded in transit and discarded). Seeded manually by
  -- scripts/seed-code-tests.js (never on boot), same posture as the quiz_bank.
  CREATE TABLE IF NOT EXISTS code_test_cases (
    course          TEXT NOT NULL,   -- 'ap-csa'
    lesson          TEXT NOT NULL,   -- '1.3'
    item            TEXT NOT NULL,   -- graded code item = activity_type: 'exercise-1' | 'exercise-2' | 'exercise-3' | 'quiz'
    seq             INTEGER NOT NULL DEFAULT 0,
    prelude         TEXT NOT NULL DEFAULT '',   -- Java prepended before the student segment (injects inputs)
    postlude        TEXT NOT NULL DEFAULT '',   -- Java appended after the student segment
    stdin           TEXT NOT NULL DEFAULT '',   -- optional: stdin for a Scanner-style item (usually empty)
    expected_stdout TEXT NOT NULL,
    hidden          INTEGER NOT NULL DEFAULT 0,   -- 1 = never surfaced to the client, even in a failure summary
    created_at      TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (course, lesson, item, seq)
  );
  CREATE INDEX IF NOT EXISTS idx_code_test_cases ON code_test_cases(course, lesson, item);

  -- Per-course entitlements (Phase 4: Teacher Command Center, slice 1). The
  -- teacher is the paying seat, per course. One active row per
  -- (teacher_id, course) grants unlimited classes and students within that
  -- course; a student inherits access to their class's course while that
  -- class's teacher holds a live entitlement for it. Additive only: this table
  -- gates nothing on its own and changes no existing table or route. source
  -- carries provenance ('shopify_order' once the webhook lands, 'code' for an
  -- access-code redemption). expires_at is nullable; NULL means no expiry, and
  -- the active check honors it now so time-boxed Shopify grants need no change.
  CREATE TABLE IF NOT EXISTS entitlements (
    id         TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    course     TEXT NOT NULL,        -- 'ap-csp' | 'ap-csa' | 'ap-cybersecurity'
    source     TEXT NOT NULL,        -- 'shopify_order' | 'code'
    status     TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'revoked'
    order_ref  TEXT,
    granted_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_entitlements_teacher_course ON entitlements(teacher_id, course);
  -- At most one ACTIVE entitlement per (teacher, course), enforced by a partial
  -- unique index rather than app logic. A revoked row frees the slot so a fresh
  -- grant can be created later.
  CREATE UNIQUE INDEX IF NOT EXISTS uidx_entitlements_active
    ON entitlements(teacher_id, course) WHERE status = 'active';

  -- Single-use access codes. Admin generates a batch for a course; a teacher
  -- redeems one to gain an entitlement for that course. redeemed_by_teacher and
  -- order_ref are set at redemption / fulfillment time.
  CREATE TABLE IF NOT EXISTS access_codes (
    code                TEXT PRIMARY KEY,
    course              TEXT NOT NULL,        -- 'ap-csp' | 'ap-csa' | 'ap-cybersecurity'
    status              TEXT NOT NULL DEFAULT 'unused',  -- 'unused' | 'redeemed' | 'revoked'
    redeemed_by_teacher TEXT REFERENCES teachers(id) ON DELETE SET NULL,
    order_ref           TEXT,
    created_at          TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_access_codes_course_status ON access_codes(course, status);

  -- Phase 4 slice 2: purchases whose buyer has no teacher account yet. A Shopify
  -- order can arrive before the buyer registers, so the grant is parked here by
  -- email and converted to a real entitlement the first time a teacher registers
  -- or logs in with that email (claim-on-auth). claimed_at NULL means still
  -- pending; a non-null value is a claimed-and-converted audit trail (rows are
  -- kept, never deleted). Idempotency: the partial unique index guards against a
  -- redelivered webhook parking the same (email, course, order_ref) twice while
  -- it is still unclaimed.
  CREATE TABLE IF NOT EXISTS pending_entitlements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT NOT NULL COLLATE NOCASE,
    course      TEXT NOT NULL,
    source      TEXT NOT NULL,
    order_ref   TEXT,
    created_at  TEXT DEFAULT (datetime('now')),
    claimed_at  TEXT
  );
  CREATE UNIQUE INDEX IF NOT EXISTS uidx_pending_ent_unclaimed
    ON pending_entitlements(email, course, order_ref) WHERE claimed_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_pending_ent_email
    ON pending_entitlements(email) WHERE claimed_at IS NULL;

  -- Nightly baseline for the admin dashboard deltas. The classes endpoint is
  -- point-in-time only, so 24h / 7d change on any headline metric needs a stored
  -- history to diff against. One row per (date, metric) per day. The admin
  -- summary writes today's row insert-or-ignore on the first request of the day
  -- (first-write-wins), so the value recorded is the day's opening baseline and
  -- live deltas read as (current live value - the baseline from N days ago).
  -- Tiny table (a handful of metrics per day); no unbounded growth concern.
  CREATE TABLE IF NOT EXISTS daily_snapshots (
    date       TEXT NOT NULL,        -- 'YYYY-MM-DD' (UTC, from DATE('now'))
    metric     TEXT NOT NULL,        -- headline metric key, e.g. 'external_students'
    value      REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (date, metric)
  );

  -- Engagement sessions: one row per browser visit (tab), so time-on-site,
  -- active (engaged) time, and page views can be reported per session and rolled
  -- up per student / class / paid tier. The row id is generated by the client and
  -- kept in sessionStorage; the heartbeat endpoint UPSERTs this ONE row a couple
  -- times a minute (coalesced), never one row per heartbeat. active_seconds and
  -- total_seconds are cumulative client counters and the server keeps the MAX, so
  -- retried or out-of-order beacons can never double count. Zero PII: only
  -- durations, counts, a coarse UA, and structured ids. Growth is bounded by real
  -- visits, same posture as the attempts table.
  CREATE TABLE IF NOT EXISTS sessions (
    id             TEXT PRIMARY KEY,     -- client-generated per visit
    student_id     TEXT NOT NULL,
    class_id       TEXT NOT NULL,
    course         TEXT,
    active_seconds INTEGER NOT NULL DEFAULT 0,  -- engaged: tab visible AND not idle
    total_seconds  INTEGER NOT NULL DEFAULT 0,  -- wall-clock span of the visit
    page_views     INTEGER NOT NULL DEFAULT 0,
    ua             TEXT,
    started_at     TEXT DEFAULT (datetime('now')),
    last_beat_at   TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_student ON sessions(student_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_class   ON sessions(class_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);

  -- Teacher self-service password reset. One row per issued reset link. The raw
  -- token is NEVER stored: only its SHA-256 hash, so a leaked DB row cannot be
  -- turned back into a working link. Single-use (used_at) and short-lived
  -- (expires_at). Rows are disposable and safe to prune; nothing here is PII
  -- beyond the teacher_id foreign key. Students are unaffected (they use PINs).
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,          -- sha256(raw token); raw never persisted
    expires_at TEXT NOT NULL,
    used_at    TEXT,                   -- set when consumed; a token works once
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_prt_token   ON password_reset_tokens(token_hash);
  CREATE INDEX IF NOT EXISTS idx_prt_teacher ON password_reset_tokens(teacher_id);
`);

// Migrations — safe to re-run on every boot, ignored if column already exists
const migrations = [
  `ALTER TABLE classes   ADD COLUMN mastery_threshold INTEGER DEFAULT 80`,
  `ALTER TABLE classes   ADD COLUMN retry_allowed     INTEGER DEFAULT 0`,
  `ALTER TABLE students  ADD COLUMN retry_override    INTEGER DEFAULT NULL`,
  `ALTER TABLE students  ADD COLUMN active            INTEGER DEFAULT 1`,
  `ALTER TABLE progress  ADD COLUMN locked            INTEGER DEFAULT 0`,
  // Teacher gradebook reset marker. See the progress table definition above.
  `ALTER TABLE progress  ADD COLUMN score_reset_at    TEXT DEFAULT NULL`,
  `ALTER TABLE attempts  ADD COLUMN duration_seconds  INTEGER`,
  `ALTER TABLE attempts  ADD COLUMN ua                TEXT`,
  // Where an attempt came from. NULL (the only value any existing row has, and
  // the value every student submission keeps) means the student reported it
  // from the page. 'teacher' means a teacher typed it in for an instrument that
  // is administered off the platform: the printed unit tests and the cumulative
  // exams. Those are real manifest items with real denominators, so without a
  // way to enter their scores they would mark every student down for work the
  // gradebook simply never saw. A real column, not a detail JSON key, because
  // the entry route filters on it in SQL: a re-entry replaces the teacher's own
  // prior row and must never be able to touch a student-reported one.
  `ALTER TABLE attempts  ADD COLUMN source            TEXT DEFAULT NULL`,
  // Acquisition on a session: the entry channel (Direct / Organic Search /
  // Social / Referral / Email / Paid / Other) and the referrer domain only.
  // Zero PII: an enum plus a hostname, never a full URL, query string, or IP.
  `ALTER TABLE sessions  ADD COLUMN channel        TEXT`,
  `ALTER TABLE sessions  ADD COLUMN referrer_host  TEXT`,
  // Prelude/postlude input injection for the bare-segment code grader. Existing
  // rows default to empty (equivalent to the old stdin-only behavior).
  `ALTER TABLE code_test_cases ADD COLUMN prelude  TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE code_test_cases ADD COLUMN postlude TEXT NOT NULL DEFAULT ''`,
  // Whether the exercise-2 "game" activity counts toward the class grade.
  // NULL = use the course default (CSP games are practice/not counted; other
  // courses count them, unchanged), so no backfill is needed and a teacher's
  // explicit 0/1 override always wins. Resolved at read time in the gradebook.
  `ALTER TABLE classes   ADD COLUMN games_graded      INTEGER DEFAULT NULL`,
  // Three-mode retry policy: 'all' | 'practice' | 'none'. See retry-policy.js.
  // Deliberately NO column default: an existing row must land on NULL so the
  // backfill below can map it from retry_allowed. A default would stamp every
  // old row with the same value and destroy the mapping.
  `ALTER TABLE classes   ADD COLUMN retry_mode        TEXT DEFAULT NULL`,
];
for (const sql of migrations) {
  try { db.exec(sql); } catch(e) { /* column already exists */ }
}

// ── COMMAND CENTER (Phase 1) ──────────────────────────────────────────────────
// Six additive tables (tasks, promises, deps, claims, task_events,
// command_config). Wrapped so a throw in here can never stop the process from
// booting and serving /api/health: this deploys against a live database with
// real student rows, and a boot exception in August reads as a total outage to
// the nightly production smoke. The guarded row counts (progress, attempts) are
// snapshotted before and after and logged, so "the migration touched student
// data" would be visible in the boot log rather than found in September.
try {
  const { applyCommandCenterSchema } = require('./lib/command-schema');
  const result = applyCommandCenterSchema(db);
  if (!result.unchanged) {
    console.error('[command-center] ROW COUNT CHANGED during migration:', result.before, '->', result.after);
  } else {
    console.log(`[command-center] schema ok: ${result.created.length} tables, progress=${result.after.progress} attempts=${result.after.attempts} unchanged`);
  }
} catch (err) {
  console.error('[command-center] schema failed, continuing without it:', err);
}

// Solo (ME-) accounts always get best-attempt grading. solo-init historically
// relied on the column default (0), so backfill the invariant. Idempotent.
db.exec(`UPDATE classes SET retry_allowed = 1 WHERE course = 'solo' AND (retry_allowed IS NULL OR retry_allowed = 0)`);

// ── RETRY MODE BACKFILL AND SYNC (idempotent, every boot) ────────────────────
//  The mapping is chosen so that NO live class changes behavior on deploy:
//
//    retry_allowed = 1 -> 'all'
//        Today: quizzes are retryable, and practice is best-of-many because
//        scoring.js always kept the best points per item. 'all' is exactly that.
//    retry_allowed = 0 -> 'practice'
//        Today: quizzes are ONE SHOT (POST /api/student/quiz refuses a retake
//        and the client locks), but practice is STILL best-of-many, because the
//        practice rollup never consulted the setting at all. 'practice' is
//        exactly that. Mapping these rows to 'none' would silently regrade every
//        CFU and exercise in the product from best-attempt to first-attempt.
//
//  'none' is genuinely new: no existing row maps to it. A teacher must choose it.
//
//  Runs before any request is served (this module is required at boot), so no
//  route can observe a NULL retry_mode on an existing row. New rows written by
//  older code paths would still be NULL; resolveMode() in retry-policy.js falls
//  back to the same mapping at read time, and the next boot fills the column.
for (const sql of require('./retry-policy').BACKFILL_SQL) db.exec(sql);

// ── FREE-TEXT SAFETY BACKFILL (idempotent, every boot) ───────────────────────
//  sanitize() in utils.js now strips the characters that let a stored name turn
//  into markup. That only protects values written from here on. Every name
//  already in this database was stored under the old trim-and-truncate rule, so
//  a payload planted before the deploy would still be sitting in the students
//  table waiting to render. This pass rewrites the rows that are already there.
//
//  Runs at boot, before any request is served, and converges: once a value is
//  clean, sanitize() is a no-op on it and the row is not touched again.
//
//  Login resolves a student by class_id + lower(name), so two rows in one class
//  sharing a name would make one of them unreachable. Cleaning can create that
//  collision: two different payloads can reduce to the same safe string.
//
//  The collision is resolved by disambiguating, NOT by skipping. Skipping would
//  mean the row that is hardest to clean is the one left holding live markup,
//  which is precisely backwards for a security backfill. A numeric suffix is
//  appended until the name is unique within the class, and the base is trimmed
//  so the result still fits the column's write-site limit. Reaching this branch
//  takes deliberately crafted input, so the expected count is 0; when it is not,
//  the affected ids are logged so the teacher can rename the student properly.
//
//  Renaming does NOT lock anyone out on the ordinary path. POST
//  /api/student/login runs the typed name through the same sanitize() before
//  matching, so a student stored with a folded apostrophe still signs in by
//  typing either form. A student who was disambiguated with a suffix does need
//  their teacher to rename them, which is the correct outcome for a row whose
//  stored name was an injection attempt.
const { sanitize } = require('./utils');

const STUDENT_NAME_MAX = 50;

function backfillFreeText() {
  const report = { students: 0, teachers: 0, classes: 0, disambiguated: [] };

  const students = db.prepare('SELECT id, class_id, display_name FROM students').all();
  const rename = db.prepare('UPDATE students SET display_name = ? WHERE id = ?');
  const clash = db.prepare(
    'SELECT id FROM students WHERE class_id = ? AND lower(display_name) = lower(?) AND id != ?'
  );
  for (const s of students) {
    const clean = sanitize(s.display_name, STUDENT_NAME_MAX);
    if (!clean || clean === s.display_name) continue;

    let candidate = clean;
    for (let n = 2; clash.get(s.class_id, candidate, s.id); n++) {
      const suffix = ' ' + n;
      candidate = clean.slice(0, STUDENT_NAME_MAX - suffix.length).trim() + suffix;
      if (n === 2) report.disambiguated.push(s.id);
    }
    rename.run(candidate, s.id);
    report.students++;
  }

  // Teachers and classes carry no uniqueness rule on these columns, so they are
  // a straight rewrite. Lengths match the sanitize() calls at their write sites.
  for (const [table, column, maxLen, counter] of [
    ['teachers', 'name',       100, 'teachers'],
    ['teachers', 'school',     200, 'teachers'],
    ['classes',  'class_name', 100, 'classes'],
  ]) {
    const rows = db.prepare(`SELECT id, ${column} AS val FROM ${table} WHERE ${column} IS NOT NULL`).all();
    const upd = db.prepare(`UPDATE ${table} SET ${column} = ? WHERE id = ?`);
    for (const r of rows) {
      const clean = sanitize(r.val, maxLen);
      if (clean === r.val) continue;
      upd.run(clean, r.id);
      report[counter]++;
    }
  }
  return report;
}

const freeTextReport = db.transaction(backfillFreeText)();
if (freeTextReport.students || freeTextReport.teachers || freeTextReport.classes) {
  console.log('[db] free-text safety backfill rewrote',
    freeTextReport.students, 'student name(s),',
    freeTextReport.teachers, 'teacher field(s),',
    freeTextReport.classes, 'class name(s)');
}
if (freeTextReport.disambiguated.length) {
  console.warn('[db] free-text backfill added a numeric suffix to', freeTextReport.disambiguated.length,
    'student row(s) whose cleaned name collided with a classmate; these need a teacher rename:',
    freeTextReport.disambiguated.join(', '));
}

module.exports = db;
