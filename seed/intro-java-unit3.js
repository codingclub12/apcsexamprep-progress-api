'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  INTRO TO JAVA, UNIT 3: METHODS, WORLDS, AND CONSTRUCTORS.
//
//  Same shape as Units 1 and 2 (see seed/intro-java-unit1.js for the rules the
//  format enforces and why).
//
//  ── THE HEAVIEST UNIT, AND THE ONE THAT BUYS THE MOST ───────────────────────
//  Nine lessons, and the ones that map most directly onto AP CSA Unit 1
//  (objects, methods, parameters, return values) and CSA Unit 3 (writing
//  classes, constructors, instance variables). A student who finishes this unit
//  has met, in a game they built, nearly everything CSA Unit 3 assesses.
//
//  ── THE IDEA THIS UNIT LIVES OR DIES ON ─────────────────────────────────────
//  Local variable versus instance variable. A score declared inside act() is
//  rebuilt from scratch every frame, so it reads zero forever. The program is
//  legal, it runs, and the number on screen simply never moves. 3.8 is built
//  around it and G-12 exists for when it happens anyway.
//
//  This unit also finally answers the question Unit 1 left open: why do my
//  actors vanish when I press Reset? prepare() is the answer, and it lands in
//  3.7 having been owed since 1.2.
//
//  Zero PII: author content only. No em-dashes, per repo convention. ASCII only.
// ─────────────────────────────────────────────────────────────────────────────

const COURSE = 'intro-java';
const UNIT = 'unit-3';
const LABEL = 'Unit 3: Methods, Worlds, and Constructors';

const SHOT = (lesson, n, alt) => ({ src: `intro-java/${lesson}/step-${n}.png`, alt });

