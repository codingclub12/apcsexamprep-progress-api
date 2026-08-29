'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  UNIT 1 CASE FILE 1: FIVE SOURCE LINES BUILT FOR A TEACHER, SHOWN TO EVERYONE.
//
//  Each of the five stages carries a `cf-src` line of the form
//
//      CED 1.3.A / 1.3.B / 1.3.C - Lesson 1.3.3 Wireless Attacks, ...
//
//  which is two different things joined by a bullet. The right half tells a
//  student exactly where to go and read; the left half is a coverage claim
//  addressed to whoever built the case file. Only the left half goes. This is
//  the whole line's purpose kept and its audience corrected, not a deletion:
//  a student who is stuck on Stage 3 still gets pointed at three lesson
//  sections by name.
//
//  "skill 1B" on Stage 2 goes with it, for the same reason and from the same
//  document.
// ─────────────────────────────────────────────────────────────────────────────

const { makeApplySplices } = require('./cyber-splice');

const HANDLE = 'ap-cyber-unit-1-case-file-1';
const PAGE_ID = '135701299415';
const TITLE = 'AP Cybersecurity Unit 1 Case File 1: The Onboarding Trap';

const SPLICES = [
  { name: 'stage 1 source line',
    from: '<p class="cf-src">CED 1.1.A &bull; Lesson 1.1.4 Attack Types',
    html: '<p class="cf-src">Review: Lesson 1.1.4 Attack Types' },

  { name: 'stage 2 source line',
    from: '<p class="cf-src">CED 1.2.A / 1.2.B / 1.2.C, skill 1B &bull; Lesson 1.2.4 Attack Types',
    html: '<p class="cf-src">Review: Lesson 1.2.4 Attack Types' },

  { name: 'stage 3 source line',
    from: '<p class="cf-src">CED 1.3.A / 1.3.B / 1.3.C &bull; Lesson 1.3.3 Wireless Attacks',
    html: '<p class="cf-src">Review: Lesson 1.3.3 Wireless Attacks' },

  { name: 'stage 4 source line',
    from: '<p class="cf-src">CED 1.4.A / 1.4.B &bull; Lesson 1.4.4 AI Phishing',
    html: '<p class="cf-src">Review: Lesson 1.4.4 AI Phishing' },

  { name: 'stage 5 source line',
    from: '<p class="cf-src">CED 1.5 &bull; Lesson 1.5.5 Anomaly Detection',
    html: '<p class="cf-src">Review: Lesson 1.5.5 Anomaly Detection' },
];

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices: makeApplySplices(SPLICES) };
