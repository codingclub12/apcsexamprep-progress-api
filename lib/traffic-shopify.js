'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SHOPIFY CONNECTOR — store sessions, orders and revenue, via ShopifyQL.
//
//  This is the source that closes the loop. GA4 and Search Console can both say
//  traffic went up; neither can say whether anything was bought. The dashboard
//  had no way to ask that question at all before this.
//
//  TRANSPORT: the Admin GraphQL API's shopifyqlQuery field. Verified against the
//  live store rather than written from the docs, because the response shape is
//  not what you would guess:
//
//      shopifyqlQuery(query: "...") {
//        parseErrors                       # LIST of strings, empty when fine
//        tableData {
//          rows                            # JSON scalar: array of OBJECTS
//          columns { name dataType displayName }
//        }
//      }
//
//  `rows` is an array of objects KEYED BY COLUMN NAME, e.g.
//      [{ day: '2026-08-10', orders: '4', total_sales: '996' }]
//  not the positional array most tabular APIs return. Every value is a STRING,
//  including the numbers.
//
//  THREE THINGS THE LIVE DATA DOES THAT WOULD CORRUPT metrics_daily:
//
//  1. average_order_value comes back as EMPTY STRING on a day with no orders,
//     not 0 and not null. Number('') is 0, so the obvious parse stores a $0
//     average order value on every quiet day and drags the mean toward zero.
//     Nothing attempted and a real zero are different facts; this is the
//     repo-wide rule, and it applies here. Empty means skip the reading.
//
//  2. A range that reaches past today comes back with trailing rows of ZEROS
//     rather than being absent. Storing those writes "we sold nothing" for days
//     that have not happened. The range is therefore clamped to yesterday.
//
//  3. order_referrer_source is EMPTY for most orders (27 of 30 on the live
//     store when this was written). An empty dimension is not a category, so it
//     is dropped rather than stored as a nameless bucket that looks like a real
//     traffic source.
//
//  DAY BOUNDARIES DO NOT MATCH THE OTHER SOURCES. Shopify reports in the SHOP's
//  timezone (America/Chicago for this store); GA4 reports in the property's
//  timezone; Search Console reports in UTC. A row dated 2026-08-12 therefore
//  covers slightly different hours depending on who reported it. This is
//  inherent to mixing vendors and is not worth "fixing" by shifting data: at
//  daily granularity over multi-day windows the effect is a fraction of one
//  day's edge. It IS worth knowing before someone explains a 3% gap between
//  GA4 sessions and Shopify sessions as a tracking bug.
// ─────────────────────────────────────────────────────────────────────────────

const contract = require('./traffic-contract');

const DEFAULT_API_VERSION = '2025-07';
const MAX_DAYS_PER_PULL = 90;
const MAX_ERROR_DETAIL = 1200;

function shop() { return (process.env.SHOPIFY_SHOP || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, ''); }
function token() { return (process.env.SHOPIFY_ADMIN_TOKEN || '').trim(); }
function apiVersion() { return (process.env.SHOPIFY_API_VERSION || DEFAULT_API_VERSION).trim(); }

function status() {
  const s = shop(), t = token();
  return {
    shop: s || null,
    api_version: apiVersion(),
    token: Boolean(t),
    ready: Boolean(s && t),
  };
}

const iso = (d) => d.toISOString().slice(0, 10);
function daysAgo(n) { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return iso(d); }
function addDays(ymd, n) { const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); }

// Inclusive day list, capped, so a long backfill is chunked rather than asked
// for in one request that would blow the ingest row budget anyway.
function daysBetween(start, end) {
  const out = [];
  for (let d = start; d <= end && out.length < MAX_DAYS_PER_PULL; d = addDays(d, 1)) out.push(d);
  return out;
}
function nextStart(days, end) {
  if (!days.length) return null;
  const after = addDays(days[days.length - 1], 1);
  return after > end ? null : after;
}

// A Shopify error is JSON with a message worth reading. Truncating it to a
// couple of hundred characters cut the actionable half off a Google error
// during setup, so the budget here is generous.
function errorDetail(text) {
  const s = String(text || '');
  return s.length > MAX_ERROR_DETAIL ? s.slice(0, MAX_ERROR_DETAIL) + '...' : s;
}

