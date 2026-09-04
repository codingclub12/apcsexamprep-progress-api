'use strict';
// ---------------------------------------------------------------------------
//  AP NETWORKING TEACHER BUNDLE SLIDE MANIFEST.
//
//  Same role as config/csp-slide-manifest.js, config/cyber-slide-manifest.js
//  and config/csa-slide-manifest.js, and it exports the identical shape so
//  routes/slides.js can select a manifest by course and never branch on the
//  course itself. See config/slide-manifests.js for the registry.
//
//  WHAT THIS FIXES. Until now `ap-networking` was absent from that registry,
//  so GET /api/slides/ap-networking/<anything> answered
//  `404 {"error":"Slides are not available for this course yet"}`, and it did
//  so BEFORE looking at the caller's token. A teacher holding a paid
//  ap-networking entitlement got the same 404 as an anonymous visitor, which
//  reads as "this course has no decks" rather than "your decks are not
//  converted yet". Those are different facts and a buyer can tell them apart.
//
//  WHAT THIS DOES NOT FIX, stated plainly because the gap is the whole story.
//  Wiring the manifest delivers zero decks. config/networking-slide-embeds.js
//  is empty: all 44 decks exist in Drive as .pptx and none has been converted
//  to Google Slides. So every lesson here is isKnownLesson true (the route
//  answers 200, so the pipe is provably wired) with decksForLesson returning
//  [], which assets/apcs-slides-gate.js renders as "your access is active, the
//  decks are being prepared". That is the honest entitled-with-nothing-to-show
//  state, and it is the same code path cyber's unconverted lessons and every
//  CSA lesson already exercise. It is an improvement on the 404 and it is not
//  delivery.
//
//  ── THE DAY COUNTS, AND WHY THEY ARE NOT 1 ─────────────────────────────────
//
//  A networking deck is a WHOLE-TOPIC deck. Each of the 22 topics has exactly
//  one Teacher and one Student edition, 14 slides each, which is where the
//  product page's "44 slide decks" comes from. There is no per-day deck set
//  anywhere in this course. So the count of deck slots per topic is 1.
//
//  The numbers below are not 1. They are the topic's real teaching length, and
//  three things decided that:
//
//  1. routes/slides.js documents `days` as what "every caller (even anonymous)
//     learns" about "the lesson's day-by-day structure". It describes the
//     LESSON, not the deck inventory. A topic that runs three periods runs
//     three periods whether or not anyone has cut the deck into three.
//  2. config/csa-slide-manifest.js already established the asymmetry: a count
//     that is too LOW silently hides decks that exist, while a count that is
//     too high "costs nothing but a few misses". decksForLesson walks day
//     1..dayCount and asks the embed map for each one, so an over-count is
//     free and an under-count is a bug that never announces itself.
//  3. It future-proofs the split. If the whole-topic decks are ever cut per
//     day, they resolve here with no edit to this file.
//
//  Today the choice is invisible either way, because the embed map is empty
//  and decksForLesson returns [] for every lesson regardless. The only thing
//  these numbers currently drive is the `days` integer in the free overview,
//  and there the topic's real length is the right answer.
//
//  WHERE THEY COME FROM, precisely, because the provenance matters more than
//  the numbers. Read 2026-09-04 out of the live page source of
//  /pages/ap-networking-command-center, which carries a `days:` field per
//  topic. They sum to 50 teaching days across 22 topics.
//
//  THEY ARE AN IN-HOUSE ESTIMATE AND MUST NEVER BE PRINTED AS AP PACING.
//  docs/ap-networking-full-year-readiness.md measured this against College
//  Board's published framework and found a literal unfilled placeholder:
//  "Topics in Unit 1-4 typically require [X-Y] class periods of instruction."
//  Nobody, College Board included, has published networking pacing. These
//  numbers are the site's own working estimate, they are fine as one, and a
//  claim that they match AP pacing would be fabrication.
//
//  ── THE MISLABEL HAZARD, WHICH IS REAL AND IS DEFERRED, NOT SOLVED ─────────
//
//  config/cyber-slide-manifest.js deliberately OMITS cyber Units 3 to 5 for
//  exactly the situation this course is in: those lessons have a single
//  whole-lesson deck, and listing one would "report days: 1 for a lesson that
//  actually runs six periods, and the panel would label a six-period deck
//  'Day 1'".
//
//  Cyber could omit them because the rest of that course has real per-day
//  decks. Networking cannot: every topic is whole-topic, so omitting on that
//  ground means 404ing the entire course, which is the defect being fixed.
//
//  So the hazard is deferred to conversion time rather than solved here, and
//  it lands on whoever fills the embed map. Keying the one deck as `|1|`
//  against a days: 3 topic shows a teacher one deck under a three-day heading
//  with two empty. Splitting the deck into per-day sets first is the other
//  option. Read config/networking-slide-embeds.js before choosing. Nothing in
//  this file forces either, and the empty map means neither is live today.
//
//  ── SCOPE ──────────────────────────────────────────────────────────────────
//
//  All 22 CED topics, 4 / 6 / 6 / 6 across the four units. That enumeration is
//  the framework's and is verified elsewhere in this repo:
//  docs/ap-networking-depth-audit.md checks the same 22 against the framework
//  PDF, and scripts/networking-ek-coverage.js re-derives it on every run. No
//  pilot subset, because unlike the CSA pipe there is no unit here whose
//  content is further along than another.
// ---------------------------------------------------------------------------

