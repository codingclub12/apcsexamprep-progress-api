'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE BODY REWRITES: PAGES WHOSE VISIBLE TEXT STILL ADVERTISES A PAST EXAM.
//
//  The SEO sheet of 2026-09-17 fixed what Google SHOWS. This fixes what the
//  student READS after clicking, which had drifted the other way: the snippet
//  now promises the May 2027 exam and the page still said May 2026.
//
//  ── WHY THIS IS NOT A FIND AND REPLACE ──────────────────────────────────────
//  Blindly moving 2026 to 2027 across these bodies would be destructive. They
//  contain, measured:
//
//    /pages/ap-csa-2025-frq-1-dogwalker   links whose YEAR IS THE ADDRESS
//    2025 National Score Distribution     historical data, correct as written
//    2025 FRQ 1 DogWalker                 past papers, the archive is the point
//    /pages/ap-csa-mcq-bootcamp-2026      a handle, and renaming one is NEVER_AUTO
//
//  So every replacement is authored, carries the count it expects, and the
//  generator refuses the whole sheet if any count is off by one. A page whose
//  body has moved since this file was written cannot be half-applied.
//
//  ── TWO OF THESE ARE NOT DATE SUBSTITUTIONS ─────────────────────────────────
//  In 2026 AP CSP sat the day BEFORE AP CSA. In 2027 it sits two days AFTER:
//  CSA is Wednesday May 12, CSP is Friday May 14, both from
//  docs/ced-snapshot/exam-dates.txt captured 2026-09-01. A page saying "the day
//  before" becomes false by moving its numbers, so the sentence is rewritten.
//
//  The start time is deliberately DROPPED rather than moved. The CED says
//  Session 1 is 8 a.m. local and Session 2 is noon, but the captured text is
//  flattened out of its two columns, so which session holds CSA in 2027 cannot
//  be read from it. The page keeps its link to the College Board calendar and
//  no longer asserts a time this repo cannot source.
// ─────────────────────────────────────────────────────────────────────────────

//  First-party, docs/ced-snapshot/exam-dates.txt, captured 2026-09-01.
const EXAM = {
  csa: 'Wednesday, May 12, 2027',
  csp: 'Friday, May 14, 2027',
};

