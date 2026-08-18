'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  TEACHER BUNDLE SLIDES GATE.
//
//  GET /api/slides/:course/:lessonId answers "what by-day slide decks does
//  this lesson have, and does this caller get the real files?" for the AP CSP
//  Teacher Bundle. It is the free-overview + locked-gate pair Tanner asked
//  for: every caller (even anonymous) learns the lesson's day-by-day
//  structure, but the actual downloadable Shopify URLs are withheld from the
//  response entirely unless the caller is entitled. A client-side show/hide
//  of a link that is already sitting in the page HTML is not a gate; the
//  server must never put the real URL on the wire until it has checked.
//
//  Role-agnostic on purpose, same reasoning as routes/gate.js: a teacher
//  token AND a student token can both be entitled ("premium students/
//  teachers" per the ask), so this cannot use requireTeacher or requireStudent
//  (each rejects the other role). It re-verifies the signature itself and
//  branches on the payload's own role claim, same pattern gate.js uses and
//  the same reason: utils.js is owned elsewhere, so a local, duplicated
//  verifier is preferred over adding an export there.
//
//  Only ap-csp is wired today; that is the only course with by-day decks in
//  the Shopify file library (see config/csp-slide-manifest.js). Any other
//  course 404s rather than pretending to have content.
//
//  Variant filtering is a real security boundary, not a UI nicety: an
//  entitled STUDENT never receives TEACHER-variant decks (answer keys and
//  teaching notes), even though their class's teacher is fully entitled. Only
//  an entitled TEACHER sees both variants.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { verifyStudentToken } = require('../utils');
const entitlements = require('../lib/entitlements');
const manifest = require('../config/csp-slide-manifest');
const { makeRateLimit } = require('../lib/rate-limit');

// Fires on every lesson-page view, same sizing rationale as the student
// entitlement route: loose enough that a whole school on one NAT IP never
// trips it, tight enough to cap a runaway client loop.
const slidesLimit = makeRateLimit({
  windowMs: 60 * 1000, max: 300, maxKeys: 2000,
  message: 'Too many requests. Please wait a moment and try again.',
});

// Role-agnostic verify: the signature check is identical for both token
// kinds (same JWT_SECRET, only the label differs), so verifying with one
// verifier and trusting the payload's own role claim is safe. Returns null
// on any failure rather than throwing.
function verifyAnyToken(token) {
  try { return verifyStudentToken(token); } catch (e) { return null; }
}

const SUPPORTED_COURSES = new Set(['ap-csp']);

router.get('/:course/:lessonId', slidesLimit, (req, res) => {
  const course = String(req.params.course || '');
  const lessonId = String(req.params.lessonId || '');

  if (!SUPPORTED_COURSES.has(course)) {
    return res.status(404).json({ error: 'Slides are not available for this course yet' });
  }
  if (!manifest.isKnownLesson(lessonId)) {
    return res.status(404).json({ error: 'Unknown lesson' });
  }

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = token ? verifyAnyToken(token) : null;

  // What this caller is entitled to see, expressed as which deck VARIANTS
  // they may receive. Empty = locked (the free-overview path).
  let allowedVariants = [];
  if (payload && payload.role === 'teacher' && entitlements.evaluateTeacherGate(payload.id, course)) {
    allowedVariants = manifest.VARIANT_KEYS; // teacher + student decks
  } else if (payload && payload.role === 'student' && entitlements.evaluateStudentGate(payload.id, course)) {
    allowedVariants = ['student']; // never the teacher-only decks
  }

  const locked = allowedVariants.length === 0;

  // Never cached: the URL is identical for every caller and the HTTP cache
  // does not key on Authorization, so a cached response would hand the next
  // caller on a shared machine someone else's unlocked decks.
  res.set('Cache-Control', 'no-store');
  res.json({
    course,
    lessonId,
    days: manifest.dayCount(lessonId),
    tracks: manifest.TRACK_KEYS,
    variants: manifest.VARIANT_KEYS,
    locked,
    // The actual gate: real URLs exist in this payload ONLY when entitled.
    decks: locked ? null : manifest.decksForLesson(lessonId, allowedVariants),
  });
});

module.exports = router;
