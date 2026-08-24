'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CSA UNIT 1 FRQ PRACTICE: USING OBJECTS AND METHODS.
//
//  EVERY ENTRY HERE IS `segment` MODE, AND THAT IS THE WHOLE POINT
//  Unit 1 is about USING what someone else wrote. The student is handed values
//  and objects in the case prelude and asked to compute and print. Asking for a
//  class definition would be grading Unit 3 in September, and asking for a
//  Scanner before 1.4 would grade input handling in a lesson about arithmetic.
//
//  NO `if` AND NO LOOPS APPEAR IN ANY REFERENCE SOLUTION IN THIS FILE.
//  Selection is 2.3 and iteration is 2.7. A Unit 1 task a student cannot solve
//  with what Unit 1 taught is not a hard question, it is an unfair one. Where a
//  problem looks like it wants a conditional, the arithmetic is arranged so it
//  does not need one (integer division, Math.max, Math.abs).
//
//  HOW A CASE "TESTS" A RUBRIC PART
//  All four parts run on every case, because the segment prints all four
//  answers every time. What the `part` tag records is which rubric row that
//  case was chosen to DISCRIMINATE: its prelude values are picked so that
//  getting that row wrong changes the printed output. A truncation row gets a
//  case whose numbers do not divide evenly; a Math.max row gets a case where
//  the second argument wins. Without that, a case is coverage on paper only.
//
//  Nothing here states an expected output. scripts/verify-csa-frq.js runs each
//  `reference` through real javac/java to generate them.
// ─────────────────────────────────────────────────────────────────────────────

const U = 'unit-1';