const LESSONS = [
  // ── 3.1 ────────────────────────────────────────────────────────────────────
  {
    lesson: '3.1',
    slug: 'why-write-a-method',
    title: 'Why Write a Method',
    minutes: 25,
    seo: {
      h1: 'Why Write Your Own Methods in Java',
      title: 'Why Write Methods in Java: Decomposition | Intro to Java',
      description:
        'Why splitting a long act method into named methods makes code readable, and how to spot '
        + 'the blocks worth pulling out. Beginner Java lesson.',
      primary: 'why use methods in java',
      related: ['java decomposition beginner', 'greenfoot act method too long',
        'java method naming', 'how to split up code java'],
      faq: [
        {
          q: 'Why should I write my own methods in Java?',
          a: 'A method gives a block of code a name. Once it has a name, the place that calls it '
            + 'reads like a description of what happens instead of a wall of detail.',
        },
        {
          q: 'How do I know when to pull code out into a method?',
          a: 'When you can describe a block in a short phrase, that phrase is the method name. '
            + 'Repeated code and anything needing a comment to explain it are both candidates.',
        },
        {
          q: 'Does splitting code into methods make it slower?',
          a: 'Not in any way you could measure here. Readability is the whole point and the cost '
            + 'is nothing.',
        },
      ],
    },

    hook:
      'By the end of Unit 2 your act() method was getting long. That is not a style problem, it is '
      + 'a debugging problem: when something goes wrong in forty lines you have forty places to '
      + 'look. Methods turn those forty lines into four sentences.',

    objectives: [
      'Explain what a method gives you beyond avoiding repetition',
      'Spot a block of code that should become its own method',
      'Choose a method name that describes what the code does',
    ],

    vocab: [
      { term: 'Decomposition', plain: 'Breaking a big job into smaller named jobs.',
        formal: 'Dividing a problem into parts that can be understood and tested separately.' },
      { term: 'Method', plain: 'A named block of code you can run by name.',
        formal: 'A named, callable member of a class.' },
    ],

    steps: [
      {
        shot: SHOT('3.1', 1, 'A long act method filling the whole editor window with no visible '
          + 'structure.'),
        code:
          'public void act()\n'
          + '{\n'
          + '    if (Greenfoot.isKeyDown("left"))  { setLocation(getX() - 3, getY()); }\n'
          + '    if (Greenfoot.isKeyDown("right")) { setLocation(getX() + 3, getY()); }\n'
          + '    if (isTouching(Coin.class))\n'
          + '    {\n'
          + '        removeTouching(Coin.class);\n'
          + '        score = score + 1;\n'
          + '    }\n'
          + '    if (Greenfoot.getRandomNumber(60) < 1)\n'
          + '    {\n'
          + '        getWorld().addObject(new Enemy(), 0, 0);\n'
          + '    }\n'
          + '}',
        note:
          'This works. It is also already hard to read, and it is going to get longer.\n\n'
          + 'Read it and try to say what it does in one sentence. You cannot, quickly. You have to '
          + 'decode each block first. That decoding is the cost you pay every time you come back '
          + 'to this file.',
      },
      {
        shot: SHOT('3.1', 2, 'The same act method reduced to three named method calls.'),
        code:
          'public void act()\n'
          + '{\n'
          + '    handleKeys();\n'
          + '    collectCoins();\n'
          + '    maybeSpawnEnemy();\n'
          + '}',
        note:
          'Same behavior. Now read it: handle the keys, collect coins, maybe spawn an enemy. That '
          + 'is the whole game in three lines and you understood it without decoding anything.\n\n'
          + 'The detail has not vanished; it moved into three methods below. But you only open the '
          + 'one you care about.',
      },
      {
        shot: SHOT('3.1', 3, 'One of the extracted methods shown below the act method.'),
        code:
          'public void collectCoins()\n'
          + '{\n'
          + '    if (isTouching(Coin.class))\n'
          + '    {\n'
          + '        removeTouching(Coin.class);\n'
          + '        score = score + 1;\n'
          + '    }\n'
          + '}',
        note:
          'Here is one of them. The code is IDENTICAL to what was inside act(); it just has a name '
          + 'now.\n\n'
          + 'And the name is doing real work. If coins stop being collected, you know which of the '
          + 'four methods to open. That is the debugging win, and it is bigger than the '
          + 'readability one.',
      },
      {
        shot: SHOT('3.1', 4, 'A comment above a block of code, with an arrow showing the comment '
          + 'becoming a method name.'),
        note:
          'The practical rule: if you find yourself writing a comment to explain what a block does, '
          + 'that comment is a method name.\n\n'
          + '`// check if we hit a coin` becomes `collectCoins()`. The comment can go, because the '
          + 'name says it, and unlike a comment the name cannot drift out of date without the code '
          + 'breaking.\n\n'
          + 'Two other signs: the same lines appearing twice, and any block you had to scroll past '
          + 'to find what you wanted.',
      },
    ],

    misconceptions: [
      {
        wrong: 'Methods are only worth it when code repeats.',
        right: 'Naming a block is worth it even when it is used once.',
        why: 'Most of the value is reading and debugging, not reuse. A student who only extracts '
          + 'repeated code keeps a forty-line act().',
      },
      {
        wrong: 'More methods make the program slower.',
        right: 'Not measurably, and never enough to matter at this scale.',
        why: 'This belief keeps beginners writing code they cannot debug for a benefit that does '
          + 'not exist.',
      },
      {
        wrong: 'A method name can be anything, like doStuff or method1.',
        right: 'The name IS the documentation. If it does not describe the code, it is worse than '
          + 'nothing.',
        why: 'A wrong or vague name actively misleads the next person, who is usually you next week.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'What is the MAIN benefit of pulling a block out into a named method?',
        options: [
          'The program runs faster',
          'The file is shorter overall',
          'The calling code reads like a description, and bugs are easier to locate',
          'Java requires methods',
        ],
        answer: 2,
        why: 'Readability and knowing where to look are the real wins. The file usually gets '
          + 'slightly longer.',
      },
      {
        id: 'cfu-2',
        stem: 'You wrote `// spawn an enemy sometimes` above a block. What does that suggest?',
        options: [
          'The comment is fine as it is',
          'You should add more comments',
          'The block should be deleted',
          'That block should become a method called something like maybeSpawnEnemy',
        ],
        answer: 3,
        why: 'A comment explaining a block is a method name waiting to be used.',
      },
      {
        id: 'cfu-3',
        stem: 'Is it worth making a method for code that is only used once?',
        options: [
          'No, methods are only for repeated code',
          'Only if it is over fifty lines',
          'Yes, if naming it makes the calling code clearer',
          'Never',
        ],
        answer: 2,
        why: 'Naming is the point, not just reuse.',
      },
      {
        id: 'cfu-4',
        stem: 'Which is the best method name for code that checks the edge and turns around?',
        options: ['doStuff', 'method2', 'turnAtEdge', 'check'],
        answer: 2,
        why: 'It says what the code does, so the call site reads as a sentence.',
      },
    ],

    gap: {
      intro:
        'Rewrite this act() so it reads as three named steps. The methods already exist below; you '
        + 'just need to call them.',
      code:
        'public void act()\n'
        + '{\n'
        + '    ___1___();\n'
        + '    collectCoins___2___\n'
        + '}',
      holes: [
        { n: 1, hint: 'A name describing the block that reads the keyboard. Two words joined, '
            + 'starting lower case.', accept: ['handleKeys'] },
        { n: 2, hint: 'Finish the call: the empty parentheses and the character that ends a statement.',
          accept: ['();'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'Splitting act() into named methods mainly helps with:',
        options: ['Reading the code and finding bugs', 'Speed', 'Memory use', 'File size'],
        answer: 0,
        why: 'You know which method to open when something misbehaves.',
      },
      {
        id: 'q2',
        stem: 'Which is a sign that a block should become its own method?',
        options: [
          'It is exactly one line',
          'It uses a variable',
          'It contains an if',
          'You needed a comment to explain what it does',
        ],
        answer: 3,
        why: 'The comment is the name.',
      },
      {
        id: 'q3',
        stem: 'After extracting three methods, how much of the original code has changed?',
        options: [
          'All of it',
          'It must be rewritten',
          'None of the logic, only where it lives and that it now has a name',
          'Half of it',
        ],
        answer: 2,
        why: 'Extraction moves code and names it. The behavior is identical.',
      },
    ],

    stuck: ['E-04', 'G-01'],

    recap: [
      'A method gives a block of code a name.',
      'The call site then reads like a description instead of a wall of detail.',
      'A comment explaining a block is a method name waiting to happen.',
      'Worth doing even when the code is used only once.',
    ],
  },

  // ── 3.2 ────────────────────────────────────────────────────────────────────
  {
    lesson: '3.2',
    slug: 'writing-a-void-method',
    title: 'Writing a void Method',
    minutes: 30,
    seo: {
      h1: 'How to Write a void Method in Java',
      title: 'Writing a void Method in Java and Greenfoot | Intro to Java',
      description:
        'Write your own Java method: the signature, the body, and where it goes in the class. '
        + 'Includes the method-inside-a-method mistake and how to spot it.',
      primary: 'how to write a method in java',
      related: ['java void method example', 'greenfoot custom method',
        'java method inside method error', 'java method syntax beginner'],
      faq: [
        {
          q: 'How do I write my own method in Java?',
          a: 'Write public void, then a name, then empty parentheses, then a body in braces. Put it '
            + 'inside the class but outside every other method.',
        },
        {
          q: 'Why does Java say illegal start of expression when I add a method?',
          a: 'You have almost certainly put the new method inside another method. Java does not '
            + 'allow that. Check your closing braces.',
        },
        {
          q: 'Does writing a method make it run?',
          a: 'No. Writing it only defines it. Something has to call it by name, usually act().',
        },
      ],
    },

    hook:
      'You have been calling methods since Unit 1. Now you write one. It is four pieces of '
      + 'punctuation and one rule about where it goes, and that rule is where everybody trips.',

    objectives: [
      'Write a void method with a correct signature',
      'Call your own method from act()',
      'Place a method correctly inside the class and not inside another method',
    ],

    vocab: [
      { term: 'Signature', plain: 'The first line of a method: what it gives back, its name, and '
          + 'what it needs.',
        formal: 'The method name together with its parameter list and return type.' },
      { term: 'Body', plain: 'The code between the braces, which is what runs.',
        formal: 'The block of statements executed when the method is called.' },
      { term: 'Define versus call', plain: 'Writing it down versus running it.',
        formal: 'A definition introduces the method; a call executes it.' },
    ],

    steps: [
      {
        shot: SHOT('3.2', 1, 'A newly written void method in an editor with each part of the '
          + 'signature labeled.'),
        code:
          'public void turnAtEdge()\n'
          + '{\n'
          + '    if (isAtEdge())\n'
          + '    {\n'
          + '        turn(180);\n'
          + '    }\n'
          + '}',
        note:
          'Read the first line against what you learned in 1.5.\n\n'
          + '`public` means anything can call it. Use it for now.\n'
          + '`void` is the return type: this hands nothing back.\n'
          + '`turnAtEdge` is the name you chose.\n'
          + '`()` is empty, so it needs nothing from the caller.\n\n'
          + 'Then the body in braces. That is the whole thing.',
      },
      {
        shot: SHOT('3.2', 2, 'The act method calling the new method by name.'),
        code:
          'public void act()\n'
          + '{\n'
          + '    move(3);\n'
          + '    turnAtEdge();\n'
          + '}',
        note:
          'Writing a method does NOT run it. Something has to call it, and here that is act().\n\n'
          + 'This is the most common first confusion: the method is written, compiled, correct, '
          + 'and nothing happens, because nothing ever calls it.\n\n'
          + 'Note the empty parentheses on the call too. `turnAtEdge;` is not a call.',
      },
      {
        shot: SHOT('3.2', 3, 'A class diagram view showing act and turnAtEdge as sibling methods '
          + 'inside the same class.'),
        code:
          'public class Crab extends Actor\n'
          + '{\n'
          + '    public void act()\n'
          + '    {\n'
          + '        move(3);\n'
          + '        turnAtEdge();\n'
          + '    }\n'
          + '\n'
          + '    public void turnAtEdge()\n'
          + '    {\n'
          + '        if (isAtEdge()) { turn(180); }\n'
          + '    }\n'
          + '}',
        note:
          'Here is the placement rule, and it is the only hard part of this lesson.\n\n'
          + 'Both methods are inside the CLASS braces and side by side. Neither is inside the '
          + 'other. Count the indentation: act and turnAtEdge start at the same depth.',
      },
      {
        shot: SHOT('3.2', 4, 'A method mistakenly nested inside act, with the compiler error '
          + 'visible below.'),
        code:
          '// WRONG. A method cannot live inside another method.\n'
          + 'public void act()\n'
          + '{\n'
          + '    move(3);\n'
          + '\n'
          + '    public void turnAtEdge()   // illegal start of expression\n'
          + '    {\n'
          + '    }\n'
          + '}',
        note:
          'This is what happens when you paste a method in without checking the braces. Java says '
          + '`illegal start of expression`, which does not mention methods or braces at all.\n\n'
          + 'The fix: make sure act() has been CLOSED before the next method starts. Re-indent the '
          + 'whole file; the point where the indentation stops making sense is where the missing '
          + 'brace belongs.',
      },
    ],

    misconceptions: [
      {
        wrong: 'Writing a method makes it run.',
        right: 'Writing defines it. Something must call it by name.',
        why: 'A correct, compiled, never-called method is the most common "why is nothing '
          + 'happening" in this unit.',
      },
      {
        wrong: 'A method can go inside another method.',
        right: 'Methods are siblings inside the class, never nested.',
        why: 'The error Java gives for this does not mention methods, so it is very hard to '
          + 'diagnose without knowing the rule.',
      },
      {
        wrong: 'You can call a method without the parentheses.',
        right: 'The empty parentheses are required: turnAtEdge(), never turnAtEdge.',
        why: 'Without them Java looks for a variable of that name and reports cannot find symbol.',
      },
      {
        wrong: 'void methods are less useful than ones that return something.',
        right: 'Most methods in this course are void. They do a job rather than answer a question.',
        why: 'Chasing a return value where none is needed produces convoluted code.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'Where does a new method go?',
        options: [
          'Inside the class, alongside act()',
          'Inside act()',
          'Outside the class',
          'At the top of the file, before the class',
        ],
        answer: 0,
        why: 'Methods are siblings inside the class. Nesting them is not allowed.',
      },
      {
        id: 'cfu-2',
        stem: 'You wrote a correct method and nothing happens when you run. What is most likely?',
        options: [
          'Nothing calls it',
          'It needs a return value',
          'It must be named act',
          'The class is broken',
        ],
        answer: 0,
        why: 'Defining a method does not run it.',
      },
      {
        id: 'cfu-3',
        stem: 'Which is a correct call to `public void reset()`?',
        options: ['reset;', 'reset()', 'reset();', 'public void reset();'],
        answer: 2,
        why: 'Name, empty parentheses, semicolon. You never repeat the signature when calling.',
      },
      {
        id: 'cfu-4',
        stem: 'Java reports `illegal start of expression` on the line where your new method begins. '
          + 'What is the likely cause?',
        options: [
          'The method is inside another method because a brace was not closed',
          'The method name is wrong',
          'void is misspelled',
          'The class needs renaming',
        ],
        answer: 0,
        why: 'A nested method definition produces exactly this error.',
      },
    ],

    gap: {
      intro:
        'Write a method called resetToStart that puts the actor at the top left corner. Fill in the '
        + 'signature and the call.',
      code:
        'public ___1___ resetToStart()\n'
        + '{\n'
        + '    setLocation(0, 0);\n'
        + '}\n'
        + '\n'
        + 'public void act()\n'
        + '{\n'
        + '    ___2___\n'
        + '}',
      holes: [
        { n: 1, hint: 'It hands nothing back to whoever called it.', accept: ['void'] },
        { n: 2, hint: 'Call the method above by name. Do not forget the parentheses and the semicolon.',
          accept: ['resetToStart();'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'What does `void` in a method signature mean?',
        options: [
          'The method is empty',
          'The method is broken',
          'The method cannot be called',
          'The method hands back no value',
        ],
        answer: 3,
        why: 'It describes the return, not the body.',
      },
      {
        id: 'q2',
        stem: 'Which is a correctly written method definition?',
        options: [
          'public void jump() { setLocation(getX(), getY() - 5); }',
          'void public jump() { }',
          'public jump() void { }',
          'public void jump { }',
        ],
        answer: 0,
        why: 'Modifier, return type, name, parentheses, then the body.',
      },
      {
        id: 'q3',
        stem: 'Two methods in the same class should be:',
        options: [
          'Nested, with the smaller one inside the bigger',
          'In separate files',
          'Side by side, both directly inside the class',
          'Inside act()',
        ],
        answer: 2,
        why: 'Siblings inside the class braces.',
      },
      {
        id: 'q4',
        stem: 'Why is `turnAtEdge;` not a call?',
        options: [
          'It is missing the parentheses that make it a call',
          'It is missing the return type',
          'The name is wrong',
          'It needs to be public',
        ],
        answer: 0,
        why: 'Without parentheses Java looks for a variable by that name.',
      },
    ],

    stuck: ['E-01', 'E-04', 'G-11'],

    recap: [
      'A method is public, a return type, a name, parentheses, and a body.',
      'Methods sit inside the class, side by side, never nested.',
      'Writing a method does not run it. Something must call it.',
      'A call always has parentheses, even when empty.',
    ],
  },

  // ── 3.3 ────────────────────────────────────────────────────────────────────
  {
    lesson: '3.3',
    slug: 'methods-with-parameters',
    title: 'Methods with Parameters',
    minutes: 30,
    seo: {
      h1: 'Writing Java Methods with Parameters',
      title: 'Java Method Parameters Explained with Examples | Intro to Java',
      description:
        'How to give your own Java method a parameter, what the caller supplies, and why the '
        + 'parameter name only exists inside the method.',
      primary: 'java method with parameter example',
      related: ['java parameter vs argument', 'java method arguments beginner',
        'greenfoot method parameter', 'java pass value to method'],
      faq: [
        {
          q: 'What is a parameter in a Java method?',
          a: 'A named slot in the method definition. The caller supplies a value for it, and inside '
            + 'the method that value is available under the parameter name.',
        },
        {
          q: 'Does the parameter name have to match the variable I pass in?',
          a: 'No. The parameter name is only used inside the method. The caller can pass a variable '
            + 'with any name, or a plain number.',
        },
        {
          q: 'Can a Java method take more than one parameter?',
          a: 'Yes. Separate them with commas, and the caller must supply the same number in the '
            + 'same order.',
        },
      ],
    },

    hook:
      'A method that always does exactly the same thing is useful. A method you can aim is far more '
      + 'useful, and the difference is one word inside the parentheses.',

    objectives: [
      'Write a method that takes a parameter',
      'Call it with different arguments and predict the result',
      'Explain why the parameter name is invisible outside the method',
    ],

    vocab: [
      { term: 'Parameter', plain: 'The slot in the definition.',
        formal: 'A typed, named variable declared in the method signature.' },
      { term: 'Argument', plain: 'The actual value the caller supplies.',
        formal: 'The expression passed at the call site for a parameter.' },
    ],

    steps: [
      {
        shot: SHOT('3.3', 1, 'A method with a single int parameter, with the parameter highlighted '
          + 'in the signature and again in the body.'),
        code:
          'public void addScore(int points)\n'
          + '{\n'
          + '    score = score + points;\n'
          + '}',
        note:
          '`int points` inside the parentheses is the parameter. It declares a variable that only '
          + 'exists inside this method, and whoever calls decides what goes in it.\n\n'
          + 'Inside the body you use it like any other variable.',
      },
      {
        shot: SHOT('3.3', 2, 'Three different calls to the same method with different values.'),
        code:
          'addScore(1);    // a coin\n'
          + 'addScore(10);   // a gem\n'
          + 'addScore(50);   // the treasure chest',
        note:
          'One method, three behaviors. That is the whole point.\n\n'
          + 'Without the parameter you would need addOne(), addTen() and addFifty(), and a fourth '
          + 'method the moment you invent a new pickup.',
      },
      {
        shot: SHOT('3.3', 3, 'A call passing a variable whose name differs from the parameter name.'),
        code:
          'int gemValue = 10;\n'
          + 'addScore(gemValue);   // points becomes 10 inside the method',
        note:
          'The names do not have to match, and this is worth pausing on.\n\n'
          + '`gemValue` is the caller\'s name for it. `points` is the method\'s name for it. The '
          + 'VALUE is copied across; the names are private to each side.\n\n'
          + 'Inside addScore there is no such thing as gemValue. Outside it, there is no such thing '
          + 'as points.',
      },
      {
        shot: SHOT('3.3', 4, 'A method taking two parameters separated by a comma.'),
        code:
          'public void moveBy(int dx, int dy)\n'
          + '{\n'
          + '    setLocation(getX() + dx, getY() + dy);\n'
          + '}\n'
          + '\n'
          + 'moveBy(3, 0);    // right\n'
          + 'moveBy(0, -3);   // up',
        note:
          'Two parameters, separated by a comma. The caller must supply two arguments, in the same '
          + 'order.\n\n'
          + 'Order is positional, not by name: `moveBy(0, -3)` puts 0 into dx and -3 into dy. Swap '
          + 'them and the actor goes the wrong way, with no error, because both are ints.',
      },
    ],

    misconceptions: [
      {
        wrong: 'The variable you pass in must have the same name as the parameter.',
        right: 'The names are unrelated. Only the value crosses over.',
        why: 'This belief makes students rename variables constantly to satisfy a rule that does '
          + 'not exist.',
      },
      {
        wrong: 'The parameter name can be used outside the method too.',
        right: 'It exists only inside. Using it outside is cannot find symbol.',
        why: 'Understanding this is the beginning of understanding scope.',
      },
      {
        wrong: 'Arguments are matched by name.',
        right: 'They are matched by POSITION, in order.',
        why: 'Two parameters of the same type in the wrong order produce a silent bug.',
      },
      {
        wrong: 'A method can be called with fewer arguments than it declares.',
        right: 'You must supply exactly as many as the signature lists.',
        why: 'Otherwise Java reports "cannot be applied to given types", which does not obviously '
          + 'mean "you missed one".',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'In `public void addScore(int points)`, what is `points`?',
        options: ['The parameter', 'The argument', 'The return value', 'The method name'],
        answer: 0,
        why: 'The slot in the definition is the parameter; the value passed in is the argument.',
      },
      {
        id: 'cfu-2',
        stem: 'int gems = 7; addScore(gems); What is the value of `points` inside the method?',
        options: ['0', 'gems', '7', 'It is an error'],
        answer: 2,
        why: 'The value is copied into the parameter; the names are irrelevant.',
      },
      {
        id: 'cfu-3',
        stem: 'Can you use the parameter name `points` in act(), outside addScore?',
        options: [
          'Yes, parameters are shared',
          'Only if it is an int',
          'Only if act comes after',
          'No, it only exists inside the method that declares it',
        ],
        answer: 3,
        why: 'A parameter is local to its method.',
      },
      {
        id: 'cfu-4',
        stem: '`moveBy(int dx, int dy)` is called as `moveBy(0, 5)`. What is dy?',
        options: ['5', '0', 'Both', 'Neither, it is an error'],
        answer: 0,
        why: 'Arguments match parameters by position, so the second value goes into the second slot.',
      },
      {
        id: 'cfu-5',
        stem: 'Why write `addScore(int points)` instead of separate addOne and addTen methods?',
        options: [
          'One method handles every value, including ones you have not thought of yet',
          'It runs faster',
          'Java does not allow two methods',
          'There is no difference',
        ],
        answer: 0,
        why: 'A parameter turns many near-identical methods into one.',
      },
    ],

    gap: {
      intro:
        'Write a method that makes the actor jump upward by a chosen amount. Remember which '
        + 'direction y grows in.',
      code:
        'public void jump(___1___ height)\n'
        + '{\n'
        + '    setLocation(getX(), getY() ___2___ ___3___);\n'
        + '}',
      holes: [
        { n: 1, hint: 'A whole number of cells.', accept: ['int'] },
        { n: 2, hint: 'Up the screen is a SMALLER y.', accept: ['-'] },
        { n: 3, hint: 'The name of the slot declared in the parentheses above.', accept: ['height'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'A parameter is visible:',
        options: [
          'Everywhere in the class',
          'Only in act()',
          'Only inside the method that declares it',
          'Only in the world',
        ],
        answer: 2,
        why: 'Parameters are local to their method.',
      },
      {
        id: 'q2',
        stem: 'How are arguments matched to parameters?',
        options: ['By name', 'By type only', 'By position, in order', 'Alphabetically'],
        answer: 2,
        why: 'Position decides, which is why two same-typed parameters can be swapped silently.',
      },
      {
        id: 'q3',
        stem: '`public void grow(int amount)` is called as `grow();`. What happens?',
        options: [
          'A compiler error, because an argument is required',
          'amount becomes 0',
          'The method is skipped',
          'amount becomes null',
        ],
        answer: 0,
        why: 'You must supply exactly the arguments the signature declares.',
      },
      {
        id: 'q4',
        stem: 'What is the advantage of a parameter over a fixed value in the method body?',
        options: [
          'The same method can do the job for any value the caller needs',
          'The method becomes shorter',
          'It avoids using variables',
          'It makes the method public',
        ],
        answer: 0,
        why: 'One method covers every case instead of one method per value.',
      },
    ],

    stuck: ['E-01', 'E-06'],

    recap: [
      'A parameter is a slot in the definition; an argument is the value supplied.',
      'The names on each side are unrelated. Only the value crosses.',
      'A parameter exists only inside its own method.',
      'Arguments are matched by POSITION, not by name.',
    ],
  },

  // ── 3.4 ────────────────────────────────────────────────────────────────────
  {
    lesson: '3.4',
    slug: 'return-types',
    title: 'Return Types',
    minutes: 30,
    seo: {
      h1: 'Return Values in Java Methods',
      title: 'Java return Statement and Return Types | Intro to Java',
      description:
        'How to write a Java method that hands a value back, why every path must return, and how '
        + 'to use the result. Beginner lesson with practice.',
      primary: 'java return statement beginner',
      related: ['java missing return statement', 'java boolean method example',
        'java return vs void', 'how to use a returned value java'],
      faq: [
        {
          q: 'What does return do in Java?',
          a: 'It hands a value back to whoever called the method and stops the method immediately. '
            + 'Nothing after it in that method runs.',
        },
        {
          q: 'Why does Java say missing return statement?',
          a: 'There is a route through your method that reaches the end without returning. An if '
            + 'with a return but no else is the usual cause.',
        },
        {
          q: 'Can a method return true or false?',
          a: 'Yes. Declare the return type as boolean, and the method can then be used directly '
            + 'inside an if.',
        },
      ],
    },

    hook:
      'Some methods do a job. Others answer a question, and an answer is no use unless it comes '
      + 'back to you. That is what return is for, and Java is unusually strict about it.',

    objectives: [
      'Write a method that returns a value',
      'Use a returned value in a condition or a calculation',
      'Explain why every path through the method must return',
    ],

    vocab: [
      { term: 'Return type', plain: 'What kind of answer comes back.',
        formal: 'The type written before the method name.' },
      { term: 'return', plain: 'Hand this value back and stop the method now.',
        formal: 'A statement that terminates the method and supplies its value.' },
    ],

    steps: [
      {
        shot: SHOT('3.4', 1, 'A method with an int return type and a return statement, with both '
          + 'highlighted.'),
        code:
          'public int doubled(int n)\n'
          + '{\n'
          + '    return n * 2;\n'
          + '}',
        note:
          '`int` before the name is the promise: this method WILL hand back a whole number.\n\n'
          + '`return n * 2;` keeps the promise. It works out n * 2 and sends it back to whoever '
          + 'called.\n\n'
          + 'The type before the name and the value after return have to agree. Promise an int, '
          + 'return an int.',
      },
      {
        shot: SHOT('3.4', 2, 'The returned value being stored and used at the call site.'),
        code:
          'int result = doubled(5);   // result is 10\n'
          + 'move(doubled(2));          // moves 4',
        note:
          'Two ways to use the answer, exactly as in 1.5. Store it in a variable, or drop the call '
          + 'straight into another expression.\n\n'
          + 'If you call `doubled(5);` on its own line and do nothing with the result, the method '
          + 'runs and the answer is thrown away. That is legal and almost always a mistake.',
      },
      {
        shot: SHOT('3.4', 3, 'A boolean-returning method used directly inside an if condition.'),
        code:
          'public boolean isSafe()\n'
          + '{\n'
          + '    return !isTouching(Spike.class);\n'
          + '}\n'
          + '\n'
          + 'if (isSafe())\n'
          + '{\n'
          + '    move(3);\n'
          + '}',
        note:
          'A boolean return is the most useful kind in this course, because it slots straight into '
          + 'an if.\n\n'
          + 'And look at what it did to the calling code: `if (isSafe())` says what it means. The '
          + 'detail of what "safe" means lives in one place, and if the definition changes you '
          + 'change it once.',
      },
      {
        shot: SHOT('3.4', 4, 'A method with a return inside an if and no return afterward, with '
          + 'the missing return statement error shown.'),
        code:
          '// WRONG. Java: missing return statement\n'
          + 'public int speed()\n'
          + '{\n'
          + '    if (hasBoost)\n'
          + '    {\n'
          + '        return 8;\n'
          + '    }\n'
          + '    // if hasBoost is false, we fall off the end with no value\n'
          + '}',
        note:
          'Java checks EVERY possible route through the method, and if any route can reach the end '
          + 'without returning, it refuses to compile.\n\n'
          + 'Here, when hasBoost is false, nothing is returned. The fix is either an else with its '
          + 'own return, or a plain `return 4;` after the if as the default.\n\n'
          + 'This strictness is a gift. The alternative is a method that sometimes hands back '
          + 'nothing, and you finding out at the worst moment.',
      },
    ],

    misconceptions: [
      {
        wrong: 'return prints the value.',
        right: 'It hands the value back to the caller. Nothing appears on screen.',
        why: 'Students expecting output conclude the method is broken when it is working perfectly.',
      },
      {
        wrong: 'Code after a return still runs.',
        right: 'return stops the method immediately.',
        why: 'This is what makes an early return a useful tool rather than a bug.',
      },
      {
        wrong: 'One return inside an if is enough.',
        right: 'Every path must return, or Java refuses to compile.',
        why: 'This is the exact cause of "missing return statement", which names no line you '
          + 'consider wrong.',
      },
      {
        wrong: 'A void method can return a value.',
        right: 'void promises nothing back, so returning a value is an error.',
        why: 'Mixing these up produces two confusing errors depending on which way round you got it.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'What does `return n * 2;` do?',
        options: [
          'Prints n * 2',
          'Nothing until the method is called again',
          'Stores n * 2 in n',
          'Hands n * 2 back to the caller and stops the method',
        ],
        answer: 3,
        why: 'It supplies the method value and ends the method.',
      },
      {
        id: 'cfu-2',
        stem: 'Which return type lets a method be used directly as `if (thing())`?',
        options: ['int', 'void', 'boolean', 'String'],
        answer: 2,
        why: 'An if needs something that is true or false.',
      },
      {
        id: 'cfu-3',
        stem: 'Why does this give "missing return statement"?\n\npublic int f(int n) { if (n > 0) '
          + '{ return 1; } }',
        options: [
          'n could be negative and there is no return for that case',
          'The method needs a parameter',
          'int cannot be returned',
          'The braces are wrong',
        ],
        answer: 0,
        why: 'A route reaches the end without returning, and Java checks every route.',
      },
      {
        id: 'cfu-4',
        stem: 'What happens to code written after a return that has just executed?',
        options: ['It runs first', 'It runs after', 'It does not run at all', 'It runs twice'],
        answer: 2,
        why: 'return ends the method there and then.',
      },
      {
        id: 'cfu-5',
        stem: '`doubled(5);` on a line by itself. What happens to the answer?',
        options: ['It is printed', 'It is stored automatically', 'It is thrown away', 'It causes an error'],
        answer: 2,
        why: 'A returned value you do not use is discarded, which is legal and usually a mistake.',
      },
    ],

    gap: {
      intro:
        'Write a method that reports whether the player still has lives left. It should be usable '
        + 'directly inside an if.',
      code:
        'public ___1___ isAlive()\n'
        + '{\n'
        + '    ___2___ lives > 0;\n'
        + '}',
      holes: [
        { n: 1, hint: 'The answer is a yes or no, so what type comes back?', accept: ['boolean'] },
        { n: 2, hint: 'The keyword that hands a value back.', accept: ['return'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'The type written before a method name is:',
        options: [
          'What the method hands back',
          'What the method needs',
          'The name of the class',
          'Always void',
        ],
        answer: 0,
        why: 'It is the return type.',
      },
      {
        id: 'q2',
        stem: 'Which method definition compiles?',
        options: [
          'public int f() { if (x) { return 1; } }',
          'public int f() { }',
          'public void f() { return 1; }',
          'public int f() { if (x) { return 1; } return 0; }',
        ],
        answer: 3,
        why: 'Every path returns an int.',
      },
      {
        id: 'q3',
        stem: 'What is the advantage of `if (isSafe())` over writing the full condition inline?',
        options: [
          'It runs faster',
          'It uses less memory',
          'The calling code says what it means, and the definition lives in one place',
          'There is no advantage',
        ],
        answer: 2,
        why: 'Naming the condition is the same win as naming a block of code.',
      },
      {
        id: 'q4',
        stem: 'A void method contains `return 5;`. What happens?',
        options: [
          'A compiler error, because void promises no value',
          'It compiles and returns 5',
          'It returns 0',
          'The 5 is ignored',
        ],
        answer: 0,
        why: 'The signature and the return statement have to agree.',
      },
    ],

    stuck: ['E-05', 'E-03'],

    recap: [
      'The type before the name is what comes back. void means nothing.',
      'return hands a value back AND stops the method immediately.',
      'Every path through the method must return, or it will not compile.',
      'A boolean-returning method slots straight into an if.',
    ],
  },

  // ── 3.5 ────────────────────────────────────────────────────────────────────
  {
    lesson: '3.5',
    slug: 'the-world-subclass',
    title: 'The World Subclass',
    minutes: 25,
    seo: {
      h1: 'The Greenfoot World Subclass and super()',
      title: 'Greenfoot World Class and super() Explained | Intro to Java',
      description:
        'What the Greenfoot World subclass does, what the three numbers in super mean, and how '
        + 'cell size changes what a coordinate means.',
      primary: 'greenfoot super width height cellsize',
      related: ['greenfoot world constructor', 'greenfoot cell size explained',
        'greenfoot world size', 'greenfoot new world class'],
      faq: [
        {
          q: 'What do the three numbers in Greenfoot super() mean?',
          a: 'Width in cells, height in cells, and the size of one cell in pixels. super(20, 15, 30) '
            + 'is a 20 by 15 grid drawn at 30 pixels per cell.',
        },
        {
          q: 'What is a cell in Greenfoot?',
          a: 'The unit that coordinates are counted in. With a cell size of 1 a cell is one pixel, '
            + 'which is why most scenarios look pixel-based.',
        },
        {
          q: 'Why does my actor move too far in Greenfoot?',
          a: 'Check the cell size. move(4) travels four CELLS, so with a cell size of 30 that is '
            + '120 pixels on screen.',
        },
      ],
    },

    hook:
      'You have spent two units inside actors. The world has been quietly sitting there the whole '
      + 'time, and it turns out to be a class you can write code in too. That is where scores, '
      + 'spawning, and the whole setup of a level belong.',

    objectives: [
      'Read a world class declaration and its super call',
      'Explain what width, height and cell size mean',
      'Predict how cell size changes what a coordinate means on screen',
    ],

    vocab: [
      { term: 'Cell', plain: 'The square that coordinates are counted in.',
        formal: 'The grid unit of a Greenfoot world; its pixel size is set at construction.' },
      { term: 'super', plain: 'Set up the built-in World part of me, with these settings.',
        formal: 'A call to the superclass constructor, which must be the first statement.' },
    ],

    steps: [
      {
        shot: SHOT('3.5', 1, 'A world class declaration open in the editor, showing the class '
          + 'extending World.'),
        code:
          'public class OceanWorld extends World\n'
          + '{\n'
          + '    public OceanWorld()\n'
          + '    {\n'
          + '        super(20, 15, 30);\n'
          + '    }\n'
          + '}',
        note:
          'This is the whole of a minimal world class, and you met the first line back in 1.1.\n\n'
          + '`extends World` puts it in the world family. The method with the same name as the '
          + 'class is its constructor, which is the next lesson. For now, look at super.',
      },
      {
        shot: SHOT('3.5', 2, 'A diagram of a world grid with width, height and cell size labeled.'),
        code: 'super(20, 15, 30);',
        note:
          'Three numbers, in this order, always:\n\n'
          + '`20` is the WIDTH in cells. Valid x values are 0 to 19.\n'
          + '`15` is the HEIGHT in cells. Valid y values are 0 to 14.\n'
          + '`30` is the CELL SIZE in pixels.\n\n'
          + 'So this world is 20 by 15 cells, drawn at 600 by 450 pixels on screen.\n\n'
          + 'Note the same off-by-one rule as everywhere else: a width of 20 means the LAST valid x '
          + 'is 19. That will matter enormously in Unit 5.',
      },
      {
        shot: SHOT('3.5', 3, 'Two worlds side by side, one with cell size 1 and one with cell size '
          + '30, showing the same coordinate landing in different places.'),
        code:
          'super(600, 400, 1);   // 600x400 cells, each 1 pixel\n'
          + 'super(20, 15, 30);    // 20x15 cells, each 30 pixels',
        note:
          'Both of these are 600 by 450-ish pixels on screen, and they behave completely '
          + 'differently.\n\n'
          + 'With cell size 1, move(4) travels 4 pixels: smooth, fine-grained movement. Most action '
          + 'games use this.\n\n'
          + 'With cell size 30, move(4) travels 4 CELLS, which is 120 pixels: a big jump. Grid '
          + 'games, board games and tile maps use this, and Unit 6 will use it heavily.\n\n'
          + 'If your actor "moves too far", the cell size is the first thing to check.',
      },
    ],

    misconceptions: [
      {
        wrong: 'The three numbers in super are width, height and speed.',
        right: 'Width in cells, height in cells, cell size in pixels.',
        why: 'Guessing the third one produces a world the wrong size on screen with no error.',
      },
      {
        wrong: 'A cell is always a pixel.',
        right: 'A cell is a pixel only when the cell size is 1.',
        why: 'This is the root of "my actor moves too far" and of tile map confusion in Unit 6.',
      },
      {
        wrong: 'A width of 20 means x can be 20.',
        right: 'x runs 0 to 19.',
        why: 'The same off-by-one that governs arrays, and worth meeting twice before Unit 5.',
      },
      {
        wrong: 'The world is where actor behavior goes.',
        right: 'Actor behavior goes in the actor. The world sets the scene and tracks what is '
          + 'shared, like the score.',
        why: 'Putting everything in the world produces one enormous class and no reusable actors.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'In `super(20, 15, 30)`, what is 30?',
        options: ['The height', 'The width', 'The size of one cell in pixels', 'The frame rate'],
        answer: 2,
        why: 'Width, height, then cell size.',
      },
      {
        id: 'cfu-2',
        stem: 'A world is created with `super(10, 8, 40)`. What is the largest valid x?',
        options: ['10', '40', '8', '9'],
        answer: 3,
        why: 'A width of 10 means x runs 0 to 9.',
      },
      {
        id: 'cfu-3',
        stem: 'With a cell size of 25, how far across the screen does `move(3)` travel?',
        options: ['3 pixels', '25 pixels', '75 pixels', '28 pixels'],
        answer: 2,
        why: 'Three cells at 25 pixels each.',
      },
      {
        id: 'cfu-4',
        stem: 'Which world would suit a smooth-moving action game?',
        options: [
          'super(600, 400, 1)',
          'super(20, 15, 30)',
          'super(10, 10, 60)',
          'super(8, 8, 50)',
        ],
        answer: 0,
        why: 'A cell size of 1 gives pixel-level movement.',
      },
    ],

    gap: {
      intro:
        'Declare a world class for a grid game: 12 cells across, 9 cells down, drawn at 50 pixels '
        + 'per cell.',
      code:
        'public class GridWorld extends ___1___\n'
        + '{\n'
        + '    public GridWorld()\n'
        + '    {\n'
        + '        super(12, ___2___, ___3___);\n'
        + '    }\n'
        + '}',
      holes: [
        { n: 1, hint: 'Which family does a stage belong to?', accept: ['World'] },
        { n: 2, hint: 'The second number is how many cells down.', accept: ['9'] },
        { n: 3, hint: 'The third number is how many pixels one cell takes up.', accept: ['50'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'The three arguments to super in a Greenfoot world are:',
        options: [
          'width, height, cell size',
          'x, y, speed',
          'cells, pixels, actors',
          'height, width, frame rate',
        ],
        answer: 0,
        why: 'In that order, always.',
      },
      {
        id: 'q2',
        stem: 'A world is `super(30, 20, 10)`. How big is it on screen?',
        options: ['30 by 20 pixels', '10 by 10 pixels', '300 by 200 pixels', '600 by 400 pixels'],
        answer: 2,
        why: 'Cells times cell size in each direction.',
      },
      {
        id: 'q3',
        stem: 'An actor seems to leap across the screen with move(2). What is worth checking?',
        options: [
          'The cell size, since move counts cells and not pixels',
          'The actor image',
          'The speed slider',
          'The number of actors',
        ],
        answer: 0,
        why: 'A large cell size makes each cell a big jump on screen.',
      },
      {
        id: 'q4',
        stem: 'What belongs in the world class rather than in an actor?',
        options: [
          'Setting up the opening scene and tracking the shared score',
          'How a single enemy chases the player',
          'How the player responds to a key',
          'The player image',
        ],
        answer: 0,
        why: 'The world owns the scene and what is shared; actors own their own behavior.',
      },
    ],

    stuck: ['E-01', 'G-13'],

    recap: [
      'A world class extends World and calls super in its constructor.',
      'super(width, height, cellSize), in cells, cells and pixels.',
      'A width of 20 means x runs 0 to 19.',
      'move(n) travels n CELLS, so cell size decides how far that is on screen.',
    ],
  },

  // ── 3.6 ────────────────────────────────────────────────────────────────────
  {
    lesson: '3.6',
    slug: 'the-world-constructor',
    title: 'The World Constructor',
    minutes: 25,
    seo: {
      h1: 'The Constructor in a Greenfoot World',
      title: 'Java Constructors Explained for Greenfoot Worlds | Intro to Java',
      description:
        'What a Java constructor is, when it runs, why super must come first, and what belongs in '
        + 'it. Beginner lesson with practice and a quiz.',
      primary: 'java constructor explained beginner',
      related: ['greenfoot world constructor', 'java constructor vs method',
        'java super must be first statement', 'when does a constructor run'],
      faq: [
        {
          q: 'What is a constructor in Java?',
          a: 'A special method with the same name as the class and no return type. It runs once, '
            + 'automatically, when an object of that class is created.',
        },
        {
          q: 'Why must super() be the first statement in a constructor?',
          a: 'The inherited part of the object has to be set up before anything else touches it. '
            + 'Java enforces this and will refuse to compile otherwise.',
        },
        {
          q: 'How is a constructor different from a normal method?',
          a: 'It has the class name, has no return type at all, and you never call it directly. '
            + 'Creating the object calls it for you.',
        },
      ],
    },

    hook:
      'Every time you press Reset, Greenfoot throws your world away and builds a brand new one. The '
      + 'constructor is the code that runs during that build, which makes it the answer to the '
      + 'question Unit 1 left hanging.',

    objectives: [
      'Recognize a constructor and say how it differs from a method',
      'Explain when a constructor runs',
      'Explain why super must be the first statement',
    ],

    vocab: [
      { term: 'Constructor', plain: 'The setup code that runs once when the object is made.',
        formal: 'A special member with the class name and no return type, invoked by new.' },
    ],

    steps: [
      {
        shot: SHOT('3.6', 1, 'A world constructor with its name matching the class name, both '
          + 'highlighted.'),
        code:
          'public class OceanWorld extends World\n'
          + '{\n'
          + '    public OceanWorld()\n'
          + '    {\n'
          + '        super(20, 15, 30);\n'
          + '    }\n'
          + '}',
        note:
          'Two things mark this out as a constructor rather than a method.\n\n'
          + 'Its name is EXACTLY the class name, capital letter and all.\n'
          + 'It has NO return type. Not void, not int. Nothing at all between public and the name.\n\n'
          + 'If you write `public void OceanWorld()` you have quietly made an ordinary method that '
          + 'never runs, and Java will not warn you.',
      },
      {
        shot: SHOT('3.6', 2, 'The Greenfoot Reset button being pressed and a fresh world appearing.'),
        note:
          'When does it run? Once, when the world is created. In Greenfoot that means when the '
          + 'scenario opens and every single time you press Reset.\n\n'
          + 'You never call it yourself. Creating the object runs it for you, exactly like act().\n\n'
          + 'This is why hand-placed actors vanish on Reset: the new world runs its constructor, '
          + 'and the constructor knows nothing about actors you dragged in.',
      },
      {
        shot: SHOT('3.6', 3, 'A constructor with super first followed by other setup lines.'),
        code:
          'public OceanWorld()\n'
          + '{\n'
          + '    super(20, 15, 30);   // MUST be first\n'
          + '    setPaintOrder(Fish.class);\n'
          + '    prepare();\n'
          + '}',
        note:
          'super must be the FIRST statement. Java enforces this, and the reason is sensible: the '
          + 'inherited World part of your object has to exist before anything else touches it. '
          + 'There is no world to set a paint order on until super has run.\n\n'
          + 'Everything else follows. Here the constructor sets a paint order and then calls '
          + 'prepare(), which is the next lesson and where the actors get placed.',
      },
    ],

    misconceptions: [
      {
        wrong: 'A constructor needs a return type like void.',
        right: 'It has NO return type. Adding void makes it an ordinary method that never runs.',
        why: 'This produces a world that ignores all your setup, with no error message at all.',
      },
      {
        wrong: 'You call the constructor yourself.',
        right: 'Creating the object calls it. `new OceanWorld()` runs it.',
        why: 'Same confusion as act(): the framework calls it, you only write it.',
      },
      {
        wrong: 'super can go anywhere in the constructor.',
        right: 'It must be the first statement, and Java refuses otherwise.',
        why: 'Knowing the rule beats decoding the error, which talks about "call to super must be '
          + 'first statement in constructor".',
      },
      {
        wrong: 'The constructor runs every frame.',
        right: 'Once, at creation. act() is the one that runs every frame.',
        why: 'Confusing the two is what puts spawning code in the wrong place and either floods the '
          + 'world or never spawns at all.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'How do you recognize a constructor?',
        options: [
          'It is called act',
          'It is the first method in the file',
          'It is always void',
          'Its name matches the class exactly and it has no return type',
        ],
        answer: 3,
        why: 'Class name, no return type. Both, not either.',
      },
      {
        id: 'cfu-2',
        stem: 'When does a world constructor run?',
        options: [
          'Every frame',
          'Only when you call it',
          'Once when the world is created, including on every Reset',
          'When the scenario is compiled',
        ],
        answer: 2,
        why: 'Creation time, and Reset creates a new world.',
      },
      {
        id: 'cfu-3',
        stem: 'What is wrong with `public void OceanWorld()` in class OceanWorld?',
        options: [
          'The void makes it an ordinary method, so it is never run as a constructor',
          'Nothing',
          'The name is wrong',
          'It needs a parameter',
        ],
        answer: 0,
        why: 'A constructor has no return type. With void it is just a method nobody calls.',
      },
      {
        id: 'cfu-4',
        stem: 'Where must the super call go?',
        options: ['Anywhere', 'Last', 'First', 'Outside the constructor'],
        answer: 2,
        why: 'The inherited part must be set up before anything else touches it.',
      },
    ],

    gap: {
      intro:
        'Complete this constructor. The class is called MazeWorld and the grid is 15 by 15 cells at '
        + '32 pixels.',
      code:
        'public class MazeWorld extends World\n'
        + '{\n'
        + '    public ___1___()\n'
        + '    {\n'
        + '        ___2___(15, 15, 32);\n'
        + '    }\n'
        + '}',
      holes: [
        { n: 1, hint: 'A constructor is named after its class, exactly.', accept: ['MazeWorld'] },
        { n: 2, hint: 'The call that sets up the inherited World part. It must come first.',
          accept: ['super'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'A constructor differs from a method because it:',
        options: [
          'Runs faster',
          'Must be private',
          'Cannot contain if statements',
          'Has the class name and no return type, and runs automatically at creation',
        ],
        answer: 3,
        why: 'Those are the identifying features.',
      },
      {
        id: 'q2',
        stem: 'Pressing Reset in Greenfoot:',
        options: [
          'Calls act() once',
          'Recompiles the code',
          'Builds a new world, running its constructor again',
          'Clears the score only',
        ],
        answer: 2,
        why: 'A fresh world means the constructor runs again.',
      },
      {
        id: 'q3',
        stem: 'Why must super come first?',
        options: [
          'Because the inherited part must exist before anything else uses it',
          'For readability',
          'It does not have to',
          'Because Java reads files backwards',
        ],
        answer: 0,
        why: 'There is no world to configure until super has built it.',
      },
      {
        id: 'q4',
        stem: 'Spawning code that should run once per game belongs in:',
        options: ['act()', 'the actor image', 'a boolean method', 'the constructor'],
        answer: 3,
        why: 'The constructor runs once at creation; act() runs every frame.',
      },
    ],

    stuck: ['E-04', 'G-02', 'G-11'],

    recap: [
      'A constructor has the class name and NO return type.',
      'It runs once, when the object is created. Reset creates a new world.',
      'You never call it. new does.',
      'super must be the first statement.',
    ],
  },

  // ── 3.7 ────────────────────────────────────────────────────────────────────
  {
    lesson: '3.7',
    slug: 'the-prepare-method',
    title: 'The prepare() Method',
    minutes: 30,
    seo: {
      h1: 'The prepare() Method and addObject in Greenfoot',
      title: 'Greenfoot prepare() and addObject Explained | Intro to Java',
      description:
        'How to place actors in code so they survive Reset, what addObject does, and why prepare '
        + 'must be called from the constructor.',
      primary: 'greenfoot prepare method addObject',
      related: ['greenfoot addObject example', 'greenfoot actors disappear reset',
        'greenfoot place actor in code', 'greenfoot removeObject'],
      faq: [
        {
          q: 'What does prepare() do in Greenfoot?',
          a: 'It is an ordinary method, by convention, that places the opening actors with '
            + 'addObject. Calling it from the constructor means the scene rebuilds on every Reset.',
        },
        {
          q: 'Why do my Greenfoot actors disappear when I press Reset?',
          a: 'Because you dragged them in by hand. Actors placed with addObject in prepare come '
            + 'back every time, because the constructor runs again.',
        },
        {
          q: 'What are the numbers in addObject?',
          a: 'The x and y cell coordinates to place the actor at, counting from 0 at the top left.',
        },
      ],
    },

    hook:
      'Since lesson 1.2 you have been dragging actors in by hand and watching them vanish on Reset. '
      + 'This is the lesson that fixes it, and it turns your scenario into something another person '
      + 'can open and play.',

    objectives: [
      'Place actors in code with addObject',
      'Write a prepare() method and call it from the constructor',
      'Explain why hand-placed actors do not survive Reset but these do',
    ],

    vocab: [
      { term: 'prepare()', plain: 'The method where you set up the opening scene.',
        formal: 'A conventional name for the setup method a world constructor calls.' },
      { term: 'addObject', plain: 'Put this actor into the world at these coordinates.',
        formal: 'World.addObject(Actor, int x, int y)' },
    ],

    steps: [
      {
        shot: SHOT('3.7', 1, 'A prepare method containing three addObject calls.'),
        code:
          'public void prepare()\n'
          + '{\n'
          + '    addObject(new Crab(), 5, 5);\n'
          + '    addObject(new Coin(), 12, 3);\n'
          + '    addObject(new Coin(), 2, 9);\n'
          + '}',
        note:
          'Three actors, placed in code. Read one line: make a new Crab (that is `new` from 1.3), '
          + 'and put it in this world at x 5, y 5.\n\n'
          + 'prepare is an ORDINARY method. There is nothing magic about the name; Greenfoot does '
          + 'not know it exists. It is a convention, and a good one, because it puts all the scene '
          + 'setup in one findable place.',
      },
      {
        shot: SHOT('3.7', 2, 'The world constructor calling prepare as its last statement.'),
        code:
          'public OceanWorld()\n'
          + '{\n'
          + '    super(20, 15, 30);\n'
          + '    prepare();\n'
          + '}',
        note:
          'And this is the line that makes it all work. Because the constructor calls prepare, and '
          + 'the constructor runs on every Reset, the scene rebuilds itself every time.\n\n'
          + 'Leave this line out and prepare is a method nobody calls, exactly as in 3.2. The world '
          + 'comes up empty and nothing tells you why.',
      },
      {
        shot: SHOT('3.7', 3, 'The world after Reset, showing the same actors back in their starting '
          + 'positions.'),
        note:
          'Press Reset now. The crab and both coins come back, in exactly the right places, every '
          + 'time.\n\n'
          + 'That is the difference between a scenario only you can use and one you can hand to '
          + 'somebody else. It is also the answer owed since 1.2: hand-placed actors were never '
          + 'part of the world\'s definition, and now yours are.',
      },
      {
        shot: SHOT('3.7', 4, 'An actor being removed from the world with removeObject.'),
        code:
          'removeObject(someCoin);\n'
          + 'removeTouching(Coin.class);   // from inside an actor',
        note:
          'The opposite operation. `removeObject` takes an actor out of the world.\n\n'
          + 'From inside an ACTOR you usually want `removeTouching(Coin.class)`, which finds what '
          + 'you are overlapping and removes it. From inside the WORLD you use removeObject with a '
          + 'specific actor.\n\n'
          + 'A removed actor is gone. Calling getX() on it afterward is the NullPointerException '
          + 'from E-07.',
      },
    ],

    misconceptions: [
      {
        wrong: 'prepare() is a special Greenfoot method that runs automatically.',
        right: 'It is an ordinary method. It runs because the constructor calls it.',
        why: 'Believing it is automatic means you never notice the missing call, and the world '
          + 'comes up empty with no error.',
      },
      {
        wrong: 'addObject creates the actor.',
        right: '`new Crab()` creates it; addObject puts it into the world.',
        why: 'Two separate jobs, and separating them is what lets you make an actor, configure it, '
          + 'and then place it.',
      },
      {
        wrong: 'Actors dragged in by hand are saved with the scenario.',
        right: 'They are not. Only actors placed in code come back.',
        why: 'This is the whole reason the lesson exists.',
      },
      {
        wrong: 'A removed actor can still be used.',
        right: 'It is out of the world. Asking it for its position throws.',
        why: 'The most common NullPointerException in a Greenfoot game.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'What makes prepare() run?',
        options: [
          'Greenfoot calls it automatically',
          'act() calls it every frame',
          'The constructor calls it',
          'Pressing Run',
        ],
        answer: 2,
        why: 'It is an ordinary method, called from the constructor.',
      },
      {
        id: 'cfu-2',
        stem: 'What does `addObject(new Coin(), 3, 7)` do?',
        options: [
          'Creates a coin and places it at x 3, y 7',
          'Moves an existing coin to (3, 7)',
          'Creates 3 coins',
          'Removes a coin',
        ],
        answer: 0,
        why: 'new makes it, addObject places it at those cell coordinates.',
      },
      {
        id: 'cfu-3',
        stem: 'You wrote prepare() but the world comes up empty. What is most likely?',
        options: [
          'The constructor never calls prepare()',
          'addObject is broken',
          'The world is too small',
          'The actors have no images',
        ],
        answer: 0,
        why: 'Same as 3.2: a method nobody calls does nothing.',
      },
      {
        id: 'cfu-4',
        stem: 'Why do actors placed in prepare survive a Reset?',
        options: [
          'Greenfoot saves them',
          'Because Reset builds a new world, which runs the constructor, which calls prepare',
          'They do not survive',
          'Because they are in a variable',
        ],
        answer: 1,
        why: 'The scene is rebuilt from code every time.',
      },
      {
        id: 'cfu-5',
        stem: 'From inside an ACTOR, which removes the coin it is standing on?',
        options: [
          'removeObject(Coin.class)',
          'removeTouching(Coin.class)',
          'addObject(new Coin(), 0, 0)',
          'prepare()',
        ],
        answer: 1,
        why: 'removeTouching finds what the actor overlaps and removes it.',
      },
    ],

    gap: {
      intro:
        'Set up an opening scene with one player at the center-ish cell (10, 7) and one coin at '
        + '(3, 3), and make sure it runs when the world is built.',
      code:
        'public OceanWorld()\n'
        + '{\n'
        + '    super(20, 15, 30);\n'
        + '    ___1___;\n'
        + '}\n'
        + '\n'
        + 'public void prepare()\n'
        + '{\n'
        + '    ___2___(new Player(), 10, 7);\n'
        + '    addObject(___3___ Coin(), 3, 3);\n'
        + '}',
      holes: [
        { n: 1, hint: 'Call the setup method below. Parentheses required.', accept: ['prepare()'] },
        { n: 2, hint: 'The world method that puts an actor into the world.', accept: ['addObject'] },
        { n: 3, hint: 'The keyword that builds one object from a class.', accept: ['new'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'prepare() is:',
        options: [
          'A Greenfoot built-in that runs automatically',
          'An ordinary method, called from the constructor by convention',
          'A constructor',
          'Called once per frame',
        ],
        answer: 1,
        why: 'Nothing about the name is special; the constructor call is what matters.',
      },
      {
        id: 'q2',
        stem: 'Which line creates AND places an enemy at the top left?',
        options: [
          'new Enemy(0, 0);',
          'addObject(new Enemy(), 0, 0);',
          'addObject(Enemy, 0, 0);',
          'Enemy.addObject(0, 0);',
        ],
        answer: 1,
        why: 'new builds it, addObject places it.',
      },
      {
        id: 'q3',
        stem: 'A student drags five actors in, presses Reset, and they vanish. The fix is to:',
        options: [
          'Stop pressing Reset',
          'Place them with addObject in prepare, called from the constructor',
          'Make the world bigger',
          'Give them images',
        ],
        answer: 1,
        why: 'Only code-placed actors are rebuilt.',
      },
      {
        id: 'q4',
        stem: 'What happens if you call getX() on an actor you already removed?',
        options: [
          'It returns 0',
          'It returns the last position',
          'It throws, because the actor is not in a world',
          'Nothing',
        ],
        answer: 2,
        why: 'A removed actor has no world, which is the NullPointerException on E-07.',
      },
    ],

    stuck: ['E-07', 'G-02', 'G-11', 'R-07'],

    recap: [
      'addObject(new Thing(), x, y) creates and places an actor.',
      'prepare() is an ordinary method; the CONSTRUCTOR calling it is what makes it run.',
      'Because the constructor runs on every Reset, the scene rebuilds itself.',
      'A removed actor is out of the world, and asking it anything throws.',
    ],
  },

  // ── 3.8 ────────────────────────────────────────────────────────────────────
  {
    lesson: '3.8',
    slug: 'instance-variables',
    title: 'Instance Variables',
    minutes: 35,
    seo: {
      h1: 'Instance Variables vs Local Variables in Java',
      title: 'Java Instance and Local Variables Explained | Intro to Java',
      description:
        'Why a score declared inside act resets every frame, where instance variables go, and how '
        + 'an object remembers between frames.',
      primary: 'java score always 0 greenfoot',
      related: ['java instance variable vs local', 'greenfoot score not updating',
        'java field vs local variable', 'java variable scope beginner'],
      faq: [
        {
          q: 'Why does my Greenfoot score always stay at 0?',
          a: 'The score is almost certainly declared inside act(). A variable declared in a method '
            + 'is built fresh every time the method runs, so it resets every frame.',
        },
        {
          q: 'Where do I declare a variable so it remembers between frames?',
          a: 'Inside the class but outside every method. That makes it an instance variable, and '
            + 'each object gets its own copy that survives.',
        },
        {
          q: 'What is the difference between an instance variable and a local variable?',
          a: 'An instance variable belongs to the object and lasts as long as it does. A local '
            + 'variable belongs to one run of one method and disappears when that method ends.',
        },
      ],
    },

    hook:
      'This is the single most confusing bug in the whole course, and it produces a program that '
      + 'compiles, runs, and displays a score of zero forever. There is no error message. There is '
      + 'only a number that will not move.',

    objectives: [
      'Explain why a variable declared inside act() resets every frame',
      'Declare an instance variable in the right place',
      'Explain why each object gets its own copy',
    ],

    vocab: [
      { term: 'Local variable', plain: 'Lives inside one method, and dies when it finishes.',
        formal: 'A variable declared inside a method or block; its lifetime is that block.' },
      { term: 'Instance variable', plain: 'Belongs to the object, and lasts as long as the object.',
        formal: 'A field declared in the class body; each instance has its own copy.' },
      { term: 'private', plain: 'Only this class can touch it.',
        formal: 'An access modifier restricting visibility to the declaring class.' },
    ],

    steps: [
      {
        shot: SHOT('3.8', 1, 'A score variable declared inside the act method, with the world '
          + 'showing a score stuck at one.'),
        code:
          '// BROKEN. The score never grows past 1.\n'
          + 'public void act()\n'
          + '{\n'
          + '    int score = 0;\n'
          + '    if (isTouching(Coin.class))\n'
          + '    {\n'
          + '        removeTouching(Coin.class);\n'
          + '        score = score + 1;\n'
          + '    }\n'
          + '}',
        note:
          'Read this carefully, because it looks completely reasonable.\n\n'
          + 'act() runs every frame. Every frame, the FIRST thing it does is `int score = 0;`, '
          + 'building a brand new box and putting zero in it. Whatever last frame counted is gone '
          + 'before this frame even checks for a coin.\n\n'
          + 'It compiles. It runs. The score is 1 at best, and usually 0. No error, ever.',
      },
      {
        shot: SHOT('3.8', 2, 'The same variable moved outside act, into the class body, with the '
          + 'score now climbing.'),
        code:
          'public class Player extends Actor\n'
          + '{\n'
          + '    private int score = 0;      // OUTSIDE act, inside the class\n'
          + '\n'
          + '    public void act()\n'
          + '    {\n'
          + '        if (isTouching(Coin.class))\n'
          + '        {\n'
          + '            removeTouching(Coin.class);\n'
          + '            score = score + 1;\n'
          + '        }\n'
          + '    }\n'
          + '}',
        note:
          'One line moved. That is the entire fix.\n\n'
          + '`score` now belongs to the OBJECT rather than to one run of one method. It is created '
          + 'once, when the player is created, and it survives every frame after that.\n\n'
          + 'Look at where it sits: inside the class braces, outside every method. That position '
          + 'is what makes it an instance variable, not the word private.',
      },
      {
        shot: SHOT('3.8', 3, 'Two player actors in the same world with different scores shown.'),
        note:
          'And each OBJECT gets its own. Two players in the world means two separate scores, '
          + 'counting independently.\n\n'
          + 'That is 1.3 coming back: objects share behavior, because that comes from the class, '
          + 'but they do not share state. An instance variable is exactly the state that is not '
          + 'shared.',
      },
      {
        shot: SHOT('3.8', 4, 'A getter method returning the private score field.'),
        code:
          'private int score = 0;\n'
          + '\n'
          + 'public int getScore()\n'
          + '{\n'
          + '    return score;\n'
          + '}',
        note:
          '`private` means only this class can touch the variable directly. That sounds '
          + 'inconvenient and is actually protection: nothing else can set your score to a million '
          + 'by accident.\n\n'
          + 'When something outside genuinely needs to know, you give it a method. `getScore()` '
          + 'hands the value out without handing over control, which is exactly the return type '
          + 'work from 3.4.',
      },
    ],

    misconceptions: [
      {
        wrong: 'Declaring a variable inside act() is fine as long as you assign to it.',
        right: 'It is rebuilt from scratch every frame. Nothing survives.',
        why: 'This is THE bug of Unit 3, and it produces no error at all.',
      },
      {
        wrong: 'An instance variable is shared by every object of the class.',
        right: 'Each object gets its own copy.',
        why: 'This is what makes per-enemy health and per-player score possible.',
      },
      {
        wrong: 'private stops the variable working.',
        right: 'private only limits who can touch it directly. The class itself uses it normally.',
        why: 'Students often make everything public to "fix" a problem that was never about access.',
      },
      {
        wrong: 'The word private is what makes it an instance variable.',
        right: 'Its POSITION does: inside the class, outside every method.',
        why: 'A variable inside act() is local whether or not you write private, and writing '
          + 'private there is a compiler error.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'A score declared as `int score = 0;` on the first line of act(). What happens over '
          + 'many frames?',
        options: [
          'It grows normally',
          'It is reset to 0 at the start of every frame',
          'It grows twice as fast',
          'It causes a compiler error',
        ],
        answer: 1,
        why: 'The declaration runs every frame, rebuilding the variable.',
      },
      {
        id: 'cfu-2',
        stem: 'Where must a variable go to survive between frames?',
        options: [
          'Inside act()',
          'Inside the class, outside every method',
          'Outside the class',
          'Inside the constructor only',
        ],
        answer: 1,
        why: 'That position makes it belong to the object.',
      },
      {
        id: 'cfu-3',
        stem: 'Two Player objects both have `private int score`. How many scores are there?',
        options: ['One, shared', 'Two, one each', 'Zero', 'It depends on the world'],
        answer: 1,
        why: 'Each object gets its own copy of an instance variable.',
      },
      {
        id: 'cfu-4',
        stem: 'What does `private` do?',
        options: [
          'Stops the variable changing',
          'Limits direct access to this class only',
          'Makes it an instance variable',
          'Makes it faster',
        ],
        answer: 1,
        why: 'It is about who can touch it, not about where it lives or whether it changes.',
      },
      {
        id: 'cfu-5',
        stem: 'A student says their score is stuck at 0 and there is no error. What do you check '
          + 'first?',
        options: [
          'Whether the score variable is declared inside act()',
          'Whether the world is big enough',
          'Whether the coin has an image',
          'The speed slider',
        ],
        answer: 0,
        why: 'A local score rebuilt every frame is by far the most common cause.',
      },
    ],

    gap: {
      intro:
        'Give this player a lives counter that starts at 3 and survives between frames. Put it in '
        + 'the right place and keep it protected.',
      code:
        'public class Player extends Actor\n'
        + '{\n'
        + '    ___1___ int lives = ___2___;\n'
        + '\n'
        + '    public void act()\n'
        + '    {\n'
        + '        if (isTouching(Spike.class))\n'
        + '        {\n'
        + '            lives = lives ___3___ 1;\n'
        + '        }\n'
        + '    }\n'
        + '}',
      holes: [
        { n: 1, hint: 'The keyword that limits direct access to this class only.',
          accept: ['private'] },
        { n: 2, hint: 'How many lives does the player start with?', accept: ['3'] },
        { n: 3, hint: 'Touching a spike costs one.', accept: ['-'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'A variable declared inside a method:',
        options: [
          'Lasts for the life of the object',
          'Exists only for that one run of that method',
          'Is shared with other methods',
          'Is an instance variable',
        ],
        answer: 1,
        why: 'Local variables live and die with the method call.',
      },
      {
        id: 'q2',
        stem: 'What makes a variable an instance variable?',
        options: [
          'The word private',
          'Its position: inside the class, outside every method',
          'Being an int',
          'Being assigned in the constructor',
        ],
        answer: 1,
        why: 'Position decides. private is about access.',
      },
      {
        id: 'q3',
        stem: 'Three Enemy objects each have `private int health = 10;`. One takes 4 damage. What '
          + 'are the three healths?',
        options: ['6, 6, 6', '6, 10, 10', '10, 10, 10', '2, 10, 10'],
        answer: 1,
        why: 'Each object has its own copy, so only the one that was hit changes.',
      },
      {
        id: 'q4',
        stem: 'Why give a private field a public getter method?',
        options: [
          'To let other classes read the value without being able to change it',
          'To make it run faster',
          'Because Java requires it',
          'To make it an instance variable',
        ],
        answer: 0,
        why: 'It hands out the value without handing over control.',
      },
      {
        id: 'q5',
        stem: 'A score is stuck at 1 rather than 0. What does that suggest?',
        options: [
          'It is local and being reset each frame, but a coin was collected during the frame you '
            + 'looked at',
          'The score is working correctly',
          'The coin is worth 1',
          'The world is too small',
        ],
        answer: 0,
        why: 'A local score can reach 1 within a single frame and then be rebuilt at zero.',
      },
    ],

    stuck: ['G-12', 'E-01', 'R-06'],

    recap: [
      'A variable declared inside a method is rebuilt every time that method runs.',
      'act() runs every frame, so a score declared there resets every frame.',
      'An instance variable goes inside the class and outside every method.',
      'Each object gets its own copy. Position makes it an instance variable, not private.',
    ],
  },

  // ── 3.9 ────────────────────────────────────────────────────────────────────
  {
    lesson: '3.9',
    slug: 'the-actor-constructor',
    title: 'The Actor Constructor',
    minutes: 30,
    seo: {
      h1: 'Writing a Constructor for a Greenfoot Actor',
      title: 'Greenfoot Actor Constructor with Parameters | Intro to Java',
      description:
        'Give a Greenfoot actor a constructor so each one starts with its own settings, and pass '
        + 'values in when you create it. Beginner lesson.',
      primary: 'greenfoot actor constructor parameter',
      related: ['java constructor with parameters', 'greenfoot new actor with value',
        'java initialise instance variable', 'greenfoot different enemy speeds'],
      faq: [
        {
          q: 'Can a Greenfoot actor have a constructor?',
          a: 'Yes, and it works like the world constructor: same name as the class, no return type, '
            + 'runs once when the actor is created.',
        },
        {
          q: 'How do I make each enemy move at a different speed?',
          a: 'Give the Enemy class a constructor taking a speed parameter, store it in an instance '
            + 'variable, and pass a different value to each new Enemy.',
        },
        {
          q: 'Does an actor constructor need super()?',
          a: 'Not usually. Actor has a no-argument constructor Java calls for you, unlike World '
            + 'which needs its dimensions.',
        },
      ],
    },

    hook:
      'Right now every enemy you create is identical. A constructor with a parameter is how you '
      + 'make a fast one, a slow one, and a boss, all from one class, in one line each.',

    objectives: [
      'Write a constructor for an actor class',
      'Take a parameter and store it in an instance variable',
      'Create actors with different starting values',
    ],

    vocab: [
      { term: 'Initialise', plain: 'Give something its starting value at birth.',
        formal: 'Assign an instance variable its initial value, usually in the constructor.' },
    ],

    steps: [
      {
        shot: SHOT('3.9', 1, 'An actor class with a constructor that takes a speed parameter.'),
        code:
          'public class Enemy extends Actor\n'
          + '{\n'
          + '    private int speed;\n'
          + '\n'
          + '    public Enemy(int enemySpeed)\n'
          + '    {\n'
          + '        speed = enemySpeed;\n'
          + '    }\n'
          + '\n'
          + '    public void act()\n'
          + '    {\n'
          + '        move(speed);\n'
          + '    }\n'
          + '}',
        note:
          'Everything here you have already met, assembled.\n\n'
          + '`private int speed;` is an instance variable from 3.8, declared with no starting value.\n'
          + '`public Enemy(int enemySpeed)` is a constructor from 3.6 with a parameter from 3.3.\n'
          + '`speed = enemySpeed;` copies the value the caller supplied into the instance variable, '
          + 'where it will survive.\n\n'
          + 'That last line is the whole trick: the parameter dies when the constructor ends, so it '
          + 'has to be saved somewhere that lasts.',
      },
      {
        shot: SHOT('3.9', 2, 'Three enemies created with different speed values in prepare.'),
        code:
          'public void prepare()\n'
          + '{\n'
          + '    addObject(new Enemy(1), 2, 2);    // slow\n'
          + '    addObject(new Enemy(4), 8, 5);    // fast\n'
          + '    addObject(new Enemy(7), 15, 9);   // very fast\n'
          + '}',
        note:
          'One class, three different enemies. The value goes in the parentheses of `new`, exactly '
          + 'like an argument to any other method, because a constructor IS a method that runs at '
          + 'creation.\n\n'
          + 'Compare this with what you would need without a constructor: three classes, or a '
          + 'setter you have to remember to call on every single enemy.',
      },
      {
        shot: SHOT('3.9', 3, 'A constructor setting several instance variables at once.'),
        code:
          'private int speed;\n'
          + 'private int health;\n'
          + '\n'
          + 'public Enemy(int enemySpeed, int startingHealth)\n'
          + '{\n'
          + '    speed = enemySpeed;\n'
          + '    health = startingHealth;\n'
          + '}\n'
          + '\n'
          + 'addObject(new Enemy(3, 20), 5, 5);',
        note:
          'Two parameters, two instance variables. The pattern scales exactly as you would expect, '
          + 'and the arguments stay positional: speed first, health second, because that is the '
          + 'order the constructor declares.\n\n'
          + 'Get them the wrong way round and you have a very slow enemy with three health and no '
          + 'error message at all.',
      },
      {
        shot: SHOT('3.9', 4, 'An actor class with both a no-argument and a parameterised '
          + 'constructor.'),
        code:
          'public Enemy()\n'
          + '{\n'
          + '    speed = 2;        // a sensible default\n'
          + '}\n'
          + '\n'
          + 'public Enemy(int enemySpeed)\n'
          + '{\n'
          + '    speed = enemySpeed;\n'
          + '}',
        note:
          'You can have both. `new Enemy()` gets the default; `new Enemy(5)` gets a chosen speed. '
          + 'Java picks by the arguments you supply.\n\n'
          + 'Worth knowing because the moment you write a constructor WITH parameters, `new Enemy()` '
          + 'stops working unless you also keep a no-argument one. That surprises people, and the '
          + 'error is "constructor Enemy cannot be applied to given types".',
      },
    ],

    misconceptions: [
      {
        wrong: 'The parameter and the instance variable are the same thing.',
        right: 'The parameter dies when the constructor ends. The assignment is what saves the value.',
        why: 'Missing the assignment leaves the instance variable at zero, and every enemy stands '
          + 'still.',
      },
      {
        wrong: 'An actor constructor needs super() like a world does.',
        right: 'Usually not. Actor has a no-argument constructor Java calls for you.',
        why: 'Adding a super call with arguments to an actor is a compiler error that confuses '
          + 'people who just learned super in 3.6.',
      },
      {
        wrong: 'Adding a constructor with parameters leaves `new Enemy()` working.',
        right: 'It stops working unless you also write a no-argument constructor.',
        why: 'Every existing `new Enemy()` in prepare() breaks at once, which looks like the '
          + 'constructor broke the class.',
      },
      {
        wrong: 'You can name the parameter the same as the instance variable and it just works.',
        right: 'It compiles, but the parameter hides the field and the assignment does nothing '
          + 'useful.',
        why: 'This course uses different names to avoid it entirely. The professional fix is `this`, '
          + 'which is beyond this course.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'In a constructor `public Enemy(int enemySpeed)`, why is `speed = enemySpeed;` needed?',
        options: [
          'To make the code longer',
          'Because the parameter disappears when the constructor ends, so the value must be saved',
          'Because Java requires an assignment',
          'It is not needed',
        ],
        answer: 1,
        why: 'The instance variable is what survives; the parameter does not.',
      },
      {
        id: 'cfu-2',
        stem: 'How do you create a fast enemy given `public Enemy(int enemySpeed)`?',
        options: ['new Enemy();', 'new Enemy(6);', 'Enemy(6);', 'new Enemy.speed(6);'],
        answer: 1,
        why: 'The argument goes in the parentheses of new.',
      },
      {
        id: 'cfu-3',
        stem: 'You add `public Enemy(int speed)` to a class that had no constructor. What happens '
          + 'to existing `new Enemy()` calls?',
        options: [
          'They still work',
          'They stop compiling unless a no-argument constructor is also written',
          'They create an enemy with speed 0',
          'They create two enemies',
        ],
        answer: 1,
        why: 'The free no-argument constructor disappears once you write one of your own.',
      },
      {
        id: 'cfu-4',
        stem: 'Does an Actor subclass constructor normally need to call super?',
        options: [
          'Yes, with width and height',
          'No, Actor has a no-argument constructor Java calls for you',
          'Yes, with the image name',
          'Only if it has parameters',
        ],
        answer: 1,
        why: 'Unlike World, Actor needs no construction arguments.',
      },
    ],

    gap: {
      intro:
        'Give Coin a constructor so each coin can be worth a different number of points. Store the '
        + 'value where it will survive.',
      code:
        'public class Coin extends Actor\n'
        + '{\n'
        + '    private int value;\n'
        + '\n'
        + '    public ___1___(int coinValue)\n'
        + '    {\n'
        + '        ___2___ = ___3___;\n'
        + '    }\n'
        + '}',
      holes: [
        { n: 1, hint: 'A constructor is named after its class, exactly.', accept: ['Coin'] },
        { n: 2, hint: 'The variable that survives after the constructor ends.', accept: ['value'] },
        { n: 3, hint: 'The parameter holding what the caller supplied.', accept: ['coinValue'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'An actor constructor runs:',
        options: [
          'Every frame',
          'Once, when that actor is created',
          'When it is added to the world only',
          'When Reset is pressed, for actors already placed',
        ],
        answer: 1,
        why: 'Creation time, once per object.',
      },
      {
        id: 'q2',
        stem: 'Which creates an enemy with speed 3 and health 20, given '
          + '`Enemy(int speed, int health)`?',
        options: [
          'new Enemy(20, 3)',
          'new Enemy(3, 20)',
          'new Enemy(speed: 3, health: 20)',
          'new Enemy()',
        ],
        answer: 1,
        why: 'Arguments are positional, in the order the constructor declares them.',
      },
      {
        id: 'q3',
        stem: 'What is the advantage of a constructor parameter over setting values afterward?',
        options: [
          'The object is correctly set up from the moment it exists, and you cannot forget',
          'It runs faster',
          'It uses less memory',
          'There is no advantage',
        ],
        answer: 0,
        why: 'There is no window where the object exists in a half-configured state.',
      },
      {
        id: 'q4',
        stem: 'A constructor takes a parameter but never assigns it to an instance variable. What '
          + 'happens?',
        options: [
          'A compiler error',
          'The value is lost when the constructor ends, so the field keeps its default',
          'The field is set automatically',
          'The actor is not created',
        ],
        answer: 1,
        why: 'A parameter is local to the constructor. Without the assignment nothing is kept.',
      },
    ],

    stuck: ['E-06', 'G-12', 'G-14'],

    recap: [
      'An actor constructor has the class name, no return type, and runs once at creation.',
      'A parameter carries the value in; an assignment to an instance variable makes it last.',
      'Arguments go in the parentheses of new, positionally.',
      'Writing any constructor removes the free no-argument one.',
      'Actor subclasses do not normally need super.',
    ],
  },
];

module.exports = { course: COURSE, unit: UNIT, label: LABEL, lessons: LESSONS };
