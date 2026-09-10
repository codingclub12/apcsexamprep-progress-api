"""
The repairs applied to the rescued AP CSA Unit 1 teacher guides.

WHAT THIS FILE IS FOR
docs/rescued/csa-unit1-teacher-guides/ holds the 15 guides verbatim. This file
holds every change made to them on the way to the rebuilt documents, so the two
stay separate and diffable. Reading this file tells you exactly what we decided
was wrong with the originals; reading the rescue tells you what they said.

THE FIVE DEFECT CLASSES, MEASURED RATHER THAN ESTIMATED
Counted across all 15 by scripts/parse-csa-unit1-guides.py on 2026-09-10:

  41 of 45   exit-ticket items print a bare letter answer, and the options that
             letter refers to appear nowhere in the document. "Answer: B" over
             no A, B, C or D. This is the same defect the 2026-09-07 run note
             found in the Unit 1 quizzes, one document over, and it is the
             worst of the five because a teacher cannot use the answer at all.
             It also cannot be repaired by editing text: options that were
             never written have to be written. They are authored below, and the
             stated letter is preserved so the original key still holds.

  25         references to material the bundle does not contain: "on the
             handout", "nine scenario cards", "printed at the top of the
             handout". Board 267 is this defect. Every one now points at
             Exercise 1 or Exercise 2 in the lesson's own Supplements folder,
             which are real files a teacher has.

  138        directional lines: 2 pacing, 39 grouping, 97 staging. Tanner set
             informational-rather-than-directional as an acceptance criterion
             on 2026-09-07. Nearly all of it is in three places, the bell
             ringer, the worked example and the lesson-page block, which is why
             those three are replaced wholesale here and the rest is ten
             targeted pairs.

  218        printed timings, one per segment heading. Fixed in the renderer
             rather than here, because it is a property of the document rather
             than of any topic. See _segment in csa_kit/notes.py.

  4          repeated segments inside one topic, all in 1.5, where day 3 shares
             day 2's bell ringer and worked example and the misconception check
             appears twice. Repaired by authoring the missing ones. The 13
             other repeats the scan found are "Objectives and guided-notes
             preview", which is meant to repeat.

  1          factual contradiction: 1.2 day 1 says AP CSA uses exactly three
             primitives and its day 2 bell ringer asks students to name four,
             with a range trap that belongs to 1.5.

WHAT IS DELIBERATELY NOT REPAIRED
Differentiation. It reads as directional and it is supposed to: csa_kit's own
differentiation.py sets the house style as "concrete classroom moves a teacher
can do tomorrow", and the style was taken from the Unit 1 Topic 1.3 guide in
the first place. A Support item that does not tell a teacher what to do is
decoration. The voice rule skips this section by name rather than by accident.

HOW A STALE REPAIR FAILS
Every REPLACE pair states how many times it must match. A pair that matches a
different number of times fails the build instead of quietly doing nothing.
That is the lesson from the sheet that sat unimported for a day on 2026-09-08
and would have reverted a better fix: a repair that no longer applies has to
say so.
"""

# ── bell ringers ─────────────────────────────────────────────────────────────
# (title, prompt, debrief, code or None). The kit prints the prompt, then the
# code if there is any, then "Debrief: " and the debrief. The originals opened
# with "On the board:" and closed with a hand count; the question and the
# answer are what survive.
WARMUP = {}

# ── worked examples ──────────────────────────────────────────────────────────
# One note per day, describing what the example shows rather than how to stage
# it. "Do it live" and "take a vote before evaluating" are the two idioms that
# appear most and neither survives.
WORKED = {}

# ── exit tickets ─────────────────────────────────────────────────────────────
# Per topic, one entry per parsed stem IN ORDER. Either
#   {'options': [...], 'answer_index': N, 'why': '...'}   for a choice item
#   {'free': True, 'why': '...'}                          keeps the parsed answer
# The authored options are constrained by the original key: option index N is
# the letter the shipped guide already named, so a teacher holding both
# documents is never told two different things.
EXIT = {}

# ── independent practice ─────────────────────────────────────────────────────
INDEPENDENT = {}

# ── homework ─────────────────────────────────────────────────────────────────
# Full replacement lists. Only the phantom-material lines change; the rest are
# the originals word for word.
HOMEWORK = {}

# ── misconception overrides ──────────────────────────────────────────────────
# Only where the source ran the same misconception check on two days. 1.5 put
# "Cast scope" on both day 1 and day 2, and day 2 is the day that teaches the
# integer division hiding inside a cast, which is a different trap the topic
# already carries.
MISCONCEPTION = {}

# ── wrap-up notes ────────────────────────────────────────────────────────────
# Same reason as MISCONCEPTION: the source printed one topic's wrap-up note on
# two days word for word.
STOPTHINK = {}

# ── targeted pairs ───────────────────────────────────────────────────────────
# (find, replace, expected match count) applied to every string of that topic.
REPLACE = {}


# ═════════════════════════════════════════════════════════════════ 1.1 ════════
WARMUP['1.1'] = {
 1: ('The sandwich algorithm',
     'Write the instructions for making a peanut butter sandwich for a machine '
     'that does exactly what it is told and nothing more.',
     'Every list has a step that assumes something. "Spread the peanut butter" '
     'assumes the jar is open and the knife is already in hand. That gap is the '
     'difference between instructions for a person, who fills gaps '
     'automatically, and an algorithm for a machine, which fills none. The order '
     'of the steps is sequencing, and a precise ordered list of steps is an '
     'algorithm.', None),
 2: ('Retrieval on Day 1',
     'Three questions, no notes: what is an algorithm, what does the compiler '
     'do, and what does compiling successfully not prove?',
     'An algorithm is a finite, unambiguous sequence of steps that solves a '
     'problem. The compiler translates source code into a form the machine can '
     'run, checking it against Java\'s rules on the way. Compiling successfully '
     'proves the code is valid Java and nothing more.', None),
}
WORKED['1.1'] = {
 1: 'An everyday process, numbered, with two of its steps swapped. The swap is '
    'what makes sequencing concrete: the same steps in a different order stop '
    'producing the same result.',
 2: 'One failure of each kind. The question that sorts them is when the failure '
    'surfaces: compile time means syntax, a stop partway through means run-time '
    'or an exception, and complete but wrong output means logic.',
}
EXIT['1.1'] = [
 {'options': ['A syntax error, caught by the compiler', 'A logic error',
              'A run-time error', 'An exception'],
  'answer_index': 1,
  'why': 'The program compiled and ran to the end, so nothing in the tooling '
         'objected. Output that is wrong while the program behaves normally is a '
         'logic error, and it is the only kind no tool reports.'},
 {'options': ['A syntax error', 'A logic error', 'A run-time error', 'An exception'],
  'answer_index': 0,
  'why': 'The compiler checks the code against Java\'s rules, so it catches '
         'syntax errors and nothing else. The other three surface only once the '
         'program is running, or not at all.'},
 {'free': True,
  'why': 'The CED lists written language and diagrams as valid representations. '
         'A flowchart and a numbered list are both algorithms, and nothing '
         'requires an algorithm to be code.'},
]
INDEPENDENT['1.1'] = (
 'Error classification away from the computer. Exercise 2 in this lesson\'s '
 'Supplements folder is the find-and-fix set: each item carries its own '
 'program, and the key names the defect and gives the fix.')
