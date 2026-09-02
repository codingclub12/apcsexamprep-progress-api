'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: verify-exam-key.js understands every key shape it claims to.
//
//  The checker used to read one shape, `var ANSWERS = {"e1":"D"}`, and reported
//  the other two as "no letter key". That is not a loud failure. A skipped page
//  does not count as broken and does not move the exit code, so the audit ran,
//  passed, and said nothing while the Cyber Unit 3 exam shipped a key that was
//  16 B out of 20 with no D anywhere. Bubbling B scored 80 percent.
//
//  So the property worth pinning is not "the checker works". It is:
//
//    a page whose key the checker cannot read must never look like a page it
//    read and cleared.
//
//  Nothing else in CI touches this script, which is how it drifted. Fixtures
//  here are built to the real markup of the three shapes, small enough to read
//  and large enough to clear the guessability gate.
//
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:examkeyshapes
// ─────────────────────────────────────────────────────────────────────────────
const { auditBody, letterCap, MIN_N_FOR_GUESSABLE } =
  require('../scripts/one-off/verify-exam-key.js');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const LETTERS = ['A', 'B', 'C', 'D'];
const has = (r, sub) => (r.fail || []).some((f) => f.includes(sub));
//  A skipped page has no counts at all. Reading through it would throw, and a
//  stack trace is a worse regression signal than a FAIL line naming the check,
//  so a missing count reads as -1: never equal to 0, never greater than 0, so
//  both "is clean" and "is flagged" fail on a page that was never audited.
const guessable = (r) => (r && r.counts ? r.counts.guessable : -1);
const miskeys = (r) => (r && r.counts ? r.counts.miskey : -1);

// ── fixture builders, one per shape ─────────────────────────────────────────
//  Each takes a key like 'ABCD...' and emits a body in that shape's real
//  markup. Built rather than pasted so a 16-item balanced key and a 16-item
//  all-B key differ in exactly one input.

//  Shape 1. Radios with a <span> label, plus one distractor explanation per
//  wrong option, which is the only shape that carries them.
function answersObject(key, opts) {
  const o = opts || {};
  const map = {};
  key.split('').forEach((L, i) => { map['e' + (i + 1)] = L; });
  let html = '<script>var ANSWERS = ' + JSON.stringify(map) + ';</script>';
  key.split('').forEach((L, i) => {
    const q = 'qe' + (i + 1);
    LETTERS.forEach((opt) => {
      html += '<input name="' + q + '" value="' + opt + '"> <span>(' + opt + ') option text</span>';
    });
    //  Explanations for the wrong options. o.explainCorrect reproduces the Q8
    //  defect: a distractor explanation sitting on the correct answer.
    const listed = o.explainCorrect ? LETTERS : LETTERS.filter((x) => x !== L);
    html += '<div class="fb-distractors">' +
      listed.map((x) => '<strong>(' + x + ')</strong> why it is wrong').join(' ') +
      '</div>';
  });
  return html;
}

//  Shape 2. Clickable <li>, no <input> anywhere, correct index repeated as the
//  fourth handler argument on all four options.
function corrIndex(key, opts) {
  const o = opts || {};
  const idxs = key.split('').map((L) => LETTERS.indexOf(L));
  let html = '';
  idxs.forEach((corr, i) => {
    const n = i + 1;
    html += '<div class="cfu-item" id="u3exam-q' + n + '">' +
      '<p class="cfu-q"><span class="qnum">' + n + '.</span> stem</p><ul class="cfu-opts">';
    [0, 1, 2, 3].forEach((idx) => {
      //  o.skewIdx reproduces a handler/data-idx disagreement, where the option
      //  the reader sees third is not the one the handler grades as third.
      const dataIdx = (o.skewIdx && i === 0 && idx === 2) ? 3 : idx;
      html += '<li onclick="qzu3exam(this,' + n + ',' + idx + ',' + corr + ')" ' +
        'data-idx="' + dataIdx + '">option text</li>';
    });
    html += '</ul><div class="cfu-feedback" id="fbu3examq' + n + '"></div></div>';
  });
  const declared = o.corrArray ? o.corrArray : idxs;
  html += '<script>var CORR=[' + declared.join(', ') + '];</script>';
  return html;
}

//  Shape 3. Radios with no <span>, key in the check button's second argument.
function checkMcq(key) {
  let html = '';
  key.split('').forEach((L, i) => {
    const q = 'q' + (i + 1);
    html += '<ul class="l-options">';
    LETTERS.forEach((opt) => {
      html += '<li><label><input type="radio" name="' + q + '" value="' + opt +
        '"> (' + opt + ') option text</label></li>';
    });
    html += '</ul><button class="l-check-btn" onclick="checkMCQ(\'' + q + '\',\'' + L +
      '\',\'explanation\')">Check Answer</button>';
  });
  return html;
}

//  16 items, four of each letter, no run longer than two. Long enough to clear
//  MIN_N_FOR_GUESSABLE and even enough that a clean shape must report zero.
const BALANCED = 'ABCDBADCCDABDCBA';
const ALL_B = 'BBBBBBBBBBBBBBBB';

console.log('\nexam key shapes\n');

// ── 1. every shape is recognised and its key read correctly ─────────────────

