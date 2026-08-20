'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  INTRO TO JAVA, UNIT 1: MEET GREENFOOT. The authored content bank.
//
//  This file IS the lesson. Pages are rendered from it by lib/intro-java-page.js
//  so all 42 lessons come out structurally identical, and a teaching improvement
//  (a new misconception block, a better recap) is one edit that reaches every
//  page rather than 42 hand-edits that reach some of them.
//
//  ── THE ANSWER KEYS IN THIS FILE NEVER REACH THE BROWSER ────────────────────
//  Every `answer`, `why`, and gap `accept` list is SERVER-SIDE ONLY. The
//  renderer strips them, and smoke/intro-java-content.js fails the build if any
//  of them appears in rendered HTML. This is the same posture the CSA and cyber
//  quiz banks already take: a key in the page is not a key.
//
//  ── WRITTEN FOR SOMEONE WHO HAS NEVER PROGRAMMED ────────────────────────────
//  Unit 1 assumes no prior coding, no IDE experience, and no vocabulary. That
//  drives three things that look like over-explaining and are not:
//
//    1. `misconceptions` is a required block, not a nice-to-have. These are the
//       specific wrong models beginners actually build. Naming a wrong idea and
//       killing it is worth more than restating the right one a third time.
//    2. Vocabulary is given in plain language FIRST and the formal term second.
//       A beginner who meets "instantiate" before "make one" learns the word
//       instead of the idea.
//    3. Nothing in Unit 1 asks for code from a blank screen. Every code
//       interaction is a hole in working code.
//
//  Zero PII: author content only. No em-dashes, per repo convention. ASCII only.
// ─────────────────────────────────────────────────────────────────────────────

const COURSE = 'intro-java';
const UNIT = 'unit-1';
const LABEL = 'Unit 1: Meet Greenfoot';

// Screenshots are referenced, not embedded. Path convention is fixed by
// docs/intro-java-course-spec.md so any single shot can be retaken without
// hunting: intro-java/{lesson}/step-{n}.png. `alt` is REQUIRED on every shot
// and the smoke test enforces it, because these pages are used by minors under
// district accessibility policy and an un-alt'd shot is a step a screen reader
// student cannot take at all.
const SHOT = (lesson, n, alt) => ({ src: `intro-java/${lesson}/step-${n}.png`, alt });

