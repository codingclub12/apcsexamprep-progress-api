'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  INTRO TO JAVA EXERCISE BANK - offline checks.
//
//  This does NOT re-run javac. scripts/verify-intro-java-exercises.js does that
//  and is the only thing allowed to produce an expected output, because a hand
//  written one is a guess. What runs here is everything that can be checked
//  without a JDK, plus the one check that matters most:
//
//    THE GENERATED FILE IS IN STEP WITH THE BANK.
//
//  An exercise edited without re-running the verifier leaves expected outputs
//  describing code that no longer exists, and the grader would mark students
//  against the old answer. That drift is silent, survives review, and is exactly
//  what this file exists to make loud.
//
//  Zero PII: author content only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:ijexercises
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const { EXERCISES, BY_LESSON, NO_EXERCISE, itemId } = require('../seed/intro-java-exercises');
const { traceCase, expandCase } = require('../lib/greenfoot-stub');
const { BANKS } = require('../seed/intro-java-banks');
const manifest = require('../scripts/seed-manifest');

let pass = 0;
let fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

const EXPECTED_PATH = path.join(__dirname, '..', 'seed', 'intro-java-expected.generated.json');

// ── 1. Every exercise sits on a lesson that exists ───────────────────────────
section('1. Exercises line up with the course');

const lessons = new Map();
for (const b of BANKS) for (const l of b.lessons) lessons.set(l.lesson, b.unit);

const orphans = EXERCISES.filter((e) => !lessons.has(e.lesson)).map((e) => e.lesson);
ok('1.1 every exercise names a lesson that exists in a bank', orphans.length === 0, orphans);

const wrongUnit = EXERCISES.filter((e) => lessons.get(e.lesson) !== e.unit)
  .map((e) => `${e.lesson}: says ${e.unit}, bank says ${lessons.get(e.lesson)}`);
ok('1.2 every exercise agrees with its bank about which unit it is in',
  wrongUnit.length === 0, wrongUnit);

const dupes = EXERCISES.map((e) => e.lesson).filter((l, i, a) => a.indexOf(l) !== i);
ok('1.3 no lesson has two exercises', dupes.length === 0, dupes);

// A lesson in Units 1 or 2 either has an exercise or is named in NO_EXERCISE
// with a reason. Silence is not an option: it is how a lesson gets forgotten.
const covered = new Set(EXERCISES.map((e) => e.lesson));
const unaccounted = [];
for (const b of BANKS.slice(0, 2)) {
  for (const l of b.lessons) {
    if (!covered.has(l.lesson) && !NO_EXERCISE[l.lesson]) unaccounted.push(l.lesson);
  }
}
ok('1.4 every Unit 1 and Unit 2 lesson either has an exercise or a written reason it does not',
  unaccounted.length === 0, unaccounted);

const bogusSkip = Object.keys(NO_EXERCISE).filter((l) => covered.has(l));
ok('1.5 no lesson is listed as skipped AND given an exercise', bogusSkip.length === 0, bogusSkip);

// ── 2. Each exercise is well formed ──────────────────────────────────────────
section('2. Each exercise carries what the grader and the page both need');

const required = ['lesson', 'unit', 'name', 'base', 'brief', 'task', 'starter', 'reference', 'cases'];
const missing = [];
for (const e of EXERCISES) {
  for (const k of required) {
    if (e[k] === undefined || e[k] === null || e[k] === '') missing.push(`${e.lesson}.${k}`);
  }
}
ok('2.1 no exercise is missing a required field', missing.length === 0, missing);

const thinCases = EXERCISES.filter((e) => e.cases.length < 3).map((e) => e.lesson);
ok('2.2 every exercise has at least three cases', thinCases.length === 0, thinCases);

const noHidden = EXERCISES.filter((e) => !e.cases.some((c) => c.hidden)).map((e) => e.lesson);
ok('2.3 every exercise has at least one hidden case', noHidden.length === 0, noHidden);

const noVisible = EXERCISES.filter((e) => !e.cases.some((c) => !c.hidden)).map((e) => e.lesson);
ok('2.4 every exercise has at least one VISIBLE case, or the page shows nothing',
  noVisible.length === 0, noVisible);

