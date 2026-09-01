'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the answer-key rebalance never changes which answer is right.
//
//  This tool rewrites LIVE course pages. The one mistake that would be worse
//  than the bias it fixes is marking a wrong answer correct, so the property is
//  pinned here on a fixture whose right answer is known by construction.
//
//  The bias being fixed was real: one CSP quiz had all six answers B, and the
//  course sat at 37.8 percent B against 14.6 percent D.
//
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:answerkeys
// ─────────────────────────────────────────────────────────────────────────────
const {
  keysFor, distributionRows, rewriteBody, verify, audit,
  longestCycle, cycleFinding,
} = require('../scripts/answer-key-audit');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

// A question in the exact shape the CSP pages use. The correct answer is C,
// "thirteen", and it must still be the correct answer after any rewrite.
const q = (qid, correct, texts) => {
  const opts = ['A', 'B', 'C', 'D'].map((l, i) =>
    `<button class="mcq-option" onclick="checkMCQ('${qid}','${l}','${correct}','${qid}-fb-${l}')">`
    + `<span class="mcq-option-letter">${l}</span> ${texts[i]}</button>`).join('\n');
  const fbs = ['A', 'B', 'C', 'D'].map((l) =>
    `<div id="${qid}-fb-${l}" class="mcq-feedback ${l === correct ? 'correct-fb' : 'incorrect-fb'}">why ${texts['ABCD'.indexOf(l)]}</div>`).join('\n');
  return `<div class="mcq-item" data-activity="quiz" data-item="${qid}">`
    + `<div class="mcq-options" id="${qid}-options">\n${opts}\n</div>\n${fbs}</div>`;
};

const BODY = q('q1', 'B', ['eleven', 'twelve', 'thirteen', 'fourteen'])
           + q('q2', 'B', ['red', 'green', 'blue', 'grey'])
           + q('q3', 'B', ['one', 'two', 'three', 'four']);

console.log('\nANSWER KEY REBALANCE\n');

console.log('1. The audit sees the key');
const keys = keysFor(BODY);
ok('  reads three quiz answers', keys.quiz && keys.quiz.length === 3, keys);
ok('  and they are all B, which is the defect', keys.quiz.join('') === 'BBB', keys.quiz);
const rows = distributionRows([{ node: { handle: 'fixture', body: BODY } }]);
ok('  the activity is flagged as every-answer-the-same', rows[0].allSame, rows[0]);

console.log('2. The rewrite moves the answer, and only the answer\'s position');
const r = rewriteBody('fixture', BODY, ['D', 'A', 'C']);
ok('  all three questions were rewritten', r.moved === 3 && r.questions === 3, r);
ok('  no structural problems', r.problems.length === 0, r.problems);
const after = keysFor(r.body);
ok('  the new key is D, A, C as asked', after.quiz.join('') === 'DAC', after.quiz);
ok('  and it is no longer all one letter', !distributionRows([{ node: { handle: 'f', body: r.body } }])[0].allSame);

