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
//  SHAPES UNDERSTOOD: three of them, read the block above auditBody for the
//  table and for why this stopped being one. In short, the key can live in a
//  `var ANSWERS` object, in the arguments of a `qzNAME(this,q,idx,corr)` click
//  handler, or in the arguments of a `checkMCQ('qN','C',...)` button.
//
//  Drag-and-drop exercises use `var ANSWERS = [` (an array, keyed by position,
//  no letters) and are correctly skipped: there is no letter to be biased.
//
//  WHAT IT CHECKS
//    1. every question offers exactly 4 options
//    2. what the student clicks is what gets graded: radio value against the
//       visible "(X)" label, or data-idx against the handler's index
//    3. the key letter is actually among the options offered
//    4. the key is not guessable: no letter over the cap, no letter unused,
//       no long same-letter run                                <- caught Unit 3
//    5. no distractor explanation sits on the correct answer    <- caught Q8
//    6. every wrong option has a distractor explanation at all
//  Checks 5 and 6 need one explanation per option and so run only on the
//  answers-object shape. Every result prints the shape it matched and the
//  checks that actually ran, so coverage is never assumed.
//
//  A page it cannot PARSE is a fail. A page whose shape it does not RECOGNISE
//  is skipped, which is a silent pass and is exactly how the Unit 3 key shipped:
//  the summary said "skipped 3" and the exit code stayed 0. Read that number
//  every time. Two more shapes are known to exist and are still not handled,
//  both on lesson quizzes: `var DATA={...}` and `var sel={...}`, each with a
//  `window.checkQ` handler.
//
//  TWO WAYS TO RUN
//    Offline, against saved bodies:
//      node scripts/one-off/verify-exam-key.js backup/*.html
//
//    Against the live store, which is the only way to cover all 71 pages:
//      SHOPIFY_SHOP=... SHOPIFY_ADMIN_TOKEN=... \
//        node scripts/one-off/verify-exam-key.js --fetch "fb-distractors"
//
//    That example query matches the answers-object pages only, because
//    fb-distractors is that shape's markup. Widen it, or run it more than once,
//    to reach the corr-index and check-mcq pages.
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

//  THREE KEY SHAPES, NOT ONE.
//
//  This script used to understand only `var ANSWERS = {"e1":"D"}` and reported
//  everything else as "no letter key". That is not a small gap: of the five AP
//  Cybersecurity unit exams it could audit two, and the three it skipped were
//  skipped SILENTLY, as a line in the summary rather than a failure. The Unit 3
//  exam key turned out to be 16 B out of 20 with no D anywhere, so bubbling B
//  scored 80 percent, and it sat on the one page the checker structurally could
//  not open. An audit that runs and passes is worse than no audit.
//
//    shape          key lives in                        pages
//    answers-object var ANSWERS = {"e1":"D"}            cyber unit 1, 2, most quizzes
//    corr-index     4th arg of qzNAME(this,q,idx,corr)  cyber unit 3
//    check-mcq      2nd arg of checkMCQ('qN','C',...)   cyber unit 4, 5
//
//  Drag-and-drop exercises use `var ANSWERS = [` and are still skipped on
//  purpose: keyed by position, there is no letter to be biased.
//
//  WHY THE PER-QUESTION CHECKS ARE NOT THE SAME FOR ALL THREE
//  The distractor checks (no explanation on the correct answer, every wrong
//  option explained) need one explanation PER OPTION, which only the
//  answers-object pages have. The other two shapes carry a single explanation
//  per question, shown whether the student was right or wrong, so running those
//  checks against them would report 60 fabricated defects a page. Each shape
//  therefore declares which checks it supports, and the report prints that,
//  because a coverage claim nobody can see is how this went wrong the first
//  time.

const SHAPES = {
  'answers-object': ['4 options', 'label matches value', 'key is offered',
    'correct not listed as distractor', 'every wrong option explained'],
  'corr-index': ['4 options', 'data-idx matches handler', 'key is offered',
    'options agree on one key', 'CORR array agrees with handlers'],
  'check-mcq': ['4 options', 'label matches value', 'key is offered'],
};

