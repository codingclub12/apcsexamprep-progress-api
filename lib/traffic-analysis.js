'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  TRAFFIC ANALYSIS — turning stored dailies into the things a decision is made on.
//
//  Reads metrics_daily and nothing else, so it is source-agnostic by
//  construction: it cannot tell GA4 from Raptive and does not need to.
//
//  WHAT THIS IS CAREFUL ABOUT, and why:
//
//  1. TODAY IS ALWAYS A PARTIAL DAY. Every one of these sources reports a day
//     that is still in progress as a small number. Charting it next to complete
//     days draws a cliff every single afternoon, and a projection fitted through
//     it forecasts a collapse. Every window here ends YESTERDAY, and today is
//     returned separately and labelled partial.
//
//  2. RECENT DAYS GET RESTATED. GSC in particular keeps moving for about three
//     days. Comparisons therefore offer a settled window as the default, so a
//     "traffic is down" conclusion is not just late data arriving.
//
//  3. NOTHING ATTEMPTED IS NOT ZERO. A day with no row is absent, not a zero.
//     Averaging over missing days as zeros invents a decline that never happened,
//     so gaps stay null and every aggregate reports how many days it actually had.
//
//  4. A RANK IS NOT A COUNT. For 'position', down is good and up is bad, and it
//     averages rather than sums. Treating it like clicks inverts the read.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');
const contract = require('./traffic-contract');

const round = (n, dp = 2) => {
  if (n == null || !Number.isFinite(n)) return null;
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
};

// Lower-is-better metrics. Everything else improves by going up.
const LOWER_IS_BETTER = new Set(['position', 'bounce_rate']);

function isImprovement(metric, delta) {
  if (delta == null || delta === 0) return null;
  return LOWER_IS_BETTER.has(metric) ? delta < 0 : delta > 0;
}

// ── Series ───────────────────────────────────────────────────────────────────
//  One metric over time at a single dimension (default: the site total).
//  Days with no row are returned with value null rather than 0, so a consumer
//  can tell "no data" from "genuinely none".
function series(metric, { source = null, dimension = '', days = 90, endToday = false } = {}) {
  const n = Math.max(1, Math.min(400, Number(days) || 90));
  const params = [String(metric), String(dimension)];
  let sourceClause = '';
  if (source) { sourceClause = ' AND source = ?'; params.push(String(source)); }

  // Sum across sources when none is named: two sources reporting 'pageviews' for
  // the same day are additive only if the caller asked for that, which is why
  // the source-less case is documented as a roll-up rather than a default view.
  const agg = contract.METRICS[metric] && contract.METRICS[metric].agg === 'avg' ? 'AVG' : 'SUM';

  const rows = db.prepare(`
    SELECT date, ${agg}(value) AS value
      FROM metrics_daily
     WHERE metric = ? AND dimension = ?${sourceClause}
       AND date >= date('now', ?) AND date <= date('now', ?)
     GROUP BY date ORDER BY date ASC
  `).all(...params, `-${n} days`, endToday ? '-0 days' : '-1 days');

  const have = new Map(rows.map((r) => [r.date, r.value]));
  const out = [];
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - (endToday ? 0 : 1));
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    out.push({ date: iso, value: have.has(iso) ? round(have.get(iso), 4) : null });
  }
  return out;
}

// Centred moving average, skipping gaps. Smooths the weekday cycle that every
// education site has (weekends are structurally quieter) so a trend line is not
// mistaken for a crash every Saturday.
function movingAverage(points, window = 7) {
  const w = Math.max(2, Number(window) || 7);
  const half = Math.floor(w / 2);
  return points.map((p, i) => {
    const slice = points.slice(Math.max(0, i - half), Math.min(points.length, i + half + 1));
    const vals = slice.map((x) => x.value).filter((v) => v != null);
    return { date: p.date, value: vals.length ? round(vals.reduce((a, b) => a + b, 0) / vals.length) : null };
  });
}

