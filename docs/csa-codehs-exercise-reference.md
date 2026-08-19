# CSA exercise counts per lesson: what CodeHS's own course shows

## READ THIS FIRST: Unit 4 has a real content-accuracy problem, not just an open question

Six lessons (4.6, 4.7, 4.13, 4.14, 4.15, 4.17) have exercises authored against
the wrong AP CSA topic, confirmed against the actual 2025-2026 CED. See "The
CED-alignment finding" below for the specifics. This is independent of, and
comes before, the exercise-count decision this doc was originally written
for: counting how many exercises a lesson needs is not useful while six of
Unit 4's lessons are teaching the wrong content. Flagged directly to Tanner;
no code or content changed here pending a decision on how to fix it (relabel
and recontent the six lessons on the storefront, or something larger).

Reference data for the "how many exercises does each CSA lesson need" decision
(not yet made; see `docs/csa-exercise-pages.md` for what is currently live,
which is a uniform 1 per lesson across all 53). Read this before setting
per-lesson exercise counts for Units 2-4, or before touching
`seed/csa-exercises/` to make counts non-uniform.

## Source, and what it is not

Tanner's own CodeHS Cortado AP CSA course, exported 2026-08-18 as a Canvas
Common Cartridge (`.imscc`), 707KB, 502 assignments across 6 CodeHS modules.
Confirmed by reading `imsmanifest.xml` directly: title
"Crow AP Computer Science A (Cortado) 2025", identifier
`codehs_cartridge_459917`.

**The export carries titles, point values, and order only.** Every one of the
502 `assignment.html` files has an empty `<body>` (checked all 502, not a
sample) and every `assignment_settings.xml` declares
`submission_types: external_tool`, pointing to
`https://codehs.com/lti/assignment/<id>`, an LTI launch that only resolves
inside an authenticated CodeHS session. No problem statement, starter code,
rubric, or test case is in this export, or reproduced anywhere in this repo.
The exercise titles below are short names ("ASCII Art", "Tip Calculator"), not
CodeHS's copyrighted problem content, used the same way `docs/csa-exercise-pages.md`
already describes: as a signal for writing NEW exercises, never as a source to
copy from.

## The CED-alignment finding

CodeHS's own lesson numbering is denser than this platform's: 17/14/11/19 = 61
lessons across Units 1-4, against this platform's 15/12/9/17 = 53. That
discrepancy resolves cleanly for three of four units: every CodeHS unit ends
with two of its own checkpoint lessons, "Mid-Unit Assessment" and "End of Unit
Assessment" (61 − 8 = 53), and every other lesson 1.1-3.9 matches this
platform's titles 1:1, same order, same wording.

**RESOLVED, 2026-08-19: this platform's Unit 4 is misaligned with the current
official CED past lesson 4.4, and CodeHS's sequence is the one that matches.**
Checked directly against the AP Computer Science A Course and Exam
Description, Effective Fall 2025 (the source PDF text, supplied directly
rather than fetched, since this session's egress to `apcentral.collegeboard.org`
was still blocked at the time). Confirmed in three separate places in that
document that agree with each other: the Course at a Glance table, the Unit 4
"Unit at a Glance" table, and every individual topic header from 4.1 through
4.17. CodeHS's Unit 4 sequence matches the CED exactly, word for word, at all
17 positions. This platform's does not, starting at 4.6:

| CED topic (official) | this platform's live page at that number |
|---|---|
| 4.6 Using Text Files | Arrays as Parameters and Return Values |
| 4.7 Wrapper Classes | ArrayList Introduction |
| 4.13 Implementing 2D Array Algorithms | Searching and Sorting |
| 4.14 Searching Algorithms | Reading Data from Files |
| 4.15 Sorting Algorithms | Using Data Sets with Arrays and ArrayLists |
| 4.17 Recursive Searching and Sorting | Informal Code Analysis |

