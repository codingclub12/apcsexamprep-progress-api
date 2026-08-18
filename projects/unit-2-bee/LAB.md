# Unit 2 Lab: make the bee fly

Greenfoot on the left, this page on the right.

This is the first file you fill in, and the first one you KEEP. The same
`Bee.java` gets tidied in Unit 3 and becomes the Hungry Bee in Unit 4. Nothing
you write here is thrown away.

**Before you start:** open `unit-2-bee` in Greenfoot and press Compile. The bee
sits there. Arrow keys do nothing yet.

---

## Step 1: one line, one direction

Open `Bee.java` and find `checkKeyPress()`.

Type just the first of the four blocks:

```java
int step = 5;

if (Greenfoot.isKeyDown("up"))
{
    setLocation(getX(), getY() - step);
}
```

Compile, Run, hold the up arrow.

`SHOT: unit-2-lab-step-1` The bee moving upward with the up-arrow block visible
in the editor.

Two things worth noticing before you add the rest.

`isKeyDown` hands back `true` or `false`. That is exactly what an `if` wants,
which is why the two fit together with nothing in between. No `== true`
anywhere; it is already a boolean.

And `up` **subtracts** from y. y grows downward in Greenfoot. This will feel
wrong for about a week and then never again.

---

## Step 2: the other three

Add `"down"`, `"left"` and `"right"` as three more separate `if` statements.

`SHOT: unit-2-lab-step-2` All four direction blocks in the editor.

**Do this before moving on:** hold up and left at the same time. The bee moves
diagonally.

---

## Step 3: break it on purpose

Change your four `if` statements into an `else if` chain:

```java
if (Greenfoot.isKeyDown("up"))         { ... }
else if (Greenfoot.isKeyDown("down"))  { ... }
else if (Greenfoot.isKeyDown("left"))  { ... }
else if (Greenfoot.isKeyDown("right")) { ... }
```

Compile, Run, and hold up and left together again.

`SHOT: unit-2-lab-step-3` The bee moving straight up while both up and left are
held.

No diagonal. The bee only goes up.

A chain stops at the first true condition. Up was true, so nothing after it was
even looked at. That is lesson 2.5, and this is the one job where a chain is
the wrong tool.

**Change it back to four separate ifs.** You want all four questions asked
every frame.

---

## Step 4: a guard, using &&

Add a condition to the right-arrow block:

```java
if (Greenfoot.isKeyDown("right") && getX() < getWorld().getWidth() - 20)
```

Compile and run. Nothing looks different, because Greenfoot already stops
actors leaving the world.

Write it anyway. It is the clearest `&&` you will meet all course: two
questions, both must be true. Unit 4 assumes you recognise this shape on sight.

---

## Step 5: make it a game

Find `checkFlower()`. Fill it in:

```java
if (isTouching(Flower.class))
{
    removeTouching(Flower.class);
    Greenfoot.playSound("eat.wav");
}
```

Compile, Run, fly into a flower.

`SHOT: unit-2-lab-step-5` A flower disappearing as the bee reaches it.

**This is early and you should know it.** `isTouching` and `removeTouching` are
taught properly in lesson 4.4. They are here because a game where nothing can
touch anything is a screensaver.

There is no new idea in them. `isTouching(Flower.class)` is a method call with
one argument that hands back true or false, exactly like `isAtEdge()` in Unit 1.
The only unfamiliar part is `Flower.class`, which is how you name a KIND of
actor rather than a particular one.

---

## Step 6: the thing that does not work

Fill in `brokenScore()` exactly as the comment says, then call it from
`checkFlower()` right after the sound.

```java
int score = 0;
score = score + 1;
getWorld().showText("Score: " + score, 60, 20);
```

Compile. Run. Eat three flowers.

`SHOT: unit-2-lab-step-6` The score reading "Score: 1" after several flowers
have already been eaten.

It says **1**. Every time. Eat ten and it still says 1.

You have not made a mistake, and nothing is broken. Read the first line again:
`int score = 0;` is INSIDE the method. The variable is created when the method
starts and destroyed when it ends. Sixty times a second it is born as 0, gets 1
added, prints, and dies.

A local variable cannot remember anything between frames. Remembering is the
entire job of a score.

**Leave this broken.** Do not try to fix it. Lesson 3.8 is the fix and it is
one line moved to a different place. You will get more out of that lesson
having watched this fail than you ever would from being told in advance.

---

## You are done

- [ ] Four separate ifs, and you can say why not a chain
- [ ] The bee moves diagonally when two keys are held
- [ ] One `&&` guard, even though it changes nothing visible
- [ ] Flowers disappear with a sound
- [ ] `brokenScore()` prints 1 forever, and you can explain why

Unit 3 opens by fixing the last one, and by noticing that `act()` is getting
long.
