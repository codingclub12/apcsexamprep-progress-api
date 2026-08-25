'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  NOTHING MAY OVERWRITE A LIVE PAGE WITHOUT LOOKING AT IT FIRST.
//
//  ── THE INCIDENT ───────────────────────────────────────────────────────────
//  2026-08-22: an import of shopify/join.html replaced /pages/join and deleted
//  the entire self-study tab, the Continue My Course button and two display
//  helpers. All four guards in scripts/page-body-csv.js were green throughout,
//  because not one of them asked what the LIVE body held that the new one did
//  not. The tab had been authored in the Shopify admin, so no revision of the
//  repo file had ever contained it: the file was not a stale copy of the live
//  page, it was a different page sharing a handle.
//
//  Shopify keeps no usable page history. That content was recoverable only
//  because a snapshot happened to have been committed first.
//
//  ── WHY THIS FILE EXISTS SEPARATELY FROM contentLoss() ─────────────────────
//  The fix for that incident was contentLoss() in scripts/page-body-csv.js, and
//  it works. The problem is that it was only ever wired into the one generator
//  that caused the incident. Every other generator in scripts/ MERGEs bodies
//  over live pages while checking the generated body only against ITSELF:
//  frq-pages-csv.js, lab-pages-csv.js, cyber-practice-hubs-csv.js and the rest.
//  A page hand-edited in the Shopify admin would be silently gutted by any of
//  them, and the sheet would report success.
//
//  So the comparison lives here, importable by any generator, and it fetches
//  the live body itself rather than asking a human to supply one. A guard that
//  requires a manual step is a guard that gets skipped on the busy day.
//
//  ── WHY IT REFUSES RATHER THAN WARNS ───────────────────────────────────────
//  A warning printed above a successful "Wrote 4 pages" line is not a warning.
//  The 2026-08-22 import produced output that looked entirely successful. The
//  default here is a non-zero exit, and an operator who genuinely means to drop
//  live content passes --allow-content-loss and says so out loud.
//
//  Zero PII: page markup only.
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

const { contentLoss } = require('../scripts/page-body-csv');
const { extract } = require('../scripts/extract-live-body');

const STORE = 'https://www.apcsexamprep.com';

// One page at a time, with a pause. Board item #79 records 46 pages returning
// 429 during a parallel crawl of this storefront. A guard that trips rate
// limiting would teach people to bypass the guard.
const DELAY_MS = 1200;

// A new body this much smaller than the live one is treated as a truncation
// until someone says otherwise. Deliberately loose: a legitimate rewrite that
// halves a page is rare, and the flag costs one flag rather than a live page.
const SHRINK_LIMIT = 0.5;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/**
 * The live body for one handle, or null when the page does not exist yet.
 *
 * A 404 is not an error here and must not be treated as one: a brand new page
 * has no live body to lose, which is the safest case there is. Anything else
 * that goes wrong IS an error, because "could not check" must never quietly
 * become "checked and fine".
 */
