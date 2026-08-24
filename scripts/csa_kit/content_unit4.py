"""
AP CSA Unit 4 teacher-kit content, part 1: topics 4.1 - 4.6.

Unit 4 is the largest unit in the course (17 topics) and carries the back half
of the exam. Same schema and rules as Units 2 and 3; break-it and misconception
slides mirror the graded debugging exercises in seed/csa-debug-unit4.js.

WHAT THIS UNIT KEEPS RE-TEACHING
Almost every bug in Unit 4 is an index bug wearing a new costume: length versus
last index, an exclusive bound, a traversal that writes to a copy, a bound taken
from the wrong dimension. The slides name that pattern out loud rather than
treating each topic as unrelated, because a student who sees the pattern once
stops meeting it seventeen times.

No em-dashes anywhere.
"""

TOPICS = [

# ── 4.1 ──────────────────────────────────────────────────────────────────────
{
 'topic': '4.1',
 'title': 'Ethical and Social Issues Around Data Collection',
 'handle': 'ap-csa-lesson-4-1-ethical-social-issues-data-collection',
 'subtitle': 'What a data set reveals, and what an aggregate does not hide',
 'vocab': [
   ('Aggregate', 'A summary computed over many records, such as a count or an average.'),
   ('Personally identifiable information', 'Data that can be traced back to a specific individual.'),
   ('Re-identification', 'Working out who a record belongs to from data that was meant to be anonymous.'),
   ('Suppression', 'Refusing to publish a statistic when the group is too small to protect anyone.'),
   ('Minimum group size', 'The smallest number of records a statistic may be computed over and still be published.'),
   ('Data minimisation', 'Collecting only what the task actually requires.'),
 ],
 'quiz': [
   {'stem': 'An average computed over a single response is:',
    'options': ['Anonymous', 'That person\'s answer, relabelled', 'More accurate', 'Invalid arithmetic'],
    'answer_index': 1,
    'why': 'With one record the mean equals the value, so nothing is hidden.'},
   {'stem': 'Publishing a count of how many people responded is:',
    'options': ['A disclosure', 'Generally safe, since it says nothing about any individual',
                'Always forbidden', 'The same as publishing the records'],
    'answer_index': 1,
    'why': 'Knowing six people answered reveals nothing about what any one said.'},
   {'stem': 'Suppression means:',
    'options': ['Deleting the data', 'Refusing to publish a statistic over too small a group',
                'Encrypting the file', 'Rounding the answer'],
    'answer_index': 1,
    'why': 'The statistic is withheld, not the underlying data destroyed.'},
   {'stem': 'Which is the strongest reason to avoid storing free text students type?',
    'options': ['It uses space', 'It can contain identifying information no schema anticipated',
                'It is slow', 'It cannot be indexed'],
    'answer_index': 1,
    'why': 'Free text can carry names and details the designers never planned for.'},
   {'stem': 'Re-identification is possible when:',
    'options': ['Data is encrypted', 'Combined fields narrow a record to one person',
                'Records are counted', 'Averages are rounded'],
    'answer_index': 1,
    'why': 'Several non-identifying fields together can single someone out.'},
   {'stem': 'Data minimisation says you should:',
    'options': ['Collect everything and filter later', 'Collect only what the task requires',
                'Compress the data', 'Store one file per user'],
    'answer_index': 1,
    'why': 'Data never collected cannot leak.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'What a data set reveals, and when an aggregate stops protecting anyone',
   'schedule': [
     (6, 'Bell ringer: identify the person'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Aggregates, and where they stop hiding'),
     (10, 'Worked example: suppress a small group'),
     (13, 'Re-identification and data minimisation'),
     (5, 'Misconception check: an average is always anonymous'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'This topic is examinable and it is also the one students find most immediately real. Let the discussion run.',
     'Ground it in this site: we store no free text anywhere except the sandbox, on purpose. Say why.',
   ],
   'warmup': ('Identify the person',
     'On the board: "A survey publishes the average score for every group. One group has three people, another '
     'has one. Which averages tell you about an individual? What is the smallest group you would publish?"',
     'The group of one is that person\'s answer with a new label. Push for the smallest safe size and let them '
     'argue: the point is that there IS a threshold and somebody has to choose it, not that 2 is magic.'),
   'objectives': [
     ('I can explain what an aggregate hides and when it stops hiding it.', 'LO 4.1.A'),
     ('I can identify when a statistic should be suppressed rather than published.', 'LO 4.1.B'),
     ('I can explain data minimisation and why it reduces risk.', 'LO 4.1.C'),
   ],
   'sections': [
     ('Aggregates and their limits', [
       'An aggregate summarises many records, so no single record should be recoverable from it.',
       'That protection fails as the group shrinks. An average over one person IS that person\'s value.',
       'Real data releases set a minimum group size and suppress any statistic computed over fewer records.',
       'A count of responses is generally safe to publish, because it says nothing about what anyone answered.',
     ]),
     ('Re-identification and minimisation', [
       'Several fields that identify nobody on their own can identify somebody together.',
       'Free text is especially risky, because it can carry names and details no schema anticipated.',
       'Data minimisation is the strongest defence available: data never collected cannot leak.',
     ]),
   ],
   'worked': {
     'heading': 'Suppress the group that is too small',
     'code': 'import java.util.Scanner;\n\npublic class Survey\n{\n    public static void main(String[] args)\n    {\n        Scanner input = new Scanner(System.in);\n        int n = input.nextInt();\n        int[] responses = new int[n];\n        int total = 0;\n        for (int i = 0; i < n; i++)\n        {\n            responses[i] = input.nextInt();\n            total = total + responses[i];\n        }\n\n        System.out.println(n);\n        if (n < 2)\n        {\n            System.out.println("SUPPRESSED");\n        }\n        else\n        {\n            System.out.println(total / n);\n        }\n    }\n}',
     'notice': [
       'The count is published - it identifies nobody.',
       'n < 2 is suppressed - an average over one person is that person.',
       'No individual response is ever printed.',
     ],
     'output': ['1', 'SUPPRESSED'],
     'caption': 'Complete and runnable as shown. Input is one response, so the average is withheld.',
     'stdin': '1\n7\n',
     'note': 'Run the single-response case first. Seeing SUPPRESSED where students expected 7 is the argument.',
   },
   'break_it': {
     'change': 'Remove the suppression and also print responses[0] so you can "check the data looks right".',
     'happens': 'A group of one now publishes that person\'s exact answer twice: once as a raw record and once '
                'labelled as the group average. Both lines look like ordinary reporting.',
     'why': 'A debugging print left in is a disclosure in a program that handles other people\'s data, and an '
            'average over one record is not an aggregate at all. Both are on tonight\'s graded debugging '
            'exercise, which is the only one in the course where the bug is an ethical failure rather than a '
            'wrong number.',
     'note': 'Ask what a code review would have to catch. Not a crash and not a wrong answer, which is exactly '
             'why privacy bugs survive review.',
   },
   'misconception': {
     'heading': 'An average is always anonymous',
     'think': 'Averages summarise groups, so publishing one can never reveal an individual.',
     'truth': 'It depends entirely on the group size. Over a thousand people an average reveals almost nothing '
              'about any one of them. Over one person it reveals everything, because the mean of one number is '
              'that number. Somewhere between those, protection fades out gradually rather than switching off, '
              'which is why real releases set a minimum group size in advance instead of judging case by case.',
     'note': 'This is the examinable idea, and it is also why this site publishes class averages and never '
             'per-student ones outside a teacher\'s own gradebook.',
   },
   'discussion': [
     'A class of 30 publishes averages by year group. One year group has two students. What should be published?',
     'Why is free text riskier to store than a multiple choice answer?',
   ],
   'learned': [
     'I can explain what an aggregate hides and when it stops hiding it.',
     'I can identify when a statistic should be suppressed rather than published.',
     'I can explain data minimisation and why it reduces risk.',
   ],
   'up_next': 'Day 2 looks at bias in data sets and at who is missing from them.',
   'extra': 'Find a published statistic online and work out how small its smallest reported group is.',
  },
  {
   'day': 2,
   'focus': 'Bias, missing people, and the limits of a data set',
   'schedule': [
     (5, 'Bell ringer: retrieval on suppression'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Who is missing from the data'),
     (10, 'Worked walkthrough: a biased sample, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Bias is easiest to teach through a concrete sample that obviously excludes someone. Use a school example.',
     'Connect to the code: a program cannot detect that its input was collected badly.',
   ],
   'warmup': ('Retrieval on suppression',
     'On the board, no notes: "1. Why is an average over one person not anonymous? 2. Is a count of responses '
     'safe to publish? 3. What is data minimisation?"',
     'Because the mean of one value is that value; generally yes; collect only what you need. All three should '
     'be quick, and the third is the one students find genuinely new.'),
   'objectives': [
     ('I can identify who a data set excludes and how that biases conclusions.', 'LO 4.1.B'),
     ('I can explain why a program cannot detect that its input was badly collected.', 'LO 4.1.C'),
     ('I can state a limitation of a conclusion drawn from a data set.', 'LO 4.1.A'),
   ],
   'sections': [
     ('Who is missing', [
       'Every data set has people who are not in it, and they are invisible in the results.',
       'A survey answered only by people with time to answer describes people with time to answer.',
       'A conclusion is only about the population that was actually sampled, whatever the headline says.',
     ]),
     ('What a program cannot know', [
       'Code computes correctly over whatever it is given. It cannot tell that the collection was skewed.',
       'A perfectly correct average over a biased sample is a perfectly correct answer to the wrong question.',
       'Stating the limitation alongside the number is part of reporting honestly.',
     ]),
   ],
   'worked': {
     'heading': 'A correct average over a skewed sample',
     'code': 'public class Sample\n{\n    public static void main(String[] args)\n    {\n        int[] respondents = {95, 92, 98, 90, 96};\n        int invited = 200;\n\n        int total = 0;\n        for (int score : respondents)\n        {\n            total = total + score;\n        }\n\n        System.out.println(respondents.length);\n        System.out.println(invited);\n        System.out.println(total / respondents.length);\n        System.out.println(respondents.length * 100 / invited);\n    }\n}',
     'notice': [
       'The average is computed correctly - the arithmetic is not the problem.',
       'Five responses from two hundred invited is a response rate of 2 percent.',
       'Reporting the rate alongside the average is what makes the number honest.',
     ],
     'output': ['5', '200', '94', '2'],
     'caption': 'Complete and runnable as shown. A correct average over five of two hundred people.',
     'note': 'Ask whether the program has a bug. It does not, and the conclusion "our students average 94" would '
             'still be wrong. That gap is the whole lesson.',
   },
   'break_it': {
     'change': 'Delete the two lines that print the response count and the response rate, keeping only the average.',
     'happens': 'The output is now a single confident number, 94, with nothing indicating it came from five people '
                'out of two hundred. Every line that remains is correct.',
     'why': 'Removing context does not change any computed value and completely changes what the reader believes. '
            'Honest reporting is a property of what you publish, not only of what you compute. This is the one '
            'topic where the bug lives in the presentation rather than the arithmetic.',
     'note': 'Good closing question: which version would you rather your own school published about you?',
   },
   'misconception': {
     'heading': 'Correct code produces trustworthy conclusions',
     'think': 'The program has no bugs, so the number it prints can be trusted.',
     'truth': 'Correctness and trustworthiness are different properties. Code answers exactly the question its '
              'input encodes, and it has no way to know that the input excludes most of the population. A flawless '
              'average over a 2 percent response rate is a flawless answer about those 2 percent. Testing finds '
              'bugs in the computation; only thinking about collection finds bugs in the conclusion.',
     'note': 'Ties the whole course together: 1.1 said compiling does not prove correct, and this says correct '
             'does not prove meaningful.',
   },
   'discussion': [
     'A club survey is answered only by members who attend meetings. What conclusion can it support?',
     'Why can a program not detect that its input was collected badly?',
   ],
   'learned': [
     'I can identify who a data set excludes and how that biases conclusions.',
     'I can explain why a program cannot detect that its input was badly collected.',
     'I can state a limitation of a conclusion drawn from a data set.',
   ],
   'up_next': 'Topic 4.2 starts working with the data structures themselves.',
   'extra': 'Complete the graded debugging exercise for 4.1. It plants a leaked record and an unsuppressed average.',
  },
 ],
},

# ── 4.2 ──────────────────────────────────────────────────────────────────────
{
 'topic': '4.2',
 'title': 'Introduction to Using Data Sets',
 'handle': 'ap-csa-lesson-4-2-introduction-to-using-data-sets',
 'subtitle': 'The enhanced for loop, what it is for, and the one thing it cannot do',
 'vocab': [
   ('Enhanced for loop', 'A loop that visits every element of a collection in order, without an index.'),
   ('Loop variable copy', 'The enhanced for variable holds a copy of the element, not the slot itself.'),
   ('Indexed loop', 'A loop using an index variable, which can both read and write elements.'),
   ('Traversal', 'Visiting every element of a collection exactly once.'),
   ('Read-only traversal', 'A traversal that inspects elements without changing them.'),
   ('Element', 'One value stored in a collection.'),
 ],
 'quiz': [
   {'stem': 'Assigning to the loop variable of an enhanced for loop:',
    'options': ['Changes the array', 'Changes only a copy', 'Fails to compile', 'Changes the next element'],
    'answer_index': 1,
    'why': 'The variable holds a copy of the element.'},
   {'stem': 'To double every element of an array you must use:',
    'options': ['An enhanced for loop', 'An indexed loop assigning to data[i]', 'A while loop only', 'Either'],
    'answer_index': 1,
    'why': 'Only data[i] = ... reaches the array.'},
   {'stem': 'The rule worth memorising is:',
    'options': ['Enhanced for to write, indexed to read', 'Enhanced for to read, indexed to write',
                'Always use indexed', 'Always use enhanced for'],
    'answer_index': 1,
    'why': 'Enhanced for cannot write back; indexed can do both.'},
   {'stem': 'In for (int i = 0; i < data.length; i++), i is:',
    'options': ['An element', 'A position', 'The length', 'A copy of an element'],
    'answer_index': 1,
    'why': 'The index is a position; data[i] is the value.'},
   {'stem': 'Comparing the index against a value threshold is:',
    'options': ['A compile error', 'Type-correct but meaningless', 'Correct', 'Faster'],
    'answer_index': 1,
    'why': 'Both are ints, so it compiles, and it compares a position to a value.'},
   {'stem': 'Which is the best reason to prefer an enhanced for loop when reading?',
    'options': ['It is faster', 'It cannot go out of bounds or use the wrong index',
                'It works on more types', 'It is required by the exam'],
    'answer_index': 1,
    'why': 'Removing the index removes a whole class of bugs.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Both loop forms, and which one can write',
   'schedule': [
     (6, 'Bell ringer: predict the output'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'The enhanced for loop'),
     (10, 'Worked example: read with one, write with the other'),
     (13, 'Index versus element'),
     (5, 'Misconception check: the loop variable is the element'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'The doubling demo is the whole lesson. Predict, run, explain, in that order.',
     'Say the rule as a slogan: enhanced for to read, indexed for to write. They will repeat it back all year.',
   ],
   'warmup': ('Predict the output',
     'On the board: "int[] data = {1, 2, 3}; for (int v : data) { v = v * 2; } then print every element. '
     'Write down what you expect before we run it."',
     'They will say 2 4 6 and it prints 1 2 3. Collect the prediction in writing first, because the surprise is '
     'what makes the copy semantics memorable.'),
   'objectives': [
     ('I can traverse an array with an enhanced for loop.', 'LO 4.2.A'),
     ('I can explain why an enhanced for loop cannot modify the array.', 'LO 4.2.B'),
     ('I can choose the right loop form for reading and for writing.', 'LO 4.2.C'),
   ],
   'sections': [
     ('The enhanced for loop', [
       'An enhanced for loop visits every element in order without an index, which removes index bugs entirely.',
       'The loop variable holds a COPY of each element, not the slot it came from.',
       'Assigning to that variable changes the copy and the array is untouched, silently.',
       'The rule: enhanced for to READ, indexed for to WRITE.',
     ]),
     ('Index versus element', [
       'In an indexed loop, i is a POSITION and data[i] is the VALUE at that position.',
       'Both are ints, so comparing the index against a value threshold compiles and means nothing.',
       'Naming the loop variable well makes that mistake visible while you are writing it.',
     ]),
   ],
   'worked': {
     'heading': 'Read with one, write with the other',
     'code': 'public class Both\n{\n    public static void main(String[] args)\n    {\n        int[] data = {1, 5, 9, 2};\n        int threshold = 8;\n\n        for (int i = 0; i < data.length; i++)\n        {\n            data[i] = data[i] * 2;\n        }\n\n        for (int value : data)\n        {\n            System.out.println(value);\n        }\n\n        int above = 0;\n        for (int value : data)\n        {\n            if (value > threshold)\n            {\n                above++;\n            }\n        }\n        System.out.println(above);\n    }\n}',
     'notice': [
       'Indexed loop doubles - data[i] = ... reaches the array.',
       'Enhanced for prints - reading only, so it is the right choice.',
       'Enhanced for counts - compares the VALUE, not the position.',
     ],
     'output': ['2', '10', '18', '4', '2'],
     'caption': 'Complete and runnable as shown. Doubled, printed, then counted above 8: only 10 and 18 qualify.',
     'note': 'Three loops, two forms, and each form doing what it is good at. That contrast is the slide.',
   },
   'break_it': {
     'change': 'Replace the doubling loop with an enhanced for loop that assigns to the loop variable.',
     'happens': 'The array prints unchanged: 1, 5, 9, 2. The doubling line is right there in the code and had no '
                'effect whatsoever.',
     'why': 'The loop variable is a copy of the element. Writing to it updates the copy, which is discarded at '
            'the end of the iteration. Only data[i] = ... reaches the array. Tonight\'s graded debugging exercise '
            'plants this together with a comparison against the index instead of the element.',
     'note': 'This is the single most predicted-wrong demonstration in Unit 4. Always collect the prediction '
             'before running it.',
   },
   'misconception': {
     'heading': 'The loop variable IS the element',
     'think': 'for (int v : data) gives me each element, so changing v changes the array.',
     'truth': 'It gives you a copy of each element. The copy has the right value and no connection back to the '
              'slot it came from, so assigning to it is like writing on a photocopy: legal, silent and useless. '
              'This is not a limitation to work around; it is why the enhanced for loop is safe for reading, '
              'because it cannot damage the array by accident.',
     'note': 'Frame the restriction as a feature. It changes how students feel about a rule that otherwise seems '
             'arbitrary.',
   },
   'discussion': [
     'Why does assigning to an enhanced for loop variable not change the array?',
     'When is an enhanced for loop the better choice, and why?',
   ],
   'learned': [
     'I can traverse an array with an enhanced for loop.',
     'I can explain why an enhanced for loop cannot modify the array.',
     'I can choose the right loop form for reading and for writing.',
   ],
   'up_next': 'Topic 4.3 creates arrays and looks at what their indexes really are.',
   'extra': 'Write both loop forms over the same array: one printing, one doubling. Confirm which one changes it.',
  },
  {
   'day': 2,
   'focus': 'Choosing the loop form from the task',
   'schedule': [
     (5, 'Bell ringer: retrieval on loop forms'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Reading tasks and writing tasks'),
     (10, 'Worked walkthrough: three tasks, three choices, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Have students state "read" or "write" before writing any loop. The habit prevents the bug.',
     'Tasks needing the index itself (positions, pairs) also need the indexed form. Name that third case.',
   ],
   'warmup': ('Retrieval on loop forms',
     'On the board, no notes: "1. What does the enhanced for variable hold? 2. Which form can change the array? '
     '3. What is the slogan?"',
     'A copy; the indexed form; enhanced for to read, indexed for to write. If the slogan comes back verbatim, '
     'the lesson has landed.'),
   'objectives': [
     ('I can decide which loop form a task needs before writing it.', 'LO 4.2.C'),
     ('I can identify tasks that require the index itself.', 'LO 4.2.A'),
     ('I can write both forms correctly over the same data.', 'LO 4.2.B'),
   ],
   'sections': [
     ('Reading tasks and writing tasks', [
       'If the task only inspects values, use the enhanced for loop: it cannot go out of bounds or use a wrong index.',
       'If the task changes elements, the indexed form is required, because only data[i] reaches the array.',
       'If the task needs to know WHERE something is, the indexed form is required too, because the position is the answer.',
     ]),
     ('Naming and clarity', [
       'Name the enhanced for variable after the thing it holds, such as score or value, never i.',
       'Reserve i for indexes. That convention alone prevents comparing a position against a value.',
       'State read or write out loud before choosing the form, and the choice makes itself.',
     ]),
   ],
   'worked': {
     'heading': 'Three tasks, three choices',
     'code': 'public class Choose\n{\n    public static void main(String[] args)\n    {\n        int[] scores = {70, 85, 60, 95};\n\n        int total = 0;\n        for (int score : scores)\n        {\n            total = total + score;\n        }\n        System.out.println(total);\n\n        for (int i = 0; i < scores.length; i++)\n        {\n            scores[i] = scores[i] + 5;\n        }\n\n        int bestIndex = 0;\n        for (int i = 1; i < scores.length; i++)\n        {\n            if (scores[i] > scores[bestIndex])\n            {\n                bestIndex = i;\n            }\n        }\n        System.out.println(bestIndex);\n        System.out.println(scores[bestIndex]);\n    }\n}',
     'notice': [
       'Summing reads only - enhanced for.',
       'Adding 5 writes - indexed, because the array must change.',
       'Finding WHERE the best is needs the position - indexed again.',
     ],
     'output': ['310', '3', '100'],
     'caption': 'Complete and runnable as shown. Read, write, and locate.',
     'note': 'Ask which of the three could be written the other way. Only the first, and doing so would gain '
             'nothing and risk an index bug.',
   },
   'break_it': {
     'change': 'Rewrite the bestIndex search as an enhanced for loop over the values.',
     'happens': 'It can find the best VALUE and cannot report where it is. The position is simply not available '
                'inside the loop, so the task cannot be completed in that form.',
     'why': 'The enhanced for loop deliberately hides the index, which is exactly why it is safe and exactly why '
            'it cannot answer a "where" question. Choosing the form is choosing what information you keep.',
     'note': 'A rare case where the wrong choice does not produce a bug but makes the task impossible. Worth '
             'naming as a different kind of wrong.',
   },
   'misconception': {
     'heading': 'The enhanced for loop is just shorter syntax',
     'think': 'It is the same loop written with fewer characters, so I can always use whichever I prefer.',
     'truth': 'It is a different loop with different capabilities. It cannot write to the array and it cannot '
              'tell you where an element was. In exchange it cannot go out of bounds and cannot use the wrong '
              'index. The two forms are tools for different jobs, and picking by preference rather than by task '
              'is what produces the silent doubling bug.',
     'note': 'Closes the topic on the same point it opened: the restriction is the feature.',
   },
   'discussion': [
     'Which of the three tasks on the worked example could use either form? Why only that one?',
     'Why can an enhanced for loop not report the position of the largest element?',
   ],
   'learned': [
     'I can decide which loop form a task needs before writing it.',
     'I can identify tasks that require the index itself.',
     'I can write both forms correctly over the same data.',
   ],
   'up_next': 'Topic 4.3 looks at creating arrays and at the boundary that causes most Unit 4 crashes.',
   'extra': 'Complete the graded debugging exercise for 4.2. It plants an enhanced for loop that cannot write back.',
  },
 ],
},

# ── 4.3 ──────────────────────────────────────────────────────────────────────
{
 'topic': '4.3',
 'title': 'Array Creation and Access',
 'handle': 'ap-csa-lesson-4-3-array-creation-and-access',
 'subtitle': 'Declaring, allocating, and the difference between length and the last index',
 'vocab': [
   ('Array', 'A fixed-size, ordered collection of values of the same type.'),
   ('length', 'A field on an array holding how many elements it has. No parentheses.'),
   ('Index', 'The position of an element, running from 0 to length minus 1.'),
   ('ArrayIndexOutOfBoundsException', 'The exception thrown when an index outside that range is used.'),
   ('Default element value', 'What a new array is filled with: 0 for numbers, false for boolean, null for objects.'),
   ('Initialiser list', 'Creating an array from values in braces, such as {1, 2, 3}.'),
 ],
 'quiz': [
   {'stem': 'The valid indexes of an array of length 5 are:',
    'options': ['1 to 5', '0 to 5', '0 to 4', '1 to 4'],
    'answer_index': 2,
    'why': 'Indexes start at 0, so the last is length minus 1.'},
   {'stem': 'new int[3] creates an array containing:',
    'options': ['Nothing', 'Three zeros', 'Three nulls', 'Random values'],
    'answer_index': 1,
    'why': 'Numeric arrays are filled with 0.'},
   {'stem': 'Which is correct for an array?',
    'options': ['data.length()', 'data.length', 'data.size()', 'data.size'],
    'answer_index': 1,
    'why': 'length is a field on arrays; length() is a String method.'},
   {'stem': 'for (int i = 0; i <= data.length; i++) will:',
    'options': ['Work correctly', 'Skip the last element', 'Throw on the final pass', 'Not compile'],
    'answer_index': 2,
    'why': 'The last pass uses index length, which does not exist.'},
   {'stem': 'new int[n - 1] when n values must be stored:',
    'options': ['Is correct', 'Is one slot short', 'Is one slot too many', 'Throws immediately'],
    'answer_index': 1,
    'why': 'It allocates one fewer than required.'},
   {'stem': 'The last element of data is:',
    'options': ['data[data.length]', 'data[data.length - 1]', 'data[0]', 'data[-1]'],
    'answer_index': 1,
    'why': 'The last valid index is length minus 1.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Creating arrays, and the boundary that causes the crashes',
   'schedule': [
     (6, 'Bell ringer: number the boxes'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Declaring and allocating'),
     (10, 'Worked example: fill and print an array'),
     (13, 'length versus last index'),
     (5, 'Misconception check: length is a valid index'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'Draw the boxes with indexes underneath and leave them up for the rest of the unit.',
     'Say the two numbers out loud every time: length 5, last index 4.',
   ],
   'warmup': ('Number the boxes',
     'On the board, five empty boxes: "Number them the way Java does. How many boxes are there? What is the '
     'number of the last one? Why are those two answers different?"',
     'Five boxes, last is 4. The difference between "how many" and "the last one" is the entire cause of the '
     'crashes in this unit, so get the class saying both numbers.'),
   'objectives': [
     ('I can declare and allocate an array of a given size.', 'LO 4.3.A'),
     ('I can state the valid index range of an array.', 'LO 4.3.B'),
     ('I can explain why length is not a valid index.', 'LO 4.3.C'),
   ],
   'sections': [
     ('Declaring and allocating', [
       'int[] data; declares a variable that can refer to an array. It does not create one.',
       'new int[5] allocates the array, filled with the default value: 0 for numbers, false for boolean, null for objects.',
       'An initialiser list creates and fills at once: int[] data = {1, 2, 3};',
       'An array has a fixed size once created. Its length can never change.',
     ]),
     ('length and the last index', [
       'length is a FIELD on an array with no parentheses. length() with parentheses is the String method.',
       'Valid indexes run from 0 to length - 1, so length itself is always one past the end.',
       'Using an index outside that range throws ArrayIndexOutOfBoundsException immediately.',
       'The standard loop bound i < data.length is exactly right for this reason.',
     ]),
   ],
   'worked': {
     'heading': 'Fill it, print it, and reach the last element',
     'code': 'public class Fill\n{\n    public static void main(String[] args)\n    {\n        int[] data = new int[4];\n\n        for (int i = 0; i < data.length; i++)\n        {\n            data[i] = (i + 1) * 10;\n        }\n\n        for (int i = 0; i < data.length; i++)\n        {\n            System.out.println(data[i]);\n        }\n\n        System.out.println(data.length);\n        System.out.println(data[data.length - 1]);\n    }\n}',
     'notice': [
       'i < data.length - the last index used is length - 1.',
       'data.length prints 4 - that is a count, not an index.',
       'data[data.length - 1] - the last element, reached safely.',
     ],
     'output': ['10', '20', '30', '40', '4', '40'],
     'caption': 'Complete and runnable as shown. Four elements, length 4, last index 3.',
     'note': 'The last two printed lines are 4 and 40: a count and a value. Point at both and name which is which.',
   },
   'break_it': {
     'change': 'Change the printing loop bound from i < data.length to i <= data.length.',
     'happens': 'It prints all four values and then throws ArrayIndexOutOfBoundsException: Index 4 out of bounds '
                'for length 4. The message names both numbers.',
     'why': 'The final pass asks for index 4, and an array of length 4 has indexes 0 to 3. The exception message '
            'is unusually helpful: it tells you the index you used and the length you had. Tonight\'s graded '
            'debugging exercise plants this together with an array allocated one slot short.',
     'note': 'Read the exception message aloud. Students who learn to read this one message can diagnose half '
             'the crashes in Unit 4 unaided.',
   },
   'misconception': {
     'heading': 'length is the last index',
     'think': 'The array has length 4, so data[4] is the last element.',
     'truth': 'length counts the elements and indexes start at 0, so the last index is always one less than the '
              'length. data[4] on an array of length 4 is one past the end and throws. This single off-by-one is '
              'behind most of the crashes in this unit, and the fix is always the same: the last index is '
              'length - 1 and the standard loop bound is i < length.',
     'note': 'Same shape as 2.10 substring and 4.9 ArrayList size. Say so: it is one rule, met repeatedly.',
   },
   'discussion': [
     'Why does an array of length 4 have no element at index 4?',
     'What does the exception message "Index 4 out of bounds for length 4" tell you about the bug?',
   ],
   'learned': [
     'I can declare and allocate an array of a given size.',
     'I can state the valid index range of an array.',
     'I can explain why length is not a valid index.',
   ],
   'up_next': 'Day 2 fills arrays from input and handles sizes known only at run time.',
   'extra': 'Write the valid index range for arrays of length 1, 7 and 100. Then write the last index of each.',
  },
  {
   'day': 2,
   'focus': 'Sizing an array from input, and copying',
   'schedule': [
     (5, 'Bell ringer: retrieval on bounds'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Sizing from input, and fixed size'),
     (10, 'Worked walkthrough: read n then n values, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Reading a count then that many values is the shape of nearly every exercise in this unit. Drill it.',
     'Arrays cannot grow. Say it plainly here so ArrayList in 4.8 has something to contrast with.',
   ],
   'warmup': ('Retrieval on bounds',
     'On the board, no notes: "1. Last index of an array of length 10? 2. What does i <= length do? '
     '3. Field or method: array length?"',
     'Nine; throws on the final pass; a field with no parentheses. Fast recall here saves debugging time all '
     'through the unit.'),
   'objectives': [
     ('I can allocate an array whose size is read at run time.', 'LO 4.3.A'),
     ('I can explain why an array cannot grow after creation.', 'LO 4.3.C'),
     ('I can copy an array element by element.', 'LO 4.3.B'),
   ],
   'sections': [
     ('Sizing from input', [
       'The size of an array can be a variable, so it does not have to be known when the code is written.',
       'The usual shape is: read a count, allocate exactly that many slots, then read that many values.',
       'Allocating n - 1 slots for n values leaves the last value unread, silently, with no error.',
     ]),
     ('Fixed size and copying', [
       'Once created, an array cannot grow or shrink. Its length is fixed for its whole life.',
       'To "resize", you allocate a new array and copy the elements across one at a time.',
       'Assigning one array variable to another copies the reference, not the elements, which is 3.6 again.',
     ]),
   ],
   'worked': {
     'heading': 'Read a count, then that many values',
     'code': 'import java.util.Scanner;\n\npublic class ReadAll\n{\n    public static void main(String[] args)\n    {\n        Scanner input = new Scanner(System.in);\n        int n = input.nextInt();\n        int[] data = new int[n];\n\n        for (int i = 0; i < data.length; i++)\n        {\n            data[i] = input.nextInt();\n        }\n\n        int[] copy = new int[data.length];\n        for (int i = 0; i < data.length; i++)\n        {\n            copy[i] = data[i];\n        }\n        copy[0] = 999;\n\n        System.out.println(data.length);\n        System.out.println(data[0]);\n        System.out.println(copy[0]);\n        System.out.println(data[data.length - 1]);\n    }\n}',
     'notice': [
       'new int[n] - exactly n slots for exactly n values.',
       'A real copy - changing copy[0] leaves data[0] alone.',
       'data.length - 1 - the last element, safely.',
     ],
     'output': ['3', '4', '999', '6'],
     'caption': 'Complete and runnable as shown. Three values read, copied, and the copy changed independently.',
     'stdin': '3\n4 5 6\n',
     'note': 'The independent copy is the 3.6 lesson reappearing. Point at it and say so; the repetition is what '
             'makes it stick.',
   },
   'break_it': {
     'change': 'Allocate new int[n - 1] instead of new int[n].',
     'happens': 'The loop reads one value fewer than the input provides, the last number is silently left unread, '
                'and everything afterwards operates on incomplete data without any error at all.',
     'why': 'The reading loop is bounded by data.length, so a short array quietly reads fewer values rather than '
            'crashing. Nothing reports it. This is why the count and the allocation must agree exactly, and it is '
            'on tonight\'s graded debugging exercise with the out-of-bounds loop.',
     'note': 'Contrast with yesterday: too big throws loudly, too small fails silently. Silent is worse.',
   },
   'misconception': {
     'heading': 'An array can grow if you need more room',
     'think': 'If the array fills up I can just add another element to the end.',
     'truth': 'An array has a fixed length decided when it is created and it can never change. Adding a value '
              'means allocating a bigger array and copying everything across, which is real work and easy to get '
              'wrong. That cost is exactly why ArrayList exists, and 4.8 introduces it. Knowing why it exists '
              'makes it far easier to remember what it does.',
     'note': 'Deliberate setup for 4.8. The contrast lands better than introducing ArrayList cold.',
   },
   'discussion': [
     'Why does allocating one slot too few fail silently while one index too far throws loudly?',
     'What would you have to do to add a sixth element to an array of length 5?',
   ],
   'learned': [
     'I can allocate an array whose size is read at run time.',
     'I can explain why an array cannot grow after creation.',
     'I can copy an array element by element.',
   ],
   'up_next': 'Topic 4.4 traverses arrays properly, forwards and backwards.',
   'extra': 'Complete the graded debugging exercise for 4.3. It plants an out-of-bounds bound and a short array.',
  },
 ],
},
]
