# CSA and CSP exercise redesign: research and design proposal

Research and design only. Nothing here has been shipped: no live page was
touched, no Matrixify sheet was generated, no manifest row was seeded, nothing
was committed. Every Java example below was compiled and run against a real
JDK (21.0.10) and every Python/JavaScript example against real interpreters,
the same way `scripts/verify-csa-exercises.js` insists a hand-written expected
output is a guess until a real toolchain has produced it. That does not make
this content ready to seed. It means the code is not the part you have to
doubt.

A separate agent is auditing what the 53 CSA and 35 CSP exercise pages
currently contain, live, page by page. This document does not repeat that
work. Where a concrete "current state" claim was needed to ground the
diagnosis, it comes from this repo's own seed content (`seed/csa-exercises/`,
`seed/csa-exercise-2/`, `seed/csp-exercise-2/`, `utils.js`), which is a
different thing from sweeping the storefront, and is cited by file and line
below rather than assumed.

Scope: AP CSA and AP CSP only, 2025-2026 four-unit CED for CSA, five Big
Ideas for CSP. No Essential Knowledge codes appear anywhere below, including
in the worked examples, per the standing rule against putting them in front
of students.

## 1. Diagnosis: why "divide two ints, then one of each" fails

The live 1.3 exercise (`seed/csa-exercises/unit1.js`, "Five Operators") reads
two ints and prints five results: `a+b, a-b, a*b, a/b, a%b`. The live 1.5
exercise ("Class Average") reads a total and a count and prints the same
division three ways: truncated, cast-before-dividing, cast-back-to-int. Both
are correct, well-verified, and hold nothing in the student's head longer
than the next line of output. That is the mechanism of the failure: the task
is a **transcription of the operator's definition**, not a use of it. A
student holds `a`, `b`, and which of five symbols comes next; they produce
five numbers that mean nothing beyond "the thing the operator on this line
does to the two things above it." Nothing forces them to notice that `/`
truncates and `%` gives the remainder as two views of the *same fact* about
the same two numbers, because nothing downstream depends on that fact being
noticed. The task is graded by string match against a reference solution's
stdout, so "correct" and "understood why" come apart completely: a student
can satisfy every hidden case by pattern-matching "five operators, five
`println`s" without ever forming the belief that `7/2` truncates because
integer division is a different operation from real division, not a
rounding rule.

Retention needs a reason the fact would come up again outside the exercise,
and "print what this operator does to two arbitrary ints" supplies none. This
is not a difficulty complaint, hidden-case pass rates on 1.3 and 1.5 are
presumably fine, and it is not a length complaint either: a five-line program
that computes something a reader would actually want is not longer than a
five-line program that computes something nobody asked for. The actual gap is
that the exercise produces a value with no addressee: nobody in the scenario,
including the student, needed `a % b` for anything, so there is nothing to
check the answer against except "did the grader accept it." A concept learned
with no consumer for its output is stored the way trivia is stored: available
for immediate recall, and gone by the time it would matter, which for these
two topics is Unit 4's array indexing and Unit 1.5's own casting rules
reappearing everywhere money, time, or averages are computed for the rest of
the course.

## 2. The replacement pattern

### The rule

> Every exercise names who the printed output is for and what wrong output
> would cost them, and the concept the lesson teaches must be the only thing
> standing between a right answer and a wrong one for that person. The fix
> for a five-minute exercise is never to make it longer; it is to make the
> five minutes produce something somebody in the scenario, including the
> student, actually needed.

Unpacked into three checkable parts:

1. **A stated receiver.** Not "the user": a specific role whose need explains
   why each value being asked for is being asked for. A parent checking a
   grocery total, a teammate reading a stat card, a teacher scanning a
   roster, the student's own future self reopening their own output. If the
   brief can't say who wants this number and why a wrong one would bother
   them, there is no receiver yet.
2. **A single-glance verdict.** The output must be checkable by inspection or
   one deterministic comparison, not "does this look plausible." This was
   never the missing piece on its own (`5/2 = 2` is already single-glance);
   what is missing is a reason anyone would look.
3. **Operator necessity.** The concept the lesson teaches must be the reason
   a wrong answer is wrong *to the receiver*, not a step that happens to
   appear in the reference solution. If a different, already-taught
   construct would satisfy the receiver just as well, the exercise is not
   testing what it claims to.

### The test

Four checks, meant to be run by whoever is authoring lesson 41 without
asking the person who wrote this rule what they meant:

