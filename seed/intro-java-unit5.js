'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  INTRO TO JAVA, UNIT 5: ARRAYS.
//
//  Same shape as Units 1 to 4 (see seed/intro-java-unit1.js for the rules).
//
//  ── THIS UNIT IS ONE IDEA REPEATED UNTIL IT IS AUTOMATIC ────────────────────
//  An array of length n has indexes 0 to n-1. Every lesson here is that fact
//  wearing a different hat, because it is the fact Unit 6 is entirely built on
//  and the one that produces ArrayIndexOutOfBoundsException in the meantime.
//
//  Students have already met it three times without the word "array": world
//  coordinates run 0 to width-1 (3.5), getRandomNumber(n) never returns n
//  (2.6), and a for loop with i < n stops at n-1 (4.2). This unit names the
//  pattern and makes it explicit, which is why those callbacks are in the text.
//
//  ── THE ONE INCONSISTENCY WORTH WARNING ABOUT ───────────────────────────────
//  A List uses size() with parentheses. An array uses length with none. That is
//  Java being inconsistent, not the student misremembering, and saying so is
//  worth more than letting them assume they are wrong.
//
//  Zero PII: author content only. No em-dashes, per repo convention. ASCII only.
// ─────────────────────────────────────────────────────────────────────────────

const COURSE = 'intro-java';
const UNIT = 'unit-5';
const LABEL = 'Unit 5: Arrays';

const SHOT = (lesson, n, alt) => ({ src: `intro-java/${lesson}/step-${n}.png`, alt });

