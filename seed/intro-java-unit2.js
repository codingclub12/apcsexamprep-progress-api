'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  INTRO TO JAVA, UNIT 2: VARIABLES, DECISIONS, AND INPUT.
//
//  Same shape as Unit 1 (see that file's header for the rules the format
//  enforces and why). What changes here is what the student is asked to do:
//  Unit 1 never asked for a decision, and this unit is entirely about the
//  program choosing between two futures.
//
//  ── THE TWO IDEAS THIS UNIT HAS TO GET RIGHT ────────────────────────────────
//  1. `=` and `==` are different, and the difference is invisible until it is
//     catastrophic. Every lesson from 2.3 onwards repeats it.
//  2. Integer division truncates. 7 / 2 is 3, and a student who does not know
//     that will chase a "wrong math" bug that is not a bug.
//
//  Unit 2 is also where the course stops being safe. In Unit 1 every wrong
//  answer was a compiler error. From `if` onwards a program can be perfectly
//  legal and still wrong, which is a different kind of stuck and needs the
//  gotcha pages more than the error pages.
//
//  Zero PII: author content only. No em-dashes, per repo convention. ASCII only.
// ─────────────────────────────────────────────────────────────────────────────

const COURSE = 'intro-java';
const UNIT = 'unit-2';
const LABEL = 'Unit 2: Variables, Decisions, and Input';

const SHOT = (lesson, n, alt) => ({ src: `intro-java/${lesson}/step-${n}.png`, alt });

