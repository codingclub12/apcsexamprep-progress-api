'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CSA DEBUGGING EXERCISE PAGES: THE RENDERER.
//
//  WHAT THIS BUILDS
//  One page per entry in seed/csa-debug-exercises.js, currently one:
//
//      ap-csa-lesson-{U}-{L}-{slug}-debug
//
//  Same code editor, same Run/Submit split, same grading pipeline
//  (POST /api/student/code-grade with item `debug`) as an exercise-1 page.
//  The only real difference is the starter: not a skeleton, but a plausible,
//  mostly-correct attempt with real bugs planted in it. See the header of
//  seed/csa-debug-exercises.js for why this is a distinct item id from
//  exercise-1, exercise-2 and exercise-3.
//
//  REUSES lib/csa-exercise-pages.js RATHER THAN RESTATING IT
//  pageCss and pageScript are imported from there unchanged: the editor, the
//  Run button, the Submit button and the grading calls all work identically
//  for a debugging exercise, so there is nothing about them to rewrite. Only
//  the body markup (a "find the bug" framing instead of "write this") and the
//  item id differ.
//
//  HOUSE HAZARDS: identical posture to lib/csa-exercise-pages.js, since the
//  CSS and script are the literal same functions.
//
//  Zero PII: author content only.
// ─────────────────────────────────────────────────────────────────────────────

const debugExercises = require('../seed/csa-debug-exercises');
const { LESSONS, UNIT_HUBS, esc, pageCss, pageScript } = require('./csa-exercise-pages');

const COURSE = 'ap-csa';
const ITEM = 'debug';

function unitNumber(unit) {
  return Number(String(unit).replace('unit-', ''));
}

function renderDebugExercise(x, expected) {
  const meta = LESSONS.get(x.lesson);
  if (!meta) throw new Error(`csa-debug-pages: unknown ap-csa lesson ${x.lesson}`);
  if (meta.unit !== x.unit) {
    throw new Error(`csa-debug-pages: ${x.lesson} says unit ${x.unit}, course config says ${meta.unit}`);
  }
  const id = 'csa-x1';
  // Base lesson handle comes from the exercise-1 bank, the single source of
  // truth for what a lesson's own handle is, so this page's Back link and
  // handle prefix can never drift from the exercise-1 page's.
  const exOne = require('../seed/csa-exercises').byLesson(x.lesson);
  if (!exOne) throw new Error(`csa-debug-pages: no exercise-1 entry for lesson ${x.lesson} to read a handle from`);
  const lessonHandle = exOne.handle;
  const handle = `${lessonHandle}-${ITEM}`;
  const un = unitNumber(x.unit);
  const hub = UNIT_HUBS[x.unit];

  const steps = x.task.map((t) => `      <li>${esc(t)}</li>`).join('\n');
  const hints = x.hints.map((h, i) =>
    `    <details><summary>Hint ${i + 1}</summary><p>${esc(h)}</p></details>`).join('\n');

  const visible = x.cases.map((c, i) => ({ c, i })).filter(({ c }) => !c.hidden);
  const samples = visible.map(({ c, i }, n) => {
    const key = debugExercises.caseKey(x.lesson, i);
    const shown = expected[key];
    if (shown == null) throw new Error(`csa-debug-pages ${x.lesson}: no verified output for visible case ${i}`);
    const stdin = String(c.stdin || '');
    return `      <div class="sample">
        <div class="head">Example ${n + 1} input</div>
        <pre>${esc(stdin.replace(/\n$/, '')) || '(no input)'}</pre>
        <div class="head">Example ${n + 1} output</div>
        <pre>${esc(String(shown).replace(/\n$/, '')) || '(no output)'}</pre>
      </div>`;
  }).join('\n');

  const firstStdin = visible.length ? String(visible[0].c.stdin || '') : '';

  const bodyHtml = `${pageCss(id)}
<div id="${id}" class="lesson-page" data-course="${COURSE}" data-unit="${x.unit}" data-lesson="${x.lesson}" data-lesson-id="${x.lesson}" data-activity="${ITEM}" data-activity-type="${ITEM}" data-mode="${x.mode}">
  <div class="hero">
    <p class="eyebrow">${esc(meta.unitLabel)} &middot; Lesson ${x.lesson} &middot; Debugging</p>
    <h1>${esc(x.name)}</h1>
    <p class="sub">${esc(x.title)}. This is not a blank editor: it is someone else's attempt. Find what is wrong, fix it, and submit to be graded against hidden test cases.</p>
  </div>
  <p class="navrow"><a class="btn" href="/pages/${lessonHandle}">Back to the Lesson ${x.lesson} page</a><a class="btn ghost" href="/pages/${hub}">All Unit ${un} lessons</a></p>
  <div class="brief">
    <p class="label">Why debugging is its own skill</p>
    <p>${esc(x.brief)}</p>
  </div>

  <h2>What is wrong with it</h2>
  <div class="card">
    <ol>
${steps}
    </ol>
    <div class="io">
      <div class="box"><p class="label">The program reads</p><p>${esc(x.reads)}</p></div>
      <div class="box"><p class="label">The program should print</p><p>${esc(x.prints)}</p></div>
    </div>
  </div>

  <h2>Worked examples</h2>
  <p class="muted">These show what the FIXED program should print. There are more cases you cannot see, and they use different values, so patching around just these numbers will fail.</p>
  <div class="samples">
${samples}
  </div>

  <h2>Your answer</h2>
  <div class="editorwrap">
    <div class="bar">Main.java</div>
    <textarea class="code" id="x1-code" spellcheck="false">${esc(x.starter)}</textarea>
  </div>
  <p class="label">Input for the Run button</p>
  <textarea class="stdin" id="x1-stdin" spellcheck="false">${esc(firstStdin.replace(/\n$/, ''))}</textarea>
  <p class="muted">Run sends whatever is in the code box below, bugs and all, so you can see the crash or the wrong answer for yourself before you fix anything.</p>
  <p><button type="button" class="btn" id="x1-run">Run</button><button type="button" class="btn ghost" id="x1-reset">Reset to the buggy starter</button><button type="button" class="btn go" id="x1-grade">Submit for grading</button></p>
  <pre class="console" id="x1-console"></pre>
  <div class="verdict hidden" id="x1-verdict"></div>

  <h2>Stuck?</h2>
${hints}

  <h2>Where to go next</h2>
  <div class="nextnav">
    <a href="/pages/${lessonHandle}">Rework the Lesson ${x.lesson} page</a>
    <a href="/pages/${lessonHandle}-exercise-1">Try the from-scratch version of this lesson</a>
  </div>

  <textarea class="hidden" id="x1-starter">${esc(x.starter)}</textarea>
  <textarea class="hidden" id="x1-runharness"></textarea>
</div>
${pageScript()}`;

  return {
    kind: ITEM,
    unit: x.unit,
    lesson: x.lesson,
    mode: x.mode,
    lessonHandle,
    handle,
    cases: x.cases.length,
    hiddenCases: x.cases.filter((c) => c.hidden).length,
    title: `AP CSA ${x.lesson} Debugging: ${x.name}`,
    bodyHtml,
    seoTitle: `AP CSA ${x.lesson} Debugging Exercise: ${x.name}`.slice(0, 70),
    seoDescription: x.seo,
  };
}

function allPages() {
  const expected = require(debugExercises.EXPECTED_FILE).cases;
  return debugExercises.all().map((x) => renderDebugExercise(x, expected));
}

module.exports = { allPages, renderDebugExercise, ITEM, COURSE };
