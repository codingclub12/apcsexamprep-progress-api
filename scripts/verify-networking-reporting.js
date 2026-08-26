'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  LIVE CHECK: every AP Networking page that reports a grade loads the reporter.
//
//    node scripts/verify-networking-reporting.js
//    node scripts/verify-networking-reporting.js --json      machine readable
//
//  WHY THIS EXISTS SEPARATELY FROM THE SMOKE SUITE
//  smoke/networking-lab-reporter.js pins the contract for the four browser labs
//  against a fixture. A fixture can only know the page families that existed the
//  day it was written, and the defect it closes was precisely a NEW page family
//  shipping under a handle shape the theme gate did not match. The four labs
//  scored themselves on screen, told the student "Recorded: 6 out of 8", and
//  posted nothing, because window.APNET_reportAttempt is defined by an asset the
//  gate never loaded there. Nothing was broken. Two correct halves were simply
//  never introduced.
//
//  So this check does not know about handles at all. It asks the live site one
//  question, of every AP Networking page:
//
//      does this page try to report a grade, and if so, is the code that
//      receives that call actually on the page?
//
//  A page that answers yes then no is a silent gradebook hole, and it is the
//  only condition that fails this script.
//
//  WHY IT IS NOT A smoke:* SCRIPT
//  tests.yml derives its suite list from every smoke:* npm script and runs on
//  every pull request. This one drives the live storefront, so it belongs with
//  the other verify scripts: run it after a theme deploy, or when a new
//  AP Networking page family ships. That is the same line smoke.yml draws.
//
//  Zero PII. It reads public pages and reports handles and booleans.
// ─────────────────────────────────────────────────────────────────────────────

const STORE = process.env.STORE_ORIGIN || 'https://www.apcsexamprep.com';
const SITEMAP = `${STORE}/sitemap.xml`;
const ASSET = 'ap-networking-reporter.js';
const CONCURRENCY = 4;
const PAGE_TIMEOUT_MS = 45_000;

const asJson = process.argv.includes('--json');

async function get(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), PAGE_TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'apcs-verify-networking-reporting' } });
    return { status: r.status, body: r.ok ? await r.text() : '' };
  } catch (e) {
    return { status: 0, body: '', error: String(e.message || e) };
  } finally {
    clearTimeout(t);
  }
}

const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1].replace(/&amp;/g, '&'));

// ── WHAT COUNTS AS "THIS PAGE REPORTS" ───────────────────────────────────────
//  Three signals, because the course has three delivery shapes and each one
//  reaches the gradebook differently:
//
//    callsGlobal   the browser labs. A complete score, handed straight to
//                  window.APNET_reportAttempt, which only the asset defines.
//    dispatches    the 22 topic lesson pages. Per-scenario CustomEvents the
//                  asset accumulates into one cumulative attempt.
//    selfPosts     the interactive terminal labs. /lab-player.js posts to
//                  /api/progress/attempt itself and needs no reporter.
//
//  Only the first two need the asset. selfPosts is tracked so a page that posts
//  its own grades is never mistaken for a page that reports nothing, which would
//  turn this script's own output into the misleading thing it exists to prevent.
function classify(handle, html) {
  const wrapper = /<[^<>]*data-course="ap-networking"[^<>]*data-lesson-id="[^"]+"[^<>]*>/.test(html) ||
                  /<[^<>]*data-lesson-id="[^"]+"[^<>]*data-course="ap-networking"[^<>]*>/.test(html);
  const callsGlobal = /APNET_reportAttempt/.test(html);
  const dispatches = /apnet:attempt/.test(html);
  const selfPosts = /lab-player\.js/.test(html);
  const loadsAsset = html.includes(ASSET);
  const needsAsset = callsGlobal || dispatches;
  return {
    handle, wrapper, callsGlobal, dispatches, selfPosts, loadsAsset, needsAsset,
    broken: needsAsset && !loadsAsset,
  };
}

async function pool(items, worker) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await worker(items[i], i);
    }
  }));
  return out;
}

(async () => {
  const root = await get(SITEMAP);
  if (root.status !== 200) {
    console.error(`could not read ${SITEMAP} (status ${root.status}${root.error ? ', ' + root.error : ''})`);
    process.exit(2);
  }
  const pagesMap = locs(root.body).find((u) => u.includes('sitemap_pages'));
  if (!pagesMap) {
    console.error('the sitemap index carries no pages sitemap. Nothing to check.');
    process.exit(2);
  }
  const pages = await get(pagesMap);
  if (pages.status !== 200) {
    console.error(`could not read ${pagesMap} (status ${pages.status})`);
    process.exit(2);
  }

  const handles = locs(pages.body)
    .map((u) => u.split('/pages/')[1])
    .filter((h) => h && h.startsWith('ap-networking'))
    .sort();

  if (!handles.length) {
    console.error('no ap-networking pages in the sitemap. That is itself wrong; not reporting green.');
    process.exit(2);
  }

  const unreachable = [];
  const results = (await pool(handles, async (h) => {
    const r = await get(`${STORE}/pages/${h}`);
    if (r.status !== 200) { unreachable.push({ handle: h, status: r.status, error: r.error }); return null; }
    return classify(h, r.body);
  })).filter(Boolean);

  const broken = results.filter((r) => r.broken);
  const reporting = results.filter((r) => r.needsAsset);
  const carried = results.filter((r) => r.loadsAsset && !r.needsAsset);

  if (asJson) {
    console.log(JSON.stringify({ store: STORE, checked: results.length, unreachable, results }, null, 2));
  } else {
    console.log(`\nAP Networking reporting, live at ${STORE}\n`);
    console.log(`  ${handles.length} pages in the sitemap, ${results.length} read, ${unreachable.length} unreachable`);
    console.log(`  ${reporting.length} pages report a grade and need ${ASSET}`);
    console.log(`  ${carried.length} pages load it without needing it (inert, self-gated on the wrapper)\n`);

    if (broken.length) {
      console.log('  PAGES THAT REPORT AND CANNOT:\n');
      for (const r of broken) {
        const how = r.callsGlobal ? 'calls window.APNET_reportAttempt' : "dispatches 'apnet:attempt'";
        console.log(`    ${r.handle}`);
        console.log(`      ${how}, and ${ASSET} is not on the page.`);
        console.log('      The student sees a score. Nothing is recorded.\n');
      }
      console.log('  Fix: snippets/apcs-networking-reporter.liquid in the theme repo.');
      console.log('  Remember the connected branch is claude/site-linking-audit-yhufjk, not main.\n');
    } else {
      console.log('  Every page that reports a grade loads the reporter.\n');
    }

    // A page carrying the wrapper but reporting through nothing is not a
    // failure (a hub can legitimately carry it for the visit tracker), but it
    // is the shape the labs had, so it is worth printing rather than hiding.
    const quiet = results.filter((r) => r.wrapper && !r.needsAsset && !r.selfPosts);
    if (quiet.length) {
      console.log('  Carrying a course wrapper but reporting nothing (informational):');
      for (const r of quiet) console.log(`    ${r.handle}`);
      console.log('');
    }

    if (unreachable.length) {
      console.log('  Unreachable:');
      for (const u of unreachable) console.log(`    ${u.handle}  status ${u.status}${u.error ? '  ' + u.error : ''}`);
      console.log('');
    }
  }

  // An unreachable page is not a pass. It is a page nobody looked at, and
  // exiting green on it is how a check starts lying.
  process.exit(broken.length || unreachable.length ? 1 : 0);
})();