//  The guessability bound is the bundle generator's own, not a new invention.
//  Its printed keys record a cap per letter of 9 over 26 items, 8 over 24 and
//  7 over 22; Math.round(n / 3) reproduces all three, and gives 7 for a 20-item
//  exam. Unit 1 (max 6) and Unit 2 (max 7) sit under it; Unit 3's 16 does not.
function letterCap(n) { return Math.round(n / 3); }
const MAX_RUN = 4;

//  Below this many items the guessability signals measure the instrument's
//  LENGTH rather than its authoring. Four options times three is the smallest
//  key that can use every letter at least three times; on a 5-item lesson quiz
//  a missing letter is near-certain by pigeonhole and three of one letter is
//  ordinary, so firing there would be noise, and noise is how a checker stops
//  being read. Every unit exam is 20 items and clears this comfortably.
const MIN_N_FOR_GUESSABLE = 12;

function extractAnswersObject(body) {
  const m = body.match(/var\s+ANSWERS\s*=\s*(\{[^}]*\})/);
  if (!m) return null;
  let ANSWERS;
  try { ANSWERS = JSON.parse(m[1]); } catch (e) {
    return { parseError: 'ANSWERS is not valid JSON, cannot audit' };
  }
  const ids = Object.keys(ANSWERS);
  return { shape: 'answers-object', ids, key: ids.map((k) => ANSWERS[k]) };
}

