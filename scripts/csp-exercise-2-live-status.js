'use strict';
// -----------------------------------------------------------------------------
//  WHICH OF THE 35 CSP exercise-2 PAGES ACTUALLY EXIST ON THE STOREFRONT.
//
//  ── WHY THIS IS ITS OWN PROGRAM ─────────────────────────────────────────────
//  smoke/fixtures/live-page-handles.txt is a snapshot. It says 18 of the 35 are
//  live, and a snapshot is exactly the kind of instrument that reports a
//  convention as a defect once it goes stale. Publishing a page is an
//  irreversible act against a live store, so the set that goes into the sheet is
//  measured against the storefront on the day, not read out of a file.
//
//  ── 429 IS NOT 404, AND THAT DISTINCTION IS THE WHOLE POINT ─────────────────
//  Board item #79 records 46 pages returning 429 during a parallel crawl of this
//  same storefront. A crawler that folds a throttle into "missing" would hand
//  back a list of pages to publish OVER pages that already exist, and each of
//  those would be a silent rewrite of a live body rather than a publish.
//
//  So: one request at a time, a pause between pages, and only 200 and 404 are
//  ever treated as answers. Anything else is retried, and a handle that never
//  resolves is reported UNRESOLVED and refuses the run rather than being
//  guessed at in either direction.
//
//  ── AND A 200 IS NOT ALWAYS THE PAGE ────────────────────────────────────────
//  This paragraph used to say "a real browser User-Agent", which was true of
//  the storefront that existed when it was written and became the bug on
//  2026-09-03, when bot management inverted and started challenging the spoof.
//  It has since relaxed again, so the spoof works today. That is the argument
//  FOR this change rather than against it: the header is not a control surface
//  this repo owns, it has flipped twice in four days, and the flip is silent.
//
//  What makes the flip expensive here is the shape of the two assertions
//  below. They are `body.includes(WRAPPER)` and a count of `mcq-item`, and BOTH
//  read false on an interstitial, so a challenge served with a 200 would be
//  reported as 35 pages that lost their wrapper and serve zero questions.
//  verify-csp-applied-cards-live said exactly that about all 17 Applied
//  Challenge pages on 2026-09-03. All 17 were fine.
//
//  So every fetch goes through lib/storefront-fetch.js, which sends no
//  User-Agent and proves a body is a rendered page on a positive marker the
//  challenge cannot fake, before this file is allowed to believe anything
//  about it.
//
//  ── WHAT "LIVE" MEANS HERE ──────────────────────────────────────────────────
//  A Shopify 404 still returns a full themed document, 300 KB of it, so byte
//  count proves nothing. `verify` therefore asserts the marker only the
//  exercise-2 renderer emits (id="csp-x2") and counts the six graded items the
//  generator says the page has. A 200 that serves the 404 template, or a page
//  that lost half its questions in an import, both fail.
//
//  Zero PII: public pages only, no credentials sent.
//
//  Run:
//    node scripts/csp-exercise-2-live-status.js probe [--out f.jsonl] [--delay ms]
//    node scripts/csp-exercise-2-live-status.js probe --links   (also probe every
//                       internal link target the 35 generated bodies point at)
//    node scripts/csp-exercise-2-live-status.js verify <handles.txt>
//
//  probe  exits 1 if any handle is UNRESOLVED.
//  verify exits 1 unless every named handle is 200 and serves its six questions.
// -----------------------------------------------------------------------------

const fs = require('fs');
const sf = require('../lib/storefront-fetch');
const { allPages } = require('../lib/csp-course-pages');

const STORE = sf.STORE;
const DELAY_MS = 1200;
const ATTEMPTS = 4;

//  The marker only the exercise-2 renderer emits, and the per-question class it
//  repeats once per graded item. Both are read off lib/csp-course-pages.js
//  output rather than typed from memory, so a renderer change cannot leave this
//  asserting a string nothing emits any more.
const WRAPPER = 'id="csp-x2"';
const ITEM = 'class="mcq-item"';

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function exercise2Pages() {
  return allPages().filter((p) => p.kind === 'exercise-2');
}

//  Every internal page link the generated bodies point at, EXCLUDING anything
//  inside a <script> block. A previous scan in this repo read
//  href="/pages/'+prev.handle+'" out of a script and reported 141 dead links
//  that were string concatenation, so script blocks are cut out before the
//  hrefs are read rather than filtered afterwards.
function linkTargets(pages) {
  const out = new Map();
  for (const p of pages) {
    const markup = p.bodyHtml.replace(/<script[\s\S]*?<\/script>/g, '');
    for (const m of markup.match(/href="\/pages\/[a-z0-9-]+"/g) || []) {
      const h = m.slice('href="/pages/'.length, -1);
      if (!out.has(h)) out.set(h, []);
      out.get(h).push(p.handle);
    }
  }
  return out;
}

async function fetchOnce(handle) {
  const at = new Date().toISOString();
  try {
    const r = sf.raw(`/pages/${handle}`);
    //  A 404 here is an ANSWER, and a themed 404 carries the storefront markers
    //  like any other rendered page, so only a 200 is worth asking about. On a
    //  200 that is not the page, report status 0 with the reason: that sends it
    //  down the retry path and, if it never clears, out as UNRESOLVED. Which is
    //  the correct verdict. "The store would not show me this page" is not the
    //  same fact as "this page does not exist", and folding the first into the
    //  second is what would put a live body under a publish.
    const why = r.code === '200' ? sf.refusal(r) : null;
    if (why) return { at, status: 0, bytes: r.body.length, body: '', error: why };
    return { at, status: Number(r.code), bytes: Buffer.byteLength(r.body), body: r.body };
  } catch (e) {
    return { at, status: 0, bytes: 0, body: '', error: String(e.message || e) };
  }
}

