'use strict';
// -----------------------------------------------------------------------------
//  ACTIVITY GATE - is this quiz open to this student right now?
//
//  WHAT THIS IS, AND WHAT IT IS NOT
//  key_releases answers "may the student SEE THE ANSWERS after submitting?".
//  This answers a different question: "may the student OPEN THE QUIZ AT ALL?".
//  A teacher who wants a quiz used as a graded assessment needs the second one,
//  because a quiz that is readable a week early is not an assessment, it is a
//  study guide. The two are deliberately separate rows: a quiz can be open with
//  its key withheld (the normal exam case), and a quiz can be closed with its
//  key already released (revision after the test).
//
//  THE GATE IS ONLY AS REAL AS THE RENDER PATH
//  This gate is enforced where the SERVER hands out questions, which is
//  routes/quiz.js against quiz_bank. It cannot protect a quiz whose questions
//  are baked into the Shopify page body, because there the browser already has
//  them before any code here runs. Hiding such a page client-side is theatre and
//  View Source defeats it. A page must be migrated onto the server render path
//  before locking it means anything. See docs/quiz-locking.md.
//
//  RESOLVED AT READ TIME, NEVER STORED
//  Same posture as mastery/passed and auto_dispatch capability elsewhere in this
//  repo: the class default is consulted on every read, so flipping a class from
//  open to locked re-gates every activity immediately, with no migration and no
//  stale flags to hunt down.
// -----------------------------------------------------------------------------

// Activity types the CLASS DEFAULT applies to. An explicit activity_gates row can
// open or close ANY activity type; this set only bounds the blanket default, so
// that a teacher switching a class to locked-by-default does not silently lock
// the practice exercises their students use for homework that night.
const DEFAULT_GATED = new Set(['quiz', 'exam']);

// cls is the student's class row, or null/undefined for public self-study.
// Returns { open, reason }. reason is for operator display and logs, never a
// gate input.
function resolveGate(row, cls, activity_type) {
  // Public self-study and solo (ME-) accounts have no teacher to open anything,
  // so a gate would lock them out of their own practice forever.
  if (!cls || !cls.id) return { open: true, reason: 'self-study' };

  if (row && row.open !== null && row.open !== undefined) {
    return row.open
      ? { open: true, reason: 'explicit-open' }
      : { open: false, reason: 'explicit-closed' };
  }

  const lockDefault = !!(cls.quiz_lock_default);
  if (!lockDefault) return { open: true, reason: 'class-default-open' };
  if (!DEFAULT_GATED.has(activity_type)) {
    return { open: true, reason: 'class-default-not-gated-type' };
  }
  return { open: false, reason: 'class-default-locked' };
}

module.exports = { resolveGate, DEFAULT_GATED };
