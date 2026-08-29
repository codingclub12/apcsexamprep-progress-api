#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  NIGHTLY SITE CRAWL - gather the evidence, rank it, say what is NEW.
//
//  The checks and the severity model live in lib/site-crawl.js so they can be
//  pinned offline. This file is the part that talks to the network: which URLs
//  to pull, how fast, when to stop, and what to write down.
//
//  ── THE RATE LIMIT IS THE DESIGN CONSTRAINT, NOT THE CLOCK ──────────────────
//  The sitemap advertises about 2,000 URLs. Pulling all of them nightly is both
//  possible and a bad idea, and this repo has already paid for the lesson twice:
//  board task 79 is "46 pages returned 429 during crawl - re-verify
//  single-threaded", and .github/workflows/smoke.yml records rapid runs making
//  the storefront serve empty pages. scripts/grade-path-audit.js chose ten
//  requests over a 250-page crawl for exactly this reason.
//
//  So coverage is spread rather than compressed. Every night crawls:
//
//    THE HOT SET      the pages where a break is worst and a regression is
//                     likeliest: the course hubs, one reporter-bearing page per
//                     course, and every URL that was broken last night. These
//                     are checked EVERY night, because a P0 that only gets
//                     looked at on Thursdays is not being monitored.
//
//    ONE SHARD        a stable slice of everything else, rotated by day. Seven
//                     shards means the whole site is covered every week and no
//                     night costs more than about 350 requests.
//
//  A measured probe of 20 live pages at 1 request/second returned 20 clean 200s
//  averaging 0.24s, so 1s spacing is comfortable rather than merely tolerated.
//  The crawler still backs off on the first sign of throttling and gives up
//  rather than pushing through, because the failure mode of pushing through is
//  the storefront serving challenges to real students on shared school IPs.
//
//  ── MEMORY ──────────────────────────────────────────────────────────────────
//  Pages here run 350KB to 750KB. Bodies are parsed and DROPPED inside the loop;
//  nothing accumulates but small per-URL records and a capped findings array.
//  Four hundred retained bodies would be 200MB+ on a 1GB box.
//
//  ── RUNAWAY: THE HAZARD THE $169 BILL ACTUALLY WAS ──────────────────────────
//  Not an unbounded array. An API that linked to itself and recursed, over and
//  over, until it had spent real money. That is a LOOP, and a crawler is exactly
//  the kind of program that reproduces it by accident, so it is worth stating
//  plainly why this one cannot:
//
//    - The work list is FIXED BEFORE THE FIRST REQUEST. URLs come from the
//      sitemap, once. Links discovered while crawling are never appended to the
//      crawl queue; they are checked with a single HEAD each and never followed.
//      There is no recursive descent, so there is no cycle to fall into.
//    - Redirects are followed manually and capped at 6 hops, so A -> B -> A
//      terminates and is reported as a redirect chain rather than chased.
//    - Every phase is bounded twice over: BUDGET caps page requests,
//      LINK_BUDGET caps link checks, MAX_MINUTES caps the wall clock, and
//      MAX_STRIKES stops the run entirely on repeated throttling.
//    - Link targets are deduplicated by normalised path before any request, so
//      a page linking to itself costs nothing and a thousand pages linking to
//      one target cost one HEAD.
//
//  The wall-clock cap is the one that matters most in practice, because the
//  others bound REQUESTS and backoff bounds nothing: a storefront that starts
//  throttling drives the delay to 30s, and 400 requests at 30s is over three
//  hours. MAX_MINUTES is what turns that from an overnight surprise into a
//  truncated run that says so.
//
//  ── IT READS. IT WRITES NOTHING. ────────────────────────────────────────────
//  No credential is sent to the storefront, no ledger row is written, and the
//  progress API half touches only public and deliberately-unauthenticated paths.
//  Same posture as .github/workflows/nightly-sweep.yml: reading unattended and
//  changing things unattended are different risks, and only the first is taken.
//
//  Run:
//    node scripts/site-crawl.js                      # tonight's shard
//    node scripts/site-crawl.js --full --budget 0    # everything, no cap
//    node scripts/site-crawl.js --out crawl.json --previous last.json
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const C = require('../lib/site-crawl');

