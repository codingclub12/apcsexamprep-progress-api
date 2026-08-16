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
    fix:
      'Read the name Java printed and search your file for it. Compare it letter by letter with where you declared it, including capitals. If the name looks right, check you have compiled since you created the class, and check a method call has its parentheses.',
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
    fix:
      'Look at the line ABOVE the one Java names. Java reports the point where it noticed, not the point where you slipped. Add the missing semicolon there, or close the parenthesis you left open.',
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
    fix:
      'Read the two types Java names: it wanted the first and got the second. Then ask which half is wrong. Storing a void result means deleting the assignment; text where a number belongs means removing the quotes; a condition means you probably typed = instead of ==',
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
    fix:
      'Ignore the line number and count your braces instead. Every { needs a }. Re-indent the whole method: the place where the indentation stops making sense is where the brace is missing.',
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
    fix:
      'Trace every path through the method and check each one ends in a return. An if with a return but no else is the usual cause. Either add a return after the if, or give the else one of its own.',
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
    fix:
      'Compare the required and found lines Java prints. Count the arguments on each side, then check their types. move() needs one whole number; move(4) is right and move() is not.',
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
    fix:
      'Find the line Java names and ask which thing on it could be missing. In Greenfoot the usual answer is an actor that was removed from the world and is still trying to act. Guard it with a check before you use it.',
    seo: SEO('greenfoot nullpointerexception beginner',
      'What a NullPointerException means in Greenfoot, the three usual causes, and how to find the '
      + 'line that is actually at fault.'),
  },
  {
    code: 'E-08', after: '2.1',
    handle: 'intro-java-help-error-variable-already-defined',
    title: 'Java error: variable is already defined',
    message: 'variable X is already defined in method Y',
    means: 'You declared the same variable name twice in the same place. The second declaration is '
      + 'trying to make a box that already exists.',
    causes: [
      'Writing the type again on a later line: `int score = 0;` then `int score = 10;`.',
      'Two variables with the same name in the same method.',
      'A parameter and a local variable sharing a name.',
    ],
    fix:
      'Delete the type from the SECOND line. `int score = 0;` then `score = 10;` is correct. The type appears once, when the box is made.',
    seo: SEO('java variable is already defined',
      'Why Java says a variable is already defined, why the fix is usually deleting the type on '
      + 'the second line, and how to spot it.'),
  },
  {
    code: 'E-09', after: '2.3',
    handle: 'intro-java-help-error-int-cannot-be-converted-to-boolean',
    title: 'Java error: int cannot be converted to boolean',
    message: 'incompatible types: int cannot be converted to boolean',
    means: 'Something that needed a true or false question was given a number or an instruction '
      + 'instead. In an if condition this almost always means = was typed where == was meant.',
    causes: [
      'Using a single = inside an if: `if (score = 10)` instead of `if (score == 10)`.',
      'Using a number as a condition, such as `if (lives)` instead of `if (lives > 0)`.',
      'Assigning to a boolean from an int.',
    ],
    fix:
      'Look inside the round brackets of your if and count the equals signs. One means you are assigning; you almost certainly want two, which compares. If there is no equals sign at all, you may be using a number where a true or false question belongs.',
    seo: SEO('int cannot be converted to boolean java if',
      'Why Java says int cannot be converted to boolean, why it usually means you typed = instead '
      + 'of ==, and how to fix the condition.'),
  },
  {
    code: 'E-10', after: '5.1',
    handle: 'intro-java-help-error-array-index-out-of-bounds',
    title: 'Java error: ArrayIndexOutOfBoundsException',
    message: 'java.lang.ArrayIndexOutOfBoundsException: Index 5 out of bounds for length 5',
    means: 'You asked an array for a slot it does not have. The array is fine; the index is wrong.',
    causes: [
      'A loop using <= instead of <, so it runs one past the end. The message shows an index '
        + 'exactly equal to the length.',
      'Using a.length as an index instead of a.length - 1.',
      'On a 2D array, the two subscripts are swapped and the grid is not square.',
      'A level or wave counter that has grown past the last entry in its array.',
    ],
    fix:
      'Read the message: it names the index you tried AND the length. If the index equals the '
      + 'length exactly, change <= to < in the loop, or use a.length - 1 for the last element. On '
      + 'a 2D array, check that row is the FIRST subscript.',
    seo: SEO('arrayindexoutofboundsexception java fix',
      'What ArrayIndexOutOfBoundsException means, how to read the index and length in the message, '
      + 'and the four usual causes ranked.'),
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
    fix:
      'Press Compile and wait for the stripes to clear from the class diagram, then press Reset, then Run. In that order. If the stripes will not clear, there is a compiler error to fix first.',
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
    fix:
      'This is working as designed. To make actors appear every time, put the addObject calls in the world\'s prepare() method, which Unit 3 covers. Until then, drag them in again after each Reset.',
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
    fix:
      'Check whether they are really identical or just doing the same thing. Every object of a class runs the same act() body, so identical behaviour is expected. If you need them to differ, give each one its own instance variable, which is lesson 3.8.',
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
    fix:
      'Press Act once. If the actor moves, the scenario simply was not running. If it does not, check the move call is inside act(), check you compiled, and check the actor is not pinned against the edge being clamped back to the same cell.',
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
    fix:
      'Force-quit Greenfoot, reopen it, and look inside act() for a loop. act() must FINISH every frame. Delete the loop: act() is already the repetition, so one small step per frame is all you need.',
    seo: SEO('greenfoot freezes when i press run',
      'Why Greenfoot locks up when you press Run, why a loop inside act causes it, and how to fix '
      + 'it without losing your work.'),
  },
  {
    code: 'G-06', after: '2.2',
    handle: 'intro-java-help-my-maths-is-wrong',
    title: 'My maths gives the wrong answer and there is no error',
    means: 'Almost always integer division. When both numbers are whole numbers Java throws the '
      + 'remainder away instead of rounding.',
    causes: [
      'Dividing two ints and expecting a decimal: 7 / 2 gives 3, not 3.5.',
      'Storing a decimal result into an int, which truncates it.',
      'Expecting Java to round. It does not; it cuts.',
    ],
    fix:
      'Decide whether you want a whole number. If you do, use % to catch the remainder rather than losing it. If you do not, make one side a decimal: 7.0 / 2 gives 3.5.',
    seo: SEO('java division wrong answer no error',
      'Why Java arithmetic silently gives the wrong answer, how integer division truncates, and '
      + 'the one-character fix.'),
  },
  {
    code: 'G-07', after: '2.4',
    handle: 'intro-java-help-my-if-always-runs',
    title: 'My if statement always runs',
    means: 'The if is probably not controlling the block you think it is.',
    causes: [
      'A semicolon straight after the condition: `if (x > 5);` ends the if immediately.',
      'Missing braces, so only the first line below is controlled by the if.',
      'The condition is not what you think, often = instead of ==.',
    ],
    fix:
      'Look for a semicolon straight after the closing round bracket of the condition and delete it. If there is none, check the braces really wrap the lines you meant, and check the condition uses == rather than =.',
    seo: SEO('java if statement always runs',
      'Why a Java if statement runs every time, the stray semicolon that causes it, and why there '
      + 'is never an error message for it.'),
  },
  {
    code: 'G-08', after: '2.5',
    handle: 'intro-java-help-my-else-if-never-runs',
    title: 'One of my else if branches never runs',
    means: 'A condition earlier in the chain is catching everything that branch was meant to catch.',
    causes: [
      'A wide condition placed before a narrow one, so the narrow one is unreachable.',
      'Overlapping ranges, where the first match wins and the rest never get tested.',
      'Expecting every condition to be checked. The chain stops at the first true one.',
    ],
    fix:
      'Write the conditions out in order and ask, for each one, whether anything above it would already have caught that value. Reorder so the narrowest condition comes first and the chain widens downwards.',
    seo: SEO('java else if branch never runs',
      'Why an else if branch is unreachable, how condition order decides which one catches, and '
      + 'the rule for ordering ranges.'),
  },
  {
    code: 'G-09', after: '2.6',
    handle: 'intro-java-help-too-many-things-spawning',
    title: 'Far too many things are spawning',
    means: 'A percentage chance checked inside act() is a chance PER FRAME, and act() runs many '
      + 'times a second.',
    causes: [
      'A spawn chance that sounds rare, like 5 percent, firing dozens of times a second.',
      'No counter or timer limiting how often the spawn can happen.',
      'Spawning in the world act() and in an actor act() at the same time.',
    ],
    fix:
      'Raise the number you pass to getRandomNumber, remembering the check runs every frame. One in fifty per frame is still several a second. For real control, count frames and spawn only when the counter comes round.',
    seo: SEO('greenfoot too many objects spawning',
      'Why a small random spawn chance floods a Greenfoot scenario, how per-frame probability '
      + 'works, and how to slow it down.'),
  },
  {
    code: 'G-10', after: '2.7',
    handle: 'intro-java-help-cannot-move-diagonally',
    title: 'My player cannot move diagonally',
    means: 'The key checks are in an else if chain, which stops at the first key it finds.',
    causes: [
      'Using else if between the direction checks instead of separate if statements.',
      'Returning out of act() after the first key match.',
    ],
    fix:
      'Change every `else if` between your key checks to a plain `if`. Separate ifs are each checked, so holding two keys moves the player both ways in the same frame.',
    seo: SEO('greenfoot diagonal movement not working',
      'Why a Greenfoot player cannot move diagonally, why an else if chain blocks it, and the '
      + 'one-word change that fixes it.'),
  },
  {
    code: 'G-11', after: '3.2',
    handle: 'intro-java-help-my-method-never-runs',
    title: 'I wrote a method and nothing happens',
    means: 'Writing a method defines it. Something still has to call it by name, and nothing does.',
    causes: [
      'Nothing calls the method. act() or the constructor has to invoke it.',
      'The call is missing its brackets, so it is not a call at all.',
      'The method was accidentally written inside another method, so it never became a method.',
    ],
    fix:
      'Find the place the method should run from, usually act() for per-frame behaviour or the '
      + 'constructor for one-off setup, and add a call with brackets and a semicolon. Then check '
      + 'the method sits beside act() rather than inside it.',
    seo: SEO('java method written but not running',
      'Why a Java method you wrote does nothing, why defining is not calling, and where the call '
      + 'belongs in a Greenfoot class.'),
  },
  {
    code: 'G-12', after: '3.8',
    handle: 'intro-java-help-my-score-stays-zero',
    title: 'My score always stays at zero',
    means: 'The score variable is declared inside act(), so it is rebuilt from scratch every frame '
      + 'and never remembers anything.',
    causes: [
      'The declaration is inside act(). Every frame starts by setting it back to zero.',
      'The variable is declared inside an if block, so it disappears when the block ends.',
      'The score is being displayed from a different object than the one counting.',
    ],
    fix:
      'Move the declaration out of act() and into the class body, beside the other fields and '
      + 'outside every method. That one move is usually the whole fix. Assign the starting value '
      + 'there or in the constructor.',
    seo: SEO('greenfoot score always 0 not updating',
      'Why a Greenfoot score never rises above zero, how a local variable resets every frame, and '
      + 'the one-line fix.'),
  },
  {
    code: 'G-13', after: '3.5',
    handle: 'intro-java-help-my-actor-moves-too-far',
    title: 'My actor jumps across the screen',
    means: 'move counts CELLS, not pixels, so a large cell size turns a small move into a big jump.',
    causes: [
      'The world has a large cell size, so each cell is many pixels on screen.',
      'The move distance is simply too large for the size of the world.',
      'setLocation is being given pixel values where cell coordinates were expected.',
    ],
    fix:
      'Look at the third number in your super call. If it is large, either reduce the move '
      + 'distance to suit or rebuild the world with a cell size of 1 for smooth movement. Grid '
      + 'games want big cells; action games want a cell size of 1.',
    seo: SEO('greenfoot actor moves too far cell size',
      'Why a Greenfoot actor leaps across the screen, how cell size changes what move means, and '
      + 'which cell size suits which game.'),
  },
  {
    code: 'G-14', after: '3.9',
    handle: 'intro-java-help-constructor-cannot-be-applied',
    title: 'Java error: constructor cannot be applied to given types',
    message: 'constructor X in class X cannot be applied to given types',
    means: 'You created an object with a different set of arguments than any of its constructors '
      + 'accepts. Usually this appears the moment you add your first constructor.',
    causes: [
      'You wrote a constructor with parameters, which removes the free no-argument one, and old '
        + 'new Enemy() calls no longer match.',
      'The number of arguments does not match the constructor.',
      'The arguments are in the wrong order or the wrong types.',
    ],
    fix:
      'Either pass the arguments the constructor asks for at every creation site, or add a second '
      + 'no-argument constructor that supplies sensible defaults. Both constructors can coexist and '
      + 'Java picks by what you pass.',
    seo: SEO('java constructor cannot be applied to given types',
      'Why adding a constructor breaks existing new calls, what the free no-argument constructor '
      + 'was, and the two ways to fix it.'),
  },
  {
    code: 'G-15', after: '4.1',
    handle: 'intro-java-help-my-loop-never-ends',
    title: 'My loop never ends',
    means: 'Nothing inside the loop moves the condition towards false, so it stays true forever.',
    causes: [
      'The counter is never changed inside the loop body.',
      'The counter changes in the wrong direction, moving away from the exit.',
      'The condition can never be false for the values the counter takes.',
    ],
    fix:
      'Find the line that should change the counter. If it is missing, add it. If it is there, '
      + 'check it moves the counter TOWARDS the condition failing rather than away from it. A for '
      + 'loop puts the update in the header where it is much harder to lose.',
    seo: SEO('java loop never ends infinite',
      'Why a Java loop never ends, the three causes, and why a for loop makes the missing update '
      + 'obvious. Beginner help.'),
  },
  {
    code: 'G-16', after: '4.4',
    handle: 'intro-java-help-collision-not-detected',
    title: 'My collision is not being detected',
    means: 'Either the actors never actually overlap, or the check is looking for the wrong thing.',
    causes: [
      'The class named in isTouching is not the class of the thing you are hitting.',
      'The actor moves so far each frame that it jumps straight over the target.',
      'The check is not inside act(), so it only ever ran once.',
      'One of the actors was already removed from the world.',
    ],
    fix:
      'Press Act one frame at a time and watch the two actors approach. If they pass through each '
      + 'other in a single frame, reduce the move distance. If they visibly overlap and nothing '
      + 'happens, check the class name in the isTouching call.',
    seo: SEO('greenfoot collision not detected istouching',
      'Why a Greenfoot collision is never detected, including actors that jump over each other in '
      + 'one frame, and how to test it a frame at a time.'),
  },
  {
    code: 'G-17', after: '4.5',
    handle: 'intro-java-help-concurrent-modification-exception',
    title: 'Java error: ConcurrentModificationException',
    message: 'java.util.ConcurrentModificationException',
    means: 'You changed a collection while looping over it. In Greenfoot that is almost always '
      + 'removing actors from the world inside a loop over the list you got from the world.',
    causes: [
      'Calling removeObject inside a loop over getObjects.',
      'Adding actors to the world inside a loop over its own list.',
      'Removing from any list while an enhanced for is walking it.',
    ],
    fix:
      'Remove them all at once with removeObjects(getObjects(Thing.class)). If you need to pick '
      + 'and choose, collect the ones to remove into a separate list inside the loop, then remove '
      + 'them after the loop has finished. The alarming name hides a one-line fix.',
    seo: SEO('greenfoot concurrentmodificationexception fix',
      'What ConcurrentModificationException means in Greenfoot, why removing actors inside a loop '
      + 'causes it, and the one-line fix.'),
  },
  {
    code: 'G-18', after: '5.2',
    handle: 'intro-java-help-my-loop-misses-the-last-item',
    title: 'My loop misses the last item, or one too many',
    means: 'The loop boundary is off by one. Either it stops too early and misses an element, or '
      + 'goes one past and throws.',
    causes: [
      'Using a hardcoded size that no longer matches the array.',
      'Starting at 1 instead of 0, which silently skips the first element.',
      'Using <= where < was needed, which goes one past the end.',
    ],
    fix:
      'Use the standard shape and nothing else: for (int i = 0; i < a.length; i++). Start at 0, '
      + 'stop before the length, and read the length from the array rather than typing a number '
      + 'that can go stale.',
    seo: SEO('java loop misses last element off by one',
      'Why a Java loop skips the first or last element of an array, the three boundary mistakes, '
      + 'and the one loop shape that avoids them.'),
  },
  {
    code: 'G-19', after: '5.4',
    handle: 'intro-java-help-my-array-changes-do-nothing',
    title: 'My changes to the array do nothing',
    means: 'You are almost certainly assigning to the loop variable of an enhanced for, which is a '
      + 'copy of the value rather than the slot itself.',
    causes: [
      'Assigning to the variable in a for-each loop, which changes the copy and not the array.',
      'Building a new array and never storing it anywhere.',
      'Changing a local copy that was never written back.',
    ],
    fix:
      'Use an index loop and assign into the slot: a[i] = something. An enhanced for can read '
      + 'values but can never write them, and it fails silently rather than complaining.',
    seo: SEO('java for each not changing array',
      'Why assigning inside a Java for-each loop does not change the array, why it fails silently, '
      + 'and the index loop that works.'),
  },
  {
    code: 'G-20', after: '6.2',
    handle: 'intro-java-help-my-tile-map-is-sideways',
    title: 'My tile map renders sideways or mirrored',
    means: 'The row and column indexes are swapped somewhere, so the grid renders transposed.',
    causes: [
      'addObject is being called with row and col the wrong way round. The world wants x first, '
        + 'and x is the COLUMN.',
      'The array is being read as map[col][row] instead of map[row][col].',
      'The world is sized with rows as the width instead of columns.',
    ],
    fix:
      'Check three places in order: the array read is map[row][col], the placement is '
      + 'addObject(a, col, row), and the world is super(map[0].length, map.length, cell). Then '
      + 'test with a map that is NOT square, because a square map hides this bug completely.',
    seo: SEO('greenfoot tile map rendering sideways transposed',
      'Why a Greenfoot tile map renders rotated or mirrored, the three places to check the index '
      + 'order, and why a square test map hides it.'),
  },
];

