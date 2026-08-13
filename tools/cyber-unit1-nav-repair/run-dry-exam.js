'use strict';
// Dry run for the exam page, which takes BOTH Task A and Task B.
// Asserted in two stages so each task is held to its own invariant:
//   stage A: nav rewritten, everything outside the nav byte-identical
//   stage B: questions/key rewritten, the nav byte-identical
const fs = require('fs');
const { execFileSync } = require('child_process');
const { transformBody } = require('./transform-nav.js');
const { assertNav } = require('./assert-nav.js');
const { transformExam } = require('./transform-exam.js');
const { assertExam } = require('./assert-exam.js');
const { findNavBlock } = require('./lib-nav.js');

const handle = 'ap-cyber-unit-1-exam';
const orig = fs.readFileSync(`backup/${handle}.html`, 'utf8');
fs.writeFileSync(`backup/${handle}.html`, orig);

const notes = [];
const afterA = transformBody(orig, notes).body;
const final = transformExam(afterA, notes);
fs.writeFileSync(`.work/new/${handle}.html`, final);

console.log('=== ap-cyber-unit-1-exam: staged dry run ===\n');
console.log('-- stage A (nav), asserted orig -> afterA --');
const navChecks = assertNav(orig, afterA, handle);
for (const c of navChecks) console.log((c.pass ? '  PASS  ' : '  FAIL  ') + c.name + (c.detail ? '  :: ' + c.detail : ''));

console.log('\n-- stage B (exam), asserted afterA -> final --');
const examChecks = assertExam(afterA, final);
for (const c of examChecks) console.log((c.pass ? '  PASS  ' : '  FAIL  ') + c.name + (c.detail ? '  :: ' + c.detail : ''));
const navUntouched = findNavBlock(afterA).html === findNavBlock(final).html;
console.log((navUntouched ? '  PASS  ' : '  FAIL  ') + '8. stage B left the nav block byte-identical');

const failures = [...navChecks, ...examChecks].filter((c) => !c.pass).length + (navUntouched ? 0 : 1);
console.log(`\nEXAM ALL PASS: ${failures === 0}`);

console.log('\n-- pre-existing defects, NOT introduced by this pass, NOT fixed --');
console.log('  fb-distractors entry labelled as the correct answer: ' +
  (examChecks.preExistingCollisions.join(', ') || 'none'));
console.log('  questions whose fb-distractors omit some wrong options: ' +
  (examChecks.thinDistractors.join(', ') || 'none'));

// ---- diffs ----
function ud(a, b, label) {
  fs.writeFileSync('.work/tmp/a', a);
  fs.writeFileSync('.work/tmp/b', b);
  try {
    execFileSync('diff', ['-u', '--label', `a/${label}`, '--label', `b/${label}`, '.work/tmp/a', '.work/tmp/b'], { encoding: 'utf8' });
    return '';
  } catch (e) { return e.stdout || ''; }
}
function slice(s, from, to) { return s.slice(s.indexOf(from), s.indexOf(to) + to.length); }

let out = ud(findNavBlock(orig).html + '\n', findNavBlock(final).html + '\n', `${handle}#ucnav`);
const FROM = '<div class="q-block" id="q-e1">';
const TO = '};';
const qOld = orig.slice(orig.indexOf(FROM), orig.indexOf('var ANSWERS'));
const qNew = final.slice(final.indexOf(FROM), final.indexOf('var ANSWERS'));
out += '\n' + ud(qOld + '\n', qNew + '\n', `${handle}#questions`);
out += '\n' + ud(slice(orig, 'var ANSWERS', TO) + '\n', slice(final, 'var ANSWERS', TO) + '\n', `${handle}#answer-key`);
fs.writeFileSync(`diffs/${handle}.diff`, out);

console.log(`\nbody ${orig.length} -> ${final.length} (delta ${final.length - orig.length})`);
console.log(`diff written: diffs/${handle}.diff (${out.length} bytes)`);
