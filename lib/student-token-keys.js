'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  WHERE A SIGNED-IN STUDENT'S TOKEN LIVES IN THE BROWSER.
//
//  One authority for a list that was pasted into four browser scripts and got it
//  wrong in two of them. The scripts themselves cannot require this: they are
//  ES5, served standalone and loaded cross origin with no build step. So this
//  module is what the GUARD reads, and smoke/student-token-keys.js fails if any
//  player stops resolving one of these.
//
//  THE ONE THAT MATTERS IS FIRST. `apcse_token` is what the storefront actually
//  writes: shopify/join.html does `localStorage.setItem('apcse_token', token)` at
//  sign-in, theme.liquid decides 'logged-in-student' by reading it, and all 20
//  token references in the theme use it. The others are older spellings kept
//  because a page body somewhere may still set one, and page bodies cost a
//  Matrixify import to change while this list costs a deploy.
//
//  HOW THE WRONG KEY HID FOR A WEEK. The 1.1 analysis lab page read
//  `apcs_student_token` and nothing else. Nothing writes that key, so a signed-in
//  student sent no Authorization header, the server saw an anonymous request, and
//  the teacher's lock could not bind them. It was invisible because the anonymous
//  rule in force until board 277 refused anonymous callers anyway, so the page
//  LOOKED locked. Opening the anonymous case is what exposed it: reported the
//  same day as "it didn't lock when the teacher locked it for a student".
//
//  So a missing token is not a neutral failure. It silently downgrades a student
//  to a passer-by, and every gate on this site answers "is this open for MY
//  class". No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

//  A global set by a page that already has the token in hand, checked before any
//  storage read.
const GLOBAL_KEY = 'APCS_STUDENT_TOKEN';

//  localStorage keys, in the order a player must try them.
const STORAGE_KEYS = [
  'apcse_token',          // what join.html writes and the whole theme reads
  'apcs_student_token',   // older spelling, still in some generated page bodies
  'student_token',        // older still
];

module.exports = { GLOBAL_KEY, STORAGE_KEYS };