This is not a title mismatch. Checked directly against
`seed/csa-exercises/unit4.js`: the exercise already authored for each of
these six lessons is built around the platform's (wrong) topic, not the CED's
(correct) one. 4.6's exercise is about array aliasing, not file reading. 4.7's
is an ArrayList intro, not autoboxing. 4.13 through 4.15 collapse three
distinct required topics, 2D array algorithms, linear/binary search, and
selection/insertion sort, into a merged and misplaced "Searching and Sorting"
plus a file-reading exercise repeated from where it should have been at 4.6.
4.17's exercise duplicates Unit 2's own "Informal Run-Time Analysis" (2.12)
under a Unit 4 title that is not a real CED topic, instead of covering
recursive binary search and merge sort. **Two full required exam topics,
Wrapper Classes and 2D-array-specific algorithms as their own topic, have no
correctly-placed exercise anywhere in this platform's Unit 4 bank.** Unit 4 is
30-40% of the multiple-choice exam weighting, the largest of the four units,
and free-response Question 4 ("2D Array") is drawn from exactly this
territory.

4.1 through 4.4, 4.8 through 4.12, and 4.16 are fine: exact CED matches or
harmless title rewording of the same topic (e.g. "Traversing Arrays" for
"Array Traversals").

Because of this, lessons 4.5 through 4.15 and 4.17 stay **not** joined to this
platform's lesson IDs in the table below. CodeHS's own version of those is kept
separate, under CodeHS's numbering, so nothing gets attributed to the wrong
topic. This section is left in place as the record of how the mismatch was
found, now that what it means is settled.

## Per-lesson exercise counts, from CodeHS's own course

208 "Exercise:" activities across the 53 lessons that do join (out of 502 total
activities; the rest are Video, Free Response, Check for Understanding,
Example, Notes, and the two per-unit assessments). Three lessons ship zero
exercises on CodeHS, conceptual-only: 2.1, 3.1, 4.2. Highest is 1.15 String
Manipulation at 7.

#### Unit 1

