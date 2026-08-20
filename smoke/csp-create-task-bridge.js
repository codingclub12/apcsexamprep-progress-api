'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: the Create Task bridge page.
//
//  WHAT IS BEING PROTECTED
//
//  1. THE REQUIREMENT DETECTOR AGREEING WITH ITSELF. Each problem declares the
//     requirements it is about, and its reference solution has to actually
//     contain exactly those and no others, in both languages. A solution that
//     quietly satisfies more than its problem claims makes the ramp a lie: the
//     student is told they are learning two things while doing five.
//
//  2. THE JAVASCRIPT PRELUDE NOT PAYING FOR REQUIREMENTS. Node has no prompt(),
//     so every JavaScript starter opens with four supplied lines. Those lines
//     contain a .split() and a function that is defined and then called, which
//     the Create Task Builder's detector reads as "list" and "call". Left
//     unhandled the page would report four of six on an empty program. The
//     prelude is therefore stripped before detection, and this asserts it stays
//     stripped, because the failure is silent and flattering.
//
//  3. INPUT ACTUALLY BEING SENT. The eighteen topic pages post no stdin at all,
//     which is the whole reason this page exists. A regression that dropped the
//     stdin field would leave every problem here reading from an empty stream
//     and failing for a reason no student could diagnose.
//
//  4. EXPECTED OUTPUT NEVER BEING TYPED. Every expected value comes from
//     running the reference solution through the live Judge0 proxy in both
//     languages and requiring agreement. This asserts the file exists, matches
//     the seed problem for problem, and that the requirement-checked problem
//     carries null rather than one person's idea of a right answer.
//
//  5. THE HOUSE HAZARDS, via the builder's own checkPage: pure ASCII, one h1,
//     balanced script tags, four problems, and an SEO description Shopify will
//     render.
//
//  6. THE JAVASCRIPT PARSING AT ALL. The page's script block is compiled. A
//     syntax error there is invisible to every check above and renders as a
//     page of dead editors.
//
//  WHAT THIS CANNOT PROVE: that the page looks right, or that a wrong answer is
//  rejected end to end. Both were checked in a real browser against the live
//  Judge0 proxy before shipping, including five wrong-answer cases, because the
//  two worst bugs this project has shipped were both invisible to structural
//  checks and obvious in a screenshot.
//
//  Zero PII: author content only, no student data anywhere near this.
//
//  Run: npm run smoke:cspbridge
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { build, checkPage } = require('../scripts/csp-create-task-bridge-csv');
const { render, DETECTOR, RUNNER } = require('../lib/csp-create-task-bridge');
const data = require('../seed/csp-create-task/bridge');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

const REQS = data.reqs;
const LANGS = ['python', 'javascript'];
const expectedPath = path.join(__dirname, '..', 'seed', 'csp-create-task', 'expected.json');

section('1. The seed is shaped the way the renderer assumes');
ok('there are four problems', data.problems.length === 4, data.problems.length);
ok('there are six requirements', REQS.length === 6, REQS);
ok('exactly one problem is requirement-checked',
  data.problems.filter((p) => p.check === 'six').length === 1);
ok('the requirement-checked problem is the last one',
  data.problems[data.problems.length - 1].check === 'six');
data.problems.forEach((p, i) => {
  ok(`problem ${i + 1} names only known requirements`,
    p.targets.every((k) => REQS.indexOf(k) !== -1), p.targets);
  ok(`problem ${i + 1} has stdin, because a page with no input is the page this replaces`,
    typeof p.stdin === 'string' && p.stdin.length > 0);
  LANGS.forEach((l) => {
    ok(`problem ${i + 1} has a ${l} starter and solution`,
      !!(p.starter[l] && p.solution[l]));
  });
});

section('2. The ramp actually ramps');
// A bridge whose problems do not add requirements is just four more exercises.
const counts = data.problems.map((p) => p.targets.length);
ok('requirement count never goes down', counts.every((n, i) => i === 0 || n >= counts[i - 1]), counts);
ok('it starts below six and ends at six', counts[0] < 6 && counts[counts.length - 1] === 6, counts);
data.problems.forEach((p, i) => {
  if (i === 0) return;
  ok(`problem ${i + 1} keeps everything problem ${i} taught`,
    data.problems[i - 1].targets.every((k) => p.targets.indexOf(k) !== -1));
});

