'use strict';
// Weekly course post: AP CSA Unit 4 (Data Collections). Practice-focused drill
// piece, twelve scenario and tracing questions ordered roughly easiest to
// hardest and grouped by sub-topic: array/ArrayList basics, 2D array
// traversal, then mixed scenarios that combine both structures the way a
// harder free response question would. Companion to the two existing Unit 4
// concept guides on this blog, ap-csa-array-vs-arraylist and
// ap-csa-2d-arrays-row-major-column-major; every code sample, value set, and
// traced scenario below is new and does not reuse anything from either post.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'AP CSA Unit 4 practice: how these twelve questions are organized',
  'Array and ArrayList basics',
  '2D array traversal',
  'Mixed scenarios: array, ArrayList, and 2D array together',
  'The four traps in one table',
];

const meta = {
  title: 'AP CSA Unit 4 Practice: Twelve Data Collections Questions',
  handle: 'ap-csa-unit-4-data-collections-questions',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'ap csa unit 4 practice',
  publishOn: '2026-10-16',
  seoTitle: 'AP CSA Unit 4 Practice: Twelve Data Collections Questions',
  seoDescription: 'Twelve AP CSA Unit 4 practice questions on array, ArrayList, and 2D arrays, grouped by sub-topic and ordered from basic tracing to combined scenarios.',
  summary: 'Twelve AP CSA Unit 4 practice questions, grouped into array and ArrayList basics, 2D array traversal, and harder mixed scenarios that combine both structures, ordered roughly easiest to hardest. Three are presented as fully interactive practice questions and the rest as worked tracing walkthroughs, all built around fresh code and values rather than reused examples.',
  tags: ['AP CSA', 'Unit 4', 'Data Collections', 'Practice Questions'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('AP CSA Unit 4 practice, the kind built around tracing rather than memorizing, is what actually moves the needle on Data Collections, the widest single unit on the exam. Here are twelve questions scoped entirely to Unit 4, array and ArrayList basics first, then 2D array traversal, then harder scenarios that combine both, ordered so the easiest tracing comes first and the hardest combined scenario comes last.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 13, 2026', updated: 'October 13, 2026', readingMinutes: 14,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('This is a practice-only companion to two earlier guides on this blog: <a href="/blogs/ap-csa/ap-csa-array-vs-arraylist">array versus ArrayList</a>, which explains the fixed-size-versus-dynamic-size decision and the removal-during-iteration trap in depth, and <a href="/blogs/ap-csa/ap-csa-2d-arrays-row-major-column-major">2D arrays, row major and column major</a>, which walks through why a 2D array is an array of arrays rather than a grid. Read either of those first if a term below is unfamiliar. This post exists for the part that guide alone cannot give you: enough new tracing reps, in fresh code with fresh values, that recognizing a Unit 4 trap stops depending on remembering one specific example and starts being a pattern you would catch cold on an exam question you have never seen.'),
  H.p('The twelve questions below are grouped into three sub-topics and get harder within each group and across the three groups. Group one covers array and ArrayList on their own: declaring, filling, choosing between them, and the classic removal bug. Group two moves to 2D arrays: access, row-major traversal, the swapped-loop trap, and the two different length questions a 2D array can answer. Group three is where Unit 4 gets genuinely hard, combining a 2D array and an ArrayList in the same method the way a free response question does, ending with the single hardest trace in this post. Three questions are built as fully interactive practice items with the answer hidden behind a details toggle. The other nine are worked the same way a rubric would walk through them, reasoning and all, right in the paragraph.'),
  H.p('Work through each one before reading the explanation, the same discipline the earlier guide on <a href="/blogs/ap-csa/ap-csa-variable-table-tracing-method">variable table tracing</a> recommends for any nested-loop question: read the whole code segment first, predict the output on paper or in your head, and only then check it against the walkthrough.'),

  H.h2(SECTIONS[1]),
  H.h3('Question 1: summing a fixed roster of scores'),
  H.p('A program stores the six quiz scores from a single class period in a fixed-size array and needs to print the total. Here is the code as written.'),
  H.code('int[] quiz = {78, 91, 85, 60, 100, 73};\nint total = 0;\n\nfor (int i = 0; i <= quiz.length; i++) {\n    total += quiz[i];\n}\nSystem.out.println(total);'),
  H.p('This does not print a total at all. It throws an <code>ArrayIndexOutOfBoundsException</code> before the loop finishes. <code>quiz.length</code> is 6, and valid indices for a six-element array run from 0 through 5. The loop condition <code>i <= quiz.length</code> lets <code>i</code> reach 6 on its final pass, and <code>quiz[6]</code> reaches one position past the last real element, which is not a slot that exists. The fix is the strict less-than every correct array traversal in this post uses, <code>i < quiz.length</code>, so the loop stops at <code>i = 5</code>, the last valid index, instead of running one step too far.'),
  H.h3('Question 2: a tournament bracket that locks at sixteen'),
  H.p('A chess tournament assigns each of its sixteen entered players a fixed seed number the moment the bracket locks, the night before the tournament starts. No player is added or removed once the bracket is set, and the number of players never changes for the rest of the event. Which structure should store the seed numbers, and why?'),
  H.p('An array is the right call here, and the reasoning is worth stating plainly because it is the mirror image of the more common ArrayList scenario. The count, sixteen, is known before a single line of storage code runs, and it is fixed for the entire life of the program: the bracket locks and nothing about that count changes afterward. That is exactly the profile an array is built for. Reaching for an ArrayList here would still technically work, since ArrayList can hold a fixed count just fine, but it would add method-call overhead and a wrapper class requirement for no benefit, since nothing about this scenario ever calls <code>add</code> or <code>remove</code> after the bracket locks. The deciding question is never which structure is capable of doing the job. It is which one matches the actual shape of the problem, and a count that is known in advance and never changes again is the array\'s exact use case.'),
  H.h3('Question 3: autoboxing through an ArrayList of prices'),
  H.p('A program builds an ArrayList of decimal prices and computes their total using a for-each loop.'),
  H.code('ArrayList<Double> prices = new ArrayList<Double>();\nprices.add(4.50);\nprices.add(2.25);\nprices.add(1.75);\n\ndouble sum = 0;\nfor (double p : prices) {\n    sum += p;\n}\nSystem.out.println(sum);'),
  H.p('This prints 8.5. Nothing here looks unusual at a glance, and that is exactly the point: <code>ArrayList<Double></code> requires the wrapper class <code>Double</code>, not the primitive <code>double</code>, in its angle brackets, for the same generics reason <code>ArrayList<Integer></code> requires <code>Integer</code> instead of <code>int</code>. Each call to <code>prices.add(4.50)</code> autoboxes the primitive literal into a <code>Double</code> object automatically. The for-each loop header, <code>for (double p : prices)</code>, then unboxes each <code>Double</code> back into a primitive <code>double</code> on every pass, which is why <code>p</code> can be added directly into the primitive variable <code>sum</code> with no conversion code written anywhere. A student who tried to declare <code>ArrayList<double></code> instead would get a compile error, not a runtime surprise, since <code>double</code> is a primitive and cannot fill a generic type parameter at all.'),
  H.h3('Question 4: removing while looping, with a new condition'),
  H.mcq({
    n: 1,
    stem: 'Consider the code segment below. What is printed?',
    codeText: 'ArrayList<Integer> vals = new ArrayList<Integer>();\nvals.add(3);\nvals.add(6);\nvals.add(9);\nvals.add(12);\nvals.add(15);\n\nfor (int i = 0; i < vals.size(); i++) {\n    if (vals.get(i) % 3 == 0 && vals.get(i) % 2 != 0) {\n        vals.remove(i);\n    }\n}\nSystem.out.println(vals);',
    options: ['[6, 12]', '[3, 6, 9, 12, 15]', '[6, 9, 12]', '[6, 12, 15]'],
    correct: 0,
    why: 'The condition removes any value that is both a multiple of 3 and odd, which here means 3, 9, and 15. The list starts as [3, 6, 9, 12, 15]. At i = 0, vals.get(0) is 3, which is odd and a multiple of 3, so vals.remove(0) runs, shifting the list to [6, 9, 12, 15], with 9 sliding down into index 1. The loop does not know that shift happened, so it increments to i = 1, which now points at 9, not the 6 that stayed at index 0. Since 9 is also odd and a multiple of 3, it gets removed too, shifting the list to [6, 12, 15], with 12 sliding into index 1. The loop increments to i = 2, pointing at 15, the last remaining odd multiple of 3, and removes it as well, leaving [6, 12]. The loop then increments to i = 3, which is out of bounds for a two-element list, so it stops. The final printed result is [6, 12], every odd multiple of three removed correctly by coincidence, since this particular data happened to have the values that needed removing sitting at exactly the indices the shifting kept exposing, which is precisely why this bug is dangerous: it does not always produce a visibly wrong answer, so it can pass a quick eyeball check even when the code is not actually safe in general.',
  }),

  H.h2(SECTIONS[2]),
  H.h3('Question 5: reading a seating chart directly'),
  H.p('A classroom seating chart is stored as a 2D array with four rows of two seats each, row 0 nearest the door.'),
  H.code('int[][] seats = {\n    {21, 8},\n    {14, 30},\n    {5, 19},\n    {27, 2}\n};\nSystem.out.println(seats[2][1] + " " + seats[0][0]);'),
  H.p('This prints <code>19 21</code>. <code>seats[2]</code> selects the third row, index 2, which is the array <code>{5, 19}</code>, and indexing that result at position 1 reaches 19, the second value in that row. <code>seats[0][0]</code> selects the first row, <code>{21, 8}</code>, then the first value within it, 21. Each bracket pair does one indexing step: the first selects which row array to hand back, and the second indexes into that specific row array, never the outer structure directly.'),
  H.h3('Question 6: row-major sums into a new array'),
  H.p('A program stores four weeks of daily step counts, one row per week, seven columns per week, and needs the total for each individual week.'),
  H.code('int[][] steps = {\n    {6000, 7200, 5400, 8100, 4300, 9000, 6600},\n    {7100, 6800, 5900, 8400, 7700, 6200, 5000},\n    {8000, 7500, 6100, 5800, 9200, 7000, 6400},\n    {5600, 6300, 7800, 8500, 6000, 7200, 5100}\n};\nint[] weeklyTotals = new int[steps.length];\n\nfor (int week = 0; week < steps.length; week++) {\n    int total = 0;\n    for (int day = 0; day < steps[week].length; day++) {\n        total += steps[week][day];\n    }\n    weeklyTotals[week] = total;\n}\nSystem.out.println(weeklyTotals[1]);'),
  H.p('This prints 47100. The outer loop steps through weeks, which is row-major order, the same order the exam treats as the default any time a problem does not ask for something else explicitly. For week 1, the inner loop sums every value in <code>steps[1]</code>, the array <code>{7100, 6800, 5900, 8400, 7700, 6200, 5000}</code>: 7100 plus 6800 plus 5900 plus 8400 plus 7700 plus 6200 plus 5000 comes to 47100, and that total is stored at <code>weeklyTotals[1]</code> before the outer loop moves on to week 2. Resetting <code>total</code> to zero inside the outer loop, before each week\'s inner loop starts, is the detail that makes this pattern work at all: leaving that reset out would keep accumulating every week\'s total on top of the last one instead of computing four separate sums.'),
  H.h3('Question 7: a non-square swapped loop'),
  H.mcq({
    n: 2,
    stem: 'Consider the code segment below, which is meant to print every value in a 2 row by 4 column array. What happens when it runs?',
    codeText: 'int[][] readings = {\n    {12, 18, 24, 30},\n    {6, 9, 15, 21}\n};\n\nfor (int col = 0; col < readings.length; col++) {\n    for (int row = 0; row < readings[col].length; row++) {\n        System.out.print(readings[row][col] + " ");\n    }\n}',
    options: [
      'It prints all eight values in column-major order with no error.',
      'It throws an ArrayIndexOutOfBoundsException.',
      'It prints all eight values in row-major order with no error.',
      'It compiles but prints nothing.',
    ],
    correct: 1,
    why: 'The outer loop variable col is bounded by readings.length, which is 2, the number of rows, not the number of columns. The inner loop variable row is bounded by readings[col].length, which is 4, the length of whichever row col currently points at. On the array\'s first outer pass, col is 0, so the inner bound is readings[0].length, 4, and row runs 0 through 3 accessing readings[0][0] through readings[3][0]. That last access, readings[3][0], asks for row index 3, but readings only has two rows, indices 0 and 1. The moment row reaches 2, readings[2][0] is already out of bounds, and Java throws an ArrayIndexOutOfBoundsException right there. This is the exact scenario a same-size square array hides: on a 3x3 array, arr.length and arr[i].length happen to be equal, so a swapped loop stays in bounds by coincidence and only visits elements in the wrong order. On this 2x4 array they are different numbers, 2 versus 4, so the same swapped-loop mistake crashes instead of silently misordering the output. The lesson is not that swapped loops always crash. It is that a square array is the one shape where a swapped loop can hide from you.',
  }),
  H.h3('Question 8: total across a jagged delivery log'),
  H.p('A delivery service logs the weight in pounds of each package delivered per route, one row per route, and routes do not all carry the same number of packages.'),
  H.code('int[][] loads = {\n    {12, 8, 15, 6, 9},\n    {20, 11},\n    {7, 14, 9}\n};\nint grandTotal = 0;\n\nfor (int route = 0; route < loads.length; route++) {\n    for (int pkg = 0; pkg < loads[route].length; pkg++) {\n        grandTotal += loads[route][pkg];\n    }\n}\nSystem.out.println(grandTotal);'),
  H.p('This prints 111. <code>loads.length</code> is 3, the number of routes, and each route asks its own row for its own length rather than borrowing route 0\'s length of 5 for every route: <code>loads[0].length</code> is 5, <code>loads[1].length</code> is 2, and <code>loads[2].length</code> is 3. Route 0 contributes 12 plus 8 plus 15 plus 6 plus 9, which is 50. Route 1 contributes 20 plus 11, which is 31. Route 2 contributes 7 plus 14 plus 9, which is 30. Fifty plus thirty-one plus thirty comes to 111. Writing the inner bound as a fixed number, or as <code>loads[0].length</code> reused for every route, would either skip real packages on the shorter routes or throw an exception trying to read a package that route does not have, which is exactly why <code>loads[route].length</code>, the current row asking about itself, is the only version of this loop that works correctly on data that is not guaranteed to be rectangular.'),

  H.h2(SECTIONS[3]),
  H.h3('Question 9: row sums collected into an ArrayList'),
  H.p('A method takes a 2D array of daily temperature readings, one row per city, and needs to return an ArrayList holding each city\'s total instead of a plain array, so the caller can add more cities to the result later.'),
  H.code('public static ArrayList<Integer> rowTotals(int[][] data) {\n    ArrayList<Integer> totals = new ArrayList<Integer>();\n    for (int row = 0; row < data.length; row++) {\n        int sum = 0;\n        for (int col = 0; col < data[row].length; col++) {\n            sum += data[row][col];\n        }\n        totals.add(sum);\n    }\n    return totals;\n}'),
  H.p('Called on <code>{{70, 72, 68}, {55, 60, 58, 61}}</code>, this returns an ArrayList holding 210 and 234, in that order. The outer loop is still ordinary row-major 2D array traversal, and the inner loop still sums one row at a time using that row\'s own length, exactly like the delivery log question above. What changes is the last line inside the outer loop: instead of storing each row\'s sum into a same-sized array at a matching index, <code>totals.add(sum)</code> appends it to a structure whose size was never fixed in advance. This is the shape a real Unit 4 free response question uses constantly: a 2D array as the given data, and an ArrayList as the returned result, because the caller does not know in advance how many rows the input will have, only that the returned collection needs to be exactly that long.'),
  H.h3('Question 10: searching a 2D array with an early return'),
  H.p('A method searches a 2D array of assigned locker numbers for a specific number and returns the row it was found in, or negative one if it never appears.'),
  H.code('public static int findRow(int[][] lockers, int target) {\n    for (int row = 0; row < lockers.length; row++) {\n        for (int col = 0; col < lockers[row].length; col++) {\n            if (lockers[row][col] == target) {\n                return row;\n            }\n        }\n    }\n    return -1;\n}'),
  H.p('Called with <code>target</code> equal to a value that lives in row 2, this returns 2 immediately once that value is found, without finishing the rest of row 2 or checking any later row at all. A <code>return</code> statement exits the entire method on the spot, not just the loop it happens to sit inside, which is a different behavior from <code>break</code>, a detail worth being precise about since the two are easy to confuse. A <code>break</code> placed where that <code>return</code> is would only exit the inner column loop, letting the outer row loop keep running and potentially rescanning later rows unnecessarily. Using <code>return</code> here is what lets the search stop the moment a match is found rather than continuing to check locker numbers nobody needs checked anymore. If <code>target</code> never appears anywhere in <code>lockers</code>, both loops finish completely and the method falls through to <code>return -1;</code> at the very end.'),
  H.h3('Question 11: the swapped-loop trap hiding inside an ArrayList build'),
  H.mcq({
    n: 3,
    stem: 'A method is meant to build an ArrayList containing every value in a 2D array, read row by row, top to bottom, left to right within each row, the standard row-major order. Here is the method as written. What does it actually return when called on {{4, 8}, {15, 16}, {23, 42}}?',
    codeText: 'public static ArrayList<Integer> flatten(int[][] grid) {\n    ArrayList<Integer> out = new ArrayList<Integer>();\n    for (int col = 0; col < grid.length; col++) {\n        for (int row = 0; row < grid[col].length; row++) {\n            out.add(grid[row][col]);\n        }\n    }\n    return out;\n}',
    options: [
      '[4, 8, 15, 16, 23, 42], the intended row-major order',
      '[4, 15, 23, 8, 16, 42], column-major order instead of row-major',
      'The method throws an ArrayIndexOutOfBoundsException',
      '[4, 8, 15, 16, 23, 42] but in reverse',
    ],
    correct: 1,
    why: 'This is the same swapped-loop-variable mistake from the earlier 2x4 traversal question, now happening quietly inside a method that builds an ArrayList instead of printing directly, which makes it easier to miss since there is no console output to eyeball mid-trace. The outer loop variable is named col but is bounded by grid.length, the row count, and the inner loop variable is named row but is bounded by grid[col].length. On this 3-row, 2-column array, grid.length is 3 and every grid[col].length is 2, so both loops stay in bounds, unlike the earlier 2x4 example where a mismatched row and column count made the identical mistake crash instead. Tracing the adds in order: outer pass 1 (col = 0) adds grid[0][0] then grid[1][0], which are 4 and 15. Outer pass 2 (col = 1) adds grid[0][1] then grid[1][1], which are 8 and 16. Outer pass 3 (col = 2) adds grid[0][2] then grid[1][2], which are 23 and 42. The returned list is [4, 15, 23, 8, 16, 42], the array read down each column before moving to the next one, column-major order, not the row-major order the method\'s comment and variable names both claim it produces. The names row and col describing the opposite of what the loops actually do is exactly what makes this bug easy to miss on a read-through rather than a careful trace.',
  }),
  H.h3('Question 12: the hardest trace, two structures updating together'),
  H.p('This is the hardest question in this set on purpose, because it is the shape a real Unit 4 free response question uses when it wants to test whether a student can track two data structures changing across the same loop instead of one structure in isolation. A method takes a 2D array of exam scores, one row per class period, and a companion ArrayList holding that period\'s teacher name in the same row order. Any period whose row total is below 300 has its teacher\'s name removed from the ArrayList.'),
  H.code('public static void flagLowPeriods(int[][] scores, ArrayList<String> teachers) {\n    for (int period = 0; period < scores.length; period++) {\n        int total = 0;\n        for (int i = 0; i < scores[period].length; i++) {\n            total += scores[period][i];\n        }\n        if (total < 300) {\n            teachers.remove(period);\n        }\n    }\n}\n\n// called with:\n// scores = {{95, 88, 92}, {60, 55, 70}, {89, 91, 85}, {40, 62, 58}}\n// teachers = ["Diaz", "Kim", "Osei", "Patel"]'),
  H.p('Trace the row totals first, before touching the ArrayList at all. Period 0: 95 plus 88 plus 92 is 275, below 300. Period 1: 60 plus 55 plus 70 is 185, below 300. Period 2: 89 plus 91 plus 85 is 265, below 300. Period 3: 40 plus 62 plus 58 is 160, below 300. Every single period actually falls below 300 here, which is exactly the setup that exposes the bug: this method uses <code>period</code>, the row index into <code>scores</code>, directly as the index to remove from <code>teachers</code>, and that only stays correct as long as no earlier removal has already shifted the ArrayList. It does not. At period 0, total is 275, so <code>teachers.remove(0)</code> runs, removing Diaz, and the list shifts to <code>["Kim", "Osei", "Patel"]</code>, with Kim sliding down into index 0. At period 1, total is 185, so <code>teachers.remove(1)</code> runs, but index 1 in the shifted list is now Osei, not Kim, so Osei is removed instead, leaving <code>["Kim", "Patel"]</code>. At period 2, total is 265, so <code>teachers.remove(2)</code> runs, but the list only has two elements left, indices 0 and 1, so this throws an <code>IndexOutOfBoundsException</code> before period 3 is ever reached. The 2D array traversal and the row-total arithmetic in this method are both completely correct. The bug is using an index that was only ever valid against the original, unmodified ArrayList to remove from a list that has already been changed by an earlier pass through the same loop, the same root cause as the plain ArrayList removal trap from question 4, just one layer harder to see because it is hiding behind an unrelated 2D array computation on every line above it.'),
  H.box('key', 'The fix, and the pattern to recognize across all twelve questions', '<p>The fix here is the same one that fixes ordinary indexed-loop removal: track how many removals have already happened and adjust the index, or better, iterate over the row totals first, collect which periods qualify into a separate list of indices, and remove from teachers afterward in a second pass, from the highest index to the lowest, so each removal cannot affect the position of any index still waiting to be processed. Every trap across all twelve questions in this post traces back to one of two root causes: an off-by-one or swapped-loop-variable error in how a structure is traversed, or an index that was valid a moment ago becoming invalid because a removal already changed the structure underneath it. Naming which of the two a question is testing is most of the work of solving it.</p>'),

  H.h2(SECTIONS[4]),
  H.p('Laid out next to each other, the four traps that produced every wrong answer in this post share a small set of causes worth holding in memory going into the exam.'),
  H.table(
    ['Trap', 'What it looks like', 'Why it is easy to miss', 'The fix'],
    [
      ['Off-by-one bound', 'A loop condition using <= instead of < against .length or .size()', 'The extra pass often looks harmless until the array or list runs out of room', 'Always use < against length or size, never <=, for a normal forward traversal'],
      ['Wrong length source', 'Using arr.length where arr[i].length was needed, or the reverse', 'Both return the same number on a square or rectangular array, hiding the bug entirely', 'Ask which question is actually being asked: total rows, or one specific row\'s own size'],
      ['Swapped loop variables', 'Outer and inner loop names describe rows and columns but the bounds are swapped', 'A square array keeps every access in bounds, so nothing crashes to reveal the mistake', 'Read grid[row][col] against the actual outer and inner bounds, not against the variable names'],
      ['Index invalidated by removal', 'Removing from an ArrayList by index inside a loop, especially a loop driven by something else', 'The code compiles, often runs without an exception, and can even print a correct-looking result by coincidence', 'Decrement the loop counter after a removal, or process removals in a separate pass afterward'],
    ]
  ),
  H.p('None of these four traps require memorizing new syntax. Every one of them is caught by slowing down for one extra beat on any nested loop or any removal call: what exactly does this bound refer to, and has anything already changed since the index I am about to use was last valid.'),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What exactly does AP CSA Unit 4, Data Collections, cover?', a: 'Unit 4 covers array, ArrayList, and 2D array: declaring and traversing each one, choosing the right structure for a given scenario, and the specific runtime traps that come from mixing array and ArrayList syntax or removing elements while iterating over them. It carries a large share of the multiple-choice weighting on the exam and is also where the 2D array free response question is drawn from.' },
    { q: 'Why do so many of these questions produce a correct-looking output instead of an obvious error?', a: 'Because the underlying bugs, an off-by-one bound, a swapped loop variable, or an index invalidated by an earlier removal, often stay in bounds and keep the program running. A square 2D array or a data set where every value happens to need removing can hide a real bug behind an output that looks fine at a glance, which is exactly why tracing the code statement by statement matters more than skimming it for something that looks obviously wrong.' },
    { q: 'Should I trace practice questions on paper or just read the explanation?', a: 'Predict the output on paper or out loud before reading any explanation. The value of a tracing question comes from committing to a specific prediction and then finding exactly where your mental model diverged from what the code actually does, which is much harder to notice if the explanation is read first.' },
    { q: 'Is a mix of array and ArrayList in the same method something the real exam actually tests?', a: 'Yes. A common free response pattern gives a 2D array as input data and asks for an ArrayList as the returned result, or pairs a 2D array with a companion ArrayList that has to stay in sync with it, which is exactly the shape the last three questions in this post are built around.' },
  ]),

  H.cta({
    heading: 'Keep tracing Data Collections until it is automatic',
    body: 'Daily practice built around exactly this kind of array, ArrayList, and 2D array trace, plus a full archive of free response questions that test Unit 4 the way the real exam does.',
    links: [
      { href: '/pages/ap-csa-qotd-hub', text: 'Daily practice' },
      { href: '/pages/ap-csa-frq-archive', text: 'FRQ archive', alt: true },
    ],
  }),
  H.p('For the syntax and vocabulary behind any of the compile errors a mistraced example above would actually throw, see the <a href="/blogs/ap-csa/ap-csa-reading-java-error-messages">guide to reading Java error messages</a>.'),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reviewed against the AP CSA Course and Exam Description current in October 2026. Last reviewed October 13, 2026.'),
]);

module.exports = { meta, body };
