'use strict';
// Reference/practical guide: does AP CSP actually convert to college credit,
// and how does that landscape compare honestly to AP CSA's. The credit
// picture for CSP is genuinely smaller and messier than CSA's: fewer colleges
// publish a policy at all, and a meaningful share of the colleges that do
// publish one treat CSP as general elective or gen-ed credit rather than
// credit toward a computer science major, because College Board itself
// designed CSP as an entry-level computing course aimed at non-majors rather
// than as a direct equivalent to a college CS1 course. This post does not
// reuse the AP CSA numbers from 2026-09-08-ap-csa-college-credit.js; the CSP
// figures below come from the CSP-specific Wiingy credit policy page and
// College Board's own AP CSP credit and placement guidance, verified via
// WebSearch on 2026-08-20 since collegeboard.org and wiingy.com could not be
// fetched directly from this environment's egress proxy.
const H = require('../../lib/blog-house');

const SRC = {
  creditCSP: { source: 'Wiingy AP Computer Science Principles credit policy database', url: 'https://wiingy.com/resources/ap-computer-science-principles-credit-policy/', asOf: 'August 2026' },
  creditCSA: { source: 'Wiingy AP Computer Science A credit policy database', url: 'https://wiingy.com/resources/ap-computer-science-a-credit-policy/', asOf: 'August 2026' },
};

const SECTIONS = [
  'AP CSP college credit vs. placement: what colleges actually decide',
  'How many colleges give AP CSP credit, and what score they require',
  'Why some computer science departments treat CSP differently than CSA',
  'How to check what your specific college actually does',
  'Practice: two questions on material AP CSP already covers',
];