HOMEWORK['1.1'] = [
 'Vocabulary: write the eight terms with definitions in your own words (no '
 'copying), one example each.',
 'Exercise 1 from this lesson\'s Supplements folder: for each program, decide '
 'compiles or not, and if it compiles write the exact output.',
 'Optional online: replay the 1.1 editor exercise and the Bug Hunt game on the '
 'lesson page (Unit 1 Link Sheet, row 1.1).',
]
REPLACE['1.1'] = [
 ('Two cold-call questions, then set the vocabulary homework. Do not start the '
  'error types today; they need a full block.',
  'The error types are a full block of their own and start on the next day.', 1),
]

# ═════════════════════════════════════════════════════════════════ 1.2 ════════
WARMUP['1.2'] = {
 1: ('Three quantities, three types',
     'A school app tracks how many students are in the room, the average score '
     'on the last quiz, and whether the fire alarm is armed. Name what kind of '
     'value each one is and give a sample value, with no Java yet.',
     'The second one is where it lands: the average of 87, 90 and 92 is 89.666, '
     'so whole numbers are not enough. The three Java types match what the room '
     'has already said. int for counts, double for measurements that can carry a '
     'fractional part, boolean for armed or not armed. The types got chosen '
     'before any syntax, because the data decides the type.', None),
 # The original asked for FOUR primitives and for a range trap. Its own day 1
 # says AP CSA uses exactly three, and range is Topic 1.5.
 2: ('Retrieval on the previous day',
     'Name the three primitive types this course uses, and say what each one '
     'holds.',
     'int for whole numbers, double for numbers with a fractional part, and '
     'boolean for exactly true or false. The five Java primitives outside that '
     'set, long, short, byte, float and char, are out of scope and appear on '
     'practice items only as distractors.', None),
}
WORKED['1.2'] = {
 1: 'One variable of each primitive type, declared and printed. The int and '
    'double split is the whole topic, and what a declaration reserves is easier '
    'to see before any arithmetic is in the way.',
 2: 'A declaration that compiles and one that does not, side by side. The '
    'compiler objects to exactly one of the two lines, and naming which one '
    'before running it is the skill.',
}
EXIT['1.2'] = [
 {'options': ['double average = 88.5;', 'boolean armed = true;',
              'int laps = 2.5;', 'int count = 7;'],
  'answer_index': 2,
  'why': 'An int cannot hold a double literal. Java reports a possible lossy '
         'conversion at compile time rather than storing 2, so nothing runs and '
         'nothing is rounded.'},
 {'options': ['int', 'double', 'boolean', 'String'],
  'answer_index': 0,
  'why': 'A lap count is a whole number, and half a lap is not a value the '
         'specification allows. Picking a wider type just in case is scored '
         'wrong on this exam even where it would be reasonable engineering.'},
 {'options': ['It prints 0', 'It prints an unpredictable value',
              'It does not compile',
              'It compiles and throws an exception at run time'],
  'answer_index': 2,
  'why': 'A local variable has no default, so reading total before assigning it '
         'is caught at compile time. The zero-default rule belongs to instance '
         'variables, which come later in the course.'},
]
INDEPENDENT['1.2'] = (
 'Declaration drill and type selection away from the computer. Exercise 2 in '
 'this lesson\'s Supplements folder is the find-and-fix set, and every item '
 'carries its own program.')
HOMEWORK['1.2'] = [
 'Vocabulary: write all nine terms with definitions in your own words, plus one '
 'example of each of the three primitive types.',
 'Exercise 1 from this lesson\'s Supplements folder: for each declaration, write '
 'the variable name, the type, the value stored, and COMPILES or DOES NOT '
 'COMPILE with a reason.',
 'Explain in three to five sentences why "true" is not the same as true in Java, '
 'using the words String, primitive, and static type checking.',
 'Optional online: replay the 1.2 editor exercise and the Variables Bug Hunt '
 'game (Unit 1 Link Sheet, row 1.2).',
]
REPLACE['1.2'] = [
 ('Say boolean values out loud correctly: true and false, lowercase, no quotes.',
  'Boolean values are written true and false, lowercase and unquoted.', 1),
]

# ═════════════════════════════════════════════════════════════════ 1.3 ════════
WARMUP['1.3'] = {
 1: ('Predict, then defend',
     'Write down exactly what each line prints, with nothing running yet.',
     'The answers are 3, 3.5 and 0. When both operands of / are int, Java throws '
     'the decimal portion away rather than rounding, so 1 / 4 is 0 and not 0.25. '
     'This single rule shows up on nearly every released exam.',
     'System.out.println(7 / 2);\nSystem.out.println(7.0 / 2);\n'
     'System.out.println(1 / 4);'),
 2: ('Retrieval on the previous day',
     'Evaluate three mixed-type expressions cold, and say which of them produce '
     'an int.',
     'The one to watch for is anyone reading 7 / 2 as 3.5. Two int operands give '
     'an int, and one double operand anywhere in the division makes the whole '
     'division double division.', None),
}
WORKED['1.3'] = {
 1: 'An integer-division expression evaluated one operator at a time. The wrong '
    'answer is the interesting one, because it is the one the exam offers as a '
    'distractor.',
 2: 'A compound expression traced left to right, with the whole expression '
    'rewritten after each step. Holding four operations at once is what produces '
    'the wrong answer.',
}
EXIT['1.3'] = [
 {'options': ['31.25 then 2', '31 then 2', '31 then 0.25', '32 then 2'],
  'answer_index': 1,
  'why': '250 / 8 is int division and truncates to 31, and 250 % 8 is the '
         'remainder 2. Both operands are int in both expressions, so neither '
         'result carries a fractional part.'},
 {'options': ['89', '88', '91', '100'],
  'answer_index': 0,
  'why': 'Multiply, divide and remainder run first, left to right: 4 * 3 is 12, '
         '24 / 8 is 3, and 3 % 2 is 1. Then 100 - 12 + 1 is 89.'},
 {'options': ['I only', 'II only', 'I and III only', 'I, II and III'],
  'answer_index': 2,
  'why': 'Dividing an int by the int zero throws, and % with a zero divisor '
         'throws for the same reason. Dividing a double by zero produces '
         'Infinity and is out of scope.'},
]
INDEPENDENT['1.3'] = (
 'Prediction drills away from the computer. Exercise 2 in this lesson\'s '
 'Supplements folder is the find-and-fix set: five programs, each with one '
 'defect to name and fix.')
