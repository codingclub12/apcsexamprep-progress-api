'use strict';
// Weekly course post: AP CSP. Drill track. Definitive method guide for the
// robot grid pseudocode format that shows up constantly in algorithm
// questions: sensing, turning, and covering a grid, plus the tracing
// discipline that makes those questions fast instead of slow.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'Robot grid problems all reduce to the same handful of patterns',
  'The core AP CSP robot grid patterns you need to know',
  'Track position step by step, never in your head',
  'A fully worked robot grid trace',
  'Practice two robot grid questions the right way',
];

const meta = {
  title: 'AP CSP Robot Grid Problems: A Method That Always Works',
  handle: 'ap-csp-robot-grid-problems-method',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp robot grid',
  publishOn: '2026-09-04',
  seoTitle: 'AP CSP Robot Grid Problems: The Method That Works',
  seoDescription: 'AP CSP robot grid questions look different every time but reuse a small set of patterns. A teacher breaks down the method with two worked practice questions.',
  summary: 'Robot grid questions on the AP CSP exam vary in surface details but are built from a small, repeating set of pseudocode patterns. A method for recognizing them, tracing them without losing track, and two fully worked practice questions.',
  tags: ['AP CSP', 'Robot Grid', 'Algorithms', 'Pseudocode', 'Exam Prep'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('AP CSP robot grid problems look different every time you see one: different grid sizes, different starting corners, different sensing rules. But underneath, almost every one is built from the same small set of pseudocode patterns, and once you can name those patterns on sight, these questions stop being slow.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 1, 2026', updated: 'September 1, 2026', readingMinutes: 12,
  }),
  H.toc(SECTIONS),

  H.p('Here is what a robot grid question tends to look like on the page: a short paragraph describing a robot that can move forward, rotate, and sense whether the space ahead of it is open, followed by a block of pseudocode using those commands, followed by a question asking where the robot ends up, or whether it successfully reaches some target square, or what happens if you change one line. The grid might be drawn as a small square, the starting corner might be top left or bottom right, the robot might be looking for a wall or an obstacle instead of the edge of the grid. All of that is surface variation. The underlying task, controlling a simple agent that moves through a small number of discrete positions using loops and conditionals, is one of a handful of shapes that repeats across the exam and across most published practice material.'),
  H.p('Students who have not specifically practiced this format tend to re-derive how to think about it every single time they see one, which costs minutes they do not have on a timed exam. Students who have practiced it recognize the shape immediately, know which pattern is in front of them, and spend their time on the actual trace instead of on figuring out what kind of question this even is. That recognition is learnable, and it is the whole point of this guide, which pairs with the rest of the algorithm-tracing material on our <a href="/pages/ap-computer-science-principles-resources">CSP resources page</a>.'),
  H.box('key', 'The claim this guide is making', '<p>Robot grid questions are not really about robots. They are about reading a loop with a sensing condition, or a conditional that reacts to the environment, or a nested loop that sweeps a whole area, correctly. The robot is just the vehicle the exam uses to test whether you can trace control flow precisely. Learn the handful of control flow shapes and the robot part takes care of itself.</p>'),

  H.h2(SECTIONS[0]),
  H.p('It helps to say plainly what does and does not vary from one robot grid question to the next. What varies: the size of the grid, where the robot starts, which direction it starts facing, where the walls or obstacles are, and the specific commands the pseudocode calls in what order. What does not vary, at least not much: the robot almost always has a small, fixed vocabulary of commands, something like MOVE_FORWARD to move one square in the direction it is currently facing, ROTATE_LEFT and ROTATE_RIGHT to turn ninety degrees in place without moving, and CAN_MOVE, a sensing command that returns true or false depending on whether the square in a given direction is open.'),
  H.p('Every robot grid question you will meet is some combination of those commands wrapped in the same handful of control structures: a loop that keeps moving until sensing says stop, a conditional that reacts differently depending on what the robot senses, and a nested loop that repeats a movement pattern across rows or columns to cover an area larger than one line. Almost nothing else shows up. There is no robot grid question that requires a data structure you have not seen or a command that was not defined in the question itself. The entire difficulty is precise tracing of familiar control flow, which is exactly the kind of difficulty that practice actually fixes.'),
  H.p('That is the reframe this guide is built around. Do not approach a new robot grid question as a new problem to solve from scratch. Approach it as an instance of one of a small number of known patterns, identify which one you are looking at, and then apply the tracing discipline in the section below. The rest of this piece walks through those patterns one at a time, then works through a full trace, then closes with two practice questions built to the same standard as the rest of this site.'),

  H.h2(SECTIONS[1]),
  H.p('There are three patterns worth knowing cold. Almost every robot grid question you meet on the real exam, and almost every good one in practice material, is one of these three or a combination of two of them.'),

  H.h3('Pattern one: move until something is sensed'),
  H.p('The most common shape by far is a loop that keeps moving the robot forward until a sensing command reports that it should stop, most often because the edge of the grid or a wall is directly ahead. This is a REPEAT UNTIL loop with a sensing condition, and it reads almost exactly like English once you know to look for it: repeat moving forward until you cannot move forward anymore.'),
  H.code('REPEAT UNTIL (CAN_MOVE(forward) = false)\n{\n  MOVE_FORWARD()\n}'),
  H.p('Notice what the loop does not do: it never checks a row number, a column number, or a count of squares. It has no idea how big the grid is. It only knows, one step at a time, whether the very next square is open. That is exactly what CAN_MOVE is for, and it is why this pattern works identically whether the grid is small or large: the loop keeps running until the environment itself says stop.'),

  H.h3('Pattern two: react to what is sensed'),
  H.p('The second pattern is a conditional built around the same sensing command, used to make the robot choose between two behaviors depending on what is around it, most often to navigate around a corner or an obstacle rather than to detect the outer edge of the grid.'),
  H.code('IF (CAN_MOVE(forward))\n{\n  MOVE_FORWARD()\n}\nELSE\n{\n  ROTATE_RIGHT()\n}'),
  H.p('Read this the same way: if the way ahead is open, take it; otherwise, turn instead of moving. This single IF and ELSE, sometimes placed inside a REPEAT UNTIL or REPEAT n TIMES loop so the robot keeps checking and reacting on every step, is how most obstacle-navigation robot grid questions are built. The robot never plans a route in advance. It reacts one square at a time, which is exactly why tracing it correctly requires stepping through it one square at a time as well, not trying to picture the whole path in your head before you start.'),

  H.h3('Pattern three: cover the whole grid with a nested loop'),
  H.p('The third pattern scales pattern one up to cover an entire grid rather than a single line, using a loop of rows or columns that each contain a loop of movement. This is the pattern behind any robot grid question that asks whether the robot visits every square, or paints every tile, or reaches every corner of an area rather than just crossing one row.'),
  H.code('REPEAT 3 TIMES\n{\n  REPEAT UNTIL (CAN_MOVE(forward) = false)\n  {\n    MOVE_FORWARD()\n  }\n  ROTATE_RIGHT()\n  MOVE_FORWARD()\n  ROTATE_RIGHT()\n}'),
  H.p('Read the outer REPEAT as "do this once for every row," and read the inner REPEAT UNTIL as pattern one, the move-until-blocked loop, running inside it. The two ROTATE_RIGHT commands surrounding a single MOVE_FORWARD are the part students most often trace wrong, because it looks like one line but it actually does two separate jobs: face the next row, then move exactly one square into it. Getting this pattern right on a trace almost always comes down to tracing those turn commands as carefully as the moves, which is the discipline the next section is about.'),
  H.box('warn', 'The mistake this pattern invites', '<p>It is tempting to read a nested loop like this and reason about it all at once: "it goes up the first column, across, down the second column, so it must cover the whole grid." That reasoning is often right and sometimes wrong, and a robot grid question is specifically designed to test whether you can tell the difference without guessing. The only reliable way to know is to trace it, one instruction at a time, the way the next section describes.</p>'),

  H.h2(SECTIONS[2]),
  H.p('This site has already made the case, in the guide to variable table tracing, that external tracking beats mental tracking for variables: writing down what a variable holds after each line, rather than trying to hold the whole execution in your head, is what turns a hard trace into an easy one. The exact same principle applies to robot grid questions, except what you are tracking is not a variable, it is the robot itself: its position on the grid and, when the scenario has one, the direction it is currently facing.'),
  H.p('A robot grid question fails students in a very specific way when they skip this step. They read the pseudocode, form a rough mental picture of the robot wandering around the grid, and then commit to an answer based on that impression rather than a verified position. The impression is often close to right, which is worse than being obviously wrong, because it means the mistake does not get caught. A wrong answer that came from a real trace at least tells you exactly where the reasoning broke. A wrong answer that came from a mental picture tells you nothing, and the same mistake will happen again on the next question.'),
  H.p('The fix is mechanical rather than clever. Before you trace a single instruction, draw or imagine the grid with rows and columns labeled, mark the robot\'s starting square, and note which direction it is facing if the question specifies one. Then go instruction by instruction. Every MOVE_FORWARD updates the position by exactly one square in the current facing direction. Every ROTATE_LEFT or ROTATE_RIGHT updates the facing direction and changes nothing about the position. Every CAN_MOVE check is answered by looking at the grid you drew, not by assuming. Write the new position, and the new facing direction if relevant, after every single instruction that changes one, the same way you would write a new value into a variable table after every assignment.'),
  H.box('tip', 'Build a tiny table, every time', '<p>You do not need graph paper or a full drawing for most robot grid questions. A simple two or three column table, step number, position, and facing direction if it matters, updated one row at a time as you read down the pseudocode, does the same job the variable table does for arithmetic tracing. It turns a question you might get wrong by impression into a question you get right by verification.</p>'),
  H.p('This discipline costs a little time up front and saves much more time on the back end, because it eliminates the second read-through. A student who traces carefully the first time answers the question once. A student who traces from impression usually has to re-read the pseudocode a second or third time once the answer choices do not match what they expected, and by then the clock has already cost them more than the careful trace would have.'),

  H.h2(SECTIONS[3]),
  H.p('Here is a full worked example that combines pattern one, the move-until-blocked loop, with pattern two, a pair of turns. Picture a grid of open squares with no interior obstacles, three rows tall and two columns wide. The robot starts in the bottom row, in the leftmost column, facing up toward the top of the grid.'),
  H.code('REPEAT UNTIL (CAN_MOVE(forward) = false)\n{\n  MOVE_FORWARD()\n}\nROTATE_RIGHT()\nMOVE_FORWARD()\nROTATE_RIGHT()\nREPEAT UNTIL (CAN_MOVE(forward) = false)\n{\n  MOVE_FORWARD()\n}'),
  H.p('Do not try to hold this in your head. Track it the way the previous section describes, one instruction at a time, using row and column labels where row one is the top row and column one is the leftmost column.'),
  H.table(
    ['Step', 'Instruction executed', 'Position (row, col)', 'Facing'],
    [
      ['Start', 'Robot begins here', '(3, 1)', 'Up'],
      ['1', 'MOVE_FORWARD()', '(2, 1)', 'Up'],
      ['2', 'MOVE_FORWARD()', '(1, 1)', 'Up'],
      ['3', 'CAN_MOVE(forward) is false, loop exits', '(1, 1)', 'Up'],
      ['4', 'ROTATE_RIGHT()', '(1, 1)', 'Right'],
      ['5', 'MOVE_FORWARD()', '(1, 2)', 'Right'],
      ['6', 'ROTATE_RIGHT()', '(1, 2)', 'Down'],
      ['7', 'MOVE_FORWARD()', '(2, 2)', 'Down'],
      ['8', 'MOVE_FORWARD()', '(3, 2)', 'Down'],
      ['9', 'CAN_MOVE(forward) is false, loop exits', '(3, 2)', 'Down'],
    ]
  ),
  H.p('Notice what the table makes obvious that a mental trace almost always loses: the two ROTATE_RIGHT commands do not cancel out. The first one turns the robot from facing up to facing right, so the single MOVE_FORWARD in the middle moves it sideways into the next column rather than back the way it came. The second ROTATE_RIGHT turns it again, from facing right to facing down, which is why the second move-until-blocked loop drives it toward the bottom of the grid instead of back toward the top. The final position, row three, column two, and the final facing direction, down, both come directly out of the table rather than out of a guess, which is exactly the point of tracking state externally instead of picturing the whole path at once.'),

  H.h2(SECTIONS[4]),
  H.p('Try each question below before reading the explanation, and track position and facing direction step by step as you go rather than estimating the final square. Both questions are genuine robot grid items in the style the real exam uses.'),
  H.mcq({
    n: 1,
    stem: 'A robot starts in the top-left corner of a grid, facing right, and the grid is four columns wide. It can move forward, rotate ninety degrees left or right without moving, and CAN_MOVE(direction) reports whether the adjacent square in that direction is open. There are no interior obstacles, only the outer edges of the grid. Trace the pseudocode below. Using row one as the top row and column one as the leftmost column, what is the robot\'s final position?',
    codeText: 'REPEAT UNTIL (CAN_MOVE(forward) = false)\n{\n  MOVE_FORWARD()\n}\nROTATE_RIGHT()\nMOVE_FORWARD()',
    options: [
      '(1, 4), because the robot stops as soon as it reaches the right edge of the grid and the remaining commands do not run',
      '(2, 4), because the robot moves across the top row until it reaches the right wall, then rotates to face down and moves one more square',
      '(4, 4), because ROTATE_RIGHT and MOVE_FORWARD each execute once for every column the robot already crossed',
      '(1, 1), because ROTATE_RIGHT reverses the robot back toward where it started',
    ],
    correct: 1,
    why: 'Track this one row at a time. The robot starts at (1, 1) facing right. The REPEAT UNTIL loop keeps calling MOVE_FORWARD as long as CAN_MOVE(forward) is true, which moves it to (1, 2), then (1, 3), then (1, 4), where CAN_MOVE(forward) becomes false because the right edge of the grid is reached, so the loop exits with the robot still facing right. The pseudocode does not stop there: ROTATE_RIGHT turns the robot from facing right to facing down without changing its position, still (1, 4), and then MOVE_FORWARD executes exactly once more, moving it to (2, 4). The two commands after the loop are easy to lose track of if you stop tracing the moment the loop ends, which is exactly why writing down every step, including the ones after a loop exits, matters.',
  }),
  H.mcq({
    n: 2,
    stem: 'A robot starts in the bottom-left corner of a grid that is three rows tall and three columns wide, facing up, with the goal of visiting every square in the grid. There are no interior obstacles. Trace the pseudocode below. Does the robot succeed in visiting every square in the grid?',
    codeText: 'REPEAT 3 TIMES\n{\n  REPEAT UNTIL (CAN_MOVE(forward) = false)\n  {\n    MOVE_FORWARD()\n  }\n  ROTATE_RIGHT()\n}',
    options: [
      'Yes, it visits every square in the grid before coming to rest in the top-right corner',
      'No, after moving up the first column it only travels across the top row and then down the right column, so most of the middle and bottom of the grid is never visited',
      'No, the robot gets stuck in an infinite loop in the bottom-left corner and never moves at all',
      'Yes, but only because CAN_MOVE(forward) always returns true regardless of where the walls are',
    ],
    correct: 1,
    why: 'Track this one outer iteration at a time, using row one as the top row and column one as the leftmost column. Iteration one: the robot starts at (3, 1) facing up, the inner loop drives it to (1, 1), where CAN_MOVE(forward) becomes false and the loop exits, then ROTATE_RIGHT turns it to face right, still at (1, 1). Iteration two: the inner loop now drives it across the top row, since it is facing right, ending at (1, 3) where the right edge stops it, then ROTATE_RIGHT turns it to face down. Iteration three: the inner loop drives it down the right column, ending at (3, 3), where ROTATE_RIGHT turns it to face left. After three outer iterations the robot has traced an L shape up the first column, across the top row, and down the last column, but it has never once entered the middle column or the middle or bottom row on the left and center. Visiting every square would require the turn commands to alternate direction so the robot snakes back and forth across the rows, which this pseudocode never does. A single ROTATE_RIGHT after each move-until-blocked loop traces a spiral or an L, not full coverage, and only a careful step by step trace catches that the intent and the actual behavior have quietly diverged.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What commands actually show up in AP CSP robot grid pseudocode?', a: 'The set is small and consistent: a command to move the robot one square in the direction it is facing, commands to rotate it in place without moving, and a sensing command that reports whether an adjacent square is open. Question writers rarely invent new commands, because the whole point of the format is testing whether you can trace a small, known vocabulary correctly, not whether you can learn a new one under time pressure.' },
    { q: 'Do I need to know the exact command names College Board uses?', a: 'Focus on the pattern more than the exact spelling. A well-written robot grid question always defines its commands at the top before the pseudocode uses them, so the actual names matter less than recognizing which of the three patterns in this guide the pseudocode is using once you read that definition.' },
    { q: 'What is the single biggest mistake students make on these questions?', a: 'Tracing from a mental picture of the path instead of tracking position and facing direction step by step. It produces a plausible-looking wrong answer far more often than it produces the right one, because turns and edge cases are exactly the details a mental picture smooths over.' },
    { q: 'How is a robot grid question different from a regular algorithm tracing question?', a: 'The underlying skill, tracing control flow precisely, is identical. The only difference is what state you are tracking: a regular tracing question tracks the value inside a variable, while a robot grid question tracks a position and sometimes a facing direction. The same discipline, external tracking instead of mental tracking, applies to both.' },
    { q: 'Should I practice with a real grid drawing or is a table enough?', a: 'A simple table with a step column, a position column, and a facing direction column when relevant is usually enough and is faster than drawing a full grid for every question. Save an actual drawing for the harder nested-loop questions, where seeing the shape the robot traces can catch a coverage mistake that a table alone might not make as visually obvious.' },
  ]),

  H.cta({
    heading: 'Practice more robot grid and algorithm questions',
    body: 'Robot grid problems are one format among several that show up in AP CSP algorithm questions. Our written response guide covers how these patterns connect to the exam\'s written portion, and our full resource hub has more practice built to the same standard as the questions above.',
    links: [
      { href: '/pages/ap-computer-science-principles-resources', text: 'All CSP resources' },
      { href: '/pages/ap-csp-written-response-guide', text: 'Written response guide', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reviewed against the current AP Computer Science Principles Course and Exam Description. Last reviewed September 1, 2026.'),
]);

module.exports = { meta, body };
