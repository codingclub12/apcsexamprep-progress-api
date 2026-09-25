#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  RE-DERIVE which rate a stored value actually IS, from arithmetic rather than
//  from its column heading, and require the two to agree. Board 376.
//
//  WHY THIS IS A DIFFERENT KIND OF CHECK
//  smoke/traffic.js asks the parser what it did and compares against what it
//  should have done. Both sides of that comparison read the same header. If the
//  header is the thing being misread, a suite built on it can agree with the bug.
//
//  So this script never looks at a heading. For every rate a parse stored, it
//  recomputes all three candidate rates from the RAW revenue and denominator
//  columns in the same row, and asks which one the stored number matches:
//
//      revenue / pageviews       x 1000  ->  must be the metric named rpm
//      revenue / sessions        x 1000  ->  must be the metric named session_rpm
//      revenue / ad_impressions  x 1000  ->  must be the metric named impression_rpm
//
//  A value stored under a metric whose arithmetic it does not satisfy is the
//  defect, whatever the column was called. That is the whole of board 376 stated
//  as an identity rather than as a mapping.
//
//  AND IT PERMUTES THE COLUMN ORDER. The original defect was that mapHeaders
//  keeps the first match, so which rate column won depended on its position in
//  the file. A fixture with one hand-written column order cannot see that; every
//  ordering of the rate columns is generated and checked.
//
//  Offline and secret-free. No database, no network. Pure ASCII, no em-dashes.
//
//  Run: npm run smoke:raterederive
// -----------------------------------------------------------------------------
const path = require('path');
const csv = require(path.join(__dirname, '..', 'lib', 'traffic-csv'));
const contract = require(path.join(__dirname, '..', 'lib', 'traffic-contract'));

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '\n           ' + JSON.stringify(x).slice(0, 500) : '')); }
};

//  One day of real numbers, taken from the Raptive export for 2026-08-14 so the
//  three rates are far apart and a swap cannot pass by rounding.
const DAY = { date: '2026-08-14', revenue: 14.43, pageviews: 1823, sessions: 698, impressions: 12025 };
const r2 = (v) => Math.round(v * 100) / 100;
const TRUTH = {
  rpm: r2((DAY.revenue / DAY.pageviews) * 1000),        // 7.92
  session_rpm: r2((DAY.revenue / DAY.sessions) * 1000), // 20.67
  impression_rpm: r2((DAY.revenue / DAY.impressions) * 1000),
};

console.log('\n  The three rates for 2026-08-14, computed from the raw columns:');
for (const [m, v] of Object.entries(TRUTH)) console.log('    ' + m.padEnd(16) + '$' + v.toFixed(2));
ok('the three are far enough apart that a swap cannot pass by rounding',
  new Set(Object.values(TRUTH)).size === 3 && Math.min(...Object.values(TRUTH).map((a) => Math.abs(a - TRUTH.rpm)).filter((d) => d > 0)) > 1,
  TRUTH);

//  Every ordering of the rate columns. The non-rate columns stay put; only the
//  rates move, because their order is what the old mapping was sensitive to.
function permutations(a) {
  if (a.length <= 1) return [a];
  const out = [];
  a.forEach((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).forEach((p) => out.push([x, ...p])));
  return out;
}
const RATE_COLS = [
  { header: 'Page RPM', value: TRUTH.rpm },
  { header: 'Session RPM', value: TRUTH.session_rpm },
  { header: 'eCPM', value: TRUTH.impression_rpm },
];
const BASE = [
  { header: 'Date', value: DAY.date },
  { header: 'Earnings', value: DAY.revenue },
  { header: 'Pageviews', value: DAY.pageviews },
  { header: 'Sessions', value: DAY.sessions },
  { header: 'Ad Impressions', value: DAY.impressions },
];

