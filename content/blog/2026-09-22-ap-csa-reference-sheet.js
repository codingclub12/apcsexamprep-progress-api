'use strict';
// Weekly course post: AP CSA. Drill track: teaching students to use the
// official Java Quick Reference as it actually exists, not as students
// imagine it, and to find the gap between the two weeks before exam day.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'What the AP CSA reference sheet actually is, and when you get it',
  'What is actually printed on the AP CSA reference sheet',
  'What the reference sheet does not give you, and why that surprises students',
  'A study strategy: find the gaps weeks before exam day, not during it',
  'Two practice questions: reading the reference sheet the way the exam expects',
  'Frequently asked questions',
];

const meta = {
  title: 'The AP CSA Reference Sheet: What It Gives You and What It Does Not',
  handle: 'ap-csa-reference-sheet-what-it-gives-you',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'ap csa reference sheet',
  publishOn: '2026-09-22',
  seoTitle: 'AP CSA Reference Sheet: What It Actually Covers',
  seoDescription: 'What the AP CSA reference sheet actually prints, the String, Math, and List methods on it, and the gaps students hit by assuming too much or too little.',
  summary: 'Students treat the AP CSA reference sheet two wrong ways: ignoring it completely, or trusting it to cover everything Java can do. Both cost points. This walks through what the official Java Quick Reference actually contains, the specific method signatures printed on it, the ordinary syntax and methods it leaves out, and a concrete plan for finding those gaps weeks before the exam rather than mid-FRQ.',
  tags: ['AP CSA', 'Reference Sheet', 'Java Quick Reference', 'Study Habits', 'Exam Prep'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('The AP CSA reference sheet is real, it is useful, and it covers far less than most students expect. Knowing exactly what is printed on it, and exactly what is not, is the difference between a tool that saves you time on exam day and a tool you discover has a hole in it while a free-response question is running out the clock.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 22, 2026', updated: 'September 22, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('The official name for the AP CSA reference sheet is the Java Quick Reference. It is a College Board document that lists the signatures and short descriptions of a specific, limited set of methods from the Java library, the ones a student might need while writing code on the exam but should not be expected to have purely memorized.'),
  H.p('The detail that catches students off guard is timing. The reference sheet is provided starting with the free-response section of the exam, not the multiple-choice section. During the sixty or so multiple-choice questions, you are working from memory alone, no sheet in front of you at all. It only appears once you move into the section where you are actually writing Java code from scratch.'),
  H.box('key', 'One document, one section', '<p>Treat the reference sheet as an FRQ tool specifically, not a general exam companion. Every multiple-choice question about a String, Math, or ArrayList method has to be answered from what you actually know, which is exactly why the practice strategy later in this post has you rehearse without the sheet first.</p>'),
  H.sourceNote('College Board, AP Computer Science A Exam', 'https://apcentral.collegeboard.org/courses/ap-computer-science-a/exam', '2026-08-20'),

  H.h2(SECTIONS[1]),
  H.p('The AP CSA reference sheet is not a general Java cheat sheet. It is narrowly scoped to method signatures from three places in the Java library: the String class, the Math class, and the List interface, which is what ArrayList implements and where its methods are listed. That is the entire method inventory. Nothing else in the Java standard library gets a line on this document.'),
  H.p('Below are the method signatures printed on the current sheet, transcribed exactly as College Board writes them, organized by where each one lives.'),
  H.table(
    ['Where it lives', 'Signature', 'What it does'],
    [
      ['String', 'int length()', 'Number of characters in the string.'],
      ['String', 'String substring(int from, int to)', 'Characters from index from up to, but not including, index to.'],
      ['String', 'String substring(int from)', 'Same as substring(from, length()).'],
      ['String', 'int indexOf(String str)', 'Index of the first occurrence of str, or negative one if it is not found.'],
      ['String', 'boolean equals(Object other)', 'True if this string is the same sequence of characters as other.'],
      ['String', 'int compareTo(String other)', 'Negative, zero, or positive depending on how this string orders against other.'],
      ['Math', 'int abs(int x)', 'Absolute value of an int.'],
      ['Math', 'double abs(double x)', 'Absolute value of a double.'],
      ['Math', 'double pow(double base, double exp)', 'base raised to the exp power.'],
      ['Math', 'double sqrt(double x)', 'Positive square root of x.'],
      ['Math', 'double random()', 'A random double, at least zero and less than one.'],
      ['List', 'int size()', 'Number of elements currently in the list.'],
      ['List', 'boolean add(E obj)', 'Appends obj to the end of the list; returns true.'],
      ['List', 'void add(int index, E obj)', 'Inserts obj at index, shifting later elements to the right.'],
      ['List', 'E get(int index)', 'The element stored at index.'],
      ['List', 'E set(int index, E obj)', 'Replaces the element at index with obj; returns the old value.'],
      ['List', 'E remove(int index)', 'Removes the element at index and shifts later elements to the left.'],
    ]
  ),
  H.sourceNote('College Board, AP Computer Science A Java Quick Reference', 'https://apcentral.collegeboard.org/media/pdf/ap-computer-science-a-java-quick-reference.pdf', '2026-08-20'),
  H.p('That is seventeen method signatures total, and it is worth sitting with how short that list actually is compared to how much Java code the exam asks you to write. Three classes, a small handful of methods each, described in a sentence or two apiece. That is genuinely all the reference sheet promises.'),

  H.h2(SECTIONS[2]),
  H.p('Almost every student who has never actually opened the reference sheet imagines it as something closer to a general syntax card: how to write a for loop, how a class is declared, what a boolean expression looks like, maybe how Scanner reads input. None of that is on it. The sheet assumes you already know Java syntax cold and only fills in the method signatures from those three specific classes.'),
  H.ul([
    '<strong>No loop or conditional syntax.</strong> The structure of a for loop, a while loop, an if or if-else statement, none of it appears anywhere on the sheet. That has to already live in memory.',
    '<strong>No class declaration syntax.</strong> How to write a constructor, a public class header, an instance variable, a getter or setter, all of it is assumed knowledge, not printed reference.',
    '<strong>No general keywords or operators.</strong> Nothing about public, private, static, return, the comparison and logical operators, or casting between types.',
    '<strong>No Scanner, Integer, Character, or Object methods.</strong> Reading input, parsing a string into a number, testing whether a character is a digit or a letter, none of those classes get a line on the sheet. If a question needs Integer.parseInt or a Character method, you either already know the exact syntax or you improvise around it.',
    '<strong>Not every method the listed classes actually have.</strong> String really does have contains, replace, and toUpperCase in the full Java library. None of the three appear on the reference sheet. Only the six String signatures in the table above are there.',
  ]),
  H.box('warn', 'Two ways this trips people up', '<p>Some students never look at the sheet before exam day and lose time re-deriving substring index rules they could have just read off the page. Others assume the sheet is more complete than it is, reach for a method mid-FRQ that they are sure must be listed somewhere, and burn a minute discovering it is not there at all. The fix for both is the same: know the actual boundary before the exam, not during it.</p>'),
  H.p('The second failure mode is the more expensive one, because it happens under time pressure. A student writing a method that needs to check part of a string spends thirty seconds hunting the sheet for a contains call that was never going to be there, then has to fall back to indexOf anyway, just later and more rattled than if they had planned on indexOf from the start.'),

  H.h2(SECTIONS[3]),
  H.p('The fix is not memorizing the reference sheet. It is finding out, well before the exam, exactly where your own syntax knowledge and the sheet stop covering each other, so the gap shows up on a Tuesday afternoon at your kitchen table instead of during Section II.'),
  H.ol([
    '<strong>Print the actual PDF.</strong> Download the current Java Quick Reference from College Board directly and print it, the same physical page format you will see on exam day, rather than working from a summary or a study app version of it.',
    '<strong>Attempt a full free-response question using only the printed sheet plus whatever syntax you have memorized.</strong> No notes, no searching, no asking. Set a timer even if you go over it, because the point of this first pass is not speed, it is finding the edges.',
    '<strong>Circle every moment you reach for something the sheet does not have.</strong> A loop structure you blanked on, a method you assumed would be listed and was not, a constructor syntax detail you second-guessed. Each circle is a real gap, not a hypothetical one.',
    '<strong>Turn the circled list into a short, specific drill set.</strong> If you blanked on for-loop syntax, write five for loops from memory the next day. If you assumed String had a contains method, write the indexOf-based substitute until it is automatic.',
    '<strong>Run a second timed attempt closer to the exam.</strong> A different free-response question, same rules, no notes beyond the printed sheet. If the same categories of gap reappear, they get another round of drilling. If new ones show up, they get added to the list.',
  ]),
  H.box('key', 'Weeks, not days', '<p>This only works with enough runway to act on what you find. Doing this cold the night before the exam turns up the same gaps, but with no time left to close any of them. Several weeks out, a discovered gap is just a study topic. The week of the exam, the same gap is a surprise.</p>'),

  H.h2(SECTIONS[4]),
  H.p('Both questions below test the actual boundary of the reference sheet rather than a coding skill on its own, which is a distinct thing worth practicing separately from writing correct Java.'),
  H.mcq({
    n: 1,
    stem: 'A student is writing an AP CSA free-response answer and wants to double-check a method signature. Which of the following method calls would actually be explained on the official Java Quick Reference?',
    options: [
      'myList.add(2, "value") on a variable declared as a List',
      'Integer.parseInt("42")',
      'Character.isDigit(c)',
      'input.nextInt() on a Scanner variable',
    ],
    correct: 0,
    why: 'The List interface is one of the three sections on the reference sheet, and void add(int index, E obj) is listed there exactly, including the description that it inserts the object at the given index and shifts later elements to the right. Integer, Character, and Scanner do not appear on the sheet at all, so parseInt, isDigit, and nextInt all have to come from memory rather than a lookup.',
  }),
  H.mcq({
    n: 2,
    stem: 'While writing code for a free-response question, a student wants to check whether a String variable word contains the letters "ca" anywhere inside it, and reaches for the reference sheet expecting to find a contains method. What should the student actually do?',
    options: [
      'Use word.indexOf("ca") and check whether the result is not equal to negative one, since indexOf is the String method that is actually on the reference sheet',
      'Keep searching the reference sheet, since contains is a real String method and should eventually appear on it',
      'Switch the variable to an ArrayList of characters, since only List methods are guaranteed to be on the sheet',
      'Use word.equals("ca") in a loop over every substring of word',
    ],
    correct: 0,
    why: 'contains is a real method on the full Java String class, but it is one of the methods the reference sheet leaves out. The sheet only lists six String methods, and indexOf is one of them: int indexOf(String str), returning the index of the first occurrence or negative one if the substring is not found. Testing whether that return value is not equal to negative one is the standard substitute, and it uses only what is actually printed on the sheet. Converting to a List does not solve a substring search, and looping over every substring with equals is unnecessary work when indexOf already does the job in one call.',
  }),

  H.h2(SECTIONS[5]),
  H.faq([
    { q: 'When during the AP CSA exam do I actually get the reference sheet?', a: 'Starting with the free-response section, not the multiple-choice section. Every String, Math, or List method question in the multiple-choice section has to be answered from memory, with no sheet available at all.' },
    { q: 'Does the AP CSA reference sheet include Scanner, Integer, or Character methods?', a: 'No. The sheet is limited to method signatures from String, Math, and the List interface. Reading input with Scanner, parsing a String into a number with Integer, and testing a character with methods on the Character class are all left off, so that syntax needs to already be memorized.' },
    { q: 'Does the reference sheet list every method that String, Math, and List actually have?', a: 'No. It lists a specific, short subset College Board chose. String really does have methods like contains, replace, and toUpperCase in the full Java language, but none of them are on the AP reference sheet, only the six signatures College Board selected.' },
    { q: 'When should I start practicing with the reference sheet instead of my normal notes?', a: 'Several weeks before the exam, not the final few days. Doing a full timed free-response question using only the printed sheet plus memorized syntax is how you find the specific gaps between what you know and what the sheet covers, and finding a gap early leaves enough time to actually close it. See the study strategy above for the full method.' },
    { q: 'Is it worth memorizing the exact wording on the reference sheet?', a: 'Not really. What matters is knowing which three places the sheet covers, String, Math, and List, and being fast at reading a signature you have seen before rather than reading it cold. The method names and parameter order become familiar fast once you have used the sheet in a few practice attempts, which is a better use of time than word-for-word memorization.' },
  ]),

  H.cta({
    heading: 'Practice with the reference sheet before the exam does it for you',
    body: 'Daily multiple choice and free response questions with full solutions, organized by unit, so reaching for the reference sheet becomes routine well before exam day instead of a surprise during it.',
    links: [
      { href: '/pages/ap-csa-qotd-hub', text: 'Daily practice' },
      { href: '/pages/ap-csa-frq-archive', text: 'FRQ archive', alt: true },
    ],
  }),
  H.p('Two related posts worth pairing with this one: <a href="/blogs/ap-csa/ap-csa-string-methods-off-by-one">a closer look at String methods and the off-by-one mistakes they invite</a>, and <a href="/blogs/ap-csa/ap-csa-variable-table-tracing-method">the variable table tracing method</a> for reasoning through what code actually does once the syntax, reference sheet or not, is correct.'),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Last reviewed September 22, 2026.'),
]);

module.exports = { meta, body };
