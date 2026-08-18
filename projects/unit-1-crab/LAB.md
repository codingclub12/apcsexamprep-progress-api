# Unit 1 Lab: meet the crab

Follow along with Greenfoot open beside this page. Put Greenfoot on the left
and this page on the right; you will be switching between them constantly and
alt-tabbing gets old fast.

Nothing here is graded. Nothing here can break. The only file you edit is
`Crab.java`, and only at the very end.

**Before you start:** open `unit-1-crab` in Greenfoot and press Compile once.

---

## Step 1: what you are looking at

`SHOT: unit-1-lab-step-1` The whole Greenfoot window with the world on the
left, the class diagram on the right, and the execution controls along the
bottom.

Three regions. The world is where the scenario runs. The class diagram on the
right is your project's table of contents. The buttons along the bottom run it.

In the class diagram you should see `World` with `CrabWorld` indented under it,
and `Actor` with `Crab` and `Worm` under that. The indenting is telling you
something real, and lesson 1.1 is about what.

**Do this:** count the crabs in the world. Then count the Crab classes in the
diagram. One class, one crab. Now count the worms, and count the Worm classes.
One class, TWO worms.

That gap is lesson 1.3, and you just found it before anyone explained it.

---

## Step 2: make the crab do something without writing anything

`SHOT: unit-1-lab-step-2` The right-click menu open on the crab, showing its
list of methods.

**Do this:** right-click the crab. Pick `move(int distance)`. Type `50` and
press OK.

The crab moves. You just called a method. That is lesson 1.4, and you have not
typed a line of code.

**Now try these, in order:**

| Call this | Type in | Watch for |
|---|---|---|
| `turn(int)` | `45` | it rotates, it does not move |
| `stepToward(int x, int y)` | `0` then `0` | it turns to face the top left corner and steps |
| `resize(int w, int h)` | `120` then `120` | bigger |
| `resize(int w, int h)` | `200` then `30` | a very flat crab |
| `fade(int howSolid)` | `60` | nearly see-through |
| `fade(int howSolid)` | `255` | solid again |

Every one of those is a method call with an argument. The number in the
parentheses is the part you chose.

---

## Step 3: methods that answer back

`SHOT: unit-1-lab-step-3` The small result box Greenfoot shows after calling a
method that returns a value.

Some methods DO something. Others TELL you something.

**Do this:** right-click the crab and call `distanceFromLeftWall()`. Notice it
asks you for nothing, and a little box appears with a number in it.

Drag the crab somewhere else and call it again. Different number.

That box is a **return value**, and it is the other half of lesson 1.5. A
method signature tells you two things: what it needs, and what it hands back.

**Now call** `atTheEdge()`. You get `true` or `false` instead of a number.
Drag the crab into a corner and call it again.

---

## Step 4: one class, two objects

`SHOT: unit-1-lab-step-4` The two worms in the world, with the right-click menu
open on one of them.

**Do this:** right-click the LEFT worm, call `whereAmI()`. Write the number
down. Now right-click the RIGHT worm and call `whereAmI()`.

Two different answers from the same method.

There is one Worm class. There are two Worm objects. The class is the recipe;
the objects are the cakes. Nothing in `Worm.java` mentions 120 or 480 anywhere,
and yet each worm knows where it is.

**Do this too:** in the class diagram, right-click the `Worm` class itself and
pick `new Worm()`. Drop it in the world. Now there are three. You did not edit
a file to do that.

---

## Step 5: the button almost nobody uses

`SHOT: unit-1-lab-step-5` The execution controls, with Act, Run and Reset, and
the speed slider to their right.

**Do this:** press **Act** once. Nothing happens.

That is correct, and it is worth sitting with. `act()` in `Crab.java` is empty.
Greenfoot is calling it, sixty times a second when you press Run, once when you
press Act. It just has nothing to do.

Press **Reset**. Everything you dragged and resized goes back. Reset rebuilds
the world from `CrabWorld.java`, which is why your third worm disappeared.

---

## Step 6: the only typing in this unit

Open `Crab.java` by double-clicking `Crab` in the class diagram.

Find `act()`. It is empty, with two suggestions commented out beneath it.

**Do this:** type one line inside `act()`:

```java
move(2);
```

Compile. Press **Run**.

`SHOT: unit-1-lab-step-6` The crab walking across the world with the single
move line visible in the editor.

**Now press Act instead of Run.** The crab moves 2 and stops. Press it again: 2
more. The line does not say "move over and over". The repeating is Greenfoot
calling `act()`, not anything you wrote. That distinction is the whole of
lesson 1.6.

---

## Step 7: make it patrol

Add three more lines so `act()` reads:

```java
public void act()
{
    move(2);
    if (isAtEdge())
    {
        turn(180);
    }
}
```

Compile, Run.

`SHOT: unit-1-lab-step-7` The crab reaching the right edge and turning back.

You have not formally met `if` yet, and that is fine. Read it as English: IF
the thing in the parentheses is true, do what is in the braces. Unit 2 covers
it properly. `isAtEdge()` is the same kind of question you asked in Step 3, it
just happens inside `act()` now instead of from a menu.

---

## You are done

You should be able to:

- [ ] Point at the world, the class diagram and the execution controls
- [ ] Make a new object from a class without editing a file
- [ ] Call a method with an argument and predict what happens
- [ ] Call a method that returns a value and say what the box is showing
- [ ] Explain why two worms give two answers to the same question
- [ ] Say what Act does that Run does not

If all six are true, Unit 2 is where you start writing code into files properly
instead of clicking menus.