[['answers-object', answersObject], ['corr-index', corrIndex], ['check-mcq', checkMcq]]
  .forEach(([shape, build]) => {
    const r = auditBody(build(BALANCED), shape + '-fixture');
    ok(shape + ': recognised, not skipped', !r.skipped, r.why);
    ok(shape + ': reports its own shape', r.shape === shape, r.shape);
    ok(shape + ': reads all 16 answers', r.n === 16, r.n);
    ok(shape + ': key matches what was authored', (r.key || []).join('') === BALANCED,
      (r.key || []).join(''));
    ok(shape + ': a clean balanced key reports no defect', (r.fail || []).length === 0, r.fail);
    ok(shape + ': declares which checks ran', Array.isArray(r.checks) && r.checks.length > 0);
  });

// ── 2. the guessable key is caught in every shape ───────────────────────────
//  This is the regression that matters. Before the fix, two of these three
//  returned "skipped" and the summary counted them as clean.

[['answers-object', answersObject], ['corr-index', corrIndex], ['check-mcq', checkMcq]]
  .forEach(([shape, build]) => {
    const r = auditBody(build(ALL_B), shape + '-allB');
    ok(shape + ': all-B key is not skipped', !r.skipped, r.why);
    ok(shape + ': all-B key is flagged guessable', guessable(r) > 0, r.counts);
    ok(shape + ': names the bubbling score', has(r, 'bubbling B scores 100%'), r.fail);
    ok(shape + ': reports the three unused letters',
      ['A', 'C', 'D'].every((L) => has(r, 'option (' + L + ') is never the answer')), r.fail);
    ok(shape + ': reports the long run', has(r, 'longest same-letter run'), r.fail);
  });

// ── 3. the guessability bound is the bundle generator's ─────────────────────
//  Its printed keys cap a letter at 9 over 26 items, 8 over 24 and 7 over 22.

ok('cap matches the bundle at 26 items', letterCap(26) === 9, letterCap(26));
ok('cap matches the bundle at 24 items', letterCap(24) === 8, letterCap(24));
ok('cap matches the bundle at 22 items', letterCap(22) === 7, letterCap(22));
ok('cap on a 20-item exam is 7', letterCap(20) === 7, letterCap(20));

//  Real Unit 1 and Unit 2 keys, which are authored and must not trip the check.
const REAL_CLEAN = { 'unit-1': 'BDBADABBDCBDCCADBCCA', 'unit-2': 'ABDCACADBABCBBACCBAB' };
Object.keys(REAL_CLEAN).forEach((name) => {
  const r = auditBody(checkMcq(REAL_CLEAN[name]), name);
  ok(name + ' live key is not called guessable', guessable(r) === 0, r.fail || r.why);
});

//  The real Unit 3 key, which must be.
const r3 = auditBody(corrIndex('BBBCCBBBBBCBBBABBBBB'), 'unit-3');
ok('unit-3 live key is called guessable', guessable(r3) > 0, r3.fail || r3.why);
ok('unit-3 bubbling score is reported as 80%', has(r3, 'bubbling B scores 80%'), r3.fail);

// ── 4. short instruments are not judged on guessability ─────────────────────
//  A 5-item quiz cannot use all four letters, so firing there would be noise.

const short = auditBody(checkMcq('BBBBB'), 'five-item-quiz');
ok('short quiz is still audited', !short.skipped, short.why);
ok('short quiz key is still read', short.n === 5, short.n);
ok('short quiz is not judged guessable', guessable(short) === 0, short.fail || short.why);
ok('short quiz records that it was not judged', short.guessableChecked === false);
const atGate = auditBody(checkMcq(ALL_B.slice(0, MIN_N_FOR_GUESSABLE)), 'at-the-gate');
ok('an instrument exactly at the gate IS judged', atGate.guessableChecked === true);
ok('and is flagged when skewed', guessable(atGate) > 0, atGate.fail || atGate.why);

// ── 5. shape-specific structural checks still bite ──────────────────────────

const q8 = auditBody(answersObject(BALANCED, { explainCorrect: true }), 'q8-miskey');
ok('answers-object still catches a distractor on the correct answer',
  miskeys(q8) === 16, q8.counts || q8.why);

const skew = auditBody(corrIndex(BALANCED, { skewIdx: true }), 'idx-skew');
ok('corr-index catches handler index disagreeing with data-idx',
  has(skew, 'data-idx'), skew.fail);

//  A stale CORR array is a real hazard: it is a second statement of the key
//  that the page does NOT grade against, so a disagreement means one is wrong.
const stale = auditBody(
  corrIndex(BALANCED, { corrArray: BALANCED.split('').map(() => 1) }), 'stale-corr');
ok('corr-index catches a CORR array that disagrees with the handlers',
  has(stale, 'CORR array says'), stale.fail);

// ── 6. what must still be skipped, and skipped visibly ──────────────────────

const dnd = auditBody('<script>var ANSWERS = [0,1,2];</script>', 'drag-and-drop');
ok('drag-and-drop is still skipped', dnd.skipped === true);
ok('and says why', /no letter key/.test(dnd.why || ''), dnd.why);

const unknown = auditBody(
  '<script>var DATA={"1":{"a":2}};window.checkQ=function(){};</script>', 'unknown-shape');
ok('an unhandled shape is skipped, not silently cleared', unknown.skipped === true);
ok('and does not claim to have been audited', unknown.counts === undefined);
ok('and its reason names the three known shapes',
  /three known shapes/.test(unknown.why || ''), unknown.why);

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
