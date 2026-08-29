'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  1.3 QUIZ: TWO MENTIONS, ONE OF THEM IN A QUESTION PROMPT.
//
//  "What determines adversary skill level according to the CED?" asks a student
//  to answer out of a document they have never been handed. The question it is
//  actually asking is a good one and survives; only the authority it appeals to
//  changes, from a document to the thing itself.
//
//  The second is in an answer explanation and does the same work: "the CED
//  defines low-skilled adversaries as" is a citation where a definition will do.
// ─────────────────────────────────────────────────────────────────────────────

const { makeApplySplices } = require('./cyber-splice');

const HANDLE = 'ap-cyber-unit-1-lesson-3-quiz';
const PAGE_ID = '132351983831';
const TITLE = 'AP Cybersecurity Unit 1 Lesson 3 Quiz';

const SPLICES = [
  { name: 'Q2 predict-first prompt',
    from: 'Predict first: What determines adversary skill level according to the CED?',
    html: 'Predict first: What makes an adversary low-skilled rather than high-skilled?' },

  { name: 'Q2 answer explanation',
    from: 'C is correct: the CED defines low-skilled adversaries as those who use tools created by others',
    html: 'C is correct: low-skilled adversaries are the ones who use tools created by others' },
];

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices: makeApplySplices(SPLICES) };
