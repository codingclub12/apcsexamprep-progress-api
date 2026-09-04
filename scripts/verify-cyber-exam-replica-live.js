'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE LIVE CHECK FOR THE 60 QUESTION REPLICA ON ap-cybersecurity-practice-exam.
//
//  ── EVERY ASSERTION HERE IS FALSE BEFORE THE IMPORT ────────────────────────
//  That is the whole test of whether a live check is worth running. The gate's
//  own first manifest once expected "status":"ok" from /api/health, which was
//  true beforehand, true during, and true if the deploy never happened.
//
//  Measured against the live body captured 2026-09-04, before any import:
//  the page serves 40 scored cards and not 60, its h1 reads "AP Cybersecurity
//  Practice Set", its section heading reads "Section 1: Multiple Choice
//  (40 Questions)", it carries three free-response prompts rather than one
//  Device Security Analysis, and its FAQ schema states 40 and 3. So each check
//  below is a claim the import made true.
//
//  ── AND ONE HALF THAT MUST NOT CHANGE ──────────────────────────────────────
//  This is an intent upgrade on a URL that ranks 1.6 with a 40.6 percent
//  click-through, so the checks come in two kinds. The ones above prove the new
//  exam landed. The ones at the end prove the SERP package and the page
//  furniture survived it: the breadcrumb, the resources grid, the closing CTA,
//  and the scoring script are all asserted present, because a MERGE republishes
//  the whole body and a generator bug would take them with it. A rewrite that
//  ships 60 questions and silently drops the breadcrumb has not succeeded.
//
//  ── NO USER-AGENT ──────────────────────────────────────────────────────────
//  Through lib/storefront-fetch.js, which refuses a body it cannot prove is a
//  rendered page. The bot management inverted on 2026-09-03: a request claiming
//  to be a browser gets 403, and the 403 body contains none of the strings a
//  check looks for, so every "this string is gone now" assertion passes on it
//  vacuously. npm run smoke:storefront fails this file if it grows a UA.
//
//  Run AFTER importing imports/2026-09-04c/cyber-practice-exam-replica-pages.csv:
//    node scripts/verify-cyber-exam-replica-live.js
// ─────────────────────────────────────────────────────────────────────────────

const sf = require('../lib/storefront-fetch.js');
const extractBody = require('./extract-live-body.js');
const gen = require('../tools/ap-cyber-ced/generate-exam-sheet.js');
const bank = require('../config/cyber-exam-items.json');

const HANDLE = gen.HANDLE;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage() {
  let last;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const r = await sf.page(`/pages/${HANDLE}`);
      return typeof r === 'string' ? r : r.body;
    } catch (e) {
      last = e;
      if (/answered 404/.test(e.message)) throw e;
      if (!/answered 429|answered 5\d\d/.test(e.message)) throw e;
      await sleep(3000 * (attempt + 1));
    }
  }
  throw last;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ONE ASSERTION SET, RUN TWICE.
