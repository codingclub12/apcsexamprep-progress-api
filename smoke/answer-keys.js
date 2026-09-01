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
const { keysFor, distributionRows, rewriteBody, verify, audit,
  readOptBtnQuestions, rewriteBodyOptBtn, verifyOptBtn } = require('../scripts/answer-key-audit');

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


// ── REBALANCING THE opt-btn SHAPE ───────────────────────────────────────────
//  Built to fix AP Cyber unit 5, whose six live quizzes shared three identical
//  keys and had B on question 5 every time. The rule is the same as the older
//  shape's: the correct answer never changes, only which letter it sits on.
//
//  This shape makes that easier, because data-correct, data-fb and the option
//  text all live on the same button, so an option and its feedback move
//  together by construction. The one thing that must change is the letter in
//  the opt-letter span.
console.log('\nopt-btn rebalance');
{
  // Indentation between buttons on purpose: the first version of this rewrite
  // rejoined them with a bare newline and silently dropped 90 bytes a page.
  const gap = '\n      ';
  const build = (handler, correctByQ) => correctByQ.map((c, qi) =>
    optBtn(handler, qi + 1, c, LETTERS).split('\n').join(gap)).join(gap);

  const body = build('u5l1quiz', ['A', 'B', 'C']);
  const want = ['C', 'D', 'A'];
  const r = rewriteBodyOptBtn('t', body, want);

  const keyOf = (b) => readOptBtnQuestions(b)
    .map((g) => (g.opts.find((o) => o.correct) || {}).letter).join('');
  ok('  the correct answer lands on the target letter', keyOf(r.body) === 'CDA', keyOf(r.body));
  ok('  and every question reports as moved', r.questions === 3 && r.moved === 3, r);
  ok('  the rewrite passes its own verifier',
    verifyOptBtn('t', body, r.body).length === 0, verifyOptBtn('t', body, r.body));

  // The guarantee that matters: an option's feedback travels with the option,
  // so the correct answer never ends up wearing a wrong answer's explanation.
  const before = readOptBtnQuestions(body), after = readOptBtnQuestions(r.body);
  const pair = (g) => { const c = g.opts.find((o) => o.correct); return c.text + '|' + c.fb; };
  ok('  the correct option keeps its own text and its own feedback',
    before.every((g, i) => pair(g) === pair(after[i])),
    before.map((g, i) => [pair(g), pair(after[i])]));

  // Byte preservation. A rebalance that edits bytes nobody asked it to edit is
  // one no reviewer can check by diffing.
  ok('  the body length is unchanged, because only letters moved',
    r.body.length === body.length, { before: body.length, after: r.body.length });
  const strip = (b) => b.replace(/<button[^>]*class="[^"]*\bopt-btn\b[^"]*"[^>]*>[\s\S]*?<\/button>/g, ' BTN ');
  ok('  and everything outside the option buttons is byte identical',
    strip(body) === strip(r.body));

  // A question already sitting on its target is left alone, so an unchanged
  // page stays out of the sheet entirely.
  const same = rewriteBodyOptBtn('t', body, ['A', 'B', 'C']);
  ok('  a question already on target is not rewritten',
    same.moved === 0 && same.body === body, same.moved);

  // Refusals. Zero or several correct options is a different defect, and
  // permuting it would bake the ambiguity in rather than surface it.
  const noneCorrect = optBtn('u5l1quiz', 1, 'Z', LETTERS);
  const bad = rewriteBodyOptBtn('t', noneCorrect, ['A']);
  ok('  a question with no correct option is refused, not guessed at',
    bad.problems.length === 1 && /0 flagged correct/.test(bad.problems[0]), bad.problems);

  // And the verifier must catch a corrupted rewrite rather than trust the
  // rewriter. This is the check that was missing when the 90-byte loss shipped.
  const corrupted = r.body.replace('opt-letter', 'opt-letter ');
  ok('  the verifier rejects a body whose non-button content moved',
    verifyOptBtn('t', body, corrupted).length > 0,
    verifyOptBtn('t', body, corrupted));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