section('3. Every reference solution contains exactly the requirements it claims');
const detectSix = new Function(DETECTOR + '\nreturn detectSix;')();
data.problems.forEach((p, i) => {
  LANGS.forEach((lang) => {
    const r = detectSix(p.solution[lang], lang);
    const got = REQS.filter((k) => r[k]);
    const extra = got.filter((k) => p.targets.indexOf(k) === -1);
    const missing = p.targets.filter((k) => got.indexOf(k) === -1);
    ok(`problem ${i + 1} ${lang} solution has no requirement it did not claim`, !extra.length, extra);
    ok(`problem ${i + 1} ${lang} solution has every requirement it claimed`, !missing.length, missing);
  });
});

section('4. The supplied JavaScript prelude buys the student nothing');
// This is the check that matters most, because its failure mode is a page that
// tells a student they have met requirements they have not written a line of.
const preludeOnly = data.problems[0].starter.javascript;
const bare = detectSix(preludeOnly, 'javascript');
ok('the prelude alone is not credited a list', !bare.list);
ok('the prelude alone is not credited a procedure', !bare.procedure);
ok('the prelude alone is not credited a call', !bare.call);
ok('the prelude alone is not credited an algorithm', !bare.algorithm);
// And the empty free-form starter must leave every chip unlit, or problem 4
// opens at some score above zero for no reason a student can see.
LANGS.forEach((lang) => {
  const s = detectSix(data.problems[3].starter[lang], lang);
  ok(`the problem 4 ${lang} starter detects nothing`, REQS.every((k) => !s[k]),
    REQS.filter((k) => s[k]));
});
// Input must still be detected once the student actually calls the helper.
ok('calling INPUT() in student code is credited as input',
  detectSix(preludeOnly + '\nconst a = INPUT();\nconsole.log(a);\n', 'javascript').input);

section('5. Expected output came from running the code, not from being typed');
ok('expected.json exists', fs.existsSync(expectedPath),
  'run scripts/verify-csp-code-pages.js --write');
if (fs.existsSync(expectedPath)) {
  const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'))[data.slug];
  ok('there is one expected entry per problem', expected && expected.length === data.problems.length);
  data.problems.forEach((p, i) => {
    if (p.check === 'six') {
      ok(`problem ${i + 1} is requirement-checked and carries no expected output`, expected[i] === null);
    } else {
      ok(`problem ${i + 1} has a non-empty expected output`,
        typeof expected[i] === 'string' && expected[i].length > 0);
    }
  });
}

section('6. The built page passes the house hazard checks');
const pages = build();
ok('the builder produced exactly one page', pages.length === 1, pages.length);
for (const p of pages) {
  const bad = checkPage(p);
  ok(`${p.handle} has no hazards`, bad.length === 0, bad);
}

section('7. The page sends input and hands off to the Builder');
const bodyHtml = pages[0].bodyHtml;
ok('stdin is included in the request the page makes', /stdin:\s*stdin/.test(RUNNER));
ok('the per-problem input is embedded', bodyHtml.indexOf('var STDINS') !== -1);
ok('the per-problem requirement targets are embedded', bodyHtml.indexOf('var TARGETS') !== -1);
ok('the Create Task Builder is linked', bodyHtml.indexOf('/pages/ap-csp-course-create-task') !== -1);
// Matching the expected string is not enough on its own: a student can print the
// right answer with the value typed in rather than read. If this check goes, the
// page silently starts rewarding exactly the habit it exists to break.
ok('a correct output is still checked against the problem requirements',
  /lack\s*=\s*\(TARGETS\[i\]/.test(RUNNER));

section('8. Every script block compiles');
const scripts = [...bodyHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
ok('the page has exactly one script block', scripts.length === 1, scripts.length);
scripts.forEach((src, i) => {
  let err = null;
  try { new vm.Script(src); } catch (e) { err = e.message; }
  ok(`script block ${i + 1} parses`, err === null, err);
});

section('9. The rendered page refuses a mismatched expected list');
// The renderer is the last gate before a page ships. A requirement-checked
// problem handed a string would grade a free-form program against one answer.
let threw = null;
try { render(data, [null, null, null, null]); } catch (e) { threw = e.message; }
ok('a fixed problem with no expected output is refused', threw !== null, threw);
threw = null;
try { render(data, ['a', 'b', 'c', 'd']); } catch (e) { threw = e.message; }
ok('a requirement-checked problem with an expected output is refused', threw !== null, threw);

console.log(`\n${'-'.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