const STORE = (process.env.STORE_ORIGIN || 'https://www.apcsexamprep.com').replace(/\/+$/, '');
const API = (process.env.APCS_BASE || 'https://progress.apcsexamprep.com').replace(/\/+$/, '');

// A browser-ish agent. scripts/live-pages-dump.js records why: the storefront
// serves a challenge to obviously scripted clients, and a challenge page fails
// every downstream check with a confusing message rather than a clear one.
const UA = 'Mozilla/5.0 (compatible; apcse-nightly-crawl/1.0) Chrome/120.0.0.0 Safari/537.36';

// ── ARGUMENTS ────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => argv.includes('--' + name);
const opt = (name, dflt) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
};

const BUDGET = Number(opt('budget', '400'));         // 0 means no cap
const SHARDS = Math.max(1, Number(opt('shards', '7')));
const DELAY = Number(opt('delay', '1000'));
const LINK_BUDGET = Number(opt('link-budget', '250'));
// The wall clock, in minutes. 0 disables it. This exists because every other
// bound here caps REQUESTS, and the thing that actually makes a night overrun is
// backoff: a throttling storefront drives the delay to 30s, and 400 requests at
// 30s is over three hours. A nightly job that can silently run until breakfast
// is a nightly job nobody can schedule around.
const MAX_MINUTES = Number(opt('max-minutes', '25'));
const minutes = (n) => `${n} minute${n === 1 ? '' : 's'}`;
const FULL = flag('full');
const OUT = opt('out', '');
const PREV = opt('previous', '');
const INCLUDE = String(opt('include', 'pages,articles,products,collections')).split(',').map((s) => s.trim());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── THE THROTTLE ─────────────────────────────────────────────────────────────
//  Additive spacing, multiplicative backoff. A 429 or a challenge doubles the
//  delay; a run of clean responses eases it back toward the floor. After
//  MAX_STRIKES throttled responses the crawl STOPS and says so, rather than
//  spending the rest of the night collecting evidence that bot protection works.
const MAX_STRIKES = 5;
let deadline = Infinity;          // set in main(), once the run actually starts
let truncated = '';               // why the run stopped early, if it did
const outOfTime = () => Date.now() > deadline;
let delay = DELAY;
let strikes = 0;
let clean = 0;
let requests = 0;
const aborted = { yes: false, why: '' };

async function fetchOnce(url, method = 'GET') {
  const started = Date.now();
  let redirects = 0;
  let current = url;
  // Manual redirect following so a chain can be counted. Shopify serves plenty
  // of single-hop redirects that are entirely correct; it is the CHAINS that
  // cost latency on a school network, so the count is what gets recorded.
  for (let hop = 0; hop < 6; hop++) {
    let r;
    try {
      r = await fetch(current, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' }, redirect: 'manual', method });
    } catch (e) {
      return { status: 0, html: '', ms: Date.now() - started, redirects, error: e.message, finalUrl: current };
    }
    requests += 1;
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      redirects += 1;
      current = new URL(r.headers.get('location'), current).toString();
      continue;
    }
    const html = method === 'HEAD' ? '' : await r.text();
    return { status: r.status, html, ms: Date.now() - started, redirects, finalUrl: current };
  }
  return { status: 0, html: '', ms: Date.now() - started, redirects, error: 'redirect loop', finalUrl: current };
}

async function polite(url, method = 'GET') {
  if (aborted.yes) return null;
  const res = await fetchOnce(url, method);
  const throttled = res.status === 429 || res.status === 503 ||
    (method === 'GET' && C.looksLikeChallenge(res.html || '', res.status));
  if (throttled) {
    strikes += 1;
    clean = 0;
    delay = Math.min(delay * 2, 30000);
    if (strikes >= MAX_STRIKES) {
      aborted.yes = true;
      aborted.why = `${strikes} throttled responses; stopped at ${requests} requests rather than pushing through`;
      return res;
    }
    await sleep(delay);
    return res;
  }
  clean += 1;
  // Ease back, but never below the configured floor and never faster than the
  // probe that was actually measured against this storefront.
  if (clean >= 10 && delay > DELAY) { delay = Math.max(DELAY, Math.floor(delay / 2)); clean = 0; }
  await sleep(delay);
  return res;
}

