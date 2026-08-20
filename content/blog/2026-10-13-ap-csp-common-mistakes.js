'use strict';
// Weekly course post: AP CSP. Drill track. This blog already has a post about
// AP CSP common mistakes at the multiple choice practice bank level, see
// 2026-08-18-ap-csp-practice-exam-pitfalls.js (handle
// ap-csp-practice-exam-common-mistakes). That post is entirely about telling
// a good practice QUESTION from a weak one. This post does not repeat it and
// links to it explicitly. This post is about a different failure that has
// nothing to do with question quality: a student's own WRITTEN RESPONSE
// answer, which sounds confident and uses correct vocabulary, but scores
// zero because it never states the specific technical fact a rubric row is
// actually checking for. That is a rubric-row-specificity problem, not an
// exam-question-format problem, which is why it is a genuinely separate
// angle from the existing post rather than a rewrite of it.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'The AP CSP common mistakes list this guide does not repeat',
  'What a rubric row actually checks, and why confidence does not help',
  'Four ways a plausible answer misses the rubric row',
  'Before and after: the same prompt, scored two different ways',
  'The one habit that fixes most of this: name the exact thing',
];

const meta = {
  title: 'AP CSP Common Mistakes: Answers That Sound Right and Score Zero',
  handle: 'ap-csp-plausible-answers-that-earn-nothing',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp common mistakes',
  publishOn: '2026-10-13',
  seoTitle: 'AP CSP Common Mistakes: Why Written Answers Score Zero',
  seoDescription: 'The AP CSP common mistakes list nobody writes: written answers that sound confident but miss the exact fact a rubric row checks for.',
  summary: 'A confident, well written AP CSP written response can still score zero if it never states the one specific fact a rubric row is checking for. This guide covers the four ways a plausible answer misses that fact, with before and after example pairs, and the single habit that fixes most of it: naming the exact variable, procedure, or error instead of describing the concept around it.',
  tags: ['AP CSP', 'Common Mistakes', 'Written Response', 'Exam Rubric', 'Study Strategy'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('A student can write a full, grammatically clean, confident-sounding paragraph in response to an AP CSP written response prompt and still earn zero points for it, because a rubric is not reading for confidence. It is checking for one specific fact, and a plausible answer that talks around that fact instead of stating it scores exactly the same as a blank one.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 13, 2026', updated: 'October 13, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('This is the other half of the AP CSP common mistakes conversation that rarely gets written up, because it is not about the exam itself. It is about a habit students bring to the exam with them: writing an answer that sounds like it understands the material without ever stating the one concrete fact a rubric row is actually looking for. It happens to strong students as often as struggling ones, because it is not a knowledge gap. It is a writing habit, and habits are fixable once you can see the exact shape of the failure.'),
  H.p('None of what follows is about spotting a weak multiple choice question, which is a different problem this blog has already covered in full.'),

  H.h2(SECTIONS[0]),
  H.p('If you searched for AP CSP common mistakes and landed here expecting a rundown of practice question quality, that guide already exists on this blog, and this post is not going to repeat it. Our <a href="/blogs/ap-csp/ap-csp-practice-exam-common-mistakes">guide to where AP CSP practice exam questions mislead you</a> covers a real and separate mistake: practice banks that reward vocabulary recognition over actual reasoning, and how to tell a good practice question from a weak one before you trust it with your study time. If that is the mistake you are trying to fix, that is the right page.'),
  H.p('This post is about something that happens after the reasoning is already correct. A student sits down to answer a written response prompt about their own Create task project, knows the material, and still writes an answer that a rubric cannot give credit to, because the answer describes the idea in general terms instead of stating the specific fact the prompt is asking for. That is a different failure mode entirely, and it deserves its own treatment rather than a paragraph tacked onto a post about question quality.'),
  H.box('key', 'The distinction in one sentence', '<p>The practice exam guide is about whether the QUESTION you are answering is testing the right skill. This guide is about whether your OWN ANSWER, to a perfectly good prompt, actually says the thing the rubric is checking for. A student can fail either one independently of the other.</p>'),

  H.h2(SECTIONS[1]),
  H.p('A written response rubric on the AP CSP exam is not scoring how well an answer reads. It is checking whether one specific, nameable fact appears somewhere in the response. That fact is usually a piece of the student\'s own program: a variable name, a procedure, a condition, a value, or a described behavior at a specific input. If that fact is present, the point is earned. If it is not present, no amount of correct vocabulary, confident phrasing, or general understanding of the underlying computer science concept earns it instead.'),
  H.p('This is uncomfortable because it means two answers can demonstrate the exact same level of understanding and score completely differently. A student who understands procedural abstraction deeply but writes about it in general terms, the kind of sentence that would be equally true of any program ever written, earns nothing for that understanding. A student who understands it less deeply but happens to name their actual procedure and describe what changes when a parameter changes earns the point, because the rubric is not measuring understanding directly. It is measuring whether a specific, checkable fact showed up in the response.'),
  H.p('The frustrating part is that the answer that misses the point often reads better than the one that earns it. A general, well phrased paragraph about why abstraction is useful sounds more like something a strong student would write than four blunt sentences naming a real procedure and two real return values. That mismatch between how an answer sounds and what it actually scores is exactly why this mistake is so easy to make and so hard to notice on your own without checking against the rubric directly.'),
  H.box('warn', 'The tell that your answer is in trouble', '<p>Read your own answer back and ask whether it could have been written by someone who has never seen your code, just from knowing the general concept the prompt is about. If the answer would work equally well glued onto a different student\'s different project, it has not said anything a rubric can check, no matter how correct or well written it is.</p>'),

  H.h2(SECTIONS[2]),
  H.p('There are four recognizable shapes this mistake takes, and once you can name them you can catch them in your own drafts before a real exam room does it for you.'),
  H.h3('Restating the prompt instead of answering it'),
  H.p('The prompt asks why a specific design choice was made, and the answer rephrases the prompt back with slightly different words, without ever supplying the actual reason. A prompt that asks what a procedure lets you avoid repeating gets an answer that says the procedure avoids repeating code, which is the question restated as a claim, not an answer to it.'),
  H.h3('Correct vocabulary standing in for a missing mechanism'),
  H.p('The answer correctly uses terms like abstraction, iteration, or parameter, and the vocabulary is not wrong, but nothing in the sentence shows the mechanism actually working. Saying a loop iterates through the list is a true fact about loops in general. It does not describe what this particular loop does, what it checks on each pass, or what changes as it runs.'),
  H.h3('A confident answer about the wrong variable, procedure, or error'),
  H.p('This one is sneaky because the answer is detailed and specific, just specific about something adjacent to what the prompt asked. A prompt about a bug in a scoring procedure gets an answer describing a completely different bug, or names a procedure that exists in the program but is not the one that actually produced the behavior the prompt is asking about. Specificity about the wrong thing scores the same as vagueness about the right thing: nothing.'),
  H.h3('A general benefit instead of a concrete result'),
  H.p('The prompt asks for two specific results from two specific calls to a procedure, and the answer instead explains why procedures are generally good practice: reusable, organized, easier to maintain. Every one of those claims is true and none of them is what was asked. The rubric is checking for two actual outputs, not an opinion about software design.'),

  H.h2(SECTIONS[3]),
  H.p('Seeing the failure named is useful. Seeing it fixed, side by side, is more useful, so here are two prompts answered twice each: once the way a plausible but ungraded answer sounds, and once the way an answer that actually earns the point sounds. Both example programs below are original to this post rather than reused from other pieces on this blog.'),
  H.table(
    ['Prompt', 'Sounds right, earns nothing', 'Names the exact thing, earns the point'],
    [
      [
        'Explain what your list stores and why the number of items in it is not fixed in advance.',
        'My list stores important data for my program and it is flexible because lists in programming can grow or shrink as needed, which makes them useful for many kinds of applications.',
        'My list, called workoutLog, stores one entry for every exercise a user logs during a session. The number of entries is not fixed because a user might log two exercises on a short day or fifteen on a long one, and my program has no way to know that count before the session starts.',
      ],
      [
        'Describe a bug that was difficult to find in your program and explain why it stayed hidden.',
        'I had a bug where my program did not work correctly for some inputs. It took a while to find because bugs can be tricky, especially when a program has a lot of moving parts, but I eventually tracked it down by looking through my code carefully.',
        'In my streakCount procedure, a workout logged after midnight was compared against the wrong calendar day, so a real two day streak was recorded as broken. It stayed hidden for weeks because every test entry I had made during development used a normal afternoon timestamp, and I never tested a log made right after midnight.',
      ],
      [
        'Explain what would become harder to maintain if you replaced your procedure with separate code written out at each place you currently call it.',
        'My procedure makes the code cleaner and easier to read, and reusing it instead of writing it out again saves time and reduces the chance of mistakes, which is generally considered good coding practice.',
        'My gradeLabel procedure is called from three different screens in my app. If I removed it and wrote the grading logic out separately in each of those three places, changing the passing threshold later would mean finding and editing all three copies correctly instead of editing gradeLabel once.',
      ],
    ]
  ),
  H.p('Look at what changed between each pair. The first column of each row is the actual prompt. The second column is not wrong, exactly. Every sentence in it could be defended as true. It just never touches the student\'s own program, which means a rubric reading it has nothing concrete to check against. The third column names an actual variable or procedure, describes an actual condition, and states an actual consequence. That is the entire difference between a paragraph that reads well and an answer that scores.'),
  H.box('tip', 'A fast self check before you submit any written response', '<p>Circle every noun in your answer that is a real, nameable part of your own program: a variable name, a procedure name, a specific value, a specific screen. If you can circle at least one and trace how it connects to the rest of the sentence, you are probably answering the actual prompt. If nothing in the paragraph is circleable, you have described the concept around the prompt instead of answering it.</p>'),

  H.h2(SECTIONS[4]),
  H.p('The fix for all four failure patterns above is the same single habit, which is good news, because it means you do not need four separate strategies. Before writing a sentence, decide which exact variable, procedure, condition, or observed behavior that sentence is going to name, and write the sentence around that thing rather than around the general concept the prompt is testing. If a prompt is about abstraction, do not start with the word abstraction. Start with the name of your actual procedure. If a prompt is about a bug, do not start with the word bug. Start with the exact input that triggered it.'),
  H.p('This reorders the whole drafting process in a useful way. Instead of thinking, this prompt is about procedural abstraction, so I should explain what procedural abstraction means and why it matters, think instead: this prompt is about my gradeLabel procedure specifically, so I am going to describe what gradeLabel actually does, name a real call to it, and state a real result. The vocabulary the prompt is testing will show up naturally once you are describing something real. It does not work in the other direction. Starting from the vocabulary and hoping something specific shows up along the way is exactly how a plausible answer ends up empty.'),
  H.p('It also gives you something concrete to check after writing, not just before. Read your finished answer and ask whether every sentence in it could survive having the general concept word deleted. If the sentence still makes sense and still says something true and specific about your program without the word abstraction, procedure, or algorithm sitting in it, the sentence was doing real work. If deleting that word leaves the sentence saying nothing, the word was standing in for a fact that was never actually supplied. Our <a href="/pages/ap-csp-written-response-guide">written response guide</a> covers what a strong answer looks like across each of the four prompt categories in more depth, and the <a href="/blogs/ap-csp/ap-csp-written-response-practice-prompts">written response practice bank</a> gives you real prompts to run this exact habit against before it has to work under a timer.'),
  H.box('key', 'Practice this on your own program, not a hypothetical one', '<p>The habit only builds correctly if the thing you are naming is real. Answering a practice prompt with a made up procedure name teaches you to write plausible-sounding fake specifics, which is a worse habit than the vague answer it replaces, because a fake specific sounds even more convincing while still earning nothing on the real exam, where the rubric is checking against your actual submitted project.</p>'),

  H.h2('Practice: score these written answers before you read the explanation'),
  H.p('Each question below gives you a real prompt and four candidate written responses to it. Decide which one would actually earn the rubric point before checking the explanation, the same way you would want to check your own draft.'),
  H.mcq({
    n: 1,
    stem: 'Written response prompt: "Explain why you chose a list instead of separate individual variables for the scores in your program, and identify one specific place in your code where using the list saves you from repeating logic." Which candidate answer would actually earn the rubric point?',
    options: [
      'Using a list is better because it keeps my code organized and makes it easier to add new scores whenever the user enters one, which is a common reason programmers use lists over separate variables.',
      'My program stores each quiz score in a list called quizScores instead of separate variables, because I do not know in advance how many quizzes a student will take. In my averageScore procedure, I loop over quizScores with a single statement; without the list, I would need a separate addition statement written out for every individual score variable, and I would have to add a new one by hand every time a student took another quiz.',
      'A list is a fundamental data structure in computer science because it lets you group related values together, which is why lists are used so often across many different kinds of programs.',
      'I used a list because arrays and lists are a required part of the AP CSP course and I wanted my written response to demonstrate that I understood how to use one correctly.',
    ],
    correct: 1,
    why: 'Only the second answer names the actual list, quizScores, states the real reason the count is unknown in advance, and identifies a specific procedure, averageScore, where the list saves repeated code. The first answer describes a general benefit of lists without ever touching this program. The third answer is a true statement about lists in general that would fit any program using any list. The fourth answers a different question entirely, about satisfying a course requirement, rather than about what the list does for this specific program. All three of those could be pasted onto a completely different student\'s completely different project without changing a word, which is exactly the tell that they answered the concept instead of the prompt.',
  }),
  H.mcq({
    n: 2,
    stem: 'Written response prompt: "Describe a bug that was difficult to find in your program, and explain why it stayed hidden until you found it." Which candidate answer would actually earn the rubric point?',
    options: [
      'I found a bug where my program crashed sometimes, and I looked through my code carefully until I found the mistake and fixed it, then tested it again to make sure everything worked correctly afterward.',
      'In my checkAnswer procedure, the bug only appeared when a student left the answer field blank. My comparison checked whether the entry equaled the correct answer exactly, and an empty entry never matched anything, so blank submissions were silently marked wrong instead of prompting the student to actually answer. It stayed hidden for weeks because every test input I used during development was a real guess, never a blank one.',
      'The bug happened because computers can behave unpredictably sometimes, especially with user input, which is a normal part of building any piece of software and something every programmer has to work through eventually.',
      'A bug in my scoreLabel procedure caused it to return the wrong grade sometimes, so I fixed it by rewriting the entire procedure from scratch to make it more reliable going forward.',
      'My program had a bug in it that I eventually found and corrected, and the experience taught me the importance of thorough testing throughout the development process.',
    ],
    correct: 1,
    why: 'The second answer names the exact procedure, checkAnswer, the exact condition that triggered the bug, a blank entry, the exact incorrect behavior that resulted, and the exact reason it stayed hidden, that every test input during development happened to be a real guess. The first and fifth answers describe the general process of finding and fixing a bug without ever stating what the bug actually was. The third answer is vocabulary about unpredictability with no mechanism behind it. The fourth names a real procedure but never states what specifically went wrong or why it went unnoticed, so it is specific about the wrong part of the story: the fix, not the bug or the reason it hid.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Is this the same thing as the AP CSP common mistakes covered in your practice exam guide?', a: 'No, and they do not overlap. That guide is about telling a well built practice question from a weak one, mostly for multiple choice material. This guide is about a student\'s own written response answer sounding correct but never stating the specific fact a rubric row checks for. A student can fully solve one problem and still have the other.' },
    { q: 'How do I know what a rubric row is actually checking for if I cannot see the real rubric?', a: 'You usually cannot see the exact wording, but the pattern is consistent across prompt categories: the rubric wants a specific fact from your own program, not a definition of the concept the prompt is about. Naming a real variable, procedure, condition, or result is almost always closer to what earns credit than explaining the general idea behind the prompt.' },
    { q: 'Why does a vague answer sometimes sound better than the specific one that actually scores?', a: 'A general, well phrased paragraph about a concept can read more polished than four blunt sentences naming a real procedure and a real value, because it uses smoother, more familiar language. Reading well and answering the prompt are different qualities, and a rubric is only checking the second one.' },
    { q: 'Can I fix this by memorizing better vocabulary before the exam?', a: 'No, and that is worth saying directly because it is the instinct this mistake usually comes from. More vocabulary makes an answer sound more confident without making it more specific, and the rubric is checking for specificity about your own program, not for correct terminology.' },
    { q: 'Where can I practice this habit before it has to work under a timer?', a: 'The <a href="/blogs/ap-csp/ap-csp-written-response-practice-prompts">written response practice bank</a> has real prompts across all four categories to draft against, and the <a href="/pages/ap-csp-written-response-guide">written response guide</a> explains what each category is looking for in more depth than this post covers.' },
  ]),

  H.cta({
    heading: 'Practice answering the exact prompt, not the concept near it',
    body: 'Timed written response prompts across every category, plus the full guide to what each category is actually checking for, so naming the specific fact becomes automatic before exam day.',
    links: [
      { href: '/blogs/ap-csp/ap-csp-written-response-practice-prompts', text: 'Written response prompt bank' },
      { href: '/pages/ap-computer-science-principles-resources', text: 'All CSP resources', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Last reviewed October 13, 2026, against the current AP Computer Science Principles Course and Exam Description and written response scoring guidance.'),
]);

module.exports = { meta, body };
