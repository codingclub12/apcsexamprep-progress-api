'use strict';
// Evergreen concept post: AP CSA Unit 3 (Class Creation), the static vs.
// instance distinction. Builds on the class-creation post's Book example
// rather than repeating fields/constructors from scratch. The specific trap
// this post targets is narrow on purpose: calling an instance method without
// an object, or reaching for this inside a static method, both of which
// compile-fail rather than misbehave quietly. No news peg, no stats needed.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'AP CSA static methods vs instance methods: what belongs to what',
  'Building a Counter: one instance field, one static field',
  'The compile error static and instance mixing produces',
  'Static vs instance, side by side',
];

const meta = {
  title: 'AP CSA Static Methods vs Instance: The Distinction Behind Compile Errors',
  handle: 'ap-csa-static-vs-instance-compile-errors',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'ap csa static methods',
  publishOn: '2026-10-27',
  seoTitle: 'AP CSA Static Methods vs Instance Methods Explained',
  seoDescription: 'AP CSA static methods versus instance methods, explained with one Counter class and the exact compile error each mix-up produces on the AP exam.',
  summary: 'AP CSA static methods and instance methods look almost identical on the page, one keyword apart, and that similarity is exactly what causes a large share of Unit 3 compile errors. This guide builds one small Counter class with an instance field alongside a static field, shows the two kinds of code that fail to compile when the distinction is ignored, and lays out a table for telling static and instance apart on sight.',
  tags: ['AP CSA', 'Unit 3', 'Class Creation', 'Study Guide'],
  allowedInlineNumbers: ['a third of'],
};

