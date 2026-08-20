'use strict';
// Weekly course post: AP CSP. Reference piece, not news. The full section by
// section breakdown of the exam format: multiple choice, written response,
// and how the five Big Ideas are weighted inside the multiple choice section.
const H = require('../../lib/blog-house');

const SRC = {
  cb: { source: 'College Board, AP Computer Science Principles exam', url: 'https://apcentral.collegeboard.org/courses/ap-computer-science-principles/exam', asOf: 'August 2026' },
  ced: { source: 'College Board AP Computer Science Principles Course and Exam Description', url: 'https://apcentral.collegeboard.org/media/pdf/ap-computer-science-principles-course-at-a-glance.pdf', asOf: 'August 2026' },
};

const SECTIONS = [
  'The AP CSP exam format, section by section',
  'Section I: what the 70 multiple choice questions actually look like',
  'Section II: the two written response questions, answered from your own project',
  'How the two sections add up to your final score',
  'The five Big Ideas, and how much each one is actually worth',
  'Where the weighting sends your study hours',
];

const meta = {
  title: 'AP CSP Exam Format: Every Section, Every Weighting',
  handle: 'ap-csp-exam-format-every-section',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp exam format',
  publishOn: '2026-08-25',
  seoTitle: 'AP CSP Exam Format: Sections, Timing, Weighting',
  seoDescription: 'A full breakdown of the AP CSP exam format: the multiple choice section, the two written response questions, and how the five Big Ideas are weighted.',
  summary: 'Every section of the AP Computer Science Principles exam, in one place: how the multiple choice section is built, how the two written response questions are scored from your own Personalized Project Reference, how the two sections combine into your composite score, and how much of the multiple choice section each of the five Big Ideas actually carries.',
  tags: ['AP CSP', 'Exam Format', 'Big Ideas', 'Multiple Choice', 'Written Response'],
  // 70 percent / 30 percent restate the sourced section weighting table above
  // them on the page. The two Big Idea ranges restate the sourced Big Idea
  // table in the same way, where a reader first meets each figure with its
  // citation attached.
  allowedInlineNumbers: ['70 percent', '30 percent', '30 to 35 percent', '21 to 26 percent', '10 to 13 percent'],
};

