# Intro to Java with Greenfoot: course specification

Course slug `intro-java`. Class code prefix `JAVA-XXXX`. The on-ramp course that
feeds AP CSA: a student finishes this able to read and write the Java that Unit 1
of CSA assumes they already know, and lands on 2D array tile mapping, which is
the hardest thing most first-year students build.

This is the authoring contract. It defines what the lessons are, what can be
auto-graded and what cannot, and what the manifest is allowed to count. Page
bodies ship through the theme and Matrixify pipeline as usual; this document is
what those pages are built against.

## The automation problem, stated honestly

Greenfoot cannot run in Judge0. There is no Greenfoot runtime in the sandbox and
no graphical world, so "compile the student's scenario and see if the crab moves"
is not available to us. A course sold as majority automated has to be honest
about where the automation stops, or teachers discover the gap in week three.

So the course splits every lesson's practice into four bands, and only the first
three are ever manifest items:

| Band | What it is | Graded by | Manifest |
|---|---|---|---|
| `cfu` | Concept checks in the lesson body: MCQ, matching, cloze | Existing `apcs-widgets.js` engine, client-graded, server-denominated | Yes |
| `gap` | Pre-written code with holes punched in it | Server-side against a hidden key | Yes |
| `code` | A pure-logic method run headless against the Greenfoot stub shim | Judge0, hidden test cases | Yes |
| build | The actual scenario, built in Greenfoot on the desktop | Teacher, against a rubric, entered through the existing score-entry route | **No** |

The build band stays out of the manifest on purpose. A manifest row is a promise
that a student can earn the points from the browser, and a Greenfoot desktop
scenario cannot report itself. Seeding it would put permanently unearnable points
in every denominator, which is the exact failure `smoke/manifest-prune.js` exists
to catch. Teacher-entered project scores flow through
`POST /api/teacher/classes/:code/scores`, the same path AP Networking already
uses for its offline free-response sections.

That split is what "majority automated" means concretely: roughly 85 percent of
the points in the course grade themselves, and the teacher hand-scores six
projects a year.

### The gap-fill band

The student is given working code with specific tokens removed, and fills the
holes. This is the format that teaches Greenfoot API syntax without demanding a
beginner produce a whole class from a blank screen, and it is the one that
survives having no Greenfoot runtime: correctness is a property of the filled
token, not of a running world.

```java
public void act() {
    move( ___1___ );
    if ( isAtEdge() ) {
        turn( ___2___ );
    }
}
```

Grading is server-side, against a key that never ships to the browser, for the
same reason the quiz banks moved server-side: a key in the page is not a key.
Each hole accepts a normalized match (whitespace collapsed, and for holes flagged
as such, a small set of accepted equivalents, so `4` and `4;` and ` 4 ` all pass
where the hole is an argument).

**PII rule, non-negotiable.** A filled hole is student-typed free text, and this
system never stores student free text. The submitted tokens are graded in transit
and discarded. What persists is per-hole booleans in the attempt detail JSON:

```json
[{"h":1,"ok":true},{"h":2,"ok":false}]
```

Hole index and correct flag. No submitted strings, ever, not even for the wrong
answers, and not "just for diagnostics." Same posture the code grader already
takes with `source`.

### The Judge0 stub shim

The logic inside `act()` is almost always pure Java. A neighbour check, a bounds
test, a score accumulation, a nested loop over a tile map: none of that needs a
graphical world, it needs `Actor`, `World` and `Greenfoot` to exist as symbols.

So `lib/greenfoot-stub.js` ships a tiny headless implementation of exactly the
Greenfoot API surface this course teaches, injected as the `prelude` of a Judge0
run, in front of the student's segment. The student's method compiles and runs
against a fake world whose state the test case controls and whose result the test
case asserts.

This reuses the prelude/postlude model in `docs/code-grading-contract.md` exactly.
No new grading path, no second implementation.

Two properties the stub must hold, because grading is worthless without them:

- **Deterministic.** `Greenfoot.getRandomNumber(n)` is seeded per test case, not
  actually random. A test whose expected output depends on real randomness is a
  flaky test that fails students at random.
