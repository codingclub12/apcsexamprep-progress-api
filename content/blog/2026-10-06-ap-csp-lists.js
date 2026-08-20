'use strict';
// Weekly course post: AP CSP. Evergreen concept guide. Goes deep specifically
// on list operations and 1-indexing, the single most exam-costly detail in
// the AP CSP pseudocode list section. Companion to the full syntax guide,
// which covers lists as one topic among many; this post is the deep dive.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'Why AP CSP Lists Trip Up Even Confident Programmers',
  'Creating a List and the Four Core List Operations',
  'Tracing INSERT and REMOVE: Every Later Index Shifts by One',
  'The Loop Bounds Trap: Writing a 1-Indexed Loop Without Old Habits',
];

const meta = {
  title: 'AP CSP Lists: The Index Shift That Breaks Student Code',
  handle: 'ap-csp-list-operations-index-shift',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp lists',
  publishOn: '2026-10-06',
  seoTitle: 'AP CSP Lists: The 1-Indexed Trap, Fully Traced',
  seoDescription: 'AP CSP lists start at index 1, not 0. A full trace of APPEND, INSERT, and REMOVE shows exactly how every later index shifts, plus the loop bounds trap.',
  summary: 'AP CSP lists look exactly like the arrays or lists a student already knows from Python or Java, right up until the first index comes back one number off. This guide goes deep on list operations specifically: creating a list, APPEND, INSERT, REMOVE, and indexing, with a full step by step trace of how INSERT and REMOVE shift every later index by one, and the loop bounds trap that catches students who write 1-indexed loops out of 0-indexed habit.',
  tags: ['AP CSP', 'Lists', 'Pseudocode', 'Exam Reference Sheet', 'Study Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('AP CSP lists look like the arrays or lists a student has already used in Python or Java, right up until the first index comes back one number off. This guide traces exactly how APPEND, INSERT, and REMOVE shift every index around them, and where the 1-indexed rule costs real points on the exam.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 6, 2026', updated: 'October 6, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('Every AP CSP student who has typed code before walks into this topic with the same instinct: the first item in a list sits at index 0. That instinct is correct in Python, Java, JavaScript, and nearly every real programming language a student is likely to have touched before this course. It is flatly wrong for AP CSP lists specifically, on the College Board pseudocode used across the entire multiple choice section and the Create performance task written responses. AP CSP lists are 1-indexed: the first element sits at index 1, not index 0. That single difference, small as it looks on the page, is the most reliably exam-costly detail in the whole list section of the reference sheet, and it is exactly what this guide traces from every angle.'),

  H.h2(SECTIONS[0]),
  H.p('The reason this specific rule causes so much trouble is not that it is complicated. It is one sentence: the first element of a list is at index 1. The trouble is that almost every student arrives already fluent in a habit that says the opposite, and that habit was built through hours of real practice in a real language, so it does not just fade because a reference sheet says otherwise. A rule you have to consciously override every single time you touch it is a rule that fails under time pressure, and the AP CSP multiple choice section is nothing but time pressure.'),
  H.p('This is different from most of the other pseudocode quirks covered in a general syntax overview. A different assignment symbol or a REPEAT UNTIL loop that reads backwards from a while loop are unfamiliar, but they do not fight against an existing habit the same way indexing does. A student who has never seen the left arrow simply learns it as new information. A student who has written <code>list[0]</code> a hundred times has to actively suppress that reflex every time a list question shows up, which is a much harder kind of correctness to hold onto for two hours.'),
  H.box('key', 'The one sentence to memorize', '<p>In AP CSP pseudocode, <code>list[1]</code> is the first element, not the second. There is no index 0 anywhere in the list section of the reference sheet. If a trace or a written response ever produces or assumes an index of 0, something has already gone wrong.</p>'),
  H.p('It helps to understand why College Board chose this at all, since it can otherwise feel like an arbitrary trap. AP CSP pseudocode is not trying to mirror any specific real language, and 1-indexing is arguably closer to how people naturally describe position in plain English: the first player, the second song, the third row. The pseudocode leans into that plain-language reading rather than the 0-based convention that real languages use for reasons rooted in how memory addressing works under the hood, reasons a conceptual, language-agnostic exam has no reason to import. Knowing the why does not make the habit automatic, but it does make the rule feel less like an arbitrary trick and more like a deliberate, defensible design choice worth respecting on every list question that follows.'),

  H.h2(SECTIONS[1]),
  H.p('A list is created with the assignment arrow, the same operator used for every other variable, holding a comma-separated sequence of values inside square brackets.'),
  H.code('fruits ← ["apple", "banana", "cherry", "date"]'),
  H.p('Once created, that list has exactly four elements, and under the 1-indexed rule, <code>fruits[1]</code> is "apple", <code>fruits[2]</code> is "banana", <code>fruits[3]</code> is "cherry", and <code>fruits[4]</code> is "date". There is no <code>fruits[0]</code>. Asking for it is asking for an element the list does not define, the same way asking for <code>fruits[5]</code> would be, and a trace that lands on either one has already gone off the rails.'),
  H.p('Beyond direct indexing, the reference sheet defines a small, fixed set of list operations, and every one of them takes the list itself as its first argument:'),
  H.ul([
    '<code>APPEND(list, value)</code> adds value to the end of list, growing its length by one and leaving every existing index untouched',
    '<code>INSERT(list, i, value)</code> inserts value at index i, pushing the element that used to sit at i, and every element after it, one position later',
    '<code>REMOVE(list, i)</code> deletes the element at index i, and pulls every later element one position earlier to close the gap',
    '<code>LENGTH(list)</code> returns how many elements list currently holds, which changes after every APPEND, INSERT, or REMOVE',
  ]),
  H.p('Notice the asymmetry buried in that list. APPEND is the safe operation: it only ever adds at the very end, so nothing that already existed in the list ever moves. INSERT and REMOVE are the ones that move furniture. Anything that already had a position, before the operation ran, and sat at or after the affected index, ends up at a different index once the operation finishes. That shift is the entire subject of the next section, and it is the single fact that most list tracing questions on the exam are actually testing, even when the question on the page looks like it is asking something else.'),

  H.h2(SECTIONS[2]),
  H.p('This is where a list trace goes wrong for most students, and it goes wrong quietly. Nothing about an INSERT or a REMOVE looks dangerous on the page. It is one line of pseudocode. The danger is entirely in what that one line does to every index that comes after it, and the only reliable way to catch that is to write the list out again, fully indexed, after every single operation, the same way a variable table tracks a value after every assignment.'),
  H.p('Start with the same list from the section above and run it through a sequence of operations, one at a time.'),
  H.table(
    ['Step', 'Operation performed', 'List contents after the operation, shown as index:value'],
    [
      ['Start', 'fruits ← ["apple", "banana", "cherry", "date"]', '1:apple, 2:banana, 3:cherry, 4:date'],
      ['1', 'INSERT(fruits, 2, "kiwi")', '1:apple, 2:kiwi, 3:banana, 4:cherry, 5:date'],
      ['2', 'REMOVE(fruits, 1)', '1:kiwi, 2:banana, 3:cherry, 4:date'],
      ['3', 'APPEND(fruits, "fig")', '1:kiwi, 2:banana, 3:cherry, 4:date, 5:fig'],
      ['4', 'REMOVE(fruits, 3)', '1:kiwi, 2:banana, 3:date, 4:fig'],
    ]
  ),
  H.p('Walk through what actually happened at each step, because the shift is the whole point. Step 1 inserts "kiwi" at index 2. Before that operation, "banana" sat at index 2, "cherry" at index 3, and "date" at index 4. INSERT does not overwrite whatever was at index 2, it makes room for the new value by pushing "banana", "cherry", and "date" each one position later, to indexes 3, 4, and 5. Every element from the insertion point onward shifts up by exactly one, and the list grows by one element overall.'),
  H.p('Step 2 removes whatever sits at index 1, which by that point is "apple". REMOVE runs the shift in the opposite direction: everything that came after the removed element slides back one position to close the gap. "kiwi" moves from index 2 down to index 1, "banana" from 3 down to 2, and so on, and the list shrinks by one element. Step 3 is the quiet one: APPEND adds "fig" at the new final index without touching a single existing index, which is exactly why APPEND is the operation students trust correctly and INSERT and REMOVE are the ones that need a table.'),
  H.p('Step 4 removes whatever sits at index 3 at that point in the trace, which by then is "cherry", not "banana". This is the detail a mental trace loses most often: index 3 does not always refer to the same element across the whole sequence, because earlier operations already moved things around. The only value in that list that never changed its index across all four operations is "kiwi", and it only stayed at index 1 because the operation that removed a lower index happened to land right at the front. Everything else moved at least once. That is the entire lesson of this section: an index is not a name attached to a value, it is a position in the list as it exists at that specific moment, and INSERT or REMOVE anywhere before that position changes it.'),
  H.box('warn', 'The mistake this table prevents', '<p>Students who skip writing out the list after each operation tend to track a value by "where it was originally" rather than "where it is now." That works fine until the first INSERT or REMOVE happens before the element they care about, at which point their mental index quietly goes stale and every answer built on it is wrong, even though the reasoning felt careful the whole way through. Write the list out fully indexed after every operation. It costs seconds and it is the only thing that actually catches this.</p>'),

  H.h2(SECTIONS[3]),
  H.p('The index shift above is the trap inside a single line of pseudocode. This one is the trap inside a loop, and it is arguably more common on the exam because so many list questions ask a student to write or trace a loop that visits every element in order.'),
  H.p('The correct pattern for visiting every element of a list called <code>numbers</code>, first to last, uses an index variable that starts at 1 and a loop condition that stops once the index runs past the last valid index, which is <code>LENGTH(numbers)</code>.'),
  H.code('i ← 1\nREPEAT UNTIL (i > LENGTH(numbers))\n{\n  DISPLAY (numbers[i])\n  i ← i + 1\n}'),
  H.p('Trace that by hand against a four-element list and it visits index 1, then 2, then 3, then 4, then checks the condition once more with i equal to 5, which is greater than LENGTH(numbers), so the loop stops having displayed every element exactly once. Two numbers make this work together: the starting index has to be 1, because that is where the first element actually lives, and the stopping condition has to be <code>i > LENGTH(numbers)</code>, because the last valid index is LENGTH(numbers) itself, not one less than it.'),
  H.p('Now look at what a 0-indexed habit does to that same loop. A student who has written this pattern a hundred times in Python reaches for <code>i ← 0</code> out of pure muscle memory, without pausing to reconsider whether the habit applies here.'),
  H.code('i ← 0\nREPEAT UNTIL (i > LENGTH(numbers))\n{\n  DISPLAY (numbers[i])\n  i ← i + 1\n}'),
  H.p('This version does not just shift the output over politely, it breaks in a way that has no clean real-language equivalent to fall back on. The very first pass through the loop evaluates <code>numbers[0]</code>, an index that AP CSP lists simply do not define, since indexing starts at 1. There is no quiet "off by one" element sitting there the way there might be in a language with defined 0-indexing; it is an access the reference sheet has no answer for. Everything after that first pass is also shifted, since the loop still runs while i is 1 through LENGTH(numbers), meaning it executes one extra time compared to the correct version and never actually reaches the true last index, LENGTH(numbers), as a display of the final element the way the correct trace does. A single misplaced starting value corrupts every iteration that follows it, not just the first one.'),
  H.p('A second, subtler version of the same trap changes the stopping condition instead of the starting index, and it is worth knowing on its own because it does not look like a 0-indexing mistake at all on the surface.'),
  H.code('i ← 1\nREPEAT UNTIL (i = LENGTH(numbers))\n{\n  DISPLAY (numbers[i])\n  i ← i + 1\n}'),
  H.p('This starts correctly at index 1, so it can look right at a glance. But <code>REPEAT UNTIL (i = LENGTH(numbers))</code> stops the instant i reaches LENGTH(numbers), before that final iteration ever runs, which means the last element in the list, the one actually stored at index LENGTH(numbers), never gets displayed. This is not a 0-indexing habit bleeding in, it is a strict-equality stopping condition standing in for what should be a greater-than comparison, and it produces a trace that is off by exactly one element at the far end instead of the near end. The fix is the same discipline either way: write out the loop bounds explicitly, confirm the starting index is 1, and confirm the stopping condition is <code>i > LENGTH(list)</code> rather than an equality check, before trusting the trace.'),
  H.box('tip', 'Check both ends of the loop, every time', '<p>A correct 1-indexed full traversal always starts the index at 1 and stops once the index exceeds LENGTH(list), never once it merely equals it. Checking only the starting value catches the 0-indexing habit but misses the equality trap, and checking only the stopping condition misses the reverse. Confirm both ends before you trust a loop bounds trace, especially under exam time pressure when the habitual version of a loop is the one your hand wants to write first.</p>'),
  H.p('For the rest of the AP CSP pseudocode syntax beyond lists, including the assignment arrow, both loop forms, and the comparison operators referenced above, the full <a href="/blogs/ap-csp/ap-csp-pseudocode-complete-syntax-guide">pseudocode syntax guide</a> covers the whole reference sheet in one sitting.'),

  H.h2('Practice Two List Questions'),
  H.p('Trace each of these by hand, writing out the list fully indexed after every operation, before checking the answer.'),
  H.mcq({
    n: 1,
    stem: 'A program starts with the list colors ← ["red", "green", "blue"] and then runs the following three operations in order: INSERT(colors, 2, "yellow"), REMOVE(colors, 1), APPEND(colors, "purple"). After all three operations finish, what is colors[3]?',
    options: ['"yellow"', '"green"', '"blue"', '"purple"'],
    correct: 2,
    why: 'Trace it one operation at a time. The list starts as 1:red, 2:green, 3:blue. INSERT(colors, 2, "yellow") pushes green and blue one position later, giving 1:red, 2:yellow, 3:green, 4:blue. REMOVE(colors, 1) deletes red and pulls everything else one position earlier, giving 1:yellow, 2:green, 3:blue. APPEND(colors, "purple") adds purple at the new final index without touching anything else, giving 1:yellow, 2:green, 3:blue, 4:purple. At that final state, colors[3] is "blue". A student who tracks colors by their original position instead of retracing the list after each step would likely land on "green," since green started at index 2, which is exactly the mistake this question is built to catch.',
  }),
  H.mcq({
    n: 2,
    stem: 'A student wants to write a REPEAT UNTIL loop that displays every element of a list called scores, from first to last, exactly once. Which initialization and loop condition correctly does this, given that AP CSP lists are 1-indexed?',
    codeText: 'i ← ___\nREPEAT UNTIL (___)\n{\n  DISPLAY (scores[i])\n  i ← i + 1\n}',
    options: [
      'i ← 0, and the condition is i = LENGTH(scores)',
      'i ← 1, and the condition is i > LENGTH(scores)',
      'i ← 1, and the condition is i = LENGTH(scores)',
      'i ← 0, and the condition is i > LENGTH(scores)',
    ],
    correct: 1,
    why: 'The correct pattern starts the index at 1, since that is where the first element of an AP CSP list actually lives, and stops once the index exceeds LENGTH(scores), the last valid index, using a greater-than comparison rather than equality. Starting at 0 attempts to access scores[0] on the very first pass, an index the list does not define, and then runs the loop one extra time on top of that. Stopping the moment i equals LENGTH(scores), even when starting correctly at 1, exits the loop one iteration too early and never displays the final element, the one actually stored at index LENGTH(scores). Only starting at 1 and stopping once i exceeds LENGTH(scores) visits every element exactly once, first to last, with no element skipped and no invalid index touched.',
  }),

  H.h2('Frequently Asked Questions'),
  H.faq([
    { q: 'Are AP CSP lists really 1-indexed with no exceptions?', a: 'Yes. Every list operation defined on the AP CSP Exam Reference Sheet, including direct indexing, APPEND, INSERT, and REMOVE, treats the first element as index 1. There is no index 0 in the list section of the reference sheet, and a trace that produces or assumes one has gone wrong somewhere earlier.' },
    { q: 'Does INSERT overwrite whatever was already at that index?', a: 'No. INSERT(list, i, value) makes room for the new value by shifting the element that was at index i, along with every element after it, one position later. Nothing already in the list is overwritten or lost, the list simply grows by one element and everything from the insertion point onward gets a new index.' },
    { q: 'Why does REMOVE change the index of elements that were not removed?', a: 'Because REMOVE closes the gap left behind. Once an element at index i is deleted, every element that came after it slides one position earlier to keep the list contiguous with no empty slot, which means their indexes all decrease by one even though those elements themselves never changed.' },
    { q: 'Is the loop bounds trap only a problem for beginners who are new to loops?', a: 'No, if anything it catches strong programmers more often, because the wrong pattern, starting an index at 0, is deeply automatic for anyone fluent in a real 0-indexed language. The mistake is not a lack of loop skill, it is a correct habit from the wrong context firing under time pressure on an exam that uses a different convention.' },
    { q: 'How should I check my own loop bounds during the exam?', a: 'Confirm two things explicitly rather than trusting the shape of the loop: that the starting index is 1, not 0, and that the stopping condition is a greater-than comparison against LENGTH(list) rather than an equals check. Checking only one of those two catches half the common mistakes and misses the other half.' },
  ]),

  H.cta({
    heading: 'Turn this into a full trace of every pseudocode construct',
    body: 'Lists are one topic on the reference sheet. Work through the full syntax, and see how these traces connect to the Create performance task written responses.',
    links: [
      { href: '/blogs/ap-csp/ap-csp-pseudocode-complete-syntax-guide', text: 'Full pseudocode syntax guide' },
      { href: '/pages/ap-csp-written-response-guide', text: 'Written response guide', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reflects the list operations defined on the current AP CSP Exam Reference Sheet published by College Board. Last reviewed October 6, 2026.'),
]);

module.exports = { meta, body };
