'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the dispatch queue. Phase 2.1, the consumer for `auto_dispatch`.
//
//  The property this suite defends is that TWO facts must line up before
//  anything runs unattended: the router says the kind of task is dispatchable
//  (capability), and the column says 'eligible' (consent). Either alone is not
//  enough, and the interesting failure is the second one going stale - a task
//  ticked when it was small, then grown, then dispatched anyway.
//
//  Offline, same shape as smoke/command-center.js: throwaway database, real
//  routers on a throwaway express app, real HTTP on an ephemeral port.
//
//  Run: npm run smoke:dispatch
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');

const DB = path.join(__dirname, 'smoke-command-dispatch.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(DB + suf); } catch (_) {} }

process.env.DB_PATH = DB;
process.env.TODO_KEY = 'test-dispatch-key-0123456789-abcd';
process.env.ADMIN_KEY = 'test-dispatch-admin-0123456789-ab';
process.env.TODO_KEY_SCOPE = '';

const express = require('express');
const db = require('../db');
const router = require('../lib/command-router');

let pass = 0; let fail = 0;
const failures = [];
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else {
    fail++; failures.push(name);
    console.log('  [FAIL] ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : ''));
  }
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

const add = (fields) => call('POST', '/api/todo', fields);
const queue = async (qs = '') => (await call('GET', '/api/command/dispatch-queue' + qs)).body;
const inDispatch = (q, id) => q.dispatch.some((t) => t.id === id);
const skipFor = (q, id) => q.skipped.find((t) => t.id === id);

(async () => {
  // ── 1. Consent and capability are both required ────────────────────────────
  section('1. Consent and capability are separate, and both are required');

  const plain = (await add({ title: 'Add an attempts index', surface: 'api', size: 's', bucket: 'now', owner: 'agent' })).body.task;
  let q = await queue();
  ok('1.1 a capable task with no tick is NOT dispatched', !inDispatch(q, plain.id), q.dispatch.map((t) => t.id));

  const tick = await call('PATCH', `/api/todo/${plain.id}`, { auto_dispatch: 'eligible' });
  ok('1.2 the tick is accepted for a capable task', tick.status === 200, tick.body);

  q = await queue();
  ok('1.3 ticked AND capable is dispatched', inDispatch(q, plain.id), q.dispatch);
  ok('1.4 the queue explains why it picked it', /off the never-auto-merge list/.test((q.dispatch[0] || {}).reason || ''));

  // Consent cannot be given to something the router refuses. The write guard
  // already enforces this; asserted here so the two stay in step.
  const big = (await add({ title: 'Rewrite the gradebook', surface: 'api', size: 'l', bucket: 'week', owner: 'agent' })).body.task;
  const tickBig = await call('PATCH', `/api/todo/${big.id}`, { auto_dispatch: 'eligible' });
  ok('1.5 a large task cannot even be ticked', tickBig.status === 400, tickBig.body);
  ok('1.6 and the refusal names the size rule', /large multi-file change/.test(tickBig.body.error || ''), tickBig.body);

  const shopify = (await add({ title: 'Update the pricing page', surface: 'shopify', size: 's', bucket: 'now' })).body.task;
  const tickShop = await call('PATCH', `/api/todo/${shopify.id}`, { auto_dispatch: 'eligible' });
  ok('1.7 a shopify task cannot be ticked: an Action cannot reach it',
    tickShop.status === 400 && /can only reach repos/.test(tickShop.body.error || ''), tickShop.body);

  // ── 2. A stale tick is caught at read time ─────────────────────────────────
  //  This is the failure mode that matters. The box was ticked when the task
  //  was small and unblocked. Then it changed. Policy is re-derived on every
  //  read, so the queue notices rather than dispatching on a stale snapshot.
  section('2. Consent is stored, capability is recomputed');

  // Grow it past the ceiling behind the guard's back, exactly as a real edit
  // through another path or a policy change would.
  db.prepare("UPDATE tasks SET size = 'xl' WHERE id = ?").run(plain.id);
  q = await queue();
  ok('2.1 a task that outgrew the ceiling is NOT dispatched', !inDispatch(q, plain.id));
  ok('2.2 and it is reported as a stale tick, not silently dropped',
    !!skipFor(q, plain.id) && skipFor(q, plain.id).stale_consent === true, skipFor(q, plain.id));
  ok('2.3 the reason names what changed', /no longer eligible/.test((skipFor(q, plain.id) || {}).reason || ''));

  db.prepare("UPDATE tasks SET size = 's' WHERE id = ?").run(plain.id);
  q = await queue();
  ok('2.4 restoring the size makes it dispatchable again, with no re-ticking', inDispatch(q, plain.id));

  // Blocking it is the same story through a different door.
  const blocker = (await add({ title: 'Design the index', surface: 'api', size: 's', bucket: 'now' })).body.task;
  const dep = await call('POST', `/api/todo/${plain.id}/deps`, { blocks_task_id: blocker.id });
  // Assert the FIXTURE worked before asserting what it should cause. The first
  // version of this test sent the wrong field name, got a silent 404, and then
  // "failed" for a reason that had nothing to do with the dispatcher.
  ok('2.4b the dependency was actually created', dep.status === 201 && dep.body.task.blocked === true, dep.body.task && dep.body.task.blocked);
  q = await queue();
  ok('2.5 a newly blocked task drops out of the queue', !inDispatch(q, plain.id), q.dispatch.map((t) => t.id));
  ok('2.6 and says it is blocked', /[Bb]locked/.test((skipFor(q, plain.id) || {}).reason || ''), skipFor(q, plain.id));

  await call('PATCH', `/api/todo/${blocker.id}`, { status: 'done', artifact_url: 'https://example.com/pr/1' });
  q = await queue();
  ok('2.7 unblocking it returns it to the queue', inDispatch(q, plain.id));

  // ── 3. The per-run cap ─────────────────────────────────────────────────────
  section('3. One run cannot hand out the whole board');

  const ids = [];
  for (let i = 0; i < 5; i++) {
    const t = (await add({ title: `Small api chore ${i}`, surface: 'api', size: 's', bucket: 'now', owner: 'agent' })).body.task;
    await call('PATCH', `/api/todo/${t.id}`, { auto_dispatch: 'eligible' });
    ids.push(t.id);
  }
  q = await queue();
  ok('3.1 the run is capped at the default', q.dispatch.length <= q.max_per_run, { got: q.dispatch.length, cap: q.max_per_run });
  ok('3.2 the cap is small enough to read the next morning', q.max_per_run <= 5, q.max_per_run);
  ok('3.3 what did not fit is REPORTED, not silently truncated',
    q.deferred.length > 0 && /Over the per-run cap/.test(q.deferred[0].reason), q.deferred.slice(0, 2));
  ok('3.4 eligible_count reports the true total, above the cap',
    q.eligible_count === q.dispatch.length + q.deferred.length, { eligible: q.eligible_count, d: q.dispatch.length, def: q.deferred.length });

  const q1 = await queue('?max=1');
  ok('3.5 the cap is overridable per run', q1.dispatch.length === 1 && q1.max_per_run === 1);

  // ── 4. Already-dispatched work is not handed out twice ─────────────────────
  section('4. A task in flight is not dispatched again');

  const first = q1.dispatch[0].id;
  await call('PATCH', `/api/todo/${first}`, { auto_dispatch: 'dispatched' });
  const q2 = await queue();
  ok('4.1 a dispatched task leaves the ready list', !inDispatch(q2, first));
  ok('4.2 and it is reported as in flight rather than vanishing',
    /Already dispatched/.test((skipFor(q2, first) || {}).reason || ''), skipFor(q2, first));

  // ── 5. The queue states the policy that produced it ────────────────────────
  section('5. The queue is auditable without opening the router');

  q = await queue();
  ok('5.1 it names the dispatchable sizes',
    Array.isArray(q.policy.dispatchable_sizes) && q.policy.dispatchable_sizes.join(',') === router.AUTO_DISPATCH_MAX_SIZES.join(','),
    q.policy.dispatchable_sizes);
  ok('5.2 large sizes are not on that list',
    !q.policy.dispatchable_sizes.includes('l') && !q.policy.dispatchable_sizes.includes('xl'));
  ok('5.3 it lists the never-auto reasons', q.policy.never_auto.length === router.NEVER_AUTO.length);
  ok('5.4 it says capability is recomputed', /recomputed/.test(q.policy.note || ''));
  ok('5.5 it carries a generated_at', !!Date.parse(q.generated_at || ''));

  // ── 6. It is read-only, and it leaks nothing ───────────────────────────────
  section('6. Selecting is not acting');

  const before = db.prepare('SELECT auto_dispatch, status FROM tasks WHERE id = ?').get(plain.id);
  await queue();
  const after = db.prepare('SELECT auto_dispatch, status FROM tasks WHERE id = ?').get(plain.id);
  ok('6.1 reading the queue changes no task state',
    before.auto_dispatch === after.auto_dispatch && before.status === after.status, { before, after });
  ok('6.2 reading the queue takes no claim',
    require('../lib/command-store').liveClaims().length === 0);

  const raw = (await call('GET', '/api/command/dispatch-queue')).body;
  ok('6.3 the queue never contains the credential', !JSON.stringify(raw).includes(process.env.TODO_KEY));

  const unauth = await fetch(BASE + '/api/command/dispatch-queue');
  ok('6.4 it is not readable without a credential', unauth.status === 401, unauth.status);

  // ── summary ────────────────────────────────────────────────────────────────
  console.log(`\n${'-'.repeat(70)}`);
  console.log(`dispatch queue: ${pass} passed, ${fail} failed`);
  if (fail) {
    console.log('\nFailed:');
    for (const f of failures) console.log('  - ' + f);
  }
  server.close();
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(DB + suf); } catch (_) {} }
  process.exit(fail ? 1 : 0);
})();
