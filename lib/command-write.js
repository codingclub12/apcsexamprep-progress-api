'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  TASK WRITES + THE VERIFICATION LEDGER.
//
//  One code path for every write, whether it arrives as PATCH /api/todo/:id, a
//  claim return, or a button on the page, so the rules cannot be true on one
//  route and false on another.
//
//  The two rules that make this a ledger rather than a task list:
//
//   1. `status=done` is REJECTED (400, with the message) unless an artifact_url
//      is present. Verify artifacts, not agent reports.
//   2. Only a cookie-authenticated request may set verified=1. An agent write
//      always lands as done + verified=0, which is what puts it in
//      needs_verification instead of quietly closing the loop on itself.
//
//  The agent 403 matrix is enforced as 403, never as silent field-stripping: an
//  agent that thinks it closed a decision task and got a 200 is worse than one
//  that got told no.
// ─────────────────────────────────────────────────────────────────────────────
const store = require('./command-store');
const router = require('./command-router');

const db = store.db;

const ARTIFACT_MESSAGE = 'A task cannot be closed without an artifact. Provide one of: '
  + 'a PR URL, a Shopify page updatedAt delta, an md5, or a live curl result.';

const BUCKETS = ['now', 'decision', 'week', 'before_school', 'september', 'someday'];
const STATUSES = ['open', 'in_progress', 'awaiting_review', 'blocked', 'done', 'dropped'];
const OWNERS = ['tanner', 'agent', 'either'];
const SIZES = ['xs', 's', 'm', 'l', 'xl'];
const SURFACES = ['theme', 'api', 'content', 'klaviyo', 'shopify', 'drive', 'ops'];
const COURSES = ['csa', 'csp', 'cyber', 'networking', 'greenfoot', 'all'];
const AUTO_DISPATCH = ['off', 'eligible', 'dispatched', 'returned'];
const CREATORS = ['tanner', 'chat', 'cowork', 'claude_code', 'check', 'agent'];

// Fields an agent credential may never modify. due_date, promised_by, and
// cost_per_day are Tanner's judgement about the outside world; an agent moving
// a due date is an agent grading its own homework.
const AGENT_FORBIDDEN_FIELDS = ['due_date', 'cost_per_day', 'promised_by', 'verified'];

const WRITABLE = [
  'title', 'detail', 'bucket', 'position', 'status', 'owner', 'size', 'est_minutes',
  'due_date', 'defer_until', 'bleeding', 'impact', 'effort', 'cost_per_day', 'surface',
  'course', 'page_bytes', 'source_doc', 'verified', 'artifact_url', 'auto_dispatch',
  'check_fingerprint',
];

const CLOSING = new Set(['done', 'dropped']);

function enumErr(field, value, allowed) {
  return `${field} must be one of: ${allowed.join(', ')} (got "${value}")`;
}

