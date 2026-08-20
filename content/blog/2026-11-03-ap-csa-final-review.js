'use strict';
// Weekly course post: AP CSA. Capstone drill-track post for the fall CSA
// library: a navigation and planning tool, not a re-teach. Organizes the
// roughly thirty existing CSA posts by the four CED units (Using Objects and
// Methods, Selection and Iteration, Class Creation, Data Collections) plus a
// cross-cutting exam strategy and mechanics section, and gives a concrete
// checklist of what to actually DO in each one rather than re-explaining any
// of it, linking out to the dedicated post for each item. Companion in kind
// to the CSP Big Idea by Big Idea study guide, built for CSA's four units.
const H = require('../../lib/blog-house');

const SRC = {
  ced: { source: 'College Board AP Computer Science A course and exam description, 2025-26', url: null, asOf: 'August 2026' },
};

const SECTIONS = [
  'How to Use This AP CSA Final Review',
  'Unit 1, Using Objects and Methods: What to Do This Week',
  'Unit 2, Selection and Iteration: What to Do This Week',
  'Unit 3, Class Creation: What to Do This Week',
  'Unit 4, Data Collections: What to Do This Week',
  'Exam Strategy and Mechanics: The Cross-Cutting Checklist',
  'Suggested Time Allocation Across the Four Units',
  'Quick Comprehension Check',
  'Frequently Asked Questions',
];

