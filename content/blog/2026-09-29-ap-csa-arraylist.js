'use strict';
// Evergreen concept post: AP CSA Unit 4 (Data Collections). Array and
// ArrayList look interchangeable to a student who has only seen them do
// similar things, and the exam leans hard on the places they are not
// interchangeable at all: fixed size versus dynamic size, primitives versus
// wrapper classes, and the specific runtime trap of removing from an
// ArrayList while iterating over it with a for-each loop. No news peg, no
// stats needed.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'AP CSA ArrayList vs array: the one-sentence version, then the details',
  'Building the same list two ways, side by side',
  'Why ArrayList needs Integer instead of int',
  'The trap: removing from an ArrayList while you loop over it',
];

const meta = {
  title: 'AP CSA ArrayList vs Array: The Distinction Tested Every Year',
  handle: 'ap-csa-array-vs-arraylist',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'ap csa arraylist',
  publishOn: '2026-09-29',
  seoTitle: 'AP CSA ArrayList vs Array: The Full Comparison Guide',
  seoDescription: 'AP CSA ArrayList vs array explained: fixed size vs dynamic size, wrapper classes, and the removal-during-iteration trap the exam tests yearly.',
  summary: 'AP CSA ArrayList and array look like two ways to store a list of values, and the exam spends real points on exactly where they stop being interchangeable. This guide builds the same small collection both ways, explains why ArrayList needs Integer instead of int, compares the syntax that trips students up under time pressure, and walks through the single most common Unit 4 bug: removing an element from an ArrayList inside a for-each loop.',
  tags: ['AP CSA', 'Unit 4', 'Data Collections', 'Study Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('AP CSA ArrayList and array both hold a list of values, and a first glance at the two makes them look like different spellings of the same idea. They are not. Unit 4, Data Collections, is where the AP CSA exam tests whether a student actually understands the difference or is just guessing which one a problem wants, and the questions are rarely about syntax alone. They ask a student to notice that a fixed-size array cannot be resized, that ArrayList cannot hold primitive <code>int</code> values directly, and that removing an element from an ArrayList in the middle of a for-each loop produces a bug that compiles cleanly and fails silently or throws at runtime depending on exactly where the removal happens. This guide builds one small collection two ways, array and ArrayList, walks through why the wrapper class requirement exists at all, and traces the removal-during-iteration trap statement by statement so it stops being a mystery and starts being a pattern you recognize on sight.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 29, 2026', updated: 'September 29, 2026', readingMinutes: 12,
  }),
  H.toc(SECTIONS),

  H.p('Both structures exist to solve the same basic problem: a program often needs to hold more than one value under a single name, rather than declaring <code>score1</code>, <code>score2</code>, and <code>score3</code> as three separate variables. Array and ArrayList both do that. The AP CSA Course and Exam Description places array and iteration inside the Selection and Iteration content students already know before Unit 4 begins, and Data Collections is where ArrayList joins array as a second option for exactly the same job. What the exam actually tests is not whether a student can declare either one. It is whether a student can look at a problem description and correctly decide which structure that specific problem is really asking for, and then avoid the handful of syntax and runtime traps that come from mixing the two up.'),
  H.p('The decision comes down to one question asked before a single line of code gets written: does this problem know its final size in advance, and does that size ever need to change while the program runs? An array answers yes to the first half and no to the second. Its size is fixed the moment it is created and never grows or shrinks afterward. An ArrayList answers no to both. Its size can grow or shrink at any point after creation, one element at a time, through method calls rather than a fixed declaration. Every other difference between the two, syntax included, follows from that one distinction rather than existing independently of it.'),

  H.h2(SECTIONS[0]),
  H.p('An array is declared with a size, and that size is permanent for the life of that array object. <code>int[] scores = new int[5];</code> creates an array that holds exactly five <code>int</code> values, no more and no fewer, for as long as that array exists. There is no method that adds a sixth slot or removes the third one. A program that needs a sixth value has to create an entirely new, larger array and copy the old values into it by hand, which is exactly the kind of code an ArrayList exists to avoid writing.'),
  H.p('An ArrayList is declared with an initial state that holds zero elements, or is built from an existing collection, and its size changes as elements are added or removed through method calls. <code>ArrayList<Integer> scores = new ArrayList<Integer>();</code> creates an empty ArrayList, and calling <code>scores.add(90);</code> five separate times leaves it holding five elements, not because five was declared anywhere, but because five <code>add</code> calls happened. Call <code>scores.remove(2);</code> afterward and the ArrayList now holds four elements, shifted to close the gap automatically.'),
  H.box('key', 'The one question that decides which one to use', '<p>Is the final count of elements known before the collection is built, and does it stay fixed for the entire time the program uses it? If yes, an array is the right tool and is usually the simpler one to write correctly. If the count is unknown up front, or if elements need to be added or removed while the program runs, ArrayList is the right tool, because array has no add or remove operation at all.</p>'),
  H.p('This is also where a common misreading needs to be named directly. An array is not slower or more limited in every sense, and ArrayList is not simply an upgraded array. Array access by index is direct and fast, and an array of primitives avoids the wrapper class overhead ArrayList requires, covered in the next section. The two structures trade one set of guarantees for a different set, fixed size and primitive support against dynamic size and a richer set of built-in methods, and an AP CSA problem picks whichever trade fits the scenario it describes.'),

  H.h2(SECTIONS[1]),
  H.p('Building the same small collection both ways makes the differences concrete rather than abstract. The task is simple: store five integer scores, then print each one on its own line. Here is the array version first.'),
  H.code('int[] scores = new int[5];\nscores[0] = 88;\nscores[1] = 95;\nscores[2] = 72;\nscores[3] = 100;\nscores[4] = 91;\n\nfor (int i = 0; i < scores.length; i++) {\n    System.out.println(scores[i]);\n}'),
  H.p('Every value is set with square-bracket index notation, <code>scores[0] = 88;</code>, and reading a value back uses the identical bracket syntax, <code>scores[i]</code>. The loop bound comes from <code>scores.length</code>, a field rather than a method call, and it never has parentheses after it. The size, five, was fixed the instant <code>new int[5]</code> ran, and nothing in this code could make that array hold six elements without replacing it with a different array entirely.'),
  H.p('Here is the identical task with ArrayList instead.'),
  H.code('ArrayList<Integer> scores = new ArrayList<Integer>();\nscores.add(88);\nscores.add(95);\nscores.add(72);\nscores.add(100);\nscores.add(91);\n\nfor (int i = 0; i < scores.size(); i++) {\n    System.out.println(scores.get(i));\n}'),
  H.p('Every value is added with a method call, <code>scores.add(88);</code>, rather than assigned to an index that has to already exist, and reading a value back uses <code>scores.get(i)</code>, also a method call rather than bracket notation. The loop bound comes from <code>scores.size()</code>, a method with parentheses, not a field. Nothing about the declaration fixed the count at five. Five <code>add</code> calls happened to run, and a sixth <code>scores.add(60);</code> anywhere in the program would leave the ArrayList holding six elements with no error and no special handling required.'),
  H.p('Read the two blocks side by side and the pattern that matters for the exam becomes visible: array uses operators and fields, square brackets and <code>.length</code>, while ArrayList uses method calls for everything, <code>.add()</code>, <code>.get()</code>, <code>.size()</code>, <code>.remove()</code>. That single distinction, operator versus method, explains most of the compile errors students hit when they mix the two structures up under time pressure.'),

  H.h2(SECTIONS[2]),
  H.p('The declaration <code>ArrayList<Integer></code> above uses <code>Integer</code>, not <code>int</code>, and that substitution is not a stylistic choice. It is required, and the reason is worth understanding rather than memorizing. ArrayList is built using Java generics, which means the type it holds is filled in with angle brackets at the point where an ArrayList is declared, <code>ArrayList<String></code>, <code>ArrayList<Book></code>, <code>ArrayList<Integer></code>, and so on for whatever type a program needs to store. Generics in Java work only with reference types, the category of type that includes every class, and <code>int</code> is not a reference type. It is one of Java\'s primitive types, alongside <code>double</code>, <code>boolean</code>, and a handful of others, and primitives cannot fill in a generic type parameter directly.'),
  H.p('<code>Integer</code> is the answer to that restriction. It is a wrapper class, a full class whose only job is holding a single <code>int</code> value inside an object, which makes it a reference type and therefore legal wherever a generic type parameter is required. <code>ArrayList<Integer></code> is legal Java. <code>ArrayList<int></code> is not, and will not compile at all.'),
  H.code('ArrayList<int> broken = new ArrayList<int>();     // does not compile\nArrayList<Integer> works = new ArrayList<Integer>(); // compiles fine\nworks.add(42);                                        // autoboxing: int becomes Integer here'),
  H.p('That last line is worth noticing closely. <code>works.add(42);</code> passes a plain <code>int</code> literal to a method that expects an <code>Integer</code>, and Java converts it automatically behind the scenes, a process called autoboxing. The reverse also happens automatically: reading a value back out with <code>works.get(0)</code> returns an <code>Integer</code>, but assigning it to an <code>int</code> variable, <code>int first = works.get(0);</code>, triggers unboxing and converts it back without the programmer writing any conversion code by hand. AP CSA expects a student to know this conversion happens, not to write it manually, so the code samples above never call a conversion method explicitly, and neither should a student\'s own code on the exam.'),
  H.box('warn', 'A wrapper class is still a reference type underneath', '<p>Because Integer is a class, two Integer objects holding the same numeric value are not automatically the same object in memory, which matters the same way it matters for any other reference type: == compares references, while .equals() compares the values stored inside. This rarely trips a Unit 4 question directly, but it is the same underlying idea covered for objects generally in the guide to AP CSA objects and references, and it applies to every ArrayList element that is not a primitive.</p>'),
  H.p('Array has no equivalent restriction, which is one of its real advantages. <code>int[] scores = new int[5];</code> stores actual <code>int</code> values directly, with no wrapper class and no autoboxing overhead, because array works with both primitive types and reference types natively. That is part of why a fixed-size array of primitives is sometimes the more efficient choice even when ArrayList would also work: it skips the wrapper class entirely for exactly the kind of data, raw numbers, that a scoring or counting problem usually needs.'),

  H.h2('Syntax and behavior compared directly'),
  H.p('The table below collects the operator-versus-method pattern from the code samples above into one reference, plus the two comparison points, size and primitive support, that decide which structure a problem actually wants.'),
  H.table(
    ['Operation', 'Array', 'ArrayList'],
    [
      ['Declare and create', 'int[] arr = new int[5];', 'ArrayList<Integer> list = new ArrayList<Integer>();'],
      ['Set or add a value', 'arr[0] = 10;', 'list.add(10);'],
      ['Read a value', 'arr[0]', 'list.get(0)'],
      ['Current size', 'arr.length (field, no parentheses)', 'list.size() (method, needs parentheses)'],
      ['Remove an element', 'Not supported. Size is fixed after creation.', 'list.remove(index);'],
      ['Holds primitives directly', 'Yes, int, double, boolean, and so on', 'No. Requires a wrapper class such as Integer'],
      ['Size after creation', 'Fixed permanently', 'Grows or shrinks with add and remove'],
    ]
  ),
  H.p('Two entries in that table are the ones that generate compile errors under exam pressure specifically because they look almost interchangeable. Calling <code>arr.size()</code> on an array does not compile, because array has no <code>size</code> method at all. It has a <code>length</code> field, no parentheses, and that is the only way to ask an array how many elements it holds. Calling <code>list.length</code> on an ArrayList does not compile either, in the other direction, because ArrayList has no <code>length</code> field. It has a <code>size()</code> method. Both mistakes are easy to make from muscle memory built on the other structure, and both produce a compiler error rather than a wrong answer, which at least means the mistake gets caught before the program runs. Recognizing the field-versus-method split on sight, the way the <a href="/blogs/ap-csa/ap-csa-reading-java-error-messages">guide to reading Java error messages</a> covers for compiler output generally, is faster under time pressure than re-deriving which structure uses which syntax from scratch every time.'),

  H.h2(SECTIONS[3]),
  H.p('Everything above is about syntax that either compiles or does not. This trap is different and more dangerous precisely because the buggy code compiles cleanly and often runs without immediately crashing. Removing an element from an ArrayList while iterating over it with an enhanced for-each loop is the single most common Unit 4 bug, and it deserves a full trace rather than a one-line warning.'),
  H.code('ArrayList<Integer> nums = new ArrayList<Integer>();\nnums.add(10);\nnums.add(20);\nnums.add(30);\nnums.add(40);\n\nfor (int n : nums) {\n    if (n == 20) {\n        nums.remove(Integer.valueOf(20));\n    }\n}\n// throws ConcurrentModificationException'),
  H.p('A for-each loop over an ArrayList is built on an internal mechanism, an iterator, that tracks its position by comparing the ArrayList\'s modification count against a value it recorded when the loop started. Calling <code>nums.remove(...)</code> from inside the loop body changes that modification count, and the very next time the loop asks the iterator for the following element, the mismatch is detected and Java throws a <code>ConcurrentModificationException</code> rather than silently producing a wrong answer. That exception is not random. It is the ArrayList actively protecting itself from being read and changed inside the same pass, and it fires reliably enough that a student who sees the exception name on an exam question can usually identify the cause, a removal inside a for-each loop, without even reading the surrounding code closely.'),
  H.p('Switching to a regular indexed for loop does not throw that exception, but it introduces a quieter bug instead, one that produces a wrong answer with no error message at all.'),
  H.code('ArrayList<Integer> nums = new ArrayList<Integer>();\nnums.add(10);\nnums.add(20);\nnums.add(30);\nnums.add(40);\n\nfor (int i = 0; i < nums.size(); i++) {\n    if (nums.get(i) == 20) {\n        nums.remove(i);\n    }\n}\nSystem.out.println(nums);\n// prints [10, 30, 40], which happens to look right here'),
  H.p('That example happens to produce the correct-looking result, which is exactly what makes the pattern dangerous rather than safe. Trace it index by index to see why. The ArrayList starts as <code>[10, 20, 30, 40]</code>. At <code>i = 0</code>, <code>nums.get(0)</code> is 10, no match. At <code>i = 1</code>, <code>nums.get(1)</code> is 20, a match, so <code>nums.remove(1)</code> runs. Removing index 1 shifts every later element down by one position to close the gap: the ArrayList is now <code>[10, 30, 40]</code>, and the value that used to sit at index 2, 30, now sits at index 1. The loop\'s counter, however, does not know a shift happened. It increments to <code>i = 2</code> next, which now points at 40, and the value 30 that just slid into index 1 gets skipped entirely, never checked at all.'),
  H.code('ArrayList<Integer> nums = new ArrayList<Integer>();\nnums.add(10);\nnums.add(20);\nnums.add(20);\nnums.add(40);\n\nfor (int i = 0; i < nums.size(); i++) {\n    if (nums.get(i) == 20) {\n        nums.remove(i);\n    }\n}\nSystem.out.println(nums);\n// prints [10, 20, 40], not [10, 40] as intended'),
  H.p('With two consecutive matching values this time, the skip becomes visible in the output itself. At <code>i = 1</code>, the first 20 is removed, and the list shifts to <code>[10, 20, 40]</code>, with the second 20 now sitting at index 1, the position that was just vacated. The loop increments to <code>i = 2</code>, which points at 40, and the second 20, now resting at index 1, is never examined again. The printed result keeps one 20 that the code was clearly trying to remove, with no exception, no warning, and no indication anything went wrong short of checking the output by hand.'),
  H.box('key', 'The fix that actually works: step the index back', '<p>The reliable fix for a regular indexed for loop is decrementing the loop counter by one on the same pass a removal happens, so the next increment lands back on the position that just slid into the removed slot rather than skipping past it: nums.remove(i); i--; immediately after the removal. For a for-each loop, the safe fix is different: use an Iterator directly and call iterator.remove() instead of nums.remove(), since Iterator exposes a remove method built specifically to keep its internal tracking in sync with the removal it just performed.</p>'),
  H.p('The two failure modes are worth holding apart clearly, because an exam question can present either one and expects a different diagnosis for each. A for-each loop that removes from the ArrayList it is iterating over throws <code>ConcurrentModificationException</code>, an immediate and visible failure. A regular indexed for loop that removes by index without adjusting the counter afterward produces a silently wrong result, an element skipped past rather than checked, with the program continuing to run normally otherwise. Both come from the identical root cause, removing from a collection while stepping through it by position, and recognizing that shared cause is what actually transfers to an unfamiliar Unit 4 free response question rather than memorizing two unrelated symptoms.'),

  H.h2('Two practice questions in the exam format'),
  H.p('The first question is a scenario-to-structure decision, the exact judgment call Unit 4 tests before any code gets written. The second traces a removal mid-loop step by step, the way a free response rubric checks it. Predict the answer before opening either explanation.'),
  H.mcq({
    n: 1,
    stem: 'A program needs to track the usernames of students currently logged in to a tutoring session. Students can log in and log out at any point while the program runs, and the exact number of students logged in at any moment is not known in advance. Which structure is the better fit for storing the usernames, and why?',
    options: [
      'A fixed-size array, because usernames are text data and array handles String values natively.',
      'An ArrayList, because the count of logged-in students changes at runtime and ArrayList supports adding and removing elements after creation.',
      'A fixed-size array, because array access by index is faster than ArrayList method calls.',
      'Either structure works equally well here, since both can store a list of String values.',
    ],
    correct: 1,
    why: 'The scenario states directly that students log in and out at any point while the program runs, which means the count of usernames stored changes after the program starts, not just before it. That single fact is the deciding one: an array is fixed in size the moment it is created and has no way to add or remove elements afterward, so a program using an array here would have to rebuild a new, differently sized array every time a student logged in or out, which is exactly the workaround ArrayList exists to avoid. ArrayList supports add and remove directly, which matches the scenario\'s actual requirement. The two incorrect answers about String support and access speed are both true statements in isolation, arrays do hold String values natively and array indexing is direct, but neither one is the deciding factor in this specific scenario, since the scenario\'s central fact is a changing count, not a data type or a performance constraint.',
  }),
  H.mcq({
    n: 2,
    stem: 'Consider the code segment below. What is printed?',
    codeText: 'ArrayList<Integer> vals = new ArrayList<Integer>();\nvals.add(5);\nvals.add(15);\nvals.add(15);\nvals.add(25);\n\nfor (int i = 0; i < vals.size(); i++) {\n    if (vals.get(i) == 15) {\n        vals.remove(i);\n    }\n}\nSystem.out.println(vals);',
    options: ['[5, 25]', '[5, 15, 25]', '[5, 15]', 'The code throws an exception.'],
    correct: 1,
    why: 'The ArrayList starts as [5, 15, 15, 25]. At i = 0, vals.get(0) is 5, no match. At i = 1, vals.get(1) is 15, a match, so vals.remove(1) runs, and the list shifts to [5, 15, 25], with the second 15 sliding down into index 1, the exact slot that was just vacated. The loop does not know a shift happened, so it increments normally to i = 2, which now points at 25, not the 15 that just moved into index 1. That second 15 is never checked again, so it survives the loop entirely. i = 3 is out of bounds for a list that now has three elements, so the loop ends. The printed result is [5, 15, 25], keeping one of the two original 15s, which is the silently wrong output this exact pattern produces. No exception is thrown here, since this is a regular indexed for loop rather than a for-each loop, and removing by index in a regular for loop does not trigger ConcurrentModificationException the way removing during a for-each does.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Can an array be resized after it is created in AP CSA?', a: 'No. An array\'s size is fixed permanently at the moment it is created with new, and Java provides no method to grow or shrink it afterward. A program that needs a different size has to create an entirely new array and copy over any values it still needs, which is exactly the kind of manual work ArrayList exists to avoid.' },
    { q: 'Why does ArrayList need Integer instead of int?', a: 'ArrayList is built on Java generics, and a generic type parameter must be a reference type, meaning a class, not a primitive type. int is a primitive, not a class, so it cannot fill in the angle brackets directly. Integer is a wrapper class built specifically to hold an int value inside an object, which makes it a legal reference type for that purpose, and Java converts between int and Integer automatically through autoboxing and unboxing.' },
    { q: 'Why does removing from an ArrayList during a for-each loop cause an error?', a: 'A for-each loop over an ArrayList uses an internal iterator that tracks the list\'s modification count from the moment the loop starts. Removing an element from inside the loop changes that count, and the next time the loop requests the following element, the mismatch is detected and Java throws a ConcurrentModificationException rather than continuing with a collection that changed size mid-pass.' },
    { q: 'Is it ever safe to remove an element while looping through an ArrayList?', a: 'Yes, with the right technique. In a regular indexed for loop, decrementing the loop counter by one immediately after a removal keeps the index pointing at the correct next element instead of skipping over one. In a for-each style traversal, using an Iterator directly and calling its own remove method, rather than calling remove on the ArrayList itself, keeps the iterator\'s internal tracking in sync and avoids the exception entirely.' },
  ]),

  H.cta({
    heading: 'Practice array and ArrayList until the choice is automatic',
    body: 'Daily practice built around exactly this kind of structure decision and removal-during-iteration tracing, plus a full archive of free response questions that test Data Collections the way the real exam does.',
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
  H.updatedNote('This is a concept guide, reviewed against the current AP CSA Course and Exam Description. Last reviewed September 29, 2026.'),
]);

module.exports = { meta, body };
