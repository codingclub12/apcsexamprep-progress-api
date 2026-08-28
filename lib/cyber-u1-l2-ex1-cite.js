'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  1.2 EXERCISE 1: ONE FREQUENCY CLAIM AND ONE CODE.
//
//  The tip box is good advice about reading an authentication log, wrapped in a
//  claim about how often the exam shows you one. AP Cybersecurity has not been
//  administered, so "frequently presents" describes nothing that has happened.
//  The advice is the half that survives; the heading survives with it, because a
//  heading over advice is not a claim.
//
//  The code is a parenthetical in a task instruction. A student cannot look
//  1.2.C up and does not need to: the sentence already says what it means, in
//  words, immediately before the code.
//
//    node scripts/cyber-cite-csv.js cyber-u1-l2-ex1-cite out/l2-ex1-cite.csv --show-changes --live <f>
// ─────────────────────────────────────────────────────────────────────────────

const { makeApplySplices } = require('./cyber-splice');

const HANDLE = 'ap-cyber-unit-1-lesson-2-exercise-1';
const PAGE_ID = '132213702871';
const TITLE = 'AP Cybersecurity Unit 1 Lesson 2 Exercise 1';

const SPLICES = [
  { name: 'log-table frequency claim',
    from: 'The exam frequently presents authentication log tables and asks you to identify attack indicators.',
    html: 'Reading an authentication log table starts with the attack indicators.' },

  { name: 'strengthen-authentication code',
    from: 'about making authentication stronger (1.2.C), recommend fixes',
    html: 'about making authentication stronger, recommend fixes' },
];

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices: makeApplySplices(SPLICES) };
