#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  TRAFFIC BACKFILL — walk a date range through /api/admin/traffic/pull in
//  chunks small enough that nothing is silently discarded.
//
//  WHY THIS EXISTS RATHER THAN A LOOP ON next_start_date.
//
//  The obvious backfill is: POST /traffic/pull, read next_start_date, repeat
//  until it comes back null. That loop terminates, reports success, and LOSES
//  MOST OF THE DATA.
//
//  Two independent limits are at work and they disagree:
//
//    MAX_DAYS_PER_PULL = 90    (lib/traffic-google.js)  how far a pull reaches
//    MAX_ROWS_PER_RUN  = 5000  (lib/traffic-ingest.js)  how much it may WRITE
//
//  next_start_date advances by up to 90 days. But one day of real Search
//  Console data is ~604 rows once the per-day breakdowns are counted, so 90
//  days is ~54,000 rows against a 5,000 row ceiling. The ingest writes the
//  first 5,000, reports the rest in `run_capped`, and moves on. The loop sees
//  a next_start_date and keeps going, so the run ends "successfully" having
//  stored under a tenth of the range.
//
//  Measured, per source, per day:
//      ga4 ~458 rows/day  ->  5000 / 458 ~= 10 days
//      gsc ~604 rows/day  ->  5000 / 604 ~=  8 days
//  GSC binds first. This script therefore drives EXPLICIT start/end windows of
//  CHUNK_DAYS (default 3, a wide margin under 8) and never trusts
//  next_start_date to size a step. It also checks run_capped on every response
//  and stops rather than continuing to write partial days, because a backfill
//  that quietly stores 40% of history is worse than one that fails loudly.
//
//  Usage:
//    ADMIN_KEY=... node scripts/traffic-backfill.js --from 2025-08-14
//    ADMIN_KEY=... node scripts/traffic-backfill.js --from 2025-08-14 --to 2026-08-12
//    ADMIN_KEY=... node scripts/traffic-backfill.js --from 2025-08-14 --dry-run
//
//  Options:
//    --from YYYY-MM-DD   required; oldest day to fetch
//    --to   YYYY-MM-DD   default yesterday (today is partial at every source)
//    --chunk N           days per request, default 3
//    --base URL          default https://progress.apcsexamprep.com
//    --source ga4|gsc    default both
//    --dry-run           fetch and count, write nothing
//    --resume            skip chunks already fully covered in metrics_daily
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_BASE = 'https://progress.apcsexamprep.com';
const DEFAULT_CHUNK = 3;
const MAX_ATTEMPTS = 5;

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}
const has = (name) => process.argv.includes('--' + name);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (ymd, n) => {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
const yesterday = () => { const d = new Date(); d.setUTCDate(d.getUTCDate() - 1); return iso(d); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const key = process.env.ADMIN_KEY || '';
  const base = String(arg('base', DEFAULT_BASE)).replace(/\/$/, '');
  const from = String(arg('from', ''));
  const to = String(arg('to', yesterday()));
  const chunk = Math.max(1, Math.min(30, parseInt(arg('chunk', DEFAULT_CHUNK), 10) || DEFAULT_CHUNK));
  const source = arg('source', null);
  const dryRun = has('dry-run');

  if (!key) fail('ADMIN_KEY is not set. Export it first:  export ADMIN_KEY=...');
  if (!DATE_RE.test(from)) fail('--from YYYY-MM-DD is required (oldest day to fetch).');
  if (!DATE_RE.test(to)) fail('--to must be YYYY-MM-DD.');
  if (from > to) fail(`--from (${from}) is after --to (${to}).`);
  if (to >= iso(new Date())) {
    console.log(`note: --to ${to} includes today, which is partial at every source. Using ${yesterday()}.`);
  }
  const end = to >= iso(new Date()) ? yesterday() : to;

  const windows = [];
  for (let s = from; s <= end; s = addDays(s, chunk)) {
    const e = addDays(s, chunk - 1);
    windows.push({ start: s, end: e > end ? end : e });
  }

  console.log(`backfill ${from} .. ${end}`);
  console.log(`  ${windows.length} requests of up to ${chunk} day(s) each, against ${base}`);
  console.log(`  ${dryRun ? 'DRY RUN, nothing will be written' : 'writing'}\n`);

  const totals = { written: 0, capped: 0, dropped: 0, failed: 0 };
  const capped = [];

  for (let i = 0; i < windows.length; i++) {
    const w = windows[i];
    const label = `[${String(i + 1).padStart(String(windows.length).length)}/${windows.length}] ${w.start}..${w.end}`;

    let res = null, lastErr = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        res = await post(base, key, {
          start_date: w.start, end_date: w.end, dry_run: dryRun,
          ...(source ? { source: String(source) } : {}),
        });
        break;
      } catch (e) {
        lastErr = e;
        // A transient network failure mid-backfill should not lose the run.
        // A 401/403 will not fix itself, so it is not retried.
        if (/\b(401|403)\b/.test(e.message)) break;
        if (attempt < MAX_ATTEMPTS) {
          const wait = 2000 * Math.pow(2, attempt - 1);
          console.log(`${label}  ${e.message}; retry ${attempt}/${MAX_ATTEMPTS - 1} in ${wait / 1000}s`);
          await sleep(wait);
        }
      }
    }

    if (!res) {
      totals.failed++;
      console.log(`${label}  FAILED: ${lastErr && lastErr.message}`);
      if (/\b(401|403)\b/.test((lastErr && lastErr.message) || '')) {
        fail('authentication rejected. Check ADMIN_KEY matches the deployed key.');
      }
      continue;
    }

    let wrote = 0, cap = 0, drop = 0;
    const parts = [];
    for (const name of ['ga4', 'gsc']) {
      const r = res[name];
      if (!r) continue;
      if (r.configured === false) { parts.push(`${name}: not configured (${r.reason})`); continue; }
      if (r.ok === false) { parts.push(`${name}: ERROR ${r.error}`); continue; }
      const w2 = dryRun ? (r.would_write || 0) : (r.written || 0);
      wrote += w2; cap += r.run_capped || 0; drop += r.dimension_rows_dropped || 0;
      parts.push(`${name}: ${w2}${r.run_capped ? ` CAPPED+${r.run_capped}` : ''}`);
    }
    totals.written += wrote; totals.capped += cap; totals.dropped += drop;
    if (cap > 0) capped.push(w);

    console.log(`${label}  ${parts.join('  ')}`);
  }

  console.log(`\n${'-'.repeat(60)}`);
  console.log(`${dryRun ? 'would write' : 'wrote'}: ${totals.written} rows`);
  if (totals.dropped) {
    console.log(`per-day dimension cap trimmed ${totals.dropped} low-traffic rows (expected; the cap keeps the top 200 per metric per day).`);
  }
  if (totals.failed) console.log(`FAILED requests: ${totals.failed}`);
  if (totals.capped) {
    console.log(`\nCAPPED: ${totals.capped} rows were discarded by MAX_ROWS_PER_RUN.`);
    console.log('These windows are INCOMPLETE and must be re-run with a smaller --chunk:');
    capped.forEach((w) => console.log(`  --from ${w.start} --to ${w.end} --chunk 1`));
    process.exit(1);
  }
  if (totals.failed) process.exit(1);
  console.log('\nno windows were capped; the range is fully stored.');
}

async function post(base, key, body) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 180000);
  try {
    const r = await fetch(base + '/api/admin/traffic/pull', {
      method: 'POST',
      headers: { 'x-admin-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 300)}`);
    try { return JSON.parse(text); } catch (e) { throw new Error(`non-JSON reply: ${text.slice(0, 200)}`); }
  } finally {
    clearTimeout(t);
  }
}

function fail(msg) { console.error('error: ' + msg); process.exit(1); }

main().catch((e) => fail(e.message));
