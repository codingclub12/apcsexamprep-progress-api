'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  1.2 QUIZ: TWELVE PROMISED, FIVE SERVED.
//
//  Same cause as 1.1 and the same three sources agree on five: the live API
//  returns total 5, the denominator table prices '1.2|quiz' at 5, and its
//  comment records the move explicitly, "(was 12, see 1.1 note)".
//
//  Twenty-five minutes for twelve questions becomes ten for five, which is the
//  one number here that is a judgement rather than a reading.
// ─────────────────────────────────────────────────────────────────────────────

const { makeApplySplices } = require('./cyber-splice');

const HANDLE = 'ap-cyber-unit-1-lesson-2-quiz';
const PAGE_ID = '132288872663';
const TITLE = 'AP Cybersecurity Unit 1 Lesson 2 Quiz';

const SPLICES = [
  { name: 'question count and time',
    from: '<p>12 questions, about 25 minutes.',
    html: '<p>5 questions, about 10 minutes.' },
];

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices: makeApplySplices(SPLICES) };
