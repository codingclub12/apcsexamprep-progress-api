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
//  The start time was deliberately DROPPED from the visible prose rather than
//  moved. The CED says Session 1 is 8 a.m. local and Session 2 is noon, but
//  exam-dates.txt is flattened out of its two columns, so which session holds
//  CSA could not be read from it.
//
//  THAT IS NO LONGER TRUE, as of 2026-09-18. Board 367 added College Board's
//  own AP CSA and AP CSP exam pages to config/ced-sources.json, and each one
//  states its session outright:
//
//      docs/ced-snapshot/csa-exam.txt:62   Wed, May 12, 2027 | Session 2
//      docs/ced-snapshot/csp-exam.txt:68   Fri, May 14, 2027 | Session 1
//
//  With exam-dates.txt giving 8 a.m. and 12 p.m. local for the two sessions,
//  CSA is an afternoon exam and CSP a morning one, both first-party and both
//  re-derivable from this repo. The visible prose is left alone here anyway,
//  because those pages were imported on 2026-09-18 and re-opening their copy to
//  add a sentence is a separate decision from fixing a countdown. Recorded so
//  the next pass restores the time on purpose rather than rediscovering it.
// ─────────────────────────────────────────────────────────────────────────────

//  First-party, docs/ced-snapshot/exam-dates.txt, captured 2026-09-01.
const EXAM = {
  csa: 'Wednesday, May 12, 2027',
  csp: 'Friday, May 14, 2027',
};

