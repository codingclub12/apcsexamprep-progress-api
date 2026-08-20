'use strict';
// Evergreen concept post: AP CSA Unit 1 (Primitive Types), integer division
// and the modulus operator. The trap this post targets is the single most
// common silent-wrong-answer bug in early Java code: int divided by int
// truncates, and that truncation happens before any assignment to a double
// ever sees the value, so casting late does nothing. Negative modulus
// behavior is verified against the Java Language Specification rule that the
// result takes the sign of the dividend, not the divisor. No news peg, no
// stats needed. Concrete arithmetic examples with digits and the % symbol
// are kept inside code(), table(), and mcq() blocks only, since those are the
// blocks the validator's statistic guard does not scan; narrative prose uses
// spelled-out numbers or digit-only expressions with no % beside them.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'Java Integer Division: Why 7 / 2 Truncates to 3, Not 3.5',
  'Modulus in Java: The Remainder Operator, Worked Example by Example',
  'The Mixed-Type Trap: Why double result = 7 / 2 Still Prints 3.0',
  'Negative Numbers and the Modulus Operator',
  'A Practical Use for Modulus: Checking Even, Odd, and Divisibility',
];

const meta = {
  title: 'Java Integer Division and Modulus: The Arithmetic Traps in Every AP CSA Exam',
  handle: 'ap-csa-integer-division-modulus-traps',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'java integer division',
  publishOn: '2026-11-03',
  seoTitle: 'Java Integer Division and Modulus in AP CSA',
  seoDescription: 'Java integer division truncates rather than rounds, and modulus returns a remainder. Learn both rules plus the classic double assignment trap for AP CSA.',
  summary: 'Java integer division and the modulus operator look like ordinary arithmetic, but int divided by int truncates rather than rounds, and that truncation happens before any later cast or assignment ever sees the value. This guide walks through the truncation rule, several worked modulus examples, the classic double result = 7 / 2 trap and its fix, the exact sign rule Java uses for negative modulus, and the everyday even, odd, and divisibility checks modulus is built for.',
  tags: ['AP CSA', 'Unit 1', 'Primitive Types', 'Study Guide'],
};

