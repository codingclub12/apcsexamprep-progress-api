'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  COMMAND CENTER STORE. Every read and write against the command tables, in
//  one place, with prepared statements declared at module scope and reused.
//
//  Performance posture (this box is 1 vCPU / 1GB and has already produced a $169
//  spike): prepared statements are reused, nothing accumulates per request, no
//  timers, no listeners, and the digest is a fixed number of small queries over
//  tables whose growth is bounded by tasks Tanner actually writes down. Blocked
//  and overdue state is computed in SQL and folded in memory over a list that is
//  in the hundreds, not joined N+1 per row.
//
//  The sort order lives here as ONE function so the page, the digest, and
//  /api/todo can never disagree about what is at the top.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');
const router = require('./command-router');

// ── Lazy prepared statements ─────────────────────────────────────────────────
//  Statements are prepared on FIRST USE and cached forever, not at module load.
//  That distinction is the difference between a failed command-center migration
//  degrading this one feature and taking the whole API down at boot: db.js
//  wraps the migration in try/catch, but a module-scope db.prepare against a
//  table that was never created throws while server.js is still requiring its
//  routers, before app.listen, which the nightly smoke would report as a total
//  outage. Same reuse, none of the boot coupling. The cache is keyed by SQL text
//  and every key is a literal in this file, so it is bounded by the source.
const stmtCache = new Map();
function prep(sql) {
  let st = stmtCache.get(sql);
  if (!st) { st = db.prepare(sql); stmtCache.set(sql, st); }
  return st;
}
function lazy(sql) {
  return {
    sql,
    get: (...a) => prep(sql).get(...a),
    all: (...a) => prep(sql).all(...a),
    run: (...a) => prep(sql).run(...a),
  };
}

// Fail closed rather than 500 per request: if the migration did not land, the
// command center is OFF and says so, exactly like the admin API does with a
// missing ADMIN_KEY. Cached once true; a false result is re-checked so a fixed
// deploy does not need a restart to notice.
const REQUIRED_TABLES = ['tasks', 'promises', 'deps', 'claims', 'task_events', 'command_config'];
let schemaOk = false;
function schemaReady() {
  if (schemaOk) return true;
  try {
    const row = db.prepare(
      `SELECT COUNT(*) n FROM sqlite_master WHERE type='table' AND name IN (${REQUIRED_TABLES.map(() => '?').join(',')})`
    ).get(...REQUIRED_TABLES);
    schemaOk = row.n === REQUIRED_TABLES.length;
  } catch (_) {
    schemaOk = false;
  }
  return schemaOk;
}

// ── Config (command_config) ──────────────────────────────────────────────────
const stGetConfig = lazy('SELECT value FROM command_config WHERE key = ?');
const stSetConfig = lazy(`
  INSERT INTO command_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
`);

function getConfig(key, fallback = null) {
  const row = stGetConfig.get(key);
  if (!row || row.value == null) return fallback;
  try { return JSON.parse(row.value); } catch (_) { return row.value; }
}
function setConfig(key, value) {
  stSetConfig.run(key, typeof value === 'string' ? value : JSON.stringify(value));
  return value;
}

// Theme auto-dispatch stays shut until the theme-repo CI task ships. One config
// row rather than an env var so flipping it is a click, and so the router can be
// unit tested both ways.
function themeCiExists() { return !!getConfig('theme_ci_exists', 0); }
function sourceDocs() { return getConfig('source_documents', null); }
function timeWeighting() { return getConfig('time_weighting', null); }

// ── Events (append-only) ─────────────────────────────────────────────────────
const stInsertEvent = lazy(`
  INSERT INTO task_events (task_id, actor, action, from_value, to_value)
  VALUES (?, ?, ?, ?, ?)
`);
const stTouch = lazy(`UPDATE tasks SET last_touched_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`);

function logEvent(taskId, actor, action, fromValue, toValue) {
  stInsertEvent.run(
    taskId == null ? null : taskId,
    String(actor || 'unknown'),
    String(action),
    fromValue == null ? null : String(fromValue),
    toValue == null ? null : String(toValue),
  );
  if (taskId != null) stTouch.run(taskId);
}

const stEventsForTask = lazy('SELECT id, actor, action, from_value, to_value, at FROM task_events WHERE task_id = ? ORDER BY at DESC, id DESC LIMIT ?');