const meta = {
  title: 'The AP CSA Final Review: Units 1 to 4',
  handle: 'ap-csa-half-year-review-units-1-to-4',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'ap csa final review',
  publishOn: '2026-11-03',
  seoTitle: 'AP CSA Final Review: Units 1 to 4',
  seoDescription: 'An AP CSA final review organized unit by unit, with concrete checklists linking to the exact posts on this blog, an exam mechanics section, and a time split.',
  summary: 'A navigation-style AP CSA final review organized by the four CED units: Using Objects and Methods, Selection and Iteration, Class Creation, and Data Collections. For each unit, a checklist of concrete review actions, linked to the specific dedicated posts already on this blog rather than re-explaining any of their content, plus a cross-cutting exam strategy and mechanics section and a suggested time allocation across the four units.',
  tags: ['AP CSA', 'Study Guide', 'Final Review', 'Units 1 to 4', 'Exam Prep', 'Study Plan'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('This AP CSA final review is built for the second half of the year: a unit by unit checklist that tells you exactly what to re-trace, rebuild, or redo across Units 1 through 4, each item pointing at the specific post on this blog that already covers it in full. It closes with a cross-cutting exam strategy and mechanics section for the skills no single unit owns, and a suggested time split so your review time roughly matches how the exam actually weights each unit.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'November 3, 2026', updated: 'November 3, 2026', readingMinutes: 13,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('This is the last post in a fall\'s worth of AP CSA content on this blog, and it is deliberately not another content post. Every fact the exam tests already has a home somewhere here: a full reference model for objects and methods, a class creation walkthrough, an ArrayList removal trap traced line by line, a recursion call-stack breakdown, and a whole shelf of exam mechanics posts on scoring, pacing, and common mistakes, among many others. Re-explaining any of that in this post would just be a worse copy of a page that already exists and does the job better. What was missing from a pile of separate posts was the plan that ties them together, so this is that plan.'),
  H.p('If you want the background on why the course is organized into exactly four units in the first place, our <a href="/blogs/ap-csa/ap-csa-2025-redesign-what-changed">breakdown of the 2025 redesign</a> covers what changed and why the old ten-unit structure no longer applies to anything on this blog.'),
  H.p('Work through the four unit sections below in whatever order matches your own gaps, not necessarily top to bottom. If you already know your weakest unit, start there. If you do not, the time allocation section near the end gives you a reasonable default order based on how the exam actually weights each one.'),
  H.box('key', 'Two habits that make every checklist below actually work', '<p>Every item in this review says re-trace, rebuild, or redo, not re-read. Reading a post again feels like review and mostly is not, because recognizing an explanation is a different skill than producing the answer yourself under time pressure. Before you check a box on any checklist below, close the source post first and try the thing cold. Our <a href="/blogs/ap-csa/ap-csa-variable-table-tracing-method">variable table tracing method</a> is the specific habit worth building for every trace item on this page, and it pairs well with the FRQ items below since both rebuild a skill an IDE usually does for you.</p>'),

  H.h2(SECTIONS[1]),
  H.p('Unit 1 sets up the object model the rest of the course quietly depends on. Review here means confirming the model actually holds, not just that the syntax compiles.'),
  H.ul([
    'Close the post and explain, out loud or on paper, why reassigning a variable that holds an object never changes what a second variable pointing at the same object sees. If that explanation gets fuzzy, work back through the <a href="/blogs/ap-csa/ap-csa-objects-references-explained">objects and references guide</a> and its four traced examples until you can state the rule from memory, word for word.',
    'Re-trace 3 String method chains that mix an off-by-one index with a method that returns a new String rather than modifying the original, using the <a href="/blogs/ap-csa/ap-csa-string-methods-off-by-one">String methods guide</a> as your source material. Predict the output before checking it.',
    'Retake the two Unit 1 multiple choice questions in the <a href="/blogs/ap-csa/ap-csa-practice-test-september-guide">September practice test guide</a> cold, timed, without the walkthrough open. If either one still takes real thought, that is a signal the reference model above has not fully stuck yet.',
  ]),

  H.h2(SECTIONS[2]),
  H.p('Unit 2 is where fluency with syntax has to turn into fluency with judgment: not just writing a working loop or condition, but recognizing which structure a problem actually calls for before you write a single line.'),
  H.ul([
    'Redo the short-circuit evaluation trace from the <a href="/blogs/ap-csa/ap-csa-compound-booleans-short-circuit">compound booleans guide</a> without looking, tracking specifically which half of a compound condition never gets evaluated and why that matters when the second half would otherwise throw an error.',
    'Take three loop-shaped problem descriptions, real ones from a practice set rather than ones you already know the answer to, and decide for-loop or while-loop before writing any code. Check your reasoning against the decision framework in the <a href="/blogs/ap-csa/ap-csa-for-while-loops-which-one">for loops versus while loops guide</a>.',
    'Write one full Unit 1 or Unit 2 free response question completely by hand, laptop closed, using the method and the worked example in the <a href="/blogs/ap-csa/ap-csa-frq-practice-laptop-closed">FRQ practice with the laptop closed guide</a>. This is the single most underused review action on this whole list, because it is the only one that reproduces exam conditions exactly.',
  ]),

  H.h2(SECTIONS[3]),
  H.p('Unit 3 is the smallest unit by exam share, but it is also where a large share of free response points get lost to compile errors that have nothing to do with the logic being wrong. Review here means rebuilding structure from a blank page, not recognizing correct code when it is already in front of you.'),
  H.ul([
    'Close the post entirely and rebuild the Book class from the <a href="/blogs/ap-csa/ap-csa-class-creation-constructors-fields-this">class creation guide</a> without looking: private fields, a constructor that assigns every one of them using <code>this</code>, and at least one accessor method. Only reopen the post to check your version once you have written the whole thing.',
    'Rebuild the Counter class from the <a href="/blogs/ap-csa/ap-csa-static-vs-instance-compile-errors">static versus instance guide</a> from memory, including one instance field and one static field, then write the specific line of code that fails to compile when a static method tries to read an instance field directly. Naming the exact reason it fails is the part that actually earns free response points, not just avoiding the mistake by instinct.',
  ]),

  H.h2(SECTIONS[4]),
  H.p('Unit 4 carries the largest share of the exam by a wide margin, and it also draws from every earlier unit at once: a for-each loop is Unit 2, an ArrayList is a class someone else built with Unit 3 habits, and Unit 4 is where all of it gets stress-tested against real data structures.'),
  H.ul([
    'Re-trace 3 ArrayList removal-during-iteration problems using the method in the <a href="/blogs/ap-csa/ap-csa-array-vs-arraylist">array versus ArrayList guide</a>, stepping through each one index by index rather than trusting your instinct about what should happen.',
    'Retrace the row-major versus column-major traversal example from the <a href="/blogs/ap-csa/ap-csa-2d-arrays-row-major-column-major">2D arrays guide</a> from a blank grid, then write both traversal orders yourself before checking which one the original problem actually needed.',
    'Redo the binary search trace and at least one full sort trace from the <a href="/blogs/ap-csa/ap-csa-binary-search-and-sorts-to-trace">searching and sorting guide</a> by hand, tracking every index comparison rather than jumping to the final answer.',
    'Trace one recursive method as a call stack, push phase and pop phase both, using the method in the <a href="/blogs/ap-csa/ap-csa-recursion-as-a-call-stack">recursion guide</a>. If you cannot draw the stack without help, that is the actual gap, not the recursive code itself.',
    'Work all twelve questions in the <a href="/blogs/ap-csa/ap-csa-unit-4-data-collections-questions">Unit 4 practice set</a> in one sitting, timed, since Unit 4 is the unit where a single combined scenario question rewards everything above working together rather than any one skill in isolation.',
  ]),

  H.h2(SECTIONS[5]),
  H.p('None of the following skills belong to a single unit. They are how points get won or lost regardless of which unit a question happens to be testing, and a review plan that only revisits content and skips these leaves real points on the table.'),
  H.ul([
    'Read the <a href="/blogs/ap-csa/ap-csa-frq-scoring-point-by-point">FRQ scoring guide</a> and reread one of your own past free response answers against an actual rubric line by line, not against your general impression of whether it was good.',
    'Run a timed multiple choice set using the pacing method in the <a href="/blogs/ap-csa/ap-csa-mcq-pacing-ninety-seconds">MCQ pacing guide</a>, and notice specifically which question types make you go over pace rather than just noting your overall time.',
    'Read the <a href="/blogs/ap-csa/ap-csa-common-mistakes-that-cost-points">common mistakes guide</a> and check your own recent practice work against each mistake on the list, not just the ones that sound familiar from memory.',
    'Print the <a href="/blogs/ap-csa/ap-csa-reference-sheet-what-it-gives-you">reference sheet guide</a> and time yourself finding three specific method signatures on it. If any of them take more than a few seconds to locate, that is time worth saving before exam day, not on it.',
    'Take a Java error message from your own recent code, cover the fix, and work through the diagnosis method in the <a href="/blogs/ap-csa/ap-csa-reading-java-error-messages">debugging guide</a> instead of guessing at a fix the way most students still default to.',
    'If flashcards have been most of your review method so far, read the <a href="/blogs/ap-csa/ap-csa-why-flashcards-fail">why flashcards fail guide</a> and swap at least one flashcard session this week for a tracing session instead.',
    'If AI tools are part of how you practice, check your own habits against the <a href="/blogs/ap-csa/ap-csa-using-ai-without-learning-nothing">using AI tools without learning nothing guide</a>, specifically the difference between asking a tool to explain a concept and asking it to write the code for you.',
    'If you are behind on any unit above, do not try to catch up and review at the same time without a plan. The <a href="/blogs/ap-csa/ap-csa-study-plan-already-behind">study plan for students already behind</a> lays out a two-track weekly routine built exactly for this situation.',
    'If your class runs a first-semester final, read what a strong one actually covers in the <a href="/blogs/ap-csa/ap-csa-first-semester-exam-what-good-covers">semester exam guide</a> so you are not surprised by its scope relative to the AP exam itself.',
    'Check your overall pacing for the months between now and the real exam against the <a href="/blogs/ap-csa/ap-csa-months-to-exam-what-to-do">months-to-exam timeline guide</a>, and adjust the phase you are in if this review is surfacing more gaps than that timeline expected at this point in the year.',
    'If AP Classroom is part of your class routine, make sure you are actually using it the way the <a href="/blogs/ap-csa/ap-csa-using-ap-classroom-without-wasting-time">AP Classroom guide</a> recommends rather than clicking through progress checks passively for completion credit.',
    'Once your unit review above feels solid, use the <a href="/blogs/ap-csa/ap-csa-raw-score-for-a-5">score calculator guide</a> to see roughly how many multiple choice questions you can afford to miss and still land the score you are aiming for, so your remaining review time gets pointed at the sections that actually move that number.',
  ]),

  H.h2(SECTIONS[6]),
  H.p('The four units are not weighted equally on the exam, and a review plan that splits time evenly across all four wastes hours on the smallest unit while shortchanging the largest. The table below restates the published unit weighting; full detail on the redesigned exam structure and score distribution lives in our <a href="/blogs/ap-csa/ap-csa-score-distribution-2026-analysis">score distribution analysis</a>.'),
  H.table(
    ['Unit', 'Share of the exam', 'Suggested review priority'],
    [
      ['1: Using Objects and Methods', H.stat('15 to 25 percent', SRC.ced), 'Foundational and moderate weight. Do not skip it, since Units 2 through 4 all build on it.'],
      ['2: Selection and Iteration', H.stat('25 to 35 percent', SRC.ced), 'Second-largest block. Worth a full multi-day pass, especially loop-choice judgment and hand-written FRQ practice.'],
      ['3: Class Creation', H.stat('10 to 18 percent', SRC.ced), 'Smallest block by exam share. A shorter review pass is defensible here, but do not let a shorter checklist read as skippable.'],
      ['4: Data Collections', H.stat('30 to 40 percent', SRC.ced), 'Largest block by a wide margin, and it draws on every earlier unit. Start here if you are choosing where to begin, and end here as your final pass before the exam.'],
    ]
  ),
  H.p('Translated into a rough two-week dedicated review window: give Data Collections the most days, something in the neighborhood of a third to nearly half of your total review time given how much it carries and how many earlier skills it depends on. Give Selection and Iteration the next largest share, then Using Objects and Methods a solid but shorter pass, and let Class Creation take the fewest dedicated days of the four while still getting its own focused session rather than being folded into general review. Reserve separate time outside all four, not carved out of any single unit, for the exam strategy and mechanics checklist above, since none of those skills belong to one unit and all of them compound across every question you sit for on exam day.'),
  H.p('If you are further out from the exam than a two-week window, our <a href="/blogs/ap-csa/ap-csa-months-to-exam-what-to-do">months-to-exam timeline guide</a> lays out a full-season version of this same priority order, phased across the rest of the year rather than compressed into two weeks.'),

  H.h2(SECTIONS[7]),
  H.p('Both questions below check whether the review habits above actually stuck, the way a real exam scenario would, rather than asking you to recall an isolated fact from a single unit.'),
  H.mcq({
    n: 1,
    stem: 'A method receives an ArrayList of Integer objects as a parameter and calls remove on it using an index inside a standard for-each loop over that same list, intending to remove every value less than ten. Which statement correctly describes the most likely result?',
    codeText: 'public static void removeSmall(ArrayList<Integer> nums) {\n    for (int n : nums) {\n        if (n < 10) {\n            nums.remove(nums.indexOf(n));\n        }\n    }\n}',
    options: [
      'The method runs correctly and removes every value less than ten',
      'The method throws a ConcurrentModificationException or silently skips some qualifying values, because modifying the list during a for-each loop over it is unsafe',
      'The method fails to compile, because remove cannot be called inside a for-each loop under any circumstance',
      'The method removes every value in the list regardless of its size, since indexOf always returns zero once one removal has happened',
    ],
    correct: 1,
    why: 'Modifying an ArrayList structurally, meaning adding or removing elements, while iterating over it with a for-each loop is undefined in the safe sense: it either throws a ConcurrentModificationException at runtime or silently skips elements as the list shifts underneath the loop\'s internal position tracking, exactly the trap the array versus ArrayList guide traces in detail. The fix is iterating backward with an indexed loop or building a separate list of items to remove, not restructuring the condition.',
  }),
  H.mcq({
    n: 2,
    stem: 'A student is deciding how to spend a single afternoon of review with the exam roughly a season away, and has moderate confidence in Unit 1 and Unit 3, but has never traced a full 2D array problem or a recursive call stack without help. Based on the unit weighting and dependency structure described in this guide, which plan makes the best use of that afternoon?',
    options: [
      'Reread the Unit 1 objects and references guide again, since it is foundational to everything else',
      'Spend the afternoon on Unit 4 material specifically, tracing a 2D array problem and a recursive call stack by hand, since Unit 4 carries the largest exam share and both named gaps sit inside it',
      'Split the afternoon evenly across all four units regardless of current confidence level',
      'Skip content review entirely and spend the whole afternoon on MCQ pacing drills instead',
    ],
    correct: 1,
    why: 'Unit 4 carries the largest share of the exam of the four units, and the two named gaps, 2D array traversal and recursive call-stack tracing, both live inside it, which makes it the highest-leverage use of a single afternoon. Unit 1 and Unit 3 are already at moderate confidence, so rereading either wastes time on ground already covered. Splitting evenly ignores both the weighting and the specific named gaps. MCQ pacing matters, but it is a mechanics skill layered on top of content that has not been traced yet, not a substitute for tracing it.',
  }),

  H.h2(SECTIONS[8]),
  H.faq([
    { q: 'How is this different from the individual unit posts already on this blog?', a: 'The unit posts each teach one concept in full: objects and references, class creation, recursion, and so on. This post teaches none of that. It is a plan that tells you which of those posts to revisit, in what order, and what specific action to take when you get there, so you spend review time doing rather than rereading.' },
    { q: 'Do I need to work through every checklist item before I can use this review?', a: 'No. This guide is meant to be worked through unit by unit over time, not completed in one sitting. Use the checklist for whichever unit you are reviewing that day, click into only the specific linked posts that checklist points to, and move on once you can complete the checklist without hesitating.' },
    { q: 'What if I am reviewing for a semester final rather than the AP exam itself?', a: 'Start with whichever units your class has actually finished, using the scope described in the first-semester exam guide linked in the exam strategy section above, and skip the Unit 4 checklist entirely if your class has not reached Data Collections yet. Come back to the full four-unit version of this review closer to the actual AP exam in the spring.' },
    { q: 'Some units have far more linked checklist items than others. Does that mean they matter more?', a: 'Mostly yes here, and the time allocation section above says so directly: Data Collections carries the largest exam share and gets the longest checklist and the most suggested review time, while Class Creation carries the smallest share and gets the shortest one. Use the weighting table, not just the length of a checklist, to confirm how much time a unit actually deserves for your own situation.' },
  ]),

  H.cta({
    heading: 'Turn this checklist into finished review',
    body: 'This guide tells you what to do and where. Our daily tracing practice and full free response archive are where the actual work happens.',
    links: [
      { href: '/pages/ap-csa-qotd-hub', text: 'Daily practice' },
      { href: '/pages/ap-csa-frq-archive', text: 'FRQ archive', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reflects AP CSA\'s four-unit CED structure and the current CSA blog library as of publication. Last reviewed November 3, 2026.'),
]);

module.exports = { meta, body };