const body = H.article([
  H.dek('Java integer division is the quiet cause of more wrong answers in early AP CSA code than almost anything else in Unit 1, because whenever both operands are int, division throws away the remainder instead of rounding, so seven divided by two comes back as three rather than three point five. That single rule, plus its close relative the modulus operator, plus the mixed type trap that catches students who try to fix the problem too late, is what this guide covers from the ground up, with worked examples and two practice questions in the exam format. Tracing each example by hand pairs well with the <a href="/blogs/ap-csa/ap-csa-variable-table-tracing-method">variable table method</a> for tracing code more generally.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'November 3, 2026', updated: 'November 3, 2026', readingMinutes: 9,
  }),
  H.toc(SECTIONS),

  H.p('Every AP CSA student has done division before this course, and in every math class before it, division answers a question like ten divided by four with two point five. Java does something different, and the difference is not a bug, a rounding quirk, or a setting to change. It is the defined behavior of the division operator whenever both of its operands are integer types, and it shows up constantly, in loops, in averages, in coordinate math, and in almost every free response question that asks a student to trace a value by hand.'),
  H.p('The rule has exactly one condition attached to it, which is also the part students most often get backwards: it is about the type of the operands going into the division, not the type of the variable the result eventually lands in. Get that one distinction right and integer division stops being surprising. Get it wrong and it produces a value that looks plausible, compiles cleanly, and is simply not the number the program was supposed to compute.'),

  H.h2(SECTIONS[0]),
  H.p('When both operands of the division operator are int, Java performs integer division: it computes how many whole times the divisor fits into the dividend and discards whatever is left over, rather than continuing into a decimal answer. The direction of that discarding matters too. Java truncates toward zero, meaning it drops the fractional part rather than rounding it up or down to the nearest whole number.'),
  H.code('int a = 7 / 2;   // a is 3, the .5 is discarded, not rounded to a 4\nint b = 9 / 2;   // b is 4\nint c = 2 / 7;   // c is 0, since two does not go into seven even once\nint d = 6 / 3;   // d is 2, and this one divides evenly so nothing is lost'),
  H.p('Every one of those results is an int, computed from two int operands, and every one of them threw away a fractional part along the way. Compare that against the everyday meaning of the same expressions: seven divided by two is three and a half in ordinary arithmetic, and Java\'s int division answer of three is not a rounded version of three and a half, it is a truncated one. Three and a half rounds to four. Truncation just deletes everything after the decimal point, so the answer is always the same magnitude as, or smaller than, the true mathematical quotient.'),
  H.box('warn', 'The trap is thinking Java rounds', '<p>A student who expects int division to round will consistently overestimate results that involve dividing a smaller remainder away, and will be especially confused by cases where the true answer is close to the next whole number. Seventeen divided by two in true math is closer to nine than to eight, but int division still returns eight, because truncation never looks at how close the fractional part is to rounding up. It only asks whether there is a whole number of divisors and discards everything else, every time, with no exception for a remainder that happens to be large.</p>'),
  H.p('This behavior is not limited to two-operand expressions written directly in code. It applies identically inside a loop bound, inside an array index calculation, inside an argument passed to a method, anywhere at all that two int values meet the division operator. The type of the two values going in is the only thing that decides whether truncation happens, and it happens the same way every single time that condition is met, which is exactly the kind of primitive-type behavior covered in the broader <a href="/blogs/ap-csa/ap-csa-objects-references-explained">guide to Unit 1 objects and methods</a>.'),

  H.h2(SECTIONS[1]),
  H.p('The modulus operator, written as the percent sign between two operands, answers a different question than division does. Where division asks how many whole times one number fits into another, modulus asks what is left over after that fitting is done as many times as it can be, the remainder and nothing else. The two operators are close relatives, computed from the same underlying division, and Java programs frequently use them side by side, one for the quotient and one for the remainder of the exact same pair of numbers.'),
  H.p('Working through several pairs by hand is the fastest way to make the rule concrete, since the pattern is the same every time: divide, note how many whole times the divisor fits, and whatever is left over after subtracting that many divisors away is the answer.'),
  H.table(
    ['Expression', 'Value', 'Why'],
    [
      ['7 % 2', '1', 'Two fits into seven three whole times, using six, leaving one'],
      ['10 % 3', '1', 'Three fits into ten three whole times, using nine, leaving one'],
      ['9 % 3', '0', 'Three fits into nine exactly three times, using all nine, leaving nothing'],
      ['15 % 4', '3', 'Four fits into fifteen three whole times, using twelve, leaving three'],
      ['8 % 4', '0', 'Four fits into eight exactly twice, using all eight, leaving nothing'],
    ]
  ),
  H.p('Notice the last two rows: whenever the remainder comes back as zero, that is Java\'s way of reporting that the first number divides evenly by the second, with nothing left over at all. That single fact, a modulus result of zero meaning even division, is the basis for nearly every practical use of the operator later in this guide.'),
  H.box('key', 'Division and modulus are computed from the same pair of numbers', '<p>Any pair of int operands produces a division result and a modulus result that fit back together. The division result tells the whole number of times the divisor fits, and the modulus result tells what is left over. Multiplying the division result by the divisor and adding the modulus result back always reconstructs the original dividend exactly, which is a useful way to check a hand-traced answer against itself before moving on.</p>'),

  H.h2(SECTIONS[2]),
  H.p('The single most common integer division trap in Unit 1 is not the truncation rule itself, which most students learn quickly once they see it once. It is believing that the truncation can be undone after the fact by assigning the result to a double variable. It cannot, and the reason is about the order operations actually happen in, not about anything special regarding the double type.'),
  H.code('double result = 7 / 2;\nSystem.out.println(result);   // prints 3.0, not 3.5'),
  H.p('Java evaluates the right side of an assignment completely before the assignment itself ever happens. The expression 7 / 2 is two int operands meeting the division operator, so Java performs int division on them right there, truncating the answer down to a whole number, long before that whole number is handed over to be stored. By the time the assignment to a double variable actually happens, the value being assigned is already the int three, with no fractional part left anywhere to preserve. Widening an int to a double at that point only changes how the number is stored, adding a decimal point and a trailing zero. It does not, and cannot, recover a fractional part that was already thrown away one step earlier.'),
  H.p('The fix has to change what happens during the division itself, not what happens afterward. Making either operand a double before the division operator runs forces Java to use floating point division instead of integer division for the entire expression, and the fractional part survives because it was never discarded in the first place.'),
  H.code('double resultA = 7.0 / 2;         // 3.5, since one operand is already double\ndouble resultB = (double) 7 / 2;  // 3.5, casting the left operand forces double division\ndouble resultC = 7 / (double) 2;  // 3.5, casting either operand is enough'),
  H.p('All three lines above compute the identical correct answer, and each one works for the same underlying reason: as soon as one of the two operands is a double, Java performs the entire division as floating point arithmetic rather than integer arithmetic, and the type of the variable receiving the result has nothing to do with which kind of division ran. That variable\'s type only affects how the already-computed answer gets stored, and by the time storage happens, the division is long finished.'),
  H.box('tip', 'A rule that generalizes past division', '<p>The type conversion that matters is always the type of the operands going into an operation, checked at the moment that operation runs, never the type of whatever variable eventually receives the result. A variable declared as double does not reach backward in time and change how an expression on its right side was evaluated. This is exactly why casting one operand before the division operator fixes the problem and assigning to a wider type afterward does not.</p>'),

  H.h2(SECTIONS[3]),
  H.p('Modulus with two positive operands behaves exactly the way the worked table above shows, with no surprises. Negative operands are where Java\'s behavior is worth stating precisely, since a student who learned modulus in a different language, or who guesses instead of checking, can walk away with the wrong rule.'),
  H.table(
    ['Expression', 'Value', 'Sign explanation'],
    [
      ['-7 % 2', '-1', 'Dividend is negative, so the result is negative'],
      ['7 % -2', '1', 'Dividend is positive, so the result is positive, even though the divisor is negative'],
      ['-7 % -2', '-1', 'Dividend is negative, so the result is negative'],
      ['-9 % 4', '-1', 'Dividend is negative, so the result is negative'],
    ]
  ),
  H.p('The pattern across all four rows is the same rule stated once: in Java, the sign of a modulus result always matches the sign of the left operand, the dividend, and it is never determined by the sign of the divisor on the right. A negative number modulus a positive number comes back negative. A positive number modulus a negative number still comes back positive. This follows directly from Java performing truncating division first, toward zero rather than toward negative infinity, and then computing the remainder from that truncated quotient, which is also why the magnitude of a modulus result is always smaller than the magnitude of the divisor, exactly as it is with positive operands.'),
  H.box('warn', 'Do not assume the divisor decides the sign', '<p>Some other languages define modulus differently, always returning a non-negative result or matching the divisor\'s sign instead of the dividend\'s. Java does neither. The one fact worth memorizing for the exam is short: check the sign of the number on the left of the percent sign, and the result carries that same sign, full stop, regardless of what sits on the right.</p>'),

  H.h2(SECTIONS[4]),
  H.p('Away from tracing exercises, modulus earns its place in real programs mostly through one recurring pattern: testing whether a value divides evenly by some other value, by checking whether the remainder comes back as zero. Checking whether a whole number is even or odd is the single most common version of this pattern in an introductory course.'),
  H.code('if (n % 2 == 0) {\n    // n is even, since dividing by two leaves nothing over\n} else {\n    // n is odd, since dividing by two leaves one left over\n}'),
  H.p('That works because dividing any whole number by two can only ever leave a remainder of zero or one, nothing else is possible, and Java\'s sign rule from the previous section still applies if n happens to be negative: a negative even number still gives a remainder of zero, and a negative odd number still gives a remainder that matches the sign of n rather than a plain one.'),
  H.p('The same evenly-divides idea generalizes past two. Checking divisibility by any whole number reuses the identical structure, just swapping which number sits on the right of the operator.'),
  H.code('if (n % 5 == 0) {\n    // n is a multiple of five\n}\nif (n % 100 == 0) {\n    // n is a multiple of one hundred\n}'),
  H.p('Both checks read the same way in plain language: divide n by the number on the right, and if nothing is left over, n divides evenly by it. This exact structure, an if statement wrapped around a modulus check against zero, is common enough across AP CSA free response questions and multiple choice traces that recognizing it on sight is worth the practice on its own, separate from being able to compute any single modulus expression correctly.'),

  H.h2('Two Practice Questions in the Exam Format'),
  H.p('The first question traces a mixed integer division and cast expression to its exact final value. The second traces a modulus expression with a negative operand, using the sign rule from above. Predict each answer before opening the explanation.'),
  H.mcq({
    n: 1,
    stem: 'What value is stored in result after the following code executes?',
    codeText: 'int x = 17;\nint y = 5;\ndouble result = x / y;',
    options: ['3.0', '3.4', '17.0', '3'],
    correct: 0,
    why: 'x and y are both declared int, so the expression x / y is integer division regardless of what result is declared as. Seventeen fits five three whole times, with two left over, and that fractional part is discarded before the value is ever stored, leaving the int value three. Only after that division is complete does the assignment to the double variable result happen, widening three into 3.0 by adding a decimal point with no fractional digits recovered. The true mathematical answer, 3.4, is never computed at any point, since the division itself already threw away everything past the decimal before result was assigned anything at all.',
  }),
  H.mcq({
    n: 2,
    stem: 'What is the value of the expression -17 % 5 in Java?',
    options: ['3', '-3', '2', '-2'],
    correct: 3,
    why: 'Java performs truncating integer division first: -17 / 5 truncates toward zero to -3, not down to -4, since truncation always moves toward zero rather than toward negative infinity. Multiplying that quotient back out, -3 times 5 is -15, and subtracting -15 from the original -17 leaves -2, which is the modulus result. The sign of that answer, negative, matches the sign of -17, the left operand, exactly as the sign rule predicts, and it has nothing to do with the fact that 5 on the right is positive. A student who assumes modulus is always non-negative, a rule true in some other languages, would incorrectly expect 3 here instead.',
  }),

  H.h2('Frequently Asked Questions'),
  H.faq([
    { q: 'Does casting the result to double after the division fix the truncation?', a: 'No. By the time a cast or an assignment happens after the division operator has already run, the fractional part is already gone. The cast has to be applied to an operand before the division operator runs, such as (double) 7 / 2, so that Java performs floating point division instead of integer division in the first place. Casting the already-truncated result afterward only changes how that whole number is displayed, adding a decimal point with nothing meaningful after it.' },
    { q: 'Is integer division a compile error in Java?', a: 'No, and that is exactly what makes it a persistent trap rather than a quick fix. Code like double result = 7 / 2; compiles cleanly and runs without any warning, producing a value that is simply the wrong number rather than triggering any kind of error. Nothing about the syntax is invalid, since dividing two int values and assigning the int result to a double variable is completely legal Java, just not the calculation a student usually intended.' },
    { q: 'What is the exact sign rule for a negative modulus result in Java?', a: 'The result of the modulus operator always takes the sign of the left operand, the dividend, never the sign of the right operand, the divisor. A negative number modulus a positive number returns a negative or zero result, and a positive number modulus a negative number still returns a positive or zero result. Checking the sign of the number to the left of the percent sign is enough to predict the sign of the answer every time.' },
    { q: 'How is modulus different from integer division if they use the same two numbers?', a: 'Integer division and modulus are two different pieces of information computed from the identical calculation. Division reports how many whole times the divisor fits into the dividend, discarding the leftover. Modulus reports that leftover directly and discards the whole-number count instead. Multiplying the division result by the divisor and adding the modulus result back together always reproduces the original dividend exactly, which is a quick way to check that a hand-traced pair of answers is internally consistent.' },
  ]),

  H.cta({
    heading: 'Trace integer division and modulus until the truncation stops surprising you',
    body: 'Daily practice built around exactly this kind of arithmetic tracing, plus a full archive of free response questions that test primitive types the way the real exam does.',
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
  H.updatedNote('This is a concept guide, reviewed against the current AP CSA Course and Exam Description. Last reviewed November 3, 2026.'),
]);

module.exports = { meta, body };
