'use strict';
// Weekly course post: AP CSA. Deep dive on inheritance and polymorphism
// specifically, following up on the broader redesign retrospective. Verified
// against the College Board revisions overview and our own CED guide before
// writing a word of this: the standalone unit is gone AND the specific
// mechanics (extends, super, override, interfaces) are marked not tested on
// the current four-unit exam, not merely de-emphasized. The post is written
// to be honest about that rather than assume the working title's premise.
const H = require('../../lib/blog-house');

const SRC = {
  revisions: {
    source: 'College Board AP Computer Science A course revisions overview',
    url: 'https://apcentral.collegeboard.org/courses/ap-computer-science-a/future-revisions',
    asOf: 'August 2026',
  },
  ced: {
    source: 'College Board AP Computer Science A course and exam description, 2025-26',
    url: null,
    asOf: 'August 2026',
  },
  siteCed: {
    source: 'APCSExamPrep AP CSA CED Explained guide',
    url: '/pages/ap-csa-ced-explained',
    asOf: 'August 2026',
  },
};

const SECTIONS = [
  'AP CSA inheritance today: what actually happened to the old unit',
  'What inheritance is: a Shape superclass and a Circle subclass',
  'The trap that matters: which overridden method actually runs',
  'Why learning it still pays off even though it will not be graded',
];

const meta = {
  title: 'AP CSA Inheritance in 2025-26: What Changed and What Did Not',
  handle: 'ap-csa-inheritance-still-tested',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'ap csa inheritance',
  publishOn: '2026-11-02',
  seoTitle: 'AP CSA Inheritance: What the 2025-26 CED Says',
  seoDescription: 'AP CSA inheritance lost its standalone unit in the 2025-26 redesign. Here is exactly what that means for the exam, and why the concept still matters.',
  summary: 'AP CSA inheritance used to be a full standalone unit. In the current four-unit CED it is gone, and the specific mechanics, extends, super, method overriding, and interfaces, are marked not tested on the redesigned exam rather than merely folded elsewhere. This post verifies that claim against the College Board revisions overview and our own CED guide, then teaches the concept anyway with a worked Shape and Circle example, because understanding it still pays off for anyone continuing past this course.',
  tags: ['AP CSA', 'Inheritance', 'Curriculum', 'Redesign', 'Java'],
  allowedInlineNumbers: ['10-18%', '10 to 18%'],
};

