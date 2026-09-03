'use strict';
// ---------------------------------------------------------------------------
//  WHICH COURSES HAVE BY-DAY SLIDE DECKS, AND WHERE THEIR MANIFEST LIVES.
//
//  routes/slides.js used to carry a SUPPORTED_COURSES set and a single
//  hard-wired require of the CSP manifest. Adding a second course that way
//  means an `if (course === ...)` in the route, and then another one every
//  time a course differs in some small way.
//
//  Instead every manifest exports the same shape, and the route selects one
//  here. Same reasoning as lib/gradebook-contract.js: course-specific shape is
//  interpreted in exactly one place, and a route that branches on the course
//  is a bug in the selection rather than in the route.
//
//  The manifests genuinely differ, and the shared shape is what absorbs it:
//    ap-csp            decks have a .pptx url always, an embedUrl once
//                      converted, and a track (CB / Deep Dive).
//    ap-cybersecurity  decks have an embedUrl only, and no track at all.
//    ap-csa            same embed-only, no-track shape as ap-cybersecurity.
//                      Unit 1 pilot only (15 of 53 lessons; see
//                      config/csa-slide-manifest.js), and every lesson
//                      resolves zero decks today: no CSA deck has been
//                      authored yet, so this is the pipe wired ahead of the
//                      content, not content pretending to exist.
//
//  A course absent from this map 404s rather than pretending to have content.
// ---------------------------------------------------------------------------

const MANIFESTS = {
  'ap-csp': require('./csp-slide-manifest'),
  'ap-cybersecurity': require('./cyber-slide-manifest'),
  'ap-csa': require('./csa-slide-manifest'),
};

// Null rather than undefined for an unknown course, so the caller's check is
// explicit at the call site.
function forCourse(course) {
  return Object.prototype.hasOwnProperty.call(MANIFESTS, course)
    ? MANIFESTS[course]
    : null;
}

module.exports = { forCourse, COURSE_KEYS: Object.keys(MANIFESTS) };
