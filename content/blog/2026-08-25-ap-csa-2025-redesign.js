'use strict';
// Weekly course post: AP CSA. Retrospective on the 2025-26 redesign now that a
// second cohort is moving through it: what got cut, what got heavier, and what
// a teacher pacing from the old curriculum needs to unlearn. Deliberately does
// NOT restate the score-distribution post's exam-weighting table or score
// numbers; this post goes deeper on the redesign mechanics instead.
const H = require('../../lib/blog-house');

const SRC = {
  revisions: {
    source: 'College Board AP Computer Science A course revisions overview',
    url: 'https://apcentral.collegeboard.org/courses/ap-computer-science-a/future-revisions',
    asOf: 'August 2026',
  },
  ced: {
    source: 'College Board AP Computer Science A course and exam description, 2025-26',
    url: null,
    asOf: 'August 2026',
  },
};

const SECTIONS = [
  'Two years into the AP CSA exam format redesign, here is what actually happened',
  'What was cut: the standalone inheritance and polymorphism unit',
  'What got heavier: Data Collections is now the biggest chunk of the exam',
  'Why stacking the hardest content into one unit is a bigger deal than it sounds',
  'For teachers: what to unlearn if you taught the old curriculum',
  'A pacing checklist for the year ahead',
];

const meta = {
  title: 'The 2025 AP CSA Exam Format Redesign: What Was Removed and What Got Heavier',
  handle: 'ap-csa-2025-redesign-what-changed',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'ap csa exam format',
  publishOn: '2026-08-24',
  seoTitle: 'AP CSA Exam Format 2026: What the Redesign Changed',
  seoDescription: 'Two years into the AP CSA exam format redesign: what was actually removed, what got heavier, and what old-curriculum teachers need to unlearn.',
  summary: 'A second cohort has now moved through the redesigned four unit AP CSA course. This is a retrospective on what the redesign actually did: the standalone inheritance and polymorphism unit is gone, Data Collections absorbed the weight it left behind, and teachers pacing from old habits are quietly under-teaching the biggest part of the exam.',
  tags: ['AP CSA', 'Curriculum', 'Exam Format', 'Teacher Resources', 'Redesign'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('The redesigned course is now two exam cycles old, which is enough distance to stop describing the change and start evaluating it. Here is what actually left the AP CSA exam format, what quietly got bigger, and what that means if you are still pacing from the old curriculum.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'August 25, 2026', updated: 'August 25, 2026', readingMinutes: 9,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('When the redesign was announced, most of the coverage was announcement coverage: a list of what was changing, published before anyone had taught a single semester under the new structure. That is a fine way to learn what moved. It is not a good way to learn what the move actually did to a classroom, because the effects of a curriculum redesign do not show up in the announcement. They show up in May, in the free response section, in the specific places students run out of time or run out of confidence.'),
  H.p('We have now taught the redesigned AP CSA exam format through two full school years and watched two cohorts sit the exam under it. That is enough distance to say something more useful than "here is what changed." This is about what the change did: one topic was demoted out of the spotlight, one topic absorbed the weight that left with it, and the two effects are more connected than the course description makes them sound.'),
  H.p('If you already know the headline structure, the four units and how the exam splits between multiple choice and free response, we covered that ground in our piece on the 2026 score distribution. This post assumes you have that context and goes somewhere the announcement coverage did not: what specifically disappeared, what got heavier because of it, and what a teacher who built their pacing calendar around the old course needs to actively unlearn.'),

  H.h2(SECTIONS[1]),
  H.p('Start with the cut, because it is the change most likely to be described wrong. The old course gave inheritance and polymorphism their own dedicated unit, taught as a self-contained block with its own vocabulary, its own set of vocabulary quizzes, and its own chunk of the pacing calendar. That unit does not exist anymore. There is no standalone inheritance and polymorphism unit in the current four unit structure, and nothing in the current course and exam description reintroduces one under a different name.'),
  H.p('What replaced it is not "nothing." College Board\'s own revision materials describe inheritance and polymorphism as moved into optional, later material rather than deleted from the course outright: content that a teacher can still choose to teach, but that is no longer built into the required course structure the way it used to be. That is a meaningfully different claim than "inheritance is gone," and it is worth being precise about which one is true.'),
  H.sourceNote(SRC.revisions.source, SRC.revisions.url, SRC.revisions.asOf),
  H.p('Here is where honesty matters more than a clean headline. Whether inheritance-adjacent skills still surface as testable content, folded into a Class Creation free response question or tucked into a Data Collections prompt that happens to hand a student an already-built subclass, is harder to settle from the outside. The official framing is that the topics are optional for instruction, not that every trace of the concept was scrubbed from every released item. Until enough exam cycles have produced enough public rubrics to check systematically, the honest position is that inheritance is very unlikely to anchor a full free response question on its own anymore, not that it is guaranteed to never appear in any form.'),
  H.box('warn', 'What this is not', '<p>This is not a claim that inheritance and polymorphism vanished from computer science education, or even from this course. Plenty of teachers still cover them, because they matter for anyone continuing into a second programming course. What changed is the exam contract: they are no longer content every student is guaranteed to be tested on, which changes how much class time they can defensibly claim.</p>'),

  H.h2(SECTIONS[2]),
  H.p('Removing a required unit does not shrink a course. The exam still has to fill its multiple choice questions and its four free response slots from somewhere, and that somewhere was largely the unit on arrays, ArrayList, and 2D arrays: the material now grouped under Data Collections. Of the four units in the current AP CSA exam format, Data Collections is the largest by weighting on the exam, and it was not the largest under the structure it replaced.'),
  H.sourceNote(SRC.ced.source, SRC.ced.url, SRC.ced.asOf),
  H.p('We are deliberately not reprinting the exact weighting ranges here, because our score distribution piece already lays out the full unit-by-unit table with the current numbers. What matters for this post is the shape of the change, not the specific percentages: the unit that used to sit alongside several others, sharing the exam roughly evenly, is now the single biggest thing a student has to be ready for.'),

  H.h2(SECTIONS[3]),
  H.p('It would be easy to read "Data Collections got bigger" as a bookkeeping detail, one unit gaining a few points of weight at another unit\'s expense. That undersells what actually happened, because Data Collections is not a random unit to hand extra weight to. It is the unit that already produced most of the failure points in the old curriculum, and the redesign concentrated those failure points into the single largest chunk of the exam instead of spreading them across several units.'),
  H.p('Three specific things live inside Data Collections that do not live comfortably anywhere else in the course, and all three are exactly the kind of mistake that is easy to make under time pressure and easy to miss when self-checking.'),
  H.h3('Nested iteration'),
  H.p('A 2D array problem is rarely one loop. It is a loop inside a loop, with row and column indices that look interchangeable and are not. A student who is fluent with a single for loop over an array can still stumble the first time they have to track two index variables at once, especially when a problem deliberately starts an inner loop partway through instead of at zero.'),
  H.h3('Reference semantics'),
  H.p('An ArrayList of objects means a variable that holds a reference, not a copy. Removing an element, aliasing a reference, or mutating an object through one variable and reading it through another produces behavior that a student reasoning from a value-semantics mental model gets wrong every time, quietly and confidently.'),
  H.h3('Off-by-one errors'),
  H.p('Every loop boundary in this unit is a place to be off by one: starting at 1 instead of 0, using less-than-or-equal instead of less-than, or forgetting that removing from a list while iterating shifts every later index down by one. None of these mistakes are new to Data Collections specifically, but this is the unit where they compound, because a single off-by-one error early in a nested loop or a collection traversal usually corrupts everything computed after it.'),
  H.box('key', 'Why this matters more than the raw weighting suggests', '<p>A unit carrying the largest share of the exam score would matter under any circumstances. A unit that is also the single hardest place in the course to reason correctly, carrying the largest share of the exam score, matters more than the two facts added together. The redesign did not just make Data Collections bigger. It made the most failure-prone material in the course the material students are now most exposed to.</p>'),

  H.h2(SECTIONS[4]),
  H.p('If you taught the old ten-unit curriculum, your instincts about pacing were built under a different set of incentives, and some of them are now actively working against you. None of this is about teaching worse. It is about a set of habits that were correct under the old structure and are quietly miscalibrated under the current one.'),
  H.ul([
    '<strong>Inheritance used to earn its own dedicated weeks.</strong> Under the old structure, a standalone unit meant a protected block of the calendar that nothing else could encroach on. That protection is gone. If your pacing guide still allocates several weeks to inheritance and polymorphism as a self-contained unit, that time is either coming out of Data Collections or coming out of review, and neither trade is the one you want to be making by accident.',
    '<strong>Arrays, ArrayList, and 2D arrays used to be spread out, so their difficulty was spread out too.</strong> When collections content lived across more of the old curriculum, no single stretch of the year had to absorb all of its hardest ideas at once. Now that it is one unit, a pacing calendar built on the assumption that "collections is just one topic among several" will not leave enough room for nested iteration, reference semantics, and off-by-one debugging to each get taught, practiced, and revisited before the exam.',
    '<strong>The old curriculum let inheritance mistakes stay isolated.</strong> A student who never fully understood polymorphism could still do fine on units that did not depend on it. Data Collections does not offer that isolation. Nested loops build on simple loops, ArrayList manipulation builds on array manipulation, and a gap from earlier in the unit resurfaces in every later problem, so falling behind inside this unit costs more than falling behind used to cost inside inheritance.',
    '<strong>Old released free response questions are a weaker guide than they used to be.</strong> Free response items written for the previous structure may lean on content, including inheritance-heavy scenarios, that no longer matches what a current student needs to practice. Use recent, redesign-era items as the primary bank and treat older ones as supplementary at best.',
  ]),
  H.p('The practical fix is not dramatic. It is closer to a calendar audit: look at how many class days your plan currently gives to Data Collections, compare it to how many days it used to get when the content was split across more units, and check whether the new total actually reflects the unit\'s new size and difficulty, or whether it just quietly inherited the old day count out of habit.'),
  H.p('Our <a href="/pages/ap-csa-qotd-hub">daily practice question hub</a> is one lightweight way to keep collections tracing in front of students all year rather than cramming it into a single unit block, and the <a href="/pages/ap-csa-frq-archive">free response archive</a> is worth filtering specifically for recent, redesign-era Data Collections items when you are building a pacing calendar rather than pulling from the full historical set.'),

  H.h2(SECTIONS[5]),
  H.p('If you are heading into this school year and want a concrete gut check rather than a general warning, run through these four questions against your own plan.'),
  H.ol([
    '<strong>Does your calendar give Data Collections the largest single block of instructional time in the course?</strong> If another unit still gets more days on your plan than Data Collections does, that is worth questioning directly rather than assuming it evens out.',
    '<strong>Are nested loops taught as their own explicit skill, not just as "loops inside 2D arrays"?</strong> Students need deliberate practice tracing two index variables at once before they meet it embedded in a harder problem.',
    '<strong>Do students practice removing from and modifying an ArrayList while iterating over it, on purpose, before the exam?</strong> This is one of the highest-yield traps in the unit and it is easy to never explicitly assign.',
    '<strong>Have you audited your released free response bank for redesign-era items specifically?</strong> A stack of older questions that happens to include inheritance scenarios is not neutral practice anymore. It is practice time spent on content the exam no longer requires.',
  ]),
  H.p('None of this requires abandoning material you like teaching. It requires being honest about where the exam\'s weight actually sits now, and letting that honesty move days on the calendar rather than letting the calendar run on inertia from a course structure that no longer exists.'),

  H.h2('Two Data Collections questions to test yourself'),
  H.p('Both questions below are the exact style the redesigned exam leans on for this unit: trace the code exactly, on paper, before you look at the answer.'),
  H.mcq({
    n: 1,
    stem: 'What does the following code segment print?',
    codeText: 'int[][] data = {{2, 4, 6}, {1, 3, 5}, {8, 8, 8}};\nint total = 0;\nfor (int r = 0; r < data.length; r++) {\n    for (int c = r; c < data[r].length; c++) {\n        total += data[r][c];\n    }\n}\nSystem.out.println(total);',
    options: ['28', '36', '24', '41'],
    correct: 0,
    why: 'The inner loop does not start at column 0, it starts at column r, so each row skips a growing number of columns on the left. Row 0 (r equals 0) sums all three columns: 2 + 4 + 6 = 12. Row 1 starts at column 1 and sums 3 + 5 = 8. Row 2 starts at column 2 and sums just 8. Total is 12 + 8 + 8 = 28. The trap is assuming every row gets fully summed just because the inner loop condition looks like a normal full traversal; the starting index is the part that actually changes the answer, and it is easy to skim past when you are tracing quickly.',
  }),
  H.mcq({
    n: 2,
    stem: 'What is printed after the following code runs?',
    codeText: 'ArrayList<Integer> nums = new ArrayList<Integer>();\nfor (int i = 1; i <= 5; i++) {\n    nums.add(i * 10);\n}\nfor (int i = 0; i < nums.size(); i++) {\n    if (nums.get(i) % 20 == 0) {\n        nums.remove(i);\n    }\n}\nSystem.out.println(nums);',
    options: ['[10, 30, 50]', '[10, 30, 40, 50]', '[10, 20, 30, 40, 50]', '[10, 40, 50]'],
    correct: 0,
    why: 'The list starts as [10, 20, 30, 40, 50]. At index 0, 10 is not a multiple of 20, so nothing happens. At index 1, 20 is a multiple of 20, so it is removed, which shifts everything after it down one slot: the list becomes [10, 30, 40, 50]. The loop then moves to index 2, but because of the shift, index 2 now holds 40, not 50. 40 is a multiple of 20, so it is removed too, leaving [10, 30, 50]. The loop variable never gets a chance to check what is now sitting at index 1, which is exactly why removing from a list while iterating forward over it is one of the most reliable ways to silently skip an element on this exam.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Is inheritance still on the AP CSA exam?', a: 'The standalone inheritance and polymorphism unit was removed from the required four unit structure and moved into optional, later course material. That means it is not built into the course the way it used to be, but College Board has not stated that every trace of the concept is barred from ever appearing in a released item, so treat it as unlikely to anchor a question rather than as impossible to see at all.' },
    { q: 'Why is Data Collections the biggest unit now?', a: 'When the standalone inheritance and polymorphism unit was removed, the exam still needed content to fill that space, and most of it landed on arrays, ArrayList, and 2D arrays, the material grouped as Data Collections. That is also the unit that already produced the most tracing errors under the old curriculum, so its larger footprint concentrates the hardest content into the single biggest part of the exam.' },
    { q: 'What should teachers who taught the old ten-unit curriculum change first?', a: 'Start with the calendar. If inheritance still gets a dedicated multi-week block on your plan, or if Data Collections is not the largest single block of instructional time in your course, those two habits are the most common leftovers from pacing built for a curriculum that no longer exists.' },
    { q: 'Are older released free response questions still useful practice?', a: 'They are useful for practicing general Java skills, but some lean on content, including inheritance-heavy scenarios, that the current exam no longer requires in the same way. Recent, redesign-era free response items should be the primary practice bank, with older items used as supplementary rather than core material.' },
  ]),

  H.cta({
    heading: 'Build your pacing around the exam that actually exists now',
    body: 'Daily tracing practice built for the four unit structure, a free response archive you can filter for redesign-era items, and a score calculator that reflects the current exam.',
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
  H.updatedNote('Reflects the College Board AP Computer Science A course and exam description in effect for 2025-26. Last reviewed August 25, 2026.'),
]);

module.exports = { meta, body };
