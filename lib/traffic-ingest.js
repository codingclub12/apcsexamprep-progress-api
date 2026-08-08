'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  TRAFFIC INGEST — normalised readings into metrics_daily, bounded and idempotent.
//
//  Every source funnels through here. The ingestors themselves (GA4, GSC, CSV)
//  only fetch and hand over readings in the contract's shape; none of them touch
//  SQL, so there is one write path to reason about rather than four.
//
//  IDEMPOTENT BY CONSTRUCTION: the upsert is keyed on
//  (date, source, metric, dimension), so re-running a day overwrites it instead
//  of double-counting. This matters more than it looks. Every one of these APIs
//  restates recent days as late data lands (GSC in particular moves for ~3 days),
//  so a daily job MUST re-pull a trailing window, and a job that re-pulls with
//  append semantics silently inflates every number it touches.
//
//  BOUNDED BY CONSTRUCTION: dimension values are unbounded in the real world
//  (every URL, every search query), and an unbounded write path on a 1 vCPU /
//  1 GB box is precisely the shape of the $169 month. So a single ingest run is
//  capped, per source and per day, and what got dropped is REPORTED rather than
//  silently truncated: a cap that hides its own effect reads as full coverage.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');
const contract = require('./traffic-contract');

// Per (source, date, metric) ceiling on how many dimension rows are kept. The
// top N by value is what a human ever looks at; the tail is noise that costs
// storage forever. 200 pages or queries a day is already far more than anyone
// reads, and at 400-day retention it bounds the table at a knowable size.
const MAX_DIMENSION_ROWS = 200;

// A whole run is capped too, so a misbehaving ingestor cannot write unbounded
// rows even if it ignores the per-metric cap.
const MAX_ROWS_PER_RUN = 5000;

// PREPARED LAZILY, NOT AT MODULE SCOPE. metrics_daily is created by the command
// center migration, and that migration is explicitly allowed to fail without
// stopping the process booting. A module-scope db.prepare() against a table that
// does not exist throws during require(), which takes the whole API down at
// import time and defeats that guarantee. Preparing on first use keeps the
// statement cached for the life of the process (which is what the performance
// rule is actually asking for) while letting a database without the table simply
// fail this one call.
let _stUpsert = null;
function stUpsert() {
  if (!_stUpsert) {
    _stUpsert = db.prepare(`
      INSERT INTO metrics_daily (date, source, metric, value, dimension, captured_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(date, source, metric, dimension)
      DO UPDATE SET value = excluded.value, captured_at = excluded.captured_at
    `);
  }
  return _stUpsert;
}

// Keep only the top N dimension rows per (date, metric), plus every site total.
// Site totals ('' dimension) are never dropped: they are the series every chart
// is built from, and they are one row per metric per day.
function capDimensions(rows) {
  const groups = new Map();
  const kept = [];
  let dropped = 0;

  for (const row of rows) {
    if (!row.dimension) { kept.push(row); continue; }
    const key = row.date + '|' + row.source + '|' + row.metric;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  for (const group of groups.values()) {
    if (group.length <= MAX_DIMENSION_ROWS) { kept.push(...group); continue; }
    // 'position' is a rank: smaller is better, so the interesting rows are the
    // lowest values, not the highest. Sorting the wrong way here would keep the
    // 200 worst-ranking queries and throw away everything that actually ranks.
    const asc = group[0].metric === 'position';
    group.sort((a, b) => (asc ? a.value - b.value : b.value - a.value));
    kept.push(...group.slice(0, MAX_DIMENSION_ROWS));
    dropped += group.length - MAX_DIMENSION_ROWS;
  }

  return { kept, dropped };
}

// Take raw readings from any ingestor, normalise, cap, and write in one
// transaction. Returns a report: what was written, what was rejected and why,
// and what the caps removed. A caller that wants to know whether a source is
// actually delivering can read this without guessing.
function ingest(readings, options = {}) {
  const list = Array.isArray(readings) ? readings : [];
  const rejected = [];
  const normalized = [];

  for (const reading of list) {
    const result = contract.normalize(reading);
    if (result.ok) normalized.push(result.row);
    else rejected.push({ reading, reason: result.reason });
  }

  const { kept, dropped } = capDimensions(normalized);

  let rows = kept;
  let runCapped = 0;
  if (rows.length > MAX_ROWS_PER_RUN) {
    runCapped = rows.length - MAX_ROWS_PER_RUN;
    rows = rows.slice(0, MAX_ROWS_PER_RUN);
  }

  if (!options.dryRun && rows.length) {
    db.transaction(() => {
      const st = stUpsert();
      for (const r of rows) st.run(r.date, r.source, r.metric, r.value, r.dimension);
    })();
  }

  const sources = [...new Set(rows.map((r) => r.source))];
  const dates = [...new Set(rows.map((r) => r.date))].sort();

  return {
    ok: rejected.length === 0,
    received: list.length,
    written: options.dryRun ? 0 : rows.length,
    would_write: rows.length,
    rejected: rejected.length,
    rejections: rejected.slice(0, 25),   // bounded: a broken source rejects everything
    dimension_rows_dropped: dropped,
    run_capped: runCapped,
    sources,
    date_range: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
    dry_run: Boolean(options.dryRun),
  };
}

// Which days a source already has data for, so a daily job can pull only what is
// missing plus the restatement window rather than refetching all of history.
function coverage(source, days = 30) {
  const rows = db.prepare(`
    SELECT date, COUNT(*) AS rows, COUNT(DISTINCT metric) AS metrics
      FROM metrics_daily
     WHERE source = ? AND date >= date('now', ?)
     GROUP BY date ORDER BY date DESC
  `).all(String(source), `-${Number(days) || 30} days`);
  return rows;
}

// Gaps in the last N days for a source: the days with no rows at all. A silent
// ingestor produces no error anywhere, so this is what makes its absence visible
// (the same reasoning as the pipeline health module).
function gaps(source, days = 30) {
  const have = new Set(coverage(source, days).map((r) => r.date));
  const out = [];
  const today = new Date();
  for (let i = 1; i <= (Number(days) || 30); i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    if (!have.has(iso)) out.push(iso);
  }
  return out;
}

module.exports = { ingest, coverage, gaps, MAX_DIMENSION_ROWS, MAX_ROWS_PER_RUN };
