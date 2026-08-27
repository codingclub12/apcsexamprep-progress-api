#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  LINK GRAPH REPORT - turn a crawl into an architecture.
//
//  Reads the NDJSON that scripts/link-graph.js writes and answers the questions
//  a linking pass actually needs:
//
//    - which pages nobody can reach without the sitemap (in-body degree 0)
//    - which pages lead nowhere (out-body degree 0)
//    - how many clicks from home, following CONTENT links only
//    - which clusters have a hub and which are a pile of siblings
//    - which hubs the taxonomy implies but the sitemap does not contain
//
//  ── THE CLUSTER MODEL ───────────────────────────────────────────────────────
//  A cluster is (course, topic-family), derived from the handle. Handles on this
//  site are the taxonomy: 'ap-csa-2d-array-cheat-sheet' and
//  'ap-csa-2d-array-mistakes' are siblings whether or not anything links them.
//  A cluster with three or more members and no page whose handle is the family
//  root is a MISSING HUB, and that is a finding rather than a guess: the pages
//  already agree they belong together.
//
//    node scripts/link-graph-report.js --in graph.ndjson --json report.json
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const G = require('../lib/link-graph');

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf('--' + n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const IN = opt('in', '/tmp/link-graph.ndjson');
const JSON_OUT = opt('json', '');

function load(file) {
  const pages = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { pages.push(JSON.parse(line)); } catch (e) { /* truncated tail */ }
  }
  return pages;
}

function main() {
  const pages = load(IN);
  const graph = G.buildGraph(pages);
  const a = G.analyze(graph);
  const nodes = Array.from(graph.nodes.values());
  const live = nodes.filter((x) => x.crawled && x.status === 200);

  // ── clusters ──
  //  Family grouping and hub resolution live in lib/link-graph.js so they can be
  //  pinned offline. They carry the site's naming irregularities (two cyber
  //  prefixes, bi3 against big-idea-3, singular against plural) and every one of
  //  those rules decides whether a report proposes building a page that is
  //  already live.
  const clusterList = G.resolveClusters(live);

  // A cluster of 3+ with no root page is a hub the taxonomy implies and the
  // site does not have.
  const missingHubs = clusterList
    .filter((c) => c.size >= 3 && !c.hub)
    .sort((x, y) => y.size - x.size);

  // Clusters whose members are mostly unreachable: the hub exists but is not
  // doing its job, or does not exist at all.
  const brokenClusters = clusterList
    .filter((c) => c.size >= 3 && c.orphans / c.size >= 0.5)
    .sort((x, y) => y.orphans - x.orphans);

  //  ── COURSE-LEVEL HUBS ─────────────────────────────────────────────────────
  //  Cluster analysis cannot see this one. A course can have every topic
  //  cluster properly hubbed and still have no page that is the COURSE, which
  //  is what Intro to Java looks like today: 109 live pages, six unit pages,
  //  and no root anyone can land on.
  const courseRoots = new Map();
  for (const x of live) {
    if (!x.course) continue;
    if (!courseRoots.has(x.course)) courseRoots.set(x.course, { course: x.course, pages: 0, hubs: [] });
    const c = courseRoots.get(x.course);
    c.pages++;
    if (x.role === 'course-hub') c.hubs.push({ path: x.path, title: x.title, in: x.inBody, out: x.outBody });
  }
  const missingCourseHubs = Array.from(courseRoots.values())
    .filter((c) => c.hubs.length === 0)
    .sort((a, b) => b.pages - a.pages);

  const byRole = {};
  for (const x of live) {
    byRole[x.role] = byRole[x.role] || { role: x.role, pages: 0, orphans: 0, avgIn: 0, totalIn: 0 };
    byRole[x.role].pages++;
    byRole[x.role].totalIn += x.inBody;
    if (x.inBody === 0) byRole[x.role].orphans++;
  }
  for (const r of Object.values(byRole)) r.avgIn = +(r.totalIn / r.pages).toFixed(1);

  const hist = (map) => {
    const h = {};
    for (const x of live) {
      const d = map.has(x.path) ? map.get(x.path) : 'unreachable';
      h[d] = (h[d] || 0) + 1;
    }
    return h;
  };
  const depthHist = hist(a.depth);
  const homeDepthHist = hist(a.homeDepth);

  const slim = (x) => ({
    path: x.path, title: x.title, h1: x.h1 || '', course: x.course, role: x.role,
    in: x.inBody, out: x.outBody, inChrome: x.inChrome,
    depth: a.depth.has(x.path) ? a.depth.get(x.path) : null,
  });

  const report = {
    generated: new Date().toISOString(),
    source: IN,
    totals: a.totals,
    depthHistogram: depthHist,
    homeDepthHistogram: homeDepthHist,
    navFrontierSize: a.navFrontierSize,
    byCourse: a.byCourse,
    byRole: Object.values(byRole).sort((p, q) => q.pages - p.pages),
    hubs: a.hubs,
    orphans: a.orphans.map(slim).sort((p, q) => (p.course || '').localeCompare(q.course || '') || p.path.localeCompare(q.path)),
    nearOrphans: a.nearOrphans.map(slim),
    deadEnds: a.deadEnds.map(slim),
    broken: a.broken.map((x) => ({ path: x.path, status: x.status, in: x.inBody })),
    throttled: a.throttled.map((x) => ({ path: x.path, status: x.status })),
    dangling: a.dangling.map((x) => ({ path: x.path, in: x.inBody, from: x.inFrom.slice(0, 5) })),
    clusters: clusterList,
    missingHubs,
    missingCourseHubs,
    courseRoots: Array.from(courseRoots.values()).sort((a, b) => b.pages - a.pages),
    brokenClusters,
    chromeTargets: Array.from(graph.chromeTargets).sort(),
  };

  if (JSON_OUT) {
    fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
    console.error(`wrote ${JSON_OUT}`);
  }

  const t = report.totals;
  console.log(`crawled ${t.crawled}  live ${t.live}  broken ${t.broken}  throttled-not-verified ${t.throttled}`);
  console.log(`body edges ${t.bodyEdges}  chrome targets ${t.chromeTargets}`);
  console.log(`ORPHANS (0 inbound body links): ${t.orphans}`);
  console.log(`near-orphans (1): ${t.nearOrphans}   dead ends (0 outbound): ${t.deadEnds}`);
  console.log(`unreachable from home by content links: ${t.unreachable}`);
  console.log(`links to pages not in sitemap: ${t.dangling}`);
  console.log(`\nclusters ${clusterList.length}, of which ${missingHubs.length} have no hub page`);
  if (missingCourseHubs.length) {
    console.log('\nCOURSES WITH NO COURSE HUB AT ALL:');
    for (const c of missingCourseHubs) console.log(`  ${c.course}: ${c.pages} live pages, no course-hub page`);
  }
  console.log('\ntop clusters with no hub:');
  for (const c of missingHubs.slice(0, 15)) {
    console.log(`  ${String(c.size).padStart(3)} pages  ${c.orphans} orphaned  ${c.family}`);
  }
  console.log(`\ncontent-link depth from the nav frontier (${a.navFrontierSize} seeds):`);
  for (const k of Object.keys(depthHist).sort()) console.log(`  ${String(k).padStart(11)}: ${depthHist[k]}`);
  console.log('\nfor contrast, from the homepage alone:');
  for (const k of Object.keys(homeDepthHist).sort()) console.log(`  ${String(k).padStart(11)}: ${homeDepthHist[k]}`);
}

main();
