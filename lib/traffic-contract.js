'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  TRAFFIC CONTRACT — the ONLY place a traffic source's shape is interpreted.
//
//  GA4, Search Console, Clarity and Raptive each describe the same website in a
//  different vocabulary: GA4 says "screenPageViews", GSC says "impressions",
//  Raptive says "pageRPM". If every reader had to know which source it was
//  looking at, the dashboard would branch on source in a dozen places and the
//  numbers would drift apart the first time one of them changed a field name.
//
//  So this module normalises all of them into ONE row shape, the one that
//  metrics_daily already stores:
//
//      { date, source, metric, value, dimension }
//
//  Everything downstream reads that shape and never asks where it came from.
//  A view that branches on source is a bug in this normaliser, not in the view.
//  (Same rule the gradebook contract follows, for the same reason.)
//
//  WHY metrics_daily AND NOT A NEW TABLE: it already exists, its comment already
//  names gsc / ga4 / raptive as expected sources, it already enforces 400-day
//  retention, and it already carries the "daily aggregates ONLY, never raw
//  events" rule that exists because an unbounded metrics table on a 1 vCPU /
//  1 GB box is how the $169 month happened. Raw pageview rows would reproduce
//  exactly that. One row per (date, source, metric, dimension) cannot.
//
//  DIMENSION IS A STRING, NOT A JOIN. '' means "site total". Anything else is
//  the breakdown key: a page path, a query, a country, a device. Keeping it flat
//  is what lets one table serve every source without a schema change per source.
//
//  PII: none of these sources may contribute user-level data. GA4 and Clarity
//  can both expose per-user identifiers if asked; the ingestors here request
//  aggregates only, and this normaliser drops any row whose dimension looks like
//  an identifier rather than a category. Zero PII is a repo-wide rule and the
//  traffic side does not get an exception.
// ─────────────────────────────────────────────────────────────────────────────

// The sources this contract understands. metrics_daily already reserves the
// first three by name; 'clarity' joins them. 'gradebook' and 'pipeline' are the
// pre-existing internal sources and are deliberately NOT traffic sources.
const SOURCES = ['ga4', 'gsc', 'clarity', 'raptive'];

// Canonical metric names. Every source maps into this vocabulary, so a chart
// asks for 'pageviews' and gets the same idea whichever source supplied it.
//
// Kept deliberately small. A metric earns a place here by being something a
// decision is made on, not by existing in some vendor's export.
const METRICS = {
  // Audience
  pageviews: { unit: 'count', agg: 'sum', label: 'Pageviews' },
  sessions: { unit: 'count', agg: 'sum', label: 'Sessions' },
  users: { unit: 'count', agg: 'sum', label: 'Users' },
  new_users: { unit: 'count', agg: 'sum', label: 'New users' },
  engaged_sessions: { unit: 'count', agg: 'sum', label: 'Engaged sessions' },
  engagement_rate: { unit: 'ratio', agg: 'avg', label: 'Engagement rate' },
  avg_engagement_seconds: { unit: 'seconds', agg: 'avg', label: 'Avg engagement' },
  bounce_rate: { unit: 'ratio', agg: 'avg', label: 'Bounce rate' },

  // Search (GSC)
  impressions: { unit: 'count', agg: 'sum', label: 'Impressions' },
  clicks: { unit: 'count', agg: 'sum', label: 'Clicks' },
  ctr: { unit: 'ratio', agg: 'avg', label: 'CTR' },
  position: { unit: 'rank', agg: 'avg', label: 'Avg position' },

  // Behaviour (Clarity)
  dead_clicks: { unit: 'count', agg: 'sum', label: 'Dead clicks' },
  rage_clicks: { unit: 'count', agg: 'sum', label: 'Rage clicks' },
  quickbacks: { unit: 'count', agg: 'sum', label: 'Quickbacks' },
  scroll_depth: { unit: 'ratio', agg: 'avg', label: 'Scroll depth' },

  // Revenue (Raptive)
  revenue: { unit: 'usd', agg: 'sum', label: 'Revenue' },
  ad_impressions: { unit: 'count', agg: 'sum', label: 'Ad impressions' },
  rpm: { unit: 'usd', agg: 'avg', label: 'RPM' },
};

