'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  INTRO TO JAVA CODE EXERCISES - one authored, server-graded task per lesson
//  that can honestly carry one.
//
//  ── WHY THIS IS NOT SIMPLY "42 EXERCISES" ──────────────────────────────────
//  Three Unit 1 lessons get no code exercise, on purpose. 1.1 is what a world
//  and an actor ARE, 1.2 is the Greenfoot window, 1.3 is class versus object.
//  Nothing in those lessons is typed: the student right-clicks an actor and
//  picks a method. Attaching a coding task to them would be inventing curriculum
//  to fill a column, and a gradebook column nobody can honestly earn is worse
//  than no column. All three already carry CFUs, a gap-fill and a quiz.
//
//  Ten lessons can carry one, and do.
//
//  ── THE SIGNATURE IS ALWAYS GIVEN ──────────────────────────────────────────
//  lib/greenfoot-stub.js puts the student's submission at CLASS level inside the
//  harness, so a submission has to be a method. Writing a method from nothing is
//  lesson 3.2, which is two units away. So every starter here contains the
//  signature and braces, and the student fills the body.
//
//  That is not a workaround, it is what Greenfoot actually looks like: `act()`
//  already exists in the class you open, and the job is to fill it in. The
//  starter matches the file on the student's screen.
//
//  ── NOTHING HERE STATES AN EXPECTED OUTPUT ─────────────────────────────────
//  Ported from seed/csa-exercises, and it is the most important rule in either
//  bank. A hand written expected output is a guess about what Java prints, and
//  guesses are wrong exactly where it matters: y grows DOWNWARD in Greenfoot, so
//  `getY() + 3` moves an actor down and a hand written answer will say up about
//  a third of the time. So each exercise states its `reference` solution and
//  scripts/verify-intro-java-exercises.js RUNS it through real javac and java
//  against every case to produce expected.generated.json.
//
//  The bank is correct by construction. Re-running the verifier re-proves it
//  rather than re-asserting it.
//
//  ── EVERY EXERCISE HAS A HIDDEN CASE ───────────────────────────────────────
//  At least one case whose setup differs from every visible one, so a submission
//  that prints the sample output as a constant fails. The verifier builds that
//  exact cheat per exercise and asserts it does not pass.
//
//  ── THE SCENE IS FOR THE RUN BUTTON, NOT FOR GRADING ───────────────────────
//  `scene` feeds traceCase() so pressing Run animates what the student wrote.
//  It never grades anything and a graded case never records a trace. See
//  docs/greenfoot-trace.md.
//
//  A SCENE HAS NO HELPERS OF ITS OWN. Helper classes are declared once, on the
//  exercise, and both the Run program and the graded program compile all of
//  them. The first version let a scene add its own, and smoke/intro-java-run.js
//  caught what that costs on its very first run: 1.6's scene declared a Worm the
//  graded cases could not see, so a student who wrote isTouching(Worm.class)
//  would have watched it work under Run and hit a compile error under Submit.
//  Two buttons disagreeing about a student's own code is the worst bug this
//  system could have, so there is now one list and both paths read it.
//
//  Zero PII: author content only. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

// Curriculum guard. An exercise may not need an idea the course has not taught
// by the lesson it sits on, and the honest exceptions are named per exercise
// rather than waved through. `isTouching` in 2.4 is the notable one, and it is
// there because lesson 2.4's own gap-fill already uses it.
const fs = require('fs');
const path = require('path');

