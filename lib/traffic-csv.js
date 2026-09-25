'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CSV IMPORT — Raptive and Clarity, the two sources with no unattended API path.
//
//  Raptive has no public reporting API. Clarity has a Data Export API, but it is
//  not reachable from every environment and it is token-scoped per project. Both
//  export CSV from their dashboards, so rather than leave two of the four sources
//  permanently empty, this parses those exports into the SAME contract shape the
//  Google connectors produce. Downstream, an imported day and a fetched day are
//  indistinguishable, which is the point: the charts do not care how a number
//  arrived, and nothing branches on it.
//
//  COLUMN MATCHING IS FUZZY ON PURPOSE. These vendors rename their export headers
//  without warning and without a version marker. A parser pinned to exact headers
//  breaks silently on the next export and produces an empty import that looks like
//  a quiet month. So headers are matched on normalised substrings, and any column
//  that could not be mapped is REPORTED back rather than skipped in silence.
//
//  It parses; it does not write. The caller passes the readings to traffic-ingest,
//  so the same caps, the same validation, and the same upsert apply to a pasted
//  CSV as to an API pull. An import path that bypassed those would be the one way
//  to get unbounded junk into the table.
// ─────────────────────────────────────────────────────────────────────────────
const contract = require('./traffic-contract');

// Minimal RFC4180-ish parser: quoted fields, escaped quotes, embedded commas and
// newlines. Vendor exports contain page titles with commas in them, so splitting
// on ',' loses columns on exactly the rows that matter.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const s = String(text || '').replace(/^﻿/, ''); // strip BOM

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Header synonyms per canonical metric. Ordered: the first match wins, so more
// specific names are listed before generic ones ('adimpressions' before
// 'impressions', or an ad report would fill the search metric).
const HEADER_MAP = [
  ['date', ['date', 'day', 'reportdate']],
  ['ad_impressions', ['adimpressions', 'impressionsads', 'paidimpressions']],
  ['revenue', ['revenue', 'earnings', 'estimatedrevenue', 'netrevenue', 'grossrevenue']],
  //  RATE HEADERS, SPLIT BY DENOMINATOR. Each of these is money per 1000 of a
  //  DIFFERENT thing, and they are not interchangeable: on Raptive's own export
  //  for 2026-08-14 to 09-12 the page rate averaged $7.20 and the session rate
  //  $21.42, a factor of 2.97. A bare `rpm` is deliberately absent from all
  //  three and is refused below instead.
  ['rpm', ['pagerpm', 'pageviewrpm', 'rpmpage', 'pagecpm']],
  ['session_rpm', ['sessionrpm', 'rpmsession', 'visitrpm', 'sessioncpm']],
  ['impression_rpm', ['ecpm', 'impressionrpm', 'adrpm']],
  ['pageviews', ['pageviews', 'views', 'pageview', 'screenpageviews']],
  ['sessions', ['sessions', 'visits']],
  ['users', ['users', 'totalusers', 'uniquevisitors', 'visitors']],
  ['dead_clicks', ['deadclicks', 'deadclick']],
  ['rage_clicks', ['rageclicks', 'rageclick']],
  ['quickbacks', ['quickbacks', 'quickback', 'quickbackclicks']],
  ['scroll_depth', ['scrolldepth', 'averagescrolldepth', 'avgscrolldepth']],
  ['bounce_rate', ['bouncerate']],
  ['engagement_rate', ['engagementrate']],
  ['impressions', ['impressions']],
  ['clicks', ['clicks']],
  ['ctr', ['ctr', 'clickthroughrate']],
  ['position', ['position', 'averageposition', 'avgposition']],
];

//  HEADERS THAT ARE RECOGNISED AND STILL REFUSED.
//
//  A column whose meaning cannot be settled from its name is not mapped to a
//  best guess. It is reported with both readings so a person can rename it and
//  re-import, which costs one round trip; guessing costs a wrong number that
//  looks right.
//
//  `rpm` earns its place here by measurement rather than by principle. Raptive
//  exports `Page RPM` and `RPM` side by side, and the bare one is the SESSION
//  rate: earnings over sessions, 2.97x the page rate on the 2026-09-19 data.
//  Until that was measured this synonym sat in the `rpm` list, so which column
//  won was decided by whichever appeared first in the file. Board 376.
const AMBIGUOUS = {
  rpm: 'a bare "RPM" column does not say what it is per 1000 OF. Raptive exports '
    + '"Page RPM" (per 1000 pageviews) and "RPM" (per 1000 sessions) side by side and '
    + 'they differ by pages-per-session, measured at 2.97x. Rename the column to '
    + '"Page RPM", "Session RPM" or "eCPM" and import again.',
  cpm: 'a bare "CPM" column does not say what it is per 1000 OF. Rename it to '
    + '"Page RPM", "Session RPM" or "eCPM" and import again.',
};