// Normalizes and validates one incoming patch. Returns { fields } or { error }.
function coerce(patch) {
  const out = {};
  for (const [k, raw] of Object.entries(patch || {})) {
    if (!WRITABLE.includes(k)) continue;
    let v = raw;
    if (typeof v === 'string') v = v.trim();
    if (v === '') v = null;

    switch (k) {
      case 'bucket':
        if (v != null && !BUCKETS.includes(v)) return { error: enumErr('bucket', v, BUCKETS) };
        break;
      case 'status':
        if (v != null && !STATUSES.includes(v)) return { error: enumErr('status', v, STATUSES) };
        break;
      case 'owner':
        if (v != null && !OWNERS.includes(v)) return { error: enumErr('owner', v, OWNERS) };
        break;
      case 'size':
        if (v != null && !SIZES.includes(v)) return { error: enumErr('size', v, SIZES) };
        break;
      case 'surface':
        if (v != null && !SURFACES.includes(v)) return { error: enumErr('surface', v, SURFACES) };
        break;
      case 'course':
        if (v != null && !COURSES.includes(v)) return { error: enumErr('course', v, COURSES) };
        break;
      case 'auto_dispatch':
        if (v != null && !AUTO_DISPATCH.includes(v)) return { error: enumErr('auto_dispatch', v, AUTO_DISPATCH) };
        break;
      case 'bleeding':
      case 'verified':
        v = v ? 1 : 0;
        break;
      case 'impact':
      case 'effort':
        if (v != null) {
          v = Number(v);
          if (!Number.isFinite(v) || v < 1 || v > 5) return { error: `${k} must be an integer 1-5` };
          v = Math.round(v);
        }
        break;
      case 'est_minutes':
      case 'page_bytes':
        if (v != null) {
          v = Number(v);
          if (!Number.isFinite(v) || v < 0) return { error: `${k} must be a non-negative number` };
          v = Math.round(v);
        }
        break;
      case 'position':
      case 'cost_per_day':
        if (v != null) {
          v = Number(v);
          if (!Number.isFinite(v)) return { error: `${k} must be a number` };
        }
        break;
      case 'due_date':
      case 'defer_until':
        if (v != null && !/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return { error: `${k} must be YYYY-MM-DD` };
        break;
      case 'title':
        if (v != null) v = String(v).slice(0, 300);
        if (!v) return { error: 'title cannot be empty' };
        break;
      case 'detail':
        if (v != null) v = String(v).slice(0, 8000);
        break;
      case 'artifact_url':
        if (v != null) v = String(v).slice(0, 1000);
        break;
      default:
        break;
    }
    out[k] = v;
  }
  return { fields: out };
}

// Recompute and cache the routing columns. Cached because the page and the
// digest read them constantly and the router is pure: the cache can never drift
// from a rule change without a write, and every write refreshes it.
function recacheRouting(id) {
  const t = store.stTaskById.get(id);
  if (!t) return null;
  const blocked = db.prepare(`
    SELECT COUNT(*) n FROM deps d JOIN tasks bt ON bt.id = d.blocks_task_id
    WHERE d.task_id = ? AND bt.status NOT IN ('done','dropped')
  `).get(id).n > 0;
  const routed = router.route({ ...t, blocked }, { themeCiExists: store.themeCiExists() });
  db.prepare('UPDATE tasks SET routed_surface = ?, routed_model = ?, routed_reason = ? WHERE id = ?')
    .run(routed.routed_surface, routed.routed_model, routed.routed_reason, id);
  return routed;
}

// ── The 403 matrix + the artifact gate ───────────────────────────────────────
//  who: { cookie, actor, scope } from lib/command-auth.
//  Returns { status, error } on refusal, or null when the write may proceed.
function guard(existing, fields, who) {
  const isAgent = !who.cookie;
  const nextStatus = fields.status != null ? fields.status : existing.status;
  const closing = CLOSING.has(String(fields.status || '').toLowerCase());

  // Artifact gate, AGENT PATH ONLY. The rule exists because an agent reporting
  // "done" is a claim about work nobody watched, and the whole point of this
  // table is to verify artifacts rather than agent reports. It buys nothing
  // against Tanner closing his own row from the browser: half his queue is
  // email, phone calls, and Shopify edits that will never have a PR URL, and
  // the human clicking the box IS the verification. Requiring a ceremonial
  // string there just teaches him to type "done" into the field.
  if (isAgent && String(fields.status || '').toLowerCase() === 'done') {
    const artifact = fields.artifact_url != null ? fields.artifact_url : existing.artifact_url;
    if (!artifact) return { status: 400, error: ARTIFACT_MESSAGE };
  }

  if (isAgent) {
    if (fields.verified === 1) {
      return { status: 403, error: 'Only a browser session may set verified=1. An agent write lands as verified=0.' };
    }
    for (const f of AGENT_FORBIDDEN_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(fields, f) && f !== 'verified') {
        return { status: 403, error: `An agent credential may not modify ${f}.` };
      }
    }
    if (closing && String(existing.bucket || '').toLowerCase() === 'decision') {
      return { status: 403, error: 'An agent credential may not close a decision task. The call is Tanner\'s to make.' };
    }
    if (closing) {
      const open = store.stOpenPromisesForTask.all(existing.id);
      if (open.length) {
        return {
          status: 403,
          error: `An agent credential may not close a task with an open promise attached (${open.length} open). Renegotiate or keep it first.`,
        };
      }
    }
  }

  // auto_dispatch=eligible is not a flag you may simply assert. The router
  // decides, and the UI greys the toggle with this reason rather than letting a
  // theme task pretend it can be dispatched.
  if (fields.auto_dispatch === 'eligible') {
    const merged = { ...existing, ...fields };
    const blocked = db.prepare(`
      SELECT COUNT(*) n FROM deps d JOIN tasks bt ON bt.id = d.blocks_task_id
      WHERE d.task_id = ? AND bt.status NOT IN ('done','dropped')
    `).get(existing.id).n > 0;
    const verdict = router.autoDispatchEligibility({ ...merged, blocked }, { themeCiExists: store.themeCiExists() });
    if (!verdict.eligible) {
      return { status: 400, error: `auto_dispatch cannot be set to eligible: ${verdict.reason}` };
    }
  }

  // An agent write is always unverified, whatever else it says.
  if (isAgent && nextStatus === 'done') fields.verified = 0;
  return null;
}

