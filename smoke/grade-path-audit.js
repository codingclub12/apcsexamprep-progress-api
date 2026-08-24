'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  DOES THE GRADE-PATH AUDIT ACTUALLY CATCH THE BUGS IT WAS BUILT FOR?
//
//  scripts/grade-path-audit.js reads the DEPLOYED assets, so it cannot run in
//  offline CI. What CAN run offline, and is the part worth pinning, is whether
//  its rules still detect the three defects behind the 2026-08-21 teacher
//  report. A guard that only ever passes is theatre, and this is the test that
//  stops it becoming one.
//
//  The fixtures are the real shapes, reduced. Each was verified against the
//  actual pre-fix asset served from Shopify's CDN before being written here.
//
//  Offline: no network, no key.
//  Run: npm run smoke:gradepath
// ─────────────────────────────────────────────────────────────────────────────
const { TRACKER_RULES, missingWriters, scoreIds, REQUIRED_SCORE_IDS } =
  require('../scripts/grade-path-audit.js');

let pass = 0, fail = 0;
function ok(label, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${label}`); }
  else { fail++; console.log(`  [FAIL] ${label}${detail ? '  -> ' + detail : ''}`); }
}

// ── 1. The writer contract ───────────────────────────────────────────────────
console.log('\n1. A writer called by one file and defined by none is caught');

const REPORTER_CALLS = `var save = root.APCS_saveLessonScore; if (typeof save !== 'function') return false;`;
const TRACKER_WITHOUT = `window.APCS_saveQuizScore = function(){}; window.APCS_finalizeQuiz = function(){};`;
const TRACKER_WITH    = TRACKER_WITHOUT + ` window.APCS_saveLessonScore = async function(){};`;

ok('the real bug is caught: called by the reporter, defined by no asset',
   missingWriters([REPORTER_CALLS, TRACKER_WITHOUT]).includes('APCS_saveLessonScore'));
ok('and once the writer is defined it is not reported',
   !missingWriters([REPORTER_CALLS, TRACKER_WITH]).includes('APCS_saveLessonScore'));
ok('APCS_PAGE is not a false positive: the liquid wiring sets it, not an asset',
   !missingWriters([`var p = window.APCS_PAGE;`, TRACKER_WITH]).includes('APCS_PAGE'));
ok('a networking writer would be caught the same way',
   missingWriters([`window.APNET_reportAttempt;`]).includes('APNET_reportAttempt'));
ok('an intro-java writer would be caught the same way',
   missingWriters([`root.INTROJAVA_reportGap(1);`]).includes('INTROJAVA_reportGap'));

// ── 2. The tracker rules ─────────────────────────────────────────────────────
console.log('\n2. Both tracker defects are caught');

// Pre-fix: counts every .check-btn, and guesses 0 when it finds no score UI.
const TRACKER_PRE = `
  var checkBtns = document.querySelectorAll('.check-btn');
  var total = checkBtns.length;
  var correct = document.querySelectorAll('.answered-correct').length;
  if (total) return Math.round(correct / total * 100);`;
// Post-fix: filters to elements that can carry disabled, and gates the fallback.
const TRACKER_POST = `
  function gradedButtons(){ var a=document.querySelectorAll('.check-btn'),o=[];
    for(var i=0;i<a.length;i++) if('disabled' in a[i]) o.push(a[i]); return o; }
  var graded = document.querySelectorAll('.answered-correct, .answered-wrong').length;
  if (total && graded) { return Math.round(correct / total * 100); } return null;`;

for (const r of TRACKER_RULES) {
  ok(`pre-fix tracker fails: ${r.name}`, r.test(TRACKER_PRE) === false, r.broke);
  ok(`post-fix tracker passes: ${r.name}`, r.test(TRACKER_POST) === true);
}

// ── 3. The score-element list ────────────────────────────────────────────────
console.log('\n3. A shrinking SCORE_IDS list is caught');

// Minified, double-quoted, and missing labTotal: exactly what shipped before.
const REPORTER_PRE  = `var SCORE_IDS=["score-display","r-score","score-num","finalScore","totalScore","foundCount","score-val"];`;
const REPORTER_POST = `var SCORE_IDS=["score-display","r-score","score-num","finalScore","totalScore","labTotal","foundCount","score-val"];`;
// Single quotes, as the unminified source writes it.
const REPORTER_SRC  = `  var SCORE_IDS = [\n    'score-display', 'totalScore', 'labTotal',\n  ];`;

ok('pre-fix list is missing labTotal, so the three labs were unreadable',
   !scoreIds(REPORTER_PRE).includes('labTotal'));
ok('post-fix list includes it', scoreIds(REPORTER_POST).includes('labTotal'));
ok('every required id is present post-fix',
   REQUIRED_SCORE_IDS.every((id) => scoreIds(REPORTER_POST).includes(id)),
   REQUIRED_SCORE_IDS.filter((id) => !scoreIds(REPORTER_POST).includes(id)).join(', '));
ok('double-quoted (minified) ids are read', scoreIds(REPORTER_PRE).length === 7);
ok('single-quoted (source) ids are read too, which a one-quote regex missed',
   scoreIds(REPORTER_SRC).length === 3);
ok('an unreadable list returns empty rather than pretending', scoreIds('no ids here').length === 0);

console.log('\n' + '-'.repeat(42));
console.log(`${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