async function runQuery(ql) {
  const s = shop(), t = token();
  const url = `https://${s}/admin/api/${apiVersion()}/graphql.json`;
  const body = {
    query: 'query($q: String!) { shopifyqlQuery(query: $q) { parseErrors tableData { rows columns { name dataType } } } }',
    variables: { q: ql },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': t, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`shopify ${res.status}: ${errorDetail(text)}`);

  let json;
  try { json = JSON.parse(text); } catch (e) { throw new Error('shopify returned non-JSON: ' + errorDetail(text)); }

  // A GraphQL 200 can still be a total failure. Reporting it as "no data" is
  // the exact failure mode this whole feature exists to avoid.
  if (json.errors && json.errors.length) {
    throw new Error('shopify graphql: ' + errorDetail(JSON.stringify(json.errors)));
  }
  const r = json.data && json.data.shopifyqlQuery;
  if (!r) throw new Error('shopify: no shopifyqlQuery in reply: ' + errorDetail(text));
  if (r.parseErrors && r.parseErrors.length) {
    throw new Error('shopifyql rejected the query: ' + errorDetail(JSON.stringify(r.parseErrors)));
  }
  return (r.tableData && r.tableData.rows) || [];
}

// A ShopifyQL value is a string, and "" means the metric had no basis (an
// average with no orders under it). Returning null rather than 0 is the whole
// point: the caller drops the reading instead of storing a fake zero.
function num(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === '') return null;
  const n = Number(s.replace(/[$,]/g, ''));
  return Number.isFinite(n) ? n : null;
}

// TIMESERIES reports, each mapping one ShopifyQL column to one contract metric.
// Adding a metric is a line here, not a code change anywhere downstream.
const SERIES_REPORTS = [
  {
    from: 'sessions',
    columns: 'sessions, online_store_visitors, conversion_rate',
    // online_store_visitors is Shopify's word for unique people, which is what
    // every other source calls users. Same idea, so the same canonical name.
    map: { sessions: 'sessions', online_store_visitors: 'users', conversion_rate: 'conversion_rate' },
    ratio: { conversion_rate: true },
  },
  {
    from: 'sales',
    columns: 'orders, gross_sales, net_sales, total_sales, average_order_value',
    map: {
      orders: 'orders',
      gross_sales: 'gross_sales',
      net_sales: 'net_sales',
      total_sales: 'total_sales',
      average_order_value: 'average_order_value',
    },
  },
  {
    from: 'customers',
    columns: 'new_customers, returning_customers',
    map: { new_customers: 'new_customers', returning_customers: 'returning_customers' },
  },
];

async function fetchShopify({ startDate, endDate } = {}) {
  const s = shop(), t = token();
  if (!s || !t) {
    return {
      configured: false,
      reason: !s ? 'SHOPIFY_SHOP not set' : 'SHOPIFY_ADMIN_TOKEN not set',
      readings: [],
    };
  }

  // Never past yesterday. Shopify pads a range that reaches into the future
  // with zero rows, and a stored zero is indistinguishable downstream from a
  // day on which genuinely nothing sold.
  const hardEnd = daysAgo(1);
  const start = startDate || daysAgo(28);
  let end = endDate || hardEnd;
  if (end > hardEnd) end = hardEnd;

  const days = daysBetween(start, end);
  const covered = days.length ? { from: days[0], to: days[days.length - 1] } : null;
  const readings = [];
  const notes = [];

  if (!covered) {
    return { configured: true, readings, shop: s, days_covered: 0, covered: null, next_start_date: null, notes };
  }

  const failures = [];
  for (const report of SERIES_REPORTS) {
    const ql = `FROM ${report.from} SHOW ${report.columns} TIMESERIES day SINCE ${covered.from} UNTIL ${covered.to}`;
    let rows;
    try {
      rows = await runQuery(ql);
    } catch (e) {
      // One report failing must not discard the others. A Basic plan may not
      // expose every dataset, and "customers is unavailable" should not cost
      // us the sales numbers we already fetched.
      notes.push(`shopify ${report.from}: ${e.message}`);
      failures.push(e);
      continue;
    }

    for (const row of rows) {
      const date = String(row.day || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (date > hardEnd) continue;                 // belt and braces against padding
      for (const [column, metric] of Object.entries(report.map)) {
        let value = num(row[column]);
        if (value === null) continue;               // "" means no basis, not zero
        if (report.ratio && report.ratio[column]) value = contract.asRatio(value);
        readings.push({ date, source: 'shopify', metric, value });
      }
    }
  }

  // PARTIAL failure is a note; TOTAL failure is an error.
  //
  // Tolerating a single failed report is what lets a Basic-plan store keep its
  // sales numbers when `customers` is not available to it. But if every report
  // failed, the same tolerance turns a bad token or a missing scope into
  // `readings: []`, which is indistinguishable downstream from a store that
  // genuinely sold nothing. That is the precise failure this whole subsystem
  // exists to prevent, so the last one out throws.
  if (failures.length === SERIES_REPORTS.length) {
    throw new Error('shopify: every report failed; first was: ' + failures[0].message);
  }

  return {
    configured: true,
    readings,
    shop: s,
    days_covered: days.length,
    covered,
    next_start_date: nextStart(days, end),
    notes,
  };
}

module.exports = {
  status, fetchShopify, runQuery, num, daysBetween, nextStart,
  MAX_DAYS_PER_PULL, SERIES_REPORTS,
};
