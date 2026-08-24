'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CSA FRQ PRACTICE PAGES: THE RENDERER.
//
//  WHAT THIS BUILDS
//  One page per entry in seed/csa-frq:
//
//      ap-csa-lesson-{U}-{L}-{slug}-frq
//
//  Same editor, same Run/Submit split and the same grading pipeline
//  (POST /api/student/code-grade) as an exercise-1 page, graded as item
//  `exercise-3`, which the manifest already denominates at 4 points.
//
//  REUSES lib/csa-exercise-pages.js RATHER THAN RESTATING IT
//  pageCss and pageScript are imported unchanged, the same way
//  lib/csa-debug-pages.js does. The editor, the Run button and the grading
//  calls behave identically for an FRQ, so there is nothing about them to
//  rewrite. What differs is the body: an exam-shaped framing, the four rubric
//  parts printed as rubric rows, and the scoring note.
//
//  ── WHY THE RUBRIC IS RENDERED, NOT SUMMARISED ──────────────────────────────
//  The page prints all four parts verbatim, with their labels, above the
//  editor. A student who cannot see the rubric is guessing at what earns the
//  point, and "read the question carefully" is not a teachable skill unless the
//  question is on the page in the form the reader will be scored against.
//
//  ── THE SCORING NOTE IS AN HONEST ONE ───────────────────────────────────────
//  This item is scored by running hidden test cases and scaling the pass ratio
//  into four points. That is NOT how a human AP reader scores an FRQ, and the
//  page says so in a sentence rather than implying an equivalence it cannot
//  deliver. Claiming otherwise would teach students to trust a number that does
//  not mean what they think it means, which is worse than a lower number.
//
//  A SEGMENT PAGE SHOWS THE GIVEN DECLARATIONS
//  In segment mode the case prelude declares the variables the student uses,
//  and the student never sees it. So the page renders the VISIBLE cases'
//  preludes as "what is given", which is exactly what an FRQ's opening
//  paragraph does. Hidden preludes are never rendered: that is the whole point
//  of them.
//
//  HOUSE HAZARDS: identical posture to lib/csa-exercise-pages.js, since the CSS
//  and script are the literal same functions.
//
//  Zero PII: author content only. No student source is ever stored.
// ─────────────────────────────────────────────────────────────────────────────

const bank = require('../seed/csa-frq');
const { LESSONS, UNIT_HUBS, esc, pageCss, pageScript } = require('./csa-exercise-pages');

const COURSE = 'ap-csa';
const ITEM = 'exercise-3';
const POINTS = 4;

function unitNumber(unit) {
  return Number(String(unit).replace('unit-', ''));
}

