'use strict';
// Weekly course post: AP CSA. Brief track: correct a working title that was
// drafted assuming an August publish date ("Nine Months to the AP CSA Exam").
// This post actually goes live October 20, 2026, and the real AP CSA exam
// date for the 2027 administration is Wednesday, May 12, 2027, which is
// roughly seven months out, not nine. Re-verified against the College
// Board's own 2027 AP Exam Dates pages before writing. The post's job is the
// timeline: a concrete, phase-based plan scaled to the time actually left,
// not a re-teaching of reference-sheet use, debugging, FRQ scoring, or MCQ
// pacing, all of which already have their own guides on this blog and are
// linked rather than repeated here.
const H = require('../../lib/blog-house');

const SRC = {
  examDate: {
    source: 'College Board, AP Students: AP Computer Science A Exam Date',
    url: 'https://apstudents.collegeboard.org/dates/ap-computer-science-a-exam',
    asOf: 'October 2026',
  },
  examWindow: {
    source: 'College Board, AP Central: 2027 AP Exam Dates',
    url: 'https://apcentral.collegeboard.org/exam-administration-ordering-scores/exam-dates',
    asOf: 'October 2026',
  },
  calc: {
    source: 'APCSExamPrep, calculated from the College Board AP CSA exam date and this post\'s publish date',
    asOf: 'October 20, 2026',
  },
};

const SECTIONS = [
  'The AP CSA exam date: May 12, 2027, and why the countdown changed',
  'Where most CSA classes actually are in October',
  'Phase one: finish the new content, now through winter break',
  'Phase two: interleaved review and timed practice, January through March',
  'Phase three: intensive FRQ and MCQ practice, the final four to six weeks',
  'Frequently asked questions',
];

