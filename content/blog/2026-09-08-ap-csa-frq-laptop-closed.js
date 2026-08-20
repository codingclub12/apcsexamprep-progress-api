'use strict';
// Weekly course post: AP CSA. Drill track: a study-habit how-to making the
// case for starting hand-written FRQ practice in September, on easy Unit 1/2
// content, rather than waiting for April and Unit 4.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'The FRQ section has no autocomplete, and that gap shows up fast',
  'Why AP CSA FRQ practice should start in September, not April',
  'A low-stakes way to start: one method a week, laptop closed',
  'What goes wrong the first few times, and why it is normal',
  'A worked example: counting even numbers in a list of integers',
  'Two practice questions on Unit 1 and Unit 2 material',
  'Frequently asked questions',
];

const meta = {
  title: 'AP CSA FRQ Practice: Writing Your First FRQ With the Laptop Closed',
  handle: 'ap-csa-frq-practice-laptop-closed',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'ap csa frq practice',
  publishOn: '2026-09-08',
  seoTitle: 'AP CSA FRQ Practice: Start With the Laptop Closed',
  seoDescription: 'AP CSA FRQ practice with the laptop closed has no autocomplete and no compiler. Why to start this habit in September on easy content, plus a worked example.',
  summary: 'The free response section has no IDE, no autocomplete, and no compiler catching a typo, which means the habit of writing correct code by hand cannot be built in April. Here is why AP CSA FRQ practice should start in September on easy Unit 1 and Unit 2 material, a low-stakes weekly drill to build the habit, and a worked example showing what a strong first attempt actually looks like.',
  tags: ['AP CSA', 'FRQ Practice', 'Study Habits', 'Unit 1', 'Unit 2'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('AP CSA FRQ practice is the one part of exam prep an editor cannot help with, because on the real exam there is no editor. Building the habit of writing correct code by hand starts paying off the earlier you start it, and September, on easy material, is the cheapest month of the whole year to begin.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 8, 2026', updated: 'September 8, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Here is a version of the same student I meet almost every spring. They have been writing code all year in a real editor, the kind with autocomplete that finishes a method name after three letters and a red underline that appears the instant a semicolon goes missing. Their code runs. Their homework looks clean. By any measure available to them day to day, they are doing fine.'),
  H.p('Then they sit down for a timed free response practice set, laptop closed, blank paper in front of them, and something unexpected happens. They know exactly what the method is supposed to do. They could explain the logic out loud without hesitating. But the actual writing stalls. Is it <code>list.get(i)</code> or <code>list.at(i)</code>? Does <code>ArrayList</code> need a capital A and a capital L, or was it lowercase somewhere in there? Is the return type declared before or after the method name goes in this particular case? None of that ever mattered before, because the editor was quietly answering every one of those questions on every single keystroke, all year, without the student noticing it was happening.'),
  H.p('That is the actual failure mode this post is about. It has nothing to do with understanding the logic of a program. A student who cannot recall exact method names or exact syntax under exam conditions is not confused about how loops work or what a class does. They have a tool dependency they never had to notice, because the tool was always there, right up until the one day it was not allowed to be.'),
  H.box('warn', 'This is not a knowledge gap', '<p>An IDE does two things constantly and invisibly: it finishes syntax you started typing, and it flags an error the moment you make one. Neither of those exists on the AP exam. So a student can be completely solid on the concepts and still freeze on the page, because the skill that actually failed was never tested by any homework assignment done with the tool turned on.</p>'),
  H.p('The fix is not more practice with the tool on. It is deliberate practice with the tool off, started early enough that discovering this gap costs almost nothing.'),

  H.h2(SECTIONS[1]),
  H.p('Every AP CSA teacher has watched the same clock run out on the same students, and the pattern is always the calendar, not the effort. A student who first tries writing code by hand in April, a few weeks before the exam, is trying to build a new physical habit at the exact moment the stakes are highest and the content is hardest. That is close to the worst possible timing, and it is also the default timing, because nothing forces anyone to try it any earlier.'),
  H.p('Flip that around and the math gets a lot friendlier. A student who starts <a href="/pages/ap-csa-frq-archive">AP CSA FRQ practice</a> in September gets months of low-pressure repetition before any of it counts toward a grade that matters. Every week spent building the habit early is a week that does not have to be spent building it later, under a deadline, on unfamiliar Unit 3 or Unit 4 content. The habit itself, writing a correct method by hand without a tool checking your work, does not care what unit the method belongs to. It transfers completely. Practicing it now on easy material buys the exact same skill as practicing it later on hard material, for a fraction of the stress.'),
  H.p('September has one more advantage that disappears by spring: the content is genuinely easy. Object construction, calling a method, a simple loop over an array or a list. None of that requires holding much in working memory, which means it is the ideal moment to isolate the one variable that actually matters here, writing syntax from memory, without also fighting to understand a hard algorithm at the same time. Trying this habit for the first time on a hard Unit 4 free response question stacks two difficult things on top of each other. Trying it in September on a method that returns a sum or counts a value in a list means the only new thing being practiced is the handwriting itself.'),
  H.box('key', 'The trade this habit is actually making', '<p>Practicing with the laptop closed in September feels slower and less productive than typing in an editor, because it is, in the moment. What it buys is months of runway before the same discomfort shows up for the first time on an actual exam, when there is no more runway left to spend.</p>'),

  H.h2(SECTIONS[2]),
  H.p('None of this requires a full free response question yet. A full FRQ is four parts, real time pressure, and a lot to hold at once, which makes it a poor place to start a brand new habit. Start smaller than that.'),
  H.p('Once a week, starting this month, write one small method by hand. Not a whole program, not a whole class, just one method that does one clear thing: return the largest value in an array, count how many elements in a list meet some condition, build a new string out of an old one. Pick something that matches whatever the class has covered that week, on paper or in a plain text document with no autocomplete and no syntax highlighting running.'),
  H.p('The order matters as much as the writing does. Write the method first, all the way through, before checking anything against a compiler. Only after the attempt is finished, run it and see what actually happens. Checking during the process turns the exercise back into editor-assisted coding, which defeats the entire point. Checking after is what makes every mistake information instead of an interruption.'),
  H.ul([
    '<strong>Pick one method.</strong> Something a single class period could have taught: a loop that counts, a loop that sums, a simple conditional inside a loop.',
    '<strong>Write it complete, laptop closed.</strong> Full method signature, full body, on paper or in a bare text file, from memory, start to finish.',
    '<strong>Do not check anything until it is done.</strong> No compiler, no reference sheet, no peeking at old homework for the exact syntax.',
    '<strong>Then, and only then, run it against a compiler.</strong> Compare what you wrote to what actually compiles and runs correctly.',
    '<strong>Log what was wrong, in one line.</strong> Not a rewrite of the whole method, just the specific thing that was off, so the pattern across weeks becomes visible.',
  ]),
  H.p('Twenty minutes, once a week, from September through the rest of the year, adds up to dozens of repetitions before the real exam ever asks for one. That is the entire strategy. It does not need to be more complicated than that to work.'),

  H.h2(SECTIONS[3]),
  H.p('The first few times through this drill go badly for almost everyone, and that is worth saying plainly, because the discomfort is easy to misread as evidence of not understanding the material. It is not that. It is evidence that a tool used to be doing part of the work, and now it is not, and that transition is uncomfortable for exactly as long as it takes to build the muscle underneath it.'),
  H.p('A few specific errors show up over and over in that first month, and every one of them is normal rather than alarming.'),
  H.h3('Forgetting exact method signatures'),
  H.p('Blanking on whether a method needs a return type before or after its name, or forgetting a parameter list entirely and writing the body as if the inputs would just be understood. This is pure muscle memory that autocomplete had been supplying. It comes back fast with repetition and does not indicate a gap in understanding what the method is supposed to do.'),
  H.h3('Missing semicolons'),
  H.p('The single most common first-attempt error, and also the least meaningful one. An IDE flags a missing semicolon in real time, so the habit of typing one at the end of every statement was never actually built, it was outsourced. A few weeks of writing by hand rebuilds it almost immediately.'),
  H.h3('Uncertainty about capitalization'),
  H.p('Is it <code>ArrayList</code> or <code>arraylist</code>? Is the method <code>toUpperCase</code> or <code>toUppercase</code>? Java class and method names follow consistent conventions, but a student who has always had autocomplete finish the word never had to memorize the exact casing, only recognize the completed suggestion as correct. Writing from memory exposes that gap directly.'),
  H.h3('Incomplete, pseudocode-like fragments'),
  H.p('A first hand-written attempt sometimes trails off into something closer to English than Java: a loop with the right idea but a condition written in words, or a return statement that describes the value instead of computing it. This is the logic arriving faster than the syntax can keep up with it, which is a good sign about the thinking and simply a syntax gap that closes with practice.'),
  H.box('tip', 'Read this list as a checklist, not a warning', '<p>If a first attempt hits two or three of these, that is the expected result of the first few tries, not a sign of falling behind. The students who eventually write clean free response answers under real exam pressure are almost never the ones who got it right immediately. They are the ones who kept doing the weekly drill after the first few attempts were messy.</p>'),

  H.h2(SECTIONS[4]),
  H.p('Here is what one week of this drill actually looks like, using a prompt sized the way an early free response question is sized: write a method that takes an ArrayList of integers and returns the count of even numbers in it.'),
  H.p('A strong first hand-written attempt, from a student who understands the logic but has not yet fully rebuilt their syntax memory, might look something like this.'),
  H.code('public int countEvens(ArrayList<Integer> nums)\n{\n    int count = 0;\n    for (int i = 0; i < nums.size(); i++)\n    {\n        if (nums.get(i) % 2 == 0)\n        {\n            count = count + 1;\n        }\n    }\n    return count;\n}'),
  H.p('Read that closely and the logic is completely correct: initialize a counter, loop across every index of the list, check each value for evenness with the remainder operator, increment when it matches, return the total at the end. A grader working through the AP CSA free response rubric is looking first and foremost for exactly that, a correct plan executed correctly, not for a flawless first draft.'),
  H.p('This is also the right moment to name something students consistently underestimate about how free response answers are actually scored. The rubric is built around specific checkpoints tied to logic and structure, not around whether every character on the page would compile without complaint. A missing semicolon on an otherwise correct line, an extra set of parentheses, a stray capitalization slip in a variable name the student clearly meant consistently, none of that is what separates a strong response from a weak one. A response that shows the right loop, the right condition, and the right accumulation pattern earns credit for showing exactly that, even with small syntax lapses sitting on top of it. What costs points is a broken plan: skipping the loop entirely, checking the wrong condition, forgetting to return anything at all. The handwritten drill should be graded against that same standard. The goal every week is not a version that compiles perfectly on the first try. The goal is a version where the logic and structure are unmistakably right, with the small syntax slips getting rarer over time.'),
  H.p('One more thing worth noticing in that example: it never touches material outside Unit 1 and Unit 2. A single loop, a conditional, a counter variable, one method call on a list. That is deliberate. The habit being built here does not need hard content to practice on, and easy content in September is a better training ground precisely because it lets the syntax be the only thing under the microscope.'),

  H.h2(SECTIONS[5]),
  H.p('Both questions below sit squarely in Unit 1 and Unit 2 territory, object and method basics and simple loop tracing, the kind of material a class covers in its first several weeks. Try tracing each one on paper before checking the explanation.'),
  H.mcq({
    n: 1,
    stem: 'What is printed by the following code segment?',
    codeText: 'ArrayList<Integer> nums = new ArrayList<Integer>();\nnums.add(3);\nnums.add(6);\nnums.add(9);\nint total = 0;\nfor (int i = 0; i < nums.size(); i++) {\n    if (nums.get(i) % 3 == 0) {\n        total++;\n    }\n}\nSystem.out.println(total);',
    options: ['0', '1', '2', '3'],
    correct: 3,
    why: 'The list holds three values: 3, 6, and 9. The loop checks every one of them against the condition nums.get(i) percent three equals zero, and all three values are evenly divisible by three, so the counter total increases on every pass through the loop. After three iterations total equals three, which is what prints. A student who answers 0 is likely misreading the modulus condition as checking for a remainder rather than the absence of one.',
  }),
  H.mcq({
    n: 2,
    stem: 'Given the class definition below, which line correctly constructs a Rectangle object with width 4 and height 7, then calls a method on it?',
    codeText: 'public class Rectangle {\n    private int width;\n    private int height;\n\n    public Rectangle(int w, int h) {\n        width = w;\n        height = h;\n    }\n\n    public int getArea() {\n        return width * height;\n    }\n}',
    options: [
      'Rectangle r = Rectangle(4, 7); System.out.println(r.getArea());',
      'Rectangle r = new Rectangle(4, 7); System.out.println(r.getArea());',
      'Rectangle r = new Rectangle(); System.out.println(r.getArea(4, 7));',
      'Rectangle r = new Rectangle(4, 7); System.out.println(getArea(r));',
    ],
    correct: 1,
    why: 'Constructing an object requires the keyword new followed by a call to the constructor with arguments matching its parameter list, here two integers for width and height. Once r holds the constructed object, an instance method is called on it with dot notation and no arguments, since getArea takes none. Option A omits new, which will not compile. Option C passes the dimensions to getArea instead of the constructor, but getArea takes no parameters. Option D calls getArea as a free-floating function instead of a method on r, which is not how instance methods are invoked.',
  }),

  H.h2(SECTIONS[6]),
  H.faq([
    { q: 'When should I start practicing AP CSA FRQ questions with the laptop closed?', a: 'As early as September, on whatever material the class has covered so far. The habit of writing correct syntax from memory is independent of unit difficulty, so building it early on easy Unit 1 and Unit 2 content is far less intimidating than trying it for the first time in the spring on harder material.' },
    { q: 'Do I need to write a full free response question every week?', a: 'No. A full FRQ is a lot to take on while still building the habit. One small method a week, matched to whatever was taught that week, is enough to build the same underlying skill with far less friction.' },
    { q: 'Will small syntax mistakes hurt my score on the real exam?', a: 'Minor slips like a missing semicolon rarely cost significant credit if the logic and structure of the response are correct. The rubric is built around whether the plan is right, not whether every character would compile cleanly. What costs real points is a broken plan, such as the wrong loop condition or a missing return statement.' },
    { q: 'What should I do after writing a method by hand?', a: 'Run it against a compiler only after the attempt is finished, then compare the two closely and log the specific mistake in one line. Checking during the attempt turns the exercise back into editor-assisted coding and removes the part that actually builds the habit.' },
    { q: 'Where can I find more free response practice organized by unit?', a: 'The <a href="/pages/ap-csa-frq-archive">free response archive</a> has past questions with full solutions, the <a href="/pages/ap-csa-qotd-hub">daily practice questions</a> let you drill single skills, and the <a href="/blogs/ap-csa/ap-csa-variable-table-tracing-method">variable table tracing method</a> pairs well with hand-written practice since both rebuild habits an editor usually handles for you.' },
  ]),

  H.cta({
    heading: 'Start the habit while the content is still easy',
    body: 'Free response questions with full solutions organized by unit, plus daily practice to drill single skills, so the September version of this habit stays this cheap all year.',
    links: [
      { href: '/pages/ap-csa-frq-archive', text: 'FRQ archive' },
      { href: '/pages/ap-csa-qotd-hub', text: 'Daily practice', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Last reviewed September 8, 2026.'),
]);

module.exports = { meta, body };
