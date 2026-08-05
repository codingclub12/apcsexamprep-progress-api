'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AUTO-CREATED TASKS FROM DETERMINISTIC CHECKS (Phase 2, spec section 12).
//
//  Sources, and only these: nightly production smoke, CI, /api/health, and a
//  scheduled link-check on known-critical URLs. NEVER anything fuzzy. A noise
//  queue gets ignored, and then so does everything next to it, which would take
//  the rest of the command center down with it.
//
//  THE ONE RULE THAT MATTERS: fingerprint on (source, check_id). A suite failing
//  five days running is ONE TASK AGING, not five tasks. The check row pins
//  first_failed_at at the first failure and leaves it pinned, so the task's age
//  is the age of the problem rather than the age of the last run.
//
//  Auto-close on green, with the passing run as the artifact. That closes the
//  loop the verification ledger opens: a task that a machine opened, a machine
//  may close, because a machine can produce evidence. It still lands verified=0,
//  so it shows in needs_verification until Tanner looks.
// ─────────────────────────────────────────────────────────────────────────────
const store = require('./command-store');
const write = require('./command-write');

const db = store.db;

const SOURCES = ['smoke', 'ci', 'health', 'linkcheck'];
const STATES = ['pass', 'fail'];

// The actor recorded on every event these writes produce. Distinct from an
// agent or from Tanner, so the ledger can tell machine-opened work apart.
const ACTOR = 'check';

// A failing deterministic check is a real, currently-broken thing, so it lands
// in `now`. Link-check misses go to `week`: a 404 on a known URL matters, but
// it is not the same as the nightly smoke going red.
const BUCKET_BY_SOURCE = { smoke: 'now', ci: 'now', health: 'now', linkcheck: 'week' };
const SURFACE_BY_SOURCE = { smoke: 'api', ci: 'api', health: 'api', linkcheck: 'shopify' };

function fingerprint(source, checkId) { return `check:${source}:${checkId}`; }

const stGetCheck = store.lazy('SELECT * FROM checks WHERE source = ? AND check_id = ?');
const stAllChecks = store.lazy(`
  SELECT c.*, t.status AS task_status, t.title AS task_title,
         CAST(julianday('now') - julianday(c.first_failed_at) AS INTEGER) AS failing_days
  FROM checks c LEFT JOIN tasks t ON t.id = c.task_id
  ORDER BY (c.state = 'fail') DESC, c.first_failed_at ASC, c.source, c.check_id
`);
const stInsertCheck = store.lazy(`
  INSERT INTO checks (source, check_id, state, detail, first_failed_at, last_seen_at, last_pass_at, fail_count, task_id)
  VALUES (@source, @check_id, @state, @detail, @first_failed_at, datetime('now'), @last_pass_at, @fail_count, @task_id)
`);
const stUpdateCheck = store.lazy(`
  UPDATE checks SET state = @state, detail = @detail, first_failed_at = @first_failed_at,
    last_seen_at = datetime('now'), last_pass_at = @last_pass_at, fail_count = @fail_count,
    task_id = @task_id
  WHERE id = @id
`);

// Records one check result. Idempotent per (source, check_id): calling it five
// nights running with the same failure updates one row and one task.
//
// Returns { check, task_id, created, closed, state }.
function recordCheck({ source, check_id, state, detail }) {
  const src = String(source || '').trim().toLowerCase();
  const id = String(check_id || '').trim().slice(0, 200);
  const st = String(state || '').trim().toLowerCase();

  if (!SOURCES.includes(src)) return { error: `source must be one of: ${SOURCES.join(', ')}` };
  if (!id) return { error: 'check_id is required' };
  if (!STATES.includes(st)) return { error: `state must be one of: ${STATES.join(', ')}` };

  const note = detail == null ? null : String(detail).slice(0, 1000);
  const existing = stGetCheck.get(src, id);
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // ── FAILING ────────────────────────────────────────────────────────────────
  if (st === 'fail') {
    // first_failed_at is pinned at the FIRST failure and never moved while the
    // check stays red. That is the difference between a task that ages and a
    // task that resets its own clock every night.
    const firstFailed = existing && existing.first_failed_at ? existing.first_failed_at : now;
    let taskId = existing ? existing.task_id : null;
    let created = false;

    const live = taskId ? store.stTaskById.get(taskId) : null;
    if (!live || store.CLOSED.has(String(live.status).toLowerCase())) {
      // No task, or the previous one was closed and the check has gone red
      // again. createTask dedupes on check_fingerprint, so a re-open reuses the
      // same row rather than piling up.
      const result = write.createTask({
        title: `${src.toUpperCase()} check failing: ${id}`,
        detail: `Auto-created from a ${src} check. ${note || 'No detail reported.'}\n\n`
          + 'This task is fingerprinted on (source, check_id): it ages while the check stays red '
          + 'rather than being recreated on every run, and it closes itself when the check goes green.',
        bucket: BUCKET_BY_SOURCE[src] || 'week',
        owner: 'agent',
        size: 's',
        surface: SURFACE_BY_SOURCE[src] || 'api',
        course: 'all',
        impact: src === 'linkcheck' ? 3 : 4,
        effort: 2,
        created_by: ACTOR,
        check_fingerprint: fingerprint(src, id),
      }, { cookie: false, actor: ACTOR, scope: 'limited' });

      if (result.task) {
        taskId = result.task.id;
        created = !result.deduped;
        // A deduped hit means the task already existed; if it was closed, reopen
        // it rather than leaving a green row over a red check.
        if (result.deduped && store.CLOSED.has(String(result.task.status).toLowerCase())) {
          db.prepare("UPDATE tasks SET status = 'open', completed_at = NULL, verified = 0, updated_at = datetime('now'), last_touched_at = datetime('now') WHERE id = ?").run(taskId);
          store.logEvent(taskId, ACTOR, 'check_reopened', result.task.status, 'open');
        }
      }
    }

    const row = {
      source: src, check_id: id, state: 'fail', detail: note,
      first_failed_at: firstFailed,
      last_pass_at: existing ? existing.last_pass_at : null,
      fail_count: (existing ? existing.fail_count : 0) + 1,
      task_id: taskId,
    };
    if (existing) stUpdateCheck.run({ ...row, id: existing.id });
    else stInsertCheck.run(row);

    if (taskId) {
      store.logEvent(taskId, ACTOR, 'check_failed', null,
        `${src}:${id} failing since ${firstFailed}${note ? ` - ${String(note).slice(0, 120)}` : ''}`);
    }
    return { state: 'fail', check: stGetCheck.get(src, id), task_id: taskId, created, closed: false };
  }

  // ── PASSING ────────────────────────────────────────────────────────────────
  const wasFailing = !!(existing && existing.state === 'fail');
  let closed = false;
  let taskId = existing ? existing.task_id : null;

  if (wasFailing && taskId) {
    const task = store.stTaskById.get(taskId);
    if (task && !store.CLOSED.has(String(task.status).toLowerCase())) {
      // The green run IS the artifact. A machine that can produce evidence is
      // allowed to close its own task; it still lands verified=0.
      db.prepare(`
        UPDATE tasks SET status = 'done', verified = 0,
          artifact_url = ?, completed_at = datetime('now'),
          updated_at = datetime('now'), last_touched_at = datetime('now')
        WHERE id = ?
      `).run(`${src}:${id} passing as of ${now}${note ? ` (${String(note).slice(0, 200)})` : ''}`, taskId);
      store.logEvent(taskId, ACTOR, 'check_recovered', 'fail', 'pass');
      closed = true;
    }
  }

  const row = {
    source: src, check_id: id, state: 'pass', detail: note,
    first_failed_at: null,
    last_pass_at: now,
    fail_count: existing ? existing.fail_count : 0,
    task_id: taskId,
  };
  if (existing) stUpdateCheck.run({ ...row, id: existing.id });
  else stInsertCheck.run(row);

  return { state: 'pass', check: stGetCheck.get(src, id), task_id: taskId, created: false, closed };
}

