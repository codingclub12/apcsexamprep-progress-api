'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ROUTER. The piece that makes this not-Todoist: given a task, which surface
//  and which model, and is it eligible for autonomous dispatch.
//
//  Deterministic and PURE. No database, no clock (the caller passes `now`), no
//  I/O. Every rule is derived from a real safety net that already exists, and
//  every decision carries a human-readable reason that is shown on the row,
//  because a router whose verdict you cannot audit is a router you stop trusting.
//
//  Unit tested against the spec 4.1 table row by row in smoke/command-center.js.
// ─────────────────────────────────────────────────────────────────────────────

// Shopify's single-push ceiling for a page body. Over this, the Admin API push
// fails and the work has to happen in the admin editor by hand (the CSP Command
// Center page is 132.4KB and lives on the far side of this line).
const SHOPIFY_PUSH_CEILING_BYTES = 58 * 1024;

const BIG_SIZES = ['l', 'xl'];

// Never-auto-merge list (spec 4.3). Matched against title + detail. Deliberately
// blunt: a false positive costs one manual dispatch, a false negative costs a
// discount code, a deleted page handle, or a schema migration merged by a robot.
const NEVER_AUTO = [
  { re: /\b(money|pricing|price|discount|coupon|refund|payout|billing|invoice)\b/i, why: 'touches money, pricing, or discounts' },
  { re: /\b(delete|deletes|deleting|unpublish|unpublishes|drop table|handle rename|rename the handle|renames? handles?)\b/i, why: 'deletes, unpublishes, or renames a handle (handles are gradebook keys)' },
  { re: /\b(migration|migrations|migrate|backfill|backfills|schema change|alter table)\b/i, why: 'is a schema migration or a data backfill' },
  { re: /a human must check/i, why: 'is flagged "a human must check"' },
  { re: /\b(student data|student rows|pin reset|reset pins?|roster write|student pii)\b/i, why: 'writes student data beyond normal grade recording' },
];

function norm(v) { return String(v == null ? '' : v).trim().toLowerCase(); }

// ── 4.1 Surface rules, FIRST MATCH WINS ──────────────────────────────────────
function routeSurface(task) {
  const bucket = norm(task.bucket);
  const surface = norm(task.surface);
  const size = norm(task.size);

  if (bucket === 'decision') {
    return { surface: 'none', reason: 'Needs a decision, not work. The compiler emits a decision brief instead of a work prompt.' };
  }
  if (surface === 'api') {
    return { surface: 'claude_code', reason: '21 offline smoke suites plus a nightly browser smoke, invisible to users, auto-merge on green.' };
  }
  if (surface === 'theme') {
    return { surface: 'claude_code', gated: true, reason: 'Gated: the theme repo has no CI at all, so merging IS deploying to the live storefront.' };
  }
  if (surface === 'shopify') {
    const bytes = Number(task.page_bytes);
    if (Number.isFinite(bytes) && bytes > SHOPIFY_PUSH_CEILING_BYTES) {
      return {
        surface: 'chat',
        admin_editor_only: true,
        reason: `Page body is ${Math.round(bytes / 1024)}KB, over the 58KB single-push ceiling. Chat, admin editor only.`,
      };
    }
    return { surface: 'chat', reason: 'Shopify MCP plus the Admin API, within the 58KB single-push ceiling.' };
  }
  if (surface === 'content') {
    if (BIG_SIZES.includes(size)) {
      return { surface: 'cowork', reason: 'Long batch run with file outputs and subagents.' };
    }
    return { surface: 'chat', reason: 'Single-page edit.' };
  }
  if (surface === 'klaviyo') {
    return { surface: 'chat', staged_only: true, reason: 'Chat, staged only. Sends are last to graduate out of do-not-automate.' };
  }
  if (surface === 'drive') {
    return { surface: 'chat', reason: 'Read, create, and copy only. Drive cannot be a live master.' };
  }
  if (surface === 'ops') {
    return { surface: 'chat', reason: 'Ops work runs in chat.' };
  }
  return { surface: 'chat', reason: 'No surface set, so this defaults to chat. Set a surface to route it properly.' };
}

// ── 4.2 Model routing ────────────────────────────────────────────────────────
//  Fable  orchestration, adjudication, synthesis
//  Opus   production code packages, novel design, final gates
//  Sonnet audits and production within an established contract
//  Haiku  extraction and sweeps
function routeModel(task, routed) {
  const bucket = norm(task.bucket);
  const surface = norm(task.surface);
  const size = norm(task.size);
  const isCode = surface === 'api' || surface === 'theme';

  if (bucket === 'decision') {
    return { model: 'fable', reason: 'Adjudication and synthesis, not production.' };
  }
  if (isCode && BIG_SIZES.includes(size)) {
    return { model: 'opus', reason: 'Production code package, and a final gate on a repo that deploys.' };
  }
  if (isCode) {
    return { model: 'sonnet', reason: 'Production inside an established contract, with CI or a gate behind it.' };
  }
  if (routed.surface === 'cowork') {
    return { model: 'fable', reason: 'Orchestrating a batch run across subagents.' };
  }
  if (size === 'xs' && (surface === 'drive' || surface === 'ops')) {
    return { model: 'haiku', reason: 'Extraction or a sweep.' };
  }
  if (BIG_SIZES.includes(size)) {
    return { model: 'opus', reason: 'Novel design at size.' };
  }
  return { model: 'sonnet', reason: 'Production within an established contract.' };
}

