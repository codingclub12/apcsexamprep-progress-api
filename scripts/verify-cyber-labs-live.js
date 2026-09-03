// ─────────────────────────────────────────────────────────────────────────────
//  THE LIVE CHECK FOR THE TWO CYBER LAB SPECS (board 170, and the Unit 1 lab).
//
//  ── WHAT WENT WRONG, AND WHY THIS SCRIPT IS SHAPED LIKE THIS ────────────────
//  The Unit 1 lab shipped in TWO halves and only one of them landed. The Shopify
//  page was imported on 2026-09-03 and is live and correct: right title, and a
//  mount div with id "apcs-lab-1-2-auth-lab". The SPEC that fills that mount was
//  still on a branch, so /api/labs answered 404 and a student opening the page
//  got a socket with no appliance in it.
//
//  Neither half is wrong on its own. The page is a valid page, the spec is a
//  valid spec, and every check on either side of the fence passed. What was
//  broken was the BINDING between them. So the assertion that matters here is
//  not "the spec loads" or "the page renders", it is:
//
//      the mount id on the LIVE page must equal apcs-lab-<item_id> for an
//      item_id the LIVE API actually serves
//
//  going through the same transform scripts/lab-pages-csv.js used to write it.
//
//  ── WHAT IS FALSE BEFORE THIS DEPLOY, MEASURED 2026-09-03 ───────────────────
//    /api/labs/ap-cybersecurity/1.2-auth-lab        404
//    /api/labs/ap-cybersecurity/1.2-lab  unit       unit-1   (must become unit-4)
//    /api/labs/ap-cybersecurity/1.2-lab  lesson_id  1.2      (must become 4.3)
//
//  ── WHAT IS TRUE BEFORE AND MUST STAY TRUE ──────────────────────────────────
//  Not decoration. These are the NEVER_AUTO edges the move ran along:
//    1.2-lab keeps item_id 1.2-lab      changing it orphans recorded attempts
//    1.2-lab keeps its page_handle      renaming a live handle is a human act
//                                       and would 404 a page students hold
//    2.4-lab still serves               the badge log was not in scope
//  A check that only looked for the new unit would pass just as happily on a
//  deploy that had renamed the handle out from under the live page.
//
//  Run: node scripts/verify-cyber-labs-live.js
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const cp = require('child_process');
const sf = require('../lib/storefront-fetch');

const API = 'https://progress.apcsexamprep.com';

//  The API is JSON on a different origin and is not behind the storefront's bot
//  management, so it is fetched here. The STOREFRONT goes through
//  lib/storefront-fetch.js, which sends no browser User-Agent and refuses a body
//  that is not a rendered page. The first cut of this script spoofed a browser,
//  drew a 403 challenge, and reported the live page as carrying no mount.
function api(pathname) {
  const out = cp.execFileSync('curl',
    ['-sSL', '--max-time', '45', '--compressed', '-w', '\n%{http_code}', API + pathname],
    { encoding: 'utf8', maxBuffer: 1 << 26 });
  const i = out.lastIndexOf('\n');
  const code = out.slice(i + 1).trim();
  if (code !== '200') return { code, json: null };
  try { return { code, json: JSON.parse(out.slice(0, i)) }; }
  catch (e) { return { code, json: null, parse: e.message }; }
}
const spec = (course, itemId) => api('/api/labs/' + course + '/' + itemId);

//  The same transform scripts/lab-pages-csv.js uses to build the mount id. If
//  that line ever changes this has to change with it, and that is the point:
//  the two must be read together or the binding is unverified.
const mountId = (itemId) => 'apcs-lab-' + String(itemId).replace(/[^a-z0-9]+/gi, '-');

let authPage = { body: '' };
let pageError = null;
try { authPage = sf.page('/pages/ap-cyber-unit-1-lesson-2-auth-log-lab'); }
catch (e) { pageError = e.message; }

const auth = spec('ap-cybersecurity', '1.2-auth-lab');
const perm = spec('ap-cybersecurity', '1.2-lab');
const badge = spec('ap-cybersecurity', '2.4-lab');

const want = [
  // ── FALSE BEFORE THIS DEPLOY ──────────────────────────────────────────────
  ['the Unit 1 auth lab spec is served at all (404 before this deploy)',
    () => auth.code === '200' && !!auth.json],
  ['and it is the login log, with its 8 checks and 3 questions intact',
    () => auth.json && auth.json.title === 'Read the login log'
      && (auth.json.checks || []).length === 8
      && (auth.json.questions || []).length === 3
      && auth.json.points === 8],
  ['the auth lab sits in Unit 1, which is the whole reason it was written',
    () => auth.json && auth.json.unit === 'unit-1' && auth.json.lesson_id === '1.2'],
  ['the permissions lab has moved off Topic 1.2 to Unit 4',
    () => perm.json && perm.json.unit === 'unit-4'],
  ['and its lesson id reads 4.3, so the gradebook files it where it is taught',
    () => perm.json && perm.json.lesson_id === '4.3'],
  ['its page title no longer advertises Topic 1.2',
    () => perm.json && !/Topic 1\.2/.test(perm.json.page_title || '')
      && /Topic 4\.3/.test(perm.json.page_title || '')],

  // ── THE BINDING. The defect this deploy exists to close. ──────────────────
  ['THE BINDING: the live page mounts an id the live API actually serves',
    () => {
      if (pageError) return false;
      const m = /id="(apcs-lab-[a-z0-9-]+)"(?![^>]*loading)/.exec(authPage.body);
      return !!m && auth.json && m[1] === mountId(auth.json.item_id);
    }],

  // ── TRUE BEFORE, AND A DEPLOY THAT BROKE THEM WOULD BE WORSE ──────────────
  ['the permissions lab keeps item_id 1.2-lab, so recorded attempts stay attached',
    () => perm.json && perm.json.item_id === '1.2-lab'],
  ['and keeps its live handle, because renaming one is a human action',
    () => perm.json && perm.json.page_handle === 'ap-cyber-unit-1-lesson-2-terminal-lab'],
  ['the badge log at 2.4 was not in scope and still serves',
    () => badge.code === '200' && badge.json && badge.json.lesson_id === '2.4'],
  ['both cyber labs are still ungraded, so neither adds a lone denominator',
    () => auth.json && perm.json && auth.json.graded === false && perm.json.graded === false],
];

console.log('');
const problems = [];
for (const [name, test] of want) {
  let good = false;
  try { good = !!test(); } catch (e) { good = false; }
  console.log('  ' + (good ? 'ok   ' : 'FAIL ') + name);
  if (!good) problems.push(name);
}
console.log('');
if (problems.length) {
  console.error('  ' + problems.length + ' of ' + want.length + ' assertions failed');
  console.error('  api: auth ' + auth.code + '  perm ' + perm.code + '  badge ' + badge.code);
  console.error('  page: ' + (pageError ? 'REFUSED  ' + pageError
    : 'ok ' + authPage.body.length + ' bytes'));
  process.exit(1);
}
console.log('CYBER LABS LIVE: ' + want.length + ' of ' + want.length
  + ', the Unit 1 lab is bound to its page and the permissions lab is in Unit 4');
