'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  PAGE SCOPE: what kind of page is the caller on?
//
//  Derived from the URL, SERVER SIDE, always. The client never asserts its own
//  scope, because scope is what decides whether a caller is treated as a minor
//  and whether their typed text is stored. A client-asserted scope would be a
//  client-asserted privacy posture.
//
//  The activity classifier is NOT reimplemented here. utils.trailingActivity is
//  the same function the grading path uses to decide whether a handle is a quiz,
//  an exam, a lab or a lesson, so a page that grades as a quiz is a quiz here
//  too. A second copy of that rule would eventually disagree with the first, and
//  the disagreement would be silent and on the wrong side: an assessment page
//  classified as 'general' is the assistant standing next to a graded quiz.
//
//  docs/site-assistant-spec.md sections 5 (layer 4) and 7.
// ─────────────────────────────────────────────────────────────────────────────
const { trailingActivity } = require('../../utils');

// Anything that is a graded artifact. The widget must not load on these at all
// (spec layer 4); this exists so the SERVER can also refuse, for the case where
// a page is mis-templated and the script loads anyway.
const ASSESSMENT = new Set(['quiz', 'exam']);

// Ungraded-to-lightly-graded practice surfaces. Not assessment, but still a
// place where a student is working a problem, so it is treated as student-shaped
// for retention purposes.
const PRACTICE = new Set(['lab', 'exercise-1', 'exercise-2', 'exercise-3', 'code', 'gap', 'debug']);

// Path prefixes that are unambiguously commerce or account surfaces. Adults,
// no coursework, no graded content.
const COMMERCE_HINTS = [
  '/products/', '/collections/', '/cart', '/checkout',
  '/pages/pricing', '/pages/teacher-bundles', '/pages/redeem', '/pages/order',
];

const TEACHER_HINTS = ['/admin', '/pages/teacher', '/teacher/', '/pages/command'];

// The student's own dashboard. Its own scope rather than 'general' for two
// reasons, and the second is the one that was actually wrong before Phase 4.
//
// It is where student chat lives, and the only place it lives: spec section 3.5
// puts the report affordance on lesson and lab pages and nothing at all on
// assessment pages, and the three tools a student gets (their gates, their
// progress, whether a score recorded) are dashboard questions rather than
// lesson-page questions.
//
// And an ANONYMOUS caller here is almost certainly a signed-out student. As
// 'general' this page retained bodies for an unauthenticated caller, which is
// the exact case spec section 8 says to downgrade. Naming the scope fixes that
// by construction rather than by remembering.
const STUDENT_HINTS = ['/pages/my-progress', '/pages/join', '/pages/my-'];

// Parse a URL string without throwing. Returns { pathname, host } or null.
function parseUrl(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    // A bare path is legal input from a widget; give it a base so URL accepts it.
    const u = new URL(raw, 'https://apcsexamprep.com');
    return { pathname: u.pathname || '/', host: u.host };
  } catch (_) {
    return null;
  }
}

// The Shopify page handle, if this is a /pages/ URL. Handles are what
// trailingActivity understands.
function handleOf(pathname) {
  const m = /^\/pages\/([^/]+)\/?$/.exec(pathname);
  return m ? m[1].toLowerCase() : null;
}

// URL -> one of: assessment | lab | lesson | teacher_portal | commerce | general
//
// 'assessment' is deliberately a scope of its own rather than folded into
// 'lesson'. The two get different treatment everywhere downstream, and a single
// bucket would make the difference a matter of remembering to check.
function pageScope(rawUrl) {
  const parsed = parseUrl(rawUrl);
  if (!parsed) return 'general';
  const p = parsed.pathname.toLowerCase();

  for (const hint of TEACHER_HINTS) if (p.startsWith(hint)) return 'teacher_portal';
  for (const hint of STUDENT_HINTS) if (p.startsWith(hint)) return 'student_portal';
  for (const hint of COMMERCE_HINTS) if (p.startsWith(hint)) return 'commerce';

  const handle = handleOf(p);
  if (!handle) return 'general';

  const activity = trailingActivity(handle);
  if (ASSESSMENT.has(activity)) return 'assessment';
  if (PRACTICE.has(activity)) return 'lab';

  // A /pages/ handle that names a course is a lesson or hub page. Anything else
  // under /pages/ (about, contact, blog index) is general.
  if (/^(ap-csa|ap-csp|ap-cybersecurity|ap-networking|intro-java)\b/.test(handle)) return 'lesson';
  return 'general';
}

// Does a caller in this (role, scope) have their typed text kept?
//
// The rule that matters: a student never has free text stored, anywhere, and an
// ANONYMOUS caller on a coursework page is treated as a student. Spec section 8
// downgrades an anonymous session that resolves to a student; on a lesson page
// the odds that an unauthenticated caller is a signed-out minor are high enough
// that guessing the other way is the wrong default. Guessing wrong costs a
// sentence of prose. Guessing wrong the other way stores text typed by a child.
//
// Teachers are adults with accounts. Anonymous callers on commerce and general
// pages are adults shopping.
//  student_portal joins this set in Phase 4. Nobody signed OUT has business
//  typing into a page that exists to show a minor their own grades, and the
//  likeliest such caller is that minor with an expired token.
const COURSEWORK = new Set(['lesson', 'lab', 'assessment', 'student_portal']);

function retainsBodies(role, scope) {
  if (role === 'student') return false;
  if (role === 'teacher') return true;
  return !COURSEWORK.has(scope); // anonymous
}

module.exports = { pageScope, retainsBodies, parseUrl, handleOf, COURSEWORK, STUDENT_HINTS };