HOMEWORK['1.3'] = [
 'Exercise 1 from this lesson\'s Supplements folder: write the value and the '
 'result type for each expression, then one sentence explaining any that '
 'surprised you.',
 'Output layout: given four segments mixing print and println with backslash-n, '
 'draw the exact screen output including any blank lines.',
 'Write-your-own trap: compose one expression whose correct value is different '
 'from what a careless student would say, then show the full step-by-step '
 'evaluation underneath.',
 'Vocabulary: the eight terms with definitions and one example each; for integer '
 'division and modulo, use numbers not used in class.',
 'Optional online: replay the Output Predictor game (Unit 1 Link Sheet, row 1.3) '
 'until you score at least five of six.',
]
REPLACE['1.3'] = []

# ═════════════════════════════════════════════════════════════════ 1.4 ════════
WARMUP['1.4'] = {
 1: ('The swap that does not swap',
     'This is supposed to swap the two values so it prints 9 5. Trace it line by '
     'line and write down what it actually prints.',
     'It prints 9 9. After a = b the 5 that was in a is gone, overwritten, so '
     'b = a reads the current value of a, which is now 9. The repair needs a '
     'third variable: int temp = a; a = b; b = temp; That is the swap the exam '
     'expects, and it is worth memorizing today.',
     'int a = 5;\nint b = 9;\na = b;\nb = a;\n'
     'System.out.println(a + " " + b);'),
 2: ('Retrieval on the previous day',
     'What does an assignment statement do, in order, starting from the right '
     'side?',
     'It evaluates the whole right side to a single value, then stores that '
     'value in the variable on the left, replacing whatever was there. The old '
     'value is not recoverable, which is exactly why the two-line swap loses '
     'one.', None),
}
WORKED['1.4'] = {
 1: 'A Scanner read end to end, including the case where the input type does not '
    'match the method that was called. The mismatch case is the one worth '
    'having.',
 2: 'An uninitialized local variable that the compiler refuses. This is the '
    'difference between a local and a field, and it is a compile-time refusal '
    'rather than a zero.',
}
EXIT['1.4'] = [
 {'options': ['7', '14', '12', '24'],
  'answer_index': 1,
  'why': 'One line at a time: 12, then 7, then 14. Every distractor here is the '
         'value after the wrong number of steps, which is how these items are '
         'built.'},
 {'options': ['I only', 'I and II only', 'III only', 'II and III only'],
  'answer_index': 3,
  'why': 'null means no object is associated with a reference variable, so it is '
         'legal for String and illegal for both primitives.'},
 {'options': ['It does not compile', 'It prints 0', 'It prints 4',
              'It throws an exception at run time'],
  'answer_index': 0,
  'why': 'base was declared and never assigned, and a local has no default, so '
         'the compiler rejects the program before anything runs. The distractors '
         'offer 0 and an unpredictable value, and both are wrong.'},
]
INDEPENDENT['1.4'] = (
 'Tracing away from the computer, one trace table per sequence. Exercise 2 in '
 'this lesson\'s Supplements folder is the find-and-fix set.')
HOMEWORK['1.4'] = [
 'Exercise 1 from this lesson\'s Supplements folder: one trace table per '
 'sequence, with the printed value circled and one sentence naming the line '
 'where a careless reader would stop.',
 'Compile-or-not: eight statements to mark COMPILES or ERROR with the rule named '
 '(widening, narrowing, null on a primitive, uninitialized local).',
 'Written explanation, three to five sentences: why does score = score + bonus '
 'work when a math teacher would call it false? Use the words evaluate, store, '
 'and replace.',
 'Vocabulary: the eight terms with definitions in your own words, plus one code '
 'example each for widening and narrowing.',
 'Optional online: replay the Assignment Tracing Output Predictor (Unit 1 Link '
 'Sheet, row 1.4) until you score at least five of six.',
]
REPLACE['1.4'] = [
 ("Read = as 'gets', never as 'equals'. Say it out loud that way all week: "
  "total gets total plus five.",
  "Read = as 'gets', never as 'equals'. Said that way the line is ordinary: "
  "total gets total plus five.", 1),
 ("Students who read = as 'equals' consistently mis-trace multi-step sequences. "
  "Say 'gets' out loud every time.",
  "Students who read = as 'equals' consistently mis-trace multi-step sequences. "
  "Reading it as 'gets' is what fixes them.", 2),
]

# ═════════════════════════════════════════════════════════════════ 1.5 ════════
WARMUP['1.5'] = {
 1: ('Two casts, two answers',
     'Both lines use the same numbers and the same cast. Write down what each '
     'one prints, and if you think they print the same thing, write that down '
     'too.',
     'The first prints 3.5 and the second prints 3.0. In line 1 the cast turns 7 '
     'into 7.0, so the division is double division. In line 2 the parentheses '
     'force 7 / 2 to run first as int division, giving 3, and the cast then '
     'makes it 3.0. The information was already destroyed before the cast ran. '
     'This pair of lines is the most commonly tested idea in the topic.',
     'System.out.println((double) 7 / 2);\n'
     'System.out.println((double)(7 / 2));'),
 # Day 2 and day 3 shared one bell ringer in the original, and it was day 1's.
 2: ('Retrieval on cast scope',
     'Three predictions, no notes: (int) 2.9 + 1.6, (int)(2.9 + 1.6), and '
     '(double)(9 / 2).',
     'They are 3.6, 4 and 4.0. The first cast grabs only 2.9. The second grabs '
     'the whole sum. The third casts a value whose fraction int division had '
     'already discarded.', None),
 3: ('Retrieval on rounding and range',
     'Two questions: what does (int)(x + 0.5) do that a bare (int) x does not, '
     'and what does Java do when an int expression goes past '
     'Integer.MAX_VALUE?',
     'Adding 0.5 before the chop lands one higher when the fractional part is '
     '0.5 or more, which is rounding built by hand and stated for non-negative '
     'values. Going past the maximum wraps silently to the other end of the '
     'range, with no exception and no warning.', None),
}
WORKED['1.5'] = {
 1: 'A double cast to an int, and what became of the fraction. Truncation rather '
    'than rounding is the single highest-value fact in the unit.',
 2: 'One cast with its parentheses moved by a single character, evaluated both '
    'ways. The two forms differ only in where the cast stops applying.',
 3: 'An int pushed one past Integer.MAX_VALUE. The value going negative is what '
    'makes silent wrapping memorable.',
}
EXIT['1.5'] = [
 {'options': ['2.75', '3.0', '2.5', '2.25'],
  'answer_index': 3,
  'why': 'The first cast runs after 5 / 2 has already truncated to 2, giving '
         '2.0. The second casts an operand, so 1.0 / 4 keeps its fraction and '
         'gives 0.25.'},
 {'options': ['It does not compile', 'It throws an ArithmeticException',
              'It prints Integer.MIN_VALUE', 'It prints Integer.MAX_VALUE'],
  'answer_index': 2,
  'why': 'Integer overflow wraps to the other end of the range and reports '
         'nothing. The distractors are always a compile error, an exception, or '
         'promotion to a wider type, and all three are false.'},
 {'free': True,
  'why': 'The bare cast chops 7.9 to 7. Adding 0.5 first gives 8.4, which chops '
         'to 8, and that is the rounding idiom the CED states for non-negative '
         'values.'},
]
INDEPENDENT['1.5'] = (
 'Expression evaluation away from the computer, every item with one exact '
 'answer. Exercise 2 in this lesson\'s Supplements folder is the find-and-fix '
 'set.')
