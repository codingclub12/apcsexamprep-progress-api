'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  1.1 EXERCISE 1: THE LAST EXAM CLAIM IN UNIT 1, PLUS THREE CODES IN REVEALS.
//
//  The claim, "one of the most frequently tested skills on the AP Cybersecurity
//  exam", is the one this project has reported twice and never had a sheet for:
//  the seven claim sheets covered the lesson pages and the four 1.4 artifacts,
//  and this page is neither.
//
//  ── CODES THAT innerText CANNOT SEE, AND A STUDENT CAN ─────────────────────
//  Three sit in `principle:` strings and one in a hover reveal. A page-load
//  sweep reports this page as painting zero codes, and that is true and
//  misleading: the strings are what the exercise shows when a student clicks a
//  red flag, which is the entire point of the exercise. They are handled as if
//  they were painted, because to a student they are.
//
//  ── THE JSON-LD DESCRIPTION ────────────────────────────────────────────────
//  Also cites the course description, by name and code. Not painted, and not
//  nothing: it is the sentence a search result shows. One splice, and it stays
//  inside the JSON string so the block still parses.
// ─────────────────────────────────────────────────────────────────────────────

const { makeApplySplices } = require('./cyber-splice');

const HANDLE = 'ap-cyber-unit-1-lesson-1-exercise-1';
const PAGE_ID = '131898998999';
const TITLE = 'AP Cybersecurity Unit 1 Lesson 1 Exercise 1';

const SPLICES = [
  { name: 'the last exam claim in Unit 1',
    from: 'in a real phishing email &mdash; one of the most frequently tested skills on the AP Cybersecurity exam.',
    html: 'in a real phishing email, the skill this whole topic is built around.' },

  { name: 'JSON-LD description citation',
    from: 'in a realistic email: the two tactics the AP Cybersecurity CED names at 1.1.A.2, intimidation and urgency, and the impact on the victim.',
    html: 'in a realistic email: the two tactics Topic 1.1 names, intimidation and urgency, and the impact on the victim.' },

  { name: 'reveal: personal information code',
    from: 'the personal information EK 1.1.C.1 describes, the kind that makes a follow-up message sound like it knows you.',
    html: 'the kind of personal detail that makes a follow-up message sound like it knows you.' },

  { name: 'principle: bulk indicator',
    from: "principle:'Indicator: Sent in bulk, so no personal detail (contrast EK 1.1.C.1)'",
    html: "principle:'Indicator: Sent in bulk, so no personal detail'" },

  { name: 'reveal: authority belongs to Unit 2',
    from: 'is impersonating an authority, which the CED does name, at 2.1.A.3 in Unit 2.',
    html: 'is impersonating an authority, which belongs to Unit 2.' },

  { name: 'principle: urgency codes',
    from: "principle:'Psychological Tactic: Urgency (1.1.A.2, mechanism 1.1.B.3)'",
    html: "principle:'Psychological Tactic: Urgency, applied through a deadline'" },
];

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices: makeApplySplices(SPLICES) };
