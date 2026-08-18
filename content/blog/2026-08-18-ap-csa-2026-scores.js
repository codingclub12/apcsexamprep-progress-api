'use strict';
// Weekly course post: AP CSA. News peg is the 2026 score release, the first
// cohort examined on the 4-unit CED, read against the CS enrollment slide.
const H = require('../../lib/blog-house');

const SRC = {
  cb: { source: 'College Board 2026 AP score distributions', url: 'https://apstudents.collegeboard.org/about-ap-scores/score-distributions', asOf: 'July 2026' },
  enroll: { source: 'Computing Research Association enrollment reporting', url: 'https://builtin.com/articles/computer-science-degree-decline-ai', asOf: 'August 2026' },
};

const SECTIONS = [
  'What the 2026 AP CSA score distribution actually shows',
  'Why the middle of the curve went missing',
  'The redesign changed the exam more than students noticed',
  'The AI question every parent is asking right now',
  'What separates the 5s from the 1s',
  'Your first four weeks, if you are taking it this year',
];

const meta = {
  title: 'The 2026 AP CSA Score Distribution Tells a Story Nobody Expected',
  handle: 'ap-csa-score-distribution-2026-analysis',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'ap csa score distribution',
  publishOn: '2026-08-18',
  seoTitle: '2026 AP CSA Score Distribution: What the Numbers Mean',
  seoDescription: 'The 2026 AP CSA score distribution is unusually polarized: a quarter earned 5s and nearly as many earned 1s. A teacher explains why, and what it means for you',
  summary: 'The first cohort tested on the redesigned four unit AP CSA course produced one of the most polarized score distributions of any AP exam. Here is what drives the split, what the redesign actually changed, and how to land on the right side of it.',
  tags: ['AP CSA', 'Score Distribution', 'Exam Analysis', '2026', 'Study Strategy'],
  // Section weightings restate the sourced exam structure paragraph, and the two
  // FAQ figures restate the sourced distribution at the top of the post. Both
  // carry a visible citation where the reader meets them.
  allowedInlineNumbers: ['55 percent', '50 percent', '45 percent', '25 percent', '66 percent'],
};

