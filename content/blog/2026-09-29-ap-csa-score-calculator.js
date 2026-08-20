'use strict';
// Weekly course post: AP CSA. Drill track: the raw-score to composite-score
// mechanics behind every AP CSA score calculator, since neither this site's
// calculator nor anyone else's is showing a student an official cutoff.
// College Board does not publish one in advance, so the honest version of
// this post is the math plus a sourced, clearly-labeled historical estimate.
const H = require('../../lib/blog-house');

const SRC = {
  examShape: {
    source: 'College Board AP Computer Science A exam assessment overview',
    url: 'https://apstudents.collegeboard.org/courses/ap-computer-science-a/assessment',
    asOf: 'August 2026',
  },
  dist2026: {
    source: 'College Board 2026 AP score distributions',
    url: 'https://apstudents.collegeboard.org/about-ap-scores/score-distributions',
    asOf: 'July 2026',
  },
  estimate: {
    source: 'Fiveable AP CSA score calculator, built from released College Board scoring worksheets and several years of published score distributions',
    url: 'https://fiveable.me/ap-comp-sci-a/ap-score-calculator',
    asOf: 'August 2026',
  },
};

const SECTIONS = [
  'What actually goes into your AP CSA composite score',
  'Why an AP CSA score calculator cannot show you an official cutoff',
  'The raw score territory that has historically meant a 5',
  'You do not need a perfect score: a worked example',
  'MCQ and FRQ carry almost equal weight, so you cannot coast on one section',
  'Two practice problems: reasoning about your composite',
];

const meta = {
  title: 'AP CSA Score Calculator: What Raw Score You Need for a 5 on the 42-Question Exam',
  handle: 'ap-csa-raw-score-for-a-5',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'ap csa score calculator',
  publishOn: '2026-10-02',
  seoTitle: 'AP CSA Score Calculator: Raw Score Needed for a 5',
  seoDescription: 'How every AP CSA score calculator actually works: the raw MCQ and FRQ math behind your composite, and the historical raw score territory that has meant a 5.',
  summary: 'College Board never publishes an official raw-to-scaled conversion table before the exam. This guide walks through exactly how the AP CSA composite score is built from the 42 multiple choice questions and 36 raw free response points, gives an honest, sourced estimate of the historical territory that has meant a 5, and shows with a concrete example why a student does not need a perfect score to land one.',
  tags: ['AP CSA', 'Score Calculator', 'Exam Scoring', 'Study Strategy', '2026'],
  // The two exam-weight figures and the 2026 distribution figure are sourced
  // with stat() at first mention, then restated in the FAQ and the practice
  // question explanations, where this allowlist covers the repeat.
  allowedInlineNumbers: ['55 percent', '45 percent', '25 percent'],
};