const body = H.article([
  H.dek('AP CSA inheritance used to fill an entire unit of its own. Search for the topic now and you will find conflicting answers about whether it is still tested. This post checks the current source material directly rather than repeating what the last redesign announcement said, and teaches the concept either way, because it still matters even off the exam.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'November 3, 2026', updated: 'November 3, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('Our earlier piece on the broader AP CSA redesign covered the whole shape of the change: what got cut, what got heavier, and what a teacher pacing from the old curriculum needs to unlearn. If you have not read it, the <a href="/blogs/ap-csa/ap-csa-2025-redesign-what-changed">full redesign retrospective</a> is the place to start for the big picture. This post does one thing that piece deliberately left open: it settles, as precisely as the source material allows, exactly what happened to inheritance and polymorphism, because "folded into something else" and "no longer tested at all" are very different claims, and a student preparing for the actual exam needs to know which one is true.'),

  H.h2(SECTIONS[0]),
  H.p('Start with what is not in dispute. The old course and exam description gave inheritance and polymorphism a dedicated, standalone unit, taught as its own block with its own vocabulary and its own slice of the pacing calendar. That unit does not exist in the current four-unit structure. Nothing in the redesigned course and exam description reintroduces it under a different name, and the College Board\'s own revisions overview frames the removal as intentional: aligning the course more closely with introductory college courses and freeing up instructional time for the material that remains.'),
  H.sourceNote(SRC.revisions.source, SRC.revisions.url, SRC.revisions.asOf),
  H.p('The harder question, and the one worth actually checking rather than assuming, is what happened to the specific mechanics underneath that old unit: the <code>extends</code> keyword, subclasses and superclasses, method overriding, the <code>super</code> keyword, and interfaces. It is possible for a unit to disappear while its content quietly resurfaces somewhere else, folded into a Class Creation free response question or hiding inside a Data Collections prompt that hands a student an already-built subclass to work with. That is exactly the more cautious claim our earlier redesign piece made, because at the time it was written, enough exam cycles had not yet produced enough public material to check systematically.'),
  H.p('Checked against the current course and exam description and against our own curriculum guide, the answer is more specific than "folded elsewhere." The mechanics themselves, not just the standalone unit, are marked as content that will not appear on the exam. Subclasses, superclasses, the <code>extends</code> keyword, method overriding, the <code>super</code> keyword, and interfaces are not part of the required, tested content in the current four-unit structure.'),
  H.sourceNote(SRC.siteCed.source, SRC.siteCed.url, SRC.siteCed.asOf),
  H.box('key', 'What this does and does not mean', '<p>Removed from required, tested content is not the same claim as deleted from computer science education. Nothing stops a teacher from covering inheritance anyway, and plenty still do, because the concept matters well beyond this one exam. What changed is the exam contract specifically: a student preparing for the current AP CSA exam does not need to know how to write a subclass, override a method, or call super to be fully ready on test day. That is a narrower, more useful claim than either "inheritance is gone from computer science" or "inheritance secretly still shows up if you look hard enough."</p>'),
  H.p('The current four-unit structure spreads its tested content across Using Objects and Methods, Selection and Iteration, Class Creation, and Data Collections. Class Creation, the unit that absorbed the "write your own class" skills, carries meaningful weight on the exam and is the unit most likely to get confused with inheritance, since both involve writing a class from a blank file. They are not the same skill. Class Creation asks a student to build one class with fields, a constructor, and accessor and mutator methods. Inheritance asks a student to build a second class that extends the first one and reuses or overrides its behavior, and that second step is exactly the part that is no longer part of the tested content.'),
  H.stat('10 to 18%', SRC.ced),
  H.p('is the exam weight the current course and exam description assigns to Class Creation, and every free response question tied to that unit is scoped to writing a single class, not a class hierarchy. If your practice materials show a free response prompt asking a student to extend a superclass or override an inherited method, that prompt was written for the old curriculum, not the current one, and should be treated as a historical artifact rather than a study target.'),

  H.h2(SECTIONS[1]),
  H.p('None of that makes the concept worth skipping entirely, so here is what it actually is, taught the same way the old unit taught it, minus the assumption that it will show up on this particular exam. Inheritance lets one class, called a subclass, reuse the fields and methods of another class, called a superclass, without copying any code. The subclass gets everything the superclass has automatically, and it can add new fields and methods of its own, or override an inherited method to replace the superclass version with different behavior.'),
  H.p('Build a small example the same way the Class Creation guide builds its <code>Book</code> class: one piece at a time. Start with a superclass, <code>Shape</code>, that every more specific shape will extend.'),
  H.code('public class Shape {\n    private String name;\n\n    public Shape(String name) {\n        this.name = name;\n    }\n\n    public String getName() {\n        return name;\n    }\n\n    public double area() {\n        return 0.0;\n    }\n}'),
  H.p('That is a complete class on its own, and it happens to make a fairly weak claim about area: every plain <code>Shape</code> reports an area of zero, because a shape with no more specific description does not have enough information to compute a real one. That weak default is the whole point. It exists so a more specific subclass has something concrete to override.'),
  H.p('Now write <code>Circle</code>, a subclass that extends <code>Shape</code> using the <code>extends</code> keyword, adds a field that <code>Shape</code> does not have, and overrides <code>area()</code> with a real formula.'),
  H.code('public class Circle extends Shape {\n    private double radius;\n\n    public Circle(String name, double radius) {\n        super(name);\n        this.radius = radius;\n    }\n\n    @Override\n    public double area() {\n        return Math.PI * radius * radius;\n    }\n}'),
  H.p('Three things are happening in that short class, and each one is worth naming precisely. <code>extends Shape</code> declares the inheritance relationship: every <code>Circle</code> is a <code>Shape</code> plus whatever <code>Circle</code> adds on top. <code>super(name)</code>, on the very first line of the constructor, calls the superclass\'s own constructor to initialize the part of the object that <code>Shape</code> is responsible for, the <code>name</code> field, before <code>Circle</code> initializes the part it is responsible for, the <code>radius</code> field. And the <code>area()</code> method is overridden: it has the exact same method signature as the version in <code>Shape</code>, but a completely different body, one that actually uses <code>radius</code> instead of returning a placeholder.'),
  H.box('tip', 'What a subclass gets for free', '<p>A Circle object can call getName() even though Circle never wrote that method itself. It inherited it, unchanged, from Shape. Inheritance is not only about the methods a subclass overrides. It is just as much about everything the subclass does not have to rewrite, which is the entire efficiency argument for using it in the first place.</p>'),

  H.h2(SECTIONS[2]),
  H.p('The single most common misunderstanding about overriding is not about the syntax. It is about which version of an overridden method actually executes when the program runs, and the rule is stricter and simpler than most students expect: the version that runs is always determined by the object\'s actual type, never by the type of the variable holding the reference to it.'),
  H.code('Shape s = new Circle("my circle", 4.0);\nSystem.out.println(s.area());'),
  H.p('That line declares <code>s</code> with type <code>Shape</code>, but the object it actually refers to, created on the right side of the assignment, is a <code>Circle</code>. Calling <code>s.area()</code> does not run the weak <code>Shape</code> version just because the variable\'s declared type is <code>Shape</code>. It runs the <code>Circle</code> version, because <code>s</code> is a reference to a real <code>Circle</code> object at runtime, and Java always dispatches an overridden method based on what the object actually is, not based on what the reference is declared as. The output is the circle\'s real area, computed from its radius, not zero.'),
  H.box('warn', 'The trap, stated precisely', '<p>The reference type only controls which methods you are allowed to call at compile time, not which version of an overridden method runs. A Shape-typed reference to a Circle object can only call methods that Shape itself declares, but any method it does call that Circle overrides will run Circle\'s version. Students who get this wrong usually assume the declared type controls behavior. It only controls which method names are visible; the object\'s real type controls which body actually executes.</p>'),
  H.p('The other detail worth being exact about is the <code>@Override</code> annotation itself. It is not required for overriding to work. A method with the same name, same parameter list, and same return type as a method in the superclass overrides it whether or not <code>@Override</code> is written above it. What <code>@Override</code> actually does is ask the compiler to check that the method really does match a superclass method exactly, and fail with an error if it does not. Leave off a parameter, get the return type slightly wrong, or misspell the method name, and a method intended as an override quietly becomes an entirely separate, unrelated method instead, one that never runs when called through a superclass-typed reference, and does nothing obviously wrong until a program\'s output stops matching what was expected. <code>@Override</code> exists to catch exactly that mistake early, at compile time, instead of leaving it to surface as a silent wrong answer later.'),

  H.h2(SECTIONS[3]),
  H.p('Given all of that, it is fair to ask why a study guide should spend any time at all on content the current exam will not test. The honest answer is that the exam is not the only reason to understand something in a computer science course. Inheritance is one of the core ideas of object-oriented programming, and it does not stop mattering just because one particular exam stopped grading it. Anyone continuing to a second programming course, in college or in a school that offers one, is very likely to meet class hierarchies again almost immediately, and arriving already comfortable with subclasses, overriding, and <code>super</code> is a real advantage over arriving cold.'),
  H.p('There is also a narrower, more practical reason specific to this course. A teacher is free to keep covering inheritance even though it will not be graded on the AP exam, and quite a few still do, because the concept reinforces ideas the exam does grade heavily. Reasoning about what a method actually does, rather than assuming it does what its name suggests, is exactly the skill Class Creation and Data Collections both lean on, and working through an overriding example is good practice for that habit even when the specific example will never appear on a released free response question.'),
  H.p('So treat what follows as exactly what it is: useful background for a concept that is no longer part of what you need to know for this specific exam, not a warning that it might sneak back in. If a practice resource frames inheritance as something you need for AP CSA specifically, that resource has not been updated for the current course and exam description, and this post exists partly to correct that. Our <a href="/blogs/ap-csa/ap-csa-class-creation-constructors-fields-this">Class Creation guide</a> covers the skill that actually is tested at this depth, building a single class from nothing, and is the better place to spend exam-prep time than a deep review of overriding and super.'),

  H.h2('Two questions on inheritance mechanics'),
  H.p('These are concept checks, not exam-format practice, since this content will not be graded on the current AP CSA exam. Trace both by hand before checking the answer.'),
  H.mcq({
    n: 1,
    stem: 'Given the Shape and Circle classes described above, what does the following code print?',
    codeText: 'Shape a = new Shape("plain shape");\nShape b = new Circle("circle b", 2.0);\nSystem.out.println(a.area());\nSystem.out.println(b.area());',
    options: ['0.0 and 0.0', '0.0 and 12.566370614359172', '12.566370614359172 and 12.566370614359172', 'The code does not compile'],
    correct: 1,
    why: 'Both a and b are declared with type Shape, but that declared type only controls which method names are reachable through the variable, not which version of an overridden method runs. a actually refers to a plain Shape object, so a.area() runs the Shape version and returns 0.0. b actually refers to a Circle object, even though its declared type is Shape, so b.area() runs the Circle version, computing Math.PI times radius squared with radius equal to 2.0. The object\'s real type at runtime decides which overridden method executes, regardless of what the reference is declared as, which is the entire point of the trap this question is built around.',
  }),
  H.mcq({
    n: 2,
    stem: 'A subclass constructor needs to initialize a field that is declared in its superclass and marked private there. Which of the following correctly describes how to do that?',
    codeText: 'public class Vehicle {\n    private int wheels;\n\n    public Vehicle(int wheels) {\n        this.wheels = wheels;\n    }\n}\n\npublic class Motorcycle extends Vehicle {\n    private String brand;\n\n    public Motorcycle(String brand) {\n        // fill in this constructor\n        this.brand = brand;\n    }\n}',
    options: [
      'Call super(2) as the first statement in the Motorcycle constructor, since wheels is private in Vehicle and cannot be set directly.',
      'Set this.wheels = 2 directly inside the Motorcycle constructor.',
      'Leave wheels uninitialized, since Motorcycle does not declare that field itself.',
      'Call this.wheels(2) as a method call inside the Motorcycle constructor.',
    ],
    correct: 0,
    why: 'wheels is private in Vehicle, which means Motorcycle cannot reach it directly at all, not even to assign it, because private access is restricted to code inside the declaring class. The only way for a subclass constructor to initialize a private field owned by its superclass is to call the superclass constructor, using super(...), and let that constructor do the assignment itself. super(2) calls Vehicle\'s own constructor with 2 as the wheels argument, which runs Vehicle\'s assignment internally where it does have access. Option B fails to compile because wheels is not visible from Motorcycle at all. Option C leaves the object in a broken state where wheels defaults to 0 instead of being set correctly. Option D invents a method call syntax that does not exist; wheels is a field, not a method, and even if it were public, this.wheels(2) is not valid Java.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Is inheritance still tested on the AP CSA exam?', a: 'No. The standalone inheritance and polymorphism unit was removed from the current four-unit course and exam description, and the specific mechanics, the extends keyword, method overriding, the super keyword, and interfaces, are marked as content that will not appear on the current exam. A student can be fully prepared for the exam without knowing how to write a subclass.' },
    { q: 'If it is not tested, why does this guide bother teaching it?', a: 'Because the concept still matters outside this one exam. Anyone continuing into a second programming course, in college or otherwise, is likely to meet class hierarchies again quickly, and understanding subclasses, overriding, and super ahead of time is a genuine head start even though it will not appear on this specific test.' },
    { q: 'Is Class Creation the same thing as inheritance?', a: 'No, and confusing the two is common because both involve writing a class from scratch. Class Creation, which is tested, asks a student to build one class with fields, a constructor, and accessor and mutator methods. Inheritance, which is not tested, asks a student to build a second class that extends the first and reuses or overrides its behavior. Only the first skill is required for the current exam.' },
    { q: 'Do I need to memorize the @Override annotation for the exam?', a: 'No, since overriding itself is not tested content on the current exam. For general understanding, @Override is optional syntax that asks the compiler to verify a method really does match a superclass method exactly; overriding works correctly whether or not the annotation is present.' },
  ]),

  H.cta({
    heading: 'Spend your prep time on what the current exam actually grades',
    body: 'A Class Creation guide built for the skill that is tested, daily practice tuned to the four-unit structure, and a free response archive filtered for redesign-era items.',
    links: [
      { href: '/blogs/ap-csa/ap-csa-class-creation-constructors-fields-this', text: 'Class Creation guide' },
      { href: '/pages/ap-csa-qotd-hub', text: 'Daily practice', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Verified against the College Board AP Computer Science A course and exam description in effect for 2025-26. Last reviewed November 3, 2026.'),
]);

module.exports = { meta, body };
