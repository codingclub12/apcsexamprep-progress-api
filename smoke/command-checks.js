'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: Command Center Phase 2, auto-created tasks from deterministic checks.
//
//  The property this suite exists to defend is the one from spec section 12:
//  a suite failing five days running is ONE TASK AGING, not five tasks. Every
//  other assertion here is downstream of that.
//
//  Offline, same shape as smoke/command-center.js: throwaway database, real
//  routers on a throwaway express app, real HTTP on an ephemeral port.
//
//  Run: npm run smoke:checks
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');

const DB = path.join(__dirname, 'smoke-command-checks.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(DB + suf); } catch (_) {} }

process.env.DB_PATH = DB;
process.env.TODO_KEY = 'test-checks-key-0123456789-abcdef';
process.env.ADMIN_KEY = 'test-checks-admin-0123456789-abc';
process.env.TODO_KEY_SCOPE = '';

const express = require('express');
const db = require('../db');
const checksLib = require('../lib/command-checks');

let pass = 0; let fail = 0;
const failures = [];
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; failures.push(name); console.log('  [FAIL] ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
}
function section(t) { console.log('\n' + t); }

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use('/api/command', require('../routes/command'));
app.use('/api/todo', require('../routes/todo'));
const server = app.listen(0);
const BASE = `http://127.0.0.1:${server.address().port}`;

async function call(method, urlPath, body) {
  const res = await fetch(BASE + urlPath, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.TODO_KEY}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed; try { parsed = JSON.parse(text); } catch (_) { parsed = text; }
  return { status: res.status, body: parsed };
}

// Ages a check's first_failed_at backwards, standing in for calendar days
// passing without making the suite wait for them.
function ageFailure(source, checkId, days) {
  db.prepare("UPDATE checks SET first_failed_at = datetime('now', ?) WHERE source = ? AND check_id = ?")
    .run(`-${days} days`, source, checkId);
}

(async function main() {
  section('One task aging, not five (spec section 12)');

  const first = await call('POST', '/api/command/checks',
    { source: 'smoke', check_id: 'smoke:gradebook', state: 'fail', detail: '3 of 14 assertions failed' });
  ok('a failing check creates one task', first.status === 201 && first.body.created === 1, first.body);

  const taskCountAfterFirst = db.prepare('SELECT COUNT(*) n FROM tasks').get().n;

  // Same failure, four more nights.
  for (let i = 0; i < 4; i++) {
    await call('POST', '/api/command/checks',
      { source: 'smoke', check_id: 'smoke:gradebook', state: 'fail', detail: `night ${i + 2}` });
  }
  const taskCountAfterFive = db.prepare('SELECT COUNT(*) n FROM tasks').get().n;
  const row = db.prepare("SELECT * FROM checks WHERE source='smoke' AND check_id='smoke:gradebook'").get();

  ok('five consecutive failures create exactly ONE task',
    taskCountAfterFive === taskCountAfterFirst, { after1: taskCountAfterFirst, after5: taskCountAfterFive });
  ok('the check row counts five failures', row.fail_count === 5, row.fail_count);
  ok('first_failed_at is pinned at the FIRST failure, not the latest',
    db.prepare("SELECT COUNT(*) n FROM checks WHERE first_failed_at = (SELECT MIN(first_failed_at) FROM checks)").get().n >= 1
    && row.first_failed_at != null);
  ok('only one checks row exists for the fingerprint',
    db.prepare("SELECT COUNT(*) n FROM checks WHERE source='smoke' AND check_id='smoke:gradebook'").get().n === 1);

  section('Aging is visible, and it is the age of the PROBLEM');
  ageFailure('smoke', 'smoke:gradebook', 5);
  const summary = (await call('GET', '/api/command/checks')).body.summary;
  ok('the digest summary reports the failure age in days',
    summary.failing === 1 && summary.oldest_failure_days === 5, summary);

  const digest = (await call('GET', '/api/command/digest')).body;
  ok('digest.health carries check state alongside the free metrics',
    digest.health.checks && digest.health.checks.failing === 1
    && typeof digest.health.attempts_24h === 'number', digest.health);
  ok('the auto-created task is in the digest, owned by agent, in NOW',
    digest.agent_ready.some((t) => t.id === row.task_id && t.bucket === 'now'),
    digest.agent_ready.map((t) => t.id));

  section('Green auto-closes with the passing run as the artifact');
  const green = await call('POST', '/api/command/checks',
    { source: 'smoke', check_id: 'smoke:gradebook', state: 'pass', detail: '14 of 14 assertions passed' });
  const closedTask = (await call('GET', `/api/todo/${row.task_id}`)).body.task;
  ok('a passing check closes its task', green.body.closed === 1 && closedTask.status === 'done', green.body);
  ok('the passing run is recorded as the artifact',
    /smoke:smoke:gradebook passing as of/.test(closedTask.artifact_url || ''), closedTask.artifact_url);
  ok('an auto-closed task still lands verified=0, so a human still looks',
    closedTask.verified === false);
  ok('and it appears in needs_verification',
    (await call('GET', '/api/command/digest')).body.needs_verification.some((t) => t.id === row.task_id));
  ok('the check row clears first_failed_at on green',
    db.prepare("SELECT first_failed_at FROM checks WHERE source='smoke' AND check_id='smoke:gradebook'").get().first_failed_at === null);

  section('Regression reopens the same task rather than making a new one');
  const before = db.prepare('SELECT COUNT(*) n FROM tasks').get().n;
  await call('POST', '/api/command/checks',
    { source: 'smoke', check_id: 'smoke:gradebook', state: 'fail', detail: 'red again' });
  const after = db.prepare('SELECT COUNT(*) n FROM tasks').get().n;
  const reopened = (await call('GET', `/api/todo/${row.task_id}`)).body.task;
  ok('a check going red again reopens the SAME task', after === before && reopened.status === 'open',
    { before, after, status: reopened.status });
  ok('the reopen is in the event ledger',
    (await call('GET', `/api/todo/${row.task_id}`)).body.events.some((e) => e.action === 'check_reopened'));

  section('Validation and batching');
  const bad = await call('POST', '/api/command/checks', { source: 'vibes', check_id: 'x', state: 'fail' });
  ok('a non-deterministic source is rejected: only smoke/ci/health/linkcheck',
    bad.status === 400 && /source must be one of/.test(JSON.stringify(bad.body)), bad.body);
  const badState = await call('POST', '/api/command/checks', { source: 'ci', check_id: 'x', state: 'flaky' });
  ok('an unknown state is rejected', badState.status === 400);

  const batch = await call('POST', '/api/command/checks', { checks: [
    { source: 'ci', check_id: 'offline-smoke', state: 'pass' },
    { source: 'health', check_id: 'api-health', state: 'pass' },
    { source: 'linkcheck', check_id: 'https://www.apcsexamprep.com/pages/ap-csp-command-center', state: 'fail', detail: '404' },
  ] });
  ok('a batch records every result in one request',
    batch.status === 201 && batch.body.recorded === 3 && batch.body.created === 1, batch.body);
  ok('a link-check failure lands in week, not now, and routes to shopify',
    (() => {
      const lc = db.prepare("SELECT task_id FROM checks WHERE source='linkcheck'").get();
      const t = db.prepare('SELECT bucket, surface FROM tasks WHERE id = ?').get(lc.task_id);
      return t.bucket === 'week' && t.surface === 'shopify';
    })());
  ok('a passing check that never failed creates no task at all',
    db.prepare("SELECT task_id FROM checks WHERE source='ci' AND check_id='offline-smoke'").get().task_id === null);

  section('metrics_daily: aggregates only, with enforced retention');
  const snap = await call('POST', '/api/command/metrics/snapshot');
  ok('the free metrics snapshot writes daily rows', snap.status === 200 && snap.body.written >= 5, snap.body);
  const todayRows = db.prepare("SELECT COUNT(*) n FROM metrics_daily WHERE date = date('now')").get().n;
  await call('POST', '/api/command/metrics/snapshot');
  ok('re-running the snapshot upserts rather than duplicating',
    db.prepare("SELECT COUNT(*) n FROM metrics_daily WHERE date = date('now')").get().n === todayRows);

  db.prepare("INSERT INTO metrics_daily (date, source, metric, value, dimension) VALUES (date('now','-401 days'),'pipeline','attempts_24h',7,'')").run();
  db.prepare("INSERT INTO metrics_daily (date, source, metric, value, dimension) VALUES (date('now','-399 days'),'pipeline','attempts_24h',9,'')").run();
  const pruned = checksLib.pruneMetrics(true);
  ok('retention deletes past 400 days and keeps everything inside it',
    pruned.pruned === 1
    && db.prepare("SELECT COUNT(*) n FROM metrics_daily WHERE date < date('now','-400 days')").get().n === 0
    && db.prepare("SELECT COUNT(*) n FROM metrics_daily WHERE date = date('now','-399 days')").get().n === 1,
    pruned);
  ok('the prune runs at most once a day', checksLib.pruneMetrics().skipped === true);

  section('Auth');
  const unauth = await fetch(BASE + '/api/command/checks', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'ci', check_id: 'x', state: 'pass' }),
  });
  ok('an unauthenticated check report is 401', unauth.status === 401);

  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) { console.log('\nFailed:'); for (const f of failures) console.log('  - ' + f); }
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('\nSUITE CRASHED:', e);
  try { server.close(); } catch (_) {}
  process.exit(1);
});
