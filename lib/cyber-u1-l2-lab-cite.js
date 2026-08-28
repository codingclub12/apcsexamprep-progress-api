'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  1.2 LAB: TWO CLAIMS IN ONE BOX.
//
//  "The exam frequently gives you a log" and "appears together on real exams".
//  The second is the one worth naming: there are no real exams to have appeared
//  on. The three attacks genuinely are easiest to separate side by side, which
//  is the true version of the same sentence and the one that survives.
// ─────────────────────────────────────────────────────────────────────────────

const { makeApplySplices } = require('./cyber-splice');

const HANDLE = 'ap-cyber-unit-1-lesson-2-lab';
const PAGE_ID = '132289593559';
const TITLE = 'AP Cybersecurity Unit 1 Lesson 2 Lab';

const SPLICES = [
  { name: 'log-or-scenario frequency claim',
    from: 'The exam frequently gives you a log or scenario and asks you to name the attack type AND the appropriate control.',
    html: 'A log or a scenario wants two answers: the attack type AND the appropriate control.' },

  { name: 'appears on real exams',
    from: 'The three-attack pattern in this lab (brute force / spraying / stuffing) appears together on real exams.',
    html: 'The three attacks in this lab (brute force / spraying / stuffing) are easiest to tell apart side by side.' },
];

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices: makeApplySplices(SPLICES) };
