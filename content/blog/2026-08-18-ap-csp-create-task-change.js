'use strict';
// Weekly course post: AP CSP. News peg is the Create performance task written
// responses moving into the proctored exam, and the AI reasoning behind it.
const H = require('../../lib/blog-house');

const SRC = {
  cb: { source: 'College Board, AP Computer Science Principles exam', url: 'https://apcentral.collegeboard.org/courses/ap-computer-science-principles/exam', asOf: 'August 2026' },
  ai: { source: 'College Board guidance on artificial intelligence tools', url: 'https://apcentral.collegeboard.org/exam-administration-ordering-scores/administering-exams/exam-policies/artificial-intelligence-tools', asOf: 'August 2026' },
};

const SECTIONS = [
  'How the AP CSP Create performance task works now',
  'Why College Board moved the writing into the exam',
  'The Personalized Project Reference is the whole game',
  'The four prompt categories, and what each one wants',
  'How to build a project that is easy to write about',
  'What the AI policy actually permits',
];

const meta = {
  title: 'What Happened to the AP CSP Create Performance Task',
  handle: 'ap-csp-create-performance-task-what-changed',
  blogHandle: 'news',
  course: 'ap-csp',
  targetKeyword: 'ap csp create performance task',
  publishOn: '2026-08-18',
  seoTitle: 'AP CSP Create Performance Task: What Changed',
  seoDescription: 'The AP CSP Create performance task no longer includes take home written responses. They are now timed exam prompts answered from your Project Reference.',
  summary: 'The written half of the AP CSP Create performance task moved into the end of course exam, answered under proctor from a Personalized Project Reference. What that changes about how you build your project, and how to prepare for prompts you cannot draft at home.',
  tags: ['AP CSP', 'Create Performance Task', 'Written Response', 'Exam Format', 'Study Strategy'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('The part you used to write at home, over weeks, with your notes open, is now written in a proctored room in under an hour. If you are preparing from a guide written before this change, you are preparing for an exam that no longer exists.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'August 18, 2026', updated: 'August 18, 2026', readingMinutes: 9,
  }),
  H.toc(SECTIONS),

  H.p('Search for advice on this and you will still find pages telling you to draft your written responses carefully, revise them over several sessions, and submit them with your program. That advice describes a version of the task that has been retired, and following it will cost you real points.'),

  H.h2(SECTIONS[0]),
  H.p('The task now splits into two pieces that happen at different times, in different conditions.'),
  H.table(
    ['Piece', 'When', 'Conditions', 'What you submit'],
    [
      ['Your program and Personalized Project Reference', 'During the course, submitted as final by the end of April', 'At school, over weeks, with help permitted within the rules', 'Working program plus screenshots of one list code segment and one procedure code segment'],
      ['Written responses', 'On exam day, in the end of course exam', 'Proctored, timed, no notes beyond your own reference', 'Typed answers to prompts about the program you built'],
    ]
  ),
  H.sourceNote('College Board AP Computer Science Principles assessment overview', null, 'August 2026'),
  H.p('On exam day you receive a printed copy of your own Personalized Project Reference. That document, and nothing else, is what you write from. You cannot bring your code. You cannot bring notes about your code. You get the screenshots you chose months earlier, and you answer questions about a program you may not have opened since April.'),
  H.box('key', 'The one sentence version', '<p>Your project is still built at home. Your explanation of it is now an exam. That single change is what everything else in this guide follows from.</p>'),

  H.h2(SECTIONS[1]),
  H.p('College Board has been direct about the reasoning, and it is worth understanding because it tells you how the prompts will be written.'),
  H.p('The old written responses were composed entirely at home, unsupervised, and submitted weeks before the exam. An essay explaining what a program does and why it was designed that way is exactly the kind of writing a generative AI tool produces well, and once submitted there was no practical way to verify who wrote it. A proctored session, drawing on a document the student built themselves, is a much harder thing to outsource.'),
  H.p('The consequence for you is that prompts will lean toward the specific and the personal. A question that could be answered well about any program is a question a tool could answer. Expect prompts that only make sense if you actually know your own code: why this condition, what happens on that input, what this procedure returns when the list is empty.'),

  H.h2(SECTIONS[2]),
  H.p('Most students treat the Personalized Project Reference as paperwork. It is not paperwork. It is the only material you are allowed in the room, so it functions as an open note sheet that you write yourself, months in advance, with no chance to revise it.'),
  H.p('It contains two screenshots: one code segment showing a list being used to manage complexity, and one showing a student developed procedure with a parameter that affects its behaviour. Choose them badly and you will spend exam time explaining code that does not illustrate what the prompt asks about.'),
  H.box('tip', 'How to choose your two screenshots', '<p>Pick the segments you can talk about for five minutes without hesitating, not the ones that look most sophisticated. A simple procedure whose logic you understand completely is worth more marks than a clever one you half remember. And make sure your procedure genuinely uses its parameter to change what it does, because a parameter that is accepted and ignored makes several prompts unanswerable.</p>'),

  H.h2(SECTIONS[3]),
  H.p('The prompts span four categories. Knowing which category you are being asked about is most of the work, because each one rewards a different kind of sentence.'),
  H.table(
    ['Category', 'What it asks', 'What a strong answer contains'],
    [
      ['Program design, function and purpose', 'What your program does and why you built it that way', 'The problem, the user, and a design decision with its reason. Not a feature list.'],
      ['Algorithm development', 'How a specific algorithm in your code works', 'The steps in order, including what happens at the boundaries, referenced to your actual code'],
      ['Errors and testing', 'How you found and fixed problems', 'A specific bug, the test that exposed it, the change you made, and how you confirmed the fix'],
      ['Data and procedural abstraction', 'How your list and procedure manage complexity', 'What would be harder without them, stated concretely'],
    ]
  ),
  H.box('warn', 'The mistake that costs the most points', '<p>Answering in general terms. "My procedure makes the code easier to read and reuse" is true of every procedure ever written, so it demonstrates nothing about yours. "Without this list I would need a separate variable for each of the twelve questions, and adding a thirteenth would mean editing four places" earns the mark, because only someone who knows this program could write it.</p>'),

  H.h2(SECTIONS[4]),
  H.p('Because you now explain your program under time pressure from memory, the best strategy starts months earlier, at the point you choose what to build.'),
  H.ol([
    '<strong>Build something you can describe in one sentence.</strong> If explaining the purpose takes a paragraph, every prompt costs you time you do not have.',
    '<strong>Use a list that genuinely needs to be a list.</strong> Storing several related things that grow or get filtered gives you something real to say about abstraction. A list of three fixed items does not.',
    '<strong>Write one procedure whose parameter changes the outcome visibly.</strong> Then you can answer any procedural abstraction prompt by describing two different calls and two different results.',
    '<strong>Keep a bug log while you build.</strong> One line per bug: what went wrong, how you noticed, what fixed it. The errors and testing prompts are nearly free if you have this, and nearly impossible to answer well in May from memory if you do not.',
    '<strong>Rehearse out loud in April.</strong> Before you submit, explain your two code segments to somebody who has not seen them, from the screenshots alone. Whatever you stumble over is what you will stumble over in the exam.',
  ]),
  H.p('If you want prompts to rehearse against, our <a href="/pages/ap-csp-written-response-guide">written response guide</a> has practice prompts in the current format, and the <a href="/pages/ap-csp-written-response-archive">archive</a> collects released prompts from previous years, which remain useful for the style of thinking even though the conditions changed.'),

  H.h2(SECTIONS[5]),
  H.p('Since the change is motivated by AI, students reasonably ask what they are allowed to use while building. The rule is narrower than most assume.'),
  H.p('You may not use AI tools to write or create your assignment for you. If a generative tool assisted your development, that must be attributed according to College Board plagiarism policy. Using a tool to produce the program you submit as your own work is a plagiarism violation, not a grey area.'),
  H.box('tip', 'The practical line', '<p>Asking a tool to explain why a language feature behaves a certain way is learning. Asking it to produce the procedure you submit is not, and it also leaves you unable to answer prompts about code you did not write. Under the new format that second problem hurts you on exam day regardless of whether anyone ever detects the first.</p>'),

  H.h2('Practice the format'),
  H.p('This is the style of prompt to expect. Draft an answer before opening the explanation.'),
  H.mcq({
    n: 1,
    stem: 'A student writes a procedure <code>filterScores(scores, cutoff)</code> that returns a new list containing only the values in <code>scores</code> greater than <code>cutoff</code>. Which of these best demonstrates procedural abstraction in a written response?',
    options: [
      'Explaining that the procedure has a descriptive name so other programmers can read it',
      'Explaining that calling filterScores(list, 50) and filterScores(list, 90) produce different results without rewriting the filtering logic',
      'Explaining that the procedure is shorter than writing the code twice',
      'Explaining that the procedure uses a loop to check each element',
    ],
    correct: 1,
    why: 'Procedural abstraction is about a parameter changing behaviour so one piece of logic serves many cases. Option B shows exactly that with two concrete calls and two different outcomes. A describes naming, which is readability rather than abstraction. C is close but argues only from length, which is a side effect. D describes how the procedure is implemented, which is the opposite of abstraction: abstraction is about what you no longer have to think about.',
  }),
  H.mcq({
    n: 2,
    stem: 'Which bug description would earn the most credit on an errors and testing prompt?',
    options: [
      'My program had a few bugs but I fixed them all by testing it carefully',
      'My program crashed sometimes so I added error handling',
      'When the list was empty my average procedure divided by zero, which I found by testing with no entries, and I fixed it by returning 0 when the length is 0',
      'I used print statements to debug my program until it worked correctly',
    ],
    correct: 2,
    why: 'The prompt wants a specific defect, the test that revealed it, the change, and evidence the change worked. Only C names an actual failure condition, the input that triggered it, and the concrete fix. A and D describe a process without a bug. B names a symptom without a cause or a specific remedy. This is the pattern to copy: condition, discovery, fix.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Do I still submit written responses with my AP CSP program?', a: 'No. You submit your program and your Personalized Project Reference during the course. The written responses are now answered during the proctored end of course exam.' },
    { q: 'What is the Personalized Project Reference?', a: 'A document containing screenshots of one code segment showing a list and one showing a student developed procedure with a parameter. You submit it as final by the end of April and receive a printed copy on exam day to write from.' },
    { q: 'Can I bring my code to the AP CSP exam?', a: 'No. The only material from your project available to you is the Personalized Project Reference you submitted earlier in the year, which is provided to you on exam day.' },
    { q: 'Can I use AI to help build my Create task program?', a: 'You may not use AI tools to write or create the assignment for you. If generative tools assisted your development, that use must be attributed under College Board plagiarism policy.' },
    { q: 'Are older AP CSP written response examples still useful?', a: 'They are useful for understanding what strong reasoning looks like, but not as a model of the conditions. Older samples were drafted at home over weeks, so their length and polish are not a realistic target for a timed proctored response.' },
  ]),

  H.cta({
    heading: 'Rehearse the written responses before May',
    body: 'Practice prompts in the current format, a full pseudocode reference, and released prompts from previous years.',
    links: [
      { href: '/pages/ap-csp-written-response-guide', text: 'Written response guide' },
      { href: '/pages/ap-computer-science-principles-resources', text: 'All CSP resources', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reflects the AP CSP assessment structure published by College Board for the current exam cycle. Last reviewed August 18, 2026.'),
]);

module.exports = { meta, body };