// Applies a validated, guarded patch and writes the event trail. Caller has
// already resolved `who`. Returns { task } or { status, error }.
function updateTask(id, patch, who, opts = {}) {
  const existing = store.stTaskById.get(id);
  if (!existing) return { status: 404, error: `No task #${id}` };

  const coerced = coerce(patch);
  if (coerced.error) return { status: 400, error: coerced.error };
  const fields = coerced.fields;
  if (!Object.keys(fields).length && !opts.note) return { status: 400, error: 'No writable fields in the request.' };

  const refusal = guard(existing, fields, who);
  if (refusal) return refusal;

  const sets = [];
  const values = [];
  for (const [k, v] of Object.entries(fields)) {
    sets.push(`${k} = ?`);
    values.push(v);
  }
  if (fields.status === 'done') {
    sets.push("completed_at = datetime('now')");
  } else if (fields.status != null && existing.completed_at) {
    sets.push('completed_at = NULL');
  }
  sets.push("updated_at = datetime('now')");
  sets.push("last_touched_at = datetime('now')");

  if (sets.length) {
    db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...values, id);
  }

  for (const [k, v] of Object.entries(fields)) {
    if (String(existing[k] == null ? '' : existing[k]) === String(v == null ? '' : v)) continue;
    store.logEvent(id, who.actor, `set:${k}`, existing[k], v);
  }
  if (opts.note) store.logEvent(id, who.actor, 'note', null, String(opts.note).slice(0, 500));

  recacheRouting(id);
  return { task: store.getTask(id) };
}

const stInsertTask = store.lazy(`
  INSERT INTO tasks (title, detail, bucket, position, status, owner, size, est_minutes,
                     due_date, defer_until, bleeding, impact, effort, cost_per_day, surface,
                     course, page_bytes, source_doc, artifact_url, auto_dispatch, created_by,
                     check_fingerprint, last_touched_at)
  VALUES (@title, @detail, @bucket, @position, @status, @owner, @size, @est_minutes,
          @due_date, @defer_until, @bleeding, @impact, @effort, @cost_per_day, @surface,
          @course, @page_bytes, @source_doc, @artifact_url, @auto_dispatch, @created_by,
          @check_fingerprint, datetime('now'))
`);

// Quick add is one plain-text input, so everything except title has a default.
function createTask(patch, who) {
  const coerced = coerce(patch);
  if (coerced.error) return { status: 400, error: coerced.error };
  const f = coerced.fields;
  if (!f.title) return { status: 400, error: 'title is required' };
  if (f.verified === 1 && !who.cookie) {
    return { status: 403, error: 'Only a browser session may set verified=1.' };
  }
  if (f.auto_dispatch === 'eligible') f.auto_dispatch = 'off'; // earned by the router, not asserted at create

  const createdBy = CREATORS.includes(patch.created_by) ? patch.created_by : (who.cookie ? 'tanner' : who.actor);
  const row = {
    title: f.title,
    detail: f.detail || null,
    bucket: f.bucket || 'week',
    position: f.position != null ? f.position : 0,
    status: f.status || 'open',
    owner: f.owner || 'tanner',
    size: f.size || null,
    est_minutes: f.est_minutes != null ? f.est_minutes : null,
    due_date: f.due_date || null,
    defer_until: f.defer_until || null,
    bleeding: f.bleeding ? 1 : 0,
    impact: f.impact != null ? f.impact : null,
    effort: f.effort != null ? f.effort : null,
    cost_per_day: f.cost_per_day != null ? f.cost_per_day : null,
    surface: f.surface || null,
    course: f.course || null,
    page_bytes: f.page_bytes != null ? f.page_bytes : null,
    source_doc: f.source_doc || null,
    artifact_url: f.artifact_url || null,
    auto_dispatch: f.auto_dispatch || 'off',
    created_by: createdBy,
    check_fingerprint: f.check_fingerprint || null,
  };

  let info;
  try {
    info = stInsertTask.run(row);
  } catch (e) {
    if (String(e.message || '').includes('UNIQUE') && row.check_fingerprint) {
      // Fingerprint dedupe: a suite failing five days running is one task
      // aging, not five. Return the task that already exists.
      const existing = db.prepare('SELECT id FROM tasks WHERE check_fingerprint = ?').get(row.check_fingerprint);
      if (existing) return { task: store.getTask(existing.id), deduped: true };
    }
    return { status: 400, error: e.message };
  }
  const id = Number(info.lastInsertRowid);
  store.logEvent(id, who.actor, 'created', null, row.title);
  recacheRouting(id);
  return { task: store.getTask(id) };
}

module.exports = {
  createTask, updateTask, coerce, guard, recacheRouting,
  ARTIFACT_MESSAGE, BUCKETS, STATUSES, OWNERS, SIZES, SURFACES, COURSES,
  AUTO_DISPATCH, AGENT_FORBIDDEN_FIELDS, WRITABLE, CLOSING,
};
