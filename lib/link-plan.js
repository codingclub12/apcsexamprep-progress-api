'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  LINK PLAN - decide which links each page should get, and in what order.
//
//  ── THE ARITHMETIC THAT DECIDES THE STRATEGY ────────────────────────────────
//  There are two ways to rescue a page nobody links:
//
//    edit the ORPHAN   add "back to hub" to the orphan. 1 page edited, 1 page
//                      rescued, and the orphan is still invisible to a reader
//                      browsing the hub.
//    edit the HUB      add the missing spokes to the hub. 1 page edited, up to
//                      12 pages rescued, and they are now BROWSABLE, which is
//                      the thing an inbound link is actually for.
//
//  So the plan is HUB-DOWN FIRST. Spoke-up links are still emitted, because a
//  page that cannot get back to its hub is a dead end, but they are second and
//  they are cheap. A pass that started with the orphans would edit 101 live
//  page bodies to buy what a dozen hub edits buy.
//
//  ── WHAT A GOOD SET OF LINKS LOOKS LIKE ─────────────────────────────────────
//  Four kinds, in priority order, because the block is capped and the cap has
//  to spend itself on the most valuable link first:
//
//    up        the cluster hub, then the unit hub, then the course hub. Without
//              this the page is a dead end.
//    down      for a hub: its own spokes. This is the orphan fix.
//    across    two or three siblings in the same cluster. This is what makes a
//              topic feel like a topic rather than a page.
//    onward    the next step for that role: a lesson points at its practice, a
//              study guide at its practice test.
//
//  ── WHAT THIS MODULE REFUSES TO DO ──────────────────────────────────────────
//  Invent a target. Every handle it emits came out of the crawl, so it exists.
//  lib/link-block.js checks that again against the live handle set before
//  rendering, because the crawl is a snapshot and a page can be unpublished
//  between the two.
// ─────────────────────────────────────────────────────────────────────────────

// Links proposed per page. The block caps at 8 including whatever is already
// there; proposing more than that lets the best link lose to an earlier
// mediocre one, so the planner ranks and the block truncates.
const PROPOSE_MAX = 10;
const SIBLINGS = 3;

// ── LABELS ───────────────────────────────────────────────────────────────────
//  Anchor text is the strongest on-page signal about the target, and this site
//  ships titles with a brand suffix and sometimes a duplicated one. A link
//  reading "AP CSA Course | Full Curriculum | APCSExamPrep.com | APCSExamPrep.com"
//  is worse than the handle. So the suffix is stripped, repeatedly, and the
//  first real segment is kept.
const BRAND = /\s*[|·-]\s*(APCSExamPrep(\.com)?|AP Exam Prep|AP CS Exam Prep)\s*$/i;

