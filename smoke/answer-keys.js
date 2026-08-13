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
const { keysFor, distributionRows, rewriteBody, verify } = require('../scripts/answer-key-audit');

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

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
