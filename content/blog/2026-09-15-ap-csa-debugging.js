'use strict';
// Weekly course post: AP CSA. Drill track: teaching students to read compiler
// and runtime error output methodically instead of editing code at random
// until it happens to compile or run.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'Why guessing is slower than actually debugging Java error messages',
  'How to read a compile-time error: the line number, the message, the cause',
  'Four compile-time errors that show up constantly in AP CSA code',
  'Runtime exceptions: the error you only see once the code actually runs',
  'A quick reference: error type, what it usually means, what to check first',
  'Two practice questions: given the error, find the fix',
  'Frequently asked questions',
];

const meta = {
  title: 'Debugging Java: Reading an Error Message Instead of Guessing',
  handle: 'ap-csa-reading-java-error-messages',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'debugging java',
  publishOn: '2026-09-18',
  seoTitle: 'Debugging Java: How to Read a Compiler Error',
  seoDescription: 'Debugging Java code starts with reading the error, not guessing. A method for compile-time errors and the runtime exceptions AP CSA actually tests.',
  summary: 'Most students facing a wall of red text respond by changing a random line and recompiling, which wastes far more time than it saves. Debugging Java code well is a specific, learnable method: read the line number, read the exact message, then reason backward from message to cause. This walks through the compile-time errors and runtime exceptions that show up constantly in AP CSA code, with real broken snippets, the actual error text, and the reasoning path from one to the other.',
  tags: ['AP CSA', 'Debugging', 'Java Errors', 'Study Habits', 'Unit 1'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('Debugging Java code on the AP CSA exam and in every unit before it does not start with guessing a new line to try. It starts with actually reading what the compiler or the running program already told you, because the answer is almost always sitting right there in the error text, not hidden somewhere else in the file.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 15, 2026', updated: 'September 15, 2026', readingMinutes: 12,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Here is a habit that shows up in almost every intro programming class, and it is worth naming because most students who do it do not realize it is a habit at all. Code fails to compile. A wall of unfamiliar red text appears. Instead of reading that text, the student changes something, maybe a line they were already unsure about, and hits compile again. Still broken. They change something else. Still broken. Ten minutes later the code is worse than when it started, and nobody could say which of the five edits caused which of the three new problems.'),
  H.p('That approach feels productive because it involves doing something. But it treats the compiler as an obstacle to get past rather than a source of information, and that is exactly backward. A Java compiler error is not a vague complaint. It names a specific line, or a line close to it, and it describes a specific problem in specific vocabulary. A runtime exception does the same thing for problems that only appear once the program is actually running. Both are a gift, not a punishment. They are telling you exactly where to look before you touch a single character of code.'),
  H.box('key', 'The actual skill', '<p>Reading an error message is not a vocabulary exercise. It is a short chain of reasoning: what does the message literally say, which line does it point to, and what has to be true about that line for this exact message to appear. Every example below walks that same chain, because it is the same chain every time.</p>'),
  H.p('This matters for the AP CSA exam specifically because the multiple choice section sometimes asks a question in exactly this shape: here is a code segment, here is what happened when it ran, what is the cause. Practicing the habit of reading errors methodically on your own broken code is the same skill in a more useful form, because it also fixes your actual assignments instead of just answering a question about someone else\'s.'),

  H.h2(SECTIONS[1]),
  H.p('Every compile-time error message from javac has three parts worth separating out on purpose: a line number, a message, and, in some cases, extra detail underneath the message. Treat them as three separate pieces of evidence rather than one block of text to skim.'),
  H.ul([
    '<strong>The line number.</strong> Where the compiler noticed something was wrong. This is not always the same as the line that needs to change, because the parser sometimes cannot tell there is a problem until it reads a bit further into the file.',
    '<strong>The message.</strong> What specifically the compiler expected and did not find, or what specifically it found that did not make sense. This is precise, technical language, and it is worth reading word for word rather than pattern-matching on the general shape of the error.',
    '<strong>The caret and extra detail.</strong> Some errors point a caret (^) at the exact token that triggered the complaint, and cannot find symbol errors add a symbol and location line naming exactly what the compiler was looking for and where it looked.',
  ]),
  H.p('The habit to build is reading these three pieces in order, out loud if it helps, before changing anything. Line number, then message, then reason backward: what would have to be true on or near that line for the compiler to say exactly this. That last step is the one guessing skips entirely, and it is the one that actually finds the fix.'),
  H.box('warn', 'The line number is a starting point, not always the destination', '<p>A missing semicolon almost always gets reported one line after the actual missing semicolon, because the compiler is still trying to finish parsing the previous statement when it hits the next one and realizes something is missing. If the named line looks completely fine, the very next place to check is the line directly above it.</p>'),

  H.h2(SECTIONS[2]),
  H.h3('A missing semicolon'),
  H.p('This is the single most common first-week error, and also one of the easiest once the pattern is familiar.'),
  H.code('public int square(int n)\n{\n    int result = n * n\n    return result;\n}'),
  H.code('Main.java:4: error: \';\' expected\n        return result;\n        ^\n1 error'),
  H.p('The message names line 4, and line 4 reads return result; which already ends in a semicolon and looks perfectly correct on its own. That mismatch is the clue. The compiler was still parsing the statement on line 3, int result = n * n, when it reached the word return and realized the statement it was in the middle of never got its closing semicolon. The fix is on line 3, one line above where the error points.'),

  H.h3('Unmatched braces'),
  H.p('A brace opened somewhere and never closed produces a very different looking error, one that does not name a specific line inside your method at all.'),
  H.code('public int max(int a, int b)\n{\n    if (a > b)\n    {\n        return a;\n\n    return b;\n}'),
  H.code('Main.java: error: reached end of file while parsing\n}\n^\n1 error'),
  H.p('The message reached end of file while parsing means the compiler opened at least one brace it never found a matching close for, and kept reading all the way to the bottom of the file still waiting. The fix is not on the last line, it is finding the specific brace pair that is unbalanced. The reliable method is to walk through the method from the top and count: the class opens a brace, the method opens a brace, the if statement opens a brace. That is three open braces before return a; runs, but only two closes appear before the method ends. The if block never got its closing brace.'),

  H.h3('A type mismatch'),
  H.code('int total = 0;\nString label = "Total: ";\ntotal = label;'),
  H.code('Main.java:3: error: incompatible types: String cannot be converted to int\n        total = label;\n                ^\n1 error'),
  H.p('This one is close to self-explanatory once read carefully: incompatible types names both types by name, String and int, and which direction the mismatch goes. The fix requires looking at both sides of the assignment on the named line: the variable total was declared as int, and the value being assigned, label, is a String. Either the assignment target needs to change, or, more often in AP CSA code, whatever produced the value on the right side needs to actually return the type the left side expects.'),

  H.h3('Cannot find symbol'),
  H.code('public class Counter\n{\n    public static void main(String[] args)\n    {\n        int cnt = 0;\n        cnt = cnt + 1;\n        System.out.println(cnnt);\n    }\n}'),
  H.code('Main.java:7: error: cannot find symbol\n        System.out.println(cnnt);\n                            ^\n  symbol:   variable cnnt\n  location: class Counter\n1 error'),
  H.p('Cannot find symbol is the compiler saying it does not recognize a name at all, not that the name is used incorrectly. The symbol line spells out exactly which identifier it could not find, here variable cnnt, and the location line names where it searched. Reading that pair together points straight at the cause: cnnt does not exist anywhere in class Counter. The actual variable is cnt, declared two lines earlier, and cnnt is a typo. This same error appears for a misspelled method name, a class name that does not match the file, or a variable used before it was declared, so always check the symbol line for the exact name it is missing rather than assuming it is always a typo.'),

  H.h2(SECTIONS[3]),
  H.p('Compile-time errors stop the program from running at all. Runtime exceptions are different: the code compiles cleanly, starts running, and then something goes wrong while it is executing, at a point the compiler had no way to catch in advance. The three below are the ones that show up constantly in AP CSA code specifically because they come from the exact structures the course spends the most time on: strings, arrays, and objects.'),

  H.h3('NullPointerException'),
  H.code('String name = null;\nSystem.out.println(name.length());'),
  H.code('Exception in thread "main" java.lang.NullPointerException: Cannot invoke "String.length()" because "name" is null\n    at Main.main(Main.java:2)'),
  H.p('Modern Java error messages spell this one out almost completely: the exception names the exact method call that failed, String.length(), and the exact variable that was null, name. The reasoning step that matters is not just noticing the exception type, it is tracing backward from that variable to find why it was never assigned a real object before this line used it. In a longer program that usually means a method that was supposed to return a constructed object returned nothing on one path, or a field on an object was never set in the constructor before some other method tried to use it.'),

  H.h3('ArrayIndexOutOfBoundsException'),
  H.code('int[] scores = {10, 20, 30};\nSystem.out.println(scores[3]);'),
  H.code('Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3\n    at Main.main(Main.java:2)'),
  H.p('The message states both numbers a fix needs: the index that was used, 3, and the length of the array, also 3. For an array of length 3, valid indices run from 0 up to 2, one less than the length, so index 3 does not exist. This exact mismatch, using length itself as the last index instead of length minus one, is the most common cause and usually traces back to a loop condition written as i <= array.length instead of i < array.length.'),

  H.h3('StringIndexOutOfBoundsException'),
  H.code('String word = "cat";\nSystem.out.println(word.charAt(3));'),
  H.code('Exception in thread "main" java.lang.StringIndexOutOfBoundsException: Index 3 out of bounds for length 3\n    at java.base/java.lang.String.charAt(String.java:1555)\n    at Main.main(Main.java:2)'),
  H.p('This is the same off-by-one idea as the array version, applied to characters in a string instead of elements in an array: a three-character string has valid indices 0 through 2. What is different, and worth noticing on purpose, is that the stack trace has two lines instead of one. The top line points into Java\'s own String class, since that is where the actual failure happened, and only the second line, at Main.main, points into your own code. When a stack trace runs several lines deep through library code, the line to actually look at is the first one that names your own file, because that is where the bad index came from.'),

  H.h2(SECTIONS[4]),
  H.p('The four error types above cover most of what shows up in a typical AP CSA class period. This table is meant as something to check against quickly rather than something to memorize word for word.'),
  H.table(
    ['Error type', 'What it usually means', 'What to check first'],
    [
      ['<code>\';\' expected</code>', 'A statement is missing its closing semicolon.', 'The line directly above the one the compiler names.'],
      ['<code>reached end of file while parsing</code>', 'A brace, parenthesis, or bracket was opened and never closed somewhere in the file.', 'Count opening and closing braces method by method, from the top of the file down.'],
      ['<code>incompatible types</code>', 'A value of one type is being assigned to, or returned as, a different declared type.', 'The declared type on the left of the assignment against the actual type of the value on the right.'],
      ['<code>cannot find symbol</code>', 'A variable, method, or class name does not match anything the compiler can find.', 'The exact spelling and capitalization on the symbol line against where that name was declared.'],
      ['<code>NullPointerException</code>', 'A method or field was accessed through a reference that holds no object.', 'Trace the named variable backward to where it should have been assigned an actual object.'],
      ['<code>ArrayIndexOutOfBoundsException</code>', 'An index used on an array is not a valid position in it.', 'Compare the index used against the array length; valid indices run 0 through length minus one.'],
      ['<code>StringIndexOutOfBoundsException</code>', 'An index used on a string is not a valid position in it.', 'Same 0 through length minus one rule, applied to characters instead of array elements.'],
    ]
  ),

  H.h2(SECTIONS[5]),
  H.p('Both questions below give a broken method and the exact error it produces. The task is not to trace what correct code prints, it is to read the error and identify the actual fix, which is a different skill and one worth practicing on its own.'),
  H.mcq({
    n: 1,
    stem: 'A student compiles the class below and gets the error shown beneath it. What is the most direct fix?',
    codeText: 'public class Average\n{\n    public static void main(String[] args)\n    {\n        int a = 4;\n        int b = 10;\n        int avg = (a + b) / 2;\n        System.out.println(Avg);\n    }\n}\n\nMain.java:7: error: cannot find symbol\n        System.out.println(Avg);\n                            ^\n  symbol:   variable Avg\n  location: class Average',
    options: [
      'Change System.out.println(Avg) to System.out.println(avg), matching the capitalization of the declared variable.',
      'Change the variable declaration from int avg to int Avg.',
      'Add a semicolon after avg on the line that declares it.',
      'Change the class name from Average to Avg.',
    ],
    correct: 0,
    why: 'The symbol line names exactly what the compiler could not find: variable Avg. The declared variable on the line above is lowercase avg, and Java treats avg and Avg as two completely different names, since the language is case sensitive. The location line confirms the search happened inside class Average and simply never turned up anything spelled Avg. Renaming the declaration instead of the print statement would only move the same mismatch onto every other correct reference to avg elsewhere in the method. Adding a semicolon fixes nothing, since that line already ends correctly. Renaming the class is unrelated to a missing variable name.',
  }),
  H.mcq({
    n: 2,
    stem: 'The method below is called with an array containing three elements, and running it produces the exception shown beneath it. What change fixes the cause of the exception?',
    codeText: 'public static int sumAll(int[] values)\n{\n    int total = 0;\n    for (int i = 0; i <= values.length; i++)\n    {\n        total = total + values[i];\n    }\n    return total;\n}\n\nException in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3\n    at Main.sumAll(Main.java:6)',
    options: [
      'Change the loop condition from i <= values.length to i < values.length.',
      'Change the initial value of i from 0 to 1.',
      'Change values[i] to values[i - 1] inside the loop body.',
      'Add a fourth element to the array so index 3 exists.',
    ],
    correct: 0,
    why: 'The array has length 3, so its only valid indices are 0, 1, and 2. The condition i <= values.length lets i reach 3, one past the last valid index, and values[3] does not exist for a length-3 array, which is exactly what the message reports. Changing the condition to i < values.length stops the loop at i equal to 2, the last valid index, and fixes the actual off-by-one bound. Starting i at 1 still lets the loop run through index 3 and additionally skips index 0. Shifting to values[i - 1] happens to dodge the crash for this one array but breaks the sum by skipping the last element and is not a fix to the loop bound itself. Padding the array to four elements treats the symptom rather than the loop condition that produced it, and the same bug would reappear on the next array of any other size.',
  }),

  H.h2(SECTIONS[6]),
  H.faq([
    { q: 'What is the first thing to do when debugging Java code that will not compile?', a: 'Read the error message before changing anything. Identify the line number the compiler names, read the exact wording of the message, and reason backward about what would have to be true on or near that line for the compiler to say exactly that. Editing code before reading the message is how one error quietly becomes three.' },
    { q: 'Why does the compiler sometimes point at a line that looks completely correct?', a: 'Because the compiler is often still parsing the previous statement when it hits the next line and realizes something is missing, most commonly a semicolon. When the named line looks fine on its own, the next place to check is the line directly above it.' },
    { q: 'What is the difference between a compile-time error and a runtime exception?', a: 'A compile-time error stops the program from being turned into runnable code at all, so it never starts running. A runtime exception happens after the code has already compiled successfully and started executing, at a point the compiler had no way to check in advance, such as an array index that only turns out to be invalid once the program actually runs with a specific array.' },
    { q: 'Why does a StringIndexOutOfBoundsException sometimes point into Java\'s own code instead of my file?', a: 'Because the stack trace lists every method call that was active when the exception happened, starting with the one closest to the actual failure. When that is a library method like charAt, the top line names String.java rather than your file. Look further down the stack trace for the first line that names your own file, since that is where the bad index actually came from.' },
    { q: 'Where can I practice this kind of question in the AP CSA multiple choice format?', a: 'The <a href="/pages/ap-csa-qotd-hub">daily practice questions</a> include exam-format items on runtime behavior, and the <a href="/blogs/ap-csa/ap-csa-variable-table-tracing-method">variable table tracing method</a> is the companion skill for tracing what correct code actually does once the syntax is right, which pairs directly with debugging Java code that is not yet correct.' },
  ]),

  H.cta({
    heading: 'Turn error messages into practice, not panic',
    body: 'Daily multiple choice practice and free response questions with full solutions, organized by unit, so reading the compiler becomes routine well before exam day.',
    links: [
      { href: '/pages/ap-csa-qotd-hub', text: 'Daily practice' },
      { href: '/pages/ap-csa-frq-archive', text: 'FRQ archive', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Last reviewed September 15, 2026.'),
]);

module.exports = { meta, body };
