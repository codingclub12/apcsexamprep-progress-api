'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  /api/todo  -- the queue itself.
//  Mount in server.js:  app.use('/api/todo', require('./routes/todo'));
//
//  Dual auth on every route (browser cookie OR Authorization: Bearer TODO_KEY),
//  anything else is 401. Rate limited at 200/10min/IP, the same pattern student
//  auth already uses.
//
//  The registry is NOT seeded from a script in this repo. It is loaded through
//  POST /api/todo/bulk after merge, so the file of 63 items stays a document
//  Tanner owns rather than code that has to be edited to add a task.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const store = require('../lib/command-store');
const write = require('../lib/command-write');
const auth = require('../lib/command-auth');

const router = express.Router();
const db = store.db;

router.use(auth.commandRateLimit);
router.use(auth.requireCommandAuth);
// Fail closed if the migration never landed: 503 with a reason rather than a
// 500 per request. The API as a whole stays up either way.
router.use((req, res, next) => {
  if (store.schemaReady()) return next();
  return res.status(503).json({ error: 'Command center disabled: its tables are not present. Check the boot log for the migration error.' });
});

// ── LIST ─────────────────────────────────────────────────────────────────────
//  Documented sort order (lib/command-store.js sortKey), identical here, in the
//  digest, and on the page:
//    overdue promise, bleeding, bucket, due date, cost/day, impact, effort,
//    position, id. It ends in id, so two identical requests are byte-identical.
//  Closed work is excluded unless ?include_closed=1, which is what makes
//  checking an item off visibly remove it from NOW.
router.get('/', (req, res) => {
  const q = req.query || {};
  const tasks = store.listTasks({
    includeClosed: q.include_closed === '1' || q.include_closed === 'true',
    owner: q.owner,
    surface: q.surface,
    course: q.course,
    bucket: q.bucket,
    status: q.status,
  });
  res.json({
    count: tasks.length,
    sort: 'overdue_promise, bleeding, bucket, due_date, cost_per_day, impact, effort, position, id',
    tasks,
  });
});

// ── ONE TASK, in full ────────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const task = store.getTask(id);
  if (!task) return res.status(404).json({ error: `No task #${id}` });

  const promises = store.stOpenPromisesForTask.all(id).map((p) => ({
    id: p.id, what: p.what, promised_by: p.promised_by, status: p.status,
  }));
  res.json({
    task,
    events: store.stEventsForTask.all(id, 50),
    claims: store.stClaimsForTask.all(id).map((c) => ({ ...c, locks: store.parseLocks(c.locks) })),
    // What, when, and status only. person and email never leave /api/command/promises.
    promises,
  });
});

// ── CREATE (quick add) ───────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const body = req.body || {};
  // Quick add is one plain-text input: {text} is accepted as a bare title with
  // the documented defaults (bucket=week, owner=tanner).
  const patch = body.text ? { title: String(body.text) } : body;
  const result = write.createTask(patch, req.command);
  if (result.error) return res.status(result.status || 400).json({ error: result.error });
  res.status(201).json({ task: result.task, deduped: !!result.deduped });
});

