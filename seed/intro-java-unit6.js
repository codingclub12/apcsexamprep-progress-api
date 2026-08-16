'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  INTRO TO JAVA, UNIT 6: 2D ARRAYS AND TILE MAPS.
//
//  Same shape as Units 1 to 5 (see seed/intro-java-unit1.js for the rules).
//
//  ── THE DESTINATION ─────────────────────────────────────────────────────────
//  Everything before this unit exists so this unit is possible. A student who
//  finishes it can render and navigate an int[][] tile map, which is the work
//  AP CSA Unit 4 spends weeks on, and it is the thing to point a skeptical CSA
//  teacher at.
//
//  ── THE ONE THING THIS UNIT MUST NOT GET WRONG ──────────────────────────────
//  Row-major order. `grid[row][col]`, and row is the FIRST index. Students
//  arrive expecting [x][y] because every coordinate they have met in this
//  course so far has been x first, and getting it backwards produces a map that
//  renders transposed. On a symmetric test map that looks fine, which is why
//  6.2 teaches it against a deliberately NON-square example and the misconception
//  block says so explicitly.
//
//  The spec makes this a requirement rather than an aside, and the reason is
//  that it is the single most common wrong mental model students carry out of a
//  tile-map unit.
//
//  ── AND THE ONE THAT BITES SECOND ───────────────────────────────────────────
//  Bounds checking order. `r >= 0 && r < g.length && g[r][c] == 1` works;
//  putting the lookup first throws before the guard can save you. That is
//  short-circuit evaluation from 2.3 finally paying off, and 6.6 says so.
//
//  Zero PII: author content only. No em-dashes, per repo convention. ASCII only.
// ─────────────────────────────────────────────────────────────────────────────

const COURSE = 'intro-java';
const UNIT = 'unit-6';
const LABEL = 'Unit 6: 2D Arrays and Tile Maps';

const SHOT = (lesson, n, alt) => ({ src: `intro-java/${lesson}/step-${n}.png`, alt });

