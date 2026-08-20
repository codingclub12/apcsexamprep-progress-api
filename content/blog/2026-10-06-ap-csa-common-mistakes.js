'use strict';
// Weekly course post: AP CSA. Drill track: whole-exam strategy mistakes, not
// code-level ones. The AP CSA blog already has six posts that each own a
// specific code-level mistake category (FRQ writing habit, reading compiler
// errors, FRQ scoring mechanics, String off-by-ones, array vs ArrayList,
// MCQ pacing), plus a seventh post covering the Java Quick Reference sheet in
// depth. This post deliberately does not re-explain any of those seven.
// It covers three mistakes that live outside the code entirely: not
// answering every multiple choice question, running out of clock on the
// fourth free-response question because the first three ate it, and
// answering the wrong part of a multi-part free-response prompt. All three
// exam-mechanics facts below (no MCQ guessing penalty, digital Bluebook
// delivery, 42 MCQ / 4 FRQ format) were re-verified against current College
// Board pages before writing, since a wrong claim about how the exam works
// is exactly the failure mode this blog cannot afford.
const H = require('../../lib/blog-house');

const SRC = {
  noGuessPenalty: {
    source: 'College Board, AP Students: Will I lose points if I answer a multiple-choice question incorrectly?',
    url: 'https://apstudents.collegeboard.org/help-center/will-i-lose-points-if-i-answer-multiple-choice-question-incorrectly',
    asOf: 'August 2026',
  },
  examShape: {
    source: 'College Board, AP Computer Science A Exam assessment overview',
    url: 'https://apstudents.collegeboard.org/courses/ap-computer-science-a/assessment',
    asOf: 'August 2026',
  },
};

const SECTIONS = [
  'AP CSA common mistakes that have nothing to do with your code',
  'Leaving multiple choice questions unanswered when guessing costs nothing',
  'Running out of clock before you ever open the fourth free-response question',
  'Answering the wrong part of a multi-part free-response question',
  'A two-minute pre-submission checklist',
  'Two practice questions on exam-day decisions',
  'Frequently asked questions',
];

const meta = {
  title: 'AP CSA Common Mistakes the Syntax Guides Don\'t Cover',
  handle: 'ap-csa-common-mistakes-that-cost-points',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'ap csa common mistakes',
  publishOn: '2026-10-06',
  seoTitle: 'AP CSA Common Mistakes Beyond Syntax and Code',
  seoDescription: 'AP CSA common mistakes that are not about code at all: skipping MCQs, running out of FRQ time, and answering the wrong part of a multi-part prompt.',
  summary: 'Most AP CSA advice about losing points focuses on code: a missing semicolon, an off-by-one index, a rubric point missed. This guide covers three mistakes that have nothing to do with the code you write, because they happen before you write a single line or after you have already written a correct one: leaving multiple choice questions unanswered when there is no penalty for guessing, running out of section time before ever opening the fourth free-response question, and answering the wrong part of a multi-part prompt. Each one is explained with why it costs real points and what to actually do instead.',
  tags: ['AP CSA', 'Exam Strategy', 'Study Habits', 'Time Management', 'Free Response'],
  allowedInlineNumbers: ['four free-response', 'four free response'],
};

