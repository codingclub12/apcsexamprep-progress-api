'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  LINK GRAPH - what links to what, and which of those links a student can see.
//
//  site-crawl.js asks "is this page broken". This module asks a different
//  question: "can anyone GET here". They need different parsers, and the reason
//  is one number. Every page on this storefront renders roughly 135
//  apcs-dropdown-link anchors before the content starts. Count anchors naively
//  and all 1,344 pages come back richly interlinked, including the 101 that
//  board task 73 says nobody can reach.
//
//  So every link is placed in a ZONE, and only one zone counts as architecture:
//
//    chrome    header, nav, footer, breadcrumbs, the mega-menu. Identical on
//              every render. Tells you nothing about whether THIS page is
//              connected to anything, because it is the same on the page that
//              is and the page that is not.
//    body      an anchor an author put inside the content. This is the graph.
//
//  Zone is decided TWICE and the stricter answer wins:
//
//    STRUCTURAL   the anchor sits inside <header>, <footer>, <nav>, or a
//                 Shopify section whose id says header/footer/menu/announcement.
//    UBIQUITY     the target is linked from more than CHROME_UBIQUITY of all
//                 crawled pages. A target on 1,300 of 1,344 pages is chrome no
//                 matter what element wraps it.
//
//  Ubiquity is the load-bearing half. Theme markup changes; a link on every
//  page is boilerplate under any markup. It also needs the whole crawl before
//  it can be computed, which is why zone is finalised in buildGraph() and not
//  while parsing.
//
//  ── MEMORY ────────────────────────────────────────────────────────────────
//  Pages run 350-750KB and there are 1,344 of them. Bodies are parsed and
//  dropped by the caller. What survives is interned: every path is stored once
//  in a string table and edges are pairs of integers into it. Anchor text is
//  kept for body links only, capped, because that is the half a human reads.
//  Holding raw hrefs for ~230,000 edges is the shape of the unbounded array
//  this repo has already paid for once.
// ─────────────────────────────────────────────────────────────────────────────

// A target linked from more than this share of crawled pages is boilerplate.
// 0.35 rather than 0.9: the mega-menu is course-scoped, so a CSA nav block can
// legitimately appear on only the ~600 CSA pages and is still chrome.
const CHROME_UBIQUITY = 0.35;

// Anchor text is evidence, not content. Enough to tell "Unit 3 Overview" from
// "click here"; not enough to accumulate.
const ANCHOR_MAX = 120;

const LINK_IGNORE = [
  /^\/account/, /^\/cart/, /^\/checkout/, /^\/challenge/,
  /^\/search/, /^\/cdn-cgi\//, /^\/[a-z]{2}-[a-z]{2}\//, /^\/apps\//,
  /^\/tools\//, /^\/policies\//, /^\/\.well-known/,
];

