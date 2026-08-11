'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  GOOGLE CONNECTORS — GA4 Data API and Search Console, via a service account.
//
//  Both APIs are reachable from Railway and both speak the same auth: a service
//  account key, signed into a JWT, exchanged for a short-lived access token. No
//  browser step, no refresh token to expire quietly, which is what makes an
//  unattended daily job actually stay unattended.
//
//  SETUP (once, in Google Cloud):
//    1. Create a service account, download its JSON key.
//    2. Enable "Google Analytics Data API" and "Google Search Console API".
//    3. GA4: Admin -> Property access management -> add the service account
//       email as Viewer.
//    4. GSC: Settings -> Users and permissions -> add the same email as a
//       Full or Restricted user.
//    5. Set on Railway:
//         GOOGLE_SERVICE_ACCOUNT_JSON  the whole key file, as one line
//         GA4_PROPERTY_ID              numeric, e.g. 123456789
//         GSC_SITE_URL                 e.g. sc-domain:apcsexamprep.com
//
//  FAILS CLOSED AND SAYS SO. With no credentials configured every function here
//  returns {configured:false} rather than throwing or, worse, returning an empty
//  result that looks like "no traffic". A source that silently reports nothing is
//  indistinguishable from a source reporting zero, and that ambiguity is what
//  makes a broken pipeline invisible.
//
//  AGGREGATES ONLY. Both APIs can return user-scoped data; nothing here requests
//  it. The dimensions asked for are page, query, country and device, all of which
//  are categories. The contract layer rejects anything identifier-shaped anyway,
//  so this is defence in depth rather than the only guard.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const contract = require('./traffic-contract');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GA4_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

// How many dimension rows to request PER DAY. The contract caps what is stored;
// this caps what is transferred, so a large site does not pull megabytes to throw
// most of it away.
const ROW_LIMIT = 250;

// PER DAY, NOT PER RANGE. This was the bug that made a backfill actively
// misleading rather than merely thin.
//
// Both APIs apply rowLimit to the WHOLE request and return rows ordered by
// clicks/pageviews descending. Asking for [date, page] over 28 days with
// rowLimit 250 therefore does not return 250 rows per day; it returns the 250
// highest-traffic (date, page) pairs in the range, which cluster on the busiest
// recent days. Older days come back with few rows or none.
//
// Downstream that is indistinguishable from those pages having had no traffic,
// so every page appears to have exploded in popularity and none can ever
// decline. The first real backfill produced exactly that: every page up several
// hundred percent, "no pages declined", all of it an artifact.
//
// So breakdowns are requested one day at a time, each with its own row budget,
// which also matches how the data is stored (capped per day) and how it is read.
//
// The cost is one request per day per breakdown, so a pull is bounded to a
// window of days and reports where to resume. Unbounded would mean a 16-month
// backfill issuing ~1500 sequential requests inside one HTTP call, which no
// proxy will hold open.
const MAX_DAYS_PER_PULL = 90;

