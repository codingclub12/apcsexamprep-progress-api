'use strict';
// Evergreen concept post: AP CSA binary search and the two traced sorts
// (Unit 4, Data Collections). Students can usually get binary search working
// from memory, but the exam checks something narrower and more mechanical:
// can you trace low, high, and mid on paper, step by step, until the search
// finds its target or gives up. Selection sort and insertion sort are tested
// the same way, as a trace of the array's state after each pass, not as code
// a student has to write from scratch. This guide teaches both skills as
// traces, with the two classic traps the exam leans on: binary search run on
// an array that was never sorted, and an off-by-one in the low/high/mid
// bounds. No news peg, no stats needed.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'AP CSA searching sorting: why binary search needs a sorted array first',
  'Tracing binary search: low, high, and mid until the target is found',
  'When binary search fails: tracing a search that never finds its target',
  'Off-by-one errors: the bounds mistakes that break a correct-looking search',
  'Selection sort and insertion sort: the two sorts you must trace, not write',
  'Tracing selection sort pass by pass on a five-element array',
  'Tracing insertion sort pass by pass on a five-element array',
];

const meta = {
  title: 'AP CSA Searching Sorting: Binary Search and the Sorts You Must Trace',
  handle: 'ap-csa-binary-search-and-sorts-to-trace',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'ap csa searching sorting',
  publishOn: '2026-10-20',
  seoTitle: 'AP CSA Searching Sorting: Binary Search Guide',
  seoDescription: 'Trace AP CSA searching sorting the way the exam asks: a full binary search walkthrough plus selection and insertion sort pass by pass.',
  summary: 'AP CSA searching sorting questions reward tracing over writing code. This guide walks binary search step by step through low, high, and mid, covers the unsorted-array trap and off-by-one bounds errors, then traces selection sort and insertion sort pass by pass on a concrete array the way the exam actually asks for it.',
  tags: ['AP CSA', 'Unit 4', 'Binary Search', 'Sorting', 'Study Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('AP CSA searching sorting questions rarely ask you to write an algorithm from a blank method signature. Far more often they hand you working code or a partially filled array and ask what happens next: what does binary search return, what does the array look like after three passes of a sort. Tracing is the tested skill, and it is learnable the same way any mechanical process is learnable, by walking it slowly on paper until it stops feeling like guessing.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 20, 2026', updated: 'October 20, 2026', readingMinutes: 13,
  }),
  H.toc(SECTIONS),

  H.p('Binary search, selection sort, and insertion sort all live in Unit 4, Data Collections, and all three show up on the exam in the same basic shape: here is an array, here is some code, tell us what it does or what state it reaches. That shape is good news for how you should study. You do not need to memorize three algorithms so completely that you can reproduce them from nothing under time pressure. You need to be able to trace each one by hand, correctly, on an array small enough to fit on scratch paper, because that is a skill you can build with repetition in a way that raw memorization never quite sticks.'),
  H.p('This guide treats all three as traces from the start. Binary search gets a full worked walkthrough of <code>low</code>, <code>high</code>, and <code>mid</code> across every step, both for a search that finds its target and one that does not. Selection sort and insertion sort each get a pass by pass table showing exactly what the array looks like after every pass, which is the actual form these questions take on the exam. Two classic traps get their own sections: running binary search on an array that was never sorted, and the off-by-one mistakes in the low, high, and mid bounds that make a search wrong even when the array genuinely is sorted.'),

  H.h2(SECTIONS[0]),
  H.p('Binary search has exactly one precondition, and it is not optional: the array has to already be sorted before the search starts. The whole algorithm works by repeatedly cutting the range it is searching in half, throwing away the half that cannot contain the target based on a single comparison at the midpoint. That shortcut only makes sense if everything on one side of the midpoint is guaranteed to be less than or equal to it, and everything on the other side is guaranteed to be greater than or equal to it. An unsorted array offers no such guarantee, and a comparison that assumes one anyway can throw away the very half the target is sitting in.'),
  H.p('This is different from most bugs in AP CSA, which tend to crash loudly with a thrown exception or an obviously wrong answer. Binary search on an unsorted array usually does neither. It runs to completion, prints a value with total confidence, and that value is wrong, or right by accident, depending on where the target happened to land relative to the midpoints the search chose to check. There is no error message warning that the precondition was violated, because Java has no way to know the array is unsorted just by looking at it. The only defense is checking, every time you see a binary search question, that the array it operates on is actually sorted before you trust a single step of the trace.'),
  H.box('warn', 'The trap: binary search on an unsorted array', '<p>If an AP CSA question shows binary search running on an array that is not sorted, do not trace the algorithm as if the result will be meaningful. The comparisons still execute and the loop still terminates, but the halving logic no longer guarantees the target is on the side being kept. Questions that set this trap are usually testing whether you notice the array was never sorted in the first place, not whether you can trace the loop correctly. Check the precondition before you check anything else.</p>'),
  H.p('The rest of this guide assumes that precondition holds, the same way the exam does whenever it presents binary search on a sorted array without saying so directly. The array is written out once, in order, and every trace below leans on that ordering being real.'),

  H.h2(SECTIONS[1]),
  H.p('Here is a standard iterative binary search, using the same <a href="/blogs/ap-csa/ap-csa-for-while-loops-which-one">while loop shape</a> the AP Java Quick Reference uses for searching algorithms: a loop that keeps narrowing the range between <code>low</code> and <code>high</code> until either the target is found or the range collapses to nothing.'),
  H.code('int low = 0;\nint high = nums.length - 1;\nint result = -1;\nwhile (low <= high) {\n    int mid = (low + high) / 2;\n    if (nums[mid] == target) {\n        result = mid;\n        low = high + 1;   // stop the loop, target found\n    } else if (nums[mid] < target) {\n        low = mid + 1;     // target is to the right, discard the left half\n    } else {\n        high = mid - 1;    // target is to the left, discard the right half\n    }\n}'),
  H.p('Trace this exactly the way the loop executes it, one full iteration at a time, on the sorted array <code>{3, 8, 15, 22, 29, 41, 56, 63, 70}</code> with <code>target = 56</code>. Each row below is one pass through the loop body: compute <code>mid</code> from the current <code>low</code> and <code>high</code>, compare <code>nums[mid]</code> to the target, then update the bounds based on that comparison.'),
  H.table(
    ['Step', 'low', 'high', 'mid', 'nums[mid]', 'Compare to target 56', 'What updates'],
    [
      ['1', '0', '8', '4', '29', '29 is less than 56, target is to the right', 'low becomes mid + 1, so low = 5'],
      ['2', '5', '8', '6', '56', '56 equals 56, target found', 'result = 6, low is set past high to end the loop'],
    ]
  ),
  H.p('Two passes is all it takes on a nine-element array, which is the entire point of the algorithm: <a href="/blogs/ap-csa/ap-csa-array-vs-arraylist">an array</a> of a thousand sorted elements needs at most ten comparisons the same way, because each step throws away half of whatever is left. Notice what each row actually depends on. The second row only makes sense because the first row moved <code>low</code> to 5, which is what let <code>mid</code> land on index 6 next. A trace where you compute every <code>mid</code> from the original <code>low</code> and <code>high</code> instead of the updated ones is not tracing binary search, it is tracing something else that happens to share its first row.'),

  H.h2(SECTIONS[2]),
  H.p('A target that is not in the array is at least as common on the exam as one that is, and it is worth tracing all the way through so the loop\'s exit condition stops feeling mysterious. Use the same sorted array, <code>{3, 8, 15, 22, 29, 41, 56, 63, 70}</code>, searching this time for <code>target = 50</code>, which does not appear anywhere in it.'),
  H.table(
    ['Step', 'low', 'high', 'mid', 'nums[mid]', 'Compare to target 50', 'What updates'],
    [
      ['1', '0', '8', '4', '29', '29 is less than 50, target is to the right', 'low becomes mid + 1, so low = 5'],
      ['2', '5', '8', '6', '56', '56 is greater than 50, target is to the left', 'high becomes mid - 1, so high = 5'],
      ['3', '5', '5', '5', '41', '41 is less than 50, target is to the right', 'low becomes mid + 1, so low = 6'],
      ['4', '6', '5', 'not computed', 'not compared', 'low (6) is greater than high (5)', 'loop condition low <= high is false, loop ends'],
    ]
  ),
  H.p('The fourth row is the one students skip past too fast. Nothing gets compared on that step, because the loop condition is checked before the body runs, and by the time <code>low</code> is 6 and <code>high</code> is 5, that condition is already false. <code>result</code> was never assigned anything other than its initial value of -1 anywhere in the trace, so the search reports -1, meaning not found. That -1 is not a leftover or a placeholder. It is the actual, correct answer, and recognizing that a search can legitimately end this way is as much a part of the tested skill as tracing a search that succeeds.'),

  H.h2(SECTIONS[3]),
  H.p('Binary search on a genuinely sorted array can still be traced wrong, and the exam leans on this constantly. The three bounds involved, <code>low</code>, <code>high</code>, and <code>mid</code>, all move by exactly one index in specific directions, and swapping any of those directions produces a trace that looks reasonable right up until it gives the wrong answer or never terminates.'),
  H.box('warn', 'Where the off-by-one mistakes hide', '<p>Watch four spots specifically. Using <code>low &lt; high</code> instead of <code>low &lt;= high</code> as the loop condition skips the exact case where the target sits at the last remaining index. Writing <code>low = mid</code> instead of <code>low = mid + 1</code> after a comparison that should move the lower bound up leaves <code>mid</code> back in play on the next pass, which can loop forever instead of narrowing. The same failure happens in reverse with <code>high = mid</code> instead of <code>high = mid - 1</code>. And computing <code>mid</code> from the original array bounds instead of the current <code>low</code> and <code>high</code> ignores everything the previous steps already ruled out.</p>'),
  H.p('The most useful habit against all four of these is the one used in both trace tables above: write <code>low</code>, <code>high</code>, and <code>mid</code> as actual columns and fill in a fresh row for every single pass, rather than trying to track the bounds in your head. A trace that skips writing down an intermediate value is exactly the trace where an off-by-one error hides, because the mistake usually shows up as a bound that is one index short of where it should have landed, and that is invisible unless the number is actually written down next to the step that produced it.'),

  H.h2(SECTIONS[4]),
  H.p('Selection sort and insertion sort are the two sorting algorithms tested on the AP CSA exam, and both are tested the same way binary search is: by tracing what a given piece of code does to a specific array, not by writing the algorithm from an empty method body. You are expected to read selection sort or insertion sort code, or to know the standard shape of each well enough to recognize it, and then say exactly what the array looks like after a stated number of passes. You are not expected to produce either algorithm from scratch on a free response question.'),
  H.p('That distinction changes how you should actually study these two. Instead of drilling the code until you can type it from memory, drill the trace: given an array and a pass count, what changed. The two algorithms move elements in genuinely different ways, which is exactly why the exam likes to test them against each other, so the next two sections trace each one on its own five-element array, one full pass at a time.'),

  H.h2(SECTIONS[5]),
  H.p('Selection sort repeats one idea every pass: scan the unsorted part of the array for its smallest remaining value, then swap that value into the front of the unsorted part. After <code>k</code> passes, the <code>k</code> smallest values are sitting in their final sorted positions at the front of the array, and everything after them is still unsorted. Trace it on <code>{64, 25, 12, 22, 11}</code>.'),
  H.table(
    ['Pass', 'Unsorted part scanned', 'Minimum found', 'Swap made', 'Array after this pass'],
    [
      ['1', 'indices 0 through 4: 64, 25, 12, 22, 11', '11 at index 4', 'swap index 0 and index 4', '11, 25, 12, 22, 64'],
      ['2', 'indices 1 through 4: 25, 12, 22, 64', '12 at index 2', 'swap index 1 and index 2', '11, 12, 25, 22, 64'],
      ['3', 'indices 2 through 4: 25, 22, 64', '22 at index 3', 'swap index 2 and index 3', '11, 12, 22, 25, 64'],
      ['4', 'indices 3 through 4: 25, 64', '25 at index 3', 'no swap needed, already smallest', '11, 12, 22, 25, 64'],
    ]
  ),
  H.p('Five elements take four passes to fully sort, because once the first four are in their correct final positions the fifth has nowhere else to go. Notice that the array only changes on three of the four passes. Pass 4 scans, finds that the current front value is already the minimum of what is left, and performs no swap at all, but it still counts as a completed pass. A trace that assumes every pass must move something will misread that row.'),

  H.h2(SECTIONS[6]),
  H.p('Insertion sort works from the opposite direction. It treats the front of the array as already sorted, one element at a time, and on each pass it takes the next value, called the key, and shifts it backward through the sorted part until it lands in the position where it belongs. Unlike selection sort, insertion sort does not guarantee any element reaches its true final position early, and the amount of shifting varies a great deal from pass to pass. Trace it on <code>{40, 20, 60, 10, 50}</code>, treating index 0 as already sorted before the first pass begins.'),
  H.table(
    ['Pass', 'Key being inserted', 'Shifting that happens', 'Array after this pass'],
    [
      ['1', '20 (index 1)', '20 is less than 40, so 40 shifts right and 20 is inserted at index 0', '20, 40, 60, 10, 50'],
      ['2', '60 (index 2)', '60 is greater than 40, so nothing shifts and 60 stays put', '20, 40, 60, 10, 50'],
      ['3', '10 (index 3)', '10 is less than 60, 40, and 20 in turn, so all three shift right and 10 lands at index 0', '10, 20, 40, 60, 50'],
      ['4', '50 (index 4)', '50 is less than 60 but greater than 40, so only 60 shifts and 50 is inserted at index 3', '10, 20, 40, 50, 60'],
    ]
  ),
  H.p('Pass 2 is the row worth sitting with. The key, 60, is already greater than every value in the sorted part to its left, so the correct trace is that nothing moves, the same way selection sort had a pass where no swap happened. Insertion sort\'s best case, an array that arrives already sorted, is exactly this outcome repeated on every single pass: each key gets compared once to its immediate left neighbor, finds it already belongs where it is, and the loop moves on. That is also why insertion sort and selection sort can look deceptively similar after a couple of passes on a small array, even though the work each one does to get there is completely different, which is precisely why the exam likes to pair them in the same question.'),

  H.h2('Two practice questions in the exam format'),
  H.p('The first question traces binary search on a specific array and target the way the two worked tables above did. The second asks for the array\'s exact state after a stated number of sort passes, which is the actual form these questions take. Predict your own answer using a <a href="/blogs/ap-csa/ap-csa-variable-table-tracing-method">low/high/mid table</a> before opening either explanation.'),
  H.mcq({
    n: 1,
    stem: 'What is the value of result after the following code segment runs?',
    codeText: 'int[] nums = {4, 11, 18, 26, 35, 44, 58, 67, 79};\nint target = 26;\nint low = 0;\nint high = nums.length - 1;\nint result = -1;\nwhile (low <= high) {\n    int mid = (low + high) / 2;\n    if (nums[mid] == target) {\n        result = mid;\n        low = high + 1;\n    } else if (nums[mid] < target) {\n        low = mid + 1;\n    } else {\n        high = mid - 1;\n    }\n}\nSystem.out.println(result);',
    options: ['1', '2', '3', '4'],
    correct: 2,
    why: 'Trace it row by row. Step 1: low = 0, high = 8, mid = 4, nums[4] is 35, which is greater than 26, so high becomes mid - 1 = 3. Step 2: low = 0, high = 3, mid = 1, nums[1] is 11, which is less than 26, so low becomes mid + 1 = 2. Step 3: low = 2, high = 3, mid = 2, nums[2] is 18, which is less than 26, so low becomes mid + 1 = 3. Step 4: low = 3, high = 3, mid = 3, nums[3] is 26, an exact match, so result becomes 3 and the loop ends. Each mid in this trace is computed from the updated low and high from the previous step, not from the original bounds, which is exactly the habit that keeps a binary search trace accurate.',
  }),
  H.mcq({
    n: 2,
    stem: 'The array {15, 6, 21, 3, 9} is sorted using insertion sort, treating index 0 as already sorted before the first pass. What does the array look like after exactly 2 passes?',
    codeText: 'for (int i = 1; i < arr.length; i++) {\n    int key = arr[i];\n    int j = i - 1;\n    while (j >= 0 && arr[j] > key) {\n        arr[j + 1] = arr[j];\n        j--;\n    }\n    arr[j + 1] = key;\n}',
    options: ['3, 6, 9, 15, 21', '6, 15, 21, 3, 9', '6, 3, 15, 21, 9', '15, 6, 21, 3, 9'],
    correct: 1,
    why: 'Pass 1 inserts the key at index 1, which is 6. Since 6 is less than 15, the 15 shifts right and 6 is inserted at index 0, giving 6, 15, 21, 3, 9. Pass 2 inserts the key at index 2, which is 21. Since 21 is greater than 15, the value immediately to its left, nothing shifts and 21 stays exactly where it is. The array after 2 passes is 6, 15, 21, 3, 9, unchanged from the end of pass 1 in its last three positions because insertion sort only reaches indices 3 and 4 on later passes. The first option is the fully sorted array, which takes all 4 passes, not 2. The third option shifts 3 into the array early, which does not happen until pass 3.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Does AP CSA require binary search to run on a sorted array?', a: 'Yes. Binary search only works correctly because it can safely discard half of the remaining range on every comparison, and that guarantee depends entirely on the array already being sorted before the search starts. Running the same code on an unsorted array does not throw an exception. It runs to completion and can return a wrong index, or the correct one by coincidence, with no warning either way.' },
    { q: 'Do I need to be able to write selection sort and insertion sort from memory?', a: 'The AP CSA exam tests both by tracing, not by asking you to write either algorithm from an empty method. You should be able to read code implementing selection sort or insertion sort and say exactly what the array looks like after a stated number of passes, and recognize each algorithm from its behavior, but reproducing the code from scratch is not what these questions check.' },
    { q: 'What is the most common off-by-one mistake in a binary search trace?', a: 'Using low < high instead of low <= high as the loop condition, which skips the exact case where the target is the single remaining element. Close behind that is updating a bound to mid instead of mid + 1 or mid - 1 after a comparison, which can leave an already-checked index back in play and cause the search to loop longer than it should, or in the worst case never terminate.' },
    { q: 'How many comparisons does binary search need for a large sorted array?', a: 'Because each comparison discards half of what remains, the number of comparisons needed grows with the base-2 logarithm of the array\'s size rather than with its size directly. A sorted array of a thousand elements needs at most ten comparisons to find any target or confirm it is missing, which is the entire reason binary search is preferred over scanning an array from the front once the array is known to be sorted.' },
  ]),

  H.cta({
    heading: 'Practice tracing binary search and sorts until the bounds are automatic',
    body: 'Daily tracing practice built around low/high/mid tables and pass-by-pass sort states, plus a score calculator built to the current four unit exam.',
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
  H.updatedNote('This is a concept guide, reviewed against the current AP CSA Course and Exam Description. Last reviewed October 20, 2026.'),
]);

module.exports = { meta, body };
