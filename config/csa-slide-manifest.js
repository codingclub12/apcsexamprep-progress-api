'use strict';
// ---------------------------------------------------------------------------
//  AP CSA TEACHER BUNDLE SLIDE MANIFEST.
//
//  Same role as config/csp-slide-manifest.js and config/cyber-slide-manifest.js,
//  and it deliberately exports the identical shape so routes/slides.js can
//  select a manifest by course and never branch on the course itself. See
//  config/slide-manifests.js for the registry.
//
//  SCOPE, AND HOW IT CHANGED ON 2026-09-04.
//  This file covered the 15 Unit 1 lessons only when the pipe was built (board
//  task 183, an engineering pilot with no content behind it). It now also
//  covers the 38 lessons of Units 2, 3 and 4, because those decks turned out to
//  ALREADY EXIST: scripts/csa_kit/content_unit{2,3,4}*.py holds the authored
//  source for all 38, and scripts/build-csa-teacher-kit.py turns it into 152
//  decks. That work landed 2026-08-24 and stopped one step short of shipping,
//  on the stated reasoning that putting the files beside the Unit 1 folders in
//  Drive was Tanner's call rather than a default. He made that call on
//  2026-09-04, which is what this change is.
//
//  WHERE THE DAY COUNTS COME FROM, AND WHY THE TWO HALVES DISAGREE.
//  Units 2 to 4 read config/csa-slide-days.json, generated from the authored
//  content by scripts/csa-deck-days-from-content.py and checked by
//  `npm run smoke:csadeckdays`. Those numbers are real: one entry per lesson,
//  equal to the number of Day<N>_Deck_*.pptx pairs the builder emits.
//
//  Unit 1's table below is still the placeholder every-lesson-is-1 it always
//  was, and that is not an oversight. Unit 1's decks predate the kit builder
//  and exist only in Google Drive ('AP CSA Unit 1 Preview'), whose own
//  COURSE-MATERIALS-INDEX.txt states 15 topics across 35 instructional days. So
//  the real Unit 1 counts are knowable, they are just not derivable from
//  anything in this repo, and inventing a split across 15 lessons to reach 35
//  would be a fabrication dressed as data. Enumerating the Drive folders is the
//  fix; until then a 1 here means "at least one teaching day exists", which is
//  true, rather than a sourced pacing claim.
//
//  A DAY COUNT IS AN UPPER BOUND ON LOOKUPS, NOT A PROMISE OF CONTENT.
//  decksForLesson walks day 1..dayCount and asks the embed map for each one. A
//  count that is too LOW silently hides decks that exist. A count that is too
//  high costs nothing but a few misses. That asymmetry is why Unit 1 sitting at
//  1 is safe today (its embed map is empty, so there is nothing to hide) and
//  becomes a real bug the moment Unit 1 decks are converted. Fix it before
//  converting Unit 1, not after.
//
//  ZERO DECKS STILL RESOLVE FOR EVERY LESSON, INCLUDING UNITS 2 TO 4.
//  config/csa-slide-embeds.js's id map is empty until the Apps Script has
//  converted the .pptx files to Google Slides and its map sheet has been fed
//  through scripts/csa-slide-embeds-from-csv.js. Every lesson here is therefore
//  isKnownLesson true (the route answers 200 rather than 404, so the pipe is
//  provably wired) with decksForLesson returning [], which is the honest
//  entitled-with-nothing-to-show state that assets/apcs-slides-gate.js renders
//  as "your access is active, the decks are being prepared". That is the same
//  code path cyber's unconverted lessons already exercise.
// ---------------------------------------------------------------------------

const embeds = require('./csa-slide-embeds');
const authored = require('./csa-slide-days.json');

// Unit 1: placeholder, see the header. 15 lessons, lib/csa-nav.js's UNIT_1 is
// the authority for which 15 and what their live handles are.
const UNIT_1_DAYS = {
  '1-1': 1, '1-2': 1, '1-3': 1, '1-4': 1, '1-5': 1,
  '1-6': 1, '1-7': 1, '1-8': 1, '1-9': 1, '1-10': 1,
  '1-11': 1, '1-12': 1, '1-13': 1, '1-14': 1, '1-15': 1,
};

// Units 2 to 4: real counts, derived from the authored kit content.
const DAY_COUNT_BY_LESSON = Object.assign({}, UNIT_1_DAYS, authored.days);

// Deck variants, in the shape the route exposes them (lowercase, JS-friendly).
// The filename casing the kit builder actually emits is Day<N>_Deck_TEACHER
// and Day<N>_Deck_STUDENT, so this matches the files rather than guessing.
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
// download-only stub.
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
  AUTHORED_LESSON_IDS: Object.keys(authored.days),
};