const EXERCISES = [
  // ── 1.4 Calling a Method ───────────────────────────────────────────────────
  {
    lesson: '1.4', unit: 'unit-1',
    name: 'Three calls, in order',
    base: 'actor',
    brief: 'A method call is a name, a pair of parentheses, and whatever you put between them. '
      + 'Three of them in a row, and the order is the whole answer.',
    task: [
      'Move the crab 4 forward.',
      'Turn it 90 degrees.',
      'Move it 2 more.',
    ],
    note: 'act() is called for you once per frame. You are only filling in the body, '
      + 'the same as you would in Greenfoot.',
    helpers: '',
    starter: [
      'public void act()',
      '{',
      '    // Three method calls, in the order the task lists them.',
      '',
      '}',
    ].join('\n'),
    reference: [
      'public void act()',
      '{',
      '    move(4);',
      '    turn(90);',
      '    move(2);',
      '}',
    ].join('\n'),
    // Turning 90 then moving is what makes the order visible: a student who
    // moves 6 and then turns lands somewhere else entirely.
    cases: [
      { hidden: 0, setup: 'World w = new World(14, 10, 32);\n    Harness h = new Harness();\n    w.addObject(h, 1, 1);\n    h.act();\n    System.out.println(h.getX() + "," + h.getY() + "," + h.getRotation());' },
      { hidden: 0, setup: 'World w = new World(14, 10, 32);\n    Harness h = new Harness();\n    w.addObject(h, 0, 0);\n    h.act();\n    System.out.println(h.getX() + "," + h.getY() + "," + h.getRotation());' },
      { hidden: 1, setup: 'World w = new World(20, 20, 32);\n    Harness h = new Harness();\n    w.addObject(h, 7, 11);\n    h.act();\n    System.out.println(h.getX() + "," + h.getY() + "," + h.getRotation());' },
      { hidden: 1, setup: 'World w = new World(20, 20, 32);\n    Harness h = new Harness();\n    w.addObject(h, 3, 2);\n    h.act();\n    h.act();\n    System.out.println(h.getX() + "," + h.getY() + "," + h.getRotation());' },
    ],
    scene: {
      world: { width: 16, height: 12, cell: 40 },
      actors: [{ type: 'Harness', x: 1, y: 1 }],
      frames: 12,
      names: { Harness: 'Crab' },
    },
  },

  // ── 1.5 Parameters and Return Values ───────────────────────────────────────
  {
    lesson: '1.5', unit: 'unit-1',
    name: 'A returned value inside another call',
    base: 'actor',
    brief: 'getX() and getY() hand a number BACK. setLocation() needs two numbers. '
      + 'Putting one inside the other is the whole idea of a return value.',
    task: [
      'Move the crab three cells DOWN, using setLocation.',
      'Do not use move(). Ask the crab where it is, then send it somewhere relative to that.',
    ],
    note: 'y grows downward in Greenfoot. Down is a BIGGER y, which will feel wrong '
      + 'for about a week and then never again.',
    helpers: '',
    starter: [
      'public void act()',
      '{',
      '    // setLocation needs two numbers. Get them from the crab itself.',
      '',
      '}',
    ].join('\n'),
    reference: [
      'public void act()',
      '{',
      '    setLocation(getX(), getY() + 3);',
      '}',
    ].join('\n'),
    cases: [
      { hidden: 0, setup: 'World w = new World(10, 20, 32);\n    Harness h = new Harness();\n    w.addObject(h, 4, 2);\n    h.act();\n    System.out.println(h.getX() + "," + h.getY());' },
      { hidden: 0, setup: 'World w = new World(10, 20, 32);\n    Harness h = new Harness();\n    w.addObject(h, 4, 2);\n    h.act();\n    h.act();\n    System.out.println(h.getX() + "," + h.getY());' },
      { hidden: 1, setup: 'World w = new World(30, 30, 32);\n    Harness h = new Harness();\n    w.addObject(h, 19, 6);\n    h.act();\n    System.out.println(h.getX() + "," + h.getY());' },
      // Greenfoot clamps rather than throwing, so this pins that a correct
      // answer stops at the bottom edge instead of leaving the world.
      { hidden: 1, setup: 'World w = new World(10, 8, 32);\n    Harness h = new Harness();\n    w.addObject(h, 5, 6);\n    h.act();\n    System.out.println(h.getX() + "," + h.getY());' },
    ],
    scene: {
      world: { width: 10, height: 14, cell: 40 },
      actors: [{ type: 'Harness', x: 4, y: 0 }],
      frames: 16,
      names: { Harness: 'Crab' },
    },
  },

  // ── 1.6 The act() Method ───────────────────────────────────────────────────
  {
    lesson: '1.6', unit: 'unit-1',
    name: 'Make it patrol',
    base: 'actor',
    brief: 'This is the task the Unit 1 lab ends on. act() runs once per frame, and the '
      + 'repeating is Greenfoot calling it, not anything you write.',
    task: [
      'Move the crab 2 forward every frame.',
      'When it reaches the edge of the world, turn it 180 degrees so it walks back.',
    ],
    note: 'You have not formally met `if` yet, and that is fine. Read it as English: '
      + 'IF the thing in the parentheses is true, do what is in the braces. Unit 2 covers it properly.',
    // Declared here rather than on the scene, so the GRADED program compiles the
    // same classes the animated one does. See the note above EXERCISES.
    helpers: 'class Worm extends Actor { }',
    starter: [
      'public void act()',
      '{',
      '    // Move every frame.',
      '',
      '    // Then turn round at the edge.',
      '',
      '}',
    ].join('\n'),
    reference: [
      'public void act()',
      '{',
      '    move(2);',
      '    if (isAtEdge())',
      '    {',
      '        turn(180);',
      '    }',
      '}',
    ].join('\n'),
    cases: [
      { hidden: 0, setup: 'World w = new World(12, 6, 32);\n    Harness h = new Harness();\n    w.addObject(h, 2, 3);\n    for (int i = 0; i < 4; i++)\n    {\n        h.act();\n    }\n    System.out.println(h.getX() + "," + h.getRotation());' },
      { hidden: 0, setup: 'World w = new World(12, 6, 32);\n    Harness h = new Harness();\n    w.addObject(h, 2, 3);\n    for (int i = 0; i < 8; i++)\n    {\n        h.act();\n    }\n    System.out.println(h.getX() + "," + h.getRotation());' },
      // Long enough to require the turn to have happened and to walk back.
      { hidden: 1, setup: 'World w = new World(21, 6, 32);\n    Harness h = new Harness();\n    w.addObject(h, 1, 2);\n    for (int i = 0; i < 16; i++)\n    {\n        h.act();\n    }\n    System.out.println(h.getX() + "," + h.getRotation());' },
      { hidden: 1, setup: 'World w = new World(9, 9, 32);\n    Harness h = new Harness();\n    w.addObject(h, 4, 4);\n    for (int i = 0; i < 25; i++)\n    {\n        h.act();\n    }\n    System.out.println(h.getX() + "," + h.getRotation());' },
    ],
    scene: {
      world: { width: 20, height: 10, cell: 40 },
      actors: [
        { type: 'Harness', x: 2, y: 5 },
        { type: 'Worm', x: 12, y: 5 },
        { type: 'Worm', x: 17, y: 2 },
      ],
      frames: 60,
      names: { Harness: 'Crab', Worm: 'Worm' },
    },
  },

  // ── 2.1 Variables and Types ────────────────────────────────────────────────
  {
    lesson: '2.1', unit: 'unit-2',
    name: 'Three variables, three types',
    base: 'actor',
    brief: 'A variable has a type, a name and a value. Picking the type is the part that '
      + 'takes thought: a count is not a speed and neither is a yes or no.',
    task: [
      'Declare a variable called coins holding a whole number, starting at 0.',
      'Declare a variable called speed holding 2.5.',
      'Declare a variable called gameOver holding false.',
      'Use the type that fits what each one holds.',
    ],
    note: 'report() is written for you and prints all three. You only write the three '
      + 'declarations above it.',
    helpers: '',
    starter: [
      '// Declare your three variables here.',
      '',
      '',
      '',
      '// Written for you. Do not change it.',
      'public void report()',
      '{',
      '    System.out.println(coins);',
      '    System.out.println(speed);',
      '    System.out.println(gameOver);',
      '}',
    ].join('\n'),
    reference: [
      'int coins = 0;',
      'double speed = 2.5;',
      'boolean gameOver = false;',
      '',
      'public void report()',
      '{',
      '    System.out.println(coins);',
      '    System.out.println(speed);',
      '    System.out.println(gameOver);',
      '}',
    ].join('\n'),
    // The hidden cases ASSIGN before reporting, which is what makes hardcoding
    // impossible: a student who prints "0 / 2.5 / false" as literals passes the
    // visible case and fails both hidden ones. It also proves the types are
    // right, because assigning 9.5 to an int would not compile.
    cases: [
      { hidden: 0, setup: 'Harness h = new Harness();\n    h.report();' },
      { hidden: 1, setup: 'Harness h = new Harness();\n    h.coins = 7;\n    h.speed = 9.5;\n    h.gameOver = true;\n    h.report();' },
      { hidden: 1, setup: 'Harness h = new Harness();\n    h.coins = -3;\n    h.speed = 0.25;\n    h.report();' },
      { hidden: 1, setup: 'Harness a = new Harness();\n    Harness b = new Harness();\n    a.coins = 100;\n    b.report();\n    a.report();' },
    ],
    scene: null,
  },

  // ── 2.2 Expressions and Operators ──────────────────────────────────────────
  {
    lesson: '2.2', unit: 'unit-2',
    name: 'Rows and leftovers',
    base: 'actor',
    brief: 'Integer division throws the remainder away, and % is how you get it back. '
      + 'Together they turn a score into full rows and what is left over.',
    task: [
      'Print the score with one more added to it.',
      'Print how many FULL rows of ten the score makes.',
      'Print how many are left over after those full rows.',
    ],
    note: 'Three printed lines, in that order. Both answers come from the score, '
      + 'not from the score plus one.',
    helpers: '',
    starter: [
      '// Written for you. Fill in the body.',
      'public void report(int score)',
      '{',
      '    // Three lines: score plus one, full rows of ten, leftovers.',
      '',
      '}',
    ].join('\n'),
    reference: [
      'public void report(int score)',
      '{',
      '    System.out.println(score + 1);',
      '    System.out.println(score / 10);',
      '    System.out.println(score % 10);',
      '}',
    ].join('\n'),
    cases: [
      { hidden: 0, setup: 'new Harness().report(47);' },
      { hidden: 0, setup: 'new Harness().report(60);' },
      { hidden: 1, setup: 'new Harness().report(9);' },
      { hidden: 1, setup: 'new Harness().report(0);' },
      // Negative operands are where a student who reached for a subtraction
      // trick instead of % comes apart.
      { hidden: 1, setup: 'new Harness().report(-25);' },
      { hidden: 1, setup: 'new Harness().report(1234);' },
    ],
    scene: null,
  },

  // ── 2.3 Boolean Expressions ────────────────────────────────────────────────
  {
    lesson: '2.3', unit: 'unit-2',
    name: 'The door that will not open',
    base: 'actor',
    brief: 'Two questions, one answer. The door opens when you have the key AND the alarm '
      + 'is not going off, which needs both && and !.',
    task: [
      'Return true when the player has the key and the alarm is NOT ringing.',
      'Return false in every other case.',
    ],
    note: 'Do not write `== true` anywhere. hasKey is already true or false, which is '
      + 'exactly what an expression wants.',
    helpers: '',
    starter: [
      '// Written for you. Fill in the body.',
      'public boolean canOpen(boolean hasKey, boolean alarmRinging)',
      '{',
      '    // One line is enough.',
      '',
      '}',
    ].join('\n'),
    reference: [
      'public boolean canOpen(boolean hasKey, boolean alarmRinging)',
      '{',
      '    return hasKey && !alarmRinging;',
      '}',
    ].join('\n'),
    // All four combinations, because a wrong operator passes some of them. An
    // answer using || passes two; an answer that forgets the ! passes two
    // different ones. Nothing short of all four separates them.
    cases: [
      { hidden: 0, setup: 'Harness h = new Harness();\n    System.out.println(h.canOpen(true, false));' },
      { hidden: 0, setup: 'Harness h = new Harness();\n    System.out.println(h.canOpen(true, true));' },
      // Paired rather than singleton. A bare "false" is the same output a
      // visible case already produces, so a hidden case printing only that
      // fingerprints nothing. Each pair below is a different shape: the first
      // separates an answer using || from one using &&, the second separates an
      // answer that forgot the !.
      { hidden: 1, setup: 'Harness h = new Harness();\n    System.out.println(h.canOpen(false, false));\n    System.out.println(h.canOpen(true, false));' },
      { hidden: 1, setup: 'Harness h = new Harness();\n    System.out.println(h.canOpen(false, true));\n    System.out.println(h.canOpen(true, true));\n    System.out.println(h.canOpen(false, false));' },
      { hidden: 1, setup: 'Harness h = new Harness();\n    System.out.println(h.canOpen(true, false));\n    System.out.println(h.canOpen(false, false));\n    System.out.println(h.canOpen(true, true));\n    System.out.println(h.canOpen(false, true));' },
    ],
    scene: null,
  },

  // ── 2.4 if and else ────────────────────────────────────────────────────────
  {
    lesson: '2.4', unit: 'unit-2',
    name: 'Spikes hurt, floor does not',
    base: 'actor',
    brief: 'One question, two outcomes, and exactly one of them happens. That is what '
      + 'else buys you over a second if.',
    task: [
      'If the player is touching a Spike, take one off lives.',
      'Otherwise move 3 forward.',
      'Never do both in the same frame.',
    ],
    note: 'isTouching is taught properly in lesson 4.4. It is here because this lesson\'s '
      + 'own fill-in-the-code uses it, and there is no new idea in it: a method call with '
      + 'one argument that hands back true or false.',
    helpers: 'class Spike extends Actor { }',
    starter: [
      'int lives = 3;',
      '',
      'public void act()',
      '{',
      '    // One if, one else.',
      '',
      '}',
    ].join('\n'),
    reference: [
      'int lives = 3;',
      '',
      'public void act()',
      '{',
      '    if (isTouching(Spike.class))',
      '    {',
      '        lives = lives - 1;',
      '    }',
      '    else',
      '    {',
      '        move(3);',
      '    }',
      '}',
    ].join('\n'),
    cases: [
      { hidden: 0, setup: 'World w = new World(12, 6, 32);\n    Harness h = new Harness();\n    w.addObject(h, 2, 3);\n    h.act();\n    System.out.println(h.getX() + "," + h.lives);' },
      { hidden: 0, setup: 'World w = new World(12, 6, 32);\n    Harness h = new Harness();\n    w.addObject(h, 2, 3);\n    w.addObject(new Spike(), 2, 3);\n    h.act();\n    System.out.println(h.getX() + "," + h.lives);' },
      // Walks onto a spike part way through, so a submission that only ever
      // takes one branch fails.
      { hidden: 1, setup: 'World w = new World(20, 6, 32);\n    Harness h = new Harness();\n    w.addObject(h, 0, 3);\n    w.addObject(new Spike(), 6, 3);\n    for (int i = 0; i < 5; i++)\n    {\n        h.act();\n    }\n    System.out.println(h.getX() + "," + h.lives);' },
      { hidden: 1, setup: 'World w = new World(20, 6, 32);\n    Harness h = new Harness();\n    w.addObject(h, 5, 3);\n    w.addObject(new Spike(), 5, 3);\n    for (int i = 0; i < 3; i++)\n    {\n        h.act();\n    }\n    System.out.println(h.getX() + "," + h.lives);' },
    ],
    scene: {
      world: { width: 18, height: 8, cell: 40 },
      actors: [
        { type: 'Harness', x: 0, y: 4 },
        { type: 'Spike', x: 9, y: 4 },
        { type: 'Spike', x: 15, y: 4 },
      ],
      frames: 30,
      names: { Harness: 'Player', Spike: 'Spike' },
    },
  },

  // ── 2.5 else if Chains ─────────────────────────────────────────────────────
  {
    lesson: '2.5', unit: 'unit-2',
    name: 'Gold, silver, bronze',
    base: 'actor',
    brief: 'A chain stops at the first true condition. Get the order wrong and the top '
      + 'rank becomes unreachable, which is the bug this lesson exists to prevent.',
    task: [
      'Return "gold" for 100 coins or more.',
      'Return "silver" for 50 or more.',
      'Return "bronze" for anything less.',
      'Use one chain, not three separate ifs.',
    ],
    note: 'Order matters. If you test 50 first, nobody ever reaches gold.',
    helpers: '',
    starter: [
      '// Written for you. Fill in the body.',
      'public String rankFor(int coins)',
      '{',
      '    // if / else if / else, highest first.',
      '',
      '}',
    ].join('\n'),
    reference: [
      'public String rankFor(int coins)',
      '{',
      '    if (coins >= 100)',
      '    {',
      '        return "gold";',
      '    }',
      '    else if (coins >= 50)',
      '    {',
      '        return "silver";',
      '    }',
      '    else',
      '    {',
      '        return "bronze";',
      '    }',
      '}',
    ].join('\n'),
    // Boundaries on purpose: 49/50/99/100 is where >= and > come apart, and a
    // chain written in the wrong order fails 100 while passing everything else.
    cases: [
      { hidden: 0, setup: 'Harness h = new Harness();\n    System.out.println(h.rankFor(120));\n    System.out.println(h.rankFor(70));\n    System.out.println(h.rankFor(5));' },
      { hidden: 0, setup: 'Harness h = new Harness();\n    System.out.println(h.rankFor(100));\n    System.out.println(h.rankFor(50));' },
      { hidden: 1, setup: 'Harness h = new Harness();\n    System.out.println(h.rankFor(99));\n    System.out.println(h.rankFor(49));\n    System.out.println(h.rankFor(0));' },
      { hidden: 1, setup: 'Harness h = new Harness();\n    for (int c = 45; c <= 105; c = c + 5)\n    {\n        System.out.println(c + " " + h.rankFor(c));\n    }' },
    ],
    scene: null,
  },

  // ── 2.6 Randomness ─────────────────────────────────────────────────────────
  {
    lesson: '2.6', unit: 'unit-2',
    name: 'Roll a die',
    base: 'actor',
    brief: 'getRandomNumber(6) gives 0 to 5, never 6. A die gives 1 to 6. The gap between '
      + 'those two sentences is the whole lesson.',
    task: [
      'Return a number from 1 to 6, each equally likely.',
      'Use Greenfoot.getRandomNumber.',
    ],
    note: 'The random numbers here are seeded, so the same code gives the same rolls every '
      + 'time. That is deliberate: a test that could fail at random would fail correct code.',
    helpers: '',
    starter: [
      '// Written for you. Fill in the body.',
      'public int roll()',
      '{',
      '    // getRandomNumber(6) gives 0 to 5. A die does not.',
      '',
      '}',
    ].join('\n'),
    reference: [
      'public int roll()',
      '{',
      '    return Greenfoot.getRandomNumber(6) + 1;',
      '}',
    ].join('\n'),
    // Different seeds per case, so an answer that returns a constant, or uses
    // the wrong range, comes apart. The last case checks the RANGE over many
    // rolls rather than the values, which is the property that actually matters.
    cases: [
      { hidden: 0, setup: 'Greenfoot.__seed(20260816L);\n    Harness h = new Harness();\n    for (int i = 0; i < 6; i++)\n    {\n        System.out.println(h.roll());\n    }' },
      { hidden: 0, setup: 'Greenfoot.__seed(7L);\n    Harness h = new Harness();\n    for (int i = 0; i < 4; i++)\n    {\n        System.out.println(h.roll());\n    }' },
      { hidden: 1, setup: 'Greenfoot.__seed(999L);\n    Harness h = new Harness();\n    for (int i = 0; i < 10; i++)\n    {\n        System.out.println(h.roll());\n    }' },
      { hidden: 1, setup: 'Greenfoot.__seed(31337L);\n    Harness h = new Harness();\n    int lo = 99;\n    int hi = -99;\n    for (int i = 0; i < 400; i++)\n    {\n        int r = h.roll();\n        if (r < lo)\n        {\n            lo = r;\n        }\n        if (r > hi)\n        {\n            hi = r;\n        }\n    }\n    System.out.println(lo + " to " + hi);' },
    ],
    scene: null,
  },

  // ── 2.7 Keyboard Input ─────────────────────────────────────────────────────
  {
    lesson: '2.7', unit: 'unit-2',
    name: 'Four keys, four separate ifs',
    base: 'actor',
    brief: 'Four questions asked every frame, all four of them. Chain them together and '
      + 'the player loses the ability to move diagonally.',
    task: [
      'Move 3 left, right, up or down when that arrow key is held.',
      'Use four SEPARATE if statements, not an else if chain.',
      'Holding two keys at once must move the player diagonally.',
    ],
    note: 'up is a SMALLER y. Down is bigger. This is the one that catches everybody once.',
    helpers: '',
    starter: [
      'public void act()',
      '{',
      '    // Four separate ifs. "left", "right", "up", "down".',
      '',
      '}',
    ].join('\n'),
    reference: [
      'public void act()',
      '{',
      '    if (Greenfoot.isKeyDown("left"))',
      '    {',
      '        setLocation(getX() - 3, getY());',
      '    }',
      '    if (Greenfoot.isKeyDown("right"))',
      '    {',
      '        setLocation(getX() + 3, getY());',
      '    }',
      '    if (Greenfoot.isKeyDown("up"))',
      '    {',
      '        setLocation(getX(), getY() - 3);',
      '    }',
      '    if (Greenfoot.isKeyDown("down"))',
      '    {',
      '        setLocation(getX(), getY() + 3);',
      '    }',
      '}',
    ].join('\n'),
    // The two-key case is the one an else if chain fails, and it is hidden, so
    // a chain passes every visible case and still does not pass the exercise.
    cases: [
      { hidden: 0, setup: 'Greenfoot.__keys("left");\n    World w = new World(30, 30, 32);\n    Harness h = new Harness();\n    w.addObject(h, 15, 15);\n    h.act();\n    System.out.println(h.getX() + "," + h.getY());' },
      { hidden: 0, setup: 'Greenfoot.__keys("down");\n    World w = new World(30, 30, 32);\n    Harness h = new Harness();\n    w.addObject(h, 15, 15);\n    h.act();\n    System.out.println(h.getX() + "," + h.getY());' },
      { hidden: 1, setup: 'Greenfoot.__keys("up", "left");\n    World w = new World(30, 30, 32);\n    Harness h = new Harness();\n    w.addObject(h, 15, 15);\n    h.act();\n    System.out.println(h.getX() + "," + h.getY());' },
      { hidden: 1, setup: 'Greenfoot.__keys("right", "down");\n    World w = new World(30, 30, 32);\n    Harness h = new Harness();\n    w.addObject(h, 4, 4);\n    for (int i = 0; i < 3; i++)\n    {\n        h.act();\n    }\n    System.out.println(h.getX() + "," + h.getY());' },
      { hidden: 1, setup: 'Greenfoot.__keys();\n    World w = new World(30, 30, 32);\n    Harness h = new Harness();\n    w.addObject(h, 9, 9);\n    h.act();\n    System.out.println(h.getX() + "," + h.getY());' },
    ],
    scene: {
      world: { width: 20, height: 12, cell: 40 },
      actors: [{ type: 'Harness', x: 18, y: 10 }],
      frames: 30,
      keys: ['up', 'left'],
      names: { Harness: 'Player' },
    },
  },
];

