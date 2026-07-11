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
`);

// Migrations — safe to re-run on every boot, ignored if column already exists
const migrations = [
  `ALTER TABLE classes   ADD COLUMN mastery_threshold INTEGER DEFAULT 80`,
  `ALTER TABLE classes   ADD COLUMN retry_allowed     INTEGER DEFAULT 0`,
  `ALTER TABLE students  ADD COLUMN retry_override    INTEGER DEFAULT NULL`,
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
