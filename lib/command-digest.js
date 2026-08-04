'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE DIGEST. One request, full picture, called by every surface at session
//  start. The digest call IS the claim handshake: an agent that wants to know
//  what to do has already announced itself.
//
//  PII rule, enforced here rather than remembered: `person` and `email` exist in
//  exactly one place in this file, behind one boolean. An agent-scoped bearer
//  token and the public read token both get the count, the what, the days late,
//  and the task link. Never the identity.
//
//  The fields are chosen so the brief leads with what MOVED, not with a standing
//  list. A standing list gets skimmed by day four.
// ─────────────────────────────────────────────────────────────────────────────
const store = require('./command-store');

// Compact row shape for every list in the digest. Deliberately narrow: the
// digest is read at session start by an agent that then fetches the prompt, so
// it carries what is needed to CHOOSE, not the whole record.
function summary(t, baseUrl) {
  return {
    id: t.id,
    title: t.title,
    bucket: t.effective_bucket,
    status: t.status,
    owner: t.owner,
    size: t.size,
    surface: t.surface,
    course: t.course,
    due_date: t.due_date,
    cost_per_day: t.cost_per_day,
    bleeding: t.bleeding,
    blocked: t.blocked,
    blocked_by: t.blocked_by.map((b) => ({ id: b.id, title: b.title })),
    routed_surface: t.routed_surface,
    routed_model: t.routed_model,
    routed_reason: t.routed_reason,
    closes_manually: t.closes_manually,
    auto_dispatch: t.auto_dispatch,
    auto_dispatch_eligible: t.auto_dispatch_eligible,
    verified: t.verified,
    artifact_url: t.artifact_url,
    prompt_url: `${baseUrl}/api/command/task/${t.id}/prompt`,
  };
}

// includePii is the ONLY switch. Cookie or a TODO_KEY explicitly marked
// scope=full sees names and emails; every other credential, including the
// public read token, sees the same rows with those two fields absent.
function buildDigest({ baseUrl = '', includePii = false } = {}) {
  const now = new Date();
  // Closed work is included here on purpose: needs_verification, awaiting_review
  // and changed_since are all about tasks that have already left the open list.
  // Every "what is open right now" field filters through `openish` below.
  const tasks = store.listTasks({ now, includeClosed: true });
  const s = (t) => summary(t, baseUrl);

  const todayStr = store.today();
  const in7 = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const dayAgo = new Date(now.getTime() - 86400000);

  // What moved overnight. This LEADS the 7am brief, which is what keeps the
  // page from becoming wallpaper.
  const changedSince = tasks.filter((t) => {
    const stamps = [t.updated_at, t.created_at, t.last_touched_at].filter(Boolean);
    return stamps.some((v) => new Date(String(v).replace(' ', 'T') + 'Z') >= dayAgo);
  }).map(s);

  const overduePromises = store.stOverduePromises.all().map((p) => {
    const row = {
      id: p.id,
      what: p.what,
      days_late: Math.max(0, p.days_late || 0),
      task_id: p.task_id,
      promised_by: p.promised_by,
    };
    if (includePii) {
      row.person = p.person;
      row.email = p.email;
    }
    return row;
  });

  const openish = tasks.filter((t) => !t.closed);
  const costing = openish.filter((t) => Number(t.cost_per_day) > 0);
  const costingTotal = costing.reduce((sum, t) => sum + Number(t.cost_per_day), 0);

  const decisions = openish
    .filter((t) => t.effective_bucket === 'decision' || String(t.bucket).toLowerCase() === 'decision')
    .map((t) => Object.assign(s(t), {
      blocking_count: t.blocks.length,
      blocking: t.blocks.map((b) => ({ id: b.id, title: b.title })),
    }))
    .sort((a, b) => b.blocking_count - a.blocking_count);

  const quickWins = store.softSort(openish.filter((t) =>
    t.owner === 'tanner' && ['xs', 's'].includes(String(t.size || '').toLowerCase())
    && !t.blocked && t.status === 'open')).map(s);

  const agentReady = store.softSort(openish.filter((t) =>
    (t.owner === 'agent' || t.owner === 'either') && !t.blocked && t.status === 'open'
    && t.effective_bucket !== 'decision')).map(s);

  const claims = store.liveClaims();
  const inFlight = [];
  const staleClaims = [];
  const stuck = [];
  for (const c of claims) {
    const state = store.claimState(c);
    const row = {
      claim_id: c.id,
      task_id: c.task_id,
      task_title: c.task_title,
      surface: c.surface,
      session_label: c.session_label,
      locks: c.locks,
      age_minutes: c.age_minutes,
      since_heartbeat_minutes: c.since_heartbeat_minutes,
      state,
    };
    if (state === 'stale') staleClaims.push(row);
    else if (state === 'stuck') { stuck.push(row); inFlight.push(row); }
    else inFlight.push(row);
  }

  // An in_progress task nobody has touched in a week is stale even without a
  // claim: that is the "six things in progress that finished long ago" failure
  // this whole system exists to prevent.
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const staleTasks = openish.filter((t) => {
    if (t.status !== 'in_progress') return false;
    const stamp = t.last_touched_at || t.updated_at || t.created_at;
    return stamp && new Date(String(stamp).replace(' ', 'T') + 'Z') < weekAgo;
  }).map((t) => Object.assign(s(t), { state: 'untouched_7d' }));

  const countsByBucket = {};
  for (const t of tasks) {
    if (t.closed) continue;
    countsByBucket[t.effective_bucket] = (countsByBucket[t.effective_bucket] || 0) + 1;
  }

  return {
    as_of: now.toISOString(),
    changed_since: changedSince,
    overdue_promises: overduePromises,
    bleeding: openish.filter((t) => t.bleeding).map(s),
    costing_money: {
      total_per_day: Math.round(costingTotal * 100) / 100,
      tasks: costing.map(s),
    },
    due_soon: openish.filter((t) => t.due_date && t.due_date >= todayStr && t.due_date <= in7).map(s),
    decisions_blocking: decisions,
    quick_wins: quickWins,
    agent_ready: agentReady,
    needs_verification: tasks.filter((t) => t.status === 'done' && !t.verified).map(s),
    awaiting_review: tasks.filter((t) => t.status === 'awaiting_review').map(s),
    in_flight: inFlight,
    stale: staleClaims.concat(staleTasks),
    stuck,
    health: store.healthSnapshot(),
    blocked_count: openish.filter((t) => t.blocked).length,
    counts_by_bucket: countsByBucket,
    task_count: openish.length,
  };
}

// The public read variant. Same builder with PII off, then a hard structural
// scrub: any `person` or `email` key anywhere in the payload is deleted rather
// than trusted to have been omitted. Belt and braces, because this is the one
// endpoint reachable with a weak token.
function scrubPii(value) {
  if (Array.isArray(value)) return value.map(scrubPii);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'person' || k === 'email') continue;
      out[k] = scrubPii(v);
    }
    return out;
  }
  return value;
}

function buildPublicDigest({ baseUrl = '' } = {}) {
  return scrubPii(buildDigest({ baseUrl, includePii: false }));
}

module.exports = { buildDigest, buildPublicDigest, scrubPii, summary };
