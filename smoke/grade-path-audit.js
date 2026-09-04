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

// ── 3b. THE SHAPE THAT IS ACTUALLY DEPLOYED ──────────────────────────────────
//  Every fixture above is `SCORE_IDS = [ ... ]`, and so was every fixture this
//  file shipped with. The asset on the CDN has not been that shape for weeks:
//  it builds the list by name, `SCORE_IDS=RESULT_IDS.concat(PROGRESS_IDS)`.
//  A regex demanding `= [` matched nothing there, so the audit reported
//  "SCORE_IDS could not be read" every night, the four coverage assertions were
//  guarded on a non-empty list and stopped running, and the guard and its own
//  test agreed with each other while checking nothing. Same failure as the
//  Matrixify preflight's latin-1-only fixture.
//
//  So the fixture below is a REDUCTION OF THE LIVE ASSET, not of the source.
console.log('\n3b. The list the deployed build actually assembles is read');

const REPORTER_LIVE =
  'D_ACTIVITIES={"exercise-1":!0,"exercise-2":!0,lab:!0},' +
  'RESULT_IDS=["score-display","r-score","score-num","finalScore","score-val"],' +
  'PROGRESS_IDS=["totalScore","labTotal","foundCount","x2scn","x2score"],' +
  'SCORE_IDS=RESULT_IDS.concat(PROGRESS_IDS),SETTLE_MS=1500;function parseScore(t){}';

ok('the deployed concat form resolves to a list at all',
   scoreIds(REPORTER_LIVE).length === 10, `got ${scoreIds(REPORTER_LIVE).length}`);
ok('every required id is present in the deployed form',
   REQUIRED_SCORE_IDS.every((id) => scoreIds(REPORTER_LIVE).includes(id)),
   REQUIRED_SCORE_IDS.filter((id) => !scoreIds(REPORTER_LIVE).includes(id)).join(', '));

// The mutation that proves rule 3b is not hollow, and it is the one that
// matters: the RETIRED implementation, run against the shape that is live. If
// this ever passes, the fixture has drifted back to a literal array and 3b has
// stopped testing anything.
const RETIRED = (js) => {
  const block = /SCORE_IDS\s*=\s*\[([\s\S]*?)\]/.exec(js);
  return block ? Array.from(block[1].matchAll(/['"]([^'"]+)['"]/g)).map((x) => x[1]) : [];
};
ok('the retired `= [` regex reads NOTHING from the deployed form, which is the bug',
   RETIRED(REPORTER_LIVE).length === 0, `retired regex found ${RETIRED(REPORTER_LIVE).length}`);
ok('...while the retired regex still handled the literal form, which is why it looked fine',
   RETIRED(REPORTER_POST).length === 8);

// Resolution must not be credulous. A name the file never defines as a list of
// strings resolves to nothing, so "could not be read" stays reachable and the
// audit cannot invent coverage it does not have.
ok('a list built from names that are not string arrays resolves to empty',
   scoreIds('SCORE_IDS=SOMETHING_ELSE.concat(NOPE);').length === 0);
ok('an array holding a non-literal is skipped rather than half-read',
   scoreIds('IDS=[fn(),"labTotal"],SCORE_IDS=IDS.concat(IDS);').length === 0);

// Ordering is load-bearing: the reporter takes the FIRST element that yields a
// usable pair, so a resolver that returned a set would silently reorder trust.
ok('names resolve in the order the expression mentions them',
   scoreIds(REPORTER_LIVE)[0] === 'score-display' && scoreIds(REPORTER_LIVE)[5] === 'totalScore');

console.log('\n' + '-'.repeat(42));
console.log(`${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
