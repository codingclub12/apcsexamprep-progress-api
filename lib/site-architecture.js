'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  WHERE DOES THIS PAGE GO. Declared parentage for every live page, offline.
//
//  Board 351. SEVEN board tasks since #73 are the same defect wearing different
//  clothes: a page ships and nothing links it. #73 (101 pages), #114 (four
//  Device Security Analysis pages), #161 (18 CSP Applied Challenges), #164 (a
//  CSP checkpoint, still open), #220, #238, #245. Six were closed as instances.
//  The class was never closed, which is how board 352 happened in September: a
//  7-problem autograded array page, live since February, reachable from nothing.
//
//  ── WHY THE EXISTING TOOLING DID NOT CATCH IT ──────────────────────────────
//  It could have. scripts/link-graph.js measures this exactly, with a zone model
//  that separates the ~135 mega-menu anchors from real content links, and it is
//  good. It is also a 42 MINUTE NETWORK CRAWL that nobody runs on a schedule,
//  and lib/site-crawl.js rates orphans P2 ("nobody is blocked, it compounds")
//  and does not check for them at all. So orphaning is found retrospectively,
//  one page at a time, by somebody noticing.
//
//  This module answers a NARROWER question that needs no network: does this
//  handle have a declared home? That is decidable from the handle alone,
//  because on this site the naming convention IS the architecture.
//
//  ── WHAT IT IS AND IS NOT ──────────────────────────────────────────────────
//  This holds NO opinion of its own about clustering. Every rule comes from
//  lib/link-graph.js: familyOf for the stem, roleOf for the type, courseOf for
//  the course, resolveClusters for hub detection with all five of the site's
//  naming irregularities (two cyber prefixes, bi3 against big-idea-3, singular
//  against plural, reversed token order, a hub that is a member of its own
//  family). A second opinion about the convention is how site 3.3 and 3.4 ended
//  up as each other's CED topics. Go through the module.
//
//  MEASURED, and the gap between these two is the whole point:
//
//    a declared parent          712 of 1,365 live pages
//    IS its own family hub      344
//    no family at all           68   contact, pricing, codehs-*, greenfoot-*
//    PARENTLESS                 241
//
//  ── THE HONEST LIMIT, STATED UP FRONT ──────────────────────────────────────
//  "Has a declared parent" is NOT "is linked". Sampled 2026-09-18 across 11
//  clusters that have a hub: the hub's stored body actually linked the child in
//  6 of 11. So parentage and linkage are different questions and this module
//  only answers the first. The second needs the parent's body, which is
//  scripts/verify-architecture-live.js, and the useful part is that it fetches
//  only HUBS (about 380) rather than every page (2,063), so it is seven minutes
//  rather than forty two.
//
//  Treat a parentless page as a page that NOTHING IS GOING TO LINK, because no
//  hub owns it. That is the condition board 352 was in.
//
//  Zero network, zero PII: handles only.
// ─────────────────────────────────────────────────────────────────────────────
const G = require('./link-graph');

//  Non-course pages. contact, pricing, data-sharing-opt-out and friends carry
//  no course prefix, so familyOf returns null and they have no course hub to
//  belong to. They are site furniture, not orphans, and demanding a parent for
//  them is exactly the false positive that gets a check switched off.
const SCOPE_SITE = 'site';
const SCOPE_COURSE = 'course';

function nodesFor(handles) {
  //  resolveClusters reads edge fields for its REPORTING stats (inbound,
  //  orphan counts, cohesion) and handle/path only for the clustering itself.
  //  Zeroed edges therefore give correct families and hubs with no crawl. That
  //  is what makes this offline, and it is the one non-obvious thing here.
  return handles.map((h) => ({
    handle: h,
    path: '/pages/' + h,
    title: '',
    role: G.roleOf('/pages/' + h, h),
    inBody: 0,
    outBody: 0,
    outTo: new Set(),
  }));
}

