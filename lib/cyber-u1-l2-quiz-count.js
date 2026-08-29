'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  1.2 QUIZ: TWELVE PROMISED, FIVE SERVED.
//
//  Same cause as 1.1 and the same three sources agree on five: the live API
//  returns total 5, the denominator table prices '1.2|quiz' at 5, and its
//  comment records the move explicitly, "(was 12, see 1.1 note)".
//
//  Twenty-five minutes for twelve questions becomes ten for five, which is the
//  one number here that is a judgement rather than a reading.
//
//  ── THE FIRST PASS FIXED THE SENTENCE AND MISSED THE BADGE ──────────────────
//
//  The 2026-08-28 sheet spliced the intro paragraph only, and the commit for it
//  said "the pages were the last place still carrying the old counts". That was
//  wrong. Two lines below the sentence this page carries a badge row, and it
//  still read "12 Questions" and "~25 min", so the corrected sentence and the
//  stale badge sat on one screen contradicting each other.
//
//  The reason the miss was invisible is worth keeping: 1.1 has NO badge row, so
//  a fix verified on 1.1 and assumed to generalise to 1.2 looked complete. The
//  check that catches it is counting every student-visible number on the page
//  and comparing each against what the API serves, not confirming that the one
//  string the splice targeted changed. A splice can only ever prove it hit what
//  it aimed at.
//
//  Swept the other way afterwards: all 32 Unit 1 pages in the sitemap, every
//  count compared against the five the API serves. Everything else that is not
//  five is a different instrument and correct as written - the 3-question
//  bellringers, the 20-question unit exam, the 15-question scenario practice.
//  This page was the only remaining disagreement.
//
//  The sentence splice is GONE from the table below rather than kept for the
//  record, because the live body already reads "5 questions, about 10 minutes"
//  and an anchor that matches zero times aborts the build. The table describes
//  what is still wrong with the page, never what was once wrong with it.
// ─────────────────────────────────────────────────────────────────────────────

const { makeApplySplices } = require('./cyber-splice');

const HANDLE = 'ap-cyber-unit-1-lesson-2-quiz';
const PAGE_ID = '132288872663';
const TITLE = 'AP Cybersecurity Unit 1 Lesson 2 Quiz';

const SPLICES = [
  { name: 'badge question count',
    from: '<span class="ex-badge">12 Questions</span>',
    html: '<span class="ex-badge">5 Questions</span>' },
  { name: 'badge duration',
    from: '<span class="ex-badge">~25 min</span>',
    html: '<span class="ex-badge">~10 min</span>' },
];

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices: makeApplySplices(SPLICES) };
