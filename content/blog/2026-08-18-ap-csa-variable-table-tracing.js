'use strict';
// Weekly course post: AP CSA. Drill track: a study-method how-to for the
// multiple choice tracing questions, not a news piece.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'The real reason students miss tracing questions',
  'How to trace code with the variable table method',
  'Worked trace 1: a for loop over an array',
  'Worked trace 2: a while loop with a boolean flag',
  'The shortcuts that come after enough practice',
  'Two practice questions in the exam format',
  'Frequently asked questions',
];

const meta = {
  title: 'How to Trace Code: The Variable Table Method AP CSA Fives Use',
  handle: 'ap-csa-variable-table-tracing-method',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'how to trace code',
  publishOn: '2026-08-21',
  seoTitle: 'How to Trace Code in AP CSA: The Variable Table Method',
  seoDescription: 'Learn how to trace code the way AP CSA students who score 5s do it: a variable table you fill in by hand, with two fully worked examples and practice.',
  summary: 'Most students who miss AP CSA tracing questions know the Java, they just lose the thread three lines into a loop. The variable table method fixes that by moving the trace out of your head and onto paper, one row at a time. Two fully worked examples included.',
  tags: ['AP CSA', 'Study Strategy', 'Exam Prep', 'Java Tracing', 'Multiple Choice'],
};