const LESSONS = [
  // ── 2.1 ────────────────────────────────────────────────────────────────────
  {
    lesson: '2.1',
    slug: 'variables-and-types',
    title: 'Variables and Types',
    minutes: 30,
    seo: {
      h1: 'Java Variables and Types for Beginners',
      title: 'Java Variables and Types: int, double, boolean, String',
      description:
        'What a Java variable is, the four types you need first, and the difference between '
        + 'declaring one and assigning to it. Beginner lesson with practice.',
      primary: 'java variables for beginners',
      related: ['java int vs double', 'what is a string in java',
        'java declare variable', 'greenfoot variables'],
      faq: [
        {
          q: 'What is a variable in Java?',
          a: 'A named box that holds one value. You give it a type, which decides what kind of '
            + 'value it can hold, and a name you use to read or change it later.',
        },
        {
          q: 'What is the difference between int and double in Java?',
          a: 'An int holds whole numbers only. A double holds numbers with a decimal point. Use '
            + 'int for counting things like score or lives, and double when fractions matter.',
        },
        {
          q: 'Do I have to say the type every time I use a variable in Java?',
          a: 'No. You give the type once, when you declare it. After that you use the name on '
            + 'its own.',
        },
      ],
    },

    hook:
      'A game has to remember things. How many lives are left, whether the player has the key, '
      + 'what the score is. A variable is how a program remembers, and unlike your memory it never '
      + 'gets it slightly wrong.',

    objectives: [
      'Declare a variable with the right type for what it holds',
      'Tell the difference between declaring a variable and assigning to it',
      'Choose between int, double, boolean and String for a given job',
    ],

    vocab: [
      { term: 'Variable', plain: 'A named box that holds one value.',
        formal: 'A named storage location with a declared type.' },
      { term: 'Type', plain: 'What kind of thing the box is allowed to hold.',
        formal: 'The set of values a variable may take and the operations allowed on it.' },
      { term: 'Declare', plain: 'Make the box, and say what goes in it.',
        formal: 'Introduce a variable with a type and a name: `int score;`' },
      { term: 'Assign', plain: 'Put a value in the box.',
        formal: 'Store a value in an existing variable with `=`.' },
    ],

    steps: [
      {
        shot: SHOT('2.1', 1, 'A Greenfoot actor class with a single int variable declared and '
          + 'assigned inside a method.'),
        code: 'int score = 0;',
        note:
          'Three things in one line, and it is worth separating them.\n\n'
          + '`int` is the TYPE: this box holds whole numbers.\n'
          + '`score` is the NAME you will use from now on.\n'
          + '`= 0` puts a starting value in.\n\n'
          + 'You could split it: `int score;` then `score = 0;`. Same result. Beginners are often '
          + 'shown only the combined form and then cannot read the split one.',
      },
      {
        shot: SHOT('2.1', 2, 'Four variable declarations of different types shown together in an '
          + 'editor.'),
        code:
          'int    lives    = 3;\n'
          + 'double speed    = 2.5;\n'
          + 'boolean hasKey  = false;\n'
          + 'String  name    = "Crab";',
        note:
          'The four types you need for the whole of this course.\n\n'
          + '`int` counts things. Lives, score, coins.\n'
          + '`double` measures things where fractions matter. Speed, distance.\n'
          + '`boolean` is a yes or no. It can only ever be true or false.\n'
          + '`String` is text. The double quotes are part of the value, not part of the word.',
      },
      {
        shot: SHOT('2.1', 3, 'The same variable being assigned a new value on a later line.'),
        code:
          'int score = 0;\n'
          + 'score = 10;\n'
          + 'score = 25;',
        note:
          'The type is written ONCE, when the box is made. After that you just use the name.\n\n'
          + 'Writing `int score = 10;` on the second line is an error: you are trying to make a '
          + 'second box with a name that is already taken.\n\n'
          + 'Each assignment replaces what was there. After these three lines score is 25, and the '
          + '0 and the 10 are gone.',
      },
      {
        shot: SHOT('2.1', 4, 'An actor using a variable to move by a stored speed value.'),
        code:
          'int stepSize = 4;\n'
          + 'move(stepSize);',
        note:
          'And this is why it matters. `move(stepSize)` reads the box and uses whatever is in it. '
          + 'Change the 4 in one place and every move in the class changes with it.\n\n'
          + 'That is the real argument for variables, and it is not about memory. It is that a '
          + 'number written in one place can be changed in one place.',
      },
    ],

    misconceptions: [
      {
        wrong: 'You have to write the type every time you use a variable.',
        right: 'The type is written once, at the declaration. After that, just the name.',
        why: 'Re-declaring produces "variable is already defined", which reads as nonsense if you '
          + 'think the type is part of the name.',
      },
      {
        wrong: 'A String and a number are interchangeable if they look the same.',
        right: '"5" is text and 5 is a number. They behave completely differently.',
        why: 'This is where `"5" + 1` giving `51` instead of `6` comes from.',
      },
      {
        wrong: 'boolean can hold yes, no, 1 or 0.',
        right: 'A boolean is exactly true or false. Nothing else.',
        why: 'Java will refuse `boolean done = 1;`, and the error is confusing if you expect 1 to '
          + 'mean true the way it does in some other languages.',
      },
      {
        wrong: 'Assigning a new value adds to the old one.',
        right: 'Assigning REPLACES. `score = 10;` throws away whatever was there.',
        why: 'Adding is `score = score + 10;`, which looks like nonsense as math and is the next '
          + 'lesson.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'Which type should hold the number of lives a player has left?',
        options: ['String', 'boolean', 'double', 'int'],
        answer: 3,
        why: 'Lives are counted in whole numbers, which is exactly what int is for.',
      },
      {
        id: 'cfu-2',
        stem: 'Which type should hold whether the player has picked up the key?',
        options: ['boolean', 'int', 'String', 'double'],
        answer: 0,
        why: 'It is a yes or no, and boolean is the type whose only values are true and false.',
      },
      {
        id: 'cfu-3',
        stem: 'What is wrong with this pair of lines?\n\nint score = 0;\nint score = 10;',
        options: [
          'The second line tries to declare a variable that already exists',
          'Nothing, it is fine',
          'score is a reserved word',
          '0 is not a valid starting value',
        ],
        answer: 0,
        why: 'The type is written once. The second line should be `score = 10;`.',
      },
      {
        id: 'cfu-4',
        stem: 'After these lines, what is in lives?\n\nint lives = 3;\nlives = 5;\nlives = 1;',
        options: ['3', '9', '5', '1'],
        answer: 3,
        why: 'Each assignment replaces the last, so the final value is the one that survives.',
      },
      {
        id: 'cfu-5',
        stem: 'Which declaration is written correctly?',
        options: [
          'double speed = 2.5',
          'speed double = 2.5;',
          'double speed = 2.5;',
          'double = speed 2.5;',
        ],
        answer: 2,
        why: 'Type, then name, then the value, then a semicolon.',
      },
    ],

    gap: {
      intro:
        'An actor needs to remember three things: how many coins it has collected (a whole number '
        + 'starting at zero), how fast it moves (2.5), and whether the game is over (not yet). '
        + 'Fill in the types and the starting values.',
      code:
        '___1___ coins = ___2___;\n'
        + 'double speed = 2.5;\n'
        + '___3___ gameOver = ___4___;',
      holes: [
        { n: 1, hint: 'Coins are counted. Which type counts?', accept: ['int'] },
        { n: 2, hint: 'It has not collected any yet.', accept: ['0'] },
        { n: 3, hint: 'This one is a yes or no.', accept: ['boolean'] },
        { n: 4, hint: 'The game has not ended yet. Which of the two values is that?',
          accept: ['false'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'Which of these can a boolean hold?',
        options: ['Any whole number', 'Any text', 'Only true or false', '0 or 1 only'],
        answer: 2,
        why: 'Exactly two values, and they are not numbers.',
      },
      {
        id: 'q2',
        stem: 'You need to store a player name. Which type?',
        options: ['int', 'char', 'String', 'boolean'],
        answer: 2,
        why: 'Text is a String.',
      },
      {
        id: 'q3',
        stem: 'What does the `=` do in `int score = 0;`?',
        options: [
          'Tests whether score is equal to 0',
          'Nothing, it is decoration',
          'Declares that score can never change',
          'Puts 0 into score',
        ],
        answer: 3,
        why: 'A single = assigns. Testing for equality is ==, which is lesson 2.3.',
      },
      {
        id: 'q4',
        stem: 'Which line correctly changes an EXISTING variable called lives to 2?',
        options: ['lives = 2;', 'int lives = 2;', 'lives == 2;', 'set lives 2;'],
        answer: 0,
        why: 'The type appears only at the declaration; afterward you use the name alone.',
      },
    ],

    stuck: ['E-01', 'E-03', 'E-08'],

    recap: [
      'A variable is a named box with a type.',
      'Declare once with the type; assign as often as you like with just the name.',
      'int counts, double measures, boolean is true or false, String is text.',
      'Assigning REPLACES the old value.',
    ],
  },

  // ── 2.2 ────────────────────────────────────────────────────────────────────
  {
    lesson: '2.2',
    slug: 'expressions-and-operators',
    title: 'Expressions and Operators',
    minutes: 30,
    seo: {
      h1: 'Java Expressions, Operators, and Integer Division',
      title: 'Java Operators and Integer Division Explained | Intro to Java',
      description:
        'Java arithmetic for beginners, why 7 divided by 2 is 3, and how score = score + 1 works. '
        + 'Includes practice and a quiz.',
      primary: 'java integer division 7/2',
      related: ['java modulus operator', 'score = score + 1 java',
        'java compound assignment', 'why is my java division wrong'],
      faq: [
        {
          q: 'Why does 7 / 2 give 3 in Java?',
          a: 'Both numbers are whole numbers, so Java does whole-number division and throws away '
            + 'the remainder. Use 7.0 / 2 if you want 3.5.',
        },
        {
          q: 'What does score = score + 1 mean?',
          a: 'Work out the right side first, using the current score, then store the result back '
            + 'into score. It is an instruction, not a claim that they are equal.',
        },
        {
          q: 'What is the percent sign for in Java?',
          a: 'It is the remainder operator. 7 % 2 is 1, the amount left over after dividing. It is '
            + 'the usual way to test whether a number is even.',
        },
      ],
    },

    hook:
      'Adding one to a score sounds like the easiest thing in this course. It contains the single '
      + 'most confusing line a beginner meets, and a division rule that will silently give you the '
      + 'wrong answer for as long as you do not know it.',

    objectives: [
      'Predict the result of integer division and the remainder operator',
      'Read and write `score = score + 1` and explain why it is not a contradiction',
      'Use the compound assignment shorthand',
    ],

    vocab: [
      { term: 'Expression', plain: 'Anything that works out to a value.',
        formal: 'A combination of values, variables and operators that evaluates to a single value.' },
      { term: 'Operator', plain: 'A symbol that does something to values.',
        formal: 'Plus, minus, times, divide, and remainder: + - * / %' },
      { term: 'Integer division', plain: 'Whole-number division. The remainder is thrown away.',
        formal: 'Division where both operands are integers; the fractional part is truncated.' },
    ],

    steps: [
      {
        shot: SHOT('2.2', 1, 'An editor showing arithmetic expressions with their results in '
          + 'comments.'),
        code:
          'int a = 7 + 2;   // 9\n'
          + 'int b = 7 - 2;   // 5\n'
          + 'int c = 7 * 2;   // 14',
        note:
          'Nothing surprising yet. `*` is multiply, because there is no times sign on a keyboard. '
          + 'The right side is worked out first, and the answer goes in the box.',
      },
      {
        shot: SHOT('2.2', 2, 'The result of integer division shown as 3, with the remainder '
          + 'highlighted as discarded.'),
        code:
          'int d = 7 / 2;      // 3, NOT 3.5\n'
          + 'int e = 7 % 2;      // 1, the remainder\n'
          + 'double f = 7.0 / 2; // 3.5',
        note:
          'Here is the one that catches everyone.\n\n'
          + '`7 / 2` is 3. Not 3.5, not 4. When BOTH sides are whole numbers Java does whole-number '
          + 'division and throws the remainder away. It does not round; it truncates.\n\n'
          + '`%` gives you that discarded remainder. 7 % 2 is 1.\n\n'
          + 'To get 3.5, at least one side has to be a decimal: `7.0 / 2`.\n\n'
          + 'This is not a quirk you can avoid. It will produce wrong numbers in a working program '
          + 'with no error message at all.',
      },
      {
        shot: SHOT('2.2', 3, 'A score variable being incremented, with the old and new values '
          + 'annotated.'),
        code:
          'int score = 10;\n'
          + 'score = score + 1;   // score is now 11',
        note:
          'As math, `score = score + 1` is nonsense. As Java it is an instruction, and the order '
          + 'is what makes it work:\n\n'
          + '1. Work out the RIGHT side using the current value: 10 + 1 is 11.\n'
          + '2. Put that result into the box on the LEFT.\n\n'
          + 'Read `=` as "becomes", never as "equals", and the line stops being strange.',
      },
      {
        shot: SHOT('2.2', 4, 'Compound assignment operators shown alongside their longhand '
          + 'equivalents.'),
        code:
          'score += 1;   // same as score = score + 1\n'
          + 'score -= 5;   // same as score = score - 5\n'
          + 'score++;      // same as score = score + 1',
        note:
          'Shorthand for the same thing. You will see all three in real code, so you need to read '
          + 'them, and `score++` is the one you will meet most.\n\n'
          + 'They are conveniences, not new ideas. If a line confuses you, expand it back to the '
          + 'long form in your head.',
      },
    ],

    misconceptions: [
      {
        wrong: '7 / 2 is 3.5, or rounds to 4.',
        right: 'It is 3. Integer division truncates, and never rounds.',
        why: 'This is the highest-value fact in the lesson. It produces wrong answers with no '
          + 'error, which is the worst kind of bug for a beginner to face.',
      },
      {
        wrong: '`score = score + 1` is a contradiction and cannot be true.',
        right: '`=` means "becomes", not "equals". Right side first, then store.',
        why: 'Students who read = as equals get stuck permanently on the single most common line '
          + 'in game code.',
      },
      {
        wrong: 'Storing 3.5 in an int rounds it to 4.',
        right: 'Java refuses it outright, and if you force it you get 3.',
        why: 'Expecting rounding hides a whole class of off-by-one bugs.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'What is the value of `9 / 2` in Java, when both are ints?',
        options: ['4.5', '5', '4', '4.0'],
        answer: 2,
        why: 'Integer division truncates toward zero, so the .5 is discarded.',
      },
      {
        id: 'cfu-2',
        stem: 'What is `9 % 2`?',
        options: ['1', '4', '4.5', '0'],
        answer: 0,
        why: '% gives the remainder, and 9 divided by 2 leaves 1 over.',
      },
      {
        id: 'cfu-3',
        stem: 'int score = 4; score = score + 3; What is score?',
        options: ['4', '3', '43', '7'],
        answer: 3,
        why: 'The right side works out to 7 using the current value, and 7 is stored back.',
      },
      {
        id: 'cfu-4',
        stem: 'Which expression gives 4.5?',
        options: ['9 / 2', '9 % 2', '9.0 / 2', '9 / 2.0 % 1'],
        answer: 2,
        why: 'One side must be a decimal for Java to do decimal division.',
      },
      {
        id: 'cfu-5',
        stem: '`lives--;` does the same as which line?',
        options: ['lives = lives - 1;', 'lives = lives + 1;', 'lives = 0;', 'lives = -lives;'],
        answer: 0,
        why: 'The double minus is shorthand for subtracting one.',
      },
    ],

    gap: {
      intro:
        'A coin is collected. Add one to the score, then work out how many complete rows of 10 '
        + 'coins the player has, and how many are left over.',
      code:
        'score = score ___1___ 1;\n'
        + 'int fullRows  = score ___2___ 10;\n'
        + 'int leftOver  = score ___3___ 10;',
      holes: [
        { n: 1, hint: 'One more than it was.', accept: ['+'] },
        { n: 2, hint: 'How many complete tens fit in. Whole-number division does this for you.',
          accept: ['/'] },
        { n: 3, hint: 'What is left after taking out the complete tens.', accept: ['%'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'int x = 15 / 4; What is x?',
        options: ['3.75', '4', '3', '3.0'],
        answer: 2,
        why: 'Truncated, not rounded.',
      },
      {
        id: 'q2',
        stem: 'Which is the best way to test whether an int n is even?',
        options: ['n / 2 == 0', 'n * 2 == 0', 'n % 2 == 0', 'n - 2 == 0'],
        answer: 2,
        why: 'An even number leaves no remainder when divided by two.',
      },
      {
        id: 'q3',
        stem: 'int a = 3; a += 4; a++; What is a?',
        options: ['7', '4', '34', '8'],
        answer: 3,
        why: '3 plus 4 is 7, then one more is 8.',
      },
      {
        id: 'q4',
        stem: 'Why is `score = score + 1;` not a contradiction?',
        options: [
          'Because = means becomes: the right side is worked out first, then stored',
          'Because Java allows contradictions',
          'Because score is special',
          'It is a contradiction, and the line is wrong',
        ],
        answer: 0,
        why: 'Assignment is an instruction with an order, not a statement of equality.',
      },
      {
        id: 'q5',
        stem: 'A game divides 7 coins evenly between 2 players using `int each = 7 / 2;`. What '
          + 'goes wrong?',
        options: [
          'Each is 3, and one coin silently vanishes',
          'Nothing, each player gets 3.5',
          'The program crashes',
          'Each is 4, giving away a coin that does not exist',
        ],
        answer: 0,
        why: 'Truncation loses the remainder with no error, which is exactly why % exists.',
      },
    ],

    stuck: ['E-03', 'G-06'],

    recap: [
      'Integer division TRUNCATES. 7 / 2 is 3.',
      '% gives the remainder, and is how you test for even or wrap a value around.',
      'Read `=` as "becomes". Right side first, then store.',
      '+= and ++ are shorthand for the same thing.',
    ],
  },

  // ── 2.3 ────────────────────────────────────────────────────────────────────
  {
    lesson: '2.3',
    slug: 'boolean-expressions',
    title: 'Boolean Expressions',
    minutes: 30,
    seo: {
      h1: 'Boolean Expressions and Comparison in Java',
      title: 'Java == vs = and Boolean Comparison | Intro to Java',
      description:
        'How to write a Java condition that is true or false, the difference between = and ==, '
        + 'and how to combine tests with and, or and not.',
      primary: 'java == vs = difference',
      related: ['java comparison operators', 'java && || operators',
        'java boolean condition', 'java equals vs =='],
      faq: [
        {
          q: 'What is the difference between = and == in Java?',
          a: 'A single = puts a value into a variable. A double == asks whether two values are the '
            + 'same and gives back true or false.',
        },
        {
          q: 'What does && mean in Java?',
          a: 'And. The whole test is true only when the test on the left AND the test on the right '
            + 'are both true.',
        },
        {
          q: 'How do I test if something is NOT true in Java?',
          a: 'Put an exclamation mark in front of it. !hasKey is true exactly when hasKey is false.',
        },
      ],
    },

    hook:
      'Before a program can make a decision it needs a question with a yes or no answer. That is '
      + 'all a boolean expression is, and there is exactly one character that turns writing them '
      + 'into a nightmare if you get it wrong.',

    objectives: [
      'Write a comparison that produces true or false',
      'Explain the difference between = and ==',
      'Combine two tests with and, or and not',
    ],

    vocab: [
      { term: 'Condition', plain: 'A question with a yes or no answer.',
        formal: 'An expression whose value is a boolean.' },
      { term: 'Comparison operator', plain: 'A symbol that asks a question about two values.',
        formal: '== != < > <= >=' },
      { term: 'Logical operator', plain: 'Glue for joining two questions.',
        formal: '&& is and, || is or, ! is not.' },
    ],

    steps: [
      {
        shot: SHOT('2.3', 1, 'An editor showing comparison expressions with their true or false '
          + 'results annotated.'),
        code:
          'int score = 10;\n'
          + 'score > 5     // true\n'
          + 'score < 5     // false\n'
          + 'score == 10   // true\n'
          + 'score != 10   // false',
        note:
          'Each of these is a question, and the answer is always exactly true or false.\n\n'
          + '`>` and `<` you already know. `==` asks "are these the same?". `!=` asks "are these '
          + 'different?".\n\n'
          + 'Note there is no `=` in that list at all.',
      },
      {
        shot: SHOT('2.3', 2, 'A side-by-side comparison of a single equals and a double equals '
          + 'with their meanings labeled.'),
        code:
          'score = 10;   // PUTS 10 into score\n'
          + 'score == 10;  // ASKS whether score is 10',
        note:
          'These look almost identical and do completely different things.\n\n'
          + 'One `=` is an instruction: change the box.\n'
          + 'Two `==` is a question: is the box holding this?\n\n'
          + 'Say it out loud when you read code. "Becomes" for one, "is equal to" for two. Using '
          + '`=` where you meant `==` is the most common logic error in this entire course, and in '
          + 'a condition Java usually rejects it with `incompatible types`, which is its way of '
          + 'saying "you gave me an instruction where I wanted a question".',
      },
      {
        shot: SHOT('2.3', 3, 'Two conditions combined with the and operator, showing the result '
          + 'is true only when both parts are true.'),
        code:
          'boolean hasKey = true;\n'
          + 'int score = 10;\n'
          + '\n'
          + 'hasKey && score > 5   // true, both are true\n'
          + 'hasKey && score > 50  // false, the second part fails',
        note:
          '`&&` is AND. Both sides must be true or the whole thing is false. One false anywhere '
          + 'poisons it.\n\n'
          + '`||` is OR. It only needs one side to be true.\n\n'
          + 'The two vertical bars are on the backslash key on most keyboards.',
      },
      {
        shot: SHOT('2.3', 4, 'The not operator inverting a boolean value.'),
        code:
          'boolean gameOver = false;\n'
          + '!gameOver             // true\n'
          + '!gameOver && hasKey   // true',
        note:
          '`!` is NOT. It flips true to false and false to true.\n\n'
          + 'Read `!gameOver` as "not game over". Once you read it that way, `!gameOver && hasKey` '
          + 'is just "the game is not over and I have the key", which is a sentence rather than '
          + 'a puzzle.',
      },
    ],

    misconceptions: [
      {
        wrong: '`=` and `==` are interchangeable.',
        right: 'One assigns, two compares. They are unrelated operations.',
        why: 'This is the most common logic error in the course, and Java\'s error message for it '
          + 'does not mention the equals sign at all.',
      },
      {
        wrong: '`&&` means "and then", so order does not matter.',
        right: 'Both sides must be true. If the left is false, Java does not even look at the right.',
        why: 'That short-circuiting is what makes a safety check like `hasKey && useKey()` work.',
      },
      {
        wrong: '`score > 5` needs to be stored somewhere to be useful.',
        right: 'It IS a value: true or false. It can be used directly in an if.',
        why: 'Students who think conditions must be stored write far more code than they need.',
      },
      {
        wrong: 'You compare text with == the same as numbers.',
        right: 'For text, == asks a different question than you probably mean.',
        why: 'This course avoids String comparison for that reason. Flagged here so it is not a '
          + 'surprise later.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'Which operator ASKS whether two values are the same?',
        options: ['=', '!=', '==', '>='],
        answer: 2,
        why: 'A single = assigns; a double == compares.',
      },
      {
        id: 'cfu-2',
        stem: 'int lives = 3; What is the value of `lives != 3`?',
        options: ['false', 'true', '3', 'It is not a valid expression'],
        answer: 0,
        why: '!= asks "are these different?", and they are not.',
      },
      {
        id: 'cfu-3',
        stem: 'hasKey is true and score is 2. What is `hasKey && score > 5`?',
        options: ['true', 'An error', 'It depends on the order', 'false'],
        answer: 3,
        why: '&& needs BOTH sides true, and 2 is not greater than 5.',
      },
      {
        id: 'cfu-4',
        stem: 'hasKey is true and score is 2. What is `hasKey || score > 5`?',
        options: ['true', 'false', 'An error', '2'],
        answer: 0,
        why: '|| only needs one side to be true, and the left side is.',
      },
      {
        id: 'cfu-5',
        stem: 'gameOver is false. What is `!gameOver`?',
        options: ['false', 'An error', 'true', 'null'],
        answer: 2,
        why: '! flips the value.',
      },
    ],

    gap: {
      intro:
        'A door should open only when the player has the key AND the alarm is not ringing. Fill in '
        + 'the missing operators.',
      code: 'boolean canOpen = hasKey ___1___ ___2___alarmRinging;',
      holes: [
        { n: 1, hint: 'Both parts have to be true.', accept: ['&&'] },
        { n: 2, hint: 'One character that flips a true into a false.', accept: ['!'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'Which line ASKS a question rather than giving an instruction?',
        options: ['lives = 3;', 'int lives = 3;', 'lives += 3;', 'lives == 3'],
        answer: 3,
        why: 'Only == compares. The others all change the variable.',
      },
      {
        id: 'q2',
        stem: 'a is 5 and b is 10. What is `a < b && b < 20`?',
        options: ['true', 'false', '15', 'An error'],
        answer: 0,
        why: 'Both parts are true, so && gives true.',
      },
      {
        id: 'q3',
        stem: 'When is `x || y` false?',
        options: [
          'When both x and y are false',
          'When either one is false',
          'When both are true',
          'Never',
        ],
        answer: 0,
        why: 'OR only fails when there is nothing true on either side.',
      },
      {
        id: 'q4',
        stem: 'A student writes `if (score = 10)` and Java refuses it. Why?',
        options: [
          'They assigned instead of comparing, so it is an instruction where a question was needed',
          'score cannot be 10',
          'if cannot use numbers',
          'The parentheses are wrong',
        ],
        answer: 0,
        why: 'One = assigns. An if needs something that is true or false.',
      },
    ],

    stuck: ['E-03', 'E-09', 'G-06'],

    recap: [
      'A condition is a question whose answer is true or false.',
      '`=` becomes. `==` is equal to. They are not interchangeable.',
      '&& needs both sides. || needs one. ! flips.',
      'A comparison IS a value and can be used directly.',
    ],
  },

  // ── 2.4 ────────────────────────────────────────────────────────────────────
  {
    lesson: '2.4',
    slug: 'if-and-else',
    title: 'if and else',
    minutes: 30,
    seo: {
      h1: 'The if and else Statement in Java',
      title: 'Java if and else Statements for Beginners | Intro to Java',
      description:
        'How to make a Java program choose between two paths with if and else, where the braces '
        + 'go, and the semicolon mistake that breaks it silently.',
      primary: 'java if else beginner',
      related: ['java if statement braces', 'java if semicolon bug',
        'greenfoot if statement', 'java else if'],
      faq: [
        {
          q: 'Do I need braces on a Java if statement?',
          a: 'Java allows you to leave them off for a single line, but this course always uses '
            + 'them. Adding a second line to a brace-less if is a classic silent bug.',
        },
        {
          q: 'Why does my if statement always run?',
          a: 'Check for a semicolon straight after the closing parenthesis. `if (x > 5);` ends the if '
            + 'immediately, so the block after it always runs.',
        },
        {
          q: 'Does the else part always run?',
          a: 'No. Exactly one of the two branches runs: the if body when the condition is true, '
            + 'the else body when it is false.',
        },
      ],
    },

    hook:
      'This is the moment a program stops being a list of instructions and starts making choices. '
      + 'Everything that makes a game feel alive comes from here.',

    objectives: [
      'Write an if statement with a condition and a body',
      'Add an else branch and predict which one runs',
      'Spot the stray semicolon that silently breaks an if',
    ],

    vocab: [
      { term: 'if statement', plain: 'Do this, but only when that is true.',
        formal: 'A control structure that executes its body when its condition is true.' },
      { term: 'Branch', plain: 'One of the paths the program can take.',
        formal: 'A block of statements reached only under a particular condition.' },
      { term: 'Block', plain: 'The code between a pair of braces.',
        formal: 'A brace-delimited group of statements treated as one unit.' },
    ],

    steps: [
      {
        shot: SHOT('2.4', 1, 'A simple if statement in an editor with the condition and body '
          + 'labeled.'),
        code:
          'if (score > 100)\n'
          + '{\n'
          + '    Greenfoot.playSound("win.wav");\n'
          + '}',
        note:
          'Read it as one sentence: IF score is greater than 100, play the sound.\n\n'
          + 'The condition goes in parentheses. The body goes in curly braces. If the condition '
          + 'is false, the whole body is skipped and the program carries straight on.',
      },
      {
        shot: SHOT('2.4', 2, 'An if statement with an else branch, both bodies visible.'),
        code:
          'if (lives > 0)\n'
          + '{\n'
          + '    move(4);\n'
          + '}\n'
          + 'else\n'
          + '{\n'
          + '    Greenfoot.stop();\n'
          + '}',
        note:
          'else is the other path. EXACTLY ONE of the two bodies runs, always. Never both, never '
          + 'neither.\n\n'
          + 'Notice else has no condition of its own. It means "in every other case", so it does '
          + 'not need one.',
      },
      {
        shot: SHOT('2.4', 3, 'An if statement inside an act method controlling actor movement.'),
        code:
          'public void act()\n'
          + '{\n'
          + '    if (isAtEdge())\n'
          + '    {\n'
          + '        turn(180);\n'
          + '    }\n'
          + '    move(3);\n'
          + '}',
        note:
          'Now it is doing real work. Every frame: check the edge, turn if needed, then move.\n\n'
          + 'Look at where `move(3)` sits. It is OUTSIDE the braces, so it runs every frame no '
          + 'matter what the condition said. Moving it inside the braces would mean the actor only '
          + 'moves when it is at the edge, which is a completely different game and a very common '
          + 'accident.',
      },
      {
        shot: SHOT('2.4', 4, 'An if statement with a stray semicolon after the condition, with the '
          + 'semicolon circled.'),
        code:
          'if (score > 100);   // <-- this semicolon ends the if\n'
          + '{\n'
          + '    Greenfoot.playSound("win.wav");\n'
          + '}',
        note:
          'This compiles. It runs. It is wrong, and it will not tell you.\n\n'
          + 'The semicolon ends the if statement immediately, so the if now controls nothing at '
          + 'all. The braces below become an ordinary block that always runs, and your sound plays '
          + 'every single frame regardless of the score.\n\n'
          + 'There is no error message for this, ever. If an if seems to always run, look for this '
          + 'semicolon first.',
      },
    ],

    misconceptions: [
      {
        wrong: 'else runs after the if body.',
        right: 'Exactly one branch runs. else is the alternative, not the continuation.',
        why: 'Expecting both to run makes every branching program behave inexplicably.',
      },
      {
        wrong: 'A semicolon after `if (...)` is harmless punctuation.',
        right: 'It ends the if, so the block below always runs.',
        why: 'It produces no error and no warning. It is the hardest bug in this unit to see.',
      },
      {
        wrong: 'Code after the closing brace only runs when the condition was true.',
        right: 'It runs either way. Only what is INSIDE the braces is conditional.',
        why: 'This is the difference between an actor that patrols and one that never moves.',
      },
      {
        wrong: 'Braces are optional so it is fine to leave them off.',
        right: 'Java permits it, but adding a second line later silently breaks it.',
        why: 'Only the first line is controlled by a brace-less if. The second always runs.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'score is 50. What happens?\n\nif (score > 100)\n{\n    move(4);\n}\nturn(10);',
        options: ['Both run', 'Neither runs', 'Only turn(10) runs', 'Only move(4) runs'],
        answer: 2,
        why: 'The condition is false so the body is skipped, but turn is outside the braces and '
          + 'always runs.',
      },
      {
        id: 'cfu-2',
        stem: 'How many branches of an if/else run?',
        options: ['Exactly one', 'Both', 'Neither, unless the condition is true', 'It depends'],
        answer: 0,
        why: 'One or the other, always, never both.',
      },
      {
        id: 'cfu-3',
        stem: 'An if seems to run every single time even when the condition should be false. What '
          + 'would you check first?',
        options: [
          'Whether the world is too small',
          'Whether the actor has an image',
          'A stray semicolon straight after the condition',
          'The speed slider',
        ],
        answer: 2,
        why: 'A semicolon there ends the if, and the block below becomes unconditional.',
      },
      {
        id: 'cfu-4',
        stem: 'Does else need a condition of its own?',
        options: ['Yes, always', 'Only when the if is false', 'Only with &&', 'No, it covers every other case'],
        answer: 3,
        why: 'else means "in all other cases", which is why it takes no condition.',
      },
    ],

    gap: {
      intro:
        'The player should lose a life when it touches a spike, and otherwise keep moving. '
        + 'Fill in the missing pieces.',
      code:
        '___1___ (isTouching(Spike.class))\n'
        + '{\n'
        + '    lives = lives - 1;\n'
        + '}\n'
        + '___2___\n'
        + '{\n'
        + '    move(3);\n'
        + '}',
      holes: [
        { n: 1, hint: 'The keyword that starts a decision.', accept: ['if'] },
        { n: 2, hint: 'The keyword for the other path. It takes no condition.', accept: ['else'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'What is wrong with `if (lives > 0);`?',
        options: [
          'The semicolon ends the if, so whatever follows always runs',
          'Nothing',
          'lives cannot be compared to 0',
          'It needs an else',
        ],
        answer: 0,
        why: 'A statement-ending semicolon there makes the if control nothing.',
      },
      {
        id: 'q2',
        stem: 'lives is 0. Which runs?\n\nif (lives > 0)\n{\n    move(4);\n}\nelse\n{\n    Greenfoot.stop();\n}',
        options: ['move(4)', 'Both', 'Greenfoot.stop()', 'Neither'],
        answer: 2,
        why: 'The condition is false, so the else branch runs.',
      },
      {
        id: 'q3',
        stem: 'Where does the condition of an if statement go?',
        options: ['In curly braces', 'After the body', 'In square brackets', 'In parentheses'],
        answer: 3,
        why: 'Parentheses hold the condition; curly braces hold the body.',
      },
      {
        id: 'q4',
        stem: 'Why does this course always use braces even for a one-line if?',
        options: [
          'Because adding a second line later silently breaks a brace-less if',
          'Java requires them',
          'They make it run faster',
          'To make the file longer',
        ],
        answer: 0,
        why: 'Without braces only the first line is controlled, and the second always runs.',
      },
    ],

    stuck: ['E-04', 'E-09', 'G-07'],

    recap: [
      'Condition in parentheses, body in curly braces.',
      'Exactly one branch of an if/else runs.',
      'Code after the closing brace runs either way.',
      'A semicolon after the condition silently breaks the if. No error, ever.',
    ],
  },

  // ── 2.5 ────────────────────────────────────────────────────────────────────
  {
    lesson: '2.5',
    slug: 'else-if-chains',
    title: 'else if Chains',
    minutes: 25,
    seo: {
      h1: 'else if Chains and Condition Order in Java',
      title: 'Java else if Chains and Why Order Matters | Intro to Java',
      description:
        'How a Java else if chain picks exactly one branch, why the order of the conditions '
        + 'changes the answer, and how to avoid an unreachable branch.',
      primary: 'java else if order matters',
      related: ['java else if chain', 'java unreachable condition',
        'java grade if else example', 'java multiple conditions'],
      faq: [
        {
          q: 'How many branches of an else if chain run?',
          a: 'Exactly one. Java checks the conditions from the top and stops at the first one that '
            + 'is true.',
        },
        {
          q: 'Does the order of else if conditions matter?',
          a: 'Yes, and it is the most common bug in a chain. A broad condition placed first can '
            + 'make every condition below it unreachable.',
        },
        {
          q: 'Do I need a final else?',
          a: 'No, but without one it is possible for no branch to run at all, which is often not '
            + 'what you intended.',
        },
      ],
    },

    hook:
      'Two choices was easy. Real games have five: which key was pressed, which level you are on, '
      + 'which band your score falls into. A chain handles that, and it has one trap that will '
      + 'quietly ignore half the code you wrote.',

    objectives: [
      'Write an else if chain that picks exactly one branch',
      'Explain why the order of conditions changes the result',
      'Spot a branch that can never be reached',
    ],

    vocab: [
      { term: 'else if chain', plain: 'A list of questions, checked from the top, stopping at the '
          + 'first yes.',
        formal: 'A sequence of conditions where at most one branch executes.' },
      { term: 'Unreachable branch', plain: 'Code that can never run because something above it '
          + 'always catches first.',
        formal: 'A branch whose condition is subsumed by an earlier one.' },
    ],

    steps: [
      {
        shot: SHOT('2.5', 1, 'An else if chain with three branches shown in an editor.'),
        code:
          'if (score >= 90)\n'
          + '{\n'
          + '    grade = "A";\n'
          + '}\n'
          + 'else if (score >= 80)\n'
          + '{\n'
          + '    grade = "B";\n'
          + '}\n'
          + 'else\n'
          + '{\n'
          + '    grade = "C";\n'
          + '}',
        note:
          'Java checks from the top and STOPS at the first condition that is true. Once a branch '
          + 'is taken, the rest are not even looked at.\n\n'
          + 'That is why `score >= 80` does not need to also say "and less than 90". If the score '
          + 'were 95 we would never have reached this line.',
      },
      {
        shot: SHOT('2.5', 2, 'The same chain with the conditions in the wrong order, and the '
          + 'unreachable branches graded.'),
        code:
          '// WRONG. Everything after the first branch is unreachable.\n'
          + 'if (score >= 60)\n'
          + '{\n'
          + '    grade = "D";\n'
          + '}\n'
          + 'else if (score >= 90)\n'
          + '{\n'
          + '    grade = "A";   // can never run\n'
          + '}',
        note:
          'Same conditions, different order, completely broken.\n\n'
          + 'A score of 95 is greater than 60, so the first branch catches it and the A branch is '
          + 'never reached. Nobody can ever get an A.\n\n'
          + 'This compiles without a murmur. The rule that saves you: in a chain of ranges, put '
          + 'the NARROWEST condition first and let the chain widen as it goes down.',
      },
      {
        shot: SHOT('2.5', 3, 'A chain with no final else, showing a value that matches nothing.'),
        code:
          'if (key == 1)\n{\n    move(4);\n}\n'
          + 'else if (key == 2)\n{\n    move(-4);\n}',
        note:
          'A chain does not have to end in else. But then it is possible for NOTHING to run.\n\n'
          + 'That is fine when doing nothing is the right answer. It is a bug when you assumed one '
          + 'of the branches would always catch. Ask yourself which you meant.',
      },
    ],

    misconceptions: [
      {
        wrong: 'Every condition in the chain is checked.',
        right: 'Checking stops at the first true one.',
        why: 'This is what lets later conditions be written simply, and what makes order matter.',
      },
      {
        wrong: 'The order of the branches does not matter as long as the conditions are right.',
        right: 'Order decides which branch catches. A broad one first hides everything below.',
        why: 'The most common logic bug in the unit, and it produces no error at all.',
      },
      {
        wrong: 'A chain always runs something.',
        right: 'Without a final else, it is possible for no branch to run.',
        why: 'Silently doing nothing is very hard to debug if you expected a default.',
      },
      {
        wrong: 'Separate ifs behave the same as an else if chain.',
        right: 'Separate ifs are all checked, so several can run.',
        why: 'This is the difference between one arrow key moving you and two moving you twice.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'score is 95. Which grade?\n\nif (score >= 90)\n{\n    grade = "A";\n}\nelse if (score >= 80)\n'
          + '{\n    grade = "B";\n}',
        options: ['B', 'Both are set', 'A', 'Neither'],
        answer: 2,
        why: 'The first true condition wins and the rest are skipped.',
      },
      {
        id: 'cfu-2',
        stem: 'In this chain, when can the second branch ever run?\n\nif (n > 0)\n{\n    ...\n}\nelse if '
          + '(n > 10)\n{\n    ...\n}',
        options: ['When n is above 10', 'When n is 0', 'Always', 'Never'],
        answer: 3,
        why: 'Anything above 10 is already above 0, so the first branch always catches it first.',
      },
      {
        id: 'cfu-3',
        stem: 'How many branches of an else if chain can run at once?',
        options: ['At most one', 'All that are true', 'Exactly two', 'It depends on the order'],
        answer: 0,
        why: 'A chain picks one branch and stops.',
      },
      {
        id: 'cfu-4',
        stem: 'When ordering a chain of number ranges, which should come first?',
        options: ['The narrowest', 'The widest', 'The most likely', 'It never matters'],
        answer: 0,
        why: 'A wide condition placed first swallows every narrower one below it.',
      },
    ],

    gap: {
      intro:
        'Give a rank based on coins collected: 20 or more is "gold", 10 or more is "silver", and '
        + 'anything else is "bronze". Put the conditions in an order that actually works.',
      code:
        'if (coins >= ___1___)\n'
        + '{\n'
        + '    rank = "gold";\n'
        + '}\n'
        + '___2___ (coins >= ___3___)\n'
        + '{\n'
        + '    rank = "silver";\n'
        + '}\n'
        + 'else\n'
        + '{\n'
        + '    rank = "bronze";\n'
        + '}',
      holes: [
        { n: 1, hint: 'The narrowest band has to be tested first. Which number is hardest to reach?',
          accept: ['20'] },
        { n: 2, hint: 'Two keywords, to continue the chain rather than start a new decision.',
          accept: ['else if'] },
        { n: 3, hint: 'The middle band.', accept: ['10'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'Java checks the conditions in a chain:',
        options: [
          'All of them, every time',
          'From the bottom up',
          'From the top, stopping at the first true one',
          'In a random order',
        ],
        answer: 2,
        why: 'Top down, first match wins.',
      },
      {
        id: 'q2',
        stem: 'n is 50. Which branch runs?\n\nif (n > 10)\n{\n    a();\n}\nelse if (n > 40)\n{\n    b();\n}\n'
          + 'else\n{\n    c();\n}',
        options: ['a()', 'b()', 'c()', 'a() and b()'],
        answer: 0,
        why: '50 is greater than 10, so the first branch catches and the rest are skipped.',
      },
      {
        id: 'q3',
        stem: 'What is the difference between two separate ifs and an else if chain?',
        options: [
          'There is none',
          'Separate ifs are all checked, so more than one body can run',
          'A chain runs faster',
          'Separate ifs cannot use else',
        ],
        answer: 1,
        why: 'A chain stops at the first match; separate ifs each get evaluated.',
      },
      {
        id: 'q4',
        stem: 'A chain has no final else. What can happen?',
        options: [
          'It will not compile',
          'No branch runs at all',
          'The first branch always runs',
          'The last branch always runs',
        ],
        answer: 1,
        why: 'With nothing to catch the remaining cases, the whole chain can do nothing.',
      },
    ],

    stuck: ['E-04', 'G-07', 'G-08'],

    recap: [
      'A chain is checked top down and stops at the first true condition.',
      'At most one branch runs.',
      'Order decides everything. Narrowest condition first.',
      'No final else means it is possible for nothing to run.',
    ],
  },

  // ── 2.6 ────────────────────────────────────────────────────────────────────
  {
    lesson: '2.6',
    slug: 'randomness',
    title: 'Randomness',
    minutes: 25,
    seo: {
      h1: 'Random Numbers in Greenfoot',
      title: 'Greenfoot getRandomNumber Explained | Intro to Java',
      description:
        'How Greenfoot getRandomNumber works, why its upper limit is exclusive, and how to shift '
        + 'the range to get the numbers you actually want.',
      primary: 'greenfoot getrandomnumber',
      related: ['greenfoot random number range', 'java random number beginner',
        'greenfoot random spawn', 'getRandomNumber exclusive'],
      faq: [
        {
          q: 'What does Greenfoot.getRandomNumber(10) return?',
          a: 'A whole number from 0 to 9. The limit you pass in is never produced, which is the '
            + 'part beginners get wrong.',
        },
        {
          q: 'How do I get a random number between 1 and 6 in Greenfoot?',
          a: 'Use Greenfoot.getRandomNumber(6) + 1. The call gives 0 to 5, and adding one shifts '
            + 'it to 1 to 6.',
        },
        {
          q: 'How do I make something happen randomly some of the time?',
          a: 'Test a random number against a threshold, for example if '
            + 'Greenfoot.getRandomNumber(100) < 5 for roughly a 5 percent chance each frame.',
        },
      ],
    },

    hook:
      'A game where the enemy always does the same thing stops being interesting on the second '
      + 'play. Randomness is one method call, and one off-by-one that catches nearly everybody.',

    objectives: [
      'Use Greenfoot.getRandomNumber and state its exact range',
      'Shift a random range to start somewhere other than zero',
      'Make an event happen a set percentage of the time',
    ],

    vocab: [
      { term: 'Exclusive upper bound', plain: 'The number you pass in is never one of the answers.',
        formal: 'getRandomNumber(n) returns a value in 0 to n-1 inclusive.' },
    ],

    steps: [
      {
        shot: SHOT('2.6', 1, 'A Greenfoot method result dialog showing a random number produced by '
          + 'getRandomNumber.'),
        code: 'int n = Greenfoot.getRandomNumber(6);',
        note:
          'This gives a whole number from 0 to 5.\n\n'
          + 'NOT 1 to 6. NOT 0 to 6. The number you pass in is the count of possible answers, and '
          + 'it is never itself one of them.\n\n'
          + 'Six possible values, starting at zero. Say "six possibilities" rather than "up to '
          + 'six" and you will get it right every time.',
      },
      {
        shot: SHOT('2.6', 2, 'A dice roll produced by shifting a random number up by one.'),
        code: 'int dice = Greenfoot.getRandomNumber(6) + 1;   // 1 to 6',
        note:
          'To roll a real dice you want 1 to 6, so take the 0-to-5 and shift the whole range up '
          + 'by one.\n\n'
          + 'The pattern for any range: `getRandomNumber(howMany) + lowest`. For 5 to 10 that is '
          + 'six possible values starting at 5, so `getRandomNumber(6) + 5`.',
      },
      {
        shot: SHOT('2.6', 3, 'An actor spawning at a random horizontal position along the top of '
          + 'the world.'),
        code:
          'int x = Greenfoot.getRandomNumber(getWidth());\n'
          + 'addObject(new Coin(), x, 0);',
        note:
          'A random position across the world. Because the upper bound is exclusive this is exactly '
          + 'right: valid x values run from 0 to getWidth() - 1, and that is precisely what this '
          + 'produces.\n\n'
          + 'If the bound had been inclusive, this line would occasionally place a coin one cell '
          + 'outside the world. The exclusive rule is doing you a favor here.',
      },
      {
        shot: SHOT('2.6', 4, 'A rare event triggered by comparing a random number to a small '
          + 'threshold.'),
        code:
          'if (Greenfoot.getRandomNumber(100) < 5)\n'
          + '{\n'
          + '    addObject(new Enemy(), 0, 0);\n'
          + '}',
        note:
          'A 5 percent chance, checked every frame.\n\n'
          + 'The numbers 0, 1, 2, 3 and 4 are below 5, and there are 100 possibilities, so it fires '
          + 'about five times in a hundred.\n\n'
          + 'Remember act() runs many times a second. Five percent per FRAME is not rare at all; it '
          + 'is several enemies a second. Percentages here are per frame, not per game.',
      },
    ],

    misconceptions: [
      {
        wrong: 'getRandomNumber(6) gives 1 to 6.',
        right: 'It gives 0 to 5.',
        why: 'Every dice, every menu choice, every random lane is off by one if you believe this.',
      },
      {
        wrong: 'getRandomNumber(6) can return 6.',
        right: 'The upper bound is exclusive and is never produced.',
        why: 'Believing otherwise leads to array errors in Unit 5, where the last valid index is '
          + 'always one less than the length.',
      },
      {
        wrong: 'A 5 percent chance in act() is rare.',
        right: 'act() runs many times a second, so it happens several times a second.',
        why: 'This is why beginners drown their scenario in enemies and think spawning is broken.',
      },
      {
        wrong: 'Random means every value appears the same number of times.',
        right: 'Each value is equally LIKELY. Short runs can look very lopsided.',
        why: 'Students often "fix" working random code because five heads in a row looked wrong.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'What are the possible values of `Greenfoot.getRandomNumber(4)`?',
        options: ['1, 2, 3, 4', '0, 1, 2, 3', '0, 1, 2, 3, 4', '1, 2, 3'],
        answer: 1,
        why: 'Four possibilities, starting at zero, so the 4 itself never appears.',
      },
      {
        id: 'cfu-2',
        stem: 'Which expression gives a number from 1 to 10?',
        options: [
          'Greenfoot.getRandomNumber(10)',
          'Greenfoot.getRandomNumber(11)',
          'Greenfoot.getRandomNumber(10) + 1',
          'Greenfoot.getRandomNumber(1) + 10',
        ],
        answer: 2,
        why: 'Ten possibilities starting at zero, shifted up by one.',
      },
      {
        id: 'cfu-3',
        stem: 'Which expression gives a number from 5 to 10?',
        options: [
          'Greenfoot.getRandomNumber(6) + 5',
          'Greenfoot.getRandomNumber(5) + 10',
          'Greenfoot.getRandomNumber(10) + 5',
          'Greenfoot.getRandomNumber(5) + 5',
        ],
        answer: 0,
        why: '5 through 10 is six possible values, starting at 5.',
      },
      {
        id: 'cfu-4',
        stem: 'Roughly how often does `if (Greenfoot.getRandomNumber(10) < 1)` fire?',
        options: ['Never', 'One time in ten', 'Every time', 'One time in a hundred'],
        answer: 1,
        why: 'Only the value 0 is below 1, and it is one of ten possibilities.',
      },
    ],

    gap: {
      intro:
        'Spawn a coin at a random height down the left edge of the world, and only about one frame '
        + 'in fifty. Remember which bound is exclusive.',
      code:
        'if (Greenfoot.getRandomNumber(___1___) < 1)\n'
        + '{\n'
        + '    int y = Greenfoot.getRandomNumber(___2___);\n'
        + '    addObject(new Coin(), 0, y);\n'
        + '}',
      holes: [
        { n: 1, hint: 'One chance in how many?', accept: ['50'] },
        {
          n: 2,
          hint: 'A method on the world that reports how tall it is. Do not forget the parentheses.',
          accept: ['getHeight()'],
        },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'getRandomNumber(1) always returns:',
        options: ['1', '0', 'either 0 or 1', 'an error'],
        answer: 1,
        why: 'One possibility, starting at zero.',
      },
      {
        id: 'q2',
        stem: 'You want a random lane from 0 to 4. Which call?',
        options: [
          'getRandomNumber(4)',
          'getRandomNumber(5)',
          'getRandomNumber(4) + 1',
          'getRandomNumber(5) + 1',
        ],
        answer: 1,
        why: '0 through 4 is five possible values.',
      },
      {
        id: 'q3',
        stem: 'Why is an exclusive upper bound convenient with getWidth()?',
        options: [
          'It is not, it is just awkward',
          'Valid x values run 0 to width-1, which is exactly what it produces',
          'It makes the numbers bigger',
          'It stops the actor moving',
        ],
        answer: 1,
        why: 'The exclusive bound matches the valid coordinate range exactly.',
      },
      {
        id: 'q4',
        stem: 'A student says their 2 percent spawn chance is "spawning constantly". What is the '
          + 'most likely explanation?',
        options: [
          'getRandomNumber is broken',
          'The check is in act(), which runs many times a second',
          'They should use a bigger number',
          'Random numbers are not really random',
        ],
        answer: 1,
        why: 'Two percent per frame at tens of frames a second is frequent.',
      },
    ],

    stuck: ['G-09', 'R-04'],

    recap: [
      'getRandomNumber(n) gives 0 to n-1. The n itself never appears.',
      'To shift a range: getRandomNumber(howMany) + lowest.',
      'A percentage checked in act() is per FRAME, not per game.',
      'Equally likely is not the same as evenly spread.',
    ],
  },

  // ── 2.7 ────────────────────────────────────────────────────────────────────
  {
    lesson: '2.7',
    slug: 'keyboard-input',
    title: 'Keyboard Input',
    minutes: 30,
    seo: {
      h1: 'Keyboard Control in Greenfoot with isKeyDown',
      title: 'Greenfoot isKeyDown Keyboard Controls | Intro to Java',
      description:
        'How to move a Greenfoot actor with the arrow keys using isKeyDown, why the check belongs '
        + 'in act, and why separate ifs beat an else if chain here.',
      primary: 'greenfoot iskeydown arrow keys',
      related: ['greenfoot keyboard control', 'greenfoot move with arrow keys',
        'greenfoot diagonal movement', 'greenfoot key not detected'],
      faq: [
        {
          q: 'How do I move an actor with the arrow keys in Greenfoot?',
          a: 'Check Greenfoot.isKeyDown("left") and the other directions inside act(), and change '
            + 'the actor location when one is held.',
        },
        {
          q: 'Why can my actor not move diagonally in Greenfoot?',
          a: 'You probably used an else if chain, which stops at the first key it finds. Use '
            + 'separate if statements so two keys can both be handled in the same frame.',
        },
        {
          q: 'Why does my key only work sometimes in Greenfoot?',
          a: 'isKeyDown reports whether the key is held at that instant, so it must be checked '
            + 'every frame inside act rather than once.',
        },
      ],
    },

    hook:
      'This is the lesson where the game becomes yours to play. It is also where an else if chain, '
      + 'which you just learned to love, becomes exactly the wrong tool.',

    objectives: [
      'Move an actor with the arrow keys',
      'Explain why the key check must live inside act()',
      'Explain why separate ifs beat a chain for movement keys',
    ],

    vocab: [
      { term: 'isKeyDown', plain: 'Is this key being held right now?',
        formal: 'Greenfoot.isKeyDown(String) returns true while the named key is pressed.' },
    ],

    steps: [
      {
        shot: SHOT('2.7', 1, 'An actor moving left in the world while the left arrow key is held.'),
        code:
          'public void act()\n'
          + '{\n'
          + '    if (Greenfoot.isKeyDown("left"))\n'
          + '    {\n'
          + '        setLocation(getX() - 3, getY());\n'
          + '    }\n'
          + '}',
        note:
          'Compile and run, then hold the left arrow.\n\n'
          + 'Everything here you have already met. `isKeyDown` hands back true or false, which is '
          + 'exactly what an if wants. `setLocation(getX() - 3, getY())` is the line from 1.5: take '
          + 'the current x, subtract 3, leave y alone.\n\n'
          + 'The key name is text in double quotes, and it is lower case: "left", not "Left".',
      },
      {
        shot: SHOT('2.7', 2, 'The actor responding to all four arrow keys.'),
        code:
          'public void act()\n'
          + '{\n'
          + '    if (Greenfoot.isKeyDown("left"))\n'
          + '    {\n'
          + '        setLocation(getX() - 3, getY());\n'
          + '    }\n'
          + '    if (Greenfoot.isKeyDown("right"))\n'
          + '    {\n'
          + '        setLocation(getX() + 3, getY());\n'
          + '    }\n'
          + '    if (Greenfoot.isKeyDown("up"))\n'
          + '    {\n'
          + '        setLocation(getX(), getY() - 3);\n'
          + '    }\n'
          + '    if (Greenfoot.isKeyDown("down"))\n'
          + '    {\n'
          + '        setLocation(getX(), getY() + 3);\n'
          + '    }\n'
          + '}',
        note:
          'All four directions. Note "up" SUBTRACTS from y, because y grows downward. That is the '
          + 'rule from 1.4 finally paying off.\n\n'
          + 'Look carefully at what these are: four SEPARATE if statements. Not a chain. That is '
          + 'deliberate and it is the next step.',
      },
      {
        shot: SHOT('2.7', 3, 'A comparison of separate ifs allowing diagonal movement against a '
          + 'chain that does not.'),
        code:
          '// A CHAIN. Diagonal movement is impossible.\n'
          + 'if (Greenfoot.isKeyDown("left"))\n'
          + '{\n'
          + '    ...\n'
          + '}\n'
          + 'else if (Greenfoot.isKeyDown("up"))\n{\n    ...\n}',
        note:
          'Here is why the chain is wrong for this job.\n\n'
          + 'A chain stops at the first true condition. Hold left and up together and it handles '
          + 'left, then stops. You can never move diagonally.\n\n'
          + 'Separate ifs are each checked, so both run in the same frame and the actor moves '
          + 'diagonally. This is the clearest example in the course of "which tool" mattering more '
          + 'than "is it correct Java", because both versions compile and run perfectly.',
      },
      {
        shot: SHOT('2.7', 4, 'The actor stopped at the world edge instead of walking off it.'),
        code:
          'public void act()\n'
          + '{\n'
          + '    if (Greenfoot.isKeyDown("right") && getX() < getWorld().getWidth() - 1)\n'
          + '    {\n'
          + '        setLocation(getX() + 3, getY());\n'
          + '    }\n'
          + '}',
        note:
          'And a guard, using && from 2.3: move right only if the right arrow is held AND there is '
          + 'still room.\n\n'
          + 'Greenfoot already clamps an actor inside the world, so this is not strictly needed '
          + 'here. It matters the moment you want your OWN boundary, like a wall part way across, '
          + 'and it shows that a condition can ask about two unrelated things at once.',
      },
    ],

    misconceptions: [
      {
        wrong: 'Use an else if chain for the arrow keys.',
        right: 'Use separate ifs, or diagonal movement becomes impossible.',
        why: 'Both compile and both run. The chain version just quietly cannot do something the '
          + 'player expects.',
      },
      {
        wrong: 'isKeyDown remembers that a key was pressed.',
        right: 'It reports whether the key is held AT THAT MOMENT, which is why it lives in act().',
        why: 'Checking once outside the loop gives a key that works for exactly one frame.',
      },
      {
        wrong: '"up" should increase y.',
        right: 'y grows downward, so up SUBTRACTS.',
        why: 'The single most common inverted-control bug, straight out of 1.4.',
      },
      {
        wrong: 'Key names can be capitalized however you like.',
        right: 'They are lower case strings: "left", "right", "up", "down", "space", "a".',
        why: 'A wrong key name is not an error. It simply never matches, and the key does nothing.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'Which line moves an actor UP the screen?',
        options: [
          'setLocation(getX(), getY() + 3);',
          'setLocation(getX(), getY() - 3);',
          'setLocation(getX() - 3, getY());',
          'move(-3);',
        ],
        answer: 1,
        why: 'y grows downward, so a smaller y is higher up the screen.',
      },
      {
        id: 'cfu-2',
        stem: 'Why must the isKeyDown check be inside act()?',
        options: [
          'Java requires it',
          'Because it reports whether the key is held right now, so it has to be asked every frame',
          'Because act() is faster',
          'It does not have to be',
        ],
        answer: 1,
        why: 'It is an instantaneous question, so it must be re-asked continuously.',
      },
      {
        id: 'cfu-3',
        stem: 'A player holds left and up together but only moves left. What is the most likely '
          + 'cause?',
        options: [
          'The keyboard is broken',
          'The key checks are in an else if chain, which stops at the first match',
          'Greenfoot cannot do diagonals',
          'The world is too small',
        ],
        answer: 1,
        why: 'A chain handles one branch and stops. Separate ifs allow both.',
      },
      {
        id: 'cfu-4',
        stem: 'What does `Greenfoot.isKeyDown("Left")` do, with a capital L?',
        options: [
          'Works normally',
          'Never matches, so the key silently does nothing',
          'Causes a compiler error',
          'Matches every key',
        ],
        answer: 1,
        why: 'Key names are lower case, and a name that never matches produces no error at all.',
      },
      {
        id: 'cfu-5',
        stem: 'What type does isKeyDown hand back?',
        options: ['int', 'String', 'boolean', 'void'],
        answer: 2,
        why: 'It is a yes or no question, which is what makes it usable directly in an if.',
      },
    ],

    gap: {
      intro:
        'Complete the act() method so the player moves right while the right arrow is held. Use '
        + 'the coordinate form so it works whichever way the actor is facing.',
      code:
        'public void act()\n'
        + '{\n'
        + '    if (Greenfoot.___1___("___2___"))\n'
        + '    {\n'
        + '        setLocation(getX() ___3___ 3, ___4___);\n'
        + '    }\n'
        + '}',
      holes: [
        { n: 1, hint: 'The method that asks whether a key is held.', accept: ['isKeyDown'] },
        { n: 2, hint: 'The key name, in lower case, with no quotes needed inside the blank.',
          accept: ['right'] },
        { n: 3, hint: 'Moving right means x gets bigger.', accept: ['+'] },
        { n: 4, hint: 'y is not changing, so ask the actor for its current y.', accept: ['getY()'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'For four-direction movement including diagonals, you should use:',
        options: [
          'An else if chain',
          'Four separate if statements',
          'One if with && between the keys',
          'A single if with all four keys in it',
        ],
        answer: 1,
        why: 'Separate ifs are each checked, so two keys can both act in one frame.',
      },
      {
        id: 'q2',
        stem: 'isKeyDown returns:',
        options: ['The name of the key', 'true or false', 'The number of times pressed', 'Nothing'],
        answer: 1,
        why: 'A boolean, which is exactly what an if needs.',
      },
      {
        id: 'q3',
        stem: 'An actor should move down. Which is right?',
        options: [
          'setLocation(getX(), getY() - 3);',
          'setLocation(getX(), getY() + 3);',
          'setLocation(getX() + 3, getY());',
          'turn(90);',
        ],
        answer: 1,
        why: 'Down the screen is a bigger y.',
      },
      {
        id: 'q4',
        stem: 'A key does nothing at all and there is no error message. What is worth checking?',
        options: [
          'Whether the key name string is spelled and cased correctly',
          'Whether the world is big enough',
          'Whether the actor has an image',
          'Whether the speed slider is at maximum',
        ],
        answer: 0,
        why: 'A key name that never matches is not an error, it is silence.',
      },
      {
        id: 'q5',
        stem: 'Why does this lesson use setLocation rather than move()?',
        options: [
          'move() does not exist any more',
          'Because setLocation ignores which way the actor is facing, which is what arrow keys want',
          'setLocation is faster',
          'There is no reason',
        ],
        answer: 1,
        why: 'Arrow keys mean screen directions, not "forward", so coordinates are the right tool.',
      },
    ],

    stuck: ['G-04', 'G-10', 'R-05'],

    recap: [
      'isKeyDown asks whether a key is held right now, so it belongs in act().',
      'Key names are lower case strings, and a wrong one fails silently.',
      'Use SEPARATE ifs, not a chain, or diagonal movement is impossible.',
      'Up is a smaller y. Down is a bigger y.',
      'setLocation moves by coordinates and ignores facing, which is what arrow keys need.',
    ],
  },
];

module.exports = { course: COURSE, unit: UNIT, label: LABEL, lessons: LESSONS };