// ── How-to recipes: the game-design surface ──────────────────────────────────
const RECIPES = [
  {
    code: 'R-01', after: '1.1',
    handle: 'intro-java-help-recipe-open-and-run-a-scenario',
    title: 'How to open and run a Greenfoot scenario',
    snippet:
      '// Scenario menu, then Open. Pick a folder that contains a\n// greenfoot.project file. Then press Run.\n// Act  = one frame.  Run = many.  Reset = start over.',
    seo: SEO('how to open a greenfoot scenario',
      'Step by step: open an existing Greenfoot scenario, run it, pause it, and reset it. The '
      + 'first thing to do in the course.'),
  },
  {
    code: 'R-02', after: '1.4',
    handle: 'intro-java-help-recipe-move-an-actor',
    title: 'How to make an actor move',
    snippet:
      '// Two ways, and they are not interchangeable.\n\n// 1. Direction based: goes whichever way the actor faces.\nturn(90);\nmove(4);\n\n// 2. Coordinate based: ignores facing entirely.\nsetLocation(getX() + 4, getY());',
    seo: SEO('how to move an actor in greenfoot',
      'Two ways to move a Greenfoot actor: move and turn for direction-based movement, and '
      + 'setLocation for exact coordinates.'),
  },
  {
    code: 'R-03', after: '1.6',
    handle: 'intro-java-help-recipe-keep-an-actor-in-the-world',
    title: 'How to stop an actor leaving the world',
    snippet:
      'public void act()\n{\n    move(3);\n    if (isAtEdge())\n    {\n        turn(180);\n    }\n}',
    seo: SEO('greenfoot keep actor inside world',
      'How to stop a Greenfoot actor walking off the edge, using isAtEdge and setLocation. Beginner '
      + 'recipe with working code.'),
  },
  {
    code: 'R-04', after: '2.6',
    handle: 'intro-java-help-recipe-random-spawning',
    title: 'How to spawn things at random',
    snippet:
      'public void act()\n{\n    // Roughly one frame in fifty. Remember act() runs\n    // many times a second, so this is still frequent.\n    if (Greenfoot.getRandomNumber(50) < 1)\n    {\n        int x = Greenfoot.getRandomNumber(getWidth());\n        addObject(new Coin(), x, 0);\n    }\n}',
    seo: SEO('greenfoot spawn objects randomly',
      'How to spawn Greenfoot actors at random positions and at a controlled rate, with working '
      + 'code and the per-frame trap explained.'),
  },
  {
    code: 'R-05', after: '2.7',
    handle: 'intro-java-help-recipe-arrow-key-movement',
    title: 'How to move a player with the arrow keys',
    snippet:
      'public void act()\n{\n    // SEPARATE ifs, never else if, or diagonals stop working.\n    if (Greenfoot.isKeyDown("left"))  { setLocation(getX() - 3, getY()); }\n    if (Greenfoot.isKeyDown("right")) { setLocation(getX() + 3, getY()); }\n    if (Greenfoot.isKeyDown("up"))    { setLocation(getX(), getY() - 3); }\n    if (Greenfoot.isKeyDown("down"))  { setLocation(getX(), getY() + 3); }\n}',
    seo: SEO('greenfoot arrow key movement code',
      'Working Greenfoot code for four-direction arrow key movement, including diagonals, and why '
      + 'separate if statements are required.'),
  },
  {
    code: 'R-06', after: '3.8',
    handle: 'intro-java-help-recipe-show-a-score',
    title: 'How to show a score on screen',
    snippet:
      'public class ScoreWorld extends World\n{\n'
      + '    private int score = 0;   // instance variable, so it survives\n\n'
      + '    public void addScore(int points)\n    {\n'
      + '        score = score + points;\n'
      + '        showText("Score: " + score, 3, 1);\n'
      + '    }\n}',
    seo: SEO('greenfoot show score on screen',
      'How to display and update a score in Greenfoot with showText, and why the score must be an '
      + 'instance variable to survive.'),
  },
  {
    code: 'R-07', after: '3.7',
    handle: 'intro-java-help-recipe-set-up-the-opening-scene',
    title: 'How to set up the opening scene',
    snippet:
      'public MyWorld()\n{\n'
      + '    super(20, 15, 30);\n'
      + '    prepare();          // without this line, nothing appears\n'
      + '}\n\n'
      + 'public void prepare()\n{\n'
      + '    addObject(new Player(), 10, 7);\n'
      + '    addObject(new Coin(), 3, 3);\n}',
    seo: SEO('greenfoot set up starting actors prepare',
      'How to place Greenfoot actors in code so the opening scene rebuilds itself every time you '
      + 'press Reset.'),
  },
  {
    code: 'R-08', after: '4.7',
    handle: 'intro-java-help-recipe-spawn-a-wave',
    title: 'How to spawn a wave of enemies',
    snippet:
      'public void startWave()\n{\n'
      + '    // One loop, any size. Change the 8 to change the wave.\n'
      + '    for (int i = 0; i < 8; i++)\n    {\n'
      + '        addObject(new Enemy(2), i * 2, 0);\n'
      + '    }\n}\n\n'
      + 'public void act()\n{\n'
      + '    // Guarded, so it runs once per wave and not once per frame.\n'
      + '    if (getObjects(Enemy.class).size() == 0)\n    {\n'
      + '        startWave();\n'
      + '    }\n}',
    seo: SEO('greenfoot spawn wave of enemies loop',
      'Working Greenfoot code to spawn an evenly spaced wave of enemies with one loop, and why the '
      + 'loop must not live in act.'),
  },
  {
    code: 'R-09', after: '5.6',
    handle: 'intro-java-help-recipe-level-data-in-an-array',
    title: 'How to put level data in an array',
    snippet:
      '// The index is WHERE, the value is WHAT.\n'
      + 'int[] heights = {2, 5, 1, 4, 3};\n\n'
      + 'for (int i = 0; i < heights.length; i++)\n{\n'
      + '    addObject(new Wall(), i, heights[i]);\n}\n\n'
      + '// A new level is now numbers, not code.',
    seo: SEO('greenfoot level layout in an array',
      'How to drive a Greenfoot level from array data so designing a new level means editing '
      + 'numbers rather than writing code.'),
  },
  {
    code: 'R-10', after: '6.5',
    handle: 'intro-java-help-recipe-render-a-tile-map',
    title: 'How to render a tile map',
    snippet:
      '// 0 floor, 1 wall, 2 coin\n'
      + 'private int[][] map = {\n'
      + '    {1, 1, 1, 1},\n'
      + '    {1, 0, 2, 1},\n'
      + '    {1, 1, 1, 1}\n'
      + '};\n\n'
      + 'public void buildMap()\n{\n'
      + '    for (int row = 0; row < map.length; row++)\n    {\n'
      + '        for (int col = 0; col < map[row].length; col++)\n        {\n'
      + '            int code = map[row][col];\n'
      + '            // col is x, row is y. They swap.\n'
      + '            if (code == 1)      { addObject(new Wall(), col, row); }\n'
      + '            else if (code == 2) { addObject(new Coin(), col, row); }\n'
      + '        }\n    }\n}',
    seo: SEO('greenfoot render tile map from 2d array',
      'Working Greenfoot code to turn a 2D array of tile codes into a level, with the coordinate '
      + 'swap and the legend comment.'),
  },
  {
    code: 'R-11', after: '6.6',
    handle: 'intro-java-help-recipe-grid-wall-collision',
    title: 'How to stop a player walking through walls',
    snippet:
      '// Check the destination cell BEFORE moving.\n'
      + 'public void tryMove(int dRow, int dCol)\n{\n'
      + '    int newRow = getY() + dRow;\n'
      + '    int newCol = getX() + dCol;\n\n'
      + '    // inBounds FIRST, or the lookup throws.\n'
      + '    if (inBounds(newRow, newCol) && map[newRow][newCol] != 1)\n    {\n'
      + '        setLocation(newCol, newRow);\n'
      + '    }\n}',
    seo: SEO('greenfoot grid wall collision 2d array',
      'How to stop a Greenfoot player walking through walls by checking the destination cell in a '
      + '2D array, with the bounds check in the right order.'),
  },
];

const ALL = [...ERRORS, ...GOTCHAS, ...RECIPES];

// code -> entry, for the renderer's "if you get stuck" links.
const INDEX = {};
for (const h of ALL) INDEX[h.code] = h;

module.exports = { ERRORS, GOTCHAS, RECIPES, ALL, INDEX };
