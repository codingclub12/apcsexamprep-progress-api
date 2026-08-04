'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  /api/command  -- digest, prompt compiler, claim protocol, promises, config.
//  Mount in server.js:  app.use('/api/command', require('./routes/command'));
//
//  ROUTE ORDER MATTERS HERE. The public read URL (/digest/r/:token) is declared
//  BEFORE the auth middleware, because it carries the third credential: a
//  deliberately weak, read-only, PII-stripped token that exists so chat, whose
//  web_fetch takes a URL and nothing else, can read the digest at all. Every
//  other route on this router is behind cookie-or-bearer.
//
//  That token can do exactly one thing. It is not accepted as a bearer, it is
//  not accepted on any other path, and any method other than GET on its own
//  path is 401.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const store = require('../lib/command-store');
const write = require('../lib/command-write');
const auth = require('../lib/command-auth');
const digest = require('../lib/command-digest');
const { compilePrompt } = require('../lib/command-prompt');
const routerLib = require('../lib/command-router');

const router = express.Router();
const db = store.db;

// Fail closed if the migration never landed: 503 with a reason, not a 500 per
// request and not a half-working page. Same posture as the admin API with a
// missing ADMIN_KEY.
function requireSchema(req, res, next) {
  if (store.schemaReady()) return next();
  return res.status(503).json({ error: 'Command center disabled: its tables are not present. Check the boot log for the migration error.' });
}

function baseUrl(req) {
  return process.env.PUBLIC_BASE_URL || process.env.SELF_BASE_URL || `${req.protocol}://${req.get('host')}`;
}

// ── PUBLIC READ URL (chat only) ──────────────────────────────────────────────
//  Path parameter rather than a querystring so it stays out of Referer headers,
//  and because /api/gate/check already establishes that route shape here.
//  Rate limited at 60/hour: generous for a session-start read, tight enough that
//  a leaked token is a nuisance rather than a load source.
router.get('/digest/r/:token', auth.readTokenRateLimit, requireSchema, (req, res) => {
  if (!auth.checkReadToken(db, req.params.token)) {
    return res.status(401).json({ error: 'Invalid read token.' });
  }
  res.set('Cache-Control', 'no-store');
  res.json(digest.buildPublicDigest({ baseUrl: baseUrl(req) }));
});

// The read token is READ ONLY. Anything else on its own path is 401 rather than
// 405, so a probe learns nothing about whether the token was even valid.
router.all('/digest/r/:token', (req, res) => {
  res.status(401).json({ error: 'The read token is read-only. Use the cookie or a bearer token to write.' });
});

// ── Everything below is credentialed ─────────────────────────────────────────
router.use(auth.commandRateLimit);
router.use(auth.requireCommandAuth);
router.use(requireSchema);

// ── DIGEST ───────────────────────────────────────────────────────────────────
//  The money endpoint, and the claim handshake: an agent that asks what to do
//  has announced itself, which is recorded so `in_flight` cannot quietly drift
//  away from who is actually working.
router.get('/digest', (req, res) => {
  const includePii = req.command.cookie || req.command.scope === 'full';
  const label = String(req.get('x-session-label') || '').slice(0, 120);
  if (!req.command.cookie) {
    store.logEvent(null, req.command.actor, 'digest_read', null, label || null);
  }
  res.set('Cache-Control', 'no-store');
  res.json(digest.buildDigest({ baseUrl: baseUrl(req), includePii }));
});

// ── PROMPT COMPILER ──────────────────────────────────────────────────────────
//  ?format=text returns the raw markdown, which is what you want when piping it
//  straight into a session.
router.get('/task/:id/prompt', (req, res) => {
  const id = Number(req.params.id);
  const task = store.getTask(id);
  if (!task) return res.status(404).json({ error: `No task #${id}` });

  const claims = store.liveClaims().filter((c) => !c.expired);
  const out = compilePrompt({
    task,
    routed: {
      routed_surface: task.routed_surface,
      routed_model: task.routed_model,
      routed_reason: task.routed_reason,
      flags: task.routed_flags,
      closes_manually: task.closes_manually,
      auto_dispatch_eligible: task.auto_dispatch_eligible,
      auto_dispatch_reason: task.auto_dispatch_reason,
    },
    blockers: task.blocked_by,
    blocks: task.blocks,
    claims,
    sourceDocs: store.sourceDocs(),
    baseUrl: baseUrl(req),
  });

  if (req.query.format === 'text') {
    res.type('text/plain').send(out.prompt);
    return;
  }
  res.json(out);
});

// ── CLAIM PROTOCOL ───────────────────────────────────────────────────────────
//  Locks are (repo, file) pairs, not whole tasks. A conflicting claim is a hard
//  409 naming the holder and the lock age; ?force=true overrides and writes an
//  audit row. Default safe, escape hatch present, always auditable.
const SURFACES = ['chat', 'cowork', 'claude_code'];