const body = H.article([
  H.dek('AP CSA static methods and instance methods are separated by one keyword in a class file and by a completely different rule for how they get called, and mixing the two up is one of the most common ways a Unit 3 program fails to compile at all. This guide assumes the fields, constructors, and accessor methods covered in the <a href="/blogs/ap-csa/ap-csa-class-creation-constructors-fields-this">AP CSA class creation guide</a> are already familiar, and focuses on one distinction that guide does not cover: which parts of a class belong to a single object, and which parts belong to the class itself, shared by every object at once.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 27, 2026', updated: 'October 27, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('Every field and every method written so far in a typical AP CSA course, up through class creation, has been an instance member: something that belongs to a specific object, created with <code>new</code>, and reachable only through a reference to that object. A <code>static</code> member breaks that pattern on purpose. It belongs to the class itself, exists once no matter how many objects of that class get created, and can be reached without ever writing <code>new</code>. The keyword <code>static</code> is the only thing in the source code that marks the difference, which is precisely why it is easy to add or drop by accident and precisely why the compiler enforces the rule so strictly once that keyword is there or is not.'),
  H.p('This matters beyond avoiding an error message. A field that should be shared across every object, a running total, a shared counter, a constant used by the whole class, has to be static, or every object silently gets its own separate copy and the sharing never happens. A method that has no business needing a particular object, a helper calculation, a utility that works the same way no matter what object called it, is a strong candidate to be static rather than instance. Recognizing which is which, from the class definition and from the way a member is used, is the actual skill being tested.'),

  H.h2(SECTIONS[0]),
  H.p('An instance field belongs to an object. Every object created from a class gets its own separate copy of every instance field that class declares, the same way every <code>Book</code> object in the class creation guide holds its own separate <code>title</code>. Reading or changing an instance field always requires a specific object to reach through, because the field does not exist independently of an object. There is no such thing as "the title" in the abstract. There is only <code>hatchet.getTitle()</code> or <code>holes.getTitle()</code>, each one reading a different object\'s own copy.'),
  H.p('A static field belongs to the class. There is exactly one copy of a static field, ever, no matter how many objects of that class exist, and no matter whether any object exists at all. Every object of the class shares that same single copy, so a change made through one object is visible through every other object and through the class name directly. A static field is declared the same way an instance field is, with one added keyword.'),
  H.code('private int count;          // instance field: one copy per object\nprivate static int total;   // static field: one copy, shared by the class'),
  H.p('The same split applies to methods. An instance method operates on a specific object\'s data, and calling one requires an object to call it on, written as <code>objectName.methodName()</code>. A static method does not depend on any object\'s data at all, and calling one uses the class name instead of an object, written as <code>ClassName.methodName()</code>. Both kinds of method can appear in the same class, side by side, and a class with zero static members and a class with several static members are both completely ordinary.'),
  H.box('key', 'The test that decides which one a member should be', '<p>Ask whether the value or the behavior makes sense for one specific object, or whether it makes sense for the class as a whole regardless of which object, if any, is asking. A book\'s title is a property of that one book: instance. A count of how many Book objects have been created so far is a property of the whole program\'s use of the class, not of any single book: static. When a method never touches an instance field and never needs this, it usually belongs on the static side of that same line.</p>'),

  H.h2(SECTIONS[1]),
  H.p('Build a small <code>Counter</code> class that demonstrates both kinds of member at once: an instance field holding one counter object\'s own count, and a static field holding the total number of <code>Counter</code> objects that have ever been created across the whole program, no matter which object is asked.'),
  H.code('public class Counter {\n    private int count;              // instance field: this object\'s own count\n    private static int totalMade;   // static field: shared by every Counter\n\n    public Counter() {\n        count = 0;\n        totalMade = totalMade + 1;\n    }\n\n    public void increment() {\n        count = count + 1;\n    }\n\n    public int getCount() {\n        return count;\n    }\n\n    public static int getTotalMade() {\n        return totalMade;\n    }\n}'),
  H.p('Two things happen inside that constructor, and they update two completely different kinds of storage. <code>count = 0;</code> sets the new object\'s own instance field, the one that belongs only to the object currently being built. <code>totalMade = totalMade + 1;</code> reads and rewrites the single shared static field, the one every <code>Counter</code> object that has ever existed reads and writes through, and it runs once per constructor call, meaning once per object created, which is exactly what makes it a correct running total of every object ever made.'),
  H.p('Watch what happens across three separate objects to see the sharing directly rather than taking it on faith.'),
  H.code('Counter a = new Counter();\nCounter b = new Counter();\nCounter c = new Counter();\n\na.increment();\na.increment();\nb.increment();\n\nSystem.out.println(a.getCount());          // 2\nSystem.out.println(b.getCount());          // 1\nSystem.out.println(c.getCount());          // 0\nSystem.out.println(Counter.getTotalMade()); // 3'),
  H.p('<code>a</code>, <code>b</code>, and <code>c</code> each hold a completely independent instance field, so calling <code>increment()</code> on <code>a</code> twice has zero effect on <code>b</code> or <code>c</code>, exactly the way changing one <code>Book</code> object\'s title never touches any other <code>Book</code>. Compare that with <code>totalMade</code>. It was three, the moment the third object finished construction, and it stays three no matter which object asks or whether any object asks at all, which is exactly what the last line demonstrates: <code>Counter.getTotalMade()</code> is called on the class name, with no object anywhere in that line, and it still returns the correct shared value.'),
  H.box('tip', 'Why getTotalMade is called through the class name, not an object', '<p>getTotalMade is declared static, so Java does not require, or even allow by convention, calling it through an object reference. Counter.getTotalMade() reads as the class answering a question about itself as a whole, which matches what the method actually does: it reports a fact about every Counter object ever made, not a fact about any one of them. Calling it as a.getTotalMade() would compile in Java as a quirk of the language, since Java tolerates calling a static method through an instance reference, but it is misleading style precisely because it implies a dependency on a that does not exist, and the AP CSA exam expects ClassName.methodName() as the correct form.</p>'),
  H.p('One field, one line changed, and the behavior of that field is entirely different from every instance field discussed in the class creation guide. That is the whole distinction made concrete: <code>static</code> is not a stronger or weaker version of an instance field, it is a genuinely different kind of storage, one shared copy instead of one copy per object.'),

  H.h2(SECTIONS[2]),
  H.p('Two specific mistakes account for most of the static and instance confusion that shows up as a compile error rather than a wrong answer. The first is calling an instance method as though it were static, through the class name with no object. The second is using <code>this</code> inside a method that was declared static. Both fail to compile, and both fail for the same underlying reason: a static method or a static context has no particular object attached to it, so anything that only makes sense in the presence of one specific object has nothing to refer to.'),
  H.code('public class Counter {\n    private int count;\n\n    public void increment() {\n        count = count + 1;\n    }\n\n    public static void main(String[] args) {\n        Counter.increment();   // instance method called without an object\n    }\n}'),
  H.p('That line produces a compile error along these lines, depending on the exact Java version and IDE:'),
  H.code('error: non-static method increment() cannot be referenced from a static context'),
  H.p('The message names the problem precisely. <code>increment()</code> is an instance method, meaning its whole job is to change one specific object\'s <code>count</code> field, but the call <code>Counter.increment()</code> never named an object at all. The compiler has no way to know which <code>Counter</code>\'s <code>count</code> should change, because none was given, so it refuses to compile the program rather than guess. The fix is either to create an object and call the method on that object, <code>Counter c = new Counter(); c.increment();</code>, or, if the method really was meant to work without reference to any particular object\'s data, to declare it static in the first place.'),
  H.p('The second mistake runs the same failure in the other direction: writing <code>this</code> inside a method that has no object to be <code>this</code>.'),
  H.code('public class Counter {\n    private int count;\n\n    public static void resetHint() {\n        this.count = 0;   // this has no meaning inside a static method\n    }\n}'),
  H.p('This one also refuses to compile, with a message close to:'),
  H.code('error: non-static variable count cannot be referenced from a static context'),
  H.p('<code>this</code> always refers to the object a method was called on, and a static method, by definition, was not called on any object at all. It runs off the class alone, so there is no object for <code>this</code> to name, and <code>this.count</code> inside it is not asking a valid question. The same failure shows up any time a static method tries to touch any instance field directly, even without writing <code>this</code> explicitly, since a bare <code>count</code> inside a static method has exactly the same problem: it means the object\'s field, and no object is available inside a static method to own that field.'),
  H.box('warn', 'The same rule, read backward', '<p>An instance method can freely call a static method or read a static field, since a static member is available everywhere, object or no object. A static method cannot touch an instance field or call an instance method without first being handed a specific object to call it through, since only an object has instance data to offer. Static is available from everywhere. Instance is only available from a specific object, and a static method never has one of those to hand.</p>'),
  H.p('Both errors are compile-time failures, not runtime bugs, which is worth noticing on its own. Java catches this category of mistake before the program ever runs, unlike the constructor-shadowing trap covered in the class creation guide, which compiles cleanly and only produces a wrong answer once the program runs and a getter returns a default value. A red compiler error naming a static context is annoying, but it is the easier of the two mistakes to fix, precisely because the compiler is already pointing at the exact line.'),

  H.h2(SECTIONS[3]),
  H.p('The table below collects the distinction across the four dimensions that matter most on the exam: what a member belongs to, how it gets called, how many copies of it exist in memory, and whether <code>this</code> is legal to write inside it.'),
  H.table(
    ['Dimension', 'Instance member', 'Static member'],
    [
      ['Belongs to', 'A specific object', 'The class itself'],
      ['Accessed via', 'objectName.methodName() or objectName.fieldName', 'ClassName.methodName() or ClassName.fieldName'],
      ['Memory', 'One separate copy per object created', 'One single copy, shared by every object'],
      ['Can use this', 'Yes, this refers to the object the method was called on', 'No, there is no object for this to refer to'],
      ['Needs an object to call', 'Yes, always', 'No, callable with zero objects in existence'],
    ]
  ),
  H.p('The <code>main</code> method every AP CSA program relies on to start execution is itself a strong, familiar example of a static method, and its signature confirms exactly why: <code>public static void main(String[] args)</code> has to be callable before any object in the program exists yet, since it is the method that runs first and typically creates the program\'s first objects itself. A non-static <code>main</code> would need an object to be called on, but no object could exist yet for it to be called on, which is a contradiction the language avoids by requiring <code>static</code> there specifically.'),

  H.h2('Two practice questions in the exam format'),
  H.p('The first question checks whether a described member is correctly identified as static or instance from its behavior alone, without seeing the keyword. The second checks recognition of the specific compile error a static and instance mix-up produces. Predict the answer before opening either explanation.'),
  H.mcq({
    n: 1,
    stem: 'A class named Ticket represents one concert ticket. One of its members tracks the seat number printed on that particular ticket. Another of its members tracks how many Ticket objects have been created in total since the program started. Which pairing correctly identifies each member?',
    options: [
      'Seat number is static, total created is an instance field.',
      'Seat number is an instance field, total created is static.',
      'Both members must be instance fields, since both are declared inside the same class.',
      'Both members must be static, since both are numeric values.',
    ],
    correct: 1,
    why: 'The seat number belongs to one specific ticket. Two different Ticket objects can, and normally do, hold two different seat numbers, which is exactly the behavior of an instance field: one separate copy per object. The total number of Ticket objects created is a fact about the class as a whole, not about any single ticket, and every Ticket object should see the identical shared value if asked, which is exactly the behavior of a static field. Whether a field is static or instance depends entirely on whether the value varies per object or is shared across all of them, never on the field\'s data type and never on which class the fields happen to be declared in together.',
  }),
  H.mcq({
    n: 2,
    stem: 'The code segment below is intended to compile and run. What is the result of attempting to compile it?',
    codeText: 'public class Robot {\n    private int battery;\n\n    public void charge() {\n        battery = 100;\n    }\n\n    public static void chargeAll() {\n        battery = 100;\n    }\n}',
    options: [
      'The code compiles and runs with no errors.',
      'The code compiles, but battery is left at its default value at runtime.',
      'The code does not compile: chargeAll cannot reference the instance field battery from a static context.',
      'The code does not compile: charge is missing the static keyword.',
    ],
    correct: 2,
    why: 'battery is declared as an instance field, with no static keyword, so it belongs to a specific Robot object and only exists in the context of one. chargeAll is declared static, meaning it can be called through the class name with no object involved at all, so there is no particular Robot whose battery the line battery = 100; inside it could possibly be changing. The compiler catches exactly this and refuses to build the program, producing an error naming battery as a non-static field referenced from a static context. The method charge above it is fine exactly as written, since it is an instance method and instance methods are allowed to read and write instance fields freely; nothing requires charge to be static, and adding static there would break it instead of fixing anything.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Can a static method call an instance method directly?', a: 'Not without an object to call it through. A static method has no object attached to it, so it cannot call objectName.methodName() unless it either receives that object as a parameter or creates one itself first, such as with Counter c = new Counter(); c.increment();. A static method calling another static method needs no object at all, since neither side of that call depends on one.' },
    { q: 'Is main always static in AP CSA programs?', a: 'Yes. The method signature public static void main(String[] args) has to include static because main is the method Java runs to start the program, before any object the program itself might create yet exists. A non-static main would require an object to be called on, and no such object is guaranteed to exist at that point.' },
    { q: 'Why does the compiler catch a static mistake instead of just running the program wrong?', a: 'Whether a method or field is static is fixed at compile time, written directly into the class file, not something that depends on data computed while the program runs. The compiler can check every reference to an instance member inside a static method against that fixed information before running anything at all, which is exactly why this category of mistake shows up as a compile error rather than a wrong answer discovered later.' },
    { q: 'Can a class have static fields but no static methods, or the other way around?', a: 'Yes, freely. A class can mix static and instance members in any combination the design calls for. A class with a shared constant declared static and every one of its methods declared as ordinary instance methods is completely normal, and so is the reverse, a class built entirely from static utility methods with no instance fields at all.' },
  ]),

  H.cta({
    heading: 'Practice static and instance until the compile error stops surprising you',
    body: 'Daily practice built around exactly this kind of static versus instance tracing, plus a full archive of free response questions that test class design the way the real exam does.',
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
  H.updatedNote('This is a concept guide, reviewed against the current AP CSA Course and Exam Description. Last reviewed October 27, 2026.'),
]);

module.exports = { meta, body };
