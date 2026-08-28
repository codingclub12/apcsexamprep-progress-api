'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  1.5 EXERCISE 1: ONE CLAIM, ONE CITATION IN A TASK INSTRUCTION.
//
//  "identify the AI defense application and the CED skill it primarily serves"
//  asks a student to name something out of a document they have never been
//  handed. The four skills are on the page; the citation adds nothing to the
//  instruction except a document name.
// ─────────────────────────────────────────────────────────────────────────────

const { makeApplySplices } = require('./cyber-splice');

const HANDLE = 'ap-cyber-unit-1-lesson-5-exercise-1';
const PAGE_ID = '132673798359';
const TITLE = 'AP Cybersecurity Unit 1 Lesson 5 Exercise 1';

const SPLICES = [
  { name: 'AI defense always tests claim',
    from: 'AP questions about AI defense always test: (1) matching the right AI tool to the right problem',
    html: 'Questions about AI defense turn on three things: (1) matching the right AI tool to the right problem' },

  { name: 'the CED skill it serves',
    from: 'identify the AI defense application and the CED skill it primarily serves.',
    html: 'identify the AI defense application and the skill it primarily serves.' },
];

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices: makeApplySplices(SPLICES) };
