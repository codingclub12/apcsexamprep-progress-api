#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  RESOLVE OFF-SITEMAP LINK TARGETS.
//
//  The crawl only fetches what the sitemap advertises, so any link target that
//  is NOT in the sitemap comes out of the report as "dangling" with no verdict.
//  Dangling covers three very different things and a linking pass has to tell
//  them apart:
//
//    301  the target is a redirect. The link works, and every one of them
//         spends a hop and passes equity through a redirect. This is the
//         common case and the one worth fixing: /pages/ap-computer-science-a
//         is a 301 to /pages/ap-csa-exam-prep-hub and page breadcrumbs across
//         the site link the redirecting URL directly.
//    404  a real broken link.
//    200  a live page Shopify keeps out of the sitemap.
//
//  BOUNDED: targets are deduplicated before the first request, each is checked
//  ONCE, and the same throttle discipline as the crawl applies. A thousand
//  pages linking one bad target costs one request.
//
//    node scripts/link-targets-resolve.js --report report.json --out resolved.json
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const C = require('../lib/site-crawl');

const STORE = (process.env.STORE_ORIGIN || 'https://www.apcsexamprep.com').replace(/\/+$/, '');
const UA = 'Mozilla/5.0 (compatible; apcse-link-graph/1.0) Chrome/120.0.0.0 Safari/537.36';

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf('--' + n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const REPORT = opt('report', '');
const OUT = opt('out', '');
const DELAY = Number(opt('delay', '900'));
const BUDGET = Number(opt('budget', '400'));
const MAX_MINUTES = Number(opt('max-minutes', '20'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let delay = DELAY;
let strikes = 0;

// One hop only, deliberately. The question is "does this link land somewhere
// else", and the first Location answers it. Chasing the whole chain would cost
// a request per hop for no extra decision.
async function head(url) {
  try {
    const r = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': UA, Range: 'bytes=0-2048' },
      redirect: 'manual',
    });
    const loc = r.headers.get('location');
    return { status: r.status, location: loc ? new URL(loc, url).pathname : null };
  } catch (e) {
    return { status: 0, error: e.message, location: null };
  }
}

async function main() {
  const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
  const targets = report.dangling
    .slice()
    .sort((a, b) => b.in - a.in)              // most-linked first, so a truncated run still answers the ones that matter
    .slice(0, BUDGET);

  console.error(`resolving ${targets.length} off-sitemap link targets (of ${report.dangling.length})`);
  const deadline = Date.now() + MAX_MINUTES * 60000;
  const out = [];
  for (const t of targets) {
    if (Date.now() > deadline) { console.error('wall clock reached, stopping'); break; }
    if (strikes >= 5) { console.error('throttled five times, stopping'); break; }
    const res = await head(STORE + t.path);
    if (res.status === 429 || res.status === 503) { strikes++; delay = Math.min(delay * 2, 30000); }
    out.push({ path: t.path, inbound: t.in, status: res.status, location: res.location, from: t.from });
    await sleep(delay);
  }

  const by = (s) => out.filter((x) => x.status === s).length;
  console.log(`\nresolved ${out.length}`);
  console.log(`  200 (live, not in sitemap): ${by(200)} / ${out.filter((x) => x.status === 206).length} partial`);
  console.log(`  301/302 (redirect):         ${out.filter((x) => x.status >= 300 && x.status < 400).length}`);
  console.log(`  404 (broken):               ${by(404)}`);
  console.log('\nmost-linked redirecting targets:');
  for (const x of out.filter((r) => r.status >= 300 && r.status < 400).slice(0, 20)) {
    console.log(`  ${String(x.inbound).padStart(4)} links  ${x.path}  ->  ${x.location}`);
  }
  console.log('\nmost-linked BROKEN targets:');
  for (const x of out.filter((r) => r.status === 404).slice(0, 20)) {
    console.log(`  ${String(x.inbound).padStart(4)} links  ${x.path}`);
  }
  if (OUT) { fs.writeFileSync(OUT, JSON.stringify(out, null, 2)); console.error(`\nwrote ${OUT}`); }
}

main().catch((e) => { console.error(e); process.exit(1); });