//  handles: array of live page handles. Returns one record per handle plus
//  counts, deterministic and sorted so the generated file diffs cleanly.
function classify(handles) {
  if (!Array.isArray(handles) || !handles.length) {
    throw new Error('classify needs a non-empty array of live page handles');
  }
  const uniq = [...new Set(handles)].sort();
  const clusters = G.resolveClusters(nodesFor(uniq));

  const byHandle = new Map();
  for (const c of clusters) {
    for (const m of c.members) {
      byHandle.set(m.path.replace(/^\/pages\//, ''), {
        family: c.family,
        hub: c.hub ? c.hub.replace(/^\/pages\//, '') : null,
        hubAlias: !!c.hubAlias,
      });
    }
  }

  const pages = uniq.map((handle) => {
    const family = G.familyOf(handle);
    const info = byHandle.get(handle);
    const role = G.roleOf('/pages/' + handle, handle);
    const course = G.courseOf(handle);

    //  No family means no course prefix means site furniture.
    if (!family || !info) {
      return { handle, course, role, scope: SCOPE_SITE, family: null, parent: null };
    }
    const hub = info.hub;
    //  A hub does not need a parent inside its own family: it IS the parent.
    //  Whether the hub itself is reachable is a question one level up, and
    //  answering it here would make every course hub look like an orphan.
    const isHub = hub === handle;
    return {
      handle,
      course,
      role,
      scope: SCOPE_COURSE,
      family: info.family,
      parent: isHub ? null : hub,
      is_hub: isHub || undefined,
      parent_is_alias: (!isHub && hub && info.hubAlias) || undefined,
    };
  });

  const parentless = pages
    .filter((p) => p.scope === SCOPE_COURSE && !p.is_hub && !p.parent)
    .map((p) => p.handle);

  return {
    pages,
    parentless,
    counts: {
      total: pages.length,
      site: pages.filter((p) => p.scope === SCOPE_SITE).length,
      hubs: pages.filter((p) => p.is_hub).length,
      parented: pages.filter((p) => p.parent).length,
      parentless: parentless.length,
    },
  };
}

//  Does this ONE handle have a home, given the live handle set it lives in?
//  This is the question a sheet generator asks before publishing a new page.
function parentOf(handle, liveHandles) {
  const all = liveHandles.includes(handle) ? liveHandles : [...liveHandles, handle];
  const rec = classify(all).pages.find((p) => p.handle === handle);
  return rec || null;
}

//  New parentless handles against a recorded baseline. The baseline may only
//  SHRINK: a check that goes red on 241 pre-existing pages on its first day is
//  a check somebody turns off by lunchtime, but one that refuses the 242nd is
//  a check that closes the class.
function regressions(current, baseline) {
  const known = new Set(baseline || []);
  return (current || []).filter((h) => !known.has(h));
}

function fixed(current, baseline) {
  const now = new Set(current || []);
  return (baseline || []).filter((h) => !now.has(h));
}

// ─────────────────────────────────────────────────────────────────────────────
//  THE SECOND HALF: does the declared parent ACTUALLY link the child.
//
//  Board 372. classify() above answers "has a home". This answers "is the home
//  wired up", and they are different questions: sampled 2026-09-18 across 11
//  clusters that do have a hub, the hub's stored body linked the child in 6 of
//  11. A page with a parent that ignores it is just as unreachable as one with
//  no parent at all.
//
//  ── WHY IT IS AFFORDABLE ───────────────────────────────────────────────────
//  The naive reading is that this needs the 42-minute full crawl. It does not.
//  The question is only whether each HUB links its members, so you fetch the
//  347 hubs rather than all 1,371 pages: about six minutes.
// ─────────────────────────────────────────────────────────────────────────────

//  A Shopify handle is lowercase letters, digits and hyphens, so an href to one
//  handle CONTAINS the href to any handle it is prefixed by.
const HANDLE_CHAR = /[A-Za-z0-9-]/;

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

//  Does `body` link `/pages/<handle>` as that page, rather than as the prefix of
//  a longer one?
//
//  A PLAIN includes() IS WRONG HERE, and not marginally. /pages/ap-csa-lesson-
//  4-4-traversing-arrays is a substring of /pages/ap-csa-lesson-4-4-traversing-
//  arrays-frq, so a hub that links ONLY the FRQ reads as linking the lesson too.
//  Measured on the live handle set: 52 of 712 parented pages are a strict prefix
//  of another live handle, which is 7.3% of every verdict this function gives,
//  and the error runs in the quiet direction. It reports a page as reachable
//  when it is not, which is the failure nobody goes looking for.
//
//  Anchored on the RIGHT only. A leading boundary is not needed because the
//  '/pages/' prefix already supplies one, and requiring one breaks the
//  protocol-relative and absolute forms that appear in real bodies.
function linksTo(body, handle) {
  if (typeof body !== 'string' || !body || !handle) return false;
  const re = new RegExp('/pages/' + escapeRe(handle) + '(?!' + HANDLE_CHAR.source + ')');
  return re.test(body);
}

//  Group the architecture by parent: one entry per parent, carrying every member
//  that claims it. This is what makes the check cheap, because it is also the
//  fetch list.
//
//  Sorted by member count descending, because that is the ranking that matters:
//  docs/internal-linking.md argues hub-down for a reason, and one hub that
//  ignores nine members is nine pages rescued by a single page edit.
function parentIndex(pages) {
  const byParent = new Map();
  for (const p of pages || []) {
    if (!p.parent) continue;
    if (!byParent.has(p.parent)) byParent.set(p.parent, []);
    byParent.get(p.parent).push(p.handle);
  }
  return [...byParent.entries()]
    .map(([parent, members]) => ({ parent, members: members.sort() }))
    .sort((a, b) => b.members.length - a.members.length || a.parent.localeCompare(b.parent));
}

//  Given a parent's body and the members claiming it, which are not linked?
function missesIn(body, members) {
  return (members || []).filter((m) => !linksTo(body, m));
}

module.exports = {
  classify, parentOf, regressions, fixed, SCOPE_SITE, SCOPE_COURSE,
  linksTo, parentIndex, missesIn,
};