const meta = {
  title: 'AP CSA Exam Date: Seven Months Out, What to Do With Them',
  handle: 'ap-csa-months-to-exam-what-to-do',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'ap csa exam date',
  publishOn: '2026-10-20',
  seoTitle: 'AP CSA Exam Date 2027: The 7-Month Study Plan',
  seoDescription: 'The AP CSA exam date is May 12, 2027, about seven months from this post. Here is the phase-by-phase study plan for the months in between.',
  summary: 'The AP CSA exam date for the 2027 administration is Wednesday, May 12, 2027, which puts a post published in late October at roughly seven months out, not the nine months an earlier working title assumed. This guide breaks that stretch into three phases scaled to what is actually left: finishing the remaining new content between now and winter break, since most CSA classes are still teaching new units this far out; interleaved review and timed practice once most content is covered, starting in the new year; and intensive FRQ and MCQ practice with full timed exams in the final four to six weeks before May. It points to this blog\'s existing guides on the reference sheet, debugging, FRQ scoring, and MCQ pacing for the techniques themselves, so the job here stays the timeline.',
  tags: ['AP CSA', 'Exam Date', 'Study Plan', 'Timeline', 'Exam Prep'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('If you searched the AP CSA exam date because your class is still deep in new units and May does not feel real yet, here is the number that actually matters: the exam is about seven months from this post, not nine. An earlier version of this guide was drafted assuming an August publish date, and the math does not survive an October one. What follows is not a pep talk about time management in the abstract. It is a phase-by-phase plan scaled to the months that are actually left, built around where most AP CSA classes really are on the calendar right now.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 20, 2026', updated: 'October 20, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('The AP CSA exam date for the 2027 administration is ' + H.stat('Wednesday, May 12, 2027', SRC.examDate) + ', during the second week of the College Board\'s two-week AP testing window. That window itself is worth knowing exists: schools administer AP Exams across ' + H.stat('May 3 to May 14, 2027', SRC.examWindow) + ', and the exact day a given school sits for AP CSA depends on that school\'s own testing calendar, not on this post. What does not depend on the school calendar is the arithmetic from here to there. Counting forward from this post\'s October 20, 2026 publish date to May 12, 2027 gives ' + H.stat('about seven months', SRC.calc) + ', not the nine an August-dated draft of this same guide would have claimed.'),
  H.p('That correction is not pedantry. A study plan built on a wrong number front-loads too much slack into the early months and leaves too little for the part of the calendar that actually decides the score: the closed-laptop stretch right before the exam where free response fluency either exists or does not. Seven honest months, planned in three phases, is enough time to build that fluency from wherever a class is today. Nine imagined months would have been more forgiving and less accurate, and less accurate is the worse trade when the deadline is a fixed date set by the College Board rather than a soft one a class can push.'),
  H.box('key', 'The number to actually plan around', '<p>' + H.stat('Seven months', SRC.calc) + ' from a late-October start to a May 12 exam. Round down when in doubt, not up. Every phase below is sized against that number rather than against a friendlier one.</p>'),

  H.h2(SECTIONS[1]),
  H.p('Course pacing varies by school, but the general shape of an AP CSA calendar built on the current four-unit CED is consistent enough to plan around. By mid-October, most classes have finished Unit 1 and Unit 2, the primitive data and object-oriented foundations, and are somewhere in the middle of Unit 3, which covers boolean logic, iteration, and array-based and ArrayList-based problems in depth. Unit 4, the array-of-objects and 2D array unit that closes out the course\'s new content, typically runs from late fall into the start of the new year. If a class has not touched recursion, sorting, or searching yet, that is not behind schedule this early. It is exactly on the schedule most CSA courses run.'),
  H.p('This matters because it sets the honest starting condition for the plan that follows. A study timeline that assumes all new content is already covered by late October is planning for a class that does not exist yet. The three phases below are built around the class that does exist: one still teaching new material for the next several weeks, then shifting into review, then shifting again into exam-format practice as May approaches.'),

  H.h2(SECTIONS[2]),
  H.p('The first phase runs from now through the end of winter break, and its only job is finishing the remaining new content well enough to build on later. This is not the phase for full practice exams or timed FRQ sets. Attempting exam-format practice on units that have not been taught yet just measures the gap rather than closing it, and it eats time better spent on the content itself.'),
  H.p('What does belong in this phase is building the habits that make every later phase faster. Every time a program does not compile or produces the wrong output, work through it using an actual error-reading process rather than guessing and retrying at random. This blog\'s guide on <a href="/blogs/ap-csa/ap-csa-reading-java-error-messages">reading Java error messages instead of guessing</a> covers that process in detail and is worth internalizing now, while there is still new content to apply it to, rather than picking it up cold in April under exam pressure.'),
  H.p('It is also worth getting familiar with the official reference sheet during this phase, not because it needs to be memorized, but because knowing what it does and does not include changes how new content should be learned. A method signature that is already on the sheet does not need to be drilled the same way a method that is not on the sheet does. The <a href="/blogs/ap-csa/ap-csa-reference-sheet-what-it-gives-you">guide to what the AP CSA reference sheet actually gives you</a> breaks down exactly what is and is not covered, and reading it now means every new unit from here forward gets studied with that distinction already in mind.'),
  H.box('tip', 'The one metric that matters in phase one', '<p>Not practice test scores, since there should not be many yet. Track whether each new unit is finished on the syllabus\'s own timeline. A unit that slips two weeks in November is a two-week debt that phase two inherits, and phase two has less slack to absorb it than phase one does.</p>'),

  H.h2(SECTIONS[3]),
  H.p('Phase two starts once most of the course content is covered, which for most CSA classes lands in January. This is the shift from learning new material to actively strengthening it, and it looks different from phase one in a specific way: instead of studying one unit at a time in the order it was taught, review deliberately mixes units together. A practice set in phase two should put an ArrayList problem next to a 2D array problem next to a recursion problem, not because that is harder for its own sake, but because the actual exam does exactly that, and a student who has only ever practiced one topic at a time is unprepared for the switching cost of moving between them under a clock.'),
  H.p('Timed practice enters here too, but in smaller doses than phase three. A single timed FRQ once or twice a week, or a short timed block of multiple choice questions, is enough at this stage to start building pacing instincts without turning every study session into a full simulated exam. The <a href="/blogs/ap-csa/ap-csa-mcq-pacing-ninety-seconds">MCQ pacing guide</a> lays out a concrete per-question time budget worth adopting during these smaller sessions, so the habit is already automatic by the time full practice exams start in phase three.'),
  H.p('This is also the right window to start actively hunting for the mistakes that are easy to make and hard to notice, the kind that survive review sessions because a student reads their own work and it looks fine. The <a href="/blogs/ap-csa/ap-csa-common-mistakes-that-cost-points">guide to common mistakes the syntax guides do not cover</a> lists exactly this category, and working through it in February, before the stakes of April, gives time to actually break the habits it identifies rather than just recognize them too late.'),
  H.box('warn', 'The trap phase two falls into', '<p>Treating January and February as a second phase one, still working unit by unit because that feels more thorough. Interleaving feels less organized and less comfortable than sequential review. It is also closer to what the exam actually demands, which is the entire point.</p>'),

  H.h2(SECTIONS[4]),
  H.p('The final phase covers roughly the last four to six weeks before the exam, which for a May 12 exam date lands in early-to-mid April through the exam itself. This is the only phase where full, timed, closed-laptop practice exams belong, ideally two to four of them spaced out rather than clustered into the final week. A practice exam this late in the calendar is not primarily about learning new content. Its job is surfacing exactly where points are still leaking, in time to actually fix the leak before the real exam.'),
  H.p('Every free response section attempted in this phase should be scored the same way the real exam scores it, not just checked for a right final answer. That distinction is the difference between practice that reflects reality and practice that quietly inflates confidence. The <a href="/blogs/ap-csa/ap-csa-frq-scoring-point-by-point">guide to how AP CSA free response is actually graded, point by point</a> explains the rubric logic well enough to self-score honestly, which is the single highest-leverage thing to do with a practice FRQ in these last weeks.'),
  H.p('This phase is also where the reference sheet habit built in phase one pays off directly. Every timed practice session should be run under the same conditions as the real exam, reference sheet available and nothing else, so that by May 12 reaching for it during a free response question is instinct rather than a decision that costs time. A student who has never practiced with the actual sheet in front of them loses time in the exam room just figuring out what is on it.'),
  H.box('key', 'What intensive actually means here', '<p>More timed reps, not more new material. If a topic is still genuinely shaky in April, that is a signal to revisit phase two\'s interleaved review on that specific topic, not a reason to abandon the timed-practice structure of phase three. The calendar does not have room left for a fourth phase.</p>'),

  H.h2(SECTIONS[5]),
  H.faq([
    {
      q: 'What is the actual AP CSA exam date for 2027?',
      a: 'The AP Computer Science A exam is administered on ' + H.stat('Wednesday, May 12, 2027', SRC.examDate) + ', within the College Board\'s broader two-week AP testing window that spring. A specific school\'s exact reporting time and room come from that school\'s AP coordinator, not from this post.',
    },
    {
      q: 'How many months is that from a late-October start?',
      a: 'From an October 20, 2026 publish date to a May 12, 2027 exam date is ' + H.stat('about seven months', SRC.calc) + '. An earlier working title for this guide assumed an August publish date and used nine months, which is why that number needed correcting rather than carried forward.',
    },
    {
      q: 'My class has not covered recursion or 2D arrays yet. Is that a problem this late in the year?',
      a: 'Not by itself. Most AP CSA classes running the current four-unit CED are still finishing Unit 3 or moving into Unit 4 in mid-October, and this guide\'s phase one is built around exactly that pace. It becomes a real problem only if that content is still unfinished once phase two is supposed to start in January, since interleaved review needs the full course covered to actually interleave.',
    },
    {
      q: 'When should full timed practice exams start?',
      a: 'In phase three, the final four to six weeks before the exam. Earlier than that, a full timed exam mostly measures how much content has not been taught yet rather than how ready a student is, which wastes a scarce resource, a realistic full-length practice exam, on a question the calendar can already answer on its own.',
    },
    {
      q: 'What if my school runs on a different pace than the phases described here?',
      a: 'The calendar dates in this guide are approximate on purpose. What should transfer to any pace is the order and the shift in kind: finish new content before layering on exam-format timed practice, mix units together once most of the course is covered instead of reviewing sequentially, and save full closed-laptop practice exams for the weeks closest to the actual AP CSA exam date rather than spreading them evenly across the whole year.',
    },
  ]),

  H.cta({
    heading: 'Build the phase two and three practice into your routine now',
    body: 'Closed-laptop FRQ sets scored the way the real rubric scores them, and daily practice questions that keep interleaved review from going stale before April.',
    links: [
      { href: '/pages/ap-csa-frq-archive', text: 'FRQ archive' },
      { href: '/pages/ap-csa-qotd-hub', text: 'Daily practice', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Last reviewed October 20, 2026, against the College Board\'s current 2027 AP Exam Dates pages.'),
]);

module.exports = { meta, body };
