'use strict';
// Weekly course post: AP CSP. News peg is the 2026 score release. The real
// angle is structural: CSP grades its written responses inside the same
// proctored exam session as the multiple choice section, not as a separate
// FRQ day like CSA, and College Board does not publish a granular breakdown
// of written response category performance the way it does MCQ topic
// performance. This post says that honestly rather than inventing numbers to
// fill the gap, and gives the reader what the aggregate distribution can
// actually tell them instead.
const H = require('../../lib/blog-house');

const SRC = {
  dist26: { source: 'College Board AP Computer Science Principles score distributions', url: 'https://apstudents.collegeboard.org/about-ap-scores/score-distributions/ap-computer-science-principles', asOf: 'July 2026' },
  dist25: { source: 'College Board 2025 AP Computer Science Principles score distributions', url: 'https://apcentral.collegeboard.org/media/pdf/ap25-computer-science-principles-score-distributions.pdf', asOf: 'July 2025' },
  examFormat: { source: 'College Board, AP Computer Science Principles exam', url: 'https://apcentral.collegeboard.org/courses/ap-computer-science-principles/exam', asOf: 'August 2026' },
};

const SECTIONS = [
  'The 2026 AP CSP score distribution',
  'Why CSP is not like other AP exams here',
  'What College Board does and does not publish about written response performance',
  'What the distribution numbers can actually tell you',
  'Where to spend your prep time instead of chasing phantom numbers',
  'Practice: reading a distribution like an examiner',
];

const meta = {
  title: 'What the AP CSP Score Distribution Says About Written Responses',
  handle: 'ap-csp-score-distribution-written-response',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp score distribution',
  publishOn: '2026-09-29',
  seoTitle: 'AP CSP Score Distribution 2026: The Full Breakdown',
  seoDescription: 'The current AP CSP score distribution, sourced to College Board, and an honest look at what it does and does not reveal about written response performance.',
  summary: 'The 2026 AP CSP score distribution alongside the 2025 comparison, both sourced to College Board, plus a straight answer to whether written-response-specific performance data exists publicly. It does not, in the granular form students want, and this post explains why that is and what to do about it anyway.',
  tags: ['AP CSP', 'Score Distribution', 'Written Response', 'Exam Analysis', 'Study Strategy'],
  // Every percentage below restates a figure that is first introduced through
  // stat() with a citation attached. FAQ answers and the recap paragraph in
  // section 4 repeat those same figures in plain prose, which is what these
  // entries clear.
  allowedInlineNumbers: ['10 percent', '23 percent', '30 percent', '21 percent', '16 percent', '63 percent', '11 percent', '20 percent', '32 percent', '22 percent', '15 percent'],
};

