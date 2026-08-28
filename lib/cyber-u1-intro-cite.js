'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  UNIT 1 STUDY GUIDE: THREE TIP BOXES, THREE DIFFERENT PROBLEMS.
//
//  The sixth lesson-shaped page in Unit 1, and the one no sheet in this project
//  had ever touched.
//
//  1. "When analyzing phishing scenarios on the AP exam" frames good advice
//     about layered tactics as advice about an exam. The advice is true of any
//     phishing message and does not need the frame.
//
//  2. "The AP exam often presents log file analysis questions" is a frequency
//     claim about an exam that has not been administered. The four indicators
//     under it are real and are the content.
//
//  3. Is NOT a frequency claim, and is handled differently on purpose.
//     "Collaborate is one of the four core skills, specifically mentioning
//     collaboration with AI" is TRUE and checkable. What it does wrong is
//     smaller: it hands a student the exam's structure as the reason to care.
//     So the fact survives intact and only its framing moves, from what the
//     exam includes to what this course is built on. Deleting a true statement
//     because it mentions the exam would be the overcleaning this pass is
//     explicitly not doing.
// ─────────────────────────────────────────────────────────────────────────────

const { makeApplySplices } = require('./cyber-splice');

const HANDLE = 'ap-cybersecurity-unit-1-introduction-to-security';
const PAGE_ID = '130318827735';
const TITLE = 'AP Cybersecurity Unit 1 Study Guide (2026) - Introduction to Cybersecurity';

const SPLICES = [
  { name: 'phishing scenarios framing',
    from: 'When analyzing phishing scenarios on the AP exam, look for <strong>multiple social engineering tactics</strong> being used together.',
    html: 'When you analyze a phishing scenario, look for <strong>multiple social engineering tactics</strong> being used together.' },

  { name: 'log file frequency claim',
    from: 'The AP exam often presents log file analysis questions. Practice identifying:',
    html: 'Reading a log file is a skill worth drilling. Practice identifying:' },

  { name: 'Collaborate framing, not the fact',
    from: 'The AP Cybersecurity exam includes "Collaborate" as one of the four core skills, specifically mentioning collaboration "with AI."',
    html: '"Collaborate" is one of this course\'s four core skills, and it specifically covers collaborating "with AI."' },
];

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices: makeApplySplices(SPLICES) };