// ── Task reads ───────────────────────────────────────────────────────────────
const TASK_COLUMNS = `
  id, title, detail, bucket, position, status, owner, size, est_minutes, due_date,
  defer_until, bleeding, impact, effort, cost_per_day, surface, course, page_bytes,
  source_doc, verified, artifact_url, auto_dispatch, routed_surface, routed_model,
  routed_reason, last_touched_at, created_at, updated_at, completed_at, created_by,
  check_fingerprint
`;
const stAllTasks = lazy(`SELECT ${TASK_COLUMNS} FROM tasks`);
const stTaskById = lazy(`SELECT ${TASK_COLUMNS} FROM tasks WHERE id = ?`);

// task_id is blocked BY blocks_task_id. Only an UNFINISHED blocker counts.
const stOpenBlockers = lazy(`
  SELECT d.task_id, t.id AS blocker_id, t.title AS blocker_title, t.status AS blocker_status
  FROM deps d JOIN tasks t ON t.id = d.blocks_task_id
  WHERE t.status NOT IN ('done', 'dropped')
`);
const stBlocksWhat = lazy(`
  SELECT d.blocks_task_id AS blocker_id, t.id AS blocked_id, t.title AS blocked_title, t.status AS blocked_status
  FROM deps d JOIN tasks t ON t.id = d.task_id
`);

// An OPEN promise past its promised_by date. This is the one rule that outranks
// everything else in the sort, so it is computed once and folded in.
const stOverduePromises = lazy(`
  SELECT id, task_id, person, email, what, promised_by, promised_on, source,
         CAST(julianday('now') - julianday(promised_by) AS INTEGER) AS days_late
  FROM promises
  WHERE status = 'open' AND promised_by IS NOT NULL AND date(promised_by) < date('now')
  ORDER BY promised_by ASC, id ASC
`);
const stOpenPromisesForTask = lazy(`SELECT id, task_id, what, promised_by, status FROM promises WHERE task_id = ? AND status = 'open'`);

const CLOSED = new Set(['done', 'dropped']);
const BUCKET_RANK = { now: 0, decision: 1, week: 2, before_school: 3, september: 4, someday: 5 };

function today() { return new Date().toISOString().slice(0, 10); }

// Decorates raw task rows with everything the sort and the UI need: blocked
// state with the blocker named, overdue-promise forcing, the cached routing (and
// a fresh route when the cache is cold), and the closes-manually flag.
function decorate(rows, opts = {}) {
  const now = opts.now || new Date();
  const td = today();
  const themeCi = themeCiExists();
  const weighting = timeWeighting();

  const blockersByTask = new Map();
  for (const r of stOpenBlockers.all()) {
    if (!blockersByTask.has(r.task_id)) blockersByTask.set(r.task_id, []);
    blockersByTask.get(r.task_id).push({ id: r.blocker_id, title: r.blocker_title, status: r.blocker_status });
  }
  const blocksByTask = new Map();
  for (const r of stBlocksWhat.all()) {
    if (!blocksByTask.has(r.blocker_id)) blocksByTask.set(r.blocker_id, []);
    blocksByTask.get(r.blocker_id).push({ id: r.blocked_id, title: r.blocked_title, status: r.blocked_status });
  }
  const overdueByTask = new Map();
  for (const p of stOverduePromises.all()) {
    if (p.task_id == null) continue;
    if (!overdueByTask.has(p.task_id)) overdueByTask.set(p.task_id, []);
    overdueByTask.get(p.task_id).push(p);
  }

  return rows.map((t) => {
    const blockedBy = blockersByTask.get(t.id) || [];
    const blocks = blocksByTask.get(t.id) || [];
    const overdue = overdueByTask.get(t.id) || [];
    const closed = CLOSED.has(String(t.status || '').toLowerCase());
    const deferred = !!(t.defer_until && t.defer_until > td);

    // Effective bucket: an overdue promise forces `now` regardless of anything
    // else; a defer_until in the future keeps a task OUT of now until then; a
    // closed task leaves its bucket entirely, which is what makes checking an
    // item off visibly remove it from NOW.
    let bucket = String(t.bucket || 'week').toLowerCase();
    if (closed) bucket = 'closed';
    else if (overdue.length) bucket = 'now';
    else if (bucket === 'now' && deferred) bucket = 'week';

    const routed = router.route(
      { ...t, blocked: blockedBy.length > 0 },
      { themeCiExists: themeCi },
    );

    const decorated = {
      ...t,
      bleeding: !!t.bleeding,
      verified: !!t.verified,
      effective_bucket: bucket,
      deferred,
      closed,
      blocked: blockedBy.length > 0,
      blocked_by: blockedBy,
      blocks,
      overdue_promise: overdue.length > 0,
      overdue_promise_count: overdue.length,
      overdue_promise_days: overdue.reduce((m, p) => Math.max(m, p.days_late || 0), 0),
      due_today: !!(t.due_date && t.due_date === td),
      routed_surface: routed.routed_surface,
      routed_model: routed.routed_model,
      routed_reason: routed.routed_reason,
      routed_flags: routed.flags,
      closes_manually: routed.closes_manually,
      auto_dispatch_eligible: routed.auto_dispatch_eligible,
      auto_dispatch_reason: routed.auto_dispatch_reason,
    };
    decorated.time_penalty = router.timeOfDayPenalty(decorated, now, weighting);
    return decorated;
  });
}

