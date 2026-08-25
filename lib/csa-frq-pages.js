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


// ── COMMON MISTAKES, FROM THE MUTANTS ────────────────────────────────────────
// Every entry's `mutants` are named wrong versions of its own reference that
// scripts/verify-csa-frq.js has PROVEN fail at least one test case. That makes
// them the one thing on this page that can honestly be called a common mistake:
// not a guess at what students get wrong, but a specific error the grader is
// demonstrably able to catch.
//
// They are rendered COLLAPSED, the same treatment the hints get, and framed as
// a pre-submit checklist. A mistake description is close to an answer for
// somebody who has not tried yet ("casts after the division rather than before"
// names the fix), so it must not sit open above the editor. Behind a summary it
// is a check you reach for after your own attempt, which is when it teaches.
function mistakes(x) {
  const list = x.mutants || [];
  if (!list.length) return '';
  const items = list.map((m) => `      <li>${esc(m.describe)}</li>`).join('\n');
  return `
  <h2>Before you submit</h2>
  <details><summary>${list.length} mistake(s) that lose points on this question</summary>
    <p class="muted">Each of these is a real error the grader catches. Check your answer against them before you submit, not instead of trying.</p>
    <ul>
${items}
    </ul>
  </details>
`;
}

// ── STRUCTURED DATA ──────────────────────────────────────────────────────────
// Modelled on the past-paper FRQ pages, which carry LearningResource, a
// BreadcrumbList and an FAQPage and rank well on the strength of it. The FRQ
// practice pages shipped with none, which is 53 pages of search surface left
// unclaimed.
//
// Everything below is derived from the entry, so the 53 blocks differ from each
// other in substance rather than being one template with a lesson number swapped
// in. A near-identical FAQ across 53 pages is a doorway-page signal, not an SEO
// win.
//
// NO HTML ESCAPING INSIDE THESE BLOCKS. An entity inside a script tag is
// invalid JSON and scripts/csa-frq-pages-csv.js fails the build over it. `<` is
// escaped as < instead, which keeps the JSON valid and cannot terminate
// the script element early.
function jsonld(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

const TYPE_LABEL = {
  'methods-and-control': 'methods and control structures',
  class: 'class design',
  'array-arraylist': 'arrays and ArrayLists',
  'two-d-array': 'two-dimensional arrays',
};

function structuredData(x, meta, handle, lessonHandle, un) {
  const url = `https://apcsexamprep.com/pages/${handle}`;
  const topic = TYPE_LABEL[x.frqType] || x.frqType;
  // Both of these answers used to be one of two fixed strings, which made them
  // identical across dozens of pages. 46 of the 53 shared a scoring answer
  // verbatim. That is the doorway-page shape, not an SEO win, so each answer now
  // carries something only this entry can supply: its own `given` contract and
  // its own rubric rows.
  const rule = x.mode === 'driver'
    ? 'A hidden driver calls your code, so the value each method RETURNS is what is scored and nothing you print is measured.'
    : 'What the segment prints is what is scored, in the order the rubric lists.';
  const shape = `${x.given} ${rule}`;

  const faq = [
    {
      q: `What does the AP CSA ${x.lesson} FRQ practice question ask you to do?`,
      a: `${x.name}: ${x.parts.map((p) => `${p.label} ${p.text}`).join(' ')}`,
    },
    { q: `Do you write a whole program or just a method for AP CSA ${x.lesson}?`, a: shape },
    {
      q: `How is the AP CSA ${x.lesson} FRQ practice scored?`,
      a: `Out of ${POINTS} points, one per rubric row: `
        + `${x.parts.map((p) => `${p.label} ${p.text}`).join(' ')} `
        + `Your answer runs against ${x.cases.length} test cases, `
        + `${x.cases.filter((c) => c.hidden).length} of them hidden, and the fraction you pass becomes the score. `
        + 'That is not how a human AP reader marks a rubric, so treat the rows above as the thing being practised.',
    },
  ];
  if ((x.mutants || []).length) {
    faq.push({
      q: `What is a common mistake on AP CSA ${x.lesson}?`,
      a: `${x.mutants[0].describe}. It is one of ${x.mutants.length} error(s) this question is built to catch.`,
    });
  }

  const blocks = [
    {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      name: `AP CSA ${x.lesson} FRQ Practice: ${x.name}`,
      description: x.seo,
      url,
      learningResourceType: 'Practice problem',
      educationalUse: 'Practice',
      educationalLevel: 'AP Computer Science A',
      teaches: `${x.title}: ${topic}`,
      typicalAgeRange: '15-18',
      isAccessibleForFree: true,
      inLanguage: 'en',
      educationalAlignment: {
        '@type': 'AlignmentObject',
        alignmentType: 'educationalSubject',
        educationalFramework: 'AP Computer Science A 2025-2026 Course and Exam Description',
        targetName: `${meta.unitLabel}, Topic ${x.lesson} ${x.title}`,
      },
      provider: { '@type': 'Organization', name: 'APCSExamPrep.com', url: 'https://apcsexamprep.com' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'AP CSA', item: 'https://apcsexamprep.com/pages/ap-csa-exam-prep-hub' },
        { '@type': 'ListItem', position: 2, name: `Unit ${un}`, item: `https://apcsexamprep.com/pages/ap-csa-unit-${un}-course` },
        { '@type': 'ListItem', position: 3, name: `Lesson ${x.lesson}`, item: `https://apcsexamprep.com/pages/${lessonHandle}` },
        { '@type': 'ListItem', position: 4, name: `${x.name} FRQ practice`, item: url },
      ],
    },
  ];
  return blocks.map((b) => `<script type="application/ld+json">${jsonld(b)}</script>`).join('\n');
}

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

${mistakes(x)}
  <h2>Where to go next</h2>
  <div class="nextnav">
    <a href="/pages/${lessonHandle}">Rework the Lesson ${x.lesson} page</a>
    <a href="/pages/${lessonHandle}-exercise-1">Try the from-scratch exercise for this lesson</a>
    <a href="/pages/${lessonHandle}-debug">Try the debugging exercise for this lesson</a>
  </div>

  <textarea class="hidden" id="x1-starter">${esc(x.starter)}</textarea>
  <textarea class="hidden" id="x1-runharness"></textarea>
</div>
${structuredData(x, meta, handle, lessonHandle, un)}
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