HOMEWORK['1.5'] = [
 'Vocabulary: write all nine terms with definitions in your own words, and give '
 'one example for cast operator, truncation, widening, and integer overflow.',
 'Exercise 1 from this lesson\'s Supplements folder: write the exact value of '
 'each expression and one sentence naming which operand each cast applied to.',
 'Range write-up: from memory, write Integer.MAX_VALUE and Integer.MIN_VALUE, '
 'then answer in complete sentences whether integer overflow throws an exception '
 'and what the resulting value is when Integer.MAX_VALUE is incremented by 1.',
 'Error-spotting: three short segments; for each, decide whether it compiles, '
 'and if it does, write the exact output. One of the three is int n = 6.0; which '
 'does not compile.',
 'Optional online: redo the Tier 3 Mastery Challenge, The Track Team Timer, and '
 'write Part C in full (Unit 1 Link Sheet, row 1.5).',
]
REPLACE['1.5'] = [
 ("Truncation always moves toward zero, so it chops, it never bumps a value up. "
  "Say the word 'chop' out loud when you trace a cast.",
  "Truncation always moves toward zero, so it chops and never bumps a value up. "
  "Chop is the word worth having in mind on every cast.", 1),
 ('When you trace, circle what the cast touches before you compute anything. If '
  'you cannot say out loud which single operand the cast grabbed, you are '
  'guessing.',
  'When you trace, circle what the cast touches before computing anything. '
  'Naming the single operand the cast grabbed is the difference between reading '
  'and guessing.', 1),
 ('This is a place where the cast-scope rule from the previous segment pays for '
  'itself immediately, so make them justify the parentheses out loud.',
  'The cast-scope rule from the previous segment pays for itself here: the outer '
  'parentheses are the whole reason the formula rounds.', 1),
]

# ═════════════════════════════════════════════════════════════════ 1.6 ════════
WARMUP['1.6'] = {
 1: ('Does this add nothing?',
     'Write down what this prints. Then write one sentence saying what n += n '
     'means in words, without using the += symbol.',
     'It prints 12, because n += n expands to n = n + n, which is 6 + 6. The two '
     'common wrong answers are 6, from reading it as adding nothing to n, and 7, '
     'from confusing it with n++. The rule that carries the whole lesson: every '
     'compound operator expands to variable = variable OPERATOR value, and the '
     'right side is evaluated using the current value of the variable before '
     'anything is stored back.',
     'int n = 6;\nn += n;\nSystem.out.println(n);'),
}
WORKED['1.6'] = {
 1: 'x += 3 written out as x = x + 3. The compound form hides an assignment, and '
    'writing the expanded form in the margin removes almost every mistake on '
    'this topic.',
}
EXIT['1.6'] = [
 {'options': ['1', '25', '5', '8'], 'answer_index': 2,
  'why': 'k becomes 5, then 25, then 25 / 5 which is 5. Each distractor is the '
         'value after the wrong number of steps, which is how these items are '
         'built.'},
 {'options': ['100', '25', '10', '50'], 'answer_index': 0,
  'why': 'num += num doubles it to 10, then num *= num squares that to 100. '
         'Reading += as adding one produces 25 and 36, which is why both are '
         'offered.'},
 {'free': True,
  'why': 'The type of the variable decides the division, not the operator. An '
         'int on the left means int division, so the remainder is discarded.'},
]
INDEPENDENT['1.6'] = (
 'Trace-table drill away from the computer, every item with one exact answer. '
 'Exercise 2 in this lesson\'s Supplements folder is the find-and-fix set.')
HOMEWORK['1.6'] = [
 'Vocabulary: write the four terms with definitions in your own words, plus the '
 'expanded form of all five compound operators.',
 'Exercise 1 from this lesson\'s Supplements folder: show the variable value '
 'after every statement and the final printed output.',
 'Write and predict: create your own four-statement sequence starting from '
 'int p = 24 that uses at least one /= and one %=, then trace it and state the '
 'final value.',
 'Short answer: explain in two sentences why n += n is not the same as n++, '
 'using n = 6 as the example.',
 'Optional online: redo the Tier 3 Mastery Challenge and write Part C in full '
 '(Unit 1 Link Sheet, row 1.6).',
]
REPLACE['1.6'] = []

# ═════════════════════════════════════════════════════════════════ 1.7 ════════
WARMUP['1.7'] = {
 1: ('You already used code you have never read',
     'This prints 4.0, and nobody here has seen the code inside Math.sqrt. In '
     'two sentences, explain how you can be confident it gives the right answer, '
     'and say what you would need to know before using a method called Math.cbrt '
     'that you have also never seen.',
     'The answer is the documentation. That documentation is the API '
     'specification, and using a method by its documented behavior rather than '
     'its implementation is procedural abstraction. The three things any '
     'unfamiliar method needs are the same every time: what it needs '
     '(parameters), what it gives back (return type), and what it promises to '
     'do. AP supplies a Java Quick Reference during the exam for exactly this '
     'reason.',
     'System.out.println(Math.sqrt(16));'),
}
WORKED['1.7'] = {
 1: 'One method looked up in the Java API documentation and read through the '
    'three questions: what it needs, what it gives back, and what it promises. '
    'Students who have never opened the documentation treat it as off limits.',
}
EXIT['1.7'] = [
 {'options': ['name', 'grade level', 'getGPA()', 'Student'], 'answer_index': 2,
  'why': 'Variables are attributes and methods are behaviors, with no '
         'exceptions. The description says stores for the first two and can '
         'report for the third.'},
 {'options': ['It needs two doubles and returns a double',
              'It needs two ints and returns an int',
              'It needs one double and returns a double',
              'It returns nothing, because pow modifies its first argument'],
  'answer_index': 0,
  'why': 'Read the line in three parts: the parameter list says what it needs, '
         'the word before the name says what it gives back, and the description '
         'says what it promises.'},
 {'free': True,
  'why': 'Classes in java.lang are available by default. Classes in any other '
         'package normally need an import statement first.'},
]
INDEPENDENT['1.7'] = (
 'Documentation reading and member classification away from the computer, '
 'working from printed class descriptions. Exercise 2 in this lesson\'s '
 'Supplements folder is the find-and-fix set.')
HOMEWORK['1.7'] = [
 'Vocabulary: write the six terms with definitions in your own words and one '
 'example each.',
 'Exercise 1 from this lesson\'s Supplements folder: for each documentation '
 'line, write what the method needs, what it returns, and one legal call.',
 'Classification: sort the fourteen members of two printed class descriptions '
 'into attributes and behaviors, with a justification word for each.',
 'Short answer: a teammate says using a class you did not write is risky. In '
 'three to five sentences, explain why the API specification makes it safe, '
 'naming procedural abstraction and listing what the documentation provides.',
 'Optional online: redo the Tier 3 Mastery Challenge, The Library Card System, '
 'and write Part C in full (Unit 1 Link Sheet, row 1.7).',
]
REPLACE['1.7'] = []

