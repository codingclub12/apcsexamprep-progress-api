#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CYBER UNIT 3: the handle -> lesson map, pinned.
//
//  Offline, no network, no secrets. Run: npm run smoke:cyberunit3
//
//  WHAT THIS DEFENDS
//  Unit 3's handles do not state their lesson. The pages were renumbered to the
//  Fall 2026 CED, and because CED 3.1 is taught over two pages, every handle
//  after the pair is offset by one from its topic number. utils.js carries an
//  explicit map for exactly that reason.
//
//  The failure this catches is silent. Delete the map and the generic
//  `unit.handleNumber` rule still returns a well-formed lesson for every Unit 3
//  handle: lesson-3 files under 3.3 while the page teaches 3.2. Nothing throws,
//  no request fails, and a student's work lands on a lesson they never opened.
//  Only a test that knows the intended pairing can see it.
//
//  So this asserts the mapping itself, not that the function returns something.
//  If Unit 3 is ever renumbered again, this file is the thing that has to be
//  edited on purpose, which is the point.
//
//  Spec: docs/cyber-unit3-renumbering-spec.md
// ─────────────────────────────────────────────────────────────────────────────

const { pageFromHandle } = require('../utils');

//  handle number -> the CED lesson it teaches after the renumbering.
const EXPECTED = {
  1: '3.1a',
  2: '3.1b',
  3: '3.2',
  4: '3.3',
  5: '3.4',
  6: '3.5',
};

const ACTIVITIES = ['', '-exercise-1', '-exercise-2', '-lab', '-quiz'];
const ACTIVITY_LESSON = {
  '': 'lesson',
  '-exercise-1': 'exercise',
  '-exercise-2': 'exercise',
  '-lab': 'lab',
  '-quiz': 'quiz',
};

let failures = 0;
const fail = (msg) => { console.log(`FAIL  ${msg}`); failures++; };
const pass = (msg) => console.log(`ok    ${msg}`);

//  1. Every Unit 3 handle maps to its CED lesson, on the lesson page and on all
//     four activity pages, since the activities report under the same lesson.
for (const [n, lesson] of Object.entries(EXPECTED)) {
  for (const suffix of ACTIVITIES) {
    const handle = `ap-cyber-unit-3-lesson-${n}${suffix}`;
    const got = pageFromHandle(handle);
    if (!got) { fail(`${handle} -> null, expected lesson ${lesson}`); continue; }
    if (got.lesson !== lesson) {
      fail(`${handle} -> lesson ${got.lesson}, expected ${lesson}`);
      continue;
    }
    if (got.course !== 'ap-cybersecurity') {
      fail(`${handle} -> course ${got.course}`);
      continue;
    }
    if (got.unit !== 'unit-3') { fail(`${handle} -> unit ${got.unit}`); continue; }
    pass(`${handle} -> ${got.lesson} (${got.activity_type})`);
  }
}

//  2. The doubled topic is the whole reason the map exists: the two halves of
//     CED 3.1 must NOT share a lesson id, or the gradebook collapses their
//     columns and one part's score masks the other's.
const a = pageFromHandle('ap-cyber-unit-3-lesson-1');
const b = pageFromHandle('ap-cyber-unit-3-lesson-2');
if (a && b && a.lesson === b.lesson) {
  fail(`both halves of CED 3.1 report as ${a.lesson}; they must differ`);
} else {
  pass(`the two halves of CED 3.1 keep distinct ids (${a.lesson}, ${b.lesson})`);
}

//  3. Nothing in Unit 3 may report the retired 3.6, which is not a CED topic.
const retired = Object.keys(EXPECTED)
  .map((n) => pageFromHandle(`ap-cyber-unit-3-lesson-${n}`))
  .filter((p) => p && p.lesson === '3.6');
if (retired.length) fail('a Unit 3 handle still reports the retired lesson 3.6');
else pass('no Unit 3 handle reports the retired 3.6');

//  4. The map is Unit 3 only. Other units still derive from the handle, and a
//     regression there would be just as quiet.
for (const [handle, lesson] of [
  ['ap-cyber-unit-4-lesson-2', '4.2'],
  ['ap-cyber-unit-5-lesson-6-quiz', '5.6'],
]) {
  const got = pageFromHandle(handle);
  if (!got || got.lesson !== lesson) {
    fail(`${handle} -> ${got && got.lesson}, expected ${lesson}`);
  } else {
    pass(`${handle} -> ${got.lesson} (other units unaffected)`);
  }
}

