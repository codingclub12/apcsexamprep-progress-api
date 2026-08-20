'use strict';
// Weekly course post: AP CSP. Practice bank of written response prompts across
// the four categories, for rehearsal against a student's own Create task
// project. Companion piece to 2026-08-18-ap-csp-create-task-change.js, which
// covers the category explanations this post deliberately does not repeat.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'How to Use This AP CSP Written Response Practice Bank',
  'Program Design, Function, and Purpose Prompts',
  'Algorithm Development Prompts',
  'Errors and Testing Prompts',
  'Data and Procedural Abstraction Prompts',
  'A Fully Worked Example Answer',
];

const meta = {
  title: 'AP CSP Written Response Practice: 16 Prompts in the Current Format',
  handle: 'ap-csp-written-response-practice-prompts',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp written response practice',
  publishOn: '2026-09-11',
  seoTitle: 'AP CSP Written Response Practice: 16 Prompts',
  seoDescription: 'Sixteen AP CSP written response practice prompts across all four exam categories, plus a fully worked sample answer and two category identification drills.',
  summary: 'A rehearsal bank of sixteen written response prompts covering program design, algorithm development, errors and testing, and data and procedural abstraction, meant to be answered from your own Create task project under a timer.',
  tags: ['AP CSP', 'Written Response', 'Create Performance Task', 'Practice Prompts', 'Study Strategy'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('This is an AP CSP written response practice bank: sixteen prompts across the four categories, meant to be answered from your own Create task project under a timer, then checked against the strong-answer criteria already laid out in our guide to what changed about this task.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 8, 2026', updated: 'September 8, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Our <a href="/pages/ap-csp-written-response-guide">written response guide</a> already breaks down the four prompt categories College Board draws from: program design, function, and purpose; algorithm development; errors and testing; and data and procedural abstraction. Each category wants a different kind of sentence, and that guide explains why. This post does not re-teach any of that. It exists to give you volume: prompts to actually sit down and answer, not more explanation of what an answer should contain.'),
  H.p('Here is how to use it. Pick one prompt. Set a timer for four to six minutes, which is close to what you will actually have per prompt on exam day. Write a complete answer using your real program, the one you are building or have already built for the Create task, not a hypothetical one. Do not look anything up while the timer runs. When you stop, read your answer back against the strong-answer reminder for that category, printed right after the prompt list, and be honest about whether a stranger could tell from your sentences alone that you wrote the code. Repeat with a different prompt from a different category the next day rather than doing all sixteen in one sitting. Spaced repetition is what makes an explanation automatic instead of rehearsed once and forgotten.'),
  H.box('tip', 'Before you start', '<p>These prompts are written to work for any project, because they have to work for yours, whatever it is. When a prompt says "your list" or "your procedure," substitute the actual list and procedure from your program. If your program does not have a clean example of what a prompt is asking about, that is worth noticing now, in September, rather than in April.</p>'),

  H.h2(SECTIONS[1]),
  H.p('These prompts ask what your program is for, who it is for, and why you built it the way you did rather than some other way.'),
  H.ol([
    'Describe the overall purpose of your program: the problem it solves and who you built it for.',
    'Identify one significant design decision you made while building your program, and explain why you chose it over an alternative you seriously considered.',
    'Choose one specific feature of your program and explain how it directly serves the need of the user you identified.',
    'Describe one limitation or constraint you knowingly accepted in your program, and explain why that tradeoff still made sense given your program\'s purpose.',
  ]),
  H.box('key', 'What separates a strong answer here from a weak one', '<p>A strong answer names your actual user and ties a specific decision to their specific need. A weak answer describes what your program does in general terms that would be true of almost any similar project. "I added a difficulty setting so players could choose their challenge level" is a feature list. "I added a difficulty setting because early testers who were new to the topic gave up after missing the first few questions, and the easier mode slows the timer so they finish instead of quitting" is a design decision with a reason behind it.</p>'),

  H.h2(SECTIONS[2]),
  H.p('These prompts ask you to walk through how a specific piece of logic in your program actually works, step by step, including what it does at the edges.'),
  H.ol([
    'Choose one algorithm in your program and describe, in order, the steps it performs from input to output.',
    'Explain what your algorithm does at a boundary case, such as an empty list, the first item, the last item, or an extreme input value, and why it behaves that way.',
    'Trace your algorithm on one specific example input and state the exact output it produces for that input.',
    'Explain why you chose the approach you used for this algorithm instead of a simpler or different approach you could have used, and what that choice cost or gained you.',
  ]),
  H.box('key', 'What separates a strong answer here from a weak one', '<p>A strong answer walks through the steps in the order the code actually executes them and references a real input and output. A weak answer describes what the algorithm accomplishes without describing how it gets there. "My algorithm sorts the list" tells the reader nothing they could not guess from the procedure name. "My algorithm compares each pair of adjacent scores, swaps them if the first is smaller, and repeats that full pass until a pass produces no swaps" is the actual mechanism, and it is specific enough that a reader could trace it on paper.</p>'),

  H.h2(SECTIONS[3]),
  H.p('These prompts ask about a real bug you found in your own program, not about testing in the abstract.'),
  H.ol([
    'Describe one specific bug you found in your program, the test that revealed it, and the change you made to fix it.',
    'Explain how you decided which inputs to test your program with, and what those particular inputs were chosen to reveal.',
    'Describe a bug that was difficult to find, and explain why it stayed hidden until you found it.',
    'Explain how you confirmed, after fixing a bug, that the fix actually worked and did not break something else that had been working before.',
  ]),
  H.box('key', 'What separates a strong answer here from a weak one', '<p>A strong answer names one specific defect, the condition that triggered it, and the exact change that resolved it. A weak answer describes testing as a general activity. "I tested my program and fixed the bugs I found" could describe any project that was ever debugged, which means it earns nothing. "When the score list was empty, my average procedure divided by zero and crashed. I found it by testing with no entries on purpose, and I fixed it by returning zero whenever the list length is zero" is a specific condition, a specific discovery method, and a specific fix, in that order.</p>'),

  H.h2(SECTIONS[4]),
  H.p('These prompts ask what your list and your procedure actually buy you, stated concretely rather than as a general benefit of good code.'),
  H.ol([
    'Explain what your list stores, and why the number of items it holds is not fixed in advance.',
    'Describe two different calls to the same procedure using different parameter values, and the two different results those calls produce.',
    'Explain what would become harder to write or maintain if you replaced your list with a separate individual variable for each item.',
    'Explain what your procedure lets you avoid repeating in your code, and identify one specific place in your program where you rely on calling it instead of writing that logic again.',
  ]),
  H.box('key', 'What separates a strong answer here from a weak one', '<p>A strong answer gives two concrete calls with two different results, or states exactly what would break or get harder without the list or procedure. A weak answer states the general benefit abstraction provides in the abstract, without ever touching your actual code. "My procedure makes the code easier to read and reuse" is true of every procedure ever written, so it proves nothing about yours. "Calling scoreLabel(88, 90) returns Distinction and calling scoreLabel(65, 90) returns Not Yet, because the same procedure applies the passing threshold I pass in as the second argument" shows the parameter actually changing the outcome.</p>'),

  H.h2(SECTIONS[5]),
  H.p('Here is a complete sample answer, so you can see the finished shape rather than only a description of it. The project is PlantCare, a small program that tracks a user\'s houseplants and tells them which ones need watering. It stores each plant as an entry in a list, since the number of plants a user tracks changes as they add or remove them, and it uses one procedure to decide whether a given plant needs attention.'),
  H.code('needsWater(plant, thresholdDays):\n    daysSince = today - plant.lastWatered\n    return daysSince >= thresholdDays\n\n// Example calls on the same fern entry\nneedsWater(fern, 3)   // returns true if it has been three or more days\nneedsWater(fern, 7)   // returns true only if it has been a week or more'),
  H.p('The prompt being answered is the data and procedural abstraction prompt above: describe two different calls to the same procedure using different parameter values, and the two different results those calls produce.'),
  H.box('key', 'Sample strong answer', '<p>"My program uses a procedure called needsWater, which takes a plant entry and a threshold number of days, and returns true if that many days have passed since the plant was last watered. Calling needsWater(fern, 3) checks the fern against a strict three day threshold and returns true almost every time the app opens, since ferns in my list are watered every few days. Calling needsWater(fern, 7) checks the same fern entry against a looser seven day threshold and returns false in most of those same cases, because three days have not yet reached a full week. The two calls use the exact same plant entry and the exact same procedure, but produce different results because the threshold argument changes what counts as overdue. This lets one procedure serve both a strict watering reminder mode and a relaxed one, without writing separate logic for each."</p>'),
  H.p('Notice what makes that answer work. It names the procedure and both arguments. It gives two specific calls rather than describing the procedure once. It states both results and explains why they differ. Nothing in it requires the reader to have seen the code, and nothing in it could have been written about a different program.'),

  H.h2('Practice: Identify the Category'),
  H.p('Misreading which category a prompt belongs to is a real way to lose points, because you end up writing the right kind of sentence for the wrong question. These two questions practice that identification skill directly, separate from writing the answer itself.'),
  H.mcq({
    n: 1,
    stem: 'A written response prompt reads: "Describe the initial value of the primary data your algorithm uses, and how that value changes across each iteration as the algorithm executes." Which category does this prompt belong to?',
    options: [
      'Program design, function, and purpose',
      'Algorithm development',
      'Errors and testing',
      'Data and procedural abstraction',
    ],
    correct: 1,
    why: 'The word "data" in the prompt is a trap toward answer D, but the prompt is not asking what a list or a variable buys the program overall. It is asking how a value changes step by step as an algorithm runs, which is a trace of execution over iterations. That is squarely algorithm development. A data and procedural abstraction prompt would instead ask what the list or the procedure\'s parameter lets you avoid doing, not how a single value evolves during one run.',
  }),
  H.mcq({
    n: 2,
    stem: 'A written response prompt reads: "Identify a value in your program that was hard coded during early development, and describe how removing that hard coded value made your program work correctly for a wider range of inputs." Which category does this prompt belong to?',
    options: [
      'Program design, function, and purpose',
      'Algorithm development',
      'Errors and testing',
      'Data and procedural abstraction',
    ],
    correct: 3,
    why: 'The phrase "hard coded" sounds like a bug, which pulls toward errors and testing, but the prompt is not asking about a defect you found through a test. It is asking about turning a fixed value into a parameter so the same logic generalizes to more cases, which is exactly what procedural abstraction means. An errors and testing version of this idea would instead ask what broke because of the hard coded value and how you discovered it, not how generalizing it widened what your program could handle.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Do these prompts use the exact wording College Board will use on exam day?', a: 'No, and no practice bank honestly can, since the real prompts are not released in advance. These are written to match the structure and category of prompt College Board draws from, so the skill of answering them transfers even though the specific wording will differ.' },
    { q: 'Should I write about my real Create task project or a made up one?', a: 'Your real project, always. The entire point of this practice is rehearsing the explanation you will actually need in the exam room, which only works if you practice explaining the program you actually built.' },
    { q: 'How many of these should I do before the exam?', a: 'Enough that answering no longer feels like drafting from scratch. Most students notice a real difference somewhere between their third and sixth timed attempt, once the habit of naming specific inputs and specific results starts to feel automatic instead of effortful.' },
    { q: 'What if my project does not have a clean example for one of these prompts?', a: 'That is useful information now, while there is still time to adjust. If you cannot answer a data and procedural abstraction prompt because your list only ever holds a few fixed items, or a boundary case prompt because your algorithm never touches an edge case, consider whether a small change to your project would give you something real to say.' },
    { q: 'Is misidentifying the category actually a common mistake?', a: 'Yes. A well written answer to the wrong category earns very little credit, because the scoring is looking for the specific kind of reasoning that category asks for. Practicing identification, the way the two questions above do, catches this before it costs points on the real exam.' },
  ]),

  H.cta({
    heading: 'Keep the reps going',
    body: 'Read the full category breakdown and the reasoning behind the current exam format, then browse released prompts from previous years for more material to rehearse against.',
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
  H.updatedNote('Written to the AP CSP Create performance task written response format as revised by College Board for the current exam cycle. Last reviewed September 8, 2026.'),
]);

module.exports = { meta, body };