// ── ZONE: THE STRUCTURAL HALF ────────────────────────────────────────────────
//  Cut the regions that are the same on every render. Non-greedy and anchored
//  to the opening tag so a stray </footer> in a code sample cannot swallow the
//  page. Shopify wraps sections in <div id="shopify-section-...">, which is the
//  most reliable handle on this theme.
const CHROME_REGIONS = [
  /<header[\s>][\s\S]*?<\/header>/gi,
  /<footer[\s>][\s\S]*?<\/footer>/gi,
  /<nav[\s>][\s\S]*?<\/nav>/gi,
  /<div[^>]+id=["']shopify-section-[^"']*(?:header|footer|menu|announcement)[^"']*["'][\s\S]*?<\/div>\s*(?=<div[^>]+id=["']shopify-section-|<main|<footer)/gi,
  // The site's own dropdown mega-menu, which is emitted inside the body on some
  // templates rather than inside <nav>.
  /<div[^>]+class=["'][^"']*apcs-dropdown[^"']*["'][\s\S]*?<\/div>/gi,
  /<ul[^>]+class=["'][^"']*(?:breadcrumb|apcs-nav|site-nav)[^"']*["'][\s\S]*?<\/ul>/gi,
];

// Code samples on lesson pages contain arbitrary text including angle brackets.
// site-crawl.js learned this the hard way; the same rule applies here.
function stripCode(html) {
  return String(html)
    .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')
    .replace(/<code[\s\S]*?<\/code>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

// Returns the html with chrome regions blanked out, same length semantics not
// required - only which anchors survive matters.
function bodyOnly(html) {
  let out = String(html);
  for (const re of CHROME_REGIONS) out = out.replace(re, ' ');
  return out;
}

function isInternal(href) {
  if (!href) return false;
  if (/^(mailto:|tel:|javascript:|#|data:)/i.test(href)) return false;
  if (/^https?:\/\//i.test(href)) {
    // Our own absolute links are internal; everything else is somebody else's.
    return /^https?:\/\/(www\.)?apcsexamprep\.com(\/|$)/i.test(href);
  }
  return href.startsWith('/');
}

// Path only, no host, no query, no fragment, no trailing slash. '/pages/x' and
// 'https://www.apcsexamprep.com/pages/x/?ref=nav#top' are one node.
function normalize(href) {
  let p = String(href).trim();
  p = p.replace(/^https?:\/\/[^/]+/i, '');
  p = p.split('#')[0].split('?')[0];
  p = p.replace(/\/+$/, '');
  if (!p) return '/';
  return p.toLowerCase();
}

function isIgnored(path) {
  return LINK_IGNORE.some((re) => re.test(path));
}

function textOf(fragment) {
  return String(fragment)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, ANCHOR_MAX);
}

// ── EXTRACT ──────────────────────────────────────────────────────────────────
//  One pass over the code-stripped html, one over the body-only version, and
//  the difference between the two anchor sets is the chrome. Deduplicated per
//  page: a page that links the same target six times is one edge with the best
//  anchor text, not six.
function extractLinks(html) {
  const clean = stripCode(html);
  const body = stripCode(bodyOnly(html));

  const grab = (src) => {
    const out = new Map();
    const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(src))) {
      const attrs = m[1];
      const hrefM = attrs.match(/\bhref=["']([^"']*)["']/i);
      if (!hrefM) continue;
      const href = hrefM[1];
      if (!isInternal(href)) continue;
      const path = normalize(href);
      if (path === '/' || isIgnored(path)) continue;
      const anchor = textOf(m[2]);
      const prev = out.get(path);
      // Longest anchor text wins: an icon-only repeat of a link should not
      // erase the one that carried words.
      if (!prev || anchor.length > prev.length) out.set(path, anchor);
    }
    return out;
  };

  const all = grab(clean);
  const inBody = grab(body);
  const links = [];
  for (const [path, anchor] of all) {
    links.push({ path, anchor, zone: inBody.has(path) ? 'body' : 'chrome' });
  }
  return links;
}

// ── ROLE: WHAT KIND OF NODE IS THIS ──────────────────────────────────────────
//  Derived from the handle, because on this site the handle IS the taxonomy.
//  Order matters: the most specific pattern must be tested first, since
//  'ap-csa-lesson-1-2-loops' also matches the looser course prefixes.
const COURSES = [
  { key: 'ap-csa', label: 'AP CSA', match: /^ap-csa\b|^codehs-ap-csa/ },
  { key: 'ap-csp', label: 'AP CSP', match: /^ap-csp\b|^codehs-ap-csp/ },
  { key: 'ap-cyber', label: 'AP Cybersecurity', match: /^ap-cyber(security)?\b/ },
  { key: 'ap-networking', label: 'AP Networking', match: /^ap-networking\b/ },
  { key: 'intro-java', label: 'Intro to Java', match: /^intro-java\b/ },
];

function courseOf(handle) {
  if (!handle) return null;
  const hit = COURSES.find((c) => c.match.test(handle));
  return hit ? hit.key : null;
}

// The roles a page can play in a hub-and-spoke architecture. 'hub' and 'spoke'
// are the two that matter; the rest exist so a report can say WHICH kind.
const ROLE_RULES = [
  [/^(ap-[a-z-]+|intro-java)-(course-hub|hub|course)$/, 'course-hub'],
  [/(command-center|course-home|course-overview)/, 'course-hub'],
  [/^(ap-[a-z-]+|intro-java)-unit-\d+$/, 'unit-hub'],
  [/^ap-csp-(big-idea|bi)-\d+$/, 'unit-hub'],
  [/-(unit|big-idea)-\d+-(overview|hub|home)$/, 'unit-hub'],
  [/(-lesson-|-topic-)/, 'lesson'],
  [/^ap-cyber-unit-\d+-\d+/, 'lesson'],
  [/(-exercise|-ex-\d|-practice-problem)/, 'exercise'],
  [/(-quiz|-test|-exam|-mcq)/, 'assessment'],
  [/-frq/, 'frq'],
  [/-lab\b|-lab-/, 'lab'],
  [/-game/, 'game'],
  [/-project/, 'project'],
  [/-help/, 'help'],
  [/(study-guide|cheat-sheet|reference|glossary|formula)/, 'reference'],
  [/(practice|review)/, 'practice-hub'],
  [/(teacher|educator|classroom|pacing|syllabus)/, 'teacher'],
];

function roleOf(path, handle) {
  if (path === '/') return 'home';
  if (path.startsWith('/collections')) return 'collection';
  if (path.startsWith('/products')) return 'product';
  if (/^\/blogs\/[^/]+\/[^/]+/.test(path)) return 'article';
  if (/^\/blogs\/[^/]+$/.test(path)) return 'blog-index';
  if (!handle) return 'other';
  for (const [re, role] of ROLE_RULES) if (re.test(handle)) return role;
  return 'page';
}

function handleOf(path) {
  const m = String(path).match(/^\/pages\/([^/]+)$/);
  return m ? m[1] : null;
}

// ── THE GRAPH ────────────────────────────────────────────────────────────────
//  pages: [{ url|path, status, title, links:[{path,anchor,zone}] }]
//  Nodes come from two places: pages actually crawled, and link targets that
//  were never crawled. The second set is how a link to a page that does not
//  exist shows up as a node with no crawl record.
function buildGraph(pages, opts = {}) {
  const ubiquity = opts.ubiquity == null ? CHROME_UBIQUITY : opts.ubiquity;
  const crawled = pages.filter((p) => p && p.path);
  const n = crawled.length || 1;

  // Pass 1: how many distinct pages link each target at all. This is what
  // demotes a structurally-body link to chrome.
  //  Self-links are excluded HERE as well as from the edge pass. A page linking
  //  itself is not evidence that the target is boilerplate, and counting it lets
  //  a page in a small crawl push its own target over the ubiquity threshold and
  //  demote a real content link to chrome. Found by smoke/link-graph.js.
  const linkedFrom = new Map();
  for (const p of crawled) {
    const seen = new Set();
    for (const l of p.links || []) {
      if (l.path === p.path) continue;
      if (seen.has(l.path)) continue;
      seen.add(l.path);
      linkedFrom.set(l.path, (linkedFrom.get(l.path) || 0) + 1);
    }
  }
  const chromeTargets = new Set();
  for (const [path, count] of linkedFrom) {
    if (count / n > ubiquity) chromeTargets.add(path);
  }

  // Pass 2: nodes.
  const nodes = new Map();
  const node = (path) => {
    let x = nodes.get(path);
    if (!x) {
      const handle = handleOf(path);
      x = {
        path, handle,
        course: courseOf(handle),
        role: roleOf(path, handle),
        title: '', status: null, crawled: false,
        inBody: 0, inChrome: 0, outBody: 0, outChrome: 0,
        inFrom: [], outTo: [],
      };
      nodes.set(path, x);
    }
    return x;
  };

  for (const p of crawled) {
    const x = node(p.path);
    x.crawled = true;
    x.status = p.status;
    x.title = p.title || '';
    if (p.h1) x.h1 = p.h1;
    if (p.role) x.role = p.role;
  }

  // Pass 3: edges, with zone finalised.
  const edges = [];
  for (const p of crawled) {
    const from = node(p.path);
    for (const l of p.links || []) {
      if (l.path === p.path) continue;               // self-link is not an edge
      const zone = chromeTargets.has(l.path) ? 'chrome' : l.zone;
      const to = node(l.path);
      if (zone === 'body') {
        from.outBody++; to.inBody++;
        from.outTo.push(l.path); to.inFrom.push(p.path);
        edges.push({ from: p.path, to: l.path, anchor: l.anchor, zone });
      } else {
        from.outChrome++; to.inChrome++;
      }
    }
  }

  return { nodes, edges, chromeTargets, crawledCount: crawled.length };
}

// ── DEPTH ────────────────────────────────────────────────────────────────────
//  Clicks from the homepage using BODY links only. Chrome would make everything
//  depth 1 and the number would mean nothing. Unreachable stays null rather
//  than Infinity so a report can distinguish "far" from "no path".
function depths(graph, root = '/') {
  const d = new Map();
  const start = graph.nodes.has(root) ? root : null;
  if (!start) return d;
  d.set(start, 0);
  let frontier = [start];
  while (frontier.length) {
    const next = [];
    for (const path of frontier) {
      const x = graph.nodes.get(path);
      if (!x) continue;
      for (const t of x.outTo) {
        if (d.has(t)) continue;
        d.set(t, d.get(path) + 1);
        next.push(t);
      }
    }
    frontier = next;
  }
  return d;
}

// ── ANALYSIS ─────────────────────────────────────────────────────────────────
function analyze(graph) {
  const depth = depths(graph);
  const all = Array.from(graph.nodes.values());
  const live = all.filter((x) => x.crawled && x.status === 200);

  //  The homepage has no inbound links by design and is not a finding.
  const orphans = live.filter((x) => x.inBody === 0 && x.path !== '/');
  const nearOrphans = live.filter((x) => x.inBody === 1);
  const deadEnds = live.filter((x) => x.outBody === 0);
  const unreachable = live.filter((x) => !depth.has(x.path));
  const broken = all.filter((x) => x.crawled && x.status && x.status >= 400);
  // A link target nobody ever crawled because it is not in the sitemap.
  const dangling = all.filter((x) => !x.crawled && x.inBody > 0);

  const byCourse = new Map();
  for (const x of live) {
    const k = x.course || 'site';
    if (!byCourse.has(k)) byCourse.set(k, { course: k, pages: 0, orphans: 0, roles: {} });
    const c = byCourse.get(k);
    c.pages++;
    if (x.inBody === 0) c.orphans++;
    c.roles[x.role] = (c.roles[x.role] || 0) + 1;
  }

  // Hub score: a hub is a page that sends a lot and is pointed at from its own
  // cluster. Out-degree alone would crown the sitemap page.
  const hubs = live
    .filter((x) => x.outBody >= 8)
    .sort((a, b) => b.outBody - a.outBody)
    .slice(0, 60)
    .map((x) => ({ path: x.path, title: x.title, course: x.course, role: x.role, out: x.outBody, in: x.inBody }));

  return {
    totals: {
      crawled: graph.crawledCount,
      live: live.length,
      broken: broken.length,
      bodyEdges: graph.edges.length,
      chromeTargets: graph.chromeTargets.size,
      orphans: orphans.length,
      nearOrphans: nearOrphans.length,
      deadEnds: deadEnds.length,
      unreachable: unreachable.length,
      dangling: dangling.length,
    },
    depth, orphans, nearOrphans, deadEnds, unreachable, broken, dangling,
    hubs, byCourse: Array.from(byCourse.values()).sort((a, b) => b.pages - a.pages),
  };
}

// ── CLUSTERS AND THEIR HUBS ─────────────────────────────────────────────────
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
  //  A numbered stem may carry a leading path word ('course-big-idea-2-data')
  //  and may or may not hyphenate before the digits ('bi2-data-cleaning'). Both
  //  spellings are live. Normalising them here is what lets stemVariants find
  //  the hub; without it ap-csp-bi2-data reads as a hubless cluster while
  //  ap-csp-big-idea-2-data is sitting live.
  const numbered = rest.match(/^(?:course-|topics-|practice-)?((?:unit|big-idea|bi|topic|lesson)-?\d+(?:-\d+)?)/);
  if (numbered) {
    const stem = numbered[1].replace(/^(unit|big-idea|bi|topic|lesson)-?(\d)/, '$1-$2');
    return `${prefix}-${stem}`;
  }
  //  Singular and plural are ONE family. ap-csa-2d-array-cheat-sheet and
  //  ap-csa-2d-arrays-exam-guide are the same topic under two spellings, and
  //  splitting them reports a missing hub for a cluster whose hub is sitting in
  //  the other spelling. The split itself is still worth knowing about and is
  //  reported separately as a handle twin.
  const singular = (w) => (/[^s]s$/.test(w) ? w.slice(0, -1) : w);
  return `${prefix}-${words.slice(0, 2).map(singular).join('-')}`;
}

//  Group live pages into families and resolve each family's hub.
//  live: [node]. Returns [{family, course, hub, hubAlias, members}].
function resolveClusters(live) {
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
  const liveByLength = (xs) => xs.filter((x) => x.handle).sort((a, b) => a.handle.length - b.handle.length);
  //  Every word a live index page on this site actually ends with.
  //  'by-topic' is not decoration: ap-csp-practice-tests-by-topic and
  //  ap-csa-practice-tests-by-topic are the hubs for those clusters.
  const HUB_SUFFIXES = ['course', 'hub', 'overview', 'home', 'index', 'topics',
    'by-topic', 'by-unit', 'archive'];
  //  Deliberately NOT here: 'guide'. On this site that is how spokes are
  //  named (ap-csa-2d-arrays-exam-guide, ap-csa-recursion-tracing-guide), so
  //  accepting it would let a spoke pose as its cluster's hub and hide a
  //  real gap. ap-csp-written-response-guide is exactly that case.
  const tokenKey = (h) => h.split('-').sort().join('-');

  //  ── THE TWO-NAMESPACE PROBLEM ─────────────────────────────────────────────
  //  Cybersecurity is stored under two prefixes, which the positioning audit
  //  already recorded: ap-cyber-* holds 147 practice, lab, quiz and exercise
  //  pages, ap-cybersecurity-* holds the 92 lessons and overviews. CSP does the
  //  same thing with its Big Ideas: ap-csp-course-bi3-* activities against an
  //  ap-csp-big-idea-3-* hub.
  //
  //  Without this, the report claims five cyber unit hubs are missing when the
  //  hub exists under the other prefix, and proposing that somebody BUILD five
  //  pages that are already live is the worst kind of wrong answer. So a
  //  numbered family also accepts a hub under a sibling spelling of its prefix
  //  and of its unit word, with any trailing slug:
  //
  //    family  ap-cyber-unit-3
  //    hub     ap-cybersecurity-unit-3-securing-networks   accepted
  //
  //  A slug is allowed on the hub but never on the family stem, so
  //  ap-cyber-unit-3-lesson-1-quiz cannot become its own hub.
  const PREFIX_ALIASES = [['ap-cyber', 'ap-cybersecurity']];
  const UNIT_WORDS = ['unit', 'bi', 'big-idea'];

  //  Every way the stem of a numbered family could be spelled.
  function stemVariants(family) {
    // Both spellings are live: ap-csp-big-idea-3 and ap-csp-course-bi3.
    const m = family.match(/^(.*?)-((?:unit|big-idea|bi))-?(\d+)$/);
    if (!m) return [];
    const [, prefix, word, n] = m;
    const prefixes = new Set([prefix]);
    for (const group of PREFIX_ALIASES) {
      if (group.includes(prefix)) for (const alt of group) prefixes.add(alt);
      // ap-csp-course-bi3 style: the prefix carries an extra path word.
      for (const alt of group) if (prefix.startsWith(alt + '-')) prefixes.add(alt);
    }
    // 'ap-csp-course' should also try plain 'ap-csp'.
    const trimmed = prefix.replace(/-(course|topics|practice)$/, '');
    if (trimmed !== prefix) prefixes.add(trimmed);

    const out = [];
    for (const p of prefixes) for (const w of UNIT_WORDS) { out.push(`${p}-${w}-${n}`); out.push(`${p}-${w}${n}`); }
    return out;
  }

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
  //  Families are singularised, so the lookup has to be too, or the bare plural
  //  topic page (ap-csa-2d-arrays) never matches the family it heads
  //  (ap-csa-2d-array). Shortest handle wins so the bare topic beats a longer
  //  page that happens to singularise the same way.
  const singularHandle = (h) => h.split('-').map((w) => (/[^s]s$/.test(w) ? w.slice(0, -1) : w)).join('-');
  const bySingular = new Map();
  for (const x of liveByLength(live)) {
    const k = singularHandle(x.handle);
    if (!bySingular.has(k)) bySingular.set(k, x);
  }
  const liveSorted = live.filter((x) => x.handle).sort((a, b) => a.handle.length - b.handle.length);
  for (const c of clusters.values()) {
    c.hub = byHandle.get(c.family)
      || HUB_SUFFIXES.map((s) => byHandle.get(`${c.family}-${s}`)).find(Boolean)
      || HUB_SUFFIXES.map((s) => bySingular.get(`${c.family}-${s}`)).find(Boolean)
      || byTokens.get(tokenKey(c.family))
      || bySingular.get(c.family)
      || null;
    if (c.hub) continue;
    // Numbered family, no exact hub: accept a sibling spelling with a slug.
    // Shortest handle wins, so a unit overview beats a lesson inside the unit.
    //  A candidate that is itself a MEMBER of this family cannot be its hub.
    //  Without this guard ap-cyber-unit-3-exam wins the stem match on
    //  ap-cyber-unit-3 by being short, and the real hub sitting under
    //  ap-cybersecurity-unit-3-securing-networks is never found. That failure
    //  is silent and doubly wrong: it hides the gap AND points the whole unit
    //  at an exam page. Caught by smoke/link-graph.js.
    const memberPaths = new Set(c.members.map((m) => m.path));
    const stems = stemVariants(c.family);
    if (stems.length) {
      c.hub = liveSorted.find((x) => !memberPaths.has(x.path)
        && stems.some((st) => x.handle === st || x.handle.startsWith(st + '-'))) || null;
      if (c.hub) { c.hubAlias = true; continue; }
    }
    //  Unnumbered family whose hub carries a longer name: ap-csa-7day-kit-day-N
    //  against the live ap-csa-7day-emergency-cram-kit. Matched on the family's
    //  FIRST topic word only, and only when exactly ONE live page starts that
    //  way, because two candidates is a guess and a wrong hub link is worse
    //  than a missing one.
    const first = c.family.match(/^(.*?-[^-]+)-[^-]+$/);
    if (!first) continue;
    const cands = liveSorted.filter((x) => x.handle.startsWith(first[1] + '-')
      && x.handle !== c.family && !memberPaths.has(x.path));
    if (cands.length === 1) { c.hub = cands[0]; c.hubAlias = true; }
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
      hubAlias: !!c.hubAlias,
      orphans, inbound, internal,
      members: c.members.map((m) => ({ path: m.path, title: m.title, role: m.role, in: m.inBody, out: m.outBody })),
    };
  }).sort((x, y) => y.size - x.size);
  return clusterList;
}

module.exports = {
  CHROME_UBIQUITY, ANCHOR_MAX, LINK_IGNORE, COURSES,
  stripCode, bodyOnly, isInternal, normalize, isIgnored, textOf,
  extractLinks, courseOf, roleOf, handleOf,
  buildGraph, depths, analyze,
  COURSE_PREFIXES, familyOf, resolveClusters,
};
