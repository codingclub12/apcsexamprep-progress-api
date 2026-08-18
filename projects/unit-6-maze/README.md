# Unit 6 project: the maze

This is the one place the course starts a new scenario instead of continuing
the bee, and that is on purpose.

A tile map is not a feature you bolt onto a game that already exists. It is a
different way of describing a world, and bolting it onto the bee would hide
exactly that.

Two files: `MazeWorld.java` renders the level, `Player.java` walks it. You will
also need Wall, Coin and Player actors in the scenario, which are one-line
classes.

## What you are building toward

By the end you design a level by editing numbers. Change the grid, press Reset,
and the world rebuilds itself, resized to fit.

## The two bugs everyone hits

1. `addObject(new Wall(), col, row)`. COLUMN first, then row, because
   addObject wants x and x comes from the column. Lesson 6.4. The map in the
   starter is 8 wide and 5 tall rather than square, so this bug shows up
   immediately instead of hiding.

2. Bounds tests BEFORE the lookup in `isOpen`. `&&` stops at the first false,
   so the range checks are what protect `map[row][col]` from throwing. Put the
   lookup first and it throws on the exact case the check exists for.

## What you should be able to do by the end

- Render a multi-tile level from a 2D array with a legend
- Move an actor by checking the destination cell rather than detecting overlap
- Count a value across a whole grid, and say why the accumulator goes where it does
