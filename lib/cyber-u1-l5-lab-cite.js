'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  1.5 LAB: A CLAIM AT EACH END OF THE SAME BOX.
//
//  It opens with what "SOC analyst questions on the AP exam test" and closes
//  with how "the AP exam treats these very differently". The distinction it is
//  drawing, between the AI raising an alert and a human deciding what to do
//  about it, is the actual lesson of the lab and does not need an exam to be
//  worth knowing.
// ─────────────────────────────────────────────────────────────────────────────

const { makeApplySplices } = require('./cyber-splice');

const HANDLE = 'ap-cyber-unit-1-lesson-5-lab';
const PAGE_ID = '132673831127';
const TITLE = 'AP Cybersecurity Unit 1 Lesson 5 Lab';

const SPLICES = [
  { name: 'SOC analyst questions test claim',
    from: 'SOC analyst questions on the AP exam test: (1) identifying which AI tool generated an alert',
    html: 'A SOC analyst question turns on three things: (1) identifying which AI tool generated an alert' },

  { name: 'the exam treats these differently',
    from: ' &mdash; the AP exam treats these very differently.',
    html: '.' },
];

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices: makeApplySplices(SPLICES) };