const sameSetup = [];
for (const e of EXERCISES) {
  const seen = new Set();
  for (const c of e.cases) {
    if (seen.has(c.setup)) sameSetup.push(e.lesson);
    seen.add(c.setup);
  }
}
ok('2.5 no exercise runs the same setup twice', sameSetup.length === 0, sameSetup);

// A hidden case whose setup matches a visible one hides nothing.
const hiddenIsVisible = [];
for (const e of EXERCISES) {
  const vis = new Set(e.cases.filter((c) => !c.hidden).map((c) => c.setup));
  if (e.cases.some((c) => c.hidden && vis.has(c.setup))) hiddenIsVisible.push(e.lesson);
}
ok('2.6 no hidden case duplicates a visible one', hiddenIsVisible.length === 0, hiddenIsVisible);

const starterIsAnswer = EXERCISES
  .filter((e) => e.starter.replace(/\s+/g, '') === e.reference.replace(/\s+/g, ''))
  .map((e) => e.lesson);
ok('2.7 the starter is never the reference', starterIsAnswer.length === 0, starterIsAnswer);

// The signature has to be in the starter, because the student cannot be asked to
// write a method two units before methods are taught. That is the design.
//
// It matches a METHOD signature specifically, meaning a line ending in a closing
// bracket. Matching any declaration instead picks up `int coins = 0;` in the 2.1
// exercise, which is a field the student is supposed to write, and then reports
// about the wrong line entirely.
const noSig = EXERCISES.filter((e) => {
  const sig = (e.reference.match(/^\s*public [^\n]*\)\s*$/m) || [])[0];
  return !sig || !e.starter.includes(sig.trim());
}).map((e) => e.lesson);
ok('2.8 every starter already contains the signature the reference declares',
  noSig.length === 0, noSig);

const badBase = EXERCISES.filter((e) => !['actor', 'world', 'plain'].includes(e.base))
  .map((e) => `${e.lesson}: ${e.base}`);
ok('2.9 every exercise names a harness base the stub knows', badBase.length === 0, badBase);

// ── 3. The generated expected outputs are in step with the bank ──────────────
section('3. Expected outputs match the bank they were generated from');

ok('3.1 the generated file exists', fs.existsSync(EXPECTED_PATH));

if (fs.existsSync(EXPECTED_PATH)) {
  const gen = JSON.parse(fs.readFileSync(EXPECTED_PATH, 'utf8'));
  const keys = Object.keys(gen);

  ok('3.2 it has an entry per exercise', keys.length === EXERCISES.length,
    { generated: keys.length, exercises: EXERCISES.length });

  const missingEntry = EXERCISES
    .filter((e) => !gen[`${e.lesson}:${itemId(e.lesson)}`])
    .map((e) => e.lesson);
  ok('3.3 every exercise has an entry', missingEntry.length === 0, missingEntry);

  // The count check that catches the common edit: a case added or removed and
  // the verifier never re-run.
  const countMismatch = [];
  for (const e of EXERCISES) {
    const g = gen[`${e.lesson}:${itemId(e.lesson)}`];
    if (g && g.expected.length !== e.cases.length) {
      countMismatch.push(`${e.lesson}: ${g.expected.length} expected, ${e.cases.length} cases`);
    }
  }
  ok('3.4 every exercise has exactly as many expected outputs as it has cases',
    countMismatch.length === 0, countMismatch);

  const stray = keys.filter((k) => !EXERCISES.some((e) => `${e.lesson}:${itemId(e.lesson)}` === k));
  ok('3.5 no expected entry survives for an exercise that was deleted',
    stray.length === 0, stray);

  const empty = keys.filter((k) => gen[k].expected.some((o) => !o || !o.length));
  ok('3.6 no case produced empty output, which would mean it asserts nothing',
    empty.length === 0, empty);

  // If two cases print the same thing, one of them is not pulling its weight.
  // Not a failure everywhere, but a hidden case identical to a visible one is.
  const uselessHidden = [];
  for (const e of EXERCISES) {
    const g = gen[`${e.lesson}:${itemId(e.lesson)}`];
    if (!g) continue;
    const visOut = new Set(e.cases.map((c, i) => (c.hidden ? null : g.expected[i])).filter(Boolean));
    e.cases.forEach((c, i) => {
      if (c.hidden && visOut.has(g.expected[i])) {
        uselessHidden.push(`${e.lesson} case ${i} prints the same as a visible case`);
      }
    });
  }
  ok('3.7 no hidden case prints exactly what a visible case prints',
    uselessHidden.length === 0, uselessHidden);
}

