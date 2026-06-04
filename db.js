'use strict';
const Database = require('better-sqlite3');
const path = require('path');

const fs = require('fs');
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'progress.db');
fs.mkdirSync(require('path').dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);

// Performance settings
db.pragma('journal_mode = WAL');
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
`);

// Migrations — safe to re-run on every boot, ignored if column already exists
const migrations = [
  `ALTER TABLE classes   ADD COLUMN mastery_threshold INTEGER DEFAULT 80`,
  `ALTER TABLE classes   ADD COLUMN retry_allowed     INTEGER DEFAULT 0`,
  `ALTER TABLE students  ADD COLUMN retry_override    INTEGER DEFAULT NULL`,
  `ALTER TABLE progress  ADD COLUMN locked            INTEGER DEFAULT 0`,
];
for (const sql of migrations) {
  try { db.exec(sql); } catch(e) { /* column already exists */ }
}

module.exports = db;
