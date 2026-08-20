'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  INTRO TO JAVA: THE PAGE BUILD, IN ONE PLACE.
//
//  Ninety pages come out of this course: one course hub, six unit hubs, forty
//  two lessons and forty one help pages. Assembling them is not a one-liner,
//  because a lesson needs its unit label, its previous and next neighbours
//  ACROSS unit boundaries, and the help index to resolve its stuck links, and a
//  help page needs its siblings.
//
//  That assembly was written once inside the content smoke test. The import
//  script needed exactly the same ninety pages, and a second copy of this logic
//  is the shape of thing where the suite proves a page correct and the importer
//  ships a slightly different one: same renderer, different neighbours, and no
//  test can see the difference because the test built its own.
//
//  So it lives here and both callers ask for it. Adding a unit to
//  seed/intro-java-banks.js changes nothing in either.
//
//  Every page comes back in the same shape regardless of kind:
//    { kind, handle, title, seoTitle, seoDescription, bodyHtml }
//  which is what lets the CSV writer treat all ninety identically.
//
//  Zero PII: author content only. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

const { BANKS } = require('../seed/intro-java-banks');
const help = require('../seed/intro-java-help');
const { renderLesson, handleFor } = require('./intro-java-page');
const { renderProject } = require('./intro-java-project-page');
const { PROJECTS } = require('../seed/intro-java-projects-library');
const { renderHelp } = require('./intro-java-help-page');
const { renderAllHubs } = require('./intro-java-hub-page');

/** Every lesson in course order, flattened across units. */
function lessonsInOrder() {
  return BANKS.flatMap((b) => b.lessons);
}

function unitOf() {
  const m = new Map();
  for (const b of BANKS) for (const l of b.lessons) m.set(l.lesson, b);
  return m;
}

/**
 * The 42 lesson pages.
 *
 * Neighbours are taken from the FLAT course order, not from within a unit, so
 * the last lesson of Unit 2 links forward to the first of Unit 3. A student who
 * hits a dead end at a unit boundary goes and does something else.
 */
function lessonPages() {
  const lessons = lessonsInOrder();
  const units = unitOf();
  const ref = (l) => (l ? { handle: handleFor(l), lesson: l.lesson, title: l.title } : null);
  return lessons.map((l, i) => ({
    ...renderLesson(l, {
      prev: ref(lessons[i - 1]),
      next: ref(lessons[i + 1]),
      unitLabel: units.get(l.lesson).label,
      unitKey: units.get(l.lesson).unit,
      helpIndex: help.INDEX,
    }),
    kind: 'lesson',
  }));
}

/**
 * The 41 help pages.
 *
 * `related` is the other help pages that become readable at the same point in
 * the course, which is the only grouping that is safe: a help page must never
 * link forward to something that needs a lesson the reader has not reached.
 */
function helpPages() {
  return help.ALL.map((h) => {
    const page = renderHelp(h, {
      related: help.ALL.filter((x) => x.after === h.after && x.code !== h.code).slice(0, 3),
      lessonHandle: null,
    });
    // renderHelp calls its error/gotcha/recipe distinction `kind`, which is a
    // different axis from the page kind every caller here sorts on. Keep both
    // rather than letting one quietly win the spread.
    return { ...page, kind: 'help', helpKind: page.kind };
  });
}

/** The course hub plus the six unit hubs. */
function hubPages() {
  return renderAllHubs(BANKS, help);
}

/**
 * One page per Greenfoot project, with its tutorial embedded.
 *
 * Only projects that have something to show get a page. Array Racing is marked
 * coming soon in the library with no video and no starter files, and a page
 * with nothing on it is worse than no page.
 *
 * The handles deliberately do NOT parse as lesson handles. See the note in
 * lib/intro-java-project-page.js: if they did, every visit would be written to
 * the tracker as lesson progress for work that is not graded and cannot be.
 */
function projectPages() {
  const shown = PROJECTS.filter((p) => (p.videos && p.videos.length) || p.files);
  return shown.map((p, i) => renderProject(p, {
    prev: i > 0 ? shown[i - 1] : null,
    next: i < shown.length - 1 ? shown[i + 1] : null,
  }));
}

/**
 * All ninety, hubs first.
 *
 * Order matters for the import: a lesson page links to its unit hub and a hub
 * links to its lessons, and creating the hubs first means the very first page a
 * crawler reaches already has somewhere to go.
 */
// The code exercise pages. Built from seed/intro-java-exercises.js, which reads
// its verified expected outputs off disk, so this throws with a specific message
// if the verifier has not been run rather than shipping a page whose examples
// disagree with what the grader checks.
//
// ALWAYS BUILDABLE, so the import CSV can be generated and every check can run
// against them. Whether they belong in allPages() is a separate question, below.
function exercisePages() {
  return require('./intro-java-exercise-page').allPages();
}

// ── WHY ONE SWITCH CONTROLS BOTH THE PAGES AND THE DENOMINATORS ──────────────
// These two must never ship half and half, and they fail in opposite directions:
//
//   pages without manifest rows -> a student submits, the grader finds no
//     denominator, and the page says "not graded yet" on work that was correct
//   rows without pages -> every intro-java denominator carries points nobody
//     can reach, marking the whole class down for a column that does not exist
//
// So allPages(), which is what the importer and the whole-course checks walk,
// includes the exercise pages only when the denominators are seeded. Flipping
// INTRO_JAVA_EXERCISES_LIVE in scripts/seed-manifest.js turns both on together,
// which is the only state where either is correct.
//
// smoke/intro-java-content.js 10.2c is the check that found this: it compares
// what pages POST to against what the manifest denominates, and it caught eight
// items posting to nothing the moment the pages entered the walk.
function exercisesLive() {
  return require('../scripts/seed-manifest').INTRO_JAVA_EXERCISES_LIVE;
}

function allPages() {
  return [...hubPages(), ...lessonPages(), ...helpPages(), ...projectPages(),
    ...(exercisesLive() ? exercisePages() : [])];
}

module.exports = { allPages, hubPages, lessonPages, helpPages, projectPages,
  exercisePages, lessonsInOrder, unitOf };