// ── 4. The Run scenes build ──────────────────────────────────────────────────
section('4. Run scenes are well formed');

const sceneErrors = [];
let scened = 0;
for (const e of EXERCISES) {
  if (!e.scene) continue;
  scened++;
  try {
    traceCase(Object.assign({}, e.scene, {
      helpers: e.helpers || '',
      base: e.base,
    }));
  } catch (err) {
    sceneErrors.push(`${e.lesson}: ${err.message}`);
  }
}
ok('4.1 every Run scene builds without throwing', sceneErrors.length === 0, sceneErrors);
ok('4.2 the exercises that move something have a scene', scened >= 5, scened);

// A scene naming an actor type its helpers do not declare will not compile, and
// the compile happens inside Judge0 where a student reads the error.
const undeclared = [];
for (const e of EXERCISES) {
  if (!e.scene) continue;
  const helpers = e.helpers || '';
  for (const a of e.scene.actors) {
    if (a.type === 'Harness') continue;
    if (!new RegExp(`class\\s+${a.type}\\b`).test(helpers)) {
      undeclared.push(`${e.lesson}: scene uses ${a.type}, helpers do not declare it`);
    }
  }
}
ok('4.3 every scene actor type is declared by that scene\'s helpers',
  undeclared.length === 0, undeclared);