const body = H.article([
  H.dek('AP CSA has six posts on this blog already covering the code-level mistakes that lose the most points: FRQ writing habits, reading compiler errors, how the rubric actually scores a flawed answer, String off-by-ones, array versus ArrayList, and MCQ pacing. This post does not repeat any of them. It covers three mistakes that cost real points without a single line of broken code involved, because they happen in the decisions around the code rather than inside it.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 6, 2026', updated: 'October 6, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Search for AP CSA common mistakes and most of what comes back is a list of code problems: a wrong loop bound, a misused equals sign, a String index that runs one past the end. Those are real, and this blog has already given each of them a full treatment rather than a bullet point. The <a href="/blogs/ap-csa/ap-csa-frq-practice-laptop-closed">FRQ practice with the laptop closed</a> post covers the habit of writing correct Java from memory. The <a href="/blogs/ap-csa/ap-csa-reading-java-error-messages">reading Java error messages</a> post covers debugging compile-time and runtime failures methodically. The <a href="/blogs/ap-csa/ap-csa-frq-scoring-point-by-point">FRQ scoring</a> post covers exactly how a rubric reads a flawed response, including the rule about using a method the prompt required. The <a href="/blogs/ap-csa/ap-csa-string-methods-off-by-one">String methods</a> post covers charAt and substring index traps. The <a href="/blogs/ap-csa/ap-csa-array-vs-arraylist">array versus ArrayList</a> post covers the removal-during-iteration bug. The <a href="/blogs/ap-csa/ap-csa-mcq-pacing-ninety-seconds">MCQ pacing</a> post covers how to triage a fast-recognition question against a full trace question inside the multiple choice section.'),
  H.p('This post is deliberately about something different: three mistakes that are not about whether the code you wrote is correct. Two of them can cost points while every single line you write is perfectly right, because they are about what you never got to write, or where you wrote it. The third is a decision that happens before a keyboard is even involved. None of the three require rewriting a method or fixing a syntax habit. All three are fixed by changing a decision, which is a much cheaper repair than rebuilding a coding skill, and there is still time to make that repair before May.'),

  H.h2(SECTIONS[1]),
  H.p('Here is a fact worth stating plainly because so much AP CSA advice treats multiple choice like the SAT of a decade ago: College Board does not deduct points for an incorrect answer, and it never has on the current scoring model. A wrong answer and a blank answer score the exact same zero. A guess, even a pure coin flip with zero elimination, has a real chance of scoring the same as a right answer and cannot ever score worse than leaving the question empty. ' + H.stat('Points are not deducted for incorrect answers', SRC.noGuessPenalty) + ' on the multiple choice section, full stop.'),
  H.p('Knowing that fact and acting on it under a countdown timer are two different things, and the gap between them is where this mistake actually lives. A student who intellectually knows there is no guessing penalty still, in practice, leaves questions blank at the end of the section, and it is worth naming why that happens instead of just repeating the rule. It is rarely a decision. It is a symptom: time runs out mid-question, or a student marks something for review meaning to return and the section ends first, or a hard question gets skipped with a mental note to come back that never actually gets acted on because nothing forces it to.'),
  H.box('warn', 'The mistake is not skipping. It is skipping without a system.', '<p>Skipping a hard question to come back later is good triage, and the <a href="/blogs/ap-csa/ap-csa-mcq-pacing-ninety-seconds">MCQ pacing guide</a> covers exactly when that trade is worth making. The mistake is treating "I will come back to it" as if it were the same thing as an actual answer. It is not. If the section ends before you return, a skipped question and a question you never read are scored identically: zero.</p>'),
  H.p('The fix is mechanical, not motivational. The exam is administered digitally through College Board\'s Bluebook app, which lets you mark a question for review and jump back to it from a question navigator that shows every question you have answered, skipped, or flagged. Use that navigator as a checklist, not a suggestion. Before you submit, or before time runs out, run down that list and confirm every single question shows an answer selected, even a guessed one. A flagged question with no answer picked yet is not progress toward a plan, it is an unfinished decision sitting at zero points, and the fifteen seconds it takes to pick something, anything, before the section ends is free points every single time.'),
  H.p('A specific version of this mistake deserves its own mention: picking your best guess on a hard question, planning to verify it if time allows, and never actually locking it in because the mental note to select an answer got lost in the process of moving to the next question. Build the habit of selecting an answer the moment you decide to move on from a question, even a low-confidence one, and only revise it later if you return. An answer already selected that you improve later is strictly better than an empty answer waiting for a return trip that time pressure may never allow.'),

  H.h2(SECTIONS[2]),
  H.p('The free-response section has four questions, and the version of this mistake that costs the most points is specific and predictable: a student writes a strong, careful, mostly correct answer to the first question, a solid answer to the second, spends longer than planned getting the third exactly right, and then looks up to find there are eleven minutes left and the fourth question, the one testing 2D arrays and often the most code-heavy of the four, has not been touched at all. Every line written on that student\'s exam might be correct. The fourth question still scores close to zero, because a blank response earns nothing regardless of how strong everything before it was.'),
  H.p('This is a different failure than the one the <a href="/blogs/ap-csa/ap-csa-mcq-pacing-ninety-seconds">MCQ pacing guide</a> covers, which is entirely about triage inside the multiple choice section: whether a specific question deserves a full trace or a fast recognition read. That guide does not touch the free-response section at all. This mistake is about the clock across an entire different section, one where the traps are not five-second recognition questions but four independent, multi-part coding problems that do not announce how long each one should take.'),
  H.p('The trap is subtle because working carefully on question one feels like good practice, and it is, right up until it silently borrows time from question four. Nothing about a strong first answer signals that the clock is now behind schedule. There is no automatic warning that reallocates the minutes you spent polishing a working method into the question you have not started yet. The only defense is deciding, before the section starts, roughly how many minutes each question gets, and treating that number as a checkpoint the same way the MCQ pacing guide treats its quarter and half marks. If a schedule allots about equal time to all four questions and question one is still not finished when that block of time is gone, that is the signal to write what is currently correct, move on, and return only if time remains at the end, rather than polishing further.'),
  H.box('key', 'When time runs out mid-section, protect the fourth rubric, not the third answer', '<p>Each free-response question is scored on its own independent rubric, a mechanic the <a href="/blogs/ap-csa/ap-csa-frq-scoring-point-by-point">FRQ scoring guide</a> covers in full. That independence cuts a specific way under time pressure: the last ten minutes are almost always worth more spent starting question four from scratch than spent adding a small refinement to an already-solid question three. A rough skeleton on a blank question, the method signature, the loop structure, even an incomplete body, can still earn real rubric points. Polish added to a response that already demonstrates its key points earns nothing more, because those points were already secured.</p>'),
  H.p('The concrete fix is a written time budget, decided before the section starts, not felt out as you go. Divide the section\'s roughly ninety minutes across four questions with a small buffer at the end, write the four target checkpoint times at the top of your scratch space or notes area before you read question one, and check the clock against that schedule after finishing each question rather than only when a question feels like it is dragging. If a question runs long, that is information to act on immediately, not a problem to notice for the first time when the section is almost over. The goal is never a perfect first three questions. It is four questions that each show real, credit-earning work, even if one of them is visibly rushed.'),

  H.h2(SECTIONS[3]),
  H.p('A free-response question with multiple labeled parts, most often something like part (a) and part (b), is not two independent questions loosely bundled together. It is usually one scenario built so that part (b) depends on, extends, or specifically constrains what part (a) set up, and each part earns its own separate slice of that question\'s points. The mistake here is not writing wrong code. It is writing code that correctly answers a different part of the prompt than the one currently being scored, most often because part (b) reuses a method, a variable name, or a class from part (a) and it is easy to lose track, mid-answer, of exactly which requirement is attached to which part.'),
  H.p('This shows up in a few concrete, recognizable ways. A student finishes part (a), correctly, and then in part (b) rewrites a chunk of part (a)\'s logic instead of building on it, missing whatever new requirement part (b) actually specified, like a different return type, an added parameter, or a call to a method the prompt just defined. Or a student misreads which class a part is asking them to write inside, and puts a method in the wrong class entirely, one that compiles fine on its own but was never asked for in that spot. Or, reading fast under time pressure, a student answers only the first sentence of a two-sentence part (b) prompt and never notices the second sentence added a real constraint, such as requiring the method to use a value computed in part (a) rather than recomputing it.'),
  H.box('warn', 'The fix is a habit, not a rewrite', '<p>Before writing a single line for any labeled part, read that part\'s instructions in full, twice, and underline or restate to yourself exactly what is new or different about it compared to the part before it. Then check, after finishing it, that what you wrote answers that restated requirement specifically, not just something that resembles it. This costs under a minute per part and catches the exact mistake described above before it happens rather than after the section has ended.</p>'),
  H.p('This is a reading mistake, not a knowledge gap, which is exactly why it is easy to miss while it is happening. A student capable of writing every part correctly can still lose a real slice of a question\'s points by solving the right problem in the wrong labeled box, or by solving part (a)\'s problem again inside part (b) instead of the new thing part (b) actually asked for. The <a href="/blogs/ap-csa/ap-csa-frq-scoring-point-by-point">FRQ scoring guide</a> explains how a rubric treats a flawed answer generously when the logic is right and the syntax is imperfect. That generosity has a limit: a rubric checking for a specific requirement in part (b) is checking for that requirement, and an otherwise well-written response that answers a different question entirely does not satisfy it, no matter how clean the code looks.'),

  H.h2(SECTIONS[4]),
  H.p('None of the three mistakes above require a rewrite of anything you already know. They are decisions, and decisions are checkable in a fixed order right before you submit each section, the same way the MCQ pacing guide treats a checkpoint as a habit rather than a one-time reminder.'),
  H.ul([
    '<strong>Multiple choice, before time runs out:</strong> open the question navigator and confirm every question shows a selected answer, including every one you flagged for review. A flag with nothing selected under it is an unfinished decision worth zero, not a placeholder for one.',
    '<strong>Free response, after finishing each question:</strong> check the clock against the time budget you wrote down before the section started. If a question ran long, that is the signal to move on now, not a fact to notice for the first time with ten minutes left.',
    '<strong>Free response, if time runs out mid-section:</strong> protect the question you have not started rather than polishing the one that already works. A rough skeleton on a blank question usually earns more than refinement on an already-solid one, since each question is scored on its own independent rubric.',
    '<strong>Any multi-part free response question, before writing each labeled part:</strong> read that part\'s instructions twice and restate to yourself what is new about it compared to the part before it, then confirm what you wrote actually answers that, not a recycled version of the previous part.',
  ]),
  H.p('Every item on that list is a habit you can rehearse on a practice set well before exam day, the same way the <a href="/blogs/ap-csa/ap-csa-frq-practice-laptop-closed">laptop-closed FRQ drill</a> rehearses writing syntax from memory. The <a href="/pages/ap-csa-frq-archive">free response archive</a> has real four-question sets to run this checklist against, and the <a href="/pages/ap-csa-score-calculator">score calculator</a> is worth using afterward to see how a section-wide time budget change actually moves your composite.'),

  H.h2(SECTIONS[5]),
  H.p('Both questions below are about the decision, not about code correctness. Reason through what the mistake described above would actually cost before checking the explanation.'),
  H.mcq({
    n: 1,
    stem: 'With four minutes left in the multiple choice section, a student has six questions left unanswered: three they have not read at all, and three they read, could not fully solve, but were able to eliminate two of the four answer choices on. What is the best use of the remaining time?',
    options: [
      'Spend the full four minutes trying to fully solve the three questions they already narrowed down, and leave the three unread questions blank if time runs out.',
      'Immediately pick any answer choice for all six questions right now, then use any remaining time to improve the three where two choices were already eliminated.',
      'Leave all six blank, since guessing without being certain is not a reliable strategy.',
      'Only guess on the three where two answer choices were eliminated, and leave the three unread questions blank since there is no information to guess from.',
    ],
    correct: 1,
    why: 'Since there is no penalty for a wrong answer, a blank response and a wrong response score identically at zero, which means the very first move with any time remaining should be locking in some answer, even a cold guess, for every question left, including the three that were never read. That guarantees no question ends the section at a guaranteed zero from simply running out of time. Only after every question has some answer selected does it make sense to spend remaining time improving the odds on the three where two choices are already eliminated, since a guess between two remaining options is a stronger bet than a guess among four. Option A risks leaving three questions completely blank if the clock runs out mid-attempt, throwing away free chances at points for no benefit. Option C and D both leave points on the table by treating a guess as somehow worse than a blank answer, when they are never worse and are frequently better.',
  }),
  H.mcq({
    n: 2,
    stem: 'A student is 62 minutes into the roughly 90 minute free-response section. They have written a complete, correct answer to question one, a complete, correct answer to question two, and are in the middle of question three, which is not yet finished. Question four has not been opened. Following a written time budget of about 22 minutes per question, what should this student do right now?',
    options: [
      'Keep working on question three until it is fully complete, since an unfinished answer earns fewer points than a finished one.',
      'Recognize that roughly 66 minutes should have been spent on three questions by this point, so the pace is close to on schedule, and continue working question three toward a stopping point before checking in again shortly.',
      'Abandon question three immediately and spend the rest of the section exclusively on question four, since it has zero points banked while question three has some already.',
      'Submit the section now, since two of four questions are already complete and correct.',
    ],
    correct: 1,
    why: 'A budget of about 22 minutes per question puts three questions at roughly 66 minutes if everything is on pace, and this student is at 62 minutes with question three already in progress, which is close enough to on schedule that panic or a full stop is not warranted yet. The correct move is not to abandon question three outright, since it is already partway toward real rubric points and those points are close at hand. It is also not to grind it to full completion no matter the cost, since that risks repeating the exact mistake this guide describes if it runs long. The right habit is finishing the current natural stopping point in question three, checking the clock again shortly, and being ready to move to question four the moment the budget for question three is actually used up rather than only when it feels used up. Submitting early with two of four questions untouched or unfinished leaves real points on the table for no reason, since there is no bonus for finishing before the clock runs out.',
  }),

  H.h2(SECTIONS[6]),
  H.faq([
    { q: 'Is it really true there is no penalty for guessing on the AP CSA multiple choice section?', a: 'Yes. College Board does not deduct points for an incorrect answer on the multiple choice section, and a blank answer and a wrong answer both score zero. A guess can only help or do nothing, never hurt, so no multiple choice question should ever be left without a selected answer.' },
    { q: 'How is this different from the AP CSA MCQ pacing guide already on this blog?', a: 'The pacing guide is about deciding how much time a specific question deserves once you are reading it, fast recognition versus a full trace. This mistake happens at the very end of the section regardless of pacing skill: a question gets flagged to revisit and the section simply ends before that revisit happens, leaving a real answer never selected. The fix is a submission habit, not a triage skill.' },
    { q: 'Why does running out of time on the fourth free-response question cost so much, even if the first three are correct?', a: 'Each free-response question is scored on its own independent rubric worth real points on its own, and a completely blank response earns none of them regardless of how strong the other three questions were. A section-wide time budget, checked after each question rather than only when time feels short, is what prevents a strong first three questions from silently costing the fourth one entirely.' },
    { q: 'What does answering the wrong part of a free-response question actually look like?', a: 'Most often it means part (b) reuses or extends something from part (a), and a response either repeats part (a)\'s work without addressing what part (b) newly requires, or puts a method in the wrong class or location the prompt did not ask for. It is a reading mistake, not a knowledge gap, and rereading each labeled part twice before writing catches it before it happens.' },
    { q: 'Where can I practice these exam-mechanics habits alongside the code-level material?', a: 'The <a href="/pages/ap-csa-frq-archive">free response archive</a> has full four-question sets to time a section-wide budget against, the <a href="/pages/ap-csa-qotd-hub">daily practice questions</a> build the underlying skills a fast decision depends on, and the <a href="/blogs/ap-csa/ap-csa-reference-sheet-what-it-gives-you">Java Quick Reference guide</a> covers a different exam-mechanics detail worth knowing cold before free response starts.' },
  ]),

  H.cta({
    heading: 'Practice the decisions, not just the code',
    body: 'Full four-question free response sets and daily multiple choice practice, so a written time budget and a submission checklist become routine well before they matter on exam day.',
    links: [
      { href: '/pages/ap-csa-frq-archive', text: 'FRQ archive' },
      { href: '/pages/ap-csa-qotd-hub', text: 'Daily practice', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Last reviewed October 6, 2026, against current College Board exam administration and scoring policy pages.'),
]);

module.exports = { meta, body };