- **Scriptable input.** `Greenfoot.isKeyDown(k)` reads a per-case key script, so
  a test can assert "given the left arrow is held, x decreases by 4."

The stub is deliberately *not* a Greenfoot emulator. It covers the methods this
course teaches and throws a clear error on anything else, so an exercise that
drifts outside the taught surface fails loudly at authoring time rather than
silently mis-grading a student.

## Scope and sequence

Six units, 42 lessons, six projects. Every unit ends in a game whose mechanics
are chosen to make that unit's concept load-bearing, so a student cannot build
the project without having understood the topic.

### Unit 1: Meet Greenfoot (6 lessons)

Orientation. No blank-screen authoring at all; every code interaction is a gap.

| Lesson | Title | Concept |
|---|---|---|
| 1.1 | Scenarios, worlds, and actors | The three nouns of Greenfoot, and the object/class distinction on screen |
| 1.2 | The Greenfoot window | Class diagram, world view, Act / Run / Reset, the speed slider |
| 1.3 | Classes and objects | Instantiating actors, placing them, the object bench, "the class is the cookie cutter" |
| 1.4 | Calling a method | Anatomy of a call: receiver, name, parentheses. `move`, `turn`, `setLocation` |
| 1.5 | Parameters and return values | Reading a signature. Why `move(4)` and not `move`. Void versus returning |
| 1.6 | The `act()` method | The game loop: act runs once per frame, forever. Where your code goes |

**Project 1: Wanderer.** One actor that moves, turns at the edge, and turns
randomly. Gaps in `act()` only. This is the Little Crab shape and it exists to
prove the toolchain works end to end for a student who has never opened an IDE.

### Unit 2: Variables, Decisions, and Input (7 lessons)

| Lesson | Title | Concept |
|---|---|---|
| 2.1 | Variables and types | `int`, `double`, `boolean`, `String`. Declaration versus assignment |
| 2.2 | Expressions and operators | Arithmetic, integer division as a trap, compound assignment |
| 2.3 | Boolean expressions | Comparison operators, `&&`, `||`, `!`, and why `=` is not `==` |
| 2.4 | `if` and `else` | Branching, block scope, the dangling-else shape |
| 2.5 | `else if` chains | Ordered conditions, mutual exclusion, the catch-all `else` |
| 2.6 | Randomness | `Greenfoot.getRandomNumber(n)`, its exclusive upper bound, shifting a range |
| 2.7 | Keyboard input | `Greenfoot.isKeyDown()`, and reading input every frame rather than once |

**Project 2: Dodger.** Arrow-key player, falling hazards, clamp at the world
edge. The if-chain is the project. Gaps: key handling, edge clamping, the
random spawn x. Judge0 items: a `clamp(int v, int lo, int hi)` method, and a
"which key moves which way" state test against the stub.

### Unit 3: Methods, Worlds, and Constructors (9 lessons)

The heaviest unit, and the one that most directly buys CSA Unit 1 and Unit 3.

| Lesson | Title | Concept |
|---|---|---|
| 3.1 | Why write a method | Decomposition. An `act()` that reads like a sentence |
| 3.2 | Writing a `void` method | Signature, body, calling it from `act()` |
| 3.3 | Methods with parameters | Passing values in, parameter names as local names |
| 3.4 | Return types | `return`, using a returned value, why a non-void path must return |
| 3.5 | The `World` subclass | What a world is, `super(width, height, cellSize)` |
| 3.6 | The world constructor | Runs once at creation. What belongs in it and what does not |
| 3.7 | `prepare()` | Populating the opening scene, `addObject(actor, x, y)`, `removeObject` |
| 3.8 | Instance variables | Fields versus locals, the object that remembers, `private` |
| 3.9 | The `Actor` constructor | Initialising an actor's own state at birth |

**Project 3: Catcher.** A basket catches falling fruit, score is an instance
variable, `prepare()` builds the scene, and at least three custom methods carry
the logic. Gaps: the constructor, `prepare()`, the method bodies. Judge0 items:
`addScore` accumulation, and a `spawnX()` range test.

