'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  INTRO TO JAVA, UNIT 4: LOOPS AND COLLECTIONS OF ACTORS.
//
//  Same shape as Units 1 to 3 (see seed/intro-java-unit1.js for the rules the
//  format enforces and why).
//
//  ── THE COLLISION THIS UNIT HAS TO HANDLE CAREFULLY ─────────────────────────
//  Unit 1 taught that act() IS the loop, and told students that a loop inside
//  act() freezes the scenario. This unit then teaches loops. Those two facts
//  look contradictory to a beginner and the unit has to reconcile them
//  explicitly rather than hope nobody notices.
//
//  The reconciliation, repeated in 4.1 and again in 4.7: a loop inside act() is
//  fine as long as it FINISHES. What freezes the scenario is a loop that never
//  ends, because act() must return before Greenfoot can draw the next frame. A
//  loop that runs ten times and stops is not the same animal as while (true).
//
//  ── THE OTHER TRAP ──────────────────────────────────────────────────────────
//  Removing actors while iterating the list you got them from. This throws
//  ConcurrentModificationException, which is a frightening name for a beginner
//  and has a one-line fix. 4.5 teaches the safe shape before the unsafe one has
//  a chance to become habit.
//
//  Zero PII: author content only. No em-dashes, per repo convention. ASCII only.
// ─────────────────────────────────────────────────────────────────────────────

const COURSE = 'intro-java';
const UNIT = 'unit-4';
const LABEL = 'Unit 4: Loops and Collections of Actors';

const SHOT = (lesson, n, alt) => ({ src: `intro-java/${lesson}/step-${n}.png`, alt });

