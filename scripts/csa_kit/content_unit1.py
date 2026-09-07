"""
AP CSA Unit 1 teacher-kit content: Primitive Types and Using Objects, topics 1.1 - 1.15.

Same schema as content_unit2/3/4. See content_unit2.py for the field list.

WHY THIS FILE EXISTS AT ALL
Unit 1's decks were built before this kit and by a different generator, and they
went to Drive as 56 .pptx files that nothing in this repo has ever verified. A
sweep of all 28 teacher decks on 2026-09-07 found:

  8 decks   a worked example split ACROSS SLIDES, each half captioned
            "Complete and runnable as shown." Neither half compiles. 1.14 Day 1
            runs one example over five slides with four unrunnable panels.
  1 deck    1.6, a NOW BREAK IT slide naming a line the program does not contain
  1 deck    1.15, the same bug: "== instead of .equals()" on a program that
            compares nothing
  1 deck    1.10, "Swapping them changes perimeter but not area", which is false
            in both halves: both methods are commutative, so it changes neither
  most      COMMON MISCONCEPTION slides with WHAT STUDENTS THINK holding the
            TRUE statement, verbatim from the slide heading. One mis-mapped
            field, and it teaches the rule as if it were the error.

None of that survives this kit: verify-csa-kit-examples.py compiles every worked
example with a real javac and diffs its stdout against the OUTPUT panel, so a
caption promising a runnable program has to be earned.

THE MISCONCEPTION FIELD IS AUTHORED, NOT EXTRACTED
The old decks' `think` text is unusable, so it is written fresh here from what
the lesson's own warm-up says students get wrong. That is the one part of this
file that is new content rather than rescued content.

No em-dashes anywhere.
"""