### Unit 4: Loops and Collections of Actors (7 lessons)

| Lesson | Title | Concept |
|---|---|---|
| 4.1 | The `while` loop | Condition, body, and the infinite loop as a first-class hazard |
| 4.2 | The `for` loop | Init, condition, update, and when to prefer it over while |
| 4.3 | Loop patterns | Counting, accumulating, and building a result across iterations |
| 4.4 | Touching another actor | `isTouching`, `removeTouching`, `getOneIntersectingObject` |
| 4.5 | Lists of actors | `getObjects(Class)`, `List<Actor>`, `size()` |
| 4.6 | The enhanced `for` loop | Iterating a list of actors without an index |
| 4.7 | Spawning with loops | Building a wave in a loop instead of by hand |

**Project 4: Wave Shooter.** Enemies spawn in loops as waves, collisions resolve
over a list, the wave advances when the list empties. Gaps: the spawn loop, the
collision sweep. Judge0 items: `countAlive`, and a wave-advance predicate.

### Unit 5: Arrays (6 lessons)

| Lesson | Title | Concept |
|---|---|---|
| 5.1 | Declaring an array | `int[] a = new int[5]`, the initializer list form |
| 5.2 | Index and `length` | Zero-based indexing, `length` is not a method, off-by-one |
| 5.3 | Traversing with `for` | The standard `i < a.length` traversal |
| 5.4 | Enhanced `for` over an array | When you do not need the index, and when you do |
| 5.5 | Array algorithms | Sum, max, min, linear search, count-matching |
| 5.6 | Arrays that drive a game | A spawn pattern, a lane table, a level schedule |

**Project 5: Lane Runner.** Lanes held in an `int[]`, the level's spawn pattern
read out of an array, difficulty stepping through a schedule array. Gaps: the
traversal loops. Judge0 items: the five array algorithms, graded directly, no
stub needed.

### Unit 6: 2D Arrays and Tile Maps (7 lessons)

The destination. Everything before this exists so this unit is possible.

| Lesson | Title | Concept |
|---|---|---|
| 6.1 | Declaring a 2D array | `int[][] grid`, rows of columns, the initializer block |
| 6.2 | Row-major indexing | `grid[row][col]`. Why `[y][x]` and not `[x][y]`, taught explicitly |
| 6.3 | Nested `for` loops | Traversing every cell, outer row and inner column |
| 6.4 | Grid to world coordinates | Cell size, `col * SIZE` and back, the conversion both ways |
| 6.5 | Rendering a tile map | An `int` code per tile, a switch on the code, `addObject` per cell |
| 6.6 | Bounds and neighbours | Checking a neighbour without walking off the edge |
| 6.7 | Row and column algorithms | Per-row totals, column scans, counting a value across a grid |

**Project 6: Tile Dungeon.** A hand-authored `int[][]` map renders into the
world in `prepare()` through nested loops, the player moves cell by cell, and
walls are enforced by looking the destination cell up in the array rather than by
collision. Gaps: the render loop, the coordinate conversion, the bounds-checked
lookup. Judge0 items: `inBounds`, `countNeighbours`, `tileAt`, and a per-row sum.

That final project is the thing to point a skeptical CSA teacher at. A student
who can render and navigate a `int[][]` tile map has done the work that CSA Unit
4 spends weeks on.

## Getting-unstuck pages

The support pages are the difference between a course a student can do alone and
one that needs a teacher standing behind them. They are reference pages, not
lessons: they carry no manifest rows, they are excluded from `pageFromHandle`, and
visiting one is deliberately not progress.

Handles: `intro-java-help-error-{slug}` and `intro-java-help-recipe-{slug}`.

### Error reference

Every page is the same four blocks: what the message looks like verbatim, what it
actually means in plain language, the two or three usual causes ranked by how
often they are the answer, and a worked fix.