const LESSONS = [
  // ── 1.1 ────────────────────────────────────────────────────────────────────
  {
    lesson: '1.1',
    slug: 'scenarios-worlds-and-actors',
    title: 'Scenarios, Worlds, and Actors',
    minutes: 25,
    seo: {
      // One h1, and it is this. 50-60 chars is the target so it survives a
      // search result without being cut.
      h1: 'Greenfoot Scenarios, Worlds, and Actors',
      title: 'Greenfoot Scenarios, Worlds and Actors | Intro to Java',
      description:
        'Learn the three ideas every Greenfoot project is built from: the scenario, '
        + 'the world, and the actors. Beginner Java lesson with practice questions.',
      primary: 'greenfoot scenarios worlds and actors',
      related: [
        'what is a greenfoot scenario',
        'greenfoot world vs actor',
        'greenfoot for beginners',
        'intro to java with greenfoot',
      ],
      faq: [
        {
          q: 'What is a scenario in Greenfoot?',
          a: 'A scenario is one whole Greenfoot project: the world, every actor class in it, '
            + 'the images, and the sounds. When you open a game in Greenfoot, you are opening a scenario.',
        },
        {
          q: 'What is the difference between a world and an actor in Greenfoot?',
          a: 'The world is the stage everything sits on and there is exactly one of it at a time. '
            + 'Actors are the things placed on that stage, and there can be as many as you want.',
        },
        {
          q: 'Do I need to know Java before using Greenfoot?',
          a: 'No. Greenfoot is designed so you can see and move real objects before you write any '
            + 'code, which is why this course starts here rather than with a blank file.',
        },
      ],
    },

    hook:
      'Every game you have ever played is a stage with things on it. A racing game is a track '
      + 'with cars. A platformer is a level with a player and some enemies. Greenfoot makes that '
      + 'idea literal: you build a stage, you put things on it, and you tell the things how to '
      + 'behave. Before you write a single line of code, you need names for those two parts.',

    objectives: [
      'Name the three parts of any Greenfoot project and say what each one does',
      'Point at the world and the actors in a scenario you have never seen before',
      'Explain why there is exactly one world but many actors',
    ],

    vocab: [
      {
        term: 'Scenario',
        plain: 'The whole project. The entire game, in one folder.',
        formal: 'A Greenfoot scenario contains the world class, every actor class, and the image '
          + 'and sound assets they use.',
      },
      {
        term: 'World',
        plain: 'The stage. The rectangle everything else sits on.',
        formal: 'A subclass of Greenfoot\'s World class. It owns the grid, its size, and the list '
          + 'of actors currently in it.',
      },
      {
        term: 'Actor',
        plain: 'A thing on the stage. The player, an enemy, a coin, a wall.',
        formal: 'A subclass of Greenfoot\'s Actor class. It has a position in the world, an image, '
          + 'and behavior of its own.',
      },
    ],

    steps: [
      {
        shot: SHOT('1.1', 1, 'The Greenfoot window with a scenario open. The world fills the large '
          + 'area on the left and the class diagram is stacked on the right.'),
        note:
          'This is a scenario, open in Greenfoot. Two regions matter right now. The big rectangle '
          + 'on the left is the WORLD. Everything you can see sitting inside it is an ACTOR. That '
          + 'is the whole vocabulary for this lesson.',
      },
      {
        shot: SHOT('1.1', 2, 'The class diagram panel, showing World with a subclass beneath it '
          + 'and Actor with several subclasses beneath it.'),
        note:
          'The panel on the right is the class diagram, and it is already telling you the same '
          + 'story. Everything in the top group descends from World. Everything in the bottom '
          + 'group descends from Actor. Greenfoot sorts your project into exactly those two '
          + 'families because every single thing in a scenario is one or the other.',
      },
      {
        shot: SHOT('1.1', 3, 'A close-up of one actor class in the diagram, showing the class name '
          + 'above a small preview of its image.'),
        code: 'public class Crab extends Actor\n{\n    // behavior goes here, later\n}',
        note:
          'Double-clicking an actor class opens its code, and the first line says the same thing '
          + 'the diagram did. `extends Actor` is Java for "this is a kind of Actor". You are not '
          + 'expected to write this line yet. You are expected to recognize it, because it is how '
          + 'you tell what something is when the diagram is not in front of you.',
      },
      {
        shot: SHOT('1.1', 4, 'The world class code open, showing a class declaration that extends '
          + 'World.'),
        code: 'public class OceanWorld extends World\n{\n    // the stage is set up here, later\n}',
        note:
          'And the world class says `extends World`. Notice the name is OceanWorld, not World. The '
          + 'name is yours to choose; the family it belongs to is what `extends` decides.',
      },
    ],

    misconceptions: [
      {
        wrong: 'The world is the background picture.',
        right: 'The world is a thing that OWNS a background picture, a size, and a list of actors.',
        why: 'This one matters later. In Unit 3 you will write code inside the world to place '
          + 'actors and keep score. You cannot write code inside a picture.',
      },
      {
        wrong: 'An actor is the picture of the crab.',
        right: 'The actor is the thing; the picture is one of its properties.',
        why: 'The same crab actor can change its image and still be the same crab, in the same '
          + 'place, with the same score.',
      },
      {
        wrong: 'There can be several worlds on screen at once.',
        right: 'Exactly one world is showing at a time. Actors are the many; the world is the one.',
        why: 'Scenarios do swap worlds later (a title screen, then a level), but they swap. They '
          + 'do not stack.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'In a Greenfoot scenario, how many worlds are showing at once?',
        options: ['Exactly one', 'One per actor', 'As many as you add', 'None until you press Run'],
        answer: 0,
        why: 'The world is the stage. Actors are the many things on it; the stage is the one thing '
          + 'they sit on.',
      },
      {
        id: 'cfu-2',
        stem: 'You open an unfamiliar scenario and see a fish, three bubbles, and a treasure chest '
          + 'inside a blue rectangle. How many actors are on screen?',
        options: ['1', '3', '5', '6'],
        answer: 2,
        why: 'One fish plus three bubbles plus one chest is five actors. The blue rectangle is the '
          + 'world, and the world is not an actor.',
      },
      {
        id: 'cfu-3',
        stem: 'A class declaration reads `public class Rocket extends Actor`. What does that tell you?',
        options: [
          'Rocket is the stage everything sits on',
          'Rocket has no image yet',
          'Rocket is the name of the scenario',
          'Rocket is a thing that can be placed in a world',
        ],
        answer: 3,
        why: '`extends Actor` puts Rocket in the actor family, which means it is something you '
          + 'place IN a world rather than the world itself.',
      },
      {
        id: 'cfu-4',
        stem: 'Which of these is the SCENARIO?',
        options: [
          'The blue rectangle on screen',
          'The crab sitting in the middle',
          'The whole project, including the world, every actor class, and the images',
          'The Run button',
        ],
        answer: 2,
        why: 'Scenario is the biggest word of the three. It is the entire project, not any single '
          + 'piece inside it.',
      },
    ],

    gap: {
      intro:
        'Here are the first lines of two classes from an underwater scenario. One of them is the '
        + 'stage; the other is a thing that swims around on it. Fill in the family each one belongs to.',
      code:
        'public class ReefWorld extends ___1___\n'
        + '{\n'
        + '}\n'
        + '\n'
        + 'public class Jellyfish extends ___2___\n'
        + '{\n'
        + '}',
      holes: [
        {
          n: 1,
          hint: 'ReefWorld is the stage. Which family is the stage in?',
          accept: ['World'],
        },
        {
          n: 2,
          hint: 'A jellyfish is a thing that sits on the stage.',
          accept: ['Actor'],
        },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'Which statement is TRUE about worlds and actors?',
        options: [
          'A world can contain many actors',
          'An actor can contain many worlds',
          'A world must contain exactly one actor',
          'Actors and worlds are the same thing with different names',
        ],
        answer: 0,
        why: 'One stage, many things on it.',
      },
      {
        id: 'q2',
        stem: 'You want to add a coin that the player can collect. Should the Coin class extend '
          + 'World or Actor?',
        options: ['Actor', 'World', 'Either works', 'Neither, coins are images not classes'],
        answer: 0,
        why: 'A coin is a thing placed on the stage, so it belongs to the actor family.',
      },
      {
        id: 'q3',
        stem: 'Which of these is NOT part of a scenario?',
        options: [
          'The world class',
          'The actor classes',
          'The images the actors use',
          'The other scenarios saved on your computer',
        ],
        answer: 3,
        why: 'A scenario is one self-contained project. Other scenarios are other projects.',
      },
    ],

    stuck: ['E-01', 'R-01'],

    recap: [
      'A scenario is the whole project.',
      'The world is the one stage everything sits on.',
      'Actors are the many things placed on that stage.',
      '`extends World` and `extends Actor` are how a class says which family it is in.',
    ],
  },

  // ── 1.2 ────────────────────────────────────────────────────────────────────
  {
    lesson: '1.2',
    slug: 'the-greenfoot-window',
    title: 'The Greenfoot Window',
    minutes: 20,
    seo: {
      h1: 'The Greenfoot Window: Controls and Class Diagram',
      title: 'Greenfoot Window, Act, Run and Reset Explained | Intro to Java',
      description:
        'A tour of the Greenfoot window for beginners: the class diagram, the world view, what the '
        + 'Act, Run and Reset buttons do, and why an edit needs compiling.',
      primary: 'greenfoot act vs run',
      related: [
        'greenfoot reset button',
        'greenfoot compile button',
        'what does act do in greenfoot',
        'greenfoot speed slider',
      ],
      faq: [
        {
          q: 'What is the difference between Act and Run in Greenfoot?',
          a: 'Act advances the scenario by exactly one frame, so every actor takes one turn. Run '
            + 'repeats that frame over and over until you press Pause.',
        },
        {
          q: 'Why does nothing change when I edit my code in Greenfoot?',
          a: 'Edited code does not take effect until you compile it. Press Compile, wait for the '
            + 'class diagram to stop being hatched, then Run.',
        },
        {
          q: 'What does the Reset button do in Greenfoot?',
          a: 'Reset throws the current world away and builds a brand new one. Any actors you placed '
            + 'by hand are gone, which is expected rather than a bug.',
        },
      ],
    },

    hook:
      'Most beginners lose their first hour to something that is not a programming problem at all: '
      + 'they edited some code, pressed Run, and nothing changed. Ten minutes of window tour now '
      + 'saves that hour.',

    objectives: [
      'Find the class diagram, the world view, and the execution controls',
      'Predict the difference between pressing Act once and pressing Run',
      'Explain why an edit does nothing until you compile',
    ],

    vocab: [
      {
        term: 'Compile',
        plain: 'Turn the code you typed into something the computer can actually run.',
        formal: 'Java source is compiled to bytecode. Until that happens, your edits exist only as '
          + 'text and the running scenario still uses the previous version.',
      },
      {
        term: 'Frame',
        plain: 'One tick of the game. Everybody gets one turn.',
        formal: 'One pass in which Greenfoot calls act() on the world and on every actor in it.',
      },
    ],

    steps: [
      {
        shot: SHOT('1.2', 1, 'The full Greenfoot window with three regions outlined and labeled: '
          + 'world view on the left, class diagram on the right, execution controls along the bottom.'),
        note:
          'Three regions, and you will use all three constantly. Left is the world view, where the '
          + 'scenario actually runs. Right is the class diagram, your project\'s table of contents. '
          + 'Along the bottom are the execution controls.',
      },
      {
        // Greenfoot shows THREE buttons, not four: Act, Run and Reset, plus the
        // speed slider. Pause is not a button of its own; Run turns into Pause
        // while a scenario is running. The alt text used to list four, which
        // sends a beginner hunting the toolbar for something that is not there.
        shot: SHOT('1.2', 2, 'Close-up of the execution controls: the Act, Run and Reset buttons, '
          + 'with the speed slider to their right.'),
        note:
          'ACT runs exactly one frame. Every actor gets one turn and then everything stops. This is '
          + 'the most useful button in Greenfoot and beginners almost never use it. When something '
          + 'is behaving strangely, pressing Act repeatedly lets you watch it happen one step at a '
          + 'time instead of guessing at full speed.\n\n'
          + 'RUN is Act on repeat. While it is running the Run button itself turns into PAUSE, '
          + 'which is why you will not find a separate pause button. RESET throws the world away and builds a '
          + 'fresh one. The SPEED SLIDER changes how fast frames go by; it changes nothing about '
          + 'your code.',
      },
      {
        shot: SHOT('1.2', 3, 'The class diagram with classes drawn in a hatched or striped pattern, '
          + 'indicating uncompiled changes.'),
        note:
          'When classes look hatched or striped like this, Greenfoot is telling you that the code '
          + 'on disk no longer matches the code that is running. You changed something and have not '
          + 'compiled it yet. Press Compile. The stripes clear, and only then does Run use your new '
          + 'code.\n\n'
          + 'If you take one thing from this lesson: stripes mean "your edit is not live yet".',
      },
      {
        shot: SHOT('1.2', 4, 'A scenario after pressing Reset, showing the world back in its '
          + 'starting arrangement.'),
        note:
          'Reset does not undo your code. It rebuilds the world from scratch, which means any actor '
          + 'you dragged in by hand disappears. That is correct behavior. In Unit 3 you will learn '
          + 'to place actors in code so they come back automatically every time.',
      },
    ],

    misconceptions: [
      {
        wrong: 'Pressing Run applies the code I just typed.',
        right: 'Pressing Compile applies it. Run only starts the scenario.',
        why: 'This is the single most common reason a beginner thinks their change "did nothing".',
      },
      {
        wrong: 'The speed slider makes my actor move further.',
        right: 'It changes how quickly frames happen. Each frame still moves your actor the same amount.',
        why: 'Confusing frame rate with distance leads to "fixing" working code that was never wrong.',
      },
      {
        wrong: 'Reset is broken because my actors vanished.',
        right: 'Reset rebuilds the world, so hand-placed actors are gone by design.',
        why: 'Knowing this is what motivates prepare() in Unit 3 instead of feeling like a bug.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'You press Act once. What happens?',
        options: [
          'The scenario runs until you press Pause',
          'Your code is compiled',
          'The world is rebuilt from scratch',
          'Every actor takes exactly one turn, then everything stops',
        ],
        answer: 3,
        why: 'Act is one single frame. That is what makes it so useful for watching a bug happen slowly.',
      },
      {
        id: 'cfu-2',
        stem: 'You edit your code, press Run, and the behavior is exactly the same as before. What '
          + 'is the FIRST thing to check?',
        options: [
          'Whether you compiled',
          'Whether the speed slider is too low',
          'Whether you need a new scenario',
          'Whether your computer is out of memory',
        ],
        answer: 0,
        why: 'Uncompiled edits are not live. The hatched class diagram is Greenfoot telling you so.',
      },
      {
        id: 'cfu-3',
        stem: 'You drag three crabs into the world by hand, then press Reset. How many crabs are there?',
        options: ['Three, exactly where you left them', 'Three, but in new positions',
          'However many the world builds itself, which may be zero', 'Six'],
        answer: 2,
        why: 'Reset builds a brand new world. Hand-placed actors are not part of that build.',
      },
      {
        id: 'cfu-4',
        stem: 'The classes in the diagram are drawn with stripes across them. What does that mean?',
        options: [
          'Those classes have errors in them',
          'Those classes are selected',
          'The code has changed since it was last compiled',
          'Those classes have no image',
        ],
        answer: 2,
        why: 'Stripes mean uncompiled, not broken. Compiling clears them.',
      },
    ],

    gap: null, // Orientation lesson. There is no code to hole, and inventing one
               // would test reading comprehension while pretending to test code.

    quiz: [
      {
        id: 'q1',
        stem: 'Which button would you use to watch a bug happen one step at a time?',
        options: ['Act', 'Run', 'Reset', 'The speed slider'],
        answer: 0,
        why: 'Act advances exactly one frame, so you can see each change as it happens.',
      },
      {
        id: 'q2',
        stem: 'Pressing Compile does which of these?',
        options: [
          'Starts the scenario',
          'Saves your images',
          'Rebuilds the world',
          'Makes your edited code the version that actually runs',
        ],
        answer: 3,
        why: 'Compiling is what turns your typed text into the running program.',
      },
      {
        id: 'q3',
        stem: 'Run is best described as:',
        options: [
          'Act, repeated until you press Pause',
          'Reset, repeated',
          'Compile followed by Act',
          'A single frame',
        ],
        answer: 0,
        why: 'Run is just Act over and over.',
      },
    ],

    stuck: ['E-02', 'G-01', 'G-02'],

    recap: [
      'Act is one frame. Run is Act repeated. Pause stops it.',
      'Reset builds a brand new world and discards hand-placed actors.',
      'Stripes on the class diagram mean your edit is not compiled yet.',
      'The speed slider changes frame rate, never distance.',
    ],
  },

  // ── 1.3 ────────────────────────────────────────────────────────────────────
  {
    lesson: '1.3',
    slug: 'classes-and-objects',
    title: 'Classes and Objects',
    minutes: 30,
    seo: {
      h1: 'Classes and Objects in Greenfoot',
      title: 'Classes vs Objects in Java and Greenfoot | Intro to Java',
      description:
        'The difference between a class and an object, shown by making several actors from one '
        + 'class in Greenfoot. Beginner Java lesson with practice and a quiz.',
      primary: 'class vs object java beginner',
      related: [
        'greenfoot new object',
        'what is an instance in java',
        'difference between class and object',
        'greenfoot object bench',
      ],
      faq: [
        {
          q: 'What is the difference between a class and an object?',
          a: 'A class is the plan for a kind of thing. An object is one actual thing built from '
            + 'that plan. One Crab class can produce fifty crab objects, each in its own position.',
        },
        {
          q: 'How do I create an object in Greenfoot?',
          a: 'Right-click the class in the class diagram, choose new, then drag the object into the '
            + 'world. In code, the same thing is written new Crab().',
        },
        {
          q: 'If I move one crab, do all the other crabs move?',
          a: 'No. Each object keeps its own position, so moving one leaves the others exactly where '
            + 'they were.',
        },
      ],
    },

    hook:
      'This is the idea that unlocks everything else, and it is worth slowing down for. A recipe is '
      + 'not a cake. You can bake twelve cakes from one recipe, eat one, burn another, and the '
      + 'recipe is unchanged. In Java, the recipe is a CLASS and each cake is an OBJECT.',

    objectives: [
      'Explain the difference between a class and an object in your own words',
      'Create several objects from one class and predict what happens to each',
      'Read `new Crab()` and say what it produces',
    ],

    vocab: [
      {
        term: 'Class',
        plain: 'The plan for a kind of thing. Written once.',
        formal: 'A class defines the state and behavior that every object of that type will have.',
      },
      {
        term: 'Object',
        plain: 'One actual thing built from the plan.',
        formal: 'An instance of a class, with its own copy of the state the class describes.',
      },
      {
        term: 'Instantiate',
        plain: 'Make one.',
        formal: 'Create a new object from a class, written `new ClassName()` in Java.',
      },
    ],

    steps: [
      {
        shot: SHOT('1.3', 1, 'Right-click menu on the Crab class in the class diagram, with the '
          + 'new Crab() option highlighted.'),
        note:
          'Right-click the Crab class and Greenfoot offers you `new Crab()`. Read that as an '
          + 'instruction: "make me one crab". The class is the plan; you are asking for one thing '
          + 'built from it.',
      },
      {
        shot: SHOT('1.3', 2, 'Three separate crab actors placed at different positions in the world.'),
        note:
          'Do it three times and place them apart. Three objects. One class. Nothing about the Crab '
          + 'class changed when you made them, and nothing about it changes if you delete them.',
      },
      {
        shot: SHOT('1.3', 3, 'One crab dragged to a new position while the other two remain where '
          + 'they were.'),
        note:
          'Now drag one crab somewhere else. The other two do not follow. This is the whole point: '
          + 'each object carries its own position. They share behavior, because that comes from the '
          + 'class. They do not share state.',
      },
      {
        shot: SHOT('1.3', 4, 'The Greenfoot object bench below the world, holding a crab object '
          + 'created for inspection.'),
        code: 'Crab myCrab = new Crab();',
        note:
          'In code the same request looks like this. `new Crab()` builds one crab. `Crab myCrab =` '
          + 'gives that particular crab a name so you can talk about it later. You are not writing '
          + 'this line yet; you are learning to read it, because it shows up constantly from Unit 3 '
          + 'onwards.',
      },
    ],

    misconceptions: [
      {
        wrong: 'There is one crab, and the class IS the crab.',
        right: 'The class is the plan. There can be zero crabs, one, or fifty.',
        why: 'A student holding this idea cannot make sense of a game with twenty enemies, because '
          + 'they think twenty enemies needs twenty classes.',
      },
      {
        wrong: 'Changing one object changes all objects of that class.',
        right: 'Each object has its own state. Moving one moves one.',
        why: 'This is what makes a score-per-enemy or a health-per-player possible at all.',
      },
      {
        wrong: 'Deleting an object deletes the class.',
        right: 'The plan survives. You can always make another.',
        why: 'Removing an enemy when it is hit must not remove the ability to spawn the next one.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'A scenario has one Bubble class. You place seven bubbles in the world. How many '
          + 'classes and how many objects are there?',
        options: ['7 classes, 7 objects', '1 class, 1 object', '7 classes, 1 object', '1 class, 7 objects'],
        answer: 3,
        why: 'One plan, seven things built from it.',
      },
      {
        id: 'cfu-2',
        stem: 'You move one of the seven bubbles to the top of the world. What happens to the other six?',
        options: [
          'They move to the top as well',
          'They swap positions with each other',
          'They are deleted',
          'They stay exactly where they were',
        ],
        answer: 3,
        why: 'Position is per-object state, so only the one you moved changes.',
      },
      {
        id: 'cfu-3',
        stem: 'What does `new Fish()` do?',
        options: [
          'Renames the Fish class',
          'Deletes all existing fish',
          'Builds one new fish object',
          'Opens the Fish class code',
        ],
        answer: 2,
        why: '`new` followed by a class name and parentheses is Java for "make one of these".',
      },
      {
        id: 'cfu-4',
        stem: 'Which is the better analogy for a class?',
        options: ['A recipe for a cake', 'A cake', 'The oven', 'The person eating the cake'],
        answer: 0,
        why: 'The recipe is written once and can produce any number of cakes, which is exactly the '
          + 'relationship between a class and its objects.',
      },
    ],

    gap: {
      intro:
        'A scenario needs three fish and one shark placed in an aquarium. Fill in the class names '
        + 'so that each line builds the right kind of thing.',
      code:
        'Fish  fishOne   = new ___1___();\n'
        + 'Fish  fishTwo   = new ___2___();\n'
        + 'Fish  fishThree = new Fish();\n'
        + 'Shark bigOne    = new ___3___();',
      holes: [
        { n: 1, hint: 'What kind of thing is fishOne? The type on the left tells you.', accept: ['Fish'] },
        { n: 2, hint: 'The same plan builds every one of them.', accept: ['Fish'] },
        { n: 3, hint: 'This one is not a fish.', accept: ['Shark'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'Which statement is TRUE?',
        options: [
          'Every object needs its own class',
          'Classes and objects are the same thing',
          'A class can only ever make one object',
          'Many objects can be built from one class',
        ],
        answer: 3,
        why: 'One class, many objects. That is the entire relationship.',
      },
      {
        id: 'q2',
        stem: 'A game has 30 identical asteroids on screen. How many Asteroid classes does it most '
          + 'likely have?',
        options: ['30', '15', '1', '0'],
        answer: 2,
        why: 'One class, instantiated 30 times.',
      },
      {
        id: 'q3',
        stem: 'In `Crab myCrab = new Crab();`, which part actually builds the object?',
        options: ['Crab myCrab', 'the equals sign', 'new Crab()', 'the semicolon'],
        answer: 2,
        why: '`new Crab()` does the building. The rest gives the result a name.',
      },
      {
        id: 'q4',
        stem: 'You delete every crab from the world. What happens to the Crab class?',
        options: [
          'It is deleted too',
          'It turns into a World',
          'It becomes an object',
          'It stays, and you can make new crabs from it',
        ],
        answer: 3,
        why: 'The plan is independent of the things built from it.',
      },
    ],

    stuck: ['E-01', 'G-03'],

    recap: [
      'A class is the plan. An object is one thing built from that plan.',
      '`new Crab()` builds one crab.',
      'Objects share behavior, because that comes from the class.',
      'Objects do NOT share state. Each keeps its own position.',
    ],
  },

  // ── 1.4 ────────────────────────────────────────────────────────────────────
  {
    lesson: '1.4',
    slug: 'calling-a-method',
    title: 'Calling a Method',
    minutes: 30,
    seo: {
      h1: 'Calling a Method in Greenfoot',
      title: 'How to Call a Method in Java and Greenfoot | Intro to Java',
      description:
        'Learn the anatomy of a Java method call using Greenfoot move, turn and setLocation. '
        + 'Beginner lesson with fill-in-the-code practice and a quiz.',
      primary: 'how to call a method in java',
      related: [
        'greenfoot move method',
        'greenfoot turn method',
        'greenfoot setLocation',
        'java method call syntax',
      ],
      faq: [
        {
          q: 'What does move(4) do in Greenfoot?',
          a: 'It moves the actor 4 cells forward in the direction it is currently facing. It does '
            + 'not move it to position 4.',
        },
        {
          q: 'Why do Java method calls need parentheses?',
          a: 'The parentheses are what make it a call rather than a mention. They also hold the '
            + 'information the method needs, such as the 4 in move(4).',
        },
        {
          q: 'What is the difference between move and setLocation in Greenfoot?',
          a: 'move goes a distance in the direction the actor faces. setLocation puts the actor at '
            + 'exact x and y coordinates regardless of direction.',
        },
      ],
    },

    hook:
      'So far you have made things. Now you make them do something. A method is an action an object '
      + 'already knows how to perform, and calling one is how you ask.',

    objectives: [
      'Name the three parts of a method call',
      'Predict what move, turn and setLocation do to an actor',
      'Call methods on an object directly from the Greenfoot world',
    ],

    vocab: [
      {
        term: 'Method',
        plain: 'An action an object knows how to do.',
        formal: 'A named block of code belonging to a class, which can be called on any object of '
          + 'that class.',
      },
      {
        term: 'Call',
        plain: 'Asking the object to do the action, right now.',
        formal: 'Writing the method name with parentheses causes the method body to execute.',
      },
      {
        term: 'Argument',
        plain: 'The extra information the action needs. The 4 in move(4).',
        formal: 'A value passed into a method call, supplied inside the parentheses.',
      },
    ],

    steps: [
      {
        shot: SHOT('1.4', 1, 'Right-click menu on a crab object in the world, showing its inherited '
          + 'Actor methods including move and turn.'),
        note:
          'Right-click an OBJECT in the world, not the class in the diagram, and Greenfoot lists '
          + 'everything that object knows how to do. This menu is the best beginner tool in the '
          + 'whole program: you can try any method and watch the result immediately, before you '
          + 'have written a line of code.',
      },
      {
        shot: SHOT('1.4', 2, 'A dialog asking for the distance argument for the move method, with 4 '
          + 'typed in.'),
        code: 'move(4);',
        note:
          'Choose move and Greenfoot asks you for a number. Type 4. The crab moves four cells in '
          + 'the direction it is FACING. That last part is the bit beginners miss. move(4) does not '
          + 'mean "go to 4" and it does not mean "go right". It means "go four, that way".\n\n'
          + 'Three parts to read: `move` is the name, `(4)` is the argument, `;` ends the statement.',
      },
      {
        shot: SHOT('1.4', 3, 'The crab rotated 90 degrees after calling the turn method.'),
        code: 'turn(90);',
        note:
          'turn(90) rotates the crab a quarter circle clockwise. Call move(4) again now and it '
          + 'travels in the NEW direction. move and turn work together: turn decides which way, '
          + 'move decides how far.',
      },
      {
        shot: SHOT('1.4', 4, 'The crab placed at an exact grid position after calling setLocation.'),
        code: 'setLocation(0, 0);',
        note:
          'setLocation is different. It ignores which way the crab is facing and puts it at exact '
          + 'coordinates. setLocation(0, 0) is the TOP LEFT corner, not the middle and not the '
          + 'bottom. In Greenfoot, x grows to the right and y grows DOWNWARD, which surprises '
          + 'everyone who remembers graphs from math.',
      },
    ],

    misconceptions: [
      {
        wrong: 'move(4) moves the actor to position 4.',
        right: 'It moves 4 cells forward from wherever it is, in the direction it faces.',
        why: 'Getting this wrong makes every movement bug impossible to reason about.',
      },
      {
        wrong: 'y gets bigger as you go up, like in math.',
        right: 'In Greenfoot, y gets bigger going DOWN. y = 0 is the top edge.',
        why: 'This causes the classic "my jump goes the wrong way" bug in Unit 2.',
      },
      {
        wrong: 'You can call a method without parentheses if it needs no information.',
        right: 'The parentheses are always required. `getX` is a mention; `getX()` is a call.',
        why: 'Missing parentheses is one of the most common first compiler errors.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'A crab is facing right at position (5, 5). You call move(3). Where is it now?',
        options: ['(3, 5)', '(3, 3)', '(5, 8)', '(8, 5)'],
        answer: 3,
        why: 'It moves 3 cells in the direction it faces. Facing right means x increases by 3.',
      },
      {
        id: 'cfu-2',
        stem: 'Which part of `turn(90);` is the argument?',
        options: ['90', 'turn', 'the parentheses', 'the semicolon'],
        answer: 0,
        why: 'The argument is the information you supply, which here is the number of degrees.',
      },
      {
        id: 'cfu-3',
        stem: 'In Greenfoot, where is the point (0, 0)?',
        options: ['The center of the world', 'The bottom left corner', 'The top left corner',
          'Wherever the first actor was placed'],
        answer: 2,
        why: 'x grows to the right and y grows downward, so (0, 0) is the top left.',
      },
      {
        id: 'cfu-4',
        stem: 'You want an actor to appear at exactly (10, 2) no matter which way it is facing. '
          + 'Which method?',
        options: ['move(10)', 'turn(10)', 'setLocation(10, 2)', 'move(10, 2)'],
        answer: 2,
        why: 'setLocation places by coordinates and ignores rotation.',
      },
      {
        id: 'cfu-5',
        stem: 'Why does `move(4)` need parentheses?',
        options: [
          'To make it a call rather than just a mention, and to hold the 4',
          'Java requires parentheses on every line',
          'To make it run faster',
          'They are optional',
        ],
        answer: 0,
        why: 'Parentheses turn a name into a call and carry the arguments.',
      },
    ],

    gap: {
      intro:
        'This code should move a crab forward 5 cells, turn it a quarter turn clockwise, and then '
        + 'move it forward 5 more. Fill in the missing pieces.',
      code:
        'move(___1___);\n'
        + '___2___(90);\n'
        + 'move(5)___3___',
      holes: [
        { n: 1, hint: 'Re-read the goal above the code. It names the distance.', accept: ['5'] },
        { n: 2, hint: 'Which method rotates an actor?', accept: ['turn'] },
        {
          n: 3,
          hint: 'Every Java statement ends with the same single character.',
          accept: [';'],
        },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'An actor faces right. You call turn(180) then move(2). Which way did it travel?',
        options: ['Left', 'Right', 'Up', 'Down'],
        answer: 0,
        why: 'turn(180) reverses the direction, so moving forward now travels left.',
      },
      {
        id: 'q2',
        stem: 'Which statement moves an actor to the top left corner?',
        options: ['setLocation(0, 0);', 'move(0);', 'turn(0);', 'setLocation(0);'],
        answer: 0,
        why: 'setLocation takes an x and a y, and (0, 0) is the top left.',
      },
      {
        id: 'q3',
        stem: 'What is wrong with `move 4;`?',
        options: [
          'Nothing, it is valid',
          '4 is too small a distance',
          'A method call needs parentheses around its arguments',
          'It should be a capital M',
        ],
        answer: 2,
        why: 'Without parentheses this is not a method call and will not compile.',
      },
      {
        id: 'q4',
        stem: 'An actor is at (4, 4) facing down. What does move(2) do?',
        options: ['Moves it to (6, 4)', 'Moves it to (4, 6)', 'Moves it to (2, 4)',
          'Moves it to (4, 2)'],
        answer: 1,
        why: 'Facing down means y increases, because y grows downward in Greenfoot.',
      },
    ],

    stuck: ['E-03', 'E-04', 'G-04', 'R-02'],

    recap: [
      'A method call is a name, parentheses, and usually an argument, ending in a semicolon.',
      'move(n) goes n cells in the direction the actor faces.',
      'turn(d) rotates by d degrees clockwise.',
      'setLocation(x, y) places by exact coordinates and ignores facing.',
      'y grows DOWNWARD. (0, 0) is the top left corner.',
    ],
  },

  // ── 1.5 ────────────────────────────────────────────────────────────────────
  {
    lesson: '1.5',
    slug: 'parameters-and-return-values',
    title: 'Parameters and Return Values',
    minutes: 30,
    seo: {
      h1: 'Parameters and Return Values in Java',
      title: 'Java Parameters and Return Values Explained | Intro to Java',
      description:
        'How to read a Java method signature: what void means, what a parameter is, and how to use '
        + 'a value a method gives back. Beginner lesson with practice.',
      primary: 'java method signature explained',
      related: [
        'what does void mean in java',
        'java return value beginner',
        'greenfoot getX getY',
        'java parameters vs arguments',
      ],
      faq: [
        {
          q: 'What does void mean in Java?',
          a: 'void means the method does its job but hands nothing back. move is void: it moves the '
            + 'actor and gives you no value to store.',
        },
        {
          q: 'What is the difference between a parameter and an argument?',
          a: 'The parameter is the slot in the method definition. The argument is the actual value '
            + 'you put in that slot when you call it.',
        },
        {
          q: 'How do I use the value getX() gives back?',
          a: 'Store it in a variable or use it directly inside another call, for example '
            + 'setLocation(getX() + 1, getY()).',
        },
      ],
    },

    hook:
      'Every method you will ever meet answers two questions: what do I have to give it, and what '
      + 'does it give me back? Learn to read those two answers off a single line and you can use a '
      + 'method you have never seen before.',

    objectives: [
      'Read a method signature and say what it needs and what it returns',
      'Explain what void means',
      'Use a returned value inside another method call',
    ],

    vocab: [
      {
        term: 'Parameter',
        plain: 'The slot. What the method needs you to supply.',
        formal: 'A named, typed variable in a method definition, filled in by the caller.',
      },
      {
        term: 'Argument',
        plain: 'The actual value you put in the slot.',
        formal: 'The expression supplied at the call site for a given parameter.',
      },
      {
        term: 'Return type',
        plain: 'What kind of answer you get back, or void for none.',
        formal: 'The type written before the method name, describing the value the method produces.',
      },
    ],

    steps: [
      {
        shot: SHOT('1.5', 1, 'Greenfoot documentation for the Actor class showing the signature of '
          + 'the move method.'),
        code: 'void move(int distance)',
        note:
          'Read it left to right and it answers both questions.\n\n'
          + '`void` is the return type: this method hands nothing back.\n'
          + '`move` is the name.\n'
          + '`(int distance)` is the parameter list: you must supply one whole number, and inside '
          + 'the method it will be called distance.\n\n'
          + 'So a legal call is move(4). Not move(). Not move("far"). One whole number.',
      },
      {
        shot: SHOT('1.5', 2, 'Documentation showing the getX method signature with an empty '
          + 'parameter list and an int return type.'),
        code: 'int getX()',
        note:
          'This one is the mirror image. `int` means it hands back a whole number. `()` empty means '
          + 'it needs nothing from you.\n\n'
          + 'That difference changes how you use it. move(4) is a complete instruction on its own. '
          + 'getX() is a question, and a question you never listen to the answer of is pointless.',
      },
      {
        shot: SHOT('1.5', 3, 'A crab in the world with its current x coordinate displayed in a '
          + 'Greenfoot result dialog.'),
        code: 'int where = getX();',
        note:
          'You have not met `int where =` yet, that is Unit 2. For now read it as a labeled box: '
          + 'the answer comes out of getX() and goes into a box named `where`, and you can use the '
          + 'box as many times as you like.\n\n'
          + 'One way to listen: store the answer. `getX()` runs and produces a number; `int where =` '
          + 'catches it and gives it a name. Now you can use `where` as many times as you like.',
      },
      {
        shot: SHOT('1.5', 4, 'The crab shifted one cell to the right after a setLocation call built '
          + 'from getX and getY.'),
        code: 'setLocation(getX() + 1, getY());',
        note:
          'The other way: use the answer immediately, inside another call. Read this from the '
          + 'inside out. getX() gives the current x. Add 1. getY() gives the current y, unchanged. '
          + 'Hand both to setLocation.\n\n'
          + 'The result is "move one cell right, whichever way I happen to be facing". You will '
          + 'write this exact line in Unit 2 to make arrow keys work, so it is worth reading twice.',
      },
    ],

    misconceptions: [
      {
        wrong: 'void means the method is empty or broken.',
        right: 'void means it does something useful but hands no value back.',
        why: 'move is void and is the most useful method in Unit 1.',
      },
      {
        wrong: 'getX() moves the actor to x.',
        right: 'getX() only reports. It changes nothing.',
        why: 'Methods that ask and methods that act are different tools; mixing them up produces '
          + 'code that seems to do nothing.',
      },
      {
        wrong: 'You can leave the parentheses off getX because it takes nothing.',
        right: 'Empty parentheses are still required: getX().',
        why: 'This is a compiler error beginners hit constantly, and the message is not obvious.',
      },
      {
        wrong: 'setLocation(getX() + 1, getY()) needs the actor to face right.',
        right: 'It ignores facing entirely. It adds one to the x coordinate.',
        why: 'Understanding this is what separates coordinate movement from move/turn movement.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'A method signature reads `void turn(int amount)`. What does it give back?',
        options: ['An int', 'Nothing', 'An Actor', 'A World'],
        answer: 1,
        why: 'void is the return type, and void means no value comes back.',
      },
      {
        id: 'cfu-2',
        stem: 'Given `int getY()`, which call is written correctly?',
        options: ['getY', 'getY()', 'getY(0)', 'int getY()'],
        answer: 1,
        why: 'Empty parameter list still needs the parentheses, and you do not repeat the return '
          + 'type when calling.',
      },
      {
        id: 'cfu-3',
        stem: 'An actor is at (7, 3). What does `setLocation(getX() + 2, getY());` do?',
        options: ['Moves it to (9, 3)', 'Moves it to (7, 5)', 'Moves it to (2, 3)',
          'Nothing, it is not valid'],
        answer: 0,
        why: 'getX() is 7, plus 2 is 9. getY() is 3 and is passed through unchanged.',
      },
      {
        id: 'cfu-4',
        stem: 'In `move(6)`, what is 6 called?',
        options: ['The parameter', 'The argument', 'The return value', 'The signature'],
        answer: 1,
        why: 'The slot in the definition is the parameter; the value you actually pass is the '
          + 'argument.',
      },
      {
        id: 'cfu-5',
        stem: 'Why is `int where = move(4);` wrong?',
        options: [
          '4 is not a valid distance',
          'move returns void, so there is no value to store',
          'where is a reserved word',
          'It should be double instead of int',
        ],
        answer: 1,
        why: 'You cannot catch a value from a method that hands nothing back.',
      },
    ],

    gap: {
      intro:
        'This line should move an actor one cell DOWN, leaving its x coordinate alone. Remember '
        + 'which direction y grows in Greenfoot.',
      code: 'setLocation(___1___, ___2___ + ___3___);',
      holes: [
        {
          n: 1,
          hint: 'x is not changing, so ask the actor for its current x.',
          accept: ['getX()'],
        },
        {
          n: 2,
          hint: 'Start from the current y.',
          accept: ['getY()'],
        },
        {
          n: 3,
          hint: 'y grows downward, so moving down means adding this much.',
          accept: ['1'],
        },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'What does the `int` at the start of `int getX()` tell you?',
        options: [
          'The method needs a whole number',
          'The method hands back a whole number',
          'The method is called int',
          'The method is not finished',
        ],
        answer: 1,
        why: 'The type before the name is the RETURN type.',
      },
      {
        id: 'q2',
        stem: 'Which of these is a valid call to `void move(int distance)`?',
        options: ['move();', 'move(3);', 'move("3");', 'int m = move(3);'],
        answer: 1,
        why: 'One whole number argument, and no value comes back to store.',
      },
      {
        id: 'q3',
        stem: 'An actor is at (2, 8). After `setLocation(getX(), getY() - 1);` where is it?',
        options: ['(2, 7)', '(2, 9)', '(1, 8)', '(3, 8)'],
        answer: 0,
        why: 'y goes from 8 to 7. Since y grows downward, that is one cell UP the screen.',
      },
      {
        id: 'q4',
        stem: 'What is the difference between a parameter and an argument?',
        options: [
          'They are two words for the same thing',
          'The parameter is the slot in the definition; the argument is the value passed in',
          'The parameter is the value passed in; the argument is the slot',
          'Parameters are for void methods only',
        ],
        answer: 1,
        why: 'Definition has parameters. Calls supply arguments.',
      },
    ],

    stuck: ['E-03', 'E-05', 'E-06', 'R-02'],

    recap: [
      'A signature answers two questions: what must I give it, and what do I get back?',
      'void means nothing comes back. It does not mean nothing happens.',
      'Empty parentheses are still required: getX(), never getX.',
      'A returned value can be stored in a variable or used directly inside another call.',
      'setLocation(getX() + 1, getY()) moves one cell right regardless of facing.',
    ],
  },

  // ── 1.6 ────────────────────────────────────────────────────────────────────
  {
    lesson: '1.6',
    slug: 'the-act-method',
    title: 'The act() Method',
    minutes: 35,
    seo: {
      h1: 'The act() Method: Greenfoot\'s Game Loop',
      title: 'Greenfoot act() Method Explained for Beginners | Intro to Java',
      description:
        'What the Greenfoot act method is, how often it runs, and why you must never put a forever '
        + 'loop inside it. Beginner Java lesson with practice and a quiz.',
      primary: 'greenfoot act method',
      related: [
        'what does act do in greenfoot',
        'greenfoot game loop',
        'greenfoot act not running',
        'greenfoot infinite loop freeze',
      ],
      faq: [
        {
          q: 'How often does act() run in Greenfoot?',
          a: 'Once per frame, for every actor in the world, repeatedly, for as long as the scenario '
            + 'is running. Pressing Act runs it exactly once.',
        },
        {
          q: 'Why does my Greenfoot scenario freeze?',
          a: 'Almost always a forever loop inside act(). act() is already the repetition, so a '
            + 'while(true) inside it never gives the frame back and the window locks up.',
        },
        {
          q: 'Why is my act() method not running?',
          a: 'Check that you compiled, that the actor is actually in the world, and that the method '
            + 'is spelled act with no arguments and public void in front.',
        },
      ],
    },

    hook:
      'Everything so far you did by hand: right-click, choose a method, watch it happen. Games do '
      + 'not have somebody right-clicking sixty times a second. act() is where you write down what '
      + 'should happen automatically, over and over, forever.',

    objectives: [
      'Explain when Greenfoot calls act() and how often',
      'Write behavior inside act() by filling in the gaps',
      'Explain why a forever loop inside act() freezes the scenario',
    ],

    vocab: [
      {
        term: 'act()',
        plain: 'The method Greenfoot calls for you, once every frame.',
        formal: 'A method every Actor and World may override. Greenfoot invokes it once per actor '
          + 'per frame while the scenario is running.',
      },
      {
        term: 'Game loop',
        plain: 'The endless repeat that makes a game move.',
        formal: 'The cycle of updating every object once per frame. In Greenfoot this loop is '
          + 'provided for you; act() is your hook into it.',
      },
    ],

    steps: [
      {
        shot: SHOT('1.6', 1, 'The Crab class code open, showing an empty act method with a comment '
          + 'inside it.'),
        code:
          'public class Crab extends Actor\n'
          + '{\n'
          + '    public void act()\n'
          + '    {\n'
          + '        // your code goes here\n'
          + '    }\n'
          + '}',
        note:
          'Every actor class starts with this. It is empty, which is why a new actor sits there '
          + 'doing nothing. Greenfoot is already calling this method for you, sixty-odd times a '
          + 'second while the scenario runs. It just has nothing to do.\n\n'
          + 'Read the signature with what you learned in 1.5: `void` so nothing comes back, `act` '
          + 'is the name, `()` so it needs nothing from you. YOU never call this method. Greenfoot '
          + 'calls it.',
      },
      {
        shot: SHOT('1.6', 2, 'The crab moving steadily across the world after a move call was added '
          + 'to act.'),
        code:
          'public void act()\n'
          + '{\n'
          + '    move(2);\n'
          + '}',
        note:
          'One line, and the crab walks by itself. Compile, then press Run.\n\n'
          + 'Look at what that line actually says: "move 2". Not "move 2 over and over". The '
          + 'repetition is not in your code at all. It comes from Greenfoot calling act() again '
          + 'next frame, and the frame after that.',
      },
      {
        shot: SHOT('1.6', 3, 'The crab part way across the world, paused mid-journey after a single '
          + 'press of the Act button.'),
        note:
          'Press Reset, then press ACT once instead of Run. The crab moves 2 cells and stops. Press '
          + 'it again: 2 more.\n\n'
          + 'This is the clearest demonstration of what a frame is, and it is worth doing rather '
          + 'than reading. Run is just this button held down.',
      },
      {
        shot: SHOT('1.6', 4, 'The crab turning back on itself at the edge of the world.'),
        code:
          'public void act()\n'
          + '{\n'
          + '    move(2);\n'
          + '    if (isAtEdge())\n'
          + '    {\n'
          + '        turn(180);\n'
          + '    }\n'
          + '}',
        note:
          'Now it patrols. Each frame: move 2, then ask "am I at the edge?", and if so turn around.\n\n'
          + 'You have not formally met `if` yet, that is Unit 2. Read it as plain English for now: '
          + 'IF the thing in the parentheses is true, do what is in the braces. `isAtEdge()` is a '
          + 'method that hands back true or false, which is exactly the shape of thing an if needs.',
      },
    ],

    misconceptions: [
      {
        wrong: 'act() runs once when the scenario starts.',
        right: 'act() runs once per frame, over and over, for as long as the scenario runs.',
        why: 'Believing it runs once makes all animation seem impossible.',
      },
      {
        wrong: 'I need a loop inside act() to keep the crab moving.',
        right: 'act() IS the loop. One move(2) per frame is continuous movement.',
        why: 'This is the big one. A `while (true)` inside act() never returns, so Greenfoot never '
          + 'gets to draw the next frame and the whole window freezes. It looks like a crash and it '
          + 'is the most common way a beginner loses their work.',
      },
      {
        wrong: 'I should call act() myself to make things happen.',
        right: 'Greenfoot calls it. You only write what goes inside it.',
        why: 'Calling act() by hand produces confusing double-speed behavior and hides real bugs.',
      },
      {
        wrong: 'A bigger number in move() makes the animation smoother.',
        right: 'A bigger number makes bigger jumps per frame, which is LESS smooth.',
        why: 'Smoothness comes from small steps happening often.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'How many times does Greenfoot call act() on an actor while the scenario is running?',
        options: ['Once', 'Once per actor, ever', 'Once every frame, repeatedly', 'Only when you '
          + 'right-click it'],
        answer: 2,
        why: 'Once per frame, for as long as it runs. That repetition is the game loop.',
      },
      {
        id: 'cfu-2',
        stem: 'An act() method contains only `move(3);`. You press Act four times. How far has the '
          + 'actor traveled in total?',
        options: ['3 cells', '4 cells', '12 cells', 'It does not move without Run'],
        answer: 2,
        why: 'Four frames, 3 cells each, is 12.',
      },
      {
        id: 'cfu-3',
        stem: 'Why does putting `while (true) { move(1); }` inside act() freeze the scenario?',
        options: [
          'move(1) is too small',
          'act() never finishes, so Greenfoot can never draw the next frame',
          'while loops are not allowed in Greenfoot',
          'It needs a semicolon',
        ],
        answer: 1,
        why: 'Greenfoot needs act() to RETURN so it can move on. A forever loop never returns.',
      },
      {
        id: 'cfu-4',
        stem: 'Who calls act()?',
        options: ['You do, from another method', 'Greenfoot does, automatically',
          'The World calls it once', 'Nobody, it runs itself at compile time'],
        answer: 1,
        why: 'You write the body; Greenfoot does the calling.',
      },
      {
        id: 'cfu-5',
        stem: 'What does `isAtEdge()` hand back?',
        options: ['A number of cells', 'true or false', 'The world', 'Nothing, it is void'],
        answer: 1,
        why: 'It reports whether the actor is touching the edge, so it returns a true/false value.',
      },
    ],

    gap: {
      intro:
        'Complete this act() method so the actor walks forward 3 cells every frame and turns right '
        + 'around whenever it reaches the edge of the world.',
      code:
        'public void ___1___()\n'
        + '{\n'
        + '    ___2___(3);\n'
        + '    if (___3___)\n'
        + '    {\n'
        + '        turn(___4___);\n'
        + '    }\n'
        + '}',
      holes: [
        {
          n: 1,
          hint: 'The method Greenfoot calls for you once per frame.',
          accept: ['act'],
        },
        {
          n: 2,
          hint: 'Which method travels forward in the direction the actor faces?',
          accept: ['move'],
        },
        {
          n: 3,
          hint: 'A method that reports true when the actor has reached the edge. Do not forget the '
            + 'parentheses.',
          accept: ['isAtEdge()'],
        },
        {
          n: 4,
          hint: 'Turning right around is half a full circle, in degrees.',
          accept: ['180'],
        },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'act() is best described as:',
        options: [
          'A method you call to start the game',
          'A method Greenfoot calls once per frame',
          'A loop you must write yourself',
          'The world constructor',
        ],
        answer: 1,
        why: 'It is your hook into a loop Greenfoot already runs.',
      },
      {
        id: 'q2',
        stem: 'Which act() body makes an actor move continuously and smoothly?',
        options: [
          'while (true)\n{\n    move(1);\n}',
          'move(1);',
          'move(100);',
          'for (int i = 0; i < 1000; i++)\n{\n    move(1);\n}',
        ],
        answer: 1,
        why: 'One small step per frame. The other three either freeze the scenario or jump.',
      },
      {
        id: 'q3',
        stem: 'A scenario locks up and stops responding as soon as you press Run. What is the most '
          + 'likely cause?',
        options: [
          'The image file is too large',
          'A loop inside act() that never ends',
          'Too many actors',
          'The speed slider is too high',
        ],
        answer: 1,
        why: 'act() must return every frame. A forever loop inside it is the classic freeze.',
      },
      {
        id: 'q4',
        stem: 'You press Act exactly once on an actor whose act() body is `move(5); turn(90);`. '
          + 'What happened?',
        options: [
          'It moved 5 and turned 90, once',
          'It moved 5 repeatedly',
          'It turned 90 only',
          'Nothing until you press Run',
        ],
        answer: 0,
        why: 'One press of Act is one full pass through the body.',
      },
      {
        id: 'q5',
        stem: 'Why should you NOT call act() yourself from your own code?',
        options: [
          'It is private',
          'Greenfoot already calls it every frame, so calling it again makes behavior double up',
          'It does not compile',
          'It would delete the actor',
        ],
        answer: 1,
        why: 'You would be adding an extra pass on top of the one Greenfoot already does.',
      },
    ],

    stuck: ['E-07', 'G-01', 'G-04', 'G-05', 'R-03'],

    recap: [
      'Greenfoot calls act() once per frame, for every actor, forever.',
      'You write the body. You never call act() yourself.',
      'act() IS the repetition. One small move per frame is continuous motion.',
      'A forever loop inside act() freezes the whole scenario, because act() must return.',
      'Act runs one frame. Run repeats it.',
    ],
  },
];

module.exports = { course: COURSE, unit: UNIT, label: LABEL, lessons: LESSONS };