function renderFrq(x, expected) {
  const meta = LESSONS.get(x.lesson);
  if (!meta) throw new Error(`csa-frq-pages: unknown ap-csa lesson ${x.lesson}`);
  if (meta.unit !== x.unit) {
    throw new Error(`csa-frq-pages: ${x.lesson} says unit ${x.unit}, course config says ${meta.unit}`);
  }
  const id = 'csa-x1';

  // Base lesson handle comes from the exercise-1 bank, the single source of
  // truth for a lesson's handle, so this page's Back link and handle prefix can
  // never drift from the exercise-1 or debug page's.
  const exOne = require('../seed/csa-exercises').byLesson(x.lesson);
  if (!exOne) throw new Error(`csa-frq-pages: no exercise-1 entry for lesson ${x.lesson} to read a handle from`);
  const lessonHandle = exOne.handle;
  const handle = `${lessonHandle}-frq`;
  const un = unitNumber(x.unit);
  const hub = UNIT_HUBS[x.unit];

  const parts = x.parts.map((p) =>
    `      <li><span class="plabel">${esc(p.label)}</span> ${esc(p.text)}</li>`).join('\n');

  const steps = x.task.map((t) => `      <li>${esc(t)}</li>`).join('\n');
  const hints = x.hints.map((h, i) =>
    `    <details><summary>Hint ${i + 1}</summary><p>${esc(h)}</p></details>`).join('\n');

  const visible = x.cases.map((c, i) => ({ c, i })).filter(({ c }) => !c.hidden);
  const samples = visible.map(({ c, i }, n) => {
    const key = bank.caseKey(x.lesson, i);
    const shown = expected[key];
    if (shown == null) throw new Error(`csa-frq-pages ${x.lesson}: no verified output for visible case ${i}`);
    // In segment mode the "input" a student can see is the declarations the
    // case supplies. In program and driver mode it is stdin.
    const given = x.mode === 'segment' ? String(c.prelude || '') : String(c.stdin || '');
    const label = x.mode === 'segment' ? 'is given' : 'input';
    return `      <div class="sample">
        <div class="head">Example ${n + 1} ${esc(label)}</div>
        <pre>${esc(given.replace(/\n$/, '')) || '(nothing)'}</pre>
        <div class="head">Example ${n + 1} output</div>
        <pre>${esc(String(shown).replace(/\n$/, '')) || '(no output)'}</pre>
      </div>`;
  }).join('\n');

  const firstStdin = visible.length ? String(visible[0].c.stdin || '') : '';

  const bodyHtml = `${pageCss(id)}
<div id="${id}" class="lesson-page" data-course="${COURSE}" data-unit="${x.unit}" data-lesson="${x.lesson}" data-lesson-id="${x.lesson}" data-activity="${ITEM}" data-activity-type="${ITEM}" data-mode="${x.mode}">
  <div class="hero">
    <p class="eyebrow">${esc(meta.unitLabel)} &middot; Lesson ${x.lesson} &middot; FRQ Practice</p>
    <h1>${esc(x.name)}</h1>
    <p class="sub">A free response question in the shape the exam uses: a stated contract, four rubric parts, and no main method handed to you. Worth ${POINTS} points.</p>
  </div>
  <p class="navrow"><a class="btn" href="/pages/${lessonHandle}">Back to the Lesson ${x.lesson} page</a><a class="btn ghost" href="/pages/${hub}">All Unit ${un} lessons</a></p>
  <div class="brief">
    <p class="label">Why this question is worth four points</p>
    <p>${esc(x.brief)}</p>
  </div>

  <h2>What you are given</h2>
  <div class="card">
    <p>${esc(x.given)}</p>
  </div>

  <h2>The question</h2>
  <div class="card">
    <ol class="rubric">
${parts}
    </ol>
  </div>

  <h2>What the reader is looking for</h2>
  <div class="card">
    <ol>
${steps}
    </ol>
  </div>

  <h2>Worked examples</h2>
  <p class="muted">These show what a correct answer prints. There are more cases you cannot see, and they use different values, so an answer built around just these numbers will fail.</p>
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
  <p class="muted">How this is scored: your answer runs against every test case, and the fraction it passes becomes your score out of ${POINTS}. That is not how a human AP reader marks a rubric, so treat the score as a check on whether your code works, and the rubric above as the thing you are actually practising.</p>
  <p><button type="button" class="btn" id="x1-run">Run</button><button type="button" class="btn ghost" id="x1-reset">Start over</button><button type="button" class="btn go" id="x1-grade">Submit for grading</button></p>
  <pre class="console" id="x1-console"></pre>
  <div class="verdict hidden" id="x1-verdict"></div>

  <h2>Stuck?</h2>
${hints}

  <h2>Where to go next</h2>
  <div class="nextnav">
    <a href="/pages/${lessonHandle}">Rework the Lesson ${x.lesson} page</a>
    <a href="/pages/${lessonHandle}-exercise-1">Try the from-scratch exercise for this lesson</a>
    <a href="/pages/${lessonHandle}-debug">Try the debugging exercise for this lesson</a>
  </div>

  <textarea class="hidden" id="x1-starter">${esc(x.starter)}</textarea>
  <textarea class="hidden" id="x1-runharness"></textarea>
</div>
${pageScript()}`;

  return {
    kind: 'frq',
    item: ITEM,
    unit: x.unit,
    lesson: x.lesson,
    mode: x.mode,
    frqType: x.frqType,
    lessonHandle,
    handle,
    points: POINTS,
    cases: x.cases.length,
    hiddenCases: x.cases.filter((c) => c.hidden).length,
    title: `AP CSA ${x.lesson} FRQ Practice: ${x.name}`,
    bodyHtml,
    seoTitle: `AP CSA ${x.lesson} FRQ Practice: ${x.name}`.slice(0, 70),
    seoDescription: x.seo,
  };
}

function allPages() {
  const expected = require(bank.EXPECTED_FILE).cases;
  return bank.all().map((x) => renderFrq(x, expected));
}

module.exports = { allPages, renderFrq, ITEM, COURSE, POINTS };