Compiler errors: `cannot find symbol`, `';' expected`, `incompatible types`,
`missing return statement`, `illegal start of expression`, `class X is public,
should be declared in a file named X.java`, `method does not override or
implement a method from a supertype`, `unreachable statement`, `variable might
not have been initialized`, `non-static method cannot be referenced from a static
context`, `bad operand types for binary operator`.

Runtime errors: `NullPointerException`, `ArrayIndexOutOfBoundsException`,
`StringIndexOutOfBoundsException`, `ArithmeticException: / by zero`,
`ClassCastException`, `ConcurrentModificationException`, `StackOverflowError`,
`IllegalStateException: Actor not in world`.

Greenfoot-specific "it compiled but it is wrong" pages, which is where beginners
actually lose their afternoons and where no error message exists to search for:
my actor does not move, `act()` never runs, my image does not appear, the actor
vanishes at the edge, the world does not reset, my actor moves too fast to see,
the score never updates, I removed an actor and everything threw, my key press is
detected twice, sound does not play.

### How-to recipes

The game-design surface, written as a recipe with the code, so a student building
a project can add a feature without a teacher. Each one names the unit that makes
it available, so a student is never handed a recipe built on syntax they have not
met.

Show a score; keyboard movement; mouse following; a spawn timer; simple gravity
and jumping; a health bar; an animation from an image array; a game-over screen;
a title screen; level progression; a sound effect; a countdown clock; keeping an
actor inside the world; shooting a projectile; a simple enemy chase; reading a
tile map; a camera that scrolls.

Lessons link to recipes by id, so "stuck? see R-04" is a link, and the recipe set
is a thing you can audit for coverage rather than prose scattered across pages.

## Item ID scheme

Handles follow the CSA shape so `pageFromHandle` needs one rule:
`intro-java-lesson-{U}-{L}-{slug}`, optionally suffixed with an activity token.

| Item | ID | Type | Points |
|---|---|---|---|
| Lesson visit | `{U}.{L}-visit` | `visit` | 1 |
| Concept check | `{U}.{L}-cfu-{n}` | `cfu` | 1 each |
| Gap-fill | `{U}.{L}-gap` | `gap` | 1 per hole |
| Code exercise | `{U}.{L}-code-1` | `code` | 1 |
| Lesson quiz | `{U}.{L}-quiz` | `quiz` | 1 per question |

The trailing `-1` on the code item is not decoration. `routes/student.js` buckets
a student's own progress view with `saIsCode = /-code-\d+$/`, so `{U}.{L}-code`
would have been silently filed as a concept check on the student's page. The id
matches the pattern rather than the pattern being loosened, because CSA's code
items are seeded with `item_type: 'cfu'` and rebucketing by `item_type` would
move them.

Projects get their own lesson id per instrument, `project-{U}`, so a project can
never share a gradebook cell with a lesson, which is the collapse that AP
Networking's unit tests hit. Task items are `project-{U}-task-{n}`, one per
checkable task; the built scenario is teacher-entered and has no manifest row.

**When gap grading lands**, add a `gap` bucket to `GET /api/student/attempts`.
Today the `kind` ternary there falls through to `cfu` for anything that is not a
quiz or a code item, so gap results would be folded into the concept-check
number on the student's own progress page. The `items[]` array carries
`item_type` verbatim and is unaffected, which is why the project page below can
be built before that fix.

## What a lesson page looks like

The format is a **build walkthrough**: the scenario is constructed in front of
the student in numbered steps, each one showing what changed and why, rather than
presenting a finished listing and explaining it afterwards.

Each step is four blocks, always in this order:

1. **Screenshot** of the Greenfoot window at that moment: the class diagram, the
   world, whatever the step is actually about.
2. **The code**, as real selectable text, with the lines this step adds marked.
3. **The annotation**: what changed, and why it was needed. One idea per step.
4. **Optionally a check**: a gap to fill or a concept check on the step just
   taken.

### The rule that makes a walkthrough work

**Every step must leave a scenario that compiles and runs.** A student who stops
after step 4 of 9 has a working, if unfinished, game. This is the difference
between a walkthrough a student can follow alone and one where a single missed
line produces a wall of compiler errors twenty minutes later with no way back.