const FRQS = [
  // ── 1.1 ────────────────────────────────────────────────────────────────────
  {
    lesson: '1.1', unit: U,
    title: 'Introduction to Algorithms, Programming, and Compilers',
    name: 'Delivery Route',
    mode: 'segment',
    frqType: 'methods-and-control',
    brief: 'An algorithm is an ordered sequence of steps, and on the exam the order is graded. '
      + 'This question hands you three leg distances and asks for four reported values, each of which '
      + 'depends on the ones before it. A student who computes the final answer in one expression gets '
      + 'that answer right and the intermediate rows wrong, which is exactly how partial credit is lost.',
    given: 'Three int variables legA, legB and legC are already declared and assigned for you. '
      + 'You do not declare them and you do not read any input.',
    parts: [
      { label: '(a)', text: 'Print the total distance of all three legs.' },
      { label: '(b)', text: 'Print the distance remaining after the first leg is driven.' },
      { label: '(c)', text: 'Print the average leg distance as an int, using integer division.' },
      { label: '(d)', text: 'Print the length of the longest single leg, using Math.max.' },
    ],
    task: [
      'Write a code segment that prints four lines, one per rubric part, in order (a) through (d).',
      'Part (c) is integer division on purpose. 100 / 3 is 33, not 33.333, and the exam expects 33.',
      'Part (d) has no if statement available to you. Math.max takes two arguments, so use it twice.',
    ],
    starter: [
      '// legA, legB and legC are already declared and assigned.',
      '// Print four lines: total, remaining after leg A, average (integer), longest leg.',
      '',
    ].join('\n'),
    reference: [
      'int total = legA + legB + legC;',
      'System.out.println(total);',
      'System.out.println(total - legA);',
      'System.out.println(total / 3);',
      'System.out.println(Math.max(legA, Math.max(legB, legC)));',
    ].join('\n'),
    hints: [
      'Compute the total once into a variable and reuse it. Part (b) is the total minus legA, and writing legB + legC instead is correct here but stops being correct the moment the question changes.',
      'Integer division truncates toward zero. There is no rounding in part (c) and no cast to double: 25 / 2 is 12.',
      'Math.max only compares two values. Math.max(a, Math.max(b, c)) compares all three without a single if.',
    ],
    mutants: [
      { describe: 'part (d) compares only the first two legs',
        find: 'System.out.println(Math.max(legA, Math.max(legB, legC)));', replace: 'System.out.println(Math.max(legA, legB));' },
      { describe: 'part (c) averages as a double instead of using integer division',
        find: 'System.out.println(total / 3);', replace: 'System.out.println((double) total / 3);' },
    ],
    seo: 'AP CSA 1.1 FRQ practice: write a code segment that reports total, remaining, average and longest values from three given leg distances.',
    cases: [
      // (a) and (b) are visible so the shape of the output is unambiguous.
      { prelude: 'int legA = 12;\nint legB = 30;\nint legC = 18;', part: 1, hidden: 0 },
      // Chosen for (c): 60 / 3 is exact above, 61 / 3 is not, so a student who
      // reached for a double sees the difference here rather than by luck.
      { prelude: 'int legA = 20;\nint legB = 20;\nint legC = 21;', part: 3, hidden: 0 },
      // Chosen for (d): the LAST leg is the longest, which catches a student who
      // only compared the first two.
      { prelude: 'int legA = 5;\nint legB = 7;\nint legC = 40;', part: 4, hidden: 1 },
      // Chosen for (b): legA is the whole trip, so remaining is 0.
      { prelude: 'int legA = 9;\nint legB = 0;\nint legC = 0;', part: 2, hidden: 1 },
      { prelude: 'int legA = 100;\nint legB = 1;\nint legC = 1;', part: 4, hidden: 1 },
    ],
  },

  // ── 1.2 ────────────────────────────────────────────────────────────────────
  {
    lesson: '1.2', unit: U,
    title: 'Variables and Data Types',
    name: 'Concert Inventory',
    mode: 'segment',
    frqType: 'methods-and-control',
    brief: 'The exam does not ask you to name a data type. It asks you to compute something, and then '
      + 'scores whether the type you chose held the answer. An int that should have been a double loses '
      + 'the fraction silently, and a boolean printed as text is the only way to show a yes or no answer '
      + 'before selection is taught.',
    given: 'Three variables are declared and assigned for you: int seats, int sold and double price.',
    parts: [
      { label: '(a)', text: 'Print the number of seats still unsold, as an int.' },
      { label: '(b)', text: 'Print the total revenue from the seats sold, as a double.' },
      { label: '(c)', text: 'Print the revenue that the remaining seats would add if they all sold.' },
      { label: '(d)', text: 'Print a boolean: true when the show is completely sold out.' },
    ],
    task: [
      'Write a code segment that prints four lines in rubric order.',
      'Part (b) and part (c) are money. They must print with a decimal point, which means the expression has to be a double and not an int.',
      'Part (d) has no if statement. A comparison IS a boolean value, so you can print the comparison itself.',
    ],
    starter: [
      '// seats, sold and price are already declared and assigned.',
      '// Print four lines: unsold seats, revenue so far, revenue remaining, sold out or not.',
      '',
    ].join('\n'),
    reference: [
      'int unsold = seats - sold;',
      'System.out.println(unsold);',
      'System.out.println(sold * price);',
      'System.out.println(unsold * price);',
      'System.out.println(unsold == 0);',
    ].join('\n'),
    hints: [
      'An int times a double is a double, so sold * price already prints with a decimal point. You do not need a cast and you should not store it in an int.',
      'Part (d) does not need an if. System.out.println(unsold == 0) prints the words true or false, which is what the question asks for.',
      'Compute unsold once. Parts (a), (c) and (d) all depend on it, and three separate subtractions is three chances to write one of them backwards.',
    ],
    seo: 'AP CSA 1.2 FRQ practice: choose the right data types to report unsold seats, revenue and a sold out boolean for a concert.',
    cases: [
      { prelude: 'int seats = 200;\nint sold = 150;\ndouble price = 12.5;', part: 2, hidden: 0 },
      // Chosen for (d): the only case where the show IS sold out, so a student
      // who hardcoded false passes everything else and fails here.
      { prelude: 'int seats = 80;\nint sold = 80;\ndouble price = 30.0;', part: 4, hidden: 0 },
      // Chosen for (c): nothing sold yet, so (b) is 0.0 and (c) is the whole house.
      { prelude: 'int seats = 50;\nint sold = 0;\ndouble price = 9.75;', part: 3, hidden: 1 },
      { prelude: 'int seats = 101;\nint sold = 37;\ndouble price = 4.2;', part: 1, hidden: 1 },
      { prelude: 'int seats = 1;\nint sold = 1;\ndouble price = 0.5;', part: 4, hidden: 1 },
    ],
  },

  // ── 1.3 ────────────────────────────────────────────────────────────────────
  {
    lesson: '1.3', unit: U,
    title: 'Expressions and Output',
    name: 'Scoreboard Line',
    mode: 'segment',
    frqType: 'methods-and-control',
    brief: 'Half the free response points lost on output questions are lost to the difference between '
      + 'print and println, and to concatenation that silently turns arithmetic into text. '
      + '"Score: " + 2 + 3 is "Score: 23". This question is built around that.',
    given: 'Four variables are declared for you: String team, int made, int missed and int bonus.',
    parts: [
      { label: '(a)', text: 'Print the team name followed by a colon, a space, and the number of shots made, on one line.' },
      { label: '(b)', text: 'Print the total number of shots attempted.' },
      { label: '(c)', text: 'Print the score, counting two points per shot made plus the bonus.' },
      { label: '(d)', text: 'Print the team name and the score joined by a space, on one line.' },
    ],
    task: [
      'Write a code segment that prints four lines in rubric order.',
      'In part (a) and part (d) the number must be the computed value, not the digits stuck together. Parentheses decide that.',
      'Nothing here needs an if or a loop.',
    ],
    starter: [
      '// team, made, missed and bonus are already declared and assigned.',
      '// Print four lines. Watch what + does when a String is on the left.',
      '',
    ].join('\n'),
    reference: [
      'System.out.println(team + ": " + made);',
      'System.out.println(made + missed);',
      'int score = made * 2 + bonus;',
      'System.out.println(score);',
      'System.out.println(team + " " + score);',
    ].join('\n'),
    hints: [
      'Once a String appears on the left of a +, every + after it concatenates. "x" + 2 + 3 is "x23". Wrap the arithmetic in parentheses, or compute it into a variable first, which is what the reference does.',
      'Part (b) has no String in it at all, so made + missed is ordinary addition and prints as one number.',
      'println moves to a new line and print does not. Four printed lines means four println calls, not four print calls.',
    ],
    seo: 'AP CSA 1.3 FRQ practice: build scoreboard output lines with string concatenation and arithmetic without mixing the two up.',
    cases: [
      { prelude: 'String team = "Hawks";\nint made = 12;\nint missed = 7;\nint bonus = 3;', part: 1, hidden: 0 },
      // Chosen for (c): bonus 0 and made 0 means a student who concatenated
      // instead of adding still prints something plausible elsewhere, but this
      // row makes the score column unambiguous.
      { prelude: 'String team = "Jets";\nint made = 0;\nint missed = 5;\nint bonus = 0;', part: 3, hidden: 0 },
      // Chosen for (b): both counts are two digit, so concatenation (1020)
      // and addition (30) cannot be confused for each other.
      { prelude: 'String team = "Owls";\nint made = 10;\nint missed = 20;\nint bonus = 1;', part: 2, hidden: 1 },
      { prelude: 'String team = "A";\nint made = 1;\nint missed = 1;\nint bonus = 1;', part: 4, hidden: 1 },
      { prelude: 'String team = "Red Wolves";\nint made = 25;\nint missed = 0;\nint bonus = 11;', part: 4, hidden: 1 },
    ],
  },

  // ── 1.4 ────────────────────────────────────────────────────────────────────
  {
    lesson: '1.4', unit: U,
    title: 'Assignment Statements and Input',
    name: 'Locker Assignment',
    mode: 'segment',
    frqType: 'methods-and-control',
    brief: 'Assignment is not equality, and the order of assignments is the algorithm. '
      + 'This question walks a value through four reassignments and asks you to report it at each stage, '
      + 'which is the shape of every FRQ part that says "after the code segment executes".',
    given: 'Two variables are declared and assigned for you: int locker and int shift.',
    parts: [
      { label: '(a)', text: 'Print the starting locker number.' },
      { label: '(b)', text: 'Move the locker forward by shift, then print it.' },
      { label: '(c)', text: 'Double the locker number, then print it.' },
      { label: '(d)', text: 'Move it back by shift, then print it.' },
    ],
    task: [
      'Write a code segment that prints four lines in rubric order.',
      'Each part changes the SAME variable and then prints it. Do not print a fresh expression each time: the point of the question is that the value carries forward.',
      'Part (d) is the value after parts (b) and (c) have already happened, not the starting value minus shift.',
    ],
    starter: [
      '// locker and shift are already declared and assigned.',
      '// Report the locker number after each change, four lines in all.',
      '',
    ].join('\n'),
    reference: [
      'System.out.println(locker);',
      'locker = locker + shift;',
      'System.out.println(locker);',
      'locker = locker * 2;',
      'System.out.println(locker);',
      'locker = locker - shift;',
      'System.out.println(locker);',
    ].join('\n'),
    hints: [
      'locker = locker + shift reads right to left: work out the right side with the current value, then store the result back. It is not an equation and it is not a claim that the two sides are equal.',
      'If your four printed lines can be worked out without knowing the previous one, you have written four independent expressions and the third and fourth will be wrong.',
      'Part (d) subtracts from the DOUBLED value. (start + shift) * 2 - shift is not the same as start + shift * 2 - shift.',
    ],
    seo: 'AP CSA 1.4 FRQ practice: trace and report a variable through a sequence of assignment statements, one printed line per stage.',
    cases: [
      { prelude: 'int locker = 100;\nint shift = 7;', part: 1, hidden: 0 },
      // Chosen for (c): doubling a number that already grew makes the
      // order-of-operations mistake visible as a large wrong number.
      { prelude: 'int locker = 15;\nint shift = 35;', part: 3, hidden: 0 },
      // Chosen for (d): shift is large enough that the final value drops below
      // the starting value, which a student who forgot the doubling cannot fake.
      { prelude: 'int locker = 4;\nint shift = 96;', part: 4, hidden: 1 },
      // Chosen for (b): shift of 0 makes (a) and (b) identical, so a student who
      // printed the wrong stage shows up immediately.
      { prelude: 'int locker = 250;\nint shift = 0;', part: 2, hidden: 1 },
      { prelude: 'int locker = 1;\nint shift = 1;', part: 4, hidden: 1 },
    ],
  },

  // ── 1.5 ────────────────────────────────────────────────────────────────────
  {
    lesson: '1.5', unit: U,
    title: 'Casting and Range of Variables',
    name: 'Fuel Economy Report',
    mode: 'segment',
    frqType: 'methods-and-control',
    brief: 'Casting is the single most reliable place to lose an FRQ point, because the wrong answer '
      + 'looks right. (double) (a / b) casts AFTER the integer division has already thrown the fraction '
      + 'away. This question asks for the same quotient three different ways so the difference is on the page.',
    given: 'Two variables are declared and assigned for you: int miles and int gallons.',
    parts: [
      { label: '(a)', text: 'Print miles per gallon using integer division, so the fraction is discarded.' },
      { label: '(b)', text: 'Print miles per gallon as an exact double.' },
      { label: '(c)', text: 'Print the miles left over that the whole number in part (a) does not account for.' },
      { label: '(d)', text: 'Print the exact result from part (b) rounded down to an int by casting.' },
    ],
    task: [
      'Write a code segment that prints four lines in rubric order.',
      'Part (b) must cast BEFORE the division, not after. Casting the result of int division is too late.',
      'Part (c) is the remainder operator. Part (d) is a cast applied to the double from part (b).',
    ],
    starter: [
      '// miles and gallons are already declared and assigned.',
      '// Print four lines: integer mpg, exact mpg, leftover miles, exact mpg cast back to int.',
      '',
    ].join('\n'),
    reference: [
      'System.out.println(miles / gallons);',
      'double exact = (double) miles / gallons;',
      'System.out.println(exact);',
      'System.out.println(miles % gallons);',
      'System.out.println((int) exact);',
    ].join('\n'),
    hints: [
      '(double) miles / gallons casts miles first, so the division is double division. (double) (miles / gallons) divides as ints first and then converts the already truncated answer, which is the classic lost point.',
      'The remainder operator % gives what is left after integer division. miles / gallons and miles % gallons together account for every mile.',
      'Casting a double to an int truncates toward zero. It does not round: (int) 9.98 is 9.',
    ],
    mutants: [
      { describe: 'part (b) casts AFTER the integer division rather than before it',
        find: 'double exact = (double) miles / gallons;', replace: 'double exact = (double) (miles / gallons);' },
      { describe: 'part (d) rounds instead of truncating',
        find: 'System.out.println((int) exact);', replace: 'System.out.println(Math.round(exact));' },
    ],
    seo: 'AP CSA 1.5 FRQ practice: cast before dividing to report exact and truncated miles per gallon plus the remainder.',
    cases: [
      // Chosen for (b): 250 / 8 is 31.25, so integer and exact answers differ
      // clearly and a late cast prints 31.0 instead of 31.25.
      { prelude: 'int miles = 250;\nint gallons = 8;', part: 2, hidden: 0 },
      // Chosen for (a): divides evenly, so every part agrees. This is the row a
      // student checks their shape against.
      { prelude: 'int miles = 300;\nint gallons = 10;', part: 1, hidden: 0 },
      // Chosen for (c): a remainder larger than the quotient.
      { prelude: 'int miles = 17;\nint gallons = 5;', part: 3, hidden: 1 },
      // Chosen for (d): the exact value is just under the next whole number, so
      // truncation and rounding disagree.
      { prelude: 'int miles = 99;\nint gallons = 10;', part: 4, hidden: 1 },
      { prelude: 'int miles = 7;\nint gallons = 8;', part: 4, hidden: 1 },
    ],
  },

  // ── 1.6 ────────────────────────────────────────────────────────────────────
  // MIGRATED from seed/csa-code-tests.js, which authored this before the bank
  // existed. Same task and same shape; it now carries a rubric and a reference
  // solution so its expected outputs are generated rather than hand written.
  // The hand written expectations it used to carry were correct, and the
  // verifier reproduces them, which is the only reason to believe that.
  {
    lesson: '1.6', unit: U,
    title: 'Compound Assignment Operators',
    name: 'Register Receipt',
    mode: 'segment',
    frqType: 'methods-and-control',
    brief: 'Compound assignment is not shorthand for the exam; it is where the exam plants truncation. '
      + 'total *= 108 / 100 is not an 8 percent increase, because 108 / 100 is 1. This question is a '
      + 'receipt computed entirely in cents so that every rounding decision is one you make on purpose.',
    given: 'Five variables are declared and assigned for you: int a, b, c and d are item prices in cents, '
      + 'and int paidCents is what the customer handed over.',
    parts: [
      { label: '(a)', text: 'Print the subtotal in cents.' },
      { label: '(b)', text: 'Print the average item price in cents as a double.' },
      { label: '(c)', text: 'Print 8 percent tax on the subtotal, in cents, truncated.' },
      { label: '(d)', text: 'Print the whole dollars of change, then on the next line the leftover cents. Change is what is left after BOTH the subtotal and the tax.' },
    ],
    task: [
      'Write a code segment that prints five lines: subtotal, average, tax, dollars of change, leftover cents.',
      'Part (c) is 8 percent truncated, so multiply before you divide. subtotal * 8 / 100 truncates once at the end; subtotal * (8 / 100) is always zero.',
      'Change is paidCents minus the subtotal minus the tax. Forgetting the tax is the mistake this part is looking for. Dollars is integer division by 100 and leftover cents is the remainder.',
    ],
    starter: [
      '// a, b, c, d and paidCents are already declared and assigned.',
      '// Print five lines: subtotal, average, tax, dollars of change, leftover cents.',
      '',
    ].join('\n'),
    reference: [
      'int subtotal = a + b + c + d;',
      'System.out.println(subtotal);',
      'System.out.println((double) subtotal / 4);',
      'int tax = subtotal * 8 / 100;',
      'System.out.println(tax);',
      'int change = paidCents - subtotal - tax;',
      'System.out.println(change / 100);',
      'System.out.println(change % 100);',
    ].join('\n'),
    hints: [
      'Multiply before dividing whenever the divisor is bigger than the numerator. subtotal * 8 / 100 keeps the precision until the last step; anything that computes 8 / 100 first gets 0.',
      'Part (b) needs a cast before the division or the average of 99, 100, 101 and 102 prints as 100 instead of 100.5.',
      'Dollars and cents come from the same value: change / 100 and change % 100. Computing them from two different expressions is how they stop agreeing.',
      'The customer pays the tax too. Change is paidCents - subtotal - tax, and a receipt that hands back the tax as change is the bug this part exists to catch.',
    ],
    mutants: [
      { describe: 'part (c) computes the percentage before multiplying, so the tax is always zero',
        find: 'int tax = subtotal * 8 / 100;', replace: 'int tax = subtotal * (8 / 100);' },
      { describe: 'part (d) hands back the tax as change',
        find: 'int change = paidCents - subtotal - tax;', replace: 'int change = paidCents - subtotal;' },
      { describe: 'part (b) averages with integer division',
        find: 'System.out.println((double) subtotal / 4);', replace: 'System.out.println(subtotal / 4);' },
    ],
    seo: 'AP CSA 1.6 FRQ practice: compute a register receipt in cents with truncating tax, an exact average, and dollars plus cents of change.',
    cases: [
      { prelude: 'int a = 125;\nint b = 250;\nint c = 75;\nint d = 150;\nint paidCents = 1000;', part: 1, hidden: 0 },
      // Chosen for (b): the only case whose average is not a whole number, so a
      // missing cast is visible here and nowhere else.
      { prelude: 'int a = 99;\nint b = 100;\nint c = 101;\nint d = 102;\nint paidCents = 500;', part: 2, hidden: 0 },
      // Chosen for (c): exact change, so the change rows are 0 and 0 and the
      // tax row is the only thing this case can be failing.
      { prelude: 'int a = 250;\nint b = 250;\nint c = 250;\nint d = 250;\nint paidCents = 1080;', part: 3, hidden: 1 },
      // Chosen for (d): under a dollar of change, so dollars is 0 and cents is not.
      { prelude: 'int a = 25;\nint b = 25;\nint c = 25;\nint d = 24;\nint paidCents = 200;', part: 4, hidden: 1 },
      { prelude: 'int a = 0;\nint b = 0;\nint c = 0;\nint d = 0;\nint paidCents = 0;', part: 3, hidden: 1 },
      { prelude: 'int a = 1000;\nint b = 2000;\nint c = 3000;\nint d = 1000;\nint paidCents = 10000;', part: 4, hidden: 1 },
    ],
  },

  // ── 1.7 ────────────────────────────────────────────────────────────────────
  {
    lesson: '1.7', unit: U,
    title: 'Application Program Interface (API) and Libraries',
    name: 'Sensor Calibration',
    mode: 'segment',
    frqType: 'methods-and-control',
    brief: 'An API is a promise about what a method returns, and the exam grades whether you read the '
      + 'promise or guessed at it. Math.abs returns the magnitude, Math.pow returns a double even when '
      + 'both arguments look like ints, and Integer.parseInt throws rather than returning zero. '
      + 'Each part here is one library call whose documented return type decides the answer.',
    given: 'Three variables are declared and assigned for you: int reading, int target and String rawCount.',
    parts: [
      { label: '(a)', text: 'Print how far the reading is from the target, as a distance that is never negative.' },
      { label: '(b)', text: 'Print the reading squared, using Math.pow.' },
      { label: '(c)', text: 'Print the raw count converted from text to a number, then multiplied by two.' },
      { label: '(d)', text: 'Print the smaller of the reading and the target.' },
    ],
    task: [
      'Write a code segment that prints four lines in rubric order.',
      'Part (b) uses Math.pow, which is documented to return a double. Print what it actually returns; do not cast it to an int.',
      'Part (c) needs Integer.parseInt. A String of digits is not a number until something converts it.',
    ],
    starter: [
      '// reading, target and rawCount are already declared and assigned.',
      '// Print four lines: distance from target, reading squared, parsed count doubled, smaller value.',
      '',
    ].join('\n'),
    reference: [
      'System.out.println(Math.abs(reading - target));',
      'System.out.println(Math.pow(reading, 2));',
      'System.out.println(Integer.parseInt(rawCount) * 2);',
      'System.out.println(Math.min(reading, target));',
    ].join('\n'),
    hints: [
      'Math.abs(reading - target) works whichever value is larger, which is why the question asks for a distance rather than a difference. Subtracting in one fixed order is right half the time.',
      'Math.pow returns a double. 5 squared prints as 25.0 and not 25, and that is the documented behaviour rather than a bug to correct.',
      'Integer.parseInt turns a String of digits into an int. Multiplying the String by 2 does not compile, and concatenating it with itself is not doubling it.',
    ],
    seo: 'AP CSA 1.7 FRQ practice: read the library contract for Math.abs, Math.pow, Math.min and Integer.parseInt and print exactly what each returns.',
    cases: [
      { prelude: 'int reading = 42;\nint target = 30;\nString rawCount = "17";', part: 2, hidden: 0 },
      // Chosen for (a): the reading is BELOW the target, so a plain subtraction
      // in the wrong order prints a negative number here and nowhere else.
      { prelude: 'int reading = 10;\nint target = 25;\nString rawCount = "3";', part: 1, hidden: 0 },
      // Chosen for (d): the two values are equal, so min and max agree and only
      // a student who printed the wrong one of them shows up.
      { prelude: 'int reading = 8;\nint target = 8;\nString rawCount = "100";', part: 4, hidden: 1 },
      // Chosen for (c): a leading zero, which parses to 7 and concatenates to "07".
      { prelude: 'int reading = 3;\nint target = 90;\nString rawCount = "07";', part: 3, hidden: 1 },
      { prelude: 'int reading = 0;\nint target = 0;\nString rawCount = "0";', part: 2, hidden: 1 },
    ],
  },

  // ── 1.8 ────────────────────────────────────────────────────────────────────
  {
    lesson: '1.8', unit: U,
    title: 'Documentation with Comments',
    name: 'Precondition Contract',
    mode: 'segment',
    frqType: 'methods-and-control',
    brief: 'Documentation on the exam is not a comment you write, it is a contract you are held to. '
      + 'A precondition tells you what you may ASSUME, and every point lost to "but what if the input is '
      + 'negative" is a point lost to code defending against a case the documentation already ruled out. '
      + 'This question states its preconditions and then scores whether you trusted them.',
    given: 'Three variables are declared and assigned for you: int boxes, int perBox and int shipped. '
      + 'Preconditions: boxes is at least 1, perBox is at least 1, and shipped is between 0 and boxes * perBox inclusive.',
    parts: [
      { label: '(a)', text: 'Print the total number of items across all boxes.' },
      { label: '(b)', text: 'Print how many items are still unshipped.' },
      { label: '(c)', text: 'Print the number of FULL boxes the unshipped items would fill.' },
      { label: '(d)', text: 'Print the percentage shipped, truncated to a whole number.' },
    ],
    task: [
      'Write a code segment that prints four lines in rubric order.',
      'The preconditions guarantee perBox is at least 1, so part (c) and part (d) never divide by zero. You do not need to check for it, and the exam does not award a point for checking.',
      'Part (d) is shipped * 100 / total, which truncates once at the end. Dividing first gives 0 every time.',
    ],
    starter: [
      '// boxes, perBox and shipped are already declared and assigned.',
      '// Preconditions: boxes >= 1, perBox >= 1, 0 <= shipped <= boxes * perBox.',
      '// Print four lines: total items, unshipped, full boxes of unshipped, percent shipped.',
      '',
    ].join('\n'),
    reference: [
      'int total = boxes * perBox;',
      'System.out.println(total);',
      'int left = total - shipped;',
      'System.out.println(left);',
      'System.out.println(left / perBox);',
      'System.out.println(shipped * 100 / total);',
    ].join('\n'),
    hints: [
      'A precondition is a promise made TO you. You may assume perBox is at least 1 and write the division directly.',
      'Part (c) asks for FULL boxes, which is what integer division already gives you. 7 items at 3 per box is 2 full boxes, not 2.33 and not 3.',
      'Part (d) must multiply before it divides. shipped / total is 0 for every input where shipped is smaller than total, so multiplying that by 100 is still 0.',
    ],
    mutants: [
      { describe: 'part (d) divides before multiplying, so the percentage is always zero',
        find: 'System.out.println(shipped * 100 / total);', replace: 'System.out.println(shipped / total * 100);' },
    ],
    seo: 'AP CSA 1.8 FRQ practice: write to a documented precondition contract and report totals, remainders and a truncated percentage.',
    cases: [
      { prelude: 'int boxes = 10;\nint perBox = 12;\nint shipped = 45;', part: 4, hidden: 0 },
      // Chosen for (b): nothing shipped, so (b) is the whole total and (d) is 0.
      { prelude: 'int boxes = 4;\nint perBox = 25;\nint shipped = 0;', part: 2, hidden: 0 },
      // Chosen for (a): everything shipped, so (b) and (c) are 0 and (d) is 100.
      { prelude: 'int boxes = 3;\nint perBox = 7;\nint shipped = 21;', part: 1, hidden: 1 },
      // Chosen for (c): the leftover does not fill a whole box, so truncation
      // is the only thing separating a right answer from a wrong one.
      { prelude: 'int boxes = 5;\nint perBox = 8;\nint shipped = 37;', part: 3, hidden: 1 },
      { prelude: 'int boxes = 1;\nint perBox = 1;\nint shipped = 0;', part: 3, hidden: 1 },
    ],
  },

  // ── 1.9 ────────────────────────────────────────────────────────────────────
  // THE ONLY driver-mode entry in Unit 1, and the lesson that earns it. 1.9 is
  // Method Signatures: the whole topic is the return type, the parameter list
  // and the order of the parameters. A segment cannot declare a method, so a
  // segment cannot test any of that. Driver mode hands the student a signature
  // to match and a harness that calls it, which is exactly what the exam does.
  {
    lesson: '1.9', unit: U,
    title: 'Method Signatures',
    name: 'Match the Signature',
    mode: 'driver',
    frqType: 'methods-and-control',
    brief: 'This is the first question on the course that scores you on the signature rather than the '
      + 'body. The methods below are called by code you cannot see and cannot edit, so a method that '
      + 'prints instead of returning, or takes its parameters in the other order, fails every case no '
      + 'matter how correct the arithmetic inside it is. That is precisely how the exam works.',
    given: 'Nothing is given. You write a class named Ticket containing exactly the four static methods '
      + 'described below. Do not write a main method: a hidden driver calls your methods and prints what '
      + 'they return.',
    parts: [
      { label: '(a)', text: 'public static int total(int adults, int children) returns the number of people.' },
      { label: '(b)', text: 'public static int cost(int people, int pricePer) returns people times pricePer.' },
      { label: '(c)', text: 'public static double average(int collected, int people) returns collected divided by people as an exact double.' },
      { label: '(d)', text: 'public static String label(String event, int people) returns the event, a space, then the number of people.' },
    ],
    task: [
      'Write class Ticket with the four static methods exactly as their signatures describe. No main method.',
      'Every method RETURNS its answer. A method that prints the answer and returns nothing does not compile against the driver, because the driver uses the returned value.',
      'Part (c) divides two ints and must not truncate, so cast before dividing. The parameter order is collected then people, not people then collected.',
    ],
    starter: [
      'class Ticket {',
      '  // (a) total(int adults, int children) -> int',
      '',
      '  // (b) cost(int people, int pricePer) -> int',
      '',
      '  // (c) average(int collected, int people) -> double',
      '',
      '  // (d) label(String event, int people) -> String',
      '}',
    ].join('\n'),
    reference: [
      'class Ticket {',
      '  public static int total(int adults, int children) {',
      '    return adults + children;',
      '  }',
      '',
      '  public static int cost(int people, int pricePer) {',
      '    return people * pricePer;',
      '  }',
      '',
      '  public static double average(int collected, int people) {',
      '    return (double) collected / people;',
      '  }',
      '',
      '  public static String label(String event, int people) {',
      '    return event + " " + people;',
      '  }',
      '}',
    ].join('\n'),
    harness: [
      'import java.util.Scanner;',
      '',
      'public class Main {',
      '  public static void main(String[] args) {',
      '    Scanner input = new Scanner(System.in);',
      '    int adults = input.nextInt();',
      '    int children = input.nextInt();',
      '    int pricePer = input.nextInt();',
      '    int collected = input.nextInt();',
      '    String event = input.next();',
      '',
      '    int people = Ticket.total(adults, children);',
      '    System.out.println(people);',
      '    System.out.println(Ticket.cost(people, pricePer));',
      '    System.out.println(Ticket.average(collected, people));',
      '    System.out.println(Ticket.label(event, people));',
      '  }',
      '}',
    ].join('\n'),
    hints: [
      'A signature is the name, the parameter types and their ORDER. average(int collected, int people) called with the people first still compiles and still returns the wrong number, which is why the exam writes the order down.',
      'return hands a value back to whoever called. System.out.println shows it to a human. The driver needs the first one; printing inside your method adds a stray line to the output and returns nothing.',
      'Part (c) is (double) collected / people. Casting the whole quotient instead, as (double) (collected / people), truncates first and then converts the already ruined answer.',
    ],
    // The mutant that made this check exist. Before the harness read an
    // independent collected amount, it divided cost by the same people count it
    // had just multiplied by, so this mutant passed every case and part (c) was
    // decoration.
    mutants: [
      { describe: 'part (c) divides two ints and lets the result widen, instead of casting first',
        find: 'return (double) collected / people;', replace: 'return collected / people;' },
      { describe: 'part (c) takes its parameters in the other order',
        find: 'return (double) collected / people;', replace: 'return (double) people / collected;' },
      { describe: 'part (d) joins the event and the count with no space',
        find: "return event + \" \" + people;", replace: 'return event + people;' },
    ],
    seo: 'AP CSA 1.9 FRQ practice: write four static methods that match given signatures exactly, called by a hidden driver you cannot edit.',
    cases: [
      { stdin: '2 3 15 88 Concert\n', part: 1, hidden: 0 },
      // Chosen for (c): 100 collected over 7 people does not divide evenly, so a
      // missing cast prints 14.0 where the answer is 14.285714285714286.
      { stdin: '4 3 16 100 Matinee\n', part: 3, hidden: 0 },
      // Chosen for (d): a one person party, so the label is the shortest it gets.
      { stdin: '1 0 40 40 Gala\n', part: 4, hidden: 1 },
      // Chosen for (b): price of zero, so cost and average are both 0 and only
      // the people count separates a right answer from a constant.
      { stdin: '5 5 0 33 Preview\n', part: 2, hidden: 1 },
      { stdin: '3 4 11 200 Festival\n', part: 3, hidden: 1 },
    ],
  },

  // ── 1.10 ───────────────────────────────────────────────────────────────────
  {
    lesson: '1.10', unit: U,
    title: 'Calling Class Methods',
    name: 'Static Call Chain',
    mode: 'segment',
    frqType: 'methods-and-control',
    brief: 'A class method is called on the CLASS, not on an object, and the return value is the only '
      + 'thing that comes back. The most common lost point in this topic is a call whose result is '
      + 'thrown away: Math.max(a, b); on its own line computes the maximum and discards it.',
    given: 'Three variables are declared and assigned for you: int first, int second and String code.',
    parts: [
      { label: '(a)', text: 'Print the larger of first and second.' },
      { label: '(b)', text: 'Print the square root of the larger value.' },
      { label: '(c)', text: 'Print the length of code.' },
      { label: '(d)', text: 'Print code with every letter in upper case.' },
    ],
    task: [
      'Write a code segment that prints four lines in rubric order.',
      'Math and Integer methods are called on the class. String methods like length and toUpperCase are called on the object.',
      'Every one of these RETURNS a value. A call on a line by itself computes an answer and throws it away.',
    ],
    starter: [
      '// first, second and code are already declared and assigned.',
      '// Print four lines: larger value, its square root, length of code, code upper cased.',
      '',
    ].join('\n'),
    reference: [
      'int larger = Math.max(first, second);',
      'System.out.println(larger);',
      'System.out.println(Math.sqrt(larger));',
      'System.out.println(code.length());',
      'System.out.println(code.toUpperCase());',
    ].join('\n'),
    hints: [
      'Store the larger value once and reuse it. Part (a) and part (b) both need it, and calling Math.max twice is two chances to swap the arguments.',
      'Math.sqrt returns a double, so the answer prints with a decimal point even when the root is a whole number. 16 gives 4.0.',
      'toUpperCase does not change the String it is called on, because a String cannot be changed. It RETURNS a new one, so code.toUpperCase(); on its own line does nothing at all.',
    ],
    seo: 'AP CSA 1.10 FRQ practice: call class and instance methods and print what they return rather than discarding the result.',
    cases: [
      { prelude: 'int first = 9;\nint second = 16;\nString code = "delta";', part: 1, hidden: 0 },
      // Chosen for (b): a root that is not a whole number, so the double return
      // type is visible.
      { prelude: 'int first = 2;\nint second = 1;\nString code = "Ok";', part: 2, hidden: 0 },
      // Chosen for (d): already upper case, so a student who returned the
      // original String passes this one and fails the others. Paired below.
      { prelude: 'int first = 100;\nint second = 4;\nString code = "ABC";', part: 4, hidden: 1 },
      // Chosen for (c): a longer mixed-case string where length and case both matter.
      { prelude: 'int first = 5;\nint second = 25;\nString code = "MixedCase";', part: 3, hidden: 1 },
      { prelude: 'int first = 0;\nint second = 0;\nString code = "z";', part: 4, hidden: 1 },
    ],
  },

  // ── 1.11 ───────────────────────────────────────────────────────────────────
  {
    lesson: '1.11', unit: U,
    title: 'Math Class',
    name: 'Random Range and Rounding',
    mode: 'segment',
    frqType: 'methods-and-control',
    brief: 'Math is the one library the exam expects from memory, and it has three traps in it: pow '
      + 'returns a double, integer division inside a Math call happens before Math ever sees it, and '
      + 'casting a double to an int truncates rather than rounding. This question walks through all three '
      + 'with no randomness, so every answer is checkable.',
    given: 'Three variables are declared and assigned for you: int base, int exponent and double measurement.',
    parts: [
      { label: '(a)', text: 'Print base raised to the exponent.' },
      { label: '(b)', text: 'Print that same power converted to an int by casting.' },
      { label: '(c)', text: 'Print measurement rounded to the nearest whole number using Math.round.' },
      { label: '(d)', text: 'Print measurement truncated toward zero by casting.' },
    ],
    task: [
      'Write a code segment that prints four lines in rubric order.',
      'Parts (c) and (d) are the same number treated two different ways, and they disagree whenever the fraction is one half or more. That disagreement is the point of the question.',
      'Math.round on a double returns a long. Printing it directly is correct.',
    ],
    starter: [
      '// base, exponent and measurement are already declared and assigned.',
      '// Print four lines: the power, the power as an int, the rounded measurement, the truncated measurement.',
      '',
    ].join('\n'),
    reference: [
      'double power = Math.pow(base, exponent);',
      'System.out.println(power);',
      'System.out.println((int) power);',
      'System.out.println(Math.round(measurement));',
      'System.out.println((int) measurement);',
    ].join('\n'),
    hints: [
      'Math.pow always returns a double, so part (a) prints with a decimal point even for 2 to the 3rd. Part (b) is where it becomes an int.',
      'Casting truncates toward zero and never rounds. (int) 7.99 is 7. Math.round(7.99) is 8. A question that asks for both is asking you to show you know the difference.',
      'Compute the power once into a variable. Parts (a) and (b) are the same value shown two ways, and calling Math.pow twice invites a typo in one of them.',
    ],
    mutants: [
      { describe: 'part (c) truncates instead of rounding',
        find: 'System.out.println(Math.round(measurement));', replace: 'System.out.println((int) measurement);' },
    ],
    seo: 'AP CSA 1.11 FRQ practice: use Math.pow and Math.round and show the difference between rounding and casting a double to an int.',
    cases: [
      { prelude: 'int base = 2;\nint exponent = 3;\ndouble measurement = 4.5;', part: 3, hidden: 0 },
      // Chosen for (d): the fraction is below a half, so round and cast AGREE.
      // This is the row that proves a student who used one for both is not
      // simply lucky on the visible sample.
      { prelude: 'int base = 5;\nint exponent = 2;\ndouble measurement = 9.2;', part: 4, hidden: 0 },
      // Chosen for (a): exponent 0, so the power is 1.0 for any base.
      { prelude: 'int base = 7;\nint exponent = 0;\ndouble measurement = 0.5;', part: 1, hidden: 1 },
      // Chosen for (c): just under the next whole number, where rounding up and
      // truncating down differ by one.
      { prelude: 'int base = 3;\nint exponent = 4;\ndouble measurement = 12.999;', part: 3, hidden: 1 },
      { prelude: 'int base = 10;\nint exponent = 1;\ndouble measurement = 0.4;', part: 2, hidden: 1 },
    ],
  },

  // ── 1.12 ───────────────────────────────────────────────────────────────────
  {
    lesson: '1.12', unit: U,
    title: 'Objects: Instances of Classes',
    name: 'Two References, One Object',
    mode: 'segment',
    frqType: 'methods-and-control',
    brief: 'An object is not its variable. Two names can point at the same object, and two separate '
      + 'objects can hold equal contents while == says they are different things. This is the single '
      + 'most tested idea in the whole unit and it is where == on Strings comes from.',
    given: 'Three String variables are declared and assigned for you: a, b and c. '
      + 'a and b are built from the same literal; c is built with new.',
    parts: [
      { label: '(a)', text: 'Print whether a and b are the same object, using ==.' },
      { label: '(b)', text: 'Print whether a and c are the same object, using ==.' },
      { label: '(c)', text: 'Print whether a and c hold the same characters, using equals.' },
      { label: '(d)', text: 'Print the length of c.' },
    ],
    task: [
      'Write a code segment that prints four lines in rubric order.',
      'Parts (a) and (b) ask about identity, which is what == compares for objects. Part (c) asks about contents, which is what equals compares.',
      'Do not use an if. A comparison is already a boolean and can be printed directly.',
    ],
    starter: [
      '// a, b and c are already declared and assigned.',
      '// Print four lines: a == b, a == c, a.equals(c), and the length of c.',
      '',
    ].join('\n'),
    reference: [
      'System.out.println(a == b);',
      'System.out.println(a == c);',
      'System.out.println(a.equals(c));',
      'System.out.println(c.length());',
    ].join('\n'),
    hints: [
      'For objects, == asks "is this the very same object in memory", not "do these look alike". Two Strings with identical characters can be two different objects.',
      'new ALWAYS makes a new object. That is why a == c is false even though the characters match, and it is the whole reason equals exists.',
      'You do not need an if for any part. System.out.println(a == b) prints true or false by itself.',
    ],
    mutants: [
      { describe: 'part (c) uses == for contents instead of equals',
        find: 'System.out.println(a.equals(c));', replace: 'System.out.println(a == c);' },
    ],
    seo: 'AP CSA 1.12 FRQ practice: tell object identity from object equality by comparing String references with double equals and with equals.',
    cases: [
      { prelude: 'String a = "sunrise";\nString b = "sunrise";\nString c = new String("sunrise");', part: 1, hidden: 0 },
      // Chosen for (c): the contents DIFFER, so equals is false here while it
      // was true above. A student who hardcoded true fails this row.
      { prelude: 'String a = "north";\nString b = "north";\nString c = new String("south");', part: 3, hidden: 0 },
      // Chosen for (d): a longer string, so the length row cannot be guessed
      // from the visible samples.
      { prelude: 'String a = "x";\nString b = "x";\nString c = new String("abcdefghij");', part: 4, hidden: 1 },
      // Chosen for (b): identical contents again, to confirm == stays false for
      // a new object no matter what it holds.
      { prelude: 'String a = "same";\nString b = "same";\nString c = new String("same");', part: 2, hidden: 1 },
      { prelude: 'String a = "AB";\nString b = "AB";\nString c = new String("ab");', part: 3, hidden: 1 },
    ],
  },

  // ── 1.13 ───────────────────────────────────────────────────────────────────
  {
    lesson: '1.13', unit: U,
    title: 'Object Creation and Storage (Instantiation)',
    name: 'Immutable Strings',
    mode: 'segment',
    frqType: 'methods-and-control',
    brief: 'Creating an object and changing a variable are different acts. A String can never be '
      + 'changed, so every method that looks like it edits one is really building a new one and handing '
      + 'it back. A student who calls the method and does not store the result has created an object and '
      + 'thrown it away, and the exam scores exactly that.',
    given: 'Two variables are declared and assigned for you: String word and String suffix.',
    parts: [
      { label: '(a)', text: 'Print word unchanged.' },
      { label: '(b)', text: 'Build a new String from word and suffix joined together, and print it.' },
      { label: '(c)', text: 'Print word again, to show it did not change.' },
      { label: '(d)', text: 'Print the length of the joined String.' },
    ],
    task: [
      'Write a code segment that prints four lines in rubric order.',
      'Part (c) must print the ORIGINAL word. If your part (b) changed word itself, part (c) will disagree with part (a) and both cannot be right.',
      'Store the joined String in its own variable. Parts (b) and (d) both need it.',
    ],
    starter: [
      '// word and suffix are already declared and assigned.',
      '// Print four lines: word, the joined String, word again, and the joined length.',
      '',
    ].join('\n'),
    reference: [
      'System.out.println(word);',
      'String joined = word + suffix;',
      'System.out.println(joined);',
      'System.out.println(word);',
      'System.out.println(joined.length());',
    ].join('\n'),
    hints: [
      'Parts (a) and (c) print the same thing, on purpose. That is the evidence that building a new String left the original alone.',
      'word = word + suffix would make part (c) print the joined value and lose the point. Assign to a NEW variable instead.',
      'Part (d) is the length of the joined String, not of word. Store the join once and ask that variable for its length.',
    ],
    mutants: [
      { describe: 'part (b) reassigns word, so part (c) can no longer show it was unchanged',
        find: 'String joined = word + suffix;', replace: 'word = word + suffix;\n      String joined = word;' },
    ],
    seo: 'AP CSA 1.13 FRQ practice: instantiate a new String from two others and show that the original object is unchanged.',
    cases: [
      { prelude: 'String word = "note";\nString suffix = "book";', part: 2, hidden: 0 },
      // Chosen for (c): an empty suffix, so the joined String EQUALS word and
      // the only thing separating a right answer from a wrong one is that all
      // three of (a), (b) and (c) still print.
      { prelude: 'String word = "solo";\nString suffix = "";', part: 3, hidden: 0 },
      // Chosen for (d): a long suffix, so the length row cannot be guessed.
      { prelude: 'String word = "a";\nString suffix = "bcdefghijk";', part: 4, hidden: 1 },
      // Chosen for (a): an empty word, the mirror of the visible empty suffix.
      { prelude: 'String word = "";\nString suffix = "tail";', part: 1, hidden: 1 },
      { prelude: 'String word = "Cap";\nString suffix = "Stone";', part: 2, hidden: 1 },
    ],
  },

  // ── 1.14 ───────────────────────────────────────────────────────────────────
  {
    lesson: '1.14', unit: U,
    title: 'Calling Instance Methods',
    name: 'Reading a Record',
    mode: 'segment',
    frqType: 'methods-and-control',
    brief: 'An instance method is called ON an object and usually answers a question about that '
      + 'particular object. The exam grades whether you called it on the right one: two objects of the '
      + 'same type accept the same calls, and asking the wrong object is a mistake that compiles cleanly '
      + 'and gives a plausible wrong answer.',
    given: 'Two String variables are declared and assigned for you: title and author.',
    parts: [
      { label: '(a)', text: 'Print the first character of title.' },
      { label: '(b)', text: 'Print the number of characters in author.' },
      { label: '(c)', text: 'Print the last character of author.' },
      { label: '(d)', text: 'Print title in lower case.' },
    ],
    task: [
      'Write a code segment that prints four lines in rubric order.',
      'Watch which object each part asks. Parts (a) and (d) are about title; parts (b) and (c) are about author.',
      'The last character sits at index length() - 1, because indexes start at 0.',
    ],
    starter: [
      '// title and author are already declared and assigned.',
      '// Print four lines: first char of title, length of author, last char of author, title lower cased.',
      '',
    ].join('\n'),
    reference: [
      'System.out.println(title.charAt(0));',
      'System.out.println(author.length());',
      'System.out.println(author.charAt(author.length() - 1));',
      'System.out.println(title.toLowerCase());',
    ].join('\n'),
    hints: [
      'charAt(0) is the first character, not charAt(1). Indexes start at zero, so the last one is length() - 1.',
      'Read each part again and check which variable it names. title.length() compiles perfectly and answers a question nobody asked.',
      'toLowerCase returns a new String rather than changing title. Print what it returns.',
    ],
    mutants: [
      { describe: 'part (a) treats the first character as index 1',
        find: 'System.out.println(title.charAt(0));', replace: 'System.out.println(title.charAt(1));' },
      { describe: 'part (b) asks the wrong object for its length',
        find: 'System.out.println(author.length());', replace: 'System.out.println(title.length());' },
    ],
    seo: 'AP CSA 1.14 FRQ practice: call instance methods on the correct String object and index the first and last characters correctly.',
    cases: [
      { prelude: 'String title = "Dune";\nString author = "Herbert";', part: 1, hidden: 0 },
      // Chosen for (b): title and author have DIFFERENT lengths, so a student
      // who asked the wrong object gets a visibly wrong number.
      { prelude: 'String title = "It";\nString author = "King";', part: 2, hidden: 0 },
      // Chosen for (c): a single character author, where first and last coincide.
      { prelude: 'String title = "Emma";\nString author = "A";', part: 3, hidden: 1 },
      // Chosen for (d): already lower case, paired with a mixed case row below.
      { prelude: 'String title = "quiet";\nString author = "Cain";', part: 4, hidden: 1 },
      { prelude: 'String title = "MIXED Case";\nString author = "Zz";', part: 4, hidden: 1 },
    ],
  },

  // ── 1.15 ───────────────────────────────────────────────────────────────────
  {
    lesson: '1.15', unit: U,
    title: 'String Manipulation',
    name: 'Split a Record Line',
    mode: 'segment',
    frqType: 'methods-and-control',
    brief: 'substring and indexOf together are the most heavily tested pair in Unit 1, and the exam '
      + 'always tests the same boundary: substring(a, b) includes a and EXCLUDES b. Off by one here is '
      + 'not a typo, it is the whole question.',
    given: 'One variable is declared and assigned for you: String record, which always contains exactly '
      + 'one comma, with at least one character on each side of it.',
    parts: [
      { label: '(a)', text: 'Print the position of the comma.' },
      { label: '(b)', text: 'Print everything before the comma.' },
      { label: '(c)', text: 'Print everything after the comma.' },
      { label: '(d)', text: 'Print the total number of characters that are not the comma.' },
    ],
    task: [
      'Write a code segment that prints four lines in rubric order.',
      'Neither part (b) nor part (c) may include the comma itself. substring(0, i) stops just before index i, and substring(i + 1) starts just after it.',
      'The precondition guarantees there is exactly one comma, so part (d) is the length minus one.',
    ],
    starter: [
      '// record is already declared and assigned, and contains exactly one comma.',
      '// Print four lines: comma position, text before it, text after it, characters that are not the comma.',
      '',
    ].join('\n'),
    reference: [
      'int at = record.indexOf(",");',
      'System.out.println(at);',
      'System.out.println(record.substring(0, at));',
      'System.out.println(record.substring(at + 1));',
      'System.out.println(record.length() - 1);',
    ].join('\n'),
    hints: [
      'substring(0, at) gives characters 0 through at - 1, which is everything before the comma and not the comma. Using at + 1 as the end includes it.',
      'The one argument form, substring(at + 1), runs to the end of the String. There is no need to pass length() as a second argument, though it is not wrong to.',
      'Store indexOf once. Parts (a), (b) and (c) all need the same position, and calling indexOf three times is three chances to write one of them differently.',
    ],
    mutants: [
      { describe: 'part (b) includes the comma, the classic substring off-by-one',
        find: 'System.out.println(record.substring(0, at));', replace: 'System.out.println(record.substring(0, at + 1));' },
      { describe: 'part (c) starts AT the comma instead of after it',
        find: 'System.out.println(record.substring(at + 1));', replace: 'System.out.println(record.substring(at));' },
    ],
    seo: 'AP CSA 1.15 FRQ practice: use indexOf and substring to split a record at its comma without including the separator.',
    cases: [
      { prelude: 'String record = "Smith,Alice";', part: 2, hidden: 0 },
      // Chosen for (a): the comma is at index 1, near the very start, which
      // makes an off-by-one in (b) print an empty line or the comma itself.
      { prelude: 'String record = "A,longer second part";', part: 1, hidden: 0 },
      // Chosen for (c): a single character after the comma.
      { prelude: 'String record = "prefix,z";', part: 3, hidden: 1 },
      // Chosen for (d): a longer record, so the count cannot be read off the samples.
      { prelude: 'String record = "abcdefghij,klmnopqrst";', part: 4, hidden: 1 },
      { prelude: 'String record = "q,w";', part: 4, hidden: 1 },
    ],
  },
];

module.exports = { FRQS };
