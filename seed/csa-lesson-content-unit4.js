'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CSA UNIT 4 LESSON CONTENT: THE SIX RECONTENTED LESSONS.
//
//  Corrected instructional content for 4.6, 4.7, 4.13, 4.14, 4.15 and 4.17,
//  whose LIVE Shopify lesson pages were confirmed (2026-08-21, direct query
//  against the storefront) to still teach the pre-mismatch-fix topic: title
//  and full body, not just a stale label. See
//  docs/runs/2026-08-19-claude-code-csa-unit4-ced-mismatch.md for how the
//  mismatch was found and docs/runs/2026-08-20-claude-code-csa-unit4-ced-fix.md
//  for the exercise-side fix that came first.
//
//  HANDLES CHANGE, ON PURPOSE
//  Each lesson's handle here matches the NEW handle seed/csa-exercises/unit4.js
//  already uses for that lesson's exercise-1 page (e.g. 4.6 is
//  ap-csa-lesson-4-6-using-text-files, not ...-arrays-as-parameters). Keeping
//  the old handle while fixing only the title and body would leave a URL that
//  still says the wrong topic. The exercise pages already point at these new
//  handles; this makes the lesson pages agree.
//
//  10 MCQS PER LESSON, MATCHING THE LIVE TEMPLATE
//  5 "Practice Questions" plus 5 "Mastery" (Tier 3), the exact split every
//  other Unit 4 lesson page already uses (confirmed against the live
//  ap-csa-lesson-4-16-recursion page). Every traced-code question was hand
//  verified at least twice before being written down, and several were cross
//  checked against cases already verified through a real javac/java in
//  seed/csa-exercises/unit4.js's own reference solutions for the same topic
//  (4.15's mastery questions reuse the exact reverse-sorted [9,8,7,6] case
//  that exercise already proved: selection sort 2 swaps, insertion sort 6
//  shifts).
//
//  Rendered by lib/csa-lesson-render.js. Zero PII: author content only.
//  No em-dashes.
// ─────────────────────────────────────────────────────────────────────────────