//  The same two dates in the form a countdown reads, with the session's local
//  start time from docs/ced-snapshot/csa-exam.txt and csp-exam.txt. They are
//  kept beside EXAM rather than written into an edit string because the two
//  drifting apart is precisely the bug this file exists to fix, and
//  smoke/body-year-csv.js asserts they still name the same day.
const EXAM_ISO = {
  csa: '2027-05-12T12:00:00',   //  Session 2, afternoon
  csp: '2027-05-14T08:00:00',   //  Session 1, morning
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
      //  ── THE viewBox EDIT IS GONE, AND IT WAS WRONG TWICE ────────────────
      //  It shipped here on the theory that SVG attributes are case-sensitive,
      //  so a lowercased `viewbox` meant four icons were not scaling. Both
      //  halves of that were wrong, and both were settled by running something
      //  rather than reasoning about it.
      //
      //  It CANNOT land. The edit was imported on 2026-09-17 and the page came
      //  back with all four still lowercased: the sheet sent `viewBox` 4 times
      //  and the stored body carries `viewbox` 4 times. Shopify lowercases
      //  attribute names on save, which is also where the lowercasing came from
      //  in the first place. Re-adding this edit just makes the page read
      //  PARTIAL forever.
      //
      //  It DOES NOT NEED TO. Measured in Chromium against the pre-installed
      //  build: HTML5 has an "adjust SVG attributes" step for foreign content,
      //  so a parser maps `viewbox` back to `viewBox`. The attribute reads back
      //  as `viewBox`, the viewBox applies, and a 24-unit rect renders at 40px,
      //  identical to the camelCase version. An svg with no viewBox at all
      //  renders 24px, which is what a real failure would have looked like.
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
      //  MEASURED AFTER THE 2026-09-17 IMPORT, not predicted before it. The
      //  first version of this file assumed Shopify would repair this on save,
      //  because docs/shopify-page-imports.md describes a decode-parse-
      //  reserialize transform. A Matrixify Body HTML MERGE does no such thing:
      //  the stored body came back byte for byte identical to the sheet cell,
      //  45400 characters in and 45400 out. So the broken entity survived and
      //  has to be replaced explicitly.
      { count: 4, why: 'renders literally as 5&geq;78 on the live page; Shopify stores verbatim and will not fix it',
        find: '&amp;geq;', replace: '\u2265' },
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
      { count: 4, why: 'renders literally as 5&geq;83 on the live page; Shopify stores verbatim and will not fix it',
        find: '&amp;geq;', replace: '\u2265' },
    ],
  },
  //  ── SECOND PASS, 2026-09-18: THE REMAINING FIVE HUB PAGES ─────────────
  //  These carry the stale year as a school-year SPAN rather than a bare 2026,
  //  which is why the first pass missed them: staleYears() stripped every span
  //  before looking, so ap-csp-reference-sheet said "the 2025-2026 AP CSP exam"
  //  four times and the check called the page clean. Spans are judged by their
  //  end year now.
  //
  //  THREE KINDS OF SPAN LIVE ON THESE PAGES AND ONLY ONE IS STALE:
  //    a CURRENCY claim   "aligned to the 2025-2026 4-unit curriculum"   fix
  //    a HISTORICAL claim "Scanner is new to the 2025-2026 exam"         keep
  //    AUTHORING SCAFFOLDING inside an HTML comment                      keep
  //
  //  A CURRENCY CLAIM LOSES ITS YEAR RATHER THAN GAINING A NEW ONE. Tanner's
  //  call, 2026-09-18, and it is the more durable of the two: the first draft
  //  moved these lines to 2026-2027, which is correct today and needs this same
  //  pass again next September. "Aligned to the 4-unit curriculum" is true for
  //  as long as the four-unit curriculum is what we teach, which is the thing
  //  the sentence was actually claiming.
  //
  //  DROPPING A YEAR MAKES A REPLACEMENT SHORT, AND A SHORT REPLACEMENT HAS TO
  //  BE ANCHORED. "AP Computer Science A " + BULLET + " 2025-2026" becoming just
  //  "AP Computer Science A" left a replacement that occurs all over the page,
  //  and the surgical check caught it at once: reversing the edit rewrote every
  //  other occurrence too, so the body did not come back. The forward edit was
  //  always exact, but an edit that cannot be proved confined should not ship.
  //  Those find-strings now carry their own markup, "hero-eyebrow\">...</div>",
  //  which makes both the replacement unique and the edit impossible to land
  //  anywhere but the one element it means.
  //
  //  The distinction that decides it: a year STAMPING CURRENCY on content goes
  //  (aligned to, built for, organized by, a hero eyebrow, a title badge). A
  //  year stating a FACT about a specific administration stays and moves to
  //  2027 (when the exam is, what is on it, the date, "Updated for the May 2027
  //  exam"). Dropping the year from those would lose real information.
  //
  //  The third is worth knowing about: both practice-exam pages carry a block
  //  of "SEO: - Page Title: ... - Meta description: ..." notes in a comment,
  //  left over from whoever built them. Checked against the rendered page, none
  //  of it reaches a student. It is not touched here, which is why the spans
  //  below use long find-strings rather than the bare span.
  {
    handle: 'ap-csa-exam-prep-hub',
    why: 'the CSA hub, five currency spans plus a 2026 FAQ pair duplicated into JSON-LD',
    edits: [
      { count: 1, why: 'JSON-LD headline',
        find: '"headline": "AP Computer Science A Exam Prep (2025-2026)"',
        replace: '"headline": "AP Computer Science A Exam Prep"' },
      { count: 1, why: 'JSON-LD description, a currency claim',
        find: 'exam prep aligned to the 2025-2026 4-unit curriculum',
        replace: 'exam prep aligned to the 4-unit curriculum' },
      { count: 1, why: 'body copy, a currency claim',
        find: 'built specifically for the 2025–2026 curriculum',
        replace: 'built specifically for the current curriculum' },
      { count: 1, why: 'the alignment pill',
        find: 'hub-flash-pill">2025–2026 Aligned</li>',
        replace: 'hub-flash-pill">Curriculum Aligned</li>' },
      //  ANCHORED because two edits on this page would otherwise produce the
      //  same string. The JSON-LD description above also ends up reading
      //  "aligned to the 4-unit curriculum", so after both are applied that
      //  phrase occurs twice and the exact-count idempotency test cannot tell
      //  which edit made which. The generator refused the whole page for it,
      //  correctly: when two edits can produce the same text, a count is not
      //  evidence about either. Carrying the strip's own markup separates them.
      { count: 1, why: 'strip line, a currency claim',
        find: 'free — aligned to the 2025–2026 4-unit curriculum</span>',
        replace: 'free — aligned to the 4-unit curriculum</span>' },
      { count: 1, why: 'JSON-LD keyword list',
        find: 'AP Computer Science A 2026"', replace: 'AP Computer Science A 2027"' },
      { count: 2, why: 'FAQ question, visible copy and its JSON-LD twin',
        find: 'What units are on the AP CSA exam in 2026?',
        replace: 'What units are on the AP CSA exam in 2027?' },
      { count: 1, why: 'FAQ answer',
        find: 'The 2026 AP CSA exam covers 4', replace: 'The 2027 AP CSA exam covers 4' },
      { count: 2, why: 'FAQ question, visible copy and its JSON-LD twin',
        find: 'What is the AP CSA exam format in 2026?',
        replace: 'What is the AP CSA exam format in 2027?' },
      { count: 1, why: 'FAQ answer',
        find: 'The 2026 AP Computer Science', replace: 'The 2027 AP Computer Science' },
      { count: 1, why: 'freshness line under the lesson count',
        find: 'Updated for the May 2026 exam.', replace: 'Updated for the May 2027 exam.' },
      //  ── THE ONE THE FIRST PASS MISSED, AND THE WORST ONE ON THE PAGE ───────
      //  This attribute feeds the page's own countdown script, which renders a
      //  target in the past as the words "Exam complete, great work!". Measured
      //  in Chromium on 2026-09-18 against the live stored body, the Quick
      //  Access header read:
      //
      //      Quick Access, Exam complete, great work!
      //
      //  to anyone landing on the CSA hub in September. The first pass rewrote
      //  eleven visible strings on this page and never looked inside an
      //  attribute value, and the generator's own stale check could not have
      //  told me: it read "2026-05" as a school-year span and stripped it.
      //  scripts/body-year-csv.js now judges ISO dates before anything can eat
      //  them, with eight mutations behind that rule.
      { count: 1, why: 'the countdown target, still aimed at an exam four months gone',
        find: 'data-exam-iso="2026-05-15T12:00:00"',
        replace: `data-exam-iso="${EXAM_ISO.csa}"` },
      //  "New 2026" in the comparison table is NOT edited. It badges the 4-unit
      //  rewrite, which happened in 2026, so moving it to 2027 would assert that
      //  something changed this year. Same for the FRQ archive links, 2020 to
      //  2025, and "appears every single year, consistently from 2004 to
      //  present". Those are the archive, which is the point of the page.
    ],
  },
  {
    handle: 'ap-csa-practice-exams',
    why: 'currency spans plus an exam date that was wrong for 2026 as well',
    edits: [
      { count: 1, why: 'FAQ answer, a currency claim',
        find: 'built for the 2025-2026 AP CSA 4-unit curriculum',
        replace: 'built for the AP CSA 4-unit curriculum' },
      { count: 1, why: 'hero eyebrow',
        find: 'hero-eyebrow">AP Computer Science A • 2025–2026</div>',
        replace: 'hero-eyebrow">AP Computer Science A</div>' },
      { count: 1, why: 'FAQ question',
        find: 'aligned to the 2026 curriculum?', replace: 'aligned to the current curriculum?' },
      { count: 1, why: 'the exam date, which named May 15 where the CED gives May 12 2027',
        find: 'AP CSA Exam — May 15, 2026',
        replace: `AP CSA Exam — ${EXAM.csa}` },
      //  "File and Scanner class topics, which are new to the 2025-2026
      //  curriculum" stays. That is when they were added, and it is true.
    ],
  },
  {
    handle: 'ap-csa-topics',
    why: 'the topics hub, whose Title field and both h1 elements read 2026',
    edits: [
      { count: 2, why: 'the h1 and the JSON-LD headline',
        find: 'AP CSA Topics (2026) | Practice by Unit and Skill',
        replace: 'AP CSA Topics | Practice by Unit and Skill' },
      { count: 1, why: 'the long-form h1',
        find: 'A Topics (2026) — Practice by Unit and Skill</h1>',
        replace: 'A Topics — Practice by Unit and Skill</h1>' },
      { count: 2, why: 'quick-nav and footer link labels',
        find: '2026 Exam Info', replace: '2027 Exam Info' },
      { count: 1, why: 'common mistakes link label',
        find: 'AP CSA Common Mistakes (2026)</a>',
        replace: 'AP CSA Common Mistakes</a>' },
      { count: 1, why: 'intro line, a currency claim. The span sits inside a <strong>, so the find-string carries the markup',
        find: 'organized by the <strong>2025–2026 four-unit curriculum</strong>',
        replace: 'organized by the <strong>four-unit curriculum</strong>' },
      { count: 1, why: 'JSON-LD description, a currency claim',
        find: 'topics organized by the 2025-2026 4-unit curriculum',
        replace: 'topics organized by the 4-unit curriculum' },
      //  NOT edited, all historical: "New & Updated Topics 2025-2026
      //  Curriculum" and "File I/O with Scanner is a fully new addition to the
      //  2025-2026 AP CSA exam" both describe when the 4-unit rewrite landed.
      //  The "New in 2026" and "NEW 2026" badges mark those same topics. The
      //  copyright year is a copyright year.
      //  ── THE FOUR h1 ELEMENTS ON ap-csa-topics, 2026-09-18, board #366 ─────────
      //  Found by looking at the page after the year edits landed, not by a check.
      //  The rendered page carries FOUR, three of them in the stored body:
  //
      //    h1[0]  AP CSA Topics                                  theme, from Title
      //    h1[1]  AP CSA Topics | Practice by Unit ... .com      body, see below
      //    h1[2]  AP Computer Science A Topics — Practice ...     body, the real one
      //    h1[3]  Get in Touch                                   body, a section
  //
      //  h1[1] is a PASTED COPY OF THE THEME'S OWN page-title markup, class list and
      //  all, carrying the SEO title complete with the brand suffix. Somebody copied
      //  rendered chrome into the page body. It is the first element in the body.
  //
      //  ── THE PAGE LOOKS FINE, WHICH IS WHY NOTHING CAUGHT IT ────────────────────
      //  The body ships `.page-title, .section-header, h1.title { display: none }`,
      //  commented "Hide Shopify's default page title if it shows". That rule hides
      //  the theme's h1 AND the pasted copy, since both carry `page-title`. So two
      //  of the four are invisible and the page reads correctly to a human. This is
      //  a DOM defect only, which is exactly the kind a live check on visible text
      //  cannot see.
  //
      //  ── WHAT THIS DOES, AND WHAT IT DELIBERATELY DOES NOT ──────────────────────
      //  Removes the pasted h1 and keeps its wrapper div, which costs nothing
      //  visually because the h1 was already hidden. Demotes "Get in Touch" to h2,
      //  where the body already has twelve, and moves its CSS rule with it so the
      //  32px styling survives.
  //
      //  It does NOT touch h1[2], the real heading. Demoting that would leave the
      //  only remaining h1 a hidden one, which is worse than two. And it cannot
      //  reach h1[0], which the theme renders. Two h1 elements, one hidden chrome
      //  and one real heading, is where a body sheet can get to; collapsing that to
      //  one is a theme change.

      { count: 1, why: 'the pasted theme chrome h1, brand suffix and all. Its wrapper stays',
        find: '<h1 class="main-page-title page-title h0 scroll-trigger animate--fade-in">\n    AP CSA Topics | Practice by Unit and Skill | APCSExamPrep.com\n  </h1>\n  <div class="grid-container column-container column">',
        replace: '<div class="grid-container column-container column">' },
      { count: 1, why: 'a contact section heading is not a page title; the body already has twelve h2',
        find: '<h1>Get in Touch</h1>', replace: '<h2>Get in Touch</h2>' },
      { count: 1, why: 'move the rule with the element so the 32px styling survives',
        find: '.acw-hero h1 {', replace: '.acw-hero h2 {' },
    ],
  },
  {
    handle: 'ap-csp-practice-exams',
    why: 'one visible currency span; the other two spans are inside authoring scaffolding',
    edits: [
      { count: 1, why: 'hero eyebrow, the only span a student sees',
        find: 'hero-eyebrow">AP Computer Science Principles • 2025–2026</div>',
        replace: 'hero-eyebrow">AP Computer Science Principles</div>' },
    ],
  },
  {
    handle: 'ap-csp-reference-sheet',
    why: '142 impressions and ZERO clicks at position 6.88. Six spans, four of them student-visible.',
    edits: [
      { count: 1, why: 'JSON-LD headline',
        find: '"headline": "AP CSP Language Reference Sheet (2025-2026)"',
        replace: '"headline": "AP CSP Language Reference Sheet"' },
      { count: 1, why: 'JSON-LD description',
        find: 'pseudocode reference sheet for the 2025-2026 exam',
        replace: 'pseudocode reference sheet for exam day' },
      { count: 1, why: 'hero label',
        find: 'ref-hero-label">AP Computer Science Principles — 2025–2026</span>',
        replace: 'ref-hero-label">AP Computer Science Principles</span>' },
      { count: 1, why: 'intro line, a currency claim',
        find: 'covers the complete 2025–2026 pseudocode syntax',
        replace: 'covers the complete pseudocode syntax' },
      { count: 1, why: 'body copy about what College Board provides',
        find: 'College Board for the 2025–2026 AP CSP exam',
        replace: 'College Board for the AP CSP exam' },
      { count: 1, why: 'FAQ answer',
        find: 'The 2025–2026 AP CSP exam reference sheet',
        replace: 'The AP CSP exam reference sheet' },
    ],
  },
];

