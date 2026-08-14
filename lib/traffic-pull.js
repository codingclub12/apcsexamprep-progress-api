'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  TRAFFIC PULL — the one implementation of "fetch every source and store it".
//
//  This exists so the HTTP route and the in-process scheduler cannot drift.
//  They are the same operation triggered two ways, and the repo already has a
//  rule about this: the teacher gradebook and the admin view of it call one
//  builder for exactly this reason. A scheduled pull that quietly differed from
//  a manual one would be indistinguishable from a data bug for as long as it
//  took someone to compare them by hand.
//
//  EACH SOURCE IS ISOLATED. Sharing one try/catch meant a failure in the second
//  source discarded the first one's result: GA4 would fetch, ingest and WRITE,
//  then a GSC error would surface as a 500 and the caller would never learn GA4
//  had succeeded. A daily job would read as broken while actually half working.
//  This happened for real during setup, when the Search Console API was enabled
//  on a different project than GA4.
//
//  So a source that throws records its own error and the others still run. The
//  result reports ok:false when at least one source failed, without pretending
//  the healthy ones did.
// ─────────────────────────────────────────────────────────────────────────────

const trafficIngest = require('./traffic-ingest');
const trafficGoogle = require('./traffic-google');
const trafficShopify = require('./traffic-shopify');

// name -> how to fetch it, and what its "which account" field is called.
const SOURCES = [
  { name: 'ga4', fetch: (r) => trafficGoogle.fetchGa4(r), label: 'property' },
  { name: 'gsc', fetch: (r) => trafficGoogle.fetchGsc(r), label: 'site' },
  { name: 'shopify', fetch: (r) => trafficShopify.fetchShopify(r), label: 'shop' },
];

async function runPull({ source = 'all', startDate, endDate, dryRun = false, logger = console } = {}) {
  const range = { startDate: startDate || undefined, endDate: endDate || undefined };
  const want = String(source || 'all');
  const out = {};

  for (const s of SOURCES) {
    if (want !== 'all' && want !== s.name) continue;
    try {
      const r = await s.fetch(range);
      out[s.name] = r.configured
        ? {
            ...trafficIngest.ingest(r.readings, { dryRun }),
            [s.label]: r[s.label],
            // A pull is bounded to a window of days, so a long backfill needs
            // to say where to resume. Silence here would look like the whole
            // range had been covered.
            days_covered: r.days_covered,
            covered: r.covered,
            next_start_date: r.next_start_date,
            ...(r.notes && r.notes.length ? { notes: r.notes } : {}),
          }
        : { configured: false, reason: r.reason };
    } catch (e) {
      logger.error('traffic pull ' + s.name + ':', e.message);
      out[s.name] = { configured: true, ok: false, error: e.message, written: 0 };
    }
  }

  const failed = Object.entries(out).filter(([, v]) => v.error || v.configured === false).map(([k]) => k);
  // If any source stopped short of the requested range, hand back the date to
  // resume from so a backfill can be finished without arithmetic.
  const more = Object.values(out).map((v) => v && v.next_start_date).filter(Boolean).sort()[0] || null;

  return { ok: failed.length === 0, failed, dry_run: dryRun, next_start_date: more, ...out };
}

module.exports = { runPull, SOURCES };
