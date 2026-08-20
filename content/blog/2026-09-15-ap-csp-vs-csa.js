'use strict';
// Sequencing/readiness post: AP CSP vs AP CSA, from the angle of which course
// a student should take FIRST if doing both, or which to pick if only fitting
// one in. This is deliberately NOT the college-recognition angle already
// covered in 2026-09-01-ap-csa-vs-ap-csp.js (that post lives in the ap-csa
// blog and asks which exam colleges read more). This post lives in the ap-csp
// blog and answers the question a teacher actually gets asked in an advising
// meeting: what does each course assume you already know, does CSP make a
// gentler on-ramp into CSA, and what should a student do if they can only
// take one before applications go out.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'What each course actually assumes when you walk in',
  'The case for CSP first: a lower-stakes on-ramp into Java',
  'The case for CSA first, or CSA only',
  'If you can only fit one before college applications',
  'AP CSP vs AP CSA: comparing the two courses side by side',
];

const meta = {
  title: 'AP CSP vs AP CSA: Which One First? A Teacher Answers',
  handle: 'ap-csp-or-ap-csa-first',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp vs ap csa',
  publishOn: '2026-09-14',
  seoTitle: 'AP CSP vs AP CSA: Which One First?',
  seoDescription: 'AP CSP vs AP CSA sequencing, explained by a teacher: what each course assumes coming in, which to take first, and what to do if you can fit only one.',
  summary: 'Most AP CSP vs AP CSA advice answers which course colleges value more. This one answers the question a teacher actually gets asked in advising meetings: which course should a student take first if doing both, and which to pick if only one fits before applications. Covers prerequisites, the difficulty jump into Java, and concrete guidance by student profile.',
  tags: ['AP CSP', 'AP CSA', 'Course Sequencing', 'Course Selection', 'Course Planning'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('Every fall a handful of students and parents ask some version of the same question in advising: AP CSP vs AP CSA, which one first? Not which one looks better on an application. Which one should actually come first on the schedule, and is it a mistake to skip straight to the harder one. Here is the answer I actually give, not the hedge.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 15, 2026', updated: 'September 15, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('If you want the college-recognition side of AP CSP vs AP CSA, meaning which exam admissions officers and credit policies tend to weigh more heavily, we cover that separately in <a href="/blogs/ap-csa/ap-csa-vs-ap-csp-college-recognition">our guide to which one colleges actually read</a>, and there is no need to repeat that argument here. This post is about a different, more practical question, and it is the one that actually comes up first in an advising conversation: given that a student is choosing between these two courses, or hoping to fit both in before graduation, which one belongs first on the schedule, and does the order matter as much as families assume it does.'),
  H.p('It does matter, but probably not in the direction most people guess. The instinct is to treat AP CSA as the advanced course and AP CSP as the easier warm-up, then assume the harder course should come later once a student has more general high school experience. That framing is not wrong, but it undersells how specific the CSA jump actually is. It is not a general difficulty step up. It is a step from no required coding background straight into Java syntax, graded under exam conditions with no partial credit for a right idea that will not compile. That specific jump is what this post is actually about.'),

  H.h2(SECTIONS[0]),
  H.p('Start with what each course requires you to already know on day one, because this is the part that actually drives the sequencing decision, more than general difficulty does.'),
  H.p('AP CSP assumes nothing. It was built as an entry point to computer science, and the course description does not list prior programming experience as a prerequisite. A student can walk in having never written a line of code and be on equal footing with everyone else in the room. The Create performance task, the project component that carries real weight in the final score, can be built in any language or tool the class uses, including block based environments, so the exam itself does not gate a student behind Java fluency the way AP CSA does.'),
  H.p('AP CSA is also technically an entry point course. College Board does not list a formal prerequisite for it either, and plenty of schools offer it as a student\'s first computer science class. But that formal openness and the practical experience of sitting in the room are two different things. The course moves quickly into object oriented programming in Java, the multiple choice section leans heavily on tracing code and predicting exact output, and the four required free response questions ask a student to write working methods, graded on whether the code actually runs correctly. A student with zero prior coding comfort can pass AP CSA. It is a considerably steeper first few weeks than a student with even one prior semester of programming experience will feel, because the exam format gives very little room to demonstrate a right idea expressed in almost-correct syntax.'),
  H.box('key', 'The distinction that actually matters', '<p>Both courses are technically open to beginners. Only one of them is actually built around not needing prior comfort with code. AP CSP is designed so that having no background is not a disadvantage. AP CSA is designed so that having no background is survivable but noticeably harder than having some, because the exam format rewards precision under time pressure more than it rewards a partial understanding.</p>'),

  H.h2(SECTIONS[1]),
  H.p('Here is the case for taking AP CSP before AP CSA, and it is the sequence I recommend most often when a student\'s schedule genuinely allows both across two years.'),
  H.p('CSP gives a student a full year of exposure to how computing problems get broken down, what an algorithm actually is, how data gets represented, and what it feels like to design and build something over an extended stretch of class time, all without the added pressure of doing it in a strict, syntax-sensitive language for the first time. That matters more than it sounds like it does. A student\'s first experience with programming logic, in a lower-stakes environment where the exam itself does not require flawless Java, tends to build real confidence that carries directly into a Java-only course the following year.'),
  H.p('I see this pattern every fall with students who took CSP first. They arrive in CSA already comfortable with ideas like loops, conditionals, procedures, and lists, even if they learned those ideas in a different language or a block based tool. What they are learning new in CSA is mostly Java\'s specific syntax rules and its stricter type system, not the underlying logic of programming itself. Students meeting both the logic and Java\'s syntax for the first time at the same time have to learn twice as much at once, and that is where I see the most frustration and the most early struggling grades.'),
  H.ul([
    'CSP teaches the general shape of computational thinking, which transfers to any language, including Java, the following year.',
    'The Create task gives a student a real, completed project under their belt before they ever face a timed Java free response question.',
    'A student who is not yet sure computer science is for them gets a genuine, informative first year without the risk of a rough first exam in a language they have never touched.',
    'If CSP turns out to be the class where a student realizes they love this, they walk into CSA the next year with real momentum instead of a cold start.',
  ]),
  H.p('None of this means CSP is a requirement for CSA, or that College Board treats it as one. It is not a formal prerequisite in either direction. It is a sequencing choice about what makes the harder course go more smoothly, not a rule anyone is enforcing.'),

  H.h2(SECTIONS[2]),
  H.p('Now the other side, because CSA-first, or CSA-only, is the right call for a real subset of students, and I do not want to talk anyone out of it who actually fits this profile.'),
  H.p('If a student already codes, whether from a prior course, a summer program, a robotics team, or genuine self-teaching, taking AP CSP first can feel like a step backward rather than a warm-up. A student who already understands loops, conditionals, and basic object oriented ideas is not getting the same on-ramp benefit from CSP that a true beginner gets, and for that student, going straight into AP CSA is usually the better use of a school year. The course will still be demanding, but it will be demanding in the specific way that matches where that student already is, rather than reviewing ground they have already covered.'),
  H.p('There is also a legitimate goals-based argument for CSA-first or CSA-only that has nothing to do with prior coding background. A student who is confident they want to major in computer science or a closely related engineering field, and who wants their transcript and their own honest self-assessment to reflect real programming ability as early as possible, gets more direct evidence of that from AP CSA\'s free response section than from CSP\'s broader format. That is the college-recognition argument in miniature, and if that is the piece you actually care about, <a href="/blogs/ap-csa/ap-csa-vs-ap-csp-college-recognition">the deeper comparison</a> is where to go for the full case, since this post is intentionally not re-litigating it here.'),
  H.box('tip', 'A quick self-check', '<p>If you can already write a working loop and explain what a conditional does without looking it up, you are probably past the point where CSP functions as an on-ramp for you. That does not make CSP a bad course. It means the sequencing benefit this post describes mostly applies to a true beginner, and you are not one.</p>'),
  H.p('Scheduling constraints push some students toward CSA-only as well, independent of readiness. A student with a packed schedule who can fit exactly one computer science course before graduation, and who already has some coding background, often gets more long-term value from spending that one slot on CSA than on CSP, particularly if a CS-related major is the plan.'),

  H.h2(SECTIONS[3]),
  H.p('This is the question I get most often in an actual advising meeting, and it deserves a direct answer rather than a list of considerations to weigh forever: a student has room for exactly one AP computer science course before college applications go out. Which one.'),
  H.p('For a true beginner with no coding background and genuine uncertainty about whether computer science is even the right direction, I recommend AP CSP. It gives a real, substantial AP course, a completed independent project, and honest exposure to whether this field is interesting to that student, all without the risk of a first and only computer science grade being dragged down by an unfamiliar language under exam pressure. A single CSP course still demonstrates STEM engagement and computing literacy on an application, which has real value even outside a computer science major.'),
  H.p('For a student who already has some coding comfort, or who is confident they are applying with computer science or software engineering as an intended major, I recommend AP CSA, even as an only course. It is the more direct evidence of programming ability, and for a student who already has the background to make CSA\'s pace workable, it is the stronger single signal to have on a transcript when that specific major is the goal.'),
  H.p('For everyone in between, meaning a student who is not sure about the major but is not a total beginner either, I lean toward CSP as the safer single choice, because a genuinely rough experience in a student\'s only computer science course, in a subject they were not sure about to begin with, tends to do more damage to their interest in the field than a slightly less direct signal on an application does to their admissions chances. A confident, well-earned grade in CSP beats a shaky one in CSA when only one slot is available and the student\'s commitment to the major is not yet certain.'),
  H.p('For deeper prep once a course is chosen, our <a href="/pages/ap-computer-science-principles-resources">AP CSP resource hub</a> covers the Create task and written response format, and if the eventual plan includes CSA as well, the <a href="/pages/ap-csa-score-calculator">AP CSA score calculator</a> and <a href="/pages/ap-csa-qotd-hub">daily tracing practice</a> are both free and built to the current course structure.'),

  H.h2(SECTIONS[4]),
  H.p('A quick side by side, since the two courses get compared constantly but rarely laid out this directly.'),
  H.table(
    ['', 'AP CSP', 'AP CSA'],
    [
      ['Prior coding required', 'None assumed. Built as an entry point course.', 'None formally required, but the exam format rewards prior comfort heavily.'],
      ['Language', 'Any language or tool the class uses, including block based environments.', 'Java only, on both the multiple choice and free response sections.'],
      ['Format', 'Multiple choice exam plus the Create performance task, a project built over an extended stretch of class time.', 'Multiple choice exam plus four required free response questions, each graded on whether the written code actually runs correctly.'],
      ['Typical grade level offered', 'Often 9th or 10th grade, frequently a student\'s first computer science course.', 'Often 10th through 12th grade, sometimes a student\'s first course but commonly taken after some prior programming exposure.'],
    ]
  ),
  H.p('None of these rows is a formal College Board rule about who may enroll. Grade level and prerequisites are set locally by individual schools, and plenty of schools run both courses open to any grade. The table describes common practice, not a requirement.'),

  H.h2('Practice: a tracing question from each course'),
  H.p('One short trace from each exam format, to make the syntax difference concrete rather than abstract.'),
  H.mcq({
    n: 1,
    stem: 'This is written in AP CSP pseudocode, the format used on the multiple choice section, not Java. Trace the procedure for <code>totalPoints([2, 5, 1, 4])</code>. What value does it return?',
    codeText: 'PROCEDURE totalPoints(scores)\n{\n  total <- 0\n  FOR EACH score IN scores\n  {\n    IF (score > 1)\n    {\n      total <- total + score\n    }\n  }\n  RETURN (total)\n}',
    options: [
      '12, the sum of every value in the list',
      '11, the sum of every value greater than 1',
      '4, the largest value in the list',
      '3, the count of values greater than 1',
    ],
    correct: 1,
    why: 'The loop only adds a score to total when that score is greater than 1. Checking each value: 2 is greater than 1 and gets added, 5 is greater than 1 and gets added, 1 is not greater than 1 and is skipped, 4 is greater than 1 and gets added. That gives 2 plus 5 plus 4, which is 11. Option A includes the value 1, which the condition excludes. Option C confuses the sum with the maximum value. Option D confuses the sum of the qualifying values with a count of how many there are.',
  }),
  H.mcq({
    n: 2,
    stem: 'This is written in Java, the language used for the entire AP CSA exam. Trace the method call <code>totalPoints(new int[]{2, 5, 1, 4})</code>. What does it return?',
    codeText: 'public static int totalPoints(int[] scores)\n{\n  int total = 0;\n  for (int score : scores)\n  {\n    if (score > 1)\n    {\n      total += score;\n    }\n  }\n  return total;\n}',
    options: [
      '11, the sum of every value greater than 1',
      '12, the sum of every value in the array',
      'A compile error, because Java arrays cannot be looped this way',
      '4, the largest value in the array',
    ],
    correct: 0,
    why: 'This Java method does exactly what the pseudocode version does, checking each element and adding it to total only when it is greater than 1, which returns 11 for the same reason: 2, 5, and 4 qualify, while 1 does not. The enhanced for loop shown here is valid Java syntax for iterating over an array, so option C is false. The point of pairing this with the pseudocode version is that the logic is identical between the two courses. What changes moving from CSP to CSA is the syntax you have to get exactly right, not the underlying reasoning.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Does College Board require AP CSP before AP CSA, or the other way around?', a: 'No. Neither course lists the other as a formal prerequisite, and College Board does not require any specific sequence. Any ordering rule you hear about is a school\'s own local policy or a teacher\'s recommendation, not a College Board requirement.' },
    { q: 'Is it a mistake to take AP CSA first with no prior coding experience?', a: 'Not a mistake exactly, but it is the harder path. AP CSA is technically open to beginners and plenty of students succeed in it as a first course, but the exam format, Java-only free response questions graded on functional correctness, gives less room to show partial understanding than a beginner-friendly course does. It is a workable choice, just a steeper one.' },
    { q: 'If I take AP CSP first, will it feel repetitive when I get to AP CSA the following year?', a: 'Some content overlaps in the sense that both courses teach algorithms, abstraction, and general programming logic, but AP CSA moves into object oriented Java programming that CSP does not cover in the same depth. Most students experience CSA as a real step up in specificity and rigor, not a repeat, even after CSP.' },
    { q: 'Can I skip AP CSP entirely and still do well in AP CSA?', a: 'Yes, especially if you already have coding experience from another source, a prior non-AP class, self-teaching, or a program outside school. CSP is a strong on-ramp for a true beginner, but it is not a requirement, and a student who already has programming comfort does not need it as a prerequisite step.' },
  ]),

  H.cta({
    heading: 'Pick your course, then prepare for the exam it actually is',
    body: 'A full AP CSP resource hub for the Create task and written response section, plus free tracing practice and a score calculator built to the current AP CSA exam.',
    links: [
      { href: '/pages/ap-computer-science-principles-resources', text: 'AP CSP resources' },
      { href: '/pages/ap-csa-score-calculator', text: 'AP CSA score calculator', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reflects the current AP CSP and AP CSA course descriptions and each course\'s own prerequisite guidance. Last reviewed September 2026.'),
]);

module.exports = { meta, body };
