'use strict';
// ---------------------------------------------------------------------------
//  AP CSA TEACHER BUNDLE: GOOGLE SLIDES FILE IDS.
//
//  GENERATED FILE, eventually. Regenerate with a CSA equivalent of
//  scripts/cyber-slide-embeds-from-csv.js once one exists.
//
//  THIS MAP IS EMPTY ON PURPOSE, AND STAYS THAT WAY UNTIL REAL CONTENT EXISTS.
//  No AP CSA slide deck has been authored or converted yet. Board task 183 and
//  docs/runs/2026-09-03-claude-code-csa-slides-pipe.md are the pipe-only pass
//  that wires the engineering path (route, manifest, entitlement, theme gate)
//  end to end for the Unit 1 pilot. This file is what proves that pipe is
//  honest rather than faked: config/csa-slide-manifest.js knows about all 15
//  Unit 1 lessons (isKnownLesson is true, so the route answers 200 instead of
//  404), and every one of them resolves zero decks, because zero decks exist.
//  An entitled caller sees "your access is active, decks are being prepared"
//  (assets/apcs-slides-gate.js's renderPending, proven correct for cyber's
//  identical wholly-unconverted-lesson state in smoke/cyber-slide-gate.js
//  section 5). Nobody, including this file's author, invented a placeholder
//  deck to make the panel look more finished than the content actually is.
//
//  Same key format as config/cyber-slide-embeds.js, the closer sibling
//  (embed-only, no track dimension): `<lessonId>|<day>|<variant>`, e.g.
//  `1-1|1|teacher`. Kept identical on purpose so a future CSA conversion
//  script can be a copy of scripts/cyber-slide-embeds-from-csv.js with the
//  output path changed, not a new format invented from scratch.
//
//  SENSITIVITY, for whoever fills this in later. A Google Slides id is a
//  credential in every sense that matters here: the converted decks would be
//  shared "anyone with the link can view", because the paying teacher is
//  gated on their APCSExamPrep teacher token and not on a Google account, so
//  Google itself cannot do the gating. Holding the id IS access. It must
//  never appear in a response to an unentitled caller, and never in page
//  HTML. routes/slides.js is the only thing that may disclose one, unchanged
//  by this file's addition.
//
//  An empty map is a valid, already-proven state: config/cyber-slide-manifest.js
//  documents the identical case ("An empty map is a valid state: it means the
//  conversion has not run yet"), and smoke/cyber-slide-gate.js's lesson 1-5
//  exercises it today with real assertions, not a hypothetical.
// ---------------------------------------------------------------------------

// Key format: `<lessonId>|<day>|<variant>`, e.g. `1-2|3|teacher`. No track
// segment, matching config/cyber-slide-embeds.js: CSA has no CB Standard /
// Deep Dive split planned.
const SLIDE_IDS = {};

// Set by whichever generator first writes real rows here, so a stale map is
// diagnosable from the file alone, same convention as the other two embed
// files. Null rather than a fabricated date: no generation has ever run.
const GENERATED_AT = null;

function slideId(lessonId, day, variant) {
  const key = `${lessonId}|${day}|${variant}`;
  return Object.prototype.hasOwnProperty.call(SLIDE_IDS, key) ? SLIDE_IDS[key] : null;
}

// The embed parameters live here and nowhere else, matching both sibling
// files, so a future real conversion needs no new decision about the embed
// query string.
function embedUrl(id) {
  return `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false`;
}

function count() {
  return Object.keys(SLIDE_IDS).length;
}

module.exports = { slideId, embedUrl, count, GENERATED_AT };
