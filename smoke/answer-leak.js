'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: the answer-leak detector, proven per rule rather than in aggregate.
//
//  A GREEN MUTATION RUN IS A FAILED CHECK. Each of the three rules is broken on
//  purpose below and the case for THAT rule must stop being found while the
//  other two keep being found. Requiring only "something went red" proves
//  nothing here, because all three rules read the same page and any one of them
//  firing would carry a body that had lost the other two. Two guards in this
//  repo were found hollow on 2026-09-02 and a third on 2026-09-03 for exactly
//  that reason.
//
//  THE FIXTURES ARE INVENTED, DELIBERATELY.
//  They are the live markup SHAPE, taken from the AP CSA Unit 1 lesson pages
//  measured on 2026-09-09, with invented questions and invented keys. This
//  repository is public. Pasting a real excerpt would publish a key for a live
//  student page in a second place, and, worse, it would still be here after the
//  pages are fixed. A fixture that outlives the leak it was built from is a new
//  leak with a test name on it.
//
//  OFFLINE. Nothing here touches the network or the store.
//
//    node smoke/answer-leak.js        # npm run smoke:answerleak
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const Module = require('module');
const leak = require('../lib/answer-leak');

const SRC = path.join(__dirname, '..', 'lib', 'answer-leak.js');
let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  ok    ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (x === undefined ? '' : '  -> ' + JSON.stringify(x))); }
};
const section = (t) => console.log('\n' + t);

// -- Fixtures, one per channel, in the live shape ------------------------------

//  An MCQ container the client grader reads, carrying the item id that makes it
//  a gradebook column. This is the 102-of-128 case.
const MCQ_GRADED =
  '<div class="apcs-ex" data-type="mcq" data-answer="C" data-item-id="9.9-cfu-1">'
  + '<div class="apcs-ex-stem">Which line compiles?</div></div>';

//  The same widget without an item id: still readable, but no column moves.
const MCQ_UNGRADED =
  '<div class="apcs-ex" data-type="mcq" data-answer="B">'
  + '<div class="apcs-ex-stem">Part A: which declaration is valid?</div></div>';

//  The cloze case, where the attribute holds the answer TEXT rather than a
//  letter. Strictly worse than a letter, which is useless without its options.
const CLOZE =
  '<div class="apcs-cloze-text">A <span class="apcs-cloze-blank" data-answer="widget"></span>'
  + ' holds a value, and every one has a fixed'
  + ' <span class="apcs-cloze-blank" data-answer="sort order"></span>.</div>';

//  The channel no attribute sweep sees. Seventy of these are live in Unit 1.
const COMMENT = '<!-- Q4: trailing whitespace trap, answer D -->\n<p>Question four.</p>';

//  Must never fire. Every one of these is real page furniture from the same
//  bodies: nav markers, build stamps, placeholders, and wiring notes that use
//  the word "answer" without naming one.
const INNOCENT = [
  ['nav marker', '<!-- CSANAV-START --><!-- CSANAV-END -->'],
  ['build stamp', '<!-- ap-csa-lesson-1-1-intro-algorithms | Built 2026-05-15 from a template -->'],
  ['placeholder', '<!-- VIDEO PLACEHOLDER: Add lesson video embed here when ready -->'],
  ['feedback wiring', '<!-- answer feedback wiring for the check button -->'],
  ['option list', '<!-- feedback blocks: A, B, C, D -->'],
  ['describes placement', '<!-- correct answer feedback for option A is rendered below -->'],
  ['points at a key page', '<!-- Answers: see the teacher key page -->'],
  ['a lettered range', '<!-- Key: A-D options are rendered in order -->'],
  ['prose that says answer', '<p>Check your answer against the rubric.</p>'],
  ['a part label', '<h3>Part A: which declaration is valid?</h3>'],
];

section('1. Each channel is found');
ok('1.1 a graded MCQ attribute is found', leak.summarize(MCQ_GRADED).byRule['mcq-answer-attribute'] === 1);
ok('1.2 a graded MCQ attribute is reported as graded', leak.summarize(MCQ_GRADED).graded === 1);
ok('1.3 the item id is carried on the finding',
  leak.findings(MCQ_GRADED)[0].item_id === '9.9-cfu-1', leak.findings(MCQ_GRADED)[0].item_id);
ok('1.4 an ungraded MCQ attribute is still found, and not counted as graded',
  leak.summarize(MCQ_UNGRADED).byRule['mcq-answer-attribute'] === 1 && leak.summarize(MCQ_UNGRADED).graded === 0);
ok('1.5 both cloze answers are found', leak.summarize(CLOZE).byRule['cloze-answer-attribute'] === 2);
ok('1.6 the cloze answer TEXT is reported, not a letter',
  leak.findings(CLOZE).map((f) => f.disclosed).join('|') === 'widget|sort order');
ok('1.7 the comment channel is found', leak.summarize(COMMENT).byRule['answer-comment'] === 1);
ok('1.8 the comment finding names the disclosed letter', leak.findings(COMMENT)[0].disclosed === 'D');

section('2. Page furniture never fires');
for (const [name, body] of INNOCENT) {
  const f = leak.findings(body);
  ok('2.' + name, f.length === 0, f.map((x) => x.rule + ':' + x.disclosed));
}