// ── THE sort order, documented and stable ────────────────────────────────────
//  1. an OPEN promise past its promised_by date, always first
//  2. bleeding: a user is hitting this broken right now
//  3. bucket: now, decision, week, before_school, september, someday, then closed
//  4. due date, soonest first, undated last
//  5. cost per day, most expensive first
//  6. impact desc, then effort asc
//  7. position, then id
//  Ends in id, so two identical requests always come back in the same order.
function sortKey(t) {
  return [
    t.overdue_promise ? 0 : 1,
    t.bleeding ? 0 : 1,
    t.effective_bucket === 'closed' ? 99 : (BUCKET_RANK[t.effective_bucket] != null ? BUCKET_RANK[t.effective_bucket] : 50),
    t.due_date ? t.due_date : '9999-12-31',
    -(Number(t.cost_per_day) || 0),
    -(Number(t.impact) || 0),
    Number(t.effort) || 9,
    Number(t.position) || 0,
    t.id,
  ];
}

function cmp(a, b) {
  const ka = sortKey(a); const kb = sortKey(b);
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] < kb[i]) return -1;
    if (ka[i] > kb[i]) return 1;
  }
  return 0;
}

function sortTasks(list) { return list.slice().sort(cmp); }

// Soft time-of-day nudge, applied only where it is a suggestion (quick wins,
// agent-ready), never to the main list. bleeding, an overdue promise, and a
// due-today task are exempt inside timeOfDayPenalty.
function softSort(list) {
  return list.slice().sort((a, b) => (a.time_penalty - b.time_penalty) || cmp(a, b));
}

function listTasks(opts = {}) {
  let rows = decorate(stAllTasks.all(), opts);
  if (!opts.includeClosed) rows = rows.filter((t) => !t.closed);
  if (opts.owner && opts.owner !== 'all') rows = rows.filter((t) => String(t.owner) === opts.owner);
  if (opts.surface) rows = rows.filter((t) => String(t.surface) === opts.surface);
  if (opts.course) rows = rows.filter((t) => String(t.course) === opts.course);
  if (opts.bucket) rows = rows.filter((t) => t.effective_bucket === opts.bucket);
  if (opts.status) rows = rows.filter((t) => String(t.status) === opts.status);
  return sortTasks(rows);
}

function getTask(id, opts = {}) {
  const row = stTaskById.get(id);
  if (!row) return null;
  return decorate([row], opts)[0];
}

// ── Claims ───────────────────────────────────────────────────────────────────
const stLiveClaims = lazy(`
  SELECT c.id, c.task_id, c.surface, c.session_label, c.locks, c.claimed_at, c.heartbeat_at,
         c.expires_at, t.title AS task_title,
         CAST((julianday('now') - julianday(c.claimed_at)) * 1440 AS INTEGER) AS age_minutes,
         CAST((julianday('now') - julianday(c.heartbeat_at)) * 1440 AS INTEGER) AS since_heartbeat_minutes,
         (c.expires_at IS NOT NULL AND datetime(c.expires_at) < datetime('now')) AS expired
  FROM claims c LEFT JOIN tasks t ON t.id = c.task_id
  WHERE c.released_at IS NULL
  ORDER BY c.claimed_at ASC
`);
const stClaimById = lazy('SELECT * FROM claims WHERE id = ?');
const stClaimsForTask = lazy(`
  SELECT id, surface, session_label, locks, claimed_at, heartbeat_at, expires_at, released_at, outcome
  FROM claims WHERE task_id = ? ORDER BY claimed_at DESC LIMIT 20
`);
const stInsertClaim = lazy(`
  INSERT INTO claims (task_id, surface, session_label, locks, claimed_at, heartbeat_at, expires_at)
  VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now', ?))
`);
const stHeartbeat = lazy(`UPDATE claims SET heartbeat_at = datetime('now') WHERE id = ? AND released_at IS NULL`);
const stReleaseClaim = lazy(`UPDATE claims SET released_at = datetime('now'), outcome = ? WHERE id = ?`);
// Events written on this task SINCE the claim was taken. Zero of these while a
// claim keeps heartbeating is the stuck signal.
const stEventsSinceClaim = lazy(`
  SELECT COUNT(*) n FROM task_events
  WHERE task_id = ? AND datetime(at) >= datetime(?)
`);