//
//  check() is exported so smoke/cyber-exam-replica.js can run these exact
//  assertions offline against the body the generator produces, and this script
//  runs them online against the body Shopify serves. Writing the offline
//  version separately would let the two drift, and the drift would surface as a
//  verifier failing on a change that actually worked, which has already cost
//  this repo one false regression report.
// ─────────────────────────────────────────────────────────────────────────────
function check(body, rendered, log = console.log) {
  let pass = 0;
  const fails = [];
  const ok = (label, cond, detail) => {
    if (cond) { pass += 1; if (log) log(`  ok    ${label}`); return; }
    fails.push(`${label}${detail ? `: ${detail}` : ''}`);
    if (log) log(`  FAIL  ${label}${detail ? `: ${detail}` : ''}`);
  };
  // ── the new exam landed ───────────────────────────────────────────────────
  const cards = [...body.matchAll(/<div class="pq-card" data-correct="([A-D])" data-qid="(\d+)"/g)];
  ok('the page serves 60 scored cards, where it served 40', cards.length === 60, cards.length);
  ok('their qids run 1 to 60 with no gap',
    cards.every((m, i) => Number(m[2]) === i + 1),
    cards.map((m) => m[2]).slice(0, 5).join(','));
  ok('every card carries four options, so 240 in all',
    (body.match(/class="pq-opt"/g) || []).length === 240,
    (body.match(/class="pq-opt"/g) || []).length);

  const liveKey = cards.map((m) => m[1]).join('');
  const bankKey = bank.items
    .map((it) => (typeof it.answer === 'string' ? it.answer : 'ABCD'[it.answer])).join('');
  ok('the letter the live page will mark correct matches the item bank for all 60',
    liveKey === bankKey,
    liveKey === bankKey ? '' : `live ${liveKey.slice(0, 12)}... bank ${bankKey.slice(0, 12)}...`);

  ok('the h1 reads Practice Exam, where it read Practice Set',
    /<h1>\s*AP Cybersecurity Practice Exam\s*<\/h1>/.test(body));
  ok('the multiple choice heading states 60, where it stated 40',
    body.includes('Section I: Multiple Choice (60 Questions)'));
  ok('Section II is the CED task, Device Security Analysis',
    body.includes('<h2>Device Security Analysis</h2>')
    && body.includes('Section II is 30 percent'));
  ok('it supplies the six sources and the five parts',
    [1, 2, 3, 4, 5, 6].every((n) => body.includes(`Source ${n}:`))
    && ['A', 'B', 'C', 'D', 'E'].every((p) => body.includes(`Part ${p}`)));

  // ── nothing from the old shape survived ───────────────────────────────────
  //  Derived from the item bank, not from a pattern list. The list this
  //  replaced reported clean while the body still said "(40 Questions)".
  const stale = gen.countClaims(body);
  ok('no phrase on the live page states a count the item bank cannot justify',
    stale.length === 0, stale.map((v) => JSON.stringify(v.text)).join(', '));
  ok('the words that named the old shape are gone',
    !/Practice Set/.test(body) && !/study set rather than a replica/i.test(body));

  // ── the SERP package and the furniture survived the MERGE ─────────────────
  ok('the SEO title states the new shape',
    new RegExp(`<title>[^<]*${gen.SEO_TITLE.replace(/[|]/g, '\\|')}`).test(rendered)
    || rendered.includes(gen.SEO_TITLE),
    (rendered.match(/<title>[^<]*/) || [''])[0]);
  ok('the breadcrumb schema survived and now says Practice Exam',
    body.includes('BreadcrumbList') && body.includes('"name": "Practice Exam", "item"'));
  ok('the FAQ schema survived and states the true counts',
    body.includes('FAQPage')
    && body.includes('60 multiple choice questions and one Device Security Analysis'));
  //  A pure preservation check: true before the import and true after. It is
  //  the class the grid's cards actually carry, checked against the captured
  //  live body rather than guessed, because a preservation assertion that is
  //  false beforehand is testing the wrong string rather than the page.
  ok('the resources grid survived, so the internal links are intact',
    (body.match(/class="pq-rc-title"/g) || []).length >= 3,
    (body.match(/class="pq-rc-title"/g) || []).length);
  ok('the closing call to action survived', body.includes('<div class="pq-cta">'));
  ok('the scoring script survived and still reads data-correct off the cards',
    body.includes('data-correct') && /peAnswered/.test(body)
    && (body.match(/<script/g) || []).length >= 2);
  ok('the answered counter is out of 60', body.includes('<strong id="peAnswered">0</strong> / 60'));

  return { pass, fails };
}

async function main() {
  console.log('\nap-cybersecurity-practice-exam, the 60 question replica, live\n');
  const rendered = await fetchPage();
  //  The stored body, not the rendered document. The theme chrome carries about
  //  135 anchors before the content starts, and a check that reads the whole
  //  document can be satisfied by chrome rather than by the sheet under test.
  const r = check(extractBody.extract(rendered), rendered);

  console.log(`\n${r.pass} passed, ${r.fails.length} failed`);
  if (r.fails.length) {
    for (const f of r.fails) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log('the replica is live, and the SERP package and page furniture came through it');
}

module.exports = { check, HANDLE };

if (require.main === module) {
  main().catch((e) => { console.error(`\nverify failed: ${e.message}`); process.exit(1); });
}