// ── URL ENUMERATION ──────────────────────────────────────────────────────────
//  The sitemap is the authority. Building URLs from handle patterns would invent
//  pages that do not exist and miss ones that do; Shopify keeps this index in
//  real time and it is the same list Google is working from.
async function sitemapUrls() {
  const index = await fetchOnce(`${STORE}/sitemap.xml`);
  if (index.status !== 200) throw new Error(`sitemap.xml returned HTTP ${index.status}`);
  const children = Array.from(index.html.matchAll(/<loc>([^<]+)<\/loc>/g))
    .map((m) => m[1].replace(/&amp;/g, '&'));
  const urls = new Map();
  for (const child of children) {
    // The agentic-discovery sitemap duplicates pages already listed elsewhere.
    if (/agentic_discovery/.test(child)) continue;
    const r = await fetchOnce(child);
    if (r.status !== 200) continue;
    for (const m of r.html.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const u = m[1].replace(/&amp;/g, '&');
      urls.set(u, C.classify(u));
    }
    await sleep(300);
  }
  return Array.from(urls.entries()).map(([url, kind]) => ({ url, kind }));
}

// Stable slice assignment. FNV-1a over the URL, so a page stays in the same
// shard across runs and coverage is genuinely a rotation rather than a
// re-randomisation that revisits some pages weekly and others never.
function shardOf(url, shards) {
  let h = 0x811c9dc5;
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % shards;
}

function dayOfYear(d) {
  return Math.floor((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 0))) / 86400000);
}

// ── THE HOT SET ──────────────────────────────────────────────────────────────
//  Checked every night regardless of shard. Three sources, and the third is the
//  one that matters most: last night's failures. A finding that is only looked
//  at again in six days cannot be reported as resolved, and a P0 nobody rechecks
//  is not being monitored.
function hotSet(all, previous) {
  const hot = new Set();
  const add = (u) => { if (u) hot.add(u); };

  add(`${STORE}/`);

  // One reporter-bearing page per course. Imported rather than restated so this
  // list cannot drift from the audit that already depends on it.
  try {
    const { SAMPLES } = require('./grade-path-audit');
    for (const s of SAMPLES) add(`${STORE}/pages/${s.handle}`);
  } catch (e) { /* the audit is optional; the crawl still runs without it */ }

  // Course hubs and command centers: every lesson page links back through these,
  // so a break here is a break in every path a student takes.
  for (const { url, kind } of all) {
    if (kind !== 'page') continue;
    const h = C.handleOf(url) || '';
    if (/^(ap-csa|ap-csp|ap-cyber|ap-cybersecurity|ap-networking|intro-java)(-course)?$/.test(h)) add(url);
    if (/-(command-center|course|hub|course-hub)$/.test(h)) add(url);
  }

  if (previous && Array.isArray(previous.findings)) {
    for (const f of previous.findings) {
      // Only re-check tiers worth the request. A meta description that was
      // missing last night is not worth spending hot-set budget on nightly.
      if (f.tier === 'P0' || f.tier === 'P1') add(f.url);
    }
  }
  const known = new Set(all.map((a) => a.url));
  return Array.from(hot).filter((u) => known.has(u) || u === `${STORE}/`);
}

// ── THE PROGRESS API HALF ────────────────────────────────────────────────────
//  Public and deliberately-unauthenticated paths only.
//
//  /api/health is checked for WHAT IT SERVES, not just that it answers. server.js
//  records the day that distinction cost: a route returned a Cloudflare-cached
//  500 for hours while /api/health answered 200 the whole time, and the 200 was
//  read as proof the container was fine. The commit sha is the answer to the
//  question the status code cannot reach.
//
//  The gated admin routes are checked for the OPPOSITE of a normal uptime check:
//  an anonymous request must receive the LOGIN page. If one of them ever returns
//  dashboard markup to a crawler with no cookie, the fail-closed posture this
//  repo is built on has regressed, and that is a P0 by any reading.
//  Is the sha production reports the sha main is on?
//
//  Three ways this returns null rather than a finding, and each is a case where
//  a finding would be a lie:
//
//    - The served sha is 'unknown'. RAILWAY_GIT_COMMIT_SHA is absent, so there
//      is nothing to compare and the deploy may be perfectly current.
//    - The checkout is not main. A feature branch is SUPPOSED to differ from
//      production; comparing against it would fire on every branch.
//    - main's tip is younger than GRACE. A deploy takes minutes, so the window
//      right after a merge is the normal state of the world, not a fault.
//      Twenty was measured against this repo's own build; thirty leaves room.
//
//  Deliberately NOT reported: how many commits behind, and what is in them.
//  actions/checkout defaults to depth 1, so the CI run that matters has exactly
//  one commit of history and cannot count or diff. Reporting a number that is
//  right locally and silently absent in CI is worse than reporting neither, and
//  the sha plus the age is already enough to act on.
const GRACE_MINUTES = 30;

