'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ANSWER KEY AND FEEDBACK VERIFIER for radio-button exam and quiz pages.
//
//  Generalizes verify-cyber-unit-1-exam-key.js, which was hardcoded to 20
//  questions and the "qe" radio prefix, so it could only ever look at one page.
//  That script found the Q8 mis-key on the Cyber Unit 1 exam: the key said A
//  while every piece of feedback on the page argued for B. The same defect class
//  can sit on any of the 71 pages carrying this widget, so the check has to be
//  able to run against all of them.
//
//  SHAPE UNDERSTOOD
//      var ANSWERS = {"e1":"D", ...}   or   {"q1":"D", ...}
//      <input name="q<KEY>" value="A"> <span>(A) option text</span>
//      <div class="fb-distractors"> ... <strong>(A)</strong> why it is wrong
//  The radio group name is always "q" + the ANSWERS key, which is what lets one
//  script cover both the "e"-keyed exams and the "q"-keyed practice pages.
//
//  Drag-and-drop exercises use `var ANSWERS = [` (an array, keyed by position,
//  no letters) and are correctly skipped: there is no letter to be biased.
//
//  WHAT IT CHECKS
//    1. every question offers exactly 4 options
//    2. radio value matches the visible "(X)" label, so clicking B submits B
//    3. the key letter is actually among the options offered
//    4. no distractor explanation sits on the correct answer   <- caught Q8
//    5. every wrong option has a distractor explanation at all
//  Plus letter distribution and longest same-letter run, so a key that is
//  guessable without reading the questions shows up as a number.
//
//  A page it cannot parse is a FAIL, never a silent pass.
//
//  TWO WAYS TO RUN
//    Offline, against saved bodies:
//      node scripts/one-off/verify-exam-key.js backup/*.html
//
//    Against the live store, which is the only way to cover all 71 pages:
//      SHOPIFY_SHOP=... SHOPIFY_ADMIN_TOKEN=... \
//        node scripts/one-off/verify-exam-key.js --fetch "fb-distractors"
//
//  --fetch takes a Shopify page search query, pulls every match with cursor
//  pagination, caches each body under .work/page-cache/<handle>.html and audits
//  the lot. Re-run with --cached to audit the cache without hitting the API.
//  The cache is gitignored: it is a snapshot of live content, not source.
//
//  Read scope is enough. This script never writes to Shopify.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const LETTERS = ['A', 'B', 'C', 'D'];
const CACHE = process.env.PAGE_CACHE || '.work/page-cache';
const SHOP = process.env.SHOPIFY_SHOP;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API = process.env.SHOPIFY_API_VERSION || '2025-01';

// ── audit ───────────────────────────────────────────────────────────────────

function auditBody(body, name) {
  const m = body.match(/var ANSWERS = (\{[^}]*\})/);
  if (!m) {
    const isArray = /var ANSWERS = \[/.test(body);
    return { name, skipped: true,
      why: isArray ? 'drag-and-drop exercise, no letter key' : 'no letter ANSWERS object' };
  }

  let ANSWERS;
  try { ANSWERS = JSON.parse(m[1]); } catch (e) {
    return { name, fail: ['ANSWERS is not valid JSON, cannot audit'], n: 0 };
  }

  const keys = Object.keys(ANSWERS);
  const key = keys.map((k) => ANSWERS[k]);
  const bad = [];
  const counts = { miskey: 0, gap: 0, structural: 0 };

  const dist = { A: 0, B: 0, C: 0, D: 0 };
  key.forEach((k) => {
    if (dist[k] === undefined) { bad.push('key letter ' + k + ' is not A-D'); counts.structural++; }
    else dist[k]++;
  });

  let run = 1, longest = 1;
  for (let i = 1; i < key.length; i++) {
    run = key[i] === key[i - 1] ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  keys.forEach((k) => {
    const q = 'q' + k;
    const opts = [...body.matchAll(
      new RegExp('name="' + q + '" value="([A-D])"> <span>\\(([A-D])\\) ([^<]*)<', 'g')
    )];
    if (opts.length !== 4) {
      bad.push(k + ': ' + opts.length + ' options, expected 4'); counts.structural++; return;
    }
    opts.forEach((o) => {
      if (o[1] !== o[2]) {
        bad.push(k + ': radio value ' + o[1] + ' but visible label (' + o[2] + ')');
        counts.structural++;
      }
    });
    if (!opts.some((o) => o[1] === ANSWERS[k])) {
      bad.push(k + ': key ' + ANSWERS[k] + ' is not an offered option'); counts.structural++;
    }

    const anchor = body.indexOf('name="' + q + '" value="A"');
    const ds = body.indexOf('<div class="fb-distractors">', anchor);
    if (anchor === -1 || ds === -1) {
      bad.push(k + ': no distractor block found'); counts.structural++; return;
    }
    const inner = body.slice(ds, body.indexOf('</div>', ds));
    const listed = [...inner.matchAll(/<strong>\(([A-D])\)<\/strong>/g)].map((d) => d[1]);
    listed.forEach((L) => {
      if (L === ANSWERS[k]) {
        bad.push(k + ': distractor (' + L + ') IS the correct answer'); counts.miskey++;
      }
    });
    LETTERS.filter((L) => L !== ANSWERS[k]).forEach((L) => {
      if (!listed.includes(L)) {
        bad.push(k + ': wrong option (' + L + ') has no distractor explanation'); counts.gap++;
      }
    });
  });

  return { name, n: key.length, key, dist, longest, fail: bad, counts };
}

// ── fetch ───────────────────────────────────────────────────────────────────

async function gql(query, variables) {
  const res = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' from Shopify');
  const j = await res.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}