| lesson | title | count | exercise titles (from CodeHS's own export, names only) |
|---|---|---|---|
| 1.1 | Introduction to Algorithms, Programming, and Compilers | 4 | Exploration: Hello World; Welcome Program; ASCII Art; Debugging: Quotes |
| 1.2 | Variables and Data Types | 6 | Exploration: Social Media Variables; Signature; Signature with Strings; Variables About You; Exploration: Swapping Two Values; Team Rankings |
| 1.3 | Expressions and Output | 6 | Improved Signature; Debugging: Escape Sequences; Strong Passwords Formatting; Weight of a Pyramid; Tip Calculator; Exploration: Temperature Conversion |
| 1.4 | Assignment Statements and Input | 5 | Beauty Product Checkout; Freely Falling Bodies; Exploration: Going to the Movies; Ice Cream Shop; MLA Citation Generator |
| 1.5 | Casting and Range of Variables | 5 | Exploration: Rounding Using Casting; Movie Ratings; Picture Wall Planner; Integer Overflow; Round-Off Error |
| 1.6 | Compound Assignment Operators | 4 | Basketball Stats Simplification; Player Health; Homework Time in Seconds; Banking 101 |
| 1.7 | Application Program Interface (API) and Libraries | 1 | Exploration: Applying the String Class |
| 1.8 | Documentation with Comments | 4 | Exploration: Effective Comments; Bank Account Comments; Debugging with Comments; Greeter Javadocs |
| 1.9 | Method Signatures | 4 | Exploration: Changing a Mystery Method; Houses; Introductions; Averages |
| 1.10 | Calling Class Methods | 4 | Exploration: Message Logger; Debugging: Converter; Hello!; Algebra I Calculator |
| 1.11 | Math Class | 4 | Exploring the Math Class API; Setting the Random Range; Geometry 101; Traffic Engineer |
| 1.12 | Objects: Instances of Classes | 2 | Exploration: Classes vs Objects; Many String Objects |
| 1.13 | Object Creation and Storage (Instantiation) | 3 | Exploration: Using the Rectangle Class; Library System Objects; Overloaded Cameras |
| 1.14 | Calling Instance Methods | 3 | Exploration: Data Points; Balloons; Smart Water Bottle |
| 1.15 | String Manipulation | 7 | Madlibs; Bookstore Receipts; String Methods Exploration 1: length and substring; String Methods Exploration 2: indexOf, equals, compareTo; Hidden Message; Name Tag Generator; Word Games |

#### Unit 2

| lesson | title | count | exercise titles (from CodeHS's own export, names only) |
|---|---|---|---|
| 2.1 | Algorithms with Selection and Repetition | 0 | _(none, conceptual only)_ |
| 2.2 | Boolean Expressions | 4 | Debugging: Boolean Expressions; Meeting Goals; Exploration: Returning a Boolean; Triple-Double |
| 2.3 | if Statements | 5 | Debugging: If Statements; Exploration: Running Speed; Square Check; Add Tip; Sweet or Unsweet? |
| 2.4 | Nested if Statements | 5 | Exploration: Salmon Spawn; Smoothie Order; Roller Coaster; Temperature Classifier; Theater Discounts |
| 2.5 | Compound Boolean Expressions | 5 | Debugging: Booleans; Exploration: City Bus Discounts; Converting Pseudocode; Compound Salmon Spawn; Find the Median |
| 2.6 | Comparing Boolean Expressions | 5 | Amusement Park; Simplifying Boolean Expressions; Comparing Rectangles; Exploration: Comparing Strings; Determine Classmates |
| 2.7 | while Loops | 5 | Exploration: Lighting; Making Taffy; Vending Machine; Exploration: Infinite Loops; Guess Mt. Everest's Height |
| 2.8 | for Loops | 5 | Exploration: For Loop Variations; Print the Odds; Debugging: Prime Numbers; Multiplication Table; Shopping Cart |
| 2.9 | Implementing Selection and Iteration Algorithms | 5 | Exploration: Factors; Exploration: The Leftovers; Max and Min Values; Digits; Dice Frequencies |
| 2.10 | Implementing String Algorithms | 6 | Exploration: Mystery Algorithm 1; Exploration: Mystery Algorithm 2; Exploration: Mystery Algorithm 3; Finding Palindromes; Teen Talk; Password Checker 2.0 |
| 2.11 | Nested Iteration | 5 | Exploration: Make a Rectangle; Exploration: Inverted Triangle; Make a Grid; Upright Number Triangle; Vowel Frequency Analysis |
| 2.12 | Informal Run-Time Analysis | 3 | Exploration: Statement Execution Count; Improving findChar Efficiency; Testing findChar Efficiency |

#### Unit 3

| lesson | title | count | exercise titles (from CodeHS's own export, names only) |
|---|---|---|---|
| 3.1 | Abstraction and Program Design | 0 | _(none, conceptual only)_ |
| 3.2 | Impact of Program Design | 1 | Virtual Pet: Code Attribution |
| 3.3 | Anatomy of a Class | 3 | Debugging: Circle Access; Smart Lights; Letter Grades |
| 3.4 | Constructors | 5 | Exploration: Astronomy; Batting Average; Dog Class; Exploration: Cookbooks and Recipes; The Director |
| 3.5 | Methods: How to Write Them | 5 | Exploration: Paint Can; Debugging: Methods; Distance Conversions; Dragon Class: Accessor and Mutator; Dragon Class: Full Implementation |
| 3.6 | Methods: Passing and Returning References of an Object | 3 | Exploration: Library; Point Utilities Class; Digital Notebook |
| 3.7 | Class Variables and Methods | 3 | Exploration: Player Stats; Tournament; Bee Colony |
| 3.8 | Scope and Access | 3 | Exploration: Grocery Store; Debugging: Calculator; Order Up |
| 3.9 | this Keyword | 4 | Exploration: Student Enrollment; Debugging: Exercise Creation; Song Class; Drone Tracking System |

#### Unit 4

| lesson | title | count | exercise titles (from CodeHS's own export, names only) |
|---|---|---|---|
| 4.1 | Ethical and Social Issues Around Data Collection | 2 | Exploration: Encapsulation and Secure Coding; Modify: Encapsulation and Secure Coding |
| 4.2 | Introduction to Using Data Sets | 0 | _(none, conceptual only)_ |
| 4.3 | Array Creation and Access | 4 | Exploration: Array Creation; City Stats; Water Samples; Hospital Occupancy |
| 4.4 | Array Traversals | 5 | Exploration: Two Traversals; Debugging: Multiples; Warehouse Inventory; Array Average; Coffee Shop |
| 4.16 | Recursion | 1 | Using Recursion to Traverse a String |

#### Unit 4, lessons 4.5 through 4.15 plus 4.17, CodeHS's own sequence, not joined to this platform's lesson IDs

| CodeHS lesson | CodeHS title | count | exercise titles |
|---|---|---|---|
| 4.5 | Implementing Array Algorithms | 3 | Exam Grades; Reverse the Playlist; Finding Duplicates |
| 4.6 | Using Text Files | 7 | Karaoke; Exploration: Reading Files and Arrays; Best Men's Soccer Players: Reading Files and Arrays; Exploration: Split Method; Exploration: Number of Active Days; FitBit: Read in Sleep Data; FitBit: Analyze Sleep Data |
| 4.7 | Wrapper Classes | 5 | Exploration: Gym Lifts; Debugging: Zoo Weights; Order Up!; Exploration: SummerFest; Basketball Stats |
| 4.8 | ArrayList Methods | 6 | Exploration: ArrayList Methods add, size, remove; Exploration: ArrayList Methods get and set; Debugging: Music Playlist; Teacher Class List; Teacher Class List Methods; Baby Thermometer |
| 4.9 | ArrayList Traversals | 6 | Exploration: Backwards vs. Forwards; Debugging: Task Manager; Finding the Max; Traversing Odds; Helper Methods; Road Trip! |
| 4.10 | Implementing ArrayList Algorithms | 6 | Exploration: Numerical ArrayList Algorithms; Modify: Numerical ArrayList Algorithms; Exploration: String ArrayList Algorithms; Modify: ArrayList String Algorithms; Data Cleanup; Airline Tickets |
| 4.11 | 2D Array Creation and Access | 4 | Exploration: Gradebook; Chessboard; Seating Chart; Ocean Tide Table |
| 4.12 | 2D Array Traversals | 3 | Debugging: Charts; LED Light Show; Summing a 2D Array |
| 4.13 | Implementing 2D Array Algorithms | 4 | Retail Sales, Pt 1; Retail Sales, Pt 2; Art Flip; X-Y Graphing |
| 4.14 | Searching Algorithms | 5 | Search the Fruit Array; Exploration: Forward and Reverse Search; Search the 2D Roster Array; Fantasy Football Roster; Card Collection |
| 4.15 | Sorting Algorithms | 2 | Exploration: Selection Sort; Exploration: Insertion Sort |
| 4.17 | Recursive Searching and Sorting | 3 | Exploration: Recursive Binary; Exploration: Merge Sort; Missing Merge Values |

## How to use this

This is signal, not a decision. `docs/csa-exercise-pages.md` and the
per-lesson mapping spreadsheet sent directly to Tanner (not committed; it has
its own `suggested_count` heuristic independent of this data, plus a
`final_count` column for the actual call) are where the count per lesson gets
decided. Once it is, the code change is: extend
`seed/csa-exercises/unit{2,3,4}.js` to match, and move `activities` in
`utils.js` from a per-unit list to a per-lesson one so the gradebook stops
expecting a uniform column count across every lesson in a unit.
