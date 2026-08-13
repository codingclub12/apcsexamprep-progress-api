'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  GENERALIZED ANSWER KEY VERIFIER for radio-button exam pages.
//
//  Generalizes verify-cyber-unit-1-exam-key.js, which was hardcoded to 20
//  questions and the "qe" radio prefix. That script found the Q8 mis-key on the
//  Cyber Unit 1 exam: the key said A while every piece of feedback on the page
//  argued for B. The same defect class can sit on any page using this widget,
//  so the check needs to run against all of them, not one.
//
//  SHAPE UNDERSTOOD
//      var ANSWERS = {"e1":"D", ...}   or   {"q1":"D", ...}
//      <input name="q<KEY>" value="A"> <span>(A) option text</span>
//      <div class="fb-distractors"> ... <strong>(A)</strong> why it is wrong
//  The radio group name is always "q" + the ANSWERS key, which is what lets one
//  script cover both the "e"-keyed exams and the "q"-keyed practice pages.
//
//  Drag-and-drop exercises use `var ANSWERS = [` (an array, keyed by position,
//  no letters) and are correctly skipped: there is no letter to be biased.
//
//  WHAT IT CHECKS
//    1. every question offers exactly 4 options
//    2. radio value matches the visible "(X)" label, so clicking B submits B
//    3. the key letter is actually among the options offered
//    4. no distractor explanation sits on the correct answer  <- caught Q8
//  Plus the letter distribution and longest same-letter run, so a key that is
//  guessable without reading the questions shows up as a number.
//
//  A page it cannot parse is a FAIL, never a silent pass.
//
//  Run:
//    node scripts/one-off/verify-exam-key.js <file.html> [more.html ...]
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');

const LETTERS = ['A', 'B', 'C', 'D'];

function auditFile(path) {
  const body = fs.readFileSync(path, 'utf8');
  const name = path.replace(/^.*\//, '');

  const m = body.match(/var ANSWERS = (\{[^}]*\})/);
  if (!m) {
    const isArray = /var ANSWERS = \[/.test(body);
    return { name, skipped: true,
      why: isArray ? 'drag-and-drop exercise, no letter key' : 'no letter ANSWERS object' };
  }

  let ANSWERS;
  try { ANSWERS = JSON.parse(m[1]); } catch (e) { return { name, fail: ['ANSWERS is not valid JSON'] }; }

  const keys = Object.keys(ANSWERS);
  const key = keys.map((k) => ANSWERS[k]);
  const bad = [];

  const dist = { A: 0, B: 0, C: 0, D: 0 };
  key.forEach((k) => { if (dist[k] === undefined) bad.push('key letter ' + k + ' is not A-D'); else dist[k]++; });

  let run = 1, longest = 1;
  for (let i = 1; i < key.length; i++) {
    run = key[i] === key[i - 1] ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  keys.forEach((k) => {
    const q = 'q' + k;
    const opts = [...body.matchAll(
      new RegExp('name="' + q + '" value="([A-D])"> <span>\\(([A-D])\\) ([^<]*)<', 'g')
    )];
    if (opts.length !== 4) { bad.push(k + ': ' + opts.length + ' options, expected 4'); return; }
    opts.forEach((o) => {
      if (o[1] !== o[2]) bad.push(k + ': radio value ' + o[1] + ' but visible label (' + o[2] + ')');
    });
    if (!opts.some((o) => o[1] === ANSWERS[k])) bad.push(k + ': key ' + ANSWERS[k] + ' is not an offered option');

    // distractor block for this question: the first one after its option group
    const anchor = body.indexOf('name="' + q + '" value="A"');
    const ds = body.indexOf('<div class="fb-distractors">', anchor);
    if (anchor === -1 || ds === -1) { bad.push(k + ': no distractor block found'); return; }
    const inner = body.slice(ds, body.indexOf('</div>', ds));
    const listed = [...inner.matchAll(/<strong>\(([A-D])\)<\/strong>/g)].map((d) => d[1]);
    listed.forEach((L) => {
      if (L === ANSWERS[k]) bad.push(k + ': distractor (' + L + ') IS the correct answer');
    });
    const wrong = LETTERS.filter((L) => L !== ANSWERS[k]);
    wrong.forEach((L) => {
      if (!listed.includes(L)) bad.push(k + ': wrong option (' + L + ') has no distractor explanation');
    });
  });

  return { name, n: key.length, key, dist, longest, fail: bad };
}

let failed = 0;
const files = process.argv.slice(2);
if (!files.length) { console.error('usage: verify-exam-key.js <file.html> [...]'); process.exit(2); }

files.forEach((f) => {
  const r = auditFile(f);
  console.log('\n=== ' + r.name + ' ===');
  if (r.skipped) { console.log('skipped       ' + r.why); return; }
  console.log('questions     ' + r.n);
  console.log('key           ' + r.key.join(' '));
  console.log('distribution  ' + LETTERS.map((L) => L + ':' + r.dist[L]).join('  '));
  console.log('bubble score  ' + LETTERS.map(
    (L) => L + ':' + Math.round(r.dist[L] / r.n * 100) + '%').join('  '));
  console.log('longest run   ' + r.longest);
  if (r.fail.length) {
    failed++;
    console.log('integrity     FAIL');
    r.fail.forEach((x) => console.log('  - ' + x));
  } else {
    console.log('integrity     PASS - ' + r.n + '/' + r.n + ' questions clean');
  }
});

process.exit(failed ? 1 : 0);
