'use strict';
// Weekly course post: AP CSP. Mechanics of choosing the two code segments for
// the Personalized Project Reference itself, not the AI-attribution rules
// around them (that is 2026-09-08-ap-csp-ai-policy-deep-dive.js, which this
// post links to rather than repeats) and not the exam-format change that made
// the reference matter in the first place (that is
// 2026-08-18-ap-csp-create-task-change.js). This post is about the selection
// decision: what makes a segment worth picking, what makes a pair of segments
// weak, and a worked comparison of candidate segments from a sample project.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'What the AP CSP Personalized Project Reference Actually Requires',
  'What Makes a Code Segment Worth Selecting',
  'Common Mistakes When Choosing Your Two Segments',
  'A Worked Example: Comparing Two Candidate Segments',
  'Choosing Segments That Work Together',
];

const meta = {
  title: 'Choosing the Two Code Segments for Your AP CSP Personalized Project Reference',
  handle: 'ap-csp-personalized-project-reference-segments',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp personalized project reference',
  publishOn: '2026-09-18',
  seoTitle: 'Choosing Your AP CSP Personalized Project Reference',
  seoDescription: 'How to pick the two strongest code segments for your AP CSP Personalized Project Reference, with the four selection criteria and a worked example.',
  summary: 'A practical guide to the selection decision behind the AP CSP Personalized Project Reference: what makes a list segment or a procedure segment worth choosing, the mistakes that weaken a pair of segments, and a worked comparison of candidate segments from a sample hiking tracker project.',
  tags: ['AP CSP', 'Create Performance Task', 'Personalized Project Reference', 'Practice Prompts', 'Study Strategy'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('The AP CSP Personalized Project Reference is only two screenshots, which makes the choice of which two feel small. It is not small. The written response exam is built entirely on top of whichever two segments you pick in the weeks before submission, so this guide walks through what actually makes a segment worth choosing, the mistakes that quietly weaken a pair of segments, and a full worked comparison so you can see the reasoning applied rather than only described.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 15, 2026', updated: 'September 15, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Our <a href="/blogs/ap-csp/ap-csp-create-performance-task-what-changed">guide to the Create performance task format change</a> already covers the full mechanics of the AP CSP Personalized Project Reference: what it is, why it exists, and how it feeds the proctored written response exam. This post assumes you have read that or already know the shape of the requirement, so it will not repeat the mechanics. What it covers instead is the decision that guide only touches in passing: out of everything in your program, which two segments do you actually put in front of yourself on exam day.'),
  H.p('The reference holds two segments. One shows a list or other collection type actually being used. The other shows a procedure you wrote. Both come from your own program, both get printed or otherwise captured before submission, and both are the only material you are allowed to reference while answering questions about your own code from memory in a proctored room. That last part is the whole reason this choice matters. A weak pick is not a cosmetic problem. It is a segment you will be asked to explain in detail with nothing else to lean on.'),
  H.p('One more thing this post is not about: how you attribute outside help, including AI assistance, if any touched your code along the way. That is a separate rule with its own mechanics, and our <a href="/blogs/ap-csp/ap-csp-ai-policy-create-task-nuance">guide to the AP CSP AI policy</a> covers it in full. The short version that matters here is that an AI-assisted segment is a bad choice for your reference regardless of whether it was attributed correctly, for the same reason a lot of the segments discussed below are bad choices: you cannot defend under exam pressure what you did not build and understand yourself.'),

  H.h2(SECTIONS[1]),
  H.p('Before comparing specific candidates, it helps to have a fixed set of questions to run every candidate segment through. These four hold up across almost any project, in any language or pseudocode dialect.'),
  H.ol([
    'Does it show a list or collection actually being processed, not merely declared or displayed? A line that creates a list, or a loop that prints every item in it, technically involves a list. Neither one processes it. Processing means the algorithm does something with the values as it goes: filtering, comparing, accumulating, transforming, searching.',
    'Does it demonstrate an algorithm you can explain step by step, from memory, without the code in front of you? If you cannot currently narrate what a candidate segment does line by line without looking at it, that is worth noticing now rather than discovering it in the exam room.',
    'Is it complex enough to generate a real written response, but not so long or sprawling that it cannot be explained inside the response format\'s limits? A single comparison with no branching is usually too thin. A ten-procedure pipeline that spans your whole program is usually too much to compress into one focused answer.',
    'Can you point to a specific decision behind it? Why this approach and not a simpler one, why this parameter, why this boundary case handling. A segment you can only describe in terms of what it does, and never in terms of why you built it that way, will not hold up under a follow-up question.',
  ]),
  H.box('key', 'The single fastest filter', '<p>Try to explain the segment out loud in three sentences, right now, without opening your code. If you cannot do that for a segment you are considering, that segment is not ready to be one of your two, no matter how central it is to your program. Understanding under pressure is exactly what the exam is measuring, so test for it before exam day rather than during it.</p>'),
  H.p('Notice that none of these four questions is about how impressive the segment looks. A short, clean filtering loop that you can explain completely beats a long, clever one you can only gesture at. The written response exam rewards depth of explanation, not the appearance of sophistication.'),

  H.h2(SECTIONS[2]),
  H.p('Most weak Personalized Project References fail in one of three predictable ways. Knowing the pattern in advance is the fastest way to avoid it in your own project.'),
  H.h3('Picking two segments that are too similar'),
  H.p('The reference asks for a list segment and a procedure segment because the written response exam is designed to test two different kinds of reasoning: what a collection buys you when its size is not fixed in advance, and what a procedure with parameters buys you when the same logic needs to run with different inputs. If your list segment and your procedure segment both come from the same three lines of code, or both illustrate the exact same idea from two angles, you have effectively given yourself one segment instead of two. You will have nothing new to say when the second set of questions starts, and a grader or an exam prompt design that expects two distinct demonstrations will notice the overlap.'),
  H.h3('Picking a segment that is mostly boilerplate or interface code'),
  H.p('Button handlers, screen navigation, print statements, and procedures that only display a fixed message are common in any real project, and none of them belong in your reference. They exist in your program, they are legitimate code, and they still have almost nothing to explain. There is no boundary case to walk through in a line that shows a welcome screen. There is no design decision to defend in a procedure that always returns the same string regardless of its input. Boilerplate is real work, but it is not explainable work, and the reference exists to capture the second kind.'),
  H.h3('Picking a segment that cannot be explained inside the response format\'s constraints'),
  H.p('The opposite failure is choosing a segment that is genuinely impressive but too large to compress into one focused, timed answer. If a candidate segment spans several procedures calling each other, or requires explaining three other parts of your program before the segment itself makes sense, it is going to eat your limited response time on setup before you ever get to the actual reasoning a prompt is asking for. A shorter, self-contained segment that stands on its own almost always outperforms a longer one that needs a paragraph of throat-clearing first.'),
  H.box('warn', 'A trap worth naming directly', '<p>Do not choose a segment because it is the part of your project you are proudest of. Pride and explainability are unrelated. The segment you spent the most hours perfecting is often the one with the most moving parts, which makes it the hardest to explain cleanly under a timer. Choose for clarity first.</p>'),

  H.h2(SECTIONS[3]),
  H.p('Here is the reasoning applied to an actual choice. The sample project is TrailLog, a program that lets a user log hikes and review them later. It stores each logged hike as an entry in a list, since the number of hikes a user has logged grows over the course of a season and is never fixed in advance.'),
  H.p('Two candidate segments were both considered for the list slot in the reference.'),
  H.code('Candidate 1\nFOR EACH hike IN hikeLog\n{\n  DISPLAY(hike.name)\n}\n\nCandidate 2\nqualifyingHikes <- []\nFOR EACH hike IN hikeLog\n{\n  IF (hike.elevationGain >= minGainThreshold)\n  {\n    APPEND(qualifyingHikes, hike)\n  }\n}\nRETURN (qualifyingHikes)'),
  H.p('Candidate 1 fails the first question almost immediately. It touches the list, but it does not process it. Nothing is compared, nothing is filtered, nothing is accumulated. Asked to explain what happens at a boundary case, such as an empty hikeLog, the honest answer is that nothing interesting happens, the loop simply runs zero times. There is no design decision behind it either. It is a display loop, and display loops explain themselves in one sentence, which is exactly why one sentence is all an exam question about it could ever get back.'),
  H.p('Candidate 2 passes all four questions. It processes the list by filtering it against a condition, which is a real algorithmic step with a real boundary case worth discussing: what happens when minGainThreshold is set higher than every hike in the log, or when hikeLog is empty to begin with. It is explainable in a few sentences without needing the rest of the program for context. And there is an actual decision to defend: why build a new filtered list rather than just checking the condition every time the hikes are displayed. A reasonable answer exists, something like keeping the filtering logic in one place so every part of the program that needs qualifying hikes gets the same list without recomputing the condition. That is a sentence a written response prompt can be built around. Candidate 2 is the stronger pick, clearly enough that this one is not close.'),
  H.p('The same evaluation applies to the procedure slot. Two candidates were considered there as well.'),
  H.code('Candidate A\nPROCEDURE paceLabel(distance, minutes)\n{\n  pace <- minutes / distance\n  IF (pace < 12)\n  {\n    RETURN ("Brisk")\n  }\n  RETURN ("Easy")\n}\n\nCandidate B\nPROCEDURE showTrailLogTitle()\n{\n  RETURN ("TrailLog")\n}'),
  H.p('Candidate B returns the same value every time, regardless of any input, because it takes no input at all. There is nothing to trace, no boundary case, and no parameter whose effect could be demonstrated with two different calls. Candidate A takes two parameters, produces different results depending on their values, and has a genuine boundary worth discussing, what happens right at a pace of exactly 12. Candidate A is the stronger pick for the same underlying reason candidate 2 won the list comparison: it is the one where a specific input produces a specific, explainable, defensible result.'),

  H.h2(SECTIONS[4]),
  H.p('The last step is evaluating the pair together, not just each segment on its own. TrailLog\'s final choice, the filtering loop and the paceLabel procedure, works as a pair because the two segments demonstrate genuinely different skills. One shows what a list buys you when the number of items is not fixed in advance. The other shows what a parameter buys you when the same logic needs to behave differently depending on what gets passed in. A student could answer questions about either segment without repeating themselves, which is exactly what the two-segment structure is designed to test.'),
  H.p('Run that same check on your own two finalists before you submit. Read back what you would say about each one, and ask whether the second answer is telling the grader or the exam prompt something the first answer did not already cover. If the honest answer is no, one of your two segments is doing double duty for a reference that is supposed to hold two distinct demonstrations, and it is worth going back to your program to find a stronger second candidate while there is still time to look.'),

  H.h2('Practice: Which Segment Is the Stronger Pick?'),
  H.p('These two questions describe a pair of candidate segments the way you might describe your own. Decide which one is the stronger choice for the Personalized Project Reference and check your reasoning against the explanation.'),
  H.mcq({
    n: 1,
    stem: 'A student is choosing a procedure segment and is deciding between two candidates from the same program. Segment A takes a single parameter, a list of quiz scores, and always returns the string "Report Ready" without using the parameter\'s contents in any way. Segment B takes two parameters, a score and a passing threshold, and returns "Pass" or "Retry" depending on whether the score meets the threshold. Which segment is the stronger choice, and why?',
    options: [
      'Segment A, because it accepts a list, which satisfies the collection requirement on its own',
      'Segment B, because its output actually depends on the parameter values passed in, giving the student two different calls with two different, explainable results',
      'Either one, since both are procedures and the reference only requires that the segment be a procedure',
      'Segment A, because a shorter procedure is always easier to explain under time pressure',
    ],
    correct: 1,
    why: 'Segment A accepts a parameter but never uses its contents, so nothing about its behavior depends on what gets passed in. There is no boundary case, no branching, and no way to demonstrate two calls producing two different results, since every call produces the same fixed string. Segment B branches on a real comparison between its two parameters, which means a student can walk through two concrete calls, such as one where the score clears the threshold and one where it does not, and explain exactly why the outputs differ. Option A misreads what the collection requirement is for, since this is the procedure slot, not the list slot, and simply accepting a list as a parameter does not make a procedure\'s own logic worth explaining. Option D is not a real standard; brevity only helps when the segment still has something to explain, and Segment A does not.',
  }),
  H.mcq({
    n: 2,
    stem: 'A student is choosing a list segment and is deciding between two candidates. Segment A loops through a list of logged workouts and prints each workout\'s date to the screen. Segment B loops through the same list, keeps a running total of only the workouts longer than a set duration, and returns both that total and a count of how many workouts qualified. Which segment is the stronger choice, and why?',
    options: [
      'Segment A, because printing every item is the clearest possible demonstration that a list is being used',
      'Segment B, because it filters and accumulates based on a condition, which is real processing with a boundary case worth explaining, while Segment A only displays what is already there',
      'Segment A, because a simpler loop is less likely to contain a bug that could come up in questioning',
      'Neither, since both segments loop over the same list and are therefore too similar to distinguish',
    ],
    correct: 1,
    why: 'Segment A touches every item in the list, but touching is not the same as processing. There is no comparison, no accumulation, and no boundary case worth discussing beyond the trivial case of an empty list producing no output. Segment B evaluates a condition on each item, accumulates a running total only when that condition holds, and tracks a count alongside it, which gives a student real material: what happens with an empty list, what happens when no workouts qualify, and why accumulating a running total was the chosen approach instead of building a separate list of qualifying workouts. Option C invents a standard the reference does not use; avoiding bugs is not the same as being explainable, and a correct but shallow segment is still a weak pick. Option D wrongly assumes similarity is about which list is being looped over rather than what the loop actually does with it, and these two loops do very different things with the same list.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Do the two segments have to come from the same part of my program?', a: 'No, and they usually should not. Picking segments from different parts of your program makes it far less likely they end up demonstrating the same idea twice, which is one of the most common ways a reference ends up weaker than it needed to be.' },
    { q: 'Can I change my two segments after I submit the reference?', a: 'Check the current submission window and process for your exam administration before assuming you can revise a choice late. The safer approach is to finalize your two segments with enough time left to genuinely rehearse explaining them, rather than treating the choice as something to fix later.' },
    { q: 'What if my strongest algorithm and my strongest list use are actually the same segment?', a: 'That happens, and when it does, keep that segment for whichever slot it fits better and go find a second, different segment for the other slot rather than trying to split one segment across both. A slightly less impressive but genuinely distinct second segment beats an artificial split of your best one.' },
    { q: 'Does a longer, more complex segment score better than a short one?', a: 'No. Length and complexity are not what is being evaluated. A short segment you can trace completely and explain the reasoning behind will outperform a long one you can only describe in general terms, since the written response exam is testing whether you can explain the segment, not how much the segment does.' },
    { q: 'Should I pick a segment that involves AI-assisted code if I attributed it correctly?', a: 'No. Attribution satisfies the plagiarism policy, but it does not make an AI-assisted segment a good choice for your reference, since you still need to defend that segment from memory under exam conditions. Our guide to the AP CSP AI policy covers the attribution rule itself; the selection guidance here applies regardless of where a segment came from.' },
  ]),

  H.cta({
    heading: 'Build a reference you can defend',
    body: 'Read the full Create task format change guide for how the reference feeds the exam, then browse project ideas if you are still shaping the program these segments will come from.',
    links: [
      { href: '/blogs/ap-csp/ap-csp-create-performance-task-what-changed', text: 'Create task format change guide' },
      { href: '/blogs/ap-csp/ap-csp-create-task-project-ideas', text: 'Create task project ideas', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Written to the AP CSP Create performance task Personalized Project Reference requirement as revised by College Board for the current exam cycle. Last reviewed September 15, 2026.'),
]);

module.exports = { meta, body };
