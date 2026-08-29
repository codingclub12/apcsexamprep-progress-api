'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  1.3 EXERCISE 2: THE SAME CLAIM AS EXERCISE 1, HEDGED WITH "ALMOST".
//
//  "almost always" is not a weaker claim about an exam that has not been given,
//  it is the same claim with a qualifier. The three things a wireless scenario
//  asks are real and stay.
// ─────────────────────────────────────────────────────────────────────────────

const { makeApplySplices } = require('./cyber-splice');

const HANDLE = 'ap-cyber-unit-1-lesson-3-exercise-2';
const PAGE_ID = '132330717399';
const TITLE = 'AP Cybersecurity Unit 1 Lesson 3 Exercise 2';

const SPLICES = [
  //  Found by the gate, not by reading: the section intro above Part 3 makes
  //  the same kind of claim as the tip box and sits nowhere near it.
  { name: 'Part 3 section intro claim',
    from: 'The AP exam presents multi-part scenarios requiring you to distinguish between attack types, evaluate controls, and explain the reasoning.',
    html: 'These scenarios have several parts: distinguish between attack types, evaluate controls, and explain the reasoning.' },

  { name: 'wireless questions almost always claim',
    from: 'AP exam wireless questions almost always give you a scenario and ask ONE of three things:',
    html: 'A wireless scenario asks ONE of three things:' },
];

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices: makeApplySplices(SPLICES) };
