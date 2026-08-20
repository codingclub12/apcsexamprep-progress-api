'use strict';
// Weekly course post: AP CSP. Evergreen concept guide. The teaching point is
// the difference between a nested IF (one IF sitting inside another IF's
// branch) and a compound boolean condition (AND, OR, NOT combined inside a
// single IF), worked through one range-and-divisibility example written both
// ways so the reader sees they can be equivalent while reading completely
// differently, then the classic AND-versus-OR trap where the wrong operator
// silently changes which cases actually get included.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'AP CSP Conditionals: IF, ELSE IF, and ELSE',
  'Nested Conditionals vs. Compound Boolean Conditions',
  'Tracing AND, OR, and NOT the Way the Exam Tests It',
  'The Classic Trap: AND When the Logic Needed OR',
];

const meta = {
  title: 'AP CSP Conditionals: Nested IFs and Compound Booleans',
  handle: 'ap-csp-nested-conditionals-compound-boolean',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp conditionals',
  publishOn: '2026-10-21',
  seoTitle: 'AP CSP Conditionals: Nested IF vs. Compound AND/OR',
  seoDescription: 'AP CSP conditionals explained: one example as nested IFs and as a compound AND, plus the AND vs OR trap that changes what gets included.',
  summary: 'AP CSP conditionals get tested well past the basic IF, ELSE IF, ELSE chain. This guide takes one worked example, a number that must fall in a range and also be divisible by a target value, and writes it two different ways: as an IF nested inside another IF, and as a single IF built from a compound boolean condition. Both versions are traced against real inputs so the reader sees exactly when they behave the same and when nesting is the only tool that actually works, then the guide covers the trap that costs the most points on the exam: swapping AND for OR in a compound condition and silently changing which cases the program actually accepts.',
  tags: ['AP CSP', 'Conditionals', 'Boolean Logic', 'Pseudocode', 'Exam Reference Sheet'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('Two AP CSP programs can produce the exact same output for every possible input and still look nothing alike on the page, because one uses a nested IF and the other uses a single compound boolean condition. AP CSP conditionals test both forms on purpose, and the difference between them, not the basic IF syntax, is where most students actually lose points. This guide writes one example both ways, traces a compound AND/OR/NOT condition against real values, and walks through the single most common exam trap built on top of it.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 20, 2026', updated: 'October 20, 2026', readingMinutes: 12,
  }),
  H.toc(SECTIONS),

  H.p('Every AP CSP student learns the shape of an IF statement in the first week of conditionals: a condition in parentheses, a block in curly braces, maybe an ELSE IF or two, maybe a final ELSE. That part is genuinely easy, and it is not where the exam applies pressure. The pressure shows up once a single decision depends on more than one fact at a time, because pseudocode gives two completely different ways to express that, and released multiple choice items lean hard on the reader knowing which one is which. The first is a nested conditional, an IF placed inside the block of another IF, so the inner condition only even gets checked once the outer one is already true. The second is a compound boolean condition, where AND, OR, and NOT combine several facts into one single condition evaluated all at once, inside one IF. This guide teaches both forms directly against the same example so the overlap and the difference stop being abstract.'),

  H.h2(SECTIONS[0]),
  H.p('The base structure is worth restating precisely, because tracing it wrong is its own separate exam trap. An IF, ELSE IF, ELSE chain is written as one IF, then as many ELSE IF blocks as the logic needs, then an optional final ELSE that catches everything none of the earlier conditions matched.'),
  H.code('IF (condition)\n{\n  <block runs if condition is true>\n}\nELSE IF (condition)\n{\n  <block runs if this condition is true and every earlier one was false>\n}\nELSE\n{\n  <block runs only if every condition above was false>\n}'),
  H.box('key', 'Exactly one branch of a chain ever runs', '<p>College Board pseudocode checks the conditions in an IF, ELSE IF, ELSE chain strictly top to bottom, and it stops the instant it finds one that is true. Only that one block executes. Every condition below it, even one that would also have evaluated to true, is never even checked. A chain is not a list of independent tests, it is a single decision with several possible outcomes.</p>'),
  H.p('That single rule, exactly one branch runs, is what makes a chain different from a sequence of separate IF statements written one after another. Two separate IF statements each get their own independent check, and both can fire on the same pass through the program if both conditions happen to be true. An ELSE IF chain guarantees the opposite: once a branch fires, the decision is over. Confusing the two is a common source of wrong traces, and it matters even more once conditionals start nesting inside each other or combining into a single compound test, which is where the real teaching point of this guide begins.'),

  H.h2(SECTIONS[1]),
  H.p('Say the goal is to flag a number that satisfies two separate facts at once: it has to sit inside a specific range, and it has to be evenly divisible by a target value. Concretely, a number qualifies if it is between 10 and 50 inclusive, and it is a multiple of 5. There are two correct ways to write that check in AP CSP pseudocode, and a student needs to be able to read either one on sight.'),
  H.h3('Written as a compound boolean condition'),
  H.p('The compound version puts every fact into one condition, joined with AND, inside a single IF.'),
  H.code('IF (num >= 10 AND num <= 50 AND num MOD 5 = 0)\n{\n  DISPLAY ("Qualifies")\n}\nELSE\n{\n  DISPLAY ("Does not qualify")\n}'),
  H.p('All three facts are evaluated together as one Boolean expression. AND only produces true if every single piece is true, so if even one of the three comparisons fails, the whole condition is false and the program falls straight to ELSE. There is exactly one decision point in this version.'),
  H.h3('Written as nested conditionals'),
  H.p('The nested version checks the range first, and only asks about divisibility once a number has already passed that first gate.'),
  H.code('IF (num >= 10 AND num <= 50)\n{\n  IF (num MOD 5 = 0)\n  {\n    DISPLAY ("Qualifies")\n  }\n}'),
  H.p('For every value of <code>num</code>, this produces the identical result as the compound version above: <code>DISPLAY ("Qualifies")</code> runs only when the number is in range and divisible by 5, and it never runs otherwise. That is worth sitting with, because it is the actual teaching point of this whole guide. A nested IF where the inner condition only runs after the outer one passes, and a single compound condition joining the same facts with AND, are logically the same decision. Nesting is not a different rule, it is a different way of writing the same AND.'),
  H.box('tip', 'So when does the form actually matter', '<p>It matters the moment the branches need to say something different depending on which fact failed. The compound version above only ever produces two outcomes: qualifies, or does not qualify, with no way to tell a caller whether the number was out of range, in range but not a multiple of 5, or both. A nested structure can say more, because each level of nesting is its own separate decision point with its own ELSE.</p>'),
  H.p('Extend the nested version with an ELSE at each level and it can report exactly which fact failed, something the single compound condition cannot do without being rebuilt as several conditions anyway.'),
  H.code('IF (num >= 10 AND num <= 50)\n{\n  IF (num MOD 5 = 0)\n  {\n    DISPLAY ("Qualifies")\n  }\n  ELSE\n  {\n    DISPLAY ("In range, but not a multiple of 5")\n  }\n}\nELSE\n{\n  DISPLAY ("Out of range")\n}'),
  H.p('That is the actual rule for choosing between the two forms on the exam and in your own Create task code. Reach for a compound boolean condition, AND, OR, NOT combined inside one IF, when the program only ever needs a single yes-or-no outcome from several facts considered together. Reach for nested conditionals when the branches need to diagnose or react differently depending on which fact was the one that failed, because nesting is what gives each fact its own decision point and its own ELSE. Both are correct pseudocode. The choice is about what the rest of the program needs to know, not about which one is more advanced.'),

  H.h2(SECTIONS[2]),
  H.p('Before the AND-versus-OR trap makes sense, the underlying evaluation has to be automatic, at the level the exam actually tests it, which is nowhere near full boolean algebra. Three operators, evaluated correctly against true and false values, cover everything a released item asks for. AND is only true when both sides are true. OR is true when at least one side is true, and only false when both sides are false. NOT simply flips whatever it is applied to, true becomes false and false becomes true.'),
  H.p('Apply that to a condition with real values rather than abstract letters, and the reasoning becomes mechanical rather than something to memorize. Take a program meant to decide whether a runner needs cold-weather gear before a scheduled workout.'),
  H.code('IF ((temp < 32 OR isRaining) AND NOT isWeekend)\n{\n  DISPLAY ("Bring cold gear and check the schedule")\n}\nELSE\n{\n  DISPLAY ("No special prep needed")\n}'),
  H.p('Trace it with <code>temp</code> equal to 45, <code>isRaining</code> equal to false, and <code>isWeekend</code> equal to true, evaluating from the inside out exactly the way the exam expects a student to show work.'),
  H.table(
    ['Piece being evaluated', 'Values plugged in', 'Result'],
    [
      ['temp < 32', '45 < 32', 'false'],
      ['isRaining', 'given', 'false'],
      ['temp < 32 OR isRaining', 'false OR false', 'false (OR needs at least one true side, and neither side is)'],
      ['NOT isWeekend', 'NOT true', 'false (NOT flips true to false)'],
      ['(temp < 32 OR isRaining) AND NOT isWeekend', 'false AND false', 'false (AND needs both sides true, and neither side is)'],
      ['Branch taken', 'overall condition is false', 'ELSE runs: "No special prep needed"'],
    ]
  ),
  H.p('Every step in that table is a single, mechanical fact about one operator applied to values that are already known. The overall condition never has to be reasoned about all at once, which is exactly the habit worth building: evaluate the smallest pieces first, write down whether each one is true or false, then combine those results one operator at a time, working outward. A student who tries to hold the whole expression in their head at once is far more likely to slip than one who traces it piece by piece, the same way the table does above.'),

  H.h2(SECTIONS[3]),
  H.p('The single most common exam trap involving compound conditions is not a syntax mistake at all. It is choosing the wrong logical operator, AND where OR belongs, or OR where AND belongs, and getting pseudocode that runs perfectly fine and simply accepts the wrong set of cases. Nothing crashes. Nothing looks broken by inspection. The only way to catch it is to trace specific values and notice the outcome is wrong.'),
  H.p('Take a program meant to award an advanced problem set only to a student who scored well on both parts of a practice exam, the multiple choice section and the free response section. The intended rule is an AND: both scores have to clear the bar.'),
  H.h3('Broken: OR where the logic needed AND'),
  H.code('IF (mcqScore >= 90 OR frqScore >= 90)\n{\n  DISPLAY ("Qualifies for advanced set")\n}\nELSE\n{\n  DISPLAY ("Does not qualify")\n}'),
  H.h3('Fixed: AND, matching the intended rule'),
  H.code('IF (mcqScore >= 90 AND frqScore >= 90)\n{\n  DISPLAY ("Qualifies for advanced set")\n}\nELSE\n{\n  DISPLAY ("Does not qualify")\n}'),
  H.p('Trace both versions against the same four students and the trap becomes concrete instead of abstract. OR only needs one side to clear 90, so it quietly waves through students who were strong on exactly one section and weak on the other, which is precisely the population the AND version was written to exclude.'),
  H.table(
    ['Student', 'mcqScore', 'frqScore', 'Broken (OR) result', 'Fixed (AND) result'],
    [
      ['A', '95', '60', 'Qualifies', 'Does not qualify'],
      ['B', '60', '95', 'Qualifies', 'Does not qualify'],
      ['C', '95', '95', 'Qualifies', 'Qualifies'],
      ['D', '60', '60', 'Does not qualify', 'Does not qualify'],
    ]
  ),
  H.p('Students A and B are the trap made visible. Under the broken OR version they both qualify, because OR only requires one side to be true and each of them cleared exactly one section. Under the correctly written AND version, neither qualifies, because AND requires both sides to be true and each of them failed one. The two versions agree on students C and D, which is exactly why this bug is so easy to miss during casual testing: unless a test case specifically checks a student who is strong on one section and weak on the other, both versions look like they work.'),
  H.box('warn', 'The trap runs the other direction too', '<p>The reverse mistake is just as common: writing AND where the logic actually needed OR. A condition meant to catch a number outside a valid range, less than 0 or greater than 100, has to use OR, because no single number can be less than 0 and greater than 100 at the same time. Written with AND instead, that condition is never true for any input at all, and the branch meant to catch invalid numbers never runs, silently, for every possible value.</p>'),
  H.p('The fix for both directions of this trap is the same habit: before trusting a compound condition, name the actual rule in plain language first, then check whether that rule requires every fact to hold at once, which is AND, or only needs at least one fact to hold, which is OR. Writing the pseudocode before settling that question is how the wrong operator ends up in the final line. The full <a href="/blogs/ap-csp/ap-csp-pseudocode-complete-syntax-guide">pseudocode syntax guide</a> covers the base IF, ELSE IF, ELSE structure alongside every other construct on the reference sheet, and AP CSA students working through the equivalent idea in Java can see the same operator built out fully in <a href="/blogs/ap-csa/ap-csa-compound-booleans-short-circuit">compound booleans and short-circuit evaluation</a>.'),

  H.h2('Practice Two Conditional Questions'),
  H.p('Trace each one fully, piece by piece, before checking the answer.'),
  H.mcq({
    n: 1,
    stem: 'What is displayed by the following program when num is set to -6?',
    codeText: 'num ← -6\nIF (num > 0)\n{\n  IF (num MOD 2 = 0)\n  {\n    DISPLAY ("Positive even")\n  }\n  ELSE\n  {\n    DISPLAY ("Positive odd")\n  }\n}\nELSE\n{\n  DISPLAY ("Not positive")\n}',
    options: ['Positive even', 'Positive odd', 'Not positive', 'Nothing is displayed'],
    correct: 2,
    why: 'The outer condition, num > 0, is checked first with num equal to -6, and it is false. Because this is a nested IF, the inner IF that checks num MOD 2 = 0 sits entirely inside the outer IF block, which means it never even runs once the outer condition fails. The ELSE attached to the outer IF fires instead, displaying "Not positive". A student who evaluates the inner condition anyway, noticing that -6 is in fact even, and answers "Positive even" is treating the nested IF as though it were a separate, independent check. It is not: the inner IF is only reachable through the outer one, and the outer one already failed.',
  }),
  H.mcq({
    n: 2,
    stem: 'A program uses grade ← 78, hasSubmitted ← true, and isLate ← false. What is displayed?',
    codeText: 'IF ((grade >= 70 AND hasSubmitted) OR NOT isLate)\n{\n  DISPLAY ("Credit given")\n}\nELSE\n{\n  DISPLAY ("No credit")\n}',
    options: ['Credit given', 'No credit', 'The condition cannot be evaluated without more information', 'The program produces an error'],
    correct: 0,
    why: 'Evaluate the smallest pieces first. grade >= 70 is 78 >= 70, which is true. hasSubmitted is true. grade >= 70 AND hasSubmitted is true AND true, which is true. NOT isLate is NOT false, which is true. The full condition is (true) OR (true). OR only needs one side to be true, and here both sides already are, so the overall condition is true and the program displays "Credit given". Notice that OR made the second half of the check redundant in this particular trace, since the left side was already true on its own, but that does not change what the operator does: as long as either side of an OR is true, the whole expression is true.',
  }),

  H.h2('Frequently Asked Questions'),
  H.faq([
    { q: 'Is a nested IF ever required, or can a compound condition always replace it?', a: 'A compound condition can always replace a nested IF when every branch of the nesting leads to the exact same single outcome, the way the range-and-divisibility example in this guide does. Nesting becomes required, not just a style choice, the moment different combinations of true and false need to produce different results, because a single compound condition can only ever produce one outcome for true and one outcome for false.' },
    { q: 'Does the order of AND and OR conditions matter for the final result?', a: 'For the final true or false result, no. AND and OR are evaluated based on the values involved, not the order they are written in, as long as parentheses group the pieces the way you intend. What does matter is readability and, in some languages outside AP CSP pseudocode, short-circuit behavior, but for tracing correctness on the exam, evaluate each piece and combine them with the operator exactly as written.' },
    { q: 'How is NOT different from just swapping a comparison, like turning < into >=?', a: 'NOT flips the entire truth value of whatever it is applied to, which is not always the same as flipping one comparison operator. NOT (num > 0) is true whenever num > 0 is false, which includes num equal to 0 as well as every negative number. Rewriting that by hand as num <= 0 happens to be correct here, but NOT applied to a compound condition, like NOT (a > 0 AND b > 0), does not simply flip each piece to NOT (a <= 0 AND b <= 0), and getting that wrong is its own separate exam trap worth tracing carefully rather than assuming.' },
    { q: 'Why does the AND-versus-OR trap matter more than other syntax mistakes?', a: 'Because it produces pseudocode that runs without error and looks completely reasonable on a quick read, unlike a missing curly brace or a misspelled keyword that would be obvious immediately. The only way to catch a swapped AND or OR is to trace specific input values through the condition and notice that the set of cases it accepts is not the set the problem actually asked for, which is exactly the habit this guide walks through with the qualifying-student example.' },
  ]),

  H.cta({
    heading: 'Practice tracing conditionals against real inputs',
    body: 'Reading the rule is the easy part. The points are in tracing specific values through a nested IF or a compound AND/OR/NOT condition without guessing.',
    links: [
      { href: '/blogs/ap-csp/ap-csp-pseudocode-complete-syntax-guide', text: 'Full pseudocode syntax guide' },
      { href: '/blogs/ap-csp/ap-csp-practice-exam-common-mistakes', text: 'Common exam mistakes', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reflects the conditional and Boolean operator syntax defined on the current AP CSP Exam Reference Sheet published by College Board. Last reviewed October 20, 2026.'),
]);

module.exports = { meta, body };
