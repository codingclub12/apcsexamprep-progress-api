'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  IS THE UNIT 3 EXAM KEY STILL GUESSABLE ON THE LIVE PAGE?
//
//  Every assertion here is FALSE on the page as it serves today and TRUE once
//  imports/2026-09-08/cyber-u3-exam-key-pages.csv is imported in MERGE mode.
//  That is the design: an assertion that would have passed yesterday is
//  decoration, and the deploy gate's own first manifest asserted "status":"ok"
//  from /api/health, which was true before, during, and if the deploy never
//  happened.
//
//  So this is EXPECTED TO BE RED until the import, and its red run is the
//  pre-check. Run it again afterwards; the same command has to go green.
//
//  NO User-Agent, through lib/storefront-fetch.js. The bot management on this
//  storefront has been in three states in one week, and the challenge body
//  contains none of the strings a check looks for, so a negative assertion
//  passes on it vacuously. The module refuses a body it cannot prove is the
//  page.
//
//  Run: node scripts/verify-cyber-u3-exam-key-live.js
// ─────────────────────────────────────────────────────────────────────────────

const sf = require('../lib/storefront-fetch.js');
const extract = require('./extract-live-body.js');
const t = require('../tools/ap-cyber-ced/rebalance-exam-key.js');

let pass = 0;
const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass += 1; console.log(`  ok    ${label}`); return; }
  fails.push(`${label}${detail ? `: ${detail}` : ''}`);
  console.log(`  FAIL  ${label}${detail ? `: ${detail}` : ''}`);
}

console.log('\ncyber unit 3 exam key, live\n');

let body;
try {
  body = extract.extract(sf.page(`/pages/${t.HANDLE}`).body);
} catch (e) {
  console.error(`\n  could not read the page: ${e.message}\n`);
  process.exit(1);
}

let parsed;
try {
  parsed = t.parse(body);
} catch (e) {
  console.error(`\n  the live page no longer parses as this shape, so nothing below can be trusted:\n  ${e.message}\n`);
  process.exit(1);
}

const a = t.audit(parsed.corr);
console.log(`  key           ${a.letters}`);
console.log(`  distribution  A:${a.counts[0]} B:${a.counts[1]} C:${a.counts[2]} D:${a.counts[3]}`);
console.log(`  longest run   ${a.longestRun}`);
console.log(`  bubble score  ${a.guessScore}/${parsed.corr.length}`);
console.log(`  worst lag     ${a.lag || a.worstLag.lag} at ${Math.round(a.worstLag.rate * 100)}%\n`);

//  The four properties the defect is defined by, so the fix is judged by the
//  test that found the bug rather than by a friendlier new one.
ok('every letter is the answer at least once', a.counts.every((c) => c > 0),
  `D appears ${a.counts[3]} times`);
ok(`no letter is correct more than ${t.LIMITS.maxPerLetter} times`,
  a.counts.every((c) => c <= t.LIMITS.maxPerLetter), a.counts.join('/'));
ok(`no more than ${t.LIMITS.maxRun} same-letter answers in a row`,
  a.longestRun <= t.LIMITS.maxRun, String(a.longestRun));
ok(`bubbling one letter scores no more than ${t.LIMITS.maxGuessScore}`,
  a.guessScore <= t.LIMITS.maxGuessScore,
  `${a.guessScore}/${parsed.corr.length} (${Math.round((a.guessScore / parsed.corr.length) * 100)}%)`);
ok('the key does not repeat itself at any lag',
  a.worstLag.rate <= t.LIMITS.maxLagMatch,
  `lag ${a.worstLag.lag} at ${Math.round(a.worstLag.rate * 100)}%`);
ok('the audit finds nothing wrong with the live key', a.problems.length === 0,
  a.problems.join(' | '));

//  Structure, which the import must not disturb. These are true before AND
//  after, deliberately: they are the no-damage guard rather than the change,
//  and a fix that breaks one of them is worse than the bug it fixes.
ok('twenty questions', parsed.questions.length === 20, String(parsed.questions.length));
ok('four options each', parsed.questions.every((q) => q.opts.length === 4));
ok('data-idx matches DOM position on every option',
  parsed.questions.every((q) => q.opts.every((o, i) => o.dataIdx === i && o.idx === i)));
ok('the handlers and the CORR array agree',
  parsed.questions.every((q, i) => q.opts.every((o) => o.correct === parsed.corr[i])));

console.log(`\n${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  ${f}`);
  process.exit(1);
}
