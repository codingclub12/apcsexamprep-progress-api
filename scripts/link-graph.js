#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  LINK GRAPH CRAWL - the network half of lib/link-graph.js.
//
//  Same posture and the same throttle as scripts/site-crawl.js, and for the same
//  recorded reasons: board task 79 (46 pages returned 429), smoke.yml (rapid
//  runs made the storefront serve empty pages), grade-path-audit.js (ten
//  requests over a 250-page crawl). One request per second, doubling backoff,
//  five strikes and stop, hard wall clock.
//
//  DIFFERENT FROM THE NIGHTLY CRAWL IN ONE WAY: no shard rotation. An
//  architecture map is worthless partial - you cannot call a page an orphan
//  when a sixth of the site that might link to it was never fetched. So this
//  runs the whole sitemap, once, deliberately, and is NOT a nightly job.
//
//  It reads. It sends no credential and writes nothing but its own output.
//
//  Output is NDJSON, appended per page, so a run that is interrupted at page
//  900 still leaves 900 usable records and can be resumed against them.
//
//    node scripts/link-graph.js --out /tmp/graph.ndjson
//    node scripts/link-graph.js --out g.ndjson --include pages,collections,products
//    node scripts/link-graph.js --out g.ndjson --resume     # skip what is there
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const G = require('../lib/link-graph');
const C = require('../lib/site-crawl');

const STORE = (process.env.STORE_ORIGIN || 'https://www.apcsexamprep.com').replace(/\/+$/, '');
const UA = 'Mozilla/5.0 (compatible; apcse-link-graph/1.0) Chrome/120.0.0.0 Safari/537.36';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes('--' + n);
const opt = (n, d) => {
  const i = argv.indexOf('--' + n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};

const OUT = opt('out', '/tmp/link-graph.ndjson');
const DELAY = Number(opt('delay', '900'));
const MAX_MINUTES = Number(opt('max-minutes', '75'));
const BUDGET = Number(opt('budget', '0'));            // 0 = no cap
const INCLUDE = String(opt('include', 'pages,collections,products,articles'))
  .split(',').map((s) => s.trim()).filter(Boolean);
const RESUME = flag('resume');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_STRIKES = 5;
let delay = DELAY;
let strikes = 0;
let clean = 0;
let requests = 0;
let deadline = Infinity;
const aborted = { yes: false, why: '' };
const outOfTime = () => Date.now() > deadline;

async function fetchOnce(url) {
  const started = Date.now();
  let redirects = 0;
  let current = url;
  for (let hop = 0; hop < 6; hop++) {
    let r;
    try {
      r = await fetch(current, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
        redirect: 'manual',
      });
    } catch (e) {
      return { status: 0, html: '', ms: Date.now() - started, redirects, error: e.message, finalUrl: current };
    }
    requests += 1;
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      redirects += 1;
      current = new URL(r.headers.get('location'), current).toString();
      continue;
    }
    return { status: r.status, html: await r.text(), ms: Date.now() - started, redirects, finalUrl: current };
  }
  return { status: 0, html: '', ms: Date.now() - started, redirects, error: 'redirect loop', finalUrl: current };
}

async function polite(url) {
  if (aborted.yes) return null;
  const res = await fetchOnce(url);
  const throttled = res.status === 429 || res.status === 503 ||
    C.looksLikeChallenge(res.html || '', res.status);
  if (throttled) {
    strikes += 1;
    clean = 0;
    delay = Math.min(delay * 2, 30000);
    if (strikes >= MAX_STRIKES) {
      aborted.yes = true;
      aborted.why = `stopped after ${MAX_STRIKES} throttled responses`;
    }
  } else if (res.status > 0) {
    clean += 1;
    if (clean >= 10 && delay > DELAY) { delay = Math.max(DELAY, Math.floor(delay / 2)); clean = 0; }
  }
  await sleep(delay);
  return res;
}

