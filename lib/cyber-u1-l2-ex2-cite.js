'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  1.2 EXERCISE 2: ONE CLAIM ABOUT WHAT THE EXAM PRESENTS.
//
//  The five numbered points under it are the content and none of them depends
//  on the exam doing anything: longer beats complex, forced rotation produces
//  patterns, MFA does not rescue a weak first factor, shared accounts destroy
//  the audit trail, and a specific fix beats generic advice. Only the sentence
//  that frames them as a description of the exam goes.
// ─────────────────────────────────────────────────────────────────────────────

const { makeApplySplices } = require('./cyber-splice');

const HANDLE = 'ap-cyber-unit-1-lesson-2-exercise-2';
const PAGE_ID = '132214161623';
const TITLE = 'AP Cybersecurity Unit 1 Lesson 2 Exercise 2';

const SPLICES = [
  { name: 'authentication scenario claim',
    from: 'The exam presents authentication scenarios and asks you to evaluate security configurations.',
    html: 'Evaluating an authentication configuration comes down to five things.' },
];

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices: makeApplySplices(SPLICES) };
