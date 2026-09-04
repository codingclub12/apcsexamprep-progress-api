"""
Differentiation for the AP CSA teacher kit: Support and Stretch per topic.

DRAFT FOR REVIEW, requested by Tanner 2026-09-04. This is the one section of
the Unit 1 teacher guides that the generated Units 2-4 guides could not render,
because unlike every other section it has no source in the topic dicts. So
unlike the rest of the kit, this file IS newly authored content and has not
been through a human read. Treat it as a draft until it has.

HOUSE STYLE, taken from the Unit 1 Topic 1.3 guide rather than invented:

  Support   exactly 3. Concrete classroom moves a teacher can do tomorrow: a
            card to hand out, a worksheet framed in plain language before any
            Java notation, a half-finished artifact so the student practices
            the habit rather than facing a blank page. Not "reteach it" and
            not "give more practice", which tell a teacher nothing.

  Stretch   exactly 4, and the fourth is beyond-scope enrichment, labeled as
            not tested so a teacher never mistakes it for exam content. The
            other three stay inside the CED and are usually one of: prove a
            general claim, design an item that traps a classmate, or take a
            correct answer and make it explain itself.

EVERY ITEM IS TIED TO ITS OWN TOPIC'S MISCONCEPTIONS, which are the ones the
day's slides and that evening's graded debugging exercise already use. A
support move that does not attack the misconception the topic actually sets is
decoration.

Keyed by topic string. Read by csa_kit.notes.build_teacher_guide.
"""