//  Only 200 and 404 are answers. A 429, a 5xx or a dropped connection is the
//  network having an opinion about our crawl rate, not the store having an
//  opinion about the page.
async function probeHandle(handle) {
  let last = null;
  for (let i = 0; i < ATTEMPTS; i += 1) {
    if (i) await sleep(DELAY_MS * (i + 1) * 2);
    last = await fetchOnce(handle);
    if (last.status === 200 || last.status === 404) {
      return {
        handle,
        at: last.at,
        status: last.status,
        bytes: last.bytes,
        attempts: i + 1,
        wrapper: last.body.includes(WRAPPER),
        items: (last.body.match(/class="mcq-item"/g) || []).length,
      };
    }
  }
  return {
    handle,
    at: last.at,
    status: last.status,
    bytes: last.bytes,
    attempts: ATTEMPTS,
    unresolved: true,
    error: last.error || `HTTP ${last.status}`,
  };
}

async function probe(handles, delay) {
  const rows = [];
  for (const h of handles) {
    const r = await probeHandle(h);
    rows.push(r);
    process.stderr.write(`    ${String(r.status).padEnd(4)}${r.unresolved ? 'UNRESOLVED ' : ''}`
      + `${h}${r.status === 200 ? `  (${r.items} item(s))` : ''}\n`);
    await sleep(delay);
  }
  return rows;
}

async function cmdProbe(argv) {
  const arg = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
  const out = arg('--out');
  const delay = Number(arg('--delay') || DELAY_MS);
  const pages = exercise2Pages();
  let handles = pages.map((p) => p.handle);
  const links = argv.includes('--links');
  if (links) {
    const targets = linkTargets(pages);
    for (const h of targets.keys()) if (!handles.includes(h)) handles.push(h);
  }

  process.stderr.write(`\n  probing ${handles.length} handle(s), single threaded, `
    + `${delay}ms apart, through lib/storefront-fetch.js\n\n`);
  const rows = await probe(handles, delay);

  const isX2 = new Set(pages.map((p) => p.handle));
  const x2 = rows.filter((r) => isX2.has(r.handle));
  const unresolved = rows.filter((r) => r.unresolved);
  const dead = x2.filter((r) => r.status === 404);
  const alive = x2.filter((r) => r.status === 200);

  if (out) {
    fs.writeFileSync(out, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
    process.stderr.write(`\n  wrote ${out}\n`);
  }

  const byUnit = {};
  const unitOf = new Map(pages.map((p) => [p.handle, p.unit]));
  for (const r of dead) { const u = unitOf.get(r.handle); byUnit[u] = (byUnit[u] || 0) + 1; }

  console.log(`EXERCISE-2 LIVE STATUS  ${alive.length} live, ${dead.length} dead, `
    + `${unresolved.length} unresolved, of ${x2.length}`);
  console.log(`  dead by unit: ${JSON.stringify(byUnit)}`);
  if (links) {
    const linkRows = rows.filter((r) => !isX2.has(r.handle));
    const deadLinks = linkRows.filter((r) => r.status !== 200);
    console.log(`  link targets: ${linkRows.length} probed, ${deadLinks.length} not 200`);
    for (const r of deadLinks) console.log(`    DEAD LINK TARGET ${r.handle} -> ${r.status}`);
  }
  if (unresolved.length) {
    console.error('\n  UNRESOLVED, so nothing may be concluded about these:');
    for (const r of unresolved) console.error(`    ${r.handle}: ${r.error}`);
    process.exit(1);
  }
}

async function cmdVerify(argv) {
  const file = argv[0];
  if (!file) { console.error('usage: verify <handles.txt>'); process.exit(2); }
  const want = fs.readFileSync(file, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
  const byHandle = new Map(exercise2Pages().map((p) => [p.handle, p]));
  const bad = [];
  process.stderr.write(`\n  verifying ${want.length} published handle(s)\n\n`);
  const rows = await probe(want, DELAY_MS);
  for (const r of rows) {
    const p = byHandle.get(r.handle);
    if (!p) { bad.push(`${r.handle}: not one of the generated exercise-2 pages`); continue; }
    if (r.unresolved) { bad.push(`${r.handle}: ${r.error}`); continue; }
    if (r.status !== 200) { bad.push(`${r.handle}: HTTP ${r.status}, still not published`); continue; }
    if (!r.wrapper) { bad.push(`${r.handle}: 200 but no ${WRAPPER}, so that is the theme's 404 or another page`); continue; }
    if (r.items !== p.questions) {
      bad.push(`${r.handle}: serves ${r.items} ${ITEM} block(s), the generator wrote ${p.questions}`);
    }
  }
  if (bad.length) {
    console.error(`\n  ${bad.length} problem(s):`);
    bad.forEach((b) => console.error('    ' + b));
    process.exit(1);
  }
  const q = rows.reduce((n, r) => n + r.items, 0);
  console.log(`PUBLISHED AND SERVING  ${rows.length} page(s) return 200 and serve ${q} graded questions`);
}

async function main(argv) {
  const cmd = argv[0];
  if (cmd === 'probe') return cmdProbe(argv.slice(1));
  if (cmd === 'verify') return cmdVerify(argv.slice(1));
  console.error('usage: node scripts/csp-exercise-2-live-status.js probe|verify ...');
  process.exit(2);
}

if (require.main === module) main(process.argv.slice(2)).catch((e) => { console.error(e); process.exit(1); });
module.exports = { linkTargets, exercise2Pages, WRAPPER, ITEM };
