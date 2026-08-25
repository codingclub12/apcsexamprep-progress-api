'use strict';
// ---------------------------------------------------------------------------
//  AP CYBERSECURITY TEACHER BUNDLE: GOOGLE SLIDES FILE IDS.
//
//  GENERATED FILE. Do not hand-edit. Regenerate with:
//    node scripts/cyber-slide-embeds-from-csv.js <exported-map.csv>
//
//  The source of truth is the `AP Cyber Slides Map` sheet that the Apps Script
//  conversion writes into Drive (one row per converted deck: lesson, day,
//  variant, sourceName, slidesId, embedUrl, status).
//
//  WHY THIS COURSE IS EMBED-ONLY, unlike AP CSP. Cyber decks were never
//  uploaded to Shopify: the whole cyber file library there is two PDFs. There
//  is no .pptx URL to serve and none is planned, so a Slides id is not an
//  optimisation here, it is the ONLY way a teacher reaches a deck. A teacher
//  who wants an editable copy uses File > Make a copy, which is why the
//  conversion must not set copyRequiresWriterPermission.
//
//  SENSITIVITY. These IDs are credentials in every sense that matters. The
//  converted decks are shared "anyone with the link can view", because the
//  paying teacher is gated on their APCSExamPrep teacher token and not on a
//  Google account, so Google itself cannot do the gating. Holding the ID IS
//  access. It must never appear in a response to an unentitled caller, and
//  never in page HTML. routes/slides.js is the only thing that may disclose
//  one.
//
//  That matters more here than it did for CSP. A cyber TEACHER deck carries
//  per-slide speaker notes, timing cues, cold-call prompts and misconception
//  alerts that the STUDENT deck does not, and it is one click from rendering.
//  An entitled student must never receive one.
//
//  An empty map is a valid state: it means the conversion has not run yet. For
//  this course that means the lesson has no decks to show at all rather than
//  falling back to downloads, so the gate reports zero decks rather than
//  pretending. See config/cyber-slide-manifest.js.
// ---------------------------------------------------------------------------

// Key format: `<lessonId>|<day>|<variant>`, e.g. `1-2|3|teacher`.
//
// Note there is no track segment. AP CSP splits every deck across a CB
// Standard and a Deep Dive track; cyber has no such dimension, only the
// STUDENT/TEACHER variant. Adding a track here later would be a key-format
// change, so the generator refuses any row that carries one.
const SLIDE_IDS = {
};

// Set by the generator so a stale map is diagnosable from the file alone.
const GENERATED_AT = null;

function slideId(lessonId, day, variant) {
  const key = `${lessonId}|${day}|${variant}`;
  return Object.prototype.hasOwnProperty.call(SLIDE_IDS, key) ? SLIDE_IDS[key] : null;
}

// The embed parameters live here and nowhere else.
//
// Deliberately NOT rm=minimal, matching the CSP decision and for the same
// reason: rm=minimal hides the Slides toolbar, which is where the
// previous/next controls, the slide counter and the fullscreen button live. A
// teacher projecting a deck in class needs all three more than the frame needs
// to blend into the page.
//
// autoplay stays off: a lesson page should not start advancing slides on its
// own.
function embedUrl(id) {
  return `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false`;
}

function count() {
  return Object.keys(SLIDE_IDS).length;
}

module.exports = { slideId, embedUrl, count, GENERATED_AT };
