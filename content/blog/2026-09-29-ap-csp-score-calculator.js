'use strict';
// Weekly course post: AP CSP. Requirements/weighting-to-outcome piece: what a
// 5 actually requires from the two components of the score, the multiple
// choice section and the Create Performance Task, and why neither one can
// cover for the other. This is deliberately NOT the aggregate 1-5 score
// distribution piece that may publish the same week
// (2026-09-29-ap-csp-score-distribution.js). That post, if it exists, answers
// how many students land at each score. This post answers a different
// question: given the exam's fixed weighting, what does earning a 5 actually
// require on each component, and what should that change about how a student
// prepares. No overlap in the historical-distribution numbers by design.
const H = require('../../lib/blog-house');

const SRC = {
  weight: {
    source: 'College Board, AP Computer Science Principles exam',
    url: 'https://apcentral.collegeboard.org/courses/ap-computer-science-principles/exam',
    asOf: 'September 2026',
  },
  assess: {
    source: 'College Board, AP Computer Science Principles Assessment overview',
    url: 'https://apstudents.collegeboard.org/courses/ap-computer-science-principles/assessment',
    asOf: 'September 2026',
  },
  noSubmit: {
    source: 'College Board AP Central, Create performance task non-submission FAQ',
    url: 'https://apcentral.collegeboard.org/faq-my-student-did-not-submit-create-performance-task-will-they-receive-a-score',
    asOf: 'September 2026',
  },
  noExam: {
    source: 'College Board AP Central, no-exam no-score policy FAQ',
    url: 'https://apcentral.collegeboard.org/courses/ap-computer-science-principles/course/faq/no-exam-no-score-policy',
    asOf: 'September 2026',
  },
  estimate: {
    source: 'Fiveable AP CSP score calculator, an independent aggregator estimate rather than an official College Board figure',
    url: 'https://fiveable.me/ap-comp-sci-p/ap-score-calculator',
    asOf: 'September 2026',
  },
};

const SECTIONS = [
  'What an AP CSP score calculator actually has to add up',
  'The two components, side by side',
  'What performance level on each component generally correlates with a 5',
  'Why you cannot phone in the Create Task, even if the exam feels easy',
  'Why a great project cannot save a rough multiple choice section either',
  'How to actually split your prep time between the two',
];

const meta = {
  title: 'AP CSP Score Calculator: What a 5 Actually Requires',
  handle: 'ap-csp-what-a-5-requires',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp score calculator',
  publishOn: '2026-09-29',
  seoTitle: 'AP CSP Score Calculator: What a 5 Requires',
  seoDescription: 'How the AP CSP score calculator math actually works: the real weighting between the exam and the Create Task, and what level on each earns a 5.',
  summary: 'Most AP CSP score calculator tools just take two numbers and spit out a 1-5 estimate without explaining why. This post walks through the actual weighting between the multiple choice exam and the Create Performance Task, what performance level on each is generally understood to correlate with a 5 (clearly framed as estimates, since College Board does not publish an exact formula), and the concrete planning consequence: a strong project cannot be skipped even if the exam feels easy, and strong exam prep cannot be skipped even if the project turned out great.',
  tags: ['AP CSP', 'Score Calculator', 'Create Performance Task', 'Exam Weighting', 'Study Strategy'],
  allowedInlineNumbers: ['70 percent', '30 percent'],
};