const body = H.article([
  H.dek('The AP CSP exam format is two sections that reward almost opposite skills: seventy multiple choice questions you answer alone against the clock, and two written responses you answer from a document you built yourself months earlier. Here is exactly how each one is built, timed, and weighted, with the numbers sourced so you can stop guessing.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'August 25, 2026', updated: 'August 25, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.p('If you have already read about the <a href="/blogs/ap-csp/ap-csp-create-performance-task-what-changed">Create performance task change</a>, the short version is that the written responses used to be drafted at home and are now answered in a proctored room. This guide does not re-cover that change. It answers a different question: once you sit down for the actual AP CSP exam, what is on the page in front of you, in what order, worth how much, and on what topics.'),

  H.h2(SECTIONS[0]),
  H.p('The AP CSP exam format splits into two sections that happen back to back on exam day, and they are graded, timed, and structured differently enough that treating them as one thing is where a lot of preparation goes wrong.'),
  H.table(
    ['Section', 'Format', 'Timing', 'Share of your score'],
    [
      ['Section I: Multiple choice', '70 questions: mostly single-select, a handful multi-select, a short run that shares one passage', '120 minutes', '70 percent'],
      ['Section II: Written response', '2 questions, answered from your printed Personalized Project Reference', '60 minutes', '30 percent'],
    ]
  ),
  H.sourceNote('College Board AP Computer Science Principles exam overview', 'https://apcentral.collegeboard.org/courses/ap-computer-science-principles/exam', 'August 2026'),
  H.p(H.stat('Put together, the two sections run for a combined 180 minutes of testing time, three hours, taken in one sitting', SRC.cb)),
  H.p('Notice what that table does not say: it does not say the two sections feel similar. Section I moves fast and rewards a large amount of accurate recognition and simulation under time pressure. Section II moves slowly and rewards depth on exactly two prompts about a program only you have seen. Preparing for one does very little to prepare you for the other, which is the single most common planning mistake students make with the AP CSP exam format.'),

  H.h2(SECTIONS[1]),
  H.p('Seventy questions in two hours works out to a little under two minutes per question on average, though the exam is not evenly paced in practice: some questions are answerable in ten seconds and others need the full two minutes, so the average is a planning number, not a target to hit on every single item.'),
  H.p('Most of the section is single-select questions with four answer choices, the traditional multiple choice format. A smaller set are multi-select, where you are told up front how many of the listed choices to pick, and partial credit does not exist on those items: you need every correct choice and no incorrect ones. A short run of questions near the end of the section shares a single scenario or passage, so a mistake reading the shared setup can cost you more than one question rather than just one.'),
  H.box('tip', 'The pacing habit that actually works', '<p>Do not try to hit exactly one minute forty per question. Instead, build the habit of flagging anything that is taking more than ninety seconds and moving on, then returning to flagged questions with whatever time is left. A question you are stuck on for four minutes costs you the two easy questions you never got to, not just itself.</p>'),
  H.p('The multiple choice section uses rights only scoring, meaning a wrong answer costs you nothing beyond not earning the point. There is no penalty for guessing, so an unanswered question and a wrong guess are worth exactly the same amount: zero. Leaving a bubble blank is never the better option.'),

  H.h2(SECTIONS[2]),
  H.p('Section II is short in question count and long in what each question demands. There are two written response questions, and both draw entirely on the printed Personalized Project Reference you are handed at the start of the section, the same two code screenshots you chose and submitted earlier in the year as part of your Create performance task.'),
  H.p('The first question is narrower and worth less. The second is worth more and is graded against a five row rubric, one row for each of the categories a strong explanation needs to hit: program purpose, algorithm behaviour, testing, and abstraction, among them. You are not writing an essay. You are answering specific prompts about specific code you already have in front of you, and the rubric rewards precision about your own program over general statements that could describe any program.'),
  H.box('key', 'What separates a full-credit answer from a partial one', '<p>A rubric row is looking for a concrete detail only someone who wrote this exact program could supply: a variable name, an input that breaks a boundary case, a specific reason a design choice was made. An answer that would be equally true of a classmate\'s program earns little, no matter how well it is written.</p>'),
  H.p('Because the two questions are worth 6 raw points combined and those raw points scale up to 30 composite points, each individual rubric row is worth more of your final score than it looks like on paper. Our <a href="/pages/ap-csp-written-response-guide">written response guide</a> breaks the five row rubric down category by category with worked examples, which is worth reading before exam day rather than during it.'),

  H.h2(SECTIONS[3]),
  H.p('The two sections do not average together evenly. Section I carries more than double the weight of Section II, which changes how a mistake in one section affects your final score compared to a mistake in the other.'),
  H.p('A single missed multiple choice question costs you a small fraction of the 70 percent that section controls, easy to absorb across seventy questions. A weak answer on one of the two written response rubric rows costs you a much larger fraction of the smaller 30 percent that section controls, because there are only six raw points total to spread across both questions. That asymmetry is the practical argument for treating Section II preparation as seriously as Section I preparation, even though it is a fraction of the question count: fewer opportunities to earn points means each one matters more.'),
  H.box('warn', 'The mistake this causes', '<p>Students who feel confident in multiple choice practice sometimes under-prepare for the written responses because two questions feels like a small target. It is a small target with a large per-question cost. Do not let question count stand in for point value when you decide where your study hours go.</p>'),

  H.h2(SECTIONS[4]),
  H.p('The multiple choice section is not one undifferentiated pile of seventy questions. College Board organizes the whole AP CSP course, and the exam that tests it, around five Big Ideas, and each one carries a published range of how much of the multiple choice section it accounts for.'),
  H.table(
    ['Big Idea', 'What it covers', 'Share of the multiple choice section'],
    [
      ['1: Creative Development', 'The iterative process of planning, developing, and testing a program', '10 to 13 percent'],
      ['2: Data', 'How data is represented, compressed, and used to extract information', '17 to 22 percent'],
      ['3: Algorithms and Programming', 'Writing, tracing, and reasoning about algorithms and program logic', '30 to 35 percent'],
      ['4: Computing Systems and Networks', 'How devices, the internet, and distributed systems work and fail', '11 to 15 percent'],
      ['5: Impact of Computing', 'The effects, benefits, and risks computing has on people and society', '21 to 26 percent'],
    ]
  ),
  H.sourceNote('College Board AP Computer Science Principles Course and Exam Description', 'https://apcentral.collegeboard.org/media/pdf/ap-computer-science-principles-course-at-a-glance.pdf', 'August 2026'),
  H.p('Two things are worth saying plainly about that table. First, these are published as percentage ranges, not fixed counts. College Board does not publish an exact number of questions assigned to each Big Idea on a given form of the exam, and treating any specific question count per Big Idea as official would be inventing precision that does not exist. Second, the ranges are wide enough that neighboring Big Ideas overlap, so the exact rank order between Data and Impact of Computing can shift slightly from form to form even though the overall shape of the weighting does not.'),

  H.h2(SECTIONS[5]),
  H.p('Even with exact question counts unavailable, the published ranges are specific enough to make a real study plan out of, and they point in a clear direction.'),
  H.p(H.stat('Algorithms and Programming alone can account for 30 to 35 percent of the multiple choice section, the largest share of any single Big Idea', SRC.ced)),
  H.p(H.stat('Impact of Computing is the second largest at 21 to 26 percent', SRC.ced)),
  H.p('Add those two together and, even at the low end of both ranges, they cover more than half the multiple choice section by themselves. That is the honest, sourced version of a study priority: if your remaining time is limited, algorithm tracing and the impact and risk questions around computing are where the largest share of points sit, and Creative Development at 10 to 13 percent is the smallest target of the five.'),
  H.box('tip', 'What this does and does not tell you', '<p>A wide weighting range is guidance, not a guarantee. It tells you where to put more hours relative to less, not exactly how many of the seventy questions to expect on any one topic. Use it to break a tie when you are deciding what to review next, not to skip a Big Idea entirely because its range happens to be smaller. A 10 to 13 percent share of seventy questions is still seven to nine questions, which is not nothing.</p>'),
  H.p('Our <a href="/pages/ap-computer-science-principles-resources">full library of AP CSP resources</a> is organized by Big Idea for exactly this reason, so you can weight your practice time the same way the exam weights the section.'),

  H.h2('Practice the multiple choice format'),
  H.p('Both questions below are built in the exam\'s scenario style, and both cover Big Ideas that carry real weight but do not get discussed as often as algorithms or data. Try each one before reading the explanation.'),
  H.mcq({
    n: 1,
    stem: 'A large website spreads its data across several servers in different physical locations. When one server goes offline unexpectedly, users do not notice any disruption, because requests are automatically redirected to a working server that holds the same data. Which Big Idea 4 concept does this scenario best illustrate?',
    options: [
      'Bandwidth, because splitting the data across servers increases how much data can move at once',
      'Fault tolerance, because the overall system continues operating correctly even though one component failed',
      'Encryption, because the data is being protected from unauthorized access',
      'Compression, because storing the data on multiple servers reduces its total file size',
    ],
    correct: 1,
    why: 'Fault tolerance describes a system\'s ability to keep working correctly when part of it fails, and that is exactly what is happening: one server goes down and the system routes around the failure without the user noticing. Bandwidth is about data transfer capacity, not failure, so option A describes a real Big Idea 4 concept but not the one this scenario shows. Encryption and compression are Big Idea 2 concepts about protecting or shrinking data, and neither is what the scenario describes, since nothing here is about data size or unauthorized access. The redundant servers and the automatic redirect are the two details that point specifically to fault tolerance rather than any other systems concept.',
  }),
  H.mcq({
    n: 2,
    stem: 'A hiring company uses a computer program to automatically screen job applications and rank candidates before a human reviewer sees them. The program was trained on the company\'s past hiring decisions, most of which were made by a small group of managers over many years. Which of the following is the most likely concern to raise about this system under Big Idea 5?',
    options: [
      'The program will run more slowly than a human reviewer, which will delay hiring decisions',
      'The program may reproduce and scale up biases that were present in the past hiring decisions it learned from',
      'The program cannot be updated once it has been trained, so it will never improve',
      'The program requires more storage space than keeping paper applications on file',
    ],
    correct: 1,
    why: 'Impact of Computing includes how algorithms trained on historical human decisions can absorb and then automate whatever bias was present in that history, applying it consistently and at a larger scale than any individual human reviewer could. That is the central, well documented concern with automated screening trained on past decisions, and it is a Big Idea 5 issue precisely because it is about the social effect of a computing system, not a technical limitation. Runtime speed, whether a model can be retrained, and storage space are not the concept this scenario is built to test. The detail that the training data came from a small group of people making decisions over many years is what should point you toward bias rather than any of the other options.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'How many questions are on the AP CSP multiple choice section?', a: 'Seventy. Most are single-select with four answer choices, a smaller number are multi-select where you are told exactly how many choices to pick, and a short run near the end shares one passage or scenario across several questions.' },
    { q: 'How is the AP CSP exam weighted between multiple choice and written response?', a: 'Multiple choice is worth 70 percent of your composite score and the two written response questions together are worth the other 30 percent, even though the written response section has far fewer questions.' },
    { q: 'How many written response questions are on the AP CSP exam?', a: 'Two. Both are answered from the printed Personalized Project Reference you submit earlier in the year as part of the Create performance task, not from memory or from code you bring into the room.' },
    { q: 'Which Big Idea has the most multiple choice questions on the AP CSP exam?', a: 'Algorithms and Programming carries the largest published range, 30 to 35 percent of the multiple choice section, with Impact of Computing second at 21 to 26 percent. College Board publishes these as ranges rather than a fixed count of questions per Big Idea.' },
    { q: 'Is there a penalty for guessing on the AP CSP multiple choice section?', a: 'No. The section uses rights only scoring, so an incorrect answer costs the same as leaving the question blank, which is nothing beyond the point you did not earn. There is no reason to leave a question unanswered.' },
    { q: 'How long is the entire AP CSP exam?', a: 'The multiple choice section runs 120 minutes and the written response section runs 60 minutes, for a combined 180 minutes across both sections on exam day.' },
  ]),

  H.cta({
    heading: 'Study the sections in proportion to how they are weighted',
    body: 'A full practice exam library, a written response guide broken down by rubric row, and resources organized by Big Idea so your practice time matches the exam.',
    links: [
      { href: '/pages/ap-computer-science-principles-resources', text: 'All CSP resources' },
      { href: '/pages/ap-csp-written-response-guide', text: 'Written response guide', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reflects the AP Computer Science Principles exam structure and Big Idea weighting published by College Board for the current exam cycle. Last reviewed August 25, 2026.'),
]);

module.exports = { meta, body };
