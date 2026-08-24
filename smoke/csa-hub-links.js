'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the AP CSA unit hub exercise links.
//
//  WHAT IS BEING PROTECTED
//
//  1. A CHIP THAT LINKS A PAGE THAT DOES NOT EXIST. Only 21 of the 53 CSA
//     exercise pages are live. A hub that links all 53 sends two thirds of a
//     class to a 404 and looks exactly like a working hub from the outside.
//     An exercise the live handle set does not contain must render as an inert
//     locked chip with no href anywhere in the output.
//
//  2. A BODY THAT COMES OUT SMALLER THAN IT WENT IN. Matrixify reports success
//     on an import that wiped a page. The generator's own checker refuses that,
//     and this suite proves the refusal works by feeding it a body-losing
//     patch rather than trusting that the branch is there.
//
//  3. THE DIV BALANCE. The live bodies carry one stray </div> from the broken
//     CTA block. The repair is a known one-div swing and everything else must
//     net to zero, which is what makes an unexplained imbalance detectable at
//     all.
//
//  4. THE CSV. These bodies are full of double quotes, so the sheet is
//     generated and PARSED BACK with a real RFC 4180 reader and the body
//     compared byte for byte.
//
//  The fixture below is a reduced copy of the real stored body shape, INCLUDING
//  the `class="u2-cta">` breakage as it actually appears live, measured
//  2026-08-24 against the Shopify Admin API.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const hub = require('../lib/csa-hub-links');

let pass = 0; let fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

function lessonCard(id, handle, title) {
  return `  <a class="u2-lesson-card" href="/pages/${handle}">\n`
    + `    <div class="u2-lesson-num">Lesson ${id}</div>\n`
    + `    <div class="u2-lesson-title">${title}</div>\n`
    + '    <div class="u2-lesson-meta">      <span class="u2-lesson-type" style="background:#1e40af!important;">Code Mechanics</span>\n'
    + '    </div>\n  </a>\n';
}

const LESSONS = [
  ['2.1', 'ap-csa-lesson-2-1-algorithms-selection-repetition', 'Algorithms with Selection and Repetition'],
  ['2.2', 'ap-csa-lesson-2-2-boolean-expressions', 'Boolean Expressions'],
  ['2.3', 'ap-csa-lesson-2-3-if-statements', 'if Statements'],
];

const FIXTURE = '<style>\n.u2-lesson-card { display: block !important; }\n.u2-learn { padding: 24px !important; }\n</style>\n'
  + '<div id="u2-hub">\n'
  + '<nav class="u2-breadcrumb"><a href="/pages/ap-csa-course">Course</a></nav>\n'
  + '<h2 class="u2-section-title">All 12 Lessons</h2>\n<div class="u2-grid">\n'
  + LESSONS.map(([id, h, t]) => lessonCard(id, h, t)).join('')
  + '</div>\n'
  + '<div class="u2-learn">\n  <div class="u2-learn-title">What you will learn</div>\n</div>\n'
  + '<div class="u2-resources">\n  <a class="u2-resource-card" href="/pages/ap-csa-test-builder">Test Builder</a>\n</div>\n'
  + '\nclass="u2-cta">\n  <h2>Ready to test yourself?</h2>\n'
  + '  <a class="u2-cta-btn" href="/pages/ap-csa-test-builder">Build a Practice Exam</a>\n</div>\n'
  + '<nav class="u2-nav"><a class="u2-nav-link" href="/pages/ap-csa-unit-1-course">Unit 1</a></nav>\n'
  + '</div>\n';

// Only 2.2 is "live" here, so 2.1 and 2.3 must lock. That asymmetry is the
// whole point: a fixture where everything is built cannot catch a bad lock.
const LIVE = new Set(['ap-csa-lesson-2-2-boolean-expressions-exercise-1']);

section('1. what it builds');
const res = hub.build(FIXTURE, LIVE);
ok('1.1 no problems on a well-formed body', res.problems.length === 0, res.problems);
ok('1.2 the unit is read off the wrapper, not guessed', res.unit === 'u2', res.unit);
ok('1.3 every lesson card on the page became a row', res.lessons.length === LESSONS.length, res.lessons.length);
ok('1.4 the live exercise is linked', res.body.indexOf('/pages/ap-csa-lesson-2-2-boolean-expressions-exercise-1') !== -1);
ok('1.5 the section landed before the learn block',
  res.body.indexOf('class="u2-exercises"') < res.body.indexOf('<div class="u2-learn">'));
ok('1.6 the count in the blurb is the built count, not the lesson count',
  res.body.indexOf('1 of 3 are open so far') !== -1);

section('2. a page that does not exist is never linked');
const unbuilt = [
  'ap-csa-lesson-2-1-algorithms-selection-repetition-exercise-1',
  'ap-csa-lesson-2-3-if-statements-exercise-1',
  'ap-csa-lesson-2-2-boolean-expressions-exercise-2',
];
ok('2.1 no unbuilt exercise appears as an href',
  unbuilt.every((h) => res.body.indexOf(`/pages/${h}`) === -1),
  unbuilt.filter((h) => res.body.indexOf(`/pages/${h}`) !== -1));