DIFFERENTIATION = {

# ── Unit 2: Selection and Iteration ──────────────────────────────────────────

'2.1': {
 'support': [
  'Hand out the three building blocks on one index card, one word per line with a two-word gloss: sequencing, in order; selection, choose; repetition, again. Students point at the card and name which block each step of an everyday algorithm uses before writing anything.',
  'Give the peanut-butter treatment to a process the class chose, not one you chose. Students dictate steps while you follow them literally and wrongly, and the class repairs the algorithm out loud before anyone writes it down.',
  'Provide the flyer algorithm already written, with the stopping condition circled and one blank line inside the loop. The only task is to write the step that makes the condition move, which isolates the third of the three things a loop needs.',
 ],
 'stretch': [
  'Give them an everyday process with a decision inside a repetition, such as sorting laundry, and ask them to write it two ways: selection inside the loop, then the loop inside the selection. They must say which is correct and produce an input where the two disagree.',
  'Ask for an algorithm that provably terminates for every input, then have a partner try to find an input where it does not. Defending the termination argument in plain English is the real task.',
  'Have them take a written algorithm and introduce exactly one ordering bug that still produces the right answer on the obvious test case. A partner has to find the input that exposes it.',
  'Beyond-scope enrichment, not tested and needing no new syntax: show a flowchart of the same algorithm beside the numbered steps and ask which representation makes the ordering bug easier to see. The CED allows diagrams and written language, and neither is required on the exam.',
 ],
},

'2.2': {
 'support': [
  'Give a printed operator card with the six relational operators and, beside each, one true and one false example using the same two numbers. Students read the example aloud before evaluating anything new.',
  'Run an assignment-versus-comparison sort: twenty slips of paper, each holding one statement, sorted into an "assigns a value" pile and an "asks a question" pile. Do this with no Java on the board until every slip is placed.',
  'Provide truth tables with the input columns already filled and only the result column blank, so the student practices evaluating rather than constructing the table and losing the point in the setup.',
 ],
 'stretch': [
  'Give them two Boolean expressions that look different and ask whether they are equivalent. They must answer with a completed truth table, not an argument, and then say in one sentence what the table proves.',
  'Ask them to write an expression using three variables that is true in exactly two of its eight rows, then hand it to a partner to verify by table.',
  'Have them find a pair of values for which a > b and !(a <= b) disagree. There is none, and the real work is explaining why the negation of a relational operator is the complementary operator rather than the reversed one.',
  'Beyond-scope enrichment, not tested: mention that Java evaluates a relational expression to a genuine boolean value that can be stored in a variable, and show boolean isAdult = age >= 18; as the idiom professionals prefer over an if that assigns true or false.',
 ],
},

'2.3': {
 'support': [
  'Physicalize the chain before coding it. Four labeled corners of the room for A, B, C and F, one score read aloud, and every student walks to exactly one corner. Nobody stands in two corners, which is the whole invariant.',
  'Hand out the grade chain with the conditions written but the branch bodies blank, plus a table of five test scores including both boundary values. They fill the bodies and then trace every score through.',
  'Give a "spot the semicolon" sheet of eight short ifs where three carry a stray semicolon after the condition. Reading for that one character is a separate skill from reading logic, and it deserves its own drill.',
 ],
 'stretch': [
  'Ask them to write a grade chain using only if statements, no else, that behaves identically to a correct chain. It requires compound conditions on every branch, and comparing the two versions side by side is the point.',
  'Give a chain whose branches are in the wrong order and ask for the smallest possible edit that fixes it. Reordering is one answer; changing the comparisons is another; defending which is better is the task.',
  'Have them design a two-item quiz where the first item looks like a chain but is four separate ifs, and the second is a correct chain missing its final else. Full solutions and one plausible wrong answer per item.',
  'Beyond-scope enrichment, not tested: show the same tiered logic as a switch statement and note that the AP subset does not include switch, so they will never be asked to read or write one on the exam.',
 ],
},

'2.4': {
 'support': [
  'Give a bracket-matching drill on paper only: eight nested if skeletons with braces and no logic, and the student draws a line joining each else to its if. Do this until it is automatic, before any nested example carries meaning.',
  'Hand out the dangling-else example with the indentation deliberately lying about the structure, and have the student re-indent it to match what the braces actually say. The gap between the two is the lesson.',
  'Provide a two-condition decision as a filled-in grid, four cells for the four combinations, and ask the student to write the nested if that produces it. Going from the grid to the code is easier than the reverse and builds the same structure.',
 ],
 'stretch': [
  'Ask them to flatten a two-level nested if into a single chain with compound conditions, then say which version they would rather maintain and why. There is no single right answer and the defense is the work.',
  'Give them a nested if with no braces anywhere and ask them to add the minimum set of braces that changes its behavior, and separately the minimum set that preserves it.',
  'Have them construct an input where a correct nested if and a flattened version disagree, or prove no such input exists for the case in front of them.',
  'Beyond-scope enrichment, not tested: point out that some languages require braces on every branch precisely to kill this bug class, and ask whether they would prefer that rule. No Java syntax changes.',
 ],
},

'2.5': {
 'support': [
  'Give a two-column card: and needs both, or needs either. Under each, one worked row with the second operand crossed out to show the skip. Students point at the card while narrating a short-circuit trace.',
  'Run the range check physically. Two students hold up cards for the two conditions, and a third can only sit down when the rule for and or or is satisfied. Then write the Java that matches what the class just did.',
  'Provide expressions with the first operand already evaluated and marked true or false, and ask only one question: is the second operand evaluated? Isolating that question from the final value is what makes short circuiting click.',
 ],
 'stretch': [
  'Ask them to write a condition that would throw an exception if the operands were reordered, then explain in one sentence why the working order works. This is short circuiting as a safety feature rather than a performance trick.',
  'Give them a compound condition with a method call on the right side that prints something, and ask them to predict how many times it prints across five different inputs.',
  'Have them prove that a && b and b && a can differ in behavior even when they never differ in value, using the printing method above as the evidence.',
  'Beyond-scope enrichment, not tested: mention the non-short-circuit operators & and | exist in Java for booleans, that the AP subset excludes them, and ask why a language would keep both.',
 ],
},

'2.6': {
 'support': [
  'Hand out a card with three lines: == on numbers asks about value, == on objects asks about identity, .equals on Strings asks about contents. One example each, and nothing else on the card.',
  'Give two String variables built different ways with the same characters and a table with two columns, == and .equals, to be filled in by running the code rather than reasoning about it. Running first is the point.',
  'Provide De Morgan pairs with one side already negated correctly and the other blank, so the student practices the transformation on a scaffold rather than deriving the rule cold.',
 ],
 'stretch': [
  'Ask them to derive De Morgan for two variables using a truth table, then state the general rule in their own words without using the phrase "flip the sign".',
  'Give a condition with a negation wrapped around a compound expression and ask for an equivalent version with no outer negation at all.',
  'Have them find two Strings where == is true and two where it is false while .equals is true for both, then explain what the difference tells you about where the objects live.',
  'Beyond-scope enrichment, not tested: mention that Java pools identical String literals at compile time, which is why == sometimes appears to work on Strings, and that relying on it is a bug waiting for a different input.',
 ],
},

'2.7': {
 'support': [
  'Give the four parts of a counting loop as four physical strips of paper: initialize, test, body, update. Students assemble a working while loop by arranging the strips before they write a line.',
  'Hand out a loop trace table with the counter column already filled for the first three passes, so the student continues a pattern rather than starting one. Add the condition column second, once the counter is comfortable.',
  'Provide three loops that each hang, with the diagnosis restricted to one question: which of the four parts is missing? Naming the missing part beats debugging the whole loop.',
 ],
 'stretch': [
  'Ask them to write a loop that reads until a sentinel and then explain why the sentinel must not be counted, with a trace showing the last two passes.',
  'Give them a loop whose condition is checked after the body in plain English, and ask them to write both a version that always runs once and one that may run zero times, then say which the exam is more likely to test.',
  'Have them take a working while loop and produce the off-by-one variant, then write the single test input that distinguishes the two. Producing the distinguishing input is the skill.',
  'Beyond-scope enrichment, not tested: show do-while as the loop that always runs once, note it is outside the AP subset, and ask which of their two versions above it corresponds to.',
 ],
},

'2.8': {
 'support': [
  'Put a while loop and its equivalent for loop side by side with the four parts color-coded in both, and have the student draw arrows connecting the matching parts before writing any for loop of their own.',
  'Hand out for headers with the body already written and only the header blank, given a stated number of iterations. Getting from "seven times" to the header is a separate skill from writing the body.',
  'Give a bounds drill: eight headers, and the only task is to write how many times each runs. Five of the eight should differ only in < versus <= or in the starting value.',
 ],
 'stretch': [
  'Ask them to write the same traversal three ways, counting up, counting down, and with a different step, and confirm all three produce identical output for the same input.',
  'Give a loop with an accumulator that must not start at zero, such as a running minimum, and ask them to state the rule for choosing a starting value that works for every input.',
  'Have them design a header that runs exactly once and one that runs exactly zero times, then explain what a reader should check first when a loop unexpectedly does nothing.',
  'Beyond-scope enrichment, not tested: mention that the loop variable of a for loop is scoped to the loop, show what happens if you try to use it afterward, and note that scope is Topic 3.8.',
 ],
},

'2.9': {
 'support': [
  'Give the four standard algorithms on one card with only their starting values: sum starts at 0, count starts at 0, maximum starts at the first element, minimum starts at the first element. The starting value is where these go wrong.',
  'Hand out a maximum-finding trace with the running maximum column filled for the first half of the data, and ask the student to finish it and then circle the pass where the maximum last changed.',
  'Provide a sum algorithm that starts the maximum at zero and a data set of all negative numbers. The student runs it, gets the wrong answer, and only then is told the rule. Meeting the bug first makes the rule stick.',
 ],
 'stretch': [
  'Ask them to write a single loop that computes the maximum, the minimum and the sum in one pass, then say what it would cost to do it in three passes instead.',
  'Give them a data set where the maximum appears twice and ask them to return the index of the first occurrence, then the last, changing only the comparison operator.',
  'Have them prove that initializing a maximum to the first element always works while initializing to zero does not, using a two-element counterexample.',
  'Beyond-scope enrichment, not tested: mention that Java supplies Integer.MIN_VALUE as an alternative starting point for a maximum, that it is outside the AP subset, and ask what it costs in readability.',
 ],
},

'2.10': {
 'support': [
  'Hand out a String with the index of every character written underneath it on graph paper. Every substring question this week gets answered by pointing at the paper before any code is written.',
  'Give a substring card with one rule and one picture: the first index is included, the second is not, and the length of the result is the difference. One worked example on the same card.',
  'Provide an indexOf drill where the only question is whether the search succeeded, so the student learns the negative-one sentinel as a yes-or-no signal before using the returned index for anything.',
 ],
 'stretch': [
  'Ask them to write a loop that finds every occurrence of a character, not just the first, and explain what the loop variable must do after each hit to avoid an infinite loop.',
  'Give them the task of reversing a String with a loop and substring, then ask what the same task would cost if String were mutable.',
  'Have them predict and then test what substring(i, i) returns, and write one sentence explaining why that is consistent with the rule on the card rather than an exception to it.',
  'Beyond-scope enrichment, not tested: mention StringBuilder as the tool real Java uses when a String is built in a loop, note it is outside the AP subset, and ask why immutability might be worth the cost.',
 ],
},

'2.11': {
 'support': [
  'Run the nested loop as a physical grid. Rows of students stand, and within each row every student counts off in turn. The inner count restarting each row is the thing to notice, and it is obvious in a room.',
  'Give a trace table with a column for the outer variable and a column for the inner, and the first full row already completed, so the student sees the inner variable reset before continuing.',
  'Provide the rectangle-printing program with the inner loop body written and the two headers blank, so the student decides only what belongs to a row and what belongs to the whole shape.',
 ],
 'stretch': [
  'Ask them to print a triangle rather than a rectangle, then state exactly which part of the inner header depends on the outer variable and why.',
  'Give them a nested loop and ask for the total number of times the innermost statement runs, as a formula in the two bounds rather than a number.',
  'Have them write a nested loop where the inner loop sometimes runs zero times, and explain what input causes it and why the program is still correct.',
  'Beyond-scope enrichment, not tested: mention that break and continue exist and are excluded from the AP subset, then ask them to achieve the same early exit with a boolean flag instead.',
 ],
},

'2.12': {
 'support': [
  'Count statements physically before counting them abstractly. Put a five-line loop on the board and have the class tally executions out loud for an input of three, then five, then ten, and write the three counts in a column.',
  'Give a card with three shapes and their counts: one loop over n is n passes, a loop inside a loop over n is n times n, and a loop that halves each pass is far fewer. One example each and no notation.',
  'Provide two programs that produce the same output, one with a nested loop and one without, plus a table of input sizes to fill in with counted operations. Comparing the two columns is the whole lesson.',
 ],
 'stretch': [
  'Ask them to find a nested loop whose growth is not n squared, and explain what about the inner bound makes it different.',
  'Give them two algorithms where the slower-growing one is actually slower for every input size a student would ever test, and ask what that says about measuring with a stopwatch.',
  'Have them write the operation count as a formula in n for a loop whose bound depends on the outer variable, then check the formula against a hand count at n equals four.',
  'Beyond-scope enrichment, not tested: name big-O as the formal notation for what they have been counting informally, note the exam asks for informal analysis only, and leave the notation there.',
 ],
},


# ── Unit 3: Class Creation ───────────────────────────────────────────────────

'3.1': {
 'support': [
  'Give three near-identical code blocks printed on separate strips and ask the student to circle what is the same in all three and underline what differs. The circled part becomes the method body and the underlined part becomes the parameter, before any refactoring is attempted.',
  'Hand out a one-rule card: a rule lives in exactly one place. Under it, a two-line example of the same tax rate written twice and the bug that appears when only one copy is updated.',
  'Provide a program with the duplicated block already extracted into a method that nobody calls yet, so the only task is replacing the three copies with three calls. Extraction and substitution are separate skills and this isolates the second.',
 ],
 'stretch': [
  'Ask them to take a working program with three copies of a rule, refactor it, then deliberately change the rule and count how many edits each version needed. The count is the argument.',
  'Give them two methods that are almost identical and ask whether they should be one method with a parameter or stay separate. Both answers are defensible and the defense is the task.',
  'Have them find a place in their own earlier work where a rule appears twice, refactor it, and confirm the output is unchanged on every test they had before.',
  'Beyond-scope enrichment, not tested: mention that professional teams run duplication detectors over a codebase, and ask what such a tool would flag that a human would call acceptable.',
 ],
},

'3.2': {
 'support': [
  'Give a two-column card: an accessor reports and changes nothing, a mutator changes and reports nothing. One method signature under each, and the word void as the visible tell.',
  'Hand out five method bodies and a single question per body: does this change the object? Answering yes or no before naming the method as accessor or mutator keeps the vocabulary attached to behavior.',
  'Provide a class where one getter secretly increments a counter, plus a short main that calls it twice and prints. The student runs it, sees the number move, and only then reads the getter.',
 ],
 'stretch': [
  'Ask them to write a class where one value is stored and another is computed on demand, then argue which of the two should be a field and which should be a method.',
  'Give them a getter that returns a value the class also uses internally, and ask what breaks if a caller modifies it.',
  'Have them write a mutator that rejects an invalid value rather than storing it, and decide what the method should do instead: ignore, clamp or report.',
  'Beyond-scope enrichment, not tested: mention that some languages generate accessors automatically from a field declaration, and ask what is lost when the getter is no longer a place you can put a rule.',
 ],
},

'3.3': {
 'support': [
  'Give the anatomy of a class as a labeled diagram on one page: fields at the top, constructor next, methods below, with one arrow from the constructor to the fields it sets. Students annotate a supplied class against the diagram before writing one.',
  'Hand out a declaration-versus-assignment sort. Twenty slips, each a single line, sorted into "makes a name exist" and "puts a value in a name". No class context until every slip is placed.',
  'Provide a class with the fields and constructor written and exactly one method missing, with its signature already present and the body blank. Writing a body into a working class is a smaller step than writing a class.',
 ],
 'stretch': [
  'Ask them to write a class whose object cannot be built in an invalid state, then have a partner try to build an invalid one.',
  'Give them a class with a field that is never read and ask whether to delete it, keep it, or turn it into a local. They must say what evidence would settle it.',
  'Have them test a half-written class by writing the test first for a method that does not exist yet, then writing the method until the test passes.',
  'Beyond-scope enrichment, not tested: mention that a class with only data and no behavior has a name in professional practice and is usually a design smell, then ask when it is nonetheless the right choice.',
 ],
},

'3.4': {
 'support': [
  'Give a card with one line: a constructor has the class name and no return type, not even void. Under it, the same declaration written twice, once correctly and once with void, with the second labeled as an ordinary method.',
  'Hand out four declarations and a single question: which of these can build an object? Deciding that before discussing overloading keeps the void trap in view.',
  'Provide a class with one working constructor and ask for a second that takes fewer parameters and supplies a default. Writing the second against a working first is a scaffold the blank page does not give.',
 ],
 'stretch': [
  'Ask them to write three constructors where two of them delegate to the third, then explain what breaks if the shared setup is copied into all three instead.',
  'Give them two constructor signatures that differ only in parameter order and ask whether Java accepts them, and whether a human should.',
  'Have them design a class where a no-argument constructor would be wrong, and defend refusing to write one.',
  'Beyond-scope enrichment, not tested: mention that this(...) lets one constructor call another, that the AP subset does not require it, and ask how they achieved the same effect without it.',
 ],
},

'3.5': {
 'support': [
  'Give a parameter-passing drill on paper: a method that adds ten to its parameter, a caller that prints the variable afterward, and a two-box diagram to fill in showing the caller box unchanged. Draw the boxes before running anything.',
  'Hand out method signatures with the return type highlighted and a single question each: what must the last statement produce? Matching the return statement to the declared type is a separate skill from writing the logic.',
  'Provide a method with a loop and a return in the wrong place, plus two inputs where it gives the wrong answer. The student moves the return and re-runs.',
 ],
 'stretch': [
  'Ask them to write a method that returns from inside a loop and an equivalent one that stores a result and returns at the end, then say which is easier to reason about and why.',
  'Give them a method whose return type is wrong for what it computes and ask for the smallest change that makes it consistent.',
  'Have them write a method with a return statement on every path and a partner check that no path falls off the end.',
  'Beyond-scope enrichment, not tested: mention that a method returning nothing useful is often a sign the work belongs elsewhere, and ask them to find one in their own code.',
 ],
},

'3.6': {
 'support': [
  'Draw the arrow explicitly. Two boxes for two variables, one object drawn once, and two arrows pointing at it. Every reference question this week gets answered by drawing before coding.',
  'Hand out code where two variables refer to one object and a table to predict, then run and compare. Seeing one change appear through both names is the entire lesson.',
  'Provide a class with a private field and a getter that hands out the internal object, plus a caller that modifies it. The student runs it and sees private fail to protect anything.',
 ],
 'stretch': [
  'Ask them to fix the leaking getter by returning a copy, then say what it costs and when it is worth paying.',
  'Give them a method that takes an object and modifies it, and ask them to rewrite it to return a new object instead, then compare the two call sites.',
  'Have them construct a case where two references to the same object produce a bug that only shows up on the second call.',
  'Beyond-scope enrichment, not tested: mention deep versus shallow copying by name, show that copying the outer object is not always enough, and leave the distinction there.',
 ],
},

'3.7': {
 'support': [
  'Give a one-copy diagram: three object boxes each with their own instance field, and one shared box off to the side for the static field, with all three pointing at it. Students annotate before any static code appears.',
  'Hand out a counter class and a main that builds three objects, with a table to predict the counter after each. Running it and comparing to the prediction settles what shared means.',
  'Provide four declarations and a single sorting question: does every object get its own, or is there one for the whole class? Sorting before naming keeps static from being read as constant.',
 ],
 'stretch': [
  'Ask them to find a case where making a field static introduces a bug that only appears with two or more objects.',
  'Give them a static method that tries to use an instance field and ask them to explain the compiler error in terms of the one-copy diagram rather than quoting the message.',
  'Have them decide whether a given helper should be static, and defend it in terms of whether it needs any particular object.',
  'Beyond-scope enrichment, not tested: mention that static and final together make a constant, that the AP subset uses this for named values, and ask why constant and shared are different ideas that happen to travel together.',
 ],
},

'3.8': {
 'support': [
  'Give a highlighted listing where every scope is shaded a different color and the student traces one name from where it is declared to where it stops being visible.',
  'Hand out a shadowing example with the field and the parameter sharing a name, and a two-box diagram to fill in showing which box the assignment touched.',
  'Provide four short methods and one question each: is this name a field, a parameter, or a local? Naming the kind before reasoning about visibility keeps the two ideas apart.',
 ],
 'stretch': [
  'Ask them to write a method where a local hides a field and the program still compiles and runs, then produce the input that shows it is wrong.',
  'Give them a class and ask for the smallest change that makes a private field accessible where it should not be, then argue why the language stops it.',
  'Have them decide, for each field in a supplied class, whether private is correct, and say what would go wrong if it were public.',
  'Beyond-scope enrichment, not tested: mention package-private as the access level you get with no modifier at all, note that the AP subset uses only public and private, and leave it there.',
 ],
},

'3.9': {
 'support': [
  'Give a card with one line: this means the object the method was called on. Under it, the shadowed setter written twice, once with this and once without, and the field value after each.',
  'Hand out the self-assignment bug as a running program with a print statement after the setter, so the student sees the field stay unchanged before reading why.',
  'Provide constructors with the parameter and field sharing a name and this already written on the left side, so the student only completes the right side.',
 ],
 'stretch': [
  'Ask them to write a method that returns this and chain two calls together, then explain what the chain is actually doing.',
  'Give them a class where every field assignment uses this and one where none does, both correct, and ask which they would rather read.',
  'Have them find the self-assignment bug in a supplied class without being told which method contains it.',
  'Beyond-scope enrichment, not tested: mention that some style guides require this on every field access precisely so the reader never has to check, and ask what that costs in noise.',
 ],
},


# ── Unit 4: Data Collections ─────────────────────────────────────────────────

'4.1': {
 'support': [
  'Give a one-page data set of twelve rows with names removed and ask the class to identify one person anyway using two other columns. Re-identification is easier felt than explained.',
  'Hand out a card with two lines: an average hides individuals only when the group is large and varied, and a group of one has an average equal to that person. One worked example under each.',
  'Provide a correct program and a wrong conclusion drawn from its output, and ask only which of the two is at fault. Separating code correctness from claim correctness is the whole topic.',
 ],
 'stretch': [
  'Ask them to find a public data set and name one column that would allow re-identification when combined with one other, then propose a change that prevents it without destroying the analysis.',
  'Give them an aggregate that is technically true and materially misleading, and ask for a second statistic that corrects the impression.',
  'Have them write the one sentence of context a data set would need before their conclusion is defensible.',
  'Beyond-scope enrichment, not tested: name differential privacy as the formal answer to the re-identification problem, note it is far outside the exam, and leave the term with them.',
 ],
},

'4.2': {
 'support': [
  'Give the enhanced for loop and the indexed loop side by side over the same array, with an arrow from the loop variable to the element it copies rather than to the array slot.',
  'Hand out a program that assigns to the enhanced loop variable, plus a print of the array afterward, so the student sees the array unchanged before reading the rule.',
  'Provide four tasks and one question each: can the enhanced for loop do this? Deciding before writing keeps the one limitation in view.',
 ],
 'stretch': [
  'Ask them to write the same traversal both ways and state the one task the enhanced version cannot perform, with a program that proves it.',
  'Give them an enhanced loop over an array of objects and ask whether the objects can be modified through it, and why the answer differs from the primitive case.',
  'Have them convert an indexed loop that needs the index into an enhanced loop plus a manually maintained counter, then say whether it was an improvement.',
  'Beyond-scope enrichment, not tested: mention that the enhanced for loop works on anything iterable, that the AP subset limits it to arrays and ArrayList, and leave it there.',
 ],
},

'4.3': {
 'support': [
  'Give a drawn array of six boxes with indexes underneath and length written to the side, circled in a different color. Every bound question this week is answered by pointing at the drawing.',
  'Hand out a card with one line: length is the count, the last index is length minus one. Under it, one array drawn with both labeled.',
  'Provide declarations and allocations on separate slips and ask the student to pair them, so the two steps stay distinct before they are written on one line.',
 ],
 'stretch': [
  'Ask them to write a method that returns a new larger array containing the old contents, then say what that reveals about arrays not growing.',
  'Give them an array of objects fresh from allocation and ask what each slot holds and what happens if it is used immediately.',
  'Have them produce the off-by-one that reads one past the end and explain why the program compiles.',
  'Beyond-scope enrichment, not tested: mention that Java checks bounds at run time and some languages do not, and ask what that changes about the class of bug you get.',
 ],
},

'4.4': {
 'support': [
  'Give a backward-loop skeleton with the starting value blank and the array drawn beside it, so the student reads the last index off the picture rather than deriving it.',
  'Hand out eight loop headers over the same array and one question each: how many elements does this visit? Five should differ only in a bound.',
  'Provide a traversal that misses the last element together with a test case where the answer is still right, so the student learns that a passing test proves nothing about the bound.',
 ],
 'stretch': [
  'Ask them to write forward and backward traversals that produce identical output, then a task where only one of the two directions works.',
  'Give them a traversal with a bound that is wrong only for an empty array, and ask for the input that exposes it.',
  'Have them design a test set for a traversal that would catch every off-by-one, and justify why each case is needed.',
  'Beyond-scope enrichment, not tested: mention that professional test suites always include the empty case and the single-element case for exactly this reason.',
 ],
},

'4.5': {
 'support': [
  'Give a card with the cast rule on one line: cast before dividing, not after. Under it, the same average written both ways with both results.',
  'Hand out the search-returns-what problem as a table: found at index three, found at index zero, not found. The student fills in what the method should return for each, and meets the zero collision before the code.',
  'Provide a sum-and-average method with the loop written and only the return line blank.',
 ],
 'stretch': [
  'Ask them to write a search that reports both whether it found the value and where, using only the tools in the subset, and defend the design.',
  'Give them an average over an empty array and ask what the method should do, then implement their choice.',
  'Have them prove that casting after the division cannot be fixed by assigning to a double, using two worked values.',
  'Beyond-scope enrichment, not tested: mention Optional as the modern answer to not-found, note it is outside the subset, and ask what negative one costs a reader.',
 ],
},

'4.6': {
 'support': [
  'Give a printed input file and a card showing the scanner cursor as a caret, moved by hand across the file as each call is read aloud.',
  'Hand out the nextInt-then-nextLine bug as a runnable program with a print after each call, so the empty line arrives before the explanation does.',
  'Provide a reading loop with the hasNext condition written and the body blank.',
 ],
 'stretch': [
  'Ask them to read a file of mixed tokens and integers, and state the rule they used to decide which read method to call at each point.',
  'Give them an empty file and ask what their loop does, then fix it if the answer is anything other than nothing.',
  'Have them write the same reader twice, once token by token and once line by line, and say which is more robust to a malformed file.',
  'Beyond-scope enrichment, not tested: mention try-with-resources as the standard way to close a file, note the AP subset does not test exception handling, and leave it there.',
 ],
},

'4.7': {
 'support': [
  'Give the 127 and 128 comparison as a runnable program with both results printed side by side, run before any explanation.',
  'Hand out a card with two lines: int holds a value, Integer refers to an object, and == asks a different question of each.',
  'Provide eight declarations to sort into primitive and wrapper before any comparison is discussed.',
 ],
 'stretch': [
  'Ask them to find the boundary where == stops working by experiment, then explain what the boundary implies about caching.',
  'Give them a collection that cannot hold a primitive and ask why the wrapper exists at all.',
  'Have them write a comparison that is correct for every pair of Integer values and say why it is correct.',
  'Beyond-scope enrichment, not tested: mention autoboxing by name as the reason wrapper code looks like primitive code, and ask what that hides from a reader.',
 ],
},

'4.8': {
 'support': [
  'Run removal physically. Eight students in a line holding index cards, one leaves, and everyone renumbers. The shift is obvious in a room and invisible on a page.',
  'Give a card with one line: size is the count, the last index is size minus one, and both change as the list changes.',
  'Provide an ArrayList with the calls written and a table of the list contents after each, half filled in.',
 ],
 'stretch': [
  'Ask them to remove every matching element with a loop and explain why the obvious forward loop misses some.',
  'Give them the same removal written backward and ask why direction fixes it.',
  'Have them predict the result of adding at an index inside a loop, then test it.',
  'Beyond-scope enrichment, not tested: mention that ArrayList is backed by an array that is copied when it grows, and ask what that costs in a loop.',
 ],
},

'4.9': {
 'support': [
  'Give an array traversal and the ArrayList version side by side with length and size circled in the same color.',
  'Hand out four traversals and one question each: what does this do on an empty list? Meeting the empty case first prevents seeding from element zero.',
  'Provide a maximum-finding loop over a list with the seeding line blank and an empty list among the test data.',
 ],
 'stretch': [
  'Ask them to write a maximum that is correct on an empty list, and defend what it returns.',
  'Give them a traversal that seeds from the first element and ask for the input that breaks it.',
  'Have them convert an indexed list traversal to an enhanced for loop and say what was lost.',
  'Beyond-scope enrichment, not tested: mention that an empty collection is a normal value rather than an error in most professional code, and ask what that implies about writing the empty case first.',
 ],
},

'4.10': {
 'support': [
  'Give two drawn lists, source and result, with arrows from the elements that survive the filter, drawn before any code.',
  'Hand out a filter with the new list created and the add call blank.',
  'Provide a program that reports the size of the wrong list and a data set where the two sizes differ.',
 ],
 'stretch': [
  'Ask them to write a filter that builds a new list and one that removes in place, then say which they would ship and why.',
  'Give them a filter tested only on data where nothing is removed, and ask what that test proved.',
  'Have them design the three data sets any filter should be tested against, and justify each.',
  'Beyond-scope enrichment, not tested: mention streams as the modern filtering idiom, note they are outside the subset, and leave the name there.',
 ],
},

'4.11': {
 'support': [
  'Give a drawn grid with row and column indexes labeled on the outside and one cell circled, plus its two-index name written underneath.',
  'Hand out a non-square grid deliberately, so row count and column count differ and cannot be confused.',
  'Provide declarations with the row bound written and the column bound blank, sourced from the correct place.',
 ],
 'stretch': [
  'Ask them to write a method that works on any rectangular grid and prove it on a non-square example.',
  'Give them code that takes the column bound from the outer length and ask for the grid shape that exposes it.',
  'Have them decide whether a given problem wants rows or columns as the outer loop, and defend it.',
  'Beyond-scope enrichment, not tested: mention that Java 2D arrays are arrays of arrays and can be ragged, note the AP subset guarantees rectangular, and leave it.',
 ],
},

'4.12': {
 'support': [
  'Give the grid drawn twice, once numbered row-major and once column-major, so the two orders are visibly different journeys through the same cells.',
  'Hand out a per-row accumulator with the reset line blank and its position ambiguous between two candidate lines.',
  'Provide a nested traversal with a trace table for a two-by-three grid, half completed.',
 ],
 'stretch': [
  'Ask them to write a per-row sum and a whole-grid sum in one pass and say exactly which line separates them.',
  'Give them a task where row-major and column-major give different output, and one where they cannot.',
  'Have them move the accumulator declaration one line and describe the bug in terms of what resets when.',
  'Beyond-scope enrichment, not tested: mention that memory layout makes row-major faster in real machines, and note the exam never tests performance here.',
 ],
},

'4.13': {
 'support': [
  'Give the main diagonal drawn on a grid with the two indexes written under each cell, so the equal-index pattern is seen before it is stated.',
  'Hand out three tasks and one question each: how many loops does this need? Some need two, some one, and deciding first prevents the reflex.',
  'Provide a per-row maximum with the inner loop written and the outer bookkeeping blank.',
 ],
 'stretch': [
  'Ask them to walk the diagonal with a single loop and explain why the second loop is unnecessary.',
  'Give them a task that needs the position of the maximum rather than its value, and ask what extra state that requires.',
  'Have them write a method that returns the row index of the largest row sum, and test it on a tie.',
  'Beyond-scope enrichment, not tested: ask for the anti-diagonal and let them derive the index relationship themselves.',
 ],
},

'4.14': {
 'support': [
  'Run binary search physically with a sorted line of students holding numbers, halving the line each guess. Then repeat it unsorted and let it fail.',
  'Give a card with one line: binary search requires sorted data, linear search does not.',
  'Provide a linear search with the loop written and only the not-found return blank.',
 ],
 'stretch': [
  'Ask them to run binary search on unsorted data, record the wrong answer, and explain why it still returned something.',
  'Give them a data size where linear search is faster in practice and ask what that says about choosing an algorithm by growth alone.',
  'Have them count the comparisons each search makes on the same data and compare to their prediction.',
  'Beyond-scope enrichment, not tested: mention that a wrong answer returned confidently is worse than an error, and ask how they would detect unsorted input.',
 ],
},

'4.15': {
 'support': [
  'Run the swap with three cups and two objects, including the failed two-cup version, before writing any code.',
  'Give a selection sort trace table with the first two passes completed.',
  'Provide a sort with the comparison written and the swap blank.',
 ],
 'stretch': [
  'Ask them to count comparisons and swaps for both sorts on the same data and say which measure favors which algorithm.',
  'Give them nearly sorted data and ask which sort wins, then explain why in terms of what each one does per pass.',
  'Have them produce the duplicated-value bug by writing the swap without a temporary, then describe the state after each line.',
  'Beyond-scope enrichment, not tested: name a sort with better growth than either of these, note it is Topic 4.17, and leave it as a preview.',
 ],
},

'4.16': {
 'support': [
  'Draw the call stack as a physical stack of index cards, one per call, added going down and removed coming back up.',
  'Give a card with two lines: a base case returns without calling, and every other path must move toward it.',
  'Provide a recursive method with the recursive call written and the base case blank, plus the input that hangs without it.',
 ],
 'stretch': [
  'Ask them to write a base case that stops the recursion but returns the wrong value, and explain why stopping is not sufficient.',
  'Give them a recursive method and its iterative twin and ask which is easier to prove correct.',
  'Have them trace a recursive call by hand and predict the return value at each level before running it.',
  'Beyond-scope enrichment, not tested: mention that deep recursion exhausts the stack in real programs, and note the exam keeps depths small on purpose.',
 ],
},

'4.17': {
 'support': [
  'Give recursive binary search with the recursive call written and only the returned value blank, since dropping the return is the bug this topic sets.',
  'Hand out a merge sort diagram showing the splitting phase only, with the merging phase blank.',
  'Provide a trace where the recursive call is made and its result discarded, plus the input where the answer is wrong.',
 ],
 'stretch': [
  'Ask them to write recursive binary search and then explain what changes if the return is omitted, using the trace rather than the compiler.',
  'Give them merge sort and ask where the actual sorting happens, since it is not in the splitting.',
  'Have them compare the comparison counts of merge sort and selection sort on the same data and connect the numbers to the growth they analyzed in 2.12.',
  'Beyond-scope enrichment, not tested: mention that merge sort needs extra space while selection sort does not, and ask when that trade would matter.',
 ],
},

}
