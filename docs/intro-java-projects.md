# Intro to Java: which project belongs to which unit

## The problem this fixes

The Hungry Bee was written as "Greenfoot Basics #1", the first assignment. Mapped
against this course's own lesson order, its four tasks need:

| Bee task | Needs | First taught |
|---|---|---|
| `private int score = 0` | an instance variable | **3.8** |
| `act()` calls three methods | writing your own methods | **3.1 / 3.2** |
| `checkKeyPress()` | `if` and `isKeyDown` | **2.4** and **2.7** |
| `checkCollisionWithFlower()` | `isTouching` / `removeTouching` | **4.4** |
| `displayScore()` | `getWorld().showText()` | fine anywhere, see below |

The last prerequisite lands in Unit 4. As a first assignment it asks a student
who has never programmed to write about twenty five lines using six constructs
they have not met. It is not too hard because it is badly written; it is too
hard because it is in the wrong place.

## The insight that makes this cheap

Lesson 3.1's teaching example is:

```java
public void act()
{
    handleKeys();
    collectCoins();
    maybeSpawnEnemy();
}
```

That is the Bee, renamed. The course is already walking toward this assignment.
It does not need replacing, it needs re-filing, and the crab stays in Unit 1 so
the 70 references to it in the lesson text stand.

## The progression

One file grows across three units, which is the point. A student sees the same
Bee.java get better rather than meeting three unrelated games.

### Unit 1: the crab. Provided, complete, nothing to fill in.

Unit 1 asks the student to type **two lines into a file** across six lessons.
Everything else is right-click menus, the Act button, and reading documentation.
A guided-notes file with TO DO blanks is the wrong shape here, because there is
almost nothing to blank out.

So Unit 1 ships a working scenario the student explores, and the only edit is the
body of `act()` in 1.6. `projects/unit-1-crab/` is that scenario.

No video. There is no code walkthrough to give.

### Unit 2: the bee moves. First guided-notes file.

After 2.7 the student has `if` and `Greenfoot.isKeyDown`. That is exactly
`checkKeyPress()`, which is half of the Bee, at the moment it becomes reasonable.

`projects/unit-2-bee/Bee.java` is the Bee with one TO DO: make it fly.

### Unit 3: the bee gets tidy. The refactor.

3.1 and 3.2 are "this act() method is too long, give its parts names". The Unit 2
bee has a long `act()` by then, so the Unit 3 assignment is to split it, which is
the lesson performed on the student's own code rather than on an example.

3.8 adds the `score` field.

### Unit 4: the bee eats. The capstone, as already written.

4.4 is `isTouching` and `removeTouching`. That is `checkCollisionWithFlower()`.
`projects/unit-4-bee/Bee.java` is the existing Hungry Bee assignment, unchanged,
now sitting where its prerequisites are behind it rather than ahead of it.

## showText, and the rule about small things

`showText` appears only in 6.7, and an earlier draft of this document called
that a gap to close before the Bee could be a Unit 4 capstone. It is not, and the
rule that says so is worth writing down:

> Small things that complete a game a little bit early are fine. Big concepts
> should not be out of sequence. `showText` is one line and it is necessary to
> show a score or an end of game.

`getWorld().showText("Score: " + score, 50, 50)` teaches nothing new. It is a
method call with arguments, which is lesson 1.4. Refusing to let a game show its
score until Unit 6 would make every example before then worse in service of a
rule about nothing.

What must stay in sequence is the constructs that change what a student has to
understand: storing values, making decisions, repeating, naming their own code,
holding collections. `smoke:order` tracks exactly those, and keeps a written list
of the library calls it deliberately ignores.

So the Bee needs no prerequisite work. Unit 4 is where it goes.

## What guards this

`npm run smoke:order` walks every lesson in order and fails on any construct used
before the lesson that teaches it, unless the step notes tell the student they are
seeing something early. The rule is disclosure, not abstinence: lesson 1.6 uses
`if` three lessons early and says so, which is teaching. Lesson 1.5 was doing the
same thing silently with a local variable, and now says so too.

Four lessons looked like violations at first and were not: they used `addObject`
and `isTouching` early, which are one-line calls, not concepts. The checker was
changed rather than the lessons.

That check is what turns "is this project in the right unit" from a thing someone
has to remember into a thing that fails a build.
