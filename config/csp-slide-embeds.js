'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CSP TEACHER BUNDLE: GOOGLE SLIDES FILE IDS.
//
//  GENERATED FILE. Do not hand-edit. Regenerate with:
//    node scripts/csp-slide-embeds-from-csv.js <exported-map.csv>
//
//  The source of truth is the `AP CSP Slides Map` sheet that the Apps Script
//  conversion writes into Drive (one row per converted deck: lesson, day,
//  variant, track, sourceName, slidesId, embedUrl, status).
//
//  WHY IDS AND NOT URLS. Every other deck URL in this repo is DERIVED from a
//  filename convention (see config/csp-slide-manifest.js), so one token change
//  updates 224 links. Google Slides IDs are opaque and per-file, so they have
//  to be stored. Storing the bare ID rather than the full embed URL keeps the
//  embed parameters in exactly one place and means a malformed URL in the
//  spreadsheet cannot propagate into the API response.
//
//  SENSITIVITY. These IDs are credentials in every sense that matters. The
//  converted decks are shared "anyone with the link can view", because the
//  paying teacher is gated on their APCSExamPrep teacher token and not on a
//  Google account, so Google itself cannot do the gating. That means holding
//  the ID IS access. Treat an ID exactly like the .pptx URL it replaces: it
//  must never appear in a response to an unentitled caller, and never in page
//  HTML. routes/slides.js is the only thing that may disclose one.
//
//  An empty map is a valid state: it means the conversion has not run yet, and
//  the gate falls back to handing out .pptx download links alone.
// ─────────────────────────────────────────────────────────────────────────────

// Key format: `<lessonId>|<day>|<variant>|<track>`, e.g. `1-2|1|teacher|cb`.
// Variant and track use the route's lowercase keys, not the filename casing.
const SLIDE_IDS = {
};

// Set by the generator so a stale map is diagnosable from the file alone.
const GENERATED_AT = null;

function slideId(lessonId, day, variant, track) {
  const key = `${lessonId}|${day}|${variant}|${track}`;
  return Object.prototype.hasOwnProperty.call(SLIDE_IDS, key) ? SLIDE_IDS[key] : null;
}

// The embed parameters live here and nowhere else. `rm=minimal` drops the
// Slides chrome so the deck sits in the lesson page rather than looking like a
// borrowed Google window; autoplay stays off so 35 lesson pages do not each
// start advancing slides at a student.
function embedUrl(id) {
  return `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false&rm=minimal`;
}

function count() {
  return Object.keys(SLIDE_IDS).length;
}

module.exports = { slideId, embedUrl, count, GENERATED_AT };