section('3. A one-word cloze answer is not mistaken for a letter key');
//  "A" is a legitimate cloze answer and a legitimate option letter. The tag it
//  sits in is what tells them apart, which is why classification reads the tag
//  and not the value.
const CLOZE_A = '<span class="apcs-cloze-blank" data-answer="A"></span>';
ok('3.1 classified by its tag, not its value',
  leak.findings(CLOZE_A)[0].rule === 'cloze-answer-attribute', leak.findings(CLOZE_A)[0].rule);

section('3b. A whitespace-padded key is still an MCQ key, and says so');
//  Live on ap-csa-lesson-1-9-method-signatures, item 1.9-cfu-1: the stored
//  attribute is a newline then C. Classifying by the untrimmed value filed that
//  MCQ key as cloze prose, which is how the first run of the sweep reported it.
//  The padding is also a live scoring bug in its own right, since the page
//  compares the raw attribute to the option letter with ===, so it is carried on
//  the finding rather than trimmed away and forgotten.
const PADDED = '<div class="apcs-ex" data-type="mcq" data-answer="\nC" data-item-id="9.9-cfu-9"></div>';
ok('3b.1 classified as an MCQ key despite the padding',
  leak.findings(PADDED)[0].rule === 'mcq-answer-attribute', leak.findings(PADDED)[0].rule);
ok('3b.2 flagged as padded', leak.findings(PADDED)[0].padded === true);
ok('3b.3 a clean key is not flagged as padded', leak.findings(MCQ_GRADED)[0].padded === false);

section('4. Findings come back in document order');
const MIXED = COMMENT + MCQ_GRADED + CLOZE;
const order = leak.findings(MIXED).map((f) => f.index);
ok('4.1 indexes ascend', order.every((v, i) => i === 0 || v > order[i - 1]), order);
ok('4.2 all three rules present on one body',
  new Set(leak.findings(MIXED).map((f) => f.rule)).size === 3);

// -- Mutation testing ----------------------------------------------------------
//  Load the module from patched source so the real file is never edited. A
//  mutation that does not apply is a failure in itself: it means the line the
//  mutation targets has moved and the mutation is silently testing nothing.
function mutate(find, replace) {
  const src = fs.readFileSync(SRC, 'utf8');
  if (!src.includes(find)) return null;
  const m = new Module(SRC, null);
  m.filename = SRC;
  m.paths = Module._nodeModulePaths(path.dirname(SRC));
  m._compile(src.replace(find, replace), SRC);
  return m.exports;
}

const SKIP_LETTERS = ['    const tag = tagAround(body, m.index);',
  '    if (/^[A-D]$/.test(value)) continue;\n    const tag = tagAround(body, m.index);'];
const SKIP_TEXT = ['    const tag = tagAround(body, m.index);',
  '    if (!/^[A-D]$/.test(value)) continue;\n    const tag = tagAround(body, m.index);'];
//  `(?!)` is a negative lookahead on the empty pattern, which always fails, so
//  the comment rule can never match. The first draft of this mutation used
//  `/(?!)/ && /real/`, which returns the REAL regex because a regex object is
//  truthy, so it broke nothing and section 5 stayed green on an unmutated rule.
//  That is the hollow-guard failure this section exists to catch, caught here on
//  the guard's own mutation rather than on the rule.
const KILL_COMMENT = ['const DISCLOSES = /\\b', 'const DISCLOSES = /(?!)\\b'];

//  Each row: what is broken, which fixture must go MISSED, and which fixtures
//  must still be FOUND. The second half is the part that makes this per rule.
const MUTATIONS = [
  { name: 'mcq-answer-attribute', patch: SKIP_LETTERS,
    blind: [['graded MCQ', MCQ_GRADED], ['ungraded MCQ', MCQ_UNGRADED]],
    keeps: [['cloze', CLOZE], ['comment', COMMENT]] },
  { name: 'cloze-answer-attribute', patch: SKIP_TEXT,
    blind: [['cloze', CLOZE]],
    keeps: [['graded MCQ', MCQ_GRADED], ['comment', COMMENT]] },
  { name: 'answer-comment', patch: KILL_COMMENT,
    blind: [['comment', COMMENT]],
    keeps: [['graded MCQ', MCQ_GRADED], ['cloze', CLOZE]] },
];

section('5. Mutation: each rule is load-bearing, and only its own case goes blind');
for (const mu of MUTATIONS) {
  const broken = mutate(mu.patch[0], mu.patch[1]);
  ok('5.' + mu.name + ' the mutation applied', broken !== null);
  if (!broken) continue;
  for (const [what, body] of mu.blind) {
    ok('5.' + mu.name + ' goes blind to the ' + what + ' case',
      broken.findings(body).length === 0, broken.findings(body).map((f) => f.rule));
  }
  for (const [what, body] of mu.keeps) {
    ok('5.' + mu.name + ' still finds the ' + what + ' case',
      broken.findings(body).length > 0);
  }
}

section('6. The rule list and the findings agree');
//  A rule that can never be produced is a rule that is not tested, and a finding
//  carrying a rule name nobody declared cannot be reported on.
const produced = new Set(leak.findings(MIXED + CLOZE_A).map((f) => f.rule));
ok('6.1 every declared rule is reachable', leak.RULES.every((r) => produced.has(r)),
  leak.RULES.filter((r) => !produced.has(r)));
ok('6.2 no finding carries an undeclared rule', [...produced].every((r) => leak.RULES.includes(r)));

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