// ── 4.3 Auto-dispatch eligibility ────────────────────────────────────────────
//  May be set to `eligible` ONLY when all four hold. Everything else gets the
//  greyed toggle plus the reason, rather than a flag that silently does nothing.
//  v1 ships the column, this logic, and the greyed toggle. The dispatcher itself
//  is Phase 3; nothing here changes when it lands.
function autoDispatchEligibility(task, opts) {
  const themeCi = !!(opts && opts.themeCiExists);
  const surface = norm(task.surface);
  const bucket = norm(task.bucket);
  const status = norm(task.status) || 'open';

  if (bucket === 'decision') return { eligible: false, reason: 'A decision cannot be dispatched. It needs a call, not an agent.' };
  if (surface === 'theme' && !themeCi) {
    return { eligible: false, reason: 'Theme work is eligible only after the theme-repo CI task ships. Until then merging is deploying.' };
  }
  if (surface === 'theme' && themeCi) {
    // Falls through to the same checks as api once the gate that makes theme
    // auto-merge equivalent to api auto-merge actually exists.
  } else if (surface !== 'api') {
    return { eligible: false, reason: `A GitHub Action can only reach repos, so surface=${surface || 'unset'} can never be auto-dispatched.` };
  }
  if (status !== 'open') return { eligible: false, reason: `Only an open task is eligible; this one is ${status}.` };
  if (task.blocked) return { eligible: false, reason: 'Blocked by an unfinished task.' };

  const text = `${task.title || ''} ${task.detail || ''}`;
  for (const rule of NEVER_AUTO) {
    if (rule.re.test(text)) {
      return { eligible: false, reason: `On the never-auto-merge list: ${rule.why}.` };
    }
  }
  return { eligible: true, reason: 'Repo-reachable, open, unblocked, and off the never-auto-merge list.' };
}

// ── 4.4 Time-of-day weighting ────────────────────────────────────────────────
//  SOFT, never hard. Between the configured hours, long-running work sorts down.
//  bleeding=1, an overdue promise, or a due_date of today overrides it entirely.
//  One config row, editable, because the window moves across the school year.
const DEFAULT_TIME_WEIGHTING = {
  start_hour: 17,          // 5pm local
  end_hour: 20,            // 8pm local
  penalize_sizes: ['l', 'xl'],
  tz_offset_minutes: -240, // US Eastern, the only clock that matters here
  enabled: 1,
};

function timeOfDayPenalty(task, now, cfg) {
  const c = Object.assign({}, DEFAULT_TIME_WEIGHTING, cfg || {});
  if (!c.enabled) return 0;
  if (task.bleeding || task.overdue_promise || task.due_today) return 0;
  const local = new Date(now.getTime() + c.tz_offset_minutes * 60 * 1000);
  const hour = local.getUTCHours();
  const inWindow = c.start_hour <= c.end_hour
    ? hour >= c.start_hour && hour < c.end_hour
    : hour >= c.start_hour || hour < c.end_hour;
  if (!inWindow) return 0;
  return (c.penalize_sizes || []).includes(norm(task.size)) ? 1 : 0;
}

// ── The one call everything else uses ────────────────────────────────────────
function route(task, opts) {
  const s = routeSurface(task || {});
  const m = routeModel(task || {}, s);
  const auto = autoDispatchEligibility(task || {}, opts);
  const flags = [];
  if (s.gated) flags.push('gated');
  if (s.admin_editor_only) flags.push('admin editor only');
  if (s.staged_only) flags.push('staged only');

  return {
    routed_surface: s.surface,
    routed_model: m.model,
    routed_reason: `${s.reason} Model: ${m.model} - ${m.reason}`,
    surface_reason: s.reason,
    model_reason: m.reason,
    flags,
    // Chat holds no lock and cannot POST a return, so a chat-routed task closes
    // through Tanner: the compiled prompt ends with a paste-ready curl, and the
    // row says so instead of offering a claim affordance that cannot work.
    closes_manually: s.surface === 'chat',
    auto_dispatch_eligible: auto.eligible,
    auto_dispatch_reason: auto.reason,
  };
}

module.exports = {
  route, routeSurface, routeModel, autoDispatchEligibility, timeOfDayPenalty,
  SHOPIFY_PUSH_CEILING_BYTES, DEFAULT_TIME_WEIGHTING, NEVER_AUTO,
};
