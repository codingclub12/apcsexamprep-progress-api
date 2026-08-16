'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  INTRO TO JAVA: THE GETTING-UNSTUCK CATALOG.
//
//  Error pages, Greenfoot "it compiled but it is wrong" pages, and how-to
//  recipes. These are REFERENCE pages, not lessons: they carry no manifest row,
//  pageFromHandle deliberately does not match them, and visiting one is not
//  progress. A student who needs help most must never be the student whose
//  dashboard looks busiest.
//
//  ── WHY THIS IS A CATALOG AND NOT 40 LOOSE PAGES ────────────────────────────
//  Lessons reference help by CODE (E-01, G-03, R-02), and smoke/intro-java-content.js
//  fails if a lesson points at a code that does not exist here. That turns "the
//  support pages are comprehensive" from a claim into something a test can hold.
//
//  The `after` field is the lesson a student must have reached for the page to
//  make sense. A recipe that uses loops must not be handed to somebody in Unit 1,
//  and the smoke test checks that no lesson links forward past itself.
//
//  Each error page follows the same four-block shape, which is what makes them
//  usable at 11pm by a panicking beginner:
//    1. the message, verbatim, so it is searchable and recognisable
//    2. what it actually means, in plain language
//    3. the usual causes, RANKED by how often they are the answer
//    4. a worked fix
//
//  Zero PII. No em-dashes, per repo convention. ASCII only.
// ─────────────────────────────────────────────────────────────────────────────

const SEO = (primary, description) => ({ primary, description });

// ── Compiler and runtime errors ──────────────────────────────────────────────
const ERRORS = [
  {
    code: 'E-01', after: '1.1',
    handle: 'intro-java-help-error-cannot-find-symbol',
    title: 'Java error: cannot find symbol',
    message: 'cannot find symbol',
    means: 'You used a name Java has never been told about. Almost always a typo, a missing '
      + 'declaration, or the wrong capital letter.',
    causes: [
      'A spelling or capitalisation difference. Java thinks Crab and crab are two different things.',
      'You used a variable before declaring it.',
      'The class exists but you have not compiled since you created it.',
      'You meant a method and forgot the parentheses, so Java looked for a variable by that name.',
    ],
    seo: SEO('java cannot find symbol greenfoot',
      'What the Java error cannot find symbol means in Greenfoot, the four usual causes ranked, '
      + 'and how to fix each one. Written for beginners.'),
  },
  {
    code: 'E-02', after: '1.2',
    handle: 'intro-java-help-error-semicolon-expected',
    title: "Java error: ';' expected",
    message: "';' expected",
    means: 'A statement was not finished off. Java reached the end of what looked like an '
      + 'instruction and found no semicolon.',
    causes: [
      'A missing semicolon at the end of the line ABOVE the one the error points at.',
      'A missing closing parenthesis, which makes Java read the rest of the line as part of the call.',
      'A stray word left over from an edit.',
    ],
    seo: SEO('java semicolon expected error',
      'Why Java says semicolon expected, why the real mistake is usually on the line above, and '
      + 'how to find it fast. Beginner friendly.'),
  },
  {
    code: 'E-03', after: '1.4',
    handle: 'intro-java-help-error-incompatible-types',
    title: 'Java error: incompatible types',
    message: 'incompatible types: X cannot be converted to Y',
    means: 'You tried to put a value of one kind into a slot built for another kind.',
    causes: [
      'Storing the result of a void method, which produces no value at all.',
      'Passing text where a number was wanted, such as move("4") instead of move(4).',
      'Mixing up int and boolean, often by using = where you meant ==.',
    ],
    seo: SEO('java incompatible types error beginner',
      'What incompatible types means in Java, with the three causes beginners hit most and a '
      + 'worked fix for each.'),
  },
  {
    code: 'E-04', after: '1.4',
    handle: 'intro-java-help-error-illegal-start-of-expression',
    title: 'Java error: illegal start of expression',
    means: 'Java found something in a place where that kind of thing is not allowed. Usually a '
      + 'brace problem rather than a problem on the line named.',
    message: 'illegal start of expression',
    causes: [
      'A missing closing brace, so Java thinks a method is still open.',
      'A method declared inside another method, which Java does not allow.',
      'A missing parenthesis in an if condition.',
    ],
    seo: SEO('illegal start of expression java',
      'Why Java reports illegal start of expression, why the cause is usually a brace and not the '
      + 'line shown, and how to fix it.'),
  },
  {
    code: 'E-05', after: '1.5',
    handle: 'intro-java-help-error-missing-return-statement',
    title: 'Java error: missing return statement',
    message: 'missing return statement',
    means: 'A method promised to hand back a value and there is a path through it that hands back '
      + 'nothing.',
    causes: [
      'A return inside an if with no return for the else path.',
      'The method should have been void and was declared with a type by mistake.',
      'A return that is unreachable because it sits after a loop that always exits earlier.',
    ],
    seo: SEO('java missing return statement fix',
      'What missing return statement means, why an if without an else causes it, and how to fix '
      + 'it. Beginner Java help.'),
  },
  {
    code: 'E-06', after: '1.5',
    handle: 'intro-java-help-error-method-not-applicable',
    title: 'Java error: method cannot be applied to given types',
    message: 'method X in class Y cannot be applied to given types',
    means: 'The method exists, but you gave it the wrong number of arguments or the wrong kinds.',
    causes: [
      'Calling with no arguments a method that requires one, such as move() instead of move(4).',
      'Passing two arguments to a method that takes one.',
      'Passing a decimal where a whole number was wanted.',
    ],
    seo: SEO('java cannot be applied to given types',
      'Why Java says a method cannot be applied to given types, how to read the required and found '
      + 'lines, and how to fix the call.'),
  },
  {
    code: 'E-07', after: '1.6',
    handle: 'intro-java-help-error-null-pointer-exception',
    title: 'Java error: NullPointerException',
    message: 'java.lang.NullPointerException',
    means: 'You asked something to do a job, but that something was not there. In Greenfoot this '
      + 'usually means an actor that is not in a world, or a variable never given a value.',
    causes: [
      'Calling getWorld() on an actor that has been removed from the world.',
      'Using a variable that was declared but never assigned.',
      'Using the result of a get method that found nothing and handed back null.',
    ],
    seo: SEO('greenfoot nullpointerexception beginner',
      'What a NullPointerException means in Greenfoot, the three usual causes, and how to find the '
      + 'line that is actually at fault.'),
  },
];

