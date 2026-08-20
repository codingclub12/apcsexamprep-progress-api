'use strict';
// Weekly course post: AP CSP. Evergreen concept guide. Goes deep specifically
// on procedures, parameters, and RETURN, with scope as the real teaching
// point: a worked trace where the same variable name is reused inside and
// outside a procedure to make local versus global concrete rather than
// abstract. Companion to the full syntax guide, which covers procedures as
// one topic among many; this post is the deep dive.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'AP CSP Procedures: Defining and Calling One',
  'What RETURN Actually Does',
  'Scope, Traced: The Same Name, Two Different Variables',
  'Two Exam Traps Built From the Same Misunderstanding',
];

const meta = {
  title: 'AP CSP Procedures: Scope Made Concrete',
  handle: 'ap-csp-procedures-parameters-return-scope',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp procedures',
  publishOn: '2026-10-14',
  seoTitle: 'AP CSP Procedures: Parameters, RETURN, and Scope',
  seoDescription: 'AP CSP procedures traced fully: how a parameter becomes a local variable, what RETURN really does, and why a reused name outside stays a separate variable.',
  summary: 'AP CSP procedures look simple on the reference sheet, a name, a parameter list, a RETURN statement, but the concept most students get wrong is scope: whether a variable defined inside a procedure exists anywhere else. This guide traces a worked example where the same variable name is used both inside a procedure and outside it, showing exactly what each one holds at every point in the program, then covers what RETURN actually does to control flow and the two exam traps built on top of that misunderstanding.',
  tags: ['AP CSP', 'Procedures', 'Pseudocode', 'Exam Reference Sheet', 'Study Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('A parameter is not a shortcut for passing a value into a procedure, it is a brand new local variable that exists nowhere else in the program. This guide traces AP CSP procedures, parameters, and RETURN through a worked example that reuses one variable name both inside and outside a procedure, so scope stops being a rule you memorize and becomes something you can watch happen.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 13, 2026', updated: 'October 13, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.p('AP CSP procedures show up on the reference sheet as a handful of lines: a <code>PROCEDURE</code> keyword, a name, a parenthesized parameter list, and a body in curly braces that may or may not contain a <code>RETURN</code>. Read quickly, that looks like the smallest section of the whole pseudocode language, barely more than a naming convention for a block of code. It is not. Underneath that short syntax sits the single idea that causes the most silent grading errors on procedure questions: scope, the fact that a parameter and any variable created inside a procedure exist only while that procedure is running, and stop existing the instant it exits. This guide traces that idea directly rather than describing it, because scope is one of those exam concepts that sounds obvious in a sentence and then quietly gets missed on the page.'),

  H.h2(SECTIONS[0]),
  H.p('A procedure is defined with the <code>PROCEDURE</code> keyword, a name chosen by the programmer, and a parenthesized list of parameters, the names the procedure will use to refer to whatever values get passed in when it is called. The body sits inside curly braces exactly the way a conditional or a loop body does.'),
  H.code('PROCEDURE square(n)\n{\n  result ← n * n\n  RETURN (result)\n}'),
  H.p('That defines a procedure named <code>square</code> with one parameter, <code>n</code>. Defining a procedure does not run anything by itself, the same way writing a recipe does not cook a meal. Nothing inside those curly braces executes until the procedure is called by name somewhere else in the program, with a specific value supplied for each parameter.'),
  H.code('answer ← square(5)\nDISPLAY (answer)'),
  H.p('That call passes the value 5 as the argument, which becomes the value of the parameter <code>n</code> for the duration of this one call. Inside the procedure, <code>n</code> is 5, <code>result</code> becomes 25, and <code>RETURN (result)</code> sends 25 back out to the place the call happened, where it is stored in <code>answer</code>. The vocabulary matters here for reading exam questions precisely: the value written inside the parentheses at the call, 5, is the argument. The name the procedure uses to refer to it inside its own body, <code>n</code>, is the parameter. They are two different words for two different roles in the same handoff, and released free response scoring guidelines use both terms deliberately.'),
  H.box('key', 'A parameter is a variable, not a placeholder', '<p>The moment a procedure is called, its parameter is created as a brand new variable, holding whatever value or expression was passed as the argument. It behaves exactly like any other variable inside that procedure: it can be read, it can be reassigned, it can be used in an expression. The only thing unusual about it is where it came from, not how it behaves once it exists.</p>'),
  H.p('A procedure can take more than one parameter, separated by commas, and a call must supply an argument for each one in the same order they were declared. <code>PROCEDURE combine(first, second)</code> called as <code>combine(3, 4)</code> makes <code>first</code> equal to 3 and <code>second</code> equal to 4 inside that call, matched purely by position.'),

  H.h2(SECTIONS[1]),
  H.p('<code>RETURN</code> does two things at once, and treating it as doing only the second one is where most tracing mistakes start. The first thing it does is stop execution of the procedure immediately, at that exact line, regardless of what code sits after it in the same block. The second thing it does is hand a value back to whatever line called the procedure, so that the call itself evaluates to that value and can be stored, displayed, or used in a larger expression.'),
  H.code('PROCEDURE classify(number)\n{\n  IF (number < 0)\n  {\n    RETURN ("negative")\n  }\n  RETURN ("non-negative")\n  DISPLAY ("unreachable")\n}'),
  H.p('Trace <code>classify(-3)</code> and the IF condition is true, so the first <code>RETURN ("negative")</code> executes. Control leaves the procedure at that exact instant. The second <code>RETURN</code> line and the <code>DISPLAY</code> line after it are never reached, not because they are unreachable in some abstract sense, but because the procedure has already ended by the time execution would get to them. That is the control-flow half of RETURN: it is an exit, not a label that marks where a result lives while the procedure keeps running.'),
  H.box('warn', 'RETURN is an exit door, not a bookmark', '<p>A student tracing a procedure by eye sometimes reads a RETURN statement as marking a value the procedure produces, then keeps scanning down the block for more logic that might still apply. Trace it that way on the exam and you will credit results the procedure never actually reaches. The moment RETURN executes, the procedure is done. Nothing else in that call runs afterward, no matter what is written below it.</p>'),
  H.p('The value-handoff half matters just as much, especially in the direction most students overlook: a procedure with no RETURN statement at all still runs to completion, but the call to it produces no usable value. If a prompt asks a student to write an expression that uses a procedure\'s result, and that procedure never executes a RETURN on the path being traced, there is nothing to use. <code>DISPLAY (logMessage("done"))</code> is only meaningful if <code>logMessage</code> actually returns something on that call. A procedure written purely to perform an action, like displaying output or updating a variable through a mechanism other than its return value, can be entirely correct as a procedure while being useless as an expression, and a written response that assumes otherwise loses credit for a reasoning error, not a syntax error.'),

  H.h2(SECTIONS[2]),
  H.p('Here is the part that actually causes point loss on procedure questions, and the only way to make it stick is to trace it rather than state it. Scope means a variable defined inside a procedure, including every one of its parameters, exists only while that procedure is running. It is created when the procedure is called and it is gone the instant the procedure exits. It has no relationship at all to a variable of the same name that might exist outside the procedure, anywhere else in the program. They are not the same variable that happens to be visible in two places. They are two completely separate variables that happen to share a name, and nothing more.'),
  H.p('Trace this program line by line. It deliberately reuses the name <code>total</code> both inside a procedure and outside it, on purpose, to make the separation visible rather than theoretical.'),
  H.code('PROCEDURE addTax(price)\n{\n  total ← price * 1.08\n  RETURN (total)\n}\n\ntotal ← 100\nDISPLAY (total)\nresult ← addTax(50)\nDISPLAY (total)\nDISPLAY (result)'),
  H.p('Walk through what each line actually does, tracking two separate variables named <code>total</code> that never interact.'),
  H.table(
    ['Line executed', 'What happens', 'Outer total', 'Inner total (exists only during the call)'],
    [
      ['total ← 100', 'Creates the outer variable total, outside any procedure', '100', 'does not exist yet'],
      ['DISPLAY (total)', 'Displays the outer total', '100 (displayed)', 'does not exist'],
      ['result ← addTax(50)', 'Calls addTax, price becomes 50', '100 (untouched)', 'created fresh for this call'],
      ['total ← price * 1.08 (inside addTax)', 'Creates a new, separate total, local to this call, equal to 54', '100 (untouched)', '54'],
      ['RETURN (total) (inside addTax)', 'Returns the inner total, 54, then the inner total ceases to exist', '100 (untouched)', 'gone; call returns 54'],
      ['DISPLAY (total)', 'Displays the outer total again, after the call has fully finished', '100 (displayed)', 'does not exist'],
      ['DISPLAY (result)', 'Displays what addTax returned', '100 (unchanged)', 'displays 54'],
    ]
  ),
  H.p('The outer <code>total</code> is 100 at the start, and it is still 100 at the very end. It was never touched by anything that happened inside <code>addTax</code>, even though a line inside that procedure assigned a value to something also named <code>total</code>. The moment <code>PROCEDURE addTax(price)</code> is called, pseudocode creates a fresh, local <code>total</code> that belongs only to that call, that has no memory of the outer <code>total</code>, and that vanishes the instant <code>RETURN</code> executes. The two variables are not linked. They are not the same box under two labels. They are two different boxes that happen to be labeled the same word, sitting in two different places, and the program never confuses them, even though a student tracing by eye sometimes does.'),
  H.p('Second output shows the outer total is still 100, not 54, even though the procedure assigned 54 to something called total moments earlier. That is the entire lesson, made concrete instead of stated: a name is not an address. Two variables with the same name in different scopes are as unrelated as two people who happen to share a first name.'),

  H.h2(SECTIONS[3]),
  H.p('Both exam traps in this section come directly from treating scope as looser than it actually is, and both show up constantly in released multiple choice items and Create performance task written responses.'),
  H.h3('Trap one: assuming a procedure can modify an outside variable just by using its name'),
  H.p('The worked trace above is the direct rebuttal to this trap, and it is worth restating as a rule on its own: a procedure cannot change a variable defined outside it merely by assigning to a variable of the same name inside its own body. Assigning to <code>total</code> inside <code>addTax</code> creates and modifies a local variable that exists only for that call. It has no effect whatsoever on any variable named <code>total</code> that exists outside the procedure, even one that was already sitting there before the call happened. A student who assumes the assignment reaches outward, because the name matches, will trace the wrong final value for the outer variable every time this pattern appears, and it appears often precisely because it looks so intuitive.'),
  H.h3('Trap two: using a procedure\'s result when the procedure never returned one'),
  H.p('This is the trap covered in the RETURN section above, and it deserves to be named explicitly as an exam trap because it shows up in a specific, recognizable shape: a question defines a procedure whose logic performs some action, maybe it displays something or changes a variable through a side effect, but never executes a RETURN statement on the path being traced. Then a later line tries to use the result of calling that procedure, storing it in a variable or displaying it directly. There is no value to use. A procedure with no RETURN on the executed path produces no usable return value, and treating the call as though it produced one, in either a trace or a written explanation of your own Create task code, is a reasoning error graders are specifically trained to catch.'),
  H.box('tip', 'Ask two questions before trusting any procedure trace', '<p>First, does this variable exist inside the procedure only, or was it passed in or declared outside it? If it is a parameter or was created with an assignment statement inside the procedure body, it is local and it disappears when the procedure exits, no matter what it is named. Second, does this specific path through the procedure actually reach a RETURN statement? If it does not, there is no value to hand back, and any line that tries to use one is building on nothing.</p>'),
  H.p('These two traps are really one trap wearing two outfits: both come from treating a procedure as more porous than it is, either assuming it can reach outward through a shared name or assuming a call always produces something usable even when the code never says so. The full <a href="/blogs/ap-csp/ap-csp-pseudocode-complete-syntax-guide">pseudocode syntax guide</a> covers procedures alongside every other construct on the reference sheet, and the deep dive on <a href="/blogs/ap-csp/ap-csp-list-operations-index-shift">list operations and indexing</a> works through the same trace-it-by-hand method applied to a different exam-costly detail.'),

  H.h2('Practice Two Procedure Questions'),
  H.p('Trace each of these fully by hand, tracking every variable by where it was declared, before checking the answer.'),
  H.mcq({
    n: 1,
    stem: 'What is displayed by the following program?',
    codeText: 'PROCEDURE update(x)\n{\n  x ← x + 10\n  count ← x\n  RETURN (count)\n}\n\ncount ← 1\nvalue ← update(count)\nDISPLAY (count)\nDISPLAY (value)',
    options: ['1, then 1', '1, then 11', '11, then 11', '11, then 1'],
    correct: 1,
    why: 'The outer count is set to 1 before the call. Inside update, x becomes a new local variable equal to 1, the parameter value passed in. The line count ← x inside the procedure creates a completely separate local variable, also named count, and sets it to 11 after x is incremented. That inner count is local to this call of update and has no connection to the outer count that already existed. When RETURN (count) executes, it returns the inner count, 11, and the inner count then ceases to exist. Back outside the procedure, the outer count was never touched, so DISPLAY (count) still shows 1, and DISPLAY (value) shows 11, the value the call returned. A student who assumes the assignment inside update reached the outer count would incorrectly trace 11 for both lines.',
  }),
  H.mcq({
    n: 2,
    stem: 'A student writes the following procedure and then tries to use its result. What is displayed?',
    codeText: 'PROCEDURE checkPositive(n)\n{\n  IF (n > 0)\n  {\n    RETURN ("positive")\n  }\n}\n\noutcome ← checkPositive(-4)\nDISPLAY (outcome)',
    options: [
      '"positive"',
      '"negative"',
      'An empty string is displayed',
      'The procedure produces no usable return value on this call, so outcome does not hold a meaningful result',
    ],
    correct: 3,
    why: 'Trace the call with n equal to negative 4. The condition n > 0 is false, so the IF block never runs, which means the RETURN statement inside it never executes. There is no other RETURN anywhere else in the procedure, so this call finishes without returning any value at all. The line outcome ← checkPositive(-4) tries to store a return value that was never produced, which is exactly the trap of assuming every call to a procedure produces something usable. Nothing in the pseudocode defines what happens to outcome in that case, which is the point: a procedure that reaches the end of its body without executing a RETURN gives the caller nothing to work with, regardless of what the procedure was named or what it seems designed to check.',
  }),

  H.h2('Frequently Asked Questions'),
  H.faq([
    { q: 'Is a parameter the same thing as an argument?', a: 'No, and the exam uses both words on purpose. The argument is the value or expression written inside the parentheses at the call site. The parameter is the name the procedure itself uses to refer to that value inside its own body. They refer to the same underlying value during one specific call, but they describe two different roles: the argument is what is handed over, the parameter is what receives it.' },
    { q: 'Can a procedure change a variable that exists outside it?', a: 'Not by assigning to a variable of the same name inside its own body. A variable created inside a procedure, including every parameter, is local to that procedure and has no connection to a variable of the same name declared outside it, even one that already existed before the call. They are separate variables that happen to share a name.' },
    { q: 'What happens if a procedure never executes a RETURN statement?', a: 'The procedure still runs to completion, but the call to it produces no usable value. If a later line tries to store or display the result of calling that procedure, there is nothing meaningful to use, which is a common exam trap: a procedure can be entirely correct at performing an action while being useless as an expression if no RETURN executes on the path being traced.' },
    { q: 'Does RETURN stop the entire program or just the procedure?', a: 'Just the procedure. RETURN immediately ends execution of the procedure it appears in and sends control back to the line that called it, along with whatever value was specified. Any code written after the RETURN statement, inside the same procedure body, never runs on that call, but the rest of the program continues normally from the call site.' },
    { q: 'If a procedure has more than one RETURN statement, is that a mistake?', a: 'No, it is a common and correct pattern, usually inside different branches of an IF statement, as long as every path the procedure could actually take reaches exactly one of them. The risk is not having multiple RETURN statements, it is having a path through the procedure, such as a condition that turns out false with no matching ELSE, that reaches the end of the body without hitting any of them.' },
  ]),

  H.cta({
    heading: 'Turn this into a full trace of every pseudocode construct',
    body: 'Procedures are one topic on the reference sheet. Work through the full syntax, then see how scope and RETURN show up in the Create performance task written responses.',
    links: [
      { href: '/blogs/ap-csp/ap-csp-pseudocode-complete-syntax-guide', text: 'Full pseudocode syntax guide' },
      { href: '/pages/ap-csp-written-response-guide', text: 'Written response guide', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reflects the procedure syntax defined on the current AP CSP Exam Reference Sheet published by College Board. Last reviewed October 13, 2026.'),
]);

module.exports = { meta, body };
