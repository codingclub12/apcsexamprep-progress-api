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
//  --targets <file> is the same idea driven by evidence instead of by the crawl.
//  The file lists handles that MATTER for an outside reason, one per line. The
//  plan is then cut to pages that link at least one of them, and every target
//  that appears in the plan is promoted to the top of its page's link list so
//  the block cap cannot spend itself on a sibling first.
//
//  It exists because the crawl alone picked the wrong pages. Search Console's
//  internal-link export showed that most of this site's orphans sit in the
//  mega-menu and are linked roughly 1,480 times, while a different 355 live
//  pages rank in search with no internal links at all. Those are the ones an
//  inbound link changes something for, and no amount of crawling could say so.
//
//    node scripts/link-plan-build.js --in graph.ndjson --out plan.json
//    node scripts/link-plan-build.js --in graph.ndjson --out plan.json --orphans-only
//    node scripts/link-plan-build.js --in graph.ndjson --out plan.json --targets t.txt
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
const TARGETS = opt('targets', '');

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

  if (TARGETS) {
    const want = new Set(fs.readFileSync(TARGETS, 'utf8').split('\n').map((x) => x.trim()).filter(Boolean));
    //  Promote before cutting. A target that ranks in search but sits eighth in
    //  a page's link list is dropped by the block cap and the pass does nothing
    //  for it, which is the failure this mode exists to avoid.
    selected = {};
    let promoted = 0;
    for (const [handle, links] of Object.entries(out)) {
      const hits = links.filter((l) => want.has(l.handle));
      if (!hits.length) continue;
      const rest = links.filter((l) => !want.has(l.handle));
      for (const h of hits) h.reason = `${h.reason} [ranks, unlinked]`;
      promoted += hits.length;
      selected[handle] = [...hits, ...rest];
    }
    const reached = new Set();
    for (const ls of Object.values(selected)) for (const l of ls) if (want.has(l.handle)) reached.add(l.handle);
    console.log(`targets: ${want.size} requested, ${reached.size} reachable from some hub, ${promoted} links promoted`);
    //  ── ROLE-AFFINITY FALLBACK ───────────────────────────────────────────
    //  Cluster families are two topic words wide, which is right for
    //  ap-csa-2d-array-* and wrong for the one-off pages: ap-csa-jeopardy-game
    //  becomes its own single-member family and therefore its own hub, so
    //  hub-down never reaches it even though ap-csa-study-games-hub is sitting
    //  right there. 194 of 355 targets landed in that hole.
    //
    //  So a target no cluster reaches is offered to the best INDEX page in its
    //  own course, matched on role. Course hub is the last resort. A target
    //  whose course has no such page is still reported unreached rather than
    //  attached to something arbitrary.
    const INDEX_FOR = [
      [/-game$/, /study-games-hub|games-hub/],
      [/-frq|frq-/, /frq-archive|frqs-by-topic/],
      [/practice-test|practice-exam|-quiz$|-exam$/, /practice-tests-by-topic|practice-exams|unit-tests-hub/],
      [/flashcard|vocabulary|cheat-sheet|reference|cram/, /study-guides|reference-sheet|topics$/],
    ];
    const byHandle = new Map(live.filter((x) => x.handle).map((x) => [x.handle, x]));
    const courseHubs = new Map();
    for (const x of live) {
      if (!x.course || !x.handle) continue;
      const cur = courseHubs.get(x.course);
      if (x.role === 'course-hub' && (!cur || x.handle.length < cur.handle.length)) courseHubs.set(x.course, x);
    }
    let attached = 0;
    for (const h of Array.from(want)) {
      if (reached.has(h)) continue;
      const node = byHandle.get(h);
      if (!node || !node.course) continue;
      let index = null;
      for (const [pat, hubPat] of INDEX_FOR) {
        if (!pat.test(h)) continue;
        index = live.find((x) => x.course === node.course && x.handle && hubPat.test(x.handle) && x.handle !== h);
        if (index) break;
      }
      if (!index) {
        //  ── SPREAD, DO NOT PILE ─────────────────────────────────────────
        //  Falling back to the single course hub put 75 targets on
        //  ap-cybersecurity-course and 36 on ap-csp-course. Even at the hub
        //  cap of 24 the tail is dropped, which is how ap-csp-ced-explained
        //  (249 clicks, no internal links) stayed unlinked through two
        //  rounds of this. So the course's index pages share the load, and
        //  each target goes to whichever currently carries the fewest.
        const shelves = live.filter((x) => x.course === node.course && x.handle
          && (x.role === 'course-hub' || x.role === 'unit-hub' || x.role === 'practice-hub'
            || /topics$|study-guides$|-hub$|by-topic$/.test(x.handle)));
        const pool = shelves.length ? shelves : [courseHubs.get(node.course)].filter(Boolean);
        if (!pool.length) continue;
        index = pool.reduce((best, cand) => {
          const load = (selected[cand.handle] || out[cand.handle] || []).length;
          const bestLoad = (selected[best.handle] || out[best.handle] || []).length;
          return load < bestLoad ? cand : best;
        }, pool[0]);
      }
      if (!index || index.handle === h) continue;
      const label = P.label(node.title, node.handle);
      const list = selected[index.handle] || out[index.handle] || [];
      if (list.some((l) => l.handle === h)) { reached.add(h); continue; }
      selected[index.handle] = [{ handle: h, label, reason: 'down: ranks, unlinked, no cluster hub [ranks, unlinked]', rank: -1 }, ...list];
      reached.add(h); attached += 1;
    }
    if (attached) console.log(`  ${attached} target(s) attached to a role-matched index page instead of a cluster hub`);

    const missed = Array.from(want).filter((h) => !reached.has(h));
    if (missed.length) {
      //  Reported, never silent. A target no hub can reach needs a hub built or
      //  a cluster assigned; it is not something this pass can fix by itself.
      console.log(`  ${missed.length} target(s) no hub reaches, so no link is planned for them:`);
      for (const h of missed.slice(0, 12)) console.log(`      ${h}`);
      if (missed.length > 12) console.log(`      ... and ${missed.length - 12} more`);
      fs.writeFileSync(OUT.replace(/\.json$/, '') + '-unreachable.txt', missed.join('\n') + '\n');
    }
  }

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