// ── BULK LOAD (the registry) ─────────────────────────────────────────────────
//  Accepts { _meta, tasks: [...] } or a bare array. A task may carry
//  `blocked_by` (1-based indexes into this payload, or exact titles) and
//  `promises` (person/email/what/promised_by), which are inserted in the same
//  transaction so the registry lands whole or not at all.
router.post('/bulk', (req, res) => {
  const body = req.body || {};
  const incoming = Array.isArray(body) ? body : (Array.isArray(body.tasks) ? body.tasks : null);
  if (!incoming) return res.status(400).json({ error: 'Send { tasks: [...] } or a bare array of tasks.' });
  if (incoming.length > 1000) return res.status(400).json({ error: 'Bulk load is capped at 1000 tasks per request.' });

  const meta = body._meta || (Array.isArray(body) ? null : body.meta) || null;
  const promiseWrites = !!(req.command && req.command.cookie);

  const load = db.transaction(() => {
    const created = [];
    const errors = [];
    for (let i = 0; i < incoming.length; i++) {
      const result = write.createTask(incoming[i] || {}, req.command);
      if (result.error) { errors.push({ index: i, error: result.error }); continue; }
      created.push(result.task);
    }
    // Second pass: deps and promises, once every task has an id.
    const byTitle = new Map(created.map((t) => [t.title, t.id]));
    const resolve = (ref) => {
      if (typeof ref === 'number') return created[ref - 1] ? created[ref - 1].id : null;
      const n = Number(ref);
      if (Number.isInteger(n) && String(n) === String(ref)) return created[n - 1] ? created[n - 1].id : null;
      return byTitle.get(String(ref)) || null;
    };
    let deps = 0; let promises = 0;
    for (let i = 0; i < incoming.length; i++) {
      const src = incoming[i] || {};
      const mine = created[i];
      if (!mine) continue;
      for (const ref of [].concat(src.blocked_by || [])) {
        const blockerId = resolve(ref);
        if (!blockerId || blockerId === mine.id) continue;
        db.prepare('INSERT OR IGNORE INTO deps (task_id, blocks_task_id) VALUES (?, ?)').run(mine.id, blockerId);
        deps++;
      }
      for (const p of [].concat(src.promises || [])) {
        if (!p || !p.what) continue;
        // Promise rows carry real names and emails, so an agent credential can
        // load tasks but never people. Silently skipped rather than failing the
        // whole registry load; the response says how many were skipped.
        if (!promiseWrites) continue;
        db.prepare(`
          INSERT INTO promises (task_id, person, email, what, promised_on, promised_by, source, status)
          VALUES (?, ?, ?, ?, COALESCE(?, datetime('now')), ?, ?, COALESCE(?, 'open'))
        `).run(mine.id, p.person || null, p.email || null, String(p.what).slice(0, 500),
          p.promised_on || null, p.promised_by || null, p.source || null, p.status || null);
        promises++;
      }
    }
    return { created, errors, deps, promises };
  });

  let out;
  try { out = load(); } catch (e) { return res.status(400).json({ error: e.message }); }

  // The registry's _meta.source_documents is what the prompt compiler cites, so
  // it is stored alongside the tasks rather than living only in the file.
  if (meta && meta.source_documents) store.setConfig('source_documents', meta.source_documents);
  if (meta) store.setConfig('registry_meta', { loaded_at: new Date().toISOString(), ...meta });

  store.logEvent(null, req.command.actor, 'bulk_load', null, `${out.created.length} tasks`);
  res.status(201).json({
    created: out.created.length,
    deps: out.deps,
    promises: out.promises,
    promises_skipped: promiseWrites ? 0 : incoming.reduce((n, t) => n + [].concat((t && t.promises) || []).length, 0),
    errors: out.errors,
    tasks: out.created,
  });
});

// ── UPDATE ───────────────────────────────────────────────────────────────────
//  Every rule in the verification ledger lives in lib/command-write.js so this
//  route and the claim-return route cannot disagree.
router.patch('/:id', (req, res) => {
  const body = req.body || {};
  const result = write.updateTask(Number(req.params.id), body, req.command, { note: body.notes });
  if (result.error) return res.status(result.status || 400).json({ error: result.error });
  res.json({ task: result.task });
});

// ── VERIFY (cookie only) ─────────────────────────────────────────────────────
//  The single button an agent can never press.
router.post('/:id/verify', auth.requireCookieAuth, (req, res) => {
  const id = Number(req.params.id);
  const task = store.getTask(id);
  if (!task) return res.status(404).json({ error: `No task #${id}` });
  if (!task.artifact_url) return res.status(400).json({ error: write.ARTIFACT_MESSAGE });
  const verified = req.body && req.body.verified === false ? 0 : 1;
  db.prepare("UPDATE tasks SET verified = ?, updated_at = datetime('now'), last_touched_at = datetime('now') WHERE id = ?").run(verified, id);
  store.logEvent(id, req.command.actor, 'set:verified', task.verified ? 1 : 0, verified);
  res.json({ task: store.getTask(id) });
});

// ── DEPS ─────────────────────────────────────────────────────────────────────
router.post('/:id/deps', (req, res) => {
  const id = Number(req.params.id);
  const blocker = Number((req.body || {}).blocks_task_id);
  if (!store.stTaskById.get(id)) return res.status(404).json({ error: `No task #${id}` });
  if (!store.stTaskById.get(blocker)) return res.status(404).json({ error: `No task #${blocker}` });
  if (id === blocker) return res.status(400).json({ error: 'A task cannot block itself.' });
  db.prepare('INSERT OR IGNORE INTO deps (task_id, blocks_task_id) VALUES (?, ?)').run(id, blocker);
  store.logEvent(id, req.command.actor, 'dep_added', null, `blocked by #${blocker}`);
  write.recacheRouting(id);
  res.status(201).json({ task: store.getTask(id) });
});

router.delete('/:id/deps/:blocker', (req, res) => {
  const id = Number(req.params.id);
  const blocker = Number(req.params.blocker);
  db.prepare('DELETE FROM deps WHERE task_id = ? AND blocks_task_id = ?').run(id, blocker);
  store.logEvent(id, req.command.actor, 'dep_removed', `blocked by #${blocker}`, null);
  write.recacheRouting(id);
  res.json({ task: store.getTask(id) });
});

module.exports = router;