function git(args) {
  try {
    return require('child_process')
      .execFileSync('git', args, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
  } catch (e) { return null; }
}

//  git and now are injectable so smoke/site-crawl.js can drive every branch
//  offline. A check whose only test is "it did not fire against the real repo
//  today" is the shape this whole file exists to avoid.
function deployLag(served, { runGit = git, now = () => Date.now() } = {}) {
  if (!served || served === 'unknown') return null;

  //  origin/main when the remote ref is present, otherwise HEAD but only when
  //  HEAD actually is main. Anything else is not a fair comparison.
  let ref = runGit(['rev-parse', 'origin/main']);
  if (!ref) {
    const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
    if (branch !== 'main') return null;
    ref = runGit(['rev-parse', 'HEAD']);
  }
  if (!ref) return null;

  const short = ref.slice(0, served.length);
  if (short === served) return null;

  //  The GATE is the age of main's tip: a merge two minutes old has not had time
  //  to deploy and must not fire.
  const tipIso = runGit(['log', '-1', '--format=%cI', ref]);
  if (!tipIso) return null;
  const tipMin = Math.floor((now() - new Date(tipIso).getTime()) / 60000);
  if (!Number.isFinite(tipMin) || tipMin < GRACE_MINUTES) return null;

  //  The NUMBER A HUMAN ACTS ON is a different one, and getting these two
  //  confused is how this check would have understated its own first catch by a
  //  factor of thirty. When production was found on a commit from the previous
  //  afternoon, main's tip was 46 minutes old, so reporting the tip age would
  //  have said "0.8h" about a deploy that had been dead for 28.
  //
  //  So: age the SERVED commit when it is in local history, because "production
  //  is running code from 28 hours ago" is the sentence that gets someone to
  //  open Railway. actions/checkout defaults to depth 1 and cannot resolve it,
  //  which is why site-audit.yml asks for full history; where that is missing
  //  this degrades to a claim about main only, worded so it cannot be misread
  //  as a claim about the deploy.
  const servedIso = runGit(['log', '-1', '--format=%cI', served]);
  const servedMin = servedIso
    ? Math.floor((now() - new Date(servedIso).getTime()) / 60000) : null;

  const hours = (m) => (m / 60).toFixed(1);
  const detail = Number.isFinite(servedMin)
    ? `production serves ${served}, which is ${hours(servedMin)}h old; main is ${short}`
    : `production serves ${served}, not main's ${short}; main has been on ${short} for ${hours(tipMin)}h `
      + '(age of the deployed commit unavailable: shallow checkout)';

  return {
    detail,
    evidence: `${served} != ${short}, main tip +${tipMin}m`
      + (Number.isFinite(servedMin) ? `, deployed commit +${servedMin}m` : ''),
  };
}

async function apiHealth(findings) {
  const health = await fetchOnce(`${API}/api/health`);
  if (health.status !== 200) {
    findings.push({ kind: 'api-down', tier: 'P0', url: `${API}/api/health`,
      detail: `HTTP ${health.status}`, evidence: `${health.status}` });
    return { reachable: false };
  }
  let commit = 'unknown';
  try { commit = (JSON.parse(health.html).commit) || 'unknown'; } catch (e) { /* not fatal */ }

  //  The sha was collected here for a year and never compared to anything, so
  //  the comment above ("the answer to the question the status code cannot
  //  reach") described a question nobody asked. On 2026-08-29 production was
  //  found running a commit from the previous afternoon with six merges stacked
  //  behind it, and it was found by hand, after a merge, because someone
  //  happened to look. Nothing in the nightly run would have said a word.
  //
  //  Nothing user-facing had changed in that gap, which is exactly why it went
  //  unnoticed for a day and exactly why it is worth a finding: the pipeline is
  //  broken from the first merge, and the merge that reveals it is whichever
  //  one first touches a route.
  const stale = deployLag(commit);
  if (stale) {
    findings.push({ kind: 'api-stale-deploy', tier: C.tierOf('api-stale-deploy'),
      url: `${API}/api/health`, detail: stale.detail, evidence: stale.evidence });
  }

  const gated = ['/admin/dashboard', '/admin/analytics', '/admin/exec', '/admin/command'];
  for (const path of gated) {
    const r = await fetchOnce(`${API}${path}`);
    await sleep(200);
    if (r.status !== 200) continue;   // a non-200 is not an exposure
    // The login page is the correct answer. Dashboard markup reaching an
    // anonymous request is the regression worth waking up for.
    const looksLikeLogin = /login|password|Sign in|admin-key/i.test(r.html.slice(0, 4000));
    const looksLikeApp = /id=["']?(dashboard|exec|analytics|command)-?(root|app|grid)/i.test(r.html);
    if (!looksLikeLogin && looksLikeApp) {
      findings.push({ kind: 'api-down', tier: 'P0', url: `${API}${path}`,
        detail: 'gated admin route served app markup to an anonymous request',
        evidence: 'fail-closed gate regression' });
    }
  }
  return { reachable: true, commit };
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const started = new Date();
  // Armed before the sitemap fetch, not after, so enumeration counts against
  // the budget too. A sitemap that hangs is exactly as late as a crawl that does.
  deadline = MAX_MINUTES > 0 ? started.getTime() + MAX_MINUTES * 60000 : Infinity;
  let previous = null;
  if (PREV && fs.existsSync(PREV)) {
    try { previous = JSON.parse(fs.readFileSync(PREV, 'utf8')); } catch (e) { previous = null; }
  }

  const all = (await sitemapUrls()).filter((u) => {
    if (u.kind === 'page' || u.kind === 'home') return INCLUDE.includes('pages');
    if (u.kind === 'article' || u.kind === 'blog') return INCLUDE.includes('articles');
    if (u.kind === 'product') return INCLUDE.includes('products');
    if (u.kind === 'collection') return INCLUDE.includes('collections');
    return false;
  });

  const shard = Number(opt('shard', String(dayOfYear(started) % SHARDS)));
  const hot = new Set(hotSet(all, previous));
  const sliced = FULL
    ? all.map((a) => a.url)
    : all.filter((a) => hot.has(a.url) || shardOf(a.url, SHARDS) === shard).map((a) => a.url);

  // Hot set first, so a budget that runs out never costs the pages that matter.
  const ordered = [
    ...sliced.filter((u) => hot.has(u)),
    ...sliced.filter((u) => !hot.has(u)),
  ];
  const targets = BUDGET > 0 ? ordered.slice(0, BUDGET) : ordered;

  const findings = [];
  const crawledUrls = new Set();
  const titles = new Map();          // title -> [urls], for duplicate detection
  const linkRefs = new Map();        // internal target -> { count, from: [urls] }
  const fingerprints = {};           // url -> { reporters, widgetCount }
  let okCount = 0;

  // Last night's per-page fingerprint, which is what turns "this page has no
  // reporter" from a guess about the contract into a statement about a change.
  // See lib/site-crawl.js: the widget-to-reporter matrix is not knowable from
  // one night, and asserting one produced twelve confident wrong P0s.
  const before = (previous && previous.fingerprints) || {};

  for (const url of targets) {
    if (aborted.yes) break;
    if (outOfTime()) {
      truncated = `wall clock: stopped after ${minutes(MAX_MINUTES)} with ` +
                  `${crawledUrls.size} of ${targets.length} URLs crawled`;
      break;
    }
    const res = await polite(url);
    if (!res) break;
    crawledUrls.add(url);

    for (const f of C.checkPage(url, res, { before: before[url] })) findings.push(f);
    if (res.status === 200 && res.html) {
      okCount += 1;
      const p = C.parse(res.html);
      // Small on purpose: two fields per page, so a full-site state file stays
      // well under a megabyte and stays diffable in git.
      fingerprints[url] = { reporters: p.reporters, widgetCount: p.widgetCount };
      const bare = p.title.replace(/\s*\|\s*APCSExamPrep\s*$/i, '').trim();
      if (bare) {
        if (!titles.has(bare)) titles.set(bare, []);
        if (titles.get(bare).length < 6) titles.get(bare).push(url);
      }
      for (const href of p.links) {
        if (!C.isCrawlableLink(href)) continue;
        const t = C.normalizeLink(href);
        if (!linkRefs.has(t)) linkRefs.set(t, { count: 0, from: [] });
        const ref = linkRefs.get(t);
        ref.count += 1;
        // Three examples is enough to find the template that emits it, and
        // capping the array is the difference between a few kilobytes and
        // holding every referrer for every link on the site.
        if (ref.from.length < 3) ref.from.push(url);
      }
    }
    // res.html goes out of scope here. Nothing above retains it.
  }

  // ── DUPLICATE TITLES ───────────────────────────────────────────────────────
  //  Slice-scoped and labelled as such. Claiming site-wide uniqueness from a
  //  seventh of the site would be a finding the evidence does not support.
  for (const [title, urls] of titles) {
    if (urls.length > 1) {
      findings.push({ kind: 'duplicate-title', tier: C.tierOf('duplicate-title'),
        url: urls[0], detail: `${urls.length} pages share "${title}"`, evidence: title });
    }
  }

  // ── LINK AUDIT ─────────────────────────────────────────────────────────────
  //  HEAD requests, so a link check costs a status line rather than 400KB. Only
  //  targets that were NOT already crawled this run, ordered by how many pages
  //  point at them: a target linked from ninety pages is a nav element, and if
  //  it is broken it is broken ninety times over.
  const crawledPaths = new Set(Array.from(crawledUrls).map((u) => C.normalizeLink(u.replace(STORE, ''))));
  const linkTargets = Array.from(linkRefs.entries())
    .filter(([t]) => !crawledPaths.has(t))
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, LINK_BUDGET);

  for (const [path, ref] of linkTargets) {
    if (aborted.yes) break;
    // The link audit is the half that gets cut when time runs short, and that is
    // the right half: an unchecked link is a missing P1, an uncrawled page is a
    // missing P0 and a page with no fingerprint for tomorrow's regression check.
    if (outOfTime()) {
      truncated = truncated || `wall clock: link audit stopped after ${minutes(MAX_MINUTES)}`;
      break;
    }
    const res = await polite(`${STORE}${path}`, 'HEAD');
    if (!res) break;
    if (res.status >= 400 || res.status === 0) {
      findings.push({ kind: 'broken-internal-link', tier: C.tierOf('broken-internal-link'),
        url: `${STORE}${path}`,
        detail: `HTTP ${res.status || 'no response'}, linked from ${ref.count} crawled page(s)`,
        evidence: path,
        // The target alone is not actionable. Whoever fixes this needs the page
        // that emits the link, because that is where the template lives.
        linked_from: ref.from });
    }
  }

  // --no-api exists so a storefront-only run costs no requests against Railway.
  const api = flag('no-api') ? {} : await apiHealth(findings);

  if (aborted.yes) {
    findings.unshift({ kind: 'challenge-served', tier: 'P0', url: STORE,
      detail: aborted.why, evidence: 'crawl aborted' });
  }

  const current = {
    started_at: started.toISOString(),
    finished_at: new Date().toISOString(),
    store: STORE,
    api: API,
    api_commit: api.commit || null,
    shard: FULL ? 'full' : `${shard + 1}/${SHARDS}`,
    sitemap_total: all.length,
    crawled: crawledUrls.size,
    ok: okCount,
    requests,
    aborted: aborted.yes ? aborted.why : null,
    truncated: truncated || null,
    max_minutes: MAX_MINUTES,
    findings: C.rank(findings),
    crawledUrls,
    fingerprints,
  };

  const d = C.delta(previous, current);
  // nights-open carries forward so the report can say how long something has
  // been broken, which is most of what separates "new tonight" from "ignored".
  for (const f of current.findings) {
    const key = `${f.kind}|${f.url}|${f.evidence || f.detail || ''}`;
    f.nights = d.ages[key] || 1;
  }

  const serializable = { ...current, crawledUrls: Array.from(crawledUrls) };
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(serializable, null, 2));

  if (flag('json')) {
    console.log(JSON.stringify({ ...serializable, delta: { fresh: d.fresh, resolved: d.resolved, baseline: d.baseline } }, null, 2));
  } else {
    console.log(report(current, d));
  }

  // Exit code is for CI, not for the agent. A P0 fails the run; everything else
  // is information. An aborted crawl also fails, because a night that collected
  // nothing must never look like a quiet night.
  const p0 = current.findings.filter((f) => f.tier === 'P0').length;
  process.exitCode = (p0 > 0 || aborted.yes || truncated) ? 1 : 0;
}

