'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  UNIFIED ANALYTICS - the three admin decks (exec KPIs, adoption summary, and
//  the analytics breakdown deck) resolved into ONE payload behind ONE request.
//
//  WHY THIS EXISTS: /exec, /summary, and /analytics each scan every class row,
//  bucket it through classifyClass, and then run their own aggregate suite. Three
//  browser tabs on 60-second auto-refresh therefore ran three full aggregate
//  passes a minute against the same data, on a 1 vCPU / 1 GB Railway box. One
//  page fetching one endpoint collapses that to a single pass per refresh.
//
//  It does NOT reimplement any of the three. computeExec / computeSummary /
//  computeAnalytics stay the single source for their own numbers, so a fix in
//  one of them shows up here with no edit. This module composes and cross-checks.
//
//  CROSS-CHECK: several figures are derived independently by more than one deck
//  (real students total, active-7d). Concatenating the decks would let them
//  disagree silently on one screen. crosscheck recomputes those overlaps and
//  reports agreement explicitly, which is what makes this a unified view rather
//  than three stacked ones. A mismatch is a bug in a bucketing or window rule,
//  and this is the surface that makes it visible.
//
//  PERFORMANCE: results are memoized for a short TTL, keyed by the validated
//  range. The key space is the RANGE_DAYS allow-list (5 values), so the cache is
//  bounded by construction and cannot grow with traffic - no per-request growth,
//  which is the failure mode that produced the $169 month.
//
//  PII: composition only. Nothing is read here that the three decks do not
//  already return.
// ─────────────────────────────────────────────────────────────────────────────
const metrics = require('./admin-metrics');
const analytics = require('./admin-analytics');
const exec = require('./admin-exec');

// Must mirror the allow-list in lib/admin-analytics.js. 0 means all-time.
const RANGE_DAYS = new Set([0, 7, 30, 90, 365]);

// Short enough that the deck still reads as live, long enough to absorb a
// multi-tab refresh burst and the manual Refresh button.
const TTL_MS = 30 * 1000;

// Bounded by RANGE_DAYS: at most one entry per allowed range value.
const cache = new Map();

function normalizeDays(sinceDays) {
  const n = Number(sinceDays);
  return RANGE_DAYS.has(n) ? n : 0;
}

// One overlap check. `sources` is a list of [label, value] the decks each
// derived independently; they must all agree.
function agree(metric, note, sources) {
  const values = sources.map((s) => s[1]);
  const first = values[0];
  const ok = values.every((v) => v === first);
  return {
    metric,
    note,
    agrees: ok,
    value: ok ? first : null,
    sources: sources.map(([deck, value]) => ({ deck, value })),
  };
}

// Overlapping figures only. Windowed values are compared exclusively at
// days = 0, where the analytics deck is unwindowed and the other two decks
// (which are always all-time) are on the same footing.
function crossCheck(execp, summary, deck, days) {
  const checks = [];

  const soloStudents = (summary.headline && summary.headline.solo && summary.headline.solo.students) || 0;
  const extStudents = (summary.headline && summary.headline.external && summary.headline.external.students) || 0;
  const recency = deck.recency || {};

  checks.push(agree(
    'Real students (total)',
    'every deck counts the same EXTERNAL + SOLO population',
    [
      ['exec', (execp.kpis && execp.kpis.students_total) || 0],
      ['summary', extStudents + soloStudents],
      ['analytics', recency.total || 0],
    ]
  ));

  checks.push(agree(
    'Active students (7d)',
    'same population, same 7-day window',
    [
      ['exec', (execp.kpis && execp.kpis.active_students_7d) || 0],
      ['analytics', recency.active_7d || 0],
    ]
  ));

  checks.push(agree(
    'Active students (30d)',
    'same population, same 30-day window',
    [
      ['exec', (execp.kpis && execp.kpis.active_students_30d) || 0],
      ['analytics', recency.active_30d || 0],
    ]
  ));

  // Completions are windowed in the analytics deck, so this one is only a
  // like-for-like comparison on the all-time range.
  if (days === 0) {
    const extCompletions = (summary.headline && summary.headline.external && summary.headline.external.completions) || 0;
    const soloCompletions = (summary.headline && summary.headline.solo && summary.headline.solo.completions) || 0;
    const deckCompletions = (deck.by_course || []).reduce((n, r) => n + (r.completions || 0), 0);
    checks.push(agree(
      'Lesson completions (all time)',
      'summary headline against the by-course breakdown',
      [
        ['summary', extCompletions + soloCompletions],
        ['analytics', deckCompletions],
      ]
    ));
  }

  const disagreements = checks.filter((c) => !c.agrees);
  return {
    ok: disagreements.length === 0,
    checked: checks.length,
    disagreements: disagreements.length,
    checks,
  };
}

// The unified payload. `sinceDays` applies to the analytics deck only: the exec
// KPIs and the adoption summary carry their own fixed windows by design, and
// changing the range must not silently redefine what they mean.
function computeUnified(sinceDays) {
  const days = normalizeDays(sinceDays);

  const hit = cache.get(days);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return Object.assign({}, hit.payload, {
      cached: true,
      cache_age_seconds: Math.round((Date.now() - hit.at) / 1000),
    });
  }

  const execp = exec.computeExec();
  const summary = metrics.computeSummary();
  const deck = analytics.computeAnalytics(days);

  const payload = {
    generated_at: new Date().toISOString(),
    range: { days },
    // Only truly empty when the decks that read the real population agree there
    // is nothing to show.
    empty: Boolean(execp.empty && deck.empty),
    exec: execp,
    summary,
    analytics: deck,
    crosscheck: crossCheck(execp, summary, deck, days),
  };

  cache.set(days, { at: Date.now(), payload });
  return Object.assign({}, payload, { cached: false, cache_age_seconds: 0 });
}

// Exposed so a future write path (or a test) can force the next read to be cold.
function invalidate() {
  cache.clear();
}

module.exports = { computeUnified, invalidate, RANGE_DAYS, TTL_MS };