const meta = {
  title: 'AP CSP College Credit: Which Colleges Actually Give It',
  handle: 'ap-csp-college-credit-what-colleges-give',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp college credit',
  publishOn: '2026-09-21',
  seoTitle: 'AP CSP College Credit: Which Colleges Give It',
  seoDescription: 'AP CSP college credit is real but smaller than people assume, and often elective credit rather than major credit. Here is the honest, sourced breakdown.',
  summary: 'AP CSP college credit exists at a real, checkable number of colleges, but it is a genuinely different landscape than AP CSA credit: fewer colleges publish a policy, and even where a policy exists it often counts as general elective or gen-ed credit rather than credit toward a computer science major. Here is what the current data actually shows, why CS departments treat CSP differently than CSA, and how to check a specific school instead of guessing.',
  tags: ['AP CSP', 'College Credit', 'AP Credit Policy', 'College Admissions', 'AP Computer Science Principles'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('AP CSP college credit is real, but it is a smaller and messier landscape than most students assume, especially if they have already heard how AP Computer Science A credit works. Fewer colleges publish a credit policy for CSP than for CSA, and where a policy does exist, it often lands as general elective or general education credit rather than credit toward an actual computer science major requirement. Here is the honest picture, with real numbers, not a guess dressed up as one.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 22, 2026', updated: 'September 22, 2026', readingMinutes: 9,
  }),
  H.toc(SECTIONS),

  H.p('If you already read about how AP CSA credit works, or you have a sibling or classmate who has, it is tempting to assume AP CSP works the same way, just with a different exam name attached. It does not. AP Computer Science Principles is a newer, broader course, deliberately built by College Board as an entry point into computing for students who may never take another CS class, not as a direct stand-in for a college computer science department\'s first programming course. That design choice is exactly why AP CSP college credit behaves differently at the college level, and why a student planning around it needs the CSP-specific picture rather than borrowing assumptions from CSA.'),
  H.p('This is not a reason to dismiss AP CSP credit. It is a reason to look at it clearly. A real number of colleges do grant credit for a qualifying CSP score, and for a lot of students, that credit is genuinely useful, whether as a general education requirement cleared early or as free elective hours toward graduation. The mistake is assuming it works like AP CSA credit, where a passing score more often maps onto an actual introductory major course. CSP credit is more likely to land somewhere else on your transcript, and that difference matters when you are building a schedule around it.'),

  H.h2(SECTIONS[0]),
  H.p('Start with the same two categories that matter for any AP exam, because CSP muddies them in its own particular way.'),
  H.p('<strong>Credit</strong> means the college records your AP score as satisfying a specific requirement and adds it to your total credit hours, the same as if you had taken and passed an actual course on campus. <strong>Placement</strong> means no credit hours are added, but you may be allowed to skip a lower-level course and move directly into something further along, based on the AP score demonstrating you already know the material.'),
  H.p('AP CSP adds a third wrinkle that AP CSA mostly does not: even when a college awards credit, that credit is frequently filed as general elective credit or as satisfying a general education requirement, such as a quantitative reasoning or technology literacy requirement, rather than as credit toward a specific course inside the computer science department. That is a meaningfully different outcome than what AP CSA students are used to, where credit more often maps onto an actual CS1-equivalent course a student would otherwise have to take.'),
  H.box('key', 'The distinction that actually matters for CSP', '<p>A college can list AP Computer Science Principles as accepted for credit and still not apply that credit toward anything inside a computer science major. It might satisfy a general education box, or count as free elective hours, while the CS department itself requires every declared major to start with its own intro sequence regardless of AP score. Both outcomes get described loosely as the college accepting AP CSP, but only one of them changes what a CS major actually has to take.</p>'),
  H.p('None of this means CSP credit is worthless. For a student who is not majoring in computer science, elective or gen-ed credit is exactly as useful as any other credit toward graduation. It only becomes a problem when a student assumes AP CSP will exempt them from their intended major\'s first programming course, the way AP CSA more often does, and builds a first-semester schedule on that assumption without checking.'),

  H.h2(SECTIONS[1]),
  H.p('There is a real, checkable number behind this, and it is smaller than AP CSA\'s.'),
  H.p(H.stat('about 1,196 US colleges list a published credit policy for AP Computer Science Principles', SRC.creditCSP)),
  H.p('That is meaningfully fewer than the number of colleges with a published policy for AP CSA.'),
  H.p(H.stat('roughly 1,196 colleges publish a credit policy for AP CSP, compared with roughly 1,748 colleges for AP CSA', SRC.creditCSA)),
  H.p('The score thresholds follow a similar shape to CSA, with most of the weight sitting at the College Board\'s baseline qualifying score, but a real portion of colleges holding the line higher.'),
  H.p(H.stat('roughly 903 of those colleges accept a score of 3, 277 require a 4, and 14 require a 5', SRC.creditCSP)),
  H.p('Read plainly: a 3 is enough to clear the bar at most colleges that grant AP CSP credit at all, which lines up with the College Board\'s own description of 3 as a qualifying score. But close to three hundred colleges specifically require a 4, and a smaller group holds out for a 5, so assuming any passing score automatically converts to credit is exactly the mistake this post is trying to head off.'),
  H.sourceNote('College Board AP Credit Policy Search, searchable by institution, AP Computer Science Principles', 'https://apstudents.collegeboard.org/getting-credit-placement/search-policies/course/42', 'August 2026'),

  H.h2(SECTIONS[2]),
  H.p('It is worth understanding why AP CSP\'s credit landscape looks different from AP CSA\'s, because it comes from how the two exams were designed, not from CSP being a lesser exam.'),
  H.p('College Board built AP Computer Science Principles as a broad introduction to computing ideas, algorithms, data, the internet, and the impact of computing, meant to work as an entry point for students who have never coded and who may never take another CS course. The Create performance task can be built in any language or tool a class uses, including block-based environments, and the exam intentionally samples a wide range of computing concepts rather than testing deep fluency in one programming language the way AP CSA\'s Java-only free response section does.'),
  H.sourceNote('College Board AP Central, AP Computer Science Principles course FAQ on higher education credit and placement', 'https://apcentral.collegeboard.org/courses/ap-computer-science-principles/course/faq/college-credit-for-ap-csp', 'August 2026'),
  H.p('That is a real strength for what CSP is trying to do, and it is also exactly why a lot of computer science departments do not treat it as equivalent to their own first programming course. A CS major\'s intro sequence is usually built around depth in one language and the specific habits that come from writing, debugging, and testing real code under a compiler\'s unforgiving rules. CSP\'s broader, tool-flexible design does not guarantee that same depth, so departments that care about it often accept the AP score for something, general elective credit or a gen-ed requirement, without accepting it as a substitute for their own CS1 course.'),
  H.box('warn', 'What this is not', '<p>This is not a judgment that AP CSP is an easier or less legitimate exam than AP CSA, and it is not a reason to skip it if computing is genuinely interesting to you. It means CSP was built to answer a different question than CSA answers. CSA asks whether you can write correct Java under exam conditions. CSP asks whether you understand how computing works broadly enough to reason about it, build something with it, and think critically about its effects. Colleges read those two signals differently, and their credit policies reflect that difference rather than a ranking of which exam matters more.</p>'),
  H.p('If your goal is a computer science major specifically, AP CSA is the exam more likely to convert into direct credit or placement inside the major. AP CSP is still valuable, both as a genuine intro to the field and as elective or gen-ed credit at many schools, but it is not the exam to count on for skipping your intended major\'s first course.'),

  H.h2(SECTIONS[3]),
  H.p('General numbers describe a landscape, not your specific school, and this is the step that actually settles the question for you.'),
  H.p('The College Board runs its own <a href="https://apstudents.collegeboard.org/getting-credit-placement/search-policies/course/42" rel="nofollow">AP Credit Policy Search tool</a>, searchable by institution and by exam. Search AP Computer Science Principles specifically, not AP Computer Science broadly, since the two exams are listed and scored separately and a school can have entirely different policies for each. The tool will show the score required and whether the result is recorded as credit, placement, both, or neither.'),
  H.ul([
    'Search the specific college by name, not a general category of school. Two colleges with similarly regarded CS programs can list very different AP CSP outcomes.',
    'Read past whether AP CSP appears on the list at all, and check what the credit actually satisfies: a specific course, a general education requirement, or unrestricted elective hours.',
    'If you intend to major in computer science, ask the department directly whether AP CSP credit, if any, applies toward the major or only toward general degree requirements. The registrar\'s office and the CS department do not always answer that question the same way.',
    'Check again close to enrollment. Credit policy is set by the college and does get revised, and a policy you read as a sophomore is not guaranteed to be current by the time you enroll.',
  ]),
  H.p('If you are also weighing what AP CSA credit looks like at the same schools, since a lot of students are deciding between or planning both exams, our companion breakdown of <a href="/blogs/ap-csa/ap-csa-college-credit-what-score">how AP CSA credit and score thresholds actually work</a> covers that side of the comparison in the same amount of detail. And if the Create performance task itself, rather than the credit question, is what you are working on right now, <a href="/blogs/ap-csp/ap-csp-create-performance-task-what-changed">our guide to the current Create task format</a> is worth reading before you build your project.'),

  H.h2(SECTIONS[4]),
  H.p('None of the credit landscape changes what the exam itself actually tests, which is still the thing that determines your score. Here are two practice questions on algorithm efficiency, a Big Idea 4 topic that shows up regularly on the multiple choice section and depends on reasoning about how a procedure scales, not memorizing a formula.'),
  H.mcq({
    n: 1,
    stem: 'A program searches an unsorted list of n numbers for a target value by checking each number one at a time, starting from the beginning, until it finds the target or reaches the end of the list. Which best describes how the number of steps this search could take grows as the size of the list, n, increases?',
    codeText: 'PROCEDURE search(numberList, target)\n{\n  FOR EACH num IN numberList\n  {\n    IF (num = target)\n    {\n      RETURN (true)\n    }\n  }\n  RETURN (false)\n}',
    options: [
      'The number of steps stays the same no matter how large the list gets.',
      'The number of steps can grow in direct proportion to the size of the list.',
      'The number of steps always grows faster than the size of the list.',
      'The number of steps decreases as the list gets larger.',
    ],
    correct: 1,
    why: 'This is a linear, or unsorted sequential, search. In the worst case, the target is the last item checked or is not in the list at all, so the procedure examines every one of the n items once. As n grows, the worst-case number of steps grows in direct proportion to it, which is the definition of linear growth. Option A describes a constant-time algorithm, which this is not, since larger lists genuinely require more steps in the worst case. Option C describes growth faster than linear, such as checking every pair of items, which this single pass through the list does not do.',
  }),
  H.mcq({
    n: 2,
    stem: 'A different procedure checks every possible pair of items in a list of n numbers to find the pair with the largest sum, using a loop inside another loop over the same list. Compared to the single-pass search in the previous question, how does this procedure\'s growth in steps compare as n increases?',
    codeText: 'PROCEDURE bestPair(numberList)\n{\n  FOR EACH first IN numberList\n  {\n    FOR EACH second IN numberList\n    {\n      // compare first + second to the best sum found so far\n    }\n  }\n}',
    options: [
      'It grows at the same linear rate as the single-pass search.',
      'It grows more slowly than the single-pass search as n increases.',
      'It grows faster than linearly, since every item is compared against every other item.',
      'It does not depend on n at all.',
    ],
    correct: 2,
    why: 'Nesting one loop over the list inside another loop over the same list means the inner loop runs a full pass for every single item the outer loop visits. For a list of size n, that is roughly n comparisons repeated n times, so the total work grows faster than linearly as n increases, specifically proportional to n multiplied by n. This is the core idea behind why AP CSP asks students to reason about nested loops and scaling separately from single loops: a small list can hide how much slower a nested-loop algorithm becomes once n gets large, and reasoning about the structure of the code tells you that before you ever have to run it.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Does AP CSP actually give you college credit?', a: 'At many colleges, yes, though the total number of colleges with a published AP CSP credit policy is smaller than the number that publish one for AP CSA. Where credit is granted, it is also frequently recorded as general elective or general education credit rather than credit toward a specific computer science course, so it is worth confirming what the credit actually satisfies before counting on it.' },
    { q: 'What score do I need on AP CSP to get college credit?', a: 'It varies by school. Among colleges that publish a policy, a score of 3 clears the bar at most of them, but a real number of colleges specifically require a 4, and a smaller group requires a 5. Check the specific college with the College Board\'s AP Credit Policy Search tool rather than assuming any passing score works everywhere.' },
    { q: 'Will AP CSP credit count toward a computer science major?', a: 'Sometimes, but not as reliably as AP CSA credit does. AP CSP was designed by College Board as a broad entry point to computing for students who may not major in the field, so many computer science departments accept it for elective or general education credit while still requiring declared majors to take the department\'s own introductory sequence regardless of AP score.' },
    { q: 'Is AP CSP or AP CSA better for college credit?', a: 'For a student specifically planning a computer science major, AP CSA credit and placement more often map onto an actual required course in the major, since it more directly overlaps with a typical CS1 course taught in Java or a similar language. AP CSP still has real value, both as an introduction to the field and as elective or gen-ed credit at many schools, but it is the less direct path to major credit specifically.' },
    { q: 'Where can I check a specific college\'s AP CSP credit policy?', a: 'The College Board\'s own AP Credit Policy Search tool lets you search by institution and by exam, and it lists AP Computer Science Principles separately from AP Computer Science A. Search the specific exam and the specific school rather than relying on a general answer, since policies vary by institution and can change from year to year.' },
  ]),

  H.cta({
    heading: 'Know what your score actually gets you before you count on it',
    body: 'A full AP CSP resource hub covering the Create task and written response section, so the score you are working toward is one you actually understand before you build a college schedule around it.',
    links: [
      { href: '/pages/ap-computer-science-principles-resources', text: 'AP CSP resources' },
      { href: '/pages/ap-csp-written-response-guide', text: 'Written response guide', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('College credit policy figures reflect publicly listed data as of August 2026 and change over time; always confirm current policy with the specific college before making a scheduling decision. Last reviewed September 22, 2026.'),
]);

module.exports = { meta, body };