const body = H.article([
  H.dek('Type "ap csp score calculator" into Google and you will find a dozen tools that take two numbers, a multiple choice score and a Create Performance Task score, and hand back an estimated 1 through 5. What almost none of them explain is why those two numbers combine the way they do, or what level on each one a 5 actually requires. This is that explanation.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 29, 2026', updated: 'September 29, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('If you came here looking for how many students land at each score nationally, that is a different question than this post answers, and it is worth being upfront about the distinction. This post is about requirements: given the exam\'s actual weighting, what does a 5 require from you on each component, and what should that change about how you spend your remaining prep time. Numbers about how the whole applicant pool spreads out across 1 through 5 belong somewhere else.'),

  H.h2(SECTIONS[0]),
  H.p('Every AP CSP score calculator you will find online is doing the same basic thing: converting two very differently shaped pieces of work into one number on a 1 to 5 scale. The reason that conversion feels opaque, even when the tool spits out a clean result, is that the two inputs are not measuring the same kind of performance at all.'),
  H.p(H.stat('The multiple choice section is worth 70 percent of your final AP CSP score, and the Create Performance Task, including the two written responses you answer about it on exam day, is worth the other 30 percent', SRC.weight)),
  H.p('That second clause matters more than it looks like it should. The written responses used to be drafted at home over weeks, and now they are answered during a proctored window from a document called the Personalized Project Reference. We covered that change in full <a href="/blogs/ap-csp/ap-csp-create-performance-task-what-changed">in a separate post</a>, and it is worth understanding on its own, but the piece that matters here is simpler: those written responses are graded as part of the fixed 30 percent Create Task share, not folded into the larger exam-day section. A student who is strong on exam day multiple choice questions but weak on explaining their own project is still losing points out of the smaller pool, not the larger one, and the two pools do not borrow from each other.'),

  H.h2(SECTIONS[1]),
  H.p('Laid out side by side, the shape of each component is genuinely different, not just smaller or bigger versions of the same task.'),
  H.table(
    ['Component', 'Share of final score', 'What strong performance generally looks like'],
    [
      [
        'Multiple choice section',
        '70 percent',
        '70 questions in 120 minutes, covering all five Big Ideas. Strong performance means consistent accuracy across the full breadth of the course, sustained under time pressure, not depth on any one topic.',
      ],
      [
        'Create Performance Task',
        '30 percent',
        'A program built over the course of the year, submitted through the AP Digital Portfolio, scored against 6 rubric rows that are each pass or fail with no partial credit inside a row, plus two written responses answered from your Personalized Project Reference on exam day. Strong performance means earning nearly every row cleanly, not producing an impressive-looking program that fumbles a couple of specific rubric requirements.',
      ],
    ]
  ),
  H.sourceNote('College Board, AP Computer Science Principles Assessment overview', SRC.assess.url, 'September 2026'),
  H.p('Notice what that table does not say. It does not say the Create Task is worth less effort because it is worth fewer points. A fixed 30 percent share graded row by row, where you either earn a row or you do not, behaves very differently from a section where partial understanding still earns partial credit. That difference is the whole reason this post exists: treating 30 percent as "the smaller number, so the smaller priority" is exactly the mistake that costs students a full letter grade\'s worth of AP score.'),

  H.h2(SECTIONS[2]),
  H.p('Here is the part that has to be stated honestly before it gets stated at all: College Board does not publish the exact formula that converts a raw multiple choice score and a raw Create Task rubric score into a final 1 through 5. The scaled conversion is set after each administration through a standard-setting and equating process, and it is not released row by row the way a class syllabus grading scale would be. Anyone, including this post, who gives you a specific cutoff is giving you an estimate built from past released data and score distributions, not an official College Board number.'),
  H.box('warn', 'Read the next paragraph as a planning target, not a guarantee', '<p>The figures below come from aggregator estimates built on multiple years of released AP CSP score distributions, the kind of analysis sites like Fiveable publish. They are useful for planning how hard you need to perform on each component. They are not an official College Board cutoff, and the real threshold can shift a few points in either direction from one exam administration to the next.</p>'),
  H.p(H.stat('Independent estimates built from released score data put the composite needed for a 5 at roughly 83 out of 100 or higher', SRC.estimate)),
  H.p('Translated into what that actually asks of you on each component, the general shape looks like this. On the multiple choice section, a 5 generally requires answering somewhere in the low to mid 80s out of every 100 questions correctly, which in raw terms on a 70 question section usually means missing well under 15 questions total. On the Create Performance Task, a 5 generally requires earning nearly the entire rubric, meaning 5 or 6 of the 6 rubric rows, since each missed row costs a meaningful chunk of a section that only has 6 rows to give in the first place.'),
  H.p('The important word in both of those sentences is "generally." Because the two components are weighted so differently in size, and because the exact conversion is not published, there is real room for a student to compensate somewhat between them, a slightly softer multiple choice performance paired with a clean Create Task, or the reverse. What there is not room for is treating either component as optional. A student who is weak on one and only moderately solid on the other, rather than strong on one and merely acceptable on the other, is the profile that tends to land at a 3 or a 4 instead of a 5, according to the same aggregator analysis. Being strong everywhere is what the estimate actually asks for, not being strong in one place and hoping the math forgives the other.'),

  H.h2(SECTIONS[3]),
  H.p('The instinct to under-invest in the Create Task is understandable. It does not feel like "the exam" the way a timed multiple choice section does, it gets built gradually across months rather than in one sitting, and a student who is already comfortable with the course content can reasonably assume the project will take care of itself. That assumption is the single most expensive one a confident student can make about AP CSP.'),
  H.p(H.stat('A student who does not submit the Create Performance Task still receives an AP score if they sit for the end of course exam, but that score is built almost entirely on the multiple choice section alone, since the Create Task supplies a fixed 30 percent of the composite that a missing submission simply does not contribute', SRC.noSubmit)),
  H.p('Read that carefully. It does not say the student gets no score, and it does not say the multiple choice section can be reweighted to cover the gap. It means the missing 30 percent functions the same as scoring zero on it, which caps the realistic ceiling on the final composite in almost every real scenario, regardless of how well the exam itself went. The reverse failure mode is just as costly and less obvious: a student who submits a completed Create Task but does not sit for the actual end of course exam has their score cancelled entirely rather than reduced, because the exam and the Create Task are only scored as a pair.'),
  H.p('Because the 6 rubric rows are graded pass or fail with no partial credit inside a row, the way a project loses points is not gradual the way missed multiple choice questions are. It is possible to build a program that looks polished and still fail two or three specific rows, because a row is not measuring polish. It is measuring specific, checkable things: whether a list genuinely manages complexity rather than storing three fixed values, whether a student developed procedure actually changes behavior based on its parameter rather than accepting one it ignores, whether the written responses reference the actual code rather than describing a generic program that could belong to anyone.'),
  H.ul([
    'A list used for two or three items that never grow or get filtered rarely satisfies the row asking a list to manage complexity, even if the program runs correctly.',
    'A procedure with a parameter that is accepted but never actually changes what the procedure does is a common way to lose a procedural abstraction row without realizing it.',
    'Written responses that describe what the code generally does, rather than referencing the specific segment in the Personalized Project Reference, tend to read as generic and lose credit even when the underlying understanding is real.',
    'A bug log kept while building, rather than reconstructed from memory in the exam room, is usually the difference between a specific, credited answer on the errors and testing row and a vague one that is not.',
  ]),
  H.p('None of that is fixable in the final week before a deadline the way cramming for a multiple choice section can be. If you want the full walkthrough of what each rubric row is actually checking for, <a href="/pages/ap-csp-create-task-ultimate-guide">our Create Task guide</a> goes row by row against the current rubric.'),

  H.h2(SECTIONS[4]),
  H.p('The reverse mistake is just as real, and it shows up in students who spend the fall building an excellent project and quietly assume that momentum will carry into exam day. It will not, because the two components are not testing overlapping ground.'),
  H.p('A Create Task project, even a genuinely strong one, tends to demonstrate deep understanding of two or three specific areas: whatever algorithm the program actually implements, how the program manages complexity through its list and procedures, and how the student tested and refined it. The multiple choice section covers all five Big Ideas of the course, which includes topics a strong project rarely touches directly: how the internet actually moves data, the societal and economic impacts of computing, how data gets compressed and represented in different formats, and the broader vocabulary of computing systems that a single project, however well built, simply does not exercise.'),
  H.p('There is also a pacing problem that project strength does not solve. Seventy questions in 120 minutes is a genuine time-management skill, distinct from knowing the material, and a student who has not practiced the section under real timing can run out of time on the back third of the exam even with strong content knowledge. A completed project earns you nothing on exam day pacing. That has to be practiced separately, on its own terms, the same way a runner\'s strength training does not substitute for actually running under race conditions.'),
  H.p('If you want to see how your own numbers on both components actually combine rather than guessing, running them through <a href="/pages/ap-csp-score-calculator">our AP CSP score calculator</a> is a faster way to find the specific gap than reasoning about it in the abstract, and it is built around the same weighting and estimate ranges described in this post rather than a guess.'),

  H.h2(SECTIONS[5]),
  H.p('Given all of that, the practical planning answer is not a 70-30 split of your study hours to match the score weighting. It is closer to the opposite, because the two components run on different clocks.'),
  H.p('The Create Task has a hard submission deadline that arrives well before the exam itself, so its work has to be front-loaded rather than balanced evenly across the year. Treat the fall and winter as the Create Task\'s actual season: pick a program idea you can explain in one sentence, make sure your list and your parameterized procedure are doing real work rather than technically satisfying a row, keep a bug log as you build rather than trying to reconstruct one from memory later, and rehearse explaining your two chosen code segments out loud before you submit your Personalized Project Reference. Once that submission window closes, that component is finished. There is no partial credit for effort spent on it afterward.'),
  H.p('That frees the spring to become almost entirely multiple choice season, and it should be treated as a genuinely separate skill: full-length timed practice sections, review across all five Big Ideas rather than just the ones your project happened to touch, and enough repetition that the pacing itself stops being the obstacle. Because the exam-day written responses are answered from a document you already built, the only thing left to prepare there is rehearsing your own explanation, which takes far less time than the underlying project did. For a broader set of practice material across both pieces, <a href="/pages/ap-computer-science-principles-resources">our full AP CSP resource hub</a> is organized around this same split between the Create Task and the exam itself.'),

  H.h2('Practice: reasoning about the weighting'),
  H.p('Two questions about how the score actually combines, since understanding the mechanics is part of using an AP CSP score calculator correctly rather than just plugging numbers into one.'),
  H.mcq({
    n: 1,
    stem: 'Which statement about how the AP CSP composite score is built is accurate?',
    options: [
      'The multiple choice section and the Create Performance Task are weighted equally.',
      'The multiple choice section is worth about 70 percent of the score, and the Create Performance Task, including its two written responses, is worth about 30 percent.',
      'The two written responses answered on exam day are scored separately from the Create Performance Task and are not part of its 30 percent share.',
      'A student who does not submit the Create Performance Task automatically receives no AP score at all.',
    ],
    correct: 1,
    why: 'The multiple choice section carries 70 percent and the Create Performance Task, written responses included, carries the other 30 percent. Option A misstates the split as even. Option C is wrong because the written responses are graded as part of the Create Task\'s 30 percent, not as a piece of the larger exam-day section. Option D overstates the consequence of a missing submission: the student still receives a score if they sit for the exam, it is simply built almost entirely from the multiple choice section, which functions like scoring zero on the missing 30 percent rather than voiding the score outright.',
  }),
  H.mcq({
    n: 2,
    stem: 'A student is confident about the multiple choice section but has been treating their Create Performance Task as something to get through quickly rather than build carefully. Based on how the two components combine, which best describes the risk they are taking?',
    options: [
      'None, since the multiple choice section is worth more than twice as much as the Create Performance Task.',
      'A small one, since a rushed rubric row can usually be corrected later if the written responses go well on exam day.',
      'A large one, since the rubric rows are pass or fail with no partial credit, and a rushed project can lose several rows at once, cutting into a fixed 30 percent that a strong multiple choice performance cannot buy back.',
      'No real risk as long as the program is submitted before the deadline, regardless of what the program actually does.',
    ],
    correct: 2,
    why: 'Because each of the 6 rubric rows is graded pass or fail rather than on a sliding scale, a rushed project can fail multiple rows at once in a way that a merely mediocre multiple choice performance cannot mirror, since missed multiple choice questions cost you one question at a time rather than a whole row. That lost share belongs to the fixed 30 percent Create Task pool and is not something a strong exam-day multiple choice performance can transfer over to cover. Once the written responses are answered on exam day, the rubric rows for the underlying project are already locked in from the earlier submission, so there is no later correction available.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Does College Board publish an exact formula for turning multiple choice and Create Task scores into a 1 through 5?', a: 'No. The scaled conversion is set through a standard-setting and equating process after each exam administration and is not published row by row. Any specific cutoff you see, including the estimate in this post, comes from independent analysis of released score distributions rather than an official College Board number, and it can shift a little from year to year.' },
    { q: 'Can I skip the Create Performance Task and still get a 5 if I ace the multiple choice section?', a: 'In practice, essentially no. A missing Create Task submission still allows a student to receive a score if they sit for the exam, but it functions like scoring zero on the fixed 30 percent the Create Task contributes, which caps the realistic composite ceiling well below what a 5 generally requires, regardless of multiple choice performance.' },
    { q: 'What happens if I submit the Create Performance Task but miss the actual end of course exam?', a: 'The score is cancelled entirely rather than reduced. The Create Task and the multiple choice exam are only scored together as a pair, so completing one without the other does not produce a partial AP score.' },
    { q: 'Which matters more for reaching a 5: the multiple choice section or the Create Task?', a: 'Both have to be strong, not just one of them. The multiple choice section carries the larger raw share of the score, but the Create Task is the less forgiving component because its 6 rubric rows are pass or fail with no partial credit, so a rushed project can lose ground quickly in a way a strong exam section cannot fully offset.' },
  ]),

  H.cta({
    heading: 'Run your own numbers before you guess',
    body: 'Our AP CSP score calculator turns your multiple choice and Create Task numbers into an estimated AP score using the current weighting, and the Create Task guide walks through every rubric row before your submission deadline.',
    links: [
      { href: '/pages/ap-csp-score-calculator', text: 'AP CSP score calculator' },
      { href: '/pages/ap-csp-create-task-ultimate-guide', text: 'Create Task guide', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reflects the AP Computer Science Principles score weighting published by College Board for the current exam cycle. Score-level estimates are drawn from independent aggregator analysis, not an official College Board formula. Last reviewed September 2026.'),
]);

module.exports = { meta, body };
