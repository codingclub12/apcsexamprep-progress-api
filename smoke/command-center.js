'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: Command Center Phase 1. Every acceptance criterion in spec section 16,
//  numbered so a failure names the criterion it broke.
//
//  OFFLINE. Builds its own database in a temp file, mounts the real routers on a
//  throwaway express app, and drives them over real HTTP on an ephemeral port.
//  No production data, no network, no Playwright: this suite is meant to run on
//  every change to the command center, which means it has to be fast and it has
//  to have no dependencies.
//
//  Run: npm run smoke:command
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const HERE = __dirname;
const DB = path.join(HERE, 'smoke-command-center.db');
const POISON_DB = path.join(HERE, 'smoke-command-poison.db');

// ── Fault-injection child (criterion 14) ─────────────────────────────────────
//  Boots the REAL server.js against a database where the command migration is
//  guaranteed to throw ("views may not be indexed"), and checks the process
//  still comes up and still serves /api/health. No test hook in production code:
//  the fault is a genuine schema conflict in the file.
if (process.argv.includes('--boot-fault-child')) {
  (async () => {
    const port = Number(process.argv[process.argv.indexOf('--port') + 1]);
    process.env.PORT = String(port);
    process.env.DB_PATH = POISON_DB;
    require('../server');
    for (let i = 0; i < 60; i++) {
      try {
        const r = await fetch(`http://127.0.0.1:${port}/api/health`);
        const body = await r.json();
        // And the command center itself fails CLOSED rather than 500ing per
        // request: 503 with a reason, while the rest of the API is unaffected.
        const cc = await fetch(`http://127.0.0.1:${port}/api/todo`, {
          headers: { Authorization: `Bearer ${process.env.TODO_KEY || 'x'}` },
        });
        process.exit(r.ok && body.status === 'ok' && (cc.status === 503 || cc.status === 401) ? 0 : 1);
      } catch (_) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    process.exit(1);
  })();
  return;
}

for (const suf of ['', '-wal', '-shm']) {
  try { fs.unlinkSync(DB + suf); } catch (_) {}
  try { fs.unlinkSync(POISON_DB + suf); } catch (_) {}
}

process.env.DB_PATH = DB;
process.env.TODO_KEY = 'test-todo-key-0123456789-abcdefgh';
process.env.ADMIN_KEY = 'test-admin-key-0123456789-abcdefgh';
process.env.TODO_KEY_SCOPE = '';           // limited: the agent-scoped case
process.env.PUBLIC_BASE_URL = '';
delete process.env.COMMAND_OWNER_EMAIL;

const express = require('express');
const db = require('../db');
const adminSession = require('../lib/admin-session');
const commandRouter = require('../lib/command-router');
const commandSchema = require('../lib/command-schema');
const { hazardsFor } = require('../lib/command-hazards');

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

// A real admin session cookie, minted the same way /admin/login mints one.
let COOKIE = '';
adminSession.issue(
  { get: () => 'https', secure: true },
  { cookie: (name, value) => { COOKIE = `${name}=${encodeURIComponent(value)}`; } },
);

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use('/api/command', require('../routes/command'));
app.use('/api/todo', require('../routes/todo'));
// Mirrors server.js: the page is only served with a valid session, and it is a
// static file, so what the test reads is exactly what a browser receives.
app.get('/admin/command', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, '..', 'public', adminSession.isAuthed(req) ? 'command.html' : 'login.html'));
});

// A page this suite controls, fetched over real HTTP by the evidence verifier.
// Using a fixture rather than a stub means the route is exercised end to end,
// network layer included, without depending on anything outside this process.
app.get('/fixture/shipped', (req, res) => {
  res.type('html').send('<html><body><p>apcs-cyber-lesson-map is live</p></body></html>');
});
app.get('/fixture/not-shipped', (req, res) => {
  res.type('html').send('<html><body><p>nothing here yet</p></body></html>');
});

const server = app.listen(0);
const PORT = server.address().port;
const BASE = `http://127.0.0.1:${PORT}`;

