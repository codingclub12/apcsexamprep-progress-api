'use strict';
// ---------------------------------------------------------------------------
//  AP CSA TEACHER BUNDLE SLIDE MANIFEST -- UNIT 1 PILOT ONLY.
//
//  Same role as config/csp-slide-manifest.js and config/cyber-slide-manifest.js,
//  and it deliberately exports the identical shape so routes/slides.js can
//  select a manifest by course and never branch on the course itself. See
//  config/slide-manifests.js for the registry.
//
//  SCOPE: THE 15 UNIT 1 LESSONS ONLY, NOT ALL 53 CSA LESSONS.
//  lib/csa-nav.js's UNIT_1 table is the authority for which 15 lessons those
//  are and what their live page handles are (ap-csa-lesson-1-1-intro-algorithms
//  through ap-csa-lesson-1-15-string-manipulation). Board task 183 is an
//  engineering pilot, matching how the reporter script itself was piloted on
//  CSA Unit 1 first (CLAUDE.md, "Current mission" / "Build order"). Units 2-4
//  are absent from this manifest on purpose: adding them is a manifest edit,
//  not a code change, once there is real content to add.
//
//  WHY EVERY LESSON RESOLVES ZERO DECKS, AND WHY THAT IS NOT A BUG.
//  No AP CSA slide deck exists yet, gated or not (confirmed live 2026-09-03:
//  the bundle's own sales page promises "Slides + Resources for All 4 Units"
//  while carrying zero .pptx links, zero docs.google.com links and zero
//  data-apcs-slides containers anywhere on the storefront; see
//  docs/runs/2026-09-03-auditor-csp-slides.md, "ITEM 3"). This manifest does
//  not invent a placeholder deck to paper over that. It lists all 15 lessons
//  as KNOWN (isKnownLesson true, so the route answers 200 instead of 404 and
//  the pipe is provably wired end to end) while config/csa-slide-embeds.js's
//  map stays empty, so decksForLesson always returns []. An entitled caller
//  therefore sees the gate's own honest "your access is active, the decks are
//  being prepared" state (assets/apcs-slides-gate.js renderPending), the exact
//  same code path config/cyber-slide-manifest.js's unconverted lessons already
//  exercise, proven correct in smoke/cyber-slide-gate.js section 5. An
//  unentitled caller sees the ordinary locked upsell, naming the AP CSA
//  Teacher Bundle once assets/apcs-slides-gate.js's COURSES table is extended
//  for it (theme repo, this same board task).
//
//  DAY_COUNT_BY_LESSON IS A PLACEHOLDER, UNLIKE ITS TWO SIBLING FILES.
//  config/csp-slide-manifest.js's day counts were read from the Shopify file
//  library; config/cyber-slide-manifest.js's were read from Drive. Neither
//  exists for CSA: nobody has planned a by-day split for any Unit 1 lesson,
//  so there is no artifact to read. Every entry below is 1, meaning only "this
//  lesson is taught" (true for all 15, per lib/csa-nav.js's own
//  built.lesson: true), not a sourced pacing claim. Do not treat these numbers
//  as authored pacing the way the other two files' counts are, and do not
//  copy them into a teacher-facing page. Replace with a real count, lesson by
//  lesson, only once an actual deck set exists to count.
// ---------------------------------------------------------------------------

const embeds = require('./csa-slide-embeds');

// lessonId -> placeholder day count. See the header: this is "at least one
// teaching day exists", not a sourced pacing plan. Unit 1 only, the 15
// lessons in lib/csa-nav.js's UNIT_1.
const DAY_COUNT_BY_LESSON = {
  '1-1': 1, '1-2': 1, '1-3': 1, '1-4': 1, '1-5': 1,
  '1-6': 1, '1-7': 1, '1-8': 1, '1-9': 1, '1-10': 1,
  '1-11': 1, '1-12': 1, '1-13': 1, '1-14': 1, '1-15': 1,
};

// Deck variants, in the shape the route exposes them (lowercase, JS-friendly).
// No filenames exist yet to fix a casing convention against, so this copies
// config/cyber-slide-manifest.js's STUDENT/TEACHER casing rather than CSP's
// Student/TEACHER mix, on the reasoning that a decision made once should not
// be re-litigated per course without a reason; whoever builds the real
// conversion script can change this in one place if the eventual file names
// disagree.
const VARIANTS = { teacher: 'TEACHER', student: 'STUDENT' };

// AP CSP splits every deck across a CB Standard and a Deep Dive track. Neither
// CSA nor cyber has that dimension. Exported as an empty list rather than
// omitted so every consumer can read manifest.TRACK_KEYS uniformly, matching
// config/cyber-slide-manifest.js exactly.
const TRACK_KEYS = [];

function isKnownLesson(lessonId) {
  return Object.prototype.hasOwnProperty.call(DAY_COUNT_BY_LESSON, lessonId);
}

function dayCount(lessonId) {
  return DAY_COUNT_BY_LESSON[lessonId] || 0;
}

// Every deck for a lesson that a caller can actually open. Identical logic to
// config/cyber-slide-manifest.js: a deck with no embed is omitted entirely
// rather than returned empty, because a CSA deck (like a cyber one) has no
// .pptx fallback, so an unconverted slot is nothing at all rather than a
// download-only stub. Today embeds.slideId() never finds an id for any
// lesson, so this always returns [], which is the honest, tested,
// entitled-with-nothing-to-show state described in the header above.
function decksForLesson(lessonId, variants) {
  if (!isKnownLesson(lessonId)) return null;
  const days = dayCount(lessonId);
  const wantVariants = variants || Object.keys(VARIANTS);
  const decks = [];
  for (let day = 1; day <= days; day++) {
    for (const variant of wantVariants) {
      const id = embeds.slideId(lessonId, day, variant);
      if (!id) continue;
      decks.push({ day, variant, embedUrl: embeds.embedUrl(id) });
    }
  }
  return decks;
}

module.exports = {
  isKnownLesson,
  dayCount,
  decksForLesson,
  LESSON_IDS: Object.keys(DAY_COUNT_BY_LESSON),
  VARIANT_KEYS: Object.keys(VARIANTS),
  TRACK_KEYS,
};