const LESSONS = [
  // ── 6.1 ────────────────────────────────────────────────────────────────────
  {
    lesson: '6.1',
    slug: 'declaring-a-2d-array',
    title: 'Declaring a 2D Array',
    minutes: 30,
    seo: {
      h1: 'Declaring a 2D Array in Java',
      title: 'Java 2D Arrays: How to Declare and Create One | Intro to Java',
      description:
        'How to declare a Java 2D array, how to write one as a grid of values, and how to find out '
        + 'how many rows and columns it has.',
      primary: 'how to declare a 2d array in java',
      related: ['java 2d array example', 'java int[][] explained',
        'java 2d array rows and columns', 'java grid array beginner'],
      faq: [
        {
          q: 'How do you declare a 2D array in Java?',
          a: 'Two pairs of square brackets: int[][] grid. Create it with new int[rows][cols], or '
            + 'write the values out as a grid in nested braces.',
        },
        {
          q: 'How do I find the number of rows and columns in a Java 2D array?',
          a: 'grid.length is the number of rows. grid[0].length is the number of columns in the '
            + 'first row.',
        },
        {
          q: 'Is a 2D array really an array of arrays?',
          a: 'Yes. Each element of the outer array is itself an array, which is why grid[0] is a '
            + 'whole row and has its own length.',
        },
      ],
    },

    hook:
      'A 1D array is a row. A 2D array is a grid, and a grid is a map. This is where your game gets '
      + 'a level you can see in the code.',

    objectives: [
      'Declare and create a 2D array in both forms',
      'Get the number of rows and columns',
      'Explain why a 2D array is really an array of arrays',
    ],

    vocab: [
      { term: '2D array', plain: 'A grid of values. Rows of columns.',
        formal: 'An array whose elements are themselves arrays.' },
      { term: 'Row', plain: 'One horizontal line of the grid.',
        formal: 'One inner array, addressed by the first index.' },
    ],

    steps: [
      {
        shot: SHOT('6.1', 1, 'A grid diagram showing three rows of four columns with every cell '
          + 'containing zero.'),
        code: 'int[][] grid = new int[3][4];',
        note:
          'Two pairs of parentheses: an array of arrays.\n\n'
          + '`new int[3][4]` builds 3 ROWS of 4 COLUMNS. Rows first, always.\n\n'
          + 'Every cell starts at zero, just as with a 1D array. Twelve cells, all zero.',
      },
      {
        shot: SHOT('6.1', 2, 'A 2D array written as a literal grid in nested braces, laid out to '
          + 'look like the map it represents.'),
        code:
          'int[][] map = {\n'
          + '    {1, 1, 1, 1, 1},\n'
          + '    {1, 0, 0, 0, 1},\n'
          + '    {1, 0, 1, 0, 1},\n'
          + '    {1, 1, 1, 1, 1}\n'
          + '};',
        note:
          'This is the form you will use for the rest of the course, and it is the reason 2D arrays '
          + 'are so good for level design: THE CODE LOOKS LIKE THE MAP.\n\n'
          + 'Four rows, five columns. 1 is a wall, 0 is floor, and you can see the room with a hole '
          + 'in the middle just by reading it.\n\n'
          + 'Lay it out with one row per line, always. Squashed onto one line it is unreadable and '
          + 'the whole advantage is lost.',
      },
      {
        shot: SHOT('6.1', 3, 'The length of the outer array and of one inner row shown separately.'),
        code:
          'map.length       // 4, the number of ROWS\n'
          + 'map[0].length    // 5, the number of COLUMNS in row 0',
        note:
          'Two different lengths, and confusing them is a common source of transposed maps.\n\n'
          + '`map.length` counts the ROWS, because the outer array holds rows.\n'
          + '`map[0].length` counts the columns, because `map[0]` IS a row, and a row is a 1D array '
          + 'with its own length.\n\n'
          + 'That is the array-of-arrays idea made concrete: `map[0]` is not a value, it is a whole '
          + 'array.',
      },
    ],

    misconceptions: [
      {
        wrong: '`new int[3][4]` makes 3 columns and 4 rows.',
        right: 'Rows first: 3 rows of 4 columns.',
        why: 'Getting this backwards makes every subsequent index wrong, and on a square grid it '
          + 'is invisible.',
      },
      {
        wrong: '`grid.length` is the total number of cells.',
        right: 'It is the number of rows. Total cells is rows times columns.',
        why: 'A loop bounded by the wrong length either misses most of the grid or throws.',
      },
      {
        wrong: '`grid[0]` is the first value.',
        right: 'It is the first ROW, which is a whole array.',
        why: 'This is what makes `grid[0].length` meaningful, and it is the definition of a 2D '
          + 'array.',
      },
      {
        wrong: 'A 2D array literal can be written on one line.',
        right: 'It can, and you should not. One row per line is the entire advantage.',
        why: 'The readability of the map as a map is why this data structure is used for levels.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: '`new int[5][3]` creates:',
        options: ['5 columns of 3 rows', '8 cells', '15 rows', '5 rows of 3 columns'],
        answer: 3,
        why: 'Rows come first.',
      },
      {
        id: 'cfu-2',
        stem: 'For `int[][] m = new int[4][7];` what is `m.length`?',
        options: ['7', '28', '4', '11'],
        answer: 2,
        why: 'The outer array holds rows, so its length is the row count.',
      },
      {
        id: 'cfu-3',
        stem: 'How do you find the number of columns?',
        options: ['m.width', 'm.length', 'm[0].length', 'm.columns'],
        answer: 2,
        why: 'A row is a 1D array, so ask a row for its length.',
      },
      {
        id: 'cfu-4',
        stem: 'What kind of thing is `map[0]`?',
        options: ['A whole row, which is an array', 'A single int', 'The number of rows', 'The first column'],
        answer: 0,
        why: 'A 2D array is an array of arrays.',
      },
      {
        id: 'cfu-5',
        stem: 'How many cells are in `new int[3][6]`?',
        options: ['9', '3', '6', '18'],
        answer: 3,
        why: 'Rows times columns.',
      },
    ],

    gap: {
      intro:
        'Write a small map: three rows of four columns, with a wall border on the top row and floor '
        + 'below. Then get its dimensions.',
      code:
        'int[][] map = {\n'
        + '    {1, 1, 1, 1},\n'
        + '    {1, 0, 0, 1},\n'
        + '    {1, 1, 1, 1}\n'
        + '};\n'
        + '\n'
        + 'int rows = map.___1___;\n'
        + 'int cols = map[___2___].___3___;',
      holes: [
        { n: 1, hint: 'The outer array holds rows. No parentheses on an array.', accept: ['length'] },
        { n: 2, hint: 'Ask the first row how long it is.', accept: ['0'] },
        { n: 3, hint: 'A row is a 1D array, so it has the same thing.', accept: ['length'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'A 2D array is best described as:',
        options: ['A long 1D array', 'A list of values', 'An array of arrays', 'A method'],
        answer: 2,
        why: 'Each element of the outer array is itself an array.',
      },
      {
        id: 'q2',
        stem: '`int[][] g = new int[2][5];` What is `g[0].length`?',
        options: ['5', '2', '10', '0'],
        answer: 0,
        why: 'g[0] is a row of five columns.',
      },
      {
        id: 'q3',
        stem: 'Why write a map literal with one row per line?',
        options: [
          'Java requires it',
          'To save space',
          'It runs faster',
          'So the code looks like the map, which is the whole advantage',
        ],
        answer: 3,
        why: 'Readability as a map is why this structure is used for levels.',
      },
      {
        id: 'q4',
        stem: 'A grid has 6 rows and 4 columns. Which creates it?',
        options: ['new int[4][6]', 'new int[24]', 'new int[6][4]', 'new int[6,4]'],
        answer: 2,
        why: 'The first number is always the row count, so 6 rows of 4 columns.',
      },
    ],

    stuck: ['E-10'],

    recap: [
      '`int[][] grid` is an array of arrays.',
      '`new int[3][4]` is 3 ROWS of 4 COLUMNS. Rows always come first.',
      '`grid.length` is rows; `grid[0].length` is columns.',
      'Write a map literal one row per line so the code looks like the map.',
    ],
  },

  // ── 6.2 ────────────────────────────────────────────────────────────────────
  {
    lesson: '6.2',
    slug: 'row-major-indexing',
    title: 'Row-Major Indexing',
    minutes: 30,
    seo: {
      h1: 'Row and Column Order in Java 2D Arrays',
      title: 'Java 2D Array [row][col] Order Explained | Intro to Java',
      description:
        'Why a Java 2D array is indexed grid[row][col] and not [x][y], how to spot a transposed '
        + 'grid, and why a square test map hides the bug.',
      primary: 'java 2d array row column order',
      related: ['java 2d array [row][col]', 'java transposed grid bug',
        'java 2d array x y confusion', 'greenfoot tile map coordinates'],
      faq: [
        {
          q: 'Is a Java 2D array indexed [row][col] or [x][y]?',
          a: 'Row first, then column: grid[row][col]. Row is vertical position, which is the '
            + 'opposite order from the x, y coordinates used elsewhere.',
        },
        {
          q: 'Why does my tile map appear rotated or mirrored?',
          a: 'The two indexes are almost certainly swapped. The map renders transposed, which a '
            + 'square test map will hide completely.',
        },
        {
          q: 'How do I remember which index comes first?',
          a: 'Read it aloud as "row then column", the same order as reading a table: pick the row, '
            + 'then move along it.',
        },
      ],
    },

    hook:
      'This is the one thing in this unit that must not go wrong, and it goes wrong constantly, '
      + 'because everything you have done so far has been x first and this is the opposite.',

    objectives: [
      'Read and write a single cell with the correct index order',
      'Explain why row comes first',
      'Recognize a transposed grid and say why a square test map hides it',
    ],

    vocab: [
      { term: 'Row-major', plain: 'Row first, then column.',
        formal: 'Indexing where the first subscript selects the row.' },
      { term: 'Transposed', plain: 'Flipped along the diagonal. Rows became columns.',
        formal: 'The result of swapping the two indexes throughout.' },
    ],

    steps: [
      {
        shot: SHOT('6.2', 1, 'A grid with row and column numbers labeled on the edges, and one '
          + 'cell highlighted at row 2 column 1.'),
        code:
          'int[][] map = {\n'
          + '    {0, 0, 0, 0, 0},\n'
          + '    {0, 0, 0, 0, 0},\n'
          + '    {0, 9, 0, 0, 0}\n'
          + '};\n'
          + '\n'
          + 'map[2][1]   // 9. Row 2, column 1.',
        note:
          'ROW first, then COLUMN. Always.\n\n'
          + '`map[2][1]` means: go to row 2 (the third row down), then along to column 1 (the second '
          + 'across). That is where the 9 is.\n\n'
          + 'Read it aloud as "row two, column one". Saying it that way every time is the single '
          + 'most effective way to stop getting it backwards.',
      },
      {
        shot: SHOT('6.2', 2, 'A diagram contrasting x-then-y screen coordinates with row-then-column '
          + 'array indexing.'),
        code:
          'setLocation(x, y);   // x FIRST, across then down\n'
          + 'map[row][col];       // row FIRST, down then across',
        note:
          'And here is why everybody gets this wrong.\n\n'
          + 'Every coordinate in this course so far has been x first: setLocation, addObject, super. '
          + 'Across, then down.\n\n'
          + 'A 2D array is the OPPOSITE. Row first, which is the down one.\n\n'
          + 'These two orders sit next to each other in the same line of code in 6.4, so being '
          + 'clear now saves a great deal of confusion later.',
      },
      {
        shot: SHOT('6.2', 3, 'A non-square grid rendered correctly beside the same grid rendered '
          + 'transposed, with the difference obvious.'),
        code:
          '// A 2 by 4 map. NOT square, on purpose.\n'
          + 'int[][] m = {\n'
          + '    {1, 2, 3, 4},\n'
          + '    {5, 6, 7, 8}\n'
          + '};\n'
          + '\n'
          + 'm[1][3];   // 8, correct\n'
          + 'm[3][1];   // THROWS: there is no row 3',
        note:
          'This map is deliberately not square, and that is the lesson.\n\n'
          + 'Swapping the indexes here throws immediately, because there is no row 3. That is the '
          + 'kind way to find out.\n\n'
          + 'On a SQUARE map, swapping them does not throw. It quietly reads the wrong cell and '
          + 'your map renders transposed, flipped along the diagonal. If your test map is square, '
          + 'the bug is invisible.\n\n'
          + 'Always test with a non-square map. Always.',
      },
    ],

    misconceptions: [
      {
        wrong: '`grid[x][y]` is the natural order, like a coordinate.',
        right: 'It is `grid[row][col]`, and row is the vertical one.',
        why: 'The most common wrong mental model out of any tile-map unit, and every other '
          + 'coordinate in this course reinforces the wrong instinct.',
      },
      {
        wrong: 'If the map looks wrong I will notice immediately.',
        right: 'On a square map, transposed can look plausible. Test with a non-square map.',
        why: 'This is why the bug survives to the project stage.',
      },
      {
        wrong: 'Row is the horizontal one.',
        right: 'A row is a horizontal LINE, but the row NUMBER counts downward.',
        why: 'A genuinely confusing bit of English, and worth stating plainly.',
      },
      {
        wrong: 'Swapping the indexes is always caught by an exception.',
        right: 'Only when the grid is not square.',
        why: 'A student whose test map is 5 by 5 gets no warning at all.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'In `grid[a][b]`, what is a?',
        options: ['The row', 'The column', 'The x coordinate', 'The value'],
        answer: 0,
        why: 'Row-major means the first index is the row.',
      },
      {
        id: 'cfu-2',
        stem: 'Given {{1,2,3},{4,5,6}}, what is `m[1][2]`?',
        options: ['2', '5', '3', '6'],
        answer: 3,
        why: 'Row 1 is {4,5,6}, and column 2 in it is 6.',
      },
      {
        id: 'cfu-3',
        stem: 'Given the same array, what does `m[2][1]` do?',
        options: ['Returns 5', 'Returns 2', 'Throws, because there is no row 2', 'Returns 6'],
        answer: 2,
        why: 'There are only rows 0 and 1.',
      },
      {
        id: 'cfu-4',
        stem: 'Why should a test map NOT be square?',
        options: [
          'Square maps are slower',
          'Java cannot handle square maps',
          'Because swapping the indexes on a square map does not throw and the bug stays hidden',
          'It makes no difference',
        ],
        answer: 2,
        why: 'A non-square map turns a silent bug into an immediate exception.',
      },
      {
        id: 'cfu-5',
        stem: 'How does `map[row][col]` compare to `setLocation(x, y)`?',
        options: [
          'Opposite order: the array puts the vertical one first',
          'Same order',
          'Both put the vertical first',
          'They are unrelated',
        ],
        answer: 0,
        why: 'setLocation is across then down; the array is down then across.',
      },
    ],

    gap: {
      intro:
        'Read the cell on the third row down, second column across, from a map called level. '
        + 'Remember which index comes first and that both count from zero.',
      code: 'int cell = level[___1___][___2___];',
      holes: [
        { n: 1, hint: 'Third row down, counting from zero. And the row index comes first.',
          accept: ['2'] },
        { n: 2, hint: 'Second column across, counting from zero.', accept: ['1'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'Java 2D arrays are indexed:',
        options: ['[col][row]', 'In any order', '[x][y]', '[row][col]'],
        answer: 3,
        why: 'Row-major: the first index selects the row.',
      },
      {
        id: 'q2',
        stem: 'A tile map renders flipped along the diagonal. The likely cause is:',
        options: [
          'The world is too small',
          'The cell size is wrong',
          'The two indexes are swapped',
          'The images are wrong',
        ],
        answer: 2,
        why: 'Swapped indexes transpose the grid.',
      },
      {
        id: 'q3',
        stem: 'On a 5 by 5 map, swapping the indexes:',
        options: [
          'Silently reads the wrong cell, so the bug is invisible',
          'Throws immediately',
          'Has no effect at all',
          'Doubles the map',
        ],
        answer: 0,
        why: 'Both indexes are in range, so nothing complains.',
      },
      {
        id: 'q4',
        stem: 'The best habit for getting the order right is:',
        options: [
          'Guessing and testing',
          'Using x and y as names',
          'Always using square maps',
          'Reading it aloud as "row then column" every time',
        ],
        answer: 3,
        why: 'Saying it in the right order is what makes it stick.',
      },
    ],

    stuck: ['E-10', 'G-20'],

    recap: [
      '`grid[row][col]`. Row FIRST, always.',
      'That is the opposite order from setLocation(x, y).',
      'Swapping them transposes the grid.',
      'A square test map hides the bug completely. Test non-square.',
    ],
  },

  // ── 6.3 ────────────────────────────────────────────────────────────────────
  {
    lesson: '6.3',
    slug: 'nested-for-loops',
    title: 'Nested for Loops',
    minutes: 30,
    seo: {
      h1: 'Nested for Loops over a 2D Array',
      title: 'Java Nested Loops for a 2D Array | Intro to Java',
      description:
        'How two nested for loops visit every cell of a Java 2D array, which loop should be on the '
        + 'outside, and why the inner bound uses grid[row].length.',
      primary: 'java nested for loop 2d array',
      related: ['java visit every cell 2d array', 'java nested loop rows columns',
        'java 2d array traversal', 'java inner loop bound'],
      faq: [
        {
          q: 'How do I loop through every cell of a 2D array in Java?',
          a: 'Two nested for loops: the outer over rows using grid.length, the inner over columns '
            + 'using grid[row].length.',
        },
        {
          q: 'Which loop goes on the outside?',
          a: 'Rows on the outside, columns on the inside. That visits the grid the way you read a '
            + 'page, left to right then down.',
        },
        {
          q: 'How many times does the inner loop body run?',
          a: 'Rows times columns. On a 4 by 5 grid that is 20 times, because the inner loop runs '
            + 'completely for every single pass of the outer one.',
        },
      ],
    },

    hook:
      'One loop walks a row. Two loops walk a grid. This is the shape behind everything left in the '
      + 'course, and there are only two decisions to get right.',

    objectives: [
      'Write nested loops that visit every cell',
      'Explain which loop belongs on the outside',
      'Use the correct bound for the inner loop',
    ],

    vocab: [
      { term: 'Nested loop', plain: 'A loop inside a loop.',
        formal: 'A loop whose body contains another loop.' },
    ],

    steps: [
      {
        shot: SHOT('6.3', 1, 'Nested loops with the outer over rows and the inner over columns, and '
          + 'the visiting order drawn as a path over the grid.'),
        code:
          'for (int row = 0; row < map.length; row++)\n'
          + '{\n'
          + '    for (int col = 0; col < map[row].length; col++)\n'
          + '    {\n'
          + '        int cell = map[row][col];\n'
          + '    }\n'
          + '}',
        note:
          'This is THE shape for the rest of the course.\n\n'
          + 'Outer loop over ROWS, using `map.length`.\n'
          + 'Inner loop over COLUMNS, using `map[row].length`.\n\n'
          + 'And note the variable names: `row` and `col`, not `i` and `j`. With two loops, names '
          + 'that say which is which prevent most of the mistakes in this unit.',
      },
      {
        shot: SHOT('6.3', 2, 'A trace of the visiting order across the whole grid, cell by cell.'),
        note:
          'The order it visits, on a 3 by 4 grid:\n\n'
          + '(0,0) (0,1) (0,2) (0,3), then (1,0) (1,1) (1,2) (1,3), then row 2.\n\n'
          + 'All the way along row 0, then all the way along row 1, and so on. Exactly how you read '
          + 'a page.\n\n'
          + 'The inner loop finishes completely for each single pass of the outer one. That is the '
          + 'whole of what "nested" means.',
      },
      {
        shot: SHOT('6.3', 3, 'The inner bound using grid[row].length, on a grid whose rows are '
          + 'different lengths.'),
        code:
          '// Right: works even if rows differ in length\n'
          + 'for (int col = 0; col < map[row].length; col++)\n'
          + '\n'
          + '// Fragile: assumes every row is as long as row 0\n'
          + 'for (int col = 0; col < map[0].length; col++)',
        note:
          'Why `map[row].length` and not `map[0].length`?\n\n'
          + 'Because each row is its own array, and Java allows rows of different lengths. Using '
          + 'the current row asks the right question every time.\n\n'
          + 'Your maps will be rectangular, so both work today. The first is correct in general and '
          + 'costs nothing, so use it.',
      },
      {
        shot: SHOT('6.3', 4, 'A cell count computed by a nested loop.'),
        code:
          'int cells = 0;\n'
          + 'for (int row = 0; row < map.length; row++)\n'
          + '{\n'
          + '    for (int col = 0; col < map[row].length; col++)\n'
          + '    {\n'
          + '        cells = cells + 1;\n'
          + '    }\n'
          + '}\n'
          + '// on a 4 by 5 map, cells is 20',
        note:
          'The inner body runs rows TIMES columns, not rows plus columns. Twenty on a 4 by 5 grid.\n\n'
          + 'And the counter is declared outside BOTH loops, for the same reason it was in 4.3. '
          + 'Inside the outer loop it would reset on every row; inside the inner loop it would '
          + 'reset on every cell.',
      },
    ],

    misconceptions: [
      {
        wrong: 'The inner loop runs once per outer pass.',
        right: 'It runs completely, all its passes, for every single outer pass.',
        why: 'This is what makes the total rows times columns rather than rows plus columns.',
      },
      {
        wrong: 'Columns should be the outer loop.',
        right: 'Rows outside, columns inside, so the grid is visited the way it is written.',
        why: 'Column-major traversal works but does not match how the literal is laid out, which '
          + 'makes debugging much harder.',
      },
      {
        wrong: 'Name them i and j.',
        right: 'Name them row and col.',
        why: 'With two indexes, names that say which is which prevent most index-order bugs.',
      },
      {
        wrong: 'An accumulator can go inside the outer loop.',
        right: 'It must be outside BOTH, or it resets every row.',
        why: 'Same failure as 3.8 and 4.3, one level deeper, and it gives a per-row answer.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'On a 3 by 5 grid, how many times does the inner loop body run in total?',
        options: ['8', '5', '15', '3'],
        answer: 2,
        why: 'Every column of every row is visited, so the two counts multiply.',
      },
      {
        id: 'cfu-2',
        stem: 'Which loop should be on the outside?',
        options: ['Rows', 'Columns', 'Either', 'Neither, use one loop'],
        answer: 0,
        why: 'Rows outside visits the grid the way the literal is written.',
      },
      {
        id: 'cfu-3',
        stem: 'What is the correct bound for the inner loop?',
        options: ['map[row].length', 'map.length', 'map[col].length', 'map.length - 1'],
        answer: 0,
        why: 'The current row is its own array with its own length.',
      },
      {
        id: 'cfu-4',
        stem: 'A total is declared inside the outer loop. What goes wrong?',
        options: [
          'Nothing',
          'It counts twice',
          'It throws',
          'It resets at the start of every row, so you get a per-row answer',
        ],
        answer: 3,
        why: 'An accumulator must sit outside both loops.',
      },
      {
        id: 'cfu-5',
        stem: 'After (0,0) (0,1) (0,2) on a grid with 3 columns, which cell is next?',
        options: ['(0,3)', '(1,3)', '(1,0)', '(3,0)'],
        answer: 2,
        why: 'The inner loop finishes, so the outer advances to the next row and the column resets.',
      },
    ],

    gap: {
      intro:
        'Visit every cell of a map and count the walls, which are cells containing 1. Put the '
        + 'counter where it will survive both loops.',
      code:
        'int walls = 0;\n'
        + 'for (int row = 0; row < map.___1___; row++)\n'
        + '{\n'
        + '    for (int col = 0; col < map[___2___].length; col++)\n'
        + '    {\n'
        + '        if (map[row][___3___] == 1) { walls++; }\n'
        + '    }\n'
        + '}',
      holes: [
        { n: 1, hint: 'The outer array holds the rows.', accept: ['length'] },
        { n: 2, hint: 'Ask the CURRENT one how long it is, not the first.', accept: ['row'] },
        { n: 3, hint: 'The second index is the column.', accept: ['col'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'Nested loops over a 4 by 6 grid run the inner body:',
        options: ['24 times', '10 times', '6 times', '4 times'],
        answer: 0,
        why: 'Four rows times six columns.',
      },
      {
        id: 'q2',
        stem: 'Why prefer `map[row].length` over `map[0].length`?',
        options: [
          'It is faster',
          'They are the same',
          'Java requires it',
          'Because rows can differ in length, and it asks the right question every time',
        ],
        answer: 3,
        why: 'Each row is its own array.',
      },
      {
        id: 'q3',
        stem: 'Why name the variables row and col rather than i and j?',
        options: [
          'Java requires meaningful names',
          'It runs faster',
          'With two indexes, names that say which is which prevent order mistakes',
          'i and j are reserved',
        ],
        answer: 2,
        why: 'This unit is entirely about not confusing the two.',
      },
      {
        id: 'q4',
        stem: 'The inner loop, relative to the outer:',
        options: [
          'Runs to completion on every single outer pass',
          'Runs once per whole traversal',
          'Runs in parallel',
          'Runs only on the first row',
        ],
        answer: 0,
        why: 'That is what nesting means.',
      },
    ],

    stuck: ['E-10', 'G-12', 'G-20'],

    recap: [
      'Outer loop over rows with `map.length`, inner over columns with `map[row].length`.',
      'Name them row and col.',
      'The inner body runs rows TIMES columns.',
      'An accumulator goes outside BOTH loops.',
    ],
  },

  // ── 6.4 ────────────────────────────────────────────────────────────────────
  {
    lesson: '6.4',
    slug: 'grid-to-world-coordinates',
    title: 'Grid to World Coordinates',
    minutes: 30,
    seo: {
      h1: 'Converting Grid Indexes to World Coordinates',
      title: 'Greenfoot Grid to World Coordinate Conversion | Intro to Java',
      description:
        'How to turn a 2D array row and column into Greenfoot x and y coordinates, and how to go '
        + 'back the other way. The index order swap explained.',
      primary: 'greenfoot grid to world coordinates',
      related: ['greenfoot tile map coordinates', 'java row col to x y',
        'greenfoot cell size conversion', 'greenfoot addObject from array'],
      faq: [
        {
          q: 'How do I convert a 2D array row and column to Greenfoot x and y?',
          a: 'x comes from the column and y comes from the row: addObject(actor, col, row). The two '
            + 'swap places, which is the step most people get wrong.',
        },
        {
          q: 'Why do col and row swap when placing an actor?',
          a: 'Arrays are row first and Greenfoot coordinates are x first, and x is horizontal like '
            + 'the column. So the order reverses.',
        },
        {
          q: 'How do I find which grid cell an actor is standing on?',
          a: 'Go the other way: row is the actor y and col is the actor x, so the cell is '
            + 'map[getY()][getX()].',
        },
      ],
    },

    hook:
      'You have a grid of numbers and a world of coordinates. This lesson is the bridge between '
      + 'them, and it contains one swap that trips up nearly everybody.',

    objectives: [
      'Convert a row and column into world coordinates',
      'Convert an actor position back into a grid cell',
      'Explain why the two orders are reversed',
    ],

    vocab: [
      { term: 'Conversion', plain: 'Turning a grid position into a world one, or back.',
        formal: 'Mapping between array indexes and world coordinates.' },
    ],

    steps: [
      {
        shot: SHOT('6.4', 1, 'A diagram with a grid on the left and a world on the right, and an '
          + 'arrow showing col becoming x and row becoming y.'),
        code:
          '// Grid says [row][col]. The world wants (x, y).\n'
          + '// x is horizontal, and so is the COLUMN.\n'
          + '// y is vertical,  and so is the ROW.\n'
          + '\n'
          + 'addObject(new Wall(), col, row);   // note the SWAP',
        note:
          'Here is the whole lesson in one line, and it is worth staring at.\n\n'
          + 'The array is `[row][col]`. The world wants `(x, y)`.\n\n'
          + 'x is the horizontal one, and the horizontal index is COL. So x comes from col.\n'
          + 'y is the vertical one, and the vertical index is ROW. So y comes from row.\n\n'
          + 'The two swap places. `map[row][col]` becomes `addObject(a, col, row)`. Getting this '
          + 'backwards is the transposed map from 6.2 arriving by a different route.',
      },
      {
        shot: SHOT('6.4', 2, 'A nested loop placing a wall for every 1 in the map, with the swap '
          + 'visible in the addObject call.'),
        code:
          'for (int row = 0; row < map.length; row++)\n'
          + '{\n'
          + '    for (int col = 0; col < map[row].length; col++)\n'
          + '    {\n'
          + '        if (map[row][col] == 1)\n'
          + '        {\n'
          + '            addObject(new Wall(), col, row);\n'
          + '        }\n'
          + '    }\n'
          + '}',
        note:
          'And there it is, the two orders side by side in the same block.\n\n'
          + '`map[row][col]` reads the cell. `addObject(..., col, row)` places the actor.\n\n'
          + 'This is the whole tile-map renderer, and the next lesson only adds more tile types.',
      },
      {
        shot: SHOT('6.4', 3, 'An actor standing on a cell, with its world position being used to '
          + 'index back into the map.'),
        code:
          '// The other direction: which cell am I standing on?\n'
          + 'int myRow = getY();\n'
          + 'int myCol = getX();\n'
          + 'int cell  = map[myRow][myCol];',
        note:
          'Going back the other way, which is how a player checks what it is standing on.\n\n'
          + 'Same swap in reverse: the actor\'s y is the row, its x is the column.\n\n'
          + 'This works directly because the world uses one cell per grid square. If the cell size '
          + 'were larger you would divide by it first, which is exactly what cell size meant in 3.5.',
      },
      {
        shot: SHOT('6.4', 4, 'A world constructed to exactly match the dimensions of the map array.'),
        code:
          'public MazeWorld()\n'
          + '{\n'
          + '    // columns become width, rows become height\n'
          + '    super(map[0].length, map.length, 32);\n'
          + '    prepare();\n'
          + '}',
        note:
          'Size the world FROM the map and the two can never disagree.\n\n'
          + 'The swap appears here too. `super(width, height, ...)` wants width first, and width is '
          + 'the number of COLUMNS. Height is the number of ROWS.\n\n'
          + 'Hardcode 20 by 15 and then edit the map, and you get walls placed outside the world or '
          + 'an empty band down one side. Deriving it means the world is always exactly right.',
      },
    ],

    misconceptions: [
      {
        wrong: '`addObject(a, row, col)` is right because row comes first in the array.',
        right: 'The world wants x first, and x is the COLUMN. They swap.',
        why: 'The most common bug in this unit, and on a square map it renders transposed with no '
          + 'error at all.',
      },
      {
        wrong: 'Rows are the width of the world.',
        right: 'COLUMNS are the width. Rows are the height.',
        why: 'Getting this wrong makes the world the wrong shape for the map it holds.',
      },
      {
        wrong: 'The conversion needs complicated math.',
        right: 'With one cell per grid square it is just a swap. Cell size only enters if you use '
          + 'pixel coordinates.',
        why: 'Students overcomplicate this and introduce bugs that were not there.',
      },
      {
        wrong: 'You can hardcode the world size and keep it in step by hand.',
        right: 'Derive it from the map, or they drift apart the first time you edit the level.',
        why: 'The same argument as `a.length` over a typed number in 5.3.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'A wall belongs at row 3, column 7. Which call places it?',
        options: [
          'addObject(new Wall(), 3, 7)',
          'addObject(new Wall(), 10, 10)',
          'addObject(new Wall(), 3, 3)',
          'addObject(new Wall(), 7, 3)',
        ],
        answer: 3,
        why: 'x comes from the column, y from the row, so they swap.',
      },
      {
        id: 'cfu-2',
        stem: 'Which array index does the world x correspond to?',
        options: ['The row', 'Both', 'The column', 'Neither'],
        answer: 2,
        why: 'x is horizontal, and so is the column.',
      },
      {
        id: 'cfu-3',
        stem: 'An actor is at x 4, y 2. Which cell is it standing on?',
        options: ['map[2][4]', 'map[4][2]', 'map[6][6]', 'map[0][0]'],
        answer: 0,
        why: 'Row comes from y, column from x.',
      },
      {
        id: 'cfu-4',
        stem: 'A map has 8 rows and 12 columns. How should the world be created?',
        options: ['super(8, 12, 32)', 'super(12, 12, 32)', 'super(96, 96, 32)', 'super(12, 8, 32)'],
        answer: 3,
        why: 'Width is columns, height is rows.',
      },
      {
        id: 'cfu-5',
        stem: 'Why derive the world size from the map?',
        options: [
          'It is faster',
          'Java requires it',
          'So editing the map cannot leave the world the wrong size',
          'To use less memory',
        ],
        answer: 2,
        why: 'Hardcoded dimensions drift the first time the level changes.',
      },
    ],

    gap: {
      intro:
        'Place a wall in the world for every 1 in the map. Get the coordinate order right when you '
        + 'call addObject.',
      code:
        'if (map[row][col] == 1)\n'
        + '{\n'
        + '    addObject(new Wall(), ___1___, ___2___);\n'
        + '}',
      holes: [
        { n: 1, hint: 'The world wants x first, and x is the horizontal one.', accept: ['col'] },
        { n: 2, hint: 'y is the vertical one.', accept: ['row'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: '`map[row][col]` becomes which addObject call?',
        options: [
          'addObject(a, col, row)',
          'addObject(a, row, col)',
          'addObject(a, row, row)',
          'addObject(a, col, col)',
        ],
        answer: 0,
        why: 'The order reverses, because the world wants x first.',
      },
      {
        id: 'q2',
        stem: 'The width of a world built from a map is:',
        options: ['map.length', 'The cell size', 'map.length times 2', 'map[0].length'],
        answer: 3,
        why: 'Width is the number of columns.',
      },
      {
        id: 'q3',
        stem: 'A map renders transposed and there is no error. What is worth checking?',
        options: [
          'Whether col and row are the right way round in addObject',
          'The cell size',
          'The actor images',
          'The speed slider',
        ],
        answer: 0,
        why: 'A swapped pair transposes the render silently.',
      },
      {
        id: 'q4',
        stem: 'Why is the conversion just a swap here?',
        options: [
          'Because the world uses one cell per grid square',
          'Because Java handles it',
          'Because the map is square',
          'It is not a swap',
        ],
        answer: 0,
        why: 'With a bigger cell size in pixel terms you would also divide.',
      },
    ],

    stuck: ['G-13', 'G-20'],

    recap: [
      'x comes from COL. y comes from ROW. They swap.',
      '`map[row][col]` reads; `addObject(a, col, row)` places.',
      'World width is `map[0].length`; height is `map.length`.',
      'Derive the world size from the map so they cannot disagree.',
    ],
  },

  // ── 6.5 ────────────────────────────────────────────────────────────────────
  {
    lesson: '6.5',
    slug: 'rendering-a-tile-map',
    title: 'Rendering a Tile Map',
    minutes: 35,
    seo: {
      h1: 'Rendering a Tile Map in Greenfoot',
      title: 'Greenfoot Tile Map from a 2D Array | Intro to Java',
      description:
        'How to turn a 2D array of tile codes into a Greenfoot level, using nested loops and an if '
        + 'chain, with one actor type per code.',
      primary: 'greenfoot tile map from 2d array',
      related: ['greenfoot render level from array', 'java tile code array',
        'greenfoot build level in code', 'greenfoot map legend'],
      faq: [
        {
          q: 'How do I build a Greenfoot level from a 2D array?',
          a: 'Loop over every cell with nested loops, and use an if chain on the value to decide '
            + 'which actor to add, remembering that x comes from the column.',
        },
        {
          q: 'How do I have more than one kind of tile?',
          a: 'Use different numbers in the map and an else if chain that creates a different actor '
            + 'for each code.',
        },
        {
          q: 'Should 0 create an actor in a tile map?',
          a: 'Usually not. Leave 0 as empty floor and add nothing, which keeps the actor count and '
            + 'the memory use down.',
        },
      ],
    },

    hook:
      'Every idea in this course arrives here at once: a 2D array, nested loops, an if chain, a '
      + 'coordinate swap, and addObject. Twelve lines, and you have a level editor.',

    objectives: [
      'Render a multi-tile map from an array',
      'Use a legend of codes and keep it beside the map',
      'Explain why code 0 should usually add nothing',
    ],

    vocab: [
      { term: 'Tile code', plain: 'A number standing for a kind of tile.',
        formal: 'An integer value mapped to an actor type by the renderer.' },
      { term: 'Legend', plain: 'The comment saying which number means what.',
        formal: 'The documented mapping between codes and tile types.' },
    ],

    steps: [
      {
        shot: SHOT('6.5', 1, 'A map array with a legend comment above it, using several different '
          + 'tile codes.'),
        code:
          '// 0 floor, 1 wall, 2 coin, 3 player start\n'
          + 'private int[][] map = {\n'
          + '    {1, 1, 1, 1, 1, 1},\n'
          + '    {1, 3, 0, 2, 0, 1},\n'
          + '    {1, 0, 1, 1, 0, 1},\n'
          + '    {1, 2, 0, 0, 0, 1},\n'
          + '    {1, 1, 1, 1, 1, 1}\n'
          + '};',
        note:
          'The legend comment is not decoration. Come back in a week and `2` means nothing without '
          + 'it.\n\n'
          + 'Keep it directly above the map, always. If the two ever drift apart, the map becomes '
          + 'unreadable and the only way to work out what a number means is to run it.\n\n'
          + 'You can already see the level: a walled room, a couple of coins, an interior wall, and '
          + 'the player at top left.',
      },
      {
        shot: SHOT('6.5', 2, 'The renderer method with an if chain creating a different actor for '
          + 'each code.'),
        code:
          'public void buildMap()\n'
          + '{\n'
          + '    for (int row = 0; row < map.length; row++)\n'
          + '    {\n'
          + '        for (int col = 0; col < map[row].length; col++)\n'
          + '        {\n'
          + '            int code = map[row][col];\n'
          + '            if (code == 1)      { addObject(new Wall(),   col, row); }\n'
          + '            else if (code == 2) { addObject(new Coin(),   col, row); }\n'
          + '            else if (code == 3) { addObject(new Player(), col, row); }\n'
          + '        }\n'
          + '    }\n'
          + '}',
        note:
          'The whole renderer. Look at what is in it and where it came from:\n\n'
          + 'Nested loops from 6.3. The index swap from 6.4. An else if chain from 2.5. addObject '
          + 'from 3.7. A method from 3.2.\n\n'
          + 'Nothing here is new. This lesson is the assembly, and that is worth noticing: the '
          + 'hardest-looking thing in the course is five familiar pieces stacked up.',
      },
      {
        shot: SHOT('6.5', 3, 'The rendered level in the world, matching the array laid out in the '
          + 'code beside it.'),
        note:
          'Notice there is no branch for code 0. Floor adds nothing.\n\n'
          + 'That is deliberate. A 30 by 20 map is 600 cells, and adding a floor actor for every '
          + 'empty one would put 600 actors in a world that needs about 80. On a 1 GB box that '
          + 'matters, and it makes getObjects slower for no benefit.\n\n'
          + 'If you want a visible floor, use a background image on the world instead.',
      },
      {
        shot: SHOT('6.5', 4, 'The constructor calling buildMap, and the world sized from the map.'),
        code:
          'public MazeWorld()\n'
          + '{\n'
          + '    super(map[0].length, map.length, 32);\n'
          + '    buildMap();\n'
          + '}',
        note:
          'And the constructor ties it together, exactly as prepare() did in 3.7.\n\n'
          + 'The world is sized from the map, then the map is rendered. Press Reset and the whole '
          + 'level rebuilds itself, because the constructor runs again.\n\n'
          + 'To design a new level, edit the numbers. That is the payoff for the entire unit, and '
          + 'it is how real tile-based games are built.',
      },
    ],

    misconceptions: [
      {
        wrong: 'Every cell needs an actor, including floor.',
        right: 'Add nothing for 0. Use a background image if you want visible floor.',
        why: 'Hundreds of pointless actors slow the scenario and make every getObjects call worse.',
      },
      {
        wrong: 'The legend is optional.',
        right: 'Without it, the map is unreadable within a week.',
        why: 'The readability of the map as a map is the whole reason for this design.',
      },
      {
        wrong: 'Adding a tile type means rewriting the renderer.',
        right: 'It is one more `else if` and one more number.',
        why: 'This is what makes the design worth having.',
      },
      {
        wrong: 'buildMap can go in act().',
        right: 'It goes in the constructor. In act() it rebuilds the level every frame.',
        why: 'Exactly the 4.7 failure again: a finite loop run every frame.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'Why is there no branch for code 0?',
        options: [
          'Because 0 is invalid',
          'Because Java skips zero',
          'Because floor needs no actor, and adding hundreds would be wasteful',
          'It is a bug',
        ],
        answer: 2,
        why: 'Empty cells should stay empty.',
      },
      {
        id: 'cfu-2',
        stem: 'You want to add spikes as code 4. What do you change?',
        options: [
          'Add one else if branch, and use 4 in the map',
          'Rewrite the renderer',
          'Add a second map',
          'Change the world size',
        ],
        answer: 0,
        why: 'One branch and one number.',
      },
      {
        id: 'cfu-3',
        stem: 'Where should buildMap be called from?',
        options: ['act()', 'Nowhere', 'The player', 'The constructor'],
        answer: 3,
        why: 'Once at creation, so it rebuilds on Reset and not every frame.',
      },
      {
        id: 'cfu-4',
        stem: 'What happens if buildMap is called from act()?',
        options: [
          'The level renders once',
          'The scenario freezes',
          'The whole level is rebuilt every frame, flooding the world',
          'Nothing',
        ],
        answer: 2,
        why: 'The same failure as a spawn loop in act() from 4.7.',
      },
      {
        id: 'cfu-5',
        stem: 'Why keep the legend comment directly above the map?',
        options: [
          'Java requires comments',
          'Because the numbers are meaningless without it',
          'To make the file longer',
          'It does not matter',
        ],
        answer: 1,
        why: 'A drifted legend makes the map unreadable.',
      },
    ],

    gap: {
      intro:
        'Complete the renderer so a 1 becomes a wall and a 2 becomes a coin. Watch the coordinate '
        + 'order.',
      code:
        'int code = map[row][col];\n'
        + 'if (code == 1)\n'
        + '{\n'
        + '    addObject(new Wall(), ___1___, ___2___);\n'
        + '}\n'
        + '___3___ (code == 2)\n'
        + '{\n'
        + '    addObject(new Coin(), col, row);\n'
        + '}',
      holes: [
        { n: 1, hint: 'The world wants x first, which is the horizontal index.', accept: ['col'] },
        { n: 2, hint: 'And then the vertical one.', accept: ['row'] },
        { n: 3, hint: 'Two keywords, to continue the chain rather than start a new decision.',
          accept: ['else if'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'A tile renderer is made of:',
        options: [
          'Nested loops, an if chain, and addObject with the indexes swapped',
          'One loop and a switch',
          'A single addObject call',
          'A while loop over the world',
        ],
        answer: 0,
        why: 'It is an assembly of pieces from Units 2, 3 and 6.',
      },
      {
        id: 'q2',
        stem: 'A 30 by 20 map with a floor actor per empty cell would create roughly:',
        options: ['50 actors', '600 actors', '30 actors', '20 actors'],
        answer: 1,
        why: 'Rows times columns, most of which are floor.',
      },
      {
        id: 'q3',
        stem: 'To design a new level you:',
        options: [
          'Rewrite buildMap',
          'Edit the numbers in the map array',
          'Add more classes',
          'Resize the world by hand',
        ],
        answer: 1,
        why: 'The renderer never changes. That is the point.',
      },
      {
        id: 'q4',
        stem: 'The world is sized with `super(map[0].length, map.length, 32)`. Why that order?',
        options: [
          'Width is columns and height is rows',
          'It is arbitrary',
          'Rows are always wider',
          'To make it square',
        ],
        answer: 0,
        why: 'The same swap as everywhere else in this unit.',
      },
    ],

    stuck: ['G-13', 'G-20', 'R-10'],

    recap: [
      'Nested loops, read the code, if chain, addObject with col and row swapped.',
      'Keep the legend comment directly above the map.',
      'Add nothing for 0. Use a background image for visible floor.',
      'Call the renderer from the CONSTRUCTOR, never from act().',
    ],
  },

  // ── 6.6 ────────────────────────────────────────────────────────────────────
  {
    lesson: '6.6',
    slug: 'bounds-and-neighbors',
    title: 'Bounds and Neighbors',
    minutes: 35,
    seo: {
      h1: 'Bounds Checking and Neighbors in a 2D Array',
      title: 'Java 2D Array Bounds Check and Neighbors | Intro to Java',
      description:
        'How to check a grid cell exists before reading it, why the order of the checks matters, '
        + 'and how to look at the neighbors of a cell safely.',
      primary: 'java 2d array bounds check',
      related: ['java check array index before access', 'java short circuit bounds check',
        'greenfoot wall collision grid', 'java neighbors 2d array'],
      faq: [
        {
          q: 'How do I check a cell exists before reading a 2D array?',
          a: 'Test the row and column are in range first, and only then read the cell. Java stops '
            + 'evaluating an && as soon as one part is false, which is what makes it safe.',
        },
        {
          q: 'Why does the order of my bounds check matter?',
          a: 'If the array lookup comes first it runs before the guard can protect it, and throws. '
            + 'The range tests must come first.',
        },
        {
          q: 'How do I stop a player walking through walls in a grid game?',
          a: 'Work out the destination cell, check it is in bounds, and only move if the value '
            + 'there is not a wall.',
        },
      ],
    },

    hook:
      'Every grid game asks "what is next to me", and every edge cell has neighbors that do not '
      + 'exist. Handling that is one method, and the order of two tests inside it is the difference '
      + 'between working and crashing.',

    objectives: [
      'Write a bounds check for a row and column',
      'Explain why the range tests must come before the lookup',
      'Use a bounds-checked lookup for wall collision',
    ],

    vocab: [
      { term: 'In bounds', plain: 'This cell actually exists.',
        formal: 'Row and column both within the valid index ranges.' },
      { term: 'Short circuit', plain: 'Java stops as soon as it knows the answer.',
        formal: '&& does not evaluate its right side when the left is false.' },
    ],

    steps: [
      {
        shot: SHOT('6.6', 1, 'A bounds-checking method with all four conditions.'),
        code:
          'public boolean inBounds(int row, int col)\n'
          + '{\n'
          + '    return row >= 0 && row < map.length\n'
          + '        && col >= 0 && col < map[0].length;\n'
          + '}',
        note:
          'Four tests, and all four are needed.\n\n'
          + 'Row not negative, row not past the last row, column not negative, column not past the '
          + 'last column.\n\n'
          + 'It returns a boolean, so it drops straight into an if, which is the 3.4 pattern. '
          + 'Naming it `inBounds` means the calling code says what it means.',
      },
      {
        shot: SHOT('6.6', 2, 'A combined check with the bounds test before the lookup, and a broken '
          + 'version with them the other way round.'),
        code:
          '// SAFE: the guard runs first\n'
          + 'if (inBounds(r, c) && map[r][c] == 1) { ... }\n'
          + '\n'
          + '// THROWS: the lookup happens before the guard can help\n'
          + 'if (map[r][c] == 1 && inBounds(r, c)) { ... }',
        note:
          'This is the payoff for short-circuit evaluation from 2.3, and it is a lovely piece of '
          + 'machinery.\n\n'
          + 'In the safe version, if `inBounds` is false Java NEVER EVALUATES the right side, so '
          + 'the out-of-range lookup never happens.\n\n'
          + 'In the broken version the lookup runs first and throws before the check can save you. '
          + 'Same two tests, opposite results, purely because of order.',
      },
      {
        shot: SHOT('6.6', 3, 'A grid with a highlighted cell and its four orthogonal neighbors, '
          + 'two of which are outside the grid.'),
        code:
          'int walls = 0;\n'
          + 'if (inBounds(row - 1, col) && map[row - 1][col] == 1) { walls++; }  // up\n'
          + 'if (inBounds(row + 1, col) && map[row + 1][col] == 1) { walls++; }  // down\n'
          + 'if (inBounds(row, col - 1) && map[row][col - 1] == 1) { walls++; }  // left\n'
          + 'if (inBounds(row, col + 1) && map[row][col + 1] == 1) { walls++; }  // right\n',
        note:
          'The four orthogonal neighbors. Up is row minus one, because row counts DOWNWARD, which '
          + 'is the same rule as y from 1.4.\n\n'
          + 'A corner cell has two neighbors that do not exist, and the guard on every line is '
          + 'what stops that throwing. It is repetitive on purpose: at this stage clear beats '
          + 'clever.',
      },
      {
        shot: SHOT('6.6', 4, 'A player blocked by a wall, with the destination cell checked before '
          + 'the move.'),
        code:
          'public void tryMove(int dRow, int dCol)\n'
          + '{\n'
          + '    int newRow = getY() + dRow;\n'
          + '    int newCol = getX() + dCol;\n'
          + '\n'
          + '    if (world.inBounds(newRow, newCol) && world.tileAt(newRow, newCol) != 1)\n'
          + '    {\n'
          + '        setLocation(newCol, newRow);   // swap again\n'
          + '    }\n'
          + '}',
        note:
          'And this is grid-based wall collision, which is the mechanic Tile Dungeon is built on.\n\n'
          + 'Work out where you WOULD go, check that cell exists and is not a wall, and only then '
          + 'move. No collision detection needed at all: the array already knows where the walls '
          + 'are.\n\n'
          + 'Note `setLocation(newCol, newRow)`: the swap from 6.4, one last time.',
      },
    ],

    misconceptions: [
      {
        wrong: 'The bounds check can go after the lookup.',
        right: 'The lookup throws before the check can run. Order is everything.',
        why: 'The single most common way a bounds check fails to protect anything.',
      },
      {
        wrong: 'Only the upper bound needs checking.',
        right: 'Negative indexes throw too, and the cell above row 0 is negative.',
        why: 'Half the edge cases are at the top and left.',
      },
      {
        wrong: 'Up is row plus one.',
        right: 'Up is row MINUS one, because rows count downward.',
        why: 'The same inversion as y in 1.4, and it catches people again here.',
      },
      {
        wrong: 'Wall collision needs isTouching.',
        right: 'With a grid, look the destination up in the array. It is simpler and exact.',
        why: 'Grid movement with pixel collision produces actors that half-enter walls.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'Why must `inBounds(r, c)` come BEFORE `map[r][c]` in an &&?',
        options: [
          'For readability',
          'Because Java stops at the first false, so the unsafe lookup never runs',
          'It does not matter',
          'Because inBounds is faster',
        ],
        answer: 1,
        why: 'Short-circuit evaluation is what makes the guard work.',
      },
      {
        id: 'cfu-2',
        stem: 'Which is the cell ABOVE map[3][5]?',
        options: ['map[4][5]', 'map[2][5]', 'map[3][6]', 'map[3][4]'],
        answer: 1,
        why: 'Rows count downward, so up is one less.',
      },
      {
        id: 'cfu-3',
        stem: 'How many of the four tests in inBounds are needed?',
        options: ['Two', 'Three', 'All four', 'One'],
        answer: 2,
        why: 'Both a lower and an upper bound, for both row and column.',
      },
      {
        id: 'cfu-4',
        stem: 'A corner cell is asked for its four neighbors. What happens without guards?',
        options: [
          'Nothing, corners are fine',
          'Two of the lookups throw, because those cells do not exist',
          'All four throw',
          'It returns zero',
        ],
        answer: 1,
        why: 'A corner has two neighbors outside the grid.',
      },
      {
        id: 'cfu-5',
        stem: 'In a grid game, how is wall collision best done?',
        options: [
          'isTouching(Wall.class)',
          'Look up the destination cell in the array before moving',
          'Check the actor image',
          'Use getObjects',
        ],
        answer: 1,
        why: 'The array already knows where the walls are, exactly.',
      },
    ],

    gap: {
      intro:
        'Write the bounds check. All four tests are needed, and the row is checked against the '
        + 'number of rows.',
      code:
        'public boolean inBounds(int row, int col)\n'
        + '{\n'
        + '    return row ___1___ 0 && row < map.___2___\n'
        + '        && col >= 0 && col ___3___ map[0].length;\n'
        + '}',
      holes: [
        { n: 1, hint: 'Row must not be negative, and zero itself is valid. Two characters.',
          accept: ['>='] },
        { n: 2, hint: 'The number of rows.', accept: ['length'] },
        { n: 3, hint: 'Must stop one before the column count. One character.', accept: ['<'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: '`if (map[r][c] == 1 && inBounds(r, c))` is wrong because:',
        options: [
          'inBounds is slow',
          'The lookup runs first and throws before the guard can help',
          'You cannot use && there',
          'It is not wrong',
        ],
        answer: 1,
        why: 'Order decides which is evaluated first.',
      },
      {
        id: 'q2',
        stem: 'Why does `&&` make the safe version work?',
        options: [
          'It evaluates both sides always',
          'It stops as soon as the left side is false, so the right side never runs',
          'It reverses the order',
          'It catches the exception',
        ],
        answer: 1,
        why: 'Short-circuit evaluation.',
      },
      {
        id: 'q3',
        stem: 'The four neighbors of map[row][col] are at:',
        options: [
          'row+1, row-1, col+1, col-1, each with the other index unchanged',
          'row+1 and col+1 only',
          'All eight surrounding cells',
          'The four corners',
        ],
        answer: 0,
        why: 'Orthogonal neighbors change exactly one index by one.',
      },
      {
        id: 'q4',
        stem: 'Grid-based wall collision works by:',
        options: [
          'Checking the destination cell in the array before moving',
          'Detecting overlap after moving',
          'Counting walls',
          'Using isTouching every frame',
        ],
        answer: 0,
        why: 'Look before you leap, and the array is exact.',
      },
    ],

    stuck: ['E-10', 'G-20', 'R-11'],

    recap: [
      'inBounds needs all four tests: row and column, lower and upper.',
      'The bounds check must come FIRST in the &&, or the lookup throws anyway.',
      'Up is row MINUS one. Rows count downward.',
      'Grid collision means checking the destination cell, not detecting overlap.',
    ],
  },

  // ── 6.7 ────────────────────────────────────────────────────────────────────
  {
    lesson: '6.7',
    slug: 'row-and-column-algorithms',
    title: 'Row and Column Algorithms',
    minutes: 35,
    seo: {
      h1: 'Row and Column Algorithms on a 2D Array',
      title: 'Java 2D Array Row and Column Totals | Intro to Java',
      description:
        'How to total a single row, scan a column, and count a value across a whole grid, and '
        + 'where the accumulator goes in each case.',
      primary: 'java 2d array row total column scan',
      related: ['java sum a row 2d array', 'java loop down a column',
        'java count value in grid', 'java 2d array accumulator placement'],
      faq: [
        {
          q: 'How do I total one row of a Java 2D array?',
          a: 'Fix the row and loop over the columns, adding each cell to a total declared before '
            + 'the loop.',
        },
        {
          q: 'How do I loop down a column instead of along a row?',
          a: 'Fix the column and loop the row index instead. The row varies and the column stays '
            + 'the same.',
        },
        {
          q: 'Where does the accumulator go for a per-row total?',
          a: 'Inside the outer loop and outside the inner one, so it resets for each row. A '
            + 'grid-wide total goes outside both.',
        },
      ],
    },

    hook:
      'The last lesson of the course, and it is the one where the accumulator placement from Unit 3 '
      + 'finally has three possible homes instead of two, and each gives a different answer.',

    objectives: [
      'Total a single row and scan a single column',
      'Count a value across the whole grid',
      'Place the accumulator correctly for per-row versus whole-grid results',
    ],

    vocab: [
      { term: 'Row scan', plain: 'Fix the row, vary the column.',
        formal: 'Iterating the second index with the first held constant.' },
      { term: 'Column scan', plain: 'Fix the column, vary the row.',
        formal: 'Iterating the first index with the second held constant.' },
    ],

    steps: [
      {
        shot: SHOT('6.7', 1, 'A single row highlighted in a grid with its values being totalled.'),
        code:
          'public int rowTotal(int row)\n'
          + '{\n'
          + '    int total = 0;\n'
          + '    for (int col = 0; col < map[row].length; col++)\n'
          + '    {\n'
          + '        total = total + map[row][col];\n'
          + '    }\n'
          + '    return total;\n'
          + '}',
        note:
          'One row. The row is FIXED, given as a parameter, and only the column varies.\n\n'
          + 'One loop, not two, because you are walking a line rather than a grid. That is the whole '
          + 'difference between a row scan and a grid traversal.',
      },
      {
        shot: SHOT('6.7', 2, 'A single column highlighted, with the row index varying down it.'),
        code:
          'public int columnTotal(int col)\n'
          + '{\n'
          + '    int total = 0;\n'
          + '    for (int row = 0; row < map.length; row++)\n'
          + '    {\n'
          + '        total = total + map[row][col];\n'
          + '    }\n'
          + '    return total;\n'
          + '}',
        note:
          'A column, and it is the mirror image. Now the COLUMN is fixed and the ROW varies.\n\n'
          + 'Look at what changed: the loop counts rows, and the bound is `map.length` rather than '
          + '`map[row].length`. The subscript order in `map[row][col]` is identical, because that '
          + 'never changes.\n\n'
          + 'Which index varies is the only decision.',
      },
      {
        shot: SHOT('6.7', 3, 'A whole-grid count with the accumulator outside both loops.'),
        code:
          'int coins = 0;                                    // outside BOTH\n'
          + 'for (int row = 0; row < map.length; row++)\n'
          + '{\n'
          + '    for (int col = 0; col < map[row].length; col++)\n'
          + '    {\n'
          + '        if (map[row][col] == 2) { coins++; }\n'
          + '    }\n'
          + '}',
        note:
          'A whole-grid count, with the accumulator outside BOTH loops so it survives the entire '
          + 'traversal.\n\n'
          + 'Move that declaration inside the outer loop and you get the count for the LAST ROW '
          + 'ONLY, because it resets on every row. Move it inside the inner loop and you get 1.\n\n'
          + 'Three positions, three different answers, and only one of them is what you asked for. '
          + 'This is the 3.8 idea at its most demanding, and getting it right is what separates code '
          + 'that works from code that happens to work.',
      },
      {
        shot: SHOT('6.7', 4, 'Per-row totals printed for each row, with the accumulator reset '
          + 'between rows.'),
        code:
          'for (int row = 0; row < map.length; row++)\n'
          + '{\n'
          + '    int total = 0;                 // inside the OUTER loop, on purpose\n'
          + '    for (int col = 0; col < map[row].length; col++)\n'
          + '    {\n'
          + '        total = total + map[row][col];\n'
          + '    }\n'
          + '    showText("Row " + row + ": " + total, 2, row);\n'
          + '}',
        note:
          'And here the reset is exactly what you want.\n\n'
          + 'Declaring `total` inside the outer loop means it starts fresh for each row, which is '
          + 'precisely right for PER-ROW totals.\n\n'
          + 'So the placement is not a rule to memorise. It is a decision, and the question that '
          + 'settles it is: what am I counting, and over what?\n\n'
          + 'That question is the last idea in the course, and it is the one that transfers '
          + 'everywhere.',
      },
    ],

    misconceptions: [
      {
        wrong: 'A row scan needs nested loops.',
        right: 'One loop. The row is fixed; only the column varies.',
        why: 'Using two loops for a single row gives you the whole grid instead.',
      },
      {
        wrong: 'For a column scan, the subscript order changes.',
        right: 'It is always `map[row][col]`. Only which index VARIES changes.',
        why: 'Swapping the subscripts here reintroduces the transposition bug from 6.2.',
      },
      {
        wrong: 'The accumulator always goes outside both loops.',
        right: 'Outside both for a grid total; inside the outer for per-row totals.',
        why: 'It is a decision driven by the question, not a rule, and this is the lesson that '
          + 'makes that concrete.',
      },
      {
        wrong: 'The bound for a column scan is `map[row].length`.',
        right: 'It is `map.length`, because you are counting rows.',
        why: 'Using the wrong length is an immediate out-of-bounds on a non-square grid.',
      },
    ],

    cfus: [
      {
        id: 'cfu-1',
        stem: 'How many loops does a single row total need?',
        options: ['One', 'Two', 'Three', 'None'],
        answer: 0,
        why: 'The row is fixed, so only the column varies.',
      },
      {
        id: 'cfu-2',
        stem: 'In a column scan, which index varies?',
        options: ['The column', 'The row', 'Both', 'Neither'],
        answer: 1,
        why: 'The column is fixed and you walk down the rows.',
      },
      {
        id: 'cfu-3',
        stem: 'A grid-wide counter is declared inside the OUTER loop. What do you get?',
        options: [
          'The correct total',
          'The count for the last row only',
          'Always 1',
          'An exception',
        ],
        answer: 1,
        why: 'It resets at the start of every row, so only the final row survives.',
      },
      {
        id: 'cfu-4',
        stem: 'What is the loop bound for a column scan?',
        options: ['map[row].length', 'map.length', 'map[0].length', 'map.length - 1'],
        answer: 1,
        why: 'You are counting rows, so the row count is the bound.',
      },
      {
        id: 'cfu-5',
        stem: 'You want a separate total for each row. Where does the accumulator go?',
        options: [
          'Outside both loops',
          'Inside the outer loop, outside the inner',
          'Inside the inner loop',
          'In the method signature',
        ],
        answer: 1,
        why: 'It should reset once per row, which is exactly that position.',
      },
    ],

    gap: {
      intro:
        'Count how many coins, which are cells containing 2, are in the WHOLE grid. Put the counter '
        + 'where it will survive the entire traversal.',
      code:
        'int coins = ___1___;\n'
        + 'for (int row = 0; row < map.length; row++)\n'
        + '{\n'
        + '    for (int col = 0; col < map[row].length; col++)\n'
        + '    {\n'
        + '        if (map[___2___][___3___] == 2) { coins++; }\n'
        + '    }\n'
        + '}',
      holes: [
        { n: 1, hint: 'Nothing counted yet. And note this line is outside both loops.',
          accept: ['0'] },
        { n: 2, hint: 'The first subscript is always the vertical one.', accept: ['row'] },
        { n: 3, hint: 'And the second is the horizontal one.', accept: ['col'] },
      ],
    },

    quiz: [
      {
        id: 'q1',
        stem: 'A row scan fixes the row and varies:',
        options: ['The row', 'The column', 'Both', 'The length'],
        answer: 1,
        why: 'Walking along a row means changing the column.',
      },
      {
        id: 'q2',
        stem: 'For a column scan the subscript order is:',
        options: [
          'map[col][row], reversed',
          'map[row][col], unchanged; only which index varies changes',
          'Either',
          'map[col][col]',
        ],
        answer: 1,
        why: 'Row-major never changes.',
      },
      {
        id: 'q3',
        stem: 'A counter inside the INNER loop gives you:',
        options: ['The grid total', 'The last row total', '0 or 1', 'An exception'],
        answer: 2,
        why: 'It is rebuilt for every single cell.',
      },
      {
        id: 'q4',
        stem: 'Deciding where the accumulator goes is:',
        options: [
          'A fixed rule: always outside both',
          'A decision driven by what you are counting and over what',
          'Random',
          'Handled by Java',
        ],
        answer: 1,
        why: 'Per-row and whole-grid want different placements.',
      },
      {
        id: 'q5',
        stem: 'Why is `map.length` the bound for a column scan?',
        options: [
          'Because you are counting rows as you walk down',
          'Because it is always the bound',
          'Because columns are longer',
          'It is not',
        ],
        answer: 0,
        why: 'A column has one cell per row.',
      },
    ],

    stuck: ['E-10', 'G-12', 'G-20'],

    recap: [
      'A row scan fixes the row and varies the column. One loop.',
      'A column scan fixes the column and varies the row. Still `map[row][col]`.',
      'A column scan is bounded by `map.length`, because it counts rows.',
      'Accumulator outside both loops for a grid total; inside the outer for per-row.',
      'Where it goes is a decision about the question, not a rule to memorise.',
    ],
  },
];

module.exports = { course: COURSE, unit: UNIT, label: LABEL, lessons: LESSONS };