//  ── THE PAGE TITLE FIELD IS THE FIRST H1, AND THE BODY IS THE SECOND ────────
//  Found on 2026-09-17 by looking at the canary page after importing it. Every
//  one of these pages renders TWO h1 elements: the theme prints the Shopify
//  page `Title` field at the top, and the body carries its own underneath.
//
//      rendered h1[0]   AP CSA Score Calculator 2026 | Predict Your Exam Score
//      rendered h1[1]   AP CSA Score Calculator 2027
//
//  So a body sheet fixes the SECOND one and leaves the visible heading, and the
//  one Google reads first, still advertising the exam that has passed. The body
//  sheet cannot reach it: `Title` is a forbidden column there precisely because
//  it can rename a page, so it ships as its own small sheet instead.
//
//  Changing Title does NOT change the URL. The handle is a separate field and
//  is not in this sheet at all, so nothing here can move a page or break a link.
const TITLES = [
  { handle: 'ap-csa-score-calculator',
    from: 'AP CSA Score Calculator 2026 | Predict Your Exam Score',
    to: 'AP CSA Score Calculator 2027 | Predict Your Exam Score',
    why: 'renders as the first h1 above the body, still reading 2026 after the body import' },
  { handle: 'ap-csp-score-calculator',
    from: 'AP CSP Score Calculator 2026 | Predict Your Exam Score',
    to: 'AP CSP Score Calculator 2027 | Predict Your Exam Score',
    why: 'renders as the first h1 above the body' },
  { handle: 'ap-csa-exam-format',
    from: 'AP Computer Science A Exam Format 2026 - Sections, Timing & Scoring Guide',
    to: 'AP Computer Science A Exam Format 2027 - Sections, Timing & Scoring Guide',
    why: 'renders as the first h1 above the body' },
  { handle: 'ap-csa-topics',
    from: 'AP CSA Topics (2026)',
    to: 'AP CSA Topics',
    why: 'second pass: renders as the first of FOUR h1 elements on that page' },
  { handle: 'ap-csa-reference-sheet',
    from: 'AP CSA Reference Sheet 2026 - Complete Java Quick Reference Guide',
    to: 'AP CSA Reference Sheet - Complete Java Quick Reference Guide',
    why: 'renders as the first h1; drops the year rather than moving it, matching the body h1 and the SEO title' },
];

module.exports = { PAGES, EXAM, EXAM_ISO, TITLES };
