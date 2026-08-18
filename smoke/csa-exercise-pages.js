'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the 53 AP CSA exercise pages, their bank, and the grading modes.
//
//  WHAT IS BEING PROTECTED
//  Five failures, each of which is silent until it is expensive:
//
//  1. AN ANSWER ON THE PAGE. These pages carry a code editor and are graded
//     against hidden cases. A page that shipped its reference solution, a hidden
//     case, or (for a write-the-class exercise) its grading harness would award
//     full marks to anyone who opened View Source, and would look exactly like a
//     working exercise from every other angle. The leak check is asserted here
//     AND proved to work by feeding it a deliberate leak: a check that cannot
//     fail is not a check.
//
//  2. THE SEGMENT PATH CHANGING. Moving assembly into lib/csa-code-modes.js
//     touched the code that grades the EXISTING bank. Segment assembly is
//     pinned byte for byte against the exact string routes/student.js used to
//     produce, so the two new modes cannot have cost the old one anything.
//
//  3. THE public MODIFIER STRIP. Judge0 compiles to Main.java, so a student's
//     `public class Dog` is a compile error through no fault of theirs, and the
//     assembler removes the modifier. That transformation runs over real student
//     source, so getting it wrong corrupts a correct submission. It is checked
//     against strings, comments, nested classes and the entry class.
//
//  4. THE HANDLE ROUTING. An exercise handle has to parse back to
//     activity_type exercise-1 on its own lesson, or a graded submission lands
//     in the wrong gradebook column or none at all.
//
//  5. THE CSV ITSELF. The sheet is read only by Matrixify, which reports success
//     on a sheet that silently truncated a body at the first stray quote, and
//     these bodies are full of Java source. So it is generated and PARSED BACK
//     with a real RFC 4180 reader and every body compared byte for byte.
//
//  WHAT THIS SUITE DOES NOT DO
//  It does not verify the 268 expected outputs against a real JVM. That is
//  scripts/verify-csa-exercises.js, which compiles and runs every reference
//  solution and takes minutes, and it is the authoring gate rather than the CI
//  gate. What runs here when a JDK happens to be present is a THREE exercise
//  spot check that proves the same pipeline end to end in seconds, including
//  that a hardcoded output loses. With no JDK those checks skip and say so.
//
//  Zero PII: author content only. No em-dashes, per repo convention.
//
//  Run: npm run smoke:csax1
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const { allPages, esc } = require('../lib/csa-exercise-pages');
const { checkNoLeak, PUBLISHED_AT } = require('../scripts/csa-exercise-pages-csv');
const codeModes = require('../lib/csa-code-modes');
const exercises = require('../seed/csa-exercises');
const { COURSES, pageFromHandle } = require('../utils');
const { manifest } = require('../seed/csa-course-manifest');

let pass = 0, fail = 0, skipped = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function skip(name, why) { skipped++; console.log(`  [SKIP] ${name}  -> ${why}`); }
function section(t) { console.log(`\n${t}`); }

// A real RFC 4180 reader. Deliberately NOT a split on commas: splitting is the
// bug this test exists to catch, so the test cannot be allowed to make it too.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false, i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r' && text[i + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ''; i += 2; continue; }
    if (c === '\n' || c === '\r') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const pages = allPages();
const bank = exercises.all();
const byLesson = new Map(bank.map((x) => [x.lesson, x]));
const expected = require(exercises.EXPECTED_FILE).cases;
const CSA = COURSES['ap-csa'].units;
const ALL_LESSONS = Object.values(CSA).flatMap((u) => u.lessons);

// ── 1. COVERAGE ──────────────────────────────────────────────────────────────
section('1. Coverage against the course config');
ok('1.1 one exercise page per CSA lesson', pages.length === ALL_LESSONS.length,
  { built: pages.length, lessons: ALL_LESSONS.length });
ok('1.2 all 53 lessons of the four-unit CED are covered',
  ALL_LESSONS.every((l) => pages.some((p) => p.lesson === l)),
  ALL_LESSONS.filter((l) => !pages.some((p) => p.lesson === l)));
ok('1.3 no page claims a lesson the course config does not have',
  pages.every((p) => ALL_LESSONS.includes(p.lesson)),
  pages.filter((p) => !ALL_LESSONS.includes(p.lesson)).map((p) => p.lesson));
