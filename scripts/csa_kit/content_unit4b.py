"""
AP CSA Unit 4 teacher-kit content, part 2: topics 4.4 - 4.9.

Array traversal and the standard algorithms, then text files, wrapper classes
and the move to ArrayList. Break-it and misconception slides mirror
seed/csa-debug-unit4.js and, for 4.4, the original inline exercise in
seed/csa-debug-exercises.js.

No em-dashes anywhere.
"""

TOPICS = [

# ── 4.4 ──────────────────────────────────────────────────────────────────────
{
 'topic': '4.4',
 'title': 'Traversing Arrays',
 'handle': 'ap-csa-lesson-4-4-traversing-arrays',
 'subtitle': 'Forwards, backwards, and every bound that is one step wrong',
 'vocab': [
   ('Forward traversal', 'Visiting elements from index 0 up to length minus 1.'),
   ('Backward traversal', 'Visiting elements from length minus 1 down to 0.'),
   ('Partial traversal', 'Visiting only some indexes, such as every second one.'),
   ('Bound', 'The condition that decides which indexes a loop visits.'),
   ('Tie', 'Two elements holding the same value, which forces a first-or-last decision.'),
   ('Trace table', 'A hand-written table of the loop variable and accumulators, one row per iteration.'),
 ],
 'quiz': [
   {'stem': 'A backward traversal starts at index:',
    'options': ['length', 'length - 1', '0', '1'],
    'answer_index': 1,
    'why': 'length itself is one past the end.'},
   {'stem': 'for (int i = data.length; i >= 0; i--) throws on:',
    'options': ['The last pass', 'The first pass', 'Never', 'The middle pass'],
    'answer_index': 1,
    'why': 'The very first index used is length, which does not exist.'},
   {'stem': 'A running maximum using > keeps which occurrence of a tie?',
    'options': ['The last', 'The first', 'Both', 'Neither'],
    'answer_index': 1,
    'why': 'A strict > only replaces on a strictly larger value.'},
   {'stem': 'To visit every second element starting at 0, the update is:',
    'options': ['i++', 'i = i + 2', 'i--', 'i = i * 2'],
    'answer_index': 1,
    'why': 'Stepping by two visits indexes 0, 2, 4 and so on.'},
   {'stem': 'The best way to check a traversal before running it is:',
    'options': ['Read it again', 'Write a trace table', 'Add print statements', 'Increase the bound'],
    'answer_index': 1,
    'why': 'A trace table makes the first and last indexes explicit.'},
   {'stem': 'Which bound visits every element exactly once?',
    'options': ['i <= length', 'i < length', 'i < length - 1', 'i <= length - 2'],
    'answer_index': 1,
    'why': 'It visits 0 through length minus 1.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Forward and backward traversal, and trace tables',
   'schedule': [
     (6, 'Bell ringer: first index, last index'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Traversing in both directions'),
     (10, 'Worked example: forwards then backwards'),
     (13, 'Trace tables as a checking habit'),
     (5, 'Misconception check: backwards starts at length'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'Every student writes a trace table today. It is the habit that carries them through the rest of the unit.',
     'The backward bound is where the crash lives. Make them state both endpoints before writing the loop.',
   ],
   'warmup': ('First index, last index',
     'On the board: "An array has length 6. Write the first index a forward loop uses, the last index it uses, '
     'the first index a BACKWARD loop uses and the last one."',
     '0 and 5; then 5 and 0. Getting the backward start as 5 rather than 6 is the entire content of the crash '
     'they are about to see, so collect answers before moving on.'),
   'objectives': [
     ('I can traverse an array forwards and backwards with correct bounds.', 'LO 4.4.A'),
     ('I can write a trace table to predict what a traversal produces.', 'LO 4.4.B'),
     ('I can traverse part of an array, such as every second element.', 'LO 4.4.C'),
   ],
   'sections': [
     ('Traversing in both directions', [
       'A forward traversal runs from 0 while i is less than length, so the last index used is length - 1.',
       'A backward traversal starts at length - 1 and runs while i is at least 0.',
       'Starting a backward loop at length uses an index one past the end on its very first pass, and throws immediately.',
       'A partial traversal changes the update rather than the bound: i = i + 2 visits every second index.',
     ]),
     ('Trace tables', [
       'A trace table has one column per changing variable and one row per iteration.',
       'Filling in the first and last rows alone catches most bound errors before the code is ever run.',
       'When a traversal misbehaves, the trace table tells you which end is wrong.',
     ]),
   ],
   'worked': {
     'heading': 'Forwards, then backwards',
     'code': 'public class Traverse\n{\n    public static void main(String[] args)\n    {\n        int[] data = {3, 9, 4, 1};\n\n        for (int i = 0; i < data.length; i++)\n        {\n            System.out.println(data[i]);\n        }\n\n        for (int i = data.length - 1; i >= 0; i--)\n        {\n            System.out.println(data[i]);\n        }\n\n        int evenSum = 0;\n        for (int i = 0; i < data.length; i = i + 2)\n        {\n            evenSum = evenSum + data[i];\n        }\n        System.out.println(evenSum);\n    }\n}',
     'notice': [
       'Forward: 0 to length - 1. Backward: length - 1 down to 0.',
       'i = i + 2 - a partial traversal, changing the update not the bound.',
       'evenSum adds indexes 0 and 2, which is 3 + 4.',
     ],
     'output': ['3', '9', '4', '1', '1', '4', '9', '3', '7'],
     'caption': 'Complete and runnable as shown. Four values forwards, four backwards, then a partial sum.',
     'note': 'Build the trace table for the backward loop on the board: i goes 3, 2, 1, 0. Ask what i would be '
             'on the first pass if the loop started at data.length.',
   },
   'break_it': {
     'change': 'Change the backward loop to start at data.length instead of data.length - 1.',
     'happens': 'It throws ArrayIndexOutOfBoundsException on the very first pass of that loop, before printing '
                'anything backwards at all.',
     'why': 'length is always one past the last valid index, so a backward loop must start at length - 1. The '
            'crash is immediate rather than at the end, which is a useful clue: a bug on the FIRST pass points '
            'at the starting value, not the bound. This is tonight\'s graded debugging exercise, along with a '
            'tie-breaking bug that reports the last occurrence instead of the first.',
     'note': 'Point out where the crash happens. First-pass crashes and last-pass crashes have different causes '
             'and students rarely distinguish them.',
   },
   'misconception': {
     'heading': 'A backward loop starts at length',
     'think': 'Forwards goes from 0 to length, so backwards goes from length down to 0.',
     'truth': 'Forwards never actually uses length: the bound i < length stops just before it. The symmetric '
              'backward loop therefore starts at length - 1, the last valid index, and runs down to 0 inclusive '
              'with i >= 0. Writing length as the start uses a nonexistent index on the first pass, which is why '
              'the crash arrives before any output.',
     'note': 'Draw the boxes again. The asymmetry between i < length and i >= 0 is worth pointing at explicitly.',
   },
   'discussion': [
     'Why does a backward loop use >= 0 while a forward loop uses < length rather than <= length?',
     'A traversal crashes on its first pass. What does that tell you about where to look?',
   ],
   'learned': [
     'I can traverse an array forwards and backwards with correct bounds.',
     'I can write a trace table to predict what a traversal produces.',
     'I can traverse part of an array, such as every second element.',
   ],
   'up_next': 'Day 2 uses traversals to find things, and decides what a tie means.',
   'extra': 'Write a trace table for a backward traversal of an array of length 3. List every index used.',
  },
  {
   'day': 2,
   'focus': 'Searching, ties, and reporting positions',
   'schedule': [
     (5, 'Bell ringer: retrieval on bounds'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Finding a position, and what a tie means'),
     (10, 'Worked walkthrough: first versus last occurrence, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'The > versus >= tie decision recurs from 2.9. Say so; the repetition is what makes it stick.',
     'Insist on a test input with duplicates. Without one, both versions look identical.',
   ],
   'warmup': ('Retrieval on bounds',
     'On the board, no notes: "1. First index of a backward loop over length 6? 2. What does i <= length do? '
     '3. What update visits every second element?"',
     'Five; throws on the last pass; i = i + 2. Quick recall, then straight into ties, which is the harder half.'),
   'objectives': [
     ('I can find the index of a value rather than just the value.', 'LO 4.4.B'),
     ('I can decide whether a tie should report the first or last occurrence.', 'LO 4.4.C'),
     ('I can choose a test input that distinguishes the two.', 'LO 4.4.A'),
   ],
   'sections': [
     ('Finding a position', [
       'Reporting WHERE something is requires the indexed form, because the position is the answer.',
       'Track the best index rather than the best value, and read the value from the array when you need it.',
       'A search that finds nothing should report a sentinel such as -1, never 0.',
     ]),
     ('Ties', [
       'A strict > only replaces the best when a later value is strictly larger, so ties keep the FIRST occurrence.',
       'Using >= replaces on equality too, so ties keep the LAST occurrence.',
       'Neither is safer. The specification decides, and a test with duplicates is the only way to tell which you wrote.',
     ]),
   ],
   'worked': {
     'heading': 'First occurrence, and last',
     'code': 'public class Occurrences\n{\n    public static void main(String[] args)\n    {\n        int[] data = {3, 9, 4, 9, 1};\n\n        int first = 0;\n        for (int i = 1; i < data.length; i++)\n        {\n            if (data[i] > data[first])\n            {\n                first = i;\n            }\n        }\n\n        int last = 0;\n        for (int i = 1; i < data.length; i++)\n        {\n            if (data[i] >= data[last])\n            {\n                last = i;\n            }\n        }\n\n        System.out.println(data[first]);\n        System.out.println(first);\n        System.out.println(last);\n    }\n}',
     'notice': [
       'Same value found by both - the maximum is 9 either way.',
       '> keeps index 1, the first 9. >= keeps index 3, the last one.',
       'One character apart, and they answer different questions.',
     ],
     'output': ['9', '1', '3'],
     'caption': 'Complete and runnable as shown. The maximum 9 appears at index 1 and index 3.',
     'note': 'Two loops identical except one character, and two different answers. Ask which the spec wanted '
             'before revealing which is which.',
   },
   'break_it': {
     'change': 'Test both versions on the array {3, 9, 4, 1} with no duplicates.',
     'happens': 'Both report index 1 and both look correct. The difference between them is completely invisible '
                'on this input.',
     'why': 'A test that cannot distinguish two versions proves nothing about which one you wrote. Choosing the '
            'test input is as much a skill as writing the code, and for tie-breaking the necessary input is one '
            'with duplicates. This is the second bug in tonight\'s graded debugging exercise.',
     'note': 'Good general lesson: ask what input would tell the two versions apart, then use exactly that input.',
   },
   'misconception': {
     'heading': 'Any test that passes is a good test',
     'think': 'I ran it and got the right answer, so the code is correct.',
     'truth': 'A test only tells you about the behavior it can distinguish. An array with no duplicates gives '
              'the same answer for both tie-breaking rules, so passing it says nothing about which rule you '
              'implemented. Before running, ask what input would produce DIFFERENT answers from a correct and an '
              'incorrect version, and run that one. If you cannot think of such an input, the test is decoration.',
     'note': 'One of the most transferable ideas in the course, and it costs two minutes here.',
   },
   'discussion': [
     'What input distinguishes a > tie-break from a >= one? What input cannot?',
     'Why track the best index rather than the best value?',
   ],
   'learned': [
     'I can find the index of a value rather than just the value.',
     'I can decide whether a tie should report the first or last occurrence.',
     'I can choose a test input that distinguishes the two.',
   ],
   'up_next': 'Topic 4.5 collects the standard array algorithms in one place.',
   'extra': 'Complete the graded debugging exercise for 4.4. It plants a backward bound and a tie-breaking bug.',
  },
 ],
},

# ── 4.5 ──────────────────────────────────────────────────────────────────────
{
 'topic': '4.5',
 'title': 'Algorithms with Arrays',
 'handle': 'ap-csa-lesson-4-5-algorithms-with-arrays',
 'subtitle': 'Sum, average, search and count, and the cast that has to come first',
 'vocab': [
   ('Standard algorithm', 'One of the small set of array algorithms the exam expects: sum, average, max, min, search, count.'),
   ('Integer division', 'Division of two ints, which discards the remainder before anything else happens.'),
   ('Cast', 'Converting a value to another type, written as (double) value.'),
   ('Type promotion', 'One double operand causing the whole expression to be evaluated as doubles.'),
   ('Sentinel', 'A special value such as -1 meaning not found.'),
   ('Linear search', 'Checking each element in turn until the target is found or the array ends.'),
 ],
 'quiz': [
   {'stem': 'What does (double)(7 / 2) evaluate to?',
    'options': ['3.5', '3.0', '4.0', '3'],
    'answer_index': 1,
    'why': 'The int division happens first, giving 3, which is then widened to 3.0.'},
   {'stem': 'Which computes a true average of int total over int count?',
    'options': ['(double)(total / count)', '(double) total / count', 'total / (int) count', 'total / count'],
    'answer_index': 1,
    'why': 'Casting one operand promotes the whole division to double arithmetic.'},
   {'stem': 'A linear search that starts at index 1:',
    'options': ['Is faster', 'Cannot find a target at index 0', 'Throws', 'Is correct'],
    'answer_index': 1,
    'why': 'It never examines the first element.'},
   {'stem': 'A search that finds nothing should return:',
    'options': ['0', '-1', 'length', 'The last index'],
    'answer_index': 1,
    'why': 'Zero is a valid index and would read as a real match.'},
   {'stem': 'Which algorithm requires seeding from the data rather than a constant?',
    'options': ['Sum', 'Count', 'Maximum', 'Average'],
    'answer_index': 2,
    'why': 'A maximum has no neutral starting value.'},
   {'stem': 'Integer division discards:',
    'options': ['The whole number part', 'The remainder', 'Nothing', 'The sign'],
    'answer_index': 1,
    'why': 'It truncates toward zero, losing the fractional part.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Sum, average, and where the cast belongs',
   'schedule': [
     (6, 'Bell ringer: seven divided by two'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Sum and average'),
     (10, 'Worked example: the cast in the right place'),
     (13, 'Type promotion'),
     (5, 'Misconception check: casting fixes the answer'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'The parentheses placement is the whole lesson. Write both versions side by side and evaluate each aloud.',
     'This is 1.5 returning. Say so; students who met it then recognize it faster now.',
   ],
   'warmup': ('Seven divided by two',
     'On the board. "What does each of these three give? Write all three down before we run anything."',
     '3, 3.0 and 3.5. The middle one is the trap, and seeing 3.0 rather than 3.5 written down in their own handwriting is what makes the rule stick.',
     'int a = 7;\nint b = 2;\n\na / b\n(double)(a / b)\n(double) a / b'),
   'objectives': [
     ('I can compute the sum and average of an array.', 'LO 4.5.A'),
     ('I can place a cast so a division produces a fractional result.', 'LO 4.5.B'),
     ('I can explain type promotion in a mixed expression.', 'LO 4.5.C'),
   ],
   'sections': [
     ('Sum and average', [
       'A sum accumulates every element, starting from 0 because 0 is neutral for addition.',
       'An average is the sum divided by the count, and both are ints, so the division truncates by default.',
       'The count is data.length, which is always correct and never needs a separate counter.',
     ]),
     ('Casting and promotion', [
       'Integer division discards the remainder BEFORE anything else happens, including any later cast.',
       'Casting the result cannot recover what the division already threw away.',
       'Casting one OPERAND promotes the whole expression to double arithmetic, which is what preserves the fraction.',
       '(double) total / count works because the cast binds to total, not to the finished division.',
     ]),
   ],
   'worked': {
     'heading': 'The cast in the right place',
     'code': 'public class Average\n{\n    public static void main(String[] args)\n    {\n        int[] data = {7, 0};\n\n        int total = 0;\n        for (int value : data)\n        {\n            total = total + value;\n        }\n        System.out.println(total);\n\n        System.out.println(total / data.length);\n        System.out.println((double) (total / data.length));\n        System.out.println((double) total / data.length);\n    }\n}',
     'notice': [
       'total / length - int division, so 3.',
       '(double)(total / length) - still 3, now printed as 3.0.',
       '(double) total / length - 3.5, the real average.',
     ],
     'output': ['7', '3', '3.0', '3.5'],
     'caption': 'Complete and runnable as shown. Three divisions, one correct average.',
     'note': 'Lines 3 and 4 are the slide. 3.0 looks like a double and carries a truncated value, which is why '
             'it fools people so reliably.',
   },
   'break_it': {
     'change': 'Use (double)(total / data.length) as the reported average.',
     'happens': 'It prints 3.0 instead of 3.5. The type is right, the value is wrong, and the output looks like '
                'a properly computed decimal.',
     'why': 'The parentheses make the cast apply to the finished division, which has already discarded the '
            'remainder. A cast converts a value; it cannot recover information that no longer exists. Tonight\'s '
            'graded debugging exercise plants this alongside a search that skips index 0.',
     'note': 'The fact that it prints with a decimal point is what makes it dangerous. Say that explicitly.',
   },
   'misconception': {
     'heading': 'Casting to double fixes the division',
     'think': 'The answer came out wrong because it was an int, so casting it to double will fix it.',
     'truth': 'The cast happens after the division, and the division already threw the remainder away. Converting '
              '3 to a double gives 3.0, not 3.5, because there is nothing left to convert. The fix has to happen '
              'BEFORE the division: cast one operand so the division itself is done in doubles. Where a cast sits '
              'matters more than that it is there.',
     'note': 'This is 1.5 with bigger numbers. Naming the callback helps the students who met it before.',
   },
   'discussion': [
     'Why can a cast not recover the remainder that integer division discarded?',
     'Why does casting only one operand change the whole expression?',
   ],
   'learned': [
     'I can compute the sum and average of an array.',
     'I can place a cast so a division produces a fractional result.',
     'I can explain type promotion in a mixed expression.',
   ],
   'up_next': 'Day 2 covers searching and counting, and what to return when nothing is found.',
   'extra': 'Compute the average of {1, 2} three ways, as on the worked example. Predict each before running.',
  },
  {
   'day': 2,
   'focus': 'Linear search, counting, and the not-found answer',
   'schedule': [
     (5, 'Bell ringer: retrieval on casting'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Linear search and sentinels'),
     (10, 'Worked walkthrough: search, count, and not found, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Always test the not-found case. It is the case students skip and the case the exam asks about.',
     'The sentinel idea recurs from 2.10 indexOf. Connect them.',
   ],
   'warmup': ('Retrieval on casting',
     'On the board, no notes: "1. What does (double)(7/2) give? 2. What does (double) 7 / 2 give? '
     '3. Why are they different?"',
     '3.0, 3.5, because the cast in the first applies after the division has already truncated. If the third '
     'answer is vague, redo the worked example before continuing.'),
   'objectives': [
     ('I can write a linear search that reports an index.', 'LO 4.5.A'),
     ('I can return a sentinel when nothing is found.', 'LO 4.5.B'),
     ('I can count elements meeting a condition.', 'LO 4.5.C'),
   ],
   'sections': [
     ('Linear search', [
       'A linear search checks each element in turn, starting at index 0, until it finds the target or runs out.',
       'Starting anywhere other than 0 means the first element can never be found.',
       'Once found, break out: continuing costs time and can overwrite the first match with a later one.',
     ]),
     ('Sentinels and counting', [
       'A search that finds nothing must report a value that cannot be mistaken for a position. -1 is the convention.',
       'Returning 0 for not found is wrong, because 0 is a perfectly valid index.',
       'A count starts at 0 and adds 1 per match, and it visits every element rather than stopping at the first.',
     ]),
   ],
   'worked': {
     'heading': 'Search, count, and not found',
     'code': 'public class Find\n{\n    public static void main(String[] args)\n    {\n        int[] data = {5, 3, 7, 3};\n\n        int found = -1;\n        for (int i = 0; i < data.length; i++)\n        {\n            if (data[i] == 3)\n            {\n                found = i;\n                break;\n            }\n        }\n        System.out.println(found);\n\n        int missing = -1;\n        for (int i = 0; i < data.length; i++)\n        {\n            if (data[i] == 99)\n            {\n                missing = i;\n                break;\n            }\n        }\n        System.out.println(missing);\n\n        int count = 0;\n        for (int value : data)\n        {\n            if (value == 3)\n            {\n                count++;\n            }\n        }\n        System.out.println(count);\n    }\n}',
     'notice': [
       'Search starts at 0 and breaks on the first match, so it reports index 1.',
       'The missing target leaves found at -1, which cannot be confused with a position.',
       'The count does NOT break, because it must see every element.',
     ],
     'output': ['1', '-1', '2'],
     'caption': 'Complete and runnable as shown. Found, not found, and counted.',
     'note': 'Three loops, and the difference between the first and the third is only the break. Ask why one '
             'stops and the other must not.',
   },
   'break_it': {
     'change': 'Start the search loop at index 1 instead of 0.',
     'happens': 'Searching for 5, which sits at index 0, now reports -1. The array plainly contains it and the '
                'search plainly says it does not.',
     'why': 'A search starting at 1 asserts that index 0 cannot hold the answer, which is never true. The bug is '
            'invisible whenever the target happens to be elsewhere, which is most test data. This is on '
            'tonight\'s graded debugging exercise together with the misplaced cast.',
     'note': 'Ask which test would catch it. A target at the front, which is exactly the input nobody picks by '
             'accident.',
   },
   'misconception': {
     'heading': 'Returning 0 for not found is fine',
     'think': 'Zero means nothing was found, the same way an empty count is zero.',
     'truth': 'For a COUNT, zero genuinely means none. For a POSITION, zero is the first element, so returning it '
              'to mean not found is indistinguishable from finding the target at the front. That is why every '
              'search in Java uses -1: it cannot be a valid index, so it cannot be misread. Never do arithmetic '
              'on it either, because -1 plus 1 is 0 and the signal becomes a position.',
     'note': 'Same sentinel rule as 2.10 indexOf. The repetition across units is deliberate.',
   },
   'discussion': [
     'Why is -1 a better not-found answer than 0 for a search but not for a count?',
     'Why does the counting loop not break on the first match?',
   ],
   'learned': [
     'I can write a linear search that reports an index.',
     'I can return a sentinel when nothing is found.',
     'I can count elements meeting a condition.',
   ],
   'up_next': 'Topic 4.6 reads data from a file rather than from a hand-typed list.',
   'extra': 'Complete the graded debugging exercise for 4.5. It plants a cast after the division and a search that skips index 0.',
  },
 ],
},

# ── 4.6 ──────────────────────────────────────────────────────────────────────
{
 'topic': '4.6',
 'title': 'Using Text Files',
 'handle': 'ap-csa-lesson-4-6-using-text-files',
 'subtitle': 'Reading lines and tokens, and the newline Scanner leaves behind',
 'vocab': [
   ('Token', 'A chunk of input separated by whitespace, read by next or nextInt.'),
   ('Line', 'Everything up to the next newline, read by nextLine.'),
   ('Buffer', 'The input waiting to be read, including whitespace you cannot see.'),
   ('hasNext', 'A Scanner method reporting whether more input is available.'),
   ('Mixed reading', 'Using both token reads and line reads on the same Scanner, which is where the trap lives.'),
   ('NoSuchElementException', 'The exception thrown when a read is attempted with no input left.'),
 ],
 'quiz': [
   {'stem': 'After nextInt reads a number, what is left in the buffer?',
    'options': ['Nothing', 'The newline you typed after it', 'The next number', 'A space'],
    'answer_index': 1,
    'why': 'nextInt consumes the digits only.'},
   {'stem': 'The first nextLine after a nextInt typically returns:',
    'options': ['The next line', 'An empty String', 'Null', 'An exception'],
    'answer_index': 1,
    'why': 'It finds the leftover newline immediately and returns what precedes it, which is nothing.'},
   {'stem': 'The standard fix is:',
    'options': ['Call nextLine twice at the end', 'One bare nextLine after the last nextInt',
                'Use only nextInt', 'Reopen the Scanner'],
    'answer_index': 1,
    'why': 'A discarded nextLine consumes the leftover newline.'},
   {'stem': 'Reading more lines than exist throws:',
    'options': ['ArrayIndexOutOfBoundsException', 'NoSuchElementException', 'NullPointerException', 'Nothing'],
    'answer_index': 1,
    'why': 'The Scanner has no element left to return.'},
   {'stem': 'A program that only ever calls nextLine:',
    'options': ['Still has the newline problem', 'Cannot have the newline problem',
                'Cannot read numbers', 'Is slower'],
    'answer_index': 1,
    'why': 'The trap only exists when token reads and line reads are mixed.'},
   {'stem': 'To read exactly count lines, the loop bound should be:',
    'options': ['i <= count', 'i < count', 'i < count + 1', 'while hasNext'],
    'answer_index': 1,
    'why': 'i < count runs exactly count times.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Tokens, lines, and the leftover newline',
   'schedule': [
     (6, 'Bell ringer: what is still in the buffer'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Token reads and line reads'),
     (10, 'Worked example: a count then that many lines'),
     (13, 'The leftover newline and its fix'),
     (5, 'Misconception check: nextInt reads the whole line'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'Draw the buffer as a row of characters including a visible newline symbol. It makes the invisible visible.',
     'Every student meets this bug once. Meeting it here, deliberately, is much cheaper than meeting it in an exam.',
   ],
   'warmup': ('What is still in the buffer',
     'On the board, input "3" then Enter then "hello": "nextInt() runs. Draw everything still waiting to be '
     'read, including anything you cannot see."',
     'The newline is still there, then hello. Students who draw the newline have already solved today\'s bug; '
     'students who do not are about to learn why it matters.'),
   'objectives': [
     ('I can read tokens and lines from a Scanner.', 'LO 4.6.A'),
     ('I can explain why a nextLine after a nextInt returns an empty String.', 'LO 4.6.B'),
     ('I can consume the leftover newline correctly.', 'LO 4.6.C'),
   ],
   'sections': [
     ('Tokens and lines', [
       'next and nextInt read a TOKEN: they consume the characters of the value and stop.',
       'nextLine reads everything up to the next newline and consumes that newline.',
       'The whitespace between tokens stays in the buffer until something consumes it.',
     ]),
     ('The leftover newline', [
       'nextInt consumes the digits and leaves the newline you pressed after them.',
       'The next nextLine finds that newline immediately, so it returns the empty String without waiting.',
       'The fix is one bare nextLine whose result you throw away, placed after the last token read.',
       'A program that only uses token reads, or only line reads, can never have this problem.',
     ]),
   ],
   'worked': {
     'heading': 'A count, then that many lines',
     'code': 'import java.util.Scanner;\n\npublic class Lines\n{\n    public static void main(String[] args)\n    {\n        Scanner input = new Scanner(System.in);\n        int count = input.nextInt();\n        input.nextLine();\n\n        int totalChars = 0;\n        for (int i = 0; i < count; i++)\n        {\n            String line = input.nextLine();\n            System.out.println(line);\n            System.out.println(line.length());\n            totalChars = totalChars + line.length();\n        }\n        System.out.println(totalChars);\n    }\n}',
     'notice': [
       'input.nextLine(); on its own - discards the leftover newline.',
       'i < count - reads exactly count lines, never one more.',
       'Without that bare nextLine, the first line read would be empty.',
     ],
     'output': ['hello world', '11', 'second line', '11', '22'],
     'caption': 'Complete and runnable as shown. Two lines read after a count.',
     'stdin': '2\nhello world\nsecond line\n',
     'note': 'Delete the bare nextLine live and re-run. The first printed line becomes blank and everything '
             'shifts. That before-and-after is the lesson.',
   },
   'break_it': {
     'change': 'Remove the bare input.nextLine() after the count, and change the loop bound to i <= count.',
     'happens': 'The first line printed is empty, every real line shifts down one, and the final pass throws '
                'NoSuchElementException because it asks for a line that does not exist.',
     'why': 'Two separate bugs that compound: the leftover newline is read as an empty first line, and the loop '
            'then tries to read one more line than the input contains. Both are on tonight\'s graded debugging '
            'exercise, and the empty first line is the classic signature of the mixed-reading trap.',
     'note': 'The blank first line is the diagnostic. Once students recognize it, they fix this bug in seconds '
             'for the rest of their lives.',
   },
   'misconception': {
     'heading': 'nextInt reads the whole line',
     'think': 'I typed 3 and pressed Enter, so nextInt consumed all of it.',
     'truth': 'nextInt consumes exactly the characters that make up the number and stops. The Enter you pressed '
              'is still sitting in the buffer as a newline character, invisible but very much present. The next '
              'nextLine reads up to the next newline, finds one straight away, and hands back the empty String '
              'between them. Nothing is broken; the buffer simply contains more than you can see.',
     'note': 'Drawing the buffer with a visible newline symbol resolves this faster than any explanation.',
   },
   'discussion': [
     'Why does the bare nextLine have no variable assigned to it?',
     'Why can a program that only calls nextLine never have this bug?',
   ],
   'learned': [
     'I can read tokens and lines from a Scanner.',
     'I can explain why a nextLine after a nextInt returns an empty String.',
     'I can consume the leftover newline correctly.',
   ],
   'up_next': 'Day 2 reads until the input runs out rather than reading a fixed count.',
   'extra': 'Write a program reading a number then a line. Run it with and without the bare nextLine.',
  },
  {
   'day': 2,
   'focus': 'Reading until the input runs out',
   'schedule': [
     (5, 'Bell ringer: retrieval on the buffer'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'hasNext and unknown-length input'),
     (10, 'Worked walkthrough: read to the end, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'hasNext-driven loops are condition-driven loops from 2.7. Name the connection.',
     'A file with no records is a legitimate case and the loop must handle zero iterations.',
   ],
   'warmup': ('Retrieval on the buffer',
     'On the board, no notes: "1. What does nextInt leave behind? 2. What does the first nextLine after it '
     'return? 3. What is the one-line fix?"',
     'The newline; the empty String; a bare nextLine. If all three come back cleanly, move straight to hasNext.'),
   'objectives': [
     ('I can read input of unknown length using hasNext.', 'LO 4.6.A'),
     ('I can handle input containing no records at all.', 'LO 4.6.C'),
     ('I can accumulate values while reading.', 'LO 4.6.B'),
   ],
   'sections': [
     ('Reading to the end', [
       'hasNextInt reports whether another integer is available, so a loop can read until the input runs out.',
       'This is a condition-driven loop: the number of iterations is decided by the data, not by a counter.',
       'Empty input means zero iterations, which is correct behavior and not an error.',
     ]),
     ('Accumulating while reading', [
       'Values can be summed and counted as they are read, without storing them all first.',
       'When the count comes from the data rather than a header, an average must guard against a count of zero.',
       'Reading and processing in one pass is often simpler than reading everything into an array first.',
     ]),
   ],
   'worked': {
     'heading': 'Read to the end, guard the empty case',
     'code': 'import java.util.Scanner;\n\npublic class ReadToEnd\n{\n    public static void main(String[] args)\n    {\n        Scanner input = new Scanner(System.in);\n\n        int count = 0;\n        int total = 0;\n        while (input.hasNextInt())\n        {\n            total = total + input.nextInt();\n            count++;\n        }\n\n        System.out.println(count);\n        System.out.println(total);\n        if (count == 0)\n        {\n            System.out.println("NONE");\n        }\n        else\n        {\n            System.out.println(total / count);\n        }\n    }\n}',
     'notice': [
       'hasNextInt - the loop stops when the input runs out, however long it is.',
       'count == 0 guarded - an empty file cannot divide by zero.',
       'No array needed - values are accumulated as they arrive.',
     ],
     'output': ['4', '100', '25'],
     'caption': 'Complete and runnable as shown. Four values read with no count given in advance.',
     'stdin': '10 20 30 40\n',
     'note': 'Run it again with empty input and it prints 0, 0, NONE. Zero iterations is the correct answer, not '
             'a failure.',
   },
   'break_it': {
     'change': 'Remove the count == 0 guard and divide unconditionally.',
     'happens': 'Empty input now throws ArithmeticException: / by zero. Any input at all works perfectly, so the '
                'bug only appears on the file nobody tested with.',
     'why': 'A count that comes from the data can be zero, and dividing by it is only safe once you have checked. '
            'This is the 2.5 short-circuit guard and the 4.10 empty-list guard, met a third time: whenever the '
            'denominator is computed rather than given, guard it.',
     'note': 'Ask what input breaks it before running. Students who say "an empty file" have generalised the '
             'guard rule properly.',
   },
   'misconception': {
     'heading': 'A loop over input always runs at least once',
     'think': 'The program reads data, so the loop must execute at least one time.',
     'truth': 'A while loop tests before it does anything, so empty input means zero iterations and the program '
              'continues past the loop with its counters still at 0. That is correct behavior. The mistake is '
              'writing code after the loop that assumes it ran, such as dividing by a count that is still zero. '
              'Always ask what your code does when the loop body never executes.',
     'note': 'Same idea as 2.7 day 2. The third appearance is when it finally sticks for most students.',
   },
   'discussion': [
     'What should a program report when the input contains no records at all?',
     'Why does accumulating while reading avoid needing an array?',
   ],
   'learned': [
     'I can read input of unknown length using hasNext.',
     'I can handle input containing no records at all.',
     'I can accumulate values while reading.',
   ],
   'up_next': 'Topic 4.7 wraps primitives in objects, where == stops meaning what you expect.',
   'extra': 'Complete the graded debugging exercise for 4.6. It plants the leftover newline and an over-reading loop.',
  },
 ],
},
]