//  qzu3exam(this, questionNumber, optionIndex, correctIndex). Every option of a
//  question repeats the same correctIndex, which is what makes "the four options
//  disagree" a checkable condition rather than an unrepresentable one.
function extractCorrIndex(body) {
  const calls = [...body.matchAll(/qz\w+\(this,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g)];
  if (!calls.length) return null;
  const byQ = new Map();
  calls.forEach((c) => {
    const q = Number(c[1]);
    if (!byQ.has(q)) byQ.set(q, []);
    byQ.get(q).push({ idx: Number(c[2]), corr: Number(c[3]) });
  });
  const ids = [...byQ.keys()].sort((a, b) => a - b).map(String);
  const key = ids.map((q) => {
    const corrs = [...new Set(byQ.get(Number(q)).map((o) => o.corr))];
    return corrs.length === 1 ? (LETTERS[corrs[0]] || '?' + corrs[0]) : '!';
  });
  return { shape: 'corr-index', ids, key, byQ };
}

function extractCheckMcq(body) {
  const calls = [...body.matchAll(/checkMCQ\(\s*['"](q\d+)['"]\s*,\s*['"]([A-D])['"]/g)];
  if (!calls.length) return null;
  const seen = new Map();
  calls.forEach((c) => { if (!seen.has(c[1])) seen.set(c[1], c[2]); });
  const ids = [...seen.keys()].sort(
    (a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  return { shape: 'check-mcq', ids, key: ids.map((k) => seen.get(k)) };
}

//  Shared by answers-object and check-mcq: both render radios whose value must
//  agree with the visible (X) the student reads. The two differ only in whether
//  a <span> wraps the label text, which is why one regex covers both.
function checkRadioOptions(body, radioName, keyLetter, id, bad, counts) {
  const opts = [...body.matchAll(new RegExp(
    'name="' + radioName + '" value="([A-D])">\\s*(?:<span>)?\\s*\\(([A-D])\\)', 'g'))];
  if (opts.length !== 4) {
    bad.push(id + ': ' + opts.length + ' options, expected 4'); counts.structural++;
    return null;
  }
  opts.forEach((o) => {
    if (o[1] !== o[2]) {
      bad.push(id + ': radio value ' + o[1] + ' but visible label (' + o[2] + ')');
      counts.structural++;
    }
  });
  if (!opts.some((o) => o[1] === keyLetter)) {
    bad.push(id + ': key ' + keyLetter + ' is not an offered option'); counts.structural++;
  }
  return opts;
}

//  Only the answers-object pages carry <div class="fb-distractors"> with one
//  <strong>(X)</strong> per wrong option. This is the check that caught the Q8
//  mis-key, and it is why that shape stays the most thoroughly audited one.
function checkDistractors(body, radioName, keyLetter, id, bad, counts) {
  const anchor = body.indexOf('name="' + radioName + '" value="A"');
  const ds = body.indexOf('<div class="fb-distractors">', anchor);
  if (anchor === -1 || ds === -1) {
    bad.push(id + ': no distractor block found'); counts.structural++; return;
  }
  const inner = body.slice(ds, body.indexOf('</div>', ds));
  const listed = [...inner.matchAll(/<strong>\(([A-D])\)<\/strong>/g)].map((d) => d[1]);
  listed.forEach((L) => {
    if (L === keyLetter) {
      bad.push(id + ': distractor (' + L + ') IS the correct answer'); counts.miskey++;
    }
  });
  LETTERS.filter((L) => L !== keyLetter).forEach((L) => {
    if (!listed.includes(L)) {
      bad.push(id + ': wrong option (' + L + ') has no distractor explanation');
      counts.gap++;
    }
  });
}

//  The positional equivalent of "radio value matches visible label": data-idx is
//  what the reader sees as option order, the handler's second argument is what
//  gets submitted, and a page where they disagree grades the wrong click.
function checkCorrOptions(shaped, q, keyLetter, id, bad, counts, body) {
  const opts = shaped.byQ.get(Number(q));
  if (opts.length !== 4) {
    bad.push(id + ': ' + opts.length + ' options, expected 4'); counts.structural++; return;
  }
  const corrs = [...new Set(opts.map((o) => o.corr))];
  if (corrs.length !== 1) {
    bad.push(id + ': options disagree on the correct index (' + corrs.join(', ') + ')');
    counts.structural++;
  }
  const idxs = opts.map((o) => o.idx).sort((a, b) => a - b);
  if (idxs.join(',') !== '0,1,2,3') {
    bad.push(id + ': option indices are ' + idxs.join(',') + ', expected 0,1,2,3');
    counts.structural++;
  }
  if (keyLetter === '!' || !LETTERS.includes(keyLetter)) {
    bad.push(id + ': correct index is not one of the four options offered');
    counts.structural++;
  }
  const declared = [...body.matchAll(new RegExp(
    'qz\\w+\\(this,\\s*' + q + '\\s*,\\s*(\\d+)\\s*,\\s*\\d+\\s*\\)[^>]*data-idx="(\\d+)"', 'g'))];
  declared.forEach((d) => {
    if (d[1] !== d[2]) {
      bad.push(id + ': handler index ' + d[1] + ' but data-idx ' + d[2]);
      counts.structural++;
    }
  });
}

//  A key nobody has to read the questions to pass. Reported as defects rather
//  than as numbers in the verbose output, because the numbers were already
//  being printed when Unit 3 shipped and nobody was looking at them.
function checkGuessable(key, bad, counts) {
  const n = key.length;
  if (!n) return;
  const dist = {};
  LETTERS.forEach((L) => { dist[L] = 0; });
  key.forEach((k) => { if (dist[k] !== undefined) dist[k]++; });

  let run = 1, longest = 1;
  for (let i = 1; i < n; i++) {
    run = key[i] === key[i - 1] ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  //  The numbers are still reported for a short quiz; only the verdict is
  //  withheld, so a human reading --verbose sees the same distribution either
  //  way and can judge a 5-item key themselves.
  if (n < MIN_N_FOR_GUESSABLE) return { dist, longest, guessableChecked: false };

  const cap = letterCap(n);
  const top = LETTERS.reduce((a, b) => (dist[a] >= dist[b] ? a : b));
  if (dist[top] > cap) {
    bad.push('key is guessable: ' + dist[top] + '/' + n + ' answers are ' + top +
      ' (cap ' + cap + '), so bubbling ' + top + ' scores ' +
      Math.round(dist[top] / n * 100) + '%');
    counts.guessable++;
  }
  LETTERS.filter((L) => dist[L] === 0).forEach((L) => {
    bad.push('option (' + L + ') is never the answer on any of the ' + n + ' questions');
    counts.guessable++;
  });

  if (longest >= MAX_RUN) {
    bad.push('longest same-letter run is ' + longest + ', at or over the limit of ' + MAX_RUN);
    counts.guessable++;
  }
  return { dist, longest, guessableChecked: true };
}

function auditBody(body, name) {
  if (/var\s+ANSWERS\s*=\s*\[/.test(body) && !/var\s+ANSWERS\s*=\s*\{/.test(body)) {
    return { name, skipped: true, why: 'drag-and-drop exercise, no letter key' };
  }

  const shaped = extractAnswersObject(body)
    || extractCorrIndex(body)
    || extractCheckMcq(body);

  if (!shaped) {
    return { name, skipped: true, why: 'no key found in any of the three known shapes' };
  }
  if (shaped.parseError) return { name, fail: [shaped.parseError], n: 0, counts: zero() };

  const { shape, ids, key } = shaped;
  const bad = [];
  const counts = zero();

  key.forEach((k) => {
    if (!LETTERS.includes(k)) {
      bad.push('key letter ' + k + ' is not A-D'); counts.structural++;
    }
  });

  ids.forEach((id, i) => {
    const letter = key[i];
    if (shape === 'answers-object') {
      const radio = 'q' + id;
      if (checkRadioOptions(body, radio, letter, id, bad, counts)) {
        checkDistractors(body, radio, letter, id, bad, counts);
      }
    } else if (shape === 'check-mcq') {
      checkRadioOptions(body, id, letter, id, bad, counts);
    } else {
      checkCorrOptions(shaped, id, letter, id, bad, counts, body);
    }
  });

  //  The CORR array is a second, independent statement of the same key. It is
  //  not what the page grades against (the handler argument is), so a
  //  disagreement means one of the two is stale and the page is not doing what
  //  its own source says.
  if (shape === 'corr-index') {
    const m = body.match(/var\s+CORR\s*=\s*\[([^\]]*)\]/);
    if (m) {
      const declared = m[1].split(',').map((x) => LETTERS[Number(x.trim())] || '?');
      if (declared.join('') !== key.join('')) {
        bad.push('CORR array says ' + declared.join('') + ' but the click handlers grade ' +
          key.join(''));
        counts.structural++;
      }
    }
  }

  const spread = checkGuessable(key, bad, counts);

  return { name, shape, checks: SHAPES[shape], n: key.length, key,
    dist: spread ? spread.dist : {}, longest: spread ? spread.longest : 0,
    guessableChecked: spread ? spread.guessableChecked : false,
    fail: bad, counts };
}

function zero() { return { miskey: 0, gap: 0, structural: 0, guessable: 0 }; }

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
      console.log('shape         ' + r.shape);
      console.log('checks run    ' + (r.checks || []).join(', '));
      console.log('questions     ' + r.n);
      console.log('key           ' + r.key.join(' '));
      console.log('distribution  ' + LETTERS.map((L) => L + ':' + r.dist[L]).join('  '));
      console.log('bubble score  ' + LETTERS.map(
        (L) => L + ':' + Math.round(r.dist[L] / r.n * 100) + '%').join('  '));
      console.log('longest run   ' + r.longest);
      if (!r.guessableChecked) {
        console.log('guessability  not judged, under ' + MIN_N_FOR_GUESSABLE + ' items');
      }
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

  const byShape = {};
  audited.forEach((r) => { byShape[r.shape] = (byShape[r.shape] || 0) + 1; });
  const shapes = Object.keys(byShape).sort();
  if (shapes.length) {
    console.log('by key shape: ' + shapes.map((k) => k + ':' + byShape[k]).join('  '));
  }

  if (broken.length) {
    console.log('\nranked by defect count:');
    const w = Math.max(...broken.map((r) => r.name.length));
    broken.sort((a, b) => b.fail.length - a.fail.length).forEach((r) => {
      console.log('  ' + r.name.padEnd(w) + '  ' + String(r.fail.length).padStart(3) +
        ' defects   guessable-key:' + r.counts.guessable +
        '  correct-letter-as-distractor:' + r.counts.miskey +
        '  missing-explanation:' + r.counts.gap +
        '  structural:' + r.counts.structural);
    });
    if (!verbose) console.log('\nre-run with --verbose for the per-question detail');
  }
  return broken.length;
}

// ── main ────────────────────────────────────────────────────────────────────

//  Exported so smoke/exam-key-shapes.js can pin the three shapes on fixtures.
//  The CLI is guarded on require.main so importing this file runs nothing.
module.exports = { auditBody, letterCap, MIN_N_FOR_GUESSABLE, SHAPES };

if (require.main !== module) return;

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