// Inclusive list of ISO dates from start to end, bounded.
function daysBetween(start, end, cap = MAX_DAYS_PER_PULL) {
  const out = [];
  const from = new Date(start + 'T00:00:00Z');
  const to = new Date(end + 'T00:00:00Z');
  for (let d = from; d <= to && out.length < cap; d = new Date(d.getTime() + 86400000)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

// The day after the last one covered, or null when the range is finished. Lets a
// caller resume a long backfill without recomputing the arithmetic.
function nextStart(days, end) {
  if (!days.length) return null;
  const last = new Date(days[days.length - 1] + 'T00:00:00Z');
  const next = new Date(last.getTime() + 86400000);
  const iso = next.toISOString().slice(0, 10);
  return iso <= end ? iso : null;
}

// Google's API errors carry the fix in their own text, and the useful sentence
// is usually the LAST one: "if you enabled this API recently, wait a few minutes
// for the action to propagate". Clipping at 300 characters cut exactly that off,
// which turned a self-explaining error into a mystery during setup. Bounded
// still, because an error body is untrusted input and this ends up in a log and
// an HTTP response, but bounded well past where the answer lives.
const MAX_ERROR_DETAIL = 1200;
function errorDetail(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > MAX_ERROR_DETAIL ? t.slice(0, MAX_ERROR_DETAIL) + ' [truncated]' : t;
}

function serviceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';
  if (!raw.trim()) return null;
  try {
    const key = JSON.parse(raw);
    if (!key.client_email || !key.private_key) return null;
    return key;
  } catch (_) {
    return null;
  }
}

function base64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// Tokens last an hour; cache per scope so a run that hits both APIs signs once.
// Bounded by the number of scopes (two), so it cannot grow.
const tokenCache = new Map();

async function accessToken(scope) {
  const cached = tokenCache.get(scope);
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;

  const key = serviceAccount();
  if (!key) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(JSON.stringify({
    iss: key.client_email,
    scope,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(header + '.' + claim);
  // Railway env vars keep literal \n rather than real newlines; PEM parsing
  // fails on that with an error that does not mention newlines at all.
  const pem = key.private_key.replace(/\\n/g, '\n');
  const signature = base64url(signer.sign(pem));

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: header + '.' + claim + '.' + signature,
    }),
  });
  if (!res.ok) {
    const detail = errorDetail(await res.text());
    throw new Error(`token exchange failed (${res.status}): ${detail}`);
  }
  const json = await res.json();
  tokenCache.set(scope, { token: json.access_token, expires: Date.now() + (json.expires_in || 3600) * 1000 });
  return json.access_token;
}

// ── GA4 ──────────────────────────────────────────────────────────────────────
const GA4_METRICS = [
  ['screenPageViews', 'pageviews'],
  ['sessions', 'sessions'],
  ['totalUsers', 'users'],
  ['newUsers', 'new_users'],
  ['engagedSessions', 'engaged_sessions'],
  ['engagementRate', 'engagement_rate'],
  ['bounceRate', 'bounce_rate'],
  ['averageSessionDuration', 'avg_engagement_seconds'],
];

async function runGa4Report(token, propertyId, body) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const detail = errorDetail(await res.text());
    throw new Error(`GA4 runReport failed (${res.status}): ${detail}`);
  }
  return res.json();
}

// Pull GA4 for a date range. Two reports: site totals by day, and a page
// breakdown by day. Two calls rather than one because asking for the page
// dimension changes what the totals mean (sessions do not sum across pages).
async function fetchGa4({ startDate, endDate } = {}) {
  const propertyId = process.env.GA4_PROPERTY_ID || '';
  const token = await accessToken(GA4_SCOPE).catch((e) => { throw e; });
  if (!token || !propertyId) {
    return { configured: false, reason: !token ? 'GOOGLE_SERVICE_ACCOUNT_JSON not set or invalid' : 'GA4_PROPERTY_ID not set', readings: [] };
  }

  const start = startDate || daysAgo(28);
  const end = endDate || daysAgo(1);
  const days = daysBetween(start, end);
  const covered = days.length ? { from: days[0], to: days[days.length - 1] } : null;
  const dateRanges = covered ? [{ startDate: covered.from, endDate: covered.to }] : [];
  const readings = [];

  // Totals stay a single ranged request: one row per day, so the limit only has
  // to exceed the number of days.
  const totals = covered ? await runGa4Report(token, propertyId, {
    dateRanges,
    dimensions: [{ name: 'date' }],
    metrics: GA4_METRICS.map(([api]) => ({ name: api })),
    limit: 25000,
  }) : { rows: [] };
  for (const row of totals.rows || []) {
    const date = isoDate(row.dimensionValues[0].value);
    GA4_METRICS.forEach(([, canonical], i) => {
      const raw = row.metricValues[i] && row.metricValues[i].value;
      if (raw == null) return;
      const value = contract.METRICS[canonical].unit === 'ratio' ? contract.asRatio(raw) : Number(raw);
      readings.push({ date, source: 'ga4', metric: canonical, value });
    });
  }

  // Per-page ONE DAY AT A TIME, for the same reason as GSC: a ranged request
  // returns the busiest (date, page) pairs, not every page on every day.
  for (const day of days) {
    const byPage = await runGa4Report(token, propertyId, {
      dateRanges: [{ startDate: day, endDate: day }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }],
      limit: ROW_LIMIT,
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    });
    for (const row of byPage.rows || []) {
      const page = row.dimensionValues[0].value;
      readings.push({ date: day, source: 'ga4', metric: 'pageviews', value: Number(row.metricValues[0].value),
        dimension_namespace: 'page', dimension_value: page });
      readings.push({ date: day, source: 'ga4', metric: 'sessions', value: Number(row.metricValues[1].value),
        dimension_namespace: 'page', dimension_value: page });
    }
  }

  return {
    configured: true, readings, property: propertyId,
    days_covered: days.length, covered,
    next_start_date: nextStart(days, end),
  };
}