// Every check with its current state. Failing first, oldest failure at the top,
// which is the order you want to read them in.
function listChecks() {
  return stAllChecks.all().map((c) => ({
    ...c,
    failing_days: c.state === 'fail' ? Math.max(0, c.failing_days || 0) : 0,
  }));
}

// Compact shape for the digest: what is red, and for how long.
function checksSummary() {
  const all = listChecks();
  const failing = all.filter((c) => c.state === 'fail');
  return {
    total: all.length,
    failing: failing.length,
    oldest_failure_days: failing.reduce((m, c) => Math.max(m, c.failing_days), 0),
    red: failing.map((c) => ({
      source: c.source,
      check_id: c.check_id,
      failing_days: c.failing_days,
      fail_count: c.fail_count,
      task_id: c.task_id,
      detail: c.detail,
    })),
    last_seen_at: all.reduce((m, c) => (c.last_seen_at > m ? c.last_seen_at : m), ''),
  };
}

// ── metrics_daily ────────────────────────────────────────────────────────────
//  Daily aggregates only, never raw events, with retention enforced rather than
//  hoped for. The delete runs at most once per day (guarded by a config row) so
//  a busy write path never pays for it repeatedly.
const RETENTION_DAYS = 400;
const stUpsertMetric = store.lazy(`
  INSERT INTO metrics_daily (date, source, metric, value, dimension, captured_at)
  VALUES (?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(date, source, metric, dimension)
  DO UPDATE SET value = excluded.value, captured_at = excluded.captured_at
`);
const stPruneMetrics = store.lazy(`DELETE FROM metrics_daily WHERE date < date('now', ?)`);

function pruneMetrics(force = false) {
  const today = store.today();
  if (!force && store.getConfig('metrics_pruned_on', null) === today) return { pruned: 0, skipped: true };
  const info = stPruneMetrics.run(`-${RETENTION_DAYS} days`);
  store.setConfig('metrics_pruned_on', today);
  return { pruned: info.changes, skipped: false };
}

function writeMetric({ date, source, metric, value, dimension }) {
  const d = date || store.today();
  stUpsertMetric.run(d, String(source), String(metric), Number(value) || 0, String(dimension || ''));
  pruneMetrics();
  return { date: d, source, metric, value, dimension: dimension || '' };
}

// Snapshots today's free metrics (same SQLite, same process, no external
// dependency) into metrics_daily so the 7am brief can diff against yesterday.
function snapshotFreeMetrics() {
  const health = store.healthSnapshot();
  const rows = [
    ['pipeline', 'attempts_24h', health.attempts_24h],
    ['pipeline', 'score_events_24h', health.score_events_24h],
    ['gradebook', 'active_students', health.active_students],
    ['gradebook', 'active_classes', health.active_classes],
    ['gradebook', 'manifest_items', health.manifest_items],
  ];
  for (const [source, metric, value] of rows) {
    if (value == null) continue;
    writeMetric({ source, metric, value });
  }
  return { written: rows.length, health };
}

module.exports = {
  recordCheck, listChecks, checksSummary,
  writeMetric, pruneMetrics, snapshotFreeMetrics,
  SOURCES, STATES, RETENTION_DAYS, fingerprint, ACTOR,
};