async function fetchLiveBody(handle, fetchImpl) {
  const f = fetchImpl || globalThis.fetch;
  const res = await f(`${STORE}/pages/${handle}`, { redirect: 'follow' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /pages/${handle} returned ${res.status}`);
  const html = await res.text();
  try {
    return extract(html);
  } catch (e) {
    throw new Error(`could not read the live body of /pages/${handle}: ${e.message}`);
  }
}

/**
 * Compare what a sheet is about to write against what is live.
 *
 * pages: [{ handle, bodyHtml }]
 * Returns [{ handle, status, lost }] where status is one of:
 *   'new'       no live page, nothing to lose
 *   'safe'      live page exists and the new body keeps everything it had
 *   'lossy'     the new body drops content the live page carries
 */
async function audit(pages, opts) {
  opts = opts || {};
  const out = [];
  for (const p of pages) {
    const live = await fetchLiveBody(p.handle, opts.fetchImpl);
    if (live === null) {
      out.push({ handle: p.handle, status: 'new', lost: [], liveBytes: 0 });
    } else {
      const lost = contentLoss(live, p.bodyHtml);
      // contentLoss inventories ids, functions and API paths. That is strong on
      // a script-heavy page like /pages/join, and thin on a simple one: a
      // gutted practice page that happened to keep its mount id would score a
      // single loss. So size is checked too, because the other documented
      // failure on this storefront is a body arriving TRUNCATED rather than
      // rewritten, and a truncation keeps the early ids and drops the rest.
      const shrink = live.length ? 1 - (p.bodyHtml.length / live.length) : 0;
      const truncated = shrink >= SHRINK_LIMIT;
      out.push({
        handle: p.handle,
        status: (lost.length || truncated) ? 'lossy' : 'safe',
        lost,
        truncated,
        shrinkPct: Math.round(shrink * 100),
        liveBytes: live.length,
        newBytes: p.bodyHtml.length,
      });
    }
    if (opts.delayMs !== 0) await sleep(opts.delayMs == null ? DELAY_MS : opts.delayMs);
  }
  return out;
}

/**
 * The whole guard, for a generator's main(). Prints what it found and exits
 * non-zero on loss unless the operator explicitly allowed it.
 *
 * Returns the audit so a caller can report on it further.
 */
async function guard(pages, argv, opts) {
  const allow = (argv || []).includes('--allow-content-loss');
  const skip = (argv || []).includes('--no-live-check');

  if (skip) {
    console.log('\nLIVE CHECK SKIPPED (--no-live-check).');
    console.log('  Nothing compared this sheet against the pages it will overwrite.');
    console.log('  Shopify keeps no page history, so an import is not undoable.');
    return null;
  }

  let report;
  try {
    report = await audit(pages, opts);
  } catch (e) {
    // Reaching the storefront is part of the guard, so failing to reach it is a
    // refusal rather than a pass. Use --no-live-check to proceed deliberately.
    console.error(`\nRefusing to write a sheet: the live check could not run.\n  ${e.message}`);
    console.error('  Pass --no-live-check to import without comparing, and read that');
    console.error('  flag as "I accept that this may delete live content".');
    process.exit(1);
  }

  console.log('\nLIVE CHECK, against what is on the storefront right now:');
  for (const r of report) {
    if (r.status === 'new') console.log(`  NEW    ${r.handle}  (no live page, nothing to lose)`);
    else if (r.status === 'safe') {
      const delta = r.newBytes - r.liveBytes;
      console.log(`  SAFE   ${r.handle}  (live ${r.liveBytes} bytes, `
        + `new ${r.newBytes}, ${delta >= 0 ? '+' : ''}${delta})`);
    } else {
      console.log(`  LOSSY  ${r.handle}  live ${r.liveBytes} bytes, new ${r.newBytes}`);
      if (r.truncated) {
        console.log(`           the new body is ${r.shrinkPct}% smaller than the live one, `
          + 'which is what a truncation looks like');
      }
      if (r.lost.length) {
        console.log(`           would delete ${r.lost.length} thing(s) the live page has:`);
        r.lost.slice(0, 12).forEach((l) => console.log(`           - ${l}`));
        if (r.lost.length > 12) console.log(`           ... and ${r.lost.length - 12} more`);
      }
    }
  }

  const lossy = report.filter((r) => r.status === 'lossy');
  if (lossy.length && !allow) {
    console.error('\nRefusing to write a sheet that would delete live page content.');
    console.error('  This is the check that /pages/join did not have on 2026-08-22.');
    console.error('  If the live page was hand-edited in the Shopify admin, that edit is');
    console.error('  only in Shopify and only until this import lands.');
    console.error('  Snapshot it first: node scripts/snapshot-live-page.js');
    console.error('  Then pass --allow-content-loss if you really mean to replace it.');
    process.exit(1);
  }
  if (lossy.length) {
    console.log('\n--allow-content-loss was passed, so the deletions above are intentional.');
  }
  return report;
}

module.exports = { audit, guard, fetchLiveBody, contentLoss, STORE, DELAY_MS, SHRINK_LIMIT };
