'use strict';
// Brief: explains AP CSA FRQ scoring mechanics (partial credit, rubric point
// structure, "uses appropriately" language). Re-verified 2026-08-20 against
// College Board scoring guidelines commentary and cross-checked against our
// own previously published FRQ tips post before writing any specific claim
// about rubric mechanics. No point totals or percentages are asserted beyond
// what is well documented across multiple years of scoring guidelines: four
// free-response questions, each scored on a 9-point rubric.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'Why "wrong answer equals zero points" is not how AP CSA FRQ scoring works',
  'How AP CSA FRQ scoring actually works: points tied to specific skills',
  'A worked example: reading a flawed solution the way a rubric would',
  'The "uses the method appropriately" rule that trips up strong students',
  'What this means for how you should actually write an FRQ',
  'Two practice questions: which candidate answer scores better',
  'Frequently asked questions',
];

const meta = {
  title: 'AP CSA FRQ Scoring: How Free Response Is Actually Graded, Point by Point',
  handle: 'ap-csa-frq-scoring-point-by-point',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'ap csa frq scoring',
  publishOn: '2026-09-22',
  seoTitle: 'AP CSA FRQ Scoring: How Points Are Actually Earned',
  seoDescription: 'AP CSA FRQ scoring gives partial credit for specific skills, not a working program. Here is how the rubric actually reads a flawed solution, point by point.',
  summary: 'Most students assume a free response answer that would not compile or run is worth close to nothing. AP CSA FRQ scoring does not work that way. Rubrics award points for specific demonstrated skills, independent of whether the whole program would run, and this post walks through a flawed worked example to show exactly which points survive a mistake and which do not, plus the "uses the method appropriately" rule that catches strong students who solve a problem a valid but different way.',
  tags: ['AP CSA', 'FRQ Scoring', 'Free Response', 'Rubric', 'Exam Strategy'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('AP CSA FRQ scoring does not work the way most students assume it does. A response with a small mistake in it is not treated like a wrong answer on a multiple choice question, worth nothing the moment it is imperfect. Rubrics award points for specific, demonstrated skills, and a lot of those points survive a syntax slip or a stray bug completely intact. Here is how the scoring actually works, one point at a time.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 22, 2026', updated: 'September 22, 2026', readingMinutes: 12,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Ask a student who just finished a timed free response practice set what score they think they earned, and a specific pattern shows up almost every time. If they remember one bug, one missing piece, one line that would not actually compile, they assume the whole response is close to a loss. That assumption comes from years of multiple choice testing, where an answer is either the credited letter or it is not, with nothing in between. Free response does not work that way, and carrying the multiple choice mental model into it costs real points that were sitting there for the taking.'),
  H.p('A free response question on the AP Computer Science A exam is scored against a rubric built out of separate, independent point-earning opportunities, not a single pass or fail judgment on the response as a whole. A response can have a bug in it, even a bug that would crash the program if it actually ran, and still earn most of the available points, because most of those points are tied to something narrower and more specific than "does the whole thing work."'),
  H.box('warn', 'The assumption that costs points', '<p>Leaving a part blank because it feels unfinished, or because a student is not sure the syntax is exactly right, throws away every point that part could have earned. A blank response earns zero by definition. A flawed response earns whatever it demonstrates, which for most flawed responses is a meaningful fraction of the total.</p>'),
  H.p('The rest of this post is about what that rubric structure actually looks like from the inside, so "write for partial credit" stops being vague advice and becomes something you can act on line by line while you are writing.'),

  H.h2(SECTIONS[1]),
  H.p('Every free response question on the exam is scored on its own point-based rubric, and each rubric is broken into a handful of specific, separately earned points rather than one overall judgment. A method-writing question might have points available for correctly declaring the accumulator variable, for iterating over the right collection with the right bound, for checking the right condition, and for returning the right value, each evaluated on its own. A response earns each of those points independently of the others, which is the mechanism that makes partial credit real rather than a vague reassurance.'),
  H.p('This is also why a reader is trained to read past cosmetic mistakes when they are deciding whether a point was earned. A reader looks for evidence of a specific skill: did the response iterate across the full list, did it use the correct comparison, did it accumulate the result correctly. A missing semicolon does not erase that evidence. A variable declared with a different name than the one suggested in the prompt does not erase it either, as long as the response uses that name consistently and its meaning is unambiguous from context. What does erase a point is the absence of the thing the point is actually checking for: a loop that never runs across the full collection, a condition that checks the wrong thing, an accumulator that never actually accumulates.'),
  H.p('That distinction, between a mistake that obscures the evidence a point is looking for and a mistake that does not, is the entire skill of writing for partial credit. It is also worth being direct about what this is not. It is not a claim that syntax never matters, or that any answer resembling the right shape earns full marks. A response with a wrong but internally consistent variable name is read differently than a response where the same variable name means two different things in two different places, because the second case genuinely creates ambiguity about what the response is doing. A response with the wrong return type in its method header, or a call to a method that does not exist on the object it is supposedly being called on, loses whatever specific point depends on that piece being correct, because that mistake is not cosmetic, it changes what the code actually does. The forgiving read applies to noise around the logic. It does not apply to the logic itself.'),
  H.p('One more piece of the framework matters here: a reader evaluates each part of a multi-part question on its own credit, and nothing in an earlier part reduces the credit available in a later part. A rough or incorrect attempt at an early piece of a question does not poison the parts that come after it, and later parts are frequently read as if the earlier work were correct, specifically so one early mistake cannot cascade into a much larger point loss than the mistake itself deserves. That is a second, separate reason a blank or abandoned answer is the worst option available. Even an early misstep does not sink the rest of the response.'),

  H.h2(SECTIONS[2]),
  H.p('Here is what that looks like against an actual example. Say a free response prompt asks for a method with this specification: given an ArrayList of Strings named words and an integer minLength, return the number of strings in words whose length is greater than or equal to minLength.'),
  H.p('A student running low on time, unsure of a few exact details, might turn in something like this.'),
  H.code('public int countLong(ArrayList<String> wrds, int minLength)\n{\n    int cnt = 0;\n    for (int k = 0; k <= wrds.size(); k++)\n    {\n        if (wrds.get(k).length() >= minLength)\n            cnt = cnt + 1\n    }\n    return cnt;\n}'),
  H.p('Read that the way a rubric would, point by point, instead of asking whether it compiles as written.'),
  H.ul([
    '<strong>The parameter renamed from words to wrds.</strong> This costs nothing. The name is used consistently everywhere it appears, and its meaning is unambiguous. A rubric checking for "iterates over the list parameter" does not care what the list parameter is called, only that the response treats it correctly.',
    '<strong>The loop variable named k instead of i.</strong> Same story, and even less relevant than the parameter rename, since a loop counter has no name requirement anywhere in a typical rubric.',
    '<strong>The missing semicolon after cnt = cnt + 1.</strong> A typo, not a logic error. It does not obscure what the line is doing, and the point tied to correctly updating the accumulator is still visible in the response.',
    '<strong>The loop bound written as k <= wrds.size() instead of k < wrds.size().</strong> This is the real problem in the response, and it is a logic error, not a cosmetic one. It would throw an exception on the actual last iteration in a running program, and more importantly for scoring purposes, it fails to demonstrate the specific skill the "correct iteration boundary" point is checking for. This point is not earned.',
    '<strong>The comparison and the accumulation pattern.</strong> The condition correctly checks length against minLength using the specified comparison, and the counter is initialized before the loop and only incremented when the condition is true. Both of those points are earned, because both are demonstrated clearly regardless of the loop bound mistake sitting nearby.',
    '<strong>The return statement.</strong> Present, returns the right variable, matches the declared return type. Earned.',
  ]),
  H.p('Add that up and a response with one real logic bug in it still earns most of the points on this question, because most of the points on this question were never about the loop bound in the first place. That is the mechanism behind "write for partial credit" made concrete: an imperfect response is not evaluated as one unit that either works or does not, it is evaluated as a collection of separate pieces of evidence, most of which this response still provides cleanly.'),
  H.p('This worked example is deliberately about the mechanics of a single method, not about building the handwriting habit that makes a response like this possible under timed conditions in the first place. The <a href="/blogs/ap-csa/ap-csa-frq-practice-laptop-closed">weekly laptop-closed FRQ practice routine</a> covers that habit directly and is worth reading alongside this post rather than instead of it. Reading Java error messages correctly also matters here in a specific way: knowing exactly what would break a program, like the off-by-one bound above, is what lets you catch it during review even when you cannot run a compiler, and that skill is covered in more depth in <a href="/blogs/ap-csa/ap-csa-reading-java-error-messages">how to read Java error messages</a>.'),

  H.h2(SECTIONS[3]),
  H.p('There is one more rubric pattern worth understanding on its own, because it catches a different kind of student than the syntax-anxious one above. It shows up most often on questions that hand you a class definition, or a method signature, and specify that a later method must be written using that class or that method rather than solving the problem from scratch by hand.'),
  H.p('A rubric on a question like that typically includes a point along the lines of "uses the [method or class] appropriately," and that point is checking something specific and separate from whether the final output is correct: did the response actually call the provided method or construct the provided object, the way the prompt asked it to, rather than reimplementing that logic inline. A student who is confident enough in their own logic to solve the underlying problem a different, perfectly valid way, without touching the method the question told them to use, can produce output that is completely correct and still miss this particular point, because the point was never about the output. It was about demonstrating that you can use an existing method or class as a tool rather than solving everything from first principles every time.'),
  H.box('key', 'Why this rule exists', '<p>A large part of writing real software is calling code someone else already wrote correctly, rather than rewriting it. A question that specifies "using the method X, write method Y" is testing that specific skill directly, on purpose. Solving it a different way that ignores the provided method answers a different question than the one that was actually asked, even when the answer given happens to be correct.</p>'),
  H.p('This is exactly the kind of thing that trips up a strong student more than a shaky one. A student who is not confident in their own logic is more likely to lean on whatever method the prompt handed them, because it is the easier path. A student who is very comfortable writing code from scratch sometimes does not even notice that the prompt specified a required tool, because their own solution works fine without it. The fix is not writing more code. It is reading the prompt specifically for language like "using the method," "must call," or "in terms of," and treating that as a hard constraint on the solution rather than a suggestion.'),

  H.h2(SECTIONS[4]),
  H.p('None of this changes what good AP CSA FRQ scoring habits look like in practice, it just explains why they work. A few things follow directly from everything above.'),
  H.ul([
    'Never leave a part blank. A blank response earns nothing by construction. An attempt that gets the accumulator pattern right and the loop bound wrong still earns the points tied to the accumulator pattern.',
    'Write the full method structure even when one detail is uncertain. A method with a correct signature, a correct loop, and a guessed condition earns more than a method abandoned halfway through because the condition was not certain.',
    'Do not agonize over exact method names or minor syntax at the expense of finishing the logic. A consistent, sensible variable name that differs from the one suggested in the prompt is not the problem. An unfinished method is.',
    'Read every prompt for a required method or class before writing a line of the solution. If the prompt says to use something specific, using it is itself worth points, independent of whether your own approach would also produce the correct result.',
    'Review your own response the way a rubric would, not the way a compiler would. Ask "does this show the four or five specific things this question is checking for" rather than "would this compile exactly as written."',
  ]),
  H.p('That last habit is the one worth building deliberately, and it pairs directly with a laptop-closed practice routine: writing a method by hand with no compiler running is exactly the situation where knowing what the rubric is actually looking for changes how you spend your limited time. The <a href="/pages/ap-csa-frq-archive">free response archive</a> has real past questions with full solutions organized by unit, which is the fastest way to see this rubric structure applied across a wide range of prompts rather than just the one worked example above.'),

  H.h2(SECTIONS[5]),
  H.p('Both questions below give two candidate answers to the same prompt and ask which one a reader would score higher, and why. Reason through the rubric logic above before checking the explanation.'),
  H.p('Prompt: write a method sumPositive that takes an array of integers named nums and returns the sum of all the positive values in the array.'),
  H.p('<strong>Candidate A</strong>'),
  H.code('public int sumPositive(int[] nums)\n{\n    int total = 0\n    for (int i = 0; i < nums.length; i++)\n    {\n        if (nums[i] > 0)\n        {\n            total += nums[i];\n        }\n    }\n    return total;\n}'),
  H.p('<strong>Candidate B</strong>'),
  H.code('public int sumPositive(int[] nums)\n{\n    int total = 0;\n    for (int i = 1; i < nums.length; i++)\n    {\n        if (nums[i] >= 0)\n        {\n            total += nums[i];\n        }\n    }\n    return total;\n}'),
  H.mcq({
    n: 1,
    stem: 'Which candidate above would earn more rubric points, and why?',
    options: [
      'Candidate A, because its only flaw is a missing semicolon, while Candidate B has a wrong loop start and includes zero as if it were positive.',
      'Candidate B, because it is missing fewer characters overall.',
      'They would score identically, since both have one visible mistake.',
      'Neither would earn any points, since neither is guaranteed to compile as written.',
    ],
    correct: 0,
    why: 'Candidate A has exactly one flaw, a missing semicolon on the total declaration, and it is purely cosmetic: the accumulator initialization, the loop bound, the condition, and the return are all correct and clearly demonstrated. Candidate B has two logic flaws that a rubric treats very differently from a typo. Starting the loop at index 1 skips the first element entirely, which fails the "iterates over the full array" point, and checking nums[i] >= 0 includes zero, which is not positive, so it fails the "correct condition" point as specified in the prompt. Option D applies the wrong standard entirely: AP CSA FRQ scoring is not a compile check, it evaluates the evidence in the response against the rubric regardless of whether every character would satisfy a compiler.',
  }),
  H.p('Second prompt: a Book class already defines a method isOverdue that correctly determines whether a given Book is overdue. Write a method countOverdue in a Library class that takes an ArrayList of Book objects and returns how many of them are overdue, using the isOverdue method.'),
  H.p('<strong>Candidate A</strong>'),
  H.code('public int countOverdue(ArrayList<Book> books)\n{\n    int count = 0;\n    for (Book b : books)\n    {\n        if (b.isOverdue())\n        {\n            count++;\n        }\n    }\n    return count;\n}'),
  H.p('<strong>Candidate B</strong>'),
  H.code('public int countOverdue(ArrayList<Book> books)\n{\n    int count = 0;\n    for (Book b : books)\n    {\n        if (b.getDaysLate() > 0)\n        {\n            count++;\n        }\n    }\n    return count;\n}'),
  H.mcq({
    n: 2,
    stem: 'Both candidates would produce the same correct count on a working program. Which one is more likely to earn full credit on this specific question?',
    options: [
      'Candidate B, since checking days late directly is a more precise way to determine overdue status.',
      'Candidate A, because the prompt specifically requires using the provided isOverdue method, and Candidate B bypasses it with different logic.',
      'Both equally, since correct output is correct output.',
      'Neither, because getDaysLate is not defined in the excerpt shown.',
    ],
    correct: 1,
    why: 'This is the "uses the method appropriately" rule in action. The prompt did not just ask for a correct overdue count, it specified using the isOverdue method to get there, which makes calling that method part of what is being scored, not an implementation detail left up to the student. Candidate A calls isOverdue directly, satisfying that requirement on top of producing the correct count. Candidate B reimplements the same judgment with a different, self-invented condition instead of calling the method the prompt named, and even though the output matches, the response fails to demonstrate the specific skill this question is checking for: using an existing method as a tool rather than solving the underlying logic again by hand. Matching final output is not the same thing as satisfying every point on the rubric.',
  }),

  H.h2(SECTIONS[6]),
  H.faq([
    { q: 'Does a free response answer that would not compile still earn points on the AP CSA exam?', a: 'Yes, in most cases. AP CSA FRQ scoring evaluates a response against a set of specific, independently earned rubric points, most of which check for demonstrated logic and correct use of language features rather than whether the response would compile exactly as written. A response with a syntax slip or even a real bug typically still earns the points tied to everything else it demonstrates correctly.' },
    { q: 'Does using the wrong variable name cost points on an AP CSA FRQ?', a: 'Generally no, as long as the name is used consistently and its meaning is clear from context. A rubric point checking for correct use of a parameter or a loop variable is checking the behavior around that variable, not its spelling. A name that creates real ambiguity, such as reusing an existing name to mean something different partway through a response, is treated differently and can cost credit.' },
    { q: 'What does "uses the method appropriately" mean on an AP CSA FRQ rubric?', a: 'It means the response is expected to call a specific method or use a specific class that the prompt provided, rather than solving the same problem a different way by hand. This point checks whether the required tool was actually used, independent of whether a self-written alternative would also produce correct output. It most often catches strong students who are confident enough in their own logic to skip the method the prompt asked them to use.' },
    { q: 'Is it better to leave a free response question blank if I am not sure of the exact syntax?', a: 'No. A blank response earns zero points by definition, while an attempt that gets the logic right and the syntax imperfect earns whatever it correctly demonstrates. Writing something for every part of every question, even an uncertain guess at the exact syntax, is close to strictly better than leaving it empty.' },
    { q: 'How many free response questions are on the AP CSA exam, and how is each one scored?', a: 'The exam has four free-response questions in the second section, and each one is scored on its own point-based rubric rather than a single overall judgment, with points tied to specific skills like correct iteration, correct conditions, and correct method use.' },
  ]),

  H.cta({
    heading: 'Practice writing for the rubric, not just for a compiler',
    body: 'The free response archive has full solutions organized by unit, so you can see exactly which points a strong answer earns and why, and daily practice keeps the underlying skills sharp between full FRQ sets.',
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
  H.updatedNote('Last reviewed September 22, 2026, against current AP Computer Science A scoring guideline conventions.'),
]);

module.exports = { meta, body };