console.log('3. The property that matters: the right answer is still the right answer');
ok('  verify() passes', verify('fixture', BODY, r.body).length === 0, verify('fixture', BODY, r.body));
ok('  "twelve" was correct before and is correct after',
  /checkMCQ\('q1','D','D'[^>]*><span class="mcq-option-letter">D<\/span> twelve</.test(r.body),
  (r.body.match(/<button[^>]*q1[^>]*>[^<]*<span[^>]*>D<\/span>[^<]*/) || [''])[0]);
ok('  its feedback travelled with it and is still correct-fb',
  /<div id="q1-fb-D" class="mcq-feedback correct-fb">why twelve<\/div>/.test(r.body));
// Anchored on the class attribute: "incorrect-fb" CONTAINS "correct-fb", so a
// bare /correct-fb/ match counts all twelve feedback blocks and passes for the
// wrong reason.
ok('  exactly one correct-fb per question, and eleven incorrect',
  (r.body.match(/class="mcq-feedback correct-fb"/g) || []).length === 3
  && (r.body.match(/class="mcq-feedback incorrect-fb"/g) || []).length === 9,
  { correct: (r.body.match(/class="mcq-feedback correct-fb"/g) || []).length,
    incorrect: (r.body.match(/class="mcq-feedback incorrect-fb"/g) || []).length });
ok('  every option text survives, none invented or dropped',
  ['eleven', 'twelve', 'thirteen', 'fourteen'].every((t) => (r.body.match(new RegExp('> ' + t + '<', 'g')) || []).length === 1));

console.log('4. verify() actually catches a bad rewrite');
//  A rewrite that relabels the correct letter WITHOUT moving the text is the
//  exact mistake this guards against. It must be caught.
const sabotaged = BODY.replace(/checkMCQ\('q1','([A-D])','B'/g, "checkMCQ('q1','$1','C'");
ok('  relabelling the correct letter in place is rejected',
  verify('fixture', BODY, sabotaged).length > 0, verify('fixture', BODY, sabotaged));

// ── 5. THE THIRD SHAPE: opt-btn, every AP Cyber unit 5 quiz ─────────────────
//  The audit was blind to this shape until 2026-09-01, which is why the unit 5
//  defect was found by a human reading pages rather than by this tool. The
//  blindness matters more than the one defect: opt-btn is the whole of unit 5.
console.log('5. The opt-btn shape the AP Cyber quizzes use');

// Exactly the markup the live pages carry, including the trailing dot in the
// letter span and the question index as the second onclick argument.
const optBtn = (handler, qNum, correctLetter, letters) => letters.map((l) =>
  `<button type="button" class="opt-btn" data-correct="${l === correctLetter ? 1 : 0}"`
  + ` data-fb="feedback for ${l}" onclick="${handler}Answer(this,${qNum})">`
  + `<span class="opt-letter">${l}.</span>opt ${l} text</button>`).join('\n');

const LETTERS = ['A', 'B', 'C', 'D'];
const cyberBody = [
  optBtn('u5l2quiz', 1, 'A', LETTERS),
  optBtn('u5l2quiz', 2, 'B', LETTERS),
  optBtn('u5l2quiz', 3, 'C', LETTERS),
].join('\n');
const cyber = keysFor(cyberBody);
ok('  reads the key off data-correct, not out of the handler call',
  cyber.u5l2quiz && cyber.u5l2quiz.join('') === 'ABC', cyber);
ok('  names the activity after the handler, so two quizzes on one page stay apart',
  Object.keys(cyber).length === 1 && Object.keys(cyber)[0] === 'u5l2quiz', Object.keys(cyber));

const twoQuizzes = keysFor(cyberBody + '\n' + [
  optBtn('u5l3quiz', 1, 'D', LETTERS),
  optBtn('u5l3quiz', 2, 'D', LETTERS),
].join('\n'));
ok('  a second quiz on the same page is its own activity',
  twoQuizzes.u5l2quiz.join('') === 'ABC' && twoQuizzes.u5l3quiz.join('') === 'DD', twoQuizzes);

// Zero or several flagged options is a DIFFERENT defect. Folding it into a
// distribution would corrupt the number this tool exists to report, so those
// questions are dropped rather than guessed at.
const noneFlagged = keysFor([
  optBtn('u5l9quiz', 1, 'A', LETTERS),
  optBtn('u5l9quiz', 2, 'ZZ', LETTERS),
].join('\n'));
ok('  a question with no correct option is excluded, not guessed',
  noneFlagged.u5l9quiz.join('') === 'A', noneFlagged);

const twoFlagged = keysFor([
  optBtn('u5l8quiz', 1, 'A', LETTERS),
  optBtn('u5l8quiz', 2, 'B', LETTERS).replace('data-correct="0" data-fb="feedback for C"', 'data-correct="1" data-fb="feedback for C"'),
].join('\n'));
ok('  a question with two correct options is excluded too',
  twoFlagged.u5l8quiz.join('') === 'A', twoFlagged);

// The two older shapes must be untouched by the addition.
ok('  the checkMCQ shape still parses alongside it',
  keysFor(BODY + '\n' + cyberBody).quiz.join('') === 'BBB');
ok('  and the opt-btn key is found on the same body',
  keysFor(BODY + '\n' + cyberBody).u5l2quiz.join('') === 'ABC');

// Found by mutation-testing this suite: removing the clobber guard in keysFor
// changed nothing, which meant the guard was untested and could have been wrong
// in either direction without anybody noticing. A handler literally named
// `examAnswer(this,N)` yields the activity name `exam`, which is the same key
// the KEY={...} exam shape writes. The older shape is the authoritative one, so
// opt-btn must not overwrite it.
const clash = keysFor(
  '<script>var KEY={"e1":"D","e2":"D"};</script>\n'
  + optBtn('exam', 1, 'A', LETTERS) + '\n' + optBtn('exam', 2, 'A', LETTERS)
);
ok('  opt-btn does not clobber a key an older shape already produced',
  clash.exam.join('') === 'DD', clash);

// The real defect, on the real shape: the distribution report must flag it.
const collision = distributionRows([
  { node: { handle: 'u5l2', body: [optBtn('u5l2quiz', 1, 'B', LETTERS), optBtn('u5l2quiz', 2, 'B', LETTERS), optBtn('u5l2quiz', 3, 'B', LETTERS)].join('\n') } },
]);
ok('  an all-B opt-btn quiz is reported as every-answer-the-same',
  collision.length === 1 && collision[0].allSame && collision[0].n === 3, collision);

// ── The two patterns a distribution cannot see ──────────────────────────────
//  Measured on AP Cyber unit 5 on 2026-09-01. It passed BOTH existing checks:
//    5.1 ABDCB  5.2 ABCDB  5.3 ABCDB  5.4 ABCDB  5.5 BCADB  5.6 BCDAB
//  Every quiz is 40 percent B, so nothing reaches the 60 percent bar and no key
//  is all one letter. Yet three quizzes are byte identical and question 5 is B
//  on all six. That is a free point on six assessments for any student who
//  notices, arriving through a shape the thresholds were not watching.
const U5 = { '5.1': 'ABDCB', '5.2': 'ABCDB', '5.3': 'ABCDB', '5.4': 'ABCDB', '5.5': 'BCADB', '5.6': 'BCDAB' };
const u5Edges = Object.entries(U5).map(([id, key]) => ({
  node: {
    handle: 'u5-' + id, title: id,
    body: key.split('').map((correct, i) =>
      optBtn('u5l' + id.slice(2) + 'quiz', i + 1, correct, LETTERS)).join('\n'),
  },
}));

// Silence the report while asserting on its return value.
const realLog = console.log;
console.log = () => {};
const res = audit(u5Edges);
console.log = realLog;

ok('  the real unit 5 keys still pass the OLD checks, which is the problem',
  res.same.length === 0 && res.skew.length === 0, { same: res.same.length, skew: res.skew.length });
ok('  identical keys shared by three quizzes are flagged',
  res.dupes.length === 1 && res.dupes[0][0] === 'ABCDB' && res.dupes[0][1].length === 3,
  res.dupes.map(([k, g]) => [k, g.length]));
ok('  a question locked to one letter on every quiz is flagged',
  res.locked.length === 1 && res.locked[0].q === 5 && res.locked[0].letter === 'B'
  && res.locked[0].n === 6, res.locked);

// Neither check may cry wolf. Six genuinely varied keys, no repeat and no
// position that agrees, must come back clean: a check that fires on healthy
// content is one people learn to skip.
const VARIED = ['ABCDA', 'BCDAB', 'CDABC', 'DABCD', 'ACBDC', 'BDCAD'];
const okEdges = VARIED.map((key, n) => ({
  node: {
    handle: 'ok-' + n, title: String(n),
    body: key.split('').map((c, i) => optBtn('q' + n + 'quiz', i + 1, c, LETTERS)).join('\n'),
  },
}));
console.log = () => {};
const clean = audit(okEdges);
console.log = realLog;
ok('  varied keys raise neither flag',
  clean.dupes.length === 0 && clean.locked.length === 0,
  { dupes: clean.dupes.length, locked: clean.locked.length });

// The POSITION_MIN threshold itself. Found by mutation-testing this suite:
// dropping the minimum to 1 changed nothing above, because the varied fixture
// has six activities and no position that agrees. So the threshold was
// untested and could have been any number.
//
// Three activities all starting A is 1 in 16 by chance. On a course with three
// quizzes that is a coincidence, not a defect, and flagging it teaches people
// to skip the check. Four is 1 in 64, which is where it starts being worth
// saying out loud.
const SMALL = ['ABCD', 'ACDB', 'ADBC'];
const smallEdges = SMALL.map((key, n) => ({
  node: {
    handle: 'small-' + n, title: String(n),
    body: key.split('').map((c, i) => optBtn('s' + n + 'quiz', i + 1, c, LETTERS)).join('\n'),
  },
}));
console.log = () => {};
const small = audit(smallEdges);
console.log = realLog;
ok('  three activities agreeing on a position is coincidence, not a finding',
  small.locked.length === 0, small.locked);


// ── A REPEATING BLOCK INSIDE ONE KEY ────────────────────────────────────────
//  The duplicate-key and position-lock checks above compare activities to each
//  OTHER. A single quiz whose own key cycles slips past both, and past the
//  histogram. Both keys below are real, from the AP Cyber teacher bundle, and
//  both passed every check that existed on 2026-09-01.
const K = (s) => s.split('');
console.log('\nREPEATING BLOCK\n');

const bundle22 = 'CADBCADBCADBCADBCABDBCDADACD';
const bundle21 = 'ACBDABCDBCDABCDA';

const f22 = cycleFinding(K(bundle22));
ok('  the 2.2 bundle key is flagged as a repeating CADB block',
  f22 && f22.block === 'CADB' && f22.len === 18, f22);

const d22 = {};
K(bundle22).forEach((l) => { d22[l] = (d22[l] || 0) + 1; });
ok('  ...while its distribution passes the 60 percent bar untouched',
  Math.max(...Object.values(d22)) / bundle22.length < 0.6, d22);

// REGRESSION, and the reason longestCycle takes a maxPeriod. Searching every
// period and then rejecting the winner for being too long reports NOTHING here:
// a meaningless period-7 run of 12 sits on top of the real period-4 BCDA BCDA.
const f21 = cycleFinding(K(bundle21));
ok('  the 2.1 bundle key is flagged as BCDA twice, not masked by a longer noisy run',
  f21 && f21.block === 'BCDA' && f21.len === 8, f21);
ok('  ...and the unbounded search is exactly what used to hide it',
  longestCycle(K(bundle21)).period === 7 && longestCycle(K(bundle21), 4).period === 4);

ok('  the replacement 2.1 key is clean', cycleFinding(K('DADBACBCABCBDACD')) === null);
ok('  the replacement 2.2 key is clean', cycleFinding(K('BADDACDADCACBDBCABCBACADBDCB')) === null);
ok('  a run of eight identical answers is caught even when the rest varies',
  (cycleFinding(K('AAAAAAAABCDB')) || {}).len === 8);
ok('  a five-item key is never flagged, since it cannot cycle meaningfully',
  cycleFinding(K('ABCDB')) === null);
ok('  a key with no repeating block is left alone',
  cycleFinding(K('DCBAACADBBDCACBD')) === null);

// End to end through audit(), on the shape the live pages use.
const cyc = 'CADBCADBCADBCADB';
const cycEdges = [{ node: { handle: 'bundle-2-2', title: 'x',
  body: cyc.split('').map((c, i) => optBtn('b22quiz', i + 1, c, LETTERS)).join('\n') } }];
const silence = console.log; console.log = () => {};
const cycRes = audit(cycEdges);
console.log = silence;
ok('  audit() reports the cycle while its other three checks stay silent',
  cycRes.cycles.length === 1 && cycRes.cycles[0].c.block === 'CADB'
  && cycRes.same.length === 0 && cycRes.skew.length === 0 && cycRes.dupes.length === 0,
  { cycles: cycRes.cycles.length, same: cycRes.same.length, skew: cycRes.skew.length, dupes: cycRes.dupes.length });

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
