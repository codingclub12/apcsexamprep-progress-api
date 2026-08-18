# Unit 5 project: the bee gets levels

Start from YOUR Unit 4 scenario. The Bee class does not change in this unit.

The work is in the world, because placing things and deciding how hard a level
is are both jobs the world owns. That is where lesson 4.7 leaves off.

`BeeWorld.java` is the file you fill in.

## What changes about the game

Before this unit, adding a flower meant writing a line of code. After it,
adding a flower means adding a number to an array.

That is the whole difference between a game you edit and a game you design,
and it is the reason lesson 5.6 exists.

## The mistake this project is built to make you notice

There are two arrays and they are indexed by different things.

- `flowerX` is indexed by WHICH FLOWER
- `flowersPerLevel` is indexed by WHICH LEVEL

Using the same loop counter on both compiles, runs, and is wrong. Reading
5.6's "the index is usually where, the value is usually what" until it means
something is the fastest way past it.

## What you should be able to do by the end

- Place actors by looping over an array instead of by hand
- Read a per-level value out of a schedule array
- Say what should happen when the level index runs off the end, and defend it
