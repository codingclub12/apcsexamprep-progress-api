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

module.exports = {
  CHROME_UBIQUITY, ANCHOR_MAX, LINK_IGNORE, COURSES,
  stripCode, bodyOnly, isInternal, normalize, isIgnored, textOf,
  extractLinks, courseOf, roleOf, handleOf,
  buildGraph, depths, analyze,
};
