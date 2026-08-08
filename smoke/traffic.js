'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: traffic analytics (GA4 / GSC / Clarity / Raptive).
//
//  The fixture is built to be WRONG in the specific ways this pipeline can be
//  wrong, because a suite that only feeds clean data proves nothing about the
//  guards. It contains identifier-shaped dimensions, a zero rank, a partial
//  today, missing days, and a metric where down is good.
//
//  Run: npm run smoke:traffic
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-traffic.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const contract = require('../lib/traffic-contract');
const ingestLib = require('../lib/traffic-ingest');
const analysis = require('../lib/traffic-analysis');
const csv = require('../lib/traffic-csv');
const google = require('../lib/traffic-google');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
};
const section = (t) => console.log('\n' + t);
const iso = (daysAgo) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

// ── Contract: what must be refused ───────────────────────────────────────────
section('Contract rejects what must never be stored');
const bad = [
  ['identifier-like dimension', { date: iso(1), source: 'ga4', metric: 'pageviews', value: 1,
    dimension_namespace: 'page', dimension_value: 'user@example.com' }],
  ['uuid dimension', { date: iso(1), source: 'ga4', metric: 'pageviews', value: 1,
    dimension_namespace: 'page', dimension_value: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' }],
  ['GA client id', { date: iso(1), source: 'ga4', metric: 'users', value: 1,
    dimension_namespace: 'page', dimension_value: '1234567890.1234567890' }],
  ['zero position', { date: iso(1), source: 'gsc', metric: 'position', value: 0 }],
  ['unknown source', { date: iso(1), source: 'facebook', metric: 'pageviews', value: 1 }],
  ['unknown metric', { date: iso(1), source: 'ga4', metric: 'vibes', value: 1 }],
  ['bad date', { date: '07/08/2026', source: 'ga4', metric: 'pageviews', value: 1 }],
  ['non-numeric value', { date: iso(1), source: 'ga4', metric: 'pageviews', value: 'lots' }],
];
for (const [label, reading] of bad) {
  ok('rejects ' + label, contract.normalize(reading).ok === false, contract.normalize(reading));
}
ok('accepts a well-formed reading', contract.normalize({ date: iso(1), source: 'ga4', metric: 'pageviews', value: 10 }).ok === true);

section('Contract normalises dimensions');
ok('a full URL becomes a path', contract.normalizeDimension('page', 'https://apcsexamprep.com/ap-csa/1-2') === 'page:/ap-csa/1-2');
ok('a query string is dropped', contract.normalizeDimension('page', '/ap-csa/1-2?utm_source=x') === 'page:/ap-csa/1-2');
ok('queries are lowercased', contract.normalizeDimension('query', 'AP CSA Unit 1') === 'query:ap csa unit 1');
ok('a long value is truncated', contract.normalizeDimension('page', '/' + 'x'.repeat(400)).length <= contract.MAX_DIMENSION_LENGTH + 6);
ok('ratios normalise to 0-1 from either convention',
  contract.asRatio(45) === 0.45 && contract.asRatio(0.45) === 0.45);

// ── Fixture ──────────────────────────────────────────────────────────────────
//  60 clean days of rising pageviews, an improving rank, and a deliberate gap.
const readings = [];
for (let i = 60; i >= 1; i--) {
  const date = iso(i);
  if (i !== 30) {                       // day 30 is deliberately missing
    readings.push({ date, source: 'ga4', metric: 'pageviews', value: 1000 + (60 - i) * 10 });
  }
  readings.push({ date, source: 'gsc', metric: 'position', value: 20 - (60 - i) * 0.1,
    dimension_namespace: 'query', dimension_value: 'ap csa unit 1' });
  readings.push({ date, source: 'gsc', metric: 'clicks', value: 40 + (60 - i),
    dimension_namespace: 'query', dimension_value: 'ap csa unit 1' });
  readings.push({ date, source: 'ga4', metric: 'pageviews', value: 300 + (60 - i) * 5,
    dimension_namespace: 'page', dimension_value: '/ap-csa/1-2' });
  readings.push({ date, source: 'ga4', metric: 'pageviews', value: 400 - (60 - i) * 4,
    dimension_namespace: 'page', dimension_value: '/ap-csp/big-idea-1' });
}
// A partial TODAY, which must never appear in a window or drag a projection down.
readings.push({ date: iso(0), source: 'ga4', metric: 'pageviews', value: 12 });

const report = ingestLib.ingest(readings);

section('Ingest');
ok('writes the good rows', report.written > 0, report.written);
ok('reports zero rejections on a clean fixture', report.rejected === 0, report.rejections);
ok('is idempotent: re-ingesting writes the same rows, not duplicates', (() => {
  const before = analysis.series('pageviews', { source: 'ga4', days: 60 }).map((p) => p.value).join(',');
  ingestLib.ingest(readings);
  const after = analysis.series('pageviews', { source: 'ga4', days: 60 }).map((p) => p.value).join(',');
  return before === after;
})());

section('Ingest caps are enforced and reported');
const flood = [];
for (let i = 0; i < ingestLib.MAX_DIMENSION_ROWS + 50; i++) {
  flood.push({ date: iso(2), source: 'ga4', metric: 'sessions', value: 1000 - i,
    dimension_namespace: 'page', dimension_value: '/flood/' + i });
}
const floodReport = ingestLib.ingest(flood);
ok('caps dimension rows per metric per day', floodReport.would_write === ingestLib.MAX_DIMENSION_ROWS, floodReport.would_write);
ok('reports what the cap dropped rather than truncating silently', floodReport.dimension_rows_dropped === 50, floodReport.dimension_rows_dropped);
ok('keeps the HIGHEST values for a count metric', (() => {
  const rows = require('../db').prepare(
    `SELECT MIN(value) AS lo FROM metrics_daily WHERE date = ? AND metric = 'sessions' AND dimension LIKE 'page:/flood/%'`
  ).get(iso(2));
  return rows.lo === 1000 - (ingestLib.MAX_DIMENSION_ROWS - 1);
})());

// For a rank, the interesting rows are the LOWEST. Sorting the wrong way would
// keep the 200 worst-ranking queries and discard everything that ranks.
const rankFlood = [];
for (let i = 0; i < ingestLib.MAX_DIMENSION_ROWS + 20; i++) {
  rankFlood.push({ date: iso(3), source: 'gsc', metric: 'position', value: 1 + i,
    dimension_namespace: 'query', dimension_value: 'q' + i });
}
ingestLib.ingest(rankFlood);
ok('keeps the BEST ranks, not the worst', (() => {
  const r = require('../db').prepare(
    `SELECT MIN(value) AS best, MAX(value) AS worst FROM metrics_daily
      WHERE date = ? AND metric = 'position' AND dimension LIKE 'query:q%'`
  ).get(iso(3));
  return r.best === 1 && r.worst === ingestLib.MAX_DIMENSION_ROWS;
})());

// ── Analysis ─────────────────────────────────────────────────────────────────
section('Series excludes the partial day and preserves gaps');
const s = analysis.series('pageviews', { source: 'ga4', days: 60 });
ok('the window ends yesterday, not today', s[s.length - 1].date === iso(1), s[s.length - 1]);
ok('today is absent from the window', s.every((p) => p.date !== iso(0)));
ok('a missing day is null, not zero', (() => {
  const gap = s.find((p) => p.date === iso(30));
  return gap && gap.value === null;
})(), s.find((p) => p.date === iso(30)));

section('Compare');
const cmp = analysis.compare('pageviews', { source: 'ga4', days: 28 });
ok('reports growth on a rising series', cmp.delta > 0 && cmp.improving === true, cmp);
ok('reports coverage on both windows', cmp.current_days > 0 && cmp.previous_days > 0, cmp);
const gappy = analysis.compare('pageviews', { source: 'ga4', days: 60 });
ok('flags a window with a missing day as incomplete', gappy.complete === false, gappy);

section('Projection');
const proj = analysis.project('pageviews', { source: 'ga4', days: 60, horizon: 30 });
ok('recovers the synthetic slope of +10/day', Math.abs(proj.slope_per_day - 10) < 0.5, proj.slope_per_day);
ok('reports a strong fit on a clean line', proj.fit_quality === 'strong' && proj.r2 > 0.99, { r2: proj.r2 });
ok('projects the requested horizon', proj.projection.length === 30, proj.projection.length);
ok('the partial day did not drag the projection down', proj.end_value > cmp.current / 28, proj.end_value);
ok('declines to project without enough history', (() => {
  ingestLib.ingest([{ date: iso(1), source: 'clarity', metric: 'rage_clicks', value: 3 }]);
  const p = analysis.project('rage_clicks', { source: 'clarity', days: 60 });
  return p.projection === null && /at least/.test(p.reason);
})());

section('Direction: a rank improves by going DOWN');
ok('position is lower-is-better', analysis.LOWER_IS_BETTER.has('position'));
ok('a falling position counts as an improvement', analysis.isImprovement('position', -2) === true);
ok('a rising position counts as a regression', analysis.isImprovement('position', 2) === false);
ok('a rising pageview count counts as an improvement', analysis.isImprovement('pageviews', 100) === true);

section('Rankings');
const rk = analysis.rankings({ days: 28 });
ok('tracks the fixture query', rk.tracked >= 1, rk.tracked);
const q = rk.top.find((r) => r.query === 'ap csa unit 1');
ok('reports the query position', q && q.position > 0, q);
ok('a query that moved up has a negative delta', q && q.delta < 0, q && q.delta);
ok('and is marked improving', q && q.improving === true, q && q.improving);
ok('attaches clicks to the ranking row', q && q.clicks > 0, q && q.clicks);
// Gains and drops are filtered by direction, not merely sorted by it: sorting
// alone lists the same query in both whenever there are fewer queries than the
// slice size, which reads as "it gained and it dropped".
ok('every biggest_gain actually improved', rk.biggest_gains.every((r) => r.delta < 0), rk.biggest_gains.map((r) => r.delta));
ok('every biggest_drop actually regressed', rk.biggest_drops.every((r) => r.delta > 0), rk.biggest_drops.map((r) => r.delta));
ok('no query appears in both gains and drops', (() => {
  const g = new Set(rk.biggest_gains.map((r) => r.query));
  return rk.biggest_drops.every((r) => !g.has(r.query));
})());

section('Movers');
const mv = analysis.movers('pageviews', { source: 'ga4', namespace: 'page', days: 28, minBase: 10 });
ok('finds the rising page as a winner', mv.winners.some((w) => w.value === '/ap-csa/1-2'), mv.winners.map((w) => w.value));
ok('finds the falling page as a loser', mv.losers.some((w) => w.value === '/ap-csp/big-idea-1'), mv.losers.map((w) => w.value));
ok('excludes pages below the minimum base', analysis.movers('pageviews', { source: 'ga4', days: 28, minBase: 1e9 }).considered === 0);

section('Inventory');
const inv = analysis.inventory();
ok('lists the traffic sources', inv.some((r) => r.source === 'ga4') && inv.some((r) => r.source === 'gsc'));
ok('marks traffic sources as such', inv.find((r) => r.source === 'ga4').traffic_source === true);
ok('a current source is not stale', inv.find((r) => r.source === 'ga4').stale === false, inv.find((r) => r.source === 'ga4'));
ok('a stopped source IS reported stale', (() => {
  ingestLib.ingest([{ date: iso(20), source: 'raptive', metric: 'revenue', value: 12.5 }]);
  const r = analysis.inventory().find((x) => x.source === 'raptive');
  return r && r.stale === true && r.days_behind >= 20;
})());

// ── CSV ──────────────────────────────────────────────────────────────────────
section('CSV import');
const raptive = 'Date,Revenue,Page RPM,Ad Impressions\n2026-08-01,"$1,234.56",$12.30,45000\n2026-08-02,"$987.65",$11.10,41000\n';
const parsed = csv.parseExport(raptive, { source: 'raptive' });
ok('parses a Raptive-shaped export', parsed.ok === true, parsed.reason);
ok('maps revenue, rpm and ad impressions', ['revenue', 'rpm', 'ad_impressions'].every((m) => parsed.mapped_metrics.includes(m)), parsed.mapped_metrics);
ok('strips currency formatting', parsed.readings.some((r) => r.metric === 'revenue' && r.value === 1234.56), parsed.readings.slice(0, 3));
ok('the parsed readings survive the contract', ingestLib.ingest(parsed.readings, { dryRun: true }).rejected === 0);

const quoted = 'Date,Page,Pageviews\n2026-08-01,"/a/b, with comma",100\n';
ok('handles quoted fields containing commas', (() => {
  const p = csv.parseExport(quoted, { source: 'clarity' });
  return p.ok && p.readings[0].dimension_value === '/a/b, with comma';
})());

ok('accepts US-format dates', csv.toIsoDate('8/1/2026') === '2026-08-01');
ok('reads percentages as ratios', csv.num('45%') === 0.45);

const noDate = 'Page,Dead Clicks\n/x,12\n';
ok('refuses a dateless export with no default date', csv.parseExport(noDate, { source: 'clarity' }).ok === false);
ok('accepts a dateless export when given a date', csv.parseExport(noDate, { source: 'clarity', defaultDate: '2026-08-01' }).ok === true);

ok('reports unmapped headers rather than dropping them silently', (() => {
  const p = csv.parseExport('Date,Pageviews,Wibble\n2026-08-01,10,3\n', { source: 'clarity' });
  return p.ok && p.unmapped_headers.includes('Wibble');
})());
ok('refuses an export with no recognised metric at all', csv.parseExport('Date,Wibble\n2026-08-01,3\n', { source: 'clarity' }).ok === false);
ok('refuses an unknown source', csv.parseExport(raptive, { source: 'tiktok' }).ok === false);

// ── Connectors ───────────────────────────────────────────────────────────────
section('Google connectors fail closed');
const st = google.status();
ok('reports not-configured without credentials', st.service_account === false && st.ready === false, st);
google.fetchGa4().then((r) => {
  ok('GA4 says not configured instead of reporting zero traffic', r.configured === false && r.readings.length === 0, r.reason);
  return google.fetchGsc();
}).then((r) => {
  ok('GSC says not configured instead of reporting zero traffic', r.configured === false && r.readings.length === 0, r.reason);
  finish();
}).catch((e) => {
  ok('connectors do not throw when unconfigured', false, e.message);
  finish();
});

function finish() {
  console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
}