const body = H.article([
  H.dek('If you want to know how to trace code accurately under a timer, the answer is not "get better at Java." It is a habit: a small table, one column per variable, filled in by hand, so you never have to hold the whole loop in your head at once.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'August 18, 2026', updated: 'August 18, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Every year I sit next to a student who is convinced they do not understand loops, and every year the actual problem turns out to be somewhere else entirely. They understand loops fine when I ask them to explain one out loud. What they cannot do is hold four variables, a loop counter, and an array index in their head at the same time while a clock runs, and notice the exact moment one of those values changes.'),
  H.p('That is not a knowledge gap. It is a working memory problem, and working memory is not something you fix by reviewing more syntax. On the multiple choice section, you get roughly ninety seconds a question, most of that spent reading, and a trace question asks you to be a human interpreter for six or eight lines of Java without making a single arithmetic slip. Try to do that entirely in your head and you will lose the thread the same way you lose count of stairs in the dark: not because you cannot count, but because nothing is holding your place for you.'),
  H.p('The fix experienced students converge on, and the one I teach explicitly from the first week of the course, is the variable table. It is the AP CSA equivalent of showing your work in a math class. You externalize the state of the program onto paper so your brain only has to do one thing at a time: read a line, update a cell, move to the next line. Nothing is held in your head longer than it takes to write it down.'),
  H.box('key', 'What this method actually buys you', '<p>Speed comes later. The first payoff of the variable table is accuracy: a wrong prediction becomes visible the moment you write it down, instead of quietly poisoning every line that follows it. Students who skip this step do not fail because they are slow. They fail because line four used a value that was already wrong by line two, and they never noticed.</p>'),

  H.h2(SECTIONS[1]),
  H.p('The method has four steps, and none of them require anything more than a pencil and the scratch paper you are given on exam day.'),
  H.h3('Step 1: list every variable that will change'),
  H.p('Before you touch the loop, scan the code segment and write down the name of every variable that gets reassigned anywhere in the method: accumulators, counters, flags, loop indices, anything on the left side of an equals sign or inside a compound assignment like plus-equals. Variables that are declared but never reassigned do not need a column. This step takes ten seconds and it is the one students skip, which is exactly why they end up trying to track a variable they never wrote down in the first place.'),
  H.h3('Step 2: draw one column per variable'),
  H.p('Turn each name from step one into a column header, left to right in the order the variables first appear in the code. If there is a loop counter, give it its own column even if the final answer does not depend on it directly, because you will use it to know which line you are on. A short header row and a line under it is the whole setup. Do not try to make it pretty. A messy table you actually filled in beats a clean one you did in your head.'),
  H.h3('Step 3: execute one line at a time, out loud in your head'),
  H.p('Start at the first executable line and move down exactly the way the computer would, including jumping back to the top of a loop when the loop body finishes. Do not skip ahead because you think you can see where it is going. The entire value of this method disappears the moment you start guessing instead of executing, because a guess is exactly the failure mode you are trying to eliminate.'),
  H.h3('Step 4: the instant a value changes, write a new row'),
  H.p('This is the rule that makes the table work: never overwrite a cell. When a variable gets a new value, write that new value in a fresh row underneath the old one, and copy any columns that did not change straight across. The old row stays visible. If you find yourself scribbling out a number and writing a new one on top of it, you have thrown away the exact information you would need to catch your own mistake, which is the one thing pure mental tracing already cannot give you.'),
  H.box('warn', 'The mistake that undoes the whole method', '<p>Overwriting a cell instead of adding a row. The point of the table is a paper trail you can check against, and a paper trail with erasures is not a paper trail. If a cell is wrong, cross it out and write the correction next to it. Never erase.</p>'),

  H.h2(SECTIONS[2]),
  H.p('Here is a for loop over an array, the most common shape on the multiple choice section. Read the code once for structure before you trace it.'),
  H.code('int[] scores = {62, 75, 68, 91, 84};\nint max = scores[0];\nint count = 0;\nfor (int i = 1; i < scores.length; i++) {\n    if (scores[i] > max) {\n        max = scores[i];\n        count++;\n    }\n}\nSystem.out.println(max + " " + count);'),
  H.p('Three variables change here: max, count, and the loop index i. Before the loop starts, max is initialized from scores[0] and count is initialized to zero, so that is the first row. Then i takes each value from one up to the last index, and on each pass you check whether the current array element beats the running max.'),
  H.table(
    ['Line reached', 'i', 'scores[i]', 'max', 'count'],
    [
      ['before loop', '(none yet)', '(none yet)', '62', '0'],
      ['i = 1', '1', '75', '75', '1'],
      ['i = 2', '2', '68', '75 (unchanged)', '1 (unchanged)'],
      ['i = 3', '3', '91', '91', '2'],
      ['i = 4', '4', '84', '91 (unchanged)', '2 (unchanged)'],
      ['loop ends', 'i = 5, condition fails', '-', '91', '2'],
    ]
  ),
  H.p('Reading straight down the max and count columns gives the answer without any extra work: max finishes at 91 and count finishes at 2, so the program prints "91 2". Notice that two of the four passes through the loop did not change either tracked value. A student tracing this in their head tends to lose track of exactly those unchanged passes, because nothing happened and unremarkable moments are the ones memory drops first. On the table, they are still sitting right there, unchanged rows and all.'),
  H.box('tip', 'Why you still write the unchanged rows', '<p>It is tempting to skip a row when nothing changed, to save time. Do not. A row where every value repeats is proof that you actually checked the condition on that pass instead of assuming. Skipping it is how a student loses count of how many times a loop actually ran, which is the single most common source of an off by one wrong answer.</p>'),

  H.h2(SECTIONS[3]),
  H.p('Now a while loop built around a boolean flag, the second shape that reliably trips students up, mostly because the exit condition depends on two things at once instead of one.'),
  H.code('int[] nums = {14, 27, 33, 8, 19};\nint target = 8;\nint i = 0;\nboolean found = false;\nwhile (i < nums.length && !found) {\n    if (nums[i] == target) {\n        found = true;\n    }\n    i++;\n}\nSystem.out.println(i + " " + found);'),
  H.p('Two variables change on every pass that runs: i always increases by one at the bottom of the loop body, and found flips exactly once, on the pass where the target is located. Set up a column for each, plus one for the array element being compared, and step through the same way: read the condition, execute the body, write the new row.'),
  H.table(
    ['Pass', 'i (start of pass)', 'nums[i]', 'found after check', 'i (end of pass)'],
    [
      ['before loop', '-', '-', 'false', '0'],
      ['pass 1', '0', '14', 'false (14 != 8)', '1'],
      ['pass 2', '1', '27', 'false (27 != 8)', '2'],
      ['pass 3', '2', '33', 'false (33 != 8)', '3'],
      ['pass 4', '3', '8', 'true (8 == 8)', '4'],
      ['condition check', 'i = 4, found = true', '-', 'loop exits: !found is false', '-'],
    ]
  ),
  H.p('The table makes the exit condition concrete instead of abstract. The loop keeps running while i is small enough AND found is still false, and the moment found flips to true the very next condition check fails, even though i would technically still be small enough to continue. Students who trace this in their head almost always keep the loop running one pass too many, because they update found correctly but forget to re-check the compound condition before assuming another pass happens. The table forces that check to be its own visible step. The program prints "4 true".'),

  H.h2(SECTIONS[4]),
  H.p('Once you have hand-traced enough loops, you start recognizing shapes before you finish writing the table, and that recognition is real and worth having. A running total that only ever adds is a sum. A variable that increments every time a condition is true and never decreases is a counter. Two variables that trade values in three lines is a swap. Spotting these patterns is a genuine shortcut, and on exam day it is the difference between tracing a loop line by line and glancing at it and knowing the answer.'),
  H.p('The trap is treating the shortcut as a starting point instead of an ending point. Pattern recognition on a novel piece of code is just a guess wearing a confident outfit, and the exam is written specifically to include loops that look like a familiar pattern but bend it in one place: an off by one boundary, a condition checked in the wrong order, an accumulator that resets partway through. A student who reaches for the shortcut first has no way to notice the bend, because they never built the table that would have shown it to them.'),
  H.box('key', 'The right order to build the skill', '<p>Trace slowly with the full table on every practice problem for weeks, not days. The instinct for shortcuts grows out of that repetition on its own, the same way a driver eventually stops consciously thinking through mirror checks without ever having been told to skip them. Reach for the fast read only on code you have already earned the right to recognize by tracing dozens of problems like it the slow way. Our <a href="/pages/ap-csa-qotd-hub">daily practice questions</a> exist for exactly that repetition.</p>'),
  H.p('A useful test for whether you have actually earned the shortcut on a given pattern: try to explain out loud why it works, not just that it works. If you can say "this is a running sum, and I know that because every branch of the if statement either adds to the total or does nothing, and nothing ever subtracts," you have earned it. If you can only say "this looks like the sum ones," you have not, and the table is still the safer play on that problem.'),

  H.h2(SECTIONS[5]),
  H.p('Both of the following are written in the exact format the multiple choice section uses: a short code segment, four answer choices, and a question that only rewards a correct trace. Build the table before you look at the options.'),
  H.mcq({
    n: 1,
    stem: 'What is printed by the following code segment?',
    codeText: 'int[] data = {3, 6, 2, 9, 5};\nint result = 0;\nfor (int i = 0; i < data.length; i++) {\n    if (data[i] % 2 == 0) {\n        result += data[i];\n    } else {\n        result -= 1;\n    }\n}\nSystem.out.println(result);',
    options: ['5', '8', '-1', '20'],
    correct: 0,
    why: 'Set up two columns, i and result, and step through each element. data[0] is 3, which is odd, so result goes from 0 to -1. data[1] is 6, which is even, so result adds 6 and becomes 5. data[2] is 2, even, result adds 2 and becomes 7. data[3] is 9, odd, result subtracts one and becomes 6. data[4] is 5, odd, result subtracts one more and becomes 5. The loop ends with result at 5. The wrong answers come from two common slips: adding every element regardless of the branch, or forgetting that the else branch subtracts rather than doing nothing.',
  }),
  H.mcq({
    n: 2,
    stem: 'What is the value of nums after the following code segment runs?',
    codeText: 'ArrayList<Integer> nums = new ArrayList<Integer>();\nnums.add(4);\nnums.add(8);\nnums.add(15);\nnums.add(16);\nint index = 0;\nboolean removed = false;\nwhile (index < nums.size() && !removed) {\n    if (nums.get(index) > 10) {\n        nums.remove(index);\n        removed = true;\n    } else {\n        index++;\n    }\n}\nSystem.out.println(nums);',
    options: ['[4, 8, 16]', '[4, 8, 15, 16]', '[4, 8]', '[8, 15, 16]'],
    correct: 0,
    why: 'Track index, removed, and the value at nums.get(index) on each pass. At index 0, the value is 4, not greater than 10, so index becomes 1. At index 1, the value is 8, still not greater than 10, so index becomes 2. At index 2, the value is 15, which is greater than 10, so that element is removed and removed becomes true. Removing shifts every later element down by one position, leaving the list as 4, 8, 16, and the loop condition fails on the next check because removed is now true. A student who forgets that ArrayList removal shifts the remaining elements often predicts the original list minus one entry printed in the wrong place, or assumes the loop keeps scanning after the removal.',
  }),

  H.h2(SECTIONS[6]),
  H.faq([
    { q: 'How do I trace code faster on the actual exam?', a: 'Speed is a byproduct of accuracy, not a separate skill. Build the full variable table on every practice problem until the pattern is genuinely automatic, and the recognition shortcuts described above will start showing up on their own. Trying to skip straight to fast tracing without the practice underneath it tends to produce fast, confident, wrong answers.' },
    { q: 'Do I need a variable table for every multiple choice question?', a: 'No. Questions that ask about syntax, vocabulary, or a single line rarely need one. Reach for the table whenever a loop runs more than two or three times, whenever more than one variable changes, or whenever a while loop condition depends on more than one thing, since those are exactly the situations where mental tracing loses accuracy.' },
    { q: 'What is the biggest mistake students make with the variable table method?', a: 'Overwriting a cell instead of writing a new row. The entire point of the method is a visible history of every value a variable held, and erasing that history to save space removes the one thing that lets you catch your own mistake mid-trace.' },
    { q: 'Does the variable table method work for while loops as well as for loops?', a: 'Yes, and it matters more for while loops, because the exit condition is not automatically tied to a counter the way a for loop is. Give the boolean flag or condition variable its own column so you can see exactly which pass caused the loop to stop.' },
    { q: 'Where can I find more practice tracing Java code like this?', a: 'Our <a href="/pages/ap-csa-qotd-hub">daily practice questions</a> post one traced problem a day, the <a href="/pages/ap-csa-frq-archive">free response archive</a> has full solutions to past exam questions, and the <a href="/pages/ap-csa-score-calculator">score calculator</a> shows how many multiple choice questions you can afford to miss and still land the score you want.' },
  ]),

  H.cta({
    heading: 'Build the habit before the exam does it for you',
    body: 'Free daily tracing practice built around the variable table method, plus full free response solutions and a score calculator for the current four unit exam.',
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
  H.updatedNote('Last reviewed August 18, 2026.'),
]);

module.exports = { meta, body };