// ── Comparison ───────────────────────────────────────────────────────────────
//  Period against the equivalent period immediately before it. Reports coverage
//  on both sides: a 30-day window holding 4 days of data is not a 30-day number,
//  and a comparison that hides that is worse than no comparison.
function compare(metric, { source = null, dimension = '', days = 28 } = {}) {
  const n = Math.max(1, Math.min(180, Number(days) || 28));
  const all = series(metric, { source, dimension, days: n * 2 });
  const previous = all.slice(0, n);
  const current = all.slice(n);

  const avg = contract.METRICS[metric] && contract.METRICS[metric].agg === 'avg';
  const fold = (points) => {
    const vals = points.map((p) => p.value).filter((v) => v != null);
    if (!vals.length) return { value: null, days: 0 };
    const total = vals.reduce((a, b) => a + b, 0);
    return { value: round(avg ? total / vals.length : total), days: vals.length };
  };

  const cur = fold(current);
  const prev = fold(previous);
  const delta = cur.value != null && prev.value != null ? round(cur.value - prev.value) : null;
  const pct = delta != null && prev.value ? round((delta / Math.abs(prev.value)) * 100, 1) : null;

  return {
    metric,
    window_days: n,
    current: cur.value, current_days: cur.days,
    previous: prev.value, previous_days: prev.days,
    delta, delta_pct: pct,
    improving: isImprovement(metric, delta),
    // A comparison built on partial coverage is reported, not hidden.
    complete: cur.days === n && prev.days === n,
  };
}

// ── Projection ───────────────────────────────────────────────────────────────
//  Ordinary least squares on the observed days, projected forward.
//
//  This is a TREND EXTRAPOLATION and nothing more. It has no idea about
//  seasonality, an algorithm update, or the fact that an AP CS site empties out
//  every June. So it reports the fit quality (r2) alongside the number, and a
//  caller that ignores a low r2 is reading a straight line through noise. Below
//  MIN_POINTS it declines to project at all rather than drawing a confident line
//  through four data points.
const MIN_POINTS = 14;