const PAGE_QUERY = `query($q:String!,$after:String){
  pages(first: 10, query: $q, after: $after) {
    pageInfo { hasNextPage endCursor }
    edges { node { handle body } }
  }
}`;

async function fetchAll(searchQuery) {
  fs.mkdirSync(CACHE, { recursive: true });
  const handles = [];
  let after = null, hasNext = true, batch = 0;
  while (hasNext) {
    const d = await gql(PAGE_QUERY, { q: searchQuery, after });
    const edges = d.pages.edges;
    edges.forEach((e) => {
      const f = path.join(CACHE, e.node.handle + '.html');
      fs.writeFileSync(f, e.node.body || '');
      handles.push(e.node.handle);
    });
    hasNext = d.pages.pageInfo.hasNextPage;
    after = d.pages.pageInfo.endCursor;
    batch++;
    process.stderr.write('fetched batch ' + batch + ', ' + handles.length + ' pages\n');
  }
  return handles;
}

// ── report ──────────────────────────────────────────────────────────────────

function report(results, verbose) {
  const audited = results.filter((r) => !r.skipped);
  const skipped = results.filter((r) => r.skipped);
  const broken = audited.filter((r) => r.fail.length);

  if (verbose) {
    results.forEach((r) => {
      console.log('\n=== ' + r.name + ' ===');
      if (r.skipped) { console.log('skipped       ' + r.why); return; }
      console.log('questions     ' + r.n);
      console.log('key           ' + r.key.join(' '));
      console.log('distribution  ' + LETTERS.map((L) => L + ':' + r.dist[L]).join('  '));
      console.log('bubble score  ' + LETTERS.map(
        (L) => L + ':' + Math.round(r.dist[L] / r.n * 100) + '%').join('  '));
      console.log('longest run   ' + r.longest);
      if (r.fail.length) {
        console.log('integrity     FAIL');
        r.fail.forEach((x) => console.log('  - ' + x));
      } else {
        console.log('integrity     PASS - ' + r.n + '/' + r.n + ' questions clean');
      }
    });
  }

  console.log('\n──────── SUMMARY ────────');
  console.log('audited ' + audited.length + ', skipped ' + skipped.length +
    ' (no letter key), with defects ' + broken.length);

  if (broken.length) {
    console.log('\nranked by defect count:');
    const w = Math.max(...broken.map((r) => r.name.length));
    broken.sort((a, b) => b.fail.length - a.fail.length).forEach((r) => {
      console.log('  ' + r.name.padEnd(w) + '  ' + String(r.fail.length).padStart(3) +
        ' defects   correct-letter-as-distractor:' + r.counts.miskey +
        '  missing-explanation:' + r.counts.gap +
        '  structural:' + r.counts.structural);
    });
    if (!verbose) console.log('\nre-run with --verbose for the per-question detail');
  }
  return broken.length;
}

// ── main ────────────────────────────────────────────────────────────────────

(async function main() {
  const argv = process.argv.slice(2);
  const verbose = argv.includes('--verbose');
  const cached = argv.includes('--cached');
  const fi = argv.indexOf('--fetch');
  // when --fetch is absent, fi is -1 and argv[fi + 1] would be argv[0], which
  // would silently drop the first file. Only skip the query when --fetch is real.
  const query = fi === -1 ? null : argv[fi + 1];
  const files = argv.filter((a, i) => !a.startsWith('--') && !(fi !== -1 && i === fi + 1));

  let targets = [];

  if (fi !== -1) {
    const q = query;
    if (!q || q.startsWith('--')) {
      console.error('--fetch needs a Shopify page search query'); process.exit(2);
    }
    if (!SHOP || !TOKEN) {
      console.error('--fetch needs credentials. Set both, then re-run:');
      console.error('  SHOPIFY_SHOP=your-store.myshopify.com');
      console.error('  SHOPIFY_ADMIN_TOKEN=<token with read_content>');
      console.error('Read scope is enough. This script never writes to Shopify.');
      process.exit(2);
    }
    const handles = await fetchAll(q);
    targets = handles.map((h) => path.join(CACHE, h + '.html'));
  } else if (cached) {
    if (!fs.existsSync(CACHE)) { console.error('no cache at ' + CACHE); process.exit(2); }
    targets = fs.readdirSync(CACHE).filter((f) => f.endsWith('.html')).map((f) => path.join(CACHE, f));
  } else {
    targets = files;
  }

  if (!targets.length) {
    console.error('usage:');
    console.error('  verify-exam-key.js <file.html> [...]        audit saved bodies');
    console.error('  verify-exam-key.js --fetch "<query>"        fetch from Shopify, then audit');
    console.error('  verify-exam-key.js --cached                 audit the existing cache');
    console.error('  add --verbose for per-question detail');
    process.exit(2);
  }

  const results = targets.map((f) =>
    auditBody(fs.readFileSync(f, 'utf8'), path.basename(f).replace(/\.html$/, '')));

  process.exit(report(results, verbose || targets.length <= 3) ? 1 : 0);
})().catch((e) => { console.error('failed: ' + e.message); process.exit(2); });