// Dimension namespaces. The prefix is part of the stored string so one flat
// column can hold every breakdown without ambiguity: 'page:/ap-csa/1-2' can
// never collide with 'query:ap csa unit 1'.
const DIMENSIONS = ['page', 'query', 'country', 'device', 'channel', 'source'];

// A dimension value that looks like a user identifier rather than a category.
// Clarity and GA4 can both be coaxed into returning these; nothing here should
// ever store one, so they are dropped at the contract boundary rather than
// trusted not to appear.
const IDENTIFIER_LIKE = [
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, // uuid
  /^[0-9]{6,}\.[0-9]{6,}$/,          // GA client id
  /@/,                                // anything with an email shape
  /^\+?[0-9][0-9\s().-]{7,}$/,        // phone-like
];

function isIdentifierLike(value) {
  const v = String(value || '');
  return IDENTIFIER_LIKE.some((re) => re.test(v));
}

// Dimension values are unbounded in principle (every URL, every query), and an
// unbounded dimension is the same failure as an unbounded table. Ingestors cap
// how many they keep per day; this is the hard ceiling on the value itself.
const MAX_DIMENSION_LENGTH = 180;

function normalizeDimension(namespace, value) {
  if (namespace == null || value == null || value === '') return '';
  if (!DIMENSIONS.includes(namespace)) return '';
  const raw = String(value).trim();
  if (!raw || isIdentifierLike(raw)) return null; // null = reject the row
  let v = raw;
  // Store page dimensions as a path, never a full URL: the host is constant and
  // a query string turns one page into thousands of dimensions.
  if (namespace === 'page') {
    try {
      v = v.startsWith('http') ? new URL(v).pathname : v.split('?')[0];
    } catch (_) {
      v = v.split('?')[0];
    }
    if (!v.startsWith('/')) v = '/' + v;
  }
  if (namespace === 'query') v = v.toLowerCase();
  if (v.length > MAX_DIMENSION_LENGTH) v = v.slice(0, MAX_DIMENSION_LENGTH);
  return namespace + ':' + v;
}

// Split a stored dimension back into its parts. '' is the site total.
function parseDimension(dimension) {
  const d = String(dimension || '');
  if (!d) return { namespace: null, value: null, total: true };
  const i = d.indexOf(':');
  if (i < 0) return { namespace: null, value: d, total: false };
  return { namespace: d.slice(0, i), value: d.slice(i + 1), total: false };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Normalise one reading into a metrics_daily row, or return an error saying why
// it cannot be stored. Callers get a reason rather than a silent drop, because a
// source that quietly contributes nothing is the failure mode that took hours to
// notice the last time a reporter went missing.
function normalize(reading) {
  const r = reading || {};
  const date = String(r.date || '');
  if (!DATE_RE.test(date)) return { ok: false, reason: 'bad date: ' + date };

  const source = String(r.source || '');
  if (!SOURCES.includes(source)) return { ok: false, reason: 'unknown source: ' + source };

  const metric = String(r.metric || '');
  if (!METRICS[metric]) return { ok: false, reason: 'unknown metric: ' + metric };

  const value = Number(r.value);
  if (!Number.isFinite(value)) return { ok: false, reason: 'non-numeric value for ' + metric };

  // A rank of 0 means "not ranked", which is different from position 1. Storing
  // it as 0 would drag every average toward zero and read as an improvement.
  if (metric === 'position' && value <= 0) return { ok: false, reason: 'position must be >= 1' };

  const dimension = r.dimension === undefined && r.dimension_namespace === undefined
    ? ''
    : normalizeDimension(r.dimension_namespace || null, r.dimension_value ?? r.dimension);
  if (dimension === null) return { ok: false, reason: 'rejected dimension (identifier-like or invalid)' };

  return { ok: true, row: { date, source, metric, value, dimension: dimension || '' } };
}

// Ratios arrive as either 0-1 or 0-100 depending on the vendor. Store 0-1 always
// so a chart never has to ask which convention a given source used.
function asRatio(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n > 1 ? n / 100 : n;
}

module.exports = {
  SOURCES, METRICS, DIMENSIONS, MAX_DIMENSION_LENGTH,
  normalize, normalizeDimension, parseDimension, isIdentifierLike, asRatio,
};
