'use strict';
// Evergreen concept post: AP CSA Unit 3 (Class Creation). Students arrive at
// this unit already comfortable calling methods on objects someone else
// built, and the jump to writing a class from nothing is where a real
// fraction of them stall. The specific trap this post targets is narrow on
// purpose: forgetting this when a constructor parameter shadows a field,
// which is the single most common Unit 3 free response deduction. No news
// peg, no stats needed.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'AP CSA class creation: what a class actually needs before anything else',
  'Building the Book class, one piece at a time',
  'Accessor and mutator methods: why bother when the field is right there',
  'The this keyword: when it is required and when it is just style',
];

const meta = {
  title: 'AP CSA Class Creation: Constructors, Fields and this',
  handle: 'ap-csa-class-creation-constructors-fields-this',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'ap csa class creation',
  publishOn: '2026-09-23',
  seoTitle: 'AP CSA Class Creation: Constructors, Fields and this',
  seoDescription: 'AP CSA class creation walked through step by step: instance fields, constructors, accessor and mutator methods, and exactly when the this keyword is required.',
  summary: 'AP CSA class creation asks students to do something genuinely new: build a class instead of just using one. This guide builds a Book class from nothing, field by field and method by method, explains why private fields and accessor methods exist even when they feel redundant, and isolates the one situation where the this keyword stops being optional, a constructor parameter that shadows a field name.',
  tags: ['AP CSA', 'Unit 3', 'Class Creation', 'Study Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('AP CSA class creation is Unit 3 of the current course, and it asks for something every earlier unit avoided: a class someone else already wrote. Every AP CSA class before this point hands a student that finished class instead. Unit 3, Class Creation, is where that stops. The student writes the fields, the constructor, and the methods themselves, and the exam tests exactly the seams in that process: which fields to make private, what a constructor is actually supposed to do, why a getter and a setter earn their keep even though a field looks reachable on its own, and the single most common deduction on Unit 3 free response questions, a constructor parameter that quietly shadows a field and needs the <code>this</code> keyword to sort itself out. This guide builds one small class, a <code>Book</code>, from a completely empty shell up through a working constructor and a full set of accessor and mutator methods, explaining each addition before moving to the next.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 22, 2026', updated: 'September 22, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.p('Class creation is the first AP CSA unit that asks a student to design something rather than operate something. Earlier work calls methods on <code>String</code> objects and <code>ArrayList</code> objects that Java already provides, and later work builds selection and iteration logic inside methods that already exist. Writing a class from scratch sits in between those two skills and depends on both: the fields and constructor come first, and everything that reads or changes them afterward is exactly the kind of method-writing already practiced in earlier units, just now aimed at data the student defined.'),
  H.p('The path through this guide follows the order a class is actually built in, not the order a textbook lists its parts. Fields come first because nothing else in a class means anything without them. The constructor comes second because its entire job is putting values into those fields. Accessor and mutator methods come third because they read and change what the constructor set up. The <code>this</code> keyword gets its own section at the end because it only becomes necessary once a constructor and a field can plausibly have the same name, which cannot happen until both of those pieces already exist.'),

  H.h2(SECTIONS[0]),
  H.p('An instance field is a variable declared inside a class but outside any method, and it belongs to the object rather than to any single method call. Every <code>Book</code> object that gets created holds its own separate copy of each field, the same way every <code>String</code> holds its own separate characters. A field declared inside a method, by contrast, is a local variable, and it disappears the moment that method call finishes. The distinction matters immediately: a constructor cannot read back a value in a later method call unless that value was stored in a field, not just used and discarded as a local variable inside the constructor itself.'),
  H.code('public class Book {\n    private String title;\n    private String author;\n    private int pages;\n}'),
  H.p('That is a complete, compilable class, and it is worth pausing on before adding anything else. It has three fields and nothing else, no constructor, no methods. Every <code>Book</code> object built from it right now would get default values automatically: <code>null</code> for the two <code>String</code> fields, since <code>String</code> is a reference type, and <code>0</code> for the <code>int</code> field, since numeric primitives default to zero. Nothing has gone wrong here, but nothing useful has happened yet either, and that gap between compiling and being useful is exactly what the constructor fixes next.'),
  H.box('key', 'Why private by convention', '<p>Marking a field private restricts direct access to code inside the same class, which forces any other class that wants to read or change a Book to go through a method rather than reaching in and touching the field directly. That restriction is not paranoia. It means the Book class controls its own data completely: if the rule for a valid page count ever needs to change, there is exactly one place to enforce it, a method inside Book, rather than every piece of code anywhere in the program that happens to touch the field.</p>'),
  H.p('This is also the point where naming convention starts to matter for reasons that will matter again in the very next section. Field names in this guide stay short and plain, <code>title</code>, <code>author</code>, <code>pages</code>, on purpose. A constructor parameter that needs to set each of these fields is going to want a name too, and the natural, readable name for that parameter is the same word. Whether that reuse causes a problem or not is precisely the question the rest of this guide answers.'),

  H.h2(SECTIONS[1]),
  H.p('A constructor is a special method that runs exactly once, at the moment an object is created with <code>new</code>, and its entire purpose is putting the new object into a valid starting state. Java gives every class a default, no-argument constructor automatically as long as no constructor is written by hand, which is why the bare three-field version of <code>Book</code> above still compiled and still let a program call <code>new Book()</code>. The moment even one constructor is written explicitly, though, that free default disappears, and only the constructors actually written remain available.'),
  H.p('Add a parameterized constructor to <code>Book</code>, one that takes the starting title, author, and page count as arguments and assigns each one to its matching field.'),
  H.code('public class Book {\n    private String title;\n    private String author;\n    private int pages;\n\n    public Book(String title, String author, int pages) {\n        this.title = title;\n        this.author = author;\n        this.pages = pages;\n    }\n}'),
  H.p('Three things changed at once here, and each one earns a moment of attention. The constructor is named identically to the class, <code>Book</code>, with no return type at all, not even <code>void</code>, which is how Java recognizes a constructor rather than an ordinary method. The parameter list, <code>String title, String author, int pages</code>, exists only for the duration of this one constructor call and holds whatever values the caller passes in through <code>new Book(...)</code>. And the three assignment lines each use <code>this.fieldName</code> on the left side rather than just <code>fieldName</code>, which is the detail the next two sections exist to explain in full, because it is not decoration here. It is required, and the reason why is worth understanding precisely rather than copying by habit.'),
  H.p('With this constructor in place, creating a book now sets it up completely in a single line rather than leaving every field at a default value that has to be fixed afterward.'),
  H.code('Book hatchet = new Book("Hatchet", "Gary Paulsen", 195);'),
  H.p('That single call runs the constructor body once, with <code>title</code> bound to <code>"Hatchet"</code>, <code>author</code> bound to <code>"Gary Paulsen"</code>, and <code>pages</code> bound to <code>195</code> for the duration of that call only. The three assignment statements copy those three parameter values into the object\'s three fields, and once the constructor finishes, <code>hatchet</code> refers to a fully initialized <code>Book</code> object whose fields hold exactly those values, permanently, until something explicitly changes them later.'),
  H.p('It is worth writing out what a no-argument constructor would look like on the same class too, since both forms show up constantly across AP CSA free response questions and a student needs to recognize either one instantly.'),
  H.code('public Book() {\n    title = "Untitled";\n    author = "Unknown";\n    pages = 0;\n}'),
  H.p('A class is allowed to define both constructors side by side, a no-argument version and a parameterized version, as long as their parameter lists are different, which is a form of overloading. Java picks the correct one automatically at each call site based on what arguments are actually passed: <code>new Book()</code> calls the no-argument version above, while <code>new Book("Hatchet", "Gary Paulsen", 195)</code> calls the three-argument version from before it. Notice that the no-argument version above did not need <code>this</code> at all, since its local variable names, <code>"Untitled"</code>, <code>"Unknown"</code>, and <code>0</code>, are literal values rather than parameters, so there is no name for a field to compete against.'),

  H.h2(SECTIONS[2]),
  H.p('With fields and a constructor in place, <code>Book</code> can already store and hold data correctly. The next step is giving other classes a controlled way to read and change that data, since the fields themselves are private and unreachable from outside the class. An accessor method, commonly called a getter, returns the current value of a field without changing anything. A mutator method, commonly called a setter, changes a field to a new value that gets passed in as an argument.'),
  H.code('public String getTitle() {\n    return title;\n}\n\npublic void setPages(int pages) {\n    this.pages = pages;\n}'),
  H.p('The naming convention is not optional style, it is what the rest of a program, and what an AP exam question, expects to find: a getter for a field named <code>pages</code> is named <code>getPages</code>, returns the field\'s type, <code>int</code>, and takes no arguments. A setter for the same field is named <code>setPages</code>, returns nothing, <code>void</code>, and takes exactly one argument of the field\'s type. Both methods appear on nearly every hand-written class in the course, and both follow this pattern closely enough that recognizing the pattern is often faster than reading either method\'s body line by line.'),
  H.p('This is also where a fair beginner question deserves a direct answer rather than a dodge: if <code>getTitle()</code> just returns <code>title</code>, and <code>title</code> is sitting right there as a field, why bother writing a whole method around it instead of making the field public and reading it directly? The honest answer is that a getter alone genuinely does look redundant, and for a field with no rules attached to it, it very nearly is. The value of the pattern shows up the moment a setter needs to do more than a bare assignment.'),
  H.code('public void setPages(int pages) {\n    if (pages > 0) {\n        this.pages = pages;\n    }\n}'),
  H.p('A public field cannot enforce that rule. Any code anywhere in the program could set <code>pages</code> directly to a negative number, and the <code>Book</code> object would have no way to stop it or even notice. A setter method can check the incoming value before deciding whether to store it, which means the class enforces its own valid states instead of trusting every piece of code that ever touches it to behave correctly. That single line, <code>if (pages &gt; 0)</code>, is the entire justification for the accessor and mutator pattern in one place: control lives inside the class that owns the data, not scattered across every class that happens to use it.'),
  H.box('tip', 'Read every accessor and mutator pair as a contract', '<p>A getter promises to hand back the current value with no side effects. A setter promises to either update the field or, if it chooses to validate first, leave it unchanged when the new value fails some check. Reading a class this way, as declared promises about what each method will and will not do, is faster than tracing every line by hand and is exactly how an AP CSA free response question expects a student to reason about an unfamiliar class.</p>'),

  H.h2(SECTIONS[3]),
  H.p('Every assignment inside the parameterized constructor above used the form <code>this.title = title;</code> rather than the shorter <code>title = title;</code>. That extra <code>this.</code> is not there for clarity alone. It is required, and skipping it silently breaks the constructor without producing a compiler error, which is exactly what makes this the highest-value trap in the whole unit.'),
  H.p('The reason comes down to a rule called shadowing. Inside the constructor\'s body, the name <code>title</code> refers to two different things at the same time: the constructor\'s own parameter, and the object\'s field. Java resolves a bare name by looking at the closest matching declaration first, and a parameter is always closer than a field, so a bare <code>title</code> inside that constructor always means the parameter, never the field. The parameter is said to shadow the field. Writing <code>title = title;</code> under those conditions assigns the parameter\'s value right back to itself and never touches the field at all.'),
  H.code('// BROKEN: parameter shadows the field, field never gets set\npublic Book(String title, String author, int pages) {\n    title = title;\n    author = author;\n    pages = pages;\n}\n\nBook b = new Book("Hatchet", "Gary Paulsen", 195);\nSystem.out.println(b.getTitle());\n// prints: null'),
  H.p('That code compiles cleanly, produces no warning by default, and runs without throwing anything. It simply does nothing useful. Every field keeps its default value, <code>null</code> for the two <code>String</code> fields and <code>0</code> for <code>pages</code>, because each assignment statement quietly reassigned a local parameter to itself instead of reaching the field it was named after. This is precisely why the mistake shows up so often on free response scoring: the code looks correct on a fast read, it compiles, and the bug only becomes visible once a getter is called afterward and returns a default value instead of the value that was supposedly just set. Writing out a constructor call the same way you would trace a loop, one statement at a time with the current value of every field noted alongside it, is the fastest way to catch this before it costs points. The <a href="/blogs/ap-csa/ap-csa-variable-table-tracing-method">variable table tracing method</a> works exactly as well on constructor bodies as it does on loops.'),
  H.p('<code>this</code> fixes it by giving the field an unambiguous name inside the constructor. <code>this</code> refers to the object currently being constructed, so <code>this.title</code> can only mean the field, never the parameter, no matter what the parameter happens to be named.'),
  H.code('// FIXED: this.title is unambiguously the field\npublic Book(String title, String author, int pages) {\n    this.title = title;\n    this.author = author;\n    this.pages = pages;\n}\n\nBook b = new Book("Hatchet", "Gary Paulsen", 195);\nSystem.out.println(b.getTitle());\n// prints: Hatchet'),
  H.p('Reading that line left to right, <code>this.title = title;</code>, the left side names the field on the object being built, and the right side names the parameter holding the value that was just passed in through <code>new Book(...)</code>. The assignment copies the parameter\'s value into the field, which is exactly what the constructor is supposed to do, and now <code>getTitle()</code> has a real value to return instead of the type\'s default. This is also a good moment to remember that <code>title</code> and <code>author</code> are reference types, not primitives, so what actually gets copied into the field is the reference itself rather than a fresh independent copy of the characters, the same reference behavior covered in more depth in <a href="/blogs/ap-csa/ap-csa-objects-references-explained">this guide to AP CSA objects and references</a>.'),
  H.box('warn', 'The exact situation that requires this', '<p>this is required only when a name inside a method or constructor would otherwise be ambiguous between a local variable or parameter and a field, which happens specifically when both share the same name. A parameter named title next to a field named title is the textbook case. Give the parameter a different name entirely, such as newTitle, and title inside the constructor body unambiguously means the field again, with no this needed at all, because there is no longer a closer-scoped name competing for it.</p>'),
  H.p('That last point is worth expanding, because it is exactly why <code>this</code> is required in some places and purely stylistic in others, and mixing the two up is common. Inside a getter such as <code>getTitle()</code>, there is no parameter at all, so a bare <code>title</code> can only ever mean the field, and <code>this.title</code> would refer to the identical thing. Writing <code>this.title</code> there is legal, some style guides even encourage it for consistency across every method in a class, but it changes nothing about what the code does. The parameterized constructor above is the opposite case: without <code>this</code>, the field is genuinely unreachable inside that method, and the code compiles into something that quietly does the wrong thing.'),
  H.table(
    ['Situation', 'Is this required?', 'Why'],
    [
      ['Constructor parameter shares a field\'s name', 'Yes', 'The parameter shadows the field. A bare name resolves to the parameter, so the field can only be reached through this.fieldName.'],
      ['Setter parameter shares a field\'s name', 'Yes', 'Same shadowing rule as the constructor. setPages(int pages) needs this.pages = pages; for the same reason.'],
      ['Getter method, no parameters at all', 'No, stylistic only', 'Nothing shadows the field, so a bare field name and this.fieldName refer to the identical thing.'],
      ['Constructor parameter given a distinct name, like newTitle', 'No, stylistic only', 'No name collision exists, so the field name alone is already unambiguous inside the method.'],
    ]
  ),
  H.p('The pattern to internalize is narrower than "always use this in a constructor," which is a rule that happens to work but obscures the actual mechanism. The precise rule is that <code>this</code> is required exactly when a local name, almost always a parameter, would otherwise shadow a field of the identical name, which in practice means nearly every constructor and setter that names its parameters after the fields they set, which is itself the overwhelmingly common style. Recognizing shadowing on sight, rather than pattern-matching on which kind of method is being read, is what actually transfers to an unfamiliar class on exam day.'),

  H.h2('Two practice questions in the exam format'),
  H.p('The first question isolates exactly when this is required rather than just legal. The second traces what a constructor call actually initializes, field by field, the way a free response rubric checks it. Predict the answer before opening either explanation.'),
  H.mcq({
    n: 1,
    stem: 'Consider the class below. Which change, made by itself, would make the this keyword necessary on the line that sets width inside the constructor?',
    codeText: 'public class Rectangle {\n    private int width;\n    private int height;\n\n    public Rectangle(int w, int h) {\n        width = w;\n        height = h;\n    }\n}',
    options: [
      'Renaming the constructor parameter w to width.',
      'Renaming the field width to rectWidth instead.',
      'Adding a getter method named getWidth.',
      'Marking the field width as public instead of private.',
    ],
    correct: 0,
    why: 'this becomes necessary only when a name used inside the constructor is ambiguous between a parameter and a field, which requires both to share the exact same name. Right now the parameter is w and the field is width, two different names, so width = w; already unambiguously assigns the field. Renaming the parameter from w to width creates the collision directly: the constructor body would then contain a parameter named width and a field named width, and width = width; inside that body would assign the parameter to itself, never touching the field, exactly the shadowing trap this guide walks through with the Book class. None of the other three changes touch naming at all. A getter, a field rename to a different name, or a visibility change do not create or remove any shadowing, so none of them affect whether this is required on that line.',
  }),
  H.mcq({
    n: 2,
    stem: 'Given the class and the code segment below, what does b.getPages() return?',
    codeText: 'public class Book {\n    private String title;\n    private int pages;\n\n    public Book(String title, int pages) {\n        this.title = title;\n        this.pages = pages;\n    }\n\n    public int getPages() {\n        return pages;\n    }\n}\n\nBook b = new Book("Hatchet", 195);\nb = new Book("Holes", 233);\nSystem.out.println(b.getPages());',
    options: ['0', '195', '233', 'The code does not compile.'],
    correct: 2,
    why: 'The first line, Book b = new Book("Hatchet", 195);, constructs one Book object with pages set to 195 and stores a reference to it in b. The second line, b = new Book("Holes", 233);, constructs an entirely separate second Book object, this time with pages set to 233, and reassigns b to refer to that new object instead. The first object, the one holding 195, still exists in the sense that the constructor ran and initialized it correctly, but nothing in the program refers to it anymore once b is reassigned, so it becomes unreachable. b.getPages() reads pages from whatever object b currently refers to at the moment the call runs, which is the second object, so it returns 233. A student who answers 195 is tracking the first constructor call correctly but missing that the reassignment on the second line replaced what b points to entirely, rather than updating the first object in place.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What is the difference between a field and a local variable in AP CSA?', a: 'A field is declared inside a class but outside any method, and it belongs to the object, keeping its value between separate method calls on that same object. A local variable, including a constructor or method parameter, is declared inside a method and disappears the moment that method call finishes. A constructor has to copy a parameter value into a field if that value needs to be available later, since the parameter itself will not survive past the constructor call.' },
    { q: 'Do I always need a no-argument constructor?', a: 'No. Java only provides a free no-argument constructor automatically when a class defines no constructors of its own at all. Once any constructor is written by hand, whether it takes arguments or not, that automatic default disappears, and only the constructors actually written remain callable. Many classes only ever need the parameterized version.' },
    { q: 'Is this required in every constructor?', a: 'No, only when a parameter name would otherwise shadow a field of the identical name, which happens to be extremely common style but is not universal. A constructor whose parameters are named distinctly from the fields they set, such as newTitle instead of title, has no shadowing to resolve and does not require this at all, though writing it anyway is legal and harmless.' },
    { q: 'Why do getters and setters matter if a field could just be made public instead?', a: 'A public field can be read or overwritten by any code anywhere in the program with no chance for the class to check or reject an invalid value. A setter method can validate an incoming value before deciding whether to store it, which keeps every rule about what counts as a valid value for that field in exactly one place, inside the class that owns the data, rather than scattered across every class that happens to touch it.' },
  ]),

  H.cta({
    heading: 'Practice class creation until this stops being a guess',
    body: 'Daily practice built around exactly this kind of constructor and field tracing, plus a full archive of free response questions that grade object construction the way the real exam does.',
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
  H.updatedNote('This is a concept guide, reviewed against the current AP CSA Course and Exam Description. Last reviewed September 22, 2026.'),
]);

module.exports = { meta, body };