const body = H.article([
  H.dek('Nobody can hand you an official AP CSA score calculator conversion table before the exam. College Board does not publish one in advance. But the composite math behind every unofficial calculator, including ours, is public, and it tells you almost exactly how much room for error you actually have.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 29, 2026', updated: 'September 29, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.p('Every spring a version of the same question shows up in my inbox: "how many multiple choice can I miss and still get a 5?" It is a fair question and it deserves a fair answer, which is that nobody outside a College Board scoring room knows the exact number for the year you sit the exam, and anyone who tells you a precise cutoff is guessing. What is knowable, and useful, is how the raw score you earn on exam day turns into the composite score that determines your 1 through 5, and what territory that composite has historically landed in for a 5. That is what this guide walks through, with the guessing clearly labeled as guessing.'),

  H.h2(SECTIONS[0]),
  H.p('An AP CSA score calculator, whether it is ours or a spreadsheet you built yourself, is doing one job: turning two separate raw scores into a single composite number out of 100, because that composite is what maps to the 1 through 5 scale a college sees. The two raw scores come from very different sections and are combined by weight, not simply added together.'),
  H.p('The multiple choice section is 42 questions, and each correct answer is worth one raw point, for a raw MCQ score out of 42. There is no penalty for a wrong or blank answer, so every question is worth guessing on if you are out of time. The free response section is four questions, each hand scored against a rubric worth 9 points, for a raw FRQ score out of 36 across the section. Those two raw totals, out of 42 and out of 36, look uneven sitting next to each other, and that unevenness is exactly what trips students up about how much each section actually matters.'),
  H.p('Multiple choice carries ' + H.stat('55 percent of the composite score', SRC.examShape) + ' and free response carries ' + H.stat('45 percent', SRC.examShape) + '. The composite formula that gets you there is your MCQ raw score divided by 42, multiplied by 55, added to your FRQ raw score divided by 36, multiplied by 45. Work through that formula once and the two raw totals stop looking uneven. They were built to land close to fifty-fifty on purpose, and the division by 42 and by 36 is what does the leveling before the weights get applied.'),
  H.box('key', 'The formula in one line', '<p>Composite = (MCQ raw / 42) &times; 55 + (FRQ raw / 36) &times; 45. Every AP CSA score calculator you will ever use, ours included, is running this line, then comparing the result against an estimated cutoff table, because that table is the one thing College Board keeps to itself until scores are released.</p>'),

  H.h2(SECTIONS[1]),
  H.p('This is the part most score calculator pages skip past, and it is the part worth being straightforward about. College Board sets the composite-to-scaled-score cutoffs after the exam is administered, during a process that accounts for how hard that specific year\'s exam turned out to be. A slightly harder multiple choice section one year can mean a slightly lower composite is enough for a 5 that year. The cutoffs are not published in advance, are not fixed from year to year, and are not the same exam to exam the way a driving test\'s passing score is fixed.'),
  H.p('So what is a score calculator actually showing you when it tells you a raw score maps to a 5? An estimate, built by people who reverse engineer the relationship using two kinds of public information: released scoring worksheets from past exams, which occasionally show a real composite-to-score table for that specific year, and the score distribution percentages College Board does publish afterward, which let you check an estimated cutoff against how many students actually landed in each score band. Neither source gives you next May\'s cutoff exactly. Together they give you a defensible range, and a defensible range is what this guide gives you too.'),
  H.box('warn', 'What an AP CSA score calculator cannot do', '<p>It cannot tell you your official score before College Board releases scores. It cannot account for a scoring change College Board has not announced. What it can do, if it is built on real released data instead of a guess, is put you in the right neighborhood, which is genuinely useful for deciding where your study time goes.</p>'),

  H.h2(SECTIONS[2]),
  H.p('With that honesty established, here is the actual estimate, and where it comes from. Reverse engineered composite-to-score tables from recent released exams, checked against several years of published score distributions, put the composite territory that has historically meant a 5 at roughly 70 to 78 out of the 100 composite points, drifting a few points in either direction depending on how that particular year\'s exam scored out.'),
  H.sourceNote('Estimate derived from released AP Computer Science A scoring worksheets and historical score distributions, cross-checked against Fiveable\'s AP CSA score calculator methodology', SRC.estimate.url, SRC.estimate.asOf),
  H.p('That range is wide on purpose. Treat 70 as the floor you want daylight above, not a target to graze. In ' + H.stat('the 2026 AP CSA exam, 25 percent of students', SRC.dist2026) + ' earned a 5, which means three quarters of the room did not, and the gap between the two groups was rarely a single missed question. It was a composite that landed clearly inside the 5 territory versus one that landed clearly outside it.'),
  H.table(
    ['MCQ raw score (out of 42)', 'FRQ raw score (out of 36)', 'Composite (out of 100)', 'Historically approximate band'],
    [
      ['42', '36', '100.0', '5, with room to spare'],
      ['35', '28', '80.8', 'Comfortably inside 5 territory (illustrative)'],
      ['30', '22', '66.8', 'Typically a 4'],
      ['24', '16', '51.4', 'Typically a 3'],
      ['15', '9', '30.9', 'Typically a 2'],
      ['8', '3', '14.2', 'Typically a 1'],
    ]
  ),
  H.sourceNote('Composite figures computed from the published weighting formula. Score bands are illustrative estimates based on historical cutoffs, not an official College Board table', null, 'August 2026'),
  H.box('tip', 'Use the table as a compass, not a contract', '<p>The exact composite where a 4 becomes a 5 moves a few points every year. What does not move is the shape: the top row and the bottom row are never close together, and a composite comfortably above 70 has, historically, been comfortably inside 5 territory rather than sitting right on the edge of it.</p>'),

  H.h2(SECTIONS[3]),
  H.p('Here is where the honest math becomes genuinely encouraging, because it means a perfect exam is not the bar. Picture a student who misses seven of the 42 multiple choice questions, getting 35 correct, and whose free response work is solid but not flawless, averaging seven out of nine points across all four questions for 28 raw FRQ points. That student did not have a clean run. They got real questions wrong and lost real points to a rubric checkpoint here and there.'),
  H.p('Run those two numbers through the formula. Thirty five divided by 42, multiplied by 55, is a little over 46. Twenty eight divided by 36, multiplied by 45, is 35. Add them and the composite lands at 80.8 out of 100, comfortably inside the 70 to 78 territory this guide has been describing, with room above it. Missing seven multiple choice questions outright and dropping the equivalent of eight raw free response points, spread across four questions, still produced a composite that has historically meant a 5.'),
  H.box('key', 'Why this matters for how you study', '<p>If the bar were a perfect run, the right strategy would be perfectionism: recheck every answer, rewrite every method until it is flawless. Because the bar is a composite in the 70s out of 100, the right strategy is closer to triage. Bank the questions you know cold, do not let one hard multiple choice question or one messy free response paragraph convince you the exam is lost, and keep moving. A handful of misses on each section is priced in.</p>'),
  H.p('This is exactly the reasoning our <a href="/pages/ap-csa-score-calculator">score calculator</a> is built to let you run for yourself: plug in a raw MCQ count and a raw FRQ estimate from a practice exam, and see where the resulting composite falls against this same territory, rather than guessing at it from memory.'),

  H.h2(SECTIONS[4]),
  H.p('The weighting is close enough to even, 55 and 45, that the practical advice writes itself: you cannot coast on one section and expect the other to carry you. A student who is a strong coder but a weak test taker sometimes assumes a great free response performance can make up for a rough multiple choice section, because free response is where the real programming happens. The math does not support that instinct. A perfect free response section is worth 45 composite points at most. If the multiple choice section goes badly enough, 45 points from free response alone cannot reach the historical 5 territory on its own.'),
  H.p('The same logic runs the other direction. A perfect multiple choice section, all 42 correct, is worth 55 composite points, which sounds like most of the way there. But if the free response section is nearly blank, worth only 10 raw points out of 36, the composite comes out to 67.5. That is a strong result and it still falls short of the 70 to 78 territory this guide has described, because 55 points from a perfect multiple choice section plus a weak free response performance is not enough by itself. Neither section is optional, and neither section is a safety net for skipping the other.'),
  H.p('This is also why our <a href="/blogs/ap-csa/ap-csa-mcq-pacing-ninety-seconds">multiple choice pacing guide</a> and the FRQ material in the <a href="/pages/ap-csa-frq-archive">free response archive</a> get equal billing on this site rather than one crowding out the other. A study plan that spends the whole spring drilling multiple choice speed and never opens a free response rubric is chasing 55 points out of 100 as if it were the whole exam.'),

  H.h2(SECTIONS[5]),
  H.p('Both of these are composite math problems rather than code traces, since that is the reasoning this guide is actually about. Work them out before checking the explanation.'),
  H.mcq({
    n: 1,
    stem: 'A student answers 30 of the 42 multiple choice questions correctly and earns 24 of the 36 raw free response points. Using the composite formula from this guide, what is the resulting composite score out of 100, rounded to the nearest whole number?',
    options: ['61', '69', '75', '82'],
    correct: 1,
    why: 'Thirty divided by 42, multiplied by 55, is about 39.3. Twenty four divided by 36, multiplied by 45, is exactly 30. Added together that is about 69.3, which rounds to 69. Notice this student got 12 multiple choice questions wrong and lost a third of the available free response points, and still landed just under the low end of the historical 5 territory this guide described. It is a strong illustration of why 70 is described as a floor to clear rather than a target to graze: this composite is close, but a real cutoff analysis would place it in 4 territory in most years.',
  }),
  H.mcq({
    n: 2,
    stem: 'A student answers every multiple choice question correctly, 42 of 42, but earns only 10 of the 36 raw free response points. Which statement about the resulting composite is accurate?',
    options: [
      'A perfect multiple choice score alone reaches the mid 90s composite',
      'A perfect multiple choice score alone tops out around 68 composite, short of the historical 5 territory',
      'A perfect multiple choice score alone guarantees a 5 regardless of free response',
      'Free response barely changes the composite once multiple choice is perfect',
    ],
    correct: 1,
    why: 'A perfect multiple choice section is worth its full 55 composite points, since 42 divided by 42 multiplied by 55 is exactly 55. Ten divided by 36, multiplied by 45, adds only about 12.5 more. The composite tops out at 67.5, below the 70 to 78 territory this guide has described. That is the clearest possible demonstration of the near-even weighting: a flawless multiple choice run cannot rescue a free response section that went badly, because free response alone is worth 45 of the available 100 composite points, and this student left most of them on the table.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What raw score do I need on AP CSA to get a 5?', a: 'There is no official published number, since College Board sets cutoffs after each exam based on that year\'s difficulty. A reasonable, sourced estimate, built from released scoring worksheets and historical score distributions, puts the composite territory for a 5 at roughly 70 to 78 out of 100 composite points, which combines your multiple choice and free response raw scores by weight rather than adding them directly.' },
    { q: 'How does the AP CSA score calculator formula actually work?', a: 'Composite equals your multiple choice raw score divided by 42, multiplied by 55, plus your free response raw score divided by 36, multiplied by 45. Free response is scored across four questions worth 9 points each, for 36 raw points total. The result is a composite out of 100 that maps to the 1 through 5 scale.' },
    { q: 'Can I get a 5 without a perfect score on AP CSA?', a: 'Yes, and this is the most common misunderstanding about the exam. A student who misses several multiple choice questions and drops several free response points can still land comfortably inside the historical 5 territory, because that territory starts well below a perfect composite of 100. A worked example in this guide shows a composite of 80.8 from a run that included seven missed multiple choice questions.' },
    { q: 'Is multiple choice or free response more important on AP CSA?', a: 'They are close to equally weighted, at 55 percent for multiple choice and 45 percent for free response. Neither section can fully cover for a weak performance on the other, which is why a study plan should split real time between multiple choice tracing practice and free response rubric practice rather than favoring one.' },
    { q: 'Why do different AP CSA score calculators show slightly different cutoffs?', a: 'Because every calculator not built by College Board is estimating from the same imperfect public information: released scoring worksheets and published score distributions. Slight differences between calculators usually reflect which past years they weighted most heavily, not a meaningful disagreement about how the exam is scored.' },
  ]),

  H.cta({
    heading: 'Run your own raw score through the math',
    body: 'Our free AP CSA score calculator uses this same weighting, plus daily multiple choice practice and a full free response archive with graded solutions.',
    links: [
      { href: '/pages/ap-csa-score-calculator', text: 'Score calculator' },
      { href: '/pages/ap-csa-qotd-hub', text: 'Daily practice', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Composite territory is an estimate sourced from released scoring worksheets and historical score distributions, not an official College Board table. Last reviewed September 29, 2026. For more on how the 2026 curve actually shook out, see our <a href="/blogs/ap-csa/ap-csa-score-distribution-2026-analysis">score distribution analysis</a>.'),
]);

module.exports = { meta, body };
