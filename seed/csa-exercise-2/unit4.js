'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CSA UNIT 4 EXERCISE 2 BANKS: APPLIED MCQ PRACTICE.
//
//  WHAT AN EXERCISE 2 IS FOR
//  Matches the established cross-course convention (see seed/csp-exercise-2/ and
//  docs/runs/2026-08-17-claude-code-csp-course-pages.md): exercise-1 is the
//  graded code editor, worth 1 point. exercise-2 is six applied, scenario-based
//  multiple choice questions per lesson, worth 6 points, already denominated for
//  every ap-csa lesson in seed/csa-course-manifest.js and already declared in
//  Unit 4's activities list in utils.js. This file is the missing content: the
//  exercise-2 column has existed since the manifest was written and nothing has
//  ever filled it. graded by default (lib/gradebook-contract.js: games_graded
//  defaults to true for every course except ap-csp).
//
//  ONLY THE SIX RECONTENTED LESSONS, ON PURPOSE
//  4.6, 4.7, 4.13, 4.14, 4.15 and 4.17 are the six lessons whose exercise-1 was
//  just rewritten to match the real CED (see the header of
//  seed/csa-exercises/unit4.js and docs/runs/2026-08-19-claude-code-csa-unit4-ced-mismatch.md).
//  Pairing corrected topic content with real applied practice for the same six
//  lessons is a complete, self-consistent unit of work. The other 11 Unit 4
//  lessons' exercise-2 stays unfilled for now, same posture CSA's own exercise-1
//  build took with the rest of the course: content ships incrementally, and an
//  unfilled column is not a new problem introduced here (course_denominators
//  already carries exercise-2 for every CSA lesson, filled or not).
//
//  QUESTION DESIGN
//  Every stem is a scenario, a trace, or a design judgement, never a bare
//  definition; the lesson's own exercise-1 already tests whether the student can
//  WRITE the code, so this bank tests whether they understand WHY it works or
//  fails. All four rationales are written, not just the correct one, matching
//  the CSP exercise-2 convention: a wrong answer that explains itself is the
//  part of a practice set that actually teaches.
//
//  Pure ASCII, no em-dashes. Zero PII: author content only.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = [
  {
    lesson: '4.6', unit: 'unit-4',
    title: 'Using Text Files',
    blurb: 'Six scenarios on driving a Scanner over data of unknown length, the same skill 4.6\'s exercise piped through standard input in place of a real file.',
    brief: 'The exercise-1 code editor asks you to WRITE the hasNextInt loop. These six ask whether you understand why it has to be shaped that way, and what breaks when it is not.',
    seo: 'Applied AP CSA 4.6 practice: six scenario questions on reading unknown-length data with Scanner and hasNextInt.',
    questions: [
      {
        tag: 'Apply',
        scenario: 'A program needs to read all integers from a text file of unknown length representing exam scores.',
        stem: 'Which loop control correctly reads every score without knowing the count ahead of time?',
        options: [
          'for (int i = 0; i < 100; i++) {\n  scores[i] = input.nextInt();\n}',
          'while (input.hasNextInt()) {\n  int score = input.nextInt();\n  ...\n}',
          'while (true) {\n  int score = input.nextInt();\n  ...\n}',
          'int score = input.nextInt();\nwhile (score != 0) {\n  ...\n  score = input.nextInt();\n}',
        ],
        correct: 'B',
        why: {
          A: 'Hardcodes 100, which is wrong the moment the file does not have exactly 100 scores, either throwing too soon or leaving data unread.',
          B: 'hasNextInt checks without consuming, so the loop stops exactly when the data runs out. This is the correct pattern.',
          C: 'Never terminates on its own and throws NoSuchElementException once input runs out, exactly the exception hasNextInt exists to avoid.',
          D: 'Assumes 0 is a sentinel that will never appear in real data, but an exam score of 0 is entirely possible.',
        },
      },
      {
        tag: 'Analyze',
        scenario: "A student's file-reading loop crashes with NoSuchElementException on the last line of a real input file.",
        stem: 'What is the most likely cause?',
        options: [
          'The file contains a negative number, which Scanner cannot parse',
          'The loop calls nextInt() at least once more than hasNextInt() actually confirmed there was data for',
          'The file has too many blank lines',
          'The Scanner was never closed',
        ],
        correct: 'B',
        why: {
          A: 'Negative numbers parse fine with nextInt.',
          B: 'This is the classic bug: reading past what hasNextInt actually checked, usually from checking it once outside a loop and calling nextInt() twice inside.',
          C: 'Blank lines are whitespace that Scanner simply skips over.',
          D: 'An unclosed Scanner is a resource leak, not the cause of this exception.',
        },
      },
      {
        tag: 'Apply',
        scenario: 'Judge0 has no filesystem, so a "read a text file" exercise pipes its contents through standard input instead.',
        stem: 'Which statement about the Scanner code the student writes is true?',
        options: [
          'The code must be completely different from code that reads an actual file',
          'Scanner(System.in) and Scanner(new File(...)) are driven by the exact same hasNext and next methods, so the reading logic is identical either way',
          'Scanner cannot read from standard input at all, only from files',
          'Reading from standard input never throws the exceptions file reading can throw',
        ],
        correct: 'B',
        why: {
          A: 'The whole point of the substitution is that the reading logic transfers directly.',
          B: 'Correct. Scanner works over any Readable source, and the method calls that drive it do not change based on where the data came from.',
          C: 'Scanner(System.in) is the standard way to read console or piped input in Java.',
          D: 'Both can throw NoSuchElementException when read incorrectly.',
        },
      },
      {
        tag: 'Evaluate',
        scenario: 'Student A guards a read loop with while (input.hasNextInt()). Student B guards the same loop with while (input.hasNext()).',
        stem: "Why is Student A's version safer for a file guaranteed to hold only integers?",
        options: [
          'hasNext() is slower than hasNextInt()',
          'hasNextInt() confirms the next token can actually parse as an int before nextInt() is called, catching a malformed token in the loop condition rather than crashing nextInt() itself',
          'hasNext() cannot be used together with nextInt() at all',
          'There is no real difference between the two',
        ],
        correct: 'B',
        why: {
          A: 'Speed is not the relevant difference here.',
          B: 'Correct. hasNext() only confirms a token exists, not that it parses as an int, so a bad token can still make nextInt() throw InputMismatchException inside a hasNext()-guarded loop.',
          C: 'They can be combined, just with exactly this risk.',
          D: 'There is a real, exam-relevant difference between the two guards.',
        },
      },
      {
        tag: 'Analyze',
        scenario: 'A file has zero numbers in it: an empty file.',
        stem: 'What should a well written "read until it runs out" loop do?',
        options: [
          'Throw an exception, since an empty file is invalid input',
          'The loop body never executes even once, and the program continues normally with whatever default totals it started with',
          'Read one garbage value before detecting the file is empty',
          'Loop forever, since there is nothing to stop it',
        ],
        correct: 'B',
        why: {
          A: 'An empty file is a legitimate case a robust program must handle without crashing.',
          B: 'Correct. hasNextInt() returns false immediately, so a while loop guarded by it simply never runs.',
          C: 'Nothing is read at all if hasNextInt() is false from the start.',
          D: 'hasNextInt() staying permanently false is exactly what ends the loop.',
        },
      },
      {
        tag: 'Apply',
        scenario: 'A program must read a mix of words and numbers from a file, summing only the numbers and skipping non-numeric tokens instead of crashing.',
        stem: 'Which approach handles this correctly?',
        options: [
          'Call nextInt() on every token regardless of type',
          'Check hasNextInt() before each token; consume it with nextInt() and add it to the sum if true, or consume it with next() and discard it if false',
          'Wrap the entire read loop in one try/catch and ignore every exception',
          'Read the whole file with nextLine() and split on spaces',
        ],
        correct: 'B',
        why: {
          A: 'Calling nextInt() on a non-numeric token throws InputMismatchException.',
          B: 'Correct. hasNextInt() lets the program branch on token type before consuming it, handling both cases explicitly.',
          C: 'Catching everything hides real bugs and does not correctly separate numbers from words; it just limps forward.',
          D: 'Splitting on spaces reinvents what Scanner already does and does not itself solve the type-checking problem.',
        },
      },
    ],
  },
  {
    lesson: '4.7', unit: 'unit-4',
    title: 'Wrapper Classes',
    blurb: 'Six scenarios on parsing, boxing and comparing Integer and Double objects, the skills exercise-1 grades directly.',
    brief: 'The exercise-1 code editor asks you to use parseInt, valueOf and compareTo correctly. These six ask why == is dangerous on boxed values and where an overflow check actually has to happen.',
    seo: 'Applied AP CSA 4.7 practice: six scenario questions on Integer parsing, boxing, compareTo and overflow.',
    questions: [
      {
        tag: 'Apply',
        scenario: 'A program reads the String "42" from user input and needs to use it in arithmetic.',
        stem: 'Which correctly converts it to a usable int?',
        options: [
          'int x = "42";',
          'int x = Integer.parseInt("42");',
          'int x = (int) "42";',
          'int x = Integer("42");',
        ],
        correct: 'B',
        why: {
          A: 'A String cannot be assigned directly to an int; this is a compile error.',
          B: 'Correct. This is exactly what Integer.parseInt converts a numeral String into.',
          C: 'Casting a String to int is not a legal cast in Java.',
          D: 'Integer is a class; calling it like this without new is not valid object creation syntax.',
        },
      },
      {
        tag: 'Analyze',
        scenario: 'A method parameter is declared Integer count instead of int count.',
        stem: 'What is the practical difference a student is most likely to run into?',
        options: [
          'Integer can hold larger numbers than int',
          'Integer is an object and can be null, while a primitive int can never be null; passing a null Integer where arithmetic expects a value throws NullPointerException',
          'There is no difference; they behave identically in every situation',
          'int is deprecated in favor of Integer',
        ],
        correct: 'B',
        why: {
          A: 'Both wrap the same 32 bit range; boxing does not extend it.',
          B: 'Correct. This nullability gap is the practical, exam-relevant reason wrapper classes matter.',
          C: 'They differ specifically around null and object identity.',
          D: 'int is not deprecated; both are used constantly, for different reasons.',
        },
      },
      {
        tag: 'Apply',
        scenario: 'Two Integer objects, a and b, both currently hold the value 200.',
        stem: 'Which comparison correctly and reliably checks whether they represent the same numeric value?',
        options: [
          'a == b',
          'a.compareTo(b) == 0, or equivalently a.equals(b)',
          'a.toString() == b.toString()',
          'a > b',
        ],
        correct: 'B',
        why: {
          A: '== on two Integer objects compares object identity, not value, and is not guaranteed true for boxed values outside the small cached range.',
          B: 'Correct. compareTo returning 0, or equals returning true, both correctly compare the wrapped values.',
          C: '== on two Strings compares references too, the same trap as A.',
          D: 'Object references are not comparable with > in the way this option implies; compareTo is the safe, correct tool.',
        },
      },
      {
        tag: 'Evaluate',
        scenario: 'A student writes if (sum + increase > Integer.MAX_VALUE), where sum and increase are both int, to check for overflow.',
        stem: 'Why does this check fail to catch the overflow it is trying to detect?',
        options: [
          'Integer.MAX_VALUE is the wrong constant to compare against',
          'sum + increase is computed as an int first, so if it overflows it silently wraps to a negative number before the comparison ever runs, and a wrapped negative number is never greater than MAX_VALUE',
          'The > operator does not work with Integer.MAX_VALUE',
          'This check works correctly and does catch the overflow',
        ],
        correct: 'B',
        why: {
          A: 'MAX_VALUE is the right constant; the problem is the timing of when overflow happens relative to the check.',
          B: 'Correct. The addition overflows in int arithmetic before the > check ever sees the result, so the check inspects a number that has already wrapped.',
          C: 'The operator works fine syntactically.',
          D: 'This is exactly the bug being tested. A correct check widens to long first, for example (long) sum + increase > Integer.MAX_VALUE.',
        },
      },
      {
        tag: 'Analyze',
        scenario: 'A program reads "3.14" as text and needs to store it as a number that supports decimal precision.',
        stem: 'Which conversion is correct?',
        options: [
          'int x = Integer.parseInt("3.14");',
          'double x = Double.parseDouble("3.14");',
          'double x = "3.14";',
          'double x = Double.valueOf(3.14);',
        ],
        correct: 'B',
        why: {
          A: 'Integer.parseInt throws NumberFormatException on any input containing a decimal point.',
          B: 'Correct. This is exactly what Double.parseDouble converts a numeral String into.',
          C: 'A String cannot be assigned directly to a double; compile error.',
          D: 'This boxes an already-numeric double literal rather than parsing text, so it does not solve the stated problem of converting a String.',
        },
      },
      {
        tag: 'Apply',
        scenario: 'A grading program stores scores in an ArrayList<Integer> rather than an int[].',
        stem: 'What must happen for a primitive int value to go into that list?',
        options: [
          'Nothing extra; ArrayList<Integer> can store primitive ints directly with no conversion',
          'The int is automatically boxed into an Integer object by the compiler when it is added, a process called autoboxing',
          'The program must fail to compile, since a list of Integer objects cannot hold int values',
          'The value must first be converted to a String and then parsed back',
        ],
        correct: 'B',
        why: {
          A: 'ArrayList can only hold objects, never primitives directly; something has to happen even if it looks automatic.',
          B: 'Correct. Autoboxing inserts the Integer.valueOf conversion for the student, which is why list.add(someInt) compiles at all.',
          C: 'It compiles and runs fine; autoboxing makes it work transparently.',
          D: 'No String round trip is involved; it is a direct object-boxing step.',
        },
      },
    ],
  },
  {
    lesson: '4.13', unit: 'unit-4',
    title: 'Implementing 2D Array Algorithms',
    blurb: 'Six scenarios on row and column sums, locating a maximum, and building a transpose, the algorithms exercise-1 grades directly.',
    brief: "The exercise-1 code editor asks you to WRITE the row, column and transpose loops. These six ask why the seed value, the loop nesting, or the comparison operator has to be exactly what it is.",
    seo: 'Applied AP CSA 4.13 practice: six scenario questions on row sums, column sums, the maximum value and transposing a grid.',
    questions: [
      {
        tag: 'Apply',
        scenario: 'A program needs the sum of every value in row 2 of a 2D array grid.',
        stem: 'Which loop correctly computes it?',
        options: [
          'for (int c = 0; c < grid.length; c++) {\n  sum += grid[2][c];\n}',
          'for (int c = 0; c < grid[2].length; c++) {\n  sum += grid[2][c];\n}',
          'for (int r = 0; r < grid.length; r++) {\n  sum += grid[r][2];\n}',
          'for (int c = 0; c < grid[0].length; c++) {\n  sum += grid[c][2];\n}',
        ],
        correct: 'B',
        why: {
          A: 'grid.length is the number of ROWS, not how many columns row 2 has, so this only happens to work on a square grid rather than by correct reasoning.',
          B: 'Correct. grid[2].length is exactly how many columns row 2 has, and grid[2][c] walks across that row.',
          C: 'This sums COLUMN 2 down every row, not row 2 across every column.',
          D: 'This indexes grid[c][2], walking the wrong axis entirely.',
        },
      },
      {
        tag: 'Analyze',
        scenario: 'A student writes nested loops to find the largest value in a grid and initializes int max = 0; before scanning.',
        stem: 'What is wrong with this approach?',
        options: [
          'Nothing; 0 is always a safe starting value',
          'If every value in the grid is negative, max stays 0, which is not actually in the grid and is larger than every real value, so the reported maximum is wrong',
          'int cannot be initialized to 0 in Java',
          'The nested loops will not compile',
        ],
        correct: 'B',
        why: {
          A: '0 is only safe when the grid is guaranteed to hold a non-negative value, which is not a reasonable general assumption.',
          B: 'Correct. Seeding from grid[0][0] instead avoids this entirely by starting from a value that actually exists in the grid.',
          C: 'This is valid Java.',
          D: 'The loops compile fine; this is a logic bug, not a syntax one.',
        },
      },
      {
        tag: 'Apply',
        scenario: 'A grid has 3 rows and 5 columns. A method needs to build its transpose.',
        stem: 'What are the dimensions of the correctly transposed grid?',
        options: [
          '3 rows and 5 columns, same as the original',
          '5 rows and 3 columns',
          '15 rows and 15 columns',
          '3 rows and 3 columns',
        ],
        correct: 'B',
        why: {
          A: 'A transpose swaps the roles of rows and columns; keeping the same shape is only correct for a square grid.',
          B: 'Correct. A transpose of an r by c grid is a c by r grid, so 3 by 5 becomes 5 by 3.',
          C: 'This squares the dimensions, which has no basis in what a transpose does.',
          D: 'This keeps only one of the two original dimensions and drops information.',
        },
      },
      {
        tag: 'Evaluate',
        scenario: "Student A's best-row-sum loop starts int bestRowSum = 0; and compares rowSum > bestRowSum with no other condition. Student B's loop starts the same way but adds if (r == 0 || rowSum > bestRowSum).",
        stem: "Why does Student B's version work correctly on a grid of entirely negative numbers while Student A's does not?",
        options: [
          "Student B's code will not compile",
          'The r == 0 condition forces row 0 to always be accepted as the best-so-far on the first pass, regardless of whether its sum beats the useless 0 seed, correctly establishing a real starting point',
          'There is no actual difference between the two approaches',
          "Student A's mistake is using > instead of >=",
        ],
        correct: 'B',
        why: {
          A: 'It compiles and runs fine.',
          B: 'Correct. This is the standard fix for a bad seed value: force the first real value in regardless of the comparison.',
          C: 'The difference is exactly what makes B correct on all-negative input and A wrong.',
          D: 'Switching to >= does not fix a bad seed value; the seed itself is the problem.',
        },
      },
      {
        tag: 'Analyze',
        scenario: 'A student traverses a grid to compute the total sum of all values, then separately claims this traversal also tells them which row had the largest row sum.',
        stem: 'What is the flaw in that second claim?',
        options: [
          'The traversal is illegal Java',
          'A traversal that only accumulates one grand total carries no information about which row contributed the most; that requires a per-row running total compared against the others, which this code never keeps',
          'Every row always has the same number of elements',
          'The claim is correct; the total sum traversal already tracks this',
        ],
        correct: 'B',
        why: {
          A: 'Nested for loops over a 2D array are completely legal and standard.',
          B: 'Correct. Collapsing everything into one running total discards exactly the per-row breakdown that "which row" requires.',
          C: 'A rectangular grid having equal row lengths is unrelated to whether a single grand total can identify a specific row.',
          D: 'The claim is false for the reason given in B.',
        },
      },
      {
        tag: 'Apply',
        scenario: 'A method needs to find the row and column of the largest value in a grid, breaking ties by keeping the FIRST occurrence in row major order.',
        stem: 'Which comparison correctly enforces "first occurrence wins" on a tie?',
        options: [
          'if (grid[r][c] >= maxValue) {\n  update\n}',
          'if (grid[r][c] > maxValue) {\n  update\n}',
          'if (grid[r][c] == maxValue) {\n  update\n}',
          'if (grid[r][c] != maxValue) {\n  update\n}',
        ],
        correct: 'B',
        why: {
          A: '>= replaces the recorded position every time an equal value appears later, keeping the LAST occurrence instead of the first.',
          B: 'Correct. A strict > only updates on a genuinely bigger value, so the first time the true maximum is reached it is recorded and never overwritten by a later equal value.',
          C: 'This updates on every match to the current max, not what "largest value" logic should check.',
          D: 'This updates on everything that is NOT equal to the current max, including smaller values, which is backwards.',
        },
      },
    ],
  },
  {
    lesson: '4.14', unit: 'unit-4',
    title: 'Searching Algorithms',
    blurb: "Six scenarios on when linear search is the only safe choice and why binary search's speed depends entirely on sorted data.",
    brief: 'The exercise-1 code editor asks you to WRITE both searches and count their comparisons. These six ask why binary search breaks on unsorted data and how fast it really is.',
    seo: 'Applied AP CSA 4.14 practice: six scenario questions on linear search, binary search and their comparison counts.',
    questions: [
      {
        tag: 'Apply',
        scenario: 'An array of 1000 sorted integers needs to be searched for a target value as fast as possible.',
        stem: 'Which search algorithm is the right choice and why?',
        options: [
          'Linear search, because it always works regardless of order',
          'Binary search, because the data is already sorted, letting each comparison eliminate half the remaining range',
          'They perform identically on sorted data',
          'Linear search, because binary search only works on unsorted data',
        ],
        correct: 'B',
        why: {
          A: 'Linear search does always work, but "always works" is not the same as fastest once the data is known to be sorted.',
          B: "Correct. Binary search's advantage comes entirely from discarding half the remaining elements on each comparison, which requires sorted order.",
          C: 'Binary search is dramatically faster on large sorted data; the two are not comparable in cost.',
          D: 'This has it backwards: binary search REQUIRES sorted data, it does not avoid needing it.',
        },
      },
      {
        tag: 'Analyze',
        scenario: 'A student runs binary search on an UNSORTED array and gets an inconsistent result: sometimes the target is found, sometimes it reports -1 even though the target is present.',
        stem: 'What is the cause?',
        options: [
          'Binary search is a buggy algorithm',
          "Binary search's logic assumes the data is sorted so it can decide which half to discard; on unsorted data that assumption is false, so discarding a half can throw away the actual answer",
          'The array is too short for binary search to work',
          'This behavior means the target does not actually exist in the array',
        ],
        correct: 'B',
        why: {
          A: 'The algorithm is correct; it is being used outside the condition it depends on.',
          B: 'Correct. Every "go left" or "go right" decision assumes sortedness, and that assumption breaking is exactly why results become unreliable.',
          C: 'Array length is unrelated to this failure.',
          D: 'The target is present, per the scenario; the violated precondition is the actual cause.',
        },
      },
      {
        tag: 'Apply',
        scenario: 'A linear search finds a target at the very first index it checks.',
        stem: 'How many comparisons did it make, counting one comparison for each element actually examined?',
        options: [
          '0',
          '1',
          'The length of the array',
          'It depends on where in memory the array starts',
        ],
        correct: 'B',
        why: {
          A: 'At least one element had to be examined and compared to reach the answer at all.',
          B: 'Correct. Exactly one element was looked at before the match was found.',
          C: 'This would only be true for a target found at the last position, or one not found at all.',
          D: 'Memory layout has nothing to do with this count.',
        },
      },
      {
        tag: 'Evaluate',
        scenario: 'A sorted array of length 1,000,000 is searched for a value that is NOT present. Student A estimates binary search will need roughly 20 comparisons. Student B estimates it will need roughly 1,000,000.',
        stem: 'Which estimate is right and why?',
        options: [
          'Student B, because a not-found result always has to check every element',
          'Student A, because each comparison cuts the remaining range in half, so it takes only about log base 2 of the array length to run out of range, whether or not the target is found',
          'Neither; binary search cannot determine that a value is absent',
          'Student B, because sorted data makes searches slower',
        ],
        correct: 'B',
        why: {
          A: "This describes linear search's worst case, not binary search's.",
          B: 'Correct. log2(1,000,000) is about 20, and binary search reaches an empty range in that many steps whether the outcome is found or not found.',
          C: 'Binary search reliably reports absence once the range empties out, exactly as the not-found case tests.',
          D: 'Sortedness is what makes binary search fast, not slow.',
        },
      },
      {
        tag: 'Analyze',
        scenario: 'A binary search implementation computes mid as (low + high) / 2 using int division.',
        stem: 'What happens when low = 4 and high = 5?',
        options: [
          'mid = 4.5, a compile error results',
          'mid = 4, because 9 / 2 truncates to 4 under integer division',
          'mid = 5, because Java always rounds up',
          'This causes an infinite loop',
        ],
        correct: 'B',
        why: {
          A: 'Int division never produces a fractional result at runtime; no compile error occurs here.',
          B: 'Correct. (4 + 5) / 2 is 9 / 2, which is 4 under Java integer division, which truncates.',
          C: "Java's integer division truncates toward zero; it does not round up.",
          D: 'This specific computation does not by itself cause an infinite loop; the range-shrinking logic is what prevents that.',
        },
      },
      {
        tag: 'Apply',
        scenario: 'A search needs to run on data that changes order between calls and cannot be assumed sorted.',
        stem: 'Which search is the only reliably correct choice, regardless of speed?',
        options: [
          'Binary search, because it is always faster',
          'Linear search, because it makes no assumption about order and checks every element until it finds a match or runs out',
          'Neither works on data whose order is unknown',
          'Binary search, run twice to be safe',
        ],
        correct: 'B',
        why: {
          A: "Speed is irrelevant if the answer can be wrong, and binary search's correctness depends on sorted order that is not guaranteed here.",
          B: "Correct. Linear search's lack of any ordering assumption is exactly what makes it safe on data whose sortedness is unknown.",
          C: 'Linear search works correctly on data in any order.',
          D: 'Running an order-dependent algorithm twice does not fix a false assumption it depends on.',
        },
      },
    ],
  },
  {
    lesson: '4.15', unit: 'unit-4',
    title: 'Sorting Algorithms',
    blurb: 'Six scenarios on selection sort and insertion sort, tracing swaps, shifts, and why two correct sorts must agree on the final order.',
    brief: 'The exercise-1 code editor asks you to WRITE and count both sorts. These six ask you to trace them by hand and reason about what a correct swap or shift count actually measures.',
    seo: 'Applied AP CSA 4.15 practice: six scenario questions on selection sort, insertion sort, and their swap and shift counts.',
    questions: [
      {
        tag: 'Apply',
        scenario: 'Selection sort is run on the array [5, 1, 4, 2].',
        stem: 'What does the array look like after the first full pass of the outer loop, which finds and places the smallest remaining value into position 0?',
        options: [
          '[1, 5, 4, 2]',
          '[5, 1, 4, 2]',
          '[1, 2, 4, 5]',
          '[2, 1, 4, 5]',
        ],
        correct: 'A',
        why: {
          A: 'Correct. The smallest value overall is 1, at index 1, so it swaps with index 0, giving [1, 5, 4, 2].',
          B: 'This is the unchanged original, meaning no swap happened, which is wrong since 1 is not already at index 0.',
          C: 'This is the fully sorted array, which one pass has not reached yet.',
          D: 'This swaps the wrong two positions.',
        },
      },
      {
        tag: 'Analyze',
        scenario: 'A student claims insertion sort and selection sort always perform the exact same number of comparisons on the same input.',
        stem: 'Is this claim correct?',
        options: [
          'Yes, both algorithms are mathematically identical',
          'No; selection sort always scans the entire remaining unsorted section on every pass regardless of how sorted the data already is, while insertion sort can stop early, so their work differs based on how sorted the input already is',
          'Yes, because both are quadratic in the worst case',
          'No, because insertion sort always does more work than selection sort',
        ],
        correct: 'B',
        why: {
          A: 'They use different underlying logic and do different amounts of work on the same input.',
          B: "Correct. Insertion sort's ability to shortcut on nearly-sorted data versus selection sort's fixed full scan every pass is exactly why they are taught as distinct algorithms.",
          C: 'Sharing the same worst case growth class does not mean identical work on every input.',
          D: 'Insertion sort can do LESS work than selection sort on nearly-sorted input, the opposite of this claim.',
        },
      },
      {
        tag: 'Apply',
        scenario: 'Insertion sort processes the array [3, 1, 2] starting from index 1.',
        stem: 'How many total shift operations occur while placing every element, counting each move of an existing element one position right but not the final placement of the key?',
        options: [
          '0',
          '1',
          '2',
          '3',
        ],
        correct: 'C',
        why: {
          A: 'At least one shift is required since the array is not already sorted.',
          B: 'This undercounts; more than one element has to move.',
          C: 'Correct. Placing 1 shifts 3 right once, and placing 2 shifts 3 right once more, a total of 2 shifts.',
          D: 'This overcounts the actual number of element moves this input requires.',
        },
      },
      {
        tag: 'Evaluate',
        scenario: 'One grader counts a selection sort swap only when the smallest remaining element is not already in its correct position. A second grader counts a swap on every pass regardless.',
        stem: 'Why does the first, conditional counting convention give a more meaningful number?',
        options: [
          'It does not matter; both conventions always produce the same count',
          'Counting only real swaps reflects the actual work the algorithm does; an element already in the right spot being swapped with itself is not real work and inflates the count without reflecting anything true about the effort made',
          'The conditional version is required by the Java language',
          'The unconditional version is always more accurate',
        ],
        correct: 'B',
        why: {
          A: 'The two counts differ whenever any pass finds the smallest element already in place.',
          B: 'Correct. A self-swap changes nothing and should not be counted as work performed.',
          C: 'This is a design choice in how the exercise counts, not a language requirement.',
          D: "The unconditional version overstates the algorithm's actual work.",
        },
      },
      {
        tag: 'Analyze',
        scenario: 'A student sorts the same original array with both selection sort and insertion sort, and gets two different-looking arrays as the final result.',
        stem: 'What does this indicate?',
        options: [
          'This is expected; different algorithms always produce different final orders',
          'At least one of the two implementations has a bug, since any correct sorting algorithm run on the same input must produce the same final sorted order',
          'The two algorithms disagree only when the input contains duplicate values',
          'This is impossible to detect with code',
        ],
        correct: 'B',
        why: {
          A: 'Sorting has exactly one correct final order for a given input; different ALGORITHMS can differ in the work they do, never in the correct final RESULT.',
          B: 'Correct. This is exactly why an exercise like this checks that the two results agree, as a built-in correctness check on both implementations.',
          C: 'Duplicates do not change this guarantee; a correct sort places any values, duplicates included, in the same nondecreasing order.',
          D: 'Comparing the two resulting arrays for equality is a straightforward, detectable check.',
        },
      },
      {
        tag: 'Apply',
        scenario: 'An array is already fully sorted before insertion sort even starts.',
        stem: 'What happens?',
        options: [
          'Insertion sort crashes, since there is nothing to sort',
          'The while loop inside each insertion never finds a larger element to shift past, so it never runs, and the final result equals the original array with zero shifts',
          "Insertion sort always performs its maximum possible number of shifts anyway",
          'Insertion sort reverses the array by mistake',
        ],
        correct: 'B',
        why: {
          A: 'Sorting an already-sorted array is a completely valid, common case that should complete normally.',
          B: "Correct. Every insertion's while-loop condition, checking whether the previous element is bigger, is immediately false on already-sorted data, so no shifting occurs.",
          C: 'This describes the WORST case, reverse-sorted data, not already-sorted data.',
          D: 'Nothing in insertion sort reverses order; it only ever moves elements to restore increasing order.',
        },
      },
    ],
  },
  {
    lesson: '4.17', unit: 'unit-4',
    title: 'Recursive Searching and Sorting',
    blurb: 'Six scenarios on the base cases and call structure of recursive binary search and merge sort, the algorithms exercise-1 grades directly.',
    brief: 'The exercise-1 code editor asks you to WRITE both recursive methods. These six ask why a base case has to exist, what happens without one, and why merging two sorted halves back together does not itself need to be recursive.',
    seo: 'Applied AP CSA 4.17 practice: six scenario questions on recursive binary search and recursive merge sort.',
    questions: [
      {
        tag: 'Apply',
        scenario: 'A recursive binary search method is called with low = 0 and high = -1.',
        stem: 'What should happen?',
        options: [
          'The method should compute a mid value and keep searching',
          'This is the base case: low > high means the search range is empty, so the method should return immediately without a recursive call, typically returning -1',
          'This causes infinite recursion',
          'This is an invalid call that should never be checked for',
        ],
        correct: 'B',
        why: {
          A: 'Continuing to search an empty range makes no sense and risks an invalid array access.',
          B: 'Correct. low > high is exactly the signal that the range is exhausted without finding the target, which is why it is checked first, before computing mid.',
          C: 'Checking this condition first is precisely what PREVENTS infinite recursion.',
          D: 'Every recursive binary search hits this case on any unsuccessful search; it must be checked for.',
        },
      },
      {
        tag: 'Analyze',
        scenario: "A student's recursive mergeSort method has no explicit base case check.",
        stem: 'What is the most likely consequence?',
        options: [
          'It sorts correctly but slowly',
          'It recurses forever trying to split arrays that are already length 0 or 1, since there is nothing left to split, eventually causing a StackOverflowError',
          'It sorts the array in reverse order',
          'Nothing; Java infers the base case automatically',
        ],
        correct: 'B',
        why: {
          A: 'This is not a speed problem; it is a termination problem.',
          B: "Correct. Every recursive method needs an explicit stopping condition, and mergeSort's natural one is an array too short to split further.",
          C: 'A missing base case causes non-termination, not a reversal.',
          D: 'Java does not infer recursive base cases; the programmer must write the check.',
        },
      },
      {
        tag: 'Apply',
        scenario: 'mergeSort splits an array of length 7 using mid = data.length / 2 as the split point.',
        stem: 'What are the lengths of the two halves it recurses on?',
        options: [
          '3 and 4',
          '4 and 3',
          '3 and 3',
          '4 and 4',
        ],
        correct: 'A',
        why: {
          A: 'Correct. 7 / 2 is 3 under integer division, so the left half gets indices 0 through 2, length 3, and the right half gets the remaining indices, length 4.',
          B: 'This reverses which half is which; the standard split puts the smaller half first.',
          C: 'This drops one element entirely; 3 plus 3 does not account for all 7.',
          D: 'This double counts; 4 plus 4 is more elements than the original array has.',
        },
      },
      {
        tag: 'Evaluate',
        scenario: 'A student argues the merge step of merge sort should also be written recursively, "to keep the whole algorithm consistent."',
        stem: 'Is this a good design choice?',
        options: [
          'Yes, every part of any sorting algorithm must be recursive by definition',
          'Not necessarily; the divide-and-conquer structure of mergeSort needs recursion because it repeatedly reduces the problem to a smaller version of itself, but merging two already-sorted arrays is one linear pass with no smaller version of itself to recurse into, so a loop is the natural tool there',
          'No, because Java does not allow a private helper method to use a loop',
          'No, because a recursive merge would sort incorrectly',
        ],
        correct: 'B',
        why: {
          A: 'Not every step of an algorithm needs to be recursive; recursion fits problems with a natural smaller-subproblem structure, and merging already-sorted lists is not that kind of problem.',
          B: "Correct. This is exactly why merge sort's own merge helper is conventionally iterative even though the surrounding sort is recursive.",
          C: 'Private helper methods can freely use loops; there is no such restriction.',
          D: 'A correctly written recursive merge is possible; it is unnecessary complexity, not a correctness issue.',
        },
      },
      {
        tag: 'Analyze',
        scenario: 'A recursive method searchCalls(data, target, low, high) is written to mirror binarySearch exactly, but returns a call count instead of an index.',
        stem: 'Why does its base case return 1 instead of 0?',
        options: [
          'It is an arbitrary choice with no real reason',
          'The base case represents the final call in the chain, and that call itself counts as one of the calls made, so it must contribute 1 to the running total rather than 0',
          'Returning 0 would cause a compile error',
          'searchCalls must always return an even number',
        ],
        correct: 'B',
        why: {
          A: 'The choice is deliberate and tied to what is actually being counted.',
          B: 'Correct. If the base case returned 0, the count would always be one short, since the call that hits the base case is a real call and needs to be counted.',
          C: 'Returning 0 compiles fine; it is just the wrong count.',
          D: 'There is no such parity requirement on the result.',
        },
      },
      {
        tag: 'Apply',
        scenario: 'A student wants to estimate how many times a recursive binary search on a sorted array of length 8 calls itself in the worst case, where the target is absent.',
        stem: 'Roughly how many calls should the student expect, and why?',
        options: [
          '8, one for every element in the array',
          'Around 4, because the range roughly halves on each call, log base 2 of 8 is 3, and it takes about that many halvings plus the final call that discovers the empty range',
          '1, because recursion always finds the answer immediately',
          'It cannot be determined without running the code',
        ],
        correct: 'B',
        why: {
          A: "This describes linear search's worst case, not the halving behavior of binary search.",
          B: "Correct. Binary search's efficiency comes from call count growing with log base 2 of the array length rather than with the length itself.",
          C: 'Recursion does not skip the actual work of narrowing the search range.',
          D: "The halving structure of the algorithm makes this predictable in general terms, which is exactly what this question is testing.",
        },
      },
    ],
  },
];
