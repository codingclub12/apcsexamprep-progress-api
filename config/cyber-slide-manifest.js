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
//  later days. It is not: lesson 3.1's deck says "DAY 1 OF 1" on its title
//  slide, runs to "Slide 22 of 22", and covers all three of the topic's
//  learning objectives, while its Teacher_Guide.docx says the topic takes six
//  class periods and paces those same 22 slides across them (Day 1 is slides
//  1-7, Day 6 is slides 21-22).
//
//  So for Units 3-5 the deck is a whole-lesson deck and the "days" are a
//  reading plan over it. Listing one of those here would report days: 1 for a
//  lesson that actually runs six periods, and the panel would label a
//  six-period deck "Day 1". Tanner is building real per-day decks for those
//  units; they join this map when they exist, which is one line per lesson and
//  no code change.
//
//  A CAUTION FOR WHOEVER ADDS THEM. The existing Day1 file for a Unit 3-5
//  lesson is the whole-lesson deck, not that lesson's future Day 1. Converting
//  it as-is would put a 22-slide deck behind a "Day 1" label next to five
//  genuinely per-day decks.
//
//  UNIT 3 KEYS ARE CED TOPIC NUMBERS. Read this before adding '3-x' anything.
//
//  Until 2026-08-26 the site numbered Unit 3 as six lessons in a different
//  order from the CED's five topics, and the two schemes were not
//  distinguishable from a key. `'3-3'` meant Segmentation to the bundle and
//  Firewalls to the site; BOTH ARE TWO-DAY LESSONS, so a day count would not
//  have caught the swap. It renders cleanly, logs nothing, returns a correct
//  API response, and hands a teacher the wrong decks.
//
//  Tanner resolved it by moving the site onto CED numbering rather than
//  translating between the two, because the EK identifiers are CED-canonical
//  and printed on every slide: a deck citing EK 3.4.B.2 for firewall ACLs
//  cannot be renumbered, so the site numbering was the only free variable.
//  There is therefore no mapping layer here, and there should never be one.
//  See docs/runs/2026-08-26-claude-code-cyber-unit3-slide-day-map.md.
//
//  The verified Unit 3 day map, read from the teacher guides on 2026-08-26 and
//  corroborated by tools/cyber-pacing/pacing.json (Unit 3: 20 teach days):
//
//    '3-1' Network Vulnerabilities      6 days   (deck is 22 slides today)
//    '3-2' Managerial Controls          3 days   (deck is 16 slides today)
//    '3-3' Segmentation                 2 days   (deck is 20 slides today)
//    '3-4' Firewalls                    2 days   (deck is 21 slides today)
//    '3-5' Detecting Network Attacks    7 days   (deck is 25 slides today)
//
//  Those day counts are the CED's and are already correct. What does NOT exist
//  yet is a per-day deck set for any of them, which is why none is listed in
//  DAY_COUNT_BY_LESSON. Add a lesson here only once its per-day decks exist in
//  Drive, or the panel will report days for decks nobody can open.
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
