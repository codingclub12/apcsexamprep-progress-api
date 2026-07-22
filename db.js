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
`);

// Migrations — safe to re-run on every boot, ignored if column already exists
const migrations = [
  `ALTER TABLE classes   ADD COLUMN mastery_threshold INTEGER DEFAULT 80`,
  `ALTER TABLE classes   ADD COLUMN retry_allowed     INTEGER DEFAULT 0`,
  `ALTER TABLE students  ADD COLUMN retry_override    INTEGER DEFAULT NULL`,
  `ALTER TABLE students  ADD COLUMN active            INTEGER DEFAULT 1`,
  `ALTER TABLE progress  ADD COLUMN locked            INTEGER DEFAULT 0`,
  `ALTER TABLE attempts  ADD COLUMN duration_seconds  INTEGER`,
  `ALTER TABLE attempts  ADD COLUMN ua                TEXT`,
];
for (const sql of migrations) {
  try { db.exec(sql); } catch(e) { /* column already exists */ }
}

// Solo (ME-) accounts always get best-attempt grading. solo-init historically
// relied on the column default (0), so backfill the invariant. Idempotent.
db.exec(`UPDATE classes SET retry_allowed = 1 WHERE course = 'solo' AND (retry_allowed IS NULL OR retry_allowed = 0)`);

module.exports = db;
