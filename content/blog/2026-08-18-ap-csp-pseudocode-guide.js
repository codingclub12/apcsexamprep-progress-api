'use strict';
// Weekly course post: AP CSP. Evergreen concept guide, not news. Teaches the
// full College Board pseudocode syntax from the AP CSP Exam Reference Sheet
// in one sitting, with a Python comparison table since that is the language
// most students already know and the place the differences become obvious.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'What AP CSP Pseudocode Actually Is',
  'Variable Assignment: The Arrow Operator',
  'Displaying Output',
  'IF, ELSE IF, and ELSE',
  'The Two Loop Forms: REPEAT n TIMES and REPEAT UNTIL',
  'Boolean Operators: NOT, AND, OR',
  'Comparison Operators',
  'Lists Are 1-Indexed, Not 0-Indexed',
  'Procedures, Parameters, and RETURN',
  'Pseudocode vs Python, Side by Side',
];

const meta = {
  title: 'AP CSP Pseudocode: The Whole Syntax in One Sitting',
  handle: 'ap-csp-pseudocode-complete-syntax-guide',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp pseudocode',
  publishOn: '2026-08-19',
  seoTitle: 'AP CSP Pseudocode: The Complete Syntax Guide',
  seoDescription: 'Every keyword and symbol in College Board AP CSP pseudocode, taught with worked examples and a Python comparison table, in one sitting.',
  summary: 'AP CSP does not test a real programming language. It tests College Board own invented pseudocode, and nearly every point students lose comes from a syntax detail they never actually drilled. This is the full reference: assignment, output, conditionals, both loop forms, boolean and comparison operators, lists, and procedures, taught side by side with the Python most students already know.',
  tags: ['AP CSP', 'Pseudocode', 'Exam Reference Sheet', 'Study Guide', 'Syntax Reference'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('AP CSP pseudocode is not a real programming language, and it is not trying to be. It is College Board own invented notation, described in full on the AP CSP Exam Reference Sheet, and it looks close enough to Python or JavaScript that students stop reading it carefully. That is exactly where the points go missing.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'August 18, 2026', updated: 'August 18, 2026', readingMinutes: 12,
  }),
  H.toc(SECTIONS),

  H.p('Here is the part that should be reassuring: the whole language is small. About a dozen keywords, a handful of operators, and two loop shapes cover everything the exam can ask you to read or write. You could genuinely learn all of it in one sitting, which is the point of this guide. The problem was never that AP CSP pseudocode is hard. The problem is that almost nobody sits down and drills it as its own thing. Students arrive already fluent in Python, or JavaScript, or Scratch, assume the pseudocode works the same way, and then lose a multiple choice question or a written response point to a syntax rule that differs in one small, specific way from the language they actually know.'),

  H.h2(SECTIONS[0]),
  H.p('When people say "AP CSP pseudocode" they mean the exact notation defined in the AP Computer Science Principles Exam Reference Sheet, the document you are handed on exam day and allowed to use throughout the multiple choice section and the Create performance task written responses. It is not Python. It is not any language a compiler would accept. It exists purely so College Board can ask you to trace an algorithm or write one without testing whether you memorized a specific language syntax.'),
  H.p('That design goal is also why the rules are so exact. Because the pseudocode has no compiler to catch a mistake, the exam has to define its grammar precisely and grade against that definition, and so do you. A comparison written with two equals signs instead of one, a loop that runs one too many or too few times, an index that starts at the wrong number: these are not typos on this exam, they are wrong answers.'),
  H.box('key', 'The one habit that fixes most of this', '<p>Every time you read or write AP CSP pseudocode, ask yourself which of the roughly twelve constructs below you are looking at, and say its exact syntax out loud. Students who treat pseudocode as "basically Python" skim past the differences. Students who treat it as its own small language with its own dozen rules stop making the mistakes that live in this guide.</p>'),

  H.h2(SECTIONS[1]),
  H.p('Assignment is the very first place Python habits misfire. AP CSP pseudocode does not use a single equals sign to assign a value. It uses a left-pointing arrow, written as <code>&larr;</code>. The variable on the left receives whatever the expression on the right evaluates to, read right to left.'),
  H.code('score ← 0\ncount ← count + 1\nname ← "Ada"'),
  H.p('Nothing on the right side of the arrow changes meaning from what you already expect: <code>count + 1</code> is computed first, using the current value of <code>count</code>, and the result is then stored back into <code>count</code>. What changes is purely the symbol. If you write <code>score = 0</code> on a written response, a reader grading strictly against the reference sheet has grounds to mark it as not using the defined assignment operator, even though the intent is obvious.'),

  H.h2(SECTIONS[2]),
  H.p('Output is simpler than most students expect, and there is exactly one way to write it. The <code>DISPLAY</code> command takes a single expression in parentheses and shows its value.'),
  H.code('total ← 15\nDISPLAY (total)\nDISPLAY ("The total is")\nDISPLAY (total + 5)'),
  H.p('There is no formatting, no string concatenation shorthand, and no equivalent of a Python f-string built into the reference sheet. If a question wants you to display a label and a value together, expect either two separate <code>DISPLAY</code> calls or a prompt that tells you exactly how the pieces combine. Do not invent a syntax the reference sheet does not define.'),

  H.h2(SECTIONS[3]),
  H.p('Conditionals use curly braces around each block, and there is no <code>elif</code>. The chain is written as <code>IF</code>, then as many <code>ELSE IF</code> blocks as needed, then an optional final <code>ELSE</code>.'),
  H.code('IF (condition)\n{\n  <block of statements>\n}\nELSE IF (condition)\n{\n  <block of statements>\n}\nELSE\n{\n  <block of statements>\n}'),
  H.box('warn', 'The mistake this catches most often', '<p>Only one branch of an IF / ELSE IF / ELSE chain ever runs, the first one whose condition is true, top to bottom. Students who are used to writing several separate IF statements in a row sometimes trace an ELSE IF chain as if every condition gets checked independently. It does not. Once a branch fires, the rest of the chain is skipped entirely, even if a later condition would also have been true.</p>'),

  H.h2(SECTIONS[4]),
  H.p('There are exactly two loop forms on the reference sheet, and they cover every repeated action the exam will ask about. Neither one looks like a Python <code>for</code> or <code>while</code> loop, though each maps onto one of them.'),
  H.h3('REPEAT n TIMES'),
  H.p('This runs the block a fixed number of times, counted before the loop starts. It is the pseudocode equivalent of <code>for i in range(n)</code> when you do not need the counter itself inside the loop.'),
  H.code('REPEAT 4 TIMES\n{\n  DISPLAY ("Hello")\n}'),
  H.h3('REPEAT UNTIL'),
  H.p('This runs the block again and again until a condition becomes true, checking the condition before each pass. That phrasing is the exact opposite of a Python <code>while</code> loop, which keeps running while its condition is true. A REPEAT UNTIL loop keeps running while its condition is false, and stops the moment the condition becomes true.'),
  H.code('count ← 0\nREPEAT UNTIL (count = 5)\n{\n  DISPLAY (count)\n  count ← count + 1\n}'),
  H.box('warn', 'Translate the condition, do not just copy it', '<p>The single most common REPEAT UNTIL error is writing the condition you would use in a Python while loop instead of its opposite. "Keep going while the list is not empty" becomes REPEAT UNTIL the list IS empty, not REPEAT UNTIL the list is not empty. Read UNTIL as the stopping condition, never as the continuing condition.</p>'),

  H.h2(SECTIONS[5]),
  H.p('Boolean logic in AP CSP pseudocode is written with words, not symbols. There is no <code>&amp;&amp;</code>, no <code>||</code>, and no <code>!</code>. Instead the reference sheet defines three keywords: <code>NOT</code>, <code>AND</code>, and <code>OR</code>, each used exactly the way the English word suggests.'),
  H.code('IF (NOT foundMatch)\n{\n  DISPLAY ("Still searching")\n}\nIF (age ≥ 13 AND age < 20)\n{\n  DISPLAY ("Teenager")\n}\nIF (isWeekend OR isHoliday)\n{\n  DISPLAY ("No school")\n}'),
  H.p('These combine with parentheses exactly like you would expect: <code>AND</code> requires both sides to be true, <code>OR</code> requires at least one side, and <code>NOT</code> flips a single condition. What trips students up is not the logic, it is remembering to write the word rather than reaching for a symbol out of habit under time pressure.'),

  H.h2(SECTIONS[6]),
  H.p('Comparisons use their own small set of symbols, and one of them looks exactly like the assignment operator you just learned to avoid using for comparison. Equality in a condition is written with a single equals sign, <code>=</code>, not the double equals of most real languages. There is no dedicated symbol confusion here because AP CSP pseudocode simply reuses the single equals sign for both roles, and context (an assignment statement versus a condition inside parentheses) tells you which one you are looking at.'),
  H.code('IF (score = 100)\n{\n  DISPLAY ("Perfect")\n}\nIF (score ≠ 0)\n{\n  DISPLAY ("Attempted")\n}\nIF (score ≥ 60)\n{\n  DISPLAY ("Passing")\n}'),
  H.p('The full set is <code>=</code> for equals, <code>&ne;</code> for not equal, and the familiar <code>&gt;</code>, <code>&lt;</code>, <code>&ge;</code>, and <code>&le;</code> for the ordering comparisons. On a typed written response where the special characters are not available, College Board accepts a clearly written approximation like <code>!=</code> or <code>&gt;=</code>, but on multiple choice questions you will see the exact symbols from the reference sheet and need to read them correctly.'),

  H.h2(SECTIONS[7]),
  H.p('Lists are where a Python habit becomes an actively wrong answer instead of just an unfamiliar symbol. In AP CSP pseudocode, the first element of a list is at index 1, not index 0. <code>myList[1]</code> is the first item. This is the single most exam-costly detail in the whole language, because it is invisible until the exact moment you get a question wrong.'),
  H.code('numbers ← [10, 20, 30]\nDISPLAY (numbers[1])\nDISPLAY (numbers[3])'),
  H.p('That code displays <code>10</code> and then <code>30</code>. A student reading it with 0-indexed instincts will predict the second and fourth lines wrong, because in a 0-indexed language <code>numbers[1]</code> would be the second element, not the first.'),
  H.p('The reference sheet defines four list operations beyond indexing, and each has a fixed name and argument order:'),
  H.ul([
    '<code>APPEND(list, value)</code> adds value to the end of list, growing its length by one',
    '<code>INSERT(list, i, value)</code> inserts value at index i, shifting every later element up by one position',
    '<code>REMOVE(list, i)</code> removes the element at index i, shifting every later element back by one position',
    '<code>LENGTH(list)</code> returns the number of elements currently in list',
  ]),
  H.code('numbers ← [10, 20, 30]\nAPPEND(numbers, 40)\nDISPLAY (numbers[2])\nDISPLAY (LENGTH(numbers))'),
  H.p('After the APPEND, the list holds four elements. <code>numbers[2]</code> is still the second element, 20, because APPEND only adds to the end and does not renumber anything before it. <code>LENGTH(numbers)</code> returns four.'),

  H.h2(SECTIONS[8]),
  H.p('A procedure is defined with the <code>PROCEDURE</code> keyword, a name, and a parenthesized parameter list, and its body sits inside curly braces exactly like a conditional or a loop.'),
  H.code('PROCEDURE double(value)\n{\n  RETURN (value * 2)\n}\ndoubled ← double(21)\nDISPLAY (doubled)'),
  H.p('<code>RETURN</code> is the piece that catches people who assume it behaves like a Python return does in casual reading but forget what "immediate" means in a graded trace. The moment a <code>RETURN</code> statement executes, the procedure exits on the spot. Any statements written after it inside the same block never run, even if they appear before the closing brace.'),
  H.code('PROCEDURE classify(number)\n{\n  IF (number < 0)\n  {\n    RETURN ("negative")\n  }\n  RETURN ("non-negative")\n  DISPLAY ("This line never executes")\n}'),
  H.box('warn', 'Read every RETURN as an exit door, not a label', '<p>Students tracing a procedure by eye sometimes read RETURN the way they read a labeled result, then keep scanning down the block for more logic that might apply. On the exam trace it that way and you will credit a value the procedure never actually reaches. Once a RETURN executes, the procedure is done, full stop, regardless of what code sits below it.</p>'),
  H.p('For a deeper look at how these procedures show up on the graded portion of the exam, our <a href="/pages/ap-csp-written-response-guide">written response guide</a> works through full Create performance task examples using this exact syntax.'),

  H.h2(SECTIONS[9]),
  H.p('If you already know Python, the fastest way to lock this in is to see the two languages next to each other for the constructs above. The logic is identical in every row. Only the notation changes.'),
  H.table(
    ['Concept', 'AP CSP pseudocode', 'Python equivalent'],
    [
      ['Assignment', 'count ← count + 1', 'count = count + 1'],
      ['Equality test', 'IF (score = 100)', 'if score == 100:'],
      ['Not equal', 'IF (score ≠ 0)', 'if score != 0:'],
      ['Boolean AND / OR / NOT', 'age ≥ 13 AND age < 20', 'age >= 13 and age < 20'],
      ['Multi-branch conditional', 'IF / ELSE IF / ELSE', 'if / elif / else'],
      ['Fixed-count loop', 'REPEAT 4 TIMES { ... }', 'for i in range(4):'],
      ['Condition-controlled loop', 'REPEAT UNTIL (done) { ... }', 'while not done:'],
      ['First list element', 'myList[1]', 'myList[0]'],
      ['Add to end of list', 'APPEND(myList, value)', 'myList.append(value)'],
      ['Define a function', 'PROCEDURE name(param) { ... }', 'def name(param):'],
      ['Exit with a value', 'RETURN (value)', 'return value'],
    ]
  ),
  H.p('Keep that table nearby while you practice released multiple choice questions. Most students find that once the mapping is visible in one place, the pseudocode stops feeling like a foreign notation and starts feeling like Python wearing different words.'),

  H.h2('Practice the Whole Language'),
  H.p('Both questions below use only the syntax covered above, written correctly. Trace each one by hand before checking the answer.'),
  H.mcq({
    n: 1,
    stem: 'What is displayed by the following pseudocode?',
    codeText: 'score ← 72\nIF (score ≥ 90)\n{\n  DISPLAY ("A")\n}\nELSE IF (score ≥ 80 AND score < 90)\n{\n  DISPLAY ("B")\n}\nELSE IF (score ≥ 70)\n{\n  DISPLAY ("C")\n}\nELSE\n{\n  DISPLAY ("F")\n}',
    options: ['"A"', '"B"', '"C"', '"F"'],
    correct: 2,
    why: 'score is 72, which fails the first condition (≥ 90) and the second (≥ 80 AND < 90), then satisfies the third (≥ 70), so "C" displays and the chain stops there. The trap is assuming the chain keeps evaluating after a true branch, or that a later ELSE IF could also fire. In an IF / ELSE IF / ELSE chain, exactly one branch ever runs: the first one whose condition is true, checked strictly top to bottom.',
  }),
  H.mcq({
    n: 2,
    stem: 'What is displayed by the following pseudocode?',
    codeText: 'numbers ← [10, 20, 30]\nAPPEND(numbers, 40)\nDISPLAY (numbers[2])',
    options: ['10', '20', '30', '40'],
    correct: 1,
    why: 'The list starts as [10, 20, 30]. APPEND adds 40 to the end, making it [10, 20, 30, 40], but appending never changes the position of any existing element. Because AP CSP pseudocode lists are 1-indexed, numbers[2] is the second element, which is 20. A student reasoning with 0-indexed instincts would expect numbers[2] to be the third element, 30, which is exactly the wrong answer this question is built to catch.',
  }),

  H.h2('Frequently Asked Questions'),
  H.faq([
    { q: 'Is AP CSP pseudocode the same as the pseudocode used in AP Computer Science A?', a: 'No. AP CSA is graded on real Java syntax, since that is the language the course teaches. AP CSP pseudocode is College Board own invented notation defined entirely on the AP CSP Exam Reference Sheet, and it is not tied to any real programming language.' },
    { q: 'Do I need to memorize the exact symbols like the arrow and the comparison signs?', a: 'For multiple choice, yes, since questions are printed using the exact reference sheet symbols and you need to read them correctly. For typed written responses, a clearly written approximation such as <- for the assignment arrow or >= for greater than or equal is accepted, as long as your intent is unambiguous.' },
    { q: 'Why does REPEAT UNTIL feel backwards compared to a while loop I already know?', a: 'Because it describes the stopping condition rather than the continuing condition. A Python while loop keeps running while its condition stays true. REPEAT UNTIL keeps running while its condition stays false, and stops the moment the condition becomes true. Translate the logic, do not just copy the words.' },
    { q: 'Are lists always 1-indexed in AP CSP pseudocode, with no exceptions?', a: 'Yes. Every list operation on the reference sheet, including direct indexing, APPEND, INSERT, and REMOVE, is defined against a list where the first element sits at index 1. This is one of the most consistently tested syntax details on the exam.' },
    { q: 'What happens if a procedure has code after a RETURN statement in the same block?', a: 'That code never executes. RETURN exits the procedure the instant it runs, regardless of what statements are written below it in the same block. Any code after a RETURN in a reachable position is effectively dead code for the purposes of tracing the procedure.' },
  ]),

  H.cta({
    heading: 'Turn this into practice, not just a reference',
    body: 'Work through the full pseudocode reference and Create performance task prompts written in this exact syntax.',
    links: [
      { href: '/pages/ap-csp-written-response-guide', text: 'Written response guide' },
      { href: '/pages/ap-computer-science-principles-resources', text: 'All CSP resources', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reflects the syntax defined on the current AP CSP Exam Reference Sheet published by College Board. Last reviewed August 18, 2026.'),
]);

module.exports = { meta, body };