# ═════════════════════════════════════════════════════════════════ 1.8 ════════
WARMUP['1.8'] = {
 1: ('Does the comment run?',
     'Write down the exact number that prints.',
     'It prints 20. The compiler strips the // line out before it reads a single '
     'instruction, so score is 10 and then 10 * 2 is 20. Anyone who answered 30 '
     'executed the comment in their head. A comment is text for humans, and the '
     'compiler never runs it.',
     'int score = 10;\n// score = score + 5;\nscore = score * 2;\n'
     'System.out.println(score);'),
}
WORKED['1.8'] = {
 1: 'An uncommented method, then the same method with a precondition and a '
    'postcondition written above it. The second version says what the caller has '
    'to guarantee and what the method promises in return.',
}
EXIT['1.8'] = [
 {'options': ['4', '5', '15', 'It does not compile'], 'answer_index': 1,
  'why': 'The block comment is removed before compilation, so only x = x + 1 '
         'runs. Answering 15 means executing the comment, and the exam builds '
         'its distractors from exactly that arithmetic.'},
 {'options': ['The method checks index and throws when it is out of range',
              'The method quietly clamps index into range',
              'The caller must guarantee index is in range, and the method is '
              'not expected to check',
              'The postcondition still holds when index is out of range'],
  'answer_index': 2,
  'why': 'A precondition is a contract the caller satisfies. There is no '
         'expectation that the method verifies it, so any choice where the '
         'method polices its own inputs is wrong by definition.'},
 {'options': ['I only', 'I and II only', 'II and III only', 'I, II and III'],
  'answer_index': 3,
  'why': 'The CED names all three forms. Javadoc is special to the javadoc tool '
         'rather than to the compiler, which discards it like any other '
         'comment.'},
]
INDEPENDENT['1.8'] = (
 'Documentation writing away from the computer, working from method headers. '
 'Exercise 2 in this lesson\'s Supplements folder is the find-and-fix set.')
HOMEWORK['1.8'] = [
 'Vocabulary: write all six terms with definitions in your own words, plus one '
 'original example of each comment type.',
 'Exercise 1 from this lesson\'s Supplements folder: replace each vague one-line '
 'comment with a proper Javadoc block including @param, @return where needed, a '
 'precondition, and a postcondition.',
 'Trace and explain: for each brief segment mixing real statements with '
 'commented-out ones, write the exact output and circle every line the compiler '
 'deletes.',
 'Contract analysis: for public static double root(double n) with precondition '
 'n >= 0, write four sentences on what the method may do if someone calls '
 'root(-9.0) and why that is not the method\'s fault.',
 'Optional online: replay the 1.8 Tier 2 practice set (Unit 1 Link Sheet, row '
 '1.8) and record any question you missed with a one-line reason.',
]
REPLACE['1.8'] = []

# ═════════════════════════════════════════════════════════════════ 1.9 ════════
WARMUP['1.9'] = {
 1: ('Did the method change my variable?',
     'Write down the number that prints.',
     'It prints 50. addTen received a copy of the value 50 in its own variable n, '
     'added ten to that copy, and the copy vanished when the method ended. The '
     'variable score was never touched. This is call-by-value, and it is the '
     'most tested trap in Unit 1.',
     'public static void addTen(int n) {\n    n += 10;\n}\n\n'
     'int score = 50;\naddTen(score);\nSystem.out.println(score);'),
 2: ('Retrieval on the previous day',
     'What makes two method signatures different, and what does not?',
     'The name and the ordered list of parameter types make them different. The '
     'return type, the modifiers and the parameter names do not, which is why '
     'two methods differing only in return type are a compile error.', None),
}
WORKED['1.9'] = {
 1: 'Three overloaded signatures and which call resolves to which. The return '
    'type is not part of the signature, and that is where the trap is.',
 2: 'A call whose arguments are in the wrong order, failing at compile time. '
    'Number, order and type all have to match, and order is the one that still '
    'compiles when the two types happen to be compatible.',
}
EXIT['1.9'] = [
 {'options': ['double convert(int, double)', 'convert(int, double)',
              'convert(int amount, double rate)',
              'public static double convert(int, double)'],
  'answer_index': 1,
  'why': 'The signature is the name plus the ordered parameter types. The return '
         'type, the modifiers and the parameter names are all outside it, and '
         'each distractor adds one of them back.'},
 {'options': ['3', '6', '0', 'It does not compile'], 'answer_index': 0,
  'why': 'The parameter is a copy. Assigning to it changes the method\'s own '
         'copy, and the caller\'s variable is untouched, always, for int, double '
         'and boolean.'},
 {'options': ['It does not compile, because the return types differ',
              'It does not compile, because the two methods share a name',
              'It compiles: the signatures differ in parameter type, so the '
              'methods are overloaded',
              'It compiles, but a call to shift(3) is ambiguous'],
  'answer_index': 2,
  'why': 'The signatures are shift(int) and shift(double), which differ, so this '
         'is ordinary overloading. Two methods differing ONLY in return type '
         'would be the compile error.'},
]
INDEPENDENT['1.9'] = (
 'Signature writing and call tracing away from the computer. Exercise 2 in this '
 'lesson\'s Supplements folder is the find-and-fix set.')
HOMEWORK['1.9'] = [
 'Vocabulary: all ten terms defined in your own words. For parameter and '
 'argument, include one code line each showing the term in place.',
 'Exercise 1 from this lesson\'s Supplements folder: for every program, write '
 'the exact output and mark whether each method is void or value-returning.',
 'Signature drill: rewrite twelve method headers as signatures. Then answer in a '
 'sentence why the return type is excluded and what would break if it were '
 'included.',
 'Exercise 2 from this lesson\'s Supplements folder: for each broken call, write '
 'compiles or does not compile, and if it does not, name the reason (wrong '
 'count, wrong order, or narrowing).',
 'Write-and-predict: design a value-returning method perimeter(double w, double '
 'h) and a void method report(double p). Write a main that calls both, then '
 'write the exact output your program would produce.',
 'Optional online: replay the 1.9 Java editor exercises and the Tier 2 set (Unit '
 '1 Link Sheet, row 1.9).',
]
REPLACE['1.9'] = []

