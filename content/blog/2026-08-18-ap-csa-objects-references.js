'use strict';
// Evergreen concept post: AP CSA. Unit 1 teaches object syntax without ever
// naming the reference model underneath it, which is the single biggest
// source of downstream confusion in the course. No news peg, no stats needed.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'What AP CSA objects and methods actually store in a variable',
  'References versus primitives: the split Unit 1 skips',
  'Why == breaks the moment you meet your first object',
  'Aliasing: two variables, one object, one very confused student',
  'Passing an object to a method: what actually gets copied',
];

const meta = {
  title: 'AP CSA Objects and Methods: What Unit 1 Never Actually Explains',
  handle: 'ap-csa-objects-references-explained',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'ap csa objects and methods',
  publishOn: '2026-08-19',
  seoTitle: 'AP CSA Objects and Methods Explained',
  seoDescription: 'AP CSA objects and methods hide one idea Unit 1 never states directly: a variable holds a reference, not the object. Here is the fix, with traced examples.',
  summary: 'AP CSA teaches object syntax in Unit 1 without ever naming the reference model underneath it. This is the mental model that fixes aliasing, equals, and pass by value confusion for the rest of the course.',
  tags: ['AP CSA', 'Unit 1', 'Objects', 'References', 'Study Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('A student writes <code>Dog a = new Dog("Rex");</code>, then <code>Dog b = a;</code>, then changes something through <code>b</code>. Somehow <code>a</code> changed too. AP CSA objects and methods get taught in Unit 1 without ever stating the one rule that would have prevented the confusion: a variable holding an object does not hold the object.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'August 18, 2026', updated: 'August 18, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.p('Here is the scene, and if you have taken the first few weeks of AP CSA it will look familiar. A student builds a small class, say a <code>Dog</code> with a <code>name</code> field and a <code>bark()</code> method. They write two lines:'),
  H.code('Dog a = new Dog("Rex");\nDog b = a;\nb.setName("Buddy");\nSystem.out.println(a.getName());'),
  H.p('They expect <code>a.getName()</code> to print "Rex", because <code>b</code> was the one that got renamed. It prints "Buddy". The student did not misread the code. Their model of what a variable is was wrong, and nothing before this point in the course had a reason to correct it, because primitives never expose the difference. This piece is the explanation Unit 1 usually skips: what a variable actually holds when it holds an object, and the four places that gap shows up on the exam.'),

  H.h2(SECTIONS[0]),
  H.p('Picture two boxes on a table. In the first setup, the box itself contains a value: write 7 inside it, and the box is 7. That is how a primitive variable works. <code>int x = 7;</code> means the memory location named <code>x</code> stores the number 7, directly, with nothing in between.'),
  H.p('Now picture a second setup. The box does not contain the thing you care about. It contains a slip of paper with an address written on it, an arrow pointing across the room to a filing cabinet where the actual object lives, with its fields inside. That slip of paper is a reference. Writing <code>Dog a = new Dog("Rex");</code> does two separate things: <code>new Dog("Rex")</code> builds the filing cabinet entry somewhere in memory and hands back its address, and <code>Dog a =</code> writes that address onto the slip of paper named <code>a</code>. The variable <code>a</code> never holds the dog. It holds directions to the dog.'),
  H.box('key', 'The one sentence to memorize', '<p>A primitive variable IS its value. An object variable POINTS TO its value. Everything in this article is a consequence of that single distinction, and the exam tests the consequence far more often than it tests the definition.</p>'),
  H.p('This is why the box-and-pointer picture matters more than the syntax. If you only memorize that <code>new</code> creates an object, you will get the constructor call right and still misread every line that follows it, because the interesting behavior of an AP CSA object lives in what happens when a second slip of paper gets written with the same address.'),

  H.h2(SECTIONS[1]),
  H.p('The AP CSA Course and Exam Description separates variables into two categories for exactly this reason, and it is worth being precise about which types fall in which bucket. The primitives are <code>int</code>, <code>double</code>, and <code>boolean</code>. Every other type you will meet, including <code>String</code>, arrays, and any class you write yourself, is a reference type.'),
  H.p('Assignment behaves differently across the two categories, and this is the part that trips students who learned the syntax without the model. Assigning one primitive to another copies the value, full stop. After <code>int y = x;</code>, changing <code>x</code> later has no effect on <code>y</code>, because they are two independent boxes that happened to start with the same number. Assigning one object variable to another copies the reference, not the object. After <code>Dog b = a;</code>, there is still only one <code>Dog</code> object in existence. There are now two slips of paper pointing at it.'),
  H.table(
    ['Action', 'Primitive (int, double, boolean)', 'Reference type (String, array, any class)'],
    [
      ['What the variable stores', 'The value itself', 'The address of an object'],
      ['<code>a = b;</code> does', 'Copies the value', 'Copies the address, both variables now point to one object'],
      ['Changing one variable after assignment', 'The other is unaffected', 'Both variables see the change, because there is only one object'],
    ]
  ),
  H.p('Nothing about the syntax warns you which bucket a type is in. That has to be memorized separately, and it is worth doing early, because Unit 1 introduces objects using <code>String</code>, which behaves almost like a primitive in casual use and is exactly the type most likely to teach the wrong lesson.'),

  H.h2(SECTIONS[2]),
  H.p('This is where the reference model stops being an abstraction and starts changing your answers. The <code>==</code> operator, for a reference type, does not ask whether two objects have the same contents. It asks whether two variables hold the identical address, whether the two slips of paper point at the same filing cabinet entry.'),
  H.code('String a = new String("hi");\nString b = new String("hi");\nSystem.out.println(a == b);\nSystem.out.println(a.equals(b));'),
  H.p('The first line prints false. The second prints true. Both strings spell "hi", but <code>new String("hi")</code> was called twice, which built two separate objects at two separate addresses. <code>a</code> and <code>b</code> hold different slips of paper, so <code>==</code> reports what it always reports for objects: are these the same object, not do these look alike. <code>.equals()</code> is a method defined on the object itself, and for <code>String</code> it is written to compare characters rather than addresses, which is why it returns true.'),
  H.box('warn', 'The mistake this causes on the exam', '<p>Students who only worked with primitives before Unit 1 have used <code>==</code> correctly every single time, because for primitives comparing values and comparing storage are the same operation. That habit generalizes badly. On a free response or multiple choice question involving objects, <code>==</code> almost always tests identity, and the question is usually built specifically to produce two objects with equal contents at different addresses, so that a student who reaches for <code>==</code> out of habit gets it wrong.</p>'),
  H.p('The safe rule for AP CSA: use <code>==</code> for primitives and for checking whether a reference is <code>null</code>, and use <code>.equals()</code> whenever you are asking whether two objects represent the same value. If a class does not override <code>.equals()</code>, it falls back to comparing addresses anyway, which is one more reason the identity-versus-content distinction is worth understanding rather than memorizing as a syntax rule.'),

  H.h2(SECTIONS[3]),
  H.p('Aliasing is the name for exactly the situation the opening example showed: two or more variables holding references to the same object. It is not an edge case the exam invented to be tricky. It is the ordinary consequence of what assignment does for reference types, and it happens every time you write <code>b = a;</code> for an object.'),
  H.p('The part that actually causes bugs, in student code and in professional code, is mutation through an alias. If <code>a</code> and <code>b</code> point at the same <code>Dog</code>, then any method call on <code>b</code> that changes the object\'s fields is visible through <code>a</code> too, because there was only ever one object to change. Read the field values, not the variable name, and the confusion mostly disappears.'),
  H.code('Dog a = new Dog("Rex");\nDog b = a;\na.setName("Max");\nb.setName("Buddy");\nSystem.out.println(a.getName());\nSystem.out.println(b.getName());'),
  H.p('Trace it by tracking the object, not the variables. There is one <code>Dog</code>. Its name field is set to "Rex" at construction, then to "Max" through <code>a</code>, then to "Buddy" through <code>b</code>. Both print statements read the same object\'s current field, so both print "Buddy". If a question shows you two variable names, the first move is always to ask whether they were ever set equal to each other, because if they were, treat every method call through either name as a change to one shared object.'),
  H.box('tip', 'How to spot an aliasing question', '<p>Look for a line where an object variable is assigned from another object variable, rather than from <code>new</code>. That single line is the tell. Everything that mutates the object afterward, through either name, lands on the same object, and the question is almost always testing whether you noticed that line.</p>'),

  H.h2(SECTIONS[4]),
  H.p('This is the distinction the exam tests most heavily, and it is also the one most students walk away from Unit 1 with the wrong intuition about, because the correct behavior looks like two contradictory rules until you see why they are actually one rule.'),
  H.p('Java is pass by value, always, with no exception. What that means for an object parameter is specific: the value being passed is the reference itself, the address on the slip of paper, and that address gets copied into the method\'s parameter. The method now holds its own slip of paper with the same address written on it. Two consequences follow, and they look like opposites until you remember there is exactly one object and two independent copies of directions to it.'),
  H.h3('Consequence one: mutating through the parameter is visible to the caller'),
  H.p('Because the method\'s copy of the address points at the same object as the caller\'s variable, any field change made through the parameter changes the one object both variables point at. The caller sees it, because there was never a second object to change.'),
  H.h3('Consequence two: reassigning the parameter is not visible to the caller'),
  H.p('If the method writes a brand new address onto its own slip of paper, that only overwrites the method\'s local copy. The caller\'s slip of paper, sitting in a completely different piece of memory, still has the original address on it. Reassignment inside a method never reaches back out to change what the caller\'s variable points to.'),
  H.code('public static void rename(Dog d) {\n    d.setName("Max");\n}\n\npublic static void replace(Dog d) {\n    d = new Dog("Ghost");\n    d.setName("Max");\n}\n\npublic static void main(String[] args) {\n    Dog a = new Dog("Rex");\n    rename(a);\n    System.out.println(a.getName());\n\n    Dog c = new Dog("Rex");\n    replace(c);\n    System.out.println(c.getName());\n}'),
  H.p('Trace <code>rename(a)</code> first. Inside the method, the parameter <code>d</code> is a copy of the address stored in <code>a</code>. Both point at the same <code>Dog</code>. Calling <code>d.setName("Max")</code> mutates that object\'s field. Back in <code>main</code>, <code>a</code> still points at the same object, whose name field now reads "Max". The print statement outputs "Max".'),
  H.p('Now trace <code>replace(c)</code>. Inside the method, the parameter <code>d</code> starts as a copy of the address stored in <code>c</code>, pointing at the original "Rex" dog. The line <code>d = new Dog("Ghost")</code> builds an entirely new object and writes its address onto the local slip of paper named <code>d</code>. That overwrites only the method\'s copy. The variable <code>c</code>, back in <code>main</code>, was never touched, and it still holds the address of the original "Rex" object. Calling <code>d.setName("Max")</code> renames the new "Ghost" object that <code>c</code> can never see. The print statement outputs "Rex".'),
  H.box('key', 'The reusable version of this rule', '<p>A method can change the object a parameter points to, through a setter or any mutating method. A method can never make the caller\'s own variable point somewhere else. Object identity travels into a method. Reassignment never travels back out. This is worth memorizing word for word, because it resolves more free response confusion than any other single sentence in Unit 1.</p>'),
  H.p('This exact pattern shows up constantly in free response code, especially in methods that are supposed to modify an object passed as an argument. If a rubric expects a method to mutate the object in place and a student instead reassigns the local parameter, the change quietly disappears the moment the method returns, and partial credit is the best outcome that produces. Our <a href="/pages/ap-csa-frq-archive">FRQ archive</a> has several past free response questions built around exactly this trap, worked all the way through.'),

  H.h2('Two practice questions in the exam format'),
  H.p('Both are the tracing style the multiple choice section is built on. Predict the output before you open the answer.'),
  H.mcq({
    n: 1,
    stem: 'What is printed by the following code segment?',
    codeText: 'public class Box {\n    private int value;\n    public Box(int value) { this.value = value; }\n    public void setValue(int v) { value = v; }\n    public int getValue() { return value; }\n}\n\nBox one = new Box(5);\nBox two = one;\ntwo.setValue(9);\none = new Box(1);\nSystem.out.println(one.getValue() + " " + two.getValue());',
    options: ['1 9', '9 9', '1 1', '5 9'],
    correct: 0,
    why: 'Trace the objects, not the variable names. After the first two lines, one and two are two references to the same Box holding 5. Calling two.setValue(9) mutates that shared object, so its value is now 9, and both one and two still point at it at this stage. The next line, one = new Box(1), does not touch that object at all. It builds a completely separate Box and writes its address onto the variable one, leaving two still pointing at the original object. From that line forward, one and two are aliases of nothing, each pointing at a different object. one.getValue() reads the new object, which is 1. two.getValue() reads the original object, which is 9. The printed line is "1 9". The wrong answer "9 9" is what you get if you track the variable names as if they stayed linked forever instead of tracking which object each one currently points to.',
  }),
  H.mcq({
    n: 2,
    stem: 'Consider the method below, intended to double every element of an array that is passed to it. After the call shown, what is printed?',
    codeText: 'public static void doubleAll(int[] arr) {\n    arr = new int[arr.length];\n    for (int i = 0; i < arr.length; i++) {\n        arr[i] = 0;\n    }\n}\n\nint[] nums = {2, 4, 6};\ndoubleAll(nums);\nSystem.out.println(nums[0] + " " + nums[1] + " " + nums[2]);',
    options: ['2 4 6', '0 0 0', '4 8 12', '0 4 6'],
    correct: 0,
    why: 'An array is a reference type in Java, so the same rule applies as for any object. The parameter arr starts as a copy of the address stored in nums, both pointing at the same three element array. The line arr = new int[arr.length] does not touch that array at all. It builds a brand new array of zeros and writes its address onto the local parameter arr, which only rebinds the method\'s own copy of the reference. The caller\'s variable nums was never reassigned and still points at the original array, which was never modified because every mutating line in the method operated on the new array instead. The original values 2, 4, 6 are untouched, and the printed line is "2 4 6". This is precisely why in place mutation of an array parameter has to change elements of the array the caller passed in, not swap out the reference for a new array, and it is one of the most common ways a free response solution silently fails to do what it was supposed to do.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Does a variable ever actually hold an object in Java?', a: 'No, not for a reference type. An object variable holds an address pointing to where the object lives in memory. Only primitive variables (int, double, boolean) hold their value directly. This is true for every class type, every array, and String, even though String is used so often it can feel like a primitive.' },
    { q: 'Why does == give the wrong answer for strings sometimes?', a: 'For reference types, == compares whether two variables point at the same object in memory, not whether the objects have equal contents. Two String objects built separately with the same characters are still two different objects at two different addresses, so == returns false even though the text is identical. Use .equals() to compare contents.' },
    { q: 'What is aliasing in AP CSA?', a: 'Aliasing is when two or more variables hold references to the same object. Because there is only one underlying object, a mutation made through any one of those variables is visible through all of them, since they are all pointing at the same data rather than at separate copies.' },
    { q: 'If I pass an object to a method, can the method change it permanently?', a: 'The method can permanently change the object\'s fields through the reference it was given, because that reference points at the same object the caller has. What the method cannot do is make the caller\'s own variable point at a different object. Reassigning the parameter inside the method only changes the method\'s local copy of the reference.' },
    { q: 'Is this reference model actually tested on the AP CSA exam, or is it just theory?', a: 'It is tested directly and often, in both the multiple choice section and free response. Questions built around aliasing, around == versus .equals(), and around a method that reassigns a parameter instead of mutating through it are a recurring pattern across released exams, precisely because the reference model is easy to skip while learning the syntax and expensive to be wrong about under time pressure.' },
  ]),

  H.cta({
    heading: 'Get the reference model into your fingers, not just your notes',
    body: 'Daily tracing practice built around exactly this kind of object behavior, plus a score calculator built to the current four unit exam.',
    links: [
      { href: '/pages/ap-csa-qotd-hub', text: 'Daily practice' },
      { href: '/pages/ap-csa-score-calculator', text: 'Score calculator', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('This is a concept guide, reviewed against the current AP CSA Course and Exam Description. Last reviewed August 18, 2026.'),
]);

module.exports = { meta, body };