// GA4 returns dates as 'YYYYMMDD'.
function isoDate(v) {
  const s = String(v || '');
  return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : s;
}

// ── Search Console ───────────────────────────────────────────────────────────
async function runGscQuery(token, siteUrl, body) {
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const detail = errorDetail(await res.text());
    throw new Error(`GSC query failed (${res.status}): ${detail}`);
  }
  return res.json();
}

// GSC restates for roughly three days, so the default window starts further back
// than a naive "since yesterday" and relies on the upsert to correct earlier days
// in place.
async function fetchGsc({ startDate, endDate } = {}) {
  const siteUrl = process.env.GSC_SITE_URL || '';
  const token = await accessToken(GSC_SCOPE);
  if (!token || !siteUrl) {
    return { configured: false, reason: !token ? 'GOOGLE_SERVICE_ACCOUNT_JSON not set or invalid' : 'GSC_SITE_URL not set', readings: [] };
  }

  const start = startDate || daysAgo(28);
  const end = endDate || daysAgo(1);
  const days = daysBetween(start, end);
  const covered = days.length ? { from: days[0], to: days[days.length - 1] } : null;
  const readings = [];

  const push = (date, metric, value, ns, dim) => {
    readings.push({ date, source: 'gsc', metric, value, ...(ns ? { dimension_namespace: ns, dimension_value: dim } : {}) });
  };

  // Site totals stay a single ranged request: one row per day, so the row limit
  // only has to exceed the number of days rather than the number of queries.
  const totals = covered ? await runGscQuery(token, siteUrl, {
    startDate: covered.from, endDate: covered.to, dimensions: ['date'], rowLimit: 25000,
  }) : { rows: [] };
  for (const row of totals.rows || []) {
    const date = row.keys[0];
    push(date, 'clicks', row.clicks);
    push(date, 'impressions', row.impressions);
    push(date, 'ctr', contract.asRatio(row.ctr));
    if (row.position > 0) push(date, 'position', row.position);
  }

  // Breakdowns ONE DAY AT A TIME, so every day gets its own row budget and a
  // quiet day is represented rather than crowded out by a busy one.
  for (const [dim, ns] of [['query', 'query'], ['page', 'page']]) {
    for (const day of days) {
      const res = await runGscQuery(token, siteUrl, {
        startDate: day, endDate: day, dimensions: [dim], rowLimit: ROW_LIMIT,
      });
      for (const row of res.rows || []) {
        const value = row.keys[0];
        push(day, 'clicks', row.clicks, ns, value);
        push(day, 'impressions', row.impressions, ns, value);
        if (row.position > 0) push(day, 'position', row.position, ns, value);
      }
    }
  }

  return {
    configured: true, readings, site: siteUrl,
    days_covered: days.length, covered,
    next_start_date: nextStart(days, end),
  };
}

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// What is configured, without calling anything. Lets the dashboard show a
// connector as "not set up" instead of "returned nothing".
function status() {
  const key = serviceAccount();
  return {
    service_account: Boolean(key),
    service_account_email: key ? key.client_email : null,
    ga4_property: Boolean(process.env.GA4_PROPERTY_ID),
    gsc_site: Boolean(process.env.GSC_SITE_URL),
    ready: Boolean(key) && Boolean(process.env.GA4_PROPERTY_ID || process.env.GSC_SITE_URL),
  };
}

module.exports = { fetchGa4, fetchGsc, status, accessToken, daysAgo, daysBetween, nextStart, ROW_LIMIT, MAX_DAYS_PER_PULL };