1. **Cover the operator's name and hand the brief to someone who has not
   taken the course.** Can they say who wants this output and why a wrong
   version would matter to that person? "No, it's just numbers" is a fail on
   receiver.
2. **Break the featured operator on purpose and run it.** Swap `/` for `%`,
   flip which side of `&&` comes first, cast after dividing instead of
   before. If the output the receiver sees is still plausible-looking, it
   fails operator necessity: the operator was decorative. If Java throws or
   the wrong number screams, it passes. This is the same discipline
   `scripts/deploy-gate.js` already requires of this repo's own guards
   ("a guard proven not hollow: break it on purpose and require the suite to
   go RED"), applied to a rubric instead of a test suite.
3. **Ask whether the output would exist without the exercise.** Would a
   student who got it right want to show it to someone, or check it against
   something they already know (their own name, a song they know the length
   of, their own class's actual mastery threshold)? If the only reason the
   number exists is that the exercise demanded it, single-glance-verdict is
   technically true and motivationally empty.
4. **Time it.** If a reasonably fluent student cannot finish in about five
   minutes, the fix is not to cut the receiver or the necessity, it is to
   promote the brief to the bigger-build slot in Section 4. Shortness is a
   length constraint on the *brief*, never a reason to make the output
   meaningless.

A brief that only renames variables and relabels the printed lines around the
identical five-`println` shape fails check 2 by construction: nothing about
the receiver's need changed, so nothing breaks when the operator is swapped
out. That failure mode is common enough to name: a themed variable is not a
receiver. CodeHS's own free public AP CSA textbook is a useful negative
example of the opposite half of the same mistake, worth citing because it is
publicly readable (unlike the graded problem sets on Tanner's own CodeHS
account, which this repo has already decided never to reproduce, see
`docs/csa-codehs-content-ideas.md`): its array chapter is exposition-first
and abstract, "indexing, length, retrieval" with no scenario at all
(<https://codehs.com/textbook/apcsa_textbook/6.1>, fetched directly). That is
a fine way to *explain* a mechanism. It is a bad template for the *exercise*
sitting under the explanation, and the fix costs nothing at the concept
layer: the explanation of what an array is does not need to change for the
practice problem under it to name a receiver.

### Two grains, not one

This repo has already built this exact pattern twice, independently, for
other reasons. Both are worth generalizing rather than reinventing:

- **`projects/unit-1-crab` through `unit-6-maze`** (Intro to Java with
  Greenfoot, `docs/intro-java-projects.md`): one artifact, the Bee, grows
  across four units. Unit 2 makes it move, Unit 3 refactors its `act()`
  method, Unit 4 adds collision and scoring. "The course is already walking
  toward this assignment. It does not need replacing, it needs re-filing."
- **`seed/csp-create-task/bridge.js`**: one running scenario (a step-count
  log) across four problems, with the Create Performance Task's own scored
  requirements accreting onto it, 2 of 6, then 4 of 6, then 6 of 6, before
  the student is handed the open-ended Create Task builder.

Neither of those is a five-minute exercise, and that is the right split.
The rule above governs two different grains, and an exercise 1 and a bigger
build satisfy it differently:

| | Exercise 1 (this section's rule) | The bigger build (Section 4) |
|---|---|---|
| Grain | One lesson, one sitting | One unit or Big Idea, one artifact |
| Receiver | Stated once, resolved in one program | Stated once, resolved across several requirements |
| Time | About five minutes | One class period or more, by design |
| Precedent already in this repo | None yet, this proposal | The Bee, the Create Task bridge |

### The exercise-2 name is already taken, and that matters

Tanner's own framing, "exercise 2 could be the bigger problem," is not free
to claim in this codebase without a collision. `seed/csa-exercise-2/unit2.js`
through `unit4.js` and all five `seed/csp-exercise-2/bi*.js` files already
exist: six applied, scenario-based multiple-choice questions per lesson,
worth six points, explicitly documented as "the cross-course exercise-2
convention" (`seed/csa-exercise-2/unit2.js`, header comment). This is real,
already-authored content, and it is not a bad idea: it tests transfer
("what would you DO," not "what does this term mean") in the exact format
the AP multiple-choice section itself uses, at zero Judge0 cost. Overwriting
it to mean "the bigger program" would delete finished, sound work to make
room for a same-named but structurally unrelated thing, and Unit 1's
`exercise-2` slot is not even the gap: it is undeclared, full stop
(`docs/csa-exercise-pages.md`, "Still open").

**Recommendation: do not rename or repurpose `exercise-2`.** Give the bigger
build its own name so nothing existing has to move. This document calls it
**`studio`** throughout (`item_type: 'studio'`, handle suffix `-studio`),
chosen because `exercise-3` is already informally spoken for by the FRQ item
on 1.6 (`docs/csa-exercise-pages.md`: "1.6 exercise-3 has a test bank and no
page... the only CSA FRQ item with cases authored"), and because the existing
family (`lesson`, `exercise-1`, `exercise-2`, `quiz`, `lab`) already names
activities by what they are rather than by number, which `studio` matches
and a fourth `exercise-N` would not. This is a naming proposal, not a
verdict; Tanner should treat the name itself as a five-minute decision and
the non-collision as the actual finding.

## 3. Five worked examples, exercise 1

All five compile and run as shown (`javac` 21.0.10 / `java`), including the
"break it on purpose" case named in each. Each is sized to the same shape as
the live 1.3 and 1.5 exercises they sit beside: one `Scanner`, one
straight-line or single-loop body, three to five hidden cases. None require
a construct from a later lesson than the one they teach; sequencing was
checked against the verified lesson list in
`docs/csa-codehs-exercise-reference.md`, not assumed.

### Integer division and modulus (1.3, Expressions and Output)

**Brief.** "A playlist app never stores '4 minutes, 5 seconds.' It stores
the song's length as one number, total seconds, and computes the display
every time the screen draws. Read a song's length in total seconds and print
it the way a listener would actually read it on their phone: minutes, then
the seconds left over."

```java
import java.util.Scanner;

public class Main {
  public static void main(String[] args) {
    Scanner input = new Scanner(System.in);
    int totalSeconds = input.nextInt();

    // A player never stores "4 min 5 sec". It stores 245 and computes this
    // every time it draws the screen. Print minutes, then seconds left over.
  }
}
```

Reference: `minutes = totalSeconds / 60; seconds = totalSeconds % 60;`
then `System.out.println(minutes + " min " + seconds + " sec");`

| input | output |
|---|---|
| `245` | `4 min 5 sec` |
| `60` | `1 min 0 sec` |
| `3725` | `62 min 5 sec` |

**Why finish it.** Check it against a song already known by heart: open any
track, read its real displayed length, and see if the program agrees. Wrong
code does not fail a hidden grader here first, it disagrees with a number
the student already knows.

**Necessity, verified.** Swap `%` for a second `/` (a genuine, common
confusion) and `245` prints `4 min 4 sec`, a real song's length reported one
second short, wrong by exactly the kind of mistake a listener would never
notice unless they already know the answer, which is why the receiver
matters here and not just the arithmetic.

### Casting and range of variables (1.5, Casting and Range of Variables)

**Brief.** "A bill-splitting app has to decide how many cents each person
owes. If it only divides in whole cents, someone gets quietly shorted,
because the total collected stops matching the actual bill. This program
makes that gap visible instead of hiding it, the way the app itself never
does."

```java
import java.util.Scanner;

public class Main {
  public static void main(String[] args) {
    Scanner input = new Scanner(System.in);
    int totalCents = input.nextInt();
    int numPeople = input.nextInt();

    // Three lines: what a lazy app shows each person, the exact share, and
    // how many cents go missing if everyone only pays the lazy amount.
  }
}
```

Reference:

```java
int naiveShare = totalCents / numPeople;
double exactShare = (double) totalCents / numPeople;
int leftover = totalCents - naiveShare * numPeople;
```

| input (cents, people) | naive | exact | leftover |
|---|---|---|---|
| `1000 3` | `333` | `333.3333333333333` | `1` |
| `999 4` | `249` | `249.75` | `3` |
| `500 4` | `125` | `125.0` | `0` |

**Why finish it.** This is the exact bug behind why bill-splitting apps have
to decide who eats the leftover penny. A student who gets it right has just
proven where the missing cent actually goes.

**Necessity, verified.** Cast after dividing instead of before,
`(double) (totalCents / numPeople)`, and `1000 3` prints `333.0`: the
"exact" share now carries the same whole number as the naive one with a
decimal point tacked on, silently defeating the entire point of computing
it, which is a wrong answer the receiver would notice immediately (nobody's
precise share is a whole number by coincidence three times in a row).

### Boolean expressions and short-circuit evaluation (2.5, Compound Boolean Expressions)

**Brief.** "A ride-share app should offer a ride only when a driver is
nearby and the estimated wait is under a limit. Estimated wait is total
distance divided by number of drivers. If the app checks the wait first when
there are zero drivers, it crashes instead of just saying 'no drivers
nearby,' at exactly the moment a rider most needs an answer. One condition,
ordered correctly, is the only thing standing between the two."

```java
import java.util.Scanner;

public class Main {
  public static void main(String[] args) {
    Scanner input = new Scanner(System.in);
    int numDrivers = input.nextInt();
    int totalDistance = input.nextInt();
    int waitLimit = input.nextInt();

    // One condition. It must check numDrivers first, or it crashes instead
    // of just being wrong when numDrivers is 0.
  }
}
```

Reference: `numDrivers > 0 && (totalDistance / numDrivers) < waitLimit`,
then print `"Ride available"` or `"No drivers nearby"`.

| numDrivers, distance, limit | output |
|---|---|
| `3 10 5` | `Ride available` |
| `0 10 5` | `No drivers nearby` |
| `2 100 5` | `No drivers nearby` |

**Why finish it.** Get the order backwards and the program does not print a
wrong answer, it stops existing.

**Necessity, verified.** Reversing the operands to
`(totalDistance / numDrivers) < waitLimit && numDrivers > 0` and running
`0 10 5` throws `ArithmeticException: / by zero` at `Main.java:8`, on the
real JDK, on exactly the input that was supposed to be the safe case. A
crash is as single-glance as a verdict gets.

### String methods (1.15, String Manipulation)

**Brief.** "Every leaderboard needs a short handle built from a real name.
Use the rule a lot of them actually use: lowercase first initial, plus
lowercase last name, no space."

```java
import java.util.Scanner;

public class Main {
  public static void main(String[] args) {
    Scanner input = new Scanner(System.in);
    String first = input.next();
    String last = input.next();

    // Build the handle: first letter of first (lowercase) + last (lowercase).
    // Print the handle, its length, then last in all caps for a banner.
  }
}
```

Reference:

```java
String initial = first.substring(0, 1).toLowerCase();
String handle = initial + last.toLowerCase();
```

Input `Alex Rivera` prints:

```
arivera
7
RIVERA
```

**Why finish it.** Type in an actual name and see an actual handle come out.
Grab the whole first name instead of one letter and the result is not
subtly off, it visibly reads as somebody else's handle.

**Necessity, verified.** Using `first.toLowerCase()` in place of
`first.substring(0, 1).toLowerCase()` turns `Alex Rivera` into `alexrivera`,
a completely different, equally real-looking handle, which is exactly the
kind of wrong a receiver (the player, reading their own leaderboard tag)
would flag on sight without needing to know what a substring is.

### Array traversal (4.4, Array Traversals)

**Brief.** "A teacher wants one answer: did every student clear the mastery
threshold, or is there at least one who needs a retake? Checking most of the
roster and stopping early tells the teacher everyone is fine while quietly
never looking at the one student the check exists to catch."

```java
import java.util.Scanner;

public class Main {
  public static void main(String[] args) {
    int[] scores = {92, 95, 85, 78, 61};
    Scanner input = new Scanner(System.in);
    int threshold = input.nextInt();

    // Print PASS or RETAKE for every score, in order, then a one-line
    // summary: how many need a retake, or that everyone cleared it.
  }
}
```

Reference: a `for` loop over the full array, `if (scores[i] >= threshold)`,
counting retakes, then a summary line.

| threshold | output |
|---|---|
| `70` | `92 PASS / 95 PASS / 85 PASS / 78 PASS / 61 RETAKE / 1 student(s) need a retake` |
| `50` | all `PASS`, `All students cleared 50` |

**Why finish it.** This is the same check this platform's own gradebook
runs on every quiz score against `class.mastery_threshold`
(`CLAUDE.md`, "passed = (score / max_score) * 100 >= class.mastery_threshold"),
just for one threshold typed by hand instead of a whole roster. The student
is not practicing a toy version of a concept, they are hand-simulating the
exact rule their own dashboard applies to them.

**Necessity, verified.** Looping `i < scores.length - 1` (a real off-by-one,
not a contrived one) drops the last score, `61`, entirely. Because 61 sits
last in the array and is the only failing score at `threshold=70`, the buggy
version never prints a `RETAKE` line at all and reports **"All students
cleared 70"**, the exact false all-clear the brief warns about, reproduced
on the real JDK, not asserted.

## 4. Two exercise 2s: the bigger builds

Both are sized for one class period, not five minutes, and both are
`studio` items per Section 2's naming recommendation rather than a rename of
existing `exercise-2` content.

### CSA: Unit 1 Studio, "Character Card"

Placed as a unit-level item after 1.15 (the CED-verified precedent for a
unit-level, non-lesson-scoped slot already exists: CSP's own `exam` entries
use a pseudo-lesson like `unit-test` rather than attaching to one lesson,
`utils.js` lines 200, 207, 232). By this point in the unit every one of 1.1
through 1.15 is fair game: Scanner input, arithmetic and casting, a provided
class the student instantiates and calls (the same shape 1.12-1.14 already
teach), and String methods.

**Brief.** "Build a stat card for a character of your own invention. Give it
a name, a class, and three stats. The card has to compute one derived
number, Power Level, two ways at once: a whole number for a leaderboard that
can't display fractions, and the precise decimal so a player can see how
close they are to the next threshold."

Provided (given, not modified):

```java
class CharacterCard {
    public void printBorder() {
        System.out.println("==============================");
    }
    public void printLine(String text) {
        System.out.println(text);
    }
}
```

Student writes `Main`, instantiating `CharacterCard` and computing:

```java
int powerLevel = (strength + agility + intellect) / 3;
double exactPower = (strength + agility + intellect) / 3.0;
```

Input `Nova wizard 14 9 17` produces:

```
==============================
Nova the WIZARD
STR 14  AGI 9  INT 17
Power Level: 13 (13.333333333333334 precise)
==============================
```

**Engaging because:** the artifact is a character the student invented, so
the correctness check, does the Power Level actually match the three stats
they chose, is one they are motivated to run themselves, not one imposed on
them. It also deliberately reprises 1.5's own "compute it two ways, side by
side" device from the worked example above, now load-bearing inside
something bigger rather than being the whole exercise.

**Honest note.** The receiver here is the student's own investment in their
character, not a third party, which is a softer form of "receiver" than the
other six examples. If that is judged too soft, the harder version is to
have two players compare cards and require the exact printed format so a
script could rank them, which reintroduces a third-party receiver at the
cost of extra spec-writing. Marked here as a genuine design choice, not
settled by this proposal.

### CSP: Big Idea 2 Studio, "Fundraiser Analyzer"

Big Idea 2 currently has no coding exercise of any kind: `utils.js`
(lines 202-208) declares `bi-2` activities as `['lesson', 'exercise-2',
'quiz']` only, with the comment "No exercise-1 (see bi-1): these lessons
emit exercise-2 plus a quiz only," because only Big Idea 3 has "guided code
problems" today (`utils.js` line 218). `using-programs-with-data` is the
one BI2 lesson whose own title requires a student who can already write a
program with a loop and a list, so placing a first BI2 code exercise here
does not fight the sequencing, whatever the exact calendar order between Big
Ideas 2 and 3 turns out to be.

**Brief.** "The yearbook club wants one number from a week of fundraiser
totals: how many days actually hit the goal? The goal itself is going to
change depending on who's asking, so the program has to take it as an
input, not bake in one number."

Python:

```python
donations = [45, 120, 80, 95, 200, 60, 150]

def count_good_days(data, goal):
    count = 0
    for amount in data:
        if amount >= goal:
            count = count + 1
    return count

goal = int(input())
good_days = count_good_days(donations, goal)
print(str(good_days) + " of " + str(len(donations)) + " days hit the $" + str(goal) + " goal")
```

| goal | output |
|---|---|
| `100` | `3 of 7 days hit the $100 goal` |
| `50` | `6 of 7 days hit the $50 goal` |
| `250` | `0 of 7 days hit the $250 goal` |

Verified in both Python 3 and Node (a JavaScript port using the same
`readFileSync(0)` input pattern `seed/csp-create-task/bridge.js` already
uses for its own JS starters, so this slots into that existing convention
rather than inventing a second one).

**Engaging in a transfer sense more than a fun sense, and said plainly: the
core mechanic here, loop, counter, threshold, is a very standard shape.**
What earns it a place over a plain drill is that the parameter genuinely
changes the answer that matters (raise the goal and yesterday's success
becomes today's failure), and that the shape it builds, a list, a procedure
with a parameter that changes its behavior, a call, iteration and selection,
is not a metaphor for the Create Performance Task's own scored requirements,
it is those requirements
(<https://apcentral.collegeboard.org/media/pdf/ap22-apc-computer-science-principles-create.pdf>).
The one requirement this brief does not cover is `input` in the PT's own
sense (reading the *data* itself from outside the program); that half is
already covered by the goal parameter here and fully covered by the
existing Big Idea 3 Create Task bridge, so it is deliberately left out
rather than missed.

**Cheaper fallback, if new BI2 code infrastructure is not worth building
yet:** the same idea fits inside Big Idea 3 today at zero new
infrastructure cost, for example on `lists` or `simulations`, both of which
already have a code editor. The BI2 placement is the recommendation because
it closes a real coverage gap (BI2 students get zero hands-on coding
practice today) rather than adding a third exercise where one already
exists; the BI3 placement is the one to take if shipping before building a
new page type matters more than closing that gap this term.

## 5. What other curricula do, and what actually transfers

### CSAwesome has two live versions, and only one of them is safe to imitate

CSAwesome (Beryl Hoffman, College Board endorsed, hosted on Runestone
Academy) currently exists in two parallel editions. **CSAwesome v1**
(<https://runestone.academy/ns/books/published/csawesome/index.html>) is
still organized as "Unit 1: Getting Started," "Unit 6: Arrays," "Unit 7:
ArrayList," "Unit 8: 2D Array": the old, pre-2025 unit structure this
project's own `CLAUDE.md` explicitly bars from ever appearing in manifest
data or item IDs. **CSAwesome2** (marketed as "AP CSA Java 2026+,"
<https://runestone.academy/ns/books/published/csawesome2/csawesome2.html>)
is the one aligned to the 2025-2026 four-unit CED, confirmed by its own
topic numbering: its "2.5 Compound Boolean Expressions" lands on the same
topic number as this platform's verified 2.5. **Flagging this because it is
an easy trap for a future session searching "CSAwesome" and landing on the
first result:** citing v1's unit numbers or lesson order anywhere in this
codebase would be exactly the mistake `CLAUDE.md` already warns against by
name, just imported from outside instead of typed by hand.

Direct reads were blocked: both the v1 casting page and the CSAwesome2
compound-booleans page returned HTTP 403 to a direct fetch (Runestone
appears to block automated retrieval outright); everything reported here
about CSAwesome comes from search-result snippets, not a full page read,
and is presented as such rather than as a page I actually opened. With that
caveat: CSAwesome's casting material teaches the "double is contagious"
rule in the same abstract form this platform's own 1.5 already uses
(`(double) 1 / 3` vs `1 / 3`), and its short-circuit material states the
divide-by-zero-guard example generically (`x == 0 && (y / x) == 3`) rather
than inside a named scenario. **What transfers:** the underlying sequencing
and the correctness of the rule as stated, both of which this platform
already has right. **What does not transfer:** framing. CSAwesome is not a
model for receiver-first exercises; it is a well-built, still-abstract
textbook, which is exactly the gap this proposal is trying to close, not a
place to borrow the fix from.

### Project STEM: could not verify directly

`projectstem.org/high-school/ap-cs-a` returned HTTP 403 to a direct fetch.
What is reported here is limited to a search-engine snippet describing
"instructional videos, lesson slides, pre- and post-lesson exercises,
auto-graded coding activities," which is a marketing description, not a
look at an actual exercise. A third-party GitHub mirror of what claims to be
Project STEM's own course content exists
(`github.com/ricky8k/APCSA-ProjectStem`) but was deliberately not opened or
cited for content: it reads as an unauthorized copy of paid curriculum
material, and this repo already has a clean policy against reproducing
another vendor's copyrighted exercise content (`docs/csa-codehs-content-ideas.md`).
The one usable data point, also only from a snippet and marked as such: a
search result describing Project STEM's conditionals unit lists "short-circuit
evaluation and De Morgan's Law" under what it calls "Unit 3," which is
either old CED numbering or a different sequencing choice than this
platform's, another small confirmation that unit numbers from outside
sources cannot be trusted at face value and must be checked against topic
titles, never copied by number.

### Nifty Assignments: the actual model for "an artifact worth finishing"

The Nifty Assignments archive (<http://nifty.stanford.edu/>, fetched
directly), a 25-plus-year, SIGCSE-run collection of "great assignment ideas
... made freely available for the CS education community," is the closest
match to what Section 2's rule is actually asking for, and it is worth
naming why. Its classics (Boggle, Word Ladder, Wator World, Name Surfer,
Minesweeper) share exactly the structure this proposal recommends: one
named artifact, a receiver who would want the specific output (a working
Boggle solver a friend could actually play against), and a concept
(recursion, 2D traversal, file I/O) that is the only way to make that
artifact work, not a step bolted onto it. **What transfers directly:** the
standard itself, "would a student who finished this want to show it to
someone," is the same test Section 2 proposes, arrived at independently.
**What does not transfer:** scale. Nifty assignments are typically
multi-day projects for a CS1 college course, closer in size to Section 4's
`studio` items or to a full Create Task than to a five-minute exercise 1.
Nifty is evidence that the bigger-build grain is worth investing in, not a
source of five-minute exercises.

### CodeHS: the textbook is abstract, the graded problems already are not

Two different things are true about CodeHS and should not be conflated.
Its free public AP CSA textbook is exposition-first and abstract (its
arrays chapter, <https://codehs.com/textbook/apcsa_textbook/6.1>, fetched
directly: "indexing, length properties, element retrieval/storage," no
scenario). Its actual graded problem sets, per Tanner's own Cortado account
as already summarized in `docs/csa-codehs-exercise-reference.md` and never
re-quoted here, already carry real-world titles: Warehouse Inventory, City
Stats, Coffee Shop, Tip Calculator. **What transfers:** confirmation that
the exposition and the exercise do not have to match in register, an
abstract explanation of what an array is can sit directly above a receiver-
first practice problem, which is exactly what Section 3's examples do.
**What does not transfer, and is worth a direct warning:** a themed title
is not, by itself, evidence that an exercise passes Section 2's test.
"Warehouse Inventory" as a variable-name reskin over an unchanged
mechanical drill would still fail the "break the operator" check; this
platform should not treat "CodeHS already uses real nouns" as proof CodeHS
has already solved this problem, only as proof that dressing is cheap and
insufficient by itself.

### The CED and the exam itself: a real limit on how far to push realism

The AP CSA exam's own released free-response material is not shy about
staying abstract. Search results describing College Board's sample and
released FRQs point to items like `ArrayUtil.shiftArray` and
`NumberMatrix.shiftMatrix`, bare method-on-a-class specifications with no
narrative wrapper at all. **This is the one finding in this section that
argues against over-applying Section 2's rule, and it needs to be said
plainly: the actual Unit 4 free-response questions test exactly the skill
of manipulating indices and structure with no scenario to lean on.** A
curriculum that dresses every array problem in a story and never practices
the bare, scenario-free form risks producing students who can reason about
a warehouse but freeze at `ArrayUtil.shiftArray`. The recommendation is not
to abandon realism, it is to keep it at the exercise-1 grain (where the
job is retention and motivation, not exam fidelity) while making sure later
practice, quizzes, the FRQ item already reserved at 1.6 `exercise-3`, and
any Unit 4 quiz bank includes the College Board's own bare, undressed
phrasing on purpose. Realism is the fix for "nobody cares about this
number," not a substitute for practicing the exam's actual register.

On the CSP side, the Create Performance Task's official requirements
(College Board student handouts,
<https://apcentral.collegeboard.org/media/pdf/ap-csp-student-task-directions.pdf>,
and the scored-requirements PDF cited above) are exactly the six elements
`seed/csp-create-task/bridge.js` already names in its own `REQS` constant:
input, list, procedure, algorithm, call, output. That bridge file is not a
guess at what the Create Task wants, it is a direct transcription of the
official requirement list into a ramping exercise, which is the strongest
single piece of evidence in this whole research pass that the "accreting
requirements on one running scenario" pattern is not an import from outside
this codebase, it is this codebase's own best already-existing idea, merely
not yet applied to CSA or to the rest of CSP.

## 6. The sandbox question

Two different needs are being asked for under one phrase, "let students
build bigger programs," and they map to two different pieces of
infrastructure that already exist, doing different jobs, neither of which
needs to be reinvented.

**A one-period, autograded bigger exercise (Section 4's `studio` items)
does not need the sandbox, and should not use it.** It needs the same
infrastructure the 53 existing CSA exercise pages and the CSP Create Task
bridge already use: `program` or `driver` mode
(`lib/csa-code-modes.js`), hidden test cases, source graded in transit and
discarded (`docs/code-grading-contract.md`: "source is graded in transit
and then DISCARDED. It is never stored"). Nothing about being bigger changes
that contract; a `studio` item is a longer version of the same shape, not a
different one. It needs zero new PII surface, because the existing
contract already never stores what the student typed. What it does need
built: the `studio` activity type wired into `utils.js`, a manifest row
generator analogous to `scripts/seed-manifest.js`, and pages authored and
verified the same way `scripts/verify-csa-exercises.js` already verifies
every exercise-1 page, extended to run each `studio` item's reference
solution against every stated requirement, not just its final stdout, since
a multi-part brief needs to confirm the student actually used a procedure
or a provided class, not merely that the last line printed matches.

**A multi-day, personally-owned project (a real CSA "build your own program
with what you know" capstone, or CSP's actual three-week Create Task) is
what the sandbox is already for, today, with no new capability required.**
`docs/sandbox.md` states its purpose in almost these exact words: "a CSA
student who wants to try a `Dog` class before Unit 3... or a CSP student
building a Create Task over three weeks, had nowhere on this site to do it."
It already supports Java for CSA and Python and JavaScript for CSP. It
already persists work and reopens it tomorrow (`sandbox_programs`, owner-
only). Nothing here needs building for that need to be met; it needs
**pointing at**. The two real gaps are both already named in
`docs/sandbox.md`'s own "Known gaps" section: it is "not linked from the
storefront yet," and it has no teacher visibility of any kind. Closing the
first is theme work (link it from the CSA unit hubs and the CSP Create Task
hub pages, the same kind of Matrixify-sheet change `lib/csa-hub-links.js`
already does for exercise pages) and does not touch this repo's PII
posture at all, since nothing about linking to an existing, already-
approved feature changes what it stores.

**The one thing this proposal will not decide, and flags explicitly, is
teacher visibility into sandbox work.** If a multi-day capstone is meant to
be graded, or even just reviewed by a teacher, that requires either a
standing teacher-read path into `sandbox_programs` or a student-initiated
"submit a snapshot" action that copies a point-in-time copy of a program
into something a teacher can see. Neither is a new PII *exception* in the
strict sense, since the text is already sitting in that table under the
one exception this project has, but both are a real expansion of what that
exception's bounds cover, and `docs/sandbox.md` already says so in its own
words: "there is no teacher and no admin path to this table. Adding one is
a decision, not a patch." This proposal recommends, if that decision is made, the
student-initiated snapshot over a standing teacher read: it keeps the
scratch pad private by default and makes the one moment something becomes
visible to a teacher a thing the student chose, not a thing that was always
theoretically possible. But that recommendation is itself the kind of
judgment call `CLAUDE.md` reserves for a human ("a second PII exception...
is a decision for Tanner"), and it is named here as an open question for
him, not as something this document is deciding on its own.

## Summary and recommended build order

1. Ship the five Section 3 examples (or equivalents built the same way) as
   direct content edits to `seed/csa-exercises/unit1.js` for 1.3, 1.5, and
   1.15, `unit2.js` for 2.5, and `unit4.js` for 4.4, through the existing
   `verify-csa-exercises.js` gate. No schema change, no new endpoint: this
   is the cheapest, fastest-to-ship part of this whole proposal, because
   the infrastructure is already exactly right and only the content was
   wrong.
2. Apply Section 2's rule and test as a rewrite pass across the remaining
   48 CSA exercise-1 pages, once the concurrent exercise-inventory audit
   reports which ones already pass it and which do not; do not re-derive
   that inventory here.
3. Decide the `studio` name (or a better one) and wire the activity type,
   manifest generation, and a multi-requirement verifier, then build the
   CSA Unit 1 and CSP Big Idea 2 studios from Section 4 as the pilot pair,
   one per course, matching this project's own habit of piloting on Unit 1
   before scaling.
4. Link the sandbox from both courses' storefront hubs. This is the
   highest-leverage, lowest-risk item in this entire document: it requires
   no new backend capability, no schema change, and no PII decision, and it
   directly answers Tanner's "possibly reusing the sandbox" question with
   a feature that already fully works today and is simply not findable.
5. Bring the teacher-visibility question in Section 6 to Tanner explicitly,
   as its own decision, before any `studio` or capstone work is scoped to
   depend on a teacher being able to see it.