//  5. Cyber 2.5 stays untracked. It is a leftover page set from an earlier cut
//     of Unit 2 and has no CED topic, so filing work under it would record
//     forever and display never.
const orphan = pageFromHandle('ap-cyber-unit-2-lesson-5');
if (orphan) fail(`ap-cyber-unit-2-lesson-5 -> ${orphan.lesson}, expected null`);
else pass('ap-cyber-unit-2-lesson-5 stays untracked');

//  6. THE THEME MUST USE THE SAME MAP, AND TODAY IT DOES NOT.
//
//  Everything above pins the SERVER. The number that reaches the gradebook is
//  chosen by the STOREFRONT, which sets window.APCS_PAGE before apcs-tracker.js
//  and apcs-score-reporter.js run. Read off the live page on 2026-09-02, that
//  snippet derives the lesson by naive arithmetic on the handle ordinals:
//
//      m = h.match(/^ap-cyber-unit-(\d+)-lesson-(\d+)-(exercise-1|exercise-2|lab|quiz)$/);
//      if (m) p = { unit: 'unit-' + m[1], lesson: m[1] + '.' + m[2], activity: m[3] };
//
//  It never consulted the renumbering. That is exactly the silent failure the
//  header of this file describes, running in production: lesson-3 files under
//  3.3 while the page teaches 3.2, nothing throws, and a student's work lands on
//  a lesson they never opened. Four handles report the retired 3.6, which has no
//  column at all.
//
//  The fix belongs in the theme, which is a different repo. What belongs HERE is
//  refusing to let the disagreement be rediscovered: the drift set is pinned
//  exactly, so a NEW disagreement fails the build, and so does fixing the theme
//  without emptying this list. Either way it gets edited on purpose.
const THEME_ACTIVITIES = /^ap-cyber-unit-(\d+)-lesson-(\d+)-(exercise-1|exercise-2|lab|quiz)$/;
const themeRule = (h) => {
  const m = h.match(THEME_ACTIVITIES);
  return m ? { unit: `unit-${m[1]}`, lesson: `${m[1]}.${m[2]}`, activity: m[3] } : null;
};

//  Every cyber activity handle, built from the course structure rather than
//  typed out, so a new lesson or activity is compared automatically.
const { COURSES } = require('../utils');
const CYBER = COURSES['ap-cybersecurity'];
const allHandles = [];
for (const [unit, cfg] of Object.entries(CYBER.units || CYBER)) {
  if (!cfg || !cfg.lessons) continue;
  for (let i = 1; i <= cfg.lessons.length; i++) {
    for (const a of ['exercise-1', 'exercise-2', 'lab', 'quiz']) {
      allHandles.push(`${unit.replace('unit-', 'ap-cyber-unit-')}-lesson-${i}-${a}`);
    }
  }
}

//  Live as of 2026-09-02: all 24 Unit 3 activity pages, and nothing else.
const KNOWN_DRIFT = [];
for (let n = 1; n <= 6; n++) {
  for (const a of ['exercise-1', 'exercise-2', 'lab', 'quiz']) {
    KNOWN_DRIFT.push(`ap-cyber-unit-3-lesson-${n}-${a}`);
  }
}

const drift = allHandles.filter((h) => {
  const t = themeRule(h), sv = pageFromHandle(h);
  return t && sv && (t.lesson !== sv.lesson || t.unit !== sv.unit);
});
const unexpected = drift.filter((h) => !KNOWN_DRIFT.includes(h));
const healed = KNOWN_DRIFT.filter((h) => !drift.includes(h));

if (unexpected.length) {
  fail(`the storefront and the server disagree on ${unexpected.length} handle(s) that were `
    + `agreeing: ${unexpected.slice(0, 4).join(', ')}. Work posted from these lands on the `
    + `wrong lesson.`);
} else if (healed.length === KNOWN_DRIFT.length) {
  fail('the storefront now agrees on every Unit 3 handle. Empty KNOWN_DRIFT in this file: '
    + 'the defect it documents is fixed and the list is now a lie.');
} else if (healed.length) {
  fail(`the storefront was fixed for ${healed.length} of ${KNOWN_DRIFT.length} Unit 3 handles `
    + `but not the rest: ${healed.slice(0, 4).join(', ')}. A half-applied renumbering is worse `
    + `than none, because the two halves of Unit 3 now file under different schemes.`);
} else {
  pass(`the storefront disagrees with the server on exactly the ${drift.length} known Unit 3 `
    + 'handles, and agrees on the other ' + (allHandles.length - drift.length)
    + '. This is a LIVE DEFECT awaiting a theme fix, not a passing state.');
}

console.log(
  failures
    ? `\n${failures} assertion(s) failed`
    : '\nall Unit 3 handle mappings correct',
);
process.exit(failures ? 1 : 0);
