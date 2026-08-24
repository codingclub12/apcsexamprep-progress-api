'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: retiring the AP CSA course hub's live/coming-soon badges.
//
//  WHAT IS BEING PROTECTED
//
//  1. A HALF-REMOVAL. Taking the Live badges out and leaving 38 "Coming soon"
//     badges standing would be worse than doing nothing: the page would then
//     claim the whole course is unbuilt. Every category is asserted to reach
//     zero, and the words themselves are asserted absent from the body.
//
//  2. THE CODE EDITOR BADGE. It is a different fact about a topic (this lesson
//     has an editor) and shares the same span shape as the badges being
//     removed. It must survive untouched.
//
//  3. THE BLOCK STRUCTURE. This pass removes inline spans and rewrites one
//     class attribute. If a div count moves at all, the pattern matched
//     something it should not have, and a live page's layout is at stake.
//
//  4. A BODY THAT IS NOT THIS PAGE. The counts were measured against the live
//     body on 2026-08-24. A body that disagrees is refused rather than pattern
//     matched, because "remove everything that looks like a badge" is how an
//     unrelated page gets edited.
// ─────────────────────────────────────────────────────────────────────────────

const badges = require('../lib/csa-course-hub-badges');

let pass = 0; let fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

// A fixture with the live page's exact counts, so build() accepts it.
const E = badges.EXPECTED;
function topic(n, live) {
  return `  <div class="ch-topic${live ? ' live' : ''}">\n`
    + '    <div class="ch-topic-head">\n'
    + `      <span class="ch-topic-code">Topic ${n}</span>\n`
    + `      <span><a href="/pages/ap-csa-lesson-${n}">Lesson ${n}</a></span>\n`
    + (live
      ? '      <span class="ch-topic-status live">Live</span>\n'
      : '      <span class="ch-topic-status planned">Coming soon</span>\n')
    + '    </div>\n  </div>\n';
}
let body = '<style>\n.ch-topic.live { border-left-color: #16a34a !important; }\n</style>\n<div id="apcsa-course-hub">\n';
for (let i = 0; i < E.liveBadges; i++) body += topic(`1-${i}`, true);
for (let i = 0; i < E.comingSoonBadges; i++) body += topic(`2-${i}`, false);
for (let i = 0; i < E.codeEditorBadges; i++) {
  body += '  <div class="ch-topic-head"><span class="ch-topic-status code-editor">Code Editor</span></div>\n';
}
body += '  <a class="ch-unit-card" href="/pages/ap-csa-unit-1-course"><span>15 lessons'
  + '<span class="ch-unit-card-live" style="color:#fff!important;">Live</span></span></a>\n';
for (const [a, b] of [[15, 15], [0, 12], [0, 9], [0, 17]]) {
  body += `  <div class="ch-unit-meta"><span>Exam weight</span>\n      <span>&middot;</span>\n`
    + `      <span><strong>${a} of ${b} lessons live</strong></span>\n  </div>\n`;
}
body += '</div>\n';
const FIXTURE = body;

section('1. the fixture matches the live page it was measured from');
const m = badges.measure(FIXTURE);
ok('1.1 every measured count lines up', Object.keys(E).every((k) => m[k] === E[k]), { m, E });

section('2. what it removes');
const res = badges.build(FIXTURE);
ok('2.1 no problems', res.problems.length === 0, res.problems);
ok('2.2 all 15 Live badges are gone', res.after.liveBadges === 0);
ok('2.3 all 38 Coming soon badges are gone', res.after.comingSoonBadges === 0);
ok('2.4 the unit card badge is gone', res.after.unitCardBadges === 0);
ok('2.5 all four lesson counters are gone', res.after.counters === 0);
ok('2.6 the highlighted rows are reset to the default class', res.after.liveTopicClass === 0);
ok('2.7 the words themselves are absent', !/Coming soon/.test(res.body) && !/lessons live/.test(res.body));
ok('2.8 no dangling separator is left where a counter was', !/<span>(&middot;|·)<\/span>\s*<\/div>/.test(res.body));

section('3. what it keeps');
ok('3.1 all 35 Code Editor badges survive', res.after.codeEditorBadges === E.codeEditorBadges, res.after.codeEditorBadges);
ok('3.2 every lesson link survives',
  (res.body.match(/\/pages\/ap-csa-lesson-/g) || []).length === (FIXTURE.match(/\/pages\/ap-csa-lesson-/g) || []).length);
ok('3.3 every topic heading survives',
  (res.body.match(/<div class="ch-topic-head">/g) || []).length === (FIXTURE.match(/<div class="ch-topic-head">/g) || []).length);
ok('3.4 the div structure is untouched',
  (res.body.match(/<div[\s>]/g) || []).length === (FIXTURE.match(/<div[\s>]/g) || []).length
  && (res.body.match(/<\/div>/g) || []).length === (FIXTURE.match(/<\/div>/g) || []).length);

section('4. what it refuses');
function refuses(name, fn) {
  try { fn(); ok(name, false, 'it did not refuse'); } catch (e) { ok(name, true); }
}
refuses('4.1 a body with different counts is not this page',
  () => badges.build(FIXTURE.replace('<span class="ch-topic-status live">Live</span>\n', '')));
refuses('4.2 an unrelated body', () => badges.build('<div id="something-else"></div>'));
refuses('4.3 a body already processed', () => badges.build(res.body));

// A checker that cannot fail is not a checker.
section('5. the checker itself fails when it should');
ok('5.1 a surviving Coming soon badge is caught',
  badges.check(FIXTURE, `${res.body}<span class="ch-topic-status planned">Coming soon</span>`, res.before)
    .some((p) => /survived|Coming soon/.test(p)));
ok('5.2 a lost Code Editor badge is caught',
  badges.check(FIXTURE, res.body.replace('<span class="ch-topic-status code-editor">Code Editor</span>', ''), res.before)
    .some((p) => /Code Editor/.test(p)));
ok('5.3 a changed div count is caught',
  badges.check(FIXTURE, `${res.body}<div>`, res.before).some((p) => /div opens/.test(p)));
ok('5.4 a lost link is caught',
  badges.check(FIXTURE, res.body.split('/pages/ap-csa-lesson-1-0').join('/pages/gone'), res.before)
    .some((p) => /disappeared/.test(p)));
ok('5.5 an empty body is caught',
  badges.check(FIXTURE, '   ', res.before).some((p) => /empty/.test(p)));
ok('5.6 an output that removed nothing is caught',
  badges.check(FIXTURE, FIXTURE, res.before).some((p) => /nothing was removed/.test(p)));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
