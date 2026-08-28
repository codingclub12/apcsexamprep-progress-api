'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  1.1 QUIZ: THE PAGE PROMISES NINE QUESTIONS AND THE SERVER SERVES FIVE.
//
//  The count is left over from when the questions lived in the page body. The
//  quiz-mount sheet replaced that body with a container fed by
//  GET /api/quiz/ap-cybersecurity/unit-1/1.1/quiz, and the sentence introducing
//  it was never repriced.
//
//  FIVE IS THE RIGHT NUMBER, on three independent sources that agree:
//    * the live API returns total 5, pool 5, questions 5
//    * scripts/seed-cyber-denominators.js prices '1.1|quiz' at 5
//    * that file records WHY it is not 9: nine matched the teacher bundle's
//      paper Quiz_KEY.docx, and bundle instruments stay offline, because an
//      online quiz that copies the paper one destroys the paper one's security
//      for every teacher using it. The web quiz is a separate 5 item instrument
//      covering the same knowledge.
//
//  So this is the page catching up with a decision already made and already
//  reflected everywhere else, not a repricing. Nobody is regraded: score_events
//  carries earned and max_points per submission, and the gradebook prices an
//  attempted cell from the ledger rather than from the denominator table.
//
//  THE MINUTES ARE A JUDGEMENT AND ARE FLAGGED AS ONE. The page said fifteen
//  minutes for nine questions. Ten for five keeps roughly the same pace and is
//  the only number here not read off a source.
// ─────────────────────────────────────────────────────────────────────────────

const { makeApplySplices } = require('./cyber-splice');

const HANDLE = 'ap-cyber-unit-1-lesson-1-quiz';
const PAGE_ID = '132079517911';
const TITLE = 'AP Cybersecurity Unit 1 Lesson 1 Quiz';

const SPLICES = [
  { name: 'question count and time',
    from: '<p>9 questions, about 15 minutes.',
    html: '<p>5 questions, about 10 minutes.' },
];

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices: makeApplySplices(SPLICES) };
