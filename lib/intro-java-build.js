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
 * All ninety, hubs first.
 *
 * Order matters for the import: a lesson page links to its unit hub and a hub
 * links to its lessons, and creating the hubs first means the very first page a
 * crawler reaches already has somewhere to go.
 */
function allPages() {
  return [...hubPages(), ...lessonPages(), ...helpPages()];
}

module.exports = { allPages, hubPages, lessonPages, helpPages, lessonsInOrder, unitOf };
