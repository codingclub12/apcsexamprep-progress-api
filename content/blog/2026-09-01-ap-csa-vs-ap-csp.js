'use strict';
// Decision/comparison post: AP CSA vs AP CSP. This is the question almost
// every student and parent hits before signing up for either course, and most
// existing coverage answers it with a one-line cliche (CSA is programming,
// CSP is broader) and stops. This post tries to answer the actual decision:
// what each exam structurally tests, what public credit-policy data shows and
// does not show about how colleges treat the two, and concrete guidance for
// three different student profiles.
const H = require('../../lib/blog-house');

const SRC = {
  creditCSA: { source: 'Wiingy AP credit policy database', url: 'https://wiingy.com/resources/ap-computer-science-a-credit-policy/', asOf: 'August 2026' },
  creditCSP: { source: 'Wiingy AP credit policy database', url: 'https://wiingy.com/resources/ap-computer-science-principles-credit-policy/', asOf: 'August 2026' },
};

const SECTIONS = [
  'AP CSA vs AP CSP: the difference that actually decides this',
  'What AP CSA actually tests',
  'What AP CSP actually tests',
  'Which one colleges actually read',
  'What the credit and placement numbers show, and do not show',
  'Three student profiles, three different answers',
];

const meta = {
  title: 'AP CSA vs AP CSP: Which One Colleges Actually Read',
  handle: 'ap-csa-vs-ap-csp-college-recognition',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'ap csa vs ap csp',
  publishOn: '2026-08-31',
  seoTitle: 'AP CSA vs AP CSP: Which Colleges Actually Read',
  seoDescription: 'AP CSA vs AP CSP, explained honestly: what each exam actually tests, what credit-policy data shows about how colleges treat them, and which fits your goals.',
  summary: 'The AP CSA vs AP CSP question usually gets a one-line answer that is not very useful. Here is what each exam structurally tests, an honest look at how colleges actually treat the two, and specific guidance for three different kinds of students.',
  tags: ['AP CSA', 'AP CSP', 'Course Comparison', 'College Admissions', 'Course Selection'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('The AP CSA vs AP CSP decision is the first thing most students and parents get stuck on, and most explanations reach for the same tired line: CSA is programming, CSP is everything else. That is technically true and mostly useless for actually deciding. Here is what the two courses actually test, an honest look at how colleges treat each one, and specific guidance depending on what you want out of a computer science education.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 1, 2026', updated: 'September 1, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.p('If you searched for AP CSA vs AP CSP, you have probably already read three or four articles that all say the same thing in slightly different words: one is Java, one is broader, pick based on interest. That advice is not wrong, but it skips the part that actually matters for a transcript decision, which is what each exam is structurally built to measure and what that measurement is worth to the people reading your application or your credit request. This is the version of that answer with the details filled in.'),

  H.h2(SECTIONS[0]),
  H.p('Start with what each exam is actually built to prove, because the courses are not two flavors of the same thing. They test different skills, in different formats, for different audiences, and the difference is structural rather than a matter of difficulty.'),
  H.p('<strong>AP Computer Science A</strong> is taught and assessed in Java only. There is no option to write your free response answers in Python, JavaScript, or anything else, and the exam assumes you can read and produce working Java syntax under time pressure. The free response section has four required questions, each asking you to write actual functioning code, graded against a rubric that checks whether the method you wrote does what it is supposed to do. That is a direct test of programming ability. There is no partial credit for having the right idea if the code will not run, and there is no way to pass the free response section by reasoning about computing in the abstract.'),
  H.p('<strong>AP Computer Science Principles</strong> tests something different on purpose. The multiple choice exam covers computing concepts broadly, including data, algorithms, the internet, and the social and ethical implications of computing, and it does not require you to write code in any specific language during the timed exam itself. The programming component lives in the Create performance task, a personal project you build over weeks of class time, submit ahead of the exam window, and that can be written in any language or tool your class uses, including block based environments. A student can do very well in AP CSP with meaningfully less prior coding comfort than AP CSA assumes, because the exam is not asking them to produce syntactically correct code from memory under a clock.'),
  H.box('key', 'The one sentence version', '<p>AP CSA tests whether you can write correct Java under exam pressure. AP CSP tests whether you understand how computing works broadly, with a project component that lets you show programming ability in whatever language or tool fits, at a much lower floor of required prior experience.</p>'),

  H.h2(SECTIONS[1]),
  H.p('AP CSA rewards a specific kind of prior comfort. It moves quickly through object oriented programming in Java, and it assumes you can hold a precise mental model of what a piece of code does and predict its output correctly, not just recognize a correct-looking answer among four choices. That shows up everywhere in the exam format: the multiple choice section is largely trace-the-code questions, and the four required free response questions ask you to write working methods, not describe what a method should do.'),
  H.p('That format rewards students who arrive with some existing coding comfort, whether from a prior course, a summer program, or self-teaching, and it is genuinely harder to pick up from zero than most course descriptions admit. It is not that the ideas are conceptually advanced. It is that the exam gives you very little room to demonstrate partial understanding the way a written response or a multiple choice recognition question would.'),
  H.p('If you want a closer look at what that trace-and-predict skill actually looks like in practice, we have a full breakdown of <a href="/pages/ap-csa-qotd-hub">daily tracing practice</a> and a <a href="/pages/ap-csa-frq-archive">free response archive</a> with graded solutions, both built to the current course structure.'),

  H.h2(SECTIONS[2]),
  H.p('AP CSP was designed from the start to be a first computing course, not a continuation of one. The College Board built it explicitly to widen who takes computer science in high school, and the format reflects that. The multiple choice section can be answered from conceptual understanding rather than from writing correct syntax under time pressure, and the Create task, which is worth a meaningful share of the total score, is completed over an extended stretch of class time rather than in a single timed sitting.'),
  H.p('That structure means a student with zero prior coding background is not at a structural disadvantage the way they would be walking into AP CSA cold. The course still teaches real computing content, including algorithms, abstraction, data representation, and the internet, and the Create task still requires writing a program that does something nontrivial. It is simply not gated on Java fluency, and the exam format does not punish a near miss the way four all-or-nothing coding free responses do.'),
  H.p('For students weighing AP CSP specifically, our <a href="/pages/ap-computer-science-principles-resources">AP CSP resource hub</a> covers the Create task requirements and the written response format in more depth, and the <a href="/pages/ap-csp-written-response-guide">written response guide</a> walks through what graders are actually looking for.'),

  H.h2(SECTIONS[3]),
  H.p('This is the question that actually brought you here, and it deserves an honest answer rather than a confident one. There is no single verified number that says colleges weight AP CSA over AP CSP by some fixed amount, and any article that hands you a specific percentage here is making it up. What can be said honestly, based on how computer science departments generally describe their own admissions priorities and how credit policies are structured, is more useful than a fake statistic.'),
  H.p('A student applying with clear intent to major in computer science or software engineering is generally better served by having AP CSA, or an equivalent rigorous programming course, on the transcript. Selective CS departments tend to describe wanting evidence that an applicant can already program, and a course built around writing and debugging functioning code under exam conditions is a more direct version of that evidence than a course built around conceptual breadth. AP CSP is very often described by colleges as satisfying general computing or quantitative literacy interest rather than as a signal of programming readiness specifically, which is a real and valuable thing to demonstrate, just a different thing.'),
  H.box('warn', 'What this is not', '<p>This is not a claim that AP CSP is looked down on, or that it will not help an application. It is a description of what each course is generally understood to signal. A student who is not applying as a CS major gets real value from AP CSP: it demonstrates STEM engagement, computing literacy, and an ability to complete a substantial independent project, all of which matter outside a CS-specific application too.</p>'),
  H.p('The honest bottom line is that this varies by college, sometimes significantly, and the only way to know how a specific school treats either exam for admissions purposes is to look at what that school actually says, either in its admissions materials or by asking an admissions officer directly. General guidance is a reasonable starting point. It is not a substitute for checking your actual target list.'),

  H.h2(SECTIONS[4]),
  H.p('Credit and placement policy is a different question from admissions signal, and it is one where actual public data exists, so it is worth separating from the softer admissions question above.'),
  H.p(H.stat('roughly 1,748 US colleges list a credit policy for AP Computer Science A', SRC.creditCSA)),
  H.p(H.stat('roughly 1,196 US colleges list a credit policy for AP Computer Science Principles', SRC.creditCSP)),
  H.p('Read plainly, that says AP CSA credit is somewhat more widely recognized in raw count of participating institutions. It does not say CSA credit is worth more at any specific school, and it does not capture the more interesting detail underneath the aggregate: individual schools set their own required scores and their own course equivalencies, and those policies do not always follow the pattern you would expect. Some institutions list a lower required score for CSP than for CSA, or grant a comparable number of credit hours for both, which is the opposite of what a simple headline comparison implies. The aggregate count is a reasonable starting signal. It is not a substitute for checking the specific policy at a school you are actually applying to.'),
  H.sourceNote('College Board AP Credit Policy Search, searchable by institution', 'https://apstudents.collegeboard.org/getting-credit-placement/search-policies/course/8', 'August 2026'),
  H.p('If a specific school and a specific score matter to your decision, that search tool is the actual source of truth. Nothing a blog post says, including this one, should override what a school states in its own published policy.'),

  H.h2(SECTIONS[5]),
  H.p('Given all of that, here is practical guidance for three different starting points, because "which is better" is the wrong question. The right question is which one matches what you actually want.'),
  H.h3('You are certain you want to major in computer science or software engineering'),
  H.p('Lean toward AP CSA. It is the more direct evidence of programming ability, both for admissions and for your own honest assessment of whether you enjoy the daily work of writing and debugging code, which is worth knowing before you commit a college major to it. If your schedule allows both across two years, taking CSP first is a strong sequence, not a wasted one: it builds general computing vocabulary and some transferable logical thinking before you hit Java\'s stricter syntax, and it gives you a lower-stakes first exposure to programming before the higher-stakes one. If you can only fit one and you are already confident in the major, CSA is the stronger single choice.'),
  H.h3('You are curious about computing but not sure it is your major'),
  H.p('AP CSP is the lower-risk, still genuinely valuable choice. You get real exposure to how computing systems and the internet work, a substantial independent project you actually build rather than just study, and a meaningful AP course on your transcript, all without needing to arrive with prior coding comfort or risk a rough first exam in a subject you are not certain you want to commit to. If the course turns out to be the thing that clicks for you, nothing stops you from taking AP CSA the following year with a real head start.'),
  H.h3('You can fit both across two years'),
  H.p('Take CSP first, then CSA. This is not just a scheduling convenience, it is the sequence that sets you up best either way. CSP builds comfort with computing concepts, some exposure to reading and writing code, and a full independent project under your belt, all of which make the jump into Java-only, exam-format-driven CSA noticeably less jarring than walking into it cold. Students who arrive at CSA having already built something in CSP consistently adjust faster than students meeting programming for the first time in a Java classroom.'),
  H.p('Whichever path you are on, our <a href="/pages/ap-csa-score-calculator">AP CSA score calculator</a> and the daily tracing practice mentioned above are free and built to the current exam format, so use them once you have picked a course rather than while you are still deciding.'),

  H.h2('Two questions about what each exam actually tests'),
  H.p('These are not personality quizzes. They are here because the biggest mistake students make when picking between AP CSA and AP CSP is misunderstanding what the exam format itself requires, not misjudging their own interest in computing.'),
  H.mcq({
    n: 1,
    stem: 'A student has never written a line of code and is deciding between AP CSA and AP CSP. Which fact about the two exams is most directly relevant to that specific situation?',
    options: [
      'AP CSP allows the Create performance task to be completed in any programming language or tool, including block based environments, while AP CSA is taught and tested exclusively in Java.',
      'AP CSA has more total exam questions than AP CSP.',
      'AP CSP is always a semester-length course while AP CSA is always a full year.',
      'Neither exam requires writing any original code at all.',
    ],
    correct: 0,
    why: 'The relevant fact for a true beginner is the language and format flexibility of the CSP Create task versus the Java-only, exam-format free response section in CSA. Question count and course length vary by school and are not the structural reason CSA assumes more prior comfort, and both exams do require writing original code, just under very different conditions. For a student with zero coding background, the flexibility built into CSP is the fact that should drive the decision.',
  }),
  H.mcq({
    n: 2,
    stem: 'A student is certain they want to major in computer science and wants their AP transcript to show clear evidence of programming ability. Which structural fact about AP CSA is most relevant to that goal?',
    options: [
      'AP CSA directly tests programming ability through four required free response questions, each graded on whether the code written actually functions correctly.',
      'AP CSA\'s exam is entirely multiple choice and does not require writing any code.',
      'AP CSP is generally considered the more advanced, second-year equivalent programming course.',
      'AP CSA and AP CSP test identical content, just in different programming languages.',
      'AP CSA replaced its free response section with a portfolio project similar to the CSP Create task.',
    ],
    correct: 0,
    why: 'AP CSA\'s free response section is the direct evidence of programming ability: four required coding questions, graded on functional correctness rather than conceptual description. The other options are false. Multiple choice is not the whole exam, CSP is not positioned as a second-year or more advanced course, the two exams do not test identical content, and CSA has not adopted a portfolio format. For a student whose goal is a transcript that signals programming readiness specifically, the free response format is the mechanism that does that job.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Is AP CSA harder than AP CSP?', a: 'Most students and teachers experience AP CSA as harder to enter with no background, because it assumes Java fluency and tests it directly through timed coding free response questions. AP CSP is built to be accessible from zero coding experience. Neither course is conceptually shallow, but AP CSA gives you much less room to demonstrate partial understanding.' },
    { q: 'Can I take both AP CSA and AP CSP?', a: 'Yes, and many students do, usually taking AP CSP first. There is no prerequisite relationship between them in either direction, and taking CSP before CSA is a common and reasonable sequence if your schedule allows both across two years.' },
    { q: 'Does AP CSP count for college credit if I want to major in computer science?', a: 'Many colleges do offer credit for a qualifying AP CSP score, but the required score and what the credit actually satisfies vary by school. If a specific college and a specific intended major matter to your decision, check that college\'s own published AP credit policy rather than relying on a general answer.' },
    { q: 'What programming language does AP CSA use?', a: 'Java, exclusively. Both the multiple choice section and the four required free response questions are written and graded in Java, and there is no option to submit work in another language.' },
    { q: 'Do I need to know how to code before starting AP CSP?', a: 'No. AP CSP is designed as an introductory computing course and does not assume prior programming experience. The Create performance task can be built in any language or tool your class uses, including block based environments, which is part of why the course has a lower entry floor than AP CSA.' },
  ]),

  H.cta({
    heading: 'Whichever course you pick, prepare for the exam it actually is',
    body: 'Free daily tracing practice and a score calculator built to the current AP CSA exam, plus a full AP CSP resource hub for the Create task and written response section.',
    links: [
      { href: '/pages/ap-csa-score-calculator', text: 'AP CSA score calculator' },
      { href: '/pages/ap-computer-science-principles-resources', text: 'AP CSP resources', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('College credit policy figures reflect publicly listed data as of August 2026 and can change; always confirm with the specific college\'s own AP credit policy before making a decision. Last reviewed September 1, 2026.'),
]);

module.exports = { meta, body };