// Same for the graded cases: a case referring to a class the helpers do not
// declare fails to compile for every student.
const caseUndeclared = [];
for (const e of EXERCISES) {
  for (let i = 0; i < e.cases.length; i++) {
    for (const m of e.cases[i].setup.match(/new ([A-Z][A-Za-z0-9_]*)\(/g) || []) {
      const type = m.slice(4, -1);
      if (type === 'Harness' || type === 'World') continue;
      if (!new RegExp(`class\\s+${type}\\b`).test(e.helpers || '')) {
        caseUndeclared.push(`${e.lesson} case ${i}: uses ${type}, helpers do not declare it`);
      }
    }
  }
}
ok('4.4 every class a graded case constructs is declared in that exercise\'s helpers',
  caseUndeclared.length === 0, caseUndeclared);

// ── 5. Assembly goes through the shared path ─────────────────────────────────
section('5. A graded case assembles through the audited path');

const assembleErrors = [];
for (const e of EXERCISES) {
  try {
    const out = expandCase({
      prelude: `// @greenfoot-stub ${e.base}\n${e.helpers || ''}`,
      postlude: `    ${e.cases[0].setup}`,
    });
    if (!out.prelude.includes('class Harness')) assembleErrors.push(`${e.lesson}: no harness`);
    if (/GreenfootTrace\s*\.\s*record/.test(out.postlude)) {
      assembleErrors.push(`${e.lesson}: a GRADED case records a trace, which would break grading`);
    }
  } catch (err) {
    assembleErrors.push(`${e.lesson}: ${err.message}`);
  }
}
ok('5.1 every exercise expands into a harness, and none records a trace',
  assembleErrors.length === 0, assembleErrors);

// ── 6. The denominator gate ──────────────────────────────────────────────────
section('6. Denominators exist but stay shut until the pages do');

const rows = manifest.introJavaExerciseRows();
ok('6.1 there is one manifest row per exercise', rows.length === EXERCISES.length,
  { rows: rows.length, exercises: EXERCISES.length });
ok('6.2 every row is worth one point', rows.every((r) => r.points === 1));
// 'code', not 'exercise'. docs/intro-java-course-spec.md specified this item
// before it was built, and the rest of the system already reads that name:
// utils.js has 'code' in ACTIVITY_TOKENS and Units 2 to 6 already declared a
// code activity. Inventing a parallel 'exercise' type would have left the
// gradebook with a column nothing renders.
ok('6.3 every row is typed `code`, the name the rest of the system already uses',
  rows.every((r) => r.item_type === 'code'));

// The trailing -1 is load bearing. routes/student.js buckets a student's own
// progress view with /-code-\d+$/, so an id ending plain `-code` would show up
// on their page as a concept check rather than a code exercise.
ok('6.4 item ids match the spec, including the -1 the student view buckets on',
  rows.every((r) => r.item_id === `${r.lesson_id}-code-1`
    && /-code-\d+$/.test(r.item_id)));

// The gradebook only renders a column an activity list declares. Unit 1 used to
// omit `code` because no Unit 1 lesson had one; three do now.
const { COURSES } = require('../utils');
const noCodeColumn = [];
for (const r of rows) {
  const acts = ((COURSES['intro-java'].units[r.unit] || {}).activities) || [];
  if (!acts.includes('code')) noCodeColumn.push(`${r.unit} does not declare a code activity`);
}
ok('6.4b every unit holding an exercise declares the code activity',
  noCodeColumn.length === 0, Array.from(new Set(noCodeColumn)));

// The gate itself. A student cannot reach an exercise page yet, so seeding the
// denominator would mark every one of them down for a column that does not
// exist. When the pages import, flip INTRO_JAVA_EXERCISES_LIVE and this check
// is the one to update, deliberately.
ok('6.5 the exercise gate is still shut, so nothing is seeded yet',
  manifest.INTRO_JAVA_EXERCISES_LIVE === false);
// ── THE COUPLING, WHICH IS THE POINT OF THE GATE ─────────────────────────────
// Pages and denominators fail in opposite directions, so they must move
// together. Pages without rows means a student submits correct work and is told
// it is not graded; rows without pages marks the whole class down for a column
// nobody can open. One switch has to control both, and this proves it does in
// both positions rather than only the one we happen to be in.
const build = require('../lib/intro-java-build');
const pagesLive = build.allPages().filter((p) => p.kind === 'code').length;
const rowsLive = manifest.introJavaGradedRows().filter((r) => r.item_type === 'code').length;

ok('6.6 pages and denominators are both on, or both off, never one of each',
  (pagesLive > 0) === (rowsLive > 0), { pagesLive, rowsLive });
ok('6.7 and when they are on there is exactly one row per page',
  pagesLive === 0 || pagesLive === rowsLive, { pagesLive, rowsLive });
ok('6.8 the gate agrees with what it actually produced',
  manifest.INTRO_JAVA_EXERCISES_LIVE === (pagesLive > 0),
  { gate: manifest.INTRO_JAVA_EXERCISES_LIVE, pagesLive });

// The exercises exist and are buildable either way. Only their PUBLICATION is
// gated, so the import CSV can be generated before the gate opens.
ok('6.9 the pages are buildable even while the gate is shut',
  build.exercisePages().length === EXERCISES.length, build.exercisePages().length);

// ── 7. House style ───────────────────────────────────────────────────────────
section('7. House style');

const src = fs.readFileSync(path.join(__dirname, '..', 'seed', 'intro-java-exercises.js'), 'utf8');
ok('7.1 no em-dashes in the bank', !/—/.test(src));

const BRITISH = ['behaviour', 'colour', 'centre', 'labelled', 'whilst', 'neighbour'];
const brit = BRITISH.filter((w) => new RegExp(w, 'i').test(src));
ok('7.2 US English in the bank', brit.length === 0, brit);

// Student-facing text is rendered onto a Shopify page, which is pure ASCII by
// the same rule every other intro-java page follows.
const nonAscii = [];
for (const e of EXERCISES) {
  const text = [e.name, e.brief, e.note || '', ...e.task].join(' ');
  if (/[^\x00-\x7F]/.test(text)) nonAscii.push(e.lesson);
}
ok('7.3 all student-facing exercise text is pure ASCII', nonAscii.length === 0, nonAscii);

const noTask = EXERCISES.filter((e) => !Array.isArray(e.task) || !e.task.length).map((e) => e.lesson);
ok('7.4 every exercise states its task as a list of steps', noTask.length === 0, noTask);

ok('7.5 BY_LESSON indexes every exercise', Object.keys(BY_LESSON).length === EXERCISES.length);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
