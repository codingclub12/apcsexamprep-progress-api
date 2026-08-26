'use strict';
// ---------------------------------------------------------------------------
//  AP CYBERSECURITY TEACHER BUNDLE SLIDE MANIFEST.
//
//  THIS IS THE ONE PLACE TO EDIT when a lesson's by-day deck set changes.
//  Same role as config/csp-slide-manifest.js, and it deliberately exports the
//  same shape so routes/slides.js can select a manifest by course and never
//  branch on the course itself.
//
//  DAY_COUNT_BY_LESSON was read directly from Google Drive on 2026-08-25, by
//  enumerating
//    AP Cybersecurity Course/Unit_<N>_*/Lesson_<U>.<L>_*/Slide_Decks/
//  and counting Day<K>_Deck_{STUDENT,TEACHER}.pptx pairs.
//
//  UNITS 1 AND 2 ONLY, ON PURPOSE. Those are the units whose lessons have real
//  per-day decks: 9 lessons, 35 teaching days, 70 decks. Units 3, 4 and 5 are
//  deliberately absent.
//
//  Why they are absent is worth recording, because the folder listing invites
//  the wrong conclusion. Every one of the 15 lessons in Units 3-5 has exactly
//  one deck, named Day1_Deck_*. That looks like 15 lessons each missing their
//  later days. It is not: lesson 3.1's deck runs to "Slide 22 of 22" and covers
//  all three of the topic's learning objectives, while its Teacher_Guide.docx
//  says the topic takes six class periods.
//
//  So for Units 3-5 the deck is a whole-lesson deck. Listing one here would
//  report days: 1 for a lesson that actually runs six periods, and the panel
//  would label a six-period deck "Day 1".
//
//  A CAUTION FOR WHOEVER ADDS THEM, corrected 2026-08-26. An earlier version of
//  this comment said the guides "pace those same 22 slides" across the days, as
//  though a guide were a usable split plan. It is not, and
//  docs/runs/2026-08-26-claude-code-cyber-unit3-slide-day-map.md checked it
//  slide by slide. The numbers run 1 to 22, but the CONTENT at those numbers
//  does not match what the guide says is there: the guide has slide 5 as ARP
//  mapping when it is a section divider, slide 14 as the smurf attack when it
//  is 3.1.B. Two numbering conventions are even in use across one unit (3.1,
//  3.4 and 3.5 number continuously; 3.2 and 3.3 restart each day, implying
//  per-day decks that do not exist). Splitting a deck by following its guide
//  would produce days whose slides are not the slides the guide describes.
//
//  Read that note before adding any of these. It also records that 3.4's title
//  slide already reads DAY 1 OF 2 while its own speaker notes call it a single
//  day, so not even the badges are uniform, and it ranks the five lessons by
//  what a split actually costs: 3.3 and 3.4 are near-zero authoring, 3.1 and
//  3.5 need roughly 64 new content slides between them.
//
//  ON THE KEYS. Tanner decided on 2026-08-26 that the site moves to CED
//  numbering, which is what Drive and the decks already use. That matters here
//  more than it looks: Units 1 and 2 number identically in both schemes, so
//  these keys have never been ambiguous, but Unit 3 diverges. Under the old
//  site numbering, adding '3-3' would have meant Segmentation to the bundle and
//  Firewalls to the site, both two-day lessons, so the day count could not have
//  caught it. It would have rendered cleanly and handed a teacher the wrong
//  decks. The decision removes that rather than translating it, so no mapping
//  layer belongs here.
// ---------------------------------------------------------------------------

const embeds = require('./cyber-slide-embeds');

// lessonId -> number of teaching days this lesson's deck set covers.
// Read from Drive 2026-08-25. Units 1-2 only; see the header.
const DAY_COUNT_BY_LESSON = {
  '1-1': 2, '1-2': 4, '1-3': 4, '1-4': 2, '1-5': 2,
  '2-1': 8, '2-2': 5, '2-3': 4, '2-4': 4,
};

// Deck variants, in the shape the route exposes them (lowercase, JS-friendly)
// mapped to the exact filename token Drive has on disk (case-sensitive).
//
// Note STUDENT, not CSP's Student. The two courses were authored by different
// pipelines and the casing genuinely differs; a regex copied from the CSP
// scripts matches zero cyber decks.
const VARIANTS = { teacher: 'TEACHER', student: 'STUDENT' };

// AP CSP splits every deck across a CB Standard and a Deep Dive track. Cyber
// has no such dimension. This is exported as an empty list rather than omitted
// so that every consumer can read manifest.TRACK_KEYS uniformly and get an
// honest answer, instead of testing whether the property exists.
const TRACK_KEYS = [];

function isKnownLesson(lessonId) {
  return Object.prototype.hasOwnProperty.call(DAY_COUNT_BY_LESSON, lessonId);
}

function dayCount(lessonId) {
  return DAY_COUNT_BY_LESSON[lessonId] || 0;
}

// Every deck for a lesson that a caller can actually open.
//
// `variants` restricts which role-variants to include (a student caller never
// gets TEACHER decks, even when entitled).
//
// UNLIKE THE CSP MANIFEST, a deck with no embed is omitted entirely rather
// than returned without one. For CSP an unconverted deck still has a .pptx on
// Shopify, so it stays useful as a download. A cyber deck has no .pptx and
// never will, so an unconverted one is nothing at all: putting it on the wire
// would only produce an entry the client has to drop. Omitting it keeps a
// partial conversion a working state, which is the same property the CSP
// generator protects, reached the other way round.
//
// The response's `days` still reports the lesson's real day count, so a caller
// can see that 2 of 4 days are ready without being handed two empty rows.
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
