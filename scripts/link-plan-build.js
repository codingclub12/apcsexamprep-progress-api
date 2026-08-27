#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  BUILD THE LINK PLAN from a crawl.
//
//  Reads the NDJSON, rebuilds the graph, and writes handle -> [links] for every
//  live page. Hub-down first, per lib/link-plan.js.
//
//  --orphans-only restricts the plan to pages that would actually rescue an
//  orphan: the hubs whose spokes have no inbound link, plus those spokes. That
//  is the batch worth importing first, and it is a fraction of the site.
//
//    node scripts/link-plan-build.js --in graph.ndjson --out plan.json
//    node scripts/link-plan-build.js --in graph.ndjson --out plan.json --orphans-only
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const G = require('../lib/link-graph');
const P = require('../lib/link-plan');

const argv = process.argv.slice(2);
const flag = (nm) => argv.includes('--' + nm);
const opt = (nm, d) => {
  const i = argv.indexOf('--' + nm);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const IN = opt('in', '');
const OUT = opt('out', '');
const HANDLES = opt('handles', '');
const ORPHANS_ONLY = flag('orphans-only');

function main() {
  const pages = fs.readFileSync(IN, 'utf8').split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
  const graph = G.buildGraph(pages);
  const live = Array.from(graph.nodes.values()).filter((x) => x.crawled && x.status === 200);
  const clusters = G.resolveClusters(live);
  const plan = P.plan(graph.nodes, clusters);

  // Only propose links to handles the sitemap still advertises. The crawl is a
  // snapshot; lib/link-block.js checks this again at render time, but dropping
  // them here keeps the plan honest about its own size.
  let liveHandles = null;
  if (HANDLES) {
    liveHandles = new Set(fs.readFileSync(HANDLES, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean));
  }

  const out = {};
  let dropped = 0;
  for (const [handle, links] of plan) {
    const keep = liveHandles ? links.filter((l) => {
      if (liveHandles.has(l.handle)) return true;
      dropped += 1; return false;
    }) : links;
    if (keep.length) out[handle] = keep;
  }

  let selected = out;
  if (ORPHANS_ONLY) {
    // A page is worth editing in this batch if it would give an orphan its
    // first inbound link, or if it IS an orphan and has nowhere to go.
    //  Only the pages that actually RESCUE something: a page whose plan carries
    //  at least one link to an orphan. An orphan's own outbound links do not
    //  rescue it, so including orphans here just inflates the batch.
    selected = {};
    for (const [handle, links] of Object.entries(out)) {
      if (links.some((l) => l.reason === 'down: orphaned spoke')) selected[handle] = links;
    }
  }

  fs.writeFileSync(OUT, JSON.stringify(selected, null, 2));
  const total = Object.values(selected).reduce((s, v) => s + v.length, 0);
  const byReason = {};
  for (const ls of Object.values(selected)) for (const l of ls) {
    const k = l.reason.split(':')[0];
    byReason[k] = (byReason[k] || 0) + 1;
  }
  console.log(`live pages: ${live.length}`);
  console.log(`planned:    ${Object.keys(selected).length} pages, ${total} links`);
  console.log(`  by kind:  ${Object.entries(byReason).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  if (liveHandles) console.log(`  dropped ${dropped} targets not in the live handle set`);
  console.log(`wrote ${OUT}`);
}

main();
