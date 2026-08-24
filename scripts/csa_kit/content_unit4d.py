"""
AP CSA Unit 4 teacher-kit content, part 4: topics 4.10 - 4.17.

List algorithms, two dimensions, searching, sorting and recursion. These eight
topics close the course, and the pacing guide gives most of them a third day
because they are where the exam concentrates its hardest questions.

Break-it and misconception slides mirror seed/csa-debug-unit4.js.

No em-dashes anywhere.
"""

TOPICS = [

# ── 4.10 ─────────────────────────────────────────────────────────────────────
{
 'topic': '4.10',
 'title': 'Algorithms with ArrayLists',
 'handle': 'ap-csa-lesson-4-10-algorithms-with-arraylists',
 'subtitle': 'Building a new list from an old one, and reporting on the right one',
 'vocab': [
   ('Filter', 'Building a new collection from the elements of another that meet a condition.'),
   ('Source list', 'The list being read from.'),
   ('Result list', 'The new list being built.'),
   ('Accumulating a collection', 'Adding to a result list inside a traversal.'),
   ('Empty result', 'A filter that matched nothing, which is a normal outcome.'),
   ('Guard', 'A check placed before an operation that would otherwise fail.'),
 ],
 'quiz': [
   {'stem': 'A filter loop that reports on the source list instead of the result:',
    'options': ['Crashes', 'Does the filtering and throws the answer away', 'Is faster', 'Is correct'],
    'answer_index': 1,
    'why': 'The filtering happens and nothing reads its output.'},
   {'stem': 'An average over a filtered list must guard against:',
    'options': ['Negative values', 'An empty result', 'Duplicates', 'Large values'],
    'answer_index': 1,
    'why': 'A filter matching nothing gives a size of 0.'},
   {'stem': 'Where should the result list be declared?',
    'options': ['Inside the loop', 'Before the loop', 'After the loop', 'In the condition'],
    'answer_index': 1,
    'why': 'Declaring it inside would create a fresh empty list every pass.'},
   {'stem': 'An input where every element fails the filter produces:',
    'options': ['An exception', 'An empty result list', 'The source list', 'Null'],
    'answer_index': 1,
    'why': 'Nothing was added, so the result is empty.'},
   {'stem': 'The guard for an empty result belongs:',
    'options': ['After the division', 'Before the division', 'Inside the loop', 'In the condition'],
    'answer_index': 1,
    'why': 'Checking afterwards means the crash already happened.'},
   {'stem': 'Which is the most likely cause of a filter appearing to do nothing?',
    'options': ['A wrong condition', 'Reporting on the source list', 'An empty source', 'A missing import'],
    'answer_index': 1,
    'why': 'The result list is built correctly and never read.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Filtering into a new list',
   'schedule': [
     (6, 'Bell ringer: two piles'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Building a result list'),
     (10, 'Worked example: filter and report'),
     (13, 'Which list are you reading'),
     (5, 'Misconception check: the filter changed the list'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'Two lists in play is the whole difficulty. Make students say which list each loop walks, out loud.',
     'The empty-result guard returns for the third time. Name the pattern.',
   ],
   'warmup': ('Two piles',
     'On the board: "You have a pile of cards and you want the red ones. Describe what you do with your hands. '
     'How many piles exist when you are finished?"',
     'Two: the original and the new one. Nothing was destroyed. That is exactly what a filter does, and the bug '
     'today is reporting on the wrong pile.'),
   'objectives': [
     ('I can build a new list from the elements of another that meet a condition.', 'LO 4.10.A'),
     ('I can report on the result list rather than the source.', 'LO 4.10.B'),
     ('I can guard an average against an empty result.', 'LO 4.10.C'),
   ],
   'sections': [
     ('Building a result list', [
       'A filter reads a source list and adds matching elements to a new result list.',
       'The result list is declared BEFORE the loop, so it survives every iteration.',
       'Declaring it inside the loop would create a fresh empty list on every pass and keep only the last match.',
       'The source list is unchanged: filtering builds something new rather than removing from the original.',
     ]),
     ('Which list are you reading', [
       'With two lists in scope, every loop header has to name the right one.',
       'A filter that appears to do nothing is usually correct filtering followed by reporting on the source.',
       'Read each loop aloud as "for every element of the RESULT list" and the mistake becomes audible.',
     ]),
   ],
   'worked': {
     'heading': 'Filter, then report on the result',
     'code': 'import java.util.ArrayList;\n\npublic class Evens\n{\n    public static void main(String[] args)\n    {\n        ArrayList<Integer> all = new ArrayList<Integer>();\n        all.add(1);\n        all.add(2);\n        all.add(3);\n        all.add(4);\n\n        ArrayList<Integer> evens = new ArrayList<Integer>();\n        for (int value : all)\n        {\n            if (value % 2 == 0)\n            {\n                evens.add(value);\n            }\n        }\n\n        for (int value : evens)\n        {\n            System.out.println(value);\n        }\n        System.out.println(evens.size());\n        System.out.println(all.size());\n    }\n}',
     'notice': [
       'evens declared before the loop - it accumulates across iterations.',
       'The reporting loop walks evens, not all.',
       'all.size() is still 4 - the source was never modified.',
     ],
     'output': ['2', '4', '2', '4'],
     'caption': 'Complete and runnable as shown. Two evens found, source untouched.',
     'note': 'The last two lines are 2 and 4: the result size and the source size. Point at both and name which '
             'is which, because the bug is confusing exactly these.',
   },
   'break_it': {
     'change': 'Change the reporting loop and the size line to read all instead of evens.',
     'happens': 'It prints 1, 2, 3, 4 and a size of 4. The filter still ran, still built the right list, and '
                'nothing anywhere reads it.',
     'why': 'The filtering was never the problem. Two lists are in scope and the reporting names the wrong one, '
            'so correct work is silently discarded. Reading each loop header aloud catches it in seconds. '
            'Tonight\'s graded debugging exercise plants this together with an unguarded empty average.',
     'note': 'Ask what a debugger would show. The evens list, fully correct, sitting unused. That is the tell.',
   },
   'misconception': {
     'heading': 'Filtering removes elements from the list',
     'think': 'After filtering for evens, the original list contains only evens.',
     'truth': 'A filter builds a NEW list and leaves the source exactly as it was. Nothing was removed, which is '
              'usually what you want: the original data is still available for other questions. If you genuinely '
              'need to remove from the source, that is the removal loop from 4.8, with all its shifting problems. '
              'Building a new list avoids those entirely, which is why filters are written this way.',
     'note': 'Contrasting filter with 4.8 removal makes both clearer than teaching either alone.',
   },
   'discussion': [
     'After filtering, what does the source list contain? Why is that useful?',
     'How would you notice that a filter is reporting on the wrong list?',
   ],
   'learned': [
     'I can build a new list from the elements of another that meet a condition.',
     'I can report on the result list rather than the source.',
     'I can guard an average against an empty result.',
   ],
   'up_next': 'Day 2 handles the case where the filter matches nothing at all.',
   'extra': 'Filter a list for values above 10. Print the result size and the source size, and check both.',
  },
  {
   'day': 2,
   'focus': 'Empty results and combining algorithms',
   'schedule': [
     (5, 'Bell ringer: retrieval on filtering'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'When the filter matches nothing'),
     (10, 'Worked walkthrough: guarded average, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'An all-odd input is the test nobody writes. Write it with them.',
     'This is the third and final appearance of the guard rule. Ask them to name the other two.',
   ],
   'warmup': ('Retrieval on filtering',
     'On the board, no notes: "1. What happens to the source list during a filter? 2. Where is the result list '
     'declared? 3. What is the result when nothing matches?"',
     'Nothing; before the loop; an empty list. The third answer sets up today, and "empty" rather than "error" '
     'is the answer to insist on.'),
   'objectives': [
     ('I can handle a filter that matches nothing.', 'LO 4.10.C'),
     ('I can choose a test input that produces an empty result.', 'LO 4.10.B'),
     ('I can combine a filter with a summary statistic safely.', 'LO 4.10.A'),
   ],
   'sections': [
     ('When nothing matches', [
       'A filter that matches nothing produces an empty list, which is a normal outcome rather than an error.',
       'Any statistic computed over the result must cope with a size of 0.',
       'Dividing by the result size without checking is a divide by zero waiting for the right input.',
     ]),
     ('Choosing the test', [
       'The input that exposes an empty-result bug is one where every element fails the filter.',
       'That input is never chosen by accident, which is why the bug survives casual testing.',
       'Write the all-fail case deliberately, every time you build a filter.',
     ]),
   ],
   'worked': {
     'heading': 'The average of nothing',
     'code': 'import java.util.ArrayList;\n\npublic class Guarded\n{\n    public static void main(String[] args)\n    {\n        int[] source = {1, 3, 5};\n\n        ArrayList<Integer> evens = new ArrayList<Integer>();\n        for (int value : source)\n        {\n            if (value % 2 == 0)\n            {\n                evens.add(value);\n            }\n        }\n\n        System.out.println(evens.size());\n\n        if (evens.size() == 0)\n        {\n            System.out.println("NONE");\n        }\n        else\n        {\n            int total = 0;\n            for (int value : evens)\n            {\n                total = total + value;\n            }\n            System.out.println(total / evens.size());\n        }\n    }\n}',
     'notice': [
       'Every source value is odd, so the result is empty.',
       'The guard comes before any division.',
       'NONE is a real answer, not a failure.',
     ],
     'output': ['0', 'NONE'],
     'caption': 'Complete and runnable as shown. Nothing matched, and nothing crashed.',
     'note': 'Run the all-odd case first. Leading with the hard input makes the guard feel necessary rather than '
             'defensive.',
   },
   'break_it': {
     'change': 'Remove the guard and divide by evens.size() unconditionally.',
     'happens': 'ArithmeticException: / by zero, but only for an input where nothing matched. Every mixed input '
                'works perfectly.',
     'why': 'The denominator is computed from the data, so it can be zero, and only one class of input reveals '
            'it. This is the third time this rule has appeared: 2.5 guarded a division with a short circuit, 4.6 '
            'guarded an empty file, and this guards an empty filter. Whenever the denominator is computed rather '
            'than given, guard it.',
     'note': 'Ask the class to name the other two appearances. Recognising the pattern is the goal, not the '
             'individual fix.',
   },
   'misconception': {
     'heading': 'If the code works on my test data it handles all data',
     'think': 'I ran it on a normal list and it worked, so the filter is correct.',
     'truth': 'Normal test data has some matches and some non-matches, which is exactly the case that cannot '
              'expose an empty-result bug. The dangerous inputs are the extremes: everything matches, nothing '
              'matches, the list is empty. None of the three appears unless you write it on purpose, and the '
              'middle one is where the divide by zero lives.',
     'note': 'Give them the three extremes as a checklist. It generalises well beyond this topic.',
   },
   'discussion': [
     'What three test inputs should every filter be run against?',
     'Name the other two places in this course where a computed denominator needed a guard.',
   ],
   'learned': [
     'I can handle a filter that matches nothing.',
     'I can choose a test input that produces an empty result.',
     'I can combine a filter with a summary statistic safely.',
   ],
   'up_next': 'Topic 4.11 moves into two dimensions.',
   'extra': 'Complete the graded debugging exercise for 4.10. It reports on the source list and divides unguarded.',
  },
 ],
},

# ── 4.11 ─────────────────────────────────────────────────────────────────────
{
 'topic': '4.11',
 'title': '2D Array Creation and Access',
 'handle': 'ap-csa-lesson-4-11-2d-array-creation-and-access',
 'subtitle': 'Rows first, columns second, and the square grid that hides the mistake',
 'vocab': [
   ('2D array', 'An array whose elements are themselves arrays: an array of rows.'),
   ('Row', 'One of the inner arrays, selected by the first index.'),
   ('Column', 'A position within a row, selected by the second index.'),
   ('Row-major order', 'Visiting all of row 0, then all of row 1, and so on.'),
   ('grid.length', 'The number of rows.'),
   ('grid[0].length', 'The number of columns in the first row.'),
 ],
 'quiz': [
   {'stem': 'In grid[r][c], which index is the row?',
    'options': ['c', 'r', 'Either', 'Neither'],
    'answer_index': 1,
    'why': 'The first index selects the row.'},
   {'stem': 'grid.length gives:',
    'options': ['The number of columns', 'The number of rows', 'The total cells', 'The first row'],
    'answer_index': 1,
    'why': 'A 2D array is an array of rows, so its length counts rows.'},
   {'stem': 'The number of columns is:',
    'options': ['grid.length', 'grid[0].length', 'grid.width', 'grid.size()'],
    'answer_index': 1,
    'why': 'The length of one row is the column count.'},
   {'stem': 'Writing grid[c][r] on a 2 by 3 grid:',
    'options': ['Works', 'Throws when c reaches 2', 'Transposes silently', 'Both B on non-square grids'],
    'answer_index': 3,
    'why': 'On a non-square grid the row index goes out of range.'},
   {'stem': 'Why is a square grid a bad test for index order?',
    'options': ['It is slower', 'Swapped indexes never go out of range', 'It uses more memory', 'It is not'],
    'answer_index': 1,
    'why': 'The bounds are equal, so the swap only transposes and does not crash.'},
   {'stem': 'new int[3][4] creates:',
    'options': ['3 columns, 4 rows', '3 rows, 4 columns', '12 rows', 'A jagged array'],
    'answer_index': 1,
    'why': 'Rows first, then columns.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Creating and accessing a grid',
   'schedule': [
     (6, 'Bell ringer: name the seat'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Rows, columns and the two lengths'),
     (10, 'Worked example: fill and print a grid'),
     (13, 'Why a square grid hides the bug'),
     (5, 'Misconception check: the indexes are interchangeable'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'Use the classroom seating grid. Row then seat is an ordering students already use without thinking.',
     'Never demonstrate on a square grid. Ever. It is the one habit that prevents this whole class of bug.',
   ],
   'warmup': ('Name the seat',
     'On the board: "Describe where you are sitting using two numbers. Everyone write it down. Did anyone say '
     'the seat number before the row number?"',
     'Almost everyone says row first. Java agrees: grid[row][column]. Anchoring the order to something they '
     'already do makes it much harder to forget under exam pressure.'),
   'objectives': [
     ('I can create a 2D array with a given number of rows and columns.', 'LO 4.11.A'),
     ('I can access an element with the row index first.', 'LO 4.11.B'),
     ('I can find the number of rows and the number of columns.', 'LO 4.11.C'),
   ],
   'sections': [
     ('Rows and columns', [
       'A 2D array is an array of rows, and each row is itself an array of values.',
       'The first index selects the row, the second selects the position within it: grid[row][column].',
       'new int[3][4] creates 3 rows of 4 columns, filled with the default value.',
     ]),
     ('The two lengths', [
       'grid.length is the number of ROWS, because the outer array holds rows.',
       'grid[0].length is the number of COLUMNS, being the length of one row.',
       'Using grid.length as a column bound works only on a square grid, and fails on every other one.',
     ]),
   ],
   'worked': {
     'heading': 'Fill it and print it, rows first',
     'code': 'public class Grid\n{\n    public static void main(String[] args)\n    {\n        int[][] grid = new int[2][3];\n\n        int next = 1;\n        for (int r = 0; r < grid.length; r++)\n        {\n            for (int c = 0; c < grid[r].length; c++)\n            {\n                grid[r][c] = next;\n                next++;\n            }\n        }\n\n        System.out.println(grid.length);\n        System.out.println(grid[0].length);\n\n        for (int r = 0; r < grid.length; r++)\n        {\n            String line = "";\n            for (int c = 0; c < grid[r].length; c++)\n            {\n                if (c > 0)\n                {\n                    line = line + " ";\n                }\n                line = line + grid[r][c];\n            }\n            System.out.println(line);\n        }\n    }\n}',
     'notice': [
       'grid.length is 2 - the row count. grid[0].length is 3 - the column count.',
       'grid[r][c] - row index first, every time.',
       'A 2 by 3 grid, deliberately not square.',
     ],
     'output': ['2', '3', '1 2 3', '4 5 6'],
     'caption': 'Complete and runnable as shown. Two rows of three, filled in row-major order.',
     'note': 'The two printed lengths are 2 and 3 and they are different on purpose. On a square grid they would '
             'be equal and this slide would teach nothing.',
   },
   'break_it': {
     'change': 'Change the filling line to grid[c][r].',
     'happens': 'It throws ArrayIndexOutOfBoundsException as soon as c reaches 2, because there is no row 2 in a '
                'grid with two rows.',
     'why': 'The first index must be the row. On a NON-square grid the swap goes out of range and crashes '
            'immediately. On a square grid the same bug does not crash at all: it silently transposes the data '
            'and every test passes. Tonight\'s graded debugging exercise plants this alongside a column count '
            'taken from grid.length.',
     'note': 'Show the square-grid case too, to prove the bug is still there and now invisible. That is the '
             'argument for never testing on square data.',
   },
   'misconception': {
     'heading': 'Row and column are interchangeable if you are consistent',
     'think': 'As long as I use grid[c][r] everywhere, it works out the same.',
     'truth': 'It works out transposed, which is a different grid, and it crashes the moment the grid is not '
              'square because the row index runs past the number of rows. Even on a square grid, being '
              'consistently transposed means every row you print is actually a column, so any output a human '
              'reads is wrong. The first index is the row. There is no consistent alternative convention.',
     'note': 'The "consistently wrong is fine" instinct is reasonable and wrong here. Address it head on.',
   },
   'discussion': [
     'Why does grid[c][r] crash on a 2 by 3 grid but not on a 3 by 3 grid?',
     'What is grid[0].length and why is it not the same as grid.length?',
   ],
   'learned': [
     'I can create a 2D array with a given number of rows and columns.',
     'I can access an element with the row index first.',
     'I can find the number of rows and the number of columns.',
   ],
   'up_next': 'Topic 4.12 traverses the grid in both directions.',
   'extra': 'Draw a 2 by 4 grid with every cell labelled grid[r][c]. Write down grid.length and grid[0].length.',
  },
  {
   'day': 2,
   'focus': 'Reading grids from input, and jagged rows',
   'schedule': [
     (5, 'Bell ringer: retrieval on the two lengths'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Reading a grid, and per-row lengths'),
     (10, 'Worked walkthrough: fill from input, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'grid[r].length rather than grid[0].length is the habit that survives jagged arrays. Teach it as the default.',
     'Reading rows then columns from input mirrors the index order, which reinforces it.',
   ],
   'warmup': ('Retrieval on the two lengths',
     'On the board, no notes: "1. grid.length is what? 2. How do you get the column count? '
     '3. Which index comes first?"',
     'Rows; grid[0].length or grid[r].length; the row. If the third answer needs thought, redo the seating '
     'analogy before continuing.'),
   'objectives': [
     ('I can read a grid from input in row-major order.', 'LO 4.11.A'),
     ('I can use grid[r].length so the code survives rows of different lengths.', 'LO 4.11.C'),
     ('I can state the total number of cells in a grid.', 'LO 4.11.B'),
   ],
   'sections': [
     ('Reading a grid', [
       'The usual shape is: read the row count, read the column count, then read rows times columns values.',
       'Reading in row-major order fills row 0 completely, then row 1, matching the loop nesting.',
       'The total number of cells is rows times columns, which is also the number of values to read.',
     ]),
     ('Per-row lengths', [
       'Java allows rows of different lengths, called a jagged array, though the exam usually uses rectangular grids.',
       'Using grid[r].length as the inner bound is correct for both, and costs nothing.',
       'Making grid[r].length the default habit means jagged data never breaks your traversal.',
     ]),
   ],
   'worked': {
     'heading': 'Fill a grid from input',
     'code': 'import java.util.Scanner;\n\npublic class ReadGrid\n{\n    public static void main(String[] args)\n    {\n        Scanner input = new Scanner(System.in);\n        int rows = input.nextInt();\n        int cols = input.nextInt();\n        int[][] grid = new int[rows][cols];\n\n        for (int r = 0; r < grid.length; r++)\n        {\n            for (int c = 0; c < grid[r].length; c++)\n            {\n                grid[r][c] = input.nextInt();\n            }\n        }\n\n        System.out.println(grid.length * grid[0].length);\n        System.out.println(grid[0][0]);\n        System.out.println(grid[rows - 1][cols - 1]);\n    }\n}',
     'notice': [
       'grid[r].length as the inner bound - correct even for jagged rows.',
       'rows times cols is the total cell count.',
       'The last cell is [rows - 1][cols - 1], both one less than the counts.',
     ],
     'output': ['6', '1', '6'],
     'caption': 'Complete and runnable as shown. A 2 by 3 grid read in row-major order.',
     'stdin': '2 3\n1 2 3 4 5 6\n',
     'note': 'The last cell uses minus one on BOTH indexes. Students who apply it to one and not the other are '
             'very common, so point at both.',
   },
   'break_it': {
     'change': 'Read the last cell as grid[rows][cols].',
     'happens': 'It throws immediately. Both indexes are one past the end, so the exception names row 2 on a grid '
                'with two rows.',
     'why': 'Every rule about length and last index applies to BOTH dimensions independently. A 2 by 3 grid has '
            'rows 0 to 1 and columns 0 to 2, so the last cell is [1][2]. The off-by-one rule from 4.3 does not '
            'stop being true because there are now two of them.',
     'note': 'Ask which index the exception names. The row, because it is checked first, which is a useful '
             'diagnostic detail.',
   },
   'misconception': {
     'heading': 'The column bound can come from grid.length',
     'think': 'It is a grid, so its length works for both loops.',
     'truth': 'grid.length is the number of rows and nothing else. It happens to equal the column count only on '
              'a square grid, which is why the mistake survives so much testing. Use grid[r].length for the '
              'inner bound: it is correct on rectangular grids, correct on jagged ones, and correct on square '
              'ones, so there is never a reason to use anything else.',
     'note': 'Give them the always-correct option and the choice stops being a judgement call.',
   },
   'discussion': [
     'Why is grid[r].length a better inner bound than grid[0].length?',
     'What is the last cell of a 4 by 7 grid?',
   ],
   'learned': [
     'I can read a grid from input in row-major order.',
     'I can use grid[r].length so the code survives rows of different lengths.',
     'I can state the total number of cells in a grid.',
   ],
   'up_next': 'Topic 4.12 traverses the grid row by row and column by column.',
   'extra': 'Complete the graded debugging exercise for 4.11. It plants swapped indexes and a wrong column count.',
  },
 ],
},

# ── 4.12 ─────────────────────────────────────────────────────────────────────
{
 'topic': '4.12',
 'title': 'Traversing 2D Arrays',
 'handle': 'ap-csa-lesson-4-12-traversing-2d-arrays',
 'subtitle': 'Row-major, column-major, and the accumulator that must reset per row',
 'vocab': [
   ('Row-major traversal', 'Outer loop over rows, inner loop over columns.'),
   ('Column-major traversal', 'Outer loop over columns, inner loop over rows.'),
   ('Per-row accumulator', 'A variable that must be reset at the start of every row.'),
   ('Grand total', 'An accumulator spanning the whole grid, declared before the outer loop.'),
   ('Nested bound', 'The condition on the inner loop, which must come from the correct dimension.'),
   ('Scope reset', 'Declaring a variable inside a loop so it is recreated each pass.'),
 ],
 'quiz': [
   {'stem': 'In a column-major traversal, the outer loop bound is:',
    'options': ['grid.length', 'grid[0].length', 'rows times cols', '0'],
    'answer_index': 1,
    'why': 'The outer loop walks columns, so its bound is the column count.'},
   {'stem': 'A per-row sum should be declared:',
    'options': ['Before the outer loop', 'Inside the outer loop', 'Inside the inner loop', 'After both'],
    'answer_index': 1,
    'why': 'Declaring it there recreates it fresh for each row.'},
   {'stem': 'A grand total across the grid should be declared:',
    'options': ['Before the outer loop', 'Inside the outer loop', 'Inside the inner loop', 'After both'],
    'answer_index': 0,
    'why': 'It must survive every row.'},
   {'stem': 'Row sums that climb steadily suggest:',
    'options': ['A wrong bound', 'An accumulator that never resets', 'Swapped indexes', 'An empty grid'],
    'answer_index': 1,
    'why': 'Each row is adding to the previous row total.'},
   {'stem': 'Row-major and column-major visit:',
    'options': ['Different cells', 'The same cells in a different order', 'The same order', 'Only the diagonal'],
    'answer_index': 1,
    'why': 'Both cover the whole grid; only the order differs.'},
   {'stem': 'Testing a traversal on a square grid:',
    'options': ['Is thorough', 'Hides bounds taken from the wrong dimension', 'Is required', 'Is faster'],
    'answer_index': 1,
    'why': 'Equal bounds make the mistake invisible.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Both traversal orders, and where each accumulator lives',
   'schedule': [
     (6, 'Bell ringer: read the grid two ways'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Row-major and column-major'),
     (10, 'Worked example: row sums and a grand total'),
     (13, 'Where each accumulator belongs'),
     (5, 'Misconception check: the reset is optional'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'This is 2.11 nested iteration in two dimensions. Say so; the per-row reset is the identical bug.',
     'Use a 2 by 3 grid throughout. Square grids hide the column-major bound error completely.',
   ],
   'warmup': ('Read the grid two ways',
     'On the board, a 2 by 3 grid of numbers: "Read it out loud left to right, row by row. Now read it top to '
     'bottom, column by column. Did you visit the same numbers?"',
     'Same cells, different order. That is row-major versus column-major, and having said both out loud makes '
     'the loop nesting obvious rather than abstract.'),
   'objectives': [
     ('I can traverse a grid in row-major and column-major order.', 'LO 4.12.A'),
     ('I can choose the correct bound for each loop.', 'LO 4.12.B'),
     ('I can decide whether an accumulator belongs to a row or to the grid.', 'LO 4.12.C'),
   ],
   'sections': [
     ('Two traversal orders', [
       'Row-major puts rows on the outer loop: all of row 0, then all of row 1.',
       'Column-major puts columns on the outer loop, so its bound is grid[0].length, the column count.',
       'Both visit every cell exactly once. Only the order differs, and the task decides which you want.',
       'Using grid.length as the outer bound of a column-major traversal is the classic error, and a square grid hides it.',
     ]),
     ('Where accumulators live', [
       'A grand total describes the whole grid, so it is declared before the outer loop.',
       'A per-row total describes one row, so it is declared inside the outer loop and created fresh each pass.',
       'Declaring a variable inside a loop IS the reset. No explicit assignment back to zero is needed.',
       'Row sums that climb steadily are the signature of an accumulator declared one level too high.',
     ]),
   ],
   'worked': {
     'heading': 'Row sums and a grand total',
     'code': 'public class Sums\n{\n    public static void main(String[] args)\n    {\n        int[][] grid = {{1, 2, 3}, {4, 5, 6}};\n\n        int total = 0;\n        for (int r = 0; r < grid.length; r++)\n        {\n            int rowSum = 0;\n            for (int c = 0; c < grid[r].length; c++)\n            {\n                rowSum = rowSum + grid[r][c];\n                total = total + grid[r][c];\n            }\n            System.out.println(rowSum);\n        }\n        System.out.println(total);\n\n        for (int c = 0; c < grid[0].length; c++)\n        {\n            for (int r = 0; r < grid.length; r++)\n            {\n                System.out.println(grid[r][c]);\n            }\n        }\n    }\n}',
     'notice': [
       'rowSum declared inside the outer loop - reset every row.',
       'total declared before it - survives the whole grid.',
       'Column-major outer bound is grid[0].length, the column count.',
     ],
     'output': ['6', '15', '21', '1', '4', '2', '5', '3', '6'],
     'caption': 'Complete and runnable as shown. Row sums 6 and 15, total 21, then column-major order.',
     'note': 'Point at the two declarations and ask what each describes. Answering that correctly is the whole '
             'skill, exactly as in 2.11.',
   },
   'break_it': {
     'change': 'Move int rowSum = 0; above the outer loop, and change the column-major outer bound to grid.length.',
     'happens': 'The row sums become 6 and 21 instead of 6 and 15, climbing because the second row keeps the '
                'first row total. The column-major loop throws, because there is no column 2 to start a pass on '
                'a grid with two rows.',
     'why': 'Two classic bugs at once. An accumulator declared one level too high never resets, and a bound taken '
            'from the wrong dimension runs past the end. Both are on tonight\'s graded debugging exercise, and '
            'both are invisible on a square grid.',
     'note': 'The row sums 6 and 21 are worth writing on the board: 21 is the grand total appearing where a row '
             'sum belongs, which names the bug precisely.',
   },
   'misconception': {
     'heading': 'A variable declared outside the loop is fine as long as you reset it',
     'think': 'I can declare rowSum before the outer loop and just set it back to 0 at the top of each row.',
     'truth': 'That is genuinely correct if you actually write the reset, and it is one more line that can be '
              'forgotten during an edit. Declaring the variable inside the loop makes the reset structural: the '
              'variable is created fresh every pass and cannot carry anything over. Prefer the version where the '
              'bug is impossible to the version where it is merely absent today.',
     'note': 'Honest framing. Both work; one cannot break later. Students respect the distinction.',
   },
   'discussion': [
     'Why is grid[0].length the right outer bound for a column-major traversal?',
     'If the second row sum equals the grand total, what has gone wrong?',
   ],
   'learned': [
     'I can traverse a grid in row-major and column-major order.',
     'I can choose the correct bound for each loop.',
     'I can decide whether an accumulator belongs to a row or to the grid.',
   ],
   'up_next': 'Topic 4.13 uses these traversals to implement real grid algorithms.',
   'extra': 'Write both traversal orders over a 2 by 4 grid. List the order the cells are visited in each.',
  },
  {
   'day': 2,
   'focus': 'Choosing the traversal the task needs',
   'schedule': [
     (5, 'Bell ringer: retrieval on bounds'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Matching the traversal to the question'),
     (10, 'Worked walkthrough: column totals, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'A per-column total needs column-major, or a second accumulator array. Show the first; mention the second.',
     'Keep insisting on non-square test grids. It is the single most protective habit in this topic.',
   ],
   'warmup': ('Retrieval on bounds',
     'On the board, no notes: "1. Outer bound for row-major? 2. Outer bound for column-major? '
     '3. Where does a per-row accumulator go?"',
     'grid.length; grid[0].length; inside the outer loop. All three are needed immediately today.'),
   'objectives': [
     ('I can choose row-major or column-major from the question being asked.', 'LO 4.12.A'),
     ('I can compute per-column statistics.', 'LO 4.12.B'),
     ('I can test a grid algorithm on non-square data.', 'LO 4.12.C'),
   ],
   'sections': [
     ('Matching traversal to question', [
       'A per-row statistic falls out of a row-major traversal, because a row is finished before the next begins.',
       'A per-column statistic falls out of a column-major traversal for the same reason.',
       'Forcing the wrong order means keeping an array of partial results, which is more code and more to get wrong.',
     ]),
     ('Testing grids', [
       'Always test on a grid whose rows and columns differ, so a wrong bound goes out of range instead of hiding.',
       'A 2 by 3 grid is enough. A 3 by 3 grid proves almost nothing about index order.',
       'If a grid algorithm passes on square data only, it has not been tested.',
     ]),
   ],
   'worked': {
     'heading': 'Column totals need column-major',
     'code': 'public class Columns\n{\n    public static void main(String[] args)\n    {\n        int[][] grid = {{1, 2, 3}, {4, 5, 6}};\n\n        for (int c = 0; c < grid[0].length; c++)\n        {\n            int colSum = 0;\n            for (int r = 0; r < grid.length; r++)\n            {\n                colSum = colSum + grid[r][c];\n            }\n            System.out.println(colSum);\n        }\n\n        int biggestRow = 0;\n        for (int r = 0; r < grid.length; r++)\n        {\n            int rowSum = 0;\n            for (int c = 0; c < grid[r].length; c++)\n            {\n                rowSum = rowSum + grid[r][c];\n            }\n            if (rowSum > biggestRow)\n            {\n                biggestRow = rowSum;\n            }\n        }\n        System.out.println(biggestRow);\n    }\n}',
     'notice': [
       'Column sums use column-major, so each column finishes before the next starts.',
       'colSum declared inside the outer loop - one per column.',
       'The biggest row sum uses row-major, because rows are the unit of the question.',
     ],
     'output': ['5', '7', '9', '15'],
     'caption': 'Complete and runnable as shown. Three column sums, then the largest row sum.',
     'note': 'Two traversals in one program, each chosen by the question. Ask which order each statistic needed '
             'before revealing the code.',
   },
   'break_it': {
     'change': 'Compute the column sums with a row-major traversal, keeping one colSum variable.',
     'happens': 'It prints two numbers instead of three, and they are row sums rather than column sums. The '
                'program runs perfectly and answers a different question.',
     'why': 'The traversal order decides which grouping is available to you. A row-major loop finishes a ROW '
            'before moving on, so a single accumulator inside it can only ever hold a row total. Getting column '
            'totals from row-major order requires an array of partial sums, one per column.',
     'note': 'This is a "runs fine, answers the wrong question" bug, which is the hardest kind to notice. Say so.',
   },
   'misconception': {
     'heading': 'The traversal order does not matter as long as every cell is visited',
     'think': 'Both orders cover the whole grid, so I can use whichever I find easier.',
     'truth': 'For a grand total, that is true: every cell is added once either way. For anything GROUPED, the '
              'order decides what you can compute with a single accumulator, because the order decides which '
              'group finishes first. Row-major finishes rows, so it gives row statistics for free. Column '
              'statistics need column-major, or an array of partial results carried across the whole grid.',
     'note': 'The distinction between grand totals and grouped statistics is the takeaway, and it generalises.',
   },
   'discussion': [
     'Which statistics can be computed with either traversal order? Which cannot?',
     'Why is a 3 by 3 test grid nearly useless for checking index order?',
   ],
   'learned': [
     'I can choose row-major or column-major from the question being asked.',
     'I can compute per-column statistics.',
     'I can test a grid algorithm on non-square data.',
   ],
   'up_next': 'Topic 4.13 implements the standard grid algorithms.',
   'extra': 'Complete the graded debugging exercise for 4.12. It plants a wrong outer bound and a missing reset.',
  },
 ],
},
]