# ═════════════════════════════════════════════════════════════════ 1.10 ═══════
WARMUP['1.10'] = {
 1: ('Two lines, one compiles',
     'One of these two lines does not compile. Write down which one and why '
     'before saying it.',
     'The first one does not compile. Math.sqrt always returns a double, and '
     'storing a double in an int is a narrowing conversion Java refuses without '
     'an explicit cast, so int root = (int) Math.sqrt(64.0); is the fix and it '
     'stores 8. The second line is fine and stores 256.0. To use a class method '
     'correctly you have to know its return type, not just its name.',
     'int root = Math.sqrt(64.0);\ndouble p = Math.pow(2, 8);'),
 2: ('Retrieval on the previous day',
     'Static versus instance: which one needs an object before it can be called?',
     'An instance method does. A class method is called on the class name and '
     'needs no object, which is why Math.sqrt works and new Math() does not '
     'even compile.', None),
}
WORKED['1.10'] = {
 1: 'A static method called with the class name and then without it, from inside '
    'and from outside the declaring class. Only one of the two forms compiles '
    'from outside.',
 2: 'A Math call with another call nested inside it, evaluated innermost first. '
    'The inner result becomes the outer argument, exactly like nested '
    'parentheses in arithmetic.',
}
EXIT['1.10'] = [
 {'options': ['I only', 'II only', 'I and III only', 'I, II and III'],
  'answer_index': 2,
  'why': 'Math cannot be instantiated: its constructor is private, so '
         'new Math().sqrt(9.0) is a compile error. Class methods are called on '
         'the class name with the dot operator.'},
 {'options': ['It stores 9', 'It stores 9.0',
              'It does not compile without a cast',
              'It throws an exception at run time'],
  'answer_index': 2,
  'why': 'Math.sqrt returns a double, and a double does not fit into an int '
         'without an explicit cast. (int) Math.sqrt(81.0) stores 9.'},
 {'options': ['(int)(Math.random() * 12) + 4', '(int)(Math.random() * 9) + 4',
              '(int)(Math.random() * 8) + 4', '(int)(Math.random() * 4) + 12'],
  'answer_index': 1,
  'why': 'The multiplier is the count of values, 12 - 4 + 1 = 9, and the addend '
         'is the smallest value wanted. Substituting 0.0 gives 4 and '
         'substituting just under 1.0 gives 12.'},
]
INDEPENDENT['1.10'] = (
 'Class-method value and range work away from the computer. Exercise 2 in this '
 'lesson\'s Supplements folder is the find-and-fix set.')
HOMEWORK['1.10'] = [
 'Vocabulary: all eight terms in your own words. For each of the four Math '
 'methods, also write its return type on the same line.',
 'Exercise 1 from this lesson\'s Supplements folder: write the exact value and '
 'the exact type of each class-method call, and mark the ones whose value could '
 'be stored in an int without a cast.',
 'Range problems: write the expression for six stated ranges, then for each '
 'write the two endpoint checks (what happens when Math.random() returns 0.0, '
 'and what happens when it returns just under 1.0).',
 'Exercise 2 from this lesson\'s Supplements folder: for each broken line, name '
 'the error and write the corrected line.',
 'Write-and-predict: write a static method scoreDistance(double s) that returns '
 'Math.abs(s - 100.0), then write three calls and state the exact printed output '
 'of each.',
 'Optional online: replay the 1.10 Output Predictor and Bug Hunt games (Unit 1 '
 'Link Sheet, row 1.10) and log every item you missed.',
]
REPLACE['1.10'] = [
 ('Draw the boundary out loud now: methods that are called on an OBJECT rather '
  'than on a class name are instance methods, and they are topic 1.14.',
  'The boundary is worth naming now: methods called on an OBJECT rather than on '
  'a class name are instance methods, and they are topic 1.14.', 1),
]

# ═════════════════════════════════════════════════════════════════ 1.11 ═══════
WARMUP['1.11'] = {
 1: ('Order matters',
     'Write the exact output of each line. Exact means every character that '
     'would appear on the screen, with no calculators.',
     'Line 1 prints 256.0 and line 2 prints 64.0. Two facts fall out of that. '
     'Math.pow(base, exponent) takes the base first, so swapping the arguments '
     'changes the answer. And neither result prints without the .0, because '
     'Math.pow always hands back a double. Those two facts are the whole first '
     'half of the topic.',
     'System.out.println(Math.pow(2, 8));\nSystem.out.println(Math.pow(8, 2));'),
 2: ('Retrieval on the previous day',
     'Give the range of Math.random() and the formula for a random int from min '
     'to max inclusive.',
     'Math.random() returns a double from 0.0 up to but not including 1.0. The '
     'formula is (int)(Math.random() * (max - min + 1)) + min: the multiplier is '
     'the count of values and the addend is the smallest value wanted.', None),
}
WORKED['1.11'] = {
 1: 'Math.random() called several times, with the range pinned down at both '
    'ends. 0.0 is possible and 1.0 never comes out, and that half-open interval '
    'is the whole point.',
 2: 'The random-int-in-a-range formula built up from the range of Math.random() '
    'rather than handed over finished. Deriving it is what stops the multiplier '
    'and the addend from being two memorized numbers.',
}
EXIT['1.11'] = [
 {'options': ['10', '10.0', '100.0', 'It does not compile'], 'answer_index': 1,
  'why': 'Innermost first: 36.0 and 64.0, added to 100.0, and sqrt gives 10.0. '
         'Every intermediate value is a double, so the printed result carries '
         'the decimal point.'},
 {'options': ['It does not compile without a cast', 'It stores 64',
              'It stores 64.0', 'It throws an exception at run time'],
  'answer_index': 0,
  'why': 'Math.pow returns a double every time, and a double does not fit into '
         'an int without an explicit cast. int result = (int) Math.pow(4, 3); '
         'stores 64.'},
 {'options': ['6', '7', '8', '2'], 'answer_index': 1,
  'why': 'Math.random() never reaches 1.0, so the product never reaches 6 and '
         'the cast gives 0 through 5. Adding 2 puts the range at 2 through 7.'},
]
INDEPENDENT['1.11'] = (
 'Exact values and exact ranges away from the computer, with the four-method '
 'table and a pencil. Exercise 2 in this lesson\'s Supplements folder is the '
 'find-and-fix set.')
HOMEWORK['1.11'] = [
 'Vocabulary: write the nine terms with definitions in your own words. For each '
 'of the four Math methods include one call and its exact returned value, with '
 'the correct type.',
 'Exercise 1 from this lesson\'s Supplements folder: for each expression write '
 'the printed output exactly as it would appear, or compile error plus a '
 'one-line reason. Decimal points count as part of the answer.',
 'Range analysis: for five random expressions, show the substitution of 0.0 and '
 'of 0.9999 and give the minimum, the maximum, and the count of possible '
 'values.',
 'Write and predict: on paper, write four lines that compute the hypotenuse of a '
 'right triangle with legs 9.0 and 12.0 using nested Math calls, and state the '
 'exact output. Then rewrite it so the hypotenuse is stored in an int and say '
 'what you had to add.',
 'Optional online: replay the Output Predictor and Bug Hunt games on the lesson '
 'page (Unit 1 Link Sheet, row 1.11) until you catch all seven bugs.',
]
REPLACE['1.11'] = []

