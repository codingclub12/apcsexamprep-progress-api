'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  1.5 EXERCISE 2: A CLAIM, AND "CED SCENARIO 1E" INSIDE AN OPTION LABEL.
//
//  Scenario 1E is a name for a worked example in a document a student cannot
//  open. The 1.5 lesson page had nine of these and every one became a reference
//  to the scenario itself; this is the same substitution on the one that lives
//  here.
//
//  The text edited is an <option>'s LABEL. Its value is untouched, so the
//  grading code, which compares values, cannot notice.
// ─────────────────────────────────────────────────────────────────────────────

const { makeApplySplices } = require('./cyber-splice');

const HANDLE = 'ap-cyber-unit-1-lesson-5-exercise-2';
const PAGE_ID = '132673765591';
const TITLE = 'AP Cybersecurity Unit 1 Lesson 5 Exercise 2';

const SPLICES = [
  { name: 'hardest AI defense questions claim',
    from: 'The hardest AP exam questions about AI defense combine two concepts in one scenario:',
    html: 'The hardest AI defense scenarios combine two concepts at once:' },

  { name: 'CED Scenario 1E in an option label',
    from: 'is exactly the human oversight gap the CED Scenario 1E warns against.',
    html: 'is exactly the kind of human oversight gap this unit warns about.' },
];

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices: makeApplySplices(SPLICES) };
