'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  COMMAND CENTER SCHEMA (Phase 1).
//
//  ADDITIVE ONLY. Six brand-new tables. Zero ALTER on any existing table, zero
//  data migration, nothing here reads or writes progress / attempts / students /
//  score_events. That is the whole safety argument: this ships against a live
//  database holding real student rows three weeks before school starts, and the
//  costly failure mode is not data loss, it is a boot exception during the
//  busiest month of the year.
//
//  Two guards on top of "additive only":
//   1. db.js calls this inside try/catch, so a throw here logs loudly and the
//      process still boots and still serves /api/health.
//   2. verifyRowCounts() snapshots progress + attempts before and after, and the
//      caller logs a mismatch. A migration that touched a student row would be
//      visible in the boot log rather than discovered in September.
//
//  Same inline CREATE TABLE IF NOT EXISTS pattern db.js already uses. No
//  migration framework, no ORM, per the api hazard block.
// ─────────────────────────────────────────────────────────────────────────────

const SCHEMA_SQL = `
  -- The queue. One row per task, whatever surface it eventually runs on.
  -- position is REAL so drag-to-reorder can land later without a migration; v1
  -- only ever writes integer values into it.
  CREATE TABLE IF NOT EXISTS tasks (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    title             TEXT NOT NULL,
    detail            TEXT,                          -- why it matters
    bucket            TEXT DEFAULT 'week',           -- now/decision/week/before_school/september/someday
    position          REAL DEFAULT 0,
    status            TEXT DEFAULT 'open',           -- open/in_progress/awaiting_review/blocked/done/dropped
    owner             TEXT DEFAULT 'tanner',         -- tanner/agent/either
    size              TEXT,                          -- xs/s/m/l/xl
    est_minutes       INTEGER,                       -- xs/s only
    due_date          TEXT,                          -- DATE 'YYYY-MM-DD'
    defer_until       TEXT,                          -- hide from NOW until this date
    bleeding          INTEGER DEFAULT 0,             -- a user is hitting this broken RIGHT NOW
    impact            INTEGER,                       -- 1-5
    effort            INTEGER,                       -- 1-5
    cost_per_day      REAL,
    surface           TEXT,                          -- theme/api/content/klaviyo/shopify/drive/ops
    course            TEXT,                          -- csa/csp/cyber/networking/greenfoot/all
    -- Page body size in bytes, for surface=shopify only. This is a router INPUT,
    -- not decoration: it decides chat-with-MCP (<= 58KB single-push ceiling) vs
    -- chat-admin-editor-only, and the reason string it produces is shown on the
    -- row. NULL means "assume within the ceiling".
    page_bytes        INTEGER,
    -- Cited source document for the compiled prompt. Free-form key that matches
    -- an entry in the registry's _meta.source_documents (stored in
    -- command_config), or a bare filename.
    source_doc        TEXT,
    verified          INTEGER DEFAULT 0,             -- only a cookie-auth request may set 1
    artifact_url      TEXT,                          -- PR, page updatedAt delta, md5, curl result
    auto_dispatch     TEXT DEFAULT 'off',            -- off/eligible/dispatched/returned
    routed_surface    TEXT,                          -- computed, cached
    routed_model      TEXT,                          -- computed, cached
    routed_reason     TEXT,                          -- human-readable, shown in the UI
    last_touched_at   TEXT,                          -- any write bumps it
    created_at        TEXT DEFAULT (datetime('now')),
    updated_at        TEXT DEFAULT (datetime('now')),
    completed_at      TEXT,
    created_by        TEXT DEFAULT 'tanner',         -- tanner/chat/cowork/claude_code/check
    check_fingerprint TEXT UNIQUE                    -- dedupe key for auto-created tasks (Phase 2)
  );
  CREATE INDEX IF NOT EXISTS idx_tasks_bucket   ON tasks(bucket, status);
  CREATE INDEX IF NOT EXISTS idx_tasks_status   ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_owner    ON tasks(owner, status);
  CREATE INDEX IF NOT EXISTS idx_tasks_due      ON tasks(due_date) WHERE due_date IS NOT NULL;

  -- What Tanner told a human he would do. This table is the reason the whole
  -- API is credentialed: it is the only place in the command center that holds
  -- a real name and a real email. Scope-gated everywhere (see lib/command-auth).
  CREATE TABLE IF NOT EXISTS promises (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id      INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    person       TEXT,
    email        TEXT,
    what         TEXT NOT NULL,
    promised_on  TEXT DEFAULT (datetime('now')),
    promised_by  TEXT,                               -- DATE the promise comes due
    source       TEXT,                               -- email/call/dm/in-person
    status       TEXT DEFAULT 'open',                -- open/kept/broken/renegotiated/pending
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_promises_task   ON promises(task_id);
  CREATE INDEX IF NOT EXISTS idx_promises_status ON promises(status, promised_by);

  -- task_id is blocked BY blocks_task_id. An unfinished blocker greys the row
  -- in the UI and excludes the task from agent_ready in the digest.
  CREATE TABLE IF NOT EXISTS deps (
    task_id        INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    blocks_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    created_at     TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (task_id, blocks_task_id)
  );
  CREATE INDEX IF NOT EXISTS idx_deps_blocker ON deps(blocks_task_id);

  -- A surface announcing "I am working on this, and I hold these files."
  -- Locks are (repo, file) pairs, not whole tasks, so two agents can share a
  -- task and still collide-check the files they actually touch.
  CREATE TABLE IF NOT EXISTS claims (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id       INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    surface       TEXT NOT NULL,                     -- chat/cowork/claude_code
    session_label TEXT,                              -- free text the agent supplies
    locks         TEXT,                              -- JSON array of "repo:path" strings
    claimed_at    TEXT DEFAULT (datetime('now')),
    heartbeat_at  TEXT DEFAULT (datetime('now')),
    expires_at    TEXT,                              -- claimed_at + ttl_minutes
    released_at   TEXT,                              -- null while live
    outcome       TEXT                               -- returned/abandoned/forced_out
  );
  CREATE INDEX IF NOT EXISTS idx_claims_task ON claims(task_id);
  CREATE INDEX IF NOT EXISTS idx_claims_live ON claims(released_at) WHERE released_at IS NULL;

  -- Append-only. Every write from every source lands here. Agents never
  -- silently edit: this is what makes a forced lock override auditable and what
  -- makes "heartbeating with zero events" a detectable stuck loop.
  CREATE TABLE IF NOT EXISTS task_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id    INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    actor      TEXT,                                 -- tanner/chat/cowork/claude_code/check
    action     TEXT NOT NULL,
    from_value TEXT,
    to_value   TEXT,
    at         TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_task_events_task ON task_events(task_id, at);
  CREATE INDEX IF NOT EXISTS idx_task_events_at   ON task_events(at);

  -- Small key/value store for command center settings that must survive a
  -- restart: the public digest read token, the time-of-day weighting window,
  -- the theme-CI flag that gates theme auto-dispatch, and the registry's
  -- _meta.source_documents. Handful of rows, never grows per request.
  CREATE TABLE IF NOT EXISTS command_config (
    key        TEXT PRIMARY KEY,
    value      TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`;