# ═════════════════════════════════════════════════════════════════ 1.12 ═══════
WARMUP['1.12'] = {
 1: ('Follow the address',
     'Write the exact output, then one sentence explaining why.',
     'It prints hello. Most rooms split between hello and world, and the '
     'argument that follows is the entire lesson. Line 2 did not copy the '
     'letters into b, it copied the address a was holding, so both names pointed '
     'at one object. Line 3 pointed a at a different object and never touched b. '
     'A reference variable stores where the object is, not what the object '
     'contains.',
     'String a = "hello";\nString b = a;\na = "world";\n'
     'System.out.println(b);'),
 2: ('Retrieval on the previous day',
     'What does a reference variable actually hold?',
     'An address: where the object is, not what the object contains. Copying a '
     'reference copies the address, so both variables lead to the same single '
     'object, and that is what makes aliasing behave differently from copying '
     'an int.', None),
}
WORKED['1.12'] = {
 1: 'Two variables, one object, and a change made through one of them. The '
    'picture is two boxes on the left and one object on the right, and the '
    'change shows up through both names.',
 2: 'An object reference holding null, in the scope where that is legal, and the '
    'call that fails on it. The compiler accepts the call because it checks the '
    'type; the failure waits until run time.',
}
EXIT['1.12'] = [
 {'options': ['A class is one instance of an object',
              'An object is the code and a class is the data',
              'A class is the definition, and an object is one instance created '
              'from it',
              'A class and an object are two words for the same thing'],
  'answer_index': 2,
  'why': 'The class specifies the attributes and behaviors; each object is one '
         'instance with its own attribute values. Instance and object mean the '
         'same thing, and the exam uses both words in one question.'},
 {'options': ['The characters that make up the object',
              'A complete copy of the object',
              'Zero, until an object is assigned to it',
              'The address where the object is stored'],
  'answer_index': 3,
  'why': 'A primitive variable holds its value directly, and a reference '
         'variable records where the object is. That difference is why copying '
         'a reference produces two names for one object.'},
 {'options': ['It prints start, then throws a NullPointerException',
              'It does not compile', 'It prints start and then 0',
              'It prints start and then an empty line'],
  'answer_index': 0,
  'why': 'The compiler only checks that String has a length method, so the code '
         'builds. The failure is at run time, which means the output before it '
         'really did print.'},
]
INDEPENDENT['1.12'] = (
 'Reference tracing and diagramming away from the computer, with boxes and '
 'stand-in addresses. Exercise 2 in this lesson\'s Supplements folder is the '
 'find-and-fix set.')
HOMEWORK['1.12'] = [
 'Vocabulary: write the ten terms with definitions in your own words, and for '
 'class, object, reference variable, and null give one line of Java that '
 'illustrates the term.',
 'Exercise 1 from this lesson\'s Supplements folder: for each snippet, draw the '
 'variable boxes with their contents on the left and any objects on the right '
 'with stand-in addresses, and label every case of aliasing.',
 'Exercise 2 from this lesson\'s Supplements folder: for each snippet, fill in '
 'what every variable holds after each line and give the exact output.',
 'Write and predict: on paper, write four lines that create two String variables '
 'referring to the same object, then reassign one of them, then print both. '
 'State the exact output and explain in one sentence why the second variable did '
 'not change.',
 'Optional online: replay the Output Predictor and Bug Hunt games on the lesson '
 'page (Unit 1 Link Sheet, row 1.12) until you can predict all six outputs on '
 'the first try.',
]
REPLACE['1.12'] = []

# ═════════════════════════════════════════════════════════════════ 1.13 ═══════
WARMUP['1.13'] = {
 1: ('Build me one of each',
     'Here is a class somebody else wrote. Write one line that creates a Box '
     'whose size is 12, then one line that creates a Box using the other '
     'constructor.',
     'The two lines are Box b = new Box(12); and Box c = new Box(); The first '
     'has four parts: the type Box, the variable name b, the keyword new, and '
     'the constructor call Box(12). What told Java which constructor to run was '
     'the argument list and nothing else. And compared with every other method '
     'so far, both constructor headers are missing something: there is no return '
     'type, not even void.',
     'class Box {\n    int size;\n    Box() {\n        size = 1;\n    }\n'
     '    Box(int s) {\n        size = s;\n    }\n}'),
 2: ('Retrieval on the previous day',
     'What are the three things that happen when you call new?',
     'Memory is allocated for a new object, the constructor runs and fills in '
     'that object\'s attributes, and the reference to the finished object is '
     'handed back to be stored. The line after the creation statement does not '
     'start until all three have happened.', None),
}
WORKED['1.13'] = {
 1: 'new, then the constructor, then the reference assignment, in that order. '
    'Declaring and instantiating are two separate events and they get conflated '
    'constantly.',
 2: 'Two constructors on one class and which one a given call selects. The '
    'argument list decides it, and nothing else does.',
}
EXIT['1.13'] = [
 {'options': ['Box b = Box(5);', 'Box b = new Box();', 'Box b = new Box(5);',
              'Box b = new Box(5.0);'],
  'answer_index': 2,
  'why': 'Object creation needs the keyword new and a constructor call whose '
         'arguments match a signature. Box(5.0) passes a double to an int '
         'parameter, which is a narrowing conversion Java refuses.'},
 {'options': ['I only', 'II only', 'III only', 'I and III only'],
  'answer_index': 1,
  'why': 'A constructor has no return type at all, not even void. Adding one '
         'turns it into an ordinary method, so calls with new stop matching it.'},
 {'options': ['10', '1', '99', 'It does not compile'], 'answer_index': 2,
  'why': 'Box b = a; copies the reference rather than the object, so both names '
         'lead to one object. Count the new calls to count the objects: there is '
         'one.'},
]
INDEPENDENT['1.13'] = (
 'Instantiation practice on paper, working from printed class definitions. '
 'Exercise 2 in this lesson\'s Supplements folder is the find-and-fix set.')
HOMEWORK['1.13'] = [
 'Vocabulary: write the ten terms with definitions in your own words. For '
 'constructor, constructor signature, overloaded constructors, and new, include '
 'one line of Java that illustrates the term.',
 'Exercise 1 from this lesson\'s Supplements folder: write the complete creation '
 'statement for each scenario and label the four parts on the first three.',
 'Signature matching: given three overloaded constructors, decide for each of '
 'eight calls which signature it matches, or write does not compile with a '
 'one-line reason.',
 'Exercise 2 from this lesson\'s Supplements folder: for the aliasing snippet, '
 'fill in a row per line, give the exact output, and write one sentence stating '
 'how many objects exist and why.',
 'Write and predict: on paper, write four lines that create two objects of the '
 'same class with the same starting values, then change one of them, then print '
 'both. State the exact output and explain in one sentence why the second object '
 'did not change.',
 'Optional online: replay the Output Predictor and Bug Hunt games on the lesson '
 'page (Unit 1 Link Sheet, row 1.13) until you catch all seven bugs.',
]
REPLACE['1.13'] = []

