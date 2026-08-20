'use strict';
// Weekly course post: AP CSP. Practical planning guide for choosing a Create
// performance task project idea, evaluated specifically for how defensible it
// will be months later in the proctored written response exam. Narrower and
// more concrete than the format-change post: this one is project ideas, not
// format explanation.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'The test your project idea actually has to pass',
  'Good AP CSP Create task ideas share four traits',
  'Six project concepts worth building',
  'The trap of the ambitious project',
];

const meta = {
  title: 'AP CSP Create Task Ideas That Are Easy to Explain Under a Timer',
  handle: 'ap-csp-create-task-project-ideas',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp create task ideas',
  publishOn: '2026-08-31',
  seoTitle: 'AP CSP Create Task Ideas: Projects Easy to Explain',
  seoDescription: 'AP CSP Create task ideas that will still make sense to you seven months from now, evaluated for how easy each one is to explain in the proctored exam.',
  summary: 'Not every good Create task project idea is a good Create task project idea to write about later. A practical framework for choosing a project you can still explain from memory, plus six concrete concepts that fit it.',
  tags: ['AP CSP', 'Create Performance Task', 'Project Ideas', 'Data Abstraction', 'Procedural Abstraction', 'Study Strategy'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('Most AP CSP Create task ideas get picked in September for how fun or impressive they sound to build. The exam does not ask how fun your project was. It asks you to explain it, from memory, in a proctored room, using two small code screenshots you chose months earlier. A project you understand completely beats a project that only sounds good on paper.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 1, 2026', updated: 'September 1, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('If you have not already read it, the written responses on the AP CSP Create task moved out of the take home submission and into the timed, proctored end of course exam. Our <a href="/blogs/ap-csp/ap-csp-create-performance-task-what-changed">guide to that change</a> covers the format in full. This post assumes you know that much and goes narrower: it is about choosing the actual project idea, evaluated specifically for how easy it will be to write about later, not for how it will look while you are building it.'),

  H.h2(SECTIONS[0]),
  H.p('Here is the constraint that should drive the whole decision, and it is easy to lose sight of in September when the project feels far away. On exam day you will not have your code. You will not have your notes. You will have a printed copy of the Personalized Project Reference you submitted months earlier, two small screenshots, and a proctor watching a clock. Whatever you cannot reconstruct from memory in that room does not exist for scoring purposes.'),
  H.p('That changes what "good project idea" means. A project that is genuinely interesting to build but sprawling, or clever but held together by logic you copied from a tutorial and never fully internalized, is a liability under those conditions. A project that is small, personally meaningful, and something you built line by line is an asset, because you can still narrate it accurately when you have not opened the file in months.'),
  H.box('key', 'The one question that matters most', '<p>Not "is this a good project?" but "will I still be able to explain this well under a timer in the spring?" Those are different questions, and the first one is the trap. Optimize for the second.</p>'),

  H.h2(SECTIONS[1]),
  H.p('Before you commit to an idea, run it through four checks. A strong Create task idea passes all four. An idea that only passes one or two is not disqualified, but it is a warning sign worth taking seriously in September rather than discovering in April.'),
  H.ol([
    '<strong>Can you describe its purpose in one sentence?</strong> Not a paragraph, one sentence. "A quiz game that tests vocabulary from a list of terms I add myself" is one sentence. If your explanation needs three clauses and a "but also," the scope has already gotten away from you, and every prompt in the exam will cost you time you do not have.',
    '<strong>Does it have a genuine reason to use a list?</strong> A list that holds three fixed items you could have written as three separate variables is a list in name only, and you will have nothing real to say when a prompt asks how it manages complexity. A list is genuine when its length is not fixed in advance, when items get added, removed, or filtered while the program runs, or when the same logic has to process however many items happen to be there.',
    '<strong>Can you build a procedure with a parameter that visibly changes behavior?</strong> The strongest answers to a procedural abstraction prompt come from being able to describe two different calls to the same procedure that produce two different, concrete results. If you cannot picture a second example call with a different outcome from the first, the parameter is decoration, not abstraction.',
    '<strong>Is the scope small enough to finish with time left to rehearse, not just time left to debug?</strong> Finishing your program the week it is due means the last thing you did with your code was fight it, not understand it. A smaller project finished early leaves weeks to explain it out loud to somebody else, which is the actual rehearsal that prepares you for a proctored room. A bigger project finished late leaves you cramming syntax instead of practicing explanation.',
  ]),
  H.p('None of these checks reward ambition. All four reward clarity, and clarity is the only thing the written response exam is capable of measuring.'),

  H.h2(SECTIONS[2]),
  H.p('These are not the only project shapes that satisfy the four checks above, but they are reliable ones, and each is small enough that a student building it alone can genuinely understand every line by the time it is finished.'),
  H.h3('A quiz game that stores its questions in a list'),
  H.p('The list holds question and answer data, a loop walks through it to run the quiz, and a procedure can grade a response or track a running score. The list is genuine because the number of questions can grow without touching the logic that runs the quiz, which is exactly the kind of concrete claim a data abstraction prompt rewards.'),
  H.h3('A basic to-do list manager'),
  H.p('Items get added to a list, marked complete, or removed, and the list length changes constantly while the program runs. It is personally usable, which tends to mean the student actually tests it the way a real user would, catching more of the edge cases that make for a strong errors and testing story later.'),
  H.h3('A choose-your-own-adventure text game built from a list of scenes'),
  H.p('Each scene is an entry in a list, and a procedure that takes a scene identifier as a parameter and returns the right text or choices demonstrates procedural abstraction cleanly, because calling it with two different scene identifiers produces two clearly different results. The branching structure also gives a natural, easy to narrate answer to a program design prompt about user choice.'),
  H.h3('A grade or GPA calculator that processes a list of scores'),
  H.p('A list holds however many scores the user enters, and a procedure computes an average, a letter grade, or an adjusted score from a parameter such as a curve value. It is a small program with an obvious, one sentence purpose, and the math involved is simple enough that explaining the algorithm step by step under time pressure is genuinely easy.'),
  H.h3('A flashcard study app that cycles through a list of terms'),
  H.p('Term and definition pairs live in a list, and the program can shuffle them, track which ones a student got wrong, or filter down to just the missed ones on a second pass. That filtering step is a strong, concrete answer to what a list buys you that a fixed set of variables could not.'),
  H.h3('A simple habit or streak tracker'),
  H.p('Each day the user logs an entry, and the list of entries grows over the course of using the app. A procedure that takes a target number of days as a parameter and reports progress toward it gives a clean, demonstrable example of a parameter that changes behavior, and the whole idea is small enough to finish early.'),
  H.p('Notice what all six have in common: a list that would break if you swapped it for a handful of separate variables, a procedure whose parameter you could point to and say exactly what it changes, and a purpose you could say out loud without taking a breath. None of them are impressive on a resume. All of them are easy to defend from memory seven months later, which is the only thing being scored.'),

  H.h2(SECTIONS[3]),
  H.p('Picture two students choosing their project idea on the same day in September.'),
  H.p('One student picks something ambitious: a multi-screen game with several modes, a scoring system, difficulty settings, and a handful of extra features layered in over the following months because each one seemed easy to add at the time. By April the program works, mostly, and it is genuinely impressive to click through. But the student has not looked at large parts of it in weeks, several features interact in ways that are hard to describe cleanly, and the two screenshots chosen for the Personalized Project Reference only capture a fraction of what the program actually does. In the exam room, prompts about the list or the procedure land on code the student remembers building but cannot fully reconstruct the reasoning behind anymore. The answers are vague where they need to be specific, because the honest answer to "why did you structure it this way" is "it grew that way," which does not translate into a strong written response.'),
  H.p('The other student picks something small: a flashcard app with one list of terms and one procedure that filters down to the ones missed most often. It is finished with weeks to spare, and those weeks get spent explaining it out loud to a study partner, twice, until the explanation is smooth. In the exam room, every prompt lands on code the student can still see clearly in their head. The list has an obvious reason to exist. The procedure\'s parameter has an obvious, demonstrable effect. The answers are short, specific, and confident, because there is nothing left to reconstruct. It was never that complicated to begin with.'),
  H.box('warn', 'The mistake that costs the most points', '<p>Treating project scope as a proxy for effort or skill. The exam does not know or care how ambitious your idea was. It only sees the two screenshots you chose and the answers you write about them. A simple project explained precisely will consistently outscore a complex project explained vaguely, because the rubric rewards specific, accurate reasoning about your own code, not the size of what you built.</p>'),
  H.p('If you already started building something bigger and it is not finished, this is worth revisiting honestly before the scope grows further. It is easier to simplify a project in September than to explain an unfinished one in April.'),

  H.h2('Practice the reasoning'),
  H.p('Choosing a good project idea and reasoning well about abstraction on exam day are the same skill applied at two different points in the year. These two questions test that skill directly.'),
  H.mcq({
    n: 1,
    stem: 'A student is choosing between two project ideas. Idea A uses a list to store exactly three fixed menu options that never change while the program runs. Idea B uses a list to store however many flashcard terms the student adds, and a procedure loops through the list to quiz on whatever was added. Which idea gives the student more to say if a written response prompt asks how a list manages complexity in the program?',
    options: [
      'Idea A, because three items are simple enough to describe quickly in a timed response',
      'Idea B, because the length of the list can change without any change to the code that processes it, which is a concrete illustration of what a list provides',
      'Idea A, because a fixed list is easier to draw out on paper during the exam',
      'Neither, because both programs technically use a list correctly',
    ],
    correct: 1,
    why: 'Idea A\'s list is a list in name only: three items that never change could just as easily be three separate variables, so there is nothing concrete to say about complexity being managed. Idea B\'s list is genuine, because the program has to work correctly no matter how many terms were added, and the code that processes it does not need to change as the list grows or shrinks. That is exactly the kind of specific, demonstrable claim a data abstraction prompt is looking for. Options A and C describe ease of use in the exam room, not what the list actually does for the program, and D avoids the comparison the prompt is asking for.',
  }),
  H.mcq({
    n: 2,
    stem: 'A grade calculator project includes this procedure, used to adjust a score by a curve value:',
    codeText: 'PROCEDURE adjustedScore(score, curve)\n  RETURN MIN(score + curve, maxScore)',
    options: [
      'Explaining that adjustedScore(78, 5) returns a higher value than adjustedScore(78, 0), showing the curve parameter changes the outcome for the same score',
      'Explaining that the procedure has a clear, descriptive name so other programmers could understand it',
      'Explaining that the procedure is shorter than writing the curve calculation inline every time it is needed',
      'Explaining that the procedure uses the MIN function to cap the result',
    ],
    correct: 0,
    why: 'Procedural abstraction is demonstrated by showing that one parameter change produces a different, describable outcome from the same underlying logic. Option A does exactly that with two concrete calls and two different results, which is the strongest kind of evidence in a written response. Option B is about naming and readability, not abstraction. Option C argues from code length, which is a side effect rather than the point. Option D describes an implementation detail of how the result is calculated, not why the parameter matters. The pattern worth copying is Option A\'s: name the parameter, give two calls, state the two different results.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'When should I choose my AP CSP Create task project idea?', a: 'As early in the course as your teacher allows. The whole point of choosing something small and genuine is that it gives you months to build it comfortably and weeks afterward to rehearse explaining it, rather than finishing under pressure right before the submission deadline.' },
    { q: 'Is a simple project idea going to score worse than an ambitious one?', a: 'Not on the written responses. The rubric rewards specific, accurate reasoning about the code you actually built, and a small project explained precisely will typically score higher than a large project explained vaguely, because there is nothing left to reconstruct from memory in the exam room.' },
    { q: 'What if my list only ever holds a few fixed items?', a: 'That is a sign the list is not doing real work. Look for a version of the idea where the number of items can genuinely change while the program runs, such as items a user adds, removes, or filters, rather than a small, unchanging set that could just as easily be separate variables.' },
    { q: 'Can I switch project ideas partway through the year?', a: 'Usually yes, and switching early to something smaller and clearer is far better than discovering in April that your current idea is too complex to explain well. Talk to your teacher about the timeline for your class, since the program and Personalized Project Reference still need to be finished and submitted by the end of April.' },
  ]),

  H.cta({
    heading: 'Prepare the explanation, not just the code',
    body: 'Once your project idea is set, our written response guide has practice prompts in the current proctored format, and the full CSP resource hub has everything else for the course.',
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
  H.updatedNote('Reflects the AP CSP Create performance task and Personalized Project Reference structure published by College Board for the current exam cycle. Last reviewed September 1, 2026.'),
]);

module.exports = { meta, body };