ok('2.2 unbuilt work is still visible as a locked chip',
  (res.body.match(/cursor:not-allowed/g) || []).length === 5,
  (res.body.match(/cursor:not-allowed/g) || []).length);
ok('2.3 an empty handle set locks everything and still builds',
  hub.build(FIXTURE, new Set()).problems.length === 0);
ok('2.4 an empty handle set links no exercise at all',
  hub.build(FIXTURE, new Set()).body.indexOf('-exercise-1"') === -1);

section('3. the CTA repair');
ok('3.1 the broken opener is gone', res.body.indexOf('\nclass="u2-cta">') === -1);
ok('3.2 the div was restored', res.body.indexOf('<div class="u2-cta">') !== -1);
ok('3.3 the repair is counted, so the balance check knows about it', res.ctaFixed === 1);
const sound = FIXTURE.replace('\nclass="u2-cta">', '\n<div class="u2-cta">');
const soundRes = hub.build(sound, LIVE);
ok('3.4 a body that is already sound is left alone', soundRes.ctaFixed === 0 && soundRes.problems.length === 0, soundRes.problems);
ok('3.5 the patched body is div-balanced', 
  (soundRes.body.match(/<div[\s>]/g) || []).length === (soundRes.body.match(/<\/div>/g) || []).length);
ok('3.6 the broken body ends up balanced too, which it was not before',
  (res.body.match(/<div[\s>]/g) || []).length === (res.body.match(/<\/div>/g) || []).length
  && (FIXTURE.match(/<div[\s>]/g) || []).length !== (FIXTURE.match(/<\/div>/g) || []).length);

section('4. what it refuses');
function refuses(name, fn) {
  try { fn(); ok(name, false, 'it did not refuse'); } catch (e) { ok(name, true); }
}
refuses('4.1 a rendered-page scrape with no stylesheet', () => hub.build(FIXTURE.replace('<style>', ''), LIVE));
refuses('4.2 a body with no lesson cards', () => hub.build(FIXTURE.replace(/u2-lesson-card/g, 'x-card'), LIVE));
refuses('4.3 a second patch over an already-patched body', () => hub.build(res.body, LIVE));
refuses('4.4 a body with no unambiguous anchor', () => hub.build(
  FIXTURE.replace('<div class="u2-learn">', '<div class="u2-x">')
    .replace('<div class="u2-resources">', '<div class="u2-y">')
    .replace('<nav class="u2-nav">', '<nav class="u2-z">'), LIVE));
refuses('4.5 an assumed handle set instead of a queried one', () => hub.build(FIXTURE, ['a-handle']));
refuses('4.6 two wrappers, so the unit is ambiguous', () => hub.build(`${FIXTURE}<div id="u3-hub"></div>`, LIVE));

// The checker is proved to work by being handed something bad, because a check
// that cannot fail is not a check.
section('4b. the second hub markup model');
// Unit 3's hub lists its lessons as topic rows rather than lesson cards. Both
// are live and both are legitimate; a parser that knew only the first would
// find nothing on that hub.
const U3 = '<style>\n.u3-topic-row { display:flex !important; }\n.u3-learn { padding: 24px !important; }\n</style>\n'
  + '<div id="u3-hub">\n<h2 class="u3-section-title">All 9 Lessons</h2>\n'
  + '<a class="u3-topic-row u3-topic-link" href="/pages/ap-csa-lesson-3-1-abstraction-and-program-design">\n'
  + '    <span class="u3-topic-num">3.1</span>\n'
  + '    <span class="u3-topic-name">Abstraction and Program Design</span>\n  </a>\n'
  + '<a class="u3-topic-row u3-topic-link" href="/pages/ap-csa-lesson-3-4-constructors">\n'
  + '    <span class="u3-topic-num">3.4</span>\n'
  + '    <span class="u3-topic-name">Constructors</span>\n  </a>\n'
  + '<div class="u3-learn">\n  <div class="u3-learn-title">What you will learn</div>\n</div>\n</div>\n';
const u3 = hub.build(U3, new Set(['ap-csa-lesson-3-4-constructors-exercise-1']));
ok('4b.1 topic rows are parsed as lessons', u3.lessons.length === 2, u3.lessons.length);
ok('4b.2 the ids and titles come off the row, not the handle',
  u3.lessons[0].id === '3.1' && u3.lessons[0].title === 'Abstraction and Program Design', u3.lessons[0]);
ok('4b.3 it patches clean with no problems', u3.problems.length === 0, u3.problems);
ok('4b.4 the one live exercise is linked and the rest are locked',
  u3.body.indexOf('/pages/ap-csa-lesson-3-4-constructors-exercise-1') !== -1
  && u3.body.indexOf('/pages/ap-csa-lesson-3-1-abstraction-and-program-design-exercise-1') === -1);