// ── THE REPORT ───────────────────────────────────────────────────────────────
function report(cur, d) {
  const L = [];
  const groups = C.group(cur.findings);
  const counts = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const f of cur.findings) counts[f.tier] = (counts[f.tier] || 0) + 1;

  L.push(`### Nightly site crawl - ${cur.started_at.slice(0, 10)}`);
  L.push('');
  L.push(`Shard ${cur.shard}. Crawled ${cur.crawled} of ${cur.sitemap_total} sitemap URLs in ` +
         `${Math.round((new Date(cur.finished_at) - new Date(cur.started_at)) / 1000)}s ` +
         `across ${cur.requests} requests. API build \`${cur.api_commit || 'unknown'}\`.`);
  L.push('');
  if (cur.aborted) {
    L.push(`**The crawl stopped early.** ${cur.aborted}`);
    L.push('');
  }
  if (cur.truncated) {
    L.push(`**The crawl ran out of time.** ${cur.truncated}. Tonight's coverage is ` +
           `short, so treat a quiet report as untested rather than clean.`);
    L.push('');
  }

  if (!cur.findings.length) {
    L.push(cur.truncated || cur.aborted
      ? '**Nothing found in what was reached**, which is not the same as nothing wrong. See above.'
      : '**Nothing found.** Every URL crawled tonight answered cleanly and every check passed.');
    return L.join('\n');
  }

  L.push(`**${counts.P0} P0, ${counts.P1} P1, ${counts.P2} P2, ${counts.P3} P3.**` +
         (d.baseline ? ` ${d.fresh.length} new since last night, ${d.resolved.length} resolved.` : ' No baseline to compare against.'));
  L.push('');

  for (const tier of ['P0', 'P1', 'P2', 'P3']) {
    const rows = groups.filter((g) => g.tier === tier);
    if (!rows.length) continue;
    L.push(`#### ${tier} - ${C.KINDS[rows[0].kind] ? tierLabel(tier) : tier}`);
    L.push('');
    for (const g of rows.slice(0, 15)) {
      const k = C.KINDS[g.kind] || { headline: g.kind, why: '' };
      const age = g.nights > 1 ? `, ${g.nights} nights` : '';
      L.push(`- **${k.headline}**${g.count > 1 ? ` (${g.count} pages${age})` : age ? ` (${g.nights} nights)` : ''}: ` +
             `${g.detail_is_example ? 'e.g. ' : ''}${g.detail}`);
      L.push(`  - ${k.why}`);
      for (const u of g.urls.slice(0, 3)) L.push(`  - ${u}`);
      if (g.count > 3) L.push(`  - ...and ${g.count - 3} more`);
      // For a broken link the target is the symptom; the page that emits it is
      // where the fix goes.
      if (g.linked_from && g.linked_from.length) {
        L.push(`  - linked from: ${g.linked_from.slice(0, 3).join(', ')}`);
      }
    }
    if (rows.length > 15) L.push(`- ...and ${rows.length - 15} more ${tier} finding kinds`);
    L.push('');
  }
  return L.join('\n');
}

function tierLabel(tier) {
  return {
    P0: 'students blocked, or graded work silently not recording',
    P1: 'a student will hit this and it is wrong',
    P2: 'drift and discoverability',
    P3: 'hygiene',
  }[tier] || tier;
}

if (require.main === module) {
  main().catch((e) => {
    console.error(`\n  Crawl failed: ${e.message}\n`);
    process.exit(1);
  });
}

module.exports = { shardOf, dayOfYear, hotSet, report, deployLag, GRACE_MINUTES };