const DIMENSION_HEADERS = [
  ['page', ['page', 'url', 'pagepath', 'landingpage', 'pageurl', 'path']],
  ['query', ['query', 'keyword', 'searchterm', 'searchquery']],
  ['country', ['country', 'countryname']],
  ['device', ['device', 'devicecategory', 'devicetype']],
];

function mapHeaders(header) {
  const cells = header.map(norm);
  const metrics = {};
  const dims = {};
  const unmapped = [];
  const ambiguous = [];

  cells.forEach((cell, i) => {
    if (!cell) return;
    //  AMBIGUOUS IS CHECKED FIRST, so adding a synonym to HEADER_MAP by mistake
    //  cannot quietly re-enable a guess this refuses.
    if (AMBIGUOUS[cell]) { ambiguous.push({ header: header[i], reason: AMBIGUOUS[cell] }); return; }
    const metric = HEADER_MAP.find(([, syn]) => syn.includes(cell));
    if (metric) { if (!(metric[0] in metrics)) metrics[metric[0]] = i; return; }
    const dim = DIMENSION_HEADERS.find(([, syn]) => syn.includes(cell));
    if (dim) { if (!(dim[0] in dims)) dims[dim[0]] = i; return; }
    unmapped.push(header[i]);
  });

  return { metrics, dims, unmapped, ambiguous };
}

// Vendor exports write money as "$1,234.56" and rates as "12.3%".
function num(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/[$,]/g, '');
  if (!s) return null;
  const pct = s.endsWith('%');
  const n = Number(pct ? s.slice(0, -1) : s);
  if (!Number.isFinite(n)) return null;
  return pct ? n / 100 : n;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toIsoDate(raw) {
  const s = String(raw || '').trim();
  if (DATE_RE.test(s)) return s;
  // Accept the common US export format rather than rejecting the whole file.
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
  const parsed = Date.parse(s);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  return null;
}

// Parse a CSV export into contract readings.
//   source: 'raptive' | 'clarity' (or any contract source)
//   defaultDate: used when the export has no date column, which several
//                dashboard exports do not (they export "the selected range").
function parseExport(text, { source, defaultDate = null } = {}) {
  if (!contract.SOURCES.includes(source)) {
    return { ok: false, reason: `unknown source: ${source}`, readings: [] };
  }
  const rows = parseCsv(text);
  if (rows.length < 2) return { ok: false, reason: 'csv has no data rows', readings: [] };

  const header = rows[0];
  const { metrics, dims, unmapped, ambiguous } = mapHeaders(header);
  const metricNames = Object.keys(metrics).filter((m) => m !== 'date');

  if (!metricNames.length) {
    return {
      ok: false,
      reason: ambiguous.length
        ? 'no usable metric columns: the only rate column is ambiguous'
        : 'no recognised metric columns',
      headers_seen: header,
      unmapped,
      ambiguous_headers: ambiguous,
      readings: [],
    };
  }
  if (metrics.date === undefined && !defaultDate) {
    return { ok: false, reason: 'no date column and no defaultDate supplied', headers_seen: header, readings: [] };
  }

  const readings = [];
  const skipped = [];
  // A dimension column present in the file is used; a file with several is
  // ambiguous, so the first recognised one wins and the rest are reported.
  const dimName = Object.keys(dims)[0] || null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const date = metrics.date !== undefined ? toIsoDate(row[metrics.date]) : defaultDate;
    if (!date) { skipped.push({ line: i + 1, reason: 'unparseable date' }); continue; }

    const dimValue = dimName ? row[dims[dimName]] : null;

    for (const metric of metricNames) {
      const value = num(row[metrics[metric]]);
      if (value == null) continue;
      readings.push({
        date, source, metric, value,
        ...(dimName && dimValue ? { dimension_namespace: dimName, dimension_value: dimValue } : {}),
      });
    }
  }

  return {
    ok: true,
    readings,
    source,
    rows: rows.length - 1,
    mapped_metrics: metricNames,
    mapped_dimension: dimName,
    // Reported, never silent: an export whose columns changed should be visible
    // as an unmapped header, not as a quiet drop in coverage.
    unmapped_headers: unmapped,
    //  Refused rather than guessed. A caller that ignores this gets no rate
    //  stored and a model that reports null, which is the safe direction.
    ambiguous_headers: ambiguous,
    extra_dimensions: Object.keys(dims).slice(1),
    skipped_rows: skipped.slice(0, 25),
    skipped_count: skipped.length,
  };
}

module.exports = { parseExport, parseCsv, mapHeaders, toIsoDate, num };
