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

//  5b. Cyber 4.5 stays untracked, on BOTH sides.
//
//     The server half alone is not the fix, and that is the whole reason this
//     check exists rather than being folded into 5. POST /api/student/score
//     lets an explicit lesson win over the handle, deliberately, so a theme that
//     still resolves ap-cyber-unit-4-lesson-5 to '4.5' keeps writing that lesson
//     no matter what pageFromHandle says. Untracking has to happen where the
//     number is chosen, which is the storefront.
//
//     The page is live and on-syllabus: it teaches IoT and embedded devices,
//     which the CED covers under 4.1.A.4 and 4.1.A.5 inside topic 4.1. What it
//     has never had is a topic number of its own. Board 188.
const UNTRACKED_45 = [
  'ap-cyber-unit-4-lesson-5',
  'ap-cyber-unit-4-lesson-5-exercise-1',
  'ap-cyber-unit-4-lesson-5-exercise-2',
  'ap-cyber-unit-4-lesson-5-lab',
  'ap-cyber-unit-4-lesson-5-quiz',
];
for (const handle of UNTRACKED_45) {
  const got = pageFromHandle(handle);
  if (got) fail(`${handle} -> ${got.lesson}, expected null (the CED has no topic 4.5)`);
  else pass(`${handle} stays untracked on the server`);
}