TOPICS = [

# ── 1.6 ──────────────────────────────────────────────────────────────────────
{
 'topic': '1.6',
 'title': 'Compound Assignment Operators',
 'handle': 'ap-csa-lesson-1-6-compound-assignment',
 'subtitle': 'Shorthand that still obeys every arithmetic rule you already know',
 'vocab': [
   ('Compound assignment operator',
    'A shorthand that combines an arithmetic operation with assignment: +=, -=, *=, /=, and %=.'),
   ('Expanded form',
    'The long version of a compound statement; x += y is the expanded statement x = x + y.'),
   ('Post-increment',
    'The ++ operator as a standalone statement; x++ adds 1 to x, exactly like x = x + 1.'),
   ('Post-decrement',
    'The -- operator as a standalone statement; x-- subtracts 1 from x, like x = x - 1.'),
   ('Integer division',
    'Division of two int values, which discards the decimal portion. 11 /= 2 leaves 5.'),
   ('Remainder operator',
    'The % operator, which returns what is left after integer division. 11 %= 4 leaves 3.'),
 ],
 'quiz': [
   {'stem': 'int n = 6; n += n; What is stored in n?',
    'options': ['6', '7', '12', '36'],
    'answer_index': 2,
    'why': 'n += n expands to n = n + n, so 6 + 6 is 12. It is not "add nothing" and it is not n++.'},
   {'stem': 'Which statement is exactly equivalent to count *= 4;',
    'options': ['count = 4;', 'count = count * 4;', 'count = count + 4;', 'count * 4;'],
    'answer_index': 1,
    'why': 'Every compound operator expands to variable = variable OPERATOR value.'},
   {'stem': 'int total = 11; total /= 2; What is stored in total?',
    'options': ['5', '5.5', '6', '0'],
    'answer_index': 0,
    'why': 'total is an int, so the division truncates. The .5 is discarded, not rounded.'},
   {'stem': 'double total = 9.0; total /= 2; What is stored in total?',
    'options': ['4', '4.0', '4.5', '5.0'],
    'answer_index': 2,
    'why': 'The variable is a double, so this is double division even though 2 is an int.'},
   {'stem': 'Which use of ++ is OUT OF SCOPE for the AP exam?',
    'options': ['x++; on its own line', 'x--; on its own line',
                'int y = x++;', 'Using x++ to count in a loop update'],
    'answer_index': 2,
    'why': 'The exam uses ++ and -- only as standalone statements. Inside a larger expression, '
           'and the prefix forms ++x and --x, are excluded.'},
   {'stem': 'int k = 8; k -= 3; k *= k; k /= 5; What is stored in k?',
    'options': ['1', '5', '25', '8'],
    'answer_index': 1,
    'why': 'k becomes 5, then 25, then 25 / 5 which is 5. Write the value after every line.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'The five compound operators, tracing a sequence, and the standalone ++ and --',
   'schedule': [
     (6, 'Bell ringer: does n += n add nothing?'),
     (3, 'Objectives and guided-notes preview'),
     (10, 'The five operators and their expanded forms'),
     (10, 'Tracing a sequence, and letting the left side decide the division'),
     (8, 'Post-increment and post-decrement, standalone only'),
     (7, 'Worked example, then break it with one character'),
     (6, 'Misconception check: += is not ++'),
   ],
   'notes': [
     'Bell ringer: n += n. Collect answers before revealing. The wrong answers are 6, from reading '
     'it as "add nothing to n", and 7, from confusing it with n++. Both are worth having on the '
     'board because the rest of the lesson kills them.',
     'Land the rule that carries the whole lesson: every compound operator expands to '
     'variable = variable OPERATOR value, and the right side is evaluated using the current value '
     'of the variable before anything is stored back.',
   ],
   'warmup': (
     'Does this add nothing?',
     'Write down what this prints. Then write one sentence saying what n += n means in words, '
     'without using the += symbol.',
     'Collect answers before revealing. The common wrong answers are 6, reading it as "add nothing '
     'to n", and 7, confusing it with n++. It prints 12, because n += n expands to n = n + n, '
     'which is 6 + 6.',
     'int n = 6;\nn += n;\nSystem.out.println(n);',
   ),
   # LO codes come from the authored deck, which carried one only on the first
   # objective. The renderer prints the string as given, so the other two print
   # nothing rather than a code invented here: there is no CSA CED source in
   # this repo to check an invented code against, and a wrong CED citation on a
   # teacher slide is worse than an absent one.
   'objectives': [
     ('I can rewrite any compound assignment statement in its expanded form and get the same '
      'stored value.', 'LO 1.6.A'),
     ('I can trace a sequence of compound assignments and state the exact value stored after '
      'each line.', ''),
     ('I can explain what x++ and x-- do, and say which forms of ++ and -- the exam '
      'excludes.', ''),
   ],
   'sections': [
     ('The five compound operators and their expanded forms', [
       'A compound assignment operator combines an arithmetic operation with an assignment in '
       'one statement. There are five: +=, -=, *=, /=, and %=.',
       'Each is exactly equivalent to its expanded form. x += y means x = x + y, and x %= y '
       'means x = x % y.',
       'Java takes the current value of the variable, applies the operator with the value on the '
       'right, and stores the result back.',
       'Compound operators are shorthand only. Int division stays int division, and the '
       'remainder operator still returns a remainder.',
       'Stuck on a trace? Write the expanded form in the margin. It costs five seconds and '
       'removes almost every mistake on this topic.',
     ]),
     ('Tracing a sequence, and which division you get', [
       'Exam questions here are almost always a short sequence of compound statements ending in '
       'a print. The only reliable method is a trace table.',
       'One row per statement, one column for the variable. Write the value after every line, '
       'even when the change is obvious.',
       'The type of the VARIABLE decides what /= does. If it is an int, the division truncates, '
       'so 11 /= 2 leaves 5 and the .5 is gone.',
       'If the variable is a double, the division is double division even when the value on the '
       'right is an int. 9.0 /= 2 gives 4.5.',
       '%= stores the remainder. 11 %= 4 leaves 3, because 11 divided by 4 is 2 remainder 3.',
     ]),
     ('Post-increment and post-decrement, standalone only', [
       'x++ adds 1 to the variable and stores the result. It means exactly x = x + 1. x-- '
       'subtracts 1 and means x = x - 1.',
       'On the exam these appear only as standalone statements on their own line. The prefix '
       'forms ++x and --x are excluded.',
       'So you never have to reason about what the operator returns, only about what it stores. '
       'Add one or subtract one and move on.',
       'x++ and x += 1 do the same thing here. Do not read x++ as doubling or as a shortcut for '
       'x += x.',
     ]),
   ],
   'worked': {
     'heading': 'Compound operators, applied in order',
     'code': 'public class StepCounter\n'
             '{\n'
             '    public static void main(String[] args)\n'
             '    {\n'
             '        int steps = 4;\n'
             '        steps *= 3;\n'
             '        steps += 10;\n'
             '        steps -= 2;\n'
             '        steps %= 5;\n'
             '        System.out.println(steps);\n'
             '    }\n'
             '}',
     'notice': [
       'steps *= 3 means steps = steps * 3. Every compound operator hides an assignment.',
       'One line at a time: 4, 12, 22, 20, 0. Trace it in writing.',
       '%= has a compound form like the rest, and 20 % 5 is 0.',
     ],
     'output': ['0'],
   },
   'break_it': {
     'change': 'Write steps =+ 10 instead of steps += 10.',
     'happens': 'It still compiles, and it prints 3 instead of 0. =+ is an assignment followed by '
                'a positive sign, so steps is simply set to 10 and the 12 it was holding is thrown '
                'away. Nothing warns you.',
     'why': 'Exam questions are built from exactly these one-character differences. Reversing the '
            'two characters turns an update into an overwrite, and the program still runs, so '
            'only a trace catches it.',
     'note': 'Run it. Watching 0 become 3 lands harder than saying the two characters are '
             'different.',
   },
   'misconception': {
     'heading': 'x += x is not x++',
     'think': 'That x += x bumps the variable along by one like x++ does, or that it adds '
              'nothing at all because the right side is already there.',
     'truth': 'x += x expands to x = x + x, which DOUBLES the value. x++ expands to x = x + 1, '
              'which adds one. With x holding 6, the first stores 12 and the second stores 7. '
              'Those are the two wrong answers from this morning, and they come from the same '
              'habit of reading the shorthand instead of expanding it.',
   },
   'lesson_page': {
     'intro': 'Work the live lesson page together. Students use the Java Code Editor to verify '
              'traces they already wrote on paper, then complete the AP Practice set in pairs.',
     'activities': [
       'Write a paper trace of int n = 100; n /= 4; n %= 7; n += n; and predict the value. It '
       'is 8.',
       'Type the same sequence in the Java Code Editor with a println after each line. Confirm '
       '25, 4, 8.',
       'Run double total = 9.0; total /= 2; confirm 4.5, then change the type to int and watch '
       'it change.',
     ],
   },
   'discussion': [
     'int k = 8; k -= 3; k *= k; k /= 5; What value is stored in k?',
     'int num = 5; num += num; num *= num; What is printed?',
     'int total = 9; total /= 2; Give the exact output and explain the value in one sentence.',
   ],
   'learned': [
     'I can rewrite any compound assignment statement in its expanded form and get the same '
     'stored value.',
     'I can trace a sequence of compound assignments and state the exact value stored after '
     'each line.',
     'I can explain what x++ and x-- do, and say which forms of ++ and -- the exam excludes.',
   ],
   'up_next': 'Topic 1.6 is complete. Your next lesson page is on the site.',
   'extra': 'Trace tables for four sequences, writing the value after every statement. The '
            'final values are 5, 100, 8 and 8.',
  },
 ],
},

]