router.post('/task/:id/claim', (req, res) => {
  const id = Number(req.params.id);
  const task = store.getTask(id);
  if (!task) return res.status(404).json({ error: `No task #${id}` });

  const body = req.body || {};
  const surface = String(body.surface || '').trim();
  if (!SURFACES.includes(surface)) {
    return res.status(400).json({ error: `surface must be one of: ${SURFACES.join(', ')}` });
  }
  // Chat holds no bash and cannot heartbeat or return, so it must not hold a
  // lock that will then go stale and block a surface that can.
  if (surface === 'chat') {
    return res.status(400).json({
      error: 'Chat cannot hold a claim: it cannot heartbeat or return. This task closes manually, through the page or a pasted curl.',
    });
  }

  const locks = [].concat(body.locks || []).map((l) => String(l).slice(0, 300)).filter(Boolean).slice(0, 50);
  const ttl = Math.min(Math.max(Number(body.ttl_minutes) || 90, 5), 8 * 60);
  const force = req.query.force === 'true' || req.query.force === '1';

  const conflict = store.findLockConflict(locks);
  if (conflict && !force) {
    return res.status(409).json({
      error: 'Lock conflict.',
      holder: {
        claim_id: conflict.claim.id,
        surface: conflict.claim.surface,
        session_label: conflict.claim.session_label,
        task_id: conflict.claim.task_id,
      },
      held_for_minutes: conflict.claim.age_minutes,
      locks_conflicting: conflict.conflicting,
      hint: 'Retry with ?force=true to take it. That writes an audit row naming you.',
    });
  }
  if (conflict && force) {
    store.stReleaseClaim.run('forced_out', conflict.claim.id);
    store.logEvent(conflict.claim.task_id, req.command.actor, 'claim_forced_out',
      `${conflict.claim.surface}:${conflict.claim.session_label || 'unlabeled'} held ${conflict.conflicting.join(', ')} for ${conflict.claim.age_minutes}m`,
      `forced by ${surface}:${String(body.session_label || 'unlabeled')}`);
  }

  const info = store.stInsertClaim.run(
    id, surface, String(body.session_label || '').slice(0, 120) || null,
    JSON.stringify(locks), `+${ttl} minutes`,
  );
  const claimId = Number(info.lastInsertRowid);
  const claim = store.stClaimById.get(claimId);
  store.logEvent(id, req.command.actor, 'claimed', null, `${surface}${body.session_label ? ` "${body.session_label}"` : ''} for ${ttl}m`);
  if (task.status === 'open') {
    db.prepare("UPDATE tasks SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?").run(id);
    store.logEvent(id, req.command.actor, 'set:status', 'open', 'in_progress');
  }

  res.status(201).json({
    claim_id: claimId,
    task_id: id,
    expires_at: claim.expires_at,
    locks,
    forced: !!(conflict && force),
  });
});

router.post('/claim/:id/heartbeat', (req, res) => {
  const claimId = Number(req.params.id);
  const claim = store.stClaimById.get(claimId);
  if (!claim) return res.status(404).json({ error: `No claim #${claimId}` });
  if (claim.released_at) return res.status(409).json({ error: 'That claim has already been released.' });
  store.stHeartbeat.run(claimId);
  const live = store.liveClaims().find((c) => c.id === claimId);
  res.json({
    ok: true,
    claim_id: claimId,
    state: live ? store.claimState(live) : 'released',
    expires_at: claim.expires_at,
  });
});

router.post('/claim/:id/return', (req, res) => {
  const claimId = Number(req.params.id);
  const claim = store.stClaimById.get(claimId);
  if (!claim) return res.status(404).json({ error: `No claim #${claimId}` });

  const body = req.body || {};
  const patch = {};
  if (body.status) patch.status = body.status;
  if (body.artifact_url) patch.artifact_url = body.artifact_url;

  if (Object.keys(patch).length) {
    const result = write.updateTask(claim.task_id, patch, req.command, { note: body.notes });
    if (result.error) return res.status(result.status || 400).json({ error: result.error });
  } else if (body.notes) {
    store.logEvent(claim.task_id, req.command.actor, 'note', null, String(body.notes).slice(0, 500));
  }

  if (!claim.released_at) store.stReleaseClaim.run('returned', claimId);
  store.logEvent(claim.task_id, req.command.actor, 'returned', null, body.status || null);
  res.json({ ok: true, claim_id: claimId, task: store.getTask(claim.task_id) });
});

// Give a claim up without closing anything. Better than letting it rot into
// `stale`, and it keeps the ledger honest about who walked away.
router.post('/claim/:id/release', (req, res) => {
  const claimId = Number(req.params.id);
  const claim = store.stClaimById.get(claimId);
  if (!claim) return res.status(404).json({ error: `No claim #${claimId}` });
  if (!claim.released_at) store.stReleaseClaim.run('abandoned', claimId);
  store.logEvent(claim.task_id, req.command.actor, 'claim_released', null, 'abandoned');
  res.json({ ok: true, claim_id: claimId });
});

