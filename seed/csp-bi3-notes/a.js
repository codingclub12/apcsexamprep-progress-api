'use strict';
// Big Idea 3 guided notes, topics 3.1 to 3.9.
//
// Structurally matched to the 17 notes pages already live for Big Ideas 1, 2, 4
// and 5: hero, objectives, bell ringer, vocabulary table with blanks, numbered
// sections, exit ticket. A teacher printing a Big Idea 3 packet gets the same
// artifact they already print for Big Idea 1.
//
// OBJECTIVES ARE PLAIN LANGUAGE ON PURPOSE. The live Big Idea 1 notes carry CED
// learning objective codes (LO CRD-1.A and so on). The AAP codes for Big Idea 3
// were not verified against the CED during this build, and a wrong code inside a
// paid teacher product is worse than no code, so the objectives are stated in
// plain language and the codes are left to be added from the CED directly.
//
// Pure ASCII, no em-dashes. Zero PII: author content only.

module.exports = [
  {
    slug: 'variables',
    title: 'Variables and Assignments',
    seo: 'Printable AP CSP Topic 3.1 guided notes on variables and assignment, including tracing tables, the swap problem, and naming practice for students.',
    objectives: [
      'Represent a value with a variable, and explain what the variable holds at any point in a program',
      'Determine the value of a variable after a sequence of assignment statements',
      'Explain why assignment copies a value once rather than creating a lasting link between two variables',
    ],
    bellRinger: 'Two cups sit on a desk. One holds water, one holds juice. Without a third cup, swap them. Write down what goes wrong, then write down what you would need.',
    vocab: ['Variable', 'Assignment', 'Value', 'Trace table'],
    sections: [
      {
        heading: 'What Assignment Actually Does',
        blocks: [
          { type: 'text', src: '', text: 'The arrow in AP pseudocode moves a COPY of the value on the right into the variable on the left. It runs once, at the moment that line executes, and it does not create any ongoing relationship between the two names.' },
          { type: 'code', src: 'a <- 5\nb <- a\na <- 9' },
          { type: 'write', prompt: 'After these three lines, what does b hold? Write your answer and then write WHY.', lines: 2 },
          { type: 'warn', label: 'The mistake almost everyone makes once', text: 'Reading b <- a as "b is now a" instead of "b gets a copy of what a holds right now". Changing a afterwards does not reach back into b.' },
        ],
      },
      {
        heading: 'Tracing a Sequence',
        blocks: [
          { type: 'text', text: 'A trace table is one column per variable and one row per line of code. Fill it in line by line. This is the single most reliable way to answer an exam trace question.' },
          {
            type: 'table',
            head: ['Line', 'x', 'y'],
            rows: [
              ['x <- 3', '3', '(none yet)'],
              ['y <- 4', '3', '4'],
              ['x <- y', null, null],
              ['y <- x', null, null],
            ],
          },
          { type: 'muted', text: 'Complete the empty cells, then answer: what does x + y display at the end?' },
          { type: 'write', prompt: 'Final value of x + y, and why it is not 7.', lines: 2 },
        ],
      },
      {
        heading: 'The Swap Problem',
        blocks: [
          { type: 'text', text: 'Swapping two variables is the classic case where the obvious two lines destroy data. Work out why, then learn the three line version by heart.' },
          { type: 'code', src: 'p <- q\nq <- p' },
          { type: 'write', prompt: 'What do p and q both hold after those two lines? Which original value is gone forever?', lines: 2 },
          { type: 'code', src: 'temp <- p\np <- q\nq <- temp' },
          { type: 'dd', label: 'Exam tip', text: 'If a question shows a swap without a temporary variable, the answer is almost always that both variables end up holding the same value.' },
        ],
      },
      {
        heading: 'Naming Is Part of the Work',
        blocks: [
          { type: 'text', text: 'A variable name is the only clue a reader gets about what a value means. Names cost nothing at runtime and are worth a great deal to whoever debugs the program, which is often you next week.' },
          {
            type: 'table',
            head: ['Weak name', 'Better name', 'Why'],
            rows: [
              ['x', 'studentCount', 'Says what is being counted'],
              ['temp2', null, null],
              ['d', null, null],
            ],
          },
        ],
      },
    ],
    exitTicket: 'In one sentence, explain to a classmate who missed today why b does not change when a changes, even though b was set from a.',
  },

  {
    slug: 'data-abstraction',
    title: 'Data Abstraction',
    seo: 'Printable AP CSP Topic 3.2 guided notes on data abstraction, lists versus separate variables, and using abstraction to manage program complexity.',
    objectives: [
      'Represent a collection of related values using a single list variable',
      'Explain how data abstraction manages complexity in a program',
      'Compare a design using separate variables with one using a list, and justify the choice',
    ],
    bellRinger: 'You must track the score of every student in this room. Write down how many variables you would need if each score got its own name. Now imagine the class doubles. What has to change in your code?',
    vocab: ['Data abstraction', 'List', 'Element', 'Index'],
    sections: [
      {
        heading: 'Forty Variables or One List',
        blocks: [
          { type: 'text', text: 'Separate variables force the number of items to be written into the source code. A list moves that number into the data, where it belongs, so the same code handles four items or four thousand.' },
          {
            type: 'table',
            head: ['Task', 'With 40 separate variables', 'With one list'],
            rows: [
              ['Add up all scores', '40 lines of addition', 'One loop'],
              ['Add a 41st student', null, null],
              ['Find the highest score', null, null],
            ],
          },
          { type: 'write', prompt: 'In your own words: what does the list version let you stop caring about?', lines: 2 },
        ],
      },
      {
        heading: 'What Abstraction Buys and What It Costs',
        blocks: [
          { type: 'text', text: 'Abstraction hides detail behind a name. That is a benefit exactly when the hidden detail is not needed at that point in the program, and a cost when a reader needs the detail and cannot see it.' },
          {
            type: 'list',
            items: [
              'Benefit: the rest of the program refers to one name instead of tracking every value',
              'Benefit: a change to how the data is stored affects fewer places',
              'Cost: a reader who needs to know what is inside has to go look',
            ],
          },
          { type: 'dd', label: 'Exam tip', text: 'When a free response asks how abstraction manages complexity, say what the program no longer has to track by hand. That is the sentence that earns the point.' },
        ],
      },
      {
        heading: 'Records: Keeping Related Values Together',
        blocks: [
          { type: 'text', text: 'Parallel lists, one per attribute, rely on matching positions. Any operation that reorders one and not the others silently corrupts every record. Grouping the attributes of one thing together removes that whole class of bug.' },
          { type: 'write', prompt: 'Describe a specific operation that would break parallel lists but not grouped records.', lines: 3 },
        ],
      },
    ],
    exitTicket: 'Name one thing in your own Create Task idea that should be stored in a list rather than as separate variables, and say why.',
  },

  {
    slug: 'mathematical-expressions',
    title: 'Mathematical Expressions',
    seo: 'Printable AP CSP Topic 3.3 guided notes on arithmetic expressions, order of operations, and the MOD operator with worked practice for students.',
    objectives: [
      'Evaluate arithmetic expressions using the correct order of operations',
      'Use the MOD operator to find a remainder, and recognize the problems it solves',
      'Predict the result of an expression before running it',
    ],
    bellRinger: 'You have 17 cookies and 5 students. Everyone gets the same whole number of cookies. How many does each get, and how many are left over? Write both numbers down. You just computed integer division and MOD.',
    vocab: ['Expression', 'Operator', 'MOD', 'Order of operations'],
    sections: [
      {
        heading: 'Order of Operations',
        blocks: [
          { type: 'text', text: 'Multiplication, division, and MOD happen before addition and subtraction. Parentheses override that. Nothing about this changes because you are in a program.' },
          { type: 'code', src: '2 + 3 * 4\n(2 + 3) * 4\n20 / 4 + 1\n20 / (4 + 1)' },
          { type: 'write', prompt: 'Evaluate all four expressions above. Show the step you did first in each.', lines: 4 },
        ],
      },
      {
        heading: 'MOD: The Operator the Exam Loves',
        blocks: [
          { type: 'text', text: 'MOD gives the REMAINDER after division. It shows up on the exam far more than its share of class time would suggest, because it solves three common problems in one operator.' },
          {
            type: 'table',
            head: ['Problem', 'Expression', 'Result'],
            rows: [
              ['Is n even?', 'n MOD 2 = 0', 'true when n is even'],
              ['Is n divisible by 5?', null, null],
              ['Wrap a position around 12 slots', null, null],
              ['Last digit of n', 'n MOD 10', null],
            ],
          },
          { type: 'warn', label: 'Common mistake', text: 'Confusing the quotient with the remainder. 17 divided by 5 gives 3 with 2 left over: the quotient is 3 and 17 MOD 5 is 2.' },
        ],
      },
      {
        heading: 'Division by Zero',
        blocks: [
          { type: 'text', text: 'Dividing by zero stops the program. Any expression whose divisor could be zero needs a guard before it runs, not an apology afterwards.' },
          { type: 'code', src: 'IF (count > 0)\n{\n  average <- total / count\n}\nELSE\n{\n  DISPLAY "no data"\n}' },
          { type: 'write', prompt: 'Where in your own program could a divisor become zero? Write the guard you would add.', lines: 3 },
        ],
      },
    ],
    exitTicket: 'Write one expression using MOD that would be genuinely useful in a program you might actually write, and say what it computes.',
  },

  {
    slug: 'strings',
    title: 'Strings',
    seo: 'Printable AP CSP Topic 3.4 guided notes on string concatenation, substrings, length, and the difference between numeric and text values.',
    objectives: [
      'Build new strings by concatenating existing ones',
      'Determine the length of a string and extract a substring from it',
      'Explain why a value that looks like a number may behave as text',
    ],
    bellRinger: 'Write "5" + "3" on your paper and predict what a program would produce. Then write 5 + 3. Explain the difference in one sentence before we start.',
    vocab: ['String', 'Concatenation', 'Substring', 'Length'],
    sections: [
      {
        heading: 'Concatenation Joins, It Does Not Add',
        blocks: [
          { type: 'text', text: 'Concatenation places one sequence of characters after another. The pieces are joined exactly as given, including spaces or the absence of them.' },
          {
            type: 'table',
            head: ['Pieces joined', 'Result'],
            rows: [
              ['"Ada", "Lovelace"', 'AdaLovelace'],
              ['"Ada", " ", "Lovelace"', null],
              ['"5", "3"', null],
              ['"Room ", "12"', null],
            ],
          },
          { type: 'warn', label: 'Common mistake', text: 'Forgetting the space. Two names joined directly produce one run together word, and this costs points on exam questions asking for exact output.' },
        ],
      },
      {
        heading: 'Length and Substring',
        blocks: [
          { type: 'text', text: 'Length counts every character, including spaces. A substring is a specified number of characters starting at a specified position, and AP pseudocode counts positions from 1.' },
          { type: 'code', src: 'word <- "COMPUTER"' },
          { type: 'write', prompt: 'What is the length of word? What are the first four characters? What are the last three?', lines: 3 },
        ],
      },
      {
        heading: 'When a Number Is Not a Number',
        blocks: [
          { type: 'text', text: 'A phone number, a postal code, and a student ID are written with digits and are not quantities. Store them as text. A numeric value carries magnitude and drops formatting, which is how a leading zero disappears.' },
          {
            type: 'list',
            items: [
              'Store as a number: anything you would add, average, or compare by size',
              'Store as text: anything where the digits are an identifier rather than an amount',
            ],
          },
          { type: 'write', prompt: 'List two values from your own project and say which way each should be stored.', lines: 3 },
        ],
      },
    ],
    exitTicket: 'Explain in one sentence why a program that stores a postal code as a number can lose data.',
  },

  {
    slug: 'boolean-expressions',
    title: 'Boolean Expressions',
    seo: 'Printable AP CSP Topic 3.5 guided notes on boolean expressions, relational and logical operators, truth tables, and rewriting negated conditions.',
    objectives: [
      'Evaluate expressions built from relational operators',
      'Evaluate expressions built with AND, OR, and NOT',
      'Rewrite a negated compound condition into an equivalent form',
    ],
    bellRinger: 'The sign says: enter if you are 13 or older AND have a ticket. Write down every combination of age and ticket, and mark which ones get in. You just built a truth table.',
    vocab: ['Boolean', 'Relational operator', 'Logical operator', 'Truth table'],
    sections: [
      {
        heading: 'Relational Operators and Boundaries',
        blocks: [
          { type: 'text', text: 'Every relational operator has a boundary value, and the boundary is where programs break and where exam questions aim. Read the operator carefully: greater than excludes the boundary, greater than or equal includes it.' },
          {
            type: 'table',
            head: ['Condition', 'True when x is 4?', 'True when x is 5?', 'True when x is 6?'],
            rows: [
              ['x > 5', 'no', 'no', 'yes'],
              ['x >= 5', null, null, null],
              ['x < 5', null, null, null],
              ['x <= 5', null, null, null],
            ],
          },
        ],
      },
      {
        heading: 'AND, OR, NOT',
        blocks: [
          {
            type: 'list',
            items: [
              'AND is true only when BOTH sides are true',
              'OR is true when AT LEAST ONE side is true',
              'NOT flips true to false and false to true',
            ],
          },
          { type: 'code', src: 'a <- 5\nb <- 10\n(a > 3) AND (b < 10)\n(a > 3) OR (b < 10)' },
          { type: 'write', prompt: 'Evaluate both expressions. For each, name the operand that decided the result.', lines: 3 },
        ],
      },
      {
        heading: 'Negating a Compound Condition',
        blocks: [
          { type: 'text', text: 'Negating an AND gives an OR of the negations. Negating an OR gives an AND of the negations. This shows up on the exam every year, usually disguised as a rule written in English.' },
          {
            type: 'table',
            head: ['Original', 'Equivalent'],
            rows: [
              ['NOT (p AND q)', 'NOT p OR NOT q'],
              ['NOT (p OR q)', null],
              ['NOT (x > 5)', null],
              ['NOT (x = 3)', null],
            ],
          },
          { type: 'warn', label: 'Common mistake', text: 'Distributing NOT without flipping AND to OR. NOT (p AND q) is not the same as NOT p AND NOT q, and a truth table shows the difference in one row.' },
        ],
      },
    ],
    exitTicket: 'Write the condition for: admit anyone who is NOT both under 13 and unaccompanied. Then write it a second way without the outer NOT.',
  },

  {
    slug: 'conditionals',
    title: 'Conditionals',
    seo: 'Printable AP CSP Topic 3.6 guided notes on IF and ELSE selection statements, boundary values, and tracing which branch executes.',
    objectives: [
      'Express an algorithm that uses selection',
      'Determine which branch of a conditional executes for a given input',
      'Explain what happens when an IF has no ELSE and the condition is false',
    ],
    bellRinger: 'Write the rule your school uses to decide whether you are late. Now write down the exact time that sits on the boundary. Does that time count as late? Most rules are unclear here, and programs cannot be.',
    vocab: ['Conditional', 'Selection', 'Branch', 'Boundary value'],
    sections: [
      {
        heading: 'IF, ELSE, and Exactly One Branch',
        blocks: [
          { type: 'text', text: 'When an ELSE is present, exactly one of the two blocks runs. Never both, and never neither.' },
          { type: 'code', src: 'IF (temp > 32)\n{\n  DISPLAY "above"\n}\nELSE\n{\n  DISPLAY "at or below"\n}' },
          { type: 'write', prompt: 'What is displayed when temp is 33? When temp is 32? When temp is 31?', lines: 3 },
        ],
      },
      {
        heading: 'Boundary Values Are Where Bugs Live',
        blocks: [
          { type: 'text', text: 'Test every conditional with three values: one below the boundary, one exactly on it, and one above. The middle one is the test almost nobody runs and the one that finds the bug.' },
          {
            type: 'table',
            head: ['Rule in English', 'Correct condition', 'Wrong condition and what it breaks'],
            rows: [
              ['A for 90 and above', 'score >= 90', 'score > 90 gives exactly 90 a B'],
              ['Free under 5', null, null],
              ['At least 8 characters', null, null],
            ],
          },
        ],
      },
      {
        heading: 'IF Without ELSE',
        blocks: [
          { type: 'text', text: 'An IF with no ELSE simply skips its block when the condition is false, and execution continues on the next line. That is defined behavior, not an error, which is exactly why a missing case can sit in a program for months.' },
          { type: 'write', prompt: 'Write an IF with no ELSE, then write down what happens for an input that makes the condition false.', lines: 3 },
        ],
      },
    ],
    exitTicket: 'Write down one condition from your own program and the three test values you would use on it.',
  },

  {
    slug: 'nested-conditionals',
    title: 'Nested Conditionals',
    seo: 'Printable AP CSP Topic 3.7 guided notes on nested conditionals, ELSE IF chains, branch ordering, and unreachable branches.',
    objectives: [
      'Express an algorithm that uses nested selection',
      'Determine the result of nested conditional statements',
      'Explain why the ORDER of branches in a chain changes the outcome',
    ],
    bellRinger: 'Write the grading scale for this class as a list of rules, in the order you would check them. Keep your paper. We will find out whether your order works.',
    vocab: ['Nested conditional', 'ELSE IF chain', 'Unreachable branch'],
    sections: [
      {
        heading: 'A Chain Is Exclusive',
        blocks: [
          { type: 'text', text: 'In an ELSE IF chain, a later branch is only reached when every earlier condition was false. Once a branch runs, the rest of the chain is skipped entirely.' },
          { type: 'code', src: 'IF (score >= 90)\n{\n  DISPLAY "A"\n}\nELSE IF (score >= 80)\n{\n  DISPLAY "B"\n}\nELSE IF (score >= 70)\n{\n  DISPLAY "C"\n}' },
          { type: 'write', prompt: 'Trace a score of 95, then 85, then 75, then 65. Which branch runs each time?', lines: 4 },
        ],
      },
      {
        heading: 'Order Breaks It',
        blocks: [
          { type: 'text', text: 'Now reverse the chain so the 70 test comes first. Every passing score matches it, so the 80 and 90 branches can never be reached. Nothing about this is a syntax error, and the program runs happily while being wrong.' },
          { type: 'warn', label: 'The rule', text: 'In a chain of threshold tests, order from the STRICTEST condition to the loosest. The broadest test goes last, or it swallows everything.' },
          { type: 'write', prompt: 'Look at the grading scale you wrote in the bell ringer. Does your order work? Fix it if not.', lines: 3 },
        ],
      },
      {
        heading: 'Nesting Versus AND',
        blocks: [
          { type: 'text', text: 'A conditional inside a conditional can sometimes be flattened into one condition joined with AND. That rewrite is safe only when the inner conditional has no ELSE, because an inner ELSE has nowhere to go in the flattened version.' },
          { type: 'code', src: 'IF (age >= 18)\n{\n  IF (hasTicket)\n  {\n    DISPLAY "enter"\n  }\n}' },
          { type: 'write', prompt: 'Rewrite the segment above as a single IF using AND. Then explain why you could not do this if the inner IF had an ELSE.', lines: 4 },
        ],
      },
    ],
    exitTicket: 'In one sentence, explain why a set of individually correct conditions can still produce a wrong program.',
  },

  {
    slug: 'iteration',
    title: 'Iteration',
    seo: 'Printable AP CSP Topic 3.8 guided notes on REPEAT and REPEAT UNTIL loops, counting iterations, accumulation, and avoiding infinite loops.',
    objectives: [
      'Express an algorithm that uses iteration',
      'Determine the number of times a loop body executes',
      'Explain what makes a loop terminate, and what makes one run forever',
    ],
    bellRinger: 'Count out loud from 1 while stepping forward, and stop when you pass 4. How many steps did you take? Write the number down. Half the class will disagree, and that disagreement is the entire topic.',
    vocab: ['Iteration', 'Loop body', 'Loop condition', 'Infinite loop'],
    sections: [
      {
        heading: 'Two Kinds of Loop',
        blocks: [
          {
            type: 'list',
            items: [
              'REPEAT n TIMES runs the body exactly n times, no matter what the body does',
              'REPEAT UNTIL (condition) runs the body until the condition becomes true, which requires the body to make progress toward it',
            ],
          },
          { type: 'code', src: 'i <- 1\ntotal <- 0\nREPEAT UNTIL (i > 4)\n{\n  total <- total + i\n  i <- i + 1\n}' },
          {
            type: 'table',
            head: ['Pass', 'i at start', 'total after', 'i after'],
            rows: [
              ['1', '1', '1', '2'],
              ['2', '2', null, null],
              ['3', null, null, null],
              ['4', null, null, null],
            ],
          },
          { type: 'muted', text: 'Complete the table, then answer: how many passes ran, and what is the final total?' },
        ],
      },
      {
        heading: 'Off by One',
        blocks: [
          { type: 'text', text: 'The three things that decide how many passes a loop runs are the starting value, the comparison operator, and the amount of change per pass. Get one wrong and you are off by exactly one, which is the most common loop bug there is.' },
          {
            type: 'table',
            head: ['Start', 'Condition', 'Values visited'],
            rows: [
              ['i <- 1', 'REPEAT UNTIL (i > 3)', '1, 2, 3'],
              ['i <- 0', 'REPEAT UNTIL (i > 3)', null],
              ['i <- 1', 'REPEAT UNTIL (i >= 3)', null],
            ],
          },
        ],
      },
      {
        heading: 'Infinite Loops',
        blocks: [
          { type: 'text', text: 'A condition based loop needs the body to move the program toward the exit condition. If nothing in the body changes what the condition tests, the loop never ends.' },
          { type: 'code', src: 'i <- 1\nREPEAT UNTIL (i > 3)\n{\n  DISPLAY i\n}' },
          { type: 'write', prompt: 'Why does this never end? Write the one line that fixes it and say where it goes.', lines: 3 },
        ],
      },
    ],
    exitTicket: 'Write a loop that displays exactly the values 1 through 5, then write down how you verified the count.',
  },

  {
    slug: 'developing-algorithms',
    title: 'Developing Algorithms',
    seo: 'Printable AP CSP Topic 3.9 guided notes on combining sequencing, selection, and iteration, plus the standard find-max and counting algorithms.',
    objectives: [
      'Express an algorithm that combines sequencing, selection, and iteration',
      'Compare two algorithms that solve the same problem',
      'Identify the input on which an algorithm fails',
    ],
    bellRinger: 'Describe, step by step, how you would find the tallest person in this room if you could only compare two people at a time. Write your steps down. You have just written the find-max algorithm.',
    vocab: ['Algorithm', 'Accumulator', 'Edge case'],
    sections: [
      {
        heading: 'The Three Building Blocks',
        blocks: [
          { type: 'text', text: 'Every algorithm in this course is built from three things: doing steps in order, choosing between steps, and repeating steps. Most real algorithms use all three at once.' },
          {
            type: 'table',
            head: ['Building block', 'Keyword', 'What it gives you'],
            rows: [
              ['Sequencing', 'one line after another', 'Order'],
              ['Selection', 'IF and ELSE', null],
              ['Iteration', 'REPEAT', null],
            ],
          },
        ],
      },
      {
        heading: 'Find the Maximum',
        blocks: [
          { type: 'text', text: 'Seed the answer with the FIRST element, not with zero. Seeding with a constant assumes something in the list will beat it, and that assumption fails on a list of negative numbers.' },
          { type: 'code', src: 'best <- list[1]\nFOR EACH v IN list\n{\n  IF (v > best)\n  {\n    best <- v\n  }\n}\nDISPLAY best' },
          { type: 'write', prompt: 'Trace this on [3, 9, 2]. Now trace the version that starts with best <- 0 on the list [-5, -2, -9]. What goes wrong?', lines: 4 },
        ],
      },
      {
        heading: 'Counting and Accumulating',
        blocks: [
          { type: 'text', text: 'A counter adds 1 per qualifying element. An accumulator adds the VALUE of each element. Mixing them up produces an answer that looks reasonable and is wrong.' },
          {
            type: 'table',
            head: ['Goal', 'Start with', 'Inside the loop'],
            rows: [
              ['Count values above 10', 'count <- 0', 'count <- count + 1'],
              ['Sum all values', null, null],
              ['Sum only values above 10', null, null],
            ],
          },
        ],
      },
      {
        heading: 'Edge Cases',
        blocks: [
          { type: 'text', text: 'Before you call an algorithm finished, run it on the awkward inputs. These are the ones the exam and real users both find immediately.' },
          {
            type: 'list',
            items: [
              'The empty list',
              'A list with exactly one element',
              'A list where every element is the same',
              'A list where no element satisfies the condition',
            ],
          },
          { type: 'write', prompt: 'Pick one algorithm you have written. What does it do on an empty list? Is that what it should do?', lines: 3 },
        ],
      },
    ],
    exitTicket: 'Write the one line you would change to turn a find-maximum algorithm into a find-minimum algorithm.',
  },
];
