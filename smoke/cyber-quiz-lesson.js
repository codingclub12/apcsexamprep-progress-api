'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: a cyber quiz bank lands on the lesson the gradebook keys.
//
//  WHY THIS EXISTS
//  The quiz extractor read the lesson out of the Shopify handle, which is the
//  obvious answer and is wrong for all six Unit 3 pages. Unit 3 was renumbered
//  onto the Fall 2026 CED in the page BODIES; the handles are URLs and stayed
//  put. So ap-cyber-unit-3-lesson-5-quiz is topic 3.4, and reading its digits
//  files a bank of firewall questions under Segmentation.
//
//  Nothing throws when that happens. Every id is well formed, the seed runs
//  clean, and a teacher gets a gradebook column of the wrong questions. The
//  only way to catch it is to make two implementations agree.
//
//  WHAT IS PINNED
//   1. lib/cyber-quiz-lesson.js agrees with utils.pageFromHandle, which is the
//      PRODUCTION resolver: it is what /track and the gradebook key on. Two
//      implementations, written from different sources (the CED topic taxonomy
//      plus the page's own h1, versus a hand-written handle map).
//   2. The bug is real: for Unit 3 the answer DIFFERS from the handle digits.
//      Without this the suite would pass against a resolver that never left
//      home, and report the migration safe.
//   3. Disagreement is a refusal, not a guess. A page whose h1 contradicts the
//      taxonomy, and a handle nothing corroborates, both throw.
//
//  Offline and secret-free: h1 strings are pinned in smoke/fixtures, read once
//  from the live pages. Zero PII: page titles only.
// -----------------------------------------------------------------------------
const path = require('path');
const H1 = require('./fixtures/cyber-quiz-h1.json');
const { lessonForQuizHandle, statedTopic } = require('../lib/cyber-quiz-lesson');
const utils = require('../utils');
const { SOURCES } = require('../scripts/seed-quiz-bank');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const body = (h1) => `<div class="hero"><h1>${h1}</h1></div>`;
const digits = (h) => { const m = h.match(/unit-(\d+)-lesson-(\d+)/); return `${m[1]}.${m[2]}`; };

console.log('\n-- 1. the resolver agrees with the production tracking resolver --');
const handles = Object.keys(H1).sort();
ok(`${handles.length} cyber quiz handles under test`, handles.length === 20, handles.length);
let disagreements = [];
for (const h of handles) {
  const mine = lessonForQuizHandle(h, body(H1[h]));
  const prod = utils.pageFromHandle(h);
  if (!prod || prod.lesson !== mine.lesson || prod.activity_type !== 'quiz') {
    disagreements.push({ handle: h, mine: mine.lesson, utils: prod && prod.lesson });
  }
}
ok('every handle resolves to the same lesson as utils.pageFromHandle', disagreements.length === 0, disagreements);

console.log('\n-- 2. the handle digits really are wrong, so this suite is not circular --');
//  If this ever goes green with zero, the renumbering has been undone or the
//  fixture has drifted, and assertion 1 stopped meaning anything.
const moved = handles.filter((h) => lessonForQuizHandle(h, body(H1[h])).lesson !== digits(h));
ok('the naive handle-digit reading differs on some page', moved.length > 0, moved.length);
const u3 = handles.filter((h) => h.includes('unit-3'));
const u3moved = u3.filter((h) => moved.includes(h));
ok(`all ${u3.length} Unit 3 pages differ from their handle digits`, u3moved.length === u3.length,
  { u3: u3.length, moved: u3moved.length });
const notU3 = moved.filter((h) => !h.includes('unit-3'));
ok('and no page outside Unit 3 does, so the correction is scoped', notU3.length === 0, notU3);

console.log('\n-- 3. CED topic 3.1 keeps two columns, not one --');
const a = lessonForQuizHandle('ap-cyber-unit-3-lesson-1-quiz', body(H1['ap-cyber-unit-3-lesson-1-quiz']));
const b = lessonForQuizHandle('ap-cyber-unit-3-lesson-2-quiz', body(H1['ap-cyber-unit-3-lesson-2-quiz']));
ok('both pages are topic 3.1', a.topic === '3.1' && b.topic === '3.1', { a: a.topic, b: b.topic });
ok('but they key different lessons, so one cannot mask the other',
  a.lesson === '3.1a' && b.lesson === '3.1b', { a: a.lesson, b: b.lesson });

console.log('\n-- 4. disagreement refuses rather than guesses --');
const throws = (fn) => { try { fn(); return null; } catch (e) { return e.message; } };
ok('a page whose h1 contradicts the taxonomy is refused',
  !!throws(() => lessonForQuizHandle('ap-cyber-unit-3-lesson-5-quiz', body('Lesson 3.5 Quiz: Firewalls'))));
ok('an unknown handle with no stated topic is refused',
  !!throws(() => lessonForQuizHandle('ap-cyber-unit-2-lesson-1-quiz', '<h1>Quiz</h1>')));
ok('a non-quiz handle is refused',
  !!throws(() => lessonForQuizHandle('ap-cyber-unit-2-lesson-1-lab', body('Lesson 2.1 Lab'))));
ok('a page stating no number reads as null rather than as a number',
  statedTopic('<h1>Detection &amp; IR Quiz</h1>') === null);

console.log('\n-- 5. every seeded cyber bank sits on a lesson the course knows --');
//  This block first read utils.COURSE_STRUCTURE, which utils does not export,
//  so every lookup was undefined, every iteration hit `continue`, and the
//  assertion passed against nothing. It is checked below that it actually
//  looked at some banks, because that is the only thing separating a real
//  green from that one.
const CYBER = utils.COURSES['ap-cybersecurity'];
const bad = [];
let checked = 0;
for (const p of SOURCES) {
  if (p.location.course !== 'ap-cybersecurity') continue;
  const known = CYBER && CYBER.units && CYBER.units[p.location.unit];
  if (!known) { bad.push(`${p.location.unit} is not a unit of this course`); continue; }
  checked++;
  if (!known.lessons.includes(p.location.lesson)) bad.push(`${p.location.unit}/${p.location.lesson}`);
}
ok('no bank is filed under a lesson the course structure does not list', bad.length === 0, bad);
ok(`the check actually looked at banks (${checked} of them)`, checked >= 20, checked);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