//  6. THE THEME USES THE SAME MAP. FIXED 2026-09-02, PINNED HERE.
//
//  Everything above pins the SERVER. The number that reaches the gradebook is
//  chosen by the STOREFRONT, which sets window.APCS_PAGE before apcs-tracker.js
//  and apcs-score-reporter.js run.
//
//  Until 2026-09-02 that snippet derived the lesson by naive arithmetic on the
//  handle ordinals, lesson = unit + '.' + ordinal, and had never learned the
//  renumbering. All 24 Unit 3 activity pages and all 6 of its lesson pages filed
//  under the wrong lesson; four filed under the retired 3.6, which has no
//  gradebook column at all. Exactly the silent failure this file's header
//  describes, running in production for six days.
//
//  Theme PR #93 replaced both derivation sites with snippets/apcs-cyber-lesson-
//  map.liquid, which carries the override table below and falls through to the
//  plain U.L form for every other unit. Verified live on the storefront, not
//  against a merged pull request.
//
//  WHAT THIS PINS, AND WHAT IT CANNOT
//  This is a TRANSCRIPTION of the deployed rule, so it catches a change made
//  HERE without a matching change in the theme. It cannot see the theme change
//  on its own: the first version of this section pinned a drift list, the theme
//  was then fixed, and this suite stayed green and kept reporting the old drift.
//  A transcription is only as fresh as the last person who looked. The live
//  check belongs in a scheduled job with network access, not in an offline
//  suite, and that is worth building rather than pretending this covers it.
//  Unit 4 joined the table on 2026-09-03, board 188, and it is there for the
//  opposite reason to Unit 3. Unit 3's handles LIE about their topic, so the
//  table corrects them. Unit 4's handles are honest as far as they go, but the
//  unit has five lesson pages and the CED has four topics, so the theme's
//  fall-through was minting a lesson 4.5 the gradebook has no column for.
//  Listing 1 through 4 makes ordinal 5 return null on both sides.
//  Unit 2 is fenced for the same reason as Unit 4, and check 6b below is what
//  found it: the callers' RETIRED regex is /^ap-cyber-unit-2-lesson-5-/ with a
//  trailing hyphen, so it catches the four 2.5 activity pages and would miss a
//  bare ap-cyber-unit-2-lesson-5 landing page. None is live today. The fence
//  does not depend on that staying true.
const THEME_OVERRIDE = {
  'unit-2': { 1: '2.1', 2: '2.2', 3: '2.3', 4: '2.4' },
  'unit-3': { 1: '3.1a', 2: '3.1b', 3: '3.2', 4: '3.3', 5: '3.4', 6: '3.5' },
  'unit-4': { 1: '4.1', 2: '4.2', 3: '4.3', 4: '4.4' },
};
const themeLesson = (unitOrdinal, lessonOrdinal) => {
  const map = THEME_OVERRIDE[`unit-${unitOrdinal}`];
  if (map) return map[lessonOrdinal] || null;   // refuses rather than guessing
  return `${unitOrdinal}.${lessonOrdinal}`;
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

const drift = [];
const refused = [];
for (const h of allHandles) {
  const m = h.match(/^ap-cyber-unit-(\d+)-lesson-(\d+)-/);
  const sv = pageFromHandle(h);
  if (!m || !sv) continue;
  const t = themeLesson(Number(m[1]), Number(m[2]));
  if (t === null) { refused.push(h); continue; }
  if (t !== sv.lesson) drift.push(`${h}: theme ${t}, server ${sv.lesson}`);
}

//  6b. A handle the SERVER refuses must be refused by the STOREFRONT too.
//
//     The drift loop above compares only handles the server maps, so it goes
//     quiet on exactly the handles this change is about: pageFromHandle returns
//     null for cyber 2.5 and 4.5, the loop skips them, and a theme still
//     resolving them to a lesson id sails through. That is not hypothetical.
//     POST /api/student/score takes an explicit lesson over the handle, so the
//     storefront's number is the one that reaches the gradebook.
//
//     The theme refuses a page two ways, and both are transcribed, because
//     modelling only the map would report cyber 2.5 as drift when it is
//     correctly fenced by the regex instead:
//       - RETIRED, a literal regex in quiz-tracker-wiring.liquid and
//         apcs-grade-reporter.liquid, which returns before anything else runs
//       - APCS_CYBER_LESSON returning null, which leaves window.APCS_PAGE unset
const THEME_RETIRED = /^ap-cyber-unit-2-lesson-5-/;
const themeRefuses = (handle) => {
  if (THEME_RETIRED.test(handle)) return true;
  const m = handle.match(/^ap-cyber-unit-(\d+)-lesson-(\d+)(?:-|$)/);
  if (!m) return false;
  return themeLesson(Number(m[1]), Number(m[2])) === null;
};

const leaked = [];
for (const handle of [...UNTRACKED_45, 'ap-cyber-unit-2-lesson-5',
  'ap-cyber-unit-2-lesson-5-quiz', 'ap-cyber-unit-2-lesson-5-lab']) {
  if (!themeRefuses(handle)) leaked.push(handle);
}
if (leaked.length) {
  fail('the server leaves these untracked but the storefront still resolves them, so work '
    + `posted from them lands on a lesson with no column: ${leaked.join(', ')}`);
} else {
  pass('every handle the server refuses is refused by the storefront rule as well');
}

//  A fence is only a fence if the pages next door still get through.
for (const [handle, lesson] of [
  ['ap-cyber-unit-4-lesson-4-quiz', '4.4'],
  ['ap-cyber-unit-4-lesson-1', '4.1'],
]) {
  const m = handle.match(/^ap-cyber-unit-(\d+)-lesson-(\d+)(?:-|$)/);
  const t = themeLesson(Number(m[1]), Number(m[2]));
  const sv = pageFromHandle(handle);
  if (t === lesson && sv && sv.lesson === lesson) pass(`${handle} still maps to ${lesson} on both sides`);
  else fail(`${handle} -> theme ${t}, server ${sv && sv.lesson}, expected ${lesson} on both`);
}

if (drift.length) {
  fail(`the storefront rule and the server map disagree on ${drift.length} handle(s). `
    + `Work posted from these lands on the wrong lesson: ${drift.slice(0, 4).join('; ')}`);
} else if (refused.length) {
  fail(`the storefront rule refuses ${refused.length} handle(s) the server maps, so those `
    + `pages would go untracked: ${refused.slice(0, 4).join(', ')}`);
} else {
  pass(`the storefront rule agrees with the server on all ${allHandles.length} cyber activity `
    + 'handles, Unit 3 included');
}

console.log(
  failures
    ? `\n${failures} assertion(s) failed`
    : '\nall Unit 3 handle mappings correct',
);
process.exit(failures ? 1 : 0);
