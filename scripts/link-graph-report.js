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

// ── CLUSTERS ─────────────────────────────────────────────────────────────────
//  The family root of a handle: course prefix plus the first one or two topic
//  words. Two words rather than one because 'ap-csa-array' and
//  'ap-csa-arraylist' are different families and a one-word cut merges them.
const COURSE_PREFIXES = [
  'ap-cybersecurity', 'ap-networking', 'ap-cyber', 'ap-csa', 'ap-csp', 'intro-java',
];

function familyOf(handle) {
  if (!handle) return null;
  const prefix = COURSE_PREFIXES.find((p) => handle === p || handle.startsWith(p + '-'));
  if (!prefix) return null;
  const rest = handle.slice(prefix.length).replace(/^-/, '');
  if (!rest) return null;
  const words = rest.split('-');
  // Numbered structures ('unit-3-lesson-2-quiz') family on the numbered stem so
  // every activity for a lesson lands together.
  const numbered = rest.match(/^((?:unit|big-idea|bi|topic|lesson)-\d+(?:-\d+)?)/);
  if (numbered) return `${prefix}-${numbered[1]}`;
  return `${prefix}-${words.slice(0, 2).join('-')}`;
}

function main() {
  const pages = load(IN);
  const graph = G.buildGraph(pages);
  const a = G.analyze(graph);
  const nodes = Array.from(graph.nodes.values());
  const live = nodes.filter((x) => x.crawled && x.status === 200);

  // ── clusters ──
  //  Hub detection is deliberately generous, because a false "no hub here"
  //  proposes building a page that already exists under a different word order.
  //  Three ways a member can be the hub of its family:
  //
  //    exact      handle === family                    ap-csa-2d-array
  //    suffixed   family + course|hub|overview|home    ap-csa-unit-1-course
  //    anagram    same tokens, different order         ap-csa-frq-2004 for
  //                                                    family ap-csa-2004-frq
  //
  //  The anagram rule is not a nicety: the whole FRQ archive is stored as
  //  ap-csa-frq-YYYY with members ap-csa-YYYY-frq-N, and without it every one
  //  of the 22 year hubs reads as missing.
  const HUB_SUFFIXES = ['course', 'hub', 'overview', 'home', 'index', 'topics'];
  const tokenKey = (h) => h.split('-').sort().join('-');

  const clusters = new Map();
  for (const x of live) {
    if (!x.handle) continue;
    const fam = familyOf(x.handle);
    if (!fam) continue;
    if (!clusters.has(fam)) clusters.set(fam, { family: fam, course: x.course, members: [], hub: null });
    clusters.get(fam).members.push(x);
  }
  // Hubs are resolved against every live page, not only cluster members: the
  // hub of ap-csa-2d-array-* may sit outside the family by handle shape.
  const byHandle = new Map(live.filter((x) => x.handle).map((x) => [x.handle, x]));
  const byTokens = new Map();
  for (const x of live) if (x.handle) byTokens.set(tokenKey(x.handle), x);
  for (const c of clusters.values()) {
    c.hub = byHandle.get(c.family)
      || HUB_SUFFIXES.map((s) => byHandle.get(`${c.family}-${s}`)).find(Boolean)
      || byTokens.get(tokenKey(c.family))
      || null;
  }
  const clusterList = Array.from(clusters.values()).map((c) => {
    const inbound = c.members.reduce((s, m) => s + m.inBody, 0);
    const orphans = c.members.filter((m) => m.inBody === 0).length;
    // Internal cohesion: body edges that stay inside the cluster.
    const paths = new Set(c.members.map((m) => m.path));
    let internal = 0;
    for (const m of c.members) for (const t of m.outTo) if (paths.has(t)) internal++;
    return {
      family: c.family, course: c.course, size: c.members.length,
      hub: c.hub ? c.hub.path : null,
      hubInside: c.hub ? c.members.some((m) => m.path === c.hub.path) : false,
      orphans, inbound, internal,
      members: c.members.map((m) => ({ path: m.path, title: m.title, role: m.role, in: m.inBody, out: m.outBody })),
    };
  }).sort((x, y) => y.size - x.size);

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

  const byRole = {};
  for (const x of live) {
    byRole[x.role] = byRole[x.role] || { role: x.role, pages: 0, orphans: 0, avgIn: 0, totalIn: 0 };
    byRole[x.role].pages++;
    byRole[x.role].totalIn += x.inBody;
    if (x.inBody === 0) byRole[x.role].orphans++;
  }
  for (const r of Object.values(byRole)) r.avgIn = +(r.totalIn / r.pages).toFixed(1);

  const depthHist = {};
  for (const x of live) {
    const d = a.depth.has(x.path) ? a.depth.get(x.path) : 'unreachable';
    depthHist[d] = (depthHist[d] || 0) + 1;
  }

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
    byCourse: a.byCourse,
    byRole: Object.values(byRole).sort((p, q) => q.pages - p.pages),
    hubs: a.hubs,
    orphans: a.orphans.map(slim).sort((p, q) => (p.course || '').localeCompare(q.course || '') || p.path.localeCompare(q.path)),
    nearOrphans: a.nearOrphans.map(slim),
    deadEnds: a.deadEnds.map(slim),
    broken: a.broken.map((x) => ({ path: x.path, status: x.status, in: x.inBody })),
    dangling: a.dangling.map((x) => ({ path: x.path, in: x.inBody, from: x.inFrom.slice(0, 5) })),
    clusters: clusterList,
    missingHubs,
    brokenClusters,
    chromeTargets: Array.from(graph.chromeTargets).sort(),
  };

  if (JSON_OUT) {
    fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
    console.error(`wrote ${JSON_OUT}`);
  }

  const t = report.totals;
  console.log(`crawled ${t.crawled}  live ${t.live}  broken ${t.broken}`);
  console.log(`body edges ${t.bodyEdges}  chrome targets ${t.chromeTargets}`);
  console.log(`ORPHANS (0 inbound body links): ${t.orphans}`);
  console.log(`near-orphans (1): ${t.nearOrphans}   dead ends (0 outbound): ${t.deadEnds}`);
  console.log(`unreachable from home by content links: ${t.unreachable}`);
  console.log(`links to pages not in sitemap: ${t.dangling}`);
  console.log(`\nclusters ${clusterList.length}, of which ${missingHubs.length} have no hub page`);
  console.log('\ntop clusters with no hub:');
  for (const c of missingHubs.slice(0, 15)) {
    console.log(`  ${String(c.size).padStart(3)} pages  ${c.orphans} orphaned  ${c.family}`);
  }
  console.log('\ndepth from home (content links only):');
  for (const k of Object.keys(depthHist).sort()) console.log(`  ${String(k).padStart(11)}: ${depthHist[k]}`);
}

main();