// Lessons that deliberately carry no code exercise, with the reason, so a future
// reader does not "fix" the gap by inventing one.
const NO_EXERCISE = {
  '1.1': 'Nothing is typed. The lesson is what a world and an actor are.',
  '1.2': 'Nothing is typed. The lesson is the Greenfoot window and the Act button.',
  '1.3': 'Objects are made from the class diagram by right-clicking, not in code. '
    + 'Placing one in code needs addObject, which is lesson 3.7.',
};

const BY_LESSON = {};
for (const e of EXERCISES) BY_LESSON[e.lesson] = e;

/**
 * The graded item id for a lesson.
 *
 * `{U}.{L}-code-1`, from docs/intro-java-course-spec.md, and the trailing `-1`
 * is load bearing rather than decoration: routes/student.js buckets a student's
 * own progress view with `saIsCode = /-code-\d+$/`, so `{U}.{L}-code` would be
 * filed on their page as a concept check. The id matches the pattern rather
 * than the pattern being loosened, because CSA's code items are seeded with
 * item_type 'cfu' and rebucketing by item_type would move those.
 */
function itemId(lesson) { return `${lesson}-code-1`; }

const COURSE = 'intro-java';
const EXPECTED_FILE = path.join(__dirname, 'intro-java-expected.generated.json');