const LESSONS = [
  // ── 4.6: Using Text Files ────────────────────────────────────────────────
  {
    lesson: '4.6', unit: 'unit-4',
    handle: 'ap-csa-lesson-4-6-using-text-files',
    title: 'Using Text Files',
    minutes: '35-45 min',
    tags: 'Scanner · File I/O · hasNextInt',
    metaDescription: 'AP CSA 4.6: Using Text Files. Read data with Scanner and File, handle FileNotFoundException, and drive a loop with hasNextInt on data of unknown length.',
    prevHandle: 'ap-csa-lesson-4-5-algorithms-with-arrays', prevLabel: 'Lesson 4.5: Algorithms with Arrays',
    nextHandle: 'ap-csa-lesson-4-7-wrapper-classes', nextLabel: 'Lesson 4.7: Wrapper Classes',
    learnObjectives: [
      'Read text data from a file using the `File` and `Scanner` classes.',
      'Handle `FileNotFoundException`, a checked exception the compiler requires you to catch or declare.',
      'Use `hasNextLine`, `hasNext` and `hasNextInt` to read a file without knowing its length in advance.',
      'Recognize why file-reading code has to plan for a file that might not exist or might be empty.',
    ],
    vocab: [
      { term: 'File', def: 'An object representing a path to a file on disk. Creating one does not guarantee the file actually exists.' },
      { term: 'FileNotFoundException', def: 'A checked exception a `Scanner` throws when it cannot locate the file it was given.' },
      { term: 'checked exception', def: 'An exception the compiler forces you to either catch or declare with `throws`. Code that does neither will not compile.' },
      { term: 'hasNextLine()', def: 'A `Scanner` method that reports whether another line of input remains, without consuming it.' },
      { term: 'delimiter', def: 'The character or characters `Scanner` uses to separate tokens. Whitespace by default.' },
    ],
    sections: [
      {
        heading: 'Opening a File',
        blocks: [
          { type: 'text', text: 'A `Scanner` can read from a file the same way it reads from the keyboard, once it is built on a `File` object instead of `System.in`.' },
          { type: 'code', src: 'import java.io.File;\nimport java.io.FileNotFoundException;\nimport java.util.Scanner;\n\nScanner input = new Scanner(new File("scores.txt"));' },
          { type: 'callout', kind: 'trap', title: 'This Line Alone Will Not Compile', text: '`new Scanner(new File(...))` can throw `FileNotFoundException`, and that exception is checked. A method that contains this line must either catch it or declare `throws FileNotFoundException` on its own signature, or the compiler refuses the whole file.', code: 'public static void main(String[] args) throws FileNotFoundException {\n    Scanner input = new Scanner(new File("scores.txt"));\n    // ...\n}' },
        ],
      },
      {
        heading: 'Reading a File Without Knowing Its Length',
        blocks: [
          { type: 'text', text: 'The same `hasNextInt` pattern used for unknown-length input on standard input works identically over a file, because both are just Scanner sources.' },
          { type: 'code', src: 'int total = 0;\nwhile (input.hasNextInt()) {\n    int value = input.nextInt();\n    total = total + value;\n}' },
          { type: 'callout', kind: 'warning', title: 'Check Before You Consume', text: 'Calling `nextInt()` when nothing is left throws `NoSuchElementException`. `hasNextInt()` checks without consuming, which is exactly what guards against that.' },
        ],
      },
      {
        heading: 'The Same Scanner, a Different Source',
        blocks: [
          { type: 'callout', kind: 'concept', title: 'Nothing About the Reading Logic Changes', text: '`Scanner(System.in)` and `Scanner(new File(...))` are driven by the exact same `hasNext`/`next` methods. A loop written to read unknown-length data from the keyboard reads a file the same way, because the source is the only thing that changed.' },
        ],
      },
    ],
    practiceQuestions: [
      {
        stem: 'Which statement about opening a file with `Scanner` is true?',
        options: [
          'new Scanner(new File("x.txt")) can throw FileNotFoundException, a checked exception that must be caught or declared',
          'new Scanner(new File("x.txt")) never fails, since File objects always exist',
          'FileNotFoundException is an unchecked exception, so handling it is optional',
          'Scanner cannot be built from a File object, only from System.in',
        ], correctIndex: 0,
        feedback: 'A File object can be created for a path that does not exist; the failure surfaces when Scanner tries to open it. That failure is FileNotFoundException, a checked exception, so it must be caught or declared.',
      },
      {
        stem: 'What does `hasNextLine()` do?',
        options: [
          'Reads and returns the next line, consuming it',
          'Deletes the current line from the file',
          'Reports whether another line exists, without consuming any input',
          'Reports whether the file itself exists',
        ], correctIndex: 2,
        feedback: 'hasNextLine() only checks; it never consumes a token or a line. nextLine() is the method that actually reads and returns one.',
      },
      {
        stem: 'Why does this code fail to compile?',
        code: 'public static void main(String[] args) {\n    Scanner input = new Scanner(new File("data.txt"));\n}',
        options: [
          'Scanner cannot be constructed from a File',
          'main methods are not allowed to open files',
          'File objects require their own try block by Java\'s syntax rules',
          'FileNotFoundException is a checked exception that main must either catch or declare with throws, and this code does neither',
        ], correctIndex: 3,
        feedback: 'The constructor call can throw a checked exception. Since main here neither catches it nor declares throws FileNotFoundException, the compiler refuses the file.',
      },
      {
        stem: 'What happens if `nextInt()` is called after `hasNextInt()` has already returned false?',
        options: ['It returns 0', 'It throws NoSuchElementException', 'It waits for more input to arrive', 'It safely returns the last value read again'],
        correctIndex: 1,
        feedback: 'Once hasNextInt() reports false, there is no more int-shaped data. Calling nextInt() anyway throws NoSuchElementException, exactly what the hasNextInt guard exists to prevent.',
      },
      {
        stem: 'A grader pipes a file\'s contents in on standard input instead of handing you a real file, since Judge0 has no filesystem. Which statement about the Scanner code you write is true?',
        options: [
          'The code must be completely different from code that reads an actual file',
          'Scanner cannot read from standard input at all',
          'Scanner(System.in) and Scanner(new File(...)) are driven by the exact same hasNext and next methods, so the same read loop works either way',
          'Reading from standard input never throws the exceptions file reading can throw',
        ], correctIndex: 2,
        feedback: 'The substitution works precisely because both are Scanner sources read through identical methods.',
      },
    ],
    masteryQuestions: [
      {
        stem: 'What does this print when data.txt is completely empty (holds nothing at all)?',
        code: 'Scanner input = new Scanner(new File("data.txt"));\nint count = 0;\nwhile (input.hasNextInt()) {\n    input.nextInt();\n    count++;\n}\nSystem.out.println(count);',
        options: ['0', 'A compile error', 'NoSuchElementException is thrown', 'Nothing prints; the program hangs waiting for input'],
        correctIndex: 0,
        feedback: 'hasNextInt() is false immediately on an empty file, so the loop body never runs and count stays at its initial value, 0.',
      },
      {
        stem: 'What kind of exception is FileNotFoundException, and what does that mean for code that opens a file?',
        options: [
          'Unchecked; handling it is optional',
          'It does not exist as a real class in java.io',
          'An Error rather than an Exception, so it can never be caught',
          'Checked; the compiler forces you to catch it or declare it with throws',
        ], correctIndex: 3,
        feedback: 'FileNotFoundException extends IOException, a checked exception, which is exactly why file-opening code needs a catch block or a throws declaration.',
      },
      {
        stem: 'Which of these correctly lets FileNotFoundException propagate out of main rather than catching it?',
        options: [
          'public static void main(String[] args) { ... }',
          'public static void main(String[] args) throws FileNotFoundException { ... }',
          'public static void main(String[] args) catches FileNotFoundException { ... }',
          'public static void main(String[] args) throws Exception.printStackTrace() { ... }',
        ], correctIndex: 1,
        feedback: 'throws is the keyword that declares a method may propagate a checked exception instead of handling it. catches is not a Java keyword, and D is not valid syntax at all.',
      },
      {
        stem: 'A student guards a loop reading integers with `hasNext()` instead of `hasNextInt()`. Why is this riskier on a file that is supposed to hold only integers?',
        options: [
          'hasNext() only confirms that a token exists at all, not that it will parse as an int, so a malformed token can still make nextInt() throw InputMismatchException',
          'hasNext() is always slower than hasNextInt()',
          'hasNext() cannot be combined with nextInt() at all',
          'There is no real difference between the two',
        ], correctIndex: 0,
        feedback: 'hasNext() checks for the presence of any token, not its shape. A stray non-numeric token passes the hasNext() check and then breaks nextInt().',
      },
      {
        stem: 'A program must total every value in a file without ever being told how many values it holds. Which loop is correct?',
        options: [
          'for (int i = 0; i < 100; i++) { total += input.nextInt(); }',
          'while (true) { total += input.nextInt(); }',
          'while (input.hasNextInt()) { total += input.nextInt(); }',
          'int n = input.nextInt(); while (n != -1) { total += n; n = input.nextInt(); }',
        ], correctIndex: 2,
        feedback: 'Hardcoding a count assumes a length that may be wrong; looping forever eventually throws once data runs out; assuming a -1 sentinel assumes a value that could legitimately appear in real data. Only the hasNextInt guard is correct for genuinely unknown length.',
      },
    ],
  },

  // ── 4.7: Wrapper Classes ─────────────────────────────────────────────────
  {
    lesson: '4.7', unit: 'unit-4',
    handle: 'ap-csa-lesson-4-7-wrapper-classes',
    title: 'Wrapper Classes',
    minutes: '35-45 min',
    tags: 'Autoboxing · parseInt · compareTo',
    metaDescription: 'AP CSA 4.7: Wrapper Classes. Learn autoboxing and unboxing, Integer.parseInt, comparing wrapped values with compareTo, and the MAX_VALUE constant.',
    prevHandle: 'ap-csa-lesson-4-6-using-text-files', prevLabel: 'Lesson 4.6: Using Text Files',
    nextHandle: 'ap-csa-lesson-4-8-arraylist-methods', nextLabel: 'Lesson 4.8: ArrayList Methods',
    learnObjectives: [
      'Convert between primitive types and their wrapper classes (`Integer`, `Double`) using autoboxing and unboxing.',
      'Use `Integer.parseInt` and `Double.parseDouble` to convert a `String` into a number.',
      'Compare wrapped values correctly with `compareTo`, and explain why `==` is unreliable on objects.',
      'Use the `MIN_VALUE` and `MAX_VALUE` constants to reason about a type\'s range.',
    ],
    vocab: [
      { term: 'wrapper class', def: 'A class like Integer or Double that holds a primitive value as an object, so it can be used wherever an object is required, such as inside an ArrayList.' },
      { term: 'autoboxing', def: 'The compiler automatically converting a primitive into its wrapper object, for example assigning an int where an Integer is expected.' },
      { term: 'unboxing', def: 'The reverse: automatically converting a wrapper object back into its primitive value to use in arithmetic.' },
      { term: 'Integer.parseInt', def: 'A static method that converts a String of digits into an int. Throws NumberFormatException on invalid input.' },
      { term: 'Integer.MAX_VALUE / MIN_VALUE', def: 'Named constants for the largest and smallest values an int can hold: 2147483647 and -2147483648.' },
    ],
    sections: [
      {
        heading: 'Why Wrapper Classes Exist',
        blocks: [
          { type: 'text', text: 'A generic collection like `ArrayList<Integer>` can only hold objects, and a primitive `int` is not an object. `Integer` is the object form of `int` that makes it possible to put whole numbers in a list at all.' },
          { type: 'code', src: 'ArrayList<Integer> scores = new ArrayList<Integer>();\nscores.add(95);              // autoboxing: int -> Integer\nint first = scores.get(0);   // unboxing: Integer -> int' },
          { type: 'text', text: 'The compiler inserts the boxing and unboxing automatically. Nothing about the syntax looks different from working with a plain `int`, which is exactly the point: it should feel invisible until it is not.' },
        ],
      },
      {
        heading: 'Parsing Strings into Numbers',
        blocks: [
          { type: 'text', text: 'Text typed by a user, or read from a file, always arrives as a String, even when it looks like a number. Converting it into something you can do arithmetic on is a separate step.' },
          { type: 'code', src: 'String text = "42";\nint value = Integer.parseInt(text);\n\nString decimal = "3.14";\ndouble d = Double.parseDouble(decimal);' },
          { type: 'callout', kind: 'trap', title: 'A Bad Token Throws, Not Fails Quietly', text: '`Integer.parseInt("abc")` throws `NumberFormatException` at runtime. There is no silent failure mode: either the text parses or the program crashes right there, which is exactly why the shape of the input matters.' },
        ],
      },
      {
        heading: 'Comparing Wrapped Values',
        blocks: [
          { type: 'text', text: '`compareTo` compares the VALUES two wrapper objects hold. `==` on two objects compares whether they are the same object in memory, which is a different question entirely.' },
          { type: 'code', src: 'Integer a = Integer.valueOf(200);\nInteger b = Integer.valueOf(200);\nSystem.out.println(a.compareTo(b));  // 0, meaning equal' },
          { type: 'callout', kind: 'warning', title: '== on Wrapper Objects Is Not Reliable', text: 'Two Integer objects can hold the same value while being different objects, so == can return false even when the values are equal. compareTo (or equals) is the comparison that actually answers "do these hold the same value."' },
        ],
      },
      {
        heading: 'The Range Constants',
        blocks: [
          { type: 'text', text: 'int arithmetic that exceeds Integer.MAX_VALUE wraps around silently rather than throwing, which is why a check has to happen before the overflow, not after.' },
          { type: 'callout', kind: 'example', title: 'Checking for Overflow Before It Happens', text: 'Widening to long before the multiplication lets the comparison see the true value instead of one that has already wrapped.', code: 'long doubled = (long) sum * 2;\nSystem.out.println(doubled > Integer.MAX_VALUE);' },
        ],
      },
    ],
    practiceQuestions: [
      {
        stem: 'Why can\'t a primitive int be stored directly in an ArrayList of int?',
        options: [
          'int values are too large for a list to hold',
          'ArrayList can only hold objects, and int is a primitive, not an object; Integer must be used instead',
          'Java forbids lists of numbers entirely',
          'ArrayList<int> is valid Java and this is not actually a problem',
        ], correctIndex: 1,
        feedback: 'Generic collections are typed to hold objects. Integer is the object form of int that makes ArrayList<Integer> possible.',
      },
      {
        stem: 'What is autoboxing?',
        options: [
          'Manually calling Integer.valueOf every time a value is needed',
          'The compiler automatically converting a primitive value into its wrapper object when an object is required',
          'Converting a wrapper object into a String',
          'A compile error caused by mixing int and Integer',
        ], correctIndex: 1,
        feedback: 'Autoboxing is the compiler-inserted conversion, not something the programmer writes out by hand.',
      },
      {
        stem: 'Which correctly converts the String "17" into a usable int?',
        options: ['int x = "17";', 'int x = Integer.parseInt("17");', 'int x = (int) "17";', 'int x = Integer("17");'],
        correctIndex: 1,
        feedback: 'A String cannot be assigned directly to an int, and it cannot be cast to one either. parseInt is the actual conversion.',
      },
      {
        stem: 'What does `Integer.parseInt("abc")` do?',
        options: ['Returns 0', 'Returns null', 'Throws NumberFormatException at runtime', 'Fails to compile'],
        correctIndex: 2,
        feedback: 'parseInt cannot make sense of non-numeric text, and it throws rather than guessing.',
      },
      {
        stem: 'Which correctly and reliably compares two Integer objects a and b for equal VALUE?',
        options: ['a == b', 'a.compareTo(b) == 0', 'a.toString() == b.toString()', 'a > b'],
        correctIndex: 1,
        feedback: '== compares object identity, not value, on two Integer objects. compareTo compares the actual wrapped values.',
      },
    ],
    masteryQuestions: [
      {
        stem: 'What is the risk in relying on this code always printing true?',
        code: 'Integer a = Integer.valueOf(500);\nInteger b = Integer.valueOf(500);\nSystem.out.println(a == b);',
        options: [
          'None; Java always reuses Integer objects for any value',
          'It may print false: a and b can be different objects holding an equal value, and == compares object identity rather than value, which is exactly why == on wrapper objects is unreliable',
          'This code does not compile',
          'It always prints true for any two equal Integer values, without exception',
        ], correctIndex: 1,
        feedback: 'Relying on == here depends on JVM-internal object caching behavior that is not guaranteed for every value, which is precisely the trap.',
      },
      {
        stem: 'What does this correctly detect, and why does the cast to long matter?',
        code: 'int sum = 2000000000;\nSystem.out.println((long) sum * 2 > Integer.MAX_VALUE);',
        options: [
          'It detects that doubling sum would overflow a 32 bit int; casting to long before multiplying avoids the overflow that would otherwise corrupt the comparison',
          'The cast does nothing; int arithmetic never overflows in Java',
          'This always prints false regardless of the value of sum',
          'Casting an int to long causes a compile error',
        ], correctIndex: 0,
        feedback: '2,000,000,000 doubled is 4,000,000,000, which exceeds Integer.MAX_VALUE (2,147,483,647). Widening to long before multiplying is what lets the comparison see the true, un-overflowed value.',
      },
      {
        stem: 'Which converts a String like "3.14" into a usable decimal number?',
        options: ['double x = Double.parseDouble("3.14");', 'int x = Integer.parseInt("3.14");', 'double x = "3.14";', 'double x = Double.valueOf(3.14);'],
        correctIndex: 0,
        feedback: 'Integer.parseInt throws on a decimal point. A String cannot be assigned to a double directly. Double.valueOf(3.14) boxes an already-numeric literal rather than parsing text, which is not what converting a String requires.',
      },
      {
        stem: 'What is Integer.MAX_VALUE and why does it matter when adding two large int values?',
        options: [
          'The largest value an int can hold (2147483647); adding two values whose sum exceeds it silently overflows, wrapping to a negative number rather than throwing',
          'A runtime limit that automatically throws an exception when exceeded',
          'A constant that only applies to Integer objects, never to a primitive int',
          'The same value as Long.MAX_VALUE, 9223372036854775807',
        ], correctIndex: 0,
        feedback: 'int overflow in Java is silent, not an exception. That silence is exactly why an overflow check has to be written deliberately, as in the earlier example.',
      },
      {
        stem: 'A program keeps scores in ArrayList<Integer> scores. Which line correctly adds the primitive value 88?',
        options: ['scores.add(88);', 'scores.add(Integer(88));', 'scores.add("88");', 'scores.addInt(88);'],
        correctIndex: 0,
        feedback: 'Autoboxing converts 88 into Integer.valueOf(88) automatically at the call site. Integer(88) without new is not valid Java, "88" is a String not a number, and addInt is not a real ArrayList method.',
      },
    ],
  },

  // ── 4.13: Implementing 2D Array Algorithms ───────────────────────────────
  {
    lesson: '4.13', unit: 'unit-4',
    handle: 'ap-csa-lesson-4-13-implementing-2d-array-algorithms',
    title: 'Implementing 2D Array Algorithms',
    minutes: '40-50 min',
    tags: '2D Arrays · Row/Column Sums · Transpose',
    metaDescription: 'AP CSA 4.13: Implementing 2D Array Algorithms. Compute row and column sums, locate the maximum value and its position, and build a transpose.',
    prevHandle: 'ap-csa-lesson-4-12-traversing-2d-arrays', prevLabel: 'Lesson 4.12: Traversing 2D Arrays',
    nextHandle: 'ap-csa-lesson-4-14-searching-algorithms', nextLabel: 'Lesson 4.14: Searching Algorithms',
    learnObjectives: [
      'Compute row and column sums by nesting a traversal loop with a running total.',
      'Locate the maximum (or minimum) value in a 2D array along with its row and column position.',
      'Build the transpose of a 2D array by swapping row and column indices into a new grid.',
      'Recognize that a correct row-sum algorithm and a correct column-sum algorithm nest their loops in opposite orders.',
    ],
    vocab: [
      { term: 'row-major order', def: 'Traversing a 2D array row by row: every column of row 0, then every column of row 1, and so on.' },
      { term: 'transpose', def: 'A new grid where row and column are swapped: transposed[c][r] equals original[r][c].' },
      { term: 'grid[r].length', def: 'The number of columns in row r. grid.length (no index) is the number of rows.' },
      { term: 'running total', def: 'A variable that accumulates a sum across a traversal, reset to 0 before each new sum begins.' },
    ],
    sections: [
      {
        heading: 'Summing One Row or One Column',
        blocks: [
          { type: 'text', text: 'A row sum walks across one row, holding the row index fixed. A column sum walks down one column, holding the column index fixed. The loops are mirror images of each other.' },
          { type: 'code', src: 'int rowSum = 0;\nfor (int c = 0; c < grid[r].length; c++) {\n    rowSum = rowSum + grid[r][c];\n}' },
          { type: 'code', src: 'int colSum = 0;\nfor (int r = 0; r < grid.length; r++) {\n    colSum = colSum + grid[r][c];\n}' },
          { type: 'text', text: 'Summing a row moves the COLUMN index and holds the row fixed. Summing a column does the opposite. Mixing them up compiles fine and gives the wrong answer, which is why it is worth naming the pattern explicitly.' },
        ],
      },
      {
        heading: 'Finding the Maximum and Its Position',
        blocks: [
          { type: 'code', src: 'int maxValue = grid[0][0];\nint maxRow = 0;\nint maxCol = 0;\nfor (int r = 0; r < grid.length; r++) {\n    for (int c = 0; c < grid[r].length; c++) {\n        if (grid[r][c] > maxValue) {\n            maxValue = grid[r][c];\n            maxRow = r;\n            maxCol = c;\n        }\n    }\n}' },
          { type: 'callout', kind: 'trap', title: 'Seed From a Real Value, Not From Zero', text: 'Seeding maxValue from 0 instead of grid[0][0] breaks the moment every value in the grid is negative: 0 would then be reported as the largest value, even though it never appears in the grid.' },
          { type: 'text', text: 'A strict `>` (not `>=`) keeps the FIRST occurrence of the maximum on a tie, since an equal later value never satisfies a strict greater-than test.' },
        ],
      },
      {
        heading: 'Building the Transpose',
        blocks: [
          { type: 'text', text: 'The transpose of a grid with R rows and C columns is a new grid with C rows and R columns, where every value changes which index it is read by.' },
          { type: 'code', src: 'int[][] transposed = new int[cols][rows];\nfor (int r = 0; r < rows; r++) {\n    for (int c = 0; c < cols; c++) {\n        transposed[c][r] = grid[r][c];\n    }\n}' },
        ],
      },
    ],
    practiceQuestions: [
      {
        stem: 'Which loop correctly computes the sum of row 2 of a rectangular grid?',
        options: [
          'for (int c = 0; c < grid.length; c++) sum += grid[2][c];',
          'for (int c = 0; c < grid[0].length; c++) sum += grid[c][2];',
          'for (int r = 0; r < grid.length; r++) sum += grid[r][2];',
          'for (int c = 0; c < grid[2].length; c++) sum += grid[2][c];',
        ], correctIndex: 3,
        feedback: 'grid[2].length is exactly how many columns row 2 has. grid.length is the ROW count, and using it as a column bound only happens to work on a square grid, not in general.',
      },
      {
        stem: 'A student seeds `int max = 0;` before scanning a grid for its largest value. What breaks on a grid of all negative numbers?',
        options: [
          'max stays 0, which is not an actual value in the grid and is larger than every real value, so the reported maximum is wrong',
          'Nothing; 0 is always a safe starting value',
          'The code fails to compile',
          'This only matters for grids larger than 10 by 10',
        ], correctIndex: 0,
        feedback: 'Seeding from grid[0][0] instead avoids this entirely, since that is guaranteed to be a real value from the grid.',
      },
      {
        stem: 'A 4-row, 6-column grid is transposed. What are the dimensions of the result?',
        options: ['4 rows, 6 columns (unchanged)', '24 rows, 24 columns', '6 rows, 4 columns', '10 rows, 10 columns'],
        correctIndex: 2,
        feedback: 'A transpose of an R by C grid is a C by R grid: 4 by 6 becomes 6 by 4.',
      },
      {
        stem: 'Which correctly builds the transpose of grid (rows by cols) into a new array t?',
        options: [
          'int[][] t = new int[rows][cols]; t[r][c] = grid[r][c];',
          'int[][] t = new int[cols][rows]; t[c][r] = grid[r][c];',
          'int[][] t = new int[cols][rows]; t[r][c] = grid[r][c];',
          'int[][] t = grid;',
        ], correctIndex: 1,
        feedback: 'The new array has swapped dimensions (cols rows, rows columns) and every value is written to its swapped position, t[c][r].',
      },
      {
        stem: 'Scanning in row-major order for the largest value, which comparison correctly keeps the FIRST occurrence on a tie?',
        options: [
          'if (grid[r][c] >= maxValue) update',
          'if (grid[r][c] != maxValue) update',
          'if (grid[r][c] == maxValue) update',
          'if (grid[r][c] > maxValue) update',
        ], correctIndex: 3,
        feedback: 'A strict > only updates on a genuinely bigger value, so an equal later value never overwrites the first one found. >= would keep the LAST occurrence instead.',
      },
    ],
    masteryQuestions: [
      {
        stem: 'For grid = {{1,2,3},{4,5,6}}, what is the sum of column 1 (0-indexed)?',
        options: ['5', '6', '7', '9'],
        correctIndex: 2,
        feedback: 'Column 1 holds grid[0][1]=2 and grid[1][1]=5. 2 + 5 = 7.',
      },
      {
        stem: 'For grid = {{1,2,3},{4,5,6}}, scanning in row-major order with a strict >, what are the value, row and column of the maximum?',
        options: ['(6, 1, 2)', '(6, 0, 2)', '(5, 1, 1)', '(6, 1, 1)'],
        correctIndex: 0,
        feedback: 'Row major order visits 1,2,3,4,5,6. The largest, 6, is at row 1, column 2.',
      },
      {
        stem: 'For grid = {{1,2,3},{4,5,6}}, what is transposed[1][0] using transposed[c][r] = grid[r][c]?',
        options: ['4', '2', '5', '1'],
        correctIndex: 1,
        feedback: 'transposed[1][0] means c=1, r=0, which reads grid[0][1] = 2.',
      },
      {
        stem: 'A student computes a single running total over an entire grid and claims this also tells them which row has the largest row sum. What is wrong?',
        options: [
          'A single grand total carries no information about which row contributed the most; identifying the best row requires a per-row running total compared against the others',
          'The traversal as described is illegal Java',
          'This only becomes a problem if every row has a different length',
          'The claim is actually correct as stated',
        ], correctIndex: 0,
        feedback: 'Collapsing everything into one total discards exactly the per-row breakdown that "which row" requires.',
      },
      {
        stem: 'For grid = {{-1,-2},{-3,-4}}, using the fix that seeds bestRowSum from row 0 (forcing r==0 to be accepted), which row has the largest row sum?',
        options: ['Both rows tie', 'row 1', 'row 0', 'Cannot be determined'],
        correctIndex: 2,
        feedback: 'row 0 sums to -3, row 1 sums to -7. -3 is greater than -7, so row 0 wins.',
      },
    ],
  },

  // ── 4.14: Searching Algorithms ───────────────────────────────────────────
  {
    lesson: '4.14', unit: 'unit-4',
    handle: 'ap-csa-lesson-4-14-searching-algorithms',
    title: 'Searching Algorithms',
    minutes: '40-50 min',
    tags: 'Linear Search · Binary Search · Comparisons',
    metaDescription: 'AP CSA 4.14: Searching Algorithms. Implement linear search and binary search, and compare how many comparisons each makes on the same data.',
    prevHandle: 'ap-csa-lesson-4-13-implementing-2d-array-algorithms', prevLabel: 'Lesson 4.13: Implementing 2D Array Algorithms',
    nextHandle: 'ap-csa-lesson-4-15-sorting-algorithms', nextLabel: 'Lesson 4.15: Sorting Algorithms',
    learnObjectives: [
      'Implement linear search, which checks elements in order and works on data in any order.',
      'Implement binary search, which requires sorted data and repeatedly halves the search range.',
      'Explain why binary search depends on sorted input and what happens when that precondition is violated.',
      'Compare the number of comparisons linear search and binary search make on the same data.',
    ],
    vocab: [
      { term: 'linear search', def: 'Checking each element in order from the start until a match is found or the array ends.' },
      { term: 'binary search', def: 'Repeatedly checking the middle of a sorted range and discarding the half that cannot contain the target.' },
      { term: 'precondition', def: 'A condition an algorithm assumes is already true before it runs. Binary search\'s precondition is that the data is sorted.' },
      { term: 'comparison', def: 'One check of a target value against an element. The standard way to measure how much work a search does.' },
    ],
    sections: [
      {
        heading: 'Linear Search',
        blocks: [
          { type: 'text', text: 'Linear search checks elements one at a time from the front. It makes no assumption about order, which is exactly why it works on any data.' },
          { type: 'code', src: 'int index = -1;\nfor (int i = 0; i < data.length && index == -1; i++) {\n    if (data[i] == target) {\n        index = i;\n    }\n}' },
        ],
      },
      {
        heading: 'Binary Search',
        blocks: [
          { type: 'text', text: 'Binary search checks the middle of the current range. If the middle is not the target, the half that CANNOT contain it is discarded entirely.' },
          { type: 'code', src: 'int low = 0;\nint high = data.length - 1;\nint index = -1;\nwhile (low <= high && index == -1) {\n    int mid = (low + high) / 2;\n    if (data[mid] == target) {\n        index = mid;\n    } else if (data[mid] < target) {\n        low = mid + 1;\n    } else {\n        high = mid - 1;\n    }\n}' },
          { type: 'callout', kind: 'trap', title: 'Binary Search Needs Sorted Data', text: 'Every "go left" or "go right" decision assumes the data is in order. Run on unsorted data, that assumption is false, and the result becomes unreliable: a real match can be discarded along with the wrong half.' },
        ],
      },
      {
        heading: 'Comparing the Cost',
        blocks: [
          { type: 'callout', kind: 'concept', title: 'Halving Beats Scanning, at Scale', text: 'Linear search\'s worst case grows with the length of the array. Binary search\'s worst case grows with the base-2 logarithm of the length, which is dramatically smaller once the array gets large: a million elements takes roughly 20 comparisons for binary search, not a million.' },
        ],
      },
    ],
    practiceQuestions: [
      {
        stem: 'Which search algorithm works correctly on data in ANY order?',
        options: ['Binary search only', 'Both, identically', 'Neither', 'Linear search'],
        correctIndex: 3,
        feedback: 'Linear search makes no assumption about order at all, which is exactly why it tolerates any arrangement of the data.',
      },
      {
        stem: 'What does binary search require of its input before it runs?',
        options: ['The data must already be sorted', 'Nothing special', 'The data must be all positive', 'The array must have an even length'],
        correctIndex: 0,
        feedback: 'Sorted order is binary search\'s precondition; every halving decision depends on it.',
      },
      {
        stem: 'How many comparisons does binary search make to find target=6 in [2,4,6,8,10]?',
        options: ['1', '2', '3', '5'],
        correctIndex: 0,
        feedback: 'low=0, high=4, mid=2, data[2]=6: an immediate match on the very first comparison.',
      },
      {
        stem: 'What happens when binary search\'s halving logic is run on UNSORTED data?',
        options: [
          'It still works correctly, just slower',
          'It throws a compile error',
          'Results become unreliable, because each decision to discard a half assumes an order that is not actually there',
          'It automatically sorts the data first',
        ], correctIndex: 2,
        feedback: 'Nothing about the algorithm checks whether its assumption holds; it just proceeds on it, which is why the result can be wrong.',
      },
      {
        stem: 'As array length n grows very large, which is true of the two algorithms\' worst-case comparison counts?',
        options: [
          'Linear search and binary search always take the same number of comparisons',
          'Neither count depends on n at all',
          'Binary search always takes more comparisons than linear search',
          'Linear search\'s worst case grows with n; binary search\'s worst case grows with log base 2 of n, dramatically smaller for large n',
        ], correctIndex: 3,
        feedback: 'This gap is the entire reason binary search is worth the precondition of sorted data.',
      },
    ],
    masteryQuestions: [
      {
        stem: 'How many comparisons does binary search make to find target=13 in [1,3,5,7,9,11,13]?',
        options: ['1', '2', '3', '7'],
        correctIndex: 2,
        feedback: 'mid=3 (value 7, low), then mid=5 (value 11, low), then mid=6 (value 13, match): 3 comparisons.',
      },
      {
        stem: 'What does binary search return for target=4 on [1,3,5,7,9,11,13], and how many comparisons does it make?',
        options: ['index 3, 1 comparison', '-1 (not found), 3 comparisons', '-1 (not found), 7 comparisons', 'index -1, 0 comparisons'],
        correctIndex: 1,
        feedback: 'mid=3 (value 7, high goes down), mid=1 (value 3, low goes up), mid=2 (value 5, high goes down): the range empties after 3 comparisons, reporting -1.',
      },
      {
        stem: 'Linear search scans [9,7,5,3,1] for target=1. How many comparisons does it make?',
        options: ['1', '4', '5', '0'],
        correctIndex: 2,
        feedback: 'It checks 9, 7, 5, 3, then 1, five comparisons before the match at the last position.',
      },
      {
        stem: 'A search must run on data whose order can change between calls and cannot be assumed sorted. Which search is the only reliably correct choice?',
        options: [
          'Linear search, because it makes no assumption about order',
          'Binary search, because it is always faster',
          'Neither works on data of unknown order',
          'Binary search, run twice to be safe',
        ], correctIndex: 0,
        feedback: 'Speed is irrelevant if the answer can be wrong, and binary search\'s correctness depends on an assumption that is not guaranteed here.',
      },
      {
        stem: 'Why is data in this lesson\'s exercises explicitly given ALREADY SORTED, rather than asking you to sort it first?',
        options: [
          'Sorting is not part of the AP CSA curriculum',
          'Binary search\'s precondition is sorted data, and Sorting Algorithms is its own separate lesson right after this one; this lesson isolates the search skill from the sort skill',
          'Sorting an array is always a compile error',
          'There is no real reason; it is arbitrary',
        ], correctIndex: 1,
        feedback: 'Searching and sorting are taught as separate CED topics on purpose, and this lesson\'s exercises reflect that separation.',
      },
    ],
  },

  // ── 4.15: Sorting Algorithms ─────────────────────────────────────────────
  {
    lesson: '4.15', unit: 'unit-4',
    handle: 'ap-csa-lesson-4-15-sorting-algorithms',
    title: 'Sorting Algorithms',
    minutes: '40-50 min',
    tags: 'Selection Sort · Insertion Sort · Tracing',
    metaDescription: 'AP CSA 4.15: Sorting Algorithms. Trace selection sort and insertion sort by hand, count their swaps and shifts, and see why both reach the same order.',
    prevHandle: 'ap-csa-lesson-4-14-searching-algorithms', prevLabel: 'Lesson 4.14: Searching Algorithms',
    nextHandle: 'ap-csa-lesson-4-16-recursion', nextLabel: 'Lesson 4.16: Recursion',
    learnObjectives: [
      'Implement selection sort, which repeatedly finds the smallest remaining element and swaps it into place.',
      'Implement insertion sort, which repeatedly shifts each element left past larger elements already in place.',
      'Trace both algorithms by hand and count their swaps or shifts.',
      'Explain why both algorithms reach the same final sorted order despite doing different amounts of work.',
    ],
    vocab: [
      { term: 'selection sort', def: 'Repeatedly finds the smallest value in the unsorted remainder of the array and swaps it into the next position.' },
      { term: 'insertion sort', def: 'Repeatedly takes the next element and shifts it left past every larger element already in place.' },
      { term: 'swap', def: 'Exchanging the values at two array positions, using a temporary variable to hold one of them during the exchange.' },
      { term: 'work vs. result', def: 'Different sorting algorithms can do very different amounts of work, but a correct sort must always reach the identical final order.' },
    ],
    sections: [
      {
        heading: 'Selection Sort',
        blocks: [
          { type: 'text', text: 'On each pass, selection sort scans the unsorted remainder for its smallest value, then swaps that value into the next position.' },
          { type: 'code', src: 'for (int i = 0; i < data.length - 1; i++) {\n    int small = i;\n    for (int j = i + 1; j < data.length; j++) {\n        if (data[j] < data[small]) {\n            small = j;\n        }\n    }\n    if (small != i) {\n        int keep = data[i];\n        data[i] = data[small];\n        data[small] = keep;\n    }\n}' },
          { type: 'callout', kind: 'trap', title: 'A Self-Swap Is Not a Swap', text: 'When the smallest remaining value is already at position i, small equals i and nothing needs to move. Counting that as a swap anyway inflates the count without reflecting any real work.' },
        ],
      },
      {
        heading: 'Insertion Sort',
        blocks: [
          { type: 'text', text: 'On each pass, insertion sort takes the next element and slides it left, past every already-sorted element bigger than it, until it finds its place.' },
          { type: 'code', src: 'for (int i = 1; i < data.length; i++) {\n    int key = data[i];\n    int j = i - 1;\n    while (j >= 0 && data[j] > key) {\n        data[j + 1] = data[j];\n        j = j - 1;\n    }\n    data[j + 1] = key;\n}' },
          { type: 'text', text: 'The final line, placing key at data[j + 1] once the while loop stops, is not itself a counted shift: it is where the element ends up, not a move of an existing element.' },
        ],
      },
      {
        heading: 'Same Order, Different Work',
        blocks: [
          { type: 'callout', kind: 'concept', title: 'Two Algorithms, One Correct Answer', text: 'Sorting has exactly one correct final order for a given input. Selection sort and insertion sort can do very different amounts of work to get there, but a correct implementation of either must land on the identical sorted array.' },
        ],
      },
    ],
    practiceQuestions: [
      {
        stem: 'Selection sort runs on [5,1,4,2]. What does the array look like after the FIRST pass of the outer loop?',
        options: ['[1,5,4,2]', '[5,1,4,2]', '[1,2,4,5]', '[2,1,4,5]'],
        correctIndex: 0,
        feedback: 'The smallest value overall is 1, at index 1, so it swaps with index 0.',
      },
      {
        stem: 'What does insertion sort do with each new element as it moves through the array?',
        options: [
          'Shifts it left past every larger element already in the sorted portion, then places it',
          'Finds the global minimum and swaps it to the front',
          'Appends it to the end without moving anything else',
          'Removes it entirely if it is out of order',
        ], correctIndex: 0,
        feedback: 'This is the core insertion sort move: shift, then place, one element at a time.',
      },
      {
        stem: 'A grader counts a selection sort "swap" only when small != i. Why?',
        options: [
          'Counting swap operations regardless of outcome is required by the Java language',
          'A self-swap (small == i) changes nothing, so it is not real work and should not inflate the count',
          'This distinction does not actually matter for correctness',
          'It always produces a larger reported number',
        ], correctIndex: 1,
        feedback: 'An element already in the right place being "swapped with itself" leaves the array unchanged and should not count as an operation performed.',
      },
      {
        stem: 'If two different, correct sorting algorithms run on the SAME input array, what must be true of their final results?',
        options: [
          'They may differ, since different algorithms are allowed different final orders',
          'This cannot be determined without actually running the code',
          'They differ whenever the input contains duplicate values',
          'They must be identical: sorting has exactly one correct final order for a given input',
        ], correctIndex: 3,
        feedback: 'The correct final order is a property of the data, not of which algorithm produced it.',
      },
      {
        stem: 'What happens when insertion sort processes an array that is ALREADY fully sorted?',
        options: [
          'It crashes, since there is nothing to sort',
          'Every while-loop condition is immediately false, so no shifting occurs and the array is returned unchanged with zero shifts',
          'It performs its maximum possible number of shifts anyway',
          'It reverses the array',
        ], correctIndex: 1,
        feedback: 'On already-sorted data, no element is ever bigger than the one before it, so the while condition never triggers a shift.',
      },
    ],
    masteryQuestions: [
      {
        stem: 'Selection sort runs on [3,1,2]. How many real swaps (small != i) occur?',
        options: ['0', '1', '2', '3'],
        correctIndex: 2,
        feedback: 'Pass 1 swaps 1 into position 0 ([1,3,2]). Pass 2 swaps 2 into position 1 ([1,2,3]). Two real swaps.',
      },
      {
        stem: 'Insertion sort runs on [3,1,2]. How many shifts occur (each move of an existing element one position right, not the final key placement)?',
        options: ['0', '1', '2', '4'],
        correctIndex: 2,
        feedback: 'Placing 1 shifts 3 right once. Placing 2 shifts 3 right once more. Two shifts total.',
      },
      {
        stem: 'For the same input [3,1,2], both selection sort and insertion sort were traced above. What is true of their final arrays?',
        options: [
          'They differ, because the two algorithms use different operations',
          'This cannot be determined from the traces alone',
          'Selection sort produces [1,2,3] but insertion sort produces [1,3,2]',
          'They are identical: [1,2,3], since both are correct sorts of the same input',
        ], correctIndex: 3,
        feedback: 'Different work, same correct result: both land on [1,2,3].',
      },
      {
        stem: 'Selection sort runs on [9,8,7,6] (reverse sorted, its worst case). How many real swaps occur?',
        options: ['2', '1', '3', '4'],
        correctIndex: 0,
        feedback: 'Pass 1 swaps 6 into position 0 ([6,8,7,9]). Pass 2 swaps 7 into position 1 ([6,7,8,9]). Pass 3 finds the smallest remaining value already in place, no swap. Two real swaps.',
      },
      {
        stem: 'Insertion sort runs on [9,8,7,6] (its worst case). How many shifts occur?',
        options: ['2', '4', '6', '8'],
        correctIndex: 2,
        feedback: 'Placing 8 shifts once, placing 7 shifts twice, placing 6 shifts three times: 1 + 2 + 3 = 6 shifts total.',
      },
    ],
  },

  // ── 4.17: Recursive Searching and Sorting ────────────────────────────────
  {
    lesson: '4.17', unit: 'unit-4',
    handle: 'ap-csa-lesson-4-17-recursive-searching-and-sorting',
    title: 'Recursive Searching and Sorting',
    minutes: '45-55 min',
    tags: 'Recursive Search · Merge Sort · Divide and Conquer',
    metaDescription: 'AP CSA 4.17: Recursive Searching and Sorting. Write a recursive binary search and a recursive merge sort, and count recursive calls including the base case.',
    prevHandle: 'ap-csa-lesson-4-16-recursion', prevLabel: 'Lesson 4.16: Recursion',
    nextHandle: 'ap-csa-unit-4-course', nextLabel: 'Unit 4 Course Hub',
    learnObjectives: [
      'Implement a recursive binary search using low/high parameters that narrow the range with each call.',
      'Implement recursive merge sort, which splits an array, recursively sorts each half, and merges the results.',
      'Explain why merge sort\'s split-and-recurse structure needs recursion while its merge step does not.',
      'Count recursive calls, including the call that reaches the base case.',
    ],
    vocab: [
      { term: 'recursive binary search', def: 'The same halving search restated as a method that calls a smaller version of itself instead of looping.' },
      { term: 'merge sort', def: 'A recursive sort that splits an array in half, recursively sorts each half, then merges the two sorted halves back together.' },
      { term: 'divide and conquer', def: 'Breaking a problem into smaller versions of itself, solving each one, then combining the results.' },
      { term: 'base case', def: 'The condition where a recursive method stops calling itself and returns directly.' },
    ],
    sections: [
      {
        heading: 'Recursive Binary Search',
        blocks: [
          { type: 'text', text: 'Instead of a loop, the range narrows with each recursive call. The base case is an empty range: nothing left to check.' },
          { type: 'code', src: 'public static int binarySearch(int[] data, int target, int low, int high) {\n    if (low > high) {\n        return -1;\n    }\n    int mid = (low + high) / 2;\n    if (data[mid] == target) {\n        return mid;\n    } else if (data[mid] < target) {\n        return binarySearch(data, target, mid + 1, high);\n    } else {\n        return binarySearch(data, target, low, mid - 1);\n    }\n}' },
        ],
      },
      {
        heading: 'Recursive Merge Sort',
        blocks: [
          { type: 'text', text: 'Merge sort splits the array in half, recursively sorts each half, then merges the two already-sorted halves back into one sorted array.' },
          { type: 'code', src: 'public static int[] mergeSort(int[] data) {\n    if (data.length <= 1) {\n        return data;\n    }\n    int mid = data.length / 2;\n    // split into left (0..mid-1) and right (mid..end)\n    int[] sortedLeft = mergeSort(left);\n    int[] sortedRight = mergeSort(right);\n    return merge(sortedLeft, sortedRight);\n}' },
          { type: 'callout', kind: 'concept', title: 'The Merge Step Does Not Need to Be Recursive', text: 'Recursion fits a problem that reduces to a smaller version of itself. Splitting the array down to single elements is exactly that. Combining two ALREADY-sorted halves back together is a single linear pass with no smaller version of itself to recurse into, which is why merge is conventionally written with a loop even though mergeSort around it is recursive.' },
          { type: 'callout', kind: 'trap', title: 'A Missing Base Case Never Stops', text: 'Without the length <= 1 check, mergeSort keeps trying to split arrays that are already down to 0 or 1 elements, forever, eventually causing a StackOverflowError.' },
        ],
      },
    ],
    practiceQuestions: [
      {
        stem: 'A recursive binary search is called with low=0 and high=-1. What should happen?',
        options: [
          'Compute mid and keep searching',
          'This is the base case: the range is empty (low > high), so return immediately, typically -1',
          'This causes infinite recursion',
          'This call should never occur under any circumstances',
        ], correctIndex: 1,
        feedback: 'low > high signals an exhausted range, which is exactly the condition checked first, before mid is ever computed.',
      },
      {
        stem: 'What is the base case of a recursive mergeSort(int[] data) method?',
        options: [
          'data.length == 0 only',
          'An array of length 0 or 1, which is already sorted by definition',
          'There is no base case; mergeSort runs until the array is empty',
          'data[0] == 0',
        ], correctIndex: 1,
        feedback: 'A single element (or none) cannot be out of order relative to itself, so it needs no further splitting.',
      },
      {
        stem: 'Why does merge sort\'s merge STEP not need to be recursive, even though the surrounding sort is?',
        options: [
          'Merging two already-sorted lists is one linear pass with no smaller version of the same problem to recurse into',
          'Recursion is only allowed once per method in Java',
          'Merging is actually recursive too, just hidden from view',
          'Merge could be written recursively, but Java forbids it',
        ], correctIndex: 0,
        feedback: 'Recursion fits problems with a natural smaller-subproblem structure. Combining two sorted lists is not that kind of problem.',
      },
      {
        stem: 'An array of length 7 is split for merge sort using mid = data.length / 2. What are the lengths of the two halves?',
        options: ['3 and 4', '4 and 3', '3 and 3', '4 and 4'],
        correctIndex: 0,
        feedback: '7 / 2 is 3 under integer division. The left half gets indices 0-2 (length 3), the right half gets the rest (length 4).',
      },
      {
        stem: 'What happens if a recursive mergeSort has no base case check at all?',
        options: [
          'It sorts correctly but slowly',
          'It recurses forever trying to split arrays that are already length 0 or 1, eventually causing a StackOverflowError',
          'It sorts the array in reverse order',
          'Java automatically inserts a base case for you',
        ], correctIndex: 1,
        feedback: 'Every recursive method needs an explicit stopping condition; without one, the calls never stop.',
      },
    ],
    masteryQuestions: [
      {
        stem: 'How many recursive calls does binarySearch make (including the one that matches) to find target=13 in [1,3,5,7,9,11,13]?',
        options: ['1', '2', '3', '7'],
        correctIndex: 2,
        feedback: 'Call 1: mid=3 (value 7, low goes up). Call 2: mid=5 (value 11, low goes up). Call 3: mid=6 (value 13, match). Three calls.',
      },
      {
        stem: 'How many total calls does binarySearch make for target=4 (not present) on [1,3,5,7,9,11,13]?',
        options: ['2', '3', '4', '7'],
        correctIndex: 2,
        feedback: 'Call 1: mid=3 (value 7, high goes down). Call 2: mid=1 (value 3, low goes up). Call 3: mid=2 (value 5, high goes down). Call 4: low > high, base case returns -1. Four calls.',
      },
      {
        stem: 'mergeSort splits [8,3,5,1,9,2] (length 6) using mid = data.length / 2. What are the two halves?',
        options: ['[8,3,5] and [1,9,2]', '[8,3] and [5,1,9,2]', '[8,3,5,1] and [9,2]', '[8] and [3,5,1,9,2]'],
        correctIndex: 0,
        feedback: 'mid = 6 / 2 = 3. The left half is indices 0-2, the right half is indices 3-5.',
      },
      {
        stem: 'What does mergeSort([5]) return, and why?',
        options: [
          '[5], because an array of length 1 hits the base case and is returned unchanged, already sorted',
          '[], because length-1 arrays are treated as empty',
          'This throws an exception, since there is nothing to merge',
          'It infinitely recurses trying to split a single element',
        ], correctIndex: 0,
        feedback: 'length <= 1 is true, so the base case returns the array exactly as given.',
      },
      {
        stem: 'A method searchCalls mirrors binarySearch but counts calls instead of finding an index. Why does its base case return 1, not 0?',
        options: [
          'It is an arbitrary stylistic choice with no real reason',
          'The base case call is itself a real call in the chain and must contribute 1 to the total, or the count would always be one short of the actual number of calls made',
          'Returning 0 in the base case would not compile',
          'The final count must always be an even number',
        ], correctIndex: 1,
        feedback: 'Every invocation of the method, including the one that hits the base case, is a call that happened and needs to be counted.',
      },
    ],
  },
];

function byLesson(lesson) { return LESSONS.find((x) => x.lesson === lesson) || null; }

module.exports = { LESSONS, byLesson };
