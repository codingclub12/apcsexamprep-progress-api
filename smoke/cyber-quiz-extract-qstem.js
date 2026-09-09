'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: the fourth quiz markup generation, q-stem + .opt + checkQ.
//
//  WHY THIS EXISTS
//  scripts/extract-cyber-quizzes.js knew three markup generations and
//  ap-cyber-unit-3-lesson-6-quiz (CED 3.5) is a fourth, which is why it was one
//  of the last three cyber quizzes still shipping its own answer key. The
//  extractor had no test coverage at all before this file.
//
//  WHAT IS PINNED, and the first one is the whole point
//   1. The correct answer is RE-DERIVED off the page rather than trusted from
//      the parser: checkQ names a letter, the letter names an option div, and
//      that div's text must be the option the parser marked correct. A parser
//      that is subtly wrong here puts a wrong key in front of a class.
//   2. Explanations come from the exp[] table in the page's IIFE, not from the
//      markup, because the q-feedback divs are empty in source. Reading markup
//      alone would produce ten questions with no explanations and look fine.
//   3. The over-ceiling confirmation is EXACT. Ten is allowed for this handle
//      because a human confirmed this instrument; eleven is not.
//   4. No prompt or option carries a CED citation.
//
//  Offline and secret-free. Zero PII: authored quiz copy only.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const os = require('os');

const FIX = path.join(__dirname, 'fixtures', 'cyber-quiz-extract');
const HANDLE = 'ap-cyber-unit-3-lesson-6-quiz';
const body = fs.readFileSync(path.join(FIX, `${HANDLE}.body.html`), 'utf8');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

//  Run the real extractor over a temp dir holding just this page.
function runExtract(bodyText) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qx-'));
  fs.writeFileSync(path.join(dir, `${HANDLE}.body.html`), bodyText);
  const out = path.join(dir, 'out.json');
  const r = cp.spawnSync(process.execPath,
    [path.join(__dirname, '..', 'scripts', 'extract-cyber-quizzes.js'), dir, out],
    { encoding: 'utf8' });
  let parsed = null;
  try { parsed = JSON.parse(fs.readFileSync(out, 'utf8')); } catch (e) { /* refused */ }
  return { stdout: (r.stdout || '') + (r.stderr || ''), parsed };
}

console.log('\n-- 1. the generation is recognised and yields the whole quiz --');
const run = runExtract(body);
const rows = run.parsed && (Array.isArray(run.parsed) ? run.parsed : Object.values(run.parsed)[0]);
const quiz = rows && rows.find((r) => r.location && r.location.lesson === '3.5');
ok('the page extracts as lesson 3.5', !!quiz);
ok('it is recognised as the q-stem generation', /q-stem\+opt\+checkQ/.test(run.stdout));
ok('all ten questions come through', !!quiz && quiz.questions.length === 10, quiz && quiz.questions.length);
ok('every question has four options', !!quiz && quiz.questions.every((q) => q.options.length === 4));

console.log('\n-- 2. the key, RE-DERIVED off the page rather than trusted --');
const dec = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, ' ').trim().replace(/^[A-E]\.\s*/, '');
let matched = 0;
const wrong = [];
for (let n = 1; n <= 10; n++) {
  const i = body.indexOf(`id="qblock-${n}"`);
  const j = body.indexOf(`id="qblock-${n + 1}"`);
  const blk = body.slice(i, j < 0 ? body.length : j);
  const letter = (blk.match(/checkQ\(\s*\d+\s*,\s*.([A-E])./) || [])[1];
  const optM = blk.match(new RegExp(`<div class="opt"[^>]*id="opt-${n}-${letter}"[^>]*>([\\s\\S]*?)</div>`));
  const pageAnswer = optM ? dec(optM[1]) : null;
  const q = quiz && quiz.questions[n - 1];
  const got = q ? q.options[q.correct_index] : null;
  if (pageAnswer && got && pageAnswer === got) matched++;
  else wrong.push({ n, letter });
}
ok('all ten keys match the answer the page itself names', matched === 10, wrong);

console.log('\n-- 3. explanations come from the exp[] table, not the markup --');
ok('the q-feedback divs are empty in source, so markup alone would yield none',
  /<div class="q-feedback" id="fb-\d+"><\/div>/.test(body));
const withExpl = quiz ? quiz.questions.filter((q) => q.explanation).length : 0;
ok('eight of ten carry an explanation, the other two naming an option letter and dropped',
  withExpl === 8, withExpl);

console.log('\n-- 4. the over-ceiling confirmation is exact, not a raised ceiling --');
//  An eleventh question must put it back over the line: the confirmation names
//  a count, so a changed instrument is a changed decision.
const eleven = body.replace(
  /(<div class="q-block" id="qblock-10")/,
  '<div class="q-block" id="qblock-11">\n  <div class="q-stem">An extra question that was not confirmed.</div>\n'
  + '<div class="opts" id="opts-11">\n<div class="opt" id="opt-11-A"><span class="opt-letter">A.</span><span>First</span></div>\n'
  + '<div class="opt" id="opt-11-B"><span class="opt-letter">B.</span><span>Second</span></div>\n</div>\n'
  + '<button class="check-btn" onclick="checkQ(11,\'A\')">Check Answer</button>\n</div>\n$1');
ok('the planted eleventh question applied', eleven !== body);
const run11 = runExtract(eleven);
ok('eleven questions is refused, because ten is what was confirmed',
  /over the 6-item web-quiz ceiling/.test(run11.stdout), run11.stdout.slice(-160));

console.log('\n-- 5. nothing student-facing carries a citation --');
const CIT = /\bEK\b|\bLO\s*\d|\bCED\b|\bCB\b|\b\d\.\d\.[A-Z]\.\d\b/;
ok('no prompt or option names the CED',
  !!quiz && !quiz.questions.some((q) => CIT.test(q.prompt) || q.options.some((o) => CIT.test(o))));

console.log(`\n${fail ? 'FAIL' : 'PASS'}  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