section('4c. a rendered scrape is refused, not patched');
// scripts/live-pages-dump.js recovers bodies from the storefront, where the
// broken CTA opener arrives entity-escaped. That body is safe to read and not
// safe to import.
refuses('4c.1 an entity-escaped CTA opener means a rendered page',
  () => hub.build(FIXTURE.replace('\nclass="u2-cta">', '\nclass="u2-cta"&gt;'), LIVE));

section('4d. dead lesson links');
// Six Unit 4 hub cards link handles no page carries any more. Relinking is only
// safe when the live set answers the question outright.
const DEAD = FIXTURE.replace('ap-csa-lesson-2-2-boolean-expressions', 'ap-csa-lesson-2-2-old-boolean-handle');
const withLesson = new Set([...LIVE, 'ap-csa-lesson-2-2-boolean-expressions']);
const fixed = hub.build(DEAD, withLesson);
ok('4d.1 the dead handle is relinked to the one live page for that lesson',
  fixed.relinked.length === 1 && fixed.relinked[0].to === 'ap-csa-lesson-2-2-boolean-expressions', fixed.relinked);
ok('4d.2 the dead handle is gone from the output',
  fixed.body.indexOf('ap-csa-lesson-2-2-old-boolean-handle') === -1);
ok('4d.3 relinking is not reported as a lost link', fixed.problems.length === 0, fixed.problems);
ok('4d.4 the exercise under a relinked lesson stops being locked for the wrong reason',
  fixed.body.indexOf('/pages/ap-csa-lesson-2-2-boolean-expressions-exercise-1') !== -1);
refuses('4d.5 two candidate pages for one lesson number', () => hub.build(
  DEAD, new Set([...withLesson, 'ap-csa-lesson-2-2-boolean-expressions-v2'])));
const noCand = hub.build(DEAD, LIVE);
ok('4d.6 no candidate means the link is left alone rather than invented',
  noCand.relinked.length === 0 && noCand.body.indexOf('ap-csa-lesson-2-2-old-boolean-handle') !== -1);

section('5. the checker itself fails when it should');
const lost = res.body.split('/pages/ap-csa-test-builder').join('/pages/gone');
ok('5.1 a disappeared link is caught',
  hub.check(FIXTURE, lost, 'u2', res.lessons, 1, []).some((p) => p.indexOf('disappeared') !== -1));
ok('5.2 a shrunken body is caught',
  hub.check(FIXTURE, '<div id="u2-hub"></div>', 'u2', res.lessons, 1, []).some((p) => p.indexOf('SMALLER') !== -1));
ok('5.3 an empty body is caught',
  hub.check(FIXTURE, '   ', 'u2', res.lessons, 1, []).some((p) => p.indexOf('empty') !== -1));
ok('5.4 a stray unbalanced div is caught',
  hub.check(FIXTURE, `${res.body}<div>`, 'u2', res.lessons, 1, []).some((p) => p.indexOf('div balance') !== -1));
ok('5.5 a link to a page that does not exist is caught',
  hub.check(FIXTURE, `${res.body}<a href="/pages/${unbuilt[0]}">x</a>`, 'u2', res.lessons, 1, [])
    .some((p) => p.indexOf('does not exist but is linked') !== -1));

section('6. the sheet');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csa-hub-'));
const bodyFile = path.join(tmp, 'unit2.html');
const handlesFile = path.join(tmp, 'handles.txt');
const outFile = path.join(tmp, 'hubs.csv');
fs.writeFileSync(bodyFile, FIXTURE);
fs.writeFileSync(handlesFile, `# queried 2026-08-24\n${[...LIVE].join('\n')}\n`);
execFileSync(process.execPath, [
  path.join(__dirname, '..', 'scripts', 'csa-hub-exercise-links.js'),
  '--handles', handlesFile, '--out', outFile, bodyFile,
], { stdio: 'pipe' });

// A real RFC 4180 reader. Deliberately NOT a split on commas: splitting is the
// bug this test exists to catch, so the test cannot be allowed to make it too.
function parseCsv(text) {
  const rows = []; let row = []; let field = ''; let inQuotes = false; let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { inQuotes = false; i += 1; continue; }
      field += c; i += 1; continue;
    }
    if (c === '"') { inQuotes = true; i += 1; continue; }
    if (c === ',') { row.push(field); field = ''; i += 1; continue; }
    if (c === '\r' && text[i + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ''; i += 2; continue; }
    field += c; i += 1;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const csv = fs.readFileSync(outFile, 'utf8').replace(/^﻿/, '');
const rows = parseCsv(csv);
ok('6.1 header plus one row', rows.length === 2, rows.length);
ok('6.2 the hub handle is resolved from lib/csa-exercise-pages', rows[1][0] === 'ap-csa-unit-2-course', rows[1][0]);
ok('6.3 MERGE, never REPLACE', rows[1][1] === 'MERGE', rows[1][1]);
ok('6.4 the body survives the round trip byte for byte', rows[1][2] === res.body);
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
