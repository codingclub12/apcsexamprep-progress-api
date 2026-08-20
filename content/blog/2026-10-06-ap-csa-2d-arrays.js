'use strict';
// Evergreen concept post: AP CSA Unit 4 (Data Collections). A 2D array looks
// like a grid, and that visual shorthand is exactly what gets a student in
// trouble. Java has no grid type. A 2D array is an array of arrays, and the
// traversal order a program visits elements in depends entirely on which
// loop variable is on the outside, not on anything the array itself
// enforces. Swapping the loop order is a mistake that compiles cleanly on a
// square array and produces a completely different, silently wrong, output.
// No news peg, no stats needed.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'AP CSA 2D Arrays: What arr[row][col] Actually Means',
  'Row-Major Traversal: Reading the Array the Way Java Stores It',
  'The Traversal Trap: Swapped Loops and Column-Major Order',
  'arr.length vs arr[i].length, and True Jagged Arrays',
];

const meta = {
  title: 'AP CSA 2D Arrays: Row Major, Column Major, and the Traversal Trap',
  handle: 'ap-csa-2d-arrays-row-major-column-major',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'ap csa 2d array',
  publishOn: '2026-10-06',
  seoTitle: 'AP CSA 2D Array Guide: Row-Major vs Column-Major',
  seoDescription: 'AP CSA 2D array traversal explained: how row-major and column-major loops differ, why a swapped loop still compiles, and the correct use of arr.length.',
  summary: 'An AP CSA 2D array is an array of arrays, not a grid, and the exam leans on exactly the traversal bug that comes from forgetting it. This guide covers declaring and accessing a 2D array with arr[row][col], traces row-major and the swapped column-major order side by side on a 3x3 example, and explains why arr.length and arr[i].length answer two different questions, including for arrays whose rows are genuinely different lengths.',
  tags: ['AP CSA', 'Unit 4', 'Data Collections', '2D Arrays'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('An AP CSA 2D array question looks like a straightforward extension of the one-dimensional array a student already knows, right up until the traversal order flips and nothing about the code visibly changed. A 2D array in Java is not a grid the way a spreadsheet is a grid. It is an array of arrays, and every access, every loop bound, and every traversal order follows directly from that fact rather than from any built-in notion of rows and columns. This guide builds a 2D array the way Java actually builds one, traces the correct row-major traversal alongside the swapped, column-major version a student produces by accident, and walks through why arr.length and arr[i].length answer two different questions, including the true jagged case where rows are not all the same length.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 6, 2026', updated: 'October 6, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.p('A one-dimensional array already covers the case of storing many values under one name. A 2D array exists for the next problem up: values that are naturally organized along two dimensions at once, a seating chart, a tic-tac-toe board, a small image stored as pixel brightness values. The AP Computer Science A Course and Exam Description places two-dimensional array traversal inside Unit 4, Data Collections, alongside ArrayList, and it is one of the few topics the exam tests almost entirely through tracing rather than through writing new code from scratch. A student is handed a nested loop and asked what it prints, or handed a description and asked to write the loop that prints it in a specific order. Both question types depend on the same underlying model, and that model is simpler and stricter than the word "grid" suggests.'),
  H.p('Every trap in this guide, the swapped loop, the length confusion, the jagged row, comes from treating a 2D array as a single continuous block of memory the way a spreadsheet cell address feels like it should work. It is not that. It is a small tree, one array holding references to other arrays, and once that structure is visible the traps stop being surprising.'),

  H.h2(SECTIONS[0]),
  H.p('An AP CSA 2D array is declared with two bracket pairs, and both common forms show up constantly in exam code. The first form creates every slot filled with the default value, 0 for <code>int</code>:'),
  H.code('int[][] grid = new int[3][3];\ngrid[0][0] = 1;\ngrid[0][1] = 2;\ngrid[0][2] = 3;\ngrid[1][0] = 4;\n// ...and so on, one assignment per element'),
  H.p('The second form, an array initializer, sets every value at declaration time and is the form almost every exam question actually uses, because it lets a problem show the full starting state in a few lines:'),
  H.code('int[][] grid = {\n    {1, 2, 3},\n    {4, 5, 6},\n    {7, 8, 9}\n};'),
  H.p('Reading that initializer literally is the whole trick. <code>grid</code> is not one array of nine numbers arranged in three rows. It is an array of three elements, and each of those three elements is itself an <code>int[]</code> holding three numbers. <code>grid[0]</code> is not the number 1. <code>grid[0]</code> is the array <code>{1, 2, 3}</code>, a complete, independent array object with its own length. Indexing into that result a second time, <code>grid[0][0]</code>, is what finally reaches the number 1. That is the entire meaning of <code>arr[row][col]</code>: index once to select a row, which returns a one-dimensional array, then index that result to select a column within the row.'),
  H.box('key', 'The model that makes every rule below make sense', '<p>A 2D array in Java is an array of arrays. The outer array has one element per row, and each of those elements is a reference to its own separate one-dimensional array. Nothing about the language enforces that those row arrays are the same length, or that they live next to each other in memory. Every rule about length, traversal order, and jagged arrays follows from taking that sentence literally rather than picturing a grid.</p>'),
  H.p('This is also why the flat-array-versus-collection decision covered in the <a href="/blogs/ap-csa/ap-csa-array-vs-arraylist">guide to array and ArrayList</a> still applies here without any change. A 2D array is fixed in size along both dimensions the moment it is created, exactly like a 1D array, and it holds primitives directly with no wrapper class required. Everything that made array the right or wrong tool for a one-dimensional problem carries over unchanged to two dimensions; a 2D array is just an array whose elements happen to be arrays instead of ints.'),

  H.h2(SECTIONS[1]),
  H.p('Reading a 2D array left to right, top to bottom, the way a person would read a printed page, means visiting every column of row 0 first, then every column of row 1, and so on. That order is called row-major traversal, and it is produced by the natural nested-loop shape: the outer loop steps through rows, and the inner loop, which runs completely to the end before the outer loop advances even once, steps through the columns within the current row.'),
  H.code('int[][] grid = {\n    {1, 2, 3},\n    {4, 5, 6},\n    {7, 8, 9}\n};\n\nfor (int row = 0; row < grid.length; row++) {\n    for (int col = 0; col < grid[row].length; col++) {\n        System.out.print(grid[row][col] + " ");\n    }\n}\n// prints: 1 2 3 4 5 6 7 8 9'),
  H.p('Trace the loop bounds and the row-major order falls out mechanically. <code>row</code> starts at 0 and the inner loop runs completely, printing <code>grid[0][0]</code>, <code>grid[0][1]</code>, and <code>grid[0][2]</code>, all three columns of row 0, before <code>row</code> ever becomes 1. Only after the inner loop finishes does the outer loop increment, moving to row 1 and repeating the same full inner pass. The outer variable names the row and barely moves; the inner variable names the column and does almost all the work on any given pass. This is the order that matches how the array initializer was written on the page, and it is the default, expected order any AP CSA free response question assumes unless it explicitly asks for something else.'),
  H.box('tip', 'The naming habit that prevents the whole family of bugs', '<p>Name the outer loop variable row and the inner loop variable col, and use grid[row].length rather than grid[0].length or grid.length for the inner bound. Reading the two loop headers back afterward, for (row...) then for (col...), should describe the traversal in the same words as the problem: outer moves down through rows, inner moves across through columns of the current row.</p>'),

  H.h2(SECTIONS[2]),
  H.p('The bug this section exists for is not a typo that fails to compile. It is a nested loop that compiles cleanly, runs without throwing anything, and prints every one of the correct nine values, just in the wrong order. That combination, compiles fine and runs fine and is still wrong, is exactly what makes it worth a dedicated trace rather than a one-line warning.'),
  H.code('int[][] grid = {\n    {1, 2, 3},\n    {4, 5, 6},\n    {7, 8, 9}\n};\n\nfor (int col = 0; col < grid.length; col++) {\n    for (int row = 0; row < grid[col].length; row++) {\n        System.out.print(grid[row][col] + " ");\n    }\n}\n// prints: 1 4 7 2 5 8 3 6 9'),
  H.p('Look closely at what actually changed from the correct version. The variable named <code>col</code> is now the outer loop, bounded by <code>grid.length</code>, which is the row count, not a column count at all. The variable named <code>row</code> is the inner loop, bounded by <code>grid[col].length</code>. On a square array, three rows and three columns, <code>grid.length</code> and <code>grid[col].length</code> both evaluate to 3 no matter what gets passed in, so every index used inside the loop stays in bounds and nothing ever throws an exception. The names <code>row</code> and <code>col</code> are now describing the opposite of what they actually do: the access <code>grid[row][col]</code> inside the loop body was never changed, but because the outer loop now advances what the code calls <code>col</code> first, the array gets read down each column before moving to the next one. That is column-major order, and it is a completely different sequence of nine values from row-major, built from the exact same array and the exact same access expression.'),
  H.box('warn', 'Why this specific mistake is dangerous rather than obvious', '<p>The swap only stays silent because the example array is square, three rows and three columns. On a non-square 2D array, swapping which loop uses grid.length and which uses grid[i].length usually does throw an ArrayIndexOutOfBoundsException, because the row count and column count are different numbers and an index built from the wrong one eventually runs past the end of a row. A square array removes that safety net entirely, which is exactly why almost every textbook 2D array example happens to be square: it is easier to read, and it is also easier to get traversal order wrong in without anything crashing to warn you.</p>'),
  H.p('Tracing both orders side by side on the same 3x3 array makes the difference concrete rather than abstract. Both loops visit all nine elements exactly once. They just visit them in a different sequence.'),
  H.table(
    ['Visit #', 'Row-major access', 'Row-major value', 'Column-major access', 'Column-major value'],
    [
      ['1', 'grid[0][0]', '1', 'grid[0][0]', '1'],
      ['2', 'grid[0][1]', '2', 'grid[1][0]', '4'],
      ['3', 'grid[0][2]', '3', 'grid[2][0]', '7'],
      ['4', 'grid[1][0]', '4', 'grid[0][1]', '2'],
      ['5', 'grid[1][1]', '5', 'grid[1][1]', '5'],
      ['6', 'grid[1][2]', '6', 'grid[2][1]', '8'],
      ['7', 'grid[2][0]', '7', 'grid[0][2]', '3'],
      ['8', 'grid[2][1]', '8', 'grid[1][2]', '6'],
      ['9', 'grid[2][2]', '9', 'grid[2][2]', '9'],
    ]
  ),
  H.p('Read down the value columns and the pattern is exactly a transpose: row-major visits <code>1 2 3 4 5 6 7 8 9</code>, in the same order the initializer was typed, while column-major visits <code>1 4 7 2 5 8 3 6 9</code>, the first column top to bottom, then the second column, then the third. Both are legitimate traversal orders that a problem could ask for on purpose. The trap is not that column-major order exists. It is producing it by accident, with variable names that still say row and col, while believing the code reads left to right, top to bottom the way the initializer was written on the page.'),

  H.h2(SECTIONS[3]),
  H.p('A 2D array has two different length questions, and they are answered by two different expressions that are easy to confuse under time pressure. <code>arr.length</code> asks the outer array how many elements it holds, which is the number of rows. <code>arr[i].length</code> asks one specific row, the array sitting at index <code>i</code>, how many elements it holds, which is the number of columns in that particular row, and only that row.'),
  H.code('int[][] jagged = {\n    {2, 4, 6, 8},\n    {1, 3},\n    {5, 5, 5}\n};\n\nSystem.out.println(jagged.length);       // 3\nSystem.out.println(jagged[0].length);    // 4\nSystem.out.println(jagged[1].length);    // 2\nSystem.out.println(jagged[2].length);    // 3'),
  H.p('<code>jagged.length</code> is 3 because the outer array holds three elements, three row arrays, regardless of how long any individual row happens to be. <code>jagged[0].length</code>, <code>jagged[1].length</code>, and <code>jagged[2].length</code> are three separate questions with three separate answers, 4, 2, and 3, because each one asks a different row array about its own size. Nothing forces those three numbers to match, and this is where the array-of-arrays model earns its keep: since every row is its own independent array object rather than a slice of one shared block, there is no structural requirement that the rows be the same length at all. Most AP CSA course examples build rectangular 2D arrays, every row the same length, because rectangular arrays are simpler to reason about and cover the majority of realistic problems. A true jagged array, rows of genuinely different lengths, is still entirely legal Java and can appear in a free response question specifically to test whether a student\'s traversal code depends on an assumption of equal row lengths that the problem never actually promised.'),
  H.box('warn', 'The traversal bug jagged arrays create on their own', '<p>A loop that reads for (int col = 0; col < arr[0].length; col++) inside a row loop assumes every row is exactly as long as row 0. On a rectangular array that assumption happens to be true, so the bug never shows up. On a genuinely jagged array it either skips valid elements in longer rows or throws an ArrayIndexOutOfBoundsException on shorter ones. The fix is using arr[row].length inside the loop, the current row asking about its own length, instead of borrowing the length of row 0 for every row.</p>'),
  H.p('The practical rule follows directly: whenever a loop needs a column bound inside a row loop, ask that specific row for its own length, <code>arr[row].length</code>, never a fixed number and never another row\'s length borrowed for convenience. It costs nothing when the array happens to be rectangular, and it is the only version that still works correctly when it is not.'),

  H.h2('Two practice questions in the exam format'),
  H.p('The first question traces a nested loop over a small 2D array with the loop order transposed from the obvious reading, the exact pattern this guide just walked through. The second tests <code>.length</code> usage directly on a jagged array. Predict the answer before opening either explanation.'),
  H.mcq({
    n: 1,
    stem: 'Consider the code segment below. What is printed?',
    codeText: 'int[][] vals = {\n    {1, 2},\n    {3, 4},\n    {5, 6}\n};\nString result = "";\n\nfor (int c = 0; c < vals[0].length; c++) {\n    for (int r = 0; r < vals.length; r++) {\n        result += vals[r][c];\n    }\n}\nSystem.out.println(result);',
    options: ['123456', '135246', '246135', '142536'],
    correct: 1,
    why: 'The outer loop variable c runs from 0 to 1, bounded by vals[0].length, which is 2, the number of columns in row 0. The inner loop variable r runs from 0 to 2, bounded by vals.length, the number of rows, 3. That means c, which selects a column, is on the outside, and r, which selects a row, is on the inside: this is column-major order even though nothing about the array itself changed. At c = 0, the inner loop runs r = 0, 1, 2 and appends vals[0][0], vals[1][0], vals[2][0], which are 1, 3, 5, building the string "135". At c = 1, the inner loop appends vals[0][1], vals[1][1], vals[2][1], which are 2, 4, 6, extending the string to "135246". The final printed value is 135246, the array read down the first column, then down the second column, exactly the transpose of the row-major order a reader would expect from the initializer as written.',
  }),
  H.mcq({
    n: 2,
    stem: 'Consider the declaration below. What is the value of the expression rows[1].length?',
    codeText: 'int[][] rows = {\n    {2, 4, 6, 8},\n    {1, 3},\n    {5, 5, 5}\n};',
    options: ['3', '2', '4', 'This throws an exception because the array is jagged.'],
    correct: 1,
    why: 'rows[1] selects the second row array, {1, 3}, which is a complete, independent int[] holding exactly two elements. Calling .length on that result asks that specific row how many elements it holds, and the answer is 2, regardless of how long any other row happens to be. rows.length would instead answer a different question, the number of rows, which is 3, and rows[0].length would answer yet another, the length of the first row specifically, which is 4. A jagged array, one whose rows are not all the same length, is completely legal Java. It does not throw an exception on its own; it only causes a runtime exception if a loop later assumes every row shares one row\'s length and indexes past the end of a shorter one.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Is an AP CSA 2D array actually stored as a grid in memory?', a: 'No. A 2D array in Java is an array of arrays: the outer array holds references to separate one-dimensional array objects, one per row, and those row arrays are not required to sit next to each other in memory or be the same length. arr[row][col] works by indexing the outer array to get one row array, then indexing that row array to get the value. The grid picture is a useful mental shortcut for a rectangular array, but it is not what the language is actually doing.' },
    { q: 'Why does a swapped loop order still compile without any errors?', a: 'Java checks that array indices stay in bounds at the moment they are used, not whether the loop variable names describe rows or columns correctly. On a square array, where the row count and column count are the same number, both grid.length and grid[i].length evaluate to that same value no matter which one a swapped loop uses for which bound, so every access stays in bounds and nothing throws. The code compiles and runs cleanly; it just visits the elements in column-major order instead of the intended row-major order.' },
    { q: 'What is the difference between arr.length and arr[i].length on a 2D array?', a: 'arr.length asks the outer array how many elements it holds, which is the number of rows. arr[i].length asks one specific row, the array at index i, how many elements it holds, which is the number of columns in that particular row only. On a rectangular array every arr[i].length happens to return the same number, which is why the distinction is easy to forget until a jagged array makes the two answers genuinely different.' },
    { q: 'Can the rows of a 2D array really have different lengths on the AP CSA exam?', a: 'Yes. Most course examples use rectangular 2D arrays, every row the same length, because that is simpler to reason about and covers most realistic problems, but Java places no requirement that rows match in length. A true jagged array, built with rows of different lengths in the initializer, is entirely legal and can appear in a free response question specifically to test whether a student\'s traversal code correctly asks each row for its own length instead of assuming one shared length for all of them.' },
  ]),

  H.cta({
    heading: 'Trace 2D array traversal until the order is automatic',
    body: 'Daily practice built around exactly this kind of nested-loop trace and row-versus-column reasoning, plus a full archive of free response questions that test Data Collections the way the real exam does.',
    links: [
      { href: '/pages/ap-csa-qotd-hub', text: 'Daily practice' },
      { href: '/pages/ap-csa-frq-archive', text: 'FRQ archive', alt: true },
    ],
  }),
  H.p('For the loop-tracing habits that make any nested-loop trace faster under time pressure, not just the 2D array case, see the <a href="/blogs/ap-csa/ap-csa-variable-table-tracing-method">guide to variable table tracing</a>.'),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('This is a concept guide, reviewed against the current AP CSA Course and Exam Description. Last reviewed October 6, 2026.'),
]);

module.exports = { meta, body };