// as: 'agent' (bearer), 'tanner' (cookie), 'none', or { readToken }
async function call(method, urlPath, { as = 'agent', body, headers = {} } = {}) {
  const h = Object.assign({ 'Content-Type': 'application/json' }, headers);
  if (as === 'agent') h.Authorization = `Bearer ${process.env.TODO_KEY}`;
  if (as === 'tanner') h.Cookie = COOKIE;
  const res = await fetch(BASE + urlPath, {
    method,
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch (_) { parsed = text; }
  return { status: res.status, body: parsed, text };
}

const raw = (sql, ...args) => db.prepare(sql).run(...args);

(async function main() {
  // ── Criterion 8 + 1: the migration is additive against real student data ──
  section('Migration safety (criteria 8, 14)');
  raw(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@school.org','x')`);
  raw(`INSERT INTO classes (id,teacher_id,class_code,class_name,course) VALUES ('c1','t1','CSA-TEST','Test','ap-csa')`);
  raw(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c1','A','x')`);
  raw(`INSERT INTO progress (id,student_id,class_id,course,unit,lesson,activity_type,completed,score)
       VALUES ('p1','s1','c1','ap-csa','unit-1','1.1','visit',1,88)`);
  raw(`INSERT INTO attempts (student_id,class_id,course,lesson_id,item_id,item_type,score,max_score,passed,attempt_no)
       VALUES ('s1','c1','ap-csa','1.1','1.1-quiz','quiz',8,10,1,1)`);

  const snapshot = () => JSON.stringify({
    progress: db.prepare('SELECT * FROM progress ORDER BY id').all(),
    attempts: db.prepare('SELECT * FROM attempts ORDER BY id').all(),
    students: db.prepare('SELECT * FROM students ORDER BY id').all(),
  });
  const before = snapshot();
  const applied = commandSchema.applyCommandCenterSchema(db);
  ok('8. no existing student/progress row modified by the migration',
    snapshot() === before && applied.unchanged, { before: applied.before, after: applied.after });

  // Criterion 14: a throw inside the migration does not prevent boot.
  const Database = require('better-sqlite3');
  const poison = new Database(POISON_DB);
  poison.exec('CREATE VIEW deps AS SELECT 1 AS task_id, 2 AS blocks_task_id');
  poison.close();
  // Ask the OS for a free port rather than guessing one next to ours, so the
  // child cannot fail on a collision in CI.
  const childPort = await new Promise((resolve) => {
    const probe = require('net').createServer();
    probe.listen(0, '127.0.0.1', () => {
      const p = probe.address().port;
      probe.close(() => resolve(p));
    });
  });
  const child = spawnSync(process.execPath, [__filename, '--boot-fault-child', '--port', String(childPort)], {
    encoding: 'utf8', timeout: 30000, env: Object.assign({}, process.env, { DB_PATH: POISON_DB }),
  });
  ok('14. a thrown exception inside the migration does not prevent boot; /api/health still ok',
    child.status === 0, { status: child.status, stderr: String(child.stderr || '').slice(-400) });

  // ── Criterion 6: unauthenticated ──────────────────────────────────────────
  section('Auth (criteria 6, 9, 10, 11)');
  ok('6. unauthenticated GET /api/todo is 401', (await call('GET', '/api/todo', { as: 'none' })).status === 401);
  ok('6. unauthenticated GET /api/command/digest is 401', (await call('GET', '/api/command/digest', { as: 'none' })).status === 401);
  ok('6. a wrong bearer token is 401', (await call('GET', '/api/todo', { as: 'none', headers: { Authorization: 'Bearer nope-nope-nope-nope-nope' } })).status === 401);

  // ── Criterion 1 + 2: the registry loads and sorts ─────────────────────────
  section('Queue, sort, and the 63-item registry (criteria 1, 2, 3, 5)');
  const registry = [];
  for (let i = 1; i <= 63; i++) {
    const buckets = ['now', 'week', 'someday', 'before_school', 'september', 'decision'];
    registry.push({
      title: `Registry item ${i}`,
      detail: `Seeded acceptance row ${i}`,
      bucket: buckets[i % buckets.length],
      owner: i % 3 === 0 ? 'agent' : 'tanner',
      size: ['xs', 's', 'm', 'l', 'xl'][i % 5],
      surface: ['api', 'theme', 'content', 'shopify', 'klaviyo', 'drive', 'ops'][i % 7],
      course: ['csa', 'csp', 'cyber', 'all'][i % 4],
      impact: (i % 5) + 1,
      effort: (i % 4) + 1,
      position: i,
    });
  }
  const bulk = await call('POST', '/api/todo/bulk', {
    as: 'tanner',
    body: {
      _meta: {
        source_documents: {
          csa: 'ap-computer-science-a-course-and-exam-description__1_.pdf',
          api: 'COMMAND-CENTER-SPEC-v1.1.md',
        },
      },
      tasks: registry,
    },
  });
  ok('bulk load created 63 tasks', bulk.status === 201 && bulk.body.created === 63, bulk.body && bulk.body.errors);

  const list1 = await call('GET', '/api/todo');
  ok('1. GET /api/todo returns 63 seeded items', list1.body.count === 63, list1.body && list1.body.count);

  // The documented order, recomputed independently from the returned rows.
  const rank = { now: 0, decision: 1, week: 2, before_school: 3, september: 4, someday: 5 };
  const expected = list1.body.tasks.slice().sort((a, b) => {
    const k = (t) => [
      t.overdue_promise ? 0 : 1, t.bleeding ? 0 : 1, rank[t.effective_bucket],
      t.due_date || '9999-12-31', -(t.cost_per_day || 0), -(t.impact || 0), t.effort || 9,
      t.position || 0, t.id,
    ];
    const ka = k(a); const kb = k(b);
    for (let i = 0; i < ka.length; i++) { if (ka[i] < kb[i]) return -1; if (ka[i] > kb[i]) return 1; }
    return 0;
  });
  ok('1. returned in the documented sort order',
    JSON.stringify(list1.body.tasks.map((t) => t.id)) === JSON.stringify(expected.map((t) => t.id)));

  const list2 = await call('GET', '/api/todo');
  ok('2. sort is stable across two identical requests', list2.text === list1.text);

  // An overdue promise forces its task above everything else.
  const lowly = list1.body.tasks[list1.body.tasks.length - 1];
  await call('POST', '/api/command/promises', {
    as: 'tanner',
    body: { task_id: lowly.id, person: 'Ms. Rivera', email: 'rivera@example.org', what: 'Send the CSA pacing guide', promised_by: '2026-08-01' },
  });
  const list3 = await call('GET', '/api/todo');
  ok('2. an overdue promise forces its task above everything else',
    list3.body.tasks[0].id === lowly.id && list3.body.tasks[0].effective_bucket === 'now',
    { top: list3.body.tasks[0].id, expected: lowly.id });

  // Criterion 3: check off an item, it leaves NOW, and the event is recorded.
  const nowTask = list3.body.tasks.find((t) => t.effective_bucket === 'now' && t.id !== lowly.id);
  const closed = await call('PATCH', `/api/todo/${nowTask.id}`, {
    as: 'tanner', body: { status: 'done', artifact_url: 'https://github.com/x/y/pull/1' },
  });
  const afterClose = await call('GET', '/api/todo');
  const stillListed = afterClose.body.tasks.some((t) => t.id === nowTask.id);
  const detail = await call('GET', `/api/todo/${nowTask.id}`);
  const hasEvent = detail.body.events.some((e) => e.action === 'set:status' && e.to_value === 'done');
  ok('3. checking an item off removes it from NOW and writes a task_events row',
    closed.status === 200 && !stillListed && hasEvent, { closed: closed.status, stillListed, hasEvent });

  // Criterion 5: an unfinished blocker greys the row and excludes it from agent_ready.
  const agentTask = list3.body.tasks.find((t) => t.owner === 'agent' && t.surface === 'api' && t.bucket !== 'decision');
  const blocker = list3.body.tasks.find((t) => t.id !== agentTask.id);
  await call('POST', `/api/todo/${agentTask.id}/deps`, { as: 'tanner', body: { blocks_task_id: blocker.id } });
  const blockedRow = (await call('GET', `/api/todo/${agentTask.id}`)).body.task;
  const digestAfterBlock = (await call('GET', '/api/command/digest', { as: 'tanner' })).body;
  ok('5. an unfinished blocker marks the task blocked, names the blocker, and drops it from agent_ready',
    blockedRow.blocked === true
    && blockedRow.blocked_by.length === 1 && blockedRow.blocked_by[0].id === blocker.id
    && !digestAfterBlock.agent_ready.some((t) => t.id === agentTask.id),
    { blocked: blockedRow.blocked, blocked_by: blockedRow.blocked_by });

  // ── Scope gating ──────────────────────────────────────────────────────────
  const promisesAgent = await call('GET', '/api/command/promises', { as: 'agent' });
  ok('9. agent-scoped token gets 403 on GET /api/command/promises', promisesAgent.status === 403, promisesAgent.body);
  const promisesTanner = await call('GET', '/api/command/promises', { as: 'tanner' });
  ok('9. the cookie path still reads promises', promisesTanner.status === 200 && promisesTanner.body.count >= 1);

  const verifyAttempt = await call('PATCH', `/api/todo/${nowTask.id}`, { as: 'agent', body: { verified: 1 } });
  ok('10. agent-scoped token gets 403 setting verified=1', verifyAttempt.status === 403, verifyAttempt.body);
  const verifyRoute = await call('POST', `/api/todo/${nowTask.id}/verify`, { as: 'agent', body: {} });
  ok('10. agent-scoped token gets 403 on the verify route too', verifyRoute.status === 403, verifyRoute.body);

  const decisionTask = list3.body.tasks.find((t) => t.bucket === 'decision');
  const closeDecision = await call('PATCH', `/api/todo/${decisionTask.id}`, {
    as: 'agent', body: { status: 'done', artifact_url: 'https://example.com/artifact' },
  });
  ok('11. agent-scoped token gets 403 closing a bucket=decision task', closeDecision.status === 403, closeDecision.body);

  // ── Verification ledger ───────────────────────────────────────────────────
  section('Verification ledger (criteria 12, 13)');
  const agentDone = list3.body.tasks.find((t) => t.owner === 'agent' && t.bucket !== 'decision'
    && ![agentTask.id, nowTask.id, blocker.id, lowly.id].includes(t.id));
  const noArtifact = await call('PATCH', `/api/todo/${agentDone.id}`, { as: 'agent', body: { status: 'done' } });
  ok('13. status=done without artifact_url is 400 with the message',
    noArtifact.status === 400 && /cannot be closed without an artifact/i.test(noArtifact.body.error)
    && /PR URL/.test(noArtifact.body.error) && /md5/.test(noArtifact.body.error),
    noArtifact.body);

  const withArtifact = await call('PATCH', `/api/todo/${agentDone.id}`, {
    as: 'agent', body: { status: 'done', artifact_url: 'https://github.com/x/y/pull/42' },
  });
  const digestAfterDone = (await call('GET', '/api/command/digest', { as: 'tanner' })).body;
  ok('12. an agent close lands as verified=0 and appears in needs_verification',
    withArtifact.status === 200 && withArtifact.body.task.verified === false
    && digestAfterDone.needs_verification.some((t) => t.id === agentDone.id),
    { verified: withArtifact.body.task && withArtifact.body.task.verified });

  // The verify link. `verified` stays cookie-auth only; this is about how many
  // clicks it takes a human to reach the button, not about who may press it.
  const vTask = digestAfterDone.needs_verification.find((t) => t.id === agentDone.id);
  ok('12. every task carries a deep link to its own row',
    !!vTask && vTask.verify_url === `${BASE}/admin/command#t${agentDone.id}`, vTask && vTask.verify_url);

  const cookieVerify = await call('POST', `/api/todo/${agentDone.id}/verify`, { as: 'tanner', body: {} });
  ok('12. the cookie path can set verified=1', cookieVerify.status === 200 && cookieVerify.body.task.verified === true);

  // The artifact gate is an AGENT rule, not a universal one. Tanner closing his
  // own row is one click: half the queue is email, phone calls, and Shopify
  // edits that will never have a PR URL, and the human pressing the button is
  // the verification. Criterion 13 above still holds for the bearer path.
  const humanClose = list3.body.tasks.find((t) => t.owner === 'tanner' && t.bucket !== 'decision'
    && ![agentTask.id, nowTask.id, blocker.id, lowly.id, agentDone.id].includes(t.id));
  const humanDone = await call('PATCH', `/api/todo/${humanClose.id}`, { as: 'tanner', body: { status: 'done' } });
  ok('the cookie path closes an item with no artifact, in one click',
    humanDone.status === 200 && humanDone.body.task.status === 'done' && !humanDone.body.task.artifact_url,
    humanDone.body);
  const humanVerify = await call('POST', `/api/todo/${humanClose.id}/verify`, { as: 'tanner', body: {} });
  ok('and can verify it without an artifact too',
    humanVerify.status === 200 && humanVerify.body.task.verified === true, humanVerify.body);

  // ── Claim protocol ────────────────────────────────────────────────────────
  section('Claim protocol (criteria 16, 17, 18)');
  const claimTask = list3.body.tasks.find((t) => t.surface === 'api'
    && ![agentTask.id, agentDone.id, nowTask.id, blocker.id, lowly.id, humanClose.id].includes(t.id));
  const claim1 = await call('POST', `/api/command/task/${claimTask.id}/claim`, {
    as: 'agent',
    body: { surface: 'claude_code', session_label: 'first session', locks: ['progress-api:db.js'], ttl_minutes: 60 },
  });
  ok('claim succeeds and returns a claim id plus expiry',
    claim1.status === 201 && claim1.body.claim_id > 0 && !!claim1.body.expires_at, claim1.body);

  const claim2 = await call('POST', `/api/command/task/${claimTask.id}/claim`, {
    as: 'agent',
    body: { surface: 'cowork', session_label: 'second session', locks: ['progress-api:db.js'] },
  });
  ok('16. a second claim on a locked repo:path is 409 naming the holder and the age',
    claim2.status === 409 && claim2.body.holder && claim2.body.holder.surface === 'claude_code'
    && typeof claim2.body.held_for_minutes === 'number'
    && claim2.body.locks_conflicting.join() === 'progress-api:db.js',
    claim2.body);

  const eventsBeforeForce = db.prepare('SELECT COUNT(*) n FROM task_events WHERE action = ?').get('claim_forced_out').n;
  const forced = await call('POST', `/api/command/task/${claimTask.id}/claim?force=true`, {
    as: 'agent',
    body: { surface: 'cowork', session_label: 'forcing session', locks: ['progress-api:db.js'] },
  });
  const eventsAfterForce = db.prepare('SELECT COUNT(*) n FROM task_events WHERE action = ?').get('claim_forced_out').n;
  ok('17. ?force=true succeeds AND writes a task_events row',
    forced.status === 201 && forced.body.forced === true && eventsAfterForce === eventsBeforeForce + 1,
    { status: forced.status, events: eventsAfterForce - eventsBeforeForce });

  const hb = await call('POST', `/api/command/claim/${forced.body.claim_id}/heartbeat`, { as: 'agent', body: {} });
  ok('heartbeat keeps a claim running', hb.status === 200 && hb.body.state === 'running', hb.body);

  // Criterion 18: 45+ minutes alive, still heartbeating, zero events written.
  const stuckTask = list3.body.tasks.find((t) => t.surface === 'ops');
  raw(`INSERT INTO claims (task_id, surface, session_label, locks, claimed_at, heartbeat_at, expires_at)
       VALUES (?, 'cowork', 'looping session', '["progress-api:lib/stuck.js"]',
               datetime('now','-70 minutes'), datetime('now'), datetime('now','+60 minutes'))`, stuckTask.id);
  raw('DELETE FROM task_events WHERE task_id = ?', stuckTask.id);
  const digestStuck = (await call('GET', '/api/command/digest', { as: 'tanner' })).body;
  ok('18. a claim heartbeating 45+ min with zero events appears in digest.stuck',
    digestStuck.stuck.some((c) => c.task_id === stuckTask.id), digestStuck.stuck);

  // Return closes the loop.
  const returned = await call('POST', `/api/command/claim/${forced.body.claim_id}/return`, {
    as: 'agent', body: { status: 'awaiting_review', artifact_url: 'https://github.com/x/y/pull/9', notes: 'PR open' },
  });
  ok('claim return writes the task back and releases the lock',
    returned.status === 200 && returned.body.task.status === 'awaiting_review'
    && !(await call('GET', '/api/command/digest', { as: 'tanner' })).body.in_flight.some((c) => c.claim_id === forced.body.claim_id),
    returned.body && returned.body.task && returned.body.task.status);

  // ── Router (criterion 19) ─────────────────────────────────────────────────
  section('Router (criteria 19, 21)');
  const table = [
    { name: 'bucket=decision', task: { bucket: 'decision', surface: 'api' }, surface: 'none' },
    { name: 'surface=api', task: { bucket: 'week', surface: 'api' }, surface: 'claude_code' },
    { name: 'surface=theme', task: { bucket: 'week', surface: 'theme' }, surface: 'claude_code', flag: 'gated' },
    { name: 'shopify <= 58KB', task: { bucket: 'week', surface: 'shopify', page_bytes: 40 * 1024 }, surface: 'chat' },
    { name: 'shopify > 58KB', task: { bucket: 'week', surface: 'shopify', page_bytes: 132.4 * 1024 }, surface: 'chat', flag: 'admin editor only' },
    { name: 'content size l', task: { bucket: 'week', surface: 'content', size: 'l' }, surface: 'cowork' },
    { name: 'content size xl', task: { bucket: 'week', surface: 'content', size: 'xl' }, surface: 'cowork' },
    { name: 'content size m', task: { bucket: 'week', surface: 'content', size: 'm' }, surface: 'chat' },
    { name: 'content size xs', task: { bucket: 'week', surface: 'content', size: 'xs' }, surface: 'chat' },
    { name: 'surface=klaviyo', task: { bucket: 'week', surface: 'klaviyo' }, surface: 'chat', flag: 'staged only' },
    { name: 'surface=drive', task: { bucket: 'week', surface: 'drive' }, surface: 'chat' },
    { name: 'surface=ops', task: { bucket: 'week', surface: 'ops' }, surface: 'chat' },
  ];
  let routerOk = true;
  const routerMisses = [];
  for (const row of table) {
    const r = commandRouter.route(row.task, { themeCiExists: false });
    const surfaceOk = r.routed_surface === row.surface;
    const flagOk = !row.flag || r.flags.includes(row.flag);
    if (!surfaceOk || !flagOk) { routerOk = false; routerMisses.push({ row: row.name, got: r.routed_surface, flags: r.flags }); }
  }
  ok('19. the router returns the documented surface for every row of the 4.1 table', routerOk, routerMisses);
  ok('19. every routed task carries a model and a human-readable reason',
    table.every((row) => {
      const r = commandRouter.route(row.task, {});
      return ['fable', 'opus', 'sonnet', 'haiku'].includes(r.routed_model) && r.routed_reason.length > 20;
    }));

  // Criterion 21: theme is never eligible until theme CI exists.
  const themeTask = list3.body.tasks.find((t) => t.surface === 'theme');
  const themeEligible = await call('PATCH', `/api/todo/${themeTask.id}`, { as: 'tanner', body: { auto_dispatch: 'eligible' } });
  ok('21. auto_dispatch=eligible is rejected for surface=theme until theme CI exists',
    themeEligible.status === 400 && /theme-repo CI/i.test(themeEligible.body.error), themeEligible.body);

  await call('PATCH', '/api/command/config', { as: 'tanner', body: { theme_ci_exists: 1 } });
  const themeAfterCi = await call('PATCH', `/api/todo/${themeTask.id}`, { as: 'tanner', body: { auto_dispatch: 'eligible' } });
  ok('21. and accepted once the theme CI flag is set', themeAfterCi.status === 200, themeAfterCi.body);
  await call('PATCH', '/api/command/config', { as: 'tanner', body: { theme_ci_exists: 0 } });

  const shopifyNever = commandRouter.autoDispatchEligibility({ surface: 'shopify', bucket: 'week', status: 'open' }, {});
  const moneyNever = commandRouter.autoDispatchEligibility({ surface: 'api', bucket: 'week', status: 'open', title: 'Fix the discount code logic' }, {});
  ok('21. shopify can never be eligible, and the never-auto-merge list holds',
    !shopifyNever.eligible && !moneyNever.eligible && /money/i.test(moneyNever.reason),
    { shopify: shopifyNever.reason, money: moneyNever.reason });

  // ── Prompt compiler (criteria 20, 22, 23, 27) ─────────────────────────────
  section('Prompt compiler (criteria 20, 22, 23, 27)');
  const decisionPrompt = await call('GET', `/api/command/task/${decisionTask.id}/prompt`);
  ok('20. a bucket=decision task compiles to a decision brief, not a work prompt',
    decisionPrompt.body.kind === 'decision_brief'
    && /DECISION BRIEF/.test(decisionPrompt.body.prompt)
    && /What is being decided/.test(decisionPrompt.body.prompt)
    && /What deferring costs/.test(decisionPrompt.body.prompt)
    && !/Write-back protocol/.test(decisionPrompt.body.prompt),
    decisionPrompt.body.kind);

  const shopifyTask = list3.body.tasks.find((t) => t.surface === 'shopify');
  const shopifyPrompt = (await call('GET', `/api/command/task/${shopifyTask.id}/prompt`)).body;
  ok('22. a surface=shopify prompt carries the colour / entity / &quot; hazard block verbatim',
    shopifyPrompt.prompt.includes('-webkit-text-fill-color')
    && shopifyPrompt.prompt.includes('&quot;')
    && /HTML entities only/.test(shopifyPrompt.prompt)
    && /64-minute/.test(shopifyPrompt.prompt));

  const csaContent = await call('POST', '/api/todo', {
    as: 'tanner',
    body: { title: 'Rewrite the 4.14 File/Scanner lab', surface: 'content', course: 'csa', size: 'm', bucket: 'week' },
  });
  const csaPrompt = (await call('GET', `/api/command/task/${csaContent.body.task.id}/prompt`)).body;
  ok('23. a course=csa content prompt carries the 4-unit CED constraint',
    /4-unit/.test(csaPrompt.prompt)
    && /ap-computer-science-a-course-and-exam-description__1_\.pdf/.test(csaPrompt.prompt)
    && /recursion TRACING only/.test(csaPrompt.prompt));

  ok('27. a chat-routed prompt ends with a paste-ready curl return command',
    csaPrompt.closes_manually === true
    && /```bash[\s\S]*curl -sS -X PATCH[\s\S]*Authorization: Bearer \$TODO_KEY[\s\S]*```/.test(csaPrompt.prompt)
    && csaPrompt.prompt.trimEnd().endsWith('`verified` stays 0 until Tanner sets it from the browser.'),
    { closes_manually: csaPrompt.closes_manually, tail: csaPrompt.prompt.trimEnd().slice(-120) });

  const apiTask = list3.body.tasks.find((t) => t.surface === 'api' && t.bucket !== 'decision');
  const apiPrompt = (await call('GET', `/api/command/task/${apiTask.id}/prompt`)).body;
  ok('compiled prompts never contain the TODO_KEY value', !apiPrompt.prompt.includes(process.env.TODO_KEY));
  ok('an api prompt carries the api hazard block and the write-back protocol',
    /Additive migrations only/.test(apiPrompt.prompt) && /Write-back protocol/.test(apiPrompt.prompt)
    && /1 vCPU \/ 1GB with a prior \$169 leak/.test(apiPrompt.prompt));
  ok('an MCQ-producing task picks up the MCQ hazard block',
    hazardsFor({ surface: 'content', course: 'csp', title: 'Write 20 MCQs for 3.4' }).some((h) => h.title === 'MCQ writing'));

  // ── Public read URL (criteria 24, 25, 26) ─────────────────────────────────
  section('Public digest read URL (criteria 24, 25, 26)');
  const tok1 = await call('GET', '/api/command/read-token', { as: 'tanner' });
  ok('the read URL is only issued to the cookie path',
    tok1.status === 200 && !!tok1.body.token
    && (await call('GET', '/api/command/read-token', { as: 'agent' })).status === 403);

  const pub = await call('GET', `/api/command/digest/r/${tok1.body.token}`, { as: 'none' });
  const pubText = JSON.stringify(pub.body);
  ok('24. GET /api/command/digest/r/:token returns 200 with no person or email field anywhere',
    pub.status === 200 && !/"person"/.test(pubText) && !/"email"/.test(pubText)
    && pub.body.overdue_promises.length >= 1
    && typeof pub.body.overdue_promises[0].days_late === 'number'
    && !!pub.body.overdue_promises[0].what,
    pub.body && pub.body.overdue_promises);

  const asBearer = await call('GET', '/api/todo', { as: 'none', headers: { Authorization: `Bearer ${tok1.body.token}` } });
  const otherRoute = await call('GET', `/api/command/promises/r/${tok1.body.token}`, { as: 'none' });
  const postToRead = await call('POST', `/api/command/digest/r/${tok1.body.token}`, { as: 'none', body: {} });
  const patchToRead = await call('PATCH', `/api/command/digest/r/${tok1.body.token}`, { as: 'none', body: {} });
  const delToRead = await call('DELETE', `/api/command/digest/r/${tok1.body.token}`, { as: 'none' });
  ok('25. the read token 401s on every non-digest route and on any POST/PATCH/DELETE',
    asBearer.status === 401 && otherRoute.status === 401 && postToRead.status === 401
    && patchToRead.status === 401 && delToRead.status === 401,
    { asBearer: asBearer.status, otherRoute: otherRoute.status, post: postToRead.status, patch: patchToRead.status, del: delToRead.status });

  const tok2 = await call('POST', '/api/command/read-token/rotate', { as: 'tanner', body: {} });
  const oldTokenNow = await call('GET', `/api/command/digest/r/${tok1.body.token}`, { as: 'none' });
  const newTokenNow = await call('GET', `/api/command/digest/r/${tok2.body.token}`, { as: 'none' });
  ok('26. rotating the read token immediately 401s the previous one',
    tok2.body.token !== tok1.body.token && oldTokenNow.status === 401 && newTokenNow.status === 200,
    { old: oldTokenNow.status, fresh: newTokenNow.status });

  // The agent-scoped bearer sees the same digest shape with the identity gone.
  const agentDigest = (await call('GET', '/api/command/digest', { as: 'agent' })).body;
  const tannerDigest = (await call('GET', '/api/command/digest', { as: 'tanner' })).body;
  ok('an agent-scoped digest keeps overdue_promises but drops person and email',
    agentDigest.overdue_promises.length === tannerDigest.overdue_promises.length
    && agentDigest.overdue_promises.every((p) => !('person' in p) && !('email' in p))
    && tannerDigest.overdue_promises.every((p) => 'person' in p));

  // ── Digest shape ──────────────────────────────────────────────────────────
  section('Digest shape (spec 8)');
  const fields = ['as_of', 'changed_since', 'overdue_promises', 'bleeding', 'costing_money', 'due_soon',
    'decisions_blocking', 'quick_wins', 'agent_ready', 'needs_verification', 'awaiting_review',
    'in_flight', 'stale', 'stuck', 'health', 'blocked_count', 'counts_by_bucket'];
  const missing = fields.filter((f) => !(f in tannerDigest));
  ok('the digest carries every documented field', missing.length === 0, missing);
  ok('decisions_blocking counts what waits behind each decision',
    Array.isArray(tannerDigest.decisions_blocking)
    && tannerDigest.decisions_blocking.every((d) => typeof d.blocking_count === 'number'));
  ok('health carries the free gradebook + pipeline metrics',
    tannerDigest.health && typeof tannerDigest.health.active_students === 'number'
    && typeof tannerDigest.health.attempts_24h === 'number');
  ok('agent_ready rows carry routed_surface and a prompt_url',
    tannerDigest.agent_ready.length > 0
    && tannerDigest.agent_ready.every((t) => !!t.routed_surface && /\/api\/command\/task\/\d+\/prompt$/.test(t.prompt_url)));

  // ── The page (criteria 7, 15, 28) ─────────────────────────────────────────
  section('The page (criteria 7, 15, 28)');
  const pageRes = await fetch(BASE + '/admin/command', { headers: { Cookie: COOKIE } });
  const page = await pageRes.text();
  ok('15. the rendered page contains no occurrence of the TODO_KEY value',
    pageRes.status === 200 && !page.includes(process.env.TODO_KEY) && !page.includes('TODO_KEY'),
    { status: pageRes.status });
  ok('15. and no admin key either', !page.includes(process.env.ADMIN_KEY));
  ok('the page is served only with a session; without one it is the login page',
    !(await (await fetch(BASE + '/admin/command')).text()).includes('Command Center'));
  ok('7. the page is built for 380px: device-width viewport, no horizontal overflow, fluid grids',
    /width=device-width/.test(page)
    && /overflow-x:hidden/.test(page)
    && /max-width:100%/.test(page)
    && /grid-template-columns:repeat\(3,1fr\)/.test(page)
    && !/min-width:\s*[5-9]\d\dpx/.test(page.replace(/@media[^{]*/g, '')));
  ok('7. every control is reachable on mobile: no capture-only mode, tap targets are 32px or more',
    /min-height:38px/.test(page) && /min-height:32px/.test(page));
  ok('28. a chat-routed row renders "closes manually" rather than a claim affordance',
    /closes_manually/.test(page) && /closes manually/.test(page) && !/data-act="claim"/.test(page));
  ok('28. and the API marks chat-routed tasks closes_manually',
    (await call('GET', `/api/todo/${csaContent.body.task.id}`)).body.task.closes_manually === true);
  ok('the page greys the auto-dispatch toggle with the router reason',
    /auto_dispatch_eligible \? "" : " disabled"/.test(page) && /auto_dispatch_reason/.test(page));

  // ── Reconcile panel ────────────────────────────────────────────────────────
  //  The button lives here because the verify click already does. The WORK runs
  //  on a GitHub runner, and the page must keep saying so: someone who reads
  //  this panel as "the API will go and fetch a dozen pages" would be wrong in a
  //  way that matters on a 1 vCPU box.
  ok('the reconcile panel is on the page and points at the workflow',
    /id="reconcilecard"/.test(page) && /verify-board\.yml/.test(page));
  ok('it says the work runs on a runner, not here',
    /GitHub runner rather than here/.test(page));
  ok('it says it writes nothing and that verified stays a human click',
    /writes nothing/i.test(page) && /verified<\/strong> stays yours/.test(page));
  // Every value in that panel comes from an external API. This page already had
  // one stored-XSS hole through innerHTML interpolation, so the panel is held to
  // textContent, and an href taken from the API is pattern-checked first.
  ok('the panel writes external values with textContent, never innerHTML',
    /status\.textContent = "Last run: "/.test(page)
    && !/innerHTML[^\n]*run\./.test(page));
  ok('an href taken from the GitHub API is validated before it is assigned',
    /\^https:\\\/\\\/github\\\.com\\\//.test(page) && /lastBtn\.href = run\.html_url/.test(page));
  ok('the panel degrades to a working button if GitHub cannot be reached',
    /Could not reach GitHub/.test(page) && /The button still works/.test(page));

  // ── The row shows the id it is referred to by ─────────────────────────────
  //  Every other surface names a task by number: `apcs done 133`, "blocked by
  //  #133", the prompt URL, a person saying "task 133". The page was the single
  //  place that number could not be read, because it lived only in a data-
  //  attribute, so a human could not connect what an agent said to a row.
  ok('the row renders a visible #id next to the title',
    /<span class="tid">#' \+ esc\(t\.id\) \+ "<\/span>/.test(page));
  //  Escaped, not interpolated raw. This page has had a stored-XSS hole through
  //  innerHTML before, and the id lands in TEXT here rather than an attribute,
  //  so it goes through esc() like every other value the row prints.
  ok('the id is escaped on the way into the row',
    !/<span class="tid">#' \+ t\.id/.test(page));
  ok('the id is styled as a reference rather than competing with the title',
    /\.row \.tid \{[^}]*color:var\(--muted\)/.test(page));
  //  Two behaviours the id must NOT have. It carries no data-act, or clicking
  //  the number would toggle the row open, which is precisely what someone
  //  trying to select it for pasting would do. And user-select:all makes that
  //  one click take the whole token rather than half of it.
  ok('the id carries no data-act, so clicking it cannot expand the row',
    !/<span class="tid"[^>]*data-act/.test(page));
  ok('the id is selectable in one click for pasting',
    /\.row \.tid \{[^}]*user-select:all/.test(page));

  // ── The deep link has to survive the filters ──────────────────────────────
  //  A link that lands on a hidden row fails exactly when it is needed. The
  //  board's defaults hide precisely the tasks awaiting verification: owner is
  //  "tanner" so agent-owned work is filtered out, `closed` is false so anything
  //  done is not even fetched, and the closed group renders collapsed.
  ok('  the page reads a #t<id> hash', /\^#t\(\\d\{1,9\}\)\$/.test(page) || /#t\(\\d/.test(page));
  ok('  include_closed is forced on, or a done task is not in the payload',
    /if \(focusId\) \{[\s\S]{0,200}state\.closed = true;/.test(page));
  ok('  the focused row is expanded, so Verify is on screen not one click away',
    /state\.open\[focusId\] = true;/.test(page));
  ok('  and the client-side filters cannot hide it',
    /if \(focusId && t\.id === focusId\) return true;/.test(page));
  //  The override must NOT be persisted. Clearing somebody's filters forever to
  //  show them one row would be a rude trade, and it would be invisible until
  //  they next opened the board and wondered why everything moved.
  //  Naive proximity does not work here: `function save()` is declared a few
  //  lines below the block, so a "no save() within N chars" regex matches the
  //  DECLARATION and fails on correct code. Read the block itself instead.
  const focusBlock = (function () {
    const i = page.indexOf('if (focusId) {');
    if (i < 0) return null;
    let depth = 0;
    for (let j = page.indexOf('{', i); j < page.length; j++) {
      if (page[j] === '{') depth += 1;
      else if (page[j] === '}') { depth -= 1; if (depth === 0) return page.slice(i, j + 1); }
    }
    return null;
  })();
  ok('  the override is applied AFTER stored prefs load, so it wins',
    !!focusBlock && page.indexOf('if (focusId) {') > page.indexOf('localStorage.getItem(LS)'));
  ok('  and is never persisted: clearing saved filters to show one row is a rude trade',
    !!focusBlock && !/\bsave\s*\(/.test(focusBlock), focusBlock);
  //  The scroll happens once. load() re-renders on every poll, and yanking the
  //  viewport back each time would fight the person reading the row.
  ok('  it scrolls once, but re-marks on every render',
    /var focusScrolled = false;/.test(page) && /if \(focusScrolled\) return;/.test(page)
    && /if \(focusId\) focusRow\(\);/.test(page));

  // ── Chat cannot claim ─────────────────────────────────────────────────────
  const chatClaim = await call('POST', `/api/command/task/${csaContent.body.task.id}/claim`, {
    as: 'agent', body: { surface: 'chat', session_label: 'chat session', locks: ['theme:assets/x.js'] },
  });
  ok('chat is refused a claim, with the reason, rather than being handed a lock it cannot release',
    chatClaim.status === 400 && /cannot hold a claim/i.test(chatClaim.body.error), chatClaim.body);

  // ── Wrap ──────────────────────────────────────────────────────────────────
  // ── VERIFY BY EVIDENCE ─────────────────────────────────────────────────────
  //  The route that can mark work verified without a cookie. Weighted towards
  //  refusal: a false negative costs a human ten seconds, a false positive puts
  //  a tick next to work nobody checked.
  section('Verify by evidence: re-derivation, never assertion');
  {
    const mk = async (artifact) => {
      const r = await call('POST', '/api/todo', { body: {
        title: 'evidence route fixture', bucket: 'week', artifact_url: artifact } });
      const id = (r.body.task || r.body).id;
      await call('PATCH', `/api/todo/${id}`, { body: { status: 'done' } });
      return id;
    };

    const shipped = await mk(`${BASE}/fixture/shipped`);
    const notShipped = await mk(`${BASE}/fixture/not-shipped`);
    const noUrl = await mk('talked to the teacher, all good');

    const good = await call('POST', `/api/todo/${shipped}/verify-by-evidence`,
      { body: { expect: 'apcs-cyber-lesson-map' } });
    ok('  a phrase present in the live page verifies over real http',
      good.status === 200 && good.body.verified === true, good.body);
    ok('  and the task actually flips to verified',
      !!(good.body.task && good.body.task.verified), good.body.task && good.body.task.verified);
    ok('  the evidence carries a re-runnable command',
      good.body.evidence && /verify-artifact\.js .*--phrase/.test(good.body.evidence.rerun),
      good.body.evidence);

    const ev = await call('GET', `/api/todo/${shipped}`);
    const notes = JSON.stringify(ev.body || '');
    ok('  and the ledger records how it was verified, with the re-run command',
      /machine-verified/.test(notes) && /Re-run:/.test(notes), notes.slice(0, 300));

    const absent = await call('POST', `/api/todo/${notShipped}/verify-by-evidence`,
      { body: { expect: 'apcs-cyber-lesson-map' } });
    ok('  a phrase the page does not serve is refused 422',
      absent.status === 422 && absent.body.verified === false, absent.body);
    const stillOpen = await call('GET', `/api/todo/${notShipped}`);
    ok('  and that task is NOT verified',
      !(stillOpen.body.task || stillOpen.body).verified,
      (stillOpen.body.task || stillOpen.body).verified);

    //  'all good' clears the length floor, has enough distinct characters, and
    //  its words are not all in the generic set, so ONLY the stoplist can refuse
    //  it. A shorter fixture like 'live' is caught by the length rule first and
    //  leaves the stoplist untested, which is how the same mutation survived
    //  three separate suites before this line was written.
    //  Fresh tasks: `shipped` was verified by the assertion above, and the
    //  already-verified precondition fires before any phrase rule, so reusing it
    //  tested the precondition while claiming to test the stoplist.
    const forTrivial = await mk(`${BASE}/fixture/shipped`);
    const forShort = await mk(`${BASE}/fixture/shipped`);
    const trivial = await call('POST', `/api/todo/${forTrivial}/verify-by-evidence`,
      { body: { expect: 'all good' } });
    ok('  a trivial expectation is refused, and only the stoplist can do it',
      trivial.status === 422 && /true of almost any page/.test(trivial.body.error || ''),
      trivial.body);

    const short = await call('POST', `/api/todo/${forShort}/verify-by-evidence`,
      { body: { expect: 'live' } });
    ok('  and a too-short expectation is refused by the length rule',
      short.status === 422 && /characters/.test(short.body.error || ''), short.body);

    const noExpect = await call('POST', `/api/todo/${notShipped}/verify-by-evidence`, { body: {} });
    ok('  no expectation at all is refused', noExpect.status === 422, noExpect.body);

    const note = await call('POST', `/api/todo/${noUrl}/verify-by-evidence`,
      { body: { expect: 'apcs-cyber-lesson-map' } });
    ok('  an artifact that is a note, not a url, is routed to a human',
      note.status === 422 && /needs a human/.test(note.body.error || ''), note.body);

    const missing = await call('POST', '/api/todo/99999/verify-by-evidence',
      { body: { expect: 'apcs-cyber-lesson-map' } });
    ok('  an unknown task is 404, not 422', missing.status === 404, missing.status);

    const anon = await call('POST', `/api/todo/${notShipped}/verify-by-evidence`,
      { as: 'none', body: { expect: 'apcs-cyber-lesson-map' } });
    ok('  and it still requires a credential', anon.status === 401, anon.status);
  }

  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) {
    console.log('\nFailed:');
    for (const f of failures) console.log('  - ' + f);
  }
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('\nSUITE CRASHED:', e);
  try { server.close(); } catch (_) {}
  process.exit(1);
});