const body = H.article([
  H.dek('A quarter of the internet will tell you exactly which written response category AP CSP students struggle with most. College Board has not actually published that breakdown. Here is the real 2026 score distribution, an honest account of what is and is not publicly known about written response performance, and what to do about it anyway.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 29, 2026', updated: 'September 29, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('Search for the AP CSP score distribution and you will find plenty of sites confidently reporting exactly which written response category costs students the most points, usually with a suspiciously specific percentage attached. Some of those numbers cannot be traced to anything College Board has actually published. That is a strange thing to admit on a page whose whole purpose is teaching you to read exam data correctly, but reading exam data correctly means telling you when the data is not there, not manufacturing it to look complete.'),

  H.h2(SECTIONS[0]),
  H.p('Here is the actual distribution, straight from College Board, for the exam administered this past May.'),
  H.p(H.stat('In 2026, 10 percent of AP CSP students earned a 5, 23 percent earned a 4, and 30 percent earned a 3', SRC.dist26)),
  H.p(H.stat('21 percent scored a 2 and 16 percent scored a 1 in 2026', SRC.dist26)),
  H.table(
    ['Score', '2026', '2025'],
    [
      ['5', '10%', '11%'],
      ['4', '23%', '20%'],
      ['3', '30%', '32%'],
      ['2', '21%', '22%'],
      ['1', '16%', '15%'],
    ]
  ),
  H.sourceNote('College Board AP Computer Science Principles score distributions', 'https://apstudents.collegeboard.org/about-ap-scores/score-distributions/ap-computer-science-principles', 'July 2026, with 2025 figures from College Board\'s prior year release for comparison'),
  H.p(H.stat('63 percent of AP CSP students scored a 3 or higher in both 2025 and 2026', SRC.dist26)),
  H.p('Notice what that table is not: it is not a barbell. Unlike AP CSA, where a quarter of students land on a 5 and nearly as many land on a 1, AP CSP piles up in the middle at 3, tapers gradually toward both ends, and barely moved year over year. That shape matters for how you should read everything else in this post.'),
  H.box('key', 'What a middle-heavy distribution means for you', '<p>A distribution shaped like this one rewards steady, broad competence more than it rewards one dominant strength. There is no single skill you can max out to guarantee a 5 the way tracing fluency drives the CSA curve. A 3 is genuinely the modal, expected outcome for a prepared student, which means the students who break into 4 and 5 territory are usually the ones who protected points across every section rather than the ones who were brilliant in one.</p>'),

  H.h2(SECTIONS[1]),
  H.p('This is the part that makes AP CSP unusual, and it is the actual reason this post exists rather than being just another score distribution recap.'),
  H.p('On AP CSA, the written portion is a free response section: four questions, answered on a separate part of the exam, scored against a rubric that a College Board reader applies to whatever you wrote that day. On AP CSP, the written responses are two questions, but they are not a free response section in that sense. They are answered inside the same proctored exam block as the multiple choice section, and you answer them by drawing on a document you built for months beforehand, your Personalized Project Reference, which holds annotated screenshots of the actual code from your own Create performance task project.'),
  H.p(H.stat('The written response questions make up 30 percent of the total AP CSP score', SRC.examFormat)),
  H.p('That structure changes what a "written response mistake" even is. A CSA free response mistake is usually a code mistake: a loop bound off by one, a missed edge case, a method that does not compile in your head the way it compiles on paper. A CSP written response mistake is much more often a communication mistake: a student whose program genuinely works and genuinely demonstrates the right concept, but who writes an answer too generic to prove it, because they are describing their own project from memory under a clock rather than reading a prompt cold.'),
  H.p('If you have not already read how this task changed, the short version lives in our piece on the <a href="/blogs/ap-csp/ap-csp-create-performance-task-what-changed">Create performance task moving into the proctored exam</a>. The exam format overall, including exactly how the two written response questions sit alongside the seventy multiple choice questions, is covered in full in our <a href="/pages/ap-csp-written-response-guide">written response guide</a>.'),

  H.h2(SECTIONS[2]),
  H.p('Here is the honest answer, stated plainly rather than buried: College Board publishes the aggregate score distribution above in detail, every year, without fail. It does not publish a public, category-by-category breakdown of AP CSP written response performance with the same reliability or granularity that it uses for some multiple choice topic reporting.'),
  H.p('This is worth sitting with for a second, because it explains why so many pages claiming to know exactly which written response category costs students the most points cannot actually point to where that number came from. A specific claim like "students earn this particular rubric point only some fraction of the time" sometimes traces back to a real scoring document. Just as often, once you try to verify it against the primary source, the number cannot be confirmed, or worse, contradicts itself between two pages that both claim to be quoting the same report. We checked. We are not going to hand you a number we could not verify just because it would make this post feel more complete.'),
  H.box('warn', 'A rule worth applying beyond this page', '<p>Any AP prep resource, including this one, that states an oddly precise percentage about student performance should make it easy for you to trace that number back to a College Board document. If it does not name a source, or the source it names does not actually say what is claimed, treat the number as decoration rather than fact. That habit protects you from bad study advice built on numbers nobody can find.</p>'),
  H.p('What College Board does confirm, consistently, in its public materials on the Create performance task and written response format, is the structure: two questions, drawn from four possible categories (program design and purpose, algorithm development, errors and testing, and data and procedural abstraction), each scored against specific rubric criteria, answered from your own Personalized Project Reference. That structure is real and well documented. A granular national breakdown of which of those four categories students lose the most points on, published with a verifiable source and a specific year attached, is not something we could confirm exists publicly at the level of detail this post would need to report it responsibly.'),

  H.h2(SECTIONS[3]),
  H.p('So if the category breakdown is not reliably available, what can the aggregate distribution actually tell a student sitting down to prepare? More than it looks like at first glance.'),
  H.h3('The middle of the curve is not a safety net'),
  H.p('Thirty percent of students land on a 3 in a typical year. That is the single largest bucket, and it means the median prepared CSP student is not coasting to a 4 or 5 by default. If your plan is to build a working project and hope the written responses take care of themselves, the distribution says that plan produces a 3, not a 5.'),
  H.h3('The bottom of the curve is dominated by structure, not content'),
  H.p('Sixteen to twenty percent of students land on a 1 in most years. In a class of students who all built a working, functioning program, a 1 usually does not mean the code failed. It much more often means the written responses failed to demonstrate what the code actually did: answers too vague to earn rubric points, or a Personalized Project Reference too thin to draw specific evidence from under time pressure. That is a communication failure layered on top of a working project, and it is entirely preventable with rehearsal.'),
  H.h3('A flat year over year distribution means the exam is stable, not that your prep can be'),
  H.p('The 2026 numbers barely moved from 2025. That stability is useful information: it means last year\'s released prompts, scoring guidelines, and Chief Reader commentary on common mistakes are still a reasonable guide to how this year\'s exam will be scored, since the underlying task has not shifted under students\' feet the way AP CSA\'s course redesign did. Stability in the aggregate does not mean stability for you individually. It means the gap between a 3 and a 5 is still decided by execution, not by which year you happened to sit for the exam.'),

  H.h2(SECTIONS[4]),
  H.p('Since the category-level data is not the reliable target, here is where your prep time is better spent, informed by what actually is well documented about this exam.'),
  H.ul([
    '<strong>Build a Personalized Project Reference you can actually use under a clock.</strong> A reference document that only makes sense to you, months later, in a proctored room, with a timer running, is not a reference document. Annotate it the way you would explain the project to a stranger.',
    '<strong>Rehearse writing about your own project, not generic prompts.</strong> Our <a href="/pages/ap-csp-written-response-archive">written response archive</a> and the sixteen prompts in the <a href="/pages/ap-csp-written-response-guide">written response guide</a> are built to be answered from your real project, because the skill being tested is explaining your specific code, not answering a hypothetical one.',
    '<strong>Treat the multiple choice section and the written section as separate skills that share a clock.</strong> Pacing across both sections in the same sitting is its own discipline, and the <a href="/pages/ap-computer-science-principles-resources">AP CSP resource hub</a> covers the full exam timeline alongside the Create task requirements in one place.',
    '<strong>Read the actual scoring criteria before exam day, not after.</strong> The four written response categories each reward a different kind of sentence. Knowing which category a prompt belongs to, before you start writing, is a separate and trainable skill from writing a good answer once you know.',
  ]),
  H.box('tip', 'The fastest fix for a thin written response', '<p>The single most common gap in a weak AP CSP written response is not missing content, it is missing specificity. "My program uses a list to store scores" earns little. "My program uses a list called scores because the number of entries changes as a user adds results, and I call the average procedure on that list every time a new score is added" earns the point, because it names the actual thing, the actual reason, and the actual moment it matters. Practice adding that third layer to every sentence you write about your project.</p>'),

  H.h2(SECTIONS[5]),
  H.p('Reading a score distribution correctly is itself a testable skill. Try these before checking the answers.'),
  H.mcq({
    n: 1,
    stem: 'A study guide claims: "42 percent of AP CSP students lose the algorithm development point due to weak boundary case explanations, according to College Board." What is the strongest response to this claim?',
    options: [
      'Accept it, since College Board is the only body that scores the exam',
      'Reject it outright, since AP CSP has no algorithm development category',
      'Ask for the specific document and year the figure comes from before treating it as fact',
      'Assume it is accurate because it sounds specific and technical',
    ],
    correct: 2,
    why: 'Algorithm development is a real category, so option B is wrong, and both A and D make the mistake this post is warning against: treating specificity or institutional authority as proof rather than asking where a number actually comes from. The correct habit, for this claim or any other, is to ask for the traceable source before repeating it, the same standard this post held its own written response claims to.',
  }),
  H.mcq({
    n: 2,
    stem: 'The AP CSP score distribution has stayed close to 30 percent scoring a 3, roughly 20 to 23 percent scoring a 4, and around 10 to 11 percent scoring a 5 across two consecutive years. What does that stability most reasonably suggest about how to use last year\'s released prompts and scoring guidelines to prepare?',
    options: [
      'They are now irrelevant, since a new year means a new distribution',
      'They remain a reasonably reliable guide, since the exam\'s difficulty and structure appear stable',
      'They only apply to students who scored a 5 the previous year',
      'They should be ignored in favor of guessing at unpublished category breakdowns',
    ],
    correct: 1,
    why: 'A distribution that barely shifts year over year is evidence that the underlying task, difficulty, and scoring approach have not changed much either, which is exactly the condition under which last year\'s released materials stay useful this year. Option D repeats the mistake the post spent a whole section warning against: reaching for an unverifiable number instead of using the well documented material that already exists.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What is the current AP CSP score distribution?', a: 'In 2026, 10 percent of students earned a 5, 23 percent earned a 4, 30 percent earned a 3, 21 percent earned a 2, and 16 percent earned a 1, according to College Board. That is close to the 2025 distribution of 11 percent, 20 percent, 32 percent, 22 percent, and 15 percent respectively, and 63 percent of students scored a 3 or higher in both years.' },
    { q: 'Does College Board publish which written response category students struggle with most?', a: 'Not with the kind of specific, verifiable, national breakdown this question is really asking for. College Board publishes detailed aggregate score distributions every year and documents the written response structure and rubric categories thoroughly. A granular public statistic on category-level performance, sourced clearly enough to report responsibly, is not something we could confirm exists at the level of detail many other sites claim.' },
    { q: 'Is AP CSP graded differently from AP CSA?', a: 'Yes, in a way that matters for how you prepare. AP CSA\'s free response is answered on a separate section of the exam, in real time, about problems you have never seen. AP CSP\'s written responses are answered inside the same proctored session as the multiple choice section, but from a Personalized Project Reference you built over months around your own Create task project, so the skill being tested is closer to explaining your own work clearly than solving a fresh problem.' },
    { q: 'If there is no category breakdown, how should I actually study for the written response section?', a: 'Rehearse writing about your real project against the four known categories, using a timer, until the habit of naming specific inputs, specific values, and specific reasons becomes automatic. The structure of what graders look for is well documented even without a public performance breakdown, so practicing against that structure is time well spent regardless.' },
    { q: 'Why does this exam distribution look so different from the AP CSA distribution?', a: 'AP CSA\'s distribution is a barbell, with roughly a quarter of students at the top score and nearly as many at the bottom, because its skill, tracing code fluently under time pressure, is closer to binary. AP CSP\'s distribution piles up around the middle score of 3 and tapers more gradually at both ends, consistent with an exam that rewards broad, steady competence across a wider set of tasks rather than one dominant skill.' },
  ]),

  H.cta({
    heading: 'Prepare for the section that actually decides your score',
    body: 'Sixteen written response prompts to rehearse against your own project, plus the full exam format broken down section by section.',
    links: [
      { href: '/pages/ap-csp-written-response-guide', text: 'Written response guide' },
      { href: '/pages/ap-csp-written-response-archive', text: 'Prompt archive', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Score figures reflect College Board data published July 2026, with 2025 figures shown for comparison. Last reviewed September 29, 2026.'),
]);

module.exports = { meta, body };