# ═════════════════════════════════════════════════════════════════ 1.14 ═══════
WARMUP['1.14'] = {
 1: ('Two calls, spot every difference',
     'Both lines call a method. List every difference you can see between the '
     'two calls, with nothing looked up.',
     'The difference that matters is what sits to the left of the dot. Math is a '
     'class name and greeting is a variable holding an object. Math.max can '
     'answer from its arguments alone; length() cannot, because the answer '
     'depends on which String greeting is, so Java requires you to name one. '
     'Class methods are called on the class, instance methods on an object '
     'reference.',
     'int big = Math.max(3, 8);\nint len = greeting.length();'),
 2: ('Retrieval on the previous day',
     'Why does an instance method need an object when a static method does not?',
     'Because the answer depends on which object you asked. A static method '
     'works from its arguments alone and has no object state to read or change, '
     'so there is nothing for an object to hold.', None),
}
WORKED['1.14'] = {
 1: 'One instance method called on two different objects of the same class, '
    'giving two different results. Same code, different state, and that is what '
    'the object is for.',
 2: 'A method call chained onto a returned object, traced left to right. The '
    'left call finishes and hands back the object the right call runs on.',
}
EXIT['1.14'] = [
 {'options': ['c.getCount();', 'int now = c.getCount();',
              'int now = Counter.getCount();', 'int now = c.increment();'],
  'answer_index': 1,
  'why': 'A value-returning call has to be stored or used, an instance method '
         'needs a reference rather than the class name to its left, and '
         'increment is void so there is nothing to assign.'},
 {'options': ['It does not compile', 'It prints 0',
              'It throws a NullPointerException at run time',
              'It prints an empty line'],
  'answer_index': 2,
  'why': 'The compiler checks the declared type, not the value, so the call is '
         'legal Java. At run time there is no object to run the method on, which '
         'is a run-time error and specifically an exception.'},
 {'options': ['6', '7', '0', 'It does not compile'], 'answer_index': 1,
  'why': 'b = a copies the reference, so both names are one object. The '
         'increment through b is visible through a, because there is only one '
         'object in memory.'},
]
INDEPENDENT['1.14'] = (
 'Trace-and-predict work on paper against the Counter class, whose definition is '
 'printed with the items. Exercise 2 in this lesson\'s Supplements folder is the '
 'find-and-fix set.')
HOMEWORK['1.14'] = [
 'Vocabulary: write instance method, object reference, dot operator, state, '
 'argument, null, NullPointerException, and alias in your own words with one '
 'example each.',
 'Exercise 1 from this lesson\'s Supplements folder: for each program, write '
 'compiles or does not compile, and if it compiles write the exact output or '
 'name the exception thrown.',
 'Write-and-predict: invent a Locker class with an attribute and three instance '
 'methods (one void, one value-returning, one taking an argument), then write '
 'four calls on one object and the exact output. You are writing the calls, not '
 'the class body.',
 'Optional online: replay the 1.14 Output Predictor game until you score 6 of 6 '
 '(Unit 1 Link Sheet, row 1.14).',
]
REPLACE['1.14'] = []

# ═════════════════════════════════════════════════════════════════ 1.15 ═══════
WARMUP['1.15'] = {
 1: ('Predict three lines, defend one',
     'Predict each exact printed line before anything runs, then circle the one '
     'you are least sure about.',
     'The answers are score: 46, then score: 10, then 10 total. Java evaluates + '
     'strictly left to right. In line 1 the first + already has a String on its '
     'left, so 4 is converted and glued on, and the second + does the same with '
     '6. Parentheses in line 2 force the int addition first. In line 3 both '
     'operands of the first + are ints, so 4 + 6 really adds to 10 before the '
     'String arrives. Once a String appears in the running left-to-right result, '
     'every + after it concatenates.',
     'System.out.println("score: " + 4 + 6);\n'
     'System.out.println("score: " + (4 + 6));\n'
     'System.out.println(4 + 6 + " total");'),
 2: ('Retrieval on the previous day',
     'Three questions: what does substring(from, to) include, what does indexOf '
     'return when the text is not there, and what does == compare for Strings?',
     'substring includes the character at from and stops just before to, so the '
     'result has exactly to minus from characters. indexOf returns -1 on a miss, '
     'never 0. And == compares references rather than characters, which is why '
     'equals is the tool for content.', None),
}
WORKED['1.15'] = {
 1: 'A String indexed from zero with substring(4, 8) marked out on it. The 4 is '
    'included and the 8 is not, so the result is exactly four characters long.',
 2: 'A String method called without storing its result, then the original '
    'printed. Nothing changed, because the method built a new String and the '
    'return value was discarded.',
}
EXIT['1.15'] = [
 {'options': ['hel', 'hello', 'It does not compile', 'An empty line'],
  'answer_index': 1,
  'why': 'Strings are immutable, so substring built a new String and left s '
         'alone. The returned object was discarded, so nothing observable '
         'happened.'},
 {'options': ['I only', 'II and III only', 'I and III only', 'I, II and III'],
  'answer_index': 2,
  'why': 'indexOf("cd") is 2, so the one-argument substring runs from there to '
         'the end. indexOf returns -1 on a miss, never 0. And '
         'substring(0, length()) is the whole String.'},
 {'options': ['s1 == s2', 's1.equals(s2)', 's1.length() == s2.length()',
              's1.indexOf(s2) == 0'],
  'answer_index': 1,
  'why': '== compares references, and two separately created objects sit at '
         'different addresses. equals compares the characters, and '
         'compareTo(other) == 0 is an equivalent test.'},
]
INDEPENDENT['1.15'] = (
 'String work on paper, every String printed with a blank index line under it. '
 'Exercise 2 in this lesson\'s Supplements folder is the find-and-fix set.')
HOMEWORK['1.15'] = [
 'Method reference sheet: for length, substring (both forms), indexOf, equals, '
 'and compareTo, write the return type, what it returns in one sentence, one '
 'example call, and that call\'s exact return value. This sheet is your unit '
 'test study tool.',
 'Exercise 1 from this lesson\'s Supplements folder: write the numbered index '
 'line first, then the exact value of each statement mixing substring and '
 'indexOf.',
 'Immutability paragraph: in four sentences, explain to a classmate why '
 'String s = "cat"; s.substring(0, 1); leaves s as cat, and give the one-line '
 'fix.',
 'Exercise 2 from this lesson\'s Supplements folder: for each program, write '
 'compiles or does not compile, and if it compiles write the exact output or '
 'name the exception.',
 'Optional online: replay the 1.15 Bug Hunt until you catch 7 of 7 (Unit 1 Link '
 'Sheet, row 1.15).',
]
REPLACE['1.15'] = []


MISCONCEPTION['1.5'] = {
 2: ('Integer division hiding inside a cast',
     '(double)(7 / 2) evaluates to 3.0, not 3.5, because 7 / 2 is int division '
     'and finishes before the cast runs. Casting the result cannot recover a '
     'fractional part that was already discarded. To get 3.5 you must cast an '
     'operand instead: (double) 7 / 2 or 7 / (double) 2.'),
}

STOPTHINK['1.5'] = {
 2: ['Cast scope and the rounding idiom are the two things day 3 assumes. A '
     'class still shaky on which operand a cast grabs will not get the overflow '
     'work either.'],
}