const body = H.article([
  H.dek('A quarter of students earned the top score. Nearly as many earned the lowest. On an exam where the middle is supposed to be crowded, that is not noise, and it tells you exactly how to prepare.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'August 18, 2026', updated: 'August 18, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('The 2026 scores are out, and they are the first from students taught under the redesigned four unit course. Most coverage reported the headline number and moved on. The headline number is not the interesting part.'),

  H.h2(SECTIONS[0]),
  H.p('Here is the distribution, and the two figures that matter sit at opposite ends of it.'),
  H.p(H.stat('25 percent of AP CSA students earned a 5 in 2026', SRC.cb)),
  H.p(H.stat('66 percent scored a 3 or higher, and 23 percent earned a 1', SRC.cb)),
  H.p('Read those together. A quarter of the cohort mastered the material well enough for the top score. Almost a quarter finished at the bottom of the scale. For comparison, most AP exams bulge in the middle: plenty of 3s, fewer at each extreme. AP CSA does the opposite. It is a barbell.'),
  H.box('key', 'What a barbell distribution means for you', '<p>On a normal AP curve, drifting through the year lands you a 3. On this curve there is much less middle to drift into. The same effort that earns a comfortable 3 in a humanities AP tends to produce a 1 or a 2 here, because the skill being tested is cumulative: you either can trace and write Java under time pressure or you cannot, and there is no partial version of that.</p>'),

  H.h2(SECTIONS[1]),
  H.p('I have taught this course through the curriculum change, and the split is not mysterious once you have watched it happen in a classroom. Three things drive it.'),
  H.h3('Programming skill compounds, and so does falling behind'),
  H.p('In a content course, missing a week costs you that week. In a programming course, missing a week costs you that week plus every later week that assumed it. A student who never really understood how a loop mutates a variable does not struggle only with loops. They struggle with arrays, then with nested iteration, then with every algorithm question on the exam, because all of it is built on the thing they skipped.'),
  H.h3('The exam rewards fluency, not recognition'),
  H.p('Multiple choice questions in most subjects can be answered by recognising the correct statement. AP CSA multiple choice asks you to execute code in your head and report what happens. Recognition does not help. You either run the trace correctly or you get it wrong, and you have a little over ninety seconds to do it.'),
  H.h3('Free response is unforgiving of near misses'),
  H.p('Four coding questions, graded against a rubric of specific checkpoints. Code that is nearly right earns some points, but a student who has never written a complete method without an IDE autocompleting for them tends to lose points in clusters rather than singly.'),

  H.h2(SECTIONS[2]),
  H.p('The redesigned course is four units, and the exam structure moved with it. If you are studying from anything written before 2025, it is describing a course that no longer exists.'),
  H.table(
    ['Unit', 'Title', 'Share of the exam'],
    [
      ['1', 'Using Objects and Methods', '15 to 25 percent'],
      ['2', 'Selection and Iteration', '25 to 35 percent'],
      ['3', 'Class Creation', '10 to 18 percent'],
      ['4', 'Data Collections', '30 to 40 percent'],
    ]
  ),
  H.sourceNote('College Board AP Computer Science A course and exam description, 2025-26', null, 'August 2026'),
  H.p('Two structural changes matter more than the unit renaming. The multiple choice section is now 42 questions and carries 55 percent of the score, up from 40 questions at 50 percent. The free response section stays at four questions and now carries 45 percent. The standalone inheritance and polymorphism unit was removed entirely.'),
  H.sourceNote('College Board AP Computer Science A exam structure, 2025-26 redesign', null, 'August 2026'),
  H.box('tip', 'Where the weighting sends your study time', '<p>Units 2 and 4 together can account for the majority of the exam. If you are triaging, selection and iteration plus data collections is where your hours belong. Class creation is the smallest slice and the one students over prepare, because writing a class feels like the most impressive thing they learned.</p>'),

  H.h2(SECTIONS[3]),
  H.p('Let me address the thing sitting under every conversation about computer science this year, because pretending it is not there does students no favours.'),
  H.p('Computer science enrollment has fallen for the first time in roughly two decades, and the reporting attributes it largely to anxiety about AI replacing entry level programming work:'),
  H.p(H.stat('New CS bachelor\'s enrollment fell 12.9 percent in 2025-26', SRC.enroll)),
  H.p('So should a high school student still take AP CSA? Yes, and the reason is not the one you usually hear.'),
  H.p('The weak argument for taking it is that you will write Java professionally. Most of you will not, and you would not have before AI either. The strong argument is that AP CSA is the only course in a typical high school schedule that forces you to hold a precise mental model of a system and verify it against reality. You predict what the code will do, you run it, and the machine tells you flatly whether you were right. Almost nothing else in school gives feedback that honest.'),
  H.p('That skill is what supervising AI generated code requires. A tool that produces plausible code that is subtly wrong is dangerous to somebody who cannot trace it and harmless to somebody who can. The tracing skill this exam tests is precisely the skill that stops being optional in an AI heavy workflow.'),
  H.box('warn', 'The honest caveat', '<p>None of that means a computer science degree is a guaranteed job in the way it was in 2021, and anybody telling a fifteen year old otherwise is selling something. Take AP CSA because the reasoning skill is durable and because it tells you whether you enjoy this work, which is information worth having before you commit four years and tuition to it.</p>'),

  H.h2(SECTIONS[4]),
  H.p('After a decade of teaching this course, the students who land at the top of that barbell share habits rather than talent. These are the four that predict the outcome most reliably.'),
  H.ol([
    '<strong>They predict before they run.</strong> Before executing any code, they say out loud what it will print. Being wrong is the entire point: a wrong prediction is a bug in their mental model, found for free.',
    '<strong>They write code on paper.</strong> The free response section has no IDE, no autocomplete, no red underline. Students who only ever code in an editor discover in May that the editor was doing more work than they realised.',
    '<strong>They trace with a table, not with their eyes.</strong> Columns for each variable, one row per iteration. It feels slow in September and it is the reason they finish the multiple choice section in May.',
    '<strong>They treat error messages as information.</strong> Weak students see an error and change something at random. Strong students read the line number and the exception type first, every single time.',
  ]),
  H.p('If you want the tracing habit built for you, our <a href="/pages/ap-csa-qotd-hub">daily practice questions</a> are one traced problem a day, and the <a href="/pages/ap-csa-frq-archive">FRQ archive</a> has past free response questions with full solutions.'),

  H.h2(SECTIONS[5]),
  H.p('If you are starting the course this month, here is what to do while the material is still easy, because the first four weeks are when the barbell is decided.'),
  H.ul([
    '<strong>Week 1.</strong> Get code running outside of class on your own machine or in a browser editor. Students who never build this habit stay dependent on the classroom for nine months.',
    '<strong>Week 2.</strong> Start a bug journal. One line per error you hit, what it said, and what fixed it. By May it becomes the most useful revision document you own.',
    '<strong>Week 3.</strong> Do your first hand trace on paper. Pick any loop from class and produce the variable table without running it.',
    '<strong>Week 4.</strong> Write one complete method with the laptop closed. If you cannot, you have found your gap while it is still cheap to fix.',
  ]),

  H.h2('Two questions in the exam format'),
  H.p('Both are the tracing style the multiple choice section is built on. Predict the output before you open the answer.'),
  H.mcq({
    n: 1,
    stem: 'What does the following code segment print?',
    codeText: 'int[] values = {4, 8, 15, 16};\nint total = 0;\nfor (int i = 1; i < values.length; i++) {\n    total += values[i] - values[i - 1];\n}\nSystem.out.println(total);',
    options: ['12', '43', '16', '4'],
    correct: 0,
    why: 'The loop adds each consecutive difference: (8-4) + (15-8) + (16-15), which is 4 + 7 + 1, so 12. There is a faster route worth knowing: a sum of consecutive differences always collapses to the last element minus the first, so 16 - 4 = 12 without tracing at all. Recognising a telescoping sum turns a thirty second trace into a five second answer, and that time is what lets you finish the section.',
  }),
  H.mcq({
    n: 2,
    stem: 'Consider the following method. What is returned by mystery("racecar")?',
    codeText: 'public static String mystery(String s) {\n    String result = "";\n    for (int i = 0; i < s.length(); i++) {\n        if (i % 2 == 0) {\n            result = s.substring(i, i + 1) + result;\n        }\n    }\n    return result;\n}',
    options: ['"rcca"', '"accr"', '"raecr"', '"rcecar"'],
    correct: 0,
    why: 'Only even indices are used: 0, 2, 4, 6, giving the characters r, c, c, r. The trap is the concatenation order. Because each character is placed BEFORE the accumulated result rather than after it, the string is built backwards. Adding r, then c in front, then c, then r produces "rcca". Students who read the plus sign without noticing which side result sits on choose the reversed option almost every time.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What percentage of students get a 5 on AP CSA?', a: 'In 2026, 25 percent of AP Computer Science A students earned a 5, and 66 percent scored a 3 or higher, according to College Board score distributions published in July 2026.' },
    { q: 'Is AP CSA harder than it used to be?', a: 'The redesigned course covers four units rather than the previous ten and removed the standalone inheritance and polymorphism unit, so there is less breadth. The exam is not obviously easier, because the multiple choice section grew to 42 questions and now carries a larger share of the score.' },
    { q: 'How many units are in AP CSA now?', a: 'Four: Using Objects and Methods, Selection and Iteration, Class Creation, and Data Collections. Any resource describing ten units is based on the retired curriculum and should not be used.' },
    { q: 'Should I still take AP CSA if AI can write code?', a: 'Yes. The exam tests whether you can trace code and predict its behaviour precisely, which is exactly the skill needed to review code an AI produced. Being unable to verify generated code is the expensive version of this problem, not being unable to type it.' },
    { q: 'Do I need programming experience before AP CSA?', a: 'It is not formally required, but the score distribution suggests students arriving with no prior programming exposure face a steeper climb than in most AP courses. Working through the first unit before the school year starts is worthwhile if you have the option.' },
  ]),

  H.cta({
    heading: 'Land on the right side of that curve',
    body: 'Free daily tracing practice, full FRQ solutions, and a score calculator built to the current four unit exam.',
    links: [
      { href: '/pages/ap-csa-qotd-hub', text: 'Daily practice' },
      { href: '/pages/ap-csa-score-calculator', text: 'Score calculator', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Score figures reflect College Board data published July 2026. Last reviewed August 18, 2026.'),
]);

module.exports = { meta, body };