It is also the constraint that costs the most to retrofit, so it is a rule about
authoring, not a review note: build the scenario for real, screenshotting as you
go, and let the steps fall where the code actually ran. Steps invented after the
fact from a finished listing are where non-compiling intermediate states come
from.

### Screenshot the IDE, never the code

Code goes in the page as text, always. A screenshot of code cannot be copied,
cannot be searched, cannot be read by a screen reader, cannot be translated, and
cannot be diffed against what the student actually has. Screenshots are for what
text cannot show: the class diagram, the world, a dialog, a menu, the red error
squiggle and where it appears.

Practical requirements, because a screenshot set ages badly:

- Path `intro-java/{U}.{L}/step-{n}.png`, so any single shot can be retaken
  without hunting for it.
- Fixed window size and zoom across a whole unit. A set shot at three sizes reads
  as sloppy even when each shot is fine.
- **Alt text is required, not optional.** These pages are used in schools, by
  minors, under district accessibility policy. A screenshot with no alt text is a
  step a student using a screen reader cannot take at all.
- Screenshots go stale when Greenfoot's UI changes or the scenario art changes.
  Treat a Greenfoot version bump as a reshoot task for the affected steps, and
  note the version the set was shot against.

## What a project page looks like

A project is a **guided build**: the site walks the student task by task, and each
task is a small, checkable piece of the scenario. It is the lesson walkthrough
stretched over a whole game, with the student writing more of it.

Each task carries: a goal in one sentence, the code with holes where this task's
new thinking goes, a check, and a link to the recipe or error page most likely to
be needed.

### What "complete" means, and what it is worth

Tasks come in two kinds, and conflating them is how a gradebook starts lying:

| Kind | Example | Advances the walkthrough | Manifest row |
|---|---|---|---|
| **Checked** | Fill the holes in `act()`; write `inBounds` | Yes, when the check passes | Yes |
| **Attested** | "Import the crab image into your scenario" | Yes, on the student's word | **No** |

Attested tasks are real and necessary: some steps happen in the Greenfoot desktop
app and cannot be observed from a browser. They are allowed to move the student
forward. They are never worth points, because a checkbox is not evidence, and a
course that scores self-attestation is a course whose grades mean nothing. Only
checked tasks get a `project-{U}-task-{n}` manifest row.

### Resume state is derived, never stored

The page does not persist "student is on task 6". It calls
`GET /api/student/attempts`, filters to items matching `project-{U}-task-`, and
opens at the first one without a passing attempt.

This is worth doing the harder-sounding way for three reasons: it needs no new
table, no new writes, and no new endpoint; it cannot drift out of sync with the
grades, because it IS the grades; and a student who starts on a Chromebook at
school and continues on a phone at home resumes in the right place with no
session to carry.

Attested tasks are the one gap in that, since they record nothing. They are
resolved by position rather than state: an attested task sits between checked
tasks and is re-shown when the student lands on the checked task after it, which
costs a student five seconds and costs the system nothing.

### The teacher signal this produces

Because each checked task is its own item, the gradebook answers a question it
could not answer before: not "did they do the project" but **"which task is the
class stuck on"**. Fifteen students failing task 6 of Tile Dungeon is a
diagnosis, and it is the single most useful number this course can hand a
teacher.

## Build order

1. Course exists: config, prefixes, handle rule, entitlements, analytics, hazards.
2. Manifest seeded with visit rows for all 42 lessons, so visit denominators never
   move once content starts landing.
3. Greenfoot stub shim, with its own smoke test.
4. Gap-fill grading route and bank, following the code-grading contract.
5. Unit 1 authored end to end as the pilot, including its six error pages and the
   first four recipes. Nothing else ships until a real student gets through Unit 1.
   Build the scenario for real and screenshot as you go; the steps come out of
   that, not out of a finished listing.
6. Units 2 to 6, one unit at a time, manifest rows added as each unit's pages go
   live and not before.

Graded rows are seeded per unit **as pages ship**, never in advance. A manifest
row for a page nobody can open is unearnable denominator, and it makes every
student in the class look like they are failing.