const LESSONS = [
  // ── 4.1 ────────────────────────────────────────────────────────────────────
  {
    lesson: '4.1',
    slug: 'the-while-loop',
    title: 'The while Loop',
    minutes: 30,
    seo: {
      h1: 'The while Loop in Java',
      title: 'Java while Loop and Infinite Loops Explained | Intro to Java',
      description:
        'How a Java while loop works, why a loop inside act is fine if it finishes, and how to '
        + 'avoid the infinite loop that freezes Greenfoot.',
      primary: 'java while loop beginner',
      related: ['java infinite loop greenfoot', 'while loop condition java',
        'greenfoot freezes while loop', 'java loop counter'],
      faq: [
        {
          q: 'What is a while loop in Java?',
          a: 'A block of code that repeats for as long as its condition stays true. The condition '
            + 'is checked before each pass, so a loop can run zero times.',
        },
        {
          q: 'Can I use a loop inside act() in Greenfoot?',
          a: 'Yes, as long as the loop finishes. What freezes the scenario is a loop that never '
            + 'ends, because act must return before the next frame can be drawn.',
        },
        {
          q: 'Why does my while loop never stop?',
          a: 'Something inside the loop has to move the condition toward false. If the counter is '
            + 'never increased, the condition stays true forever.',
        },
      ],
    },

    hook:
      'In Unit 1 you were told a loop inside act() freezes Greenfoot. Now you are going to write '
      + 'loops. Those are not contradictory, and the difference between them is the most important '
      + 'thing in this lesson.',

    objectives: [
      'Write a while loop that runs a known number of times',
      'Explain why a loop inside act() is safe when it finishes',
      'Identify the missing line that turns a loop infinite',
    ],

    vocab: [
      { term: 'Loop', plain: 'Code that repeats.',
        formal: 'A control structure that executes its body repeatedly while a condition holds.' },
      { term: 'Iteration', plain: 'One pass through the loop body.',
        formal: 'A single execution of the loop body.' },
      { term: 'Infinite loop', plain: 'A loop whose condition never becomes false.',
        formal: 'A loop with no path to termination.' },
    ],

    steps: [
      {
        shot: SHOT('4.1', 1, 'A while loop in an editor with the condition and body labeled, and '
          + 'the counter increment highlighted.'),
        code:
          'int count = 0;\n'
          + 'while (count < 5)\n'
          + '{\n'
          + '    addObject(new Coin(), count, 0);\n'
          + '    count = count + 1;\n'
          + '}',
        note:
          'Three parts, and all three are required.\n\n'
          + 'A starting value: `int count = 0;`\n'
          + 'A condition: `count < 5`, checked BEFORE each pass.\n'
          + 'A change: `count = count + 1;`, which moves the condition toward false.\n\n'
          + 'This places five coins, at x values 0, 1, 2, 3 and 4. Note it stops at 4, not 5, '
          + 'because the check happens first and 5 < 5 is false.',
      },
      {
        shot: SHOT('4.1', 2, 'The same loop with the increment line deleted and Greenfoot frozen.'),
        code:
          '// FREEZES. count never changes, so count < 5 is true forever.\n'
          + 'int count = 0;\n'
          + 'while (count < 5)\n'
          + '{\n'
          + '    addObject(new Coin(), count, 0);\n'
          + '}',
        note:
          'Delete one line and the scenario locks up completely.\n\n'
          + 'count starts at 0 and nothing ever changes it, so `count < 5` is true on every check, '
          + 'forever. Greenfoot never regains control and the window stops responding.\n\n'
          + 'When a loop hangs, look for the line that should be moving the condition. It is nearly '
          + 'always missing rather than wrong.',
      },
      {
        shot: SHOT('4.1', 3, 'A diagram contrasting a finishing loop inside act with a forever loop '
          + 'inside act.'),
        code:
          '// FINE. Runs 5 times, then act() returns.\n'
          + 'public void act()\n'
          + '{\n'
          + '    int i = 0;\n'
          + '    while (i < 5)\n'
          + '    {\n'
          + '        i = i + 1;\n'
          + '    }\n'
          + '    move(1);\n'
          + '}',
        note:
          'And here is the reconciliation with Unit 1.\n\n'
          + 'A loop inside act() is completely fine PROVIDED IT FINISHES. This one runs five times, '
          + 'stops, and act() returns normally. Greenfoot draws the next frame and everything is '
          + 'well.\n\n'
          + 'What 1.6 warned about was `while (true)`, which never returns. The problem was never '
          + 'loops. The problem was act() not finishing.',
      },
      {
        shot: SHOT('4.1', 4, 'A loop whose condition is false at the start, with the body never '
          + 'executing.'),
        code:
          'int lives = 0;\n'
          + 'while (lives > 0)\n'
          + '{\n'
          + '    // never runs\n'
          + '    lives = lives - 1;\n'
          + '}',
        note:
          'A while loop can run ZERO times. The condition is checked before the first pass, and if '
          + 'it is already false the body is skipped entirely.\n\n'
          + 'That is usually what you want, and it is worth knowing so a loop that "did nothing" is '
          + 'not automatically assumed broken.',
      },
    ],

    misconceptions: [
      {
        wrong: 'Loops are banned inside act().',
        right: 'A loop that FINISHES is fine. Only a loop that never ends is a problem.',
        why: 'Unit 1 warned about while (true), and students often generalise that into a rule '
          + 'that would make this whole unit impossible.',
      },
      {
        wrong: 'A while loop always runs at least once.',
        right: 'It can run zero times, because the condition is checked first.',
        why: 'Expecting a guaranteed first pass produces bugs that only appear at the boundary.',
      },
      {
        wrong: '`while (count < 5)` runs with count equal to 5 on the last pass.',
        right: 'The last pass has count equal to 4. The check happens before the body.',
        why: 'This off-by-one is the same one that governs arrays in Unit 5.',
      },
      {
        wrong: 'An infinite loop is a syntax mistake Java will catch.',
        right: 'It compiles perfectly. Java has no idea your condition can never become false.',
        why: 'Students wait for an error that will never come while the window is already frozen.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'How many times does this run?\n\nint i = 0;\nwhile (i < 3)\n{\n    i = i + 1;\n}',
        options: ['3', '2', '4', 'Forever'],
        answer: 0,
        why: 'i takes the values 0, 1 and 2 inside the body, which is three passes.',
      },
      {
        id: 'cfu-2',
        stem: 'What is missing here?\n\nint i = 0;\nwhile (i < 3)\n{\n    move(1);\n}',
        options: [
          'A semicolon',
          'A return',
          'Braces',
          'The line that changes i, so the condition can become false',
        ],
        answer: 3,
        why: 'Nothing moves the condition, so it loops forever and the scenario freezes.',
      },
      {
        id: 'cfu-3',
        stem: 'Is a loop inside act() allowed?',
        options: [
          'Never',
          'Only in the world',
          'Yes, as long as it finishes so act() can return',
          'Only if it runs once',
        ],
        answer: 2,
        why: 'act() must return each frame; a finishing loop does not prevent that.',
      },
      {
        id: 'cfu-4',
        stem: 'int n = 0; while (n > 0) { n = n - 1; } How many times does the body run?',
        options: ['0', '1', 'Forever', 'It will not compile'],
        answer: 0,
        why: 'The condition is false before the first pass, so the body is skipped entirely.',
      },
    ],

    gap: {
      intro:
        'Place four walls in a row along the top of the world, at x values 0, 1, 2 and 3. Fill in '
        + 'the three parts every loop needs.',
      code:
        'int i = ___1___;\n'
        + 'while (i ___2___ 4)\n'
        + '{\n'
        + '    addObject(new Wall(), i, 0);\n'
        + '    i = i ___3___ 1;\n'
        + '}',
      holes: [
        { n: 1, hint: 'The first x value you want a wall at.', accept: ['0'] },
        { n: 2, hint: 'Keep going while i has not yet reached 4. One character.', accept: ['<'] },
        { n: 3, hint: 'Move the counter toward the end.', accept: ['+'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'A while loop checks its condition:',
        options: ['Before each pass', 'After each pass', 'Only once at the start', 'Only when it finishes'],
        answer: 0,
        why: 'That is why it can run zero times.',
      },
      {
        id: 'q2',
        stem: 'Which of these freezes Greenfoot?',
        options: [
          'int i = 0; while (i < 10) { i = i + 1; }',
          'int i = 0; while (i < 0) { i = i + 1; }',
          'int i = 10; while (i > 0) { i = i - 1; }',
          'int i = 0; while (i < 10) { move(1); }',
        ],
        answer: 3,
        why: 'Nothing changes i, so the condition never becomes false.',
      },
      {
        id: 'q3',
        stem: 'After `int i = 0; while (i < 4) { i = i + 1; }`, what is i?',
        options: ['3', '5', '4', '0'],
        answer: 2,
        why: 'The loop exits as soon as the condition fails, which is when i reaches 4.',
      },
      {
        id: 'q4',
        stem: 'Why does an infinite loop inside act() lock up the window?',
        options: [
          'act() never returns, so Greenfoot can never draw the next frame',
          'It uses too much memory',
          'Java stops the program',
          'The world is destroyed',
        ],
        answer: 0,
        why: 'Greenfoot regains control only when act() returns.',
      },
    ],

    stuck: ['G-05', 'G-15'],

    recap: [
      'A loop needs a start, a condition, and something that changes the condition.',
      'The condition is checked BEFORE each pass, so a while loop can run zero times.',
      'A loop inside act() is fine as long as it finishes.',
      'An infinite loop compiles perfectly. Java cannot warn you.',
    ],
  },

  // ── 4.2 ────────────────────────────────────────────────────────────────────
  {
    lesson: '4.2',
    slug: 'the-for-loop',
    title: 'The for Loop',
    minutes: 30,
    seo: {
      h1: 'The for Loop in Java',
      title: 'Java for Loop Explained for Beginners | Intro to Java',
      description:
        'How a Java for loop packs the start, condition and update onto one line, and when to '
        + 'prefer it over a while loop. With practice and a quiz.',
      primary: 'java for loop beginner explained',
      related: ['java for loop syntax', 'for vs while loop java',
        'java for loop counting', 'greenfoot for loop spawn'],
      faq: [
        {
          q: 'What are the three parts of a Java for loop?',
          a: 'The start, the condition, and the update, separated by semicolons: '
            + 'for (int i = 0; i < 5; i++). They are the same three parts a while loop needs.',
        },
        {
          q: 'When should I use a for loop instead of a while loop?',
          a: 'Use for when you know how many times to repeat, which is most of the time. Use while '
            + 'when you are waiting for something to become true.',
        },
        {
          q: 'Why does for (int i = 0; i < 5; i++) run 5 times and not 6?',
          a: 'The condition is checked before each pass, so the last pass has i equal to 4. Five '
            + 'passes: 0, 1, 2, 3, 4.',
        },
      ],
    },

    hook:
      'Every counting loop you write needs the same three things, and it is easy to forget the '
      + 'third and freeze your scenario. A for loop puts all three on one line where you cannot '
      + 'lose one.',

    objectives: [
      'Read and write a for loop',
      'Match each part of a for loop to its while equivalent',
      'Choose between for and while for a given job',
    ],

    vocab: [
      { term: 'for loop', plain: 'A counting loop with its three parts on one line.',
        formal: 'A loop whose initialisation, condition and update appear in the loop header.' },
    ],

    steps: [
      {
        shot: SHOT('4.2', 1, 'A for loop header with the three parts separated and labeled.'),
        code: 'for (int i = 0; i < 5; i++)\n{\n    addObject(new Coin(), i, 0);\n}',
        note:
          'The three parts, separated by semicolons, in the same order as always.\n\n'
          + '`int i = 0` is the START, run once before anything else.\n'
          + '`i < 5` is the CONDITION, checked before each pass.\n'
          + '`i++` is the UPDATE, run after each pass. It is the shorthand from 2.2.\n\n'
          + 'Nothing new is happening. It is the while loop from 4.1 with the pieces gathered up.',
      },
      {
        shot: SHOT('4.2', 2, 'A for loop and its equivalent while loop side by side with matching '
          + 'parts connected.'),
        code:
          '// These two do exactly the same thing.\n'
          + 'for (int i = 0; i < 5; i++)\n'
          + '{\n'
          + '    doSomething();\n'
          + '}\n'
          + '\n'
          + 'int i = 0;\n'
          + 'while (i < 5)\n{\n    doSomething();\n    i++;\n}',
        note:
          'Identical behavior. The for version is preferred for counting for one reason: you '
          + 'cannot forget the update, because it is sitting in the header where its absence is '
          + 'obvious.\n\n'
          + 'The while version puts the update at the bottom of the body, where it is easy to omit, '
          + 'and omitting it freezes the scenario.',
      },
      {
        shot: SHOT('4.2', 3, 'A for loop counting downward.'),
        code: 'for (int i = 5; i > 0; i--)\n{\n    addObject(new Star(), i, 2);\n}',
        note:
          'Counting down. The start is 5, the condition is `i > 0`, and the update subtracts.\n\n'
          + 'This runs with i as 5, 4, 3, 2 and 1. It does not run with i as 0, because the check '
          + 'happens first.\n\n'
          + 'You choose all three parts. They are not required to count up from zero, they just '
          + 'usually do.',
      },
      {
        shot: SHOT('4.2', 4, 'A for loop placing a row of actors across the full width of the '
          + 'world.'),
        code:
          'for (int x = 0; x < getWidth(); x++)\n'
          + '{\n'
          + '    addObject(new Wall(), x, 0);\n'
          + '}',
        note:
          'A wall across the entire top edge, whatever size the world is.\n\n'
          + '`x < getWidth()` is the exact pattern from 2.6: valid coordinates run 0 to width minus '
          + 'one, and `<` gives you precisely that. Using `<=` here would place one wall outside '
          + 'the world.\n\n'
          + 'This is the shape you will use constantly from here to the end of the course, so it '
          + 'is worth recognizing instantly.',
      },
    ],

    misconceptions: [
      {
        wrong: 'A for loop is a different kind of repetition from a while loop.',
        right: 'It is the same three parts, gathered onto one line.',
        why: 'Seeing them as unrelated doubles what a student thinks they have to learn.',
      },
      {
        wrong: '`for (int i = 0; i < 5; i++)` runs six times, for 0 through 5.',
        right: 'Five times, for 0 through 4. The check happens before the body.',
        why: 'The single most common off-by-one in programming, and it governs Unit 5 entirely.',
      },
      {
        wrong: 'The parts are separated by commas.',
        right: 'Semicolons. Commas produce a compiler error that does not mention semicolons.',
        why: 'A small syntax detail with a confusing error message.',
      },
      {
        wrong: 'i must be called i and must start at 0.',
        right: 'All three parts are yours to choose. i from 0 is convention, not a rule.',
        why: 'Believing it is a rule makes counting down or starting at 1 seem impossible.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'How many times does `for (int i = 0; i < 4; i++)` run its body?',
        options: ['4', '3', '5', 'Forever'],
        answer: 0,
        why: 'i is 0, 1, 2 and 3 inside the body.',
      },
      {
        id: 'cfu-2',
        stem: 'Which part of `for (int i = 0; i < 5; i++)` runs after each pass?',
        options: ['int i = 0', 'i < 5', 'i++', 'The body'],
        answer: 2,
        why: 'Start, condition, update, and the update happens at the end of each pass.',
      },
      {
        id: 'cfu-3',
        stem: 'What separates the three parts of a for loop header?',
        options: ['Commas', 'Spaces', 'Full stops', 'Semicolons'],
        answer: 3,
        why: 'Semicolons, always.',
      },
      {
        id: 'cfu-4',
        stem: '`for (int i = 3; i > 0; i--)` runs with which values of i?',
        options: ['3, 2, 1', '3, 2, 1, 0', '0, 1, 2, 3', '1, 2, 3'],
        answer: 0,
        why: 'It stops as soon as i is no longer greater than 0.',
      },
      {
        id: 'cfu-5',
        stem: 'Why prefer a for loop over a while loop for counting?',
        options: [
          'It is faster',
          'while loops cannot count',
          'The update is in the header, so you cannot forget it and freeze the scenario',
          'It uses less memory',
        ],
        answer: 2,
        why: 'The missing update is the classic freeze, and a for header makes it visible.',
      },
    ],

    gap: {
      intro:
        'Place a coin in every column across the world, along row 5. Use the pattern that stays '
        + 'correct whatever size the world is.',
      code:
        'for (int x = ___1___; x ___2___ getWidth(); x___3___)\n'
        + '{\n'
        + '    addObject(new Coin(), x, 5);\n'
        + '}',
      holes: [
        { n: 1, hint: 'The first valid column number.', accept: ['0'] },
        { n: 2, hint: 'The last valid x is one less than the width, so which comparison?',
          accept: ['<'] },
        { n: 3, hint: 'The shorthand that adds one.', accept: ['++'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'The three parts of a for loop header are:',
        options: [
          'start, condition, update',
          'condition, start, update',
          'start, update, condition',
          'name, type, value',
        ],
        answer: 0,
        why: 'In that order, separated by semicolons.',
      },
      {
        id: 'q2',
        stem: 'A world is 12 cells wide. Which loop places a wall in every column and none outside?',
        options: [
          'for (int x = 0; x < getWidth(); x++)',
          'for (int x = 0; x <= getWidth(); x++)',
          'for (int x = 1; x < getWidth(); x++)',
          'for (int x = 0; x < 11; x++)',
        ],
        answer: 0,
        why: 'Valid x runs 0 to width minus one, which is what < gives.',
      },
      {
        id: 'q3',
        stem: 'A for loop and the matching while loop:',
        options: [
          'Do different things',
          'Run at different speeds',
          'Cannot be swapped',
          'Do the same thing, with the for putting the three parts on one line',
        ],
        answer: 3,
        why: 'Same three parts, different arrangement.',
      },
      {
        id: 'q4',
        stem: 'What is wrong with `for (int i = 0, i < 5, i++)`?',
        options: [
          'The parts must be separated by semicolons, not commas',
          'i cannot start at 0',
          'It needs braces',
          'Nothing',
        ],
        answer: 0,
        why: 'Commas there are a compiler error.',
      },
    ],

    stuck: ['E-02', 'G-05', 'G-15'],

    recap: [
      'for gathers the start, condition and update onto one line, separated by semicolons.',
      'It is the same repetition a while loop does.',
      '`i < n` runs n times, with i from 0 to n-1.',
      '`x < getWidth()` is the pattern for every column, and never one too many.',
    ],
  },

  // ── 4.3 ────────────────────────────────────────────────────────────────────
  {
    lesson: '4.3',
    slug: 'loop-patterns',
    title: 'Loop Patterns',
    minutes: 30,
    seo: {
      h1: 'Counting and Accumulating with Java Loops',
      title: 'Java Loop Patterns: Counting and Totalling | Intro to Java',
      description:
        'The two loop patterns you will use forever: counting how many match a test, and building '
        + 'a running total. Includes where the variable must be declared.',
      primary: 'java counting loop pattern',
      related: ['java running total loop', 'java accumulator pattern',
        'java count matching items', 'java loop variable scope'],
      faq: [
        {
          q: 'What is an accumulator in a loop?',
          a: 'A variable declared before the loop that builds up a result as the loop runs, such as '
            + 'a running total or a count.',
        },
        {
          q: 'Why must the total be declared outside the loop?',
          a: 'A variable declared inside the loop body is rebuilt on every pass, so it forgets '
            + 'everything from the pass before. It is the same trap as declaring a score in act.',
        },
        {
          q: 'How do I count how many things match a condition?',
          a: 'Start a counter at zero before the loop, and add one inside an if within the loop.',
        },
      ],
    },

    hook:
      'Almost every useful loop is one of two shapes. Learn both here and the rest of the course is '
      + 'variations on them, including everything in Units 5 and 6.',

    objectives: [
      'Write a loop that counts how many things match a test',
      'Write a loop that builds a running total',
      'Explain why the result variable must be declared before the loop',
    ],

    vocab: [
      { term: 'Accumulator', plain: 'A variable that builds up an answer as the loop runs.',
        formal: 'A variable initialised before a loop and updated on each iteration.' },
      { term: 'Counter', plain: 'An accumulator that counts how many.',
        formal: 'An accumulator incremented conditionally.' },
    ],

    steps: [
      {
        shot: SHOT('4.3', 1, 'A counting loop with the counter declared before the loop and '
          + 'incremented inside an if.'),
        code:
          'int coinsHigh = 0;              // BEFORE the loop\n'
          + 'for (int i = 0; i < 10; i++)\n'
          + '{\n'
          + '    if (heights[i] > 5)        // some test\n'
          + '    {\n'
          + '        coinsHigh = coinsHigh + 1;\n'
          + '    }\n'
          + '}',
        note:
          'The counting pattern. Three fixed pieces:\n\n'
          + 'Declare the counter at ZERO, before the loop.\n'
          + 'Inside the loop, test each thing.\n'
          + 'When the test passes, add one.\n\n'
          + 'Do not worry about the square brackets yet, that is Unit 5. Concentrate on where the '
          + 'counter lives.',
      },
      {
        shot: SHOT('4.3', 2, 'The same loop with the counter mistakenly declared inside the loop '
          + 'body, showing a result of 1.'),
        code:
          '// BROKEN. The counter is rebuilt on every pass.\n'
          + 'for (int i = 0; i < 10; i++)\n'
          + '{\n'
          + '    int coinsHigh = 0;\n'
          + '    if (test)\n'
          + '    {\n'
          + '        coinsHigh = coinsHigh + 1;\n'
          + '    }\n'
          + '}',
        note:
          'This is the Unit 3 bug wearing a different hat.\n\n'
          + '`int coinsHigh = 0;` inside the body runs on EVERY pass, so each pass starts from zero '
          + 'and everything counted so far is thrown away. The answer is 1 at best.\n\n'
          + 'Exactly the same shape as a score declared inside act(). If you understood 3.8, you '
          + 'already understand this. If you did not, this is the second chance.',
      },
      {
        shot: SHOT('4.3', 3, 'An accumulating loop building a running total.'),
        code:
          'int total = 0;\n'
          + 'for (int i = 1; i <= 5; i++)\n'
          + '{\n'
          + '    total = total + i;\n'
          + '}\n'
          + '// total is 15',
        note:
          'The accumulating pattern. Same shape, but adding a value rather than adding one.\n\n'
          + 'Trace it: total goes 0, 1, 3, 6, 10, 15. Being able to trace a loop by hand, writing '
          + 'the values down, is the most useful debugging skill in this unit.\n\n'
          + 'Note `i <= 5` here, deliberately, because we genuinely want 5 included. The comparison '
          + 'follows what you want, not a rule.',
      },
      {
        shot: SHOT('4.3', 4, 'A trace table showing the value of the accumulator after each pass.'),
        note:
          'Draw the table. Two columns, i and total, one row per pass.\n\n'
          + 'i=1, total=1. i=2, total=3. i=3, total=6. i=4, total=10. i=5, total=15.\n\n'
          + 'When a loop gives an answer you did not expect, do this before changing anything. Nine '
          + 'times out of ten the table shows you the off-by-one immediately. Tracing on paper is '
          + 'the skill that stays useful in every language you ever pick up.',
      },
    ],

    misconceptions: [
      {
        wrong: 'The counter can be declared inside the loop.',
        right: 'It must be declared BEFORE, or it resets on every pass.',
        why: 'Same failure as a score declared in act(), and it produces the same answer of 1.',
      },
      {
        wrong: 'You should always use `<` and never `<=`.',
        right: 'Use whichever matches what you want included.',
        why: 'Blindly applying `<` breaks a loop that genuinely needs to reach its top value.',
      },
      {
        wrong: 'The accumulator starts at 1 for totals.',
        right: 'It starts at 0 for a sum. Starting at 1 adds an extra 1 to every answer.',
        why: 'A silent off-by-one in every total the program produces.',
      },
      {
        wrong: 'If a loop gives the wrong answer, the logic inside must be wrong.',
        right: 'Trace it first. It is usually the boundary or the placement of the accumulator.',
        why: 'Rewriting working logic while the real bug is in the header wastes a lot of time.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'Where must a running total be declared?',
        options: ['Inside the loop body', 'In the loop header', 'Before the loop', 'After the loop'],
        answer: 2,
        why: 'Declared inside, it is rebuilt every pass and forgets everything.',
      },
      {
        id: 'cfu-2',
        stem: 'int t = 0; for (int i = 1; i <= 3; i++) { t = t + i; } What is t?',
        options: ['6', '3', '4', '0'],
        answer: 0,
        why: '1 plus 2 plus 3.',
      },
      {
        id: 'cfu-3',
        stem: 'A counting loop returns 1 no matter how many items match. What is the likely cause?',
        options: [
          'The counter is declared inside the loop',
          'The condition is wrong',
          'The loop runs once',
          'The items are identical',
        ],
        answer: 0,
        why: 'A counter rebuilt each pass can only ever reach 1.',
      },
      {
        id: 'cfu-4',
        stem: 'To count how many items pass a test, what goes inside the loop?',
        options: [
          'An if, with an add-one inside it',
          'A declaration of the counter',
          'A return',
          'Another loop',
        ],
        answer: 0,
        why: 'Test each item, and increment only when it passes.',
      },
      {
        id: 'cfu-5',
        stem: 'What should a sum accumulator start at?',
        options: ['0', '1', 'The first value', 'It does not matter'],
        answer: 0,
        why: 'Starting at 1 silently adds one to every total.',
      },
    ],

    gap: {
      intro:
        'Count how many of the first ten numbers are even, using the remainder operator from 2.2. '
        + 'Put the counter in the right place.',
      code:
        'int evens = ___1___;\n'
        + 'for (int i = 0; i < 10; i++)\n'
        + '{\n'
        + '    if (i ___2___ 2 == 0)\n'
        + '    {\n'
        + '        evens = evens ___3___ 1;\n'
        + '    }\n'
        + '}',
      holes: [
        { n: 1, hint: 'Nothing has been counted yet.', accept: ['0'] },
        { n: 2, hint: 'The operator that gives the remainder.', accept: ['%'] },
        { n: 3, hint: 'One more each time the test passes.', accept: ['+'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'An accumulator is:',
        options: [
          'A variable declared before a loop that builds up a result',
          'The loop counter',
          'A kind of loop',
          'A method',
        ],
        answer: 0,
        why: 'It accumulates the answer across iterations.',
      },
      {
        id: 'q2',
        stem: 'int t = 0; for (int i = 0; i < 4; i++) { t = t + 2; } What is t?',
        options: ['2', '6', '8', '4'],
        answer: 2,
        why: 'Four passes, adding 2 each time.',
      },
      {
        id: 'q3',
        stem: 'When a loop gives an unexpected answer, the first thing to do is:',
        options: [
          'Rewrite the body',
          'Change < to <=',
          'Add another loop',
          'Trace it by hand, writing down the variables after each pass',
        ],
        answer: 3,
        why: 'A trace table usually shows the boundary error immediately.',
      },
      {
        id: 'q4',
        stem: 'Which loop includes the value 5?',
        options: [
          'for (int i = 0; i < 5; i++)',
          'for (int i = 1; i < 5; i++)',
          'for (int i = 0; i <= 5; i++)',
          'Neither can',
        ],
        answer: 2,
        why: '<= includes the top value; < stops one short.',
      },
    ],

    stuck: ['G-12', 'G-15'],

    recap: [
      'Declare the counter or total BEFORE the loop, or it resets every pass.',
      'Counting: an if inside the loop, adding one when it passes.',
      'Totalling: add the value each pass, starting from 0.',
      'Trace by hand before changing anything.',
    ],
  },

  // ── 4.4 ────────────────────────────────────────────────────────────────────
  {
    lesson: '4.4',
    slug: 'touching-another-actor',
    title: 'Touching Another Actor',
    minutes: 25,
    seo: {
      h1: 'Detecting Collisions Between Greenfoot Actors',
      title: 'Greenfoot isTouching and removeTouching Explained | Intro to Java',
      description:
        'How to detect and handle collisions in Greenfoot with isTouching, removeTouching and '
        + 'getOneIntersectingObject, and what .class means.',
      primary: 'greenfoot istouching removetouching',
      related: ['greenfoot collision detection', 'greenfoot getOneIntersectingObject',
        'greenfoot .class parameter', 'greenfoot remove actor on touch'],
      faq: [
        {
          q: 'How do I detect a collision in Greenfoot?',
          a: 'Call isTouching with the class you care about, for example '
            + 'isTouching(Coin.class), inside act.',
        },
        {
          q: 'What does .class mean in Greenfoot?',
          a: 'It names the class itself rather than one object. isTouching(Coin.class) asks whether '
            + 'you are touching ANY coin, not a specific one.',
        },
        {
          q: 'What is the difference between isTouching and getOneIntersectingObject?',
          a: 'isTouching answers yes or no. getOneIntersectingObject hands back the actual actor, '
            + 'or null if there is nothing there.',
        },
      ],
    },

    hook:
      'A game where nothing can hit anything else is a screensaver. Collision is one method call, '
      + 'and one piece of syntax that looks strange the first time you meet it.',

    objectives: [
      'Detect a collision with isTouching',
      'Explain what .class means and why it is needed',
      'Choose between isTouching and getOneIntersectingObject',
    ],

    vocab: [
      { term: '.class', plain: 'The class itself, rather than one object of it.',
        formal: 'A class literal, used to tell a method which type to look for.' },
      { term: 'null', plain: 'Nothing there.',
        formal: 'A reference that points at no object.' },
    ],

    steps: [
      {
        shot: SHOT('4.4', 1, 'A player actor overlapping a coin, with the collision detected.'),
        code:
          'if (isTouching(Coin.class))\n'
          + '{\n'
          + '    removeTouching(Coin.class);\n'
          + '    score = score + 1;\n'
          + '}',
        note:
          'The whole coin-collecting mechanic, in four lines.\n\n'
          + '`isTouching(Coin.class)` hands back true or false, so it drops straight into an if, '
          + 'exactly like isKeyDown did.\n\n'
          + '`removeTouching(Coin.class)` takes the coin you are overlapping out of the world.',
      },
      {
        shot: SHOT('4.4', 2, 'The class diagram with Coin highlighted, next to a coin object in the '
          + 'world, illustrating the difference.'),
        code:
          'Coin.class     // the CLASS, the plan\n'
          + 'new Coin()     // an OBJECT, one actual coin',
        note:
          '`.class` is the strange-looking bit, and it is 1.3 coming back.\n\n'
          + 'You are not asking "am I touching that specific coin". You are asking "am I touching '
          + 'ANY coin", so you have to name the CLASS rather than an object.\n\n'
          + 'Forgetting `.class` and writing `isTouching(Coin)` is a compiler error, and the '
          + 'message will not tell you to add .class.',
      },
      {
        shot: SHOT('4.4', 3, 'getOneIntersectingObject returning an actor, stored in a variable.'),
        code:
          'Actor coin = getOneIntersectingObject(Coin.class);\n'
          + 'if (coin != null)\n'
          + '{\n'
          + '    getWorld().removeObject(coin);\n'
          + '}',
        note:
          'When you need the actual actor rather than just a yes or no, this hands it back.\n\n'
          + 'And when there is nothing there it hands back `null`, which means "nothing". You have '
          + 'to check for that before using it, which is the `!= null` line.\n\n'
          + 'Skip that check and you get the NullPointerException from E-07, because you asked '
          + 'nothing to do something.',
      },
    ],

    misconceptions: [
      {
        wrong: 'isTouching(Coin) works without .class.',
        right: '.class is required, and its absence is a compiler error.',
        why: 'The error message talks about types and never suggests adding .class.',
      },
      {
        wrong: 'getOneIntersectingObject always returns an actor.',
        right: 'It returns null when there is nothing there.',
        why: 'Using the result without checking is the most common NullPointerException in a game.',
      },
      {
        wrong: 'removeTouching removes the actor calling it.',
        right: 'It removes what you are touching. You survive.',
        why: 'Getting this backwards makes the player vanish on the first coin.',
      },
      {
        wrong: 'Collision only counts when the images overlap exactly.',
        right: 'Greenfoot uses the image bounds, so a near miss can register as a touch.',
        why: 'Explains "it collided when it clearly missed", which otherwise looks like a bug.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'What does `isTouching(Coin.class)` hand back?',
        options: ['true or false', 'A coin', 'The number of coins', 'null'],
        answer: 0,
        why: 'It is a yes or no question, so it fits straight into an if.',
      },
      {
        id: 'cfu-2',
        stem: 'Why is `.class` needed?',
        options: [
          'Java syntax requires a dot',
          'It is optional',
          'It makes it faster',
          'Because you are naming the class, not one specific object',
        ],
        answer: 3,
        why: 'You are asking about any coin, so you name the plan rather than a particular one.',
      },
      {
        id: 'cfu-3',
        stem: 'getOneIntersectingObject finds nothing. What does it return?',
        options: ['0', 'false', 'null', 'An empty actor'],
        answer: 2,
        why: 'null means nothing there, and must be checked before use.',
      },
      {
        id: 'cfu-4',
        stem: 'Inside Player, what does `removeTouching(Coin.class)` remove?',
        options: ['The player', 'All coins in the world', 'The coin being touched', 'Nothing'],
        answer: 2,
        why: 'It removes what you are overlapping, not the caller.',
      },
    ],

    gap: {
      intro:
        'When the player touches a spike, remove the spike and lose a life. Fill in the collision '
        + 'checks.',
      code:
        'if (___1___(Spike___2___))\n'
        + '{\n'
        + '    removeTouching(Spike.class);\n'
        + '    lives = lives - 1;\n'
        + '}',
      holes: [
        { n: 1, hint: 'The method that reports whether you are overlapping something.',
          accept: ['isTouching'] },
        { n: 2, hint: 'The suffix that names the class rather than one object. Include the dot.',
          accept: ['.class'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'Which is used when you only need to know whether a collision happened?',
        options: ['isTouching', 'getOneIntersectingObject', 'getObjects', 'addObject'],
        answer: 0,
        why: 'It answers yes or no, which is all an if needs.',
      },
      {
        id: 'q2',
        stem: 'Why must you check for null after getOneIntersectingObject?',
        options: [
          'To make it faster',
          'You do not have to',
          'Java requires a check after every call',
          'Because it returns null when there is nothing there, and using null throws',
        ],
        answer: 3,
        why: 'Asking nothing to do something is a NullPointerException.',
      },
      {
        id: 'q3',
        stem: '`isTouching(Coin)` without .class:',
        options: ['Works the same', 'Checks only the first coin', 'Is a compiler error', 'Returns null'],
        answer: 2,
        why: 'The class literal is required.',
      },
      {
        id: 'q4',
        stem: 'An actor seems to collide slightly before the images visually touch. Why?',
        options: [
          'Greenfoot uses the image bounds, which include transparent edges',
          'The scenario is broken',
          'The world is too small',
          'The frame rate is too high',
        ],
        answer: 0,
        why: 'Bounding boxes include transparent padding around the visible art.',
      },
    ],

    stuck: ['E-01', 'E-07', 'G-16'],

    recap: [
      'isTouching(Thing.class) answers yes or no and drops into an if.',
      'removeTouching(Thing.class) removes what you are touching, not you.',
      '.class names the class rather than one object, and is required.',
      'getOneIntersectingObject hands back the actor, or null. Always check for null.',
    ],
  },

  // ── 4.5 ────────────────────────────────────────────────────────────────────
  {
    lesson: '4.5',
    slug: 'lists-of-actors',
    title: 'Lists of Actors',
    minutes: 30,
    seo: {
      h1: 'Getting a List of Actors in Greenfoot',
      title: 'Greenfoot getObjects and Lists of Actors | Intro to Java',
      description:
        'How to get every actor of a kind with getObjects, how to count them, and how to remove '
        + 'actors safely without a ConcurrentModificationException.',
      primary: 'greenfoot getobjects list',
      related: ['greenfoot count actors', 'java ConcurrentModificationException greenfoot',
        'greenfoot List Actor', 'greenfoot remove while looping'],
      faq: [
        {
          q: 'How do I get all the actors of one type in Greenfoot?',
          a: 'Call getObjects with the class, for example getObjects(Enemy.class), from the world. '
            + 'It hands back a List you can count or loop over.',
        },
        {
          q: 'How do I count how many enemies are left in Greenfoot?',
          a: 'getObjects(Enemy.class).size() gives the number currently in the world.',
        },
        {
          q: 'What causes ConcurrentModificationException in Greenfoot?',
          a: 'Removing actors from the world while looping over the list you got from it. Copy the '
            + 'list first, or collect what to remove and remove it afterward.',
        },
      ],
    },

    hook:
      'So far you have dealt with actors one at a time. A wave of twenty enemies needs a way to ask '
      + '"how many are left" and "do this to all of them", and there is one trap in doing so that '
      + 'throws an exception with a genuinely frightening name.',

    objectives: [
      'Get a list of every actor of a kind',
      'Count how many are in the world',
      'Remove actors from a list safely',
    ],

    vocab: [
      { term: 'List', plain: 'A numbered collection of things that knows how big it is.',
        formal: 'java.util.List, an ordered collection with a size.' },
      { term: 'size()', plain: 'How many are in it.',
        formal: 'The number of elements currently in the list.' },
    ],

    steps: [
      {
        shot: SHOT('4.5', 1, 'A world containing several enemies with a count displayed.'),
        code:
          'List<Enemy> enemies = getObjects(Enemy.class);\n'
          + 'int howMany = enemies.size();',
        note:
          '`getObjects(Enemy.class)` hands back every Enemy currently in the world.\n\n'
          + '`List<Enemy>` is the type. Read the angle parentheses as "of": a List of Enemy. It is new '
          + 'punctuation but not a new idea.\n\n'
          + '`.size()` tells you how many. Note the parentheses: it is a method, not a field, unlike '
          + 'the array length you meet in Unit 5. That inconsistency is Java\'s fault, not yours, '
          + 'and it catches everybody.',
      },
      {
        shot: SHOT('4.5', 2, 'A wave-complete check triggered when the enemy list is empty.'),
        code:
          'if (getObjects(Enemy.class).size() == 0)\n'
          + '{\n'
          + '    startNextWave();\n'
          + '}',
        note:
          'A real use, and it goes in the WORLD\'s act() method. Yes, the world has one too, and it '
          + 'runs every frame just like an actor\'s.\n\n'
          + 'This is the natural home for anything about the game as a whole: how many enemies are '
          + 'left, whether the level is finished, what the score is.',
      },
      {
        shot: SHOT('4.5', 3, 'A loop over a list using an index.'),
        code:
          'List<Enemy> enemies = getObjects(Enemy.class);\n'
          + 'for (int i = 0; i < enemies.size(); i++)\n'
          + '{\n'
          + '    Enemy e = enemies.get(i);\n'
          + '    e.turn(180);\n'
          + '}',
        note:
          'Looping over a list with the counting loop from 4.2.\n\n'
          + '`enemies.get(i)` fetches the one at position i. Positions start at 0 and the last is '
          + 'size() minus 1, which is why `i < enemies.size()` is exactly right.\n\n'
          + 'The next lesson shows a shorter way when you do not need the index.',
      },
      {
        shot: SHOT('4.5', 4, 'A ConcurrentModificationException stack trace next to the corrected '
          + 'copy-first version.'),
        code:
          '// THROWS ConcurrentModificationException\n'
          + 'for (Enemy e : getObjects(Enemy.class))\n'
          + '{\n'
          + '    removeObject(e);\n'
          + '}\n'
          + '\n'
          + '// SAFE: remove them all at once instead\n'
          + 'removeObjects(getObjects(Enemy.class));',
        note:
          'Here is the trap, and it is worth meeting before you write it by accident.\n\n'
          + 'Removing actors from the world while looping over the list you got FROM the world is '
          + 'like tearing pages out of a book while reading it. Java notices and throws '
          + 'ConcurrentModificationException.\n\n'
          + 'The name is alarming and the fix is one line. `removeObjects(...)` takes the whole list '
          + 'and clears it in one go. When you need finer control, collect what you want to remove '
          + 'into a separate list first, then remove them after the loop has finished.',
      },
    ],

    misconceptions: [
      {
        wrong: 'size is a field, like length.',
        right: 'It is a method: `size()` with parentheses.',
        why: 'Java is genuinely inconsistent here, and Unit 5 uses `length` with no parentheses.',
      },
      {
        wrong: 'getObjects returns actors that have been removed.',
        right: 'It returns what is in the world RIGHT NOW.',
        why: 'The list is a snapshot, which is exactly why modifying during iteration is unsafe.',
      },
      {
        wrong: 'ConcurrentModificationException means the code is badly broken.',
        right: 'It means you changed a collection while looping over it. One-line fix.',
        why: 'The name frightens beginners into rewriting far more than they need to.',
      },
      {
        wrong: 'Only actors can have an act() method.',
        right: 'The world has one too, and it runs every frame.',
        why: 'Without knowing this, game-wide logic gets crammed into an actor where it does not '
          + 'belong.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'What does `getObjects(Coin.class)` return?',
        options: [
          'A list of every coin currently in the world',
          'One coin',
          'The number of coins',
          'true or false',
        ],
        answer: 0,
        why: 'A List of all of them, from which you can get a count or loop.',
      },
      {
        id: 'cfu-2',
        stem: 'How do you find out how many enemies are in the world?',
        options: [
          'getObjects(Enemy.class).length',
          'getObjects(Enemy.class).count',
          'countObjects(Enemy.class)',
          'getObjects(Enemy.class).size()',
        ],
        answer: 3,
        why: 'size() is a method, with parentheses.',
      },
      {
        id: 'cfu-3',
        stem: 'A list has 4 items. What is the last valid index?',
        options: ['4', '5', '3', '0'],
        answer: 2,
        why: 'Indexes start at 0, so four items are 0 to 3.',
      },
      {
        id: 'cfu-4',
        stem: 'What causes ConcurrentModificationException here?',
        options: [
          'Removing actors from the world while looping over the list taken from it',
          'The list being empty',
          'Using a for loop',
          'Calling size()',
        ],
        answer: 0,
        why: 'Changing a collection during iteration over it.',
      },
      {
        id: 'cfu-5',
        stem: 'Where does game-wide logic like "are all enemies dead" belong?',
        options: [
          'In the world act() method',
          'In the player act() method',
          'In the constructor',
          'In prepare()',
        ],
        answer: 0,
        why: 'The world owns what is true of the game as a whole, and its act runs every frame.',
      },
    ],

    gap: {
      intro:
        'In the world act() method, start the next wave when no enemies are left.',
      code:
        'public void act()\n'
        + '{\n'
        + '    if (getObjects(Enemy.class).___1___() ___2___ 0)\n'
        + '    {\n'
        + '        startNextWave();\n'
        + '    }\n'
        + '}',
      holes: [
        { n: 1, hint: 'The method that reports how many are in a list.', accept: ['size'] },
        { n: 2, hint: 'Test for equality, which needs two characters.', accept: ['=='] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: '`List<Enemy>` is read as:',
        options: ['A List of Enemy', 'Enemy list index', 'A list called Enemy', 'An enemy array'],
        answer: 0,
        why: 'The angle parentheses say what kind of thing is in the list.',
      },
      {
        id: 'q2',
        stem: 'How do you safely remove every enemy?',
        options: [
          'Loop over getObjects and removeObject each one',
          'Call size() then remove',
          'Set the list to null',
          'removeObjects(getObjects(Enemy.class))',
        ],
        answer: 3,
        why: 'Removing during iteration throws; removing the whole list at once does not.',
      },
      {
        id: 'q3',
        stem: 'getObjects returns:',
        options: [
          'Everything ever created',
          'Only actors that have moved',
          'What is in the world at that moment',
          'The class names',
        ],
        answer: 2,
        why: 'It is a snapshot of the current contents.',
      },
      {
        id: 'q4',
        stem: 'Why does the world have an act() method?',
        options: [
          'So the game as a whole can do something every frame, like checking whether a wave is over',
          'It does not',
          'To draw the background',
          'To create actors once',
        ],
        answer: 0,
        why: 'It is where game-wide per-frame logic belongs.',
      },
    ],

    stuck: ['E-07', 'G-17'],

    recap: [
      'getObjects(Thing.class) hands back a List of everything of that kind in the world.',
      'size() is a METHOD with parentheses. Indexes run 0 to size() minus 1.',
      'The world has an act() too, and game-wide logic belongs there.',
      'Never remove from the world while looping over its list. Use removeObjects, or collect first.',
    ],
  },

  // ── 4.6 ────────────────────────────────────────────────────────────────────
  {
    lesson: '4.6',
    slug: 'the-enhanced-for-loop',
    title: 'The Enhanced for Loop',
    minutes: 25,
    seo: {
      h1: 'The Enhanced for Loop in Java',
      title: 'Java Enhanced for Loop (for each) Explained | Intro to Java',
      description:
        'How the Java enhanced for loop works, when to use it instead of an index loop, and the '
        + 'two jobs it cannot do.',
      primary: 'java enhanced for loop beginner',
      related: ['java for each loop', 'enhanced for vs index for java',
        'greenfoot loop over actors', 'java for each cannot modify'],
      faq: [
        {
          q: 'What is the enhanced for loop in Java?',
          a: 'A loop that visits every item in a collection without you managing an index. Read '
            + 'for (Enemy e : enemies) as "for each enemy e in enemies".',
        },
        {
          q: 'When should I not use an enhanced for loop?',
          a: 'When you need the position of each item, and when you need to remove items while '
            + 'looping. Use an index loop or collect and remove afterward.',
        },
        {
          q: 'Is the enhanced for loop faster?',
          a: 'No. It is shorter and removes the chance of an off-by-one error, which is the real '
            + 'benefit.',
        },
      ],
    },

    hook:
      'Half the loops you write only want to visit everything once and do not care where anything '
      + 'sits. For those, there is a shorter form that removes the whole class of off-by-one '
      + 'mistakes by removing the index entirely.',

    objectives: [
      'Write an enhanced for loop over a list',
      'Choose between an enhanced for and an index loop',
      'Name the two situations where the enhanced for cannot be used',
    ],

    vocab: [
      { term: 'Enhanced for', plain: 'For each thing in this collection, do something.',
        formal: 'A loop over an Iterable that binds each element to a variable in turn.' },
    ],

    steps: [
      {
        shot: SHOT('4.6', 1, 'An enhanced for loop with its parts labeled: the type, the variable '
          + 'name, the colon, and the collection.'),
        code:
          'for (Enemy e : getObjects(Enemy.class))\n'
          + '{\n'
          + '    e.turn(180);\n'
          + '}',
        note:
          'Read the colon as "in": for each Enemy e in this collection.\n\n'
          + '`Enemy` is the type of thing coming out.\n'
          + '`e` is the name you give each one as it comes.\n'
          + '`:` is "in".\n'
          + 'After it is the collection.\n\n'
          + 'No counter, no condition, no update. There is no index to get wrong.',
      },
      {
        shot: SHOT('4.6', 2, 'The enhanced for and the index loop side by side, doing the same job.'),
        code:
          '// Enhanced for\n'
          + 'for (Enemy e : enemies)\n'
          + '{\n'
          + '    e.turn(180);\n'
          + '}\n'
          + '\n'
          + '// Index loop, same result\n'
          + 'for (int i = 0; i < enemies.size(); i++)\n'
          + '{\n'
          + '    enemies.get(i).turn(180);\n'
          + '}',
        note:
          'Same job. The enhanced version is shorter and, more importantly, cannot go off the end, '
          + 'because there is no end to get wrong.\n\n'
          + 'When you do not need to know WHERE something is, prefer it.',
      },
      {
        shot: SHOT('4.6', 3, 'A situation requiring the index, with the position used in the loop '
          + 'body.'),
        code:
          '// Needs the index, so an enhanced for cannot do it.\n'
          + 'for (int i = 0; i < enemies.size(); i++)\n'
          + '{\n'
          + '    enemies.get(i).setLocation(i * 2, 0);\n'
          + '}',
        note:
          'And here is when you cannot use it. This spaces the enemies out using their POSITION in '
          + 'the list, so the index is part of the job.\n\n'
          + 'An enhanced for hands you the item and nothing else. No item knows where it sits.\n\n'
          + 'The other case is removal: you still cannot remove from a collection while looping '
          + 'over it, and the enhanced form does not change that.',
      },
    ],

    misconceptions: [
      {
        wrong: 'The enhanced for is faster.',
        right: 'It is shorter and safer to write. Speed is not the point.',
        why: 'Choosing on imagined performance rather than on whether you need the index.',
      },
      {
        wrong: 'You can find out the index inside an enhanced for.',
        right: 'You cannot. If you need it, use an index loop.',
        why: 'Students add a manual counter, which works but throws away the reason to use it.',
      },
      {
        wrong: 'An enhanced for makes removal safe.',
        right: 'It does not. Removing during iteration still throws.',
        why: 'A very tempting wrong conclusion, since the loop looks so much simpler.',
      },
      {
        wrong: 'The colon means "to", as in a range.',
        right: 'It means "in". For each e IN this collection.',
        why: 'Reading it as a range makes the whole line incomprehensible.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'How is `for (Coin c : coins)` read aloud?',
        options: ['For coin c to coins', 'While c is a coin', 'For coins from c', 'For each Coin c in coins'],
        answer: 3,
        why: 'The colon means "in".',
      },
      {
        id: 'cfu-2',
        stem: 'Which job CANNOT be done with an enhanced for?',
        options: [
          'Turning every enemy around',
          'Placing each enemy according to its position in the list',
          'Counting how many are red',
          'Calling a method on each one',
        ],
        answer: 1,
        why: 'That needs the index, which an enhanced for does not provide.',
      },
      {
        id: 'cfu-3',
        stem: 'What is the main advantage of the enhanced for?',
        options: [
          'It runs faster',
          'There is no index, so there is no off-by-one to get wrong',
          'It can remove items safely',
          'It works on numbers only',
        ],
        answer: 1,
        why: 'Removing the index removes a whole class of mistakes.',
      },
      {
        id: 'cfu-4',
        stem: 'Can you remove actors from the world inside an enhanced for over its list?',
        options: [
          'Yes, that is what it is for',
          'No, it still throws ConcurrentModificationException',
          'Only for the first one',
          'Only in the world',
        ],
        answer: 1,
        why: 'The rule about modifying during iteration is unchanged.',
      },
    ],

    gap: {
      intro:
        'Turn every coin in the world through a quarter circle, using the shorter loop form.',
      code:
        'for (Coin c ___1___ getObjects(Coin.class))\n'
        + '{\n'
        + '    ___2___.turn(90);\n'
        + '}',
      holes: [
        { n: 1, hint: 'The single character that means "in".', accept: [':'] },
        { n: 2, hint: 'The name given to each coin as it comes out of the collection.',
          accept: ['c'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'In `for (Enemy e : enemies)`, what is e?',
        options: [
          'The index',
          'Each enemy in turn',
          'The number of enemies',
          'The list',
        ],
        answer: 1,
        why: 'It is bound to each element in turn.',
      },
      {
        id: 'q2',
        stem: 'You need to know whether an item is the first in the list. Which loop?',
        options: [
          'An enhanced for',
          'An index loop, because you need the position',
          'A while loop with no counter',
          'Either works',
        ],
        answer: 1,
        why: 'Position information requires an index.',
      },
      {
        id: 'q3',
        stem: 'The enhanced for is preferred when:',
        options: [
          'You need the position of each item',
          'You just want to visit every item once',
          'You want to remove items',
          'The list is empty',
        ],
        answer: 1,
        why: 'Simple traversal is exactly its job.',
      },
      {
        id: 'q4',
        stem: 'Compared with an index loop, the enhanced for is:',
        options: [
          'Faster at runtime',
          'Shorter, and impossible to get an off-by-one wrong in',
          'Able to modify collections safely',
          'Only usable on arrays',
        ],
        answer: 1,
        why: 'Safety and brevity, not speed.',
      },
    ],

    stuck: ['G-17', 'E-07'],

    recap: [
      'Read the colon as "in": for each Enemy e in enemies.',
      'No index means no off-by-one.',
      'Use an index loop when the position is part of the job.',
      'It does NOT make removal during iteration safe.',
    ],
  },

  // ── 4.7 ────────────────────────────────────────────────────────────────────
  {
    lesson: '4.7',
    slug: 'spawning-with-loops',
    title: 'Spawning with Loops',
    minutes: 30,
    seo: {
      h1: 'Spawning Waves of Actors with Loops in Greenfoot',
      title: 'Greenfoot Spawn a Wave of Enemies with a Loop | Intro to Java',
      description:
        'How to spawn a whole wave of Greenfoot actors with one loop, why the loop belongs in a '
        + 'method and not in act, and how to space them evenly.',
      primary: 'greenfoot spawn wave of enemies',
      related: ['greenfoot addObject loop', 'greenfoot spawn row of actors',
        'greenfoot wave spawning code', 'greenfoot loop in act freeze'],
      faq: [
        {
          q: 'How do I spawn several enemies at once in Greenfoot?',
          a: 'Put addObject inside a for loop, and call that loop from a method such as '
            + 'startWave rather than from act.',
        },
        {
          q: 'Why should the spawn loop not go in act()?',
          a: 'act runs every frame, so a loop that spawns five enemies there spawns hundreds a '
            + 'second. Call it once from prepare or when a wave begins.',
        },
        {
          q: 'How do I space enemies out evenly in Greenfoot?',
          a: 'Multiply the loop counter by a spacing value when setting x, for example i times 3.',
        },
      ],
    },

    hook:
      'Placing twenty enemies by hand is twenty lines you have to edit every time you change your '
      + 'mind. One loop does it, scales to any number, and this lesson is where every idea in the '
      + 'unit comes together.',

    objectives: [
      'Spawn a row of actors with a single loop',
      'Space them out using the loop counter',
      'Explain why the spawn loop must not live in act()',
    ],

    vocab: [
      { term: 'Wave', plain: 'A group of enemies spawned together.',
        formal: 'A batch of actors created in one call.' },
    ],

    steps: [
      {
        shot: SHOT('4.7', 1, 'A row of five enemies spawned across the top of the world.'),
        code:
          'public void startWave()\n'
          + '{\n'
          + '    for (int i = 0; i < 5; i++)\n'
          + '    {\n'
          + '        addObject(new Enemy(2), i, 0);\n'
          + '    }\n'
          + '}',
        note:
          'Five enemies, one loop. Everything here you already have: the for loop from 4.2, '
          + 'addObject from 3.7, and the Enemy constructor from 3.9.\n\n'
          + 'They land at x values 0, 1, 2, 3 and 4, all bunched at the left, which the next step '
          + 'fixes.',
      },
      {
        shot: SHOT('4.7', 2, 'The same five enemies spaced evenly across the world.'),
        code:
          'for (int i = 0; i < 5; i++)\n'
          + '{\n'
          + '    addObject(new Enemy(2), i * 3, 0);\n'
          + '}',
        note:
          'One change: `i * 3` instead of `i`. Now they sit at 0, 3, 6, 9 and 12.\n\n'
          + 'Using the counter in a CALCULATION rather than directly is the single most useful loop '
          + 'trick in this course, and it is the whole basis of tile maps in Unit 6.',
      },
      {
        shot: SHOT('4.7', 3, 'A world flooded with hundreds of enemies after the spawn loop was put '
          + 'in act.'),
        code:
          '// DISASTER. act() runs every frame.\n'
          + 'public void act()\n'
          + '{\n'
          + '    for (int i = 0; i < 5; i++)\n'
          + '    {\n'
          + '        addObject(new Enemy(2), i * 3, 0);\n'
          + '    }\n'
          + '}',
        note:
          'This does not freeze. The loop finishes perfectly every time, so 4.1\'s rule is not '
          + 'broken.\n\n'
          + 'It spawns five enemies EVERY FRAME. Within a second there are hundreds, and the '
          + 'scenario grinds to a halt for a completely different reason: not an infinite loop, but '
          + 'a finite loop run infinitely often.\n\n'
          + 'Spawn loops belong in a method you call ONCE, from prepare() or when a wave begins.',
      },
      {
        shot: SHOT('4.7', 4, 'A new wave beginning automatically when the previous one is cleared.'),
        code:
          'public void act()\n'
          + '{\n'
          + '    if (getObjects(Enemy.class).size() == 0)\n'
          + '    {\n'
          + '        waveNumber = waveNumber + 1;\n'
          + '        startWave();\n'
          + '    }\n'
          + '}',
        note:
          'And the whole unit assembled into a working game loop.\n\n'
          + 'Every frame, the world checks whether the list of enemies is empty (4.5). When it is, '
          + 'the wave counter goes up (3.8, an instance variable) and the spawn method is called '
          + '(4.7).\n\n'
          + 'The loop is still called once per wave, not once per frame, because the if guards it. '
          + 'That is the difference between this and the previous step.',
      },
    ],

    misconceptions: [
      {
        wrong: 'A spawn loop in act() is fine because the loop finishes.',
        right: 'It finishes, and then runs again next frame. Five per frame is hundreds a second.',
        why: 'The Unit 1 rule was about freezing; this is a different failure with the same symptom '
          + 'of an unusable scenario.',
      },
      {
        wrong: 'You must place actors one at a time to control where they go.',
        right: 'A calculation on the counter gives you full control.',
        why: 'This is the idea Unit 6 is built on, so it matters more than it looks.',
      },
      {
        wrong: 'Spawning more enemies means writing more addObject lines.',
        right: 'Change one number in the loop condition.',
        why: 'The entire argument for loops, made concrete.',
      },
      {
        wrong: 'The wave check belongs in an enemy.',
        right: 'It belongs in the world, which is what knows about the game as a whole.',
        why: 'An enemy checking whether all enemies are gone has to survive its own death to do it.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'Where does `addObject` go to spawn a row of five?',
        options: ['Before the loop', 'Inside the loop body', 'After the loop', 'In the constructor '
          + 'only'],
        answer: 1,
        why: 'It runs once per pass, so five passes place five actors.',
      },
      {
        id: 'cfu-2',
        stem: 'What does `i * 4` do as the x coordinate?',
        options: [
          'Places them all at 4',
          'Spaces them 4 cells apart',
          'Creates 4 actors',
          'Moves them 4 cells',
        ],
        answer: 1,
        why: 'i goes 0, 1, 2 and the multiplication turns that into 0, 4, 8.',
      },
      {
        id: 'cfu-3',
        stem: 'Why is a spawn loop in act() a problem, if the loop finishes?',
        options: [
          'It freezes the scenario',
          'It runs again every frame, so it spawns hundreds a second',
          'It does not compile',
          'It only spawns one',
        ],
        answer: 1,
        why: 'A finite loop run every frame is still unlimited spawning.',
      },
      {
        id: 'cfu-4',
        stem: 'How would you change a wave from 5 enemies to 12?',
        options: [
          'Add seven more addObject lines',
          'Change the 5 in the loop condition to 12',
          'Call startWave twice',
          'Make the world bigger',
        ],
        answer: 1,
        why: 'One number, which is the whole point of the loop.',
      },
      {
        id: 'cfu-5',
        stem: 'Where should the check for "all enemies defeated" live?',
        options: [
          'In the world act()',
          'In each enemy act()',
          'In the enemy constructor',
          'In prepare()',
        ],
        answer: 0,
        why: 'The world knows about the game as a whole and keeps running when enemies do not.',
      },
    ],

    gap: {
      intro:
        'Spawn a wave of eight enemies along the top, spaced two cells apart. This method is called '
        + 'once when a wave begins, not from act().',
      code:
        'public void startWave()\n'
        + '{\n'
        + '    for (int i = 0; i < ___1___; i++)\n'
        + '    {\n'
        + '        addObject(new Enemy(2), i ___2___ 2, ___3___);\n'
        + '    }\n'
        + '}',
      holes: [
        { n: 1, hint: 'How many enemies in the wave?', accept: ['8'] },
        { n: 2, hint: 'Turn 0, 1, 2 into 0, 2, 4. Which operator?', accept: ['*'] },
        { n: 3, hint: 'The top row of the world.', accept: ['0'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'A loop spawning 5 enemies is placed in the world act(). What happens?',
        options: [
          'Five enemies appear',
          'Hundreds appear within a second',
          'The scenario freezes immediately',
          'Nothing appears',
        ],
        answer: 1,
        why: 'Five per frame, at many frames a second.',
      },
      {
        id: 'q2',
        stem: 'Which places actors at x values 0, 5, 10 and 15?',
        options: [
          'for (int i = 0; i < 4; i++) addObject(new E(), i, 0);',
          'for (int i = 0; i < 4; i++) addObject(new E(), i * 5, 0);',
          'for (int i = 0; i < 15; i += 5) addObject(new E(), i, 0);',
          'for (int i = 5; i < 20; i++) addObject(new E(), i, 0);',
        ],
        answer: 1,
        why: 'Four passes, each multiplied by the spacing.',
      },
      {
        id: 'q3',
        stem: 'A spawn method should be called from:',
        options: [
          'act(), every frame',
          'prepare(), or a guarded check such as when a wave is cleared',
          'The enemy constructor',
          'Nowhere',
        ],
        answer: 1,
        why: 'It must run once per wave, not once per frame.',
      },
      {
        id: 'q4',
        stem: 'Using the loop counter in a calculation matters because:',
        options: [
          'It is required by Java',
          'It is how you control placement, and it is the basis of tile maps later',
          'It makes the loop faster',
          'It avoids an infinite loop',
        ],
        answer: 1,
        why: 'Unit 6 is built on exactly this idea.',
      },
    ],

    stuck: ['G-09', 'G-15', 'G-17', 'R-08'],

    recap: [
      'One loop spawns a whole wave; change one number to change the size.',
      'Use the counter in a CALCULATION to control spacing.',
      'A spawn loop in act() spawns every frame. Call it once instead.',
      'Wave logic belongs in the world, which knows about the game as a whole.',
    ],
  },
];

module.exports = { course: COURSE, unit: UNIT, label: LABEL, lessons: LESSONS };
