'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  1.3 LAB: "THE HARDEST TOPIC 1.3 AP EXAM QUESTIONS".
//
//  The difficulty claim is real and worth keeping; it is the attribution to an
//  exam that has not been administered that is not. Two attack types in one
//  scenario IS the hard case, and the box then separates them correctly.
// ─────────────────────────────────────────────────────────────────────────────

const { makeApplySplices } = require('./cyber-splice');

const HANDLE = 'ap-cyber-unit-1-lesson-3-lab';
const PAGE_ID = '132330815703';
const TITLE = 'AP Cybersecurity 1.3 Lab: Wireless Attack Specimen Dissection';

const SPLICES = [
  { name: 'hardest exam questions claim',
    from: 'The hardest Topic 1.3 AP exam questions combine two attack types in one scenario',
    html: 'The hardest Topic 1.3 scenarios combine two attack types at once' },
];

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices: makeApplySplices(SPLICES) };
