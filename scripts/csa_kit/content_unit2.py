"""
AP CSA Unit 2 teacher-kit content: Selection and Iteration, topics 2.1 - 2.12.

This is the authored source for the slide decks, guided notes, keys, quizzes and
lesson maps. One topic is one dict; the generators read it and never invent
content of their own, so a CED correction is a data edit in this file rather
than a rewrite of fifteen documents.

WHERE THE TEACHING CONTENT COMES FROM
The "now break it" and "misconception" slides are deliberately built from the
same bugs as the graded debugging exercises in seed/csa-debug-unit2.js. A
student who sees the bug demonstrated on the board on day 1 meets it again as a
graded exercise that evening, and the wording matches on purpose. Nothing here
teaches a mistake the course does not then assess.

Structure per topic:
    topic, title, handle, subtitle, vocab[(term, definition)]
    days[ {day, focus, schedule, sections, warmup, objectives, worked,
           break_it, misconception, discussion, learned, up_next, extra} ]
    quiz[ {stem, options, answer_index, why} ]

No em-dashes anywhere.
"""

TOPICS = [

# ── 2.1 ──────────────────────────────────────────────────────────────────────
{
 'topic': '2.1',
 'title': 'Algorithms with Selection and Repetition',
 'handle': 'ap-csa-lesson-2-1-algorithms-selection-repetition',
 'subtitle': 'Why a program needs to choose and to repeat, and how to say so on paper first',
 'vocab': [
   ('Selection', 'A control structure that chooses which statements run, based on whether a condition is true.'),
   ('Repetition', 'A control structure that runs the same statements more than once.'),
   ('Control flow', 'The order in which the statements of a program actually execute.'),
   ('Condition', 'A boolean expression that decides which way execution goes.'),
   ('Iteration', 'One pass through the body of a loop.'),
   ('Sequencing', 'Executing statements one after another in the order written.'),
 ],
 'quiz': [
   {'stem': 'Which control structure runs a block of statements only when a condition is true?',
    'options': ['Sequencing', 'Selection', 'Repetition', 'Compilation'],
    'answer_index': 1,
    'why': 'Selection chooses whether a block runs. Repetition chooses how many times.'},
   {'stem': 'A program prints every number from 1 to 100. Which control structure is doing the work?',
    'options': ['Selection', 'Repetition', 'Sequencing only', 'Casting'],
    'answer_index': 1,
    'why': 'One statement executed many times is repetition.'},
   {'stem': 'What does a swap of two variables require that a beginner most often forgets?',
    'options': ['A loop', 'A third temporary variable', 'A cast', 'A condition'],
    'answer_index': 1,
    'why': 'Assigning a to b before saving a destroys the original value of a permanently.'},
   {'stem': 'A countdown is written as for (int i = n; i > 1; i--). What is wrong?',
    'options': ['It never runs', 'It runs forever', 'It stops before printing 1', 'It prints n twice'],
    'answer_index': 2,
    'why': 'i > 1 is already false when i reaches 1, so the body never runs for 1.'},
   {'stem': 'Which is the best reason to write an algorithm in plain English before coding it?',
    'options': ['The exam requires English answers', 'It compiles faster',
                'Sequencing and decisions are easier to check before syntax gets in the way',
                'It avoids run-time errors'],
    'answer_index': 2,
    'why': 'The CED expects algorithms represented in written language or diagrams, not only in Java.'},
   {'stem': 'Which of these is NOT a control structure?',
    'options': ['Selection', 'Repetition', 'Sequencing', 'Declaration'],
    'answer_index': 3,
    'why': 'A declaration creates a variable. It does not change the order statements run in.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'The three control structures, and writing an algorithm before writing Java',
   'schedule': [
     (6, 'Bell ringer: the vending machine decision'),
     (3, 'Objectives and guided-notes preview'),
     (14, 'Sequencing, selection and repetition'),
     (9, 'Worked example: trace a program that chooses and repeats'),
     (14, 'Writing the algorithm in English first'),
     (6, 'Misconception check: a loop is not a rewind'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'Bell ringer: the vending machine decision. Ask what a vending machine must DECIDE and what it must REPEAT. Selection and repetition fall out of the answer without you naming them first.',
     'Do not start the swap algorithm today. It reads as trivial and eats a full block once students actually trace it.',
   ],
   'warmup': ('The vending machine decision',
     'On the board: "A vending machine takes coins until you have paid enough, then dispenses. '
     'List every point where it has to DECIDE something, and every point where it has to REPEAT something. '
     'Four minutes, then compare with a neighbour."',
     'Collect two lists out loud. Every decision is selection and every repeat is repetition, and students '
     'will have found both without the vocabulary. Name them only after the lists are on the board, so the '
     'words attach to something they already described.'),
   'objectives': [
     ('I can describe sequencing, selection and repetition, and identify each one in a program.', 'LO 2.1.A'),
     ('I can write an algorithm in written language before translating it into Java.', 'LO 2.1.B'),
     ('I can trace a program by hand and predict its output.', 'LO 2.1.C'),
   ],
   'sections': [
     ('Sequencing, selection and repetition', [
       'Every program you will write this year is built from exactly three control structures: sequencing, selection and repetition.',
       'Sequencing means statements run one at a time, top to bottom, in the order written. This is the default and it needs no keyword.',
       'Selection means a condition decides which statements run. Some statements are skipped entirely.',
       'Repetition means the same statements run more than once. One pass through the body is called an iteration.',
     ]),
     ('Writing the algorithm before the Java', [
       'The CED expects you to represent an algorithm in written language or a diagram, not only in code.',
       'An algorithm written in English can be checked for correct decisions and correct order before syntax is in the way.',
       'If you cannot say the plan in plain English, the Java version will not rescue you.',
     ]),
   ],
   'worked': {
     'heading': 'A program that chooses and repeats',
     'code': 'public class Report\n{\n    public static void main(String[] args)\n    {\n        int total = 0;\n        for (int i = 1; i <= 5; i++)\n        {\n            if (i % 2 == 0)\n            {\n                total = total + i;\n            }\n        }\n        System.out.println(total);\n    }\n}',
     'notice': [
       'for - repetition. The body runs five times, once for each value of i.',
       'if - selection. The body of the if runs only on the passes where i is even.',
       'total - sequencing. Each statement inside runs top to bottom.',
     ],
     'output': ['6'],
     'caption': 'Complete and runnable as shown. All three control structures in twelve lines.',
     'note': 'Trace it on the board with a two-column table, i and total. The answer is 2 + 4 = 6. '
             'Ask which lines run five times and which run twice; that distinction is the whole slide.',
   },
   'break_it': {
     'change': 'Change the swap at the top of a program from using a temporary variable to just a = b; b = a;',
     'happens': 'It still compiles and still runs. Both variables now hold the same value and the original a is gone. '
                'Nothing warns you.',
     'why': 'The first assignment overwrites a before anything has saved it, so the second assignment copies the new '
            'value back onto itself. A swap always needs three statements and a temporary. This exact bug is tonight\'s '
            'graded debugging exercise.',
     'note': 'Do this live with two labelled cups and a coin. Pouring cup A into cup B loses what was in B. '
             'Students who see it physically stop making it.',
   },
   'misconception': {
     'heading': 'A loop rewinds the program',
     'think': 'A loop goes back and runs the earlier lines again, so anything above the loop happens again too.',
     'truth': 'A loop repeats only the statements inside its own body, between its braces. Statements above the loop '
              'ran once, before the loop started, and never run again. This is why an accumulator declared above a '
              'loop keeps its value across iterations, and one declared inside is created fresh every pass.',
     'note': 'This misconception is the root of the "counter never resets" and "counter resets every time" bugs, '
             'which are opposite symptoms of the same misunderstanding. Both appear in Unit 2 exercises.',
   },
   'discussion': [
     'A program has to print the larger of two numbers. Which control structure do you need, and which do you not?',
     'Describe a task from your morning that uses both selection and repetition. Where exactly is each one?',
   ],
   'learned': [
     'I can describe sequencing, selection and repetition, and identify each one in a program.',
     'I can write an algorithm in written language before translating it into Java.',
     'I can trace a program by hand and predict its output.',
   ],
   'up_next': 'Day 2 puts selection and repetition together on a longer algorithm and introduces the swap.',
   'extra': 'Vocabulary: write the six terms with definitions in your own words, one example each.',
  },
  {
   'day': 2,
   'focus': 'Combining the structures, the swap, and off-by-one bounds',
   'schedule': [
     (5, 'Bell ringer: retrieval on day 1'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Swapping two values, and why a temporary is required'),
     (10, 'Worked walkthrough: trace a swap and a countdown live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Bell ringer: three questions, no notes. Name the three control structures. Which one skips statements? '
     'Which one repeats them?',
     'The countdown bound is worth its own minute. i > 1 versus i >= 1 is one character and one missing line of output.',
   ],
   'warmup': ('Retrieval on day 1',
     'On the board, no notes: "1. Name the three control structures. 2. Which one causes statements to be skipped? '
     '3. In a loop that runs five times, how many times does a statement ABOVE the loop run?"',
     'The third question is the one that matters. Anyone answering five still holds the rewind misconception from '
     'yesterday, and this is the cheapest possible moment to catch it.'),
   'objectives': [
     ('I can swap the values of two variables correctly using a temporary variable.', 'LO 2.1.B'),
     ('I can choose a loop bound that includes exactly the values the problem asks for.', 'LO 2.1.C'),
     ('I can find and fix a sequencing error in code somebody else wrote.', 'LO 2.1.C'),
   ],
   'sections': [
     ('Swapping two values', [
       'To exchange the values of two variables you need somewhere to put the first one before it is overwritten.',
       'The correct swap is three statements: save a into temp, copy b into a, copy temp into b.',
       'Writing a = b; b = a; destroys the value of a on the first line, so both variables end up holding the old b.',
     ]),
     ('Choosing the bound', [
       'A loop that should include the value n must have a condition that is still true when the counter reaches n.',
       'i > 1 stops before 1 is used. i >= 1 includes it. One character decides whether the last value appears.',
       'Always test a loop with the smallest legal input, because that is where an off-by-one shows up first.',
     ]),
   ],
   'worked': {
     'heading': 'A correct swap, then a countdown',
     'code': 'public class Swap\n{\n    public static void main(String[] args)\n    {\n        int a = 3;\n        int b = 8;\n\n        int temp = a;\n        a = b;\n        b = temp;\n\n        System.out.println(a);\n        System.out.println(b);\n\n        for (int i = 3; i >= 1; i--)\n        {\n            System.out.println(i);\n        }\n    }\n}',
     'notice': [
       'temp - holds the old a so the next line cannot destroy it.',
       'Three statements - a swap is never two. Two is the bug.',
       'i >= 1 - includes 1, so the countdown actually reaches it.',
     ],
     'output': ['8', '3', '3', '2', '1'],
     'caption': 'Complete and runnable as shown.',
     'note': 'Trace the three swap lines with a table of a, b and temp. Then ask what the output would be with '
             'i > 1 instead. The missing 1 is the whole point.',
   },
   'break_it': {
     'change': 'Change the loop condition from i >= 1 to i > 1 and run it again.',
     'happens': 'It compiles, it runs, and the countdown silently stops at 2. Four lines of output become three, '
                'and nothing in the program complains.',
     'why': 'An off-by-one is the most common bug in the entire course and it never announces itself. The only '
            'defence is testing the boundary deliberately: run the smallest input and count the lines you expect.',
     'note': 'Ask for the expected line count BEFORE running. Students who predict four and see three have just '
             'learned to test boundaries, which is the actual skill.',
   },
   'misconception': {
     'heading': 'You can swap two variables in two lines',
     'think': 'a = b; b = a; swaps them, because the second line puts the old a back.',
     'truth': 'By the time the second line runs, the old a no longer exists anywhere. The first line overwrote it, '
              'and an overwritten value is not recoverable. Both variables end up holding the original b. A swap '
              'requires a third variable in every language that works this way, which is nearly all of them.',
     'note': 'The cups-and-coin demonstration from day 1 is worth repeating here if anyone still doubts it.',
   },
   'discussion': [
     'A loop is supposed to print the numbers 1 through n. A student writes i < n. What is missing from the output, and for which value of n is it hardest to notice?',
     'Why can a swap not be done in two statements? What exactly is lost, and when?',
   ],
   'learned': [
     'I can swap the values of two variables correctly using a temporary variable.',
     'I can choose a loop bound that includes exactly the values the problem asks for.',
     'I can find and fix a sequencing error in code somebody else wrote.',
   ],
   'up_next': 'Topic 2.2 makes the conditions themselves the subject: boolean expressions and how to negate them.',
   'extra': 'Complete the graded debugging exercise for 2.1 on the lesson page. It plants both bugs from today.',
  },
 ],
},

# ── 2.2 ──────────────────────────────────────────────────────────────────────
{
 'topic': '2.2',
 'title': 'Boolean Expressions',
 'handle': 'ap-csa-lesson-2-2-boolean-expressions',
 'subtitle': 'Expressions that evaluate to true or false, and the operators that combine them',
 'vocab': [
   ('Boolean expression', 'An expression that evaluates to exactly one of two values, true or false.'),
   ('Relational operator', 'An operator comparing two values: <, >, <=, >=, == and !=.'),
   ('Logical operator', 'An operator combining boolean values: && for and, || for or, ! for not.'),
   ('Truth table', 'A table listing every combination of inputs and the result for each.'),
   ('De Morgan\'s laws', 'Negating an and gives an or of the negations, and negating an or gives an and of the negations.'),
   ('Equivalent expressions', 'Two expressions that produce the same result for every possible input.'),
 ],
 'quiz': [
   {'stem': 'Which operator tests whether two int values are equal?',
    'options': ['=', '==', '!=', '<='], 'answer_index': 1,
    'why': 'A single = assigns. A double == compares.'},
   {'stem': 'What is !(a > b && b > c) equivalent to?',
    'options': ['!(a > b) && !(b > c)', 'a <= b || b <= c', 'a < b && b < c', 'a >= b || b >= c'],
    'answer_index': 1,
    'why': 'De Morgan: negating an and gives an or of the negated parts, and the negation of > is <=.'},
   {'stem': 'For how many of the four input combinations is !(P && Q) true?',
    'options': ['1', '2', '3', '4'], 'answer_index': 2,
    'why': 'P && Q is true in only one row, so its negation is true in the other three.'},
   {'stem': 'Which expression means "x is between 10 and 99 inclusive"?',
    'options': ['x >= 10 || x <= 99', 'x > 10 && x < 99', 'x >= 10 && x <= 99', 'x >= 10 != x <= 99'],
    'answer_index': 2,
    'why': 'Both conditions must hold, so it is an and. The or version is true for every integer.'},
   {'stem': 'What is the value of !true || false?',
    'options': ['true', 'false', 'It does not compile', 'Undefined'], 'answer_index': 1,
    'why': '!true is false, and false || false is false.'},
   {'stem': 'Which is the best way to check whether a boolean variable done is false?',
    'options': ['done == false', '!done', 'done = false', 'done != true'],
    'answer_index': 1,
    'why': 'All of A, B and D are correct, but !done is the idiomatic form and cannot be mistyped as an assignment.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Relational and logical operators, and building a truth table',
   'schedule': [
     (6, 'Bell ringer: true or false, no computer'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Relational and logical operators'),
     (10, 'Worked example: evaluate expressions by hand'),
     (13, 'Truth tables, built column by column'),
     (5, 'Misconception check: = versus =='),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'Bell ringer: put four expressions on the board and have students commit to true or false before any '
     'discussion. Commitment first, discussion second, or the quiet students copy.',
     'Build the truth table by hand on the board. Handing out a completed one teaches nothing.',
   ],
   'warmup': ('True or false, no computer',
     'On the board, with a = 5, b = 3, c = 5: "Decide true or false for each: (1) a > b   (2) a == c   '
     '(3) a != b   (4) a > b && b > c. Write your four answers down before we talk."',
     'The fourth one is the interesting one: b > c is false, so the whole and is false even though the first '
     'half is clearly true. Students who answered true read only as far as a > b.'),
   'objectives': [
     ('I can evaluate a boolean expression using relational and logical operators.', 'LO 2.2.A'),
     ('I can build a truth table for a compound boolean expression.', 'LO 2.2.B'),
     ('I can determine whether two boolean expressions are equivalent.', 'LO 2.2.C'),
   ],
   'sections': [
     ('Relational and logical operators', [
       'A boolean expression evaluates to exactly one of two values: true or false. There is no third option.',
       'The relational operators compare two values: <, >, <=, >=, == for equal and != for not equal.',
       'A single = assigns a value. A double == compares two values. Confusing them is the most common typo in the language.',
       'The logical operators combine booleans: && means and, || means or, and ! means not.',
     ]),
     ('Truth tables', [
       'A truth table lists every possible combination of the inputs and the result for each one.',
       'Two boolean inputs give four rows. Three inputs give eight. The count doubles with each input.',
       'P && Q is true in exactly one row of four. P || Q is true in three of four.',
     ]),
   ],
   'worked': {
     'heading': 'Evaluating by hand, one operator at a time',
     'code': 'public class Logic\n{\n    public static void main(String[] args)\n    {\n        int a = 5;\n        int b = 3;\n        int c = 5;\n\n        System.out.println(a > b);\n        System.out.println(a == c);\n        System.out.println(a > b && b > c);\n        System.out.println(a > b || b > c);\n        System.out.println(!(a > b));\n    }\n}',
     'notice': [
       'a > b - true, because 5 is greater than 3.',
       '&& - needs BOTH sides true. b > c is false, so the whole thing is false.',
       '|| - needs only ONE side true, so the same pair gives true here.',
     ],
     'output': ['true', 'true', 'false', 'true', 'false'],
     'caption': 'Complete and runnable as shown.',
     'note': 'Evaluate each line on the board before revealing the output. Lines 3 and 4 have identical operands '
             'and opposite answers, which is the cleanest possible demonstration of what && and || actually do.',
   },
   'break_it': {
     'change': 'Change a > b && b > c to !(a > b) && !(b > c), claiming you have "distributed the not".',
     'happens': 'It compiles and gives a different answer on most inputs. With a = 5, b = 3, c = 1 the correct '
                'negation is false and this version is also false, so a single lucky test hides it completely.',
     'why': 'Negation does not distribute across an and the way a minus sign distributes across a sum. '
            '!(P && Q) is true in three rows of four; !P && !Q is true in only one. Build both columns and the '
            'gap is obvious. This is tonight\'s graded debugging exercise.',
     'note': 'Insist on the full four-row table here. Students who "see it" without writing it out are the ones '
             'who get it wrong on the exam.',
   },
   'misconception': {
     'heading': 'Assignment and comparison are the same thing',
     'think': 'if (x = 5) checks whether x is 5.',
     'truth': 'A single = assigns. In Java, if (x = 5) does not even compile when x is an int, because an int is '
              'not a boolean. But if the variable is a boolean, if (done = true) DOES compile: it assigns true to '
              'done and then tests it, so the condition is always true and the assignment silently changed your '
              'data. That is why == exists as a separate operator, and why !done is safer than done == true.',
     'note': 'The boolean case is the dangerous one because it compiles. Worth a full minute.',
   },
   'discussion': [
     'a > b || b > c is true and a > b && b > c is false for the same three values. Explain how both can be right.',
     'Why does the number of rows in a truth table double every time you add one more input?',
   ],
   'learned': [
     'I can evaluate a boolean expression using relational and logical operators.',
     'I can build a truth table for a compound boolean expression.',
     'I can determine whether two boolean expressions are equivalent.',
   ],
   'up_next': 'Day 2 uses truth tables to prove two expressions equivalent, and introduces De Morgan\'s laws.',
   'extra': 'Build the full four-row truth table for !(P && Q) and for !P && !Q, side by side.',
  },
  {
   'day': 2,
   'focus': 'Equivalence, De Morgan\'s laws, and negating a compound condition',
   'schedule': [
     (5, 'Bell ringer: retrieval on truth tables'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'De Morgan\'s laws, derived not announced'),
     (10, 'Worked walkthrough: negate three conditions live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Derive De Morgan from a truth table rather than stating it. A rule students watched emerge is a rule they '
     'can rebuild in the exam room; a rule they copied is one they misremember.',
     'The negation of > is >= reversed, not <. Spend a moment on the boundary.',
   ],
   'warmup': ('Retrieval on truth tables',
     'On the board, no notes: "1. How many rows does a truth table with two inputs have? '
     '2. In how many of them is P && Q true? 3. In how many is P || Q true?"',
     'One, and three. If students cannot answer these instantly, do not start De Morgan yet: build one more '
     'table together first. The whole day rests on these two counts.'),
   'objectives': [
     ('I can use a truth table to prove that two boolean expressions are equivalent.', 'LO 2.2.C'),
     ('I can apply De Morgan\'s laws to negate a compound condition correctly.', 'LO 2.2.C'),
     ('I can rewrite a negated condition without the leading not.', 'LO 2.2.C'),
   ],
   'sections': [
     ('Proving equivalence', [
       'Two boolean expressions are equivalent when they give the same result for every possible combination of inputs.',
       'Testing one example proves nothing. Two expressions can agree on three rows of four and still differ.',
       'The only proof is the complete table: build a column for each expression and compare them row by row.',
     ]),
     ('De Morgan\'s laws', [
       'Negating an and produces an or: !(P && Q) is equivalent to !P || !Q.',
       'Negating an or produces an and: !(P || Q) is equivalent to !P && !Q.',
       'The operator flips every time the not moves inside. This is the step students skip.',
       'The negation of a > b is a <= b, not a < b. The boundary case belongs to the negation.',
     ]),
   ],
   'worked': {
     'heading': 'Negating a compound condition three ways',
     'code': 'public class Negate\n{\n    public static void main(String[] args)\n    {\n        int a = 5;\n        int b = 9;\n\n        boolean original = a > 3 && b > 10;\n\n        System.out.println(original);\n        System.out.println(!original);\n        System.out.println(a <= 3 || b <= 10);\n        System.out.println(!(a > 3) || !(b > 10));\n    }\n}',
     'notice': [
       'Line 3 - the original: a > 3 is true, b > 10 is false, so the and is false.',
       'Lines 4, 5 and 6 - three ways of writing the same negation. All three agree.',
       'a <= 3 - the negation of a > 3 includes the boundary value 3.',
     ],
     'output': ['false', 'true', 'true', 'true'],
     'caption': 'Complete and runnable as shown. The last three lines are equivalent by De Morgan.',
     'note': 'Run it with a = 5, b = 9 and then ask students to pick values that would break the equivalence. '
             'They cannot, and failing to find one is the point.',
   },
   'break_it': {
     'change': 'Replace the correct negation with !(a > 3) && !(b > 10), keeping the and instead of flipping it.',
     'happens': 'The output changes from true to false. Two expressions that look almost identical disagree, '
                'and only one of them is the negation you asked for.',
     'why': 'The and must become an or when the not moves inside. Forgetting to flip the operator is the single '
            'most common De Morgan error, and it is invisible unless you test a row where exactly one side is true.',
     'note': 'Point out that a = 1, b = 1 makes both versions agree. Choosing the right test input is itself a skill.',
   },
   'misconception': {
     'heading': 'A not distributes like a minus sign',
     'think': '!(P && Q) becomes !P && !Q, the same way -(x + y) becomes -x - y.',
     'truth': 'Arithmetic negation distributes and keeps the operator. Logical negation distributes and FLIPS the '
              'operator: and becomes or, or becomes and. The two rules look similar and behave differently, which '
              'is exactly why this error survives so long. Build the table once and you will never need the rule.',
     'note': 'The arithmetic analogy is where the error comes from, so name and kill it explicitly.',
   },
   'discussion': [
     'Write !(x < 10 || x > 20) without the leading not. What range of x makes it true?',
     'Two expressions agree on three of the four rows of a truth table. Are they equivalent? Why does that matter for testing?',
   ],
   'learned': [
     'I can use a truth table to prove that two boolean expressions are equivalent.',
     'I can apply De Morgan\'s laws to negate a compound condition correctly.',
     'I can rewrite a negated condition without the leading not.',
   ],
   'up_next': 'Topic 2.3 puts these conditions to work inside if statements.',
   'extra': 'Complete the graded debugging exercise for 2.2. It plants a wrongly distributed not.',
  },
 ],
},
]