// ── PROMISES (scope gated) ───────────────────────────────────────────────────
//  The only table here holding a real name and a real email. Reads need the
//  cookie or a TODO_KEY explicitly marked scope=full; writes need the cookie,
//  because a promise is a claim about what Tanner told a human and no agent
//  gets to author one.
router.get('/promises', auth.requireFullScope, (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, t.title AS task_title,
           CASE WHEN p.status = 'open' AND p.promised_by IS NOT NULL AND date(p.promised_by) < date('now')
                THEN CAST(julianday('now') - julianday(p.promised_by) AS INTEGER) ELSE 0 END AS days_late
    FROM promises p LEFT JOIN tasks t ON t.id = p.task_id
    ORDER BY (p.status = 'open') DESC, p.promised_by ASC, p.id ASC
  `).all();
  res.json({ count: rows.length, promises: rows });
});

router.post('/promises', auth.requireCookieAuth, (req, res) => {
  const b = req.body || {};
  if (!b.what) return res.status(400).json({ error: 'what is required' });
  if (b.promised_by && !/^\d{4}-\d{2}-\d{2}$/.test(String(b.promised_by))) {
    return res.status(400).json({ error: 'promised_by must be YYYY-MM-DD' });
  }
  const info = db.prepare(`
    INSERT INTO promises (task_id, person, email, what, promised_by, source, status)
    VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, 'open'))
  `).run(b.task_id || null, b.person || null, b.email || null, String(b.what).slice(0, 500),
    b.promised_by || null, b.source || null, b.status || null);
  if (b.task_id) store.logEvent(Number(b.task_id), req.command.actor, 'promise_added', null, String(b.what).slice(0, 200));
  res.status(201).json({ promise: db.prepare('SELECT * FROM promises WHERE id = ?').get(Number(info.lastInsertRowid)) });
});

router.patch('/promises/:id', auth.requireCookieAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM promises WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: `No promise #${id}` });
  const b = req.body || {};
  const allowed = ['person', 'email', 'what', 'promised_by', 'source', 'status', 'task_id'];
  const sets = []; const values = [];
  for (const k of allowed) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) continue;
    sets.push(`${k} = ?`);
    values.push(b[k] === '' ? null : b[k]);
  }
  if (!sets.length) return res.status(400).json({ error: 'No writable fields in the request.' });
  sets.push("updated_at = datetime('now')");
  db.prepare(`UPDATE promises SET ${sets.join(', ')} WHERE id = ?`).run(...values, id);
  if (existing.task_id) store.logEvent(existing.task_id, req.command.actor, 'promise_updated', existing.status, b.status || existing.status);
  res.json({ promise: db.prepare('SELECT * FROM promises WHERE id = ?').get(id) });
});

// ── READ TOKEN (cookie only) ─────────────────────────────────────────────────
//  Rotation is a single overwrite, so the previous URL stops working on the very
//  next request. That is the whole point of a one-click rotate.
router.get('/read-token', auth.requireCookieAuth, (req, res) => {
  const token = auth.getReadToken(db);
  res.json({ token, url: `${baseUrl(req)}/api/command/digest/r/${token}` });
});

router.post('/read-token/rotate', auth.requireCookieAuth, (req, res) => {
  const token = auth.rotateReadToken(db);
  store.logEvent(null, req.command.actor, 'read_token_rotated', null, null);
  res.json({ token, url: `${baseUrl(req)}/api/command/digest/r/${token}`, rotated: true });
});

// ── CONFIG ───────────────────────────────────────────────────────────────────
//  theme_ci_exists is the one flag that converts theme auto-dispatch from "trust
//  the package" into the same gate the API already has. time_weighting is the
//  5-8pm window, editable because it moves across the school year.
router.get('/config', (req, res) => {
  res.json({
    theme_ci_exists: !!store.getConfig('theme_ci_exists', 0),
    time_weighting: Object.assign({}, routerLib.DEFAULT_TIME_WEIGHTING, store.timeWeighting() || {}),
    source_documents: store.sourceDocs(),
    registry_meta: store.getConfig('registry_meta', null),
    scope: req.command.scope,
    via: req.command.via,
  });
});

router.patch('/config', auth.requireCookieAuth, (req, res) => {
  const b = req.body || {};
  if (Object.prototype.hasOwnProperty.call(b, 'theme_ci_exists')) {
    store.setConfig('theme_ci_exists', b.theme_ci_exists ? 1 : 0);
    store.logEvent(null, req.command.actor, 'config:theme_ci_exists', null, b.theme_ci_exists ? 1 : 0);
  }
  if (b.time_weighting && typeof b.time_weighting === 'object') {
    store.setConfig('time_weighting', Object.assign({}, routerLib.DEFAULT_TIME_WEIGHTING, b.time_weighting));
  }
  if (b.source_documents) store.setConfig('source_documents', b.source_documents);
  res.json({
    theme_ci_exists: !!store.getConfig('theme_ci_exists', 0),
    time_weighting: Object.assign({}, routerLib.DEFAULT_TIME_WEIGHTING, store.timeWeighting() || {}),
    source_documents: store.sourceDocs(),
  });
});

// ── ROUTER PREVIEW ───────────────────────────────────────────────────────────
//  What would the router say about a task shaped like this? Used by the page to
//  show the routed chip before a task is saved, and useful when auditing a rule.
router.post('/route/preview', (req, res) => {
  res.json(routerLib.route(req.body || {}, { themeCiExists: store.themeCiExists() }));
});

module.exports = router;