const LESSONS = [
  // ── 5.1 ────────────────────────────────────────────────────────────────────
  {
    lesson: '5.1',
    slug: 'declaring-an-array',
    title: 'Declaring an Array',
    minutes: 30,
    seo: {
      h1: 'Declaring an Array in Java',
      title: 'Java Arrays: How to Declare and Create One | Intro to Java',
      description:
        'How to declare a Java array, the two ways to create one, and why every slot starts at '
        + 'zero. Beginner lesson with practice and a quiz.',
      primary: 'how to declare an array in java',
      related: ['java array initializer list', 'java new int array',
        'java array default values', 'greenfoot array of values'],
      faq: [
        {
          q: 'How do you declare an array in Java?',
          a: 'Write the type with square brackets, then a name: int[] scores. Then create it with '
            + 'new int[5], or with a list of values in braces.',
        },
        {
          q: 'What is in a new Java array before you put anything in it?',
          a: 'Zeros for an int array, false for boolean, and null for objects. Java fills every '
            + 'slot rather than leaving rubbish there.',
        },
        {
          q: 'Can a Java array change size after it is created?',
          a: 'No. The size is fixed when you create it. That is the main difference from a List.',
        },
      ],
    },

    hook:
      'You know how to store one score. Now store twenty, without twenty variables. An array is one '
      + 'name with numbered slots behind it.',

    objectives: [
      'Declare and create an array in both forms',
      'State what a newly created array contains',
      'Explain why an array cannot change size',
    ],

    vocab: [
      { term: 'Array', plain: 'One name with numbered slots behind it.',
        formal: 'A fixed-size, indexed sequence of values of one type.' },
      { term: 'Element', plain: 'One slot, and what is in it.',
        formal: 'A single position in an array, addressed by index.' },
    ],

    steps: [
      {
        shot: SHOT('5.1', 1, 'A diagram of an array as five numbered boxes under a single name.'),
        code: 'int[] scores = new int[5];',
        note:
          'Read it in two halves.\n\n'
          + '`int[] scores` declares the name. The square brackets mean "an array of", so this is '
          + 'an array of int called scores.\n\n'
          + '`new int[5]` builds it with five slots. That is the same `new` from 1.3: you are '
          + 'making an object.\n\n'
          + 'Five slots, numbered 0, 1, 2, 3 and 4. Not 1 to 5. That numbering is the whole unit.',
      },
      {
        shot: SHOT('5.1', 2, 'The same array shown with all five slots containing zero.'),
        code:
          'int[] scores = new int[5];\n'
          + '// scores is now {0, 0, 0, 0, 0}',
        note:
          'Java fills every slot for you. An int array starts as all zeros, a boolean array as all '
          + 'false, and an array of objects as all null.\n\n'
          + 'This is genuinely helpful: you never get whatever rubbish was in that memory before, '
          + 'which some other languages will hand you.',
      },
      {
        shot: SHOT('5.1', 3, 'An array created from a list of values in braces.'),
        code: 'int[] lanes = {3, 7, 2, 9};',
        note:
          'The second form. When you already know the values, list them in braces and Java works '
          + 'out the size.\n\n'
          + 'Four values means four slots, numbered 0 to 3. No `new` needed, and no size written '
          + 'down that could disagree with the list.\n\n'
          + 'This is the form you will use for a level layout, and it is how Unit 6 writes a map.',
      },
      {
        shot: SHOT('5.1', 4, 'An attempt to add a sixth element to a five-element array, showing '
          + 'it is not possible.'),
        code:
          'int[] scores = new int[5];\n'
          + '// There is no way to make this six slots.\n'
          + '// You would create a new, bigger array and copy across.',
        note:
          'The size is fixed at creation. Forever.\n\n'
          + 'That is the trade against a List from 4.5, which grows as you add to it. An array is '
          + 'simpler and faster; a List is flexible. When you know how many you need, an array is '
          + 'the right tool, and a tile map always knows.',
      },
    ],

    misconceptions: [
      {
        wrong: 'A five-slot array has slots 1 to 5.',
        right: 'It has slots 0 to 4.',
        why: 'This single belief causes every ArrayIndexOutOfBoundsException in the unit.',
      },
      {
        wrong: 'A new array contains rubbish until you fill it.',
        right: 'Java fills it: zeros, false, or null.',
        why: 'Knowing this means a zero you did not put there is expected, not a bug.',
      },
      {
        wrong: 'An array can grow when you need more room.',
        right: 'The size is fixed at creation.',
        why: 'This is the reason to reach for a List instead when the count is unknown.',
      },
      {
        wrong: 'The parentheses go after the name, like `int scores[]`.',
        right: 'Java allows both, but this course always writes `int[] scores`.',
        why: 'One consistent form is easier to read, and `int[]` keeps the type together.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'How many slots does `new int[4]` create?',
        options: ['4', '3', '5', 'It depends'],
        answer: 0,
        why: 'The number in the parentheses is the count of slots.',
      },
      {
        id: 'cfu-2',
        stem: 'What are the valid slot numbers for `new int[4]`?',
        options: ['1, 2, 3, 4', '1, 2, 3', '0, 1, 2, 3, 4', '0, 1, 2, 3'],
        answer: 3,
        why: 'Indexes always start at 0, so four slots are 0 to 3.',
      },
      {
        id: 'cfu-3',
        stem: 'What is in `new int[3]` immediately after it is created?',
        options: ['Rubbish', 'Nothing at all', 'Three zeros', 'null'],
        answer: 2,
        why: 'Java fills an int array with zeros.',
      },
      {
        id: 'cfu-4',
        stem: 'How many slots does `int[] a = {5, 1, 9};` create?',
        options: ['0', '9', '3', '5'],
        answer: 2,
        why: 'The size comes from how many values you listed.',
      },
      {
        id: 'cfu-5',
        stem: 'You need a collection that grows as the game runs. Array or List?',
        options: ['List, because an array cannot change size', 'Array, always', 'Either', 'Neither'],
        answer: 0,
        why: 'Array size is fixed at creation.',
      },
    ],

    gap: {
      intro:
        'Create an array to hold the height of each of six columns, all starting at zero, and a '
        + 'second array holding the fixed lane positions 2, 5 and 8.',
      code:
        'int___1___ heights = new ___2___[6];\n'
        + 'int[] lanes = ___3___2, 5, 8};',
      holes: [
        { n: 1, hint: 'Two characters that mean "an array of".', accept: ['[]'] },
        { n: 2, hint: 'What kind of value goes in each slot?', accept: ['int'] },
        { n: 3, hint: 'The opening character of a list of values.', accept: ['{'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: '`int[] a = new int[10];` How many slots and what are they numbered?',
        options: ['10 slots, 1 to 10', '11 slots, 0 to 10', '9 slots, 0 to 8', '10 slots, 0 to 9'],
        answer: 3,
        why: 'Ten slots always numbered from zero.',
      },
      {
        id: 'q2',
        stem: 'Which creates an array containing 4, 8 and 15?',
        options: [
          'int[] a = new int[4, 8, 15];',
          'int[] a = (4, 8, 15);',
          'int[] a = {4, 8, 15};',
          'int a[] = new int(3);',
        ],
        answer: 2,
        why: 'Braces around the values, and Java counts them.',
      },
      {
        id: 'q3',
        stem: 'A boolean array is created with new boolean[3]. What is in it?',
        options: ['Three falses', 'Three nulls', 'Three zeros', 'Nothing'],
        answer: 0,
        why: 'Java fills with the default for the type, which for boolean is false.',
      },
      {
        id: 'q4',
        stem: 'The main difference between an array and a List is that:',
        options: [
          'An array has a fixed size',
          'An array is slower',
          'A List cannot hold numbers',
          'There is no difference',
        ],
        answer: 0,
        why: 'Fixed size at creation is the defining constraint.',
      },
    ],

    stuck: ['E-01', 'E-10'],

    recap: [
      '`int[] a = new int[5];` makes five slots, numbered 0 to 4.',
      '`int[] a = {3, 7, 2};` makes three slots from the values you list.',
      'A new array is filled with zeros, false, or null.',
      'The size is fixed at creation and can never change.',
    ],
  },

  // ── 5.2 ────────────────────────────────────────────────────────────────────
  {
    lesson: '5.2',
    slug: 'index-and-length',
    title: 'Index and length',
    minutes: 30,
    seo: {
      h1: 'Array Index and length in Java',
      title: 'Java Array Index Out of Bounds Explained | Intro to Java',
      description:
        'Why the last index of a Java array is length minus one, why length has no parentheses, and '
        + 'how to read an ArrayIndexOutOfBoundsException.',
      primary: 'java array index out of bounds explained',
      related: ['java array length no parentheses', 'java last index of array',
        'arrayindexoutofboundsexception beginner', 'java array off by one'],
      faq: [
        {
          q: 'Why is the last index of a Java array length minus one?',
          a: 'Because indexes start at 0. An array of 5 has indexes 0, 1, 2, 3 and 4, so index 5 is '
            + 'past the end.',
        },
        {
          q: 'Why does Java array length have no parentheses?',
          a: 'For an array it is a field, not a method. A List uses size() with parentheses. That '
            + 'inconsistency is Java being awkward, not you misremembering.',
        },
        {
          q: 'What does ArrayIndexOutOfBoundsException mean?',
          a: 'You used an index the array does not have. The message names the index you tried, '
            + 'which is usually one past the end.',
        },
      ],
    },

    hook:
      'This is the lesson that decides whether Unit 6 goes smoothly or is a fortnight of red error '
      + 'messages. It is one rule, and you have already met it three times without the word array.',

    objectives: [
      'Read and write a single element by index',
      'Use length correctly, without parentheses',
      'Explain the last valid index and read an out-of-bounds message',
    ],

    vocab: [
      { term: 'Index', plain: 'Which slot. Counting from 0.',
        formal: 'The integer position of an element, from 0 to length-1.' },
      { term: 'length', plain: 'How many slots. A field, not a method.',
        formal: 'The fixed number of elements, accessed as a.length with no parentheses.' },
    ],

    steps: [
      {
        shot: SHOT('5.2', 1, 'An array diagram with each slot labeled with its index below it.'),
        code:
          'int[] lanes = {3, 7, 2, 9};\n'
          + 'lanes[0]   // 3\n'
          + 'lanes[1]   // 7\n'
          + 'lanes[3]   // 9',
        note:
          'Square brackets after the name pick a slot.\n\n'
          + '`lanes[0]` is the FIRST one. The index is not "which position counting from one", it '
          + 'is "how far along from the start", and the first element is zero steps along.\n\n'
          + 'That phrasing is worth adopting. It makes 0 feel correct rather than arbitrary.',
      },
      {
        shot: SHOT('5.2', 2, 'An assignment into a specific array slot.'),
        code:
          'lanes[2] = 5;\n'
          + '// lanes is now {3, 7, 5, 9}',
        note:
          'An indexed slot behaves exactly like a variable. You can read from it and assign into it '
          + 'with `=`.\n\n'
          + 'Nothing new. `lanes[2]` is just a name for one particular box.',
      },
      {
        shot: SHOT('5.2', 3, 'The length field being used, contrasted with the size method of a '
          + 'List.'),
        code:
          'int[] lanes = {3, 7, 2, 9};\n'
          + 'lanes.length      // 4, NO parentheses\n'
          + '\n'
          + 'List<Enemy> es = getObjects(Enemy.class);\n'
          + 'es.size()         // parentheses, because it is a method',
        note:
          'Arrays use `length` with NO parentheses. Lists use `size()` WITH parentheses.\n\n'
          + 'There is no logic to remember here that would help you. It is an inconsistency in '
          + 'Java, and everybody gets it wrong sometimes. If `length()` fails, drop the parentheses; '
          + 'if `size` fails, add them.',
      },
      {
        shot: SHOT('5.2', 4, 'An ArrayIndexOutOfBoundsException with the offending index visible in '
          + 'the message.'),
        code:
          'int[] lanes = {3, 7, 2, 9};   // length 4\n'
          + 'lanes[4];                     // THROWS: index 4 out of bounds for length 4',
        note:
          'Length 4 means the last valid index is 3. Asking for 4 throws.\n\n'
          + 'Read the message: it names the index you tried AND the length. When the index is '
          + 'exactly the length, as here, you have the classic off-by-one and the fix is almost '
          + 'always changing `<=` to `<` in a loop.\n\n'
          + 'You have met this rule three times already: world coordinates run 0 to width-1, '
          + 'getRandomNumber(n) never gives n, and `i < n` stops at n-1. Same rule, fourth costume.',
      },
    ],

    misconceptions: [
      {
        wrong: '`a[a.length]` is the last element.',
        right: 'It is one PAST the last, and it throws. The last is `a[a.length - 1]`.',
        why: 'The single most common array error there is.',
      },
      {
        wrong: 'length is a method, so it needs parentheses.',
        right: 'For an array it is a field: `a.length`. Lists use `size()`.',
        why: 'Java is genuinely inconsistent, and students assume they are misremembering.',
      },
      {
        wrong: 'ArrayIndexOutOfBoundsException means the array is broken.',
        right: 'It means you asked for a slot that does not exist. The array is fine.',
        why: 'Students rebuild working arrays instead of fixing the index.',
      },
      {
        wrong: 'Negative indexes count from the end.',
        right: 'They throw. Java has no such feature.',
        why: 'True in some other languages, and a reasonable guess that fails immediately.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: '`int[] a = {10, 20, 30};` What is `a[1]`?',
        options: ['20', '10', '30', 'An error'],
        answer: 0,
        why: 'Index 1 is one step along from the start, which is the second value.',
      },
      {
        id: 'cfu-2',
        stem: 'An array has length 6. What is the last valid index?',
        options: ['6', '0', '7', '5'],
        answer: 3,
        why: 'Indexes run 0 to length minus one.',
      },
      {
        id: 'cfu-3',
        stem: 'How do you get the number of slots in an array called grid?',
        options: ['grid.size()', 'grid.length()', 'grid.length', 'length(grid)'],
        answer: 2,
        why: 'A field, so no parentheses.',
      },
      {
        id: 'cfu-4',
        stem: '`int[] a = new int[3]; a[3] = 9;` What happens?',
        options: [
          'a becomes {0,0,0,9}',
          'Nothing',
          'ArrayIndexOutOfBoundsException, because the last valid index is 2',
          'a[0] is set to 9',
        ],
        answer: 2,
        why: 'Three slots are 0, 1 and 2.',
      },
      {
        id: 'cfu-5',
        stem: 'How do you read the LAST element of an array called a?',
        options: ['a[a.length - 1]', 'a[a.length]', 'a[last]', 'a[-1]'],
        answer: 0,
        why: 'One before the length.',
      },
    ],

    gap: {
      intro:
        'Read the first and last elements of an array called lanes, without assuming how long it is.',
      code:
        'int first = lanes[___1___];\n'
        + 'int last  = lanes[lanes.___2___ ___3___ 1];',
      holes: [
        { n: 1, hint: 'How far along from the start is the very first element?', accept: ['0'] },
        { n: 2, hint: 'The number of slots. Remember whether it takes parentheses.',
          accept: ['length'] },
        { n: 3, hint: 'The last index is one less than that.', accept: ['-'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'An array of length 8 has valid indexes:',
        options: ['1 to 8', '0 to 8', '0 to 7', '1 to 7'],
        answer: 2,
        why: 'Zero through length minus one.',
      },
      {
        id: 'q2',
        stem: 'Which is correct for an array?',
        options: ['a.size()', 'a.count', 'a.length()', 'a.length'],
        answer: 3,
        why: 'length is a field on an array.',
      },
      {
        id: 'q3',
        stem: 'A message says "index 5 out of bounds for length 5". What is the likely fix?',
        options: [
          'Make the array bigger',
          'Use a List instead',
          'Change a <= to a < in the loop condition',
          'Start the loop at 1',
        ],
        answer: 2,
        why: 'An index exactly equal to the length is the classic off-by-one from <=.',
      },
      {
        id: 'q4',
        stem: 'What does `a[-1]` do in Java?',
        options: ['Throws an exception', 'Returns the last element', 'Returns 0', 'Returns the first element'],
        answer: 0,
        why: 'Java has no negative indexing.',
      },
    ],

    stuck: ['E-10', 'G-18'],

    recap: [
      'Index 0 is the first element. Think "how far along from the start".',
      'The last valid index is length - 1.',
      'Arrays use `length` with NO parentheses. Lists use `size()` WITH parentheses.',
      'An index equal to the length is the classic off-by-one.',
    ],
  },

  // ── 5.3 ────────────────────────────────────────────────────────────────────
  {
    lesson: '5.3',
    slug: 'traversing-with-for',
    title: 'Traversing with for',
    minutes: 25,
    seo: {
      h1: 'Looping Through an Array in Java',
      title: 'Java Array Traversal with a for Loop | Intro to Java',
      description:
        'The standard Java array traversal loop, why the condition uses length and not a fixed '
        + 'number, and how to fill an array as you go.',
      primary: 'java loop through array',
      related: ['java array traversal for loop', 'java fill array loop',
        'java i < array.length', 'java array loop off by one'],
      faq: [
        {
          q: 'What is the standard way to loop through an array in Java?',
          a: 'for (int i = 0; i < a.length; i++) and then use a[i] inside. Using a.length rather '
            + 'than a fixed number means the loop stays correct if the array changes.',
        },
        {
          q: 'Why use a.length instead of typing the size?',
          a: 'A typed number goes stale the moment the array changes size, and the loop then either '
            + 'misses elements or throws.',
        },
        {
          q: 'How do I fill an array with values in a loop?',
          a: 'Assign into a[i] inside the traversal, for example a[i] = i * 2.',
        },
      ],
    },

    hook:
      'One loop shape gets used for the rest of this course and the whole of Unit 6. Learn it as a '
      + 'unit rather than as four separate decisions.',

    objectives: [
      'Write the standard array traversal',
      'Explain why the condition uses length rather than a number',
      'Fill an array inside a loop',
    ],

    vocab: [
      { term: 'Traverse', plain: 'Visit every element in turn.',
        formal: 'Iterate over the full index range of an array.' },
    ],

    steps: [
      {
        shot: SHOT('5.3', 1, 'The standard traversal loop with the index used inside the body.'),
        code:
          'int[] lanes = {3, 7, 2, 9};\n'
          + 'for (int i = 0; i < lanes.length; i++)\n'
          + '{\n'
          + '    addObject(new Coin(), lanes[i], 0);\n'
          + '}',
        note:
          'This is the shape. Commit it to memory as one thing:\n\n'
          + '`for (int i = 0; i < a.length; i++)`\n\n'
          + 'Start at 0 because that is the first index. Stop BEFORE length because the last index '
          + 'is length minus one. Step by one to visit each in turn.\n\n'
          + 'Inside, `lanes[i]` is the element at this pass.',
      },
      {
        shot: SHOT('5.3', 2, 'A traversal that hardcodes the size and misses an element after the '
          + 'array is changed.'),
        code:
          'int[] lanes = {3, 7, 2, 9, 5};   // now five\n'
          + 'for (int i = 0; i < 4; i++)      // still says four\n'
          + '{\n'
          + '    // the 5 is never visited\n'
          + '}',
        note:
          'Why `lanes.length` rather than 4? Because arrays change during development.\n\n'
          + 'Add a fifth value and this loop silently misses it. No error, just an element that is '
          + 'never processed. Write `<= 4` instead and you get the opposite failure, an exception.\n\n'
          + '`i < a.length` is correct at every size, forever, and needs no maintenance.',
      },
      {
        shot: SHOT('5.3', 3, 'A loop filling an array with computed values.'),
        code:
          'int[] squares = new int[5];\n'
          + 'for (int i = 0; i < squares.length; i++)\n'
          + '{\n'
          + '    squares[i] = i * i;\n'
          + '}\n'
          + '// {0, 1, 4, 9, 16}',
        note:
          'Filling rather than reading. Same loop, with the assignment the other way round.\n\n'
          + 'And here is the counter-in-a-calculation idea from 4.7 again: `i * i` turns the index '
          + 'into a value. Unit 6 uses exactly this to turn an index into a screen position.',
      },
    ],

    misconceptions: [
      {
        wrong: '`i <= a.length` visits everything.',
        right: 'It goes one past the end and throws. Use `<`.',
        why: 'The most common array loop bug, and the exception names an index equal to the length.',
      },
      {
        wrong: 'Hardcoding the size is fine if you know it.',
        right: 'It goes stale the moment the array changes, silently.',
        why: 'A loop that misses the last element produces no error at all.',
      },
      {
        wrong: 'The loop variable must be called i.',
        right: 'Convention only. In Unit 6 you will use row and col, which read far better.',
        why: 'Meaningful names matter more in nested loops, which is where this is going.',
      },
      {
        wrong: 'You cannot change the array while traversing it.',
        right: 'Changing VALUES is fine. Arrays cannot change SIZE, so the list problem from 4.5 '
          + 'does not arise.',
        why: 'Students over-apply the ConcurrentModificationException rule to arrays, where it '
          + 'cannot happen.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'What is the standard array traversal condition?',
        options: ['i <= a.length', 'i <= a.length - 1', 'i < a.length - 1', 'i < a.length'],
        answer: 3,
        why: 'Stops one before the length, which is the last valid index.',
      },
      {
        id: 'cfu-2',
        stem: 'An array has 5 elements and the loop uses `i <= a.length`. What happens?',
        options: ['It visits all five', 'It visits four', 'It throws on the sixth pass', 'It never runs'],
        answer: 2,
        why: 'It tries index 5, which does not exist.',
      },
      {
        id: 'cfu-3',
        stem: 'Why write `a.length` rather than the number?',
        options: [
          'It stays correct when the array changes size',
          'It is shorter',
          'Java requires it',
          'It is faster',
        ],
        answer: 0,
        why: 'A hardcoded size silently goes stale.',
      },
      {
        id: 'cfu-4',
        stem: 'After `for (int i = 0; i < 4; i++) { a[i] = i * 3; }` what is a?',
        options: ['{0,3,6,9}', '{3,6,9,12}', '{0,1,2,3}', '{1,3,6,9}'],
        answer: 0,
        why: 'i takes 0, 1, 2, 3 and each is multiplied by three.',
      },
    ],

    gap: {
      intro:
        'Fill an array called heights so that each slot holds twice its own index, and do it in a '
        + 'way that stays correct if the array size changes.',
      code:
        'for (int i = 0; i ___1___ heights.___2___; i++)\n'
        + '{\n'
        + '    heights[i] = ___3___ * 2;\n'
        + '}',
      holes: [
        { n: 1, hint: 'Stop one before the end. One character.', accept: ['<'] },
        { n: 2, hint: 'How many slots. Remember: no parentheses on an array.', accept: ['length'] },
        { n: 3, hint: 'The loop counter, which is also the slot number.', accept: ['i'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'Which loop safely visits every element of any array a?',
        options: [
          'for (int i = 1; i <= a.length; i++)',
          'for (int i = 1; i < a.length; i++)',
          'for (int i = 0; i <= a.length; i++)',
          'for (int i = 0; i < a.length; i++)',
        ],
        answer: 3,
        why: 'Zero through length minus one, which is exactly the valid range.',
      },
      {
        id: 'q2',
        stem: 'A loop uses a hardcoded 4 and someone adds a fifth element. What happens?',
        options: [
          'An exception',
          'The loop runs five times',
          'The fifth element is silently never processed',
          'The array shrinks',
        ],
        answer: 2,
        why: 'Too small a bound is silent; too large throws.',
      },
      {
        id: 'q3',
        stem: 'Inside the traversal, `a[i]` is:',
        options: ['The element at this pass', 'The index', 'The whole array', 'The length'],
        answer: 0,
        why: 'The index picks the slot; a[i] is what is in it.',
      },
      {
        id: 'q4',
        stem: 'Can you change the values in an array while traversing it?',
        options: [
          'No, it throws ConcurrentModificationException',
          'Only for int arrays',
          'Only in the world',
          'Yes, and it is a common thing to do',
        ],
        answer: 3,
        why: 'Arrays cannot change size, so that problem does not arise.',
      },
    ],

    stuck: ['E-10', 'G-18'],

    recap: [
      '`for (int i = 0; i < a.length; i++)` is the shape. Learn it as one thing.',
      '`<` not `<=`, because the last index is length minus one.',
      'Use `a.length`, never a typed number that can go stale.',
      '`a[i] = something` fills; `something = a[i]` reads.',
    ],
  },

  // ── 5.4 ────────────────────────────────────────────────────────────────────
  {
    lesson: '5.4',
    slug: 'enhanced-for-over-an-array',
    title: 'Enhanced for over an Array',
    minutes: 20,
    seo: {
      h1: 'The Enhanced for Loop over a Java Array',
      title: 'Java for each Loop over an Array | Intro to Java',
      description:
        'How the enhanced for loop works on a Java array, when to use it, and the two jobs that '
        + 'still need an index loop.',
      primary: 'java for each loop array',
      related: ['java enhanced for array example', 'java for each cannot change array',
        'when to use enhanced for java', 'java array loop without index'],
      faq: [
        {
          q: 'How do I loop over a Java array without an index?',
          a: 'Use for (int v : a) and the variable v takes each value in turn.',
        },
        {
          q: 'Can an enhanced for loop change the array?',
          a: 'No. The loop variable is a copy, so assigning to it changes nothing in the array. Use '
            + 'an index loop when you need to write.',
        },
        {
          q: 'When should I use an index loop instead?',
          a: 'When you need to know the position, or when you need to change what is stored.',
        },
      ],
    },

    hook:
      'You met this loop over lists in 4.6. It works on arrays too, with one extra limitation that '
      + 'catches people because it fails silently rather than loudly.',

    objectives: [
      'Write an enhanced for over an array',
      'Explain why assigning to the loop variable changes nothing',
      'Choose between the two loop forms',
    ],

    vocab: [
      { term: 'Copy', plain: 'The loop variable holds a copy of the value, not the slot itself.',
        formal: 'The loop variable is assigned the element value on each iteration.' },
    ],

    steps: [
      {
        shot: SHOT('5.4', 1, 'An enhanced for loop over an int array with each value read in turn.'),
        code:
          'int[] lanes = {3, 7, 2, 9};\n'
          + 'for (int lane : lanes)\n'
          + '{\n'
          + '    addObject(new Coin(), lane, 0);\n'
          + '}',
        note:
          'Same form as 4.6. Read the colon as "in": for each int lane in lanes.\n\n'
          + 'No index, no length, no condition. Nothing to get off by one.\n\n'
          + 'When you only need the VALUES, this is the better loop.',
      },
      {
        shot: SHOT('5.4', 2, 'An attempt to assign to the loop variable, with the array unchanged '
          + 'afterward.'),
        code:
          '// Does NOT change the array.\n'
          + 'for (int lane : lanes)\n'
          + '{\n'
          + '    lane = lane * 2;\n'
          + '}\n'
          + '// lanes is still {3, 7, 2, 9}',
        note:
          'This is the limitation, and it is worth meeting deliberately because it fails in '
          + 'silence.\n\n'
          + '`lane` is a COPY of the value, not the slot. Doubling the copy changes the copy. The '
          + 'array is untouched, there is no error, and nothing tells you.\n\n'
          + 'To write into the array you need the index:\n'
          + '`for (int i = 0; i < lanes.length; i++) { lanes[i] = lanes[i] * 2; }`',
      },
      {
        shot: SHOT('5.4', 3, 'A decision table for choosing between the two loop forms.'),
        note:
          'The choice, in one line each:\n\n'
          + 'Reading values only: enhanced for. Shorter and safer.\n'
          + 'Need the position: index loop.\n'
          + 'Need to WRITE into the array: index loop.\n\n'
          + 'Unit 6 uses index loops almost exclusively, because a tile map is entirely about '
          + 'position.',
      },
    ],

    misconceptions: [
      {
        wrong: 'Assigning to the loop variable updates the array.',
        right: 'It updates a copy. The array is unchanged and nothing warns you.',
        why: 'A silent no-op is far worse than an error, and this one looks completely reasonable.',
      },
      {
        wrong: 'The enhanced for can give you the index if you ask.',
        right: 'It cannot. Use an index loop.',
        why: 'Adding a manual counter works but discards the reason for using it.',
      },
      {
        wrong: 'The enhanced for is always better because it is shorter.',
        right: 'It is better only when you need values alone.',
        why: 'Half of Unit 6 needs positions, so this would be the wrong habit to form.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'What does `for (int v : a)` give you each pass?',
        options: ['The index', 'The whole array', 'A copy of the value', 'The length'],
        answer: 2,
        why: 'The value, copied into the loop variable.',
      },
      {
        id: 'cfu-2',
        stem: '`for (int v : a) { v = 0; }` What happens to a?',
        options: ['Nothing changes', 'Every element becomes 0', 'It throws', 'Only the first becomes 0'],
        answer: 0,
        why: 'You assigned to a copy, so the array is untouched.',
      },
      {
        id: 'cfu-3',
        stem: 'You need to double every value IN the array. Which loop?',
        options: ['Enhanced for', 'Either works', 'A while loop with no counter', 'An index loop'],
        answer: 3,
        why: 'Writing into the array requires the index.',
      },
      {
        id: 'cfu-4',
        stem: 'You just want to add up every value. Which loop is cleaner?',
        options: ['Enhanced for', 'An index loop', 'They are identical', 'Neither works'],
        answer: 0,
        why: 'Reading values only is exactly its job.',
      },
    ],

    gap: {
      intro:
        'Add up every value in an array called scores, using the shorter loop form.',
      code:
        'int total = ___1___;\n'
        + 'for (int s ___2___ scores)\n'
        + '{\n'
        + '    total = total + ___3___;\n'
        + '}',
      holes: [
        { n: 1, hint: 'Nothing has been added yet.', accept: ['0'] },
        { n: 2, hint: 'One character meaning "in".', accept: [':'] },
        { n: 3, hint: 'The name given to each value as it comes out.', accept: ['s'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'The enhanced for over an array gives you:',
        options: ['Indexes', 'Both', 'Values', 'Neither'],
        answer: 2,
        why: 'Values only, which is its whole point.',
      },
      {
        id: 'q2',
        stem: 'Why can an enhanced for not change the array?',
        options: [
          'The loop variable is a copy of the value, not the slot',
          'Java forbids writing in loops',
          'Arrays are read only',
          'It can change the array',
        ],
        answer: 0,
        why: 'You are modifying a copy.',
      },
      {
        id: 'q3',
        stem: 'Which job needs an index loop?',
        options: [
          'Printing every value',
          'Finding the largest value',
          'Adding up the values',
          'Setting every element to zero',
        ],
        answer: 3,
        why: 'Writing into the array requires addressing the slot.',
      },
      {
        id: 'q4',
        stem: 'The main advantage of the enhanced for is:',
        options: ['Speed', 'It can resize the array', 'No index means no off-by-one', 'It works only on ints'],
        answer: 2,
        why: 'Same reason as with lists in 4.6.',
      },
    ],

    stuck: ['G-19'],

    recap: [
      '`for (int v : a)` visits every value, with no index.',
      'The loop variable is a COPY. Assigning to it changes nothing, silently.',
      'Use an index loop to write into the array or to use positions.',
      'Unit 6 is mostly index loops, because tile maps are about position.',
    ],
  },

  // ── 5.5 ────────────────────────────────────────────────────────────────────
  {
    lesson: '5.5',
    slug: 'array-algorithms',
    title: 'Array Algorithms',
    minutes: 35,
    seo: {
      h1: 'The Five Array Algorithms in Java',
      title: 'Java Array Algorithms: Sum, Max, Search, Count | Intro to Java',
      description:
        'The five array algorithms worth memorising: total, maximum, minimum, linear search and '
        + 'count matching, with the traps in each.',
      primary: 'java array algorithms sum max search',
      related: ['java find largest in array', 'java linear search array',
        'java count matching array', 'java array max wrong answer'],
      faq: [
        {
          q: 'How do I find the largest value in a Java array?',
          a: 'Start with the first element as the best so far, then compare every other element '
            + 'against it and replace when you find something bigger.',
        },
        {
          q: 'Why should I not start the maximum at zero?',
          a: 'If every value is negative, zero is larger than all of them and the answer comes back '
            + 'as zero, which is not in the array at all.',
        },
        {
          q: 'What is a linear search?',
          a: 'Walking the array from the start looking for a value, and stopping as soon as you '
            + 'find it.',
        },
      ],
    },

    hook:
      'Five algorithms cover almost everything you will ever do to an array, here and in whatever '
      + 'you write next. Each is a traversal with a different accumulator, and each has one trap.',

    objectives: [
      'Write the sum, maximum, minimum, search and count algorithms',
      'Explain why the maximum must start at the first element',
      'Return early from a search',
    ],

    vocab: [
      { term: 'Linear search', plain: 'Look at each one until you find it.',
        formal: 'Sequential scan of an array for a target value.' },
      { term: 'Best so far', plain: 'The answer as it stands, updated as you go.',
        formal: 'An accumulator holding the running extreme.' },
    ],

    steps: [
      {
        shot: SHOT('5.5', 1, 'A summing loop with the total accumulating across passes.'),
        code:
          'int total = 0;\n'
          + 'for (int i = 0; i < a.length; i++)\n'
          + '{\n'
          + '    total = total + a[i];\n'
          + '}',
        note:
          'SUM. The accumulator pattern from 4.3, applied to an array.\n\n'
          + 'Start at 0, add each element, and the total is declared BEFORE the loop for the reason '
          + 'you now know well.',
      },
      {
        shot: SHOT('5.5', 2, 'A maximum loop, with the starting value taken from the first element '
          + 'rather than zero.'),
        code:
          'int max = a[0];              // start from the FIRST ELEMENT\n'
          + 'for (int i = 1; i < a.length; i++)\n'
          + '{\n'
          + '    if (a[i] > max) { max = a[i]; }\n'
          + '}',
        note:
          'MAXIMUM, and here is the trap.\n\n'
          + 'Start at `a[0]`, not at 0. If you start at 0 and every value is negative, nothing ever '
          + 'beats zero and the answer comes back as 0, a number that is not even in the array.\n\n'
          + 'And because a[0] is already the best so far, the loop starts at `i = 1`. Starting at 0 '
          + 'is harmless, just a wasted comparison.\n\n'
          + 'MINIMUM is identical with `<` instead of `>`.',
      },
      {
        shot: SHOT('5.5', 3, 'A linear search returning as soon as the target is found.'),
        code:
          'public boolean contains(int[] a, int target)\n'
          + '{\n'
          + '    for (int i = 0; i < a.length; i++)\n'
          + '    {\n'
          + '        if (a[i] == target) { return true; }\n'
          + '    }\n'
          + '    return false;      // only if the loop finished without finding it\n'
          + '}',
        note:
          'LINEAR SEARCH, and it uses the return behavior from 3.4: return stops the method '
          + 'immediately, so finding the target early skips the rest of the array.\n\n'
          + 'The `return false` at the bottom is essential. It runs only when the loop finished '
          + 'without finding anything, and Java will not compile the method without it, because '
          + 'every path must return.',
      },
      {
        shot: SHOT('5.5', 4, 'A counting loop with an if inside, tallying matches.'),
        code:
          'int count = 0;\n'
          + 'for (int i = 0; i < a.length; i++)\n'
          + '{\n'
          + '    if (a[i] > 10) { count = count + 1; }\n'
          + '}',
        note:
          'COUNT MATCHING. The counting pattern from 4.3.\n\n'
          + 'Note it does NOT return early. A search wants the first match; a count needs every '
          + 'element, so it must run the whole way through.\n\n'
          + 'That difference, early return versus full traversal, is the thing to understand rather '
          + 'than memorise.',
      },
    ],

    misconceptions: [
      {
        wrong: 'Start the maximum at 0.',
        right: 'Start at a[0], or an all-negative array returns 0.',
        why: 'The classic wrong answer, and it only shows up with data you might not test.',
      },
      {
        wrong: 'A search should keep looking after it finds the target.',
        right: 'Return immediately. Carrying on is wasted work.',
        why: 'It also demonstrates why early return is useful rather than a trick.',
      },
      {
        wrong: 'A count can return early like a search.',
        right: 'It must see every element.',
        why: 'Returning early from a count gives a count of one.',
      },
      {
        wrong: 'These are five things to memorise.',
        right: 'They are one traversal with different accumulators.',
        why: 'Seeing the shared shape means you can build the sixth one you have never been taught.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'Why start a maximum search at `a[0]` rather than 0?',
        options: [
          'Because if every value is negative, 0 would win and is not in the array',
          'It is faster',
          'Java requires it',
          'It makes no difference',
        ],
        answer: 0,
        why: 'The starting value has to be a real member of the array.',
      },
      {
        id: 'cfu-2',
        stem: 'In a linear search, when do you return true?',
        options: [
          'After the loop finishes',
          'Never',
          'Only if it is the last element',
          'As soon as the target is found',
        ],
        answer: 3,
        why: 'Return stops the method, which is exactly what you want.',
      },
      {
        id: 'cfu-3',
        stem: 'Why is `return false;` needed after the search loop?',
        options: [
          'For readability',
          'It is not needed',
          'Because every path must return, and the loop can finish without finding anything',
          'To reset the array',
        ],
        answer: 2,
        why: 'Otherwise Java reports missing return statement.',
      },
      {
        id: 'cfu-4',
        stem: 'Can a counting loop return early?',
        options: [
          'Yes, once it finds one',
          'No, it must see every element',
          'Only for negative numbers',
          'Only if the array is sorted',
        ],
        answer: 1,
        why: 'Stopping early would return a count of one.',
      },
      {
        id: 'cfu-5',
        stem: 'How does minimum differ from maximum?',
        options: [
          'It starts at a[length-1]',
          'The comparison is < instead of >',
          'It uses a while loop',
          'It cannot be done',
        ],
        answer: 1,
        why: 'The traversal and the accumulator are identical; only the comparison flips.',
      },
    ],

    gap: {
      intro:
        'Find the largest value in an array called scores. Start from a value that is definitely in '
        + 'the array.',
      code:
        'int max = scores[___1___];\n'
        + 'for (int i = 1; i < scores.length; i++)\n'
        + '{\n'
        + '    if (scores[i] ___2___ max)\n'
        + '    {\n'
        + '        max = ___3___;\n'
        + '    }\n'
        + '}',
      holes: [
        { n: 1, hint: 'The first element, so the starting answer is really in the array.',
          accept: ['0'] },
        { n: 2, hint: 'Replace the best so far when this one is bigger.', accept: ['>'] },
        { n: 3, hint: 'The element at this pass.', accept: ['scores[i]'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'An array is {-5, -2, -9}. A maximum loop starting at 0 returns:',
        options: ['-2', '0, which is wrong because it is not in the array', '-9', '-5'],
        answer: 1,
        why: 'Nothing beats 0, so the wrong answer comes back with no error.',
      },
      {
        id: 'q2',
        stem: 'What do all five algorithms have in common?',
        options: [
          'They all return early',
          'They are one traversal with a different accumulator',
          'They all need a sorted array',
          'They all use while loops',
        ],
        answer: 1,
        why: 'Same shape, different bookkeeping.',
      },
      {
        id: 'q3',
        stem: 'A search method has no return after the loop. Java says:',
        options: [
          'cannot find symbol',
          'missing return statement',
          'ArrayIndexOutOfBounds',
          'Nothing, it compiles',
        ],
        answer: 1,
        why: 'A path exists that reaches the end without returning.',
      },
      {
        id: 'q4',
        stem: 'To count values above 10 you need:',
        options: [
          'An early return',
          'A counter before the loop and an if inside',
          'A sorted array',
          'Two loops',
        ],
        answer: 1,
        why: 'The counting pattern, applied to every element.',
      },
    ],

    stuck: ['E-05', 'E-10', 'G-12'],

    recap: [
      'Sum: accumulate from 0.',
      'Max and min: start from a[0], and compare with > or <.',
      'Search: return the moment you find it, and return false after the loop.',
      'Count: an if inside, and NO early return.',
      'All five are one traversal with different bookkeeping.',
    ],
  },

  // ── 5.6 ────────────────────────────────────────────────────────────────────
  {
    lesson: '5.6',
    slug: 'arrays-that-drive-a-game',
    title: 'Arrays that Drive a Game',
    minutes: 30,
    seo: {
      h1: 'Using an Array to Drive a Greenfoot Game',
      title: 'Greenfoot Level Data in an Array | Intro to Java',
      description:
        'How to store a level layout, lane positions and a difficulty schedule in Java arrays so '
        + 'changing the game means changing data, not code.',
      primary: 'greenfoot level data array',
      related: ['greenfoot lane positions array', 'java data driven game beginner',
        'greenfoot spawn pattern array', 'java array level design'],
      faq: [
        {
          q: 'How do I store a level layout in Greenfoot?',
          a: 'Put the layout in an array and loop over it to place actors. Changing the level then '
            + 'means changing the numbers, not the code.',
        },
        {
          q: 'How do I make a game get harder over time?',
          a: 'Put the difficulty for each level in an array and read the one at the current level '
            + 'index.',
        },
        {
          q: 'Why is it better to put level data in an array?',
          a: 'The code that builds the level stays the same however many levels you add, so a new '
            + 'level is data rather than programming.',
        },
      ],
    },

    hook:
      'This is where arrays stop being an exercise. Put your level in data and you can design ten '
      + 'levels without writing another line of code, which is exactly how real games work and '
      + 'exactly what Unit 6 does in two dimensions.',

    objectives: [
      'Drive actor placement from an array',
      'Read a per-level value from a schedule array',
      'Explain why data-driven beats hardcoded',
    ],

    vocab: [
      { term: 'Data driven', plain: 'The numbers decide what happens, not the code.',
        formal: 'Behavior determined by data rather than control flow.' },
    ],

    steps: [
      {
        shot: SHOT('5.6', 1, 'A row of walls built from an array of heights.'),
        code:
          'int[] heights = {2, 5, 1, 4, 3};\n'
          + '\n'
          + 'for (int i = 0; i < heights.length; i++)\n'
          + '{\n'
          + '    addObject(new Wall(), i, heights[i]);\n'
          + '}',
        note:
          'A skyline, from data.\n\n'
          + 'The INDEX becomes the x position and the VALUE becomes the y position. Two different '
          + 'jobs from one array, and it is worth pausing on because it is the exact idea Unit 6 '
          + 'extends.\n\n'
          + 'Change a number and the level changes. The loop never changes.',
      },
      {
        shot: SHOT('5.6', 2, 'Actors placed into fixed lanes read from an array.'),
        code:
          'int[] laneY = {2, 6, 10};\n'
          + '\n'
          + 'int lane = Greenfoot.getRandomNumber(laneY.length);\n'
          + 'addObject(new Car(), 0, laneY[lane]);',
        note:
          'Lane positions in an array, and a random lane chosen by index.\n\n'
          + '`getRandomNumber(laneY.length)` is exactly right, and this is the payoff for 2.6: the '
          + 'exclusive upper bound produces 0 to length-1, which is precisely the valid index '
          + 'range. The two rules fit together with nothing to adjust.\n\n'
          + 'Add a fourth lane and this code needs no change at all.',
      },
      {
        shot: SHOT('5.6', 3, 'A difficulty schedule array indexed by the current level.'),
        code:
          'private int[] enemiesPerLevel = {3, 5, 8, 12, 20};\n'
          + 'private int level = 0;\n'
          + '\n'
          + 'public void startLevel()\n'
          + '{\n'
          + '    int howMany = enemiesPerLevel[level];\n'
          + '    for (int i = 0; i < howMany; i++)\n'
          + '    {\n'
          + '        addObject(new Enemy(2), i * 2, 0);\n'
          + '    }\n'
          + '}',
        note:
          'A difficulty curve as data. Level 0 gets 3 enemies, level 4 gets 20, and tuning the game '
          + 'means editing five numbers.\n\n'
          + 'One caution: when `level` reaches 5 this throws, because the last valid index is 4. '
          + 'Either stop the game at the last level or clamp the index. That is a real design '
          + 'decision, not an oversight, and boundaries like it are where most real bugs live.',
      },
    ],

    misconceptions: [
      {
        wrong: 'Data-driven design is an advanced technique.',
        right: 'It is an array and a loop. You already have both.',
        why: 'Students hand-place fifty actors because this looks harder than it is.',
      },
      {
        wrong: 'The index and the value are the same kind of thing.',
        right: 'The index is usually WHERE, the value is usually WHAT.',
        why: 'Separating these is the whole idea, and Unit 6 depends on it completely.',
      },
      {
        wrong: 'A level array can be indexed by the level number safely forever.',
        right: 'Going past the last level throws. Decide what happens at the end.',
        why: 'A game that crashes on victory is a bad look, and it is a real boundary case.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'In `addObject(new Wall(), i, heights[i])`, what does the index i provide?',
        options: ['The height', 'The x position', 'The number of walls', 'The color'],
        answer: 1,
        why: 'The index is the position across; the value is the height.',
      },
      {
        id: 'cfu-2',
        stem: 'Why is `getRandomNumber(laneY.length)` exactly right for choosing a lane?',
        options: [
          'It is not, it needs a plus one',
          'Because it produces 0 to length-1, which is the valid index range',
          'Because it always returns 0',
          'Because lanes start at 1',
        ],
        answer: 1,
        why: 'The exclusive upper bound matches the index range with nothing to adjust.',
      },
      {
        id: 'cfu-3',
        stem: 'You want to add a sixth level with 30 enemies. What do you change?',
        options: [
          'The loop',
          'Add 30 to the enemiesPerLevel array',
          'Write a new method',
          'The world size',
        ],
        answer: 1,
        why: 'The code stays the same; the data grows.',
      },
      {
        id: 'cfu-4',
        stem: 'enemiesPerLevel has 5 entries and level reaches 5. What happens?',
        options: [
          'The last level repeats',
          'ArrayIndexOutOfBoundsException',
          'The game restarts',
          'Nothing',
        ],
        answer: 1,
        why: 'The last valid index is 4, so 5 is past the end.',
      },
    ],

    gap: {
      intro:
        'Build a skyline where the array index is the column and the value is the height of the '
        + 'wall in that column.',
      code:
        'int[] heights = {2, 5, 1, 4};\n'
        + 'for (int i = 0; i < heights.___1___; i++)\n'
        + '{\n'
        + '    addObject(new Wall(), ___2___, heights[___3___]);\n'
        + '}',
      holes: [
        { n: 1, hint: 'How many columns there are. No parentheses on an array.', accept: ['length'] },
        { n: 2, hint: 'The column position is the loop counter itself.', accept: ['i'] },
        { n: 3, hint: 'Look up the height for this column.', accept: ['i'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'Putting level data in an array means:',
        options: [
          'The code runs faster',
          'Changing the level means changing numbers, not code',
          'You need fewer actors',
          'The world can be smaller',
        ],
        answer: 1,
        why: 'The loop is written once and works for any data.',
      },
      {
        id: 'q2',
        stem: 'In a skyline built from `{2, 5, 1}`, where does the wall of height 5 go?',
        options: ['Column 0', 'Column 1', 'Column 5', 'Column 2'],
        answer: 1,
        why: 'The value 5 sits at index 1, and the index is the column.',
      },
      {
        id: 'q3',
        stem: 'A difficulty array is indexed by level. What must you decide?',
        options: [
          'What happens when the level goes past the last entry',
          'How fast the array is',
          'Whether to use a List',
          'Nothing',
        ],
        answer: 0,
        why: 'Otherwise the game throws when the player wins.',
      },
      {
        id: 'q4',
        stem: 'The index of an array usually represents:',
        options: ['What', 'Where', 'How many', 'Why'],
        answer: 1,
        why: 'Index is position, value is content. Unit 6 is built on that split.',
      },
    ],

    stuck: ['E-10', 'G-18', 'R-09'],

    recap: [
      'The INDEX is usually where; the VALUE is usually what.',
      'A loop over level data means new levels are numbers, not code.',
      'getRandomNumber(a.length) picks a valid index exactly, with no adjustment.',
      'Decide what happens when a level index runs past the end.',
    ],
  },
];

module.exports = { course: COURSE, unit: UNIT, label: LABEL, lessons: LESSONS };
