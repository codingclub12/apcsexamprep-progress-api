'use strict';
// Weekly course post: AP CSP. Structural/format angle on the four written
// response categories, distinct from the two posts that already own the
// nearby territory: 2026-09-08-ap-csp-written-response-prompts.js is a
// sixteen-prompt rehearsal bank (volume, not shape), and
// 2026-10-13-ap-csp-common-mistakes.js is about vague-vs-specific prose
// within a single answer (rubric-row specificity, not category structure).
// This post is neither. It answers a narrower question: what SHAPE of
// sentence does each of the four categories actually want, since students
// tend to write the same generic sentence across all four instead of
// noticing each one is asking for a genuinely different kind of claim.
// 2026-10-27-ap-csp-explain-code.js is also linked, since verbalizing a
// segment is a good way to test whether an answer actually fits its shape.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'Why the Same AP CSP Written Response Sentence Shows Up in All Four Answers',
  'Program Design, Function, and Purpose: Name the Decision and the Reason',
  'Algorithm Development: Name the Mechanism and the Boundary',
  'Errors and Testing: Name the Case and What It Revealed',
  'Data and Procedural Abstraction: Name the Choice and Its Effect',
  'Four Templates, Side by Side',
];

const meta = {
  title: 'AP CSP Written Response: Four Prompts, Four Different Sentences',
  handle: 'ap-csp-four-prompts-four-sentence-shapes',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp written response',
  publishOn: '2026-11-03',
  seoTitle: 'AP CSP Written Response: Four Sentence Shapes',
  seoDescription: 'Every AP CSP written response category wants a different sentence shape. Get all four templates plus practice matching an answer to the right shape.',
  summary: 'The four AP CSP written response categories do not just cover different topics, they ask for four genuinely different sentence shapes. This guide gives one fill-in-the-blank template per category, so a student has something concrete to reach for instead of writing the same generic sentence four times.',
  tags: ['AP CSP', 'Written Response', 'Create Performance Task', 'Study Strategy', 'Exam Format'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('An AP CSP written response answer can be well written, correct, and still miss the point, because the four prompt categories are not asking for four topics. They are asking for four different SHAPES of sentence, and a student who writes the same generic sentence four times in a row is answering none of them the way the rubric expects.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'November 3, 2026', updated: 'November 3, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Every AP CSP written response prompt on the end-of-course exam draws from one of four categories: program design, function, and purpose; algorithm development; errors and testing; and data and procedural abstraction. Most students already know that. What fewer students notice is that each category is not just a different topic to write about. It is a different SHAPE of claim, and the shape matters as much as the content, because a rubric row is checking whether your sentence does the specific job that category needs it to do.'),
  H.p('Here is the failure this post is about. A student sits down with their Personalized Project Reference, reads a prompt, and writes a sentence that describes their program in general terms: what it does, why it is useful, how it works at a high level. That sentence might be true of every one of the four categories at once, which is exactly the problem. A sentence that would fit equally well under any of the four prompts has not actually answered the one it was written for, because it never took the shape that specific category is checking against.'),
  H.p('Our <a href="/pages/ap-csp-written-response-guide">written response guide</a> already explains what each category covers in depth, and our guide to <a href="/blogs/ap-csp/ap-csp-plausible-answers-that-earn-nothing">answers that sound right and score nothing</a> covers the separate problem of vague prose within a single answer. This post sits between those two. It is not a full category breakdown, and it is not about vagueness in general. It is about the one concrete sentence shape each category wants, stated as a fill-in-the-blank template you can actually reach for when a timer is running.'),
  H.box('key', 'The habit this replaces', '<p>A student without a shape in mind tends to default to describing the concept the prompt is testing: what abstraction is, what a bug is, why testing matters. A student with a shape in mind writes toward that shape from the first word instead, which is a faster and more reliable way to land on a sentence a rubric can actually credit.</p>'),

  H.h2(SECTIONS[1]),
  H.p('This category asks what your program is for, who it serves, and why you built a specific piece of it the way you did rather than some other way you could have chosen. The sentence shape it wants is a decision plus a reason, stated as a comparison against an alternative you actually considered and rejected. Not what the feature does. Why you picked it over something else.'),
  H.p('Consider a reading tracker app called PageTally. A generic answer might say the app helps users keep track of their reading, which is true and says nothing a rubric can check. The shaped answer names the actual decision: "I built a daily page goal instead of a total book count, because my early testers checked the app once and closed it when the total looked far away, but a daily number they could hit gave them a reason to open the app again the next day." That sentence names an alternative that was seriously on the table, states the concrete reason it lost, and ties the choice to an actual observed need.'),
  H.box('tip', 'Template: program design, function, and purpose', '<p>I chose ___ over ___, because my user needed ___.</p><p>Fill the first blank with the actual decision you made. Fill the second with the alternative you seriously considered and did not pick. Fill the third with the specific need, not a general benefit, that made the first option win.</p>'),

  H.h2(SECTIONS[2]),
  H.p('This category asks you to walk through how a specific piece of logic in your program actually works, in the order the code executes it, including what happens at the edges. The sentence shape it wants names the mechanism, not the outcome, and then names a boundary case to show the mechanism holds up rather than just working on the easy cases.'),
  H.p('In PageTally, a sortByDueDate algorithm reorders a reading list so the book due back soonest appears first. A generic answer says the algorithm sorts the list, which is true of every sorting algorithm ever written and describes nothing about how this one gets there. The shaped answer names the actual mechanism and a real boundary: "My sortByDueDate algorithm compares each pair of neighboring books and swaps them if the earlier one has a later due date, repeating full passes until one pass makes no swaps. At the boundary case of an empty reading list, the outer loop never runs, so the algorithm returns an empty list instead of failing on a list with nothing to compare." That sentence describes the actual comparison and swap, and it shows the algorithm behaving correctly at an edge rather than only in the typical case.'),
  H.box('tip', 'Template: algorithm development', '<p>My algorithm ___ by ___, and at the boundary case of ___, it ___.</p><p>Fill the first two blanks with the actual mechanism, the comparison, calculation, or step it performs and how. Fill the last two with a real edge case and how the algorithm handles it correctly rather than breaking.</p>'),

  H.h2(SECTIONS[3]),
  H.p('This category asks about a real bug in your own program, not about testing as a general practice. The sentence shape it wants names the exact test case that revealed the problem, states what actually went wrong, and says what the discovery told you. Not that you tested and fixed things. What one specific input showed you.'),
  H.p('In PageTally, a streakCount procedure tracks how many days in a row a user has logged reading. A generic answer says there was a bug and it got fixed after some testing, which could describe any project that was ever debugged. The shaped answer names the case and the reveal: "When I tested streakCount with a book logged right after midnight, the entry compared against the wrong calendar day, so a real two day streak reset to zero. That test case revealed that my date comparison relied on the device clock at the moment of logging instead of a fixed reading day, which I never noticed with my earlier test entries because they were all logged in the afternoon." That sentence names the exact input, the exact incorrect behavior, and the exact thing the case exposed about the underlying flaw.'),
  H.box('tip', 'Template: errors and testing', '<p>When I tested ___, I discovered that ___, which revealed that ___.</p><p>Fill the first blank with the specific input or case, not "my program" in general. Fill the second with the actual incorrect behavior you observed. Fill the third with what that specific case told you about the underlying cause, not just that a bug existed.</p>'),

  H.h2(SECTIONS[4]),
  H.p('This category asks what a list or a procedure actually buys your program, stated as a concrete effect rather than a general benefit of writing clean code. The sentence shape it wants connects a specific data or procedural choice to something that would genuinely be harder, or impossible, without it. Two calls with two different results, or one clear thing that would break.'),
  H.p('In PageTally, a packDays procedure takes a trip length and a checklist size and returns how many items to pack per day. A generic answer says the procedure keeps the code organized and reusable, which is true of nearly every procedure ever written and proves nothing about this one. The shaped answer connects the choice to a concrete, checkable effect: "By using a packDays procedure instead of writing the division out separately for every trip screen in my app, I was able to change the rounding rule once and have it apply everywhere the calculation is used, instead of finding and editing three separate copies of the same formula." That sentence names the actual choice, the actual alternative it replaced, and a specific, concrete thing the choice made possible.'),
  H.box('tip', 'Template: data and procedural abstraction', '<p>By using ___ instead of ___, I was able to ___.</p><p>Fill the first blank with your actual list or procedure. Fill the second with the specific alternative it replaced, separate variables, or logic written out repeatedly. Fill the third with one concrete thing that alternative would have made harder or impossible, not a general compliment about clean code.</p>'),

  H.h2(SECTIONS[5]),
  H.p('Laid out together, the difference in shape is easier to see than it is to describe one category at a time. Notice that each template asks for a different kind of second half: a reason for design, a boundary for algorithms, a reveal for testing, and a concrete result for abstraction. A sentence built for one shape almost never satisfies another, which is exactly why writing the same generic sentence four times fails all four rows instead of scoring even one of them.'),
  H.table(
    ['Category', 'Template', 'What the last blank has to be'],
    [
      ['Program design, function, and purpose', 'I chose ___ over ___, because my user needed ___.', 'A specific need, not a general benefit'],
      ['Algorithm development', 'My algorithm ___ by ___, and at the boundary case of ___, it ___.', 'Correct behavior at a real edge case'],
      ['Errors and testing', 'When I tested ___, I discovered that ___, which revealed that ___.', 'What the case exposed about the cause'],
      ['Data and procedural abstraction', 'By using ___ instead of ___, I was able to ___.', 'One concrete thing the choice made possible'],
    ]
  ),
  H.p('Our <a href="/blogs/ap-csp/ap-csp-written-response-practice-prompts">written response practice bank</a> gives you sixteen prompts across all four categories to fill these templates against under a timer. If a template will not fill in cleanly for your own program, that is worth finding out now rather than in the exam room. It usually means the category is asking about something your project does not currently have a clean example of, and there is still time to add one.'),
  H.box('warn', 'A filled template is a draft, not a finished answer', '<p>These templates get you to the right shape fast, but a rubric row still wants the specific fact spelled out inside each blank, not the blank itself restated in vaguer words. "I chose a daily goal over a total count because my user needed motivation" fills the shape but stays generic. Naming the actual testers and the actual behavior you observed, the way the worked example above does, is what turns a correctly shaped sentence into one that earns the point. Saying a segment out loud, the way our <a href="/blogs/ap-csp/ap-csp-explaining-code-out-loud-practice">practice on explaining code out loud</a> describes, is a fast way to catch a blank that only sounds filled in.</p>'),

  H.h2('Practice: Match the Answer to Its Shape'),
  H.p('Each question below gives you a finished written response answer, not a prompt. Decide which of the four sentence shapes it actually matches before checking the explanation, since recognizing a shape in someone else\'s answer is what lets you check for it in your own.'),
  H.mcq({
    n: 1,
    stem: 'A student\'s written response reads: "My packDays procedure takes a trip length and a checklist size and returns how many items go in each day\'s pile. Calling packDays(3, 12) returns four items per day, while calling packDays(4, 12) returns three items per day, using the exact same procedure with a different trip length." Which sentence shape does this answer match?',
    options: [
      'Program design, function, and purpose: a decision named against an alternative',
      'Algorithm development: a mechanism traced with a boundary case',
      'Errors and testing: a specific case that revealed a defect',
      'Data and procedural abstraction: the same call producing two different results',
    ],
    correct: 3,
    why: 'The answer names one procedure, packDays, and gives two actual calls with two different concrete results, four items per day versus three, produced by changing a single argument. That is exactly the data and procedural abstraction shape: a specific choice, connected to a concrete, checkable effect. There is no boundary case being traced, which rules out algorithm development, no design decision weighed against a rejected alternative, which rules out program design, and no bug or test input that revealed a problem, which rules out errors and testing.',
  }),
  H.mcq({
    n: 2,
    stem: 'A student\'s written response reads: "My sortByDueDate algorithm compares each pair of neighboring books and swaps them if the earlier one has a later due date, repeating full passes until one pass makes no swaps. At the boundary case of an empty reading list, the outer loop never runs, so the algorithm returns an empty list instead of failing." Which sentence shape does this answer match?',
    options: [
      'Program design, function, and purpose: a decision named against an alternative',
      'Algorithm development: a mechanism traced with a boundary case',
      'Errors and testing: a specific case that revealed a defect',
      'Data and procedural abstraction: the same call producing two different results',
    ],
    correct: 1,
    why: 'The answer describes the actual comparison and swap the algorithm performs, in the order it executes, and then names a real edge case, an empty list, showing the algorithm behaves correctly there instead of failing. That is the algorithm development shape exactly: mechanism plus boundary. It is not naming a design tradeoff against a rejected alternative, so it does not fit program design. It is not describing a test input that exposed a bug, so it does not fit errors and testing. And it never gives two different calls with two different results, so it does not fit data and procedural abstraction either, even though it is describing real code in detail.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Is this the same thing as the written response practice bank on this blog?', a: 'No. The practice bank gives you sixteen full prompts to answer from scratch under a timer. This guide gives you the underlying sentence shape each category is checking for, which is meant to be used while answering those prompts, not instead of them.' },
    { q: 'Do I need to use these exact template wordings on the real exam?', a: 'No, and you should not try to recite one word for word. The template is a shape to reach for while drafting, not a sentence to memorize. What matters is that your finished answer does the job the shape describes, names a decision and a reason, or a mechanism and a boundary, and so on, not that it uses these specific words.' },
    { q: 'What if my program does not have a clean example for one of the four shapes?', a: 'That is useful to notice now rather than in the exam room. If your data and procedural abstraction template will not fill in cleanly because your list only ever holds a fixed handful of items, or your algorithm development template will not fill in because your logic never touches a boundary case, a small addition to your project can give you something real to write about before your deadline.' },
    { q: 'Why do students write the same generic sentence across all four categories?', a: 'Usually because they are writing from the concept the prompt names, abstraction, algorithm, bug, rather than from their own code. Starting from a shape instead pushes you toward naming something specific from the start, since a template with blanks cannot be filled using only a definition.' },
    { q: 'How is this different from the guide about answers that sound right and score nothing?', a: 'That guide is about vague prose inside a single answer, the habit of talking around a fact instead of stating it. This guide is about a different, earlier problem: writing toward the wrong shape of sentence for the category you are answering, before specificity even becomes the issue.' },
  ]),

  H.cta({
    heading: 'Turn the shape into a finished answer',
    body: 'Practice filling these templates against real prompts across all four categories, then check your finished answers against the specificity habits that actually earn the rubric point.',
    links: [
      { href: '/blogs/ap-csp/ap-csp-written-response-practice-prompts', text: 'Written response practice bank' },
      { href: '/pages/ap-computer-science-principles-resources', text: 'All CSP resources', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Written to the AP CSP Create performance task written response format as revised by College Board for the current exam cycle. Last reviewed November 3, 2026.'),
]);

module.exports = { meta, body };
