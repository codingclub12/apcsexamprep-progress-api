'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  1.3 EXERCISE 1: "AP EXAM WIRELESS QUESTIONS ALWAYS GIVE YOU A SCENARIO".
//
//  They may well. Nobody knows: the exam has not been given. What is true and is
//  the whole value of the box is that a wireless scenario has three things to
//  answer, and the box then lists them correctly. The list is untouched.
// ─────────────────────────────────────────────────────────────────────────────

const { makeApplySplices } = require('./cyber-splice');

const HANDLE = 'ap-cyber-unit-1-lesson-3-exercise-1';
const PAGE_ID = '132323868887';
const TITLE = 'AP Cybersecurity Unit 1 Lesson 3 Exercise 1';

const SPLICES = [
  { name: 'wireless questions always claim',
    from: 'AP exam wireless questions always give you a scenario and ask: (1) which attack type matches',
    html: 'A wireless scenario has three things to answer: (1) which attack type matches' },
];

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices: makeApplySplices(SPLICES) };