function parseLocks(raw) {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch (_) { return []; }
}

function liveClaims() {
  return stLiveClaims.all().map((c) => ({
    ...c,
    locks: parseLocks(c.locks),
    expired: !!c.expired,
    age_minutes: Math.max(0, c.age_minutes || 0),
    since_heartbeat_minutes: Math.max(0, c.since_heartbeat_minutes || 0),
  }));
}

// A claim is STUCK when it has been alive 45+ minutes, is still heartbeating
// inside its window, and has written zero task_events since it was taken. That
// is loop detection, and it comes free with the heartbeat.
const STUCK_MINUTES = 45;
const HEARTBEAT_GRACE_MINUTES = 10;

function claimState(c) {
  if (c.expired) return 'stale';
  if (c.since_heartbeat_minutes > HEARTBEAT_GRACE_MINUTES) return 'stale';
  if (c.age_minutes >= STUCK_MINUTES && stEventsSinceClaim.get(c.task_id, c.claimed_at).n === 0) return 'stuck';
  return 'running';
}

// Conflicting live lock, if any. Locks are (repo, file) pairs, not whole tasks,
// so two sessions can share a task and still be told which file collides.
function findLockConflict(locks, ignoreClaimId) {
  const wanted = new Set((locks || []).map(String));
  if (!wanted.size) return null;
  for (const c of liveClaims()) {
    if (ignoreClaimId && c.id === ignoreClaimId) continue;
    if (c.expired) continue;
    const hit = c.locks.filter((l) => wanted.has(l));
    if (hit.length) return { claim: c, conflicting: hit };
  }
  return null;
}

// ── Free metrics: gradebook + pipeline health (Phase 1, same SQLite) ─────────
//  No auth, no network, no external dependency: this is the same process and
//  the same file. Kept to a handful of scalar counts on purpose. Every number
//  here answers "what do I do differently", which is the bar for shipping a
//  metric at all: zero attempts in 24h during term means the reporter is down.
const stHealth = {
  classes: lazy('SELECT COUNT(*) n FROM classes WHERE active = 1'),
  students: lazy('SELECT COUNT(*) n FROM students WHERE active = 1'),
  attempts_24h: lazy("SELECT COUNT(*) n FROM attempts WHERE created_at >= datetime('now','-1 day')"),
  score_events_24h: lazy("SELECT COUNT(*) n FROM score_events WHERE created_at >= datetime('now','-1 day')"),
  manifest_items: lazy('SELECT COUNT(*) n FROM course_manifest'),
  last_attempt_at: lazy('SELECT MAX(created_at) v FROM attempts'),
};

function healthSnapshot() {
  const safe = (st, field = 'n') => { try { return st.get()[field]; } catch (_) { return null; } };
  return {
    active_classes: safe(stHealth.classes),
    active_students: safe(stHealth.students),
    attempts_24h: safe(stHealth.attempts_24h),
    score_events_24h: safe(stHealth.score_events_24h),
    manifest_items: safe(stHealth.manifest_items),
    last_attempt_at: safe(stHealth.last_attempt_at, 'v'),
  };
}

module.exports = {
  db, lazy, prep, schemaReady, REQUIRED_TABLES,
  getConfig, setConfig, themeCiExists, sourceDocs, timeWeighting,
  logEvent, stEventsForTask,
  decorate, listTasks, getTask, sortTasks, softSort, cmp, sortKey, today,
  stAllTasks, stTaskById, stOverduePromises, stOpenPromisesForTask,
  liveClaims, claimState, findLockConflict, parseLocks,
  stClaimById, stClaimsForTask, stInsertClaim, stHeartbeat, stReleaseClaim, stEventsSinceClaim,
  healthSnapshot, CLOSED, BUCKET_RANK, STUCK_MINUTES, HEARTBEAT_GRACE_MINUTES,
};