function project(metric, { source = null, dimension = '', days = 90, horizon = 30 } = {}) {
  const points = series(metric, { source, dimension, days });
  const observed = points.map((p, i) => ({ x: i, y: p.value })).filter((p) => p.y != null);

  if (observed.length < MIN_POINTS) {
    return {
      metric, horizon_days: horizon, projection: null,
      reason: `need at least ${MIN_POINTS} days of data, have ${observed.length}`,
      observed_days: observed.length,
    };
  }

  // OUTLIERS ARE EXCLUDED FROM THE FIT, NOT FROM THE DATA.
  //
  // A single freak day drags an ordinary least-squares line badly: the first
  // real production series had one day roughly 100x the median, which produced
  // a confident-looking trend line with r2 = 0.002, i.e. a straight line
  // through noise. Dropping the point from the chart would be worse (it is real
  // traffic and worth seeing), so it stays in the series and only the FIT
  // ignores it.
  //
  // Detection uses the median absolute deviation rather than standard
  // deviation, because the standard deviation is itself inflated by the very
  // outlier being looked for, so an extreme point can hide inside its own
  // effect on the threshold. MAD does not have that problem.
  const values = observed.map((p) => p.y).sort((a, b) => a - b);
  const median = values[Math.floor(values.length / 2)];
  const deviations = observed.map((p) => Math.abs(p.y - median)).sort((a, b) => a - b);
  const mad = deviations[Math.floor(deviations.length / 2)];
  // 0.6745 scales MAD to be comparable to a standard deviation for normal data;
  // 5 is deliberately permissive, so only genuinely wild points are excluded.
  const threshold = mad > 0 ? (5 * mad) / 0.6745 : Infinity;
  const fitted = observed.filter((p) => Math.abs(p.y - median) <= threshold);
  const excluded = observed
    .filter((p) => Math.abs(p.y - median) > threshold)
    .map((p) => ({ date: points[p.x] && points[p.x].date, value: p.y }));

  // If exclusion would leave too little to fit, keep everything and say so
  // rather than fitting three points and calling it a trend.
  const usable = fitted.length >= MIN_POINTS ? fitted : observed;

  const n = usable.length;
  const sumX = usable.reduce((a, p) => a + p.x, 0);
  const sumY = usable.reduce((a, p) => a + p.y, 0);
  const sumXY = usable.reduce((a, p) => a + p.x * p.y, 0);
  const sumXX = usable.reduce((a, p) => a + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (!denom) {
    return { metric, horizon_days: horizon, projection: null, reason: 'degenerate fit', observed_days: n };
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const meanY = sumY / n;
  const ssTot = usable.reduce((a, p) => a + Math.pow(p.y - meanY, 2), 0);
  const ssRes = usable.reduce((a, p) => a + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
  const r2 = ssTot ? round(1 - ssRes / ssTot, 3) : null;

  const lastX = points.length - 1;
  const h = Math.max(1, Math.min(365, Number(horizon) || 30));
  const forecast = [];
  const lastDate = new Date(points[points.length - 1].date + 'T00:00:00Z');
  for (let i = 1; i <= h; i++) {
    const d = new Date(lastDate);
    d.setUTCDate(d.getUTCDate() + i);
    const y = slope * (lastX + i) + intercept;
    forecast.push({
      date: d.toISOString().slice(0, 10),
      // A projected count below zero is arithmetic, not a forecast.
      value: round(contract.METRICS[metric] && contract.METRICS[metric].unit === 'rank' ? Math.max(1, y) : Math.max(0, y)),
    });
  }

  return {
    metric,
    horizon_days: h,
    observed_days: n,
    // Reported, never silent: a projection fitted on a subset must say so, or
    // the excluded day looks like it never happened.
    outliers_excluded: usable === fitted ? excluded : [],
    outliers_detected: excluded.length,
    slope_per_day: round(slope, 4),
    r2,
    // An honest label, so a caller does not have to infer it from r2 alone.
    fit_quality: r2 == null ? 'unknown' : r2 >= 0.7 ? 'strong' : r2 >= 0.3 ? 'weak' : 'noise',
    projection: forecast,
    end_value: forecast.length ? forecast[forecast.length - 1].value : null,
    improving: isImprovement(metric, slope),
  };
}

// ── Movers ───────────────────────────────────────────────────────────────────
//  Which pages or queries changed most between two equal windows. This is the
//  "what actually happened" view: a site total that moved 5% is usually a
//  handful of URLs moving a lot, not everything drifting.
//
//  MIN_BASE exists because percentage change on tiny numbers is meaningless: a
//  query going from 1 impression to 4 is +300% and tells you nothing.
function movers(metric, { source = null, namespace = 'page', days = 28, limit = 20, minBase = 30 } = {}) {
  const n = Math.max(1, Math.min(180, Number(days) || 28));
  const params = [String(metric), namespace + ':%'];
  let sourceClause = '';
  if (source) { sourceClause = ' AND source = ?'; params.push(String(source)); }

  const avg = contract.METRICS[metric] && contract.METRICS[metric].agg === 'avg';
  const fn = avg ? 'AVG' : 'SUM';

  // Same boundary rule as breakdown(): windows end yesterday, so the lower bound
  // is n+1 days back, not n.
  const curFrom = `-${n + 1} days`;
  const prevFrom = `-${2 * n + 1} days`;

  const rows = db.prepare(`
    SELECT dimension,
           ${fn}(CASE WHEN date >  date('now', ?) THEN value END) AS cur,
           ${fn}(CASE WHEN date <= date('now', ?) AND date > date('now', ?) THEN value END) AS prev,
           COUNT(CASE WHEN date >  date('now', ?) THEN 1 END) AS cur_days,
           COUNT(CASE WHEN date <= date('now', ?) AND date > date('now', ?) THEN 1 END) AS prev_days
      FROM metrics_daily
     WHERE metric = ? AND dimension LIKE ?${sourceClause}
       AND date >  date('now', ?) AND date <= date('now', '-1 days')
     GROUP BY dimension
  `).all(
    curFrom, curFrom, prevFrom,
    curFrom, curFrom, prevFrom,
    ...params, prevFrom
  );

  const out = [];
  for (const r of rows) {
    const cur = r.cur == null ? null : round(r.cur);
    const prev = r.prev == null ? null : round(r.prev);
    // New (no previous) and lost (no current) are real and interesting, but a
    // percentage cannot be computed for them, so they are labelled instead.
    const status = prev == null ? 'new' : cur == null ? 'lost' : 'changed';
    const base = Math.max(prev || 0, cur || 0);
    if (status === 'changed' && base < minBase) continue;
    const delta = cur != null && prev != null ? round(cur - prev) : null;
    const pct = delta != null && prev ? round((delta / Math.abs(prev)) * 100, 1) : null;
    out.push({
      dimension: r.dimension,
      ...contract.parseDimension(r.dimension),
      current: cur, previous: prev, current_days: r.cur_days, previous_days: r.prev_days,
      delta, delta_pct: pct, status,
      improving: isImprovement(metric, delta),
    });
  }

  const rank = (x) => (x.delta == null ? 0 : Math.abs(x.delta));
  out.sort((a, b) => rank(b) - rank(a));
  const lim = Math.max(1, Math.min(100, Number(limit) || 20));
  const winners = out.filter((x) => x.improving === true).slice(0, lim);
  const losers = out.filter((x) => x.improving === false).slice(0, lim);
  return { metric, namespace, window_days: n, min_base: minBase, winners, losers, considered: out.length };
}

// ── Keyword rankings ─────────────────────────────────────────────────────────
//  Queries by average position, with movement. Position is a rank: a NEGATIVE
//  delta is an improvement, which is the opposite of every other metric here,
//  and is why this does not just call movers() and relabel it.
function rankings({ days = 28, limit = 50, maxPosition = 100 } = {}) {
  const n = Math.max(1, Math.min(180, Number(days) || 28));

  // Same boundary rule as breakdown() and movers(): windows end yesterday, so
  // the exclusive lower bound is n+1 days back, not n. This one was the last to
  // be fixed and showed the failure most plainly: at n=1 the current window was
  // (now-1, now-1], which is empty, so a "Today" range reported zero tracked
  // keywords on a site that ranks for hundreds.
  const curFrom = `-${n + 1} days`;
  const prevFrom = `-${2 * n + 1} days`;

  const rows = db.prepare(`
    SELECT dimension,
           AVG(CASE WHEN date >  date('now', ?) THEN value END) AS cur,
           AVG(CASE WHEN date <= date('now', ?) AND date > date('now', ?) THEN value END) AS prev
      FROM metrics_daily
     WHERE source = 'gsc' AND metric = 'position' AND dimension LIKE 'query:%'
       AND date >  date('now', ?) AND date <= date('now', '-1 days')
     GROUP BY dimension
  `).all(curFrom, curFrom, prevFrom, prevFrom);

  // Clicks and impressions for the same queries, so a ranking table can say
  // whether a position actually earns anything.
  const clicks = new Map(db.prepare(`
    SELECT dimension, SUM(value) AS v FROM metrics_daily
     WHERE source = 'gsc' AND metric = 'clicks' AND dimension LIKE 'query:%'
       AND date > date('now', ?) AND date <= date('now', '-1 days')
     GROUP BY dimension
  `).all(curFrom).map((r) => [r.dimension, r.v]));

  const impressions = new Map(db.prepare(`
    SELECT dimension, SUM(value) AS v FROM metrics_daily
     WHERE source = 'gsc' AND metric = 'impressions' AND dimension LIKE 'query:%'
       AND date > date('now', ?) AND date <= date('now', '-1 days')
     GROUP BY dimension
  `).all(curFrom).map((r) => [r.dimension, r.v]));

  const out = rows
    .filter((r) => r.cur != null && r.cur <= maxPosition)
    .map((r) => {
      const delta = r.prev != null ? round(r.cur - r.prev, 1) : null;
      return {
        query: contract.parseDimension(r.dimension).value,
        position: round(r.cur, 1),
        previous_position: r.prev != null ? round(r.prev, 1) : null,
        delta,                                  // negative = moved up the page
        improving: delta == null ? null : delta < 0,
        clicks: round(clicks.get(r.dimension) || 0),
        impressions: round(impressions.get(r.dimension) || 0),
        status: r.prev == null ? 'new' : 'tracked',
      };
    });

  // SORTED BY CLICKS, NOT BY POSITION.
  //
  // Sorting by position put every query the site happens to rank #1 for at the
  // top, which on a real site is a wall of long-tail phrases with one
  // impression each. The first production render showed fifteen rows all at
  // position 1.0 with 1-2 clicks, while the query actually earning ten clicks
  // was buried below them. Position is what the row reports; traffic is what
  // makes the row worth reading.
  out.sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions || a.position - b.position);
  const lim = Math.max(1, Math.min(200, Number(limit) || 50));
  return {
    window_days: n,
    tracked: out.length,
    // The bands people actually act on.
    page_1: out.filter((r) => r.position <= 10).length,
    striking_distance: out.filter((r) => r.position > 10 && r.position <= 20).length,
    top: out.slice(0, lim),
    // Filtered by DIRECTION, not just sorted by it. Sorting alone puts the same
    // query in both lists whenever there are fewer queries than the slice size,
    // which reads as "it gained and it dropped".
    biggest_gains: [...out].filter((r) => r.delta != null && r.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 10),
    biggest_drops: [...out].filter((r) => r.delta != null && r.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 10),
  };
}

// ── Breakdowns ───────────────────────────────────────────────────────────────
//  Top N values of ONE dimension for ONE metric, with the previous equal window
//  beside it. This is the "what is my traffic actually made of" view: which
//  countries, which devices, which channels, which pages, which queries.
//
//  Movers answers "what changed"; this answers "what IS it". Both are needed,
//  because a page can be the largest source of traffic on the site and never
//  appear in movers simply because it is stable.
// WINDOW BOUNDARIES, and the off-by-one they used to carry.
//
// Every range here ends YESTERDAY. So "the last n days" is the half-open span
// (now-(n+1), now-1]. Using (now-n, now-1] instead, which is the obvious thing
// to write, silently drops one day from every window: a 7-day window measured 6.
// At n=1 it breaks completely, because (now-1, now-1] is empty and the whole
// current window disappears, which is why a "Today" range rendered no
// composition tables at all rather than rendering one day.
function breakdown(metric, { source = null, namespace = 'page', days = 28, limit = 25 } = {}) {
  const n = Math.max(1, Math.min(400, Number(days) || 28));
  const spec = contract.METRICS[metric];
  if (!spec) return { metric, namespace, rows: [], total: null };
  const fn = spec.agg === 'avg' ? 'AVG' : 'SUM';

  const params = [String(metric), namespace + ':%'];
  let sourceClause = '';
  if (source) { sourceClause = ' AND source = ?'; params.push(String(source)); }

  const curFrom = `-${n + 1} days`;        // exclusive lower bound of the window
  const prevFrom = `-${2 * n + 1} days`;   // exclusive lower bound of the one before

  const rows = db.prepare(`
    SELECT dimension,
           ${fn}(CASE WHEN date >  date('now', ?) THEN value END) AS cur,
           ${fn}(CASE WHEN date <= date('now', ?) AND date > date('now', ?) THEN value END) AS prev,
           COUNT(DISTINCT CASE WHEN date > date('now', ?) THEN date END) AS days
      FROM metrics_daily
     WHERE metric = ? AND dimension LIKE ?${sourceClause}
       AND date >  date('now', ?) AND date <= date('now', '-1 days')
     GROUP BY dimension
  `).all(curFrom, curFrom, prevFrom, curFrom, ...params, prevFrom);

  const out = rows
    .filter((r) => r.cur != null)
    .map((r) => {
      const delta = r.prev != null ? round(r.cur - r.prev) : null;
      return {
        value: contract.parseDimension(r.dimension).value,
        current: round(r.cur),
        previous: r.prev != null ? round(r.prev) : null,
        days: r.days,
        delta,
        delta_pct: delta != null && r.prev ? round((delta / Math.abs(r.prev)) * 100, 1) : null,
        improving: isImprovement(metric, delta),
      };
    });

  // A rank sorts ascending (1 is best); everything else sorts by size.
  out.sort((a, b) => (spec.unit === 'rank' ? a.current - b.current : b.current - a.current));

  // Share of the whole, so a row can be read without mental arithmetic. Only
  // meaningful for additive metrics: shares of an average are nonsense.
  const total = spec.agg === 'sum' ? out.reduce((t, r) => t + (r.current || 0), 0) : null;
  if (total) out.forEach((r) => { r.share_pct = round((r.current / total) * 100, 1); });

  return {
    metric, namespace, source, window_days: n,
    distinct_values: out.length,
    total: total != null ? round(total) : null,
    rows: out.slice(0, Math.max(1, Math.min(200, Number(limit) || 25))),
  };
}

// ── Overview ─────────────────────────────────────────────────────────────────
//  EVERYTHING, IN ONE PASS.
//
//  The per-metric endpoint forced the page into a dropdown, which made the
//  dashboard worse in a specific way: picking a metric a source does not report
//  (pageviews from Search Console) rendered a blank chart with no explanation,
//  and there was no way to see search and audience numbers side by side. You
//  had to already know which metric lived where in order to look at it.
//
//  So this returns every metric that actually HAS data, each with its own
//  series and its comparisons across several windows at once. The page then has
//  nothing to choose: it draws what exists.
//
//  ONE QUERY, NOT ONE PER METRIC. Building this from series()/compare() would
//  have issued roughly 4 queries per metric plus a windowed pair each, ~60
//  round trips per page load on a 1 vCPU box. Instead the daily rows come back
//  in a single scan and every window is folded in JS, which is the same rule
//  the unified deck follows.
const OVERVIEW_WINDOWS = [7, 28, 90];

function overview({ days = 90 } = {}) {
  // The span is what the CHART shows and is honoured exactly, including 1. It
  // used to be clamped to a minimum of 14, which made a "last 1 day" view report
  // "14 days observed": the label contradicted its own data.
  const span = Math.max(1, Math.min(400, Number(days) || 90));

  // The lookback is separate and always covers the largest comparison window
  // twice over, so the 7 / 28 / 90 day changes are available even when the chart
  // is showing a single day. Tying the two together meant picking a short range
  // silently deleted the comparisons, which is the opposite of what a short
  // range is for: when something just happened you want MORE context, not less.
  const widest = OVERVIEW_WINDOWS[OVERVIEW_WINDOWS.length - 1];
  const lookback = Math.min(400, Math.max(span, widest * 2));

  const rows = db.prepare(`
    SELECT date, source, metric, SUM(value) AS sum_value, AVG(value) AS avg_value
      FROM metrics_daily
     WHERE dimension = ''
       AND date >= date('now', ?) AND date <= date('now', '-1 days')
     GROUP BY date, source, metric
     ORDER BY date ASC
  `).all(`-${lookback} days`);

  // metric -> source -> date -> value
  const byMetric = new Map();
  for (const r of rows) {
    const spec = contract.METRICS[r.metric];
    if (!spec) continue;                       // a metric the contract retired
    const value = spec.agg === 'avg' ? r.avg_value : r.sum_value;
    if (!byMetric.has(r.metric)) byMetric.set(r.metric, new Map());
    const bySource = byMetric.get(r.metric);
    if (!bySource.has(r.source)) bySource.set(r.source, new Map());
    bySource.get(r.source).set(r.date, value);
  }

  // Calendar of the last `lookback` days ending yesterday, so a gap stays a gap.
  const calendar = [];
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  for (let i = lookback - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    calendar.push(d.toISOString().slice(0, 10));
  }

  const out = [];
  for (const [metric, bySource] of byMetric) {
    const spec = contract.METRICS[metric];
    for (const [source, values] of bySource) {
      const full = calendar.map((date) => ({ date, value: values.has(date) ? round(values.get(date), 4) : null }));
      const visible = full.slice(-span);
      const observed = visible.filter((p) => p.value != null);
      if (!observed.length) continue;          // nothing to draw, so do not offer it

      // Every window folded from the same in-memory series.
      const windows = {};
      for (const w of OVERVIEW_WINDOWS) {
        const cur = full.slice(-w);
        const prev = full.slice(-(w * 2), -w);
        const fold = (points) => {
          const vals = points.map((p) => p.value).filter((v) => v != null);
          if (!vals.length) return { value: null, days: 0 };
          const total = vals.reduce((a, b) => a + b, 0);
          return { value: round(spec.agg === 'avg' ? total / vals.length : total), days: vals.length };
        };
        const c = fold(cur);
        const pv = fold(prev);
        const delta = c.value != null && pv.value != null ? round(c.value - pv.value) : null;
        windows['d' + w] = {
          window_days: w,
          current: c.value, current_days: c.days,
          previous: pv.value, previous_days: pv.days,
          delta,
          delta_pct: delta != null && pv.value ? round((delta / Math.abs(pv.value)) * 100, 1) : null,
          improving: isImprovement(metric, delta),
          complete: c.days === w && pv.days === w,
        };
      }

      out.push({
        metric, source,
        label: spec.label, unit: spec.unit, agg: spec.agg,
        lower_is_better: LOWER_IS_BETTER.has(metric),
        series: visible,
        trend: movingAverage(visible, 7),
        latest: observed[observed.length - 1].value,
        latest_date: observed[observed.length - 1].date,
        observed_days: observed.length,
        windows,
      });
    }
  }

  // Stable order: by source in contract order, then by the metric order the
  // contract declares, so the page layout does not shuffle between loads.
  const metricOrder = Object.keys(contract.METRICS);
  const sourceOrder = contract.SOURCES;
  out.sort((a, b) =>
    (sourceOrder.indexOf(a.source) - sourceOrder.indexOf(b.source)) ||
    (metricOrder.indexOf(a.metric) - metricOrder.indexOf(b.metric)));

  return { window_days: span, windows: OVERVIEW_WINDOWS, metrics: out };
}

// What is actually in the table: which sources have reported, over what range,
// and when they last did. A source that stopped delivering shows up here as a
// stale last_date rather than as a chart that quietly flattens.
function inventory() {
  const rows = db.prepare(`
    SELECT source,
           COUNT(*) AS rows,
           COUNT(DISTINCT metric) AS metrics,
           COUNT(DISTINCT date) AS days,
           MIN(date) AS first_date,
           MAX(date) AS last_date
      FROM metrics_daily GROUP BY source ORDER BY source
  `).all();
  const today = new Date().toISOString().slice(0, 10);
  return rows.map((r) => {
    const lag = Math.round((Date.parse(today) - Date.parse(r.last_date)) / 86400000);
    return {
      ...r,
      days_behind: Number.isFinite(lag) ? lag : null,
      // Two days is normal (yesterday plus restatement lag); beyond that a daily
      // job has probably stopped running and nothing else would say so.
      stale: Number.isFinite(lag) ? lag > 2 : null,
      traffic_source: contract.SOURCES.includes(r.source),
    };
  });
}

const TRAFFIC_SOURCES = contract.SOURCES;

module.exports = {
  TRAFFIC_SOURCES,
  series, movingAverage, compare, project, movers, rankings, inventory, overview, breakdown,
  OVERVIEW_WINDOWS,
  isImprovement, LOWER_IS_BETTER, MIN_POINTS,
};