function label(title, handle) {
  let t = String(title || '').trim();
  let prev = null;
  while (t !== prev) { prev = t; t = t.replace(BRAND, '').trim(); }
  // A title that is still mostly pipes is a generated one; take its first part.
  if (t.includes('|')) t = t.split('|')[0].trim();
  if (!t) {
    t = String(handle || '').replace(/^(ap-csa|ap-csp|ap-cybersecurity|ap-cyber|ap-networking|intro-java)-/, '')
      .replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return t.slice(0, 90);
}

// ── ROLE ORDER ───────────────────────────────────────────────────────────────
//  Which role a page should point at next. Read as: a lesson's most useful
//  onward link is its exercise, then its quiz, then the unit's practice.
const ONWARD = {
  lesson: ['exercise', 'assessment', 'lab', 'practice-hub'],
  'unit-hub': ['lesson', 'assessment', 'practice-hub'],
  'course-hub': ['unit-hub', 'practice-hub', 'reference'],
  exercise: ['lesson', 'assessment'],
  assessment: ['lesson', 'practice-hub', 'reference'],
  reference: ['practice-hub', 'assessment', 'lesson'],
  'practice-hub': ['assessment', 'reference', 'lesson'],
  frq: ['frq', 'practice-hub', 'reference'],
  lab: ['lesson', 'assessment'],
  game: ['practice-hub', 'lesson'],
  project: ['lesson', 'unit-hub'],
};

// ── THE PLAN ─────────────────────────────────────────────────────────────────
//  nodes:    Map path -> node, from lib/link-graph buildGraph
//  clusters: [{ family, course, hub, members: [{path,...}] }] from the report
//  Returns   Map handle -> [{ handle, label, reason }]
function plan(nodes, clusters, opts = {}) {
  const max = opts.max || PROPOSE_MAX;
  const byPath = nodes;
  const handleOf = (p) => (String(p).match(/^\/pages\/([^/]+)$/) || [])[1] || null;
  const live = Array.from(nodes.values()).filter((x) => x.crawled && x.status === 200 && x.handle);

  // Course and unit hubs, resolved once.
  const courseHub = new Map();       // course -> node
  for (const x of live) {
    if (x.role !== 'course-hub' || !x.course) continue;
    const cur = courseHub.get(x.course);
    // The shortest handle wins: 'ap-csa' beats 'ap-csa-exam-prep-hub' as the
    // canonical course hub, which is also what the positioning audit proposes.
    if (!cur || x.handle.length < cur.handle.length) courseHub.set(x.course, x);
  }

  const clusterOf = new Map();       // path -> cluster
  for (const c of clusters) for (const m of c.members) clusterOf.set(m.path, c);
  //  A hub is not always a MEMBER of the family it heads: ap-cyber-unit-3 is
  //  headed by ap-cybersecurity-unit-3-securing-networks, which lives under the
  //  other prefix. Without this the hub page has no cluster of its own, never
  //  reads as a hub, and emits no down links at all, which is the entire point
  //  of the pass. Members win where both apply, so a page that heads one family
  //  and belongs to another still lists the family it heads.
  const headsCluster = new Map();    // hub path -> cluster
  for (const c of clusters) if (c.hub) headsCluster.set(c.hub, c);

  const out = new Map();
  const add = (fromHandle, target, reason, rank) => {
    if (!target || !target.handle || target.handle === fromHandle) return;
    if (!out.has(fromHandle)) out.set(fromHandle, []);
    const list = out.get(fromHandle);
    if (list.some((l) => l.handle === target.handle)) return;
    list.push({ handle: target.handle, label: label(target.title, target.handle), reason, rank });
  };

  for (const page of live) {
    const h = page.handle;
    const owned = headsCluster.get(page.path);          // the family this page heads
    const cluster = clusterOf.get(page.path);          // the family this page belongs to
    const hub = cluster && cluster.hub ? byPath.get(cluster.hub) : null;
    const isHub = !!owned;

    // 1. DOWN, and only for a hub. Orphans first: the whole point of the pass.
    if (owned) {
      const spokes = owned.members
        .filter((m) => m.path !== page.path)
        .map((m) => byPath.get(m.path))
        .filter(Boolean)
        .sort((a, b) => a.inBody - b.inBody || a.path.localeCompare(b.path));
      spokes.forEach((s, i) => add(h, s, s.inBody === 0 ? 'down: orphaned spoke' : 'down: spoke', 10 + i));
    }

    // 2. UP. A page that cannot reach its own hub is a dead end.
    if (!isHub && hub) add(h, hub, 'up: cluster hub', 0);
    const ch = page.course ? courseHub.get(page.course) : null;
    if (ch && ch.path !== page.path) add(h, ch, 'up: course hub', 1);

    // 3. ACROSS. Siblings, least-linked first, so the pass spreads inbound
    //    links rather than piling them on whatever is already popular.
    if (cluster && !isHub) {
      cluster.members
        .filter((m) => m.path !== page.path && (!hub || m.path !== hub.path))
        .map((m) => byPath.get(m.path)).filter(Boolean)
        .sort((a, b) => a.inBody - b.inBody)
        .slice(0, SIBLINGS)
        .forEach((s, i) => add(h, s, 'across: sibling', 20 + i));
    }

    // 4. ONWARD. Same course, the roles this role should hand off to.
    const wants = ONWARD[page.role] || [];
    wants.forEach((role, ri) => {
      const pick = live
        .filter((x) => x.course === page.course && x.role === role && x.path !== page.path)
        .sort((a, b) => a.inBody - b.inBody)[0];
      if (pick) add(h, pick, `onward: ${role}`, 30 + ri);
    });
  }

  for (const [h, list] of out) {
    list.sort((a, b) => a.rank - b.rank);
    out.set(h, list.slice(0, max));
  }
  return out;
}

module.exports = { PROPOSE_MAX, SIBLINGS, BRAND, label, ONWARD, plan };
