'use strict';
// ---------------------------------------------------------------------------
//  AP NETWORKING TEACHER BUNDLE: GOOGLE SLIDES FILE IDS.
//
//  GENERATED FILE, eventually. Regenerate with a networking equivalent of
//  scripts/cyber-slide-embeds-from-csv.js once one exists.
//
//  THIS MAP IS EMPTY ON PURPOSE, AND THE REASON IS DIFFERENT FROM CSA'S.
//  config/csa-slide-embeds.js is empty because no CSA deck had been authored.
//  All 44 networking decks EXIST and are finished: 22 topics, each with a
//  Teacher and a Student edition, sitting in Google Drive under
//  `AP Networking Course Materials/APNetworkingUnit<N>Decks/<topic>/decks/`.
//
//  They are .pptx files, and not one of them has been converted to Google
//  Slides. Checked 2026-09-04 against the Drive API:
//
//      title contains 'AP-Networking'
//        and mimeType = 'application/vnd.google-apps.presentation'
//      -> {}
//
//  embedUrl below builds a docs.google.com/presentation/d/<id>/embed URL, and
//  a .pptx Drive id does not resolve there. So a Drive file id must NEVER be
//  pasted into this map as though it were a Slides id: it would produce 44
//  entries that all render a broken frame, which is worse than the honest
//  empty state, because the empty state tells a teacher the truth.
//
//  The conversion is the missing step, not the authoring. Whoever runs it
//  fills this map and nothing else in the pipe needs to change.
//
//  Same key format as config/cyber-slide-embeds.js and
//  config/csa-slide-embeds.js: `<lessonId>|<day>|<variant>`, e.g.
//  `1-1|1|teacher`. No track segment; networking has no CB Standard / Deep
//  Dive split.
//
//  ONE DECISION IS DEFERRED TO WHOEVER CONVERTS, and it is worth reading
//  config/networking-slide-manifest.js's header before making it: a
//  networking deck is a WHOLE-TOPIC deck, one per topic, while the day counts
//  in the manifest are the topic's real teaching length (2 or 3 periods,
//  mostly). Keying the single deck as `|1|` means a three-period topic shows
//  one deck labelled Day 1. Splitting it into per-day decks first is the other
//  option. That is a content call, not a plumbing one.
//
//  SENSITIVITY. A Google Slides id is a credential in every sense that
//  matters here: the converted decks would be shared "anyone with the link can
//  view", because the paying teacher is gated on their APCSExamPrep teacher
//  token and not on a Google account, so Google itself cannot do the gating.
//  Holding the id IS access. It must never appear in a response to an
//  unentitled caller, and never in page HTML. routes/slides.js is the only
//  thing that may disclose one, unchanged by this file's addition.
//
//  That sensitivity is not hypothetical for this course. Board task 232
//  records that /pages/ap-networking-command-center already publishes 22
//  teacher-folder links and 4 unit-assessment folder links to anonymous
//  visitors, against Drive folders shared anyone-with-link. Filling this map
//  puts a second copy of the same material behind a real server-side gate.
//  It does not close the first hole, and finishing here must not be mistaken
//  for having done so.
// ---------------------------------------------------------------------------

// Key format: `<lessonId>|<day>|<variant>`, e.g. `2-3|1|teacher`.
const SLIDE_IDS = {};

// Set by whichever generator first writes real rows here, so a stale map is
// diagnosable from the file alone, same convention as the three sibling embed
// files. Null rather than a fabricated date: no generation has ever run.
const GENERATED_AT = null;

function slideId(lessonId, day, variant) {
  const key = `${lessonId}|${day}|${variant}`;
  return Object.prototype.hasOwnProperty.call(SLIDE_IDS, key) ? SLIDE_IDS[key] : null;
}

// The embed parameters live here and nowhere else, matching all three sibling
// files, so a future real conversion needs no new decision about the embed
// query string.
function embedUrl(id) {
  return `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false`;
}

function count() {
  return Object.keys(SLIDE_IDS).length;
}

module.exports = { slideId, embedUrl, count, GENERATED_AT };
