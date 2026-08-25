'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  EVERY UNIT TEST LINK A CSP PAGE EMITS MUST BE A PAGE THAT EXISTS.
//
//  WHY THIS EXISTS
//  The 2026-08-25 nightly crawl found /pages/ap-csp-course-bi3-unit-test
//  returning 404, linked as "Big Idea 3 unit test" from the Where to go next
//  footer on 54 rendered pages. Big Idea 3 is the ONLY Big Idea whose unit test
//  is split across two sittings, which utils.js states outright in
//  pageFromHandle: part A and part B "stay SEPARATE lessons on purpose", because
//  one submission per page id means folding them would have part B overwrite
//  part A. So bi3-unit-test was never meant to exist.
//
//  Two builders emitted the handle from a uniform `bi${n}-unit-test` template,
//  which is right for four Big Ideas and wrong for the fifth. The exception was
//  already written down in THREE other places (scripts/csp-command-center-
//  exercises.js, lib/lesson-links.js, utils.js) and none of it reached those two
//  lines. That is the failure this test pins: the fact was known, and knowing it
//  in three places did not stop a fourth place from getting it wrong.
//
//  THE CHECK IS ON RENDERED OUTPUT, NOT ON SOURCE. Grepping the templates would
//  pass the moment someone reformatted the string. This renders all 123 CSP
//  pages and reads the anchors the students actually get.
//
//  Run: npm run smoke:cspunittestlinks
// ─────────────────────────────────────────────────────────────────────────────
const exercisePages = require('../lib/csp-exercise-pages');
const coursePages = require('../lib/csp-course-pages');
const { UNIT_TEST_HANDLES, unitTestsFor } = require('../lib/csp-unit-tests');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
};

const pages = [...exercisePages.allPages(), ...coursePages.allPages()];

// handle -> how many rendered pages link to it
const emitted = new Map();
for (const p of pages) {
  for (const m of String(p.bodyHtml || '').matchAll(/\/pages\/(ap-csp-course-bi\d-unit-test[a-z-]*)/g)) {
    if (!emitted.has(m[1])) emitted.set(m[1], []);
    emitted.get(m[1]).push(p.handle);
  }
}

console.log('\n  Rendered ' + pages.length + ' CSP pages\n');
ok('the build produces pages at all', pages.length > 100, pages.length);
ok('those pages link to unit tests', emitted.size > 0, [...emitted.keys()]);

console.log('\n  Every emitted unit test handle must be a real page\n');
for (const [handle, from] of [...emitted].sort()) {
  ok(`${handle} exists (linked from ${from.length} page(s))`,
    UNIT_TEST_HANDLES.has(handle),
    { linked_from: from.slice(0, 3) });
}

console.log('\n  Big Idea 3 is split, and nothing may link to the unsplit handle\n');
//  The specific regression, named, so a future reader sees the bug and not just
//  a generic assertion.
ok('nothing emits ap-csp-course-bi3-unit-test',
  !emitted.has('ap-csp-course-bi3-unit-test'),
  { linked_from: (emitted.get('ap-csp-course-bi3-unit-test') || []).slice(0, 3) });
ok('Big Idea 3 offers two unit test pages', unitTestsFor(3).length === 2);
ok('every other Big Idea offers exactly one',
  [1, 2, 4, 5].every((n) => unitTestsFor(n).length === 1));
ok('BI3 part A and part B are both linked somewhere in the build',
  emitted.has('ap-csp-course-bi3-unit-test-part-a') && emitted.has('ap-csp-course-bi3-unit-test-part-b'),
  [...emitted.keys()].filter((h) => h.includes('bi3')));

console.log('\n  The mapping has exactly one home\n');
//  The point of the fix is not the two-line correction, it is that the BI3
//  exception now lives in one module both builders import. A fourth hand-written
//  copy is the bug coming back.
const fs = require('fs');
for (const file of ['lib/csp-exercise-pages.js', 'lib/csp-course-pages.js', 'scripts/csp-command-center-exercises.js']) {
  const src = fs.readFileSync(require('path').join(__dirname, '..', file), 'utf8');
  ok(`${file} builds no unit-test handle by hand`,
    !/ap-csp-course-bi\$\{[^}]*\}-unit-test/.test(src) && !/['"`]ap-csp-course-bi\d-unit-test/.test(src));
  ok(`${file} imports the shared mapping`, /csp-unit-tests/.test(src));
}

console.log('\n  Handles are gradebook keys, so the set itself is pinned\n');
//  utils.js pageFromHandle parses 'unit-test' and 'unit-test-part-a' into lesson
//  ids that grades are recorded against. Renaming one detaches every score
//  already stored, so the exact strings are asserted rather than derived.
const { pageFromHandle } = require('../utils');
for (const n of [1, 2, 3, 4, 5]) {
  for (const [handle] of unitTestsFor(n)) {
    const parsed = pageFromHandle(handle);
    ok(`${handle} parses to a gradeable CSP exam`,
      parsed && parsed.course === 'ap-csp' && parsed.activity_type === 'exam' && parsed.unit === `bi-${n}`,
      parsed);
  }
}

console.log('\n' + (fail ? ('  ' + fail + ' FAILED, ' + pass + ' passed') : ('  OK - all ' + pass + ' checks passed')) + '\n');
process.exit(fail ? 1 : 0);