async function sitemapUrls() {
  const out = { pages: [], collections: [], products: [], articles: [] };
  const root = await polite(`${STORE}/sitemap.xml`);
  if (!root || root.status !== 200) throw new Error(`sitemap.xml -> ${root && root.status}`);
  const children = Array.from(root.html.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
  for (const child of children) {
    if (/agentic_discovery/.test(child)) continue;
    const bucket = /_pages_/.test(child) ? 'pages'
      : /_collections_/.test(child) ? 'collections'
      : /_products_/.test(child) ? 'products'
      : /_blogs_/.test(child) ? 'articles' : null;
    if (!bucket || !INCLUDE.includes(bucket)) continue;
    const res = await polite(child.replace(/&amp;/g, '&'));
    if (!res || res.status !== 200) { console.error(`  sitemap child failed: ${child} -> ${res && res.status}`); continue; }
    for (const m of res.html.matchAll(/<loc>([^<]+)<\/loc>/g)) out[bucket].push(m[1].replace(/&amp;/g, '&'));
  }
  return out;
}

function h1Of(html) {
  const m = G.stripCode(html).match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? G.textOf(m[1]) : '';
}

async function main() {
  deadline = MAX_MINUTES > 0 ? Date.now() + MAX_MINUTES * 60000 : Infinity;
  const t0 = Date.now();

  const done = new Set();
  if (RESUME && fs.existsSync(OUT)) {
    for (const line of fs.readFileSync(OUT, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { done.add(JSON.parse(line).path); } catch (e) { /* partial last line */ }
    }
    console.error(`resume: ${done.size} pages already recorded`);
  } else if (fs.existsSync(OUT)) {
    fs.unlinkSync(OUT);
  }

  console.error(`enumerating sitemap (${INCLUDE.join(', ')})...`);
  const found = await sitemapUrls();
  const urls = [`${STORE}/`, ...found.pages, ...found.collections, ...found.products, ...found.articles];
  const uniq = Array.from(new Set(urls));
  console.error(`  ${uniq.length} urls: ${Object.entries(found).map(([k, v]) => `${v.length} ${k}`).join(', ')}`);

  const stream = fs.createWriteStream(OUT, { flags: 'a' });
  let n = 0;
  let skipped = 0;
  for (const url of uniq) {
    if (aborted.yes) break;
    if (outOfTime()) { aborted.yes = true; aborted.why = `wall clock: ${MAX_MINUTES} minutes`; break; }
    if (BUDGET > 0 && n >= BUDGET) { aborted.yes = true; aborted.why = `budget: ${BUDGET} pages`; break; }
    const path = G.normalize(url);
    if (done.has(path)) { skipped++; continue; }

    const res = await polite(url);
    if (!res) break;
    // Parse and DROP. Pages are 350-750KB; nothing here retains a body.
    const rec = {
      path,
      status: res.status,
      redirects: res.redirects,
      ms: res.ms,
      bytes: res.html ? Buffer.byteLength(res.html) : 0,
      title: res.status === 200 ? G.textOf((res.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1]) : '',
      h1: res.status === 200 ? h1Of(res.html) : '',
      links: res.status === 200 ? G.extractLinks(res.html) : [],
    };
    if (res.error) rec.error = res.error;
    stream.write(JSON.stringify(rec) + '\n');
    n += 1;
    if (n % 50 === 0) {
      const mins = ((Date.now() - t0) / 60000).toFixed(1);
      console.error(`  ${n}/${uniq.length - skipped}  ${mins}m  delay=${delay}ms  strikes=${strikes}`);
    }
  }
  stream.end();

  const mins = ((Date.now() - t0) / 60000).toFixed(1);
  console.error(`\ncrawled ${n} pages in ${mins} minutes, ${requests} requests`);
  if (aborted.yes) {
    console.error(`ABORTED: ${aborted.why}`);
    console.error('This run is TRUNCATED. Orphan counts from it are not trustworthy:');
    console.error('a page can only be called unlinked once every possible linker was fetched.');
    process.exit(2);
  }
  console.error('complete.');
}

main().catch((e) => { console.error(e); process.exit(1); });