// ── Greenfoot behaviour problems: it compiled, and it is still wrong ──────────
// These are where beginners actually lose afternoons, and no error message
// exists to search for, which is exactly why the pages have to exist.
const GOTCHAS = [
  {
    code: 'G-01', after: '1.2',
    handle: 'intro-java-help-my-changes-do-nothing',
    title: 'I changed my code and nothing happened',
    means: 'The running scenario is still using the previous version of your code.',
    causes: [
      'You did not compile. Hatched stripes on the class diagram mean exactly this.',
      'You edited a different class from the one in the world.',
      'You pressed Run without pressing Reset, so the old objects are still there.',
    ],
    seo: SEO('greenfoot changes not taking effect',
      'Why editing code in Greenfoot seems to do nothing, what the hatched class diagram means, '
      + 'and the order to press the buttons in.'),
  },
  {
    code: 'G-02', after: '1.2',
    handle: 'intro-java-help-my-actors-disappeared',
    title: 'My actors disappeared when I pressed Reset',
    means: 'Reset builds a brand new world, and actors you placed by hand are not part of that build.',
    causes: [
      'The actors were dragged in by hand rather than created in code.',
      'The world has no prepare() method yet, which is Unit 3.',
    ],
    seo: SEO('greenfoot actors disappear on reset',
      'Why Greenfoot actors vanish when you press Reset, why that is correct behaviour, and how to '
      + 'make them come back automatically.'),
  },
  {
    code: 'G-03', after: '1.3',
    handle: 'intro-java-help-changing-one-actor-changes-all',
    title: 'Changing one actor seems to change all of them',
    means: 'Usually it does not, and what you are seeing is every object running the same behaviour '
      + 'at the same time.',
    causes: [
      'Every object of a class runs the same act() body, so they all move identically.',
      'You used a value shared by the class rather than per-object state.',
      'They all started in the same place, so they look like one actor.',
    ],
    seo: SEO('greenfoot all actors move the same',
      'Why every actor in a Greenfoot class behaves identically, and how per-object state makes '
      + 'them differ. Beginner explanation.'),
  },
  {
    code: 'G-04', after: '1.4',
    handle: 'intro-java-help-my-actor-will-not-move',
    title: 'My actor will not move',
    means: 'Either act() is not running, or it is running and moving zero.',
    causes: [
      'The scenario is not running. Press Run, or press Act to step once.',
      'The move call is not inside act(), so nothing calls it.',
      'The actor is at the edge and is being pushed back to the same cell.',
      'You compiled a different class.',
    ],
    seo: SEO('greenfoot actor not moving fix',
      'Why a Greenfoot actor does not move, the four causes ranked by how often they are the '
      + 'answer, and how to test each one.'),
  },
  {
    code: 'G-05', after: '1.6',
    handle: 'intro-java-help-greenfoot-freezes',
    title: 'Greenfoot freezes as soon as I press Run',
    means: 'Something inside act() never finishes, so Greenfoot never gets the chance to draw the '
      + 'next frame.',
    causes: [
      'A while (true) loop inside act(). This is by far the most common cause.',
      'A loop whose condition can never become false.',
      'A method that calls itself with no stopping case.',
    ],
    seo: SEO('greenfoot freezes when i press run',
      'Why Greenfoot locks up when you press Run, why a loop inside act causes it, and how to fix '
      + 'it without losing your work.'),
  },
];

// ── How-to recipes: the game-design surface ──────────────────────────────────
const RECIPES = [
  {
    code: 'R-01', after: '1.1',
    handle: 'intro-java-help-recipe-open-and-run-a-scenario',
    title: 'How to open and run a Greenfoot scenario',
    seo: SEO('how to open a greenfoot scenario',
      'Step by step: open an existing Greenfoot scenario, run it, pause it, and reset it. The '
      + 'first thing to do in the course.'),
  },
  {
    code: 'R-02', after: '1.4',
    handle: 'intro-java-help-recipe-move-an-actor',
    title: 'How to make an actor move',
    seo: SEO('how to move an actor in greenfoot',
      'Two ways to move a Greenfoot actor: move and turn for direction-based movement, and '
      + 'setLocation for exact coordinates.'),
  },
  {
    code: 'R-03', after: '1.6',
    handle: 'intro-java-help-recipe-keep-an-actor-in-the-world',
    title: 'How to stop an actor leaving the world',
    seo: SEO('greenfoot keep actor inside world',
      'How to stop a Greenfoot actor walking off the edge, using isAtEdge and setLocation. Beginner '
      + 'recipe with working code.'),
  },
];

const ALL = [...ERRORS, ...GOTCHAS, ...RECIPES];

// code -> entry, for the renderer's "if you get stuck" links.
const INDEX = {};
for (const h of ALL) INDEX[h.code] = h;

module.exports = { ERRORS, GOTCHAS, RECIPES, ALL, INDEX };
