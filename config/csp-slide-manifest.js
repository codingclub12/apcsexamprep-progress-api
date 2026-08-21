'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CSP TEACHER BUNDLE SLIDE MANIFEST.
//
//  THIS IS THE ONE PLACE TO EDIT when a lesson's by-day deck set changes on
//  Shopify (a new day added, a re-upload, a new lesson). Same convention as
//  config/shopify-skus.js: a small hand-maintained map, not a live query
//  against Shopify on every page view.
//
//  Every lesson's real deck files live in Shopify Files as:
//    AP-CSP_<lessonId>_Day<N>_Deck_<TEACHER|Student>_<CB|DeepDive>_<token>.pptx
//  e.g. AP-CSP_1-2_Day2_Deck_TEACHER_CB_k7q2m9.pptx
//
//  DAY_COUNT_BY_LESSON and BATCH_TOKEN below were read directly from the
//  Shopify file library on 2026-08-18 (all 35 AP CSP lessons, Big Ideas 1-5,
//  every file on that one upload batch). If a lesson's deck set is
//  re-uploaded under a new token, or a lesson gains/loses a day, update the
//  entry here; nothing else in the gate route needs to change.
// ─────────────────────────────────────────────────────────────────────────────

const embeds = require('./csp-slide-embeds');

// The shop-id path segment is stable for the store; it is the same base every
// other Shopify Files URL in this repo uses (see lib/intro-java-page.js).
const CDN_BASE = 'https://cdn.shopify.com/s/files/1/0778/8403/1191/files';

const BATCH_TOKEN = 'k7q2m9';

// lessonId -> number of teaching days this lesson's bundle covers.
const DAY_COUNT_BY_LESSON = {
  '1-1': 1, '1-2': 2, '1-3': 2, '1-4': 2,
  '2-1': 2, '2-2': 1, '2-3': 2, '2-4': 2,
  '3-1': 2, '3-2': 2, '3-3': 2, '3-4': 1, '3-5': 2, '3-6': 2, '3-7': 1,
  '3-8': 2, '3-9': 2, '3-10': 2, '3-11': 1, '3-12': 2, '3-13': 2, '3-14': 1,
  '3-15': 1, '3-16': 2, '3-17': 2, '3-18': 1,
  '4-1': 2, '4-2': 1, '4-3': 1,
  '5-1': 2, '5-2': 1, '5-3': 1, '5-4': 1, '5-5': 1, '5-6': 2,
};

// Deck variants, in the shape the route exposes them (lowercase, JS-friendly)
// mapped to the exact filename token Shopify has on disk (case-sensitive).
const VARIANTS = { teacher: 'TEACHER', student: 'Student' };
const TRACKS = { cb: 'CB', deepDive: 'DeepDive' };

function isKnownLesson(lessonId) {
  return Object.prototype.hasOwnProperty.call(DAY_COUNT_BY_LESSON, lessonId);
}

function dayCount(lessonId) {
  return DAY_COUNT_BY_LESSON[lessonId] || 0;
}

function deckUrl(lessonId, day, variant, track) {
  const name = `AP-CSP_${lessonId}_Day${day}_Deck_${VARIANTS[variant]}_${TRACKS[track]}_${BATCH_TOKEN}.pptx`;
  return `${CDN_BASE}/${name}`;
}

// Every deck for a lesson, across every day/variant/track combination.
// `variants` restricts which role-variants to include (e.g. a student caller
// never gets TEACHER-variant decks, even when entitled).
//
// `embedUrl` is present only for decks that have been converted to Google
// Slides (config/csp-slide-embeds.js). It is deliberately omitted rather than
// set to null when there is no conversion yet, so a client can branch on the
// key existing: converted decks render inline, the rest stay download-only.
// That makes a partial conversion a working state instead of a broken one.
function decksForLesson(lessonId, variants) {
  if (!isKnownLesson(lessonId)) return null;
  const days = dayCount(lessonId);
  const wantVariants = variants || Object.keys(VARIANTS);
  const decks = [];
  for (let day = 1; day <= days; day++) {
    for (const variant of wantVariants) {
      for (const track of Object.keys(TRACKS)) {
        const deck = { day, variant, track, url: deckUrl(lessonId, day, variant, track) };
        const id = embeds.slideId(lessonId, day, variant, track);
        if (id) deck.embedUrl = embeds.embedUrl(id);
        decks.push(deck);
      }
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
  TRACK_KEYS: Object.keys(TRACKS),
};