const PAGES = [
  {
    handle: 'ap-csa-exam-format',
    why: '237 impressions, 2 clicks, position 5.67. Body said the exam was 2026.',
    edits: [
      { count: 1, why: 'the H1, which is what Google rewrites a title from',
        find: 'Science A Exam Format (2026)</h1>',
        replace: 'Science A Exam Format (2027)</h1>' },
      { count: 1, why: 'section heading',
        find: '<h3>The 2026 AP CSA Exam is Fully Digital</h3>',
        replace: '<h3>The 2027 AP CSA Exam is Fully Digital</h3>' },
      { count: 1, why: 'FAQ question',
        find: 'When is the 2026 AP Computer Science A exam?',
        replace: 'When is the 2027 AP Computer Science A exam?' },
      { count: 1, why: 'the digital-or-paper FAQ answer, found by the generator stale check rather than by reading',
        find: 'The 2026 AP CSA exam is <strong>fully digital</strong>',
        replace: 'The 2027 AP CSA exam is <strong>fully digital</strong>' },
      { count: 1, why: 'FAQ answer: wrong date, wrong ordering against CSP, and a start time this repo cannot source',
        find: 'The 2026 AP Computer Science A exam is on <strong>Friday, May 15, 2026, at 12:00 p.m. local time</strong> (afternoon session). The AP Computer Science Principles exam is the day before, on Thursday, May 14, 2026. Always confirm the date against the',
        replace: `The 2027 AP Computer Science A exam is on <strong>${EXAM.csa}</strong>. The AP Computer Science Principles exam is two days later, on ${EXAM.csp}. Always confirm the date and start time against the` },
    ],
  },
  {
    handle: 'ap-csa-reference-sheet',
    why: '214 impressions and ZERO clicks at position 4.44. Body badge read Exam: May 2026.',
    edits: [
      { count: 1, why: 'the hero badge, the most visible stale claim on the page',
        find: 'Exam: May 2026', replace: 'Exam: May 2027' },
      { count: 1, why: 'the H1. Drops the year rather than moving it, so it cannot go stale again',
        find: 'AP CSA Java Reference Sheet 2026</h1>',
        replace: 'AP CSA Java Reference Sheet</h1>' },
      { count: 2, why: 'FAQ question, visible copy and its JSON-LD twin',
        find: 'What is the format of the 2026 AP CSA exam?',
        replace: 'What is the format of the 2027 AP CSA exam?' },
      { count: 2, why: 'FAQ answer, visible copy and its JSON-LD twin',
        find: 'The 2026 AP CSA exam has 42 multiple',
        replace: 'The 2027 AP CSA exam has 42 multiple' },
      { count: 1, why: 'JSON-LD headline',
        find: '"AP CSA Reference Sheet 2026 | Complete Java Quick Reference',
        replace: '"AP CSA Reference Sheet | Complete Java Quick Reference' },
      { count: 1, why: 'JSON-LD description',
        find: '"AP CSA reference sheet 2026:',
        replace: '"AP CSA reference sheet:' },
    ],
  },
  {
    handle: 'ap-csa-score-calculator',
    why: '223 impressions, 1 click, position 7.11. H1 read 2026 under the title reading 2027.',
    //  This page also carried a date that was wrong for 2026 as well as for
    //  2027: it said Friday May 8 while /pages/ap-csa-exam-format said Friday
    //  May 15 for the same administration. Two live pages disagreeing is why
    //  the date now comes from one constant sourced to the CED capture.
    edits: [
      { count: 1, why: 'the H1, which disagreed with the SEO title shipped on 2026-09-17',
        find: '<h1>AP CSA Score Calculator 2026</h1>',
        replace: '<h1>AP CSA Score Calculator 2027</h1>' },
      { count: 1, why: 'section heading',
        find: 'Realistic Path to a 5 in 2026',
        replace: 'Realistic Path to a 5 in 2027' },
      { count: 1, why: 'section heading',
        find: 'Estimated AP Score Cutoffs (2026)',
        replace: 'Estimated AP Score Cutoffs (2027)' },
      { count: 1, why: 'school-year span that has ended',
        find: 'AP CSA Exam Format (2025\u20132026)',
        replace: 'AP CSA Exam Format (2026\u20132027)' },
      { count: 1, why: 'callout label',
        find: '<strong>2026 Exam Date</strong>',
        replace: '<strong>2027 Exam Date</strong>' },
      { count: 1, why: 'the date was wrong for 2026 too, and the start time is not sourceable here',
        find: 'AP Computer Science A exam: <strong>Friday, May 8, 2026 at 12:00 PM local time.</strong>',
        replace: `AP Computer Science A exam: <strong>${EXAM.csa}.</strong>` },
      { count: 1, why: 'scores-released FAQ question',
        find: 'When are AP CSA scores released in 2026?',
        replace: 'When are AP CSA scores released in 2027?' },
      { count: 1, why: 'scores-released FAQ answer',
        find: '2026 AP scores are expected in the second week of July 2026.',
        replace: '2027 AP scores are expected in the second week of July 2027.' },
      { count: 1, why: 'paper-or-digital FAQ question',
        find: 'Does the AP CSA exam still use paper in 2026?',
        replace: 'Does the AP CSA exam still use paper in 2027?' },
      { count: 1, why: 'the page is being updated now, so the stamp says now rather than a date in the past',
        find: 'Last Updated June 2026',
        replace: 'Last Updated September 2026' },
      { count: 1, why: 'JSON-LD twin of the exam-date FAQ, which is what Google reads',
        find: '"When is the AP Computer Science A exam in 2026?"',
        replace: '"When is the AP Computer Science A exam in 2027?"' },
      { count: 1, why: 'JSON-LD twin of the answer, carrying the same wrong date',
        find: 'The 2026 AP Computer Science A exam is on Friday, May 8, 2026 at 12:00 PM local time.',
        replace: `The 2027 AP Computer Science A exam is on ${EXAM.csa}.` },
      { count: 1, why: 'JSON-LD application name',
        find: '"name":"AP CSA Score Calculator 2026"',
        replace: '"name":"AP CSA Score Calculator 2027"' },
    ],
  },
  {
    handle: 'ap-csp-score-calculator',
    why: '161 impressions, 2 clicks, position 6.72. H1 read 2026 under the title reading 2027.',
    edits: [
      { count: 1, why: 'the H1, which disagreed with the SEO title shipped on 2026-09-17',
        find: '<h1>AP CSP Score Calculator 2026</h1>',
        replace: '<h1>AP CSP Score Calculator 2027</h1>' },
      { count: 3, why: 'Create performance task deadline, stated three times on the page and first-party in the CED capture',
        find: '<strong>April 30, 2026</strong>',
        replace: '<strong>April 30, 2027</strong>' },
      { count: 1, why: 'CPT deadline again, written with a tilde in a table cell so the other find-string missed it',
        find: 'Submitted ~April 30, 2026 via AP Digital Portfolio',
        replace: 'Submitted ~April 30, 2027 via AP Digital Portfolio' },
      { count: 1, why: 'callout label',
        find: '<strong>2026 Exam Date</strong>',
        replace: '<strong>2027 Exam Date</strong>' },
      { count: 1, why: 'the WEEKDAY moves too: May 14 is a Thursday in 2026 and a Friday in 2027',
        find: 'Principles exam: <strong>Thursday, May 14, 2026.</strong>',
        replace: `Principles exam: <strong>${EXAM.csp}.</strong>` },
      { count: 1, why: 'section heading',
        find: 'Realistic Path to a 5 in 2026',
        replace: 'Realistic Path to a 5 in 2027' },
      { count: 1, why: 'section heading',
        find: 'Estimated Score Cutoffs (2026)',
        replace: 'Estimated Score Cutoffs (2027)' },
      { count: 1, why: 'school-year span that has ended',
        find: 'AP CSP Exam Format (2025\u20132026)',
        replace: 'AP CSP Exam Format (2026\u20132027)' },
      { count: 1, why: 'exam day cell. May 14 is correct for 2027 as well, the year was not',
        find: 'Exam day (May 14, 2026)',
        replace: 'Exam day (May 14, 2027)' },
    ],
  },
];

module.exports = { PAGES, EXAM };