ok('1.4 handles are unique across the whole build',
  new Set(pages.map((p) => p.handle)).size === pages.length);
// The column has to be declared or a perfectly recorded grade renders nowhere.
ok('1.5 every unit declares exercise-1 in COURSES',
  Object.values(CSA).every((u) => u.activities.includes('exercise-1')),
  Object.entries(CSA).filter(([, u]) => !u.activities.includes('exercise-1')).map(([k]) => k));
// And the column has to have an authored denominator or code-grade 400s.
const denomLessons = new Set(manifest
  .filter((m) => m.course === 'ap-csa' && m.denominators['exercise-1'] != null)
  .map((m) => m.lesson));
ok('1.6 every lesson has an authored exercise-1 denominator to grade against',
  ALL_LESSONS.every((l) => denomLessons.has(l)),
  ALL_LESSONS.filter((l) => !denomLessons.has(l)));
ok('1.7 the unit each exercise claims matches the course config',
  pages.every((p) => CSA[p.unit] && CSA[p.unit].lessons.includes(p.lesson)),
  pages.filter((p) => !CSA[p.unit] || !CSA[p.unit].lessons.includes(p.lesson)).map((p) => p.handle));

// ── 2. HANDLE ROUTING ────────────────────────────────────────────────────────
section('2. Handle routing');
const misrouted = pages.map((p) => [p.handle, pageFromHandle(p.handle), p])
  .filter(([, r, p]) => !r || r.course !== 'ap-csa' || r.unit !== p.unit
    || r.lesson !== p.lesson || r.activity_type !== 'exercise-1');
ok('2.1 all 53 handles route to exercise-1 on their own lesson', misrouted.length === 0,
  misrouted.slice(0, 5).map(([h, r]) => [h, r]));
// The lesson page a Back link points at has to be a real page, not a guess.
ok('2.2 every Back link points at a handle that routes to the same lesson as a visit',
  pages.every((p) => {
    const r = pageFromHandle(p.lessonHandle);
    return r && r.course === 'ap-csa' && r.lesson === p.lesson && r.activity_type === 'lesson';
  }),
  pages.filter((p) => {
    const r = pageFromHandle(p.lessonHandle);
    return !r || r.activity_type !== 'lesson' || r.lesson !== p.lesson;
  }).map((p) => p.lessonHandle));

// ── 3. THE PAGE CONTRACT ─────────────────────────────────────────────────────
section('3. The page contract');
ok('3.1 every page carries the wrapper the grade call reads context from',
  pages.every((p) => new RegExp(`<div id="csa-x1" class="lesson-page" data-course="ap-csa" data-unit="${p.unit}" data-lesson="${p.lesson}"`).test(p.bodyHtml)));
ok('3.2 every page declares activity exercise-1 on the wrapper',
  pages.every((p) => p.bodyHtml.includes('data-activity="exercise-1"')));
ok('3.3 the mode on the page matches the mode in the bank',
  pages.every((p) => p.bodyHtml.includes(`data-mode="${byLesson.get(p.lesson).mode}"`)));
ok('3.4 every page has an editor, a Run target and a grade target',
  pages.every((p) => p.bodyHtml.includes('id="x1-code"')
    && p.bodyHtml.includes('/api/judge0/run')
    && p.bodyHtml.includes('/api/student/code-grade')));
ok('3.5 the starter is recoverable, so Reset cannot leave a student with nothing',
  pages.every((p) => (p.bodyHtml.match(/id="x1-starter"/g) || []).length === 1));
// Java source in an attribute is decoded back to a literal quote on Shopify save
// and breaks the attribute. It only ever goes in textarea text content.
ok('3.6 no attribute value carries an encoded double quote',
  pages.every((p) => !/="[^"]*&quot;/.test(p.bodyHtml)));