const embeds = require('./networking-slide-embeds');

// lessonId -> teaching days for that topic. See the header: this is the
// topic's length, not its deck count, and it is an in-house estimate read from
// the live Command Center page on 2026-09-04, never College Board pacing.
const DAY_COUNT_BY_LESSON = {
  '1-1': 3, '1-2': 2, '1-3': 2, '1-4': 2,
  '2-1': 2, '2-2': 3, '2-3': 2, '2-4': 2, '2-5': 2, '2-6': 2,
  '3-1': 1, '3-2': 3, '3-3': 3, '3-4': 2, '3-5': 2, '3-6': 3,
  '4-1': 2, '4-2': 3, '4-3': 1, '4-4': 3, '4-5': 3, '4-6': 2,
};

// Deck variants, in the shape the route exposes them (lowercase, JS-friendly)
// mapped to the filename token Drive has on disk.
//
// Note the casing: networking files are AP-Networking-<topic>-Teacher-Deck.pptx
// and -Student-Deck.pptx, so the token is Title case here. Cyber uses TEACHER
// and STUDENT, CSP uses Teacher and Student. All three genuinely differ,
// because the three courses were authored by different pipelines, and a regex
// copied from one course matches zero decks in another.
const VARIANTS = { teacher: 'Teacher', student: 'Student' };

// AP CSP splits every deck across a CB Standard and a Deep Dive track. Neither
// networking, CSA nor cyber has that dimension. Exported as an empty list
// rather than omitted so every consumer can read manifest.TRACK_KEYS uniformly
// and get an honest answer, matching the two sibling manifests exactly.
const TRACK_KEYS = [];

function isKnownLesson(lessonId) {
  return Object.prototype.hasOwnProperty.call(DAY_COUNT_BY_LESSON, lessonId);
}

function dayCount(lessonId) {
  return DAY_COUNT_BY_LESSON[lessonId] || 0;
}

// Every deck for a lesson that a caller can actually open. Identical logic to
// config/cyber-slide-manifest.js and config/csa-slide-manifest.js: a deck with
// no embed is omitted entirely rather than returned empty, because a
// networking deck (like a cyber or CSA one) has no Shopify .pptx fallback, so
// an unconverted slot is nothing at all rather than a download-only stub.
//
// `variants` restricts which role-variants to include: an entitled student
// never receives Teacher decks, which carry the answer reveals and the
// facilitation notes, even though their class's teacher is fully entitled.
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
