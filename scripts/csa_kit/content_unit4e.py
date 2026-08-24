"""
AP CSA Unit 4 teacher-kit content, part 5: topics 4.13 - 4.17.

Grid algorithms, searching, sorting and recursion. These five close the course
and they are where the exam concentrates its hardest questions, so the pacing
guide gives every one of them a third day.

Break-it and misconception slides mirror seed/csa-debug-unit4.js.

No em-dashes anywhere.
"""

TOPICS = [

# ── 4.13 ─────────────────────────────────────────────────────────────────────
{
 'topic': '4.13',
 'title': 'Implementing 2D Array Algorithms',
 'handle': 'ap-csa-lesson-4-13-implementing-2d-array-algorithms',
 'subtitle': 'Diagonals, maxima and per-row work, and the loop count each one needs',
 'vocab': [
   ('Main diagonal', 'The cells where the row index equals the column index.'),
   ('Single-loop traversal', 'Visiting n cells of an n by n grid with one loop.'),
   ('Grid maximum', 'The largest value anywhere in the grid.'),
   ('Seeding from the grid', 'Starting a maximum from grid[0][0] rather than from 0.'),
   ('Square grid', 'A grid with equal numbers of rows and columns, required for a main diagonal.'),
   ('Loop count', 'How many iterations an algorithm needs, which the shape of the answer decides.'),
 ],
 'quiz': [
   {'stem': 'The main diagonal of an n by n grid contains how many cells?',
    'options': ['n squared', 'n', '2n', 'n minus 1'],
    'answer_index': 1,
    'why': 'One cell per row, at the matching column.'},
   {'stem': 'A diagonal traversal needs:',
    'options': ['Two nested loops', 'One loop', 'Three loops', 'A recursive call'],
    'answer_index': 1,
    'why': 'One index serves as both row and column.'},
   {'stem': 'Writing the diagonal sum as a nested loop gives:',
    'options': ['The diagonal', 'The grand total', 'The first row', 'An exception'],
    'answer_index': 1,
    'why': 'It visits every cell, not just the matching ones.'},
   {'stem': 'A grid maximum should be seeded with:',
    'options': ['0', 'grid[0][0]', 'The row count', 'Integer.MAX_VALUE'],
    'answer_index': 1,
    'why': 'Zero may not be in the grid, which breaks on all-negative data.'},
   {'stem': 'If a diagonal sum and a grand total always print the same number:',
    'options': ['The grid is square', 'They are running the same code', 'The grid is empty', 'It is correct'],
    'answer_index': 1,
    'why': 'Two different quantities agreeing exactly is a strong signal.'},
   {'stem': 'The main diagonal is only defined for:',
    'options': ['Any grid', 'Square grids', 'Jagged grids', 'Grids of even size'],
    'answer_index': 1,
    'why': 'It needs a cell at [i][i] for every i.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Diagonals, and matching the loop count to the answer',
   'schedule': [
     (6, 'Bell ringer: how many cells'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'The main diagonal'),
     (10, 'Worked example: diagonal, maximum and total'),
     (13, 'Seeding a grid maximum'),
     (5, 'Misconception check: grids always need two loops'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'The loop-count argument is the cleanest way in: n cells needs n steps, so one loop.',
     'The all-negative grid returns from 2.9. Same rule, one more dimension.',
   ],
   'warmup': ('How many cells',
     'On the board, a 3 by 3 grid with the diagonal circled: "How many cells are circled? How many cells are in '
     'the grid? If an algorithm visits the circled ones, how many steps does it take?"',
     'Three, nine, three. If the answer needs three steps it needs one loop, not two. That argument decides the '
     'code before anyone writes a line of it.'),
   'objectives': [
     ('I can traverse the main diagonal of a square grid.', 'LO 4.13.A'),
     ('I can seed a grid maximum from the data rather than from 0.', 'LO 4.13.B'),
     ('I can match the number of loops to the number of cells visited.', 'LO 4.13.C'),
   ],
   'sections': [
     ('The main diagonal', [
       'The main diagonal is every cell where the row index equals the column index: [0][0], [1][1], [2][2].',
       'An n by n grid has exactly n diagonal cells, so a diagonal traversal takes n steps and needs ONE loop.',
       'One index serves as both row and column: grid[i][i].',
       'A nested loop visits every cell instead, so a "diagonal" written that way is really a grand total.',
     ]),
     ('Seeding a grid maximum', [
       'A maximum over a grid has the same problem as a maximum over a list: 0 is not a neutral value.',
       'Seed from grid[0][0], which is guaranteed to be a real element of the grid.',
       'A grid of entirely negative values will otherwise report 0, which appears nowhere in the data.',
     ]),
   ],
   'worked': {
     'heading': 'Diagonal, maximum and total',
     'code': 'public class Diagonal\n{\n    public static void main(String[] args)\n    {\n        int[][] grid = {{-1, -2, -3}, {-4, -5, -6}, {-7, -8, -9}};\n        int n = grid.length;\n\n        int diagonal = 0;\n        for (int i = 0; i < n; i++)\n        {\n            diagonal = diagonal + grid[i][i];\n        }\n        System.out.println(diagonal);\n\n        int max = grid[0][0];\n        for (int r = 0; r < n; r++)\n        {\n            for (int c = 0; c < grid[r].length; c++)\n            {\n                if (grid[r][c] > max)\n                {\n                    max = grid[r][c];\n                }\n            }\n        }\n        System.out.println(max);\n\n        int total = 0;\n        for (int r = 0; r < n; r++)\n        {\n            for (int c = 0; c < grid[r].length; c++)\n            {\n                total = total + grid[r][c];\n            }\n        }\n        System.out.println(total);\n    }\n}',
     'notice': [
       'The diagonal uses ONE loop and grid[i][i].',
       'max seeded from grid[0][0] - every value here is negative.',
       'The diagonal is -15 and the total is -45. Different numbers, different algorithms.',
     ],
     'output': ['-15', '-1', '-45'],
     'caption': 'Complete and runnable as shown. An all-negative grid, so the seeding matters.',
     'note': 'Deliberately all negative. A maximum seeded at 0 would print 0, which is not in the grid anywhere, '
             'and that is 2.9 arriving in two dimensions.',
   },
   'break_it': {
     'change': 'Rewrite the diagonal with a nested loop over every row and column.',
     'happens': 'The diagonal now prints -45, exactly the same as the grand total. Both numbers agree perfectly '
                'and one of them is wrong.',
     'why': 'A nested loop visits all nine cells, so it computes the total no matter what you call the variable. '
            'Two quantities that should differ agreeing exactly is a reliable signal that they are running the '
            'same code. Tonight\'s graded debugging exercise plants this together with a maximum seeded at 0.',
     'note': 'The two identical numbers are the diagnostic. Ask what it means when two different statistics '
             'always match.',
   },
   'misconception': {
     'heading': 'A 2D array always needs two nested loops',
     'think': 'It is a grid, so any algorithm over it uses a nested loop.',
     'truth': 'The number of loops comes from how many cells you visit, not from how many dimensions the array '
              'has. Every cell means n squared visits and two loops. The diagonal means n visits and one loop. '
              'One row means one loop. Count the cells the answer depends on first, and the loop structure '
              'follows from that count.',
     'note': 'Give them the counting rule and the structure stops being guesswork.',
   },
   'discussion': [
     'How many cells does the main diagonal of a 5 by 5 grid contain? How many loops does it need?',
     'What would a maximum seeded at 0 report for an all-negative grid, and why is that impossible?',
   ],
   'learned': [
     'I can traverse the main diagonal of a square grid.',
     'I can seed a grid maximum from the data rather than from 0.',
     'I can match the number of loops to the number of cells visited.',
   ],
   'up_next': 'Day 2 covers per-row and per-column algorithms and finding a cell position.',
   'extra': 'Write the diagonal sum for a 4 by 4 grid. List the four cells it visits by index.',
  },
  {
   'day': 2,
   'focus': 'Locating a cell, and per-row algorithms',
   'schedule': [
     (5, 'Bell ringer: retrieval on diagonals'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Finding a cell and reporting both indexes'),
     (10, 'Worked walkthrough: locate the maximum, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Reporting a position in 2D means TWO indexes, and students routinely track only one.',
     'Both must update together, inside the same if. That is the whole bug.',
   ],
   'warmup': ('Retrieval on diagonals',
     'On the board, no notes: "1. How many cells on the diagonal of an n by n grid? 2. How many loops? '
     '3. What should a grid maximum be seeded with?"',
     'n; one; grid[0][0]. Quick, then straight into position tracking, which is the harder idea.'),
   'objectives': [
     ('I can report the row and column of a located cell.', 'LO 4.13.A'),
     ('I can update both indexes together when a new best is found.', 'LO 4.13.B'),
     ('I can compute a statistic for each row of a grid.', 'LO 4.13.C'),
   ],
   'sections': [
     ('Locating a cell', [
       'A position in a grid is TWO numbers, so finding one means tracking two variables.',
       'Both must be updated inside the same if, at the moment a new best is found.',
       'Updating only the row leaves the column pointing at wherever the previous best was, which is often nearly right.',
     ]),
     ('Per-row algorithms', [
       'A per-row statistic is a row-major traversal with an accumulator declared inside the outer loop.',
       'Comparing rows means keeping a best-so-far across the outer loop, declared before it.',
       'The two accumulators live at different levels, which is 4.12 applied.',
     ]),
   ],
   'worked': {
     'heading': 'Locate the maximum, both indexes',
     'code': 'public class Locate\n{\n    public static void main(String[] args)\n    {\n        int[][] grid = {{3, 9, 4}, {8, 2, 7}};\n\n        int max = grid[0][0];\n        int bestRow = 0;\n        int bestCol = 0;\n\n        for (int r = 0; r < grid.length; r++)\n        {\n            for (int c = 0; c < grid[r].length; c++)\n            {\n                if (grid[r][c] > max)\n                {\n                    max = grid[r][c];\n                    bestRow = r;\n                    bestCol = c;\n                }\n            }\n        }\n\n        System.out.println(max);\n        System.out.println(bestRow);\n        System.out.println(bestCol);\n        System.out.println(grid[bestRow][bestCol]);\n    }\n}',
     'notice': [
       'Three variables updated together inside the same if.',
       'The last line reads the grid back at the reported position, as a check.',
       'If the reported position did not hold the maximum, that line would disagree.',
     ],
     'output': ['9', '0', '1', '9'],
     'caption': 'Complete and runnable as shown. The maximum 9 sits at row 0, column 1.',
     'note': 'The final line is a self-check worth teaching as a habit: read the value back at the position you '
             'reported and confirm it matches.',
   },
   'break_it': {
     'change': 'Update bestRow inside the if but leave bestCol out of it.',
     'happens': 'It reports the right maximum and the right row, with a column left over from an earlier '
                'comparison. The self-check line then prints a different value from the maximum.',
     'why': 'A position in a grid is two numbers and they only mean anything together. Updating one without the '
            'other produces a position that was never actually examined. The self-check line catches it '
            'instantly, which is why it is worth writing.',
     'note': 'Point at the two disagreeing lines. A program contradicting itself is the easiest bug to diagnose, '
             'if you wrote the check that lets it contradict itself.',
   },
   'misconception': {
     'heading': 'Tracking the value is enough',
     'think': 'I have the maximum value, so I know where it is.',
     'truth': 'A value tells you what, not where, and in a grid where takes two numbers. If the question asks for '
              'a position you must track both indexes and update them at the same moment you update the value. '
              'Reading the grid back at the reported position is a one-line check that proves the three agree, '
              'and it costs nothing.',
     'note': 'The read-back check generalises to arrays and lists too. Worth naming as a general habit.',
   },
   'discussion': [
     'Why must both indexes update inside the same if?',
     'What does it mean if grid[bestRow][bestCol] differs from the reported maximum?',
   ],
   'learned': [
     'I can report the row and column of a located cell.',
     'I can update both indexes together when a new best is found.',
     'I can compute a statistic for each row of a grid.',
   ],
   'up_next': 'Topic 4.14 searches, first linearly and then by halving.',
   'extra': 'Complete the graded debugging exercise for 4.13. It plants a nested diagonal and a maximum seeded at 0.',
  },
 ],
},

# ── 4.14 ─────────────────────────────────────────────────────────────────────
{
 'topic': '4.14',
 'title': 'Searching Algorithms',
 'handle': 'ap-csa-lesson-4-14-searching-algorithms',
 'subtitle': 'Linear search everywhere, binary search only on sorted data, and the bound that misses',
 'vocab': [
   ('Linear search', 'Checking each element in turn until the target is found or the data runs out.'),
   ('Binary search', 'Repeatedly halving a sorted range until the target is found or the range is empty.'),
   ('Precondition', 'Something that must be true before an algorithm is valid. Binary search requires sorted data.'),
   ('Midpoint', 'The index halfway between the current low and high bounds.'),
   ('Search window', 'The range from low to high still under consideration.'),
   ('Oracle', 'A known-correct implementation used to check another one.'),
 ],
 'quiz': [
   {'stem': 'Binary search requires the data to be:',
    'options': ['Positive', 'Sorted', 'Unique', 'Small'],
    'answer_index': 1,
    'why': 'Halving only works if order tells you which side to keep.'},
   {'stem': 'The correct loop condition for binary search is:',
    'options': ['low < high', 'low <= high', 'low != high', 'low > high'],
    'answer_index': 1,
    'why': 'When low equals high one candidate remains and must still be checked.'},
   {'stem': 'If the middle value is too small, the search should:',
    'options': ['Move high down', 'Move low up', 'Stop', 'Restart'],
    'answer_index': 1,
    'why': 'Everything from the middle down is too small, so the answer is higher.'},
   {'stem': 'Binary search on unsorted data:',
    'options': ['Still works', 'May report not found for a value that is present', 'Throws', 'Is faster'],
    'answer_index': 1,
    'why': 'Discarding half the range is only valid when order is guaranteed.'},
   {'stem': 'Roughly how many steps does binary search take on 1000 sorted items?',
    'options': ['1000', '500', 'About 10', '1'],
    'answer_index': 2,
    'why': 'Each step halves the range, and 2 to the 10 is about 1000.'},
   {'stem': 'Printing a linear search result beside a binary one is useful because:',
    'options': ['It is faster', 'It acts as an oracle for disagreements', 'It sorts the data', 'It saves memory'],
    'answer_index': 1,
    'why': 'Any input where the two disagree exposes a bug.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Linear and binary search, and the precondition',
   'schedule': [
     (6, 'Bell ringer: guess the number'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Linear and binary search'),
     (10, 'Worked example: both searches, side by side'),
     (13, 'Bounds and the window'),
     (5, 'Misconception check: binary search is always better'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'The guessing game IS binary search. Play it before naming it.',
     'The sorted precondition is the examinable point. Say it every time the algorithm is mentioned.',
   ],
   'warmup': ('Guess the number',
     'On the board: "I am thinking of a number from 1 to 100. You get told higher or lower. What is your first '
     'guess and why? How many guesses do you need in the worst case?"',
     'Fifty, and about seven. They have just described binary search including its halving argument. Then ask '
     'what happens if the answer is allowed to lie, which is what unsorted data amounts to.'),
   'objectives': [
     ('I can implement a linear search over any data.', 'LO 4.14.A'),
     ('I can implement a binary search over sorted data.', 'LO 4.14.B'),
     ('I can state the precondition binary search depends on.', 'LO 4.14.C'),
   ],
   'sections': [
     ('Two searches', [
       'Linear search checks each element in turn and works on any data, sorted or not.',
       'Binary search repeatedly halves a SORTED range, discarding the half that cannot contain the target.',
       'Sorted data is a precondition, not a preference: on unsorted data binary search discards the wrong half and misses.',
       'Linear search takes about n steps. Binary search takes about the number of times you can halve n.',
     ]),
     ('The search window', [
       'low and high mark the range still under consideration, and both are valid candidate indexes.',
       'When low equals high there is exactly one candidate left, so the loop condition must be low <= high.',
       'A middle value that is too small means the answer is HIGHER, so low moves to mid + 1.',
       'A middle value that is too large means the answer is LOWER, so high moves to mid - 1.',
     ]),
   ],
   'worked': {
     'heading': 'Both searches, one array',
     'code': 'public class Search\n{\n    public static void main(String[] args)\n    {\n        int[] data = {1, 3, 5, 7, 9};\n        int target = 9;\n\n        int linear = -1;\n        for (int i = 0; i < data.length; i++)\n        {\n            if (data[i] == target)\n            {\n                linear = i;\n                break;\n            }\n        }\n\n        int low = 0;\n        int high = data.length - 1;\n        int binary = -1;\n        while (low <= high)\n        {\n            int mid = (low + high) / 2;\n            if (data[mid] == target)\n            {\n                binary = mid;\n                break;\n            }\n            else if (data[mid] < target)\n            {\n                low = mid + 1;\n            }\n            else\n            {\n                high = mid - 1;\n            }\n        }\n\n        System.out.println(linear);\n        System.out.println(binary);\n    }\n}',
     'notice': [
       'low <= high - the final single candidate is still checked.',
       'Too small means low moves UP. Too large means high moves DOWN.',
       'Both searches agree, which is what makes the linear one a useful oracle.',
     ],
     'output': ['4', '4'],
     'caption': 'Complete and runnable as shown. Target at the last index, found by both.',
     'note': 'The target is deliberately at the very end, which is the case low < high would miss. Ask what the '
             'binary result would be with that condition before changing it.',
   },
   'break_it': {
     'change': 'Change the loop condition to low < high.',
     'happens': 'The binary search reports -1 for the target at index 4, while the linear search still reports 4. '
                'The two disagree, which is exactly what the pair is there to reveal.',
     'why': 'When low equals high there is still one unexamined candidate at that position. Quitting then skips '
            'it, and any target that ends up alone in the final window is missed. Tonight\'s graded debugging '
            'exercise plants this together with reversed boundary updates.',
     'note': 'The disagreement between the two printed numbers is the diagnostic. Teach the oracle habit '
             'explicitly: implement the simple version alongside the clever one.',
   },
   'misconception': {
     'heading': 'Binary search is always the better choice',
     'think': 'Binary search is faster, so I should use it whenever I am searching.',
     'truth': 'It is faster only on sorted data, and it is wrong on unsorted data rather than merely slow. If the '
              'data is not already sorted, sorting it costs far more than a single linear scan, so for one search '
              'over unsorted data linear search wins outright. Binary search pays off when the data is already '
              'sorted or when you will search it many times.',
     'note': 'The "wrong, not slow" distinction is the examinable half and students routinely miss it.',
   },
   'discussion': [
     'Why must the binary search loop use low <= high rather than low < high?',
     'When is linear search the better choice, and why?',
   ],
   'learned': [
     'I can implement a linear search over any data.',
     'I can implement a binary search over sorted data.',
     'I can state the precondition binary search depends on.',
   ],
   'up_next': 'Day 2 traces binary search step by step and counts its work.',
   'extra': 'Trace a binary search for 3 in {1, 3, 5, 7, 9}. Write low, high and mid for every pass.',
  },
  {
   'day': 2,
   'focus': 'Tracing the window, and counting the halvings',
   'schedule': [
     (5, 'Bell ringer: retrieval on preconditions'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Tracing the window'),
     (10, 'Worked walkthrough: count the steps, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'The low, high, mid trace table is examinable almost every year. Every student writes one today.',
     'Counting halvings connects straight back to 2.12 growth rates.',
   ],
   'warmup': ('Retrieval on preconditions',
     'On the board, no notes: "1. What must be true for binary search to work? 2. What happens if it is not? '
     '3. Which loop condition is correct?"',
     'Sorted; it can miss a value that is present; low <= high. The second answer matters most: wrong, not slow.'),
   'objectives': [
     ('I can trace a binary search with a low, high and mid table.', 'LO 4.14.B'),
     ('I can count how many halvings a search takes.', 'LO 4.14.C'),
     ('I can use a linear search as an oracle for a binary one.', 'LO 4.14.A'),
   ],
   'sections': [
     ('Tracing the window', [
       'A trace table with columns low, high and mid makes every step of a binary search visible.',
       'Each pass either finds the target or discards half the remaining window.',
       'The window shrinking to nothing, with low above high, is what "not found" looks like.',
     ]),
     ('Counting the work', [
       'Each pass halves the window, so the number of passes is how many times n can be halved.',
       'A thousand items takes about ten passes; a million takes about twenty.',
       'Doubling the data adds ONE pass, which is why binary search scales so well.',
     ]),
   ],
   'worked': {
     'heading': 'Count the passes',
     'code': 'public class Steps\n{\n    public static void main(String[] args)\n    {\n        int[] data = {1, 3, 5, 7, 9, 11, 13, 15};\n\n        System.out.println(search(data, 13));\n        System.out.println(search(data, 2));\n    }\n\n    public static int search(int[] data, int target)\n    {\n        int low = 0;\n        int high = data.length - 1;\n        int passes = 0;\n        while (low <= high)\n        {\n            passes++;\n            int mid = (low + high) / 2;\n            if (data[mid] == target)\n            {\n                return passes;\n            }\n            else if (data[mid] < target)\n            {\n                low = mid + 1;\n            }\n            else\n            {\n                high = mid - 1;\n            }\n        }\n        return passes;\n    }\n}',
     'notice': [
       'passes counts how many times the window was examined.',
       'Eight items are found in at most about three passes.',
       'A missing value still terminates, when low passes high.',
     ],
     'output': ['3', '3'],
     'caption': 'Complete and runnable as shown. Eight sorted items, three passes either way.',
     'note': 'Build the trace table for target 13 on the board first: low, high, mid across three rows. Then run '
             'it and match the count.',
   },
   'break_it': {
     'change': 'Search the same array for 13 after shuffling it to {9, 1, 15, 3, 13, 5, 11, 7}.',
     'happens': 'The search reports not found for a value that is plainly in the array. No exception, no warning, '
                'just a confident wrong answer.',
     'why': 'Binary search discards half the range based on the assumption that everything on one side of the '
            'middle is smaller. On unsorted data that assumption is false, so it throws away the half containing '
            'the target. The precondition is not advice: violating it makes the algorithm wrong, not slow.',
     'note': 'This is the cleanest demonstration of a precondition in the whole course. Worth the full five '
             'minutes.',
   },
   'misconception': {
     'heading': 'An algorithm that returns an answer has worked',
     'think': 'It ran without an error and gave me a result, so the result is right.',
     'truth': 'Binary search on unsorted data runs perfectly and returns -1 for values that are present. Nothing '
              'checks the precondition at run time, because checking that the array is sorted would cost as much '
              'as the search. The obligation is yours: before using binary search, know that the data is sorted. '
              'An algorithm used outside its preconditions is not a bug in the algorithm.',
     'note': 'Closes the course thread that began at 1.1: compiling proves nothing, running proves nothing, and '
             'a returned answer proves nothing on its own.',
   },
   'discussion': [
     'How many passes does binary search take on a thousand items? On two thousand?',
     'Why does nobody check that the array is sorted before searching it?',
   ],
   'learned': [
     'I can trace a binary search with a low, high and mid table.',
     'I can count how many halvings a search takes.',
     'I can use a linear search as an oracle for a binary one.',
   ],
   'up_next': 'Topic 4.15 puts the data in order in the first place.',
   'extra': 'Complete the graded debugging exercise for 4.14. It plants low < high and reversed boundary updates.',
  },
 ],
},

# ── 4.15 ─────────────────────────────────────────────────────────────────────
{
 'topic': '4.15',
 'title': 'Sorting Algorithms',
 'handle': 'ap-csa-lesson-4-15-sorting-algorithms',
 'subtitle': 'Selection and insertion sort, and the swap that duplicates a value',
 'vocab': [
   ('Selection sort', 'Repeatedly finding the smallest remaining element and moving it into place.'),
   ('Insertion sort', 'Building a sorted prefix by inserting each element into its place.'),
   ('Swap', 'Exchanging two values, which requires a temporary variable.'),
   ('Sorted prefix', 'The part of the array already in final order.'),
   ('Pass', 'One full sweep of the outer loop.'),
   ('Duplicate value', 'The same number appearing twice, which a broken swap can create.'),
 ],
 'quiz': [
   {'stem': 'A correct swap requires:',
    'options': ['Two statements', 'Three statements and a temporary', 'A loop', 'A cast'],
    'answer_index': 1,
    'why': 'Without a temporary the first assignment destroys a value.'},
   {'stem': 'a[i] = a[j]; a[j] = a[i]; produces:',
    'options': ['A correct swap', 'Both slots holding the old a[j]', 'An exception', 'A reversed array'],
    'answer_index': 1,
    'why': 'The first line overwrites a[i] before it is saved.'},
   {'stem': 'Selection sort finds, on each pass, the:',
    'options': ['Largest element', 'Smallest remaining element', 'Middle element', 'First duplicate'],
    'answer_index': 1,
    'why': 'It selects the minimum of the unsorted region.'},
   {'stem': 'The inner loop of selection sort should start at:',
    'options': ['0', 'i', 'i + 1', 'length - 1'],
    'answer_index': 2,
    'why': 'Everything before i is already sorted, and i itself is the current candidate.'},
   {'stem': 'Values disappearing and others appearing twice indicates:',
    'options': ['A wrong bound', 'A broken swap', 'Unsorted input', 'An empty array'],
    'answer_index': 1,
    'why': 'A swap without a temporary copies one value over another.'},
   {'stem': 'After k passes of selection sort, how much of the array is final?',
    'options': ['None', 'The first k elements', 'The last k elements', 'Half'],
    'answer_index': 1,
    'why': 'Each pass places one more element at the front.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Selection sort, and the swap',
   'schedule': [
     (6, 'Bell ringer: sort the cards'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Selection sort'),
     (10, 'Worked example: sort and watch the prefix grow'),
     (13, 'The swap, and why two statements fail'),
     (5, 'Misconception check: swapping is obvious'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'Physical cards beat any slide here. Sort five of them in front of the class, narrating each pass.',
     'The swap bug is 2.1 returning inside a harder algorithm. Name the callback.',
   ],
   'warmup': ('Sort the cards',
     'On the board, five numbers out of order: "Put them in order using only this move: find the smallest of '
     'what is left and swap it to the front. Write down each swap."',
     'They have just performed selection sort. Ask how many swaps it took for five cards: four, one fewer than '
     'the count, which is the outer loop bound they are about to write.'),
   'objectives': [
     ('I can trace selection sort pass by pass.', 'LO 4.15.A'),
     ('I can write a correct swap using a temporary variable.', 'LO 4.15.B'),
     ('I can explain why the sorted prefix grows by one each pass.', 'LO 4.15.C'),
   ],
   'sections': [
     ('Selection sort', [
       'Each pass finds the smallest element in the unsorted region and swaps it into the front of that region.',
       'After k passes the first k elements are in their final positions and never move again.',
       'The outer loop runs length - 1 times, because the last element is in place once everything else is.',
       'The inner loop starts at i + 1, since everything before i is sorted and i is the current candidate.',
     ]),
     ('The swap', [
       'A swap needs three statements and a temporary: save a, copy b into a, copy the saved value into b.',
       'Writing only two statements overwrites the first value before anything has saved it.',
       'The symptom is distinctive: a value disappears from the array and another appears twice.',
     ]),
   ],
   'worked': {
     'heading': 'Selection sort, with a correct swap',
     'code': 'public class Selection\n{\n    public static void main(String[] args)\n    {\n        int[] data = {5, 2, 9, 1, 7};\n\n        for (int i = 0; i < data.length - 1; i++)\n        {\n            int minIndex = i;\n            for (int j = i + 1; j < data.length; j++)\n            {\n                if (data[j] < data[minIndex])\n                {\n                    minIndex = j;\n                }\n            }\n            int temp = data[i];\n            data[i] = data[minIndex];\n            data[minIndex] = temp;\n        }\n\n        for (int value : data)\n        {\n            System.out.println(value);\n        }\n    }\n}',
     'notice': [
       'j starts at i + 1 - the sorted prefix is never searched again.',
       'Three swap statements and a temp, every time.',
       'The outer loop runs length - 1 times, not length.',
     ],
     'output': ['1', '2', '5', '7', '9'],
     'caption': 'Complete and runnable as shown. Five values sorted in four passes.',
     'note': 'Trace the first two passes on the board with the array written out each time. Watching the sorted '
             'prefix grow is what makes the algorithm memorable.',
   },
   'break_it': {
     'change': 'Replace the three swap statements with data[i] = data[minIndex]; data[minIndex] = data[i];',
     'happens': 'The output contains duplicates and is missing values entirely: numbers that were in the input '
                'have vanished and others appear twice.',
     'why': 'The first line overwrites data[i] before anything has saved it, so the second line copies the new '
            'value back onto itself. This is the 2.1 swap bug inside a sort, where it is much harder to see. '
            'Tonight\'s graded debugging exercise plants it along with an inner loop starting at 0.',
     'note': 'Missing and duplicated values is the signature. If a sort loses data, look at the swap first.',
   },
   'misconception': {
     'heading': 'Swapping two values is obvious',
     'think': 'Just assign each one to the other. It is two lines.',
     'truth': 'Assignment copies rather than exchanges, so the first line destroys one of the two values you were '
              'trying to keep. Nothing anywhere is holding it any more, and the second line has nothing to put '
              'back. Every swap in every language that works this way needs somewhere to park the first value. '
              'The clue that it went wrong is not a crash but data loss: a value gone, another duplicated.',
     'note': 'Third appearance of this bug (2.1, 4.15, and any student swap). It is worth the repetition.',
   },
   'discussion': [
     'Why does the outer loop of selection sort run length - 1 times rather than length?',
     'What does it tell you if a sorted array contains a duplicate the input did not have?',
   ],
   'learned': [
     'I can trace selection sort pass by pass.',
     'I can write a correct swap using a temporary variable.',
     'I can explain why the sorted prefix grows by one each pass.',
   ],
   'up_next': 'Day 2 covers insertion sort and compares the work each one does.',
   'extra': 'Trace selection sort on {4, 1, 3}. Write the array after every pass.',
  },
  {
   'day': 2,
   'focus': 'Insertion sort, and comparing the work',
   'schedule': [
     (5, 'Bell ringer: retrieval on swaps'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Insertion sort'),
     (10, 'Worked walkthrough: count comparisons, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Insertion sort is how people sort a hand of cards. Say so and demonstrate it with real cards.',
     'Counting comparisons connects to 2.12 and previews why sorting is quadratic.',
   ],
   'warmup': ('Retrieval on swaps',
     'On the board, no notes: "1. How many statements in a correct swap? 2. What is the symptom when it is '
     'wrong? 3. Where does selection sort\'s inner loop start?"',
     'Three; a value lost and another duplicated; at i + 1. Fast recall, then into insertion sort.'),
   'objectives': [
     ('I can trace insertion sort pass by pass.', 'LO 4.15.A'),
     ('I can compare the work selection and insertion sort do.', 'LO 4.15.C'),
     ('I can explain why both are quadratic in the worst case.', 'LO 4.15.B'),
   ],
   'sections': [
     ('Insertion sort', [
       'Insertion sort keeps a sorted prefix and inserts each new element into its correct place within it.',
       'This is how most people sort a hand of cards without being taught.',
       'Elements larger than the one being inserted shift right to make room.',
       'On already-sorted data it does very little work, which selection sort cannot match.',
     ]),
     ('Comparing the work', [
       'Both algorithms are quadratic in the worst case: roughly n squared over 2 comparisons.',
       'Selection sort always does the same number of comparisons regardless of the input.',
       'Insertion sort does far fewer on nearly-sorted data, which is a real advantage in practice.',
     ]),
   ],
   'worked': {
     'heading': 'Insertion sort, counting comparisons',
     'code': 'public class Insertion\n{\n    public static void main(String[] args)\n    {\n        int[] messy = {5, 2, 9, 1, 7};\n        int[] tidy = {1, 2, 5, 7, 9};\n\n        System.out.println(sort(messy));\n        System.out.println(sort(tidy));\n\n        for (int value : messy)\n        {\n            System.out.println(value);\n        }\n    }\n\n    public static int sort(int[] data)\n    {\n        int comparisons = 0;\n        for (int i = 1; i < data.length; i++)\n        {\n            int current = data[i];\n            int j = i - 1;\n            while (j >= 0 && data[j] > current)\n            {\n                comparisons++;\n                data[j + 1] = data[j];\n                j--;\n            }\n            data[j + 1] = current;\n        }\n        return comparisons;\n    }\n}',
     'notice': [
       'current holds the value being inserted while the shifting happens.',
       'Already-sorted input costs 0 shifting comparisons.',
       'The messy array costs far more, which is the difference selection sort cannot show.',
     ],
     'output': ['5', '0', '1', '2', '5', '7', '9'],
     'caption': 'Complete and runnable as shown. Messy input costs 5 shifts, sorted input costs 0.',
     'note': 'The two numbers 5 and 0 are the slide. Selection sort would report the same count for both inputs, '
             'which is the honest comparison to draw.',
   },
   'break_it': {
     'change': 'Remove the current variable and shift with data[j + 1] = data[j] while reading data[i] directly.',
     'happens': 'The value being inserted is overwritten by the first shift, so it is duplicated across the array '
                'and the original is lost.',
     'why': 'The element being inserted must be saved before the shifting begins, because the shifting writes '
            'over its slot. This is the swap bug again in a different shape: a value destroyed before anything '
            'saved it. Every algorithm that moves data needs somewhere to park what it is about to overwrite.',
     'note': 'Naming it as the same underlying bug for the third time is what turns three memorised fixes into '
             'one understood rule.',
   },
   'misconception': {
     'heading': 'One sorting algorithm is simply better than the other',
     'think': 'Insertion sort did less work, so it is the better algorithm.',
     'truth': 'It did less work on THAT input. Both are quadratic in the worst case, and insertion sort wins '
              'specifically on data that is already nearly in order, which is common in practice but not '
              'guaranteed. Selection sort does the same number of comparisons whatever the input, which makes it '
              'predictable rather than fast. Comparing algorithms means naming the input, not just the winner.',
     'note': 'Connects to 2.12: growth rate and actual cost are different questions, and both matter.',
   },
   'discussion': [
     'Why does insertion sort do so little work on already-sorted data?',
     'Why is selection sort\'s comparison count the same regardless of the input?',
   ],
   'learned': [
     'I can trace insertion sort pass by pass.',
     'I can compare the work selection and insertion sort do.',
     'I can explain why both are quadratic in the worst case.',
   ],
   'up_next': 'Topic 4.16 introduces recursion, where a method calls itself.',
   'extra': 'Complete the graded debugging exercise for 4.15. It plants a swap with no temporary.',
  },
 ],
},

# ── 4.16 ─────────────────────────────────────────────────────────────────────
{
 'topic': '4.16',
 'title': 'Recursion',
 'handle': 'ap-csa-lesson-4-16-recursion',
 'subtitle': 'A method that calls itself, the base case, and the value it returns',
 'vocab': [
   ('Recursion', 'A method solving a problem by calling itself on a smaller version of it.'),
   ('Base case', 'The smallest case, answered directly without recursing.'),
   ('Recursive case', 'The case that reduces the problem and calls the method again.'),
   ('Call stack', 'The record of calls waiting for the ones they made to return.'),
   ('Unwinding', 'The returns coming back up the stack once the base case is reached.'),
   ('Identity value', 'The base case value that leaves the combining operation unchanged.'),
 ],
 'quiz': [
   {'stem': 'Every recursive method needs:',
    'options': ['A loop', 'A base case', 'An array', 'Two parameters'],
    'answer_index': 1,
    'why': 'Without one the recursion never stops.'},
   {'stem': 'What must the recursive call do to its argument?',
    'options': ['Keep it the same', 'Make the problem strictly smaller', 'Double it', 'Negate it'],
    'answer_index': 1,
    'why': 'Otherwise the base case is never reached.'},
   {'stem': 'factorial with a base case returning 0 gives:',
    'options': ['The correct answer', '0 for every input', 'An exception', '1'],
    'answer_index': 1,
    'why': 'Everything is multiplied by that 0 as the calls unwind.'},
   {'stem': 'The base case for factorial should return:',
    'options': ['0', '1', 'n', '-1'],
    'answer_index': 1,
    'why': 'One is the identity for multiplication.'},
   {'stem': 'sumTo(n) calling sumTo(n) instead of sumTo(n - 1):',
    'options': ['Works', 'Never reaches the base case', 'Returns 0', 'Is faster'],
    'answer_index': 1,
    'why': 'The problem never gets smaller.'},
   {'stem': 'The base case value should be:',
    'options': ['Always 0', 'Always 1', 'The identity of the combining operation', 'The input'],
    'answer_index': 2,
    'why': '0 for a sum, 1 for a product, matching 2.8.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'How recursion works, and what the base case is for',
   'schedule': [
     (6, 'Bell ringer: the line of people'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Base case and recursive case'),
     (10, 'Worked example: countdown, factorial and sum'),
     (13, 'Unwinding, and what the base case contributes'),
     (5, 'Misconception check: the base case value does not matter'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'The line-of-people demonstration is worth doing physically. It makes unwinding visible.',
     'The base-case VALUE is the examinable subtlety, not the existence of a base case.',
   ],
   'warmup': ('The line of people',
     'Stand five students in a line: "Each of you asks the person behind how many people are behind them, adds '
     'one, and answers. The last person has nobody behind. What do they say, and what happens next?"',
     'They say zero, and the answers come back up the line: 0, 1, 2, 3, 4. That is the base case and the '
     'unwinding, performed rather than described. Ask what happens if the last person says five instead of zero, '
     'which is exactly tomorrow\'s bug.'),
   'objectives': [
     ('I can identify the base case and the recursive case of a method.', 'LO 4.16.A'),
     ('I can trace a recursive call and its unwinding.', 'LO 4.16.B'),
     ('I can choose the correct base case value.', 'LO 4.16.C'),
   ],
   'sections': [
     ('Base case and recursive case', [
       'A recursive method solves a problem by calling itself on a strictly smaller version of the same problem.',
       'The base case is the smallest version, answered directly without any further call.',
       'The recursive call must reduce the problem, or the base case is never reached.',
       'Every recursive method needs both: a base case to stop and a reduction to get there.',
     ]),
     ('Unwinding', [
       'Calls stack up until the base case is reached, and then the answers come back up.',
       'Each level combines its own value with whatever the level below returned.',
       'The base case value is therefore part of every answer, and it must be the identity of the combining operation.',
       'A sum uses 0 and a product uses 1, exactly as accumulators did in 2.8.',
     ]),
   ],
   'worked': {
     'heading': 'Countdown, factorial and sum',
     'code': 'public class Recurse\n{\n    public static void countdown(int n)\n    {\n        if (n <= 0)\n        {\n            return;\n        }\n        System.out.println(n);\n        countdown(n - 1);\n    }\n\n    public static int factorial(int n)\n    {\n        if (n <= 1)\n        {\n            return 1;\n        }\n        return n * factorial(n - 1);\n    }\n\n    public static int sumTo(int n)\n    {\n        if (n <= 0)\n        {\n            return 0;\n        }\n        return n + sumTo(n - 1);\n    }\n\n    public static void main(String[] args)\n    {\n        countdown(3);\n        System.out.println(factorial(5));\n        System.out.println(sumTo(5));\n    }\n}',
     'notice': [
       'All three reduce the argument: n - 1 every time.',
       'factorial returns 1 at the base; sumTo returns 0. Different identities.',
       'countdown returns nothing, so its base case just stops.',
     ],
     'output': ['3', '2', '1', '120', '15'],
     'caption': 'Complete and runnable as shown. Three recursive methods, two different base values.',
     'note': 'Expand factorial(3) on the board as 3 * 2 * 1 and ask what happens if that final 1 were a 0. The '
             'whole product collapses, which is tomorrow in one line.',
   },
   'break_it': {
     'change': 'Change factorial\'s base case to return 0.',
     'happens': 'Every factorial is 0, including factorial(5). The recursion terminates correctly and the answer '
                'is annihilated on the way back up.',
     'why': 'The base case value is multiplied into every level as the calls unwind, so returning 0 makes the '
            'whole product 0 no matter how correct the rest is. The identity for multiplication is 1, exactly as '
            'it was for accumulators in 2.8. Tonight\'s graded debugging exercise plants this alongside a '
            'recursive call that never reduces.',
     'note': 'Deliberately not a missing base case. A stack overflow teaches stack traces; a wrong base value '
             'teaches recursion.',
   },
   'misconception': {
     'heading': 'The base case just has to stop the recursion',
     'think': 'As long as the base case returns something and stops, the recursion is correct.',
     'truth': 'The base case does not only stop the recursion, it contributes a VALUE that every level above it '
              'combines with. Returning 0 from a product base case is like starting a product accumulator at 0: '
              'the answer is destroyed on the way back. Choose the identity of whatever operation the recursive '
              'case uses, which is 0 for a sum and 1 for a product.',
     'note': 'The link to 2.8 accumulator identities is exact, and saying so makes both topics easier.',
   },
   'discussion': [
     'Why does a base case of 0 make every factorial 0, rather than just being off by a little?',
     'What should the base case return for a method that multiplies, and for one that adds?',
   ],
   'learned': [
     'I can identify the base case and the recursive case of a method.',
     'I can trace a recursive call and its unwinding.',
     'I can choose the correct base case value.',
   ],
   'up_next': 'Day 2 traces recursion over arrays and Strings.',
   'extra': 'Expand sumTo(4) by hand, all the way down to the base case and back up.',
  },
  {
   'day': 2,
   'focus': 'Recursion over data, and tracing the stack',
   'schedule': [
     (5, 'Bell ringer: retrieval on base cases'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Recursing over arrays and Strings'),
     (10, 'Worked walkthrough: trace the stack, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Recursion over data uses an index or a substring as the shrinking argument. Make that explicit.',
     'Draw the stack growing and unwinding. Exam questions ask for the value at each level.',
   ],
   'warmup': ('Retrieval on base cases',
     'On the board, no notes: "1. What two things does every recursive method need? 2. What should a product '
     'base case return? 3. What happens if the argument never shrinks?"',
     'A base case and a reduction; 1; it never reaches the base case. If the second answer is 0, redo yesterday\'s '
     'break-it slide before continuing.'),
   'objectives': [
     ('I can write a recursive method over an array using an index.', 'LO 4.16.A'),
     ('I can write a recursive method over a String using substring.', 'LO 4.16.B'),
     ('I can trace the call stack and the returned values.', 'LO 4.16.C'),
   ],
   'sections': [
     ('Recursing over data', [
       'Over an array, the shrinking argument is usually an index moving toward the end.',
       'The base case is reaching the end of the array, where there is nothing left to add.',
       'Over a String, the shrinking argument is usually a substring, and the base case is the empty String.',
     ]),
     ('Tracing the stack', [
       'Each call waits for the one it made, so the calls stack up before any of them finish.',
       'The base case returns first, and the answers combine on the way back up.',
       'Writing one line per call, indented, makes the stack visible and matches how exam questions ask about it.',
     ]),
   ],
   'worked': {
     'heading': 'Recursion over an array and a String',
     'code': 'public class OverData\n{\n    public static int sumFrom(int[] data, int i)\n    {\n        if (i >= data.length)\n        {\n            return 0;\n        }\n        return data[i] + sumFrom(data, i + 1);\n    }\n\n    public static int countLetter(String s, String target)\n    {\n        if (s.length() == 0)\n        {\n            return 0;\n        }\n        int rest = countLetter(s.substring(1), target);\n        if (s.substring(0, 1).equals(target))\n        {\n            return 1 + rest;\n        }\n        return rest;\n    }\n\n    public static void main(String[] args)\n    {\n        int[] data = {3, 9, 4};\n        System.out.println(sumFrom(data, 0));\n        System.out.println(countLetter("banana", "a"));\n        System.out.println(countLetter("", "a"));\n    }\n}',
     'notice': [
       'The index grows toward the end - that is the reduction.',
       'The base case returns 0, the identity for addition.',
       'substring(1) drops the first character, shrinking the String each call.',
     ],
     'output': ['16', '3', '0'],
     'caption': 'Complete and runnable as shown. An empty String is a valid base case, not an error.',
     'note': 'Trace countLetter("ba", "a") on the board with one indented line per call. The exam asks exactly '
             'this shape of question.',
   },
   'break_it': {
     'change': 'Change sumFrom\'s recursive call to sumFrom(data, i) without incrementing.',
     'happens': 'It recurses forever on the same index and eventually throws StackOverflowError. Every call is '
                'identical to the one that made it.',
     'why': 'The argument must move toward the base case on every call. Passing the same index means the base '
            'case is never reached and the stack fills with identical frames. A StackOverflowError almost always '
            'means the reduction is missing, which makes it one of the more informative errors in Java.',
     'note': 'This is the one place in the course where a stack overflow is instructive, because the cause is '
             'exactly one missing character.',
   },
   'misconception': {
     'heading': 'Recursion is just a harder way to write a loop',
     'think': 'Anything recursive could be a loop, so recursion is a stylistic choice with worse performance.',
     'truth': 'Both are true for simple counting, and neither is the point. Recursion expresses problems that '
              'split into smaller versions of themselves, and for those, the recursive version is dramatically '
              'shorter and clearer: recursive binary search in 4.17 is the example. What the exam asks is that '
              'you can trace it, identify the base case, and predict what each level returns, and none of that '
              'depends on preferring it to a loop.',
     'note': 'Honest framing. Students who have been told "recursion is elegant" without seeing why deserve the '
             'real answer.',
   },
   'discussion': [
     'What is the shrinking argument when recursing over an array? Over a String?',
     'What does a StackOverflowError almost always tell you about the recursive call?',
   ],
   'learned': [
     'I can write a recursive method over an array using an index.',
     'I can write a recursive method over a String using substring.',
     'I can trace the call stack and the returned values.',
   ],
   'up_next': 'Topic 4.17 closes the course with recursive searching and sorting.',
   'extra': 'Complete the graded debugging exercise for 4.16. It plants a base case of 0 and a call that never reduces.',
  },
 ],
},

# ── 4.17 ─────────────────────────────────────────────────────────────────────
{
 'topic': '4.17',
 'title': 'Recursive Searching and Sorting',
 'handle': 'ap-csa-lesson-4-17-recursive-searching-and-sorting',
 'subtitle': 'Binary search written recursively, merge sort, and returning what the call gave back',
 'vocab': [
   ('Recursive binary search', 'Binary search expressed as a call on the remaining half.'),
   ('Merge sort', 'Sorting by splitting in half, sorting each half, and merging the results.'),
   ('Divide and conquer', 'Solving a problem by splitting it into smaller independent problems.'),
   ('Discarded return', 'A recursive call whose result is computed and then thrown away.'),
   ('Merge', 'Combining two sorted sequences into one sorted sequence.'),
   ('Halving', 'Reducing the problem size by half at each level, giving logarithmic depth.'),
 ],
 'quiz': [
   {'stem': 'A recursive call written as a bare statement:',
    'options': ['Does nothing', 'Computes an answer that is discarded', 'Throws', 'Loops'],
    'answer_index': 1,
    'why': 'The work happens and nobody keeps the result.'},
   {'stem': 'In recursive binary search, the recursive calls must be:',
    'options': ['Called', 'Returned', 'Assigned to a field', 'Wrapped in a loop'],
    'answer_index': 1,
    'why': 'The caller needs the value the deeper call produced.'},
   {'stem': 'Merge sort splits the data:',
    'options': ['Into single elements immediately', 'In half at each level', 'By value', 'Into thirds'],
    'answer_index': 1,
    'why': 'Halving at each level gives logarithmic depth.'},
   {'stem': 'The base case of recursive binary search is:',
    'options': ['low equals high', 'low greater than high', 'mid equals target', 'Both B and C'],
    'answer_index': 3,
    'why': 'An empty window means not found, and a match means found.'},
   {'stem': 'A search that only finds targets at the first midpoint suggests:',
    'options': ['Unsorted data', 'Discarded recursive returns', 'A wrong midpoint', 'An empty array'],
    'answer_index': 1,
    'why': 'Anything needing one level of recursion returns the fall-through value.'},
   {'stem': 'Merge sort is faster than selection sort because:',
    'options': ['It uses less memory', 'Halving gives far fewer total comparisons', 'It avoids swaps', 'It is iterative'],
    'answer_index': 1,
    'why': 'Logarithmic depth beats a quadratic number of comparisons.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Recursive binary search, and returning the result',
   'schedule': [
     (6, 'Bell ringer: rewrite the loop as a call'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Binary search, recursively'),
     (10, 'Worked example: the recursive version'),
     (13, 'Returning what the call returned'),
     (5, 'Misconception check: calling is enough'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'The discarded-return bug is the single most instructive bug in recursion. Give it the full block.',
     'Contrast with 1.10: ignoring a return value, now one level deeper.',
   ],
   'warmup': ('Rewrite the loop as a call',
     'On the board, yesterday\'s iterative binary search: "The loop narrows low and high each pass. If instead '
     'you called the method again with the new low and high, what would you need to do with the answer it gives '
     'you?"',
     'Return it. That is the whole lesson and they can reason it out before seeing any code, which makes the bug '
     'later feel obvious rather than mysterious.'),
   'objectives': [
     ('I can write binary search recursively.', 'LO 4.17.A'),
     ('I can return the result of a recursive call.', 'LO 4.17.B'),
     ('I can identify both base cases of a recursive search.', 'LO 4.17.C'),
   ],
   'sections': [
     ('Binary search, recursively', [
       'The recursive version passes the new low and high instead of updating them in a loop.',
       'There are two base cases: the window being empty, which means not found, and the middle matching, which means found.',
       'Each call searches one half, so the depth is the number of times the range can be halved.',
     ]),
     ('Returning the result', [
       'A recursive call is an expression that produces a value, exactly like any other method call.',
       'Writing it as a bare statement computes the right answer and throws it away.',
       'The deeper call returned its answer to its caller, and the caller has to hand it further up.',
       'The symptom is distinctive: targets found only at the very first midpoint, everything else reported missing.',
     ]),
   ],
   'worked': {
     'heading': 'Binary search, recursively',
     'code': 'public class RecSearch\n{\n    public static int search(int[] data, int target, int low, int high)\n    {\n        if (low > high)\n        {\n            return -1;\n        }\n        int mid = (low + high) / 2;\n        if (data[mid] == target)\n        {\n            return mid;\n        }\n        if (data[mid] > target)\n        {\n            return search(data, target, low, mid - 1);\n        }\n        return search(data, target, mid + 1, high);\n    }\n\n    public static void main(String[] args)\n    {\n        int[] data = {10, 20, 30, 40, 50, 60, 70};\n        System.out.println(search(data, 20, 0, data.length - 1));\n        System.out.println(search(data, 70, 0, data.length - 1));\n        System.out.println(search(data, 99, 0, data.length - 1));\n    }\n}',
     'notice': [
       'Both recursive calls are RETURNED, not just called.',
       'low > high is the not-found base case.',
       '20 needs one level of recursion; 30 would be found at the first midpoint.',
     ],
     'output': ['1', '6', '-1'],
     'caption': 'Complete and runnable as shown. Found near the start, found at the end, and not found.',
     'note': 'Target 20 is chosen deliberately: it is not at the first midpoint, so it only works if the return '
             'is there. That makes it the test that exposes tomorrow\'s bug.',
   },
   'break_it': {
     'change': 'Remove the return keyword from both recursive calls, leaving them as bare statements, and let '
               'execution fall through to a final return -1.',
     'happens': 'Only targets sitting exactly at the first midpoint are found. Searching for 20 or 70 now reports '
                '-1, even though the recursion computed the right answer at a deeper level.',
     'why': 'The deeper call did all the work and returned its answer to a caller that ignored it, so execution '
            'fell past and returned the not-found value. This is the 1.10 discarded return value, one level '
            'deeper and far harder to see. Tonight\'s graded debugging exercise plants it with a broken midpoint.',
     'note': 'Ask which single target still works and why. Only the first midpoint, because that path never '
             'recurses at all.',
   },
   'misconception': {
     'heading': 'Making the recursive call is the point',
     'think': 'I called the method again, so the recursion is happening and the work is being done.',
     'truth': 'The work is being done and then discarded. A recursive call produces a value the same way any '
              'other call does, and if nothing captures or returns it, execution simply continues past. The '
              'recursion really did run, really did find the answer, and really did throw it away. Every '
              'recursive call must be returned, assigned, or combined into something that is.',
     'note': 'The fact that the recursion IS happening is what makes this so confusing. Say it explicitly.',
   },
   'discussion': [
     'Why does the broken version still find a target at the first midpoint?',
     'How is this the same mistake as calling twice(x) without assigning the result?',
   ],
   'learned': [
     'I can write binary search recursively.',
     'I can return the result of a recursive call.',
     'I can identify both base cases of a recursive search.',
   ],
   'up_next': 'Day 2 closes the course with merge sort and a look back across all four units.',
   'extra': 'Trace the recursive search for 20 in {10, 20, 30, 40, 50, 60, 70}. Write low, high and mid per call.',
  },
  {
   'day': 2,
   'focus': 'Merge sort, and closing the course',
   'schedule': [
     (5, 'Bell ringer: retrieval on returns'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Merge sort, divide and conquer'),
     (10, 'Worked walkthrough: merge two sorted halves, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket and course review preview'),
   ],
   'notes': [
     'Merge sort is examinable at the trace level rather than the write-from-scratch level. Aim there.',
     'Last topic of the course. Leave five minutes to look back across the four units.',
   ],
   'warmup': ('Retrieval on returns',
     'On the board, no notes: "1. What happens to a recursive call written as a bare statement? '
     '2. What is the symptom in a recursive search? 3. What are the two base cases?"',
     'Its answer is discarded; only first-midpoint targets are found; empty window and a match. Then straight '
     'into merge sort.'),
   'objectives': [
     ('I can describe how merge sort splits and merges.', 'LO 4.17.A'),
     ('I can merge two sorted sequences into one.', 'LO 4.17.B'),
     ('I can explain why halving makes merge sort faster than selection sort.', 'LO 4.17.C'),
   ],
   'sections': [
     ('Divide and conquer', [
       'Merge sort splits the data in half, sorts each half the same way, and merges the two sorted halves.',
       'The base case is a sequence of one element, which is already sorted.',
       'Halving at each level means the depth is small even for large inputs, unlike the quadratic sorts.',
     ]),
     ('Merging', [
       'Merging walks both sorted sequences at once, taking the smaller front element each time.',
       'When one side runs out, everything remaining on the other side is appended in order.',
       'Merging two sorted halves of total length n takes about n comparisons, which is why the whole sort is efficient.',
     ]),
   ],
   'worked': {
     'heading': 'Merge two sorted halves',
     'code': 'public class Merge\n{\n    public static int[] merge(int[] left, int[] right)\n    {\n        int[] out = new int[left.length + right.length];\n        int i = 0;\n        int j = 0;\n        int k = 0;\n\n        while (i < left.length && j < right.length)\n        {\n            if (left[i] <= right[j])\n            {\n                out[k] = left[i];\n                i++;\n            }\n            else\n            {\n                out[k] = right[j];\n                j++;\n            }\n            k++;\n        }\n\n        while (i < left.length)\n        {\n            out[k] = left[i];\n            i++;\n            k++;\n        }\n        while (j < right.length)\n        {\n            out[k] = right[j];\n            j++;\n            k++;\n        }\n        return out;\n    }\n\n    public static void main(String[] args)\n    {\n        int[] a = {1, 5, 9};\n        int[] b = {2, 3, 8};\n        for (int value : merge(a, b))\n        {\n            System.out.println(value);\n        }\n    }\n}',
     'notice': [
       'Three indexes: one per input and one for the output.',
       'The two trailing loops drain whichever side still has elements.',
       'Every element is copied exactly once, so merging is linear.',
     ],
     'output': ['1', '2', '3', '5', '8', '9'],
     'caption': 'Complete and runnable as shown. Two sorted halves merged into one sorted array.',
     'note': 'Walk the two arrays with fingers on the board, taking the smaller front each time. The trailing '
             'loops make sense immediately once one side empties.',
   },
   'break_it': {
     'change': 'Delete the two trailing while loops.',
     'happens': 'The output is correct up to the point where one input runs out, and then the rest of the array '
                'is left at 0. The values that were still waiting are silently dropped.',
     'why': 'The main loop stops as soon as EITHER side is exhausted, so whatever remains on the other side has '
            'to be copied afterwards. Trailing zeros in the output are the signature: an int array is filled '
            'with 0, so the untouched slots show what was never written.',
     'note': 'Trailing zeros as a diagnostic is worth naming: it means the output array was allocated correctly '
             'and only partly filled.',
   },
   'misconception': {
     'heading': 'Recursion makes an algorithm faster',
     'think': 'Merge sort is recursive and it is fast, so recursion is what makes it fast.',
     'truth': 'Recursion is how merge sort is expressed, not why it is efficient. The efficiency comes from '
              'halving: each level does about n work, and there are only about as many levels as you can halve n. '
              'Recursion over a list one element at a time, as in 4.16, is no faster than a loop and uses more '
              'memory. Divide and conquer is the idea worth taking away, and recursion is just a convenient way '
              'to write it down.',
     'note': 'Good final misconception for the course: separate the idea from the syntax that expresses it.',
   },
   'discussion': [
     'Why does merging need the two trailing loops?',
     'Looking back across the course, which single mistake did you meet in the most different disguises?',
   ],
   'learned': [
     'I can describe how merge sort splits and merges.',
     'I can merge two sorted sequences into one.',
     'I can explain why halving makes merge sort faster than selection sort.',
   ],
   'up_next': 'Unit 4 test, then AP exam review. The FRQ labs return every strategy from all four units.',
   'extra': 'Complete the graded debugging exercise for 4.17. It plants a discarded recursive return and a broken midpoint.',
  },
 ],
},
]