ok('3.7 no HTML entity appears inside a script block',
  pages.every((p) => (p.bodyHtml.match(/<script[\s\S]*?<\/script>/g) || [])
    .every((s) => !/&(?:amp|quot|lt|gt|#\d+);/.test(s))));
ok('3.8 every body is pure ASCII',
  // eslint-disable-next-line no-control-regex
  pages.every((p) => !/[^\x09\x0A\x0D\x20-\x7E]/.test(p.bodyHtml)));
ok('3.9 exactly one h1 per page',
  pages.every((p) => (p.bodyHtml.match(/<h1[\s>]/g) || []).length === 1));
ok('3.10 every driver page publishes the API its hidden harness will call',
  pages.filter((p) => p.mode === 'driver')
    .every((p) => byLesson.get(p.lesson).api.every((sig) => p.bodyHtml.includes(esc(sig)))));

// ── 4. NO ANSWER ON THE PAGE ─────────────────────────────────────────────────
section('4. No answer on the page');
const leaks = [];
for (const p of pages) {
  for (const c of checkNoLeak(p, byLesson.get(p.lesson), expected)) leaks.push(`${p.handle}: ${c}`);
}
ok('4.1 no page leaks a solution, a hidden case or a grading harness', leaks.length === 0, leaks.slice(0, 6));
ok('4.2 no page renders more sample cases than the bank has visible ones',
  pages.every((p) => (p.bodyHtml.match(/<div class="sample">/g) || []).length
    === byLesson.get(p.lesson).cases.filter((c) => !c.hidden).length));

// The check that proves the check. A leak detector that cannot fail is decoration,
// so a real leak is built and fed to it.
const victim = pages.find((p) => byLesson.get(p.lesson).mode === 'program');
const victimBank = byLesson.get(victim.lesson);
const leaked = Object.assign({}, victim, {
  bodyHtml: victim.bodyHtml + '\n<pre>' + esc(victimBank.reference) + '</pre>',
});
ok('4.3 the leak check catches a reference solution pasted into a body',
  checkNoLeak(leaked, victimBank, expected).some((m) => m.includes('reference solution')),
  checkNoLeak(leaked, victimBank, expected));

const hiddenAt = victimBank.cases.findIndex((c) => c.hidden);
const leaked2 = Object.assign({}, victim, {
  bodyHtml: victim.bodyHtml
    + '\n<pre>' + esc(String(victimBank.cases[hiddenAt].stdin).trim()) + '</pre>'
    + '\n<pre>' + esc(String(expected[exercises.caseKey(victim.lesson, hiddenAt)]).trim()) + '</pre>',
});
ok('4.4 the leak check catches a hidden case pasted into a body',
  checkNoLeak(leaked2, victimBank, expected).some((m) => m.includes('hidden case')),
  checkNoLeak(leaked2, victimBank, expected));

const driverPage = pages.find((p) => p.mode === 'driver');
const driverBank = byLesson.get(driverPage.lesson);
const leaked3 = Object.assign({}, driverPage, {
  bodyHtml: driverPage.bodyHtml + '\n<pre>' + esc(driverBank.harness) + '</pre>',
});
ok('4.5 the leak check catches a grading harness pasted into a body',
  checkNoLeak(leaked3, driverBank, expected).some((m) => m.includes('grading harness')),
  checkNoLeak(leaked3, driverBank, expected));

// ── 5. THE BANK ──────────────────────────────────────────────────────────────
section('5. The test bank');
ok('5.1 every exercise has at least four cases', bank.every((x) => x.cases.length >= 4),
  bank.filter((x) => x.cases.length < 4).map((x) => x.lesson));
ok('5.2 every exercise has a hidden case whose input no visible case shares',
  bank.every((x) => {
    const seen = new Set(x.cases.filter((c) => !c.hidden).map((c) => String(c.stdin || '')));
    return x.cases.some((c) => c.hidden && !seen.has(String(c.stdin || '')));
  }),
  bank.filter((x) => {
    const seen = new Set(x.cases.filter((c) => !c.hidden).map((c) => String(c.stdin || '')));
    return !x.cases.some((c) => c.hidden && !seen.has(String(c.stdin || '')));
  }).map((x) => x.lesson));
ok('5.3 every case has a verified expected output on file',
  bank.every((x) => x.cases.every((c, i) => exercises.caseKey(x.lesson, i) in expected)),
  bank.filter((x) => x.cases.some((c, i) => !(exercises.caseKey(x.lesson, i) in expected))).map((x) => x.lesson));
ok('5.4 the generated key holds nothing that is no longer a case',
  Object.keys(expected).every((k) => {
    const lesson = k.split('|')[0];
    const seq = Number(k.split('|')[2]);
    const x = byLesson.get(lesson);
    return x && seq < x.cases.length;
  }),
  Object.keys(expected).filter((k) => {
    const x = byLesson.get(k.split('|')[0]);
    return !x || Number(k.split('|')[2]) >= x.cases.length;
  }));
// If every case prints the same thing, no hidden case can tell a real answer
// from a printed constant, whatever the hidden flags say.
ok('5.5 no exercise prints the same output for every case',
  bank.every((x) => new Set(x.cases.map((c, i) => expected[exercises.caseKey(x.lesson, i)])).size > 1),
  bank.filter((x) => new Set(x.cases.map((c, i) => expected[exercises.caseKey(x.lesson, i)])).size === 1)
    .map((x) => x.lesson));
ok('5.6 the seeder produces one item per lesson, all keyed to exercise-1',
  (() => {
    const items = exercises.codeTestItems().items;
    return items.length === bank.length
      && items.every((it) => it.course === 'ap-csa' && it.item === 'exercise-1');
  })());
ok('5.7 every driver case carries the harness and every program case carries none',
  exercises.codeTestItems().items.every((it) => {
    const x = byLesson.get(it.lesson);
    return it.cases.every((c) => (x.mode === 'driver' ? !!c.postlude.trim() : c.postlude === ''));
  }));

// ── 6. THE ASSEMBLER ─────────────────────────────────────────────────────────
section('6. Assembly, including the path that already existed');
// Pinned against the literal routes/student.js used to build before the move.
// This is the whole safety argument for touching that file.
ok('6.1 segment assembly is byte identical to what it was before the refactor',
  codeModes.assemble('segment', 62, 'System.out.println(a + b);', { prelude: 'int a = 1;\nint b = 2;', postlude: '' })
  === 'public class Main {\n  public static void main(String[] args) {\nint a = 1;\nint b = 2;\nSystem.out.println(a + b);\n  }\n}\n');
ok('6.2 a segment case with a postlude still wraps it inside main',
  codeModes.assemble('segment', 62, 'x();', { prelude: 'int p = 1;', postlude: 'end();' })
  === 'public class Main {\n  public static void main(String[] args) {\nint p = 1;\nx();\nend();\n  }\n}\n');
ok('6.3 a non-Java segment is concatenated with no class ceremony',
  codeModes.assemble('segment', 71, 'print(a)', { prelude: 'a = 1', postlude: '' }) === 'a = 1\nprint(a)\n');

ok('6.4 program mode runs the student file as written',
  codeModes.assemble('program', 62, 'public class Main { public static void main(String[] a) {} }', {})
  === 'public class Main { public static void main(String[] a) {} }\n');
ok('6.5 program mode drops public from a helper class so Main.java compiles',
  codeModes.assemble('program', 62, 'public class Dog {}\npublic class Main {}', {})
  === 'class Dog {}\npublic class Main {}\n');
ok('6.6 the entry class keeps its public modifier',
  codeModes.assemble('program', 62, 'public class Main {}', {}) === 'public class Main {}\n');
// The strip runs over real student source, so it has to be blind to anything
// that only LOOKS like a modifier.
ok('6.7 the word public inside a string literal is untouched',
  codeModes.stripTopLevelPublic('class A { void f() { String s = "public class B"; } }', null)
  === 'class A { void f() { String s = "public class B"; } }');
ok('6.8 the word public inside a comment is untouched',
  codeModes.stripTopLevelPublic('// public class B\nclass A {}', null) === '// public class B\nclass A {}');
ok('6.9 a public member INSIDE a class keeps its modifier',
  codeModes.stripTopLevelPublic('public class Dog {\n  public int age;\n  public int get() { return age; }\n}', null)
  === 'class Dog {\n  public int age;\n  public int get() { return age; }\n}');
ok('6.10 driver assembly puts the student first and the harness after it',
  (() => {
    const out = codeModes.assemble('driver', 62, 'public class Dog {}', { postlude: 'public class Main {}' });
    return out.indexOf('class Dog') < out.indexOf('public class Main') && !out.includes('public class Dog');
  })());
// Java demands every import at the top, and in driver mode the harness is
// appended after the student's classes. Without hoisting nothing compiles, and
// the student would be shown a compile error they did not cause.
ok('6.11 driver assembly lifts the harness imports above the student classes',
  (() => {
    const out = codeModes.assemble('driver', 62, 'class Dog {}',
      { postlude: 'import java.util.Scanner;\npublic class Main {}' });
    return out.indexOf('import java.util.Scanner;') < out.indexOf('class Dog');
  })());
ok('6.12 an import the student and the harness share is emitted once',
  (() => {
    const out = codeModes.assemble('driver', 62, 'import java.util.ArrayList;\nclass Dog {}',
      { postlude: 'import java.util.ArrayList;\npublic class Main {}' });
    return (out.match(/import java\.util\.ArrayList;/g) || []).length === 1;
  })());

section('7. What a student is told before a run is spent');
ok('7.1 a program submission with no Main is refused with a sentence, not a stack trace',
  (() => {
    const m = codeModes.validateSource('program', 62, 'class Helper {}');
    return typeof m === 'string' && m.includes('class named Main');
  })());
ok('7.2 a program submission with Main but no main method is named exactly',
  (() => {
    const m = codeModes.validateSource('program', 62, 'public class Main { }');
    return typeof m === 'string' && m.includes('no main method');
  })());
ok('7.3 a correct program submission is not refused',
  codeModes.validateSource('program', 62, 'public class Main { public static void main(String[] a) {} }') === null);
ok('7.4 a driver submission that declares Main is refused, because the harness owns it',
  (() => {
    const m = codeModes.validateSource('driver', 62, 'class Main {}');
    return typeof m === 'string' && m.includes('not Main');
  })());
ok('7.5 a driver submission with no class at all is refused',
  typeof codeModes.validateSource('driver', 62, 'int x = 1;') === 'string');
ok('7.6 a correct driver submission is not refused',
  codeModes.validateSource('driver', 62, 'class Duration { }') === null);
ok('7.7 an unknown mode resolves to null rather than throwing on a live request',
  codeModes.normalizeMode('nonsense') === null && codeModes.normalizeMode('') === 'segment'
  && codeModes.normalizeMode(null) === 'segment');

// ── 8. THE CSV ───────────────────────────────────────────────────────────────
section('8. The Matrixify sheet survives a round trip');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csa-x1-csv-'));
const csvPath = path.join(tmp, 'x1.csv');
let csvRan = false;
try {
  execFileSync('node', [path.join(__dirname, '..', 'scripts', 'csa-exercise-pages-csv.js'), csvPath],
    { stdio: ['ignore', 'ignore', 'pipe'] });
  csvRan = true;
} catch (e) {
  ok('8.0 the sheet builds', false, String(e.stderr || e).slice(0, 400));
}

if (csvRan) {
  const raw = fs.readFileSync(csvPath, 'utf8');
  ok('8.1 the BOM is written', raw.charCodeAt(0) === 0xFEFF);
  const rows = parseCsv(raw.replace(/^﻿/, ''));
  const header = rows[0];
  const body = rows.slice(1).filter((r) => r.length > 1);
  ok('8.2 one row per page', body.length === pages.length, { rows: body.length, pages: pages.length });
  const col = (name) => header.indexOf(name);
  ok('8.3 the expected columns are present',
    ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At', 'SEO Title', 'SEO Description']
      .every((h) => col(h) !== -1), header);
  ok('8.4 every row is MERGE, so a re-run repairs rather than duplicates',
    body.every((r) => r[col('Command')] === 'MERGE'));
  ok('8.5 Published At is the fixed past date, never a drifting now()',
    body.every((r) => r[col('Published At')] === PUBLISHED_AT));
  // An empty Body HTML cell WIPES the live page, and Matrixify reports that as
  // a successful import. It is the single most destructive thing this sheet
  // could contain.
  ok('8.6 no Body HTML cell is empty', body.every((r) => (r[col('Body HTML')] || '').length > 1000));
  const parsedByHandle = new Map(body.map((r) => [r[col('Handle')], r]));
  const mismatched = pages.filter((p) => {
    const r = parsedByHandle.get(p.handle);
    return !r || r[col('Body HTML')] !== p.bodyHtml;
  });
  ok('8.7 every body survives the round trip byte for byte', mismatched.length === 0,
    mismatched.slice(0, 3).map((p) => p.handle));
  ok('8.8 titles and SEO fields survive the round trip',
    pages.every((p) => {
      const r = parsedByHandle.get(p.handle);
      return r && r[col('Title')] === p.title && r[col('SEO Title')] === p.seoTitle
        && r[col('SEO Description')] === p.seoDescription;
    }));
}
fs.rmSync(tmp, { recursive: true, force: true });

// ── 9. SPOT CHECK AGAINST A REAL JVM ─────────────────────────────────────────
section('9. Spot check against a real javac and java');
function haveJdk() {
  try {
    execFileSync('javac', ['-version'], { stdio: 'ignore' });
    execFileSync('java', ['-version'], { stdio: 'ignore' });
    return true;
  } catch (_) { return false; }
}

function normalize(s) {
  return String(s == null ? '' : s).replace(/\r\n/g, '\n')
    .split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n+$/, '');
}

function runProgram(source, stdin) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'csa-x1-run-'));
  try {
    fs.writeFileSync(path.join(dir, 'Main.java'), source);
    const c = spawnSync('javac', ['-nowarn', 'Main.java'], { cwd: dir, encoding: 'utf8', timeout: 30000 });
    if (c.status !== 0) return { compiled: false, stdout: '' };
    const r = spawnSync('java', ['-XX:-UsePerfData', 'Main'],
      { cwd: dir, encoding: 'utf8', input: String(stdin || ''), timeout: 30000 });
    return { compiled: true, stdout: r.stdout || '', ok: r.status === 0 };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

if (!haveJdk()) {
  skip('9.x the three exercise spot check', 'no javac/java on PATH; run scripts/verify-csa-exercises.js where there is one');
} else {
  // One program exercise, one driver exercise, and the cheat that this whole
  // design exists to defeat.
  const sample = [
    bank.find((x) => x.mode === 'program' && x.lesson === '1.3'),
    bank.find((x) => x.mode === 'driver' && x.lesson === '3.4'),
    bank.find((x) => x.mode === 'program' && x.lesson === '4.16'),
  ].filter(Boolean);

  for (const x of sample) {
    const source = codeModes.assemble(x.mode, 62, x.reference, { postlude: x.mode === 'driver' ? x.harness : '' });
    const results = x.cases.map((c, i) => {
      const r = runProgram(source, c.stdin);
      return r.compiled && normalize(r.stdout) === normalize(expected[exercises.caseKey(x.lesson, i)]);
    });
    ok(`9.1 ${x.lesson} (${x.mode}): the reference solution passes every stored case`,
      results.every(Boolean), results);
  }

  const cheatTarget = sample.find((x) => x.mode === 'program');
  const firstVisible = cheatTarget.cases.findIndex((c) => !c.hidden);
  const shown = expected[exercises.caseKey(cheatTarget.lesson, firstVisible)];
  const cheat = 'public class Main {\n  public static void main(String[] args) {\n'
    + '    System.out.print(' + JSON.stringify(String(shown)) + ');\n  }\n}\n';
  const beaten = cheatTarget.cases.some((c, i) => {
    if (!c.hidden) return false;
    const r = runProgram(cheat, c.stdin);
    return !(r.compiled && normalize(r.stdout) === normalize(expected[exercises.caseKey(cheatTarget.lesson, i)]));
  });
  ok(`9.2 ${cheatTarget.lesson}: printing the sample output fails a hidden case`, beaten);

  // The transformation the assembler applies to real student source has to
  // produce something that actually compiles, not just something that reads well.
  const student = 'public class Dog {\n  private int age;\n  public Dog(int age) { this.age = age; }\n'
    + '  public int getAge() { return age; }\n}';
  const harness = 'import java.util.Scanner;\npublic class Main {\n'
    + '  public static void main(String[] args) {\n'
    + '    Scanner in = new Scanner(System.in);\n'
    + '    System.out.println(new Dog(in.nextInt()).getAge());\n  }\n}';
  const built = runProgram(codeModes.assemble('driver', 62, student, { postlude: harness }), '7\n');
  ok('9.3 a public student class plus an importing harness compiles and runs',
    built.compiled && normalize(built.stdout) === '7', built);
}

console.log(`\n${pass} passed, ${fail} failed${skipped ? `, ${skipped} skipped` : ''}\n`);
process.exit(fail ? 1 : 0);
