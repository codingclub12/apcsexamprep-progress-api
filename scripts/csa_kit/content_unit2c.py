"""
AP CSA Unit 2 teacher-kit content, part 3: topics 2.8 - 2.12.

These five are where the unit gets hard and where the pacing guide gives most
of them a third day: for loops, the standard algorithms, string algorithms,
nested iteration and informal run time analysis. The break-it slides continue
to mirror seed/csa-debug-unit2.js.

No em-dashes anywhere.
"""

TOPICS = [

# ── 2.8 ──────────────────────────────────────────────────────────────────────
{
 'topic': '2.8',
 'title': 'for Loops',
 'handle': 'ap-csa-lesson-2-8-for-loops',
 'subtitle': 'The same four parts as a while loop, gathered into one header',
 'vocab': [
   ('for loop', 'A loop whose initialisation, condition and update appear together in its header.'),
   ('Loop header', 'The three parts in parentheses, separated by semicolons.'),
   ('Loop variable', 'The variable that counts the iterations, usually declared in the header.'),
   ('Scope', 'The region of code where a variable exists. A variable declared in a for header exists only inside the loop.'),
   ('Identity', 'The value that leaves an operation unchanged: 0 for addition, 1 for multiplication.'),
   ('Off by one', 'An error where a loop runs one time too many or too few.'),
 ],
 'quiz': [
   {'stem': 'In for (int i = 0; i < n; i++), when does i++ run?',
    'options': ['Before the body', 'After the body, before the next test', 'Only once', 'Before the first test'],
    'answer_index': 1,
    'why': 'The update runs at the end of each iteration, then the condition is tested again.'},
   {'stem': 'How many times does for (int i = 0; i < 5; i++) run its body?',
    'options': ['4', '5', '6', 'Depends on the body'],
    'answer_index': 1,
    'why': 'i takes 0, 1, 2, 3 and 4, which is five values.'},
   {'stem': 'A product accumulator should be initialised to:',
    'options': ['0', '1', 'The first value', 'n'],
    'answer_index': 1,
    'why': 'One is the identity for multiplication. Starting at 0 makes every product 0.'},
   {'stem': 'Where can a variable declared in a for header be used?',
    'options': ['Anywhere in the method', 'Only inside that loop', 'Only after the loop', 'Only in the header'],
    'answer_index': 1,
    'why': 'Its scope is the loop, so referring to it afterwards does not compile.'},
   {'stem': 'To count integers strictly below n, the condition should be:',
    'options': ['i <= n', 'i < n', 'i != n', 'i < n + 1'],
    'answer_index': 1,
    'why': 'Strictly below excludes n itself.'},
   {'stem': 'Which loop is preferred when the number of iterations is known in advance?',
    'options': ['while', 'for', 'Either is equally clear', 'do while'],
    'answer_index': 1,
    'why': 'The for header puts all three parts in one place, so a counting loop is easier to read and harder to get wrong.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'The for header, and translating between for and while',
   'schedule': [
     (6, 'Bell ringer: find the four parts'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'The for header, part by part'),
     (10, 'Worked example: the same loop written both ways'),
     (13, 'Accumulators and their identities'),
     (5, 'Misconception check: a product cannot start at zero'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'Write a while loop and a for loop side by side and draw arrows between the matching parts. That single '
     'diagram is the lesson.',
     'The identity idea pays off again in 4.13 and in recursion. Name it properly now.',
   ],
   'warmup': ('Find the four parts',
     'On the board, yesterday\'s while loop: "int i = 1; while (i <= n) { print(i); i++; } Circle the '
     'initialisation, the condition and the update. Two minutes."',
     'Once all three are circled, point out that they are scattered across three different lines. The for loop '
     'exists to gather them into one place, which is the entire motivation.'),
   'objectives': [
     ('I can write a for loop with a correct header and predict how many times it runs.', 'LO 2.8.A'),
     ('I can convert between an equivalent for loop and while loop.', 'LO 2.8.B'),
     ('I can initialise an accumulator to the correct identity value.', 'LO 2.8.C'),
   ],
   'sections': [
     ('The for header', [
       'A for header holds three parts separated by semicolons: initialisation, condition and update.',
       'The initialisation runs once, before anything else. The condition is tested before every iteration.',
       'The update runs at the end of each iteration, after the body and before the next test.',
       'A variable declared in the header exists only inside the loop, which prevents accidental reuse afterwards.',
     ]),
     ('Accumulators and identities', [
       'An accumulator starts at the identity for its operation: 0 for a sum because adding 0 changes nothing.',
       'For a product the identity is 1, because multiplying by 1 changes nothing. Starting at 0 forces every answer to 0.',
       'The accumulator is declared before the loop, so it survives every iteration.',
     ]),
   ],
   'worked': {
     'heading': 'The same loop, written both ways',
     'code': 'public class Both\n{\n    public static void main(String[] args)\n    {\n        int n = 5;\n\n        int sum = 0;\n        for (int i = 1; i <= n; i++)\n        {\n            sum = sum + i;\n        }\n        System.out.println(sum);\n\n        int product = 1;\n        for (int i = 1; i <= n; i++)\n        {\n            product = product * i;\n        }\n        System.out.println(product);\n    }\n}',
     'notice': [
       'sum starts at 0 - the identity for addition.',
       'product starts at 1 - the identity for multiplication.',
       'Identical headers - only the accumulator and the operation differ.',
     ],
     'output': ['15', '120'],
     'caption': 'Complete and runnable as shown. Two accumulators, two different starting values.',
     'note': 'The two loops are character for character identical except the accumulator. That makes the identity '
             'the only possible explanation for the different answers.',
   },
   'break_it': {
     'change': 'Initialise product to 0 instead of 1.',
     'happens': 'The factorial prints 0 for every input, including 5. The loop is correct, the multiplication is '
                'correct, and the answer is always zero.',
     'why': 'Zero multiplied by anything is zero, so the accumulator can never recover, no matter how many correct '
            'multiplications follow. An accumulator must start at the identity of its operation. This is on '
            'tonight\'s graded debugging exercise together with an off-by-one bound.',
     'note': 'Ask what value of n would make the buggy version correct. Only n where the true answer is 0, which '
             'is none of them. That is what makes it a total failure rather than an edge case.',
   },
   'misconception': {
     'heading': 'Accumulators always start at zero',
     'think': 'Set the running total to 0 before the loop. That is what you always do.',
     'truth': 'You start at the value that leaves the operation unchanged, and that value depends on the '
              'operation. Addition leaves things unchanged when you add 0, so sums start at 0. Multiplication '
              'leaves things unchanged when you multiply by 1, so products start at 1. A running maximum has no '
              'neutral number at all, which is why it starts from the first element of the data, as 2.9 will show.',
     'note': 'Preview the maximum case here deliberately. It makes 2.9 feel like a continuation rather than a new rule.',
   },
   'discussion': [
     'Why does a product accumulator starting at 0 give 0 for every input rather than being merely inaccurate?',
     'Rewrite for (int i = 0; i < n; i++) as a while loop. Which parts move where?',
   ],
   'learned': [
     'I can write a for loop with a correct header and predict how many times it runs.',
     'I can convert between an equivalent for loop and while loop.',
     'I can initialise an accumulator to the correct identity value.',
   ],
   'up_next': 'Day 2 concentrates on loop bounds and the off-by-one errors that live in them.',
   'extra': 'Write for loops that run exactly n times, exactly n - 1 times, and exactly once. Check each by tracing.',
  },
  {
   'day': 2,
   'focus': 'Bounds, off-by-one errors, and counting iterations exactly',
   'schedule': [
     (5, 'Bell ringer: retrieval on for headers'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Counting iterations exactly'),
     (10, 'Worked walkthrough: three bounds compared, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'The formula for iteration count is worth writing on the board and leaving there for the rest of the unit.',
     'Every bound question should be answered by counting, not by feel.',
   ],
   'warmup': ('Retrieval on for headers',
     'On the board, no notes: "How many times does each run? (a) i = 0; i < 5  (b) i = 1; i <= 5  '
     '(c) i = 0; i <= 5  (d) i = 1; i < 5"',
     'Five, five, six, four. The pattern worth naming: from a to b inclusive is b - a + 1 iterations. Write that '
     'on the board and leave it up.'),
   'objectives': [
     ('I can count exactly how many times a for loop body executes.', 'LO 2.8.A'),
     ('I can choose the bound that matches a specification exactly.', 'LO 2.8.B'),
     ('I can find an off-by-one error by testing the smallest input.', 'LO 2.8.C'),
   ],
   'sections': [
     ('Counting iterations', [
       'A loop from a up to b inclusive runs b - a + 1 times. From 1 to n inclusive is n iterations.',
       'A loop with i < n starting at 0 also runs n times, which is why that form is so common.',
       'Whenever a bound is uncertain, count the values the loop variable actually takes rather than guessing.',
     ]),
     ('Finding off-by-one errors', [
       'Test the smallest legal input first. An off-by-one is loudest when the loop should run once or zero times.',
       'Predict the number of output lines before running, then count what appears. A mismatch of exactly one is the signature.',
       'Strictly below n means i < n. Up to and including n means i <= n. Translate the words literally.',
     ]),
   ],
   'worked': {
     'heading': 'Three bounds, counted',
     'code': 'public class Bounds\n{\n    public static void main(String[] args)\n    {\n        int n = 4;\n\n        int a = 0;\n        for (int i = 0; i < n; i++)\n        {\n            a++;\n        }\n        System.out.println(a);\n\n        int b = 0;\n        for (int i = 1; i <= n; i++)\n        {\n            b++;\n        }\n        System.out.println(b);\n\n        int c = 0;\n        for (int i = 1; i < n; i++)\n        {\n            c++;\n        }\n        System.out.println(c);\n    }\n}',
     'notice': [
       'i = 0; i < n - runs n times. The most common form in Java.',
       'i = 1; i <= n - also n times, counting from one.',
       'i = 1; i < n - runs n - 1 times, which is the strictly-below case.',
     ],
     'output': ['4', '4', '3'],
     'caption': 'Complete and runnable as shown. Two forms agree, the third differs by one.',
     'note': 'Three loops with identical bodies and two different answers. Ask which of the three matches "count '
             'the integers strictly below n" before revealing the output.',
   },
   'break_it': {
     'change': 'Change the third loop from i < n to i <= n while the specification still says strictly below n.',
     'happens': 'The count goes from 3 to 4 for n = 4. One extra iteration, one wrong answer, no error message.',
     'why': 'An off-by-one is a one-character change with a one-unit consequence, which is exactly the size of '
            'mistake that survives casual testing. The defence is counting the values the loop variable takes. '
            'This is on tonight\'s graded debugging exercise together with the zero product.',
     'note': 'Point out that for n = 1 the buggy loop runs once and the correct one runs zero times, which is a '
             '100 percent error. Smallest input, loudest signal.',
   },
   'misconception': {
     'heading': 'Off-by-one errors are small errors',
     'think': 'Being off by one is nearly right, so it is a minor problem.',
     'truth': 'It is nearly right on large inputs and completely wrong on small ones. A loop that should run once '
              'and runs twice is 100 percent wrong. An index off by one does not return a slightly wrong element; '
              'it crashes or reads something unrelated. And on the exam, a trace question off by one scores zero '
              'rather than most of the marks.',
     'note': 'The size of the numeric difference is not the size of the error. Worth saying plainly.',
   },
   'discussion': [
     'How many times does for (int i = 3; i <= 7; i++) run? Show the counting rule you used.',
     'Why is testing n = 1 more informative than testing n = 100 when checking a loop bound?',
   ],
   'learned': [
     'I can count exactly how many times a for loop body executes.',
     'I can choose the bound that matches a specification exactly.',
     'I can find an off-by-one error by testing the smallest input.',
   ],
   'up_next': 'Topic 2.9 uses loops to implement the standard algorithms: maximum, minimum, count and sum.',
   'extra': 'Complete the graded debugging exercise for 2.8. It plants a zero product and an off-by-one bound.',
  },
 ],
},

# ── 2.9 ──────────────────────────────────────────────────────────────────────
{
 'topic': '2.9',
 'title': 'Implementing Selection and Iteration Algorithms',
 'handle': 'ap-csa-lesson-2-9-implementing-selection-iteration-algorithms',
 'subtitle': 'The standard algorithms: maximum, minimum, count, sum, and where each one starts',
 'vocab': [
   ('Running maximum', 'A variable holding the largest value seen so far as a loop proceeds.'),
   ('Seeding', 'Initialising an accumulator from the data itself rather than from a constant.'),
   ('Counter', 'A variable increased by one each time a condition is met.'),
   ('Traversal', 'Visiting every element of a collection exactly once.'),
   ('Edge case', 'An input at the boundary of what is allowed, such as an empty or single-element list.'),
   ('Invariant', 'A statement that stays true after every iteration of a loop.'),
 ],
 'quiz': [
   {'stem': 'Why should a running maximum be seeded from the first element rather than 0?',
    'options': ['It is faster', 'Zero may not be in the data, so all-negative input breaks',
                'Zero is not an integer', 'It avoids an infinite loop'],
    'answer_index': 1,
    'why': 'Seeding with 0 claims 0 belongs to the data. If every value is negative, no element ever beats it.'},
   {'stem': 'When a maximum is seeded from element 0, the loop should start at index:',
    'options': ['0', '1', '2', 'length - 1'],
    'answer_index': 1,
    'why': 'Element 0 has already been counted by the seed, so the scan begins at 1.'},
   {'stem': 'What does times = 1 inside a counting loop produce?',
    'options': ['The correct count', 'Always 1 when any match exists', 'Zero', 'A compile error'],
    'answer_index': 1,
    'why': 'Assignment discards everything counted so far. Accumulation needs times++.'},
   {'stem': 'A counter for a sum should start at:',
    'options': ['0', '1', 'The first element', 'It does not matter'],
    'answer_index': 0,
    'why': 'Zero is the identity for addition, and a count of nothing is zero.'},
   {'stem': 'Which input most reliably exposes a maximum seeded at 0?',
    'options': ['All positive', 'All negative', 'Mixed', 'A single element'],
    'answer_index': 1,
    'why': 'With all-negative data no element beats 0, so the reported maximum is not in the list.'},
   {'stem': 'What is a loop invariant for a correct running maximum?',
    'options': ['max is the largest of all elements', 'max is the largest of the elements seen so far',
                'max equals element 0', 'max is positive'],
    'answer_index': 1,
    'why': 'It holds after every iteration, and at the end "seen so far" is everything.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Maximum, minimum and count, and where each accumulator starts',
   'schedule': [
     (6, 'Bell ringer: find the largest without looking twice'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'The standard algorithms'),
     (10, 'Worked example: max, min and count in one pass'),
     (13, 'Seeding from the data, and why 0 is not neutral'),
     (5, 'Misconception check: zero is a safe starting point'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'The all-negative test case is the whole topic. Put it on the board and leave it there.',
     'Loop invariants sound advanced but land easily here: "max is the largest seen so far" is one sentence.',
   ],
   'warmup': ('Find the largest without looking twice',
     'On the board: "I will read out eight numbers once. Find the largest. You may write down only ONE number '
     'at a time and you may not write the list. What do you write, and when do you change it?"',
     'Everyone invents the running maximum: keep the best so far, replace it when something beats it. Ask what '
     'they wrote down BEFORE the first number. The honest answer is the first number itself, which is exactly '
     'the seeding rule the code needs.'),
   'objectives': [
     ('I can implement running maximum, minimum, count and sum with a loop.', 'LO 2.9.A'),
     ('I can seed an accumulator from the data when no neutral value exists.', 'LO 2.9.B'),
     ('I can state the loop invariant that makes an algorithm correct.', 'LO 2.9.C'),
   ],
   'sections': [
     ('The standard algorithms', [
       'A sum accumulates every value. A count accumulates one per value that meets a condition.',
       'A running maximum holds the largest value seen so far and is replaced whenever a larger one appears.',
       'All four are one traversal: visit every element exactly once and update the accumulator as you go.',
     ]),
     ('Seeding from the data', [
       'A sum can start at 0 because 0 is neutral for addition. A maximum has no neutral value at all.',
       'Seeding a maximum with 0 silently claims 0 is a member of the data, which fails whenever every value is negative.',
       'Seed the maximum with the first element, then start the scan at the second one so nothing is counted twice.',
       'The invariant is one sentence: after every iteration, max holds the largest value seen so far.',
     ]),
   ],
   'worked': {
     'heading': 'Max, min and count in one pass',
     'code': 'import java.util.Scanner;\n\npublic class Stats\n{\n    public static void main(String[] args)\n    {\n        Scanner input = new Scanner(System.in);\n        int n = input.nextInt();\n        int[] data = new int[n];\n        for (int i = 0; i < n; i++)\n        {\n            data[i] = input.nextInt();\n        }\n\n        int max = data[0];\n        int min = data[0];\n        int negatives = 0;\n        for (int i = 1; i < data.length; i++)\n        {\n            if (data[i] > max) { max = data[i]; }\n            if (data[i] < min) { min = data[i]; }\n        }\n        for (int i = 0; i < data.length; i++)\n        {\n            if (data[i] < 0) { negatives++; }\n        }\n        System.out.println(max);\n        System.out.println(min);\n        System.out.println(negatives);\n    }\n}',
     'notice': [
       'Seeded from data[0] - so an all-negative list still reports a real element.',
       'Scan starts at 1 - element 0 is already accounted for by the seed.',
       'negatives starts at 0 - a count of nothing genuinely is zero.',
     ],
     'output': ['-2', '-9', '4', '(for -5 -2 -9 -7)'],
     'caption': 'Complete and runnable as shown. Every value negative, and the answers are still in the list.',
     'stdin': '4\n-5 -2 -9 -7\n',
     'note': 'Run the all-negative case first, before the friendly one. Leading with the hard case makes the '
             'seeding rule feel necessary rather than fussy.',
   },
   'break_it': {
     'change': 'Seed max with 0 instead of data[0], and start the scan at index 0.',
     'happens': 'On the list -5 -2 -9 -7 it reports a maximum of 0, which is not in the list at all. On any list '
                'containing a positive number it is still correct, so most tests pass.',
     'why': 'Initialising to 0 asserts that 0 is a candidate. When no element beats it, the loop reports a value '
            'that was never in the data. Seed from the data itself and the bug cannot exist. This is tonight\'s '
            'graded debugging exercise, alongside a counter that assigns instead of accumulating.',
     'note': 'Ask the class for a test case that would catch it. Anyone who says "make them all negative" has '
             'learned the actual lesson, which is how to choose a test.',
   },
   'misconception': {
     'heading': 'Zero is a safe place to start any accumulator',
     'think': 'Start every accumulator at 0. It is neutral and it cannot affect the answer.',
     'truth': 'Zero is neutral for addition and for counting, and it is a claim for comparison. max = 0 asserts '
              'that 0 belongs to the data set, and every later comparison is made against that assertion. When the '
              'data is entirely negative the assertion is false and the answer is a number that never appeared. '
              'If an operation has no neutral value, seed from the data.',
     'note': 'This is the same shape as the 2.8 product bug: the wrong starting value, wrong for a different reason.',
   },
   'discussion': [
     'What does a maximum seeded at 0 report for the list -3, -8, -1? Why is that answer impossible?',
     'State the loop invariant for the minimum algorithm in one sentence.',
   ],
   'learned': [
     'I can implement running maximum, minimum, count and sum with a loop.',
     'I can seed an accumulator from the data when no neutral value exists.',
     'I can state the loop invariant that makes an algorithm correct.',
   ],
   'up_next': 'Day 2 combines the algorithms and handles ties and empty input.',
   'extra': 'Write the running maximum from memory. Then test it on an all-negative list before anything else.',
  },
  {
   'day': 2,
   'focus': 'Ties, empty input, and combining algorithms in one traversal',
   'schedule': [
     (5, 'Bell ringer: retrieval on seeding'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Ties, and first versus last occurrence'),
     (10, 'Worked walkthrough: count the maximum, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'The > versus >= tie question is a favourite exam distractor. Give it real time.',
     'Empty input is a legitimate case and students must decide what it means rather than crashing.',
   ],
   'warmup': ('Retrieval on seeding',
     'On the board, no notes: "1. Why not seed a maximum with 0? 2. If you seed from data[0], where does the '
     'scan start? 3. What is the invariant?"',
     'Index 1, and "max is the largest seen so far". If the invariant comes back cleanly, the class is ready for '
     'ties; if not, rebuild it with a quick trace first.'),
   'objectives': [
     ('I can decide whether a tie keeps the first or the last occurrence.', 'LO 2.9.B'),
     ('I can handle empty or single-element input without crashing.', 'LO 2.9.C'),
     ('I can combine several algorithms into a single traversal.', 'LO 2.9.A'),
   ],
   'sections': [
     ('Ties and occurrences', [
       'A strict > only replaces the best when a later value is genuinely larger, so ties keep the FIRST occurrence.',
       'Using >= replaces on equality too, so ties keep the LAST occurrence. Both are defensible; the spec decides.',
       'Counting how many times the maximum occurs needs a second pass, or a count reset whenever a new maximum is found.',
     ]),
     ('Edge cases', [
       'Seeding from data[0] assumes at least one element exists. Empty input must be handled before that line runs.',
       'A single element is its own maximum, minimum and only occurrence, which is a cheap and effective test.',
       'Deciding what empty input MEANS is a specification question, not a coding one.',
     ]),
   ],
   'worked': {
     'heading': 'Counting the maximum, ties included',
     'code': 'import java.util.Scanner;\n\npublic class Ties\n{\n    public static void main(String[] args)\n    {\n        Scanner input = new Scanner(System.in);\n        int n = input.nextInt();\n        int[] data = new int[n];\n        for (int i = 0; i < n; i++)\n        {\n            data[i] = input.nextInt();\n        }\n\n        int max = data[0];\n        int firstIndex = 0;\n        for (int i = 1; i < data.length; i++)\n        {\n            if (data[i] > max)\n            {\n                max = data[i];\n                firstIndex = i;\n            }\n        }\n\n        int times = 0;\n        for (int i = 0; i < data.length; i++)\n        {\n            if (data[i] == max) { times++; }\n        }\n\n        System.out.println(max);\n        System.out.println(firstIndex);\n        System.out.println(times);\n    }\n}',
     'notice': [
       'Strict > - a later equal value does not replace, so firstIndex stays at the earliest one.',
       'times++ - accumulates. times = 1 would discard every count before it.',
       'Second pass - counting occurrences needs the final maximum, so it cannot share the first loop.',
     ],
     'output': ['9', '1', '2', '(for 3 9 4 9 1)'],
     'caption': 'Complete and runnable as shown. The maximum 9 appears twice, first at index 1.',
     'stdin': '5\n3 9 4 9 1\n',
     'note': 'Change > to >= live and watch firstIndex move from 1 to 3. One character, and the program now '
             'answers a different question.',
   },
   'break_it': {
     'change': 'Replace times++ with times = 1 in the counting loop.',
     'happens': 'The count is 1 whenever the maximum appears at all, no matter how many copies exist. For 3 9 4 9 1 '
                'it reports 1 instead of 2.',
     'why': 'Assignment replaces; accumulation adds. times = 1 throws away everything counted so far on every '
            'match, so the answer is always exactly 1. This is on tonight\'s graded debugging exercise together '
            'with the maximum seeded at 0.',
     'note': 'The answer 1 looks plausible, which is what makes it dangerous. It is only obviously wrong on data '
             'with duplicates, and duplicates are what nobody tests.',
   },
   'misconception': {
     'heading': 'Greater-or-equal is the safer comparison',
     'think': 'Use >= when hunting for a maximum, because it catches equal values too and cannot miss anything.',
     'truth': 'Both find the same maximum VALUE. They differ on which POSITION they report when the value appears '
              'more than once: > keeps the first occurrence, >= keeps the last. Neither is safer; they answer '
              'different questions. Read the specification and pick the one it asked for, then test with '
              'duplicates so you can tell which one you wrote.',
     'note': 'This exact distinction is the second bug in the 4.4 debugging exercise, so it recurs in Unit 4.',
   },
   'discussion': [
     'For the list 5 5 5, which index does a > comparison report? Which does >= report?',
     'What should a maximum algorithm do with an empty list? Is there a right answer?',
   ],
   'learned': [
     'I can decide whether a tie keeps the first or the last occurrence.',
     'I can handle empty or single-element input without crashing.',
     'I can combine several algorithms into a single traversal.',
   ],
   'up_next': 'Topic 2.10 applies the same traversal thinking to the characters of a String.',
   'extra': 'Complete the graded debugging exercise for 2.9. It plants a zero-seeded maximum and an assigning counter.',
  },
 ],
},

# ── 2.10 ─────────────────────────────────────────────────────────────────────
{
 'topic': '2.10',
 'title': 'Implementing String Algorithms',
 'handle': 'ap-csa-lesson-2-10-implementing-string-algorithms',
 'subtitle': 'Traversing characters, substring boundaries, and the sentinel that indexOf returns',
 'vocab': [
   ('charAt', 'A String method returning the character at a given index.'),
   ('substring', 'A String method returning the characters from a start index up to but not including a stop index.'),
   ('indexOf', 'A String method returning the index of the first occurrence, or -1 when there is none.'),
   ('Sentinel', 'A special return value that means "not found" rather than a real result.'),
   ('Immutable', 'Unable to be changed after creation. Every String method returns a new String.'),
   ('Traversal', 'Visiting every character of a String exactly once, usually by index.'),
 ],
 'quiz': [
   {'stem': 'What does "hello".substring(1, 3) return?',
    'options': ['"ell"', '"el"', '"he"', '"llo"'],
    'answer_index': 1,
    'why': 'From index 1 up to but not including 3, so characters 1 and 2.'},
   {'stem': 'What is the length of s.substring(i, i)?',
    'options': ['1', '0', 'i', 'It throws'],
    'answer_index': 1,
    'why': 'The length is stop minus start, which is zero.'},
   {'stem': 'To get exactly one character starting at i as a String, use:',
    'options': ['substring(i, i)', 'substring(i, i + 1)', 'substring(i - 1, i)', 'charAt(i, 1)'],
    'answer_index': 1,
    'why': 'The stop index is exclusive, so it must be one past the character you want.'},
   {'stem': 'What does indexOf return when the target is absent?',
    'options': ['0', '-1', 'The length', 'It throws'],
    'answer_index': 1,
    'why': 'Negative one is a sentinel meaning not found.'},
   {'stem': 'Why is adding 1 to an indexOf result dangerous?',
    'options': ['It is always wrong', 'It turns the not-found -1 into a valid-looking index 0',
                'It overflows', 'It changes the String'],
    'answer_index': 1,
    'why': 'Arithmetic on a sentinel produces a value that reads as a genuine match at the front.'},
   {'stem': 'The last valid index of a String s is:',
    'options': ['s.length()', 's.length() - 1', 's.length() + 1', '0'],
    'answer_index': 1,
    'why': 'Indexes run from 0 to length minus 1, the same as arrays.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Traversing a String, and the exclusive stop index',
   'schedule': [
     (6, 'Bell ringer: number the letters'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'charAt, length and traversal'),
     (10, 'Worked example: print every character'),
     (13, 'substring and its exclusive stop'),
     (5, 'Misconception check: substring(i, i) is one character'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'Write the word on the board with index numbers underneath. Leave it up all lesson and point at it constantly.',
     'The stop-is-exclusive rule is the single most useful sentence in this topic.',
   ],
   'warmup': ('Number the letters',
     'On the board: "Write BANANA and number each letter, starting from 0. Now answer: what is at index 3? '
     'What is the index of the last letter? How many letters are there?"',
     'Index 3 is A, the last index is 5, and the length is 6. The gap between "last index" and "length" is the '
     'source of nearly every String bug in this unit, so make the class say both numbers out loud.'),
   'objectives': [
     ('I can traverse a String by index using charAt and length.', 'LO 2.10.A'),
     ('I can use substring with the correct start and stop indexes.', 'LO 2.10.B'),
     ('I can explain why the stop index of substring is exclusive.', 'LO 2.10.B'),
   ],
   'sections': [
     ('Traversing a String', [
       'A String is indexed from 0, so the valid indexes run from 0 to length() - 1.',
       'length() has parentheses because it is a method on a String. Arrays use a length field with no parentheses.',
       'A standard traversal is for (int i = 0; i < s.length(); i++), which visits every character exactly once.',
     ]),
     ('substring and its boundaries', [
       'substring(a, b) returns the characters from index a up to but NOT including index b.',
       'The length of the result is therefore b - a, which makes substring(i, i) the empty String.',
       'To take exactly one character starting at i, the stop index must be i + 1.',
       'substring(a) with a single argument runs from a to the end of the String.',
     ]),
   ],
   'worked': {
     'heading': 'Every character, two ways',
     'code': 'import java.util.Scanner;\n\npublic class Letters\n{\n    public static void main(String[] args)\n    {\n        Scanner input = new Scanner(System.in);\n        String word = input.next();\n\n        System.out.println(word.length());\n\n        for (int i = 0; i < word.length(); i++)\n        {\n            System.out.println(word.charAt(i));\n        }\n\n        for (int i = 0; i < word.length(); i++)\n        {\n            System.out.println(word.substring(i, i + 1));\n        }\n    }\n}',
     'notice': [
       'i < length() - the last index visited is length() - 1, which is correct.',
       'charAt(i) - returns a char. substring(i, i + 1) returns a String of length one.',
       'i + 1 - the stop is exclusive, so it has to be one past the character you want.',
     ],
     'output': ['3', 'c', 'a', 't', 'c', 'a', 't', '(for input cat)'],
     'caption': 'Complete and runnable as shown. Both loops print the same three letters.',
     'stdin': 'cat\n',
     'note': 'Two loops, identical output, different methods. Ask which one you would use if you needed to compare '
             'against another String, and the answer is substring, because char and String are different types.',
   },
   'break_it': {
     'change': 'Change substring(i, i + 1) to substring(i, i).',
     'happens': 'The second loop prints blank lines. The right number of them, in the right places, containing '
                'nothing. No exception is thrown.',
     'why': 'The stop index is exclusive, so substring(i, i) asks for the characters from i up to but not '
            'including i, which is none of them. An empty String is a perfectly legal value, so nothing complains. '
            'This is tonight\'s graded debugging exercise together with arithmetic on an indexOf sentinel.',
     'note': 'Blank output is the worst kind of bug because there is nothing to read. Point out that the loop '
             'count is still right, which is what makes it confusing.',
   },
   'misconception': {
     'heading': 'substring(i, i) gives you the character at i',
     'think': 'Both arguments are i, so it returns the one character sitting at index i.',
     'truth': 'The second argument is where to STOP, and it is not included. The length of the result is always '
              'stop minus start, so substring(i, i) has length zero. To get one character you need substring(i, i + 1). '
              'The same exclusive rule is what makes s.substring(0, s.length()) return the whole String rather '
              'than throwing.',
     'note': 'The "length is stop minus start" formula answers every substring question students will ever ask.',
   },
   'discussion': [
     'What is the length of s.substring(2, 5)? How do you know without seeing s?',
     'Why does s.substring(0, s.length()) not throw, given that length() is not a valid index?',
   ],
   'learned': [
     'I can traverse a String by index using charAt and length.',
     'I can use substring with the correct start and stop indexes.',
     'I can explain why the stop index of substring is exclusive.',
   ],
   'up_next': 'Day 2 searches inside Strings and handles the not-found case properly.',
   'extra': 'For the word BANANA, write down substring(0,3), substring(3,6), substring(2,2) and substring(4).',
  },
  {
   'day': 2,
   'focus': 'Searching, sentinels, and building new Strings',
   'schedule': [
     (5, 'Bell ringer: retrieval on substring'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'indexOf and the not-found sentinel'),
     (10, 'Worked walkthrough: count and reverse, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'The -1 sentinel is the transferable idea here. It shows up again with array search in Unit 4.',
     'Reversing by building a new String reinforces immutability without a separate lesson on it.',
   ],
   'warmup': ('Retrieval on substring',
     'On the board, no notes: "1. What is the length of substring(a, b)? 2. What does substring(i, i) return? '
     '3. What is the last valid index of a String of length 6?"',
     'b - a, the empty String, and 5. All three should be instant. If the third one is shaky, put the numbered '
     'BANANA back on the board before starting.'),
   'objectives': [
     ('I can search a String with indexOf and handle the not-found case.', 'LO 2.10.C'),
     ('I can explain why arithmetic on a sentinel value is unsafe.', 'LO 2.10.C'),
     ('I can build a new String by accumulating characters in a loop.', 'LO 2.10.A'),
   ],
   'sections': [
     ('Searching and sentinels', [
       'indexOf returns the index of the first occurrence, or -1 when the target does not appear at all.',
       'Negative one is a sentinel: a signal, not a position. It has to be tested for before it is used.',
       'Adding to a sentinel turns -1 into 0, which reads as a real match at the front of the String. Never do arithmetic on it.',
     ]),
     ('Building new Strings', [
       'Strings are immutable, so every method returns a new String and leaves the original untouched.',
       'To build a result, start with an empty String and concatenate inside the loop.',
       'Reversing a String means walking from the last index down to 0 and appending each character.',
     ]),
   ],
   'worked': {
     'heading': 'Count, search and reverse',
     'code': 'import java.util.Scanner;\n\npublic class Search\n{\n    public static void main(String[] args)\n    {\n        Scanner input = new Scanner(System.in);\n        String word = input.next();\n        String target = input.next();\n\n        System.out.println(word.indexOf(target));\n\n        int count = 0;\n        for (int i = 0; i < word.length(); i++)\n        {\n            if (word.substring(i, i + 1).equals(target))\n            {\n                count++;\n            }\n        }\n        System.out.println(count);\n\n        String reversed = "";\n        for (int i = word.length() - 1; i >= 0; i--)\n        {\n            reversed = reversed + word.charAt(i);\n        }\n        System.out.println(reversed);\n    }\n}',
     'notice': [
       'indexOf - the FIRST occurrence only, or -1 if absent.',
       'equals not == - comparing String contents, exactly as 2.6 established.',
       'length() - 1 down to 0 - the reverse traversal, ending at index 0 inclusive.',
     ],
     'output': ['1', '3', 'ananab', '(for banana, a)'],
     'caption': 'Complete and runnable as shown. First a at index 1, three of them, reversed word.',
     'stdin': 'banana a\n',
     'note': 'Run it once with a letter that is present and once with one that is not. The -1 in the second run '
             'is the whole setup for the next slide.',
   },
   'break_it': {
     'change': 'Print word.indexOf(target) + 1 instead of word.indexOf(target).',
     'happens': 'Searching banana for z now prints 0 rather than -1. Zero is a perfectly valid index, so the '
                'output claims the letter was found at the very front of the word.',
     'why': 'A sentinel is a signal, not a number to compute with. Adding 1 converts "absent" into "present at '
            'index 0", which is the most misleading possible answer. Test the sentinel before using the result. '
            'This is on tonight\'s graded debugging exercise together with the empty substring.',
     'note': 'Ask which is worse: a crash or this. This, every time, because a crash is noticed and a plausible '
             'wrong answer is not.',
   },
   'misconception': {
     'heading': 'A String method changes the String',
     'think': 'word.toUpperCase() makes word uppercase, so the variable is changed afterwards.',
     'truth': 'Strings are immutable: the characters in an existing String can never be altered. Every String '
              'method builds and returns a NEW String and leaves the original exactly as it was. If you do not '
              'assign the result to something, it is computed and discarded. The pattern is always '
              'word = word.toUpperCase(), never word.toUpperCase() on its own.',
     'note': 'This is the 1.14 debugging exercise, and repeating it here is deliberate: it is the String mistake '
             'students make most often across the whole course.',
   },
   'discussion': [
     'Why is 0 a more dangerous wrong answer than -1 when a search fails?',
     'Why must reversed be declared before the loop rather than inside it?',
   ],
   'learned': [
     'I can search a String with indexOf and handle the not-found case.',
     'I can explain why arithmetic on a sentinel value is unsafe.',
     'I can build a new String by accumulating characters in a loop.',
   ],
   'up_next': 'Topic 2.11 puts one loop inside another.',
   'extra': 'Complete the graded debugging exercise for 2.10. It plants substring(i, i) and a sentinel off by one.',
  },
 ],
},

# ── 2.11 ─────────────────────────────────────────────────────────────────────
{
 'topic': '2.11',
 'title': 'Nested Iteration',
 'handle': 'ap-csa-lesson-2-11-nested-iteration',
 'subtitle': 'A loop inside a loop, and deciding what belongs to a row rather than to the whole grid',
 'vocab': [
   ('Nested loop', 'A loop whose body contains another loop.'),
   ('Outer loop', 'The enclosing loop. One pass of it runs the inner loop to completion.'),
   ('Inner loop', 'The enclosed loop, which restarts from its initial value on every outer pass.'),
   ('Total iterations', 'For independent bounds, the product of the two counts.'),
   ('Per-row variable', 'A variable that should be reset at the start of each outer pass.'),
   ('Scope reset', 'Declaring a variable inside a loop so it is created fresh on every pass.'),
 ],
 'quiz': [
   {'stem': 'How many times does the inner body run in two nested loops each running n times?',
    'options': ['2n', 'n', 'n squared', 'n + 1'],
    'answer_index': 2,
    'why': 'The inner loop runs fully for each outer pass, so n times n.'},
   {'stem': 'A rectangle of stars needs the inner bound to be:',
    'options': ['The outer loop variable', 'The column count', 'The row count', 'One less than the row'],
    'answer_index': 1,
    'why': 'Using the outer variable produces a triangle, because the count changes per row.'},
   {'stem': 'Where should a per-row counter be declared?',
    'options': ['Before the outer loop', 'Inside the outer loop, before the inner loop',
                'Inside the inner loop', 'After both loops'],
    'answer_index': 1,
    'why': 'Declaring it there creates it fresh on every row, which is the reset.'},
   {'stem': 'What does c <= r as an inner bound produce?',
    'options': ['A rectangle', 'A triangle', 'A single row', 'An infinite loop'],
    'answer_index': 1,
    'why': 'The number of stars grows with the row index.'},
   {'stem': 'A grand total across the whole grid should be declared:',
    'options': ['Inside the inner loop', 'Inside the outer loop', 'Before the outer loop', 'After both loops'],
    'answer_index': 2,
    'why': 'It describes the whole grid, so it must survive every pass.'},
   {'stem': 'For each pass of the outer loop, the inner loop:',
    'options': ['Continues where it left off', 'Runs completely from its start value',
                'Runs once', 'Is skipped after the first time'],
    'answer_index': 1,
    'why': 'The inner initialisation runs again on every outer pass.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'How nested loops execute, and counting the total iterations',
   'schedule': [
     (6, 'Bell ringer: hours and minutes'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'How nesting executes'),
     (10, 'Worked example: draw a rectangle of stars'),
     (13, 'Where each variable belongs'),
     (5, 'Misconception check: the inner loop does not resume'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'The clock analogy does more work than any diagram. Use it and come back to it.',
     'Draw the rectangle and the triangle side by side. One bound separates them.',
   ],
   'warmup': ('Hours and minutes',
     'On the board: "A digital clock goes from 00:00 to 23:59. For each hour, how many minutes tick past? '
     'How many minute-ticks are there in a whole day? How did you work it out?"',
     '60 per hour, 1440 in a day, by multiplying. That IS nested iteration: the outer loop is the hour, the inner '
     'loop is the minute, and the total is the product. The multiplication they did instinctively is the counting '
     'rule for the rest of the lesson.'),
   'objectives': [
     ('I can trace a nested loop and count its total iterations.', 'LO 2.11.A'),
     ('I can choose the correct bound for an inner loop.', 'LO 2.11.B'),
     ('I can decide whether a variable belongs to a row or to the whole grid.', 'LO 2.11.C'),
   ],
   'sections': [
     ('How nesting executes', [
       'One pass of the outer loop runs the inner loop from its start value all the way to completion.',
       'The inner loop restarts on every outer pass. It never resumes where it stopped.',
       'When the bounds are independent, the inner body runs rows times columns in total.',
       'A statement in the outer body but outside the inner loop runs only once per row.',
     ]),
     ('Where each variable belongs', [
       'Ask what the variable describes. A grand total describes the grid, so it is declared before the outer loop.',
       'A per-row count describes one row, so it is declared inside the outer loop and created fresh each pass.',
       'Declaring a variable inside a loop IS the reset. No separate assignment back to zero is needed.',
     ]),
   ],
   'worked': {
     'heading': 'A rectangle of stars',
     'code': 'import java.util.Scanner;\n\npublic class Grid\n{\n    public static void main(String[] args)\n    {\n        Scanner input = new Scanner(System.in);\n        int rows = input.nextInt();\n        int cols = input.nextInt();\n\n        int total = 0;\n        for (int r = 0; r < rows; r++)\n        {\n            String line = "";\n            int rowCount = 0;\n            for (int c = 0; c < cols; c++)\n            {\n                line = line + "*";\n                rowCount++;\n                total++;\n            }\n            System.out.println(line);\n            System.out.println(rowCount);\n        }\n        System.out.println(total);\n    }\n}',
     'notice': [
       'c < cols - the same bound every row, which is what makes it a rectangle.',
       'rowCount inside the outer loop - born and dies with the row, so it resets automatically.',
       'total before the outer loop - describes the whole grid, so it survives every pass.',
     ],
     'output': ['****', '4', '****', '4', '****', '4', '12', '(for 3 rows, 4 cols)'],
     'caption': 'Complete and runnable as shown. Three rows of four, twelve stars in total.',
     'stdin': '3 4\n',
     'note': 'Point at the two declarations and ask what each one describes. Answering that question correctly is '
             'the entire skill of this topic.',
   },
   'break_it': {
     'change': 'Change the inner bound from c < cols to c <= r.',
     'happens': 'The rectangle becomes a triangle: rows of one, two and three stars. The program is still correct '
                'Java and still terminates.',
     'why': 'Using the OUTER loop variable in the inner bound makes the row length depend on which row you are on. '
            'That is exactly how you draw a triangle deliberately, and exactly how you break a rectangle by '
            'accident. Tonight\'s graded debugging exercise plants this along with a counter that never resets.',
     'note': 'Draw both shapes on the board before running. Predicting the triangle is more valuable than seeing it.',
   },
   'misconception': {
     'heading': 'The inner loop picks up where it left off',
     'think': 'The inner loop finished at c = cols, so on the next row it carries on from there.',
     'truth': 'The inner loop\'s initialisation runs again at the start of every outer pass, so c goes back to its '
              'start value every single row. That is why each row has the same number of stars. If it genuinely '
              'resumed, only the first row would print anything at all, which is a useful thing to imagine when '
              'checking whether you believe this.',
     'note': 'The clock analogy settles it: the minutes go back to 00 at the top of every hour.',
   },
   'discussion': [
     'How many times does the inner body run for 3 rows and 4 columns? Where does the number come from?',
     'Which variable in the rectangle program would break if it were declared in the other place?',
   ],
   'learned': [
     'I can trace a nested loop and count its total iterations.',
     'I can choose the correct bound for an inner loop.',
     'I can decide whether a variable belongs to a row or to the whole grid.',
   ],
   'up_next': 'Day 2 uses nested loops for patterns and for comparing every pair in a list.',
   'extra': 'Write nested loops that print a triangle and then a rectangle. The only difference is the inner bound.',
  },
  {
   'day': 2,
   'focus': 'Patterns, comparing every pair, and reading nested output carefully',
   'schedule': [
     (5, 'Bell ringer: retrieval on nesting'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Comparing every pair in a list'),
     (10, 'Worked walkthrough: find duplicates, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'The j = i + 1 idiom prevents comparing a value with itself and prevents counting each pair twice. Both '
     'reasons matter and students usually only hear one.',
     'This day sets up 2.12 directly: the pair count IS the operation count.',
   ],
   'warmup': ('Retrieval on nesting',
     'On the board, no notes: "1. Does the inner loop resume or restart? 2. Two loops of n, how many inner passes? '
     '3. Where does a per-row variable go?"',
     'Restart, n squared, inside the outer loop. All three are needed today, so do not move on until they are solid.'),
   'objectives': [
     ('I can use nested loops to compare every pair of elements in a list.', 'LO 2.11.A'),
     ('I can avoid comparing an element with itself and avoid double counting pairs.', 'LO 2.11.B'),
     ('I can predict the shape of nested loop output before running it.', 'LO 2.11.C'),
   ],
   'sections': [
     ('Comparing every pair', [
       'To compare every pair, the outer loop picks the first element and the inner loop picks the second.',
       'Starting the inner loop at j = i + 1 avoids comparing an element with itself.',
       'It also avoids counting each pair twice, because the pair (a, b) is then never revisited as (b, a).',
     ]),
     ('Reading the output', [
       'Predict the number of lines before running. For pairs from n elements the count is n times n - 1 divided by 2.',
       'If the output has roughly twice as many lines as expected, the inner loop probably started at 0.',
       'Nested output is hard to read by eye, so count lines rather than scanning them.',
     ]),
   ],
   'worked': {
     'heading': 'Every pair, exactly once',
     'code': 'import java.util.Scanner;\n\npublic class Pairs\n{\n    public static void main(String[] args)\n    {\n        Scanner input = new Scanner(System.in);\n        int n = input.nextInt();\n        int[] data = new int[n];\n        for (int i = 0; i < n; i++)\n        {\n            data[i] = input.nextInt();\n        }\n\n        int pairs = 0;\n        int duplicates = 0;\n        for (int i = 0; i < data.length; i++)\n        {\n            for (int j = i + 1; j < data.length; j++)\n            {\n                pairs++;\n                if (data[i] == data[j])\n                {\n                    duplicates++;\n                }\n            }\n        }\n        System.out.println(pairs);\n        System.out.println(duplicates);\n    }\n}',
     'notice': [
       'j = i + 1 - never compares an element with itself.',
       'Each pair once - (a, b) is examined, (b, a) never is.',
       '4 elements - six pairs, which is 4 times 3 divided by 2.',
     ],
     'output': ['6', '1', '(for 3 9 4 9)'],
     'caption': 'Complete and runnable as shown. Six pairs, one duplicate pair.',
     'stdin': '4\n3 9 4 9\n',
     'note': 'Have the class list the six pairs on the board before running. Matching their list against the '
             'number 6 is the check that they understand j = i + 1.',
   },
   'break_it': {
     'change': 'Change the inner loop to start at j = 0.',
     'happens': 'The pair count jumps from 6 to 16 and the duplicate count from 1 to 6. Every element is now '
                'compared with itself, and every real pair is counted twice.',
     'why': 'Starting at 0 means the inner loop revisits everything, including the element the outer loop is '
            'currently on. Every value equals itself, so the duplicate count is inflated by n as well as doubled. '
            'The j = i + 1 idiom fixes both problems at once.',
     'note': 'Work out the expected 16 and 6 on the board first. Predicting an inflated number precisely is much '
             'more convincing than noticing it is "too big".',
   },
   'misconception': {
     'heading': 'Nested loops always mean n squared work',
     'think': 'Two nested loops always run n squared times, whatever their bounds are.',
     'truth': 'Only when both bounds are independent and both run n times. When the inner loop starts at i + 1 the '
              'total is n times n - 1 divided by 2, which is about half of n squared. It still grows like n '
              'squared as n gets large, which is what 2.12 measures, but the exact count is not the same number '
              'and trace questions ask for the exact count.',
     'note': 'This is the bridge to 2.12. Say explicitly that the growth RATE and the exact count are two '
             'different questions.',
   },
   'discussion': [
     'How many pairs are there among 5 elements? Show the calculation.',
     'Why does starting the inner loop at 0 inflate the duplicate count rather than just doubling it?',
   ],
   'learned': [
     'I can use nested loops to compare every pair of elements in a list.',
     'I can avoid comparing an element with itself and avoid double counting pairs.',
     'I can predict the shape of nested loop output before running it.',
   ],
   'up_next': 'Topic 2.12 counts the work these loops do and describes how it grows.',
   'extra': 'Complete the graded debugging exercise for 2.11. It plants an outer variable as the inner bound.',
  },
 ],
},

# ── 2.12 ─────────────────────────────────────────────────────────────────────
{
 'topic': '2.12',
 'title': 'Informal Run Time Analysis',
 'handle': 'ap-csa-lesson-2-12-informal-run-time-analysis',
 'subtitle': 'Counting the work a loop does, and describing how that count grows with the input',
 'vocab': [
   ('Run time analysis', 'Reasoning about how much work an algorithm does as its input grows.'),
   ('Operation count', 'The number of times a chosen statement executes for a given input size.'),
   ('Linear growth', 'Work that roughly doubles when the input size doubles.'),
   ('Quadratic growth', 'Work that roughly quadruples when the input size doubles.'),
   ('Input size', 'The quantity, usually called n, that the amount of work depends on.'),
   ('Doubling test', 'Running with n and then 2n and comparing the counts to identify the growth.'),
 ],
 'quiz': [
   {'stem': 'A single loop over n elements does how much work?',
    'options': ['Constant', 'Linear', 'Quadratic', 'It depends on the values'],
    'answer_index': 1,
    'why': 'The body runs n times, so doubling n doubles the work.'},
   {'stem': 'Two independent nested loops over n elements do how much work?',
    'options': ['Linear', 'Quadratic', 'Constant', '2n'],
    'answer_index': 1,
    'why': 'The inner body runs n times for each of n outer passes.'},
   {'stem': 'When n doubles and the count quadruples, the growth is:',
    'options': ['Linear', 'Quadratic', 'Constant', 'Impossible to say'],
    'answer_index': 1,
    'why': 'Quadrupling on a doubled input is the signature of quadratic growth.'},
   {'stem': 'A counter incremented in the outer body of a nested loop measures:',
    'options': ['The inner work', 'The outer passes only', 'The total work', 'Nothing'],
    'answer_index': 1,
    'why': 'Statements in the outer body run once per outer pass, so the count is n, not n squared.'},
   {'stem': 'Comparing n items pairwise with j = i + 1 gives how many comparisons?',
    'options': ['n', 'n squared', 'n times n - 1 over 2', 'n - 1'],
    'answer_index': 2,
    'why': 'Each unordered pair is examined exactly once.'},
   {'stem': 'Which statement is the fairest thing to count?',
    'options': ['Every line', 'The statement inside the innermost loop',
                'Only assignments', 'The method calls'],
    'answer_index': 1,
    'why': 'The innermost statement dominates the total as n grows.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Counting operations, and the doubling test',
   'schedule': [
     (6, 'Bell ringer: how much longer for twice as much'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Counting the work'),
     (10, 'Worked example: instrument a loop with a counter'),
     (13, 'The doubling test'),
     (5, 'Misconception check: where the counter goes'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'Instrumenting real code with a counter beats any amount of talking about growth rates. Run it.',
     'Keep the numbers small enough to verify by hand. n = 4 and n = 8 is plenty.',
   ],
   'warmup': ('How much longer for twice as much',
     'On the board: "Reading every name on a class list of 30 takes a minute. How long for 60? Now: comparing '
     'every pair of names to find duplicates takes a minute for 30. How long for 60? Guess, then explain."',
     'Two minutes, and about four minutes. The second one surprises people, and that surprise is the entire '
     'motivation for the topic. Doubling the input did not double the work.'),
   'objectives': [
     ('I can count how many times a statement executes for a given input size.', 'LO 2.12.A'),
     ('I can identify linear and quadratic growth from a count.', 'LO 2.12.B'),
     ('I can use a doubling test to classify an algorithm informally.', 'LO 2.12.C'),
   ],
   'sections': [
     ('Counting the work', [
       'Run time analysis is counting: pick a statement and work out how many times it runs for input size n.',
       'A statement inside a single loop over n elements runs n times. That is linear growth.',
       'A statement inside two nested loops each over n elements runs n squared times. That is quadratic growth.',
       'Count the innermost statement, because as n grows it dominates everything else.',
     ]),
     ('The doubling test', [
       'Run the algorithm with n, then with 2n, and compare the two counts.',
       'A count that roughly doubles indicates linear growth. A count that roughly quadruples indicates quadratic.',
       'This is an informal test and it is enough for this course, and it catches the mistake of counting in the wrong place.',
     ]),
   ],
   'worked': {
     'heading': 'Instrument the loops and read the numbers',
     'code': 'import java.util.Scanner;\n\npublic class Count\n{\n    public static void main(String[] args)\n    {\n        Scanner input = new Scanner(System.in);\n        int n = input.nextInt();\n\n        int single = 0;\n        for (int i = 0; i < n; i++)\n        {\n            single++;\n        }\n        System.out.println(single);\n\n        int nested = 0;\n        for (int i = 0; i < n; i++)\n        {\n            for (int j = 0; j < n; j++)\n            {\n                nested++;\n            }\n        }\n        System.out.println(nested);\n    }\n}',
     'notice': [
       'single++ - inside one loop, so the count is n.',
       'nested++ - inside the INNER loop, so the count is n squared.',
       'Position decides - the same statement in the outer body would count only n.',
     ],
     'output': ['5', '25', '(for n = 5)'],
     'caption': 'Complete and runnable as shown. Five and twenty five.',
     'stdin': '5\n',
     'note': 'Run n = 5 then n = 10. Single goes 5 to 10, nested goes 25 to 100. Doubled versus quadrupled, '
             'measured rather than asserted.',
   },
   'break_it': {
     'change': 'Move nested++ out of the inner loop and into the outer loop body.',
     'happens': 'The nested count drops from 25 to 5 for n = 5. Run the doubling test and it now doubles instead '
                'of quadrupling, so genuinely quadratic code reports itself as linear.',
     'why': 'A statement in the outer body runs once per outer pass, not once per inner pass. Where you put the '
            'counter decides which quantity you are measuring, and measuring the wrong one produces a confident '
            'and wrong conclusion. This is tonight\'s graded debugging exercise.',
     'note': 'This is the most important slide in the topic. The code still LOOKS nested, and the number says '
             'linear. Trusting the number over the shape is the mistake.',
   },
   'misconception': {
     'heading': 'The shape of the code tells you the growth',
     'think': 'It has two nested loops, so it is quadratic. I do not need to count anything.',
     'truth': 'The shape is a strong hint and it is not a proof. An inner loop that runs a fixed number of times, '
              'or one that starts at i + 1, or a counter placed in the wrong body, all change the answer. Count '
              'the statement you care about and run the doubling test. When the shape and the number disagree, '
              'one of them is a bug, and finding out which is the whole exercise.',
     'note': 'Connect back to 2.11: pairwise comparison is nested and does about half of n squared work.',
   },
   'discussion': [
     'A nested loop reports counts of 5 and 10 for n = 5 and n = 10. What does that tell you, and what would you check?',
     'Why is the innermost statement the fairest thing to count?',
   ],
   'learned': [
     'I can count how many times a statement executes for a given input size.',
     'I can identify linear and quadratic growth from a count.',
     'I can use a doubling test to classify an algorithm informally.',
   ],
   'up_next': 'Day 2 compares algorithms that solve the same problem with different amounts of work.',
   'extra': 'Predict the count for a nested loop where the inner bound is 3 rather than n. Then check it.',
  },
  {
   'day': 2,
   'focus': 'Comparing algorithms, and why growth matters more than speed',
   'schedule': [
     (5, 'Bell ringer: retrieval on counting'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Two algorithms for one problem'),
     (10, 'Worked walkthrough: duplicate detection two ways, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Growth beats constant factors at scale. A slower-per-step linear algorithm wins eventually, every time.',
     'This is the last topic of the unit. Leave five minutes to preview the unit test.',
   ],
   'warmup': ('Retrieval on counting',
     'On the board, no notes: "1. A statement in one loop over n runs how many times? 2. In two nested loops? '
     '3. If doubling n quadruples the count, what is the growth?"',
     'n, n squared, quadratic. These three answers are the whole topic, and if they come back cleanly the class '
     'is ready to compare algorithms rather than single loops.'),
   'objectives': [
     ('I can compare two algorithms that solve the same problem by counting their work.', 'LO 2.12.B'),
     ('I can explain why growth rate matters more than the speed of a single step.', 'LO 2.12.C'),
     ('I can count operations for a loop whose inner bound depends on the outer variable.', 'LO 2.12.A'),
   ],
   'sections': [
     ('Two algorithms, one problem', [
       'The same problem can often be solved with different amounts of work, and the counts make the difference visible.',
       'Checking for any duplicate by comparing every pair is quadratic. Checking a sorted list by comparing neighbours is linear.',
       'When two algorithms give the same answers, the one that grows more slowly is the better one at scale.',
     ]),
     ('Growth beats constants', [
       'A quadratic algorithm may be faster than a linear one for small inputs, and it will lose as n grows.',
       'Doubling the input doubles linear work and quadruples quadratic work, and that gap widens without limit.',
       'A pairwise loop starting at i + 1 does about half of n squared comparisons, which is still quadratic growth.',
     ]),
   ],
   'worked': {
     'heading': 'Duplicate detection, two ways',
     'code': 'public class Compare\n{\n    public static void main(String[] args)\n    {\n        int n = 6;\n        int[] sorted = {1, 2, 3, 4, 5, 5};\n\n        int pairwise = 0;\n        for (int i = 0; i < n; i++)\n        {\n            for (int j = i + 1; j < n; j++)\n            {\n                pairwise++;\n            }\n        }\n        System.out.println(pairwise);\n\n        int neighbours = 0;\n        for (int i = 1; i < n; i++)\n        {\n            neighbours++;\n        }\n        System.out.println(neighbours);\n    }\n}',
     'notice': [
       'pairwise - 15 comparisons, which is 6 times 5 divided by 2.',
       'neighbours - 5 comparisons, one fewer than the number of items.',
       'Same answer - both detect the duplicate 5, at very different cost.',
     ],
     'output': ['15', '5'],
     'caption': 'Complete and runnable as shown. Both find the duplicate; one does three times the work.',
     'note': 'Ask what the two counts would be for n = 12. Pairwise goes to 66, neighbours to 11. The gap widens, '
             'which is the point about growth rather than the point about 15 versus 5.',
   },
   'break_it': {
     'change': 'Change the pairwise inner loop to start at j = 0 instead of j = i + 1.',
     'happens': 'The count rises from 15 to 36. The algorithm still finds the duplicate, and it now does more than '
                'twice the work to reach the same answer.',
     'why': 'Starting at 0 compares every element with itself and examines every pair twice. The growth is '
            'quadratic either way, so the doubling test looks identical, but the constant factor doubled for no '
            'benefit at all. Growth is not the only thing worth measuring.',
     'note': 'Useful nuance to end the unit on: two algorithms can share a growth rate and still differ in real '
             'cost, and counting is what shows it.',
   },
   'misconception': {
     'heading': 'The faster algorithm is the one that finishes first today',
     'think': 'I timed both on my list of ten items and the quadratic one was quicker, so it is the better choice.',
     'truth': 'At small n almost anything is fast, and the constant factors dominate. The question run time '
              'analysis asks is what happens as n grows: doubling the input doubles linear work and quadruples '
              'quadratic work, so the linear algorithm overtakes and then wins by an ever-larger margin. Choosing '
              'based on a ten-item test is choosing based on the one case where the difference does not matter.',
     'note': 'This closes the unit well: measure the growth, not the stopwatch.',
   },
   'discussion': [
     'For n = 12, how many pairwise comparisons are there? How many neighbour comparisons?',
     'When might you legitimately choose the quadratic algorithm anyway?',
   ],
   'learned': [
     'I can compare two algorithms that solve the same problem by counting their work.',
     'I can explain why growth rate matters more than the speed of a single step.',
     'I can count operations for a loop whose inner bound depends on the outer variable.',
   ],
   'up_next': 'The Unit 2 test covers selection, iteration, the standard algorithms and run time analysis.',
   'extra': 'Complete the graded debugging exercise for 2.12. It plants a counter one block too high.',
  },
 ],
},
]