//  Which metric does this stored number satisfy the arithmetic of? Computed from
//  the raw columns, never from the heading.
function whichRateIs(value) {
  const hits = Object.entries(TRUTH).filter(([, v]) => Math.abs(v - value) < 0.005).map(([m]) => m);
  return hits.length === 1 ? hits[0] : null;
}

const orders = permutations(RATE_COLS);
let mismatches = [];
for (const order of orders) {
  const cols = [...BASE, ...order];
  const text = cols.map((c) => c.header).join(',') + '\n' + cols.map((c) => c.value).join(',') + '\n';
  const p = csv.parseExport(text, { source: 'raptive' });
  if (!p.ok) { mismatches.push({ order: order.map((c) => c.header), error: p.reason }); continue; }
  for (const r of p.readings) {
    if (!['rpm', 'session_rpm', 'impression_rpm'].includes(r.metric)) continue;
    const isReally = whichRateIs(r.value);
    if (isReally !== r.metric) {
      mismatches.push({ order: order.map((c) => c.header), stored_as: r.metric, value: r.value, actually: isReally });
    }
  }
}
ok(`all ${orders.length} orderings of the three rate columns store each value under the metric its arithmetic satisfies`,
  mismatches.length === 0, mismatches.slice(0, 4));

//  THE ORIGINAL DEFECT, stated as an identity. Raptive's bare 'RPM' column holds
//  the SESSION rate. If that number reaches the rpm metric, then a value which is
//  revenue-over-sessions is being stored as revenue-over-pageviews.
const bothOrders = [
  ['Page RPM', 'RPM'],
  ['RPM', 'Page RPM'],
];
let leaked = [];
for (const [a, b] of bothOrders) {
  const vals = { 'Page RPM': TRUTH.rpm, RPM: TRUTH.session_rpm };
  const text = `Date,Earnings,Pageviews,Sessions,${a},${b}\n`
    + `${DAY.date},${DAY.revenue},${DAY.pageviews},${DAY.sessions},${vals[a]},${vals[b]}\n`;
  const p = csv.parseExport(text, { source: 'raptive' });
  const stored = p.readings.find((r) => r.metric === 'rpm');
  if (stored && whichRateIs(stored.value) !== 'rpm') {
    leaked.push({ order: [a, b], stored_in_rpm: stored.value, actually: whichRateIs(stored.value) });
  }
}
ok('a bare RPM column never puts the session rate into the page metric, in either column order',
  leaked.length === 0, leaked);

//  The bare column's VALUE must not appear anywhere at all, under any metric.
const realExport = 'Start Date,End Date,Date,Earnings,Pageviews,Sessions,Page RPM,RPM\n'
  + `${DAY.date},${DAY.date},${DAY.date},${DAY.revenue},${DAY.pageviews},${DAY.sessions},${TRUTH.rpm},${TRUTH.session_rpm}\n`;
const realParsed = csv.parseExport(realExport, { source: 'raptive' });
ok('the refused value is stored under no metric whatsoever',
  !realParsed.readings.some((r) => Math.abs(r.value - TRUTH.session_rpm) < 0.005),
  realParsed.readings.filter((r) => Math.abs(r.value - TRUTH.session_rpm) < 0.005));

//  Every metric the parser can emit for a rate must exist in the contract, or the
//  reading is dropped at ingest and the import silently loses a column.
const emitted = new Set();
for (const order of orders) {
  const cols = [...BASE, ...order];
  const text = cols.map((c) => c.header).join(',') + '\n' + cols.map((c) => c.value).join(',') + '\n';
  for (const r of csv.parseExport(text, { source: 'raptive' }).readings) emitted.add(r.metric);
}
const unknown = [...emitted].filter((m) => !contract.METRICS[m]);
ok('every metric the importer emits is defined in the contract', unknown.length === 0, unknown);
ok('and all three rates were actually exercised, so this is not vacuous',
  ['rpm', 'session_rpm', 'impression_rpm'].every((m) => emitted.has(m)), [...emitted]);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
