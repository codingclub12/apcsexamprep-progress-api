'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: a live check may not believe a body it did not prove it fetched.
//
//  ── THE INCIDENT THIS PINS, 2026-09-03 ─────────────────────────────────────
//  The storefront's bot management inverted. It used to challenge scripted
//  clients, so every verifier here sent a browser User-Agent. It now refuses
//  the SPOOF and allows the honest client:
//
//      -H "User-Agent: Mozilla/5.0 (...) Chrome/120"   403
//      no User-Agent override (curl/8.5.0)             200
//
//  measured on three pages over two rounds. Every verifier was carrying a
//  workaround that had become the bug.
//
//  ── WHY IT WAS WORSE THAN AN OUTAGE, AND WHAT SECTION 1 PROVES ─────────────
//  The 403 body is a small "Verifying your connection" page. It contains none
//  of the strings a verifier looks for, so:
//
//      "this string is now GONE"     passes,  vacuously
//      "this string is now PRESENT"  fails
//
//  which reads as a partial regression rather than a broken instrument. What it
//  actually reported, before the fix, on work that was live and correct:
//
//      verify-cc-pacing-live.js       4 of 8 failed      truth: 8 of 8 pass
//      verify-csp-applied-cards-live  17 pages serving   truth: 17 of 17 serve
//                                     0 of 6 questions,  their six questions
//                                     17 cards missing
//      verify-code-repair-live.js     could not read     truth: 25 of 25 agree
//                                     any of 25 articles
//
//  An agent trusting the second one re-ships seventeen pages that were fine.
//
//  Section 1 asserts the vacuity directly against the saved challenge fixture,
//  so the reason for the guard is a fact in the suite rather than a story in a
//  comment.
//
//  Zero PII: public page markup only. No em-dashes, per repo convention.
//  Run: npm run smoke:storefront
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');

let pass = 0, fail = 0;
function ok(cond, label, detail) {
  if (cond) { pass++; console.log('  [PASS] ' + label); }
  else { fail++; console.log('  [FAIL] ' + label + (detail ? '\n         ' + detail : '')); }
}

const FIX = path.join(__dirname, 'fixtures');
const challenge = fs.readFileSync(path.join(FIX, 'storefront-403-challenge.html'), 'utf8');
const realHead = fs.readFileSync(path.join(FIX, 'storefront-real-page-head.html'), 'utf8');

// ── 1. why the guard exists: the challenge body makes absence assertions pass ─
console.log('\n1. the bot challenge is the shape that makes a live check lie');
ok(/Verifying your connection/.test(challenge),
  '1.1 the saved fixture is the real 403 challenge body, not a stand-in');
//  Every one of these is a real assertion from a real verifier in this repo,
//  each of the form "this is gone now". All four pass on the challenge page.
const VACUOUS = ['Days set aside in this unit', 'Lab / project', 'Review & unit test',
  'class="mcq-item"'];
ok(VACUOUS.every((s) => !challenge.includes(s)),
  '1.2 four real "this string is gone now" assertions all pass on the challenge body, '
  + 'which is exactly how a blind fetch reads as a clean result');
ok(!challenge.includes('Extra practice') && !challenge.includes('apcs-lab-'),
  '1.3 and the matching "this string is present now" assertions all fail on it, '
  + 'so the pair reads as a partial regression rather than a broken instrument');

// ── 2. the guard refuses it ───────────────────────────────────────────────────
console.log('\n2. lib/storefront-fetch.js refuses a body that is not a rendered page');
ok(sf.looksReal(challenge) === false, '2.1 the challenge body is not a real page');
ok(sf.looksReal(realHead) === true, '2.2 a real storefront page is');
const why = sf.refusal({ code: '200', body: challenge });
ok(typeof why === 'string' && /Verifying your connection/.test(why),
  '2.3 the refusal names the challenge, so the operator is not left guessing', String(why));
ok(/User-Agent/i.test(why || ''),
  '2.4 and names the CAUSE, because the fix is to stop sending a browser UA', String(why));

// ── 3. both markers are load bearing ─────────────────────────────────────────
//  A guard resting on one string is a guard that half-disables itself the day a
//  theme upgrade drops that string, and says nothing.
console.log('\n3. every marker is required, so none can be retired silently');
ok(sf.MARKERS.length >= 2, '3.1 there is more than one marker');
for (const m of sf.MARKERS) {
  const without = realHead.split(m).join('');
  ok(sf.looksReal(without) === false,
    '3.2 a real page with ' + m + ' removed is refused, so that marker is load bearing');
}

// ── 4. status is checked independently of shape ──────────────────────────────
//  A Shopify 404 is rendered by the theme, so it carries every marker. Shape
//  alone can never be enough.
console.log('\n4. a themed error page carries the markers, so the status is checked too');
const themed404 = sf.refusal({ code: '404', body: realHead });
ok(typeof themed404 === 'string' && /404/.test(themed404),
  '4.1 a 200-shaped body served with 404 is still refused', String(themed404));
ok(sf.refusal({ code: '200', body: realHead }) === null,
  '4.2 and a real 200 page is accepted');

// ── 5. the regression guard: no live verifier may spoof a browser again ──────
console.log('\n5. no live verifier sends a User-Agent to the storefront');
const dir = path.join(__dirname, '..', 'scripts');
const verifiers = fs.readdirSync(dir).filter((f) => /^verify-.*-live\.js$/.test(f));
ok(verifiers.length >= 3,
  '5.1 the scan actually found the live verifiers (' + verifiers.length + ')',
  'a scan over an empty set passes and proves nothing');
for (const f of verifiers) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  //  Comments explain the incident and are allowed to name the header. Code is not.
  const code = src.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  ok(!/User-Agent/i.test(code) && !/Mozilla\/5\.0/.test(code),
    '5.2 ' + f + ' sends no User-Agent of its own');
  ok(/storefront-fetch/.test(src) || !/apcsexamprep\.com\/(pages|blogs)/.test(code),
    '5.3 ' + f + ' reaches the storefront through lib/storefront-fetch.js');
}
const libSrc = fs.readFileSync(path.join(__dirname, '..', 'lib', 'storefront-fetch.js'), 'utf8')
  .replace(/^\s*\/\/.*$/gm, '');
ok(!/Mozilla\/5\.0/.test(libSrc),
  '5.4 and the shared fetch itself sends none, which is the whole point');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