// Tables this migration creates. Used by the boot log and by the test that
// proves a fault inside the migration does not stop the process booting.
const TABLES = ['tasks', 'promises', 'deps', 'claims', 'task_events', 'command_config'];

// Existing tables that must be byte-for-byte untouched by this migration.
const GUARDED_TABLES = ['progress', 'attempts'];

// Row counts for the guarded tables. A table that does not exist yet counts 0
// rather than throwing, so a fresh database is not a special case.
function rowCounts(db) {
  const counts = {};
  for (const t of GUARDED_TABLES) {
    try {
      counts[t] = db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n;
    } catch (_) {
      counts[t] = 0;
    }
  }
  return counts;
}

// Applies the schema and returns { created, before, after, unchanged }.
// Throws only if SQLite itself refuses the DDL; the caller wraps this.
function applyCommandCenterSchema(db) {
  const before = rowCounts(db);
  db.exec(SCHEMA_SQL);
  const after = rowCounts(db);
  const unchanged = GUARDED_TABLES.every((t) => before[t] === after[t]);
  const created = TABLES.filter((t) => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(t);
    return !!row;
  });
  return { created, before, after, unchanged };
}

module.exports = { applyCommandCenterSchema, SCHEMA_SQL, TABLES, GUARDED_TABLES, rowCounts };
