'use strict';
// Evergreen concept post: AP CSA Unit 1 (Using Objects and Methods). Students
// learn the String method calls quickly, then lose points on two very specific
// off-by-one spots: charAt's zero-based index and substring's exclusive upper
// bound. The equals() versus == trap is the third recurring loss, and it ties
// directly back to the reference model taught in the objects-references post.
// No news peg, no stats needed.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'The AP CSA string methods you actually need to know',
  'Indexing COMPUTER character by character: why charAt starts at zero',
  'substring\'s exclusive upper bound: the off-by-one that follows you all year',
  'equals() versus ==: the classic AP CSA string comparison trap',
];

const meta = {
  title: 'AP CSA String Methods: The Off-By-One Traps That Cost Points',
  handle: 'ap-csa-string-methods-off-by-one',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'ap csa string methods',
  publishOn: '2026-09-16',
  seoTitle: 'AP CSA String Methods: Off-By-One Traps Explained',
  seoDescription: 'AP CSA string methods trip students at the same two spots: charAt zero-indexing and substring exclusive upper bound. Trace both with a worked example.',
  summary: 'AP CSA string methods look easy to memorize until charAt and substring start losing points for reasons that feel arbitrary. This guide traces length(), charAt(index), substring(from), substring(from, to), and indexOf() character by character on an actual string, builds real intuition for why the upper bound is exclusive, and covers the equals() versus == comparison trap that shows up on nearly every exam.',
  tags: ['AP CSA', 'Unit 1', 'String Methods', 'Study Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('AP CSA string methods are not hard to memorize. <code>length()</code>, <code>charAt(index)</code>, <code>substring(from)</code>, <code>substring(from, to)</code>, and <code>indexOf()</code> each do exactly one thing, and most students can recite what each one returns within a day of seeing them. What actually costs points is not the method list, it is two specific off-by-one spots that show up inside those methods every single time: <code>charAt</code> counts from zero instead of one, and <code>substring</code>\'s second argument is a boundary you stop before rather than a character you include. Neither fact is stated anywhere near clearly enough the first time it is taught, so this guide traces both on an actual string, index by index, until the pattern is obvious rather than memorized.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 15, 2026', updated: 'September 15, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('There is a reason these particular methods keep producing the same two mistakes across different students and different years. A String is stored as a sequence of characters, and every position in that sequence has an index, but the index is not the position\'s rank the way people count in ordinary language. The first character is not "character one," it is character at index zero. Once that single fact is internalized, most of what looks like scattered String bugs turns out to be the same bug wearing different clothes: a piece of code that was written as if indexing started at one, or as if a boundary argument meant "up to and including" rather than "up to and stopping before."'),
  H.p('This piece walks through every method the exam actually tests, traces each one on a concrete string so the index math is visible rather than assumed, and ends with two practice questions in the exact style the multiple choice section uses.'),

  H.h2(SECTIONS[0]),
  H.p('Six pieces of String behavior cover nearly everything the exam asks for outside of user-defined classes. <code>length()</code> returns the number of characters in the string, with no arguments. <code>charAt(index)</code> returns the single character sitting at a given index. <code>substring(from)</code> returns everything from a given index through the end of the string. <code>substring(from, to)</code> returns a slice starting at one index and stopping before another. <code>indexOf(target)</code> searches for a character or a shorter string inside the string and returns the index where it first appears, or a sentinel value if it never appears at all. Concatenation with <code>+</code> joins strings, and quietly converts a non-String operand to a String when one side of the <code>+</code> is already a String, which is why <code>"score: " + 87</code> is legal even though <code>87</code> is an <code>int</code>.'),
  H.box('key', 'The one fact underneath all of this', '<p>Every index into a String counts from zero, and every valid index is strictly less than the string\'s length. A string with a length of eight has valid indices zero through seven, never eight. Almost every String bug on the exam is this fact applied incorrectly, or not applied at all.</p>'),
  H.p('Read as a list, none of these methods look dangerous. The danger only shows up once real index values are plugged in, because the exam rarely asks "what does <code>charAt</code> do" in the abstract. It gives a specific string and a specific call, and it expects the exact index math to be correct rather than approximately right. That is what the next two sections build, one method at a time, using the same string throughout so the comparisons stay honest.'),

  H.h2(SECTIONS[1]),
  H.p('Take the string <code>"COMPUTER"</code>. It has eight characters, and every one of them sits at an index that is one less than where ordinary counting would put it. Write the string out with its indices lined up underneath, and the zero-based pattern becomes something you can see rather than something you have to remember.'),
  H.code('String word = "COMPUTER";\n// index:      0  1  2  3  4  5  6  7\n// character:  C  O  M  P  U  T  E  R'),
  H.p('<code>word.length()</code> returns eight, which is the count of characters, not an index. That distinction is exactly where the first off-by-one lives: eight characters exist, but the highest valid index is seven, one less than the length, because the count starts at zero rather than one. <code>word.charAt(0)</code> returns the character <code>C</code>, the very first character in the string, sitting at index zero rather than index one. <code>word.charAt(7)</code> returns <code>R</code>, the last character, sitting at index <code>length() - 1</code> rather than at index <code>length()</code>. Ask for <code>word.charAt(8)</code>, one past the last valid index, and the program does not return an empty character or a default value. It throws a <code>StringIndexOutOfBoundsException</code>, because index eight was never a real position in an eight-character string.'),
  H.p('The trace below runs several calls against the same string so the pattern is visible across methods rather than isolated to <code>charAt</code>. <code>indexOf()</code> is included here too, since it returns an index using the identical zero-based counting, and a search that fails returns <code>-1</code> rather than throwing, which is its own small trap if the return value is used as an index without first checking for it.'),
  H.table(
    ['Method call', 'Result', 'Why it lands there'],
    [
      ['word.length()', '8', 'Eight characters total. This is a count, not an index, so it is one more than the highest valid index.'],
      ['word.charAt(0)', "'C'", 'The first character sits at index 0, not index 1, because indexing starts at zero.'],
      ['word.charAt(7)', "'R'", 'The last character sits at index length() - 1, which is 7 for an eight-character string.'],
      ['word.charAt(8)', 'Throws StringIndexOutOfBoundsException', 'Index 8 does not exist. Valid indices for this string run 0 through 7 only.'],
      ['word.substring(3)', '"PUTER"', 'Starts at index 3, which is P, and returns every character through the end of the string.'],
      ['word.indexOf("U")', '4', 'The character U first appears at index 4, counting from the zero-index start of the string.'],
      ['word.indexOf("Z")', '-1', 'Z never appears anywhere in the string, so indexOf reports -1 instead of a real index.'],
    ]
  ),
  H.p('Every row in that table is the same underlying fact applied to a different method. Once the index-versus-count distinction is fixed in place, none of these results require memorizing separately. They can all be derived on the spot by writing the string out with its indices, exactly the way the code block above did, and reading off the answer.'),

  H.h2(SECTIONS[2]),
  H.p('The second off-by-one spot is different from the first, and confusing the two is common enough to be worth calling out directly. <code>charAt</code>\'s trap is that indexing starts at zero. <code>substring(from, to)</code>\'s trap is that the <code>to</code> argument is a boundary the method stops before, not a character it includes. The two-argument form of <code>substring</code> returns the characters starting at index <code>from</code> and continuing up to, but never including, index <code>to</code>.'),
  H.p('Trace <code>word.substring(3, 6)</code> on the same <code>"COMPUTER"</code> string used above. The starting index, 3, is included, and that character is <code>P</code>. The method then keeps including characters at indices 4 and 5, which are <code>U</code> and <code>T</code>. Index 6 is where the method stops, and the character sitting at index 6, which is <code>E</code>, is never included in the result. The returned substring is <code>"PUT"</code>, three characters long, corresponding to indices 3, 4, and 5, and stopping exactly before index 6.'),
  H.code('String word = "COMPUTER";\n// index:      0  1  2  3  4  5  6  7\n// character:  C  O  M  P  U  T  E  R\n\nSystem.out.println(word.substring(3, 6));\n// starts at index 3 (P), stops before index 6 (E is excluded)\n// prints: PUT'),
  H.box('warn', 'The habit that catches this trap every time', '<p>Do not ask "what character is at index to." Ask "what is the last character actually included," which is always the character at index to minus one. For substring(3, 6), the last character included sits at index 5, which is T, not the character at index 6. Writing out the exact indices included, rather than trusting the two numbers by eye, is the only reliable check.</p>'),
  H.p('This design is not arbitrary. It exists because <code>to</code> minus <code>from</code> always equals the length of the returned substring, which makes the exclusive upper bound genuinely useful once it is understood rather than fought. <code>substring(3, 6)</code> returns a string of length <code>6 - 3</code>, which is three characters, and that arithmetic only works cleanly because the upper bound is exclusive. If the upper bound instead included the character at index <code>to</code>, every length calculation built on top of <code>substring</code> would need a plus-one correction scattered through the code, which is exactly the kind of quiet inconsistency that produces bugs nobody can find on a timed exam.'),
  H.p('The one-argument form, <code>substring(from)</code>, sidesteps this particular trap by not taking an upper bound at all. It always returns everything from index <code>from</code> through the true end of the string, which is why <code>word.substring(3)</code> in the earlier table returned <code>"PUTER"</code>, five characters, everything from <code>P</code> onward with no stopping point to get wrong. The two-argument form is where the exclusive-boundary trap lives, and it is worth pausing on every single time it appears rather than trusting a quick read of the two numbers.'),

  H.h2(SECTIONS[3]),
  H.p('The third recurring loss has nothing to do with indices and everything to do with what <code>==</code> actually compares once <code>String</code> is involved. <code>String</code> is a reference type, not a primitive, and <code>==</code> for a reference type asks whether two variables point at the identical object in memory, not whether the two strings contain the same characters. Two <code>String</code> objects built separately with <code>new</code>, even with identical text inside them, are still two different objects at two different addresses, so <code>==</code> returns <code>false</code> even though a person reading the text would call them equal without hesitation.'),
  H.code('String s1 = new String("quiz");\nString s2 = new String("quiz");\nSystem.out.println(s1 == s2);        // false\nSystem.out.println(s1.equals(s2));   // true'),
  H.p('<code>.equals()</code> is the method that answers the question most students actually mean to ask, which is whether two strings hold the same characters. <code>String</code> overrides <code>.equals()</code> to compare contents rather than addresses, so <code>s1.equals(s2)</code> returns <code>true</code> for the pair above, correctly, even while <code>s1 == s2</code> returns <code>false</code>. The safe rule for the exam is short enough to memorize outright: use <code>==</code> for primitive types and for checking whether a reference is <code>null</code>, and use <code>.equals()</code> whenever the question is about the value two objects represent rather than whether they are literally the same object. The full reference model behind why <code>==</code> behaves this way, including why some String literals compare equal with <code>==</code> anyway thanks to how the compiler pools them, is covered in more depth in <a href="/blogs/ap-csa/ap-csa-objects-references-explained">this guide to AP CSA objects and references</a>, and it is worth reading once the pattern above stops feeling obvious.'),
  H.box('key', 'Why this trap survives past Unit 1', '<p>Primitive comparisons with == never lied to a student before String showed up, because every primitive comparison with == already asks the value question, not the identity question. String is usually the first type where the two questions genuinely split apart, and the split does not announce itself. The code compiles either way and only one version gives the answer a rubric is looking for.</p>'),
  H.p('This trap is also where careful practice pays off in a way that memorizing rules does not. A method used earlier in this guide, tracing every variable and every value on paper rather than reasoning about a line of code in your head, is exactly the habit that catches an <code>==</code> versus <code>.equals()</code> mistake before it becomes a wrong answer. The <a href="/blogs/ap-csa/ap-csa-variable-table-tracing-method">variable table tracing method</a> works just as well for tracking whether two variables hold the same reference as it does for tracking loop values, and it is worth running on any free response question that compares two objects with anything other than a primitive type.'),

  H.h2('Two practice questions in the exam format'),
  H.p('The first question chains a substring call and a charAt call together, the way a real multiple choice item often does rather than testing each method in isolation. The second is the equals versus == trap in its most direct form. Predict the answer before opening either explanation.'),
  H.mcq({
    n: 1,
    stem: 'What is printed by the following code segment?',
    codeText: 'String word = "ALGORITHM";\nSystem.out.println(word.substring(2, 5) + word.charAt(0));',
    options: ['GORA', 'GORIA', 'GORTA', 'The code throws a StringIndexOutOfBoundsException.'],
    correct: 0,
    why: 'Write ALGORITHM out with its indices before doing anything else: A is 0, L is 1, G is 2, O is 3, R is 4, I is 5, T is 6, H is 7, M is 8. substring(2, 5) starts at index 2 and stops before index 5, so it includes indices 2, 3, and 4, which are G, O, and R, giving "GOR". word.charAt(0) is the character at index 0, which is A. Concatenating the two with + gives "GOR" + "A", which is "GORA". The most common wrong answer comes from including the character at index 5 in the substring, which would incorrectly add an I and produce "GORIA".',
  }),
  H.mcq({
    n: 2,
    stem: 'Consider the code segment below. What is printed?',
    codeText: 'String a = new String("exam");\nString b = new String("exam");\nString c = a;\nSystem.out.println(a == b);\nSystem.out.println(a == c);\nSystem.out.println(a.equals(b));',
    options: ['true, true, true', 'false, true, true', 'false, false, true', 'true, false, false'],
    correct: 1,
    why: 'a and b are two separate String objects, each created with its own call to new String("exam"), so they live at two different addresses even though their characters match. a == b compares those addresses and returns false. c, on the other hand, is assigned directly from a, which means c holds the exact same reference a does, pointing at the identical object rather than a new one, so a == c compares true. a.equals(b) ignores addresses entirely and compares the characters each String holds, and since both hold "exam", it returns true. The pattern to internalize is that == on String checks whether two variables point at the same object, while equals() checks whether the objects represent the same value, and those two questions can have different answers for the exact same pair of strings.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What AP CSA string methods do I actually need to know for the exam?', a: 'length(), charAt(index), substring(from), substring(from, to), indexOf(), equals(), and concatenation with the + operator cover nearly everything the exam tests outside of user-defined classes. Of these, charAt and substring produce the most off-by-one mistakes, and equals versus == produces the most comparison mistakes.' },
    { q: 'Why does substring(from, to) not include the character at index to?', a: 'The upper bound in substring(from, to) is exclusive by design, so the method stops right before that index rather than including it. This makes the length of the result equal to to minus from with no adjustment needed. The last character actually included sits at index to minus one, not at index to itself.' },
    { q: 'Why is charAt(index) zero-based instead of starting at one?', a: 'Every index into a String, including the ones used by charAt, substring, and indexOf, counts from zero because that is how character positions are stored internally. A string with a length of n therefore has valid indices 0 through n minus 1, never n itself, which is why charAt(word.length()) always throws an exception.' },
    { q: 'Why does a == b return false for two Strings that hold identical text?', a: 'String is a reference type, and == on a reference type compares whether two variables point at the same object in memory, not whether their contents match. Two String objects built separately with new, even with identical characters, are still two different objects at two different addresses, so == returns false. Use equals() to compare the actual characters instead.' },
  ]),

  H.cta({
    heading: 'Trace string method calls until the index math is automatic',
    body: 'Daily practice built around exactly this kind of index tracing, plus a full archive of free response questions that reuse the same String methods in context.',
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
  H.updatedNote('This is a concept guide, reviewed against the current AP CSA Course and Exam Description. Last reviewed September 15, 2026.'),
]);

module.exports = { meta, body };
