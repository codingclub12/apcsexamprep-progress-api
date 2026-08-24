"""
AP CSA Unit 2 teacher-kit content, part 2: topics 2.3 - 2.7.

Split from content_unit2.py purely for file size. Same schema, same rules:
the "now break it" and misconception slides mirror the graded debugging
exercises in seed/csa-debug-unit2.js so the board and the homework agree.

No em-dashes anywhere.
"""

TOPICS = [

# ── 2.3 ──────────────────────────────────────────────────────────────────────
{
 'topic': '2.3',
 'title': 'if Statements',
 'handle': 'ap-csa-lesson-2-3-if-statements',
 'subtitle': 'Running a block only when a condition holds, and stopping at the first branch that matches',
 'vocab': [
   ('if statement', 'A control structure that runs a block of statements only when its condition is true.'),
   ('else', 'The branch that runs when the if condition is false.'),
   ('else if', 'A further condition tested only when every condition above it was false.'),
   ('Branch', 'One of the alternative paths through a selection statement.'),
   ('Block', 'A group of statements enclosed in braces and treated as one unit.'),
   ('Empty statement', 'A lone semicolon, which is a complete statement that does nothing.'),
 ],
 'quiz': [
   {'stem': 'How many branches of a correct if / else if / else chain execute on one pass?',
    'options': ['All that are true', 'Exactly one', 'At most one, possibly none', 'Zero'],
    'answer_index': 1,
    'why': 'A chain ending in else always runs exactly one branch. Without the final else it could run none.'},
   {'stem': 'Score 95 is tested by four separate if statements: >= 90, >= 80, >= 70, >= 60. How many print?',
    'options': ['1', '2', '3', '4'], 'answer_index': 3,
    'why': '95 satisfies all four conditions, and separate ifs do not stop at the first match.'},
   {'stem': 'What does if (x > 0); do?',
    'options': ['Runs the next block when x > 0', 'Nothing, then always runs the next block',
                'Fails to compile', 'Loops until x is 0'],
    'answer_index': 1,
    'why': 'The semicolon is an empty statement that becomes the body. The block below always runs.'},
   {'stem': 'In an else if chain for letter grades, why must the highest band come first?',
    'options': ['Alphabetical order', 'Later conditions are only reached when earlier ones are false',
                'The compiler sorts them', 'It does not matter'],
    'answer_index': 1,
    'why': 'Starting at >= 60 would put every score of 60 or more into the D branch.'},
   {'stem': 'Which is required for a chain to handle every possible input?',
    'options': ['A final else', 'At least three branches', 'Braces on every branch', 'A boolean variable'],
    'answer_index': 0,
    'why': 'Without a final else, an input matching no condition produces no output at all.'},
   {'stem': 'Omitting braces on an if body is legal. What does it then control?',
    'options': ['Nothing', 'The next single statement', 'The rest of the method', 'The next block'],
    'answer_index': 1,
    'why': 'Exactly one statement. The second statement runs unconditionally, which is a classic bug.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'if, else, and the else if chain',
   'schedule': [
     (6, 'Bell ringer: sorting yourselves by a condition'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'if, else, and blocks'),
     (10, 'Worked example: one chain, exactly one letter'),
     (13, 'Why order matters in a chain'),
     (5, 'Misconception check: four ifs are not a chain'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'Bell ringer: physical. Have students stand if a condition applies, then sit. It makes "the block only runs '
     'for some people" concrete before any syntax.',
     'Do not introduce nested ifs today. 2.4 needs the whole block for the dangling else.',
   ],
   'warmup': ('Sorting yourselves by a condition',
     'On the board: "Stand up if your birthday is in the second half of the year. Now sit. Stand if you walked '
     'here today. What did every one of you just do that a computer also does?"',
     'The answer you are steering toward is: everyone evaluated a condition and then either did the action or '
     'did not. Nobody did it halfway. That all-or-nothing quality is exactly what an if statement gives you.'),
   'objectives': [
     ('I can write an if statement that runs a block only when its condition is true.', 'LO 2.3.A'),
     ('I can write an if / else if / else chain that selects exactly one branch.', 'LO 2.3.B'),
     ('I can explain why the order of conditions in a chain changes the result.', 'LO 2.3.B'),
   ],
   'sections': [
     ('if, else and blocks', [
       'An if statement runs the block that follows it only when its condition evaluates to true.',
       'Adding else gives a second block that runs only when the condition was false. Exactly one of the two runs.',
       'The braces make a block: every statement inside is controlled by the condition. Without braces, only the very next statement is.',
       'A lone semicolon after the condition is an empty statement, and it silently becomes the body of the if.',
     ]),
     ('Chains and order', [
       'else if adds a further condition that is only tested when everything above it was false.',
       'A chain stops at the first branch that matches, so exactly one branch runs.',
       'Order the bands from most specific to least. Starting a grade chain at score >= 60 puts every A into the D branch.',
     ]),
   ],
   'worked': {
     'heading': 'One chain, exactly one letter',
     'code': 'import java.util.Scanner;\n\npublic class Grade\n{\n    public static void main(String[] args)\n    {\n        Scanner input = new Scanner(System.in);\n        int score = input.nextInt();\n\n        if (score >= 90)\n        {\n            System.out.println("A");\n        }\n        else if (score >= 80)\n        {\n            System.out.println("B");\n        }\n        else\n        {\n            System.out.println("C or below");\n        }\n    }\n}',
     'notice': [
       'else if - only tested when the condition above it was false.',
       'Highest first - a 95 matches the first branch and never reaches the others.',
       'Final else - guarantees something prints for every possible score.',
     ],
     'output': ['A', '(for input 95)'],
     'caption': 'Complete and runnable as shown. Input 95 prints exactly one line.',
     'stdin': '95\n',
     'note': 'Run it with 95, then 85, then 20. Ask before each run how many lines will print. The answer is '
             'always one, and that invariant is the point of the slide.',
   },
   'break_it': {
     'change': 'Replace the else if keywords with four separate if statements, keeping the same conditions.',
     'happens': 'A score of 95 now prints A, then B, then C. Three lines where the spec asked for one. It still '
                'compiles and no warning appears.',
     'why': 'Separate ifs are all tested independently, so a high score satisfies several of them. else if is what '
            'makes the later tests unreachable once one has matched. This is tonight\'s graded debugging exercise, '
            'along with a stray semicolon that makes PASS print for a score of 12.',
     'note': 'Trace 95 through all four conditions out loud before running it. Predicting three lines and then '
             'seeing three lines is worth more than seeing three lines cold.',
   },
   'misconception': {
     'heading': 'A group of ifs behaves like a chain',
     'think': 'Writing four if statements one after another is the same as an if / else if chain, just spelled differently.',
     'truth': 'Every separate if is evaluated, every time, no matter what happened above it. A chain stops at the '
              'first match; a stack of ifs never stops. They agree only when the conditions are mutually exclusive, '
              'which is exactly the case beginners test and exactly why the bug survives to the exam.',
     'note': 'Ask when the two forms DO agree. Mutually exclusive conditions. That is the honest answer and it '
             'explains why their homework seemed to work.',
   },
   'discussion': [
     'A chain tests score >= 60 first, then >= 70, then >= 80. What letter does a 95 receive, and why?',
     'What is printed by if (x > 0); followed by a block that prints POSITIVE, when x is -5?',
   ],
   'learned': [
     'I can write an if statement that runs a block only when its condition is true.',
     'I can write an if / else if / else chain that selects exactly one branch.',
     'I can explain why the order of conditions in a chain changes the result.',
   ],
   'up_next': 'Day 2 practises building chains from a specification, and looks at what a missing else costs.',
   'extra': 'Write the grade chain for A, B, C, D and F from memory, then check the boundary values 60, 70, 80 and 90.',
  },
  {
   'day': 2,
   'focus': 'Building a chain from a spec, boundaries, and the missing else',
   'schedule': [
     (5, 'Bell ringer: retrieval on chains'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Translating a specification into a chain'),
     (10, 'Worked walkthrough: boundary values, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Every boundary value deserves an explicit test. 90 belongs to A, not to B, and students routinely write '
     '> where the spec says at least.',
     'The empty-statement bug is worth showing on the projector once. It is invisible in a code review.',
   ],
   'warmup': ('Retrieval on chains',
     'On the board, no notes: "1. In an if / else if / else chain, how many branches run? '
     '2. What happens if there is no final else and nothing matches? 3. Which letter does a score of exactly 90 get?"',
     'Question 3 is the boundary check. Anyone answering B has written >= 90 as > 90 somewhere, and that is the '
     'single most common source of lost marks on this topic.'),
   'objectives': [
     ('I can translate a written specification into a correct if / else if chain.', 'LO 2.3.B'),
     ('I can test the boundary values of every condition I write.', 'LO 2.3.C'),
     ('I can recognise an empty statement created by a stray semicolon.', 'LO 2.3.A'),
   ],
   'sections': [
     ('From specification to chain', [
       'Read the specification and write the bands down in order before writing any Java. Most chain bugs are ordering bugs.',
       'Every band needs to say whether its edge is included. At least 90 means >= 90; more than 90 means > 90.',
       'A chain without a final else can produce no output at all, which is a different failure from producing the wrong output.',
     ]),
     ('Boundaries and stray semicolons', [
       'Test each boundary explicitly: the value at the edge, one below it and one above it.',
       'A semicolon directly after if (condition) ends the statement, so the block underneath always executes.',
       'This compiles without a warning, which is why it has to be recognised by sight rather than caught by the compiler.',
     ]),
   ],
   'worked': {
     'heading': 'Testing the boundary, not the middle',
     'code': 'import java.util.Scanner;\n\npublic class Band\n{\n    public static void main(String[] args)\n    {\n        Scanner input = new Scanner(System.in);\n        int score = input.nextInt();\n\n        if (score >= 90)\n        {\n            System.out.println("A");\n        }\n        else\n        {\n            System.out.println("not A");\n        }\n\n        if (score >= 60)\n        {\n            System.out.println("PASS");\n        }\n        else\n        {\n            System.out.println("FAIL");\n        }\n    }\n}',
     'notice': [
       '>= 90 - a score of exactly 90 is an A. Writing > 90 quietly moves the boundary.',
       'Two chains - independent questions, so two separate ifs is correct here.',
       'Every else present - no input can produce silence.',
     ],
     'output': ['A', 'PASS', '(for input 90)'],
     'caption': 'Complete and runnable as shown. Input 90 sits exactly on a boundary.',
     'stdin': '90\n',
     'note': 'Run 89, 90 and 91 in sequence. The jump happens between 89 and 90, which is what >= means and what '
             '> would break.',
   },
   'break_it': {
     'change': 'Put a semicolon immediately after if (score >= 60), leaving the block below it unchanged.',
     'happens': 'PASS now prints for every score, including 12. The else is gone as far as that if is concerned, '
                'and the block below simply always runs.',
     'why': 'The semicolon is a complete empty statement, so the if controls nothing and the block underneath is '
            'just an ordinary block. Java accepts it silently. Recognising this on sight is the only defence, '
            'and it is on tonight\'s graded debugging exercise.',
     'note': 'Show it on the projector rather than describing it. Nobody believes this one until they see PASS '
             'printed under a score of 12.',
   },
   'misconception': {
     'heading': 'The compiler will catch a misplaced semicolon',
     'think': 'If I put a semicolon in the wrong place, the program will not compile and I will see the error.',
     'truth': 'A semicolon is a complete statement that does nothing, and doing nothing is legal everywhere. '
              'if (x > 0); compiles, runs, and changes the meaning of the code that follows it. The compiler only '
              'enforces grammar, and this is grammatically perfect. Wrong meaning is never the compiler\'s job.',
     'note': 'This connects straight back to 1.1: compiling proves the code is valid Java, not that it is correct.',
   },
   'discussion': [
     'A chain has no final else and a score of 55 is entered. What is printed, and how would you notice in testing?',
     'Why is testing 90 more valuable than testing 95 when checking an A boundary?',
   ],
   'learned': [
     'I can translate a written specification into a correct if / else if chain.',
     'I can test the boundary values of every condition I write.',
     'I can recognise an empty statement created by a stray semicolon.',
   ],
   'up_next': 'Topic 2.4 nests one if inside another, where an else can attach to the wrong one.',
   'extra': 'Complete the graded debugging exercise for 2.3. It plants both the separate ifs and the stray semicolon.',
  },
 ],
},

# ── 2.4 ──────────────────────────────────────────────────────────────────────
{
 'topic': '2.4',
 'title': 'Nested if Statements',
 'handle': 'ap-csa-lesson-2-4-nested-if-statements',
 'subtitle': 'An if inside an if, and the else that attaches to the wrong one',
 'vocab': [
   ('Nested if', 'An if statement that appears inside the body of another if statement.'),
   ('Dangling else', 'An else that attaches to the nearest unmatched if rather than the intended one.'),
   ('Indentation', 'Whitespace used to show structure to a reader. The compiler ignores it entirely.'),
   ('Outer condition', 'The condition of the enclosing if, which must be true before the inner one is reached.'),
   ('Mutually exclusive', 'Conditions that cannot both be true at the same time.'),
   ('Flattening', 'Rewriting nested ifs as a single chain when the conditions allow it.'),
 ],
 'quiz': [
   {'stem': 'Without braces, an else attaches to which if?',
    'options': ['The first one', 'The nearest unmatched one above it', 'The one at the same indentation', 'The outermost one'],
    'answer_index': 1,
    'why': 'Java pairs an else with the closest preceding if that does not already have one. Indentation is irrelevant.'},
   {'stem': 'What does the compiler do with your indentation?',
    'options': ['Uses it to pair else with if', 'Warns if it is inconsistent', 'Ignores it completely', 'Requires four spaces'],
    'answer_index': 2,
    'why': 'Indentation is for humans. Only braces and the pairing rule affect meaning.'},
   {'stem': 'To reach the inner if of a nested pair, what must be true?',
    'options': ['The inner condition', 'The outer condition', 'Both', 'Neither'],
    'answer_index': 1,
    'why': 'The outer condition gates the whole inner statement. If it is false the inner one is never evaluated.'},
   {'stem': 'When a senior who is also a member should get the senior price, what must be true of the chain?',
    'options': ['Membership is tested first', 'Age is tested first', 'Order does not matter', 'Both need braces'],
    'answer_index': 1,
    'why': 'The more specific rule must be tested first, or the membership branch captures the senior before age is checked.'},
   {'stem': 'What is the safest habit for avoiding dangling else bugs?',
    'options': ['Consistent indentation', 'Always using braces', 'Short conditions', 'Avoiding else'],
    'answer_index': 1,
    'why': 'Braces make the pairing explicit so the compiler and the reader agree.'},
   {'stem': 'Nested ifs can often be rewritten as a single chain when the conditions are:',
    'options': ['Mutually exclusive', 'All true', 'Numeric', 'Short'],
    'answer_index': 0,
    'why': 'If only one can apply, a flat chain expresses the same logic more readably.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Nesting, the pairing rule, and why braces are not optional',
   'schedule': [
     (6, 'Bell ringer: the two-question decision'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Nesting one if inside another'),
     (10, 'Worked example: a nested decision traced live'),
     (13, 'The dangling else and the pairing rule'),
     (5, 'Misconception check: indentation is not structure'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'The pairing rule is the whole lesson. Say it once, write it on the board, and refer back to it every time.',
     'Show the misleading indentation before you show the fix. The surprise is the teaching moment.',
   ],
   'warmup': ('The two-question decision',
     'On the board: "A cinema charges 6 for under 13s, 8 for 65 and over, 9 for members, and 10 for everyone else. '
     'A 70 year old member walks up. What should they pay? Write your answer and the rule you used."',
     'The class will split, which is the point. Both 8 and 9 are defensible until someone states the priority. '
     'Getting them to notice that the SPEC is ambiguous, not the code, is worth the four minutes.'),
   'objectives': [
     ('I can write and trace an if statement nested inside another if statement.', 'LO 2.4.A'),
     ('I can apply the rule that an else pairs with the nearest unmatched if.', 'LO 2.4.B'),
     ('I can use braces to make my intended pairing explicit.', 'LO 2.4.B'),
   ],
   'sections': [
     ('Nesting one if inside another', [
       'A nested if is simply an if statement written inside the body of another one.',
       'The inner condition is only evaluated when the outer condition was true. The outer one acts as a gate.',
       'Nesting expresses "and then", where a second question only makes sense once the first has been answered.',
     ]),
     ('The pairing rule', [
       'An else attaches to the nearest preceding if that does not already have an else. This is the whole rule.',
       'The compiler ignores indentation completely, so code can be laid out to look like one thing and behave like another.',
       'Braces on every branch remove the ambiguity, which is why experienced programmers write them even for one statement.',
     ]),
   ],
   'worked': {
     'heading': 'A nested decision, traced',
     'code': 'import java.util.Scanner;\n\npublic class Ticket\n{\n    public static void main(String[] args)\n    {\n        Scanner input = new Scanner(System.in);\n        int age = input.nextInt();\n        int member = input.nextInt();\n\n        if (age < 13)\n        {\n            System.out.println(6);\n        }\n        else if (age >= 65)\n        {\n            System.out.println(8);\n        }\n        else if (member == 1)\n        {\n            System.out.println(9);\n        }\n        else\n        {\n            System.out.println(10);\n        }\n    }\n}',
     'notice': [
       'age >= 65 before member - the senior rule wins, which is what the spec decided.',
       'Braces everywhere - no else can attach to the wrong if.',
       'Flat chain - the conditions are mutually exclusive, so nesting is unnecessary.',
     ],
     'output': ['8', '(for age 70, member 1)'],
     'caption': 'Complete and runnable as shown. A 70 year old member pays the senior price.',
     'stdin': '70 1\n',
     'note': 'This is the resolution of the warm-up. The chain encodes the priority decision explicitly, which the '
             'ambiguous English did not.',
   },
   'break_it': {
     'change': 'Remove the braces from the outer if and let the else fall through to the inner if, keeping the '
               'indentation exactly as it was.',
     'happens': 'A 70 year old non-member is now charged the wrong price. The code is indented to say one thing '
                'and the compiler read it as another.',
     'why': 'The else attached to the INNER if, because that is the nearest unmatched one, regardless of how the '
            'lines are indented. Braces are the only thing that makes your intention binding. This bug and the '
            'ordering bug are tonight\'s graded debugging exercise.',
     'note': 'Re-indent the broken version to match what it actually does. Seeing the code reformatted to its real '
             'meaning is what makes the pairing rule stick.',
   },
   'misconception': {
     'heading': 'Indentation tells the compiler what belongs to what',
     'think': 'The else lines up with the outer if, so it belongs to the outer if.',
     'truth': 'The compiler never sees your whitespace. It pairs each else with the nearest preceding if that has '
              'no else yet, and then your carefully aligned code does something different from what it looks like. '
              'Indentation is a message to the next human. Braces are the message to the compiler, and only one of '
              'those two changes the behaviour.',
     'note': 'Students who have used Python find this genuinely surprising, and saying so out loud helps them.',
   },
   'discussion': [
     'Why does adding braces to the outer if change which statement the else belongs to?',
     'When can a nested if be rewritten as a flat chain, and when can it not?',
   ],
   'learned': [
     'I can write and trace an if statement nested inside another if statement.',
     'I can apply the rule that an else pairs with the nearest unmatched if.',
     'I can use braces to make my intended pairing explicit.',
   ],
   'up_next': 'Day 2 practises ordering rules from most specific to least, and flattening nested logic.',
   'extra': 'Rewrite the ticket rules as nested ifs, then as a flat chain. Confirm both give the same answers.',
  },
  {
   'day': 2,
   'focus': 'Ordering specific rules first, and flattening nested logic',
   'schedule': [
     (5, 'Bell ringer: retrieval on pairing'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Ordering rules from most specific to least'),
     (10, 'Worked walkthrough: flatten a nested decision live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'The ordering error is subtler than the dangling else and costs just as many marks. Give it real time.',
     'Flattening is a readability win, not a correctness requirement. Say so, or students will over-apply it.',
   ],
   'warmup': ('Retrieval on pairing',
     'On the board, no notes: "1. An else attaches to which if? 2. Does indentation affect that? '
     '3. What is the one habit that prevents the problem entirely?"',
     'Nearest unmatched if; no; always use braces. If all three come back instantly you can move straight to '
     'ordering, which is the harder half of this topic.'),
   'objectives': [
     ('I can order conditions so that more specific rules are tested before general ones.', 'LO 2.4.B'),
     ('I can flatten nested ifs into a chain when the conditions are mutually exclusive.', 'LO 2.4.C'),
     ('I can trace which branch runs for a given set of inputs.', 'LO 2.4.A'),
   ],
   'sections': [
     ('Ordering specific rules first', [
       'When two rules could both apply, the one you test first wins. Order is part of the logic, not a style choice.',
       'A senior who is also a member matches two rules. Testing membership first means the senior rule is never reached.',
       'Write the rules out in priority order in English before writing the chain, then check each one against the list.',
     ]),
     ('Flattening', [
       'When only one rule can apply to any input, nested ifs can be rewritten as a single flat chain.',
       'A flat chain is easier to read and much harder to get wrong, because there is no pairing question at all.',
       'Nesting is still the right answer when the inner question only makes sense given the outer answer.',
     ]),
   ],
   'worked': {
     'heading': 'The same rules, flattened',
     'code': 'public class Price\n{\n    public static int of(int age, int member)\n    {\n        if (age < 13)\n        {\n            return 6;\n        }\n        else if (age >= 65)\n        {\n            return 8;\n        }\n        else if (member == 1)\n        {\n            return 9;\n        }\n        return 10;\n    }\n\n    public static void main(String[] args)\n    {\n        System.out.println(of(70, 1));\n        System.out.println(of(70, 0));\n        System.out.println(of(30, 1));\n        System.out.println(of(10, 0));\n    }\n}',
     'notice': [
       'Four calls - one per rule, so every branch is exercised once.',
       'return - ends the method immediately, so no later branch can also run.',
       'Order - senior before member, which is the priority the spec chose.',
     ],
     'output': ['8', '8', '9', '6'],
     'caption': 'Complete and runnable as shown. Every branch tested once.',
     'note': 'Ask which line of output would change if the member test came first. The first one, from 8 to 9. '
             'That single line is the whole ordering lesson.',
   },
   'break_it': {
     'change': 'Move the member test above the age >= 65 test.',
     'happens': 'A 70 year old member is charged 9 instead of 8. Only one of the four output lines changes, and '
                'the other three still look right.',
     'why': 'A chain stops at the first match, so a more general rule placed early captures inputs that a more '
            'specific rule below it was meant to handle. One line of output changing is exactly how this bug '
            'hides in testing.',
     'note': 'Point out that three of four tests still pass. A test suite that only checks the common cases would '
             'have shipped this.',
   },
   'misconception': {
     'heading': 'Reordering a chain is just a style choice',
     'think': 'The branches all have different conditions, so it does not matter what order I write them in.',
     'truth': 'Order only stops mattering when the conditions are mutually exclusive, and they usually are not. '
              'Any input matching two conditions is decided entirely by which one you wrote first. That is why '
              'the most specific rule goes at the top and the catch-all goes at the bottom.',
     'note': 'Connect back to 2.3: the grade chain is the same rule, since every score above 90 also satisfies >= 60.',
   },
   'discussion': [
     'Which inputs change their result when you swap two branches of a chain? Which do not?',
     'Give an example where nesting is genuinely clearer than flattening.',
   ],
   'learned': [
     'I can order conditions so that more specific rules are tested before general ones.',
     'I can flatten nested ifs into a chain when the conditions are mutually exclusive.',
     'I can trace which branch runs for a given set of inputs.',
   ],
   'up_next': 'Topic 2.5 combines conditions with && and ||, where the order of evaluation protects the code.',
   'extra': 'Complete the graded debugging exercise for 2.4. It plants a dangling else and a wrong rule order.',
  },
 ],
},

# ── 2.5 ──────────────────────────────────────────────────────────────────────
{
 'topic': '2.5',
 'title': 'Compound Boolean Expressions',
 'handle': 'ap-csa-lesson-2-5-compound-boolean-expressions',
 'subtitle': 'Combining conditions with and and or, and why short circuiting is a safety feature',
 'vocab': [
   ('Compound condition', 'A condition built from two or more boolean expressions joined by && or ||.'),
   ('Short circuit', 'Evaluating only as much of an expression as is needed to decide the result.'),
   ('&& (and)', 'True only when both sides are true. Skips the right side when the left is false.'),
   ('|| (or)', 'True when either side is true. Skips the right side when the left is true.'),
   ('& (non short circuit)', 'A boolean and that always evaluates both sides, offering no protection.'),
   ('Guard', 'A condition placed first specifically to make a later condition safe to evaluate.'),
 ],
 'quiz': [
   {'stem': 'In a && b, when is b evaluated?',
    'options': ['Always', 'Only when a is true', 'Only when a is false', 'Never'],
    'answer_index': 1,
    'why': 'If a is false the result is already known, so && skips b entirely.'},
   {'stem': 'Why is count != 0 && total / count > 10 safe?',
    'options': ['Division never fails', 'The guard stops the division when count is 0',
                'Java catches it', 'It is not safe'],
    'answer_index': 1,
    'why': 'Short circuiting means the division is never reached when count is 0.'},
   {'stem': 'What does replacing && with a single & do in that expression?',
    'options': ['Nothing', 'Makes it faster', 'Causes a divide by zero when count is 0', 'Fails to compile'],
    'answer_index': 2,
    'why': 'A single & evaluates both sides regardless, so the division happens before the guard can help.'},
   {'stem': 'Which expression means "x is between 10 and 99 inclusive"?',
    'options': ['x >= 10 || x <= 99', 'x >= 10 && x <= 99', 'x > 10 && x < 99', '10 <= x <= 99'],
    'answer_index': 1,
    'why': 'Both must hold. The or version is true for every integer, and chained comparison is not legal Java.'},
   {'stem': 'In a || b, when is b evaluated?',
    'options': ['Always', 'Only when a is true', 'Only when a is false', 'Never'],
    'answer_index': 2,
    'why': 'If a is true the result is already known, so || skips b.'},
   {'stem': 'Which is the correct order for a null-safety guard?',
    'options': ['s.length() > 0 && s != null', 's != null && s.length() > 0',
                's != null || s.length() > 0', 'Order does not matter'],
    'answer_index': 1,
    'why': 'The check must come first, and only && guarantees the right side is skipped when it fails.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Combining conditions, and short circuit evaluation',
   'schedule': [
     (6, 'Bell ringer: which questions do you not need to ask'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Building compound conditions'),
     (10, 'Worked example: a guard that protects a division'),
     (13, 'Short circuiting, and why the order is load bearing'),
     (5, 'Misconception check: && and & are not interchangeable'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'The guard pattern is the reason this topic exists. Teach it as a safety idiom, not as trivia about operators.',
     'Do not start range checks today if time is short. The short circuit is the priority.',
   ],
   'warmup': ('Which questions do you not need to ask',
     'On the board: "You are checking whether a shop is open AND has milk. You phone and they say they are closed. '
     'Do you still ask about the milk? Now: open OR delivers. They say they are open. Do you still ask about delivery?"',
     'No, and no. Students already short circuit in ordinary life, so the operator behaviour is a name for '
     'something they do without thinking, not a new idea.'),
   'objectives': [
     ('I can combine conditions correctly using && and ||.', 'LO 2.5.A'),
     ('I can explain short circuit evaluation and predict which operands are evaluated.', 'LO 2.5.B'),
     ('I can use a guard condition to make a later condition safe.', 'LO 2.5.B'),
   ],
   'sections': [
     ('Building compound conditions', [
       'The && operator is true only when both sides are true. The || operator is true when at least one side is true.',
       'A range check needs and, not or: x >= 10 && x <= 99. The or version is satisfied by every integer.',
       'Java has no chained comparison, so 10 <= x <= 99 does not compile. Each comparison must be written out.',
     ]),
     ('Short circuiting', [
       'When the left side of && is false the result is already decided, so the right side is never evaluated.',
       'When the left side of || is true the result is already decided, so the right side is never evaluated.',
       'This makes order load bearing: a check placed first can protect an operation placed second.',
       'The single & is also a boolean operator, but it always evaluates both sides and so protects nothing.',
     ]),
   ],
   'worked': {
     'heading': 'A guard that protects a division',
     'code': 'import java.util.Scanner;\n\npublic class Average\n{\n    public static void main(String[] args)\n    {\n        Scanner input = new Scanner(System.in);\n        int count = input.nextInt();\n        int total = input.nextInt();\n\n        if (count != 0 && total / count > 10)\n        {\n            System.out.println("above ten");\n        }\n        else\n        {\n            System.out.println("not above ten");\n        }\n    }\n}',
     'notice': [
       'count != 0 - the guard, and it must come first.',
       '&& - short circuits, so the division is skipped entirely when count is 0.',
       'No crash - with count 0 the program prints and exits normally.',
     ],
     'output': ['not above ten', '(for count 0)'],
     'caption': 'Complete and runnable as shown. Count 0 is handled without a crash.',
     'stdin': '0 500\n',
     'note': 'Run it with 0 and any total. Then ask what would happen if the two sides were swapped. The guard '
             'only guards when it is on the left.',
   },
   'break_it': {
     'change': 'Change the && to a single &, leaving everything else identical.',
     'happens': 'The program now crashes with ArithmeticException: / by zero when count is 0, even though the '
                'condition still plainly checks count != 0 first.',
     'why': 'A single & is a real boolean operator that always evaluates both sides before combining them, so the '
            'division runs before the guard can matter. Only && skips. This is tonight\'s graded debugging '
            'exercise, alongside an or used as a range check.',
     'note': 'Students find this genuinely shocking, which is why it sticks. Emphasise that both versions compile '
             'and only one survives contact with real data.',
   },
   'misconception': {
     'heading': 'One ampersand or two, it is the same operator',
     'think': '& and && both mean and, so it does not matter which one I type.',
     'truth': 'They produce the same answer and they do not do the same work. && stops as soon as the answer is '
              'known; & always evaluates both sides. Whenever the right side would crash, loop forever, or change '
              'something, that difference is the difference between a working program and a broken one. The same '
              'applies to | and ||.',
     'note': 'This is why every null check you will ever read is written with && and in that order.',
   },
   'discussion': [
     'Why must the guard be on the left of the && rather than the right?',
     'Give a value of x for which x >= 10 || x <= 99 is false. What does that tell you about the expression?',
   ],
   'learned': [
     'I can combine conditions correctly using && and ||.',
     'I can explain short circuit evaluation and predict which operands are evaluated.',
     'I can use a guard condition to make a later condition safe.',
   ],
   'up_next': 'Day 2 practises building range checks and compound guards from specifications.',
   'extra': 'Write three range checks: 1 to 12 inclusive, strictly between 0 and 100, and outside 10 to 20.',
  },
  {
   'day': 2,
   'focus': 'Range checks, compound guards, and reading conditions out loud',
   'schedule': [
     (5, 'Bell ringer: retrieval on short circuiting'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Range checks and their boundaries'),
     (10, 'Worked walkthrough: three ranges, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Reading a condition out loud in English is the fastest bug detector students have. Model it every time.',
     'The "outside a range" case needs an or, which is the one place or is correct here. Contrast it explicitly.',
   ],
   'warmup': ('Retrieval on short circuiting',
     'On the board, no notes: "1. In a && b, when is b skipped? 2. In a || b, when is b skipped? '
     '3. Which operator gives no protection at all?"',
     'When a is false; when a is true; the single &. If the third one is shaky, re-run yesterday\'s crash demo '
     'before moving on, because everything today assumes it.'),
   'objectives': [
     ('I can write a range check with correct boundaries using &&.', 'LO 2.5.A'),
     ('I can write a check for values outside a range using ||.', 'LO 2.5.A'),
     ('I can read a compound condition aloud in English and check it against the specification.', 'LO 2.5.C'),
   ],
   'sections': [
     ('Range checks', [
       'Inside a range needs and: both boundaries have to hold at once.',
       'Outside a range needs or: the value fails on one side or the other, and it cannot fail on both.',
       'Inclusive boundaries use >= and <=; exclusive boundaries use > and <. Read the specification word by word.',
     ]),
     ('Reading conditions aloud', [
       'Say the condition in plain English and compare it to the specification sentence. Most bugs are audible.',
       'If the English version needs the word "both", the code needs &&. If it needs "either", the code needs ||.',
       'A condition that is true for every possible input, or false for every input, is almost always a mistake.',
     ]),
   ],
   'worked': {
     'heading': 'Three ranges, side by side',
     'code': 'import java.util.Scanner;\n\npublic class Ranges\n{\n    public static void main(String[] args)\n    {\n        Scanner input = new Scanner(System.in);\n        int x = input.nextInt();\n\n        System.out.println(x >= 10 && x <= 99);\n        System.out.println(x > 0 && x < 100);\n        System.out.println(x < 10 || x > 20);\n    }\n}',
     'notice': [
       'Line 1 - inclusive, so 10 and 99 both count as inside.',
       'Line 2 - exclusive, so 0 and 100 are outside.',
       'Line 3 - outside a range, which is the one case that needs ||.',
     ],
     'output': ['true', 'true', 'false', '(for input 15)'],
     'caption': 'Complete and runnable as shown. Input 15 is inside all three ranges.',
     'stdin': '15\n',
     'note': 'Run 15, then 10, then 100. The boundary values are where the three lines start disagreeing, which '
             'is exactly the point.',
   },
   'break_it': {
     'change': 'Change the first range check from && to ||.',
     'happens': 'It prints true for every possible input, including -500 and 10000. Nothing crashes and the line '
                'still looks like a range check.',
     'why': 'Every integer is either at least 10 or at most 99, so the or is always satisfied. A condition that '
            'can never be false is not a check at all. This is on tonight\'s graded debugging exercise together '
            'with the single-ampersand crash.',
     'note': 'Ask for a counterexample before running. When nobody can find one, that IS the finding.',
   },
   'misconception': {
     'heading': 'Or is the safer choice when you are not sure',
     'think': 'If I am not certain whether to use and or or, or is safer because it accepts more.',
     'truth': 'Accepting more is not safer, it is looser. An or between two overlapping comparisons is usually '
              'true for every input, which means the check has quietly been deleted while still appearing in the '
              'code. Decide from the English: both means &&, either means ||. Guessing produces a condition that '
              'passes every test because it passes everything.',
     'note': 'Tie back to 2.2: a condition true in all four rows of a truth table is a tautology, not a test.',
   },
   'discussion': [
     'Why can a value never fail both sides of x < 10 || x > 20?',
     'A check is meant to reject invalid input but never rejects anything. How would you find that in testing?',
   ],
   'learned': [
     'I can write a range check with correct boundaries using &&.',
     'I can write a check for values outside a range using ||.',
     'I can read a compound condition aloud in English and check it against the specification.',
   ],
   'up_next': 'Topic 2.6 compares whole boolean expressions and asks when two of them are truly equivalent.',
   'extra': 'Complete the graded debugging exercise for 2.5. It plants the single ampersand and the or range check.',
  },
 ],
},

# ── 2.6 ──────────────────────────────────────────────────────────────────────
{
 'topic': '2.6',
 'title': 'Comparing Boolean Expressions',
 'handle': 'ap-csa-lesson-2-6-comparing-boolean-expressions',
 'subtitle': 'Equivalence, object identity, and why == is the wrong question for a String',
 'vocab': [
   ('Equivalent', 'Two expressions that give the same result for every possible input.'),
   ('Reference', 'A value that points at an object rather than holding the object itself.'),
   ('== on objects', 'A comparison asking whether two references point at the same object.'),
   ('equals', 'A method asking whether two objects have the same contents.'),
   ('String pool', 'A cache of identical String literals, which makes == appear to work by accident.'),
   ('Identity', 'Being the same object, as opposed to merely being equal in value.'),
 ],
 'quiz': [
   {'stem': 'What does == compare when both operands are Strings?',
    'options': ['The characters', 'Whether they are the same object', 'Their lengths', 'Alphabetical order'],
    'answer_index': 1,
    'why': 'For any object type, == compares references, not contents.'},
   {'stem': 'Two Strings read from input contain the same characters. What does == return?',
    'options': ['true', 'false', 'Depends on length', 'A compile error'],
    'answer_index': 1,
    'why': 'Input builds separate objects, so the references differ even though the text matches.'},
   {'stem': 'Which comparison asks whether two Strings contain the same text?',
    'options': ['a == b', 'a.equals(b)', 'a.length() == b.length()', 'a != b'],
    'answer_index': 1,
    'why': 'equals compares contents character by character.'},
   {'stem': 'Why does == sometimes appear to work on Strings?',
    'options': ['It is correct for short strings', 'Identical literals share one pooled object',
                'The compiler rewrites it', 'It never works'],
    'answer_index': 1,
    'why': 'The string pool reuses one object for identical literals, which is an optimisation, not a guarantee.'},
   {'stem': 'For which types is == the correct equality test?',
    'options': ['All types', 'Primitives such as int and boolean', 'Objects only', 'Strings only'],
    'answer_index': 1,
    'why': 'Primitives hold values directly, so == compares the values themselves.'},
   {'stem': 'Two boolean expressions agree on three of four truth table rows. Are they equivalent?',
    'options': ['Yes', 'No', 'Only if the fourth is rare', 'Cannot be determined'],
    'answer_index': 1,
    'why': 'Equivalence requires agreement on every row without exception.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Equivalence of expressions, and identity versus equality',
   'schedule': [
     (6, 'Bell ringer: same or identical'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Proving two expressions equivalent'),
     (10, 'Worked example: == and equals side by side'),
     (13, 'References, objects, and the string pool'),
     (5, 'Misconception check: == works on Strings'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'The two-identical-notebooks analogy carries this whole topic. Use a physical pair if you have them.',
     'Show the pooled literal case honestly, or students will think you were wrong when their homework prints true.',
   ],
   'warmup': ('Same or identical',
     'On the board: "I have two copies of the same textbook. Are they the same book? Now: two people say they have '
     'the same phone. What are the two different things that could mean? Write both."',
     'Same model versus the actual same object. That distinction IS identity versus equality, and students '
     'already own it in ordinary language before any Java appears.'),
   'objectives': [
     ('I can use a truth table to decide whether two boolean expressions are equivalent.', 'LO 2.6.A'),
     ('I can explain the difference between comparing references and comparing contents.', 'LO 2.6.B'),
     ('I can choose == or equals correctly for a given type.', 'LO 2.6.B'),
   ],
   'sections': [
     ('Proving equivalence', [
       'Two boolean expressions are equivalent only when they agree for every possible combination of inputs.',
       'Agreeing on some inputs proves nothing at all. The counterexample is often the case nobody tested.',
       'The complete truth table is the proof, and it is short: two inputs give four rows.',
     ]),
     ('Identity and equality', [
       'A variable of an object type holds a reference, which points at the object rather than containing it.',
       'The == operator compares the references, so it asks whether the two names point at the same object.',
       'The equals method compares contents, which is almost always the question you actually meant to ask.',
       'For primitives such as int, char and boolean, == compares the values directly and is correct.',
     ]),
   ],
   'worked': {
     'heading': '== and equals, side by side',
     'code': 'public class Compare\n{\n    public static void main(String[] args)\n    {\n        String a = "cat";\n        String b = "cat";\n        String c = new String("cat");\n\n        System.out.println(a == b);\n        System.out.println(a == c);\n        System.out.println(a.equals(c));\n\n        int x = 5;\n        int y = 5;\n        System.out.println(x == y);\n    }\n}',
     'notice': [
       'a == b - true, but only because identical literals share one pooled object.',
       'a == c - false. new always builds a separate object.',
       'a.equals(c) - true. The contents match, which is the real question.',
     ],
     'output': ['true', 'false', 'true', 'true'],
     'caption': 'Complete and runnable as shown. Lines 1 and 2 compare the same text and disagree.',
     'note': 'Lines 1 and 2 are the whole slide: identical characters, opposite answers. Do not skip past the '
             'true on line 1, because that is the result that misleads students in their own code.',
   },
   'break_it': {
     'change': 'Read the two words from Scanner input instead of writing them as literals, keeping a == b.',
     'happens': 'Typing the same word twice now prints false. The literal version printed true, and nothing about '
                'the comparison changed.',
     'why': 'Literals are pooled and shared; input builds fresh objects every time. The == was always asking about '
            'identity and only appeared correct while the pool happened to supply one object. Tonight\'s graded '
            'debugging exercise plants exactly this.',
     'note': 'This is the single most valuable demonstration in the unit. It explains why their code "worked '
             'yesterday" and fails on real input.',
   },
   'misconception': {
     'heading': 'Double equals compares Strings',
     'think': 'I tested it and "cat" == "cat" printed true, so == compares String contents.',
     'truth': 'It printed true because the compiler stored one copy of the literal "cat" and pointed both '
              'variables at it, so the two references really were identical. That is an optimisation called the '
              'string pool, not a rule about ==. The moment a String comes from input, from new, or from '
              'concatenation at run time, there are two objects and == returns false. Use equals every time and '
              'the question never arises.',
     'note': 'Name it as a false positive: the test passed for a reason unrelated to what was being tested.',
   },
   'discussion': [
     'Why is == correct for int but wrong for String?',
     'Two expressions agree on three of four truth table rows. Why is that not good enough?',
   ],
   'learned': [
     'I can use a truth table to decide whether two boolean expressions are equivalent.',
     'I can explain the difference between comparing references and comparing contents.',
     'I can choose == or equals correctly for a given type.',
   ],
   'up_next': 'Day 2 practises rewriting conditions into equivalent forms and simplifying them.',
   'extra': 'Predict, then check: does new String("hi") == "hi" print true or false? Explain the answer.',
  },
  {
   'day': 2,
   'focus': 'Rewriting and simplifying conditions without changing meaning',
   'schedule': [
     (5, 'Bell ringer: retrieval on identity'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Simplifying conditions safely'),
     (10, 'Worked walkthrough: three rewrites, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Every simplification must be justified by a truth table or by De Morgan. "It looks the same" is not a reason.',
     'The redundant == true comparison is worth naming; it is everywhere in student code.',
   ],
   'warmup': ('Retrieval on identity',
     'On the board, no notes: "1. What does == ask about two Strings? 2. What does equals ask? '
     '3. Why did == print true in yesterday\'s first example?"',
     'The third question is the one to insist on. If the answer is not "the two literals were the same pooled '
     'object", the misconception has survived the night.'),
   'objectives': [
     ('I can rewrite a condition into an equivalent simpler form.', 'LO 2.6.A'),
     ('I can justify a simplification with a truth table or De Morgan.', 'LO 2.6.A'),
     ('I can recognise redundant comparisons against boolean literals.', 'LO 2.6.C'),
   ],
   'sections': [
     ('Simplifying safely', [
       'A boolean variable is already a condition, so done == true is redundant and !done is clearer than done == false.',
       'Writing done = true inside an if compiles when the variable is boolean, and assigns instead of comparing. Avoiding == true avoids that whole trap.',
       'Every simplification has to preserve the result for every input, which means a truth table or De Morgan, not intuition.',
     ]),
     ('Common rewrites', [
       '!(a == b) is the same as a != b, and !(a < b) is the same as a >= b. The boundary belongs to the negation.',
       '!(P && Q) becomes !P || !Q, and !(P || Q) becomes !P && !Q. The operator flips each time.',
       'A condition that is always true or always false is a bug, not a simplification.',
     ]),
   ],
   'worked': {
     'heading': 'Three rewrites, all verified',
     'code': 'public class Simplify\n{\n    public static void main(String[] args)\n    {\n        int a = 4;\n        int b = 9;\n        boolean done = false;\n\n        System.out.println(!(a == b));\n        System.out.println(a != b);\n\n        System.out.println(!(a < b));\n        System.out.println(a >= b);\n\n        System.out.println(done == false);\n        System.out.println(!done);\n    }\n}',
     'notice': [
       'Each pair - two spellings of one condition, printed together so they can be compared.',
       '!(a < b) is a >= b - the boundary value belongs to the negation.',
       '!done - shorter, and impossible to mistype as an assignment.',
     ],
     'output': ['true', 'true', 'false', 'false', 'true', 'true'],
     'caption': 'Complete and runnable as shown. Each pair agrees.',
     'note': 'Ask students to pick values of a and b that would break any pair. They cannot, and the attempt is '
             'what teaches them what equivalence means.',
   },
   'break_it': {
     'change': 'Rewrite !(a < b) as a > b, dropping the boundary.',
     'happens': 'With a and b both 4 the correct version prints true and this one prints false. Every other test '
                'value agrees, so a quick check would miss it.',
     'why': 'The negation of less than is greater than OR EQUAL. Dropping the boundary changes the answer for '
            'exactly one case: when the two values are equal. That is a single row of the truth table, and it is '
            'the row nobody tests.',
     'note': 'Ask for the failing input before running. Students who say "when they are equal" have understood '
             'boundaries properly.',
   },
   'misconception': {
     'heading': 'The negation of less than is greater than',
     'think': '!(a < b) means a > b, because greater is the opposite of less.',
     'truth': 'There are three possibilities, not two: less, equal and greater. Not-less covers both equal and '
              'greater, so the negation is a >= b. Forgetting the middle case is why this error survives testing '
              'with unequal values, which is nearly every test anyone writes by hand.',
     'note': 'A number line on the board settles this in ten seconds and it is worth the chalk.',
   },
   'discussion': [
     'Why is !(a < b) equal to a >= b rather than a > b? Which single input distinguishes them?',
     'Why is !done preferred over done == false, beyond being shorter?',
   ],
   'learned': [
     'I can rewrite a condition into an equivalent simpler form.',
     'I can justify a simplification with a truth table or De Morgan.',
     'I can recognise redundant comparisons against boolean literals.',
   ],
   'up_next': 'Topic 2.7 begins repetition properly with the while loop.',
   'extra': 'Complete the graded debugging exercise for 2.6. It plants == on Strings and a wrongly distributed not.',
  },
 ],
},

# ── 2.7 ──────────────────────────────────────────────────────────────────────
{
 'topic': '2.7',
 'title': 'while Loops',
 'handle': 'ap-csa-lesson-2-7-while-loops',
 'subtitle': 'Repeating while a condition holds, and the four parts every counting loop needs',
 'vocab': [
   ('while loop', 'A control structure that repeats its body while a condition remains true.'),
   ('Loop body', 'The statements inside the braces, which run once per iteration.'),
   ('Initialisation', 'Setting the loop variable to its starting value before the loop begins.'),
   ('Update', 'The statement that moves the loop variable towards ending the loop.'),
   ('Infinite loop', 'A loop whose condition never becomes false, so it never stops.'),
   ('Accumulator', 'A variable that builds up a result across iterations.'),
 ],
 'quiz': [
   {'stem': 'Where is a while loop condition tested?',
    'options': ['After each iteration', 'Before each iteration', 'Once at the start', 'Only at the end'],
    'answer_index': 1,
    'why': 'The condition is checked before every pass, so a false condition means the body never runs at all.'},
   {'stem': 'What are the four parts of a correct counting while loop?',
    'options': ['Declare, test, print, stop', 'Initialise, test, do the work, update',
                'Start, body, end, return', 'Condition, body, else, exit'],
    'answer_index': 1,
    'why': 'Missing any one of the four gives an infinite loop or an off-by-one.'},
   {'stem': 'A loop should print 1 through n. Which condition is correct?',
    'options': ['i < n', 'i <= n', 'i != n', 'i > n'],
    'answer_index': 1,
    'why': 'i <= n lets n itself into the body. i < n stops one short.'},
   {'stem': 'What happens if the update statement is omitted?',
    'options': ['The loop runs once', 'The loop never runs', 'The loop never ends', 'A compile error'],
    'answer_index': 2,
    'why': 'The condition never changes, so it stays true forever.'},
   {'stem': 'If the counter is incremented before the work, what goes wrong?',
    'options': ['Nothing', 'The first value is skipped', 'The loop runs twice', 'It fails to compile'],
    'answer_index': 1,
    'why': 'The starting value is never used, so the sequence begins one step late.'},
   {'stem': 'An accumulator for a sum should be initialised to:',
    'options': ['1', '0', 'The first value', 'It does not matter'],
    'answer_index': 1,
    'why': 'Zero is the identity for addition, so it leaves the sum unchanged.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'The anatomy of a while loop, and tracing it by hand',
   'schedule': [
     (6, 'Bell ringer: instructions that repeat'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'The four parts of a counting loop'),
     (10, 'Worked example: trace a while loop on paper'),
     (13, 'Accumulators, and where the update belongs'),
     (5, 'Misconception check: the condition is not rechecked mid-body'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'Trace tables are not optional here. Every student writes one, every time, until loops stop being mysterious.',
     'Mention infinite loops but do not dwell. A loop that hangs teaches less than one that is off by one.',
   ],
   'warmup': ('Instructions that repeat',
     'On the board: "Write instructions for climbing a staircase when you do not know how many steps it has. '
     'You may not write step, step, step. Three minutes."',
     'Every workable answer contains a condition and a repeated action: while there is another step, climb it. '
     'That is a while loop, and they wrote it before seeing the syntax.'),
   'objectives': [
     ('I can write a while loop with correct initialisation, condition, body and update.', 'LO 2.7.A'),
     ('I can trace a while loop by hand and predict its output exactly.', 'LO 2.7.B'),
     ('I can use an accumulator to build a result across iterations.', 'LO 2.7.C'),
   ],
   'sections': [
     ('The four parts of a counting loop', [
       'Initialise the loop variable before the loop starts, so the first test has something to look at.',
       'The condition is tested before every iteration, including the first. A false condition means the body never runs.',
       'Do the work first inside the body, then update the loop variable last. Updating first skips the starting value.',
       'Without an update that moves towards the condition becoming false, the loop never ends.',
     ]),
     ('Accumulators', [
       'An accumulator is declared before the loop so it survives across iterations, and updated inside it.',
       'A sum starts at 0 because 0 is the identity for addition. A product would start at 1.',
       'Declaring the accumulator inside the loop body resets it every pass, which is a different bug entirely.',
     ]),
   ],
   'worked': {
     'heading': 'Trace it before you run it',
     'code': 'import java.util.Scanner;\n\npublic class Sum\n{\n    public static void main(String[] args)\n    {\n        Scanner input = new Scanner(System.in);\n        int n = input.nextInt();\n\n        int i = 1;\n        int total = 0;\n        while (i <= n)\n        {\n            System.out.println(i);\n            total = total + i;\n            i++;\n        }\n        System.out.println(total);\n    }\n}',
     'notice': [
       'i = 1 before the loop - initialisation, so the first test is meaningful.',
       'i <= n - includes n itself, which is what "through n" means.',
       'i++ last - the work happens first, so the starting value is used.',
     ],
     'output': ['1', '2', '3', '6', '(for input 3)'],
     'caption': 'Complete and runnable as shown. Input 3 prints 1, 2, 3 then the total 6.',
     'stdin': '3\n',
     'note': 'Build the trace table on the board with columns i and total, one row per iteration, before running '
             'anything. Then run it and compare. Doing it in that order is the habit you are teaching.',
   },
   'break_it': {
     'change': 'Move i++ to the top of the body, above the println.',
     'happens': 'The output starts at 2 instead of 1, and the total is wrong by exactly the amount that was '
                'skipped and the amount that was added instead. It still terminates and still looks plausible.',
     'why': 'The update belongs last. Incrementing first means the starting value is never used, so the loop is '
            'off by one at the front and at the back simultaneously. Tonight\'s graded debugging exercise plants '
            'this together with a condition that stops one early.',
     'note': 'Have the trace table from the previous slide still on the board and amend it live. The divergence '
             'appears in the very first row.',
   },
   'misconception': {
     'heading': 'The loop stops the moment the condition becomes false',
     'think': 'As soon as i reaches n the loop stops immediately, even in the middle of the body.',
     'truth': 'The condition is only tested at the top, between iterations. Once the body has started it runs to '
              'the end regardless of what the loop variable becomes partway through. So a statement after the '
              'update still executes on the final pass. Loops check between iterations, never during one.',
     'note': 'This misconception produces "why did it print one more time" questions. Answering it now saves '
             'twenty minutes later in the unit.',
   },
   'discussion': [
     'What does a while loop do when its condition is false the very first time it is tested?',
     'Why does the update have to be the last statement in a counting loop rather than the first?',
   ],
   'learned': [
     'I can write a while loop with correct initialisation, condition, body and update.',
     'I can trace a while loop by hand and predict its output exactly.',
     'I can use an accumulator to build a result across iterations.',
   ],
   'up_next': 'Day 2 uses while loops with sentinel values and input, where the count is not known in advance.',
   'extra': 'Trace by hand, without running it, a while loop that prints 5 down to 1. Write the table.',
  },
  {
   'day': 2,
   'focus': 'Loops when the count is not known in advance',
   'schedule': [
     (5, 'Bell ringer: retrieval on loop anatomy'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Sentinels and condition-driven loops'),
     (10, 'Worked walkthrough: digit extraction, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Digit extraction with % and / is the classic condition-driven loop and it appears on the exam repeatedly.',
     'Insist on the trace table again. Two days of tables is what makes 2.9 possible.',
   ],
   'warmup': ('Retrieval on loop anatomy',
     'On the board, no notes: "1. Name the four parts of a counting loop. 2. Where does the update go? '
     '3. What runs first if the condition is false at the start?"',
     'Initialise, test, work, update; last; nothing at all. The third is the one students miss, and it matters '
     'today because a sentinel loop can legitimately run zero times.'),
   'objectives': [
     ('I can write a while loop that stops on a condition rather than a fixed count.', 'LO 2.7.A'),
     ('I can extract the digits of an integer using % and /.', 'LO 2.7.C'),
     ('I can predict how many times a loop body executes for a given input.', 'LO 2.7.B'),
   ],
   'sections': [
     ('Condition-driven loops', [
       'A while loop does not need a counter. Any condition that eventually becomes false will do.',
       'A loop driven by data may run zero times, and zero is a legitimate answer rather than an error.',
       'Whatever the condition depends on must be changed inside the body, or the loop cannot end.',
     ]),
     ('Digit extraction', [
       'n % 10 gives the last digit of n. n / 10 removes it, using integer division.',
       'Repeating those two steps while n > 0 visits every digit from the right.',
       'The loop ends because integer division drives n to 0, which is the update in disguise.',
     ]),
   ],
   'worked': {
     'heading': 'Every digit, right to left',
     'code': 'import java.util.Scanner;\n\npublic class Digits\n{\n    public static void main(String[] args)\n    {\n        Scanner input = new Scanner(System.in);\n        int n = input.nextInt();\n\n        int count = 0;\n        int sum = 0;\n        while (n > 0)\n        {\n            int digit = n % 10;\n            System.out.println(digit);\n            sum = sum + digit;\n            count++;\n            n = n / 10;\n        }\n        System.out.println(count);\n        System.out.println(sum);\n    }\n}',
     'notice': [
       'n % 10 - the last digit. n / 10 - everything except the last digit.',
       'n = n / 10 - the update. Without it the condition never changes.',
       'Zero iterations - an input of 0 prints no digits at all, which is correct here.',
     ],
     'output': ['4', '2', '3', '3', '9', '(for input 324)'],
     'caption': 'Complete and runnable as shown. Input 324 has three digits summing to 9.',
     'stdin': '324\n',
     'note': 'Trace 324 as a table with n, digit, sum and count. Students who see n go 324, 32, 3, 0 stop asking '
             'why the loop ends.',
   },
   'break_it': {
     'change': 'Change the condition from n > 0 to n >= 0.',
     'happens': 'The loop no longer terminates on its own: once n reaches 0, 0 / 10 is still 0 and the condition '
                'stays true forever. The program hangs.',
     'why': 'An update that stops changing the value stops being an update. The condition must eventually become '
            'false, and with >= 0 there is no value of n that ends it. This is the one bug where the symptom is '
            'a hang rather than a wrong answer.',
     'note': 'Have a terminal ready and be prepared to interrupt it. Seeing a program hang once is instructive; '
             'seeing it twice is a waste of the period.',
   },
   'misconception': {
     'heading': 'A loop always runs at least once',
     'think': 'The body of a loop runs at least one time, because that is what looping means.',
     'truth': 'A while loop tests before it does anything, so a condition that is false at the start means the '
              'body never runs and the program continues past it. Feeding 0 into the digit loop prints nothing '
              'at all. That is not a bug, and code after a loop must never assume the body ran.',
     'note': 'This becomes important in 2.9, where an algorithm seeded from the first element breaks on empty input.',
   },
   'discussion': [
     'For which input does the digit loop run zero times? Is that correct behaviour?',
     'What makes n = n / 10 an update, given that it does not look like a counter?',
   ],
   'learned': [
     'I can write a while loop that stops on a condition rather than a fixed count.',
     'I can extract the digits of an integer using % and /.',
     'I can predict how many times a loop body executes for a given input.',
   ],
   'up_next': 'Topic 2.8 introduces the for loop, which gathers the four parts into one line.',
   'extra': 'Complete the graded debugging exercise for 2.7. It plants an early stop and an update in the wrong place.',
  },
 ],
},
]