/** Read the verified outputs, with a message aimed at whoever has to fix it. */
function readExpected() {
  if (!fs.existsSync(EXPECTED_FILE)) {
    throw new Error('intro-java exercises have no generated expected output. '
      + 'Run: node scripts/verify-intro-java-exercises.js --write');
  }
  return JSON.parse(fs.readFileSync(EXPECTED_FILE, 'utf8'));
}

/**
 * The rows scripts/seed-code-tests.js writes into code_test_cases.
 *
 * Shaped to the same contract seed/csa-exercises exposes, so the seeder picks
 * this up with one line added to its `sources()` and no other change. The
 * grading route then needs nothing new at all: it already calls expandCase on
 * every prelude, and every prelude below carries the @greenfoot-stub sentinel.
 *
 * The expected output is READ, never computed here. If the generated file is
 * missing or short, this throws rather than seeding a guess, because a wrong
 * expected output in this table fails a student whose code is correct.
 */
function codeTestItems() {
  const expected = readExpected();
  const items = EXERCISES.map((e) => {
    const key = `${e.lesson}:${itemId(e.lesson)}`;
    const entry = expected[key];
    if (!entry) {
      throw new Error(`intro-java ${e.lesson}: no generated expected output. `
        + 'Run: node scripts/verify-intro-java-exercises.js --write');
    }
    if (entry.expected.length !== e.cases.length) {
      throw new Error(`intro-java ${e.lesson}: ${entry.expected.length} generated outputs `
        + `for ${e.cases.length} cases. Run: node scripts/verify-intro-java-exercises.js --write`);
    }
    return {
      course: COURSE,
      lesson: e.lesson,
      item: itemId(e.lesson),
      mode: 'segment',
      cases: e.cases.map((c, i) => ({
        stdin: '',
        // The sentinel has to LEAD the prelude; expandCase drops anything above
        // it. Helper actor classes go after it, as top-level declarations.
        prelude: `// @greenfoot-stub ${e.base}\n${e.helpers || ''}`,
        postlude: `    ${c.setup}`,
        expected_stdout: `${entry.expected[i]}\n`,
        hidden: c.hidden ? 1 : 0,
      })),
    };
  });
  return { items };
}

module.exports = { EXERCISES, BY_LESSON, NO_EXERCISE, itemId,
  codeTestItems, readExpected, COURSE, EXPECTED_FILE };
